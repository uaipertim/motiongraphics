# Reel sem narração · "A caipirinha da piscina entrou na conta?"

Reel do FAZLO Hospeda: 1080×1920, 60 fps, **30,0 s**, **sem narração, só elementos gráficos**. É o primeiro vídeo do **[padrão definitivo dos vídeos só com elementos](../../PADRAO-ELEMENTOS.md)**. Ele foi refeito do zero: as versões anteriores (0c0a254, com telas, e 1028f25, a lista parada) ficam só no histórico do git.

**Não publicar antes do OK.**

▶ **Vídeo:** [`output/comanda.mp4`](output/comanda.mp4)
- Capa: [`output/capa.jpg`](output/capa.jpg) e [`output/capa-grade.jpg`](output/capa-grade.jpg) · prévia da linha da grade: [`output/revisao/previa-grade.jpg`](output/revisao/previa-grade.jpg)
- Folha de contato (2 quadros por segundo): [`output/revisao/folha-contato.jpg`](output/revisao/folha-contato.jpg)
- Revisão técnica, com a tabela do QA de movimento (v2 × este vídeo): [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt)
- Legenda do post: [`legenda.txt`](legenda.txt)

## Regras da série

- **Vídeo NARRADO** (voz da Raquel) → as telas reais do app no celular (ex.: [`fechar-caixa`](../fechar-caixa)).
- **Vídeo SEM narração** → só elementos gráficos vivos, sem tela, celular nem recorte do HTML. Segue [`reels/PADRAO-ELEMENTOS.md`](../../PADRAO-ELEMENTOS.md) e passa obrigatoriamente por [`reels/tools/qa_movimento.py`](../../tools/qa_movimento.py).

## Cenas (cortes na batida de 120 BPM)

| Tempo | Fundo | Manchete | Elemento principal |
|---|---|---|---|
| 0–3,5 s | escuro | A caipirinha da piscina / **entrou na conta?** | O copo de caipirinha gigante desenhando-se em traço limão, com gelo balançando e gotas caindo. "R$ 22,00" em mono grande bate a cada batida, e o "?" pulsa. Já está visível no quadro 0. |
| 3,5–6,0 s (desliza) | off-white | Bar, frigobar, / **restaurante…** | Copo, garrafa e prato entram um a um na batida, cada um com sua etiqueta (Bar da piscina · Frigobar · Restaurante) e o preço saltando (R$ 22,00 · R$ 6,00 · R$ 68,00). A câmera desliza rápido de um para o outro e recua mostrando os três. |
| 6,0–9,5 s (falha digital) | escuro | e **cada um anota** / de um jeito. | Bilhetes desencontrados girando e se espalhando: "Caipirinha · R$ 22,00" torto, "Água sem gás · 2 × R$ 6,00" rasurado, "Risoto de cogumelos · R$ 68,00" borrado. Eles se embaralham, e "Cerveja long neck · R$ 14,00" escapa e cai para fora do quadro. |
| 9,5–14,5 s (mergulho) | escuro, acentos limão | No FAZLO Hospeda, / tudo cai na **comanda / do hóspede.** | Os três ícones no alto ligados por curvas que convergem para a conta "Mariana Costa · Suíte Mirante": uma coluna de chips com a barra do Total. Por cada curva viaja um pulso, que vira um item ao chegar. A Cerveja que escapou volta pela lateral e entra, em cinza e riscada, sem somar. O Total conta até R$ 287,00. Em 12,0 s há um mergulho no número grande "R$ 287,00". |
| 14,5–20,0 s (cortina) | off-white | Lançou, **somou.** | Corte 1: "3 → 4" enorme, virando como placar, "× R$ 22,00", "R$ 66,00 → R$ 88,00". Corte 2 (deslize): "2 → 4", "× R$ 6,00", "R$ 12,00 → R$ 24,00". Corte 3: o chip "+ R$ 34,00" entra voando e bate, e o Total vai de R$ 287,00 a R$ 321,00, ocupando a largura do quadro. |
| 20,0–24,0 s (corte seco) | escuro | Cancelou? / **Continua registrado.** | O cartão "Cerveja long neck · Frigobar · 1 × R$ 14,00" grande. O risco atravessa animado e o selo "CANCELADO" é carimbado com tremor e som. Depois o cartão encolhe e volta para a coluna, que mostra o item cinza (não some), com o Total em R$ 321,00. |
| 24,0–27,5 s (desliza) | escuro → limão | No check-out, / a conta **já está pronta.** | A coluna se compacta num único cartão "Total R$ 321,00" gigante, que fecha com o check desenhado em limão. No fim, a cortina verde-limão sobe. |
| 27,5–30,0 s (cortina) | verde-limão | — | A marca FAZLO Hospeda (marca/logo) se monta num cartão escuro: a palavra se revela e a pílula salta. Sem círculo, sem órbita. |

## Como é feito

- **Peças** (`src/anim.js`, DOM + SVG): nenhuma imagem além da marca.
  - **Ícones:** desenhados no traço da marca (linha única, pontas arredondadas) e animados no traço: copo com gelo e gotas, garrafa e prato. A comanda e o check vêm de `marca/icones`.
  - **Conta:** peça própria, uma coluna de chips com a barra do Total.
  - **Números:** em Geist Mono e textos em Geist.
  - **Manchetes:** Inter Display 900, 84 px, no alto, à esquerda. A palavra-chave fica em limão no escuro e em verde `#4E8800` no off-white.
  - **Paleta:** preto, off-white e verde-limão.
- **Valores:** os da comanda real da Mariana Costa (pacote 08-comanda, estados 02 e 04), conferidos pelo `scripts/qa.py` contra o HTML.
  - Caipirinha 3 × R$ 22,00 = R$ 66,00 → 4 × = R$ 88,00.
  - Água sem gás 2 × R$ 6,00 = R$ 12,00 → 4 × = R$ 24,00.
  - Cerveja long neck 4 × R$ 14,00; Risoto de cogumelos 2 × R$ 68,00; Suco de laranja 1 × R$ 17,00.
  - Cerveja long neck 1 × R$ 14,00 cancelada (não soma).
  - Total R$ 287,00 → R$ 321,00 (+ R$ 34,00).
- **Sempre vivo:**
  - deriva lenta da câmera em cada cena;
  - partículas;
  - ícones balançando;
  - números batendo na batida.
- **Transições:** deslize, falha digital, mergulho, cortina, corte seco com clarão, todas na batida.
- **Som** (`scripts/audio.py`):
  - a trilha com energia da apresentação (nu-disco a 120 BPM), posta nesta linha do tempo: introdução filtrada na cena 1, o groove entrando na cena 2 e a quebra com o acorde aberto na marca;
  - efeitos em cada corte e gesto, vindos de `audio/eventos.json`;
  - mix em −14 LUFS, pico ≤ −1,5 dBTP.

## Rodar

```bash
cd reels/educativo/comanda
node scripts/render.cjs dados --fps 30       # eventos do som + dados do QA
python3 scripts/audio.py                     # audio/mix.wav
node scripts/render.cjs video --workers 4    # output/comanda.mp4
cd ../../.. && node reels/tools/capa_grade.cjs reels/educativo/comanda \
  && python3 reels/tools/revisao_capa.py reels/educativo/comanda --saida reels/educativo/comanda/output/grade --vizinhos reels/educativo/fechar-caixa/output/grade reels/educativo/reserva-whatsapp/output/grade
cd reels/educativo/comanda && cp output/grade/capa.jpg output/capa-grade.jpg && cp output/grade/capa.jpg output/capa.jpg && cp output/grade/revisao/capa-no-feed.jpg output/revisao/previa-grade.jpg
python3 ../../tools/qa_movimento.py output/comanda.mp4 --logo-final 0.8   # obrigatório
python3 scripts/folha.py && python3 scripts/qa.py                          # o relatório já inclui o QA de movimento
```
