# Educativo · "O hóspede chegou? Confira isto no check-in."

Reel educativo do @fazlohospeda, no mesmo modelo, pipeline e DNA do [conta-do-caixa](../conta-do-caixa) e do [reserva-whatsapp](../reserva-whatsapp): narração da Raquel, ficha de papel com borda serrilhada, carimbo, avião e logo final com a sineta.

**Continuidade de história:** é a mesma hóspede do "Recebeu uma reserva pelo WhatsApp?". Os dados vêm do [roteiro do reserva-whatsapp](../reserva-whatsapp/roteiro.json) e o `qa.py` confere um a um:
- Ana Lima;
- de 14 a 16/11;
- 2 adultos e 1 criança, sem pet;
- Chalé 3, R$ 900,00, com sinal de R$ 450,00.

**Não é demonstração do sistema:**
- Não mostra a interface do FAZLO Hospeda nem imita telas.
- Os dados são fictícios, com "EXEMPLO FICTÍCIO" em todo quadro com dado.
- Nenhum número de documento: só "documento conferido".
- Não promete resultado.

▶ **Vídeo:** [`output/check-in.mp4`](output/check-in.mp4) (32,45 s, 1080×1920, 60 fps). **Para aprovação: não publicar antes do OK.**
- Capa (quadro 0): [`output/capa.jpg`](output/capa.jpg) · capa da grade: [`output/capa-grade.jpg`](output/capa-grade.jpg) · prévia na linha da grade: [`output/revisao/previa-grade.jpg`](output/revisao/previa-grade.jpg)
- Folha de contato (2 quadros por segundo): [`output/revisao/folha-contato.jpg`](output/revisao/folha-contato.jpg)
- Revisão técnica: [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt) (sincronia de cada gesto × palavra, divisão da legenda, zonas, som, varredura de texto e os dados conferidos com o reserva-whatsapp)
- Pronúncia de "check-in" e "check-out": [`output/revisao/pronuncia-checkin.wav`](output/revisao/pronuncia-checkin.wav) e [`output/revisao/pronuncia-checkout.wav`](output/revisao/pronuncia-checkout.wav)
- Legenda do post: [`legenda.txt`](legenda.txt)

## A ficha (exemplo fictício)

| | |
|---|---|
| 01 Documento com foto | Ana Lima · documento conferido |
| 02 Pessoas | 2 adultos · 1 criança · sem pet |
| 03 Saída | seg 16/11 · até 12:00 |
| 04 Saldo (R$ 900,00 − sinal R$ 450,00) | R$ 450,00 · no check-out |
| Chave | Chalé 3 |

**A saída é "seg 16/11", não "dom 16/11".** 16/11/2026 cai numa segunda-feira. O reserva-whatsapp é de 30/10/2026, então a estadia é de 14 a 16/11/2026. O `qa.py` confere o dia da semana pelo calendário.

## Cenas (no tempo da locução)

| Tempo | Locução | Tela |
|---|---|---|
| 0,0–3,3 s | "O hóspede chegou? Antes de entregar a chave," | Capa: marca, etiqueta "ANTES DE ENTREGAR A CHAVE", título "O hóspede / chegou? / **Confira isto / no check-in.**" e uma chave grande em traço limão, balançando. Em "chegou", a chave dá um tranco; em "chave", ela brilha. Sem legenda: o gancho já está no título. |
| 3,3–5,3 s | "confira quatro coisas." | Em "confira", o título encolhe e sobe e entra a ficha "CHECK-IN" com "EXEMPLO FICTÍCIO". As casas 01–04 aparecem em "quatro". Sem legenda. |
| 5,3–22,8 s | os quatro itens | Cada linha acende na própria frase, o dado é escrito e o check entra na palavra-chave: "reserva", "pet", "voz alta", "check-out". |
| 22,8–26,3 s | "Com isso conferido, a chave pode ir pra mão do hóspede." | Carimbo "CONFERIDO" em "conferido". Em "mão do hóspede", a chave sai do pé da ficha em limão, com brilho, e desliza para fora. |
| 26,3–28,6 s | "Mande para quem faz o check-in na sua pousada." | A ficha desliza para fora. Entra "Mande / para quem faz / o check-in na / sua pousada." com o avião. Sem legenda: a cena já mostra a frase. |
| 29,3–32,45 s | — | Logo do FAZLO Hospeda e @fazlohospeda, com a sineta, 0,7 s depois da última palavra. |

## Regra da série: legenda × texto principal

Quando a cena já mostra a frase da narração como texto principal, essa frase não entra na legenda. Aqui são duas, no campo `sem_legenda` do `roteiro.json`:
- **o gancho inteiro**, "O hóspede chegou? Antes de entregar a chave, confira quatro coisas.", que está no título. A legenda só começa em "Documento com foto:" (5,29 s);
- **a chamada final**, que é o texto grande do CTA. A legenda some ao fim da página anterior.

## Locução, legenda e som

- **Locução** (`scripts/voz.py`): ElevenLabs `eleven_v4`, voz Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`).
  - `voice_settings` só com stability 0,50 e similarity_boost 0,75; endpoint with-timestamps; uma chamada só, com o texto exato.
  - Ritmo de 10,8 letras/s; maior pausa de 0,56 s. A chave fica nos Segredos de rede.
- **Pronúncia de "check-in" e "check-out":** foram com a grafia oficial, sem troca no dicionário [`pronuncia.py`](../../serie-explica/scripts/pronuncia.py). Na fala, duram 280 ms e 425 ms, o que é compatível com "xéquin" e "xecáut"; uma leitura soletrada seria bem mais longa.
  - Não deu para conferir por reconhecimento de fala: a chave do ElevenLabs não tem permissão de transcrição, e a rede bloqueia o download de um modelo local.
  - Os dois trechos estão em `output/revisao/` para ouvir.
  - Se precisar ajustar: uma entrada no `MAPA` do `pronuncia.py` muda só o texto enviado à API; tela e legenda continuam com a grafia oficial.
- **Legenda:** palavra por palavra, no padrão da série.
  - Inter Display 900, 68 px, branca, chaves em limão, linhas em y 1332/1412 e x 130–936; cada página ≥ 1,5 s.
  - A divisão está fixada no `roteiro.json`: as páginas trocam só em pontuação ou pausa, e nenhuma linha termina em artigo, preposição ou conjunção.
  - "Com isso conferido," (1,18 s) é curta demais para ficar sozinha: divide a página com "agora ou no check-out.", trocando na pontuação.
  - "Quantas pessoas chegaram:" numa linha só teria 903 px (o máximo é 806 px) e não tem pausa por dentro. Por isso a página quebra a linha por grupo de sentido: "Quantas pessoas / chegaram:". A troca de página continua na pausa de 355 ms depois de "chegaram:".
- **Som** (`scripts/audio.py`): voz + trilha da Série Explica, com ducking, e efeitos em cada gesto: chaveiro, brilho, deslize, casas, checks, carimbo, avião e sineta. Master em −14 LUFS; pico ≤ −1,5 dBTP no MP4.

## Rodar

```bash
cd reels/educativo/check-in
python3 scripts/voz.py                              # locução (só gera se ainda não existir)
python3 scripts/linha.py                            # linha.json
python3 scripts/audio.py                            # audio/mix.wav (+ cues.json e as trilhas separadas)
node scripts/render.cjs video --mix audio/mix.wav   # output/check-in.mp4
node scripts/render.cjs info                        # output/info.json (páginas da legenda e caixas a cada 0,25 s)
cd ../../.. && node reels/tools/capa_grade.cjs reels/educativo/check-in \
  && python3 reels/tools/revisao_capa.py reels/educativo/check-in --saida reels/educativo/check-in/output/grade --vizinhos reels/educativo/conta-do-caixa/output/grade reels/educativo/comanda/output/grade
cd reels/educativo/check-in && cp output/grade/capa.jpg output/capa-grade.jpg && cp output/grade/revisao/capa-no-feed.jpg output/revisao/previa-grade.jpg
python3 scripts/folha.py && python3 scripts/qa.py   # folha de contato; relatório, capa (quadro 0) e zonas seguras
```
