# Capas v2 dos Reels do FAZLO Hospeda

Modelo novo de capa, por JSON ([`capas.json`](capas.json)):
- **Fundo:** preto da série, com vinheta.
- **No alto:** a logo pequena e o chip da série (pílula escura com ponto limão).
- **Ilustração grande** em traço neon limão `#AFFA27` com brilho, desenhada em vetor.
- **Título:** Inter Display 900, 2–3 linhas a ~85% da largura útil, da 2ª linha em diante em limão.

Tudo fica no recorte 3:4 com folga de 60 px, sem nada no canto do play nem na faixa do contador (regra de capas do [`../README.md`](../README.md)).

| Capa | Arquivo |
|---|---|
| 01 · "Ele pagou / metade. / Quanto falta?" · moeda (aro duplo + "R$") partida em diagonal, "?" no vão | [`01-ele-pagou-metade/output/capa.jpg`](01-ele-pagou-metade/output/capa.jpg) |
| 02 · "Sinal, saldo / e crédito." · três cadeados, o do meio com "R$" | [`02-sinal-saldo-credito/output/capa.jpg`](02-sinal-saldo-credito/output/capa.jpg) |
| 03 · "Diária de feriado / com preço / de terça." · calendário com etiqueta de preço | [`03-diaria-de-feriado/output/capa.jpg`](03-diaria-de-feriado/output/capa.jpg) |
| 04 · "Chegou às 23h. / Cadê a chave?" · chave antiga, plaquinha "Nº 3" e lua | [`04-chegou-as-23h/output/capa.jpg`](04-chegou-as-23h/output/capa.jpg) |
| 05 · "Como nunca vender / o mesmo chalé / duas vezes." · chalé (telhado, porta, janela) e, na frente, duas chaves cruzadas com faísca | [`05-nunca-vender-duas-vezes/output/capa.jpg`](05-nunca-vender-duas-vezes/output/capa.jpg) |
| 06 · "Dois hóspedes, / o mesmo chalé." · duas malas diante de uma porta só | [`06-dois-hospedes-mesmo-chale/output/capa.jpg`](06-dois-hospedes-mesmo-chale/output/capa.jpg) |
| 07 · "Faltam 12 dias / pra Finados." · calendário com o 02 circulado e ampulheta | [`07-faltam-12-dias-finados/output/capa.jpg`](07-faltam-12-dias-finados/output/capa.jpg) |
| 08 · "A comanda da piscina / que ninguém fechou." · caipirinha com limão na borda e a comanda pendurada | [`08-comanda-da-piscina/output/capa.jpg`](08-comanda-da-piscina/output/capa.jpg) |
| 09 · "'Vou ver e te falo.' / (e sumiu)" · balão com "…" que se desfaz em pontilhado | [`09-vou-ver-e-te-falo/output/capa.jpg`](09-vou-ver-e-te-falo/output/capa.jpg) |
| 10 · "Check-out com / a conta errada?" · notinha serrilhada com um X no total | [`10-check-out-conta-errada/output/capa.jpg`](10-check-out-conta-errada/output/capa.jpg) |
| 11 · "Domingo, 11h. / Check-out de / todo mundo." · relógio às 11h e três malas | [`11-domingo-11h/output/capa.jpg`](11-domingo-11h/output/capa.jpg) |
| 12 · "Caiu um Pix às 14h. / De quem era?" · sino de notificação com "R$" e "?" (sem logo do Pix) | [`12-caiu-um-pix/output/capa.jpg`](12-caiu-um-pix/output/capa.jpg) |
| 13 · "O hóspede chegou. / A reserva, não." · mala ao lado de uma prancheta vazia | [`13-hospede-chegou/output/capa.jpg`](13-hospede-chegou/output/capa.jpg) |
| 14 · "Fechou o mês e / o caixa não bateu?" · balança inclinada com moedas de um lado só | [`14-fechou-o-mes/output/capa.jpg`](14-fechou-o-mes/output/capa.jpg) |

As capas 06–14 são para os Reels que já estão no ar (troca de capa direto no Instagram); os títulos são exatamente os das capas originais.

**Prévia da grade do perfil** (as 14, 3 por linha, na ordem do `capas.json`): [`previa-grade-perfil.jpg`](previa-grade-perfil.jpg), por `python3 scripts/grade.py`. Comparação das 5 primeiras com 3 capas antigas: [`previa-grade.jpg`](previa-grade.jpg). A conferência de cada capa está em `<id>/output/revisao/` (`capa.txt`, `capa-no-feed.jpg`); as 5 estão dentro da regra.

**Capa nova:** acrescente `{id, titulo[2–3 linhas], chip, ilustracao}` (opcional: `limao_desde`, a linha a partir da qual o título fica em limão, padrão 1; `largura_titulo`, padrão 816 px) em `capas.json` e rode `node scripts/render.cjs <id>`. Ilustração nova é uma função em `ILUS`, no [`src/capa.js`](src/capa.js), desenhada num quadro de ±300 com `neon()` e `neonTexto()`.
