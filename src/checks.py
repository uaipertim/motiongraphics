#!/usr/bin/env python3
"""Verificações no MP4 final: folha de contato (2 quadros/s, por número de quadro) e movimento (10 fps, 0–255, quadro inteiro).
uso: python3 src/checks.py output/experimento.mp4 output/folha-contato.jpg"""
import numpy as np, subprocess, sys
from PIL import Image, ImageDraw
mp4, sheet = sys.argv[1:3]
W, H, FPS = 1080, 1920, 60

def frames(step, w, h, pix):
    bpp = 1 if pix == 'gray' else 3
    p = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', mp4, '-vf', f"select='not(mod(n\\,{step}))',scale={w}:{h}:flags=area",
                          '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', pix, '-'], stdout=subprocess.PIPE)
    n = w * h * bpp
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape((h, w) if bpp == 1 else (h, w, 3))

# 1. folha de contato: quadros 0, 30, 60… (2 por segundo)
tw, th, cols = 180, 320, 12
thumbs = list(frames(30, tw, th, 'rgb24'))
rows = -(-len(thumbs) // cols)
im = Image.new('RGB', (cols * (tw + 6) + 6, rows * (th + 26) + 6), '#1a1a1a'); d = ImageDraw.Draw(im)
for i, t in enumerate(thumbs):
    x, y = 6 + (i % cols) * (tw + 6), 6 + (i // cols) * (th + 26)
    im.paste(Image.fromarray(t), (x, y)); d.text((x + 2, y + th + 4), f'q{i * 30}  {i * .5:.1f}s', fill='#AFFA27')
im.save(sheet, quality=88); print(f'folha de contato: {len(thumbs)} quadros → {sheet}')

# 2. movimento: diferença média absoluta entre quadros a 10 fps (um a cada 6), quadro inteiro, 0–255
prev = None; diffs = []
for f in frames(6, W, H, 'gray'):
    f = f.astype(np.int16)
    if prev is not None: diffs.append(float(np.abs(f - prev).mean()))
    prev = f
d_ = np.array(diffs); print(f'movimento: {len(d_)} pares | mediana {np.median(d_):.2f} | média {d_.mean():.2f} | mínimo {d_.min():.2f} | p10 {np.percentile(d_, 10):.2f}')
run = 0; worst = 0; runs = []
for i, v in enumerate(d_):
    if v < 0.5:
        run += 1
    else:
        if run: runs.append(((i - run) / 10, run / 10))
        run = 0
    worst = max(worst, run)
if run: runs.append(((len(d_) - run) / 10, run / 10))
print(f'trechos parados (<0,5): {len(runs)} | maior: {worst / 10:.1f} s', [r for r in runs if r[1] >= .3])
BT = 60 / 124
for n, a, b in (('S1', 0, 8), ('S2', 8, 16), ('S3', 16, 28), ('S4', 28, 32), ('S5', 32, 40), ('S6', 40, 48), ('S7', 48, 56), ('S8', 56, 64), ('S9', 64, 72), ('S10', 72, 80), ('S11', 80, 104), ('S12', 104, 112), ('S13', 112, 123)):
    s = d_[int(a * BT * 10):int(b * BT * 10)]; print(f'  {n:4s} mediana {np.median(s):5.2f}  mín {s.min():5.2f}')
