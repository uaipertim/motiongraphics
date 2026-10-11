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
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-08.mp4')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
SHOTS = [(0.3, 'O TÍTULO'), (0.95, 'O CELULAR VIBRA'), (1.85, 'O TÍTULO SOBE'), (2.4, '23:00'),
         (3.3, '23:02 · CARLA'), (4.5, '23:09 · RODRIGO'), (5.7, '23:15 · NÚM. NOVO'), (6.9, '23:22 · JULIANA'),
         (8.1, '23:31 · RODRIGO'), (9.3, '23:44 · ÁUDIO'), (10.5, '23:58 · OI??'), (11.05, '+37 NÃO LIDAS'),
         (12.2, '23:59'), (12.8, 'SAEM DE CENA'), (14.2, 'MANDA PRA QUEM'), (15.85, 'FADE')]
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
