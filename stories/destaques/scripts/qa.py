#!/usr/bin/env python3
"""
Revisão técnica de um destaque (roda depois de `render.cjs video` e `render.cjs info`).

    python3 scripts/qa.py dicas  ->  output/dicas/revisao/relatorio-tecnico.txt + faixas.jpg

Confere, Story a Story:
  • formato: 1080x1920, 60 fps, H.264 yuv420p, SEM faixa de áudio, 6–8 s;
  • faixas do Instagram: nenhum texto em y < 250 nem em y > 1670 (caixas de texto do motor, a cada 0,25 s);
  • leitura: todo texto parado por ≥ 3 s — a última mudança de texto acontece ≥ 3 s antes do fim (no Story com fecho:
    ≥ 3 s antes da passagem para a logo, e a logo parada nos últimos 3 s), e os pixels do texto não mudam nessa janela;
  • nenhum texto passa da caixa do cartão que o contém (a checagem da Série EXPLICA, folga ≥ 12 px);
  • o cadeado da data não cobre o número nem a letra do dia;
  • a notinha: uma linha por dica, cada uma com check; o fim ("7 DE 7 ✓") fica ≥ 3 s na tela;
  • sem trechos pretos.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = sys.argv[1] if len(sys.argv) > 1 else 'dicas'
OUT = os.path.join(ROOT, 'output', ID)
REV = os.path.join(OUT, 'revisao')
MOT = json.load(open(os.path.join(REV, 'motor.json')))
CX = json.load(open(os.path.join(REV, 'caixas.json')))
DEST = json.load(open(os.path.join(ROOT, ID + '.json')))
TOPO, BASE, FOLGA = 250, 1670, 12
report, fails = [], []


def ok(c, m):
    report.append(('OK   ' if c else 'FALHA') + '  ' + m)
    if not c:
        fails.append(m)


def info(m):
    report.append('       ' + m)


def frame_at(video, t):
    with tempfile.TemporaryDirectory() as tmp:
        pth = os.path.join(tmp, 'f.png')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', pth], check=True)
        return np.asarray(Image.open(pth).convert('L')).astype(float)


def parado(video, s, a, b):
    """diferença média nos pixels de texto (claros no quadro final) entre a e b, por caixa de texto"""
    am = min((x for x in CX if x['s'] == s), key=lambda x: abs(x['t'] - (b - 0.1)))
    fa, fb = frame_at(video, a), frame_at(video, b)
    out = []
    for bx in [x for x in am['caixas'] if x.get('tipo') == 'texto']:
        x0, x1, y0, y1 = int(max(0, bx['x0'])), int(min(1080, bx['x1'])), int(max(0, bx['y0'])), int(min(1920, bx['y1']))
        if x1 <= x0 or y1 <= y0:
            continue
        d, m = np.abs(fa[y0:y1, x0:x1] - fb[y0:y1, x0:x1]), fb[y0:y1, x0:x1] > 90
        out.append((bx['nome'], float(d[m].mean()) if m.any() else 0.0))
    return out


for s in MOT:
    n = s['i'] + 1
    video = os.path.join(OUT, f'{n:02d}.mp4')
    report += ['', f'STORY {n:02d} · {s["tipo"]}' + (f' · dica Nº {s["n"]:02d}' if s['n'] else '')]
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', video], capture_output=True, text=True).stdout)
    v = [x for x in pr['streams'] if x['codec_type'] == 'video'][0]
    au = [x for x in pr['streams'] if x['codec_type'] == 'audio']
    dur = float(v['duration'])
    ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p' and (v['width'], v['height']) == (1080, 1920) and abs(eval(v['r_frame_rate']) - 60) < 0.01,
       f'{v["width"]}x{v["height"]}, {eval(v["r_frame_rate"]):.0f} fps, {v["codec_name"]} {v["pix_fmt"]}, {int(pr["format"]["size"]) / 1e6:.1f} MB')
    ok(not au, 'sem faixa de áudio')
    ok(6 <= dur <= 8.01, f'duração {dur:.2f} s (6–8 s)')
    amostras = [x for x in CX if x['s'] == s['i']]
    txs = [(x['t'], b) for x in amostras for b in x['caixas'] if b.get('tipo') == 'texto']
    fora = [(t, b) for t, b in txs if b['y0'] < TOPO or b['y1'] > BASE]
    ok(not fora, f'nenhum texto nas faixas do Instagram (y < {TOPO} ou y > {BASE}): {len(txs)} caixas de texto em {len(amostras)} quadros'
       + ('' if not fora else ': ' + '; '.join(f'{t:.2f}s "{b["nome"]}" y {b["y0"]:.0f}–{b["y1"]:.0f}' for t, b in fora[:4])))
    ys = [b['y0'] for _, b in txs] + [b['y1'] for _, b in txs]
    if ys:
        info(f'faixa usada pelos textos: y {min(ys):.0f}–{max(ys):.0f}')
    # texto dentro do cartão
    bad, nt = {}, 0
    for x in amostras:
        T = [b for b in x['caixas'] if b.get('tipo') == 'texto']; K = [b for b in x['caixas'] if b.get('tipo') == 'cartao']
        for tx in T:
            cx, cy = (tx['x0'] + tx['x1']) / 2, (tx['y0'] + tx['y1']) / 2
            dono = [c for c in K if c['x0'] <= cx <= c['x1'] and c['y0'] <= cy <= c['y1']]
            if not dono:
                continue
            c = min(dono, key=lambda c: (c['x1'] - c['x0']) * (c['y1'] - c['y0'])); nt += 1
            f = min(tx['x0'] - c['x0'], c['x1'] - tx['x1'], tx['y0'] - c['y0'], c['y1'] - tx['y1'])
            if f < FOLGA - 0.5:
                k = (tx['nome'], c['nome'])
                if k not in bad or f < bad[k][1]:
                    bad[k] = (x['t'], f)
    ok(not bad, f'nenhum texto passa do cartão que o contém (folga ≥ {FOLGA} px): {nt} textos conferidos'
       + ('' if not bad else ' · ' + '; '.join(f'"{k[0]}" em "{k[1]}" folga {v[1]:.0f} px ({v[0]:.2f} s)' for k, v in list(bad.items())[:6])))
    # o cadeado no canto, sem cobrir o número nem a letra
    if s['tipo'] == 'cadeado':
        cob = []
        for x in amostras:
            bs = {b['nome']: b for b in x['caixas'] if not b.get('tipo')}
            if 'cadeado da data' in bs:
                for nome in ('número da data', 'letra do dia'):
                    b, c = bs.get(nome), bs['cadeado da data']
                    if b and min(b['x1'], c['x1']) - max(b['x0'], c['x0']) > 0 and min(b['y1'], c['y1']) - max(b['y0'], c['y0']) > 0:
                        cob.append((x['t'], nome))
        ok(not cob, 'o cadeado fica no canto da célula, sem cobrir o número nem a letra do dia' + ('' if not cob else ': ' + ', '.join(f'{t:.2f}s {nm}' for t, nm in cob[:4])))
    # leitura: texto parado ≥ 3 s
    de = s['texto_parado_de']
    if s['fecho']:
        F = s['fecho']
        d1 = parado(video, s['i'], de + 0.03, F['wipe'] - 0.05)
        ok(F['wipe'] - de >= 3.0 and max(d for _, d in d1) < 3, f'texto da dica parado de {de:.2f} a {F["wipe"]:.2f} s ({F["wipe"] - de:.2f} s, mínimo 3 s); pixels do texto iguais (maior diferença {max(d for _, d in d1):.2f} de 255)')
        d2 = parado(video, s['i'], F['pousa'] + 0.03, dur - 0.05)
        ok(dur - F['pousa'] >= 3.0 and max(d for _, d in d2) < 3, f'nos últimos 3 s: a logo oficial centralizada pousa em {F["pousa"]:.2f} s e fica parada {dur - F["pousa"]:.2f} s, com a notinha "{DEST["nota"]["fim"]} ✓" (maior diferença {max(d for _, d in d2):.2f} de 255)')
        ok(dur - (F['fim_nota'] + 0.3) >= 3.0, f'"{DEST["nota"]["fim"]} ✓" impresso em {F["fim_nota"]:.2f} s (0,3 s) e fica parado na tela {dur - F["fim_nota"] - 0.3:.2f} s até o fim')
    else:
        d1 = parado(video, s['i'], de + 0.03, dur - 0.05)
        ok(dur - de >= 3.0 and max(d for _, d in d1) < 3, f'todo texto parado de {de:.2f} s até o fim ({dur - de:.2f} s, mínimo 3 s); pixels do texto iguais (maior diferença {max(d for _, d in d1):.2f} de 255)')
    bd = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', video, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-'], capture_output=True, text=True).stderr
    ok(not re.findall(r'black_start', bd), 'sem trechos pretos')

# a notinha ao longo do destaque
report += ['', 'NOTINHA']
dicas = [s for s in DEST['stories'] if s.get('n')]
ok([s['n'] for s in dicas] == list(range(1, len(dicas) + 1)), f'{len(dicas)} dicas numeradas em ordem (Nº 01–{len(dicas):02d}), uma linha da notinha por dica, com check: ' + ' · '.join(f'{s["n"]:02d} {s["nota"]}' for s in dicas))

# folha das faixas: o quadro final de cada Story, com as faixas cobertas pelo Instagram marcadas
font = ImageFont.truetype(os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf'), 22)
TW, TH = 300, 533
sheet = Image.new('RGB', (10 + len(MOT) * (TW + 10), TH + 54), (30, 30, 30)); dr = ImageDraw.Draw(sheet)
with tempfile.TemporaryDirectory() as tmp:
    for k, s in enumerate(MOT):
        t = (s['fecho']['wipe'] - 0.3) if s['fecho'] else s['dur'] - 0.3
        pth = os.path.join(tmp, f'{k}.png')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.2f}', '-i', os.path.join(OUT, f'{k + 1:02d}.mp4'), '-frames:v', '1', pth], check=True)
        im = Image.open(pth).convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        d.rectangle((0, 0, 1079, TOPO), fill=(255, 40, 80, 70)); d.rectangle((0, BASE, 1079, 1919), fill=(255, 40, 80, 70))
        x0 = 10 + k * (TW + 10)
        sheet.paste(Image.alpha_composite(im, ov).convert('RGB').resize((TW, TH), Image.LANCZOS), (x0, 10))
        dr.text((x0, TH + 18), f'{k + 1:02d} · {t:.1f}s', font=font, fill=(175, 250, 39))
sheet.save(os.path.join(REV, 'faixas.jpg'), quality=88)

res = 'RESULTADO: ' + ('aprovado' if not fails else f'{len(fails)} falha(s)')
txt = [f'STORIES PARA DESTAQUE · {DEST["nome"]} ({ID}) — revisão técnica', ''] + report + ['', res]
open(os.path.join(REV, 'relatorio-tecnico.txt'), 'w').write('\n'.join(txt) + '\n')
print('\n'.join(txt))
