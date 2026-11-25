#!/usr/bin/env python3
"""Folha do levantamento: as capturas de aprovacao/levantamento/ numa grade (a parte de cima de cada uma, 390×844 a 3x),
com a legenda. Âmbar = eu digitei um valor antes da foto; limão = como a Demo mostra.
    python3 scripts/folha_levantamento.py   -> aprovacao/folha-levantamento-demo.jpg"""
import json, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEV = os.path.join(ROOT, 'aprovacao', 'levantamento')
FONTE = os.path.join(ROOT, '..', '05-pousada-num-olhar', 'src', 'fonts', 'InterDisplay-Bold.otf')
R = json.load(open(os.path.join(LEV, 'levantamento.json')))
ORDEM = sorted(R['capturas'])
COL, W, CAP, M = 6, 300, 128, 14
H = round(W * 2532 / 1170)
f = ImageFont.truetype(FONTE, 21)
lin = (len(ORDEM) + COL - 1) // COL
folha = Image.new('RGB', (COL * (W + M) + M, lin * (H + CAP + M) + M), (10, 10, 10))
d = ImageDraw.Draw(folha)
def quebra(txt, larg):
    out, cur = [], ''
    for p in txt.split():
        t = (cur + ' ' + p).strip()
        if d.textlength(t, font=f) <= larg: cur = t
        else: out.append(cur); cur = p
    return out + [cur]
for i, n in enumerate(ORDEM):
    x, y = M + (i % COL) * (W + M), M + (i // COL) * (H + CAP + M)
    leg = R['capturas'][n]['legenda'] + (' [página inteira: só o topo]' if R['capturas'][n]['pagina_inteira'] else '')
    cor = (245, 166, 35) if 'DIGITADO' in leg else (190, 242, 50)
    for k, l in enumerate(quebra(f'{n.split("-")[0]}. ' + leg, W)[:5]):
        d.text((x, y + k * 25), l, font=f, fill=cor)
    im = Image.open(os.path.join(LEV, n + '.png')).convert('RGB').crop((0, 0, 1170, 2532))
    folha.paste(im.resize((W, H), Image.LANCZOS), (x, y + CAP))
folha.save(os.path.join(ROOT, 'aprovacao', 'folha-levantamento-demo.jpg'), quality=88)
print(folha.size)
