#!/usr/bin/env python3
"""
Storyboard a partir do vídeo final.

    python3 scripts/storyboard.py   ->  output/storyboard.jpg
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-02.mp4')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
SHOTS = [(1.2, 'GANCHO · TEM VAGA?'), (3.25, 'ENXURRADA'), (3.62, 'ESTILHAÇO'), (5.7, 'NO SEU LUGAR'),
         (7.15, 'DROP · 3D'), (8.2, 'TABULEIRO'), (9.25, 'VARREDURA'), (11.2, 'FIM DE SEMANA'),
         (12.4, 'DIA'), (13.2, 'SEMANA'), (14.7, 'MÊS'), (16.0, 'CONFIRMADAS'),
         (17.5, 'HOSPEDADOS'), (19.45, 'DESDOBRA'), (21.0, 'VOUCHER'), (26.0, 'ASSINATURA')]
COLS, TW, TH, PAD, LAB = 8, 270, 480, 14, 40


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
