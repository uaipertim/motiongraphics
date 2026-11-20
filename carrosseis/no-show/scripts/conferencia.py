#!/usr/bin/env python3
"""
Conferência do carrossel animado "O hóspede não apareceu", slide a slide (roda depois de `node scripts/render.cjs <n>`).

    python3 scripts/conferencia.py 2      ->  output/revisao/conferencia-02.txt
    python3 scripts/conferencia.py        ->  todos os slides que já têm MP4 da v2

Mede nos próprios MP4 (os quadros saem pelo ffmpeg, pelo número do quadro) e nos quadros do motor:
  • ffprobe: 1080×1350, 30 fps, a duração do slide (9–10 s), H.264 yuv420p, áudio AAC, arquivo < 15 MB;
  • margens: o conteúdo (luminância > 60 nos slides escuros; na capa limão, o que se destaca muito do limão) fica entre
    x 80 e 1000 em todos os quadros (a cada 0,1 s);
  • canto do ícone de som: nada em x ≥ 940 e y ≥ 1210, em nenhum quadro;
  • texto do topo: nas caixas do texto fixo (título, trilha, apoio), os quadros do motor (a cada 0,5 s) são idênticos
    ao quadro 0 (0 px com o brilho diferente em > 40 níveis); o ruído do H.264 no MP4 é informado à parte;
  • loop: o último quadro e o quadro 0, desenhados pelo motor, são iguais (0 px com o brilho diferente em > 40 níveis);
  • valores: os do roteiro aparecem e nenhum outro valor em R$ aparece (só 360, 540, 720 e 1.080); contas: 3 × 360 = 1.080;
    50% = 540; 1.080 − 540 = 540; 2 × 360 = 720;
  • toques (NOVA, todas as cenas): em cada quadro, as caixas de todos os textos, balões, selos, carimbos e etiquetas — e do
    texto fixo — ficam a ≥ 10 px umas das outras, também durante as entradas com mola (exceto o selo de canto preso de
    propósito ao próprio elemento).
  Sem argumentos, confere os 8 e grava também output/revisao/conferencia.txt (o geral).
"""
import json
import math
import re
import os
import subprocess
import sys
import tempfile
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output')
REV = os.path.join(OUT, 'revisao')
W, H, M, TOL = 1080, 1350, 80, 2
LIME = np.array([175, 250, 39])
lum = lambda q: q @ [0.2126, 0.7152, 0.0722]


def quadros(mp4, ns):
    alvo = sorted(set(ns))
    with tempfile.TemporaryDirectory() as tmp:
        expr = '+'.join(f'eq(n\\,{k})' for k in alvo)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', f'select={expr}', '-vsync', '0', os.path.join(tmp, 'q%04d.png')], check=True)
        fs = sorted(os.listdir(tmp))
        assert len(fs) == len(alvo)
        por = {k: np.asarray(Image.open(os.path.join(tmp, f)).convert('RGB')).astype(np.int16) for k, f in zip(alvo, fs)}
    return [por[k] for k in ns]


def confere(n):
    rel, falhas = [], []
    def ok(c, m):
        rel.append(('OK   ' if c else 'FALHA') + '  ' + m)
        if not c:
            falhas.append(m)
    info = json.loads(subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'caixas', str(n)], check=True, capture_output=True, text=True).stdout)
    dur, fps = info['dur'], info['fps']
    nq = int(round(dur * fps))
    f = os.path.join(OUT, f'{n:02d}.mp4')
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
    a = [s for s in pr['streams'] if s['codec_type'] == 'audio']
    fr = eval(v['r_frame_rate']); d = float(pr['format']['duration']); mb = os.path.getsize(f) / 1e6
    ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p' and (v['width'], v['height']) == (W, H) and abs(fr - fps) < 1e-6 and abs(d - dur) < 0.05
       and a and a[0]['codec_name'] == 'aac' and mb < 15 and int(v.get('nb_frames', nq)) == nq,
       f'{n:02d}.mp4: {v["width"]}×{v["height"]}, {fr:g} fps, {d:.2f} s ({v.get("nb_frames")} quadros), {v["codec_name"]} {v["pix_fmt"]}, '
       f'áudio {a[0]["codec_name"] + " " + a[0]["sample_rate"] + " Hz" if a else "—"}, {mb:.2f} MB')
    ns = list(range(0, nq, 3)) + [nq - 1]
    qs = quadros(f, ns)
    capa = n == 1
    cont = (lambda q: np.sqrt(((q - LIME) ** 2).sum(axis=2)) > 220) if capa else (lambda q: lum(q) > 60)
    x0, x1, canto = W, 0, 0
    for q in qs:
        m = cont(q); ys, xs = np.nonzero(m)
        if len(xs):
            x0, x1 = min(x0, xs.min()), max(x1, xs.max())
        canto = max(canto, int(m[1210:, 940:].sum()))
    ok(x0 >= M - TOL and x1 <= W - M + TOL, f'margens: conteúdo em x {x0}–{x1} em todos os quadros (a cada 0,1 s)')
    ok(canto == 0, f'canto do ícone de som (x ≥ 940, y ≥ 1210) livre em todos os quadros' + (f' ({canto} px)' if canto else ''))
    # o texto fixo: nos quadros do MOTOR (a cada 0,5 s) as caixas do texto são idênticas ao quadro 0 (0 px); no MP4 sobra
    # só o ruído do H.264 (o quadro 0 é quadro-chave; os outros, não), informado à parte
    ts = [k * 0.5 for k in range(int(dur / 0.5))] + [(nq - 1) / fps]
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'stills', ','.join(f'{n}:{t:.6f}' for t in ts), '--dir', tmp], check=True, capture_output=True)
        rs = [lum(np.asarray(Image.open(os.path.join(tmp, x)).convert('RGB')).astype(np.int16)) for x in sorted(os.listdir(tmp))]
    def pior_em(lista):
        p_ = 0
        for q in lista[1:]:
            dif = np.abs(q - lista[0]) > 40
            for (bx0, by0, bx1, by1) in info['caixas']['texto']:
                p_ = max(p_, int(dif[int(by0):int(by1), int(bx0):int(bx1)].sum()))
        return p_
    pm, pv = pior_em(rs), pior_em([lum(q) for q in qs])
    ok(pm == 0, f'texto do topo fixo: nas caixas do texto, os quadros do motor (a cada 0,5 s, {len(rs)} quadros) são idênticos ao quadro 0 ({pm} px); no MP4, {pv} px de ruído do H.264 nas bordas das letras')
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'stills', f'{n}:0,{n}:{(nq - 1) / fps:.6f}', '--dir', tmp], check=True, capture_output=True)
        r0, r1 = [np.asarray(Image.open(os.path.join(tmp, x)).convert('RGB')).astype(np.int16) for x in sorted(os.listdir(tmp))]
    lp = int((np.abs(lum(r1) - lum(r0)) > 40).sum())
    lv = int((np.abs(lum(qs[-1]) - lum(qs[0])) > 40).sum())
    ok(lp == 0, f'loop: o último quadro ({(nq - 1) / fps:.3f} s) e o quadro 0 batem: {lp} px diferentes nos quadros do motor (no MP4: {lv} px de ruído)')
    # os valores: os do roteiro aparecem, e nenhum outro valor em R$ aparece
    dados = ' · '.join(l['texto'] for l in info['linhas'])
    falta = [v_ for v_ in VALORES.get(n, []) if v_ not in dados]
    reais = set(re.findall(r'R\$ ?([\d.]+)', dados))
    fora = sorted(reais - {'360', '540', '720', '1.080'})
    ok(not falta and not fora, f'valores do roteiro: {", ".join(VALORES.get(n, [])) or "(sem valores)"}' + (f' (faltando: {falta})' if falta else '') + (f' (fora do roteiro: {fora})' if fora else ''))
    # TODAS as cenas: em cada quadro, as caixas de todos os elementos de texto, balões, selos, carimbos e etiquetas (com a
    # escala e a posição da mola) e as do texto fixo; nenhum par pode se tocar nem ficar a menos de 10 px (exceto os
    # pares presos de propósito: o selo de canto do próprio elemento)
    g = json.loads(subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'elems', str(n)], check=True, capture_output=True, text=True).stdout)
    # o vão entre dois elementos: a distância entre os polígonos de verdade (os 4 cantos, com a rotação); se se
    # cruzam, o vão é negativo. O texto fixo é uma caixa reta.
    def poli(e):
        return e[5] if len(e) > 5 else [[e[1], e[2]], [e[3], e[2]], [e[3], e[4]], [e[1], e[4]]]
    def cruzam(A, B):
        for P in (A, B):
            for i in range(len(P)):
                (x1, y1), (x2, y2) = P[i], P[(i + 1) % len(P)]
                nx, ny = y2 - y1, x1 - x2
                if abs(nx) + abs(ny) < 1e-9:
                    continue
                pa = [nx * x + ny * y for x, y in A]; pb = [nx * x + ny * y for x, y in B]
                if max(pa) < min(pb) or max(pb) < min(pa):
                    return False
        return True
    def dps(px, py, a, b):
        (x1, y1), (x2, y2) = a, b
        dx, dy = x2 - x1, y2 - y1; L = dx * dx + dy * dy
        u = 0 if L == 0 else max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / L))
        return math.hypot(px - x1 - u * dx, py - y1 - u * dy)
    def vao(a, b):
        A, B = poli(a), poli(b)
        if cruzam(A, B):
            return -1.0
        return min(min(dps(px, py, B[k], B[(k + 1) % len(B)]) for px, py in A for k in range(len(B))),
                   min(dps(px, py, A[k], A[(k + 1) % len(A)]) for px, py in B for k in range(len(A))))
    piores, ruins, nel = {}, [], 0
    for q in g:
        cs = [['texto fixo %d' % i] + list(b) for i, b in enumerate(q['texto'])] + q['elems']
        nel = max(nel, len(q['elems']))
        juntos = {tuple(sorted(j)) for j in q['junto']}
        for i in range(len(cs)):
            for j in range(i + 1, len(cs)):
                par = tuple(sorted((cs[i][0], cs[j][0])))
                if par in juntos or (par[0].startswith('texto fixo') and par[1].startswith('texto fixo')):
                    continue
                v = vao(cs[i], cs[j])
                if par not in piores or v < piores[par][0]:
                    piores[par] = (v, q['t'])
                if v < 10:
                    ruins.append((round(q['t'], 2), par, round(v, 1)))
    if piores:
        pior = min(piores.items(), key=lambda kv: kv[1][0])
        ok(not ruins, f'toques: {len(g)} quadros (todos), até {nel} elementos por quadro + o texto fixo, {len(piores)} pares medidos; nenhum par a menos de 10 px; menor vão {pior[1][0]:.1f} px ({pior[0][0]} × {pior[0][1]}, {pior[1][1]:.2f} s)'
           + (f' — FALHAS ({len(ruins)}): ' + '; '.join(f'{t_} s {a_} × {b_} = {v_} px' for t_, (a_, b_), v_ in ruins[:8]) if ruins else ''))
    else:
        ok(True, 'toques: sem elementos medidos')
    # as contas do roteiro
    ok(3 * 360 == 1080 and 1080 * 0.5 == 540 and 1080 - 540 == 540 and 2 * 360 == 720, 'contas: 3 × R$ 360 = R$ 1.080; 50% = R$ 540; R$ 1.080 − R$ 540 = R$ 540; 2 × R$ 360 = R$ 720')
    res = 'RESULTADO: ' + ('aprovado' if not falhas else 'ajustar')
    txt = f'NO-SHOW — conferência do slide {n:02d} ({dur:g} s)\n\n' + '\n'.join(rel + ['', res]) + '\n'
    os.makedirs(REV, exist_ok=True)
    open(os.path.join(REV, f'conferencia-{n:02d}.txt'), 'w').write(txt)
    print(txt)
    return not falhas, txt


VALORES = {2: ['R$ 540', '22h', '27/12', '28/12'], 3: ['26/12 a 29/12', '3 noites', 'R$ 1.080', 'R$ 540', '22h'], 6: ['R$ 1.080', 'R$ 360', 'R$ 540'],
           7: ['26/12', '27/12', '28/12', 'R$ 360', 'R$ 720'], 4: ['14h–22h']}
alvos = [int(a) for a in sys.argv[1:]] or [n for n in range(1, 9) if os.path.exists(os.path.join(OUT, f'{n:02d}.mp4'))]
res = [confere(n) for n in alvos]
if not sys.argv[1:]:
    geral = 'NO-SHOW — conferência dos 8 slides\n\n' + '\n'.join(t_ for _, t_ in res) + '\nRESULTADO GERAL: ' + ('aprovado' if all(r for r, _ in res) else 'ajustar') + '\n'
    open(os.path.join(REV, 'conferencia.txt'), 'w').write(geral)
sys.exit(0 if all(r for r, _ in res) else 1)
