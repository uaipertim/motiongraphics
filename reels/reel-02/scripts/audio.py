#!/usr/bin/env python3
"""
Trilha + efeitos do Reel 02 "Cada reserva no seu lugar" — 100% sintetizados (numpy/scipy).

140 BPM em meio-tempo, Mi menor → Sol maior. Linguagem diferente dos Reels
anteriores: 808 com glide, chimbal com rolos, pizzicato sintético e metais
curtos. O gancho é só tensão (pizzicato e tique-taque, como quem espera uma
resposta); a resposta chega com o drop, quando o calendário se ergue em 3D.
Na marca, a sineta de recepção da série, afinada no novo tom.

A sincronia vem da animação: `node scripts/render.cjs cues` exporta
audio/cues.json (cada encaixe de reserva, diária livre acesa, filtro, giro de
câmera...) e este script coloca o som exatamente nesses instantes.

    python3 scripts/audio.py      -> audio/trilha.wav (48 kHz, estéreo, -14 LUFS, pico real ≤ -2 dBTP antes do AAC)
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
rng = np.random.default_rng(2602)


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
    if sig.ndim == 2:
        i = int(round(t * SR))
        if i >= N:
            return
        j = min(N, i + sig.shape[1])
        buf[:, i:j] += sig[:, : j - i] * g
        return
    i = int(round(t * SR))
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


def ir_norm(d=2.4, seed=0, damp=0.6, lp=7000):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = filt(r.standard_normal(len(t)) * np.exp(-t / damp), lp, 'low')
    return x / np.sqrt((x ** 2).sum())


# ------------------------------------------------------------------ bateria (meio-tempo)
def kick(d=0.5, punch=1.0, tone=44):
    t = tt(d)
    f = tone + 190 * np.exp(-t / 0.025)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    click = filt(noise(d), 3500, 'high') * np.exp(-t / 0.0025) * 0.6
    return np.tanh(2.6 * punch * (body + click)) * np.clip((d - t) / 0.02, 0, 1)


def clap(d=0.35):
    t = tt(d)
    n = filt(noise(d), [1000, 8000], 'band')
    env = np.zeros_like(t)
    for k, o in enumerate([0, 0.007, 0.015, 0.024]):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.004 if k < 3 else 0.12))
    return n * env


def snare(d=0.3, v=1.0):
    t = tt(d)
    return (filt(noise(d), [1600, 9000], 'band') * np.exp(-t / 0.09) + np.sin(2 * np.pi * np.cumsum(190 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.06) * 0.7) * v


def hat(d=0.05, open_=False):
    t = tt(d if not open_ else 0.32)
    return filt(noise(len(t) / SR), 8500, 'high') * np.exp(-t / (0.11 if open_ else 0.014))


def rim(d=0.07):
    t = tt(d)
    return np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.01) + filt(noise(d), [2500, 7000], 'band') * np.exp(-t / 0.004) * 0.7


def woodblock(f=900, d=0.12):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.6 * t)) * np.exp(-t / 0.025) + filt(noise(d), [f, f * 4], 'band') * np.exp(-t / 0.003) * 0.5


def crash(d=2.6, v=1.0):
    t = tt(d)
    s = filt(noise(d), 4500, 'high') * np.exp(-t / 0.9) + filt(noise(d), [2500, 9000], 'band') * np.exp(-t / 0.35) * 0.6
    return s * v * np.minimum(1, t / 0.002)


def rev_cymbal(d=0.9):
    return crash(d + 0.1)[: int(d * SR)][::-1] * np.linspace(0, 1, int(d * SR)) ** 2


# ------------------------------------------------------------------ instrumentos
def saw_bl(f, t, bright, ph=0.0):
    kmax = max(2, int(min(SR / 2 - 800, bright * 2.5) / f))
    k = np.arange(1, kmax + 1)[:, None]
    return (np.sin(2 * np.pi * f * k * t[None, :] + ph * k) * ((1 / k) * np.exp(-(k * f) / bright))).sum(0)


def bass808(notes, d, drive=2.2):
    """808 com glide: notes = [(t_rel, midi)], a afinação desliza entre elas."""
    t = tt(d)
    f = np.full(len(t), midi(notes[0][1]))
    for (t0, n0), (t1, n1) in zip(notes, notes[1:]):
        i0, i1 = int(t0 * SR), int(t1 * SR)
        g = int(0.06 * SR)
        f[i1:] = midi(n1)
        a = max(i0, i1 - g)
        f[a:i1] = np.linspace(midi(n0), midi(n1), i1 - a)
    f = f * (1 + 0.6 * np.exp(-t / 0.012))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    s = np.tanh(drive * s) / np.tanh(drive)
    env = np.minimum(1, t / 0.003) * np.exp(-t / 1.1) * np.clip((d - t) / 0.04, 0, 1)
    return s * env


def pizz(f, d=0.28, bright=1.0):
    """Pizzicato sintético: harmônicos que morrem rápido + ressonância de corpo."""
    t = tt(d)
    kmax = max(2, int(min(9000, 5000 * bright) / f))
    k = np.arange(1, kmax + 1)[:, None]
    s = (np.sin(2 * np.pi * f * k * t[None, :]) * (1 / k ** 1.2) * np.exp(-t[None, :] * (14 + 5 * k / bright))).sum(0)
    s += filt(noise(d), [f, f * 3], 'band') * np.exp(-t / 0.004) * 0.3
    return s * np.minimum(1, t / 0.0015) * np.clip((d - t) / 0.02, 0, 1)


def brass(notes, d, bright=2600, att=0.012):
    """Metal curto (stab): serras com envelope de brilho."""
    t = tt(d)
    out = np.zeros((2, len(t)))
    for n in notes:
        for v, (det, pan) in enumerate(((-0.004, -0.5), (0.0, 0.0), (0.0045, 0.5))):
            s = saw_bl(midi(n) * (1 + det), t, bright, rng.uniform(0, 6.28))
            out[0] += s * np.cos((pan + 1) * np.pi / 4)
            out[1] += s * np.sin((pan + 1) * np.pi / 4)
    env = np.minimum(1, t / att) * (0.55 + 0.45 * np.exp(-t / 0.12)) * np.clip((d - t) / 0.08, 0, 1)
    out = np.stack([filt(out[0], bright * 1.4, 'low'), filt(out[1], bright * 1.4, 'low')])
    return out * env / (len(notes) * 3) * 2.0


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


# ------------------------------------------------------------------ efeitos
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


def impact(d=2.0, big=1.0):
    t = tt(d)
    f = 30 + 85 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.8 * big))
    body = filt(noise(d), 6000, 'low') * np.exp(-t / 0.4) * 0.45 + filt(noise(d), 5000, 'high') * np.exp(-t / 0.45) * 0.12
    return np.tanh(1.4 * (sub + body + kick(d, 1.2)[: len(t)] * 0.5))


def glass(d=0.9):
    """Estilhaço: parciais agudos inarmônicos espalhados + ruído brilhante."""
    t = tt(d)
    s = filt(noise(d), 3500, 'high') * np.exp(-t / 0.12) * 0.8
    for _ in range(14):
        f, o = rng.uniform(2500, 9000), rng.uniform(0, 0.25)
        s += np.sin(2 * np.pi * f * t) * np.exp(-np.clip(t - o, 0, None) / rng.uniform(0.05, 0.25)) * (t >= o) * 0.25
    return s


def laser(d=1.3, f0=400, f1=3200):
    t = tt(d)
    u = t / d
    fr = f0 * (f1 / f0) ** u
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * t))
    return (s * 0.35 + sweep(noise(d), 600, 7000, 3.0) * 0.6) * np.sin(np.pi * u) ** 0.8


def paper(d=0.3):
    t = tt(d)
    return filt(noise(d), [1500, 7000], 'band') * np.exp(-t / 0.06) * (0.6 + 0.4 * np.sin(2 * np.pi * 60 * t))


def roll_ticks(buf, t0, t1, g=0.1, f=3200, pan=0.0):
    t = t0
    while t < t1:
        u = (t - t0) / (t1 - t0)
        place(buf, click(0.02, f * (1 + 0.15 * rng.uniform(-1, 1))), t, g * (1 - 0.5 * u), pan)
        t += 0.028 + 0.11 * u ** 2


def typing(buf, t0, d, n, g=0.045):
    step = d / max(1, n)
    for i in range(n):
        place(buf, click(0.015, 4200 + 600 * rng.uniform(-1, 1)), t0 + i * step + rng.uniform(0, step * 0.3), g, rng.uniform(-0.3, 0.3))


# ------------------------------------------------------------------ harmonia e arranjo
# acordes (metais/pad), fundamental do 808 e notas do pizzicato
CH = {
    'Em': ([52, 55, 59, 64], 28, [64, 67, 71, 76]),
    'C': ([48, 55, 60, 64], 36, [64, 67, 72, 76]),
    'D': ([50, 54, 57, 62], 38, [62, 66, 69, 74]),
    'G': ([55, 59, 62, 67], 31, [67, 71, 74, 79]),
    'Am': ([45, 52, 57, 60], 33, [64, 69, 72, 76]),
    'Gmaj9': ([55, 59, 62, 66, 69], 31, [67, 71, 74, 78]),
}
PROG = {1: 'Em', 2: 'Em', 3: 'Em', 4: 'C', 5: 'Em', 6: 'C', 7: 'D', 8: 'Em', 9: 'C', 10: 'G', 11: 'D', 12: 'Am', 13: 'C', 14: 'D', 15: 'G', 16: 'Gmaj9'}

music, drums, sfx, send = stereo(), stereo(), stereo(), stereo()
kicks = []

T_BUILD, T_DROP, T_SCAN, T_VIEWS = SEC['build'], SEC['drop'], SEC['scan'], SEC['views']
T_FILTERS, T_VOUCHER, T_FINALE = SEC['filters'], SEC['voucher'], SEC['finale']
T_LOGO = T_FINALE + BAR


def add_kick(t, g=1.0):
    place(drums, kick(), t, g)
    kicks.append(t)


def pizz_ostinato(n, pattern, g=0.12, bright=1.0, oct_=0):
    """Pizzicato em semicolcheias sobre o acorde do compasso n."""
    t0 = bar(n)
    tones = CH[PROG[n]][2]
    for s, idx in pattern:
        nt = tones[idx % 4] + oct_ + (12 if idx >= 4 else 0)
        pl = pizz(midi(nt), 0.26, bright)
        pan = -0.4 if s % 2 == 0 else 0.4
        place(music, pl, t0 + s * S16, g, pan)
        place(send, pl, t0 + s * S16, g * 0.4, pan)


OST = [(0, 0), (2, 2), (3, 1), (4, 3), (6, 2), (7, 0), (8, 4), (10, 2), (11, 1), (12, 3), (14, 2), (15, 1)]

# --- GANCHO (c.1–2): drone, tique-taque e pizzicato, tensão sem bateria
place(music, pad([40, 52, 59], 2 * BAR + 0.3, 900, att=0.2, rel=0.3), 0.0, 0.42)
place(music, bass808([(0, 28)], 1.6), 0.0, 0.55)
for n in (1, 2):
    pizz_ostinato(n, OST if n == 2 else OST[::2], 0.1 if n == 1 else 0.13)
t = BT * 2
while t < T_BUILD - 1e-6:                            # tique-taque acelerando
    u = t / T_BUILD
    place(drums, hat(), t, 0.04 + 0.08 * u, 0.3 if int(t / S16) % 2 else -0.3)
    t += BT / 2 if t < BAR else S16
place(sfx, riser(BAR, 150, 1800), BAR, 0.38)
place(sfx, rev_cymbal(0.8), T_BUILD - 0.8, 0.3)

# --- MONTAGEM (c.3–4): bumbo filtrado, aro no 3, chimbal em semicolcheias
build = stereo()
for n in (3, 4):
    t0 = bar(n)
    for s in range(16):
        ts = t0 + s * S16
        if s in (0, 10):
            place(build, kick(), ts, 0.9)
            kicks.append(ts)
        if s == 8:
            place(build, rim(), ts, 0.4)
        place(build, hat(), ts, (0.07 if s % 2 == 0 else 0.045) * (1.2 if n == 4 else 1), 0.25 if s % 2 else -0.2)
    notes, root, _ = CH[PROG[n]]
    place(build, bass808([(0, root)], BAR * 0.95), t0, 0.5)
    place(music, pad(notes, BAR + 0.3, 1600, att=0.3, rel=0.4), t0, 0.44)
    pizz_ostinato(n, OST, 0.15, 1.2)
lp_auto(build, T_BUILD, T_BUILD + BAR, 300, 3000)
lp_auto(build, T_BUILD + BAR, T_DROP, 3000, 16000)
drums += build
t, k = bar(4, 2), 0                                   # rolo de caixa para o drop
while t < T_DROP - 0.01:
    u = (t - bar(4, 2)) / (2 * BT)
    place(drums, snare(0.18, 0.3 + 0.7 * u), t, 0.36, 0.2 * (1 if k % 2 else -1))
    t += S16 if u < 0.5 else S16 / 2
    k += 1
place(sfx, riser(2 * BT, 200, 2200), bar(4, 2), 0.42)


# --- GROOVE (c.5–11 e 15–16): bumbo + 808, palmas/caixa no 3, chimbal com rolos
def groove_bar(n, roll=False, hats=True, g808=0.7, kick_steps=(0, 7, 10), stab=True, light=False):
    t0 = bar(n)
    notes, root, _ = CH[PROG[n]]
    for s in kick_steps:
        add_kick(t0 + s * S16, 1.0 if s == 0 else 0.85)
    if not light:
        place(drums, clap(), t0 + 8 * S16, 0.55)
        place(drums, snare(0.25, 0.6), t0 + 8 * S16, 0.3)
        place(send, clap(), t0 + 8 * S16, 0.2)
    else:
        place(drums, rim(), t0 + 8 * S16, 0.35)
    if hats:
        steps = list(range(0, 16, 2))
        for s in steps:
            if roll and s >= 12:
                continue
            place(drums, hat(), t0 + s * S16, 0.09, -0.25)
        if roll:                                   # rolo em fusas no último tempo
            for j in range(8):
                place(drums, hat(), t0 + 12 * S16 + j * S16 / 2, 0.05 + 0.006 * j, 0.25)
        place(drums, hat(open_=True), t0 + 14 * S16, 0.06, 0.4)
    # 808: segue o bumbo; sobe uma oitava no fim do compasso
    seq = [(0, root), (7 * S16, root), (10 * S16, root), (14 * S16, root + 12)]
    place(music, bass808(seq, BAR * 0.98), t0, g808)
    if stab:
        st = brass(notes[1:] + [notes[1] + 12], 0.34, 2400)
        for s in (0, 6):
            place(music, st, t0 + s * S16, 0.3)
            place(send, st, t0 + s * S16, 0.1)


for n in range(5, 12):
    groove_bar(n, roll=n in (6, 8, 11), stab=n != 12)
    pizz_ostinato(n, OST, 0.08, 1.3, 12 if n in (8, 9) else 0)
    place(music, pad(CH[PROG[n]][0], BAR + 0.2, 2000, att=0.2, rel=0.3), bar(n), 0.18)
for tc in (T_DROP, T_VIEWS + BAR, T_FILTERS):
    place(drums, crash(2.6), tc, 0.38, -0.2)
    place(send, crash(2.6), tc, 0.12)

# --- VOUCHER (c.12–13): respiro — pad, pizzicato, aro e chimbal
for n in (12, 13):
    groove_bar(n, hats=True, g808=0.45, kick_steps=(0,), stab=False, light=True)
    place(music, pad(CH[PROG[n]][0], BAR + 0.4, 1500, att=0.25, rel=0.5), bar(n), 0.34)
    place(send, pad(CH[PROG[n]][0], BAR + 0.4, 1500, att=0.25, rel=0.5), bar(n), 0.15)
    pizz_ostinato(n, OST, 0.11, 1.0)

# --- PREPARAÇÃO (c.14): Ré, caixa acelerando, subida até a marca
t0 = bar(14)
place(music, brass(CH['D'][0], BAR, 1800, att=0.3), t0, 0.3)
place(music, bass808([(0, 38)], BAR * 0.95), t0, 0.55)
for s in (0, 6, 10):
    add_kick(t0 + s * S16, 0.85)
t, k = t0 + BT, 0
while t < T_LOGO - 0.01:
    u = (t - t0 - BT) / (3 * BT)
    place(drums, snare(0.16, 0.3 + 0.7 * u), t, 0.34, 0.2 * (1 if k % 2 else -1))
    t += BT / 2 if u < 0.34 else (S16 if u < 0.75 else S16 / 2)
    k += 1
place(sfx, riser(3 * BT, 200, 2200), t0 + BT, 0.42)
place(sfx, rev_cymbal(0.9), T_LOGO - 0.9, 0.32)

# --- MARCA (c.15–16): Sol maior, gancho de pizzicato, acorde final
groove_bar(15, roll=True)
place(drums, crash(3.0), T_LOGO, 0.42)
place(send, crash(3.0), T_LOGO, 0.15)
place(music, pad(CH['G'][0] + [74], BAR + 0.3, 2400, att=0.05, rel=0.4), T_LOGO, 0.32)
HOOK = [79, 78, 76, 74, 76, 78, 79, 83]                   # Sol Fá# Mi Ré Mi Fá# Sol Si
for i, nt in enumerate(HOOK):
    pl = pizz(midi(nt), 0.4, 1.4)
    place(music, pl, T_LOGO + i * BT / 2, 0.16, 0.2 * (1 if i % 2 else -1))
    place(send, pl, T_LOGO + i * BT / 2, 0.1)
t16 = bar(16)
fin = brass(CH['Gmaj9'][0], DUR - t16, 2800, att=0.01)
place(music, fin, t16, 0.34)
place(send, fin, t16, 0.18)
place(music, pad([43, 55, 59, 62, 66, 69, 74], DUR - t16, 2200, att=0.05, rel=1.0), t16, 0.34)
place(music, bass808([(0, 31)], 1.6), t16, 0.7)
add_kick(t16, 1.0)
place(drums, crash(3.2), t16, 0.36)
place(send, crash(3.2), t16, 0.16)

# side-chain do bumbo (leve: o 808 e o pad respiram)
duck = np.ones(N)
for t in kicks:
    i = int(t * SR)
    j = min(N, i + int(0.28 * SR))
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.45 * np.exp(-np.arange(j - i) / SR / 0.07))
music *= duck

# ------------------------------------------------------------------ efeitos (a partir dos cues)
PENTA = [64, 67, 69, 71, 74, 76, 79, 81, 83, 86, 88, 91]   # Mi menor pentatônica, subindo
STP = {'FIN': 64, 'HOSP': 67, 'CHECKOUT': 69, 'CHECKIN': 71, 'BLOQ': 59, 'CONF': 76, 'PRE': 74}


def fx(c):
    t, ty, v, pan, d = c['t'], c['type'], c.get('v', 1.0), c.get('pan', 0.0), c.get('d', 0.3)
    if ty == 'slam':
        place(sfx, impact(1.6, 0.9), t, 0.6 * v)
        place(sfx, filt(noise(0.2), [200, 3500], 'band') * np.exp(-tt(0.2) / 0.03), t, 0.4 * v)
        place(send, impact(1.6, 0.9), t, 0.2)
    elif ty == 'rise':
        place(sfx, whoosh(0.26, 700, 3200, 0.7, 1.6), t, 0.09 * v)
    elif ty == 'ping':
        i = c['i']
        nt = PENTA[min(i, len(PENTA) - 1)]
        place(sfx, pizz(midi(nt), 0.3, 1.5), t, 0.22, pan)
        place(sfx, blip(midi(nt + 12), 0.08), t, 0.07, pan)
        place(send, pizz(midi(nt), 0.3, 1.5), t, 0.12, pan)
    elif ty == 'shatter':
        place(sfx, glass(1.0), t, 0.5)
        place(sfx, impact(2.0, 1.0), t, 0.55)
        place(send, glass(1.0), t, 0.25)
        place(sfx, whoosh(0.5, 6000, 900, 0.1, 1.0), t, 0.25)
    elif ty == 'cells':
        for i in range(36):
            place(sfx, click(0.012, 3800 + 60 * i), t + i * d / 36, 0.045, -0.8 + 1.6 * (i % 9) / 8)
    elif ty == 'type':
        typing(sfx, t, d, c.get('n', 20) // 2)
    elif ty == 'snap':
        nt = STP.get(c.get('st'), 71)
        place(sfx, woodblock(midi(nt - 12) * 2, 0.12), t, 0.3, pan)
        place(sfx, pizz(midi(nt), 0.3, 1.3), t, 0.18, pan)
        place(send, pizz(midi(nt), 0.3, 1.3), t, 0.08, pan)
        # dir = 1: o bloco entra pela direita da tela; o som vem junto, da direita para o centro
        place_pan(sfx, whoosh(0.17, 900, 4500, 0.85, 1.4), t - 0.17, 0.1, 0.9 * c.get('dir', 1), 0.1 * c.get('dir', 1))
    elif ty == 'drop':
        place(sfx, impact(2.6, 1.3), t, 0.85)
        place(send, impact(2.6, 1.3), t, 0.25)
        place(sfx, whoosh(1.2, 5000, 150, 0.05, 1.0), t, 0.25)
    elif ty == 'extrude':
        for i in range(20):
            place(sfx, blip(midi(52 + i), 0.06), t + i * d / 20, 0.035, -0.8 + 1.6 * i / 19)
        place(sfx, whoosh(d, 200, 2500, 0.8, 1.6), t, 0.2)
    elif ty == 'orbit':
        place_pan(sfx, whoosh(d + 0.1, 300, 4000, 0.55, 1.0), t, 0.32, -0.7, 0.7)
    elif ty == 'scan':
        place_pan(sfx, laser(d), t, 0.32, -0.9, 0.9)
    elif ty == 'free':
        k = c['k']
        place(sfx, blip(midi(PENTA[min(k, len(PENTA) - 1)] + 12), 0.1), t, 0.1, pan)
        place(send, blip(midi(PENTA[min(k, len(PENTA) - 1)] + 12), 0.1), t, 0.06, pan)
    elif ty == 'weekend':
        place(sfx, impact(1.2, 0.6), t, 0.25)
        for i, nt in enumerate([83, 88]):
            place(sfx, bell(midi(nt), 1.3), t + 0.04 + i * 0.08, 0.13)
            place(send, bell(midi(nt), 1.3), t + 0.04 + i * 0.08, 0.08)
    elif ty == 'zoom':
        f0, f1 = (300, 5000) if c.get('dir', 1) > 0 else (5000, 300)
        place(sfx, whoosh(d + 0.1, f0, f1, 0.6, 1.2), t, (0.45 if c.get('big') else 0.32))
    elif ty == 'click':
        place(sfx, click(0.03, 2600), t, 0.32)
        place(sfx, pop(780 + 140 * c.get('k', 0)), t, 0.16)
    elif ty == 'filter':
        k = c['k']
        place(sfx, bass808([(0, 40 + k * 2), (0.12, 52 + k * 2)], 0.5), t, 0.35)
        place(sfx, whoosh(0.4, 200, 4000, 0.7, 1.6), t - 0.05, 0.22)
        place(sfx, pizz(midi(76 + k * 2), 0.3, 1.6), t + 0.05, 0.16)
        for j in range(min(6, c.get('n', 1))):
            place(sfx, blip(midi(79 + k * 2 + j * 2), 0.07), t + 0.06 + j * 0.035, 0.05)
    elif ty == 'settle':
        place(sfx, whoosh(0.45, 3500, 300, 0.4, 1.2), t, 0.22)
    elif ty == 'lift':
        place(sfx, riser(d, 300, 1200), t, 0.25)
    elif ty == 'unfold':
        place(sfx, paper(0.25), t, 0.3, -0.2)
        place(sfx, paper(0.2), t + 0.18, 0.25, 0.2)
        place(sfx, whoosh(d, 400, 3000, 0.7, 1.2), t, 0.28)
    elif ty == 'pop':
        place(sfx, pop(700 + 40 * (c.get('k', 0) % 12)), t, 0.2 * v)
        if c.get('k') == 99:
            place(sfx, bell(midi(88), 1.0), t, 0.1)
    elif ty == 'roll':
        roll_ticks(sfx, t, t + d, 0.08)
    elif ty == 'fold':
        place(sfx, paper(0.25)[::-1], t, 0.25)
        place(sfx, whoosh(d, 3000, 300, 0.4, 1.2), t, 0.3)
    elif ty == 'pull':
        place(sfx, whoosh(d + 0.2, 200, 6000, 0.85, 1.0), t, 0.42)
    elif ty == 'wave':
        for i, nt in enumerate([67, 71, 74, 79, 83, 86, 91]):
            place(sfx, pizz(midi(nt), 0.3, 1.6), t + i * d / 7, 0.11, -0.7 + 0.23 * i)
            place(send, pizz(midi(nt), 0.3, 1.6), t + i * d / 7, 0.06)
    elif ty == 'ding':
        s = desk_bell(midi(95))                               # Si: a terça de Sol maior
        place(sfx, s, t, 0.6)
        place(send, s, t, 0.3)
    elif ty == 'boom':
        place(sfx, impact(2.6, 1.2), t, 0.7)
        place(send, impact(2.6, 1.2), t, 0.2)
    elif ty == 'glint':
        for k in range(9):
            nt = [86, 91, 95, 98, 95, 91, 98, 103, 107][k]
            place(sfx, blip(midi(nt), 0.16), t + k * d / 9, 0.045, -0.8 + 0.2 * k)
            place(send, blip(midi(nt), 0.16), t + k * d / 9, 0.04)
    else:
        raise ValueError('cue desconhecido: ' + ty)


for c in CUES:
    fx(c)

# ------------------------------------------------------------------ reverb + master
send += sfx * 0.12 + music * 0.1
wet = np.stack([fftconvolve(send[0], ir_norm(2.4, 5))[:N], fftconvolve(send[1], ir_norm(2.4, 6))[:N]])
mix = music * 0.74 + drums * 0.78 + sfx * 0.92 + wet * 0.58
t = np.arange(N) / SR
mix *= np.clip((DUR - t) / 0.6, 0, 1)
mix *= np.clip(t / 0.002, 0, 1)
mix = filt(mix, 28, 'high')
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


def true_peak_limit(x, ceiling_db=-2.2, os_=4):
    """Limitador de pico real: o ganho é calculado no sinal sobreamostrado (os_ x) com
    antecipação de 2 ms e suavização de 1 ms, e aplicado ao sinal original."""
    c = 10 ** (ceiling_db / 20)
    up = resample_poly(x, os_, 1, axis=0)
    need = np.minimum(1.0, c / np.maximum(np.abs(up).max(axis=1), 1e-9))
    w = int(0.002 * SR * os_)
    g = uniform_filter1d(minimum_filter1d(need, w), w // 2)
    g = g[: len(g) // os_ * os_].reshape(-1, os_).min(axis=1)
    return x[: len(g)] * g[:, None]


lim = true_peak_limit(wavfile.read(out)[1].astype(np.float64) / 32768)
wavfile.write(out, SR, np.round(lim * 32767).astype(np.int16))
print('ok ->', out, '| entrada', js['input_i'], 'LUFS |', len(CUES), 'cues')
