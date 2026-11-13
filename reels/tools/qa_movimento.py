#!/usr/bin/env python3
"""
QA de MOVIMENTO dos vídeos só com elementos (sem narração) — obrigatório (reels/PADRAO-ELEMENTOS.md).

    python3 reels/tools/qa_movimento.py <video.mp4> [--ref v2/output/fazlo-hospeda-reels-v2.mp4] [--logo-final 0.8] [--json saida.json]

Medição (a mesma do diagnóstico de 13/11/2026): o vídeo a 10 fps, reduzido a 108×192 em cinza; para cada par de quadros
seguidos, a diferença média absoluta (0–255).
  - movimento mediano: a mediana dessas diferenças;
  - parado: diferença < 0,05 (o quadro seguinte é praticamente igual); tempo parado total e o maior trecho parado;
  - mudança grande: diferença > 15 (um corte, um impacto, uma troca de composição); contagem e taxa por segundo;
  - trocas de fundo: a cor do fundo (mediana da moldura de 6 px do quadro, a 10 fps em cor) classificada em escuro,
    off-white ou verde-limão; uma troca conta quando a nova cor fica ≥ 0,3 s.
Para APROVAR (vídeo sem narração):
  - movimento mediano ≥ 1,0;
  - tempo parado total ≤ 1,5 s e nenhum trecho parado > 0,5 s (o logo final pode segurar até 0,8 s, com --logo-final);
  - mudanças grandes ≥ 0,6 por segundo;
  - pelo menos 3 trocas de fundo.
A referência ("Toda estadia é um ciclo", v2) entra no relatório como linha de base (só de dinâmica).
"""
import argparse
import json
import os
import subprocess
import sys
import numpy as np

PARADO, GRANDE, FPS = 0.05, 15.0, 10
REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'v2', 'output', 'fazlo-hospeda-reels-v2.mp4')


def quadros(path, cor=False):
    fmt, ch = ('rgb24', 3) if cor else ('gray', 1)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={FPS},scale=108:192,format={fmt}', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
    f = np.frombuffer(raw, np.uint8)
    return f.reshape(-1, 192, 108, ch).astype(np.float32) if cor else f.reshape(-1, 192, 108).astype(np.float32)


def fundo(q):
    m = 6
    borda = np.concatenate([q[:m].reshape(-1, 3), q[-m:].reshape(-1, 3), q[:, :m].reshape(-1, 3), q[:, -m:].reshape(-1, 3)])
    r, g, b = np.median(borda, axis=0)
    if max(r, g, b) < 90:
        return 'escuro'
    if g > 190 and b < 140 and r < 215:
        return 'limao'
    if min(r, g, b) > 180:
        return 'off-white'
    return 'outro'


def mede(path, logo_final=0.0):
    g = quadros(path)
    d = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))
    parado = d < PARADO
    trechos, ini, c = [], 0, 0
    for i, s in enumerate(parado):
        if s:
            if c == 0:
                ini = i
            c += 1
        elif c:
            trechos.append((ini / FPS, c / FPS)); c = 0
    if c:
        trechos.append((ini / FPS, c / FPS))
    dur = len(g) / FPS
    # o logo final pode segurar até logo_final segundos: um trecho que termina no fim do vídeo é medido à parte
    fim = [tr for tr in trechos if abs(tr[0] + tr[1] - (len(d)) / FPS) < 0.15]
    meio = [tr for tr in trechos if tr not in fim]
    cores = [fundo(q) for q in quadros(path, cor=True)]
    seq = []
    for i, cl in enumerate(cores):
        if cl == 'outro':
            continue
        if not seq or seq[-1][0] != cl:
            seq.append([cl, i, i])
        else:
            seq[-1][2] = i
    seq = [s for s in seq if (s[2] - s[1] + 1) / FPS >= 0.3]
    blocos = []
    for s in seq:
        if blocos and blocos[-1][0] == s[0]:
            blocos[-1][2] = s[2]
        else:
            blocos.append(list(s))
    return {
        'video': os.path.relpath(path), 'duracao_s': round(dur, 2),
        'movimento_mediano': round(float(np.median(d)), 3),
        'parado_total_s': round(float(parado.sum()) / FPS, 2),
        'maior_trecho_parado_s': round(max([t[1] for t in meio], default=0.0), 2),
        'parado_final_s': round(max([t[1] for t in fim], default=0.0), 2),
        'trechos_parados': [(round(a, 1), round(b, 1)) for a, b in trechos if b >= 0.3],
        'mudancas_grandes': int((d > GRANDE).sum()), 'mudancas_por_s': round(float((d > GRANDE).sum()) / dur, 2),
        'fundos': [(b[0], round(b[1] / FPS, 1)) for b in blocos], 'trocas_de_fundo': max(0, len(blocos) - 1),
        'logo_final_s': logo_final,
    }


def aprova(m):
    crit = [
        ('movimento mediano ≥ 1,0', m['movimento_mediano'] >= 1.0),
        ('tempo parado total ≤ 1,5 s', m['parado_total_s'] <= 1.5),
        ('nenhum trecho parado > 0,5 s', m['maior_trecho_parado_s'] <= 0.5),
        (f"logo final parado ≤ {m['logo_final_s'] or 0.5:.1f} s", m['parado_final_s'] <= (m['logo_final_s'] or 0.5)),
        ('mudanças grandes ≥ 0,6 por segundo', m['mudancas_por_s'] >= 0.6),
        ('pelo menos 3 trocas de fundo', m['trocas_de_fundo'] >= 3),
    ]
    return crit


def tabela(ref, m):
    linhas = [
        ('movimento mediano (dif. média, 0–255)', ref['movimento_mediano'], m['movimento_mediano'], '≥ 1,0'),
        ('tempo parado total (s)', ref['parado_total_s'], m['parado_total_s'], '≤ 1,5'),
        ('maior trecho parado (s)', ref['maior_trecho_parado_s'], m['maior_trecho_parado_s'], '≤ 0,5'),
        ('parado no fim / logo (s)', ref['parado_final_s'], m['parado_final_s'], f"≤ {m['logo_final_s'] or 0.5:.1f}"),
        ('mudanças grandes (> 15)', ref['mudancas_grandes'], m['mudancas_grandes'], ''),
        ('mudanças grandes por segundo', ref['mudancas_por_s'], m['mudancas_por_s'], '≥ 0,6'),
        ('trocas de fundo', ref['trocas_de_fundo'], m['trocas_de_fundo'], '≥ 3'),
        ('duração (s)', ref['duracao_s'], m['duracao_s'], ''),
    ]
    out = [f"{'medida':<40} {'v2 (referência)':>16} {'este vídeo':>12}   alvo", '-' * 82]
    for n, a, b, alvo in linhas:
        out.append(f"{n:<40} {str(a):>16} {str(b):>12}   {alvo}")
    out.append('')
    out.append('fundos deste vídeo: ' + ' → '.join(f'{c} ({t:.1f} s)' for c, t in m['fundos']))
    out.append('fundos da v2:       ' + ' → '.join(f'{c} ({t:.1f} s)' for c, t in ref['fundos']))
    if m['trechos_parados']:
        out.append('trechos parados ≥ 0,3 s (início, duração): ' + ', '.join(f'{a:.1f} s/{b:.1f} s' for a, b in m['trechos_parados']))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--ref', default=REF)
    ap.add_argument('--logo-final', type=float, default=0.0)
    ap.add_argument('--json')
    a = ap.parse_args()
    ref = mede(a.ref)
    m = mede(a.video, a.logo_final)
    crit = aprova(m)
    linhas = ['QA DE MOVIMENTO (reels/tools/qa_movimento.py) — referência: v2 "Toda estadia é um ciclo" (só dinâmica)', ''] + tabela(ref, m) + ['']
    linhas += [('OK     ' if ok else 'FALHA  ') + n for n, ok in crit]
    linhas.append('RESULTADO DO MOVIMENTO: ' + ('aprovado' if all(ok for _, ok in crit) else 'reprovado'))
    print('\n'.join(linhas))
    if a.json:
        json.dump({'referencia': ref, 'video': m, 'criterios': crit, 'texto': linhas}, open(a.json, 'w'), ensure_ascii=False, indent=1)
    sys.exit(0 if all(ok for _, ok in crit) else 1)


if __name__ == '__main__':
    main()
