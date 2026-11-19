# FAZLO Hospeda · Carrossel "Checklist do check-out" · Pilar DICA

Tema: "Checklist do check-out sem surpresa." É o par do [Carrossel 04](../carrossel-04) ("Checklist do check-in"):
- a capa segue a mesma construção em 3 linhas;
- o card do slide 02 usa o desenho do card de chegada de lá, agora de saída;
- os chips com check do slide 06 repetem os do slide 05 de lá.

É conteúdo educativo, feito a partir do carrossel aprovado [Quarto vendido duas vezes?](../overbooking) (d76e21f), que segue o [Réveillon na pousada](../reveillon). Usa o mesmo motor, cores, fontes, margem de 80 px, trilha de passos 01–05 e bolha limão do "VOCÊ". Segue também o padrão fechado neles:
- capa limão com texto preto, no maior corpo que cabe;
- nos slides com card, o dado é o destaque: valor em corpo grande e rótulo em mono acima, centrado entre o título e o apoio.

Além disso:
- Não mostra telas do sistema.
- Os dados variáveis aparecem como `[campos]` em mono.
- Não tem CTA de venda nem emojis nos slides.

**Formato:** 8 slides 1080×1350 (4:5), em PNG.

▶ **Para postar, nesta ordem:** [`output/01.png`](output/01.png) (capa limão) · [`02.png`](output/02.png) · [`03.png`](output/03.png) · [`04.png`](output/04.png) · [`05.png`](output/05.png) · [`06.png`](output/06.png) · [`07.png`](output/07.png) · [`08.png`](output/08.png)

**Prévia:** [`output/previa.jpg`](output/previa.jpg) · **Revisão:** [`output/revisao/`](output/revisao) · **Legenda do post:** [`legenda.txt`](legenda.txt)

![prévia](output/previa.jpg)

## Os slides

| # | Título (em negrito, o trecho limão) | Meio |
|---|---|---|
| 01 | "Checklist / do check-out / sem surpresa." (capa limão, texto preto, quebra do roteiro como no Carrossel 04) | chip "GUIA RÁPIDO · SALVA ESSE" · "ARRASTA →" |
| 02 | "Mala na porta. / **E a conta ainda aberta.**" | card "CHALÉ 3 · SAÍDA" com "11:52" em 132 px e o carimbo âmbar "CONTA ABERTA" inclinado sobre o canto · apoio: "Check-out bom é o que dura dois minutos." |
| 03 | trilha **01** · "Feche o consumo / **na noite anterior.**" | card em destaque: CONSUMO DO CHALÉ 3 · **`[R$ 86,00]`** (120 px), com os chips pequenos "frigobar", "bar" e "restaurante" embaixo · apoio: "Conta revisada com calma não vira discussão na saída." |
| 04 | trilha **02** · "Avise o valor / **antes da hora de sair.**" | bolha VOCÊ grande, centrada: "Bom dia, `[nome]`! Seu check-out é até as `[12h]`. O consumo da estadia ficou em `[R$ 86,00]`. Pode acertar por `[Pix ou cartão]` quando quiser." · apoio: "Hóspede avisado chega no balcão pronto pra pagar." |
| 05 | trilha **03** · "Receba e registre / **no mesmo momento.**" | card em destaque: SALDO DO CHALÉ 3 · **R$ 0,00** (130 px), com o selo limão "QUITADO" ao lado do valor · apoio: "Saldo zero antes de liberar a saída." |
| 06 | trilha **04** · "Chave devolvida, / **acomodação conferida.**" | chips grandes com check: CHAVE · CONTROLE · TOALHAS · FRIGOBAR · ITENS ESQUECIDOS e, em destaque limão, CONFERIDO · apoio: "Conferir com o hóspede ainda ali evita mensagem chata depois." |
| 07 | trilha **05** · "Agradeça / **e peça a avaliação.**" | bolha VOCÊ: "Obrigado pela estadia, `[nome]`! Se puder deixar sua opinião no Google, ajuda muito a gente: `[link]`. Volte sempre!" · apoio: "Avaliação pedida na hora certa vira a próxima reserva de alguém." |
| 08 | "Check-out tranquilo / **começa na noite anterior.**" | apoio: "Salva pra usar na próxima saída e manda pra quem cuida da recepção aí." · logo |

**Capa:** o título fica em 3 linhas, no maior corpo que cabe dentro da margem. "sem surpresa." ocupa a largura toda, então a letra sai um pouco menor que a da capa do Carrossel 01.

**Tamanho do valor em destaque (03 e 05):** fica entre 120 e 130 px, 3× a 3,25× os 40 px do texto do card comum.

## Revisão

```bash
cd carrosseis/checkout
node scripts/render.cjs      # os 8 slides + output/revisao/linhas.txt (nenhuma palavra sozinha numa linha)
python3 scripts/previa.py    # prévia, margens (80 px) e a capa na grade do perfil (recorte 3:4)
```

**Resultado:**
- **Margens:** os 8 slides ficam dentro dos 80 px ([`margens.txt`](output/revisao/margens.txt)).
- **Linhas:** nenhuma palavra sozinha numa linha ([`linhas.txt`](output/revisao/linhas.txt)).
- **Capa na grade:** o título fica inteiro no recorte 3:4 ([`capa-na-grade.jpg`](output/revisao/capa-na-grade.jpg)).
