# Série EXPLICA — vídeos explicativos em capítulos (60–90 s)

Formato novo do FAZLO Hospeda, feito para ser a base dos próximos vídeos do Hospeda, da Fazlo e do UaiPertim. É um **modelo reutilizável com motor próprio**: cada episódio é só um JSON (`episodios/<id>.json`) e um comando.

| Episódio | Tema | Duração | Saída |
|---|---|---|---|
| **explica-01** | "Sinal, saldo e crédito. Em 3 palavras." — 00 capa · 01 a frase · 02 o problema · 03 sinal · 04 saldo · 05 crédito · 06 não confunda · 07 no dia a dia · 08 anota aí · 09 salva esse | 76,9 s | [`output/explica-01/`](output/explica-01) |

Em cada episódio, `output/<id>/` traz:

- **Vídeo:** `fazlo-hospeda-<id>.mp4`.
- **Capa:** `capa.jpg` e `capa.png`; a capa é o quadro 0 do vídeo.
- **Storyboard:** `storyboard.jpg`, com 1 quadro do meio da montagem e 1 do capítulo pronto, por capítulo (no fecho: o texto parado e a logo final).
- **Revisão:** a pasta `revisao/` traz `relatorio-tecnico.txt`, `zonas-seguras.jpg`, `capa-no-feed.jpg`, `capa.txt` e `motor.json`.

## Identidade da série — regra fixa

A série tem cara própria da FAZLO, sem trilho, sem círculos numerados e sem câmera que viaja. Estes quatro elementos valem para **todos os episódios** e vêm do motor: o JSON não liga nem desliga nenhum deles.

1. **A notinha (a barra de progresso).**
   - É uma fita de papel de notinha, vertical e estreita, na lateral esquerda (x 20–140). O papel é claro, com borda serrilhada, e o texto é mono escuro.
   - Ela sai de uma impressorinha no pé da coluna (y ≈ 1396, LED limão). A impressora entra no fim da capa e imprime o cabeçalho "CONTA".
   - A cada capítulo, imprime uma linha ("01 · A FRASE", "02 · O PROBLEMA"…) e sobe. O rótulo fica numa linha só se couber com letra ≥ 16 px; se não couber, vai em 2 linhas de 18 px.
   - Os pontinhos da linha atual enchem enquanto o capítulo anda. Quando ele termina, um **check limão** é carimbado na linha.
   - No fecho, imprime **"CONTA FECHADA ✓"** (tarja escura com letra limão), rasga na impressora, **destaca e sobe** com uma leve inclinação, e a impressora sai.
   - Ela nunca invade x ≥ 950 entre y 1060 e 1560 nem cobre conteúdo: o conteúdo do capítulo começa em x = 160. A revisão confere as duas coisas.
2. **O chaveiro (o número do capítulo).**
   - O número vai numa plaquinha de chave de chalé estilizada: limão, com o furo, a argola, o ícone do chalé e "Nº 03".
   - Ela fica pendurada ao lado do rótulo mono (y ≈ 443), balança ao entrar e para em ~1,2 s.
3. **A sineta (a troca de capítulo).**
   - A troca dura TR = 0,5 s: uma faixa limão inclinada varre o quadro da esquerda para a direita, com o "ding" da sineta da recepção no meio da passagem.
   - À direita da faixa fica o capítulo que sai; à esquerda, o que entra (chaveiro e rótulo já entrando).
   - Ao mesmo tempo, a notinha avança uma linha. A câmera não anda: cada capítulo se constrói no mesmo quadro.
4. **O fecho com a logo (8–9 s).**
   - **Fase do texto:** o título ("Salva e manda / pra quem cuida das reservas."), a linha de apoio, a pergunta num balão de comentário grande e a notinha fechada ficam **≥ 3 s parados e legíveis**. Só a luz que corre na borda do balão e os pontinhos de "digitando…" se mexem.
   - **Últimos 3 s, sempre:** uma passagem limão leva à **logo oficial FAZLO Hospeda centralizada**, com "FAZLO Hospeda", o @ e a sineta (como o fecho dos outros Reels). A logo pousa com a sineta 3,05 s antes do fim e não muda mais.
   - A trilha faz o último acorde junto com essa sineta.

## Os princípios do formato (o que muda em relação à Série FALA)

1. **Capítulos numerados com a notinha e o chaveiro** (acima). Cada capítulo ocupa o quadro inteiro e se constrói no lugar; a passagem limão com a sineta faz a troca.
2. **A cena se constrói, não se substitui.** Cada capítulo tem:
   - o chaveiro "Nº NN" e um rótulo mono pequeno em limão, escrito como máquina de escrever;
   - um título em 2 linhas (branca + limão) que fica fixo;
   - um **diagrama** que cresce peça por peça, cada peça na palavra da voz que a dispara. As peças mudam de estado (check, alerta, cadeado fechando, valores somando) e se ligam por setas e linhas.
3. **Diagramas grandes.**
   - Ocupam x 160–940 (até x 1010 acima de y 1060) e descem até y ≈ 1400.
   - Os cartões têm letra mono de 24–36 px e valores de 56–112 px.
   - A revisão mede até onde cada capítulo desce.
4. **Ilustração + interface estilizada.**
   - **Cartões genéricos:** reserva, calendário, barra de pagamento, cartão de crédito, comanda e recibo.
   - **Ícones de traço:** chalé, mala, chave, moedas, cadeado.
   - Nunca telas reais do sistema, celulares ou computadores.
5. **Legenda de leitura.**
   - Uma linha de apoio cinza embaixo do título, uma por frase da narração (o resumo da frase).
   - Ela fica **pelo menos 1,5 s inteira na tela**. A anterior sai antes de a próxima entrar: nunca se sobrepõem.
   - Nunca encosta no diagrama (a revisão confere).
   - Aceita `*limão*` e `~vermelho~` para destacar palavras.
6. **Cor por capítulo.** A base é escura, com um brilho de fundo que muda de tom por capítulo (`limao`, `ambar`, `petroleo`, `roxo`), cruzando de um tom para o outro na passagem. O brilho respira devagar; pontos de grade e poeira sobem, e o quadro nunca congela.
7. **Marca fixa.** No topo de todos os quadros (y 309–359) vão a logo oficial (o arquivo, sem redesenho), "FAZLO Hospeda" e o @ do JSON (`marca`).
8. **Voz fluida.**
   - É a voz oficial da FAZLO no ElevenLabs.
   - **Cada capítulo é UMA geração inteira** (todas as frases numa chamada só), com estabilidade 0,45, estilo 0,30 e velocidade 1,0.
   - Se uma frase sair ruim, o capítulo inteiro é gerado de novo. Nunca se emendam palavras ou trechos.
   - A trilha sintetizada é contínua por baixo, com ducking suave. A mixagem fica em −14 LUFS, com pico real ≤ −1 dBTP.
   - Quando a duração muda (TR, `segura`, `min`), a trilha se refaz sozinha pelo novo tempo.
9. **Formato.**
   - 9:16, 1080×1920, 60 fps, H.264 + AAC 48 kHz, 60–90 s.
   - Nada importante fora de y 265–1456. Nada (nem a notinha, nem a passagem) em x ≥ 950 entre y 1060 e 1560: o motor recorta essa área.
   - A capa é o quadro 0, nas regras de capa do [`../README.md`](../README.md) (a notinha só aparece no fim da capa).

## Fazer o próximo episódio (só pelo JSON)

1. Copie `episodios/explica-01.json` para `episodios/explica-02.json` e troque `id`, `titulo` e os `capitulos` (formato abaixo).
2. Rode **um comando**:

```bash
cd reels/serie-explica
scripts/episodio.sh explica-02              # narração (só os capítulos que faltam) → vídeo → capa → revisão → storyboard
scripts/episodio.sh explica-02 --refaz 4    # gera de novo o capítulo 4 INTEIRO (outra seed) e refaz o resto
```

O comando roda, em ordem:

1. `voz.py`: uma geração por capítulo.
2. `linha.py`: monta a linha do tempo e a narração.
3. `render.cjs cues`: tira os eventos de som da animação.
4. `audio.py`: voz + trilha + efeitos, em −14 LUFS.
5. `render.cjs video`.
6. `render.cjs capa` e depois `revisao_capa.py`.
7. `render.cjs info`: exporta as linhas de apoio, as trocas e as caixas do conteúdo.
8. `qa.py`.
9. `storyboard.py`.

Nenhum código muda de um episódio para outro. O `relatorio-tecnico.txt` termina em `RESULTADO: aprovado` ou lista o que falhou.

### A chave da API

A chave do ElevenLabs fica **só em Segredos de rede**: a rede da nuvem põe o cabeçalho `xi-api-key` em chamadas a `api.elevenlabs.io`. Fora da nuvem, exporte `ELEVENLABS_API_KEY` no terminal. Os scripts só leem a variável se ela existir e nunca a imprimem, salvam ou registram. A chave nunca vai para chat, arquivo ou commit.

A narração gerada (`audio/<id>/voz/cap-NN.wav` + `falas.json`) fica no repositório, então o episódio é refeito sem chamar a API. O `falas.json` guarda, por capítulo:

- o texto e a seed usada;
- o sha1 do áudio;
- o histórico de todas as gerações inteiras feitas, com ritmo, maior pausa e o motivo de cada recusa.

**Conferência automática:** cada geração é conferida (ritmo 8–19 letras/s, nenhuma pausa interna > 0,9 s, fala não cortada no fim). Se falhar, o capítulo inteiro é gerado de novo com outra seed, até 4 vezes.

## Formato do JSON

```json
{
  "id": "explica-02",
  "titulo": "texto livre",
  "marca": "@fazlohospeda",
  "capitulos": [
    {
      "rotulo": "O PROBLEMA",
      "tom": "roxo",
      "titulo": ["Toda reserva", "tem três partes."],
      "fala": [
        { "texto": "O problema é que toda reserva tem três partes.", "apoio": "Sinal, saldo e crédito: cada um no seu encaixe." },
        { "texto": "E basta uma ficar solta pra dar prejuízo.", "apoio": "Basta uma ficar solta pra dar *prejuízo*." }
      ],
      "diagrama": { "tipo": "partes", "...": "..." },
      "inicio": 0.25, "segura": 0.45, "min": 0, "seed": 334
    }
  ]
}
```

- **Os capítulos:** o **capítulo 0 é a capa** (diagrama `capa`), e o seu `rotulo` vira o chip da capa. Os capítulos 1… ganham o chaveiro "Nº 01"… e uma linha na notinha (o `rotulo`); o último deve ser o `fecho`.
- **`fala`:** as frases do capítulo, na ordem. O texto falado é a junção delas e vai **inteiro numa geração só**.
- **`apoio`:** a linha de apoio que entra com a frase (`null` = nenhuma; igual à anterior = continua).
- **`titulo`:** sempre 2 linhas (a 2ª em limão); o tamanho se ajusta à largura. `risca_titulo: { "linha": 2, "em": "fim" }` risca uma linha em limão (em `fim` = perto do fim do capítulo).
- **`tom`:** `limao`, `ambar`, `petroleo` ou `roxo`.
- **Tempo do capítulo:** `inicio` é a pausa antes da voz (padrão 0,25 s; capítulo 0: 0,10 s). `segura` é o tempo depois da voz antes da troca (padrão 0,45 s). `min` é a duração mínima. O fecho usa `min` 9 e `inicio` 0,05: precisa de 8–9 s, com a logo nos últimos 3 s. Se a fala do fecho passar de ~5,9 s, encurte a fala, não o fecho.
- **`em` (dentro do diagrama):** a palavra da fala que dispara a peça.
  - `"sinal"` dispara na 1ª vez que a palavra aparece; `"sinal#2"`, na 2ª.
  - `"+1.2"` dispara 1,2 s depois do começo do capítulo; `"fim"`, perto do fim.
  - Se a palavra não existir, a peça entra num tempo padrão e o console avisa.

### Biblioteca de diagramas

| `tipo` | Visual | Campos |
|---|---|---|
| `capa` | Chip, título grande, faixa limão inclinada e cadeados "? ? ?" que acendem e mostram a palavra | `faixa`, `cadeados: [{t, em}]` |
| `reserva` | Cartão da reserva (chalé, diárias, valor), pilha do caixa que tomba, "?" pulsando e selo "SEM REGISTRO" | `reserva: {titulo, linhas[], valor, em}`, `moedas: {em}`, `duvida: {em}` |
| `partes` | O cartão se abre em encaixes ligados por linhas; um fica solto, vermelho, com o chip de alerta | `reserva`, `abre`, `partes: [{t, icone, em}]`, `solta: {i, em, t, em_t}` |
| `calendario` | Calendário do mês: a data pontilhada ("promessa") recebe o cadeado, que cai e fecha **no canto da célula** (nunca sobre o número); o pagamento com check; o cartão de contraste | `mes, dia, primeiro_dia_semana (0 = domingo), dias_no_mes, em, promessa, garantida, cadeado: {em}, pagamento: {t, em}, contraste: {t, dia, sub, em, em_destaque}` |
| `barra` | Barra de pagamento que se monta: total → pago → soma (consumo) → tira (desconto, cai) → colchete e valor que falta contando, a conta e o alerta | `escala`, `total: {t, v, em}`, `passos: [{tipo: pago\|soma\|tira, t, v, icone, em}]`, `resultado: {t, em}`, `conta`, `alerta: {t, em}` |
| `credito` | A data antiga com a moeda do sinal: cancela, a moeda não some nem vai pro bolso; depois da seta, ela vira um **cartão de crédito grande** (546 px, ~70% da área útil; mono 32 px, valor 68 px) embaixo da nova data, que se encaixa nela por um conector limão | `antiga: {t, dia, em}`, `nova: {t, dia}`, `sinal: {t, em}`, `cancelou`, `fica`, `bolso`, `vira: {em}`, `cartao: {t, sub}` |
| `pares` | Pares de cartões com "=" que é cortado e vira "≠" limão | `pares: [{a: {t, sub, icone, em}, b: {…}}]` |
| `perguntas` | Ilustração (mala e chave) e perguntas que entram e ganham check, ligadas por um trilhinho | `ilustracao: {em}`, `itens: [{t, icone, em}]` |
| `lista` | Palavra → significado (ligação, revelação e um brilho final) | `itens: [{t, sentido, icone, em}]` |
| `fecho` | A pergunta num balão de comentário grande (com a notinha fechada e o título fixo); nos últimos 3 s, a logo oficial centralizada com a sineta (automática) | `pergunta: {linhas[], em}` (aceita `*limão*`; a pergunta deve entrar cedo, ex. `"+1.2"`, para ficar ≥ 3 s parada) |

**Ícones** (`icone`): chale, mala, chave, moedas, cadeado, cadeado_aberto, check, x, alerta, calendario, cartao, recibo, comanda, pix, etiqueta, taca, curtir, comentar, enviar, salvar, carteira, seta, relogio.

**Diagrama novo:** é um bloco `CENAS.<nome> = { setup(cap), draw(ctx, cap, t) }` em `src/anim.js`. No `setup`, resolva os tempos com `at(cap, "palavra")` e registre os sons com `cue(t, 'tipo')`. No `draw`, use as peças prontas: `panel`, `chip`, `badge`, `icon`, `enter`/`ent` (a entrada padrão), `reservaCard`, `miniCal` e `coin`. O resto vem sozinho: chaveiro, título, apoio, notinha, passagem com a sineta, marca, faixas seguras e caixas para a revisão. O diagrama deve ficar em x 160–940 (até 1010 acima de y 1060) e y ≈ 826–1406, e registrar com `BOX(nome, …)` as peças importantes.

## Revisão técnica do explica-01 (`scripts/qa.py`)

Resultado: **aprovado**, refeito com a identidade nova. O relatório completo está em [`output/explica-01/revisao/relatorio-tecnico.txt`](output/explica-01/revisao/relatorio-tecnico.txt).

| Item | Medido | Limite |
|---|---|---|
| Duração | 76,88 s (4613 quadros, 60 fps); trocas de 0,5 s | 60–90 s |
| Áudio | −14,0 LUFS, pico real −1,7 dBTP; vídeo × áudio com Δ 9 ms | −14 / ≤ −1 |
| Voz | 10 capítulos, cada um uma geração inteira, colocada sem cortes (a mesma narração de antes, sem regerar) | — |
| Coluna de botões | 0 pixel aceso em 308 quadros; nenhuma caixa em x ≥ 950, y 1060–1560 | 0 |
| Nada cobre o conteúdo | notinha, impressora e chaveiro sem encostar em nada; apoio sem encostar no diagrama; cadeado fora do "14" | — |
| Notinha | 9 linhas impressas, 9 checks, "CONTA FECHADA ✓" antes de destacar | — |
| Diagramas | descem até y 1378–1437 (capítulos 01–08) | ≈ 1400 |
| Cartão de crédito | 546×228 px = 70% da área útil; mono 32 px, valor 68 px | ~70%, ≥ 30 / ≥ 56 |
| Fecho | 9,0 s; título + pergunta + notinha parados 3,9 s; logo com sineta parada nos últimos 3,05 s | 8–9 s, ≥ 3 s |
| Capa | quadro 0, dentro da regra das capas | — |

## Estrutura

```
episodios/<id>.json     roteiro (o único arquivo que muda entre episódios)
scripts/episodio.sh     o comando único
scripts/voz.py          narração: uma geração inteira por capítulo (with-timestamps), conferida e com histórico
scripts/linha.py        linha do tempo: capítulos, frases, apoios, palavras; a narração montada sem cortes
scripts/audio.py        voz + trilha contínua com ducking + efeitos (sineta, impressora, carimbo, rasgo) → audio/<id>/mix.wav (−14 LUFS)
scripts/render.cjs      cues | info | capa | video | stills (Chromium headless, quadro a quadro)
scripts/qa.py           revisão técnica
scripts/storyboard.py   montagem + pronto, por capítulo
src/anim.js             motor (window.EXPLICA): notinha, chaveiro, passagem limão, cabeçalho, apoio, diagramas, fecho com a logo, ícones, marca
src/index.html          página de render e de prévia (?ep=<id>, com som)
```
