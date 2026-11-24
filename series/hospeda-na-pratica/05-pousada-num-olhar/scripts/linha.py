#!/usr/bin/env python3
"""
Montagem da locução e linha do tempo do episódio 5.

    python3 scripts/linha.py   -> audio/voz-montada.wav + linha.json

Ritmo ágil sem mexer na voz: entre uma frase e a seguinte, o silêncio que a própria gravação tem é encurtado (ou
alongado) para a "pausa" do roteiro. No episódio 5, um token também pode ter "pausa" (depois de cada pergunta,
para a pergunta entrar na tela e a câmera ir ao bloco): o silêncio depois da última palavra do token vira essa pausa. Só se remove silêncio (trechos abaixo de −45 dB), sempre do meio do silêncio,
com fades de 10 ms; nenhuma palavra é cortada nem acelerada. A voz entra 0,30 s depois do quadro 0; depois da última
palavra vêm 3,6 s da marca e da chamada na tela.
"""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
F = json.load(open(os.path.join(ROOT, 'audio', 'falas.json')))
INI, FIM, LIM, FADE = 0.30, 3.6, -45.0, 0.010


def main():
    sr, y = wavfile.read(os.path.join(ROOT, 'audio', 'voz.wav'))
    y = y.astype(np.float64) / 32768
    env = 20 * np.log10(np.sqrt(uniform_filter1d(y ** 2, int(0.01 * sr)) + 1e-12))
    ws = F['palavras']
    # palavras de cada frase (o texto oficial, token a token)
    k, frases, blocos = 0, [], []                                  # blocos: trechos entre duas pausas editáveis
    for f in R['frases']:
        pw = []
        for t in f['tokens']:
            ini = len(pw)
            for j, w in enumerate(t['fala'].split()):
                assert ws[k]['w'] == w, (ws[k]['w'], w)
                pw.append({'w': w, 't0': ws[k]['t0'], 't1': ws[k]['t1'], 'chave': bool(t.get('chave')), 'pergunta': bool(t.get('pergunta')), 'id': t.get('id') if j == 0 else None})
                k += 1
            if 'pausa' in t and t is not f['tokens'][-1]:
                blocos.append({'id': f['id'] + '·' + (t.get('id') or str(ini)), 'pausa': t['pausa'], 'palavras': pw[len(sum((b['palavras'] for b in blocos if b.get('frase') == f['id']), [])):]})
                blocos[-1]['frase'] = f['id']
        resto = pw[len(sum((b['palavras'] for b in blocos if b.get('frase') == f['id']), [])):]
        blocos.append({'id': f['id'], 'frase': f['id'], 'pausa': f['pausa'], 'palavras': resto})
        frases.append({'id': f['id'], 'pausa': f['pausa'], 'palavras': pw})
    assert k == len(ws)
    # silêncio entre frases: [s0, s1] abaixo de −45 dB entre a última palavra e a primeira da seguinte
    edicoes = []                                                   # (t na gravação, segundos a tirar (+) ou pôr (−))
    for a, b in zip(blocos, blocos[1:]):
        t_a, t_b = a['palavras'][-1]['t1'], b['palavras'][0]['t0']
        i0, i1 = int(t_a * sr / 441), int(t_b * sr / 441)
        seg = env[int(t_a * sr): int(t_b * sr)]
        quieto = np.nonzero(seg < LIM)[0]
        if len(quieto) == 0:
            continue
        s0, s1 = t_a + quieto[0] / sr, t_a + quieto[-1] / sr
        atual = s1 - s0
        edicoes.append(((s0 + s1) / 2, atual - a['pausa'], atual))
    # aplica: corta (ou insere) no meio de cada silêncio
    partes, pos, desloc, mapa = [np.zeros(int(INI * sr))], 0, INI, []
    nf = int(FADE * sr)
    for tm, dif, atual in edicoes:
        i = int(tm * sr)
        if dif > 0:
            meio0, meio1 = int((tm - dif / 2) * sr), int((tm + dif / 2) * sr)
            a = y[pos:meio0].copy(); a[-nf:] *= np.linspace(1, 0, nf)
            partes.append(a); mapa.append((tm, desloc)); desloc -= (meio1 - meio0) / sr
            pos = meio1
            b0 = y[pos:pos + nf].copy()
            y[pos:pos + nf] = b0 * np.linspace(0, 1, nf)
        else:
            partes += [y[pos:i], np.zeros(int(-dif * sr))]; mapa.append((tm, desloc)); desloc += -dif; pos = i
    partes.append(y[pos:])
    mapa.append((1e9, desloc))
    v = np.concatenate(partes)
    def novo(t):
        d = INI
        for tm, dd in mapa:
            if t < tm: return round(t + d, 3)
            d = dd
        return round(t + d, 3)
    # o deslocamento vale a partir de cada ponto de corte
    pontos = [(tm, None) for tm, _, _ in edicoes]
    acum, cortes = INI, []
    for tm, dif, _ in edicoes:
        cortes.append((tm, acum)); acum -= dif
    cortes.append((1e9, acum))
    def desloca(t):
        d = INI
        for tm, dd in cortes:
            if t < tm: return round(t + dd, 3)
        return round(t + acum, 3)
    for f in frases:
        for w in f['palavras']:
            w['t0'], w['t1'] = desloca(w['t0']), desloca(w['t1'])
        f['t0'], f['t1'] = f['palavras'][0]['t0'], f['palavras'][-1]['t1']
    fim_voz = desloca(F['fim_da_fala_s'])
    dur = round(fim_voz + FIM, 3)
    v = np.concatenate([v, np.zeros(max(0, int(dur * sr) - len(v)))])[: int(dur * sr)]
    wavfile.write(os.path.join(ROOT, 'audio', 'voz-montada.wav'), sr, np.round(np.clip(v, -1, 1) * 32767).astype(np.int16))
    out = {'audio': 'audio/voz-montada.wav', 'inicio_voz': INI, 'fim_voz': fim_voz, 'duracao': dur, 'marca': R['marca'],
           'pausas': [{'depois_de': a['id'], 'antes_s': round(e[2], 3), 'depois_s': round(e[2] - e[1], 3)} for a, e in zip(blocos, edicoes)],
           'frases': frases}
    json.dump(out, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'duração {dur:.2f} s · voz {INI:.2f}–{fim_voz:.2f} s')
    for f in frases:
        print(f"  {f['id']:9s} {f['t0']:6.2f}–{f['t1']:6.2f}")
    for pz in out['pausas']:
        print(f"    pausa depois de {pz['depois_de']:18s} {pz['antes_s']:.2f} → {pz['depois_s']:.2f}")


if __name__ == '__main__':
    main()
