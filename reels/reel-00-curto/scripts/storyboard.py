#!/usr/bin/env python3
"""
Storyboard do Reel 00 · corte curto a partir do vídeo final.

    python3 scripts/storyboard.py   ->  output/storyboard.jpg
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-00-curto.mp4')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
SHOTS = [(0.0, 'GANCHO · QUADRO 0'), (0.8, 'A SINETA TOCA'), (2.4, 'A CASA DE PALAVRAS'), (3.5, 'O TELHADO FECHA'),
         (4.5, 'O DROP'), (5.4, 'A LOGO'), (6.4, 'RESERVAS'), (7.9, 'COMANDAS'),
         (9.9, 'CAIXA'), (10.5, 'CAIXA FECHADO'), (11.9, 'SOB O MESMO TETO'), (13.6, 'FECHO · LOGO')]
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
