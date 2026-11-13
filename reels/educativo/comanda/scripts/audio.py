#!/usr/bin/env python3
"""
Áudio do Reel "A caipirinha da piscina entrou na conta?" (sem narração, só elementos gráficos): a TRILHA dos educativos aprovados (a da Série Explica,
copiada sem alteração: Am9 → Fmaj9 → Cmaj9 → G6/9 a 92 BPM) sem ducking (não há voz) + efeitos sutis nos gestos da animação
(audio/eventos.json, de `node scripts/render.cjs dados`): o pulso do "?", as etiquetas, os cartões voando, a queda, o painel da
comanda, o encaixe de cada cartão, os chips batendo (3 → 4, 2 → 4), a contagem, o risco e o selo do cancelado, a pilha
fechando, o check e a marca.

    python3 scripts/audio.py   -> audio/mix.wav (48 kHz, estéreo, −14 LUFS, pico real ≤ −2,4 dBTP no WAV, ≤ −1,5 dBTP no MP4) + audio/cues.json
"""
import json, os, re, subprocess, sys
import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, 'audio')
DUR = float(json.load(open(os.path.join(ROOT, 'audio', 'eventos.json')))['duracao'])
SR = 48000
N = int(round(SR * DUR))
TARGET_LUFS = -14.0
rng = np.random.default_rng(2024)

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


def add(*xs):
    """Soma sinais de comprimentos diferentes (completa com silêncio)."""
    out = np.zeros(max(len(x) for x in xs))
    for x in xs:
        out[: len(x)] += x
    return out


def stereo():
    return np.zeros((2, N))


def place(buf, sig, t, g=1.0, pan=0.0):
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


def sweep(x, f0, f1, q=1.4):
    out = np.zeros_like(x)
    n, B, zi = len(x), 256, None
    for i in range(0, n, B):
        fc = f0 * (f1 / f0) ** (i / max(1, n - 1))
        sos = butter(2, [fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 * 0.95)], 'band', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + B], zi = sosfilt(sos, x[i:i + B], zi=zi)
    return out


def ir_room(d=0.7, seed=0, damp=0.16, lp=5200):
    """Sala pequena (recepção): reflexões curtas e abafadas."""
    r = np.random.default_rng(seed)
    t = tt(d)
    x = filt(r.standard_normal(len(t)) * np.exp(-t / damp), lp, 'low')
    x[: int(0.004 * SR)] = 0                           # pré-atraso
    return x / np.sqrt((x ** 2).sum())


# ------------------------------------------------------------------ timbres
def click(d=0.025, f=3000, dec=0.003):
    t = tt(d)
    return filt(noise(d), [f * 0.6, f * 1.6], 'band') * np.exp(-t / dec)


def wood(f=1900, d=0.06, dec=0.012):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.63 * t)) * np.exp(-t / dec) * np.minimum(1, t / 0.0005)


def thump(d=0.5, tone=46, dec=0.18, punch=1.0):
    t = tt(d)
    f = tone + 120 * np.exp(-t / 0.025)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec)
    return np.tanh(2.0 * punch * body) * np.clip((d - t) / 0.02, 0, 1)


def whoosh(d=0.4, f0=300, f1=3000, peak=0.6, q=1.2):
    t = tt(d)
    u = t / d
    return sweep(noise(d), f0, f1, q) * np.where(u < peak, (u / peak) ** 2, ((1 - u) / (1 - peak)) ** 1.5)


def desk_bell(f, d=3.0):
    """A sineta de recepção da série (parciais inarmônicos com batimento)."""
    t = tt(d)
    s = np.zeros_like(t)
    for m, a, dec in [(1.0, 1.0, 1.5), (1.0026, 0.55, 1.3), (2.0, 0.08, 0.6), (2.76, 0.42, 0.42), (2.766, 0.25, 0.38),
                      (4.1, 0.1, 0.2), (5.40, 0.2, 0.16), (0.5, 0.5, 2.2), (0.5013, 0.3, 2.0)]:
        s += a * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / dec)
    s += filt(noise(d), [2500, 12000], 'band') * np.exp(-t / 0.0025) * 0.9
    return s * np.minimum(1, t / 0.0006) / 2.3




def paper_tear(d=0.45):
    """a notinha destacando: o papel rasgando em fibras (estalinhos sobre um chiado que sobe)"""
    t = tt(d)
    base = filt(noise(d), [1800, 7000], 'band') * np.minimum(1, t / 0.03) * np.exp(-t / 0.16)
    cr = np.zeros_like(t)
    for k in range(26):
        i = int(rng.uniform(0, d * 0.75) * SR)
        c = click(0.012, 2500 + 3500 * rng.random(), 0.0015)
        cr[i:i + len(c)] += c[: max(0, len(cr) - i)] * rng.uniform(0.3, 1.0)
    return base * 0.8 + cr * 0.6


def keys_jingle():
    """o chaveiro balançando: a argola e a plaquinha tilintando"""
    out = np.zeros(int(0.6 * SR))
    for k, (t0, f) in enumerate([(0.0, 4200), (0.05, 5100), (0.13, 3900), (0.22, 4700)]):
        s = coin_clink(f) * (0.9 - 0.18 * k)
        i = int(t0 * SR); out[i:i + len(s)] += s[: len(out) - i]
    return out


def ping(f, d=0.6):
    """Ping suave e genérico: seno com um leve brilho (2º e 3º parciais) e decaimento curto."""
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * 2 * f * t + 0.4) * np.exp(-t / 0.09) + 0.06 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.05)
    s += 0.12 * np.sin(2 * np.pi * f * 1.003 * t)                # leve batimento, mais redondo
    return s * np.minimum(1, t / 0.003) * np.exp(-t / 0.2) / 1.3


def stamp_hit():
    """O carimbo: corpo grave, o tapa da borracha no papel, o balcão vibrando."""
    d = 0.9
    t = tt(d)
    body = np.sin(2 * np.pi * np.cumsum(52 + 95 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.13)
    thwack = filt(noise(d), [260, 2600], 'band') * np.exp(-t / 0.02)
    slap = filt(noise(d), [3000, 9000], 'band') * np.exp(-t / 0.005) * 0.6
    desk = wood(205, d, 0.09) * 0.55 + wood(318, d, 0.06) * 0.3
    return np.tanh(1.7 * (body * 1.05 + thwack * 0.95 + slap + desk))


def rattle():
    """O tranco: a impressora e o papel chacoalham."""
    d = 0.45
    out = np.zeros(int(d * SR))
    for k, t0 in enumerate([0.012, 0.045, 0.078, 0.118, 0.165, 0.226, 0.3]):
        g = 0.9 * np.exp(-t0 / 0.12)
        s = add(click(0.03, 1700 + 900 * rng.random(), 0.003) * g, wood(1150 + 300 * rng.random(), 0.04, 0.006) * g * 0.4)
        i = int(t0 * SR)
        out[i:i + len(s)] += s
    out += filt(noise(d), [1200, 6000], 'band') * np.exp(-tt(d) / 0.05) * 0.25
    return out


def room_tone():
    """Ambiente de recepção quase inaudível."""
    x = filt(rng.standard_normal(N), [70, 1300], 'band', 2)
    x += filt(rng.standard_normal(N), [2000, 6000], 'band', 2) * 0.15
    return x / np.sqrt(np.mean(x ** 2)) * 10 ** (-56 / 20)


def true_peak_limit(x, ceiling_db=-2.5, os_=4):
    """Limitador de pico real: o ganho é calculado no sinal sobreamostrado (os_ x) com
    antecipação de 2 ms e suavização de 1 ms, e aplicado ao sinal original."""
    c = 10 ** (ceiling_db / 20)
    up = resample_poly(x, os_, 1, axis=0)
    need = np.minimum(1.0, c / np.maximum(np.abs(up).max(axis=1), 1e-9))
    w = int(0.002 * SR * os_)
    g = uniform_filter1d(minimum_filter1d(need, w), w // 2)
    g = g[: len(g) // os_ * os_].reshape(-1, os_).min(axis=1)
    y = x[: len(g)] * g[:, None]
    return np.concatenate([y, np.zeros((len(x) - len(y), 2))]) if len(y) < len(x) else y




# ------------------------------------------------------------------ timbres novos
def printer(d=0.4, big=False):
    """a impressora térmica: um zumbido de motor de passo (modulado a 38 Hz) com cliques de cabeça"""
    t = tt(d)
    am = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 38 * t))
    body = filt(noise(d), [900, 3800], 'band') * am * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03)
    body += np.sin(2 * np.pi * 190 * t) * 0.12 * am * np.minimum(1, (d - t) / 0.03)
    cl = np.zeros_like(t)
    for k in range(int(d * 38)):
        i = int(k / 38 * SR)
        c = click(0.012, 2600, 0.002)
        cl[i:i + len(c)] += c[: max(0, len(cl) - i)] * 0.5
    out = body + cl
    if big:                                           # o corte do papel ao fim do total
        out = add(out, wood(1500, 0.08, 0.012) * 0.6)
    return out


def pen(d=0.9):
    """caneta riscando: ruído filtrado que vai subindo e descendo, com arranhões"""
    t = tt(d)
    f = 2200 + 900 * np.sin(2 * np.pi * 7 * t)
    x = np.zeros_like(t)
    for k, fc in enumerate(np.linspace(1800, 3600, 8)):
        seg = filt(noise(d), [fc * 0.7, fc * 1.4], 'band')
        x += seg * (0.5 + 0.5 * np.sin(2 * np.pi * (5 + k) * t + k))
    return x * 0.25 * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.12)


def tick(f=1500):
    return add(wood(f, 0.05, 0.007) * 0.8, click(0.01, 4200, 0.0015) * 0.4)


def riser(d=0.5, f0=250, f1=2600):
    return whoosh(d, f0, f1, 0.9, 1.0)


def slam():
    """o impacto do valor: baque grave com cauda e um brilho de agudo"""
    d = 1.0
    t = tt(d)
    body = np.sin(2 * np.pi * np.cumsum(60 + 140 * np.exp(-t / 0.025)) / SR) * np.exp(-t / 0.2)
    shine = filt(noise(d), [3500, 9000], 'band') * np.exp(-t / 0.05) * 0.3
    return np.tanh(1.8 * body) + shine


def fall(d=0.7):
    """queda: sopro descendente e um baque ao chegar embaixo"""
    w = sweep(noise(d), 2800, 220, 1.0) * np.minimum(1, np.arange(int(d * SR)) / SR / 0.05) * np.minimum(1, (d - tt(d)) / 0.1)
    return w * 0.9


def pop(f=700):
    t = tt(0.12)
    return np.sin(2 * np.pi * f * t * (1 + 0.5 * np.exp(-t / 0.02))) * np.exp(-t / 0.03)



def coin_clink(f=3200):
    t = tt(0.35)
    s = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / dec) for m, a, dec in [(1, 1, 0.08), (1.47, 0.6, 0.06), (2.31, 0.4, 0.04), (3.1, 0.2, 0.03)])
    return add(s, click(0.02, 6000, 0.002) * 0.5) * 0.6


def lock_clunk():
    return add(thump(0.35, 70, 0.06, 1.0) * 0.7, wood(900, 0.12, 0.02) * 0.6, click(0.03, 3500, 0.004) * 0.7, wood(2400, 0.06, 0.008) * 0.35)


def check_ding():
    a, b = ping(midi(84), 0.4), ping(midi(91), 0.5)
    out = np.zeros(int(0.6 * SR)); out[:len(a)] += a * 0.7; i = int(0.07 * SR); out[i:i + len(b)] += b[: len(out) - i]
    return out


def buzz(d=0.28):
    t = tt(d)
    x = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.4 + np.sin(2 * np.pi * 220 * t) * 0.3
    x = filt(x, 1800, 'low') * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.04)
    return x * (0.6 + 0.4 * (np.sin(2 * np.pi * 14 * t) > 0))


def typing(d):
    out = np.zeros(int((d + 0.1) * SR))
    k, tcur = 0, 0.0
    while tcur < d:
        s = add(click(0.02, 2400 + 1600 * rng.random(), 0.002) * 0.8, wood(1200 + 500 * rng.random(), 0.03, 0.005) * 0.3)
        i = int(tcur * SR); out[i:i + len(s)] += s[: max(0, len(out) - i)]
        tcur += 1 / 22 * (0.7 + 0.6 * rng.random()); k += 1
    return out


def sparkle():
    out = np.zeros(int(0.6 * SR))
    for k, n in enumerate([88, 91, 95, 100]):
        s = ping(midi(n), 0.4) * 0.5; i = int(k * 0.05 * SR); out[i:i + len(s)] += s[: len(out) - i]
    return out



# ------------------------------------------------------------------ os eventos, tirados da mesma linha do tempo da animação
EVS = json.load(open(os.path.join(AUD, 'eventos.json')))['eventos']
ev = []
for e in EVS:
    t, ty = e['t'], e['tipo']
    if t < 0:
        continue
    ev.append((t, ty))
ev.append(([e['t'] for e in EVS if e['tipo'] == 'logo'][0] + 0.25, 'bell'))        # a sineta com a marca (e o último acorde da trilha)
json.dump({'duracao': DUR, 'cues': [{'t': round(t, 4), 'type': ty} for t, ty in sorted(ev)]}, open(os.path.join(AUD, 'cues.json'), 'w'), indent=1)
CUES = {'cues': [{'t': t, 'type': ty} for t, ty in sorted(ev)]}

# ------------------------------------------------------------------ sem voz
voz = np.zeros(N)

# ------------------------------------------------------------------ os efeitos
sfx, send = stereo(), stereo()
for c in CUES['cues']:
    t, ty = c['t'], c['type']
    if ty == 'salto': place_pan(sfx, whoosh(0.32, 500, 2800, 0.5, 1.2), t - 0.04, 0.2, -0.3, 0.3); place(sfx, pop(620), t + 0.18, 0.12)
    elif ty == 'encaixa': place(sfx, wood(1500, 0.04, 0.008), t - 0.02, 0.22); place(sfx, click(0.02, 2600, 0.002), t - 0.02, 0.1)
    elif ty == 'volta': place_pan(sfx, whoosh(0.28, 2400, 700, 0.5, 1.2), t, 0.1, 0.3, -0.3)
    elif ty == 'toque': place(sfx, click(0.025, 2200, 0.003), t, 0.32); place(sfx, wood(900, 0.05, 0.01), t, 0.15)
    elif ty == 'tecla': place(sfx, click(0.018, 2800 + 600 * rng.random(), 0.002), t, 0.16); place(sfx, wood(1300 + 300 * rng.random(), 0.03, 0.005), t, 0.06)
    elif ty == 'conta':
        for k in range(14):                                         # a contagem: tiques subindo de tom
            place(sfx, tick(1700 + 40 * k), t + k * 0.055, 0.05)
    elif ty == 'pulso': place(sfx, ping(midi(76), 0.5), t, 0.16); place(send, ping(midi(76), 0.5), t, 0.06)
    elif ty == 'aviso': place(sfx, ping(midi(81), 0.4), t, 0.12)
    elif ty == 'apaga': place(sfx, fall(0.7), t, 0.18)
    elif ty == 'embaralha': place_pan(sfx, whoosh(0.5, 900, 2200, 0.5, 1.0), t, 0.12, 0.5, -0.5)
    elif ty == 'puxa': place(sfx, riser(0.45, 300, 2400), t, 0.18)
    elif ty == 'acende': place(sfx, sparkle(), t, 0.16); place(send, sparkle(), t, 0.08)
    elif ty == 'folha': place(sfx, whoosh(0.3, 600, 2600, 0.5, 1.2), t, 0.16)
    elif ty == 'folha_fecha': place(sfx, whoosh(0.3, 2600, 600, 0.5, 1.2), t, 0.14)
    elif ty == 'tela': place(sfx, whoosh(0.22, 900, 2600, 0.4, 1.3), t, 0.1)
    elif ty == 'afasta': place_pan(sfx, whoosh(0.7, 2200, 400, 0.5, 1.1), t, 0.16, 0.2, -0.2)
    elif ty == 'etiqueta':
        for k in range(3): place(sfx, pop(560 + 90 * k), t + k * 0.12, 0.18, -0.4 + 0.4 * k)
    elif ty == 'voo': place_pan(sfx, whoosh(0.6, 500, 2400, 0.5, 1.0), t, 0.14, -0.5, 0.5)
    elif ty == 'queda': place_pan(sfx, fall(0.8), t, 0.2, 0.0, -0.8)
    elif ty == 'aterra': place(sfx, wood(1400, 0.05, 0.01), t - 0.02, 0.22); place(sfx, click(0.02, 2600, 0.002), t - 0.02, 0.1)
    elif ty == 'troca': place(sfx, pop(880), t, 0.18); place(sfx, ping(midi(84), 0.4), t + 0.02, 0.08)
    elif ty == 'entra': place(sfx, whoosh(0.7, 300, 2200, 0.55, 1.1), t, 0.2)
    elif ty == 'rola': place(sfx, whoosh(0.4, 1800, 900, 0.4, 1.4), t, 0.06)
    elif ty == 'painel': place(sfx, whoosh(0.5, 300, 2400, 0.55, 1.1), t, 0.2); place(sfx, wood(700, 0.08, 0.02), t + 0.4, 0.18)
    elif ty == 'risco': place(sfx, pen(0.45), t, 0.45, 0.2)
    elif ty == 'selo': place(sfx, stamp_hit(), t, 0.42); place(send, stamp_hit(), t, 0.08)
    elif ty == 'fecha': place_pan(sfx, whoosh(0.6, 2400, 500, 0.5, 1.2), t, 0.18, 0.3, -0.3)
    elif ty == 'check': place(sfx, check_ding(), t, 0.32); place(send, check_ding(), t, 0.1)
    elif ty == 'logo': place_pan(sfx, whoosh(0.4, 300, 3000, 0.55, 1.1), t, 0.22, -0.6, 0.6)
    elif ty == 'bell': b = desk_bell(midi(91)); place(sfx, b, t, 0.42); place(send, b, t, 0.3)
sfx *= 10 ** (-13 / 20)
LN_C = [{'voz_t1': DUR - 2.0}]

# --- a trilha contínua
BPM = 92.0
BT = 60.0 / BPM
CHORDS = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [60, 64, 67, 71, 74], [55, 59, 62, 66, 69]]      # Am9, Fmaj9, Cmaj9, G6/9
music = np.zeros(N)
t = np.arange(N) / SR
bars = 2 * BT * 4
SINO = [c['t'] for c in CUES['cues'] if c['type'] == 'bell']
FIM = SINO[-1] if SINO else LN_C[-1]['voz_t1'] + 0.6                                                  # o último acorde entra com a sineta da logo e sustenta
nb = int(FIM / bars) + 1
for k in range(nb + 1):
    t0 = k * bars
    last = k == nb
    if last:
        t0 = FIM
    if t0 >= DUR:
        break
    ch = CHORDS[k % 4] if not last else CHORDS[0]
    d = (bars if not last else DUR - t0) + 1.6
    tt_ = tt(d)
    env = np.minimum(1, tt_ / (1.2 if not last else 0.4)) * np.exp(-np.maximum(0, tt_ - (bars if not last else d - 1.6)) / 0.6)
    pad = np.zeros_like(tt_)
    for n in ch:
        f = midi(n)
        for det in (-0.004, 0.0, 0.004):
            pad += np.sin(2 * np.pi * f * (1 + det) * tt_ + rng.uniform(0, 6)) * 0.5 + 0.22 * np.sin(2 * np.pi * 2 * f * (1 + det) * tt_)
    pump = 1 - 0.18 * np.exp(-((tt_ % (2 * BT)) / 0.18))                                                # respiração suave a cada 2 tempos
    pad = filt(pad, 1500, 'low') * env * pump / (len(ch) * 3)
    bass = np.sin(2 * np.pi * midi(ch[0] - 12) * tt_) * env * 0.45
    i = int(t0 * SR); j = min(N, i + len(pad))
    music[i:j] += (pad + bass)[: j - i]
    if last:
        break
    for q in range(8):                                                                                 # pulso grave nos tempos 1 e 3
        tb = t0 + q * BT
        if q % 2 == 0 and tb < FIM:
            s = thump(0.35, 52, 0.12, 0.5) * 0.28; ii = int(tb * SR); jj = min(N, ii + len(s)); music[ii:jj] += s[: jj - ii]
    for q in range(int(bars / (BT / 2))):                                                              # shaker em colcheias, bem baixo
        tb = t0 + q * BT / 2
        if tb >= FIM:
            break
        s = filt(noise(0.06), [6000, 12000], 'band') * np.exp(-tt(0.06) / 0.015) * (0.05 if q % 2 else 0.03)
        ii = int(tb * SR); jj = min(N, ii + len(s)); music[ii:jj] += s[: jj - ii]
    for q in range(int(bars / (BT * 1.5))):                                                            # o arpejo
        tn = t0 + q * BT * 1.5
        if tn >= FIM:
            break
        n = ch[(q * 2 + 1) % len(ch)] + 12
        nt = tt(0.9)
        note = (np.sin(2 * np.pi * midi(n) * nt) + 0.3 * np.sin(2 * np.pi * 2 * midi(n) * nt) * np.exp(-nt / 0.1)) * np.exp(-nt / 0.28) * np.minimum(1, nt / 0.004)
        ii = int(tn * SR); jj = min(N, ii + len(note)); music[ii:jj] += note[: jj - ii] * 0.09
music = filt(music, 50, 'high')
music *= np.clip(t / 0.6, 0, 1) * np.clip((DUR - t) / 1.2, 0, 1)
# sem voz: sem ducking; trilha com um nível fixo (o master leva o conjunto a −14 LUFS)
music *= 0.12 / max(1e-9, np.sqrt(np.mean(music ** 2)))
msc = np.stack([music, np.roll(music, int(0.011 * SR)) * 0.97])

# ------------------------------------------------------------------ a sala + a mixagem + o master
send += sfx * 0.1 + msc * 0.08
wet = np.stack([fftconvolve(send[0], ir_room(0.8, 7))[:N], fftconvolve(send[1], ir_room(0.8, 8))[:N]])
mix = np.stack([voz, voz]) + sfx + msc + wet * 0.5
mix *= np.clip(t / 0.005, 0, 1) * np.clip((DUR - t) / 0.05, 0, 1)
mix = filt(mix, 15500, 'low', 4)


def lufs(x):
    raw = os.path.join(AUD, '.medida.wav')
    wavfile.write(raw, SR, np.clip(x, -1, 1).astype(np.float32))
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    os.remove(raw)
    s = e[e.rindex('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1))


x = mix.T / max(1e-9, np.abs(mix).max()) * 0.5
for _ in range(5):
    x = true_peak_limit(x * 10 ** ((TARGET_LUFS - lufs(x)) / 20), -2.4)   # folga para a codificação AAC (pico final ≤ −1,5 dBTP)
I = lufs(x)
wavfile.write(os.path.join(AUD, 'mix.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
for nome, sig in (('musica', msc), ('sfx', sfx)):
    wavfile.write(os.path.join(AUD, nome + '.wav'), SR, np.round(np.clip(sig.T * (x.std() / max(1e-9, mix.T.std())), -1, 1) * 32767).astype(np.int16))
print(f'ok -> audio/mix.wav | {I:.1f} LUFS | {len(CUES["cues"])} cues')
