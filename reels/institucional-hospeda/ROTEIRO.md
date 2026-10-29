# FAZLO Hospeda — vídeo institucional: roteiro

**Status:** aprovado em 29/10/2026 com ajustes (duas frases novas e as telas 09 a 14). O vídeo construído e as cenas finais, com os tempos medidos na locução, estão no [README](README.md). Esta página guarda o roteiro proposto, com as mudanças aprovadas.

**Para:** donos e gestores de pousadas, enviado aos leads pelo WhatsApp.
**Formato:** 9:16 (1080×1920), cerca de **80 s** (a fala soma uns 51 s, mais as pausas de leitura e o fecho).
**Telas:** somente os PNGs de [`hospeda-v2/`](../../hospeda-v2), em recortes. Nenhuma tela inventada.
**Produção:**
- narração eleven_v4, voz Raquel, estabilidade 0,50, semelhança 0,75;
- "Hospéda" e "Uátsap" vão só no texto enviado à API, pelo `pronuncia.py`;
- legenda palavra por palavra no padrão do reel-09, com as chaves em limão;
- trilha de fundo e fecho com a logo.

Os tempos abaixo são estimados (14,5 letras/s). Os definitivos saem da locução gerada.

## Narração completa

> Reserva anotada no caderno, consumo no papel e, no fim do dia, um caixa que não bate.
> O FAZLO Hospeda organiza a sua pousada em um só lugar.
> Logo cedo, você vê quem chega, quem sai, quem está hospedado e quanto já entrou.
> As reservas ficam no calendário, com cada acomodação e cada data à vista. E o mesmo chalé não pode ser reservado duas vezes nas mesmas datas.
> Na reserva, você registra o sinal, e o saldo já fica calculado. Se o hóspede cancelar, você decide: reter ou devolver o sinal.
> Durante a estadia, cada consumo vai para a comanda do hóspede. No check-out, o saldo aparece claro, e a saída só libera com tudo quitado.
> O caixa tem abertura e fechamento conferido: você conta o dinheiro e o Hospeda mostra na hora se sobrou ou faltou.
> O Day Use entra nas mesmas comandas e no mesmo caixa.
> E se a internet cair no meio de um recebimento, o mesmo pagamento não é lançado duas vezes.
> Você não começa do zero: a FAZLO entrega o sistema já configurado, com acomodações, tarifas, produtos e usuários.
> Fale com a gente no WhatsApp para conhecer.

174 palavras. Uma única chamada, no fim.

## Timeline

Cada cena segue o ritmo animação → pausa para entender (no mínimo 2,5 s parada) → transição.
- **Recorte** = trecho da tela em relevo, com o dado principal marcado em limão.
- A faixa "Demonstração · dados de exemplo · Quero usar" do topo das telas **não aparece**: os recortes começam abaixo dela.

| # | Tempo | Narração | Tela (`hospeda-v2/`) e o que aparece | Chaves (limão) |
|---|---|---|---|---|
| 1 · Dor | 0–5,8 s | "Reserva anotada no caderno, consumo no papel e, no fim do dia, um caixa que não bate." | **Sem tela.** Tipografia e elementos vivos: caderno, papel e um placar de caixa que não fecha. | caderno · papel · não bate |
| 2 · Virada | 5,8–10 s | "O FAZLO Hospeda organiza a sua pousada em um só lugar." | **Sem tela.** A logo oficial entra e a bagunça se organiza. | um só lugar |
| 3 · O dia | 10–16,8 s | "Logo cedo, você vê quem chega, quem sai, quem está hospedado e quanto já entrou." | `01-visao-geral-celular.png`: cartão "Recebido hoje R$ 1.525,00" (contador rolando) e os cartões Hospedados 10 · Chegadas 0 · Saídas 2. | chega · sai · hospedado · entrou |
| 4 · Reservas | 16,8–27,6 s | "As reservas ficam no calendário, com cada acomodação e cada data à vista. E o mesmo chalé não pode ser reservado duas vezes nas mesmas datas." | `02-calendario-computador.png`: a grade da semana, com as barras preenchendo. Depois `02-calendario-celular.png`. 2ª frase: `09-reserva-duplicada-computador.png` (aviso âmbar do período ocupado). | calendário · duas vezes |
| 5 · Sinal e cancelamento | 27,6–37,3 s | "Na reserva, você registra o sinal, e o saldo já fica calculado. Se o hóspede cancelar, você decide: reter ou devolver o sinal." | `03-nova-reserva-sinal-celular.png`: R$ 324,00 digitado, PIX tocado, "A reserva nasce confirmada · saldo R$ 756,00". Depois `03-nova-reserva-resumo-celular.png`: Diárias / Sinal / Saldo R$ 756,00. **Cancelamento:** `02-reservas-computador.png`, só as 3 linhas canceladas ("sinal a tratar", "sinal retido", "sinal devolvido"). | sinal · saldo · reter · devolver |
| 6 · Hospedagem e comanda | 37,3–47,7 s | "Durante a estadia, cada consumo vai para a comanda do hóspede. No check-out, o saldo aparece claro, e a saída só libera com tudo quitado." | `05-comandas-celular.png` (lista de comandas abertas) → `05-comanda-aberta-celular.png` (itens entrando, Saldo R$ 287,00) → `04-hospedagem-checkout-celular.png` ("Saldo em aberto R$ 412,00 · O check-out libera com saldo zero."). | comanda · saldo · quitado |
| 7 · Caixa | 47,7–53,7 s | "O caixa tem abertura e fechamento conferido: você conta o dinheiro e o Hospeda mostra na hora se sobrou ou faltou." (ajuste aprovado) | `06-caixa-aberto-celular.png` → `10-fechamento-caixa-celular.png` (dinheiro esperado, contado e o aviso da diferença). | abertura · fechamento conferido |
| 8 · Day Use | 53,7–58,5 s | "O Day Use entra nas mesmas comandas e no mesmo caixa." | `05-comandas-celular.png`: a linha "Camila Rocha · Day Use". `06-caixa-aberto-celular.png`: a linha "Day Use · Camila Rocha + R$ 120,00" do diário. | Day Use |
| 9 · Diferencial: pagamento repetido | 58,5–63,7 s | "E se a internet cair no meio de um recebimento, o mesmo pagamento não é lançado duas vezes." (ajuste aprovado) | **Sem tela:** tipografia e elementos vivos. | internet cair · duas vezes |
| 10 · Diferencial: já configurado | 63,7–71,9 s | "Você não começa do zero: a FAZLO entrega o sistema já configurado, com acomodações, tarifas, produtos e usuários." | `13-nova-pousada-acomodacoes-celular.png` → `14-nova-pousada-revisao-celular.png`. | já configurado |
| 11 · Chamada e fecho | 71,9–80,5 s | "Fale com a gente no WhatsApp para conhecer." | **Sem tela.** A logo do FAZLO Hospeda no centro e a chamada escrita. A logo fica até o fim (cerca de 3 s depois da fala). | WhatsApp |

## Telas que faltavam (resolvido na aprovação)

- **Cena 4:** `09-reserva-duplicada` (só a versão computador).
- **Cena 5:** `11-cancelamento-sinal-reter` e `11-cancelamento-sinal-devolver`, em sequência.
- **Cena 7:** `10-fechamento-caixa`.
- **Cena 8:** `12-day-use` e `12-day-use-ativo`, mais a linha de Day Use do diário do caixa (`06-caixa-aberto`).
- **Cena 9:** sem tela, só tipografia e elementos vivos.
- **Cena 10:** `13-nova-pousada-acomodacoes` e `14-nova-pousada-revisao`.

Os tempos da tabela acima eram estimativas. Os definitivos, com a locução gerada, estão no README.

## Cuidados com as telas

- **Comanda da Mariana Costa:** os dados divergem entre as telas.
  - Em `04-hospedagem-*` aparecem 6 itens, entre eles "Caipirinha 2× R$ 44,00".
  - Em `05-comanda-aberta-*` aparece "Caipirinha 3× R$ 66,00".
  - Em `05-comandas-*`, a lista diz "12 itens".
  - O total (R$ 287,00) é o mesmo em todas. **O vídeo mostra os itens de uma só delas** (`05-comanda-aberta-celular.png`).
- **Lucas Martins:** está no "Chalé de Pedra 06" nas reservas e em "Pedra 04" nas comandas. As duas telas não aparecem juntas.
- **Nome da pousada:** o nome que aparece é "Pousada Demonstração" (barra lateral do computador e faixa do topo). Fica fora dos recortes, ou aparece só assim, com a inicial maiúscula.
- **Fora do vídeo:** Booking/Airbnb, site, FNRH/Cadastur, pagamento on-line, preços e datas. Também não se fala em versões.
