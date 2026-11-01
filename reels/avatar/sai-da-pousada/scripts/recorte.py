#!/usr/bin/env python3
"""
Recorte da personagem no P4 (para os cartões passarem ATRÁS da cabeça).

    python3 scripts/recorte.py   -> midia/recorte-p4/NNNN.png (a personagem com transparência, por quadro do Reel)
                                   + midia/recorte-p4.json (caixa do rosto e largura da borda, por quadro)

1. Segmentação de pessoa (scripts/segmenta.py: mediapipe multiclasse) no quadro da fonte (448×832); pessoa = 1 − fundo.
2. A máscara sobe para o quadro do Reel e a borda é refinada por guided filter na própria imagem (o cabelo).
3. Sem halo: a cor da borda é "descontaminada" — o pixel da borda é uma mistura de cabelo com o fundo claro da
   janela; o fundo local é estimado em volta (média normalizada) e retirado, então nada claro vaza sobre os cartões.
4. Só a maior região conectada (sem fragmentos do teto ou da coluna). Suavização temporal leve da máscara (média com os quadros vizinhos da fonte), sem tremor na borda.
"""
import json, os, subprocess, sys
import numpy as np
import cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segmenta import confiancas, guiado

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LN = json.load(open(os.path.join(ROOT, 'linha.json'))); MAPA = json.load(open(os.path.join(ROOT, 'midia', 'base-quadros.json')))
OUT = os.path.join(ROOT, 'midia', 'recorte-p4'); os.makedirs(OUT, exist_ok=True)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'midia', 'plano4.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
V = np.frombuffer(raw, np.uint8).reshape(-1, 832, 448, 3)
pessoa, rosto = [], []
for fr in V:
    c = confiancas(fr); pessoa.append(1 - c['fundo']); rosto.append(c['rosto'])
pessoa = np.array(pessoa); rosto = np.array(rosto)
pp = np.concatenate([pessoa[:1], pessoa, pessoa[-1:]])
pessoa = pp[:-2] * 0.25 + pp[1:-1] * 0.5 + pp[2:] * 0.25                                         # suavização temporal
up = lambda m: cv2.resize(m, (1080, 2006), interpolation=cv2.INTER_CUBIC)[:1920]
info = {}
for q in MAPA:
    if q['fonte'] != 'p4': continue
    k, j = q['k'], q['q']
    I = np.asarray(Image.open(os.path.join(ROOT, 'midia', 'quadros', f'{k:04d}.jpg'))).astype(np.float32) / 255
    g = I @ np.array([0.299, 0.587, 0.114], np.float32)
    p0 = np.clip(up(pessoa[j]), 0, 1)
    a = guiado(g, p0, r=6, eps=2e-4)
    a = np.clip((a - 0.08) / 0.84, 0, 1)                                                       # borda firme (10–90 % em poucos px)
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.3).astype(np.uint8), 8)                  # só a pessoa: a maior região
    if n > 1:
        so = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
        a = a * cv2.GaussianBlur(cv2.dilate(so, np.ones((15, 15), np.uint8)).astype(np.float32), (0, 0), 3)
    # descontaminação: fundo local B = média do quadro onde não é pessoa; F = (I − (1 − a)·B) / a
    wB = (1 - a) ** 2
    B = cv2.GaussianBlur(I * wB[..., None], (0, 0), 14) / (cv2.GaussianBlur(wB, (0, 0), 14)[..., None] + 1e-4)
    F = np.where(a[..., None] > 0.02, np.clip((I - (1 - a[..., None]) * B) / np.maximum(a[..., None], 0.02), 0, 1), I)
    rgba = np.dstack([F, a]); Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(OUT, f'{k:04d}.png'), compress_level=1)
    r = up(rosto[j]) > 0.5; ys, xs = np.nonzero(r)
    borda = ((a > 0.1) & (a < 0.9)).sum() / max(1, ((a > 0.5) ^ cv2.erode((a > 0.5).astype(np.uint8), np.ones((3, 3)))).sum())
    info[k] = {'rosto': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())], 'borda_px': round(float(borda), 2)}
json.dump(info, open(os.path.join(ROOT, 'midia', 'recorte-p4.json'), 'w'))
bp = [v['borda_px'] for v in info.values()]
print('recorte P4:', len(info), 'quadros · largura da borda (10–90 %): mediana', np.median(bp), 'px')
