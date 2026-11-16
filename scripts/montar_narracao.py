"""Monta a narração final a partir da gravação bruta (uma tomada só).

- Não acelera nem corta a voz: só insere silêncio digital dentro dos silêncios
  que a própria gravação já tem (entre frases), para chegar às pausas pedidas.
- Converte o alinhamento por caractere em tempos por palavra na linha do tempo
  final e grava audio/narracao/palavras.json — de onde sai TODA a sincronia.

Uso: python3 scripts/montar_narracao.py
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from roteiro import ASSUNTOS, texto_api, tokens, tokens_api  # noqa: E402

SR = 48000
ENTRADA = 1.00          # s de imagem antes da primeira palavra
SAIDA = 4.80            # s depois da última palavra (logo + @)
LIMIAR_DB = -55.0       # abaixo disso é silêncio

# Pausa mínima (s) depois de frases dentro do mesmo assunto (tempo de leitura).
PAUSAS_INTERNAS = {
    ("dor", 0): 0.75, ("dor", 1): 0.80,
    ("virada", 0): 0.70,
    ("comeca1", 0): 1.50,
    ("comeca2", 0): 0.95,
    ("teste", 0): 0.80,
    ("preco", 0): 1.00, ("preco", 1): 1.20,
    ("chamada", 0): 0.80,
}


def carregar(caminho):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", caminho, "-f", "f32le", "-ac", "1",
         "-ar", str(SR), "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def envelope_db(x, hop):
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms)


def silencio_em(db, hop, t_a, t_b):
    """Maior trecho contínuo de silêncio entre t_a e t_b. Devolve (ini, fim) em s."""
    a, b = int(t_a * SR / hop), min(len(db), int(t_b * SR / hop))
    melhor, ini = (0, 0), None
    for i in range(a, b + 1):
        quieto = i < b and db[i] < LIMIAR_DB
        if quieto and ini is None:
            ini = i
        if not quieto and ini is not None:
            if i - ini > melhor[1] - melhor[0]:
                melhor = (ini, i)
            ini = None
    return melhor[0] * hop / SR, melhor[1] * hop / SR


def main():
    base = "audio/narracao"
    meta = json.load(open(f"{base}/bruto.json", encoding="utf-8"))
    x = carregar(f"{base}/bruto.mp3")
    al = meta["alignment"]
    ch, st, en = (al["characters"], al["character_start_times_seconds"],
                  al["character_end_times_seconds"])
    txt = "".join(ch)
    assert txt == meta["texto_enviado"], "alinhamento não bate com o texto enviado"

    hop = SR // 200  # 5 ms
    db = envelope_db(x, hop)

    # --- palavras faladas (texto da API) com tempos brutos ------------------
    falas = []  # (palavra_api, ini, fim, idx_char_ini, idx_char_fim)
    for m in re.finditer(r"\S+", txt):
        i, j = m.start(), m.end() - 1
        jj = j
        while jj > i and not (ch[jj].isalnum()):
            jj -= 1  # tira a pontuação final do tempo da palavra
        falas.append(dict(p=m.group(0), ini=st[i], fim=en[jj], ci=i, cf=j))

    # --- tokens de legenda (grafia oficial) ↔ palavras faladas --------------
    assuntos, k = [], 0
    for a in ASSUNTOS:
        toks, frase = [], 0
        for tk in tokens(a["texto"]):
            partes = tokens_api(tk)
            grupo = falas[k:k + len(partes)]
            assert [g["p"] for g in grupo] == partes, (tk, partes, grupo)
            k += len(partes)
            toks.append(dict(t=tk, frase=frase, falas=grupo))
            if re.search(r"[.?!]$", tk):
                frase += 1
        assuntos.append(dict(id=a["id"], pausa=a["pausa"], tokens=toks))
    assert k == len(falas)

    # --- pontos de corte: fim de cada frase que pede pausa -------------------
    cortes = []  # (t_corte_bruto, silêncio_a_inserir, descrição)
    for ia, a in enumerate(assuntos):
        nfr = a["tokens"][-1]["frase"] + 1
        for fr in range(nfr):
            ult = [t for t in a["tokens"] if t["frase"] == fr][-1]
            fim_fala = ult["falas"][-1]["fim"]
            ultima_frase = fr == nfr - 1
            if ultima_frase and ia == len(assuntos) - 1:
                continue
            if ultima_frase:
                alvo = a["pausa"]
                prox = assuntos[ia + 1]["tokens"][0]["falas"][0]["ini"]
            else:
                alvo = PAUSAS_INTERNAS.get((a["id"], fr))
                prox = [t for t in a["tokens"] if t["frase"] == fr + 1][0]["falas"][0]["ini"]
            s0, s1 = silencio_em(db, hop, fim_fala - 0.30, prox + 0.25)
            natural = s1 - s0
            a.setdefault("pausas_medidas", []).append(
                dict(frase=fr, natural=round(natural, 3)))
            if alvo is None or natural >= alvo:
                a["pausas_medidas"][-1]["final"] = round(natural, 3)
                continue
            a["pausas_medidas"][-1]["final"] = round(alvo, 3)
            cortes.append(((s0 + s1) / 2, alvo - natural, f"{a['id']}#{fr}", s0, s1))

    # --- monta o áudio e o mapa de tempo -------------------------------------
    cortes.sort()
    pedacos, pos, desloc, mapa = [np.zeros(int(ENTRADA * SR))], 0, ENTRADA, []
    for t_c, extra, nome, s0, s1 in cortes:
        i = int(round(t_c * SR))
        trecho = x[pos:i]
        assert np.max(np.abs(x[max(0, i - 240): i + 240])) < 10 ** (LIMIAR_DB / 20) * 4, nome
        pedacos += [trecho, np.zeros(int(round(extra * SR)))]
        mapa.append((t_c, desloc))
        desloc += int(round(extra * SR)) / SR
        pos = i
    pedacos.append(x[pos:])
    mapa.append((1e9, desloc))
    y = np.concatenate(pedacos)

    def final(t):
        for t_c, d in mapa:
            if t < t_c:
                return round(t + d, 4)

    ultimo = 0.0
    for a in assuntos:
        for tk in a["tokens"]:
            for f in tk["falas"]:
                f["ini"], f["fim"] = final(f["ini"]), final(f["fim"])
                f.pop("ci"), f.pop("cf")
            tk["ini"], tk["fim"] = tk["falas"][0]["ini"], tk["falas"][-1]["fim"]
            ultimo = tk["fim"]
        a["ini"], a["fim"] = a["tokens"][0]["ini"], a["tokens"][-1]["fim"]

    # fim: silêncio até completar a saída
    dur = ultimo + SAIDA
    y = np.concatenate([y, np.zeros(max(0, int(round(dur * SR)) - len(y)))])[: int(round(dur * SR))]

    # --- confere as pausas no áudio pronto (medidas pela energia) -----------
    db2 = envelope_db(y, hop)
    for ia, a in enumerate(assuntos[:-1]):
        s0, s1 = silencio_em(db2, hop, a["fim"] - 0.3, assuntos[ia + 1]["ini"] + 0.25)
        a["pausa_medida"] = round(s1 - s0, 3)

    sf.write(f"{base}/narracao.wav", y.astype(np.float32), SR, subtype="PCM_24")
    json.dump(dict(sr=SR, duracao=round(dur, 4), entrada=ENTRADA, assuntos=assuntos),
              open(f"{base}/palavras.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(f"duração final: {dur:.2f} s ({int(dur // 60)} min {dur % 60:.1f} s)")
    for a in assuntos:
        print(f"{a['id']:13s} {a['ini']:7.2f} – {a['fim']:7.2f}  "
              f"pausa depois: {a.get('pausa_medida', '—')}  internas: "
              + ", ".join(f"{p['natural']}→{p['final']}" for p in a.get('pausas_medidas', [])[:-1] or []))


if __name__ == "__main__":
    main()
