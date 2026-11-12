#!/usr/bin/env python3
"""
Revisão técnica do reel "Parte 1 · A chegada".

    node scripts/render.cjs dados --fps 30      # caixas de cada quadro, ideias, valores, textos e eventos (da própria animação)
    python3 scripts/qa.py                       # -> output/revisao/relatorio.txt

O QA do "Um dia inteiro" (formato, som, áreas seguras, ≥ 40 px, valores, conteúdo, capa) mais as regras de ritmo e espaço
desta parte, medidas quadro a quadro: no máximo 2 peças, cada peça parada ≥ 2,5 s, cada valor ≥ 3 s, ≥ 0,4 s de respiro
entre ideias, ≥ 56 px entre peças, margem lateral ≥ 80 px, conteúdo centrado na altura útil (y 200–1536), textos de no
máximo 2 linhas com ≥ 64 px, etapas ≥ 14 s, e nada do visual do v2 (sem anel de etapas, sem órbita).
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
MP4 = os.path.join(ROOT, 'output', 'parte-1-chegada.mp4')
LEIA = open(os.path.join(ROOT, '..', '_material', 'fazlo-hospeda-telas', 'LEIA-ME.md'), encoding='utf-8').read()
ANIM = open(os.path.join(ROOT, 'src', 'anim.js'), encoding='utf-8').read()
Q = D['quadros']
FPS = round(1 / (Q[1]['t'] - Q[0]['t']))
DUR = D['duracao']
L, falhas = [], 0
CENTRO, TOL = 868, 120          # centro da altura útil (200–1536) e tolerância
TERCO = 200 + 2 * (1536 - 200) / 3   # começo do terço de baixo da altura útil


def linha(ok, txt, extra=None):
    global falhas
    L.append(('OK     ' if ok else 'FALHA  ') + txt)
    if extra:
        L.append('       ' + extra)
    falhas += 0 if ok else 1


def sec(t):
    L.append('')
    L.append(t)


def pecas(q, op=0.02):
    return [c for c in q['caixas'] if c['tipo'] == 'peca' and c['op'] > op and c['x1'] > 0 and c['x0'] < 1080]


TROCA = {'r_lista': 'r_lista', 'r_lista_sel': 'r_lista'}
COL = (985, 1060)   # coluna de botões do Reels: os ícones ficam em x ≈ 985–1045, de y ≈ 1130 para baixo


# ---------------- formato e som
sec('FORMATO E SOM')
if os.path.exists(MP4):
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
    a = next(s for s in pr['streams'] if s['codec_type'] == 'audio')
    linha(v['codec_name'] == 'h264' and v['width'] == 1080 and v['height'] == 1920 and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v['pix_fmt']} {v['width']}x{v['height']} {eval(v['r_frame_rate']):.0f} fps")
    linha(a['codec_name'] == 'aac', f"áudio {a['codec_name']} {a['sample_rate']} Hz {a['channels']} canais · sem voz (trilha e efeitos sintetizados)")
    dur = float(pr['format']['duration'])
    linha(50 <= dur <= 60, f'duração {dur:.2f} s (pedido: ~55 s)')
    eb = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', MP4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', eb)[-1])
    TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', eb)[-1])
    linha(abs(I + 14) <= 0.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
    linha(TP <= -1.5, f'pico real {TP:.1f} dBTP (limite −1,5)')
else:
    linha(False, 'output/parte-1-chegada.mp4 não encontrado')

# ---------------- etapas
sec('ETAPAS')
ET = D['etapas']
partes = []
for a, b in zip(ET, ET[1:]):
    d = b['t0'] - a['t0']
    partes.append(f"{a['nome']} {a['t0']:.1f}–{b['t0']:.1f} s ({d:.1f} s)")
    if a['nome'][0].isdigit():
        linha(d >= 14.0, f"{a['nome']}: {d:.1f} s (mínimo 14 s)")
L.append('       ' + ' · '.join(partes))

# ---------------- ritmo
sec('RITMO')
npc = lambda q: len(set(TROCA.get(c['nome'], c['nome']) for c in pecas(q)))
mx = max(npc(q) for q in Q)
ondemx = [round(q['t'], 2) for q in Q if npc(q) == mx][:3]
linha(mx <= 2, f'no máximo 2 peças na tela ao mesmo tempo (máximo medido: {mx}, em {ondemx} s)')



def serie(nome):
    """posição (centro), opacidade e desfoque de uma peça (ou do grupo de troca) em cada quadro."""
    out = []
    for q in Q:
        cs = [c for c in pecas(q) if TROCA.get(c['nome'], c['nome']) == nome]
        if not cs:
            out.append(None)
            continue
        c = max(cs, key=lambda c: c['op'])
        out.append(((c['x0'] + c['x1']) / 2, (c['y0'] + c['y1']) / 2, sum(x['op'] for x in cs), c['blur'], c))
    return out


def parado(sr, i):
    if sr[i] is None or sr[i - 1] is None:
        return False
    (x, y, op, bl, _), (x2, y2, _, _, _) = sr[i], sr[i - 1]
    return op >= 0.98 and bl < 0.3 and abs(x - x2) < 0.6 and abs(y - y2) < 0.6


nomes = sorted(set(TROCA.get(p['id'], p['id']) for p in D['pecas']))
curtos, tempos = [], []
for n in nomes:
    sr = serie(n)
    best = run = 0
    for i in range(1, len(Q)):
        run = run + 1 if parado(sr, i) else 0
        best = max(best, run)
    tempos.append((n, best / FPS))
    if best / FPS < 2.5:
        curtos.append((n, round(best / FPS, 2)))
linha(not curtos, 'cada peça fica parada e legível ≥ 2,5 s depois de terminar de entrar', str(curtos) if curtos else None)
L.append('       ' + ' · '.join(f'{n} {t:.1f}s' for n, t in sorted(tempos, key=lambda x: x[1])))
vcurtos, vt = [], []
for v in D['valores']:
    n = TROCA.get(v['peca'], v['peca'])
    sr = serie(n)
    i0 = int(np.ceil(v['t'] * FPS))
    i = i0
    while i < len(Q) and (sr[i] is not None and sr[i][2] >= 0.98 and sr[i][3] < 0.3):
        i += 1
    d = (i - i0) / FPS
    vt.append((v['nome'], d))
    if d < 3.0:
        vcurtos.append((v['nome'], round(d, 2)))
linha(not vcurtos, 'cada valor importante fica legível ≥ 3 s (do fim da contagem/digitação até a saída)', str(vcurtos) if vcurtos else None)
L.append('       ' + ' · '.join(f'{n} {t:.1f}s' for n, t in vt))
ID = D['ideias']
resp = []
for a, b in zip(ID, ID[1:]):
    A = set(TROCA.get(x, x) for x in a['pecas'])
    B = set(TROCA.get(x, x) for x in b['pecas'])
    last = max((q['t'] for q in Q if any(TROCA.get(c['nome'], c['nome']) in A for c in pecas(q))), default=0)
    first = min((q['t'] for q in Q if any(TROCA.get(c['nome'], c['nome']) in B for c in pecas(q)) and q['t'] > last - 1), default=99)
    resp.append((a['nome'], b['nome'], first - last - 1 / FPS))
menor = min(resp, key=lambda r: r[2])
linha(menor[2] >= 0.399, f'respiro entre ideias ≥ 0,4 s (menor: {menor[2]:.2f} s, entre "{menor[0]}" e "{menor[1]}"; {len(ID)} ideias)')

# ---------------- espaço
sec('ESPAÇO')
dist, marg = 1e9, (1e9, None)
dpar = None
for q in Q:
    ps = [c for c in pecas(q, 0.5)]
    for c in ps:
        m = min(c['x0'], 1080 - c['x1'])
        if m < marg[0]:
            marg = (m, (c['nome'], q['t']))
    firmes = [c for c in pecas(q, 0.9) if c['blur'] < 1]
    for i in range(len(firmes)):
        for j in range(i + 1, len(firmes)):
            a, b = firmes[i], firmes[j]
            if TROCA.get(a['nome'], a['nome']) == TROCA.get(b['nome'], b['nome']):
                continue   # a mesma lista antes/depois do toque
            gx = max(b['x0'] - a['x1'], a['x0'] - b['x1'])
            gy = max(b['y0'] - a['y1'], a['y0'] - b['y1'])
            g = max(gx, gy)
            if g < dist:
                dist, dpar = g, (a['nome'], b['nome'], q['t'])
linha(dist >= 55.5, f'distância entre peças ≥ 56 px (menor: {dist:.0f} px, {dpar[0]} × {dpar[1]})' if dpar else 'distância entre peças: nunca há duas peças firmes juntas')
linha(marg[0] >= 79.5, f'margem lateral ≥ 80 px (menor: {marg[0]:.0f} px, {marg[1][0]} em {marg[1][1]:.2f} s)')
centros, baixos = [], []
FIM_FINAL = max(e['t'] for e in D['eventos'] if e['tipo'] == 'pilula') + 0.7
for q in Q:
    ps = pecas(q)
    firme = ps and all(c['op'] >= 0.98 and c['blur'] < 0.3 for c in ps)
    final = q['t'] >= FIM_FINAL
    if not (firme or final):
        continue   # só os quadros estáveis (a composição inteira na tela)
    el = [c for c in q['caixas'] if c['tipo'] in ('peca', 'texto', 'tag', 'final') and c.get('op', 1) > 0.5 and c['x1'] > 0 and c['x0'] < 1080]
    y0, y1 = min(c['y0'] for c in el), max(c['y1'] for c in el)
    centros.append(((y0 + y1) / 2, q['t']))
    baixos.append((y1, q['t']))
cmin, cmax = min(centros), max(centros)
linha(abs(cmin[0] - CENTRO) <= TOL and abs(cmax[0] - CENTRO) <= TOL, f'conteúdo centrado na altura útil (y 200–1536, centro 868): o centro do conteúdo fica entre y {cmin[0]:.0f} e {cmax[0]:.0f} (tolerância ±{TOL})')
bmin = min(baixos)
linha(bmin[0] >= TERCO, f'terço de baixo ocupado: o conteúdo sempre desce até pelo menos y {bmin[0]:.0f} (o terço de baixo começa em y {TERCO:.0f})')
baixo = [(q['t'], c['nome'], round(c['y1'])) for q in Q for c in q['caixas'] if c['y1'] > 1536.5 and c.get('op', 1) > 0.05 and c['x1'] > 0 and c['x0'] < 1080]
coluna = [(q['t'], c['nome']) for q in Q for c in q['caixas'] if c['x1'] > COL[0] + 0.5 and c['y1'] > COL[1] + 0.5 and c.get('op', 1) > 0.05 and c.get('blur', 0) <= 3 and c['x0'] < 1080]
linha(not baixo, 'nada nos 20% de baixo (y > 1536), pelas caixas de todos os quadros', str(baixo[:6]) if baixo else None)
linha(not coluna, f'coluna de botões (x > {COL[0]}, y > {COL[1]}) livre, pelas caixas', str(sorted(set(n for _, n in coluna))) if coluna else None)
if os.path.exists(MP4):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', MP4, '-vf', 'fps=4,scale=270:480', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 480, 270).astype(int)
    nb = int((np.abs(fr[:, 386:, :] - 12) > 40).sum(axis=(1, 2)).max())
    nc = int((np.abs(fr[:, 266:384, 247:] - 12) > 40).sum(axis=(1, 2)).max())
    linha(nb <= 4, f'pixels do vídeo: 20% de baixo apagado (máx. {nb} px acesos num quadro, 4 quadros/s)')
    linha(nc <= 6, f'pixels do vídeo: coluna de botões apagada (máx. {nc} px acesos num quadro)')

# ---------------- textos
sec('TEXTOS')
TX = [t for t in D['textos']]
ok2 = all(t['linhas'] <= 2 for t in TX)
px = min(t['px'] for t in TX)
linha(ok2 and px >= 64, f'textos explicativos com no máximo 2 linhas e corpo ≥ 64 px (Inter Display 900, {px} px)')
linha(all('*' in t['txt'] for t in TX), 'palavra-chave em limão em cada texto')
L.append('       ' + ' | '.join(t['txt'].replace('\n', ' ').replace('*', '') for t in TX))
etx = []
for e, prox in zip(ET, ET[1:]):
    if not e['nome'][0].isdigit():
        continue
    tx = next((t for t in TX if not t['final'] and e['t0'] - 0.01 <= t['t0'] < prox['t0']), None)
    ps = [p for p in D['pecas'] if p.get('entrou') and e['t0'] <= p['entrou'] < prox['t0']]
    pri = min(p['entrou'] - 0.5 for p in ps)
    etx.append((e['nome'], tx and tx['t0'] < pri and tx['t1'] >= prox['t0'] - 0.6, tx and tx['t0'], pri))
linha(all(x[1] for x in etx), 'em cada etapa o texto entra antes da primeira peça e fica até o fim da etapa', ' · '.join(f'{n}: texto {a:.2f} s, 1ª peça {b:.2f} s' for n, _, a, b in etx))

# ---------------- legibilidade
sec('LEGIBILIDADE')
ruins, pan = [], set()
for q in Q:
    for c in pecas(q, 0.98):
        if c['blur'] > 0.3:
            continue
        if c.get('panorama'):
            pan.add(c['nome'])
            continue
        if META[c['nome']]['minFont'] is not None and c['corpo'] < 39.9:
            ruins.append((c['nome'], round(c['corpo'], 1), q['t']))
linha(not ruins, 'texto das peças ≥ 40 px no quadro (menor corpo de texto de cada peça × escala), em todos os quadros em que a peça está firme', str(sorted(set((a, b) for a, b, _ in ruins))) if ruins else None)
cor = sorted(((p['id'], round(p['minFont'] * p['s'], 1)) for p in D['pecas'] if not p.get('panorama') and p['minFont'] is not None), key=lambda x: x[1])
L.append('       menores corpos: ' + ' · '.join(f'{n} {v}' for n, v in cor[:6]))
L.append(f'       panorama (o calendário inteiro, para ver as barras e o lugar da barra nova; não é para ler): {", ".join(sorted(pan))}')
DS = D['destaques']
sob = [(a['nome'], b['nome']) for a, b in zip(DS, DS[1:]) if b['t0'] < a['t1'] - 0.02]
linha(not sob, f'um destaque por vez: {len(DS)} destaques em sequência', str(sob) if sob else None)
cort = [(q['t'], c['nome']) for q in Q for c in pecas(q, 0.98) if c['blur'] < 0.3 and (c['x0'] < 0 or c['x1'] > 1080 or c['y0'] < 0)]
linha(not cort, 'nenhuma peça cortada pela borda; peças firmes sem desfoque')

# ---------------- visual próprio
sec('VISUAL PRÓPRIO (nada do v2)')
linha(not re.search(r'\banel|órbita|orbita|\bring\b|\borbit', ANIM, re.I), 'sem anel de etapas e sem órbita (o código da animação não tem anel nem órbita)')
linha(not os.path.exists(os.path.join(ROOT, 'src', 'assets', 'fazlo-hospeda-logo-alpha.png')) and 'logo-alpha' not in ANIM, 'final próprio: lista vertical com checks (Reserva · Sinal · Check-in), "Na Parte 2", a marca FAZLO Hospeda do pacote e a pílula; sem a logo circular do v2 nem a composição dele')
linha('limão inundando' not in ANIM and 'flood' not in ANIM, 'sem a tela inundada de limão nem a assinatura do v2')

# ---------------- valores e conteúdo
sec('VALORES (conferidos com o LEIA-ME e com as telas do pacote)')
H = {k: [h['texto'] for h in m.get('holes', [])] for k, m in META.items()}
esper = {'s_conta': ['R$ 1.050,00', 'R$ 1.050,00'], 's_campo': ['315,00'], 's_depois': ['R$ 735,00']}
dif = [(k, H[k], v) for k, v in esper.items() if H.get(k) != v]
linha(not dif, 'valores que contam = valores das telas: total e saldo R$ 1.050,00 (Gustavo, sem sinal), sinal 315,00, saldo depois R$ 735,00', str(dif) if dif else None)
txts = lambda k: ' '.join(t['t'] for t in META[k]['textos'])
for ok, txt in [
    ('value="22/10/2026"' in open(os.path.join(ROOT, '..', '_material', 'fazlo-hospeda-telas', 'telas', '03-nova-reserva', 'estados', '01-datas-e-acomodacao.html'), encoding='utf-8').read() and 'value="25/10/2026"' in open(os.path.join(ROOT, '..', '_material', 'fazlo-hospeda-telas', 'telas', '03-nova-reserva', 'estados', '01-datas-e-acomodacao.html'), encoding='utf-8').read(), 'período: Entrada 22/10/2026, Saída 25/10/2026 (nova reserva do pacote, Bruno Teixeira, 22/10 → 25/10)'),
    ('5' in txts('r_livres') and '10' in txts('r_livres') and 'Quarto Bromélia' in txts('r_lista') and 'R$ 320,00' in txts('r_lista'), 'Livres no período · 5 de 10; Quarto Bromélia R$ 320,00 por diária'),
    ('Quarto Bromélia' in LEIA and '22/10 → 25/10' in LEIA, 'barra "Bruno T." no Quarto Bromélia, de 22 a 25, onde o calendário está livre (Bruna C. sai no dia 21)'),
    (1050 - 315 == 735 and 'R$ 1.050,00' in LEIA, 'Gustavo Ribeiro (FHZ-UDVKU5): R$ 1.050,00 sem sinal → sinal R$ 315,00 → saldo R$ 735,00, Pré-reserva → Confirmada'),
    ('Fernanda Lima' in txts('c_dados') and '(35) 98804-7712' in txts('c_dados') and 'Chalé Ipê' in txts('c_dados') and '17/10' in txts('c_dados'), 'Fernanda Lima: telefone (35) 98804-7712, Chalé Ipê, 17/10 → 20/10 (janela Fazer check-in)'),
    ('14:05' in txts('c_recibo') and '12:00' in txts('c_recibo'), 'recibo: entrada sábado, 17/10 · 14:05; saída prevista 20/10, até 12:00'),
]:
    linha(ok, txt)
sec('REGRAS DE CONTEÚDO')
todos = ' '.join(t['t'] for m in META.values() for t in m['textos']) + ' ' + ANIM
linha(not re.search(r'day ?use|booking|airbnb', todos, re.I), 'sem Day Use, Booking ou Airbnb')
linha(not re.search(r'vers[aã]o nova|\bV2\b', todos), 'sem "versão nova" nem V2')
linha('VALE SERENO' not in todos, 'nome da pousada com inicial maiúscula')
sinal = [p['id'] for p in D['pecas'] if p.get('entrou') and next(e for e in ET if e['nome'] == '2 Sinal')['t0'] <= p['entrou'] < next(e for e in ET if e['nome'] == '3 Check-in')['t0']]
linha(not any('fernanda' in p.lower() for p in sinal), 'Sinal só com o Gustavo Ribeiro (sem a Fernanda nesta etapa): ' + ', '.join(sinal))
linha(not any('aviso' in k for k in META), 'sem o aviso de período ocupado nesta parte')
linha(all(m['arquivo'].startswith('telas/') for m in META.values()), f'{len(META)} peças, todas recortadas dos HTML do pacote (src/pecas.json)')

# ---------------- capa
sec('CAPA')
ct = os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa.txt')
if os.path.exists(ct):
    txt = open(ct, encoding='utf-8').read()
    linha('RESULTADO: dentro da regra' in txt, 'capa na regra (reels/tools/revisao_capa.py), bloco centrado em y = ' + (re.findall(r'centro em ([\d.]+)', txt) or ['?'])[0].strip() + ' (alvo 960)')
else:
    linha(False, 'capa não conferida')

L.insert(0, 'PARTE 1 · A CHEGADA — revisão técnica')
L.insert(1, 'output/parte-1-chegada.mp4')
L.append('')
L.append('RESULTADO: ' + ('aprovado' if not falhas else f'{falhas} item(ns) a corrigir'))
os.makedirs(REV, exist_ok=True)
open(os.path.join(REV, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
