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
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-07.mp4')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
SHOTS = [(0.3, 'O FERIADO ACABOU'), (1.2, 'O CORTE SECO'), (2.1, 'O TÍTULO SOBE'), (2.5, 'A FENDA'),
         (3.6, 'SINAL DO CHALÉ 2'), (5.5, 'PIX DO QUARTO 4'), (7.3, 'COMANDA DA PISCINA'), (9.2, 'DIÁRIA EXTRA DOMINGO'),
         (10.3, 'O CARIMBO DESCE'), (10.45, 'TOTAL ???'), (11.3, 'A CONTA'), (11.7, 'ARRANCADA'),
         (12.3, 'MANDA PRA QUEM'), (12.8, 'A LOGO'), (13.4, 'FECHA A CONTA AÍ'), (13.85, 'FADE')]
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
