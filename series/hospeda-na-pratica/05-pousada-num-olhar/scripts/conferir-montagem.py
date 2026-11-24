#!/usr/bin/env python3
"""A tela do vídeo é a PÁGINA inteira (pg-*) correndo por baixo do cabeçalho e da barra de baixo (de vp-inicio).
Confere se essa montagem, na rolagem de cada captura do celular (vp-*), dá a mesma imagem que a própria captura.
    python3 scripts/conferir-montagem.py   -> output/revisao/montagem.json"""
import json, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = lambda n: np.asarray(Image.open(os.path.join(ROOT, 'telas', n + '.png')).convert('RGB')).astype(np.int16)
C = json.load(open(os.path.join(ROOT, 'telas', 'conferencia.json')))['telas']
A = json.load(open(os.path.join(ROOT, 'telas', 'alvos.json')))
vi = T('vp-inicio'); cab = A['vp-inicio']['cabecalho'][3]; bar = A['vp-inicio']['barra'][1]
PARES = {'vp-inicio': 'pg-inicio', 'vp-fim': 'pg-inicio', 'vp-atencao': 'pg-inicio', 'vp-hospedados': 'pg-hospedados', 'vp-recebido': 'pg-recebido'}
res, ok = {}, True
for v, p in PARES.items():
    s = C[v]['rolagem']; img = T(v); pag = T(p)
    m = pag[s:s + 2532].copy(); m[:cab] = vi[:cab]; m[bar:] = vi[bar:]
    d = np.abs(m - img); frac = float((d.max(axis=2) > 24).mean())
    res[v] = {'pagina': p, 'rolagem': s, 'diferenca_media': round(float(d.mean()), 3), 'pixels_diferentes_pct': round(100 * frac, 3)}
    ok = ok and frac < 0.002
os.makedirs(os.path.join(ROOT, 'output', 'revisao'), exist_ok=True)
json.dump({'cabecalho_ate_px': cab, 'barra_desde_px': bar, 'resultado': res, 'ok': ok}, open(os.path.join(ROOT, 'output', 'revisao', 'montagem.json'), 'w'), indent=1)
print(json.dumps(res, indent=1), '\nOK' if ok else '\nDIFERENTE')
