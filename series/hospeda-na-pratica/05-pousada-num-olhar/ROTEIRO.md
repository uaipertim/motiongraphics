# Episódio 5: A pousada num olhar (roteiro aprovado)

**Status:** etapa 1 aprovada em 24/11/2026 (commit e5b2240), com dois cuidados: em "Tem algo para resolver?", o foco fica no bloco "Precisa de atenção" inteiro e nos cartões "Check-out em atraso" e "Reserva vencida sem check-in" (o "Conflito com o Airbnb" só ao fundo); e trocar "check-out" se a Alexa pronunciasse mal (não foi preciso). **Etapa 2 pronta:** narrada, montada e renderizada (67,7 s); ver o [README](README.md) e a seção 8. Segue as [regras da série](../REGRAS.md). Vai ao ar na segunda, 30/11, às 19h ([programação](../PROGRAMACAO.md)). **Não publicar.**

## 1. Levantamento da tela Início (Demo recarregada, 24/11/2026)

Tudo foi tocado e lido na própria Demo (versão 1.9.3), no celular a 390×844, e os textos estão exatamente como aparecem. O script é `scripts/levantar.cjs`:
- esconde o selo "Demonstração", a data do cabeçalho e "Quero usar";
- **antes de salvar** cada captura, lê o texto visível e procura o texto proibido de sempre (e-mail, "Demo", "Demonstração", "Quero usar", senha, código, token, link, iCal) e os erros de exemplo dos canais ("não consegue ler", "Confira o link", "não lê o calendário", "Confira se o link"). **Nas 10 capturas, não achou nada.**

As capturas estão em `aprovacao/levantamento/`, e a folha está em [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg). Legenda em limão: entra no vídeo. Em âmbar: só referência. O texto de cada bloco e as conferências estão em `aprovacao/levantamento/levantamento.json`.

### O que a tela Início mostra hoje (de cima para baixo)
1. **Título:** "Hoje na pousada".
2. **Cartão preto "Recebido hoje":**
   - o selo "Caixa aberto desde 08:00" (um toque leva à tela **Caixa**, fora do Início: fica fora do vídeo);
   - o total em limão, **R$ 1.525,00**, e uma barra dividida pelas formas de pagamento;
   - as formas: **PIX R$ 900,00 · Dinheiro R$ 125,00 · Crédito R$ 380,00 · Débito R$ 120,00**;
   - a linha **"A receber nas saídas de hoje: R$ 0,00 · saídas quitadas"**.
3. **Três cartões:**
   - **Hospedados: 10 hóspedes**;
   - **Chegadas: 2, 1 concluída**;
   - **Saídas: 2, 1 concluída**.
4. **"Precisa de atenção" (4):** três cartões à vista e "Ver todos (4)".
   - "Check-out em atraso": Lucas Martins · Chalé de Pedra 06, "Saída prevista ontem, 23/11", botão "Fazer check-out";
   - "Conflito com o Airbnb": Chalé de Pedra 05 · 28/11 a 01/12, botão "Abrir a reserva do Hospeda";
   - "Reserva vencida sem check-in": Rafael Teixeira · Chalé de Pedra 05, botões "Regularizar estadia" e "Abrir a reserva";
   - em "Ver todos" (janela por cima do Início), o quarto: "Pré-reserva sem sinal: Existe 1 pré-reserva pendente de sinal."
5. **"Saídas de hoje" (1 de 2 concluídas):**
   - Carlos · Bica D'Água 02 · saída às 10:15 · "Concluído";
   - Beatriz · Bica D'Água 03 · saída até 12:00 · "saldo quitado" · botão "Check-out".
6. **"Chegadas de hoje" (2):**
   - Thiago Oliveira · Bica D'Água 04 · entrada às 14:30 · "Concluído";
   - Helena Duarte · Ipê 08 · entrada a partir de 14:00 · 2 hóspedes · "a receber R$ 900,00" · botão "Fazer check-in".
7. **Barra de baixo:** Início, Calendário, + (Nova reserva), Comandas, Mais. **Sino** no cabeçalho (9+).

### Painéis que abrem no próprio Início
Um toque nos cartões do topo abre um painel **embaixo dos cartões, no próprio Início** (a tela não muda, o Início continua marcado na barra, a página rola até o painel e o painel fecha no "×"):

| Toque em | Painel | O que mostra |
|---|---|---|
| Hospedados | "Hospedados agora" | "10 hóspedes em 5 hospedagens": Ana Julia Costa (Bica D'Água 01), Thiago Oliveira (Bica D'Água 04), Beatriz Nogueira (Bica D'Água 03), Lucas Martins (Chalé de Pedra 06), Patrícia Ribeiro (Ipê 09), cada um com "2 hóspedes na hospedagem" e "Ver ficha" |
| R$ 1.525,00 | "Recebido hoje" | "5 pagamentos", cada um com nome, forma de pagamento, origem, horário, operador e valor: Dinheiro R$ 85,00 (Carlos, check-out), PIX R$ 900,00, Cartão de crédito R$ 380,00, Cartão de débito R$ 120,00 e Dinheiro R$ 40,00 (Thiago, check-in) |
| Saídas | "Saídas de hoje" | "2 saídas": Beatriz Nogueira (saída prevista 12:00, check-out previsto) e Carlos Henrique Silva (saída registrada 10:15) |
| A receber nas saídas de hoje | "A receber nas saídas de hoje" | "Nada a receber das saídas de hoje." |
| Chegadas | "Chegadas de hoje" | "1 chegada": só a Helena Duarte (ver a divergência abaixo) |

### Os números batem
- PIX + Dinheiro + Crédito + Débito = 900 + 125 + 380 + 120 = **R$ 1.525,00**, igual ao total.
- Os 5 pagamentos do painel somam **R$ 1.525,00**, e o dinheiro (85 + 40) dá os **R$ 125,00** do cartão.
- Hospedados: o cartão diz 10 e o painel diz "10 hóspedes em 5 hospedagens" (5 × 2).
- Saídas: o cartão diz "2, 1 concluída", a lista diz "1 de 2 concluídas" e o painel lista as 2.

### Divergência encontrada (fica fora do vídeo)
- **Chegadas:** o cartão diz **"2 · 1 concluída"** e a lista "Chegadas de hoje" mostra as duas (Thiago, concluído, e Helena). Mas o **painel** do cartão diz **"1 chegada"** e só lista a Helena.
- Já o painel de **Saídas** lista as duas, a concluída e a prevista. Os dois painéis contam de jeitos diferentes.
- **No vídeo:** a pergunta "Quem chega hoje?" é respondida pelo **cartão** e pela **lista "Chegadas de hoje"**, que batem entre si. O painel de Chegadas não aparece. Fica o aviso para a próxima atualização da Demo.

### Fica fora do vídeo
- **Sino (Atividades):** é o registro da pousada ("70 não lidas"), aparece em todas as telas e não é um bloco do Início.
- **"Caixa aberto desde 08:00":** leva à tela Caixa (episódios 12 e 13).
- **Botões que abrem outros fluxos:** "Fazer check-out", "Fazer check-in", "Check-out", "Abrir a reserva", "Regularizar estadia" e o "+". São de outros episódios. O vídeo mostra que eles estão ali, mas não toca neles.
- **O conflito com o Airbnb** aparece ao fundo em "Precisa de atenção", mas o vídeo não fala dele (é o episódio 8).

### Observações
- **As datas da tela seguem o dia da captura**, por exemplo, "Saída prevista ontem, 23/11". A data do cabeçalho fica escondida.
- **A Demo mostra o dia já andado:** a saída das 10:15 e a entrada das 14:30 já estão concluídas. Por isso o roteiro não fala em "manhã" nem em hora.
- **Na captura da etapa 2,** o script para se os números não forem os mesmos deste levantamento (R$ 1.525,00, 10, 2, 2, "Precisa de atenção" 4).

## 2. Estrutura: pergunta e resposta, numa tela só

**Como é:** o celular fica com o Início do começo ao fim. As dúvidas do dono surgem em letra grande, uma de cada vez, em cima do celular:
1. "Quem dorme aqui hoje?"
2. "Quem chega hoje?"
3. "Quem vai embora?"
4. "Quanto já entrou?"
5. "Entrou em quê?"
6. "Falta receber?"
7. "Tem algo para resolver?"

Para cada uma, a câmera vai ao bloco certo da **mesma tela**, e a resposta salta numa janela com o número. A pergunta respondida vira um selinho com "✓", que vai para uma fileira no alto. No fecho, os sete selinhos se juntam em volta do celular, e entra a frase **"Uma tela, o dia inteiro."**

**Por que é diferente dos episódios 2 a 4:**
- **Sem gancho de avatares e bilhete:** o vídeo já abre na tela do app, desde o quadro 0, com a frase do dia corrido em cima.
- **Sem o bloco da logo com três selos:** o título "A pousada num olhar" e o selo da série entram como uma faixa em cima do celular, que não sai da tela. A logo só aparece no fecho.
- **Sem navegação:** nada de "Toque em Mais e depois em…". Não se troca de tela. Os únicos toques abrem os painéis do próprio Início.
- **Sem o ciclo de cadastro** (lista, editar, antes e depois, novo, desativar): nada é alterado. O vídeo só lê a tela, e não há antes e depois.
- **O ritmo** vem das perguntas: sete batidas iguais (pergunta, câmera, janela, ✓). Antes, o ritmo vinha das ações de cadastro.

## 3. Roteiro

**Título na tela:** "A pousada num olhar", com "num olhar" em limão e o selo da série "FAZLO Hospeda na prática".

**Duração estimada:** cerca de **74 s**: a voz vai de 0,3 a 70,4 s, e a logo segue até 74 s.
- A estimativa usa o ritmo real da Alexa no episódio 4 (10,8 letras por segundo) e as pausas da linha do tempo.
- Os tempos definitivos saem da locução. Se alguma janela ficar sem tempo para ler, alongo só as pausas.

**Tom:** leve e direto, para o dono da pousada.
- **Dor:** o dia corrido e as perguntas de sempre, que hoje obrigam a abrir caderno, planilha e conversa.
- **Solução:** a resposta de todas numa tela só, o Início.

### Narração: tela e legenda (grafia oficial)
1. Dia corrido na pousada, e as perguntas não param.
2. No FAZLO Hospeda, tudo se responde numa tela só: o Início.
3. Quem dorme aqui hoje? Está no cartão Hospedados. Um toque, e aparece cada hospedagem, com nome e acomodação.
4. Quem chega hoje? Em Chegadas de hoje: quem já entrou e quem ainda falta.
5. Quem vai embora? Em Saídas de hoje, com o horário de cada um.
6. Quanto já entrou? Em destaque, logo no alto.
7. Entrou em quê? PIX, dinheiro, crédito e débito. Um toque, e aparece cada pagamento.
8. Falta receber? Logo abaixo, o que ainda está em aberto nas saídas.
9. Tem algo para resolver? Um check-out atrasado, por exemplo, já vem separado.
10. Uma tela, o dia inteiro.
11. E no começo, a FAZLO configura tudo com você.

### Narração: texto enviado à voz
1. Dia corrido na pousada, e as perguntas não param.
2. No Fázlo Hospéda, tudo se responde numa tela só: o Início.
3. Quem dorme aqui hoje? Está no cartão Hospedados. Um toque, e aparece cada hospedagem, com nome e acomodação.
4. Quem chega hoje? Em Chegadas de hoje: quem já entrou e quem ainda falta.
5. Quem vai embora? Em Saídas de hoje, com o horário de cada um.
6. Quanto já entrou? Em destaque, logo no alto.
7. Entrou em quê? Pix, dinheiro, crédito e débito. Um toque, e aparece cada pagamento.
8. Falta receber? Logo abaixo, o que ainda está em aberto nas saídas.
9. Tem algo para resolver? Um check-out atrasado, por exemplo, já vem separado.
10. Uma tela, o dia inteiro.
11. E no começo, a Fázlo configura tudo com você.

**Voz:** Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75, seed 7100, numa tomada só, como no episódio 4.

**Pronúncia e números:**
- "FAZLO" vai como "Fázlo" e "Hospeda" como "Hospéda".
- **Nenhum número e nenhum valor são falados.** Os números (10, 2, R$ 1.525,00 e as formas de pagamento) ficam só nas janelas, como a série vem fazendo.
- "PIX" aparece em caixa alta na tela e na legenda, como no app. No texto enviado à voz, vai "Pix".
- "Hospedados", "Chegadas de hoje" e "Saídas de hoje" são os nomes dos blocos no app.
- "check-out" fica como está. Se a Alexa pronunciar mal, troco por "uma saída atrasada" e aviso.

**Legenda:**
- Palavra por palavra, numa faixa própria embaixo, com as palavras-chave em limão.
- Fora da legenda ficam a frase 1, as perguntas e o fecho (frases 10 e 11), porque já estão escritos grandes na tela. Nas frases 3 a 9, a legenda começa na resposta.

## 4. Linha do tempo (estimada; os tempos reais saem da locução)

A linguagem visual continua a da série: telas inteiras da Demo, closes de 2× nos toques, contornos limão e janelas recortadas da mesma captura que saltam da tela.

**O que é novo neste episódio:**
- **O celular fica parado no centro, um pouco abaixo do meio,** e não sai de cena: não há troca de tela. A câmera só aproxima, rola a tela dentro do celular e volta.
- **As perguntas entram em letra grande** (Inter Display 900, branco, palavra-chave em limão) na faixa de cima, uma de cada vez.
- **A resposta salta numa janela** com o número ou a lista, saindo do bloco certo.
- **A pergunta respondida encolhe** num selinho com "✓" (mono, escuro, ponto limão), que vai para a fileira do alto. Ao fim são sete.

| Tempo (s) | Frase | Tela (inteira) | O que acontece |
|---|---|---|---|
| 0,0–5,1 | 1 | `inicio` (escurecida) | Desde o quadro 0 (miniatura): o celular com o Início, mais escuro, e por cima "Dia corrido na pousada, / e as perguntas não param.", com "não param" em limão. Em "perguntas", três pontos de interrogação pequenos piscam em volta do celular e somem. |
| 5,1–11,1 | 2 | `inicio` | A tela clareia. O selo da série entra no alto e o título "A pousada num olhar" entra em "FAZLO Hospeda", com "num olhar" em limão. Em "Início", contorno limão no "Início" da barra de baixo. O título sobe e encolhe para a faixa de cima. |
| 11,1–22,1 | 3 | `inicio` → `inicio-hospedados` | A pergunta "Quem dorme aqui hoje?" entra. Close de 2× no cartão **Hospedados**: contorno e janela com "10 hóspedes". Toque no cartão ("Um toque"); o painel "Hospedados agora" abre no próprio Início. Janela com "10 hóspedes em 5 hospedagens" e, em seguida, com os cinco nomes e acomodações. A pergunta vira "✓ Hospedados". |
| 22,1–29,5 | 4 | `inicio` → `inicio-fim` | "Quem chega hoje?". Contorno no cartão **Chegadas** ("2 · 1 concluída"). A tela rola até o fim. Janela com "Chegadas de hoje": Thiago Oliveira com "Concluído" (contorno limão, "já entrou") e Helena Duarte com "Fazer check-in" (contorno âmbar, "ainda falta"). Vira "✓ Chegadas". |
| 29,5–35,9 | 5 | `inicio-fim` | "Quem vai embora?". A câmera sobe para **Saídas de hoje** ("1 de 2 concluídas"). Janela com Carlos ("saída às 10:15", "Concluído") e Beatriz ("saída até 12:00", "Check-out"); em "horário", os dois horários pulsam. Vira "✓ Saídas". |
| 35,9–40,4 | 6 | `inicio` | "Quanto já entrou?". A tela rola de volta ao topo. Close no cartão preto e a janela salta com **"R$ 1.525,00"**, grande, em limão. Vira "✓ Recebido". |
| 40,4–49,2 | 7 | `inicio` → `inicio-recebido` | "Entrou em quê?". As quatro formas saltam uma a uma, no ritmo da fala: **PIX R$ 900,00**, **Dinheiro R$ 125,00**, **Crédito R$ 380,00** e **Débito R$ 120,00**, com a parte certa da barra acendendo. Toque no valor ("Um toque"); o painel "Recebido hoje" abre. Janela com "5 pagamentos" e os dois primeiros, com "Forma de pagamento" em destaque. Vira "✓ Formas de pagamento". |
| 49,2–55,9 | 8 | `inicio` | "Falta receber?". Close na linha **"A receber nas saídas de hoje"** e janela com "R$ 0,00 · saídas quitadas". Vira "✓ A receber". |
| 55,9–63,4 | 9 | `inicio-atencao` | "Tem algo para resolver?". A tela rola até **"Precisa de atenção"** e o selo "4" pulsa. Contorno âmbar no cartão "Check-out em atraso" e janela com "Lucas Martins · Chalé de Pedra 06 · Saída prevista ontem" e o botão "Fazer check-out". Vira "✓ Atenção". |
| 63,4–70,4 | 10–11 | **Fecho** | A câmera se afasta: o celular com o Início no topo, e os sete selinhos "✓" se juntam em volta dele, sem cobrir a tela. Entra "Uma tela, / o dia inteiro." (63,6), com "o dia inteiro" em limão. O celular encolhe e a logo do FAZLO Hospeda estoura em limão (66,0), com "E no começo, a FAZLO configura tudo com você." em limão embaixo (66,4). |
| 70,4–74,0 | — | **Logo** | @fazlohospeda aparece (71,0) e a trilha resolve. |

**Regras da montagem:**
- **Avisos do app:** esta tela não tem aviso de sucesso, mas a conferência quadro a quadro continua (nenhum aviso por cima de toque ou destaque).
- **Legenda:** não cobre nenhuma janela nem toque.
- **Selinhos "✓":** nunca encostam na logo nem na tela do celular. Esses selinhos ficam numa fileira só, fora do recorte do celular.

## 5. Dados e telas

**Dados:** só os da Demo, como estão no levantamento. Nada é digitado nem alterado no vídeo.

Não aparece nenhum e-mail, senha, código de autenticador, token ou link iCal. Os nomes de hóspedes e de operadores são os fictícios da Demo.

**Telas a capturar na etapa 2 (Demo recarregada, 1170×2532):** com a mesma conferência de texto proibido antes de salvar e a recusa se os números mudarem.

| Nome | O quê |
|---|---|
| `inicio` | Início no topo (Recebido hoje, formas de pagamento, a receber, três cartões) |
| `inicio-hospedados` | painel "Hospedados agora" aberto |
| `inicio-fim` | Início rolado até o fim (Saídas de hoje e Chegadas de hoje) |
| `inicio-recebido` | painel "Recebido hoje" aberto |
| `inicio-atencao` | Início rolado até "Precisa de atenção" |

**Ficam escondidos:** o selo "Demonstração", a data do cabeçalho e "Quero usar".

## 6. Capa (etapa 2)
- **Padrão da série:** o celular com o Início (captura `inicio`) e um único destaque saltando, o cartão preto "Recebido hoje" com o total e as formas de pagamento.
- **Título:** "A pousada / num olhar", com "num olhar" em limão.
- **Selo:** o da série.
- **Sem número de episódio.**

## 7. Fecho
A logo do FAZLO Hospeda estoura em limão, sem nada encostando nela, com @fazlohospeda embaixo. A trilha resolve no último tempo, como nos episódios anteriores.

## 8. Etapa 2: o que ficou no vídeo (tempos reais da locução)

**Voz:** Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75, seed 7100, numa tomada só.
- A fala tem 51,7 s, num ritmo de 10,3 letras por segundo.
- A transcrição da própria locução (ElevenLabs, speech-to-text) devolve "checkout" para "check-out". A pronúncia está certa, então a palavra ficou.

**Montagem:** a voz vai de 0,30 a 64,08 s, e a logo segue até **67,7 s**.
- Só as pausas mudaram; nenhuma palavra foi cortada nem acelerada.
- Além das pausas entre frases, há uma pausa de 0,7 s depois de cada pergunta, para a pergunta entrar e a câmera ir ao bloco.

| Pausa depois de | Na gravação (s) | No vídeo (s) |
|---|---|---|
| cada pergunta | 0,21 a 0,31 | 0,70 |
| frase 1 · frase 2 | 0,44 · 0,44 | 0,60 · 0,90 |
| "cartão Hospedados." (antes do toque) | 0,32 | 0,60 |
| frase 3 (Hospedados) | 0,39 | 1,80 |
| frases 4 · 5 (Chegadas · Saídas) | 0,30 · 0,28 | 1,20 · 1,20 |
| frase 6 (Quanto já entrou) | 0,27 | 0,90 |
| "débito." (antes do toque) | 0,35 | 0,70 |
| frase 7 (Pagamentos) | 0,29 | 1,80 |
| frases 8 · 9 (A receber · Atenção) | 0,24 · 0,33 | 1,20 · 1,60 |
| frase 10 | 0,32 | 0,60 |

| Tempo (s) | Frase | O que acontece |
|---|---|---|
| 0,0–4,7 | 1 | **Gancho:** desde o quadro 0, "Dia corrido na pousada, / e as perguntas não param." em cima do celular escurecido com o Início. Três "?" pulam em volta em "perguntas" (2,3). |
| 4,6–9,7 | 2 | A tela clareia. Entram o selo da série e "A pousada num olhar" em "FAZLO" (4,9). Em "Início" (8,4), contorno na aba Início da barra de baixo. |
| 9,7–19,4 | 3 | "Quem dorme aqui hoje?". Close de 1,9× no cartão Hospedados, contorno (12,2) e janela "Hospedados 10 hóspedes" (12,6). Toque no cartão (14,0); o painel "Hospedados agora" abre e a tela rola até ele. Janelas: "10 hóspedes em 5 hospedagens" (15,5) e a lista dos cinco, com marcas no nome (16,9) e na acomodação (17,4). Toque no "×" (19,3). Vira "✓ Hospedados". |
| 19,9–25,8 | 4 | "Quem chega hoje?". A tela volta ao topo: contorno no cartão Chegadas ("2 · 1 concluída"). A tela rola até o fim (21,6). Janela "Chegadas de hoje" (22,4): Thiago Oliveira com marca limão em "já entrou" (23,4) e Helena Duarte com marca âmbar em "ainda falta" (24,6). Vira "✓ Chegadas". |
| 26,3–31,6 | 5 | "Quem vai embora?". Contorno em "Saídas de hoje" e janela (28,2), com marcas nos horários 10:15 e 12:00 em "horário" (29,8). Vira "✓ Saídas". |
| 32,1–36,2 | 6 | "Quanto já entrou?". A tela volta ao topo, close no cartão preto, contorno no total e janela "Recebido hoje · R$ 1.525,00" em "destaque" (33,9). Vira "✓ Recebido". |
| 36,7–45,2 | 7 | "Entrou em quê?". Janela com a fileira das formas (38,1) e marcas no ritmo da fala: PIX (38,3), Dinheiro (38,8), Crédito (39,6) e Débito (40,3). Toque no total (41,7); o painel "Recebido hoje" abre e a tela rola. Janela com os dois primeiros pagamentos (42,8) e marcas em "Forma de pagamento" (43,1 e 43,3). Toque no "×" (45,1). Vira "✓ Pagamentos". |
| 45,7–51,0 | 8 | "Falta receber?". A tela volta ao topo. Contorno em "A receber nas saídas de hoje" em "Logo abaixo" (47,5) e janela em "em aberto" (49,0). Vira "✓ A receber". |
| 51,5–57,5 | 9 | "Tem algo para resolver?". A tela rola até "Precisa de atenção" e o bloco inteiro ganha contorno (52,2). Janelas âmbar: "Check-out em atraso" em "check-out atrasado" (53,5) e "Reserva vencida sem check-in" (54,7). O "Conflito com o Airbnb" fica só ao fundo, embaixo das janelas: sem close, sem janela e sem fala. Vira "✓ Atenção". |
| 57,9–60,8 | 10 | **Fecho:** a tela volta ao topo e a câmera se afasta. Os sete selinhos saem da fileira e reaparecem em volta do celular, sem passar por cima dele. Entram "Uma tela," (58,2) e "o dia inteiro." (59,1), em limão. |
| 60,7–67,7 | 11 | O celular e os selinhos somem e a logo estoura (60,7). Entram "E no começo," e "a FAZLO configura tudo com você." (61,8). @fazlohospeda (64,6) e a trilha resolve. |

**O que mudou em relação à linha do tempo estimada:**
1. **Duração:** 67,7 s, contra 74 s estimados. A fala real ficou mais curta, e as pausas foram alongadas só até dar tempo de ler as janelas.
2. **Rolagem de verdade:** a tela Início rola dentro do celular, sem cortes. Cada estado foi capturado como página inteira (`telas/pg-*.png`), que corre por baixo do cabeçalho e da barra de baixo do app. `scripts/conferir-montagem.py` confere que essa montagem dá a mesma imagem que a captura do celular nas cinco rolagens usadas.
3. **Quem chega hoje:** a lista "Chegadas de hoje" responde com marcas dentro da própria janela: limão em quem já entrou e âmbar em quem ainda falta.
4. **Tem algo para resolver:** há duas janelas âmbar, a do check-out em atraso e a da reserva vencida, e o contorno do bloco inteiro, conforme o cuidado aprovado.
5. **Título:** o título não encolhe para a faixa de cima. Ele sai antes da primeira pergunta, porque a faixa de cima fica com os selinhos.
6. **Operadores:** no painel "Recebido hoje", os operadores levam os nomes do episódio 2. João Caixa vira João Pereira, e Mariana Recepção vira Mariana Costa, como a série faz desde o episódio 2.
