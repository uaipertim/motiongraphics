# FAZLO Hospeda — série de Reels

Nova fase de produção dos Reels do Instagram do FAZLO Hospeda. O **Motion Graphics V2** ([`../v2`](../v2)) é a referência de qualidade visual, movimento, ritmo e acabamento. Cada Reel desta série tem conceito próprio e vive numa pasta independente, com vídeo, capa, storyboard, revisão técnica e todos os arquivos-fonte.

| Reel | Conceito | Duração | Pasta |
|---|---|---|---|
| **00** | **"Sob o mesmo teto."** Apresentação do produto: a pousada inteira (reservas, hospedagens, check-in/out, comandas, pagamentos e caixa) num só sistema | 28,2 s | [`reel-00/`](reel-00) |

Os vídeos anteriores continuam intactos: o v1 na raiz do repositório e o v2 em [`../v2`](../v2).

## Padrões da série

- **Formato:** 9:16, 1080×1920, 60 fps, H.264 (yuv420p) + AAC 48 kHz estéreo, áudio em −14 LUFS e pico real ≤ −1 dBTP.
- **Identidade:** preto, verde-limão `#AFFA27` (amostrado da logo) e branco; cores de status do próprio app; Inter Display nos títulos e JetBrains Mono nos dados.
- **Logo:** sempre o arquivo oficial, sem redesenho. Só o branco *fora* do círculo é tornado transparente (`scripts/logo_alpha.py`).
- **Conteúdo:** nada de telas, celulares ou computadores; só funções que existem no produto; valores e nomes são os dados de demonstração das próprias telas.
- **Motor:** animação determinística em Canvas 2D (`renderAt(ctx, t)`), render quadro a quadro no Chromium headless, trilha e efeitos sintetizados em Python.
