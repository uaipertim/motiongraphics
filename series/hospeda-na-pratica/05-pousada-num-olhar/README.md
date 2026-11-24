# FAZLO Hospeda na prática, episódio 5: A pousada num olhar

Segue as [regras da série](../REGRAS.md). O roteiro aprovado (etapa 1, commit e5b2240) e a linha do tempo com os tempos reais estão no [`ROTEIRO.md`](ROTEIRO.md). Vai ao ar na segunda, 30/11, às 19h. **Vídeo e capa prontos, para aprovação. Não publicar.**

## Arquivos
- ▶ **Vídeo (mestre, versão única):** [`output/hospeda-na-pratica-05-pousada-num-olhar.mp4`](output/hospeda-na-pratica-05-pousada-num-olhar.mp4).
  - 1080×1920, 60 fps, 67,7 s, 28 MB, H.264 e AAC.
  - Não há versão WhatsApp (regra de versão única de 20/11/2026).
- **Capa:** [`capa/capa.jpg`](capa/capa.jpg) e o recorte do feed, 4:5: [`capa/capa-no-feed.jpg`](capa/capa-no-feed.jpg).
- **Miniatura (quadro 0):** [`output/miniatura.jpg`](output/miniatura.jpg).
- **Quadros-chave:** [`aprovacao/quadros-chave.jpg`](aprovacao/quadros-chave.jpg), 14 quadros.
- **Telas:** [`aprovacao/folha-telas.jpg`](aprovacao/folha-telas.jpg): 5 capturas do celular e 3 páginas inteiras.
- **Levantamento:** [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg).

## Como foi feito
**Estrutura:** pergunta e resposta, numa tela só (ver a linha nova em "Estruturas já usadas", no [REGRAS.md](../REGRAS.md)).
- O celular fica com o Início do começo ao fim.
- A tela **rola de verdade** dentro dele: cada estado é a página inteira, que corre por baixo do cabeçalho e da barra de baixo do app.
- As sete perguntas entram grandes em cima do celular. A resposta salta numa janela, com marcas dentro dela.
- A pergunta respondida vira um selinho "✓". No fecho, os sete cercam o celular, com "Uma tela, o dia inteiro".

**Motor:** o dos episódios 2 a 4 (`src/anim.js`), com a rolagem da página, as marcas dentro das janelas, as perguntas e os selinhos. O plano está em `src/plano.js`.

**Voz:** Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75 e seed 7100, numa tomada só.
- O texto enviado usa "Fázlo", "Hospéda" e "Pix".
- Nenhum número e nenhum valor são falados.
- "check-out" ficou: a transcrição da locução devolve "checkout".
- A montagem só ajusta as pausas.

**Som:**
- A trilha é a da série, 13,6 dB abaixo da voz durante a fala.
- São 99 efeitos, tirados dos gestos da animação.
- O mestre tem −14,0 LUFS, com pico real de −2,0 dBTP.

**Dados:** só os da Demo. Nada é digitado nem alterado.
- No painel "Recebido hoje", os operadores levam os nomes do episódio 2: João Caixa vira João Pereira, e Mariana Recepção vira Mariana Costa.
- O painel de Chegadas, que diverge do cartão, não aparece.

## Conferência (`output/revisao/` e `telas/conferencia.json`)
- **Números:** a captura só segue se os números forem os mesmos do levantamento:
  - R$ 1.525,00 = PIX 900 + Dinheiro 125 + Crédito 380 + Débito 120;
  - Hospedados 10, Chegadas 2, Saídas 2 e Precisa de atenção 4;
  - as listas de saídas e chegadas;
  - os dois painéis.
- **Texto da página:** antes de salvar cada uma das 8 capturas, o script procura:
  - e-mail, "Demo", "Demonstração" e "Quero usar";
  - senha, código, token, link e iCal;
  - os erros de exemplo dos canais;
  - "com sucesso";
  - os nomes "João Caixa" e "Mariana Recepção".
  
  Não achou nada.
- **Montagem da rolagem** (`montagem.json`): nas 5 rolagens usadas, a página com o cabeçalho e a barra dá a mesma imagem que a captura do celular (0 a 0,02% de pixels diferentes).
  - O ponteiro sai da tela antes de cada captura. Numa primeira tentativa, um botão tinha ficado com cor de "mouse em cima".
- **OCR (Tesseract, português):**
  - 8 capturas: sem achados (`ocr-telas.json`);
  - 245 quadros do vídeo, um a cada 0,25 s: sem achados (`ocr-video.json`);
  - capa: sem achados (`capa/revisao/ocr.json`).
- **Toques e destaques** (`avisos.json`): 78 instantes de toque, contorno, janela e marca, sem nenhum problema.
  - Nenhum aviso do app na tela.
  - Todo alvo fica na parte visível do celular, fora do cabeçalho e da barra de baixo.
  - Nada salta nem ganha contorno sozinho no cartão "Conflito com o Airbnb": só o contorno do bloco "Precisa de atenção" inteiro passa por ele.
- **Quadro a quadro, a 60 fps** (`conferencia.json`):
  - **Legenda:** não cobre janela nem toque. A menor distância até uma janela é de 61 px, e até o palco, de 35 px.
  - **Selinhos:** nunca ficam por cima do celular.
  - **Marca:** a logo e os selinhos nunca estão na tela ao mesmo tempo (0 quadros), então nada encosta na logo.
- **Capa:** `capa/render.cjs` confere a área segura do feed e as sobreposições: dentro da regra.

## Rodar
```bash
cd series/hospeda-na-pratica/05-pousada-num-olhar
node scripts/levantar.cjs && python3 scripts/folha_levantamento.py   # levantamento (etapa 1)
node scripts/capturar.cjs && python3 scripts/conferir-montagem.py      # telas/*.png + alvos.json (para se os números mudarem)
python3 scripts/voz.py && python3 scripts/linha.py                     # audio/voz.wav, audio/voz-montada.wav, linha.json
node scripts/render.cjs info && python3 scripts/audio.py
node scripts/render.cjs video --mix audio/mix.wav                      # output/hospeda-na-pratica-05-pousada-num-olhar.mp4
node scripts/conferir.cjs && node scripts/conferir-avisos.cjs && python3 scripts/ocr.py telas && python3 scripts/ocr.py video
node capa/render.cjs
```
