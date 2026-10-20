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
"""
import json
import os
import re
import sys
import unicodedata
import numpy as np
from scipy.io import wavfile
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


def palavras(al, t_voz, onset):
    """as palavras da fala: (texto, início, fim) no tempo do vídeo; cada palavra vai do 1º ao último caractere dela"""
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
    for w in out:
        w['t0'] = round(t_voz + w['t0'] - onset, 4); w['t1'] = round(t_voz + w['t1'] - onset, 4)
    return out


def main():
    cenas, t = [], 0.0
    pistas = []
    for n, c in enumerate(SCRIPT['cenas'], 1):
        f = FALAS[n]
        ini = c.get('inicio', 0.08)
        onset, fim = f['inicio_da_fala'], f['fim_da_fala']
        dur_fala = fim - onset
        t_voz = t + ini
        t1 = max(t_voz + dur_fala + c.get('pausa', 0.16), t + c.get('min', 0))
        ws = palavras(f['alinhamento'], t_voz, onset)
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
    json.dump({'episodio': EP, 'titulo': SCRIPT['titulo'], 'duracao': round(dur, 4), 'fade_final': FADE_FINAL, 'cenas': cenas},
              open(os.path.join(AUD, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'{EP}: {len(cenas)} cenas, {dur:.2f} s (30–36 s)')
    for c in cenas:
        print(f'  cena {c["n"]} {c["tipo"]:9s} {c["t0"]:6.2f}–{c["t1"]:6.2f} s ({c["t1"] - c["t0"]:.2f} s) · fala {c["voz_t0"]:.2f}–{c["voz_t1"]:.2f}')


if __name__ == '__main__':
    main()
