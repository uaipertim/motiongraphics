# Reel 09 · Dois hóspedes, um chalé

Formato novo: uma personagem real, a **Clara** (gerada no Google Flow), mais motion graphics e a narração da marca. O vídeo tem 1080×1920 (9:16), 60 fps e **51 s**.

A Clara é uma dona de pousada contando uma dor. Ela não é cliente e não cita o Hospeda. Quem apresenta a solução é a narração da marca (voz Raquel), e os cortes de reação da Clara respondem ao que a narração diz.

**Isolamento:** tudo deste Reel fica nesta pasta: roteiro, voz, animação, legenda, trilha e render. Nada importa nem altera o código das séries ou dos outros Reels. As fontes, a logo e os clipes são cópias.

> **Estado:** as cenas 1–4, 7 e 8 estão prontas. As **cenas 5 e 6** (interface real do Hospeda e corte aliviado, 26,0–42,6 s) estão com um marcador ("aguardando os prints"), à espera dos prints reais:
> - a reserva preenchida;
> - "Reserva Criada!" com a acomodação;
> - o calendário semanal com a reserva;
> - a mensagem de bloqueio da reserva duplicada.

## Timeline (ajustada aos áudios reais)

| Tempo | Áudio | Visual |
|---|---|---|
| 0,00–6,80 | Clara (clipe 0,2–7,0 s, áudio original) | Card da Clara. O caderno rabiscado entra em "caderno". Dois hóspedes sobem até o mesmo chalé e colidem (alerta vermelho). Zoom leve no rosto em "mesmo chalé" |
| 6,80–8,80 | "Parece exagero?" | Corte: reação cansada (5,9–7,9 s) |
| 9,0–13,6 | "…anota tudo no caderno e no WhatsApp, acontece mais do que parece." | Cards "Caderno" e "WhatsApp" com o chip "ANOTADO EM DOIS LUGARES". Em "acontece", ligação vermelha e alertas pipocando |
| 13,60–24,00 | Bloco 3 (13,60–23,28) | Caos organizado: balão (13,6), página do caderno (15,9), recado em papel solto (17,2). Em "o mesmo chalé", duas reservas entram dos lados e colidem em "duas vezes" (22,6), com o chip "MESMO CHALÉ · MESMAS DATAS" |
| 15,75–16,75 | (sobre "anotada no caderno") | Corte extra: reação cansada (2,5–3,5 s, ela lendo o caderno), num card menor |
| 24,00–26,00 | Sem narração | Corte: reação pensativa (2,5–4,5 s) |
| 26,0–42,6 | Bloco 5 (26,20–39,96) | **Pendente:** o card da Clara vira celular e mostra a interface real (lançamento → calendário → bloqueio da duplicada). Depois, o corte da reação aliviada (40,2–42,4; clipe 1,2–3,4 s) |
| 42,60–48,00 | "Menos caderno, menos susto. Conheça o FAZLO Hospeda: link na bio." (até 47,64) | "− caderno" e "− susto" riscados em limão. "Conheça o FAZLO Hospeda" e o chip "link na bio" |
| 48,00–51,00 | Fim da trilha + sineta | Logo do FAZLO Hospeda, só depois da última palavra |

Mudança em relação ao plano aprovado: o fim da colisão foi segurado até 24,0 s, para o chip vermelho ficar ~1,5 s na tela. Com isso, tudo depois andou +0,4 s, e a logo termina em 51,0 s.

## Voz (configuração só deste Reel)

- **model_id:** `eleven_v4`.
- **Voz:** Raquel, `GDzHdQOi6jjf8zaXhCYD`.
- **voice_settings (versão C do teste A/B):** `stability 0.50`, `similarity_boost 0.75`. `style`, `use_speaker_boost` e `speed` não são enviados (ficam no padrão).
- **Como o texto vai:** cada bloco é uma chamada, com a frase completa.
- **Pronúncia:**
  - "Fazlo Hospéda" vai escrito assim para a API.
  - "WhatsApp" vai como **"Uátsap"**, só no texto enviado (`GRAFIA` em `scripts/voz.py`).
  - A legenda mostra o texto do roteiro, com a marca escrita como se escreve: "FAZLO Hospeda".
- **Durações reais:** bloco 2: 6,16 s · bloco 3: 9,68 s · bloco 5: 13,76 s · bloco 7: 5,04 s. O plano da API só libera mp3 de 128 kb/s.

## Áudio

- **Volume:** a fala da Clara e cada narração são igualadas em −16 LUFS antes da mixagem. Na mix final, os trechos de voz ficam todos a ±0,3 dB uns dos outros.
- **Clipes de reação:** entram mudos.
- **Trilha:** colchão sintetizado (Am9 → Fmaj9 → Cmaj9 → G6/9, 84 BPM), 20 dB abaixo das vozes. Abaixa mais 8 dB enquanto alguém fala.
- **Efeitos curtos nos eventos:** pop, corte, whoosh, impacto na colisão, risco da caneta e sineta na logo.
- **Mix final:** −14 LUFS, pico ≤ −1,5 dBTP.

## Legenda

- **Estilo da série:** palavra por palavra, no instante da fala; Inter Display 900, 68 px, branca; destaques em limão; sem painel.
- **Posição:** linhas em y 1332 e 1412, centrada em x 540, limitada a x 130–950.
- **Páginas por frase:**
  - o corte é feito nos sinais de pontuação;
  - frase longa é dividida em partes equilibradas, sem separar um destaque;
  - cada página tem até 2 linhas, também equilibradas.
- **Tempos da Clara:** a chave da API não tem permissão de transcrição. Os tempos saem das pausas reais da fala, medidas pela energia do áudio, e dentro de cada trecho são divididos pelas sílabas (`roteiro.json → clara.palavras`).

## Arquivos

- `roteiro.json`: textos, tempos de cada bloco e corte, destaques e o texto do "caos" (chalé, datas, hóspedes fictícios).
- `scripts/voz.py`: narração (ElevenLabs, with-timestamps) → `audio/voz/`.
- `scripts/linha.py`: palavras no tempo do vídeo → `audio/linha.json`.
- `scripts/quadros.sh`: quadros dos clipes → `src/quadros/` (fora do git; saem dos MP4 em `src/clips/`).
- `src/anim.js`: as cenas e a legenda. O `src/index.html` abre no navegador como prévia.
- `scripts/audio.py`: mixagem → `audio/mix.wav`.
- `scripts/previa_audio.sh`: prévia só de áudio → `revisao/previa-audio.mp3`.
- `scripts/render.cjs`: `cues`, `stills` e `video` → `output/fazlo-hospeda-reel-09.mp4`.

```bash
cd reels/reel-09
bash scripts/reel.sh                 # tudo (só gera na API a narração que falta ou mudou)
bash scripts/reel.sh --refaz 3       # refaz o bloco 3 da narração
node scripts/render.cjs stills 2.6,22.9 --dir output/stills
```
