#!/usr/bin/env python3
"""
Trilha + efeitos do Reel 05 "Da chegada à saída" — 100% sintetizados (numpy/scipy).

House orgânico a 100 BPM em Sol maior, acompanhando um dia inteiro na pousada:
grilos e um acorde suspenso na madrugada, o sol nasce num "bloom" de sinos, o
violão (Karplus-Strong) entra com o carro chegando e o groove abre no CHECK-IN,
quando o hóspede toca a sineta da recepção. À noite a banda recua para kalimbas
(as lanternas da comanda viram estrelas, cada uma com sua nota), de manhã voltam
os pássaros e o groove; o Pix soa, o recibo sai, o carro parte com o clarão dos
faróis e a sineta da série, afinada em Si (a terça de Sol), anuncia a marca.

A sincronia vem da animação: `node scripts/render.cjs cues` exporta
audio/cues.json e este script coloca cada som exatamente nesses instantes.

    python3 scripts/audio.py   -> audio/trilha.wav (48 kHz, estéreo, -14 LUFS, pico real ≤ -2,2 dBTP antes do AAC)
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
N = int(SR * DUR)
rng = np.random.default_rng(5005)


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


# ------------------------------------------------------------------ natureza e o carro
def crickets(d, n=6, seed=1):
    """Grilos: trens de pulsos agudos em rajadas, cada um com seu ritmo e posição."""
    r = np.random.default_rng(seed)
    out = np.zeros((2, int(d * SR) + SR))
    for _ in range(n):
        f, pan, rate = r.uniform(4300, 5600), r.uniform(-0.8, 0.8), r.uniform(2.2, 3.4)
        t = r.uniform(0, 0.4)
        while t < d:
            pulses = r.integers(3, 5)
            for k in range(pulses):
                pt = tt(0.022)
                s = np.sin(2 * np.pi * f * pt) * np.sin(np.pi * pt / 0.022) ** 2
                i = int((t + k * 0.031) * SR)
                g = r.uniform(0.5, 1.0)
                out[0, i:i + len(s)] += s * g * np.cos((pan + 1) * np.pi / 4)
                out[1, i:i + len(s)] += s * g * np.sin((pan + 1) * np.pi / 4)
            t += 1 / rate * r.uniform(0.8, 1.2)
    return out[:, : int(d * SR)]


def bird(f0=3200, kind=0):
    """Um canto curto: duas a quatro sílabas com glissando."""
    out = []
    syl = [(0.07, 1.0, 1.5), (0.05, 1.4, 0.9), (0.09, 0.9, 1.3), (0.04, 1.6, 1.1)][: 2 + kind % 3]
    for d, a, b in syl:
        t = tt(d)
        f = f0 * np.interp(t, [0, d], [a, b]) * (1 + 0.04 * np.sin(2 * np.pi * 38 * t))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 1.5
        out.append(s)
        out.append(np.zeros(int(0.03 * SR)))
    return np.concatenate(out)


def engine(d, f0, f1, lp0, lp1, amp0, amp1):
    """Motor + rodagem: série harmônica do ronco com jitter, filtrada pela distância."""
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    wob = 1 + 0.12 * filt(noise(d), 12, 'low', 1) * 30
    s = sum(np.sin(k * ph + rng.uniform(0, 6)) / k ** 0.85 for k in range(1, 14)) * wob
    s += filt(noise(d), [90, 900], 'band') * 1.4
    s = sweep(s, lp0, lp1, kind='low')
    env = amp0 * (amp1 / amp0) ** (t / d) * np.minimum(1, t / 0.15) * np.clip((d - t) / 0.2, 0, 1)
    return s * env


def switch(on=True):
    d = 0.5
    t = tt(d)
    s = filt(noise(d), [1500, 7000], 'band') * (np.exp(-t / 0.002) + 0.6 * (t > 0.028) * np.exp(-np.clip(t - 0.028, 0, None) / 0.002))
    hum_f = 110 if on else 98
    env = (np.minimum(1, t / 0.12) * np.exp(-t / 0.25)) if on else np.exp(-t / 0.08)
    s += (np.sin(2 * np.pi * hum_f * t) + 0.5 * np.sin(2 * np.pi * hum_f * 2 * t)) * env * 0.25
    return s


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


# ------------------------------------------------------------------ harmonia e arranjo
# acordes: (voicing do pad, fundamental do baixo, notas do violão para o arpejo)
CH = {
    'Gsus': ([43, 50, 57, 62, 67], 31, [55, 62, 67, 69, 74]),
    'G': ([43, 50, 55, 59, 62], 31, [55, 59, 62, 67, 71]),
    'D/F#': ([42, 50, 54, 57, 62], 30, [54, 57, 62, 66, 69]),
    'Em': ([40, 47, 52, 55, 59], 28, [52, 55, 59, 64, 67]),
    'C': ([36, 48, 52, 55, 60], 36, [52, 55, 60, 64, 67]),
    'Cmaj7': ([36, 47, 52, 55, 59], 36, [52, 55, 59, 64, 67]),
    'D': ([38, 50, 54, 57, 62], 38, [54, 57, 62, 66, 69]),
    'Gadd9': ([43, 50, 55, 57, 59, 62], 31, [55, 59, 62, 67, 69, 71]),
}
PROG = {1: 'Gsus', 2: 'G', 3: 'G', 4: 'D/F#', 5: 'Em', 6: 'Cmaj7', 7: 'G', 8: 'D/F#', 9: 'Em', 10: 'C', 11: 'Gadd9', 12: 'Gadd9'}
ARP = [0, 2, 1, 3, 2, 4, 3, 2, 0, 2, 1, 3, 2, 4, 3, 1]           # arpejo do violão em semicolcheias
PENTA = [67, 69, 71, 74, 76, 79, 81, 83, 86, 88, 91]          # Sol pentatônica maior
BELL = 95                                                      # Si6: a terça de Sol maior

music, drums, sfx, send, amb = stereo(), stereo(), stereo(), stereo(), stereo()
kicks = []
T_IN, T_NIGHT, T_FICHA, T_MORN, T_PAY, T_OUT, T_FINAL, T_FIN = (SEC['checkin'], SEC['night'], SEC['ficha'], SEC['morning'], SEC['pay'],
                                                               SEC['checkout'], SEC['final'], SEC['finale'])


def add_kick(t, g=1.0):
    place(drums, kick(), t, g)
    kicks.append(t)


def guitar(n, g=0.11, bright=0.55, start=0, end=16, every=1, buf=None):
    buf = music if buf is None else buf
    t0 = bar(n)
    tones = CH[PROG[n]][2]
    for s in range(start, end, every):
        nt = tones[ARP[s] % len(tones)]
        pl = ks(nt, 1.4, bright + 0.1 * (s % 4 == 0), var=s % 3)
        sw = 0.018 if s % 2 else 0.0                     # leve swing nas semicolcheias pares
        pan = -0.3 + 0.6 * ((s * 5) % 7) / 6
        place(buf, pl, t0 + s * S16 + sw, g * (1.0 if s % 4 == 0 else 0.72), pan)
        place(send, pl, t0 + s * S16 + sw, g * 0.3, pan)


def bass_bar(n, g=0.5, full=True, sub=True):
    t0 = bar(n)
    root = CH[PROG[n]][1]
    if sub:
        place(music, sub_bass(midi(root), BAR * 0.98), t0, g * 0.55)
    if full:                                             # baixo de house: contratempos com oitava
        for s, o in [(2, 0), (6, 0), (10, 12), (14, 0)]:
            place(music, pluck_bass(midi(root + 12 + o), S16 * 1.8), t0 + s * S16, g * 0.42)


def groove(n, kick_on=True, clap_on=True, perc=1.0, hats=True):
    t0 = bar(n)
    for b in range(4):
        if kick_on:
            add_kick(t0 + b * BT, 0.62 if b == 0 else 0.55)
        if clap_on and b in (1, 3):
            place(drums, clap(), t0 + b * BT, 0.3, 0.05)
            place(send, clap(), t0 + b * BT, 0.12)
        if hats:
            place(drums, hat_open(), t0 + b * BT + 2 * S16, 0.09, 0.25)
    for s in range(16):
        sw = 0.018 if s % 2 else 0.0
        place(drums, shaker(1.0 if s % 4 == 2 else 0.55), t0 + s * S16 + sw, 0.12 * perc, -0.35)
    for s, f, sl in [(3, 330, 0.5), (7, 220, 0.2), (10, 330, 0.5), (11, 220, 0.2), (14, 250, 0.3)]:
        place(drums, conga(f, 0.3, sl), t0 + s * S16 + (0.018 if s % 2 else 0), 0.2 * perc, 0.4)
    place(drums, wood(), t0 + 7 * S16 + 0.018, 0.06 * perc, -0.5)


# --- c.1 MADRUGADA → NASCER DO SOL: grilos, acorde suspenso, o sol nasce num bloom
place(music, pad(CH['Gsus'][0], BAR + 0.6, 800, att=0.8, rel=0.5), 0.0, 0.42)
place(music, sub_bass(midi(31), BAR + 0.4), 0.0, 0.2)
cr = crickets(1.9, 7, 1)
cr[:, :] *= np.clip((1.9 - tt(1.9)) / 1.0, 0, 1)
place(amb, cr, 0.0, 0.16)
# c.2 PRONTO PARA RECEBER: entra o violão, o pulso das congas e o chocalho
guitar(2, 0.09, 0.4)
lp_auto(music, bar(2), bar(3), 900, 5000)
place(music, pad(CH['G'][0], BAR + 0.4, 1100, att=0.4, rel=0.3), bar(2), 0.3)
place(music, sub_bass(midi(31), BAR), bar(2), 0.3)
for s in range(8, 16):
    place(drums, shaker(0.5 + 0.06 * (s - 8)), bar(2) + s * S16 + (0.018 if s % 2 else 0), 0.1, -0.35)
for b in range(2, 4):
    add_kick(bar(2) + b * BT, 0.32 + 0.1 * (b - 2))
place(sfx, riser(1.6, 160, 1600), T_IN - 1.6, 0.26)
place(sfx, rev_cymbal(0.86), T_IN - 0.9, 0.24)

# --- c.3–4 CHECK-IN: o groove abre
for n in (3, 4):
    groove(n)
    bass_bar(n)
    guitar(n, 0.11, 0.6)
    place(music, pad(CH[PROG[n]][0], BAR + 0.3, 1500, att=0.12, rel=0.3), bar(n), 0.2)
place(drums, crash(2.8), T_IN, 0.32, -0.2)
place(send, crash(2.8), T_IN, 0.12)

# --- c.5–6 NOITE: a banda recua para as kalimbas e os grilos
cr = crickets(2 * BAR + 0.5, 8, 2)
cr *= np.clip(tt(2 * BAR + 0.5) / 0.8, 0, 1) * np.clip((2 * BAR + 0.5 - tt(2 * BAR + 0.5)) / 1.0, 0, 1)
place(amb, cr, T_NIGHT - 0.2, 0.14)
for n in (5, 6):
    place(music, pad(CH[PROG[n]][0], BAR + 0.5, 900, att=0.4, rel=0.5), bar(n), 0.34)
    place(music, sub_bass(midi(CH[PROG[n]][1]), BAR * 0.98), bar(n), 0.32)
    tones = CH[PROG[n]][2]
    for s in range(0, 16, 2):
        nt = tones[ARP[s] % len(tones)] + 12
        place(music, kalimba(midi(nt), 1.2), bar(n) + s * S16, 0.07 if s % 4 else 0.09, -0.4 + 0.8 * ((s * 3) % 5) / 4)
        place(send, kalimba(midi(nt), 1.2), bar(n) + s * S16, 0.05)
    for b in range(4):                                   # pulso de coração grave, sem caixa
        add_kick(bar(n) + b * BT, 0.3 if n == 5 else 0.38)
    for s in range(0, 16, 2):
        place(drums, shaker(0.5), bar(n) + s * S16, 0.06, -0.35)
for s in (3, 10, 14):
    place(drums, conga(220, 0.3, 0.1), bar(6) + s * S16, 0.12, 0.4)

# --- c.7–8 MANHÃ: o groove volta aos poucos
groove(7, clap_on=False, perc=0.7, hats=False)
bass_bar(7, 0.45)
guitar(7, 0.1, 0.5)
place(music, pad(CH['G'][0], BAR + 0.3, 1300, att=0.3, rel=0.3), bar(7), 0.24)
groove(8)
bass_bar(8)
guitar(8, 0.11, 0.6)
place(music, pad(CH['D/F#'][0], BAR + 0.3, 1500, att=0.12, rel=0.3), bar(8), 0.2)
place(sfx, riser(1.2, 200, 2200), T_OUT - 1.2, 0.24)
place(sfx, rev_cymbal(0.66), T_OUT - 0.7, 0.24)

# --- c.9 CHECK-OUT: groove cheio em Mi menor
groove(9)
bass_bar(9)
guitar(9, 0.11, 0.65)
place(music, pad(CH['Em'][0], BAR + 0.3, 1600, att=0.1, rel=0.3), bar(9), 0.22)
place(drums, crash(2.6), T_OUT, 0.3, 0.2)
place(send, crash(2.6), T_OUT, 0.12)

# --- c.10 DA CHEGADA À SAÍDA: o groove abafa e prepara a assinatura
c10 = stereo()
keep = music
music = c10
guitar(10, 0.11, 0.6)
bass_bar(10, 0.5)
music = keep
lp_auto(c10, bar(10), bar(11), 4000, 700)
music += c10
place(music, pad(CH['C'][0], BAR * 0.75, 1200, att=0.2, rel=0.3), bar(10), 0.26)
place(music, pad(CH['D'][0], BAR * 0.25 + 0.2, 1400, att=0.05, rel=0.2), bar(10, 3), 0.26)
groove(10, clap_on=True, perc=0.8)
place(sfx, rev_cymbal(0.78), T_FIN - 0.82, 0.3)

# --- c.11–12 ASSINATURA em Sol (add9)
groove(11, perc=0.8)
bass_bar(11, sub=False)                                 # o sub longo da assinatura já está embaixo
guitar(11, 0.1, 0.7)
fin = pad(CH['Gadd9'][0] + [71, 74], DUR - bar(11), 2000, att=0.06, rel=1.6)
place(music, fin, bar(11), 0.3)
place(send, fin, bar(11), 0.16)
place(music, sub_bass(midi(31), DUR - bar(11)), bar(11), 0.3)
guitar(12, 0.08, 0.5, end=9)
add_kick(bar(12), 0.6)
place(drums, crash(3.2), bar(12), 0.2)
for i, nt in enumerate([79, 83, 86, 91, 95]):         # arpejo final de sininhos
    place(music, chime(midi(nt), 2.2), bar(12) + 0.3 + i * S16, 0.05, -0.5 + 0.25 * i)
    place(send, chime(midi(nt), 2.2), bar(12) + 0.3 + i * S16, 0.05)

# side-chain do bumbo (a música respira com o bumbo)
duck = np.ones(N)
for t in kicks:
    i = int(t * SR)
    j = min(N, i + int(0.3 * SR))
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.4 * np.exp(-np.arange(j - i) / SR / 0.08))
music *= duck


# ------------------------------------------------------------------ efeitos (a partir dos cues)
def fx(c):
    t, ty, d, k = c['t'], c['type'], c.get('d', 0.3), c.get('k', 0)
    if ty == 'dawn':
        place(sfx, whoosh(d - 0.04, 150, 1400, 0.95, 0.8), t, 0.2)       # termina 40 ms antes: o golpe do sol fica limpo
        place(sfx, rev_cymbal(d - 0.04), t, 0.16)
    elif ty == 'sunrise':
        place(sfx, impact(2.4, 0.8, 0.25), t, 0.42)
        place(send, impact(2.4, 0.8, 0.25), t, 0.12)
        for i, nt in enumerate([67, 74, 79, 83, 86]):       # o sol nasce: sinos de Sol maior abrindo (o 1º no golpe)
            ti = t if i == 0 else t + 0.06 + i * 0.04
            place(sfx, chime(midi(nt), 2.4), ti, 0.07, -0.5 + 0.25 * i)
            place(send, chime(midi(nt), 2.4), ti, 0.07)
        for i in range(10):                                  # primeiros pássaros
            place(amb, bird(rng.uniform(2600, 4200), i), t + 0.3 + i * 0.32 + rng.uniform(0, 0.1), 0.09 * (1 - i / 14), rng.uniform(-0.8, 0.8))
    elif ty == 'car':
        if c['dir'] < 0:                                     # chega de costas: afasta-se da câmera
            e = engine(d, 52, 44, 2200, 260, 1.0, 0.04)
            place_pan(sfx, e, t, 0.2, -0.6, 0.05)
            place(sfx, filt(noise(0.5), [150, 900], 'band') * np.exp(-tt(0.5) / 0.15) * 0.4, t + d - 0.05, 0.05)
        else:                                                # parte de frente: vem até a câmera e passa
            e = engine(d, 44, 58, 300, 3200, 0.05, 1.0)
            place_pan(sfx, e, t, 0.26, 0.05, -0.75)
    elif ty == 'rise':
        place(sfx, whoosh(0.26, 700, 3200, 0.7, 1.6), t, 0.07)
    elif ty == 'card':
        place(sfx, whoosh(0.34, 1200, 5200, 0.75, 1.4), t - 0.1, 0.1, 0.1)
        place(sfx, click(0.02, 3600), t + 0.24, 0.12)
        place(sfx, blip(midi([79, 83, 86, 81, 84, 79, 74][k % 7] + 12), 0.1), t + 0.24, 0.035)
    elif ty == 'tag':
        place(sfx, pop(820), t, 0.15)
        place(sfx, kalimba(midi(83), 0.8), t, 0.07)
    elif ty == 'checkin':
        # o hóspede chega e toca a sineta da recepção
        place(sfx, impact(2.6, 1.2), t, 0.62)
        place(send, impact(2.6, 1.2), t, 0.18)
        b = desk_bell(midi(BELL))
        place(sfx, b, t, 0.5)
        place(send, b, t, 0.28)
        place(sfx, whoosh(0.8, 200, 2400, 0.85, 0.9), t - 0.05, 0.22)
    elif ty == 'light':
        place(sfx, switch(bool(c.get('on'))), t, 0.5, 0.15)
        if c.get('on'):
            place(sfx, kalimba(midi(79), 1.0), t + 0.01, 0.07, 0.15)
    elif ty == 'flip':
        place(sfx, filt(noise(0.06), [1800, 7000], 'band') * np.exp(-tt(0.06) / 0.008), t, 0.22, -0.2)
        place(sfx, click(0.02, 2600), t + 0.15, 0.2, 0.2)
        place(sfx, blip(midi(86 if k == 0 else 74), 0.14), t + 0.15, 0.06)
    elif ty == 'word':
        for i, nt in enumerate([79, 83, 86]):
            place(send, chime(midi(nt), 1.8), t + i * 0.05, 0.05)
    elif ty == 'timelapse':
        place(sfx, whoosh(d, 180, 3600, 0.55, 0.8), t, 0.16)
        n = 18
        for i in range(n):                                   # o tempo acelera: kalimbas subindo e descendo
            u = i / (n - 1)
            ti = t + d * (0.15 + 0.7 * (u ** 1.4 if u < 0.6 else u))
            nt = PENTA[int(round((1 - abs(2 * u - 1)) * 8))]
            place(sfx, kalimba(midi(nt), 0.6), ti, 0.03 + 0.03 * np.sin(np.pi * u), -0.7 + 1.4 * u)
            place(send, kalimba(midi(nt), 0.6), ti, 0.03)
    elif ty == 'lantern':
        place(sfx, whoosh(d, 250, 1600, 0.7, 0.9), t, 0.1, -0.3 + 0.3 * k)
        place(sfx, kalimba(midi([74, 79, 83][k]), 1.4), t, 0.11, -0.3 + 0.3 * k)
        place(send, kalimba(midi([74, 79, 83][k]), 1.4), t, 0.07)
    elif ty == 'star':
        place(sfx, chime(midi([86, 91, 95][k]), 2.4), t, 0.15, -0.5 + 0.5 * k)
        place(send, chime(midi([86, 91, 95][k]), 2.4), t, 0.1)
        place(sfx, click(0.012, 6000), t, 0.12, -0.5 + 0.5 * k)
    elif ty == 'total':
        place(sfx, pop(700), t + 0.12, 0.14)
        for i, nt in enumerate([79, 83, 86, 91]):
            place(sfx, bell(midi(nt), 1.2), t + 0.12 + i * 0.04, 0.05, -0.3 + 0.2 * i)
    elif ty == 'shooting':
        place(sfx, glide(6400, 2400, d, 0.25) * 0.5 + whoosh(d, 6000, 2000, 0.3, 2.0), t, 0.06, 0.6)
        place(send, glide(6400, 2400, d, 0.25), t, 0.03)
    elif ty == 'fly':
        place(sfx, whoosh(d + 0.1, 3200, 700, 0.45, 1.2), t, 0.14)
    elif ty == 'merge':
        place(sfx, pop(520), t, 0.2)
        place(sfx, click(0.02, 2400), t, 0.18)
        place(sfx, kalimba(midi(79), 1.2), t, 0.1)
        place(sfx, bell(midi(91), 1.0), t + 0.02, 0.05)
    elif ty == 'birds':
        for i in range(16):
            place(amb, bird(rng.uniform(2500, 4500), i), t + rng.uniform(0, d), 0.1, rng.uniform(-0.9, 0.9))
    elif ty == 'pix':
        place(sfx, blip(midi(86), 0.18), t, 0.16, 0.25)
        place(sfx, blip(midi(91), 0.3), t + 0.09, 0.16, 0.25)
        place(sfx, click(0.015, 5000), t, 0.2, 0.25)
        place(send, blip(midi(91), 0.3), t + 0.09, 0.08)
    elif ty == 'zero':
        for i in range(7):                                   # o valor rola até zerar
            place(sfx, click(0.012, 3500 + 300 * i), t + 0.05 + i * 0.045, 0.07)
        place(sfx, pop(640), t + 0.38, 0.14)
        for i, nt in enumerate([79, 83, 86]):
            place(sfx, bell(midi(nt + 12), 1.2), t + 0.38 + i * 0.04, 0.05)
    elif ty == 'receipt':
        d2 = 0.32
        tq = tt(d2)
        buzz = np.sign(np.sin(2 * np.pi * 160 * tq)) * (0.6 + 0.4 * np.sin(2 * np.pi * 42 * tq)) * np.clip((d2 - tq) / 0.03, 0, 1)
        place(sfx, filt(buzz, [300, 3000], 'band') * 0.5, t - 0.32, 0.12, 0.3)
        place(sfx, filt(noise(0.09), 2500, 'high') * np.exp(-tt(0.09) / 0.03), t, 0.2, 0.3)
        place(sfx, pop(900), t, 0.12, 0.3)
    elif ty == 'checkout':
        place(sfx, impact(2.4, 1.0), t, 0.55)
        place(send, impact(2.4, 1.0), t, 0.16)
        for i, nt in enumerate([83, 79]):                     # até logo: dois toques descendo
            place(sfx, chime(midi(nt), 2.0), t + i * 0.3, 0.12)
            place(send, chime(midi(nt), 2.0), t + i * 0.3, 0.1)
    elif ty == 'flare':
        place(sfx, whoosh(0.85, 250, 3800, 0.82, 0.9), t - 0.7, 0.34, -0.6)
        place(sfx, filt(noise(0.4), 3000, 'high') * np.exp(-tt(0.4) / 0.1), t, 0.25, -0.6)
        place(sfx, impact(1.2, 0.5, 0.1), t, 0.3, -0.3)
        place(send, chime(midi(98), 1.6), t, 0.06)
    elif ty == 'sink':
        place(sfx, glide(900, 180, d, 0.5) * 0.4 + whoosh(d, 2600, 200, 0.2, 1.0), t, 0.16)
    elif ty == 'logorise':
        place(sfx, riser(d + 0.05, 220, 2600), t - 0.05, 0.3)
    elif ty == 'logo':
        place(sfx, impact(2.8, 1.2), t, 0.62)
        place(send, impact(2.8, 1.2), t, 0.2)
        place(drums, crash(3.4), t, 0.34)
        place(send, crash(3.4), t, 0.14)
        b = desk_bell(midi(BELL))
        place(sfx, b, t, 0.55)
        place(send, b, t, 0.3)
    elif ty == 'type':
        typing(sfx, t, d, c.get('n', 12) // 2)
    elif ty == 'domain':
        for i, nt in enumerate([79, 83, 86, 91, 95]):
            place(sfx, blip(midi(nt), 0.16), t + i * 0.06, 0.06, -0.4 + 0.2 * i)
            place(send, blip(midi(nt), 0.16), t + i * 0.06, 0.05)
    elif ty == 'glint':
        for i in range(8):
            nt = [91, 95, 98, 103, 98, 103, 107, 110][i]
            place(sfx, blip(midi(nt), 0.18), t + i * d / 8, 0.03, -0.7 + 0.2 * i)
            place(send, blip(midi(nt), 0.18), t + i * d / 8, 0.03)
    else:
        raise ValueError('cue desconhecido: ' + ty)


for c in CUES:
    fx(c)

# ------------------------------------------------------------------ reverb + master
if os.environ.get('STEMS'):                              # depuração: grava as trilhas separadas
    for nm, b in (('music', music), ('drums', drums), ('sfx', sfx), ('amb', amb)):
        wavfile.write(os.path.join(os.environ['STEMS'], nm + '.wav'), SR, (np.clip(b.T * 0.5, -1, 1) * 32767).astype(np.int16))
send += sfx * 0.12 + music * 0.1 + amb * 0.3
wet = np.stack([fftconvolve(send[0], ir_norm(2.8, 7))[:N], fftconvolve(send[1], ir_norm(2.8, 8))[:N]])
mix = music * 0.74 + drums * 0.8 + sfx * 0.95 + amb * 0.9 + wet * 0.55
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
