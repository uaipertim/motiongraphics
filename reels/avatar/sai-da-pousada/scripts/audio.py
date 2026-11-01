#!/usr/bin/env python3
"""
Áudio do Reel "Saí da pousada" (V2): a voz que já está nos clipes da Aurora (P1, P4, P5) SEM tratamento (só o ganho
geral do master) + trilha com mais pulso + ambiente de rua e carro parado + efeitos sincronizados com cada elemento.

    python3 scripts/audio.py   -> audio/mix.wav (48 kHz, estéreo) + audio/voz.wav, musica.wav, sfx.wav, ambiente.wav (para o QA)

- Efeitos genéricos e suaves (nenhum som de app real): a notificação é um "tlim" de vidro de duas notas, sempre com
  a vibração do celular; toques de digitação; o "enviar"; o tique do relógio; a pilha do "+6"; o sopro dos cartões;
  o brilho do ponto de luz; o cartão final subindo e a pressão do botão.
- Trilha: a cama da Dona Maria com pulso (bumbo macio em cada tempo e chocalho em colcheias) do P1 ao P4, ~18 dB
  abaixo da voz; some antes da frase do P5 e volta suave, só o pad, no cartão final.
- Ambiente: carro parado com a janela fechada (grave abafado) e a rua ao longe (passagens de carro, passarinhos).
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
def tlim():
    """notificação genérica: duas notas de vidro (Mi6 → Si6), suaves"""
    out = np.zeros(int(0.9 * SR))
    for k, (n, g) in enumerate([(88, 0.8), (95, 0.6)]):
        t = tt(0.8); f = midi(n)
        x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.05)) * np.exp(-t / 0.28) * np.minimum(1, t / 0.003)
        i = int(k * 0.085 * SR); out[i:i + len(x)] += x[: len(out) - i] * g
    return out * 0.6


def tique():
    return click(0.04, 3800, 0.0015) * 0.6 + wood(2400, 0.04, 0.006) * 0.3


def sopro(d=0.45, f0=500, f1=2400):
    t = tt(d); u = t / d
    x = filt(noise(d), [f0, f1], 'band') * np.where(u < 0.4, (u / 0.4) ** 2, ((1 - u) / 0.6) ** 1.6)
    return x * 0.5


def enviar():
    return np.concatenate([sopro(0.32, 900, 4200), np.zeros(int(0.05 * SR))])


def brilho():
    out = np.zeros(int(1.0 * SR))
    for k, n in enumerate([91, 95, 98, 103]):
        t = tt(0.6); x = np.sin(2 * np.pi * midi(n) * t) * np.exp(-t / 0.18) * np.minimum(1, t / 0.004)
        i = int(k * 0.06 * SR); out[i:i + len(x)] += x[: len(out) - i] * 0.35
    return out + np.concatenate([sopro(0.5, 1500, 7000) * 0.6, np.zeros(int(0.5 * SR))])


def pressao():
    return click(0.06, 1800, 0.004) * 0.8 + wood(900, 0.06, 0.01) * 0.5


sfx = np.zeros((2, N)); ev = []
def poe(sig, t, g, pan, nome): place(sfx, sig, t, g, pan); ev.append((t, nome))
for t0, _ in EV['notificacoes']:
    poe(vibra(), t0, 0.5, -0.1, 'vibracao'); poe(tlim(), t0 + 0.02, 0.4, 0.15, 'notificacao')
poe(sopro(0.5, 300, 1600), EV['agrupa'], 0.22, 0.0, 'agrupa')
for t0, _ in EV['relogio'][1:]: poe(tique(), t0, 0.25, 0.0, 'relogio')
poe(tlim(), EV['chat_chega'], 0.25, 0.2, 'mensagem')
for a_, b_ in EV['toques']: poe(toques(b_ - a_), a_, 0.22, 0.2, 'toques')
poe(enviar(), EV['chat_envia'], 0.3, 0.3, 'enviada'); poe(tique(), EV['chat_lido'], 0.18, 0.3, 'lida')
poe(vibra(), EV['p3_notif'], 0.45, 0.2, 'vibracao'); poe(tlim(), EV['p3_notif'] + 0.02, 0.38, 0.3, 'notificacao')
for k in range(6): poe(tique(), EV['p3_pilha'] + k * 0.12, 0.16 + 0.02 * k, 0.3, 'pilha')
for t0, _ in EV['perguntas']: poe(sopro(0.35, 700, 3000), t0, 0.13, 0.0, 'cartao')
poe(brilho(), EV['aqui'] + 0.2, 0.3, 0.0, 'luz')
poe(sopro(0.6, 250, 1800), EV['cartao'], 0.3, 0.0, 'cartao-final')
poe(pressao(), EV['enviar'], 0.4, 0.2, 'enviar'); poe(enviar(), EV['enviar'] + 0.15, 0.3, 0.4, 'enviado')
sfx *= 10 ** (-16 / 20) * VOZ_RMS / 0.11
json.dump({'duracao': DUR, 'cues': [{'t': round(t, 3), 'type': ty} for t, ty in sorted(ev)]}, open(os.path.join(AUD, 'cues.json'), 'w'), indent=1)

# ------------------------------------------------------------------ ambiente: carro parado e a rua ao longe
t_ = np.arange(N) / SR
amb = filt(rng.standard_normal(N), 220, 'low', 2) * 1.0                                   # o grave abafado da cabine
for k in range(5):                                                                       # carros passando ao longe
    c0 = rng.uniform(0, DUR); d = rng.uniform(2.5, 4.5)
    env = np.exp(-((t_ - c0) / (d / 3)) ** 2)
    amb += filt(rng.standard_normal(N), [180, 900], 'band', 2) * env * 0.8
for k in range(4):                                                                       # passarinhos
    t0 = rng.uniform(1, DUR - 1); tb = tt(0.12)
    ch = np.sin(2 * np.pi * np.cumsum(3200 + 900 * np.sin(2 * np.pi * 18 * tb)) / SR) * np.exp(-tb / 0.04) * np.minimum(1, tb / 0.005)
    i = int(t0 * SR); amb[i:i + len(ch)] += ch[: max(0, N - i)] * 0.25
amb = amb / np.sqrt(np.mean(amb ** 2)) * VOZ_RMS * 10 ** (-30 / 20)
ambs = np.stack([amb, np.roll(amb, int(0.017 * SR))])

# ------------------------------------------------------------------ a trilha: a cama do Reel da Dona Maria, mais lenta
BPM = 84.0; BT = 60.0 / BPM
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
pulso = np.zeros(N)                                                                     # bumbo macio e chocalho (P1–P4)
for q in range(int(DUR / BT) + 1):
    tn = q * BT
    if tn >= PL['p4']['t1']: break
    k_ = tt(0.35); kick_ = np.sin(2 * np.pi * np.cumsum(55 + 70 * np.exp(-k_ / 0.03)) / SR) * np.exp(-k_ / 0.12)
    i = int(tn * SR); j = min(N, i + len(kick_)); pulso[i:j] += kick_[: j - i] * (0.55 if q % 2 == 0 else 0.4)
    for h in (0, 0.5):
        sh = filt(noise(0.06), [6000, 12000], 'band') * np.exp(-tt(0.06) / 0.015)
        i = int((tn + h * BT) * SR); j = min(N, i + len(sh)); pulso[i:j] += sh[: j - i] * (0.12 if h else 0.07)
music = music + pulso * 0.5
music = filt(music, 40, 'high')
music *= np.clip(t / 0.8, 0, 1) * np.clip((DUR - t) / 1.2, 0, 1)
venv = np.sqrt(uniform_filter1d(voz ** 2, int(0.02 * SR)) + 1e-12)
act = np.clip((venv - 10 ** (-42 / 20)) / (10 ** (-30 / 20) - 10 ** (-42 / 20)), 0, 1)
sm = np.copy(act); a_att, a_rel = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.5 * SR))
for i in range(1, N):
    c = a_att if act[i] > sm[i - 1] else a_rel
    sm[i] = c * sm[i - 1] + (1 - c) * act[i]
music *= 10 ** (-16 / 20) / max(1e-9, np.sqrt(np.mean(music ** 2))) * VOZ_RMS
music *= 1 - (1 - 10 ** (-6 / 20)) * sm
# a trilha some antes da frase do P5 e volta suave (sem o pulso) no cartão final
some = np.clip((t - EV['trilha_some']) / 0.6, 0, 1)
volta = np.clip((t - EV['cartao']) / 1.0, 0, 1) * 10 ** (-4 / 20)
music = music * ((1 - some) + volta)                                                     # (o pulso já parou no fim do P4)
msc = np.stack([music, np.roll(music, int(0.011 * SR)) * 0.97])

# ------------------------------------------------------------------ mixagem e master (o mesmo ganho para tudo)
mix = np.stack([voz, voz]) + sfx + msc + ambs


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
for nome, sig in (('voz', np.stack([voz, voz])), ('musica', msc), ('sfx', sfx), ('ambiente', ambs)):
    wavfile.write(os.path.join(AUD, nome + '.wav'), SR, np.round(np.clip(sig.T * g, -1, 1) * 32767).astype(np.int16))
ativo = np.mean(np.abs(mix[0] * g) > 10 ** (-2.4 / 20)) * 100
print(f'ok -> audio/mix.wav | {I:.1f} LUFS | limitador age em {ativo:.2f}% das amostras | ganho geral {20 * np.log10(g):+.1f} dB | limitador: até {red:.1f} dB nos picos | {len(ev)} efeitos')
