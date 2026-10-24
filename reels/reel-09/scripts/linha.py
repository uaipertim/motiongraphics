#!/usr/bin/env python3
"""
Linha do tempo do Reel 09: as palavras da legenda (Clara + narração) no tempo do vídeo -> audio/linha.json.

    python3 scripts/linha.py

- Clara: os tempos de roteiro.json (clara.palavras, no tempo do clipe) menos o início do corte ("de") mais "t".
- Narração: o alinhamento da API (audio/voz/falas.json) mais o "t" de cada bloco; a palavra exibida é a do roteiro
  (a grafia enviada à API, como "Uátsap", nunca aparece na legenda).
- "destaque": trechos que ficam em limão (sequências de palavras exatamente como no roteiro).
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
V = json.load(open(os.path.join(ROOT, 'audio', 'voz', 'falas.json')))
# a marca na legenda sai como se escreve (o acento de "Hospéda" é só para a pronúncia na API)
ESCRITA = {'Fazlo': 'FAZLO', 'Hospéda': 'Hospeda'}


def escrita(w):
    nucleo = w.rstrip('.,?!…:')
    return ESCRITA.get(nucleo, nucleo) + w[len(nucleo):]


def marca(ws, destaques):
    for d in destaques:
        alvo = d.split()
        for i in range(len(ws) - len(alvo) + 1):
            if [w['w'] for w in ws[i:i + len(alvo)]] == alvo:
                for w in ws[i:i + len(alvo)]:
                    w['lima'] = True
                break
        else:
            raise SystemExit(f'destaque não encontrado: "{d}"')
    return ws


def main():
    blocos = []
    c = R['clara']
    ws = [{'w': w, 't0': round(a - c['de'] + c['t'], 3), 't1': round(b - c['de'] + c['t'], 3)} for w, a, b in c['palavras']]
    assert ' '.join(w['w'] for w in ws) == c['texto'], 'as palavras da Clara não batem com o texto'
    blocos.append({'id': 'clara', 'quem': 'clara', 't0': ws[0]['t0'], 't1': ws[-1]['t1'], 'palavras': marca(ws, c['destaque'])})
    for b in R['narracao']:
        f = V['blocos'][str(b['bloco'])]
        assert f['texto'] == b['texto'], f'bloco {b["bloco"]}: o texto mudou; rode scripts/voz.py'
        ws = [{'w': w['legenda'], 't0': round(w['t0'] + b['t'], 3), 't1': round(w['t1'] + b['t'], 3)} for w in f['palavras']]
        blocos.append({'id': f'bloco-{b["bloco"]}', 'quem': 'narracao', 't': b['t'], 'duracao_audio': f['duracao_audio'],
                       't0': ws[0]['t0'], 't1': ws[-1]['t1'], 'palavras': marca(ws, b.get('destaque', []))})
    for b in blocos:
        for w in b['palavras']:
            w['w'] = escrita(w['w'])
    out = {'duracao': R['duracao'], 'blocos': blocos, 'cortes': R['cortes'], 'logo': R['logo'],
           'clara': {k: c[k] for k in ('arquivo', 'de', 'ate', 't')}, 'caos': R['caos'], 'marca': R['marca']}
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, 'audio', 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    for b in blocos:
        print(f'  {b["id"]:9s} {b["t0"]:6.2f}–{b["t1"]:6.2f} s  {len(b["palavras"])} palavras')
    # nada de voz por cima de outra, nem da logo
    fins = sorted((b['t0'], b['t1'], b['id']) for b in blocos)
    for (a0, a1, ai), (b0, b1, bi) in zip(fins, fins[1:]):
        assert a1 < b0, f'{ai} e {bi} se sobrepõem'
    assert fins[-1][1] < R['logo']['t0'], 'a logo entraria antes da última palavra'


if __name__ == '__main__':
    main()
