#!/usr/bin/env python3
"""
Trilha + efeitos do Reel 03 "O caixa bateu?" — 100% sintetizados (numpy/scipy).

Trailer híbrido e mecânico a 120 BPM, em Ré menor que resolve em Fá maior no
instante em que a diferença do caixa zera. O relógio do cofre é a percussão:
os tiques do segredo viram o chimbal, as travas são golpes de metal, o painel
de palhetas é uma chuva de cliques e os tubos pneumáticos sopram e assentam.
Ostinato de cordas sintéticas em semicolcheias, "braam" de metais no drop e na
assinatura, e a sineta de recepção da série, afinada em Lá (a terça de Fá).

A sincronia vem da animação: `node scripts/render.cjs cues` exporta
audio/cues.json (cada tique do segredo, trava, palheta, cápsula, tecla...) e
este script coloca o som exatamente nesses instantes.

    python3 scripts/audio.py   -> audio/trilha.wav (48 kHz, estéreo, -14 LUFS, pico real ≤ -2,2 dBTP antes do AAC)
"""
import json
import os
import subprocess
import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly
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
rng = np.random.default_rng(3003)


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
    i = int(round(t * SR))
    if sig.ndim == 2:
        if i >= N:
            return
        if i < 0:
            sig, i = sig[:, -i:], 0
        j = min(N, i + sig.shape[1])
        buf[:, i:j] += sig[:, : j - i] * g
        return
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    pan = float(np.clip(pan, -1, 1))
    buf[0, i:j] += sig[: j - i] * g * np.cos((pan + 1) * np.pi / 4) * 1.414
    buf[1, i:j] += sig[: j - i] * g * np.sin((pan + 1) * np.pi / 4) * 1.414


def place_pan(buf, sig, t, g, p0, p1):
    i = int(round(t * SR))
    if i >= N:
        return
    j = min(N, i + len(sig))
    s = sig[: j - i] * g
    pc = np.clip(np.linspace(p0, p1, len(sig))[: j - i], -1, 1)
    buf[0, i:j] += s * np.cos((pc + 1) * np.pi / 4) * 1.414
    buf[1, i:j] += s * np.sin((pc + 1) * np.pi / 4) * 1.414


def sweep(x, f0, f1, q=1.4, kind='band'):
    out = np.zeros_like(x)
    n, B, zi = len(x), 256, None
    for i in range(0, n, B):
        fc = f0 * (f1 / f0) ** (i / max(1, n - 1))
        if kind == 'band':
            sos = butter(2, [fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 * 0.95)], 'band', fs=SR, output='sos')
        else:
            sos = butter(2, min(fc, SR / 2 * 0.95), 'low', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + B], zi = sosfilt(sos, x[i:i + B], zi=zi)
    return out


def lp_auto(buf, t0, t1, f0, f1):
    i, j = int(t0 * SR), min(N, int(t1 * SR))
    for ch in range(2):
        buf[ch, i:j] = sweep(buf[ch, i:j], f0, f1, kind='low')


def ir_norm(d=2.6, seed=0, damp=0.7, lp=6500):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = filt(r.standard_normal(len(t)) * np.exp(-t / damp), lp, 'low')
    return x / np.sqrt((x ** 2).sum())


# ------------------------------------------------------------------ percussão
def kick(d=0.5, punch=1.0, tone=44):
    t = tt(d)
    f = tone + 170 * np.exp(-t / 0.028)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.24)
    click = filt(noise(d), 3500, 'high') * np.exp(-t / 0.0025) * 0.6
    return np.tanh(2.6 * punch * (body + click)) * np.clip((d - t) / 0.02, 0, 1)


def clap(d=0.35):
    t = tt(d)
    n = filt(noise(d), [900, 7500], 'band')
    env = np.zeros_like(t)
    for k, o in enumerate([0, 0.008, 0.017, 0.027]):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.004 if k < 3 else 0.13))
    return n * env


def snare(d=0.3, v=1.0):
    t = tt(d)
    return (filt(noise(d), [1500, 9000], 'band') * np.exp(-t / 0.09) + np.sin(2 * np.pi * np.cumsum(185 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.06) * 0.7) * v


def taiko(d=0.9, f0=62):
    """Tambor grave de trailer: pele com queda de afinação + ar do golpe."""
    t = tt(d)
    f = f0 + 70 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.52) / SR) * np.exp(-t / 0.12)
    s += filt(noise(d), [200, 2500], 'band') * np.exp(-t / 0.03) * 0.8
    return np.tanh(1.8 * s)


def tom(f0=110, d=0.4):
    t = tt(d)
    f = f0 + 40 * np.exp(-t / 0.04)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) + filt(noise(d), [300, 3000], 'band') * np.exp(-t / 0.012) * 0.4)


def crash(d=2.6, v=1.0):
    t = tt(d)
    s = filt(noise(d), 4500, 'high') * np.exp(-t / 0.9) + filt(noise(d), [2500, 9000], 'band') * np.exp(-t / 0.35) * 0.6
    return s * v * np.minimum(1, t / 0.002)


def rev_cymbal(d=0.9):
    return crash(d + 0.1)[: int(d * SR)][::-1] * np.linspace(0, 1, int(d * SR)) ** 2


# ------------------------------------------------------------------ sons do cofre
def tick(f=2600, d=0.06, bright=1.0):
    """Tique do segredo: estalo seco + um "ping" curto de metal."""
    t = tt(d)
    s = filt(noise(d), [3000, 11000], 'band') * np.exp(-t / 0.0018) * 1.2 * bright
    s += np.sin(2 * np.pi * f * t) * np.exp(-t / 0.018) * 0.35 + np.sin(2 * np.pi * f * 2.71 * t) * np.exp(-t / 0.009) * 0.15
    return s


def clank(f0=95, d=0.5, metal=1.0):
    """Trava de aço: baque grave + parciais metálicos inarmônicos."""
    t = tt(d)
    s = np.sin(2 * np.pi * np.cumsum(f0 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.09)
    for m, a, dec in [(4.1, 0.35, 0.11), (6.3, 0.3, 0.09), (9.7, 0.22, 0.07), (13.2, 0.15, 0.05), (17.9, 0.1, 0.04)]:
        s += a * metal * np.sin(2 * np.pi * f0 * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    s += filt(noise(d), [1500, 8000], 'band') * np.exp(-t / 0.006) * 0.9
    return np.tanh(1.5 * s)


def ratchet(d, n0=10, n1=30, avoid=()):
    """Catraca do volante: cliques que aceleram e desaceleram (sem pisar nos golpes das travas)."""
    out = np.zeros(int(d * SR) + 4000)
    t = 0.0
    while t < d:
        if any(-0.07 < t - a < 0.03 for a in avoid):
            t += 0.01
            continue
        u = t / d
        rate = n0 + (n1 - n0) * np.sin(np.pi * u)
        c = tick(1800 + 400 * rng.uniform(), 0.04, 0.7)
        i = int(t * SR)
        out[i:i + len(c)] += c * (0.5 + 0.5 * np.sin(np.pi * u))
        t += 1.0 / rate
    return out[: int(d * SR) + 2000]


def hiss(d, peak=0.6):
    t = tt(d)
    u = t / d
    env = np.where(u < peak, (u / peak) ** 1.5, ((1 - u) / (1 - peak)) ** 1.2)
    return filt(noise(d), 3500, 'high') * env


def flap_click():
    """Uma palheta do painel caindo: clique plástico curto com corpinho."""
    d = 0.03
    t = tt(d)
    f = rng.uniform(2200, 3600)
    return filt(noise(d), [1800, 7000], 'band') * np.exp(-t / 0.0022) + np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) * 0.25


def keypress(f=1500):
    d = 0.08
    t = tt(d)
    return filt(noise(d), [1200, 6000], 'band') * np.exp(-t / 0.004) * 0.9 + np.sin(2 * np.pi * f * t) * np.exp(-t / 0.02) * 0.3 + \
        np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.015) * 0.4


def pneumatic(d=0.55):
    """Cápsula no tubo: sopro que acelera, com ressonância oca de cano."""
    t = tt(d)
    u = t / d
    air = sweep(noise(d), 400, 3000, 1.0) * u ** 1.6
    pipe = sum(np.sin(2 * np.pi * (f0 * (1 + 0.6 * u)) * t) * a for f0, a in [(310, 0.3), (620, 0.15), (930, 0.07)]) * u ** 2
    return (air * 0.9 + pipe * 0.5) * np.clip((d - t) / 0.03, 0, 1)


def thunk(d=0.5):
    """Cápsula assentando no receptor: baque oco + escape de ar."""
    t = tt(d)
    s = np.sin(2 * np.pi * np.cumsum(140 + 160 * np.exp(-t / 0.012)) / SR) * np.exp(-t / 0.07)
    s += filt(noise(d), [300, 2500], 'band') * np.exp(-t / 0.01) * 0.6
    s += filt(noise(d), 4000, 'high') * np.exp(-t / 0.12) * 0.25
    return np.tanh(1.6 * s)


def drawer_slide(d=0.4):
    t = tt(d)
    u = t / d
    return sweep(noise(d), 300, 1400, 1.2) * np.sin(np.pi * u) ** 0.8 * (0.7 + 0.3 * np.sin(2 * np.pi * 38 * t))


def coins(d=0.6, n=10):
    out = np.zeros(int(d * SR) + 6000)
    for _ in range(n):
        t0 = rng.uniform(0, d * 0.6) ** 1.3
        f = rng.uniform(3200, 7000)
        tt_ = tt(0.12)
        c = (np.sin(2 * np.pi * f * tt_) + 0.5 * np.sin(2 * np.pi * f * 1.48 * tt_)) * np.exp(-tt_ / 0.03) * rng.uniform(0.3, 1)
        i = int(t0 * SR)
        out[i:i + len(c)] += c
    return out * 0.35


# ------------------------------------------------------------------ instrumentos
def saw_bl(f, t, bright, ph=0.0):
    kmax = max(2, int(min(SR / 2 - 800, bright * 2.5) / f))
    k = np.arange(1, kmax + 1)[:, None]
    return (np.sin(2 * np.pi * f * k * t[None, :] + ph * k) * ((1 / k) * np.exp(-(k * f) / bright))).sum(0)


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


def braam(notes, d, bright=900):
    """Metais graves de trailer: serras desafinadas com o filtro abrindo e fechando."""
    t = tt(d)
    out = np.zeros(len(t))
    for n in notes:
        for dt in (-0.008, 0.0, 0.007):
            out += saw_bl(midi(n) * (1 + dt), t, bright * 2.4, rng.uniform(0, 6.28))
    env = np.minimum(1, t / 0.04) * (0.55 + 0.45 * np.exp(-t / 0.5)) * np.clip((d - t) / 0.5, 0, 1)
    out = sweep(out, bright * 2.2, bright * 0.5, kind='low')
    return np.tanh(1.3 * out * env / len(notes))


def string_pluck(f, d=0.2, bright=2400):
    """Corda sintética do ostinato (serra com envelope curto e brilho controlado)."""
    t = tt(d)
    s = saw_bl(f, t, bright) * np.exp(-t / 0.09)
    return s * np.minimum(1, t / 0.003) * np.clip((d - t) / 0.02, 0, 1)


def sub_bass(f, d, drive=1.6):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.25 * saw_bl(f, t, 500)
    return np.tanh(drive * s) / np.tanh(drive) * np.minimum(1, t / 0.01) * np.clip((d - t) / 0.06, 0, 1)


def bell(f, d=1.6, bright=1.0):
    t = tt(d)
    idx = 1.4 * bright * np.exp(-t / 0.5)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) + 0.35 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.4)
    return s * np.minimum(1, t / 0.002) * np.exp(-t / 0.7)


def desk_bell(f, d=3.0):
    """A sineta de recepção da série (parciais inarmônicos com batimento)."""
    t = tt(d)
    s = np.zeros_like(t)
    for m, a, dec in [(1.0, 1.0, 1.5), (1.0026, 0.55, 1.3), (2.0, 0.08, 0.6), (2.76, 0.42, 0.42), (2.766, 0.25, 0.38),
                      (4.1, 0.1, 0.2), (5.40, 0.2, 0.16), (0.5, 0.5, 2.2), (0.5013, 0.3, 2.0)]:
        s += a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    s += filt(noise(d), [2500, 12000], 'band') * np.exp(-t / 0.0025) * 0.9
    return s * np.minimum(1, t / 0.0006) / 2.3


# ------------------------------------------------------------------ efeitos genéricos
def blip(f, d=0.12):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.035) * np.minimum(1, t / 0.001)


def pop(f=600, d=0.12):
    t = tt(d)
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.4 * np.exp(-t / 0.01))) / SR) * np.exp(-t / 0.03) * np.minimum(1, t / 0.001)


def click(d=0.025, f=3000):
    t = tt(d)
    return filt(noise(d), [f * 0.6, f * 1.6], 'band') * np.exp(-t / 0.003)


def whoosh(d=0.4, f0=300, f1=3000, peak=0.6, q=1.2):
    t = tt(d)
    u = t / d
    return sweep(noise(d), f0, f1, q) * np.where(u < peak, (u / peak) ** 2, ((1 - u) / (1 - peak)) ** 1.5)


def riser(d, f0=180, f1=1400):
    t = tt(d)
    u = t / d
    fr = f0 * (f1 / f0) ** u
    tone = np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(fr * 1.5) / SR)
    return sweep(noise(d), 300, 9000, 2.0) * u ** 2.4 * 0.8 + tone * u ** 2.6 * 0.16


def impact(d=2.0, big=1.0, body_dec=0.4):
    t = tt(d)
    f = 30 + 85 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.8 * big))
    body = filt(noise(d), 6000, 'low') * np.exp(-t / body_dec) * 0.45 + filt(noise(d), 5000, 'high') * np.exp(-t / (body_dec * 1.1)) * 0.12
    return np.tanh(1.4 * (sub + body + kick(d, 1.2)[: len(t)] * 0.5))


def typing(buf, t0, d, n, g=0.04):
    step = d / max(1, n)
    for i in range(n):
        place(buf, click(0.015, 4200 + 600 * rng.uniform(-1, 1)), t0 + i * step + rng.uniform(0, step * 0.3), g, rng.uniform(-0.3, 0.3))


# ------------------------------------------------------------------ harmonia e arranjo
# acordes: (voicing do pad, fundamental do baixo, notas do ostinato)
CH = {
    'Dm': ([50, 53, 57, 62], 38, [62, 65, 69, 74]),
    'Bb': ([46, 50, 53, 58], 34, [58, 62, 65, 70]),
    'Gm': ([43, 50, 55, 58], 31, [55, 58, 62, 67]),
    'A': ([45, 52, 57, 61], 33, [57, 61, 64, 69]),
    'C': ([48, 52, 55, 60], 36, [60, 64, 67, 72]),
    'F': ([41, 48, 53, 57], 41, [65, 69, 72, 77]),
}
PROG = {1: 'Dm', 2: 'Dm', 3: 'Dm', 4: 'Bb', 5: 'Dm', 6: 'Bb', 7: 'Gm', 8: 'A', 9: 'Dm', 10: 'C', 11: 'F', 12: 'C', 13: 'Bb', 14: 'F', 15: 'F'}
OST = [0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 3, 2, 1, 2, 1]          # ostinato em semicolcheias
BELL = 93                                                      # Lá6: a terça de Fá maior

music, drums, sfx, send = stereo(), stereo(), stereo(), stereo()
kicks = []
T_DROP, T_CLOSE, T_ZERO = SEC['drop'], SEC['close'], SEC['close'] + 2.0
T_LOCK, T_HIST, T_FIN = 21.0, SEC['history'], SEC['finale']


def add_kick(t, g=1.0):
    place(drums, kick(), t, g)
    kicks.append(t)


def ostinato(n, g=0.07, bright=2400, start=0, oct_=0):
    t0 = bar(n)
    tones = CH[PROG[n]][2]
    for s in range(start, 16):
        nt = tones[OST[s]] + oct_
        pl = string_pluck(midi(nt), 0.2, bright)
        pan = -0.35 if s % 2 else 0.35
        place(music, pl, t0 + s * S16, g * (1.0 if s % 4 == 0 else 0.75), pan)
        place(send, pl, t0 + s * S16, g * 0.35, pan)


def bass_bar(n, g=0.5, pattern=(0, 3, 6, 8, 11, 14)):
    t0 = bar(n)
    root = CH[PROG[n]][1]
    place(music, sub_bass(midi(root - 12), BAR * 0.98), t0, g * 0.8)
    for s in pattern:                                   # pulso de baixo com oitava
        nt = root + (12 if s in (6, 14) else 0)
        place(music, sub_bass(midi(nt), S16 * 1.6, 2.4), t0 + s * S16, g * 0.45)


def groove(n, full=True, fill=False, light=False, k3=True):
    """Meio-tempo de trailer: bumbo no 1 e no "e" do 2, taiko + caixa no 3, tiques de relógio em colcheias."""
    t0 = bar(n)
    add_kick(t0, 1.0)
    if not light:
        add_kick(t0 + 6 * S16, 0.8)
    place(drums, taiko(), t0 + 8 * S16, 0.62 if full else 0.4)
    place(send, taiko(), t0 + 8 * S16, 0.12)
    if full:
        place(drums, snare(0.3, 0.9), t0 + 8 * S16, 0.32)
        place(drums, clap(), t0 + 8 * S16, 0.3)
        place(send, clap(), t0 + 8 * S16, 0.14)
        if k3:
            add_kick(t0 + 10 * S16, 0.7)
    for s in range(0, 16, 2):                           # o relógio do cofre faz o chimbal
        place(drums, tick(2600 if s % 4 == 0 else 3400, 0.05, 0.9), t0 + s * S16, 0.11 if s % 4 else 0.07, 0.3 if s % 4 else -0.3)
    if fill:
        for k, s in enumerate((12, 13, 14, 15)):
            place(drums, tom(150 - k * 18), t0 + s * S16, 0.32, -0.4 + 0.27 * k)


# --- GANCHO (c.1–2): sem bateria. Drone, batida de coração grave, ostinato abrindo
place(music, pad([26, 38, 45, 50], 2 * BAR + 0.4, 700, att=0.3, rel=0.4), 0.0, 0.5)
place(music, sub_bass(midi(26), 2 * BAR), 0.0, 0.32)
for b in range(8):                                      # pulso de coração em semínimas, crescendo
    t = b * BT
    place(drums, taiko(0.5, 52), t, 0.12 + 0.03 * b)
    kicks.append(t)
hook_ost = stereo()
for s in range(32):
    nt = CH['Dm'][2][OST[s % 16]] - 12
    place(hook_ost, string_pluck(midi(nt), 0.2, 1400), s * S16, 0.06 + 0.002 * s, -0.35 if s % 2 else 0.35)
lp_auto(hook_ost, 0.0, 2 * BAR, 500, 6000)
music += hook_ost
place(sfx, riser(1.9, 160, 1500), 2.05, 0.34)
place(sfx, rev_cymbal(0.55), T_DROP - 0.6, 0.3)

# --- DROP e MARCHA (c.3–9)
for n in range(3, 10):
    groove(n, fill=n in (4, 8))
    bass_bar(n)
    ostinato(n, 0.075 if n < 5 else 0.085, 2600 if n < 7 else 3200)
    place(music, pad(CH[PROG[n]][0], BAR + 0.3, 1600, att=0.15, rel=0.3), bar(n), 0.2)
place(music, braam([26, 38, 45], 2.4), T_DROP, 0.55)
place(send, braam([26, 38, 45], 2.4), T_DROP, 0.2)
for tc in (T_DROP, bar(5), bar(9)):
    place(drums, crash(2.6), tc, 0.34, -0.2)
    place(send, crash(2.6), tc, 0.12)

# --- CONFERÊNCIA (c.10): a banda recua para as teclas e o painel; caixa acelerando até o zero
t0 = bar(10)
place(music, pad(CH['C'][0], BAR + 0.1, 1200, att=0.2, rel=0.1), t0, 0.46)
conf = stereo()
ostinato_buf = music
music = conf
ostinato(10, 0.06, 1500)                                # ostinato abafado: o tempo continua correndo
music = ostinato_buf
lp_auto(conf, t0, t0 + BAR, 900, 3000)
music += conf
place(music, sub_bass(midi(36 - 12), BAR), t0, 0.35)
add_kick(t0, 0.9)
for s in range(0, 16, 2):
    place(drums, tick(3000, 0.05, 0.8), t0 + s * S16, 0.09, 0.3)
t, k = t0 + 2 * BT, 0
while t < T_ZERO - 0.01:
    u = (t - t0 - 2 * BT) / (2 * BT)
    place(drums, snare(0.16, 0.3 + 0.7 * u), t, 0.3, 0.2 * (1 if k % 2 else -1))
    t += S16 if u < 0.5 else S16 / 2
    k += 1
place(sfx, riser(1.2, 200, 2400), T_ZERO - 1.2, 0.3)

# --- RESOLUÇÃO EM FÁ (c.11–15)
for n in range(11, 14):
    groove(n, fill=n == 13, k3=n != 11)                 # c.11: o bumbo sai do caminho das travas
    bass_bar(n, 0.5)
    ostinato(n, 0.08, 3400)
    place(music, pad(CH[PROG[n]][0] + [CH[PROG[n]][0][2] + 12], BAR + 0.3, 2000, att=0.08, rel=0.4), bar(n), 0.24)
place(drums, crash(3.0), T_ZERO, 0.4)
place(send, crash(3.0), T_ZERO, 0.15)
place(sfx, riser(1.4, 220, 2600), T_FIN - 1.4, 0.3)
place(sfx, rev_cymbal(0.7), T_FIN - 0.72, 0.3)
# assinatura (c.14–15): braam em Fá, ostinato aberto e acorde final que soa até o fim
groove(14)
bass_bar(14, 0.5)
ostinato(14, 0.07, 3600, oct_=12)
place(music, braam([29, 41, 48], 2.6, 1100), T_FIN, 0.5)
place(send, braam([29, 41, 48], 2.6, 1100), T_FIN, 0.2)
fin = pad([41, 53, 57, 60, 65, 69, 72], DUR - bar(15), 2400, att=0.05, rel=1.4)
place(music, fin, bar(15), 0.36)
place(send, fin, bar(15), 0.2)
place(music, sub_bass(midi(29), DUR - bar(15)), bar(15), 0.4)
add_kick(bar(15), 1.0)
place(drums, taiko(1.4, 55), bar(15), 0.55)
place(drums, crash(3.4), bar(15), 0.35)
place(send, crash(3.4), bar(15), 0.16)
for i, nt in enumerate([77, 81, 84, 89, 93]):         # arpejo final de sinos em Fá
    place(music, bell(midi(nt), 1.6), bar(15) + 0.25 + i * S16, 0.06, -0.5 + 0.25 * i)
    place(send, bell(midi(nt), 1.6), bar(15) + 0.25 + i * S16, 0.05)

# side-chain do bumbo
duck = np.ones(N)
for t in kicks:
    i = int(t * SR)
    j = min(N, i + int(0.28 * SR))
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.45 * np.exp(-np.arange(j - i) / SR / 0.07))
music *= duck

# ------------------------------------------------------------------ efeitos (a partir dos cues)
DM_PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84]


def fx(c):
    t, ty, pan, d, k = c['t'], c['type'], c.get('pan', 0.0), c.get('d', 0.3), c.get('k', 0)
    if ty == 'tick':
        place(sfx, tick(2400 + 120 * (k % 4), 0.06, 1.0), t, 0.22, -0.2 + 0.4 * (k % 2))
        place(sfx, click(0.02, 1800), t, 0.08)
    elif ty == 'wheel':
        unl = [x['t'] - t for x in CUES if x['type'] == 'unlock']
        place(sfx, ratchet(d, avoid=unl), t, 0.09, 0.15)
    elif ty == 'unlock':
        place(sfx, clank(80 + 6 * k, 0.6, 1.0), t, 0.42, pan)
        place(send, clank(80 + 6 * k, 0.6, 1.0), t, 0.12, pan)
    elif ty == 'crack':
        place(sfx, hiss(d + 0.4, 0.4), t, 0.3)
        place(sfx, whoosh(0.5, 120, 600, 0.6, 0.8), t, 0.3)
    elif ty == 'drop':
        place(sfx, impact(2.6, 1.3), t, 0.85)
        place(send, impact(2.6, 1.3), t, 0.25)
        place(sfx, whoosh(1.0, 3000, 200, 0.12, 0.9), t, 0.3)
        place(sfx, hiss(1.0, 0.1), t, 0.2)
    elif ty == 'slam':
        place(sfx, impact(1.0, 0.5), t, 0.38)
        place(drums, snare(0.25, 1.0), t, 0.3)
        place(send, snare(0.25, 1.0), t, 0.1)
    elif ty == 'shutter':
        for i in range(12):
            place(sfx, clank(240 + 30 * (i % 3), 0.12, 0.6), t + i * d / 12, 0.05, -0.6 + 0.1 * i)
        place(sfx, whoosh(d + 0.1, 600 if c.get('open') else 2400, 2400 if c.get('open') else 500, 0.5, 1.0), t, 0.18)
    elif ty == 'drawer':
        place(sfx, drawer_slide(0.38), t - 0.36, 0.3)
        place(sfx, clank(70, 0.5, 0.6), t, 0.4)
        place(sfx, coins(0.6, 12), t + 0.01, 0.35)
    elif ty == 'flaps':
        times = c['times']
        last = -1
        for x in times:
            if x - last < 0.004:
                continue
            place(sfx, flap_click(), x, 0.11 if not c.get('out') else 0.09, rng.uniform(-0.4, 0.4))
            last = x
    elif ty == 'stamp':
        place(sfx, clank(110 if c.get('closed') else 150, 0.35, 0.4), t, 0.28)
        place(sfx, blip(midi(74 if c.get('closed') else 81), 0.14), t, 0.08)
    elif ty == 'whip':
        place(sfx, whoosh(d + 0.12, 300, 4500, 0.55, 1.0), t - 0.04, 0.4)
    elif ty == 'tube':
        place_pan(sfx, pneumatic(d), t, 0.45, c.get('p0', 0.0), 0.0)
    elif ty == 'arrive':
        place(sfx, thunk(), t, 0.5)
        place(sfx, hiss(0.35, 0.05), t + 0.02, 0.12)
        nt = [62, 69, 74][k]
        place(sfx, bell(midi(nt + 12), 0.9, 0.6), t + 0.02, 0.07)
        place(send, bell(midi(nt + 12), 0.9, 0.6), t + 0.02, 0.06)
    elif ty == 'row':
        place(sfx, click(0.03, 2400), t, 0.18)
        place(sfx, whoosh(0.3, 2000, 500, 0.4, 1.2), t, 0.1)
    elif ty == 'chip':
        place(sfx, pop(700 + 120 * k), t, 0.16)
        place(sfx, blip(midi(DM_PENTA[3 + k]), 0.1), t, 0.05)
    elif ty == 'sort':
        place(sfx, whoosh(d, 2500, 700, 0.3, 1.4), t, 0.16, 0.5)
    elif ty == 'cashdrop':
        place(sfx, whoosh(d, 2000, 300, 0.5, 1.2), t, 0.18)
        place(sfx, clank(90, 0.4, 0.5), t + d, 0.32)
        place(sfx, coins(0.5, 8), t + d, 0.3)
    elif ty == 'settle':
        for i, nt in enumerate([62, 69, 74]):
            place(sfx, bell(midi(nt + 12), 1.0), t + i * 0.05, 0.07)
            place(send, bell(midi(nt + 12), 1.0), t + i * 0.05, 0.05)
    elif ty == 'key':
        place(sfx, keypress(1400 + 120 * k), t, 0.32, 0.25)
    elif ty == 'spin':
        for x in c['times']:
            place(sfx, flap_click(), x, 0.08, rng.uniform(-0.5, 0.5))
    elif ty == 'zero':
        place(sfx, impact(2.4, 1.1), t, 0.7)
        place(send, impact(2.4, 1.1), t, 0.2)
        for i, nt in enumerate([77, 81, 84, 89]):        # "bateu": arpejo de Fá maior
            place(sfx, bell(midi(nt), 1.4), t + 0.03 + i * 0.045, 0.12, -0.4 + 0.27 * i)
            place(send, bell(midi(nt), 1.4), t + 0.03 + i * 0.045, 0.08)
    elif ty == 'zoomout':
        place(sfx, whoosh(d + 0.1, 3500, 400, 0.3, 1.2), t, 0.26)
    elif ty == 'swing':
        place(sfx, whoosh(d + 0.05, 150, 900, 0.85, 0.8), t, 0.4)
        place(sfx, hiss(d, 0.9), t, 0.12)
    elif ty == 'boom':
        # estrondo com corpo curto: o grave fica, o ruído sai do caminho das travas que vêm logo depois
        place(sfx, impact(3.0, 1.5, 0.1), t, 0.9)
        place(send, impact(3.0, 1.5, 0.1), t, 0.25)
        place(sfx, clank(55, 0.6, 1.2), t, 0.5)
        place(send, clank(55, 0.6, 1.2), t, 0.2)
    elif ty == 'lock':
        place(sfx, clank(72 + 5 * k, 0.55, 1.0), t, 0.55, pan)
        place(sfx, clank(72 + 5 * k, 0.55, 1.0), t, 0.35, -pan)
        place(sfx, click(0.02, 4000), t, 0.5)
        place(sfx, tick(3200, 0.05, 1.2), t, 0.3)
    elif ty == 'pull':
        place(sfx, whoosh(d + 0.3, 2400, 180, 0.25, 0.8), t, 0.34)
        place(sfx, hiss(d, 0.3), t, 0.08)
    elif ty == 'dive':
        place(sfx, whoosh(d + 0.05, 200, 4200, 0.88, 0.9), t, 0.4)
    elif ty == 'logo':
        place(sfx, impact(2.6, 1.2), t, 0.6)
        place(send, impact(2.6, 1.2), t, 0.2)
        place(drums, crash(3.2), t, 0.36)
        place(send, crash(3.2), t, 0.14)
        b = desk_bell(midi(BELL))
        place(sfx, b, t, 0.55)
        place(send, b, t, 0.3)
    elif ty == 'rise':
        place(sfx, whoosh(0.26, 700, 3200, 0.7, 1.6), t, 0.08)
    elif ty == 'type':
        typing(sfx, t, d, c.get('n', 12) // 2)
    elif ty == 'domain':
        for i, nt in enumerate([77, 81, 84, 89, 93]):
            place(sfx, blip(midi(nt), 0.16), t + i * 0.06, 0.06, -0.4 + 0.2 * i)
            place(send, blip(midi(nt), 0.16), t + i * 0.06, 0.05)
    elif ty == 'glint':
        for i in range(8):
            nt = [89, 93, 96, 101, 96, 101, 105, 108][i]
            place(sfx, blip(midi(nt), 0.18), t + i * d / 8, 0.035, -0.7 + 0.2 * i)
            place(send, blip(midi(nt), 0.18), t + i * d / 8, 0.035)
    else:
        raise ValueError('cue desconhecido: ' + ty)


for c in CUES:
    fx(c)

# ------------------------------------------------------------------ reverb + master
send += sfx * 0.12 + music * 0.1
wet = np.stack([fftconvolve(send[0], ir_norm(2.6, 7))[:N], fftconvolve(send[1], ir_norm(2.6, 8))[:N]])
mix = music * 0.72 + drums * 0.8 + sfx * 0.95 + wet * 0.55
t = np.arange(N) / SR
mix *= np.clip((DUR - t) / 0.9, 0, 1)
mix *= np.clip(t / 0.002, 0, 1)
mix = filt(mix, 28, 'high')
mix = mix + 0.25 * filt(mix, 3500, 'high')               # presença para alto-falante de celular
mix = filt(mix, 15500, 'low', 4)                          # sem energia perto de Nyquist: o AAC não estoura o pico
body = np.percentile(np.abs(mix), 99.7)
mix = np.tanh(mix / body * 0.85) * 0.8

raw = os.path.join(ROOT, 'audio', '.trilha-raw.wav')
out = os.path.join(ROOT, 'audio', 'trilha.wav')
wavfile.write(raw, SR, (mix.T * 32767).astype(np.int16))
meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                      capture_output=True, text=True).stderr
js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
      f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-c:a', 'pcm_s16le', out], check=True)
os.remove(raw)


def true_peak_limit(x, ceiling_db=-3.2, os_=4):
    """Limitador de pico real: o ganho é calculado no sinal sobreamostrado (os_ x) com
    antecipação de 2 ms e suavização de 1 ms, e aplicado ao sinal original."""
    c = 10 ** (ceiling_db / 20)
    up = resample_poly(x, os_, 1, axis=0)
    need = np.minimum(1.0, c / np.maximum(np.abs(up).max(axis=1), 1e-9))
    w = int(0.002 * SR * os_)
    g = uniform_filter1d(minimum_filter1d(need, w), w // 2)
    g = g[: len(g) // os_ * os_].reshape(-1, os_).min(axis=1)
    return x[: len(g)] * g[:, None]


x = wavfile.read(out)[1].astype(np.float64) / 32768
lim = true_peak_limit(x)
if len(lim) < len(x):
    lim = np.concatenate([lim, np.zeros((len(x) - len(lim), 2))])
wavfile.write(out, SR, np.round(lim * 32767).astype(np.int16))
print('ok ->', out, '| entrada', js['input_i'], 'LUFS |', len(CUES), 'cues')
