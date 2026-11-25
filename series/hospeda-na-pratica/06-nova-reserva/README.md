# FAZLO Hospeda na prática, episódio 6: Nova reserva em segundos

Segue as [regras da série](../REGRAS.md). O roteiro aprovado (etapa 1, commit 0c62029) e o que ficou no vídeo estão no [`ROTEIRO.md`](ROTEIRO.md). Vai ao ar na quarta, 02/12, às 19h. **Vídeo e capa prontos, para aprovação. Não publicar.**

## Arquivos
- ▶ **Vídeo (mestre, versão única):** [`output/hospeda-na-pratica-06-nova-reserva.mp4`](output/hospeda-na-pratica-06-nova-reserva.mp4).
  - 1080×1920, 60 fps, 61,6 s, 22 MB, H.264 e AAC.
  - Não há versão WhatsApp.
- **Capa:** [`capa/capa.jpg`](capa/capa.jpg) e o recorte do feed, 4:5: [`capa/capa-no-feed.jpg`](capa/capa-no-feed.jpg). É o cartão do resumo saltando da tela "Reserva Criada!".
- **Miniatura (quadro 0):** [`output/miniatura.jpg`](output/miniatura.jpg).
- **Quadros-chave:** [`aprovacao/quadros-chave.jpg`](aprovacao/quadros-chave.jpg), 20 quadros.
- **Telas:** [`aprovacao/folha-telas.jpg`](aprovacao/folha-telas.jpg), 18 capturas do celular, mais 2 páginas inteiras.
- **Levantamento:** [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg).

## Como foi feito
**Estrutura:** desafio com cronômetro, em tempo real (ver a linha nova em "Estruturas já usadas", no [REGRAS.md](../REGRAS.md)).

**Cronômetro:** mostra o tempo real da captura final (`scripts/capturar.cjs`), no ritmo de pessoa aprovado.
- **Total:** 23,55 s, que aparece como **23,5 s** na tela.
- O script pararia se o total saísse de 23,0 a 23,9 s.
- No vídeo, o relógio corre 1 s por 1 s, e as telas trocam nos instantes medidos (`telas/eventos.json`).

**Motor:** o dos episódios 2 a 5 (`src/anim.js`), com o cronômetro, a barra de parciais, a digitação letra a letra e as duas rolagens de página. O plano está em `src/plano.js`.

**Voz:** Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75 e seed 7100, numa tomada só.
- O texto enviado usa "Fázlo", "Hospéda", "Uátsap", "Pix" e os números por extenso.
- Nenhum valor em dinheiro é falado.
- No tempo, a fala diz "em menos de meio minuto": o número fica só no cronômetro.
- No desafio, cada frase começa no passo medido (`scripts/linha.py`).

**Som:**
- A trilha é a da série; o groove entra na largada do cronômetro e fica 13,6 dB abaixo da voz durante a fala.
- São 99 efeitos, tirados dos gestos da animação.
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
  - vídeo: 221 quadros, um a cada 0,25 s, sem achados, com 28 a 578 letras lidas por quadro (`ocr-video.json`);
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
python3 scripts/voz.py && python3 scripts/linha.py
node scripts/render.cjs info && python3 scripts/audio.py
node scripts/render.cjs video --mix audio/mix.wav
node scripts/conferir.cjs && node scripts/conferir-canal.cjs && node scripts/conferir-avisos.cjs
python3 scripts/ocr.py telas && python3 scripts/ocr.py video
node capa/render.cjs
```
