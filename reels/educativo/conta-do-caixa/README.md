# Educativo · "Vai fechar o caixa? Faça esta conta antes."

Reel educativo do @fazlohospeda, no mesmo modelo, pipeline e DNA do [reserva-whatsapp](../reserva-whatsapp): narração da Raquel, ficha de papel com borda serrilhada, carimbo, avião e logo final com a sineta.

**Não é demonstração do sistema:**
- Não mostra a interface do FAZLO Hospeda, nem nome de hóspede.
- Os valores são ilustrativos. O selo "EXEMPLO FICTÍCIO" aparece em todo quadro com dado.
- Não promete resultado nem integração.

▶ **Vídeo:** [`output/conta-do-caixa.mp4`](output/conta-do-caixa.mp4) (31,3 s, 1080×1920, 60 fps). **Para aprovação: não publicar antes do OK.**
- Capa (quadro 0): [`output/capa.jpg`](output/capa.jpg) · capa da grade: [`output/capa-grade.jpg`](output/capa-grade.jpg) · prévia na linha da grade: [`output/revisao/previa-grade.jpg`](output/revisao/previa-grade.jpg)
- Folha de contato (2 quadros por segundo): [`output/revisao/folha-contato.jpg`](output/revisao/folha-contato.jpg)
- Revisão técnica: [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt) (sincronia de cada gesto × palavra, divisão da legenda, zonas, som, varredura de texto e a conta conferida)
- Legenda do post: [`legenda.txt`](legenda.txt)

## A conta (exemplo fictício)

| | |
|---|---|
| Troco de abertura | R$ 200,00 |
| + Entradas em dinheiro | R$ 125,00 |
| − Saídas da gaveta | R$ 40,00 |
| **= Deveria ter** | **R$ 285,00** |
| Contado | R$ 270,00 |
| Diferença | falta R$ 15,00 |
| Motivo | troco devolvido sem registro |

Pix (R$ 900,00) e cartão (R$ 500,00) são ilustrativos e ficam fora da soma: não estão na gaveta.

## Cenas (no tempo da locução)

| Tempo | Locução | Tela |
|---|---|---|
| 0,0–3,4 s | "Vai fechar o caixa da pousada? Antes," | Capa: marca, chip "ANTES DE FECHAR", título "Vai fechar / o caixa? / **Faça esta / conta antes.**" e a gaveta do caixa em traço limão. A gaveta abre com um tranco em "caixa". |
| 3,4–4,9 s | "faça esta conta." | Em "faça", o título encolhe e sobe. A ficha "CONFERÊNCIA DO CAIXA" entra com o selo "EXEMPLO FICTÍCIO", com as linhas apagadas. |
| 4,9–14,7 s | troco · dinheiro · saiu · deveria estar | Cada linha acende na própria frase, o valor é escrito e o check entra na palavra-chave. Em "deveria estar", a linha da soma é traçada, o valor conta até R$ 285,00 e a linha fica limão. |
| 14,7–19,1 s | "Pix e cartão ficam fora dessa conta: eles não estão na gaveta." | Os selos "PIX · R$ 900,00" e "CARTÃO · R$ 500,00" voam para dentro da ficha. Em "fora dessa conta" são riscados ("FORA DA CONTA") e empurrados para fora. Em "não estão", a gaveta pisca vazia deles: "NA GAVETA: SÓ DINHEIRO". |
| 19,1–25,1 s | "Agora conte o dinheiro. Se der diferença, anote o motivo na hora, enquanto ainda lembra." | "Contado" conta até R$ 270,00. "Diferença · falta R$ 15,00" acende em âmbar, com pulso. O motivo é escrito à mão em "anote". O carimbo "CONFERIDO" bate em "lembra". |
| 25,1–28,1 s | "Mande para quem fecha o caixa da sua pousada." | A ficha desliza para fora. "Mande / para quem fecha / o caixa da / sua pousada." entra com o avião. Sem legenda: a cena já mostra a frase. |
| 28,1–31,3 s | — | Logo do FAZLO Hospeda e @fazlohospeda, com a sineta, 0,7 s depois da última palavra. |

## Regra da série: legenda × texto principal

Quando a cena já mostra a frase da narração como texto principal, essa frase **não entra na legenda**. A legenda some ao fim da página anterior e só a cena fala. Exemplo: a chamada final "Mande / para quem fecha / o caixa da / sua pousada." deste vídeo. No `roteiro.json`, essas frases vão no campo `sem_legenda`, e o `qa.py` confere que nenhuma página fica na tela durante elas.

## Locução, legenda e som

- **Locução** (`scripts/voz.py`): ElevenLabs `eleven_v4`, voz Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`).
  - `voice_settings` só com stability 0,50 e similarity_boost 0,75; endpoint with-timestamps.
  - A narração inteira vai numa chamada, com o texto exato do pedido.
  - Ritmo de 11,4 letras/s e maior pausa de 0,56 s. A chave fica nos Segredos de rede.
- **Linha do tempo** (`scripts/linha.py`): os tempos de cada palavra vêm da API; o início das palavras depois de pausa é medido no áudio.
- **Legenda:** palavra por palavra, no padrão do reserva-whatsapp.
  - Inter Display 900, 68 px, branca, chaves em limão, linhas em y 1332/1412.
  - As linhas são centralizadas e ficam dentro de x 130–936; a coluna de botões começa em x > 940.
  - Cada página fica ≥ 1,5 s na tela.
  - A divisão está fixada no `roteiro.json` (campo `legenda`): as páginas trocam só em pontuação, e nenhuma linha termina em artigo, preposição ou conjunção.
  - "Esse é o valor que deveria / estar no caixa." quebra na pausa de 120 ms da locução. "que deveria estar no caixa." numa linha só teria 839 px, e o máximo é 806 px.
- **Som** (`scripts/audio.py`): voz + trilha da Série Explica, com ducking, e efeitos em cada gesto:
  - gaveta, deslize, checks, brilho, selos, risco, piscar, moedas, alerta, caneta, carimbo, avião e sineta.
  - Master em −14 LUFS; pico ≤ −1,5 dBTP no MP4.

## Rodar

```bash
cd reels/educativo/conta-do-caixa
python3 scripts/voz.py                              # locução (só gera se ainda não existir)
python3 scripts/linha.py                            # linha.json
python3 scripts/audio.py                            # audio/mix.wav (+ cues.json e as trilhas separadas)
node scripts/render.cjs video --mix audio/mix.wav   # output/conta-do-caixa.mp4
node scripts/render.cjs info                        # output/info.json (páginas da legenda e caixas a cada 0,25 s)
cd ../../.. && node reels/tools/capa_grade.cjs reels/educativo/conta-do-caixa \
  && python3 reels/tools/revisao_capa.py reels/educativo/conta-do-caixa --saida reels/educativo/conta-do-caixa/output/grade --vizinhos reels/educativo/comanda/output/grade reels/educativo/fechar-caixa/output/grade
cd reels/educativo/conta-do-caixa && cp output/grade/capa.jpg output/capa-grade.jpg && cp output/grade/revisao/capa-no-feed.jpg output/revisao/previa-grade.jpg
python3 scripts/folha.py && python3 scripts/qa.py   # folha de contato; relatório, capa (quadro 0) e zonas seguras
```
