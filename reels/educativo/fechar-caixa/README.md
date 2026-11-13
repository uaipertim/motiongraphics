# Educativo · "Faltou dinheiro no caixa?"

Reel educativo do @fazlohospeda: 1080×1920, 60 fps, **41,7 s**, com a narração da Raquel e a legenda palavra por palavra. A duração segue a voz: a fala vai de 0,6 a 39,1 s, e depois vem a marca.

O vídeo mostra o fechamento de caixa com as **telas reais** do pacote (`10-caixa`: 03, 06 e 07) dentro do celular. A novidade do formato: nos momentos-chave, o elemento importante **salta da tela**. Ele se descola com sombra, cresce e flutua à frente do celular. Depois ganha movimento (contagem, pulso de cor, digitação) e volta para o lugar dele.

**Não publicar antes do OK.**

▶ **Vídeo:** [`output/fechar-caixa.mp4`](output/fechar-caixa.mp4)
- Capa da grade: [`output/capa-grade.jpg`](output/capa-grade.jpg) · conferência: [`output/grade/revisao/capa-no-feed.jpg`](output/grade/revisao/capa-no-feed.jpg)
- Folha de contato (1 quadro por segundo + o pico de cada salto): [`output/revisao/folha-contato.jpg`](output/revisao/folha-contato.jpg)
- Revisão técnica: [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt)
- Legenda do post: [`legenda.txt`](legenda.txt)

## Cenas (no tempo da locução)

| Tempo | Locução | Tela |
|---|---|---|
| 0–4,4 s | "Fechou o caixa... e faltou dinheiro na gaveta?" | Quadro 0: o aviso real "Diferença: falta R$ 15,00…" já está fora do celular, grande, pulsando em âmbar. O pulso mais forte cai em "faltou". Em 3,9 s ele encolhe e encaixa no lugar dele, na folha "Fechar caixa" (06). |
| 4,4–10,6 s | "…no caderno, ninguém sabe quanto deveria ter… nem onde a conta se perdeu." | O celular apaga e se afasta um pouco. Valores soltos das telas, na Geist Mono do app (alguns riscados com uma linha reta), flutuam e se embaralham duas vezes. Em "perdeu" eles são puxados para dentro da tela e o app acende na 03. |
| 10,6–19,4 s | "No FAZLO Hospeda, o caixa abre com o dinheiro da gaveta… separada por forma de pagamento." | Contorno em "Aberto por Ana Dias, hoje às 08:00". Em "abre" salta "Abertura R$ 200,00". Contorno em "+ Entradas em dinheiro". Em "separada por forma de pagamento" saem as 4 linhas (PIX, Dinheiro, Cartão de crédito, Cartão de débito), que se espalham pela frente do celular e voltam, enquanto o total conta até R$ 1.525,00 no próprio lugar. |
| 19,4–23,7 s | "Na hora de fechar, ele já calcula quanto deveria ter em dinheiro na gaveta." | Toque em "Fechar caixa" e a folha 06 sobe, com o campo vazio. Em "quanto deveria ter em dinheiro" salta a caixa "Esperado em dinheiro", contando de R$ 0,00 a R$ 285,00. Ao lado, uma janela menor com a conta da tela 03 (Abertura R$ 200,00, + Entradas R$ 125,00, − Saídas R$ 40,00). |
| 23,7–28,8 s | "Você conta, digita o valor... e a diferença aparece na hora." | O campo "Valor contado" sai e "R$ 270,00" é digitado nele, letra a letra, com o cursor. Ele volta, o aviso de diferença aparece na folha, salta e pulsa em âmbar. É o mesmo elemento do gancho, agora explicado. |
| 28,8–35,8 s | "Com diferença, a observação é obrigatória. O motivo fica registrado, junto com quem fechou e a que horas." | O campo da observação sai e "Troco devolvido a um hóspede sem registro." é digitado nele. Depois vem o toque em "Fechar caixa" e o resumo do caixa fechado (07), com contorno na observação. Em "quem fechou" salta "Fechado hoje às 14:10 por Ana Dias. Aberto às 08:00 por Ana Dias.", com pulso em "que horas". |
| 35,8–41,7 s | "Caixa fechado, e tudo explicado. FAZLO Hospeda." | O celular se afasta, entra "Caixa fechado. / Tudo explicado." e a marca FAZLO Hospeda (`marca/logo`, versão para fundo escuro). |

## Como é feito

- **Telas** (`scripts/telas.cjs`): os HTMLs 03, 06 e 07 do pacote são abertos no Chromium a 390 × 844, em 4×.
  - A folha "Fechar caixa" sai em três momentos do próprio HTML: A (campo vazio, sem o aviso), B (valor digitado, o aviso aparece) e C (observação escrita, o estado 06 como veio).
  - **Elementos que saltam:** cada um é fotografado sozinho do HTML, com o retângulo inteiro do bloco e todos os filhos, com transparência fora dos cantos. Usei recortes do próprio HTML em 4× em vez dos PNGs de `componentes/` em 3×: o conteúdo é o mesmo, a resolução é maior (nada borrado no 2×), e há elementos que não existem como peça solta (a linha "Abertura", as 4 formas, a caixa preta da folha e "Fechado hoje às…").
  - **Digitação:** o texto do campo muda no HTML, letra a letra, com a barra do cursor no fim, e cada quadro é renderizado. Nada é escrito por cima.
  - **Contagens** (R$ 285,00 e R$ 1.525,00): também renderizadas no HTML, com o valor mudado.
- **Celular:** moldura de 542 px na vista base, de y 217 a 1363. Isso é um pouco menor que os ~570 px da apresentação, para caber a legenda embaixo com 24 px de respiro. Não há aproximação de câmera (1,0×). O que dá profundidade é o balanço 3D leve e o recuo na cena do caderno e no fim.
- **Saltos:**
  - escala de 1,85× o tamanho no celular (1,6× nas 4 formas e na conta), com pico ≤ 2,0× no elástico;
  - entrada de 0,45 s com elástico suave, parada ≥ 1,5 s e volta de 0,4 s;
  - sombra, leve inclinação em perspectiva, flutuação e borda com brilho na cor do salto (limão; âmbar no aviso).
  - **Lugar marcado:** enquanto o elemento está fora, o lugar dele fica marcado (vazio na cor do fundo + contorno tracejado limão).
  - **Exceção:** a conta da cena 4 nasce da janela do esperado. A caixa dela na tela 03 está atrás da folha.
- **Dados:** só os das telas e do LEIA-ME. O **Diário da sessão nunca aparece**: na 03 ele começa em y 899, fora da parte visível, e a tela nunca rola. Na 07 aparece só o botão "Ver diário da sessão", como no pacote. Nenhuma linha do sinal do Gustavo e nada de Day Use.
- **Tela 03:** a parte visível termina logo abaixo do bloco "Recebido por forma de pagamento", com o começo da nota "O esperado em dinheiro conta só…" no pé da tela, como o app mostra sem rolar.

## Locução, legenda e som

- **Locução** (`scripts/voz.py`, base: reserva-whatsapp):
  - ElevenLabs `eleven_v4`, voz Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`).
  - `voice_settings` só com stability 0,50 e similarity_boost 0,75; endpoint with-timestamps.
  - O texto enviado é exatamente o do pedido, com "Fazlo" para soar "Faz lo". Na tela e na legenda, "FAZLO Hospeda".
  - A chave fica só nos Segredos de rede.
  - Seed 1311: ritmo 11,3 letras/s, maior pausa 0,52 s.
- **Linha do tempo** (`scripts/linha.py`):
  - Os tempos de cada palavra vêm da API.
  - O início das palavras depois de pausa é medido no áudio.
  - Cada salto está amarrado ao `id` da palavra em [`roteiro.json`](roteiro.json).
- **Legenda:** o padrão dos educativos (palavra por palavra, Inter Display 900, branca, chaves em limão, sem faixa), a 64 px, com linhas em y 1442/1516, para caber abaixo do celular.
- **Som** (`scripts/audio.py`):
  - voz + a trilha dos educativos com ducking;
  - efeitos sutis vindos de `audio/eventos.json` (whoosh suave no salto, clique leve no encaixe, toques, teclas, tiques da contagem, ping do aviso, a sineta da marca);
  - master em −14 LUFS, pico ≤ −1,5 dBTP no MP4.

## Rodar

```bash
cd reels/educativo/fechar-caixa
node scripts/telas.cjs                       # telas, recortes, digitação e contagens (src/telas, src/telas.json)
python3 scripts/voz.py                       # locução (só gera se ainda não existir; --refaz para gerar de novo)
python3 scripts/linha.py                     # linha.json
node scripts/render.cjs dados --fps 30       # eventos do som + dados do QA
python3 scripts/audio.py                     # audio/mix.wav
node scripts/render.cjs video --workers 4    # output/fechar-caixa.mp4
cd ../../.. && node reels/tools/capa_grade.cjs reels/educativo/fechar-caixa \
  && python3 reels/tools/revisao_capa.py reels/educativo/fechar-caixa --saida reels/educativo/fechar-caixa/output/grade --vizinhos reels/educativo/reserva-whatsapp/output/grade
cd reels/educativo/fechar-caixa && cp output/grade/capa.jpg output/capa-grade.jpg
python3 scripts/folha.py && python3 scripts/qa.py
```
