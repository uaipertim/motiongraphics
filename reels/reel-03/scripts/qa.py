#!/usr/bin/env python3
"""
Revisão técnica e de sincronização do vídeo final (roda depois do render).

    python3 scripts/qa.py   ->  output/revisao/relatorio-tecnico.txt
                                output/revisao/sincronia.txt
                                output/revisao/zonas-seguras.jpg
                                output/revisao/capa-no-feed.jpg

Técnica: formato (1080x1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo),
duração de vídeo e áudio, loudness (-14 LUFS ±1), pico real (≤ -1 dBTP),
quadros pretos e congelados.

Sincronização, em três camadas:
  1. o áudio do MP4 é o mesmo da trilha, sem deslocamento (correlação cruzada);
  2. o ataque de cada efeito-chave, medido no áudio final, cai no instante do
     evento visual que o gerou (audio/cues.json);
  3. a imagem muda de fato nesses instantes (pico de diferença entre quadros).
"""
import json
import os
import re
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageStat
from scipy.io import wavfile
from scipy.signal import correlate

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-03.mp4')
COVER = os.path.join(ROOT, 'output', 'capa.png')
TRACK = os.path.join(ROOT, 'audio', 'trilha.wav')
CUES = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))
OUT = os.path.join(ROOT, 'output', 'revisao')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
os.makedirs(OUT, exist_ok=True)

UI_ZONES = [(0, 0, 1080, 220), (0, 1560, 1080, 1920), (950, 1060, 1080, 1560)]
CHECK_T = [0.6, 3.0, 5.2, 7.6, 10.6, 13.4, 16.6, 20.1, 21.9, 24.6, 27.2, 29.5]
# golpes que se destacam na mixagem (as palhetas e os tiques dividem a grade com o chimbal;
# a posição deles vem do mesmo cues.json)
KEY = ('unlock', 'drop', 'drawer', 'arrive', 'key', 'zero', 'boom', 'lock', 'logo')

report, fails = [], []


def ok(cond, msg, rep=report):
    rep.append(('OK   ' if cond else 'FALHA') + '  ' + msg)
    if not cond:
        fails.append(msg)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


# ---------------------------------------------------------------- formato
info = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO]).stdout)
v = next(s for s in info['streams'] if s['codec_type'] == 'video')
a = next(s for s in info['streams'] if s['codec_type'] == 'audio')
fps = eval(v['r_frame_rate'])
vd, ad = float(v['duration']), float(a['duration'])
size_mb = int(info['format']['size']) / 1e6
ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v.get('profile', '')} {v['pix_fmt']}")
ok((int(v['width']), int(v['height'])) == (1080, 1920), f"resolução {v['width']}x{v['height']} (9:16)")
ok(abs(fps - 60) < 0.01, f'{fps:.0f} fps, {v.get("nb_frames", "?")} quadros')
ok(20 <= vd <= 30.02, f'duração do vídeo {vd:.3f} s (alvo 20–30 s)')
ok(a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000 and int(a['channels']) == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz, {a['channels']} canais, {int(a.get('bit_rate', 0)) // 1000} kb/s")
ok(abs(vd - ad) < 0.05, f'vídeo e áudio com a mesma duração (Δ {abs(vd - ad) * 1000:.0f} ms)')
ok(size_mb < 100, f'arquivo {size_mb:.1f} MB, {int(info["format"]["bit_rate"]) / 1e6:.1f} Mb/s')

e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
summ = e[e.rindex('Summary:'):]
I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', summ).group(1))
ok(-15 <= I <= -13, f'loudness integrado {I:.1f} LUFS (alvo -14)')
ok(TP <= -1.0, f'pico real {TP:.1f} dBTP (limite -1)')
report.append(f'       faixa de loudness (LRA) {LRA:.1f} LU')

bd = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-']).stderr
blacks = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', bd)
ok(not blacks, 'sem trechos pretos ≥ 0,1 s' + ('' if not blacks else ': ' + ', '.join(f'{float(s):.2f}–{float(t):.2f}s' for s, t in blacks)))
fz = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'freezedetect=n=-60dB:d=0.75', '-an', '-f', 'null', '-']).stderr
freezes = re.findall(r'freeze_start: ([\d.]+)', fz)
ok(not freezes, 'sem imagem congelada ≥ 0,75 s' + ('' if not freezes else ': a partir de ' + ', '.join(f'{float(s):.2f}s' for s in freezes)))

# ---------------------------------------------------------------- sincronização
sync, sync_det = [], []
with tempfile.TemporaryDirectory() as tmp:
    m = os.path.join(tmp, 'm.wav')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', VIDEO, '-vn', '-ac', '1', '-ar', '48000', m])
    x = wavfile.read(m)[1].astype(float)
    PAD = 4800                                      # 0,1 s de silêncio antes: o detector precisa de um "antes"
    y = wavfile.read(TRACK)[1].astype(float).mean(axis=1)
    # 1) o MP4 carrega a trilha sem deslocamento
    lags = []
    for t0 in (CUES['sections']['hook'] + 1.0, CUES['sections']['drop'], CUES['sections']['finale']):
        i = int(t0 * 48000)
        a_, b_ = x[max(0, i - 2400): i + 48000], y[max(0, i - 2400): i + 48000]
        c = correlate(a_, b_, mode='full', method='fft')
        lags.append((c.argmax() - (len(b_) - 1)) / 48.0)
    ok(max(abs(l) for l in lags) <= 2, 'áudio do MP4 = trilha, sem deslocamento (' + ', '.join(f'{l:+.1f}' for l in lags) + ' ms)', sync)

    # 2) ataque medido no áudio x instante do evento visual
    hop = 120                                       # 2,5 ms
    frames = np.lib.stride_tricks.sliding_window_view(np.concatenate([np.zeros(PAD), x]), 1024)[::hop]
    spec = np.abs(np.fft.rfft(frames * np.hanning(1024), axis=1))
    flux = np.maximum(0, np.diff(np.log1p(spec), axis=0)).sum(axis=1)
    ft = ((np.arange(len(flux)) + 1) * hop - PAD) / 48000 + 1024 / 48000 / 2
    offs = []
    for cu in CUES['cues']:
        if cu['type'] not in KEY:
            continue
        w = (ft > cu['t'] - 0.05) & (ft < cu['t'] + 0.05)
        k = np.argmax(np.where(w, flux, -1))
        offs.append((cu['type'], cu['t'], (ft[k] - cu['t']) * 1000))
    worst = max(abs(o) for _, _, o in offs)
    ok(worst <= 17, f'{len(offs)} efeitos-chave com ataque no instante do evento (desvio médio {np.mean([abs(o) for *_, o in offs]):.1f} ms, máximo {worst:.1f} ms; 1 quadro = 16,7 ms)', sync)
    for ty, t0, o in offs:
        sync_det.append(f'         {t0:7.3f} s  {ty:8s}  áudio {o:+6.1f} ms')

    # 3) a imagem muda nesses instantes: pico de diferença entre quadros
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'scale=135:240,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    vf = np.frombuffer(raw, np.uint8).reshape(-1, 240, 135).astype(float)
    diff = np.abs(np.diff(vf, axis=0)).mean(axis=(1, 2))          # diff[i] = quadro i+1 - quadro i
    vis = []
    # a logo surge no centro: mede-se o miolo do quadro (a câmera acabou de mergulhar)
    dc = np.abs(np.diff(vf[:, 72:168, 40:95], axis=0)).mean(axis=(1, 2))
    for cu in CUES['cues']:
        if cu['type'] not in ('drop', 'arrive', 'zero', 'boom', 'logo'):
            continue
        i0 = int(round(cu['t'] * 60))
        dd = dc if cu['type'] == 'logo' else diff
        win = dd[max(0, i0 - 4): i0 + 8]
        base = np.median(dd[max(0, i0 - 60): max(1, i0 - 10)]) if cu['type'] != 'logo' else np.median(dd[i0 + 40: i0 + 100])
        vis.append((cu['type'], cu['t'], float(win.max()), float(base), (np.argmax(win) + max(0, i0 - 4) + 1 - i0)))
    good = [r for r in vis if r[2] > 1.5 * r[3] + 0.5]
    ok(len(good) == len(vis), f'a imagem reage nos {len(vis)} golpes principais (pico de movimento a ≤ 8 quadros do som)', sync)
    for ty, t0, pk, base, df in vis:
        sync_det.append(f'         {t0:7.3f} s  {ty:8s}  imagem: movimento {pk:5.1f} (antes {base:4.1f}), pico a {df:+d} quadro(s)')

# ---------------------------------------------------------------- zonas seguras + capa
font = ImageFont.truetype(FONT, 26)


def grab(t, path):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', VIDEO, '-frames:v', '1', path], check=True)
    return Image.open(path).convert('RGB')


with tempfile.TemporaryDirectory() as tmp:
    lum = ImageStat.Stat(grab(0, os.path.join(tmp, 'f0.png')).convert('L')).mean[0]
    ok(lum > 3, f'o 1º quadro já tem imagem (luminância média {lum:.1f}), sem abertura preta')
    TW, TH, COLS = 360, 640, 6
    rows = (len(CHECK_T) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * (TW + 10) + 10, rows * (TH + 44) + 10), (40, 40, 40))
    dr = ImageDraw.Draw(sheet)
    for i, t in enumerate(CHECK_T):
        im = grab(t, os.path.join(tmp, f'{i}.png')).convert('RGBA')
        ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        for z in UI_ZONES:
            d.rectangle(z, fill=(255, 40, 80, 70), outline=(255, 40, 80, 255), width=4)
        im = Image.alpha_composite(im, ov).convert('RGB').resize((TW, TH), Image.LANCZOS)
        x0, y0 = 10 + (i % COLS) * (TW + 10), 10 + (i // COLS) * (TH + 44)
        sheet.paste(im, (x0, y0))
        dr.text((x0, y0 + TH + 8), f'{t:05.2f}s', font=font, fill=(175, 250, 39))
    sheet.save(os.path.join(OUT, 'zonas-seguras.jpg'), quality=88)

if os.path.exists(COVER):
    cv = Image.open(COVER).convert('RGB')
    ok(cv.size == (1080, 1920), f'capa {cv.size[0]}x{cv.size[1]}')
    prev = Image.new('RGB', (1080 + 40 + 810, 1920), (24, 24, 24))
    prev.paste(cv, (0, 0))
    prev.paste(cv.crop((0, 240, 1080, 1680)).resize((810, 1080), Image.LANCZOS), (1120, 420))
    d = ImageDraw.Draw(prev)
    d.rectangle((0, 240, 1079, 1679), outline=(175, 250, 39), width=5)
    d.text((1120, 360), 'RECORTE 3:4 NO PERFIL', font=font, fill=(175, 250, 39))
    prev.save(os.path.join(OUT, 'capa-no-feed.jpg'), quality=90)

res = 'RESULTADO: ' + ('aprovado' if not fails else f'{len(fails)} falha(s)')
txt = ['REEL 03 — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + report + ['', 'Sincronização (detalhes em sincronia.txt):'] + sync + ['', res]
open(os.path.join(OUT, 'relatorio-tecnico.txt'), 'w').write('\n'.join(txt) + '\n')
open(os.path.join(OUT, 'sincronia.txt'), 'w').write('\n'.join(['REEL 03 — sincronização som x imagem', ''] + sync + ['', 'Evento a evento (instante do evento visual, desvio medido):'] + sync_det) + '\n')
print('\n'.join(txt))
