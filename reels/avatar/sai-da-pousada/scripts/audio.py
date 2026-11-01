#!/usr/bin/env python3
"""
Áudio do Reel "Saí da pousada": a voz que já está nos clipes da Aurora (P1, P4, P5) SEM tratamento (só o ganho geral do
master) + a cama da trilha do Reel da Dona Maria, mais lenta (72 BPM em vez de 80) + efeitos discretos.

    python3 scripts/audio.py   -> audio/mix.wav (48 kHz, estéreo) + audio/voz.wav, musica.wav, sfx.wav (para o QA)

- A trilha fica ~18 dB abaixo da voz (LUFS integrado) e abaixa mais 6 dB enquanto ela fala.
- Antes da frase do P5 a trilha baixa mais 12 dB e só volta na chamada (fade de 0,8 s); fade de 1,2 s no fim.
- Efeitos: a vibração do celular (2 pulsos), a entrada dos balões, os toques de digitação (quando os polegares se mexem).
- Master em −14 LUFS, limitador de pico real em −2,4 dBTP (pico ≤ −1,5 dBTP depois do AAC).
"""
import json, os, re, subprocess
import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import butter, sosfilt, resample_poly
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, 'audio')
LN = json.load(open(os.path.join(ROOT, 'linha.json'))); EV = LN['eventos']; PL = {p['id']: p for p in LN['planos']}
DUR = float(LN['duracao']); SR = 48000; N = int(round(SR * DUR)); TARGET_LUFS = -14.0
rng = np.random.default_rng(2026)
tt = lambda d: np.arange(int(max(0.0, d) * SR)) / SR
midi = lambda n: 440.0 * 2 ** ((n - 69) / 12)


def filt(x, f, kind='low', order=2):
    f = [max(20, f[0]), min(SR / 2 * 0.95, f[1])] if kind == 'band' else min(f, SR / 2 * 0.95)
    return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)


noise = lambda d: rng.standard_normal(int(d * SR))


def place(buf, sig, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N: return
    j = min(N, i + len(sig))
    buf[0, i:j] += sig[: j - i] * g * np.cos((pan + 1) * np.pi / 4) * 1.414
    buf[1, i:j] += sig[: j - i] * g * np.sin((pan + 1) * np.pi / 4) * 1.414


def click(d=0.025, f=3000, dec=0.003):
    return filt(noise(d), [f * 0.6, f * 1.6], 'band') * np.exp(-tt(d) / dec)


def wood(f=1900, d=0.06, dec=0.012):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.63 * t)) * np.exp(-t / dec) * np.minimum(1, t / 0.0005)


def vibra(d=0.42):
    """o celular vibrando: motor a ~165 Hz com zumbido de plástico, em dois toques curtos"""
    t = tt(d)
    env = ((t < 0.17) | ((t > 0.23) & (t < 0.40))).astype(float)
    env = uniform_filter1d(env, int(0.012 * SR))
    x = np.sin(2 * np.pi * 165 * t) * 0.7 + np.sign(np.sin(2 * np.pi * 165 * t)) * 0.18
    x += filt(noise(d), [900, 2600], 'band') * 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * 165 * t))
    return filt(x, 3500) * env


def bolha():
    """a entrada do balão: um 'pop' suave e uma notinha curta, sem marca de aplicativo"""
    t = tt(0.35)
    pop = np.sin(2 * np.pi * 520 * t * (1 + 0.6 * np.exp(-t / 0.015))) * np.exp(-t / 0.035)
    nota = np.sin(2 * np.pi * midi(84) * t) * np.exp(-t / 0.12) * np.minimum(1, t / 0.004) * 0.35
    return pop * 0.8 + nota


def toques(d):
    out = np.zeros(int((d + 0.1) * SR)); tc = 0.0
    while tc < d:
        s = click(0.02, 2200 + 1400 * rng.random(), 0.002) * 0.7 + np.concatenate([wood(1300 + 400 * rng.random(), 0.02, 0.004), np.zeros(int(0.0 * SR))]) * 0.25
        i = int(tc * SR); out[i:i + len(s)] += s[: max(0, len(out) - i)]
        tc += 1 / 9 * (0.7 + 0.6 * rng.random())
    return out


def true_peak_limit(x, ceiling_db=-2.4, os_=4):
    c = 10 ** (ceiling_db / 20)
    up = resample_poly(x, os_, 1, axis=0)
    need = np.minimum(1.0, c / np.maximum(np.abs(up).max(axis=1), 1e-9))
    w = int(0.002 * SR * os_)
    g = uniform_filter1d(minimum_filter1d(need, w), w // 2)
    g = g[: len(g) // os_ * os_].reshape(-1, os_).min(axis=1)
    y = x[: len(g)] * g[:, None]
    return np.concatenate([y, np.zeros((len(x) - len(y), 2))]) if len(y) < len(x) else y


# ------------------------------------------------------------------ a voz: o áudio dos próprios clipes, no tempo do Reel
def carrega(path, dur):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-t', str(dur), '-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.int16).astype(np.float64) / 32768
voz = np.zeros(N)
for arq, pid in (('midia/plano1-fala.mp4', 'p1'), ('midia/plano4.mp4', 'p4'), ('midia/plano5.mp4', 'p5')):
    p = PL[pid]; v = carrega(os.path.join(ROOT, arq), p['t1'] - p['t0'])
    i = int(round(p['t0'] * SR)); j = min(N, i + len(v)); voz[i:j] += v[: j - i]
VOZ_RMS = np.sqrt(np.mean(voz[np.abs(voz) > 0.01] ** 2))

# ------------------------------------------------------------------ efeitos
sfx = np.zeros((2, N)); ev = []
for tv in EV['vibra']: place(sfx, vibra(), tv, 0.55, -0.15); ev.append((tv, 'vibracao'))
for tb in (EV['balao1'], EV['balao2']): place(sfx, bolha(), tb, 0.35, 0.25); ev.append((tb, 'balao'))
for a, b in EV['toques']: place(sfx, toques(b - a), a, 0.22, 0.2); ev.append((a, 'toques'))
sfx *= 10 ** (-16 / 20) * VOZ_RMS / 0.11
json.dump({'duracao': DUR, 'cues': [{'t': round(t, 3), 'type': ty} for t, ty in sorted(ev)]}, open(os.path.join(AUD, 'cues.json'), 'w'), indent=1)

# ------------------------------------------------------------------ a trilha: a cama do Reel da Dona Maria, mais lenta
BPM = 72.0; BT = 60.0 / BPM
CHORDS = [[60, 64, 67, 71, 74], [57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [55, 59, 62, 65, 69]]      # Cmaj9, Am9, Fmaj9, G9
music = np.zeros(N); t = np.arange(N) / SR; bars = 2 * BT * 4
for k in range(int(DUR / bars) + 1):
    t0 = k * bars; ch = CHORDS[k % 4]; d = bars + 1.6; tt_ = tt(d)
    env = np.minimum(1, tt_ / 1.4) * np.exp(-np.maximum(0, tt_ - bars) / 0.7)
    pad = np.zeros_like(tt_)
    for n in ch:
        f = midi(n)
        for det in (-0.003, 0.0, 0.003):
            pad += np.sin(2 * np.pi * f * (1 + det) * tt_ + rng.uniform(0, 6)) * 0.5 + 0.18 * np.sin(2 * np.pi * 2 * f * (1 + det) * tt_)
    pad = filt(pad, 1300) * env / (len(ch) * 3)
    bass = np.sin(2 * np.pi * midi(ch[0] - 12) * tt_) * env * 0.35
    i = int(t0 * SR); j = min(N, i + len(pad)); music[i:j] += (pad + bass)[: j - i]
    for q in range(int(bars / BT)):
        tn = t0 + q * BT
        if tn >= DUR: break
        n = ch[(q * 3 + 1) % len(ch)] + 12; nt = tt(1.2)
        note = (np.sin(2 * np.pi * midi(n) * nt) + 0.25 * np.sin(2 * np.pi * 2 * midi(n) * nt) * np.exp(-nt / 0.12)) * np.exp(-nt / 0.45) * np.minimum(1, nt / 0.006)
        ii = int(tn * SR); jj = min(N, ii + len(note)); music[ii:jj] += note[: jj - ii] * 0.07
music = filt(music, 60, 'high')
music *= np.clip(t / 0.8, 0, 1) * np.clip((DUR - t) / 1.2, 0, 1)
venv = np.sqrt(uniform_filter1d(voz ** 2, int(0.02 * SR)) + 1e-12)
act = np.clip((venv - 10 ** (-42 / 20)) / (10 ** (-30 / 20) - 10 ** (-42 / 20)), 0, 1)
sm = np.copy(act); a_att, a_rel = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.5 * SR))
for i in range(1, N):
    c = a_att if act[i] > sm[i - 1] else a_rel
    sm[i] = c * sm[i - 1] + (1 - c) * act[i]
music *= 10 ** (-16 / 20) / max(1e-9, np.sqrt(np.mean(music ** 2))) * VOZ_RMS
music *= 1 - (1 - 10 ** (-6 / 20)) * sm
# antes da frase do P5 a trilha baixa (−12 dB em 0,6 s) e só volta na chamada (0,8 s)
baixa = np.clip((t - EV['trilha_baixa']) / 0.6, 0, 1) * (1 - np.clip((t - EV['chamada']) / 0.8, 0, 1))
music *= 10 ** (-12 * baixa / 20)
msc = np.stack([music, np.roll(music, int(0.011 * SR)) * 0.97])

# ------------------------------------------------------------------ mixagem e master (o mesmo ganho para tudo)
mix = np.stack([voz, voz]) + sfx + msc


def lufs(x):
    raw = os.path.join(AUD, '.medida.wav')
    wavfile.write(raw, SR, np.clip(x, -1, 1).astype(np.float32))
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    os.remove(raw); s = e[e.rindex('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1))


g = 1.0
for _ in range(5):                                   # o ganho geral é ajustado já com o limitador (que só pega os picos)
    g *= 10 ** ((TARGET_LUFS - lufs(true_peak_limit(mix.T * g, -2.4))) / 20)
x = true_peak_limit(mix.T * g, -2.4)
red = 20 * np.log10(max(1e-9, np.abs(mix.T * g).max()) / max(1e-9, np.abs(x).max()))
I = lufs(x)
wavfile.write(os.path.join(AUD, 'mix.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
for nome, sig in (('voz', np.stack([voz, voz])), ('musica', msc), ('sfx', sfx)):
    wavfile.write(os.path.join(AUD, nome + '.wav'), SR, np.round(np.clip(sig.T * g, -1, 1) * 32767).astype(np.int16))
ativo = np.mean(np.abs(mix[0] * g) > 10 ** (-2.4 / 20)) * 100
print(f'ok -> audio/mix.wav | {I:.1f} LUFS | limitador age em {ativo:.2f}% das amostras | ganho geral {20 * np.log10(g):+.1f} dB | limitador: até {red:.1f} dB nos picos | {len(ev)} efeitos')
