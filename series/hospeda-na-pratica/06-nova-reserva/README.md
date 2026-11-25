# FAZLO Hospeda na prática, episódio 6: Nova reserva em segundos (etapa 1)

Segue as [regras da série](../REGRAS.md). Vai ao ar na quarta, 02/12, às 19h. **Etapa 1, para aprovação:** levantamento, estrutura, roteiro e linha do tempo. Ainda sem voz e sem render. **Não publicar.**

## Arquivos
- **Roteiro, estrutura e linha do tempo:** [`ROTEIRO.md`](ROTEIRO.md).
- **Levantamento do fluxo:** [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg), com as 18 capturas em `aprovacao/levantamento/`.
  - O texto de cada tela, o cronômetro e a conferência do canal estão em `aprovacao/levantamento/levantamento.json`.
  - O OCR está em `aprovacao/levantamento/ocr-levantamento.json`.

## Rodar
```bash
cd series/hospeda-na-pratica/06-nova-reserva
tesseract --version && tesseract --list-langs   # precisa de "por"
node scripts/levantar.cjs                       # para se houver texto proibido ou bloqueio de canal em 12–14/12
python3 scripts/ocr.py levantamento             # OCR das capturas
python3 scripts/folha_levantamento.py           # aprovacao/folha-levantamento-demo.jpg
```

## Etapa 2 (depois da aprovação)
Captura final cronometrada, voz, montagem com o motor dos episódios 2 a 5, render, legenda palavra por palavra, capa, as conferências de sempre (mais a de bloqueio de canal) e **só o mestre 1080×1920**.
