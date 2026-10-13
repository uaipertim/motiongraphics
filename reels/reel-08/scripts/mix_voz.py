#!/usr/bin/env python3
"""
Versão com voz do Reel 08 (teste de narração): monta as falas de audio/voz/ (geradas por
scripts/voz.py) sobre os efeitos do vídeo, faz a mixagem e o master e grava um MP4 NOVO.

    python3 scripts/mix_voz.py   -> audio/trilha-voz.wav + output/fazlo-hospeda-reel-08-voz.mp4
                                    + output/revisao/voz-mix.txt + output/revisao/voz-linha-do-tempo.png

- O vídeo não muda: a imagem do MP4 novo é uma cópia exata da do MP4 sem voz (sem recodificar).
- As falas não são aceleradas (velocidade 1,0). Para caberem nas cenas, só as pausas entre as
  frases ficam um pouco mais curtas (o corte é feito no meio do silêncio, com transição de 20 ms).
- Os efeitos abaixam 9,5 dB enquanto a voz fala (ataque 60 ms, retorno 300 ms) e voltam nas pausas.
- Master: -14 LUFS integrado, pico real ≤ -1 dBTP no MP4 (limitador a -2 dBTP antes do AAC).
"""
import json
import os
import re
import subprocess
from fractions import Fraction
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d
from scipy.signal import butter, resample_poly, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOZ = os.path.join(ROOT, 'audio', 'voz')
REV = os.path.join(ROOT, 'output', 'revisao')
VIDEO = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-08.mp4')
OUT_MP4 = os.path.join(ROOT, 'output', 'fazlo-hospeda-reel-08-voz.mp4')
SR = 48000
DUCK_DB = 9.5                 # quanto os efeitos abaixam sob a voz (pedido: 8–10 dB)
TARGET_LUFS = -14.0
CEILING = -2.0                # dBTP antes do AAC (no MP4: ≤ -1 dBTP)

# onde cada fala entra (s) e as pausas encurtadas (palavra antes da pausa -> nova pausa, s)
PLANO = {                     # pausas originais da voz: recepção… 0,49 · noite: 0,81 · amanhã? 0,33 · cachorro? 0,40 · Pix? 0,69 · onze. 0,36
    1: {'inicio': 0.05, 'pausas': {'recepção…': 0.40}},
    2: {'inicio': 2.88, 'pausas': {'noite:': 0.50, 'amanhã?': 0.26, 'cachorro?': 0.30, 'Pix?': 0.42}},
    3: {'inicio': 11.05, 'pausas': {}},
    4: {'inicio': 12.52, 'pausas': {'onze.': 0.32}},
}
CUES = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))
SEC = CUES['sections']
DUR = float(CUES['duration'])
N = int(round(SR * DUR))


def words(al):
    """palavras com o fim da última letra e o início da primeira (a pontuação não conta)"""
    out, w, a, b = [], '', None, None
    for c, s, e in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if not c.strip():
            if w:
                out.append((w, a, b))
            w, a, b = '', None, None
            continue
        if a is None and c.isalnum():
            a = s
        if c.isalnum():
            b = e
        w += c
    if w:
        out.append((w, a, b))
    return [(w, a, b) for w, a, b in out if a is not None and not w.startswith(('<', 'time=', '/>'))]


def trim_pauses(x, al, rules):
    """encurta as pausas depois das palavras indicadas, cortando no meio do silêncio"""
    W = words(al)
    cuts = []
    for i, (w, a, b) in enumerate(W[:-1]):
        if w in rules:
            p0, p1 = b, W[i + 1][1]
            if p1 - p0 > rules[w]:
                cuts.append((p0 + rules[w] / 2, p1 - rules[w] / 2))
    xf = int(0.02 * SR)
    y, last, removed = [], 0, 0.0
    for c0, c1 in cuts:
        i0, i1 = int(c0 * SR), int(c1 * SR)
        seg = x[last:i0].copy()
        if y:                                          # transição com o trecho anterior
            seg[:xf] = seg[:xf] * np.linspace(0, 1, xf) + y[-1][-xf:] * np.linspace(1, 0, xf)
            y[-1] = y[-1][:-xf]
        y.append(seg)
        last = i1 - xf
        removed += c1 - c0
    seg = x[last:].copy()
    if y:
        seg[:xf] = seg[:xf] * np.linspace(0, 1, xf) + y[-1][-xf:] * np.linspace(1, 0, xf)
        y[-1] = y[-1][:-xf]
    y.append(seg)
    return np.concatenate(y), cuts, removed


def lufs(x):
    raw = os.path.join(ROOT, 'audio', '.medida.wav')
    wavfile.write(raw, SR, np.clip(x, -1, 1).astype(np.float32))
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    os.remove(raw)
    s = e[e.rindex('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1))


def true_peak_limit(x, ceiling_db=CEILING, os_=4):
    """o mesmo limitador de pico real do audio.py (sobreamostrado 4x, antecipação de 2 ms)"""
    c = 10 ** (ceiling_db / 20)
    up = resample_poly(x, os_, 1, axis=0)
    need = np.minimum(1.0, c / np.maximum(np.abs(up).max(axis=1), 1e-9))
    w = int(0.002 * SR * os_)
    g = uniform_filter1d(minimum_filter1d(need, w), w // 2)
    g = g[: len(g) // os_ * os_].reshape(-1, os_).min(axis=1)
    y = x[: len(g)] * g[:, None]
    return np.concatenate([y, np.zeros((len(x) - len(y), 2))]) if len(y) < len(x) else y


def follower(active, att=0.06, rel=0.30):
    """envelope 0..1 com ataque e retorno exponenciais (por amostra, em blocos de 1 ms)"""
    blk = SR // 1000
    a = active[: len(active) // blk * blk].reshape(-1, blk).max(axis=1).astype(float)
    ka, kr = np.exp(-1 / (att * 1000)), np.exp(-1 / (rel * 1000))
    env, e = np.zeros_like(a), 0.0
    for i, v in enumerate(a):
        k = ka if v > e else kr
        e = v + (e - v) * k
        env[i] = e
    return np.repeat(env, blk)[:len(active)] if len(env) * blk >= len(active) else np.pad(np.repeat(env, blk), (0, len(active) - len(env) * blk), 'edge')


def main():
    D = json.load(open(os.path.join(VOZ, 'falas.json')))
    hp = butter(2, 70, 'high', fs=SR, output='sos')
    voice = np.zeros(N)
    plan = []
    for f in D['falas']:
        sr, x = wavfile.read(os.path.join(VOZ, f'cena-{f["id"]}.wav'))
        x = x.astype(np.float64) / 32768
        if sr != SR:                                   # 44,1 -> 48 kHz
            fr = Fraction(SR, sr)
            x = resample_poly(x, fr.numerator, fr.denominator)
        al = f['alinhamento']
        rules = PLANO[f['id']]['pausas']
        x, cuts, removed = trim_pauses(x, al, rules)
        x = sosfilt(hp, x)
        t0 = PLANO[f['id']]['inicio']
        fala = f['fim_da_fala'] - removed
        i0 = int(round(t0 * SR))
        voice[i0:i0 + len(x)] += x[: N - i0]
        plan.append({'id': f['id'], 'cena': f['cena'], 'inicio': t0, 'fim': t0 + fala, 'removido': removed, 'fala': f['fala']})
    # voz: nível de referência -16 LUFS (o master acerta o total depois)
    v2 = np.stack([voice, voice], axis=1)
    v2 *= 10 ** ((-16.0 - lufs(v2)) / 20)
    # efeitos: abaixam DUCK_DB enquanto a voz fala (com retenção de 250 ms entre palavras)
    sr, bed = wavfile.read(os.path.join(ROOT, 'audio', 'efeitos.wav'))
    bed = bed.astype(np.float64) / 32768
    bed = bed[:N] if len(bed) >= N else np.pad(bed, ((0, N - len(bed)), (0, 0)))
    rms = np.sqrt(np.maximum(uniform_filter1d(voice ** 2, int(0.02 * SR)), 0))
    active = rms > 10 ** (-40 / 20) * max(rms.max(), 1e-9)
    active = maximum_filter1d(active.astype(np.uint8), int(0.25 * SR)).astype(bool)
    env = follower(active)
    gain = 1 - (1 - 10 ** (-DUCK_DB / 20)) * env
    ducked = bed * gain[:, None]
    mix = v2 + ducked
    # master: -14 LUFS, limitador de pico real; repete enquanto o limitador "comer" volume
    x = mix
    for _ in range(4):
        x = true_peak_limit(x * 10 ** ((TARGET_LUFS - lufs(x)) / 20))
    I = lufs(x)
    wav = os.path.join(ROOT, 'audio', 'trilha-voz.wav')
    wavfile.write(wav, SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
    # MP4 novo: a imagem copiada do vídeo sem voz, o áudio novo em AAC
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', VIDEO, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', OUT_MP4], check=True)
    report(plan, I, bed, ducked, active, voice, x)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def report(plan, I_wav, bed, ducked, active, voice, master):
    L = ['Reel 08 com voz — mixagem e conferência', '']
    # 1) a imagem é a mesma
    md5 = lambda p: run(['ffmpeg', '-v', 'error', '-i', p, '-map', '0:v', '-c', 'copy', '-f', 'md5', '-']).stdout.strip()
    same = md5(VIDEO) == md5(OUT_MP4)
    L.append(f'{"OK   " if same else "FALHA"}  imagem idêntica à do MP4 sem voz (cópia do fluxo de vídeo, {md5(OUT_MP4)})')
    # 2) técnica do MP4
    pr = json.loads(run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,duration,sample_rate,channels,width,height,r_frame_rate',
                         '-of', 'json', OUT_MP4]).stdout)['streams']
    v = next(s for s in pr if s['codec_type'] == 'video'); a = next(s for s in pr if s['codec_type'] == 'audio')
    dv, da = float(v['duration']), float(a['duration'])
    L.append(f'{"OK   " if abs(dv - da) < 0.03 else "FALHA"}  {v["width"]}x{v["height"]} {v["codec_name"]} {v["r_frame_rate"]} · áudio {a["codec_name"]} {a["sample_rate"]} Hz {a["channels"]} canais · vídeo {dv:.3f} s / áudio {da:.3f} s')
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', OUT_MP4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    s = e[e.rindex('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)); TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))
    L.append(f'{"OK   " if abs(I - TARGET_LUFS) <= 0.5 else "FALHA"}  loudness integrado do MP4 {I:.1f} LUFS (alvo -14)')
    L.append(f'{"OK   " if TP <= -1.0 else "FALHA"}  pico real do MP4 {TP:.1f} dBTP (limite -1)')
    # 3) o quanto os efeitos abaixam sob a voz
    on = active & (np.abs(bed).max(axis=1) > 1e-4)
    db = lambda y: 20 * np.log10(np.sqrt((y ** 2).mean()) + 1e-12)
    red = db(bed[on]) - db(ducked[on])
    g = np.abs(ducked).max(axis=1)[on] / np.maximum(np.abs(bed).max(axis=1)[on], 1e-9)
    steady = -20 * np.log10(np.median(g[g < np.percentile(g, 50)]))
    L.append(f'{"OK   " if 8 <= steady <= 10 and red >= 8 else "FALHA"}  efeitos sob a voz: {steady:.1f} dB mais baixos com a voz falando '
             f'({red:.1f} dB na média da fala, contando as subidas e descidas); nas pausas, voltam ao nível do vídeo')
    # 4) a voz não passa do fim
    end = max(p['fim'] for p in plan)
    L.append(f'{"OK   " if end <= SEC["fade"] else "FALHA"}  a última fala termina em {end:.2f} s (o fade final começa em {SEC["fade"]} s)')
    L += ['', 'Onde cada fala entra (velocidade 1,0; só as pausas entre frases foram encurtadas):']
    for p in plan:
        L.append(f'  cena {p["id"]} · {p["cena"]:<15} {p["inicio"]:5.2f}–{p["fim"]:5.2f} s · pausas encurtadas em {p["removido"]:.2f} s · "{p["fala"]}"')
    L += ['', f'Na imagem: título 0 s ("O celular, não." vibra em {SEC["buzz"]} s) · relógio {SEC["clock"]} s · mensagens em '
          + ', '.join(f'{t:g}' for t in SEC['msgs']) + f' s · +37 NÃO LIDAS {SEC["stamp"]} s · convite {SEC["msg"]} s · logo {SEC["logo"]} s · fade {SEC["fade"]} s']
    os.makedirs(REV, exist_ok=True)
    open(os.path.join(REV, 'voz-mix.txt'), 'w').write('\n'.join(L) + '\n')
    print('\n'.join(L))
    timeline(plan, bed, ducked, voice, master)


def timeline(plan, bed, ducked, voice, master):
    W, H, M = 1800, 560, 60
    im = Image.new('RGB', (W, H), (18, 18, 18)); d = ImageDraw.Draw(im)
    fp = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
    font = ImageFont.truetype(fp, 18) if os.path.exists(fp) else ImageFont.load_default()
    X = lambda t: M + (W - 2 * M) * t / DUR
    def wave(y, top, h, col):
        k = len(y) // (W - 2 * M)
        a = np.abs(y[: k * (W - 2 * M)]).reshape(-1, k).max(axis=1)
        for i, v in enumerate(a):
            d.line((M + i, top + h / 2 - v * h / 2, M + i, top + h / 2 + v * h / 2), fill=col)
    d.text((M, 14), 'REEL 08 COM VOZ · linha do tempo', font=font, fill=(175, 250, 39))
    rows = [('efeitos (vídeo)', bed.max(axis=1), (110, 110, 104)), ('efeitos sob a voz', ducked.max(axis=1), (140, 190, 60)),
            ('voz', voice / max(np.abs(voice).max(), 1e-9) * 0.9, (240, 240, 232)), ('master -14 LUFS', master.max(axis=1), (175, 250, 39))]
    for r, (name, y, col) in enumerate(rows):
        top = 60 + r * 110
        d.text((M, top - 2), name, font=font, fill=(200, 200, 194))
        wave(y, top + 18, 80, col)
    for p in plan:
        d.rectangle((X(p['inicio']), 60 + 2 * 110 + 18, X(p['fim']), 60 + 2 * 110 + 98), outline=(175, 250, 39), width=2)
        d.text((X(p['inicio']) + 4, 60 + 2 * 110 + 20), f'cena {p["id"]}', font=font, fill=(175, 250, 39))
    ev = [(0, 'título'), (SEC['clock'], 'relógio')] + [(t, '') for t in SEC['msgs']] + [(SEC['stamp'], '+37'), (SEC['msg'], 'convite'), (SEC['logo'], 'logo'), (SEC['fade'], 'fade')]
    k = 0
    for t, n in ev:
        d.line((X(t), 50, X(t), H - 40), fill=(255, 90, 90) if not n else (255, 150, 40), width=1)
        if n:
            d.text((X(t) + 3, H - 40 + (k % 2) * 0 - (k % 2) * 22 + 4), n, font=font, fill=(255, 150, 40))
            k += 1
    for s in range(int(DUR) + 1):
        d.text((X(s) - 6, H - 18), str(s), font=font, fill=(120, 120, 116))
    im.save(os.path.join(REV, 'voz-linha-do-tempo.png'))


if __name__ == '__main__':
    main()
