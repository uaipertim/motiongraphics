#!/usr/bin/env python3
"""
Storyboard do institucional a partir do motor (quadros renderizados direto do canvas).

    python3 scripts/storyboard.py   ->  output/storyboard.jpg
"""
import json
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
# os quadros saem da linha do tempo do motor (audio/cues.json): as cenas 1, 2 e 8 e o meio da pausa de cada recorte
D = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))
T, REC = D['cenas'], D['recortes']
NOME = {'calendario': '3 · OCUPAÇÃO', 'acomodacao': '3 · TOTAL R$ 800', 'criada': '3 · RESERVA CRIADA', 'voucher': '3 · VOUCHER',
        'checkin': '4 · SALDO R$ 500', 'reciboIn': '4 · RECIBO QUITADO', 'quantidade': '5 · LANÇAR CONSUMO',
        'lancado': '5 · NA CONTA DELE', 'caixaRolagem': '6 · ENTRA NO CAIXA', 'fecharCaixa': '6 · FECHAR O CAIXA',
        'checkout': '7 · CHECK-OUT', 'reciboOut': '7 · RECIBO', 'relatorios': '7 · RELATÓRIOS'}
SHOTS = [(0.0, '1 · MINIATURA'), (3.8, '1 · A DOR'), (T['virada'] + 0.1, '2 · BAGUNÇA SOME'), (9.6, '2 · A VIRADA'),
         (T['celular'] + 0.8, '2 · O CELULAR')]
vistos = set()
for r in REC:
    if r['tela'] in vistos:
        continue
    vistos.add(r['tela'])
    SHOTS.append((round((r['t0'] + 0.5 + r['t1']) / 2, 2), NOME[r['tela']]))
SHOTS += [(round(T['fechamento'] + 3.0, 2), '8 · CELULAR + PC'), (round(T['demo'] + 2.0, 2), '8 · TESTE NA DEMO'),
          (round(D['duration'] - 0.1, 2), '8 · ÚLTIMO QUADRO')]
COLS, TW, TH, PAD, LAB = 8, 270, 480, 14, 40
DIR = tempfile.mkdtemp()
subprocess.run(['node', os.path.join(ROOT, 'scripts', 'render.cjs'), 'stills', ','.join(str(t) for t, _ in SHOTS), '--dir', DIR],
               check=True, capture_output=True)
rows = (len(SHOTS) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (TW + PAD) + PAD, rows * (TH + LAB + PAD) + PAD), (10, 10, 10))
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype(FONT, 15)
for i, (t, label) in enumerate(SHOTS):
    im = Image.open(os.path.join(DIR, f't{t:05.2f}.png')).convert('RGB').resize((TW, TH), Image.LANCZOS)
    x, y = PAD + (i % COLS) * (TW + PAD), PAD + (i // COLS) * (TH + LAB + PAD)
    sheet.paste(im, (x, y))
    draw.text((x, y + TH + 10), f'{t:05.2f}s {label}', font=font, fill=(175, 250, 39))
sheet.save(os.path.join(ROOT, 'output', 'storyboard.jpg'), quality=88)
for f in os.listdir(DIR):
    os.remove(os.path.join(DIR, f))
os.rmdir(DIR)
print('ok -> output/storyboard.jpg')
