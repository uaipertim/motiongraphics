#!/usr/bin/env python3
"""
Prévias dos Stories para Destaque.

    python3 scripts/previa.py capas          -> output/capas/previa-perfil.jpg  (as capas em círculos, como no perfil)
    python3 scripts/previa.py dicas          -> output/dicas/previa.jpg         (1 quadro de cada Story, lado a lado)
"""
import json
import os
import subprocess
import sys
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'src', 'fonts', 'InterDisplay-SemiBold.otf')
MONO = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
arg = sys.argv[1] if len(sys.argv) > 1 else 'capas'

if arg == 'capas':
    lista = json.load(open(os.path.join(ROOT, 'capas.json')))['previa']
    D, G, PAD = 220, 70, 60                              # o círculo da capa, o espaço entre eles
    W = PAD * 2 + len(lista) * D + (len(lista) - 1) * G
    for fundo, cor, nome in (((0, 0, 0), (245, 245, 245), 'previa-perfil.jpg'), ((255, 255, 255), (20, 20, 20), 'previa-perfil-claro.jpg')):
        im = Image.new('RGB', (W, D + 150), fundo)
        dr = ImageDraw.Draw(im)
        f = ImageFont.truetype(FONT, 30)
        for i, c in enumerate(lista):
            src = Image.open(os.path.join(ROOT, c['arquivo'])).convert('RGB').resize((D, D), Image.LANCZOS)
            m = Image.new('L', (D * 4, D * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, D * 4 - 1, D * 4 - 1), fill=255); m = m.resize((D, D), Image.LANCZOS)
            x = PAD + i * (D + G)
            # o anel cinza do Instagram em volta do Destaque
            dr.ellipse((x - 8, PAD - 8, x + D + 8, PAD + D + 8), outline=(120, 120, 120) if fundo == (0, 0, 0) else (200, 200, 200), width=3)
            im.paste(src, (x, PAD), m)
            tw = dr.textlength(c['nome'], font=f)
            dr.text((x + D / 2 - tw / 2, PAD + D + 26), c['nome'], font=f, fill=cor)
        im.save(os.path.join(ROOT, 'output', 'capas', nome), quality=92)
    print('ok -> output/capas/previa-perfil.jpg (+ previa-perfil-claro.jpg)')
else:
    ID = arg
    MOT = json.load(open(os.path.join(ROOT, 'output', ID, 'revisao', 'motor.json')))
    TW, TH, G = 360, 640, 16
    im = Image.new('RGB', (G + len(MOT) * (TW + G), TH + 2 * G + 44), (14, 14, 14))
    dr = ImageDraw.Draw(im)
    f = ImageFont.truetype(MONO, 22)
    with tempfile.TemporaryDirectory() as tmp:
        for k, s in enumerate(MOT):
            t = s['fecho']['wipe'] - 0.3 if s['fecho'] else s['dur'] - 0.4          # o Story pronto (no fecho, antes da logo)
            pth = os.path.join(tmp, f'{k}.png')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.2f}', '-i', os.path.join(ROOT, 'output', ID, f'{k + 1:02d}.mp4'), '-frames:v', '1', pth], check=True)
            x = G + k * (TW + G)
            im.paste(Image.open(pth).convert('RGB').resize((TW, TH), Image.LANCZOS), (x, G))
            dr.text((x, TH + G + 10), f'{k + 1:02d}.mp4 · {t:.1f} s', font=f, fill=(175, 250, 39))
    im.save(os.path.join(ROOT, 'output', ID, 'previa.jpg'), quality=88)
    print(f'ok -> output/{ID}/previa.jpg')
