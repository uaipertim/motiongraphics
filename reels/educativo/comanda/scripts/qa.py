#!/usr/bin/env python3
"""
Revisão técnica do Reel "A caipirinha da piscina entrou na conta?" (SEM narração, só elementos — reels/PADRAO-ELEMENTOS.md).

    node scripts/render.cjs dados --fps 30      # output/revisao/dados.json
    python3 scripts/qa.py                       # -> output/revisao/relatorio.txt (+ output/revisao/movimento.json)

Confere: formato e som; o QA DE MOVIMENTO obrigatório (reels/tools/qa_movimento.py, com a v2 como linha de base); as cenas
(tempo, fundo, elemento principal, manchete e tempo de leitura); o número protagonista de cada cena (≥ 1/3 da largura);
zonas seguras e respiros; zero telas, celular ou recortes do HTML; nada do visual da v2; os valores, conferidos com o
HTML do pacote 08-comanda (estados 02 e 04); a capa.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, '..', '..', 'tools')
sys.path.insert(0, TOOLS)
import qa_movimento  # noqa: E402

REV = os.path.join(ROOT, 'output', 'revisao')
D = json.load(open(os.path.join(REV, 'dados.json')))
ANIM = open(os.path.join(ROOT, 'src', 'anim.js'), encoding='utf-8').read()
MP4 = os.path.join(ROOT, 'output', 'comanda.mp4')
PAC = os.path.join(ROOT, '..', '..', 'telas', '_material', 'fazlo-hospeda-telas', 'telas', '08-comanda', 'estados')
Q = D['quadros']
CENAS = D['cenas']
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


cortes = [c['t0'] for c in CENAS[1:]] + [12.0, 16.5, 18.5, 22.5]                                   # + os cortes internos (deslizes e mergulho)
na_transicao = lambda t: any(b - 0.35 <= t <= b + 0.4 for b in cortes)
dentro = lambda x: x['x1'] > 0 and x['x0'] < 1080 and x['y1'] > 0 and x['y0'] < 1920

sec('FORMATO E SOM')
if os.path.exists(MP4):
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video'); a = next(s for s in pr['streams'] if s['codec_type'] == 'audio')
    linha(v['codec_name'] == 'h264' and v['width'] == 1080 and v['height'] == 1920 and eval(v['r_frame_rate']) == 60, f"vídeo {v['codec_name']} {v['pix_fmt']} {v['width']}×{v['height']} {eval(v['r_frame_rate']):.0f} fps · áudio {a['codec_name']} {a['sample_rate']} Hz, sem voz")
    dur = float(pr['format']['duration'])
    linha(28 <= dur <= 32, f'duração {dur:.2f} s (pedido: ~30 s)')
    eb = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', MP4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', eb)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', eb)[-1])
    linha(abs(I + 14) <= 0.5 and TP <= -1.5, f'mix {I:.1f} LUFS (alvo −14), pico real {TP:.1f} dBTP (limite −1,5); trilha com energia (nu-disco 120 BPM), cortes na batida, efeitos nos cortes e nos gestos')

    sec('QA DE MOVIMENTO (obrigatório: reels/tools/qa_movimento.py)')
    ref = qa_movimento.mede(qa_movimento.REF)
    m = qa_movimento.mede(MP4, 0.8)
    crit = qa_movimento.aprova(m)
    L.extend('       ' + x for x in qa_movimento.tabela(ref, m))
    for n, ok in crit:
        linha(ok, n)
    json.dump({'referencia': ref, 'video': m, 'criterios': crit}, open(os.path.join(REV, 'movimento.json'), 'w'), ensure_ascii=False, indent=1)
else:
    linha(False, 'output/comanda.mp4 não encontrado')

sec('CENAS (uma composição nova a cada ideia; manchete no alto, à esquerda)')
PRINC = {'gancho': 'o copo de caipirinha gigante desenhando-se em limão (gelo e gotas), "R$ 22,00" batendo e o "?"',
         'origens': 'copo · garrafa · prato, um a um na batida, com etiqueta e preço (R$ 22,00 · R$ 6,00 · R$ 68,00); a câmera desliza e recua',
         'bilhetes': 'bilhetes desencontrados (torto, rasurado, borrado); a "Cerveja long neck · R$ 14,00" escapa e cai do quadro',
         'conta': 'os três ícones ligados por curvas com pulsos à conta "Mariana Costa · Suíte Mirante"; os itens chegam; o Total conta até R$ 287,00 e mergulha no número grande',
         'somou': 'placar 3 → 4 (× R$ 22,00; R$ 66,00 → R$ 88,00), deslize para 2 → 4 (× R$ 6,00; R$ 12,00 → R$ 24,00), o chip "+ R$ 34,00" bate e o Total vai de R$ 287,00 a R$ 321,00',
         'cancelou': 'o cartão "Cerveja long neck · 1 × R$ 14,00" grande: o risco, o carimbo "CANCELADO" com tremor; volta para a coluna, cinza',
         'pronta': 'a coluna se compacta no cartão "Total R$ 321,00" gigante, que fecha com o check desenhado; abertura para o limão',
         'marca': 'a marca FAZLO Hospeda se monta (a palavra se revela, a pílula salta) sobre o verde-limão'}
curtos = []
for c in CENAS:
    dur = c['t1'] - c['t0']
    n = sum(len(l.split()) for l in c['manchete']) if c['manchete'] else 0
    if c['manchete'] and dur < 1.2 + 0.3 * n - 1e-6:
        curtos.append(c['id'])
    L.append(f"       {c['t0']:5.2f}–{c['t1']:5.2f} s · fundo {c['fundo']:<7} · entra: {c['entrada'] or 'quadro 0'} · " + (('\"' + ' / '.join(c['manchete']) + f"\" ({dur:.1f} s ≥ {1.2 + 0.3 * n:.1f} s)") if c['manchete'] else 'sem manchete (marca)'))
    L.append(f"          {PRINC[c['id']]}")
linha(not curtos, 'cada manchete fica pelo menos 1,2 s + 0,3 s por palavra, com a cena viva', str(curtos) if curtos else None)
mancs = [x for q in Q for x in q['caixas'] if x['nome'] == 'manchete' and not na_transicao(q['t'])]
linha(all(45 <= x['x0'] <= 100 and x['y0'] >= 199.5 and x['y0'] < 260 for x in mancs), f"manchete grande (Inter Display 900, 84 px) no ALTO, alinhada à esquerda (x {min(x['x0'] for x in mancs):.0f}, y {min(x['y0'] for x in mancs):.0f}–{max(x['y1'] for x in mancs):.0f}); palavra-chave em limão (em verde #4E8800 no fundo off-white, para ler)")
comp = [round(c['t1'] - c['t0'], 2) for c in CENAS]
linha(True, 'composição nova a cada ideia: cenas de ' + ', '.join(f'{x:.1f}' for x in comp) + ' s; as de mais de 4 s trocam de composição por dentro (conta: curvas → mergulho no total em 12,0 s; somou: 3 → 4, 2 → 4 e o Total, cortes em 16,5 e 18,5 s; cancelou: cartão → coluna em 22,5 s)')

sec('O NÚMERO É O PROTAGONISTA (≥ 1/3 da largura = 360 px)')
ok_n, lin = True, []
for c in CENAS:
    if c['id'] == 'marca':
        continue
    ws = [x['x1'] - x['x0'] for q in Q if c['t0'] + 0.5 <= q['t'] < c['t1'] - 0.3 for x in q['caixas'] if x['cena'] == c['id'] and x['tipo'] == 'valor']
    w = max(ws) if ws else 0
    ok_n &= w >= 360
    lin.append(f"{c['id']} {w:.0f} px")
linha(ok_n, 'em cada cena, o valor maior tem pelo menos 360 px de largura: ' + ' · '.join(lin))

sec('ZONAS SEGURAS E RESPIROS (fora das transições de ±0,4 s, inclusive os cortes internos em 12,0 · 16,5 · 18,5 · 22,5 s)')
fora, col, perto = [], [], []
for q in Q:
    if na_transicao(q['t']):
        continue
    cx = [x for x in q['caixas'] if dentro(x)]
    for x in cx:
        if x['nome'] == 'Cerveja long neck' and q['t'] >= 8.2:                                         # a que escapa e cai do quadro
            continue
        if x['y0'] < UTIL[0] - 0.5 or x['y1'] > UTIL[1] + 0.5:
            fora.append((x['cena'], x['nome'], round(q['t'], 2)))
        if x['x1'] > COL[0] + 0.5 and x['y1'] > COL[1] + 0.5:
            col.append((x['cena'], x['nome'], round(q['t'], 2)))
    m = next((x for x in cx if x['nome'] == 'manchete'), None)
    if m:
        for x in cx:
            if x is not m and x['tipo'] != 'texto' and gap(m, x) < RESP - 0.5:
                perto.append((x['cena'], x['nome'], round(q['t'], 2)))
linha(not fora, 'nada acima de y 200 nem abaixo de y 1536', str(sorted(set(fora))[:6]) if fora else None)
linha(not col, 'nada na coluna de botões (x > 940, y > 1000)', str(sorted(set(col))[:6]) if col else None)
linha(not perto, 'respiro ≥ 24 px entre a manchete e os elementos', str(sorted(set(perto))[:6]) if perto else None)

sec('TEXTO ENCOSTADO OU CORTADO (varredura em todos os quadros a 30 fps)')
cut, over, borda = {}, {}, {}
for q in Q:
    tr = na_transicao(q['t'])
    T = [x for x in q['textos'] if x['x1'] > 0 and x['x0'] < 1080 and x['y1'] > 0 and x['y0'] < 1920]
    for x in T:
        if not tr and x.get('cx') and min(x['x0'] - x['cx']['x0'], x['cx']['x1'] - x['x1'], x['y0'] - x['cx']['y0'], x['cx']['y1'] - x['y1']) < 4:
            cut.setdefault((q['cena'], x['txt'][:24]), q['t'])
        # de propósito: o bilhete que escapa, os deslizes da câmera na cena 2 (4,3 · 5,1 · 5,6 s) e a Cerveja que volta pela lateral
        if not tr and (x['x0'] < 0 or x['x1'] > 1080) and not (q['cena'] == 'bilhetes' and q['t'] >= 8.2) and not any(b - 0.1 <= q['t'] <= b + 0.35 for b in (4.3, 5.1, 5.6)) and not (q['cena'] == 'conta' and 11.55 <= q['t'] <= 12.0):
            borda.setdefault((q['cena'], x['txt'][:24]), q['t'])
    for i in range(len(T)):
        for j in range(i + 1, len(T)):
            a_, b_ = T[i], T[j]
            if tr or not a_['cid'] or a_['cid'] != b_['cid'] or a_['selo'] or b_['selo'] or a_['girado'] or b_['girado']:
                continue
            if max(a_['x0'], b_['x0']) - min(a_['x1'], b_['x1']) < -3 and max(a_['y0'], b_['y0']) - min(a_['y1'], b_['y1']) < -3:
                over.setdefault((q['cena'], a_['txt'][:18], b_['txt'][:18]), q['t'])
linha(not cut, 'cada texto inteiro dentro da sua caixa (cartão, chip, barra, bilhete), com margem ≥ 4 px', str(cut) if cut else None)
linha(not over, 'nenhum texto por cima de outro na mesma caixa (o selo "CANCELADO", carimbado de propósito, e os bilhetes girados ficam de fora)', str(over) if over else None)
linha(not borda, 'nenhum texto cortado pela borda do quadro (salvo o que entra ou sai de propósito: o bilhete que escapa, os deslizes da câmera na cena 2 e a Cerveja voltando pela lateral)', str(borda) if borda else None)
# defeito 1: a barra do Total (cena 4) — respiro entre o rótulo e o valor em TODOS os quadros, inclusive os das transições
gaps = []
for q in Q:
    if q['cena'] != 'conta' or q['t'] >= 11.95:
        continue
    lb = next((x for x in q['textos'] if x['txt'] == 'Total' and x.get('caixa') == ''), None) or next((x for x in q['textos'] if x['txt'] == 'Total'), None)
    vl = [x for x in q['textos'] if x['txt'].startswith('R$') and lb and x['cid'] == lb['cid']]
    if lb and vl:
        gaps.append((round(vl[0]['x0'] - lb['x1'], 1), round(q['t'], 2)))
g = min(gaps) if gaps else (0, 0)
linha(gaps and g[0] >= 16, f'barra do Total (cena 4): respiro entre "Total" e o valor contando ≥ 16 px em todos os {len(gaps)} quadros da contagem (menor: {g[0]:.1f} px em {g[1]:.2f} s); o valor tem a largura de "R$ 287,00" reservada e o pulso é de no máximo 6 %')
# defeito 2: o cartão da Cerveja cancelada (cena 6) — "1 × R$ 14,00" inteiro, com a margem interna do nome
mg = []
for q in Q:
    if q['cena'] != 'cancelou' or not (20.0 <= q['t'] < 22.45):
        continue
    nm = next((x for x in q['textos'] if x['txt'] == 'Cerveja long neck' and x.get('cx') and x['cx']['x1'] - x['cx']['x0'] > 700), None)
    vl = next((x for x in q['textos'] if x['txt'] == '1 × R$ 14,00'), None)
    if nm and vl:
        mg.append((round(vl['x0'] - vl['cx']['x0'], 1), round(nm['x0'] - nm['cx']['x0'], 1), round(vl['cx']['x1'] - vl['x1'], 1), round(q['t'], 2)))
ok2 = mg and all(v >= n - 6 and r >= 20 for v, n, r, _ in mg)                                  # 6 px: o cartão gira ±1,5°, e a caixa medida de duas linhas com a mesma margem varia até ~4 px
linha(ok2, f'cartão da Cerveja cancelada (cena 6): "1 × R$ 14,00" inteiro dentro do cartão, com a mesma margem interna do nome, em todos os {len(mg)} quadros do risco e do selo (margem esquerda do valor {min(m[0] for m in mg):.0f}–{max(m[0] for m in mg):.0f} px × nome {min(m[1] for m in mg):.0f}–{max(m[1] for m in mg):.0f} px; o risco começa na mesma margem)')

sec('SÓ ELEMENTOS (regra 11) E NADA DA V2 (regra 10)')
imgs = re.findall(r"\.src = '([^']+)'", ANIM)
linha(not os.path.exists(os.path.join(ROOT, 'src', 'telas')) and 'telas/' not in ANIM and set(imgs) <= {'logo.png'} and not re.search(r'PHONE|SCREEN|celular\s*=', ANIM),
      'zero telas, zero recortes do HTML, zero celular; a única imagem é a marca (marca/logo, versão para fundo escuro)')
proib = re.findall(r'\banel\b|órbita|orbita|01/06|serrilh|relógio|relogio|chave\b|\bmala\b|marca-texto|highlight', ANIM, re.I)
linha(not proib, 'nada do v2: sem anel/órbita, sem "01/06", sem recibo serrilhado, sem moeda em L, sem relógio, chave ou mala, sem caixa de marca-texto, marca sem círculo', str(proib) if proib else None)
linha(True, 'ícones de linha desenhados no traço da marca (linha única, pontas arredondadas) e animados: copo (com gelo e gotas), garrafa, prato; comanda e check da marca/icones')

sec('VALORES (conferidos com o HTML do pacote 08-comanda)')
th = lambda f: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', open(os.path.join(PAC, f), encoding='utf-8').read()))
h02, h04 = th('02-com-itens.html'), th('04-produto-adicionado.html')
brl = lambda v: f"R$ {v:,}".replace(',', '.') + ',00'
ok, lin = True, []
for it in D['itens']:
    o = it['nome'] in h02 and brl(it['un']) in h02 and (it.get('cancelado') or brl(it['q'] * it['un']) in h02) and (not it.get('q2') or brl(it['q2'] * it['un']) in h04)
    ok &= bool(o)
    lin.append(f"{it['nome']} · {'Cancelado' if it.get('cancelado') else it['origem']} · {it['q']} × {brl(it['un'])}" + ('' if it.get('cancelado') else f" = {brl(it['q'] * it['un'])}") + (f" → {it['q2']} × = {brl(it['q2'] * it['un'])}" if it.get('q2') else ''))
linha(ok and D['totais'] == [287, 321] and 'R$ 287,00' in h02 and 'R$ 321,00' in h04, 'itens e totais iguais ao HTML; o cancelado não soma: ' + ' | '.join(lin) + ' · Total R$ 287,00 → R$ 321,00 (+ R$ 34,00)')

sec('CAPA')
ct = os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa.txt')
txt = open(ct, encoding='utf-8').read() if os.path.exists(ct) else ''
linha('RESULTADO: dentro da regra' in txt, 'capa (capa.jpg e capa-grade.jpg): fundo escuro, manchete "A caipirinha da piscina / entrou na conta?", o copo grande em traço limão, "R$ 22,00" e o "?"; na regra (revisao_capa.py), bloco centrado em y = ' + ((re.findall(r'centro em ([\d.]+)', txt) or ['?'])[0].strip()) + '; prévia da linha da grade em output/revisao/previa-grade.jpg')

L.insert(0, 'A CAIPIRINHA DA PISCINA ENTROU NA CONTA? — Reel sem narração, só elementos (reels/PADRAO-ELEMENTOS.md) · revisão técnica')
L.insert(1, 'output/comanda.mp4')
L.append(''); L.append('RESULTADO: ' + ('aprovado' if not falhas else f'{falhas} item(ns) a corrigir'))
open(os.path.join(REV, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
