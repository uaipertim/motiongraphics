#!/usr/bin/env python3
"""
Rastreio da tela clara do celular no P2, quadro a quadro (plano2.mp4, 480×854, 24 fps).

    python3 scripts/rastreio.py   -> midia/rastreio-p2.json (4 cantos por quadro da fonte, em px da fonte, e o erro)

1. A tela é a maior região clara e pouco saturada abaixo da janela.
2. Bordas visíveis: esquerda e direita (x da 1ª e da última coluna clara de cada linha, longe dos cantos arredondados
   e acima dos polegares) e a de cima (y da 1ª linha clara de cada coluna, sem os cantos e sem o recorte da câmera).
   Cada borda é uma reta ajustada por mínimos quadrados com rejeição de pontos fora (polegar, sombra).
3. Cantos de cima = interseções. A borda de baixo fica sempre sob a mão: os cantos de baixo seguem as retas laterais até
   a altura da tela (proporção 2,22 × a largura de cima, a da tela real vista nesse ângulo).
4. Os toques dos polegares (picos de movimento em cada polegar), para as teclas acenderem no ritmo deles.
5. Suavização temporal leve (média de 3 quadros) e o ERRO: distância de cada ponto de borda medido à borda do
   quadrilátero final, em px do Reel (fonte × 2,25).
"""
import json, os, subprocess
import numpy as np
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'midia', 'plano2.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
V = np.frombuffer(raw, np.uint8).reshape(-1, 854, 480, 3).astype(np.int16)
PROP = 2.22


def reta(xs, ys, it=4, tol=1.2):
    """ajusta x = a·y + b (ou y = a·x + b) com rejeição de pontos fora"""
    m = np.ones(len(xs), bool)
    for _ in range(it):
        a, b = np.polyfit(ys[m], xs[m], 1); r = np.abs(xs - (a * ys + b))
        lim = max(tol, 2.5 * np.median(r[m])); m = r < lim
    return a, b, m


def mede(fr):
    mn, mx = fr.min(axis=2), fr.max(axis=2)
    m = (mn > 185) & (mx - mn < 45); m[:150] = False
    lab, n = ndimage.label(m); s = ndimage.sum(m, lab, range(1, n + 1)); m = lab == int(np.argmax(s)) + 1
    m = ndimage.binary_fill_holes(m)
    ys, xs = np.nonzero(m); y0, y1 = ys.min(), ys.max()
    # bordas laterais: linhas da faixa de 18 % a 62 % da altura visível (longe dos cantos e dos polegares)
    L, R, Y = [], [], []
    for y in range(int(y0 + 0.18 * (y1 - y0)), int(y0 + 0.62 * (y1 - y0))):
        row = np.nonzero(m[y])[0]
        if len(row) < 20: continue
        # sub-pixel: onde a luminância cruza o meio entre fundo e tela
        def sub(x, d):
            lum = fr[y, :, :].mean(axis=1)
            a, b = lum[x - d * 2], lum[x + d * 2] if 0 <= x + d * 2 < 480 else lum[x]
            mid = (a + b) / 2; xs_ = np.arange(x - 3, x + 4); v = lum[np.clip(xs_, 0, 479)]
            k = np.nonzero(np.diff(np.sign(v - mid)))[0]
            return float(xs_[k[0]] + (mid - v[k[0]]) / (v[k[0] + 1] - v[k[0]] + 1e-9)) if len(k) else float(x)
        L.append(sub(row[0], 1)); R.append(sub(row[-1], -1)); Y.append(y)
    L, R, Y = map(np.array, (L, R, Y))
    aL, bL, mL = reta(L, Y); aR, bR, mR = reta(R, Y)
    # borda de cima: colunas entre 15–26 % e 74–85 % da largura (sem cantos e sem o recorte da câmera)
    xa, xb = aL * y0 + bL, aR * y0 + bR
    T, X = [], []
    for f in list(np.linspace(0.15, 0.26, 10)) + list(np.linspace(0.74, 0.85, 10)):
        x = int(round(xa + f * (xb - xa))); col = np.nonzero(m[:, x])[0]
        if not len(col): continue
        y = col[0]; lum = fr[:, x, :].mean(axis=1); v = lum[y - 3:y + 4]; mid = (lum[y - 4] + lum[y + 4]) / 2
        k = np.nonzero(np.diff(np.sign(v - mid)))[0]
        T.append(y - 3 + k[0] + (mid - v[k[0]]) / (v[k[0] + 1] - v[k[0]] + 1e-9) if len(k) else y); X.append(x)
    T, X = np.array(T, float), np.array(X, float)
    aT, bT, mT = reta(T, X)
    # interseções: x = aL·y + bL e y = aT·x + bT
    def cruza(a, b):
        y = (aT * b + bT) / (1 - aT * a); return np.array([a * y + b, y])
    TL, TR = cruza(aL, bL), cruza(aR, bR)
    pts = {'L': np.c_[L[mL], Y[mL]], 'R': np.c_[R[mR], Y[mR]], 'T': np.c_[X[mT], T[mT]]}
    return TL, TR, (aL, bL), (aR, bR), pts


out, P = [], []
for fr in V:
    TL, TR, ladoL, ladoR, pts = mede(fr)
    out.append([TL, TR, ladoL, ladoR]); P.append(pts)
# suavização (3 quadros) dos cantos de cima e das inclinações
arr = np.array([[*o[0], *o[1], *o[2], *o[3]] for o in out])
sm = ndimage.uniform_filter1d(arr, 3, axis=0, mode='nearest')
quadros, erros = [], []
for i, s in enumerate(sm):
    TL, TR = s[0:2], s[2:4]; aL, bL, aR, bR = s[4:8]
    w = np.hypot(*(TR - TL)); h = PROP * w
    # cantos de baixo: seguem as laterais (direção da reta) por h
    dL = np.array([aL, 1.0]); dL /= np.hypot(*dL); dR = np.array([aR, 1.0]); dR /= np.hypot(*dR)
    BL, BR = TL + dL * h, TR + dR * h
    quadros.append([[round(float(v), 2) for v in c] for c in (TL, TR, BR, BL)])
    # erro: distância dos pontos medidos às bordas do quadrilátero final
    def dist(p, a, b):
        d = b - a; n = np.array([-d[1], d[0]]) / np.hypot(*d); return np.abs((p - a) @ n)
    e = np.concatenate([dist(P[i]['L'], TL, BL), dist(P[i]['R'], TR, BR), dist(P[i]['T'], TL, TR)]) * 2.25
    erros.append([float(np.mean(e)), float(np.percentile(e, 95)), float(e.max())])
erros = np.array(erros)
res = {'fonte': 'midia/plano2.mp4', 'fps': 24, 'escala_reel': 2.25, 'proporcao': PROP, 'quadros': quadros,
       'erro_px_reel': {'medio': round(float(erros[:, 0].mean()), 2), 'p95': round(float(np.percentile(erros[:, 1], 95)), 2), 'max': round(float(erros[:, 2].max()), 2),
                        'por_quadro': [[round(a, 2), round(b, 2)] for a, b, _ in erros]}}
# os toques dos polegares (V3): picos de movimento na região de cada polegar → as teclas que acendem no teclado
G = V.mean(axis=3)
toques = []
for lado, (x0, y0, x1, y1) in (('e', (200, 280, 320, 460)), ('d', (320, 300, 450, 480))):
    d = np.r_[0, np.abs(np.diff(G[:, y0:y1, x0:x1], axis=0)).mean(axis=(1, 2))]
    for i in range(1, len(d) - 1):
        if d[i] > 2.4 and d[i] >= d[i - 1] and d[i] >= d[i + 1]:
            if not toques or toques[-1][1] != lado or i / 24 - toques[-1][0] > 0.1: toques.append([round(i / 24, 3), lado, round(float(d[i]), 1)])
res['toques'] = sorted(toques)
json.dump(res, open(os.path.join(ROOT, 'midia', 'rastreio-p2.json'), 'w'))
print('rastreio P2:', len(quadros), 'quadros; erro em px do Reel: médio', res['erro_px_reel']['medio'], '· P95', res['erro_px_reel']['p95'], '· máx', res['erro_px_reel']['max'])
