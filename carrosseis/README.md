# FAZLO Hospeda — carrosséis

Carrosséis estáticos para o Instagram da @fazlohospeda, com a mesma identidade dos Reels ([`../reels/`](../reels)): preto `#0A0A0A`, verde-limão `#AFFA27`, branco, Inter Display 900 nos títulos e JetBrains Mono NL nos chips e dados. Cada carrossel vive numa pasta independente, com os slides, a prévia, a revisão e todos os arquivos-fonte.

| Carrossel | Pilar | Tema | Slides | Capa | Pasta |
|---|---|---|---|---|---|
| **01** | DICA | "Como cobrar o sinal sem constrangimento" | 8 · 1080×1350 (4:5) | `01-limao.png` (limão) · `01.png` (preta, reserva) | [`carrossel-01/`](carrossel-01) |
| **02** | DICA | "5 respostas prontas pro ‘tem vaga?’" | 8 · 1080×1350 (4:5) | `01.png` (limão) | [`carrossel-02/`](carrossel-02) |
| **03** | DICA | "Política de cancelamento sem briga" | 8 · 1080×1350 (4:5) | `01.png` (limão) | [`carrossel-03/`](carrossel-03) |
| **04** | DICA | "Checklist do check-in" | 8 · 1080×1350 (4:5) | `01.png` (limão) | [`carrossel-04/`](carrossel-04) |

## Capas — regra fixa (a partir de outubro de 2026)

Decidida na escolha da capa do Carrossel 01, para a grade do perfil separar os formatos de cara:

- **Carrosséis do pilar DICA → capa em fundo verde-limão `#AFFA27` com texto preto**, no estilo de [`carrossel-01/output/01-limao.png`](carrossel-01/output/01-limao.png):
  - fundo `#AFFA27` chapado, com a escala gravada ao fundo (a mesma do cartão "Controle de caixa" do Reel 03), em `#5A8A0E` a 30–55% — textura discreta, nunca disputa com o texto;
  - título em Inter Display 900, **preto** `#0A0A0A`, todas as linhas (o destaque em limão das capas escuras vira preto: o limão já é o fundo);
  - chip do topo em JetBrains Mono, contorno e texto pretos, sem preenchimento;
  - "ARRASTA →" em preto, alinhado à margem direita;
  - mesmas margens e mesma hierarquia dos outros slides: 80 px nas laterais (a grade mostra o centro 3:4 do post 4:5, cortando ~34 px de cada lado), título grande, nada cortado.
- **Os slides internos** continuam no preto da série (`#0A0A0A`), como os do Carrossel 01.
- **Reels → capa em fundo preto, como hoje** (regra das capas dos Reels em [`../reels/README.md`](../reels/README.md)).

Na conferência (`scripts/previa.py` de cada carrossel), a margem da capa limão conta o que se destaca do limão — a escala gravada ao fundo não conta — e a prévia lado a lado usa a capa limão como slide 1.
