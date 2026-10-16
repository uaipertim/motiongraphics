# FAZLO Hospeda — Série ROTINA · o modelo

Série de Reels do pilar **ROTINA**: identificação com a rotina de quem cuida de pousada, sem funcionalidades do sistema e sem CTA comercial. É **um motion só**. Cada episódio troca apenas o roteiro, num arquivo [`episodios/<id>.json`](episodios); depois do modelo pronto, um episódio novo sai só do JSON, com um comando.

Peça independente: nada aqui altera os Reels anteriores (o DNA é o do Reel 08, "Você fechou a recepção", mas o motor é próprio desta pasta).

**Formato:**
- 9:16 (1080×1920), 60 fps, **10–14 s** (a duração se ajusta ao roteiro).
- H.264 + AAC 48 kHz.
- **Só efeitos sintetizados**, em −16 LUFS; a música entra pelo Instagram.

| Episódio | Título | Duração | Vídeo | Capa | Revisão |
|---|---|---|---|---|---|
| **ep-01** | "O hóspede chegou. / A reserva, não." | 14,00 s | [`mp4`](output/ep-01/fazlo-hospeda-rotina-ep-01.mp4) | [`capa.jpg`](output/ep-01/capa.jpg) | [`revisao/`](output/ep-01/revisao) |
| **ep-02** | "Caiu um Pix às 14h. / De quem era?" | 13,92 s | [`mp4`](output/ep-02/fazlo-hospeda-rotina-ep-02.mp4) | [`capa.jpg`](output/ep-02/capa.jpg) | [`revisao/`](output/ep-02/revisao) |
| ep-03 | "Domingo, 11h. / Check-out de todo mundo." | ~14,0 s | roteiro pronto ([`ep-03.json`](episodios/ep-03.json)) | | |
| ep-04 | "'Vou ver e te falo.' / (e sumiu)" | ~13,85 s | roteiro pronto ([`ep-04.json`](episodios/ep-04.json)) | | |
| ep-05 | "A comanda da piscina / que ninguém fechou." | ~13,23 s | roteiro pronto ([`ep-05.json`](episodios/ep-05.json)) | | |
| ep-06 | "Feriado lotado. / Caixa conferido?" | ~13,65 s | roteiro pronto ([`ep-06.json`](episodios/ep-06.json)) | | |

Os episódios 03 a 06 saem um por dia, depois da aprovação do modelo. As áreas seguras dos quatro já foram conferidas pelo motor; falta renderizar.

---

## Episódio novo: só o JSON

```bash
cd reels/serie-rotina
scripts/episodio.sh ep-07        # lê episodios/ep-07.json
```

O comando roda, em ordem:
1. a linha do tempo e os cues de som;
2. os efeitos (−16 LUFS);
3. as caixas de cada elemento;
4. o vídeo;
5. a capa;
6. a revisão da capa;
7. a revisão técnica, de sincronia e de áreas seguras.

Tudo vai para `output/ep-07/`. Para ver no navegador, sirva a pasta e abra `src/index.html?ep=ep-07` (com o som em `audio/ep-07/`) ou `src/capa.html?ep=ep-07`.

### O formato do roteiro

```json
{
  "id": "ep-02",
  "titulo": ["Caiu um Pix às 14h.", "De quem era?"],
  "cards": [
    { "rotulo": "PIX RECEBIDO", "texto": "R$ 380,00", "hora": "14:02" },
    { "texto": "Sinal do chalé 3?" },
    { "chip": "PIX" }
  ],
  "carimbo": "NINGUÉM ANOTOU",
  "virada": ["Pix sem nome vira dúvida", "*no fim do mês.*"],
  "fecho": "Manda pra quem confere Pix pelo extrato."
}
```

- **`titulo`**: duas linhas; a 1ª sai branca e a 2ª limão. Se alguma linha tiver `*asteriscos*`, só esse trecho fica limão.
- **`cards`**: de 2 a 5, em três desenhos:
  - **`rotulo` + `texto`** (+ `hora` opcional, à direita): o card do Reel 08. O rótulo em JetBrains Mono cinza, o texto em Inter Display 46 px, em até duas linhas.
  - **só `texto`**: um card mais baixo, com o ponto limão ao lado do texto.
  - **`chip`**: uma pílula escura com texto em mono maiúsculo, para listas ("2 CAIPIRINHAS", "PIX", "CARTÃO"…).
- **`carimbo`**: o chip limão carimbado em cima da pilha (mono 56 px; diminui sozinho se passar de 860 px).
- **`virada`**: uma ou mais linhas; o trecho entre `*asteriscos*` sai em limão. Os asteriscos devem ficar em limites de palavra.
- **`fecho`**: o "Manda pra quem…", em até duas linhas.
- Aspas retas (`'…'`, `"…"`) viram tipográficas (‘…’, “…”) no desenho; o texto do roteiro não muda.

## Estrutura (fixa) e tempos

| Tempo | Cena | O que acontece |
|---|---|---|
| 0–1,8 s | **Título da dor** | **Já no quadro 0** (vale como capa). Em cima, o chip pequeno **"ROTINA DE POUSADA"** (pílula escura com ponto limão). A linha 1 é branca e a 2 limão, em Inter Display 900, no **maior tamanho que cabe** em 840 px (até 140 px). Cada linha do roteiro fica inteira se der ≥ 88 px; abaixo disso, quebra no ponto mais equilibrado. A aproximação é lenta, e em 0,7 s a parte limão leva uma batida seca, com som. |
| 1,8–2,3 s | **Vira cabeçalho** | O título sobe e encolhe para o alto (topo em y 285, até 170 px de altura), e o chip da série sai. |
| 2,25 s → | **A situação** | Os cards entram **um a um com um ping**, de baixo para cima com mola. O card novo entra embaixo e empurra os anteriores para cima, com o grupo centrado na área livre. Os anteriores escurecem um pouco, e o ponto limão do card mais novo segue pulsando. Cada card fica o tempo de leitura do seu texto antes do próximo (0,85–1,7 s, por número de caracteres). A pilha sobe devagar (50 px no total), para a cena nunca ficar parada. |
| depois do último card | **Carimbo** | O chip limão cai de 1,6× e −9° para −4°, com tranco na pilha, tremor de tela e brilho. A pilha escurece e o carimbo fica 2,1 s, com um brilho que respira. |
| +2,1 s | **Saída** | Os cards e o carimbo caem em cascata pela parte de baixo; o cabeçalho sai pelo topo. |
| +0,35 s | **A virada** | A frase branca com a parte limão sobe linha a linha (até 104 px, no maior tamanho que cabe) e fica **parada ≥ 1,8 s** (2,3–2,7 s, pelo tamanho do texto). |
| últimos 2,0 s | **Fecho** | A virada sobe e abre espaço. Entram "Manda pra quem…" (Inter Display 800, 58 px, duas linhas) e, 0,32 s depois, a **logo oficial** (100 px) + "FAZLO Hospeda", com a **sineta da série**. Nos últimos 0,3 s, um fade curto para o preto. |

**A duração** é a soma desses tempos e fica entre 10 e 14 s. Se o roteiro passar disso, os intervalos entre os cards encolhem (ou crescem) para caber.
- ep-01: 3 cards, 14,00 s (o roteiro pedia 14,13 s, então os intervalos entre os cards encolheram 4%).
- ep-02: 4 cards, 13,92 s.

O fecho tem **2,0 s em todos os episódios** (ajuste de 16/10, na aprovação do modelo; antes, 1,5 s). Fica na constante `FECHO_DUR` do `src/anim.js`.

**Movimento:** motion blur por subamostragem nas passagens rápidas (o título virando cabeçalho, a entrada de cada card, o carimbo, a saída, as frases finais e a logo), como no Reel 08.

## Identidade e áreas seguras

- **Cores e tipografia:**
  - fundo `#0A0A0A`, com um respiro mais claro no centro e uma luz limão que cresce com a pilha;
  - limão `#AFFA27`; branco; cinza `#B9B9B1`;
  - cards `#161616` com borda `#3A3A3A` e ponto limão;
  - Inter Display nos títulos e textos; JetBrains Mono nos chips e rótulos.
- **O que fica de fora:** nada de telas, celulares, balões de app, tiques de lido, emojis ou qualquer coisa da interface do sistema.
- **Logo:** o arquivo oficial (`src/assets/fazlo-hospeda-logo-alpha.png`), sem alteração.
- **Áreas seguras** (o motor garante e a revisão confere elemento a elemento, em `relatorio-tecnico.txt`):
  - todo o conteúdo entre **y 265 e 1456**;
  - nada na coluna de botões (**x ≥ 950, y 1060–1560**): textos centrados em x = 525 com até 840 px (terminam em x ≤ 945), cards em x 80–940 e o carimbo centrado em x = 515;
  - o título do quadro 0 dentro do **recorte 3:4** (y 240–1680).

## Capa

Uma por episódio (`src/capa.html?ep=<id>`):
- fundo preto;
- a **logo oficial pequena no topo, no centro** (y 330–382);
- o **título** do episódio (linha 1 branca, linha 2 limão, Inter Display 900, até 150 px em 860 px de largura) **centralizado na vertical do recorte 3:4** (centro em y = 960).

Segue a regra fixa das capas ([`../README.md`](../README.md)): recorte 3:4 com folga de 60 px, canto do play livre, faixa do contador livre. A conferência é `python3 ../tools/revisao_capa.py . --saida output/<id>`, que gera `capa.jpg`, `revisao/capa-no-feed.jpg` (com os episódios vizinhos na grade) e `revisao/capa.txt`.

## Som

Efeitos **sintetizados do zero** (numpy/scipy), com os timbres do Reel 08:
- uma batida seca na parte limão do título;
- um sopro quando o título vira cabeçalho;
- um **ping** suave a cada card (genérico, sem timbre de app), subindo na pentatônica Dó5 → Ré5 → Mi5 → Sol5 → Lá5;
- o **carimbo** (baque grave, tapa da borracha e a pilha chacoalhando);
- sopros discretos na saída, na virada e no fecho;
- a **sineta de recepção da série** (Sol6) na logo;
- tom de sala quase inaudível (−56 dB).

O master fica em **−16 LUFS**, com limitador de pico real. A animação exporta `audio/<id>/cues.json`, e `scripts/audio.py <id>` coloca cada som nesses instantes.

## Revisão (ep-01 e ep-02)

`python3 scripts/qa.py <id>` gera, em `output/<id>/revisao/`:
- `relatorio-tecnico.txt`;
- `sincronia.txt`;
- `zonas-seguras.jpg` (as zonas da interface do Reels e as linhas y 265/1456 marcadas);
- `recorte-3x4.jpg`.

| | ep-01 | ep-02 |
|---|---|---|
| Formato | 1080×1920, 60 fps (840 quadros), H.264 High yuv420p, AAC 48 kHz | 1080×1920, 60 fps (835 quadros), idem |
| Duração (vídeo = áudio) | 14,000 s | 13,917 s |
| Loudness / pico real | −16,0 LUFS / −2,4 dBTP | −16,0 LUFS / −2,5 dBTP |
| Arquivo | 3,9 MB | 3,6 MB |
| Pretos / congelados | nenhum (fora o fade final) / nenhum ≥ 0,75 s | nenhum / nenhum |
| Áreas seguras | 17 elementos OK | 18 elementos OK |
| Sincronia | 5 golpes (3 pings, carimbo, sineta): ataque a ≤ 8,3 ms do evento; a imagem reage em todos | 6 golpes: ≤ 7,3 ms; a imagem reage em todos |
| Capa | dentro da regra (bloco centrado em y = 960,0) | dentro da regra (centro em 960,0) |

## Arquivos

```
episodios/ep-0N.json        o roteiro de cada episódio (a única coisa que muda)
src/anim.js                 o motor (layout e linha do tempo calculados a partir do roteiro)
src/index.html              prévia/render: ?ep=<id>
src/capa.js, src/capa.html  a capa: ?ep=<id>
scripts/episodio.sh         um episódio inteiro, do roteiro à revisão
scripts/render.cjs          cues | boxes | video | stills  (--ep <id>)
scripts/audio.py            efeitos sintetizados a partir dos cues
scripts/capa.cjs            a capa em png (+ caixas para a revisão)
scripts/qa.py               revisão técnica, de sincronia e de áreas seguras
audio/<id>/                 cues.json + efeitos.wav
output/<id>/                MP4, capa.png/jpg e revisao/
```
