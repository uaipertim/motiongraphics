# FAZLO Hospeda · telas para motion

Pacote com as telas atuais do FAZLO Hospeda prontas para animar em Reels (9:16). Tudo usa dados fictícios.

## Como está organizado

- `telas/NN-nome/tela.png` e `tela.html`: o estado principal da tela, no celular (PNG em 3x, 1170 px de largura).
- `tela-computador.png/.html`: só em Visão geral, Calendário e Caixa (PNG em 2x, 2560 px de largura).
- `estados/`: cada estado da tela (antes e depois, janelas, avisos, vazio, carregando), em PNG e HTML.
- `componentes/`: peças soltas em PNG 3x com fundo transparente e 40 px de folga em volta (para sombras e o botão "+" da barra). Cartões, chips de situação, botões, janelas, avisos, toasts, linhas do caixa, itens da comanda, cabeçalho, barra inferior e menu lateral.
- `marca/`: logo em SVG (clara e escura) e PNG 3x, `tokens.json` com cores, fontes, tamanhos, raios, sombras e espaçamentos, e `icones/` com os 39 ícones das telas em SVG.

### Nos arquivos HTML

Cada HTML é autônomo: CSS embutido em cada elemento, ícones em SVG embutido e fontes Geist e Geist Mono puxadas do Google Fonts. Os blocos têm id e classe para animar peça por peça:

- `#cabecalho`, `#barra-inferior`, `#menu-lateral`
- `.card` (id `card-<nome>`, por exemplo `card-mariana-costa`, `card-total-da-estadia`)
- `.status-chip` (id `status-chip-<situação>`, por exemplo `status-chip-pre-reserva`, `status-chip-hospedada`)
- `.valor` (id `valor-<rótulo>`, por exemplo `valor-saldo-em-aberto`, `valor-total-da-estadia`)
- `.btn` (id `btn-<texto>`, por exemplo `btn-fazer-check-in`, `btn-confirmar-reserva`)
- `.modal` (id `modal-<título>`), `.toast`, `.aviso`
- `.linha` (linhas do diário do caixa, id `linha-1`, `linha-2`...), `.item-comanda` (id `item-comanda-1`...)
- `.campo` (id `campo-<rótulo>`), `.titulo` (id `titulo-<texto>`)

Quando um nome se repete na mesma tela, ganha um número no fim (`btn-cancelar-2`).

## Telas e estados

### 01-visao-geral

Mostra como está o dia na pousada: quanto entrou no caixa, quem chega, quem sai, quantos estão hospedados e o que precisa de atenção.

- Principal: `tela`, `tela-computador`
- Estados: `carregando`, `menu-criar`, `menu-mais`, `sem-conexao`
- Componentes: 24 peças

### 02-calendario

Mostra a ocupação de cada acomodação dia a dia, com uma cor para cada situação da reserva.

- Principal: `tela`, `tela-computador`
- Estados: `reservas-em-lista`, `reservas-vazio`
- Componentes: 20 peças

### 03-nova-reserva

Cria uma reserva em 5 passos: período e acomodação, hóspede, valores, sinal e resumo.

- Principal: `tela`
- Estados: `01-datas-e-acomodacao`, `02-hospede`, `03-valores`, `04-sinal`, `05-sinal-caixa-fechado`, `06-resumo-com-sinal`, `07-resumo-sem-sinal`, `08-aviso-periodo-ocupado`, `09-aviso-tarifa-incompleta`
- Componentes: 31 peças

### 04-detalhe-reserva

Mostra a reserva com valores, sinal, saldo e as ações de confirmar, fazer check-in e cancelar.

- Principal: `tela`
- Estados: `01-pre-reserva`, `02-confirmada`, `03-cancelada`, `04-cancelar-devolver-sinal`, `05-cancelar-reter-sinal`
- Componentes: 24 peças

### 05-registrar-pagamento

Registra um pagamento (ou o sinal da reserva) e mostra o saldo antes e depois.

- Principal: `tela`
- Estados: `01-pagamento-antes`, `02-pagamento-depois`, `03-pagamento-sem-conexao`, `04-sinal-antes`, `05-sinal-caixa-fechado`
- Componentes: 43 peças

### 06-check-in

Confere os dados com o hóspede, faz o check-in e mostra o recibo; a hospedagem passa a estar ativa.

- Principal: `tela`
- Estados: `01-modal-check-in`, `02-check-in-com-pagamento`, `03-check-in-feito`, `04-hospedagens-ativas`
- Componentes: 29 peças

### 07-ficha-hospedagem

Reúne o resumo financeiro da estadia: diárias, consumos, descontos, pagamentos e saldo.

- Principal: `tela`
- Estados: `01-menu-do-pagamento`, `02-conceder-desconto`, `03-conceder-cortesia`, `04-estornar`, `05-estornado`
- Componentes: 25 peças

### 08-comanda

Lista o consumo da hospedagem, lança produtos e mostra o total, o pago e o saldo.

- Principal: `tela`
- Estados: `01-lista-de-comandas`, `02-com-itens`, `03-adicionando-produto`, `04-produto-adicionado`, `05-historico-do-item`, `06-cancelar-consumo`, `07-quitada`, `08-fechada`
- Componentes: 29 peças

### 09-check-out

Confere o saldo, recebe o que falta e encerra a hospedagem com o recibo da estadia.

- Principal: `tela`
- Estados: `01-conferencia-do-saldo`, `02-recebimento`, `03-saldo-quitado`, `04-encerrar-check-out`, `05-hospedagem-finalizada`, `06-recibo-da-estadia`
- Componentes: 37 peças

### 10-caixa

Abre o caixa com o dinheiro da gaveta, registra entradas e saídas e fecha com a conferência do dinheiro contado.

- Principal: `tela`, `tela-computador`
- Estados: `01-caixa-fechado`, `02-abertura`, `02-abertura-computador`, `03-aberto-com-lancamentos`, `04-lancamento-manual`, `05-estorno`, `06-conferencia-e-fechamento`, `06-conferencia-e-fechamento-computador`, `07-fechado-resumo`, `07-fechado-resumo-computador`
- Componentes: 31 peças

### 11-hospedes

Lista os hóspedes, mostra a ficha de cada um e cadastra novos.

- Principal: `tela`
- Estados: `01-ficha-do-hospede`, `02-cadastro-novo`, `03-editar`, `04-vazio`, `05-carregando`
- Componentes: 23 peças

### 12-acomodacoes-e-produtos

Lista as acomodações com as três tarifas e os produtos e serviços vendidos na comanda.

- Principal: `tela`
- Estados: `01-acomodacoes`, `02-acomodacoes-vazio`, `03-produtos`, `04-produtos-vazio`
- Componentes: 23 peças

### 13-navegacao

Menu "Mais" do celular, com o que cada papel pode acessar; a barra inferior está em todas as telas e solta em componentes.

- Principal: `tela`
- Estados: `01-menu-mais-administrador`, `02-menu-mais-operacoes`, `03-menu-mais-caixa`
- Componentes: 8 peças

## Dados fictícios (a mesma história em todas as telas)

- **Pousada:** Pousada Vale Sereno. Hoje é sexta-feira, 16/10. Usuária: Ana Dias (Administrador).
- **Acomodações (10):** Chalé de Pedra 04, Chalé de Pedra 05, Chalé de Pedra 06, Chalé Ipê, Chalé Jatobá, Chalé Manacá, Suíte Mirante, Suíte Jardim, Quarto Bromélia e Quarto Orquídea. Mantive as 10 das telas atuais, como combinado, para não mexer no desenho.
- **Caixa do dia:** aberto por Ana Dias às 08:00, com R$ 200,00 de saldo inicial; recebido no dia R$ 1.525,00.

| Hóspede | Reserva | Acomodação | Período | Total | Sinal / pagos | Saldo | Situação |
|---|---|---|---|---|---|---|---|
| Mariana Costa | FHZ-QB5VD9 | Suíte Mirante | 14/10 → 18/10 | R$ 2.570,00 (diárias 2.440 + comanda 287 − descontos 157) | R$ 1.220,00 + R$ 938,00 | R$ 412,00 | Hospedada |
| Lucas Martins | FHZ-7K2M9A | Chalé de Pedra 06 | 12/10 → 15/10 | R$ 1.470,00 | quitado | R$ 0,00 | Hospedada, check-out em atraso |
| Patrícia Almeida | FHZ-QQCHCU | Chalé Ipê | 13/10 → 16/10 | R$ 1.560,00 | quitado | R$ 0,00 | Hospedada, sai hoje |
| Rafael Souza | FHZ-VVPBHB | Chalé Jatobá | 15/10 → 19/10 | R$ 2.240,00 | R$ 1.120,00 | R$ 1.120,00 | Hospedada |
| Beatriz Nogueira | FHZ-B8TGBC | Suíte Jardim | 13/10 → 16/10 | R$ 1.740,00 | quitado | R$ 0,00 | Finalizada hoje |
| Fernanda Lima | FHZ-U6EKQE | Chalé Ipê | 17/10 → 20/10 | R$ 1.640,00 | sinal R$ 780,00 | R$ 860,00 | Confirmada (usada no check-in) |
| Gustavo Ribeiro | FHZ-UDVKU5 | Chalé de Pedra 04 | 17/10 → 19/10 | R$ 1.050,00 | sem sinal | R$ 1.050,00 | Pré-reserva |
| Camila Rocha | FHZ-YFDVVX | Suíte Mirante | 18/10 → 21/10 | R$ 1.830,00 | sinal R$ 915,00 | R$ 915,00 | Confirmada (usada no cancelamento) |
| Eduardo Fonseca | FHZ-HXXV9B | Chalé Manacá | 18/10 → 20/10 | R$ 1.040,00 | sinal R$ 312,00 | — | Cancelada |
| Bruno Teixeira (novo) | — | Quarto Bromélia | 22/10 → 25/10 | R$ 1.080,00 (com 10% de desconto: R$ 972,00) | sinal R$ 324,00 | R$ 648,00 | Nova reserva |

## O que ficou de fora ou diferente, e por quê

- **Day Use:** fora do pacote. Tirei o item "Day Use" dos menus, o botão "Novo Day Use", a comanda de Day Use da lista de comandas (os contadores foram ajustados) e troquei a linha do caixa "Day Use · Camila Rocha" por "Consumo · Rafael Souza", com o mesmo valor, para os totais do caixa continuarem batendo.
- **Booking, Airbnb e reserva pelo site:** não existem nas telas, então nada foi incluído.
- **Faixa "Demonstração":** tirada de todas as telas; o nome da pousada passou a ser "Pousada Vale Sereno".
- **Calendário em dia, semana e mês:** só a visão de 14 dias está desenhada. O seletor Dia/Semana/14 dias/Mês aparece na tela, mas as outras três visões não existem e não foram criadas.
- **Canal da reserva:** o formulário de nova reserva não tem campo de canal; os passos são período e acomodação, hóspede, valores, sinal e resumo.
- **Comanda vazia:** não existe estado desenhado. Há lista, comanda com itens, adicionando produto, produto adicionado, histórico, cancelar, quitada e fechada.
- **Detalhe da reserva, pré-reserva e confirmada:** a pré-reserva é a do Gustavo Ribeiro e a confirmada é a da Fernanda Lima; não existe a reserva do Gustavo já confirmada.
- **Registrar sinal, depois:** existe o antes (janela "Confirmar reserva" com o sinal) mas não a reserva depois de registrada. O antes e depois completo está no pagamento da hospedagem da Mariana Costa (saldo de R$ 412,00 para R$ 0,00).
- **Fechamento do caixa com diferença zero:** o fechamento desenhado tem "Falta R$ 15,00". Não existe a versão com diferença zero, então mantive a existente.
- **Caixa:** o diário tem a linha "Sinal · reserva FHZ-UDVKU5 · Gustavo Ribeiro", mas no resto das telas essa reserva está sem sinal. É uma divergência dos dados atuais do projeto e ficou como está.
- **Logo:** é texto na fonte Geist com a fonte embutida no SVG (não consegui converter as letras em contornos aqui). Se o programa de animação não ler a fonte embutida, use o PNG 3x da mesma pasta ou instale a Geist (Google Fonts).
