#!/usr/bin/env python3
"""Storyboard: um quadro por etapa, tirado do MP4 final.   python3 scripts/storyboard.py -> output/storyboard.jpg"""
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP4 = os.path.join(ROOT, 'output', 'parte-1-chegada.mp4')
QUADROS = [(3.0, 'GANCHO'), (17.6, '1 RESERVA'), (33.6, '2 SINAL'), (47.0, '3 CHECK-IN'), (58.9, 'FINAL')]
W, H = 360, 640
font = ImageFont.truetype(os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-ExtraBold.ttf'), 26)
sheet = Image.new('RGB', (5 * W + 6 * 16, H + 76), (10, 10, 10))
d = ImageDraw.Draw(sheet)
for i, (t, nome) in enumerate(QUADROS):
    png = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', MP4, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], capture_output=True).stdout
    tmp = os.path.join(ROOT, 'output', '.sb.png')
    open(tmp, 'wb').write(png)
    im = Image.open(tmp).convert('RGB').resize((W, H), Image.LANCZOS)
    x, y = 16 + i * (W + 16), 16
    sheet.paste(im, (x, y))
    d.text((x, y + H + 12), f'{t:05.2f}s  {nome}', font=font, fill=(175, 250, 39))
    os.remove(tmp)
sheet.save(os.path.join(ROOT, 'output', 'storyboard.jpg'), quality=90)
print('ok -> output/storyboard.jpg')
