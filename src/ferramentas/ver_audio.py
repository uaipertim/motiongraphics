"""ver_audio.py — desenha forma de onda + espectrograma da trilha com as marcas de compasso e cenas
(como não dá para ouvir aqui, a trilha é revisada visualmente e por medição).
uso: python3 src/ferramentas/ver_audio.py build/trilha.wav build/trilha.png
"""
import json
import os
import sys
import wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TEMPO = json.load(open(os.path.join(RAIZ, 'src', 'tempo.json')))
BAR = 240.0 / TEMPO['bpm']


def le_wav(c):
    w = wave.open(c)
    n, sr, nc, sw = w.getnframes(), w.getframerate(), w.getnchannels(), w.getsampwidth()
    b = np.frombuffer(w.readframes(n), np.uint8).reshape(-1, sw)
    v = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16))
    v = np.where(v >= 2 ** 23, v - 2 ** 24, v) / 2 ** 23
    return v.reshape(-1, nc), sr


x, sr = le_wav(sys.argv[1])
m = x.mean(axis=1)
dur = len(m) / sr
LW, HW, HS = 2400, 260, 520
img = Image.new('RGB', (LW, HW + HS + 60), (16, 16, 16))
d = ImageDraw.Draw(img)
# forma de onda (pico e RMS por coluna)
col = np.array_split(m, LW)
for i, c in enumerate(col):
    pk = np.max(np.abs(c)); rms = np.sqrt(np.mean(c ** 2))
    d.line([(i, HW / 2 - pk * HW / 2), (i, HW / 2 + pk * HW / 2)], fill=(90, 120, 40))
    d.line([(i, HW / 2 - rms * HW / 2), (i, HW / 2 + rms * HW / 2)], fill=(175, 250, 39))
# espectrograma (log freq)
nfft, hop = 4096, int(dur * sr / LW)
fr = np.fft.rfftfreq(nfft, 1 / sr)
ylog = np.geomspace(30, 16000, HS)
idx = np.searchsorted(fr, ylog)
S = np.zeros((HS, LW))
win = np.hanning(nfft)
for i in range(LW):
    a = i * hop
    seg = m[a:a + nfft]
    if len(seg) < nfft:
        seg = np.pad(seg, (0, nfft - len(seg)))
    sp = 20 * np.log10(np.abs(np.fft.rfft(seg * win)) / (nfft / 4) + 1e-9)
    S[:, i] = sp[np.clip(idx, 0, len(sp) - 1)][::-1]
S = np.clip((S + 90) / 80, 0, 1)
cor = (np.stack([S ** 1.2 * 175, S * 250, S ** 2 * 39], axis=2)).astype(np.uint8)
img.paste(Image.fromarray(cor), (0, HW))
try:
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
except OSError:
    f = ImageFont.load_default()
for b in range(0, 29):
    xx = b * BAR / dur * LW
    d.line([(xx, 0), (xx, HW + HS)], fill=(70, 70, 70) if b % 4 else (140, 140, 140))
for c in TEMPO['cenas']:
    xx = c['ini'] * BAR / dur * LW
    d.text((xx + 3, HW + HS + 8), c['id'], fill=(230, 230, 230), font=f)
for hz in (60, 250, 1000, 4000, 12000):
    yy = HW + HS - np.searchsorted(ylog, hz)
    d.text((4, yy - 8), f'{hz} Hz', fill=(200, 200, 200), font=f)
img.save(sys.argv[2])
# RMS por compasso
for b in range(0, 28):
    a, z = int(b * BAR * sr), int((b + 1) * BAR * sr)
    seg = m[a:z]
    if len(seg):
        print(f'compasso {b:2d}: RMS {20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9):6.1f} dBFS')
