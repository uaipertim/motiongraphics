#!/usr/bin/env python3
"""
A base do Reel "Saí da pousada": os 5 planos aprovados em 1080×1920, 30 fps, um depois do outro, sem camada nem som.

    python3 scripts/base.py   -> midia/quadros/NNNN.jpg (os quadros-base que a página desenha) + midia/base-1080.mp4 (para o QA)
                                 + midia/base-quadros.json (de qual fonte e quadro vem cada quadro do Reel)
                                 + midia/capa-quadro.png (o quadro 44, base da capa)

V2 — P2: a conversa (midia/tela-p2, desenhada pela página: `node scripts/render.cjs telas`) entra NA tela do celular,
em perspectiva, pelos 4 cantos rastreados quadro a quadro (midia/rastreio-p2.json, scripts/rastreio.py). Ela só
substitui o branco da tela: onde há polegar, sombra ou o recorte da câmera, fica a imagem original. A cor vem
"desmisturada" (o pixel é tratado como mistura de branco da tela com o que está na frente), então não sobra contorno
branco em volta dos polegares; a variação de luz da tela real continua por cima. Aproximação lenta (1,00 → 1,08) no
celular, para a conversa ficar legível.

- Upscale lanczos com nitidez leve (unsharp 5×5 0,4), como no Reel da Dona Maria.
- 24/25 → 30 fps por repetição de quadro: o quadro do Reel no instante t é o quadro da fonte que está na tela nesse
  instante (floor(t·fps)); nada de interpolação, para não mexer na boca.
- P1: Seedance (plano1-base) de 0 a 1,5 s e Aurora (plano1-fala) a partir de 1,5 s, no MESMO relógio (a voz é a da
  Aurora desde 0 s). Alinhamento medido (SIFT + RANSAC no quadro de 1,5 s): o Seedance redimensionado para 448 px de
  largura casa com a Aurora com escala 1,04 e x −8,5 px (y 0). Fusão de 3 quadros (25 %, 50 %, 75 % de Aurora nos
  quadros 45, 46 e 47 do Reel).
- Fim (V3): depois do P5 (só para a frente, até ~1 s depois da última palavra), a tela da marca: fundo preto.
- P5: zoom fixo de 114 % no rosto (janela 393×699 da fonte, x 27, y 0): é o menor zoom centrado que deixa de fora
  todos os quadros com o dedo no canto inferior direito (x ≥ 380, y ≥ 688 na fonte; ver output/revisao/relatorio.txt).
  V3: o P5 só anda para a frente (nada de trecho de trás para frente); ele termina ~1 s depois da última palavra.
"""
import json, os, subprocess
import numpy as np
import cv2
from PIL import Image
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segmenta import confiancas, guiado

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LN = json.load(open(os.path.join(ROOT, 'linha.json')))   # (scripts/linha.py)
W, H, FPS = 1080, 1920, 30
SHARP = 'unsharp=5:5:0.4:5:5:0'


def fonte(arq, vf, fps):
    """todos os quadros da fonte, já em 1080×1920 (lista de arrays)"""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, arq), '-vf', vf + ',' + SHARP, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    return v, fps


SEED = 'scale=1080:1922:flags=lanczos,crop=1080:1920:0:1'
AUR = 'scale=1080:2006:flags=lanczos,crop=1080:1920:0:0'
raw2 = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'midia', 'plano2.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
src_p2_raw = (np.frombuffer(raw2, np.uint8).reshape(-1, 854, 480, 3), 24)
src = {
    'p1s': fonte('midia/plano1-base.mp4', 'scale=1123:1998:flags=lanczos,crop=1080:1920:21:0', 24),   # 480→448 ×1,04 ×(1080/448); x −8,5 px × 2,41
    'p1a': fonte('midia/plano1-fala.mp4', AUR, 25),
    'p2': fonte('midia/plano2.mp4', SEED, 24),
    'p3': fonte('midia/plano3.mp4', SEED, 24),
    'p4': fonte('midia/plano4.mp4', AUR, 25),
    'p5': fonte('midia/plano5.mp4', 'crop=393:699:27:0,scale=1080:1920:flags=lanczos', 25),
}
P = {p['id']: p for p in LN['planos']}
total = int(round(LN['duracao'] * FPS))
out = os.path.join(ROOT, 'midia', 'base-1080.mp4')
QD = os.path.join(ROOT, 'midia', 'quadros'); os.makedirs(QD, exist_ok=True)
RAST = json.load(open(os.path.join(ROOT, 'midia', 'rastreio-p2.json')))
TW, TH = 600, 1272


def smooth(x, a, b): return np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))


PELE = {}


def pele_p2(j):
    """as mãos (classe pele do corpo) no quadro j do plano 2, já no quadro do Reel (sem a aproximação)"""
    if j not in PELE:
        v, _ = src_p2_raw
        cr = v[j, 150:650, 150:470]
        cf = np.zeros((854, 480), np.float32); cf[150:650, 150:470] = confiancas(cr)['pele']
        PELE[j] = cv2.resize(cf, (1080, 1922), interpolation=cv2.INTER_LINEAR)[1:1921]
    return PELE[j]


def p2_quadro(fr, lt, k):
    """a aproximação lenta e a conversa na tela do celular (tempo local lt do plano 2, quadro k do Reel)"""
    j = min(len(RAST['quadros']) - 1, int(lt * 24 + 1e-6))
    q = np.array(RAST['quadros'][j], np.float64) * 2.2506 - np.array([0, 1.0])          # fonte → Reel (scale 1080:1922, crop y 1)
    z = 1.0                                                                               # V3: sem a aproximação (a leitura vai para a notificação ao lado)
    cx, cy = 735.0, 760.0                                                                 # o centro do celular no Reel
    A = np.array([[z, 0, cx * (1 - z)], [0, z, cy * (1 - z)]])
    fr = cv2.warpAffine(fr, A, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    pele = cv2.warpAffine(pele_p2(j), A, (W, H), flags=cv2.INTER_LINEAR)
    q = q * z + np.array([cx * (1 - z), cy * (1 - z)])
    ui = np.asarray(Image.open(os.path.join(ROOT, 'midia', 'tela-p2', f'{k:04d}.png')).convert('RGBA')).astype(np.float32)
    m = 0.03                                                                              # a conversa passa 3 % da borda (quem recorta é o branco da tela)
    Hm = cv2.getPerspectiveTransform(np.float32([[m * TW, m * TW], [TW * (1 - m), m * TW], [TW * (1 - m), TH - m * TW], [m * TW, TH - m * TW]]), np.float32(q))
    x0, y0 = np.floor(q.min(axis=0)).astype(int) - 14; x1, y1 = np.ceil(q.max(axis=0)).astype(int) + 14
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    T = np.array([[1, 0, -x0], [0, 1, -y0], [0, 0, 1]]) @ Hm
    uw = cv2.warpPerspective(ui, T, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    reg = fr[y0:y1, x0:x1].astype(np.float32)
    # o que está NA FRENTE da tela: as mãos (segmentação de pele, com a borda refinada na imagem) e o escuro (o recorte
    # da câmera e a borda do aparelho)
    lum = reg @ np.array([0.299, 0.587, 0.114], np.float32)
    maos = guiado(lum / 255.0, smooth(pele[y0:y1, x0:x1], 0.25, 0.75), r=5, eps=4e-4)
    frente = np.maximum(smooth(maos, 0.15, 0.85), 1 - smooth(lum, 70, 120))
    s = 1 - frente
    tela = s > 0.97
    branco = np.median(reg[tela & (lum > 200)], axis=0) if (tela & (lum > 200)).sum() > 100 else np.array([250, 242, 232], np.float32)
    # a luz da tela real (sombra dos polegares, reflexo), suavizada para não trazer o ruído de compressão
    L = cv2.GaussianBlur(np.clip(lum / (branco @ np.array([0.299, 0.587, 0.114], np.float32)), 0.5, 1.06), (0, 0), 4)[..., None]
    a = uw[..., 3:4] / 255.0
    ui = uw[..., :3] * L
    pura = ui                                                                              # tela inteira: só a conversa com a luz da tela
    mist = reg + s[..., None] * (ui - branco * L)                                           # borda do polegar: tira o branco, põe a conversa
    w_ = smooth(s, 0.80, 0.97)[..., None]
    novo = reg * (1 - a) + a * (w_ * pura + (1 - w_) * mist)
    fr = fr.copy(); fr[y0:y1, x0:x1] = np.clip(novo, 0, 255).astype(np.uint8)
    return fr, q


ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709',
                       '-color_trc', 'bt709', '-colorspace', 'bt709', out], stdin=subprocess.PIPE)
mapa = []
FUSAO = {45: 0.25, 46: 0.5, 47: 0.75}                     # quadros do Reel com fusão Seedance → Aurora
for k in range(total):
    t = k / FPS
    pl = next(p for p in LN['planos'] if p['t0'] - 1e-6 <= t < p['t1'] - 1e-6)
    lt = t - pl['t0'] + pl.get('ini', 0.0)                  # tempo local na fonte
    if pl['id'] == 'p1':
        vs, fs = src['p1s']; va, fa = src['p1a']
        js, ja = min(len(vs) - 1, int(lt * fs + 1e-6)), min(len(va) - 1, int(lt * fa + 1e-6))
        if k in FUSAO:
            a = FUSAO[k]; fr = (vs[js].astype(np.float32) * (1 - a) + va[ja].astype(np.float32) * a + 0.5).astype(np.uint8)
            mapa.append({'k': k, 'fonte': 'p1s+p1a', 'q': [js, ja], 'a': a})
        elif k < min(FUSAO):
            fr = vs[js]; mapa.append({'k': k, 'fonte': 'p1s', 'q': js})
        else:
            fr = va[ja]; mapa.append({'k': k, 'fonte': 'p1a', 'q': ja})
    elif pl['id'] == 'fim':                                 # V3: a tela final da marca (o fundo preto; o resto é da página)
        fr = np.full((H, W, 3), 10, np.uint8); mapa.append({'k': k, 'fonte': 'fim', 'q': None})
    else:
        v, fs = src[pl['id']]
        j = int(lt * fs + 1e-6)
        fim = pl.get('ultimo_quadro')
        if fim is not None and j > fim:                     # vai e volta: depois do último quadro bom, de trás para frente
            j = fim - (j - fim)
        j = min(len(v) - 1, j)
        fr = v[j]; mapa.append({'k': k, 'fonte': pl['id'], 'q': j})
        if pl['id'] == 'p2':
            fr, quad = p2_quadro(fr, lt, k); mapa[-1]['tela'] = [[round(float(a), 2) for a in c] for c in quad]
    fr = np.ascontiguousarray(fr)
    ff.stdin.write(fr.tobytes())
    Image.fromarray(fr).save(os.path.join(QD, f'{k:04d}.jpg'), quality=95, subsampling=0)
    if k == 44:
        from PIL import Image; Image.fromarray(np.ascontiguousarray(fr)).save(os.path.join(ROOT, 'midia', 'capa-quadro.png'))
ff.stdin.close(); ff.wait()
json.dump(mapa, open(os.path.join(ROOT, 'midia', 'base-quadros.json'), 'w'))
print('ok ->', out, total, 'quadros')
