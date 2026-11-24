#!/usr/bin/env python3
"""Folha do levantamento: as capturas de aprovacao/levantamento/ numa grade, com a legenda de cada uma.
    python3 scripts/folha_levantamento.py   -> aprovacao/folha-levantamento-demo.jpg
Legenda em limão = entra no vídeo; em âmbar = só referência (fora do vídeo ou com divergência)."""
import json, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEV = os.path.join(ROOT, 'aprovacao', 'levantamento')
FONTE = os.path.join(ROOT, '..', '04-produtos-da-comanda', 'src', 'fonts', 'InterDisplay-Bold.otf')
R = json.load(open(os.path.join(LEV, 'levantamento.json')))
ORDEM = ['inicio', 'inicio-atencao', 'inicio-saidas-chegadas', 'painel-hospedados', 'painel-recebido',
         'painel-saidas', 'painel-a-receber', 'ver-todos', 'painel-chegadas', 'fora-atividades']
AMBAR = {'painel-chegadas', 'fora-atividades'}
COL, W, CAP, M = 5, 330, 120, 16
H = round(W * 2532 / 1170)
f = ImageFont.truetype(FONTE, 22)
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
    cor = (245, 166, 35) if n in AMBAR else (190, 242, 50)
    for k, l in enumerate(quebra(f'{i + 1}. ' + R['capturas'][n]['legenda'], W)[:4]):
        d.text((x, y + k * 27), l, font=f, fill=cor)
    folha.paste(Image.open(os.path.join(LEV, n + '.png')).convert('RGB').resize((W, H), Image.LANCZOS), (x, y + CAP))
folha.save(os.path.join(ROOT, 'aprovacao', 'folha-levantamento-demo.jpg'), quality=88)
print(folha.size)
