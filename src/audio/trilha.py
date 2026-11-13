"""trilha.py — trilha e efeitos sonoros compostos por código (síntese), sincronizados ao roteiro.

124 BPM. Ato 1 (caos) em Lá menor com build e quebra; drop em Dó maior (C G Am F).
Saída: build/trilha.wav (48 kHz, estéreo, 24 bits), mixada para −14 LUFS e pico ≤ −1,5 dBTP.
uso: python3 src/audio/trilha.py
"""
import json
import os
import numpy as np
import scipy.signal as ss
import soundfile_lite as sfl  # escrita WAV simples (módulo local)
import pyloudnorm as pyln
from numba import njit

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TEMPO = json.load(open(os.path.join(RAIZ, 'src', 'tempo.json')))
SR = 48000
TETO_DBTP = float(os.environ.get("TETO_DBTP", "-3.2"))
BPM = TEMPO['bpm']
BEAT = 60.0 / BPM
BAR = 4 * BEAT
DUR = TEMPO['duracao']
N = int(round(DUR * SR))
rng = np.random.default_rng(124)


def bar(n):
    return n * BAR


def beat(n):
    return n * BEAT


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


# ----------------------------------------------------------------- DSP básico
@njit(cache=True)
def svf(x, fc, q, modo):
    """filtro de estado variável (TPT) com corte por amostra. modo 0=passa-baixa 1=passa-banda 2=passa-alta"""
    y = np.zeros_like(x)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    for n in range(x.shape[0]):
        f = fc[n] if fc.shape[0] > 1 else fc[0]
        if f > 20000.0:
            f = 20000.0
        if f < 20.0:
            f = 20.0
        g = np.tan(np.pi * f / 48000.0)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[n] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if modo == 0:
            y[n] = v2
        elif modo == 1:
            y[n] = v1
        else:
            y[n] = x[n] - k * v1 - v2
    return y


def lp(x, fc, q=0.707):
    return svf(np.ascontiguousarray(x, dtype=np.float64), np.atleast_1d(np.asarray(fc, dtype=np.float64)), q, 0)


def bp(x, fc, q=1.0):
    return svf(np.ascontiguousarray(x, dtype=np.float64), np.atleast_1d(np.asarray(fc, dtype=np.float64)), q, 1)


def hp(x, fc, q=0.707):
    return svf(np.ascontiguousarray(x, dtype=np.float64), np.atleast_1d(np.asarray(fc, dtype=np.float64)), q, 2)


def shelf(x, fc, ganho_db):
    """realce de agudos simples: soma uma cópia passa-alta"""
    k = 10 ** (ganho_db / 20) - 1
    if x.ndim == 2:
        return np.stack([x[:, c] + k * hp(x[:, c], fc) for c in range(x.shape[1])], axis=1)
    return x + k * hp(x, fc)


@njit(cache=True)
def eco(x, d, fb, amort):
    """atraso com realimentação e amortecimento (passa-baixa de 1 polo na volta)"""
    y = np.zeros_like(x)
    buf = np.zeros(d)
    i = 0
    z = 0.0
    for n in range(x.shape[0]):
        s = buf[i]
        z = z + amort * (s - z)
        y[n] = s
        buf[i] = x[n] + z * fb
        i += 1
        if i >= d:
            i = 0
    return y


_tabelas = {}


def tabela(f, tipo='saw', tam=4096):
    chave = (tipo, int(round(12 * np.log2(max(f, 1) / 440.0) * 4)))
    if chave in _tabelas:
        return _tabelas[chave]
    nh = max(1, int(19000 / max(f, 1)))
    xg = np.arange(tam) / tam
    tb = np.zeros(tam)
    for k in range(1, nh + 1):
        if tipo == 'sq' and k % 2 == 0:
            continue
        tb += np.sin(2 * np.pi * k * xg) / k
    tb /= np.max(np.abs(tb))
    _tabelas[chave] = tb
    return tb


def osc(f, n, tipo='saw', fase=None):
    """oscilador de tabela limitado em banda. f pode ser escalar ou array."""
    f = np.broadcast_to(np.asarray(f, dtype=np.float64), (n,))
    tb = tabela(float(np.median(f)), tipo)
    ph = (np.cumsum(f) / SR + (rng.random() if fase is None else fase)) % 1.0
    idx = ph * len(tb)
    i0 = idx.astype(np.int64)
    fr = idx - i0
    return tb[i0 % len(tb)] * (1 - fr) + tb[(i0 + 1) % len(tb)] * fr


def seno(f, n, fase=0.0):
    f = np.broadcast_to(np.asarray(f, dtype=np.float64), (n,))
    return np.sin(2 * np.pi * (np.cumsum(f) / SR) + fase)


def env_ad(n, a, d, curva=1.0):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), np.exp(-(t - a) / max(d, 1e-6)))
    return e ** curva


def env_adsr(n, a, d, s, r, nota):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = t > nota
    e = np.where(rel, (s + (1 - s) * np.exp(-(nota - a) / max(d, 1e-6))) * np.exp(-(t - nota) / max(r, 1e-6)), e)
    return e


def ruido(n):
    return rng.standard_normal(n)


class Bus:
    def __init__(self):
        self.x = np.zeros((N + SR * 3, 2))

    def add(self, sig, t, ganho=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N:
            return
        sig = np.asarray(sig, dtype=np.float64)
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1)
        if i < 0:
            sig = sig[-i:]
            i = 0
        m = min(len(sig), self.x.shape[0] - i)
        self.x[i:i + m] += sig[:m] * ganho


# ----------------------------------------------------------------- instrumentos
def bumbo():
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    f = 52 + 150 * np.exp(-t / 0.028) + 40 * np.exp(-t / 0.11)
    corpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.exp(-t / 0.24) * np.clip(t / 0.002, 0, 1))
    clique = hp(ruido(n) * np.exp(-t / 0.0025), 2500) * 0.5
    s = np.tanh(1.6 * (corpo + clique))
    return s / np.max(np.abs(s))


def palma():
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    e = np.zeros(n)
    for k, d in enumerate([0.0, 0.009, 0.019]):
        e += np.where(t >= d, np.exp(-(t - d) / 0.006), 0) * (0.8 + 0.1 * k)
    e += np.where(t >= 0.019, 0.55 * np.exp(-(t - 0.019) / 0.13), 0)
    s = bp(ruido(n), 1500, 0.9) * e + 0.3 * hp(ruido(n), 3500) * e
    return s / np.max(np.abs(s))


def caixa_som(dec=0.11):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    tom = np.sin(2 * np.pi * (185 + 60 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.05)
    s = 0.5 * tom + bp(ruido(n), 3000, 0.6) * np.exp(-t / dec)
    return s / np.max(np.abs(s))


def metal(n):
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]:
        s += np.sign(np.sin(2 * np.pi * f * 2.1 * t + rng.random() * 6))
    return s


def chimbal(aberto=False):
    n = int((0.45 if aberto else 0.09) * SR)
    t = np.arange(n) / SR
    dec = 0.15 if aberto else 0.022
    s = (hp(ruido(n), 7500) * 0.7 + hp(metal(n), 7000) * 0.3) * np.exp(-t / dec)
    return s / np.max(np.abs(s))


def chocalho():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    s = bp(ruido(n), 7000, 0.8) * np.clip(t / 0.006, 0, 1) * np.exp(-t / 0.03)
    return s / np.max(np.abs(s))


def prato(dur=2.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = (hp(ruido(n), 3500) * 0.6 + hp(metal(n), 4000) * 0.4) * (np.exp(-t / 0.9) * 0.8 + np.exp(-t / 0.08) * 0.4)
    s = lp(s, 12000)
    st = np.stack([s, np.roll(s, 37)], axis=1)
    return st / np.max(np.abs(st))


def supersaw(notas, dur, corte=5000.0, ataque=0.005, rel=0.12, voz=7, espalha=0.22, q=0.8):
    n = int((dur + rel * 4) * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notas:
        for v in range(voz):
            det = (v - (voz - 1) / 2) / ((voz - 1) / 2) * espalha
            s = osc(mtof(m + det), n)
            pan = (v - (voz - 1) / 2) / ((voz - 1) / 2) * 0.8
            a = (pan + 1) * np.pi / 4
            L += s * np.cos(a)
            R += s * np.sin(a)
    t = np.arange(n) / SR
    e = np.clip(t / ataque, 0, 1) * np.where(t < dur, 1.0, np.exp(-(t - dur) / rel))
    fc = np.broadcast_to(np.asarray(corte, dtype=np.float64), (n,)) if np.ndim(corte) == 0 else corte[:n]
    L = lp(L * e, fc, q)
    R = lp(R * e, fc, q)
    st = np.stack([L, R], axis=1)
    return st / (len(notas) * voz * 0.55)


def pluck(m, dur=0.22, brilho=4200.0, dec=0.11, tipo='saw'):
    n = int((dur + 0.3) * SR)
    t = np.arange(n) / SR
    s = 0.6 * osc(mtof(m), n, tipo) + 0.4 * osc(mtof(m) * 1.003, n, 'sq')
    fc = 300 + brilho * np.exp(-t / dec)
    e = np.clip(t / 0.002, 0, 1) * np.where(t < dur, np.exp(-t / (dur * 1.6)), np.exp(-dur / (dur * 1.6)) * np.exp(-(t - dur) / 0.05))
    return lp(s * e, fc, 1.2)


def baixo_nota(m, dur, rolante=False):
    n = int((dur + 0.08) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    s = 0.55 * osc(f, n) + 0.45 * osc(f * 0.5 * 1.0, n, 'sq') * (0.6 if rolante else 0.3)
    fc = (420 if not rolante else 520) + (1500 if rolante else 900) * np.exp(-t / 0.06)
    e = np.clip(t / 0.003, 0, 1) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.02))
    corpo = lp(s, fc, 1.1) * e
    sub = np.sin(2 * np.pi * f * 0.5 * t) * e * 0.8
    return np.tanh(1.3 * (corpo + sub))


def lead_nota(m, dur):
    n = int((dur + 0.4) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    s = np.zeros(n)
    for det in (-0.08, 0.0, 0.08):
        s += osc(mtof(m + det) * vib, n)
    s += 0.5 * osc(mtof(m - 12) * vib, n, 'sq')
    fc = 2200 + 5500 * np.exp(-t / 0.18)
    e = np.clip(t / 0.004, 0, 1) * np.where(t < dur, 0.75 + 0.25 * np.exp(-t / 0.1), 0) + np.where(t >= dur, np.exp(-(t - dur) / 0.09), 0)
    return lp(s * e, fc, 1.0) / 3.0


# ----------------------------------------------------------------- efeitos sonoros
def sfx_impacto(tam=1.0):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    f = 44 + 80 * np.exp(-t / 0.06)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.55 * tam))
    estalo = lp(ruido(n), 3000 + 5000 * np.exp(-t / 0.02)) * np.exp(-t / 0.05)
    s = np.tanh(1.4 * boom + 0.6 * estalo)
    return s / np.max(np.abs(s))


def sfx_whoosh(dur=0.45, f0=400, f1=5000, pico=0.6, q=1.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = t / dur
    fc = f0 * (f1 / f0) ** x
    e = np.where(x < pico, (x / pico) ** 2, ((1 - x) / (1 - pico)) ** 1.5)
    s = bp(ruido(n), fc, q) * e
    s2 = bp(ruido(n), fc * 1.5, q) * e
    st = np.stack([s * (1 - 0.5 * x) + s2 * 0.3, s2 * (0.5 + 0.5 * x) + s * 0.3], axis=1)
    return st / np.max(np.abs(st))


def sfx_pop(f=900, dur=0.07):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-t / 0.008))) / SR) * np.exp(-t / 0.025)
    return s


def sfx_tique(f=4200, dur=0.012):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return bp(ruido(n), f, 2.0) * np.exp(-t / 0.0025) + 0.4 * np.sin(2 * np.pi * f * 0.5 * t) * np.exp(-t / 0.002)


def sfx_chave():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for _ in range(3):
        d = rng.random() * 0.06
        for f in rng.uniform(2400, 7800, 5):
            s += np.where(t > d, np.sin(2 * np.pi * f * (t - d)) * np.exp(-(t - d) / rng.uniform(0.05, 0.2)), 0)
    return s / np.max(np.abs(s))


def sfx_papel():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    s = lp(ruido(n), 500) * np.exp(-t / 0.03) * 1.2 + bp(ruido(n), 1800, 0.7) * np.exp(-t / 0.045) * 0.5
    return s / np.max(np.abs(s))


def sfx_sino(f=1568, dur=1.6, ind=3.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * 2.0 * t) * ind * np.exp(-t / 0.25)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 0.45)
    s += 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.18)
    return s / np.max(np.abs(s))


def sfx_respiro(dur=0.9, sobe=True):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = t / dur
    e = np.sin(np.pi * x) ** 2
    fc = (600 + 1400 * x) if sobe else (1800 - 1000 * x)
    s = bp(ruido(n), fc, 0.7) * e
    return s / np.max(np.abs(s))


def sfx_reverso(dur=1.0):
    c = prato(dur + 0.3)[: int(dur * SR)][::-1]
    x = np.linspace(0, 1, len(c))[:, None]
    return c * x ** 1.5


def sfx_riser(dur, f0=200, f1=6000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = t / dur
    fc = f0 * (f1 / f0) ** (x ** 1.4)
    s = bp(ruido(n), fc, 2.0) * (x ** 2)
    tom = osc(110 * 2 ** (3 * x ** 1.6), n) * (x ** 2.5) * 0.25
    s = s + lp(tom, 3000 + 6000 * x)
    st = np.stack([s, np.roll(s, 211)], axis=1)
    return st / np.max(np.abs(st))


# ----------------------------------------------------------------- reverb (convolução com IR sintética)
def ir_reverb(dur=2.2, pre=0.012):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = []
    for c in range(2):
        r = rng.standard_normal(n) * np.exp(-t / (dur / 6.5))
        r = lp(r, 9000 * np.exp(-t / 1.2) + 1500)
        r = np.concatenate([np.zeros(int(pre * SR)), r])
        out.append(r)
    ir = np.stack(out, axis=1)
    return ir / np.sqrt(np.sum(ir ** 2))


def aplica_reverb(x, ir, mix=1.0):
    L = ss.fftconvolve(x[:, 0], ir[:, 0])[: len(x)]
    R = ss.fftconvolve(x[:, 1], ir[:, 1])[: len(x)]
    return np.stack([L, R], axis=1) * mix


# ----------------------------------------------------------------- arranjo
AM, F_, G_, C_, E_ = 'Am', 'F', 'G', 'C', 'E'
VOZ = {'Am': [57, 60, 64], 'F': [57, 60, 65], 'G': [59, 62, 67], 'C': [60, 64, 67], 'E': [56, 59, 64]}
RAIZ_BAIXO = {'Am': 33, 'F': 29, 'G': 31, 'C': 36, 'E': 28}
ARPEJO = {'Am': [69, 72, 76, 81], 'F': [69, 72, 77, 81], 'G': [67, 71, 74, 79], 'C': [67, 72, 76, 79], 'E': [68, 71, 76, 80]}


def acorde_do_compasso(b):
    if b < 12:
        return [AM, AM, F_, G_][b % 4]
    if b == 12:
        return F_
    seq = {13: C_, 14: G_, 15: AM, 16: F_, 17: C_, 18: G_, 19: AM, 20: F_, 21: G_, 22: AM, 23: F_, 24: C_, 25: F_, 26: C_}
    return seq.get(b, C_)


MELODIA = {  # posição em 16 avos, nota, duração em 16 avos
    'C': [(0, 76, 2), (2, 79, 2), (4, 84, 3), (7, 83, 1), (8, 79, 2), (10, 76, 2), (12, 74, 2), (14, 76, 2)],
    'G': [(0, 74, 2), (2, 79, 2), (4, 83, 3), (7, 81, 1), (8, 79, 4), (12, 74, 2), (14, 71, 2)],
    'Am': [(0, 72, 2), (2, 76, 2), (4, 81, 3), (7, 79, 1), (8, 76, 2), (10, 72, 2), (12, 74, 2), (14, 76, 2)],
    'F': [(0, 77, 2), (2, 76, 2), (4, 72, 3), (7, 74, 1), (8, 76, 6), (14, 79, 2)],
}
S16 = BEAT / 4


def compoe():
    bat, bai, mus, sfx, rev, eco_bus = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()
    K, CL, SN = bumbo(), palma(), caixa_som()
    HC, HO, SH = chimbal(False), chimbal(True), chocalho()
    batidas_bumbo = []

    def bumbo_ativo(b):
        return any(a <= b < z for a, z in TEMPO['bumbo'])

    # ---------------- bateria
    for b in range(0, 27):
        for q in range(4):
            tb = bar(b) + beat(q)
            pos = b + q / 4
            if bumbo_ativo(pos):
                bat.add(K, tb, 0.46 if b < 13 else 0.56)
                batidas_bumbo.append(tb)
            if b in range(0, 12) or b in range(13, 22) or b in range(24, 26):
                if q in (1, 3) and not (b == 11 and q == 3):
                    bat.add(CL, tb, 0.3 if b < 13 else 0.36, 0.05)
                    rev.add(CL, tb, 0.18)
            # chimbal aberto no contratempo
            if (b < 12 and pos < 11.5) or (13 <= b < 26):
                bat.add(HO, tb + BEAT / 2, 0.11 if b < 13 else 0.15, 0.25)
            # chimbal fechado em 16 avos
            if (2 <= b < 12) or (13 <= b < 26):
                for s in (0, 1, 3):
                    v = 0.06 if s == 0 else 0.09
                    bat.add(HC, tb + s * S16, v, -0.3)
            if (4 <= b < 11) or (13 <= b < 22) or (b == 24):
                for s in range(4):
                    bat.add(SH, tb + s * S16, 0.045 + 0.03 * (s % 2), 0.4)
            if 22 <= b < 24:
                for s in (2,):
                    bat.add(HC, tb + s * S16, 0.09, -0.2)
    # rufo de caixa no build (compassos 10-11) e antes do drop
    for i in range(16):
        t = bar(10) + i * BEAT / 2
        bat.add(SN, t, 0.07 + 0.1 * i / 16, 0.1)
    for i in range(16):
        t = bar(11) + i * S16 * 0.999
        if t < bar(11) + 3.5 * BEAT:
            bat.add(SN, t, 0.12 + 0.12 * i / 16, -0.1)
    for i in range(8):
        bat.add(SN, bar(11) + 3.5 * BEAT + i * S16 / 4, 0.18, 0.0)
    for i in range(8):  # último tempo da quebra: rufo subindo
        bat.add(SN, bar(12) + 3 * BEAT + i * S16 / 2, 0.05 + 0.18 * i / 8, 0.0)
        rev.add(SN, bar(12) + 3 * BEAT + i * S16 / 2, 0.08)
    for i in range(8):  # virada antes do compasso 17 e do logo
        bat.add(SN, bar(17) - BEAT + i * S16 / 2, 0.08 + 0.1 * i / 8, 0.15)
        bat.add(SN, bar(24) - BEAT + i * S16 / 2, 0.08 + 0.12 * i / 8, -0.15)
    for tc in [0.0, bar(13), bar(17), bar(20), bar(24)]:
        bat.add(prato(), tc, 0.2)
    bat.add(prato(3.0), bar(26), 0.22)

    # ---------------- baixo
    for b in range(0, 27):
        ac = acorde_do_compasso(b)
        r = RAIZ_BAIXO[ac] + 12
        if b < 12:
            for q in range(4):
                if b == 11 and q >= 3:
                    continue
                bai.add(baixo_nota(r, BEAT * 0.42), bar(b) + beat(q) + BEAT / 2, 0.42)
        elif 13 <= b < 22 or b == 24:
            for q in range(4):
                for s, oit in ((1, 0), (2, 0), (3, 12)):
                    bai.add(baixo_nota(r + oit, S16 * 0.8, True), bar(b) + beat(q) + s * S16, 0.38)
        elif b == 25:
            for q in range(4):
                bai.add(baixo_nota(r, BEAT * 0.45), bar(b) + beat(q) + BEAT / 2, 0.38)
    # sub longo no drop e no final
    for tb, m, d in [(bar(13), 33, 1.6), (bar(24), 36, 1.6), (bar(26), 36, 1.5)]:
        n = int(d * SR)
        tt = np.arange(n) / SR
        bai.add(np.sin(2 * np.pi * mtof(m) * tt) * np.exp(-tt / 0.6), tb, 0.45)

    # ---------------- harmonia
    for b in range(0, 27):
        ac = acorde_do_compasso(b)
        notas = VOZ[ac]
        tb = bar(b)
        if b < 12:
            # stabs curtos nos contratempos a partir do compasso 4
            if b >= 4:
                for p16 in (2, 6, 10, 14) if b >= 8 else (6, 14):
                    st = supersaw(notas, S16 * 1.2, corte=4200, rel=0.06, voz=5, espalha=0.18)
                    mus.add(st, tb + p16 * S16, 0.32)
                    rev.add(st, tb + p16 * S16, 0.08)
            # arpejo pluck 16 avos
            if b >= 2:
                padrao = [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 3, 1, 2]
                abre = 2200 + 5000 * min(1.0, (b - 2) / 9)
                for s in range(16):
                    if b == 11 and s >= 12:
                        continue
                    m = ARPEJO[ac][padrao[s]]
                    pl = pluck(m, S16 * 0.9, brilho=abre, dec=0.07)
                    mus.add(pl, tb + s * S16, 0.15 if s % 4 else 0.19, -0.35 if s % 2 else 0.35)
                    eco_bus.add(pl, tb + s * S16, 0.05)
        elif b == 12:
            # quebra: pad
            fc = np.linspace(600, 2600, int((BAR + 0.6) * SR))
            st = supersaw(VOZ['F'] + [53], BAR * 0.97, corte=fc, ataque=0.35, rel=0.25, voz=7, espalha=0.25)
            mus.add(st, tb, 0.2)
            rev.add(st, tb, 0.16)
        else:
            # drop: acordes sustentados com bombeamento (sidechain) + oitava acima
            if b in range(13, 22) or b in range(24, 26):
                st = supersaw(notas + [notas[0] + 12], BAR * 0.98, corte=8000, ataque=0.004, rel=0.18, voz=7, espalha=0.24)
                mus.add(st, tb, 0.42)
                rev.add(st, tb, 0.1)
            elif b in (22, 23):
                # volta (cabeça leve): stabs leves
                for p16 in (2, 6, 10, 14):
                    st = supersaw(notas + [notas[0] + 12], S16 * 1.4, corte=3600, rel=0.08, voz=7, espalha=0.22)
                    mus.add(st, tb + p16 * S16, 0.36)
                    rev.add(st, tb + p16 * S16, 0.12)
                if b == 23:
                    st = supersaw(VOZ['G'], BEAT * 2, corte=np.linspace(800, 5000, int((BEAT * 2 + 0.8) * SR)), ataque=0.4, rel=0.1)
                    mus.add(st, tb + 2 * BEAT, 0.3)
            elif b == 26:
                st = supersaw(VOZ['C'] + [48, 72], 1.3, corte=np.linspace(5200, 1200, int((1.3 + 0.8) * SR)), ataque=0.004, rel=0.5, voz=7, espalha=0.25)
                mus.add(st, tb, 0.5)
                rev.add(st, tb, 0.35)
            # melodia: drop (13-20) e logo (24-25)
            if b in range(13, 21) or b in (24,):
                for p16, m, d in MELODIA[ac]:
                    ln = lead_nota(m, d * S16 * 0.92)
                    mus.add(ln, tb + p16 * S16, 0.2, 0.0)
                    eco_bus.add(ln, tb + p16 * S16, 0.09)
                    rev.add(ln, tb + p16 * S16, 0.06)
    # stab de impacto no quadro 0
    st = supersaw(VOZ['Am'] + [45, 69], 0.25, corte=4000, rel=0.15, voz=7, espalha=0.25)
    mus.add(st, 0.0, 0.45)
    rev.add(st, 0.0, 0.2)

    # ---------------- efeitos (sincronizados com as cenas)
    sfx.add(sfx_impacto(0.8), 0.0, 0.55)
    for i in range(16):  # bolinhas saindo pela chaminé
        ts = 0.12 + i * BEAT / 2
        if ts < bar(2) - 0.3:
            sfx.add(sfx_pop(1100 + 400 * rng.random(), 0.06), ts, 0.08, 0.5)
    sfx.add(sfx_reverso(0.42), bar(2) - 0.42, 0.25)
    sfx.add(sfx_impacto(0.7), bar(2), 0.5)
    sfx.add(sfx_whoosh(0.5, 3000, 600, 0.15), bar(2), 0.35)
    # relógio rolando: tiques acompanhando a velocidade
    t = 3.93
    while t < bar(2) + 2 * BEAT:
        p = (t - 3.93) / (bar(2) + 2 * BEAT - 3.93)
        sfx.add(sfx_tique(5200, 0.01), t, 0.13, 0.2)
        t += 0.022 + 0.11 * p ** 2
    sfx.add(sfx_tique(2600, 0.03), bar(2) + 2 * BEAT, 0.5)
    sfx.add(sfx_pop(700, 0.08), bar(2) + 0.62, 0.15)
    for q in range(2, 15):
        sfx.add(sfx_tique(6000, 0.008), bar(2) + beat(q), 0.06, -0.3)
    # zoom pelo zero
    sfx.add(sfx_whoosh(0.42, 300, 7000, 0.92, 1.2), bar(4) - 0.4, 0.42)
    sfx.add(sfx_impacto(0.4), bar(4), 0.25)
    # nuvem de perguntas
    for i in range(10):
        tp = bar(4) + 0.95 + i * BEAT / 4
        sfx.add(sfx_pop(700 + 120 * (i % 5), 0.07), tp, 0.12, -0.6 + 0.12 * i)
    sfx.add(sfx_whoosh(0.3, 800, 3000, 0.5), bar(4) + 0.42, 0.16)
    # pílula vira fundo
    sfx.add(sfx_whoosh(0.3, 500, 6000, 0.95), bar(6) - 0.28, 0.4)
    sfx.add(sfx_impacto(0.4), bar(6), 0.3)
    # etiqueta: chaves
    sfx.add(sfx_chave(), bar(6) + 0.2, 0.18, 0.2)
    for k in (1, 3, 5):
        tc = bar(6) + BEAT * k
        sfx.add(sfx_whoosh(0.35, 1500, 4000, 0.5, 2.0), tc - 0.05, 0.12)
        sfx.add(sfx_chave(), tc + 0.25, 0.12, -0.2)
    sfx.add(sfx_whoosh(0.44, 600, 8000, 0.95, 1.5), bar(8) - 0.44, 0.38)
    sfx.add(sfx_impacto(0.5), bar(8), 0.32)
    # comandas caindo
    for i in range(1, 7):
        sfx.add(sfx_papel(), bar(8) + BEAT * (1 + i), 0.3, -0.2 + 0.07 * i)
    # chicote
    sfx.add(sfx_whoosh(0.42, 500, 5000, 0.5, 1.0), bar(10) - 0.21, 0.5)
    # caça-níquel
    t = bar(10) + 0.1
    k = 0
    while t < bar(11) + 0.3:
        sfx.add(sfx_tique(3000 + 900 * (k % 4), 0.012), t, 0.07, -0.4 + 0.15 * (k % 6))
        t += 0.045 + 0.03 * ((k * 7) % 5) / 5
        k += 1
    # vórtice (riser) e quebra
    sfx.add(sfx_riser(bar(12) - (bar(11) + 0.2), 150, 7000), bar(11) + 0.2, 0.35)
    sfx.add(sfx_respiro(0.95, True), bar(12) + 0.02, 0.22)
    sfx.add(sfx_respiro(0.6, False), bar(12) + 1.3, 0.16)
    sfx.add(sfx_reverso(0.5), bar(13) - 0.5, 0.35)
    # DROP
    sfx.add(sfx_impacto(1.4), bar(13), 0.85)
    sfx.add(sfx_whoosh(0.5, 4000, 400, 0.1), bar(13), 0.25)
    sfx.add(sfx_whoosh(0.48, 3000, 300, 0.7), bar(15) - 0.5, 0.25)
    # estações
    for k in range(5):
        tk = bar(15 + k)
        sfx.add(sfx_whoosh(0.32, 700, 6000, 0.7, 1.6), tk - 0.28, 0.26, -0.3 + 0.15 * k)
        sfx.add(sfx_pop(1300, 0.05), tk, 0.1)
    sfx.add(sfx_tique(2200, 0.03), bar(15) + 0.84, 0.3)                    # reserva encaixa
    sfx.add(sfx_sino(1318, 0.9, 1.5), bar(16) + 0.6, 0.1, 0.3)            # chegada
    for i in range(3):
        sfx.add(sfx_pop(900 + 200 * i, 0.06), bar(17) + 0.62 + i * 0.12, 0.14)  # itens na comanda
    sfx.add(sfx_whoosh(0.3, 2000, 6000, 0.3, 2.0), bar(18) + 0.55, 0.15, 0.5)  # saída
    for i in range(6):
        sfx.add(sfx_tique(2400 + 300 * i, 0.025), bar(19) + 0.3 + i * BEAT / 4, 0.28, -0.4 + 0.16 * i)
    sfx.add(sfx_sino(1568, 1.8, 3.0), bar(19) + 1.0, 0.24)                 # caixa bateu ✓
    sfx.add(sfx_sino(2093, 1.4, 2.0), bar(19) + 1.06, 0.12)
    # recuo e ícones nos pontos do contorno da casa
    sfx.add(sfx_whoosh(1.0, 300, 2500, 0.4, 0.8), bar(20) - 0.1, 0.25)  # recuo: a casa aparece
    for k, m in enumerate([72, 74, 76, 79, 81]):
        sfx.add(sfx_pop(mtof(m) * 2, 0.07), bar(20) + 0.55 + k * 0.08, 0.1)
    # o traço termina de desenhar a casa e fecha no 3º tempo do compasso 21
    tf = bar(20) + 3 * BEAT
    sfx.add(sfx_whoosh(1.9, 250, 1800, 0.85, 1.2), tf - 1.9, 0.14)
    sfx.add(sfx_tique(1800, 0.04), tf, 0.4)
    sfx.add(sfx_pop(520, 0.12), tf, 0.25)
    sfx.add(sfx_sino(1047, 1.2, 1.2), tf, 0.1)
    # volta: fileiras de bolinhas = escala subindo
    escala = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81]
    for r in range(12):
        ts = bar(22) + 0.5 + r * 0.055
        sfx.add(pluck(escala[r] + 12, 0.08, 3000, 0.05), ts, 0.13, -0.3 + 0.05 * r)
    sfx.add(sfx_pop(800, 0.08), bar(22) + 0.86, 0.16)
    sfx.add(sfx_whoosh(0.5, 400, 5000, 0.9), bar(24) - 0.5, 0.35)
    sfx.add(sfx_impacto(1.0), bar(24), 0.6)
    for i in range(4):
        sfx.add(sfx_tique(3200, 0.02), bar(24) + i * BEAT / 4, 0.14)
    for i in range(13):
        sfx.add(sfx_tique(6500, 0.006), bar(24) + 0.75 + i * 0.03, 0.05)
    # bolinhas assentando na linha de base (do centro para as pontas)
    for i in range(8):
        sfx.add(sfx_tique(4800 - 300 * i, 0.012), bar(24) + 0.8 + i * 0.035, 0.07, (-1) ** i * 0.1 * i)
    for tg in (bar(24) + 1.9, bar(25) + 1.3):
        for i, m in enumerate([84, 88, 91, 96]):
            sfx.add(sfx_sino(mtof(m), 0.7, 1.0), tg + i * 0.04, 0.035, -0.5 + 0.3 * i)
    sfx.add(sfx_impacto(1.2), bar(26), 0.5)

    return bat, bai, mus, sfx, rev, eco_bus, batidas_bumbo


def sidechain(batidas, prof=0.7, rel=0.17):
    g = np.ones(N + SR * 3)
    t = np.arange(len(g)) / SR
    for tb in batidas:
        i0 = int(tb * SR)
        n = int(0.5 * SR)
        tt = np.arange(n) / SR
        curva = 1 - prof * np.exp(-tt / rel) * np.clip(tt / 0.004, 0, 1) - prof * (tt < 0.004) * (1 - tt / 0.004) * 0
        m = min(n, len(g) - i0)
        g[i0:i0 + m] = np.minimum(g[i0:i0 + m], curva[:m])
    return g[:, None]


def compressor(x, lim_db=-12, razao=2.5, at=0.01, rel=0.15):
    mono = np.max(np.abs(x), axis=1)
    env = ss.lfilter([1 - np.exp(-1 / (rel * SR))], [1, -np.exp(-1 / (rel * SR))], mono)
    db = 20 * np.log10(np.maximum(env, 1e-6))
    red = np.minimum(0, (lim_db - db) * (1 - 1 / razao))
    return x * (10 ** (red / 20))[:, None]


def pico_real(x):
    up = ss.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


@njit(cache=True)
def _ganho_lim(pico, teto, olhar, rel):
    n = pico.shape[0]
    alvo = np.ones(n)
    for i in range(n):
        if pico[i] > teto:
            alvo[i] = teto / pico[i]
    # mínimo à frente (lookahead)
    g = np.ones(n)
    for i in range(n):
        m = 1.0
        j1 = min(n, i + olhar)
        for j in range(i, j1):
            if alvo[j] < m:
                m = alvo[j]
        g[i] = m
    # suavização: ataque instantâneo (já antecipado), liberação exponencial
    out = np.ones(n)
    z = 1.0
    a = np.exp(-1.0 / rel)
    for i in range(n):
        if g[i] < z:
            z = g[i]
        else:
            z = g[i] + (z - g[i]) * a
        out[i] = z
    return out


def limitador(x, teto_db=-1.9):
    teto = 10 ** (teto_db / 20)
    up = ss.resample_poly(x, 4, 1, axis=0)
    pk = np.max(np.abs(up), axis=1).reshape(-1, 4).max(axis=1)[: len(x)]
    if len(pk) < len(x):
        pk = np.concatenate([pk, np.zeros(len(x) - len(pk))])
    g = _ganho_lim(pk, teto, int(0.002 * SR), 0.06 * SR)
    # suaviza o ataque com média móvel curta
    k = int(0.0015 * SR)
    g = np.minimum(g, ss.lfilter(np.ones(k) / k, [1], g))
    return x * g[:, None]


def main():
    bat, bai, mus, sfx, rev, eco_bus, batidas = compoe()
    sc = sidechain(batidas, 0.75, 0.16)
    sc_leve = sidechain(batidas, 0.35, 0.12)
    ir = ir_reverb(2.4)
    ir_curta = ir_reverb(1.1)
    d_ms = int(BEAT * 0.75 * SR)
    eco_st = np.stack([eco(eco_bus.x[:, 0] + eco_bus.x[:, 1], d_ms, 0.42, 0.35), eco(np.roll(eco_bus.x[:, 0] + eco_bus.x[:, 1], d_ms // 2), d_ms, 0.42, 0.35)], axis=1) * 0.6
    reverb = aplica_reverb(rev.x + 0.3 * eco_st, ir) * 0.9
    sfx_rev = aplica_reverb(sfx.x, ir_curta) * 0.22
    baixo = hp(bai.x[:, 0], 30)[:, None] * np.ones((1, 2)) * 0.5 + bai.x * 0.5
    musica = shelf(mus.x * sc + eco_st * sc_leve + reverb * sc_leve, 2200, 6.0)
    bateria = shelf(bat.x, 5000, 4.0)
    mix = bateria * 1.0 + baixo * sc * 1.05 + musica * 2.6 + sfx.x * 0.75 + sfx_rev
    mix = mix[:N]
    # leve fade final
    nf = int(0.35 * SR)
    mix[-nf:] *= np.linspace(1, 0, nf)[:, None] ** 1.5
    mix = np.stack([hp(mix[:, 0], 36), hp(mix[:, 1], 36)], axis=1)
    mix = shelf(mix, 9000, 2.0)
    mix = compressor(mix, -10, 2.0, 0.01, 0.12)
    medidor = pyln.Meter(SR)
    alvo = -14.0
    for it in range(6):
        lufs = medidor.integrated_loudness(mix)
        mix = mix * 10 ** ((alvo - lufs) / 20)
        mix = limitador(mix, TETO_DBTP)
    lufs = medidor.integrated_loudness(mix)
    tp = pico_real(mix)
    for nome, a, z in (('ato1', 0, 11), ('quebra', 12, 13), ('drop', 13, 21), ('volta', 22, 24), ('logo', 24, 26)):
        seg = mix[int(bar(a) * SR):int(bar(z) * SR)]
        print(f'  {nome:7s} {medidor.integrated_loudness(seg) if len(seg) > SR else float("nan"):6.1f} LUFS')
    print(f'loudness integrado: {lufs:.2f} LUFS · pico real: {tp:.2f} dBTP')
    os.makedirs(os.path.join(RAIZ, 'build'), exist_ok=True)
    sfl.escreve(os.path.join(RAIZ, 'build', 'trilha.wav'), mix, SR)
    json.dump({'batidas_bumbo': batidas}, open(os.path.join(RAIZ, 'build', 'batidas.json'), 'w'))


if __name__ == '__main__':
    main()
