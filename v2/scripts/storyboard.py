#!/usr/bin/env python3
"""
Storyboard e capa a partir do vídeo final.

    python3 scripts/storyboard.py   ->  output/storyboard.jpg, output/capa.png
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reels-v2.mp4')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
SHOTS = [(1.05, 'GANCHO'), (3.3, 'O CICLO'), (4.6, 'HUB'), (7.4, '01 RESERVA'), (10.4, '02 SINAL'),
         (13.3, '03 CHECK-IN'), (16.3, '04 COMANDA'), (18.8, '05 CHECK-OUT'), (21.6, '06 CAIXA'),
         (23.55, 'RECOMEÇO'), (24.62, 'TRANSIÇÃO'), (27.5, 'ASSINATURA')]
COLS, TW, TH, PAD, LAB = 6, 300, 533, 16, 44


def frame(t, path):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', VIDEO, '-frames:v', '1', path], check=True)
    return Image.open(path).convert('RGB')


with tempfile.TemporaryDirectory() as tmp:
    rows = (len(SHOTS) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * (TW + PAD) + PAD, rows * (TH + LAB + PAD) + PAD), (10, 10, 10))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(FONT, 20)
    for i, (t, label) in enumerate(SHOTS):
        im = frame(t, os.path.join(tmp, f'{i}.png')).resize((TW, TH), Image.LANCZOS)
        x, y = PAD + (i % COLS) * (TW + PAD), PAD + (i // COLS) * (TH + LAB + PAD)
        sheet.paste(im, (x, y))
        draw.text((x, y + TH + 10), f'{t:05.2f}s  {label}', font=font, fill=(175, 250, 39))
    sheet.save(os.path.join(ROOT, 'output', 'storyboard.jpg'), quality=90)
    frame(27.5, os.path.join(ROOT, 'output', 'capa.png'))
print('ok -> output/storyboard.jpg, output/capa.png')
