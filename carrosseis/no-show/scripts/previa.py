#!/usr/bin/env python3
"""
Prévia do carrossel animado "O hóspede não apareceu" (roda depois de `node scripts/render.cjs`).

    python3 scripts/previa.py  ->  output/previa.jpg                 (folha de contato: 0 s, 2 s, 4,5 s e o estado final de cada slide)
                                   output/revisao/capa-na-grade.jpg   (o quadro 0 da capa no recorte 3:4 da grade)

Os quadros saem dos próprios MP4 (pelo número do quadro). A conferência fica em scripts/conferencia.py.
"""
import json
import os
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output')
REV = os.path.join(OUT, 'revisao')
os.makedirs(REV, exist_ok=True)
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
W, H, FPS = 1080, 1350, 30


def quadros(mp4, ns):
    alvo = sorted(set(ns))
    with tempfile.TemporaryDirectory() as tmp:
        expr = '+'.join(f'eq(n\\,{k})' for k in alvo)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', f'select={expr}', '-vsync', '0', os.path.join(tmp, 'q%04d.png')], check=True)
        fs = sorted(os.listdir(tmp))
        por = {k: Image.open(os.path.join(tmp, f)).convert('RGB') for k, f in zip(alvo, fs)}
        for im in por.values():
            im.load()
    return [por[k] for k in ns]


pose = json.loads(subprocess.run(['node', '-e', '''
const s = require("fs").readFileSync(process.argv[1], "utf8"); const m = s.match(/const POSE = (\\{[^}]*\\})/);
console.log(JSON.stringify(eval("(" + m[1] + ")")));''', os.path.join(ROOT, 'src', 'slides.js')], check=True, capture_output=True, text=True).stdout)
f1, f2 = ImageFont.truetype(FONT, 26), ImageFont.truetype(FONT, 40)
TW, TH, G, TOP, LAB = 324, 405, 10, 44, 70
sheet = Image.new('RGB', (LAB + 4 * (TW + G) + G, 8 * (TH + G) + G + TOP), (28, 28, 28))
d = ImageDraw.Draw(sheet)
for j, s in enumerate(['0 s', '2 s', '4,5 s', 'estado final']):
    d.text((LAB + G + j * (TW + G), 12), s, font=f1, fill=(175, 250, 39))
for n in range(1, 9):
    ts = [0.0, 2.0, 4.5, pose[str(n)]]
    qs = quadros(os.path.join(OUT, f'{n:02d}.mp4'), [int(round(t * FPS)) for t in ts])
    y = TOP + G + (n - 1) * (TH + G)
    d.text((14, y + TH // 2 - 24), f'{n:02d}', font=f2, fill=(175, 250, 39))
    for j, q in enumerate(qs):
        sheet.paste(q.resize((TW, TH), Image.LANCZOS), (LAB + G + j * (TW + G), y))
sheet.save(os.path.join(OUT, 'previa.jpg'), quality=88)

# a capa na grade (recorte 3:4, quadro 0), ao lado das capas vizinhas: o "Tarifa de dezembro" (animado) e o "Consumo"
crop_x = int((W - H * 3 / 4) / 2)
tiles = [quadros(os.path.join(OUT, '01.mp4'), [0])[0].crop((crop_x, 0, W - crop_x, H))]
for ref in [os.path.join(ROOT, '..', 'tarifa-alta-temporada', 'output', 'png', '01.png'), os.path.join(ROOT, '..', 'consumo', 'output', '01.png')]:
    if os.path.exists(ref):
        tiles.append(Image.open(ref).convert('RGB').crop((crop_x, 0, W - crop_x, H)))
grid = Image.new('RGB', (len(tiles) * 360, 475), (255, 255, 255))
for i, t in enumerate(tiles):
    grid.paste(t.resize((356, 475), Image.LANCZOS), (i * 360, 0))
grid.save(os.path.join(REV, 'capa-na-grade.jpg'), quality=90)
print('ok output/previa.jpg + output/revisao/capa-na-grade.jpg')
