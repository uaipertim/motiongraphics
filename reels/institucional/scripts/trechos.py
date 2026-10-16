#!/usr/bin/env python3
"""
Prepara os trechos da narração, cada um uma frase inteira, para entrar junto do recorte de que fala.

    python3 scripts/trechos.py   -> audio/voz/trechos/<id>.wav + src/voz-trechos.json + output/revisao/trechos.txt

Regra: nenhuma fala é cortada no meio de uma frase.
- Cenas 3 a 6: cada frase já vem de uma chamada própria (scripts/voz.py) e entra inteira, com o final
  natural de frase.
- Cenas 7 e 8: a fala foi gerada com pausas (<break>) entre as frases; o corte cai no ponto mais baixo
  dessa pausa, depois do ponto final, e a conferência exige que esse ponto seja silêncio (≤ −45 dB do pico).
- Cenas 1 e 2: a fala inteira.
Toda emenda tem fade de 30 ms na entrada e na saída (nada de corte seco); a cauda natural da voz
(até 300 ms depois da última palavra) é mantida antes do fade.

A voz não é regravada nem acelerada; o tempo a mais do vídeo fica nas pausas entre os trechos.
src/voz-trechos.json traz a duração de cada trecho, e o motor (src/anim.js) monta a linha do tempo
a partir dela.
"""
import json
import os
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOZ = os.path.join(ROOT, 'audio', 'voz')
OUT = os.path.join(VOZ, 'trechos')
FADE = 0.03            # s, na entrada e na saída de cada trecho
TAIL = 0.30            # s de cauda depois da última palavra
SILENCIO_DB = -45.0    # o ponto de corte entre frases tem de estar abaixo disto (relativo ao pico)

# falas geradas com várias frases (cenas 7 e 8): ids dos trechos e a palavra que FECHA cada frase
CORTES = {
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
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    lista, L = [], ['Trechos da narração (cada um uma frase inteira; fade de 30 ms em toda emenda)', '']
    for f in D['falas']:
        sr, x = wavfile.read(os.path.join(VOZ, f'cena-{f["id"]}.wav'))
        x = x.astype(np.float64) / 32768
        rms = np.sqrt(np.maximum(uniform_filter1d(x ** 2, int(0.01 * sr)), 0))
        ref = 20 * np.log10(rms.max() + 1e-12)
        W = words(f['alinhamento'])
        texto = f['fala'].split()                      # a grafia do roteiro (o alinhamento tem a enviada)
        assert len(texto) == len(W), (f['id'], texto, [w for w, _, _ in W])
        ids, fim_frase = CORTES.get(f['id'], ([str(f['id'])], []))
        bounds, k = [], 0
        for i, (w, a, b) in enumerate(W[:-1]):
            if k < len(fim_frase) and texto[i] == fim_frase[k]:
                assert texto[i][-1] in '.?!', ('corte fora do fim de frase', f['id'], texto[i])
                i0, i1 = int(b * sr), int(W[i + 1][1] * sr)
                cut = i0 + int(np.argmin(rms[i0:i1]))
                nivel = 20 * np.log10(rms[cut] + 1e-12) - ref
                assert nivel <= SILENCIO_DB, ('o corte não cai em silêncio', f['id'], round(nivel, 1))
                bounds.append((cut, i + 1, nivel))
                k += 1
        assert k == len(fim_frase), (f['id'], fim_frase)
        edges = [(0, 0, None)] + bounds + [(len(x), len(W), None)]
        fade = int(FADE * sr)
        for j, tid in enumerate(ids):
            (c0, w0, _), (c1, w1, nv) = edges[j], edges[j + 1]
            s0 = max(c0, int((W[w0][1] - 0.05) * sr))
            s1 = min(c1, len(x), int((W[w1 - 1][2] + TAIL) * sr))
            y = x[s0:s1].copy()
            y[:fade] *= np.sin(np.linspace(0, np.pi / 2, fade)) ** 2
            y[-fade:] *= np.cos(np.linspace(0, np.pi / 2, fade)) ** 2
            wavfile.write(os.path.join(OUT, f'{tid}.wav'), sr, np.round(np.clip(y, -1, 1) * 32767).astype(np.int16))
            frase = ' '.join(texto[w0:w1])
            lista.append({'id': tid, 'fala': f.get('cena_id', f['id']), 'texto': frase, 'dur': round(len(y) / sr, 3),
                          'voz': round(W[w1 - 1][2] - W[w0][1], 3)})
            corte = f' · corte depois de "{texto[w1 - 1]}" a {nv:.0f} dB (silêncio)' if nv is not None else ''
            L.append(f'  {tid:3s} {len(y) / sr:5.2f} s  "{frase}"{corte}')
    json.dump({'nota': 'gerado por scripts/trechos.py a partir de audio/voz/falas.json', 'trechos': lista},
              open(os.path.join(ROOT, 'src', 'voz-trechos.json'), 'w'), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(ROOT, 'output', 'revisao'), exist_ok=True)
    open(os.path.join(ROOT, 'output', 'revisao', 'trechos.txt'), 'w').write('\n'.join(L) + '\n')
    print('\n'.join(L))


if __name__ == '__main__':
    main()
