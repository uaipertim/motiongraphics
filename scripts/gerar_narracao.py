"""Gera a narração na ElevenLabs (endpoint with-timestamps).

A chave NÃO fica em arquivo: a requisição sai sem credencial e o proxy da
sessão (Segredos de rede) injeta a chave para api.elevenlabs.io.

Uso: python3 scripts/gerar_narracao.py [--seed N] [--saida audio/narracao/bruto]
"""
import argparse
import base64
import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from roteiro import ASSUNTOS, texto_api  # noqa: E402

VOZ = "GDzHdQOi6jjf8zaXhCYD"  # Raquel - For Conversational
MODELO = "eleven_v4"
AJUSTES = {"stability": 0.50, "similarity_boost": 0.75}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--formato", default="mp3_44100_192")  # pcm_44100 exige plano Pro
    ap.add_argument("--saida", default="audio/narracao/bruto")
    a = ap.parse_args()

    # Um parágrafo por assunto: a voz respira entre eles e o corte cai no silêncio.
    texto = "\n\n".join(texto_api(x["texto"]) for x in ASSUNTOS)
    corpo = {"text": texto, "model_id": MODELO, "voice_settings": AJUSTES}
    if a.seed is not None:
        corpo["seed"] = a.seed

    url = (f"https://api.elevenlabs.io/v1/text-to-speech/{VOZ}/with-timestamps"
           f"?output_format={a.formato}")
    req = urllib.request.Request(
        url, data=json.dumps(corpo).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            resp = json.loads(r.read())
    except urllib.error.HTTPError as e:
        print("ERRO HTTP", e.code, e.read()[:800].decode("utf-8", "replace"))
        sys.exit(1)

    os.makedirs(os.path.dirname(a.saida), exist_ok=True)
    audio = base64.b64decode(resp["audio_base64"])
    ext = "pcm" if a.formato.startswith("pcm") else "mp3"
    with open(f"{a.saida}.{ext}", "wb") as f:
        f.write(audio)
    meta = {
        "modelo": MODELO, "voz": VOZ, "voice_settings": AJUSTES, "seed": a.seed,
        "formato": a.formato, "texto_enviado": texto,
        "alignment": resp["alignment"],
        "normalized_alignment": resp.get("normalized_alignment"),
    }
    with open(f"{a.saida}.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)
    al = resp["alignment"]
    print("ok:", f"{a.saida}.{ext}", len(audio), "bytes;",
          "fim do alinhamento:", al["character_end_times_seconds"][-1], "s;",
          "caracteres:", len(al["characters"]), "/", len(texto))


if __name__ == "__main__":
    main()
