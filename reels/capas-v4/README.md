# Capas v4 dos Reels do FAZLO Hospeda

Ajuste fino das [capas v3](../capas-v3), que tinham passado do ponto: limão 2–4%, halo 1–2% e ilustração pequena e quase toda cinza. A v4 chega às medidas das capas da @fazlodigital. A v3 continua intacta, para comparar.

**O que fica da v3:**
- traço único e nítido;
- fundo com tom e textura;
- chip logo acima do título;
- título protagonista (≥ 110 px, de 2 a 4 linhas, quebra automática).

## O que muda na v4

1. **Escala:** a ilustração ficou ~1,8× maior.
   - Ela é medida pelo seu contorno real e cresce até bater o primeiro destes limites: 60% da largura útil (960 px) ou 29% da altura do recorte 3:4.
   - Os desenhos largos chegam a ~60% da largura (02, 09, 14).
   - Os desenhos altos param na altura, em 28–29%, e ficam com 33–54% da largura.
   - Onde precisou, o título encolheu, sem passar do mínimo de 110 px.
2. **Cor:** a ilustração voltou a ser majoritariamente limão.
   - `L()` desenha o elemento principal e `G()` o resto do objeto, ambos em limão.
   - `D()` desenha em cinza só os detalhes pequenos:
     - os tracinhos dos calendários (03 e 07);
     - as estrelas (04);
     - os cubos de gelo e a fatia (08);
     - as linhas internas da notinha (10);
     - as marcas do relógio (11).
   - O preenchimento translúcido (`F()`, 24%) continua em uma área de cada desenho.
3. **Brilho:** halo moderado no traço e no texto limão (50%, raio 30 px), maior que o da v3 (35%, 14 px) e menor que o da v2. Atrás da ilustração há um brilho difuso radial, que entra só o necessário para a meta de halo.
4. **Metas por capa:** limão 4,5–6% e halo 4–6%.
   - A medida é feita no **quadro inteiro 1080×1920**, o mesmo critério da comparação com as capas da Fazlo. A v3 media o recorte 3:4.
   - A calibragem é automática, por busca binária em cada capa:
     - a espessura do traço limão (`esp`, ×1,0–1,5) até o limão bater ~5,2%;
     - o brilho difuso (`brilho`, 0–0,4) até o halo bater ~5%.

## As capas

Cada uma está em `<id>/output/capa.jpg`. A conferência fica em `<id>/output/revisao/`:
- `capa.txt` e `capa-no-feed.jpg`, da regra de capas;
- `medidas.json`, com a % de limão e de halo, a espessura e o brilho calibrados, o corpo e as linhas do título, e o tamanho da ilustração.

Todas passaram na regra de capas: recorte 3:4 com folga de 60 px, canto do play livre e faixa do contador livre.

| Capa | Limão | Halo | Traço ×, brilho | Título | Ilustração (largura útil × altura 3:4) |
|---|---|---|---|---|---|
| [01 · Ele pagou metade.](01-ele-pagou-metade/output/capa.jpg) | 5,2% | 5,0% | 1,34 · 0,29 | 156 px · 4 linhas | 42% × 28% |
| [02 · Sinal, saldo e crédito.](02-sinal-saldo-credito/output/capa.jpg) | 4,8% | 5,0% | 1,50 · 0,32 | 173 px · 2 linhas | 60% × 22% |
| [03 · Diária de feriado](03-diaria-de-feriado/output/capa.jpg) | 5,2% | 5,0% | 1,42 · 0,25 | 156 px · 4 linhas | 42% × 28% |
| [04 · Chegou às 23h.](04-chegou-as-23h/output/capa.jpg) | 4,6% | 5,0% | 1,50 · 0,32 | 156 px · 4 linhas | 54% × 28% |
| [05 · Como nunca vender…](05-nunca-vender-duas-vezes/output/capa.jpg) | 5,2% | 5,0% | 1,20 · 0,30 | 131 px · 4 linhas | 33% × 29% |
| [06 · Dois hóspedes,](06-dois-hospedes-mesmo-chale/output/capa.jpg) | 5,2% | 5,0% | 1,50 · 0,40 | 127 px · 2 linhas | 47% × 29% |
| [07 · Faltam 12 dias](07-faltam-12-dias-finados/output/capa.jpg) | 5,2% | 4,9% | 1,28 · 0,16 | 161 px · 3 linhas | 54% × 29% |
| [08 · A comanda da piscina](08-comanda-da-piscina/output/capa.jpg) | 5,2% | 4,6% | 1,00 · 0,40 | 151 px · 4 linhas | 42% × 29% |
| [09 · 'Vou ver e te falo.'](09-vou-ver-e-te-falo/output/capa.jpg) | 4,8% | 5,0% | 1,50 · 0,20 | 176 px · 3 linhas | 59% × 29% |
| [10 · Check-out com](10-check-out-conta-errada/output/capa.jpg) | 4,8% | 5,0% | 1,50 · 0,40 | 126 px · 2 linhas | 40% × 29% |
| [11 · Domingo, 11h.](11-domingo-11h/output/capa.jpg) | 5,5% | 5,0% | 1,00 · 0,30 | 136 px · 3 linhas | 41% × 29% |
| [12 · Caiu um Pix às 14h.](12-caiu-um-pix/output/capa.jpg) | 4,5% | 4,6% | 1,50 · 0,40 | 144 px · 3 linhas | 43% × 29% |
| [13 · O hóspede chegou.](13-hospede-chegou/output/capa.jpg) | 4,9% | 5,0% | 1,50 · 0,19 | 133 px · 3 linhas | 44% × 29% |
| [14 · Fechou o mês e](14-fechou-o-mes/output/capa.jpg) | 5,2% | 5,0% | 1,32 · 0,29 | 156 px · 4 linhas | 58% × 28% |

**Prévia da grade:** [`previa-grade.jpg`](previa-grade.jpg) mostra as 14 v4 em 3 colunas, no recorte 3:4, e 2 capas v3 ao lado (01 e 08).

**Como a medida funciona** (no quadro inteiro, 1080×1920):
- **limão:** os pixels de limão sólido (traço e texto);
- **halo:** o verde que sobra, medido num render sem o preenchimento;
- **preenchimento:** a diferença entre os dois renders.

Na v4 o preenchimento costuma dar ~0%, porque ele fica dentro da área do brilho difuso e esses pixels já contam como halo. Ele continua no desenho.

## Uso

```bash
cd reels/capas-v4
node scripts/render.cjs              # todas, já calibradas (ou: node scripts/render.cjs 01-ele-pagou-metade)
python3 scripts/grade.py             # previa-grade.jpg
```

**Capa nova:** acrescente `{id, titulo[], chip, ilustracao}` em `capas.json`.
- Os campos opcionais são os mesmos da v3: `limao_desde`, `largura_titulo` e `max_titulo`.
- A ilustração nova é uma função em `ILUS` no [`src/capa.js`](src/capa.js):
  - `L()` e `G()` para os traços limão;
  - `D()` para os detalhes pequenos em cinza;
  - `F()` para o preenchimento translúcido;
  - `T()` para texto no desenho.
- O tamanho, a espessura e o brilho saem sozinhos na calibragem.
