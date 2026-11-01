# Reel avatar — "Saí da pousada por duas horas"

Status: **edição completa para aprovação** (nada publicado).

▶ [`output/sai-da-pousada.mp4`](output/sai-da-pousada.mp4) · [`output/storyboard.jpg`](output/storyboard.jpg) · capa [`output/capa-grade.jpg`](output/capa-grade.jpg) · legenda do post [`legenda.txt`](legenda.txt) · revisão [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt) (aprovado)

## Edição (1080×1920, 30 fps, 29,3 s)

| Plano | Reel | Fonte | O que aparece |
|---|---|---|---|
| P1 | 0,00–4,60 s | Seedance 0–1,5 s + Aurora 1,5–4,6 s (fusão de 3 quadros) | chip "Personagem criada com IA" (0–3 s) · anel limão nas 2 vibrações (0,35 e 0,85 s) · chip "14:20 · fora da pousada" (1,25 s) · "Faz vinte minutos que eu saí da pousada." |
| P2 | 4,60–9,10 s | `plano2.mp4` 0–4,5 s | balão 1 sai da tela e segue o celular (14:21; 4,95 s) · "digitando…" na tela quando os polegares se mexem (6,65 s) |
| P3 | 9,10–13,30 s | `plano3.mp4` 0,3–4,5 s | balão 2 (14:23; 9,40 s) · selo "+6 mensagens" contando de 1 a 6 (11,45 s) |
| P4 | 13,30–20,10 s | `plano4.mp4` inteiro | fala · chave, comanda e moeda em traço limão na palavra "aqui" (19,14 s), somem antes do corte |
| P5 | 20,10–29,30 s | `plano5.mp4` até o quadro 193 + 1,44 s de trás para frente (silêncio) | zoom fixo 114 % · só a legenda se mexe na fala · chamada + logo pequena de 26,47 a 29,30 s (2,83 s) |

- **Base** (`scripts/base.py` → `midia/base-1080.mp4`, fora do git):
  - upscale lanczos e `unsharp` leve;
  - 24/25 → 30 fps por repetição de quadro, sem interpolação;
  - emenda do P1 medida de novo (SIFT + RANSAC no quadro de 1,5 s): o Seedance em 448 px casa com a Aurora com escala 1,04 e x −8,5 px, y 0. No Reel, o rosto fica a 0,4 px entre os dois lados da emenda.
- **Zoom do P5: 114 %, e não 112 %.** Medido em todos os quadros da fonte: o dedo aparece 3 vezes (0,6, 1,3 e 2,8 s), em x ≥ 377 e y ≥ 688. Com 112 % e o rosto centrado, a janela pega a ponta do dedo. 114 % é o menor zoom centrado que fica livre dele.
- **Fim do P5:** os quadros 194–197 da fonte repetem e pulam. Por isso o plano vai até o 193 e volta de trás para frente até o 157, para dar 2,8 s de chamada sem congelar.
- **Legenda:** tempos das palavras alinhados por energia (`scripts/alinha.py`): ±10 ms no início de cada frase, ±0,1 s no meio. A chave do ElevenLabs não tem permissão de alinhamento forçado. Véu escuro um pouco mais forte que o da Dona Maria, por causa da camisa branca: contraste mínimo 4,0:1.
- **Som:**
  - voz dos próprios clipes, só com ganho geral (o limitador pega 0,12 % das amostras);
  - cama da Dona Maria a 72 BPM, 18 dB abaixo da voz; baixa 12 dB antes da frase do P5 e volta na chamada;
  - −14,0 LUFS, −2,2 dBTP.

```bash
python3 scripts/alinha.py && python3 scripts/linha.py   # palavras e linha.json
python3 scripts/base.py                                  # midia/base-1080.mp4
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
