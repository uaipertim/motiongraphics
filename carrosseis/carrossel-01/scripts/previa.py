#!/usr/bin/env python3
"""
Prévia e revisão do carrossel (roda depois de `node scripts/render.cjs`).

    python3 scripts/previa.py  ->  output/previa.jpg              (os 8 slides lado a lado, na ordem do post)
                                   output/revisao/margens.jpg      (margem de 80 px e recorte 3:4 da grade)
                                   output/revisao/capa-na-grade.jpg (a capa na grade do perfil, em miniatura)
                                   output/revisao/margens.txt
                                   output/previa-capas.jpg         (as duas capas, limão e preta, e cada uma na grade)

A capa que vai ao ar é a limão (output/01-limao.png) — regra dos carrosséis do pilar DICA
(../README.md); output/01.png, a capa preta, fica como reserva.

Confere, pelos pixels, que nada além do fundo passa da margem de 80 px nas laterais (na capa limão, o que
conta é o que se destaca do limão — a escala gravada ao fundo não conta).
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
LIM = os.path.join(OUT, '01-limao.png')
capa = Image.open(LIM).convert('RGB') if os.path.exists(LIM) else slides[0]   # a capa que vai ao ar
seq = [capa] + slides[1:]                                                      # o post, na ordem
font = ImageFont.truetype(FONT, 26)

# os 8 lado a lado
TW, TH, G = 405, 506, 14
sheet = Image.new('RGB', (N * TW + (N + 1) * G, TH + 2 * G + 40), (28, 28, 28))
d = ImageDraw.Draw(sheet)
for i, s in enumerate(seq):
    x = G + i * (TW + G)
    sheet.paste(s.resize((TW, TH), Image.LANCZOS), (x, G))
    d.text((x, G + TH + 8), f'{i + 1:02d}' + (' · capa limão' if i == 0 and capa is not slides[0] else ''), font=font, fill=(175, 250, 39))
sheet.save(os.path.join(OUT, 'previa.jpg'), quality=92)

# margens: tudo o que não é fundo dentro de x 80–1000
lines = []
for i, s in enumerate(slides):
    lum = np.asarray(s).astype(float) @ [0.2126, 0.7152, 0.0722]
    ys, xs = np.nonzero(lum > 60)
    ok = xs.min() >= M - TOL and xs.max() <= W - M + TOL
    lines.append(f"{'OK   ' if ok else 'FALHA'}  slide {i + 1:02d}{' (capa preta, reserva)' if i == 0 else ''}: conteúdo em x {xs.min()}–{xs.max()}, y {ys.min()}–{ys.max()}")
crop_x = (W - H * 3 / 4) / 2                       # a grade do perfil mostra o centro 3:4 do post 4:5
sheet = Image.new('RGB', (4 * 540 + 5 * G, 2 * 675 + 3 * G), (28, 28, 28))
for i, s in enumerate(seq):
    im = s.copy().convert('RGBA')
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    o = ImageDraw.Draw(ov)
    o.rectangle((0, 0, crop_x, H), fill=(255, 40, 80, 90)); o.rectangle((W - crop_x, 0, W, H), fill=(255, 40, 80, 90))
    o.line((M, 0, M, H), fill=(80, 160, 255, 255), width=3); o.line((W - M, 0, W - M, H), fill=(80, 160, 255, 255), width=3)
    im = Image.alpha_composite(im, ov).convert('RGB').resize((540, 675), Image.LANCZOS)
    sheet.paste(im, (G + (i % 4) * (540 + G), G + (i // 4) * (675 + G)))
sheet.save(os.path.join(REV, 'margens.jpg'), quality=88)

# a capa na grade do perfil, ao lado das capas dos Reels 07 e 06 (recorte 3:4, tamanho de miniatura)
tw_, th_ = 356, 475
tiles = [capa.crop((crop_x, 0, W - crop_x, H))]
for p in ('reels/reel-07/output/capa.png', 'reels/reel-06/output/capa.png'):
    f = os.path.join(ROOT, '..', '..', p)
    if os.path.exists(f):
        tiles.append(Image.open(f).convert('RGB').crop((0, 240, 1080, 1680)))
grid = Image.new('RGB', (3 * tw_ + 8, th_), (255, 255, 255))
for i, t in enumerate(tiles[:3]):
    grid.paste(t.resize((tw_, th_), Image.LANCZOS), (i * (tw_ + 4), 0))
grid.save(os.path.join(REV, 'capa-na-grade.jpg'), quality=90)

# a capa alternativa, em verde-limão (output/01-limao.png)
fl = os.path.join(OUT, '01-limao.png')
if os.path.exists(fl):
    lim = Image.open(fl).convert('RGB')
    a = np.asarray(lim).astype(float)
    dist = np.sqrt(((a - np.array([175, 250, 39])) ** 2).sum(axis=2))
    ys, xs = np.nonzero(dist > 150)
    ok = xs.min() >= M - TOL and xs.max() <= W - M + TOL
    lines.append(f"{'OK   ' if ok else 'FALHA'}  capa limão (a que vai ao ar): conteúdo em x {xs.min()}–{xs.max()}, y {ys.min()}–{ys.max()}")
    # as duas capas lado a lado e, embaixo, cada uma na grade do perfil (ao lado das capas dos Reels 07 e 06)
    CWs, CHs = 540, 675
    sh = Image.new('RGB', (2 * CWs + 3 * G + 40, CHs + 60 + 2 * (th_ + 50) + G), (28, 28, 28))
    dd = ImageDraw.Draw(sh)
    for k, (im, nome) in enumerate([(lim, 'CAPA LIMÃO (escolhida)'), (slides[0], 'CAPA PRETA (reserva)')]):
        x = G + k * (CWs + G + 40)
        dd.text((x, G), nome, font=font, fill=(175, 250, 39))
        sh.paste(im.resize((CWs, CHs), Image.LANCZOS), (x, G + 40))
    gy = G + 40 + CHs + 30
    for k, im in enumerate([lim, slides[0]]):
        row = Image.new('RGB', (3 * tw_ + 8, th_), (255, 255, 255))
        for i, t in enumerate([im.crop((crop_x, 0, W - crop_x, H))] + tiles[1:3]):
            row.paste(t.resize((tw_, th_), Image.LANCZOS), (i * (tw_ + 4), 0))
        row = row.resize((row.width * 2 // 3, row.height * 2 // 3), Image.LANCZOS)
        dd.text((G, gy - 4), ('limão' if k == 0 else 'preta') + ' na grade (ao lado dos Reels 07 e 06)', font=font, fill=(200, 200, 194))
        sh.paste(row, (G, gy + 30)); gy += row.height + 50
    sh = sh.crop((0, 0, sh.width, gy))
    sh.save(os.path.join(OUT, 'previa-capas.jpg'), quality=92)

res = 'RESULTADO: ' + ('tudo dentro da margem de 80 px' if all(l.startswith('OK') for l in lines) else 'ajustar')
open(os.path.join(REV, 'margens.txt'), 'w').write('CARROSSEL 01 — margens (80 px nas laterais)\n\n' + '\n'.join(lines + ['', res]) + '\n')
print('\n'.join(lines + [res]))
