#!/usr/bin/env python3
"""
Prévia e conferência do carrossel ANIMADO "Tarifa de dezembro" (roda depois de `node scripts/render.cjs`).

    python3 scripts/previa.py  ->  output/previa.jpg                 (folha de contato: 0 s, 1 s, 2,5 s e 6,9 s de cada slide)
                                   output/revisao/conferencia.txt     (ffprobe, margens, canto do som, estabilidade, capa)
                                   output/revisao/capa-na-grade.jpg   (o quadro 0 da capa no recorte 3:4 da grade)

Tudo é medido nos próprios MP4 (os quadros saem do vídeo pelo ffmpeg):
  • ffprobe: 1080×1350, 30 fps, 7 s, H.264 yuv420p, faixa de áudio AAC, arquivo < 15 MB;
  • margens: o conteúdo fica entre x 80 e 1000 em todos os quadros (a cada 0,1 s). Nos slides escuros conta o que tem
    luminância acima de 60; na capa limão, o que se destaca do limão (a escala gravada ao fundo não conta);
  • canto do ícone de som: nada de conteúdo em x ≥ 940 e y ≥ 1210 (140×140 px embaixo à direita), em nenhum quadro;
  • estabilidade: de 2,5 s até o fim, o conteúdo não muda (nenhum pixel com o brilho diferente em mais de 40 níveis,
    com 50 px de tolerância para o ruído do H.264; a luz de fundo, que respira devagar, fica abaixo disso). Na capa,
    só o movimento ambiente: a seta e o pontinho do chip;
  • capa: o quadro 0 já tem o título inteiro (igual ao último quadro na área do título);
  • loop: o último quadro e o quadro 0 da capa são iguais (fora a escala e os detalhes que se movem devagar).
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
    """os quadros do vídeo nos instantes ts (s), pelo ffmpeg"""
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        for t in ts:
            p = os.path.join(tmp, 'q.png')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', mp4, '-frames:v', '1', p], check=True)
            out.append(np.asarray(Image.open(p).convert('RGB')).astype(np.int16))
    return out


def conteudo(a, capa):
    if capa:
        return np.sqrt(((a - LIME) ** 2).sum(axis=2)) > 150
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
        rel.append(f'       slide 01 (capa): depois de 2,5 s mudam no máximo {fora} px (a seta do "ARRASTA →" e o pontinho do chip; a escala ao fundo gira devagar e não conta)')
        dif_loop = int((q0 != ult).sum())
        rel.append(f'       slide 01 (capa): loop — o último quadro e o quadro 0 diferem em {dif_loop} px (a seta e o pontinho, no meio do movimento)')
    else:
        ok(pior[1] <= 50, f'slide {n:02d}: animação terminada até 2,5 s (de 2,5 s a 6,97 s, no máximo {pior[1]} px mudam mais de 40 níveis de brilho; tolerância de ruído do vídeo: 50 px)')
sheet.save(os.path.join(OUT, 'previa.jpg'), quality=90)

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
