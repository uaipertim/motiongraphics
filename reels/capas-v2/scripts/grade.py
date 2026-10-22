#!/usr/bin/env python3
"""
Prévia da grade do perfil com as capas v2: 3 colunas, o recorte 3:4 central de cada capa (y 240–1680), na ordem do
capas.json (do primeiro ao último item, como devem aparecer de cima para baixo e da esquerda para a direita).

    python3 scripts/grade.py   ->  previa-grade-perfil.jpg
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ids = [c['id'] for c in json.load(open(os.path.join(ROOT, 'capas.json')))['capas']]
TW, TH, G = 360, 480, 6
rows = (len(ids) + 2) // 3
im = Image.new('RGB', (3 * TW + 4 * G, rows * TH + (rows + 1) * G), (255, 255, 255))
dr = ImageDraw.Draw(im)
for i, cid in enumerate(ids):
    c = Image.open(os.path.join(ROOT, cid, 'output', 'capa.png')).convert('RGB').crop((0, 240, 1080, 1680)).resize((TW, TH), Image.LANCZOS)
    x, y = G + (i % 3) * (TW + G), G + (i // 3) * (TH + G)
    im.paste(c, (x, y))
    dr.polygon([(x + TW - 30, y + 14), (x + TW - 30, y + 36), (x + TW - 12, y + 25)], fill=(255, 255, 255))   # o ícone de play
im.save(os.path.join(ROOT, 'previa-grade-perfil.jpg'), quality=90)
print('ok -> previa-grade-perfil.jpg', len(ids), 'capas')
