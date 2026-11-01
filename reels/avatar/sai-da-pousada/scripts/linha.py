#!/usr/bin/env python3
"""
A linha do tempo do Reel: linha.json (planos, falas palavra por palavra no tempo do Reel, eventos, o rastreio da tela do
celular no P2). Roda depois de scripts/alinha.py.

    python3 scripts/linha.py   -> linha.json
"""
import json, os, subprocess
import numpy as np
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAL = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'audio', 'palavras.json')))}
R = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'roteiro.json')))['clipes']}

planos = [
    {'id': 'p1', 't0': 0.0, 't1': 4.6},
    {'id': 'p2', 't0': 4.6, 't1': 9.1, 'ini': 0.0},
    {'id': 'p3', 't0': 9.1, 't1': 13.3, 'ini': 0.3},
    {'id': 'p4', 't0': 13.3, 't1': 20.1, 'ini': 0.0},
    {'id': 'p5', 't0': 20.1, 't1': 29.3, 'ini': 0.0, 'ultimo_quadro': 193},
]
P = {p['id']: p for p in planos}
OFF = {'p1': 0.0, 'p4': P['p4']['t0'], 'p5': P['p5']['t0']}      # onde cada fala começa no Reel (a voz é a do próprio clipe)

# as chaves em limão, por posição da palavra na fala
CHAVES = {'p1': {1, 2}, 'p4': {5, 15}, 'p5': {3, 4, 5}}
frases = []
for cid in ('p1', 'p4', 'p5'):
    c = PAL[cid]; k = -1; idx = 0
    for w in c['palavras']:
        if w['trecho'] != k:
            k = w['trecho']; frases.append({'clipe': cid, 'palavras': []})
        frases[-1]['palavras'].append({'w': w['w'], 't0': round(w['t0'] + OFF[cid], 3), 't1': round(w['t1'] + OFF[cid], 3),
                                       **({'chave': True} if idx in CHAVES[cid] else {})})
        idx += 1
fim_p5 = max(w['t1'] for w in PAL['p5']['palavras']) + OFF['p5']
aqui = next(w for w in PAL['p4']['palavras'] if w['w'].startswith('aqui'))['t0'] + OFF['p4']

# o rastreio da tela branca do celular no P2 (centro e cantos, no quadro do Reel: fonte ×2,25, y −1)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'midia', 'plano2.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, np.uint8).reshape(-1, 854, 480, 3).astype(int)
tela = []
for x in v:
    m = (x.min(axis=2) > 200) & ((x.max(axis=2) - x.min(axis=2)) < 30); m[:160] = False
    lab, n = ndimage.label(m); s = ndimage.sum(m, lab, range(1, n + 1)); ys, xs = np.nonzero(lab == int(np.argmax(s)) + 1)
    tela.append([float(np.percentile(xs, 50)), float(ys.min()), float(xs.min()), float(xs.max())])
tela = np.array(tela)
tela = ndimage.uniform_filter1d(tela, 5, axis=0, mode='nearest')          # sem tremido
tela_reel = [[round(cx * 2.25, 1), round(y0 * 2.25 - 1, 1), round(x0 * 2.25, 1), round(x1 * 2.25, 1)] for cx, y0, x0, x1 in tela]

p2, p3 = P['p2']['t0'], P['p3']['t0']
ev = {
    'ia': [0.0, 3.0],                       # o chip "Personagem criada com IA"
    'vibra': [0.35, 0.85],                  # 2 pulsos do anel (e a vibração) até 1,5 s
    'relogio': 1.25,                        # o chip "14:20 · fora da pousada"
    'balao1': round(p2 + 0.35, 3),          # sai da tela do celular
    'digitando': round(p2 + 2.05, 3),       # os polegares se mexem de 2,04 a 2,6 s no plano 2
    'toques': [[round(p2 + 2.05, 3), round(p2 + 2.6, 3)], [round(p2 + 4.2, 3), round(P['p2']['t1'], 3)]],
    'balao2': round(p3 + 0.30, 3),
    'mensagens': round(p3 + 0.30 + 0.45 + 1.6, 3),    # só depois de o balão 2 estar legível (entrada de 0,45 s) por 1,6 s
    'aqui': round(aqui, 3),
    'fim_fala': round(fim_p5, 3),
    'chamada': round(fim_p5 + 1.0, 3),
    'trilha_baixa': round(P['p5']['t0'] - 0.4, 3),
}
LN = {'duracao': 29.3, 'planos': planos, 'offsets': OFF, 'eventos': ev, 'frases': frases,
      'p2_tela': {'fps': 24, 't0': p2, 'quadros': tela_reel}}
json.dump(LN, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(ev, ensure_ascii=False))
print('chamada na tela:', round(LN['duracao'] - ev['chamada'], 2), 's')
