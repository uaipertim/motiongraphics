#!/usr/bin/env python3
"""
Trilhas e efeitos dos Stories "Conheça" — 100% sintetizados (numpy/scipy).

Uma única música de 32 s em Mi maior, 120 BPM, dividida em quatro faixas de
8 s (4 compassos cada): tocadas em sequência no Destaque elas emendam no
tempo e na harmonia; sozinhas, cada uma começa e termina limpa.
Linguagem nova na série: nu-disco — bumbo reto, contratempo de chimbal aberto,
baixo em oitavas, piano elétrico FM em acordes sincopados e arpejo em
semicolcheias. A fita que costura os Stories tem um som próprio (tecido
tremulando + sopro) na entrada pela esquerda e na saída pela direita, e a
sineta de recepção da série, afinada em Sol# (a terça de Mi), marca a logo
no primeiro e no último Story.

    1 · marca       Mi – Dó#m – Lá – Si     intro sem bateria; a banda entra com a logo
    2 · reservas    Dó#m – Lá – Mi – Si
    3 · financeiro  Lá – Si – Sol#m – Dó#m
    4 · convite     Lá – Si – Mi – Mi       resolve na tônica

A sincronia vem da animação: `node scripts/render.cjs cues` exporta
audio/cues.json e cada efeito cai exatamente no instante do evento visual.

    python3 scripts/audio.py   -> audio/story-01.wav … story-04.wav
                                  (48 kHz, estéreo, -14 LUFS, pico real ≤ -2,2 dBTP antes do AAC)
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
SR = 48000
rng = np.random.default_rng(2610)
N = 0                                   # amostras do Story em produção (definido em build())


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
    if i < 0:
        sig, i = sig[-i:], 0
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


def ir_norm(d=2.2, seed=0, damp=0.55, lp=7500):
    r = np.random.default_rng(seed)
    t = tt(d)
    x = filt(r.standard_normal(len(t)) * np.exp(-t / damp), lp, 'low')
    return x / np.sqrt((x ** 2).sum())


# ------------------------------------------------------------------ bateria (house)
def kick(d=0.42, punch=1.0, tone=47):
    t = tt(d)
    f = tone + 170 * np.exp(-t / 0.022)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.17)
    click = filt(noise(d), 3000, 'high') * np.exp(-t / 0.002) * 0.5
    return np.tanh(2.4 * punch * (body + click)) * np.clip((d - t) / 0.02, 0, 1)


def clap(d=0.32):
    t = tt(d)
    n = filt(noise(d), [900, 7500], 'band')
    env = np.zeros_like(t)
    for k, o in enumerate([0, 0.008, 0.017, 0.026]):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.004 if k < 3 else 0.1))
    return n * env


def snare(d=0.22, v=1.0):
    t = tt(d)
    return (filt(noise(d), [1500, 9000], 'band') * np.exp(-t / 0.07) + np.sin(2 * np.pi * np.cumsum(200 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.05) * 0.6) * v


def hat(open_=False):
    t = tt(0.3 if open_ else 0.05)
    return filt(noise(len(t) / SR), 8000, 'high') * np.exp(-t / (0.09 if open_ else 0.013))


def shaker(d=0.08):
    t = tt(d)
    return filt(noise(d), [5000, 12000], 'band') * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2


def crash(d=2.4, v=1.0):
    t = tt(d)
    s = filt(noise(d), 4500, 'high') * np.exp(-t / 0.85) + filt(noise(d), [2500, 9000], 'band') * np.exp(-t / 0.3) * 0.6
    return s * v * np.minimum(1, t / 0.002)


def rev_cymbal(d=0.8):
    return crash(d + 0.1)[: int(d * SR)][::-1] * np.linspace(0, 1, int(d * SR)) ** 2


# ------------------------------------------------------------------ instrumentos
def saw_bl(f, t, bright, ph=0.0):
    kmax = max(2, int(min(SR / 2 - 800, bright * 2.5) / f))
    k = np.arange(1, kmax + 1)[:, None]
    return (np.sin(2 * np.pi * f * k * t[None, :] + ph * k) * ((1 / k) * np.exp(-(k * f) / bright))).sum(0)


def epiano(f, d=0.5):
    """Piano elétrico FM: o índice de modulação cai (ataque metálico → corpo redondo)."""
    t = tt(d)
    idx = 2.0 * np.exp(-t / 0.18) + 0.35
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    s += 0.22 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.05)          # "tine"
    return s * np.minimum(1, t / 0.002) * np.exp(-t / 0.8) * np.clip((d - t) / 0.06, 0, 1)


def stab(notes, d=0.24, spread=0.35):
    out = np.zeros((2, int(d * SR)))
    for k, n in enumerate(notes):
        s = epiano(midi(n), d)
        pan = spread * (2 * k / max(1, len(notes) - 1) - 1)
        out[0] += s * np.cos((pan + 1) * np.pi / 4)
        out[1] += s * np.sin((pan + 1) * np.pi / 4)
    return out / len(notes) * 1.6


def pluck(f, d=0.2, bright=3200):
    t = tt(d)
    s = saw_bl(f, t, bright) * np.exp(-t / 0.06) + 0.4 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.12)
    return filt(s, bright * 1.3, 'low') * np.minimum(1, t / 0.001) * np.clip((d - t) / 0.02, 0, 1)


def disco_bass(f, d=0.2):
    t = tt(d)
    s = saw_bl(f, t, 1600) * (0.5 + 0.5 * np.exp(-t / 0.05)) + 0.8 * np.sin(2 * np.pi * f * t)
    s = filt(s, 1400, 'low')
    return np.tanh(1.6 * s) * np.minimum(1, t / 0.002) * np.exp(-t / 0.25) * np.clip((d - t) / 0.02, 0, 1)


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


def bell(f, d=1.2, bright=1.0):
    t = tt(d)
    idx = 1.3 * bright * np.exp(-t / 0.45)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) + 0.3 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.35)
    return s * np.minimum(1, t / 0.002) * np.exp(-t / 0.6)


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


def ribbon_sound(d, peak=0.5):
    """A fita: sopro + tecido tremulando (ruído com modulação de ~26 Hz) + brilho leve."""
    t = tt(d)
    u = t / d
    env = np.where(u < peak, (u / peak) ** 1.6, ((1 - u) / (1 - peak)) ** 1.4)
    air = sweep(noise(d), 400, 2600, 0.9) * 0.8
    flutter = filt(noise(d), [1200, 6500], 'band') * (0.55 + 0.45 * np.sin(2 * np.pi * (24 + 6 * u) * t)) * 0.7
    shimmer = sum(np.sin(2 * np.pi * midi(n) * t + rng.uniform(0, 6)) for n in (88, 92, 95)) * 0.05 * u
    return (air + flutter + shimmer) * env


def riser(d, f0=180, f1=1400):
    t = tt(d)
    u = t / d
    fr = f0 * (f1 / f0) ** u
    tone = np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(fr * 1.5) / SR)
    return sweep(noise(d), 300, 9000, 2.0) * u ** 2.4 * 0.8 + tone * u ** 2.6 * 0.16


def impact(d=2.0, big=1.0):
    t = tt(d)
    f = 32 + 80 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.7 * big))
    body = filt(noise(d), 6000, 'low') * np.exp(-t / 0.35) * 0.4 + filt(noise(d), 5000, 'high') * np.exp(-t / 0.4) * 0.12
    return np.tanh(1.4 * (sub + body + kick(d, 1.2)[: len(t)] * 0.5))


def key_clink(d=0.5):
    """Chaveiro: duas chapinhas de metal batendo (parciais agudos inarmônicos)."""
    t = tt(d)
    s = np.zeros_like(t)
    for o in (0.0, rng.uniform(0.025, 0.045)):
        for _ in range(6):
            f = rng.uniform(2800, 7800)
            s += np.sin(2 * np.pi * f * t) * np.exp(-np.clip(t - o, 0, None) / rng.uniform(0.04, 0.16)) * (t >= o) * 0.22
        s += filt(noise(d), 5000, 'high') * np.exp(-np.clip(t - o, 0, None) / 0.004) * (t >= o) * 0.5
    return s


def coin(f):
    t = tt(0.7)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.25) + 0.6 * np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t / 0.18)
    s += 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.08)
    return s * np.minimum(1, t / 0.0008) * 0.6


def paper(d=0.25):
    t = tt(d)
    return filt(noise(d), [1500, 7000], 'band') * np.exp(-t / 0.05) * (0.6 + 0.4 * np.sin(2 * np.pi * 60 * t))


def thump(d=0.18):
    t = tt(d)
    return np.sin(2 * np.pi * np.cumsum(140 + 120 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.04) + filt(noise(d), 1800, 'low') * np.exp(-t / 0.02) * 0.5


def roll_ticks(buf, t0, t1, g=0.06, f=3600, pan=0.0):
    t = t0
    while t < t1:
        u = (t - t0) / (t1 - t0)
        place(buf, click(0.016, f * (1 + 0.12 * rng.uniform(-1, 1))), t, g * (1 - 0.5 * u), pan)
        t += 0.022 + 0.07 * u ** 2


def typing(buf, t0, d, n, g=0.04):
    step = d / max(1, n)
    for i in range(n):
        place(buf, click(0.015, 4200 + 600 * rng.uniform(-1, 1)), t0 + i * step + rng.uniform(0, step * 0.3), g, rng.uniform(-0.3, 0.3))


def glide(d, f0, f1):
    t = tt(d)
    u = t / d
    fr = f0 * (f1 / f0) ** (u ** 0.6)
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(fr * 2) / SR)
    return s * np.minimum(1, t / 0.01) * (1 - u) ** 1.2


# ------------------------------------------------------------------ harmonia
# voicing do piano (região média), baixo (fundamental grave) e notas do arpejo
CH = {
    'E': ([56, 59, 64, 68], 28, [68, 71, 76, 80]),
    'C#m': ([56, 61, 64, 68], 37, [68, 73, 76, 80]),
    'A': ([57, 61, 64, 69], 33, [69, 73, 76, 81]),
    'B': ([54, 59, 63, 66], 35, [66, 71, 75, 78]),
    'G#m': ([56, 59, 63, 68], 32, [68, 71, 75, 80]),
}
PROG = {1: ['E', 'C#m', 'A', 'B'], 2: ['C#m', 'A', 'E', 'B'], 3: ['A', 'B', 'G#m', 'C#m'], 4: ['A', 'B', 'E', 'E']}
BELL = 92                                             # Sol#6: a terça de Mi maior
ARP = [0, 1, 2, 3, 2, 1, 3, 2, 0, 1, 2, 3, 1, 2, 3, 2]
STAB_STEPS = (3, 6, 10, 14)


def bar_t(b, step=0):
    return (b - 1) * BAR + step * S16


def build(n):
    """Monta o Story n: música + bateria + efeitos dos cues → estéreo bruto."""
    global N
    dur = DATA['durations'][n - 1]
    N = int(round(dur * SR))
    music, drums, sfx, send = stereo(), stereo(), stereo(), stereo()
    kicks = []
    cues = DATA['stories'][n - 1]
    prog = PROG[n]
    T = {c['type']: c['t'] for c in cues}

    def add_kick(t, g=1.0):
        place(drums, kick(), t, g)
        kicks.append(t)

    def groove(b, t_from=0.0, clap_on=True, hats=True, stabs=True, arp_g=0.05, bass_g=0.55, kick_g=1.0, kicks_on=True):
        name = prog[b - 1]
        notes, root, arp = CH[name]
        for s in range(16):
            ts = bar_t(b, s)
            if ts < t_from - 1e-6:
                continue
            if kicks_on and s % 4 == 0:
                add_kick(ts, kick_g)
            if clap_on and s in (4, 12):
                place(drums, clap(), ts, 0.5)
                place(send, clap(), ts, 0.14)
            if hats:
                if s % 4 == 2:
                    place(drums, hat(True), ts, 0.1, 0.3)
                place(drums, shaker(), ts, 0.07 if s % 2 else 0.045, -0.3)
            if s % 2 == 0:                       # baixo em oitavas, colcheias
                nt = root + (12 if s % 4 == 2 else 0)
                place(music, disco_bass(midi(nt), 0.22), ts, bass_g)
            if stabs and s in STAB_STEPS:
                st = stab(notes, 0.26 if s != 14 else 0.4)
                place(music, st, ts, 0.3)
                place(send, st, ts, 0.12)
            if arp_g > 0:
                nt = arp[ARP[s] % 4] + (12 if ARP[s] >= 4 else 0)
                pl = pluck(midi(nt), 0.18)
                place(music, pl, ts, arp_g, -0.45 if s % 2 else 0.45)
                place(send, pl, ts, arp_g * 0.5)
        place(music, pad(notes, BAR + 0.25, 1500, att=0.25, rel=0.35), max(bar_t(b), t_from), 0.16)

    # ---------------- arranjo de cada Story
    if n == 1:
        tl = T['logo']                                    # 1,0 s: a banda entra com a logo
        notes = CH['E'][0]
        place(music, pad(notes + [52], tl + 0.4, 900, att=0.6, rel=0.3), 0.0, 0.42)
        for s in range(8):                                # arpejo filtrado no intro
            nt = CH['E'][2][ARP[s] % 4]
            place(music, pluck(midi(nt), 0.18, 1400 + 300 * s), s * S16, 0.035 + 0.006 * s, -0.4 if s % 2 else 0.4)
        # subida e prato invertido param 40 ms antes do golpe: o ataque da logo fica limpo
        place(sfx, riser(tl - 0.04, 160, 1500) * np.clip((tl - 0.04 - tt(tl - 0.04)) / 0.015, 0, 1), 0.0, 0.3)
        place(sfx, rev_cymbal(0.66), tl - 0.7, 0.28)
        groove(1, t_from=tl, clap_on=False, stabs=False)
        for b in (2, 3, 4):
            groove(b, arp_g=0.045 if b == 2 else 0.055)
        # virada: caixa em semicolcheias no último tempo
        for k in range(4):
            place(drums, snare(0.16, 0.4 + 0.2 * k), bar_t(4, 12 + k), 0.3, 0.2 * (1 if k % 2 else -1))
    elif n == 2:
        groove(1, clap_on=True, stabs=False, arp_g=0.03)
        lp_auto(music, 0.0, BAR, 700, 9000)
        for b in (2, 3, 4):
            groove(b)
        place(drums, crash(2.2), bar_t(2), 0.24, 0.3)
        for k in range(4):
            place(drums, snare(0.16, 0.4 + 0.2 * k), bar_t(4, 12 + k), 0.28, 0.2 * (1 if k % 2 else -1))
    elif n == 3:
        for b in (1, 2, 3, 4):
            groove(b, arp_g=0.04 if b < 3 else 0.055)
        place(drums, crash(2.2), bar_t(3), 0.22, -0.3)
        for k in range(4):
            place(drums, snare(0.16, 0.4 + 0.2 * k), bar_t(4, 12 + k), 0.28, 0.2 * (1 if k % 2 else -1))
    elif n == 4:
        tl = T['logo']                                    # 0,5 s
        place(music, pad(CH['A'][0], tl + 0.3, 900, att=0.3, rel=0.2), 0.0, 0.34)
        place(sfx, rev_cymbal(tl - 0.04), 0.0, 0.26)
        groove(1, t_from=tl + BT, clap_on=False, stabs=False)
        groove(2)
        groove(3)
        # final: só bumbo e piano sustentado na tônica, o resto respira até o fim
        groove(4, clap_on=False, hats=False, stabs=False, arp_g=0.045, bass_g=0.4, kick_g=0.85)
        fin = stab(CH['E'][0] + [71], BAR, spread=0.5)
        place(music, fin, bar_t(4), 0.4)
        place(send, fin, bar_t(4), 0.2)
        place(music, pad([40, 52, 56, 59, 64, 68], BAR, 1800, att=0.08, rel=1.0), bar_t(4), 0.3)
        place(drums, crash(2.4), bar_t(4), 0.22)

    # side-chain do bumbo
    duck = np.ones(N)
    for t in kicks:
        i = int(t * SR)
        j = min(N, i + int(0.24 * SR))
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.42 * np.exp(-np.arange(j - i) / SR / 0.06))
    music *= duck

    # ---------------- efeitos a partir dos cues
    chord_at = lambda t: CH[prog[min(3, int(t // BAR))]]
    for c in cues:
        t, ty, pan, d = c['t'], c['type'], c.get('pan', 0.0), c.get('d', 0.3)
        k = c.get('k', 0)
        if ty == 'swoosh':                                # a fita entra pela esquerda
            place_pan(sfx, ribbon_sound(d + 0.25, 0.45), t, 0.34, c.get('p0', -1), c.get('p1', 0.6))
        elif ty == 'exit':                                # e sai pela direita
            place_pan(sfx, ribbon_sound(d + 0.1, 0.7), t, 0.34, -0.1, 1.0)
        elif ty == 'logo':
            place(sfx, impact(2.2, 1.1), t, 0.62)
            place(send, impact(2.2, 1.1), t, 0.16)
            place(drums, crash(2.6), t, 0.34, -0.15)
            place(send, crash(2.6), t, 0.12)
            b = desk_bell(midi(BELL))
            place(sfx, b, t, 0.5)
            place(send, b, t, 0.3)
        elif ty == 'type':
            typing(sfx, t, d, c.get('n', 12) // 2)
        elif ty == 'rise':
            place(sfx, whoosh(0.26, 700, 3200, 0.7, 1.6), t, 0.08)
        elif ty == 'line':
            nt = chord_at(t)[2][k % 4]
            place(sfx, pluck(midi(nt), 0.25, 2600), t, 0.1, (k - 1) * 0.3)
            place(sfx, whoosh(0.22, 800, 3500, 0.75, 1.6), t - 0.05, 0.06)
        elif ty == 'lift':
            place(sfx, riser(d, 300, 1300), t, 0.22)
            place(sfx, whoosh(d + 0.2, 300, 2400, 0.8, 1.0), t, 0.16)
        elif ty == 'chip':
            if n == 1:                                    # módulos: notas subindo (pentatônica de Mi)
                nt = [76, 78, 80, 83, 85][k]
                place(sfx, pluck(midi(nt), 0.3, 3600), t, 0.15, -0.2 + 0.1 * k)
                place(sfx, blip(midi(nt + 12), 0.09), t, 0.06)
                place(send, pluck(midi(nt), 0.3, 3600), t, 0.08)
                place(sfx, whoosh(0.2, 1500, 6000, 0.85, 2.0), t - 0.2, 0.05)
            else:
                place(sfx, pop(720 + 120 * k), t, 0.16, pan)
                place(sfx, click(0.025, 2600), t, 0.18, pan)
        elif ty == 'tag':
            place(sfx, key_clink(), t, 0.3, pan * 0.8)
            place(sfx, paper(0.16), t - 0.04, 0.12, pan * 0.8)
            place_pan(sfx, whoosh(0.32, 600, 3000, 0.8, 1.4), t - 0.32, 0.07, -0.9, pan)
        elif ty == 'flip':
            nt = chord_at(t)[2][k % 4] + (12 if k == 3 else 0)
            place(sfx, whoosh(0.3, 1200, 5000, 0.85, 1.6), t - 0.28, 0.12, pan)   # a etiqueta gira…
            place(sfx, pluck(midi(nt), 0.32, 3800), t, 0.2, pan)                   # …e o status aparece
            place(send, pluck(midi(nt), 0.32, 3800), t, 0.08, pan)
        elif ty == 'hop':
            place(sfx, click(0.03, 2400), t, 0.22, pan)
            place(sfx, pop(900 + 160 * k), t, 0.12, pan)
        elif ty == 'slide':
            place_pan(sfx, paper(d + 0.05) * 0.6 + whoosh(d + 0.05, 500, 2600, 0.8, 1.4), t, 0.16, -0.9, 0.0)
        elif ty == 'stop':
            place(sfx, thump(), t, 0.22)
            place(sfx, paper(0.12), t, 0.12)
        elif ty == 'coin':
            nt = [83, 85, 88, 92][k]
            place(sfx, coin(midi(nt)), t, 0.2, 0.1)
            place(send, coin(midi(nt)), t, 0.1)
            roll_ticks(sfx, t, t + d, 0.05)
        elif ty == 'pop':
            place(sfx, pop(640), t, 0.18)
        elif ty == 'pay':
            nt = chord_at(t)[2][k % 4] + 12
            place(sfx, pop(760 + 140 * k), t, 0.16, pan)
            place(sfx, blip(midi(nt), 0.12), t, 0.08, pan)
        elif ty == 'paid':
            for i, nt in enumerate([71, 75, 78, 83]):     # arpejo de Si maior: "quitado"
                place(sfx, bell(midi(nt + 12), 1.0), t + i * 0.035, 0.11, -0.3 + 0.2 * i)
                place(send, bell(midi(nt + 12), 1.0), t + i * 0.035, 0.07)
            place(sfx, impact(1.0, 0.5), t, 0.22)
        elif ty == 'drop':
            place(sfx, whoosh(0.35, 3000, 300, 0.3, 1.2), t, 0.2)
            place_pan(sfx, ribbon_sound(d, 0.6), t + 0.25, 0.18, 0.0, 1.0)
        elif ty == 'bar':
            f0, f1 = [(midi(64), midi(88)), (midi(76), midi(64)), (midi(64), midi(92))][k]
            place(sfx, glide(d + 0.15, f0, f1), t, 0.07, [-0.3, 0.0, 0.3][k])
            place(sfx, whoosh(d, 400, 3500, 0.8, 1.4), t, 0.08)
            place(sfx, blip(f1, 0.14), t + d - 0.02, 0.06)
        elif ty == 'arrow':
            place(sfx, pop(880), t, 0.14, 0.6)
            place(sfx, whoosh(0.25, 2000, 600, 0.3, 1.4), t - 0.1, 0.08, 0.6)
        elif ty == 'domain':
            for i, nt in enumerate([80, 83, 88, 92, 95]):
                place(sfx, blip(midi(nt), 0.18), t + i * 0.1, 0.06, -0.4 + 0.2 * i)
                place(send, blip(midi(nt), 0.18), t + i * 0.1, 0.05)
        elif ty == 'link':
            place(sfx, pop(980), t, 0.14)
            place(sfx, bell(midi(88), 0.9), t, 0.06)
            place(send, bell(midi(88), 0.9), t, 0.05)
        elif ty == 'shine':
            for i, nt in enumerate([92, 95, 100, 104]):
                place(sfx, blip(midi(nt), 0.2), t + i * d / 6, 0.025, -0.5 + 0.33 * i)
                place(send, blip(midi(nt), 0.2), t + i * d / 6, 0.03)
        else:
            raise ValueError('cue desconhecido: ' + ty)

    # ---------------- reverb + soma
    send += sfx * 0.12 + music * 0.1
    wet = np.stack([fftconvolve(send[0], ir_norm(2.2, 5))[:N], fftconvolve(send[1], ir_norm(2.2, 6))[:N]])
    mix = music * 0.74 + drums * 0.8 + sfx * 0.95 + wet * 0.55
    t = np.arange(N) / SR
    mix *= np.clip((dur - t) / 0.3, 0, 1)                # cauda curta: o Story acaba em 8 s
    mix *= np.clip(t / 0.003, 0, 1)
    mix = filt(mix, 28, 'high')
    mix = mix + 0.3 * filt(mix, 3500, 'high')           # presença para alto-falante de celular
    body = np.percentile(np.abs(mix), 99.7)
    return np.tanh(mix / body * 0.85) * 0.8


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


def master(mix, out):
    raw = out.replace('.wav', '.raw.wav')
    wavfile.write(raw, SR, (mix.T * 32767).astype(np.int16))
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-c:a', 'pcm_s16le', out], check=True)
    os.remove(raw)
    x = wavfile.read(out)[1].astype(np.float64) / 32768
    lim = true_peak_limit(x)
    lim = np.concatenate([lim, np.zeros((len(x) - len(lim), 2))]) if len(lim) < len(x) else lim
    wavfile.write(out, SR, np.round(lim * 32767).astype(np.int16))
    return js['input_i']


if __name__ == '__main__':
    for n in (1, 2, 3, 4):
        out = os.path.join(ROOT, 'audio', f'story-0{n}.wav')
        li = master(build(n), out)
        print(f'ok -> {out} | entrada {li} LUFS | {len(DATA["stories"][n - 1])} cues')
