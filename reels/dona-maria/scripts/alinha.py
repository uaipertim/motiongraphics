#!/usr/bin/env python3
"""
Alinhamento das palavras de cada clipe (sem transcrição: a chave do ElevenLabs não tem permissão de speech-to-text nem
de forced-alignment).

    python3 scripts/alinha.py   -> audio/palavras.json (tempos de cada palavra, no tempo LOCAL de cada clipe, já sem o
                                   silêncio cortado do início)

1. Trechos de fala: energia acima de −40 dBFS, pausas ≥ 0,15 s.
2. As palavras do texto são divididas entre os trechos escolhendo os cortes que deixam o ritmo (letras/s) mais
   parecido entre eles; cortar fora da pontuação custa caro (só quando o número de pausas exige).
3. Dentro de cada trecho, cada fronteira entre palavras vai para o vale de energia mais próximo (±80 ms) da divisão
   pelo número de letras.
Precisão: os inícios de trecho são medidos no áudio (±10 ms); no meio de um trecho, ±0,1 s.
"""
import itertools, json, math, os, re, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
letras = lambda s: len(re.sub(r'[^0-9A-Za-zÀ-ÿ]', '', s))


def envelope(path, ini):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(ini), '-i', path, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(float) / 32768
    e = 20 * np.log10(np.sqrt(np.convolve(x ** 2, np.ones(240) / 240, 'same'))[::80] + 1e-9)   # passo de 5 ms
    return e, len(x) / 16000


def trechos(e):
    on = e > -40; segs, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]: j += 1
            segs.append([i * 0.005, j * 0.005]); i = j
        else: i += 1
    out = []
    for a, b in segs:
        if out and a - out[-1][1] < 0.15: out[-1][1] = b
        else: out.append([a, b])
    return [s for s in out if s[1] - s[0] > 0.06]


def alinha(clipe):
    e, dur = envelope(os.path.join(ROOT, clipe['arquivo']), clipe['corte_inicio'])
    segs, ws = trechos(e), clipe['texto'].split()
    L = [letras(w) for w in ws]; n, ns = len(ws), len(segs)
    melhor = None
    for cortes in itertools.combinations(range(n - 1), ns - 1):
        b = [-1, *cortes, n - 1]
        rates = [math.log(sum(L[b[k] + 1:b[k + 1] + 1]) / (segs[k][1] - segs[k][0])) for k in range(ns)]
        m = sum(rates) / ns
        custo = sum((r - m) ** 2 for r in rates) + sum(0.0 if re.search(r'[,.!?:]$', ws[c]) else 1.0 for c in cortes)
        if melhor is None or custo < melhor[0]: melhor = (custo, b)
    b = melhor[1]; out = []
    for k, (a, z) in enumerate(segs):
        grupo = list(range(b[k] + 1, b[k + 1] + 1)); tot = sum(L[i] for i in grupo)
        fr = [a]; acc = 0
        for i in grupo[:-1]:                                   # fronteiras internas: no vale de energia mais próximo
            acc += L[i]; t = a + (z - a) * acc / tot
            resto = len(grupo) - len(fr)                        # palavras que ainda precisam caber até o fim do trecho
            lo, hi = max(t - 0.08, fr[-1] + 0.06), min(t + 0.08, z - 0.06 * resto)   # ≥ 60 ms por palavra, em ordem
            if hi <= lo: fr.append(round(min(max(t, fr[-1] + 0.06), z - 0.06 * resto), 3)); continue
            j0, j1 = int(lo / 0.005), max(int(lo / 0.005) + 1, int(hi / 0.005))
            fr.append(round((j0 + int(np.argmin(e[j0:j1]))) * 0.005, 3))
        fr.append(z)
        for gi, i in enumerate(grupo):
            out.append({'w': ws[i], 't0': round(fr[gi], 3), 't1': round(fr[gi + 1], 3), 'trecho': k})
    return {'id': clipe['id'], 'duracao_audio': round(dur, 3), 'trechos': [[round(a, 3), round(z, 3)] for a, z in segs], 'palavras': out}


res = [alinha(c) for c in R['clipes']]
json.dump(res, open(os.path.join(ROOT, 'audio', 'palavras.json'), 'w'), ensure_ascii=False, indent=1)
for r in res:
    print(f"{r['id']} ({r['duracao_audio']} s, {len(r['trechos'])} trechos)")
    k = -1
    for w in r['palavras']:
        if w['trecho'] != k: k = w['trecho']; print(f"\n  [{r['trechos'][k][0]:.2f}–{r['trechos'][k][1]:.2f}]", end='')
        print(f" {w['w']}@{w['t0']:.2f}", end='')
    print()
