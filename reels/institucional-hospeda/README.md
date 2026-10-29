# FAZLO Hospeda: vídeo institucional (85,1 s, 9:16, para os leads no WhatsApp)

Apresenta o FAZLO Hospeda a donos e gestores de pousadas. A ordem é a dor da rotina, como o Hospeda resolve, os diferenciais e a chamada. O roteiro aprovado (com os ajustes de 29/10/2026) está em [`ROTEIRO.md`](ROTEIRO.md).

**Não publicar antes do OK.**

▶ **Para enviar no WhatsApp:** [`output/fazlo-hospeda-institucional-whatsapp.mp4`](output/fazlo-hospeda-institucional-whatsapp.mp4)
- 13 MB, 1080×1920, 30 fps, H.264 + AAC.
- −14 LUFS, pico −1,9 dBTP.

▶ **Mestre:** [`output/fazlo-hospeda-institucional.mp4`](output/fazlo-hospeda-institucional.mp4)
- 27 MB, 60 fps.
- Revisão técnica: [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt).

## As telas

- **Origem:** só os PNGs de [`hospeda-v2/`](../../hospeda-v2), em recortes (`scripts/telas.py`, prova em [`output/revisao/recortes.jpg`](output/revisao/recortes.jpg)). Nenhuma tela é desenhada, imitada ou inventada.
- **Faixa de demonstração:** "Demonstração · dados de exemplo · Quero usar" nunca entra. Todo recorte começa abaixo dela, e o `telas.py` e o `qa.py` conferem.
- **Versões:** o vídeo não fala em versões, só no FAZLO Hospeda.
- **Cenas sem tela:** a dor, a virada, o pagamento repetido e a chamada são tipografia e elementos vivos. Os balões e cartões são genéricos, no DNA da marca.

## Cenas

| Tempo | Narração | Tela (`hospeda-v2/`) e foco em limão |
|---|---|---|
| 0–6,7 s | "Reserva anotada no caderno, consumo no papel e, no fim do dia, um caixa que não bate." | **Sem tela.** "Caderno, papel e um caixa que não bate?" no topo (o quadro 0 é a miniatura, com o centro livre para o play). Na fala entram o caderno com a reserva riscada, o papel do consumo com os pauzinhos crescendo e o caixa com números que não param de mudar. |
| 6,7–10,6 s | "O FAZLO Hospeda organiza a sua pousada em um só lugar." | **Sem tela.** Tudo é sugado para a logo. Em "um só lugar", os ícones do dia a dia entram em órbita. |
| 10,6–17,0 s | "Logo cedo, você vê quem chega, quem sai, quem está hospedado e quanto já entrou." | `01-visao-geral-celular`: Chegadas, Saídas, Hospedados e "Recebido hoje R$ 1.525,00". |
| 17,0–28,0 s | "As reservas ficam no calendário… E o mesmo chalé não pode ser reservado duas vezes nas mesmas datas." | `02-calendario-celular` (a grade e as datas) → `09-reserva-duplicada-computador` (as datas e o aviso âmbar "Período ocupado"). |
| 28,0–38,4 s | "Na reserva, você registra o sinal, e o saldo já fica calculado. Se o hóspede cancelar, você decide: reter ou devolver o sinal." | `03-nova-reserva-sinal-celular` (R$ 324,00) → `03-nova-reserva-resumo-celular` (diárias, sinal, saldo) → `11-cancelamento-sinal-reter-celular` e `11-cancelamento-sinal-devolver-celular`, trocados no lugar na palavra "devolver". |
| 38,4–48,9 s | "Durante a estadia, cada consumo vai para a comanda do hóspede. No check-out, o saldo aparece claro, e a saída só libera com tudo quitado." | `05-comanda-aberta-celular` (o item e o saldo da comanda) → `04-hospedagem-checkout-celular` ("Saldo em aberto" e "O check-out libera com saldo zero."). |
| 48,9–57,7 s | "O caixa tem abertura e fechamento conferido: você conta o dinheiro e o Hospeda mostra na hora se sobrou ou faltou." | `06-caixa-aberto-celular` (abertura, "Fechar caixa") → `10-fechamento-caixa-celular` (valor contado e o aviso da diferença). |
| 57,7–62,4 s | "O Day Use entra nas mesmas comandas e no mesmo caixa." | `12-day-use-celular` → `12-day-use-ativo-celular` (Day Use e consumos na comanda) → `06-caixa-aberto-celular`, a linha "Day Use · Camila Rocha" do diário. |
| 62,4–69,0 s | "E se a internet cair no meio de um recebimento, o mesmo pagamento não é lançado duas vezes." | **Sem tela.** O sinal da internet apaga. O recebimento fica com a marca "LANÇADO 1 VEZ", e a repetição é barrada: "REPETIDO · NÃO LANÇADO". |
| 69,0–78,3 s | "Você não começa do zero: a FAZLO entrega o sistema já configurado, com acomodações, tarifas, produtos e usuários." | `13-nova-pousada-acomodacoes-celular` (acomodações e tarifas) → `14-nova-pousada-revisao-celular` (produtos e usuários). O item com o nome da pousada e as datas do teste fica fora. |
| 78,3–81,9 s | "Fale com a gente no WhatsApp para conhecer." | **Sem tela.** A chamada escrita, com "WhatsApp" em limão e um balão de conversa genérico. |
| 81,9–85,1 s | — | A logo do FAZLO Hospeda e @fazlohospeda. |

**Motion:**
- **Cartão:** cada tela entra num cartão (x 90–990, y 446–1232) e o chip da cena acende acima.
- **Foco:** na palavra, a câmera rola e aproxima até o dado (até 1,25×), o contorno limão se desenha e o resto da tela escurece.
- **Pausa:** a última tela de cada cena fica parada ≥ 1,2 s depois do último foco (a pausa da locução, `pausa_depois`).
- **Transição:** a tela seguinte empurra a anterior; na troca de assunto, o cartão sai.

**Dados:** nenhuma tela com a mesma pessoa ou acomodação e valores diferentes aparece junto.
- A comanda da Mariana vem só de `05-comanda-aberta`.
- O Lucas não aparece.
- A Camila do cancelamento (cena 5) e a do Day Use (cena 8) ficam em cenas separadas.
- A Suíte Mirante da hospedagem (cena 6) e a das tarifas (cena 10) também ficam em cenas separadas.

## Locução, legenda e som

- **Locução** (`scripts/voz.py`):
  - eleven_v4, voz Raquel (`GDzHdQOi6jjf8zaXhCYD`), só estabilidade 0,50 e semelhança 0,75, seed 4100;
  - a narração inteira numa chamada; ritmo 11,6 letras/s, maior pausa interna 0,52 s;
  - "Hospéda", "Fázlo" e "Uátsap" vão só no texto enviado à API (`serie-explica/scripts/pronuncia.py`); a legenda e a tela mostram a grafia oficial;
  - a chave fica nos Segredos de rede.
- **Montagem** (`scripts/linha.py`):
  - a narração é cortada no silêncio entre as frases e recebe a pausa de cada frase do roteiro (9,6 s no total);
  - a voz não é acelerada nem cortada no meio;
  - os inícios das palavras depois de pausa são medidos no áudio montado.
- **Legenda:** palavra por palavra no padrão do reel-09.
  - Inter Display 900, 68 px, chaves em limão.
  - Linhas em y 1332/1412, x 130–950.
  - Cada página fica ≥ 1,5 s na tela.
- **Som** (`scripts/audio.py`):
  - a trilha da Série Explica, 10,5 dB abaixo da voz, com ducking;
  - efeitos em cada entrada de tela, foco, pagamento barrado e na sineta da logo;
  - −14 LUFS.

## Revisão (`scripts/qa.py`): aprovado

- **Formato:** 85,1 s; −14,0 LUFS; pico −2,2 dBTP.
- **Legenda:** 32 páginas, todas ≥ 1,5 s, sem encostar em nenhum elemento da cena.
- **Sincronia:** voz × legenda a 2 ms em média e 41 ms no máximo; cada página aparece no quadro da 1ª palavra (até 1 quadro de atraso).
- **Zonas:**
  - nada nos 20% de baixo;
  - na miniatura, o centro do play está livre;
  - os 16 recortes vêm de `hospeda-v2/` e ficam abaixo da faixa de demonstração;
  - cada tela fica ≥ 1,5 s na tela.
- **Grafia:** nenhuma grafia fonética na tela.

## Rodar

```bash
cd reels/institucional-hospeda
python3 scripts/voz.py                              # locução (só gera se ainda não existir; --refaz para gerar de novo)
python3 scripts/linha.py                            # audio/voz-montada.wav + linha.json
python3 scripts/telas.py --prova                    # src/telas/*.png + src/telas.json + output/revisao/recortes.jpg
node scripts/render.cjs info                        # output/info.json (plano, legenda e caixas a cada 0,25 s)
python3 scripts/audio.py                            # audio/mix.wav
node scripts/render.cjs video --mix audio/mix.wav   # output/fazlo-hospeda-institucional.mp4
python3 scripts/qa.py                               # output/revisao/relatorio.txt, zonas-seguras.jpg, miniatura.jpg
ffmpeg -i output/fazlo-hospeda-institucional.mp4 -vf fps=30 -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart output/fazlo-hospeda-institucional-whatsapp.mp4
```
