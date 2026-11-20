# FAZLO Hospeda na prática, episódio 4: Produtos da comanda (primeira prévia)

Segue as [regras da série](../REGRAS.md). O roteiro aprovado e a linha do tempo com os tempos reais estão no [`ROTEIRO.md`](ROTEIRO.md). Vai ao ar na sexta, 27/11, às 19h. **Vídeo aprovado (commit 70d6ce9); capa para aprovação. Não publicar.**

## Arquivos
- ▶ **Prévia (mestre):** [`output/hospeda-na-pratica-04-produtos-da-comanda.mp4`](output/hospeda-na-pratica-04-produtos-da-comanda.mp4): 1080×1920, 60 fps, 74,7 s, 33 MB.
- **Versão WhatsApp** (feita antes da regra de versão única de 20/11/2026; dos próximos episódios em diante só sai o mestre): [`output/hospeda-na-pratica-04-produtos-da-comanda-whatsapp.mp4`](output/hospeda-na-pratica-04-produtos-da-comanda-whatsapp.mp4): 30 fps, CRF 27, 9,1 MB.
- **Capa (para aprovação):** [`capa/capa.jpg`](capa/capa.jpg) e o recorte do feed, 4:5: [`capa/capa-no-feed.jpg`](capa/capa-no-feed.jpg).
- **Quadros-chave:** [`aprovacao/quadros-chave.jpg`](aprovacao/quadros-chave.jpg), 12 quadros.
- **Telas:** [`aprovacao/folha-telas.jpg`](aprovacao/folha-telas.jpg), 17 capturas.
- **Levantamento:** [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg).

## Como foi feito
O padrão é o dos episódios 2 e 3, com o mesmo motor de animação:
- telas inteiras, closes de 2× nos toques, janelas que saltam e digitação letra a letra;
- no antes e depois (Cerveja e Refrigerante), os dois celulares inteiros e, em seguida, o **close nos dois cartões**, um em cima do outro.

**Voz:** Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75 e seed 7100, uma tomada só.
- O texto enviado usa "Fázlo" e "Hospéda". Nenhum valor é falado.
- A montagem só ajusta as pausas.

**Som:**
- A trilha é a da série e fica 13,9 dB abaixo da voz durante a fala.
- São 127 efeitos, tirados dos gestos da animação.
- Mestre: −14,0 LUFS, com pico real de −2,1 dBTP. Versão WhatsApp: −14,0 LUFS e −1,6 dBTP.

## Conferência (`output/revisao/` e `telas/conferencia.json`)
- **Texto da página:** antes de salvar cada uma das 17 capturas, o script lê o texto visível e procura e-mail real, "Demo", "Demonstração", "Quero usar", senha, código, token e link. Não achou nada.
- **Capturas limpas:** as 7 capturas "limpas" foram recusadas se houvesse qualquer aviso do app na tela. Nenhuma tinha.
- **OCR (Tesseract, português):**
  - 17 capturas, sem achados (`ocr-telas.json`);
  - 194 quadros do vídeo com tela, um a cada 0,25 s, incluindo os dois antes e depois, sem achados (`ocr-video.json`).
- **Avisos por cima de toque ou destaque** (`avisos.json`): 69 instantes de toque e de contorno verificados, 0 com aviso do app por cima.
- **Quadro a quadro, a 60 fps** (`conferencia.json`):
  - **Marca:** os selos "Bebidas", "Alimentos" e "Experiências" nunca encostam no logo. A menor distância é de 265 px.
  - **Legenda:** não cobre nenhuma janela (a menor distância é de 630 px) nem nenhum toque. A legenda fica pelo menos 25 px abaixo do palco.

## Rodar
```bash
cd series/hospeda-na-pratica/04-produtos-da-comanda
node scripts/capturar.cjs                            # telas/*.png + alvos.json + conferencia.json (Demo recarregada)
python3 scripts/voz.py && python3 scripts/linha.py   # audio/voz.wav, audio/voz-montada.wav, linha.json
node scripts/render.cjs info && python3 scripts/audio.py
node scripts/render.cjs video --mix audio/mix.wav    # output/hospeda-na-pratica-04-produtos-da-comanda.mp4
node scripts/conferir.cjs && node scripts/conferir-avisos.cjs && python3 scripts/ocr.py telas && python3 scripts/ocr.py video
ffmpeg -i output/hospeda-na-pratica-04-produtos-da-comanda.mp4 -vf fps=30 -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart output/hospeda-na-pratica-04-produtos-da-comanda-whatsapp.mp4
```
