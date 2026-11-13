#!/usr/bin/env python3
"""Folha de contato do educativo "confirmacao": 2 quadros por segundo do output/confirmacao.mp4, com o tempo e a
palavra falada naquele instante -> output/revisao/folha-contato.jpg"""
import json
import os
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, 'output', 'confirmacao.mp4')
LN = json.load(open(os.path.join(ROOT, 'linha.json')))
TW, TH, COLS, PAD = 180, 320, 8, 8
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', VIDEO, '-vf', f'fps=2,scale={TW}:{TH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, TH, TW, 3)
ws = [w for f in LN['frases'] for w in f['palavras']]
rows = (len(fr) + COLS - 1) // COLS
img = Image.new('RGB', (COLS * (TW + PAD) + PAD, rows * (TH + 34 + PAD) + PAD), (32, 32, 32)); d = ImageDraw.Draw(img)
try:
    fn = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except OSError:
    fn = ImageFont.load_default()
for i, f in enumerate(fr):
    t = i / 2; x = PAD + (i % COLS) * (TW + PAD); y = PAD + (i // COLS) * (TH + 34 + PAD)
    img.paste(Image.fromarray(f), (x, y))
    w = next((w['w'] for w in reversed(ws) if w['t0'] <= t), '')
    d.text((x, y + TH + 4), f'{t:05.2f} s', fill=(175, 250, 39), font=fn)
    d.text((x, y + TH + 18), ('“' + w + '”') if t < LN['logo'] else 'logo', fill=(220, 220, 220), font=fn)
img.save(os.path.join(ROOT, 'output', 'revisao', 'folha-contato.jpg'), quality=85)
print('output/revisao/folha-contato.jpg', len(fr), 'quadros')
