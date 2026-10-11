#!/usr/bin/env python3
"""
Revisão de capa de Reel — a regra fixa da série (reels/README.md, "Capas").

    python3 reels/tools/revisao_capa.py reels/reel-NN [--vizinhos reels/reel-07 reels/reel-06]

Lê <reel>/output/capa.png (1080x1920) e, se existir, <reel>/output/revisao/capa-caixas.json
(caixas de cada elemento, exportadas pela página da capa). Gera:

    <reel>/output/capa.jpg                      qualidade 95, cor 4:4:4
    <reel>/output/revisao/capa-no-feed.jpg      capa com o recorte 3:4, a folga de 60 px e o canto do
                                                ícone de play marcados + o recorte 3:4 + a capa na grade
    <reel>/output/revisao/capa.txt              o resultado de cada regra

Regras (conferidas pelos pixels: tudo o que se destaca do fundo — a cor dominante do recorte, escura ou clara —
mais de 110 em distância de cor; gravações e brilhos sutis do fundo e partículas de poeira — manchas de menos
de 20 px — não contam):
  a) recorte 3:4 — título, visual e logo dentro da faixa central 1080x1440 (y 240–1680) com folga de
     60 px: x 60–1020, y 300–1620;
  b) canto do ícone de play livre — nada em x ≥ 860, y 240–440;
  c) faixa do contador de visualizações livre — nada importante em y 1560–1680 (o contador cobre o canto
     inferior esquerdo da miniatura);
  d) nada cortado nem escondido — nada encosta nas bordas do recorte e as caixas dos elementos não se sobrepõem.

Com --cena (capa com cena de fundo de ponta a ponta, como a paisagem do Reel 05), a, c e d valem pelas
caixas de cada elemento (capa-caixas.json); os pixels da cena não contam. Caixas marcadas "cena": true
(sol, morros, estrada…) são fundo: entram só na conferência do recorte e do canto do play.
"""
import argparse
import json
import os
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont

BAND = (0, 240, 1080, 1680)
SAFE = (60, 300, 1020, 1620)
PLAY = (860, 240, 1080, 440)
FOOT = (0, 1560, 1080, 1680)               # faixa do contador de visualizações
SPECK = 20                                 # manchas menores que isso (a poeira de luz das cenas) não contam
DIST = 110                                 # distância de cor ao fundo acima da qual o pixel é conteúdo (texto, visual, logo);
                                           # brilhos, gravações e texturas sutis do fundo ficam abaixo (vale p/ fundo escuro ou claro)

ap = argparse.ArgumentParser()
ap.add_argument('reel')
ap.add_argument('--vizinhos', nargs='*', default=[])
ap.add_argument('--cena', action='store_true', help='cena de fundo de ponta a ponta: a, c e d pelas caixas')
a = ap.parse_args()
REEL = os.path.abspath(a.reel)
OUT = os.path.join(REEL, 'output')
REV = os.path.join(OUT, 'revisao')
os.makedirs(REV, exist_ok=True)
FONT = next((os.path.join(REEL, 'src', 'fonts', f) for f in ('JetBrainsMonoNL-Bold.ttf',) if os.path.exists(os.path.join(REEL, 'src', 'fonts', f))), None)
font = ImageFont.truetype(FONT, 24) if FONT else ImageFont.load_default()

cover = Image.open(os.path.join(OUT, 'capa.png')).convert('RGB')
assert cover.size == (1080, 1920), cover.size
cover.save(os.path.join(OUT, 'capa.jpg'), quality=95, subsampling=0, optimize=True)

lines, ok_all = [], True
rgb = np.asarray(cover).astype(float)
bg = np.median(rgb[BAND[1]:BAND[3]].reshape(-1, 3), axis=0)          # a cor de fundo dominante do recorte
lum = np.sqrt(((rgb - bg) ** 2).sum(axis=2))                          # distância de cor ao fundo
LUM = DIST
mask = lum > LUM
lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
if n:
    size = ndimage.sum(mask, lab, np.arange(1, n + 1))
    mask &= np.concatenate([[False], size >= SPECK])[lab]
cx = os.path.join(REV, 'capa-caixas.json')
boxes = {k: b for k, b in json.load(open(cx)).items() if isinstance(b, dict) and 'y0' in b} if os.path.exists(cx) else {}
zone = mask[PLAY[1]:PLAY[3], PLAY[0]:PLAY[2]]
foot = mask[FOOT[1]:FOOT[3], :]
if not a.cena:
    ys, xs = np.nonzero(mask)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
    ra = x0 >= SAFE[0] and y0 >= SAFE[1] and x1 <= SAFE[2] and y1 <= SAFE[3]
    lines.append(f"{'OK   ' if ra else 'FALHA'}  a) recorte 3:4 + folga 60 px: conteúdo em x {x0}–{x1}, y {y0}–{y1}")
    lines.append('       (limite: x 60–1020, y 300–1620)')
    rb = int(zone.sum()) == 0
    lines.append(f"{'OK   ' if rb else 'FALHA'}  b) canto do play (x ≥ 860, y 240–440): {int(zone.sum())} px de conteúdo")
    rc = int(foot.sum()) == 0
    lines.append(f"{'OK   ' if rc else 'FALHA'}  c) faixa do contador (y 1560–1680): {int(foot.sum())} px de conteúdo")
    edge = np.concatenate([mask[BAND[1], :], mask[BAND[3] - 1, :], mask[BAND[1]:BAND[3], 0], mask[BAND[1]:BAND[3], 1079]])
    rd = ra and int(edge.sum()) == 0
    ok_all = ra and rb and rc and rd
else:
    rd = True
    lines.append('       cena de fundo de ponta a ponta: a, c e d conferidos pelas caixas dos elementos')
    lines.append(f"       (pixels da cena no canto do play: {int(zone.sum())}; na faixa do contador: {int(foot.sum())})")
names = list(boxes)
for name in names:
    b = boxes[name]
    bx0, bx1 = b.get('x0', 60), b.get('x1', 1020)
    inside = b['y0'] >= SAFE[1] and b['y1'] <= SAFE[3] and bx0 >= SAFE[0] and bx1 <= SAFE[2]
    play = bx1 > PLAY[0] and b['y0'] < PLAY[3] and b['y1'] > PLAY[1]
    if b.get('cena'):
        ok = (inside or a.cena) and not play
        lines.append(f"{'OK   ' if ok else 'FALHA'}  {name} (cena): x {bx0:.0f}–{bx1:.0f}, y {b['y0']:.0f}–{b['y1']:.0f}")
    else:
        inf = b['y1'] > FOOT[1] and b['y0'] < FOOT[3]
        over = [o for o in names if o != name and not boxes[o].get('cena') and
                min(bx1, boxes[o].get('x1', 1020)) > max(bx0, boxes[o].get('x0', 60)) and min(b['y1'], boxes[o]['y1']) > max(b['y0'], boxes[o]['y0'])]
        ok = inside and not play and not inf and not over
        why = ('' if inside else ' · fora do recorte') + (' · no canto do play' if play else '') + (' · na faixa do contador' if inf else '') + (' · sobre ' + ', '.join(over) if over else '')
        lines.append(f"{'OK   ' if ok else 'FALHA'}  {name}: x {bx0:.0f}–{bx1:.0f}, y {b['y0']:.0f}–{b['y1']:.0f}{why}")
    ok_all &= ok
if boxes:
    lines.insert(len(lines) - len(names), f"{'OK   ' if all(not l.startswith('FALHA') for l in lines[-len(names):]) else 'FALHA'}  {'a, c, d' if a.cena else 'd'}) caixas: dentro do recorte, fora do canto do play e da faixa do contador, sem sobreposição")
lines.append('RESULTADO: ' + ('dentro da regra das capas' if ok_all else 'ajustar'))

# ---------------------------------------------------------------- prévia
full = cover.copy().convert('RGBA')
ov = Image.new('RGBA', full.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
d.rectangle((0, 0, 1080, BAND[1]), fill=(0, 0, 0, 150)); d.rectangle((0, BAND[3], 1080, 1920), fill=(0, 0, 0, 150))
d.rectangle((PLAY[0], PLAY[1], PLAY[2] - 1, PLAY[3]), fill=(255, 40, 80, 90), outline=(255, 40, 80, 255), width=4)
d.rectangle((FOOT[0], FOOT[1], FOOT[2] - 1, FOOT[3] - 1), fill=(255, 150, 40, 70), outline=(255, 150, 40, 255), width=4)
d.rectangle((BAND[0], BAND[1], BAND[2] - 1, BAND[3] - 1), outline=(175, 250, 39, 255), width=6)
d.rectangle((BAND[0] + 6, BAND[1] + 6, BAND[2] - 7, BAND[3] - 7), outline=(10, 10, 10, 255), width=3)   # contorno escuro: aparece também em capa limão
for y in range(SAFE[1], SAFE[3], 24):
    d.line((SAFE[0], y, SAFE[0], y + 12), fill=(255, 255, 255, 150), width=2); d.line((SAFE[2], y, SAFE[2], y + 12), fill=(255, 255, 255, 150), width=2)
for x in range(SAFE[0], SAFE[2], 24):
    d.line((x, SAFE[1], x + 12, SAFE[1]), fill=(255, 255, 255, 150), width=2); d.line((x, SAFE[3], x + 12, SAFE[3]), fill=(255, 255, 255, 150), width=2)
# o ícone de play como o Instagram mostra (triângulo branco no canto da miniatura)
d.polygon([(985, 275), (985, 335), (1035, 305)], fill=(255, 255, 255, 230))
full = Image.alpha_composite(full, ov).convert('RGB').resize((540, 960), Image.LANCZOS)
crop = cover.crop(BAND)
cd = ImageDraw.Draw(crop)
cd.polygon([(985, 35), (985, 95), (1035, 65)], fill=(255, 255, 255))
crop = crop.resize((540, 720), Image.LANCZOS)
TW, TH = 356, 475
tiles = [cover] + [Image.open(os.path.join(os.path.abspath(v), 'output', 'capa.png')).convert('RGB') for v in a.vizinhos
                   if os.path.exists(os.path.join(os.path.abspath(v), 'output', 'capa.png'))]
grid = Image.new('RGB', (3 * TW + 8, TH), (255, 255, 255))
for i, im in enumerate(tiles[:3]):
    t = im.crop(BAND).resize((TW, TH), Image.LANCZOS)
    td = ImageDraw.Draw(t); td.polygon([(TW - 34, 12), (TW - 34, 34), (TW - 16, 23)], fill=(255, 255, 255))
    grid.paste(t, (i * (TW + 4), 0))
gx = 40 + 540 + 40 + 540 + 40
sheet = Image.new('RGB', (gx + grid.width + 60, 1140), (24, 24, 24))
dr = ImageDraw.Draw(sheet)
dr.text((40, 18), 'CAPA 9:16', font=font, fill=(175, 250, 39)); dr.text((40, 48), '3:4 · play · contador', font=font, fill=(200, 200, 194))
sheet.paste(full, (40, 80))
dr.text((620, 18), 'RECORTE 3:4', font=font, fill=(175, 250, 39)); dr.text((620, 48), 'o que a grade mostra (com o play)', font=font, fill=(200, 200, 194))
sheet.paste(crop, (620, 80))
dr.text((gx, 18), 'NA GRADE DO PERFIL (miniatura)', font=font, fill=(175, 250, 39))
if len(tiles) > 1:
    dr.text((gx, 48), 'ao lado: ' + ', '.join(os.path.basename(os.path.abspath(v)) for v in a.vizinhos), font=font, fill=(200, 200, 194))
sheet.paste(grid, (gx, 80))
for k, ln in enumerate(lines):
    dr.text((gx, 80 + TH + 40 + k * 36), ln, font=font, fill=(255, 80, 90) if ln.startswith('FALHA') else (220, 220, 214))
sheet.save(os.path.join(REV, 'capa-no-feed.jpg'), quality=92)
open(os.path.join(REV, 'capa.txt'), 'w').write('Capa — regra fixa da série (recorte 3:4, canto do play, faixa do contador, nada cortado ou escondido)\n\n' + '\n'.join(lines) + '\n')
print('\n'.join(lines))
