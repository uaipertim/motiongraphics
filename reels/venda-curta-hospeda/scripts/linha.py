#!/usr/bin/env python3
"""
Montagem da locução e linha do tempo do vídeo curto.

    python3 scripts/linha.py [--sem-trocas]   -> audio/voz-montada.wav + linha.json

Cada frase vem da sua tomada: a narração inteira de 19/11 (audio/voz.wav + audio/falas.json) ou, nas frases com
"tomada" no roteiro (revisão de 23/11: canais1, canais2, canais3), a tomada própria (audio/trocas/<id>.wav + .json).
Nada é acelerado nem cortado dentro da fala. Entre uma frase e a seguinte fica a "pausa" do roteiro, feita do silêncio
das próprias tomadas (abaixo de −45 dB): a primeira metade é o silêncio depois da frase, a segunda é o silêncio antes da
seguinte, com fades de 10 ms (como antes: o corte cai no meio do silêncio). A voz entra 0,30 s depois do quadro 0; depois
da última palavra vêm 3,6 s do fecho.
--sem-trocas: monta só com a tomada de 19/11 (deve reproduzir o áudio aprovado; serve de conferência).
"""
import json, os, sys
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
INI, FIM, LIM, FADE = 0.30, 3.4, -45.0, 0.010   # 3,4 s de fecho: a chamada final fica ~3 s na tela
SEM_TROCAS = '--sem-trocas' in sys.argv


def ler(caminho):
    sr, y = wavfile.read(caminho); y = y.astype(np.float64) / 32768
    return sr, (y.mean(axis=1) if y.ndim > 1 else y)


def env_db(y, sr): return 20 * np.log10(np.sqrt(uniform_filter1d(y ** 2, int(0.01 * sr)) + 1e-12))


def silencio(env, sr, t_a, t_b):
    """[s0, s1] (s) abaixo de −45 dB entre t_a e t_b; se não houver, o meio do intervalo"""
    i0, i1 = int(t_a * sr), int(t_b * sr)
    q = np.nonzero(env[i0:i1] < LIM)[0]
    if len(q) == 0: m = (t_a + t_b) / 2; return m, m
    return t_a + q[0] / sr, t_a + q[-1] / sr


PAUSA_INTERNA = {',': 0.22, '.': 0.30, '?': 0.30}                 # silêncio máximo dentro das frases novas


def encurta(y, pal, env, sr):
    """Nas tomadas novas: depois de vírgula ou ponto, o silêncio entre as palavras fica com no máximo PAUSA_INTERNA.
    Só se tira silêncio de verdade (abaixo de −45 dB), sempre do meio dele; nenhuma palavra é cortada nem acelerada."""
    cortes = []
    for a, b in zip(pal, pal[1:]):
        lim = PAUSA_INTERNA.get(a['w'][-1]); gap = b['t0'] - a['t1']
        if not lim or gap <= lim: continue
        i0, i1 = int(a['t1'] * sr), int(b['t0'] * sr); q = np.nonzero(env[i0:i1] < LIM)[0]
        if len(q) == 0: continue
        s0, s1 = a['t1'] + q[0] / sr, a['t1'] + q[-1] / sr
        tirar = min(gap - lim, s1 - s0 - 0.04)
        if tirar > 0.02: m = (s0 + s1) / 2; cortes.append((m - tirar / 2, m + tirar / 2))
    if not cortes: return y, pal
    nf, partes, pos = int(0.005 * sr), [], 0
    for c0, c1 in cortes:
        i0, i1 = int(c0 * sr), int(c1 * sr); s = y[pos:i0].copy(); s[-nf:] *= np.linspace(1, 0, nf); partes.append(s)
        pos = i1; y = y.copy(); y[pos:pos + nf] *= np.linspace(0, 1, nf)
    partes.append(y[pos:]); out = np.concatenate(partes)
    def novo(t): return t - sum(min(max(t - c0, 0), c1 - c0) for c0, c1 in cortes)
    return out, [{**w, 't0': round(novo(w['t0']), 3), 't1': round(novo(w['t1']), 3)} for w in pal]


def main():
    sr, y = ler(os.path.join(ROOT, 'audio', 'voz.wav')); env = env_db(y, sr)
    F0 = json.load(open(os.path.join(ROOT, 'audio', 'falas.json'))); ws = F0['palavras']
    # 1) a tomada de 19/11: as palavras de cada frase (pelo texto que ela tinha naquela tomada)
    k, orig = 0, []
    for f in R['frases']:
        toks = f.get('tokens_tomada_original', f['tokens']); pw = []
        for t in toks:
            for w in t['fala'].split():
                assert ws[k]['w'] == w, (ws[k]['w'], w); pw.append(ws[k]); k += 1
        orig.append(pw)
    assert k == len(ws)
    # limites de cada frase na tomada de 19/11: fala de [início do silêncio anterior .. fim do silêncio seguinte]
    sil = [silencio(env, sr, a[-1]['t1'], b[0]['t0']) for a, b in zip(orig, orig[1:])]
    pecas = []
    for i, f in enumerate(R['frases']):
        nova = f.get('tomada') and not SEM_TROCAS
        if nova:
            srn, yn = ler(os.path.join(ROOT, f['tomada'] + '.wav')); assert srn == sr
            Fn = json.load(open(os.path.join(ROOT, f['tomada'] + '.json'))); pn = Fn['palavras']; en = env_db(yn, sr)
            yn, pn = encurta(yn, pn, en, sr); en = env_db(yn, sr)
            q = np.nonzero(en >= LIM)[0]; a0, a1 = q[0] / sr, (q[-1] + 1) / sr       # a fala da tomada nova
            pecas.append({'y': yn, 'ini': a0, 'fim': a1, 'antes': (0.0, a0), 'depois': (a1, len(yn) / sr), 'pal': pn, 'tomada': f['tomada'],
                          'fim_fala': pn[-1]['t1'] + 0.05})
        else:
            ini = sil[i - 1][1] if i > 0 else 0.0
            fim = sil[i][0] if i < len(sil) else len(y) / sr
            pecas.append({'y': y, 'ini': ini, 'fim': fim, 'antes': sil[i - 1] if i > 0 else (0.0, 0.0), 'depois': sil[i] if i < len(sil) else (fim, len(y) / sr),
                          'pal': orig[i], 'tomada': 'audio/voz.wav', 'fim_fala': F0['fim_da_fala_s']})
    # 2) monta: INI + [início da tomada até a 1ª frase] + frase + pausa (metade do silêncio de cada lado) + frase…
    nf = int(FADE * sr)
    def corte(p, a, b, fade_in=False, fade_out=False):
        s = p['y'][int(round(a * sr)): int(round(b * sr))].copy()
        if fade_in and len(s) > nf: s[:nf] *= np.linspace(0, 1, nf)
        if fade_out and len(s) > nf: s[-nf:] *= np.linspace(1, 0, nf)
        return s
    def silencio_de(p, a, b, n):                                   # n amostras do silêncio [a, b] da tomada (completa com zeros)
        s = corte(p, a, b)[:n] if n > 0 else np.zeros(0)
        return np.concatenate([s, np.zeros(max(0, n - len(s)))])
    partes = [np.zeros(int(INI * sr)), corte(pecas[0], 0.0, pecas[0]['ini'])]
    pos, frases, pausas = sum(len(x) for x in partes), [], []
    for i, (f, p) in enumerate(zip(R['frases'], pecas)):
        s = corte(p, p['ini'], p['fim'], fade_in=i > 0, fade_out=i < len(pecas) - 1)
        t_ini = pos / sr
        pal = [{'w': w['w'], 't0': round(t_ini + w['t0'] - p['ini'], 3), 't1': round(t_ini + w['t1'] - p['ini'], 3)} for w in p['pal']]
        partes.append(s); pos += len(s)
        if i < len(pecas) - 1:
            q = pecas[i + 1]; n = int(round(f['pausa'] * sr)); h = n // 2
            a = silencio_de(p, *p['depois'], h); a[-nf:] *= np.linspace(1, 0, nf) if len(a) > nf else 1
            bq = q['antes']; b = silencio_de(q, max(bq[0], bq[1] - (n - h) / sr), bq[1], n - h)
            if len(b) > nf: b[:nf] *= np.linspace(0, 1, nf)
            partes += [a, b]; pos += n
            pausas.append({'depois_de': f['id'], 'depois_s': f['pausa']})
        else:
            fim_voz = t_ini + p['fim_fala'] - p['ini']
            partes.append(corte(p, p['fim'], len(p['y']) / sr)); pos += len(partes[-1])
        # tokens do roteiro (o texto oficial) por cima das palavras da tomada
        k2, pw = 0, []
        for t in (f.get('tokens_tomada_original', f['tokens']) if SEM_TROCAS else f['tokens']):
            for j, w in enumerate(t['fala'].split()):
                assert pal[k2]['w'] == w, (f['id'], pal[k2]['w'], w)
                pw.append({'w': w, 't0': pal[k2]['t0'], 't1': pal[k2]['t1'], 'chave': bool(t.get('chave')), 'id': t.get('id') if j == 0 else None}); k2 += 1
        frases.append({'id': f['id'], 'pausa': f['pausa'], 'tomada': p['tomada'], 'palavras': pw, 't0': pw[0]['t0'], 't1': pw[-1]['t1']})
    v = np.concatenate(partes)
    dur = round(fim_voz + FIM, 3)
    v = np.concatenate([v, np.zeros(max(0, int(dur * sr) - len(v)))])[: int(round(dur * sr))]
    nome = 'voz-montada-sem-trocas.wav' if SEM_TROCAS else 'voz-montada.wav'
    wavfile.write(os.path.join(ROOT, 'audio', nome), sr, np.round(np.clip(v, -1, 1) * 32767).astype(np.int16))
    if SEM_TROCAS: print(f'(conferência) duração {dur:.3f} s -> audio/{nome}'); return
    out = {'audio': 'audio/voz-montada.wav', 'inicio_voz': INI, 'fim_voz': round(fim_voz, 3), 'duracao': dur, 'marca': R['marca'], 'pausas': pausas, 'frases': frases}
    json.dump(out, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'duração {dur:.2f} s · voz {INI:.2f}–{fim_voz:.2f} s')
    for f in frases: print(f"  {f['id']:9s} {f['t0']:6.2f}–{f['t1']:6.2f}  {'(nova)' if 'trocas' in f['tomada'] else ''}")


if __name__ == '__main__':
    main()
