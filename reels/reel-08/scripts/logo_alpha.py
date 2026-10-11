#!/usr/bin/env python3
"""
Recorta o fundo branco da logo FAZLO Hospeda (arquivo original intacto).

A logo é usada exatamente como foi fornecida: só o branco que está FORA do
círculo preto vira transparente. Nada é redesenhado, recolorido ou movido.

    python3 scripts/logo_alpha.py   ->  src/assets/fazlo-hospeda-logo-alpha.png
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'assets', 'fazlo-hospeda-logo.png')
OUT = os.path.join(ROOT, 'src', 'assets', 'fazlo-hospeda-logo-alpha.png')

rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
lum = rgb.mean(axis=2)

# 1) região clara conectada à borda da imagem = fundo externo
light = lum > 128
lab, _ = ndimage.label(light)
border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
outside = np.isin(lab, border[border > 0])

# 2) alfa: 0 no fundo, 1 no círculo; na borda (anti-aliasing do JPEG),
#    alfa proporcional ao quanto o pixel é escuro (mistura preto/branco)
alpha = np.ones_like(lum)
alpha[outside] = 0.0
edge = ndimage.binary_dilation(outside, iterations=3) & ~ndimage.binary_erosion(outside, iterations=3)
alpha[edge] = np.clip((255.0 - lum[edge]) / 235.0, 0, 1)

# nos pixels de borda a cor de fundo (branco) é removida: sobra o preto do círculo
out = rgb.copy()
out[edge] = 0.0
rgba = np.dstack([out, alpha * 255.0]).round().clip(0, 255).astype(np.uint8)

# 3) recorta ao quadrado mínimo que contém o círculo (centralizado)
ys, xs = np.nonzero(alpha > 0.02)
cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
half = int(np.ceil(max(ys.max() - ys.min(), xs.max() - xs.min()) / 2)) + 2
box = (int(cx - half), int(cy - half), int(cx + half), int(cy + half))
img = Image.fromarray(rgba, 'RGBA').crop(box)
img.save(OUT, optimize=True)
print('ok ->', OUT, img.size, 'circle bbox', (xs.min(), ys.min(), xs.max(), ys.max()))
