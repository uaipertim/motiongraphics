#!/usr/bin/env python3
"""Mede, nas capturas preenchidas, a caixa do texto digitado dentro de cada campo (para a digitação letra a letra no vídeo).
    python3 scripts/medir_textos.py   -> telas/textos.json  (px da captura do celular)"""
import json, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = json.load(open(os.path.join(ROOT, 'telas', 'alvos.json')))
CAMPOS = [('passo2-preenchido', 'nome'), ('passo2-preenchido', 'fone'), ('passo4-sinal', 'sinal')]
out = {}
for tela, k in CAMPOS:
    r = A[tela][k]; rol = A[tela]['rolagem']; x0, y0, x1, y1 = r[0], r[1] - rol, r[2], r[3] - rol
    im = np.asarray(Image.open(os.path.join(ROOT, 'telas', tela + '.png')).convert('L')).astype(int)
    m = 14; sub = im[y0 + m:y1 - m, x0 + m:x1 - m]
    esc = sub < 120; ys, xs = np.nonzero(esc)
    out[f'{tela}.{k}'] = {'campo': [x0, y0, x1, y1], 'texto': [int(xs.min() + x0 + m), int(ys.min() + y0 + m), int(xs.max() + x0 + m), int(ys.max() + y0 + m)]}
json.dump(out, open(os.path.join(ROOT, 'telas', 'textos.json'), 'w'), indent=1)
print(json.dumps(out))
