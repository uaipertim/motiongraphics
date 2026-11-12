#!/usr/bin/env python3
"""
Trilha + efeitos do reel "Parte 1 · A chegada" — 100% sintetizados (numpy/scipy), sem voz.

Trilha nova e mais calma que a do "Um dia inteiro": Ré maior a 84 BPM, piano elétrico com notas longas,
baixo sustentado, pulso suave (bumbo abafado no 1, aro no 2 e no 4, chocalho em colcheias baixas) e uma
marimba que só aparece de vez em quando. Os efeitos ficam espaçados e seguem audio/eventos.json, exportado
da própria animação (node scripts/render.cjs dados): toque, troca de status, contagem e digitação, a barra
caindo, o fio de luz entre as ideias e os checks do final.

    python3 scripts/audio.py      -> audio/trilha.wav (48 kHz, estéreo, −14 LUFS, pico ≤ −1,5 dBTP)

Os instrumentos são os mesmos do "Um dia inteiro" e da v2 (kick, rim, ep, mallet, bass, pad…).
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
BPM = 84
BEAT = 60 / BPM
BAR = 4 * BEAT
S16 = BEAT / 4
rng = np.random.default_rng(2210)

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


def shaker(d=0.09):
    t = tt(d)
    return filt(noise(d), [5000, 11000], 'band') * np.exp(-t / 0.025) * np.minimum(1, t / 0.006)


# ------------------------------------------------------------------ arranjo
music, drums, sfx, send = stereo(), stereo(), stereo(), stereo()
E = EVT['E']
FIM = E['fim']
# Ré maior: Gmaj9 · D/F# · Em9 · A6sus — devagar, um acorde por compasso
Gmaj9 = [55, 59, 62, 66, 69]
DF = [54, 57, 62, 66]
Em9 = [52, 55, 59, 62, 66]
A6 = [57, 61, 64, 66, 71]
PROG = [(Gmaj9, 43), (DF, 42), (Em9, 40), (A6, 45)]
kicks = []

# abertura (0 → 1 compasso): só o pad e o piano, sem pulso
place(music, pad([43, 55, 59, 62, 66], BAR + 0.5, 900, att=1.4), 0.0, 0.42)
place(send, pad([55, 59, 62, 66], BAR + 0.5, 900, att=1.4), 0.0, 0.22)
t0, bar = 0.0, 0
while t0 < E['Final'] - 0.01:
    ch, root = PROG[bar % 4]
    d = min(BAR, E['Final'] - t0)
    place(music, chord_ep(ch, min(BAR * 0.98, d), 0.7), t0, 0.5, -0.1)
    place(send, chord_ep(ch, min(BAR * 0.98, d), 0.7), t0, 0.26)
    if bar % 2 == 1:   # resposta curta no meio do compasso
        place(music, chord_ep([n + 12 for n in ch[1:4]], 0.6, 0.45), t0 + 2.5 * BEAT, 0.16, 0.3)
    place(music, bass(midi(root), min(BAR * 0.9, d), 0.8), t0, 0.5)
    place(music, bass(midi(root + 7), BEAT * 0.9, 0.5), t0 + 2.5 * BEAT, 0.32)
    if bar >= 1:       # pulso suave a partir do 2º compasso
        for s in range(16):
            ts = t0 + s * S16
            if ts >= E['Final'] - 0.05:
                break
            if s in (0, 10):
                place(drums, filt(kick(0.4, 0.8), 900, 'low', 2), ts, 0.62 if s == 0 else 0.42)
                kicks.append(ts)
            if s in (4, 12):
                place(drums, rim(), ts, 0.13, 0.25)
            if s % 2 == 0:
                place(drums, shaker(), ts + (0.018 if s % 4 else 0), 0.07 if s % 4 else 0.1, -0.3 if s % 4 else 0.3)
    if bar >= 3 and bar % 2 == 1:   # marimba: um motivo de 3 notas, de vez em quando
        for k, n in enumerate([ch[2] + 12, ch[3] + 12, ch[1] + 24]):
            place(music, mallet(midi(n), 0.6, 0.9), t0 + (1 + k * 0.5) * BEAT, 0.07, (k - 1) * 0.4)
            place(send, mallet(midi(n), 0.6), t0 + (1 + k * 0.5) * BEAT, 0.05)
    t0 += BAR
    bar += 1

# final: resolve em Ré, o pulso sai e fica o piano
F0 = E['Final']
place(music, pad([38, 50, 57, 62, 66, 69], FIM - F0 + 0.5, 2000, 0.3), F0, 0.42)
place(send, pad([50, 57, 62, 66, 69], FIM - F0 + 0.5, 2000, 0.3), F0, 0.24)
place(music, chord_ep([50, 57, 62, 66, 69, 74], FIM - F0, 0.85), F0, 0.5)
place(music, bass(midi(38), 2.0, 0.9), F0, 0.55)

duck = np.ones(N)
for t in kicks:
    i = int(t * SR); j = min(N, i + int(0.3 * SR))
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.3 * np.exp(-np.arange(j - i) / SR / 0.08))
music *= duck

# ------------------------------------------------------------------ efeitos (da animação), espaçados
for e in EVT['eventos']:
    t, tp = e['t'], e['tipo']
    if tp == 'entra':
        place(sfx, whoosh(0.4, 400, 2600, 0.8), t, 0.07, rng.uniform(-0.2, 0.2))
    elif tp == 'barra':
        n = [62, 66, 69, 71, 74, 78, 81, 83, 86, 90, 93, 95][e['i'] % 12]
        place(sfx, mallet(midi(n), 0.5, 0.7), t + 0.15, 0.06, ((e['i'] % 5) - 2) * 0.2)
    elif tp == 'fio':
        place(sfx, zip_up(max(0.3, e['dur'] * 0.85), 500, 1800), t, 0.1, 0.0)
    elif tp == 'toque':
        place(sfx, click(0.025, 2400), t, 0.4)
        place(sfx, thud(0.18), t, 0.12)
        place(sfx, blip(midi(86), 0.2), t + 0.02, 0.09)
    elif tp == 'seleciona':
        place(sfx, mallet(midi(81), 0.7, 1.0), t, 0.18)
    elif tp == 'conta':
        roll_ticks(sfx, t, t + e['dur'], 0.045, 3000, 0.1)
    elif tp == 'conta_fim':
        place(sfx, blip(midi(90), 0.1), t, 0.05, 0.2)
    elif tp == 'tecla':
        place(sfx, click(0.018, 4200 + 400 * rng.uniform(-1, 1)), t, 0.16, -0.15)
    elif tp == 'status':
        place(sfx, whoosh(0.3, 700, 3000, 0.8), t - 0.25, 0.08)
        place(sfx, mallet(midi(78), 1.0, 1.1), t, 0.24, -0.1)
        place(sfx, mallet(midi(85), 1.0, 1.0), t + 0.12, 0.2, 0.1)
        place(send, mallet(midi(85), 1.0), t + 0.12, 0.12)
    elif tp == 'impacto':
        place(sfx, whoosh(0.35, 2400, 400, 0.85), t - 0.33, 0.14)
        place(sfx, thud(0.4), t, 0.4)
        place(sfx, bell(midi(81), 1.4), t + 0.04, 0.08)
    elif tp == 'bloco':
        place(sfx, blip(midi(81 + 2 * (len([x for x in EVT['eventos'] if x['tipo'] == 'bloco' and x['t'] < t]) % 4)), 0.16), t, 0.12)
    elif tp == 'feito':
        place(sfx, mallet(midi(74), 0.9, 1.1), t, 0.2)
        place(sfx, mallet(midi(81), 0.9, 1.0), t + 0.1, 0.18)
        place(sfx, bell(midi(86), 1.6), t + 0.12, 0.08)
    elif tp == 'recibo':
        place(sfx, paper(0.35), t, 0.12, 0.2)
    elif tp == 'check':
        n = [74, 78, 81][e['i']]
        place(sfx, click(0.02, 2600), t, 0.2)
        place(sfx, mallet(midi(n), 1.0, 1.1), t + 0.02, 0.24)
        place(send, mallet(midi(n), 1.0), t + 0.02, 0.12)
    elif tp == 'parte2':
        place(sfx, whoosh(0.5, 300, 2000, 0.6), t - 0.1, 0.08)
    elif tp == 'logo':
        place(sfx, sineta(midi(86), 2.6), t + 0.05, 0.16)
        place(send, sineta(midi(86), 2.6), t + 0.05, 0.1)
    elif tp == 'pilula':
        place(sfx, pop(700), t, 0.18)
        place(sfx, mallet(midi(86), 1.0, 1.0), t + 0.03, 0.16)


def ir(d=2.6, seed=0):
    r = np.random.default_rng(seed)
    t = tt(d)
    return filt(r.standard_normal(len(t)) * np.exp(-t / 0.7), 5500, 'low') * 0.05


send += sfx * 0.14 + music * 0.12
wet = np.stack([fftconvolve(send[0], ir(seed=5))[:N], fftconvolve(send[1], ir(seed=6))[:N]])
mix = music * 0.72 + drums * 0.62 + sfx * 0.95 + wet * 0.9
t = np.arange(N) / SR
mix *= np.clip((DUR - t) / 1.2, 0, 1) * np.clip(t / 0.01, 0, 1)
mix = filt(mix, 30, 'high')
body = np.percentile(np.abs(mix), 99.8)
mix = np.tanh(mix / body * 0.85) * 0.8
raw = os.path.join(ROOT, 'audio', '.trilha-raw.wav')
out = os.path.join(ROOT, 'audio', 'trilha.wav')
wavfile.write(raw, SR, (mix.T * 32767).astype(np.int16))
meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'loudnorm=I=-14:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-2:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
      f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-c:a', 'pcm_s16le', out], check=True)
os.remove(raw)
print('ok ->', out, '| entrada', js['input_i'], 'LUFS')
