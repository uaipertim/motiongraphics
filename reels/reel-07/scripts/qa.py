#!/usr/bin/env python3
"""
Revisão técnica e de sincronização do vídeo final (roda depois do render).

    python3 scripts/qa.py   ->  output/revisao/relatorio-tecnico.txt
                                output/revisao/sincronia.txt
                                output/revisao/zonas-seguras.jpg
                                output/revisao/recorte-3x4.jpg

Técnica: formato (1080x1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo),
duração de vídeo e áudio, loudness (-16 LUFS ±1,5: só efeitos, sem música),
pico real (≤ -1 dBTP), quadros pretos (fora o fade final) e congelados.

Áreas seguras: folha com as zonas da interface do Reels marcadas e folha com
o recorte central 3:4 da grade do perfil (y 240–1680).

Sincronização, em três camadas:
  1. o áudio do MP4 é o mesmo de audio/efeitos.wav, sem deslocamento (correlação cruzada);
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
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-07.mp4')
COVER = os.path.join(ROOT, 'output', 'capa.png')
TRACK = os.path.join(ROOT, 'audio', 'efeitos.wav')
CUES = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))
OUT = os.path.join(ROOT, 'output', 'revisao')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
os.makedirs(OUT, exist_ok=True)

UI_ZONES = [(0, 0, 1080, 220), (0, 1560, 1080, 1920), (950, 1060, 1080, 1560)]
CHECK_T = [0.4, 1.2, 2.45, 3.6, 5.6, 7.4, 9.3, 10.6, 11.3, 12.5, 13.0, 13.5]
# efeitos com ataque definido (o gancho no quadro 0 não tem "antes" para medir)
KEY = ('cut', 'feed', 'key', 'stamp', 'tear', 'logo')
# reação visual: (região em 135x240 ou None = quadro inteiro, janela de referência antes/depois)
VIS = {'cut': (None, 'antes'), 'stamp': (None, 'antes'), 'logo': ((136, 164, 36, 100), 'depois')}

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
ok(13.5 <= vd <= 14.5, f'duração do vídeo {vd:.3f} s (alvo ~14 s)')
ok(a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000 and int(a['channels']) == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz, {a['channels']} canais, {int(a.get('bit_rate', 0)) // 1000} kb/s")
ok(abs(vd - ad) < 0.05, f'vídeo e áudio com a mesma duração (Δ {abs(vd - ad) * 1000:.0f} ms)')
ok(size_mb < 100, f'arquivo {size_mb:.1f} MB, {int(info["format"]["bit_rate"]) / 1e6:.1f} Mb/s')

e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
summ = e[e.rindex('Summary:'):]
I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', summ).group(1))
ok(-17.5 <= I <= -14.5, f'loudness integrado {I:.1f} LUFS (alvo -16: só efeitos, espaço para a música do Instagram)')
ok(TP <= -1.0, f'pico real {TP:.1f} dBTP (limite -1)')
report.append(f'       faixa de loudness (LRA) {LRA:.1f} LU')

bd = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-']).stderr
blacks = [(s, e) for s, e in re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', bd) if float(s) < vd - 0.3]
ok(not blacks, 'sem trechos pretos ≥ 0,1 s antes do fade final' + ('' if not blacks else ': ' + ', '.join(f'{float(s):.2f}–{float(t):.2f}s' for s, t in blacks)))
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
    # 1) o MP4 carrega os efeitos sem deslocamento
    lags = []
    for t0 in (CUES['sections']['cut'], CUES['sections']['l3'], CUES['sections']['stamp']):
        i = int(t0 * 48000)
        a_, b_ = x[max(0, i - 2400): i + 48000], y[max(0, i - 2400): i + 48000]
        c = correlate(a_, b_, mode='full', method='fft')
        lags.append((c.argmax() - (len(b_) - 1)) / 48.0)
    ok(max(abs(l) for l in lags) <= 2, 'áudio do MP4 = efeitos.wav, sem deslocamento (' + ', '.join(f'{l:+.1f}' for l in lags) + ' ms)', sync)

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
    # a logo entra pequena: mede-se só a região dela
    for cu in CUES['cues']:
        if cu['type'] not in VIS:
            continue
        i0 = int(round(cu['t'] * 60))
        roi, ref = VIS[cu['type']]
        dd = diff if roi is None else np.abs(np.diff(vf[:, roi[0]:roi[1], roi[2]:roi[3]], axis=0)).mean(axis=(1, 2))
        win = dd[max(0, i0 - 4): i0 + 8]
        base = np.median(dd[max(0, i0 - 60): max(1, i0 - 10)]) if ref == 'antes' else np.median(dd[i0 + 30: i0 + 54])
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
        d.rectangle((0, 240, 1079, 1679), outline=(175, 250, 39, 255), width=4)
        im = Image.alpha_composite(im, ov).convert('RGB').resize((TW, TH), Image.LANCZOS)
        x0, y0 = 10 + (i % COLS) * (TW + 10), 10 + (i // COLS) * (TH + 44)
        sheet.paste(im, (x0, y0))
        dr.text((x0, y0 + TH + 8), f'{t:05.2f}s', font=font, fill=(175, 250, 39))
    sheet.save(os.path.join(OUT, 'zonas-seguras.jpg'), quality=88)

    # a prévia da grade do perfil: o recorte central 3:4 de cada instante
    sheet = Image.new('RGB', (COLS * (TW + 10) + 10, rows * (TW * 4 // 3 + 44) + 10), (40, 40, 40))
    dr = ImageDraw.Draw(sheet)
    for i, t in enumerate(CHECK_T):
        im = grab(t, os.path.join(tmp, f'c{i}.png')).crop((0, 240, 1080, 1680)).resize((TW, TW * 4 // 3), Image.LANCZOS)
        x0, y0 = 10 + (i % COLS) * (TW + 10), 10 + (i // COLS) * (TW * 4 // 3 + 44)
        sheet.paste(im, (x0, y0))
        dr.text((x0, y0 + TW * 4 // 3 + 8), f'{t:05.2f}s  3:4', font=font, fill=(175, 250, 39))
    sheet.save(os.path.join(OUT, 'recorte-3x4.jpg'), quality=88)

if os.path.exists(COVER):
    cv = Image.open(COVER).convert('RGB')
    ok(cv.size == (1080, 1920), f'capa {cv.size[0]}x{cv.size[1]}')

res = 'RESULTADO: ' + ('aprovado' if not fails else f'{len(fails)} falha(s)')
txt = ['REEL 07 — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + report + ['', 'Sincronização (detalhes em sincronia.txt):'] + sync + ['', res]
open(os.path.join(OUT, 'relatorio-tecnico.txt'), 'w').write('\n'.join(txt) + '\n')
open(os.path.join(OUT, 'sincronia.txt'), 'w').write('\n'.join(['REEL 07 — sincronização som x imagem', ''] + sync + ['', 'Evento a evento (instante do evento visual, desvio medido):'] + sync_det) + '\n')
print('\n'.join(txt))
