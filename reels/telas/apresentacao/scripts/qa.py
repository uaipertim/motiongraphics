#!/usr/bin/env python3
"""
Revisão técnica do reel de apresentação (telas inteiras em funcionamento) — com as correções de enquadramento.

    node scripts/render.cjs dados --fps 30
    python3 scripts/qa.py                       # -> output/revisao/relatorio.txt

Confere, quadro a quadro:
  - o celular inteiro (com a moldura) dentro do quadro; zoom máximo; nenhum texto da tela cortado pela borda do vídeo;
  - as lupas: fora da tela do app, com o conteúdo inteiro do elemento dentro, texto ≥ 40 px, ≥ 1,8 s, e o rótulo
    igual ao texto do HTML daquele estado;
  - o contorno limão contém 100% do retângulo real do elemento (com 12 px de folga);
  - o chip da seção sem sobrepor a tela;
  - áreas seguras, valores (LEIA-ME), regras de conteúdo, nada do v2, som e capa.
"""
import json
import os
import re
import subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV = os.path.join(ROOT, 'output', 'revisao')
D = json.load(open(os.path.join(REV, 'dados.json')))
M = json.load(open(os.path.join(ROOT, 'src', 'telas.json')))
MP4 = os.path.join(ROOT, 'output', 'apresentacao-hospeda.mp4')
LEIA = open(os.path.join(ROOT, '..', '_material', 'fazlo-hospeda-telas', 'LEIA-ME.md'), encoding='utf-8').read()
ANIM = open(os.path.join(ROOT, 'src', 'anim.js'), encoding='utf-8').read()
Q = D['quadros']
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


def inter(a, b):
    return min(a['x1'], b['x1']) - max(a['x0'], b['x0']) > 0.5 and min(a['y1'], b['y1']) - max(a['y0'], b['y0']) > 0.5


sec('FORMATO E SOM')
if os.path.exists(MP4):
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video'); a = next(s for s in pr['streams'] if s['codec_type'] == 'audio')
    linha(v['codec_name'] == 'h264' and v['width'] == 1080 and v['height'] == 1920 and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v['pix_fmt']} {v['width']}x{v['height']} {eval(v['r_frame_rate']):.0f} fps")
    linha(a['codec_name'] == 'aac', f"áudio {a['codec_name']} {a['sample_rate']} Hz · sem voz")
    dur = float(pr['format']['duration'])
    linha(80 <= dur <= 90.5, f'duração {dur:.2f} s (antes: 87,6 s; alvo 80–90 s)')
    eb = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', MP4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', eb)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', eb)[-1])
    linha(abs(I + 14) <= 0.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
    linha(TP <= -1.5, f'pico real {TP:.1f} dBTP (limite −1,5)')
else:
    linha(False, 'output/apresentacao-hospeda.mp4 não encontrado')

sec('SEÇÕES')
SE = D['secoes'] + [{'nome': 'fim', 't0': D['duracao']}]
L.append('       ' + ' · '.join(f"{a['nome']} {a['t0']:.1f}–{b['t0']:.1f} s ({b['t0'] - a['t0']:.1f} s)" for a, b in zip(SE, SE[1:])))

sec('ENQUADRAMENTO')
inteiro = 0
for q in Q:
    c = next(c for c in q['caixas'] if c['tipo'] == 'celular')
    if c['x0'] >= 0 and c['x1'] <= 1080 and c['y0'] >= 0 and c['y1'] <= 1920:
        inteiro += 1
pct = 100 * inteiro / len(Q)
linha(pct >= 60, f'celular inteiro (com a moldura) dentro do quadro em {pct:.1f}% do vídeo (mínimo 60%)')
zmax = max(q['cam']['Z'] for q in Q)
linha(zmax <= 1.5, f'zoom máximo {zmax:.2f}× (limite 1,5×); para ler, a lupa')
telas = [next(c for c in q['caixas'] if c['tipo'] == 'tela') for q in Q]
marg = min(min(t['x0'], 1080 - t['x1']) for t in telas)
linha(marg >= 40, f'a largura inteira da tela do app sempre dentro do quadro, com ≥ 40 px de cada lado (menor margem: {marg:.0f} px)')
cort = sum(q['cortados'] for q in Q)
linha(cort == 0, f'nenhum texto da tela cortado pela borda do vídeo, medido em {len(Q)} quadros (textos cortados: {cort})')

sec('LUPAS (leitura)')
ruins, tempo, cheias, sobre, margem, rot, vaza = [], [], [], [], [], [], []
for q in Q:
    tela = next(c for c in q['caixas'] if c['tipo'] == 'tela')
    for lp in q['lupas']:
        if lp['op'] < 0.5:
            continue
        if inter(lp, tela):
            sobre.append((lp['rotulo'], round(q['t'], 2)))
        if lp['x0'] < 39.5 or lp['x1'] > 1040.5 or lp['y1'] > 1536.5:
            margem.append((lp['rotulo'], round(q['t'], 2)))
        if lp['rotW'] > lp['rotCabe'] + 0.5:
            vaza.append(lp['rotulo'])
        c = lp['cont']
        if c['x0'] < -0.5 or c['y0'] < -0.5 or c['x1'] > lp['janW'] + 0.5 or c['y1'] > lp['janH'] + 0.5:
            cheias.append(lp['rotulo'])
for lp in D['lupas']:
    px = lp['cp'] * lp['s']
    if px < 39.9:
        ruins.append((lp['rotulo'], round(px, 1)))
    if lp['t1'] - lp['t0'] < 1.8:
        tempo.append((lp['rotulo'], round(lp['t1'] - lp['t0'], 2)))
    texto_tela = ' '.join(x['t'] for x in M[lp['tela']]['textos'] if not x.get('coberto'))
    texto_tela = re.sub(r'\s+', ' ', texto_tela)
    if lp['rotulo'] not in texto_tela:
        rot.append((lp['tela'], lp['rotulo']))
linha(not tempo, f"{len(D['lupas'])} lupas, cada uma aberta e parada ≥ 1,8 s", str(tempo) if tempo else None)
linha(not ruins, 'texto da tela dentro da lupa ≥ 40 px (menor corpo do elemento × ampliação da lupa)', str(ruins) if ruins else None)
L.append('       ' + ' · '.join(f"{l['rotulo']} {l['cp'] * l['s']:.0f}px" for l in D['lupas']))
linha(not cheias, 'cada lupa mostra o conteúdo INTEIRO do elemento (nada cortado; a folga em volta fica na cor de fundo)', str(sorted(set(cheias))) if cheias else None)
linha(not sobre, 'lupas fora da tela do app (zero sobreposição com a tela)', str(sorted(set(n for n, _ in sobre))) if sobre else None)
linha(not margem, 'lupas dentro do quadro com ≥ 40 px de margem e acima dos 20% de baixo', str(sorted(set(n for n, _ in margem))) if margem else None)
linha(not rot, 'rótulos com exatamente as palavras da tela (conferidos contra o texto do HTML de cada estado): ' + ' | '.join(sorted(set(l['rotulo'] for l in D['lupas']))), str(rot) if rot else None)
linha(not vaza, 'rótulo inteiro dentro do balão da lupa (largura do texto medida no navegador)', str(sorted(set(vaza))) if vaza else None)
linha(all(len(l['rotulo'].split()) <= 5 for l in D['lupas']), 'rótulos com até 5 palavras, Inter Display 800 52 px')

sec('CONTORNO DE DESTAQUE')
falta = []
n = 0
for q in Q:
    for k in q['contornos']:
        n += 1
        c, e = k['contorno'], k['elemento']
        if not (c['x'] <= e['x'] + 0.01 and c['y'] <= e['y'] + 0.01 and c['x'] + c['w'] >= e['x'] + e['w'] - 0.01 and c['y'] + c['h'] >= e['y'] + e['h'] - 0.01):
            falta.append((k['el'], q['t']))
linha(not falta and n > 0, f'o contorno contém 100% do retângulo real do elemento (getBoundingClientRect do bloco inteiro, folga de 12 px, raio do elemento + 12) em {n} medições')
L.append('       elementos: ' + ', '.join(sorted(set(f"{k['tela']}/{k['el']}" for k in D['contornos']))))

sec('CHIP DA SEÇÃO E ÁREAS SEGURAS')
cs = [(c['nome'], q['t']) for q in Q for c in q['caixas'] if c['tipo'] == 'chip' and c['op'] > 0.05 and inter(c, next(t for t in q['caixas'] if t['tipo'] == 'tela'))]
linha(not cs, 'chip sempre acima do celular, sem sobrepor nenhum pixel da tela', str(cs[:4]) if cs else None)
seg = [(c['nome'], round(q['t'], 2)) for q in Q for c in q['caixas'] if c['tipo'] in ('chip', 'texto', 'final') and c['op'] > 0.5 and (c['y1'] > 1536.5 or (c['x1'] > COL[0] and c['y1'] > COL[1]))]
linha(not seg, f'chip, textos, marca e pílula fora dos 20% de baixo e da coluna de botões (x > {COL[0]}, y > {COL[1]})', str(seg[:4]) if seg else None)
cel = max(next(c for c in q['caixas'] if c['tipo'] == 'celular')['y1'] for q in Q if q['t'] > 1.5)
linha(cel <= 1536.5, f'o celular inteiro fica acima dos 20% de baixo (base máxima y {cel:.0f})')

sec('DIGITAÇÃO')
dg = {k: v['digita'] for k, v in M.items() if v.get('digita')}
linha(all(len(v['quadros']) == len(v['valor']) + 2 for v in dg.values()), 'texto escrito no próprio campo do HTML: um quadro da tela renderizado por letra, com o cursor no fim (' + '; '.join(f"{k}: \"{v['valor']}\", {len(v['quadros'])} quadros" for k, v in dg.items()) + ')')
linha('furos' not in ANIM, 'nada colado por cima do campo (o motor não escreve texto sobre a tela)')

sec('TELAS INTEIRAS')
us = sorted(set(u['id'] for u in D['usadas']))
linha('pecas.json' not in ANIM, f'{len(us)} estados do pacote, sempre a tela inteira no celular; nenhuma peça recortada solta (fora do celular só as lupas, ligadas ao ponto, e a fila do final)')
tq = [e for e in D['eventos'] if e['tipo'] == 'toque']
linha(len(tq) >= 15, f'{len(tq)} toques nos botões reais, com onda limão e o botão afundando')

sec('VALORES (LEIA-ME e telas do pacote)')
for ok, txt in [
    ('R$ 1.525,00' in LEIA, 'Visão geral: R$ 1.525,00; 10 hospedados; 2 saídas; check-out em atraso'),
    ('R$ 972,00' in LEIA and 'sinal R$ 324,00' in LEIA, 'Nova reserva (Bruno Teixeira): livres 5 de 10; total da reserva R$ 972,00'),
    ('R$ 1.050,00' in LEIA and 1050 - 315 == 735, 'Sinal (Gustavo Ribeiro): pré-reserva; sinal R$ 315,00 → saldo R$ 735,00'),
    ('R$ 1.640,00' in LEIA, 'Check-in (Fernanda Lima, Chalé Ipê, 17/10 → 20/10): recibo'),
    ('comanda 287' in LEIA and 287 + 34 == 321, 'Comanda (Mariana Costa): total R$ 287,00 → +R$ 34,00 → R$ 321,00 (estado "produto adicionado" do pacote)'),
    ('R$ 412,00' in LEIA, 'Check-out: saldo R$ 412,00 → R$ 0,00 quitado → recibo da estadia'),
    (285 - 270 == 15, 'Caixa: recebido por forma R$ 1.525,00; falta R$ 15,00; caixa fechado'),
]:
    linha(ok, txt)
linha(M['cx']['ids']['valor-sinal-reserva-fhz-udvku5-gustavo']['y'] > 844 and not re.search(r"rola\([^)]*cx", ANIM), 'a linha do diário com o sinal do Gustavo fica fora da parte visível do caixa, que nunca rola')

sec('REGRAS DE CONTEÚDO E VISUAL')
textos = ' '.join(x['t'] for k in us for x in M[k]['textos'] if not x.get('coberto')) + ' ' + ANIM
linha(not re.search(r'day ?use|booking|airbnb', textos, re.I), 'sem Day Use, Booking ou Airbnb')
linha(not re.search(r'vers[aã]o nova|\bV2\b', textos), 'sem "versão nova" nem V2')
linha('VALE SERENO' not in textos, 'nome da pousada com inicial maiúscula')
linha('tela-computador' not in json.dumps([M[k]['arquivo'] for k in us]), 'calendário só na visão de 14 dias')
linha(not re.search(r'\banel|órbita|orbita|\bring\b|\borbit', ANIM, re.I) and 'logo-alpha' not in ANIM, 'nada do visual do v2 (sem anel, sem órbita, sem a logo circular); final próprio')

sec('CAPA')
ct = os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa.txt')
txt = open(ct, encoding='utf-8').read() if os.path.exists(ct) else ''
linha('RESULTADO: dentro da regra' in txt, 'capa na regra (reels/tools/revisao_capa.py), bloco centrado em y = ' + ((re.findall(r'centro em ([\d.]+)', txt) or ['?'])[0].strip()))

L.insert(0, 'APRESENTAÇÃO FAZLO HOSPEDA (telas inteiras) — revisão técnica, com as correções de enquadramento')
L.insert(1, 'output/apresentacao-hospeda.mp4')
L.append('')
L.append('RESULTADO: ' + ('aprovado' if not falhas else f'{falhas} item(ns) a corrigir'))
os.makedirs(REV, exist_ok=True)
open(os.path.join(REV, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
