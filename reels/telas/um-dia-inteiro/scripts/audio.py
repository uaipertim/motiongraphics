#!/usr/bin/env python3
"""
Trilha + efeitos do reel "Um dia inteiro da pousada" — 100% sintetizados (numpy/scipy), sem voz.

Mesma linguagem da v2 ("Toda estadia é um ciclo"): groove quebrado (2-step) a 120 BPM, piano elétrico FM,
marimba FM e baixo com harmônicos, em Fá♯ menor que resolve em Lá maior no fecho. Aqui com mais respiro:
chimbal mais aberto, compassos de pausa nas viradas e uma quebra no cadeado do check-out.

Os efeitos seguem audio/eventos.json, exportado da própria animação (node scripts/render.cjs dados):
toque, troca de status, contagem de valores, cadeado abrindo, gaveta do caixa, logo.

    python3 scripts/audio.py      -> audio/trilha.wav (48 kHz, estéreo, −14 LUFS, pico ≤ −1,5 dBTP)

Os instrumentos (kick, clap, ep, mallet, bass, whoosh…) são os da v2 (v2/scripts/audio.py).
"""
import json
import os
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVT = json.load(open(os.path.join(ROOT, 'audio', 'eventos.json')))
SR = 48000
DUR = float(EVT['duracao'])
N = int(SR * DUR)
BEAT = 0.5
S16 = BEAT / 4
rng = np.random.default_rng(1610)

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


def sineta(f=1568.0, d=2.4):
    """Sineta de recepção (parciais inarmônicos) — a assinatura sonora da série na entrada da marca."""
    t = tt(d)
    s = 0
    for m, a, dec in ((1, 1, 1.1), (2.76, 0.5, 0.6), (5.40, 0.28, 0.35), (8.93, 0.14, 0.2)):
        s = s + a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    return s * np.minimum(1, t / 0.001)


def drawer(d=0.6):
    """Gaveta do caixa: trilho deslizando + batida + moedas."""
    t = tt(d)
    slide = sweep(noise(d), 500, 2200, 2.5) * np.clip(t / 0.05, 0, 1) * np.clip((0.32 - t) / 0.08, 0, 1)
    return slide * 0.7


def lock_click(open_=False):
    t = tt(0.3)
    s = np.zeros(len(t)); c = click(0.03, 2400 if open_ else 1700) * 1.2; s[:len(c)] += c
    s = s + filt(noise(0.3), [600, 2500], 'band') * np.exp(-t / 0.012) * 0.5
    s += np.sin(2 * np.pi * (380 if open_ else 260) * t) * np.exp(-t / 0.04) * 0.5
    return s


# ------------------------------------------------------------------ arranjo
music = stereo()
drums = stereo()
sfx = stereo()
send = stereo()
E = EVT['E']

FSm9 = [57, 61, 64, 68]
Dmaj9 = [54, 57, 61, 64]
Amaj9 = [56, 59, 61, 64]
E69 = [56, 59, 61, 66]
ROOT_ = {'F#': 42, 'D': 38, 'A': 45, 'E': 40}
CYCLE = [(FSm9, 'F#'), (Dmaj9, 'D'), (Amaj9, 'A'), (E69, 'E')]
G0 = 0.5                       # grade de compassos: 0,5 + 2k (a etapa 1 entra em 4,5 s, no 1 do compasso)
OUTRO = E['f']                 # 55,0: o anel e a marca (resolve em Lá maior)


def bar_events(t0, chord, root, sparse=False, vel=0.85):
    place(music, chord_ep(chord, 1.7, vel), t0, 0.5, -0.15)
    place(send, chord_ep(chord, 1.7, vel), t0, 0.22)
    if not sparse:
        place(music, chord_ep([n + 12 for n in chord[1:]], 0.35, 0.6), t0 + 11 * S16, 0.2, 0.3)
    f = midi(ROOT_[root])
    pattern = [(0, 0.34, 1.0, 1), (3, 0.12, 0.7, 1), (6, 0.1, 0.55, 2), (10, 0.3, 0.9, 1), (13, 0.12, 0.6, 1.5)]
    if sparse:
        pattern = [pattern[0], pattern[3]]
    for st, d, v, mult in pattern:
        place(music, bass(f * mult, d, v), t0 + st * S16, 0.6)


KICKS = [0, 7, 10]
kicks = []


def groove_bar(ts0, intensity=1.0, open_hats=True, claps=True, kicks_on=True, t_end=None):
    for s in range(16):
        ts = ts0 + s * S16
        if t_end is not None and ts >= t_end - 1e-6:
            break
        swing = 0.028 if s % 2 == 1 else 0.0
        if kicks_on and s in KICKS:
            place(drums, kick(), ts, 0.88 if s == 0 else 0.68)
            kicks.append(ts)
        if claps and s in (4, 12):
            place(drums, clap(), ts, 0.5 * intensity)
            place(send, clap(), ts, 0.22)
        if s in (3, 9, 15):
            place(drums, rim(), ts + swing, 0.08 * intensity, 0.35)
        if s % 2 == 0:  # chimbal em colcheias (mais respiro que as 16ªs da v2)
            if s % 8 == 4 and open_hats:
                place(drums, hat(open_=True), ts, 0.09 * intensity, 0.25)
            else:
                place(drums, hat(), ts, 0.12 * intensity, 0.2 if s % 4 else -0.2)
        elif intensity > 0.9 and s in (7, 15):
            place(drums, hat(), ts + swing, 0.06, -0.25)


# --- abertura (0 → 4,5): o dia começa — pad, piano e o relógio
place(music, pad([42, 57, 61, 64, 68], 4.6, 1000, att=1.2), 0.0, 0.42)
place(send, pad([57, 61, 64, 68], 4.6, 1000, att=1.2), 0.0, 0.22)
place(music, chord_ep(FSm9, 1.9, 0.7), 0.5, 0.42, -0.1)
place(music, chord_ep(Dmaj9, 1.9, 0.65), 2.5, 0.38, 0.1)
place(music, bass(midi(42), 0.6, 0.7), 0.5, 0.45)
place(music, bass(midi(38), 0.6, 0.7), 2.5, 0.45)
t, k = 0.0, 0
while t < 4.5 - 1e-6:
    place(drums, tick(2700 if k % 2 == 0 else 2000), t, 0.055 * (1.4 if k % 4 == 0 else 1.0), 0.4 if k % 2 else -0.4)
    t += BEAT / 2
    k += 1
for k2, tb in enumerate([2.5, 3.0, 3.5, 4.0, 4.25]):
    place(drums, filt(kick(), 220, 'low', 4), tb, 0.45 + 0.08 * k2)
place(sfx, riser(1.3, 200, 1400), 3.2, 0.3)

# --- groove das etapas (4,5 → 55,0), com respiro
bar = 0
t0 = 4.5
BREAKS = []                                   # compassos sem bumbo/palma: respiro
lock_a, lock_b = None, None
for e in EVT['eventos']:
    if e['tipo'] == 'cadeado':
        lock_a = e['t']
    if e['tipo'] == 'cadeado_abre':
        lock_b = e['t']
while t0 < OUTRO - 1e-6:
    ch, r = CYCLE[bar % 4]
    sparse = lock_a is not None and lock_a - 0.6 <= t0 < lock_b - 0.2
    bar_events(t0, ch, r, sparse=sparse, vel=0.8 if sparse else 0.85)
    t_end = min(t0 + 2.0, OUTRO)
    # respiro: a cada 4 compassos, o último fica só com chimbal e aro
    breath = (bar % 4 == 3) and not sparse
    if sparse:
        groove_bar(t0, 0.7, open_hats=False, claps=False, kicks_on=False, t_end=t_end)
    elif breath:
        groove_bar(t0, 0.8, open_hats=True, claps=True, kicks_on=(bar % 8 != 7), t_end=t_end)
    else:
        groove_bar(t0, 1.0, t_end=t_end)
    # arpejo de marimba a partir da comanda
    if t0 >= E['m'] - 0.01 and not sparse:
        notes = [n + 12 for n in ch]
        ARP = [0, 2, 1, 3, 2, 1, 3, 2]
        for i in range(16):
            ts = t0 + i * BEAT / 2
            if ts >= t_end:
                break
            s = mallet(midi(notes[ARP[i % 8]]), 0.4)
            place(music, s, ts + (0.02 if i % 2 else 0), 0.06, 0.45 if i % 2 else -0.45)
            place(send, s, ts, 0.035)
    t0 += 2.0
    bar += 1

# --- fecho (55 → 60): resolve em Lá maior
place(music, pad([45, 57, 61, 64, 68, 71], 5.0, 2400, 0.05), OUTRO, 0.42)
place(send, pad([57, 61, 64, 68, 71], 5.0, 2400, 0.05), OUTRO, 0.24)
bar_events(OUTRO, Amaj9, 'A')
groove_bar(OUTRO, 0.9, t_end=OUTRO + 2.0)
bar_events(OUTRO + 2.0, Dmaj9, 'D', sparse=True)
groove_bar(OUTRO + 2.0, 0.7, open_hats=False, claps=True, kicks_on=True, t_end=OUTRO + 3.5)
place(music, chord_ep([45, 57, 61, 64, 68, 73], 1.4, 1.0), OUTRO + 3.5, 0.6)   # "botão" final em Lá
place(music, bass(midi(33) * 2, 0.5, 1.0), OUTRO + 3.5, 0.7)
place(drums, kick(0.6, 1.2), OUTRO + 3.5, 0.95)
kicks.append(OUTRO + 3.5)

# side-chain na música pelos bumbos
duck = np.ones(N)
for t in kicks:
    i = int(t * SR)
    j = min(N, i + int(0.35 * SR))
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.5 * np.exp(-np.arange(j - i) / SR / 0.08))
music *= duck

# ------------------------------------------------------------------ efeitos (da animação)
STAGE_N = [73, 76, 78, 80, 81, 83]   # "ding" de cada etapa sobe um grau (C#5 E5 F#5 G#5 A5 B5)
STAGE_N2 = [80, 83, 85, 86, 88, 90]
for k, key in enumerate(['r', 's', 'c', 'm', 'o', 'x']):
    ts = E[key]
    place(sfx, mallet(midi(STAGE_N[k]), 0.8, 1.3), ts + 0.2, 0.26, -0.1)
    place(sfx, mallet(midi(STAGE_N2[k]), 0.8, 1.0), ts + 0.32, 0.18, 0.1)
    place(send, mallet(midi(STAGE_N2[k]), 0.8), ts + 0.32, 0.1)

PENTA = [66, 69, 71, 73, 76, 78, 81, 83, 85, 88]
nbar = 0
for e in EVT['eventos']:
    t, tp = e['t'], e['tipo']
    if tp == 'whoosh':
        place(sfx, whoosh(0.5, 200, 4000, 0.7), t - 0.1, 0.3)
    elif tp == 'pop':
        place(sfx, pop(560 + 60 * rng.integers(0, 4)), t + 0.35, 0.22, rng.uniform(-0.3, 0.3))
        place(sfx, whoosh(0.25, 900, 3500, 0.7), t, 0.08)
    elif tp == 'barra':
        n = PENTA[min(len(PENTA) - 1, e['i'] // 2)]
        place(sfx, pop(500 + 25 * e['i'], 0.09), t + 0.12, 0.12, ((e['i'] % 5) - 2) * 0.2)
        if e['i'] % 2 == 0:
            place(sfx, mallet(midi(n + 12), 0.4, 0.8), t + 0.12, 0.06, ((e['i'] % 5) - 2) * 0.2)
    elif tp == 'toque':
        place(sfx, click(0.025, 2600), t, 0.42)
        place(sfx, thud(0.18), t, 0.16)
        place(sfx, blip(midi(88), 0.18), t + 0.02, 0.1)
        place(sfx, whoosh(0.35, 1200, 5000, 0.2, 2.0), t + 0.02, 0.08)
    elif tp == 'conta':
        roll_ticks(sfx, t, t + e['dur'], 0.07, 3300, rng.uniform(-0.25, 0.25))
    elif tp == 'conta_fim':
        place(sfx, blip(midi(93), 0.08), t, 0.06, 0.2)
    elif tp == 'status':
        place(sfx, whoosh(0.3, 700, 4000, 0.8), t - 0.25, 0.14)
        place(sfx, mallet(midi(81), 0.9, 1.3), t, 0.28, -0.1)
        place(sfx, mallet(midi(88), 0.9, 1.1), t + 0.09, 0.24, 0.1)
        place(sfx, bell(midi(93), 1.2), t + 0.09, 0.08)
        place(send, mallet(midi(88), 0.9), t + 0.09, 0.14)
        place(sfx, pop(720), t, 0.2)
    elif tp == 'impacto':
        place(sfx, whoosh(0.4, 3000, 300, 0.85), t - 0.36, 0.25)
        place(sfx, thud(0.4), t, 0.55)
        place(sfx, clink(2600, 0.4), t, 0.16)
        place(sfx, bell(midi(85), 1.2), t + 0.05, 0.1)
    elif tp == 'alerta':
        place(sfx, mallet(midi(76), 0.7, 1.2), t, 0.26)
        place(sfx, mallet(midi(72), 0.9, 1.2), t + 0.16, 0.26)
        place(sfx, thud(0.3), t, 0.3)
    elif tp == 'linha':
        place(sfx, zip_up(e['dur'] * 0.9, 350, 2400), t, 0.24, 0.0)
        place(sfx, whoosh(0.5, 250, 6000, 0.55, 1.0), t + 0.2, 0.36, 0.3)
    elif tp == 'item':
        place(sfx, whoosh(0.42, 600, 3800, 0.85), t, 0.16, 0.5)
    elif tp == 'recibo':
        place(sfx, paper(0.35), t, 0.2, 0.2)
        place(sfx, pop(660), t + 0.35, 0.18)
    elif tp == 'cadeado':
        place(sfx, lock_click(False), t, 0.5)
        place(sfx, clink(1900, 0.3), t, 0.12)
    elif tp == 'pago':
        place(sfx, clink(4000, 0.5), t, 0.26, 0.3)
        place(sfx, bell(midi(85), 1.2), t, 0.12, 0.3)
        place(sfx, bell(midi(90), 1.2), t + 0.08, 0.1, 0.3)
    elif tp == 'cadeado_abre':
        place(sfx, lock_click(True), t, 0.55)
        place(sfx, zip_up(0.3, 600, 2600), t + 0.02, 0.18)
        place(sfx, impact(1.4, 0.7), t + 0.05, 0.32)
        place(send, impact(1.4, 0.7), t + 0.05, 0.1)
        for k, n in enumerate([69, 73, 76, 81]):
            place(sfx, bell(midi(n + 12), 1.4), t + 0.08 + k * 0.03, 0.08, (k - 1.5) * 0.3)
    elif tp == 'moeda':
        place(sfx, clink(3200 + 300 * e['i'], 0.4), t, 0.24, (e['i'] - 1.5) * 0.25)
        place(sfx, thud(0.2), t, 0.12)
    elif tp == 'gaveta':
        place(sfx, drawer(0.6), t, 0.45, -0.2)
        place(sfx, thud(0.3), t + 0.3, 0.42, -0.2)
        for k in range(5):
            place(sfx, clink(3000 + 500 * rng.uniform(-1, 1), 0.25), t + 0.32 + k * 0.035, 0.08, rng.uniform(-0.5, 0.5))
        place(sfx, bell(midi(88), 1.2), t + 0.34, 0.12)
    elif tp == 'falta':
        place(sfx, mallet(midi(78), 0.8, 1.1), t, 0.24)
        place(sfx, mallet(midi(74), 1.0, 1.1), t + 0.15, 0.24)
    elif tp == 'anel':
        d = 1.1
        trace = whoosh(d, 600, 4200, 0.5, 2.0)
        place_pan(sfx, trace, t, 0.36, np.sin(np.linspace(0, 2 * np.pi, len(trace))))
        place(sfx, riser(1.1, 200, 1500), t, 0.3)
    elif tp == 'no':
        place(sfx, blip(midi(78 + [0, 3, 5, 7, 10, 12][e['i']]), 0.14), t, 0.2, float(np.sin(2 * np.pi * e['i'] / 6)) * 0.7)
    elif tp == 'logo':
        place(sfx, impact(2.4, 1.2), t, 0.6)
        place(send, impact(2.4, 1.2), t, 0.2)
        place(sfx, sineta(midi(81), 2.6), t + 0.02, 0.22)
        place(send, sineta(midi(81), 2.6), t + 0.02, 0.12)
        for k, n in enumerate([57, 61, 64, 68, 69, 73, 76]):
            place(sfx, bell(midi(n + 12), 2.0), t + k * 0.03, 0.05, (k - 3) * 0.2)
    elif tp == 'pilula':
        place(sfx, pop(760), t, 0.3)
        place(sfx, mallet(midi(81), 1.0, 1.3), t + 0.02, 0.22)
        place(sfx, mallet(midi(88), 1.0, 1.0), t + 0.14, 0.18)
place(sfx, bell(midi(93), 1.4), OUTRO + 3.5, 0.1)


# ------------------------------------------------------------------ reverb + master
def ir(d=2.2, seed=0):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = r.standard_normal(len(t)) * np.exp(-t / 0.55)
    return filt(x, 6000, 'low') * 0.05


send += sfx * 0.12 + music * 0.1
wet = np.stack([fftconvolve(send[0], ir(seed=3))[:N], fftconvolve(send[1], ir(seed=4))[:N]])
mix = music * 0.7 + drums * 0.7 + sfx * 0.95 + wet * 0.85
t = np.arange(N) / SR
mix *= np.clip((DUR - t) / 0.6, 0, 1)
mix *= np.clip(t / 0.003, 0, 1)
mix = filt(mix, 30, 'high')
body = np.percentile(np.abs(mix), 99.8)
mix = np.tanh(mix / body * 0.9) * 0.8

raw = os.path.join(ROOT, 'audio', '.trilha-raw.wav')
out = os.path.join(ROOT, 'audio', 'trilha.wav')
wavfile.write(raw, SR, (mix.T * 32767).astype(np.int16))
# −14 LUFS integrado, pico real −2 dBTP (fica ≤ −1,5 dBTP depois do AAC), 2 passadas
meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'loudnorm=I=-14:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-2:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
      f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-c:a', 'pcm_s16le', out], check=True)
os.remove(raw)
print('ok ->', out, '| entrada', js['input_i'], 'LUFS')
