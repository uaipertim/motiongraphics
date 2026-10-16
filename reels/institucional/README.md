# FAZLO Hospeda — vídeo institucional (102,4 s, 9:16, para WhatsApp)

**Status:** pronto, mas **não será usado agora**. O institucional oficial vai ser refeito com as telas do **Hospeda V2** (novo layout), mantendo roteiro, narração, trilha e motion. Ver [Como refazer com as telas do V2](#como-refazer-com-as-telas-do-v2). Este vídeo não tem capa: não precisa.

Vídeo de apresentação do sistema, feito para ser enviado no WhatsApp:

- **Miniatura:** o quadro 0 já mostra "FAZLO Hospeda" e uma frase forte por cima da bagunça.
- **Sem som:** as frases principais da narração ficam escritas na tela.
- **Formato:** MP4 leve, 1080×1920.

Usa **somente telas reais** do sistema: capturas da demonstração (`demo.fazlohospeda.com.br`), levantadas no inventário do repositório `uaipertim/fazlo-hospeda`, branch `docs-mapeamento` (`INVENTARIO-FAZLO-HOSPEDA.md`, pasta `capturas/`). Nenhuma tela, valor ou função foi inventado. As capturas usadas estão copiadas em [`src/capturas/`](src/capturas), com o nome `módulo--arquivo.png`.

## Arquivos

| Arquivo | O que é |
|---|---|
| `output/fazlo-hospeda-institucional.mp4` | o vídeo: 102,4 s · 14,9 MB · H.264 1080×1920 30 fps · AAC · −14,0 LUFS · pico real −1,3 dBTP |
| `output/storyboard.jpg` | as cenas 1, 2 e 8 e o meio da pausa de cada recorte, tirados direto do motor |
| `output/revisao/institucional-motion-cenas-1-4.mp4` | a prévia da direção de motion (cenas 1 a 4), aprovada |
| `output/revisao/mix.txt` | onde entra cada trecho de voz e a conferência da mixagem |
| `output/revisao/voz.txt` · `output/revisao/trechos.txt` | as falas geradas e os trechos (frases inteiras) |

## Como refazer com as telas do V2

A ideia é trocar **só as telas**. Roteiro, narração (`audio/voz/`), trilha (`scripts/trilha.py`) e motion (`src/anim.js`) ficam como estão. Toda posição, cor e valor medidos numa captura estão no `src/anim.js`, e cada captura nova pede remedir os itens dela.

### 1. Capturas novas

- **Onde:** `src/capturas/celular/` e `src/capturas/computador/`, com o nome `módulo--arquivo.png`. Os arquivos são listados em `SHOT_FILES` (`src/anim.js`); se o nome mudar, mude ali.
- **Mesmo cenário da demo:** as mesmas reservas, hóspedes e valores, ou valores equivalentes. Os valores das contagens precisam bater com a tela nova (ver o passo 3).
- **Tamanhos:**
  - **Celular:** 780 × 1688 px (390 css a 2×). O celular do vídeo foi calculado para essa proporção: `PH`/`SCR` e `KS = SCR.w / 780`.
  - **Computador:** 1280 px de largura.
  - **Se mudar:** ajuste `KS` e a altura da tela em `PH` (tela = 582 × 1260 para 780 × 1688).
- **Antes de escolher cada tela, repita os cuidados desta versão:**
  - nada de textos técnicos ou errados da demo dentro dos recortes;
  - nada de linha quebrando palavra ou nome ("CHECK-" / "IN", "Carlos" / "Henrique Silva", "DOCUMENTO NÃO" / "FISCAL");
  - nome de hóspede fora do voucher;
  - a lista "não usar" desta versão;
  - Day Use só se já estiver publicado.

### 2. Ferramentas de medição

```bash
python3 scripts/grade.py output/grade src/capturas/celular/*.png    # grade de 50 px sobre as capturas, para achar os recortes
python3 scripts/medir.py <captura> x0,y0,x1,y1 [...]                # fundo, caixa da tinta, cor do texto e colunas de letras
node scripts/render.cjs stills 15.6,22.9 --dir output/stills       # conferir um quadro depois de mudar
```

- **`bg` da op:** o `bg` que o `medir.py` imprime.
- **`r`:** a caixa da tinta, com 1 a 2 px de folga.
- **`color`:** a cor do texto.
- **Digitação (`type`):** as colunas de letras são medidas sozinhas na captura, ao abrir o vídeo (`glyphs()`). Basta o `r` e o `bg` certos.

### 3. O que cada cena usa e o que remedir

Tudo fica em `PLAN` (`src/anim.js`), salvo onde está indicado. Coordenadas em pixels da captura.

| Cena | Capturas (`SHOT_FILES`) | O que remedir |
|---|---|---|
| 1 · dor | — (ilustração, não é tela do sistema) | só a **miniatura do quadro 0** (ver o passo 4) |
| 2 · virada | logo oficial (`src/assets/fazlo-hospeda-logo-alpha.png`) | nada |
| 3 · reservas | `calendario` (calendário do dia), `acomodacao` (etapa 2, só passa na tela), `criada` (Reserva Criada!), `voucher` | **calendário:** `crop` dos quartos do dia; `roll` nos dois algarismos do "5 livres • 5 ocupadas" (`to` = os números da tela); `reveal` de cada cartão de quarto e `stamp` de cada selo (HOSPEDADA, CHECK-OUT HOJE); `hl` no chip. **Reserva criada:** `check` (centro `c`, raio `rad`, espessura `lw`, pontos `pts` do traço, cor); `reveal` do título; `type` do código. **Voucher:** dois recortes sem o nome do hóspede (código/status e botões); `type` do código; `stamp` do status; `tap` em "Enviar por e-mail". **Toques de navegação (`tap` de cada batida):** "+" no calendário, "Avançar" na etapa 2, "Ver voucher" |
| 4 · check-in | `checkin` (modal de check-in), `reciboIn` (recibo de check-in) | **Antes do recorte (`pre`):** o ponto do zoom (`zoom.x/y` no campo de valor); `tap` no campo; `type` do valor (`align: 'right'` se o campo alinha à direita); `stamp` do selo de quitação. **Resumo:** três `count` (total, sinal negativo, saldo: `to` = valores da tela). **Toque:** "Confirmar recebimento e realizar Check-in" (`tap` da batida seguinte). **Recibo:** recorte sem o título quebrado; `wipe` em cada linha da frase; `stamp` do saldo; `pad` e `bg` da margem |
| 5 · comandas | `ficha` (ficha da hospedagem, só na tela), `quantidade` (modal de quantidade), `lancado` (confirmação), `comandasPC` (comandas ativas no computador, depois do lançamento) | **Toques:** "Lançar consumo" na ficha; o "+" da quantidade; "Adicionar à comanda". **Modal:** `roll` 1 → 2 da quantidade; `count` do subtotal (`from` = preço unitário, `to` = subtotal). **A conta:** linha da conta do quarto: `roll` das unidades e `count` do total (`from` = valores da captura **antes** do lançamento, `to` = **depois**); precisa das duas capturas reais, antes e depois. **Voo:** `fly` da confirmação até a conta |
| 6 · caixa | `caixaRolagem` (diário de caixa rolado), `caixa` (topo do caixa, só na tela), `fecharCaixa` (fechar sessão) | **Diário:** `crop` dos dois lançamentos; `reveal` (com `dx`) de cada um e `stamp` de cada valor. **Toque:** "Fechar Caixa" no topo do caixa. **Fechamento:** `count` dos quatro cartões (abertura, entradas com `prefix: '+ '`, saídas negativas, saldo esperado); `tap` em "Confirmar fechamento"; `hl` em "Total de entradas" |
| 7 · check-out | `checkout` (modal de check-out), `reciboOut` (recibo de hospedagem), `relatorios` | **Check-out:** `count` dos totais e do saldo final (`from` = total, `to` = 0); `stamp` e `check` do selo "Quitado" (ícone pequeno: `c`, `rad`, `pts`). **Toque:** "Confirmar Check-out". **Recibo:** cabeçalho (sem o título que quebra); selo "SALDO QUITADO" com `stamp` e `check`. **Relatórios:** dois `count` das receitas |
| 8 · fechamento | `calendarioPC` (calendário semanal no computador), `visaoGeral` (celular), `demoPC` e `demoCel` (entrada da demonstração) | **Monitor:** `CAL` (enquadramento da grade da semana: x, y, largura, altura) e `MON_BARS` (as barras de reserva que se preenchem; o fundo vazio vem da linha de pixels 6 px acima de cada barra, então confira que ali só há células vazias). **Celular:** a Visão geral não tem recorte; confira que não mostra textos técnicos ("checked_out_at"). **Demo:** só trocar as capturas |

**Ainda dentro de cada recorte:**
- **Destaque:** o `hl` (contorno limão sobre o dado principal) é medido também.
- **Tamanho:** o `s` (escala máxima) e o `cy` (altura na tela) só mudam se o recorte novo tiver outro tamanho. Ele cresce até caber em 960 × 1180.

**Contagens (`count`):**
- **Fonte:** o número é desenhado em JetBrains Mono, ajustado à largura da caixa `r`.
- **Fim:** no fim, a captura real entra por cima.
- **Formato:** "R$ 1.525,00", "- R$ 45,00"; use `prefix` para "+ ".
- **Se o V2 mudar o formato do valor** (outro símbolo, sem centavos, outra fonte), ajuste `brl()`.

**Frases na tela e narração:** não mudam. Se o V2 mudar o nome de algum botão ou módulo (ex.: "Comandas"), confira se as frases (`cap` em `PLAN`) e o trilho (`mod`) continuam verdadeiros.

### 4. Miniatura do quadro 0: deixar o centro livre

No WhatsApp, o botão de play fica sobre o meio da miniatura. Nesta versão, a frase "Caderno, papel e um caixa que nunca bate?" está no centro (`HOOKY = 962`) e fica coberta. **Na próxima versão:**

- **Área livre:** nenhum texto nem a logo num círculo de cerca de **240 px de raio em torno de (540, 960)**, ou seja, a faixa de y ≈ 720 a 1200 livre no meio.
- **Onde mudar:** em `HOOK`, `HOOKY`, `LOGO0` e `LOGO1` (`src/anim.js`) e no véu escuro atrás da frase, em `mess()`.
  - **Sugestão:** a frase em cima (y ≈ 300 a 700) e a logo embaixo (y ≈ 1250 a 1350). A bagunça ilustrada pode ficar no centro, atrás do play.
  - **A virada (cena 2)** sai da posição da logo do quadro 0 (`LOGO0`). Se a logo descer, confira a sucção da bagunça (que vai para `LOGO0.y`) e o crescimento da logo.
- **Conferência:** `node scripts/render.cjs stills 0` e um círculo de ~240 px sobre o centro para ver o que fica coberto.

### 5. Gerar de novo

A linha do tempo, a trilha e os efeitos se recalculam sozinhos a partir das medidas novas e da duração das falas:

```bash
node scripts/render.cjs cues && python3 scripts/trilha.py && python3 scripts/storyboard.py && node scripts/render.cjs video
```

- **Storyboard:** se o nome de alguma tela mudar, ajuste o dicionário `NOME` em `scripts/storyboard.py`.
- **Voz:** só gere de novo (`scripts/voz.py` e `scripts/trechos.py`) se o texto mudar. As regras de pronúncia e de frases inteiras estão em Narração.

## Mecânica: "recorte em relevo + trilho de módulos", com motion sobre as telas reais

- **Celular em ¾.** Mostra as capturas reais com perspectiva verdadeira: a tela é desenhada em faixas verticais, cada uma na sua profundidade.
- **Recorte em relevo.** O trecho que importa sai da tela como uma placa e cresce até ficar legível.
  - **Entrada:** em mola, com leve overshoot.
  - **Contorno:** limão, com um brilho que dá uma volta nele uma vez.
  - **Destaque:** um contorno limão marca o dado.
  - **Fundo:** o resto do celular escurece e desfoca.
  - **Câmera:** parallax e aproximação suave.
- **Motion sobre as capturas** (`runOps` em `src/anim.js`). Cada efeito cobre um trecho da captura com a cor de fundo medida ali e redesenha em movimento **os pixels reais da própria captura**; nos números, desenha o valor contando até o número da tela. Tudo termina na captura original.
  - **Números vivos:** os valores contam em reais inteiros e desaceleram no fim, e os contadores sobem rolando como placar.
    - R$ 300,00, + R$ 1.525,00, - R$ 45,00 e R$ 255,00 no fechamento do caixa;
    - R$ 960,00 → Saldo final R$ 0,00 no check-out;
    - R$ 8.940,00 e R$ 151,00 nos relatórios;
    - "5 livres • 5 ocupadas" e a quantidade 1 → 2, como placar.
  - **Digitação:** a captura aparece letra a letra, com cursor piscando, no "R$ 500,00" do campo "Valor (R$)" do check-in e nos códigos FHZ-VB2MZ2 e FHZ-000132.
  - **Toques:** dedo com onda no botão real antes de cada ação:
    - na navegação: "+", "Avançar", "Ver voucher";
    - nas ações: "Enviar por e-mail", "Confirmar recebimento e realizar Check-in", "Lançar consumo", "+" da quantidade, "Adicionar à comanda", "Fechar Caixa", "Confirmar fechamento de caixa", "Confirmar Check-out".
  - **Selos e checks:** os selos estalam ao aparecer; o círculo e o check de "Reserva Criada!", "Quitado" e "Saldo quitado" se desenham.
  - **Movimento que conta a história:**
    - os quartos do dia entram um a um;
    - a confirmação do consumo voa até a conta do quarto, e a conta soma (4 → 6 unidades, R$ 38,00 → R$ 52,00: antes e depois do lançamento, nas capturas do computador);
    - os recebimentos entram em sequência no caixa;
    - os recibos saem "impressos", subindo aos trancos;
    - no computador da cena 8, as reservas da semana se preenchem uma a uma na grade do calendário.
- **Navegação.** Dentro de um módulo, a tela seguinte empurra a anterior. Entre módulos, o celular gira. No check-in, a câmera se aproxima do campo de valor.
- **Trilho.** No alto, os chips RESERVAS · CHECK-IN · COMANDA · CAIXA · CHECK-OUT · RELATÓRIOS acendem conforme o vídeo avança.
- **Identidade:** fundo `#0A0A0A`, limão `#AFFA27`, Inter Display 900 nas frases e JetBrains Mono NL nos chips. A logo oficial entra sem alteração (`src/assets/fazlo-hospeda-logo-alpha.png`, mesmo arquivo dos Reels).

## Ritmo

A linha do tempo das cenas 3 a 7 sai da lista de batidas (`PLAN` em `src/anim.js`) e da duração real de cada trecho de voz (`src/voz-trechos.json`):

- **Leitura:** a animação acontece na entrada (a 80% do tempo original, para o vídeo ficar perto de 100 s). Depois dela, cada recorte fica **parado e legível no mínimo 3,0 s**, e até 0,7 s depois do fim da fala que fala dele.
- **Frases:** a frase escrita só sai quando o recorte começa a voltar para a tela.
- **No tempo da música:** cada troca de tela cai num tempo, ou meio tempo, da trilha de 105 BPM.
- **Menos recortes em vez de pressa.** Ficaram de fora:
  - na cena 3, o "Total do período" (a etapa 2 da reserva só passa na tela);
  - as etapas do assistente de reserva;
  - a comanda aberta da ficha;
  - o 2º recorte de relatórios.
- **Voz:** nunca acelerada e **nunca cortada no meio de uma frase** (ver Narração).

## Roteiro e capturas

Os tempos estão em `audio/cues.json` (`cenas`, `trilho`, `voz`, `recortes`).

| # | Tempo | Voz (trechos) | Recortes | Capturas (`capturas/…/celular/` no repositório do sistema) |
|---|---|---|---|---|
| 1 | 0–6,2 s | "Reserva anotada no caderno, consumo no papel e um caixa que nunca bate?" | — (bagunça ilustrada; logo + **"Caderno, papel e um caixa que nunca bate?"** inteiros no quadro 0) | — |
| 2 | 6,2–12,7 s | "Conheça o FAZLO Hospeda: a gestão da sua pousada em um só lugar." | — (a logo cresce com uma onda limão; **"A gestão da sua pousada em um só lugar."**; o celular sobe em mola) | logo oficial |
| 3 | 12,7–31,8 s | "Veja a ocupação no calendário." · "Lance uma reserva em poucos passos." · "E envie o voucher ao hóspede." | quartos do dia + "5 livres • 5 ocupadas" · "Reserva Criada!" + código · voucher (só código, status e botões) | `02-calendario/calendario-rolagem` · `13-nova-reserva/etapa2-acomodacao-escolhida` (só na tela) · `13-nova-reserva/reserva-criada` · `03-reservas/voucher` |
| 4 | 31,8–45,5 s | "No check-in, registre o pagamento." · "E gere o recibo na hora." | campo "Valor (R$)" digitado (câmera) · "Saldo das diárias no Check-in: R$ 500,00" · "O valor integral das diárias foi recebido e lançado no caixa. Saldo: R$ 0,00" | `14-check-in/modal-check-in` · `14-check-in/recibo-check-in` |
| 5 | 45,5–60,1 s | "Durante a estadia, cada consumo do hóspede é lançado." · "E vai direto para a conta dele." | "Café Especial Expresso · Quantidade 2 · Subtotal R$ 14,00" · "lançado com sucesso na comanda do Bica D'Água 01!" → conta do quarto | `04-hospedagens/ficha-hospedagem-ana` (só na tela) · `06-comandas/modal-quantidade` · `06-comandas/consumo-lancado` · `computador/06-comandas--consumo-lancado` (a conta) |
| 6 | 60,1–73,5 s | "Cada recebimento entra no caixa." · "Você abre e fecha o caixa sabendo exatamente quanto entrou." | os pagamentos de hospedagem da Ana Julia e do Carlos · "Fechar sessão de caixa" + os 4 cartões | `07-caixa/caixa-rolagem` · `07-caixa/caixa` (só na tela) · `07-caixa/form-fechar-caixa` |
| 7 | 73,5–91,6 s | "No check-out, tudo fecha com recibo." · "E os relatórios mostram como a pousada está indo." | "Saldo final R$ 0,00 · Quitado" · cabeçalho do recibo de hospedagem + selo "Saldo quitado" · receitas de diárias e de consumo | `04-hospedagens/modal-check-out` · `04-hospedagens/recibo-check-out` · `08-relatorios/relatorios-rolagem` |
| 8 | 91,6–102,4 s | "FAZLO Hospeda." · "No celular ou no computador." · "Teste agora na demonstração." | — (computador com a grade da semana se preenchendo e celular com a Visão geral, calmos; as duas telas viram a entrada da demo; chip `demo.fazlohospeda.com.br` até o fim) | `computador/02-calendario--calendario` (grade da semana) · `01-visao-geral/visao-geral` · `00-acesso/login-demo` (celular e computador) |

**Cuidados com as capturas:**
- **Quebras de linha defeituosas fora dos recortes.**
  - Recibo de check-in: o título "HOSPEDAGEM QUITADA NO CHECK-IN" quebra em "CHECK-" / "IN" no celular (defeito do sistema). O recorte começa em y 915, logo abaixo do "IN".
  - Voucher: o nome da pousada quebrava em "Pousada Demonstração" / "FAZLO". O recorte mostra só o código, o status e os botões.
  - Recibo de check-out: o título "RECIBO DE HOSPEDAGEM — DOCUMENTO NÃO / FISCAL" fica fora.
  - Caixa: os lançamentos quebram no travessão ("Pagamento de hospedagem —" / nome).
- **Voucher:** a tela do voucher fica escurecida e desfocada o tempo todo, então o nome do hóspede nunca aparece legível.
- **Textos errados da demo fora dos recortes:** "PRODUCT" e nomes cortados em Comandas, "isolamento do tenant" no recibo e "created_at" em Relatórios.
- **Não usados:**
  - rodapé do login do app;
  - "checked_out_at";
  - "Check-out 11:00";
  - modais de Acomodações no celular;
  - Usuários e Configurações;
  - Day Use.
- **Menu do computador:** o item "Usuários" aparece só como item do menu lateral, aprovado.
- **Valores intermediários:** os valores que aparecem durante as contagens são só o número subindo até o da tela. Os dois pontos de partida que não são zero também são reais:
  - quantidade 1 / subtotal R$ 7,00: o preço unitário;
  - conta R$ 38,00 / 4 unidades: a captura de antes do lançamento.

## Narração (ElevenLabs)

- **Voz e ajustes:** Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`), `eleven_multilingual_v2`, estabilidade 0,40 · semelhança 0,80 · estilo 0,35 · speaker boost · velocidade 1,0, sem aceleração.
- **Geração:** seed 808, com as falas vizinhas como contexto.
  - **Cenas 1, 2, 7 e 8:** uma chamada por fala.
  - **Cenas 3 a 6:** uma chamada por frase, cada uma com uma pausa de 0,4 s depois do ponto final, para a voz terminar a última sílaba.
  - **Conferência:** o `voz.py` só aceita uma tomada que termina em silêncio. Se não terminar, tenta a semente seguinte. A frase 6a ficou com a seed 809.
- **Trechos (`scripts/trechos.py`):**
  - cada trecho é uma frase inteira;
  - nas cenas 7 e 8 o corte cai no silêncio entre frases (−75 a −92 dB do pico, conferido);
  - toda emenda tem fade de 30 ms.
- **Mudanças de texto:** a cena 5 virou "Durante a estadia, cada consumo do hóspede é lançado." / "E vai direto para a conta dele." (pedido). A 2ª frase da cena 6 virou "Você abre e fecha o caixa sabendo exatamente quanto entrou."
- **Cena 2 ("Hospeda" saía "Hóspeda"):** a API recebe **"Ospéda"** com a seed 810.
  - Escolhida por análise acústica no Praat contra a cena 8, que sai certa ("Hospéda"), e a cena 2 antiga (errada).
  - Medidas: duração, intensidade e F0 das sílabas e distância MFCC/DTW da palavra.
  - Resultado: 1ª sílaba curta e 2ª mais forte, como na cena 8. As tomadas com "Hospéda" saíram no padrão errado.
- **Chave:** a chave da API não fica no repositório nem é impressa. Nesta nuvem a rede a injeta; fora dela, use `ELEVENLABS_API_KEY`.

## Trilha e mixagem (`scripts/trilha.py`)

100% sintetizadas (numpy/scipy):

- **Cena 1:** zumbido grave e tenso, tique de relógio no tempo da música que vai entrar, papel e a fita do caixa sacudindo; a bagunça é sugada.
- **Da virada em diante:** Fá maior a 105 BPM (F · C/E · Dm · B♭, I–V–vi–IV), com pad, baixo pulsado e kalimba em arpejo. O 1º tempo cai quando a logo cresce.
- **Batida:** leve durante as telas (bumbo, palmas, shaker, chimbal aberto no contratempo), com uma virada a cada 4 compassos.
- **Fim:** a batida sai no fechamento, e o Fá fica soando com a sineta de recepção da série no endereço da demo.
- **Efeitos discretos:** recorte subindo e voltando, brilho no contorno, toque, cada tecla digitada, contagem (tiques que desaceleram), check, selo, voo até a conta, impressão do recibo, câmera, troca de tela, giro, chip do trilho e preenchimento das reservas.
- **Mixagem:** a trilha e os efeitos abaixam 9,5 dB sob a voz. Master em −14 LUFS e pico real ≤ −1 dBTP no MP4.

## Como gerar

```bash
python3 scripts/voz.py              # as falas e frases (audio/voz/cena-<id>.wav + falas.json) e output/revisao/voz.txt
python3 scripts/voz.py --so 2       # refaz só a cena 2 (aceita frases: --so 3b)
python3 scripts/trechos.py          # os trechos (frases inteiras): audio/voz/trechos/*.wav + src/voz-trechos.json
node scripts/render.cjs cues        # a linha do tempo do motor: audio/cues.json
python3 scripts/trilha.py           # trilha + efeitos + voz: audio/mix.wav e output/revisao/mix.txt (--ate T: prévia de um trecho)
python3 scripts/storyboard.py       # output/storyboard.jpg
node scripts/render.cjs video       # output/fazlo-hospeda-institucional.mp4
python3 scripts/grade.py output/grade src/capturas/celular/*.png    # grade para medir recortes (não entra no vídeo)
python3 scripts/medir.py <captura> x0,y0,x1,y1                      # fundo, tinta, cor e letras de um retângulo
node scripts/render.cjs stills 0,15,59.5            # quadros soltos em output/stills/
```

**Formato "leve" para o WhatsApp:** H.264 High 4.1, 30 fps, CRF 24 com teto de 3 Mb/s, AAC 128 kb/s, faststart, abaixo de 16 MB.
