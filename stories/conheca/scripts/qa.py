#!/usr/bin/env python3
"""
Revisão técnica, visual e de sincronização dos 4 Stories (roda depois do render).

    python3 scripts/qa.py   ->  output/revisao/relatorio-tecnico.txt
                                output/revisao/sincronia.txt
                                output/revisao/zonas-seguras.jpg
                                output/revisao/continuidade.jpg
                                output/revisao/capa-destaque-preview.jpg

Técnica (cada Story e o vídeo de revisão): 1080x1920, 60 fps, H.264 yuv420p,
AAC 48 kHz estéreo, duração de 6 a 9 s, vídeo e áudio com a mesma duração,
-14 LUFS ±1, pico real ≤ -1 dBTP, sem quadros pretos ou congelados.

Sincronização, em três camadas, Story a Story:
  1. o áudio do MP4 é a trilha do Story, sem deslocamento (correlação cruzada);
  2. o ataque de cada efeito-chave, medido no áudio final, cai no instante do
     evento visual que o gerou (audio/cues.json);
  3. a imagem muda de fato nos golpes principais (pico de diferença entre quadros).

Visual: zonas da interface do Instagram, área livre para o adesivo de link no
Story 4, continuidade da fita (entra pela pista da esquerda e sai pela da
direita, na mesma altura, em todos os Stories) e a capa do Destaque recortada
em círculo, em tamanho pequeno, sobre fundo claro e escuro.
"""
import json
import os
import re
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.io import wavfile
from scipy.signal import correlate

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = ['marca', 'reservas', 'financeiro', 'convite']
VIDEOS = [os.path.join(ROOT, 'output', f'conheca-0{n}-{NAMES[n - 1]}.mp4') for n in (1, 2, 3, 4)]
REVIEW = os.path.join(ROOT, 'output', 'conheca-sequencia-revisao.mp4')
TRACKS = [os.path.join(ROOT, 'audio', f'story-0{n}.wav') for n in (1, 2, 3, 4)]
COVER = os.path.join(ROOT, 'output', 'capa-destaque-conheca.png')
CUES = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))
OUT = os.path.join(ROOT, 'output', 'revisao')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
os.makedirs(OUT, exist_ok=True)

# interface do Story: barra de progresso + perfil no topo, campo de resposta embaixo
UI_ZONES = [(0, 0, 1080, 250), (0, 1670, 1080, 1920)]
TEXT_SAFE = (270, 1650)
LINK = (200, 1370, 840, 1525)                 # miolo da área do adesivo de link (Story 4)
LANE_L, LANE_R = (0, 1500, 170, 1680), (910, 1500, 1080, 1680)
# efeitos-chave por Story (golpes que se destacam na mixagem) e golpes com reação visual forte
KEY = {1: ('logo', 'chip'), 2: ('tag', 'flip', 'hop'), 3: ('stop', 'coin', 'paid'), 4: ('logo', 'link')}
# (tipo, início e fim da janela em quadros): a virada da etiqueta é o giro que termina no status à mostra
VIS = {1: (('logo', -4, 10),), 2: (('flip', -20, 4),), 3: (('paid', -4, 10), ('drop', -4, 10)), 4: (('logo', -4, 10),)}
CHECK_T = {1: [1.7, 3.6, 6.2], 2: [0.9, 3.6, 6.6], 3: [2.3, 4.0, 6.4], 4: [1.6, 3.2, 7.5]}

report, sync, sync_det, fails = [], [], [], []


def ok(cond, msg, rep=None):
    (report if rep is None else rep).append(('OK   ' if cond else 'FALHA') + '  ' + msg)
    if not cond:
        fails.append(msg)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def tech(path, label, dmin, dmax):
    info = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]).stdout)
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    a = next(s for s in info['streams'] if s['codec_type'] == 'audio')
    fps = eval(v['r_frame_rate'])
    vd, ad = float(v['duration']), float(a['duration'])
    report.append(f'  {label}  ({os.path.relpath(path, ROOT)}, {int(info["format"]["size"]) / 1e6:.1f} MB)')
    ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p' and (int(v['width']), int(v['height'])) == (1080, 1920) and abs(fps - 60) < 0.01,
       f"     {v['codec_name']} {v.get('profile', '')} {v['pix_fmt']}, {v['width']}x{v['height']}, {fps:.0f} fps, {v.get('nb_frames', '?')} quadros")
    ok(a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000 and int(a['channels']) == 2,
       f"     áudio {a['codec_name']} {a['sample_rate']} Hz, {a['channels']} canais, {int(a.get('bit_rate', 0)) // 1000} kb/s")
    ok(dmin <= vd <= dmax and abs(vd - ad) < 0.05, f'     duração {vd:.3f} s (vídeo) / {ad:.3f} s (áudio), alvo {dmin}–{dmax} s')
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    summ = e[e.rindex('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
    TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
    ok(-15 <= I <= -13 and TP <= -1.0, f'     loudness {I:.1f} LUFS (alvo -14), pico real {TP:.1f} dBTP (limite -1)')
    bd = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-']).stderr
    fz = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-vf', 'freezedetect=n=-60dB:d=0.75', '-an', '-f', 'null', '-']).stderr
    blacks, freezes = re.findall(r'black_start:([\d.]+)', bd), re.findall(r'freeze_start: ([\d.]+)', fz)
    ok(not blacks and not freezes, '     sem quadros pretos (≥ 0,1 s) nem imagem congelada (≥ 0,75 s)'
       + ('' if not blacks else ' | pretos em ' + ', '.join(blacks)) + ('' if not freezes else ' | congela em ' + ', '.join(freezes)))


def frames_gray(path, w=135, h=240):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(float)


def grab(path, t, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1', out], check=True)
    return Image.open(out).convert('RGB')


def lime_share(im, box):
    a = np.asarray(im.crop(box)).astype(int)
    m = (a[..., 1] > 60) & (a[..., 1] > a[..., 0] + 15) & (a[..., 1] > a[..., 2] + 30)     # frente limão ou verso oliva
    return m.mean()


# ---------------------------------------------------------------- técnica
report.append('TÉCNICA')
for n in (1, 2, 3, 4):
    tech(VIDEOS[n - 1], f'Story {n} · {NAMES[n - 1]}', 6, 9)
if os.path.exists(REVIEW):
    tech(REVIEW, 'Vídeo de revisão (sequência contínua)', 30, 34)

# ---------------------------------------------------------------- sincronização
sync.append('SINCRONIZAÇÃO')
for n in (1, 2, 3, 4):
    path, cues = VIDEOS[n - 1], CUES['stories'][n - 1]
    with tempfile.TemporaryDirectory() as tmp:
        m = os.path.join(tmp, 'm.wav')
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-vn', '-ac', '1', '-ar', '48000', m])
        x = wavfile.read(m)[1].astype(float)
    y = wavfile.read(TRACKS[n - 1])[1].astype(float).mean(axis=1)
    lags = []
    for t0 in (1.0, 4.0, 6.5):
        i = int(t0 * 48000)
        a_, b_ = x[max(0, i - 2400): i + 48000], y[max(0, i - 2400): i + 48000]
        c = correlate(a_, b_, mode='full', method='fft')
        lags.append((c.argmax() - (len(b_) - 1)) / 48.0)
    ok(max(abs(v) for v in lags) <= 2, f'Story {n}: áudio do MP4 = trilha do Story, sem deslocamento (' + ', '.join(f'{v:+.1f}' for v in lags) + ' ms)', sync)

    PAD, hop = 4800, 120
    frames = np.lib.stride_tricks.sliding_window_view(np.concatenate([np.zeros(PAD), x]), 1024)[::hop]
    spec = np.abs(np.fft.rfft(frames * np.hanning(1024), axis=1))
    flux = np.maximum(0, np.diff(np.log1p(spec), axis=0)).sum(axis=1)
    ft = ((np.arange(len(flux)) + 1) * hop - PAD) / 48000 + 1024 / 48000 / 2
    offs = []
    for cu in cues:
        if cu['type'] not in KEY[n]:
            continue
        w = (ft > cu['t'] - 0.05) & (ft < cu['t'] + 0.05)
        k = np.argmax(np.where(w, flux, -1))
        offs.append((cu['type'], cu['t'], (ft[k] - cu['t']) * 1000))
    worst = max(abs(o) for *_, o in offs)
    ok(worst <= 17, f'Story {n}: {len(offs)} efeitos-chave com ataque no instante do evento (desvio médio {np.mean([abs(o) for *_, o in offs]):.1f} ms, máximo {worst:.1f} ms; 1 quadro = 16,7 ms)', sync)
    sync_det.append(f'  Story {n} · {NAMES[n - 1]}')
    for ty, t0, o in offs:
        sync_det.append(f'     {t0:6.3f} s  {ty:7s} áudio {o:+6.1f} ms')

    vf = frames_gray(path)
    diff = np.abs(np.diff(vf, axis=0)).mean(axis=(1, 2))
    vis = []
    for cu in cues:
        w = next((v for v in VIS[n] if v[0] == cu['type']), None)
        if not w:
            continue
        i0 = int(round(cu['t'] * 60))
        a0 = max(0, i0 + w[1])
        win = diff[a0: i0 + w[2]]
        base = np.median(diff[max(0, a0 - 46): max(1, a0 - 4)]) if a0 > 20 else np.median(diff[i0 + 40: i0 + 80])
        vis.append((cu['type'], cu['t'], float(win.max()), float(base), int(np.argmax(win) + a0 + 1 - i0)))
    good = [r for r in vis if r[2] > 1.4 * r[3] + 0.3]
    ok(len(good) == len(vis), f'Story {n}: a imagem reage nos {len(vis)} golpes principais', sync)
    for ty, t0, pk, base, df in vis:
        sync_det.append(f'     {t0:6.3f} s  {ty:7s} imagem: movimento {pk:5.1f} (referência {base:4.1f}), pico a {df:+d} quadro(s)')

# ---------------------------------------------------------------- visual
report.append('')
report.append('VISUAL')
font = ImageFont.truetype(FONT, 24)
with tempfile.TemporaryDirectory() as tmp:
    # zonas seguras: 3 instantes por Story, com as zonas da interface e a área do adesivo de link
    TW, TH = 300, 533
    sheet = Image.new('RGB', (12 * (TW + 8) + 8, TH + 50), (34, 34, 34))
    dr = ImageDraw.Draw(sheet)
    col = 0
    for n in (1, 2, 3, 4):
        for t in CHECK_T[n]:
            im = grab(VIDEOS[n - 1], t, os.path.join(tmp, f'z{n}.png')).convert('RGBA')
            ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(ov)
            for z in UI_ZONES:
                d.rectangle(z, fill=(255, 40, 80, 70), outline=(255, 40, 80, 255), width=4)
            d.line([(0, TEXT_SAFE[0]), (1080, TEXT_SAFE[0])], fill=(255, 200, 0, 255), width=3)
            d.line([(0, TEXT_SAFE[1]), (1080, TEXT_SAFE[1])], fill=(255, 200, 0, 255), width=3)
            if n == 4:
                d.rectangle((140, 1360, 940, 1530), outline=(60, 160, 255, 255), width=5)
            im = Image.alpha_composite(im, ov).convert('RGB').resize((TW, TH), Image.LANCZOS)
            x0 = 8 + col * (TW + 8)
            sheet.paste(im, (x0, 8))
            dr.text((x0, TH + 16), f'S{n} {t:.1f}s', font=font, fill=(175, 250, 39))
            col += 1
    sheet.save(os.path.join(OUT, 'zonas-seguras.jpg'), quality=88)
    report.append('       zonas-seguras.jpg: vermelho = interface do Instagram; amarelo = limite do texto (270–1650 px); azul = adesivo de link')

    # área do adesivo de link no Story 4: fica livre do instante em que o convite fica completo até o fim
    vf = frames_gray(VIDEOS[3], 1080, 1920)
    x0, y0, x1, y1 = LINK
    region = vf[int(3.2 * 60):, y0:y1, x0:x1]
    p999 = np.percentile(region, 99.9)
    ok(p999 < 45, f'Story 4: área do adesivo de link ({x0}–{x1} x {y0}–{y1} px) livre de 3,2 s ao fim (99,9% dos pixels ≤ {p999:.0f}/255: só fundo, halo e partículas; pico isolado {region.max():.0f})')
    top = vf[:, 0:250, :].max(axis=(1, 2))
    report.append(f'       Story 4: interface do topo (0–250 px) — brilho máximo {top.max():.0f}/255 (só fundo e partículas)')

    # continuidade da fita: entra pela pista da esquerda no início e sai pela da direita no fim, em todos
    TW2, TH2 = 240, 427
    cont = Image.new('RGB', (8 * (TW2 + 8) + 8, TH2 + 50), (34, 34, 34))
    dc = ImageDraw.Draw(cont)
    for n in (1, 2, 3, 4):
        for j, t in enumerate((0.35, 7.75)):
            im = grab(VIDEOS[n - 1], t, os.path.join(tmp, f'c{n}{j}.png'))
            if n == 4 and j == 1:                  # último Story: a fita fica, apontando para o link
                share = lime_share(im, (840, 1380, 1000, 1500))
                ok(share > 0.04, f'Story 4: no fim a fita continua na tela e aponta para a área do link ({share * 100:.0f}% da ponta da seta em {t:.2f} s)')
            else:
                share = lime_share(im, LANE_L if j == 0 else LANE_R)
                ok(share > 0.04, f'Story {n}: fita {"entra pela pista da esquerda" if j == 0 else "sai pela pista da direita"} ({share * 100:.0f}% da pista com a fita em {t:.2f} s)')
            d = ImageDraw.Draw(im)
            d.rectangle(LANE_L if j == 0 else ((840, 1380, 1000, 1500) if n == 4 else LANE_R), outline=(60, 160, 255), width=6)
            x = 8 + (2 * (n - 1) + j) * (TW2 + 8)
            cont.paste(im.resize((TW2, TH2), Image.LANCZOS), (x, 8))
            dc.text((x, TH2 + 16), f'S{n} {"início" if j == 0 else "fim"}', font=font, fill=(175, 250, 39))
    cont.save(os.path.join(OUT, 'continuidade.jpg'), quality=88)

# capa do Destaque: recorte circular pequeno em fundo claro e escuro
if os.path.exists(COVER):
    cv = Image.open(COVER).convert('RGB')
    ok(cv.size == (1080, 1080), f'capa do Destaque {cv.size[0]}x{cv.size[1]} (quadrada, recorte circular central)')
    a = np.asarray(cv).astype(int)
    yy, xx = np.mgrid[0:1080, 0:1080]
    ring = (np.hypot(xx - 539.5, yy - 539.5) > 495) & (np.hypot(xx - 539.5, yy - 539.5) < 540)
    ok(a[ring].max() < 90, f'capa: tudo dentro do círculo com folga (faixa de 45 px junto à borda só com fundo, brilho máximo {a[ring].max()})')
    f = ImageFont.truetype(os.path.join(ROOT, 'src', 'fonts', 'InterDisplay-SemiBold.otf'), 22)
    prev = Image.new('RGB', (1240, 760), (128, 128, 128))
    for bg, y0, fg in (((255, 255, 255), 0, (0, 0, 0)), ((0, 0, 0), 380, (245, 245, 245))):
        prev.paste(Image.new('RGB', (1240, 380), bg), (0, y0))
        x = 40
        for dsz in (300, 160, 96, 64):
            d = ImageDraw.Draw(prev)
            d.ellipse((x - 7, y0 + 30 - 7, x + dsz + 6, y0 + 30 + dsz + 6), outline=(200, 200, 200) if bg[0] else (80, 80, 80), width=3)
            im = cv.resize((dsz, dsz), Image.LANCZOS)
            mk = Image.new('L', (dsz, dsz), 0)
            ImageDraw.Draw(mk).ellipse((0, 0, dsz - 1, dsz - 1), fill=255)
            prev.paste(im, (x, y0 + 30), mk)
            d.text((x + dsz // 2, y0 + 30 + dsz + 30), 'Conheça', fill=fg, font=f, anchor='mm')
            x += dsz + 80
    prev.save(os.path.join(OUT, 'capa-destaque-preview.jpg'), quality=92)
    report.append('       capa-destaque-preview.jpg: recorte circular em 300, 160, 96 e 64 px, fundo claro e escuro')

res = 'RESULTADO: ' + ('aprovado' if not fails else f'{len(fails)} falha(s)')
txt = ['STORIES "CONHEÇA" — revisão técnica, visual e de sincronização', ''] + report + [''] + sync + ['', res]
open(os.path.join(OUT, 'relatorio-tecnico.txt'), 'w').write('\n'.join(txt) + '\n')
open(os.path.join(OUT, 'sincronia.txt'), 'w').write('\n'.join(['STORIES "CONHEÇA" — sincronização som x imagem', ''] + sync + ['', 'Evento a evento (instante do evento visual, desvio medido):'] + sync_det) + '\n')
print('\n'.join(txt))
