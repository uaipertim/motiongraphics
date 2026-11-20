#!/usr/bin/env python3
"""
Áudio do episódio 2 (Sua equipe no Hospeda), no mesmo clima do vídeo curto de venda: locução (audio/voz-montada.wav) + trilha animada composta aqui + efeitos nos gestos da animação.

    python3 scripts/audio.py   -> audio/mix.wav (48 kHz estéreo, −14 LUFS, pico real ≤ −2 dBTP) + audio/relatorio.json

Trilha (100% sintetizada, determinística): 120 BPM, Dó maior, I–V–vi–IV (C–G–Am–F).
- Gancho (até a palavra "FAZLO"): tensa e filtrada, só pulso grave, chimbal e um riser que termina no logo.
- Do logo em diante: groove inteiro — bumbo em todo tempo, palmas no 2 e no 4, chimbal em colcheias, baixo pulsado,
  acordes curtos no contratempo e um arpejo leve.
- Fecho: o groove para e o último acorde soa com a sineta, até o fim.
Ducking: a trilha desce até 8 dB enquanto a voz fala (envelope da voz com ataque de 30 ms e soltura de 250 ms).
Efeitos: os instantes vêm de output/info.json (node scripts/render.cjs info).
"""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly
from scipy.ndimage import uniform_filter1d, maximum_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LN = json.load(open(os.path.join(ROOT, 'linha.json')))
INFO = json.load(open(os.path.join(ROOT, 'output', 'info.json')))
SR, DUR = 48000, float(LN['duracao'])
N = int(round(SR * DUR))
rng = np.random.default_rng(1907)
BPM = 120.0; BEAT = 60 / BPM


def tt(d): return np.arange(int(max(0, d) * SR)) / SR
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def filt(x, f, kind='low', o=2):
    if kind == 'band': f = [max(20, f[0]), min(SR * 0.47, f[1])]
    else: f = min(f, SR * 0.47)
    return sosfilt(butter(o, f, kind, fs=SR, output='sos'), x)
def env(n, a, d):
    t = np.arange(n) / SR; e = np.exp(-t / d); k = int(a * SR)
    if k: e[:k] *= np.linspace(0, 1, k)
    return e
def put(buf, sig, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig, i = sig[-i:], 0
    j = min(N, i + len(sig)); s = sig[: j - i] * g
    buf[0, i:j] += s * np.cos((pan + 1) * np.pi / 4) * 1.414; buf[1, i:j] += s * np.sin((pan + 1) * np.pi / 4) * 1.414


# ---------------------------------------------------------------- instrumentos
def kick():
    t = tt(0.32); f = 45 + 95 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.11) + 0.15 * filt(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.004)
def clap():
    n = rng.standard_normal(int(0.22 * SR)); e = np.zeros(len(n))
    for k in range(3): e[int(k * 0.011 * SR):] += np.exp(-np.arange(len(n) - int(k * 0.011 * SR)) / SR / (0.008 if k < 2 else 0.07))
    return filt(n, [900, 6000], 'band') * e * 0.8
def hat(aberto=False):
    d = 0.18 if aberto else 0.045
    return filt(rng.standard_normal(int(d * SR)), 7000, 'high') * np.exp(-tt(d) / (d / 3)) * (0.35 if aberto else 0.28)
def saw(f, d):
    t = tt(d); x = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 12))
    return x * 0.6
def baixo(n, d):
    x = filt(saw(hz(n), d), 380) * env(int(d * SR), 0.004, d * 0.6)
    return x + 0.5 * np.sin(2 * np.pi * hz(n) * tt(d)) * env(int(d * SR), 0.004, d * 0.7)
def stab(notas, d=0.32):
    x = sum(filt(saw(hz(n) * (1 + dt), d), 2600) for n in notas for dt in (-0.004, 0.004))
    return x * env(len(x), 0.004, 0.11) * 0.16
def pluck(n, d=0.25):
    t = tt(d); x = np.sin(2 * np.pi * hz(n) * t) + 0.3 * np.sin(2 * np.pi * 2 * hz(n) * t)
    return x * np.exp(-t / 0.08) * 0.22
def pad(notas, d):
    t = tt(d); x = sum(np.sin(2 * np.pi * hz(n) * t + k) for k, n in enumerate(notas)) / len(notas)
    a = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.6)
    return filt(x, 1800) * a * 0.5
def sino(f, d=2.5):
    t = tt(d); return sum(np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d / (1 + m))) * g for m, g in ((1, 1), (2.76, .4), (5.4, .2))) * 0.3
def ruido(d, f0, f1, pico=0.5):
    n = rng.standard_normal(int(d * SR)); t = np.linspace(0, 1, len(n))
    fc = f0 * (f1 / f0) ** t; out = np.zeros(len(n)); bloco = 512
    for i in range(0, len(n), bloco):
        f = fc[i]; out[i:i + bloco] = filt(n[i:i + bloco + 2048], [f * 0.6, f * 1.6], 'band')[:len(out[i:i + bloco])]
    a = np.where(t < pico, t / pico, (1 - t) / (1 - pico)) ** 1.5
    return out * a


# ---------------------------------------------------------------- trilha
F = {f['id']: f for f in LN['frases']}
w_fazlo = next(w['t0'] for w in F['marca']['palavras'] if w['w'] == 'FAZLO')
t_drop = w_fazlo                                                  # o groove entra no logo
t_fim = F['cta']['t0'] - 0.1                                      # o groove para na chamada
PROG = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]  # C G Am F (baixo, acorde)
mus = np.zeros((2, N))
# alinha a grade ao drop: o tempo 0 da batida cai em t_drop
b0 = t_drop - BEAT * int(t_drop / BEAT + 1)
k = 0
while True:
    t = b0 + k * BEAT
    if t >= DUR: break
    compasso = int(np.floor((t - t_drop) / (4 * BEAT) + 1e-6)); tempo = int(round((t - t_drop) / BEAT)) % 4
    raiz, acorde = PROG[compasso % 4]
    if t < 0: k += 1; continue
    if t < t_drop:                                                # gancho: pulso grave filtrado + chimbal
        put(mus, filt(kick(), 300) * 0.7, t, 0.55)
        put(mus, hat(), t + BEAT / 2, 0.45, 0.25)
        if tempo in (0, 2): put(mus, filt(baixo(raiz - 12 + 12, BEAT * 0.9), 220), t, 0.35)
    elif t < t_fim:
        put(mus, kick(), t, 0.85)
        if tempo in (1, 3): put(mus, clap(), t, 0.55, 0.05)
        put(mus, hat(), t, 0.35, -0.3); put(mus, hat(tempo == 3), t + BEAT / 2, 0.5, 0.3)
        put(mus, baixo(raiz - 12 + 12, BEAT * 0.45), t, 0.42); put(mus, baixo(raiz - 12 + 12, BEAT * 0.4), t + BEAT / 2, 0.32)
        put(mus, stab([n + 12 for n in acorde]), t + BEAT / 2, 0.8, 0.2 if tempo % 2 else -0.2)
        for s, n in enumerate([acorde[0] + 12, acorde[1] + 12, acorde[2] + 12, acorde[1] + 24]):
            put(mus, pluck(n), t + s * BEAT / 4, 0.55, 0.4 * np.sin(k + s))
        if tempo == 0: put(mus, pad([n + 12 for n in acorde], 4 * BEAT), t, 0.35)
    k += 1
# riser até o logo
r = ruido(2.2, 300, 6000, 0.97); put(mus, r, t_drop - 2.2, 0.35)
# fecho: acorde final e sineta
put(mus, pad([72, 76, 79, 84], DUR - t_fim), t_fim, 0.6)
put(mus, baixo(36, 2.5), t_fim, 0.6); put(mus, kick(), t_fim, 0.9)
put(mus, sino(hz(84), 3.5), t_fim + 0.05, 0.8)

# ---------------------------------------------------------------- efeitos
fx = np.zeros((2, N))
def sfx(tipo):
    if tipo == 'whoosh': return ruido(0.38, 400, 4500, 0.6) * 0.9, 0.45
    if tipo == 'zoom': return ruido(0.5, 250, 1800, 0.8) * 0.6, 0.25
    if tipo == 'tick': return (np.sin(2 * np.pi * 2600 * tt(0.05)) * np.exp(-tt(0.05) / 0.01)), 0.25
    if tipo == 'pop':
        t = tt(0.16); f = 500 + 900 * np.exp(-t / 0.02); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05), 0.5
    if tipo == 'volta': return ruido(0.22, 3000, 600, 0.3) * 0.6, 0.25
    if tipo == 'toque': return filt(rng.standard_normal(int(0.03 * SR)), 2500, 'high') * np.exp(-tt(0.03) / 0.005) + 0.5 * np.sin(2 * np.pi * 900 * tt(0.03)) * np.exp(-tt(0.03) / 0.008), 0.4
    if tipo == 'desliza': return ruido(0.3, 800, 2500, 0.5) * 0.7, 0.3
    if tipo == 'impacto': r = 0.4 * ruido(0.6, 5000, 800, 0.05); kk = kick() * 1.2; return np.concatenate([kk, np.zeros(len(r) - len(kk))]) + r, 0.75
    if tipo == 'check':
        a = sino(hz(88), 0.5) * 0.8; b = np.concatenate([np.zeros(int(0.09 * SR)), sino(hz(93), 0.6)]); return np.concatenate([a, np.zeros(len(b) - len(a))]) + b, 0.55
    if tipo == 'erro':
        t = tt(0.32); return np.sign(np.sin(2 * np.pi * 110 * t)) * np.exp(-t / 0.12) * 0.25, 0.5
    if tipo == 'gaveta': b = sino(hz(98), 0.4) * 0.5; a = filt(rng.standard_normal(len(b)), 900) * np.exp(-tt(len(b) / SR) / 0.05)[:len(b)]; return a + b, 0.6
    if tipo == 'suga': return ruido(0.5, 4000, 300, 0.9) * 0.8, 0.4
    if tipo == 'sino': return sino(hz(91), 2.0), 0.4
    if tipo == 'tecla': return filt(rng.standard_normal(int(0.02 * SR)), 3500, 'high') * np.exp(-tt(0.02) / 0.004), 0.18
    return None, 0
for e in INFO['eventos']:
    s, g = sfx(e['tipo'])
    if s is not None: put(fx, s, e['t'], g, 0.15 * np.sin(e['t'] * 3))

# ---------------------------------------------------------------- voz, ducking e mixagem
srv, v = wavfile.read(os.path.join(ROOT, 'audio', 'voz-montada.wav'))
v = v.astype(np.float64) / 32768
if v.ndim > 1: v = v.mean(axis=1)
v = resample_poly(v, SR, srv)[:N]; v = np.pad(v, (0, N - len(v)))
v = filt(v, 75, 'high')
nivel = np.sqrt(uniform_filter1d(v ** 2, int(0.02 * SR)) + 1e-12)
fala = (20 * np.log10(nivel) > -42).astype(float)
fala = maximum_filter1d(fala, int(0.25 * SR), origin=-int(0.1 * SR))      # segura 250 ms e antecipa 30 ms
duck = uniform_filter1d(fala, int(0.06 * SR))
g_mus = 10 ** (-7 * duck / 20)


def lufs(x):
    import pyloudnorm as pyln
    return pyln.Meter(SR).integrated_loudness(x.T if x.ndim == 2 else x)


lv, lm = lufs(v), lufs(mus)
mus *= 10 ** ((lv - 5.5 - lm) / 20)                               # trilha 5,5 LU abaixo da voz antes do ducking (≈13 dB abaixo na fala)
fx *= 10 ** ((lv - 15 - lufs(fx)) / 20)
mix = np.stack([v, v]) + mus * g_mus + fx * (1 - 0.35 * duck)


def limita(x, teto_db):
    teto = 10 ** (teto_db / 20)
    up = resample_poly(x, 4, 1, axis=1); pk = np.abs(up).max(axis=0).reshape(-1, 4).max(axis=1)[: x.shape[1]]
    pk = np.pad(pk, (0, x.shape[1] - len(pk)), constant_values=pk[-1])
    g = np.minimum(1, teto / np.maximum(pk, 1e-9)); h = int(0.008 * SR)
    g = -maximum_filter1d(-g, 2 * h + 1); g = uniform_filter1d(g, h)
    return x * g


for _ in range(6):
    l = lufs(mix); mix *= 10 ** ((-14 - l) / 20); mix = limita(mix, -2.2)
L = lufs(mix)
tp = 20 * np.log10(np.abs(resample_poly(mix, 4, 1, axis=1)).max())
wavfile.write(os.path.join(ROOT, 'audio', 'mix.wav'), SR, (np.clip(mix, -1, 1).T * 32767).astype(np.int16))
fv = fala > 0.5
rel = {'lufs': round(L, 2), 'pico_real_dbtp': round(tp, 2), 'voz_lufs': round(lv, 1),
       'trilha_abaixo_da_voz_na_fala_db': round(20 * np.log10(np.sqrt((v[fv] ** 2).mean()) / np.sqrt(((mus * g_mus)[:, fv] ** 2).mean())), 1),
       'ducking_max_db': 7, 'bpm': BPM, 'drop_s': round(t_drop, 2), 'eventos': len(INFO['eventos'])}
json.dump(rel, open(os.path.join(ROOT, 'audio', 'relatorio.json'), 'w'), indent=1)
print(rel)
