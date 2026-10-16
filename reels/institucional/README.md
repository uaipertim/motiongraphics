# FAZLO Hospeda — vídeo institucional (60 s, 9:16, para WhatsApp)

**Status:** storyboard e teste de voz para aprovação. A trilha com SFX e o MP4 final vêm depois do aval.

Vídeo de apresentação do sistema, feito para ser enviado no WhatsApp:

- **Miniatura:** o quadro 0 já mostra "FAZLO Hospeda" e uma frase forte por cima da bagunça.
- **Sem som:** as frases principais da narração ficam escritas na tela.
- **Formato:** MP4 leve, 1080×1920.

Usa **somente telas reais** do sistema: capturas da demonstração (`demo.fazlohospeda.com.br`), levantadas no inventário do repositório `uaipertim/fazlo-hospeda`, branch `docs-mapeamento` (`INVENTARIO-FAZLO-HOSPEDA.md`, pasta `capturas/`). Nenhuma tela foi inventada ou retocada. As capturas usadas estão copiadas em [`src/capturas/`](src/capturas), com o nome `módulo--arquivo.png`.

## Arquivos para revisão

| Arquivo | O que é |
|---|---|
| `output/storyboard.jpg` | 24 quadros do vídeo, tirados direto do motor |
| `output/revisao/voz-previa.mp3` | só a narração, nas posições do vídeo (−16 LUFS) |
| `output/revisao/institucional-previa-voz.mp4` | prévia do vídeo com a narração, ainda sem trilha nem SFX |
| `output/revisao/voz.txt` | a conferência das falas (duração × janela) |

## Mecânica: "recorte em relevo + trilho de módulos"

- **Celular em ¾.** Mostra as capturas reais com perspectiva verdadeira: a tela é desenhada em faixas verticais, cada uma na sua profundidade.
- **Recorte em relevo.** O trecho que importa sai da tela como uma placa com contorno limão e sombra, e cresce até ficar legível. Um destaque limão marca o dado dentro dela. O resto do celular escurece e desfoca. Depois de uma pausa para ler, a placa volta para a tela.
- **Navegação.** Dentro de um módulo, a tela seguinte empurra a anterior, com um toque visível no botão real que leva até ela. Entre módulos, o celular gira no eixo vertical.
- **Trilho.** No alto, os chips RESERVAS · CHECK-IN · COMANDA · CAIXA · CHECK-OUT · RELATÓRIOS acendem conforme o vídeo avança.
- **Identidade:** fundo `#0A0A0A`, limão `#AFFA27`, Inter Display 900 nas frases e JetBrains Mono NL nos chips. A logo oficial entra sem alteração (`src/assets/fazlo-hospeda-logo-alpha.png`, mesmo arquivo dos Reels).

## Roteiro, tempos e capturas

| # | Tempo | Narração | Na tela | Capturas (`capturas/…/celular/` no repositório do sistema) |
|---|---|---|---|---|
| 1 | 0–5,8 s | "Reserva anotada no caderno, consumo no papel e um caixa que nunca bate?" | Bagunça ilustrada (caderno, planilha, conversas, bilhetes, fita de caixa com "DIF. −55,00"). Logo + **"Caderno, papel e um caixa que nunca bate?"** já inteiros no quadro 0 | — (ilustração, não é tela do sistema) |
| 2 | 5,8–11 s | "Conheça o FAZLO Hospeda: a gestão da sua pousada em um só lugar." | A bagunça é sugada para a logo, que cresce. **"A gestão da sua pousada em um só lugar."** O celular sobe | logo oficial |
| 3 | 11–21 s | "Veja a ocupação no calendário, lance uma reserva em poucos passos e envie o voucher ao hóspede." | Chip "5 livres • 5 ocupadas" → "Total do período R$ 800,00" → "Reserva Criada!" → voucher | `02-calendario/calendario-rolagem` · `13-nova-reserva/etapa2-acomodacao-escolhida` · `13-nova-reserva/reserva-criada` · `03-reservas/voucher` |
| 4 | 21–27 s | "No check-in, registre o pagamento e gere o recibo na hora." | "Saldo das diárias no Check-in: R$ 500,00" → "Hospedagem quitada no check-in · Saldo R$ 0,00" | `14-check-in/modal-check-in` · `14-check-in/recibo-check-in` |
| 5 | 27–35 s | "Durante a estadia, tudo o que o hóspede consome vai para a conta dele." | "Consumo na comanda · ABERTA" → "Café Especial Expresso ×2 · R$ 14,00" → "lançado com sucesso na comanda do Bica D'Água 01!" | `04-hospedagens/ficha-hospedagem-ana` · `06-comandas/modal-quantidade` · `06-comandas/consumo-lancado` |
| 6 | 35–43 s | "Cada recebimento entra no caixa, que você abre e fecha sabendo exatamente quanto entrou." | Lançamento "+ R$ 85,00 · CHECK-OUT / CONSUMOS" → "Fechar sessão de caixa" → os 4 cartões (Total de entradas + R$ 1.525,00) | `07-caixa/caixa` · `07-caixa/form-fechar-caixa` |
| 7 | 43–52 s | "No check-out, tudo fecha com recibo. E os relatórios mostram como a pousada está indo." | "Saldo final R$ 0,00 · Quitado" → recibo de hospedagem "Saldo quitado" → receitas e formas de pagamento | `04-hospedagens/modal-check-out` · `04-hospedagens/recibo-check-out` · `08-relatorios/relatorios-rolagem` |
| 8 | 52–60 s | "FAZLO Hospeda. No celular ou no computador. Teste agora na demonstração." | Computador (calendário semanal) e celular (visão geral) lado a lado. As duas telas viram a entrada da demo. **"Teste agora na demonstração"** + chip `demo.fazlohospeda.com.br` | `computador/02-calendario--calendario` (só o topo) · `01-visao-geral/visao-geral` · `00-acesso/login-demo` (celular e computador) |

**Cuidados com as capturas:**
- **Voucher:** os recortes mostram só o cabeçalho e os botões. A tela do voucher fica escurecida e desfocada o tempo todo, então o nome do hóspede nunca aparece legível.
- **Recortes:** deixam de fora os textos errados da demo: "PRODUCT" e nomes cortados em Comandas, "isolamento do tenant" no recibo e "created_at" nos cartões de Relatórios.
- **Não usados:**
  - rodapé do login do app (caractere quebrado e versão "v2.4");
  - "checked_out_at";
  - telas com "Check-out 11:00";
  - modais de Acomodações no celular;
  - telas de Usuários e Configurações;
  - Day Use.
- **Menu do computador:** o item "Usuários" aparece só como item do menu lateral, aprovado.

## Narração (ElevenLabs)

- **Voz e ajustes:** Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`), `eleven_multilingual_v2`, estabilidade 0,40 · semelhança 0,80 · estilo 0,35 · speaker boost · velocidade 1,0, sem aceleração.
- **Geração:** uma chamada por cena, com as falas vizinhas como contexto. Seed 808, exceto na cena 2: com a 808 a voz parava 0,7 s entre "FAZLO" e "Hospeda", e a 809 sai contínua.
- **Grafia:** "FAZLO Hospeda" é enviado como está no roteiro. Se a pronúncia sair errada, a troca prevista é "Fázlo" / "Ospéda" (`GRAFIA` em `scripts/voz.py`).
- **Chave:** a chave da API não fica no repositório nem é impressa. Nesta nuvem a rede a injeta; fora dela, use `ELEVENLABS_API_KEY`.

```bash
python3 scripts/voz.py              # gera as 8 falas (audio/voz/cena-N.wav + falas.json) e output/revisao/voz.txt
python3 scripts/voz.py --so 2       # refaz só a cena 2
python3 scripts/voz_previa.py       # output/revisao/voz-previa.mp3
```

## Render

```bash
node scripts/render.cjs stills 0,12.5,59.9            # quadros soltos em output/stills/
python3 scripts/storyboard.py                         # output/storyboard.jpg
node scripts/render.cjs cues                          # audio/cues.json (para a trilha e os SFX)
node scripts/render.cjs video --audio output/revisao/voz-previa.mp3 --out output/revisao/institucional-previa-voz.mp4
```

**Formato "leve" para o WhatsApp:** H.264 High 4.1, 30 fps, CRF 23 com teto de 3,5 Mb/s, AAC 128 kb/s, faststart. A prévia ficou com 10,6 MB em 60 s.
