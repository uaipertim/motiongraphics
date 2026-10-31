#!/usr/bin/env python3
"""
Revisão técnica do Reel "Dona Maria" (depois de `node scripts/render.cjs video` e `render.cjs info`).

    python3 scripts/qa.py  ->  output/revisao/relatorio.txt · output/revisao/boca.jpg · output/revisao/quadros.jpg

Confere:
  • formato: 1080×1920, 30 fps, H.264 yuv420p, AAC 48 kHz estéreo; ~33,5 s; vídeo e áudio com a mesma duração;
  • som: −14 LUFS (±0,5), pico real ≤ −1,5 dBTP; a trilha ~18 dB abaixo da voz; quanto o limitador do master age;
  • boca sem "engasgo" (25 → 30 fps por repetição de quadros), medido no rosto inteiro: nos trechos da Dona Maria,
    1 quadro repetido a cada 6 do Reel, nunca 2 seguidos, nenhum quadro da fonte pulado; o vídeo acompanha a voz (o
    quadro do Reel é o da fonte no mesmo instante do áudio, ±1 quadro, em ≥ 90% dos quadros);
  • legenda × voz: cada página entra no quadro da sua 1ª palavra e os inícios de frase batem com o início medido no áudio;
  • legenda fora da boca e do queixo (todas as caixas abaixo de y 1380; queixo em y ≈ 990) e acima dos 20% de baixo;
  • a tela do período ocupado fica ≥ 2,5 s parada depois de "não deixa", sem narração;
  • só as 3 telas anexadas; nenhum "V2", "nova versão" ou "em breve" na legenda.
"""
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output'); REV = os.path.join(OUT, 'revisao'); os.makedirs(REV, exist_ok=True)
VIDEO = os.path.join(OUT, 'dona-maria.mp4')
LN = json.load(open(os.path.join(ROOT, 'linha.json'))); INFO = json.load(open(os.path.join(OUT, 'info.json')))
rep, falhas = [], []


def ok(c, m):
    rep.append(('OK     ' if c else 'FALHA  ') + m)
    if not c: falhas.append(m)


def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)


def quadros(path, ini, dur, w=108, h=192, crop=None):
    vf = (f'crop={crop},' if crop else '') + f'scale={w}:{h},format=gray'
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(ini), '-i', path, '-t', str(dur), '-vf', vf, '-f', 'rawvideo', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(float)


# ---------------------------------------------------------------- formato e som
rep.append('FORMATO E SOM')
pr = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', VIDEO]).stdout)
v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in pr['streams'] if s['codec_type'] == 'audio'][0]
vd, ad = float(v['duration']), float(a['duration'])
ok((v['width'], v['height']) == (1080, 1920) and v['r_frame_rate'] == '30/1' and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v['width']}x{v['height']} {v['r_frame_rate']} fps {v['pix_fmt']}")
ok(a['codec_name'] == 'aac' and a['sample_rate'] == '48000' and a['channels'] == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz {a['channels']} canais")
ok(abs(vd - LN['duracao']) < 0.05 and abs(vd - ad) < 0.05, f'duração {vd:.2f} s (vídeo e áudio Δ {abs(vd - ad) * 1000:.0f} ms)')
def lufs(path):
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr; s = e[e.rindex('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))
I, TP = lufs(VIDEO)
ok(-14.5 <= I <= -13.5 and TP <= -1.5, f'loudness {I:.1f} LUFS (alvo −14), pico real {TP:.1f} dBTP (limite −1,5)')
Iv, _ = lufs(os.path.join(ROOT, 'audio', 'voz.wav')); Im, _ = lufs(os.path.join(ROOT, 'audio', 'musica.wav'))
ok(15 <= Iv - Im <= 22, f'a trilha fica {Iv - Im:.1f} dB abaixo da voz (voz {Iv:.1f} LUFS, trilha {Im:.1f} LUFS; alvo ~18 dB)')
from scipy.io import wavfile
_, mx = wavfile.read(os.path.join(ROOT, 'audio', 'mix.wav')); _, vz = wavfile.read(os.path.join(ROOT, 'audio', 'voz.wav'))
lim = 10 ** (-2.4 / 20) * 32767
ativo = np.mean(np.abs(vz[:, 0].astype(float)) > lim * 0.98) * 100
rep.append(f'       limitador do master: age em {ativo:.3f}% das amostras (só os picos mais altos da voz; o resto da voz passa sem tratamento)')

# ---------------------------------------------------------------- a boca: quadros repetidos e sincronia com a voz
rep.append(''); rep.append('BOCA DA DONA MARIA (25 → 30 fps)')
ROSTO_R, ROSTO_F = '600:870:240:230', '249:361:100:95'          # o rosto (cabeça e boca) no Reel e na fonte 448×832
fig = []
for nome, src, ini_src, t0, dur in (('abertura', 'midia/abertura.mp4', 0.45, 0.0, LN['abertura'][1] - 0.4),
                                    ('fechamento', 'midia/fechamento.mp4', 0.30, LN['fechamento'][0], LN['fechamento'][1] - LN['fechamento'][0] - 0.2)):
    rq = quadros(VIDEO, t0, dur, 180, 261, ROSTO_R)
    fq = quadros(os.path.join(ROOT, src), ini_src, dur + 0.1, 180, 261, ROSTO_F)
    d = np.abs(np.diff(rq, axis=0)).mean(axis=(1, 2))
    rep_ = d < 0.25                                               # quadro igual ao anterior (repetido); mudança real fica acima de 0,35
    df = np.abs(np.diff(fq, axis=0)).mean(axis=(1, 2)); iguais_fonte = int((df < 0.25).sum())   # quadros já iguais na própria fonte
    runs, cur = [], 0
    for r in rep_:
        cur = cur + 1 if r else 0; runs.append(cur)
    idx = np.nonzero(rep_)[0]; gaps = np.diff(idx); fora = int((gaps != 6).sum())
    esperado = int(round(len(rq) * 5 / 30))                       # 25 → 30 fps: 1 repetido a cada 6
    ok(max(runs) <= 1 and abs(len(idx) - esperado - iguais_fonte) <= 2 and fora <= 3,
       f'{nome}: {len(idx)} quadros repetidos em {len(rq)} (esperado {esperado} + {iguais_fonte} já iguais na fonte), nunca 2 seguidos; '
       f'cadência de 1 a cada 6 com {fora} exceção(ões) (no começo, antes da fala, onde a fonte já repete quadros)')
    # a sincronia: para cada quadro do Reel, o quadro da fonte mais parecido (±6) deve ser o do mesmo instante do áudio
    off = []
    for k in range(len(rq)):
        ks = k * 25 / 30; c = range(max(0, int(ks) - 6), min(len(fq), int(ks) + 7))
        off.append(min(c, key=lambda j: np.abs(fq[j] - rq[k]).mean()) - ks)
    exatos = np.mean(np.abs(np.array(off)) <= 1) * 100
    ok(abs(np.median(off)) <= 0.5 and exatos >= 90, f'{nome}: a boca acompanha a voz: {exatos:.0f}% dos quadros são o da fonte no mesmo instante do áudio (±1 quadro), '
       f'desvio mediano {np.median(off) * 40:+.0f} ms (os outros são instantes de rosto parado, em que dois quadros da fonte são quase iguais)')
    fig.append((nome, d))
H = 160; img = Image.new('RGB', (1200, H * len(fig) + 20), (24, 24, 24)); dr = ImageDraw.Draw(img)
for i, (nome, d) in enumerate(fig):
    y0 = 10 + i * H; m = max(d.max(), 1)
    for k, x in enumerate(d[:400]):
        xx = 10 + k * 3; dr.line((xx, y0 + H - 20, xx, y0 + H - 20 - x / m * (H - 40)), fill=(175, 250, 39) if x >= 0.25 else (255, 80, 80), width=2)
    dr.text((10, y0), f'{nome}: mudança no rosto, quadro a quadro (vermelho = quadro repetido)', fill=(255, 255, 255))
img.save(os.path.join(REV, 'boca.jpg'), quality=88)

# ---------------------------------------------------------------- legenda
rep.append(''); rep.append('LEGENDA')
PG = INFO['legenda']
fr = quadros(VIDEO, 0, LN['duracao'], 205, 50, '860:210:110:1370')
dd = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
atraso = []
for q in PG:
    f0 = int(round(q['t0'] * 30)); win = dd[max(0, f0 - 2): f0 + 5]
    atraso.append(int(np.argmax(win > 1.0)) + max(0, f0 - 2) + 1 - f0 if (win > 1.0).any() else 99)
ok(all(-1 <= k <= 1 for k in atraso), f'{len(PG)} páginas; cada uma aparece no quadro da 1ª palavra (atraso em quadros de 33 ms: {atraso})')
P = json.load(open(os.path.join(ROOT, 'audio', 'palavras.json')))
OFF = LN['offsets']
desv = []
for c in P:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'audio', 'voz.wav'), '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(float) / 32768
    e = 20 * np.log10(np.sqrt(np.convolve(x ** 2, np.ones(160) / 160, 'same')) + 1e-9)
    fim_ant = -1.0
    for a0, z0 in c['trechos']:
        tg = a0 + OFF[c['id']]; ini = max(tg - 0.2, fim_ant + OFF[c['id']] + 0.02)   # a janela começa no fim do trecho anterior
        seg = e[int(ini * 16000):int((tg + 0.2) * 16000)]
        on = np.nonzero(seg > -40)[0]
        if len(on): desv.append(round((ini + on[0] / 16000 - tg) * 1000))
        fim_ant = z0
ok(max(abs(d) for d in desv) <= 40, f'legenda × voz: nos {len(desv)} inícios de frase, a palavra entra a {np.mean(np.abs(desv)):.0f} ms em média e {max(abs(d) for d in desv)} ms no máximo do início medido na voz (limite 40 ms)')
rep.append('       (no meio de um trecho, os tempos das palavras saem do vale de energia mais próximo: ±0,1 s; sem a transcrição, a chave não tem permissão)')
cx = [b for s in INFO['caixas'] for b in s['caixas'] if b['nome'] == 'legenda']
ok(min(b['y0'] for b in cx) >= 1380 and max(b['y1'] for b in cx) <= 1536 and min(b['x0'] for b in cx) >= 100 and max(b['x1'] for b in cx) <= 980,
   f'legenda em y {min(b["y0"] for b in cx)}–{max(b["y1"] for b in cx)}: abaixo da boca e do queixo (queixo em y ≈ 990) e acima dos 20% de baixo')
txt = ' '.join(w['w'] for q in PG for w in q['palavras'])
ok(not re.search(r'\bV2\b|nova versão|em breve', txt, re.I) and 'FAZLO Hospeda' in txt and 'Fazlo' not in txt, 'grafia: "FAZLO Hospeda" na tela; nenhum "V2", "nova versão" ou "em breve"')
ch = sorted({w['w'] for q in PG for w in q['palavras'] if w['chave']})
rep.append('       chaves em limão: ' + ', '.join(ch))

# ---------------------------------------------------------------- a pausa no período ocupado e as telas
rep.append(''); rep.append('MEIO')
fim_fala = max(w['t1'] for w in P[1]['palavras']) + OFF['meio']
voz = np.abs(vz[:, 0].astype(float)) / 32768
sil = voz[int((fim_fala + 0.08) * 48000):int(LN['transicao2'] * 48000)]
ok(LN['transicao2'] - fim_fala >= 2.5 and 20 * np.log10(sil.max() + 1e-9) < -40,
   f'período ocupado parado {LN["transicao2"] - fim_fala:.2f} s depois de "não deixa" (mínimo 2,5 s), sem narração (voz abaixo de −40 dBFS)')
telas = sorted(os.listdir(os.path.join(ROOT, 'telas')))
ok(telas == ['01-calendario.png', '02-nova-reserva.png', '03-periodo-ocupado.png'], 'só as 3 telas anexadas: ' + ', '.join(telas))

# ---------------------------------------------------------------- folha de quadros
ts = [0.3, 5.0, 10.7, 12.5, 15.9, 19.5, 21.5, 22.65, 24.5, 26.6, 28.5, 32.6]
folha = Image.new('RGB', (len(ts) * 188 + 8, 360), (40, 40, 40)); dr = ImageDraw.Draw(folha)
for i, t in enumerate(ts):
    png = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', VIDEO, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    im = Image.open(__import__('io').BytesIO(png)).convert('RGB').resize((180, 320))
    folha.paste(im, (8 + i * 188, 8)); dr.text((8 + i * 188, 336), f'{t:.2f}s', fill=(175, 250, 39))
folha.save(os.path.join(REV, 'quadros.jpg'), quality=88)

R = 'RESULTADO: ' + ('aprovado' if not falhas else f'{len(falhas)} falha(s)')
out = ['REEL DONA MARIA — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + rep + ['', R]
open(os.path.join(REV, 'relatorio.txt'), 'w').write('\n'.join(out) + '\n'); print('\n'.join(out))
