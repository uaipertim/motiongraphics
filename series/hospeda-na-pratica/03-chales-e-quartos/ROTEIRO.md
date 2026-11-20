# Episódio 3: Chalés e quartos (roteiro para aprovação)

**Status:** só planejamento. Não gerei voz, não renderizei e não criei composição. Segue as [regras da série](../REGRAS.md). Vai ao ar na quarta, 25/11, às 19h ([programação](../PROGRAMACAO.md)).

## 1. Levantamento da tela (Demo, 20/11/2026)

A área existe e funciona na Demo, no celular a 390×844. Tudo abaixo foi tocado e lido na própria Demo; os textos estão exatamente como aparecem. Os prints estão em [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg).

### Caminho (cada toque)
1. **Início** → toque em **Mais** (barra de baixo, à direita).
2. No menu, na seção **Cadastros** (com "Hóspedes" e "Produtos e serviços"), toque em **Acomodações**.

### A lista
- **Título e contagem:** "Acomodações", e embaixo "10 ativas".
- **Botão:** "+ Nova acomodação" (preto, na largura inteira).
- **Filtros:** "Todas 11", "Ativas 10" e "Inativas 1".
- **Um cartão por acomodação:**
  - o nome;
  - "categoria · até N pessoas" (ex.: "Suíte · até 2 pessoas");
  - o estado no canto: "Ativa" (preto com ponto limão), "Bloqueada" (âmbar, com cadeado) ou "Inativa" (contorno cinza);
  - três valores lado a lado: "Semana", "Fim de semana" e "Feriado";
  - os botões:
    - **Ativa:** "Editar", "Bloquear" e "Desativar";
    - **Bloqueada:** "Editar", "Liberar" e "Desativar";
    - **Inativa:** "Editar" e "Reativar".
- **Rodapé:** "Desativar tira a acomodação de novas reservas. Reservas e histórico existentes continuam. Nunca exclui."
- **As 11 acomodações da Demo:**

  | Nome | Tipo · capacidade | Semana | Fim de semana | Feriado | Estado |
  |---|---|---|---|---|---|
  | Bica D’Água 01 | Suíte · até 2 | R$ 480,00 | R$ 580,00 | R$ 680,00 | Ativa |
  | Bica D’Água 02 | Suíte · até 2 | R$ 480,00 | R$ 580,00 | R$ 680,00 | Ativa |
  | Bica D’Água 03 | Suíte · até 3 | R$ 480,00 | R$ 580,00 | R$ 680,00 | Ativa |
  | Bica D’Água 04 | Suíte · até 2 | R$ 480,00 | R$ 580,00 | R$ 680,00 | Ativa |
  | Chalé de Pedra 05 | Chalé · até 6 | R$ 620,00 | R$ 720,00 | R$ 850,00 | Ativa |
  | Chalé de Pedra 06 | Chalé · até 6 | R$ 620,00 | R$ 720,00 | R$ 850,00 | Ativa |
  | Chalé de Pedra 07 | Chalé · até 6 | R$ 620,00 | R$ 720,00 | R$ 850,00 | Bloqueada |
  | Ipê 08 | Quarto · até 2 | R$ 450,00 | R$ 520,00 | R$ 600,00 | Ativa |
  | Ipê 09 | Quarto · até 2 | R$ 450,00 | R$ 520,00 | R$ 600,00 | Ativa |
  | Chalé Serra 01 | Chalé · até 3 | R$ 350,00 | R$ 450,00 | R$ 550,00 | Ativa |
  | Pedra 06 | Chalé · até 2 | R$ 320,00 | R$ 420,00 | R$ 520,00 | Inativa |

### Editar (painel em tela cheia)
- **Título:** "Editar acomodação", e o nome embaixo.
- **Campos:**
  - **Nome:** com o exemplo "Ex.: Chalé Jabuticaba".
  - **Categoria:** uma lista com Chalé, Quarto, Suíte, Apartamento, Cabana e Outro.
  - **Descrição (opcional):** com o exemplo "Ex.: varanda com rede, vista para a serra".
  - **Capacidade:** um número, seguido de "pessoas".
  - **"Tarifa de semana"**, **"Tarifa de fim de semana"** e **"Tarifa de feriado/período especial"**, em reais.
    - Digitando "550", o campo mostra "R$ 550,00" ao sair dele.
- **Aviso:** "As três tarifas são obrigatórias. Sem elas, a Nova reserva bloqueia e diz qual falta."
- **Botões:** "Salvar acomodação" e "Cancelar" (ou o X).
- **Depois de salvar:** o aviso "Acomodação atualizada com sucesso." e o valor novo no cartão.

### Nova acomodação
- **Título:** "Nova acomodação", com o subtítulo "Nome, capacidade e as três tarifas."
- **Campos e aviso:** os mesmos de Editar.
- **Ao abrir, na Demo:**
  - categoria "Chalé" e capacidade 2;
  - tarifas já preenchidas com R$ 350,00, R$ 450,00 e R$ 550,00;
  - "Salvar acomodação" cinza até ter um nome.
- **Depois de salvar:**
  - o aviso "Acomodação "Chalé Jabuticaba" cadastrada com tarifas por período.";
  - "Todas 12" e "10 ativas";
  - o cartão novo, "Ativa".

### Bloquear (painel que sobe de baixo)
- **Título:** "Bloquear Bica D’Água 02".
- **Texto:** "As duas datas fazem parte do bloqueio. Reservas existentes não mudam."
- **Campos:**
  - **"Início" e "Fim":** dd/mm/aaaa.
  - **"Motivo do bloqueio":** com o exemplo "Ex.: pintura, troca de encanamento ou infiltração."
- **Botões:** "Bloquear" e "Voltar".
- **Ao tocar numa data:** abre o painel "Escolher o período".
  - Mostra o calendário do mês ("Novembro de 2026"), o botão "Hoje" e as setas.
  - Embaixo aparece o período, por exemplo "26/11 → 28/11", e o botão "Confirmar período".
- **Depois:**
  - o aviso "Bica D’Água 02 bloqueada no período informado.";
  - o cartão com o estado "Bloqueada" e o botão "Liberar".
- **Liberar:** não tem confirmação. Aparece o aviso "Chalé de Pedra 07 liberada com sucesso e disponível para reservas." e o cartão volta a "Ativa".

### Desativar e reativar
- **Confirmação:** "Desativar Chalé Serra 01?", com "Chalé · até 3 pessoas".
  - Aviso âmbar: "Chalé Serra 01 tem 1 reserva futura. Ela continua valendo; a acomodação só deixa de aceitar reservas novas."
  - Texto: "O histórico continua. Dá para reativar quando quiser; acomodação nunca é excluída."
  - Botões: "Desativar" e "Voltar".
- **Com hóspede hospedado** (Ipê 09): aparece "Esta acomodação tem hóspede hospedado. Faça o check-out antes de desativar." e o botão "Desativar" fica cinza.
- **Depois de desativar:**
  - o aviso "Acomodação "Chalé Serra 01" desativada com sucesso.";
  - o cartão "Inativa", com "Editar" e "Reativar";
  - "9 ativas", "Ativas 9" e "Inativas 2".
- **Reativar:** não tem confirmação. Aparece o aviso "Acomodação "Pedra 06" ativada com sucesso.".

### Quem acessa esta área (só pelo que o app mostra)
Pelas descrições dos papéis em Usuários (episódio 2):
- **Administrador:** "Tudo da pousada, inclusive acomodações…"
- **Operação:** "…Sem acomodações, usuários nem configurações."
- **Caixa:** a descrição não fala de acomodações.

O vídeo não diz quem acessa.

### Conferência de texto
Nesta área não aparece:
- e-mail;
- senha, código ou token;
- link de calendário iCal.

Só os mesmos elementos da demonstração do episódio 2 precisam sumir: o selo "Demonstração" (também no menu), a data do cabeçalho, "Quero usar" e "Quero usar na minha pousada". Os nomes das acomodações e os valores são dados fictícios da Demo.

## 2. Pontos para você decidir antes da produção

1. **Defeito na Demo: a capacidade no Editar.** O formulário "Editar" abre com uma capacidade diferente da lista em 5 das 11 acomodações. Ao salvar, o número do formulário substitui o da lista (prints 4 e 5 da folha).

   | Acomodação | Lista | Formulário |
   |---|---|---|
   | Bica D’Água 03 | 3 | 2 |
   | Chalé de Pedra 05 | 6 | 4 |
   | Chalé de Pedra 06 | 6 | 4 |
   | Chalé de Pedra 07 | 6 | 4 |
   | Chalé Serra 01 | 3 | 2 |

   - **No vídeo:** a edição usa o **Ipê 08**, que tem 2 na lista e 2 no formulário, então nada muda sozinho.
   - **Para a equipe do app:** vale investigar, como no caso da Bica D’Água 01.
2. **"Bloqueada" antes do período.** Bloqueei a Bica D’Água 02 de 26 a 28/11, com a Demo no dia 20/11, e o cartão já ficou "Bloqueada" na hora. A contagem continuou em "10 ativas".
   - **No vídeo:** a narração não fala de quando o bloqueio começa. Só diz "bloqueie as datas e anote o motivo".
   - **Para confirmar:** se esse é o comportamento esperado.
3. **"A FAZLO cadastra as acomodações para você?"** Não afirmei isso. Se o Willian confirmar, dá para trocar a última frase. Sugestão: "E no começo, a FAZLO configura tudo com você."
4. **A recepção vê os valores na Nova reserva?** Pelo papel, quem é "Operação" não acessa esta área. Por isso o fecho não diz que "a recepção vê os valores aqui".
   - **O que o app garante:** o aviso de que, sem as três tarifas, a Nova reserva bloqueia (frase 9).
   - **Se quiser mostrar o valor calculado na reserva:** preciso de um print da Nova reserva com o total, ou fica para o episódio 6.
5. **Valores da acomodação nova.** A Nova acomodação já abre com R$ 350,00, R$ 450,00 e R$ 550,00 na Demo. No vídeo, os três valores são digitados por cima.

## 3. Roteiro

**Título na tela:** "Chalés e quartos", com o selo da série "FAZLO Hospeda na prática".

**Duração:** cerca de **73 s**: 69 s de fala com as pausas de leitura, mais 3,6 s do fecho com a logo.
- A estimativa usa o ritmo real da Alexa no episódio 2, de 10,4 letras por segundo.
- Os tempos definitivos saem da locução.

**Tom:** leve e direto, para o dono da pousada.
- **Dor:** o valor e a capacidade de cada chalé guardados na cabeça, e a recepção sem saber o que vale para cada um.
- **Solução:** tudo cadastrado no Hospeda, fácil de ajustar.

### Narração: tela e legenda (grafia oficial)
1. O valor de cada chalé ainda mora na sua cabeça?
2. Aí a recepção não sabe quanto cobrar, nem quantas pessoas cabem em cada um.
3. No FAZLO Hospeda, cada chalé e cada quarto fica cadastrado, com tipo, capacidade e valores.
4. Toque em Mais e depois em Acomodações.
5. Cada um mostra o tipo, quantas pessoas cabem e três valores: semana, fim de semana e feriado.
6. Mudou o preço? Toque em Editar, ajuste o valor e salve.
7. Pronto: a lista já mostra o valor novo.
8. Chalé novo? Toque em Nova acomodação e preencha nome, tipo, capacidade e as três tarifas.
9. Sem as três tarifas, a Nova reserva bloqueia e diz qual falta.
10. Chalé em obra? Bloqueie as datas e anote o motivo.
11. Deixou de alugar? Desative: ele sai das reservas novas, e o que já existe continua.
12. Tudo cadastrado no Hospeda, e fácil de ajustar quando precisar.

### Narração: texto enviado à voz
1. O valor de cada chalé ainda mora na sua cabeça?
2. Aí a recepção não sabe quanto cobrar, nem quantas pessoas cabem em cada um.
3. No Fázlo Hospéda, cada chalé e cada quarto fica cadastrado, com tipo, capacidade e valores.
4. Toque em Mais e depois em Acomodações.
5. Cada um mostra o tipo, quantas pessoas cabem e três valores: semana, fim de semana e feriado.
6. Mudou o preço? Toque em Editar, ajuste o valor e salve.
7. Pronto: a lista já mostra o valor novo.
8. Chalé novo? Toque em Nova acomodação e preencha nome, tipo, capacidade e as três tarifas.
9. Sem as três tarifas, a Nova reserva bloqueia e diz qual falta.
10. Chalé em obra? Bloqueie as datas e anote o motivo.
11. Deixou de alugar? Desative: ele sai das reservas novas, e o que já existe continua.
12. Tudo cadastrado no Hospéda, e fácil de ajustar quando precisar.

**Pronúncia:**
- "FAZLO" vai como "Fázlo" e "Hospeda" como "Hospéda".
- Esta narração não fala números nem valores: os valores ficam só na tela.

## 4. Linha do tempo (estimada)

As telas são sempre a tela inteira do celular, e os destaques seguem o episódio 2: contorno limão, onda no toque, janela recortada da mesma captura e estado trocando no lugar. Nos enquadramentos há mais variação que no episódio 2:
- **Close no toque:** a câmera chega a 2× no ponto onde o dedo vai tocar, sempre por pouco tempo, e abre de novo para ler.
- **Dois celulares lado a lado:** no antes e depois das frases 7 e 11, com "Antes" e "Depois" em mono acima de cada um.
- **A tela não sai do palco:** a legenda fica sempre na faixa de baixo, como no episódio 2.

| Tempo (s) | Frase | Tela (inteira) | Toque e navegação | Janela que salta | Estado que muda | Texto em destaque | Transição |
|---|---|---|---|---|---|---|---|
| 0,0–4,1 | 1 | **Sem tela (gancho).** | — | — | No alto, desde o quadro 0 (miniatura): "O valor de cada chalé / ainda mora / na sua cabeça?". Embaixo, um caderno com três chalés riscados e reescritos ("Chalé 5 – R$ 6__?"). | "na sua cabeça?" em âmbar | Entra com impacto. |
| 4,1–10,4 | 2 | **Sem tela.** | — | — | O avatar "Recepção" com dois balões âmbar, "R$ ?" e "? pessoas". O caderno treme. | "quanto cobrar", "quantas pessoas" | O caderno se fecha. |
| 10,4–18,0 | 3 | **Marca.** | — | — | Selo da série, e o logo estoura em limão. Entra o título "Chalés e quartos". Embaixo, três selinhos "Chalé", "Quarto" e "Suíte", todos com margem livre do logo. | "cadastrado" | O celular entra girando. |
| 18,0–21,7 | 4 | `inicio` → `menu-mais` | **Close 2×** na barra e toque em **Mais**. O menu abre, close em **Cadastros → Acomodações** e toque. | — | Início → menu → Acomodações | "Mais", "Acomodações" | Fusão no toque. |
| 21,7–29,6 | 5 | `acomodacoes` | A câmera desce pelo cartão da Bica D’Água 01. | Saltam em sequência: "Suíte · até 2 pessoas" e depois a fileira "Semana / Fim de semana / Feriado". | Contornos em "Semana", "Fim de semana" e "Feriado", um em cada palavra falada. | "tipo", "pessoas", "semana", "fim de semana", "feriado" | — |
| 29,6–34,7 | 6 | `acomodacoes-ipe08` → `editar-ipe08` → `editar-ipe08-550` | A lista rola até o **Ipê 08**. Close no **Editar** e toque, e o painel sobe. Toque em "Tarifa de fim de semana" e digitação de "550", que vira "R$ 550,00". Toque em **Salvar acomodação**. | — | "R$ 520,00" vira "R$ 550,00" no campo. | "Editar", "salve" | O painel sobe e desce. |
| 34,7–38,4 | 7 | **Dois celulares:** `acomodacoes-ipe08` (Antes) e `acomodacoes-ipe08-550` (Depois) | — | O aviso "Acomodação atualizada com sucesso." salta sobre o celular da direita. | Contorno limão em "R$ 520,00" (antes) e em "R$ 550,00" (depois). | "valor novo" | Os dois celulares se separam do centro; depois o "Antes" sai. |
| 38,4–46,0 | 8 | `acomodacoes` → `nova` → `nova-preenchida` | Close no **+ Nova acomodação** e toque, e o painel sobe. Digitação de "Chalé Jabuticaba". A Categoria fica "Chalé". A capacidade vira "4". Os valores são digitados: R$ 420,00, R$ 520,00 e R$ 620,00. | — | Os campos se preenchem e "Salvar acomodação" fica preto. | "nome", "tipo", "capacidade", "três tarifas" | — |
| 46,0–51,9 | 9 | `nova-preenchida` | Toque em **Salvar acomodação** no fim da frase. | O aviso do próprio formulário salta: "As três tarifas são obrigatórias. Sem elas, a Nova reserva bloqueia e diz qual falta." | O painel desce. O aviso "…cadastrada com tarifas por período." aparece e o cartão do Chalé Jabuticaba fica "Ativa" (`acomodacoes-jabuticaba`). | "três tarifas", "bloqueia" | O painel desce. |
| 51,9–56,7 | 10 | `acomodacoes-pedra06` → `bloquear-pedra06` → `bloquear-periodo` → `bloquear-pedra06-preenchido` → `acomodacoes-pedra06-bloqueada` | Close no **Bloquear** do Chalé de Pedra 06 e toque. Toque em Início, e no calendário toques no 26 e no 28 e em "Confirmar período". Digitação de "Pintura da varanda". Toque em **Bloquear**. | — | O cartão fica "Bloqueada" (âmbar) e o botão vira "Liberar". | "obra", "datas", "motivo" | O painel sobe e desce. |
| 56,7–64,1 | 11 | `acomodacoes-serra01` → `desativar-serra01` → **dois celulares:** `acomodacoes-serra01` (Antes) e `acomodacoes-serra01-inativa` (Depois) | Close no **Desativar** do Chalé Serra 01 e toque, e a confirmação sobe. | O aviso âmbar salta: "Chalé Serra 01 tem 1 reserva futura. Ela continua valendo; a acomodação só deixa de aceitar reservas novas." | Toque em **Desativar**. Lado a lado: "Ativa" e "10 ativas" antes, "Inativa" e "9 ativas" depois. | "reservas novas", "continua" | Os dois celulares se separam do centro. |
| 64,1–69,1 | 12 | **Fecho.** | — | — | O logo FAZLO Hospeda estoura em limão, sem nada encostando. | "Tudo cadastrado no Hospeda," e "fácil de ajustar quando precisar." (em limão) | O celular sai. |
| 69,1–72,7 | — | **Logo.** | — | — | — | O logo e @fazlohospeda. A trilha resolve. | — |

**Ritmo:**
- Cada tela fica de 2,5 a 7 s.
- As pausas maiores ficam onde há digitação ou painel (frases 6, 8, 9 e 11).
- Depois da locução, se o vídeo ficar abaixo de 60 s ou alguma ação ficar corrida, alongo só as pausas, como no episódio 2.

## 5. Dados fictícios e telas

**Dados:** os nomes e valores da Demo (tabela acima), mais os criados no vídeo:

| No vídeo | Dado |
|---|---|
| Valor editado | Ipê 08 (Quarto · até 2 pessoas): fim de semana de R$ 520,00 para **R$ 550,00** |
| Acomodação nova | **Chalé Jabuticaba**, o nome do próprio exemplo do app. Chalé · 4 pessoas · R$ 420,00 / R$ 520,00 / R$ 620,00 |
| Bloqueio | **Chalé de Pedra 06**, de 26/11 a 28/11, motivo "Pintura da varanda" |
| Desativada | **Chalé Serra 01**, que tem 1 reserva futura |

Os nomes das pousadas não aparecem nesta área. Também não aparece nenhum e-mail, senha, código, token ou link iCal.

**Telas a capturar (Demo, 1170×2532):** a captura é como no episódio 2, com a conferência do texto da página e o OCR antes de salvar.

| Etapa | Telas |
|---|---|
| Caminho | `inicio`, `menu-mais` |
| Lista | `acomodacoes` (topo), `acomodacoes-ipe08` (rolada até o Ipê 08) |
| Editar | `editar-ipe08`, `editar-ipe08-550`, `acomodacoes-ipe08-550-topo` (com o aviso), `acomodacoes-ipe08-550` (o cartão) |
| Nova | `nova`, `nova-preenchida`, `acomodacoes-jabuticaba-topo` (com o aviso), `acomodacoes-jabuticaba` (o cartão) |
| Bloquear | `acomodacoes-pedra06`, `bloquear-pedra06`, `bloquear-periodo`, `bloquear-pedra06-preenchido`, `acomodacoes-pedra06-bloqueada` |
| Desativar | `acomodacoes-serra01`, `desativar-serra01`, `acomodacoes-serra01-inativa` |

**Ficam escondidos:** o selo "Demonstração" (também no menu), a data do cabeçalho, "Quero usar" e "Quero usar na minha pousada".

## 6. Fecho
O logo do FAZLO Hospeda estoura em limão, sem nenhum elemento encostando nele, com @fazlohospeda embaixo. A trilha resolve no último tempo, como nos episódios anteriores.
