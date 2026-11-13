# Reel sem narração · "A caipirinha da piscina entrou na conta?"

Reel do FAZLO Hospeda: 1080×1920, 60 fps, **32,0 s**, **sem narração e só com elementos gráficos**. A mensagem vem de textos curtos na tela.

**Não publicar antes do OK.**

▶ **Vídeo:** [`output/comanda.mp4`](output/comanda.mp4)
- Capa: [`output/capa.jpg`](output/capa.jpg) e [`output/capa-grade.jpg`](output/capa-grade.jpg) · prévia da linha da grade (com o "Faltou dinheiro no caixa?" e o "Recebeu uma reserva pelo WhatsApp?"): [`output/revisao/previa-grade.jpg`](output/revisao/previa-grade.jpg)
- Folha de contato (1 quadro por segundo + os momentos-chave): [`output/revisao/folha-contato.jpg`](output/revisao/folha-contato.jpg)
- Revisão técnica: [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt)
- Legenda do post: [`legenda.txt`](legenda.txt)

## Regra da série (vale daqui para frente)

- **Vídeo NARRADO** (voz da Raquel) → usa as **telas reais do app dentro do celular** (como o [`fechar-caixa`](../fechar-caixa)).
- **Vídeo SEM narração**, só com elementos → **não usa telas, celular nem recortes do HTML.**
  - Só elementos gráficos vivos: cartões, chips, números, contadores, linhas e ícones de linha da marca.
  - A energia e a interação podem seguir o Reel "Toda estadia é um ciclo", mas sem copiar o visual dele: nada de anel, ciclo ou a composição.

Este Reel é sem narração. A versão anterior (0c0a254) usava a comanda real no celular e foi refeita sem nenhuma tela.

## Cenas

| Tempo | Texto na tela | O que acontece |
|---|---|---|
| 0–3,6 s | A caipirinha da piscina / **entrou na conta?** | O cartão "Caipirinha · Bar da piscina · R$ 22,00" aparece sozinho no escuro, girando em 3D leve, com o "?" limão pulsando. Já está visível no quadro 0. |
| 3,65–9,05 s | Bar, frigobar, restaurante… · e **cada um anota** / de um jeito. | As etiquetas "Bar da piscina", "Frigobar" e "Restaurante" se espalham. Os cartões de Água sem gás, Cerveja long neck e Risoto de cogumelos voam desencontrados entre elas. Em 6,7 s a Cerveja escapa pela lateral esquerda. |
| 9,1–15,2 s | No FAZLO Hospeda, · tudo cai na **comanda** / **do hóspede.** | No centro monta-se a comanda gráfica: um painel com "Mariana Costa · Suíte Mirante" no topo e o ícone de comanda da marca. Os cartões voam e encaixam empilhados, um a um, cada encaixe com pulso e som: Caipirinha, Água sem gás, Cerveja long neck (que volta pela esquerda), Risoto de cogumelos, Suco de laranja e Cerveja long neck 1 ×. O contador grande do "Total" soma a cada encaixe até R$ 287,00 e salta. |
| 15,25–23,95 s | Lançou, **somou.** | Os chips "+1 Caipirinha" e "+2 Água sem gás" entram voando e batem nos cartões. As quantidades viram (3 → 4 e 2 → 4) e os valores trocam (R$ 66,00 → R$ 88,00; R$ 12,00 → R$ 24,00). O Total conta de R$ 287,00 até R$ 321,00, e o número salta. |
| 23,95–26,9 s | Cancelou? / **Continua registrado.** | O cartão "Cerveja long neck · 1 × R$ 14,00" recebe o risco e o selo "Cancelado" e continua na pilha. |
| 27,07–32,0 s | No check-out, / a conta **já está pronta.** | A pilha se fecha num cartão final grande, "Total R$ 321,00", com o check em verde-limão. Depois entra a marca FAZLO Hospeda (`marca/logo`, versão para fundo escuro). |

## Como é feito

- **Peças gráficas** (`src/anim.js`, DOM + CSS 3D; nenhuma imagem de tela):
  - **Cartão de consumo:** fundo off-white, cantos de 26 px, filete limão à esquerda, nome em Geist, origem com ponto limão, quantidade × preço e valor em Geist Mono.
  - **Etiquetas:** pílulas com contorno off-white e ponto limão.
  - **Painel da comanda:** escuro, com o ícone `comandas` da marca, e o contador em Geist Mono limão.
  - **Chips "+1/+2":** limão.
  - **Cancelado:** risco reto e selo "Cancelado".
  - **Cartão final:** com o ícone `check` da marca.
  - A paleta da marca é preto, off-white e limão.
- **Valores:** são os da comanda real da Mariana Costa (pacote 08-comanda, estados 02 e 04), conferidos pelo `scripts/qa.py` contra o HTML do pacote.
  - O cartão cancelado (Cerveja long neck 1 ×) aparece com o valor em cinza e não entra na soma, como no app: 66 + 12 + 56 + 136 + 17 = R$ 287,00.
  - Depois dos lançamentos: 88 + 24 + 56 + 136 + 17 = R$ 321,00.
- **Movimento:** o das cenas aprovadas (o giro do gancho, o voo desencontrado, a Cerveja que escapa e volta), com elástico suave, sombras e perspectiva.
- **Textos de tela:** a tipografia e o estilo da legenda aprovada (Inter Display 900, 64 px, palavra-chave em limão, sem faixa), nas linhas y 1442/1516.
  - Centralizados pelo texto final.
  - Cada texto fica pelo menos 1,2 s + 0,3 s por palavra, e um sai antes do próximo entrar.
  - Quebras só em pausa natural.
- **Som** (`scripts/audio.py`):
  - a trilha dos educativos, sem ducking porque não há voz;
  - efeitos sutis vindos de `audio/eventos.json`: pulso, etiquetas, voos, queda, painel, encaixes, chips, contagem, risco, selo, fechamento, check e marca;
  - master em −14 LUFS, pico ≤ −1,5 dBTP no MP4.

## Rodar

```bash
cd reels/educativo/comanda
node scripts/render.cjs dados --fps 30       # eventos do som + dados do QA
python3 scripts/audio.py                     # audio/mix.wav
node scripts/render.cjs video --workers 4    # output/comanda.mp4
cd ../../.. && node reels/tools/capa_grade.cjs reels/educativo/comanda \
  && python3 reels/tools/revisao_capa.py reels/educativo/comanda --saida reels/educativo/comanda/output/grade --vizinhos reels/educativo/fechar-caixa/output/grade reels/educativo/reserva-whatsapp/output/grade
cd reels/educativo/comanda && cp output/grade/capa.jpg output/capa-grade.jpg && cp output/grade/capa.jpg output/capa.jpg && cp output/grade/revisao/capa-no-feed.jpg output/revisao/previa-grade.jpg
python3 scripts/folha.py && python3 scripts/qa.py
```
