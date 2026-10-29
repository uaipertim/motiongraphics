# FAZLO Hospeda: apresentação para a pousada abordada (2 min 58 s, 9:16, WhatsApp)

Vídeo explicativo de como o sistema funciona na prática, para a pousada que aceitou recebê-lo. Não é Reels: a pousada assiste com calma para decidir se quer testar. A ordem é a dor, o dia a dia com o Hospeda, como começa, o teste grátis, quanto custa e a chamada.

O roteiro aprovado (com os ajustes de 30/10/2026) está em [`ROTEIRO.md`](ROTEIRO.md). **Não publicar antes do OK.**

▶ **Para enviar no WhatsApp:** [`output/fazlo-hospeda-apresentacao-whatsapp.mp4`](output/fazlo-hospeda-apresentacao-whatsapp.mp4) (30 fps, abaixo de 16 MB).
▶ **Mestre:** [`output/fazlo-hospeda-apresentacao.mp4`](output/fazlo-hospeda-apresentacao.mp4) (60 fps).
**Revisão técnica:** [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt).

## Cenas (no tempo da locução)

| Tempo | Cena | Tela (`hospeda-v2/`) e foco em limão |
|---|---|---|
| 0–16,1 s | A dor | **Sem tela.** No topo, "O dono faz tudo. / E no fim do dia, / o caixa não bate?" (o quadro 0 é a miniatura, com o centro livre para o play). Na fala entram, um a um: o caderno de reservas, a conversa, o papel do consumo, "HÓSPEDE AINDA DEVE R$ ???,??" e o caixa que não bate. |
| 16,1–21,6 s | Virada | **Sem tela.** Tudo é sugado para a logo, e os ícones do dia a dia entram em órbita em "um só lugar". |
| 21,6–32,9 s | O dia | `01-visao-geral-celular`: Hospedados → Chegadas → Saídas → "Recebido hoje" com as formas de pagamento. |
| 32,9–48,8 s | Reservas | `02-calendario-celular` (as acomodações, depois as reservas) → `09-reserva-duplicada-computador`. Só o aviso âmbar "Período ocupado" ganha destaque. |
| 48,8–66,3 s | Sinal e cancelamento | `03-nova-reserva-sinal-celular` (o sinal, depois o saldo) → `11-cancelamento-sinal-reter-celular`, que troca no lugar por `11-cancelamento-sinal-devolver-celular` na palavra "devolver". O foco final é a saída do caixa. |
| 66,3–82,2 s | Comanda e check-out | `05-comanda-aberta-celular` (o item, a comanda da hóspede, quantidade × preço) → `04-hospedagem-checkout-celular` ("Saldo em aberto" e "O check-out libera com saldo zero."). |
| 82,2–98,4 s | Caixa | `06-caixa-aberto-celular`: a câmera rola da abertura até o diário da sessão e a forma de pagamento → `10-fechamento-caixa-celular` (o valor contado, depois a diferença). |
| 98,4–109,2 s | Day Use | `12-day-use-celular` → `12-day-use-ativo-celular` → a linha "Day Use · Camila Rocha" do diário (`06-caixa-aberto-celular`). |
| 109,2–117,2 s | Pagamento repetido | **Sem tela.** A cena do institucional: a internet cai, o recebimento fica "LANÇADO 1 VEZ" e a repetição é barrada. |
| 117,2–139,7 s | Como começa | `13-nova-pousada-acomodacoes-celular` (acomodações e tarifas) → `14-nova-pousada-revisao-celular`, só os itens 4 a 6 (produtos da comanda e usuários). O nome da pousada, as datas do teste e o texto do convite ficam fora. Depois vêm, sem tela, os passos "Convite por e-mail · Cria a sua senha · Já começa a usar" e o balão "Dúvidas? Fale com a gente no WhatsApp". |
| 139,7–147,9 s | Teste grátis | **Tipografia.** "30" contando, "dias grátis", e os checks "Sem cartão" e "Sem compromisso". |
| 147,9–169,4 s | Quanto custa | **Tipografia, valores grandes.** "R$ 99,90 /mês" com os checks "Sem taxa por reserva" e "Sem fidelidade". Depois o quadro "10 PRIMEIRAS POUSADAS": "R$ 79,90 /mês nos primeiros 12 meses". |
| 169,4–175,3 s | Chamada | **Tipografia.** "Quer testar 30 dias na sua pousada? É só responder esta mensagem.", com um balão de resposta genérico. |
| 175,3–178,5 s | Fecho | A logo do FAZLO Hospeda e @fazlohospeda. |

**Tempo de leitura:**
- Cada cena entra 0,8 s antes da fala.
- Cada tela fica de 3,6 a 11,3 s na tela.
- A última tela de cada assunto fica parada de 2,6 a 5,2 s depois do último foco.
- No institucional, as telas ficavam de 1,7 a 7 s.

**Dados:** nenhuma tela com a mesma pessoa ou acomodação e valores diferentes aparece junto.
- A comanda da Mariana vem só de `05-comanda-aberta`.
- O Lucas só aparece nas linhas do diário.
- A Camila do cancelamento e a do Day Use ficam em cenas separadas.
- O recorte do cancelamento não mostra as diárias da Suíte Mirante.

## Locução, legenda e som

- **Locução** (`scripts/voz.py`):
  - eleven_v4, voz Raquel (`GDzHdQOi6jjf8zaXhCYD`), só estabilidade 0,50 e semelhança 0,75; seed 5200, ritmo 11,0 letras/s, maior pausa interna 0,56 s.
  - Pronúncias no texto enviado à API: "Hospéda", "Fázlo" e "Uátsap".
  - Os valores são falados por extenso: "noventa e nove reais e noventa centavos" e "setenta e nove reais e noventa centavos" (`roteiro.json` → `falado`).
  - As palavras devolvidas pela API são juntadas de novo na grafia oficial, e "R$ 99,90" vira uma palavra da legenda, com o tempo do valor falado.
- **Montagem** (`scripts/linha.py`): a narração é cortada no silêncio entre as frases e recebe a pausa de cada frase do roteiro (32,8 s no total). A voz não é acelerada nem cortada.
- **Legenda:** palavra por palavra no padrão do reel-09 (Inter Display 900, 68 px, chaves em limão, cada página ≥ 1,5 s).
- **Som** (`scripts/audio.py`): a trilha da Série Explica com ducking, efeitos em cada tela, foco, check e valor, e a sineta da logo. −14 LUFS.

## Rodar

```bash
cd reels/apresentacao-hospeda
python3 scripts/voz.py                              # locução (só gera se ainda não existir; --refaz para gerar de novo)
python3 scripts/linha.py                            # audio/voz-montada.wav + linha.json
python3 scripts/telas.py --prova                    # src/telas/*.png + src/telas.json + output/revisao/recortes.jpg
node scripts/render.cjs info                        # output/info.json (plano, legenda e caixas a cada 0,25 s)
python3 scripts/audio.py                            # audio/mix.wav
node scripts/render.cjs video --mix audio/mix.wav   # output/fazlo-hospeda-apresentacao.mp4
python3 scripts/qa.py                               # output/revisao/relatorio.txt, zonas-seguras.jpg, miniatura.jpg
ffmpeg -i output/fazlo-hospeda-apresentacao.mp4 -vf fps=30 -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart output/fazlo-hospeda-apresentacao-whatsapp.mp4
```
