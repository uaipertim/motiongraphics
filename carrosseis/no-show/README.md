# FAZLO Hospeda · Carrossel ANIMADO "O hóspede não apareceu. E agora?" · Pilar DICA

Post de terça, 08/12, 12h. **Nada foi publicado.**

Tema: no-show. É conteúdo educativo, e os valores são um exemplo fictício: selo "EXEMPLO FICTÍCIO" nos slides com valores. Não tem telas do app, logos de terceiros nem CTA de venda.

Segue exatamente o padrão aprovado do [Tarifa de dezembro](../tarifa-alta-temporada) e reaproveita o motor dele: cenas em canvas, render no Playwright + ffmpeg, scripts de conferência, storyboard e prévia. Não repete as cenas daquele carrossel: nada de split-flap, escada ou mapa de ocupação, e as funções do letreiro foram tiradas do motor. Também não usa nenhum visual do v2 "Toda estadia é um ciclo".

**Formato:**
- 8 slides em MP4 1080×1350 (4:5), 30 fps, H.264 yuv420p (CRF 12, `-tune animation`), com faixa AAC silenciosa;
- 9 s por slide (o 02, 10 s);
- texto do slide fixo no topo desde o quadro 0;
- cena até ~6,5 s, depois o estado final vivo e, nos últimos 0,75 s, a dissolução que fecha o loop sem salto (na capa, o relógio volta às 18h);
- margens de 80 px e o canto de baixo à direita (140×140) livre para o ícone de som;
- âmbar #E8A317 só para alerta. **Legenda do post:** [`legenda.txt`](legenda.txt).

## O exemplo fictício (só estes números)

| | |
|---|---|
| Reserva do Chalé 3 | 26/12 a 29/12 = 3 noites × R$ 360 = **R$ 1.080** |
| Sinal de 50% (pago) | **R$ 540** |
| Saldo (seria pago no check-in) | R$ 1.080 − R$ 540 = **R$ 540** |
| Chegada combinada | até 22h |
| Noites liberadas e vendidas de novo | 2 × R$ 360 = **R$ 720** |

Nenhum outro valor em R$ aparece; a conferência verifica.

## ETAPAS 1 e 2: os 8 slides

- **Etapa 1 (fcbbfda):** o storyboard e o slide 02, aprovados com ajustes.
- **Etapa 2 (esta entrega):** os ajustes e os 8 MP4.
  - **Capa:** 18:00 → 00:30, sem hora da manhã.
  - **02:** a balança e as noites maiores.
  - **03:** a folha e as linhas maiores, com a regra em destaque.
  - **05:** balões, etiquetas e relógios maiores.
  - **06:** o final virou uma conta em linha.

- **Para postar, nesta ordem:** [`output/01.mp4`](output/01.mp4) … [`08.mp4`](output/08.mp4).
- **Versão estática de segurança:** [`output/png/`](output/png), com o estado final de cada cena (na capa, o relógio parado em 00:30).
- **Revisão:**
  - prévia: [`output/previa.jpg`](output/previa.jpg) (0 s, 2 s, 4,5 s e o estado final);
  - storyboard: [`output/revisao/storyboard.jpg`](output/revisao/storyboard.jpg);
  - capa na grade (recorte 3:4, ao lado do "Tarifa de dezembro" e do "Consumo"): [`output/revisao/capa-na-grade.jpg`](output/revisao/capa-na-grade.jpg);
  - conferência geral: [`output/revisao/conferencia.txt`](output/revisao/conferencia.txt), com os 8 aprovados;
  - recortes grandes (1:1) dos slides 02, 03, 05 e 06: [`output/revisao/`](output/revisao) (`NN-recorte.jpg`), olhados antes do commit.

| # | Texto (fixo) | A cena |
|---|---|---|
| 01 | capa limão: chip "NO-SHOW" · "O hóspede / não apareceu. / E agora?" · "ARRASTA →" | A fachada do chalé em traço preto, com a porta, a janela e a lâmpada da varanda acesas (a luz respira) e o tapete de boas-vindas intocado. O relógio de parede avança de 18:00 até 00:30 e fica parado ali, com a hora em mono embaixo. Na dissolução do fim, os ponteiros e a hora esmaecem e reaparecem em 18:00, sem passar por outras horas. Nenhum quadro mostra hora da manhã. |
| 02 | "O chalé ficou pronto a noite toda." + "**Sem regra combinada, ninguém sabe o que fazer com o sinal.**" | TELA DIVIDIDA. **Em cima, "A NOITE" (cinza):** o chalé aceso, a cama arrumada e o kit de boas-vindas parados, as estrelas e o relógio de 18:00 a 02:00. Às 22h desce a notificação âmbar "22H · SEM NOTÍCIA", que pulsa. Depois a metade esmaece até 55%, mas continua legível. **Embaixo, "O DIA SEGUINTE" (âmbar, no divisor):** o sinal R$ 540 cai numa balança grande entre "DEVOLVER?" e "FICAR?", que ocupa até perto da base útil (y ≈ 1180). O travessão balança e o sinal desliza para o lado que desce, com um "?" âmbar pulsando em cima. Ao lado, os cartões altos das noites 27/12 e 28/12, com o cadeado fechando ("NOITES PRESAS"). No estado final, as duas metades ficam na tela. |
| 03 | trilha **01** · "A regra vai escrita / **na confirmação.**" · apoio "Quem reserva já sabe o que acontece se não vier." | A confirmação sai impressa, subindo da impressora, linha a linha e na ordem de leitura, em texto mono de 30 px: Chalé 3 · 26/12 a 29/12 · 3 noites · Total R$ 1.080 · sinal R$ 540 pago · Chegada até 22h. A regra "Não comparecimento: / o sinal fica com a pousada" vem em destaque (Inter Display 900, 40 px) e o marca-texto limão passa por trás dela. No fim, "REGRA ENVIADA" carimba com o check. |
| 04 | trilha **02** · "Combine o horário / **de chegada.**" · apoio "Saber a hora evita esperar a noite inteira." | Um mostrador de 24 h acende a faixa 14h–22h em limão ("CHEGADA · 14H–22H"). O pino do hóspede percorre uma estrada sinuosa até o chalé, enquanto o ponteiro e o odômetro vão de 10H a 19H. A chegada acontece dentro da faixa, com um anel no ponto das 19h, e o chalé acende. |
| 05 | trilha **03** · "Passou do horário? / **Mande mensagem.**" · apoio "Às vezes é só um atraso na estrada." | Às 22:10 sai a mensagem "Tudo certo com a viagem?" (balões com texto de 38 px) e a cena se divide em dois caminhos, que acendem em sequência. "RESPONDEU" (limão) → "Pneu furado, chego 23h" → o chalé continua aceso. "NÃO RESPONDEU ATÉ 8H" (âmbar) → o relógio corre até 08:00 → o carimbo NO-SHOW bate sobre o chalé apagado. Os balões são genéricos, sem logos. |
| 06 | trilha **04** · "O sinal segue / **a regra combinada.**" · apoio "Combinado antes, sem discussão depois." | O cartão da reserva conta R$ 1.080 (3 NOITES × R$ 360) e se parte em duas metades. O SINAL (R$ 540, limão) cai na gaveta do caixa, e o SALDO desce para a direita, esmaece e ganha um risco. O final é uma conta em linha, centralizada. Em cima fica o contorno tracejado do cartão original (RESERVA · CHALÉ 3 · R$ 1.080), de onde partem duas setas. Embaixo à esquerda, a gaveta maior e entreaberta, com a plaqueta "R$ 540" visível dentro e o rótulo RETIDO (limão). Embaixo à direita, do mesmo tamanho e alinhado com ela, o SALDO R$ 540 riscado com NÃO COBRADO (cinza). Os valores aparecem em odômetro. |
| 07 | trilha **05** · "Libere as noites / **que sobraram.**" · apoio "Noite livre ainda pode ser vendida." | Uma faixa de três dias. O 26/12 recebe o carimbo NO-SHOW. Os cadeados do 27/12 e do 28/12 abrem com estalo e os dias ficam LIVRE. Chega o balão "Tem vaga 27 e 28?" e os dois dias viram RESERVADO (limão). O contador "VOLTOU A VENDER" rola até R$ 720 (2 NOITES × R$ 360). |
| 08 | "Regra combinada antes, / **decisão tranquila depois.**" · "Salva pra montar a sua política de no-show." · @fazlohospeda | A confirmação com a regra marcada (03), o relógio com a faixa (04) e o cadeado aberto (07), em miniatura, entram de profundidades diferentes. Eles se juntam na folha "POLÍTICA DE NO-SHOW" (regra na confirmação · chegada até 22h · mensagem se atrasar · sinal conforme a regra · noites liberadas). A folha se inclina e o ícone de salvar pulsa na frente dela. |

## Render e conferência

```bash
cd carrosseis/no-show
node scripts/render.cjs               # os 8 MP4 + output/png/ (o estado final de cada cena)
python3 scripts/conferencia.py        # output/revisao/conferencia.txt (os 8) e conferencia-NN.txt
python3 scripts/previa.py             # output/previa.jpg + output/revisao/capa-na-grade.jpg
python3 scripts/storyboard.py         # output/revisao/storyboard.jpg
python3 scripts/recortes.py           # output/revisao/02, 03, 05 e 06-recorte.jpg
```

**A conferência (por slide)** mede nos próprios MP4 e nos quadros do motor:
- **ffprobe:** formato, duração e tamanho.
- **Margens e canto:** margens de 80 px e o canto do som livre, a cada 0,1 s.
- **Texto fixo:** o texto do topo fica idêntico ao quadro 0.
- **Loop:** o último quadro bate com o quadro 0.
- **Valores:** só R$ 360, 540, 720 e 1.080.
- **Contas:** 3 × 360 = 1.080; 50% = 540; 1.080 − 540 = 540; 2 × 360 = 720.

**NOVA (todas as cenas): os toques.**
- **O que é medido:** em cada quadro (todos, não só o estado final), o motor registra a caixa de cada texto, balão, selo, carimbo, etiqueta e odômetro. As caixas já vêm com a escala, a rotação e a posição da mola (`node scripts/render.cjs elems <n>`).
- **Como se mede:** a conferência mede a distância entre os polígonos de verdade (os 4 cantos, com a rotação) e também a distância até o texto fixo.
- **Quando reprova:** se qualquer par se tocar ou ficar a menos de 10 px.
- **Exceção:** o selo de canto preso de propósito ao próprio elemento (`junto(a, b)` no motor). Aqui é só o check colado ao carimbo "REGRA ENVIADA" (03).
- **Resultado:** os 8 slides passam em todos os quadros. O menor vão de cada um fica entre 15 e 40 px.

Na etapa 2, as entradas com mola do mostrador (04) e dos cartões dos dias (07) passaram a não crescer além do tamanho final: o excesso da mola encostava na margem por 1 ou 2 quadros. O anel das 19h (04) é recortado na margem.
