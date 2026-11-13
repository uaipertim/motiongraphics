#!/usr/bin/env python3
"""Folha de contato: 2 quadros por segundo -> output/revisao/folha-contato.jpg (com a cena e o fundo de cada quadro)"""
import json, os, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP4 = os.path.join(ROOT, 'output', 'comanda.mp4')
D = json.load(open(os.path.join(ROOT, 'output', 'revisao', 'dados.json')))
ts = [k * 0.5 for k in range(int(D['duracao'] * 2))]
cena = lambda t: next((c for c in D['cenas'] if c['t0'] <= t < c['t1']), D['cenas'][-1])
W, H, COLS, PAD, LEG = 150, 267, 12, 8, 26
rows = (len(ts) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (W + PAD) + PAD, rows * (H + LEG + PAD) + PAD), (24, 24, 24))
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 12)
for i, t in enumerate(ts):
    png = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t + 0.01:.2f}', '-i', MP4, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], capture_output=True).stdout
    tmp = os.path.join(ROOT, 'output', '.fc.png'); open(tmp, 'wb').write(png)
    im = Image.open(tmp).convert('RGB').resize((W, H), Image.LANCZOS); os.remove(tmp)
    x, y = PAD + (i % COLS) * (W + PAD), PAD + (i // COLS) * (H + LEG + PAD)
    sheet.paste(im, (x, y))
    c = cena(t)
    d.text((x, y + H + 5), f"{t:04.1f}s {c['id']}", font=font, fill=(175, 250, 39) if c['t0'] <= t < c['t0'] + 0.5 else (200, 200, 195))
out = os.path.join(ROOT, 'output', 'revisao', 'folha-contato.jpg')
sheet.save(out, quality=88)
print('ok ->', out, len(ts), 'quadros')
