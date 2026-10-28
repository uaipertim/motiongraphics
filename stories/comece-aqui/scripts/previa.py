#!/usr/bin/env python3
"""
Prévia em grade e conferência das áreas seguras do destaque "Comece aqui".

    python3 scripts/previa.py   -> output/previa.jpg + output/revisao/areas-seguras.txt

Regras conferidas (pelas caixas do render e pelos pixels):
  • telas 01–03: nada em y < 250 nem em y > 1620 (pixel aceso = luminância > 60; o fundo não passa disso);
  • tela 03: a faixa y 1150–1450 vazia (para a figurinha de link);
  • capa: o anel inteiro dentro do quadro.
"""
import json
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output')
ARQ = ['01.png', '02.png', '03.png', 'capa-destaque-comece-aqui.png']
TOPO, BASE, FAIXA, LUM = 250, 1620, (1150, 1450), 60


def lum(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def main():
    caixas = json.load(open(os.path.join(OUT, 'revisao', 'caixas.json')))
    linhas, ok = [], True
    for n, arq in zip(['1', '2', '3', 'capa'], ARQ):  # n: a tela
        L, cx = lum(os.path.join(OUT, arq)), caixas[arq]
        ys = np.nonzero((L > LUM).any(axis=1))[0]
        linhas.append(f'{arq}: pixels acesos de y {ys.min()} a {ys.max()}; caixas de y {min(b["y0"] for b in cx)} a {max(b["y1"] for b in cx)}')
        if n == 'capa':
            if any(b['x0'] < 0 or b['y0'] < 0 or b['x1'] > 1080 or b['y1'] > 1920 for b in cx):
                ok = False; linhas.append('  ✗ anel fora do quadro')
            continue
        if ys.min() < TOPO or ys.max() > BASE:
            ok = False; linhas.append(f'  ✗ pixel aceso fora de y {TOPO}–{BASE}')
        for b in cx:
            if b['y0'] < TOPO or b['y1'] > BASE:
                ok = False; linhas.append(f'  ✗ caixa "{b["nome"]}" fora de y {TOPO}–{BASE}')
        if n == '3':
            acesos = int((L[FAIXA[0]:FAIXA[1]] > LUM).sum())
            invade = [b['nome'] for b in cx if b['y1'] > FAIXA[0] and b['y0'] < FAIXA[1]]
            linhas.append(f'  faixa y {FAIXA[0]}–{FAIXA[1]}: {acesos} pixels acesos, caixas dentro: {invade or "nenhuma"}')
            if acesos or invade:
                ok = False; linhas.append('  ✗ a faixa da figurinha de link não está livre')
    linhas.append('APROVADO' if ok else 'REPROVADO')
    os.makedirs(os.path.join(OUT, 'revisao'), exist_ok=True)
    open(os.path.join(OUT, 'revisao', 'areas-seguras.txt'), 'w').write('\n'.join(linhas) + '\n')
    print('\n'.join(linhas))

    # prévia: as 4 imagens lado a lado (360×640 cada)
    w, h, g = 360, 640, 16
    grade = Image.new('RGB', (4 * w + 5 * g, h + 2 * g), (38, 38, 36))
    for i, arq in enumerate(ARQ):
        grade.paste(Image.open(os.path.join(OUT, arq)).convert('RGB').resize((w, h), Image.LANCZOS), (g + i * (w + g), g))
    grade.save(os.path.join(OUT, 'previa.jpg'), quality=90)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
