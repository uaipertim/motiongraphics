#!/usr/bin/env python3
"""
Trilha do Reel 03-teste: a mesma trilha e os mesmos efeitos do "Controle de caixa", recortados nos
mesmos pontos da imagem (src/mapa.json), com crossfade curto em cada corte.

    node scripts/render.cjs cues     -> audio/cues-original.json (os eventos no tempo do original, com as trocas do teste)
    python3 scripts/trilha.py        -> audio/trilha.wav (12 s, 48 kHz, −14 LUFS, pico real ≤ −2,2 dBTP)
                                        audio/cues.json   (os eventos remontados para o tempo novo)

1. Sons do que o teste tirou saem antes da mixagem: a digitação de "CONTROLE DE CAIXA" ('type'), o domínio
   ('domain') e a subida das linhas do título antigo ('rise' em 0,05 e 0,3 s; o título novo já está no quadro 0).
   A mixagem é a do Reel 03 (scripts/audio.py, a mesma), em 30 s, no tempo do original.
2. Cada trecho do mapa é copiado da mixagem; nos cortes (sempre em múltiplos de 0,5 s, no tempo da música
   de 120 BPM), crossfade de igual potência de 30 ms centrado no corte.
3. Fade para o silêncio junto com o fade da imagem (11,7–12 s); volume de novo em −14 LUFS, com limitador de pico real.
4. Os cues que caem dentro de cada trecho são levados para o tempo novo (audio/cues.json), para a revisão de sincronia.
"""
import json
import os
import re
import subprocess
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, 'audio')
MAPA = json.load(open(os.path.join(ROOT, 'src', 'mapa.json')))
ORIG = json.load(open(os.path.join(AUD, 'cues-original.json')))
SR = 48000
TARGET = -14.0


def removido(c):
    return c['type'] in ('type', 'domain') or (c['type'] == 'rise' and c['t'] < 0.5)


# ---- 1. a mixagem do original, sem os sons do que saiu
cues_mix = dict(ORIG, cues=[c for c in ORIG['cues'] if not removido(c)])
tmp_cues, tmp_wav = os.path.join(AUD, '.cues-mix.json'), os.path.join(AUD, '.trilha-original.wav')
json.dump(cues_mix, open(tmp_cues, 'w'))
subprocess.run(['python3', os.path.join(ROOT, 'scripts', 'audio.py'), tmp_cues, tmp_wav], check=True)
x = wavfile.read(tmp_wav)[1].astype(np.float64) / 32768
os.remove(tmp_cues); os.remove(tmp_wav)

# ---- 2. os trechos, com crossfade de igual potência nos cortes
DUR = MAPA['duracao']
N = int(round(DUR * SR))
XF = MAPA['crossfade']
h = int(XF * SR / 2)
out = np.zeros((N, 2))
for k, tr in enumerate(MAPA['trechos']):
    a, b = int(round(tr['novo'][0] * SR)), int(round(tr['novo'][1] * SR))
    o = int(round(tr['original'] * SR))
    pre = h if k > 0 else 0                                   # entra 15 ms antes do corte...
    post = h if k < len(MAPA['trechos']) - 1 else 0           # ...e sai 15 ms depois
    seg = x[o - pre: o + (b - a) + post].copy()
    env = np.ones(len(seg))
    if pre:
        env[:2 * pre] = np.sin(np.linspace(0, np.pi / 2, 2 * pre))
    if post:
        env[-2 * post:] = np.cos(np.linspace(0, np.pi / 2, 2 * post))
    out[a - pre: a - pre + len(seg)] += seg * env[:, None]

# ---- 3. fade final junto com a imagem + volume
t = np.arange(N) / SR
f0, f1 = MAPA['fade']
out *= (1 - (-(np.cos(np.pi * np.clip((t - f0) / (f1 - f0), 0, 1)) - 1) / 2))[:, None]


def lufs(y):
    raw = os.path.join(AUD, '.medida.wav')
    wavfile.write(raw, SR, np.clip(y, -1, 1).astype(np.float32))
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    os.remove(raw)
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', e[e.rindex('Summary:'):]).group(1))


def true_peak_limit(y, ceiling_db=-3.2, os_=4):
    c = 10 ** (ceiling_db / 20)
    up = resample_poly(y, os_, 1, axis=0)
    need = np.minimum(1.0, c / np.maximum(np.abs(up).max(axis=1), 1e-9))
    w = int(0.002 * SR * os_)
    g = uniform_filter1d(minimum_filter1d(need, w), w // 2)
    g = g[: len(g) // os_ * os_].reshape(-1, os_).min(axis=1)
    z = y[: len(g)] * g[:, None]
    return np.concatenate([z, np.zeros((len(y) - len(z), 2))]) if len(z) < len(y) else z


for _ in range(4):
    out = true_peak_limit(out * 10 ** ((TARGET - lufs(out)) / 20))
I = lufs(out)
wavfile.write(os.path.join(AUD, 'trilha.wav'), SR, np.round(np.clip(out, -1, 1) * 32767).astype(np.int16))

# ---- 4. os cues no tempo novo
novos = []
for tr in MAPA['trechos']:
    a, b, o = tr['novo'][0], tr['novo'][1], tr['original']
    for c in ORIG['cues']:
        if o <= c['t'] < o + (b - a) and not removido(c):
            novos.append(dict(c, t=round(a + c['t'] - o, 4), original=c['t'], trecho=tr['nome']))
novos.sort(key=lambda c: c['t'])
json.dump({'bpm': ORIG['bpm'], 'duration': DUR, 'mapa': MAPA['trechos'], 'cortes': [tr['novo'][0] for tr in MAPA['trechos'][1:]],
           'cues': novos}, open(os.path.join(AUD, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
print(f'ok -> audio/trilha.wav | {I:.1f} LUFS | {len(novos)} cues no tempo novo')
