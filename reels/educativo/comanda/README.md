# Reel de uso · "A caipirinha da piscina entrou na conta?"

Reel do FAZLO Hospeda: 1080×1920, 60 fps, **32,0 s**, **sem narração**. A mensagem vem de textos curtos na tela.

O vídeo começa só com elementos gráficos e depois passa para as **telas reais** da comanda (`08-comanda`: 02, 03 e 04), dentro do celular. O motor é o do educativo aprovado [`fechar-caixa`](../fechar-caixa) (commit 74dd772): celular em 3D leve e elementos que **saltam** da tela com o lugar de origem marcado, elástico suave, sombra, perspectiva e recortes do HTML em 4×. A trilha, os efeitos e a capa também vêm de lá.

**Não publicar antes do OK.**

▶ **Vídeo:** [`output/comanda.mp4`](output/comanda.mp4)
- Capa: [`output/capa.jpg`](output/capa.jpg) e [`output/capa-grade.jpg`](output/capa-grade.jpg) · prévia da linha da grade (com o "Faltou dinheiro no caixa?" e o "Recebeu uma reserva pelo WhatsApp?"): [`output/revisao/previa-grade.jpg`](output/revisao/previa-grade.jpg)
- Folha de contato (1 quadro por segundo + o pico de cada salto): [`output/revisao/folha-contato.jpg`](output/revisao/folha-contato.jpg)
- Revisão técnica: [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt)
- Legenda do post: [`legenda.txt`](legenda.txt)

## Cenas

| Tempo | Texto na tela | O que acontece |
|---|---|---|
| 0–3,6 s | A caipirinha da piscina / **entrou na conta?** | Gancho, só elementos. O cartão real da Caipirinha (recorte do item da comanda: Bar da piscina, 3 × R$ 22,00, R$ 66,00) aparece sozinho no escuro, girando em 3D, com um "?" limão pulsando. Já está visível no quadro 0. |
| 3,6–9,05 s | Bar, frigobar, restaurante… · e **cada um anota** / de um jeito. | A dor. As etiquetas "Bar da piscina", "Frigobar" e "Restaurante" (os chips reais da folha "Lançar consumo") se espalham. Os cartões de Água sem gás, Cerveja long neck e Risoto de cogumelos voam desencontrados entre elas. Em 6,7 s a Cerveja escapa e cai para fora do quadro pela esquerda. |
| 9,05–15,2 s | No FAZLO Hospeda, · tudo cai na **comanda** / **do hóspede.** | O celular entra com a comanda real da Mariana Costa (02), com a lista de itens vazia só para a entrada. Os cartões voam e encaixam como as linhas, um a um: Caipirinha, Água sem gás, Cerveja long neck (que volta pela esquerda), Risoto de cogumelos, Suco de laranja e Cerveja long neck cancelada. A lista rola para mostrar os de baixo. Depois o "Total" salta e conta até R$ 287,00. |
| 15,2–23,95 s | Lançou, **somou.** | Toque em "Lançar consumo", a folha 03 sobe, toque em "Lançar R$ 34,00" e a tela vira a 04. A Caipirinha salta e troca, na janela, de 3 × R$ 22,00 = R$ 66,00 para 4 × R$ 22,00 = R$ 88,00. Depois a Água sem gás, de 2 × R$ 6,00 = R$ 12,00 para 4 × R$ 6,00 = R$ 24,00. Por fim o "Total" salta e conta de R$ 287,00 até R$ 321,00. |
| 23,95–26,9 s | Cancelou? / **Continua registrado.** | A lista rola até o fim e o item "Cerveja long neck · Cancelado · 1 × R$ 14,00 = R$ 14,00" salta. |
| 27,07–32,0 s | No check-out, / a conta **já está pronta.** | O "Saldo R$ 321,00" e o botão "Receber R$ 321,00" saltam juntos. O celular se afasta e entra a marca FAZLO Hospeda (`marca/logo`, versão para fundo escuro). |

## Como é feito

- **Telas** (`scripts/telas.cjs`): os HTMLs 02, 03 e 04 do pacote são abertos no Chromium a 390 px, em 4×.
  - **02 e 04:** fotografadas em página inteira, porque a tela rola até o item cancelado.
  - **Lista vazia:** a 02 sai também com os itens invisíveis, usada só na entrada.
  - **Folha 03:** sai sozinha, com transparência.
  - **Recortes:** cartões, chips, "Saldo" e "Receber" são fotografados sozinhos do HTML (o bloco inteiro).
  - **Contagens:** a linha "Total" é renderizada no HTML com o valor mudado.
  - Nada é redigitado.
- **Saltos:**
  - escala de 1,85× (linhas "Total" e "Saldo") ou 1,6× (cartões e botão), com pico ≤ 1,97× no elástico;
  - entrada de 0,45 s, parada de 1,6 s e volta de 0,42 s;
  - o lugar de origem fica marcado com o tracejado limão e a janela nunca o cobre;
  - só o Saldo e o "Receber R$ 321,00" saltam juntos, como pedido.
- **Textos de tela:** a tipografia e o estilo da legenda aprovada (Inter Display 900, 64 px, palavra-chave em limão, sem faixa), nas linhas y 1442/1516, abaixo do celular.
  - As palavras entram em sequência, cada uma no lugar final.
  - Cada linha é centralizada pelo texto final dela.
  - Cada texto fica pelo menos 1,2 s + 0,3 s por palavra, e um sai antes do próximo entrar.
  - Quebras só em pausa natural.
- **Celular:** moldura de 540 px (y 217–1363), como no fechar-caixa, sem aproximação de câmera.
- **Dados:** só as telas da comanda. Nada da ficha da hospedagem nem do caixa, sem Day Use.
  - Na 04, o aviso "Salvo" do pacote aparece no pé da página quando a lista rola até o cancelado, como no estado original.
- **Som** (`scripts/audio.py`):
  - a trilha dos educativos (a da Série Explica), sem ducking porque não há voz;
  - efeitos sutis vindos de `audio/eventos.json`: pulso do "?", etiquetas, voo, queda, encaixe de cada cartão, saltos e encaixes, trocas, contagens, toques, folha, marca;
  - master em −14 LUFS, pico ≤ −1,5 dBTP no MP4.

## Rodar

```bash
cd reels/educativo/comanda
node scripts/telas.cjs                       # telas, recortes e contagens (src/telas, src/telas.json)
node scripts/render.cjs dados --fps 30       # eventos do som + dados do QA
python3 scripts/audio.py                     # audio/mix.wav
node scripts/render.cjs video --workers 4    # output/comanda.mp4
cd ../../.. && node reels/tools/capa_grade.cjs reels/educativo/comanda \
  && python3 reels/tools/revisao_capa.py reels/educativo/comanda --saida reels/educativo/comanda/output/grade --vizinhos reels/educativo/fechar-caixa/output/grade reels/educativo/reserva-whatsapp/output/grade
cd reels/educativo/comanda && cp output/grade/capa.jpg output/capa-grade.jpg && cp output/grade/capa.jpg output/capa.jpg && cp output/grade/revisao/capa-no-feed.jpg output/revisao/previa-grade.jpg
python3 scripts/folha.py && python3 scripts/qa.py
```
