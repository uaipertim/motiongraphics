#!/usr/bin/env python3
"""
Revisão técnica de um episódio da SÉRIE EXPLICA (roda depois do render e de `render.cjs info`).

    python3 scripts/qa.py explica-01  ->  output/explica-01/revisao/relatorio-tecnico.txt
                                          output/explica-01/revisao/zonas-seguras.jpg

Confere:
  • formato: 1080x1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo; duração de 60–90 s (vídeo e áudio iguais);
  • som: −14 LUFS integrados (±0,5), pico real ≤ −1 dBTP, a voz sozinha na escala da mixagem;
  • sem quadros pretos e sem imagem congelada por 1,5 s ou mais;
  • áreas seguras: (pixels, a cada 0,25 s) nada aceso na coluna de botões x ≥ 950, y 1060–1560; (caixas do motor, a
    cada 0,25 s, fora das trocas de capítulo) todo conteúdo importante — marca, rótulo, título, linha de apoio, peças
    do diagrama — entre y 265 e 1456 e fora da coluna de botões;
  • leitura: cada linha de apoio fica ao menos 1,5 s inteira na tela (do fim da entrada até a próxima);
  • a voz: cada capítulo é UMA geração inteira, colocada sem cortes — o trecho do vídeo é idêntico ao arquivo da
    geração (fora os fades de 8 ms / 60 ms nas pontas), e o arquivo é o mesmo registrado na geração (sha1);
  • a capa é o quadro 0 (o quadro 0 do vídeo bate com capa.png);
  • o fecho: todo texto parado e legível nos últimos 3 s (a última mudança de texto acontece ≥ 3 s antes do fim, e
    as caixas de texto do fecho não mudam de pixel entre fim − 3 s e o fim).
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.io import wavfile
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else 'explica-01'
VIDEO = os.path.join(ROOT, 'output', EP, f'fazlo-hospeda-{EP}.mp4')
AUD = os.path.join(ROOT, 'audio', EP)
OUT = os.path.join(ROOT, 'output', EP, 'revisao')
LN = json.load(open(os.path.join(AUD, 'linha.json')))
MOT = json.load(open(os.path.join(OUT, 'motor.json')))
CX = json.load(open(os.path.join(OUT, 'caixas.json')))
FALAS = json.load(open(os.path.join(AUD, 'voz', 'falas.json')))['capitulos']
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
DUR = LN['duracao']
report, fails = [], []


def ok(cond, msg):
    report.append(('OK   ' if cond else 'FALHA') + '  ' + msg)
    if not cond:
        fails.append(msg)


def info(msg):
    report.append('       ' + msg)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


# ---------------------------------------------------------------- formato
report.append('FORMATO')
inf = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO]).stdout)
v = next(s for s in inf['streams'] if s['codec_type'] == 'video')
a = next(s for s in inf['streams'] if s['codec_type'] == 'audio')
fps = eval(v['r_frame_rate'])
vd, ad = float(v['duration']), float(a['duration'])
ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v.get('profile', '')} {v['pix_fmt']}")
ok((int(v['width']), int(v['height'])) == (1080, 1920), f"resolução {v['width']}x{v['height']} (9:16)")
ok(abs(fps - 60) < 0.01, f'{fps:.0f} fps, {v.get("nb_frames", "?")} quadros')
ok(60 <= vd <= 90, f'duração {vd:.2f} s (alvo 60–90 s)')
ok(a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000 and int(a['channels']) == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz, {a['channels']} canais, {int(a.get('bit_rate', 0)) // 1000} kb/s")
ok(abs(vd - ad) < 0.05, f'vídeo e áudio com a mesma duração (Δ {abs(vd - ad) * 1000:.0f} ms)')
info(f'arquivo {int(inf["format"]["size"]) / 1e6:.1f} MB, {int(inf["format"]["bit_rate"]) / 1e6:.1f} Mb/s')
info('capítulos: ' + ' · '.join(f'{c["n"]:02d} {c["t1"] - c["t0"]:.1f} s' for c in LN['capitulos']) + f' · trocas de {LN["tr"]:.1f} s')

# ---------------------------------------------------------------- som
report += ['', 'SOM']
e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
summ = e[e.rindex('Summary:'):]
I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
ok(-14.5 <= I <= -13.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
ok(TP <= -1.0, f'pico real {TP:.1f} dBTP (limite −1)')
for nome, rot in (('voz-tratada', 'a voz sozinha'), ('musica', 'a trilha sozinha'), ('sfx', 'os efeitos sozinhos')):
    f = os.path.join(AUD, nome + '.wav')
    if os.path.exists(f):
        ev = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-']).stderr
        info(f'{rot}, na escala da mixagem: {float(re.search(r"I:\s+(-?[\d.]+) LUFS", ev[ev.rindex("Summary:"):]).group(1)):.1f} LUFS')

# ---------------------------------------------------------------- a voz: uma geração inteira por capítulo, sem emendas
report += ['', 'VOZ (uma geração inteira por capítulo, nada emendado)']
sr, voz = wavfile.read(os.path.join(AUD, 'voz.wav'))
voz = voz.astype(np.float64) / 32768
piores = []
for c in LN['colocacao']:
    key = f'{c["cap"]:02d}'
    srx, y = wavfile.read(os.path.join(AUD, c['arquivo']))
    sha_ok = hashlib.sha1(y.tobytes()).hexdigest() == FALAS[key]['sha1_audio']
    y = y.astype(np.float64) / 32768
    seg = resample_poly(y[int(round(c['de_s'] * srx)):int(round(c['ate_s'] * srx))], sr, srx)
    i = int(round(c['no_video_s'] * sr))
    k0, k1 = int(0.008 * sr), int(0.06 * sr)
    got = voz[i + k0:i + len(seg) - k1]
    ref = seg[k0:len(seg) - k1]
    dif = float(np.abs(got - ref).max()) if len(got) == len(ref) else 9.0
    piores.append(dif)
    nome_hist = FALAS[key]['geracoes']
    ok(sha_ok and dif < 2e-4, f'capítulo {key}: {c["ate_s"] - c["de_s"]:.2f} s contínuos da geração com seed {FALAS[key]["seed"]} '
       f'(arquivo íntegro: {"sim" if sha_ok else "NÃO"}; diferença máxima vídeo × geração {dif:.6f}; {nome_hist} geração(ões) inteiras feitas)')

# ---------------------------------------------------------------- leitura das linhas de apoio
report += ['', 'LEITURA (linhas de apoio: ≥ 1,5 s inteiras na tela)']
curtas = []
for ap in MOT['apoios']:
    tempo = ap['ate'] - ap['inteira_de']
    if tempo < 1.5 - 1e-3:
        curtas.append(ap)
    info(f'cap {ap["cap"]:02d} · apoio {ap["i"]}: {tempo:4.2f} s inteira · "{ap["texto"]}"')
ok(not curtas, f'{len(MOT["apoios"])} linhas de apoio, a mais curta fica {min(ap["ate"] - ap["inteira_de"] for ap in MOT["apoios"]):.2f} s inteira na tela (mínimo 1,5 s)')

# ---------------------------------------------------------------- áreas seguras pelas caixas do motor
report += ['', 'ÁREAS SEGURAS']
trocas = [(x['t0'], x['t1']) for x in MOT['trocas']]
em_troca = lambda t: any(a - 0.05 <= t <= b + 0.65 for a, b in trocas)            # troca + a entrada do título
fora, botao, n_cx, n_t = [], [], 0, 0
for s in CX:
    if em_troca(s['t']):
        continue
    n_t += 1
    for b in s['caixas']:
        n_cx += 1
        if b['y0'] < 265 - 0.5 or b['y1'] > 1456 + 0.5:
            fora.append((s['t'], b))
        if b['x1'] > 950 and b['y1'] > 1060 and b['y0'] < 1560:
            botao.append((s['t'], b))
ok(not fora, f'conteúdo importante entre y 265 e 1456: {n_cx} caixas em {n_t} quadros fora das trocas' + ('' if not fora else ' · fora: ' + '; '.join(f'{t:.2f}s {b["nome"]} y {b["y0"]:.0f}–{b["y1"]:.0f}' for t, b in fora[:6])))
ok(not botao, 'nenhuma caixa na coluna de botões (x ≥ 950, y 1060–1560)' + ('' if not botao else ': ' + '; '.join(f'{t:.2f}s {b["nome"]}' for t, b in botao[:6])))
ys = [b['y0'] for s in CX if not em_troca(s['t']) for b in s['caixas']] + [b['y1'] for s in CX if not em_troca(s['t']) for b in s['caixas']]
info(f'faixa usada pelo conteúdo: y {min(ys):.0f}–{max(ys):.0f}')

# pixels: a coluna de botões, quadro a quadro (4 por segundo), streaming
proc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'fps=4,format=gray', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
n_fr, n_but, f0 = 0, 0, None
while True:
    buf = proc.stdout.read(1920 * 1080)
    if len(buf) < 1920 * 1080:
        break
    f = np.frombuffer(buf, np.uint8).reshape(1920, 1080)
    if f0 is None:
        f0 = f.copy()
    n_but += int((f[1060:1560, 950:1080] > 70).sum()); n_fr += 1
proc.wait()
ok(n_but == 0, f'coluna de botões: {n_but} pixel aceso em {n_fr} quadros amostrados (nem o trilho passa por ali)')

# quadros pretos / congelados
bd = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-']).stderr
ok(not re.findall(r'black_start', bd), 'sem trechos pretos')
fz = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'freezedetect=n=-60dB:d=1.5', '-an', '-f', 'null', '-']).stderr
fr_ = re.findall(r'freeze_start: ([\d.]+)', fz)
ok(not fr_, 'sem imagem congelada por 1,5 s ou mais (o fundo, o trilho e as peças seguem vivos)' + ('' if not fr_ else ': ' + ', '.join(fr_)))

# ---------------------------------------------------------------- capa = quadro 0
report += ['', 'CAPA E FECHO']
capa = np.asarray(Image.open(os.path.join(ROOT, 'output', EP, 'capa.png')).convert('L')).astype(float)
mse = float(np.mean((capa - f0.astype(float)) ** 2))
psnr = 99.0 if mse == 0 else 10 * np.log10(255 ** 2 / mse)
ok(psnr > 34, f'a capa é o quadro 0 do vídeo (PSNR {psnr:.1f} dB entre capa.png e o 1º quadro)')
ct = os.path.join(OUT, 'capa.txt')
if os.path.exists(ct):
    res = open(ct).read().strip().splitlines()[-1]
    ok('dentro da regra' in res, f'regra das capas (revisao/capa.txt): {res.replace("RESULTADO: ", "")}')

# ---------------------------------------------------------------- fecho: ≥ 3 s parado e legível
ult = MOT['fecho']['ultima_mudanca_de_texto']
ok(DUR - ult >= 3.0, f'fecho: a última mudança de texto é em {ult:.2f} s; o texto fica parado {DUR - ult:.2f} s até o fim (mínimo 3 s)')
fim = [s for s in CX if s['t'] >= DUR - 0.6]
cxs = [b for b in fim[-1]['caixas'] if b['cap'] == len(LN['capitulos']) - 1 and not b['nome'].startswith(('card do vídeo', 'ação'))] if fim else []


def frame_at(t):
    with tempfile.TemporaryDirectory() as tmp:
        pth = os.path.join(tmp, 'f.png')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', VIDEO, '-frames:v', '1', pth], check=True)
        return np.asarray(Image.open(pth).convert('L')).astype(float)


fa, fb = frame_at(DUR - 3.0), frame_at(DUR - 0.08)
difs = []
for b in cxs:
    x0, x1, y0, y1 = int(max(0, b['x0'])), int(min(1080, b['x1'])), int(max(0, b['y0'])), int(min(1920, b['y1']))
    difs.append((b['nome'], float(np.abs(fa[y0:y1, x0:x1] - fb[y0:y1, x0:x1]).mean())))
mx = max(d for _, d in difs) if difs else 0
ok(mx < 3.0, f'fecho: {len(difs)} textos (título, apoio, chips, comentário) iguais entre {DUR - 3:.2f} s e o fim (maior diferença média {mx:.2f} de 255)')

# ---------------------------------------------------------------- folha das zonas seguras
font = ImageFont.truetype(FONT, 26)
CHECK_T = [0.0] + [round(c['t1'] - 0.2, 2) for c in LN['capitulos']]
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
        d.rectangle((0, 0, 1079, 264), fill=(255, 40, 80, 50)); d.rectangle((0, 1457, 1079, 1919), fill=(255, 40, 80, 30))
        im = Image.alpha_composite(im, ov).convert('RGB').resize((TW, TH), Image.LANCZOS)
        x0, y0 = 10 + (i % COLS) * (TW + 10), 10 + (i // COLS) * (TH + 44)
        sheet.paste(im, (x0, y0)); dr.text((x0, y0 + TH + 8), f'{t:05.2f}s', font=font, fill=(175, 250, 39))
    sheet.save(os.path.join(OUT, 'zonas-seguras.jpg'), quality=88)

res = 'RESULTADO: ' + ('aprovado' if not fails else f'{len(fails)} falha(s)')
txt = [f'SÉRIE EXPLICA · {EP} — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + report + ['', res]
open(os.path.join(OUT, 'relatorio-tecnico.txt'), 'w').write('\n'.join(txt) + '\n')
print('\n'.join(txt))
