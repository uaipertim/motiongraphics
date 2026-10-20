#!/usr/bin/env python3
"""
Storyboard de um episódio: 1 quadro por cena (aos 60% da cena).

    python3 scripts/storyboard.py fala-01   ->  output/fala-01/storyboard.jpg
"""
import textwrap, json
import os
import subprocess
import sys
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else 'fala-01'
VIDEO = os.path.join(ROOT, 'output', EP, f'fazlo-hospeda-{EP}.mp4')
LN = json.load(open(os.path.join(ROOT, 'audio', EP, 'linha.json')))
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
NOMES = {'titulo': 'O GANCHO', 'notinha': 'A NOTA', 'relogio': 'O RELÓGIO', 'objetos': 'A ESPERA', 'valor': 'O VALOR', 'pergunta': 'A PERGUNTA',
         'riscada': 'A LINHA RISCADA', 'contador': 'O CONTADOR', 'virada': 'A VIRADA', 'fecho': 'O FECHO'}
COLS, TW, TH, PAD, LAB = 5, 300, 533, 12, 118
cenas = LN['cenas']
rows = (len(cenas) + COLS - 1) // COLS
with tempfile.TemporaryDirectory() as tmp:
    sheet = Image.new('RGB', (COLS * (TW + PAD) + PAD, rows * (TH + LAB + PAD) + PAD), (10, 10, 10))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(FONT, 17)
    small = ImageFont.truetype(FONT, 15)
    for i, c in enumerate(cenas):
        t = c['t0'] + 0.62 * (c['t1'] - c['t0']) if i else 0.9
        pth = os.path.join(tmp, f'{i}.png')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', VIDEO, '-frames:v', '1', pth], check=True)
        im = Image.open(pth).convert('RGB').resize((TW, TH), Image.LANCZOS)
        x, y = PAD + (i % COLS) * (TW + PAD), PAD + (i // COLS) * (TH + LAB + PAD)
        sheet.paste(im, (x, y))
        draw.text((x, y + TH + 8), f'{c["n"]} · {NOMES.get(c["tipo"], c["tipo"].upper())} · {c["t0"]:.1f}–{c["t1"]:.1f} s', font=font, fill=(175, 250, 39))
        for k, ln in enumerate(textwrap.wrap(c['fala'], 32)[:4]):
            draw.text((x, y + TH + 32 + 20 * k), ln, font=small, fill=(200, 200, 194))
    sheet.save(os.path.join(ROOT, 'output', EP, 'storyboard.jpg'), quality=90)
print(f'ok -> output/{EP}/storyboard.jpg')
