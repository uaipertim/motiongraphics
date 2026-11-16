"""Trilha de fundo do vídeo FAZLO Hospeda — composta por código (numpy/scipy).

Moderna e discreta: pads quentes, teclas de madeira em arpejo, sub leve, bumbo
macio e shaker. Ré maior (a "dor" fica em Si menor, a relativa, sem resolver).

A estrutura acompanha a narração: todos os tempos saem de
audio/narracao/palavras.json na hora de rodar (nada fixo no código).

Uso: python3 scripts/trilha.py            -> audio/trilha.wav
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from som import (PI2, SR, colocar, cos_sobe, db, env_ar, escrever_wav, filtrar,  # noqa: E402
                 filtrar0, ir_reverb, mallet, midi, pan, para_db, pico_real_db,
                 reverberar, ruido, ruido_varrido, sino, sos_pa, sos_pb, sos_pf,
                 sub_batida, tempo)

BPM = 96.0
SPB = 60.0 / BPM
SEMENTE = 20261115
ALVO_LUFS = -20.0   # nível da trilha sozinha; a mixagem decide o resto

AC = {  # baixo (MIDI), notas do pad, notas do arpejo
    "D9":   dict(baixo=38, pad=[57, 62, 64, 66], arp=[62, 66, 69, 74, 76, 78]),
    "Bm7":  dict(baixo=35, pad=[57, 59, 62, 66], arp=[59, 62, 66, 69, 71, 74]),
    "G7M":  dict(baixo=43, pad=[55, 59, 62, 66], arp=[59, 62, 66, 67, 71, 74]),
    "Asus": dict(baixo=45, pad=[57, 59, 62, 64], arp=[57, 62, 64, 69, 71, 74]),
    "F#m7": dict(baixo=42, pad=[57, 61, 64, 66], arp=[61, 64, 66, 69, 73, 76]),
    "D/F#": dict(baixo=42, pad=[57, 62, 64, 66], arp=[62, 66, 69, 74, 76, 78]),
    "A/C#": dict(baixo=37, pad=[57, 59, 61, 64], arp=[61, 64, 69, 71, 73, 76]),
    "Em9":  dict(baixo=40, pad=[55, 59, 62, 66], arp=[59, 62, 64, 66, 67, 71]),
    # a dor: tensão sem resolução
    "Bm9":   dict(baixo=35, pad=[54, 59, 61, 62]),
    "G#11":  dict(baixo=43, pad=[55, 59, 61, 66]),
    "Em9d":  dict(baixo=40, pad=[55, 59, 62, 66]),
    "F#sus": dict(baixo=42, pad=[54, 59, 61, 64]),
}

PROG_DIA = [
    ["D9", "Bm7", "G7M", "Asus"],
    ["D9", "F#m7", "G7M", "Asus"],
    ["Bm7", "G7M", "D/F#", "Asus"],
    ["G7M", "Asus", "D9", "Bm7"],
]
ARP = [
    dict(pos=[0, .5, 1, 1.5, 2, 2.5, 3, 3.5], idx=[0, 2, 3, 2, 4, 2, 3, 2]),
    dict(pos=[0, .75, 1.5, 2, 2.75, 3.5], idx=[0, 2, 3, 4, 2, 3]),
    dict(pos=[0, .5, 1.5, 2, 2.5, 3.5], idx=[1, 3, 2, 4, 3, 2]),
    dict(pos=[0, .75, 1.5, 2.5, 3, 3.5], idx=[0, 3, 4, 2, 3, 5]),
]
ARP_LEVE = [
    dict(pos=[0, 1.5, 2.5], idx=[2, 4, 3]),
    dict(pos=[.5, 1.5, 3], idx=[3, 2, 4]),
]
DIA = ["visao", "calendario", "duplicada", "sinal", "cancelamento", "comanda",
       "checkout", "caixa", "fechamento"]
VAR_DIA = [0, 1, 2, 0, 3, 1, 2, 0, 1]


# ------------------------------------------------------------- narração ---

def limpa(tok):
    return tok.strip(".,:;?!").lower()


class Narracao:
    def __init__(self, caminho="audio/narracao/palavras.json"):
        self.p = json.load(open(caminho, encoding="utf-8"))
        self.dur = self.p["duracao"]
        self.a = {x["id"]: x for x in self.p["assuntos"]}

    def tok(self, assunto, texto, n=0, campo="ini"):
        achados = [t for t in self.a[assunto]["tokens"] if limpa(t["t"]) == texto.lower()]
        if len(achados) <= n:
            raise SystemExit(f"token '{texto}' não encontrado em '{assunto}'")
        return achados[n][campo]


# --------------------------------------------------------- grade de tempo ---

class Grade:
    """Mapa batida <-> segundo. Âncoras caem exatas; o andamento entre elas
    varia no máximo alguns % para a batida forte bater na palavra."""

    def __init__(self, t0):
        self.anc = [(t0, 0.0)]

    def ancora(self, t):
        t0, b0 = self.anc[-1]
        ideal = (t - t0) / SPB
        n = None
        # prefere fechar em compasso inteiro; só quebra o compasso se o andamento
        # tivesse de mudar demais
        for passo, tol in ((4, 0.055), (2, 0.04), (1, 1.0)):
            n = max(passo, round(ideal / passo) * passo)
            if abs((t - t0) / (n * SPB) - 1) <= tol:
                break
        self.anc.append((t, b0 + n))
        return b0 + n

    def b2t(self, b):
        ts = np.array([a[0] for a in self.anc])
        bs = np.array([a[1] for a in self.anc])
        b = np.asarray(b, dtype=float)
        t = np.interp(b, bs, ts)
        t = np.where(b < bs[0], ts[0] + (b - bs[0]) * SPB, t)
        t = np.where(b > bs[-1], ts[-1] + (b - bs[-1]) * SPB, t)
        return t if t.ndim else float(t)

    def t2b(self, t):
        ts = np.array([a[0] for a in self.anc])
        bs = np.array([a[1] for a in self.anc])
        if t <= ts[0]:
            return bs[0] + (t - ts[0]) / SPB
        if t >= ts[-1]:
            return bs[-1] + (t - ts[-1]) / SPB
        return float(np.interp(t, ts, bs))

    def barra(self, t):
        """Linha de compasso mais próxima de t (contada desde a última âncora)."""
        b = self.t2b(t)
        base = max([a[1] for a in self.anc if a[1] <= b + 1e-6] or [0.0])
        return base + round((b - base) / 4) * 4

    def bpm_em(self, b):
        return 60.0 / (self.b2t(b + 1) - self.b2t(b))


# ------------------------------------------------------------ instrumentos ---

def pad_acorde(notas, dur, rng, brilho=1.0, atk=0.35, rel=1.3):
    """Pad quente: 3 vozes desafinadas por nota, poucos harmônicos."""
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for m in notas:
        f = midi(m)
        for det, p in ((-6.0, -0.65), (0.0, 0.0), (7.0, 0.65)):
            ff = f * 2 ** (det / 1200)
            v = np.zeros(n)
            for h in range(1, 6):
                if ff * h > 4200:
                    break
                v += np.sin(PI2 * ff * h * t + rng.uniform(0, PI2)) / h ** (2.3 - 0.6 * brilho)
            lfo = 1 + 0.07 * np.sin(PI2 * rng.uniform(0.13, 0.31) * t + rng.uniform(0, PI2))
            out += pan(v * lfo, p)
        # camada de "ar": oitava acima, bem aberta no estéreo
        for det, p in ((-9.0, -0.8), (9.0, 0.8)):
            ff = 2 * f * 2 ** (det / 1200)
            v = np.sin(PI2 * ff * t + rng.uniform(0, PI2)) + 0.25 * brilho * np.sin(PI2 * 2 * ff * t)
            lfo = 1 + 0.18 * np.sin(PI2 * rng.uniform(0.2, 0.5) * t + rng.uniform(0, PI2))
            out += pan(v * lfo, p) * 0.30 * brilho
    out *= env_ar(n, atk, rel)[:, None]
    return filtrar(sos_pa(170, 2), out) / (len(notas) * 2.2)


def baixo_nota(m, dur, vel=1.0):
    f = midi(m)
    n = int((dur + 0.09) * SR)
    t = np.arange(n) / SR
    s = np.sin(PI2 * f * t) + 0.46 * np.sin(PI2 * 2 * f * t) + 0.22 * np.sin(PI2 * 3 * f * t) + 0.08 * np.sin(PI2 * 4 * f * t)
    e = (0.72 + 0.28 * np.exp(-t / 0.25)) * env_ar(n, 0.012, 0.085)
    return np.tanh(1.2 * s * e) / 1.2 * vel


def bumbo(vel=1.0, grave=0.0):
    t = tempo(0.34)
    f = (46 - 6 * grave) + 72 * np.exp(-t / 0.028)
    fase = PI2 * np.cumsum(f) / SR
    s = (np.sin(fase) + 0.2 * np.sin(2 * fase)) * np.exp(-t / 0.115)
    s *= 1 - np.exp(-t / 0.0016)
    s[-400:] *= cos_sobe(400)[::-1]
    return s * vel


class Percussao:
    def __init__(self, rng):
        self.rng = rng
        base = ruido(SR * 3, rng)
        self.sh = filtrar(sos_pf(5200, 10500, 2), base)
        self.pl = filtrar(sos_pf(1900, 6200, 2), base)
        self.ch = filtrar(sos_pa(8800, 3), base)

    def _grao(self, fonte, dur, decai, atk=0.004):
        n = int(dur * SR)
        i = int(self.rng.integers(0, len(fonte) - n))
        t = np.arange(n) / SR
        e = np.exp(-t / decai) * (1 - np.exp(-t / atk))
        e[-64:] *= cos_sobe(64)[::-1]
        return fonte[i:i + n] * e

    def shaker(self, vel):
        return self._grao(self.sh, 0.07, 0.016 + 0.01 * vel, 0.005) * vel

    def palma(self, vel):
        s = self._grao(self.pl, 0.12, 0.028, 0.002)
        t = tempo(0.12)
        return (s + 0.25 * np.sin(PI2 * 980 * t) * np.exp(-t / 0.012)) * vel

    def chimbal(self, vel, aberto=False):
        return self._grao(self.ch, 0.22 if aberto else 0.05, 0.085 if aberto else 0.011, 0.002) * vel


def subida(dur, rng, f0=350, f1=7500, curva=2.2):
    """Riser estéreo de ar: termina no fim do array."""
    n = int(dur * SR)
    e = (np.arange(n) / n) ** curva
    e[-int(0.035 * SR):] *= cos_sobe(int(0.035 * SR))[::-1]
    return np.stack([ruido_varrido(dur, f0, f1, rng, curva=1.4) * e,
                     ruido_varrido(dur, f0, f1, rng, curva=1.4) * e], axis=1)


def normaliza(x, pico=1.0):
    m = np.max(np.abs(x))
    return x * (pico / m) if m > 0 else x


# -------------------------------------------------------------- composição ---

def compor():
    nar = Narracao()
    N = int(round(nar.dur * SR))
    rng = np.random.default_rng(SEMENTE)
    perc = Percussao(rng)

    t_fazlo = nar.tok("virada", "FAZLO")
    t_cair = nar.tok("internet", "cair")
    t_nao = nar.tok("internet", "não")
    t_30 = nar.tok("teste", "30")
    t_p1 = nar.tok("preco", "R$ 99,90")
    t_p2 = nar.tok("preco", "R$ 79,90")
    t_fim_voz = nar.a["chamada"]["fim"]
    t_dor = nar.a["dor"]["ini"]

    G = Grade(t_fazlo)
    # seções comuns até o teste (âncora na palavra "30")
    b_teste = G.ancora(t_30)
    b_p1 = G.ancora(t_p1)
    b_p2 = G.ancora(t_p2)
    b_fim = G.ancora(t_fim_voz + 0.45)

    sec = [dict(tipo="virada", b=0.0, var=0)]
    for i, nome in enumerate(DIA):
        sec.append(dict(tipo="dia", b=G.barra(nar.a[nome]["ini"]), var=VAR_DIA[i], nome=nome))
    sec.append(dict(tipo="internet", b=G.barra(nar.a["internet"]["ini"]), var=2, nome="internet"))
    sec.append(dict(tipo="leve", b=G.barra(nar.a["comeca1"]["ini"]), var=0, nome="comeca1"))
    sec.append(dict(tipo="leve", b=G.barra(nar.a["comeca2"]["ini"]), var=1, nome="comeca2"))
    sec.append(dict(tipo="teste", b=b_teste, var=0, nome="teste", ancora=0.75))
    sec.append(dict(tipo="preco_a", b=G.barra(nar.a["preco"]["ini"]), var=0, nome="preco"))
    sec.append(dict(tipo="preco_b", b=b_p1, var=3, nome="R$ 99,90", ancora=0.85))
    sec.append(dict(tipo="preco_c", b=b_p2, var=0, nome="R$ 79,90", ancora=1.0))
    sec.append(dict(tipo="chamada", b=G.barra(nar.a["chamada"]["ini"]), var=0, nome="chamada"))
    sec.append(dict(tipo="final", b=b_fim, var=0, nome="final"))
    # garante ordem crescente (se duas seções caírem na mesma barra, empurra)
    for i in range(1, len(sec)):
        if sec[i]["b"] <= sec[i - 1]["b"]:
            if sec[i].get("ancora"):
                sec[i - 1]["b"] = sec[i]["b"] - 4
            else:
                sec[i]["b"] = sec[i - 1]["b"] + 4
    for i, s in enumerate(sec):
        s["t"] = G.b2t(s["b"])
        s["fim"] = sec[i + 1]["b"] if i + 1 < len(sec) else s["b"] + 8

    bus = {k: np.zeros((N, 2)) for k in ("pad", "baixo", "arp", "bat", "fx")}
    T = G.b2t

    def mudo_bat(t):   # a internet cai: bateria e arpejo somem
        return t_cair - 0.02 <= t < t_nao + 0.05

    # ---------------- 1. A dor: esparso, tenso, sem resolver ----------------
    blocos, b = [], -4.0
    blocos.append((b, 4.0, "F#sus"))
    ciclo, k = ["Em9d", "G#11", "Bm9"], 0
    while T(b) > -0.5:
        b -= 8.0
        blocos.append((b, 8.0, ciclo[k % 3]))
        k += 1
    for b0, nb, nome in blocos:
        t0, t1 = T(b0), T(b0 + nb)
        ac = AC[nome]
        colocar(bus["pad"], pad_acorde(ac["pad"], t1 - t0 + 0.3, rng, brilho=0.55, atk=1.1, rel=1.9),
                t0 - 0.45, db(-20.0))
        nota = baixo_nota(ac["baixo"], t1 - t0 - 0.2, 1.0)
        colocar(bus["baixo"], nota * env_ar(len(nota), 0.6, 0.8), t0, db(-22.0))
    motivo = [[(0.5, 78), (2.75, 73)], [(1.0, 76), (3.0, 71)],
              [(0.5, 74), (2.0, 73), (3.5, 78)], [(1.5, 76)]]
    b_ini_dor = np.ceil(G.t2b(t_dor) / 4) * 4
    for i, b0 in enumerate(np.arange(b_ini_dor, -4.0, 4.0)):
        # batimento surdo, duas batidas por compasso ("coração")
        colocar(bus["bat"], pan(bumbo(0.8, grave=1.0), 0.0), T(b0), db(-21.0))
        colocar(bus["bat"], pan(bumbo(0.55, grave=1.0), 0.0), T(b0 + 0.5), db(-21.0))
        for pos, m in motivo[i % 4]:
            colocar(bus["arp"], pan(mallet(m, 1.5, 0.6), rng.choice([-0.4, 0.4])),
                    T(b0 + pos), db(-19.5) * rng.uniform(0.8, 1.0))

    # ---------------- 2. Virada: subida + impacto exato em "FAZLO" ----------
    d_sub = T(0.0) - T(-3.0)
    colocar(bus["fx"], subida(d_sub, rng), T(-3.0), db(-21.0))
    tsub = tempo(d_sub)
    for m in (54, 61, 66):   # acorde suspenso que cresce junto
        f = midi(m) * (1 + 0.012 * (tsub / d_sub) ** 2)
        tom = np.sin(PI2 * np.cumsum(f) / SR) * (tsub / d_sub) ** 2.4
        tom[-1500:] *= cos_sobe(1500)[::-1]
        colocar(bus["fx"], pan(tom, 0.0), T(-3.0), db(-27.0))

    def acento(t, forca, grande=False, notas=(74, 78, 81)):
        colocar(bus["baixo"], pan(sub_batida(86, 46, 0.42 + 0.2 * forca), 0), t, db(-17.0) * forca)
        for j, m in enumerate(notas + ((86, 88) if grande else ())):
            colocar(bus["fx"], pan(sino(m, 2.6, 0.9), (-0.5, 0.5, 0.0, -0.3, 0.3)[j % 5]),
                    t + 0.006 * j, db(-22.0) * forca)
        n = int(1.4 * SR)
        chuva = filtrar(sos_pa(5200, 2), ruido(n, rng)) * np.exp(-tempo(1.4) / 0.42)
        chuva *= 1 - np.exp(-tempo(1.4) / 0.004)
        colocar(bus["fx"], pan(chuva, 0.0), t, db(-27.0) * forca)

    # impacto da marca
    acento(t_fazlo, 0.9, grande=True, notas=(62, 69, 74))
    for j, m in enumerate((50, 57, 62, 66, 69, 76)):   # "rasgueado" largo de Ré maior
        colocar(bus["arp"], pan(mallet(m, 2.2, 1.1), (-0.5, 0.5)[j % 2]),
                t_fazlo + 0.012 * j, db(-22.0))

    # ---------------- 3. Seções com pulso -----------------------------------
    def tocar_secao(s):
        tipo, var = s["tipo"], s["var"]
        if tipo == "final":
            return
        prog = dict(
            virada=["D9", "D9", "G7M", "Asus"],
            dia=PROG_DIA[var],
            internet=["Bm7", "Em9", "Asus", "Asus"],
            leve=PROG_DIA[var],
            teste=["D9", "G7M", "Asus", "Bm7"],
            preco_a=["Bm7", "Asus"],
            preco_b=["D9", "A/C#", "Bm7", "G7M"],
            preco_c=["D9", "G7M", "Asus", "D9"],
            chamada=["G7M", "Asus"],
        )[tipo]
        brilho = dict(virada=0.9, dia=0.85, internet=0.7, leve=0.8, teste=1.25,
                      preco_a=0.9, preco_b=1.1, preco_c=1.15, chamada=0.95)[tipo]
        nb = int(np.ceil((s["fim"] - s["b"]) / 4))
        for bi in range(nb):
            b0 = s["b"] + 4 * bi
            lim = min(4.0, s["fim"] - b0)          # compasso final pode ser curto
            ac = AC[prog[bi % len(prog)]]
            t0, t1 = T(b0), T(b0 + lim)
            ultimo = bi == nb - 1

            # pad (liga compassos; ataque curto para marcar a troca)
            colocar(bus["pad"], pad_acorde(ac["pad"], t1 - t0, rng, brilho=brilho),
                    t0 - 0.12, db(-20.5))

            # baixo
            pb = dict(
                virada=[(0, 3.7)], internet=[(0, 3.7)], preco_a=[(0, 3.7)],
                leve=[(0, 2.4)],
                dia=[(0, 1.4), (2.5, 0.9)] if bi % 2 == 0 else [(0, 1.4), (1.5, 0.4), (2.5, 0.9)],
                teste=[(0, 1.0), (1.5, 0.45), (2.5, 1.0)],
                preco_b=[(0, .7), (.75, .6), (1.5, .45), (2, .7), (2.75, .6), (3.5, .45)],
                preco_c=[(0, .7), (.75, .6), (1.5, .45), (2, .7), (2.75, .6), (3.5, .45)],
                chamada=[(0, 2.0), (2.5, 1.2)],
            )[tipo]
            for pos, d in pb:
                if pos >= lim:
                    continue
                d = min(d, lim - pos)
                tt = T(b0 + pos)
                colocar(bus["baixo"], baixo_nota(ac["baixo"], (T(b0 + pos + d) - tt) * 0.96,
                                                 1.0 if pos == 0 else 0.8), tt, db(-20.5))

            # arpejo
            if tipo == "virada":
                pa = None if bi == 0 else (dict(pos=[0, 1, 2, 3], idx=[0, 2, 3, 4]) if bi == 1 else ARP[0])
                g_arp = -21.0 if bi == 1 else -19.5
            elif tipo in ("leve", "chamada"):
                pa, g_arp = ARP_LEVE[(var + bi) % 2], -18.5
            elif tipo == "preco_a":
                pa, g_arp = ARP[1], -20.5 + 1.5 * bi
            elif tipo == "internet":
                pa, g_arp = ARP[2], -19.5
            else:
                pa, g_arp = ARP[(var + (bi // 2)) % 4 if tipo == "dia" else var], -18.5
            if pa:
                for j, (pos, ix) in enumerate(zip(pa["pos"], pa["idx"])):
                    if pos >= lim:
                        continue
                    tt = T(b0 + pos)
                    if mudo_bat(tt):
                        continue
                    m = ac["arp"][ix % len(ac["arp"])]
                    if tipo in ("teste", "preco_c") and j % 2 == 1:
                        m += 12                     # brilho: oitava acima alternada
                    vel = (0.95 if pos % 1 == 0 else 0.72) * rng.uniform(0.88, 1.0)
                    colocar(bus["arp"], pan(mallet(m, 0.95, 0.85 * brilho), (-0.38, 0.38)[j % 2]),
                            tt + rng.uniform(-0.004, 0.004), db(g_arp) * vel)

            # bateria
            kk = dict(dia=[(0, 1.0), (2, 0.85)] + ([(3.5, 0.5)] if bi % 2 else []),
                      internet=[(0, 1.0), (2, 0.85)],
                      leve=[(0, 0.8)],
                      teste=[(0, 1.0), (2, 0.9), (3.5, 0.5)],
                      preco_b=[(0, 1.0), (1.5, 0.6), (2, 0.9), (3.5, 0.5)],
                      preco_c=[(0, 1.0), (1.5, 0.6), (2, 0.9), (3.5, 0.5)],
                      chamada=[(0, 0.9), (2, 0.7)]).get(tipo, [])
            for pos, vel in kk:
                tt = T(b0 + pos)
                if pos >= lim or mudo_bat(tt) or (ultimo and pos >= lim - 1.0 and pos > 0):
                    continue                        # respiro antes da próxima seção
                colocar(bus["bat"], pan(bumbo(vel), 0.0), tt, db(-17.0))
            pl = dict(dia=[(1, 0.8), (3, 1.0)], teste=[(1, 0.9), (3, 1.0)],
                      preco_b=[(1, 0.9), (3, 1.0)], preco_c=[(1, 0.9), (3, 1.0)],
                      chamada=[(1, 0.6), (3, 0.7)], leve=[(3, 0.5)],
                      internet=[(1, 0.8), (3, 1.0)]).get(tipo, [])
            for pos, vel in pl:
                tt = T(b0 + pos)
                if pos >= lim or mudo_bat(tt):
                    continue
                colocar(bus["bat"], pan(perc.palma(vel), 0.12), tt, db(-26.0))
            # shaker
            if tipo == "leve" or tipo == "chamada":
                passos = [(p, v) for p, v in zip(np.arange(0, 4, 0.5), [0.7, 0.4] * 4)]
            elif tipo == "virada":
                passos = [] if bi < 2 else [(p, 0.5) for p in np.arange(0, 4, 0.5)]
            elif tipo == "preco_a":
                passos = [(p, 0.3 + 0.5 * (bi * 4 + p) / 8) for p in np.arange(0, 4, 0.25)]
            else:
                passos = [(p, [0.95, 0.32, 0.62, 0.36][i % 4]) for i, p in enumerate(np.arange(0, 4, 0.25))]
            for pos, vel in passos:
                tt = T(b0 + pos)
                if pos >= lim or mudo_bat(tt):
                    continue
                colocar(bus["bat"], pan(perc.shaker(vel * rng.uniform(0.85, 1.0)), -0.25),
                        tt + rng.uniform(-0.003, 0.003), db(-25.5))
            if tipo in ("teste", "preco_b", "preco_c"):
                for pos in (0.5, 1.5, 2.5, 3.5):
                    if pos < lim:
                        ab = pos == 3.5 and bi % 2 == 1
                        colocar(bus["bat"], pan(perc.chimbal(0.8, ab), 0.3), T(b0 + pos), db(-29.0))
            if tipo == "teste":   # brilho no começo de cada compasso
                colocar(bus["fx"], pan(sino((86, 81, 88, 83)[bi % 4], 1.8, 0.7), (-0.4, 0.4)[bi % 2]),
                        t0, db(-24.0))

    for s in sec:
        tocar_secao(s)

    # respiro + subidinha antes de cada troca de seção; acentos nas âncoras
    for s in sec[1:]:
        forca = s.get("ancora")
        if forca:
            nbt = 2.5 if forca >= 1.0 else 1.5
            d = T(s["b"]) - T(s["b"] - nbt)
            colocar(bus["fx"], subida(d, rng, 500, 8000), T(s["b"] - nbt), db(-26.0 + 3.0 * forca))
            acento(s["t"], forca, grande=forca >= 1.0)
        elif s["tipo"] != "final":
            d = T(s["b"]) - T(s["b"] - 1.0)
            colocar(bus["fx"], subida(d, rng, 600, 5000, curva=2.6), T(s["b"] - 1.0), db(-31.0))

    # a internet volta: sobe o ar até a batida seguinte a "não"
    b_volta = np.ceil(G.t2b(t_nao) + 0.25)
    d = T(b_volta) - t_nao
    colocar(bus["fx"], subida(max(0.3, d), rng, 400, 6000), T(b_volta) - max(0.3, d), db(-27.0))

    # ---------------- 4. Final: acorde que resolve e some sozinho -----------
    t_final = G.b2t(b_fim)
    cauda = max(1.0, nar.dur - t_final)
    colocar(bus["pad"], pad_acorde(AC["D9"]["pad"] + [50], min(1.3, cauda * 0.3), rng, brilho=1.0,
                                   atk=0.12, rel=min(2.6, cauda * 0.55)), t_final - 0.05, db(-18.0))
    colocar(bus["baixo"], pan(sub_batida(86, 44, 0.6), 0), t_final, db(-17.0))
    nota = baixo_nota(38, min(1.6, cauda * 0.35), 1.0)
    colocar(bus["baixo"], nota * env_ar(len(nota), 0.01, min(1.2, cauda * 0.25)), t_final, db(-19.0))
    for j, m in enumerate((62, 69, 74, 78, 81, 88)):
        colocar(bus["arp"], pan(mallet(m, 2.0, 1.0), (-0.45, 0.45)[j % 2]), t_final + 0.055 * j, db(-19.5))
    for j, m in enumerate((74, 81, 86)):
        colocar(bus["fx"], pan(sino(m, 2.4, 0.8), (-0.4, 0.0, 0.4)[j]), t_final + 0.01 * j, db(-21.5))

    # ---------------- 5. Mixagem interna ------------------------------------
    # eco em pingue-pongue no arpejo (colcheia pontuada)
    d_eco = int(0.75 * SPB * SR)
    arp = bus["arp"].copy()
    for k, g in ((1, 0.30), (2, 0.13), (3, 0.05)):
        des = np.zeros_like(arp)
        des[k * d_eco:] = bus["arp"][: N - k * d_eco]
        arp += (des[:, ::-1] if k % 2 else des) * g

    envio = 0.34 * bus["pad"] + 0.50 * arp + 0.55 * bus["fx"] + 0.05 * bus["bat"]
    molhado = reverberar(envio, ir_reverb(1.9, seed=SEMENTE))
    m = bus["pad"] + bus["baixo"] + arp + bus["bat"] + bus["fx"] + 0.55 * molhado

    # a internet cai: fecha o filtro em "cair", reabre em "não"
    t = np.arange(N) / SR

    def rampa(t0, t1):
        return np.clip((t - t0) / (t1 - t0), 0, 1)

    def suave(x):
        return 0.5 - 0.5 * np.cos(np.pi * x)

    a, b = max(0, int((t_cair - 1.0) * SR)), min(N, int((t_nao + 2.0) * SR))
    m1 = (suave(rampa(t_cair, t_cair + 0.40)) * (1 - suave(rampa(t_nao + 0.15, t_nao + 0.75))))[a:b, None]
    m2 = (suave(rampa(t_cair + 0.25, t_cair + 0.95)) * (1 - suave(rampa(t_nao - 0.10, t_nao + 0.40))))[a:b, None]
    seg = m[a:b]
    lp1, lp2 = filtrar0(sos_pb(1500, 2), seg), filtrar0(sos_pb(420, 2), seg)
    m[a:b] = (seg * (1 - m1) + (lp1 * (1 - m2) + lp2 * m2) * m1) * (1 - 0.45 * m2)

    # limpeza: sub-grave fora, leve recuo na faixa de presença da voz
    m = filtrar0(sos_pa(30, 2), m)
    presenca = filtrar0(sos_pf(1100, 3400, 1), m)
    m = m - 0.24 * presenca                      # ≈ −2,4 dB em torno de 2 kHz
    m = filtrar0(sos_pb(15000, 2), m)

    # entrada (swell) e fim em silêncio
    m *= suave(rampa(0.0, max(0.3, t_dor * 0.9)))[:, None] ** 1.5
    m *= (1 - suave(rampa(nar.dur - 1.3, nar.dur - 0.30)))[:, None]

    import pyloudnorm as pyln
    lufs = pyln.Meter(SR).integrated_loudness(m)
    m *= db(ALVO_LUFS - lufs)
    pico = np.max(np.abs(m))
    if pico > db(-3.0):                           # teto macio, só se precisar
        lim = db(-3.0)
        acima = np.abs(m) > lim * 0.8
        m[acima] = np.sign(m[acima]) * (lim * 0.8 + lim * 0.2 * np.tanh((np.abs(m[acima]) - lim * 0.8) / (lim * 0.2)))

    info = dict(bpm=BPM, tom="Ré maior (dor em Si menor)", duracao=nar.dur,
                ancoras=[dict(t=round(a[0], 3), batida=a[1]) for a in G.anc],
                andamentos=[round(G.bpm_em(a[1] + 0.5), 2) for a in G.anc[:-1]],
                secoes=[dict(tipo=s["tipo"], nome=s.get("nome", s["tipo"]), batida=s["b"],
                             t=round(float(s["t"]), 3)) for s in sec],
                t_impacto_fazlo=t_fazlo, t_cair=t_cair, t_nao=t_nao, t_final=round(float(t_final), 3))
    return m, bus, info


def main():
    os.makedirs("audio", exist_ok=True)
    m, bus, info = compor()
    escrever_wav("audio/trilha.wav", m)
    json.dump(info, open("audio/trilha.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    import pyloudnorm as pyln
    print(f"audio/trilha.wav  {len(m) / SR:.2f} s  "
          f"{pyln.Meter(SR).integrated_loudness(m):.2f} LUFS  pico {para_db(np.max(np.abs(m))):.2f} dBFS  "
          f"pico real {pico_real_db(m):.2f} dBTP  DC {np.mean(m):+.6f}")
    print("âncoras:", info["ancoras"], "andamentos (BPM):", info["andamentos"])
    for s in info["secoes"]:
        print(f"  {s['t']:8.2f} s  batida {s['batida']:6.1f}  {s['tipo']:9s} {s['nome']}")
    ult = m[-int(0.25 * SR):]
    print("últimos 250 ms (dBFS):", round(float(para_db(np.max(np.abs(ult)))), 1))


if __name__ == "__main__":
    main()
