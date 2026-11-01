# Reel avatar — "Saí da pousada por duas horas"

Status: **amostra de voz para aprovação** (sem vídeo, nada publicado).

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
