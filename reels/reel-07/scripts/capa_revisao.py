#!/usr/bin/env python3
"""
Revisão da capa do Reel 07 (roda depois de `node scripts/capa.cjs`).

    python3 scripts/capa_revisao.py  ->  output/capa.jpg (qualidade 95, cor 4:4:4)
                                         output/revisao/capa-no-feed.jpg

Confere se título, notinha e logo cabem inteiros no recorte 3:4 da grade do
perfil (y 240–1680) com folga de 60 px (x 60–1020, y 300–1620): pelas caixas
exportadas pela página da capa e pelos próprios pixels (tudo o que não é fundo).
A prévia mostra a capa inteira com o recorte marcado, o recorte 3:4 e a capa
na grade, ao lado das capas dos Reels 06 e 05, no tamanho de miniatura.
"""
import json
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
cover = Image.open(os.path.join(OUT, 'capa.png')).convert('RGB')
assert cover.size == (1080, 1920), cover.size
cover.save(os.path.join(OUT, 'capa.jpg'), quality=95, subsampling=0, optimize=True)

BAND = (0, 240, 1080, 1680)
SAFE = (60, 300, 1020, 1620)
boxes = json.load(open(os.path.join(OUT, 'revisao', 'capa-caixas.json')))
lines = []
ok_all = True
for name, b in (('título', {'x0': None, **boxes['title']}), ('notinha', boxes['receipt']), ('logo', boxes['logo'])):
    y_ok = b['y0'] >= SAFE[1] and b['y1'] <= SAFE[3]
    x_ok = b.get('x0') is None or (b['x0'] >= SAFE[0] and b['x1'] <= SAFE[2])
    ok_all &= y_ok and x_ok
    xs = '' if b.get('x0') is None else f"x {b['x0']:.0f}–{b['x1']:.0f}, "
    lines.append(f"{'OK   ' if y_ok and x_ok else 'FALHA'}  {name}: {xs}y {b['y0']:.0f}–{b['y1']:.0f}")
# pelos pixels: tudo o que se destaca do fundo (texto, papel, logo, a luz da fenda)
a = np.asarray(cover).astype(float)
lum = a @ [0.2126, 0.7152, 0.0722]
ys, xs = np.nonzero(lum > 60)
px = (xs.min(), ys.min(), xs.max(), ys.max())
p_ok = px[0] >= SAFE[0] and px[1] >= SAFE[1] and px[2] <= SAFE[2] and px[3] <= SAFE[3]
ok_all &= p_ok
lines.append(f"{'OK   ' if p_ok else 'FALHA'}  tudo o que não é fundo: x {px[0]}–{px[2]}, y {px[1]}–{px[3]}")
lines.append('       limite (3:4 com folga de 60 px): x 60–1020, y 300–1620')
lines.append(f"       título em {boxes['title']['size']} px (Inter Display Black 900)")
lines.append('RESULTADO: ' + ('dentro do recorte 3:4 com folga de 60 px' if ok_all else 'ajustar'))

# ---------------------------------------------------------------- prévia
font = ImageFont.truetype(FONT, 30)
small = ImageFont.truetype(FONT, 24)
S = 0.5                                                  # capa inteira na metade do tamanho
full = cover.copy()
ov = Image.new('RGBA', full.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
d.rectangle((0, 0, 1080, BAND[1]), fill=(0, 0, 0, 150)); d.rectangle((0, BAND[3], 1080, 1920), fill=(0, 0, 0, 150))
d.rectangle(BAND, outline=(175, 250, 39, 255), width=6)
for y in range(SAFE[1], SAFE[3], 24):                     # folga de 60 px tracejada
    d.line((SAFE[0], y, SAFE[0], y + 12), fill=(255, 255, 255, 140), width=2); d.line((SAFE[2], y, SAFE[2], y + 12), fill=(255, 255, 255, 140), width=2)
for x in range(SAFE[0], SAFE[2], 24):
    d.line((x, SAFE[1], x + 12, SAFE[1]), fill=(255, 255, 255, 140), width=2); d.line((x, SAFE[3], x + 12, SAFE[3]), fill=(255, 255, 255, 140), width=2)
full = Image.alpha_composite(full.convert('RGBA'), ov).convert('RGB').resize((540, 960), Image.LANCZOS)
crop = cover.crop(BAND).resize((540, 720), Image.LANCZOS)
# a grade do perfil: 3 colunas em tamanho de miniatura (1/3 da largura de um celular de 1080 px)
TW, TH = 356, 475
neighbors = [os.path.join(ROOT, '..', 'reel-06', 'output', 'capa.png'), os.path.join(ROOT, '..', 'reel-05', 'output', 'capa.png')]
tiles = [cover] + [Image.open(p).convert('RGB') for p in neighbors if os.path.exists(p)]
grid = Image.new('RGB', (3 * TW + 2 * 4, TH), (255, 255, 255))
for i, im in enumerate(tiles[:3]):
    grid.paste(im.crop(BAND).resize((TW, TH), Image.LANCZOS), (i * (TW + 4), 0))

Wd = 40 + 540 + 40 + 540 + 40 + grid.width + 60
sheet = Image.new('RGB', (Wd, 1140), (24, 24, 24))
dr = ImageDraw.Draw(sheet)
dr.text((40, 18), 'CAPA 9:16', font=small, fill=(175, 250, 39)); dr.text((40, 48), '3:4 em verde · folga 60 px', font=small, fill=(200, 200, 194))
sheet.paste(full, (40, 80))
dr.text((620, 18), 'RECORTE 3:4', font=small, fill=(175, 250, 39)); dr.text((620, 48), 'o que a grade mostra', font=small, fill=(200, 200, 194))
sheet.paste(crop, (620, 80))
gx = 620 + 540 + 40
dr.text((gx, 18), 'NA GRADE DO PERFIL (miniatura)', font=small, fill=(175, 250, 39)); dr.text((gx, 48), 'ao lado: capas dos Reels 06 e 05', font=small, fill=(200, 200, 194))
sheet.paste(grid, (gx, 80))
for k, ln in enumerate(lines):
    dr.text((gx, 80 + TH + 50 + k * 40), ln, font=small, fill=(220, 220, 214) if not ln.startswith('FALHA') else (255, 80, 90))
sheet.save(os.path.join(OUT, 'revisao', 'capa-no-feed.jpg'), quality=92)
open(os.path.join(OUT, 'revisao', 'capa.txt'), 'w').write('REEL 07 — capa: área segura da grade (3:4)\n\n' + '\n'.join(lines) + '\n')
print('\n'.join(lines))
