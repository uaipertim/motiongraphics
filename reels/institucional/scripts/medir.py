#!/usr/bin/env python3
"""
Mede um retângulo de uma captura, para preencher as ops de motion do src/anim.js (r, bg, color).

    python3 scripts/medir.py src/capturas/celular/07-caixa--form-fechar-caixa.png 420,1305,740,1345 [...]

Para cada retângulo x0,y0,x1,y1 (pixels da captura) imprime:
- bg: a cor mais comum (o fundo, para o "bg" da op);
- tinta: a caixa justa do que difere do fundo (para o "r" de count/type/wipe);
- cor: o pixel mais distante do fundo (para o "color" de count/roll);
- colunas: as colunas com tinta (≈ letras; é o que a op "type" revela uma a uma).
"""
import sys
from collections import Counter
import numpy as np
from PIL import Image


def medir(img, r, thr=60):
    x0, y0, x1, y1 = r
    reg = img[y0:y1, x0:x1]
    bg = np.array(Counter(map(tuple, reg.reshape(-1, 3))).most_common(1)[0][0])
    tinta = np.abs(reg - bg).sum(2) > thr
    ys, xs = np.where(tinta)
    if not len(xs):
        return bg, None, None, []
    far = reg[tinta]
    cor = far[np.argmax(np.abs(far - bg).sum(1))]
    cols, st = [], None
    for i, v in enumerate(tinta.any(0)):
        if v and st is None:
            st = i
        if not v and st is not None:
            cols.append((x0 + st, x0 + i))
            st = None
    if st is not None:
        cols.append((x0 + st, x1))
    return bg, (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1), cor, cols


if __name__ == '__main__':
    img = np.array(Image.open(sys.argv[1]).convert('RGB')).astype(int)
    hx = lambda c: '#%02X%02X%02X' % tuple(int(v) for v in c)
    for a in sys.argv[2:]:
        r = [int(v) for v in a.split(',')]
        bg, box, cor, cols = medir(img, r)
        print(f'{a}: bg {hx(bg)} · tinta {list(map(int, box)) if box else "—"} · cor {hx(cor) if cor is not None else "—"} · '
              f'{len(cols)} colunas {[(int(p), int(q)) for p, q in cols[:16]]}{" …" if len(cols) > 16 else ""}')
