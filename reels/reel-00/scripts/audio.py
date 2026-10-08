#!/usr/bin/env python3
"""
Trilha + efeitos do Reel 00 "Sob o mesmo teto" — 100% sintetizados (numpy/scipy).

128 BPM, Si menor → Ré maior. Eletrônico "cinemático": bumbo 4x4, supersaw com
side-chain, baixo saturado (aparece em alto-falante de celular), arpejo de
pluck sincopado e uma sineta de recepção como assinatura sonora (gancho, drop
e final).

A sincronia não é feita à mão: a animação exporta audio/cues.json
(node scripts/render.cjs cues) com o instante de cada evento visual
(palavra que aterrissa, telhado que bate, carimbo, moeda, pan de câmera...)
e este script coloca o som exatamente ali. A estrutura musical vem das
seções do mesmo arquivo.

    python3 scripts/audio.py      -> audio/trilha.wav (48 kHz, estéreo, -14 LUFS, pico ≤ -1 dBTP)
"""
import json
import os
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))
BPM = DATA['bpm']
BT = 60.0 / BPM
BAR = 4 * BT
S16 = BT / 4
DUR = float(DATA['duration'])
SEC = DATA['sections']
CUES = DATA['cues']
SR = 48000
N = int(SR * DUR)
rng = np.random.default_rng(2026)


def bar(n, beats=0.0):
    return (n - 1) * BAR + beats * BT


# ------------------------------------------------------------------ básicos
def tt(d):
    return np.arange(int(max(0.0, d) * SR)) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def filt(x, f, kind='low', order=2):
    if kind == 'band':
        f = [max(20, f[0]), min(SR / 2 * 0.95, f[1])]
    else:
        f = min(f, SR / 2 * 0.95)
    return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def stereo():
    return np.zeros((2, N))


def place(buf, sig, t, g=1.0, pan=0.0):
    """Mono → estéreo com pan de potência constante (-1 esquerda … 1 direita)."""
    if sig.ndim == 2:
        return place2(buf, sig, t, g)
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    pan = float(np.clip(pan, -1, 1))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:j] += sig[: j - i] * g * l * 1.414
    buf[1, i:j] += sig[: j - i] * g * r * 1.414


def place2(buf, sig, t, g=1.0):
    i = int(round(t * SR))
    if i >= N or i + sig.shape[1] <= 0:
        return
    if i < 0:
        sig, i = sig[:, -i:], 0
    j = min(N, i + sig.shape[1])
    buf[:, i:j] += sig[:, : j - i] * g


def place_pan(buf, sig, t, g, p0, p1):
    """Como place(), com o pan indo de p0 a p1 (acompanha o movimento na tela)."""
    i = int(round(t * SR))
    if i >= N:
        return
    j = min(N, i + len(sig))
    s = sig[: j - i] * g
    pc = np.clip(np.linspace(p0, p1, len(sig))[: j - i], -1, 1)
    buf[0, i:j] += s * np.cos((pc + 1) * np.pi / 4) * 1.414
    buf[1, i:j] += s * np.sin((pc + 1) * np.pi / 4) * 1.414


def sweep(x, f0, f1, q=1.4, kind='band'):
    """Filtro com frequência variando exponencialmente f0 → f1 (blocos de 256 amostras)."""
    out = np.zeros_like(x)
    n, B, zi = len(x), 256, None
    for i in range(0, n, B):
        fc = f0 * (f1 / f0) ** (i / max(1, n - 1))
        if kind == 'band':
            lo, hi = fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 * 0.95)
            sos = butter(2, [lo, hi], 'band', fs=SR, output='sos')
        else:
            sos = butter(2, min(fc, SR / 2 * 0.95), 'low', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + B], zi = sosfilt(sos, x[i:i + B], zi=zi)
    return out


def lp_auto(buf, t0, t1, f0, f1):
    """Passa-baixa com corte variando no tempo, aplicado a um trecho de um barramento estéreo."""
    i, j = int(t0 * SR), min(N, int(t1 * SR))
    for ch in range(2):
        buf[ch, i:j] = sweep(buf[ch, i:j], f0, f1, kind='low')


# ------------------------------------------------------------------ bateria
def kick(d=0.45, punch=1.0, tone=46):
    t = tt(d)
    f = tone + 170 * np.exp(-t / 0.028)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.24)
    click = filt(noise(d), 3000, 'high') * np.exp(-t / 0.003) * 0.5
    return np.tanh(2.4 * punch * (body + click)) * np.clip((d - t) / 0.02, 0, 1)


def clap(d=0.32):
    t = tt(d)
    n = filt(noise(d), [900, 7000], 'band')
    env = np.zeros_like(t)
    for k, o in enumerate([0, 0.008, 0.017, 0.026]):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.004 if k < 3 else 0.1))
    return n * env * 0.9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03) * 0.25


def snare(d=0.22, v=1.0):
    t = tt(d)
    return (filt(noise(d), [1400, 9000], 'band') * np.exp(-t / 0.07) + np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05) * 0.6) * v


def hat(d=0.06, open_=False):
    t = tt(d if not open_ else 0.3)
    return filt(noise(len(t) / SR), 7500, 'high') * np.exp(-t / (0.1 if open_ else 0.017))


def shaker(d=0.09):
    t = tt(d)
    return filt(noise(d), [5000, 12000], 'band') * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2


def tom(f0=150, f1=70, d=0.45, v=1.0):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.06)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    s += filt(noise(d), 2500, 'low') * np.exp(-t / 0.02) * 0.4
    return np.tanh(1.6 * s) * v


def crash(d=2.6, v=1.0):
    t = tt(d)
    s = filt(noise(d), 4200, 'high') * np.exp(-t / 0.9)
    s += filt(noise(d), [2500, 9000], 'band') * np.exp(-t / 0.35) * 0.6
    for m in (1.0, 1.47, 2.09, 2.73, 3.31):
        s += np.sin(2 * np.pi * 420 * m * t + rng.uniform(0, 6)) * np.exp(-t / 0.5) * 0.04
    return s * v * np.minimum(1, t / 0.002)


def rev_cymbal(d=0.9):
    return crash(d + 0.1, 1.0)[: int(d * SR)][::-1] * np.linspace(0, 1, int(d * SR)) ** 2


# ------------------------------------------------------------------ instrumentos
def saw_bl(f, t, bright, ph=0.0):
    """Dente de serra de banda limitada (aditivo, vetorizado)."""
    kmax = max(2, int(min(SR / 2 - 800, bright * 2.5) / f))
    k = np.arange(1, kmax + 1)[:, None]
    amp = (1 / k) * np.exp(-(k * f) / bright)
    return (np.sin(2 * np.pi * f * k * t[None, :] + ph * k) * amp).sum(0)


def supersaw(notes, d, bright=4200, voices=7, spread=0.011, att=0.006, rel=0.12, width=0.8):
    """Acorde em supersaw estéreo (vozes desafinadas espalhadas no panorama)."""
    t = tt(d)
    out = np.zeros((2, len(t)))
    for n in notes:
        f0 = midi(n)
        for v in range(voices):
            x = (v - (voices - 1) / 2) / ((voices - 1) / 2)
            s = saw_bl(f0 * (1 + x * spread), t, bright, rng.uniform(0, 6.28))
            pan = x * width
            out[0] += s * np.cos((pan + 1) * np.pi / 4)
            out[1] += s * np.sin((pan + 1) * np.pi / 4)
    env = np.minimum(1, t / att) * np.clip((d - t) / rel, 0, 1)
    return out * env / (len(notes) * voices) * 2.2


def pad(notes, d, bright=1400, att=0.5, rel=0.6):
    t = tt(d)
    out = np.zeros((2, len(t)))
    for n in notes:
        for k, dt in enumerate((-0.006, 0.0, 0.0065)):
            s = saw_bl(midi(n) * (1 + dt), t, bright, rng.uniform(0, 6.28))
            pan = (k - 1) * 0.7
            out[0] += s * np.cos((pan + 1) * np.pi / 4)
            out[1] += s * np.sin((pan + 1) * np.pi / 4)
    env = np.clip(t / att, 0, 1) ** 2 * np.clip((d - t) / rel, 0, 1)
    return out * env / (len(notes) * 3)


def pluck(f, d=0.32, bright=1.0):
    """Pluck brilhante: harmônicos agudos decaem mais rápido (corda/synth)."""
    t = tt(d)
    kmax = max(2, int(min(12000, 9000 * bright) / f))
    k = np.arange(1, kmax + 1)[:, None]
    amp = (1 / k) * np.exp(-t[None, :] * (5 + 3.2 * k / bright))
    s = (np.sin(2 * np.pi * f * k * t[None, :]) * amp).sum(0)
    return s * np.minimum(1, t / 0.002) * np.clip((d - t) / 0.03, 0, 1)


def bass(f, d, v=1.0, drive=3.0):
    """Sub senoidal + harmônicos saturados (audível em celular)."""
    t = tt(d)
    sub = np.sin(2 * np.pi * f * t)
    harm = np.tanh(drive * (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t + 0.3)))
    s = sub + 0.5 * filt(harm, 1600, 'low')
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.35) * np.clip((d - t) / 0.025, 0, 1)
    return s * env * v


def bell(f, d=1.8, bright=1.0):
    t = tt(d)
    idx = 1.4 * bright * np.exp(-t / 0.5)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t))
    s += 0.35 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.4)
    return s * np.minimum(1, t / 0.002) * np.exp(-t / 0.7)


def desk_bell(f=midi(90), d=2.8, big=False):
    """Sineta de balcão: parciais inarmônicos com batimento (o "ding" da recepção)."""
    t = tt(d)
    parts = [(1.0, 1.0, 1.5), (1.0026, 0.55, 1.3), (2.0, 0.08, 0.6), (2.76, 0.42, 0.42),
             (2.766, 0.25, 0.38), (4.1, 0.1, 0.2), (5.40, 0.2, 0.16), (8.93, 0.07, 0.06)]
    s = np.zeros_like(t)
    for m, a, dec in parts:
        s += a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    hit = filt(noise(d), [2500, 12000], 'band') * np.exp(-t / 0.0025)
    s += hit * 0.9
    if big:
        for m, a, dec in [(0.5, 0.55, 2.2), (0.5013, 0.35, 2.0), (1.38, 0.2, 0.9)]:
            s += a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    return s * np.minimum(1, t / 0.0006) / (2.2 if big else 1.8)


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
    f = 30 + 85 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.8 * big))
    body = filt(noise(d), 6000, 'low') * np.exp(-t / 0.4) * 0.45
    body += filt(noise(d), 5000, 'high') * np.exp(-t / 0.45) * 0.12
    return np.tanh(1.4 * (sub + body + kick(d, 1.2)[: len(t)] * 0.5))


def thud(d=0.35):
    t = tt(d)
    return np.sin(2 * np.pi * 78 * t) * np.exp(-t / 0.08) + filt(noise(d), 1500, 'low') * np.exp(-t / 0.03) * 0.9


def clank(f=170, d=1.4):
    """Batida metálica (o telhado assentando)."""
    t = tt(d)
    s = np.zeros_like(t)
    for m, a, dec in ((1.0, 1, 0.5), (1.59, 0.7, 0.35), (2.14, 0.6, 0.3), (2.65, 0.5, 0.22), (3.16, 0.4, 0.18), (4.1, 0.3, 0.1), (5.3, 0.2, 0.07)):
        s += a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    s += filt(noise(d), [800, 6000], 'band') * np.exp(-t / 0.02) * 1.2
    return np.tanh(s * 0.7)


def clink(f=3400, d=0.35):
    t = tt(d)
    s = 0
    for m, a, dec in ((1, 1, 0.14), (1.51, 0.6, 0.1), (2.13, 0.45, 0.07), (2.9, 0.3, 0.05)):
        s = s + a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    return s + filt(noise(d), 5000, 'high') * np.exp(-t / 0.003) * 0.5


def paper(d=0.3):
    t = tt(d)
    return filt(noise(d), [1500, 7000], 'band') * np.exp(-t / 0.06) * (0.6 + 0.4 * np.sin(2 * np.pi * 60 * t))


def swipe(d=0.25):
    t = tt(d)
    return sweep(noise(d), 1200, 6500, 2.5) * np.sin(np.pi * t / d) ** 1.5


def reverse_swell(d=0.8, notes=(59, 62, 66)):
    """Som "sugado": ruído e acorde com reverb tocados de trás para frente."""
    t = tt(d)
    x = filt(noise(d), 3000, 'low') * np.exp(-t / 0.35)
    for n in notes:
        x += pluck(midi(n), d, 0.6)[: len(t)] * 0.5
    x = fftconvolve(x, ir_mono(1.2, 9) * 8)[: len(t)]
    return x[::-1] / (np.abs(x).max() + 1e-9)


def roll_ticks(buf, t0, t1, g=0.12, f=3200, pan=0.0):
    t = t0
    while t < t1:
        u = (t - t0) / (t1 - t0)
        place(buf, click(0.02, f * (1 + 0.15 * rng.uniform(-1, 1))), t, g * (1 - 0.5 * u), pan)
        t += 0.028 + 0.11 * u ** 2


def typing(buf, t0, d, n, g=0.05, pan=-0.2):
    step = d / max(1, n)
    for i in range(n):
        place(buf, click(0.015, 4200 + 600 * rng.uniform(-1, 1)), t0 + i * step + rng.uniform(0, step * 0.3), g, pan + rng.uniform(-0.15, 0.15))


def ir_mono(d=2.4, seed=0, damp=0.62, lp=7000):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = filt(r.standard_normal(len(t)) * np.exp(-t / damp), lp, 'low')
    return x / np.sqrt((x ** 2).sum())


# ------------------------------------------------------------------ harmonia
# Si menor → Ré maior. Um acorde por compasso no drop.
CH = {
    'Bm': ([59, 62, 66, 69], 35), 'G': ([55, 59, 62, 66], 31), 'D': ([57, 62, 66, 69], 38),
    'A': ([57, 61, 64, 69], 33), 'Asus': ([57, 62, 64, 69], 33), 'D9': ([57, 62, 64, 66, 69], 38),
}
ARP = {'Bm': [71, 74, 78, 81], 'G': [67, 71, 74, 78], 'D': [69, 74, 78, 81], 'A': [69, 73, 76, 81], 'Asus': [69, 74, 76, 81], 'D9': [69, 74, 76, 78]}
PROG = [(5, 'Bm'), (6, 'G'), (7, 'D'), (8, 'A'), (9, 'Bm'), (10, 'G'), (11, 'D'), (12, 'A')]

music = stereo()     # acordes, baixo, arpejos, pads (recebe side-chain)
drums = stereo()
sfx = stereo()
send = stereo()      # envio para o reverb
kicks = []

T_HOOK, T_BUILD, T_BREATH, T_DROP = SEC['hook'], SEC['build'], SEC['breath'], SEC['drop']
T_ROOMS, T_HOUSE, T_LOGO, T_SIGN = SEC['rooms'], SEC['house'], SEC['logo'], SEC['sign']
T_FINAL = T_SIGN + BAR


def add_kick(t, g=0.9, punch=1.0):
    place(drums, kick(punch=punch), t, g)
    kicks.append(t)


# --- GANCHO (c.1): drone de Si, golpe com acorde no "pousada?"
place(music, pad([47, 59, 66], T_BUILD + 0.3, 900, att=0.25, rel=0.4), 0.0, 0.42)
place(music, supersaw(CH['Bm'][0], 0.42, 3200, rel=0.3), BT, 0.42)
place(send, supersaw(CH['Bm'][0], 0.42, 3200, rel=0.3), BT, 0.35)
for k, tb in enumerate([BT, 2 * BT, 3 * BT]):
    place(drums, filt(kick(), 300, 'low', 4), tb, 0.5 + 0.1 * k)
t = 2 * BT
while t < T_BUILD - 1e-6:                     # chimbal em colcheias acelerando para o zoom
    place(drums, hat(), t, 0.05 + 0.08 * (t - 2 * BT), 0.25)
    t += S16 * (2 if t < 3 * BT else 1)

# --- CONSTRUÇÃO (c.2–3): bumbo filtrado abrindo, baixo pulsando em Si, pad
place(music, pad([47, 59, 62, 66, 69], T_BREATH - T_BUILD + 0.4, 1300, att=1.2, rel=0.5), T_BUILD, 0.38)
place(send, pad([59, 62, 66, 69], T_BREATH - T_BUILD + 0.4, 1300, att=1.2, rel=0.5), T_BUILD, 0.2)
build_bus = stereo()
for i in range(8):                             # c.2–3 em semínimas
    tb = T_BUILD + i * BT
    place(build_bus, kick(), tb, 0.85)
    kicks.append(tb)
    if i >= 4 and i % 2 == 1:                  # palmas entram no c.3
        place(build_bus, clap(), tb, 0.45)
        place(send, clap(), tb, 0.15)
for i in range(16):                            # baixo em colcheias
    tb = T_BUILD + i * BT / 2
    place(build_bus, bass(midi(35) * (2 if i % 4 == 3 else 1), BT / 2 * 0.9, 0.9 if i % 2 == 0 else 0.7), tb, 0.55)
for i in range(32):                            # chimbal em semicolcheias, crescendo
    tb = T_BUILD + i * S16
    u = i / 31
    place(build_bus, hat(), tb + (0.012 if i % 2 else 0), (0.04 + 0.1 * u) * (1.3 if i % 4 == 2 else 1), 0.25 if i % 2 else -0.2)
lp_auto(build_bus, T_BUILD, T_BUILD + BAR, 260, 2400)
lp_auto(build_bus, T_BUILD + BAR, T_BREATH, 2400, 16000)
drums += build_bus
# virada de caixa depois do telhado (c.3, tempos 3–4), acelerando
t, k = T_BUILD + BAR + 2 * BT, 0
while t < T_BREATH - 0.01:
    u = (t - (T_BUILD + BAR + 2 * BT)) / (2 * BT)
    place(drums, snare(0.16, 0.35 + 0.65 * u), t, 0.42, 0.2 * (1 if k % 2 else -1))
    t += S16 if u < 0.5 else S16 / 2
    k += 1
place(sfx, riser(2 * BT, 220, 1800), T_BUILD + BAR + 2 * BT, 0.4)

# --- RESPIRO (c.4): silêncio, só sub e golpes graves; subida para o drop
place(music, pad([35, 47], BAR + 0.2, 500, att=0.3, rel=0.3), T_BREATH, 0.32)
place(sfx, riser(BAR - 0.05, 120, 1500), T_BREATH + 0.05, 0.3)
place(sfx, rev_cymbal(1.2), T_DROP - 1.2, 0.35)


# --- DROP E CÔMODOS (c.5–12): 4x4, palmas no 2 e 4, chimbal aberto no contratempo
def groove(t0, t1, hats=True, claps=True, shake=True, intensity=1.0):
    t = t0
    while t < t1 - 1e-6:
        for s in range(16):
            ts = t + s * S16
            if ts >= t1 - 1e-6:
                break
            if s % 4 == 0:
                add_kick(ts, 1.1 if s == 0 else 1.0)
            if claps and s in (4, 12):
                place(drums, clap(), ts, 0.5 * intensity)
                place(send, clap(), ts, 0.16)
            if hats:
                if s % 4 == 2:
                    place(drums, hat(open_=True), ts, 0.11 * intensity, 0.3)
                else:
                    place(drums, hat(), ts + (0.01 if s % 2 else 0), (0.09 if s % 2 == 0 else 0.06) * intensity, -0.3 if s % 2 else 0.25)
            if shake and s % 2 == 1:
                place(drums, shaker(), ts, 0.05 * intensity, 0.55)
        t += BAR


def bar_music(n, name, arp=True, stabs=True, bass_on=True, g=1.0):
    t0 = bar(n)
    notes, root = CH[name]
    # acorde sustentado (pumping pelo side-chain)
    sw = supersaw(notes, BAR + 0.05, 3800, rel=0.08)
    place(music, sw, t0, 0.5 * g)
    place(send, sw, t0, 0.14 * g)
    # baixo: contratempos em oitavas
    if bass_on:
        f = midi(root)
        for i in range(8):
            ts = t0 + i * BT / 2
            if i % 2 == 1:
                place(music, bass(f * (2 if i in (3, 7) else 1), BT / 2 * 0.95, 1.0), ts, 0.85 * g)
            elif i == 0:
                place(music, bass(f, BT * 0.45, 0.8), ts, 0.7 * g)
    # arpejo sincopado (3+3+2) em semicolcheias
    if arp:
        a = ARP[name]
        for j, s in enumerate([0, 3, 6, 8, 10, 12, 14]):
            n_ = a[[0, 1, 2, 3, 2, 1, 3][j]] + (12 if j == 3 else 0)
            pl = pluck(midi(n_), 0.3, 1.0)
            pan = [-0.5, 0.4, -0.2, 0.6, -0.6, 0.2, 0.5][j]
            place(music, pl, t0 + s * S16, 0.17 * g, pan)
            place(send, pl, t0 + s * S16, 0.06 * g, pan)
    if stabs:
        st = supersaw([x + 12 for x in notes[1:]], 0.16, 6000, rel=0.06, att=0.002)
        for s in (0, 6, 10):
            place(music, st, t0 + s * S16, 0.22 * g)


groove(T_DROP, T_HOUSE)
for n, name in PROG[:-1]:
    bar_music(n, name)
for tc in (T_DROP, bar(9)):
    place(drums, crash(2.6), tc, 0.4, -0.2)
    place(send, crash(2.6), tc, 0.12)
# viradas de tom antes de alguns cômodos
for n in (8, 10):
    for k, s in enumerate([12, 13, 14, 15]):
        place(drums, tom(190 - k * 25, 90 - k * 8, 0.3), bar(n) - BAR + s * S16, 0.32, 0.5 - k * 0.3)

# --- RECUO (c.12): a casa inteira — Lá (dominante), sem chimbal no 1º tempo
bar_music(12, 'A', arp=True, stabs=False, g=0.95)
groove(T_HOUSE + BT, T_LOGO, hats=True, shake=False)
add_kick(T_HOUSE, 1.0)
place(drums, crash(3.0), T_HOUSE, 0.45, 0.2)
place(send, crash(3.0), T_HOUSE, 0.15)
place(music, pad([57, 61, 64, 69, 73], BAR, 2400, att=0.4, rel=0.4), T_HOUSE, 0.3)

# --- ENCAIXE + PILARES (c.13): Sol → Lá, caixa acelerando, subida
for k, (beat, name) in enumerate([(0, 'G'), (1, 'G'), (2, 'Asus'), (3, 'A')]):
    tb = T_LOGO + beat * BT
    notes, root = CH[name]
    sw = supersaw(notes, BT * 0.9, 2600 + 900 * k, rel=0.1)
    place(music, sw, tb, 0.3 + 0.05 * k)
    place(send, sw, tb, 0.14)
    place(music, bass(midi(root), BT * 0.8, 1.0), tb, 0.6)
    add_kick(tb, 0.85)
t, k = T_LOGO + BT, 0
while t < T_SIGN - 0.01:
    u = (t - T_LOGO - BT) / (3 * BT)
    place(drums, snare(0.16, 0.3 + 0.7 * u), t, 0.38, 0.2 * (1 if k % 2 else -1))
    t += BT / 2 if u < 0.34 else (S16 if u < 0.75 else S16 / 2)
    k += 1
place(sfx, riser(3 * BT, 200, 2000), T_LOGO + BT, 0.4)
place(sfx, rev_cymbal(0.8), T_SIGN - 0.8, 0.3)

# --- ASSINATURA (c.14–15): Ré maior, gancho melódico, golpe final
groove(T_SIGN, T_FINAL)
bar_music(14, 'D', arp=False, stabs=True)
place(drums, crash(3.0), T_SIGN, 0.45)
place(send, crash(3.0), T_SIGN, 0.15)
HOOK = [74, 78, 81, 83, 81, 78, 81, 86]       # Ré Fá# Lá Si Lá Fá# Lá Ré
for i, n in enumerate(HOOK):
    ts = T_SIGN + i * BT / 2
    pl = pluck(midi(n), 0.42, 1.3)
    place(music, pl, ts, 0.2, 0.15 * (1 if i % 2 else -1))
    place(send, pl, ts, 0.12)
# golpe final e cauda
fin = supersaw(CH['D9'][0], DUR - T_FINAL, 3600, rel=1.2)
place(music, fin, T_FINAL, 0.36)
place(send, fin, T_FINAL, 0.2)
place(music, pad([38, 50, 57, 62, 66, 69, 74], DUR - T_FINAL, 2200, att=0.05, rel=1.2), T_FINAL, 0.35)
place(music, bass(midi(38), 1.2, 1.0), T_FINAL, 0.7)
add_kick(T_FINAL, 1.0, 1.2)
place(drums, crash(3.2), T_FINAL, 0.4)
place(send, crash(3.2), T_FINAL, 0.18)

# side-chain: o bumbo "bombeia" a música
duck = np.ones(N)
for t in kicks:
    i = int(t * SR)
    L = int(0.32 * SR)
    j = min(N, i + L)
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.6 * np.exp(-np.arange(j - i) / SR / 0.075))
music *= duck

# ------------------------------------------------------------------ efeitos (a partir dos cues)
PENTA = [59, 62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86]   # Si menor pentatônica, subindo


def fx(c):
    t, ty = c['t'], c['type']
    v = c.get('v', 1.0)
    pan = c.get('pan', 0.0)
    d = c.get('d', 0.3)
    if ty == 'ding':
        s = desk_bell(midi(90), 3.2 if c.get('big') else 2.6, c.get('big', False))
        place(sfx, s, t, 0.62 * v, 0.0)
        place(send, s, t, 0.3 * v)
        if c.get('big'):
            place(sfx, impact(2.4, 1.2), t, 0.5)
    elif ty == 'rise':
        place(sfx, whoosh(0.28, 700, 3200, 0.7, 1.6), t, 0.1 * v)
    elif ty == 'slam':
        soft = c.get('soft', False)
        place(sfx, tom(130, 52, 0.55), t, (0.4 if soft else 0.75) * v)
        place(sfx, filt(noise(0.25), [200, 4000], 'band') * np.exp(-tt(0.25) / 0.035), t, (0.25 if soft else 0.45) * v)
        place(send, tom(130, 52, 0.55), t, 0.3 * v)
        if soft:
            place(sfx, impact(1.6, 0.8), t, 0.18 * v)
        else:
            place(sfx, impact(1.4, 0.7), t, 0.45 * v)
    elif ty == 'swish':
        place(sfx, whoosh(0.22, 900, 5000, 0.5, 1.2), t, 0.16 * v, pan)
    elif ty == 'fall':
        place(sfx, whoosh(d, 3500, 400, 0.4, 1.4), t, 0.22 * v)
    elif ty == 'zoom':
        place(sfx, whoosh(d + 0.05, 200, 7000, 0.92, 1.4), t, 0.5 * v)
        place(sfx, rev_cymbal(d), t, 0.25)
    elif ty == 'drop':
        place(sfx, whoosh(d, 2500, 800, 0.85, 1.6), t, 0.1 * v)
    elif ty == 'land':
        k, n = c['k'], c['n']
        note = PENTA[min(k, len(PENTA) - 1)]
        top = k == n - 1
        place(sfx, tom(170 + 9 * k, 70 + 4 * k, 0.32), t, 0.42 * v, pan)
        place(sfx, pluck(midi(note), 0.5, 1.2), t, 0.24 * v, pan)
        place(send, pluck(midi(note), 0.5, 1.2), t, 0.12 * v, pan)
        place(sfx, click(0.02, 2400), t, 0.25 * v, pan)
        if top:
            place(sfx, bell(midi(note + 12), 1.2), t, 0.08)
    elif ty == 'roof':
        place(sfx, impact(2.4, 1.1), t, 0.72 * v)
        place(sfx, clank(165, 1.4), t, 0.3 * v, -0.15)
        place(send, clank(165, 1.4), t, 0.18 * v)
        place(drums, crash(2.6), t, 0.4 * v, 0.1)
        place(send, impact(2.4, 1.1), t, 0.18 * v)
        place(music, supersaw(CH['Bm'][0], 0.5, 3000, rel=0.35), t, 0.3 * v)
    elif ty == 'suck':
        place(sfx, reverse_swell(d), t, 0.5)
        place(sfx, whoosh(d, 6000, 200, 0.9, 1.2)[::-1], t, 0.3)
    elif ty == 'boom':
        soft = c.get('soft', False)
        place(sfx, impact(2.8, 1.3), t, (0.55 if soft else 0.9) * v)
        place(send, impact(2.8, 1.3), t, 0.25 * v)
        if not soft:
            place(sfx, whoosh(1.4, 6000, 150, 0.04, 1.0), t, 0.3)
    elif ty == 'type':
        typing(sfx, t, d, c.get('n', 20) // 2, 0.045, 0.0)
    elif ty == 'dive':
        place(sfx, whoosh(d + 0.08, 150, 8000, 0.95, 1.5), t, 0.6)
        place(sfx, thud(0.4), t + d, 0.25)
    elif ty == 'pan':
        dx, dy = c.get('dx', 0), c.get('dy', 0)
        w = whoosh(d + 0.1, 350, 5200, 0.55, 1.0) if dy == 0 else whoosh(d + 0.1, 3800, 300, 0.55, 1.0)
        p0, p1 = (-0.85 * dx, 0.85 * dx) if dx else (0.0, 0.0)
        place_pan(sfx, w, t, 0.5, p1, p0)   # câmera vai para a direita = imagem corre para a esquerda
        place(sfx, tom(220, 110, 0.2), t + d * 0.55, 0.12)
    elif ty == 'grid':
        for i in range(35):
            r, col = divmod(i, 7)
            place(sfx, click(0.015, 3500 + 120 * (r + col)), t - 0.15 + (r + col) * 0.035, 0.05, (col - 3) / 4)
    elif ty == 'paint':
        j = c.get('j', 0)
        place(sfx, swipe(0.2), t, 0.08, -0.4 + 0.12 * j)
        place(sfx, blip(midi(PENTA[4 + j % 7] + 12), 0.1), t + 0.02, 0.1, -0.4 + 0.12 * j)
    elif ty == 'click':
        place(sfx, click(0.03, 2500), t, 0.3 * v)
        place(sfx, pop(900), t, 0.12 * v)
    elif ty == 'confirm':
        place(sfx, thud(0.3), t, 0.3 * v)
        for k2, n in enumerate([86, 93]):
            place(sfx, bell(midi(n), 1.2), t + 0.05 + k2 * 0.08, 0.13 * v, 0.2)
            place(send, bell(midi(n), 1.2), t + 0.05 + k2 * 0.08, 0.08 * v)
    elif ty == 'whoosh':
        place(sfx, whoosh(d, 500, 4200, 0.6, 1.2), t, 0.22 * v, pan)
    elif ty == 'roll':
        roll_ticks(sfx, t, t + d, 0.08 * v, 3000, 0.1)
    elif ty == 'pop':
        place(sfx, pop(c.get('f', 600)), t, 0.22 * v, pan)
    elif ty == 'key':
        place(sfx, click(0.03, 1800), t - 0.06, 0.35)
        place(sfx, click(0.04, 1200), t, 0.45)
        place(sfx, thud(0.25), t, 0.2)
        place(sfx, bell(midi(88), 1.2), t + 0.03, 0.12)
    elif ty == 'flip':
        i = c.get('i', 0)
        place(sfx, paper(0.08), t, 0.1, -0.35 if i % 2 == 0 else 0.35)
        place(sfx, click(0.02, 2200 + 80 * i), t, 0.08, -0.35 if i % 2 == 0 else 0.35)
    elif ty == 'blip':
        i = c.get('i', 0)
        place(sfx, blip(midi(PENTA[6 + (i % 5)] + (12 if c.get('on') else 0)), 0.1), t, 0.09, -0.35 if i % 2 == 0 else 0.35)
    elif ty == 'press':
        i = c.get('i', 0)
        place(sfx, pop(380 + 40 * i), t, 0.28, -0.35 if i % 2 == 0 else 0.35)
        place(sfx, click(0.02, 1800), t, 0.25, -0.35 if i % 2 == 0 else 0.35)
    elif ty == 'coin':
        i = c.get('i', 0)
        place(sfx, clink(3000 + 260 * i, 0.4), t, 0.2 * v, 0.55)
        place(send, clink(3000 + 260 * i, 0.4), t, 0.08)
    elif ty == 'thud':
        place(sfx, thud(0.35), t, 0.35 * v)
        place(sfx, paper(0.12), t, 0.12 * v)
    elif ty == 'card':
        place(sfx, swipe(0.22), t - 0.08, 0.2)
        place(sfx, thud(0.3), t, 0.3 * v)
        place(sfx, blip(midi(93), 0.09), t + 0.06, 0.08)
    elif ty == 'stamp':
        place(sfx, impact(1.4, 0.8), t + 0.02, 0.55 * v)
        place(sfx, thud(0.4), t + 0.02, 0.4)
        place(sfx, paper(0.2), t + 0.02, 0.3)
        for k2, n in enumerate([81, 86, 90]):
            place(sfx, bell(midi(n), 1.0), t + 0.08 + k2 * 0.05, 0.1)
    elif ty == 'register':
        for k2, n in enumerate([88, 93]):
            place(sfx, bell(midi(n), 1.3), t + k2 * 0.09, 0.16 * v, 0.2)
            place(send, bell(midi(n), 1.3), t + k2 * 0.09, 0.08)
        for k2 in range(5):
            place(sfx, clink(3200 + 300 * k2, 0.3), t + 0.04 + k2 * 0.045, 0.08, 0.3)
        roll_ticks(sfx, t, t + 0.5, 0.07, 3200)
    elif ty == 'pull':
        place(sfx, whoosh(d + 0.2, 6000, 180, 0.3, 1.0), t, 0.5)
        place(sfx, impact(2.0, 0.9), t + 0.05, 0.3)
    elif ty == 'morph':
        place(sfx, whoosh(d, 200, 5000, 0.85, 1.4), t, 0.4)
    elif ty == 'ring':
        for k2, n in enumerate([74, 78, 81, 86, 90]):
            place(sfx, bell(midi(n), 1.0), t + k2 * d / 5, 0.07, -0.6 + 0.3 * k2)
            place(send, bell(midi(n), 1.0), t + k2 * d / 5, 0.05)
    elif ty == 'lock':
        place(sfx, thud(0.4), t, 0.5)
        place(sfx, clank(110, 0.9), t, 0.12)
    elif ty == 'glint':
        for k2 in range(9):
            n = [86, 90, 93, 98, 93, 90, 98, 102, 105][k2]
            place(sfx, blip(midi(n), 0.18), t + k2 * d / 9, 0.05, -0.8 + 0.2 * k2)
            place(send, blip(midi(n), 0.18), t + k2 * d / 9, 0.05)
    elif ty == 'cut':
        pass
    else:
        raise ValueError('cue desconhecido: ' + ty)


for c in CUES:
    fx(c)

# ------------------------------------------------------------------ reverb + master
send += sfx * 0.1 + music * 0.08
wet = np.stack([fftconvolve(send[0], ir_mono(2.6, 3))[:N], fftconvolve(send[1], ir_mono(2.6, 4))[:N]])
mix = music * 0.72 + drums * 0.74 + sfx * 0.95 + wet * 0.42
t = np.arange(N) / SR
mix *= np.clip((DUR - t) / 0.5, 0, 1)
mix *= np.clip(t / 0.002, 0, 1)
mix = filt(mix, 28, 'high')
# compressão de barramento (joelho suave) antes da normalização
body = np.percentile(np.abs(mix), 99.7)
mix = np.tanh(mix / body * 0.85) * 0.8

os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
raw = os.path.join(ROOT, 'audio', '.trilha-raw.wav')
out = os.path.join(ROOT, 'audio', 'trilha.wav')
wavfile.write(raw, SR, (mix.T * 32767).astype(np.int16))

# loudness para redes sociais: -14 LUFS integrado, pico real -1 dBTP (2 passadas)
meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'],
                      capture_output=True, text=True).stderr
js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
      f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-c:a', 'pcm_s16le', out], check=True)
os.remove(raw)
print('ok ->', out, '| entrada', js['input_i'], 'LUFS |', len(CUES), 'cues')
