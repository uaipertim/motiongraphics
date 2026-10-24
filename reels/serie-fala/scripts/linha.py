#!/usr/bin/env python3
"""
A linha do tempo de um episódio da SÉRIE FALA: junta a narração (audio/<id>/voz/) e o roteiro (episodios/<id>.json).

    python3 scripts/linha.py fala-01   -> audio/fala-01/linha.json   (cenas e palavras no tempo do vídeo)
                                          audio/fala-01/voz.wav      (a narração montada, 48 kHz mono, no tempo do vídeo)

Cada cena começa quando a anterior termina. A fala de uma cena entra `inicio` s depois do começo dela (padrão 0,08 s: o gancho já está
falado e escrito no quadro 0) e a cena dura até o fim da fala + `pausa`
(padrão 0,16 s), com um mínimo `min` quando a cena precisa de tempo parada (a virada e o fecho).
As palavras vêm da marcação de tempo da API (início da 1ª letra, fim da última); "destaque" (as frases do JSON,
mais `destaque_global`) marca as palavras-chave da legenda.
Ajustes de 24/10/2026 (eleven_v4):
  • o fim da voz é o "fim_da_fala" do falas.json, medido no áudio (−40 dBFS; ver voz.py); nenhuma palavra passa dele;
  • o início de cada palavra que vem depois de uma pausa (≥ 0,12 s) é medido no áudio da própria cena, como no encaixe
    das tomadas e na revisão (qa.py): é o fim do último silêncio (≥ 30 ms, 26 dB abaixo do nível da voz) antes da
    palavra. A marcação do v4 chega a errar 0,2 s nessas palavras; a legenda passa a sair no instante da voz.
"""
import json
import os
import re
import sys
import unicodedata
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else 'fala-01'
AUD = os.path.join(ROOT, 'audio', EP)
SCRIPT = json.load(open(os.path.join(ROOT, 'episodios', EP + '.json')))
FALAS = {f['n']: f for f in json.load(open(os.path.join(AUD, 'voz', 'falas.json')))['falas']}
SR_IN, SR = 44100, 48000
FADE_FINAL = 0.30                                   # o fade para o preto depois da última cena


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return re.sub(r'[^a-z0-9]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))


PAUSA_REFINA = 0.12                                  # pausa antes da palavra a partir da qual o início é medido no áudio


def refina_inicios(ws, y, sr):
    """o início de cada palavra depois de uma pausa, medido no áudio da cena (tempos do arquivo); devolve [(palavra, antes, depois)]"""
    env = 20 * np.log10(np.sqrt(uniform_filter1d(y.astype(np.float64) ** 2, int(0.01 * sr)) + 1e-12))
    lim = np.percentile(env[env > -80], 95) - 26                                   # 26 dB abaixo do nível da voz
    q30, mudou = int(0.03 * sr), []
    for i in range(1, len(ws)):
        w, ant = ws[i], ws[i - 1]
        if w['t0'] - ant['t1'] < PAUSA_REFINA:
            continue
        a0 = max(int((ant['t0'] + 0.05) * sr), int((w['t0'] - 0.40) * sr))
        a1 = min(len(env), int((w['t0'] + 0.20) * sr))
        q = env[a0:a1] <= lim
        j, fim_q = len(q) - 1 - int(0.10 * sr), None                               # o último silêncio de ≥ 30 ms antes da palavra
        while j >= q30:
            if q[j - q30:j + 1].all():
                while j + 1 < len(q) and q[j + 1]:
                    j += 1
                fim_q = j + 1; break
            j -= 1
        if fim_q is None or fim_q >= len(q):
            continue
        t_on = (a0 + fim_q) / sr
        if ant['t0'] + 0.05 < t_on < w['t1'] - 0.03:
            mudou.append((w['w'], round(w['t0'], 3), round(t_on, 3)))
            w['t0'] = t_on
    return mudou


def palavras(al, t_voz, onset, fim=None, y=None, sr=None):
    """as palavras da fala: (texto, início, fim) no tempo do vídeo; cada palavra vai do 1º ao último caractere dela,
    o início das que vêm depois de uma pausa medido no áudio (y) e nenhuma passando do fim real da voz (fim)"""
    ch, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    out, cur = [], None
    for c, a, b in zip(ch, st, en):
        if c.isspace():
            if cur:
                out.append(cur); cur = None
            continue
        if cur is None:
            cur = {'w': '', 't0': a, 't1': b}
        cur['w'] += c; cur['t1'] = b
    if cur:
        out.append(cur)
    if fim is not None:
        for w in out:
            w['t1'] = min(w['t1'], fim)
    mudou = refina_inicios(out, y, sr) if y is not None else []
    for w in out:
        w['t0'] = round(t_voz + w['t0'] - onset, 4); w['t1'] = round(t_voz + w['t1'] - onset, 4)
    return out, mudou


def main():
    cenas, t = [], 0.0
    pistas, refinadas = [], []
    for n, c in enumerate(SCRIPT['cenas'], 1):
        f = FALAS[n]
        ini = c.get('inicio', 0.08)
        onset, fim = f['inicio_da_fala'], f['fim_da_fala']
        dur_fala = fim - onset
        t_voz = t + ini
        t1 = max(t_voz + dur_fala + c.get('pausa', 0.16), t + c.get('min', 0))
        sr_c, y_c = wavfile.read(os.path.join(AUD, 'voz', f'cena-{n}.wav'))
        ws, mudou = palavras(f['alinhamento'], t_voz, onset, fim, y_c.astype(np.float64) / 32768, sr_c)
        refinadas.extend((n, *m) for m in mudou)
        # palavras-chave da legenda: as frases de "destaque" (e "destaque_global"), casadas palavra a palavra
        frases = [[norm(x) for x in p.split()] for p in c.get('destaque', []) + SCRIPT.get('destaque_global', [])]
        nw = [norm(w['w']) for w in ws]
        for w in ws:
            w['chave'] = False
        for fr in frases:
            for i in range(len(nw) - len(fr) + 1):
                if nw[i:i + len(fr)] == fr:
                    for k in range(i, i + len(fr)):
                        ws[k]['chave'] = True
        cenas.append({'n': n, 'tipo': c['tipo'], 'dados': c.get('dados', {}), 'fala': c['fala'], 't0': round(t, 4), 't1': round(t1, 4),
                      'voz_t0': round(t_voz, 4), 'voz_t1': round(t_voz + dur_fala, 4), 'palavras': ws})
        pistas.append((t_voz - 0.0, n, onset, fim))
        t = t1
    dur = t + FADE_FINAL
    # a narração montada (48 kHz), cada fala aparada no início da 1ª letra (−20 ms) e no fim (+120 ms), com fades curtos
    x = np.zeros(int(round(dur * SR)))
    for t_voz, n, onset, fim in pistas:
        sr, y = wavfile.read(os.path.join(AUD, 'voz', f'cena-{n}.wav'))
        y = y.astype(np.float64) / 32768
        a, b = int(max(0, onset - 0.02) * sr), min(len(y), int((fim + 0.12) * sr))
        y = resample_poly(y[a:b], SR, sr)
        k = int(0.008 * SR)
        y[:k] *= np.linspace(0, 1, k); y[-k * 3:] *= np.linspace(1, 0, k * 3)
        i = int(round((t_voz - 0.02) * SR))
        x[i:i + len(y)] += y[: max(0, len(x) - i)]
    wavfile.write(os.path.join(AUD, 'voz.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
    json.dump({'episodio': EP, 'titulo': SCRIPT['titulo'], 'duracao': round(dur, 4), 'fade_final': FADE_FINAL, 'cenas': cenas,
               'inicios_medidos_no_audio': [{'cena': n, 'palavra': w, 'marcacao_s': a, 'audio_s': b} for n, w, a, b in refinadas]},
              open(os.path.join(AUD, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'{EP}: {len(cenas)} cenas, {dur:.2f} s (30–42 s)')
    for n, w, a, b in refinadas:
        print(f'  cena {n}: "{w}" começa em {b:.3f} s no áudio (marcação da API: {a:.3f} s, {(b - a) * 1000:+.0f} ms)')
    for c in cenas:
        print(f'  cena {c["n"]} {c["tipo"]:9s} {c["t0"]:6.2f}–{c["t1"]:6.2f} s ({c["t1"] - c["t0"]:.2f} s) · fala {c["voz_t0"]:.2f}–{c["voz_t1"]:.2f}')


if __name__ == '__main__':
    main()
