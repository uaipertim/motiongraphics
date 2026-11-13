# Educativo · "Faltou dinheiro no caixa?"

Reel educativo do @fazlohospeda: 1080×1920, 60 fps, **41,7 s**, com a narração da Raquel e a legenda palavra por palavra. A duração segue a voz: a fala vai de 0,6 a 39,1 s, e depois vem a marca.

O vídeo mostra o fechamento de caixa com as **telas reais** do pacote (`10-caixa`: 03, 06 e 07) dentro do celular. A novidade do formato: nos momentos-chave, o elemento importante **salta da tela**. Ele se descola com sombra, cresce e flutua à frente do celular. Depois ganha movimento (contagem, pulso de cor, digitação) e volta para o lugar dele.

**Não publicar antes do OK.**

▶ **Vídeo:** [`output/fechar-caixa.mp4`](output/fechar-caixa.mp4)
- Capa: [`output/capa.jpg`](output/capa.jpg) (9:16) e [`output/capa-grade.jpg`](output/capa-grade.jpg) · prévia da linha da grade com as vizinhas: [`output/revisao/previa-grade.jpg`](output/revisao/previa-grade.jpg)
- Folha de contato (1 quadro por segundo + o pico de cada salto): [`output/revisao/folha-contato.jpg`](output/revisao/folha-contato.jpg)
- Revisão técnica: [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt)
- Legenda do post: [`legenda.txt`](legenda.txt)

## Ajustes depois da aprovação (base 342d5bc)

Cenas, tempos, saltos, voz e som não mudaram. Só mudaram estas duas coisas:

1. **Legenda: quebras nos lugares certos.** A divisão agora é fixada à mão no [`roteiro.json`](roteiro.json) (campo `legenda`), em vez de calculada pela largura.
   - A tela só troca na pontuação ou numa pausa da fala.
   - Nenhuma linha termina em artigo, preposição ou conjunção.
   - "deveria ter", "digita o valor" e "e faltou" ficam juntos.
   - Cada linha é centralizada pelo texto final dela, e as palavras entram já no lugar final.
   - A legenda vai de x 162 a 917, sem encostar na lateral.

   | # | Tempo | Tela da legenda |
   |---|---|---|
   | 1 | 0,60–2,29 s | Fechou o caixa... |
   | 2 | 2,29–4,47 s | e faltou dinheiro / na gaveta? |
   | 3 | 4,47–6,33 s | Quando o controle / fica no caderno, |
   | 4 | 6,33–8,67 s | ninguém sabe / quanto deveria ter... |
   | 5 | 8,67–10,67 s | nem onde / a conta se perdeu. |
   | 6 | 10,67–11,92 s | No FAZLO Hospeda, |
   | 7 | 11,92–14,44 s | o caixa abre / com o dinheiro da gaveta, |
   | 8 | 14,44–16,72 s | e cada entrada / fica registrada, |
   | 9 | 16,72–18,76 s | separada / por forma de pagamento. |
   | 10 | 18,76–21,04 s | Na hora de fechar, / ele já calcula (troca na pausa de 0,20 s) |
   | 11 | 21,04–23,47 s | quanto deveria ter / em dinheiro na gaveta. |
   | 12 | 23,47–25,84 s | Você conta, / digita o valor... |
   | 13 | 25,84–28,16 s | e a diferença / aparece na hora. |
   | 14 | 28,16–29,14 s | Com diferença, |
   | 15 | 29,14–31,15 s | a observação / é obrigatória. |
   | 16 | 31,15–32,82 s | O motivo fica registrado, |
   | 17 | 32,82–35,41 s | junto com quem fechou / e a que horas. |
   | 18 | 35,41–38,09 s | Caixa fechado, / e tudo explicado. |
   | 19 | 38,09–39,88 s | FAZLO Hospeda. |

2. **Capa nova** (`capaGrade()` em `src/anim.js`, a mesma para `capa.jpg` e `capa-grade.jpg`):
   - **Celular:** a tela real do gancho (03 + a folha "Fechar caixa" da 06, com "Esperado em dinheiro R$ 285,00" e "Valor contado R$ 270,00"), grande, girado ~10° em perspectiva, com sombra.
   - **Aviso:** o aviso real "Diferença: falta R$ 15,00…" salta da tela a 1,7×, passa por cima das duas bordas do celular e tem brilho âmbar. O lugar de onde ele saiu fica marcado com o tracejado limão, como no vídeo.
   - **Título:** "Faltou dinheiro / no caixa?" acima, com a mesma tipografia e cores. Ficou com 104 px (antes 118 px) para não entrar no canto do play. O respiro até o celular é de 45 px.
   - **Fundo:** o fundo escuro com o brilho suave do vídeo.
   - **Posição:** o conjunto fica centrado em y 959,6, de y 366 a 1553 (dentro de 240–1680), com margens laterais de 90 e 104 px.
   - **Revisão:** `revisao_capa.py` diz "dentro da regra". A prévia da linha da grade, com o reserva-whatsapp e a apresentação ao lado, está em [`output/revisao/previa-grade.jpg`](output/revisao/previa-grade.jpg).

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
- **Legenda:** o padrão dos educativos (palavra por palavra, Inter Display 900, branca, chaves em limão, sem faixa), a 64 px, com linhas em y 1442/1516, para caber abaixo do celular. A divisão em telas e linhas é a do campo `legenda` do roteiro (veja acima).
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
  && python3 reels/tools/revisao_capa.py reels/educativo/fechar-caixa --saida reels/educativo/fechar-caixa/output/grade --vizinhos reels/educativo/reserva-whatsapp/output/grade reels/telas/apresentacao/output/grade
cd reels/educativo/fechar-caixa && cp output/grade/capa.jpg output/capa-grade.jpg && cp output/grade/capa.jpg output/capa.jpg && cp output/grade/revisao/capa-no-feed.jpg output/revisao/previa-grade.jpg
python3 scripts/folha.py && python3 scripts/qa.py
```
