# Episódio 3: Chalés e quartos (roteiro aprovado com ajustes em 20/11/2026)

**Status:** roteiro aprovado com ajustes em 20/11/2026. Narrado e renderizado como **primeira prévia** (72,1 s), para aprovação; ver o [README](README.md). Segue as [regras da série](../REGRAS.md). Vai ao ar na quarta, 25/11, às 19h ([programação](../PROGRAMACAO.md)).

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

## 2. Decisões e verificação (20/11/2026)

1. **O "750" do print 4 não é defeito.**
   - **Verificação:** com a Demo recarregada e sem digitar nada (Mais → Acomodações → Editar no Chalé de Pedra 05), o campo "Tarifa de fim de semana" abre com **R$ 720,00**, igual à lista ([`aprovacao/verificacao-750.png`](aprovacao/verificacao-750.png)).
   - **Origem:** o R$ 750,00 do print 4 foi digitado por mim no teste de 20/11, antes do print. A legenda da folha foi corrigida.
   - **Continua valendo:** nessa mesma verificação, a **capacidade** do Chalé de Pedra 05 abre com 4, e a lista diz 6. Ninguém digitou nada.
2. **Capacidade no Editar.** O vídeo edita o Ipê 08, em que a capacidade do formulário bate com a da lista (2 e 2).
3. **Selo "Bloqueada".** Tem um defeito no app: ignora as datas do bloqueio. Por isso:
   - **Liberar antes de capturar:** o Chalé de Pedra 07 foi liberado antes das capturas.
   - **Na captura:** nenhuma tela foi salva com um "Bloqueada" visível. O script confere isso em cada uma (`telas/conferencia.json`).
   - **No bloqueio do Chalé de Pedra 06:** o vídeo mostra só o aviso "Chalé de Pedra 06 bloqueada no período informado.", saltando numa janela. O cartão bloqueado e o botão "Liberar" não aparecem.
4. **Frase 9 cortada.** A frase "Sem as três tarifas…" e a cena dela saíram. O toque em "Salvar acomodação" do Chalé Jabuticaba e o aviso "…cadastrada com tarifas por período." fecham a frase 8.
5. **Fecho aprovado.** As duas últimas frases ficam: "Tudo cadastrado no Hospeda, e fácil de ajustar quando precisar. E no começo, a FAZLO configura tudo com você." Na tela, "a FAZLO configura tudo com você." fica em limão.

## 3. Roteiro

**Título na tela:** "Chalés e quartos", com o selo da série "FAZLO Hospeda na prática".

**Duração:** **72,1 s**, pela locução real: a voz vai de 0,3 a 68,5 s, e o fecho com a logo segue até 72,1 s.

### Narração: tela e legenda (grafia oficial)
1. O valor de cada chalé ainda mora na sua cabeça?
2. Aí a recepção não sabe quanto cobrar, nem quantas pessoas cabem em cada um.
3. No FAZLO Hospeda, cada chalé e cada quarto fica cadastrado, com tipo, capacidade e valores.
4. Toque em Mais e depois em Acomodações.
5. Cada um mostra o tipo, quantas pessoas cabem e três valores: semana, fim de semana e feriado.
6. Mudou o preço? Toque em Editar, ajuste o valor e salve.
7. Pronto: a lista já mostra o valor novo.
8. Chalé novo? Toque em Nova acomodação e preencha nome, tipo, capacidade e as três tarifas.
9. Chalé em obra? Bloqueie as datas e anote o motivo.
10. Deixou de alugar? Desative: ele sai das reservas novas, e o que já existe continua.
11. Tudo cadastrado no Hospeda, e fácil de ajustar quando precisar.
12. E no começo, a FAZLO configura tudo com você.

### Narração: texto enviado à voz
É o mesmo texto, com "Fázlo" e "Hospéda" no lugar de "FAZLO" e "Hospeda" nas frases 3, 11 e 12. A voz não fala nenhum valor: os valores ficam só na tela.

## 4. Linha do tempo (tempos reais da locução)

- **Câmera:**
  - aproxima a **2×** em cada ponto de toque e depois abre para ler;
  - nos antes e depois, mostra **dois celulares lado a lado**, que saem juntos do centro e se separam, com "Antes" e "Depois" em cima.
- **Destaques:** contorno limão (âmbar no "Inativo"), onda no toque e janelas recortadas da mesma captura.
- **Estados:** os painéis sobem; a digitação revela o texto da própria captura, letra a letra.

| Tempo (s) | Frase | Tela (inteira) | O que acontece (s) |
|---|---|---|---|
| 0,0–3,5 | 1 | **Sem tela (gancho).** | Desde o quadro 0 (miniatura): "O valor de cada / chalé ainda mora / na sua cabeça?", com "na sua cabeça?" em âmbar. Aparecem o caderno de preços rabiscado ("Chalé 5 — R$ 6__?", "cabem 2? 3?") e o avatar "Recepção". |
| 3,5–8,6 | 2 | **Sem tela.** | Em "quanto cobrar" (5,1), salta o balão âmbar "R$ ?" e o caderno treme. Em "quantas pessoas" (6,5), salta o balão "? pessoas". O caderno se fecha entre 7,9 e 8,3. |
| 8,6–16,5 | 3 | **Marca.** | Selo da série. O logo estoura em "FAZLO" (8,9) e o título "Chalés e quartos" entra (9,4). Em "cadastrado" (12,3), entram os selos "Chalé", "Quarto" e "Suíte", que pulsam em "tipo", "capacidade" e "valores". Nada encosta no logo: a menor distância é de 265 px. |
| 16,5–18,9 | 4 | `inicio` → `menu-mais` | Close na barra e toque em **Mais** (17,2); o menu abre (17,3). Close em **Acomodações**, com contorno (18,0) e toque (18,5). |
| 18,9–27,6 | 5 | `acomodacoes` | Close no cartão da Bica D’Água 01. "Suíte · até 2 pessoas" salta (21,2 a 23,0), depois a fileira Semana, Fim de semana e Feriado (23,3 a 24,5). Contornos em "semana" (24,6), "fim de semana" (25,4) e "feriado" (26,5). |
| 27,6–34,0 | 6 | `acomodacoes-ipe08` → `editar-ipe08` → `editar-ipe08-550` → `acomodacoes-ipe08-550-topo` | Contorno no "Fim de semana R$ 520,00" do Ipê 08 em "preço" (28,5). Close no **Editar** e toque (30,0); o painel sobe. Toque no campo e "R$ 550,00" digitado (31,1 a 31,7). Close e toque em **Salvar acomodação** (31,8). O aviso "Acomodação atualizada com sucesso." salta (32,2 a 33,5). |
| 34,0–37,0 | 7 | **Dois celulares:** `acomodacoes-ipe08` (Antes) e `acomodacoes-ipe08-550` (Depois) | Contorno no R$ 520,00 de antes (34,4) e no R$ 550,00 de depois, em "valor novo" (35,3). |
| 37,0–45,8 | 8 | `acomodacoes-ipe08-550-topo` → `nova` → `nova-preenchida` → `acomodacoes-jabuticaba-topo` | Close no **+ Nova acomodação** e toque (38,4); o painel sobe. "Chalé Jabuticaba" digitado (40,0 a 40,8). Contorno na Categoria "Chalé" em "tipo" (41,1). Capacidade "4" (41,4). As três tarifas digitadas: R$ 420,00, R$ 520,00 e R$ 620,00 (41,8 a 43,1). Close e toque em **Salvar acomodação** (43,5). O aviso "Acomodação "Chalé Jabuticaba" cadastrada com tarifas por período." salta (43,9 a 45,3). |
| 45,8–53,9 | 9 | `acomodacoes-pedra06` → `bloquear-pedra06` → `bloquear-periodo` → `-26` → `-26-28` → `bloquear-pedra06-datas` → `bloquear-pedra06-preenchido` → `acomodacoes-pedra06-aviso` | **8,4 s de tela.** Close no **Bloquear** do Chalé de Pedra 06 e toque (47,1); o painel sobe. Toque em Início (47,8) e o calendário sobe. Toques no **26** (48,4) e no **28** (49,0), com contorno em "26/11 → 28/11". Toque em **Confirmar período** (49,6). "Pintura da varanda" digitado (50,2 a 51,2). Close e toque em **Bloquear** (51,4). Só o aviso "Chalé de Pedra 06 bloqueada no período informado." salta (51,8 a 53,4). O cartão bloqueado não aparece. |
| 53,9–58,9 | 10 | `acomodacoes-serra01` → `desativar-serra01` | Close no **Desativar** do Chalé Serra 01, com contorno (54,7) e toque (55,2); a confirmação sobe. O aviso âmbar "Chalé Serra 01 tem 1 reserva futura. Ela continua valendo; a acomodação só deixa de aceitar reservas novas." salta (56,5 a 58,3). Toque em **Desativar** (58,5). |
| 58,9–60,7 | 10 | **Dois celulares:** `acomodacoes-serra01` (Antes) e `acomodacoes-serra01-inativa` (Depois) | Contorno limão no "Ativa" (59,2) e contorno âmbar no "Inativa" (59,7), em "continua". |
| 60,7–68,5 | 11–12 | **Fecho.** | O logo estoura em limão (60,7). "Tudo cadastrado no Hospeda," entra em 60,9 e "e fácil de ajustar quando precisar." em 62,8. "E no começo," entra em 65,3 e "a FAZLO configura tudo com você." em limão, em 66,3. |
| 68,5–72,1 | — | **Logo.** | @fazlohospeda aparece em 69,1. A trilha resolve. |

**Legenda:**
- Palavra por palavra, numa faixa própria embaixo.
- Fora da legenda ficam a frase 1 e o fecho, porque já estão escritos na tela.

### O que mudou na linha do tempo depois da locução real
1. **Duração:** a voz real ficou no ritmo da estimativa (10,2 letras/s). Com as pausas do roteiro, o vídeo daria 68,9 s, mas o bloqueio teria só 5,8 s de tela.
   - Para chegar aos **8 s pedidos** (calendário, motivo e aviso com tempo para ler), a pausa depois da frase 9 passou de 1,0 para 4,5 s. A cena ficou com 8,4 s.
   - A pausa depois da frase 8 passou de 1,2 para 2,3 s. Assim o aviso "…cadastrada com tarifas por período." fica 1,4 s na janela; antes eram 0,8 s.
   - **Resultado:** 72,1 s, contra os ~73 s estimados.
2. **Frase 9 cortada:** como pedido, o "Salvar" e o aviso da acomodação nova fecham a frase 8.
3. **Bloqueio:** a janela agora mostra só o aviso. O cartão "Bloqueada" e o botão "Liberar" saíram, porque o selo tem defeito.
4. **Fecho:** passou a ter quatro linhas, e o vídeo encerra em "a FAZLO configura tudo com você." em limão.
5. **Antes e depois:** o aviso de "Acomodação atualizada" salta antes dos dois celulares, sobre a tela da lista, e não sobre o celular da direita.

## 5. Dados fictícios e telas

| No vídeo | Dado |
|---|---|
| Lista | os dados da Demo (tabela da seção 1), com o Chalé de Pedra 07 já liberado |
| Valor editado | Ipê 08 (Quarto · até 2 pessoas): fim de semana de R$ 520,00 para **R$ 550,00** |
| Acomodação nova | **Chalé Jabuticaba**: Chalé · 4 pessoas · R$ 420,00 / R$ 520,00 / R$ 620,00 |
| Bloqueio | **Chalé de Pedra 06**, de 26/11 a 28/11, motivo "Pintura da varanda" (só o aviso aparece) |
| Desativada | **Chalé Serra 01**, que tem 1 reserva futura |

**Telas:** 22 capturas da Demo recarregada, 1170×2532, em `telas/`, com a folha em [`aprovacao/folha-telas.jpg`](aprovacao/folha-telas.jpg).
- **Caminho:** `inicio`, `menu-mais`.
- **Lista:** `acomodacoes`, `acomodacoes-ipe08`.
- **Editar:** `editar-ipe08`, `editar-ipe08-550`, `acomodacoes-ipe08-550-topo`, `acomodacoes-ipe08-550`.
- **Nova:** `nova`, `nova-preenchida`, `acomodacoes-jabuticaba-topo`.
- **Bloquear:** `acomodacoes-pedra06`, `bloquear-pedra06`, `bloquear-periodo`, `bloquear-periodo-26`, `bloquear-periodo-26-28`, `bloquear-pedra06-datas`, `bloquear-pedra06-preenchido`, `acomodacoes-pedra06-aviso`.
- **Desativar:** `acomodacoes-serra01`, `desativar-serra01`, `acomodacoes-serra01-inativa`.

**Ficam escondidos:** o selo "Demonstração", a data do cabeçalho, "Quero usar" e "Quero usar na minha pousada".

## 6. Fecho
O logo do FAZLO Hospeda estoura em limão, sem nada encostando nele, e o halo do compasso não chega ao nome. Embaixo vêm as quatro linhas do fecho e @fazlohospeda. A trilha resolve no último tempo.
