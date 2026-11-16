"""Copia audio/narracao/palavras.json para src/dados.js (window.NARRACAO).

A página do vídeo abre por file://, então os tempos entram como script.
Uso: python3 scripts/gerar_dados.py
"""
import json

d = json.load(open("audio/narracao/palavras.json", encoding="utf-8"))
with open("src/dados.js", "w", encoding="utf-8") as f:
    f.write("// Gerado por scripts/gerar_dados.py a partir de audio/narracao/palavras.json\n")
    f.write("window.NARRACAO = ")
    json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")
print("src/dados.js:", d["duracao"], "s,", sum(len(a["tokens"]) for a in d["assuntos"]), "tokens")
