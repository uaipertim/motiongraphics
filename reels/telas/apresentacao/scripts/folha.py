#!/usr/bin/env python3
"""Folha de contato: 1 quadro a cada 2 s + 1 quadro no pico de cada aproximação -> output/revisao/folha-contato.jpg"""
import json, os, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP4 = os.path.join(ROOT, 'output', 'apresentacao-hospeda.mp4')
D = json.load(open(os.path.join(ROOT, 'output', 'revisao', 'dados.json')))
ts = [(float(t), '') for t in range(0, int(D['duracao']), 2)]
ts += [(round((z['t0'] + z['t1']) / 2, 2), f"APROX. {i + 1}") for i, z in enumerate(D['zooms'])]
ts.sort()
W, H, COLS, PAD, LEG = 216, 384, 9, 10, 30
rows = (len(ts) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (W + PAD) + PAD, rows * (H + LEG + PAD) + PAD), (10, 10, 10))
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype(os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-ExtraBold.ttf'), 17)
for i, (t, rot) in enumerate(ts):
    png = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', MP4, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], capture_output=True).stdout
    tmp = os.path.join(ROOT, 'output', '.fc.png'); open(tmp, 'wb').write(png)
    im = Image.open(tmp).convert('RGB').resize((W, H), Image.LANCZOS); os.remove(tmp)
    x, y = PAD + (i % COLS) * (W + PAD), PAD + (i // COLS) * (H + LEG + PAD)
    sheet.paste(im, (x, y))
    if rot:
        d.rectangle([x - 3, y - 3, x + W + 2, y + H + 2], outline=(175, 250, 39), width=3)
    d.text((x, y + H + 6), f'{t:05.2f}s {rot}', font=font, fill=(175, 250, 39) if rot else (200, 200, 195))
out = os.path.join(ROOT, 'output', 'revisao', 'folha-contato.jpg')
sheet.save(out, quality=88)
print('ok ->', out, len(ts), 'quadros')
