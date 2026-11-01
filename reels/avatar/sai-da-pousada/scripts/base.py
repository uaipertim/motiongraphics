#!/usr/bin/env python3
"""
A base do Reel "Saí da pousada": os 5 planos aprovados em 1080×1920, 30 fps, um depois do outro, sem camada nem som.

    python3 scripts/base.py   -> midia/base-1080.mp4 (+ midia/base-quadros.json: de qual fonte e quadro vem cada quadro do Reel;
                                 midia/capa-quadro.png: o quadro 44, base da capa)

- Upscale lanczos com nitidez leve (unsharp 5×5 0,4), como no Reel da Dona Maria.
- 24/25 → 30 fps por repetição de quadro: o quadro do Reel no instante t é o quadro da fonte que está na tela nesse
  instante (floor(t·fps)); nada de interpolação, para não mexer na boca.
- P1: Seedance (plano1-base) de 0 a 1,5 s e Aurora (plano1-fala) a partir de 1,5 s, no MESMO relógio (a voz é a da
  Aurora desde 0 s). Alinhamento medido (SIFT + RANSAC no quadro de 1,5 s): o Seedance redimensionado para 448 px de
  largura casa com a Aurora com escala 1,04 e x −8,5 px (y 0). Fusão de 3 quadros (25 %, 50 %, 75 % de Aurora nos
  quadros 45, 46 e 47 do Reel).
- P5: zoom fixo de 114 % no rosto (janela 393×699 da fonte, x 27, y 0): é o menor zoom centrado que deixa de fora
  todos os quadros com o dedo no canto inferior direito (x ≥ 380, y ≥ 688 na fonte; ver output/revisao/relatorio.txt).
  Depois do quadro 193 (7,72 s; os seguintes da fonte repetem e pulam), o trecho em silêncio toca de trás para frente
  até o fim do plano (sem pulo e sem quadro congelado).
"""
import json, os, subprocess
import numpy as np

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
    else:
        v, fs = src[pl['id']]
        j = int(lt * fs + 1e-6)
        fim = pl.get('ultimo_quadro')
        if fim is not None and j > fim:                     # vai e volta: depois do último quadro bom, de trás para frente
            j = fim - (j - fim)
        j = min(len(v) - 1, j)
        fr = v[j]; mapa.append({'k': k, 'fonte': pl['id'], 'q': j})
    ff.stdin.write(np.ascontiguousarray(fr).tobytes())
    if k == 44:
        from PIL import Image; Image.fromarray(np.ascontiguousarray(fr)).save(os.path.join(ROOT, 'midia', 'capa-quadro.png'))
ff.stdin.close(); ff.wait()
json.dump(mapa, open(os.path.join(ROOT, 'midia', 'base-quadros.json'), 'w'))
print('ok ->', out, total, 'quadros')
