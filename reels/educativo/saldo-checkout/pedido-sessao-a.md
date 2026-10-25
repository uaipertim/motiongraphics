PEDIDO DE INVESTIGAÇÃO — SINAL DA RESERVA APÓS O CHECK-IN (DEMO) E DOIS SALDOS NA FICHA
Nível de raciocínio: alto.

Siga o CLAUDE.md do repositório. Esta tarefa começa só com investigação e plano: não implemente nada, não publique nada e não toque em produção antes da minha aprovação.

A. AMBIENTE E REPRODUÇÃO
- Código testado: branch t62-dashboard-151, commit 6d7dae7 (package.json 1.5.1), em 25/10/2026.
- Ambiente: Demo LOCAL (`vite --mode demo`, porta 3101), dataset em memória (`buildDemoDataset`), tela de celular 430×932, Chromium automatizado (Playwright).
- NÃO testado: demo.fazlohospeda.com.br (não era acessível do ambiente do teste) e produção.
- Repetido em duas tentativas, com reservas novas criadas na própria sessão Demo:

Tentativa 1 (relógio do navegador fixado em 26/10/2026 10:05):
1. Entrar na demonstração > Nova reserva: 26/10 a 28/10, Ipê 08 (2 diárias de R$ 450 = R$ 900), hóspede existente, desconto R$ 50, sinal R$ 450 em PIX, canal WhatsApp, status Confirmada.
2. Resumo e detalhe da reserva corretos: total R$ 850, adiantamento + R$ 450, saldo pendente R$ 400. O modal de check-in também mostra R$ 400.
3. Check-in lançando R$ 0 (quitação parcial confirmada).
4. Comanda: 2 × Jantar (R$ 55) + 2 × Água sem gás (R$ 5) = R$ 120.
5. Resultado: card em Hospedagens "No check-out R$ 970" (esperado R$ 520); ficha "Nenhum pagamento registrado", "Receber diárias — R$ 850".
6. Variação: mesmo fluxo pagando R$ 400 em PIX no check-in. A ficha mostra "Total recebido + R$ 400", "Pendente: R$ 450", "Saldo líquido R$ 570" e bloqueia o check-out ("Receba as diárias pendentes (R$ 450,00)"). Esperado: diárias quitadas e saldo de R$ 120 (só a comanda).

Tentativa 2 (relógio real, 25/10/2026):
1. Nova reserva: 25/10 a 27/10, Chalé Serra 01, total R$ 800, sinal R$ 400 em PIX, Confirmada.
2. Check-in lançando R$ 0 (quitação parcial).
3. Resultado: card "No check-out R$ 800"; ficha "Nenhum pagamento registrado", "Saldo líquido R$ 800", "Receber diárias — R$ 800".

Para comparar: a hospedagem pré-carregada de Patrícia Ribeiro (FHZ-000138) mostra o sinal de R$ 450 corretamente. Ela não serve como única evidência de validação.

B. SINAL APÓS O CHECK-IN
Caso de referência, sem consumos nem ajustes: reserva de R$ 800, sinal registrado de R$ 400. Depois do check-in, o card mostra R$ 800 a receber e a ficha diz "Nenhum pagamento registrado".
Esperado:
- o pagamento de R$ 400 preservado e associado à reserva/hospedagem;
- saldo restante de R$ 400.
Investigue onde o valor se perde: persistência, associação (reserva → hospedagem), leitura ou exibição. Não presuma a causa. Diga também se o mesmo caminho existe fora do modo Demo (código compartilhado com produção) ou se é exclusivo do Demo, com a evidência do código.

C. DOIS SALDOS NA FICHA DA HOSPEDAGEM
Na ficha de Patrícia Ribeiro (diárias R$ 1.350, recebido R$ 450, comanda R$ 120), o Resumo financeiro mostra ao mesmo tempo:
- "Saldo líquido em aberto (diárias + extras − ajustes − pagamentos)": R$ 120;
- "Saldo líquido": R$ 1.020.
Primeiro esclareça o que cada indicador inclui e de onde vem cada número. Não presuma que deveriam ser iguais. Se medem coisas diferentes, os rótulos precisam deixar essa diferença clara para quem confere o check-out. Se um deles estiver errado, aponte qual e por quê.

D. VALIDAÇÃO DA CORREÇÃO PROPOSTA
O teste precisa começar com uma reserva NOVA e percorrer: registro → sinal → check-in (com e sem pagamento das diárias) → consumos → conferência do saldo no card, na ficha e no check-out. Conferir também que os valores continuam corretos depois de atualizar a página. Inclua o teste negativo exigido no CLAUDE.md.

E. LIMITE DA CONCLUSÃO
Registre expressamente: "produção não testada". Não afirme que o problema existe em produção nem que produção está livre dele. Se for necessário confirmar em produção, proponha como fazer sem gravar nada em dados reais e espere minha autorização.

ENTREGA: relatório curto com a causa encontrada (com arquivos e linhas), o plano de correção no banco e na tela, os testes e as dependências. Aguarde aprovação antes de implementar.
