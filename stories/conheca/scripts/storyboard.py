#!/usr/bin/env python3
"""
Storyboard dos 4 Stories a partir dos vídeos finais (uma linha por Story).

    python3 scripts/storyboard.py   ->  output/storyboard.jpg
"""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = ['marca', 'reservas', 'financeiro', 'convite']
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
SHOTS = {
    1: [(0.45, 'A FITA ENTRA'), (1.05, 'A LOGO'), (1.8, 'CONHEÇA O FAZLO'), (3.7, 'UM SÓ SISTEMA'), (6.2, 'MÓDULOS'), (7.7, 'SAI PELA DIREITA')],
    2: [(0.45, 'O CORDÃO'), (1.9, 'AS CHAVES'), (2.9, 'O STATUS VIRA'), (4.2, 'CADA ACOMODAÇÃO'), (6.9, 'DIA · SEMANA · MÊS'), (7.75, 'SAI PELA DIREITA')],
    3: [(1.0, 'A ESTEIRA'), (2.15, 'A COMANDA SOMA'), (3.6, 'PAGAMENTO'), (4.0, 'QUITADO'), (6.4, 'O CAIXA'), (7.75, 'SAI PELA DIREITA')],
    4: [(0.45, 'A MOLDURA'), (0.75, 'A LOGO'), (1.6, 'O CONVITE'), (2.65, 'O DOMÍNIO'), (3.6, 'O LINK'), (7.6, 'PRONTO PARA TOCAR')],
}
TW, TH, PAD, LAB, HEAD = 250, 444, 12, 36, 46


def frame(path, t, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1', out], check=True)
    return Image.open(out).convert('RGB')


with tempfile.TemporaryDirectory() as tmp:
    cols = max(len(s) for s in SHOTS.values())
    sheet = Image.new('RGB', (cols * (TW + PAD) + PAD, 4 * (HEAD + TH + LAB + PAD) + PAD), (10, 10, 10))
    draw = ImageDraw.Draw(sheet)
    font, head = ImageFont.truetype(FONT, 15), ImageFont.truetype(FONT, 24)
    for n in (1, 2, 3, 4):
        video = os.path.join(ROOT, 'output', f'conheca-0{n}-{NAMES[n - 1]}.mp4')
        y = PAD + (n - 1) * (HEAD + TH + LAB + PAD)
        draw.text((PAD, y + 8), f'STORY {n} · {NAMES[n - 1].upper()}', font=head, fill=(175, 250, 39))
        for i, (t, label) in enumerate(SHOTS[n]):
            im = frame(video, t, os.path.join(tmp, f'{n}-{i}.png')).resize((TW, TH), Image.LANCZOS)
            x = PAD + i * (TW + PAD)
            sheet.paste(im, (x, y + HEAD))
            draw.text((x, y + HEAD + TH + 9), f'{t:4.2f}s  {label}', font=font, fill=(220, 220, 214))
    sheet.save(os.path.join(ROOT, 'output', 'storyboard.jpg'), quality=90)
print('ok -> output/storyboard.jpg')
