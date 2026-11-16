"""Mede loudness integrado (LUFS), LRA e pico real (dBTP) de qualquer mídia
(wav, mp4, m4a…) com o filtro ebur128 do ffmpeg (EBU R128 / ITU-R BS.1770).

Uso:
  python3 scripts/medir_audio.py output/apresentacao.mp4 output/apresentacao-whatsapp.mp4
  python3 scripts/medir_audio.py --alvo -14 --tol 0.5 --teto -1.5 arquivo.mp4   # sai com erro se reprovar
"""
import argparse
import re
import subprocess
import sys


def medir(caminho):
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", caminho, "-vn",
         "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-600:])
    resumo = r.stderr[r.stderr.rfind("Summary:"):]

    def num(padrao):
        m = re.search(padrao, resumo)
        return float(m.group(1)) if m else None
    return dict(lufs=num(r"I:\s+(-?[\d.]+)\s+LUFS"),
                lra=num(r"LRA:\s+(-?[\d.]+)\s+LU"),
                pico_real=num(r"Peak:\s+(-?[\d.]+)\s+dBFS"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("arquivos", nargs="+")
    ap.add_argument("--alvo", type=float, default=None, help="LUFS integrado esperado")
    ap.add_argument("--tol", type=float, default=0.5, help="tolerância em LU")
    ap.add_argument("--teto", type=float, default=None, help="pico real máximo em dBTP")
    a = ap.parse_args()
    ok = True
    for arq in a.arquivos:
        m = medir(arq)
        nota = []
        if a.alvo is not None and (m["lufs"] is None or abs(m["lufs"] - a.alvo) > a.tol):
            nota.append("LUFS FORA DO ALVO")
        if a.teto is not None and (m["pico_real"] is None or m["pico_real"] > a.teto):
            nota.append("PICO ACIMA DO TETO")
        ok &= not nota
        print(f"{arq}: {m['lufs']:.1f} LUFS integrado | LRA {m['lra']:.1f} LU | "
              f"pico real {m['pico_real']:.1f} dBTP" + ("  << " + ", ".join(nota) if nota else ""))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
