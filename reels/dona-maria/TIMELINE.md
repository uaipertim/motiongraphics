# Reel Dona Maria: timeline para aprovação

1080×1920, 30 fps, **31,1 s**. Tempos do Reel. As palavras foram alinhadas no próprio áudio (`scripts/alinha.py`):
- **Inícios de trecho:** medidos nas pausas reais (±10 ms).
- **Palavras no meio de um trecho:** ±0,1 s.
- **Por que sem transcrição:** a chave do ElevenLabs não tem permissão de transcrição nem de alinhamento forçado.

| Trecho | Reel | Fonte | O que aparece |
|---|---|---|---|
| 1 · Abertura | 0,00–10,84 s | `abertura.mp4` de 0,45 s ao fim do áudio (10,84 s) | Dona Maria em tela cheia. "Oi!" em **0,20 s**; última palavra ("chegaram.") termina em 10,29 s. |
| Transição | 10,55–11,15 s | — | Faixa limão varre a tela; fundo preto; o celular sobe em mola. |
| 2a · Calendário | 10,95–18,60 s | `meio-narracao.mp3` a partir de 10,95 s ("Hoje" em **11,02 s**) | Tela 01 (calendário) no celular. Em "calendário" (13,07 s), a grade da semana ganha um brilho. Em "Eu vejo" (**15,41 s**), a câmera aproxima o Chalé Ipê e um contorno limão desenha a reserva **F. Andrade (13 a 15/11)**, até a troca. |
| 2b · Nova reserva | **18,60**–22,43 s | ("E se eu tento…" em 18,60 s) | Tela 02 (nova reserva, Família Moreira). Em "mesmo chalé" (20,07 s): destaque em **Acomodação · Chalé Ipê**. Em "data já ocupada" (21,12 s): destaque em **Período 13/11 → 15/11**. |
| 2c · Período ocupado | **22,43**–23,95 s | ("o sistema" em 22,43 s) | Transição suave da tela 02 para a 03 (0,5 s): o modal cresce para cima, o resumo sobe junto, o aviso amarelo abre no meio e o botão fica cinza. Em "não deixa" (**23,00 s**): contorno limão no **"Período ocupado."**. Fica parado até 23,95 s. |
| Transição | 23,95–24,25 s | — | Faixa limão varre a tela e revela a Dona Maria. |
| 3 · Fechamento | 24,15–29,09 s | `fechamento.mp4` de 0,30 s ao fim (4,94 s) | Dona Maria em tela cheia. "E você" em **24,54 s**; "aqui." termina em 28,29 s. |
| 4 · Logo | 29,09–31,10 s | — | Fundo preto, a logo do FAZLO Hospeda com o anel limão, "FAZLO Hospeda" e @fazlohospeda. A trilha faz o fade. |

**Legenda** (palavra por palavra, padrão do reel-09: Inter Display 900, 68 px, branca; chaves em limão: caderno, mesmo chalé, calendário, FAZLO Hospeda, não deixa):
- **Posição:** linhas em y 1440/1516, de y ≈ 1388 a 1531.
- **Nos trechos da Dona Maria:** fica no peito, ~400 px abaixo do queixo (o queixo está em y ≈ 990 depois do upscale).
- **Por que não mais baixo:** ela termina antes dos 20% de baixo da tela (y > 1536), onde o Instagram põe a legenda do post.
- **Grafia:** na tela, "FAZLO Hospeda".

**Vídeos da Dona Maria:**
- **Upscale:** 448×832 → 1080×2006 (lanczos, nitidez leve `unsharp` 5×5 0,4).
- **Recorte:** os 86 px de baixo (a cabeça e o céu ficam inteiros).
- **Quadros:** de 25 para 30 fps por repetição de quadro, sem interpolação, para não mexer na boca.
- **Voz:** sem tratamento; só o ganho geral do master.

**Trilha:** leve e acolhedora (sintetizada, a mesma cama da Série Explica, mais lenta), ~18 dB abaixo da voz, abaixando mais quando ela fala; fade no fecho. Master em −14 LUFS, pico ≤ −1,5 dBTP.
