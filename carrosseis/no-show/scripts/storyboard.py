#!/usr/bin/env python3
"""
Storyboard do carrossel animado "O hóspede não apareceu" (os quadros saem do próprio motor: node scripts/render.cjs stills).

    python3 scripts/storyboard.py  ->  output/revisao/storyboard.jpg  (4 quadros-chave por slide: início, meio, clímax, final)
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
# os instantes (s) de cada slide: início, meio, clímax, final (o estado final vivo, antes de a cena se dissolver)
CHAVE = {1: [0.0, 2.0, 4.6, 8.2], 2: [1.2, 3.4, 6.2, 9.0], 3: [1.6, 3.2, 4.3, 7.6], 4: [1.2, 3.3, 5.0, 7.6],
         5: [0.9, 2.8, 5.3, 7.6], 6: [1.2, 2.4, 3.5, 7.6], 7: [1.2, 2.6, 3.8, 7.6], 8: [1.2, 2.7, 3.8, 7.6]}
ROTULO = ['início', 'meio', 'clímax', 'final']
NOME = {1: ['capa', 'porta e', 'relógio'], 2: ['o problema'], 3: ['regra na', 'confirmação'], 4: ['horário de', 'chegada'], 5: ['mande', 'mensagem'], 6: ['o sinal'], 7: ['libere', 'as noites'], 8: ['fecho']}
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
