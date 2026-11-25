# FAZLO Hospeda na prática, episódio 6: Nova reserva em segundos

Segue as [regras da série](../REGRAS.md). O roteiro aprovado (etapa 1, commit 0c62029) e o que ficou no vídeo estão no [`ROTEIRO.md`](ROTEIRO.md). Vai ao ar na quarta, 02/12, às 19h. **Vídeo e capa prontos, com as três correções de 25/11/2026 (ver abaixo), para aprovação. Não publicar.**

## Arquivos
- ▶ **Vídeo (mestre, versão única):** [`output/hospeda-na-pratica-06-nova-reserva.mp4`](output/hospeda-na-pratica-06-nova-reserva.mp4).
  - 1080×1920, 60 fps, 58,5 s, 21 MB, H.264 e AAC.
  - Não há versão WhatsApp.
- **Capa:** [`capa/capa.jpg`](capa/capa.jpg) e o recorte do feed, 4:5: [`capa/capa-no-feed.jpg`](capa/capa-no-feed.jpg). É o cartão do resumo saltando da tela "Reserva Criada!".
- **Miniatura (quadro 0):** [`output/miniatura.jpg`](output/miniatura.jpg).
- **Quadros-chave:** [`aprovacao/quadros-chave.jpg`](aprovacao/quadros-chave.jpg), 20 quadros.
- **As 3 tomadas da pergunta:** [`audio/pergunta/tomada-1.mp3`](audio/pergunta/tomada-1.mp3) (a escolhida), [`tomada-2.mp3`](audio/pergunta/tomada-2.mp3) e [`tomada-3.mp3`](audio/pergunta/tomada-3.mp3).
- **Telas:** [`aprovacao/folha-telas.jpg`](aprovacao/folha-telas.jpg), 18 capturas do celular, mais 2 páginas inteiras.
- **Levantamento:** [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg).

## Correções de 25/11/2026 (pedidas pelo Willian)
1. **A pergunta do começo, com entonação de pergunta.**
   - Regravei **só a pergunta**, à parte, com `scripts/pergunta.py`: Alexa, eleven_v4, mesmas configurações, seeds 7101, 7102 e 7103.
   - **A medida:** a frequência da voz na metade final da última palavra, comparada com a palavra anterior, em semitons.
   - **O texto ganhou a forma "Oi! Tem vaga de doze a catorze de Dezembro? Pra dois?"** Antes, testei 5 jeitos de escrever com 3 seeds cada (`audio/pergunta/candidatas/`).
     - Os que terminam em "pessoas?" ou em "…, pra dois?" sobem na sílaba forte e descem no fim. Soam como afirmação, que era o problema.
     - Partida em duas, a pergunta **sobe no fim** nas 3 seeds. A subida, em semitons, foi de +11,1, +6,4 e +9,4.
   - **Escolhida:** a tomada 1 (seed 7101), de 211 Hz em "Pra" para 401 Hz no fim de "dois". A transcrição das três dá o texto certo.
   - **O resto da locução** é a tomada única de antes (seed 7100), guardada em `audio/voz-tomada-unica.wav`. Só a montagem em volta da pergunta mudou.
   - O balão continua "Tem vaga de 12 a 14 de Dezembro para 2?". A voz diz "Oi!" antes e "Pra dois?" no lugar de "para 2", como alguém perguntando.
2. **"Dezembro" com inicial maiúscula** no balão.
   - A legenda não tem mês, e a capa só tem datas em número (12/12/2026, conferido no OCR da capa).
   - Virou regra da série (REGRAS.md, seção "Legenda").
3. **Sem "E no começo, a FAZLO configura tudo com você."**
   - Saiu da voz, da legenda e da tela. O fecho fica com "Reserva nova, em segundos.", a logo e @fazlohospeda.
   - Virou regra da série (REGRAS.md, seção "Fecho").
   - O vídeo ficou com **58,5 s**, sem fala nova; as pausas de leitura são as mesmas de antes.

## Como foi feito
**Estrutura:** desafio com cronômetro, em tempo real (ver a linha nova em "Estruturas já usadas", no [REGRAS.md](../REGRAS.md)).

**Cronômetro:** mostra o tempo real da captura final (`scripts/capturar.cjs`), no ritmo de pessoa aprovado.
- **Total:** 23,55 s, que aparece como **23,5 s** na tela.
- O script pararia se o total saísse de 23,0 a 23,9 s.
- No vídeo, o relógio corre 1 s por 1 s, e as telas trocam nos instantes medidos (`telas/eventos.json`).

**Motor:** o dos episódios 2 a 5 (`src/anim.js`), com o cronômetro, a barra de parciais, a digitação letra a letra e as duas rolagens de página. O plano está em `src/plano.js`.

**Voz:** Alexa, eleven_v4, estabilidade 0,50 e semelhança 0,75. A locução é a tomada única (seed 7100); a pergunta do começo é uma tomada à parte (seed 7101).
- O texto enviado usa "Fázlo", "Hospéda", "Uátsap", "Pix" e os números por extenso.
- Nenhum valor em dinheiro é falado.
- No tempo, a fala diz "em menos de meio minuto": o número fica só no cronômetro.
- No desafio, cada frase começa no passo medido (`scripts/linha.py`).

**Som:**
- A trilha é a da série; o groove entra na largada do cronômetro e fica 13,9 dB abaixo da voz durante a fala.
- São 97 efeitos, tirados dos gestos da animação.
- O mestre tem −14,0 LUFS, com pico real de −2,1 dBTP.

**Dados:** Bica D'Água 02, de 12 a 14/12, para 2 adultos.
- Hóspede nova fictícia: Larissa Campos, (11) 90000-0021, no padrão da Demo.
- Sinal: R$ 580,00 via PIX.

## Conferência (`output/revisao/`, `telas/conferencia.json` e `capa/revisao/`)
- **Bloqueio de canal e conflito** (`canal.json`):
  - antes da reserva, a quinzena de 08/12 a 21/12 estava vazia: nenhum bloqueio e nenhuma reserva;
  - depois, só aparece "Larissa Campos, confirmada";
  - nenhuma captura mostra "Airbnb", "Booking", "Bloquead…" ou "Conflito" à vista (o texto visível de cada uma foi lido antes de salvar);
  - as 19 imagens que aparecem no vídeo são todas capturas conferidas;
  - a quinzena de hoje não foi capturada;
  - o OCR do vídeo procura as mesmas palavras.
- **Texto da página:** o texto proibido de sempre foi conferido antes de salvar cada uma das 20 capturas, sem nenhum achado. A única exceção é "Código da reserva".
- **OCR (Tesseract 5.3.4, português, instalado e conferido):**
  - capturas: 20, sem achados (`ocr-telas.json`);
  - vídeo: 223 quadros, um a cada 0,25 s, sem achados, com 10 a 570 letras lidas por quadro (`ocr-video.json`);
  - capa: sem achados.
  - Além do texto proibido, o OCR procura bloqueio de canal, conflito e "com sucesso".
- **Toques e destaques** (`avisos.json`): 88 instantes de toque, contorno, janela e marca, sem nenhum problema. Todos ficam na parte visível do celular.
- **Quadro a quadro, a 60 fps** (`conferencia.json`):
  - **Relógio:** desvio de 0 s em relação ao tempo do vídeo, e para em 23,55 s.
  - **Legenda:** não cobre janela nem toque. A menor distância até uma janela é de 276 px, e até um toque, de 35 px.
  - **Marca:** a logo nunca aparece com o cronômetro.
- **Capa:** dentro da regra da área segura e das sobreposições.

## Rodar
```bash
cd series/hospeda-na-pratica/06-nova-reserva
node scripts/capturar.cjs && python3 scripts/medir_textos.py   # para se houver texto proibido, canal à vista ou total fora de 23,0–23,9 s
python3 scripts/pergunta.py tomadas && python3 scripts/pergunta.py montar 1   # a pergunta à parte (a locução é a tomada única)
python3 scripts/linha.py
node scripts/render.cjs info && python3 scripts/audio.py
node scripts/render.cjs video --mix audio/mix.wav
node scripts/conferir.cjs && node scripts/conferir-canal.cjs && node scripts/conferir-avisos.cjs
python3 scripts/ocr.py telas && python3 scripts/ocr.py video
node capa/render.cjs
```
