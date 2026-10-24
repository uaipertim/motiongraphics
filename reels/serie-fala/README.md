# Série FALA — a dor narrada, cena por cena

Formato novo do FAZLO Hospeda: um Reel de 30–42 s em que uma voz conta uma dor da rotina da pousada e **cada frase da narração ganha uma cena diferente**. Não usa o motor da Série ROTINA (onde todo episódio tem a mesma cara): aqui há uma **biblioteca de tipos de cena**, e cada episódio é só um JSON que diz, frase por frase, qual cena entra e com quais dados.

| Episódio | Dor | Duração | Pasta de saída |
|---|---|---|---|
| **fala-01** | "Ele pagou metade. Quanto falta mesmo?" — a conta do hóspede que se perde entre Pix, vinho e desconto: 900 − 450 + 120 − 50 = **520**, cobrado 450, **70 reais** ficaram no balcão | 35,8 s | [`output/fala-01/`](output/fala-01) |

Entregáveis de cada episódio, em `output/<id>/`: `fazlo-hospeda-<id>.mp4`, `capa.jpg` (+ `capa.png`), `storyboard.jpg` (1 quadro por cena) e `revisao/` (`relatorio-tecnico.txt`, `sincronia.txt`, `zonas-seguras.jpg`, `capa-no-feed.jpg`).

## Fazer o próximo episódio (só pelo JSON)

1. Copie `episodios/fala-01.json` para `episodios/fala-02.json` e troque `id`, `titulo` e as `cenas` (veja o formato abaixo).
2. Rode **um comando**:

```bash
cd reels/serie-fala
scripts/episodio.sh fala-02          # narração (se ainda não existir) → vídeo → capa → revisão → storyboard
scripts/episodio.sh fala-02 --voz    # refaz a narração mesmo se já existir
```

O script encadeia: `voz.py` (narração por cena na API) → `linha.py` (cenas e palavras no tempo do vídeo) → `render.cjs cues` (eventos da animação) → `render.cjs boxes` (palavras e páginas da legenda) → `audio.py` (voz tratada + trilha com ducking + efeitos → −14 LUFS) → `render.cjs video` → `capa.cjs` + `revisao_capa.py` → `qa.py` → `storyboard.py`. Nada de código muda de um episódio para outro. O resultado da revisão sai em `output/<id>/revisao/relatorio-tecnico.txt` e termina em `RESULTADO: aprovado` ou lista o que falhou.

Se o texto de uma frase mudar, rode com `--voz` (a narração é gerada por cena; cenas já geradas não são refeitas sem esse sinal). Para refazer só algumas cenas: `python3 scripts/voz.py fala-02 --so 3,5` e depois `scripts/episodio.sh fala-02`.

### Segurança da chave

A chave da API do ElevenLabs **fica só em Segredos de rede** (a rede da nuvem põe o cabeçalho `xi-api-key` em chamadas a `api.elevenlabs.io`). Fora da nuvem, exporte `ELEVENLABS_API_KEY` no terminal. Os scripts só leem a variável se ela existir e **nunca a imprimem, salvam ou registram**; ela não entra em arquivo nem em commit. Sem chave e sem narração gerada, o episódio não é feito.

## Formato do JSON

```json
{
  "id": "fala-02",
  "titulo": "texto livre, só para identificar",
  "destaque_global": ["metade"],
  "cenas": [
    { "fala": "frase falada", "tipo": "notinha", "dados": { }, "destaque": ["trecho em limão"], "inicio": 0.08, "pausa": 0.16, "min": 0 }
  ]
}
```

- **`fala`**: o que a voz diz nesta cena (uma frase, ou duas curtas). É também o texto da legenda palavra a palavra.
- **`tipo`**: a cena (tabela abaixo). **`dados`**: o que a cena mostra.
- **`destaque`**: trechos da fala que ficam em limão na legenda (valores, horas, "metade", "setenta reais"). `destaque_global` vale em todas as cenas.
- **`inicio`** / **`pausa`** (opcionais, em s): respiro antes da fala da cena e pausa depois; padrões 0,08 e 0,16. **`min`**: duração mínima da cena (usado na virada e no fecho, para a cena respirar).
- **`em`** (dentro de `dados`): a palavra falada que dispara aquele elemento. A animação entra no instante em que a voz diz a palavra, pelo alinhamento por palavra da API (`with-timestamps`); sem `em`, o elemento entra num tempo padrão da cena.
- Texto entre `*asteriscos*` fica em limão dentro das cenas de título e virada.
- A **primeira cena** é o gancho: vira o quadro 0 do vídeo e a capa (ver abaixo). A **última** deve ser `fecho`.

### Biblioteca de cenas

| `tipo` | Visual | `dados` |
|---|---|---|
| `titulo` | O gancho: o título da dor, escrito e falado desde o quadro 0 | `linhas: ["Ele pagou metade.", "*Quanto falta mesmo?*"]` |
| `notinha` | Notinha de caixa impressa, que sai linha por linha | `linhas: [{ "t": "SEX 18:00 · PIX", "v": "R$ 450,00", "em": "Pix" }]`, `total: { t, v, em }`, `caneta: { t, em }` (anotação à caneta), `herda: <n da cena>` (continua a notinha daquela cena em vez de abrir outra) |
| `relogio` | Hora gigante em mono que salta | `antes: "10:58"`, `hora: "11:00"`, `pergunta: "Quanto falta?"`, `em_hora`, `em_pergunta` |
| `objetos` | Chips de "ferramentas" orbitando um contador de tempo; no fim, um carimbo | `objetos: [{ t, em }]`, `contador: { marcos: [[segundos, "palavra"]] }`, `carimbo: { t, em }` |
| `valor` | Valor em destaque, que cai/é subtraído, com a conta embaixo | `valor: "R$ 520,00"`, `em`, `cai: { t, em }`, `conta: ["900 − 450 + … = 520"]` |
| `pergunta` | Pergunta grande: uma palavra por linha, cada uma entra na hora em que é falada; a última fica em limão | `texto: "Quanto falta mesmo?"` (cada palavra dispara na própria fala) |
| `riscada` | Uma linha riscada à caneta e a correta embaixo | `riscado`, `certo`, `em_risca`, `em_nova` |
| `contador` | Contador de tempo grande que corre | `de`, `ate` (segundos), `rotulo` |
| `virada` | A frase de virada, sozinha, com movimento lento | `linhas: ["Saldo não se guarda", "*na memória.*"]` |
| `fecho` | A marca: logo oficial (sem alteração) + "FAZLO Hospeda" + a frase de envio, sem domínio | `frase: "Manda pra quem …"` |

Cena nova = um bloco `CENAS.<nome> = { setup(sc), draw(ctx, sc, t, lt, u) }` em `src/anim.js`. Ela herda sozinha a legenda, as faixas seguras, a câmera, o corte limão e os eventos de som (`CUES.push({ t, type })`).

### Entonação: pergunta na fala tem que soar como pergunta

**Pergunta na fala tem que soar como pergunta: gerar várias tomadas e medir a subida no fim.** A voz, sozinha, tende a ler a pergunta com tom de afirmação (F0 plano ou caindo no fim). Por isso toda pergunta falada do roteiro entra no campo `perguntas` do JSON e passa por `scripts/entonacao.py`, que o `episodio.sh` já roda:

```json
"perguntas": [ { "cena": 1, "pergunta": "Quanto falta mesmo?",
                 "variantes": [ { "texto": "Ele pagou metade. Quanto falta mesmo??", "seed": 31 } ] } ]
```

1. **Gerar** pelo menos 5 tomadas do trecho (em `audio/<id>/tomadas/`).
   - Desde 23/10/2026, as tomadas usam a mesma configuração da narração: `eleven_v4`, só estabilidade 0,50 e semelhança 0,75, com `previous_text`/`next_text` (o v4 aceita).
   - Elas variam **só na seed e na redação**: pontuação ("falta… mesmo?", "mesmo??", "?!"), MAIÚSCULA de ênfase, trecho só da pergunta com `previous_text` de dúvida (`so`/`prev`).
   - Estabilidade e estilo não variam. Os campos `estab`, `estilo` e `modelo` das variantes do fala-01 (v2/v3) ficam só como registro.
   - O texto vai com o dicionário de pronúncia, e o alinhamento gravado é o da grafia oficial.
2. **Medir** o F0 (autocorrelação, 10 ms) nos últimos 450 ms de fala: subida = F0 final − ponto mais baixo, em semitons. Vale 2 a 7 st (acima disso soa caricato), com o F0 seguindo subindo até o fim e sem saltar de registro; a pergunta não pode ficar mais de 0,35 s mais longa que a original.
3. **Encaixar** só o trecho da pergunta: o começo da cena fica exatamente como estava (`audio/<id>/voz/original/`); a tomada nova entra no silêncio ou no fecho do "qu", com transição de 14 ms em potência igual e o volume ajustado ao do começo. A legenda e as cenas são ressincronizadas pelo novo alinhamento, e a legenda mostra sempre o texto do roteiro (sem "…" nem maiúsculas da tomada).
4. As 3 melhores tomadas de cada pergunta, mais a original, vão para `output/<id>/revisao/tomadas/` (WAV curto com a subida medida no nome) e a tabela completa para `output/<id>/revisao/entonacao.txt`. Para trocar a escolha, grave `{"1": "c1-t05"}` em `audio/<id>/tomadas/escolha.json` e rode `python3 scripts/entonacao.py <id> aplicar` e depois `scripts/episodio.sh <id>`.

Se o trecho trocado começa antes da pergunta (uma hesitação, como "Peraí…"), use `"inicio": "peraí"` (1ª palavra do trecho novo) e `"inicio_original": "quanto"` (onde o trecho da narração antiga começa a ser substituído) na entrada de `perguntas`; `pergunta` traz o trecho inteiro, como na legenda ("Peraí… quanto falta mesmo?"). A marcação de tempo da API chega a atrasar a palavra depois de uma hesitação; o encaixe refina o início de cada palavra pelo áudio, e a revisão mede o início da palavra pelo fim do último silêncio, não pela cauda da palavra anterior.

No fala-01: cena 1 ("Ele pagou metade. Peraí… quanto falta mesmo?") ficou com a tomada c1-t06 (+5,9 st no fim); cena 5 ("Quanto falta?") foi de +0,8 st para +5,5 st (c5-t08).

## Regras do formato (verificadas pela revisão)

### Layout do modelo (valem para todos os episódios)

1. **Cada cena fica centralizada na faixa livre**: entre y 300 e o topo da legenda (≈ y 1295), com folga de pelo menos 60 px acima dela, ou seja, a faixa vai de y 300 a y 1235 e o centro do conteúdo cai em y ≈ 767. O motor faz isso sozinho para **todo tipo de cena**: ao iniciar, mede onde o conteúdo assentado de cada cena começa e termina e desloca a cena inteira. Cena nova não precisa de ajuste manual. Cenas cujo conteúdo cresce no meio (a pergunta que entra abaixo do relógio) declaram `fases(sc)` e o conjunto desliza suavemente para o novo centro; a nota que continua (`herda`) acompanha o próprio crescimento. As medidas de cada episódio saem em `output/<id>/revisao/centragem.json`.
2. **Legenda sem fundo**: nada de faixa ou painel atrás do texto, só uma sombra suave para leitura. Fica centralizada no eixo x = 540 e limitada a x 130–950 (820 px). As palavras aparecem uma a uma, e cada linha é centralizada pela própria largura final.

- **Vídeo:** 1080×1920 (9:16), 60 fps, H.264 + AAC 48 kHz, 30–42 s. **Voz:** voz oficial da FAZLO (Raquel), tom de conversa. Desde 23/10/2026: `eleven_v4`, só estabilidade 0,50 e semelhança 0,75, com o dicionário de pronúncia compartilhado (`../serie-explica/scripts/pronuncia.py`). O fala-01 (publicado, em v2 com tomadas v3) está travado: `voz.py`, `--so` e `entonacao.py gerar/aplicar` recusam regenerar sem `--forcar-modelo-novo`. **Áudio:** −14 LUFS integrados, pico real ≤ −1 dBTP; a música (colchão sintetizado em Am9 → Fmaj9 → Cmaj9 → G6/9, 88 BPM) fica ~22 dB abaixo da voz e abaixa até 9 dB enquanto ela fala; efeitos curtos marcam cada troca de cena. A música **está dentro do vídeo**.
- **Legenda falada:** palavra a palavra, no instante da voz; Inter Display 900, ~68 px, branca; valores, horas e palavras-chave em limão; no máximo 2 linhas, sem painel, centralizada em x = 540 (limite x 130–950), nas linhas y 1332 e 1412. Cada página dura até a primeira palavra da próxima.
- **Áreas seguras:** nada em x ≥ 950 entre y 1060–1560 (coluna de botões do Reels); conteúdo importante entre y 265 e 1456.
- **Ritmo:** uma cena nova a cada 2–6,5 s e **nada parado por mais de 2 s** (toda cena tem movimento contínuo interno; a revisão mede isso quadro a quadro).
- **Identidade:** preto, limão `#AFFA27` e branco; Inter Display + JetBrains Mono nos dados. Sem telas de sistema, celulares ou computadores: WhatsApp, caderno e calculadora aparecem só como palavras/chips.
- **Gancho:** falado e escrito já no quadro 0 (esse quadro é a capa).
- **Capa:** `capa.cjs` monta a capa a partir da primeira cena: logo pequena no topo, título centralizado no recorte 3:4 pelas regras de [`../README.md`](../README.md) (folga de 60 px, canto do play e faixa do contador livres); `revisao_capa.py` confere e gera `capa-no-feed.jpg` com a grade do perfil.

## Revisão técnica do fala-01 (`scripts/qa.py`)

Resultado: **aprovado** (refeita com a cena centralizada na faixa y 300–1235 e a legenda sem painel, centrada em x = 540).

| Item | Medido | Limite |
|---|---|---|
| Duração | 35,82 s (2149 quadros, 60 fps) | 30–42 s |
| Áudio | AAC 48 kHz, 2 canais; vídeo e áudio com Δ 20 ms | — |
| Loudness integrado | −14,0 LUFS (voz sozinha −14,4; LRA 2,9 LU) | −14 |
| Pico real | −1,6 dBTP | ≤ −1 |
| Legenda × imagem | 86 de 86 palavras aparecem no quadro da fala ou até 2 quadros depois; mediana 1 quadro | ≤ 33 ms |
| Voz × legenda | 38 ms em média, 71 ms no máximo (8 palavras que abrem depois de pausa, medidas no áudio) | ≤ 80 ms |
| Coluna de botões (x ≥ 950, y 1060–1560) | 0 pixel aceso em 143 quadros amostrados | 0 |
| Conteúdo y 265–1456 | nada acima/abaixo (fora o fade final) | — |
| Ritmo | cenas de 2,3 a 6,5 s (média 3,9 s); nenhuma janela de 2 s sem movimento; sem imagem congelada ≥ 0,75 s; sem preto | — |
| Quadro 0 | já tem o gancho escrito | — |

A conta fecha na tela: 900 − 450 + 120 − 50 = **520**; cobrado 450; diferença **70**.

## Estrutura

```
episodios/<id>.json     roteiro (o único arquivo que muda entre episódios)
scripts/episodio.sh     o comando único
scripts/voz.py          narração por cena (API ElevenLabs, with-timestamps) → audio/<id>/voz/
scripts/linha.py        linha do tempo: cenas, palavras e a narração montada
scripts/audio.py        voz tratada + trilha com ducking + efeitos → audio/<id>/mix.wav
scripts/render.cjs      cues | boxes | video | stills (Chromium headless, quadro a quadro)
scripts/capa.cjs        capa a partir do quadro 0
scripts/qa.py           revisão técnica (formato, LUFS, pico, sincronia, áreas seguras, ritmo)
scripts/storyboard.py   1 quadro por cena
src/anim.js             motor (window.FALA): cenas, legenda, transições, câmera
src/index.html, capa.*  páginas de render
```

Para rebuilds sem a chave: a narração gerada (`audio/<id>/voz/` e `falas.json`) fica no repositório; `mix.wav`, trilha, efeitos e voz tratada são regenerados por `audio.py` e não são versionados.
