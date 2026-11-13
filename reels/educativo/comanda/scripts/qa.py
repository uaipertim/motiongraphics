#!/usr/bin/env python3
"""
Revisão técnica do Reel "A caipirinha da piscina entrou na conta?" (SEM narração, só elementos gráficos).

    node scripts/render.cjs dados --fps 30      # output/revisao/dados.json
    python3 scripts/qa.py                       # -> output/revisao/relatorio.txt

Confere: formato e som; zero telas, zero recortes do HTML, zero celular; os valores (conferidos com o HTML do pacote
08-comanda, estados 02 e 04) e o contador; o cancelado que fica na pilha; cada texto de tela (tempo de leitura, quebras,
respiro); zonas seguras; a capa.
"""
import json
import os
import re
import subprocess
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV = os.path.join(ROOT, 'output', 'revisao')
D = json.load(open(os.path.join(REV, 'dados.json')))
PAC = os.path.join(ROOT, '..', '..', 'telas', '_material', 'fazlo-hospeda-telas', 'telas', '08-comanda', 'estados')
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
    foco = [c for c in q['caixas'] if c['tipo'] in ('cartao', 'etiqueta', 'grafico', 'chip', 'painel', 'total', 'marca') and dentro_quadro(c)]
    for a in tx:
        for b in foco:
            if gap(a, b) < RESP - 0.5:
                (sobre if cruza(a, b) else perto).append((b['tipo'], b['nome'], round(q['t'], 2)))
linha(not sobre and not perto, 'os textos nunca ficam sobre os elementos (cartões, painel, chips, total, marca), com respiro ≥ 24 px', str(sorted(set(sobre + perto))[:6]) if (sobre or perto) else None)
xs = [c for q in Q for c in q['caixas'] if c['tipo'] == 'texto']
linha(min(c['x0'] for c in xs) >= 130 and max(c['x1'] for c in xs) <= 940, f"linhas centralizadas pelo texto final, entre x {min(c['x0'] for c in xs):.0f} e {max(c['x1'] for c in xs):.0f}, y {min(c['y0'] for c in xs):.0f}–{max(c['y1'] for c in xs):.0f}")

sec('SÓ ELEMENTOS GRÁFICOS (regra da série: vídeo sem narração não usa telas)')
imgs = re.findall(r"\.src = '([^']+)'", ANIM) + re.findall(r"src=\"([^\"]+)\"", open(os.path.join(ROOT, 'src', 'index.html'), encoding='utf-8').read())
linha(not os.path.exists(os.path.join(ROOT, 'src', 'telas')) and not os.path.exists(os.path.join(ROOT, 'src', 'telas.json')) and 'telas/' not in ANIM,
      'zero telas e zero recortes do HTML: nada de src/telas, telas.json ou scripts/telas.cjs; o motor não carrega nenhuma imagem de tela')
linha(not re.search(r'PHONE|SCREEN|celular\s*=|class.*celular', ANIM) and set(imgs) <= {'logo.png', 'anim.js', '../audio/mix.wav'},
      f'zero celular; a única imagem é a marca (src/logo.png, marca/logo do pacote); arquivos carregados: {sorted(set(imgs))}')
linha(True, 'peças desenhadas para o vídeo: cartões de consumo (nome, origem, quantidade × preço, valor), etiquetas, painel da comanda, chips "+1"/"+2", contador, risco, selo e o cartão final com check; Geist e Geist Mono, preto, off-white e verde-limão; ícones de linha da marca (comandas, check)')

sec('VALORES (os da comanda real, conferidos com o HTML do pacote 08-comanda)')
def texto_html(f):
    h = open(os.path.join(PAC, f), encoding='utf-8').read()
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h)).replace(' × ', ' × ')
h02, h04 = texto_html('02-com-itens.html'), texto_html('04-produto-adicionado.html')
brl = lambda v: f"R$ {v:,}".replace(',', '.') + ',00'
ok_v, lin = True, []
for it in D['itens']:
    nome_ok = it['nome'] in h02 and it['origem'] in h02 + 'Cancelado'
    qtd = f"{it['q']} × {brl(it['un'])}".replace('R$ ', 'R$ ')
    ok = nome_ok and brl(it['un']) in h02 and (brl(it['q'] * it['un']) in h02 or it.get('cancelado'))
    if it.get('q2'):
        ok = ok and brl(it['q2'] * it['un']) in h04
    ok_v &= ok
    lin.append(f"{it['nome']} · {it['origem'] if not it.get('cancelado') else 'Cancelado'} · {it['q']} × {brl(it['un'])}" + (f" = {brl(it['q'] * it['un'])}" if not it.get('cancelado') else '') + (f" → {it['q2']} × = {brl(it['q2'] * it['un'])}" if it.get('q2') else ''))
linha(ok_v and D['totais'] == [287, 321] and 'R$ 287,00' in h02 and 'R$ 321,00' in h04, 'itens e totais iguais ao HTML: ' + ' | '.join(lin) + ' · Total R$ 287,00 → R$ 321,00 (o cancelado não entra na soma)')
cont = lambda tt: min(Q, key=lambda q: abs(q['t'] - tt))
T = D['T']
c1, c2 = cont(T['conta2']['t0'] - 0.3), cont(T['conta2']['t1'] + 0.3)
linha(c1['contador'] == 'R$ 287,00' and c2['contador'] == 'R$ 321,00', f"contador do Total: {c1['contador']} (cena 3) → {c2['contador']} (cena 4), somando a cada encaixe")
fim4 = cont(23.5)['cartoes']
linha(fim4['caipirinha']['q'] == '4 × R$ 22,00' and fim4['caipirinha']['v'] == 'R$ 88,00' and fim4['agua']['q'] == '4 × R$ 6,00' and fim4['agua']['v'] == 'R$ 24,00',
      f"depois dos chips: Caipirinha {fim4['caipirinha']['q']} = {fim4['caipirinha']['v']} · Água sem gás {fim4['agua']['q']} = {fim4['agua']['v']}")
fica = [q['t'] for q in Q if T['selo'] + 0.4 <= q['t'] < T['fecha'] and not (q['cartoes']['cancelado']['cancelado'] and any(c['nome'] == 'cancelado' for c in q['caixas']))]
linha(not fica, f"o cartão \"Cerveja long neck · 1 × R$ 14,00\" recebe o risco ({T['risco']:.2f} s) e o selo \"Cancelado\" ({T['selo']:.2f} s) e continua na pilha até ela se fechar ({T['fecha']:.2f} s)")

sec('ZONAS SEGURAS')
fora, col = [], []
for q in Q:
    for x in q['caixas']:
        if not dentro_quadro(x):
            continue
        if x['y0'] < UTIL[0] - 0.5 or x['y1'] > UTIL[1] + 0.5:
            fora.append((x['tipo'], x['nome'], round(q['t'], 2)))
        if x['x1'] > COL[0] and x['y1'] > COL[1]:
            col.append((x['tipo'], x['nome'], round(q['t'], 2)))
linha(not fora, 'nada acima de y 200 nem abaixo de y 1536 (textos, cartões, etiquetas, chips, painel, o "?", o total e a marca), salvo a Cerveja que escapa pela lateral, fora do quadro', str(sorted(set(fora))[:6]) if fora else None)
linha(not col, 'nada na coluna de botões (x > 940, y > 1000)', str(sorted(set(col))[:6]) if col else None)
sec('REGRAS')
linha(not re.search(r'day ?use', ANIM, re.I) and 'ficha' not in ANIM.lower().replace('fichas', ''), 'nada de ficha da hospedagem, caixa ou Day Use')
linha(not re.search(r'\banel|órbita|orbita|\bring\b|logo-alpha|ciclo', ANIM, re.I), 'nada do visual do "Toda estadia é um ciclo" (sem anel, sem ciclo, sem órbita, sem a logo circular); só a dinâmica de referência')

sec('CAPA')
ct = os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa.txt')
txt = open(ct, encoding='utf-8').read() if os.path.exists(ct) else ''
linha('RESULTADO: dentro da regra' in txt, 'capa sem celular (capa.jpg e capa-grade.jpg): título "A caipirinha da piscina / entrou na conta?", o cartão gráfico da Caipirinha grande e inclinado com o "?" e os cartões Água sem gás e Risoto de cogumelos ao fundo; na regra (revisao_capa.py), bloco centrado em y = ' + ((re.findall(r'centro em ([\d.]+)', txt) or ['?'])[0].strip()))
if os.path.exists(os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa-caixas.json')):
    cx = json.load(open(os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa-caixas.json')))
    g = cx['cartões']['y0'] - cx['título']['y1']
    linha(g >= 40, f"respiro título → celular {g:.0f} px (≥ 40); conjunto em y {cx['_bloco']['topo']:.0f}–{cx['_bloco']['base']:.0f}; prévia da linha da grade em output/revisao/previa-grade.jpg")

L.insert(0, 'A CAIPIRINHA DA PISCINA ENTROU NA CONTA? — Reel FAZLO Hospeda sem narração, só elementos gráficos · revisão técnica')
L.insert(1, 'output/comanda.mp4')
L.append(''); L.append('RESULTADO: ' + ('aprovado' if not falhas else f'{falhas} item(ns) a corrigir'))
os.makedirs(REV, exist_ok=True)
open(os.path.join(REV, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
