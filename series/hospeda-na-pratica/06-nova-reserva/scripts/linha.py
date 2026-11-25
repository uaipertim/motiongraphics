#!/usr/bin/env python3
"""
Montagem da locução e linha do tempo do episódio 6 (Nova reserva em segundos).

    python3 scripts/linha.py   -> audio/voz-montada.wav + linha.json

A voz é cortada em frases (sempre no meio do silêncio entre uma frase e a seguinte; nenhuma palavra é cortada nem acelerada) e
remontada com as pausas do roteiro. No desafio, o tempo manda: a frase com "alvo" começa no instante do passo medido na
captura (telas/eventos.json), contado a partir de D, o início do desafio no vídeo (o fim de "Valendo!" + 0,25 s). Se a frase
anterior ainda estiver falando, a pausa fica no mínimo de 0,15 s (e a conferência avisa).
"""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
F = json.load(open(os.path.join(ROOT, 'audio', 'falas.json')))
EV = json.load(open(os.path.join(ROOT, 'telas', 'eventos.json')))
INI, FIM, FADE, MIN = 0.30, 3.6, 0.010, 0.15


def evento(nome):
    if nome == 'inicio': return 0.0
    for e in EV['eventos']:
        if e.get('nome') == nome and e['tipo'] in ('parcial', 'toque'): return e['t']
    raise KeyError(nome)


def main():
    sr, y = wavfile.read(os.path.join(ROOT, 'audio', 'voz.wav'))
    y = y.astype(np.float64) / 32768
    ws, k, frases = F['palavras'], 0, []
    for f in R['frases']:
        pw = []
        for t in f['tokens']:
            for j, w in enumerate(t['fala'].split()):
                assert ws[k]['w'] == w, (ws[k]['w'], w)
                pw.append({'w': w, 't0': ws[k]['t0'], 't1': ws[k]['t1'], 'chave': bool(t.get('chave')), 'id': t.get('id') if j == 0 else None}); k += 1
        frases.append({**{kk: vv for kk, vv in f.items() if kk != 'tokens'}, 'palavras': pw})
    assert k == len(ws)
    # cortes no meio do silêncio entre frases
    cortes = [0.0] + [(a['palavras'][-1]['t1'] + b['palavras'][0]['t0']) / 2 for a, b in zip(frases, frases[1:])] + [len(y) / sr]
    partes, t_out, D, desloc, log = [np.zeros(int(INI * sr))], INI, None, [], []
    for i, f in enumerate(frases):
        a, b = cortes[i], cortes[i + 1]
        w0, w1 = f['palavras'][0]['t0'], f['palavras'][-1]['t1']
        pre, pos = min(w0 - a, 0.06), min(b - w1, 0.12)               # um pouco do silêncio de cada lado (respiração natural)
        seg = y[int((w0 - pre) * sr): int((w1 + pos) * sr)].copy(); n = int(FADE * sr); seg[:n] *= np.linspace(0, 1, n); seg[-n:] *= np.linspace(1, 0, n)
        if i == 0: inicio = INI
        else:
            fim_ant = t_out
            if 'alvo' in f:
                nome, dt = f['alvo']; alvo = D + evento(nome) + dt
                inicio = max(fim_ant + MIN, alvo - pre)
                log.append({'frase': f['id'], 'alvo_s': round(alvo, 3), 'comeca_s': round(inicio + pre, 3), 'atraso_s': round(inicio + pre - alvo, 3)})
            else: inicio = fim_ant + frases[i - 1].get('pausa', 0.4)
            partes.append(np.zeros(max(0, int((inicio - fim_ant) * sr))))
        d = inicio + pre - w0
        for w in f['palavras']: w['t0'], w['t1'] = round(w['t0'] + d, 3), round(w['t1'] + d, 3)
        f['t0'], f['t1'] = f['palavras'][0]['t0'], f['palavras'][-1]['t1']
        partes.append(seg); t_out = inicio + len(seg) / sr
        if f['id'] == 'desafio': D = round(f['t1'] + 0.25, 3)
    fim_voz = frases[-1]['t1']; dur = round(fim_voz + FIM, 3)
    v = np.concatenate(partes); v = np.concatenate([v, np.zeros(max(0, int(dur * sr) - len(v)))])[: int(dur * sr)]
    wavfile.write(os.path.join(ROOT, 'audio', 'voz-montada.wav'), sr, np.round(np.clip(v, -1, 1) * 32767).astype(np.int16))
    out = {'audio': 'audio/voz-montada.wav', 'inicio_voz': INI, 'fim_voz': fim_voz, 'duracao': dur, 'marca': R['marca'],
           'desafio_inicio': D, 'cronometro_total': EV['total_s'], 'alvos': log, 'frases': frases}
    json.dump(out, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'duração {dur:.2f} s · voz {INI:.2f}–{fim_voz:.2f} s · desafio {D:.2f}–{D + EV["total_s"]:.2f} s')
    for f in frases: print(f"  {f['id']:8s} {f['t0']:6.2f}–{f['t1']:6.2f}")
    for l in log: print('   ', l)


if __name__ == '__main__':
    main()
