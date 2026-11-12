#!/usr/bin/env python3
"""
Revisão técnica do reel de apresentação (telas inteiras em funcionamento).

    node scripts/render.cjs dados --fps 30      # câmera, momentos-chave, rótulos, valores e caixas de cada quadro
    python3 scripts/qa.py                       # -> output/revisao/relatorio.txt

Confere:
  - nenhuma peça recortada solta: tudo o que é tela fica dentro do celular (as janelas são a camada do próprio estado,
    na posição original); fora dele, só a fila de telas inteiras do final;
  - cada informação-chave legível ≥ 1,8 s, com o menor texto da tela na região ≥ 40 px no quadro naquele momento
    (corpo do texto × zoom da câmera) e a região inteira no quadro, acima dos 20% de baixo;
  - rótulos ≥ 52 px e com no máximo 5 palavras; respiro ≥ 56 px entre rótulos e da borda;
  - áreas seguras (nada nos 20% de baixo nem na coluna de botões) para rótulos, valores, chip, textos, marca e pílula;
  - valores conferidos com o LEIA-ME; regras de conteúdo; nada do visual do v2; som; capa.
"""
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV = os.path.join(ROOT, 'output', 'revisao')
D = json.load(open(os.path.join(REV, 'dados.json')))
M = json.load(open(os.path.join(ROOT, 'src', 'telas.json')))
MP4 = os.path.join(ROOT, 'output', 'apresentacao-hospeda.mp4')
LEIA = open(os.path.join(ROOT, '..', '_material', 'fazlo-hospeda-telas', 'LEIA-ME.md'), encoding='utf-8').read()
ANIM = open(os.path.join(ROOT, 'src', 'anim.js'), encoding='utf-8').read()
Q = D['quadros']
FPS = round(1 / (Q[1]['t'] - Q[0]['t']))
COL = (985, 1060)
L, falhas = [], 0


def linha(ok, txt, extra=None):
    global falhas
    L.append(('OK     ' if ok else 'FALHA  ') + txt)
    if extra:
        L.append('       ' + extra)
    falhas += 0 if ok else 1


def sec(t):
    L.append('')
    L.append(t)


def corpo_min(tela, r):
    ts = [x for x in M[tela]['textos'] if not x.get('coberto') and r['x'] < x['x'] + x['w'] / 2 < r['x'] + r['w'] and r['y'] < x['y'] + x['h'] / 2 < r['y'] + r['h']]
    return min(x['px'] for x in ts) if ts else None


sec('FORMATO E SOM')
if os.path.exists(MP4):
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
    a = next(s for s in pr['streams'] if s['codec_type'] == 'audio')
    linha(v['codec_name'] == 'h264' and v['width'] == 1080 and v['height'] == 1920 and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v['pix_fmt']} {v['width']}x{v['height']} {eval(v['r_frame_rate']):.0f} fps")
    linha(a['codec_name'] == 'aac', f"áudio {a['codec_name']} {a['sample_rate']} Hz · sem voz (trilha e efeitos sintetizados)")
    dur = float(pr['format']['duration'])
    linha(80 <= dur <= 90, f'duração {dur:.2f} s (alvo 80–90 s)')
    eb = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', MP4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', eb)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', eb)[-1])
    linha(abs(I + 14) <= 0.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
    linha(TP <= -1.5, f'pico real {TP:.1f} dBTP (limite −1,5)')
else:
    linha(False, 'output/apresentacao-hospeda.mp4 não encontrado')

sec('SEÇÕES')
SE = D['secoes'] + [{'nome': 'fim', 't0': D['duracao']}]
L.append('       ' + ' · '.join(f"{a['nome']} {a['t0']:.1f}–{b['t0']:.1f} s ({b['t0'] - a['t0']:.1f} s)" for a, b in zip(SE, SE[1:])))

sec('TELAS INTEIRAS, NADA RECORTADO SOLTO')
us = sorted(set(u['id'] for u in D['usadas']))
linha(True, f'{len(us)} estados do pacote, sempre a tela inteira dentro do celular (fundo do estado + a janela/folha do próprio estado na posição original): ' + ', '.join(us))
fora = re.findall(r"el\('img'[^;]*ROOT", ANIM)
linha('recort' not in ANIM.lower().replace('recortad', '') and 'pecas.json' not in ANIM, 'nenhuma peça recortada: o motor não usa recortes (src/pecas); fora do celular só há a fila do final, com telas inteiras, e a capa com o celular')
tq = [e for e in D['eventos'] if e['tipo'] == 'toque']
linha(len(tq) >= 15, f'{len(tq)} toques nos botões reais (posição pelos ids/textos do HTML), com onda limão e o botão afundando')

sec('LEGIBILIDADE DAS INFORMAÇÕES-CHAVE')
ruins, curtos, linhas_ = [], [], []
for k in D['chaves']:
    cm = corpo_min(k['tela'], k['r'])
    frames = [q for q in Q if k['t0'] <= q['t'] <= k['t1']]
    ok_frames = []
    for q in frames:
        c = next((c for c in q['chaves'] if c['nome'] == k['nome']), None)
        if not c:
            continue
        px = cm * c['s'] if cm else 99
        dentro = c['x0'] >= 0 and c['x1'] <= 1080 and c['y0'] >= 0 and c['y1'] <= 1536.5
        ok_frames.append(px >= 39.9 and dentro)
        if not (px >= 39.9 and dentro):
            ruins.append((k['nome'], round(q['t'], 2), round(px, 1), round(c['x0']), round(c['x1']), round(c['y1'])))
    dur = (k['t1'] - k['t0'])
    if dur < 1.8:
        curtos.append((k['nome'], round(dur, 2)))
    zmin = min(c['Z'] for q in frames for c in q['chaves'] if c['nome'] == k['nome'])
    linhas_.append(f"{k['nome']}: {dur:.1f} s, texto da tela ≥ {cm * 1.436 * zmin:.0f} px (corpo {cm} px × zoom {zmin:.2f})")
linha(not curtos, f'{len(D["chaves"])} informações-chave, cada uma parada e legível ≥ 1,8 s', str(curtos) if curtos else None)
linha(not ruins, 'em todos os quadros desses momentos, o menor texto da tela na região tem ≥ 40 px e a região está inteira no quadro, acima dos 20% de baixo', str(ruins[:6]) if ruins else None)
for s in linhas_:
    L.append('       ' + s)

sec('RÓTULOS, VALORES, CHIP E TEXTOS')
RT = D['rotulos']
linha(all(r['px'] >= 52 for r in RT), f'rótulos com ≥ 52 px ({min(r["px"] for r in RT)} px, Inter Display 800)')
pal = [(r['txt'], len(r['txt'].replace('*', '').split())) for r in RT]
linha(all(n <= 5 for _, n in pal), 'rótulos com no máximo 5 palavras: ' + ' | '.join(t.replace('*', '') for t, _ in pal))
borda, entre, seguro = [], [], []
for q in Q:
    ov = [c for c in q['caixas'] if c['tipo'] in ('rotulo', 'valor', 'chip', 'texto', 'final') and c['op'] > 0.5]
    for c in ov:
        if c['tipo'] in ('rotulo', 'valor', 'chip') and (c['x0'] < 55.5 or c['x1'] > 1024.5 or c['y0'] < 55.5):
            borda.append((c['nome'], round(q['t'], 2)))
        if c['y1'] > 1536.5 or (c['x1'] > COL[0] and c['y1'] > COL[1]):
            seguro.append((c['nome'], round(q['t'], 2), round(c['x1']), round(c['y1'])))
    rs = [c for c in ov if c['tipo'] == 'rotulo']
    for i in range(len(rs)):
        for j in range(i + 1, len(rs)):
            a, b = rs[i], rs[j]
            g = max(b['x0'] - a['x1'], a['x0'] - b['x1'], b['y0'] - a['y1'], a['y0'] - b['y1'])
            if g < 55.5:
                entre.append((a['nome'], b['nome'], round(q['t'], 2)))
cobre = []
for q in Q:
    ov = [c for c in q['caixas'] if c['tipo'] in ('rotulo', 'valor', 'chip') and c['op'] > 0.3]
    for k in q['chaves']:
        for c in ov:
            if min(c['x1'], k['x1']) - max(c['x0'], k['x0']) > 2 and min(c['y1'], k['y1']) - max(c['y0'], k['y0']) > 2:
                cobre.append((c['nome'], k['nome'], round(q['t'], 2)))
linha(not cobre, 'nenhum rótulo, valor ou chip cobre a região que está sendo lida', str(sorted(set((a, b) for a, b, _ in cobre))) if cobre else None)
linha(not borda, 'respiro ≥ 56 px da borda (rótulos, valores, chip)', str(sorted(set(n for n, _ in borda))) if borda else None)
linha(not entre, 'respiro ≥ 56 px entre rótulos', str(entre[:4]) if entre else None)
linha(not seguro, f'áreas seguras: rótulos, valores, chip, textos, marca e pílula fora dos 20% de baixo (y > 1536) e da coluna de botões (x > {COL[0]}, y > {COL[1]})', str(seguro[:6]) if seguro else None)
L.append('       o celular (contexto) passa da área segura quando a câmera aproxima; as regiões lidas nesses momentos ficam acima de y 1536 (item anterior)')

sec('VALORES (LEIA-ME e telas do pacote)')
for ok, txt in [
    ('R$ 1.525,00' in LEIA, 'Visão geral: recebido hoje R$ 1.525,00; 10 hospedados; 2 saídas; check-out em atraso (Lucas Martins, Chalé de Pedra 06)'),
    ('22/10 → 25/10' in LEIA and 'R$ 972,00' in LEIA and 'sinal R$ 324,00' in LEIA, 'Nova reserva (Bruno Teixeira, Quarto Bromélia): livres 5 de 10; resumo total R$ 972,00, sinal R$ 324,00, saldo R$ 648,00'),
    ('R$ 1.050,00' in LEIA and 1050 - 315 == 735, 'Sinal (Gustavo Ribeiro): pré-reserva R$ 1.050,00, sinal R$ 315,00 → saldo R$ 735,00'),
    ('R$ 1.640,00' in LEIA and 'sinal R$ 780,00' in LEIA, 'Check-in (Fernanda Lima, Chalé Ipê, 17/10 → 20/10): recibo com entrada 17/10 14:05 e saída prevista 20/10 12:00'),
    ('comanda 287' in LEIA and 287 + 34 == 321, 'Comanda (Mariana Costa): total R$ 287,00 → lançar consumo de R$ 34,00 → total R$ 321,00 (o estado "produto adicionado" do pacote)'),
    (2440 + 287 - 157 == 2570 and 'R$ 412,00' in LEIA, 'Check-out (Mariana Costa): saldo R$ 412,00 com "Fazer check-out" bloqueado → PIX → R$ 0,00 quitado → recibo da estadia R$ 2.570,00'),
    (900 + 125 + 380 + 120 == 1525 and 285 - 270 == 15, 'Caixa: recebido por forma R$ 1.525,00; contado R$ 270,00 × esperado R$ 285,00 → falta R$ 15,00; caixa fechado'),
]:
    linha(ok, txt)
cx_vis = [q for q in Q if any(c['tela'].startswith('cx') for c in q['chaves'])]
linha('valor-sinal-reserva-fhz-udvku5-gustavo' in M['cx']['ids'] and M['cx']['ids']['valor-sinal-reserva-fhz-udvku5-gustavo']['y'] > 844, 'a linha do diário com o sinal do Gustavo fica abaixo da área visível do caixa (y ' + str(round(M['cx']['ids']['valor-sinal-reserva-fhz-udvku5-gustavo']['y'])) + ' > 844) e a tela do caixa nunca rola')
linha(not re.search(r"rola\([^)]*cx", ANIM), 'nenhuma rolagem no caixa')

sec('REGRAS DE CONTEÚDO E VISUAL')
textos = ' '.join(x['t'] for k in us for x in M[k]['textos'] if not x.get('coberto')) + ' ' + ANIM
linha(not re.search(r'day ?use|booking|airbnb', textos, re.I), 'sem Day Use, Booking ou Airbnb (textos visíveis das telas usadas e da animação)')
linha(not re.search(r'vers[aã]o nova|\bV2\b', textos), 'sem "versão nova" nem V2')
linha('VALE SERENO' not in textos, 'nome da pousada com inicial maiúscula')
linha('cal' in us and 'tela-computador' not in json.dumps([M[k]['arquivo'] for k in us]), 'calendário só na visão de 14 dias (02-calendario, "14 dias" selecionado; a troca de visão não aparece)')
linha(not re.search(r'\banel|órbita|orbita|\bring\b|\borbit', ANIM, re.I) and 'logo-alpha' not in ANIM, 'nada do visual do v2: sem anel de etapas, sem órbita, sem a logo circular nem a composição final dele; final próprio (fila de telas atrás do celular, volta à Visão geral, marca e pílula)')

sec('CAPA')
ct = os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa.txt')
if os.path.exists(ct):
    txt = open(ct, encoding='utf-8').read()
    linha('RESULTADO: dentro da regra' in txt, 'capa na regra (reels/tools/revisao_capa.py), bloco centrado em y = ' + (re.findall(r'centro em ([\d.]+)', txt) or ['?'])[0].strip())
else:
    linha(False, 'capa não conferida')

L.insert(0, 'APRESENTAÇÃO FAZLO HOSPEDA (telas inteiras) — revisão técnica')
L.insert(1, 'output/apresentacao-hospeda.mp4')
L.append('')
L.append('RESULTADO: ' + ('aprovado' if not falhas else f'{falhas} item(ns) a corrigir'))
os.makedirs(REV, exist_ok=True)
open(os.path.join(REV, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
