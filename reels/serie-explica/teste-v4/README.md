# Teste de voz v2 × v4 (23/10/2026)

Medição feita fora dos episódios: nada foi gravado em `audio/<id>/` nem em `output/`. O script é [`teste_v4.py`](teste_v4.py), e os números completos estão em [`medidas.json`](medidas.json).

## O que foi comparado

- **v4:** gerado com os `voz.py` novos (`eleven_v4`, só estabilidade 0,50 e semelhança 0,75, com contexto e com o dicionário de pronúncia). Foram 2 seeds por trecho: a do episódio e a seguinte.
- **v2:** a geração publicada, lida do episódio.
  - Na cena 1 do fala-01, a versão publicada é a v2 com a tomada de pergunta em v3 aplicada.
- **Duração da fala:** medida pelo fim real da voz no áudio (−40 dBFS). O motivo está na próxima seção.

## Testes de API

| Teste | Resultado |
|---|---|
| (a) with-timestamps | Funciona. Devolve o alinhamento por caractere, e os caracteres são iguais ao texto enviado |
| (b) previous_text / next_text | Aceito (HTTP 200) |
| (c) seed | Aceita, mas não reproduz o áudio idêntico. Na mesma seed, o envelope teve correlação de 0,98; em outra seed, 0,94 |

**Achado:** no v4, a marcação de tempo às vezes estica a última letra até o fim do arquivo. Isso aconteceu em 3 das 8 gerações, com 0,40–0,56 s de silêncio real depois da voz. O arquivo não está cortado.

## v2 × v4

| Trecho | Modelo | Ritmo (letras/s) | Maior pausa | Pausas > 0,6 s | Fala (s) |
|---|---|---|---|---|---|
| explica-02 · cap 02 | v2 | 9,4 | 0,50 | 0 | 9,40 |
| | v4 (seeds 334 / 335) | 10,0 / 10,0 | 0,60 / 0,64 | 1 / 1 | 8,77 / 8,84 |
| explica-02 · cap 06 | v2 | 8,9 | 0,65 | 2 | 8,57 |
| | v4 (seeds 402 / 403) | 8,4 / 8,8 | 0,64 / 0,48 | 1 / 0 | 9,04 / 8,65 |
| fala-01 · cena 1 (pergunta) | v2 (+ tomada v3) | 12,7 | 0,37 | 0 | 2,75 |
| | v4 (seeds 808 / 809) | 9,1 / 8,8 | 0,48 / 0,48 | 0 / 0 | 3,85 / 3,99 |
| fala-01 · cena 6 | v2 | 12,5 | 0,28 | 0 | 6,22 |
| | v4 (seeds 808 / 809) | 11,7 / 11,6 | 0,52 / 0,56 | 0 / 0 | 6,64 / 6,72 |

**Projeção de duração:**

| Série | Fala v2 → v4 | Episódio de 75 s | Episódio real |
|---|---|---|---|
| Explica | 17,97 → 17,65 s (−1,8%) | ~73,9 s | — |
| Fala | 8,97 → 10,60 s (+18%) | ~87 s | fala-01: 36,0 s → ~41,7 s |

A fala ocupa 85% do explica-02 e 88% do fala-01.

## Áudios para ouvir

Estão em [`audios/`](audios):

- **`par-<trecho>-v2-v4.mp3`:** o v2, 0,8 s de silêncio e o v4 com a seed do episódio, para cada um dos 4 trechos.
- **`par-pronuncia-v2-v4.mp3`:** a frase "Conheça o FAZLO Hospeda: a reserva que chega pelo WhatsApp entra no mesmo lugar. Fazlo Hospeda, link na bio." No v2 ela vai sem o dicionário, como era; no v4 vai como "Fázlo Hospéda… Uátsap".
- **`<trecho>-v4-seed<N>.mp3`:** cada geração v4 isolada.

A proposta de limites está no relatório da tarefa. Nenhum limite foi alterado.
