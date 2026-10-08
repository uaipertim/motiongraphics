#!/usr/bin/env python3
"""
Revisão técnica do vídeo final (roda depois do render).

    python3 scripts/qa.py   ->  output/revisao/relatorio-tecnico.txt
                                output/revisao/zonas-seguras.jpg
                                output/revisao/capa-no-feed.jpg

Confere formato (1080x1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo),
duração de vídeo e áudio, loudness (-14 LUFS ±1) e pico real (≤ -1 dBTP),
quadros pretos e congelados, e desenha as áreas cobertas pela interface do
Reels sobre quadros com texto para a conferência visual.
"""
import json
import os
import re
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-00.mp4')
COVER = os.path.join(ROOT, 'output', 'capa.png')
OUT = os.path.join(ROOT, 'output', 'revisao')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
os.makedirs(OUT, exist_ok=True)

# Áreas cobertas pela interface do Reels num quadro de 1080x1920 (referência
# conservadora para posts orgânicos): barra superior, legenda/perfil/áudio
# embaixo e a coluna de ações (curtir, comentar, compartilhar) à direita.
UI_ZONES = [(0, 0, 1080, 220), (0, 1560, 1080, 1920), (950, 1060, 1080, 1560)]
CHECK_T = [0.9, 5.3, 7.0, 8.4, 10.6, 12.6, 14.5, 16.4, 18.4, 20.3, 22.0, 24.15, 27.2]

report, fails = [], []


def ok(cond, msg):
    report.append(('OK   ' if cond else 'FALHA') + '  ' + msg)
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
ok(20 <= vd <= 30, f'duração do vídeo {vd:.3f} s (alvo 20–30 s)')
ok(a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000 and int(a['channels']) == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz, {a['channels']} canais, {int(a.get('bit_rate', 0)) // 1000} kb/s")
ok(abs(vd - ad) < 0.05, f'vídeo e áudio com a mesma duração (Δ {abs(vd - ad) * 1000:.0f} ms)')
ok(size_mb < 100, f'arquivo {size_mb:.1f} MB, {int(info["format"]["bit_rate"]) / 1e6:.1f} Mb/s')

# ---------------------------------------------------------------- loudness
e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
summ = e[e.rindex('Summary:'):]
I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', summ).group(1))
ok(-15 <= I <= -13, f'loudness integrado {I:.1f} LUFS (alvo -14)')
ok(TP <= -1.0, f'pico real {TP:.1f} dBTP (limite -1)')
report.append(f'       faixa de loudness (LRA) {LRA:.1f} LU')

# ---------------------------------------------------------------- sincronia: áudio do MP4 x trilha original
TRACK = os.path.join(ROOT, 'audio', 'trilha.wav')
if os.path.exists(TRACK):
    from scipy.io import wavfile
    from scipy.signal import correlate
    with tempfile.TemporaryDirectory() as tmp:
        m, s_ = os.path.join(tmp, 'm.wav'), os.path.join(tmp, 's.wav')
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', VIDEO, '-vn', '-ac', '1', '-ar', '48000', m])
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', TRACK, '-ac', '1', '-ar', '48000', s_])
        x, y = wavfile.read(m)[1].astype(float), wavfile.read(s_)[1].astype(float)
    cues = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))['sections']
    lags = []
    for t0 in (cues['hook'], cues['drop'], cues['sign']):
        i = int(t0 * 48000)
        a_, b_ = x[max(0, i - 2400): i + 48000], y[max(0, i - 2400): i + 48000]
        c = correlate(a_, b_, mode='full', method='fft')
        lags.append((c.argmax() - (len(b_) - 1)) / 48.0)
    ok(max(abs(l) for l in lags) <= 2, 'áudio do MP4 alinhado com a trilha (desvio ' + ', '.join(f'{l:+.1f}' for l in lags) + ' ms no gancho, drop e assinatura)')

# ---------------------------------------------------------------- quadros pretos / congelados
bd = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-']).stderr
blacks = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', bd)
ok(not blacks, 'sem trechos pretos ≥ 0,1 s' + ('' if not blacks else ': ' + ', '.join(f'{float(s):.2f}–{float(t):.2f}s' for s, t in blacks)))
fz = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'freezedetect=n=-60dB:d=0.75', '-an', '-f', 'null', '-']).stderr
freezes = re.findall(r'freeze_start: ([\d.]+)', fz)
ok(not freezes, 'sem imagem congelada ≥ 0,75 s' + ('' if not freezes else ': a partir de ' + ', '.join(f'{float(s):.2f}s' for s in freezes)))

# ---------------------------------------------------------------- zonas seguras
font = ImageFont.truetype(FONT, 26)


def grab(t, path):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', VIDEO, '-frames:v', '1', path], check=True)
    return Image.open(path).convert('RGB')


with tempfile.TemporaryDirectory() as tmp:
    first = grab(0, os.path.join(tmp, 'f0.png'))
    lum = ImageStat.Stat(first.convert('L')).mean[0]
    ok(lum > 3, f'o 1º quadro já tem imagem (luminância média {lum:.1f}), sem abertura preta')
    TW, TH, COLS = 360, 640, 7
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
        x, y = 10 + (i % COLS) * (TW + 10), 10 + (i // COLS) * (TH + 44)
        sheet.paste(im, (x, y))
        dr.text((x, y + TH + 8), f'{t:05.2f}s', font=font, fill=(175, 250, 39))
    sheet.save(os.path.join(OUT, 'zonas-seguras.jpg'), quality=88)

# capa no feed: o perfil mostra o recorte central 3:4 (1080x1440)
if os.path.exists(COVER):
    cv = Image.open(COVER).convert('RGB')
    ok(cv.size == (1080, 1920), f'capa {cv.size[0]}x{cv.size[1]}')
    crop = cv.crop((0, 240, 1080, 1680))
    prev = Image.new('RGB', (1080 + 40 + 810, 1920), (24, 24, 24))
    prev.paste(cv, (0, 0))
    prev.paste(crop.resize((810, 1080), Image.LANCZOS), (1120, 420))
    d = ImageDraw.Draw(prev)
    d.rectangle((0, 240, 1079, 1679), outline=(175, 250, 39), width=5)
    d.text((1120, 360), 'RECORTE 3:4 NO PERFIL', font=font, fill=(175, 250, 39))
    prev.save(os.path.join(OUT, 'capa-no-feed.jpg'), quality=90)

txt = ['REEL 00 — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + report + ['', 'RESULTADO: ' + ('aprovado' if not fails else f'{len(fails)} falha(s)')]
open(os.path.join(OUT, 'relatorio-tecnico.txt'), 'w').write('\n'.join(txt) + '\n')
print('\n'.join(txt))
