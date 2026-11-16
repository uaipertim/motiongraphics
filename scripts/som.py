"""Blocos de síntese compartilhados pela trilha e pelos efeitos (numpy/scipy puro)."""
import numpy as np
from scipy import signal

SR = 48000
PI2 = 2 * np.pi


def db(v):
    return 10.0 ** (v / 20.0)


def para_db(v):
    return 20.0 * np.log10(np.maximum(np.abs(v), 1e-12))


def midi(n):
    return 440.0 * 2.0 ** ((n - 69) / 12.0)


def tempo(dur):
    n = max(1, int(round(dur * SR)))
    return np.arange(n) / SR


def cos_sobe(n):
    n = max(1, int(n))
    return 0.5 - 0.5 * np.cos(np.pi * (np.arange(n) + 0.5) / n)


def env_ar(n, atk, rel):
    """Envelope com ataque e soltura em cosseno (segundos), sustentação 1."""
    e = np.ones(n)
    a, r = min(n, int(atk * SR)), min(n, int(rel * SR))
    if a > 0:
        e[:a] *= cos_sobe(a)
    if r > 0:
        e[n - r:] *= cos_sobe(r)[::-1]
    return e


def pan(mono, p):
    """Mono -> estéreo com pan de potência constante (p de -1 a 1)."""
    p = float(np.clip(p, -1, 1))
    ang = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(ang), mono * np.sin(ang)], axis=1)


def colocar(bus, sig, t_ini, ganho=1.0):
    """Soma `sig` (mono ou estéreo) em `bus` (N,2) começando em t_ini segundos."""
    if sig.ndim == 1:
        sig = np.stack([sig, sig], axis=1) * np.sqrt(0.5)
    i = int(round(t_ini * SR))
    a, b = max(0, i), min(len(bus), i + len(sig))
    if b <= a:
        return
    bus[a:b] += sig[a - i:b - i] * ganho


def sos_pb(f, ordem=2):
    return signal.butter(ordem, f, "low", fs=SR, output="sos")


def sos_pa(f, ordem=2):
    return signal.butter(ordem, f, "high", fs=SR, output="sos")


def sos_pf(f1, f2, ordem=2):
    return signal.butter(ordem, [f1, f2], "band", fs=SR, output="sos")


def filtrar(sos, x):
    return signal.sosfilt(sos, x, axis=0)


def filtrar0(sos, x):
    """Fase zero (ida e volta)."""
    return signal.sosfiltfilt(sos, x, axis=0)


def ruido(n, rng):
    return rng.standard_normal(int(n))


def ruido_varrido(dur, f_ini, f_fim, rng, largura=1.2, curva=1.0):
    """Ruído com passa-faixa que desliza de f_ini a f_fim (mistura de bandas fixas)."""
    n = int(dur * SR)
    base = ruido(n + 2048, rng)
    lo, hi = min(f_ini, f_fim), max(f_ini, f_fim)
    k = max(3, int(np.ceil(np.log2(hi / lo) * 2)) + 1)
    centros = np.geomspace(lo, hi, k)
    pos = (np.arange(n) / max(1, n - 1)) ** curva
    alvo = np.log(f_ini) + (np.log(f_fim) - np.log(f_ini)) * pos
    idx = (alvo - np.log(lo)) / (np.log(hi) - np.log(lo)) * (k - 1)
    out = np.zeros(n)
    for j, c in enumerate(centros):
        f1, f2 = c / 2 ** (largura / 2), min(c * 2 ** (largura / 2), SR * 0.45)
        b = filtrar(sos_pf(f1, f2, 2), base)[2048:]
        out += b * np.clip(1 - np.abs(idx - j), 0, 1)
    return out


def ir_reverb(rt60=1.8, seed=7, pb=6500, pa=220, predelay=0.018, dur=None):
    """Resposta ao impulso estéreo: ruído filtrado com decaimento exponencial."""
    rng = np.random.default_rng(seed)
    n = int((dur or rt60 * 1.25) * SR)
    t = np.arange(n) / SR
    env = np.exp(-6.908 * t / rt60) * (1 - np.exp(-t / 0.004))
    ir = rng.standard_normal((n, 2)) * env[:, None]
    ir = filtrar(sos_pb(pb, 2), filtrar(sos_pa(pa, 2), ir))
    # agudos morrem antes
    ir2 = filtrar(sos_pb(2200, 1), ir)
    mist = np.clip(t / (rt60 * 0.6), 0, 1)[:, None]
    ir = ir * (1 - mist) + ir2 * mist
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros((pd, 2)), ir])
    return ir / np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))


def reverberar(x, ir):
    """Convolução estéreo; devolve só a parte molhada, com o mesmo tamanho."""
    out = np.zeros_like(x)
    for c in range(2):
        out[:, c] = signal.fftconvolve(x[:, c], ir[:, c])[: len(x)]
    return out


# ---------------------------------------------------------------- timbres ---

def mallet(m, dur=1.1, brilho=1.0, f=None):
    """Tecla de madeira/marimba suave: fundamental + parciais curtos."""
    f = f or midi(m)
    t = tempo(dur)
    s = np.sin(PI2 * f * t) * np.exp(-t / (0.36 * dur / 1.1))
    if 4 * f < 9000:
        s += 0.30 * brilho * np.sin(PI2 * 4 * f * t) * np.exp(-t / 0.065)
    if 9.2 * f < 12000:
        s += 0.10 * brilho * np.sin(PI2 * 9.2 * f * t) * np.exp(-t / 0.018)
    s *= 1 - np.exp(-t / 0.0018)
    s[-256:] *= cos_sobe(256)[::-1]
    return s


def sino(m, dur=2.2, brilho=1.0, f=None):
    """Sino FM quente."""
    f = f or midi(m)
    t = tempo(dur)
    ind = 1.5 * brilho * np.exp(-t / 0.22) + 0.12
    s = np.sin(PI2 * f * t + ind * np.sin(PI2 * f * 3.5 * t)) * np.exp(-t / (dur * 0.32))
    s += 0.28 * np.sin(PI2 * 2 * f * t) * np.exp(-t / (dur * 0.18))
    s *= 1 - np.exp(-t / 0.003)
    s[-512:] *= cos_sobe(512)[::-1]
    return s


def sub_batida(f_ini=70.0, f_fim=42.0, decai=0.45, dur=None):
    """Batida grave macia (senóide com queda de afinação)."""
    t = tempo(dur or decai * 4)
    f = f_fim + (f_ini - f_fim) * np.exp(-t / 0.05)
    fase = PI2 * np.cumsum(f) / SR
    s = (np.sin(fase) + 0.18 * np.sin(2 * fase)) * np.exp(-t / decai)
    s *= 1 - np.exp(-t / 0.002)
    s[-512:] *= cos_sobe(512)[::-1]
    return s


def pico_real_db(x, fator=4):
    """Pico real (true peak) aproximado por superamostragem."""
    y = signal.resample_poly(x, fator, 1, axis=0)
    return float(para_db(np.max(np.abs(y))))


def escrever_wav(caminho, x):
    import soundfile as sf
    sf.write(caminho, x.astype(np.float32), SR, subtype="PCM_24")
