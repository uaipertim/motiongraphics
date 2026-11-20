#!/usr/bin/env python3
"""
Storyboard do carrossel animado v2 (os quadros saem do próprio motor: node scripts/render.cjs stills).

    python3 scripts/storyboard.py  ->  output/revisao/storyboard.jpg  (4 quadros-chave por slide: início, meio, clímax, final)
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
# os instantes (s) de cada slide: início, meio, clímax, final (o estado final vivo, antes de a cena se dissolver)
CHAVE = {1: [0.0, 1.45, 4.6, 8.5], 2: [0.9, 3.4, 6.8, 9.0], 3: [0.8, 2.3, 4.2, 7.6], 4: [1.2, 2.8, 4.4, 7.6],
         5: [1.0, 1.9, 4.9, 7.6], 6: [1.2, 2.2, 3.1, 7.6], 7: [2.0, 4.0, 5.4, 7.6], 8: [1.2, 2.7, 3.8, 7.6]}
ROTULO = ['início', 'meio', 'clímax', 'final']
NOME = {1: ['capa', 'letreiro'], 2: ['o problema'], 3: ['datas'], 4: ['valores'], 5: ['reserva', 'confirmada'], 6: ['mesma', 'tabela'], 7: ['como vendeu'], 8: ['fecho']}
TW, TH, G, LAB = 432, 540, 14, 250
f1, f2 = ImageFont.truetype(FONT, 30), ImageFont.truetype(FONT, 22)
with tempfile.TemporaryDirectory() as tmp:
    pedidos = ','.join(f'{n}:{t}' for n, ts in CHAVE.items() for t in ts)
    subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'stills', pedidos, '--dir', tmp], check=True, capture_output=True)
    sheet = Image.new('RGB', (LAB + 4 * (TW + G) + G, 8 * (TH + G + 36) + G), (24, 24, 22))
    d = ImageDraw.Draw(sheet)
    for r, (n, ts) in enumerate(CHAVE.items()):
        y = G + r * (TH + G + 36)
        d.text((16, y + TH // 2 - 30), f'{n:02d}', font=ImageFont.truetype(FONT, 56), fill=(175, 250, 39))
        for k, linha in enumerate(NOME[n]):
            d.text((16, y + TH // 2 + 40 + 32 * k), linha, font=f1, fill=(185, 185, 177))
        for j, t in enumerate(ts):
            im = Image.open(os.path.join(tmp, f's{n:02d}-t{t:.2f}.png')).convert('RGB').resize((TW, TH), Image.LANCZOS)
            x = LAB + G + j * (TW + G)
            sheet.paste(im, (x, y))
            d.text((x, y + TH + 6), f'{ROTULO[j]} · {t:.1f} s', font=f2, fill=(175, 250, 39))
os.makedirs(os.path.join(ROOT, 'output', 'revisao'), exist_ok=True)
out = os.path.join(ROOT, 'output', 'revisao', 'storyboard.jpg')
sheet.save(out, quality=88)
print('ok', os.path.relpath(out, ROOT), sheet.size)
