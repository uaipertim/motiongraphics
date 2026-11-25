# Episódio 6: Nova reserva em segundos (roteiro aprovado)

**Status:** etapa 1 aprovada em 25/11/2026 (commit 0c62029), com três ajustes: na voz, "em menos de meio minuto" no lugar de "vinte e três segundos"; nenhum quadro com o bloqueio do Airbnb ou o conflito (a cena chega direto à quinzena da reserva); e o passo 2 já na aba "Cadastrar novo". **Etapa 2 pronta:** narrada, montada e renderizada (61,6 s); ver o [README](README.md) e a seção 8. Segue as [regras da série](../REGRAS.md). Vai ao ar na quarta, 02/12, às 19h ([programação](../PROGRAMACAO.md)). **Não publicar.**

## 1. Levantamento do fluxo Nova reserva (Demo recarregada, 25/11/2026)

Tudo foi tocado e lido na própria Demo (versão 1.9.3), no celular a 390×844. Os textos estão exatamente como aparecem. O "hoje" da Demo é terça, 24/11.

O script é `scripts/levantar.cjs`:
- esconde o selo "Demonstração", a data do cabeçalho e "Quero usar";
- **antes de salvar** cada captura, lê o texto visível e procura o texto proibido de sempre: e-mail, "Demo", "Demonstração", "Quero usar", senha, código, token, link, iCal, os erros de exemplo dos canais e os nomes "João Caixa" e "Mariana Recepção";
- a única exceção é **"Código da reserva"**, o número da reserva criada (FHZ-…), que não é senha nem código de autenticador. Qualquer outro "código" para o script.

**Resultado:** nas 18 capturas, não achou nada.

**OCR, desta vez rodando de verdade:**
- Tesseract 5.3.4, com o pacote português instalado e conferido (`tesseract --version` e `--list-langs`).
- Leu todas as 18 capturas (de 113 a 1.376 letras por captura) e não achou nada (`aprovacao/levantamento/ocr-levantamento.json`).

As capturas estão em `aprovacao/levantamento/`, e a folha está em [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg).
- Em **âmbar** ficam as duas capturas em que **eu digitei** um valor: o hóspede e o sinal.
- O texto de cada tela, o cronômetro e a conferência do canal estão em `aprovacao/levantamento/levantamento.json`.

### O caminho (cada toque)
1. **Início** → o **"+"** da barra de baixo (o botão "Nova reserva"). A tela "Reservas" abre com o formulário **Nova reserva**, em 5 passos, com uma barra de progresso e o "×" para fechar.
2. **Passo 1 de 5 · Período e acomodação**
   - **Datas:** os campos "Entrada" e "Saída" (dd/mm/aaaa). Um toque em "Entrada" faz subir um **calendário**.
     - Ele abre em "Novembro de 2026", com "Hoje" e as setas de mês. Os dias antes de 24/11 ficam apagados.
     - Toca-se a entrada e a saída. O meio do período fica em limão, e embaixo aparece "12/12 → 14/12".
     - O botão é "Confirmar período".
   - **Logo abaixo das datas:** "2 diárias · entrada a partir das 14:00 · saída até às 12:00". Ali ficam também **Adultos** (2), **Crianças** (0) e "Viaja com Pet".
   - **"Livres no período · 10 de 10":** a lista das acomodações, cada uma com o tipo, a capacidade, o "Total do período" e a diária.
     - Para 12 a 14/12, a Bica D'Água 02 aparece assim: "Suíte · até 2 pessoas", "Total do período R$ 1.160,00 · 2 noites", "R$ 480,00 diária de semana".
     - Toca-se a acomodação (um botão redondo marcado). O "Continuar" fica preto e está **no fim da lista**: é preciso rolar a tela.
3. **Passo 2 de 5 · Hóspede**
   - Duas abas: **"Buscar existente"**, que já abre com a busca "Nome ou WhatsApp" e a lista dos hóspedes da Demo com o telefone, e **"Cadastrar novo"**.
   - Em "Cadastrar novo" ficam:
     - **Nome \*** ("Nome do hóspede principal");
     - **WhatsApp / Telefone \*** ("(00) 00000-0000"), com máscara;
     - **CPF (Opcional)**;
     - **Cidade (Opcional)**.
4. **Passo 3 de 5 · Valores**
   - "Bica D'Água 02 · 12/12 → 14/12 · 2 diárias".
   - A diária de cada noite: "Sáb · 12/12 fim de semana R$ 580,00" e "Dom · 13/12 fim de semana R$ 580,00", com "Total das diárias R$ 1.160,00".
   - **Desconto (R$)** e **Acréscimo (R$)**.
   - **Canal de Origem:** WhatsApp (já vem marcado), Balcão ou Site.
   - **Status da reserva:** Confirmada ou Pré-reserva (pendente).
5. **Passo 4 de 5 · Sinal**
   - **Sinal (opcional)**, em R$, com o botão "Sem sinal".
   - **Forma de pagamento:** PIX, Dinheiro, Cartão de débito, Cartão de crédito, Transferência ou Outro.
   - Com o sinal preenchido, aparecem "Entra no caixa aberto · hoje, 24/11" e "A reserva nasce confirmada · saldo R$ 580,00".
6. **Passo 5 de 5 · Resumo**
   - "Hóspede: Larissa Campos · novo", "Acomodação: Bica D'Água 02", "Período: 12/12 → 14/12 · 2 adultos".
   - "Diárias · 2 diárias R$ 1.160,00", "Total da reserva R$ 1.160,00", "Sinal · PIX − R$ 580,00", "Saldo R$ 580,00".
   - "Nasce como: Confirmada" e "Sinal entra no caixa aberto · hoje, 24/11".
   - O botão é **"Criar com sinal R$ 580,00"**.
7. **"Reserva Criada!"**
   - "Código da reserva: FHZ-…" (muda a cada vez), o hóspede com o telefone, a acomodação ("Suíte"), "12/12/2026 → 14/12/2026 · 2 diárias" e "Total: R$ 1.160,00 · Sinal: R$ 580,00 via PIX".
   - Os botões: "Ver reserva", "Ver voucher", "Baixar PDF", "Enviar por e-mail", "Ver no calendário" (é preciso rolar a tela) e "Criar outra reserva".
8. **"Ver no calendário"**
   - Abre o Calendário na quinzena de **hoje** (24/11 – 07/12), e não na da reserva. Nessa tela aparecem, ao fundo, o bloqueio "Airbnb" da Bica D'Água 01 e a reserva do Roberto com o conflito do Airbnb (o assunto do episódio 8).
   - Um toque em **"Próximo"** leva a **08/12 – 21/12**, com o cartão "Lari…" na linha da Bica D'Água 02, de 12 a 14/12. A Demo o descreve como "Larissa Campos, confirmada".

### O Hospeda avisa se o período já está ocupado?
**Não há uma mensagem de aviso na Demo.** O que acontece é isto:
- abrindo outra **Nova reserva** para o **mesmo período** (12 a 14/12), a lista passa a dizer **"Livres no período · 9 de 10"**;
- a **Bica D'Água 02, já reservada, não aparece mais**, e não dá para escolhê-la (captura 17).

**No vídeo:** essa cena mostra a lista sem a suíte. A fala diz só o que a tela mostra, que a suíte reservada sai da lista. Não diz que o Hospeda "avisa", nem que "só mostra o que está livre". Hoje, uma data bloqueada pelo Airbnb ou pelo Booking ainda aparece como livre na Nova reserva (ver "Avisos da Demo").

### Bloqueio de canal (REGRAS, "Avisos da Demo")
- **Antes de abrir a Nova reserva,** o script abre o Calendário em **08/12 – 21/12**. Ele para se houver qualquer bloqueio (Airbnb, Booking ou outro), ou qualquer reserva, em qualquer acomodação de 12 a 14/12.
- **Resultado:** a quinzena inteira de 08/12 a 21/12 está **vazia**: nenhum bloqueio de canal e nenhuma reserva (captura 00).
- **Depois de criar,** só aparece "Larissa Campos, confirmada".
- **Datas e acomodação escolhidas:** 12 a 14/12, na Bica D'Água 02. Nenhuma tela da Nova reserva no vídeo mostra outro período.
- **Etapa 2:** a mesma conferência roda antes da captura final, e o vídeo passa por mais uma conferência de que nenhuma data usada tem bloqueio de canal.

### O cronômetro (tempo real, medido na Demo)
O relógio começa no toque no "+" e para quando a reserva aparece no Calendário. Ele conta **só o tempo do fluxo**, sem o tempo gasto salvando as capturas.

O fluxo é feito no **ritmo de uma pessoa**, fixo no script (`RITMO`):
- 0,7 s olhando antes de cada toque;
- digitação letra a letra, a 0,125 s por letra (8 letras por segundo);
- 1,2 s lendo a lista de acomodações, os valores e o resumo;
- 0,6 s rolando a tela até os botões que ficam fora dela.

O resto é o tempo que a própria Demo leva para responder. Rodei três vezes:

| Parcial (s) | 1ª | 2ª | 3ª (a das capturas) |
|---|---|---|---|
| Período confirmado | 4,23 | 4,24 | 4,23 |
| Acomodação (Continuar) | 7,77 | 7,78 | 7,78 |
| Hóspede (Continuar) | 13,99 | 13,98 | 14,00 |
| Valores (Continuar) | 15,92 | 15,91 | 15,93 |
| Sinal (Continuar) | 18,76 | 18,76 | 18,78 |
| Reserva Criada! | 20,73 | 20,70 | 20,73 |
| **Na tela do Calendário** | **23,16** | **23,13** | **23,14** |

**O tempo do vídeo vai sair da captura final da etapa 2,** medido do mesmo jeito.
- O relógio do vídeo corre em **tempo real**: um segundo na tela é um segundo no relógio.
- As telas trocam nos instantes medidos.
- Se o total da captura final sair fora de 23,0 a 23,9 s, o script para, porque a fala diz "vinte e três segundos".

**Para aprovar:** o ritmo acima (0,7 s por toque e 8 letras por segundo). Um ritmo mais lento ou mais rápido muda o número.

### Fica fora do vídeo
- **CPF e Cidade:** são opcionais. No desafio, só o obrigatório (Nome e WhatsApp).
- **Desconto, Acréscimo, Status e Pré-reserva:** ficam como a Demo traz (sem desconto, WhatsApp, Confirmada). A Pré-reserva é o assunto do episódio 7.
- **"Buscar existente":** a aba abre primeiro, com a lista dos hóspedes da Demo e os telefones, e aparece por menos de um segundo, até o toque em "Cadastrar novo". No celular inteiro, o texto fica pequeno demais para ler. Se preferir, a cena pode partir da aba "Cadastrar novo" já aberta.
- **"Ver reserva", "Ver voucher", "Baixar PDF" e "Enviar por e-mail":** aparecem na tela da reserva criada, mas o vídeo não toca neles.

## 2. Estrutura: desafio com cronômetro, em tempo real

**Como é:**
- **O pedido:** a mensagem chega ("Tem vaga de 12 a 14 de dezembro para 2?"), e um **cronômetro grande** entra no alto e começa a correr em "Valendo!".
- **O desafio:** a reserva é lançada **em tempo real**, como foi medida na Demo, sem pausa para explicar. A câmera segue os toques.
- **A barra:** embaixo do cronômetro, uma barra em 7 trechos (Período, Acomodação, Hóspede, Valores, Sinal, Criada, Calendário). Cada trecho acende quando o passo termina, com o **tempo parcial** embaixo dele.
- **O fim:** o cronômetro **para** quando a reserva aparece no Calendário, e o tempo final cresce em limão no centro.
- **Depois:** vem uma volta mais calma, para ler o que ficou feito (o sinal no caixa e a reserva criada), e o teste do mesmo pedido de novo (a suíte sai da lista). Depois, o fecho.

**Por que é diferente dos episódios 2 a 5:**
- **Contra os eps. 2 a 4:** não tem gancho com avatares e bilhete, nem bloco da logo com três selos, nem "Toque em Mais e depois em…", nem o ciclo de cadastro (lista, editar, antes e depois, novo, desativar). Aqui é um fluxo só, do começo ao fim, que cria uma coisa nova.
- **Contra o ep. 5:** não tem perguntas nem selinhos "✓", e a tela não fica parada lendo blocos. O vídeo **atravessa seis telas** (Início, os 5 passos, a reserva criada e o Calendário) contra o relógio.
- **O que só este tem:** o **tempo**. O vídeo é cronometrado, em tempo real, com parciais e um placar final. Antes, nenhum episódio mediu tempo nem correu em tempo real.

## 3. Roteiro

**Título na tela:** "Nova reserva em segundos", com "em segundos" em limão e o selo da série.

**Duração estimada:** cerca de **62 s**. São 8,5 s de pedido, 23,1 s de desafio em tempo real, 3,5 s de tempo final, 6 s de volta calma, 8 s de mesmo pedido e o fecho com a logo.
- A estimativa usa o ritmo real da Alexa no episódio 5 (10,3 letras por segundo).
- Os tempos definitivos saem da locução e da captura final.
- **No desafio, a fala é que se encaixa nos passos medidos:** cada frase começa no passo dela, e o tempo do desafio não muda.

**Tom:** leve e direto, de desafio, para o dono da pousada.

### Narração: tela e legenda (grafia oficial)
1. Chegou pelo WhatsApp: tem vaga de 12 a 14 de dezembro, para 2?
2. Desafio: lançar essa reserva no FAZLO Hospeda. Valendo!
3. Toque no mais e escolha as datas.
4. Escolha a acomodação, já com o total.
5. Hóspede novo: só nome e WhatsApp.
6. Valores conferidos.
7. Sinal no PIX.
8. Criar.
9. E já está no calendário!
10. Vinte e três segundos.
11. O sinal já entra no caixa, e o voucher fica pronto.
12. Pediram a mesma suíte, nas mesmas datas? Ela nem aparece mais na lista.
13. Reserva nova, em segundos.
14. E no começo, a FAZLO configura tudo com você.

### Narração: texto enviado à voz
1. Chegou pelo Uátsap: tem vaga de doze a catorze de dezembro, para dois?
2. Desafio: lançar essa reserva no Fázlo Hospéda. Valendo!
3. Toque no mais e escolha as datas.
4. Escolha a acomodação, já com o total.
5. Hóspede novo: só nome e Uátsap.
6. Valores conferidos.
7. Sinal no Pix.
8. Criar.
9. E já está no calendário!
10. Vinte e três segundos.
11. O sinal já entra no caixa, e o voucher fica pronto.
12. Pediram a mesma suíte, nas mesmas datas? Ela nem aparece mais na lista.
13. Reserva nova, em segundos.
14. E no começo, a Fázlo configura tudo com você.

**Voz:** Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75, seed 7100, numa tomada só, como nos episódios 4 e 5.

**Pronúncia e números:**
- "FAZLO" vai como "Fázlo", "Hospeda" como "Hospéda", "WhatsApp" como "Uátsap" e "PIX" como "Pix".
- Os números só por extenso no texto da voz ("doze a catorze", "dois", "vinte e três segundos"). Na tela e na legenda ficam em algarismos ("12 a 14", "2", "23,1 s").
- **Nenhum valor em dinheiro é falado.** R$ 1.160,00, R$ 580,00 e o resto ficam só nas telas e nas janelas.
- O tempo final é o número medido na Demo: na tela, com um decimal; na fala, os segundos inteiros.

**Legenda:**
- Palavra por palavra, embaixo, com as palavras-chave em limão.
- Fora da legenda ficam a frase 1 (está no balão do pedido), a 10 (o tempo está grande na tela) e o fecho (13 e 14).

**Nota sobre as frases 3 e 7:** "Toque no mais" é o "+" da barra, que o app chama de "Nova reserva". "Sinal no PIX" é a forma escolhida; o valor fica só na tela.

## 4. Linha do tempo (estimada; o desafio usa os tempos medidos)

A linguagem visual é a da série: telas inteiras da Demo, closes nos toques, contornos limão, janelas recortadas da mesma captura e digitação letra a letra (como no ep. 4).

**O que é novo neste episódio:**
- **O cronômetro:** fica no alto (mono, grande), com décimos de segundo e uma barra de 7 trechos embaixo.
- **Os parciais:** cada trecho acende em limão com o tempo parcial embaixo (ex.: "4,2").
- **No desafio, o relógio corre em tempo real** (`t_vídeo − início`), e as telas trocam nos instantes medidos.
- **O tempo final:** no fim, o relógio para, os dígitos ficam limão e crescem até o meio da tela.

**Regras:**
- Nenhuma tela da **Nova reserva** mostra outro período além de 12 a 14/12.
- A quinzena 24/11 – 07/12 do Calendário passa em ~1,5 s, sem close, sem janela e sem fala sobre o bloqueio ou o conflito.

Os tempos do desafio abaixo são os da 3ª rodada (D = início do desafio, ~8,5 s no vídeo).

| Tempo (s) | Frase | Tela (inteira) | O que acontece |
|---|---|---|---|
| 0,0–5,0 | 1 | `inicio` | Desde o quadro 0: o celular com o Início e, por cima, um **balão de mensagem** (genérico, sem marca) com "Tem vaga de 12 a 14 de dezembro para 2?". Embaixo do balão, um selo pequeno "pelo WhatsApp". Em "doze a catorze", "12 a 14" pulsa em limão. |
| 5,0–8,5 | 2 | `inicio` | O balão sobe e encolhe para o canto. Entram o selo da série e "Nova reserva em segundos". Em "Desafio", o **cronômetro** entra no alto em "00,0", com a barra apagada. Em "Valendo!", a barra pisca e o relógio começa. |
| D+0,0–4,2 | 3 | `inicio` → `passo1` → `calendario-nov` → `calendario-dez` → `calendario-12-14` | Toque no "+" (D+0,0); a Nova reserva abre. Toque em "Entrada"; o calendário sobe. Próximo mês, toques no 12 e no 14 (o meio fica limão) e "Confirmar período". **Trecho 1 acende: "4,2".** |
| D+4,2–7,8 | 4 | `livres` → `escolhida` → rolagem → `escolhida-continuar` | Janela rápida com "Livres no período · 10 de 10" e o cartão da Bica D'Água 02, com o "Total do período R$ 1.160,00" (até D+6,2). Toque na Bica D'Água 02. A tela rola até o Continuar, e toque. **Trecho 2: "7,8".** |
| D+7,8–14,0 | 5 | `passo2` → `passo2-novo` → digitação → `passo2-preenchido` | Toque em "Cadastrar novo". "Larissa Campos" digitado letra a letra, depois "(11) 90000-0021". Toque em Continuar. **Trecho 3: "14,0".** |
| D+14,0–15,9 | 6 | `passo3` | Contorno no "Total das diárias R$ 1.160,00" e em "WhatsApp" (canal de origem). Toque em Continuar. **Trecho 4: "15,9".** |
| D+15,9–18,8 | 7 | `passo4` → digitação → `passo4-sinal` | "R$ 580,00" digitado e toque em "PIX"; aparece "Entra no caixa aberto". Toque em Continuar. **Trecho 5: "18,8".** |
| D+18,8–20,7 | 8 | `passo5` → `criada` | O resumo e toque em "Criar com sinal R$ 580,00". "Reserva Criada!". **Trecho 6: "20,7".** |
| D+20,7–23,1 | 9 | `criada` → rolagem → `calendario-hoje` → `calendario-dez` | A tela rola até "Ver no calendário", e toque. A quinzena de hoje passa rápido. Toque em "Próximo": 08/12 – 21/12, com o cartão "Lari…" na Bica D'Água 02. **O relógio para: "23,1".** |
| ~31,6–35,0 | 10 | `calendario-dez` | Os dígitos ficam limão e crescem até o meio: **"23,1 s"**. Contorno limão no cartão da Larissa no calendário, e a barra inteira acesa com os 7 parciais. |
| ~35,0–41,0 | 11 | `criada` (página inteira) | Volta calma: janela com o "Financeiro: Total R$ 1.160,00 · Sinal R$ 580,00 via PIX" em "sinal" e contorno no "Ver voucher" em "voucher". |
| ~41,0–49,0 | 12 | `ocupada` | Toque no "+" e o mesmo período de novo. Janela com "Livres no período · 9 de 10" e a lista sem a Bica D'Água 02: a Bica D'Água 01 vem logo antes da 03, com um contorno âmbar no espaço entre elas. O cronômetro não volta. |
| ~49,0–58,5 | 13–14 | **Fecho** | "Reserva nova, / em segundos." com "em segundos" em limão. A logo do FAZLO Hospeda estoura, com "E no começo, a FAZLO configura tudo com você." em limão. |
| ~58,5–62,0 | — | **Logo** | @fazlohospeda e a trilha resolve. |

## 5. Dados e telas

| No vídeo | Dado |
|---|---|
| Pedido | "Tem vaga de 12 a 14 de dezembro para 2?" (balão ilustrativo, não é tela do app) |
| Período | 12/12/2026 → 14/12/2026, 2 diárias, 2 adultos |
| Acomodação | Bica D'Água 02 (Suíte · até 2 pessoas), total R$ 1.160,00 (2 × R$ 580,00, fim de semana) |
| Hóspede novo | **Larissa Campos**, (11) 90000-0021 (no padrão fictício da Demo, 90000-00xx); sem CPF e sem cidade |
| Sinal | R$ 580,00, PIX ("Entra no caixa aberto · hoje, 24/11") |

Não aparece nenhum e-mail, senha, código de autenticador, token ou link iCal. O "Código da reserva" é o número da reserva criada.

**Telas a capturar na etapa 2 (Demo recarregada, 1170×2532):**
- as mesmas da folha, no mesmo fluxo cronometrado;
- antes de cada uma, a conferência de texto proibido;
- antes de tudo, a conferência do canal em 08/12 – 21/12;
- o tempo de cada troca de tela fica gravado para o vídeo.

**Ficam escondidos:** o selo "Demonstração", a data do cabeçalho e "Quero usar".

## 6. Capa (etapa 2)
- **Padrão da série:** o celular com a tela "Reserva Criada!", sem número de episódio.
- **Um único destaque saltando:** o tempo final num chip de cronômetro ("23,1 s") ou o cartão do resumo com "Criar com sinal". Sugiro o **resumo**, porque mostra a reserva inteira.
- **Título:** "Nova reserva / em segundos", com "em segundos" em limão, e o selo da série.

## 7. Fecho
A logo do FAZLO Hospeda estoura em limão, sem nada encostando nela, com @fazlohospeda embaixo. A trilha resolve no último tempo, como nos episódios anteriores.

## 8. Etapa 2: o que ficou no vídeo

### A captura final, cronometrada (`scripts/capturar.cjs`, 25/11/2026)
O ritmo é o aprovado: 0,7 s antes de cada toque, 8 letras por segundo, 1,2 s de leitura e 0,6 s de rolagem. O relógio conta só o tempo do fluxo.

**Total:** **23,55 s**, dentro da faixa de 23,0 a 23,9 s.
- A captura final é 0,4 s mais lenta que o levantamento.
- O motivo são as medições dos toques e duas esperas curtas que o script de captura faz dentro do fluxo.

| Parcial | Período | Acomodação | Hóspede | Valores | Sinal | Criada | Calendário |
|---|---|---|---|---|---|---|---|
| s | 4,45 | 8,01 | 14,34 | 16,28 | 19,16 | 21,12 | **23,55** |

**O cronômetro na tela:**
- mostra o relógio com um decimal: o total aparece como **23,5 s**, e cada trecho da barra, com o parcial medido;
- no vídeo, o desafio vai de **10,55 s a 34,10 s**: 1 s de vídeo é 1 s de relógio, e as telas trocam nos instantes medidos;
- `scripts/conferir.cjs` confere, quadro a quadro, que o relógio é exatamente o tempo do vídeo menos o início do desafio, e que ele para no total.

**Ajustes aprovados, como ficaram:**
1. **Voz:** "Em menos de meio minuto." O número exato fica só no cronômetro.
2. **Calendário:**
   - Depois do toque em "Ver no calendário", a tela da reserva criada fica parada até o instante em que a quinzena da reserva (08/12 – 21/12) entra de lado.
   - Ela fica inteira no instante em que o relógio para: 23,55 s, o momento em que a reserva apareceu na quinzena certa.
   - A quinzena de hoje, com o bloqueio do Airbnb e o conflito, **não foi capturada**. O relógio conta o trecho real, que inclui o toque em "Próximo".
3. **Hóspede:** a cena entra direto em "Cadastrar novo", e a lista "Buscar existente" não foi capturada. O relógio conta o toque real na aba (0,75 s).

### Voz e montagem
- **Voz:** Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75, seed 7100, numa tomada só, com 40,0 s de fala.
  - Pela transcrição (ElevenLabs, speech-to-text), "WhatsApp", "Pix", "voucher" e os números saem certos.
- **Montagem** (`scripts/linha.py`): a voz é cortada no meio do silêncio entre as frases, e nenhuma palavra é cortada nem acelerada.
  - No desafio, cada frase começa no passo medido. "Toque no mais" começa 0,08 s depois do alvo, e as outras exatamente no alvo.
  - Depois do desafio, as pausas foram alongadas para dar tempo de ler o tempo final, a volta calma e a lista sem a suíte.
  - **Resultado:** 61,6 s.

| Tempo (s) | O que acontece |
|---|---|
| 0,0–5,9 | O balão do pedido ("pelo WhatsApp"); "12 a 14" acende em limão (2,1). |
| 5,9–10,5 | Selo da série e "Nova reserva em segundos"; o cronômetro entra em "00,0" e pisca em "Valendo!". |
| 10,55–34,10 | **O desafio, em tempo real**, como na tabela acima. Janelas rápidas na lista de livres e no resumo; contornos no período, no total, no canal (WhatsApp) e em "Entra no caixa aberto"; digitação letra a letra do nome, do telefone e do sinal. |
| 34,1–37,0 | O relógio para em **23,5 s**, os dígitos ficam limão e crescem até o meio; contorno no cartão "Lari…" da Bica D'Água 02. |
| 39,1–43,7 | Volta calma, na tela da reserva criada: o cartão com o "Financeiro" (Sinal R$ 580,00 via PIX) e o contorno em "Ver voucher". |
| 44,0–51,4 | Toque no "+" e o mesmo período: janela âmbar com "Livres no período · 9 de 10" e a Bica D'Água 01 seguida da 03. |
| 51,4–61,6 | "Reserva nova, em segundos." A logo estoura, com "E no começo, a FAZLO configura tudo com você." e @fazlohospeda. |

## 9. Correções de 25/11/2026 (pedidas pelo Willian)
- **Pergunta do começo:** na voz, agora é "Chegou pelo WhatsApp: Oi! Tem vaga de doze a catorze de Dezembro? Pra dois?".
  - A pergunta é uma tomada à parte (seed 7101), escolhida entre 3 por subir mais no fim (+11,1 semitons). As 3 estão em `audio/pergunta/`.
  - O resto da locução não mudou.
- **Mês:** "Dezembro", com inicial maiúscula, no balão (regra nova da série).
- **Fecho:** sem "E no começo, a FAZLO configura tudo com você." Fica só a logo e @fazlohospeda (regra nova da série).
- **Tempos novos:** o desafio vai de 11,51 a 35,06 s, e a duração é de 58,5 s. A tabela da seção 8 vale com +0,96 s até o fim do desafio. Depois dele, o vídeo termina em "Reserva nova, em segundos." (52,7–54,9 s), seguido da logo.
