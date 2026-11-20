# FAZLO Hospeda na prática, episódio 2: Sua equipe no Hospeda (primeira prévia)

Segue as [regras da série](../REGRAS.md). O roteiro aprovado e a linha do tempo, com os tempos reais da locução, estão no [`ROTEIRO.md`](ROTEIRO.md). **Prévia para aprovação; não publicar.**

## Arquivos
- ▶ **Prévia (mestre):** [`output/hospeda-na-pratica-02-sua-equipe.mp4`](output/hospeda-na-pratica-02-sua-equipe.mp4): 1080×1920, 60 fps, 63,4 s, 31 MB.
- **Versão WhatsApp:** [`output/hospeda-na-pratica-02-sua-equipe-whatsapp.mp4`](output/hospeda-na-pratica-02-sua-equipe-whatsapp.mp4): 1080×1920, 30 fps, CRF 27, 8,4 MB.
- **Quadros-chave:** [`aprovacao/quadros-chave.jpg`](aprovacao/quadros-chave.jpg), 12 quadros.
- **Miniatura:** [`output/miniatura.jpg`](output/miniatura.jpg), o quadro 0.
- **Telas:** [`aprovacao/folha-telas.jpg`](aprovacao/folha-telas.jpg), as 13 aprovadas.

## Como foi feito
O padrão é o do vídeo curto de venda ([`reels/venda-curta-hospeda`](../../../reels/venda-curta-hospeda/README.md)), com o mesmo motor de animação.
- **Telas:** a tela inteira do celular, com a câmera aproximando no ponto falado.
- **Destaques:** contorno limão, onda no toque e janelas recortadas da mesma captura.
- **Estados:** a tela troca de estado no lugar. Os painéis sobem, a lista rola, e a digitação revela o texto da captura letra a letra.
- **Voz:** Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75, seed 7100, com a narração inteira numa tomada só.
  - O texto enviado à voz usa "Fázlo Hospéda" e "e-mail".
  - A montagem (`scripts/linha.py`) só ajusta os silêncios entre as frases; nenhuma palavra é cortada nem acelerada.
- **Legenda:** palavra por palavra, numa faixa própria embaixo. As frases 1 e 13 ficam fora porque estão escritas na tela.
- **Som:** a trilha é a do vídeo de venda: 120 BPM, groove a partir do logo e resolução no fecho.
  - A trilha fica 13,7 dB abaixo da voz durante a fala.
  - São 118 efeitos, tirados dos gestos da animação.
  - Mestre: −14,0 LUFS, com pico real de −2,0 dBTP. Versão WhatsApp: −14,0 LUFS e −1,8 dBTP.

## Conferência (`output/revisao/`)
- **Texto proibido nas capturas:** antes de salvar cada uma das 17 capturas, o script lê o texto visível da página. Não sobrou nenhum caso:
  - "fazlodigital", "Demo", "Demonstração" e "Quero usar";
  - senha, código ou token;
  - "Caixa" ou "Recepção" como sobrenome.
- **OCR das capturas** (Tesseract, português): nas 17 capturas, nada proibido (`ocr-telas.json`).
- **OCR do vídeo:** 171 quadros dos trechos com tela, um a cada 0,25 s, de 13,4 a 56,2 s, sem nada proibido (`ocr-video.json`).
  - Nos trechos com tela, cada pixel vem dessas capturas ou de texto desenhado pelo próprio vídeo.
  - A palavra "senha" só aparece na cena do gancho, no bilhete "Senha da recepção ••••••" e na pergunta. Não há nenhuma senha escrita.
- **Nome de pousada:** não aparece em caixa alta. Só existe no domínio fictício dos e-mails, `pousadadaserra.exemplo`.
- **Quadro a quadro, a 60 fps, nos 3.803 quadros** (`conferencia.json`):
  - **Marca:** as pessoas e as chaves nunca encostam no símbolo nem no nome. A menor distância é de 186 px.
  - **Legenda e janelas:** a legenda não cobre nenhuma janela em destaque. A menor distância é de 596 px.
  - **Legenda e toques:** a legenda também não cobre nenhum toque. A tela e os toques ficam no palco, até y 1350, e a legenda fica pelo menos 25 px abaixo dele.
- **Sincronia:** cada palavra da legenda entra no início medido dessa palavra na locução (`linha.json`).

## Rodar
```bash
cd series/hospeda-na-pratica/02-sua-equipe
node scripts/capturar.cjs                            # telas/*.png + alvos.json + conferencia.json (Demo)
python3 scripts/voz.py && python3 scripts/linha.py   # audio/voz.wav, audio/voz-montada.wav, linha.json
node scripts/render.cjs info && python3 scripts/audio.py
node scripts/render.cjs video --mix audio/mix.wav    # output/hospeda-na-pratica-02-sua-equipe.mp4
node scripts/conferir.cjs && python3 scripts/ocr.py telas && python3 scripts/ocr.py video
ffmpeg -i output/hospeda-na-pratica-02-sua-equipe.mp4 -vf fps=30 -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart output/hospeda-na-pratica-02-sua-equipe-whatsapp.mp4
```
