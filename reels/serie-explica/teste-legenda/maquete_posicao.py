#!/usr/bin/env python3
"""
Maquete (Passo 1): onde a legenda palavra por palavra caberia na Série Explica, sobre quadros reais do explica-02
(o vídeo publicado, só lido). Nada é renderizado nem alterado no episódio.

    python3 teste-legenda/maquete_posicao.py   -> teste-legenda/maquete-posicao.jpg

Para cada tipo de cena, duas colunas:
  A · na faixa da linha de apoio (entre o título e o diagrama), que a legenda substituiria;
  B · embaixo, na posição da Série Fala e do reel-09 (linhas em y 1332 e 1412).
A legenda é a 1ª página da fala do capítulo, em Inter Display 900, 68 px, centrada em x 540 e limitada a x 130–950;
em vermelho, o que ela cobriria (as caixas do motor naquele instante, com 12 px de folga); a linha tracejada é y 1536.
"""
import json
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = 'explica-02'
VID = os.path.join(R, 'output', EP, f'fazlo-hospeda-{EP}.mp4')
LN = json.load(open(os.path.join(R, 'audio', EP, 'linha.json')))
CX = json.load(open(os.path.join(R, 'output', EP, 'revisao', 'caixas.json')))
F = ImageFont.truetype(os.path.join(R, 'src', 'fonts', 'InterDisplay-Black.otf'), 68)
FL = ImageFont.truetype(os.path.join(R, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf'), 30)
LIME, MAXW, FOLGA = (175, 250, 39), 820, 12


def larg(s):
    return F.getlength(s)


def pagina(ws, linhas):
    """a 1ª página: até `linhas` linhas de até 820 px"""
    out, cur = [], []
    for w in ws:
        if cur and larg(' '.join(cur + [w])) > MAXW:
            out.append(cur); cur = []
            if len(out) == linhas:
                break
        cur.append(w)
    if cur and len(out) < linhas:
        out.append(cur)
    return [' '.join(l) for l in out]


def quadro(t):
    with tempfile.NamedTemporaryFile(suffix='.png') as f:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', VID, '-frames:v', '1', f.name], check=True)
        return Image.open(f.name).convert('RGB')


def caixas(t):
    s = min(CX, key=lambda s: abs(s['t'] - t))
    return [b for b in s['caixas'] if not b.get('tipo') and not b['nome'].startswith('apoio')]


def desenha(im, t, linhas, y1, rotulo):
    d = ImageDraw.Draw(im, 'RGBA')
    box = []
    for k, l in enumerate(linhas):
        y = y1 + k * 80 + (40 if len(linhas) == 1 and rotulo.startswith('B') else 0)
        w = larg(l); x = 540 - w / 2
        d.text((x + 2, y + 3), l, font=F, fill=(0, 0, 0, 200), anchor='ls')
        d.text((x, y), l, font=F, fill=(255, 255, 255), anchor='ls')
        box.append((x, y - 0.76 * 68, x + w, y + 0.22 * 68))
    x0, y0, x1, yb = min(b[0] for b in box), min(b[1] for b in box), max(b[2] for b in box), max(b[3] for b in box)
    bate = [b for b in caixas(t) if b['x0'] < x1 + FOLGA and b['x1'] > x0 - FOLGA and b['y0'] < yb + FOLGA and b['y1'] > y0 - FOLGA]
    for b in bate:
        d.rectangle((b['x0'], b['y0'], b['x1'], b['y1']), fill=(255, 40, 60, 70), outline=(255, 40, 60, 255), width=4)
    d.rectangle((x0, y0, x1, yb), outline=LIME + (255,), width=3)
    d.line((0, 1536, 1080, 1536), fill=(255, 40, 60, 255), width=3)
    d.rectangle((0, 0, 1079, 1919), outline=(80, 80, 80, 255), width=2)
    return [b['nome'] for b in bate], (round(y0), round(yb))


casos = []
for c in LN['capitulos']:
    tipo = c['diagrama']['tipo']
    if tipo not in ('capa', 'colisao', 'agenda', 'bloqueio', 'consulta', 'passos', 'fecho'):
        continue
    t = (c['t0'] + 3.0) if tipo in ('capa', 'fecho') else c['t1'] - 0.4
    casos.append((c, tipo, t, [w['w'] for w in c['palavras']]))
fc = LN['capitulos'][-1]
casos.append((fc, 'fecho (logo)', LN['duracao'] - 1.0, [w['w'] for w in fc['palavras']][-6:]))

TW, TH = 360, 640
POR = 4                                                    # casos por fileira
sheet = Image.new('RGB', (POR * (2 * TW + 30) + 20, 2 * (TH + 150)), (24, 24, 24))
ds = ImageDraw.Draw(sheet)
rel = []
for i, (c, tipo, t, ws) in enumerate(casos):
    base = quadro(t)
    for j, (rot, linhas, y1) in enumerate((('A · faixa do apoio', pagina(ws, 1), 790), ('B · embaixo (Fala)', pagina(ws, 2), 1332))):
        im = base.copy()
        bate, faixa = desenha(im, t, linhas, y1, rot)
        x = 20 + (i % POR) * (2 * TW + 30) + j * TW; oy = (i // POR) * (TH + 150)
        sheet.paste(im.resize((TW, TH), Image.LANCZOS), (x, oy + 70))
        ds.text((x + 6, oy + 720), rot, font=FL, fill=LIME if not bate else (255, 90, 100))
        ds.text((x + 6, oy + 756), ('livre' if not bate else 'cobre: ' + ', '.join(sorted(set(n.split(',')[0] for n in bate)))[:34]), font=ImageFont.truetype(os.path.join(R, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf'), 18), fill=(220, 220, 220))
        rel.append({'capitulo': c['n'], 'tipo': tipo, 't': round(t, 2), 'opcao': rot, 'linhas': linhas, 'y': faixa, 'cobre': sorted(set(bate))})
    ds.text((20 + (i % POR) * (2 * TW + 30) + 6, (i // POR) * (TH + 150) + 18), f'cap {c["n"]:02d} · {tipo}', font=FL, fill=(240, 240, 240))
sheet.save(os.path.join(R, 'teste-legenda', 'maquete-posicao.jpg'), quality=86)
json.dump(rel, open(os.path.join(R, 'teste-legenda', 'maquete-posicao.json'), 'w'), ensure_ascii=False, indent=1)
for r in rel:
    print(f"cap {r['capitulo']:02d} {r['tipo']:13s} {r['opcao']:20s} y {r['y'][0]}–{r['y'][1]} · {'livre' if not r['cobre'] else 'cobre ' + ', '.join(r['cobre'])}")
