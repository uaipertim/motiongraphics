"""Folha de contato a partir de quadros (q_<tempo>.png|jpg).

Uso: python3 scripts/folha.py DIR saida.jpg [--col 6] [--larg 270] [--rotulos arquivo.json]
"""
import glob
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont


def main():
    args = sys.argv[1:]
    pasta, saida = args[0], args[1]
    col = int(args[args.index("--col") + 1]) if "--col" in args else 6
    larg = int(args[args.index("--larg") + 1]) if "--larg" in args else 270
    rot = json.load(open(args[args.index("--rotulos") + 1], encoding="utf-8")) if "--rotulos" in args else {}
    arqs = sorted(glob.glob(os.path.join(pasta, "q_*.png")) + glob.glob(os.path.join(pasta, "q_*.jpg")))
    alt = round(larg * 1920 / 1080)
    faixa = 30
    lin = (len(arqs) + col - 1) // col
    folha = Image.new("RGB", (col * (larg + 8) + 8, lin * (alt + faixa + 8) + 8), (26, 26, 24))
    d = ImageDraw.Draw(folha)
    try:
        fonte = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
    except OSError:
        fonte = ImageFont.load_default()
    for i, a in enumerate(arqs):
        t = float(os.path.basename(a)[2:].rsplit(".", 1)[0])
        im = Image.open(a).convert("RGB").resize((larg, alt), Image.LANCZOS)
        x, y = 8 + (i % col) * (larg + 8), 8 + (i // col) * (alt + faixa + 8)
        folha.paste(im, (x, y + faixa))
        txt = f"{int(t // 60)}:{t % 60:05.2f}"
        extra = rot.get(f"{t:.3f}") or rot.get(str(t))
        if extra:
            txt += "  " + extra
        d.text((x + 2, y + 6), txt, fill=(175, 250, 39), font=fonte)
    folha.save(saida, quality=88)
    print(saida, folha.size, len(arqs), "quadros")


if __name__ == "__main__":
    main()
