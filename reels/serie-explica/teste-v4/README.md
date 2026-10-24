# Teste de voz v2 × v4 (23/10/2026)

> **Aprovado em 24/10/2026:** a pronúncia de FAZLO, Hospeda e WhatsApp (`par-pronuncia-v2-v4.mp3`) e a pergunta da cena 1 do fala-01 (`par-fala-01-cena1-v2-v4.mp3`) foram ouvidas e aprovadas. Os limites novos também foram aprovados e aplicados. A conferência está no fim deste arquivo.

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

## Limites aplicados (24/10/2026)

**Série Explica:**
- O fim da fala é medido no áudio (−40 dBFS) e vale para a sobra no fim, para o ritmo e para o `linha.py`.
- Ritmo de 7,5 a 19 letras/s.
- Mantidos: pausa interna até 0,9 s e episódio de 60 a 90 s.

**Série Fala:**
- Episódio de 30 a 42 s.
- Fim da fala no áudio.
- No `linha.py`, o início de cada palavra depois de uma pausa é medido no áudio.
- Mantidos: sincronia ≤ 80 ms, pausa de fim de cena de 0,16 s e janela de 2 s sem movimento.

## Conferência

**Regra de conferência da Explica sobre as 8 gerações v4 deste teste:**

| Regra | Aprovadas | Reprovadas |
|---|---|---|
| Antiga (pela marcação) | 6 | 2: cap 06 seed 402 por ritmo 7,9; cap 06 seed 403 por sobra 0,00 s |
| Nova (fim no áudio) | 8 | 0 |

Na regra nova, a seed 402 tem ritmo 8,4 e sobra 0,56 s, e a seed 403 tem ritmo 8,8 e sobra 0,47 s. Nenhuma geração boa é reprovada por fim esticado.

**Sincronia antes e depois do refinamento pelo áudio** ([`conferencia_limites.py`](conferencia_limites.py)):
- Os trechos foram gerados de novo com as mesmas seeds, porque o alinhamento precisa ficar guardado. O resultado está em [`conferencia/sincronia.json`](conferencia/sincronia.json), com os áudios.
- A medida usa o detector do `qa.py` da Série Fala, com limite de 80 ms.

| Trecho | Antes (marcação da API) | Depois (`linha.py`) |
|---|---|---|
| fala-01 cena 1 (seed 808) | 140, 55 ms | 0, 0 ms |
| fala-01 cena 1 (seed 809) | 160, 103, 78 ms | 0, 0, 0 ms |
| fala-01 cena 6 (seed 808) | nenhuma palavra depois de pausa | — |
| fala-01 cena 6 (seed 809) | −94, −132 ms | as duas pausas deixam de existir: as palavras começam mais cedo, colando na anterior |
| explica-02 cap 02 / 06 | 4 e 3 palavras, até −150 ms | ficam −150 ms em "agenda" e "site" (ver abaixo) |

- **Na Fala:** antes, 5 palavras passavam de 80 ms; depois, nenhuma.
- **Na Explica, que não tem regra de sincronia:** sobram palavras em que a marcação aponta uma pausa e o áudio é contínuo ("a agenda", "e site"). O detector não acha silêncio e cai na borda da janela (−150 ms). A legenda não está fora de tempo: ali não há pausa real para medir.

**QA dos episódios publicados:** rodado numa cópia fora do repositório, com os scripts novos, sem renderizar nem regenerar nada.
- **explica-02:** aprovado.
- **fala-01:** aprovado. Duração de 35,93 s no novo limite de 30–42 s; voz × legenda com 72 ms no máximo.
- **explica-01:** 1 falha, que já existia antes desta mudança. A regra "a logo só entra depois da última palavra" (logo em 73,54 s, voz até 73,81 s) virou checagem obrigatória depois que ele foi publicado; o `qa.py` anterior à voz nova reprova igual.
