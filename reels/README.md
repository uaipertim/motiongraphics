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

O v1 continua intacto na raiz do repositório. Não há Reel 04 neste repositório; a numeração segue a dos pedidos.

Fora da série de Reels, com a mesma identidade: os **Stories do Destaque "Conheça"** (4 × 8 s + capa do Destaque) em [`../stories/conheca/`](../stories/conheca) e os **carrosséis** do pilar DICA em [`../carrosseis/`](../carrosseis) (Carrossel 01: "Como cobrar o sinal sem constrangimento").

## Padrões da série

- **Formato:** 9:16, 1080×1920, 60 fps, H.264 (yuv420p) + AAC 48 kHz estéreo, áudio em −14 LUFS e pico real ≤ −1 dBTP.
- **Pilar ROTINA** (a partir do Reel 07): vídeos curtos de identificação com a rotina do gestor, sem apresentar funcionalidades nem CTA comercial; só efeitos sonoros (−16 LUFS), para a música ser escolhida no Instagram; textos importantes dentro do recorte central 3:4 da grade do perfil.
- **Identidade:** preto, verde-limão `#AFFA27` (amostrado da logo) e branco; cores de status do próprio app; Inter Display nos títulos e JetBrains Mono nos dados.
- **Logo:** sempre o arquivo oficial, sem redesenho. Só o branco *fora* do círculo é tornado transparente (`scripts/logo_alpha.py`).
- **Conteúdo:** nada de telas, celulares ou computadores; só funções que existem no produto; valores e nomes são os dados de demonstração das próprias telas.
- **Assinatura sonora:** a sineta de recepção (parciais inarmônicos sintetizados), afinada no tom de cada peça, acompanha a entrada da marca.
- **Motor:** animação determinística em Canvas 2D (`renderAt(ctx, t)`), render quadro a quadro no Chromium headless, trilha e efeitos sintetizados em Python.
