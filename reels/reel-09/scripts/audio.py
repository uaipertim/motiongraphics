#!/usr/bin/env python3
"""
Áudio do Reel 09 "Dois hóspedes, um chalé" -> audio/mix.wav (48 kHz, estéreo, −14 LUFS, pico ≤ −1,5 dBTP).

    python3 scripts/audio.py

- Vozes: a fala original da Clara (clara-fala.mp4, 0,2–7,0 s) e as 4 narrações (audio/voz/bloco-N.wav), cada uma
  levada ao mesmo volume (−16 LUFS) antes da mixagem, nos tempos de audio/linha.json. Os clipes de reação entram mudos.
- Trilha: colchão sintetizado (Am9 → Fmaj9 → Cmaj9 → G6/9, 84 BPM) bem baixo, ~20 dB abaixo das vozes, que abaixa
  mais 8 dB enquanto alguém fala e respira nos cortes sem voz (pensativa, aliviada) e na logo.
- Efeitos curtos nos eventos da animação (audio/cues.json, de `node scripts/render.cjs cues`).
"""
import json
import os
import re
import subprocess
import tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
LN = json.load(open(os.path.join(ROOT, 'audio', 'linha.json')))
CUES = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))['cues']
DUR = LN['duracao']
N = int(DUR * SR)
rng = np.random.default_rng(9)


def ff_wav(src, ss=None, to=None):
    """decodifica um trecho de áudio para mono float32 em 48 kHz"""
    cmd = ['ffmpeg', '-v', 'error']
    if ss is not None:
        cmd += ['-ss', str(ss), '-to', str(to)]
    cmd += ['-i', src, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, '<f4').copy()


def lufs(x, estereo=False):
    """loudness integrada; estereo=True mede como o arquivo final (os dois canais iguais somam +3 dB)"""
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        wavfile.write(f.name, SR, (np.stack([x, x], 1) if estereo else x).astype(np.float32))
        e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f.name, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
    i = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1])
    tp = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)[-1])
    return i, tp


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def bp(x, f0, f1, order=2):
    return sosfilt(butter(order, [f0, f1], 'band', fs=SR, output='sos'), x)


def env(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)


def place(buf, sig, t, g=1.0):
    i = int(round(t * SR))
    if i >= len(buf):
        return
    s = sig[:len(buf) - i] * g
    buf[i:i + len(s)] += s


# ---------------------------------------------------------------- vozes
def vozes():
    v = np.zeros(N, np.float32)
    fala = np.zeros(N, bool)                                   # onde há voz (para o ducking da trilha)
    cl = LN['clara']
    x = ff_wav(os.path.join(ROOT, 'src', 'clips', cl['arquivo']), cl['de'], cl['ate'])
    x = bp(x, 70, 15000)
    fade = int(0.03 * SR); x[-fade:] *= np.linspace(1, 0, fade)
    trechos = [(cl['t'], x)]
    for b in LN['blocos']:
        if b['quem'] != 'narracao':
            continue
        sr, y = wavfile.read(os.path.join(ROOT, 'audio', 'voz', b['id'] + '.wav'))
        y = resample_poly(y.astype(np.float32) / 32768, SR, sr).astype(np.float32)
        trechos.append((b['t'], y))
    for t, x in trechos:
        i, _ = lufs(x)
        place(v, x * 10 ** ((-16 - i) / 20), t)
    for b in LN['blocos']:
        fala[int(b['t0'] * SR):int((b['t1'] + 0.05) * SR)] = True
    return v, fala


# ---------------------------------------------------------------- trilha
def nota(m):
    return 440 * 2 ** ((m - 69) / 12)


ACORDES = [[45, 57, 60, 64, 67, 71], [41, 53, 57, 60, 64, 67], [48, 55, 59, 62, 64, 67], [43, 55, 59, 62, 64, 69]]  # Am9 Fmaj9 Cmaj9 G6/9


def trilha():
    bpm = 84; barra = 4 * 60 / bpm; dur_ac = 2 * barra
    t = np.arange(N) / SR
    out = np.zeros(N)
    k = 0
    while k * dur_ac < DUR + dur_ac:
        ac = ACORDES[k % 4]; t0 = k * dur_ac
        i0, i1 = int(t0 * SR), min(N, int((t0 + dur_ac + 1.5) * SR))
        if i0 >= N:
            break
        tt = t[i0:i1] - t0
        e = np.minimum(1, tt / 0.9) * np.where(tt > dur_ac, np.exp(-(tt - dur_ac) / 0.5), 1)
        s = np.zeros(i1 - i0)
        for j, m in enumerate(ac):
            f = nota(m + (12 if j == 0 else 0)) if j else nota(m)
            for det in (-0.12, 0.12):                          # dois osciladores levemente desafinados por nota
                ff = f * 2 ** (det / 12)
                s += (np.sin(2 * np.pi * ff * tt) + 0.3 * np.sin(4 * np.pi * ff * tt) + 0.12 * np.sin(6 * np.pi * ff * tt)) * (0.5 if j == 0 else 0.22)
        # pulso suave de colcheias na fundamental aguda (dá movimento sem bateria)
        col = 60 / bpm / 2
        fase = (tt % col) / col
        pulso = 0.18 * np.exp(-fase * 6) * np.sin(2 * np.pi * nota(ac[2] + 12) * tt)
        out[i0:i1] += (s + pulso) * e
        k += 1
    out = lp(out, 1800)
    out *= 1 + 0.08 * np.sin(2 * np.pi * 0.11 * t)
    return out / np.max(np.abs(out))


# ---------------------------------------------------------------- efeitos
def fx(tipo, forca=1.0):
    n = lambda d: int(d * SR)
    if tipo == 'pop':
        d = 0.12; tt = np.arange(n(d)) / SR
        return 0.5 * np.sin(2 * np.pi * (900 - 2600 * tt) * tt) * env(n(d), 0.002, 0.03)
    if tipo == 'corte':                                         # "clique" de câmera curto
        x = rng.standard_normal(n(0.08)); return 0.45 * bp(x, 2000, 7000) * env(n(0.08), 0.001, 0.015)
    if tipo == 'whoosh':
        d = 0.45; x = rng.standard_normal(n(d)); tt = np.arange(n(d)) / SR
        y = np.zeros_like(x)
        for a in range(0, len(x), 2400):                        # filtro que sobe
            f = 400 + 3200 * (a / len(x)); seg = x[a:a + 2400]
            y[a:a + 2400] = bp(seg, f * 0.7, min(f * 1.4, 20000))
        return 0.5 * y * np.sin(np.pi * tt / d) ** 2
    if tipo in ('impacto', 'alerta'):
        d = 0.6; tt = np.arange(n(d)) / SR
        corpo = np.sin(2 * np.pi * (70 * np.exp(-tt * 6) + 42) * tt) * env(n(d), 0.003, 0.16)
        ruido = lp(rng.standard_normal(n(d)), 2500) * env(n(d), 0.001, 0.04)
        if tipo == 'alerta':                                    # dois bipes graves de alerta
            b = np.sin(2 * np.pi * 520 * tt) * ((tt % 0.16) < 0.08) * env(n(d), 0.002, 0.25)
            return 0.35 * b + 0.3 * corpo
        return forca * (0.9 * corpo + 0.35 * ruido)
    if tipo == 'risco':                                         # caneta riscando
        d = 0.3; x = bp(rng.standard_normal(n(d)), 1800, 6000)
        tt = np.arange(n(d)) / SR
        return 0.35 * x * np.sin(np.pi * tt / d) * (0.7 + 0.3 * np.sin(2 * np.pi * 38 * tt))
    if tipo == 'sino':
        d = 2.5; tt = np.arange(n(d)) / SR
        s = sum(a * np.sin(2 * np.pi * 1318 * r * tt) * np.exp(-tt / dd) for a, r, dd in ((1, 1, 0.9), (0.5, 2.76, 0.4), (0.3, 5.4, 0.2), (0.2, 0.5, 1.2)))
        return 0.32 * s * env(n(d), 0.002, 10)
    raise ValueError(tipo)


def main():
    v, fala = vozes()
    m = trilha()
    # ducking: a trilha abaixa 8 dB onde há voz; a máscara começa 0,2 s antes e termina 0,4 s depois de cada fala,
    # e a transição é suavizada por média móvel de 0,3 s
    pre, pos = int(0.2 * SR), int(0.4 * SR)
    idx = np.flatnonzero(np.diff(np.r_[0, fala.astype(np.int8), 0]))
    mask = np.zeros(N, bool)
    for i0, i1 in zip(idx[::2], idx[1::2]):
        mask[max(0, i0 - pre):min(N, i1 + pos)] = True
    k = int(0.3 * SR)
    g = np.convolve(np.where(mask, 10 ** (-8 / 20), 1.0), np.ones(k) / k, mode='same')
    t = np.arange(N) / SR
    fim = LN['logo']['t1']
    entrada = np.minimum(1, t / 1.2)
    saida = np.clip((fim - t) / 1.6, 0, 1)
    m = m * g * entrada * saida
    # a trilha fica ~20 dB abaixo das vozes (medido nos trechos sem ducking)
    lv, _ = lufs(v); lm, _ = lufs(m)
    m *= 10 ** ((lv - 20 - lm) / 20)
    sfx = np.zeros(N)
    for c in CUES:
        place(sfx, fx(c['type'], c.get('forca', 1.0)), c['t'], 0.5)
    mix = v + m + sfx
    # −14 LUFS e pico ≤ −1,5 dBTP (ganho + limitador suave)
    li, _ = lufs(mix, estereo=True)
    mix *= 10 ** ((-14 - li) / 20)
    teto = 10 ** (-1.8 / 20)
    mix = np.where(np.abs(mix) > teto * 0.8, np.sign(mix) * (teto * 0.8 + (teto * 0.2) * np.tanh((np.abs(mix) - teto * 0.8) / (teto * 0.2))), mix)
    li, tp = lufs(mix, estereo=True)
    st = np.stack([mix, mix], 1).astype(np.float32)
    wavfile.write(os.path.join(ROOT, 'audio', 'mix.wav'), SR, st)
    lvv, _ = lufs(v); lmm, _ = lufs(m)
    print(f'  mix.wav: {li:.1f} LUFS · pico {tp:.1f} dBTP · vozes {lvv:.1f} LUFS · trilha {lmm:.1f} LUFS ({lmm - lvv:.1f} dB) · {DUR:.1f} s')


if __name__ == '__main__':
    main()
