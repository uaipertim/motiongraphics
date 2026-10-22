# Série EXPLICA — vídeos explicativos em capítulos (60–90 s)

Formato novo do FAZLO Hospeda, feito para ser a base dos próximos vídeos do Hospeda, da Fazlo e do UaiPertim. É um **modelo reutilizável com motor próprio**: cada episódio é só um JSON (`episodios/<id>.json`) e um comando.

| Episódio | Tema | Duração | Saída |
|---|---|---|---|
| **explica-01** | "Sinal, saldo e crédito. Em 3 palavras." — 00 capa · 01 a frase · 02 o problema · 03 sinal · 04 saldo · 05 crédito · 06 não confunda · 07 no dia a dia · 08 anota aí · 09 salva esse | 79,0 s | [`output/explica-01/`](output/explica-01) |

Em cada episódio, `output/<id>/` traz:

- **Vídeo:** `fazlo-hospeda-<id>.mp4`.
- **Capa:** `capa.jpg` e `capa.png`; a capa é o quadro 0 do vídeo.
- **Storyboard:** `storyboard.jpg`, com 1 quadro do meio da montagem e 1 do capítulo pronto, por capítulo.
- **Revisão:** a pasta `revisao/` traz `relatorio-tecnico.txt`, `zonas-seguras.jpg`, `capa-no-feed.jpg`, `capa.txt` e `motor.json`.

## Os princípios do formato (o que muda em relação à Série FALA)

1. **Capítulos numerados com trilho.** Uma linha limão `#AFFA27` com brilho liga os nós 01…09 pela esquerda da tela.
   - **Dentro do capítulo:** a luz desce devagar do nó até o pé do quadro, como uma barra de progresso.
   - **Na troca de capítulo (0,9 s):** a luz faz a curva em S, desce pela direita e volta pela esquerda até o próximo nó. A câmera desce junto e o nó novo acende com um anel.
   - Cada capítulo é um quadro de 1080×1920 empilhado no mundo, e a câmera só anda nas trocas.
2. **A cena se constrói, não se substitui.** Cada capítulo tem:
   - um rótulo mono pequeno em limão, escrito como máquina de escrever;
   - um título em 2 linhas (branca + limão) que fica fixo;
   - um **diagrama** que cresce peça por peça, cada peça na palavra da voz que a dispara. As peças mudam de estado (check, alerta, cadeado fechando, valores somando) e se ligam por setas e linhas.
3. **Ilustração + interface estilizada.**
   - **Cartões genéricos:** reserva, calendário, barra de pagamento, cartão de crédito, comanda e recibo.
   - **Ícones de traço:** chalé, mala, chave, moedas, cadeado.
   - Nunca telas reais do sistema.
4. **Legenda de leitura.**
   - Uma linha de apoio cinza embaixo do título, uma por frase da narração (o resumo da frase).
   - Ela fica **pelo menos 1,5 s inteira na tela**. A anterior sai antes de a próxima entrar: nunca se sobrepõem.
   - Aceita `*limão*` e `~vermelho~` para destacar palavras.
5. **Cor por capítulo.** A base é escura, com um brilho de fundo que muda suavemente de tom por capítulo: `limao`, `ambar`, `petroleo`, `roxo`. O fundo também tem pontos de grade e poeira em paralaxe, que dão profundidade quando a câmera anda.
6. **Marca fixa.** No topo de todos os quadros (y 309–359) vão a logo oficial (o arquivo, sem redesenho), "FAZLO Hospeda" e o @ do JSON (`marca`).
7. **Fecho longo (≥ 8 s).**
   - O título ("Salva e manda / pra quem cuida das reservas.").
   - Um card vertical estilizado do próprio vídeo, com curtir, comentar, enviar e salvar acendendo um a um e chips limão "Comenta", "Manda" e "Salva".
   - Embaixo, um comentário sendo digitado, com um coração no fim.
   - O motor garante que **todo texto do fecho fica ≥ 3 s parado** antes do fim.
8. **Voz fluida.**
   - É a voz oficial da FAZLO no ElevenLabs.
   - **Cada capítulo é UMA geração inteira** (todas as frases numa chamada só), com estabilidade 0,45, estilo 0,30 e velocidade 1,0.
   - Se uma frase sair ruim, o capítulo inteiro é gerado de novo. Nunca se emendam palavras ou trechos.
   - A trilha sintetizada é contínua por baixo, com ducking suave. A mixagem fica em −14 LUFS, com pico real ≤ −1 dBTP.
9. **Formato.**
   - 9:16, 1080×1920, 60 fps, H.264 + AAC 48 kHz, 60–90 s.
   - Nada importante fora de y 265–1456. Nada (nem o trilho) em x ≥ 950 entre y 1060 e 1560: o motor recorta essa área.
   - A capa é o quadro 0, nas regras de capa do [`../README.md`](../README.md).

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

- **Os capítulos:** o **capítulo 0 é a capa** (diagrama `capa`), e o seu `rotulo` vira o chip da capa. Os capítulos 1… ganham os nós 01…; o último deve ser o `fecho`.
- **`fala`:** as frases do capítulo, na ordem. O texto falado é a junção delas e vai **inteiro numa geração só**.
- **`apoio`:** a linha de apoio que entra com a frase (`null` = nenhuma; igual à anterior = continua).
- **`titulo`:** sempre 2 linhas (a 2ª em limão); o tamanho se ajusta à largura. `risca_titulo: { "linha": 2, "em": "fim" }` risca uma linha em limão (em `fim` = perto do fim do capítulo).
- **`tom`:** `limao`, `ambar`, `petroleo` ou `roxo`.
- **Tempo do capítulo:** `inicio` é a pausa antes da voz (padrão 0,25 s; capítulo 0: 0,10 s). `segura` é o tempo depois da voz antes da troca (padrão 0,45 s). `min` é a duração mínima (o fecho usa 8 s).
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
| `calendario` | Calendário do mês: a data pontilhada ("promessa") recebe o cadeado que cai e fecha; o pagamento com check; o cartão de contraste | `mes, dia, primeiro_dia_semana (0 = domingo), dias_no_mes, em, promessa, garantida, cadeado: {em}, pagamento: {t, em}, contraste: {t, dia, sub, em, em_destaque}` |
| `barra` | Barra de pagamento que se monta: total → pago → soma (consumo) → tira (desconto, cai) → colchete e valor que falta contando, a conta e o alerta | `escala`, `total: {t, v, em}`, `passos: [{tipo: pago\|soma\|tira, t, v, icone, em}]`, `resultado: {t, em}`, `conta`, `alerta: {t, em}` |
| `credito` | A data antiga com a moeda do sinal: cancela, a moeda não some nem vai pro bolso, vira cartão de crédito e encaixa na nova data | `antiga: {t, dia, em}`, `nova: {t, dia}`, `sinal: {t, em}`, `cancelou`, `fica`, `bolso`, `vira: {em}`, `cartao: {t, sub}` |
| `pares` | Pares de cartões com "=" que é cortado e vira "≠" limão | `pares: [{a: {t, sub, icone, em}, b: {…}}]` |
| `perguntas` | Ilustração (mala e chave) e perguntas que entram e ganham check, ligadas por um trilhinho | `ilustracao: {em}`, `itens: [{t, icone, em}]` |
| `lista` | Palavra → significado (ligação, revelação e um brilho final) | `itens: [{t, sentido, icone, em}]` |
| `fecho` | Card vertical do vídeo, ações acendendo com chips e o comentário digitado com coração | `card: {titulo[], faixa}`, `acoes: [{icone: curtir\|comentar\|enviar\|salvar, chip, em}]`, `comentario: {nome, t, em}` |

**Ícones** (`icone`): chale, mala, chave, moedas, cadeado, cadeado_aberto, check, x, alerta, calendario, cartao, recibo, comanda, pix, etiqueta, taca, curtir, comentar, enviar, salvar, carteira, seta, relogio.

**Diagrama novo:** é um bloco `CENAS.<nome> = { setup(cap), draw(ctx, cap, t) }` em `src/anim.js`. No `setup`, resolva os tempos com `at(cap, "palavra")` e registre os sons com `cue(t, 'tipo')`. No `draw`, use as peças prontas: `panel`, `chip`, `badge`, `icon`, `enter`/`ent` (a entrada padrão), `reservaCard`, `miniCal` e `coin`. O resto vem sozinho: título, apoio, trilho, câmera, marca, faixas seguras e caixas para a revisão.

## Revisão técnica do explica-01 (`scripts/qa.py`)

Ver [`output/explica-01/revisao/relatorio-tecnico.txt`](output/explica-01/revisao/relatorio-tecnico.txt).

## Estrutura

```
episodios/<id>.json     roteiro (o único arquivo que muda entre episódios)
scripts/episodio.sh     o comando único
scripts/voz.py          narração: uma geração inteira por capítulo (with-timestamps), conferida e com histórico
scripts/linha.py        linha do tempo: capítulos, frases, apoios, palavras; a narração montada sem cortes
scripts/audio.py        voz + trilha contínua com ducking + efeitos → audio/<id>/mix.wav (−14 LUFS)
scripts/render.cjs      cues | info | capa | video | stills (Chromium headless, quadro a quadro)
scripts/qa.py           revisão técnica
scripts/storyboard.py   montagem + pronto, por capítulo
src/anim.js             motor (window.EXPLICA): trilho, câmera, cabeçalho, apoio, diagramas, ícones, marca
src/index.html          página de render e de prévia (?ep=<id>, com som)
```
