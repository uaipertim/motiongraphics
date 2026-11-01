#!/usr/bin/env python3
"""
A linha do tempo do Reel (V2): linha.json (planos, falas palavra por palavra no tempo do Reel, eventos da camada de
motion). Roda depois de scripts/alinha.py.

    python3 scripts/linha.py   -> linha.json
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAL = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'audio', 'palavras.json')))}
RAST = json.load(open(os.path.join(ROOT, 'midia', 'rastreio-p2.json')))          # (scripts/rastreio.py: os toques dos polegares)
R = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'roteiro.json')))['clipes']}

EM = json.load(open(os.path.join(ROOT, 'midia', 'emenda-p5.json')))                   # (scripts/emenda_p5.py)
P1_INI = 0.6                                                                            # V4: P1 0,6 s mais tarde (a fala em ~1,0 s)
_d = [('p1', 5.0 - P1_INI), ('p2', 4.5), ('p3', 4.2), ('p4', 6.8), ('p5', EM['duracao_p5'])]
planos, _t = [], 0.0
for pid, d in _d:
    planos.append({'id': pid, 't0': round(_t, 3), 't1': round(_t + d, 3)}); _t += d
planos[0]['ini'] = P1_INI                                                               # Seedance até 1,5 s do clipe, Aurora depois
planos[1]['ini'] = 0.0
planos[2]['ini'] = 0.84                                                                 # V2: tira o resto de sorriso do começo
planos[3]['ini'] = 0.0
planos[4].update({'ini': 0.0, 'emenda': {k: EM[k] for k in ('principal_ate', 'reserva_de', 'reserva_ate', 'fusao_quadros')}})   # V4: principal → reserva
P = {p['id']: p for p in planos}
OFF = {'p1': -P1_INI, 'p4': P['p4']['t0'], 'p5': P['p5']['t0']}      # onde cada fala começa no Reel (a voz é a do próprio clipe)

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
    # V4: uma notificação legível por vez; as seguintes substituem a anterior no mesmo lugar (pilha) e a pílula conta
    'notificacoes': [[0.0, 'O casal do chalé 3 chegou.'], [1.38, 'Ele disse que pagou o sinal. Pagou?'], [2.5, 'As cervejas vão em qual comanda?']],
    'tremor': [0.0, 1.38, 2.5],
    'relogio': [[2.0, '14:20'], [round(p2 + 0.25, 3), '14:21'], [round(p3 + 0.30, 3), '14:23'], [round(p3 + 2.30 + 6 * 0.16, 3), '14:31']],
    'relogio_sai': round(P['p3']['t1'], 3),
    # P2: a conversa dentro do celular (modo claro, teclado) + a notificação de vidro grande ao lado, para a leitura
    'chat_chega': round(p2 + 0.25, 3), 'p2_notif': round(p2 + 0.25, 3),            # a mesma mensagem: no aparelho e, legível, ao lado
    'digitar': [[round(p2 + 0.62, 3), round(p2 + 1.2, 3)], [round(p2 + 2.1, 3), round(p2 + 2.6, 3)]],
    'teclas': [[round(p2 + t, 3), lado] for t, lado, _ in RAST['toques'] if 0.62 <= t <= 1.2 or 2.1 <= t <= 2.6],
    'chat_envia': round(p2 + 2.75, 3), 'chat_lido': round(p2 + 3.1, 3),
    # P3: a notificação ao lado do rosto e o "+6"
    'p3_notif': round(p3 + 0.30, 3), 'p3_pilha': round(p3 + 2.30, 3), 'p3_conta': [round(p3 + 2.30 + 0.16 * (i + 1), 3) for i in range(6)],
    # P4: as perguntas atrás da cabeça (em "essas respostas") e o ponto de luz em "aqui"
    'perguntas': [[round(essas + 0.4 * i, 3), q] for i, q in enumerate(['Qual chave?', 'Pagou o sinal?', 'Quanto eu cobro?'])],
    'perguntas_param': round(essas + 0.4 * 2 + 0.6, 3), 'perguntas_saem': round(P['p4']['t1'] - 0.36, 3),
    'aqui': round(aqui, 3),
    # P5
    'fim_fala': round(fim_p5, 3),
    'cartao': round(fim_p5 + 0.5, 3), 'enviar': round(fim_p5 + 0.5 + 1.2, 3),            # V4: o cartão sobre a imagem dela
    'trilha_some': round(P['p5']['t0'] - 0.5, 3),
}
LN = {'duracao': planos[-1]['t1'], 'planos': planos, 'offsets': OFF, 'eventos': ev, 'frases': frases}
json.dump(LN, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(ev, ensure_ascii=False))
print('cartão final na tela:', round(LN['duracao'] - ev['cartao'], 2), 's')
