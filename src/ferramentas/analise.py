"""analise.py — 'assiste' ao vídeo: folha de contato (2 q/s) e movimento (diferença média entre quadros a 10 q/s).

uso: python3 src/ferramentas/analise.py output/experimento.mp4 [--folha output/folha-contato.jpg] [--json build/movimento.json]
Critérios: mediana da diferença ≥ 1,0; nenhum trecho parado > 0,5 s (parado = diferença < LIMIAR_PARADO).
"""
import json
import subprocess
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

LIMIAR_PARADO = 0.5


def quadros(video, fps, w, h, fps_origem=60):
    passo = int(round(fps_origem / fps))
    filtro = f"select='not(mod(n,{passo}))',scale={w}:{h}:flags=area"
    cmd = ['ffmpeg', '-v', 'error', '-i', video, '-vf', filtro, '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    tam = w * h * 3
    while True:
        b = p.stdout.read(tam)
        if len(b) < tam:
            break
        yield np.frombuffer(b, np.uint8).reshape(h, w, 3)
    p.wait()


def movimento(video):
    difs = []
    ant = None
    for q in quadros(video, 10, 1080, 1920):
        q = q.astype(np.int16)
        if ant is not None:
            difs.append(float(np.mean(np.abs(q - ant))))
        ant = q
    d = np.array(difs)
    # trechos parados: sequências consecutivas abaixo do limiar
    parados = []
    i = 0
    while i < len(d):
        if d[i] < LIMIAR_PARADO:
            j = i
            while j < len(d) and d[j] < LIMIAR_PARADO:
                j += 1
            dur = (j - i) / 10.0
            parados.append({'ini': round(i / 10.0, 2), 'dur': dur, 'min': float(d[i:j].min())})
            i = j
        else:
            i += 1
    janela = 5
    medias = np.convolve(d, np.ones(janela) / janela, mode='valid')
    return {
        'mediana': float(np.median(d)), 'media': float(d.mean()), 'p10': float(np.percentile(d, 10)),
        'minimo': float(d.min()), 'minimo_t': float(np.argmin(d) / 10.0),
        'menor_media_0_5s': float(medias.min()), 'menor_media_0_5s_t': float(np.argmin(medias) / 10.0),
        'trechos_parados': parados, 'maior_parado_s': max([p['dur'] for p in parados], default=0.0),
        'difs': [round(x, 3) for x in d.tolist()],
    }


def folha(video, saida, cols=12, larg=170):
    ims = list(quadros(video, 2, larg, int(larg * 1920 / 1080)))
    alt = ims[0].shape[0]
    linhas = (len(ims) + cols - 1) // cols
    pad, topo = 6, 22
    F = Image.new('RGB', (cols * (larg + pad) + pad, linhas * (alt + pad + topo) + pad + 40), (28, 28, 28))
    d = ImageDraw.Draw(F)
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
        ft = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
    except OSError:
        f = ft = ImageFont.load_default()
    d.text((pad, 10), 'FAZLO Hospeda · experimento "Casa cheia" · folha de contato (2 quadros por segundo)', fill=(240, 240, 240), font=ft)
    for i, im in enumerate(ims):
        x = pad + (i % cols) * (larg + pad)
        y = 40 + pad + (i // cols) * (alt + pad + topo)
        F.paste(Image.fromarray(im), (x, y + topo))
        d.text((x + 2, y + 3), f'{i * 0.5:05.1f} s', fill=(200, 200, 200), font=f)
    F.save(saida, quality=90)
    return len(ims)


if __name__ == '__main__':
    video = sys.argv[1]
    args = sys.argv[2:]
    out = {}
    if '--folha' in args:
        n = folha(video, args[args.index('--folha') + 1])
        out['quadros_folha'] = n
    m = movimento(video)
    out.update({k: v for k, v in m.items() if k != 'difs'})
    print(json.dumps(out, indent=1, ensure_ascii=False))
    if '--json' in args:
        json.dump(m, open(args[args.index('--json') + 1], 'w'))
