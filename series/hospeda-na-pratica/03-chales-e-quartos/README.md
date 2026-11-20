# FAZLO Hospeda na prática, episódio 3: Chalés e quartos (primeira prévia)

Segue as [regras da série](../REGRAS.md). O roteiro aprovado, as decisões e a linha do tempo com os tempos reais estão no [`ROTEIRO.md`](ROTEIRO.md). Vai ao ar na quarta, 25/11, às 19h. **Prévia para aprovação; não publicar.**

## Arquivos
- ▶ **Prévia (mestre):** [`output/hospeda-na-pratica-03-chales-e-quartos.mp4`](output/hospeda-na-pratica-03-chales-e-quartos.mp4): 1080×1920, 60 fps, 72,1 s, 35 MB.
- **Versão WhatsApp:** [`output/hospeda-na-pratica-03-chales-e-quartos-whatsapp.mp4`](output/hospeda-na-pratica-03-chales-e-quartos-whatsapp.mp4): 30 fps, CRF 27, 9,6 MB.
- **Quadros-chave:** [`aprovacao/quadros-chave.jpg`](aprovacao/quadros-chave.jpg), 12 quadros.
- **Telas:** [`aprovacao/folha-telas.jpg`](aprovacao/folha-telas.jpg), 22 capturas, e mais `acomodacoes-limpa`, da correção.
- **Correção da frase 8:** [`aprovacao/frase8-inicio-corrigido.jpg`](aprovacao/frase8-inicio-corrigido.jpg).
- **Levantamento:** [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg), com a legenda do print 4 corrigida, e a verificação do "750" em [`aprovacao/verificacao-750.png`](aprovacao/verificacao-750.png).

## Como foi feito
O padrão é o do episódio 2, com o mesmo motor de animação, e quatro coisas a mais:
- closes de 2× nos pontos de toque;
- dois celulares lado a lado no antes e depois (Ipê 08 e Chalé Serra 01);
- o calendário do bloqueio, toque a toque;
- a digitação dos valores, revelada a partir da própria captura.

**Voz:** Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75 e seed 7100, uma tomada só.
- O texto enviado à voz usa "Fázlo" e "Hospéda". A voz não fala nenhum valor.
- A montagem só ajusta as pausas entre as frases.

**Som:**
- A trilha é a dos episódios anteriores e fica 13,7 dB abaixo da voz durante a fala.
- São 145 efeitos, tirados dos gestos da animação.
- Mestre: −14,0 LUFS, com pico real de −2,1 dBTP. Versão WhatsApp: −14,0 LUFS e −2,0 dBTP.

## Conferência (`output/revisao/` e `telas/conferencia.json`)
- **Selo "Bloqueada":** o Chalé de Pedra 07 foi liberado antes das capturas. Antes de salvar cada captura, o script confere que nenhum "Bloqueada" está dentro da tela. O resultado é 0 nas 22.
- **Texto da página:** antes de salvar cada captura, o script lê o texto visível e procura e-mail real, "Demo", "Demonstração", "Quero usar", senha, código, token e link (http ou .ics). Não achou nada nas 22.
- **OCR (Tesseract, português):**
  - 22 capturas, sem achados (`ocr-telas.json`);
  - 178 quadros do vídeo com tela, um a cada 0,25 s, de 16,2 a 60,7 s, incluindo os dois celulares lado a lado, sem achados (`ocr-video.json`).
  - Além do mesmo texto proibido, o OCR procura o selo "Bloqueada" e nome de pousada em caixa alta.
- **Quadro a quadro, a 60 fps, nos 4.325 quadros** (`conferencia.json`):
  - **Marca:** os selos "Chalé", "Quarto" e "Suíte" nunca encostam no logo. A menor distância é de 265 px.
  - **Legenda e janelas:** a legenda não cobre nenhuma janela. A menor distância é de 676 px.
  - **Legenda e toques:** a legenda também não cobre nenhum toque. A tela e os toques ficam no palco, e a legenda fica pelo menos 25 px abaixo dele.

## Correção da frase 8 (prévia aprovada com esta correção)
- **O defeito:** a cena começava na captura da lista que ainda tinha o aviso "Acomodação atualizada com sucesso.", e ele cobria o "+ Nova acomodação" na hora do toque.
- **A correção:**
  - nova captura `acomodacoes-limpa`, no mesmo estado (Ipê 08 já com R$ 550,00), tirada depois de sair para o Início e voltar;
  - o script recusa a captura se houver qualquer aviso na tela;
  - as outras 22 capturas saíram idênticas pixel a pixel.
- **Conferência do vídeo inteiro** (`scripts/conferir-avisos.cjs`, resultado em `output/revisao/avisos.json`):
  - em cada toque e em cada contorno, no instante e 0,15 s e 0,3 s depois, vê qual captura está na tela e se algum aviso do app fica por cima;
  - são 87 instantes, e nenhum fica coberto;
  - na versão anterior, o mesmo teste acusa exatamente o toque do "+ Nova acomodação" (38,4 s).
- **O que não mudou:** a duração (72,1 s) e todo o resto.

## Rodar
```bash
cd series/hospeda-na-pratica/03-chales-e-quartos
node scripts/capturar.cjs                            # telas/*.png + alvos.json + conferencia.json (Demo recarregada)
python3 scripts/voz.py && python3 scripts/linha.py   # audio/voz.wav, audio/voz-montada.wav, linha.json
node scripts/render.cjs info && python3 scripts/audio.py
node scripts/render.cjs video --mix audio/mix.wav    # output/hospeda-na-pratica-03-chales-e-quartos.mp4
node scripts/conferir.cjs && python3 scripts/ocr.py telas && python3 scripts/ocr.py video
ffmpeg -i output/hospeda-na-pratica-03-chales-e-quartos.mp4 -vf fps=30 -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart output/hospeda-na-pratica-03-chales-e-quartos-whatsapp.mp4
```
