# FAZLO Hospeda — vídeo explicativo (teste de capacidade) · PROCESSO

Branch órfã `experimento/apresentacao-fable`. Tudo foi feito aqui, só com o pacote
`fazlo-hospeda-apresentacao-teste.zip` (descompactado em `pacote/`). Nenhuma outra branch, pasta,
commit, script ou vídeo do repositório foi aberto.

## Entregas

| Arquivo | O que é |
|---|---|
| `output/apresentacao.mp4` | mestre · 1080×1920 · 60 fps · H.264 High (BT.709) · AAC 192 kbps · **53,8 MB** |
| `output/apresentacao-whatsapp.mp4` | versão leve · 720×1280 · 30 fps · H.264 · AAC 96 kbps · **15,5 MB** |
| `output/miniatura.jpg` | quadro 0 do mestre |
| `output/folha-contato.jpg` | 1 quadro por segundo, tirado do mestre final |
| `output/legenda.json` · `output/tempos.json` | páginas da legenda e tempos de cada tela, exportados da linha do tempo |

Duração: **167,23 s (2 min 47,2 s)**. A fala sozinha dura 134,4 s e não foi acelerada; o resto são as
pausas pedidas (1,4 a 2,2 s entre assuntos), 1,0 s de abertura e 4,8 s de fecho.

## O que precisa do seu ouvido

Eu não consigo ouvir áudio, e não havia reconhecimento de fala disponível nesta sessão (a chave da
ElevenLabs não tem permissão de transcrição, e os servidores de modelos de voz estão bloqueados pela
rede). Então **a pronúncia e o gosto musical não foram conferidos por escuta** — só por medição e pelo
alinhamento que a própria ElevenLabs devolve. Ouça uma vez prestando atenção em: "Fázlo", "Hospéda",
"Uátsap", "check-out", os dois preços por extenso, e nos picos da voz (ver "Som" abaixo).

## Roteiro cena a cena (tempos medidos)

Todos os tempos saem de `audio/narracao/palavras.json` (alinhamento por caractere da ElevenLabs,
convertido para a linha do tempo final). Nas cenas, cada animação é escrita como
`T('assunto', 'palavra')` — não há tempo digitado à mão.

| # | Tempo | Cena | O que acontece na palavra |
|---|---|---|---|
| 0 | 0:00,00 – 0:00,80 | **Cartaz (quadro 0)** | Logo + "Veja como fica o dia a dia da sua pousada" + "em menos de 3 minutos". É a miniatura no WhatsApp; sai em 0,46 s. |
| 1 | 0:01,00 – 0:15,73 | **A dor** (sem telas) | "muita pousada" → casas se desenham · "o dono" → o dono no centro · "faz tudo" → 4 tarefas saltam dele · "a reserva… caderno… WhatsApp" → cartões Caderno e WhatsApp · "o consumo… papel" → cartão Papel · "No check-out, ninguém sabe…" → valor girando sem parar, vira "R$ ???" em "deve" · "o caixa não bate" → Esperado R$ 285,00 × Na gaveta R$ 270,00 contam e o selo "≠ não bate" carimba em "não". Só off-white e âmbar: o limão sai de cena. |
| 2 | 0:17,32 – 0:22,53 | **Virada para a marca** | Tudo é sugado para o centro; impacto em "FAZLO" (0:17,48), pílula em "Hospeda" · "junta tudo isso" → Reservas, Comandas, Check-out e Caixa chegam e se encaixam · "em um só lugar" → um contorno fecha em volta, check em "lugar" · "Veja como fica…" → o contorno vira o celular. |
| 3 | 0:24,06 – 0:32,54 | **01 Visão geral** | "abrir" → toque, a tela acende · "você vê" → câmera aproxima · "dia da pousada" → data e título · "hospedado" / "chega" / "sai" → Hospedados, Chegadas, Saídas, um por vez · "quanto já entrou" → o cartão "Recebido hoje R$ 1.525,00" salta numa janela · "forma de pagamento" → contorno em PIX, Dinheiro, Crédito, Débito. |
| 4 | 0:34,78 – 0:40,26 | **02 Calendário** | toque em "Calendário" na barra · "cada acomodação" → coluna das acomodações · "tem a sua linha" → o contorno desce linha por linha · "cada reserva" → as 8 barras ganham contorno em cascata · "aparece no período" → janela com os dias 17–20 e a barra da Fernanda marcados. |
| 5 | 0:42,51 – 0:48,62 | **09 Reserva duplicada** | Só a janela "Nova reserva" do computador. "não deixa" → contorno âmbar no aviso "Período ocupado" · "duas vezes", "mesmas datas" → pulsos · "avisa" → o aviso salta numa janela maior. |
| 6 | 0:50,82 – 0:55,34 | **03 Sinal** | "sinal" → campo R$ 324,00 · "saldo" → "A reserva nasce confirmada · saldo R$ 756,00" salta numa janela. |
| 7 | 0:57,24 – 1:05,53 | **11 Cancelamento** | "decide" → as duas opções · "reter" → opção Reter · "fica com a pousada" → aviso "Nada sai do caixa…" · "devolver" → toque em Devolver, a tela troca · "saída" → aviso "No caixa aberto: sai – R$ 915,00…" · "lançada" → o aviso salta numa janela. |
| 8 | 1:07,75 – 1:13,83 | **05 Comanda** | "consumo… comanda" → Total/Pago/Saldo R$ 287,00 salta numa janela · "o que foi" → Caipirinha · "quantos" → 3 × R$ 22,00 · "e quanto" → R$ 66,00. |
| 9 | 1:16,02 – 1:20,98 | **04 Check-out** | "saldo aparece" → "Saldo em aberto R$ 412,00" salta numa janela · "só libera" → contorno em "O check-out libera com saldo zero." |
| 10 | 1:22,86 – 1:28,94 | **06 Caixa aberto** | "abre com o dinheiro" → linha "Abertura R$ 200,00" salta · "e cada recebimento" → a tela rola até o Diário da sessão; contorno passa por 3 lançamentos · "com a forma de pagamento" → "09:05 · Hospedagem · PIX" e a linha inteira salta numa janela. |
| 11 | 1:31,09 – 1:36,53 | **10 Fechamento** | toque em "Fechar caixa", a folha sobe · "conta o dinheiro" → Valor contado R$ 270,00 · "mostra na hora" → contorno âmbar em "Diferença: falta R$ 15,00" · "se sobrou ou faltou" → o aviso salta numa janela. |
| 12 | 1:38,64 – 1:44,24 | **Internet** (sem tela) | "cair" → os arcos do sinal despencam, "Sem internet" · "no meio de um recebimento" → a barra de lançamento trava em âmbar · "o mesmo pagamento" → a repetição tenta entrar · "não" → bate na barreira e leva o selo BARRADA · "lançado" → carimbo **LANÇADO 1 VEZ**. Na pausa a internet volta. |
| 13 | 1:45,89 – 1:48,07 | **Como começa — tipografia** | "Você não precisa cadastrar **nada.**" palavra por palavra; em "nada" os campos de cadastro são riscados. |
| 14 | 1:49,57 – 1:56,21 | **13 → 14** | 13: "equipe" → "Nova pousada" · "configura" → a tela rola pelo cadastro · "pousada:" → "Acomodações cadastradas". 14 (só itens 2–6): "acomodações, tarifas" → item 4 · "produtos" → item 5 · "usuários" → item 6. |
| 15 | 1:58,50 – 2:06,95 | **Três passos + conversa** | "convite" → passo 1 (aviso "1" em "e-mail") · "cria" → passo 2, a senha se digita em "senha" · "já" → passo 3 · "dúvida" → balão com "?" · "chamar" → balão da equipe digitando · "WhatsApp" → selo "no WhatsApp" e check. |
| 16 | 2:08,65 – 2:15,23 | **Teste grátis** (tipografia) | "30" → conta de 0 a 30 com 30 marcas acendendo · "dias" · "grátis" (pílula) · "para usar o Hospeda na sua pousada." palavra por palavra · "Sem cartão" · "sem compromisso". |
| 17 | 2:16,83 – 2:35,82 | **Quanto custa** | "30 dias" → linha do tempo enche até o fim do teste · "sentido" → check ao lado de "você" · "mensalidade" · **R$ 99,90** conta os reais em "noventa e nove reais" e os centavos em "noventa centavos" · "/mês" em "por mês" · "Sem taxa por reserva" · "sem fidelidade" · "as 10 primeiras" → o selo carimba: 10 conta com dez casinhas, **R$ 79,90** desce de 99,90 enquanto a voz fala, "/mês", "nos primeiros **12** meses" com 12 marcas. |
| 18 | 2:37,47 – 2:42,43 | **Chamada** | "Quer testar **30 dias** na sua pousada?" e "É só **responder** esta mensagem." palavra por palavra; a seta de responder se desenha em "responder". |
| 19 | 2:42,88 – 2:47,23 | **Fecho** | Logo FAZLO Hospeda + @fazlohospeda, no acorde final da trilha. |

### Narração: assuntos, tempos e pausas (medidos no áudio montado)

| Assunto | Começa | Termina | Fala | Pausa depois |
|---|---|---|---|---|
| dor | 0:01.00 | 0:15.73 | 14.73 s | 1.60 s |
| virada | 0:17.32 | 0:22.53 | 5.21 s | 1.50 s |
| visao | 0:24.06 | 0:32.54 | 8.48 s | 2.20 s |
| calendario | 0:34.78 | 0:40.26 | 5.48 s | 2.20 s |
| duplicada | 0:42.51 | 0:48.62 | 6.12 s | 2.10 s |
| sinal | 0:50.82 | 0:55.34 | 4.52 s | 1.80 s |
| cancelamento | 0:57.24 | 1:05.53 | 8.28 s | 2.10 s |
| comanda | 1:07.75 | 1:13.83 | 6.08 s | 2.20 s |
| checkout | 1:16.02 | 1:20.98 | 4.96 s | 1.90 s |
| caixa | 1:22.86 | 1:28.94 | 6.08 s | 2.20 s |
| fechamento | 1:31.09 | 1:36.53 | 5.44 s | 2.10 s |
| internet | 1:38.64 | 1:44.24 | 5.60 s | 1.60 s |
| comeca1 | 1:45.89 | 1:56.21 | 10.31 s | 2.20 s |
| comeca2 | 1:58.50 | 2:06.95 | 8.45 s | 1.60 s |
| teste | 2:08.65 | 2:15.23 | 6.58 s | 1.60 s |
| preco | 2:16.83 | 2:35.82 | 18.99 s | 1.70 s |
| chamada | 2:37.47 | 2:42.43 | 4.96 s | — |

As 16 pausas entre assuntos ficam entre 1,50 e 2,20 s. Dentro de um mesmo assunto alonguei só o
silêncio natural entre frases, para dar tempo de leitura: dor 0,75 e 0,80 s · virada 0,70 s ·
"…cadastrar nada." 1,50 s · "…começa a usar." 0,95 s · teste 0,80 s · preço 1,00 e 1,20 s · chamada 0,80 s.

### Telas: tempo em cena e espera depois do último destaque

| Tela | Assunto | Entra | Sai | Em cena | Destaques | Último destaque | Espera até trocar |
|---|---|---|---|---|---|---|---|
| 01 | visão geral | 0:24.22 | 0:35.07 | 10.85 s | 7 | 0:31.64 | 3.43 s |
| 02 | calendário | 0:35.07 | 0:42.24 | 7.17 s | 6 | 0:39.62 | 2.63 s |
| 09 | reserva duplicada | 0:42.38 | 0:50.50 | 8.12 s | 4 | 0:47.73 | 2.77 s |
| 03 | sinal | 0:50.62 | 0:57.09 | 6.47 s | 4 | 0:53.58 | 3.51 s |
| 11 reter | cancelamento | 0:57.09 | 1:02.62 | 5.54 s | 3 | 1:01.05 | (troca por 11 devolver) |
| 11 devolver | cancelamento | 1:02.62 | 1:07.59 | 4.97 s | 3 | 1:04.50 | 3.09 s |
| 05 | comanda | 1:07.59 | 1:15.96 | 8.36 s | 5 | 1:13.09 | 2.86 s |
| 04 | check-out | 1:15.96 | 1:22.77 | 6.81 s | 3 | 1:19.16 | 3.61 s |
| 06 | caixa | 1:22.77 | 1:31.38 | 8.61 s | 8 | 1:28.19 | 3.19 s |
| 10 | fechamento | 1:31.38 | 1:38.20 | 6.83 s | 4 | 1:35.08 | 3.13 s |
| 13 | como começa | 1:48.16 | 1:52.59 | 4.44 s | 2 | 1:51.37 | (troca por 14) |
| 14 | como começa | 1:52.59 | 1:58.08 | 5.48 s | 4 | 1:55.45 | 2.63 s |

Toda tela fica ≥ 4 s; a última de cada assunto fica ≥ 2,5 s depois do início do último destaque
(a menor espera é 2,63 s). Essa tabela é gerada por `scripts/exportar.mjs`, que falha se a regra quebrar.

### Legenda

42 páginas, todas com 1 ou 2 linhas; a mais curta dura 1,50 s (lista completa em `output/legenda.json`).
A troca de página acontece em pontuação; em quatro trechos longos sem pontuação ela cai numa pausa da
fala, em limite de oração ("O FAZLO Hospeda junta | tudo isso…", "…ninguém sabe ao certo | quanto o
hóspede…", "…não deixa vender | o mesmo chalé…", "…mostra na hora | se sobrou ou faltou."). Ficam fora da
legenda, porque a cena já mostra a frase como texto principal: "Você não precisa cadastrar nada.", o
teste grátis inteiro, do preço em diante ("a mensalidade é de R$ 99,90…") e a chamada.

## Decisões criativas

- **A narração manda.** Uma tomada só para o texto todo (voz e ritmo iguais do começo ao fim). As pausas
  foram criadas inserindo silêncio digital dentro dos silêncios que a gravação já tinha — nenhuma amostra
  de voz foi cortada nem esticada.
- **Cor conta a história.** Na dor só há off-white e âmbar (alerta); o verde-limão sai do fundo e só volta
  no impacto da palavra "FAZLO". Depois disso o âmbar aparece só onde é alerta: o aviso "Período
  ocupado", a "Diferença" do fechamento e a internet caída.
- **Os números da dor são os do produto.** "Esperado R$ 285,00 × Na gaveta R$ 270,00" na dor são os mesmos
  valores que a tela real de fechamento mostra depois, quando o Hospeda aponta a diferença de R$ 15,00.
  O recebimento da cena da internet usa os R$ 412,00 do check-out. Nenhum cliente, depoimento ou
  resultado foi inventado.
- **O app "funcionando".** O celular simula o app de verdade: cabeçalho e barra inferior fixos, o corpo
  rola por baixo, toques visíveis (Calendário, Devolver, Fechar caixa), a folha de fechamento sobe por
  cima do caixa aberto, a opção do cancelamento muda de Reter para Devolver.
- **Câmera em três distâncias.** Celular inteiro (o app completo) → leitura (≈ 2,0–2,6×, texto do app com
  28–37 px no vídeo) → destaque: véu de 40 % sobre o resto, contorno limão que viaja de um dado ao outro
  e, quando o dado merece, o recorte real da tela **salta numa janela de ~940 px** e volta antes de
  trocar de tela.
- **Tela de computador (09).** Não cabe num celular; aparece só a janela "Nova reserva", flutuando, com
  o destaque exclusivamente no aviso âmbar.
- **Regras de conteúdo garantidas no arquivo, não na edição.** `scripts/preparar_telas.py` recorta as
  telas antes de o vídeo carregá-las: sem a faixa de demonstração em todas; a 06 termina na linha
  "Consumo · Patricia Almeida" (o "Day Use" não existe no arquivo usado); a 10 é só a área visível;
  a 14 é só dos itens 2 a 6 (sem o item 1 e sem o rodapé de convite/datas); a 09 é só a janela (sem menu
  lateral, sem nome da pousada de demonstração). No enquadramento do diário aparecem só os quatro
  primeiros lançamentos, então cada pessoa aparece uma vez.
- **Cartaz no quadro 0.** O vídeo abre 0,8 s com logo e título antes da dor, porque o quadro 0 é a
  miniatura que a pousada vê no WhatsApp. A virada para a marca continua sendo o grande momento do logo.
- **Preço sem pressa.** O valor conta junto com a voz (reais, depois centavos) e fica sozinho 1 s antes das
  fichas "Sem taxa por reserva" e "Sem fidelidade". No selo, o R$ 99,90 continua visível, menor, e o
  R$ 79,90 desce a partir dele — fica claro que é uma condição das 10 primeiras, não um preço novo.
- **Zonas.** Legenda numa faixa fixa (y 1382–1532, x 140–940) sobre fundo liso; as telas somem atrás de um
  rodapé opaco a partir de y 1340, então a legenda nunca cobre um dado. Nada essencial acima de y 200,
  abaixo de y 1536 nem em x > 940 com y > 1000 (na dor, os painéis de baixo foram estreitados por isso).
- **Fontes e marca.** Geist e Geist Mono (pacote oficial `geist`, licença OFL, em `src/fonts/`), cores de
  `marca/tokens.json`, logo com a geometria exata do SVG oficial, ícones do pacote e outros desenhados
  no mesmo traço.

## Som

- **Voz:** ElevenLabs `eleven_v4`, Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`), só
  `stability 0,50` e `similarity_boost 0,75`, endpoint `with-timestamps`. O texto enviado é o do
  ROTEIRO.md com as cinco trocas de pronúncia (`scripts/roteiro.py`). Formato `mp3_44100_192`: o PCM é
  recusado pelo plano da conta. A chave não está em nenhum arquivo — a requisição sai sem credencial e o
  proxy da sessão injeta.
- **Trilha:** composta por código (`scripts/trilha.py`): 96 BPM, Ré maior; a dor em Si menor, sem resolver;
  subida na pausa e impacto exatamente em "FAZLO"; levada leve no dia a dia, variando a cada assunto; na
  palavra "cair" a bateria para e um filtro fecha, reabrindo em "não"; acentos em "30", "R$ 99,90" e
  "R$ 79,90"; acorde final 0,45 s depois da última palavra, onde entra o logo.
- **Efeitos:** 248 eventos gerados pela própria linha do tempo (`audio/eventos.json`): contornos, janelas,
  checks, valores, contagens, carimbos, a queda do sinal, o "barrado".
- **Mixagem:** ducking por bandas a partir da voz (a trilha desce 8,5 dB no miolo, antes de cada palavra
  começar, e respira 5,6 dB nas pausas); a voz fica 20 dB acima da trilha enquanto fala.
- **Medido nos arquivos finais** (`ffmpeg ebur128`): mestre **−14,0 LUFS, pico real −1,9 dBTP**;
  WhatsApp **−14,0 LUFS, pico real −1,9 dBTP**.

## O que foi verificado

Com `scripts/conferir.py`, sobre os **arquivos finais**:

```text
== formato ==
  mestre: 1080x1920 60.0 fps h264 High yuv420p bt709 · 167.23 s · 53.8 MB · 2575 kbps · aac 48000 Hz 2ch
  whatsapp: 720x1280 30.0 fps h264 High yuv420p bt709 · 167.23 s · 15.5 MB · 742 kbps · aac 44100 Hz 2ch
  ok    mestre 1080×1920 a 60 fps
  ok    mestre com 167.23 s (linha do tempo 167.23 s), som do mesmo tamanho
  ok    versão leve a 30 fps com 15.51 MB (≤ 16 MB)
  ok    versão leve com a mesma duração
== som (medido nos arquivos finais, ffmpeg ebur128) ==
  mestre: -14.0 LUFS · LRA 5.0 · pico real -1.9 dBTP
  ok    mestre: −14 LUFS (±0,5)
  ok    mestre: pico real ≤ −1,5 dBTP
  whatsapp: -14.0 LUFS · LRA 5.1 · pico real -1.9 dBTP
  ok    whatsapp: −14 LUFS (±0,5)
  ok    whatsapp: pico real ≤ −1,5 dBTP
== sincronia no arquivo final ==
  ok    mestre: som do arquivo × mixagem: +0.0 ms
  ok    whatsapp: som do arquivo × mixagem: +0.0 ms
  ok    legenda: 42/42 páginas entram no quadro previsto (desvio médio +60 ms, pior +67 ms)
  ok    voz: cada assunto começa no tempo da linha do tempo (energia sobe ≥ 4.2× no início de cada um)
== nada parado por mais de 0,5 s nas partes sem tela ==
  ok    trechos parados > 0,5 s fora das telas: nenhum
  (nas telas, a maior parada é de 1.20 s — é a espera depois do último destaque)
== cor da marca no arquivo final ==
  ok    limão no quadro 0 = (174, 248, 38) (marca: 175, 250, 39)
  ok    fundo no quadro 0 = (10, 10, 10) (marca: 10, 10, 10)
RESULTADO: tudo certo
```

Além disso:

- **Folhas de contato.** Durante a montagem revisei o vídeo inteiro a cada 0,4 s (419 quadros) e corrigi o
  que apareceu: contornos e legendas "fantasmas" (elementos filhos visíveis com o pai escondido), um
  risco limão que sobrava na tela dos três passos, o contorno do título "Hoje na pousada" que cortava a
  última letra, a barra do Vinícius cortada na janela do calendário, o carimbo "LANÇADO 1 VEZ" quebrando
  em duas linhas, o valor do preço mostrando centavos aleatórios durante a contagem, valores da dor
  dentro da coluna de botões. `output/folha-contato.jpg` é tirada do mestre final (1 quadro por segundo).
- **Sincronia.** Os destaques usam o tempo de início da palavra; o contorno começa ~0,12 s antes e
  assenta ~0,3 s depois. No arquivo final, as 42 páginas da legenda entram no quadro previsto e o som do
  mp4 está a 0 ms da mixagem.
- **Regras de conteúdo.** Conferidas quadro a quadro nas folhas e garantidas pelos recortes: não há Day
  Use, nome de pousada nem faixa de demonstração em nenhum arquivo de `src/telas/`.
- **Zonas.** Conferidas com as três zonas pintadas por cima de 16 quadros (os de maior ocupação de cada cena).

Pontos que deixo à vista, porque dependem de leitura da regra:

1. **Tela 13** mostra, por natureza, a mesma acomodação com três tarifas (Semana, Fim de semana, Período
   especial). Entendi a regra "mesma acomodação com valores diferentes" como proibição de dados
   contraditórios, não das três tarifas que a própria tela do roteiro traz.
2. **Telas 05 e 04** têm Mariana Costa com saldos diferentes (R$ 287,00 na comanda, R$ 412,00 no
   check-out). São cenas separadas; a troca é por esmaecimento, sem as duas legíveis ao mesmo tempo.
3. **Duração:** 2 min 47 s, não 2 min 45 s — a voz não foi acelerada.

## O que eu melhoraria numa próxima versão

- **Ouvir e regravar o que for preciso.** Com escuta (ou transcrição) dá para regravar só a frase que
  sair torta e trocar a tomada; hoje o processo regrava tudo.
- **Voz em PCM e com compressor.** Para fechar −14 LUFS, o limitador segura picos da voz em até 7 dB
  (cerca de 90 trechos curtos, ~0,1 s cada; mais de 6 dB em 0,3 % do tempo). Um compressor suave antes dele seria mais transparente; não mexi
  porque não tinha como julgar de ouvido.
- **Aviso do computador maior.** O "Período ocupado" é uma faixa larga e baixa; mesmo na janela ele fica
  com texto de ~30 px. Uma versão da tela 09 em formato de celular resolveria.
- **Celular inteiro maior.** A vista do aparelho completo usa só 552 px de largura para caber acima da
  legenda; é um plano de localização, não de leitura.
- **Trilha.** Feita por síntese em código: funciona como cama discreta, mas uma trilha tocada/produzida
  daria mais calor.
- **Versão leve em 1080p** se o envio for como documento (sem recompressão do WhatsApp).

## Como refazer

```bash
python3 -I scripts/preparar_telas.py        # recorta as telas do pacote para src/telas/
python3 scripts/gerar_narracao.py --formato mp3_44100_192   # só se for regravar a voz
python3 scripts/montar_narracao.py          # pausas + tempos por palavra
node scripts/exportar.mjs                   # eventos de som, legenda e tempos; confere as regras
python3 scripts/trilha.py && python3 scripts/efeitos.py audio/eventos.json -o audio/efeitos.wav && python3 scripts/mixar.py
bash scripts/renderizar.sh                  # quadros (4 processos) → mestre, versão leve, miniatura
python3 scripts/conferir.py --folha         # confere os arquivos finais e gera a folha de contato
```

Estrutura: `src/` (página do vídeo: `motor.js` é o motor de animação determinístico, `aparelho.js` o
celular/janela, `legenda.js`, `cenas/*.js`), `scripts/` (voz, som, render, conferência), `audio/`
(gravação bruta, alinhamento, relatórios), `output/` (entregas). Os WAVs intermediários não vão para o
repositório; os scripts os regeneram de forma idêntica.
