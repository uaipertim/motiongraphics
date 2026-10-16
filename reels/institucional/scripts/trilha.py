#!/usr/bin/env python3
"""
Trilha, efeitos e mixagem do vídeo institucional, 100% sintetizados (numpy/scipy), mais a narração.

    node scripts/render.cjs cues      # antes: audio/cues.json (tempos da animação e de cada trecho de voz)
    python3 scripts/trilha.py         # -> audio/mix.wav (48 kHz, estéreo) + output/revisao/mix.txt
    python3 scripts/trilha.py --ate 53.5   # prévia de um trecho: audio/mix-previa.wav (fade de 0,8 s no fim)

- Cena 1 (a bagunça): um zumbido grave e tenso, papel e a fita do caixa sacudindo; a bagunça é sugada.
- Da virada em diante: trilha positiva em Fá maior a 105 BPM (F · C/E · Dm · B♭, I–V–vi–IV), com pad,
  baixo pulsado, kalimba em arpejo e, a partir das telas, batida leve (bumbo, palmas, shaker, chimbal aberto
  no contratempo) com uma virada a cada 4 compassos. O 1º tempo cai quando a logo cresce, e o motor põe cada
  troca de tela num tempo da música (audio/cues.json: bpm, m0). No fim, o Fá fica soando com a sineta.
- Efeitos discretos nos instantes da animação (audio/cues.json): recorte subindo e voltando, brilho no
  contorno, toque, cada tecla digitada, contagem dos valores, check, selo, impressão do recibo, troca de tela,
  giro do celular, câmera aproximando, chip do trilho.
- Voz: os trechos de audio/voz/trechos/ (scripts/trechos.py) nos instantes do motor, sem aceleração.
  A trilha e os efeitos abaixam 9,5 dB enquanto a voz fala (ataque 60 ms, retorno 300 ms).
- Master: −14 LUFS integrado, limitador de pico real em −2 dBTP (no MP4, depois do AAC: ≤ −1 dBTP).
"""
import json
import os
import re
import subprocess
import sys
from fractions import Fraction
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))
DUR = float(DATA['duration'])
SEC = DATA['cenas']
CUES = DATA['cues']
SR = 48000
N = int(round(SR * DUR))
rng = np.random.default_rng(9090)
BPM = DATA.get('bpm', 105)
BT = 60.0 / BPM
BAR = 4 * BT
M0 = DATA.get('m0', SEC['virada'] + 0.75)  # o 1º tempo da trilha: a logo cresce ("Conheça o FAZLO Hospeda")
DUCK_DB = 9.5
TARGET = -14.0
CEIL = -2.0


# ------------------------------------------------------------------ básicos
def tt(d):
    return np.arange(int(max(0.0, d) * SR)) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def filt(x, f, kind='low', order=2):
    f = [max(20, f[0]), min(SR / 2 * 0.95, f[1])] if kind == 'band' else min(f, SR / 2 * 0.95)
    return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def place(buf, sig, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if sig.ndim == 2:
        if i < 0:
            sig, i = sig[:, -i:], 0
        j = min(N, i + sig.shape[1])
        if j > i:
            buf[:, i:j] += sig[:, : j - i] * g
        return
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    if j <= i:
        return
    pan = float(np.clip(pan, -1, 1))
    buf[0, i:j] += sig[: j - i] * g * np.cos((pan + 1) * np.pi / 4) * 1.414
    buf[1, i:j] += sig[: j - i] * g * np.sin((pan + 1) * np.pi / 4) * 1.414


def sweep(x, f0, f1, q=1.4):
    out, B, zi = np.zeros_like(x), 256, None
    for i in range(0, len(x), B):
        fc = f0 * (f1 / f0) ** (i / max(1, len(x) - 1))
        sos = butter(2, [fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 * 0.95)], 'band', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + B], zi = sosfilt(sos, x[i:i + B], zi=zi)
    return out


def saw_bl(f, t, bright, ph=0.0):
    kmax = max(2, int(min(SR / 2 - 800, bright * 2.5) / f))
    k = np.arange(1, kmax + 1)[:, None]
    return (np.sin(2 * np.pi * f * k * t[None, :] + ph * k) * ((1 / k) * np.exp(-(k * f) / bright))).sum(0)


def ir(d=2.2, seed=0, damp=0.55, lp=6000):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = filt(r.standard_normal(len(t)) * np.exp(-t / damp), lp)
    return x / np.sqrt((x ** 2).sum())


# ------------------------------------------------------------------ instrumentos
def pad(notes, d, bright=1000, att=0.5, rel=0.9):
    t = tt(d)
    out = np.zeros((2, len(t)))
    for n in notes:
        for k, dt in enumerate((-0.004, 0.0, 0.0045)):
            s = saw_bl(midi(n) * (1 + dt), t, bright, rng.uniform(0, 6.28))
            pan = (k - 1) * 0.7
            out[0] += s * np.cos((pan + 1) * np.pi / 4)
            out[1] += s * np.sin((pan + 1) * np.pi / 4)
    env = np.clip(t / att, 0, 1) ** 2 * np.clip((d - t) / rel, 0, 1)
    return out * env / (len(notes) * 3)


def sub(f, d):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.15 * saw_bl(f, t, 400)
    return np.tanh(1.4 * s) * np.minimum(1, t / 0.01) * np.clip((d - t) / 0.08, 0, 1)


def kalimba(f, d=1.4):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55) + 0.2 * np.sin(2 * np.pi * f * 5.95 * t) * np.exp(-t / 0.05)
    s += 0.1 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.12)
    return s * np.minimum(1, t / 0.0012)


def kick(d=0.4):
    t = tt(d)
    f = 50 + 120 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    return np.tanh(2.0 * body) * np.clip((d - t) / 0.02, 0, 1)


def shaker(v=1.0):
    d = 0.08
    t = tt(d)
    return filt(noise(d), [5000, 13000], 'band') * np.minimum(1, t / 0.005) * np.exp(-t / 0.025) * v


def rim(d=0.12):
    t = tt(d)
    s = np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.012) + filt(noise(d), [2000, 7000], 'band') * np.exp(-t / 0.006) * 0.6
    return s * np.minimum(1, t / 0.0005)


def desk_bell(f, d=3.0):
    t = tt(d)
    s = np.zeros_like(t)
    for m, a, dec in [(1.0, 1.0, 1.5), (1.0026, 0.55, 1.3), (2.0, 0.08, 0.6), (2.76, 0.42, 0.42), (2.766, 0.25, 0.38),
                      (4.1, 0.1, 0.2), (5.40, 0.2, 0.16), (0.5, 0.5, 2.2), (0.5013, 0.3, 2.0)]:
        s += a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    s += filt(noise(d), [2500, 12000], 'band') * np.exp(-t / 0.0025) * 0.9
    return s * np.minimum(1, t / 0.0006) / 2.3


# ------------------------------------------------------------------ efeitos
def whoosh(d=0.45, f0=300, f1=3000, peak=0.6):
    t = tt(d)
    env = np.where(t < peak * d, (t / (peak * d)) ** 2, np.exp(-(t - peak * d) / (0.25 * d)))
    return sweep(noise(d), f0, f1) * env


def paper(d=0.16):
    t = tt(d)
    s = filt(noise(d), [1200, 9000], 'band') * (np.abs(np.sin(2 * np.pi * 38 * t)) ** 3) * np.exp(-t / 0.06)
    return s + filt(noise(d), 300) * np.exp(-t / 0.03) * 0.8


def rattle(d=0.5):
    t = tt(d)
    s = np.zeros_like(t)
    for k in range(9):
        o = k * 0.05 + rng.uniform(0, 0.012)
        s += (t >= o) * filt(noise(d), [1500, 6000], 'band') * np.exp(-np.clip(t - o, 0, None) / 0.012) * (1 - k / 11)
    return s


def click(f=2600, d=0.03):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) * 0.6 + filt(noise(d), 4000, 'high')) * np.exp(-t / 0.004)


def blip(f0, f1, d=0.12):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.003) * np.exp(-t / 0.05)


def thud(d=0.25, f=90):
    t = tt(d)
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-t / 0.02))) / SR) * np.exp(-t / 0.07)


def shimmer(d=0.5):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / dec) for f, dec in [(2637, 0.25), (3520, 0.18), (4699, 0.12), (5274, 0.1)])
    return s * np.minimum(1, t / 0.02) / 4


def keyclick():
    d = 0.035
    t = tt(d)
    return (filt(noise(d), [1800, 7000], 'band') * np.exp(-t / 0.004) + 0.4 * np.sin(2 * np.pi * rng.uniform(900, 1300) * t) * np.exp(-t / 0.006))


def ticks(d, n0=26, n1=6):
    """a contagem: tiques que começam rápidos e desaceleram junto com o número"""
    out = np.zeros(int((d + 0.05) * SR))
    k, tt0 = 0, 0.0
    while tt0 < d:
        c = click(3400 + 400 * (k % 2), 0.012)
        i = int(tt0 * SR)
        out[i:i + len(c)] += c[: len(out) - i] * (0.9 - 0.4 * tt0 / d)
        rate = n0 + (n1 - n0) * (tt0 / d) ** 0.6
        tt0 += 1.0 / rate
        k += 1
    return out


def ding(d=1.2):
    t = tt(d)
    a = np.sin(2 * np.pi * midi(81) * t) * np.exp(-t / 0.35) * (t < 0.12)
    b = np.sin(2 * np.pi * midi(88) * np.clip(t - 0.09, 0, None)) * np.exp(-np.clip(t - 0.09, 0, None) / 0.5) * (t >= 0.09)
    return (a + b + 0.25 * np.sin(2 * np.pi * midi(100) * t) * np.exp(-t / 0.08)) * np.minimum(1, t / 0.003)


def stamp_hit():
    d = 0.25
    t = tt(d)
    return thud(d, 120) * 0.8 + filt(noise(d), [800, 4000], 'band') * np.exp(-t / 0.01) * 0.5


def printer(d=0.8):
    t = tt(d)
    motor = filt(noise(d), [600, 3500], 'band') * (0.55 + 0.45 * (np.sin(2 * np.pi * 22 * t) > 0))
    return motor * np.minimum(1, t / 0.03) * np.clip((d - t) / 0.08, 0, 1)


def fx(c, buf):
    t, k = c['t'], c['type']
    if k == 'bump':
        place(buf, paper(), t - 0.02, 0.35, rng.uniform(-0.6, 0.6))
    elif k == 'shake':
        place(buf, rattle(), t, 0.4, 0.4)
    elif k == 'suck':
        w = whoosh(0.8, 4000, 250, 0.85)[::-1]
        place(buf, w, t - 0.05, 0.5)
    elif k == 'pop':
        place(buf, desk_bell(midi(81), 2.6), t, 0.32, 0.1)
    elif k == 'rise':
        place(buf, whoosh(1.2, 200, 2200, 0.8), t, 0.28)
    elif k == 'on':
        place(buf, blip(900, 1800, 0.14), t, 0.18)
    elif k == 'flip':
        w = whoosh(0.5, 500, 4000, 0.5)
        place(buf, w, t, 0.3, -0.5)
    elif k == 'swipe':
        place(buf, whoosh(0.28, 1500, 6000, 0.4), t, 0.14, 0.4)
    elif k == 'lift':
        place(buf, whoosh(0.45, 400, 3200, 0.75), t, 0.2)
        place(buf, click(1900, 0.04), t + 0.42, 0.12)
    elif k == 'drop':
        place(buf, whoosh(0.32, 2500, 400, 0.3), t, 0.12)
        place(buf, thud(), t + 0.3, 0.16)
    elif k == 'tap':
        place(buf, click(), t, 0.22, 0.2)
    elif k == 'chip':
        place(buf, blip(1800, 2400, 0.09), t + 0.05, 0.08, -0.3)
    elif k == 'glint':
        place(buf, shimmer(), t, 0.05, 0.3)
    elif k == 'key':
        place(buf, keyclick(), t, 0.16, rng.uniform(-0.2, 0.2))
    elif k == 'count':
        place(buf, ticks(c.get('dur', 0.6)), t, 0.06, 0.15)
    elif k == 'check':
        place(buf, ding(), t, 0.11, 0.1)
    elif k == 'stamp':
        place(buf, stamp_hit(), t, 0.2)
    elif k == 'reveal':
        place(buf, whoosh(0.3, 800, 3500, 0.5), t, 0.06, -0.2)
    elif k == 'print':
        place(buf, printer(c.get('dur', 0.8)), t, 0.07, 0.2)
    elif k == 'zoom':
        place(buf, whoosh(0.6, 200, 1800, 0.7), t, 0.14)
    elif k == 'unzoom':
        place(buf, whoosh(0.5, 1800, 250, 0.3), t, 0.1)
    elif k == 'whoosh':
        place(buf, whoosh(0.9, 250, 3000, 0.6), t - 0.2, 0.32)


# ------------------------------------------------------------------ música
CHORDS = [  # I–V–vi–IV em Fá: (baixo, pad, arpejo de 8 colcheias)
    (41, [57, 60, 65, 67], [65, 69, 72, 77, 72, 69, 72, 76]),        # F (add9)
    (40, [55, 60, 64, 67], [64, 67, 72, 76, 72, 67, 72, 74]),        # C/E
    (38, [57, 60, 62, 65], [62, 65, 69, 74, 69, 65, 69, 72]),        # Dm7
    (46, [58, 62, 65, 69], [65, 70, 74, 77, 74, 70, 74, 72]),        # B♭maj7
]


def clap(d=0.3):
    t = tt(d)
    n = filt(noise(d), [900, 7000], 'band')
    env = sum((t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.004 if k < 3 else 0.1)) for k, o in enumerate([0, 0.008, 0.017, 0.026]))
    return n * env


def hat_open(d=0.2):
    t = tt(d)
    return filt(noise(d), 7000, 'high') * np.exp(-t / 0.06) * np.minimum(1, t / 0.001)


def pluck(f, d=0.3):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * saw_bl(f, t, 900) * np.exp(-t / 0.06)
    return np.tanh(1.3 * s) * np.exp(-t / 0.2) * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.03, 0, 1)


def music():
    buf = np.zeros((2, N))
    # cena 1: tensão (zumbido grave sem terça) e tique de relógio no tempo da música que vai entrar
    d1 = M0 + 0.4
    place(buf, pad([38, 45, 50], d1, bright=500, att=1.2, rel=0.6), 0.0, 0.5)
    k = 1
    while M0 - k * BT / 2 > 0.1:
        tk = M0 - k * BT / 2
        if tk < SEC['virada']:
            place(buf, click(3200 if k % 2 else 2600, 0.02), tk, 0.05, 0.3 if k % 2 else -0.3)
        k += 1
    place(buf, whoosh(1.4, 150, 2500, 0.95), SEC['virada'] - 1.25, 0.18)
    # da virada ao fim
    end = DUR - 0.2
    nbars = int(np.ceil((end - M0) / BAR))
    drums_on, drums_off = SEC['reservas'], SEC['fechamento']
    for b in range(nbars):
        t0 = M0 + b * BAR
        if t0 >= end:
            break
        root, notes, arp = CHORDS[b % 4]
        last = t0 + BAR >= SEC['url']
        if last:
            root, notes, arp = CHORDS[0]
            dd = end - t0
        else:
            dd = BAR + 0.5
        drums = drums_on - 0.01 <= t0 < drums_off
        place(buf, pad(notes, dd, bright=1000 if not drums else 1300), t0, 0.45)
        if last:
            place(buf, sub(midi(root), dd), t0, 0.3)
            for i, n in enumerate([65, 69, 72, 76, 79]):
                place(buf, kalimba(midi(n), 3.0), t0 + i * BT / 2, 0.16, (i - 2) * 0.3)
            break
        # baixo: semínima pontuada + colcheia (pulsa sem pesar)
        for q, dur, oct_ in [(0, 0.75, 0), (1.5, 0.45, 0), (2, 0.75, 0), (3.5, 0.4, 12)]:
            place(buf, pluck(midi(root + oct_), dur * BT * 2), t0 + q * BT, 0.3 if drums else 0.22)
        for i, n in enumerate(arp):
            place(buf, kalimba(midi(n)), t0 + i * BT / 2, 0.15 if i % 2 == 0 else 0.1, np.sin(i * 1.3) * 0.5)
        if drums:
            fill = (b % 4) == 3
            for q in range(4):
                tb = t0 + q * BT
                place(buf, kick(), tb, 0.45 if q in (0, 2) else 0.0)
                if q in (1, 3):
                    place(buf, clap(), tb, 0.13, 0.15)
                place(buf, hat_open(), tb + BT / 2, 0.05, 0.4)
            for e in range(16):
                place(buf, shaker(0.75 if e % 4 == 2 else 0.45), t0 + e * BT / 4 + 0.01, 0.1, 0.45)
            if fill:                                   # virada: dois bumbos no fim do 4º compasso
                place(buf, kick(), t0 + 3.5 * BT, 0.3)
                place(buf, kick(), t0 + 3.75 * BT, 0.25)
        elif t0 + BAR > drums_on - 0.01 and t0 < drums_on:
            place(buf, whoosh(BAR, 200, 4000, 0.95), t0, 0.12)          # sobe para a entrada da batida
        else:
            place(buf, kick(), t0, 0.25)                                  # cena 2: só o 1º tempo
    r = ir()
    wet = np.stack([fftconvolve(buf[0], r)[:N], fftconvolve(buf[1], ir(seed=1))[:N]])
    buf = buf + 0.16 * wet
    fade = np.clip((DUR - 0.05 - np.arange(N) / SR) / 1.4, 0, 1)
    return buf * fade


# ------------------------------------------------------------------ medida, limitador, ducking
def lufs(x):
    raw = os.path.join(ROOT, 'audio', '.medida.wav')
    wavfile.write(raw, SR, np.clip(x, -1, 1).astype(np.float32))
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    os.remove(raw)
    s = e[e.rindex('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1))


def true_peak_limit(x, ceiling_db=CEIL, os_=4):
    c = 10 ** (ceiling_db / 20)
    up = resample_poly(x, os_, 1, axis=0)
    need = np.minimum(1.0, c / np.maximum(np.abs(up).max(axis=1), 1e-9))
    w = int(0.002 * SR * os_)
    g = uniform_filter1d(minimum_filter1d(need, w), w // 2)
    g = g[: len(g) // os_ * os_].reshape(-1, os_).min(axis=1)
    y = x[: len(g)] * g[:, None]
    return np.concatenate([y, np.zeros((len(x) - len(y), 2))]) if len(y) < len(x) else y


def follower(active, att=0.06, rel=0.30):
    blk = SR // 1000
    a = active[: len(active) // blk * blk].reshape(-1, blk).max(axis=1).astype(float)
    ka, kr = np.exp(-1 / (att * 1000)), np.exp(-1 / (rel * 1000))
    env, e = np.zeros_like(a), 0.0
    for i, v in enumerate(a):
        e = v + (e - v) * (ka if v > e else kr)
        env[i] = e
    env = np.repeat(env, blk)
    return np.pad(env, (0, max(0, len(active) - len(env))), 'edge')[: len(active)]


def main():
    # a voz: os trechos nos instantes do motor
    voice = np.zeros(N)
    hp = butter(2, 70, 'high', fs=SR, output='sos')
    plan = []
    tre = {x['id']: x for x in json.load(open(os.path.join(ROOT, 'src', 'voz-trechos.json')))['trechos']}
    for v in DATA['voz']:
        sr, x = wavfile.read(os.path.join(ROOT, 'audio', 'voz', 'trechos', f'{v["id"]}.wav'))
        x = x.astype(np.float64) / 32768
        fr = Fraction(SR, sr)
        x = sosfilt(hp, resample_poly(x, fr.numerator, fr.denominator))
        i = int(round(v['t'] * SR))
        voice[i:i + len(x)] += x[: N - i]
        plan.append((v['id'], v['t'], v['t'] + len(x) / SR, tre[v['id']]['texto']))
    v2 = np.stack([voice, voice], axis=1)
    v2 *= 10 ** ((-16.0 - lufs(v2)) / 20)
    # trilha + efeitos
    mus = music()
    sfx = np.zeros((2, N))
    for c in CUES:
        fx(c, sfx)
    bed = (mus + sfx).T
    bed *= 10 ** ((-21.0 - lufs(bed)) / 20)              # a trilha bem abaixo da voz já antes do ducking
    rms = np.sqrt(np.maximum(uniform_filter1d(voice ** 2, int(0.02 * SR)), 0))
    active = rms > 10 ** (-40 / 20) * max(rms.max(), 1e-9)
    active = maximum_filter1d(active.astype(np.uint8), int(0.25 * SR)).astype(bool)
    gain = 1 - (1 - 10 ** (-DUCK_DB / 20)) * follower(active)
    ducked = bed * gain[:, None]
    x = v2 + ducked
    for _ in range(4):
        x = true_peak_limit(x * 10 ** ((TARGET - lufs(x)) / 20))
    I = lufs(x)
    wavfile.write(os.path.join(ROOT, 'audio', 'mix.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
    if '--ate' in sys.argv:                            # prévia de um trecho, com fade de 0,8 s no fim
        te = float(sys.argv[sys.argv.index('--ate') + 1])
        y = x[: int(te * SR)].copy()
        y[-int(0.8 * SR):] *= np.linspace(1, 0, int(0.8 * SR))[:, None]
        wavfile.write(os.path.join(ROOT, 'audio', 'mix-previa.wav'), SR, np.round(np.clip(y, -1, 1) * 32767).astype(np.int16))
    # conferência
    on = active & (np.abs(bed).max(axis=1) > 1e-4)
    g = np.abs(ducked).max(axis=1)[on] / np.maximum(np.abs(bed).max(axis=1)[on], 1e-9)
    steady = -20 * np.log10(np.median(g[g < np.percentile(g, 50)]))
    L = ['Institucional — mixagem', '',
         f'duração {DUR:.2f} s · 48 kHz estéreo · loudness integrado do WAV {I:.1f} LUFS (alvo −14) · limitador −2 dBTP',
         f'trilha e efeitos sob a voz: {steady:.1f} dB mais baixos com a voz falando (alvo 8–10 dB)', '',
         'Onde cada trecho de voz entra (velocidade 1,0, sem aceleração):']
    for tid, a, b, txt in plan:
        L.append(f'  {tid:3s} {a:6.2f}–{b:6.2f} s  "{txt}"')
    os.makedirs(os.path.join(ROOT, 'output', 'revisao'), exist_ok=True)
    open(os.path.join(ROOT, 'output', 'revisao', 'mix.txt'), 'w').write('\n'.join(L) + '\n')
    print('\n'.join(L))


if __name__ == '__main__':
    main()
