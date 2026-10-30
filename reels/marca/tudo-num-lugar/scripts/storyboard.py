#!/usr/bin/env python3
"""
Storyboard: a capa + um quadro por cena (no fim de cada uma), tirado do vídeo (a prévia ou o final), com o tempo, a duração e a fala.

    python3 scripts/storyboard.py            -> output/storyboard.jpg (da output/previa.mp4)
    python3 scripts/storyboard.py --final    -> idem, da output/tudo-num-lugar.mp4
"""
import json
import os
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'output')
VIDEO = os.path.join(OUT, 'tudo-num-lugar.mp4' if '--final' in sys.argv else 'previa.mp4')
INFO = json.load(open(os.path.join(OUT, 'info.json')))
LN = json.load(open(os.path.join(ROOT, 'linha.json')))
CN = INFO['plano']['cenas']
NOME = {'gancho': 'gancho (a cena se monta)', 'problema': 'problema', 'virada': 'virada (logo + junta)', 'modulos': 'módulos (cascata 3D)',
        'pedacos': 'pedaços (R$ 450 → R$ 1.020)', 'fecho': 'fecho limão (telaDestaque)', 'chamada': 'chamada (WhatsApp)'}
dur = LN['duracao']
# um quadro por cena, no fim dela (tudo já entrou); a capa (desenhada à parte) abre a folha
ts = [('capa', None)] + [(c['id'], round(c['t1'] - 0.3, 2)) for c in CN]
palavras = [w for f in LN['frases'] for w in f['palavras']]
font_path = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
F1, F2 = ImageFont.truetype(font_path, 17), ImageFont.truetype(font_path, 15)
TW, TH, COLS = 270, 480, 8
rows = (len(ts) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (TW + 12) + 12, rows * (TH + 120) + 12), (24, 24, 24))
d = ImageDraw.Draw(sheet)
for i, (nome, t) in enumerate(ts):
    if t is None:
        im = Image.open(os.path.join(OUT, 'capa.png')).convert('RGB').resize((TW, TH), Image.LANCZOS)
        cena = None
    else:
        png = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', VIDEO, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
        im = Image.open(__import__('io').BytesIO(png)).convert('RGB').resize((TW, TH), Image.LANCZOS)
        cena = next(c for c in CN if c['id'] == nome)
    x, y = 12 + (i % COLS) * (TW + 12), 12 + (i // COLS) * (TH + 120)
    sheet.paste(im, (x, y))
    d.text((x, y + TH + 8), 'capa' if cena is None else f'{i:02d} · {cena["t0"]:.1f}–{cena["t1"]:.1f}s ({cena["t1"] - cena["t0"]:.1f} s)', fill=(175, 250, 39), font=F1)
    d.text((x, y + TH + 30), 'desenhada à parte' if cena is None else NOME.get(nome, nome)[:30], fill=(175, 250, 39), font=F1)
    fala = '' if cena is None else ' '.join(w['w'] for w in palavras if cena['t0'] - 0.05 <= w['t0'] < cena['t1'])
    linhas, cur = [], ''
    for w in (fala or '—').split():
        if len(cur) + len(w) + 1 > 31:
            linhas.append(cur); cur = w
        else:
            cur = (cur + ' ' + w).strip()
    linhas.append(cur)
    for k, l in enumerate(linhas[:3]):
        d.text((x, y + TH + 54 + k * 19), l, fill=(220, 220, 220), font=F2)
sheet.save(os.path.join(OUT, 'storyboard.jpg'), quality=88)
print('storyboard.jpg:', len(ts), 'cenas')
