# FAZLO Hospeda — vídeo institucional (≈ 95 s, 9:16, para WhatsApp)

**Status:** prévia v3 para aprovação. Nenhuma fala é cortada no meio da frase e saiu o "DOCUMENTO NÃO / FISCAL" do recibo. Depois do aval sai o MP4 final.

Vídeo de apresentação do sistema, feito para ser enviado no WhatsApp:

- **Miniatura:** o quadro 0 já mostra "FAZLO Hospeda" e uma frase forte por cima da bagunça.
- **Sem som:** as frases principais da narração ficam escritas na tela.
- **Formato:** MP4 leve, 1080×1920.

Usa **somente telas reais** do sistema: capturas da demonstração (`demo.fazlohospeda.com.br`), levantadas no inventário do repositório `uaipertim/fazlo-hospeda`, branch `docs-mapeamento` (`INVENTARIO-FAZLO-HOSPEDA.md`, pasta `capturas/`). Nenhuma tela foi inventada ou retocada. As capturas usadas estão copiadas em [`src/capturas/`](src/capturas), com o nome `módulo--arquivo.png`.

## Em revisão: o motion novo (cenas 1 a 4)

`output/revisao/institucional-motion-cenas-1-4.mp4` (53,2 s) mostra a direção de motion pedida depois da v3. As cenas 5 a 8 ainda estão como na v3 e entram depois da aprovação.

- **Motion sobre as capturas** (`runOps` em `src/anim.js`): cada efeito cobre um trecho da captura com a cor de fundo medida ali e redesenha em movimento os **pixels reais da própria captura**. Termina sempre na captura original, sem tela, valor ou função inventados.
  - **Números vivos:** "R$ 800,00", "- R$ 300,00" e "R$ 500,00" contam em reais inteiros e desaceleram no fim. O "5 livres • 5 ocupadas" sobe rolando como placar.
  - **Digitação com cursor piscando:** a captura aparece letra a letra no "R$ 500,00" do campo "Valor (R$)" do check-in (com a câmera aproximando) e nos códigos FHZ-VB2MZ2 e FHZ-000132.
  - **Toques:** dedo com onda no "+", em "Avançar", "Ver voucher", "Enviar por e-mail", no campo de valor e em "Confirmar recebimento e realizar Check-in".
  - **Destaques:**
    - entrada do recorte em mola, com leve overshoot;
    - brilho limão que dá uma volta no contorno;
    - selos que estalam ("HOSPEDADA", "CHECK-OUT HOJE", "DISPONÍVEL", "CONFIRMADA", "Quitação 100%", "Saldo: R$ 0,00");
    - o círculo e o check de "Reserva Criada!" que se desenham.
  - **Movimento que conta a história:**
    - os quartos do dia entram um a um, cada um com o seu selo;
    - o recibo de check-in sai "impresso", subindo aos trancos;
    - as linhas do recibo saem da esquerda para a direita;
    - câmera com parallax e aproximação suave em cada recorte.
- **Leitura:** a animação acontece na entrada. Depois dela, cada recorte fica parado no mínimo 3 s. Por isso o vídeo inteiro passa a ter cerca de 109 s.
- **Ritmo:** trilha a 105 BPM (F · C/E · Dm · B♭), e cada troca de tela cai num tempo da música. Efeitos discretos para tecla, contagem, check, selo, impressão, toque e brilho.

## Arquivos para revisão

| Arquivo | O que é |
|---|---|
| `output/revisao/institucional-previa-v3.mp4` | prévia v3 completa: imagem, narração, trilha e efeitos (94,7 s · 14,2 MB · −14,0 LUFS · pico real −1,4 dBTP) |
| `output/storyboard.jpg` | as cenas 1, 2 e 8 e o meio da pausa de cada recorte, tirados direto do motor |
| `output/revisao/mix.txt` | onde entra cada trecho de voz e a conferência da mixagem |
| `output/revisao/voz.txt` | as falas e frases geradas |
| `output/revisao/trechos.txt` | os trechos de voz e, nas cenas 7 e 8, onde caiu o corte entre frases (sempre no silêncio) |

## Ritmo e voz (regras desde as prévias v2 e v3)

A linha do tempo das cenas 3 a 7 não tem mais horários fixos. O motor monta a lista de batidas (`PLAN` em `src/anim.js`) a partir da duração real de cada trecho de voz (`src/voz-trechos.json`):

- **Recorte parado:** cada recorte em relevo fica parado e legível por **no mínimo 3,0 s**, depois de 0,5 s de subida. Se o trecho de voz que fala dele for mais longo, o recorte fica até 0,7 s depois do fim da fala.
- **Frase:** a frase escrita entra com o recorte e **só sai quando o recorte começa a voltar** para a tela.
- **Menos recortes em vez de pressa:** saíram as etapas do assistente de reserva, a "comanda aberta" da ficha, o 2º recorte de relatórios e o formulário de fechamento separado dos cartões. O fechamento agora é um recorte só, com o formulário e os cartões juntos.
- **Voz:** a voz nunca é acelerada, e **nenhuma fala é cortada no meio de uma frase**.
  - **Cenas 3 a 6:** cada frase é gerada numa chamada própria e entra inteira, com o final natural de frase.
  - **Cenas 7 e 8:** as frases vêm separadas por pausas na própria gravação, e o corte cai no silêncio da pausa (−75 a −92 dB do pico, conferido em `scripts/trechos.py`).
  - **Emendas:** toda emenda tem fade de 30 ms na entrada e na saída.
  - **Pausas:** o tempo a mais fica nas pausas entre as frases.

## Mecânica: "recorte em relevo + trilho de módulos"

- **Celular em ¾.** Mostra as capturas reais com perspectiva verdadeira: a tela é desenhada em faixas verticais, cada uma na sua profundidade.
- **Recorte em relevo.** O trecho que importa sai da tela como uma placa com contorno limão e sombra, e cresce até ficar legível. Um destaque limão marca o dado. O resto do celular escurece e desfoca.
- **Navegação.** Dentro de um módulo, a tela seguinte empurra a anterior, com um toque visível no botão real que leva até ela. No caixa, a página rola de volta ao topo antes do toque em "Fechar Caixa". Entre módulos, o celular gira no eixo vertical.
- **Trilho.** No alto, os chips RESERVAS · CHECK-IN · COMANDA · CAIXA · CHECK-OUT · RELATÓRIOS acendem conforme o vídeo avança.
- **Identidade:** fundo `#0A0A0A`, limão `#AFFA27`, Inter Display 900 nas frases e JetBrains Mono NL nos chips. A logo oficial entra sem alteração (`src/assets/fazlo-hospeda-logo-alpha.png`, mesmo arquivo dos Reels).

## Roteiro e capturas

Os tempos de cada cena estão em `audio/cues.json` (`cenas`, `voz`, `recortes`), e o storyboard é gerado a partir deles.

| # | Tempo | Voz (trechos) | Recortes | Capturas (`capturas/…/celular/` no repositório do sistema) |
|---|---|---|---|---|
| 1 | 0–6,2 s | "Reserva anotada no caderno, consumo no papel e um caixa que nunca bate?" | — (bagunça ilustrada; logo + **"Caderno, papel e um caixa que nunca bate?"** inteiros no quadro 0) | — |
| 2 | 6,2–12,5 s | "Conheça o FAZLO Hospeda: a gestão da sua pousada em um só lugar." | — (a logo cresce; **"A gestão da sua pousada em um só lugar."**; o celular sobe) | logo oficial |
| 3 | 12,5–32,2 s | "Veja a ocupação no calendário." · "Lance uma reserva em poucos passos." · "E envie o voucher ao hóspede." | "5 livres • 5 ocupadas" · "Total do período R$ 800,00" · "Reserva Criada!" · voucher (só código, status e botões) | `02-calendario/calendario-rolagem` · `13-nova-reserva/etapa2-acomodacao-escolhida` · `13-nova-reserva/reserva-criada` · `03-reservas/voucher` |
| 4 | 32,2–41,9 s | "No check-in, registre o pagamento." · "E gere o recibo na hora." | "Saldo das diárias no Check-in: R$ 500,00" · "O valor integral das diárias foi recebido e lançado no caixa. Saldo: R$ 0,00" | `14-check-in/modal-check-in` · `14-check-in/recibo-check-in` |
| 5 | 41,9–55,3 s | "Durante a estadia, cada consumo do hóspede é lançado." · "E vai direto para a conta dele." | "Café Especial Expresso ×2 · R$ 14,00 · Adicionar à comanda" · "lançado com sucesso na comanda do Bica D'Água 01!" | `04-hospedagens/ficha-hospedagem-ana` (só na tela) · `06-comandas/modal-quantidade` · `06-comandas/consumo-lancado` |
| 6 | 55,3–67,5 s | "Cada recebimento entra no caixa." · "Você abre e fecha o caixa sabendo exatamente quanto entrou." | "Pagamento de hospedagem — Ana Julia Costa + R$ 1.920,00" · "Fechar sessão de caixa" + os 4 cartões (Total de entradas + R$ 1.525,00) | `07-caixa/caixa-rolagem` · `07-caixa/caixa` (só na tela) · `07-caixa/form-fechar-caixa` |
| 7 | 67,5–83,3 s | "No check-out, tudo fecha com recibo." · "E os relatórios mostram como a pousada está indo." | "Saldo final R$ 0,00 · Quitado" · cabeçalho do recibo de hospedagem (código da reserva) + selo "Saldo quitado" · receita de diárias e de consumo | `04-hospedagens/modal-check-out` · `04-hospedagens/recibo-check-out` · `08-relatorios/relatorios-rolagem` |
| 8 | 83,3–94,7 s | "FAZLO Hospeda." · "No celular ou no computador." · "Teste agora na demonstração." | — (computador com o calendário e celular com a visão geral; as duas telas viram a entrada da demo; chip `demo.fazlohospeda.com.br` até o fim) | `computador/02-calendario--calendario` (só o topo) · `01-visao-geral/visao-geral` · `00-acesso/login-demo` (celular e computador) |

**Cuidados com as capturas:**
- **Quebras de linha defeituosas fora dos recortes.**
  - Recibo de check-in: o título "HOSPEDAGEM QUITADA NO CHECK-IN" quebra em "CHECK-" / "IN" no celular (defeito do sistema). O recorte começa em y 915: o "IN" termina em y 914 e a frase começa em y 917. A margem de cima é preenchida com o verde do próprio cartão (`#ECFDF5`).
  - Voucher: o nome da pousada quebrava em "Pousada Demonstração" / "FAZLO". O recorte mostra só o código, o status e os botões.
  - Caixa: o lançamento do Carlos partia o nome ("Carlos" / "Henrique Silva"). Entrou o da Ana Julia, que quebra no travessão.
  - Recibo de check-out: o título "RECIBO DE HOSPEDAGEM — DOCUMENTO NÃO / FISCAL" quebra a linha. Sobem só o cabeçalho do recibo (com o código da reserva) e, separado, o selo "SALDO QUITADO".
  - Ficaram só as quebras normais de texto longo, como "feche o / caixa."
- **Voucher:** a tela do voucher fica escurecida e desfocada o tempo todo, então o nome do hóspede nunca aparece legível.
- **Textos errados da demo fora dos recortes:** "PRODUCT" e nomes cortados em Comandas, "isolamento do tenant" no recibo e "created_at" em Relatórios.
- **Não usados:**
  - rodapé do login do app;
  - "checked_out_at";
  - "Check-out 11:00";
  - modais de Acomodações no celular;
  - Usuários e Configurações;
  - Day Use.
- **Menu do computador:** o item "Usuários" aparece só como item do menu lateral, aprovado.

## Narração (ElevenLabs)

- **Voz e ajustes:** Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`), `eleven_multilingual_v2`, estabilidade 0,40 · semelhança 0,80 · estilo 0,35 · speaker boost · velocidade 1,0, sem aceleração.
- **Geração:** seed 808, com as falas vizinhas como contexto.
  - **Cenas 1, 2, 7 e 8:** uma chamada por fala.
  - **Cenas 3 a 6:** uma chamada por frase. Cada frase vai com uma pausa de 0,4 s depois do ponto final (`<break>`): sem ela, a API devolvia algumas frases cortadas na última sílaba.
  - **Conferência:** o `voz.py` só aceita uma tomada que termina em silêncio (≤ −45 dB nos últimos 40 ms). Se não terminar, tenta a semente seguinte. A frase 6a ficou com a seed 809.
- **Mudanças de texto:** para que cada frase tenha final próprio, a cena 5 virou "Durante a estadia, cada consumo do hóspede é lançado." / "E vai direto para a conta dele." (pedido). A 2ª frase da cena 6 virou "Você abre e fecha o caixa sabendo exatamente quanto entrou." (antes "que você abre e fecha…", que não fica de pé sozinha).
- **Cena 2 ("Hospeda" saía "Hóspeda"):** a API recebe **"Ospéda"** com a seed 810. A cena 8 sai certa ("Hospéda") e serviu de referência.
  - Comparação: 6 tomadas ("Hospéda" e "Ospéda" × seeds 808/809/810) contra a cena 8 (certa) e a cena 2 antiga (errada), por análise acústica no Praat. Medidas: sílaba tônica (duração, intensidade e F0 da 1ª e da 2ª sílaba) e distância MFCC/DTW da palavra.
  - **Certa (cena 8):** 1ª sílaba curta (45 ms) e 2ª mais forte (+4 dB).
  - **Errada (cena 2 antiga):** 1ª longa (175 ms) e 2ª mais fraca (−7,8 dB).
  - **Escolhida ("Ospéda", seed 810):** 1ª curta (35–40 ms) e 2ª mais forte (+2,5 a +5 dB); distância 1,03–1,15 da certa e 1,76–1,80 da errada.
  - **Descartadas:** todas as tomadas com "Hospéda" saíram com o padrão da errada.
- **Chave:** a chave da API não fica no repositório nem é impressa. Nesta nuvem a rede a injeta; fora dela, use `ELEVENLABS_API_KEY`.

## Trilha e mixagem (`scripts/trilha.py`)

100% sintetizadas (numpy/scipy):

- **Cena 1:** zumbido grave e tenso, tique de relógio, papel e a fita do caixa sacudindo; a bagunça é sugada.
- **Da virada em diante:** Fá maior a 100 BPM (Fmaj7 · Dm7 · B♭maj7 · C), com pad, baixo e kalimba em arpejo.
- **Batida:** discreta (bumbo, shaker, aro) durante as telas.
- **Fim:** o acorde de Fá fica soando, com a sineta de recepção da série no endereço da demo.
- **Efeitos:** nos instantes da animação (recorte sobe e volta, toque, troca de tela, giro, chip do trilho).
- **Mixagem:** a trilha e os efeitos abaixam 9,5 dB sob a voz. Master em −14 LUFS e pico real ≤ −1 dBTP no MP4.

## Como gerar

```bash
python3 scripts/voz.py              # as falas e frases (audio/voz/cena-<id>.wav + falas.json) e output/revisao/voz.txt
python3 scripts/voz.py --so 2       # refaz só a cena 2 (aceita frases: --so 3b)
python3 scripts/trechos.py          # os trechos (frases inteiras): audio/voz/trechos/*.wav + src/voz-trechos.json
node scripts/render.cjs cues        # a linha do tempo do motor: audio/cues.json (cenas, voz, recortes, efeitos)
python3 scripts/trilha.py           # trilha + efeitos + voz: audio/mix.wav e output/revisao/mix.txt
python3 scripts/storyboard.py       # output/storyboard.jpg
node scripts/render.cjs video --out output/revisao/institucional-previa-v3.mp4
node scripts/render.cjs stills 0,15,59.5            # quadros soltos em output/stills/
```

**Formato "leve" para o WhatsApp:** H.264 High 4.1, 30 fps, CRF 23 com teto de 3,5 Mb/s, AAC 128 kb/s, faststart.
