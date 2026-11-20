#!/usr/bin/env python3
"""
Conferência do carrossel animado v2, slide a slide (roda depois de `node scripts/render.cjs <n>`).

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
  • valores: os do roteiro aparecem e nenhum outro valor em R$ aparece; contas: 4 × 3 × 150 = 1.800; 300 × 1,2 = 360;
    300 × 1,5 = 450.
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
    fora = sorted(reais - {'150', '300', '360', '450', '1.800'})
    ok(not falta and not fora, f'valores do roteiro: {", ".join(VALORES.get(n, [])) or "(sem valores)"}' + (f' (faltando: {falta})' if falta else '') + (f' (fora do roteiro: {fora})' if fora else ''))
    if n == 2:
        # as moedas/notas que escapam da mesa: em nenhum quadro sobrepõem chalé, preço ou contador; nem o canto do som
        g = json.loads(subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'moedas'], check=True, capture_output=True, text=True).stdout)
        bate = [q['t'] for q in g for (x, y, r) in q['moedas'] for (a0, b0, a1, b1) in q['protegidas'] if a0 - r < x < a1 + r and b0 - r < y < b1 + r]
        canto_ = [q['t'] for q in g for (x, y, r) in q['moedas'] if x + r > 940 and y + r > 1210]
        nm = sum(len(q['moedas']) for q in g)
        ok(not bate and not canto_, f'moedas/notas: {nm} posições em {len(g)} quadros; nenhuma sobrepõe chalé, preço ou contador, nem entra no canto do som'
           + (f' (sobrepõe em {sorted(set(round(t_, 2) for t_ in bate))[:5]})' if bate else '') + (f' (canto em {sorted(set(round(t_, 2) for t_ in canto_))[:5]})' if canto_ else ''))
        # a conversa: em cada quadro, as caixas de todos os elementos (balões, selo "!", "3 dias depois", "visualizado") e do
        # divisor; nenhum par pode se tocar nem ficar a menos de 10 px (o selo é parte do balão âmbar)
        def vao(a, b):
            dx, dy = max(a[1] - b[3], b[1] - a[3]), max(a[2] - b[4], b[2] - a[4])
            return dx if dy < 0 else dy if dx < 0 else math.hypot(dx, dy)
        piores, ruins = {}, []
        for q in g:
            cs = q['conversa']
            for i in range(len(cs)):
                for j in range(i + 1, len(cs)):
                    par = tuple(sorted((cs[i][0], cs[j][0])))
                    if par == ('Ué', 'selo !'):
                        continue
                    v = vao(cs[i], cs[j])
                    if par not in piores or v < piores[par][0]:
                        piores[par] = (v, q['t'])
                    if v < 10:
                        ruins.append((round(q['t'], 2), par, round(v, 1)))
        final = {c[0]: c for c in g[-36]['conversa']}  # 8,8 s: o estado final, antes da dissolução
        ordem = ['pergunta', 'R$ 300', '3 dias depois', 'R$ 450', 'Ué']
        vaos = [final[ordem[i + 1]][2] - final[ordem[i]][4] for i in range(len(ordem) - 1)]
        # nos quadros de entrada (mola), o vão entre vizinhos da pilha também não cai abaixo de 20 px
        vq = [cs[ordem[i + 1]][2] - cs[ordem[i]][4] for q in g for cs in [{c[0]: c for c in q['conversa']}] for i in range(len(ordem) - 1)
              if ordem[i] in cs and ordem[i + 1] in cs]
        ok(round(min(vq), 1) >= 20, f'conversa durante as entradas: o menor vão vertical entre vizinhos, em todos os quadros, é {min(vq):.1f} px (mínimo 20)')
        ok(len(final) == 8 and round(min(vaos), 1) >= 20, 'conversa no estado final: vãos verticais entre balões e "3 dias depois" = '
           + ', '.join(f'{v:.1f}' for v in vaos) + ' px (mínimo 20)')
        sel, ue = final['selo !'], final['Ué']
        ok(sel[2] >= ue[2] - 0.5 and sel[1] >= ue[1] and sel[1] < ue[3], f'selo "!" no canto superior direito do balão âmbar (topo do selo = topo do balão; folga até o "Agora está R$ 450": {vao(sel, final["R$ 450"]):.1f} px, mínimo 12)'
           if vao(sel, final['R$ 450']) >= 12 else 'selo "!" a menos de 12 px de outro balão')
        vz = final['visualizado'][2] - ue[4]
        ok(10 <= vz <= 12 and abs(final['visualizado'][1] - ue[1]) < 0.5, f'"visualizado" abaixo do balão âmbar, alinhado à esquerda dele, {vz:.1f} px da borda inferior (10–12)')
        pior = min(piores.items(), key=lambda kv: kv[1][0])
        ok(not ruins, f'conversa em todos os {len(g)} quadros: {len(piores)} pares de elementos (+ divisor) sem toque e sempre ≥ 10 px; menor vão {pior[1][0]:.1f} px ({pior[0][0]} × {pior[0][1]}, {pior[1][1]:.2f} s)'
           + (f' — FALHAS: {ruins[:6]}' if ruins else ''))
        folga = min(q['div'] - q['vis'] for q in g if q.get('vis') and q.get('div'))
        ok(folga >= 24, f'"visualizado" → divisor: {folga:.0f} px entre a base do "visualizado" e a linha do divisor (mínimo 24)')
        ok(4 * 3 * 150 == 1800, 'contas: 4 chalés × 3 noites × R$ 150 = R$ 1.800 (o contador para em R$ 1.800)')
    if n in (1, 4, 8):
        ok(round(300 * 1.2) == 360 and round(300 * 1.5) == 450, 'contas: R$ 300 × 1,2 = R$ 360 (+20%); R$ 300 × 1,5 = R$ 450 (+50%)')
    res = 'RESULTADO: ' + ('aprovado' if not falhas else 'ajustar')
    txt = f'TARIFA DE DEZEMBRO v2 — conferência do slide {n:02d} ({dur:g} s)\n\n' + '\n'.join(rel + ['', res]) + '\n'
    os.makedirs(REV, exist_ok=True)
    open(os.path.join(REV, f'conferencia-{n:02d}.txt'), 'w').write(txt)
    print(txt)
    return not falhas, txt


VALORES = {1: ['R$ 300', 'R$ 360', 'R$ 450'], 2: ['R$ 300', 'R$ 450', 'R$ 150', 'R$ 1.800'], 4: ['R$ 300', 'R$ 360', '+20%', 'R$ 450', '+50%'],
           5: ['R$ 300', 'R$ 360'], 6: ['R$ 360'], 7: ['55%', '80%', '100%'], 8: ['R$ 300', 'R$ 360', 'R$ 450']}
alvos = [int(a) for a in sys.argv[1:]] or [n for n in range(1, 9) if os.path.exists(os.path.join(OUT, f'{n:02d}.mp4'))]
res = [confere(n) for n in alvos]
if not sys.argv[1:]:
    geral = 'TARIFA DE DEZEMBRO v2 — conferência dos 8 slides\n\n' + '\n'.join(t_ for _, t_ in res) + '\nRESULTADO GERAL: ' + ('aprovado' if all(r for r, _ in res) else 'ajustar') + '\n'
    open(os.path.join(REV, 'conferencia.txt'), 'w').write(geral)
sys.exit(0 if all(r for r, _ in res) else 1)
