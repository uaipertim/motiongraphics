"""Monta uma grade de imagens com rótulos (para revisar quadros).
uso: python3 montagem.py saida.jpg colunas largura_miniatura img1 img2 ...
"""
import sys
from PIL import Image, ImageDraw, ImageFont


def monta(saida, cols, larg, arquivos, rotulos=None):
    ims = [Image.open(a).convert('RGB') for a in arquivos]
    alt = int(larg * ims[0].height / ims[0].width)
    linhas = (len(ims) + cols - 1) // cols
    pad, topo = 8, 26
    folha = Image.new('RGB', (cols * (larg + pad) + pad, linhas * (alt + pad + topo) + pad), (40, 40, 40))
    d = ImageDraw.Draw(folha)
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
    except OSError:
        f = ImageFont.load_default()
    for i, im in enumerate(ims):
        x = pad + (i % cols) * (larg + pad)
        y = pad + (i // cols) * (alt + pad + topo)
        folha.paste(im.resize((larg, alt), Image.LANCZOS), (x, y + topo))
        r = rotulos[i] if rotulos else arquivos[i].rsplit('/', 1)[-1]
        d.text((x + 2, y + 3), r, fill=(230, 230, 230), font=f)
    folha.save(saida, quality=88)


if __name__ == '__main__':
    monta(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:])
