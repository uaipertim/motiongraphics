"""Efeitos sonoros sutis do vídeo FAZLO Hospeda, sintetizados (numpy/scipy).

Lê uma lista de eventos e gera audio/efeitos.wav (estéreo, 48 kHz, 24 bits,
mesma duração da narração).

    {"eventos": [{"t": 12.34, "tipo": "pop", "forca": 0.8, "dur": 0.6, "pan": -0.3}]}

  t      segundo do ponto percebido (ver a tabela TIPOS: quase sempre o início)
  tipo   um dos nomes de TIPOS; desconhecido -> aviso e segue
  forca  0..1 (padrão 0.7); ganho = forca ** 1.2
  dur    segundos, só nos tipos que duram (padrão na tabela)
  pan    -1..1 (padrão 0)

Uso:
  python3 scripts/efeitos.py [audio/eventos.json] [-o audio/efeitos.wav]
  python3 scripts/efeitos.py --teste            # mede cada tipo isolado
  python3 scripts/efeitos.py --gerar-exemplo    # grava audio/eventos.exemplo.json
"""
import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from som import (PI2, SR, colocar, cos_sobe, db, env_ar, escrever_wav, filtrar,  # noqa: E402
                 ir_reverb, mallet, midi, pan, para_db, pico_real_db, reverberar,
                 ruido, ruido_varrido, sino, sos_pa, sos_pb, sos_pf, sub_batida, tempo)

SEMENTE = 4177
FORCA_PADRAO = 0.7


def _desliza(f0, f1, dur, curva=1.0):
    """Fase de um tom que desliza de f0 a f1 (exponencial)."""
    t = tempo(dur)
    x = (t / dur) ** curva
    f = f0 * (f1 / f0) ** x
    return PI2 * np.cumsum(f) / SR, t


def _clique(rng, dur=0.003, pb=5000):
    n = int(dur * SR)
    return filtrar(sos_pb(pb, 1), ruido(n * 3, rng))[:n * 3] * np.exp(-np.arange(n * 3) / (n * 0.5))


def _soma(partes):
    """partes: [(sinal, inicio_s)] -> um sinal (mono ou estéreo)."""
    est = any(p.ndim == 2 for p, _ in partes)
    n = max(int(round(t0 * SR)) + len(p) for p, t0 in partes)
    out = np.zeros((n, 2)) if est else np.zeros(n)
    for p, t0 in partes:
        i = int(round(t0 * SR))
        if est and p.ndim == 1:
            p = pan(p, 0.0)
        out[i:i + len(p)] += p
    return out


# ------------------------------------------------------------- geradores ---
# cada um devolve (sinal, pre): `pre` = segundos de som antes do ponto t

def fx_whoosh(forca, dur, rng):
    x = np.arange(int(dur * SR)) / (dur * SR)
    e = np.sin(np.pi * x ** 0.85) ** 2
    a = ruido_varrido(dur, 380, 4200, rng, curva=0.8) * e
    b = ruido_varrido(dur, 380, 4200, rng, curva=0.8) * e
    return np.stack([a * (1 - 0.6 * x), b * (0.4 + 0.6 * x)], axis=1), 0.55 * dur


def fx_subida(forca, dur, rng):
    n = int(dur * SR)
    x = np.arange(n) / n
    e = x ** 2.4
    q = int(0.04 * SR)
    e[-q:] *= cos_sobe(q)[::-1]
    fase, _ = _desliza(220, 440, dur, 1.3)
    s = ruido_varrido(dur, 320, 7000, rng, curva=1.5) * e + 0.10 * np.sin(fase[:n]) * x ** 3 * e
    s2 = ruido_varrido(dur, 320, 7000, rng, curva=1.5) * e + 0.10 * np.sin(fase[:n]) * x ** 3 * e
    return np.stack([s, s2], axis=1), 0.0


def fx_impacto(forca, dur, rng):
    t = tempo(0.45)
    baque = np.sin(PI2 * 132 * t) * np.exp(-t / 0.085) * (1 - np.exp(-t / 0.002))
    n = int(0.9 * SR)
    chuva = filtrar(sos_pa(3600, 2), ruido(n, rng)) * np.exp(-tempo(0.9) / 0.26) * (1 - np.exp(-tempo(0.9) / 0.003))
    partes = [(sub_batida(84, 46, 0.36), 0.0), (0.42 * baque, 0.0), (0.11 * chuva, 0.0)]
    for j, (m, p) in enumerate(((74, -0.5), (81, 0.5), (90, 0.0))):
        partes.append((pan(sino(m, 1.7, 0.8), p) * 0.26 * (0.6 + 0.4 * forca), 0.012 * j))
    return _soma(partes), 0.002


def fx_pop(forca, dur, rng):
    t = tempo(0.17)
    f = 430 + 400 * (1 - np.exp(-t / 0.02))
    s = np.sin(PI2 * np.cumsum(f) / SR) * np.exp(-t / 0.045) * (1 - np.exp(-t / 0.0012))
    c = _clique(rng, 0.002, 6000)
    s[:len(c)] += 0.22 * c
    return s, 0.0


def fx_tick(forca, dur, rng):
    t = tempo(0.07)
    s = 0.7 * np.sin(PI2 * 2300 * t) * np.exp(-t / 0.006) + 0.5 * np.sin(PI2 * 1150 * t) * np.exp(-t / 0.013)
    c = filtrar(sos_pa(3000, 1), _clique(rng, 0.0012, 12000))
    s[:len(c)] += 0.3 * c
    return s * (1 - np.exp(-t / 0.0005)), 0.0


def fx_foco(forca, dur, rng):
    n = int((dur + 0.2) * SR)
    x = np.clip(np.arange(n) / (dur * SR), 0, None)
    e = np.where(x < 0.65, np.sin(np.pi / 2 * x / 0.65) ** 2,
                 np.cos(np.pi / 2 * np.clip((x - 0.65) / 0.55, 0, 1)) ** 2)
    ar = ruido_varrido(dur + 0.2, 320, 1500, rng, largura=1.6, curva=0.9)
    ar2 = ruido_varrido(dur + 0.2, 320, 1500, rng, largura=1.6, curva=0.9)
    t = np.arange(n) / SR
    tom = 0.14 * np.sin(PI2 * 220 * t) + 0.12 * np.sin(PI2 * 330 * t)
    return np.stack([(ar + tom) * e, (ar2 + tom) * e], axis=1), 0.0


def fx_janela(forca, dur, rng):
    d = 0.24
    x = np.arange(int(d * SR)) / (d * SR)
    e = np.where(x < 0.75, (x / 0.75) ** 1.5, np.cos(np.pi / 2 * (x - 0.75) / 0.25) ** 2)
    ar = ruido_varrido(d, 700, 5200, rng, curva=1.2) * e * 0.55
    fase, t = _desliza(520, 880, 0.26, 0.5)
    bloop = np.sin(fase) * np.exp(-t / 0.085) * (1 - np.exp(-t / 0.004)) * 0.8
    tk, _ = fx_tick(forca, dur, rng)
    return _soma([(ar, 0.0), (bloop, 0.03), (0.35 * tk, 0.19)]), 0.0


def fx_janela_fecha(forca, dur, rng):
    d = 0.20
    x = np.arange(int(d * SR)) / (d * SR)
    e = np.sin(np.pi * x ** 0.6) ** 1.5
    ar = ruido_varrido(d, 4500, 600, rng, curva=0.8) * e * 0.5
    fase, t = _desliza(760, 440, 0.2, 0.6)
    bloop = np.sin(fase) * np.exp(-t / 0.06) * (1 - np.exp(-t / 0.004)) * 0.7
    return _soma([(ar, 0.0), (bloop, 0.02)]), 0.0


def _nota_macia(m, dur, brilho):
    a = mallet(m, dur, 0.7 * brilho)
    b = sino(m, dur * 1.3, 0.4 * brilho)
    out = np.zeros(max(len(a), len(b)))
    out[:len(a)] += 0.8 * a
    out[:len(b)] += 0.35 * b
    return out


def fx_check(forca, dur, rng):
    return _soma([(_nota_macia(81, 0.5, 1.0), 0.0), (_nota_macia(86, 0.6, 1.0) * 1.05, 0.085)]), 0.0


def fx_valor(forca, dur, rng):
    t = tempo(0.9)
    calor = np.sin(PI2 * midi(62) * t) * np.exp(-t / 0.3) * (1 - np.exp(-t / 0.004))
    return _soma([(0.7 * sino(78, 1.3, 0.8), 0.0), (0.5 * sino(86, 1.1, 0.6), 0.004),
                  (0.35 * calor, 0.0)]), 0.0


def fx_alerta(forca, dur, rng):
    def nota(f, d, decai):
        t = tempo(d)
        s = np.sin(PI2 * f * t) + 0.18 * np.sin(PI2 * 3 * f * t) + 0.08 * np.sin(PI2 * 2 * f * t)
        e = np.exp(-t / decai)
        a = int(0.008 * SR)
        e[:a] *= cos_sobe(a)
        e[-a:] *= cos_sobe(a)[::-1]
        return s * e
    s = _soma([(nota(midi(78), 0.22, 0.085), 0.0), (nota(midi(73), 0.45, 0.15), 0.14)])
    return filtrar(sos_pb(3000, 2), s), 0.0


def fx_erro(forca, dur, rng):
    def pulso():
        t = tempo(0.13)
        s = sum(np.sin(PI2 * 147 * h * t) / h ** 0.8 for h in range(1, 9))
        e = np.exp(-t / 0.05) * (1 - np.exp(-t / 0.004))
        e[-200:] *= cos_sobe(200)[::-1]
        return filtrar(sos_pb(1200, 2), s * e)
    return _soma([(pulso(), 0.0), (0.85 * pulso(), 0.13), (0.6 * sub_batida(115, 72, 0.06), 0.0)]), 0.0


def fx_queda(forca, dur, rng):
    fase, t = _desliza(620, 92, dur + 0.12, 0.8)
    x = np.clip(t / dur, 0, 1)
    s = np.sin(fase) + 0.3 * np.sin(2 * fase)
    e = (1 - 0.85 * x) ** 0.8 * (1 - np.exp(-t / 0.01))
    e[-int(0.1 * SR):] *= cos_sobe(int(0.1 * SR))[::-1]
    escuro = filtrar(sos_pb(520, 2), s)
    s = (s * (1 - x) + escuro * x) * e
    for _ in range(4):
        i = int(rng.uniform(0.05, 0.6) * dur * SR)
        c = filtrar(sos_pa(2000, 1), _clique(rng, 0.004, 9000))
        s[i:i + len(c)] += 0.22 * c[: len(s) - i]
    return s, 0.0


def fx_barrado(forca, dur, rng):
    c = _clique(rng, 0.004, 2500)
    t = tempo(0.12)
    toc = np.sin(PI2 * 430 * t) * np.exp(-t / 0.02) * (1 - np.exp(-t / 0.001))
    return _soma([(sub_batida(205, 96, 0.05, 0.3), 0.0), (0.55 * c, 0.0), (0.6 * toc, 0.0),
                  (0.35 * sub_batida(170, 90, 0.035, 0.22), 0.11), (0.22 * toc, 0.11)]), 0.0


def fx_carimbo(forca, dur, rng):
    t = tempo(0.5)
    toc = np.sin(PI2 * 310 * t) * np.exp(-t / 0.024)
    papel = filtrar(sos_pf(1200, 5200, 2), ruido(len(t), rng))
    papel = papel * (0.45 * np.exp(-t / 0.04) + 0.06 * np.exp(-t / 0.13)) * (1 - np.exp(-t / 0.002))
    return _soma([(sub_batida(122, 70, 0.085, 0.45), 0.0), (0.75 * toc, 0.0), (1.4 * papel, 0.003)]), 0.0


def fx_contagem(forca, dur, rng):
    k_total = max(4, int(round(dur * 18)))
    partes = []
    for k in range(k_total + 1):
        tk = dur * (1 - (1 - k / k_total) ** 0.625)
        t = tempo(0.05)
        f = 1500 + 900 * k / k_total
        s = (np.sin(PI2 * f * t) * np.exp(-t / 0.007) + 0.4 * np.sin(PI2 * f / 2 * t) * np.exp(-t / 0.012))
        s *= (1 - np.exp(-t / 0.0006)) * (0.55 + 0.45 * k / k_total) * (1.3 if k == k_total else 1.0)
        partes.append((s * rng.uniform(0.85, 1.0), tk))
    return _soma(partes), 0.0


def fx_risco(forca, dur, rng):
    n = int(dur * SR)
    base = filtrar(sos_pf(2000, 7000, 2), ruido(n + 1024, rng))[1024:]
    e, i = np.zeros(n), 0
    while i < n:
        comp = int(rng.uniform(0.05, 0.13) * SR)
        comp = min(comp, n - i)
        if comp > 64:
            e[i:i + comp] = np.sin(np.pi * np.arange(comp) / comp) ** 1.2 * rng.uniform(0.5, 1.0)
        i += comp + int(rng.uniform(0.008, 0.035) * SR)
    return base * e * env_ar(n, 0.01, 0.03), 0.0


def fx_teclas(forca, dur, rng):
    partes, tk = [], 0.0
    while tk < dur:
        t = tempo(0.06)
        f = rng.uniform(330, 520)
        s = 0.7 * np.sin(PI2 * f * t) * np.exp(-t / 0.011)
        c = _clique(rng, 0.0017, 4500)
        s[:len(c)] += c * 1.4
        partes.append((s * rng.uniform(0.6, 1.0), tk))
        tk += rng.uniform(0.065, 0.14)
    return _soma(partes), 0.0


def fx_brilho(forca, dur, rng):
    partes = []
    for j, m in enumerate((86, 93, 98, 102)):
        partes.append((pan(sino(m, 0.9, 0.5), (-0.5, 0.5, -0.25, 0.25)[j]) * (0.8 - 0.1 * j), 0.05 * j))
    t = tempo(0.9)
    graos = filtrar(sos_pa(7000, 2), ruido(len(t), rng)) * np.exp(-t / 0.25)
    graos *= 0.5 + 0.5 * np.abs(np.sin(PI2 * 23 * t + rng.uniform(0, 6)))
    partes.append((0.07 * graos, 0.02))
    return _soma(partes), 0.0


def fx_deslize(forca, dur, rng):
    x = np.arange(int(dur * SR)) / (dur * SR)
    return ruido_varrido(dur, 520, 1900, rng, curva=1.0) * np.sin(np.pi * x) ** 1.3, 0.0


# nome: (gerador, dur padrão, pico em dBFS com forca=1, envio p/ reverb, descrição)
TIPOS = {
    "whoosh":       (fx_whoosh, 0.5, -21.0, 0.10, "ar varrendo numa transição; t = meio (pico) da varrida, dura `dur`"),
    "subida":       (fx_subida, 1.0, -21.0, 0.10, "riser de ar; começa em t e chega ao auge em t+dur"),
    "impacto":      (fx_impacto, 0.0, -12.5, 0.50, "batida grave macia + brilho de sinos (marca, preço); t = batida"),
    "pop":          (fx_pop, 0.0, -22.0, 0.10, "blip curto que sobe: elemento entra; t = entrada"),
    "tick":         (fx_tick, 0.0, -24.0, 0.00, "tique de interface para contorno/realce; t = tique"),
    "foco":         (fx_foco, 0.6, -25.0, 0.15, "sopro suave para aproximação de câmera; começa em t, dura `dur`"),
    "janela":       (fx_janela, 0.0, -20.0, 0.25, "janela salta: ar subindo + bloop + clique (≈0,3 s); t = início"),
    "janela_fecha": (fx_janela_fecha, 0.0, -25.0, 0.15, "janela volta: ar descendo, mais baixo (≈0,2 s); t = início"),
    "check":        (fx_check, 0.0, -18.0, 0.30, "duas notas que sobem (Lá→Ré): confirmação; t = 1ª nota"),
    "valor":        (fx_valor, 0.0, -17.0, 0.35, "sino quente quando um valor pousa; t = batida"),
    "alerta":       (fx_alerta, 0.0, -19.0, 0.20, "duas notas que descem, macias: aviso âmbar; t = 1ª nota"),
    "erro":         (fx_erro, 0.0, -20.0, 0.05, "dois pulsos graves e surdos: não bate; t = 1º pulso"),
    "queda":        (fx_queda, 0.8, -20.0, 0.10, "tom que desce e apaga: conexão caiu; começa em t, dura `dur`"),
    "barrado":      (fx_barrado, 0.0, -18.0, 0.05, "baque abafado com rebote: bloqueado; t = baque"),
    "carimbo":      (fx_carimbo, 0.0, -15.0, 0.12, "carimbo: baque + papel; t = batida"),
    "contagem":     (fx_contagem, 0.8, -23.0, 0.00, "tiques rápidos que desaceleram: número contando; de t a t+dur"),
    "risco":        (fx_risco, 0.6, -25.0, 0.00, "lápis riscando enquanto um ícone se desenha; de t a t+dur"),
    "teclas":       (fx_teclas, 0.8, -24.0, 0.00, "digitação suave; de t a t+dur"),
    "brilho":       (fx_brilho, 0.0, -20.0, 0.50, "cintilar curto e ascendente para a logo; t = início"),
    "deslize":      (fx_deslize, 0.4, -25.0, 0.05, "deslize/rolagem de interface; de t a t+dur"),
}


def gerar(tipo, forca=FORCA_PADRAO, dur=None, pan_=0.0, rng=None):
    """Um efeito pronto em estéreo. Devolve (sinal (n,2), pre, envio_reverb)."""
    fn, dur_pad, pico_db, envio, _ = TIPOS[tipo]
    rng = rng or np.random.default_rng(SEMENTE)
    d = float(dur) if dur else dur_pad
    if dur_pad > 0:
        d = float(np.clip(d, 0.08, 6.0))
    s, pre = fn(forca, d, rng)
    s = s * (db(pico_db) / max(1e-9, np.max(np.abs(s))))
    s = s * max(0.0, min(1.0, forca)) ** 1.2
    if s.ndim == 1:
        s = pan(s, pan_) * np.sqrt(2)          # no centro, cada canal fica no pico de referência
    else:
        p = float(np.clip(pan_, -1, 1))
        s = s * np.array([min(1.0, 1 - p), min(1.0, 1 + p)])
    q = min(len(s) // 2, 96)                    # borda sem estalo
    if q > 0:
        s[-q:] *= cos_sobe(q)[::-1][:, None]
    return s, pre, envio


def renderizar(eventos, duracao):
    n = int(round(duracao * SR))
    seco, envio_bus = np.zeros((n, 2)), np.zeros((n, 2))
    contagem, desconhecidos = {}, []
    for i, ev in enumerate(eventos):
        tipo = ev.get("tipo")
        if tipo not in TIPOS:
            desconhecidos.append(tipo)
            print(f"AVISO: tipo desconhecido '{tipo}' em t={ev.get('t')} — ignorado", file=sys.stderr)
            continue
        rng = np.random.default_rng(SEMENTE + 7919 * i + int(round(float(ev["t"]) * 1000)))
        s, pre, envio = gerar(tipo, float(ev.get("forca", FORCA_PADRAO)), ev.get("dur"),
                              float(ev.get("pan", 0.0)), rng)
        colocar(seco, s, float(ev["t"]) - pre)
        if envio:
            colocar(envio_bus, s, float(ev["t"]) - pre, envio)
        contagem[tipo] = contagem.get(tipo, 0) + 1
    molhado = reverberar(envio_bus, ir_reverb(0.85, seed=SEMENTE, pb=7000, pa=320, predelay=0.008))
    out = seco + 0.5 * molhado
    q = int(0.05 * SR)
    out[-q:] *= cos_sobe(q)[::-1][:, None]
    return out, contagem, desconhecidos


def duracao_narracao():
    return json.load(open("audio/narracao/palavras.json", encoding="utf-8"))["duracao"]


def exemplo():
    """Eventos de exemplo (só para teste do som), apoiados nos tempos da narração."""
    p = json.load(open("audio/narracao/palavras.json", encoding="utf-8"))
    a = {x["id"]: x for x in p["assuntos"]}

    def tok(ass, texto, n=0):
        ach = [t for t in a[ass]["tokens"] if t["t"].strip(".,:;?!").lower() == texto.lower()]
        return ach[n]["ini"]
    ev = [
        dict(t=0.25, tipo="whoosh", dur=0.6, forca=0.6),
        dict(t=tok("dor", "caderno"), tipo="risco", dur=0.5, pan=-0.3),
        dict(t=tok("dor", "WhatsApp"), tipo="pop", pan=0.3),
        dict(t=tok("dor", "papel"), tipo="risco", dur=0.45),
        dict(t=tok("dor", "quanto"), tipo="contagem", dur=1.0),
        dict(t=tok("dor", "bate"), tipo="erro", forca=0.8),
        dict(t=tok("virada", "FAZLO") - 1.2, tipo="subida", dur=1.2, forca=0.6),
        dict(t=tok("virada", "FAZLO"), tipo="impacto", forca=0.9),
        dict(t=tok("virada", "FAZLO") + 0.1, tipo="brilho", forca=0.6),
        dict(t=a["visao"]["ini"] - 0.5, tipo="whoosh", dur=0.5),
        dict(t=tok("visao", "hospedado"), tipo="foco", dur=0.6),
        dict(t=tok("visao", "hospedado") + 0.25, tipo="tick"),
        dict(t=tok("visao", "chega"), tipo="tick", pan=0.0),
        dict(t=tok("visao", "sai"), tipo="tick", pan=0.3),
        dict(t=tok("visao", "quanto"), tipo="janela"),
        dict(t=tok("visao", "quanto") + 0.35, tipo="valor", forca=0.6),
        dict(t=a["visao"]["fim"] + 0.9, tipo="janela_fecha"),
        dict(t=a["calendario"]["ini"] - 0.3, tipo="deslize", dur=0.4),
        dict(t=tok("duplicada", "avisa"), tipo="alerta"),
        dict(t=tok("sinal", "sinal"), tipo="teclas", dur=0.6),
        dict(t=tok("sinal", "calculado"), tipo="check"),
        dict(t=tok("internet", "cair"), tipo="queda", dur=0.8),
        dict(t=tok("internet", "não"), tipo="barrado"),
        dict(t=tok("internet", "vezes"), tipo="carimbo"),
        dict(t=tok("teste", "30"), tipo="contagem", dur=0.7),
        dict(t=tok("teste", "30") + 0.7, tipo="valor"),
        dict(t=tok("preco", "R$ 99,90"), tipo="contagem", dur=1.6),
        dict(t=tok("preco", "R$ 99,90") + 1.6, tipo="impacto", forca=0.7),
        dict(t=tok("preco", "R$ 79,90"), tipo="carimbo", forca=0.8),
        dict(t=tok("chamada", "responder"), tipo="pop"),
        dict(t=a["chamada"]["fim"] + 0.9, tipo="brilho"),
        dict(t=a["chamada"]["fim"] + 0.9, tipo="tipo_que_nao_existe"),
    ]
    return dict(observacao="Arquivo de exemplo para testar o som; o real é audio/eventos.json.",
                eventos=[{k: (round(v, 3) if isinstance(v, float) else v) for k, v in e.items()} for e in ev])


def teste():
    print(f"{'tipo':13s} {'dur (s)':>8s} {'pico dBFS':>10s} {'RMS dB':>8s} {'pré (s)':>8s}")
    ok = True
    for tipo in TIPOS:
        s, pre, _ = gerar(tipo, 1.0, None, 0.0, np.random.default_rng(SEMENTE))
        pico = float(para_db(np.max(np.abs(s))))
        rms = float(10 * np.log10(np.mean(s ** 2) + 1e-20))
        vivo = np.isfinite(s).all() and pico > -60
        ok &= vivo
        print(f"{tipo:13s} {len(s) / SR:8.2f} {pico:10.1f} {rms:8.1f} {pre:8.2f}  {'ok' if vivo else 'MUDO!'}")
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("eventos", nargs="?", default="audio/eventos.json")
    ap.add_argument("-o", "--saida", default="audio/efeitos.wav")
    ap.add_argument("--duracao", type=float, default=None)
    ap.add_argument("--teste", action="store_true")
    ap.add_argument("--gerar-exemplo", action="store_true")
    a = ap.parse_args()

    if a.teste:
        sys.exit(0 if teste() else 1)
    if a.gerar_exemplo:
        json.dump(exemplo(), open("audio/eventos.exemplo.json", "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("gravado: audio/eventos.exemplo.json")
        return

    dados = json.load(open(a.eventos, encoding="utf-8"))
    eventos = dados["eventos"] if isinstance(dados, dict) else dados
    dur = a.duracao or duracao_narracao()
    out, contagem, desconhecidos = renderizar(eventos, dur)
    escrever_wav(a.saida, out)
    print(f"{a.saida}: {len(out) / SR:.2f} s, {sum(contagem.values())} eventos, "
          f"pico {para_db(np.max(np.abs(out))):.1f} dBFS, pico real {pico_real_db(out):.1f} dBTP")
    print("por tipo:", ", ".join(f"{k}×{v}" for k, v in sorted(contagem.items())))
    if desconhecidos:
        print("ignorados (tipo desconhecido):", desconhecidos)


if __name__ == "__main__":
    main()
