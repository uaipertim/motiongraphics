# Capas v3 dos Reels do FAZLO Hospeda

As mesmas 14 capas e os mesmos textos das [capas v2](../capas-v2), com o modelo refeito para não ficar "opaco": menos limão e menos brilho, fundo com tom e o título como protagonista. A v2 continua intacta, para comparar.

## Regras do modelo (medidas pela revisão de cada capa)

1. **Traço:** único e nítido, 11 px, pontas arredondadas, cor sólida. Nada de tubo duplo.
2. **Brilho:** halo curto e suave (raio 14 px, 35%) só no traço limão. **Metas: limão ≤ 6% e halo ≤ 6% do recorte 3:4.**
3. **Hierarquia:** só o elemento principal em limão `#AFFA27`; os detalhes em cinza (`#5E5E59`–`#8E8E88`).
4. **Preenchimento:** uma área de cada ilustração em limão translúcido (16–30%), para dar corpo.
5. **Fundo:** gradiente escuro com leve tom, alternando verde-petróleo (`#0A1714 → #060707`) e azul-noite (`#0A0F1A → #060707`) na ordem do JSON, com uma grade de pontinhos (24 px, 5%) e vinheta.
6. **Proporção:**
   - A ilustração ocupa 28–31% da altura do recorte 3:4.
   - O **título** é o protagonista: Inter Display 900, sem caixa alta, **≥ 110 px**, de 2 a 4 linhas, com a 2ª parte em limão.
   - A quebra é automática: as palavras brancas e as limão nunca dividem uma linha, e nenhuma palavra curta fica sozinha.
   - O chip da série fica logo acima do título; a logo, pequena, no topo.
7. **Regra de capas** do [`../README.md`](../README.md): recorte 3:4 com folga de 60 px, canto do play e faixa do contador livres. A conferência roda em cada capa.

## As capas

Cada uma em `<id>/output/capa.jpg`, com a conferência em `<id>/output/revisao/` (`capa.txt`, `capa-no-feed.jpg` e `medidas.json`, com a % de limão, de halo e de preenchimento, o corpo e as linhas do título e a altura da ilustração).

| Capa | Limão | Halo | Título |
|---|---|---|---|
| [01 · Ele pagou metade.](01-ele-pagou-metade/output/capa.jpg) | 4,5% | 0,3% | 156 px · 4 linhas |
| [02 · Sinal, saldo e crédito.](02-sinal-saldo-credito/output/capa.jpg) | 3,8% | 0,2% | 173 px · 2 linhas |
| [03 · Diária de feriado](03-diaria-de-feriado/output/capa.jpg) | 5,4% | 0,4% | 156 px · 4 linhas |
| [04 · Chegou às 23h.](04-chegou-as-23h/output/capa.jpg) | 4,3% | 0,2% | 156 px · 4 linhas |
| [05 · Como nunca vender…](05-nunca-vender-duas-vezes/output/capa.jpg) | 5,8% | 0,6% | 131 px · 4 linhas |
| [06 · Dois hóspedes,](06-dois-hospedes-mesmo-chale/output/capa.jpg) | 3,5% | 0,3% | 127 px · 2 linhas |
| [07 · Faltam 12 dias](07-faltam-12-dias-finados/output/capa.jpg) | 4,2% | 0,3% | 161 px · 3 linhas |
| [08 · A comanda da piscina](08-comanda-da-piscina/output/capa.jpg) | 5,9% | 0,3% | 151 px · 4 linhas |
| [09 · 'Vou ver e te falo.'](09-vou-ver-e-te-falo/output/capa.jpg) | 3,9% | 0,3% | 176 px · 3 linhas |
| [10 · Check-out com](10-check-out-conta-errada/output/capa.jpg) | 3,1% | 0,2% | 126 px · 2 linhas |
| [11 · Domingo, 11h.](11-domingo-11h/output/capa.jpg) | 5,5% | 0,3% | 136 px · 3 linhas (`max_titulo` 136, para o limão ficar ≤ 6%) |
| [12 · Caiu um Pix às 14h.](12-caiu-um-pix/output/capa.jpg) | 4,2% | 0,3% | 144 px · 3 linhas |
| [13 · O hóspede chegou.](13-hospede-chegou/output/capa.jpg) | 3,6% | 0,4% | 133 px · 3 linhas |
| [14 · Fechou o mês e](14-fechou-o-mes/output/capa.jpg) | 5,2% | 0,3% | 156 px · 4 linhas |

**Prévia da grade:** [`previa-grade.jpg`](previa-grade.jpg), com as 14 v3 em 3 colunas, no recorte 3:4, e 3 capas v2 ao lado (01, 05 e 08).

**Medida:** é feita no recorte 3:4 (1080×1440):
- **limão:** pixels do limão sólido (traço e texto);
- **halo:** o verde que sobra, medido num render sem o preenchimento;
- **preenchimento:** a diferença entre os dois.

## Uso

```bash
cd reels/capas-v3
node scripts/render.cjs              # todas (ou: node scripts/render.cjs 01-ele-pagou-metade)
python3 scripts/grade.py             # previa-grade.jpg
```

**Capa nova:** em `capas.json`, acrescente `{id, titulo[], chip, ilustracao}`.
- Opcionais: `limao_desde` (padrão 1), `largura_titulo` (padrão 900) e `max_titulo` (padrão 176).
- Ilustração nova é uma função em `ILUS` no [`src/capa.js`](src/capa.js): `L()` para o traço limão do elemento principal, `G()` para os detalhes em cinza, `F()` para o preenchimento translúcido e `T()` para texto no desenho.
