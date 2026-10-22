#!/usr/bin/env python3
"""
Prévia da grade do perfil: as capas v4 (3 colunas, recorte 3:4, na ordem do capas.json) e, ao lado, 2 capas v3 para
comparar (as mesmas 01 e 08), com a % de limão e de halo medida (quadro inteiro) de cada v4.

    python3 scripts/grade.py   ->  previa-grade.jpg
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V3 = os.path.join(ROOT, '..', 'capas-v3')
ids = [c['id'] for c in json.load(open(os.path.join(ROOT, 'capas.json')))['capas']]
comp = ['01-ele-pagou-metade', '08-comanda-da-piscina']
TW, TH, G, LAB = 300, 400, 6, 30
font = ImageFont.truetype(os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf'), 15)
fontT = ImageFont.truetype(os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-ExtraBold.ttf'), 22)
rows = (len(ids) + 2) // 3
Wd = 3 * TW + 4 * G + 60 + TW + 2 * G
im = Image.new('RGB', (Wd, 60 + rows * (TH + LAB + G) + G), (245, 245, 245))
dr = ImageDraw.Draw(im)
dr.text((G, 18), 'CAPAS V4 (14) · 3:4 na grade', font=fontT, fill=(20, 20, 20))
dr.text((3 * TW + 4 * G + 60, 18), 'V3 · para comparar', font=fontT, fill=(120, 120, 120))


def cola(pth, x, y):
    c = Image.open(pth).convert('RGB').crop((0, 240, 1080, 1680)).resize((TW, TH), Image.LANCZOS)
    im.paste(c, (x, y))
    dr.polygon([(x + TW - 26, y + 12), (x + TW - 26, y + 32), (x + TW - 10, y + 22)], fill=(255, 255, 255))


for i, cid in enumerate(ids):
    x, y = G + (i % 3) * (TW + G), 60 + (i // 3) * (TH + LAB + G)
    cola(os.path.join(ROOT, cid, 'output', 'capa.png'), x, y)
    m = json.load(open(os.path.join(ROOT, cid, 'output', 'revisao', 'medidas.json')))
    dr.text((x, y + TH + 6), f'{cid[:2]} lim {m["limao"]:.1f}% halo {m["halo"]:.1f}% {m["corpo_titulo"]}px', font=font, fill=(40, 40, 40))
for k, cid in enumerate(comp):
    x, y = 3 * TW + 4 * G + 60, 60 + k * (TH + LAB + G)
    cola(os.path.join(V3, cid, 'output', 'capa.png'), x, y)
    dr.text((x, y + TH + 6), f'v3 · {cid[:2]}', font=font, fill=(120, 120, 120))
im.save(os.path.join(ROOT, 'previa-grade.jpg'), quality=90)
print('ok -> previa-grade.jpg')
