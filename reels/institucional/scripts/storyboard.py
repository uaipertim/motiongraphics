#!/usr/bin/env python3
"""
Storyboard do institucional a partir do motor (quadros renderizados direto do canvas).

    python3 scripts/storyboard.py   ->  output/storyboard.jpg
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
SHOTS = [
    (0.0, '1 · MINIATURA'), (3.8, '1 · A DOR'), (6.15, '2 · BAGUNÇA SOME'), (8.9, '2 · A VIRADA'),
    (10.4, '2 · O CELULAR CHEGA'), (12.5, '3 · OCUPAÇÃO'), (14.4, '3 · TOTAL R$ 800,00'), (15.8, '3 · RESERVA CRIADA'),
    (18.9, '3 · VOUCHER S/ NOME'), (22.6, '4 · SALDO R$ 500,00'), (25.6, '4 · RECIBO QUITADO'), (28.7, '5 · COMANDA ABERTA'),
    (30.7, '5 · LANÇAR CONSUMO'), (33.2, '5 · NA CONTA DELE'), (36.6, '6 · ENTRA NO CAIXA'), (38.8, '6 · FECHAR O CAIXA'),
    (41.2, '6 · QUANTO ENTROU'), (44.4, '7 · CHECK-OUT'), (45.9, '7 · RECIBO'), (48.0, '7 · RELATÓRIOS'),
    (50.6, '7 · PAGAMENTOS'), (54.6, '8 · CELULAR + PC'), (57.2, '8 · TESTE NA DEMO'), (59.9, '8 · ÚLTIMO QUADRO'),
]
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
