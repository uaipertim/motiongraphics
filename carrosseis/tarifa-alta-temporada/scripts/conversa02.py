#!/usr/bin/env python3
"""
Recorte grande da conversa do slide 02 (roda depois de `node scripts/render.cjs 2`).

    python3 scripts/conversa02.py  ->  output/revisao/02-conversa.jpg

Quadros tirados do próprio 02.mp4: a entrada do balão âmbar (com a mola e o tremor), a entrada do "visualizado"
e o estado final. Recorte em tamanho real (1:1), da etiqueta "SUBIU EM CIMA DA HORA" até o divisor "NÃO SUBIU".
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output')
REV = os.path.join(OUT, 'revisao')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
FPS = 30


def quadros(mp4, ns):
    alvo = sorted(set(ns))
    with tempfile.TemporaryDirectory() as tmp:
        expr = '+'.join(f'eq(n\\,{k})' for k in alvo)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', f'select={expr}', '-vsync', '0', os.path.join(tmp, 'q%04d.png')], check=True)
        por = {k: Image.open(os.path.join(tmp, f)).convert('RGB') for k, f in zip(alvo, sorted(os.listdir(tmp)))}
        for im in por.values():
            im.load()
    return [por[k] for k in ns]

TS = [(2.95, 'balão âmbar entrando'), (3.10, 'balão âmbar: excesso da mola'), (3.30, 'balão âmbar: tremor'),
      (3.50, '"visualizado" entrando'), (3.65, '"visualizado": excesso da mola'), (8.80, 'estado final')]
X0, X1, Y0, Y1 = 60, 1020, 360, 920
qs = quadros(os.path.join(OUT, '02.mp4'), [int(round(t * FPS)) for t, _ in TS])
f = ImageFont.truetype(FONT, 26)
CW, CH, LAB, G = X1 - X0, Y1 - Y0, 44, 16
folha = Image.new('RGB', (2 * CW + 3 * G, 3 * (CH + LAB + G) + G), (28, 28, 28))
d = ImageDraw.Draw(folha)
for i, (q, (t, rot)) in enumerate(zip(qs, TS)):
    x, y = G + (i % 2) * (CW + G), G + (i // 2) * (CH + LAB + G)
    d.text((x, y + 6), f'{t:.2f} s · {rot}', font=f, fill=(175, 250, 39))
    folha.paste(q.crop((X0, Y0, X1, Y1)), (x, y + LAB))
folha.save(os.path.join(REV, '02-conversa.jpg'), quality=92)
print('ok output/revisao/02-conversa.jpg')
