#!/usr/bin/env python3
"""
Prévia de uma linha da grade do perfil: as capas lado a lado, como o Instagram mostra.

    python3 reels/tools/previa_linha.py reels/reel-06 reels/reel-05 reels/reel-02 --saida reels/grade/linha-2.jpg

Lê <reel>/output/capa.png de cada Reel (na ordem da grade, da esquerda para a direita) e o resultado da
revisão em <reel>/output/revisao/capa.txt (gerado por revisao_capa.py). Mostra:
  - em cima, cada capa 9:16 com o recorte 3:4 (verde), o canto do ícone de play (vermelho), a faixa do
    contador de visualizações (laranja) e a folga de 60 px (tracejado);
  - embaixo, a linha da grade como o perfil mostra: o recorte 3:4 de cada capa, com o ícone de play e um
    contador de visualizações de exemplo no canto inferior esquerdo.
"""
import argparse
import os
from PIL import Image, ImageDraw, ImageFont

BAND = (0, 240, 1080, 1680)
SAFE = (60, 300, 1020, 1620)
PLAY = (860, 240, 1080, 440)
FOOT = (0, 1560, 1080, 1680)
LIME, GRAY, RED, ORANGE = (175, 250, 39), (200, 200, 194), (255, 40, 80), (255, 150, 40)

ap = argparse.ArgumentParser()
ap.add_argument('reels', nargs='+')
ap.add_argument('--saida', required=True)
ap.add_argument('--titulo', default='LINHA DA GRADE')
a = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, '..', 'reel-07', 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
font = ImageFont.truetype(FONT, 24) if os.path.exists(FONT) else ImageFont.load_default()
small = ImageFont.truetype(FONT, 20) if os.path.exists(FONT) else font


def marked(cover):
    """a capa 9:16 com as áreas da regra marcadas"""
    im = cover.convert('RGBA')
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rectangle((0, 0, 1080, BAND[1]), fill=(0, 0, 0, 150)); d.rectangle((0, BAND[3], 1080, 1920), fill=(0, 0, 0, 150))
    d.rectangle((PLAY[0], PLAY[1], PLAY[2] - 1, PLAY[3]), fill=RED + (90,), outline=RED + (255,), width=5)
    d.rectangle((FOOT[0], FOOT[1], FOOT[2] - 1, FOOT[3] - 1), fill=ORANGE + (70,), outline=ORANGE + (255,), width=5)
    d.rectangle((BAND[0], BAND[1], BAND[2] - 1, BAND[3] - 1), outline=LIME + (255,), width=7)
    d.rectangle((BAND[0] + 7, BAND[1] + 7, BAND[2] - 8, BAND[3] - 8), outline=(10, 10, 10, 255), width=3)
    for y in range(SAFE[1], SAFE[3], 24):
        d.line((SAFE[0], y, SAFE[0], y + 12), fill=(255, 255, 255, 150), width=3); d.line((SAFE[2], y, SAFE[2], y + 12), fill=(255, 255, 255, 150), width=3)
    for x in range(SAFE[0], SAFE[2], 24):
        d.line((x, SAFE[1], x + 12, SAFE[1]), fill=(255, 255, 255, 150), width=3); d.line((x, SAFE[3], x + 12, SAFE[3]), fill=(255, 255, 255, 150), width=3)
    d.polygon([(985, 275), (985, 335), (1035, 305)], fill=(255, 255, 255, 235))
    return Image.alpha_composite(im, ov).convert('RGB')


def tile(cover, w, h, views):
    """o recorte 3:4 como a grade mostra: ícone de play no alto à direita, contador embaixo à esquerda"""
    t = cover.crop(BAND).resize((w, h), Image.LANCZOS).convert('RGBA')
    ov = Image.new('RGBA', t.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    k = w / 1080
    # sombra suave atrás do contador (como o Instagram)
    sh = int(150 * k)
    for i in range(sh):
        d.line((0, h - sh + i, w, h - sh + i), fill=(0, 0, 0, int(120 * i / sh)))
    tri = lambda x, y, s: [(x, y), (x, y + s), (x + s * 0.87, y + s / 2)]
    d.polygon(tri(w - 62 * k - 8, 28 * k + 8, 52 * k), fill=(255, 255, 255, 240))
    d.polygon(tri(28 * k, h - 68 * k, 40 * k), outline=(255, 255, 255, 255), width=2)
    d.text((28 * k + 50 * k, h - 74 * k), views, font=ImageFont.truetype(FONT, max(12, int(44 * k))) if os.path.exists(FONT) else font, fill=(255, 255, 255, 255))
    return Image.alpha_composite(t, ov).convert('RGB')


covers, names, results = [], [], []
for r in a.reels:
    R = os.path.abspath(r)
    covers.append(Image.open(os.path.join(R, 'output', 'capa.png')).convert('RGB'))
    names.append(os.path.basename(R).replace('reel-', 'REEL '))
    txt = os.path.join(R, 'output', 'revisao', 'capa.txt')
    res = [ln for ln in open(txt).read().splitlines() if ln.startswith('RESULTADO')] if os.path.exists(txt) else []
    results.append(res[0].replace('RESULTADO: ', '') if res else 'sem revisão')

n = len(covers)
CW, CH = 400, 711                 # capa 9:16 marcada
TW, TH, GAP = 400, 533, 4         # recorte 3:4 na grade
M = 40
width = M * 2 + n * CW + (n - 1) * 24
height = 84 + CH + 80 + 60 + TH + 40
sheet = Image.new('RGB', (width, height), (24, 24, 24))
dr = ImageDraw.Draw(sheet)
dr.text((M, 18), a.titulo, font=font, fill=LIME)
dr.text((M, 48), '3:4 verde · canto do play vermelho · faixa do contador laranja · folga 60 px tracejada', font=small, fill=GRAY)
for i, (cv, nm, res) in enumerate(zip(covers, names, results)):
    x = M + i * (CW + 24)
    sheet.paste(marked(cv).resize((CW, CH), Image.LANCZOS), (x, 84))
    dr.text((x, 84 + CH + 12), nm, font=font, fill=LIME)
    dr.text((x, 84 + CH + 40), res, font=small, fill=GRAY if res.startswith('dentro') else RED)
gy = 84 + CH + 130
dr.text((M, gy - 34), 'NA GRADE DO PERFIL (recorte 3:4, ícone de play e contador de visualizações de exemplo)', font=small, fill=LIME)
row_w = n * TW + (n - 1) * GAP
gx = (width - row_w) // 2
dr.rectangle((gx - 12, gy - 6, gx + row_w + 12, gy + TH + 6), fill=(255, 255, 255))
VIEWS = ['1.284', '2.317', '986', '3.402', '1.745']
for i, cv in enumerate(covers):
    sheet.paste(tile(cv, TW, TH, VIEWS[i % len(VIEWS)]), (gx + i * (TW + GAP), gy))
os.makedirs(os.path.dirname(os.path.abspath(a.saida)), exist_ok=True)
sheet.save(a.saida, quality=92)
print('prévia', a.saida, '·', ' | '.join(f'{nm}: {res}' for nm, res in zip(names, results)))
