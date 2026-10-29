# FAZLO Hospeda: apresentação para a pousada abordada (roteiro para aprovação)

**Para quem:** uma pousada que aceitou receber "um vídeo explicativo de como o sistema funciona na prática". Vai pelo WhatsApp e não é Reels. A pousada assiste com calma para decidir se quer testar.

**Formato:** 9:16 (1080×1920), cerca de **2 min 50 s**. São uns 2 min 05 s de fala, mais as pausas de leitura e o fecho.

**Produção:** o mesmo padrão do [institucional](../institucional-hospeda/README.md).
- **Telas:** só os PNGs de [`hospeda-v2/`](../../hospeda-v2), em recortes sem a faixa "Demonstração · Quero usar".
- **Identidade:** preto + verde-limão.
- **Narração:** eleven_v4, voz Raquel, só estabilidade 0,50 e semelhança 0,75.
  - Pronúncias no texto enviado à API: "Hospéda", "Fázlo" e "Uátsap".
- **Legenda:** palavra por palavra no padrão do reel-09.
- **Som e fecho:** trilha de fundo e fecho com a logo.

**O que muda em relação ao institucional: as telas ficam mais tempo paradas.**
- **Uma tela por assunto:** no máximo duas por frase, e só quando a frase fala de duas coisas.
- **Foco:** a câmera vai até o dado na palavra que a narração diz e o contorno limão se desenha.
- **Pausa de leitura:** depois do foco, a tela fica parada ≥ 2,5 s antes da transição.
- **Fim de cada assunto:** uma pausa de 1,4 a 2,2 s na locução (no institucional eram 0,3 a 1,1 s).
- **Cada tela fica ≥ 4 s na tela.**

Os tempos abaixo são estimados (11,6 letras/s, o ritmo medido na voz do institucional). Os definitivos saem da locução gerada.

## Narração completa

**1. A dor**
> Em muita pousada, o dono faz tudo: a reserva fica no caderno e no WhatsApp, o consumo, no papel. No check-out, ninguém sabe ao certo quanto o hóspede ainda deve. E no fim do dia, o caixa não bate.
> O FAZLO Hospeda junta tudo isso em um só lugar. Veja como fica o dia a dia.

**2. O dia a dia com o Hospeda**
> Ao abrir o Hospeda, você vê o dia da pousada: quem está hospedado, quem chega, quem sai e quanto já entrou, por forma de pagamento.
> No calendário, cada acomodação tem a sua linha, e cada reserva aparece no período dela.
> E o Hospeda não deixa vender o mesmo chalé duas vezes nas mesmas datas: ele avisa e mostra o que está livre.
> Na reserva, você registra o sinal, e o saldo que falta já fica calculado.
> Se o hóspede cancelar, você decide: reter o sinal, que fica com a pousada, ou devolver, e a saída já é lançada no caixa.
> Durante a estadia, cada consumo vai para a comanda do hóspede: o que foi, quantos e quanto.
> No check-out, o saldo aparece claro, e a saída só libera com tudo quitado.
> O caixa abre com o dinheiro da gaveta, e cada recebimento entra no diário, com a forma de pagamento.
> No fechamento, você conta o dinheiro, e o Hospeda mostra na hora se sobrou ou faltou.
> O Day Use tem a sua própria lista e a sua comanda, como na hospedagem. E o pagamento entra no mesmo caixa.
> E se a internet cair no meio de um recebimento, o mesmo pagamento não é lançado duas vezes.

**3. Como começa** (texto do pedido)
> Você não precisa cadastrar nada. A equipe FAZLO configura a sua pousada: acomodações, tarifas, produtos da comanda e usuários. Você recebe o convite por e-mail, cria a sua senha e já começa a usar. E qualquer dúvida, é só chamar a gente no WhatsApp.

**4. Teste grátis** (texto do pedido)
> São 30 dias grátis para usar o Hospeda na sua pousada. Sem cartão e sem compromisso.

**5. Quanto custa depois** (texto do pedido)
> Depois dos 30 dias, se fizer sentido para você, a mensalidade é de R$ 99,90 por mês. Sem taxa por reserva e sem fidelidade. E as 10 primeiras pousadas pagam R$ 79,90 por mês durante os primeiros 12 meses.

**6. Chamada única** (texto do pedido)
> Quer testar 30 dias na sua pousada? É só responder esta mensagem.

**Valores:**
- A voz fala "noventa e nove reais e noventa centavos" e "setenta e nove reais e noventa centavos". A legenda e a tela mostram "R$ 99,90" e "R$ 79,90".
- O alinhamento junta as palavras faladas na palavra da legenda, como já é feito com "Uátsap" → "WhatsApp".

## Timeline

| # | Tempo | Narração | Tela (`hospeda-v2/`) e o que o foco aponta |
|---|---|---|---|
| 1 · Dor | 0–14 s | "Em muita pousada, o dono faz tudo… o caixa não bate." | **Sem tela.** O dono no centro de tudo: o caderno de reservas, o balão de conversa e o papel do consumo entram um a um, na palavra. Depois a ficha do hóspede com "deve: ?" e o caixa com números que não param de mudar. |
| 2 · Virada | 14–20 s | "O FAZLO Hospeda junta tudo isso em um só lugar. Veja como fica o dia a dia." | **Sem tela.** Tudo é sugado para a logo. Os ícones do dia a dia entram em órbita. |
| 3 · O dia | 20–31 s | "Ao abrir o Hospeda, você vê o dia da pousada…" | `01-visao-geral-celular.png`: Hospedados 10 → Chegadas → Saídas → "Recebido hoje R$ 1.525,00" com PIX, dinheiro, crédito e débito. |
| 4 · Calendário | 31–38 s | "No calendário, cada acomodação tem a sua linha…" | `02-calendario-celular.png`: a grade da semana. Foco nas linhas das acomodações, depois nas barras das reservas. |
| 4 · Reserva duplicada | 38–48 s | "E o Hospeda não deixa vender o mesmo chalé duas vezes…" | `09-reserva-duplicada-computador.png`: o aviso âmbar "Período ocupado", depois "Livres no período · 5 de 10" com as acomodações livres. |
| 5 · Sinal | 48–54 s | "Na reserva, você registra o sinal, e o saldo que falta já fica calculado." | `03-nova-reserva-sinal-celular.png`: o sinal R$ 324,00 e a forma PIX, depois "A reserva nasce confirmada · saldo R$ 756,00". |
| 5 · Cancelamento | 54–64 s | "Se o hóspede cancelar, você decide: reter… ou devolver…" | `11-cancelamento-sinal-reter-celular.png` ("Nada sai do caixa…") → na palavra "devolver", troca no lugar por `11-cancelamento-sinal-devolver-celular.png` ("No caixa aberto: sai – R$ 915,00…"). |
| 6 · Comanda | 64–71 s | "Durante a estadia, cada consumo vai para a comanda do hóspede…" | `05-comanda-aberta-celular.png`: os itens com quantidade × preço, depois o saldo da comanda. |
| 6 · Check-out | 71–79 s | "No check-out, o saldo aparece claro, e a saída só libera com tudo quitado." | `04-hospedagem-checkout-celular.png`: "Saldo em aberto R$ 412,00" → "O check-out libera com saldo zero." |
| 7 · Caixa | 79–87 s | "O caixa abre com o dinheiro da gaveta, e cada recebimento entra no diário…" | `06-caixa-aberto-celular.png` em dois recortes da mesma tela: a abertura (R$ 200,00) e depois o "Diário da sessão", com horário e forma de cada recebimento. |
| 7 · Fechamento | 87–95 s | "No fechamento, você conta o dinheiro, e o Hospeda mostra na hora se sobrou ou faltou." | `10-fechamento-caixa-celular.png`: o valor contado → o aviso "Diferença: falta R$ 15,00…". |
| 8 · Day Use | 95–104 s | "O Day Use tem a sua própria lista e a sua comanda… E o pagamento entra no mesmo caixa." | `12-day-use-celular.png` (a lista) → `12-day-use-ativo-celular.png` (o resumo: Day Use e consumos na comanda) → `06-caixa-aberto-celular.png` (a linha "Day Use · Camila Rocha" do diário). |
| 9 · Pagamento repetido | 104–112 s | "E se a internet cair no meio de um recebimento…" | **Sem tela.** A mesma cena do institucional: o sinal da internet apaga, o recebimento fica "LANÇADO 1 VEZ" e a repetição é barrada. |
| 10 · Como começa | 112–131 s | "Você não precisa cadastrar nada… é só chamar a gente no WhatsApp." | `13-nova-pousada-acomodacoes-celular.png` (acomodações e tarifas) → `14-nova-pousada-revisao-celular.png` (produtos da comanda e usuários iniciais; depois o convite por e-mail, ver a pergunta 1). Em "qualquer dúvida", um balão de conversa genérico com "Fale com a gente no WhatsApp". |
| 11 · Teste grátis | 131–139 s | "São 30 dias grátis… Sem cartão e sem compromisso." | **Tipografia.** "30 dias grátis" grande, com o 30 contando. Os checks "Sem cartão" e "Sem compromisso" entram na palavra. |
| 12 · Quanto custa | 139–161 s | "Depois dos 30 dias… R$ 99,90 por mês… R$ 79,90 por mês durante os primeiros 12 meses." | **Tipografia, valores grandes.** "R$ 99,90 /mês" e os checks "Sem taxa por reserva" e "Sem fidelidade". Depois o selo "10 primeiras pousadas": "R$ 79,90 /mês nos primeiros 12 meses". |
| 13 · Chamada e fecho | 161–171 s | "Quer testar 30 dias na sua pousada? É só responder esta mensagem." | **Tipografia.** A pergunta, e "É só responder esta mensagem." em limão. A logo do FAZLO Hospeda fecha o vídeo (3,2 s). |

## Dados das telas

- **Mesma pessoa ou acomodação com valores diferentes:** nunca aparecem juntas.
  - A comanda da Mariana vem só de `05-comanda-aberta`; os itens da ficha `04-hospedagem` não aparecem.
  - O Lucas só aparece nas linhas do diário do caixa.
  - A Camila do cancelamento (cena 5) e a do Day Use (cena 8) ficam em cenas separadas.
  - A Suíte Mirante do cancelamento não mostra diárias: o recorte fica no modal.
  - As tarifas da Suíte Mirante (cena 10) ficam longe da hospedagem da Mariana (cena 6).
- **Nome de pousada:** "Pousada Recanto da Serra" (o item 1 de `14-nova-pousada-revisao`) fica fora do recorte.
- **Fora do vídeo:** Booking/Airbnb, site e reserva pelo site, FNRH/Cadastur, pagamento on-line. O vídeo também não fala em versões.

## Para decidir antes de construir

1. **O convite por e-mail (cena 10):** em `14-nova-pousada-revisao`, o texto do convite é "Ao ativar, enviamos o convite por e-mail para as 3 pessoas. O teste vai de 26/10/2026 a 25/11/2026."
   - **(a) Mostrar o bloco inteiro.** As datas são de exemplo e batem com os 30 dias.
   - **(b) Deixar o bloco fora.** O convite fica só na narração, e a tela para nos itens 4 a 6.
2. **Como a voz fala os valores:** "noventa e nove reais e noventa centavos" (proposto) ou "noventa e nove e noventa".
