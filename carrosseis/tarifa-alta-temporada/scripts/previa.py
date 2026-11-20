#!/usr/bin/env python3
"""
Prévia e conferência do carrossel ANIMADO "Tarifa de dezembro" (roda depois de `node scripts/render.cjs`).

    python3 scripts/previa.py  ->  output/previa.jpg                 (folha de contato: 0 s, 1 s, 2,5 s e 6,9 s de cada slide)
                                   output/revisao/conferencia.txt     (ffprobe, margens, canto do som, estabilidade, capa)
                                   output/revisao/capa-na-grade.jpg   (o quadro 0 da capa no recorte 3:4 da grade)
                                   output/revisao/capa-medidor.jpg    (a capa em 0 s, 1 s, 2 s, 4 s e 6,9 s, grande)

Tudo é medido nos próprios MP4 (os quadros saem do vídeo pelo ffmpeg):
  • ffprobe: 1080×1350, 30 fps, 7 s, H.264 yuv420p, faixa de áudio AAC, arquivo < 15 MB;
  • margens: o conteúdo fica entre x 80 e 1000 em todos os quadros (a cada 0,1 s). Nos slides escuros conta o que tem
    luminância acima de 60; na capa limão, o que se destaca muito do limão (o preto do texto; o medidor ao fundo — a escala e o ponteiro a 30% — não
    conta);
  • canto do ícone de som: nada de conteúdo em x ≥ 940 e y ≥ 1210 (140×140 px embaixo à direita), em nenhum quadro;
  • estabilidade: de 2,5 s até o fim, o conteúdo não muda (nenhum pixel com o brilho diferente em mais de 40 níveis,
    com 50 px de tolerância para o ruído do H.264; a luz de fundo, que respira devagar, fica abaixo disso). Na capa,
    só o movimento ambiente: a seta e o pontinho do chip;
  • capa: o quadro 0 já tem o título inteiro (igual ao último quadro na área do título). O medidor: a ponta da agulha
    fica dentro do quadro em todos os quadros, a agulha nunca toca o chip nem o "ARRASTA →", a faixa de pico (parada)
    fica inteira no quadro, a ponta fica no meio da faixa de 2,0 s a 6,2 s, e o quadro final e o quadro 0 batem.
"""
import json
import os
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output')
REV = os.path.join(OUT, 'revisao')
os.makedirs(REV, exist_ok=True)
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
N, W, H, M, TOL, FPS, DUR = 8, 1080, 1350, 80, 2, 30, 7.0
LIME = np.array([175, 250, 39])
TEMPOS = [0.0, 1.0, 2.5, 6.9]
rel, falhas = [], []


def ok(cond, msg):
    rel.append(('OK   ' if cond else 'FALHA') + '  ' + msg)
    if not cond:
        falhas.append(msg)


def quadros(mp4, ts):
    """os quadros do vídeo nos instantes ts (s), escolhidos pelo NÚMERO do quadro (round(t × 30)), numa chamada só do
    ffmpeg (o -ss no último quadro não devolve nada; pelo número, o quadro final de 6,967 s sai certo)"""
    ns = [min(int(round(t * FPS)), int(DUR * FPS) - 1) for t in ts]
    alvo = sorted(set(ns))
    with tempfile.TemporaryDirectory() as tmp:
        expr = '+'.join(f'eq(n\\,{k})' for k in alvo)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', f'select={expr}', '-vsync', '0', os.path.join(tmp, 'q%04d.png')], check=True)
        fs = sorted(os.listdir(tmp))
        assert len(fs) == len(alvo), f'{mp4}: {len(fs)} quadros extraídos de {len(alvo)}'
        por_n = {k: np.asarray(Image.open(os.path.join(tmp, f)).convert('RGB')).astype(np.int16) for k, f in zip(alvo, fs)}
    return [por_n[k] for k in ns]


def conteudo(a, capa):
    if capa:
        return np.sqrt(((a - LIME) ** 2).sum(axis=2)) > 220
    return a @ [0.2126, 0.7152, 0.0722] > 60


# ---------------------------------------------------------------- ffprobe
rel.append('FFPROBE')
for n in range(1, N + 1):
    f = os.path.join(OUT, f'{n:02d}.mp4')
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
    a = [s for s in pr['streams'] if s['codec_type'] == 'audio']
    fps = eval(v['r_frame_rate'])
    dur = float(pr['format']['duration'])
    mb = os.path.getsize(f) / 1e6
    nq = int(v.get('nb_frames', 0))
    ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p' and (v['width'], v['height']) == (W, H) and abs(fps - FPS) < 1e-6
       and abs(dur - DUR) < 0.05 and a and a[0]['codec_name'] == 'aac' and mb < 15,
       f'{n:02d}.mp4: {v["width"]}×{v["height"]}, {fps:g} fps, {dur:.2f} s ({nq} quadros), {v["codec_name"]} {v["pix_fmt"]} {v.get("profile", "")}, '
       f'áudio {a[0]["codec_name"] + " " + a[0]["sample_rate"] + " Hz " + str(a[0]["channels"]) + " canais" if a else "—"}, {mb:.2f} MB')

# ---------------------------------------------------------------- a folha de contato
font, font2 = ImageFont.truetype(FONT, 22), ImageFont.truetype(FONT, 26)
TW, TH, G, TOP = 270, 338, 10, 44
sheet = Image.new('RGB', (len(TEMPOS) * (TW + G) + G + 70, N * (TH + G) + G + TOP), (28, 28, 28))
d = ImageDraw.Draw(sheet)
for j, t in enumerate(TEMPOS):
    d.text((70 + G + j * (TW + G), 12), f'{t:.1f} s', font=font2, fill=(175, 250, 39))
amostras = [round(k * 0.1, 2) for k in range(int(DUR * 10))] + [DUR - 1 / FPS]
rel += ['', 'MARGENS, CANTO DO SOM E ESTABILIDADE (quadros a cada 0,1 s, tirados do MP4)']
for n in range(1, N + 1):
    f = os.path.join(OUT, f'{n:02d}.mp4')
    capa = n == 1
    qs = quadros(f, TEMPOS)
    for j, q in enumerate(qs):
        im = Image.fromarray(q.astype(np.uint8)).resize((TW, TH), Image.LANCZOS)
        sheet.paste(im, (70 + G + j * (TW + G), TOP + G + (n - 1) * (TH + G)))
    d.text((12, TOP + G + (n - 1) * (TH + G) + TH // 2 - 14), f'{n:02d}', font=font2, fill=(175, 250, 39))
    # todos os quadros a cada 0,1 s
    todos = quadros(f, amostras)
    xs0, xs1, canto, mudou = W, 0, 0, []
    ult = conteudo(todos[-1], capa)
    lum = lambda q: q @ [0.2126, 0.7152, 0.0722]
    lult = lum(todos[-1])
    for t, q in zip(amostras, todos):
        m = conteudo(q, capa)
        ys, xs = np.nonzero(m)
        if len(xs):
            xs0, xs1 = min(xs0, xs.min()), max(xs1, xs.max())
        canto = max(canto, int(m[1210:, 940:].sum()))
        if t >= 2.5:
            # o que MUDOU de verdade (brilho diferente em mais de 40 níveis); o limiar evita contar o ruído do H.264
            mudou.append((t, int((np.abs(lum(q) - lult) > 40).sum())))
    ok(xs0 >= M - TOL and xs1 <= W - M + TOL, f'slide {n:02d}: conteúdo em x {xs0}–{xs1} em todos os quadros (margem de 80 px)')
    ok(canto == 0, f'slide {n:02d}: canto do ícone de som (x ≥ 940, y ≥ 1210) livre em todos os quadros' + (f' (FALHA: {canto} px)' if canto else ''))
    pior = max(mudou, key=lambda x: x[1])
    if capa:
        # a capa: só a seta do "ARRASTA →" e o pontinho do chip se mexem depois de 2,5 s; o título e o chip ficam
        q0 = conteudo(todos[0], True)
        dif_tit = int((q0[300:1100] != ult[300:1100]).sum())
        ok(dif_tit < 400, f'slide 01 (capa): o quadro 0 já está completo — na área do título, {dif_tit} px diferentes do último quadro (só o pontinho do chip pulsa)')
        fora = max(int((conteudo(q, True) != ult)[:, :].sum()) for t, q in zip(amostras, todos) if t >= 2.5)
        rel.append(f'       slide 01 (capa): o título, o chip e o "ARRASTA →" ficam parados; depois de 2,5 s mudam no máximo {fora} px do conteúdo (a seta e o pontinho do chip; o medidor ao fundo não conta)')
        # o medidor: a geometria da agulha em TODOS os quadros (render.cjs geo): a ponta dentro do quadro, a agulha longe
        # do chip e do "ARRASTA →", e a faixa de pico (parada) inteira no quadro
        g = json.loads(subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'geo'], check=True, capture_output=True, text=True).stdout)
        cx_ = g['caixas']
        def toca(q, caixa, folga=12):
            (x0, y0), (x1, y1) = q['base'], q['ponta']
            bx0, by0, bx1, by1 = caixa[0] - folga, caixa[1] - folga, caixa[2] + folga, caixa[3] + folga
            return any(bx0 <= x0 + (x1 - x0) * k / 200 <= bx1 and by0 <= y0 + (y1 - y0) * k / 200 <= by1 for k in range(201))
        fora_q = [q['t'] for q in g['quadros'] if not (6 <= q['ponta'][0] <= W - 6 and 6 <= q['ponta'][1] <= H - 6)]
        ok(not fora_q, f'slide 01 (capa): a ponta da agulha fica dentro do quadro em todos os {len(g["quadros"])} quadros '
           f'(x {min(q["ponta"][0] for q in g["quadros"]):.0f}–{max(q["ponta"][0] for q in g["quadros"]):.0f}, y {min(q["ponta"][1] for q in g["quadros"]):.0f}–{max(q["ponta"][1] for q in g["quadros"]):.0f})')
        ch_, ar_ = [q['t'] for q in g['quadros'] if toca(q, cx_['chip'])], [q['t'] for q in g['quadros'] if toca(q, cx_['arrasta'])]
        ok(not ch_ and not ar_, 'slide 01 (capa): a agulha nunca toca a área do chip nem a do "ARRASTA →" (com 12 px de folga), em nenhum quadro')
        md = g['med']
        pts = [(md['cx'] + r * np.cos(a), md['cy'] + r * np.sin(a)) for a in np.linspace(md['pico'][0], md['pico'][1], 30) for r in (md['rPico'] - md['wPico'] / 2, md['rPico'] + md['wPico'] / 2)]
        ok(all(0 <= x <= W and 0 <= y <= H for x, y in pts), f'slide 01 (capa): a faixa de pico fica parada e inteira no quadro (x {min(x for x, _ in pts):.0f}–{max(x for x, _ in pts):.0f}, y {min(y for _, y in pts):.0f}–{max(y for _, y in pts):.0f})')
        q_ = [q for q in g['quadros'] if 2.0 <= q['t'] <= 6.2]
        meio = (md['pico'][0] + md['pico'][1]) / 2
        ok(all(abs(q['a'] - meio) < 0.5 * np.pi / 180 for q in q_), f'slide 01 (capa): de 2,0 s a 6,2 s a ponta fica sobre o meio da faixa de pico ({np.degrees(meio):.0f}°)')
        lum = lambda q: q @ [0.2126, 0.7152, 0.0722]
        q2 = quadros(f, [2.0])[0]
        rel.append(f'       slide 01 (capa): movimento entre 0 s e 2,0 s: {int((np.abs(lum(q2) - lum(todos[0])) > 20).sum())} px com o brilho diferente em > 20 níveis (só a agulha se move; a escala e a faixa ficam paradas)')
        # o loop: o quadro final (209, 6,967 s) e o quadro 0 têm de ser IGUAIS no render (os quadros que vão para o vídeo).
        # No MP4 sobra só o ruído do H.264 (o quadro 0 é quadro-chave; o final, não), espalhado nas bordas das letras.
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'stills', f'1:0,1:{(DUR * FPS - 1) / FPS:.6f}', '--dir', tmp], check=True, capture_output=True)
            r0, r1 = [np.asarray(Image.open(os.path.join(tmp, x)).convert('RGB')).astype(np.int16) for x in sorted(os.listdir(tmp))]
        loop_r = int((np.abs(lum(r1) - lum(r0)) > 40).sum())
        loop_v = int((np.abs(lum(todos[-1]) - lum(todos[0])) > 40).sum())
        ok(loop_r == 0, f'slide 01 (capa): loop — o quadro final (6,967 s) e o quadro 0 batem: {loop_r} px diferentes nos quadros do render '
           f'(a agulha já voltou à posição inicial; a seta e o pontinho do chip estão na posição do quadro 0). No MP4, {loop_v} px de ruído do H.264 nas bordas das letras')
    else:
        ok(pior[1] <= 50, f'slide {n:02d}: animação terminada até 2,5 s (de 2,5 s a 6,97 s, no máximo {pior[1]} px mudam mais de 40 níveis de brilho; tolerância de ruído do vídeo: 50 px)')
sheet.save(os.path.join(OUT, 'previa.jpg'), quality=90)

# ---------------------------------------------------------------- a folha de contato da capa (o medidor), grande
TC = [0.0, 1.0, 2.0, 4.0, 6.9]
qc = quadros(os.path.join(OUT, '01.mp4'), TC)
CW_, CH_ = 540, 675
fc = Image.new('RGB', (len(TC) * (CW_ + G) + G, CH_ + 2 * G + 50), (28, 28, 28))
dc = ImageDraw.Draw(fc)
for j, (t, q) in enumerate(zip(TC, qc)):
    fc.paste(Image.fromarray(q.astype(np.uint8)).resize((CW_, CH_), Image.LANCZOS), (G + j * (CW_ + G), G + 50))
    dc.text((G + j * (CW_ + G), 14), f'{t:.1f} s', font=font2, fill=(175, 250, 39))
fc.save(os.path.join(REV, 'capa-medidor.jpg'), quality=92)

# ---------------------------------------------------------------- a capa na grade (recorte 3:4, quadro 0)
crop_x = int((W - H * 3 / 4) / 2)
q0 = Image.fromarray(quadros(os.path.join(OUT, '01.mp4'), [0.0])[0].astype(np.uint8))
tiles = [q0.crop((crop_x, 0, W - crop_x, H))]
ref = os.path.join(ROOT, '..', 'consumo', 'output', '01.png')
if os.path.exists(ref):
    tiles.append(Image.open(ref).convert('RGB').crop((crop_x, 0, W - crop_x, H)))
tw_, th_ = 356, 475
grid = Image.new('RGB', (len(tiles) * (tw_ + 4), th_), (255, 255, 255))
for i, t in enumerate(tiles):
    grid.paste(t.resize((tw_, th_), Image.LANCZOS), (i * (tw_ + 4), 0))
grid.save(os.path.join(REV, 'capa-na-grade.jpg'), quality=90)

res = 'RESULTADO: ' + ('aprovado' if not falhas else 'ajustar')
txt = 'TARIFA DE DEZEMBRO (carrossel animado) — conferência\n\n' + '\n'.join(rel + ['', res] + (['  ' + f for f in falhas] if falhas else [])) + '\n'
open(os.path.join(REV, 'conferencia.txt'), 'w').write(txt)
print(txt)
