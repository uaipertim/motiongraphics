#!/usr/bin/env python3
"""
Storyboard: um quadro por cena, tirado do vídeo (a prévia ou o final), com o nome da cena, o tempo e a fala.

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
C = INFO['plano']['cortes']
NOME = {'capa': 'capa (quadro 0)', 'whatsapp': 'gancho · WhatsApp', 'pix': 'gancho · PIX', 'caderno': 'gancho · caderno', 'eno': 'problema · check-out',
        'ninguem': 'problema · ninguém sabe', 'falta': 'problema · quanto falta?', 'logo': 'virada · logo', 'tudoisso': 'virada · tudo isso',
        'modulos': 'módulos (cascata 3D)', 'ocupacao': 'pedaços · ocupação', 'sinal': 'pedaços · sinal R$ 450', 'comanda': 'pedaços · comanda',
        'checkout': 'pedaços · check-out R$ 1.020', 'limao': 'fecho (ato limão)', 'chamada': 'chamada (WhatsApp)'}
dur = LN['duracao']
ts = []
for i, c in enumerate(C):
    t1 = C[i + 1]['t'] if i + 1 < len(C) else dur
    # o fim da cena: tudo já entrou (e o cartão ainda não começou a sair)
    ts.append((c['cena'], 0.0 if c['cena'] == 'capa' else round(max(c['t'] + 0.3, t1 - (0.3 if c['cena'] == 'chamada' else 0.4)), 2)))
palavras = [w for f in LN['frases'] for w in f['palavras']]
font_path = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
F1, F2 = ImageFont.truetype(font_path, 17), ImageFont.truetype(font_path, 15)
TW, TH, COLS = 270, 480, 8
rows = (len(ts) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (TW + 12) + 12, rows * (TH + 120) + 12), (24, 24, 24))
d = ImageDraw.Draw(sheet)
for i, (nome, t) in enumerate(ts):
    png = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', VIDEO, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
    im = Image.open(__import__('io').BytesIO(png)).convert('RGB').resize((TW, TH), Image.LANCZOS)
    x, y = 12 + (i % COLS) * (TW + 12), 12 + (i // COLS) * (TH + 120)
    sheet.paste(im, (x, y))
    d.text((x, y + TH + 8), f'{i + 1:02d} · {t:05.2f}s', fill=(175, 250, 39), font=F1)
    d.text((x, y + TH + 30), NOME.get(nome, nome)[:30], fill=(175, 250, 39), font=F1)
    fala = ' '.join(w['w'] for w in palavras if C[i]['t'] - 0.05 <= w['t0'] < (C[i + 1]['t'] if i + 1 < len(C) else dur)) or '—'
    linhas, cur = [], ''
    for w in fala.split():
        if len(cur) + len(w) + 1 > 31:
            linhas.append(cur); cur = w
        else:
            cur = (cur + ' ' + w).strip()
    linhas.append(cur)
    for k, l in enumerate(linhas[:3]):
        d.text((x, y + TH + 54 + k * 19), l, fill=(220, 220, 220), font=F2)
sheet.save(os.path.join(OUT, 'storyboard.jpg'), quality=88)
print('storyboard.jpg:', len(ts), 'cenas')
