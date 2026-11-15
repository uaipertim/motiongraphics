#!/usr/bin/env python3
"""Trilha do Reel 'Sexta, 17:59' — 124 BPM, lá menor, sintetizada só com numpy.
Gera build/trilha_bruta.wav (estéreo 48 kHz, float→int24 sem master). O master fica em master.py."""
import numpy as np, wave, sys, os

SR = 48000; BPM = 124; BT = 60 / BPM; DUR = 59.5
M = int((DUR + 4) * SR)
rng = np.random.default_rng(124)
B = {k: np.zeros((2, M)) for k in ('kick', 'drums', 'bass', 'music', 'fx', 'send')}

def put(b, x, t, g=1.0, pan=0.0, send=0.0):
    i = int(round(t * SR))
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), M - i)
    if n <= 0: return
    l = g * np.cos((pan + 1) * np.pi / 4) * 1.4142; r = g * np.sin((pan + 1) * np.pi / 4) * 1.4142
    B[b][0, i:i + n] += x[:n] * l; B[b][1, i:i + n] += x[:n] * r
    if send: B['send'][0, i:i + n] += x[:n] * l * send; B['send'][1, i:i + n] += x[:n] * r * send

def tt(d): return np.arange(int(d * SR)) / SR
def mf(m): return 440 * 2 ** ((m - 69) / 12)
def filt(x, hp=None, lp=None, n=2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if lp: X *= 1 / np.sqrt(1 + (f / lp) ** (2 * n))
    if hp: X *= 1 / np.sqrt(1 + (hp / np.maximum(f, 1e-3)) ** (2 * n))
    return np.fft.irfft(X, len(x))
def noise(d): return rng.uniform(-1, 1, int(d * SR))
def saw(f, t, ph=0.0):
    p = (np.cumsum(np.broadcast_to(f, t.shape)) / SR + ph) % 1.0
    return 2 * p - 1
def fade(x, a=0.003, r=0.01):
    na, nr = int(a * SR), int(r * SR); x = x.copy()
    x[:na] *= np.linspace(0, 1, na); x[-nr:] *= np.linspace(1, 0, nr); return x

# ───────── instrumentos ─────────
def kick(g=1.0):
    t = tt(0.42); f = 46 + 130 * np.exp(-t * 36)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    x += 0.35 * filt(noise(0.42), hp=2500) * np.exp(-t * 500)
    return fade(np.tanh(x * 1.7) * g, 0.0005, 0.02)
KICK = kick()
def clap():
    t = tt(0.3); e = sum(np.exp(-np.maximum(t - d, 0) * 260) * (t >= d) for d in (0, .011, .023)) * .6 + .5 * np.exp(-t * 30)
    return fade(filt(noise(0.3), hp=900, lp=8000) * e)
CLAP = clap()
def snare(pitch=190):
    t = tt(0.2); x = filt(noise(0.2), hp=1600) * np.exp(-t * 26) + .6 * np.sin(2 * np.pi * pitch * t) * np.exp(-t * 34)
    return fade(x, 0.0005)
def hat(open_=False):
    d = 0.3 if open_ else 0.06; t = tt(d)
    return fade(filt(noise(d), hp=7500, n=3) * np.exp(-t * (15 if open_ else 95)), 0.0005, 0.004)
def crash(d=2.2):
    t = tt(d); return fade(filt(noise(d), hp=3500) * np.exp(-t * 2.4), 0.001, 0.05)
def bass(m, d):
    t = tt(d); f = mf(m)
    x = saw(f, t) + .6 * np.sign(saw(f * 1.003, t, .3))
    e = np.exp(-t * 14)
    x = filt(x, lp=260) * (1 - e) * .9 + filt(x, lp=1500) * e * 1.2 + .6 * np.sin(2 * np.pi * f * t)
    return fade(x * (0.75 + .25 * e), 0.004, 0.03)
def ssaw(ms, d, lp=5000, det=0.006):
    t = tt(d); l = np.zeros_like(t); r = np.zeros_like(t)
    for m in ms:
        f = mf(m)
        for k, dv in enumerate((-1, -.6, -.25, 0, .25, .6, 1)):
            s = saw(f * (1 + det * dv), t, rng.random())
            if k % 2: l += s
            else: r += s
    return filt(l, lp=lp, hp=120) / len(ms), filt(r, lp=lp, hp=120) / len(ms)
def pluck(m, d=0.35, bright=7000):
    t = tt(d); f = mf(m)
    x = saw(f, t) + .5 * np.sign(saw(f * 1.005, t, .5)) + .4 * saw(f * 2.002, t, .2)
    return fade(filt(x, lp=bright, hp=200) * np.exp(-t * 9), 0.002, 0.02)
def bell(f, d=1.2, g=1.0):
    t = tt(d); x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dc) for r, a, dc in ((1, 1, 4), (2.76, .5, 7), (5.4, .3, 11), (8.93, .18, 16)))
    return fade(x * g, 0.001, 0.05)
def blip(f, d=0.11, up=1.25):
    t = tt(d); fr = f * (1 + (up - 1) * t / d)
    return fade(np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 30) + .3 * np.sin(4 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 45), 0.001, 0.01)
def tick(f=2400):
    t = tt(0.03); return fade(np.sin(2 * np.pi * f * t) * np.exp(-t * 240) + .5 * filt(noise(0.03), hp=5000) * np.exp(-t * 400), 0.0003, 0.003)
def nriser(d, power=2.0):
    t = tt(d); n = noise(d); u = t / d
    bands = [filt(n, hp=h, lp=l) for h, l in ((300, 1500), (1200, 4000), (3500, 9000), (8000, None))]
    w = [np.clip(1 - abs(u * 3 - k), 0, 1) for k in range(4)]; w[3] = np.clip(u * 3 - 2, 0, 1)
    return fade(sum(b * ww for b, ww in zip(bands, w)) * u ** power, 0.01, 0.01)
def triser(d, f0=180, oct_=3.5):
    t = tt(d); u = t / d; f = f0 * 2 ** (oct_ * u ** 1.5)
    x = saw(f, t) * (0.6 + .4 * np.sin(2 * np.pi * (4 + 12 * u) * t))
    return fade(filt(x, lp=9000, hp=200) * u ** 1.5, 0.01, 0.005)
def whoosh(d=0.5):
    t = tt(d); u = t / d; n = noise(d)
    x = filt(n, hp=400, lp=2500) * (1 - u) + filt(n, hp=2500, lp=11000) * u
    return fade(x * np.sin(np.pi * u) ** 2, 0.01, 0.01)
def impact(g=1.0, d=1.8):
    t = tt(d); f = 34 + 40 * np.exp(-t * 9)
    x = np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)) + .7 * filt(noise(d), lp=400) * np.exp(-t * 7) + .5 * filt(noise(d), hp=1500) * np.exp(-t * 16)
    return fade(x * g, 0.0005, 0.1)
def thump(g=1.0):
    t = tt(0.25); f = 60 + 120 * np.exp(-t * 40)
    return fade((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) + .6 * filt(noise(.25), hp=1200, lp=9000) * np.exp(-t * 45)) * g, 0.0005, 0.02)
def revcym(d=1.0): return crash(d)[::-1].copy()
def down(d=0.5, f0=1400, f1=90):
    t = tt(d); u = t / d; f = f0 * (f1 / f0) ** u
    return fade(filt(saw(f, t), lp=5000) * (1 - u) ** .5 + .6 * filt(noise(d), hp=500, lp=6000) * (1 - u), 0.005, 0.02)

# ───────── forma ─────────
CH = {'Am': [57, 60, 64], 'F': [53, 57, 60], 'C': [55, 60, 64], 'G': [55, 59, 62]}
ROOT = {'Am': 33, 'F': 29, 'C': 36, 'G': 31}
CHORDS = ['Am', 'Am', 'Am', 'F', 'Am', 'F', 'G', 'G'] + ['Am', 'F', 'C', 'G'] * 5 + ['Am', 'Am']
LEAD = {'Am': [(0, 76), (3, 76), (6, 74), (8, 72), (11, 69), (14, 72)], 'F': [(0, 74), (3, 72), (6, 69), (8, 72), (12, 69)],
        'C': [(0, 76), (3, 76), (6, 79), (8, 76), (11, 74), (14, 72)], 'G': [(0, 74), (3, 74), (6, 71), (8, 74), (10, 76), (12, 79), (14, 81)]}
S16 = BT / 4
kicks = []
def K(beat, g=1.0): put('kick', KICK, beat * BT, g); kicks.append(beat * BT)

SN = snare(); HC = hat(); HO = hat(True); CR = crash()
for bar in range(30):
    b0 = bar * 4; t0 = b0 * BT; ch = CHORDS[bar]
    drop = 8 <= bar < 16 or 20 <= bar < 26; dropB = 20 <= bar < 26
    groove = bar in (2, 3); build1 = bar in (4, 5, 6); brk = bar in (16, 17); build2 = bar in (18, 19); outro = bar in (26, 27)
    # bumbo
    if groove or build1 or drop or outro or build2:
        for q in range(4):
            if (bar == 6 and q == 3) or (bar == 19 and q == 3): continue
            K(b0 + q, .85 if (groove or build1 or build2) else 1.0)
    # palmas / chimbais
    if groove or drop or outro or (build2 and bar == 19):
        for q in (1, 3):
            if bar == 19 and q == 3: continue
            put('drums', CLAP, (b0 + q) * BT, .55 if drop else .42, send=.25)
    if groove or build1 or drop or outro:
        for s in range(16):
            if bar == 6 and s >= 12: break
            if drop or outro:
                put('drums', HC, t0 + s * S16, (.2 if s % 2 == 0 else .12) * (1.15 if dropB else 1), pan=.25 if s % 2 else -.25)
                if s % 4 == 2: put('drums', HO, t0 + s * S16, .2 if dropB else .16, pan=.15)
            elif s % 2 == 0:
                put('drums', HC, t0 + s * S16, .15 if s % 4 else .1, pan=.2)
                if s % 4 == 2 and bar >= 3: put('drums', HO, t0 + s * S16, .09)
    # baixo
    if groove or build1 or drop or outro:
        for s in (2, 6, 10, 14):
            if bar == 6 and s >= 12: break
            put('bass', bass(ROOT[ch], .2), t0 + s * S16, .5 if drop or outro else .42)
        if drop:
            put('bass', bass(ROOT[ch] + 12, .1), t0 + 15 * S16, .32); put('bass', bass(ROOT[ch], .1), t0 + 7 * S16, .3)
    if brk or build2:
        put('bass', fade(np.sin(2 * np.pi * mf(ROOT[ch] + 12) * tt(4 * BT)) * .9, .05, .1), t0, .32)
    # acordes
    if drop or outro:
        for s in (2, 6, 10, 14):
            l, r = ssaw(CH[ch] + [CH[ch][0] + 12], .17, lp=6500 if dropB else 4800)
            e = np.exp(-tt(.17) * 6); put('music', fade(l * e), t0 + s * S16, .15, -.6, send=.3); put('music', fade(r * e), t0 + s * S16, .15, .6, send=.3)
        l, r = ssaw([m - 12 for m in CH[ch]], 4 * BT, lp=1800); put('music', fade(l, .02, .05), t0, .07, -.7); put('music', fade(r, .02, .05), t0, .07, .7)
    if groove or build1:
        cut = 1500 + 900 * (bar - 2)
        for s in (0, 3, 6, 10, 13):
            if bar == 6 and s >= 12: break
            l, r = ssaw(CH[ch], .14, lp=cut); e = np.exp(-tt(.14) * 10)
            put("music", fade(l * e), t0 + s * S16, .22, -.5, send=.3); put("music", fade(r * e), t0 + s * S16, .22, .5, send=.3)
    if brk or build2 or bar in (0, 1, 7):
        g = {0: .09, 1: .11, 7: .07}.get(bar, .13); l, r = ssaw(CH[ch] + [CH[ch][1] + 12], 4 * BT, lp=1400 if bar in (0, 1, 7) else 2600)
        put('music', fade(l, .25, .3), t0, g, -.7, send=.4); put('music', fade(r, .25, .3), t0, g, .7, send=.4)
    if brk or build2:
        notes = CH[ch] + [CH[ch][0] + 12, CH[ch][1] + 12, CH[ch][2] + 12]
        for s in range(0, 16, 2 if brk else 1):
            m = notes[(s // (2 if brk else 1)) % 6] + 12
            put('music', pluck(m, .3, 4000 + 250 * s), t0 + s * S16, .11 if brk else .08 + .004 * s, pan=.5 * np.sin(s), send=.45)
    # tema
    if drop or outro:
        for s, m in LEAD[ch]:
            put('music', pluck(m, .34, 8000), t0 + s * S16, .26, pan=-.1, send=.35)
            put('music', pluck(m, .3, 5000), t0 + (s + 3) * S16, .07, pan=.5, send=.3)   # eco pontuado
            if dropB: put('music', pluck(m + 12, .26, 11000), t0 + s * S16, .11, pan=.2, send=.4)

# ───────── eventos por cena (os mesmos tempos do vídeo) ─────────
def FX(x, beat, g=1.0, pan=0.0, send=0.2): put('fx', x, beat * BT, g, pan, send)
# S1 · relógio
FX(impact(.7), 0, .6); FX(bell(mf(69), 1.5), 0, .1, send=.6)
for i in range(8): FX(tick(2600 if i % 2 == 0 else 1900), i * .5, .28, pan=-.3 if i % 2 else .3)
FX(bell(mf(88), 1.6), 4, .22, send=.6); FX(bell(mf(81), 1.6), 4, .16, send=.6); FX(thump(), 4, .7); FX(CLAP, 4, .4)
for q in range(4, 8): put('kick', KICK, q * BT, .55)
for i in range(8, 16): FX(tick(2600 if i % 2 == 0 else 1900), i * .5, .3, pan=-.3 if i % 2 else .3)
FX(nriser(4 * BT), 4, .32); FX(revcym(1.0), 8 - 1.0 / BT, .22); FX(whoosh(.45), 8 - .3 / BT, .35)
# S2 · palavras batendo
for k, b in enumerate((8, 8.5, 9, 9.5)): FX(thump(), b, .6); FX(SN, b, .3 + .05 * k, send=.3)
FX(CR, 8, .22, send=.3); FX(whoosh(.4), 16 - .2 / BT, .4)
# S3 · perguntas + build
for k, b in enumerate((16, 18, 20, 22)):
    FX(impact(.6, 1.0), b, .5); FX(blip(520 + 90 * k, .09, 1.05), b + .04, .3, pan=.3); FX(blip(780 + 135 * k, .14, 1.3), b + .26, .34, pan=.3)
for s in range(0, 16): FX(SN, 16 + s * .5, .1 + .012 * s, send=.2)
for s in range(0, 12): FX(snare(190 + 6 * s), 24 + s * .25, .2 + .02 * s, send=.2)
FX(nriser(11 * BT), 16, .42); FX(triser(11 * BT), 16, .16)
FX(down(BT * 1.0), 27, .5, send=.4); FX(revcym(.48), 27, .25); FX(thump(), 28, .8, send=.5); FX(impact(.5, 1.5), 28, .5, send=.5)
# S4 · respira
t = tt(2.3 * BT); FX(fade(filt(noise(2.3 * BT), hp=500, lp=3000) * np.sin(np.pi * t / t[-1] * .5) ** 2, .05, .08), 28.1, .16, send=.5)
t = tt(1.15 * BT); FX(fade(filt(noise(1.15 * BT), hp=250, lp=1600) * np.cos(np.pi * t / t[-1] * .5) ** 2, .03, .05), 30.45, .15, send=.5)
FX(bell(mf(76), 1.8), 28.5, .1, send=.7)
FX(revcym(1.1), 32 - 1.1 / BT, .4); FX(nriser(.6 * BT, 1.2), 31.4, .5)
for s in range(8): FX(snare(200 + 10 * s), 31 + s * .125, .16 + .05 * s)
# quedas e cortes
for b, g in ((32, 1.0), (80, 1.1)): FX(impact(1.0), b, .85, send=.3); FX(CR, b, .5, send=.4)
for b in (40, 48, 56, 64): FX(whoosh(.36), b - .2 / BT, .45); FX(CR, b, .22 if b != 64 else .15, send=.4); FX(thump(), b, .5)
for b in (86, 92, 98): FX(whoosh(.36), b - .2 / BT, .5); FX(impact(.8, 1.2), b, .6); FX(CR, b, .3, send=.4)
# S5 · pílulas encaixando (pentatônica subindo)
PENT = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91]
for i in range(10): FX(blip(mf(PENT[i]), .1, 1.02), 32 + (1 + i) * .5, .2, pan=(-1) ** i * .5, send=.4)
# S6 · chave gira, etiquetas
FX(tick(1500), 42, .5); FX(thump(.6), 42, .5)
for i in range(8): FX(blip(mf(81 + (i % 4) * 2), .07, 1.1), 43 + i * .25, .17, pan=(i % 4 - 1.5) * .4, send=.3)
FX(bell(mf(88), 1.0), 46, .14, send=.5)
# S7 · palavras + linhas da comanda
for k in range(4): FX(thump(.7), 48 + k * .5, .4)
for k in range(8): FX(tick(3200), 48.6 + k * .62, .25, pan=-.6)
# S8 · caixa: contagem e fechamento
for s in range(14): FX(tick(1800 + 90 * s), 56.5 + s * .25, .22, pan=.2 * (-1) ** s)
FX(bell(mf(88), 1.4), 60, .24, send=.6); FX(bell(mf(93), 1.4), 60.25, .22, send=.6); FX(impact(.7, 1.2), 60, .5)
for s in range(4): FX(SN, 63 + s * .25, .3 + .05 * s, send=.3)
FX(down(BT), 63, .3, send=.4)
# S9 · respiro com passarinhos
for b in (65.5, 67.2, 69.7):
    t = tt(.09); FX(fade(np.sin(2 * np.pi * np.cumsum(3200 + 1500 * np.sin(2 * np.pi * 11 * t)) / SR), .005, .02), b, .07, pan=.5, send=.6)
# S10 · sineta + build
for q in range(8): FX(bell(mf(88 if q % 2 == 0 else 91), .9), 72 + q, .2 + .012 * q, pan=.15, send=.5)
for s in range(8): FX(SN, 72 + s * .5, .14 + .02 * s, send=.2)
for s in range(12): FX(snare(190 + 7 * s), 76 + s * .25, .22 + .025 * s, send=.2)
for s in range(4): FX(snare(280 + 14 * s), 79 + s * .125, .5 + .05 * s)
FX(nriser(8 * BT), 72, .5); FX(triser(8 * BT, 200, 3.2), 72, .2); FX(revcym(1.2), 80 - 1.2 / BT, .4)
# S11 · contagens
for j, b in enumerate((80, 86, 92, 98)):
    for s in range(10): FX(tick(1500 + 160 * s if j < 3 else 3000 - 160 * s), b + .1 + s * .11, .2, pan=.3 * (-1) ** s)
FX(bell(mf(93), 1.2), 98 + .64 / BT, .22, send=.6)
for s in range(4): FX(SN, 103 + s * .25, .3 + .05 * s, send=.3)
# S12
FX(impact(.8, 1.2), 104, .6); FX(CR, 104, .3, send=.4)
for i, m in enumerate((84, 88, 91, 96)): FX(bell(mf(m), .9), 105.5 + i * .25, .1, pan=.4 * (-1) ** i, send=.7)
for s in range(8): FX(SN, 110 + s * .25, .16 + .04 * s, send=.2)
FX(nriser(4 * BT), 108, .4); FX(revcym(1.0), 112 - 1.0 / BT, .35); FX(down(.2 * BT, 400, 2500), 111.8, .25)
# S13 · assinatura
FX(impact(1.0, 2.6), 112, .9, send=.3); FX(CR, 112, .45, send=.5); K(112, 1.0)
l, r = ssaw([45, 57, 64, 69, 71, 76], 5.2, lp=7000); e = np.exp(-tt(5.2) * .9)
put('music', fade(l * e, .002, .4), 112 * BT, .3, -.7, send=.5); put('music', fade(r * e, .002, .4), 112 * BT, .3, .7, send=.5)
FX(blip(mf(81), .12, 1.5), 113, .4, send=.5); FX(bell(mf(88), 2.0), 113, .2, send=.7)
for i in range(13): FX(tick(2800), 115 + i * 1.5 / 13, .3, pan=-.3 + .05 * i)
FX(bell(mf(93), 2.5), 117, .13, send=.8); FX(bell(mf(81), 2.5), 117, .1, send=.8)

# ───────── sidechain, reverb, soma ─────────
sc = np.ones(M); tk = np.arange(M) / SR
for kt in kicks:
    i = int(kt * SR); n = int(.42 * SR); sc[i:i + n] = np.minimum(sc[i:i + n], 1 - .78 * np.exp(-tt(.42) * 8.5))
B['bass'] *= sc; B['music'] *= .35 + .65 * sc
ir_t = tt(1.8); out_rev = np.zeros((2, M))
for chn in range(2):
    ir = filt(rng.normal(0, 1, len(ir_t)) * np.exp(-ir_t * 3.6), hp=350, lp=9000); ir /= np.sqrt(np.sum(ir ** 2))
    nfft = 1 << int(np.ceil(np.log2(M + len(ir))))
    out_rev[chn] = np.fft.irfft(np.fft.rfft(B['send'][chn], nfft) * np.fft.rfft(ir, nfft), nfft)[:M]
mix = B['kick'] * .62 + B['drums'] * 1.7 + B['bass'] * .62 + B['music'] * 2.3 + B['fx'] * 1.15 + out_rev * .75
# automação de seção: a queda é o ponto mais alto
bars = np.arange(M) / SR / (4 * BT); gain = np.ones(M)
for a, b, g in ((0, 2, 1.0), (2, 4, .82), (4, 7, .84), (7, 8, .8), (8, 16, 1.0), (16, 18, .8), (18, 20, .84), (20, 26, 1.06), (26, 28, .92), (28, 40, .92)):
    gain[(bars >= a) & (bars < b)] = g
k = int(.02 * SR); gain = np.convolve(np.pad(gain, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), 'valid')[:M]
mix *= gain
mix = mix[:, :int(DUR * SR)]
fo = int(.35 * SR); mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
# brilho leve para alto-falante de celular + limpeza de subgrave
for chn in range(2):
    X = np.fft.rfft(mix[chn]); f = np.fft.rfftfreq(mix.shape[1], 1 / SR)
    X *= 1 / np.sqrt(1 + (28 / np.maximum(f, 1e-3)) ** 4); X *= 1 + .45 / (1 + (5000 / np.maximum(f, 1)) ** 4)
    mix[chn] = np.fft.irfft(X, mix.shape[1])
mix /= np.max(np.abs(mix))
out = sys.argv[1] if len(sys.argv) > 1 else 'build/trilha_bruta.npy'
np.save(out, mix.astype(np.float32)); print('ok', out, mix.shape)
