#!/usr/bin/env python3
"""
Revisão técnica de um episódio da SÉRIE FALA (roda depois do render).

    python3 scripts/qa.py fala-01  ->  output/fala-01/revisao/relatorio-tecnico.txt
                                       output/fala-01/revisao/sincronia.txt
                                       output/fala-01/revisao/zonas-seguras.jpg

Técnica: formato (1080x1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo), duração de 30–36 s (vídeo e áudio),
loudness da mixagem (−14 LUFS ±1) e da voz sozinha, pico real (≤ −1 dBTP), quadros pretos (fora o fade final),
quadros congelados e RITMO (nenhuma janela de 2 s sem movimento; troca de cena a cada ≤ 7 s, com movimento
contínuo dentro de cada cena).
Áreas seguras (medidas nos pixels de quadros a cada 0,25 s): nada na coluna de botões (x ≥ 950, y 1060–1560) e nada
importante acima de y 265 nem abaixo de y 1456 (a legenda fica em y 1280–1440).
Sincronia legenda × voz:
  1. cada palavra da legenda aparece no quadro em que a voz a diz: a mudança da faixa da legenda cai a ≤ 2 quadros
     (33 ms) do início da palavra (marcação de tempo da API, em output/<id>/revisao/palavras.json);
  2. a marcação de tempo bate com o áudio: nas palavras que vêm depois de um silêncio, o início medido no áudio da
     voz está a ≤ 80 ms do instante em que a legenda a mostra.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else 'fala-01'
VIDEO = os.path.join(ROOT, 'output', EP, f'fazlo-hospeda-{EP}.mp4')
AUD = os.path.join(ROOT, 'audio', EP)
OUT = os.path.join(ROOT, 'output', EP, 'revisao')
LN = json.load(open(os.path.join(AUD, 'linha.json')))
PAL = json.load(open(os.path.join(OUT, 'palavras.json')))
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
os.makedirs(OUT, exist_ok=True)
DUR = LN['duracao']
report, sync, fails = [], [], []


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
ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v.get('profile', '')} {v['pix_fmt']}")
ok((int(v['width']), int(v['height'])) == (1080, 1920), f"resolução {v['width']}x{v['height']} (9:16)")
ok(abs(fps - 60) < 0.01, f'{fps:.0f} fps, {v.get("nb_frames", "?")} quadros')
ok(30 <= vd <= 36.02, f'duração do vídeo {vd:.3f} s (alvo 30–36 s)')
ok(a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000 and int(a['channels']) == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz, {a['channels']} canais, {int(a.get('bit_rate', 0)) // 1000} kb/s")
ok(abs(vd - ad) < 0.05, f'vídeo e áudio com a mesma duração (Δ {abs(vd - ad) * 1000:.0f} ms)')
size_mb = int(info['format']['size']) / 1e6
ok(size_mb < 100, f'arquivo {size_mb:.1f} MB, {int(info["format"]["bit_rate"]) / 1e6:.1f} Mb/s')

e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
summ = e[e.rindex('Summary:'):]
I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', summ).group(1))
ok(-15 <= I <= -13, f'loudness integrado da mixagem {I:.1f} LUFS (alvo −14)')
ok(TP <= -1.0, f'pico real {TP:.1f} dBTP (limite −1)')
report.append(f'       faixa de loudness (LRA) {LRA:.1f} LU')
vz = os.path.join(AUD, 'voz-tratada.wav')
if os.path.exists(vz):
    ev = run(['ffmpeg', '-hide_banner', '-nostats', '-i', vz, '-af', 'ebur128', '-f', 'null', '-']).stderr
    Iv = float(re.search(r'I:\s+(-?[\d.]+) LUFS', ev[ev.rindex('Summary:'):]).group(1))
    ok(-15.5 <= Iv <= -13, f'a voz sozinha, na escala da mixagem: {Iv:.1f} LUFS integrados (a trilha e os efeitos somam o resto)')

bd = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-']).stderr
blacks = [(s, t) for s, t in re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', bd) if float(s) < vd - 0.45]
ok(not blacks, 'sem trechos pretos ≥ 0,1 s antes do fade final' + ('' if not blacks else ': ' + ', '.join(f'{float(s):.2f}–{float(t):.2f}s' for s, t in blacks)))
fz = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'freezedetect=n=-60dB:d=0.75', '-an', '-f', 'null', '-']).stderr
freezes = re.findall(r'freeze_start: ([\d.]+)', fz)
ok(not freezes, 'sem imagem congelada ≥ 0,75 s' + ('' if not freezes else ': a partir de ' + ', '.join(f'{float(s):.2f}s' for s in freezes)))

# ---------------------------------------------------------------- os quadros: ritmo, áreas seguras e a legenda
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'scale=270:480,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
vf = np.frombuffer(raw, np.uint8).reshape(-1, 480, 270).astype(float)
diff = np.abs(np.diff(vf, axis=0)).mean(axis=(1, 2))                              # diff[i] = quadro i+1 − quadro i
win = int(2.0 * 60)
mov = uniform_filter1d(diff, win, mode='nearest')
parado = [i / 60 for i in range(0, len(diff) - win, 6) if diff[i:i + win].max() < 0.02]
ok(not parado, 'ritmo: nenhuma janela de 2 s sem movimento' + ('' if not parado else f' (parado a partir de {parado[0]:.2f} s)'))
dur_cenas = [c['t1'] - c['t0'] for c in LN['cenas']]
report.append('       cenas: ' + ' · '.join(f'{c["n"]} {c["tipo"]} {c["t1"] - c["t0"]:.1f} s' for c in LN['cenas']))
ok(max(dur_cenas) <= 7.0, f'troca de cena a cada {min(dur_cenas):.1f}–{max(dur_cenas):.1f} s (média {np.mean(dur_cenas):.1f} s); movimento contínuo dentro de cada cena (o mais quieto: {mov.min():.2f} de diferença média por quadro)')

# legenda: o instante em que cada palavra aparece (mudança na faixa da legenda, y 1270–1450)
frames_cap = vf[:, int(1270 / 4): int(1450 / 4), 20:240]                           # a faixa da legenda (x 80–960)
dcap = np.abs(np.diff(frames_cap, axis=0)).mean(axis=(1, 2))
LEG = json.load(open(os.path.join(OUT, 'legenda.json')))
offs = []
for pg in LEG:
    for w in pg['palavras']:
        f0 = int(round(w['t0'] * 60))
        # a região da própria palavra na faixa da legenda (x e y da palavra), a 1/4 da escala (270x480)
        x0, x1 = int((w['x'] - 4) / 4), int((w['x'] + w['w_px'] + 4) / 4)
        y0, y1 = int((w['y'] - 64) / 4), int((w['y'] + 24) / 4)
        reg = vf[:, y0:y1, x0:x1]
        d_ = np.abs(np.diff(reg, axis=0)).mean(axis=(1, 2))
        lo = max(0, f0 - 4)
        win_ = d_[lo: f0 + 8]
        if len(win_) == 0:
            continue
        pico = float(win_.max())
        # o início da palavra na legenda: o 1º quadro em que a região passa de 25% do pico da janela (e de 0,05)
        idx = np.nonzero(win_ > max(0.05, 0.25 * pico))[0]
        k = (int(idx[0]) + lo + 1 - f0) if len(idx) else 99
        offs.append(({'t0': w['t0'], 'w': w['w']}, k, pico))
bons = [o for o in offs if -1 <= o[1] <= 2]
ok(len(bons) >= 0.97 * len(offs), f'legenda × imagem: {len(bons)} de {len(offs)} palavras começam a aparecer, na própria posição delas, no quadro da fala ou até 2 quadros depois (≤ 33 ms); mediana {np.median([o[1] for o in offs]):.0f} quadro(s)', sync)
for w, k, m in offs:
    if not -1 <= k <= 2:
        sync.append(f'         {w["t0"]:7.3f} s  "{w["w"]}"  início da legenda a {k:+d} quadro(s), pico {m:.2f}')

# marcação de tempo × áudio da voz: início medido nas palavras que vêm depois de um silêncio
sr, x = wavfile.read(os.path.join(AUD, 'voz.wav'))
x = x.astype(float) / 32768
env = 20 * np.log10(np.sqrt(uniform_filter1d(x ** 2, int(0.01 * sr)) + 1e-12))
ref = np.percentile(env[env > -80], 95)
medidas = []
for i, w in enumerate(PAL):
    prev_end = PAL[i - 1]['t1'] if i and PAL[i - 1]['cena'] == w['cena'] else (PAL[i - 1]['t1'] if i else -9)
    if w['t0'] - prev_end < 0.12:
        continue                                                                   # só as que vêm depois de uma pausa
    a0, a1 = int((w['t0'] - 0.15) * sr), int((w['t0'] + 0.20) * sr)
    seg = env[max(0, a0): a1]
    lim = ref - 26                                                                 # 26 dB abaixo do nível da voz
    idx = np.nonzero(seg > lim)[0]
    if not len(idx):
        continue
    # o início é o fim do último silêncio (≥ 30 ms) antes da palavra; a cauda da palavra anterior ("Peraí…") não conta como início
    q = seg <= lim; fim_q = None; j = len(seg) - 1 - int(0.10 * sr)
    while j >= int(0.03 * sr):
        if q[j - int(0.03 * sr):j + 1].all():
            while j + 1 < len(q) and q[j + 1]:
                j += 1
            fim_q = j + 1; break
        j -= 1
    t_on = (max(0, a0) + (fim_q if fim_q is not None and fim_q < len(seg) else idx[0])) / sr
    medidas.append((w, (t_on - w['t0']) * 1000))
mx = max(abs(m) for _, m in medidas)
ok(mx <= 80, f'voz × legenda: nas {len(medidas)} palavras que começam depois de uma pausa, o início medido no áudio fica a {np.mean([abs(m) for _, m in medidas]):.0f} ms em média e a {mx:.0f} ms no máximo do instante em que a legenda aparece (limite 80 ms)', sync)
for w, m in medidas:
    sync.append(f'         {w["t0"]:7.3f} s  "{w["w"]:<14s}"  áudio {m:+6.1f} ms')

# áreas seguras: pixels acesos nos quadros a cada 0,25 s
raw2 = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'fps=4,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw2, np.uint8).reshape(-1, 1920, 1080).astype(float)
n_but = int(sum((f[1060:1560, 950:1080] > 70).sum() for f in fr))
sob = sum(1 for k, f in enumerate(fr) if k / 4 < DUR - 0.5 and (f[0:265, :] > 110).sum() > 0)
baixo = sum(1 for k, f in enumerate(fr) if k / 4 < DUR - 0.5 and (f[1456:, :] > 110).sum() > 0)
ok(n_but == 0, f'coluna de botões (x ≥ 950, y 1060–1560): 0 pixel aceso em {len(fr)} quadros amostrados' if n_but == 0 else f'coluna de botões: {n_but} pixels acesos')
ok(sob == 0 and baixo == 0, f'conteúdo entre y 265 e 1456: nada aceso acima de 265 (quadros: {sob}) nem abaixo de 1456 (quadros: {baixo}), fora o fade final')
f0 = fr[0]
ok(f0.mean() > 3 and (f0[560:900, 100:960] > 120).sum() > 500, f'o 1º quadro já tem o gancho escrito (luminância média {f0.mean():.1f}, texto na faixa y 560–900)')

# ---------------------------------------------------------------- folhas
font = ImageFont.truetype(FONT, 26)
CHECK_T = [0.0] + [round((c['t0'] + c['t1']) / 2, 2) for c in LN['cenas']][1:] + [round(DUR - 0.5, 2)]
with tempfile.TemporaryDirectory() as tmp:
    TW, TH, COLS = 300, 533, 6
    rows = (len(CHECK_T) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * (TW + 10) + 10, rows * (TH + 44) + 10), (40, 40, 40))
    dr = ImageDraw.Draw(sheet)
    for i, t in enumerate(CHECK_T):
        pth = os.path.join(tmp, f'{i}.png')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', VIDEO, '-frames:v', '1', pth], check=True)
        im = Image.open(pth).convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        d.rectangle((950, 1060, 1079, 1559), fill=(255, 40, 80, 70), outline=(255, 40, 80, 255), width=4)
        d.rectangle((0, 0, 1079, 264), fill=(255, 40, 80, 50)); d.rectangle((0, 1456, 1079, 1919), fill=(255, 40, 80, 30))
        d.rectangle((0, 240, 1079, 1679), outline=(175, 250, 39, 255), width=4)
        im = Image.alpha_composite(im, ov).convert('RGB').resize((TW, TH), Image.LANCZOS)
        x0, y0 = 10 + (i % COLS) * (TW + 10), 10 + (i // COLS) * (TH + 44)
        sheet.paste(im, (x0, y0)); dr.text((x0, y0 + TH + 8), f'{t:05.2f}s', font=font, fill=(175, 250, 39))
    sheet.save(os.path.join(OUT, 'zonas-seguras.jpg'), quality=88)

res = 'RESULTADO: ' + ('aprovado' if not fails else f'{len(fails)} falha(s)')
txt = [f'SÉRIE FALA · {EP} — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + report + ['', 'Sincronização legenda × voz (detalhes em sincronia.txt):'] + sync[:0]
txt += [l for l in sync if l.startswith(('OK', 'FALHA'))] + ['', res]
open(os.path.join(OUT, 'relatorio-tecnico.txt'), 'w').write('\n'.join(txt) + '\n')
open(os.path.join(OUT, 'sincronia.txt'), 'w').write('\n'.join([f'SÉRIE FALA · {EP} — sincronia legenda × voz', ''] + [l for l in sync if l.startswith(('OK', 'FALHA'))] + ['', 'Palavra a palavra (instante da palavra na marcação de tempo; início medido no áudio, nas que vêm depois de uma pausa):'] + [l for l in sync if not l.startswith(('OK', 'FALHA'))]) + '\n')
print('\n'.join(txt))
