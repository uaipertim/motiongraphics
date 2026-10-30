#!/usr/bin/env python3
"""
Revisão técnica do reel de marca "Tudo num lugar só".

    python3 scripts/qa.py            -> confere output/previa.mp4 (sem voz, tempos estimados)
    python3 scripts/qa.py --final    -> confere output/tudo-num-lugar.mp4 (com a narração)
    (rodar depois de `node scripts/render.cjs info` e do vídeo)

Gera output/revisao/relatorio[-final].txt, output/revisao/zonas-seguras.jpg, output/capa.png + capa.jpg (a capa, desenhada
à parte: `render.cjs capa`) e a revisão da capa (../../tools/revisao_capa.py). Confere:
  • formato: 1080×1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo; vídeo e áudio com a mesma duração (mux com -t);
  • som: pico real ≤ −1,5 dBTP; com a narração, −14 LUFS (±0,5); na prévia, a trilha no nível em que fica debaixo da voz;
  • cenas: 7, uma por ideia (corte só na troca de ideia), nenhuma com menos de 2,5 s; duração 30–34 s;
  • leitura: toda palavra ou número de destaque fica ≥ 1,2 s parado DEPOIS que a fala termina de dizê-lo; nos cartões,
    sem desfoque de movimento nessa janela e inclinados (rotateY −24° a −18°, rotateX 8° a 12°), nunca de frente;
  • desfoque de movimento só nas entradas dos cartões (≤ 0,3 s); os módulos ficam todos visíveis juntos ≥ 1 s no fim;
    cada um dos 2 pedaços fica ≥ 2 s em foco;
  • legenda só nos módulos, nos pedaços e na chamada: nas outras cenas, a faixa fica vazia (caixas e pixels) e toda palavra
    falada aparece no texto grande da cena; nas cenas com legenda, toda palavra falada aparece na legenda;
  • legenda: dentro da faixa y 1424–1536, x 150–950; cada página ≥ 1,5 s, sem sobreposição; sem palavra órfã (página
    de uma palavra só ou linha com uma palavra só embaixo/em cima de uma linha cheia); não encosta em nada da cena;
  • áreas seguras (pixels a 4 quadros/s): nada além do fundo em y > 1536 nem em x ≥ 950 entre y 1060 e 1560 (o fundo é
    medido em cada quadro: preto ou limão); e as caixas do motor fora dessas áreas;
  • os cartões: os 5 módulos e os 2 pedaços aparecem de frente;
  • "Exemplo fictício": em todo quadro amostrado em que um valor em reais aparece, o selo está no mesmo cartão;
    valores só nos cartões do sinal (R$ 450) e do check-out (R$ 1.020);
  • contraste sobre o limão (WCAG): texto preto no limão e as chaves (limão na pílula preta) ≥ 7:1;
  • grafia oficial na legenda (nenhuma grafia fonética); nenhuma tela do sistema (só a logo e, se configurada, a tela
    do telaDestaque).
"""
import json
import os
import re
import subprocess
import sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FINAL = '--final' in sys.argv
OUT = os.path.join(ROOT, 'output'); REV = os.path.join(OUT, 'revisao'); os.makedirs(REV, exist_ok=True)
VIDEO = os.path.join(OUT, 'tudo-num-lugar.mp4' if FINAL else 'previa.mp4')
LN = json.load(open(os.path.join(ROOT, 'linha.json')))
INFO = json.load(open(os.path.join(OUT, 'info.json')))
DUR = LN['duracao']
rep, falhas = [], []


def ok(cond, msg):
    rep.append(('OK     ' if cond else 'FALHA  ') + msg)
    if not cond:
        falhas.append(msg)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


# ---------------------------------------------------------------- formato
rep.append('FORMATO')
pr = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO]).stdout)
v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in pr['streams'] if s['codec_type'] == 'audio'][0]
fps = eval(v['r_frame_rate']); vd = float(v['duration']); ad = float(a['duration'])
ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p' and (v['width'], v['height']) == (1080, 1920) and abs(fps - 60) < 0.01,
   f"vídeo {v['codec_name']} {v['pix_fmt']} {v['width']}x{v['height']} {fps:.0f} fps")
ok(a['codec_name'] == 'aac' and a['sample_rate'] == '48000' and a['channels'] == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz {a['channels']} canais")
ok(abs(vd - DUR) < 0.05 and 30 <= vd <= 34, f'duração {vd:.2f} s (alvo 30–34 s; linha do tempo: {DUR:.2f} s{"" if FINAL else ", estimada"})')
ok(abs(vd - ad) < 0.05, f'vídeo e áudio com a mesma duração (Δ {abs(vd - ad) * 1000:.0f} ms)')

# ---------------------------------------------------------------- som
rep.append(''); rep.append('SOM')
e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
s = e[e.rindex('Summary:'):]
I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)); TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))
if FINAL:
    ok(-14.5 <= I <= -13.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
else:
    ok(I < -18, f'prévia sem voz: trilha e efeitos em {I:.1f} LUFS, o nível em que ficam debaixo da narração (o master com a voz fica em −14)')
ok(TP <= -1.5, f'pico real {TP:.1f} dBTP (limite −1,5)')

# ---------------------------------------------------------------- cenas, leitura e desfoque
rep.append(''); rep.append('CENAS E LEITURA')
PL = INFO['plano']; CN = PL['cenas']
ok(len(CN) == 7 and min(c['t1'] - c['t0'] for c in CN) >= 2.5, f'{len(CN)} cenas, uma por ideia; a mais curta tem {min(c["t1"] - c["t0"] for c in CN):.2f} s (mínimo 2,5 s)')
rep.append('       ' + ' · '.join(f'{c["id"]} {c["t0"]:.2f}–{c["t1"]:.2f} ({c["t1"] - c["t0"]:.2f} s)' for c in CN))
LE = PL['leitura']
curt = [l for l in LE if l['parado'] < 1.2 - 1e-6]
ok(not curt, f'{len(LE)} destaques; cada um fica ≥ 1,2 s parado depois de dito (o menor: {min(l["parado"] for l in LE):.2f} s)' + ('' if not curt else ' · curtos: ' + ', '.join(f'{l["texto"]} {l["parado"]:.2f} s' for l in curt)))
rep.append('       ' + ' · '.join(f'{l["texto"]} {l["parado"]:.1f}s' for l in LE))
cards = [l for l in LE if 'cartao' in l]
ok(all(l['rastro_max'] == 1 for l in cards), 'nenhum desfoque de movimento sobre cartão em leitura' + ''.join(f' · {l["texto"]}: {l["rastro_max"]} amostras' for l in cards if l['rastro_max'] > 1))
ok(all(-24.05 <= l['ry'][0] and l['ry'][1] <= -17.95 and 7.95 <= l['rx'][0] and l['rx'][1] <= 12.05 for l in cards),
   'cartões em leitura inclinados (rotateY −24° a −18°, rotateX 8° a 12°): ' + ' · '.join(f'{l["texto"]} y {l["ry"][0]}…{l["ry"][1]} x {l["rx"][0]}…{l["rx"][1]}' for l in cards))
ruins = [(r['cartao'], tr) for r in PL['rastros'] for tr in r['trechos'] if tr[1] - tr[0] > 0.3 + 1e-6 or not (r['entra'] - 0.02 <= tr[0] <= r['entra'] + 0.05)]
ok(not ruins, 'desfoque de movimento só nas entradas dos cartões, ≤ 0,3 s cada (' + ', '.join(f'{r["cartao"]} {r["trechos"][0][1] - r["trechos"][0][0]:.2f} s' for r in PL['rastros'] if r['trechos']) + ')' + ('' if not ruins else f' · fora: {ruins[:4]}'))
mods = PL['modulos']; cm = next(c for c in CN if c['id'] == 'modulos'); juntos = cm['t1'] - (max(m['t'] for m in mods) + 0.3)
ok(juntos >= 1.0, f'os 5 módulos ficam visíveis juntos {juntos:.2f} s no fim da cena (mínimo 1 s)')
cp = next(c for c in CN if c['id'] == 'pedacos'); ent = {r['cartao']: r['entra'] for r in PL['rastros']}
f1, f2 = PL['tCheckout'] - (ent['sinal'] + 0.3), cp['t1'] - (ent['checkout'] + 0.3)
ok(min(f1, f2) >= 2.0, f'pedaços em foco: R$ 450 por {f1:.2f} s, R$ 1.020 por {f2:.2f} s (mínimo 2 s cada)')

# ---------------------------------------------------------------- legenda
rep.append(''); rep.append('LEGENDA')
PG = INFO['legenda']
curtas = [q for q in PG if q['t1'] - q['t0'] < 1.5 - 1e-6]
ok(not curtas, f'{len(PG)} páginas; cada uma fica ≥ 1,5 s na tela (a mais curta: {min(q["t1"] - q["t0"] for q in PG):.2f} s)'
   + ('' if not curtas else ' · curtas: ' + '; '.join(f'"{" / ".join(q["linhas"])}" {q["t1"] - q["t0"]:.2f} s' for q in curtas)))
ok(all(PG[i]['t1'] <= PG[i + 1]['t0'] + 1e-6 for i in range(len(PG) - 1)), 'a página anterior sai antes da próxima entrar')
frase_de = {}
for f in LN['frases']:
    for w in f['palavras']:
        frase_de[(w['w'], round(w['t0'], 3))] = len(f['palavras'])
orfas = []
for q in PG:
    n = [len(l.split()) for l in q['linhas']]
    if len(q['palavras']) == 1 and frase_de.get((q['palavras'][0]['w'], round(q['palavras'][0]['t0'], 3)), 1) > 1:
        orfas.append(' / '.join(q['linhas']))
    if len(n) == 2 and min(n) == 1 and max(n) >= 3:
        orfas.append(' / '.join(q['linhas']))
ok(not orfas, 'sem palavra órfã (nenhuma página de uma palavra só, nenhuma linha de uma palavra só ao lado de uma linha cheia)' + ('' if not orfas else ': ' + '; '.join(orfas)))
rep.append('       ' + ' | '.join(' / '.join(q['linhas']) for q in PG))
fora, encosta = [], []
for sm in INFO['caixas']:
    leg = [b for b in sm['caixas'] if b['nome'] == 'legenda']
    resto = [b for b in sm['caixas'] if b['nome'] != 'legenda']
    for b in leg:
        if b['x0'] < 150 - 0.5 or b['x1'] > 950 + 0.5 or b['y0'] < 1424 - 0.5 or b['y1'] > 1536 + 0.5:
            fora.append((sm['t'], b))
        for r in resto:
            if b['x0'] < r['x1'] and b['x1'] > r['x0'] and b['y0'] < r['y1'] and b['y1'] > r['y0']:
                encosta.append((sm['t'], r['nome']))
ok(not fora, 'legenda dentro da faixa y 1424–1536, x 150–950 em todos os quadros amostrados' + ('' if not fora else f': {fora[:3]}'))
ok(not encosta, 'a legenda não encosta em nada da cena' + ('' if not encosta else ': ' + ', '.join(f'{t:.2f}s {n}' for t, n in encosta[:6])))
sem_leg = [c for c in CN if not c['legenda']]
leg_esc = [(sm['t'], c['id']) for sm in INFO['caixas'] for c in sem_leg if c['t0'] <= sm['t'] < c['t1'] and any(b['nome'] == 'legenda' for b in sm['caixas'])]
ok(not leg_esc, 'legenda escondida onde o texto grande já mostra a frase (' + ', '.join(c['id'] for c in sem_leg) + ')' + ('' if not leg_esc else f' · aparece em {leg_esc[:4]}'))
faltam = []
for fr in PL['falas']:
    c = next(x for x in CN if x['id'] == fr['cena'])
    for i, w in enumerate(fr['palavras']):
        achou = False
        for sm in INFO['caixas']:
            if not (c['t0'] <= sm['t'] < c['t1'] and sm['t'] >= w['t0'] - 0.05):
                continue
            for b in sm['caixas']:
                m = re.match(r'fala (\S+) (\d+)-(\d+)$', b['nome'])
                if m and m.group(1) == fr['frase'] and int(m.group(2)) <= i <= int(m.group(3)):
                    achou = True; break
            if achou: break
        if not achou: faltam.append(f'{fr["frase"]}:{w["w"]}')
ditas_leg = {(f['id'], i) for f in LN['frases'] if f.get('legenda') is not False for i in range(len(f['palavras']))}
na_leg = set()
for qq in PG:
    fr = next(f for f in LN['frases'] if f['id'] == qq['frase'])
    for w in qq['palavras']:
        for i, x in enumerate(fr['palavras']):
            if x['w'] == w['w'] and abs(x['t0'] - w['t0']) < 1e-3: na_leg.add((fr['id'], i))
falta_leg = sorted(ditas_leg - na_leg)
ok(not faltam and not falta_leg, 'nenhuma palavra falada sem aparecer escrita (no texto grande da cena ou na legenda)' + ('' if not faltam and not falta_leg else f' · faltam: {faltam[:6]} {falta_leg[:6]}'))
fon = [w['w'] for q in PG for w in q['palavras'] if re.search(r'Fázlo|Hospéda|Uátsap', w['w'])]
ok(not fon, 'grafia oficial na legenda ("FAZLO Hospeda", "WhatsApp"): nenhuma grafia fonética' + ('' if not fon else f': {fon}'))

# ---------------------------------------------------------------- áreas seguras (pixels) e caixas
rep.append(''); rep.append('ÁREAS SEGURAS')
fz = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'fps=4', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout,
                   np.uint8).reshape(-1, 1920, 1080, 3)
AT = INFO['plano']['atos']
def conteudo(fr, t, ys, xs):
    # o fundo de cada quadro é medido no próprio quadro (a mediana de y 1600–1900, onde nunca há conteúdo): preto ou limão
    fundo = np.median(fr[1600:1900:4, ::4].reshape(-1, 3).astype(float), axis=0)
    return np.sqrt(((fr[ys, xs].astype(float) - fundo) ** 2).sum(-1)) > 70
n_col = n_baixo = 0
for i, fr in enumerate(fz):
    t = i / 4
    n_col += int(conteudo(fr, t, slice(1060, 1560), slice(950, 1080)).sum())
    n_baixo += int(conteudo(fr, t, slice(1537, 1920), slice(0, 1080)).sum())
n_faixa = 0
for i, fr in enumerate(fz):
    t = i / 4
    if any(c['t0'] + 0.05 <= t < c['t1'] - 0.05 and not c['legenda'] for c in CN):
        n_faixa += int(conteudo(fr, t, slice(1424, 1537), slice(150, 950)).sum())
ok(n_faixa == 0, f'faixa da legenda (y 1424–1536, x 150–950) vazia nas cenas sem legenda: {n_faixa} pixels além do fundo')
ok(n_col == 0, f'coluna de botões (x ≥ 950, y 1060–1560): {n_col} pixels além do fundo em {len(fz)} quadros')
ok(n_baixo == 0, f'20% de baixo (y > 1536): {n_baixo} pixels além do fundo em {len(fz)} quadros')
cx = [(sm['t'], b['nome']) for sm in INFO['caixas'] for b in sm['caixas'] if b['nome'] != 'legenda'
      and (b['y1'] > 1536 or (b['x1'] > 950 and b['y1'] > 1060 and b['y0'] < 1560)) and (b['x1'] > 0 and b['x0'] < 1080)]
ok(not cx, 'nenhuma caixa da cena nas áreas seguras' + ('' if not cx else ': ' + ', '.join(f'{t:.2f}s {n}' for t, n in cx[:6])))

# ---------------------------------------------------------------- exemplo fictício, contraste, telas
rep.append(''); rep.append('CONTEÚDO')
com_valor, sem_selo, ids = 0, [], set()
for sm in INFO['caixas']:
    for b in sm['caixas']:
        if b['nome'].startswith('valor '):
            cid = b['nome'][6:]; ids.add(cid); com_valor += 1
            sel = [x for x in sm['caixas'] if x['nome'] == 'selo ' + cid]
            card = [x for x in sm['caixas'] if x['nome'] == 'cartão ' + cid]
            if not sel or not card or not (card[0]['x0'] - 2 <= sel[0]['x0'] and sel[0]['x1'] <= card[0]['x1'] + 2 and card[0]['y0'] - 2 <= sel[0]['y0'] and sel[0]['y1'] <= card[0]['y1'] + 2):
                sem_selo.append((sm['t'], cid))
ok(com_valor > 0 and not sem_selo, f'"Exemplo fictício": o selo está no mesmo cartão do valor em todos os {com_valor} quadros amostrados com valor'
   + ('' if not sem_selo else f' · falta em {sem_selo[:6]}'))
vistos = {b['nome'][7:] for sm in INFO['caixas'] for b in sm['caixas'] if b['nome'].startswith('cartão ')}
todos = {'m-reservas', 'm-sinal', 'm-checkin', 'm-comanda', 'm-caixa', 'sinal', 'checkout'}
ok(todos <= vistos and not (vistos - todos), f'os cartões que aparecem de frente: os 5 módulos e os 2 pedaços (sem ocupação nem comanda)' + ('' if todos <= vistos else f' · faltam: {sorted(todos - vistos)}'))
ok(ids <= {'sinal', 'checkout'}, f'valores só nos cartões do sinal (R$ 450) e do check-out (R$ 1.020): {sorted(ids)}')


def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contraste(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


K = INFO['cores']
c1, c2 = contraste(K['tinta'], K['limao']), contraste(K['branco'], K['limao'])
ok(c1 >= 7, f'contraste no ato limão: texto preto sobre o limão {c1:.1f}:1 (mínimo 7:1); '
   f'o branco não é usado sobre o limão ({c2:.1f}:1)')
lim_frames = [sm for sm in INFO['caixas'] if AT['limao'] <= sm['t'] < AT['chamada']]
ok(bool(lim_frames) and not any(b['nome'] == 'legenda' for sm in lim_frames for b in sm['caixas']), f'ato limão com {len(lim_frames)} quadros amostrados: só texto preto sobre o limão (sem legenda)')
DEST = json.load(open(os.path.join(ROOT, 'src', 'tela-destaque.json')))
assets = sorted(os.listdir(os.path.join(ROOT, 'src', 'assets')))
ok(all(x == 'fazlo-hospeda-logo-alpha.png' or (DEST.get('imagem') and x == os.path.basename(DEST['imagem'])) for x in assets),
   f'nenhuma tela do sistema: só a logo em src/assets ({", ".join(assets)}); telaDestaque: {"imagem " + DEST["imagem"] if DEST.get("imagem") else "composição abstrata"}')

# ---------------------------------------------------------------- capa (desenhada à parte) e folha das zonas
subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'capa'], check=True, capture_output=True)   # capa.png + revisao/capa-caixas.json
cap = run([sys.executable, os.path.join(ROOT, '..', '..', 'tools', 'revisao_capa.py'), ROOT]).stdout
res = [l for l in cap.splitlines() if 'RESULTADO' in l]
ok(bool(res) and 'dentro da regra' in res[-1], 'capa na regra das capas: ' + (res[-1].replace('RESULTADO: ', '') if res else 'sem resultado'))
TWD, THD = 216, 384
amostras = [round(min(c['t1'] - 0.1, c['t0'] + 0.6 * (c['t1'] - c['t0'])), 2) for c in CN] + [round(DUR - 0.3, 2)]
folha = Image.new('RGB', (len(amostras) * (TWD + 8) + 8, THD + 40), (40, 40, 40)); dr = ImageDraw.Draw(folha)
for i, t in enumerate(amostras):
    im = Image.fromarray(fz[min(len(fz) - 1, int(round(t * 4)))]).convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); o = ImageDraw.Draw(ov)
    o.rectangle((950, 1060, 1079, 1559), fill=(255, 40, 80, 90)); o.rectangle((0, 1537, 1079, 1919), fill=(255, 40, 80, 60))
    o.rectangle((150, 1424, 950, 1536), outline=(80, 160, 255, 230), width=4)
    folha.paste(Image.alpha_composite(im, ov).convert('RGB').resize((TWD, THD)), (8 + i * (TWD + 8), 8)); dr.text((8 + i * (TWD + 8), THD + 14), f'{t:05.2f}s', fill=(175, 250, 39))
folha.save(os.path.join(REV, 'zonas-seguras.jpg'), quality=86)

R = 'RESULTADO: ' + ('aprovado' if not falhas else f'{len(falhas)} falha(s)')
txt = ['REEL DE MARCA "Tudo num lugar só" — revisão técnica' + (' (final)' if FINAL else ' (prévia: sem voz, tempos estimados)'), os.path.relpath(VIDEO, ROOT), ''] + rep + ['', R]
open(os.path.join(REV, 'relatorio-final.txt' if FINAL else 'relatorio.txt'), 'w').write('\n'.join(txt) + '\n')
print('\n'.join(txt))
