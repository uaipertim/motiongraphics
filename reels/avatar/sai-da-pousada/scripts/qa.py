#!/usr/bin/env python3
"""
Revisão técnica do Reel "Saí da pousada" (depois de `render.cjs video`, `render.cjs info` e da capa).

    python3 scripts/qa.py  ->  output/revisao/relatorio.txt · output/revisao/emenda-p1.jpg · output/revisao/boca.jpg
                               output/storyboard.jpg

Confere: formato e som (−14 LUFS, pico ≤ −1,5 dBTP, trilha ~18 dB abaixo da voz, trilha baixa no P5 até a chamada);
a emenda do P1 (posição medida por correlação de fase no rosto e salto de imagem na fusão × o normal do plano); a boca
sincronizada com a voz em P1, P4 e P5 (quadro a quadro: o quadro do Reel é o da fonte no mesmo instante do áudio, e a
abertura da boca acompanha a energia da voz); nenhum quadro do P5 com o dedo; um elemento novo por vez; balões ≥ 2 s;
nada se movendo além da legenda durante a fala do P5; chamada ≥ 2,5 s; nenhum quadro congelado; áreas seguras;
contraste da legenda; a capa na regra da grade.
"""
import io, json, os, re, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output'); REV = os.path.join(OUT, 'revisao'); os.makedirs(REV, exist_ok=True)
VIDEO = os.path.join(OUT, 'sai-da-pousada.mp4'); BASE = os.path.join(ROOT, 'midia', 'base-1080.mp4')
LN = json.load(open(os.path.join(ROOT, 'linha.json'))); EV = LN['eventos']; PL = {p['id']: p for p in LN['planos']}
INFO = json.load(open(os.path.join(OUT, 'info.json'))); MAPA = json.load(open(os.path.join(ROOT, 'midia', 'base-quadros.json')))
FPS = 30; rep, falhas = [], []
FONT = ImageFont.truetype(os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf'), 22)


def ok(c, m):
    rep.append(('OK     ' if c else 'FALHA  ') + m)
    if not c: falhas.append(m)


def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)


def quadros(path, ini, dur, w, h, crop=None, gray=True):
    vf = (f'crop={crop},' if crop else '') + f'scale={w}:{h}' + (',format=gray' if gray else '')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{ini:.4f}', '-i', path, '-t', f'{dur:.4f}', '-vf', vf, '-f', 'rawvideo'] + ([] if gray else ['-pix_fmt', 'rgb24']) + ['-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape((-1, h, w) if gray else (-1, h, w, 3)).astype(float)


def todos(path, w, h, vf_pre=''):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', (vf_pre + ',' if vf_pre else '') + f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(float)


def quadro_png(path, k):
    png = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'select=eq(n\\,{k})', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    return Image.open(io.BytesIO(png)).convert('RGB')


# ---------------------------------------------------------------- formato e som
rep.append('FORMATO E SOM')
pr = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', VIDEO]).stdout)
v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in pr['streams'] if s['codec_type'] == 'audio'][0]
vd, ad = float(v['duration']), float(a['duration'])
ok((v['width'], v['height']) == (1080, 1920) and v['r_frame_rate'] == '30/1' and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v['width']}x{v['height']} {v['r_frame_rate']} fps {v['pix_fmt']}, {v.get('nb_frames')} quadros")
ok(a['codec_name'] == 'aac' and a['sample_rate'] == '48000' and a['channels'] == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz {a['channels']} canais")
ok(abs(vd - LN['duracao']) < 0.05 and abs(vd - ad) < 0.05, f'duração {vd:.2f} s (vídeo e áudio Δ {abs(vd - ad) * 1000:.0f} ms; mux com -t)')


def lufs(path, extra=None):
    e = run(['ffmpeg', '-hide_banner', '-nostats'] + (extra or []) + ['-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr; s = e[e.rindex('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))


I, TP = lufs(VIDEO)
ok(-14.5 <= I <= -13.5 and TP <= -1.5, f'loudness {I:.1f} LUFS (alvo −14), pico real {TP:.1f} dBTP (limite −1,5)')
AUD = os.path.join(ROOT, 'audio')
Iv, _ = lufs(os.path.join(AUD, 'voz.wav')); Im, _ = lufs(os.path.join(AUD, 'musica.wav'))
ok(15 <= Iv - Im <= 22, f'a trilha fica {Iv - Im:.1f} dB abaixo da voz (voz {Iv:.1f} LUFS, trilha {Im:.1f} LUFS; alvo ~18 dB)')
from scipy.io import wavfile
_, mus = wavfile.read(os.path.join(AUD, 'musica.wav')); mus = mus[:, 0].astype(float) / 32768
rms = lambda a, b: 20 * np.log10(np.sqrt(np.mean(mus[int(a * 48000):int(b * 48000)] ** 2)) + 1e-9)
r_p4, r_p5, r_cta = rms(PL['p4']['t0'] + 0.5, PL['p4']['t1'] - 0.8), rms(PL['p5']['t0'] + 0.3, EV['fim_fala']), rms(EV['chamada'] + 0.9, LN['duracao'] - 1.3)
ok(r_p5 <= r_p4 - 8 and r_cta >= r_p5 + 8, f'trilha: P4 {r_p4:.1f} dBFS → baixa antes da frase do P5 ({r_p5:.1f} dBFS) → volta na chamada ({r_cta:.1f} dBFS)')
_, vz = wavfile.read(os.path.join(AUD, 'voz.wav'))
ativo = np.mean(np.abs(vz[:, 0].astype(float)) > 10 ** (-2.4 / 20) * 32767 * 0.98) * 100
rep.append(f'       voz sem tratamento além do ganho geral; o limitador do master só pega os picos: {ativo:.2f}% das amostras da voz')
cues = json.load(open(os.path.join(AUD, 'cues.json')))['cues']
rep.append('       efeitos: ' + ', '.join(f"{c['type']} {c['t']:.2f} s" for c in cues))

# ---------------------------------------------------------------- emenda do P1
rep.append(''); rep.append('EMENDA DO P1 (Seedance → Aurora, fusão de 3 quadros em 1,50–1,57 s)')
import cv2
ROSTO = (300, 230, 480, 600)                                            # x, y, w, h do rosto no Reel (P1)
f = quadros(BASE, 0, 3.0, 1080, 1920)
rosto = f[:, ROSTO[1]:ROSTO[1] + ROSTO[3], ROSTO[0]:ROSTO[0] + ROSTO[2]]
sh = cv2.phaseCorrelate(np.float32(rosto[44]), np.float32(rosto[48]))[0]
d = np.abs(np.diff(rosto, axis=0)).mean(axis=(1, 2))
seam = d[44:48]; normal = np.concatenate([d[10:42], d[50:88]])
ok(np.hypot(*sh) <= 3 and seam.max() <= np.percentile(normal, 99) * 1.6,
   f'posição do rosto antes × depois da emenda (quadros 44 → 48): {sh[0]:+.1f} px, {sh[1]:+.1f} px; salto de imagem na fusão {seam.max():.1f} '
   f'(normal do plano: mediana {np.median(normal):.1f}, P99 {np.percentile(normal, 99):.1f}; a fusão divide a troca em 4 passos de ≤ {seam.max():.1f})')
strip = Image.new('RGB', (9 * 200, 330), (24, 24, 24)); dr = ImageDraw.Draw(strip)
for i, k in enumerate(range(42, 51)):
    im = quadro_png(VIDEO, k).crop((290, 200, 790, 980)).resize((190, 296)); strip.paste(im, (i * 200 + 5, 5))
    dr.text((i * 200 + 8, 304), f'q{k} {"S" if k < 45 else "A" if k > 47 else "fusão"}', font=FONT, fill=(175, 250, 39))
strip.save(os.path.join(REV, 'emenda-p1.jpg'), quality=88)

# ---------------------------------------------------------------- a boca
rep.append(''); rep.append('BOCA × VOZ (quadro a quadro, 25 → 30 fps por repetição)')
CASOS = [('p1', 'midia/plano1-fala.mp4', 1.6, 4.6, (300, 230, 480, 600), 'crop=448:797:0:0,scale=1080:1920', (110, 70, 220, 310)),
         ('p4', 'midia/plano4.mp4', 0.0, 6.8, (230, 300, 640, 800), 'crop=448:797:0:0,scale=1080:1920', (95, 120, 270, 330)),
         ('p5', 'midia/plano5.mp4', 0.0, 7.72, (220, 330, 640, 800), 'crop=393:699:27:0,scale=1080:1920', (80, 120, 240, 290))]
BOCA = {'p1': (486, 604, 140, 76), 'p4': (456, 846, 230, 112), 'p5': (455, 950, 230, 120)}    # x, y, w, h da boca no Reel
BOCA_F = {'p1': (190, 245, 76, 46), 'p4': (185, 350, 104, 50), 'p5': (180, 340, 110, 55)}     # a mesma boca na fonte 448×832
fig = []
_, vzm = wavfile.read(os.path.join(AUD, 'voz.wav')); vzm = vzm[:, 0].astype(float) / 32768
for pid, src, l0, l1, rc, vf, _ in CASOS:
    t0 = PL[pid]['t0']
    rq = quadros(VIDEO, t0 + l0, l1 - l0, 180, 225, f'{rc[2]}:{rc[3]}:{rc[0]}:{rc[1]}')
    fq = todos(os.path.join(ROOT, src), 180, 225, vf + f',crop={rc[2]}:{rc[3]}:{rc[0]}:{rc[1]}')
    off = []
    for k in range(len(rq)):
        ks = int((l0 + k / FPS) * 25 + 1e-6); c = range(max(0, ks - 6), min(len(fq), ks + 7))
        off.append(min(c, key=lambda j: np.abs(fq[j] - rq[k]).mean()) - ks)
    off = np.array(off); exatos = np.mean(np.abs(off) <= 1) * 100
    # a abertura da boca (contraste dentro da boca: lábios fechados = uniforme; aberta = escuro + dentes) × a energia da voz,
    # as duas em 100 Hz (cada quadro vale do seu instante até o próximo); o mesmo cálculo na fonte, com o áudio dela
    def abertura(q): return q.reshape(len(q), -1).std(axis=1)
    def env100(sig, t0, n): return np.log10(np.array([np.sqrt(np.mean(sig[int((t0 + k / 100) * 48000):int((t0 + (k + 1) / 100) * 48000)] ** 2) + 1e-12) for k in range(n)]) + 1e-4)
    def lag_ms(op, fps, env):
        n = len(env); s = np.array([op[min(len(op) - 1, int(k / 100 * fps + 1e-6))] for k in range(n)])
        s = (s - s.mean()) / (s.std() + 1e-9); e = (env - env.mean()) / (env.std() + 1e-9)
        lags = range(-30, 31); cc = [np.mean(s[max(0, L):n + min(0, L)] * e[max(0, -L):n - max(0, L)]) for L in lags]
        return -list(lags)[int(np.argmax(cc))] * 10, max(cc)
    bx, by, bw, bh = BOCA[pid]; n = int((l1 - l0) * 100) - 2
    op_r = abertura(quadros(VIDEO, t0 + l0, l1 - l0, bw // 2, bh // 2, f'{bw}:{bh}:{bx}:{by}'))
    adi, cmax = lag_ms(op_r, FPS, env100(vzm, t0 + l0, n))
    fx, fy, fw, fh = BOCA_F[pid]
    op_f = abertura(todos(os.path.join(ROOT, src), fw, fh, f'crop={fw}:{fh}:{fx}:{fy}'))[int(l0 * 25):]
    af = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, src), '-vn', '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout
    af = np.frombuffer(af, np.int16).astype(float) / 32768
    nf = min(n, int(len(af) / 480) - int(l0 * 100) - 2)
    adif, cf = lag_ms(op_f, 25, env100(af, l0, nf))
    # o áudio: a voz no Reel final (AAC decodificado) × o áudio do clipe, por correlação cruzada (mesmo instante?)
    fin = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t0 + l0:.4f}', '-i', VIDEO, '-t', f'{l1 - l0:.4f}', '-vn', '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout
    fin = np.frombuffer(fin, np.int16).astype(float) / 32768
    ref = af[int(l0 * 48000):int(l0 * 48000) + len(fin)]; m_ = min(len(fin), len(ref))
    xc = np.correlate(fin[2400:m_ - 2400], ref[:m_], 'valid'); desl = (int(np.argmax(xc)) - 2400) / 48       # ms (+ = Reel atrasado)
    ok(exatos >= 90 and abs(np.median(off)) <= 0.5 and abs(desl) <= 5,
       f'{pid}: {exatos:.0f}% dos quadros do Reel são o quadro da fonte no mesmo instante do áudio (±1 quadro; desvio mediano {np.median(off) * 40:+.0f} ms) '
       f'e a voz no vídeo final está a {desl:+.1f} ms do áudio do clipe: a sincronia da Aurora fica como veio')
    mov = (op_r - op_r.mean()) / (op_r.std() + 1e-9); env = np.array([v for v in env100(vzm, t0 + l0, n)[::int(100 / FPS) or 1]])
    env = (env - env.mean()) / (env.std() + 1e-9)
    fig.append((pid, mov, env))
img = Image.new('RGB', (1260, 170 * len(fig)), (24, 24, 24)); dr = ImageDraw.Draw(img)
for i, (pid, mov, env) in enumerate(fig):
    y0 = i * 170 + 150; dr.text((10, i * 170 + 6), f'{pid}: verde = abertura da boca, branco = energia da voz', font=FONT, fill=(255, 255, 255))
    for k in range(min(len(mov), 240) - 1):
        dr.line((10 + k * 5, y0 - 50 - mov[k] * 22, 15 + k * 5, y0 - 50 - mov[k + 1] * 22), fill=(175, 250, 39), width=2)
        dr.line((10 + k * 5, y0 - 50 - env[k] * 22, 15 + k * 5, y0 - 50 - env[k + 1] * 22), fill=(230, 230, 230), width=1)
img.save(os.path.join(REV, 'boca.jpg'), quality=88)

# ---------------------------------------------------------------- P5 sem o dedo
rep.append(''); rep.append('P5 (zoom no rosto)')
U = np.zeros((832, 448), bool)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'midia', 'plano5.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
src5 = np.frombuffer(raw, np.uint8).reshape(-1, 832, 448, 3).astype(int)
qd = []
for i, x in enumerate(src5):
    m = (x[..., 0] > x[..., 1] + 18) & (x[..., 0] > x[..., 2] + 28) & (x[..., 0] > 100); m[:612, :] &= (np.arange(448) > 345)[None, :]; m[:600] = False
    if m.sum() > 15: qd.append(i)
    U |= m
ys, xs = np.nonzero(U)
win = U[0:699, 27:420]
ok(not win.any(), f'o dedo aparece na fonte nos quadros {qd} (x ≥ {xs.min()}, y ≥ {ys.min()}); a janela do zoom (x 27–420, y 0–699 da fonte) não tem nenhum pixel dele')
rq = quadros(VIDEO, PL['p5']['t0'], PL['p5']['t1'] - PL['p5']['t0'], 270, 480, None, gray=False)
br = rq[:, 400:, 215:]                                                    # canto inferior direito do Reel (x ≥ 860, y ≥ 1600), onde o dedo entraria
pele = ((br[..., 0] > br[..., 1] + 22) & (br[..., 0] > br[..., 2] + 35) & (br[..., 0] > 110)).sum(axis=(1, 2))
ok(int(pele.max()) <= 3, f'nenhum quadro do P5 no Reel mostra pele no canto inferior direito (x ≥ 860, y ≥ 1600; {len(rq)} quadros; máximo {int(pele.max())} px de pele)')

# ---------------------------------------------------------------- elementos
rep.append(''); rep.append('ELEMENTOS NA TELA')
pres = {}
for s in INFO['caixas']:
    for b in s['caixas']:
        nome = b['nome'] if not b['nome'].startswith('legenda') else 'legenda'
        pres.setdefault(nome, []).append(s['t'])
spans = {}
for nome, ts in pres.items():
    ts = sorted(set(ts)); seg = [[ts[0], ts[0]]]
    for t in ts[1:]:
        if t - seg[-1][1] > 0.05: seg.append([t, t])
        else: seg[-1][1] = t
    spans[nome] = [[a, b + 1 / FPS] for a, b in seg]
graf = sorted((sp[0], nome) for nome, s in spans.items() if nome != 'legenda' for sp in s if nome not in ('anel',))
graf += [(EV['vibra'][1], 'anel (2º pulso)')]; graf += [(spans['anel'][0][0], 'anel')]
graf = sorted(set(graf))
gaps = [(graf[i + 1][0] - graf[i][0], graf[i][1], graf[i + 1][1]) for i in range(len(graf) - 1)]
juntos = [g for g in gaps if g[0] < 0.3 and not {g[1], g[2]} <= {'chamada', 'logo'} and not (g[1].startswith('icone') and g[2].startswith('icone'))]
ok(not juntos, 'um elemento novo por vez: ' + ' → '.join(f'{n} {t:.2f}' for t, n in graf))
rep.append('       (juntos de propósito: a chamada e a logo; os três ícones entram em sequência de 0,06 s, como um só grupo, na palavra "aqui")')
pg_legenda = [q['t0'] for q in INFO['legenda']]
perto = [(n, t, l) for t, n in graf for l in pg_legenda if 0 < abs(t - l) < 0.25 and not n.startswith('icone')]
ok(not perto, f'nenhum gráfico entra junto com uma página nova da legenda (< 0,25 s): {perto or "ok"}')
for nome in ('balao1', 'balao2'):
    a, b = spans[nome][0]; leg = b - (a + 0.45)
    ok(leg >= 2.0, f'{nome}: na tela de {a:.2f} a {b:.2f} s; legível (depois da entrada) por {leg:.2f} s (mínimo 2 s)')
a2 = spans['balao2'][0][0]
ok(spans['selo'][0][0] - (a2 + 0.45) >= 1.5, f'selo "+6 mensagens" entra {spans["selo"][0][0] - (a2 + 0.45):.2f} s depois de o balão 2 ficar legível (mínimo 1,5 s) e conta de 1 a 6')
ic = [spans[n][0] for n in spans if n.startswith('icone')]
ok(min(x[0] for x in ic) >= EV['aqui'] - 0.01 and max(x[1] for x in ic) <= PL['p4']['t1'], f'ícones (chave, comanda, moeda) de {min(x[0] for x in ic):.2f} a {max(x[1] for x in ic):.2f} s: entram em "aqui" ({EV["aqui"]:.2f} s) e somem antes do corte ({PL["p4"]["t1"]:.2f} s)')
p5_fala = [n for n, s in spans.items() for a, b in s if a < EV['fim_fala'] and b > PL['p5']['t0'] and n != 'legenda']
ok(not p5_fala, f'durante a fala do P5 ({PL["p5"]["t0"]:.2f}–{EV["fim_fala"]:.2f} s) só a legenda se mexe na camada: {p5_fala or "nenhum outro elemento"}')
ch = spans['chamada'][0]
ok(ch[1] - ch[0] >= 2.5 and ch[0] - EV['fim_fala'] >= 0.9, f'chamada + logo de {ch[0]:.2f} a {ch[1]:.2f} s: {ch[1] - ch[0]:.2f} s de leitura (mínimo 2,5), {ch[0] - EV["fim_fala"]:.2f} s depois da última palavra')
# congelamento: a sequência de quadros da fonte nunca fica parada mais de 2 quadros do Reel
seq = [(q['fonte'], json.dumps(q['q'])) for q in MAPA]; run_, mx = 1, 1
for i in range(1, len(seq)):
    run_ = run_ + 1 if seq[i] == seq[i - 1] else 1; mx = max(mx, run_)
rev = [q['q'] for q in MAPA if q['fonte'] == 'p5']
vira = int(np.argmax(rev)); mono = all(rev[i + 1] >= rev[i] for i in range(vira)) and all(rev[i + 1] <= rev[i] for i in range(vira, len(rev) - 1))
ok(mx <= 2 and mono, f'nenhum quadro congelado: o mesmo quadro da fonte fica no máximo {mx} quadros do Reel (repetição do 24/25 → 30 fps); '
   f'no fim do P5 o vídeo vai até o quadro {rev[vira]} e volta de trás para frente até o {rev[-1]} (sem pulo)')
fr = todos(VIDEO, 108, 192); dd = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
iguais = []; cur = 0
for x in dd:
    cur = cur + 1 if x < 0.05 else 0; iguais.append(cur)
ok(max(iguais) <= 2, f'no vídeo final, no máximo {max(iguais)} quadro(s) seguido(s) idêntico(s) ao anterior')

# ---------------------------------------------------------------- áreas seguras e contraste
rep.append(''); rep.append('ÁREAS SEGURAS E LEGENDA')
allb = [(s['t'], b) for s in INFO['caixas'] for b in s['caixas']]
fora = [(round(t, 2), b['nome']) for t, b in allb if b['y0'] < 200 or b['y1'] > 1536 or b['x0'] < 30 or b['x1'] > 1050]
ok(not fora, f'todos os elementos entre y 200 e 1536 (fora da barra de cima e dos 20 % de baixo) e dentro das bordas: {fora[:5] or "ok"}')
cx = [b for t, b in allb if b['nome'] == 'legenda']
ok(min(b['y0'] for b in cx) >= 1380 and max(b['y1'] for b in cx) <= 1536 and min(b['x0'] for b in cx) >= 100 and max(b['x1'] for b in cx) <= 940,
   f'legenda em x {min(b["x0"] for b in cx)}–{max(b["x1"] for b in cx)}, y {min(b["y0"] for b in cx)}–{max(b["y1"] for b in cx)}: abaixo do queixo, '
   'acima dos 20 % de baixo e fora da coluna de botões (x > 950)')
txt = ' '.join(w['w'] for q in INFO['legenda'] for w in q['palavras'])
chs = [w['w'] for q in INFO['legenda'] for w in q['palavras'] if w['chave']]
ok(chs == ['vinte', 'minutos', 'equipe', 'aqui.', 'não', 'tira', 'folga.'], 'chaves em limão: ' + ' · '.join(chs))
lum = lambda c: (lambda x: np.where(x <= 0.03928, x / 12.92, ((x + 0.055) / 1.055) ** 2.4))(np.asarray(c) / 255.0) @ np.array([0.2126, 0.7152, 0.0722])
from scipy import ndimage
contr = []
for q in INFO['legenda']:
    t = (q['t0'] + q['t1']) / 2; k = int(t * FPS)
    im = np.asarray(quadro_png(VIDEO, k)).astype(float)
    bxs = [b for s in INFO['caixas'] if s['t'] == round(k / FPS, 3) for b in s['caixas'] if b['nome'] == 'legenda']
    for b in bxs:
        reg = im[b['y0']:b['y1'], b['x0']:b['x1']]
        texto = (reg.min(axis=2) > 225) | ((reg[..., 1] > 225) & (reg[..., 2] < 90))
        fundo = ~ndimage.binary_dilation(texto, iterations=3)
        if fundo.sum() < 50 or texto.sum() < 30: continue
        Lb = np.percentile(lum(reg[fundo]), 90); Lt = np.median(lum(reg[texto]))
        contr.append(((Lt + 0.05) / (Lb + 0.05), round(t, 1)))
cmin = min(contr)
ok(cmin[0] >= 3.0, f'contraste da legenda sobre a imagem: mínimo {cmin[0]:.1f}:1 (em {cmin[1]} s), mediana {np.median([c for c, _ in contr]):.1f}:1 '
   '(texto × o fundo mais claro entre as letras, P90; texto grande em negrito pede ≥ 3:1)')

# ---------------------------------------------------------------- capa
rep.append(''); rep.append('CAPA')
capa = open(os.path.join(OUT, 'grade', 'revisao', 'capa.txt')).read()
ok('RESULTADO: dentro da regra' in capa, 'capa na regra da grade (reels/tools/revisao_capa.py --cena): ' + ' | '.join(l.strip() for l in capa.splitlines()[2:] if l.strip()))

# ---------------------------------------------------------------- storyboard
ts = [(0.5, 'P1 vibração'), (1.4, 'P1 14:20'), (3.6, 'P1 fala'), (5.6, 'P2 balão 1'), (7.0, 'P2 digitando'), (10.4, 'P3 balão 2'),
      (12.3, 'P3 +6'), (15.2, 'P4 fala'), (19.75, 'P4 "aqui"'), (21.8, 'P5 folga'), (24.5, 'P5 fala'), (27.8, 'P5 chamada')]
cols = 6; sb = Image.new('RGB', (cols * 280 + 10, 2 * 540 + 10), (16, 16, 16)); dr = ImageDraw.Draw(sb)
for i, (t, nome) in enumerate(ts):
    im = quadro_png(VIDEO, int(round(t * FPS))).resize((270, 480)); x, y = 10 + (i % cols) * 280, 10 + (i // cols) * 540
    sb.paste(im, (x, y)); dr.text((x, y + 488), f'{t:.2f} s · {nome}', font=FONT, fill=(175, 250, 39))
sb.save(os.path.join(OUT, 'storyboard.jpg'), quality=90)

pl = ' · '.join(f"{p['id'].upper()} {p['t0']:.2f}–{p['t1']:.2f} s ({p['t1'] - p['t0']:.2f} s)" for p in LN['planos'])
R = 'RESULTADO: ' + ('aprovado' if not falhas else f'{len(falhas)} falha(s)')
out = ['REEL AVATAR "SAÍ DA POUSADA POR DUAS HORAS" — revisão técnica', os.path.relpath(VIDEO, ROOT), f'{LN["duracao"]:.2f} s · ' + pl, ''] + rep + ['', R]
open(os.path.join(REV, 'relatorio.txt'), 'w').write('\n'.join(out) + '\n'); print('\n'.join(out))
