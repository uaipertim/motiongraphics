"""Confere os arquivos finais (não o projeto): formato, duração, tamanho, som,
movimento nas partes sem tela, cor da marca. Gera a folha de contato.

Uso: python3 scripts/conferir.py [--folha]
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from medir_audio import medir  # noqa: E402

MESTRE = "output/apresentacao.mp4"
LEVE = "output/apresentacao-whatsapp.mp4"


def sonda(arq):
    j = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", arq],
        capture_output=True, check=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    a = next(s for s in j["streams"] if s["codec_type"] == "audio")
    n, d = v["avg_frame_rate"].split("/")
    return dict(
        larg=v["width"], alt=v["height"], fps=round(int(n) / int(d), 3), codec=v["codec_name"],
        perfil=v.get("profile"), pix=v["pix_fmt"], cor=v.get("color_space"), quadros=int(v.get("nb_frames", 0)),
        dur=float(j["format"]["duration"]), mb=os.path.getsize(arq) / 1e6,
        kbps=int(j["format"]["bit_rate"]) / 1000, audio=f'{a["codec_name"]} {a["sample_rate"]} Hz {a["channels"]}ch',
        dur_audio=float(a.get("duration", 0)))


def quadros_cinza(arq, fps, larg=270, alt=480):
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", arq, "-vf", f"fps={fps},scale={larg}:{alt}:flags=area,format=gray",
         "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    tam = larg * alt
    while True:
        b = p.stdout.read(tam)
        if len(b) < tam:
            break
        yield np.frombuffer(b, np.uint8).reshape(alt, larg).astype(np.int16)


def trechos_parados(arq, fps=20, limiar=12, min_px=4):
    """Intervalos em que nada se move (nenhum grupo de pixels muda mais que `limiar`)."""
    ant, parado, ini, out = None, False, 0.0, []
    for i, q in enumerate(quadros_cinza(arq, fps)):
        if ant is not None:
            mexeu = int((np.abs(q - ant) > limiar).sum()) >= min_px
            t = i / fps
            if not mexeu and not parado:
                parado, ini = True, t - 1 / fps
            if mexeu and parado:
                parado = False
                out.append((ini, t - 1 / fps))
        ant = q
    if parado:
        out.append((ini, (i) / fps))
    return out


def audio_mono(arq, sr=8000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", arq, "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def atraso_do_som(arq, ref="audio/mix.wav", sr=8000, seg=(20.0, 80.0)):
    """Atraso (ms) do som do arquivo final em relação à mixagem (correlação cruzada)."""
    a, b = audio_mono(arq, sr), audio_mono(ref, sr)
    i0, i1 = int(seg[0] * sr), int(seg[1] * sr)
    x, y = a[i0:i1], b[i0:i1]
    n = 1
    while n < 2 * len(x):
        n *= 2
    c = np.fft.irfft(np.fft.rfft(x, n) * np.conj(np.fft.rfft(y, n)), n)
    k = int(np.argmax(c))
    if k > n // 2:
        k -= n
    return 1000.0 * k / sr


def legenda_aparece(arq, paginas, fps=60):
    """Para cada página: 1º quadro com texto na faixa da legenda, comparado com o tempo previsto."""
    difs = []
    for pg in paginas:
        t0 = max(0.0, pg["ini"] - 0.5)
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-ss", f"{t0:.3f}", "-i", arq, "-t", "1.2",
             "-vf", "crop=800:150:140:1382,scale=200:38:flags=area,format=gray", "-f", "rawvideo", "-"],
            capture_output=True, check=True).stdout
        q = np.frombuffer(raw, np.uint8)
        q = q[: (len(q) // (200 * 38)) * 200 * 38].reshape(-1, 38, 200)
        claro = (q > 110).sum(axis=(1, 2)).astype(int)
        # a página anterior some logo antes; acha o vale e o 1º quadro em que o texto novo sobe
        a, b = int(0.25 * fps), int(0.62 * fps)
        vale = a + int(np.argmin(claro[a:b]))
        idx = np.where(claro[vale:] > claro[vale] + 5)[0]
        if len(idx):
            difs.append((t0 + (vale + idx[0]) / fps) - pg["ini"])
    return difs


def quadro(arq, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", arq, "-frames:v", "1",
                          "-f", "image2pipe", "-c:v", "png", "-"], capture_output=True, check=True).stdout
    import io
    return Image.open(io.BytesIO(raw)).convert("RGB")


def folha_de_contato(arq, tempos, saida, passo=1.0, col=12, larg=216):
    dur = tempos["duracao"]
    ass = tempos["assuntos"]
    nome = {"dor": "a dor", "virada": "virada", "visao": "visão geral", "calendario": "calendário",
            "duplicada": "reserva duplicada", "sinal": "sinal", "cancelamento": "cancelamento",
            "comanda": "comanda", "checkout": "check-out", "caixa": "caixa", "fechamento": "fechamento",
            "internet": "internet", "comeca1": "como começa", "comeca2": "como começa",
            "teste": "teste grátis", "preco": "quanto custa", "chamada": "chamada"}
    ts = [round(k * passo, 3) for k in range(int(dur / passo) + 1)]
    alt, faixa = round(larg * 1920 / 1080), 26
    lin = (len(ts) + col - 1) // col
    topo = 64
    fl = Image.new("RGB", (col * (larg + 6) + 6, topo + lin * (alt + faixa + 6) + 6), (10, 10, 10))
    d = ImageDraw.Draw(fl)
    try:
        f1 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
        f2 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    except OSError:
        f1 = f2 = ImageFont.load_default()
    d.text((10, 18), f"FAZLO Hospeda — apresentação · folha de contato · 1 quadro a cada {passo:g} s · "
                     f"{int(dur // 60)} min {dur % 60:.1f} s", fill=(175, 250, 39), font=f2)
    p = subprocess.Popen(
        # quadro exato de cada instante (n múltiplo de fps×passo), sem arredondar o tempo
        ["ffmpeg", "-v", "error", "-i", arq, "-vf",
         f"select='not(mod(n\\,{round(60 * passo)}))',scale={larg}:{alt}:flags=lanczos",
         "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    for i, t in enumerate(ts):
        b = p.stdout.read(larg * alt * 3)
        if len(b) < larg * alt * 3:
            break
        im = Image.frombytes("RGB", (larg, alt), b)
        x, y = 6 + (i % col) * (larg + 6), topo + (i // col) * (alt + faixa + 6)
        fl.paste(im, (x, y + faixa))
        a = [q for q in ass if q["ini"] - 0.6 <= t][-1:] or [None]
        rot = nome.get(a[0]["id"], "") if a[0] and t <= a[0]["fim"] + 2.4 else ""
        d.text((x + 2, y + 6), f"{int(t // 60)}:{t % 60:04.1f}  {rot}", fill=(175, 250, 39), font=f1)
    fl.save(saida, quality=86, optimize=True)
    return fl.size, len(ts)


def main():
    tempos = json.load(open("output/tempos.json", encoding="utf-8"))
    dur = tempos["duracao"]
    ok = True

    def conf(cond, texto):
        nonlocal ok
        ok = ok and bool(cond)
        print(("  ok   " if cond else "  FALHA") + " " + texto)

    print("== formato ==")
    m, l = sonda(MESTRE), sonda(LEVE)
    for nome, s in (("mestre", m), ("whatsapp", l)):
        print(f"  {nome}: {s['larg']}x{s['alt']} {s['fps']} fps {s['codec']} {s['perfil']} {s['pix']} {s['cor']} "
              f"· {s['dur']:.2f} s · {s['mb']:.1f} MB · {s['kbps']:.0f} kbps · {s['audio']}")
    conf(m["larg"] == 1080 and m["alt"] == 1920 and m["fps"] == 60, "mestre 1080×1920 a 60 fps")
    conf(abs(m["dur"] - dur) < 0.1 and abs(m["dur_audio"] - m["dur"]) < 0.1, f"mestre com {m['dur']:.2f} s (linha do tempo {dur:.2f} s), som do mesmo tamanho")
    conf(l["fps"] == 30 and l["mb"] <= 16.0, f"versão leve a 30 fps com {l['mb']:.2f} MB (≤ 16 MB)")
    conf(abs(l["dur"] - dur) < 0.1, "versão leve com a mesma duração")

    print("== som (medido nos arquivos finais, ffmpeg ebur128) ==")
    for nome, arq in (("mestre", MESTRE), ("whatsapp", LEVE)):
        r = medir(arq)
        print(f"  {nome}: {r['lufs']:.1f} LUFS · LRA {r['lra']:.1f} · pico real {r['pico_real']:.1f} dBTP")
        conf(abs(r["lufs"] + 14.0) <= 0.5, f"{nome}: −14 LUFS (±0,5)")
        conf(r["pico_real"] <= -1.5, f"{nome}: pico real ≤ −1,5 dBTP")

    print("== sincronia no arquivo final ==")
    for nome, arq in (("mestre", MESTRE), ("whatsapp", LEVE)):
        ms = atraso_do_som(arq)
        conf(abs(ms) <= 25, f"{nome}: som do arquivo × mixagem: {ms:+.1f} ms")
    pal = json.load(open("audio/narracao/palavras.json", encoding="utf-8"))
    a = audio_mono(MESTRE, 8000)
    env = np.sqrt(np.convolve(a ** 2, np.ones(80) / 80, mode="same"))
    paginas = json.load(open("output/legenda.json", encoding="utf-8"))
    difs = legenda_aparece(MESTRE, paginas)
    conf(len(difs) >= len(paginas) - 2 and max(abs(d) for d in difs) <= 0.12,
         f"legenda: {len(difs)}/{len(paginas)} páginas entram no quadro previsto "
         f"(desvio médio {1000 * float(np.mean(difs)):+.0f} ms, pior {1000 * max(difs, key=abs):+.0f} ms)")
    # primeira palavra de cada assunto: a voz começa onde a linha do tempo diz
    piores = []
    for q in pal["assuntos"]:
        i = int(q["ini"] * 8000)
        antes, depois = env[i - 2400:i - 400].max(), env[i:i + 1600].max()
        piores.append(depois / max(antes, 1e-9))
    conf(min(piores) > 2.0, f"voz: cada assunto começa no tempo da linha do tempo (energia sobe ≥ {min(piores):.1f}× no início de cada um)")

    print("== nada parado por mais de 0,5 s nas partes sem tela ==")
    telas = [(t["ini"], t["fim"]) for t in tempos["telas"]]
    parados = trechos_parados(MESTRE)
    fora = []
    for a, b in parados:
        if b - a <= 0.5:
            continue
        em_tela = any(a >= i - 0.3 and b <= f + 0.3 for i, f in telas)
        if not em_tela:
            fora.append((round(a, 2), round(b, 2)))
    maior_tela = max([b - a for a, b in parados if any(a >= i - 0.3 and b <= f + 0.3 for i, f in telas)] or [0])
    conf(not fora, f"trechos parados > 0,5 s fora das telas: {fora if fora else 'nenhum'}")
    print(f"  (nas telas, a maior parada é de {maior_tela:.2f} s — é a espera depois do último destaque)")

    print("== cor da marca no arquivo final ==")
    q0 = quadro(MESTRE, 0.0)
    px = q0.getpixel((586, 640))       # pílula do logo no cartaz (limão), fora das letras
    fundo = q0.getpixel((60, 1880))
    conf(all(abs(a - b) <= 6 for a, b in zip(px, (175, 250, 39))), f"limão no quadro 0 = {px} (marca: 175, 250, 39)")
    conf(max(fundo) <= 24, f"fundo no quadro 0 = {fundo} (marca: 10, 10, 10)")

    if "--folha" in sys.argv:
        tam, n = folha_de_contato(MESTRE, tempos, "output/folha-contato.jpg")
        print(f"== folha de contato: output/folha-contato.jpg {tam[0]}x{tam[1]}, {n} quadros ==")
    print("RESULTADO:", "tudo certo" if ok else "HÁ FALHAS")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
