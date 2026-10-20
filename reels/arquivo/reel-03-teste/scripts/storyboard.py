#!/usr/bin/env python3
"""
Storyboard do Reel 03-teste a partir do vídeo final.

    python3 scripts/storyboard.py   ->  output/storyboard.jpg
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-03-teste.mp4')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
SHOTS = [(0.0, 'GANCHO · QUADRO 0'), (1.4, 'O SEGREDO GIRA'), (2.9, 'AS TRAVAS RECOLHEM'), (4.3, 'O COFRE ABRE'),
         (5.6, 'FLUXO · 1ª CÁPSULA'), (6.6, 'FLUXO · 3ª CÁPSULA'), (7.6, 'OS TOTAIS GIRAM'), (8.9, 'CONFERÊNCIA'),
         (9.5, 'DIFERENÇA R$ 0,00'), (9.9, 'CONFERIDO'), (10.8, 'O CAIXA BATEU.'), (11.6, 'FAZLO HOSPEDA · FADE')]
COLS, TW, TH, PAD, LAB = 6, 270, 480, 14, 40


def frame(t, path):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', VIDEO, '-frames:v', '1', path], check=True)
    return Image.open(path).convert('RGB')


with tempfile.TemporaryDirectory() as tmp:
    rows = (len(SHOTS) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * (TW + PAD) + PAD, rows * (TH + LAB + PAD) + PAD), (10, 10, 10))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(FONT, 17)
    for i, (t, label) in enumerate(SHOTS):
        im = frame(t, os.path.join(tmp, f'{i}.png')).resize((TW, TH), Image.LANCZOS)
        x, y = PAD + (i % COLS) * (TW + PAD), PAD + (i // COLS) * (TH + LAB + PAD)
        sheet.paste(im, (x, y))
        draw.text((x, y + TH + 9), f'{t:05.2f}s  {label}', font=font, fill=(175, 250, 39))
    sheet.save(os.path.join(ROOT, 'output', 'storyboard.jpg'), quality=90)
print('ok -> output/storyboard.jpg')
