# FAZLO Hospeda · Carrossel ANIMADO "Tarifa de dezembro: quando e quanto subir?" · Pilar DICA

**Piloto de carrossel animado:** um teste contra os carrosséis estáticos. Nada foi publicado.

Tema: tarifa de alta temporada definida antes de abrir as reservas. O conteúdo é educativo e os valores são um exemplo
fictício (selo "EXEMPLO FICTÍCIO" nos slides com valores). Não tem telas do app, CTA de venda nem logo grande.

Usa a identidade e o motor dos carrosséis estáticos: o mesmo [`consumo/`](../consumo), com cores, fontes, margem de
80 px, capa limão com texto preto (a regra fixa das capas, [`../README.md`](../README.md)), trilha de passos 01–05 e
cards com rótulo em mono.

**Formato:** 8 slides, cada um um vídeo MP4 de 1080×1350 (4:5), 7 s a 30 fps, H.264 yuv420p, com uma faixa de áudio
AAC silenciosa. Não tem trilha, narração nem legenda na tela.

▶ **Para postar, nesta ordem:** [`output/01.mp4`](output/01.mp4) (capa limão) · [`02.mp4`](output/02.mp4) ·
[`03.mp4`](output/03.mp4) · [`04.mp4`](output/04.mp4) · [`05.mp4`](output/05.mp4) · [`06.mp4`](output/06.mp4) ·
[`07.mp4`](output/07.mp4) · [`08.mp4`](output/08.mp4)

**Versão estática de segurança:** [`output/png/01.png`](output/png) … `08.png`, o último quadro de cada slide.

**Prévia** (quadros de 0 s, 1 s, 2,5 s e 6,9 s de cada slide): [`output/previa.jpg`](output/previa.jpg) ·
**Conferência:** [`output/revisao/conferencia.txt`](output/revisao/conferencia.txt) ·
**Legenda do post:** [`legenda.txt`](legenda.txt)

![prévia](output/previa.jpg)

## As regras da animação

- **Tempo:** a animação fica nos primeiros 2 s. De 2,5 s até 7 s o slide fica completo e parado para a leitura.
- **Movimento ambiente:** só a luz limão do fundo respira devagar. Ela volta igual em 7 s, então o loop não salta.
  Nada some no fim.
- **Tipos de movimento:** número contando, barras crescendo, item sendo marcado, cartão entrando com leve deslocamento
  e selo surgindo. Nenhum texto entra letra por letra; títulos e apoios já estão na tela desde o quadro 0.
- **Capa:** o quadro 0 já está completo e legível (é ele que aparece na grade e na prévia). O movimento fica em três
  lugares, todos voltando ao começo em 7 s:
  - a escala gravada ao fundo gira 20° (10 traços);
  - o pontinho do chip pulsa;
  - a seta do "ARRASTA →" dá um empurrãozinho a cada 1,75 s.
- **Canto do ícone de som:** os 140×140 px de baixo à direita ficam livres, porque é onde o Instagram põe o ícone de
  som no vídeo. Por isso o "ARRASTA →" e o texto de apoio sobem para y ≈ 1146–1166 (nos estáticos, ficam em 1252).
- **Selo "EXEMPLO FICTÍCIO":** no alto, à direita, na linha da trilha de passos (slides 04–07).

## Os slides

| # | Texto | Animação (até 2 s) |
|---|---|---|
| 01 | capa limão: chip "ALTA TEMPORADA" · "Tarifa de / dezembro: / quando e / quanto subir?" · "ARRASTA →" | completa no quadro 0; a escala do fundo, o pontinho do chip e a seta se mexem devagar |
| 02 | "Subir o preço em cima da hora assusta quem já perguntou." + "**Não subir deixa dinheiro na mesa.**" | a etiqueta "R$" sobe de repente (âmbar), com a seta; as moedas caem nas pilhas da mesa (limão) |
| 03 | trilha **01** · "Separe as datas / **por demanda.**" · apoio "Normal, alta e pico, cada uma com o seu valor." | a faixa de dezembro (31 dias) se pinta da esquerda para a direita: normal (cinza), alta (âmbar, 18–23 e 26–29), pico (limão, 24–25 e 30–31); depois, a legenda das três faixas |
| 04 | trilha **02** · "Defina o valor de cada / **faixa antes de abrir.**" · apoio "Preço pensado com calma, resposta rápida no WhatsApp." | barras crescendo e números contando: Normal R$ 300 · Alta R$ 360 (+20%) · Pico R$ 450 (+50%) |
| 05 | trilha **03** · "Reserva confirmada fica / **com o valor combinado.**" · apoio "Tabela nova vale só para reserva nova." | o cartão da reserva confirmada em outubro (R$ 300 → continua R$ 300) entra e ganha o check; o cartão limão da reserva nova de dezembro conta de R$ 300 até R$ 360 |
| 06 | trilha **04** · "A mesma tabela / **em todo lugar.**" · apoio "WhatsApp, Instagram e recepção falando o mesmo preço." | três etiquetas entram uma depois da outra: WHATSAPP · INSTAGRAM · RECEPÇÃO, todas com R$ 360 |
| 07 | trilha **05** · "Anote como / **cada faixa vendeu.**" · apoio "É essa anotação que ajusta a tabela do ano que vem." | barras de ocupação crescendo, com os números contando: Normal 55% · Alta 80% · Pico 100% |
| 08 | "Preço definido antes, / **resposta rápida depois.**" · "Salva pra montar a sua tabela." · @fazlohospeda pequeno | o traço limão embaixo do título se desenha; o selo de salvar (o marcador) surge |

**Contas:** 300 × 1,20 = 360 e 300 × 1,50 = 450.

## Render e conferência

```bash
cd carrosseis/tarifa-alta-temporada
node scripts/render.cjs      # os 8 MP4 + output/png/ (último quadro) + output/revisao/linhas.txt
python3 scripts/previa.py    # output/previa.jpg + output/revisao/conferencia.txt + capa-na-grade.jpg
```

O render é o mesmo pipeline dos Reels educativos (`reels/educativo/<reel>/scripts/render.cjs`):

1. um servidor estático serve `src/`;
2. o Chromium (Playwright) abre `src/index.html?render`;
3. `window.frameAt(n, t)` desenha cada quadro no canvas;
4. as capturas vão para o ffmpeg (libx264, CRF 18, yuv420p, `+faststart`), com a faixa AAC silenciosa (`anullsrc`).

Aberto no navegador sem `?render`, o `index.html` mostra os 8 slides animando em loop.

A conferência mede tudo nos próprios MP4 (os quadros saem pelo ffmpeg):

- **ffprobe:** resolução, fps, duração, codec, faixa de áudio e tamanho (< 15 MB).
- **Margens e canto do som:** conferidos a cada 0,1 s: conteúdo em x 80–1000 e nada em x ≥ 940, y ≥ 1210.
- **Estabilidade:** depois de 2,5 s, nenhum pixel muda mais de 40 níveis de brilho. Há uma tolerância de 50 px para
  o ruído do H.264.
- **Capa:** o quadro 0 já tem o título inteiro.
