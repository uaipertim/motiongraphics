#!/usr/bin/env python3
"""
Efeitos sonoros de um episódio da SÉRIE ROTINA — 100% sintetizados (numpy/scipy),
sem trilha musical: a música pode ser escolhida na biblioteca do Instagram.

Os mesmos timbres do Reel 08: uma batida seca na parte limão do título, um sopro
quando o título vira cabeçalho, um "ping" suave a cada card (genérico, sem timbre
de app, subindo na pentatônica Dó5 → Lá5), o carimbo (baque, tapa da borracha e a
pilha chacoalhando), sopros discretos na saída e nas frases finais e a sineta de
recepção da série na logo. Por baixo, um tom de sala quase inaudível.

A sincronia vem da animação: `node scripts/render.cjs cues --ep <id>` exporta
audio/<id>/cues.json e este script coloca cada som exatamente nesses instantes.

    python3 scripts/audio.py ep-01   -> audio/ep-01/efeitos.wav (48 kHz, estéreo, −16 LUFS, pico real ≤ −2,5 dBTP antes do AAC)
"""
import json
import os
import re
import subprocess
import sys
import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else 'ep-01'
AUD = os.path.join(ROOT, 'audio', EP)
DATA = json.load(open(os.path.join(AUD, 'cues.json')))
DUR = float(DATA['duration'])
SEC = DATA['sections']
CUES = DATA['cues']
SR = 48000
N = int(round(SR * DUR))                         # duração exata do vídeo: o mux não corta quadros
TARGET_LUFS = -16.0
rng = np.random.default_rng(7007)


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


# ------------------------------------------------------------------ efeitos (a partir dos cues)
sfx, send = stereo(), stereo()
BELL = 91                                                       # Sol6: a sineta da série
PINGS = [72, 74, 76, 79, 81, 84, 86]                            # Dó5 Ré5 Mi5 Sol5 Lá5 Dó6 Ré6: a pentatônica subindo, um degrau por card


def fx(c):
    t, ty, d = c['t'], c['type'], c.get('d', 0.3)
    if ty == 'hook':
        place(sfx, thump(0.5, 44, 0.12, 0.8), t, 0.4)
    elif ty == 'knock':                                         # a batida seca na parte limão do título
        place(sfx, thump(0.4, 58, 0.08, 0.9), t, 0.34)
        place(sfx, wood(240, 0.3, 0.05), t, 0.22)
        place(send, wood(240, 0.3, 0.05), t, 0.08)
    elif ty == 'rise':
        place(sfx, whoosh(d, 350, 2400, 0.65, 1.0), t, 0.1)
    elif ty == 'ping':
        k = c['k']
        pg = ping(midi(PINGS[k]))
        pan = -0.25 + 0.08 * k
        place(sfx, pg, t, 0.36, pan)
        place(send, pg, t, 0.14)
    elif ty == 'stampfall':
        place(sfx, whoosh(d + 0.03, 2600, 500, 0.85, 1.2), t - 0.02, 0.1)
    elif ty == 'stamp':
        s = stamp_hit()
        place(sfx, s, t, 0.62)
        place(send, s, t, 0.16)
        place(sfx, rattle(), t, 0.24, 0.1)
    elif ty == 'exit':
        place_pan(sfx, whoosh(d, 300, 2600, 0.6, 0.9), t, 0.14, 0.0, 0.2)
    elif ty == 'virada':
        place(sfx, whoosh(0.4, 500, 2600, 0.6, 1.1), t, 0.07)
    elif ty == 'fecho':
        place(sfx, whoosh(0.34, 900, 3400, 0.6, 1.4), t, 0.05)
    elif ty == 'logo':
        b = desk_bell(midi(BELL))
        place(sfx, b, t, 0.3)
        place(send, b, t, 0.22)
    elif ty == 'fade':
        pass
    else:
        raise ValueError('cue desconhecido: ' + ty)


for c in CUES:
    fx(c)

# ------------------------------------------------------------------ sala + master
wet = np.stack([fftconvolve(send[0], ir_room(0.7, 7))[:N], fftconvolve(send[1], ir_room(0.7, 8))[:N]])
mix = sfx + wet * 0.55
mix += np.stack([room_tone(), room_tone()])
t = np.arange(N) / SR
fade = 1 - (-(np.cos(np.pi * np.clip((t - SEC['fade']) / (DUR - SEC['fade']), 0, 1)) - 1) / 2)   # o mesmo fade da imagem
mix *= fade
mix *= np.clip(t / 0.002, 0, 1)
mix = filt(mix, 30, 'high')
mix = filt(mix, 15500, 'low', 4)                          # sem energia perto de Nyquist: o AAC não estoura o pico


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


def lufs(x):
    raw = os.path.join(AUD, '.medida.wav')
    wavfile.write(raw, SR, np.clip(x, -1, 1).astype(np.float32))
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    os.remove(raw)
    s = e[e.rindex('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1))


# volume: ganho até o alvo e limitador de pico real; repete enquanto o limitador "comer" volume
x = mix.T / max(1e-9, np.abs(mix).max()) * 0.5
for _ in range(4):
    x = true_peak_limit(x * 10 ** ((TARGET_LUFS - lufs(x)) / 20))
I = lufs(x)
out = os.path.join(AUD, 'efeitos.wav')
wavfile.write(out, SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
print(f'ok -> {os.path.relpath(out, ROOT)} | {I:.1f} LUFS | {len(CUES)} cues')

