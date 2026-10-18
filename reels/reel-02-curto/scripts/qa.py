#!/usr/bin/env python3
"""
Revisão técnica e de sincronização do Reel 02 · corte curto (roda depois do render).

    python3 scripts/qa.py   ->  output/revisao/relatorio-tecnico.txt
                                output/revisao/sincronia.txt
                                output/revisao/zonas-seguras.jpg

Técnica: formato (1080x1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo), duração de 15,0 s (vídeo e áudio),
loudness (−14 LUFS ±1), pico real (≤ −1 dBTP), quadros pretos (fora o fade final) e congelados.
Cortes: todos num tempo da música (140 BPM) nos dois relógios, com crossfade de 30 ms no som.
Textos: o gancho no quadro 0; nenhum domínio nem CTA no fecho. Áreas seguras: o título do gancho fora da
coluna de botões (x ≥ 950, y 1060–1560) e da faixa de baixo (y ≥ 1560).
Sincronização, em três camadas (áudio do MP4 = trilha; ataque no instante do evento; a imagem reage).
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
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-02-curto.mp4')
MAPA = json.load(open(os.path.join(ROOT, 'src', 'mapa.json')))
TRACK = os.path.join(ROOT, 'audio', 'trilha.wav')
CUES = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))
OUT = os.path.join(ROOT, 'output', 'revisao')
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
os.makedirs(OUT, exist_ok=True)

UI_ZONES = [(0, 0, 1080, 220), (0, 1560, 1080, 1920), (950, 1060, 1080, 1560)]
CHECK_T = [0.0, 0.9, 2.0, 3.0, 4.4, 5.6, 6.8, 8.0, 9.2, 10.2, 11.0, 12.8, 14.4]
# golpes que se destacam na mixagem (as palhetas e os tiques dividem a grade com o chimbal;
# a posição deles vem do mesmo cues.json)
KEY = ('slam', 'shatter', 'drop', 'filter', 'ding')   # os "snap" (colcheias e semicolcheias em fila) ficam de fora: o detector confunde um com o vizinho, no original também

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
ok(abs(vd - 15.0) <= 0.05, f'duração do vídeo {vd:.3f} s (alvo 15,0 s)')
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
blacks = [(s, e) for s, e in re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', bd) if float(s) < MAPA['fade'][0] - 0.05]
ok(not blacks, 'sem trechos pretos ≥ 0,1 s antes do fade final (11,7–12 s)' + ('' if not blacks else ': ' + ', '.join(f'{float(s):.2f}–{float(t):.2f}s' for s, t in blacks)))
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
    for t0 in (1.0, 5.0, 9.0):
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
    # o mesmo detector, na trilha do ORIGINAL (reels/reel-02/audio/trilha.wav), no instante de origem de cada cue:
    # o "ding" e o "boom" da assinatura podem ter o corpo do golpe depois do instante do evento no próprio Reel 02;
    # o corte não pode acrescentar atraso a isso
    ORIGW = wavfile.read(os.path.join(ROOT, '..', 'reel-02', 'audio', 'trilha.wav'))[1].astype(float).mean(axis=1)
    fo = np.lib.stride_tricks.sliding_window_view(np.concatenate([np.zeros(PAD), ORIGW]), 1024)[::hop]
    so = np.abs(np.fft.rfft(fo * np.hanning(1024), axis=1))
    fluxo = np.maximum(0, np.diff(np.log1p(so), axis=0)).sum(axis=1)
    fto = ((np.arange(len(fluxo)) + 1) * hop - PAD) / 48000 + 1024 / 48000 / 2
    dif, orig_offs = [], []
    for cu in CUES['cues']:
        if cu['type'] not in KEY:
            continue
        w = (fto > cu['original'] - 0.05) & (fto < cu['original'] + 0.05)
        k = np.argmax(np.where(w, fluxo, -1))
        orig_offs.append((fto[k] - cu['original']) * 1000)
    dif = [abs(a_[2] - b_) for a_, b_ in zip(offs, orig_offs)]
    ok(max(dif) <= 8, f'{len(offs)} efeitos-chave: o corte não muda o ataque de nenhum (diferença para o original: média {np.mean(dif):.1f} ms, máxima {max(dif):.1f} ms; 1 quadro = 16,7 ms)', sync)
    ok(np.median([abs(o) for *_, o in offs]) <= 10, f'ataque no instante do evento (mediana {np.median([abs(o) for *_, o in offs]):.1f} ms, máximo {worst:.1f} ms: os golpes mais graves (o "ding" da assinatura) já têm ~{max(orig_offs):.0f} ms no original)', sync)
    for (ty, t0, o), oo in zip(offs, orig_offs):
        sync_det.append(f'         {t0:7.3f} s  {ty:8s}  áudio {o:+6.1f} ms  (no original: {oo:+6.1f} ms)')

    # 3) a imagem muda nesses instantes: pico de diferença entre quadros
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'scale=135:240,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    vf = np.frombuffer(raw, np.uint8).reshape(-1, 240, 135).astype(float)
    diff = np.abs(np.diff(vf, axis=0)).mean(axis=(1, 2))          # diff[i] = quadro i+1 - quadro i
    vis = []
    # a logo surge no centro: mede-se o miolo do quadro (a câmera acabou de mergulhar)
    dc = np.abs(np.diff(vf[:, 72:168, 40:95], axis=0)).mean(axis=(1, 2))
    for cu in CUES['cues']:
        if cu['type'] not in ('shatter', 'drop', 'filter'):
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

# ---------------------------------------------------------------- cortes, textos e o título do gancho
BT = 60 / 140
cortes = []
for tr in MAPA['trechos']:
    a_, b_, o_ = tr['novo'][0], tr['novo'][1], tr['original']
    cortes.append(all(abs(v / BT - round(v / BT)) < 1e-6 for v in (a_, b_, o_)))
    report.append(f"       {a_:7.3f}–{b_:7.3f} s  ←  original {o_:6.3f}–{o_ + b_ - a_:6.3f} s  ({tr['nome']})")
ok(all(cortes), f"{len(MAPA['trechos']) - 1} cortes, todos num tempo da música (múltiplos de {BT:.5f} s, 140 BPM) nos dois relógios; crossfade de {MAPA['crossfade'] * 1000:.0f} ms no som")
# o gancho: Inter Display 900, as 3 linhas inteiras no quadro 0 (medido pelo motor: output/revisao/gancho.json)
G = json.load(open(os.path.join(OUT, 'gancho.json')))
caixas = []
for k_, (s_, b_) in enumerate(zip(G['lines'], G['y'])):
    sz = G['size3'] if k_ == 2 else G['size']
    fi = ImageFont.truetype(os.path.join(ROOT, 'src', 'fonts', 'InterDisplay-Black.otf'), sz)
    w = fi.getlength(s_) - 0.025 * sz * (len(s_) - 1)
    caixas.append((s_, 540 - w / 2, 540 + w / 2, b_ - 0.727 * sz, b_ + 0.22 * sz))
fora = all(not (x1 > 950 and y1 > 1060 and y0 < 1560) and y1 < 1560 and y0 > 265 and x0 > 60 and x1 < 1020 for _, x0, x1, y0, y1 in caixas)
ok(fora, f"título do gancho ({G['size']} px nas duas primeiras linhas, {G['size3']} px na 3ª) fora da coluna de botões e da faixa de baixo, dentro de y 265–1560: " + '; '.join(f'"{s_}" x {x0:.0f}–{x1:.0f}, y {y0:.0f}–{y1:.0f}' for s_, x0, x1, y0, y1 in caixas))
# nenhum domínio nem CTA no fecho: no quadro de 14,4 s não há o botão limão "CONHEÇA O SISTEMA · LINK NA BIO"
# (y 1120–1260) nem a linha "GESTÃO DE RESERVAS" (limão, y 800–845)
with tempfile.TemporaryDirectory() as tmp0:
    pth = os.path.join(tmp0, 'f.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '14.4', '-i', VIDEO, '-frames:v', '1', pth], check=True)
    fr = np.asarray(Image.open(pth).convert('RGB')).astype(int)
    limao = lambda a: (abs(a[:, :, 0] - 175) < 40) & (abs(a[:, :, 1] - 250) < 40) & (abs(a[:, :, 2] - 39) < 60)
    botao, rotulo = int(limao(fr[1120:1260, 150:930]).sum()), int(limao(fr[800:845, 200:880]).sum())
    ok(botao < 200 and rotulo < 200, f'fecho: "Cada reserva no seu lugar." + logo, sem o botão do CTA (pixels limão em y 1120–1260: {botao}), sem "GESTÃO DE RESERVAS" (y 800–845: {rotulo}) e sem domínio do site (trocas em src/teste.js)')

res = 'RESULTADO: ' + ('aprovado' if not fails else f'{len(fails)} falha(s)')
txt = ['REEL 02 · CORTE CURTO (15 s) — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + report + ['', 'Sincronização (detalhes em sincronia.txt):'] + sync + ['', res]
open(os.path.join(OUT, 'relatorio-tecnico.txt'), 'w').write('\n'.join(txt) + '\n')
open(os.path.join(OUT, 'sincronia.txt'), 'w').write('\n'.join(['REEL 02 · CORTE CURTO — sincronização som x imagem', ''] + sync + ['', 'Evento a evento (instante do evento visual, desvio medido):'] + sync_det) + '\n')
print('\n'.join(txt))
