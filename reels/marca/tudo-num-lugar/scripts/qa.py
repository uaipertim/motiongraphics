#!/usr/bin/env python3
"""
Revisão técnica do reel de marca "Tudo num lugar só".

    python3 scripts/qa.py            -> confere output/previa.mp4 (sem voz, tempos estimados)
    python3 scripts/qa.py --final    -> confere output/tudo-num-lugar.mp4 (com a narração)
    (rodar depois de `node scripts/render.cjs info` e do vídeo)

Gera output/revisao/relatorio[-final].txt, output/revisao/zonas-seguras.jpg, output/capa.png + capa.jpg (o quadro 0) e a
revisão da capa (../../tools/revisao_capa.py). Confere:
  • formato: 1080×1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo; vídeo e áudio com a mesma duração (mux com -t);
  • som: pico real ≤ −1,5 dBTP; com a narração, −14 LUFS (±0,5); na prévia, a trilha no nível em que fica debaixo da voz;
  • ritmo: entre o 1º corte e a chamada, nenhum trecho sem batida (corte, palavra que bate, cartão que entra) maior que 1,5 s;
  • legenda: dentro da faixa y 1424–1536, x 150–950; cada página ≥ 1,5 s, sem sobreposição; sem palavra órfã (página
    de uma palavra só ou linha com uma palavra só embaixo/em cima de uma linha cheia); não encosta em nada da cena;
  • áreas seguras (pixels a 4 quadros/s): nada além do fundo em y > 1536 nem em x ≥ 950 entre y 1060 e 1560 (o fundo é
    medido em cada quadro: preto ou limão); e as caixas do motor fora dessas áreas;
  • os cartões: os 5 módulos e os 4 pedaços aparecem de frente;
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
ok(abs(vd - DUR) < 0.05, f'duração {vd:.2f} s (linha do tempo: {DUR:.2f} s{"" if FINAL else ", estimada"})')
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

# ---------------------------------------------------------------- ritmo
rep.append(''); rep.append('RITMO')
B = INFO['plano']['batidas']; ini = next(b['t'] for b in B if b['o'] == 'corte whatsapp'); fim = next(b['t'] for b in B if b['o'] == 'corte chamada')
ts = sorted({round(b['t'], 3) for b in B if ini <= b['t'] <= fim})
gaps = [(round(y - x, 2), x) for x, y in zip(ts, ts[1:])]
ok(max(g for g, _ in gaps) <= 1.5, f'{len(ts)} batidas entre o 1º corte e a chamada; o maior trecho sem batida tem {max(g for g, _ in gaps):.2f} s (limite 1,5 s)')
C = INFO['plano']['cortes']
rep.append('       cortes: ' + ' · '.join(f'{c["cena"]} {c["t"]:.2f}' for c in C) + f'  (grade da trilha: {INFO["plano"]["hb"]:.3f} s)')

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
todos = {'m-reservas', 'm-sinal', 'm-checkin', 'm-comanda', 'm-caixa', 'ocupacao', 'sinal', 'comanda', 'checkout'}
ok(todos <= vistos, f'todos os cartões aparecem de frente (5 módulos e 4 pedaços)' + ('' if todos <= vistos else f' · faltam: {sorted(todos - vistos)}'))
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
ok(c1 >= 7, f'contraste no ato limão: texto preto sobre o limão {c1:.1f}:1 e as chaves (limão na pílula preta) {c1:.1f}:1 (mínimo 7:1); '
   f'o branco não é usado sobre o limão ({c2:.1f}:1)')
lim_frames = [sm for sm in INFO['caixas'] if AT['limao'] <= sm['t'] < AT['chamada']]
ok(bool(lim_frames), f'ato limão com {len(lim_frames)} quadros amostrados (legenda preta, chaves na pílula)')
DEST = json.load(open(os.path.join(ROOT, 'src', 'tela-destaque.json')))
assets = sorted(os.listdir(os.path.join(ROOT, 'src', 'assets')))
ok(all(x == 'fazlo-hospeda-logo-alpha.png' or (DEST.get('imagem') and x == os.path.basename(DEST['imagem'])) for x in assets),
   f'nenhuma tela do sistema: só a logo em src/assets ({", ".join(assets)}); telaDestaque: {"imagem " + DEST["imagem"] if DEST.get("imagem") else "composição abstrata"}')

# ---------------------------------------------------------------- capa (quadro 0) e folha das zonas
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', VIDEO, '-frames:v', '1', os.path.join(OUT, 'capa.png')], check=True)
if '--previa-capa' not in sys.argv:
    # o quadro 0 da prévia traz o aviso "PRÉVIA" no topo: a capa vem do quadro 0 sem o aviso
    subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'capa'], check=True, capture_output=True)
c0 = [sm for sm in INFO['caixas'] if sm['t'] == 0][0]['caixas']
dentro = lambda b, o: o is not b and o['x0'] <= b['x0'] + 1 and o['x1'] >= b['x1'] - 1 and o['y0'] <= b['y0'] + 1 and o['y1'] >= b['y1'] - 1
c0 = [b for b in c0 if b['nome'] != 'legenda' and not any(dentro(b, o) for o in c0)]
json.dump({b['nome']: {k: b[k] for k in ('x0', 'x1', 'y0', 'y1')} for b in c0}, open(os.path.join(REV, 'capa-caixas.json'), 'w'), ensure_ascii=False, indent=1)
cap = run([sys.executable, os.path.join(ROOT, '..', '..', 'tools', 'revisao_capa.py'), ROOT]).stdout
res = [l for l in cap.splitlines() if 'RESULTADO' in l]
ok(bool(res) and 'dentro da regra' in res[-1], 'capa (quadro 0) na regra das capas: ' + (res[-1].replace('RESULTADO: ', '') if res else 'sem resultado'))
TWD, THD = 216, 384
amostras = [0.0] + [round(min(DUR - 0.1, c['t'] + 0.6), 2) for c in C[1:]] + [round(DUR - 0.3, 2)]
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
