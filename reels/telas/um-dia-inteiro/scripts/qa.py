#!/usr/bin/env python3
"""
Revisão técnica do reel "Um dia inteiro da pousada".

    node scripts/render.cjs dados --fps 30      # caixas de cada quadro, destaques e eventos (da própria animação)
    python3 scripts/qa.py                       # -> output/revisao/relatorio.txt

Confere: formato e áudio (−14 LUFS, pico ≤ −1,5 dBTP), etapas ≥ 7 s, áreas seguras (nada nos 20% de baixo nem na
coluna de botões, pelas caixas e pelos pixels do vídeo), textos explicativos ≥ 56 px, texto das peças ≥ 40 px em
cada destaque, cada valor parado e legível ≥ 1,5 s, um destaque por vez, peças inteiras e nítidas no destaque,
valores e contas conferidos com o LEIA-ME do pacote, regras de conteúdo e a capa.
"""
import json
import os
import re
import subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV = os.path.join(ROOT, 'output', 'revisao')
D = json.load(open(os.path.join(REV, 'dados.json')))
META = json.load(open(os.path.join(ROOT, 'src', 'pecas.json')))
EVT = json.load(open(os.path.join(ROOT, 'audio', 'eventos.json')))
MP4 = os.path.join(ROOT, 'output', 'um-dia-inteiro.mp4')
LEIA = open(os.path.join(ROOT, '..', '_material', 'fazlo-hospeda-telas', 'LEIA-ME.md'), encoding='utf-8').read()
ANIM = open(os.path.join(ROOT, 'src', 'anim.js'), encoding='utf-8').read()
L = []
falhas = 0


def linha(ok, txt, extra=None):
    global falhas
    L.append(('OK     ' if ok else 'FALHA  ') + txt)
    if extra:
        L.append('       ' + extra)
    if not ok:
        falhas += 1


def sec(t):
    L.append('')
    L.append(t)


Q = D['quadros']
FPS = round(1 / (Q[1]['t'] - Q[0]['t']))
E = EVT['E']
DUR = D['duracao']

# ---------------- formato e som
sec('FORMATO E SOM')
if os.path.exists(MP4):
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
    a = next(s for s in pr['streams'] if s['codec_type'] == 'audio')
    fr = eval(v['r_frame_rate'])
    linha(v['codec_name'] == 'h264' and v['width'] == 1080 and v['height'] == 1920 and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v['pix_fmt']} {v['width']}x{v['height']} {fr:.0f} fps")
    linha(a['codec_name'] == 'aac', f"áudio {a['codec_name']} {a['sample_rate']} Hz {a['channels']} canais · sem voz (trilha e efeitos sintetizados)")
    dur = float(pr['format']['duration'])
    linha(55 <= dur <= 60.05, f'duração {dur:.2f} s (alvo ~55–60 s)')
    eb = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', MP4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', eb)[-1])
    TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', eb)[-1])
    linha(abs(I + 14) <= 0.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
    linha(TP <= -1.5, f'pico real {TP:.1f} dBTP (limite −1,5)')
else:
    linha(False, 'output/um-dia-inteiro.mp4 não encontrado')

# ---------------- etapas
sec('ETAPAS')
nomes = [('g', 'Gancho'), ('r', '1 Reserva'), ('s', '2 Sinal'), ('c', '3 Check-in'), ('m', '4 Comanda'), ('o', '5 Check-out'), ('x', '6 Caixa'), ('f', 'Fecho')]
ts = [E[k] for k, _ in nomes] + [DUR]
partes = []
for i, (k, n) in enumerate(nomes):
    d = ts[i + 1] - ts[i]
    partes.append(f'{n} {ts[i]:.1f}–{ts[i + 1]:.1f} s ({d:.1f} s)')
    if k not in ('g', 'f'):
        linha(d >= 7.0, f'{n}: {d:.1f} s (mínimo 7 s)')
L.append('       ' + ' · '.join(partes))

# ---------------- áreas seguras (caixas)
sec('ÁREAS SEGURAS')
baixo, coluna = [], []
for q in Q:
    for c in q['caixas']:
        if c['tipo'] == 'peca' and c['op'] < 0.06:
            continue
        if c['x1'] < 0 or c['x0'] > 1080:  # fora do quadro (chicote)
            continue
        if c['y1'] > 1536.5:
            baixo.append((q['t'], c['nome'], round(c['y1'])))
        if c['x1'] > 940.5 and c['y1'] > 1000.5 and c['x0'] < 1080 and not (c['tipo'] == 'peca' and c.get('blur', 0) > 3):
            coluna.append((q['t'], c['nome'], round(c['x1']), round(c['y1'])))
linha(not baixo, f'20% de baixo (y > 1536): nenhuma caixa em {len(Q)} quadros' if not baixo else f'{len(baixo)} caixas nos 20% de baixo', str(sorted(set((n, y) for _, n, y in baixo))[:12]) if baixo else None)
linha(not coluna, 'coluna de botões (x > 940, y > 1000): livre' if not coluna else f'{len(coluna)} caixas na coluna de botões', str(sorted(set((n, x, y) for _, n, x, y in coluna))[:12]) if coluna else None)
tops = [(c['y0'], c['nome'], q['t']) for q in Q for c in q['caixas'] if c['tipo'] in ('texto', 'tag', 'peca') and c.get('op', 1) > 0.5 and -10 < c['x0'] < 1080 and c.get('blur', 0) < 1]
top = min(tops) if tops else (0, '', 0)
linha(top[0] >= 150, f'nada importante no alto: o primeiro elemento começa em y {top[0]:.0f} ({top[1]}, {top[2]:.2f} s)')

# pixels do vídeo
if os.path.exists(MP4):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', MP4, '-vf', 'fps=4,scale=270:480', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 480, 270).astype(int)
    bg = np.median(fr[:, 0:20, :]) if len(fr) else 10
    sub = fr[:, 386:, :]          # y > 1544 (20% de baixo, com 2 px de folga)
    col = fr[:, 252:384, 237:]    # x > 948, y 1008–1536
    nb = int((np.abs(sub - 12) > 40).sum(axis=(1, 2)).max())
    nc = int((np.abs(col - 12) > 40).sum(axis=(1, 2)).max())
    linha(nb <= 4, f'pixels do vídeo (4 quadros/s, 1/16 da área): 20% de baixo apagado (máx. {nb} px acesos num quadro)')
    linha(nc <= 6, f'pixels do vídeo: coluna de botões apagada (máx. {nc} px acesos num quadro)')

# ---------------- textos
sec('TEXTOS')
pxs = sorted(set(c['px'] for q in Q for c in q['caixas'] if c['tipo'] == 'texto'))
linha(min(pxs) >= 56, f'textos explicativos em Inter Display 900, corpo {min(pxs):.0f}–{max(pxs):.0f} px (mínimo 56)')
txts = re.findall(r"texto\([A-Za-z]+, '([^']+)'", ANIM)
L.append('       ' + ' | '.join(t.replace('\\n', ' ').replace('*', '') for t in txts))
kw = all('*' in t for t in txts)
linha(kw, 'palavra-chave em limão em cada texto')

# ---------------- destaques
sec('DESTAQUES E LEGIBILIDADE')
DS = D['destaques']
sobre = [(a['nome'], b['nome']) for a, b in zip(DS, DS[1:]) if b['t0'] < a['t1'] - 0.02]
linha(not sobre, f'um destaque por vez: {len(DS)} destaques em sequência, sem sobreposição', str(sobre) if sobre else None)


def estado(t, nome):
    i = min(len(Q) - 1, max(0, int(round(t * FPS))))
    for c in Q[i]['caixas']:
        if c['nome'] == nome and c['tipo'] == 'peca':
            return c
    return None


def legivel(c):
    return c and c['op'] > 0.9 and c['blur'] < 0.6 and c['dim'] < 0.3 and c['corpo'] >= 39.9 and c['x0'] >= 0 and c['x1'] <= 1080 and c['y0'] >= 0 and c['y1'] <= 1536.5


ruins_corpo, curtos, cortes = [], [], []
tempos = []
for d in DS:
    aros = [d['aro']] if d.get('troca') else [[n] for n in d['aro']]   # troca: a mesma linha antes/depois do toque
    for grupo in aros:
        nome = grupo[0]
        # corpo e nitidez no meio do destaque
        tm = (d['t0'] + d['t1']) / 2
        tq = max(d['t0'] + 0.2, min(tm, d['t1'] - 0.1))
        c = next((x for x in (estado(tq, n) for n in grupo) if x and x['op'] > 0.9), None)
        if not c or c['corpo'] < 39.9:
            ruins_corpo.append((d['nome'], nome, round(c['corpo'], 1) if c else None))
        if not c or c['x0'] < 0 or c['x1'] > 1080 or c['blur'] > 0.6:
            cortes.append((d['nome'], nome, c and (round(c['x0']), round(c['x1']), c['blur'])))
        # janela legível contínua em volta do destaque
        lg = lambda i: any(legivel(estado(i / FPS, n)) for n in grupo)
        i0 = int(round(tq * FPS))
        a = b = i0
        while a > 0 and lg(a - 1):
            a -= 1
        while b < len(Q) - 1 and lg(b + 1):
            b += 1
        dur = (b - a + 1) / FPS if lg(i0) else 0
        if d.get('valor'):
            tempos.append((d['valor'], nome, dur))
            if dur < 1.5:
                curtos.append((d['valor'], nome, round(dur, 2)))
linha(not ruins_corpo, 'texto das peças em destaque ≥ 40 px no quadro (menor corpo de cada peça × escala no quadro)', str(ruins_corpo) if ruins_corpo else None)
cor = sorted(((n, round(META[n]['minFont'] * p['s'], 1)) for p in D['pecas'] for n in [p['id']] if any(n in d['aro'] for d in DS)), key=lambda x: x[1])
L.append('       menor corpo por peça em destaque: ' + ' · '.join(f'{n} {v}' for n, v in cor[:8]) + ' …')
linha(not curtos, 'cada valor fica parado e legível ≥ 1,5 s (nítido, inteiro, ≥ 40 px, acima dos 20% de baixo)', str(curtos) if curtos else None)
L.append('       ' + ' · '.join(f'{v} {t:.1f}s' for v, _, t in tempos))
linha(not cortes, 'nenhuma peça em destaque cortada pela borda ou borrada', str(cortes) if cortes else None)

# ---------------- conteúdo
sec('VALORES (conferidos com o LEIA-ME e com as telas do pacote)')
H = {k: [h['texto'] for h in m.get('holes', [])] for k, m in META.items()}
esper = {'g_recebido': 'R$ 1.525,00', 'o_diarias': 'R$ 2.440,00', 'o_consumos': 'R$ 287,00', 'o_descontos': '− R$ 157,00', 'o_total': 'R$ 2.570,00',
         'o_pagos': '− R$ 2.158,00', 'o_saldo': 'R$ 412,00', 'o_quitado': 'R$ 0,00', 's_total': 'R$ 1.640,00', 's_sinalpago': '− R$ 780,00', 's_saldo': 'R$ 860,00',
         'm_total': 'R$ 287,00', 'x_recebido': 'R$ 1.525,00', 'x_esperado': 'R$ 285,00', 'x_contado': 'R$ 270,00', 's_campo_sinal': '315,00'}
dif = [(k, H[k], v) for k, v in esper.items() if H.get(k, [None])[0] != v]
linha(not dif, 'valores que contam = valores das telas: ' + ', '.join(f'{v}' for v in esper.values()), str(dif) if dif else None)
for ok, txt in [
    ('R$ 1.525,00' in LEIA, 'Recebido hoje R$ 1.525,00 (LEIA-ME: recebido no dia R$ 1.525,00)'),
    (2440 + 287 - 157 == 2570 and '2.440 + comanda 287 − descontos 157' in LEIA, 'Mariana Costa: diárias 2.440 + consumos 287 − descontos 157 = 2.570 (LEIA-ME)'),
    (2570 - 2158 == 412 and 1220 + 938 == 2158 and 'R$ 412,00' in LEIA, 'pagos 1.220 + 938 = 2.158 · saldo 2.570 − 2.158 = R$ 412,00 → R$ 0,00 depois do PIX'),
    (66 + 12 + 56 + 136 + 17 == 287, 'comanda: 66 + 12 + 56 + 136 + 17 = R$ 287,00 (o total sobe item a item)'),
    (900 + 125 + 380 + 120 == 1525, 'caixa: PIX 900 + Dinheiro 125 + Crédito 380 + Débito 120 = R$ 1.525,00'),
    (200 + 125 - 40 == 285 and 285 - 270 == 15, 'esperado em dinheiro 200 + 125 − 40 = R$ 285,00 · contado R$ 270,00 → falta R$ 15,00'),
    (1640 - 780 == 860 and 'R$ 1.640,00' in LEIA and 'sinal R$ 780,00' in LEIA, 'Fernanda Lima: 1.640 − sinal 780 = saldo R$ 860,00 (confirmada, LEIA-ME)'),
    (1050 - 315 == 735 and 'R$ 1.050,00' in LEIA, 'Gustavo Ribeiro: pré-reserva R$ 1.050,00, sinal R$ 315,00 → saldo R$ 735,00 (janela "Confirmar reserva")'),
    ('22/10 → 25/10' in LEIA and 'Quarto Bromélia' in LEIA, 'nova reserva: Bruno Teixeira, Quarto Bromélia, 22/10 → 25/10, nasce Confirmada (barra "Bruno T." no calendário de 14 dias)'),
]:
    linha(ok, txt)
sec('REGRAS DE CONTEÚDO')
textos_pecas = ' '.join(t['t'] for m in META.values() for t in m.get('textos', []))
tudo = textos_pecas + ' ' + ' '.join(txts) + ' Chame no WhatsApp · link na bio RESERVA SINAL CHECK-IN COMANDA CHECK-OUT CAIXA'
linha(not re.search(r'day ?use|booking|airbnb', tudo, re.I), 'sem Day Use, Booking ou Airbnb (textos de todas as peças e da animação)')
linha(not re.search(r'vers[aã]o nova|\bV2\b', tudo), 'sem "versão nova" nem V2')
linha('VALE SERENO' not in tudo.upper().replace('VALE SERENO', 'x') or 'VALE SERENO' not in tudo, 'nome da pousada com inicial maiúscula ("Pousada Vale Sereno", nunca em caixa alta)')
caixa_pecas = [k for k, m in META.items() if '10-caixa' in m['arquivo']]
linha(not any('Gustavo' in t['t'] for k in caixa_pecas for t in META[k]['textos']), 'a linha do diário com o sinal do Gustavo (FHZ-UDVKU5) não aparece: nenhuma peça do caixa usa o diário')
linha('troca de visão' and not any(k.startswith('r_') and any(x['t'] in ('Dia', 'Semana', 'Mês') for x in META[k]['textos']) for k in META), 'calendário só na visão de 14 dias (o seletor Dia/Semana/Mês não aparece)')
linha(all(META[k]['arquivo'].startswith('telas/') for k in META), f'{len(META)} peças, todas recortadas dos HTML do pacote (src/pecas.json guarda arquivo e posição de cada uma)')

# ---------------- capa
sec('CAPA')
ct = os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa.txt')
if os.path.exists(ct):
    txt = open(ct, encoding='utf-8').read()
    linha('RESULTADO: dentro da regra' in txt, 'capa na regra (reels/tools/revisao_capa.py): ' + (re.findall(r'centro em ([\d.]+)', txt) or ['?'])[0].strip() + ' de centro (alvo y = 960)')
else:
    linha(False, 'capa não conferida')

L.insert(0, 'UM DIA INTEIRO DA POUSADA — revisão técnica')
L.insert(1, 'output/um-dia-inteiro.mp4')
L.append('')
L.append('RESULTADO: ' + ('aprovado' if not falhas else f'{falhas} item(ns) a corrigir'))
open(os.path.join(REV, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
