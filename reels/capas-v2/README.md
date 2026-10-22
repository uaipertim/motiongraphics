# Capas v2 dos Reels do FAZLO Hospeda

Modelo novo de capa, por JSON ([`capas.json`](capas.json)):
- **Fundo:** preto da série, com vinheta.
- **No alto:** a logo pequena e o chip da série (pílula escura com ponto limão).
- **Ilustração grande** em traço neon limão `#AFFA27` com brilho, desenhada em vetor.
- **Título:** Inter Display 900, 2–3 linhas a ~85% da largura útil, da 2ª linha em diante em limão.

Tudo fica no recorte 3:4 com folga de 60 px, sem nada no canto do play nem na faixa do contador (regra de capas do [`../README.md`](../README.md)).

| Capa | Arquivo |
|---|---|
| "Ele pagou metade." · moeda partida com "?" | [`01-ele-pagou-metade/output/capa.jpg`](01-ele-pagou-metade/output/capa.jpg) |
| "Sinal, saldo e crédito." · três cadeados, o do meio com "R$" | [`02-sinal-saldo-credito/output/capa.jpg`](02-sinal-saldo-credito/output/capa.jpg) |
| "Diária de feriado com preço de terça." · calendário com etiqueta de preço | [`03-diaria-de-feriado/output/capa.jpg`](03-diaria-de-feriado/output/capa.jpg) |
| "Chegou às 23h. Cadê a chave?" · chave antiga, plaquinha "Nº 3" e lua | [`04-chegou-as-23h/output/capa.jpg`](04-chegou-as-23h/output/capa.jpg) |
| "Como nunca vender o mesmo chalé duas vezes." · chalé com duas chaves em X | [`05-nunca-vender-duas-vezes/output/capa.jpg`](05-nunca-vender-duas-vezes/output/capa.jpg) |

**Prévia da grade** (as 5 novas e 3 antigas): [`previa-grade.jpg`](previa-grade.jpg). A conferência de cada capa está em `<id>/output/revisao/` (`capa.txt`, `capa-no-feed.jpg`); as 5 estão dentro da regra.

**Capa nova:** acrescente `{id, titulo[2–3 linhas], chip, ilustracao}` em `capas.json` e rode `node scripts/render.cjs <id>`. Ilustração nova é uma função em `ILUS`, no [`src/capa.js`](src/capa.js), desenhada num quadro de ±300 com `neon()` e `neonTexto()`.
