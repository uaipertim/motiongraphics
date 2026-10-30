# Reel de marca · "Tudo num lugar só" (FAZLO Hospeda)

Vídeo de marca de ~25 a 28 s (a prévia, com tempos estimados, tem 27,6 s; a duração final vem da narração), para ser o vídeo fixado no perfil e o anúncio impulsionado: 1080×1920, 60 fps, com narração e legenda palavra por palavra.

- **Mensagem:** o Hospeda junta numa ferramenta o que a pousada hoje controla espalhado no WhatsApp, no PIX e no caderno.
- **Chamada:** uma só, no fim, para o WhatsApp.

**Não publicar.** O vídeo final só sai depois da narração, que é gerada pelo Willian no ElevenLabs. Este repositório não gera locução, e a chave de API nunca entra em chat, arquivo ou commit.

## Estado

Está na prévia para revisão: tempos estimados (13,5 letras/s, com respiro nos pontos), trilha e efeitos, sem voz. QA: aprovado.

| Arquivo | O que é |
|---|---|
| [`output/previa.mp4`](output/previa.mp4) | a prévia (com o aviso "PRÉVIA · SEM VOZ · TEMPOS ESTIMADOS" no topo) |
| [`output/storyboard.jpg`](output/storyboard.jpg) | um quadro por cena, com o tempo e a fala |
| [`output/capa.jpg`](output/capa.jpg) | a capa = o quadro 0, conferida pela regra das capas ([`revisao/capa.txt`](output/revisao/capa.txt), [`revisao/capa-no-feed.jpg`](output/revisao/capa-no-feed.jpg)) |
| [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt) | o QA (`scripts/qa.py`) |
| [`output/revisao/zonas-seguras.jpg`](output/revisao/zonas-seguras.jpg) | as áreas seguras e a faixa da legenda marcadas |

## Narração (para o ElevenLabs)

Texto exato, como a legenda mostra:

> Reserva no WhatsApp. Sinal no PIX. Saldo anotado no caderno. E no check-out, ninguém sabe quanto falta receber. O Fazlo Hospeda junta tudo isso: reservas, sinal, check-in, comanda e caixa. Você vê o que foi pago, o que foi consumido e quanto falta no check-out. Tudo num lugar só. Chame a gente no WhatsApp.

Como colar no ElevenLabs, com a grafia de pronúncia do perfil (o dicionário de `reels/serie-explica/scripts/pronuncia.py`):

> Reserva no Uátsap. Sinal no PIX. Saldo anotado no caderno. E no check-out, ninguém sabe quanto falta receber. O Fázlo Hospéda junta tudo isso: reservas, sinal, check-in, comanda e caixa. Você vê o que foi pago, o que foi consumido e quanto falta no check-out. Tudo num lugar só. Chame a gente no Uátsap.

- **Sugestão de voz:** igual aos outros vídeos do perfil: `eleven_v4`, voz Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`), estabilidade 0,50, semelhança 0,75.
- **Arquivo de tempos:** se der, baixar também o JSON with-timestamps, para a legenda sair palavra por palavra no tempo exato.
- **Grafia:** a legenda e a tela sempre mostram a grafia oficial ("FAZLO Hospeda", "WhatsApp").

## Depois que a narração chegar

```bash
cd reels/marca/tudo-num-lugar
python3 scripts/linha.py --audio audio/voz.mp3                              # tempos pelas pausas reais do áudio
#   ou, com o JSON with-timestamps do ElevenLabs (palavra por palavra):
python3 scripts/linha.py --alinhamento audio/alinhamento.json --audio audio/voz.mp3
node scripts/render.cjs info                         # plano, legenda e caixas
python3 scripts/audio.py                             # voz + trilha (abaixa quando a voz fala) + efeitos, −14 LUFS
node scripts/render.cjs video --mix audio/mix.wav    # output/tudo-num-lugar.mp4 (sem o aviso de prévia; mux com -t)
python3 scripts/qa.py --final                        # output/revisao/relatorio-final.txt
python3 scripts/storyboard.py --final
```

Os cortes se recalculam sozinhos com os tempos reais: cada corte cai na grade de meio tempo da trilha, até 80 ms depois da palavra.

## Os atos e as cenas

| Ato (fundo) | Fala | O que aparece |
|---|---|---|
| — | (quadro 0) | **Capa:** "RESERVA NO WhatsApp. / SINAL NO PIX. / SALDO NO caderno." com o risco limão feito à mão sob "caderno" e a pílula limão "Tudo num lugar só."; a logo pequena no topo. |
| **Preto: o problema** | "Reserva no WhatsApp. Sinal no PIX. Saldo anotado no caderno." | Uma palavra-chave grande por corte (WhatsApp / PIX / caderno), com o rótulo em mono e o ícone de traço (balão, moeda, caderno). A palavra bate na fala com rastro, e o risco limão é desenhado à mão sob "caderno". |
| | "E no check-out, ninguém sabe quanto falta receber." | Três cortes: "check-out," (sino de recepção), "ninguém sabe", "quanto **falta?**" (em limão, pulsando no fim da frase). |
| **Preto com cartões 3D: a solução** | "O Fazlo Hospeda junta tudo isso:" | A logo curta (anel limão + FAZLO Hospeda); no corte, "junta **tudo isso:**". |
| | "reservas, sinal, check-in, comanda e caixa." | Cinco cartões em cascata, inclinados em 3D, cada um com ícone e nome, entrando na sua palavra. Saem juntos, girando, com desfoque de movimento. |
| | "Você vê o que foi pago, o que foi consumido e quanto falta no check-out." | Cartões 3D que entram girando pela direita e saem pela esquerda: o calendário de ocupação (abstrato), "Sinal recebido R$ 450", a comanda ("Consumo") e "No check-out R$ 1.020". Os dois valores têm o selo "Exemplo fictício" no próprio cartão. |
| **Limão** | "Tudo num lugar só." | "Tudo isso" circulado à mão, "num lugar só." e o componente **telaDestaque**. A legenda fica preta e as chaves ganham uma pílula preta com o texto em limão. |
| **Preto: logo e chamada** | "Chame a gente no WhatsApp." | A logo, FAZLO Hospeda, o botão limão "Chame no WhatsApp" (pulsa na palavra) e @fazlohospeda. É a única chamada do vídeo. |

**Linguagem visual:**
- **Tipografia:** poucas palavras grandes (Inter Display 900), a palavra-chave em limão e um risco feito à mão em limão.
- **Ícones:** de traço, em limão: calendário, sino de recepção, moeda (PIX), comanda e caixa.
- **O que não entra:** ícones 3D de massinha, laranja, órbita de ícones em volta da logo e a frase "não precisa ser complicado".

**Sem interface do sistema:**
- Os cartões são ilustrativos e abstratos e não imitam o layout do Hospeda 1.5.1.
- Não há dados da demonstração nem nome de hóspede.
- Os únicos valores são R$ 450 e R$ 1.020, sempre com o selo.

## Como trocar o telaDestaque pela tela real da V2

O ato limão desenha o componente `telaDestaque(c, t, r, t0)` (`src/anim.js`) no retângulo x 150–930, y 820–1376 (780×556 px, cantos de 40 px). Ele fica acima da legenda e fora da coluna de botões. Hoje ele mostra uma composição abstrata, com quatro blocos que se encaixam. Para usar a imagem da tela real:

1. **A imagem:** ponha o PNG em `src/assets/`, por exemplo `src/assets/tela-destaque.png`.
   - Use a imagem em tamanho original, ou com pelo menos 1560 px de largura.
   - Deixe fora a faixa "Demonstração · Quero usar".
2. **A configuração:** em `src/tela-destaque.json`:
   ```json
   { "imagem": "assets/tela-destaque.png", "alinhar_x": 0.5, "alinhar_y": 0.0, "selo_exemplo": true }
   ```
   - **`imagem`:** o caminho relativo a `src/`; `null` volta para a composição abstrata.
   - **Encaixe:** a imagem cobre o retângulo sem distorcer.
   - **`alinhar_x`/`alinhar_y`:** de 0 a 1, escolhem que parte aparece quando ela é maior: 0 = a esquerda ou o topo, 0,5 = o centro.
   - **`selo_exemplo`:** põe o selo "Exemplo fictício" no canto da imagem. Deixe `true` sempre que a tela tiver valores ou dados.
3. **Gerar de novo:** `node scripts/render.cjs stills 21.5` para conferir, depois `info`, `audio.py`, `video` e `qa.py`.
   - O QA aceita em `src/assets` só a logo e a imagem configurada.

## Processo (o mesmo do educativo [saldo-checkout](../../educativo/saldo-checkout))

- **`roteiro.json`:**
  - por token, a fala (o que a voz diz), "tela" (o que a legenda mostra no lugar, ex.: "Fazlo Hospeda" → "FAZLO Hospeda"), a chave (em limão) e o id (o instante que dispara a animação);
  - o texto para o ElevenLabs e a legenda do post.
- **`scripts/linha.py`:** o modo estimado (13,5 letras/s), `--audio` (frases nas pausas reais) e `--alinhamento` (palavra por palavra, com os tempos do ElevenLabs).
- **`scripts/audio.py`:**
  - a trilha da Série Explica (92 BPM), que abaixa quando a voz fala, mais efeitos nos gestos: o golpe de cada corte, as palavras que batem, o risco, os cartões, as moedas dos valores e a sineta no fim;
  - com a voz: −14 LUFS e limitador em −2,4 dBTP (pico ≤ −1,5 dBTP no MP4);
  - na prévia sem voz, uma voz substituta (só para o cálculo) põe a trilha no nível em que vai ficar debaixo da narração.
- **`scripts/render.cjs`:** stills, info, capa e vídeo. O áudio entra no MP4 com `-t` (a duração exata do vídeo), nunca `-shortest`.
- **`src/anim.js`:**
  - Canvas 2D e cartões 3D com perspectiva real: a textura é projetada numa grade de triângulos.
  - A pose de cada cartão é uma função do tempo: cada quadro é determinístico, sem animação CSS em tempo real.
  - Desfoque de movimento: a média de até 9 amostras no obturador (0,8 quadro), proporcional à velocidade do cartão na tela.
- **Legenda:** palavra por palavra no estilo do reel-09 (Inter Display 900, branca, chaves em limão), na faixa pedida y 1424–1536, x 150–950.
  - Ela fica em 54 px (linhas em y 1466/1524), porque duas linhas de 68 px não cabem em 112 px de altura.
  - Sem palavra órfã: a quebra das linhas evita uma palavra sozinha numa linha.
- **Áreas seguras:** nada em y > 1536 nem em x ≥ 950 entre y 1060 e 1560 (o motor recorta essas áreas, e o QA confere pelos pixels).
