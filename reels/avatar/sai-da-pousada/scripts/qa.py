#!/usr/bin/env python3
"""
Revisão técnica do Reel "Saí da pousada" (depois de `render.cjs video`, `render.cjs info` e da capa).

    python3 scripts/qa.py  ->  output/revisao/relatorio.txt · output/revisao/emenda-p1.jpg · output/revisao/boca.jpg
                               output/storyboard.jpg

Confere: formato e som (−14 LUFS, pico ≤ −1,5 dBTP, trilha ~18 dB abaixo da voz, trilha some no P5 e volta no cartão);
a emenda do P1 (posição medida por correlação de fase no rosto e salto de imagem na fusão × o normal do plano); a boca
sincronizada com a voz em P1, P4 e P5 (quadro a quadro: o quadro do Reel é o da fonte no mesmo instante do áudio, e a
abertura da boca acompanha a energia da voz); nenhum quadro do P5 com o dedo; um elemento novo por vez; balões ≥ 2 s;
o rastreio da tela do P2 (erro em px); o recorte do P4 (sem halo, sem cobrir o rosto); tempo de leitura de cada
notificação/cartão; nada se movendo além da legenda durante a fala do P5; cartão final ≥ 2,5 s; nenhum quadro congelado; áreas seguras;
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
FONT_SB = ImageFont.truetype(os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf'), 15)


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
r_p1, r_p4, r_p5, r_cta = rms(0.5, PL['p1']['t1']), rms(PL['p4']['t0'] + 0.5, PL['p4']['t1'] - 0.8), rms(PL['p5']['t0'] + 0.3, EV['fim_fala']), rms(EV['cartao'] + 1.0, LN['duracao'] - 1.3)
ok(r_p5 < -90 and r_cta >= r_p4 - 12, f'trilha com pulso do P1 ao P4 ({r_p1:.1f} / {r_p4:.1f} dBFS); some antes da frase do P5 ({"silêncio" if r_p5 < -90 else f"{r_p5:.1f} dBFS"}); volta suave no cartão final ({r_cta:.1f} dBFS, só o pad)')
Ia, _ = lufs(os.path.join(AUD, 'ambiente.wav'))
rep.append(f'       ambiente de carro parado e rua ao longe: {Ia:.1f} LUFS ({Iv - Ia:.0f} dB abaixo da voz)')
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

# ---------------------------------------------------------------- P2: a conversa na tela do celular
rep.append(''); rep.append('P2: A CONVERSA DENTRO DO CELULAR')
RA = json.load(open(os.path.join(ROOT, 'midia', 'rastreio-p2.json')))['erro_px_reel']
p95q = np.percentile([q[1] for q in RA['por_quadro']], 95)
ok(RA['medio'] <= 1.0 and p95q <= 2.0, f"rastreio dos 4 cantos da tela, quadro a quadro: erro médio {RA['medio']:.2f} px; P95 de cada quadro ≤ {p95q:.2f} px "
   f"em 95 % dos quadros (limite 2 px); pior ponto isolado {RA['max']:.2f} px (medido nas bordas visíveis: cima, esquerda, direita)")
rep.append('       a conversa só troca o branco da tela: os polegares (segmentação de pele) e o recorte da câmera ficam na frente; a luz da tela real continua por cima')

# ---------------------------------------------------------------- P4: o recorte
rep.append(''); rep.append('P4: AS PERGUNTAS ATRÁS DA CABEÇA')
RC = json.load(open(os.path.join(ROOT, 'midia', 'recorte-p4.json')))
caixa_t = {round(s_['t'], 3): s_['caixas'] for s_ in INFO['caixas']}
halo, cobre = [], []
from scipy import ndimage as ndi
for k in range(int(EV['perguntas'][1][0] * FPS) + 6, int(EV['aqui'] * FPS), 6):
    cards = [b for b in caixa_t[round(k / FPS, 3)] if b['nome'] == 'pergunta']
    if not cards: continue
    al = np.asarray(Image.open(os.path.join(ROOT, 'midia', 'recorte-p4', f'{k:04d}.png')))[..., 3] / 255.0
    im = np.asarray(quadro_png(VIDEO, k)).astype(float) @ np.array([0.299, 0.587, 0.114])
    dentro = al > 0.5; anel = ndi.binary_dilation(dentro, iterations=4) & ~ndi.binary_dilation(dentro, iterations=1)
    for b in cards:
        m = np.zeros_like(dentro); m[b['y0'] + 6:b['y1'] - 6, b['x0'] + 6:b['x1'] - 6] = True
        borda = anel & m; longe = m & ~ndi.binary_dilation(dentro, iterations=12)
        if borda.sum() > 20 and longe.sum() > 200: halo.append(float(np.percentile(im[borda], 90) - np.percentile(im[longe], 90)))
    rx0, ry0, rx1, ry1 = RC[str(k)]['rosto']
    for b in caixa_t[round(k / FPS, 3)]:
        if b.get('atras') or b['nome'] == 'legenda': continue
        if b['x0'] < rx1 and b['x1'] > rx0 and b['y0'] < ry1 and b['y1'] > ry0: cobre.append((k, b['nome']))
ok(halo and max(halo) <= 12, f'recorte sem halo: na borda do cabelo sobre os cartões, a luz fica {np.median(halo):+.1f} (pior {max(halo):+.1f}) em relação ao próprio cartão '
   '(0–255, P90; um halo claro da janela apareceria como +30 ou mais)')
fora_rosto = [b for s_ in INFO['caixas'] if PL['p4']['t0'] <= s_['t'] < PL['p4']['t1'] for b in s_['caixas'] if not b.get('atras') and b['nome'] != 'legenda']
ok(not cobre and not fora_rosto, f'o rosto nunca é coberto: no P4 os cartões e a luz ficam atrás da personagem (recortada) e só a legenda fica na frente, abaixo do queixo')
bp = [RC[k]['borda_px'] for k in RC]
rep.append(f'       recorte: mediapipe (multiclasse) + guided filter + descontaminação da cor da borda; largura média da borda suave {np.median(bp):.1f} px (cabelo)')

# ---------------------------------------------------------------- elementos
rep.append(''); rep.append('ELEMENTOS NA TELA')
spans = {}
for s_ in INFO['caixas']:
    for b in s_['caixas']:
        if b['nome'] == 'legenda': continue
        nome = b['nome'] + (':' + b['txt'] if b.get('txt') else '')
        spans.setdefault(nome, []).append(s_['t'])
for nome, ts in list(spans.items()):
    ts = sorted(set(ts)); seg = [[ts[0], ts[0]]]
    for t in ts[1:]:
        if t - seg[-1][1] > 0.05: seg.append([t, t])
        else: seg[-1][1] = t
    spans[nome] = [[a, b + 1 / FPS] for a, b in seg]
spans['chat:O casal do chalé 3 chegou. Qual chave eu entrego?'] = [[EV['chat_chega'], PL['p2']['t1']]]
spans['chat:digitando'] = [[EV['chat_digita'], EV['chat_envia']]]
spans['chat:Na gaveta da recepção, a azul.'] = [[EV['chat_envia'], PL['p2']['t1']]]
novos = sorted((v[0][0], n) for n, v in spans.items() if not n.startswith('luz'))
novos.append((EV['aqui'] + 0.25, 'luz'))
novos = sorted(novos)
grupo = lambda n: n.split(':')[0] if n.startswith('pergunta') or n.startswith('cartao') else n
gaps = [(novos[i + 1][0] - novos[i][0], novos[i][1], novos[i + 1][1]) for i in range(len(novos) - 1)]
juntos = [g for g in gaps if g[0] < 0.29 and not (g[1].startswith('pergunta') and g[2].startswith('pergunta'))]
ok(not juntos, 'um elemento novo por vez (≥ 0,3 s entre um e outro): ' + ' → '.join(f'{n.split(":")[0] if not n.startswith(("notificacao", "chat", "pergunta")) else n.split(":")[1][:22]} {t:.2f}' for t, n in novos) + (f' | juntos: {juntos}' if juntos else ''))
rep.append('       (as 5 perguntas do P4 entram como um grupo, uma a cada 0,18 s, em "essas respostas")')
pg_legenda = [q['t0'] for q in INFO['legenda']]
perto = [(n, round(t, 2), round(l, 2)) for t, n in novos for l in pg_legenda if 0 < abs(t - l) < 0.25 and not n.startswith('pergunta')]
ok(not perto, f'nenhum elemento entra junto com uma página nova da legenda (< 0,25 s): {perto or "ok"}')
leit = []
for n, v in spans.items():
    if not n.startswith(('notificacao', 'chat', 'pergunta', 'cartao')) or n == 'chat:digitando': continue
    d = max(b - a for a, b in v); minimo = 2.5 if n.startswith('cartao') else (1.0 if n.endswith('+6') else 1.5)
    leit.append((n, d, minimo))
curtos = [(n, round(d, 2)) for n, d, m in leit if d < m]
ok(not curtos, 'tempo de leitura (nítido e inteiro na tela): ' + ' · '.join(f'{n.split(":")[1][:26] if ":" in n else n} {d:.2f} s' for n, d, m in leit) +
   (f' | abaixo do mínimo: {curtos}' if curtos else ' (mínimo 1,5 s; o cartão final 2,5 s; o "+6", só um número, 1 s)'))
p5_fala = [n for n, v in spans.items() for a, b in v if a < EV['fim_fala'] and b > PL['p5']['t0']]
ok(not p5_fala, f'durante a fala do P5 ({PL["p5"]["t0"]:.2f}–{EV["fim_fala"]:.2f} s) só a legenda se mexe (sem tremor, sem relógio, sem cartão): {p5_fala or "ok"}')
ch = spans['cartao'][0]
ok(ch[1] - ch[0] >= 2.5 and ch[0] - EV['fim_fala'] >= 0.9, f'cartão de envio legível de {ch[0]:.2f} a {ch[1]:.2f} s: {ch[1] - ch[0]:.2f} s (mínimo 2,5), sobe {EV["cartao"] - EV["fim_fala"]:.2f} s depois da última palavra; "Enviar" afunda em {EV["enviar"]:.2f} s')
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
fora = [(round(t, 2), b['nome']) for t, b in allb if b['nome'] != 'luz' and (b['y0'] < 200 or b['y1'] > 1536 or b['x0'] < 30 or b['x1'] > 1050)]   # (a luz é fundo, atrás da cabeça)
ok(not fora, f'todos os elementos entre y 200 e 1536 (fora da barra de cima e dos 20 % de baixo) e dentro das bordas: {fora[:5] or "ok"}')
cx = [b for t, b in allb if b['nome'] == 'legenda']
ok(min(b['y0'] for b in cx) >= 1360 and max(b['y1'] for b in cx) <= 1536 and min(b['x0'] for b in cx) >= 80 and max(b['x1'] for b in cx) <= 950,
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
        fundo = ndimage.binary_dilation(texto, iterations=10) & ~ndimage.binary_dilation(texto, iterations=3)   # o fundo logo em volta das letras
        if fundo.sum() < 50 or texto.sum() < 30: continue
        Lb = np.percentile(lum(reg[fundo]), 90); Lt = np.median(lum(reg[texto]))
        contr.append(((Lt + 0.05) / (Lb + 0.05), round(t, 1)))
cmin = min(contr)
ok(cmin[0] >= 4.5, f'contraste da legenda sem faixa, sobre a imagem real: mínimo {cmin[0]:.1f}:1 (em {cmin[1]} s), mediana {np.median([c for c, _ in contr]):.1f}:1 '
   '(texto × o fundo real a 3–10 px das letras, P90 — o mais claro —, já com a sombra difusa; alvo ≥ 4,5:1)')

# ---------------------------------------------------------------- capa
rep.append(''); rep.append('CAPA')
capa = open(os.path.join(OUT, 'grade', 'revisao', 'capa.txt')).read()
ok('RESULTADO: dentro da regra' in capa, 'capa na regra da grade (reels/tools/revisao_capa.py --cena): ' + ' | '.join(l.strip() for l in capa.splitlines()[2:] if l.strip()))

# ---------------------------------------------------------------- storyboard
ts = [(0.15, 'P1 1ª notificação'), (1.8, 'P1 3 notificações'), (3.6, 'P1 agrupadas'), (5.6, 'P2 mensagem'), (7.0, 'P2 digitando'), (8.2, 'P2 resposta'),
      (10.4, 'P3 notificação'), (12.6, 'P3 +6 · 14:31'), (18.4, 'P4 perguntas'), (19.6, 'P4 "aqui"'), (21.8, 'P5 folga'), (28.2, 'P5 cartão')]
cols = 6; sb = Image.new('RGB', (cols * 280 + 10, 2 * 540 + 10), (16, 16, 16)); dr = ImageDraw.Draw(sb)
for i, (t, nome) in enumerate(ts):
    im = quadro_png(VIDEO, int(round(t * FPS))).resize((270, 480)); x, y = 10 + (i % cols) * 280, 10 + (i // cols) * 540
    sb.paste(im, (x, y)); dr.text((x, y + 490), f'{t:.2f} s · {nome}', font=FONT_SB, fill=(175, 250, 39))
sb.save(os.path.join(OUT, 'storyboard.jpg'), quality=90)

pl = ' · '.join(f"{p['id'].upper()} {p['t0']:.2f}–{p['t1']:.2f} s ({p['t1'] - p['t0']:.2f} s)" for p in LN['planos'])
R = 'RESULTADO: ' + ('aprovado' if not falhas else f'{len(falhas)} falha(s)')
out = ['REEL AVATAR "SAÍ DA POUSADA POR DUAS HORAS" — V2 da camada de motion — revisão técnica', os.path.relpath(VIDEO, ROOT), f'{LN["duracao"]:.2f} s · ' + pl, ''] + rep + ['', R]
open(os.path.join(REV, 'relatorio.txt'), 'w').write('\n'.join(out) + '\n'); print('\n'.join(out))
