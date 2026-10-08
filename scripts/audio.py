#!/usr/bin/env python3
"""
Trilha sonora + efeitos do Reels FAZLO Hospeda — 100% sintetizada (numpy/scipy).
120 BPM (1 tempo = 0,5 s), sincronizada com a linha do tempo de src/anim.js.

    python3 scripts/audio.py            -> audio/trilha.wav (48 kHz, estéreo)
"""
import os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = 28.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(2026)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ------------------------------------------------------------------ básicos
def tt(d):
    return np.arange(int(d * SR)) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def filt(x, f, kind='low', order=2):
    if kind == 'band':
        f = [max(20, f[0]), min(SR / 2 * 0.95, f[1])]
    else:
        f = min(f, SR / 2 * 0.95)
    return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)


def stereo():
    return np.zeros((2, N))


def place(buf, sig, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:j] += sig[: j - i] * g * l * 1.414
    buf[1, i:j] += sig[: j - i] * g * r * 1.414


def noise(d):
    return rng.standard_normal(int(d * SR))


def sweep(x, f0, f1, q=1.4):
    """Passa-faixa com frequência central variando exponencialmente f0 -> f1."""
    out = np.zeros_like(x)
    n, B, zi = len(x), 256, None
    for i in range(0, n, B):
        fc = f0 * (f1 / f0) ** (i / max(1, n - 1))
        lo, hi = fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 * 0.95)
        sos = butter(2, [lo, hi], 'band', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + B], zi = sosfilt(sos, x[i:i + B], zi=zi)
    return out


# ------------------------------------------------------------------ instrumentos
def kick(d=0.5, punch=1.0):
    t = tt(d)
    f = 44 + 120 * np.exp(-t / 0.032)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.26)
    click = filt(noise(d), 3000, 'high') * np.exp(-t / 0.004) * 0.35
    return np.tanh(1.8 * punch * (s + click))


def clap(d=0.35):
    t = tt(d)
    n = filt(noise(d), [1000, 5000], 'band')
    env = np.zeros_like(t)
    for k, o in enumerate([0, 0.012, 0.024, 0.034]):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.005 if k < 3 else 0.11))
    return n * env * 0.9


def snare(d=0.25, v=1.0):
    t = tt(d)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
    n = filt(noise(d), [1500, 8000], 'band') * np.exp(-t / 0.07)
    return (body + n) * v


def hat(d=0.08, open_=False):
    t = tt(d)
    return filt(noise(d), 7000, 'high') * np.exp(-t / (0.09 if open_ else 0.022))


def saw_add(f, d, bright=3500, detune=0.0):
    """Dente-de-serra aditivo (sem aliasing), com brilho controlado."""
    t = tt(d)
    out = np.zeros_like(t)
    kmax = int(min(SR / 2 - 500, bright * 3) / f)
    ph = rng.uniform(0, 2 * np.pi)
    for k in range(1, max(2, kmax)):
        out += np.sin(2 * np.pi * k * f * (1 + detune) * t + ph * k) / k * np.exp(-(k * f) / bright)
    return out


def pad(notes, d, bright=1800):
    t = tt(d)
    s = np.zeros_like(t)
    for n in notes:
        for dt in (-0.006, 0.0, 0.0065):
            s += saw_add(midi(n), d, bright, dt)
    a = 0.12
    env = np.clip(t / a, 0, 1) * np.clip((d - t) / 0.15, 0, 1)
    return s * env / (len(notes) * 3)


def pluck(f, d=0.35, bright=1.0):
    t = tt(d)
    s = np.zeros_like(t)
    for k in range(1, 18):
        if k * f > SR / 2 - 1000:
            break
        s += np.sin(2 * np.pi * k * f * t) / k * np.exp(-t * (6 + k * 2.2 / bright))
    return s * np.minimum(1, t / 0.002)


def bass_note(f, d):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * saw_add(f, d, 900)
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.28) * np.clip((d - t) / 0.02, 0, 1)
    return np.tanh(1.4 * s) * env


def blip(f, d=0.18):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.02)) * np.exp(-t / 0.06)


def pop(f=500, d=0.12):
    t = tt(d)
    fr = f * (1 + 1.2 * np.exp(-t / 0.012))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.035) * np.minimum(1, t / 0.001)


def chime(f, d=1.2):
    t = tt(d)
    s = 0
    for m, a, dec in ((1, 1, 0.7), (2.0, 0.4, 0.4), (3.01, 0.22, 0.25), (4.17, 0.12, 0.12)):
        s = s + a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / dec)
    return s * np.minimum(1, t / 0.002)


def clink(f=3600, d=0.3):
    t = tt(d)
    s = 0
    for m, a, dec in ((1, 1, 0.12), (1.47, 0.6, 0.09), (2.09, 0.5, 0.06), (2.81, 0.3, 0.04)):
        s = s + a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    s += filt(noise(d), 5000, 'high') * np.exp(-t / 0.003) * 0.6
    return s


def click(d=0.03, f=2500):
    t = tt(d)
    return filt(noise(d), [f * 0.6, f * 1.6], 'band') * np.exp(-t / 0.004) + np.sin(2 * np.pi * f * 0.5 * t) * np.exp(-t / 0.006) * 0.3


def whoosh(d=0.45, f0=300, f1=3000, peak=0.6):
    t = tt(d)
    x = sweep(noise(d), f0, f1, 1.2)
    u = t / d
    env = np.where(u < peak, (u / peak) ** 2, ((1 - u) / (1 - peak)) ** 1.5)
    return x * env


def riser(d, f0=200, f1=1600):
    t = tt(d)
    u = t / d
    ns = sweep(noise(d), 400, 9000, 2.0) * u ** 2.2
    fr = f0 * (f1 / f0) ** u
    tone = np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(fr * 1.5) / SR)
    tone *= u ** 2.5 * (1 + 0.3 * np.sin(2 * np.pi * (5 + 18 * u) * t))
    return ns * 0.8 + tone * 0.18


def impact(d=2.2, big=1.0):
    t = tt(d)
    f = 30 + 70 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.9 * big))
    crash = filt(noise(d), 6000, 'low') * np.exp(-t / 0.5) * 0.5
    crash += filt(filt(noise(d), 4000, 'high'), 10000, 'low') * np.exp(-t / 0.45) * 0.1
    return np.tanh(1.5 * (sub + crash + kick(d, 1.3)[: len(t)] * 0.6))


def thud(d=0.4):
    t = tt(d)
    return np.sin(2 * np.pi * 85 * t) * np.exp(-t / 0.09) + filt(noise(d), 1200, 'low') * np.exp(-t / 0.04) * 0.8


def buzz(d):
    """Impressora: rajada de micro-cliques."""
    t = tt(d)
    pulses = (np.sin(2 * np.pi * 38 * t) > 0.6).astype(float)
    n = filt(noise(d), [1800, 6000], 'band')
    return n * pulses * 0.6 + np.sin(2 * np.pi * 120 * t) * 0.08 * pulses


# ------------------------------------------------------------------ arranjo
music = stereo()
drums = stereo()
sfx = stereo()
send = stereo()  # reverb

# harmonia: (início, fim, acorde pad, nota de baixo)
C_, G_, Am, F_ = [60, 64, 67, 74], [59, 62, 67, 74], [57, 60, 64, 72], [57, 60, 65, 72]
Csus = [60, 65, 67, 72]
ROOTS = {'C': 36, 'G': 31, 'A': 33, 'F': 29, 'Bb': 34, 'E': 28}
harmony = [
    (0.0, 1.0, Am, 'A'),
    (1.0, 3.0, Am, 'A'),
    (3.0, 5.0, [58, 62, 65, 70], 'Bb'),
    (5.0, 7.0, C_, 'C'), (7.0, 9.0, G_, 'G'), (9.0, 11.0, Am, 'A'), (11.0, 13.0, F_, 'F'),
    (13.0, 15.0, C_, 'C'), (15.0, 17.0, G_, 'G'), (17.0, 19.0, Am, 'A'), (19.0, 21.5, F_, 'F'),
    (21.5, 23.0, [59, 62, 67, 71], 'G'),
    (23.0, 28.0, [60, 64, 67, 71, 76], 'C'),
]

# pad
for a, b, ch, root in harmony:
    br = 900 if a < 5 else 2200
    if a >= 23:
        br = 2600
    place(music, pad(ch, b - a + 0.25, br), a, 0.55 if a >= 5 else 0.42, 0)

# baixo pulsante (colcheias no contratempo + tônica no tempo a partir do drop)
for a, b, ch, root in harmony:
    if a < 1.0:
        continue
    f = midi(ROOTS[root])
    t = a
    step = 0.125 if (1.0 <= a < 5.0) else 0.25
    end = min(b, 26.5)
    while t < end - 1e-6:
        if 4.5 <= t < 5.0 or 21.0 <= t < 21.5:
            t += step
            continue
        off = round((t / 0.25)) % 2 == 1
        octv = 2 if (step == 0.25 and off and int(t * 4) % 4 == 3) else 1
        g = 0.55 if (step == 0.125 or off) else 0.4
        place(music, bass_note(f * octv, step * 0.95), t, g)
        t += step

# arpejo "pluck" brilhante nas funcionalidades e no final
ARP = [0, 1, 2, 3, 2, 1, 2, 3]
for a, b, ch, root in harmony:
    if a < 5.0:
        continue
    notes = [n + 12 for n in ch[:4]]
    t, i = a, 0
    while t < min(b, 26.0) - 1e-6:
        if not (21.0 <= t < 21.5):
            n = notes[ARP[i % len(ARP)]]
            v = 0.16 if i % 2 == 0 else 0.11
            pan = -0.35 if i % 2 else 0.35
            s = pluck(midi(n), 0.3)
            place(music, s, t, v, pan)
            place(send, s, t, v * 0.5, pan)
        t += 0.125
        i += 1

# bateria
def beats(a, b, step=BEAT):
    t = a
    while t < b - 1e-6:
        yield round(t, 4)
        t += step

for t in beats(1.0, 4.5):
    place(drums, kick(), t, 0.85)
for t in beats(5.0, 21.0):
    place(drums, kick(), t, 0.95)
for t in beats(21.5, 26.5):
    place(drums, kick(), t, 0.95)
for t in beats(2.0, 4.5, 0.125):
    place(drums, hat(), t, 0.16 if (t * 4) % 1 else 0.24, 0.3)
for t in beats(5.25, 26.5, 0.5):
    if not (21.0 <= t < 21.5):
        place(drums, hat(0.15, True), t, 0.17, 0.25)
for t in beats(5.0, 26.5, 0.125):
    if not (21.0 <= t < 21.5) and abs((t * 4) % 2 - 0.5) < 1e-3:
        place(drums, hat(), t, 0.08, -0.3)
for t in beats(2.5, 4.5, 1.0):
    place(drums, clap(), t, 0.45)
    place(send, clap(), t, 0.2)
for t in beats(5.5, 26.5, 1.0):
    if not (21.0 <= t < 21.5):
        place(drums, clap(), t, 0.5)
        place(send, clap(), t, 0.25)
# virada de caixa antes do merge (20.0 -> 21.5)
t, k = 20.0, 0
while t < 21.45:
    step = 0.125 if t < 20.75 else 0.0625
    place(drums, snare(0.2, 0.25 + 0.6 * (t - 20.0) / 1.5), t, 0.5, 0.1 * ((k % 2) * 2 - 1))
    t += step
    k += 1

# side-chain (bombeado) na música, a partir dos bumbos
duck = np.ones(N)
for t in list(beats(1.0, 4.5)) + list(beats(5.0, 21.0)) + list(beats(21.5, 26.5)):
    i = int(t * SR)
    L = int(0.4 * SR)
    j = min(N, i + L)
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.65 * np.exp(-np.arange(j - i) / SR / 0.09))
music *= duck

# ------------------------------------------------------------------ efeitos (sincronizados com anim.js)
place(sfx, impact(1.6, 0.7), 0.0, 0.4)
place(send, impact(1.6, 0.7), 0.0, 0.15)
place(sfx, pop(380), 0.0, 0.4)
place(sfx, pop(620), 0.08, 0.45)
for tw in (0.12, 0.25):
    place(sfx, whoosh(0.35, 600, 4000), tw - 0.05, 0.18)
# estouro da casa
place(sfx, whoosh(0.6, 200, 5000, 0.3), 0.92, 0.45)
place(sfx, impact(0.8, 0.4), 1.0, 0.35)
for i in range(9):
    place(sfx, pop(500 + i * 70), 1.0 + i * 0.035, 0.28, (i % 3 - 1) * 0.6)
place(sfx, whoosh(0.3, 3000, 500), 1.72, 0.15)
for tw in (2.0, 2.1, 2.25):
    place(sfx, whoosh(0.3, 800, 5000), tw - 0.05, 0.16)
# stickers do caos
pent = [72, 74, 76, 79, 81, 84, 86, 88, 91]
for i, ts in enumerate([2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5]):
    place(sfx, pop(midi(pent[i]) / 2.5), ts, 0.4, ((i * 7) % 5 - 2) * 0.3)
    place(sfx, blip(midi(pent[i])), ts, 0.12, ((i * 7) % 5 - 2) * 0.3)
place(sfx, riser(2.0, 180, 1500), 3.0, 0.5)
# DROP 5.0
place(sfx, impact(2.4, 1.2), 5.0, 0.6)
place(send, impact(2.4, 1.2), 5.0, 0.2)
place(sfx, chime(midi(84), 1.5), 5.02, 0.12)
for g in range(8):
    place(sfx, click(0.04, 2200 + g * 180), 5.05 + g * 0.03 + 0.18, 0.35, ((g % 3) - 1) * 0.5)
for tw in (5.35, 5.5):
    place(sfx, whoosh(0.35, 700, 5000), tw - 0.05, 0.15)
# zoom no calendário
place(sfx, whoosh(0.62, 150, 6000, 0.9), 6.4, 0.55)

# 01 Reservas
place(sfx, whoosh(0.5, 300, 2500, 0.4), 6.98, 0.3)
scale = [72, 74, 76, 79, 81, 84, 86, 88, 91]
for k in range(9):
    s = blip(midi(scale[k]))
    place(sfx, s, 7.5 + k * 0.1 + 0.06, 0.22, ((k % 3) - 1) * 0.5)
    place(send, s, 7.5 + k * 0.1 + 0.06, 0.1)
place(sfx, pop(700), 8.56, 0.35)
place(sfx, chime(midi(88), 0.9), 8.7, 0.16)
# 02 Check-in
place(sfx, whoosh(0.45, 400, 3500, 0.7), 9.15, 0.5)
place(sfx, whoosh(0.5, 2500, 600, 0.3), 9.68, 0.3, 0.4)
place(sfx, click(0.04, 1800), 10.2, 0.5, 0.3)
place(sfx, click(0.05, 1300), 10.45, 0.7, 0.3)
place(sfx, click(0.05, 900), 10.49, 0.6, 0.3)
place(sfx, whoosh(0.7, 120, 1200, 0.4), 10.5, 0.4, -0.2)
place(sfx, chime(midi(91), 1.2), 10.62, 0.12)
place(sfx, pop(520), 10.8, 0.4, -0.5)
place(sfx, pop(640), 10.95, 0.4, 0.5)
place(sfx, whoosh(0.5, 200, 5000, 0.85), 11.5, 0.5)
# 03 Comandas
place(sfx, pop(300), 12.0, 0.35)
place(sfx, buzz(1.25), 12.25, 0.3)
place(sfx, pop(560), 12.5, 0.25, -0.6)
place(sfx, pop(680), 12.65, 0.25, 0.6)
place(sfx, thud(), 13.6, 0.75)
place(send, thud(), 13.6, 0.3)
place(sfx, whoosh(0.5, 300, 4000, 0.6), 14.12, 0.5)
# 04 Pagamentos
place(sfx, whoosh(0.4, 500, 3000, 0.5), 14.58, 0.3, -0.5)
place(sfx, pop(560), 14.78, 0.35, 0.5)
place(sfx, whoosh(0.4, 400, 2500, 0.5), 14.9, 0.25, -0.3)
for i in range(3):
    tl = 14.5 + 0.5 + i * 0.1 + 0.55 * 0.364
    place(sfx, clink(3300 + i * 400), tl, 0.25, 0.5)
    place(sfx, clink(3600 + i * 300), tl + 0.55 * 0.36, 0.1, 0.5)
place(sfx, whoosh(0.32, 4000, 300, 0.92), 15.62, 0.4)
place(sfx, pop(260), 15.9, 0.5)
place(sfx, chime(midi(84), 1.2), 16.0, 0.3)
place(sfx, chime(midi(91), 1.2), 16.1, 0.28)
place(send, chime(midi(91), 1.2), 16.1, 0.15)
place(sfx, whoosh(0.4, 200, 5000, 0.9), 16.62, 0.5)
# 05 Caixa
HEIGHTS = [4, 7, 5, 9, 12]
for s in range(5):
    for c in range(HEIGHTS[s]):
        t0 = 17.0 + 0.3 + (c * 5 + s) * 0.032 + 0.28 * 0.364
        place(sfx, clink(2800 + rng.uniform(-300, 900)), t0, 0.1, (s - 2) * 0.35)
tick_t = 17.35
while tick_t < 18.7:
    place(sfx, click(0.02, 3500), tick_t, 0.12)
    tick_t += 0.05 + 0.1 * ((tick_t - 17.35) / 1.4) ** 2
for i, n in enumerate([96, 100, 103]):
    place(sfx, chime(midi(n), 1.0), 18.8 + i * 0.05, 0.14)
place(sfx, clink(4200, 0.5), 18.8, 0.3)
place(send, chime(midi(103), 1.0), 18.9, 0.12)
place(sfx, whoosh(0.55, 300, 4500, 0.6), 19.05, 0.5)
# Final: órbita -> merge -> logo
for i in range(5):
    place(sfx, pop(520 + i * 90), 19.6 + i * 0.08 + 0.05, 0.32, (i - 2) * 0.4)
place(sfx, riser(1.5, 220, 1800), 20.0, 0.55)
place(sfx, impact(2.6, 1.3), 21.5, 0.6)
place(send, impact(2.6, 1.3), 21.5, 0.2)
for i in range(14):
    f = midi(84 + [0, 4, 7, 12, 16, 19, 24][i % 7])
    place(sfx, chime(f, 0.6), 21.5 + i * 0.045, 0.06, rng.uniform(-0.8, 0.8))
place(sfx, whoosh(0.6, 300, 3000, 0.5), 22.55, 0.35)
for i, n in enumerate([67, 72, 76, 79, 84]):
    place(sfx, pop(midi(n) / 2), 23.0 + i * 0.07 + 0.08, 0.35, (i - 2) * 0.35)
    place(sfx, pluck(midi(n + 12), 0.5), 23.0 + i * 0.07 + 0.08, 0.18, (i - 2) * 0.35)
place(sfx, impact(2.0, 0.8), 23.0, 0.35)
place(sfx, whoosh(0.4, 600, 3000, 0.5), 23.85, 0.25)
place(sfx, pop(480), 24.0, 0.35)
place(sfx, whoosh(0.35, 800, 4000, 0.5), 24.25, 0.2)
place(sfx, pop(640), 24.68, 0.4)
place(sfx, chime(midi(96), 1.6), 24.7, 0.14)
# carimbo final da marca (25.5s)
place(sfx, pop(420), 25.5, 0.45)
place(sfx, whoosh(0.3, 800, 4000, 0.4), 25.55, 0.15)
place(sfx, chime(midi(88), 1.2), 25.6, 0.16)
place(sfx, chime(midi(96), 1.2), 25.68, 0.14)
place(send, chime(midi(96), 1.2), 25.68, 0.1)
# acorde final sustentado
place(music, pad([48, 60, 64, 67, 71, 76], 4.8, 3000), 23.0, 0.5)
place(send, pad([60, 64, 67, 71, 76], 4.8, 3000), 23.0, 0.3)

# ------------------------------------------------------------------ reverb + master
def ir(d=1.9, seed=0):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = r.standard_normal(len(t)) * np.exp(-t / 0.45)
    return filt(x, 5500, 'low') * 0.06


send += sfx * 0.18 + music * 0.12
wet = np.stack([fftconvolve(send[0], ir(seed=1))[:N], fftconvolve(send[1], ir(seed=2))[:N]])

mix = music * 0.62 + drums * 0.75 + sfx * 0.85 + wet * 0.9
# fade de saída
t = np.arange(N) / SR
mix *= np.clip((DUR - t) / 1.4, 0, 1) ** 1.5
mix *= np.clip(t / 0.004, 0, 1)
# limitador suave
mix = filt(mix, 28, 'high')
# normaliza pelo corpo da música (não pelos picos) e satura suavemente os transientes
body = np.percentile(np.abs(mix), 99.7)
mix = np.tanh(mix / body * 0.95) * 0.72

os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
out = os.path.join(ROOT, 'audio', 'trilha.wav')
wavfile.write(out, SR, (mix.T * 32767).astype(np.int16))
print('ok ->', out)
