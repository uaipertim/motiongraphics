# Reel de marca · "Tudo num lugar só" (FAZLO Hospeda)

Vídeo de marca de 30 a 34 s, para ser o vídeo fixado no perfil e o anúncio impulsionado: 1080×1920, 60 fps, com narração e legenda palavra por palavra.

- **Mensagem:** o Hospeda junta numa ferramenta o que a pousada hoje controla espalhado no WhatsApp, no PIX e no caderno.
- **Chamada:** uma só, no fim, para o WhatsApp.

**Não publicar.** O vídeo final só sai depois da narração, que é gerada pelo Willian no ElevenLabs. Este repositório não gera locução, e a chave de API nunca entra em chat, arquivo ou commit.

## Estado

**Vídeo final pronto para aprovação: 30,25 s, QA aprovado** ([`output/revisao/relatorio-final.txt`](output/revisao/relatorio-final.txt)).

- **Narração:** `audio/voz.mp3`, do ElevenLabs (Raquel, eleven_v4), com 19,6 s de fala.
  - **Conferência:** foi feita pelos 10 trechos de fala do áudio, que batem com os 10 blocos de pontuação do roteiro e têm duração compatível com o texto de cada um.
  - **Sem conferência palavra a palavra:** a chave não tem permissão de transcrição e não há reconhecimento de fala instalado aqui.
- **Montagem:** a narração foi cortada nas pausas entre as frases, com os respiros inseridos (7,8 s no total), e a voz não foi acelerada. Com a voz real, dois respiros subiram:
  - o do gancho, de 1,0 para 1,2 s ("caderno." parado ≥ 1,2 s);
  - o dos pedaços, de 1,2 para 1,9 s (R$ 1.020 ≥ 2 s em foco).

| Arquivo | O que é |
|---|---|
| [`output/tudo-num-lugar.mp4`](output/tudo-num-lugar.mp4) | o vídeo final (1080×1920, 60 fps, −14,1 LUFS, pico −2,3 dBTP) |
| [`legenda.txt`](legenda.txt) | a legenda do post |
| [`output/capa.jpg`](output/capa.jpg) | a capa, desenhada à parte e dentro da regra das capas |
| [`output/storyboard.jpg`](output/storyboard.jpg) | a capa + um quadro por cena, do vídeo final |
| [`output/previa.mp4`](output/previa.mp4) | a prévia 2 aprovada (sem voz, tempos estimados) |

**Cenas no vídeo final:**

| Cena | Tempo | Duração |
|---|---|---|
| gancho | 0–5,98 s | 5,98 s |
| problema | 5,98–9,70 s | 3,72 s |
| virada | 9,70–13,43 s | 3,73 s |
| módulos | 13,43–18,40 s | 4,97 s |
| pedaços | 18,40–23,53 s | 5,13 s |
| fecho limão | 23,53–26,48 s | 2,95 s |
| chamada | 26,48–30,25 s | 3,77 s |

**Legenda × voz:** o QA mede o início das 10 palavras depois de pausa: 12 ms em média, 43 ms no máximo. Sem o JSON with-timestamps, as palavras no meio de cada trecho são distribuídas pelas letras (±0,2 s).

## Narração (para o ElevenLabs)

Texto exato, como a tela e a legenda mostram:

> Reserva no WhatsApp. Sinal no PIX. Saldo no caderno. E no check-out: quanto falta receber? O FAZLO Hospeda junta tudo isso: reservas, sinal, check-in, comanda e caixa. Você vê o que foi pago e quanto falta no check-out. Tudo num lugar só. Chame a gente no WhatsApp.

Como colar no ElevenLabs, com a grafia de pronúncia do perfil (`reels/serie-explica/scripts/pronuncia.py`):

> Reserva no Uátsap. Sinal no PIX. Saldo no caderno. E no check-out: quanto falta receber? O Fázlo Hospéda junta tudo isso: reservas, sinal, check-in, comanda e caixa. Você vê o que foi pago e quanto falta no check-out. Tudo num lugar só. Chame a gente no Uátsap.

- **Voz:** `eleven_v4`, voz Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`), estabilidade 0,50, semelhança 0,75, **velocidade 0,9**.
- **Arquivo de tempos:** se der, baixar também o JSON with-timestamps, para a legenda sair palavra por palavra no tempo exato.

## Depois que a narração chegar

```bash
cd reels/marca/tudo-num-lugar
python3 scripts/linha.py --audio audio/voz.mp3                              # monta a narração (respiros) e os tempos
#   ou, com o JSON with-timestamps do ElevenLabs (palavra por palavra):
python3 scripts/linha.py --alinhamento audio/alinhamento.json --audio audio/voz.mp3
node scripts/render.cjs info                         # plano, legenda, leitura e caixas
python3 scripts/audio.py                             # voz montada + trilha (abaixa quando a voz fala) + efeitos, −14 LUFS
node scripts/render.cjs video --mix audio/mix.wav    # output/tudo-num-lugar.mp4 (sem o aviso de prévia; mux com -t)
python3 scripts/qa.py --final                        # output/revisao/relatorio-final.txt
python3 scripts/storyboard.py --final
```

- **Montagem da narração:** o `linha.py` corta a narração no ponto mais baixo do silêncio entre as frases e insere, depois de cada ideia, o "respiro" do `roteiro.json` → `audio/voz-montada.wav`.
  - A voz não é acelerada nem cortada no meio.
  - É isso que garante, com a voz real, que cada destaque fique ≥ 1,2 s parado depois de dito.
- **Recalculado sozinho:** as cenas, as entradas dos cartões e o QA se recalculam com os tempos reais.

## As 7 cenas (uma por ideia; corte só quando a ideia muda)

Os tempos são os da prévia (estimados).

| Cena (fundo) | Tempo | Fala | O que aparece |
|---|---|---|---|
| **gancho** (preto) | 0–6,3 s | "Reserva no WhatsApp. Sinal no PIX. Saldo no caderno." | Uma cena só que se monta, sem cortes. Cada linha entra na sua frase, com as palavras de ligação menores e o ícone de traço (balão, moeda, caderno). "WhatsApp.", "PIX." e "caderno." batem grandes, e o risco à mão sob "caderno." entra no fim. |
| **problema** (preto) | 6,3–10,7 s | "E no check-out: quanto falta receber?" | "E no check-out:" (com o sino de recepção) e, grandes, "quanto / **falta** / receber?" ("falta" em limão). |
| **virada** (preto) | 10,7–14,6 s | "O FAZLO Hospeda junta tudo isso:" | Na mesma cena: a logo com o anel limão, "O FAZLO Hospeda", "junta" e "**tudo isso:**". |
| **módulos** (preto, 3D) | 14,6–19,6 s | "reservas, sinal, check-in, comanda e caixa." | 5 cartões em cascata diagonal, inclinados, entrando no ritmo da fala. Os anteriores recuam um pouco (sem perder a leitura), e os 5 ficam juntos ≥ 1 s no fim. |
| **pedaços** (preto, 3D) | 19,6–25,2 s | "Você vê o que foi pago e quanto falta no check-out." | "Sinal recebido R$ 450" em foco por 2,8 s. Quando entra "No check-out R$ 1.020", o primeiro recua: menor, desfocado e mais escuro. Os dois têm o selo "Exemplo fictício". |
| **fecho** (LIMÃO) | 25,2–28,5 s | "Tudo num lugar só." | "Tudo isso" circulado à mão + "num lugar só.". Os 5 módulos voam de fora e se encaixam no **telaDestaque**. |
| **chamada** (preto) | 28,5–33,1 s | "Chame a gente no WhatsApp." | A logo, FAZLO Hospeda, o botão limão "Chame no WhatsApp" (pulsa na palavra) e @fazlohospeda. É a única chamada. |

**Regras de leitura** (conferidas no QA, a partir das próprias poses do motor):
- **Destaques:** toda palavra ou número de destaque fica ≥ 1,2 s parado depois de dito. Nos cartões, sem desfoque de movimento nessa janela.
- **Cenas:** nenhuma tem menos de 2,5 s. O movimento dentro da cena é contínuo e lento: aproximação, deriva e giro leve.
- **Desfoque de movimento:** só nas entradas dos cartões (0,23 a 0,25 s cada) e no voo dos módulos para o painel. O recuo do cartão anterior usa desfoque de profundidade, não rastro.
- **Cartões:** ~25% maiores e, em leitura, sempre inclinados (rotateY −24° a −18°, rotateX 8° a 12°), balançando devagar.
  - Ficam centralizados entre o topo e a legenda, fora da coluna de botões.
  - O cartão em foco tem um brilho limão sutil atrás.

**Legenda sem duplicar:**
- **Onde ela aparece:** só nos módulos, nos pedaços e na chamada (estilo do reel-09, 54 px, na faixa y 1424–1536, x 150–950).
- **Onde não aparece:** no gancho, no problema, na virada e no fecho, o texto grande da cena mostra a frase inteira, com as palavras de ligação menores, e a faixa fica vazia.
- **Conferência:** o QA confere que nenhuma palavra falada fica sem aparecer escrita.

**O que não entra:**
- a interface do Hospeda 1.5.1, dados da demonstração ou nome de hóspede;
- valores além de R$ 450 e R$ 1.020 (os dois sempre com o selo);
- laranja, ícones 3D ou órbita de ícones em volta da logo.

## Como trocar o telaDestaque pela tela real da V2

No fecho limão, o componente `telaDestaque(c, r, t0)` (`src/anim.js`) ocupa o retângulo x 150–930, y 800–1392 (780×592 px, cantos de 40 px). Hoje é um painel com 5 encaixes (Reservas, Sinal, Check-in, Comanda, Caixa) que recebem os módulos voando. Para usar a imagem da tela real:

1. **A imagem:** ponha o PNG em `src/assets/`, por exemplo `src/assets/tela-destaque.png`.
   - Use a imagem em tamanho original, ou com pelo menos 1560 px de largura.
   - Deixe fora a faixa "Demonstração · Quero usar".
2. **A configuração:** em `src/tela-destaque.json`:
   ```json
   { "imagem": "assets/tela-destaque.png", "alinhar_x": 0.5, "alinhar_y": 0.0, "selo_exemplo": true }
   ```
   - **`imagem`:** o caminho relativo a `src/`; `null` volta para o painel abstrato.
   - **Com imagem:** os módulos voam e pousam no painel, e a imagem aparece no lugar dos encaixes (0,4 s depois do último). Ela cobre o retângulo sem distorcer.
   - **`alinhar_x`/`alinhar_y`:** de 0 a 1, escolhem a parte que aparece.
   - **`selo_exemplo`:** põe o selo "Exemplo fictício" no canto. Deixe `true` sempre que a tela tiver valores ou dados.
3. **Gerar de novo:** `node scripts/render.cjs stills 27` para conferir, depois `info`, `audio.py`, `video` e `qa.py`.
   - O QA aceita em `src/assets` só a logo e a imagem configurada.

## Processo (o mesmo do educativo [saldo-checkout](../../educativo/saldo-checkout))

- **`roteiro.json`:**
  - por token, a fala, "tela" (o que a legenda mostra no lugar), a chave e o id;
  - por frase (= ideia = cena), o "respiro" e se a cena tem legenda;
  - o texto para o ElevenLabs e a legenda do post.
- **`scripts/linha.py`:**
  - **estimado:** 12,15 letras/s, o ritmo do perfil −10% (a voz em velocidade 0,9), com 0,5 s depois de cada ponto ou interrogação e o respiro de cada ideia;
  - **`--audio`:** as frases nas pausas reais, mais a montagem;
  - **`--alinhamento`:** palavra por palavra, mais a montagem.
- **`scripts/audio.py`:**
  - a trilha da Série Explica (92 BPM), que abaixa quando a voz fala;
  - efeitos: o golpe de cada troca de ideia, as palavras que batem, o risco, as entradas dos cartões, as moedas dos valores, o encaixe dos módulos e a sineta no fim;
  - com a voz: −14 LUFS e limitador em −2,4 dBTP (pico ≤ −1,5 dBTP no MP4);
  - na prévia, uma voz substituta (só para o cálculo) põe a trilha no nível em que vai ficar debaixo da narração.
- **`scripts/render.cjs`:** stills, info, capa e vídeo. O áudio entra no MP4 com `-t` (a duração exata do vídeo), nunca `-shortest`.
- **`src/anim.js`:** Canvas 2D e cartões 3D com perspectiva real (a textura projetada numa grade de triângulos).
  - A pose de cada cartão é uma função do tempo t: cada quadro é determinístico, sem animação CSS em tempo real.
  - Desfoque de movimento: a média de amostras no obturador, proporcional à velocidade.
  - Recuo: desfoque de profundidade e escurecimento.
- **`scripts/qa.py` e `scripts/storyboard.py`:** a revisão e a folha de cenas.
