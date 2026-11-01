#!/usr/bin/env python3
"""
A linha do tempo do Reel (V2): linha.json (planos, falas palavra por palavra no tempo do Reel, eventos da camada de
motion). Roda depois de scripts/alinha.py.

    python3 scripts/linha.py   -> linha.json
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAL = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'audio', 'palavras.json')))}
R = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'roteiro.json')))['clipes']}

planos = [
    {'id': 'p1', 't0': 0.0, 't1': 4.6},
    {'id': 'p2', 't0': 4.6, 't1': 9.1, 'ini': 0.0},
    {'id': 'p3', 't0': 9.1, 't1': 13.3, 'ini': 0.84},          # V2: 0,54 s mais tarde (a fonte tem 5,04 s; tira o resto de sorriso)
    {'id': 'p4', 't0': 13.3, 't1': 20.1, 'ini': 0.0},
    {'id': 'p5', 't0': 20.1, 't1': 29.6, 'ini': 0.0, 'ultimo_quadro': 193},   # 7,76 s + 1,74 s de trás para frente
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

essas = next(w for w in PAL['p4']['palavras'] if w['w'] == 'essas')['t0'] + OFF['p4']
p2, p3 = P['p2']['t0'], P['p3']['t0']
ev = {
    # P1: o gancho — a 1ª notificação já no quadro 0; mais duas em ~1,2 s; as de baixo recuam e viram "3 notificações"
    'notificacoes': [[0.0, 'O casal do chalé 3 chegou.'], [0.95, 'Ele disse que pagou o sinal. Pagou?'], [1.27, 'As cervejas vão em qual comanda?']],
    'agrupa': 2.95,
    'tremor': [0.0, 0.95, 1.27],
    'relogio': [[0.55, '14:20'], [round(p2 + 0.35, 3), '14:21'], [round(p3 + 0.30, 3), '14:23'], [round(p3 + 3.05, 3), '14:31']],
    'relogio_sai': p3 + 4.2,
    # P2: a conversa dentro do celular
    'chat_chega': round(p2 + 0.35, 3), 'chat_digita': round(p2 + 2.05, 3), 'chat_envia': round(p2 + 2.75, 3), 'chat_lido': round(p2 + 3.1, 3),
    'toques': [[round(p2 + 2.05, 3), round(p2 + 2.7, 3)]],
    # P3: a notificação ao lado do rosto e o "+6"
    'p3_notif': round(p3 + 0.30, 3), 'p3_pilha': round(p3 + 0.30 + 0.45 + 1.55, 3), 'p3_mais6': round(p3 + 3.05, 3),
    # P4: as perguntas atrás da cabeça (em "essas respostas") e o ponto de luz em "aqui"
    'perguntas': [[round(essas + 0.18 * i, 3), q] for i, q in enumerate(['Qual chave?', 'Pagou o sinal?', 'Qual comanda?', 'Quanto eu cobro?', '+6'])],
    'aqui': round(aqui, 3),
    # P5
    'fim_fala': round(fim_p5, 3),
    'cartao': round(fim_p5 + 1.0, 3), 'enviar': round(fim_p5 + 2.25, 3),
    'trilha_some': round(P['p5']['t0'] - 0.5, 3),
}
LN = {'duracao': planos[-1]['t1'], 'planos': planos, 'offsets': OFF, 'eventos': ev, 'frases': frases}
json.dump(LN, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(ev, ensure_ascii=False))
print('cartão final na tela:', round(LN['duracao'] - ev['cartao'], 2), 's')
