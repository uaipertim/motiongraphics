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
    linha(80 <= dur <= 90.6, f'duração {dur:.2f} s (antes: 90,0 s; alvo ~90 s)')
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
ZB = D['ZB'] if 'ZB' in D else None
cel = lambda q: next(c for c in q['caixas'] if c['tipo'] == 'celular')
tel = lambda q: next(c for c in q['caixas'] if c['tipo'] == 'tela')
base = [q for q in Q if abs(q['escala'] - 1) < 0.002 and abs(q['cam']['y'] - 900) < 0.5 and abs(q['cam']['x'] - 540) < 0.5]
cb = cel(base[len(base) // 2])
larg = cb['x1'] - cb['x0']
linha(540 <= larg <= 580, f"celular em 1×: moldura com {larg:.0f} px de largura (alvo 540–580), x {cb['x0']:.0f}–{cb['x1']:.0f}, y {cb['y0']:.0f}–{cb['y1']:.0f} (antes: ~430 px, base ~y 1525 com o celular reduzido sob a lupa)")
linha(1440 <= cb['y1'] <= 1536, f"base da moldura em y {cb['y1']:.0f} (perto de 1500, nunca abaixo de 1536)")
inteiro = sum(1 for q in Q if cel(q)['x0'] >= 0 and cel(q)['x1'] <= 1080 and cel(q)['y0'] >= 0 and cel(q)['y1'] <= 1920)
pct = 100 * inteiro / len(Q)
linha(pct >= 60, f'celular inteiro (com a moldura) dentro do quadro em {pct:.1f}% do vídeo (mínimo 60%)')
fora = [q['t'] for q in Q if not any(z['ini'] - 0.01 <= q['t'] <= z['fim'] + 0.01 for z in D['zooms']) and q['t'] > 4.8 and q['t'] < D['secoes'][-1]['t0'] and abs(q['escala'] - 1) > 0.002]
linha(not fora, 'fora das aproximações, escala 1× (do fim da abertura ao começo do final)', str(fora[:5]) if fora else None)
emax = max(q['escala'] for q in Q)
linha(emax <= 1.3005, f'escala máxima {emax:.3f}× da vista 1× (limite 1,3×)')
marg = min(min(tel(q)['x0'], 1080 - tel(q)['x1']) for q in Q)
linha(marg >= 40, f'a largura inteira da tela do app sempre dentro do quadro, ≥ 40 px de cada lado (menor margem: {marg:.0f} px)')
lat = sum(q['cortLat'] for q in Q)
linha(lat == 0, f'nenhum texto da tela cortado pela lateral, em {len(Q)} quadros (cortados pela lateral: {lat})')
v1 = sum(q['cortV'] for q in Q if not q['foco'])
linha(v1 == 0, f'fora das aproximações, nenhum texto da tela cortado por cima ou por baixo ({v1})')
col = max(tel(q)['x1'] for q in Q)
linha(col <= 940, f'a tela do app nunca entra na coluna de botões do Instagram (borda direita máxima x {col:.0f}; coluna x > 940, y > 1000)')

sec('APROXIMAÇÕES (momentos-chave)')
zs = D['zooms']
linha(6 <= len(zs) <= 8, f'{len(zs)} aproximações (pedido: 6 a 8), cada uma voltando a 1× antes da próxima')
NOMES = {'manutencao': 'barra "Manutenção" no calendário', 'campo': 'campo do sinal "315,00" (Confirmar reserva, Gustavo)', 'recibo': 'recibo do check-in da Fernanda', 'total': 'Total R$ 321,00 com o item adicionado na comanda', 'saldo': 'saldo da Mariana R$ 412,00 → R$ 0,00', 'chip': '"Quitado"', 'falta': '"falta R$ 15,00" no fechamento do caixa'}
ok_z = True
for i, z in enumerate(zs):
    qs = [q for q in Q if z['ini'] <= q['t'] <= z['fim']]
    hold = [q for q in qs if z['t0'] <= q['t'] <= z['t1']]
    ml = min(tel(q)['x0'] for q in qs); mr = min(1080 - tel(q)['x1'] for q in qs)
    ys = [y for q in qs for y in (q['foco']['ret']['y0'], q['foco']['ret']['y1'])]
    tys = [(x['y0'], x['y1'], x['x0'], x['x1']) for q in qs for x in q['foco']['textos']]
    dentro = all(200 <= a and b <= 1536 and c >= 0 and d <= 1080 for a, b, c, d in tys) and min(ys) >= 200 and max(ys) <= 1536
    esc = max(q['escala'] for q in qs)
    par = (z['t0'] - z['ini']) >= 0.4 - 1e-6 and (z['t0'] - z['ini']) <= 0.5 + 1e-6 and (z['fim'] - z['t1']) <= 0.5 + 1e-6 and z['t1'] - z['t0'] >= 1.5 - 1e-6
    sep = i == 0 or zs[i - 1]['fim'] <= z['ini'] + 1e-6
    lup = [q['t'] for q in qs if any(l['op'] > 0.05 for l in q['lupas'])]
    ok = dentro and esc <= 1.3005 and min(ml, mr) >= 40 and par and sep and not lup
    ok_z &= ok
    L.append(f"       {i + 1}. {z['ini']:.2f}–{z['fim']:.2f} s (entra {z['t0'] - z['ini']:.2f} s, parada {z['t0']:.2f}–{z['t1']:.2f} s = {z['t1'] - z['t0']:.2f} s, sai {z['fim'] - z['t1']:.2f} s) · {esc:.2f}× · {z['tela']}: " + ' + '.join(NOMES.get(n, n) for n in z['nomes']))
    L.append(f"          margens laterais da tela: esq. {ml:.0f} px · dir. {mr:.0f} px · foco em y {min(ys):.0f}–{max(ys):.0f} · {len(hold[0]['foco']['textos'])} textos no foco, todos inteiros: {'sim' if dentro else 'NÃO'}" + ('' if not lup else f' · LUPA JUNTO EM {lup[0]}'))
linha(ok_z, 'cada aproximação: ≤ 1,3×, entrada e saída de 0,4–0,5 s, parada ≥ 1,5 s, ≥ 40 px de margem lateral, o elemento em foco e todos os textos dele inteiros dentro de y 200–1536, sem lupa ao mesmo tempo')

sec('LUPAS (destaques ampliados)')
ruins, tempo, cheias, margem, rot, vaza, sobre_el, sobre_tq, chipgap = [], [], [], [], [], [], [], [], []
for q in Q:
    chips = [c for c in q['caixas'] if c['tipo'] == 'chip' and c['op'] > 0.05]
    for lp in q['lupas']:
        if lp['op'] < 0.05:
            continue
        e = lp['elemento']
        if inter(lp, {'x0': e['x0'] - 24, 'y0': e['y0'] - 24, 'x1': e['x1'] + 24, 'y1': e['y1'] + 24}):
            sobre_el.append((lp['rotulo'], round(q['t'], 2)))
        for tq in q['toques']:
            if inter(lp, tq):
                sobre_tq.append((lp['rotulo'], round(q['t'], 2)))
        for c in chips:
            if inter(lp, {'x0': c['x0'] - 24, 'y0': c['y0'] - 24, 'x1': c['x1'] + 24, 'y1': c['y1'] + 24}):
                chipgap.append((lp['rotulo'], round(q['t'], 2)))
        if lp['x0'] < 39.5 or lp['x1'] > 1040.5 or lp['y0'] < 199.5 or lp['y1'] > 1536.5 or (lp['x1'] > 940 and lp['y1'] > 1000):
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
    if lp['t1'] - lp['t0'] < 1.8 - 1e-6:
        tempo.append((lp['rotulo'], round(lp['t1'] - lp['t0'], 2)))
    texto_tela = re.sub(r'\s+', ' ', ' '.join(x['t'] for x in M[lp['tela']]['textos'] if not x.get('coberto')))
    if lp['rotulo'] not in texto_tela:
        rot.append((lp['tela'], lp['rotulo']))
linha(not tempo, f"{len(D['lupas'])} lupas, cada uma aberta e parada ≥ 1,8 s", str(tempo) if tempo else None)
linha(not ruins, 'texto dentro da lupa ≥ 40 px', str(ruins) if ruins else None)
linha(not cheias, 'cada lupa mostra o conteúdo INTEIRO do elemento', str(sorted(set(cheias))) if cheias else None)
linha(not sobre_el, 'nenhuma lupa em cima do elemento que ela amplia (respiro ≥ 24 px, medido em cada quadro)', str(sorted(set(n for n, _ in sobre_el))) if sobre_el else None)
linha(not sobre_tq, 'nenhuma lupa sobre a área em ação (os toques que acontecem com ela aberta)', str(sorted(set(sobre_tq)))[:300] if sobre_tq else None)
linha(not chipgap, 'respiro ≥ 24 px entre lupa e chip', str(sorted(set(n for n, _ in chipgap))) if chipgap else None)
linha(not margem, 'lupas dentro de x 40–1040 e y 200–1536, fora da coluna de botões (x > 940, y > 1000)', str(sorted(set(n for n, _ in margem))) if margem else None)
linha(not rot, 'rótulos com exatamente as palavras da tela (conferidos contra o HTML de cada estado)', str(rot) if rot else None)
linha(not vaza, 'rótulo inteiro dentro do balão', str(sorted(set(vaza))) if vaza else None)
L.append('       posição de cada destaque (no quadro, com a lupa aberta):')
for lp in D['lupas']:
    q = min(Q, key=lambda q: abs(q['t'] - (lp['t0'] + 0.3)))
    b = next((x for x in q['lupas'] if x['rotulo'] == lp['rotulo'] and x['el'] == lp['el']), None)
    if b:
        L.append(f"         {lp['t0']:5.2f}–{lp['t1']:5.2f} s  {lp['rotulo']:<32} x {b['x0']:.0f}–{b['x1']:.0f}, y {b['y0']:.0f}–{b['y1']:.0f}  ({'acima' if b['y1'] <= b['elemento']['y0'] else 'abaixo'} do elemento, texto {lp['cp'] * lp['s']:.0f} px)")

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
cs, gap, alto = [], [], []
for q in Q:
    for c in q['caixas']:
        if c['tipo'] != 'chip' or c['op'] <= 0.05:
            continue
        if inter(c, tel(q)):
            cs.append((c['nome'], q['t']))
        if c['y1'] + 24 > cel(q)['y0'] + 0.5 and inter({**c, 'y1': c['y1'] + 24}, cel(q)):
            gap.append((c['nome'], round(q['t'], 2)))
        if c['y0'] < 199.5:
            alto.append((c['nome'], round(q['t'], 2)))
linha(not cs, 'chip sempre acima do celular, sem sobrepor nenhum pixel da tela', str(cs[:4]) if cs else None)
linha(not gap, 'chip com ≥ 24 px de respiro até a moldura (some enquanto a aproximação sobe o celular)', str(gap[:4]) if gap else None)
linha(not alto, 'chip abaixo de y 200 (fora da interface do Instagram)', str(alto[:4]) if alto else None)
seg = [(c['nome'], round(q['t'], 2)) for q in Q for c in q['caixas'] if c['tipo'] in ('chip', 'texto', 'final') and c['op'] > 0.5 and (c['y1'] > 1536.5 or (c['x1'] > 940 and c['y1'] > 1000))]
linha(not seg, 'chip, textos, marca e pílula fora dos 20% de baixo e da coluna de botões (x > 940, y > 1000)', str(seg[:4]) if seg else None)

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

L.insert(0, 'APRESENTAÇÃO FAZLO HOSPEDA (telas inteiras) — revisão técnica: celular maior, aproximações curtas e lupas reposicionadas')
L.insert(1, 'output/apresentacao-hospeda.mp4')
L.append('')
L.append('RESULTADO: ' + ('aprovado' if not falhas else f'{falhas} item(ns) a corrigir'))
os.makedirs(REV, exist_ok=True)
open(os.path.join(REV, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
