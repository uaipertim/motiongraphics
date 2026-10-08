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
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-00.mp4')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
SHOTS = [(0.32, 'GANCHO · SINETA'), (1.72, 'PELO "O"'), (3.55, 'CASA DE PALAVRAS'), (5.3, 'SOB O MESMO TETO'),
         (6.95, 'RESPIRO'), (7.95, 'DROP · LOGO'), (10.6, '01 RESERVAS'), (12.6, '02 CHECK-IN/OUT'),
         (14.5, '03 HOSPEDAGENS'), (16.4, '04 COMANDAS'), (18.4, '05 PAGAMENTOS'), (20.3, '06 CAIXA'),
         (22.0, 'A CASA INTEIRA'), (22.85, 'ENCAIXE NA LOGO'), (24.15, 'PILARES'), (27.2, 'ASSINATURA')]
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
