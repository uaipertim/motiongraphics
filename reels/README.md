# FAZLO Hospeda — série de Reels

Nova fase de produção dos Reels do Instagram do FAZLO Hospeda. O **Motion Graphics V2** ([`../v2`](../v2)) é a referência de qualidade visual, movimento, ritmo e acabamento. Cada Reel desta série tem conceito próprio e vive numa pasta independente, com vídeo, capa, storyboard, revisão técnica e todos os arquivos-fonte.

| Reel | Conceito | Duração | Pasta |
|---|---|---|---|
| **00** | **"Sob o mesmo teto."** Apresentação do produto: a pousada inteira (reservas, hospedagens, check-in/out, comandas, pagamentos e caixa) num só sistema | 28,2 s | [`reel-00/`](reel-00) |
| **01** | **"Toda estadia é um ciclo."** O caminho de uma hospedagem, da reserva ao caixa (o Motion Graphics V2, referência de qualidade da série) | 29 s | [`../v2/`](../v2) |
| **02** | **"Cada reserva no seu lugar."** Gestão de reservas: o calendário de ocupação vira um tabuleiro 3D (disponibilidade, dia/semana/mês, filtros por status, voucher) | 27,8 s | [`reel-02/`](reel-02) |
| **03** | **"O caixa bateu?"** Controle de caixa: um cofre-forte 3D guarda a sessão — abertura com saldo inicial, lançamentos por tubos pneumáticos até o diário, saldo esperado em dinheiro, conferência com diferença zero, fechamento e histórico de sessões | 30 s | [`reel-03/`](reel-03) |
| **05** | **"Da chegada à saída."** Check-in e check-out: um dia inteiro na pousada em time-lapse — CHECK-IN nasce atrás da serra como um sol, os consumos sobem como lanternas e viram a constelação da comanda, o acerto só dos extras com recibo final, CHECK-OUT se põe enquanto o carro parte | 28,8 s | [`reel-05/`](reel-05) |
| **06** | **"Em equilíbrio."** Gestão de pagamentos: uma balança de precisão em 3D — o total da hospedagem de um lado, cada pagamento registrado (valor, forma, confirmação) do outro, o pendente no ponteiro até ficar quitada; a linha de nível vira o histórico e a visão geral de tudo que entrou | 24,25 s | [`reel-06/`](reel-06) |
| **07** | **"O feriado acabou. Agora começa a conta."** Pilar ROTINA (identificação, sem apresentar funcionalidades): a conferência do pós-feriado vira uma notinha de caixa impressa — quatro dúvidas da rotina digitadas em verde-limão, o TOTAL carimbado com "???" e o convite para mandar a quem fecha a conta | 14 s | [`reel-07/`](reel-07) |
| **08** | **"Você fechou a recepção. O celular, não."** Pilar ROTINA: o relógio de plantão — um relógio gigante avança de 23:00 a 23:59 e, a cada salto de minuto, chega a mensagem de um hóspede; os cards se empilham e se comprimem até o "+37 NÃO LIDAS" carimbado; tem também uma versão com voz (teste de narração com a voz oficial da FAZLO, ElevenLabs) | 16 s | [`reel-08/`](reel-08) |

O v1 continua intacto na raiz do repositório. Não há Reel 04 neste repositório; a numeração segue a dos pedidos.

Fora da série de Reels, com a mesma identidade: os **Stories do Destaque "Conheça"** (4 × 8 s + capa do Destaque) em [`../stories/conheca/`](../stories/conheca) e os **carrosséis** do pilar DICA em [`../carrosseis/`](../carrosseis) (Carrossel 01: "Como cobrar o sinal sem constrangimento").

O **vídeo institucional** (60 s, com narração, para enviar no WhatsApp) fica em [`institucional/`](institucional). Ele usa outra mecânica, "recorte em relevo + trilho de módulos": um celular em ¾ com capturas reais da demonstração e as frases da narração escritas na tela. Tem formato próprio: 30 fps e MP4 leve.

## Padrões da série

- **Formato:** 9:16, 1080×1920, 60 fps, H.264 (yuv420p) + AAC 48 kHz estéreo, áudio em −14 LUFS e pico real ≤ −1 dBTP.
- **Pilar ROTINA** (a partir do Reel 07): vídeos curtos de identificação com a rotina do gestor, sem apresentar funcionalidades nem CTA comercial; só efeitos sonoros (−16 LUFS), para a música ser escolhida no Instagram; textos importantes dentro do recorte central 3:4 da grade do perfil.
- **Identidade:** preto, verde-limão `#AFFA27` (amostrado da logo) e branco; cores de status do próprio app; Inter Display nos títulos e JetBrains Mono nos dados.
- **Logo:** sempre o arquivo oficial, sem redesenho. Só o branco *fora* do círculo é tornado transparente (`scripts/logo_alpha.py`).
- **Conteúdo:** nada de telas, celulares ou computadores; só funções que existem no produto; valores e nomes são os dados de demonstração das próprias telas.
- **Assinatura sonora:** a sineta de recepção (parciais inarmônicos sintetizados), afinada no tom de cada peça, acompanha a entrada da marca.
- **Motor:** animação determinística em Canvas 2D (`renderAt(ctx, t)`), render quadro a quadro no Chromium headless, trilha e efeitos sintetizados em Python.

## Capas — regra fixa (a partir de outubro de 2026, inclusive o Reel 08)

A grade do perfil mostra só o centro 3:4 da capa e põe o ícone de play no canto superior direito. Toda capa nova segue:

1. **Recorte 3:4:** título, visual principal e logo dentro da faixa central 1080×1440 (y 240–1680), com **folga de 60 px** nas bordas — ou seja, em x 60–1020, y 300–1620.
2. **Canto do ícone de play livre:** nada de texto ou elemento importante em **x ≥ 860, y 240–440**. O título vai mais à esquerda ou mais abaixo (ou com a linha curta no alto).
3. **Faixa do contador livre:** nada importante em **y 1560–1680** — o contador de visualizações cobre o canto inferior esquerdo da miniatura (regra de outubro de 2026, a partir das capas dos Reels 06, 05 e 02). Na prática, o conteúdo termina em y ≈ 1540.
4. **Nada cortado nem escondido:** chips, rodapés, placas 3D e textos inteiros dentro do recorte, sem um cobrindo o outro (no vídeo, cortes de propósito funcionam; na capa, parecem erro).
5. **Hierarquia:** título > visual > logo (pequena e discreta, só se couber sem competir), sem CTA.
6. **Fundo preto:** capa de Reel é sempre no preto da série. O fundo verde-limão com texto preto é a capa dos carrosséis do pilar DICA ([`../carrosseis/README.md`](../carrosseis/README.md)).

Conferência: `python3 reels/tools/revisao_capa.py reels/reel-NN --vizinhos reels/reel-07 reels/reel-06` gera `capa.jpg`, a prévia `revisao/capa-no-feed.jpg` (recorte 3:4, folga, canto do play e faixa do contador marcados, a capa na grade ao lado das vizinhas) e `revisao/capa.txt`. A checagem pelos pixels trata como conteúdo tudo o que se destaca da cor de fundo dominante (escura ou clara, como o limão do Reel 03) — gravações e brilhos sutis do fundo não contam; para capas com cena de fundo de ponta a ponta (a paisagem do Reel 05), o `--cena` faz valer as caixas de cada elemento (`revisao/capa-caixas.json`, exportadas pela página da capa), que também conferem se um elemento cobre outro. Se a página da capa exportar `_bloco` (topo, base e centro do bloco principal), a conferência também mede se ele está centralizado na vertical do recorte 3:4 (centro em y = 960); e um vizinho em `--vizinhos` pode ser um carrossel (o post 4:5 entra na grade pelo recorte 3:4 central).

**Linha da grade:** `python3 reels/tools/previa_linha.py reels/reel-06 reels/reel-05 reels/reel-02 --saida reels/grade/linha-2-reels-06-05-02.jpg` monta as capas lado a lado, na ordem do perfil: em cima, cada capa 9:16 com o recorte 3:4, o canto do play, a faixa do contador e a folga marcados; embaixo, a linha como a grade mostra (recorte 3:4, ícone de play e um contador de visualizações de exemplo). Prévias em [`grade/`](grade) — linha 2 (Reels 06, 05 e 02): [`grade/linha-2-reels-06-05-02.jpg`](grade/linha-2-reels-06-05-02.jpg). Nas capas dos Reels 06 e 02 a logo pequena fica no alto, no centro (y ≈ 330–382); na do Reel 05, o bloco logo + título está centralizado na capa (centro em y = 960), a pedido.
