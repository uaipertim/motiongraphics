# Série EXPLICA — vídeos explicativos em capítulos (60–90 s)

Formato novo do FAZLO Hospeda, feito para ser a base dos próximos vídeos do Hospeda, da Fazlo e do UaiPertim. É um **modelo reutilizável com motor próprio**: cada episódio é só um JSON (`episodios/<id>.json`) e um comando.

| Episódio | Tema | Duração | Saída |
|---|---|---|---|
| **explica-01** | "Sinal, saldo e crédito. Em 3 palavras." — 00 capa · 01 a frase · 02 o problema · 03 sinal · 04 saldo · 05 crédito · 06 não confunda · 07 no dia a dia · 08 anota aí · 09 salva esse | 76,9 s | [`output/explica-01/`](output/explica-01) |
| **explica-02** | "Como nunca vender o mesmo chalé duas vezes." — 00 capa · 01 a cena · 02 o problema · 03 passo 1 · 04 passo 2 · 05 passo 3 · 06 passo 4 · 07 não confunda · 08 anota aí · 09 salva esse | 84,3 s | [`output/explica-02/`](output/explica-02) |

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
   - **Últimos 3 s, sempre:** uma passagem limão leva à **logo oficial FAZLO Hospeda centralizada**, com "FAZLO Hospeda", o @ e a sineta (como o fecho dos outros Reels). A logo pousa com a sineta 3,05 s antes do fim e não muda mais. **A passagem para a logo só começa depois da última palavra da voz**: no JSON, o fecho usa `segura` ≥ 3,45 s (o motor avisa no console se não der, e a revisão confere). Vale a partir do explica-02.
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
   - **Cada capítulo é UMA geração inteira** (todas as frases numa chamada só).
   - **Configuração (desde 23/10/2026):** `eleven_v4`, voz Raquel, `voice_settings` só com estabilidade 0,50 e semelhança 0,75. `style`, `use_speaker_boost` e `speed` não são enviados. Cada geração grava no `falas.json` o modelo e os ajustes.
   - **Pronúncia:** o texto vai para a API com o dicionário de [`scripts/pronuncia.py`](scripts/pronuncia.py), compartilhado com a Série Fala: "Hospeda" → "Hospéda", "WhatsApp" → "Uátsap", "FAZLO"/"Fazlo" → "Fázlo". A troca é só da palavra inteira. O alinhamento volta para a grafia oficial, palavra por palavra, e o `qa.py` reprova qualquer grafia fonética na legenda ou no quadro.
   - **Trava:** explica-01 e explica-02 (publicados, em `eleven_multilingual_v2`) não são regenerados, nem com `--refaz`. O mesmo vale para qualquer episódio narrado por outro modelo. Só passa com `--forcar-modelo-novo`.
   - **Teste v2 × v4:** em [`teste-v4/`](teste-v4): medidas e áudios para ouvir, sem tocar nos episódios.
   - Se uma frase sair ruim, o capítulo inteiro é gerado de novo. Nunca se emendam palavras ou trechos.
   - A trilha sintetizada é contínua por baixo, com ducking suave. A mixagem fica em −14 LUFS, com pico real ≤ −1 dBTP.
   - Quando a duração muda (TR, `segura`, `min`), a trilha se refaz sozinha pelo novo tempo.
9. **Formato.**
   - 9:16, 1080×1920, 60 fps, H.264 + AAC 48 kHz, 60–90 s.
   - Nada importante fora de y 265–1456. Nada (nem a notinha, nem a passagem) em x ≥ 950 entre y 1060 e 1560: o motor recorta essa área.
   - A capa é o quadro 0, nas regras de capa do [`../README.md`](../README.md) (a notinha só aparece no fim da capa).

## Legenda palavra por palavra (episódios novos, decisão de 25/10/2026)

Todo episódio **novo** com narração leva a legenda palavra por palavra, no padrão do reel-09 e da Série Fala (que já a tem: Inter Display 900, branca, palavras-chave em limão com pop, sem painel). Liga-se por episódio, no JSON: `"legenda": "palavras"`. Sem a marca, o episódio fica como era (linha de apoio cinza) — os publicados (explica-01 e explica-02) **não** têm a marca e não são renderizados de novo.

- **Tempos:** os da API (with-timestamps), já alinhados à grafia oficial palavra a palavra (`pronuncia.realinha`): a tela mostra "FAZLO Hospeda" e "WhatsApp", nunca "Hospéda"/"Uátsap"/"Fázlo". A palavra entra no instante em que é falada.
- **Palavras-chave (limão):** `destaque` (lista de trechos, no capítulo ou em cada item de `fala`), `destaque_global` (no episódio) e, de brinde, o que já vai entre `~…~` no `apoio` da frase. O resto fica em branco.
- **Posição:** faixa livre de **y 1424–1536**, em **x 150–950**: abaixo dos diagramas (que acabam em y 1412), acima dos 20% de baixo da interface, fora da coluna de botões e da impressorinha. Texto de 52 px, até 2 linhas, centrado. É a mesma em todos os capítulos (capa e fecho incluídos) e some antes da logo do fecho.
- **Leitura:** páginas de até 2 linhas, fechadas no fim de uma frase quando já duraram ≥ 1,5 s; **cada página fica ≥ 1,5 s na tela** (a última do capítulo segura até 0,9 s depois da fala; o motor puxa palavras da página anterior se for preciso). A linha de apoio cinza não aparece (a legenda a substitui), mas o `apoio` de cada frase continua dando o ritmo do capítulo: os diagramas foram afinados com essa duração (o selo "RESERVA DUPLA", por exemplo, precisa dela antes da troca). Por isso mantenha o `apoio` no JSON.
- **Revisão (`qa.py`):** mesmas palavras e tempos da narração; páginas ≥ 1,5 s; ≤ 2 linhas; x 150–950 e y ≤ 1536; não cobre nenhum elemento (caixas a cada 0,25 s); sai antes da logo; sorteio de 24 palavras conferidas no vídeo (aparecem no quadro da fala); grafia oficial.
- **Teste visual:** `teste-legenda/legenda-palavras-grade.jpg` (9 momentos do explica-02 com a legenda, sem voz nova).

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

**Conferência automática:** cada geração é conferida. Se falhar, o capítulo inteiro é gerado de novo com outra seed, até 4 vezes. As regras, com os limites de 24/10/2026 para o `eleven_v4`:
- ritmo de 7,5 a 19 letras/s;
- nenhuma pausa interna acima de 0,9 s;
- ao menos 0,05 s de áudio depois da fala (nada cortado no fim);
- episódio de 60 a 90 s.

O **fim da fala** é medido no áudio (último trecho de 10 ms acima de −40 dBFS), e não na marcação da API. No v4, a marcação às vezes estica a última letra até o fim do arquivo. Esse fim vale para a sobra, para o ritmo e para o `linha.py`: a última palavra, a cena e a logo não seguram o tempo esticado.

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
- **`apoio`:** a linha de apoio que entra com a frase (`null` = nenhuma; igual à anterior = continua). Com `"legenda": "palavras"` no topo do JSON não aparece (a legenda a substitui); o `~…~` do apoio só serve para marcar palavras-chave. `destaque`: lista de trechos da fala em limão na legenda.
- **`titulo`:** sempre 2 linhas (a 2ª em limão); o tamanho se ajusta à largura. Só na capa o título pode ter 3 linhas, para ficar grande no recorte 3:4 (ex.: "Como nunca vender / o mesmo chalé / duas vezes."). `risca_titulo: { "linha": 2, "em": "fim" }` risca uma linha em limão (em `fim` = perto do fim do capítulo).
- **`tom`:** `limao`, `ambar`, `petroleo` ou `roxo`.
- **Tempo do capítulo:** `inicio` é a pausa antes da voz (padrão 0,25 s; capítulo 0: 0,10 s). `segura` é o tempo depois da voz antes da troca (padrão 0,45 s). `min` é a duração mínima. O fecho usa `min` 9, `inicio` 0,05 e `segura` 3,55: precisa de 8–9 s, com a logo nos últimos 3 s, entrando só depois da última palavra. Se a fala do fecho passar de ~5,4 s, encurte a fala, não o fecho. Para caber em 70–85 s, os capítulos 01–08 podem usar `inicio` 0,15 e `segura` 0,30 (como no explica-02); a velocidade da voz nunca muda.
- **`em` (dentro do diagrama):** a palavra da fala que dispara a peça.
  - `"sinal"` dispara na 1ª vez que a palavra aparece; `"sinal#2"`, na 2ª.
  - `"+1.2"` dispara 1,2 s depois do começo do capítulo; `"fim"`, perto do fim.
  - Se a palavra não existir, a peça entra num tempo padrão e o console avisa.

### Biblioteca de diagramas

| `tipo` | Visual | Campos |
|---|---|---|
| `capa` | Chip, título grande (2 ou 3 linhas), faixa limão inclinada e cadeados "? ? ?" que acendem e mostram a palavra (3 ou 4 cadeados; dois na mesma palavra acendem um depois do outro) | `faixa`, `cadeados: [{t, em}]` |
| `reserva` | Cartão da reserva (chalé, diárias, valor), pilha do caixa que tomba, "?" pulsando e selo "SEM REGISTRO" | `reserva: {titulo, linhas[], valor, em}`, `moedas: {em}`, `duvida: {em}` |
| `partes` | O cartão se abre em encaixes ligados por linhas; um fica solto, vermelho, com o chip de alerta | `reserva`, `abre`, `partes: [{t, icone, em}]`, `solta: {i, em, t, em_t}` |
| `calendario` | Calendário do mês: a data pontilhada ("promessa") recebe o cadeado, que cai e fecha **no canto da célula** (nunca sobre o número); o pagamento com check; o cartão de contraste | `mes, dia, primeiro_dia_semana (0 = domingo), dias_no_mes, em, promessa, garantida, cadeado: {em}, pagamento: {t, em}, contraste: {t, dia, sub, em, em_destaque}` |
| `barra` | Barra de pagamento que se monta: total → pago → soma (consumo) → tira (desconto, cai) → colchete e valor que falta contando, a conta e o alerta | `escala`, `total: {t, v, em}`, `passos: [{tipo: pago\|soma\|tira, t, v, icone, em}]`, `resultado: {t, em}`, `conta`, `alerta: {t, em}` |
| `credito` | A data antiga com a moeda do sinal: cancela, a moeda não some nem vai pro bolso; depois da seta, ela vira um **cartão de crédito grande** (546 px, ~70% da área útil; mono 32 px, valor 68 px) embaixo da nova data, que se encaixa nela por um conector limão | `antiga: {t, dia, em}`, `nova: {t, dia}`, `sinal: {t, em}`, `cancelou`, `fica`, `bolso`, `vira: {em}`, `cartao: {t, sub}` |
| `pares` | Pares de cartões com "=" que é cortado e vira "≠" limão (o nome do cartão se ajusta à largura) | `pares: [{a: {t, sub, icone, em}, b: {…}}]` |
| `perguntas` | Ilustração (mala e chave) e perguntas que entram e ganham check, ligadas por um trilhinho | `ilustracao: {em}`, `itens: [{t, icone, em}]` |
| `lista` | Palavra → significado (ligação, revelação e um brilho final) | `itens: [{t, sentido, icone, em}]` |
| `colisao` | Uma semana em 7 casas; duas reservas do mesmo chalé entram pelos lados, cada uma com a sua origem, ligadas à mesma casa; confirmam, dão um tranco uma na outra, a casa fica vermelha e entra o selo | `semana: {mes, dias[], nomes[], alvo, em}`, `reservas: [{t, origem, icone, em}]` (2), `confirma: {t, em}`, `selo: {t}` |
| `fontes` | Três origens da agenda (cartão com ícone + minicalendário de UMA semana, cada um com os seus dias ocupados), ligadas por linhas tracejadas quebradas com × vermelho; no fim, o dia em destaque fica vermelho nas três | `fontes: [{t, icone, ocupados[], em}]` (3), `semana` (os 7 dias, ex. `[11, …, 17]`), `destaque` (ex. 14), `quebra: {em}`, `alerta: {em}` |
| `agenda` | As origens começam como os cartões do `fontes` (largos, com a semana) e encolhem até chips no topo (o minicalendário some antes de o cartão estreitar), mandam setas até a borda de um calendário único grande e um ponto leva cada reserva até a sua casa; o chip limão do calendário e as casas livres acendendo ("tem vaga") | `fontes: [{t, icone, dia}]`, `semana`, `destaque`, `mes`, `primeiro_dia_semana`, `dias_no_mes`, `junta: {em}`, `entram: {em}`, `chip: {t, em}`, `vaga: {em}` |
| `prazo` | A pré-reserva (casa tracejada em âmbar + relógio correndo) e dois ramos: pagou o sinal → casa limão "CONFIRMADA"; não pagou → o prazo zera e a casa volta a "LIVRE" | `dia`, `semana`, `pre: {t, em}`, `relogio: {horas, em}`, `pagou: {t, chip, fim, em}`, `nao: {t, fim, em, em_fim}` |
| `bloqueio` | A reserva confirmada recebe o cadeado limão, que viaja pelas linhas até os canais; cada canal passa de "ABERTO" a "FECHADO", todos na mesma hora | `reserva: {t, sub, em}`, `cadeado: {em}`, `canais: [{t, icone, em}]` (3), `abertos: {em}`, `hora` |
| `consulta` | A pergunta num balão genérico (sem logo de app), uma lupa que passa pela semana e acha a casa livre, "DE MEMÓRIA" riscado e a resposta no balão limão do VOCÊ, só depois de olhar | `pergunta: {t, em}`, `semana: {dias[], nomes[], ocupados[], alvo}`, `lupa: {em, achou}`, `memoria: {t, em}`, `resposta: {t, em}` |
| `passos` | Lista ligada: cada passo numa linha (número limão, ícone e o passo em mono), acendendo na sua palavra, com check e um brilho final | `itens: [{t, icone, em}]` (até 4) |
| `fecho` | A pergunta num balão de comentário grande (com a notinha fechada e o título fixo); nos últimos 3 s, a logo oficial centralizada com a sineta (automática) | `pergunta: {linhas[], em}` (aceita `*limão*`; a pergunta deve entrar cedo, ex. `"+1.2"`, para ficar ≥ 3 s parada) |

**Minicalendários:** sempre uma semana só (7 colunas de largura fixa, cada número centralizado na sua coluna), com folga interna de 16 px até a borda do cartão e número de 22–26 px (o maior que cabe). Se não couber, o cartão aumenta; nunca o número sai da borda. A revisão confere todos os textos de todos os cartões (abaixo).

**Ícones** (`icone`): chale, mala, chave, moedas, cadeado, cadeado_aberto, check, x, alerta, calendario, cartao, recibo, comanda, pix, etiqueta, taca, curtir, comentar, enviar, salvar, carteira, seta, relogio, lupa, telefone.

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

## Revisão técnica do explica-02

Resultado: **aprovado** ([`output/explica-02/revisao/relatorio-tecnico.txt`](output/explica-02/revisao/relatorio-tecnico.txt)).

- **Duração:** 84,25 s (alvo 70–85 s). Com o texto original, a narração dava 96,4 s; os capítulos 01–06 foram reescritos e gerados de novo, cada um em 1 geração inteira.
- **Áudio:** −14,0 LUFS, pico real −1,8 dBTP.
- **Áreas seguras e leitura:** 0 pixel aceso na coluna de botões e todas as linhas de apoio ≥ 1,5 s inteiras. Os diagramas descem até y 1378–1412.
- **Identidade:** 9 linhas na notinha, 9 checks e "CONTA FECHADA ✓".
- **Textos nos cartões:** nenhum texto passa da caixa do cartão que o contém (folga ≥ 12 px; 2.879 textos conferidos). Os minicalendários dos capítulos 02 e 03 mostram só a semana 11–17, com o 14 em destaque; no 03, os cartões começam largos (como no 02) e só depois encolhem até os chips. A mesma checagem rodou no explica-01 (2.326 textos, nenhum fora; DATA ANTIGA/NOVA DATA com folga de 20,7 px), sem re-renderizar.
- **Fecho:** dura 9,0 s. A voz termina em 80,44 s e a passagem para a logo começa em 80,91 s (0,47 s depois). A logo fica parada nos últimos 3,05 s.

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
