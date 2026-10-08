#!/usr/bin/env python3
"""
Trilha + efeitos do Reels v2 "O ciclo da estadia" — 100% sintetizados (numpy/scipy).

120 BPM, Fá# menor → Lá maior. Groove quebrado (2-step) com piano elétrico FM,
marimba FM, baixo com harmônicos (audível em celular) e um "tique-taque" de
relógio como textura. Cada etapa do ciclo tem um "ding" de marimba que sobe um
grau na escala: a trilha também funciona como barra de progresso, e resolve no
acorde de Lá maior quando a marca aparece.

    python3 scripts/audio.py      -> audio/trilha.wav (48 kHz, estéreo, -14 LUFS)

Os tempos dos efeitos espelham a linha do tempo de src/anim.js.
"""
import json
import os
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = 29.0
N = int(SR * DUR)
BEAT = 0.5
S16 = BEAT / 4
rng = np.random.default_rng(1505)
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


def place_pan(buf, sig, t, g, pan_curve):
    """Como place(), mas com pan variando no tempo (array do mesmo tamanho de sig)."""
    i = int(round(t * SR))
    j = min(N, i + len(sig))
    s = sig[: j - i] * g
    pc = pan_curve[: j - i]
    buf[0, i:j] += s * np.cos((pc + 1) * np.pi / 4) * 1.414
    buf[1, i:j] += s * np.sin((pc + 1) * np.pi / 4) * 1.414


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


# ------------------------------------------------------------------ bateria
def kick(d=0.42, punch=1.0):
    t = tt(d)
    f = 48 + 150 * np.exp(-t / 0.022)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    click = filt(noise(d), 2500, 'high') * np.exp(-t / 0.003) * 0.45
    return np.tanh(2.2 * punch * (body + click))


def clap(d=0.3):
    t = tt(d)
    n = filt(noise(d), [900, 6000], 'band')
    env = np.zeros_like(t)
    for k, o in enumerate([0, 0.009, 0.02, 0.03]):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.004 if k < 3 else 0.09))
    body = np.sin(2 * np.pi * 210 * t) * np.exp(-t / 0.03) * 0.3
    return n * env * 0.85 + body


def rim(d=0.08):
    t = tt(d)
    s = np.sin(2 * np.pi * 1750 * t) * np.exp(-t / 0.012) + np.sin(2 * np.pi * 520 * t) * np.exp(-t / 0.02) * 0.6
    return s + filt(noise(d), [2000, 7000], 'band') * np.exp(-t / 0.004) * 0.6


def hat(d=0.06, open_=False):
    t = tt(d if not open_ else 0.25)
    return filt(noise(len(t) / SR), 8000, 'high') * np.exp(-t / (0.08 if open_ else 0.016))


def tick(f=2600, d=0.05):
    """Tique-taque de relógio (bloco de madeira)."""
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.01) * 0.8 + filt(noise(d), [f * 0.7, f * 1.6], 'band') * np.exp(-t / 0.003))


def snare_roll_hit(v):
    t = tt(0.16)
    return (filt(noise(0.16), [1500, 9000], 'band') * np.exp(-t / 0.05) + np.sin(2 * np.pi * 200 * t) * np.exp(-t / 0.04) * 0.4) * v


# ------------------------------------------------------------------ instrumentos
def ep(f, d, vel=1.0):
    """Piano elétrico FM (estilo tine)."""
    t = tt(d)
    idx = (1.6 * np.exp(-t / 0.4) + 0.25) * vel
    car = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine = np.sin(2 * np.pi * f * 13.9 * t) * np.exp(-t / 0.025) * 0.18 * vel
    env = np.minimum(1, t / 0.004) * np.exp(-t / 1.3) * np.clip((d - t) / 0.06, 0, 1)
    return (car + tine) * env


def chord_ep(notes, d, vel=1.0):
    out = np.zeros(int(d * SR) + int((0.006 * len(notes) + 0.01) * SR))
    for k, n in enumerate(notes):
        s = ep(midi(n) * (1 + rng.uniform(-0.0015, 0.0015)), d, vel)
        o = int(k * 0.006 * SR)  # leve "strum"
        out[o:o + len(s)] += s
    return out / len(notes)


def mallet(f, d=0.7, bright=1.0):
    """Marimba FM."""
    t = tt(d)
    idx = 2.2 * bright * np.exp(-t / 0.018)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 4 * t))
    s += 0.25 * np.sin(2 * np.pi * f * 9.8 * t) * np.exp(-t / 0.008)
    return s * np.minimum(1, t / 0.0015) * np.exp(-t / 0.3)


def bell(f, d=1.8):
    t = tt(d)
    idx = 1.4 * np.exp(-t / 0.5)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t))
    s += 0.35 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.4)
    return s * np.minimum(1, t / 0.002) * np.exp(-t / 0.7)


def bass(f, d, vel=1.0):
    """Baixo: sub senoidal + harmônicos saturados (aparece em alto-falante de celular)."""
    t = tt(d)
    sub = np.sin(2 * np.pi * f * t)
    harm = np.tanh(3.0 * np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * 2 * t)))
    s = sub + 0.45 * filt(harm, 1400, 'low')
    env = np.minimum(1, t / 0.005) * np.exp(-t / 0.5) * np.clip((d - t) / 0.03, 0, 1)
    return s * env * vel


def saw_add(f, d, bright=2000, detune=0.0):
    t = tt(d)
    out = np.zeros_like(t)
    kmax = int(min(SR / 2 - 500, bright * 3) / f)
    ph = rng.uniform(0, 2 * np.pi)
    for k in range(1, max(2, kmax)):
        out += np.sin(2 * np.pi * k * f * (1 + detune) * t + ph * k) / k * np.exp(-(k * f) / bright)
    return out


def pad(notes, d, bright=1500, att=0.6):
    t = tt(d)
    s = np.zeros_like(t)
    for n in notes:
        for dt in (-0.005, 0.0, 0.0055):
            s += saw_add(midi(n), d, bright, dt)
    env = np.clip(t / att, 0, 1) ** 2 * np.clip((d - t) / 0.4, 0, 1)
    return s * env / (len(notes) * 3)


# ------------------------------------------------------------------ efeitos
def blip(f, d=0.12):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.035) * np.minimum(1, t / 0.001)


def pop(f=600, d=0.12):
    t = tt(d)
    fr = f * (1 + 1.4 * np.exp(-t / 0.01))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.03) * np.minimum(1, t / 0.001)


def click(d=0.025, f=3000):
    t = tt(d)
    return filt(noise(d), [f * 0.6, f * 1.6], 'band') * np.exp(-t / 0.003)


def whoosh(d=0.4, f0=300, f1=3000, peak=0.6, q=1.2):
    t = tt(d)
    x = sweep(noise(d), f0, f1, q)
    u = t / d
    env = np.where(u < peak, (u / peak) ** 2, ((1 - u) / (1 - peak)) ** 1.5)
    return x * env


def riser(d, f0=180, f1=1400):
    t = tt(d)
    u = t / d
    ns = sweep(noise(d), 300, 9000, 2.0) * u ** 2.4
    fr = f0 * (f1 / f0) ** u
    tone = np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(fr * 1.5) / SR)
    return ns * 0.8 + tone * u ** 2.6 * 0.16


def impact(d=2.0, big=1.0):
    t = tt(d)
    f = 32 + 80 * np.exp(-t / 0.07)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.8 * big))
    crash = filt(noise(d), 7000, 'low') * np.exp(-t / 0.45) * 0.45
    crash += filt(noise(d), 5000, 'high') * np.exp(-t / 0.5) * 0.12
    return np.tanh(1.4 * (sub + crash + kick(d, 1.2)[: len(t)] * 0.5))


def thud(d=0.35):
    t = tt(d)
    return np.sin(2 * np.pi * 80 * t) * np.exp(-t / 0.08) + filt(noise(d), 1500, 'low') * np.exp(-t / 0.03) * 0.9


def clink(f=3400, d=0.35):
    t = tt(d)
    s = 0
    for m, a, dec in ((1, 1, 0.14), (1.51, 0.6, 0.1), (2.13, 0.45, 0.07), (2.9, 0.3, 0.05)):
        s = s + a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    return s + filt(noise(d), 5000, 'high') * np.exp(-t / 0.003) * 0.5


def zip_up(d=0.4, f0=400, f1=2400):
    """Pulso viajando na linha: tom ascendente com trêmulo."""
    t = tt(d)
    u = t / d
    fr = f0 * (f1 / f0) ** u
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 38 * t))
    return s * np.sin(np.pi * u) ** 0.7 * 0.6


def paper(d=0.3):
    t = tt(d)
    return filt(noise(d), [1500, 7000], 'band') * np.exp(-t / 0.06) * (0.6 + 0.4 * np.sin(2 * np.pi * 60 * t))


def roll_ticks(buf, t0, t1, g=0.12, f=3200, pan=0.0):
    """Cliques que desaceleram (dígitos rolando / contador)."""
    t = t0
    while t < t1:
        u = (t - t0) / (t1 - t0)
        place(buf, click(0.02, f * (1 + 0.15 * rng.uniform(-1, 1))), t, g * (1 - 0.5 * u), pan)
        t += 0.028 + 0.11 * u ** 2


def typing(buf, t0, n, step=0.035, g=0.06, pan=-0.2):
    for i in range(n):
        place(buf, click(0.015, 4200 + 600 * rng.uniform(-1, 1)), t0 + i * step, g, pan)


# ------------------------------------------------------------------ arranjo
music = stereo()
drums = stereo()
sfx = stereo()
send = stereo()

# acordes (piano elétrico) e baixo — 1 compasso = 2 s
FSm9 = [57, 61, 64, 68]
Dmaj9 = [54, 57, 61, 64]
Amaj9 = [56, 59, 61, 64]
E69 = [56, 59, 61, 66]
ROOT_ = {'F#': 42, 'D': 38, 'A': 45, 'E': 40}
PROG = [(4.0, FSm9, 'F#'), (6.0, Dmaj9, 'D'), (8.0, Amaj9, 'A'), (10.0, E69, 'E'),
        (12.0, FSm9, 'F#'), (14.0, Dmaj9, 'D'), (16.0, Amaj9, 'A'), (18.0, E69, 'E'),
        (20.0, FSm9, 'F#'), (22.0, Dmaj9, 'D')]
GROOVE_END = 22.6          # início da volta do anel (quebra)
OUTRO = 24.5               # assinatura (resolve em Lá maior)
OUTRO_PROG = [(24.5, Amaj9, 'A'), (26.5, Dmaj9, 'D')]

# --- intro: pad em F#m9 (2.0 → 4.0) e em Ré na quebra
place(music, pad([42, 57, 61, 64, 68], 2.3, 1100, att=0.9), 2.0, 0.5)
place(send, pad([57, 61, 64, 68], 2.3, 1100, att=0.9), 2.0, 0.25)
place(music, pad([38, 54, 57, 61, 64], 1.15, 1500, 0.5), 22.6, 0.5)
place(music, pad([40, 56, 59, 61, 66], 0.85, 1900, 0.3), 23.65, 0.55)
place(send, pad([54, 57, 61, 64, 66], 1.9, 1600, 0.5), 22.6, 0.3)


def bar_events(t0, chord, root, last=False, sparse=False):
    """Um compasso de groove: piano elétrico + baixo sincopado."""
    place(music, chord_ep(chord, 1.7, 0.85), t0, 0.5, -0.15)
    place(send, chord_ep(chord, 1.7, 0.85), t0, 0.22)
    place(music, chord_ep([n + 12 for n in chord[1:]], 0.35, 0.6), t0 + 11 * S16, 0.22, 0.3)
    f = midi(ROOT_[root])
    pattern = [(0, 0.34, 1.0, 1), (3, 0.12, 0.7, 1), (6, 0.1, 0.55, 2), (10, 0.3, 0.9, 1), (13, 0.12, 0.6, 1.5)]
    if sparse:
        pattern = pattern[:1]
    for st, d, v, mult in pattern:
        place(music, bass(f * mult, d, v), t0 + st * S16, 0.62)


for t0, ch, r in PROG:
    end = min(t0 + 2.0, GROOVE_END)
    if t0 < GROOVE_END:
        bar_events(t0, ch, r)
for t0, ch, r in OUTRO_PROG:
    bar_events(t0, ch, r)
# "botão" final em Lá
place(music, chord_ep([45, 57, 61, 64, 68, 73], 1.2, 1.0), 28.5, 0.6)
place(music, bass(midi(33) * 2, 0.4, 1.0), 28.5, 0.7)

# --- bateria (2-step: bumbo em 1 e no "e" do 3, ghost no "a" do 2)
KICKS = [0, 7, 10]
kicks = []


def groove(t0, t1, intensity=1.0, open_hats=True):
    t = t0
    while t < t1 - 1e-6:
        for s in range(16):
            ts = t + s * S16
            if ts >= t1:
                break
            swing = 0.028 if s % 2 == 1 else 0.0
            if s in KICKS:
                place(drums, kick(), ts, 0.9 if s == 0 else 0.7)
                kicks.append(ts)
            if s in (4, 12):
                place(drums, clap(), ts, 0.55 * intensity)
                place(send, clap(), ts, 0.22)
            if s in (3, 9, 15):
                place(drums, rim(), ts + swing, 0.09 * intensity, 0.35)
            hv = 0.13 if s % 2 == 0 else 0.085
            if s % 4 == 2 and open_hats:
                place(drums, hat(open_=True), ts, 0.1 * intensity, 0.25)
            else:
                place(drums, hat(), ts + swing, hv * intensity, -0.25 if s % 2 else 0.2)
        t += 2.0


groove(4.0, GROOVE_END, 1.0)
groove(OUTRO, 28.5, 1.0)
place(drums, kick(0.6, 1.2), 28.5, 1.0)
kicks.append(28.5)

# relógio (tique-taque) no gancho e nas etapas com horário
for a, b, g in ((0.0, 4.0, 0.07), (11.0, 14.0, 0.05), (17.0, 19.5, 0.05)):
    t, k = a, 0
    while t < b - 1e-6:
        place(drums, tick(2700 if k % 2 == 0 else 2000), t, g * (1.5 if k % 4 == 0 else 1.0), 0.4 if k % 2 else -0.4)
        t += BEAT / 2
        k += 1
# subida para o drop (2.0 → 4.0): bumbo abafado + chimbal em 16ªs
for k, tb in enumerate([2.0, 2.5, 3.0, 3.5, 3.75]):
    place(drums, filt(kick(), 220, 'low', 4), tb, 0.55 + 0.1 * k)
t = 3.0
while t < 4.0 - 1e-6:
    place(drums, hat(), t, 0.05 + 0.1 * (t - 3.0), 0.2)
    t += S16
for tb in (3.5, 3.75, 3.875):
    place(drums, clap(), tb, 0.28)
    place(send, clap(), tb, 0.15)

# chimbal acelerando na quebra + virada
t = GROOVE_END
while t < OUTRO - 1e-6:
    u = (t - GROOVE_END) / (OUTRO - GROOVE_END)
    place(drums, hat(), t, 0.06 + 0.12 * u, 0.2)
    t += S16
t, k = 23.5, 0
while t < OUTRO - 0.02:
    u = (t - 23.5) / 1.0
    place(drums, snare_roll_hit(0.2 + 0.7 * u), t, 0.42, 0.15 * (1 if k % 2 else -1))
    t += S16 if t < 24.0 else S16 / 2
    k += 1

# arpejo de marimba (8ªs) a partir da 03 — o ciclo ganhando velocidade
ARP = [0, 2, 1, 3, 2, 1, 3, 2]
for t0, ch, r in PROG:
    if t0 < 10.0:
        continue
    notes = [n + 12 for n in ch]
    for i in range(16):
        ts = t0 + i * BEAT / 2
        if ts >= GROOVE_END:
            break
        s = mallet(midi(notes[ARP[i % 8]]), 0.4)
        pan = 0.45 if i % 2 else -0.45
        place(music, s, ts + (0.02 if i % 2 else 0), 0.075, pan)
        place(send, s, ts, 0.04, pan)

# side-chain (bombeado) na música pelos bumbos
duck = np.ones(N)
for t in kicks:
    i = int(t * SR)
    L = int(0.35 * SR)
    j = min(N, i + L)
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.55 * np.exp(-np.arange(j - i) / SR / 0.08))
music *= duck

# ------------------------------------------------------------------ efeitos sincronizados
# ABERTURA ------------------------------------------------------------
place(sfx, pop(520), 0.0, 0.5)
place(sfx, impact(1.2, 0.5), 0.0, 0.32)
FLIPS = [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5]
FLIP_NOTES = [66, 69, 71, 73, 76, 78, 81]   # F#m pentatônica subindo (F#4 → A5)
for i, (tf, n) in enumerate(zip(FLIPS, FLIP_NOTES)):
    place(sfx, mallet(midi(n), 0.6, 1.2), tf, 0.34, (i - 3) * 0.12)
    place(send, mallet(midi(n), 0.6), tf, 0.18)
    place(sfx, click(0.02, 3600), tf, 0.25)
    if i:
        place(sfx, whoosh(0.12, 1500, 5000, 0.4), tf - 0.04, 0.08)
place(sfx, bell(midi(81), 1.4), 1.5, 0.12)           # volta ao LIVRE
place(sfx, whoosh(0.4, 4000, 400, 0.3), 2.0, 0.22)   # pílula vira ponto
place(sfx, pop(380), 2.33, 0.3)
place(sfx, zip_up(0.3, 500, 1500), 2.3, 0.18)
# anel: rastro que gira (pan circular) + nós
d = 1.2
trace = whoosh(d, 600, 4200, 0.5, 2.0)
pan_curve = np.sin(np.linspace(0, 2 * np.pi, len(trace)))
place_pan(sfx, trace, 2.58, 0.4, pan_curve)
for k in range(6):
    tk = 2.6 + 1.15 * k / 6 + (0 if k == 0 else 0.02)
    place(sfx, blip(midi(78 + [0, 3, 5, 7, 10, 12][k]), 0.12), tk, 0.22, float(np.sin(2 * np.pi * k / 6)) * 0.7)
place(sfx, riser(1.4, 160, 1300), 2.6, 0.42)
place(sfx, whoosh(0.3, 3000, 600, 0.3), 3.7, 0.12)
# DROP 4.0: logo
place(sfx, impact(2.2, 1.1), 4.0, 0.62)
place(send, impact(2.2, 1.1), 4.0, 0.2)
for k, n in enumerate([69, 73, 76, 80]):
    place(sfx, bell(midi(n + 12), 1.6), 4.0 + k * 0.015, 0.07, (k - 1.5) * 0.4)
for k in range(6):   # pulsos chegando a cada etapa
    place(sfx, blip(midi(85 + [0, 3, 5, 8, 10, 12][k]), 0.1), 4.75 + k * 0.04, 0.12, float(np.sin(2 * np.pi * k / 6)) * 0.6)
place(sfx, pop(700), 4.8, 0.3)
# mergulho no nó 01
place(sfx, whoosh(0.65, 150, 7000, 0.92, 1.6), 4.98, 0.55)
place(sfx, thud(), 5.6, 0.2)

# "ding" de cada etapa: sobe um grau a cada estação (barra de progresso sonora)
STATION_T = [5.3, 8.5, 11.0, 14.0, 17.0, 19.5]
STATION_N = [73, 76, 78, 80, 81, 83]   # C#5 E5 F#5 G#5 A5 B5
STATION_N2 = [80, 83, 85, 86, 88, 90]  # quinta diatônica (Lá maior) acima de cada uma
for k, (ts, n, n2) in enumerate(zip(STATION_T, STATION_N, STATION_N2)):
    place(sfx, mallet(midi(n), 0.8, 1.3), ts + 0.12, 0.28, -0.1)
    place(sfx, mallet(midi(n2), 0.8, 1.0), ts + 0.24, 0.2, 0.1)
    place(send, mallet(midi(n2), 0.8), ts + 0.24, 0.12)
    if k:  # whip
        place(sfx, whoosh(0.42, 250, 6000, 0.5, 1.0), ts - 0.22, 0.48, 0.3)

# 01 RESERVA (base 5.3) ------------------------------------------------
B = 5.3
place(sfx, paper(0.18), B + 0.75, 0.12)                       # marca-texto
for k, tb in enumerate([0.5, 0.58, 0.66, 0.74]):
    place(sfx, whoosh(0.22, 1200, 4000, 0.3), B + tb, 0.1, 0.5)
    place(sfx, pop(620 + k * 90), B + tb + 0.2, 0.16, 0.3)
place(sfx, whoosh(0.4, 400, 3000, 0.4), B + 1.05, 0.28, 0.5)   # pré-reserva chega
place(sfx, pop(440), B + 1.45, 0.2)
place(sfx, click(0.03, 2500), B + 1.6, 0.25)                   # SEMANA
place(sfx, thud(), B + 1.85, 0.55)                              # confirmada!
place(sfx, click(0.03, 2200), B + 1.85, 0.4)
place(sfx, bell(midi(85), 1.2), B + 1.9, 0.14)
place(sfx, bell(midi(92), 1.2), B + 1.98, 0.1)

# 02 SINAL (base 8.5) -------------------------------------------------
B = 8.5
place(sfx, whoosh(0.35, 3000, 500, 0.7), B + 0.3, 0.2)
place(sfx, clink(3000), B + 0.62, 0.4, -0.4)                    # moeda pousa
place(sfx, clink(3600), B + 0.7, 0.18, -0.4)
roll_ticks(sfx, B + 0.5, B + 1.0, 0.1, 3400, -0.2)
place(sfx, zip_up(0.55, 300, 2200), B + 0.95, 0.35, 0.1)       # pulso na linha
place(sfx, clink(4200, 0.5), B + 1.5, 0.3, 0.4)                 # entrou no caixa
place(sfx, bell(midi(83), 1.3), B + 1.5, 0.16, 0.4)
place(sfx, bell(midi(88), 1.3), B + 1.58, 0.13, 0.4)
place(sfx, pop(760), B + 1.58, 0.25, 0.4)
typing(sfx, B + 1.6, 16)

# 03 CHECK-IN (base 11.0) ---------------------------------------------
B = 11.0
roll_ticks(sfx, B + 0.3, B + 1.05, 0.12, 2800)
place(sfx, pop(500), B + 0.6, 0.25, 0.5)                        # chave
place(sfx, pop(640), B + 0.75, 0.25, -0.3)                      # CHECK-IN
place(sfx, paper(0.18), B + 0.8, 0.1)
place(sfx, click(0.03, 1800), B + 1.18, 0.5, 0.5)               # giro da chave
place(sfx, click(0.04, 1200), B + 1.36, 0.6, 0.5)
place(sfx, thud(0.25), B + 1.38, 0.25, 0.5)
place(sfx, bell(midi(81), 1.2), B + 1.42, 0.15)                 # HOSPEDADA
place(sfx, pop(420), B + 1.05, 0.25, -0.5)
for i in range(4):
    place(sfx, pop(700 + i * 110), B + 1.15 + i * 0.07, 0.18, (i - 1.5) * 0.3)
for i in range(4):                                             # lupa passa nos campos
    place(sfx, blip(midi(85 + [0, 3, 5, 7][i])), B + 1.8 + i * 0.18, 0.16, (i - 1.5) * 0.3)
typing(sfx, B + 1.5, 20)

# 04 COMANDA (base 14.0) ----------------------------------------------
B = 14.0
place(sfx, paper(0.35), B + 0.25, 0.25, 0.3)
for i in range(4):
    t0 = B + 0.75 + i * 0.36
    place(sfx, pop(520 + i * 80), t0, 0.28, -0.5)
    place(sfx, whoosh(0.22, 800, 3500, 0.6), t0 + 0.12, 0.12, 0.0)
    place(sfx, blip(midi(81 + [0, 2, 4, 7][i]), 0.15), t0 + 0.32, 0.2, 0.4)
    place(sfx, click(0.03, 2600), t0 + 0.32, 0.25, 0.4)
    typing(sfx, t0 + 0.32, 8, 0.03, 0.04, 0.4)
place(sfx, bell(midi(88), 1.0), B + 2.2, 0.08, 0.4)
typing(sfx, B + 1.4, 18)

# 05 CHECK-OUT (base 17.0) --------------------------------------------
B = 17.0
roll_ticks(sfx, B + 0.25, B + 0.95, 0.12, 2800)
place(sfx, pop(460), B + 0.48, 0.25, 0.5)                      # mala
place(sfx, pop(620), B + 0.55, 0.25, -0.4)                     # CHECK-OUT
place(sfx, pop(560), B + 0.65, 0.22, -0.5)                     # comanda
place(sfx, whoosh(0.3, 3000, 300, 0.5), B + 1.05, 0.25, -0.4)  # dobra
place(sfx, zip_up(0.4, 400, 2200), B + 1.18, 0.3, 0.0)
place(sfx, clink(4000, 0.5), B + 1.55, 0.3, 0.4)
place(sfx, bell(midi(85), 1.3), B + 1.55, 0.15, 0.4)
place(sfx, bell(midi(90), 1.3), B + 1.63, 0.12, 0.4)
place(sfx, pop(760), B + 1.62, 0.22, 0.4)
typing(sfx, B + 1.3, 18)

# 06 CAIXA (base 19.5) ------------------------------------------------
B = 19.5
for i, tr in enumerate([0.35, 0.5, 0.65]):
    place(sfx, whoosh(0.25, 800, 3000, 0.5), B + tr, 0.12, -0.4)
    roll_ticks(sfx, B + tr + 0.05, B + tr + 0.55, 0.06, 3000 + i * 300, 0.3)
for i in range(3):
    place(sfx, pop(640 + i * 90), B + 0.8 + i * 0.07, 0.2, (i - 1) * 0.4)
place(sfx, whoosh(0.35, 500, 4000, 0.8), B + 1.12, 0.2, -0.3)   # linha do fechamento
place(sfx, impact(1.6, 0.8), B + 1.45, 0.45)                     # R$ 0,00
place(send, impact(1.6, 0.8), B + 1.45, 0.15)
for k, n in enumerate([69, 73, 76, 81]):                         # confere ✓
    place(sfx, bell(midi(n + 12), 1.6), B + 1.7 + k * 0.03, 0.09, (k - 1.5) * 0.3)
place(sfx, pop(820), B + 1.7, 0.25)
typing(sfx, B + 1.75, 18)

# VOLTA DO ANEL (base 22.6) ---------------------------------------------
B = 22.6
place(sfx, whoosh(0.6, 7000, 200, 0.15, 1.6), 22.3, 0.45)        # zoom para trás
place(sfx, zip_up(0.6, 500, 1800), B + 0.3, 0.3)                 # ponto fecha a volta
place(sfx, bell(midi(81), 1.6), B + 0.85, 0.2)                   # LIVRE de novo
place(sfx, bell(midi(85), 1.6), B + 0.9, 0.15)
place(sfx, pop(660), B + 0.84, 0.3)
place(sfx, riser(1.9, 200, 1700), B, 0.5)
rev = whoosh(0.6, 200, 5000, 0.95, 1.4)                         # contração na logo
place(sfx, rev, B + 1.1, 0.4)

# ASSINATURA (24.5) -----------------------------------------------------
place(sfx, impact(2.6, 1.3), OUTRO, 0.7)
place(send, impact(2.6, 1.3), OUTRO, 0.22)
for k, n in enumerate([57, 61, 64, 68, 69, 73, 76, 80]):
    place(sfx, bell(midi(n + 12), 2.2), OUTRO + k * 0.03, 0.06, (k - 3.5) * 0.2)
    place(send, bell(midi(n + 12), 2.2), OUTRO + k * 0.03, 0.04)
place(music, pad([45, 57, 61, 64, 68, 71], 4.5, 2600, 0.05), OUTRO, 0.45)
place(send, pad([57, 61, 64, 68, 71], 4.5, 2600, 0.05), OUTRO, 0.25)
place(sfx, pop(520), 25.2, 0.3)                                   # FAZLO
place(sfx, pop(640), 25.28, 0.3)                                  # Hospeda
place(sfx, whoosh(0.3, 900, 3000, 0.5), 25.4, 0.1)
place(sfx, pop(760), 25.95, 0.35)                                 # CTA
place(sfx, mallet(midi(81), 1.0, 1.3), 25.97, 0.25)
place(sfx, mallet(midi(88), 1.0, 1.0), 26.09, 0.2)
place(send, mallet(midi(88), 1.0), 26.09, 0.12)
place(sfx, bell(midi(93), 1.2), 28.5, 0.1)


# ------------------------------------------------------------------ reverb + master
def ir(d=2.2, seed=0):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = r.standard_normal(len(t)) * np.exp(-t / 0.55)
    return filt(x, 6000, 'low') * 0.05


send += sfx * 0.12 + music * 0.1
wet = np.stack([fftconvolve(send[0], ir(seed=3))[:N], fftconvolve(send[1], ir(seed=4))[:N]])

mix = music * 0.7 + drums * 0.72 + sfx * 0.9 + wet * 0.85
t = np.arange(N) / SR
mix *= np.clip((DUR - t) / 0.45, 0, 1)
mix *= np.clip(t / 0.003, 0, 1)
mix = filt(mix, 30, 'high')
# leve compressão de barramento (soft-knee) antes da normalização
body = np.percentile(np.abs(mix), 99.8)
mix = np.tanh(mix / body * 0.9) * 0.8

os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
raw = os.path.join(ROOT, 'audio', '.trilha-raw.wav')
out = os.path.join(ROOT, 'audio', 'trilha.wav')
wavfile.write(raw, SR, (mix.T * 32767).astype(np.int16))

# normalização de loudness para redes sociais: -14 LUFS integrado, pico real -1 dBTP (2 passadas)
meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'],
                      capture_output=True, text=True).stderr
js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
      f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-c:a', 'pcm_s16le', out], check=True)
os.remove(raw)
print('ok ->', out, '| entrada', js['input_i'], 'LUFS')
