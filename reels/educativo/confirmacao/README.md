# Educativo · "Reserva confirmada? Mande esta mensagem."

Reel educativo do @fazlohospeda, no mesmo modelo, pipeline e DNA do [check-in](../check-in), do [conta-do-caixa](../conta-do-caixa) e do [reserva-whatsapp](../reserva-whatsapp): narração da Raquel, itens com check na própria frase, carimbo, avião e logo final com a sineta.

**Continuidade de história:** é a mesma hóspede do reserva-whatsapp e do check-in, a Ana Lima. O `qa.py` confere os dados contra os dois roteiros:
- de 14 a 16/11, 2 noites;
- Chalé 3, 2 adultos e 1 criança;
- R$ 900,00, sinal de R$ 450,00 e saldo de R$ 450,00 no check-out;
- saída até 12:00.

O horário de entrada, "a partir das 14:00", é o único dado novo deste vídeo.

**Não é demonstração do sistema:**
- Não mostra a interface do FAZLO Hospeda nem imita o app de conversa. O balão é genérico, no DNA da marca: cartão escuro com borda limão, "MENSAGEM ENVIADA", como o "MENSAGEM RECEBIDA" do reserva-whatsapp.
- Os dados são fictícios, com "EXEMPLO FICTÍCIO" em todo quadro com dado.
- O endereço é claramente fictício ("Estrada do Exemplo, km 4"), sem nome de pousada.
- Não promete integração nem resultado.

▶ **Vídeo:** [`output/confirmacao.mp4`](output/confirmacao.mp4) (30,5 s, 1080×1920, 60 fps). **Para aprovação: não publicar antes do OK.**
- Capa (quadro 0): [`output/capa.jpg`](output/capa.jpg) · capa da grade: [`output/capa-grade.jpg`](output/capa-grade.jpg) · prévia na linha da grade: [`output/revisao/previa-grade.jpg`](output/revisao/previa-grade.jpg)
- Folha de contato (2 quadros por segundo): [`output/revisao/folha-contato.jpg`](output/revisao/folha-contato.jpg)
- Revisão técnica: [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt) (sincronia de cada gesto × palavra, divisão da legenda, zonas, som, varredura de texto e dados conferidos com o reserva-whatsapp e o check-in)
- Legenda do post: [`legenda.txt`](legenda.txt)

## A mensagem (exemplo fictício)

| | |
|---|---|
| 01 Datas | 14 a 16/11 · 2 noites |
| 02 Acomodação | Chalé 3 · 2 adultos e 1 criança |
| 03 Valores | total R$ 900,00 · sinal R$ 450,00 recebido / saldo R$ 450,00 no check-out |
| 04 Horários | entrada a partir das 14:00 / saída até 12:00 |
| 05 Endereço | Estrada do Exemplo, km 4 (com o pino de mapa) |

As linhas 03 e 04 quebram dentro do balão por grupo de sentido.

## Cenas (no tempo da locução)

| Tempo | Locução | Tela |
|---|---|---|
| 0,0–4,0 s | "Reserva confirmada? Mande pro hóspede uma mensagem com" | Capa: marca, etiqueta "DEPOIS DE CONFIRMAR", título "Reserva / confirmada? / **Mande esta / mensagem.**" e o balão "MENSAGEM ENVIADA" vazio, com o cursor piscando. "confirmada?" pulsa na própria palavra. Sem legenda: o gancho está no título. |
| 4,0–5,5 s | "cinco informações." | Em "cinco", o título encolhe e sobe, o balão cresce e as casas 01–05 aparecem apagadas. O selo "EXEMPLO FICTÍCIO" entra ao lado do rótulo. |
| 5,5–19,6 s | as cinco informações | Cada linha acende na própria frase, é digitada com o cursor e recebe o check na palavra-chave: "noites", "pessoas", "falta pagar", "saída", "localização". Em "localização", o pino de mapa pulsa. |
| 19,6–23,9 s | "Assim o hóspede chega sabendo tudo, e ninguém fica com dúvida." | Carimbo "ENVIADA" em "sabendo tudo". Em "dúvida", dois checks de entregue no canto do balão e o avião saindo dele. |
| 23,9–26,3 s | "Mande para quem responde as reservas da sua pousada." | O balão desliza para fora. Entra "Mande / para quem responde / as reservas da / sua pousada." com o avião. Sem legenda. |
| 27,0–30,5 s | — | Logo do FAZLO Hospeda e @fazlohospeda, com a sineta, 0,7 s depois da última palavra. |

## Regra da série: legenda × texto principal

Quando a cena já mostra a frase da narração como texto principal, ela não entra na legenda. Aqui, no campo `sem_legenda` do `roteiro.json`, entram o gancho inteiro ("Reserva confirmada? Mande pro hóspede uma mensagem com cinco informações.") e a chamada final. A legenda começa em "As datas e quantas noites." (5,49 s) e sai quando entra "Mande".

## Locução, legenda e som

- **Locução** (`scripts/voz.py`): ElevenLabs `eleven_v4`, voz Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`).
  - `voice_settings` só com stability 0,50 e similarity_boost 0,75; endpoint with-timestamps; uma chamada só, com o texto exato.
  - Ritmo de 11,2 letras/s; maior pausa de 0,56 s. A chave fica nos Segredos de rede.
- **Legenda:** palavra por palavra, no padrão da série.
  - Inter Display 900, 68 px, branca, chaves em limão, linhas em y 1332/1412 e x 130–936; cada página ≥ 1,5 s.
  - A divisão está fixada no roteiro. As páginas trocam em pontuação ou pausa; dentro da página, as linhas quebram por grupo de sentido. Nenhuma linha passa de 806 px nem termina em artigo, preposição ou conjunção.
  - "As datas e quantas noites." (832 px) e "e ninguém fica com dúvida." (861 px) não cabiam numa linha só e foram quebradas em duas.
- **Som** (`scripts/audio.py`): voz + trilha da Série Explica, com ducking, e efeitos em cada gesto: pulso, deslize, casas, checks, brilho do pino, carimbo, entregue, avião e sineta. Master em −14 LUFS; pico ≤ −1,5 dBTP no MP4.

## Rodar

```bash
cd reels/educativo/confirmacao
python3 scripts/voz.py                              # locução (só gera se ainda não existir)
python3 scripts/linha.py                            # linha.json
python3 scripts/audio.py                            # audio/mix.wav (+ cues.json e as trilhas separadas)
node scripts/render.cjs video --mix audio/mix.wav   # output/confirmacao.mp4
node scripts/render.cjs info                        # output/info.json (páginas da legenda e caixas a cada 0,25 s)
cd ../../.. && node reels/tools/capa_grade.cjs reels/educativo/confirmacao \
  && python3 reels/tools/revisao_capa.py reels/educativo/confirmacao --saida reels/educativo/confirmacao/output/grade --vizinhos reels/educativo/check-in/output/grade reels/educativo/conta-do-caixa/output/grade
cd reels/educativo/confirmacao && cp output/grade/capa.jpg output/capa-grade.jpg && cp output/grade/revisao/capa-no-feed.jpg output/revisao/previa-grade.jpg
python3 scripts/folha.py && python3 scripts/qa.py   # folha de contato; relatório, capa (quadro 0) e zonas seguras
```
