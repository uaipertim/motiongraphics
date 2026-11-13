"""qa_textos.py — confere os textos registrados pelo motor (node src/video/render.cjs qa):
  • zonas seguras: nada essencial acima de y 200, abaixo de y 1536, nem na coluna x>940 & y>1000
  • nada cortado/encostado: margem ≥ 24 px das bordas do quadro; textos de blocos diferentes não se tocam
  • tempo de leitura: cada bloco totalmente visível por ≥ 1,2 s + 0,3 s/palavra
Considera apenas quadros em que o texto está "assentado" (parado na posição final; nas transições ele está entrando/saindo).
uso: python3 src/ferramentas/qa_textos.py build/qa.json
"""
import json
import sys
from collections import defaultdict

MARGEM = 24
qa = json.load(open(sys.argv[1]))
passo = qa[1]['t'] - qa[0]['t']

# posições por id/palavra ao longo do tempo
vis = defaultdict(list)          # id -> [(t, nvis, npal)]
caixas = defaultdict(list)       # (id, txt) -> [(t, caixa)]
BAR = 240 / 124
TRANSICOES = [(11 * BAR + 0.35, 12 * BAR)]  # vórtice: tudo é sugado para o centro
for q in qa:
    q['reg'] = [r for r in q['reg'] if r['x1'] > 0 and r['x0'] < 1080 and r['y1'] > 0 and r['y0'] < 1920]
    q['trans'] = any(a <= q['t'] < b for a, b in TRANSICOES)
for q in qa:
    por_id = defaultdict(list)
    for r in q['reg']:
        por_id[r['id']].append(r)
        caixas[(r['id'], r['txt'])].append((q['t'], r))
    for i, rs in por_id.items():
        vis[i].append((q['t'], len(rs), rs[0]['nPal']))


def assentada(lista, k):
    """palavra parada: mesma posição (±1,5 px) do quadro anterior ou seguinte"""
    t, r = lista[k]
    for j in (k - 1, k + 1):
        if 0 <= j < len(lista) and abs(lista[j][0] - t) < passo * 1.5:
            o = lista[j][1]
            if abs(o['x0'] - r['x0']) < 4 and abs(o['y0'] - r['y0']) < 4:
                return True
    return False


problemas = []
em_trans = {q['t'] for q in qa if q['trans']}
for (i, txt), lista in caixas.items():
    for k, (t, r) in enumerate(lista):
        if t in em_trans or not assentada(lista, k):
            continue
        motivos = []
        if r['y0'] < 200: motivos.append(f"acima de y200 ({r['y0']:.0f})")
        if r['y1'] > 1536: motivos.append(f"abaixo de y1536 ({r['y1']:.0f})")
        if r['x1'] > 940 and r['y1'] > 1000: motivos.append(f"coluna de botões (x1 {r['x1']:.0f}, y1 {r['y1']:.0f})")
        if r['x0'] < MARGEM or r['x1'] > 1080 - MARGEM: motivos.append(f"encostado/cortado na lateral ({r['x0']:.0f}..{r['x1']:.0f})")
        if motivos:
            problemas.append((t, i, txt, '; '.join(motivos)))

# textos de blocos diferentes se tocando (no mesmo quadro)
for q in qa:
    rs = [] if q['trans'] else q['reg']
    for a in range(len(rs)):
        for b in range(a + 1, len(rs)):
            A, B = rs[a], rs[b]
            if A['id'] == B['id'] or A['id'].split('.')[0] == 'vaga' and B['id'].split('.')[0] == 'vaga' and 'nuvem' in A['id'] + B['id'] and 'frase' not in A['id'] + B['id']:
                continue
            if A['id'].startswith('logo') and B['id'].startswith('logo'):
                continue
            sep = max(A['x0'] - B['x1'], B['x0'] - A['x1'], A['y0'] - B['y1'], B['y0'] - A['y1'])
            if sep < 6:
                problemas.append((q['t'], A['id'] + ' × ' + B['id'], A['txt'] + ' / ' + B['txt'], f'textos encostados (sep {sep:.0f}px)'))

# nº de registros que compõem o bloco inteiro = máximo observado simultaneamente
def moda(v):
    return max(set(v), key=v.count)


cheio_n = {i: moda([n for _, n, _ in l]) for i, l in vis.items()}
print('== tempo de leitura (bloco inteiro visível) ==')
falhas_tempo = 0
for i, l in sorted(vis.items(), key=lambda kv: kv[1][0][0]):
    npal = l[0][2]
    cheio = [t for t, n, p in l if n >= cheio_n[i]]
    # maior trecho contínuo
    melhor, ini, ant = 0.0, None, None
    for t in cheio:
        if ant is None or t - ant > passo * 1.5:
            ini = t
        melhor = max(melhor, t - ini + passo)
        ant = t
    exig = 1.2 + 0.3 * npal
    ok = melhor >= exig - 1e-6
    falhas_tempo += 0 if ok else 1
    print(f"{'OK ' if ok else 'FALHA'} {i:22s} {npal} pal · visível {melhor:4.2f} s (mín {exig:.1f} s) · de {l[0][0]:.2f} a {l[-1][0]:.2f}")

print('\n== zonas seguras / cortes / encostes (texto assentado) ==')
agrup = defaultdict(list)
for t, i, txt, m in problemas:
    agrup[(i, txt, m.split('(')[0])].append(t)
for (i, txt, m), ts in sorted(agrup.items(), key=lambda kv: kv[1][0]):
    print(f"{min(ts):6.2f}–{max(ts):6.2f}s  {i:30s} '{txt}': {m} ({len(ts)} amostras)")
print(f"\nresumo: {falhas_tempo} bloco(s) abaixo do tempo de leitura; {len(agrup)} tipo(s) de problema de posição")
