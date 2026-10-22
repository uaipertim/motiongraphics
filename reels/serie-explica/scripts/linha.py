#!/usr/bin/env python3
"""
A linha do tempo de um episódio da SÉRIE EXPLICA: junta a narração (audio/<id>/voz/, uma geração por capítulo) e o
roteiro (episodios/<id>.json).

    python3 scripts/linha.py explica-01   -> audio/explica-01/linha.json  (capítulos, frases, palavras e linhas de apoio no tempo do vídeo)
                                             audio/explica-01/voz.wav     (a narração montada, 48 kHz mono)

Tempo de cada capítulo:
  • o capítulo começa em t0 (o capítulo 00 começa no quadro 0, já com o gancho escrito);
  • a voz entra `inicio` s depois (padrão 0,25 s; no capítulo 00, 0,10 s: o gancho é falado desde o começo);
  • o capítulo dura até o fim da voz + `segura` (padrão 0,45 s), com mínimo `min` (o fecho tem 8 s);
  • a troca para o próximo capítulo (a passagem limão com a sineta, e a notinha avançando uma linha) dura TR = 0,5 s.
Linha de apoio: uma por frase (o "apoio" de cada frase no JSON; null = nenhuma), entrando junto com a frase, mas nunca
antes de a anterior ter ficado 1,5 s inteira na tela (entrada de 0,34 s + 1,5 s + folga = 1,92 s entre trocas). A última
fica ao menos 1,92 s antes da troca de capítulo.
Voz: o áudio de cada capítulo entra INTEIRO e contínuo (só se tira o silêncio antes da 1ª letra e depois da última, com
fades de 8 ms / 60 ms nas pontas). Nada é cortado ou emendado dentro de um capítulo; a colocação de cada um fica
registrada em linha.json ("colocacao") para a revisão conferir.
"""
import json
import os
import re
import sys
import unicodedata
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else 'explica-01'
AUD = os.path.join(ROOT, 'audio', EP)
SCRIPT = json.load(open(os.path.join(ROOT, 'episodios', EP + '.json')))
FALAS = json.load(open(os.path.join(AUD, 'voz', 'falas.json')))['capitulos']
SR_IN, SR = 44100, 48000
TR = 0.5                      # a troca de capítulo (passagem limão + sineta)
AP_ENTRA = 0.34               # a linha de apoio entra em 0,34 s (a anterior sai antes: as duas nunca se sobrepõem)
AP_LEITURA = 1.5              # e fica ao menos 1,5 s inteira na tela
AP_PASSO = AP_ENTRA + AP_LEITURA + 0.08
PRE, POS = 0.04, 0.30         # o que fica do áudio antes da 1ª letra e depois da última


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return re.sub(r'[^a-z0-9]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))


def letras(al):
    """lista (índice, caractere, início, fim) do alinhamento"""
    return list(zip(range(len(al['characters'])), al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']))


def palavras(al, desloc):
    out, cur = [], None
    for i, c, a, b in letras(al):
        if c.isspace():
            if cur:
                out.append(cur); cur = None
            continue
        if cur is None:
            cur = {'w': '', 'i0': i, 't0': a, 't1': b}
        cur['w'] += c
        if c.isalnum():
            cur['t1'] = b
    if cur:
        out.append(cur)
    out = [w for w in out if norm(w['w'])]
    for w in out:
        w['n'] = norm(w['w']); w['t0'] = round(w['t0'] + desloc, 4); w['t1'] = round(w['t1'] + desloc, 4)
    return out


def main():
    caps, t = [], 0.0
    pistas = []
    for n, c in enumerate(SCRIPT['capitulos']):
        F = FALAS[f'{n:02d}']
        texto = ' '.join(f['texto'] for f in c['fala'])
        assert F['texto'] == texto, f'capítulo {n:02d}: o texto mudou desde a narração; rode scripts/voz.py {EP}'
        al = F['alinhamento']
        ini, fim = F['inicio_da_fala'], F['fim_da_fala']
        t0 = t
        v0 = t0 + c.get('inicio', 0.10 if n == 0 else 0.25)
        desloc = v0 - ini                               # tempo do arquivo -> tempo do vídeo
        v1 = fim + desloc
        ws = palavras(al, desloc)
        # as frases: o trecho de caracteres de cada uma no texto do capítulo
        frases, pos = [], 0
        L = letras(al)
        for f in c['fala']:
            a, b = pos, pos + len(f['texto'])
            alfa = [x for x in L[a:b] if x[1].isalnum()]
            frases.append({'texto': f['texto'], 'apoio': f.get('apoio'), 't0': round(alfa[0][2] + desloc, 4), 't1': round(alfa[-1][3] + desloc, 4)})
            pos = b + 1
        # as linhas de apoio
        apoios, ult = [], None
        for f in frases:
            if not f['apoio'] or (apoios and apoios[-1]['texto'] == f['apoio']):
                continue
            ta = max(f['t0'] - 0.12, t0 + 0.30, (apoios[-1]['t'] + AP_PASSO) if apoios else -9)
            apoios.append({'t': round(ta, 4), 'texto': f['apoio']})
        t1 = max(v1 + c.get('segura', 0.45), t0 + c.get('min', 0), (apoios[-1]['t'] + AP_PASSO) if apoios else 0)
        for i, a in enumerate(apoios):
            a['ate'] = round(apoios[i + 1]['t'] if i + 1 < len(apoios) else t1 + TR, 4)
        caps.append({'n': n, 'rotulo': c.get('rotulo'), 'tom': c.get('tom', ['limao', 'ambar', 'petroleo', 'roxo'][n % 4]),
                     'titulo': c['titulo'], 'risca_titulo': c.get('risca_titulo'), 'diagrama': c['diagrama'],
                     't0': round(t0, 4), 't1': round(t1, 4), 'voz_t0': round(v0, 4), 'voz_t1': round(v1, 4),
                     'palavras': ws, 'frases': frases, 'apoios': apoios})
        pistas.append((n, ini, fim, desloc))
        t = t1 + TR if n + 1 < len(SCRIPT['capitulos']) else t1
    dur = t
    # a narração montada: cada capítulo inteiro, contínuo
    x = np.zeros(int(round(dur * SR)) + SR)
    coloc = []
    for n, ini, fim, desloc in pistas:
        sr, y = wavfile.read(os.path.join(AUD, 'voz', f'cap-{n:02d}.wav'))
        y = y.astype(np.float64) / 32768
        a, b = max(0.0, ini - PRE), min(len(y) / sr, fim + POS)
        seg = resample_poly(y[int(round(a * sr)):int(round(b * sr))], SR, sr)
        k0, k1 = int(0.008 * SR), int(0.06 * SR)
        seg[:k0] *= np.linspace(0, 1, k0); seg[-k1:] *= np.linspace(1, 0, k1)
        i = int(round((a + desloc) * SR))
        x[i:i + len(seg)] += seg
        coloc.append({'cap': n, 'arquivo': f'voz/cap-{n:02d}.wav', 'de_s': round(a, 4), 'ate_s': round(b, 4), 'no_video_s': round(a + desloc, 4),
                      'amostras': len(seg), 'fade_ms': [8, 60]})
    x = x[: int(round(dur * SR))]
    wavfile.write(os.path.join(AUD, 'voz.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
    json.dump({'episodio': EP, 'titulo': SCRIPT['titulo'], 'marca': SCRIPT.get('marca', '@fazlohospeda'), 'duracao': round(dur, 4), 'tr': TR,
               'ap_entra': AP_ENTRA, 'ap_leitura': AP_LEITURA, 'capitulos': caps, 'colocacao': coloc},
              open(os.path.join(AUD, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'{EP}: {len(caps)} capítulos, {dur:.2f} s (60–90 s)')
    for c in caps:
        print(f'  {c["n"]:02d} {str(c["rotulo"]):22s} {c["t0"]:6.2f}–{c["t1"]:6.2f} s ({c["t1"] - c["t0"]:.2f} s) · voz {c["voz_t0"]:.2f}–{c["voz_t1"]:.2f} · {len(c["apoios"])} apoio(s)')


if __name__ == '__main__':
    main()
