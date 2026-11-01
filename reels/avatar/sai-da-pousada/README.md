# Reel avatar — "Saí da pousada por duas horas"

Status: **V4 para aprovação** (nada publicado). Ajustes do parecer sobre a V3 (`220c032`): a Dona Maria fica até o fim (sem tela preta da marca) e a abertura passa menos informação de uma vez.

▶ [`output/sai-da-pousada.mp4`](output/sai-da-pousada.mp4) · [`output/storyboard.jpg`](output/storyboard.jpg) · capa [`output/capa-grade.jpg`](output/capa-grade.jpg) · legenda do post [`legenda.txt`](legenda.txt) · revisão [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt) (aprovado)

## V4 (1080×1920, 30 fps, 28,86 s)

| Trecho | Reel | O que aparece |
|---|---|---|
| P1 | 0,00–4,40 s | começa 0,6 s mais tarde no clipe; quadro 0 com UMA notificação legível ("O casal do chalé 3 chegou.") e a vibração · a fala em 1,06 s · cada nova notificação (1,38 e 2,50 s) substitui a anterior no mesmo lugar (a antiga recua para uma borda atrás) e a pílula conta "2" e "3 notificações" · relógio "14:20" em 2,0 s |
| P2 | 4,40–8,90 s | como na V3 (chat claro no celular + notificação grande ao lado) |
| P3 | 8,90–13,10 s | como na V3 (pilha e "+6 mensagens") |
| P4 | 13,10–19,90 s | como na V3 (3 perguntas atrás da cabeça) |
| P5 | 19,90–28,86 s | só a legenda durante a fala · silêncio só para a frente: principal até 7,16 s do clipe, fusão de 6 quadros, reserva (`plano5-alt.mp4`, mesmo zoom de 114 %) de 5,84 a 7,60 s · cartão de envio sobre a imagem dela 0,5 s depois da última palavra, até o último quadro (2,9 s) |

- **Emenda do P5:** `scripts/emenda_p5.py` escolhe sozinho o par de quadros.
  - Diferença média de 3,3 níveis de cinza.
  - Olhos abertos nos 6 quadros dos dois lados, medidos pela piscada do face landmarker do mediapipe.

- **Tamanhos de texto:**
  - corpo de 40 px, remetente e horário de 28 px, contadores de 30 px;
  - o QA mede a altura-x de cada texto no quadro final: 22 px no corpo (= 40 px).
- **P4:**
  - o texto de cada pergunta fica no lado de fora do cartão, e só a margem passa atrás do cabelo;
  - o QA confere quadro a quadro que o texto nunca fica coberto.

- **Linguagem:**
  - vidro fosco que desfoca o fundo de verdade (a página desenha o quadro inteiro, não só uma camada);
  - Inter (texto) e Inter Display (títulos);
  - limão só como acento;
  - mola com leve overshoot;
  - app genérico: remetente "Recepção", avatar "R", sem marca de app real.
- **P2 (desde a V2):**
  - `scripts/rastreio.py` mede as bordas visíveis da tela (cima, esquerda, direita) quadro a quadro: erro médio 0,23 px e P95 1,1 px.
  - `scripts/base.py` troca só o branco da tela pela conversa.
  - As mãos ficam na frente, pela segmentação de pele (mediapipe) com a borda refinada por guided filter; a luz da tela real continua por cima.
- **Recorte do P4 (desde a V2):**
  - `scripts/recorte.py` recorta a personagem com o mediapipe multiclasse e refina a borda com guided filter.
  - A cor da borda é descontaminada do fundo, então não sobra halo claro sobre os cartões.
  - Os cartões ficam em volta do topo da cabeça, onde o fundo aparece (vagas medidas no pior quadro).
  - O rosto nunca é coberto.
- **Legenda:** sem faixa; 76 px; halo escuro que acompanha cada letra. Contraste mínimo de 5,2:1 contra o fundo real a 3–10 px das letras.
- **Som:**
  - notificação genérica de vidro sempre com a vibração; uma tecla em cada toque dos polegares; envio; relógio; contagem do "+6 mensagens"; perguntas; transição; envio no aperto do botão;
  - ambiente de carro parado e rua ao longe;
  - trilha a 84 BPM com bumbo e chocalho do P1 ao P4; some antes do P5 e volta só com o pad na tela final;
  - −14,0 LUFS, −2,3 dBTP; a voz só com o ganho geral.
- **Fora do git, gerados pelos scripts:** `midia/quadros`, `midia/tela-p2`, `midia/recorte-p4`, `midia/modelos` (o modelo do mediapipe é baixado na primeira vez).

```bash
python3 scripts/alinha.py && python3 scripts/rastreio.py   # palavras; rastreio e toques do P2
python3 scripts/emenda_p5.py                             # midia/emenda-p5.json (principal → reserva)
python3 scripts/linha.py                                 # linha.json
node scripts/render.cjs telas                            # midia/tela-p2 (a conversa, plana)
python3 scripts/base.py                                  # midia/quadros (+ base-1080.mp4)
python3 scripts/recorte.py                               # midia/recorte-p4
python3 scripts/audio.py                                 # audio/mix.wav
node scripts/render.cjs video && node scripts/render.cjs info
node ../../tools/capa_grade.cjs . && python3 ../../tools/revisao_capa.py . --saida output/grade --cena
python3 scripts/qa.py                                    # relatório, storyboard
```

## Amostra de voz (aprovada)

## Voz
- Nome: **Dona Maria** (Voice Design, pt)
- ID: `7VjVi1vMjfwXABhN3KsW`
- Modelo: `eleven_v4`, `language_code=pt`, saída mp3 44,1 kHz 128 kbps

## Versões
| Versão | stability | similarity | velocidade |
|---|---|---|---|
| A | 0,50 | 0,75 | 0,95 |
| B | 0,35 | 0,75 | 0,95 |

## Falas
1. "Faz vinte minutos que eu saí da pousada."
2. "E não é que a equipe não saiba trabalhar. É que essas respostas só existem aqui."
3. "Aí a gente não tira folga. Só muda o lugar de onde atende a pousada."

| Fala | A (s) | B (s) |
|---|---|---|
| 1 | 3,00 | 3,16 |
| 2 | 6,03 | 6,03 |
| 3 | 5,56 | 5,25 |

Faixas completas (3 falas, 0,8 s de pausa): `audio/amostra-A.mp3` (16,1 s) e `audio/amostra-B.mp3` (16,0 s).
Falas soltas em `audio/amostras/`.

Observações: uma tomada por fala (sem regeneração; naturalidade ainda não avaliada de ouvido).
Transcrição de conferência não feita — a chave não tem permissão `speech_to_text`.

## Clipes aprovados (revisão no chat de estratégia)

- **Plano 1** (01/11):
  - `midia/plano1-base.mp4`: Seedance 2.5, 480×854, 24 fps, 5,04 s. Olha o celular de 0,25 a 1,25 s e chega à câmera em ~1,5 s; boca fechada.
  - `midia/plano1-fala.mp4`: Creatify Aurora (aba Sincronização labial), 448×832, 25 fps, 5,12 s, com o áudio `audio/sync/B-1-sync.mp3` (a fala começa em 1,59 s). A Aurora gerou o vídeo a partir da imagem, não do vídeo-base, então o olhar para o celular não está nela. A boca abre junto com a fala.
  - Reserva: `midia/plano1-fala-alt.mp4`.
  - **Montagem:** usar o Seedance de 0 a 1,5 s e a Aurora a partir de 1,5 s, com fusão de 3 quadros. As poses batem: a Aurora fica alinhada com escala 1,04 e deslocamento x −8 px sobre o Seedance redimensionado para 448 de largura (conferido no quadro de 1,5 s). O áudio é sempre o da Aurora (`B-1-sync`).
- **Plano 2** (01/11): `midia/plano2.mp4`, Seedance 2.5, 480×854, 24 fps, 5,04 s. Câmera parada (a maçaneta da porta não se mexe). O celular desliza para a direita no 1º segundo e depois fica quase parado; a tela continua clara e sem texto. O balão precisa acompanhar o celular. Reserva: `midia/plano2-alt.mp4`.
- **Plano 3** (01/11): `midia/plano3.mp4` (gerado às 14:14:59), Seedance 2.5, 5,04 s. Ela lê o celular com expressão contida e solta o ar devagar. Na reserva (`midia/plano3-alt.mp4`) a boca se mexe como se ela falasse, o que confunde num plano sem fala.
- **Áudios para os closes** (a Aurora anima a partir da imagem 6 do 1º lote):
  - `audio/sync/B-2-sync.mp3`: 0,3 s de silêncio antes da fala.
  - `audio/sync/B-3-sync.mp3`: 0,3 s antes e ~2,2 s depois, para o olhar em silêncio no fim.
- **Plano 4, 1ª rodada reprovada** (`midia/reprovados/plano4-t*.mp4`):
  - sorriso aberto em "trabalhar" e em "aqui", com o tom de quem anuncia, e não de quem desabafa;
  - uma mão entrando pela borda direita entre 0,7 e 1,3 s.
  - **2ª rodada:** prompt mais rígido contra o sorriso. Um teste com `B-2-sync` e outro com `A-2-sync` (a versão A, mais estável, pode deixar a expressão mais séria).
- **Close sério** (`imagens/close-serio.png`, a 3ª de 4 geradas no GPT Image 2.5 a partir do close original): o sorriso leve da imagem original fazia a Aurora sorrir aberto. Esta é a nova origem dos planos 4 e 5.
- **Plano 4** (01/11): `midia/plano4.mp4`, Aurora a partir do close sério com `B-2-sync`, 448×832, 6,8 s.
  - A expressão ficou séria e cansada.
  - Os lábios esticados em "aqui" vêm do som do "i", não de sorriso: os olhos e as bochechas continuam sérios.
  - Nenhuma mão entra no quadro.
  - Reserva: `midia/plano4-alt.mp4`.
- **Plano 5** (01/11): `midia/plano5.mp4`, Aurora a partir do close sério com `B-3-sync`, 448×832, 7,8 s.
  - Fala de 0,35 a 5,37 s. Depois ela fica em silêncio, de boca fechada e olhando a câmera, até 7,7 s.
  - Problema: um dedo aparece no canto inferior direito por 1 ou 2 quadros, em ~2,73 s (x > 400, y > 740 na fonte). Na edição, o zoom de ~112% no rosto tira esse canto do quadro.
  - Reserva: `midia/plano5-alt.mp4` (mesmo problema).
