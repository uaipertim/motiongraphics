#!/usr/bin/env python3
"""
Trilha + efeitos do Reel 06 "Em equilíbrio" — 100% sintetizados (numpy/scipy).

Pulso de precisão a 104 BPM, em Dó menor, que resolve em Mi bemol maior no
instante em que a balança fica nivelada (saldo zerado). Um ostinato de pluck
FM em semicolcheias (o "mecanismo" da balança), piano abafado, baixo em
contratempo e bateria seca. Os efeitos vêm da própria balança: o total que
desaba no prato, o braço que balança, os tiques do ponteiro, os dígitos que se
juntam, o prisma que gira e escolhe a forma de pagamento, a confirmação do
recebimento e cada bloco que pousa. A sineta de recepção da série, afinada em
Sol (a terça de Mi bemol maior), anuncia a marca.

A sincronia vem da animação: cues: 53 eventos -> /home/user/motiongraphics/reels/reel-06/audio/cues.json exporta
audio/cues.json e este script coloca cada som exatamente nesses instantes.

    python3 scripts/audio.py   -> audio/trilha.wav (48 kHz, estéreo, -14 LUFS, pico real ≤ -3,6 dBTP antes do AAC)
"""
import json
import os
import subprocess
import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly, lfilter
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
N = int(round(SR * DUR))                         # duração exata do vídeo: o mux não corta quadros
rng = np.random.default_rng(6006)


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


def ir_norm(d=2.8, seed=0, damp=0.8, lp=6500):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = filt(r.standard_normal(len(t)) * np.exp(-t / damp), lp, 'low')
    return x / np.sqrt((x ** 2).sum())


# ------------------------------------------------------------------ percussão (house orgânico)
def kick(d=0.42, punch=1.0, tone=48):
    t = tt(d)
    f = tone + 150 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    click = filt(noise(d), 3000, 'high') * np.exp(-t / 0.002) * 0.45
    return np.tanh(2.4 * punch * (body + click)) * np.clip((d - t) / 0.02, 0, 1)


def clap(d=0.35):
    t = tt(d)
    n = filt(noise(d), [900, 7500], 'band')
    env = np.zeros_like(t)
    for k, o in enumerate([0, 0.009, 0.019, 0.03]):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.004 if k < 3 else 0.12))
    return n * env


def shaker(v=1.0):
    d = 0.09
    t = tt(d)
    env = np.minimum(1, t / 0.006) * np.exp(-t / 0.028)
    return filt(noise(d), [4500, 13000], 'band') * env * v


def hat_open(d=0.24):
    t = tt(d)
    return filt(noise(d), 7000, 'high') * np.exp(-t / 0.075) * np.minimum(1, t / 0.001)


def conga(f0=220, d=0.3, slap=0.3):
    t = tt(d)
    f = f0 * (1 + 0.25 * np.exp(-t / 0.012))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) + 0.25 * np.sin(2 * np.pi * np.cumsum(f * 1.58) / SR) * np.exp(-t / 0.05)
    s += filt(noise(d), [1200, 6000], 'band') * np.exp(-t / 0.006) * slap
    return s * np.minimum(1, t / 0.0008)


def wood(f=1900, d=0.06):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.63 * t)) * np.exp(-t / 0.012) * np.minimum(1, t / 0.0005)


def crash(d=2.6, v=1.0):
    t = tt(d)
    s = filt(noise(d), 4500, 'high') * np.exp(-t / 0.9) + filt(noise(d), [2500, 9000], 'band') * np.exp(-t / 0.35) * 0.6
    return s * v * np.minimum(1, t / 0.002)


def rev_cymbal(d=0.9):
    return crash(d + 0.1)[: int(d * SR)][::-1] * np.linspace(0, 1, int(d * SR)) ** 2


# ------------------------------------------------------------------ instrumentos
_KS = {}


def ks(n, d=1.6, bright=0.55, t60=2.4, var=0):
    """Violão de nylon por Karplus-Strong (laço com passa-baixa de média e passa-tudo para afinação fina)."""
    key = (n, round(d, 2), round(bright, 2), round(t60, 2), var)
    if key in _KS:
        return _KS[key]
    f = midi(n)
    P = SR / f
    L = int(np.floor(P - 0.5 - 0.1))
    delta = P - 0.5 - L
    a = (1 - delta) / (1 + delta)
    g = np.exp(np.log(0.001) / (f * t60))
    r = np.random.default_rng(n * 31 + var)
    x = np.zeros(int(d * SR))
    burst = filt(r.uniform(-1, 1, L + 2), 600 + 7400 * bright)
    x[: len(burst)] = burst
    den = np.zeros(L + 3)
    den[0], den[1] = 1.0, a
    den[L] -= g * a / 2
    den[L + 1] -= g * (1 + a) / 2
    den[L + 2] -= g / 2
    y = lfilter([1.0, a], den, x)
    y = filt(y, 60, 'high')
    y = y / (np.abs(y).max() + 1e-9) * np.clip((d - tt(d)) / 0.05, 0, 1)
    _KS[key] = y
    return y


def kalimba(f, d=1.6):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.6) + 0.22 * np.sin(2 * np.pi * f * 5.95 * t) * np.exp(-t / 0.05)
    s += 0.12 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.13)
    s += filt(noise(d), [2000, 8000], 'band') * np.exp(-t / 0.002) * 0.25
    return s * np.minimum(1, t / 0.0012)


def saw_bl(f, t, bright, ph=0.0):
    kmax = max(2, int(min(SR / 2 - 800, bright * 2.5) / f))
    k = np.arange(1, kmax + 1)[:, None]
    return (np.sin(2 * np.pi * f * k * t[None, :] + ph * k) * ((1 / k) * np.exp(-(k * f) / bright))).sum(0)


def pad(notes, d, bright=1100, att=0.6, rel=0.8):
    t = tt(d)
    out = np.zeros((2, len(t)))
    for n in notes:
        for k, dt in enumerate((-0.005, 0.0, 0.0055)):
            s = saw_bl(midi(n) * (1 + dt), t, bright, rng.uniform(0, 6.28))
            pan = (k - 1) * 0.75
            out[0] += s * np.cos((pan + 1) * np.pi / 4)
            out[1] += s * np.sin((pan + 1) * np.pi / 4)
    env = np.clip(t / att, 0, 1) ** 2 * np.clip((d - t) / rel, 0, 1)
    return out * env / (len(notes) * 3)


def sub_bass(f, d, drive=1.5):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.2 * saw_bl(f, t, 450)
    return np.tanh(drive * s) / np.tanh(drive) * np.minimum(1, t / 0.01) * np.clip((d - t) / 0.06, 0, 1)


def pluck_bass(f, d=0.3):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * saw_bl(f, t, 600 + 1400 * 0.5) * np.exp(-t / 0.06)
    return np.tanh(1.4 * s) * np.exp(-t / 0.22) * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.03, 0, 1)


def bell(f, d=1.6, bright=1.0):
    t = tt(d)
    idx = 1.4 * bright * np.exp(-t / 0.5)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) + 0.35 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.4)
    return s * np.minimum(1, t / 0.002) * np.exp(-t / 0.7)


def chime(f, d=2.0):
    """Sininho de vidro (estrela): parciais altos, ataque limpo, cauda longa."""
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
            for m, a, dec in [(1.0, 1.0, 0.9), (2.76, 0.35, 0.3), (5.4, 0.18, 0.12), (8.93, 0.08, 0.06)])
    return s * np.minimum(1, t / 0.0008)


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


def glide(f0, f1, d, dec=None):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    env = np.minimum(1, t / 0.01) * (np.exp(-t / dec) if dec else np.clip((d - t) / (0.3 * d), 0, 1))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env


def typing(buf, t0, d, n, g=0.04):
    step = d / max(1, n)
    for i in range(n):
        place(buf, click(0.015, 4200 + 600 * rng.uniform(-1, 1)), t0 + i * step + rng.uniform(0, step * 0.3), g, rng.uniform(-0.3, 0.3))



# ------------------------------------------------------------------ timbres deste Reel
def snare(d=0.2, v=1.0):
    t = tt(d)
    return (filt(noise(d), [1500, 9000], 'band') * np.exp(-t / 0.07) + np.sin(2 * np.pi * np.cumsum(190 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.05) * 0.6) * v * np.minimum(1, t / 0.002)


def fm_pluck(f, d=0.45, idx=2.4, ratio=2.0, dec=0.16):
    """Pluck de vidro (FM): o mecanismo de precisão da balança."""
    t = tt(d)
    I = idx * np.exp(-t / 0.045)
    s = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t / dec)
    return s * np.minimum(1, t / 0.0015)


def piano(f, d=2.4, v=1.0):
    """Piano abafado (parciais levemente inarmônicos, martelo macio)."""
    t = tt(d)
    s = np.zeros_like(t)
    for k, a in [(1, 1.0), (2, 0.42), (3, 0.2), (4, 0.1), (5, 0.06)]:
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        s += a * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6)) * np.exp(-t * (0.8 + 0.7 * k) / (1 + f / 900))
    s += filt(noise(d), [600, 3500], 'band') * np.exp(-t / 0.008) * 0.06
    return filt(s, 3200, 'low') * np.minimum(1, t / 0.004) * v * 0.6


def clank(f0=95, d=0.6, metal=1.0):
    """Peso de metal pousando: baque grave + parciais inarmônicos."""
    t = tt(d)
    s = np.sin(2 * np.pi * np.cumsum(f0 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.09)
    for m, a, dec in [(4.1, 0.35, 0.11), (6.3, 0.3, 0.09), (9.7, 0.22, 0.07), (13.2, 0.15, 0.05)]:
        s += a * metal * np.sin(2 * np.pi * f0 * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    s += filt(noise(d), [1500, 8000], 'band') * np.exp(-t / 0.006) * 0.9
    return np.tanh(1.5 * s)


def tick(f=3200, d=0.03, v=1.0):
    """Tique fino do ponteiro."""
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + filt(noise(d), [3000, 9000], 'band') * np.exp(-t / 0.002) * 0.6) * v


def ratchet(d, n=18):
    """O prisma girando: cliques que desaceleram até parar."""
    out = np.zeros(int(d * SR) + 4000)
    for i in range(n):
        u = (i / n) ** 1.8
        i0 = int(u * d * SR)
        c = tick(2200 + 900 * (1 - u), 0.03, 0.6 + 0.4 * (1 - u))
        out[i0:i0 + len(c)] += c
    return out


# ------------------------------------------------------------------ harmonia e arranjo
CH = {
    'Cm9': ([48, 51, 55, 58, 62], 36, [60, 63, 67, 70, 74]),
    'Abmaj7': ([44, 51, 55, 60, 63], 32, [56, 60, 63, 67, 72]),
    'Fm9': ([41, 48, 51, 55, 56], 29, [53, 56, 60, 63, 67]),
    'Bbsus': ([46, 53, 58, 63, 65], 34, [58, 63, 65, 70, 75]),
    'Bb': ([46, 53, 58, 62, 65], 34, [58, 62, 65, 70, 74]),
    'Ebmaj9': ([39, 51, 55, 58, 62, 65], 39, [63, 67, 70, 74, 77]),
    'Abmaj9': ([44, 51, 55, 58, 60], 32, [56, 60, 63, 67, 70]),
    'Ebadd9': ([39, 51, 55, 58, 63, 65, 70], 39, [63, 67, 70, 75, 77]),
}
PROG = {1: 'Cm9', 2: 'Abmaj7', 3: 'Fm9', 4: 'Bb', 5: 'Ebmaj9', 6: 'Abmaj9', 7: 'Cm9', 8: 'Bb', 9: 'Ebadd9', 10: 'Ebadd9', 11: 'Ebadd9'}
ARP = [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 1, 3, 2, 4, 3, 2]
BELL = 91                                                      # Sol6: a terça de Mi bemol maior

music, drums, sfx, send = stereo(), stereo(), stereo(), stereo()
kicks = []
T_LAND1, T_EQ, T_MARCA, T_SITE = SEC['parcial'], SEC['equilibrio'], SEC['marca'], SEC['site']


def add_kick(t, g=1.0):
    place(drums, kick(0.42, 1.0, 46), t, g)
    kicks.append(t)


def arp(n, g=0.09, bright=2.4, start=0, end=16, oct_=0, buf=None):
    buf = music if buf is None else buf
    t0 = bar(n)
    tones = CH[PROG[n]][2]
    for s in range(start, end):
        nt = tones[ARP[s] % len(tones)] + oct_
        pl = fm_pluck(midi(nt), 0.42, bright)
        pan = -0.4 + 0.8 * ((s * 3) % 5) / 4
        place(buf, pl, t0 + s * S16, g * (1.0 if s % 4 == 0 else 0.7), pan)
        place(send, pl, t0 + s * S16, g * 0.25, pan)


def chord(n, g=0.22, dur=None, bright=1300, att=0.3, beat=0.0):
    nts = CH[PROG[n]][0]
    d = dur or BAR + 0.4
    place(music, pad(nts, d, bright, att=att, rel=0.4), bar(n, beat), g)


def keys(n, g=0.16, beats=(0,)):
    nts = CH[PROG[n]][0]
    for b in beats:
        for k, nt in enumerate(nts[1:]):
            place(music, piano(midi(nt + 12), 2.2, 0.8), bar(n, b) + k * 0.012, g, -0.3 + 0.15 * k)


def bass(n, g=0.5, pattern=(2, 6, 10, 14), sub=True):
    t0 = bar(n)
    root = CH[PROG[n]][1]
    if sub:
        place(music, sub_bass(midi(root), BAR * 0.98), t0, g * 0.5)
    for s in pattern:
        place(music, pluck_bass(midi(root + 12), S16 * 1.8), t0 + s * S16, g * 0.42)


def groove(n, full=True, perc=1.0, clap_on=True):
    t0 = bar(n)
    for b in (0, 2) if not full else (0, 1.5, 2):
        add_kick(t0 + b * BT, 0.6 if b == 0 else 0.5)
    if clap_on:
        for b in (1, 3):
            place(drums, clap(), t0 + b * BT, 0.28, 0.05)
            place(send, clap(), t0 + b * BT, 0.1)
    for s in range(16):
        place(drums, shaker(1.0 if s % 4 == 2 else 0.5), t0 + s * S16, 0.11 * perc, 0.35)
    for b in range(4):
        place(drums, hat_open(0.18), t0 + b * BT + 2 * S16, 0.07 * perc, -0.3)


# c.1 — o gancho: só o grave e o piano no golpe do total; o ostinato aparece no fim do compasso
place(music, sub_bass(midi(24), BAR + 0.3), 0.0, 0.26)
keys(1, 0.2, beats=(1,))
chord(1, 0.16, bright=900, att=0.5, beat=1)
c1 = stereo()
arp(1, 0.07, 1.2, start=8, buf=c1)
lp_auto(c1, bar(1, 2), bar(2), 700, 3500)
music += c1
# c.2 — registrar: o ostinato completo, bumbo leve
arp(2, 0.08, 2.0)
chord(2, 0.18, bright=1200)
keys(2, 0.14)
place(music, sub_bass(midi(CH['Abmaj7'][1]), BAR), bar(2), 0.3)
for b in (0, 2):
    add_kick(bar(2, b), 0.42)
for s in range(0, 16, 2):
    place(drums, shaker(0.6), bar(2) + s * S16, 0.09, 0.35)
# c.3–4 — parcial e diárias: o groove entra
for n in (3, 4):
    groove(n)
    bass(n)
    arp(n, 0.085, 2.4)
    chord(n, 0.2, bright=1500)
keys(3, 0.14)
place(sfx, riser(1.6, 180, 1800), SEC['equilibrio'] - 1.6, 0.22)
for k, s in enumerate(range(12, 16)):
    place(drums, snare(0.18, 0.4 + 0.15 * k), bar(4) + s * S16, 0.18, 0.1)
place(sfx, rev_cymbal(0.62), T_EQ - 0.66, 0.22)
# c.5 — equilíbrio: Mi bemol maior, tudo abre
for n in (5, 6, 7):
    groove(n, perc=1.0 if n != 7 else 0.85)
    bass(n, 0.52)
    arp(n, 0.09, 3.0 if n == 5 else 2.6, oct_=12 if n == 5 else 0)
    chord(n, 0.24, bright=1900 if n == 5 else 1500, att=0.1)
keys(5, 0.18)
keys(7, 0.12)
place(drums, crash(2.8), T_EQ, 0.3, -0.2)
place(send, crash(2.8), T_EQ, 0.12)
# c.8 — a ordem: o groove afina e sobe até a marca
c8 = stereo()
arp(8, 0.09, 2.4, buf=c8)
lp_auto(c8, bar(8), bar(9), 900, 6000)
music += c8
chord(8, 0.22, bright=1400)
bass(8, 0.45)
for b in range(4):
    add_kick(bar(8, b), 0.4 + 0.08 * b)
for s in range(16):
    place(drums, shaker(0.5 + 0.03 * s), bar(8) + s * S16, 0.1, 0.35)
place(sfx, rev_cymbal(0.7), T_MARCA - 0.74, 0.26)
# c.9–11 — a marca: o acorde final em Mi bemol (com 9ª) e um groove leve até o fim
fin = pad(CH['Ebadd9'][0], DUR - bar(9), 2200, att=0.04, rel=1.6)
place(music, fin, bar(9), 0.3)
place(send, fin, bar(9), 0.16)
place(music, sub_bass(midi(39), DUR - bar(9)), bar(9), 0.32)
keys(9, 0.16)
for n in (9, 10):
    for b in (0, 2):
        add_kick(bar(n, b), 0.45)
    for b in (1, 3):
        place(drums, clap(), bar(n, b), 0.18, 0.05)
    for s in range(0, 16, 2):
        place(drums, shaker(0.6), bar(n) + s * S16, 0.08, 0.35)
    arp(n, 0.06, 2.0, end=8 if n == 10 else 16, oct_=12)
add_kick(bar(11), 0.4)
for i, nt in enumerate([75, 79, 82, 87, 91]):           # arpejo final em Mi bemol
    place(music, chime(midi(nt), 2.2), bar(11) + 0.2 + i * S16, 0.05, -0.5 + 0.25 * i)
    place(send, chime(midi(nt), 2.2), bar(11) + 0.2 + i * S16, 0.05)

duck = np.ones(N)
for t in kicks:
    i = int(t * SR)
    j = min(N, i + int(0.3 * SR))
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.38 * np.exp(-np.arange(j - i) / SR / 0.08))
music *= duck


# ------------------------------------------------------------------ efeitos (a partir dos cues)
def fx(c):
    t, ty, d, k = c['t'], c['type'], c.get('d', 0.3), c.get('k', 0)
    if ty == 'fall':
        place(sfx, whoosh(d + 0.1, 2600, 300, 0.8, 1.0), t - 0.05, 0.22, -0.4)
    elif ty == 'slam':
        place(sfx, impact(2.6, 1.3), t, 0.7, -0.3)
        place(send, impact(2.6, 1.3), t, 0.2)
        place(sfx, clank(70, 0.7, 1.1), t, 0.45, -0.4)
        place(send, clank(70, 0.7, 1.1), t, 0.15)
    elif ty == 'swing':
        amp = c.get('amp', 1.0)
        place(sfx, whoosh(0.5, 200, 900, 0.4, 0.8), t, 0.12 * amp)
        for i in range(10):                                  # o ponteiro varre o mostrador
            u = i / 10
            place(sfx, tick(3400 - 900 * u, 0.03, 1 - 0.8 * u), t + 0.04 + d * u ** 1.5, 0.07 * amp, 0.1)
    elif ty == 'rise':
        place(sfx, whoosh(0.26, 700, 3200, 0.7, 1.6), t, 0.07)
    elif ty == 'ledger':
        for i in range(3):
            place(sfx, tick(2400 + 300 * i, 0.03, 0.7), t + i * 0.07, 0.08, 0.2)
    elif ty == 'digits':
        n = c.get('n', 8)
        for i in range(n):
            place(sfx, blip(midi(84 + (i * 5) % 12), 0.08), t + d * i / n, 0.035, -0.5 + i / n)
            place(sfx, click(0.012, 5200), t + d * i / n + 0.02, 0.05, -0.5 + i / n)
    elif ty == 'extrude':
        place(sfx, whoosh(d, 900, 160, 0.6, 1.0), t, 0.16)
        place(sfx, clank(140, 0.3, 0.4), t + d, 0.16)
    elif ty == 'prism':
        place(sfx, ratchet(d, 16), t, 0.2, 0.2)
        place(sfx, whoosh(d, 400, 2200, 0.3, 1.2), t, 0.1, 0.2)
    elif ty == 'select':
        place(sfx, clank(180, 0.25, 0.5), t, 0.26, 0.2)
        place(sfx, bell(midi([79, 82, 84][k]), 1.0), t + 0.01, 0.07, 0.2)
        place(send, bell(midi([79, 82, 84][k]), 1.0), t + 0.01, 0.05)
    elif ty == 'confirm':
        place(sfx, click(0.02, 3000), t, 0.3, 0.2)
        place(sfx, fm_pluck(midi(79), 0.6, 1.6), t, 0.12, 0.2)
        place(sfx, fm_pluck(midi(86), 0.8, 1.6), t + 0.09, 0.12, 0.2)
        place(send, fm_pluck(midi(86), 0.8, 1.6), t + 0.09, 0.08)
    elif ty == 'drop':
        place(sfx, whoosh(d, 3000, 400, 0.85, 1.0), t, 0.2, 0.3)
    elif ty == 'land':
        big = 1.25 if c.get('final') else 0.9
        place(sfx, impact(2.2, big), t, 0.6 if c.get('final') else 0.48, 0.3)
        place(send, impact(2.2, big), t, 0.16)
        place(sfx, clank(90 if c.get('final') else 110, 0.6, 0.9), t, 0.4, 0.35)
    elif ty == 'quitada':
        for i, nt in enumerate([75, 79, 82, 87]):           # Mi bemol maior: a conta fechou
            place(sfx, chime(midi(nt), 2.0), t + i * 0.045, 0.09, -0.4 + 0.27 * i)
            place(send, chime(midi(nt), 2.0), t + i * 0.045, 0.07)
        place(sfx, pop(760), t, 0.18)
        place(sfx, click(0.02, 3400), t, 0.22)
    elif ty == 'laser':
        place_pan(sfx, whoosh(d + 0.3, 2000, 9000, 0.3, 2.0), t, 0.12, -0.9, 0.9)
        place(sfx, glide(1800, 3600, d + 0.2, 0.3) * 0.3, t, 0.05)
    elif ty == 'travel':
        place_pan(sfx, whoosh(d + 0.15, 250, 2600, 0.55, 0.9), t, 0.3, -0.7 * c.get('dir', 1), 0.7 * c.get('dir', 1))
    elif ty == 'record':
        place(sfx, pop(520 + 60 * k), t, 0.18)
        place(sfx, click(0.02, 2600), t, 0.14)
        place(sfx, fm_pluck(midi([75, 79, 82, 87, 91][k % 5]), 0.6, 1.8), t, 0.1, -0.4 + 0.2 * k)
        place(send, fm_pluck(midi([75, 79, 82, 87, 91][k % 5]), 0.6, 1.8), t, 0.06)
        place(sfx, whoosh(0.36, 2400, 600, 0.6, 1.2), t - 0.36, 0.08)
    elif ty == 'crane':
        place(sfx, whoosh(d + 0.2, 200, 3000, 0.6, 0.8), t, 0.24)
    elif ty == 'logofall':
        place(sfx, riser(d + 0.05, 260, 2600), t - 0.05, 0.26)
    elif ty == 'logo':
        place(sfx, impact(2.8, 1.2), t, 0.55)
        place(send, impact(2.8, 1.2), t, 0.18)
        place(drums, crash(3.2), t, 0.3)
        place(send, crash(3.2), t, 0.12)
        b = desk_bell(midi(BELL))
        place(sfx, b, t, 0.55)
        place(send, b, t, 0.3)
    elif ty == 'type':
        typing(sfx, t, d, c.get('n', 12) // 2)
    elif ty == 'site':
        place(sfx, whoosh(0.3, 900, 3600, 0.7, 1.4), t, 0.08)
    elif ty == 'domain':
        for i, nt in enumerate([75, 79, 82, 87, 91]):
            place(sfx, blip(midi(nt), 0.16), t + i * 0.06, 0.06, -0.4 + 0.2 * i)
            place(send, blip(midi(nt), 0.16), t + i * 0.06, 0.05)
    elif ty == 'glint':
        for i in range(8):
            nt = [87, 91, 94, 99, 94, 99, 103, 106][i]
            place(sfx, blip(midi(nt), 0.18), t + i * d / 8, 0.03, -0.7 + 0.2 * i)
            place(send, blip(midi(nt), 0.18), t + i * d / 8, 0.03)
    else:
        raise ValueError('cue desconhecido: ' + ty)


for c in CUES:
    fx(c)

# ------------------------------------------------------------------ reverb + master
if os.environ.get('STEMS'):                              # depuração: grava as trilhas separadas
    for nm, b in (('music', music), ('drums', drums), ('sfx', sfx)):
        wavfile.write(os.path.join(os.environ['STEMS'], nm + '.wav'), SR, (np.clip(b.T * 0.5, -1, 1) * 32767).astype(np.int16))
send += sfx * 0.12 + music * 0.1
wet = np.stack([fftconvolve(send[0], ir_norm(2.8, 7))[:N], fftconvolve(send[1], ir_norm(2.8, 8))[:N]])
mix = music * 0.74 + drums * 0.8 + sfx * 0.95 + wet * 0.5
t = np.arange(N) / SR
mix *= np.clip((DUR - t) / 1.2, 0, 1)
mix *= np.clip(t / 0.002, 0, 1)
mix = filt(mix, 28, 'high')
mix = mix + 0.22 * filt(mix, 3500, 'high')               # presença para alto-falante de celular
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


def true_peak_limit(x, ceiling_db=-3.6, os_=4):
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
