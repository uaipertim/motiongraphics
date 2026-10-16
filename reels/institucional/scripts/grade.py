#!/usr/bin/env python3
"""
Desenha uma grade de 50 px (rótulos a cada 100 px) sobre capturas, para achar as coordenadas dos recortes.

    python3 scripts/grade.py output/grade src/capturas/celular/*.png

As imagens com grade vão para a pasta indicada (não entram no vídeo).
"""
import os
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
for f in sys.argv[2:]:
    im = Image.open(f).convert('RGB')
    d = ImageDraw.Draw(im)
    for y in range(0, im.height, 50):
        d.line([(0, y), (im.width, y)], fill=(255, 0, 0) if y % 100 == 0 else (255, 170, 170))
        if y % 100 == 0:
            d.text((2, y + 1), str(y), fill=(255, 0, 0))
    for x in range(0, im.width, 50):
        d.line([(x, 0), (x, im.height)], fill=(0, 0, 255) if x % 100 == 0 else (170, 170, 255))
        if x % 100 == 0:
            d.text((x + 2, 2), str(x), fill=(0, 0, 255))
    im.save(os.path.join(out, os.path.basename(f)))
    print(os.path.join(out, os.path.basename(f)))
