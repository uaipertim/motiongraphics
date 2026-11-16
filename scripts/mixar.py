"""Mixagem final: narração + trilha (com ducking de verdade) + efeitos.

- Narração: no centro, sem acelerar nem cortar; só um passa-altas de 70 Hz
  (fase zero, não desloca o tempo) e remoção de DC.
- Trilha: sidechain a partir do envelope da voz, com antecipação (o volume já
  desceu quando a palavra começa) e por bandas — o miolo (160 Hz–5 kHz), onde
  a voz mora, desce mais que o grave e o agudo. Nas pausas a trilha respira.
- Efeitos: nível próprio, com leve recuo sob a voz.
- Saída: −14 LUFS integrado e pico real ≤ −2,5 dBTP no WAV (folga para o AAC
  fechar ≤ −1,5 dBTP), com limitador de pico real com antecipação.

Uso: python3 scripts/mixar.py [--efeitos audio/efeitos.wav] [-o audio/mix.wav]
"""
import argparse
import json
import os
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import ndimage, signal

sys.path.insert(0, os.path.dirname(__file__))
from medir_audio import medir  # noqa: E402
from som import SR, db, escrever_wav, filtrar0, para_db, sos_pa, sos_pb  # noqa: E402

# ducking (dB de redução da trilha quando há voz)
DUCK_GRAVE, DUCK_MEIO, DUCK_AGUDO = -3.0, -8.5, -5.0
F_GRAVE, F_AGUDO = 160.0, 5000.0
ATAQUE, SEGURA, SOLTA, ANTECIPA = 0.16, 0.30, 0.55, 0.04
LIMIAR_VOZ_DB = -52.0
FORA_DA_VOZ_DB = 3.5      # trilha um pouco acima na abertura e no fecho (sem voz)
VOZ_LUFS_INICIAL = -14.6


def ler(caminho, canais=2):
    x, sr = sf.read(caminho, always_2d=True)
    assert sr == SR, f"{caminho}: esperado {SR} Hz, veio {sr}"
    x = x.astype(np.float64)
    if canais == 1:
        return x.mean(axis=1)
    return x if x.shape[1] == 2 else np.repeat(x, 2, axis=1)


def lufs(x):
    return float(pyln.Meter(SR).integrated_loudness(x))


def atividade_da_voz(v, fr=200):
    """Voz ativa por quadro (fr quadros/s) a partir do envelope RMS."""
    hop = SR // fr
    n = len(v) // hop
    rms = np.sqrt(np.mean(v[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-14)
    return (20 * np.log10(rms) > LIMIAR_VOZ_DB).astype(float), fr


def curva_de_ducking(ativa, fr, n_amostras):
    """0 = sem voz, 1 = voz. Sobe antes da palavra (antecipação) e solta devagar."""
    pre, seg = int(ANTECIPA * fr), int(SEGURA * fr)
    tam = pre + seg + 1
    # janela [n-seg, n+pre]: junta as pausas curtas (vírgulas) e antecipa o início
    b = ndimage.maximum_filter1d(ativa, size=tam, origin=seg - tam // 2, mode="constant")
    a, r = max(1, int(ATAQUE * fr)), max(1, int(SOLTA * fr))
    cedo = ndimage.uniform_filter1d(np.roll(b, -(a // 2)), size=a, mode="constant")
    tarde = ndimage.uniform_filter1d(np.roll(b, r // 2), size=r, mode="constant")
    d = np.maximum(cedo, tarde)
    d = 0.5 - 0.5 * np.cos(np.pi * np.clip(d, 0, 1))
    t_q = (np.arange(len(d)) + 0.5) / fr
    return np.interp(np.arange(n_amostras) / SR, t_q, d), b


def limitador(x, teto_db, antecipa=0.010, segura=0.080):
    """Limitador de pico real: ganho mínimo com antecipação + sustentação,
    suavizado por janela de Hann (o ganho nunca passa do necessário)."""
    teto = db(teto_db)
    sup = signal.resample_poly(x, 4, 1, axis=0)
    pk = np.max(np.abs(sup), axis=1)[: 4 * len(x)].reshape(len(x), 4).max(axis=1)
    pk = np.maximum(pk, np.max(np.abs(x), axis=1))
    g = np.minimum(1.0, teto / np.maximum(pk, 1e-9))
    L, H = int(antecipa * SR), int(segura * SR)
    tam = L + H + 1
    gmin = ndimage.minimum_filter1d(g, size=tam, origin=H - tam // 2, mode="nearest")
    w = np.hanning(2 * L + 1)
    w /= w.sum()
    gs = np.convolve(np.pad(gmin, L, mode="edge"), w, mode="valid")
    return x * gs[:, None], gs


def pico_real(x):
    return float(para_db(np.max(np.abs(signal.resample_poly(x, 4, 1, axis=0)))))


def rms_db(x):
    return float(10 * np.log10(np.mean(np.square(x)) + 1e-20))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--narracao", default="audio/narracao/narracao.wav")
    ap.add_argument("--trilha", default="audio/trilha.wav")
    ap.add_argument("--efeitos", default="audio/efeitos.wav")
    ap.add_argument("-o", "--saida", default="audio/mix.wav")
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--teto", type=float, default=-2.5,
                    help="pico real máximo (dBTP) no WAV; o AAC costuma subir até 0,4 dB")
    ap.add_argument("--musica-db", type=float, default=-11.5,
                    help="trilha sem ducking em relação à voz (LU)")
    ap.add_argument("--efeitos-db", type=float, default=2.0)
    a = ap.parse_args()

    # ---- narração: centro, sem mexer no tempo --------------------------------
    v_bruta = ler(a.narracao, canais=1)
    v = filtrar0(sos_pa(70, 2), v_bruta - np.mean(v_bruta))
    n = len(v)
    lv = lufs(v)

    # ---- trilha e efeitos ------------------------------------------------------
    m = ler(a.trilha)
    if abs(len(m) - n) > 2:
        sys.exit(f"ERRO: trilha ({len(m) / SR:.2f} s) e narração ({n / SR:.2f} s) com durações diferentes — "
                 "a narração foi remontada; rode scripts/trilha.py e scripts/efeitos.py de novo.")
    m = m[:n] if len(m) >= n else np.pad(m, ((0, n - len(m)), (0, 0)))
    if os.path.exists(a.efeitos):
        fx = ler(a.efeitos)
        fx = fx[:n] if len(fx) >= n else np.pad(fx, ((0, n - len(fx)), (0, 0)))
    else:
        print(f"AVISO: {a.efeitos} não existe — mixando sem efeitos", file=sys.stderr)
        fx = np.zeros((n, 2))

    # ---- ducking ---------------------------------------------------------------
    ativa, fr = atividade_da_voz(v)
    d, ativa_larga = curva_de_ducking(ativa, fr, n)
    grave = filtrar0(sos_pb(F_GRAVE, 2), m)
    agudo = filtrar0(sos_pa(F_AGUDO, 2), m)
    meio = m - grave - agudo

    t = np.arange(n) / SR
    idx = np.where(ativa > 0)[0]
    t_ini_voz, t_fim_voz = idx[0] / fr, (idx[-1] + 1) / fr
    fora = np.clip((t_ini_voz - 0.35 - t) / 0.5, 0, 1) + np.clip((t - t_fim_voz - 0.45) / 0.8, 0, 1)
    fora = 0.5 - 0.5 * np.cos(np.pi * np.clip(fora, 0, 1))
    g_fora = db(FORA_DA_VOZ_DB * fora)[:, None]

    def g(db_max):
        return db(db_max * d)[:, None]
    m_duck = (grave * g(DUCK_GRAVE) + meio * g(DUCK_MEIO) + agudo * g(DUCK_AGUDO)) * g_fora

    # ---- níveis ----------------------------------------------------------------
    g_v = db(VOZ_LUFS_INICIAL - lv)
    g_m = db(VOZ_LUFS_INICIAL + a.musica_db - lufs(m))
    g_fx = db(a.efeitos_db)
    voz = np.stack([v, v], axis=1) * g_v
    musica = m_duck * g_m
    efeitos = fx * g_fx * (1 - 0.25 * d)[:, None]
    soma = voz + musica + efeitos

    # ---- −14 LUFS com limitador de pico real -------------------------------------
    G = 1.0
    for _ in range(8):
        y, gr = limitador(soma * G, a.teto - 0.05)
        l_atual = lufs(y)
        if abs(l_atual - a.lufs) < 0.02:
            break
        G *= db(a.lufs - l_atual)
    escrever_wav(a.saida, y)

    # ---- relatório -------------------------------------------------------------
    at = np.repeat(ativa > 0, SR // fr)[:n]
    at = np.pad(at, (0, n - len(at)))
    corpo = (t > t_ini_voz) & (t < t_fim_voz)
    pausa = corpo & (d < 0.05)
    faixa_voz = lambda x: filtrar0(sos_pb(F_AGUDO, 2), filtrar0(sos_pa(F_GRAVE, 2), x))  # noqa: E731
    voz_f, mus_f, mus_semduck_f = voz * G, musica * G, m * g_m * G
    r_voz = rms_db(voz_f[at])
    r_mus_fala = rms_db(mus_f[at])
    r_mus_pausa = rms_db(mus_f[pausa]) if pausa.any() else float("nan")
    r_mus_fala_semduck = rms_db(mus_semduck_f[at])
    r_voz_meio = rms_db(faixa_voz(voz_f)[at])
    r_mus_meio = rms_db(faixa_voz(mus_f)[at])
    gr_db = 20 * np.log10(gr)
    ff = medir(a.saida)
    rel = dict(
        saida=a.saida, duracao=round(n / SR, 3),
        lufs_integrado=round(lufs(y), 2), lufs_ffmpeg=ff["lufs"], lra_ffmpeg=ff["lra"],
        pico_real_dbtp=round(pico_real(y), 2), pico_real_ffmpeg=ff["pico_real"],
        pico_amostra_dbfs=round(float(para_db(np.max(np.abs(y)))), 2),
        dc=[round(float(c), 7) for c in y.mean(axis=0)],
        ganho_voz_db=round(float(20 * np.log10(g_v * G)), 2),
        voz_lufs_na_mix=round(lufs(voz_f), 2),
        ducking_db=dict(grave=DUCK_GRAVE, meio=DUCK_MEIO, agudo=DUCK_AGUDO,
                        medido_banda_larga=round(r_mus_fala - r_mus_fala_semduck, 2),
                        ataque_s=ATAQUE, segura_s=SEGURA, solta_s=SOLTA, antecipa_s=ANTECIPA),
        voz_rms_na_fala=round(r_voz, 1), trilha_rms_na_fala=round(r_mus_fala, 1),
        voz_menos_trilha_na_fala_db=round(r_voz - r_mus_fala, 1),
        voz_menos_trilha_na_faixa_da_voz_db=round(r_voz_meio - r_mus_meio, 1),
        trilha_rms_nas_pausas=round(r_mus_pausa, 1),
        trilha_respira_nas_pausas_db=round(r_mus_pausa - r_mus_fala, 1),
        fracao_do_tempo_com_voz=round(float(at.mean()), 3),
        limitador=dict(teto_dbtp=a.teto, reducao_max_db=round(float(gr_db.min()), 2),
                       tempo_com_reducao=round(float((gr_db < -0.1).mean()), 4),
                       tempo_acima_de_3db=round(float((gr_db < -3).mean()), 4),
                       tempo_acima_de_6db=round(float((gr_db < -6).mean()), 4)),
        ultimo_250ms_dbfs=round(float(para_db(np.max(np.abs(y[-SR // 4:])) + 1e-12)), 1),
    )
    json.dump(rel, open(os.path.splitext(a.saida)[0] + ".json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    for k, val in rel.items():
        print(f"{k}: {val}")
    ok = abs(rel["lufs_ffmpeg"] - a.lufs) <= 0.2 and rel["pico_real_ffmpeg"] <= a.teto + 0.05
    print("RESULTADO:", "OK" if ok else "FORA DO ALVO")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
