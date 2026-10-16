#!/usr/bin/env python3
"""
Prévia e revisão do Carrossel 02 (roda depois de `node scripts/render.cjs`).

    python3 scripts/previa.py  ->  output/previa.jpg               (os 8 slides lado a lado, na ordem do post)
                                   output/revisao/margens.jpg       (margem de 80 px e recorte 3:4 da grade)
                                   output/revisao/capa-na-grade.jpg (a capa na grade do perfil, em miniatura)
                                   output/revisao/margens.txt

A capa (output/01.png) é limão com texto preto — regra dos carrosséis do pilar DICA (../README.md).
Confere, pelos pixels, que nada além do fundo passa da margem de 80 px nas laterais: nos slides escuros, o que
tem luminância acima de 60; na capa limão, o que se destaca do limão (a escala gravada ao fundo não conta).
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output')
REV = os.path.join(OUT, 'revisao')
os.makedirs(REV, exist_ok=True)
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
N, W, H, M, TOL = 8, 1080, 1350, 80, 2
slides = [Image.open(os.path.join(OUT, f'{i:02d}.png')).convert('RGB') for i in range(1, N + 1)]
assert all(s.size == (W, H) for s in slides)
font = ImageFont.truetype(FONT, 26)

# os 8 lado a lado
TW, TH, G = 405, 506, 14
sheet = Image.new('RGB', (N * TW + (N + 1) * G, TH + 2 * G + 40), (28, 28, 28))
d = ImageDraw.Draw(sheet)
for i, s in enumerate(slides):
    x = G + i * (TW + G)
    sheet.paste(s.resize((TW, TH), Image.LANCZOS), (x, G))
    d.text((x, G + TH + 8), f'{i + 1:02d}' + (' · capa limão' if i == 0 else ''), font=font, fill=(175, 250, 39))
sheet.save(os.path.join(OUT, 'previa.jpg'), quality=92)

# margens: tudo o que não é fundo dentro de x 80–1000
lines = []
for i, s in enumerate(slides):
    a = np.asarray(s).astype(float)
    if i == 0:
        mask = np.sqrt(((a - np.array([175, 250, 39])) ** 2).sum(axis=2)) > 150
    else:
        mask = a @ [0.2126, 0.7152, 0.0722] > 60
    ys, xs = np.nonzero(mask)
    ok = xs.min() >= M - TOL and xs.max() <= W - M + TOL
    lines.append(f"{'OK   ' if ok else 'FALHA'}  slide {i + 1:02d}{' (capa limão)' if i == 0 else ''}: conteúdo em x {xs.min()}–{xs.max()}, y {ys.min()}–{ys.max()}")
crop_x = (W - H * 3 / 4) / 2                       # a grade do perfil mostra o centro 3:4 do post 4:5
sheet = Image.new('RGB', (4 * 540 + 5 * G, 2 * 675 + 3 * G), (28, 28, 28))
for i, s in enumerate(slides):
    im = s.copy().convert('RGBA')
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    o = ImageDraw.Draw(ov)
    o.rectangle((0, 0, crop_x, H), fill=(255, 40, 80, 90)); o.rectangle((W - crop_x, 0, W, H), fill=(255, 40, 80, 90))
    o.line((M, 0, M, H), fill=(80, 160, 255, 255), width=3); o.line((W - M, 0, W - M, H), fill=(80, 160, 255, 255), width=3)
    im = Image.alpha_composite(im, ov).convert('RGB').resize((540, 675), Image.LANCZOS)
    sheet.paste(im, (G + (i % 4) * (540 + G), G + (i // 4) * (675 + G)))
sheet.save(os.path.join(REV, 'margens.jpg'), quality=88)

# a capa na grade do perfil (recorte 3:4, tamanho de miniatura), ao lado da capa do Carrossel 01 e de um Reel da série Rotina
tw_, th_ = 356, 475
tiles = [slides[0].crop((crop_x, 0, W - crop_x, H))]
for p, box in (('carrosseis/carrossel-01/output/01-limao.png', (crop_x, 0, W - crop_x, H)),
               ('reels/serie-rotina/output/ep-03/capa.png', (0, 240, 1080, 1680))):
    f = os.path.join(ROOT, '..', '..', p)
    if os.path.exists(f):
        tiles.append(Image.open(f).convert('RGB').crop(box))
grid = Image.new('RGB', (3 * tw_ + 8, th_), (255, 255, 255))
for i, t in enumerate(tiles[:3]):
    grid.paste(t.resize((tw_, th_), Image.LANCZOS), (i * (tw_ + 4), 0))
grid.save(os.path.join(REV, 'capa-na-grade.jpg'), quality=90)

res = 'RESULTADO: ' + ('tudo dentro da margem de 80 px' if all(l.startswith('OK') for l in lines) else 'ajustar')
open(os.path.join(REV, 'margens.txt'), 'w').write('CARROSSEL 02 — margens (80 px nas laterais)\n\n' + '\n'.join(lines + ['', res]) + '\n')
print('\n'.join(lines + [res]))
