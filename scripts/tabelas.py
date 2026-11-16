"""Imprime, em Markdown, os tempos medidos que entram no PROCESSO.md.
Uso: python3 scripts/tabelas.py
"""
import json

pal = json.load(open("audio/narracao/palavras.json", encoding="utf-8"))
tem = json.load(open("output/tempos.json", encoding="utf-8"))
leg = json.load(open("output/legenda.json", encoding="utf-8"))


def mmss(t):
    c = round(t * 100)
    return f"{c // 6000}:{(c % 6000) / 100:05.2f}"


print("### Narração: assuntos, tempos e pausas (medidos no áudio montado)\n")
print("| Assunto | Começa | Termina | Fala | Pausa depois |")
print("|---|---|---|---|---|")
ass = pal["assuntos"]
for i, a in enumerate(ass):
    pausa = f'{a["pausa_medida"]:.2f} s' if "pausa_medida" in a else "—"
    print(f'| {a["id"]} | {mmss(a["ini"])} | {mmss(a["fim"])} | {a["fim"] - a["ini"]:.2f} s | {pausa} |')
print(f'\nDuração total: {pal["duracao"]:.2f} s ({int(pal["duracao"] // 60)} min {pal["duracao"] % 60:.1f} s).\n')

print("### Telas: tempo em cena e espera depois do último destaque\n")
print("| Tela | Assunto | Entra | Sai | Em cena | Destaques | Último destaque | Espera até trocar |")
print("|---|---|---|---|---|---|---|---|")
for t in tem["telas"]:
    ult = mmss(t["ultimoDestaque"]) if t["ultimoDestaque"] is not None else "—"
    esp = f'{t["espera"]:.2f} s' if t["espera"] is not None else "—"
    print(f'| {t["tela"]} | {t["assunto"]} | {mmss(t["ini"])} | {mmss(t["fim"])} | {t["duracao"]:.2f} s | '
          f'{len(t["destaques"])} | {ult} | {esp} |')

print("\n### Legenda: páginas\n")
print("| Entra | Sai | Dura | Linhas | Texto |")
print("|---|---|---|---|---|")
for p in leg:
    print(f'| {mmss(p["ini"])} | {mmss(p["fim"])} | {p["fim"] - p["ini"]:.2f} s | {p["linhas"]} | {p["texto"]} |')
print(f'\n{len(leg)} páginas; a mais curta dura {min(p["fim"] - p["ini"] for p in leg):.2f} s.')
