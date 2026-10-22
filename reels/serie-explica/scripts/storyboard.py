#!/usr/bin/env python3
"""
Storyboard de um episódio da SÉRIE EXPLICA: para cada capítulo, um quadro do meio da montagem do diagrama
(entre a primeira e a última peça) e o quadro do capítulo pronto (logo antes da troca).

    python3 scripts/storyboard.py explica-01   ->  output/explica-01/storyboard.jpg
"""
import json
import os
import subprocess
import sys
import tempfile
import textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else 'explica-01'
VIDEO = os.path.join(ROOT, 'output', EP, f'fazlo-hospeda-{EP}.mp4')
LN = json.load(open(os.path.join(ROOT, 'audio', EP, 'linha.json')))
MOT = json.load(open(os.path.join(ROOT, 'output', EP, 'revisao', 'motor.json')))
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
TW, TH, PAD, LAB = 270, 480, 10, 112
COLS = 4                                                  # dois capítulos por linha (montagem + pronto)
caps = LN['capitulos']
quadros = []
for c, m in zip(caps, MOT['montagens']):
    meio = (m['primeira'] + m['ultima']) / 2 if m['ultima'] > m['primeira'] else (c['t0'] + c['t1']) / 2
    meio = min(max(meio, c['t0'] + 0.6), c['t1'] - 0.6)
    if c['n'] == 0:
        meio = 0.0                                        # o capítulo 00 é a capa: o quadro 0
    fala = ' '.join(f['texto'] for f in c['fala']) if 'fala' in c else ' '.join(f['texto'] for f in c['frases'])
    quadros.append((c, meio, 'montagem' if c['n'] else 'quadro 0 = capa', fala))
    quadros.append((c, c['t1'] - 0.2, 'pronto', fala))
rows = (len(quadros) + COLS - 1) // COLS
font = ImageFont.truetype(FONT, 17)
small = ImageFont.truetype(FONT, 14)
with tempfile.TemporaryDirectory() as tmp:
    sheet = Image.new('RGB', (COLS * (TW + PAD) + PAD + PAD, rows * (TH + LAB + PAD) + PAD), (10, 10, 10))
    dr = ImageDraw.Draw(sheet)
    for i, (c, t, tipo, fala) in enumerate(quadros):
        pth = os.path.join(tmp, f'{i}.png')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', VIDEO, '-frames:v', '1', pth], check=True)
        im = Image.open(pth).convert('RGB').resize((TW, TH), Image.LANCZOS)
        col = i % COLS
        x = PAD + col * (TW + PAD) + (PAD if col >= 2 else 0)
        y = PAD + (i // COLS) * (TH + LAB + PAD)
        sheet.paste(im, (x, y))
        rot = c['rotulo'] if c['n'] else 'CAPA'
        dr.text((x, y + TH + 6), f'{c["n"]:02d} · {rot}', font=font, fill=(175, 250, 39))
        dr.text((x, y + TH + 28), f'{tipo} · {t:.1f} s', font=small, fill=(200, 200, 194))
        if i % 2 == 0:
            for k, ln in enumerate(textwrap.wrap(fala, 64)[:3]):
                dr.text((x, y + TH + 50 + 18 * k), ln, font=small, fill=(150, 152, 146))
    sheet.save(os.path.join(ROOT, 'output', EP, 'storyboard.jpg'), quality=88)
print(f'ok -> output/{EP}/storyboard.jpg')
