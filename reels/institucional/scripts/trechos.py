#!/usr/bin/env python3
"""
Divide as falas da narração em trechos, para cada trecho entrar junto do recorte que ele descreve.

    python3 scripts/trechos.py   -> audio/voz/trechos/<id>.wav + src/voz-trechos.json

A voz não é regravada nem acelerada: cada fala de audio/voz/cena-N.wav (scripts/voz.py) é cortada
no silêncio entre duas palavras (o ponto mais baixo da pausa, com transição de 10 ms). O tempo a mais
do vídeo fica nas pausas entre os trechos. src/voz-trechos.json traz a duração de cada trecho e o motor
(src/anim.js) monta a linha do tempo a partir dela: cada recorte fica parado pelo menos 3 s e pelo menos
o tempo do trecho de voz que fala dele.
"""
import json
import os
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOZ = os.path.join(ROOT, 'audio', 'voz')
OUT = os.path.join(VOZ, 'trechos')

# fala -> (ids dos trechos, palavras depois das quais a fala é cortada)
TRECHOS = {
    1: (['1'], []),
    2: (['2'], []),
    3: (['3a', '3b', '3c'], ['calendário,', 'passos']),
    4: (['4a', '4b'], ['pagamento']),
    5: (['5a', '5b'], ['consome']),
    6: (['6a', '6b'], ['caixa,']),
    7: (['7a', '7b'], ['recibo.']),
    8: (['8a', '8b', '8c'], ['Hospeda.', 'computador.']),
}


def words(al):
    """palavras da fala com o início da primeira letra e o fim da última (sem as marcas <break>)"""
    out, w, a, b = [], '', None, None
    for c, s, e in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if not c.strip():
            if w:
                out.append((w, a, b))
            w, a, b = '', None, None
            continue
        if a is None and c.isalnum():
            a = s
        if c.isalnum():
            b = e
        w += c
    if w:
        out.append((w, a, b))
    return [(w, a, b) for w, a, b in out if a is not None and not w.startswith(('<', 'time=', '/>'))]


def main():
    D = json.load(open(os.path.join(VOZ, 'falas.json')))
    os.makedirs(OUT, exist_ok=True)
    lista = []
    for f in D['falas']:
        ids, cuts = TRECHOS[f['id']]
        sr, x = wavfile.read(os.path.join(VOZ, f'cena-{f["id"]}.wav'))
        x = x.astype(np.float64) / 32768
        rms = np.sqrt(np.maximum(uniform_filter1d(x ** 2, int(0.01 * sr)), 0))
        W = words(f['alinhamento'])
        # a fala do roteiro tem a grafia original (ex.: "Hospeda"); o alinhamento, a enviada (ex.: "Ospéda")
        texto = f['fala'].split()
        assert len(texto) == len(W), (f['id'], texto, [w for w, _, _ in W])
        bounds, k = [], 0
        for i, (w, a, b) in enumerate(W[:-1]):
            if k < len(cuts) and texto[i] == cuts[k]:
                p0, p1 = b, W[i + 1][1]
                i0, i1 = int(p0 * sr), max(int(p1 * sr), int(p0 * sr) + 1)
                cut = i0 + int(np.argmin(rms[i0:i1])) if i1 - i0 > int(0.02 * sr) else (i0 + i1) // 2
                bounds.append((cut, i + 1))
                k += 1
        assert k == len(cuts), (f['id'], cuts)
        edges = [(0, 0)] + bounds + [(len(x), len(W))]
        fade = int(0.01 * sr)
        for j, tid in enumerate(ids):
            (c0, w0), (c1, w1) = edges[j], edges[j + 1]
            s0 = max(c0, int((W[w0][1] - 0.04) * sr))                      # começa 40 ms antes da 1ª palavra
            s1 = min(c1, int((W[w1 - 1][2] + 0.18) * sr))                  # e deixa 180 ms de cauda
            y = x[s0:s1].copy()
            y[:fade] *= np.linspace(0, 1, fade)
            y[-fade:] *= np.linspace(1, 0, fade)
            wavfile.write(os.path.join(OUT, f'{tid}.wav'), sr, np.round(np.clip(y, -1, 1) * 32767).astype(np.int16))
            lista.append({'id': tid, 'fala': f['id'], 'texto': ' '.join(texto[w0:w1]), 'dur': round(len(y) / sr, 3),
                          'voz': round(W[w1 - 1][2] - W[w0][1], 3)})
            print(f'  {tid:3s} {len(y) / sr:5.2f} s  "{" ".join(texto[w0:w1])}"')
    json.dump({'nota': 'gerado por scripts/trechos.py a partir de audio/voz/falas.json', 'trechos': lista},
              open(os.path.join(ROOT, 'src', 'voz-trechos.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
