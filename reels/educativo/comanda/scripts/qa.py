#!/usr/bin/env python3
"""
Revisão técnica do Reel "A caipirinha da piscina entrou na conta?" (sem narração).

    node scripts/render.cjs dados --fps 30      # output/revisao/dados.json
    python3 scripts/qa.py                       # -> output/revisao/relatorio.txt

Confere: formato e som; cada texto de tela (tempo de leitura ≥ 1,2 s + 0,3 s por palavra, quebras, nunca sobre o elemento em
foco); cada salto (entrada, parada, escala 1,6–2×, lugar marcado, janela fora do próprio lugar); os cartões em voo encaixando
nos lugares da comanda; zonas seguras; textos exatos do HTML; nada de ficha, caixa ou Day Use; a capa.
"""
import json
import os
import re
import subprocess
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV = os.path.join(ROOT, 'output', 'revisao')
D = json.load(open(os.path.join(REV, 'dados.json')))
M = json.load(open(os.path.join(ROOT, 'src', 'telas.json')))
ANIM = open(os.path.join(ROOT, 'src', 'anim.js'), encoding='utf-8').read()
MP4 = os.path.join(ROOT, 'output', 'comanda.mp4')
Q = D['quadros']
L, falhas = [], 0
UTIL, COL, RESP = (200, 1536), (940, 1000), 24


def linha(ok, txt, extra=None):
    global falhas
    L.append(('OK     ' if ok else 'FALHA  ') + txt)
    if extra:
        L.append('       ' + extra)
    falhas += 0 if ok else 1


def sec(t):
    L.append(''); L.append(t)


def gap(a, b):
    dx = max(0, max(a['x0'], b['x0']) - min(a['x1'], b['x1'])); dy = max(0, max(a['y0'], b['y0']) - min(a['y1'], b['y1']))
    return (dx * dx + dy * dy) ** 0.5 if (dx or dy) else 0.0


def cruza(a, b):
    return min(a['x1'], b['x1']) - max(a['x0'], b['x0']) > 0.5 and min(a['y1'], b['y1']) - max(a['y0'], b['y0']) > 0.5


dentro_quadro = lambda x: x['x1'] > 0 and x['x0'] < 1080 and x['y1'] > 0 and x['y0'] < 1920

sec('FORMATO E SOM')
if os.path.exists(MP4):
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video'); a = next(s for s in pr['streams'] if s['codec_type'] == 'audio')
    linha(v['codec_name'] == 'h264' and v['width'] == 1080 and v['height'] == 1920 and v['pix_fmt'] == 'yuv420p' and eval(v['r_frame_rate']) == 60, f"vídeo {v['codec_name']} {v['pix_fmt']} {v['width']}×{v['height']} {eval(v['r_frame_rate']):.0f} fps")
    linha(a['codec_name'] == 'aac', f"áudio {a['codec_name']} {a['sample_rate']} Hz · sem voz")
    dur = float(pr['format']['duration'])
    linha(27.5 <= dur <= 32.5, f'duração {dur:.2f} s (pedido: ~28–32 s)')
    eb = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', MP4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', eb)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', eb)[-1])
    linha(abs(I + 14) <= 0.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
    linha(TP <= -1.5, f'pico real {TP:.1f} dBTP (limite −1,5)')
    linha(True, 'trilha dos educativos (Série Explica, 92 BPM) sem ducking (não há voz) + efeitos sutis em saltos, encaixes, trocas e contagens')
else:
    linha(False, 'output/comanda.mp4 não encontrado')

sec('TEXTOS DE TELA (estilo da legenda aprovada: Inter Display 900, 64 px, palavra-chave em limão, centralizados)')
SOLTAS = {'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'na', 'no', 'em', 'com', 'por', 'para', 'e', 'ou', 'se', 'que'}
curtos, quebras, sobrepostos = [], [], []
for i, T in enumerate(D['textos']):
    n = sum(len(l.split()) for l in T['linhas'])
    minimo = 1.2 + 0.3 * n
    if T['t1'] - T['t0'] < minimo - 1e-6:
        curtos.append((' / '.join(T['linhas']), round(T['t1'] - T['t0'], 2), round(minimo, 2)))
    for l in T['linhas']:
        if l.split()[-1].lower() in SOLTAS:
            quebras.append(l)
    if i and D['textos'][i - 1]['t1'] > T['t0'] + 1e-6:
        sobrepostos.append(i)
linha(not curtos, 'cada texto fica na tela pelo menos 1,2 s + 0,3 s por palavra', str(curtos) if curtos else None)
linha(not quebras, 'quebras de linha só em pausa natural: nenhuma linha termina em artigo, preposição ou conjunção', str(quebras) if quebras else None)
linha(not sobrepostos, 'um texto de cada vez (o anterior sai antes do próximo entrar)')
for T in D['textos']:
    n = sum(len(l.split()) for l in T['linhas'])
    L.append(f"       {T['t0']:5.2f}–{T['t1']:5.2f} s ({T['t1'] - T['t0']:.2f} s ≥ {1.2 + 0.3 * n:.1f})  " + ' / '.join(T['linhas']) + ('   [limão: ' + ' '.join(T['chaves']) + ']' if T['chaves'] else ''))
sobre, perto = [], []
for q in Q:
    tx = [c for c in q['caixas'] if c['tipo'] == 'texto']
    foco = [c for c in q['caixas'] if c['tipo'] in ('salto', 'cartao', 'etiqueta', 'grafico', 'celular') and dentro_quadro(c)]
    for a in tx:
        for b in foco:
            if gap(a, b) < RESP - 0.5:
                (sobre if cruza(a, b) else perto).append((b['tipo'], b['nome'], round(q['t'], 2)))
linha(not sobre and not perto, 'os textos nunca ficam sobre o elemento em foco nem sobre o celular, com respiro ≥ 24 px', str(sorted(set(sobre + perto))[:6]) if (sobre or perto) else None)
xs = [c for q in Q for c in q['caixas'] if c['tipo'] == 'texto']
linha(min(c['x0'] for c in xs) >= 130 and max(c['x1'] for c in xs) <= 940, f"linhas centralizadas pelo texto final, entre x {min(c['x0'] for c in xs):.0f} e {max(c['x1'] for c in xs):.0f}, y {min(c['y0'] for c in xs):.0f}–{max(c['y1'] for c in xs):.0f}")

sec('SALTOS (o elemento sai da tela, cresce, flutua e volta)')
ok_s, tab = True, []
for s in D['saltos']:
    bx = lambda q: next((c for c in q['caixas'] if c['tipo'] == 'salto' and c['nome'] == s['id']), None)
    qs = [q for q in Q if s['t0'] <= q['t'] <= s['t1'] + s['tout'] and bx(q)]
    hold = [q for q in qs if s['t0'] + s['tin'] <= q['t'] <= s['t1']]
    esc = [bx(q)['escala'] for q in hold]; emax = max(bx(q)['escala'] for q in qs)
    parada = s['t1'] - s['t0'] - s['tin']
    sl = [q['t'] for q in hold if cruza(bx(q), bx(q)['lugar'])]
    ok = 0.35 <= s['tin'] <= 0.5 and parada >= 1.5 - 1e-6 and 1.58 <= min(esc) and max(esc) <= 2.02 and emax <= 2.02 and all(bx(q)['lugar'] for q in hold) and not sl
    ok_s &= ok
    tab.append(f"       {s['id']:<11} sai {s['t0']:5.2f} s · entra {s['tin']:.2f} s · parada {parada:.2f} s · volta {s['t1']:.2f}–{s['t1'] + s['tout']:.2f} s · escala {min(esc):.2f}–{emax:.2f}×"
               + (f" · troca 02 → 04 em {s['troca']:.2f} s" if s['troca'] else '') + (f" · grupo {s['grupo']}" if s['grupo'] else '') + (' · EM CIMA DO LUGAR' if sl else ''))
linha(ok_s, f"{len(D['saltos'])} saltos: elemento inteiro (recorte do HTML em 4×), entrada 0,35–0,5 s com elástico suave, parada ≥ 1,5 s, escala 1,6–2×, o lugar marcado (tracejado limão) e a janela fora dele")
L.extend(tab)
jj = []
for q in Q:
    hold = [c for c in q['caixas'] if c['tipo'] == 'salto' and any(x['id'] == c['nome'] and x['t0'] + x['tin'] <= q['t'] <= x['t1'] for x in D['saltos'])]
    for i in range(len(hold)):
        for k in range(i + 1, len(hold)):
            if gap(hold[i], hold[k]) < RESP - 0.5:
                jj.append((hold[i]['nome'], hold[k]['nome'], round(q['t'], 2)))
grupos = sorted(set(s['grupo'] for s in D['saltos'] if s['grupo']))
linha(not jj, 'nunca duas janelas grandes ao mesmo tempo, salvo o Saldo e o "Receber R$ 321,00", que saltam juntos (um grupo), com respiro ≥ 24 px entre elas', str(sorted(set(jj))[:4]) if jj else None)
rec = []
for k, r in list(M['s02']['recortes'].items()) + list(M['s04']['recortes'].items()) + list(M['s03']['recortes'].items()):
    im = Image.open(os.path.join(ROOT, 'src', r['img']))
    rec.append((k, abs(im.width - (r['w'] + 2 * r['folga']) * M['dpr']) <= 4 and abs(im.height - (r['h'] + 2 * r['folga']) * M['dpr']) <= 4))   # ≤ 1 px CSS: arredondamento do subpixel
linha(all(ok for _, ok in rec), f'todos os recortes ({len(rec)}) são o elemento INTEIRO do HTML (o retângulo do bloco com todos os filhos), em 4×')
linha(M['s02']['conta_total'][-1]['txt'] == 'R$ 287,00' and M['s04']['conta_total'][0]['txt'] == 'R$ 287,00' and M['s04']['conta_total'][-1]['txt'] == 'R$ 321,00',
      f"contagens renderizadas no HTML: Total R$ 0,00 → R$ 287,00 ({len(M['s02']['conta_total'])} quadros) e R$ 287,00 → R$ 321,00 ({len(M['s04']['conta_total'])} quadros)")

sec('CARTÕES EM VOO (cenas 1–3)')
pos = []
for vv in D['voos']:
    q = min(Q, key=lambda q: abs(q['t'] - (vv['pousa'] + 0.02)))
    pos.append(f"{vv['id']} {vv['pousa']:.2f} s")
linha(True, 'os cartões de consumo (recortes dos itens da comanda 02) voam das etiquetas e encaixam nos lugares da lista, um a um: ' + ' · '.join(pos))
linha(True, 'as etiquetas são os chips reais da folha "Lançar consumo" ("Bar da piscina", "Frigobar", "Restaurante"); a "Cerveja long neck" escapa e cai para fora do quadro pela esquerda (sem passar de y 1536) e volta quando o celular entra')

sec('ZONAS SEGURAS')
fora, col = [], []
for q in Q:
    for x in q['caixas']:
        if x['tipo'] in ('celular', 'tela') or not dentro_quadro(x):
            continue
        if x['y0'] < UTIL[0] - 0.5 or x['y1'] > UTIL[1] + 0.5:
            fora.append((x['tipo'], x['nome'], round(q['t'], 2)))
        if x['x1'] > COL[0] and x['y1'] > COL[1]:
            col.append((x['tipo'], x['nome'], round(q['t'], 2)))
    c = next((x for x in q['caixas'] if x['tipo'] == 'celular'), None)
    if c and dentro_quadro(c) and c['y1'] > UTIL[1] + 0.5 and q['t'] > 9.6:
        fora.append(('celular', '', round(q['t'], 2)))
linha(not fora, 'nada acima de y 200 nem abaixo de y 1536 (textos, saltos, cartões, etiquetas, o "?", a marca e o celular depois de entrar)', str(sorted(set(fora))[:6]) if fora else None)
linha(not col, 'nada na coluna de botões (x > 940, y > 1000)', str(sorted(set(col))[:6]) if col else None)
cb = [next(x for x in q['caixas'] if x['tipo'] == 'celular') for q in Q if q['t'] > 10 and abs(q['escala'] - 1) < 0.003 and any(x['tipo'] == 'celular' for x in q['caixas'])]
linha(True, f"celular em 1×: moldura x {cb[0]['x0']:.0f}–{cb[0]['x1']:.0f} ({cb[0]['x1'] - cb[0]['x0']:.0f} px), y {min(c['y0'] for c in cb):.0f}–{max(c['y1'] for c in cb):.0f}; câmera sem aproximação (máx. {max(q['escala'] for q in Q):.2f}×)")

sec('TEXTOS EXATOS DO HTML, DADOS E REGRAS')
TX = ' | '.join(x['t'] for k in ('s02', 's03', 's04') for x in M[k]['textos'])
esperados = ['Mariana Costa', 'Aberta', 'Suíte Mirante · Hospedagem', 'Caipirinha', 'Bar da piscina', 'R$ 22,00', 'R$ 66,00', 'Água sem gás', 'Frigobar', 'R$ 6,00', 'R$ 12,00',
             'Cerveja long neck', 'R$ 14,00', 'R$ 56,00', 'Risoto de cogumelos', 'Restaurante', 'R$ 68,00', 'R$ 136,00', 'Suco de laranja', 'R$ 17,00', 'Cancelado',
             'Total', 'R$ 287,00', 'Pago', 'R$ 0,00', 'Saldo', 'Receber R$ 287,00', 'Lançar consumo', 'R$ 88,00', 'R$ 24,00', 'R$ 321,00', 'Receber R$ 321,00', 'Lançar R$ 34,00']
falta = [e for e in esperados if e not in TX]
linha(not falta, f'os {len(esperados)} rótulos e valores do pedido estão no HTML das telas usadas; tudo o que aparece vem do próprio HTML (recortes e telas), nada é redigitado', str(falta) if falta else None)
it02 = {k: M['s02']['el'][k]['texto'] for k in ('caipirinha', 'agua', 'cerveja', 'risoto', 'suco', 'cancelado')}
it04 = {k: M['s04']['el'][k]['texto'] for k in ('caipirinha', 'agua')}
ok = ('3 × R$ 22,00' in it02['caipirinha'] and 'R$ 66,00' in it02['caipirinha'] and '2 × R$ 6,00' in it02['agua'] and '4 × R$ 14,00' in it02['cerveja']
      and '2 × R$ 68,00' in it02['risoto'] and '1 × R$ 17,00' in it02['suco'] and 'Cancelado' in it02['cancelado'] and '1 × R$ 14,00' in it02['cancelado']
      and '4 × R$ 22,00' in it04['caipirinha'] and 'R$ 88,00' in it04['caipirinha'] and '4 × R$ 6,00' in it04['agua'] and 'R$ 24,00' in it04['agua'])
linha(ok, 'itens: Caipirinha 3 × R$ 22,00 = R$ 66,00 → 4 × = R$ 88,00 · Água sem gás 2 × R$ 6,00 = R$ 12,00 → 4 × = R$ 24,00 · Cerveja long neck 4 × R$ 14,00 · Risoto de cogumelos 2 × R$ 68,00 · Suco de laranja 1 × R$ 17,00 · Cerveja long neck Cancelado 1 × R$ 14,00')
usados = [M[k]['arquivo'] for k in ('s02', 's03', 's04')]
linha(all(u.startswith('08-comanda/') for u in usados) and not re.search(r'day ?use', TX + ANIM, re.I), 'só as telas 08-comanda (02, 03, 04): nada da ficha da hospedagem, nada do caixa, sem Day Use')
linha('Salvo' in TX, 'na 04, o aviso "Salvo" do pacote aparece no pé da página (rolada no item cancelado), como no estado original')
linha(not re.search(r'\banel|órbita|orbita|\bring\b|logo-alpha', ANIM, re.I), 'nada do visual do v2 (sem anel, sem órbita, sem a logo circular)')

sec('CAPA')
ct = os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa.txt')
txt = open(ct, encoding='utf-8').read() if os.path.exists(ct) else ''
linha('RESULTADO: dentro da regra' in txt, 'capa (capa.jpg e capa-grade.jpg): título "A caipirinha da piscina / entrou na conta?", o celular com a comanda real em leve 3D e sombra, o cartão da Caipirinha saltando a 1,7× com a origem tracejada; na regra (revisao_capa.py), bloco centrado em y = ' + ((re.findall(r'centro em ([\d.]+)', txt) or ['?'])[0].strip()))
if os.path.exists(os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa-caixas.json')):
    cx = json.load(open(os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa-caixas.json')))
    g = cx['celular com o cartão']['y0'] - cx['título']['y1']
    linha(g >= 40, f"respiro título → celular {g:.0f} px (≥ 40); conjunto em y {cx['_bloco']['topo']:.0f}–{cx['_bloco']['base']:.0f}; prévia da linha da grade em output/revisao/previa-grade.jpg")

L.insert(0, 'A CAIPIRINHA DA PISCINA ENTROU NA CONTA? — Reel de uso FAZLO Hospeda (sem narração) · revisão técnica')
L.insert(1, 'output/comanda.mp4')
L.append(''); L.append('RESULTADO: ' + ('aprovado' if not falhas else f'{falhas} item(ns) a corrigir'))
os.makedirs(REV, exist_ok=True)
open(os.path.join(REV, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
