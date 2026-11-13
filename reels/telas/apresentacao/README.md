# FAZLO Hospeda — reel de apresentação (telas inteiras em funcionamento)

Reel 9:16 (1080×1920), **90,0 s**, 60 fps, H.264 + AAC, **sem voz**. É o primeiro vídeo da série sobre o Hospeda e mostra o app funcionando em um dia da Pousada Vale Sereno. Usa as telas reais do pacote `fazlo-hospeda-telas.zip` (`../_material`).

**Não publicar antes do OK.**

## Correção 2 (base f7aa2ca): celular maior e aproximações curtas

A correção anterior travou a câmera em 1× com o celular reduzido sob a lupa (~430 px de largura) e deixou o terço de baixo vazio. Agora:

1. **Celular maior.** Na vista 1× a moldura tem 570 px de largura (x 258–827) e vai de y 302 a y 1507.
   - O chip da seção fica em y 206–268, acima do celular, com ≥ 24 px de respiro até a moldura.
   - Nada entra na coluna de botões do Instagram (x > 940, y > 1000).
2. **6 aproximações curtas (1,3×)**, nos momentos sugeridos:
   - "Manutenção" no calendário;
   - sinal "315,00" digitado no "Confirmar reserva" do Gustavo;
   - recibo do check-in da Fernanda;
   - Total R$ 321,00 com o item adicionado na comanda;
   - saldo da Mariana R$ 412,00 → R$ 0,00 "Quitado";
   - "falta R$ 15,00" no fechamento do caixa.

   Cada uma entra em 0,45 s, fica parada de 1,55 a 1,85 s, sai em 0,45 s e volta a 1×. A tela fica com ≥ 139 px de margem lateral. O elemento em foco e todos os textos dele ficam inteiros dentro de y 200–1536. O chip some enquanto o celular sobe e volta junto com o 1×.
3. **Lupas reposicionadas.** As 25 lupas restantes ficam sobre o celular, perto do elemento, mas nunca em cima dele (respiro ≥ 24 px), nem sobre um toque em andamento. Também mantêm ≥ 24 px do chip. Nenhuma lupa aparece junto com uma aproximação: os 6 elementos aproximados perderam a lupa.
4. Mantidos: telas inteiras funcionando, rótulos com as palavras da tela, digitação no próprio campo, valores do LEIA-ME, trilha e mixagem, final, ~90 s.
   - Única troca de tempo: a lupa "Receber pagamento" abre 0,15 s depois (o0 + 5,8 s), para não cobrir o fim do toque em "Receber".

Folha de contato (1 quadro a cada 2 s + o pico de cada aproximação): [`output/revisao/folha-contato.jpg`](output/revisao/folha-contato.jpg).

## Correção 1 (base 699f3d5)

Celular sempre inteiro e lupa fora da tela para ler (substituída pela correção 2 acima nos itens de enquadramento e lupa). Continuam valendo:
- contorno no retângulo real do elemento (`getBoundingClientRect` do bloco inteiro, +12 px, raio + 12);
- chip fora da tela;
- digitação letra a letra no próprio campo do HTML;
- rótulos = palavras da tela ("Manutenção", não "Bloqueada").

## Linguagem

- **Sempre a tela inteira, dentro de um celular.** O celular tem moldura fina, cantos arredondados e nenhuma marca, em 3D leve: entra girando, inclina e se aproxima. Nenhuma peça é recortada para ficar solta (o que estava errado no "Um dia inteiro" e na "Parte 1").
- **Como as telas são feitas.** Os estados HTML do pacote são renderizados inteiros no Chromium em 4× (`scripts/telas.cjs`).
  - Nos estados com janela ou folha, sai o fundo do estado e a janela sozinha. A janela sobe de baixo dentro da tela, na mesma posição do estado original.
- **O app funciona na frente de quem assiste:**
  - toque com onda limão nos botões reais (posição pelos ids e textos do HTML), e o botão afunda;
  - troca de tela empurrando para o lado, janela e folha subindo, troca dos passos da nova reserva;
  - rolagem da Visão geral até "Precisa de atenção" e até a barra de baixo;
  - o nome do hóspede e o sinal sendo digitados;
  - estados antes → depois: pré-reserva → janela do sinal, check-in → check-in feito → hospedada, R$ 287,00 → R$ 321,00, R$ 412,00 → quitado, caixa aberto → fechado.
- **Câmera.** O celular fica inteiro em 1× (moldura de 570 px), com 6 aproximações curtas de 1,3× nos momentos-chave. Para os valores, a lupa; a ampliação dela vem do menor texto do elemento, para ficar ≥ 40 px no quadro.
- **Motion por cima:**
  - chip da seção no alto;
  - contorno limão no retângulo real do elemento lido;
  - lupa com rótulo curto (as palavras da tela, Inter Display 52 px) e linha fina limão até o ponto;
  - a tela anterior desfocada atrás.
- **Ritmo.** Trocas de 0,3–0,45 s; cada informação-chave fica parada ≥ 1,8 s.
- **Final próprio.** O celular se afasta e as telas do vídeo passam em fila por trás dele; ele volta para a Visão geral com "Reservas, hospedagens, comanda e caixa. Num só lugar.", a marca e a pílula. Nada da v2 (sem anel, sem órbita, sem a logo circular).

## Roteiro

| Tempo | Seção | Telas do pacote (estados) |
|---|---|---|
| 0–5 s | Abertura | O celular entra girando; Visão geral carregando → tela. "Conheça o FAZLO Hospeda." |
| 5–13 s | Visão geral | Recebido hoje **R$ 1.525,00** → Hospedados **10** · Saídas **2** → rola até "Precisa de atenção": **Check-out em atraso** → rola até a barra e toca em Calendário. |
| 13–21 s | Calendário | 14 dias. A câmera percorre a grade: Pré-reserva (Gustavo), Hospedada (Helena), Confirmada (Fernanda), Manutenção. |
| 21–33 s | Nova reserva | Toque no "+" → menu criar → Nova reserva. Passo 1: **Livres no período · 5 de 10**. Passos 2, 3 e 4 rápidos, com a barra de progresso andando e o nome digitado. Passo 5: **Total da reserva R$ 972,00** → Criar com sinal. |
| 33–41,3 s | Sinal | Gustavo Ribeiro, **Pré-reserva**, sem sinal → toque em Registrar sinal → janela com **R$ 315,00** digitado → "Depois: reserva confirmada · saldo **R$ 735,00**". |
| 41,3–51,5 s | Check-in | Janela "Fazer check-in" da Fernanda Lima (conferência) → toque → **Check-in feito** com recibo → Hospedagens: **Hospedada**. |
| 51,5–60,2 s | Comanda | Comanda da Mariana Costa: total **R$ 287,00** → Lançar consumo (2 águas e 1 caipirinha, R$ 34,00) → produto adicionado: total **R$ 321,00**. |
| 60,2–74,8 s | Check-out | Saldo **R$ 412,00** com "Fazer check-out" bloqueado ("Só libera com saldo zero.") → Receber no PIX → **R$ 0,00 Quitado** → encerrar → recibo da estadia. |
| 74,8–83,5 s | Caixa | Recebido por forma de pagamento **R$ 1.525,00** → Fechar caixa: contado R$ 270,00, "**falta R$ 15,00**" ("Mostra se o dinheiro bateu.") → caixa fechado. |
| 83,5–90 s | Final | Fila de telas atrás do celular → Visão geral → texto, marca e pílula "Chame no WhatsApp · link na bio". |

## Pontos a conferir

- **Comanda: R$ 321,00, não R$ 287,00.** No pacote, o estado "produto adicionado" (`08-comanda/04`) mostra o total R$ 321,00 (287 + 34). O vídeo segue os estados: R$ 287,00 em destaque antes de lançar, R$ 321,00 depois. O check-out (`07`/`09`) continua com consumos R$ 287,00, como no pacote. Se a ideia for terminar a comanda em R$ 287,00, a saída é não mostrar o "produto adicionado".
- **Datas do check-out.** Os estados `09` (saldo quitado, encerrar, recibo) mostram a saída "hoje, 18/10", como no pacote.
- **Menu "criar" sobre o calendário.** O estado `menu-criar` do pacote é desenhado sobre a Visão geral. No vídeo, a folha do menu sobe sobre o calendário, de onde saiu o toque no "+". A folha é a do pacote, na mesma posição.
- **Calendário no celular (14 dias).** Ele mostra até o dia 22. Os nomes das barras têm 11,5 px e são lidos na lupa.
- **Caixa.** A tela do caixa nunca rola. A linha do diário com o sinal do Gustavo está em y 1274 da página e fica fora da parte visível.
- **Áreas seguras.** Lupas, chip, textos, marca e pílula ficam em y 200–1536 e fora da coluna de botões (x > 940, y > 1000). Em 1×, a base da moldura fica em y 1507.

## Som

Trilha nova (`scripts/audio.py`): nu-disco a 120 BPM em Lá menor, diferente do 2-step da v2.
- Bumbo 4×4, palmas no 2 e no 4, chimbal aberto no contratempo.
- Baixo em oitavas, acordes curtos de serra e um arpejo nas seções do meio.
- Um respiro a cada 8 compassos.

Os efeitos são discretos e vêm de `audio/eventos.json`, exportado da animação:
- toques e trocas de tela;
- janelas;
- digitação (uma tecla por letra);
- cadeado abrindo;
- gaveta do caixa;
- a fila e a marca do final.

Master em −14 LUFS, pico ≤ −1,5 dBTP.

## Como renderizar

```bash
cd reels/telas/apresentacao
node scripts/telas.cjs                       # telas inteiras + janelas + caixas (só se o pacote mudar)
node scripts/render.cjs dados --fps 30       # eventos do som + dados do QA
python3 scripts/audio.py
node scripts/render.cjs video --workers 4    # output/apresentacao-hospeda.mp4
python3 scripts/storyboard.py
python3 scripts/folha.py                     # output/revisao/folha-contato.jpg
cd ../../.. && node reels/tools/capa_grade.cjs reels/telas/apresentacao \
  && python3 reels/tools/revisao_capa.py reels/telas/apresentacao --saida reels/telas/apresentacao/output/grade --vizinhos reels/telas/parte-1-chegada/output/grade
cd reels/telas/apresentacao && cp output/grade/capa.jpg output/capa-grade.jpg && python3 scripts/qa.py
```
