#!/usr/bin/env python3
"""
Recortes grandes (1:1) dos trechos com mais elementos, para olhar antes do commit: os slides 02 e 05.

    python3 scripts/recortes.py   ->  output/revisao/02-recorte.jpg · output/revisao/05-recorte.jpg

Os quadros saem do próprio motor (node scripts/render.cjs stills), nos instantes das entradas com mola e no estado final.
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV = os.path.join(ROOT, 'output', 'revisao')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
CORTES = {
    2: ((60, 380, 1020, 1200), [(2.85, 'a notificação âmbar entrando (mola)'), (3.6, 'a noite: 22h · sem notícia'), (5.2, 'o sinal cai na balança (mola)'),
                                (6.15, 'as noites 27/12 e 28/12 entrando'), (6.9, 'os cadeados fecham'), (9.0, 'estado final')]),
    5: ((60, 380, 1020, 1130), [(0.8, 'a mensagem das 22h10 entrando'), (2.45, '"Pneu furado, chego 23h" entrando'), (3.45, 'o chalé continua aceso'),
                                (4.45, '"não respondeu até 8h"'), (5.25, 'o carimbo NO-SHOW batendo'), (7.6, 'estado final')]),
}
f = ImageFont.truetype(FONT, 26)
os.makedirs(REV, exist_ok=True)
for n, ((X0, Y0, X1, Y1), TS) in CORTES.items():
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'stills', ','.join(f'{n}:{t}' for t, _ in TS), '--dir', tmp], check=True, capture_output=True)
        qs = [Image.open(os.path.join(tmp, f's{n:02d}-t{t:.2f}.png')).convert('RGB') for t, _ in TS]
    CW, CH, LAB, G = X1 - X0, Y1 - Y0, 44, 16
    folha = Image.new('RGB', (2 * CW + 3 * G, 3 * (CH + LAB + G) + G), (28, 28, 28))
    d = ImageDraw.Draw(folha)
    for i, (q, (t, rot)) in enumerate(zip(qs, TS)):
        x, y = G + (i % 2) * (CW + G), G + (i // 2) * (CH + LAB + G)
        d.text((x, y + 6), f'{t:.2f} s · {rot}', font=f, fill=(175, 250, 39))
        folha.paste(q.crop((X0, Y0, X1, Y1)), (x, y + LAB))
    folha.save(os.path.join(REV, f'{n:02d}-recorte.jpg'), quality=90)
    print(f'ok output/revisao/{n:02d}-recorte.jpg')
