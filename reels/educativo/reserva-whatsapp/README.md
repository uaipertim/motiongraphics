# Educativo · "Recebeu uma reserva pelo WhatsApp? Confira antes de registrar."

Reel educativo do @fazlohospeda (sexta, 30/10/2026), feito a partir do [saldo-checkout](../saldo-checkout).

**Não é demonstração do sistema:**
- Não mostra a interface do FAZLO Hospeda e não imita telas nem o app de conversa.
- O balão é genérico, no DNA da marca: cartão escuro com borda limão.
- Os dados da mensagem e da ficha são fictícios ("Ana Lima", telefone `(00) 90000-0000`, Chalé 3, valores) e a tela mostra "Exemplo fictício" em todo quadro com dado.
- Não promete integração com nenhum serviço.

▶ **Vídeo:** [`output/reserva-whatsapp.mp4`](output/reserva-whatsapp.mp4) (35,75 s, 1080×1920, 60 fps). **Para aprovação: não publicar antes do OK.**
**Capa (quadro 0):** [`output/capa.jpg`](output/capa.jpg). **Legenda do post:** [`legenda.txt`](legenda.txt). **Revisão:** [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt).

## Cenas (no tempo da locução)

| Tempo | Locução | Tela |
|---|---|---|
| 0,0–2,7 s | "Recebeu uma reserva pelo WhatsApp?" | Capa: chip "ANTES DE REGISTRAR", título e balão "MENSAGEM RECEBIDA" com "EXEMPLO FICTÍCIO" |
| 2,7–6,2 s | "Antes de registrar, confira cinco informações." | O balão encolhe e sobe; "confira 5 informações:" e as casas 01–05 em "cinco" |
| 6,2–24,7 s | os cinco itens | Ficha de conferência em papel, com selo "EXEMPLO FICTÍCIO". Cada item acende na própria frase, o dado fictício é escrito e o check entra na palavra que nomeia o item: Nome, Datas, pessoas, acomodação, sinal |
| 24,7–29,0 s | "Com isso conferido, a reserva entra certa desde o começo." | Carimbo "CONFERIDA" em "conferido"; brilho limão e check no balão em "certa" |
| 29,0–32,6 s | "Envie para quem atende o WhatsApp da sua pousada." | "Envie / para quem atende / o WhatsApp da / sua pousada." com o avião |
| 32,6–35,8 s | — | Logo do FAZLO Hospeda e @fazlohospeda, com a sineta |

## Locução, legenda e som

- **Locução** (`scripts/voz.py`):
  - ElevenLabs `eleven_v4`, voz Raquel (`GDzHdQOi6jjf8zaXhCYD`), `voice_settings` só com stability 0,50 e similarity_boost 0,75, endpoint with-timestamps.
  - A narração inteira vai numa chamada, com o texto exato do pedido.
  - "WhatsApp" vai como "Uátsap" só no texto enviado à API (dicionário compartilhado [`serie-explica/scripts/pronuncia.py`](../../serie-explica/scripts/pronuncia.py)); o alinhamento volta para a grafia oficial.
  - Conferência da voz v4: ritmo de 7,5 a 19 letras/s, pausa interna até 0,9 s, fim da fala medido no áudio.
  - A chave fica nos Segredos de rede.
- **Linha do tempo** (`scripts/linha.py`):
  - Os tempos de cada palavra vêm da API.
  - O início das palavras depois de pausa é medido no áudio, como na Série Fala.
  - O fim da voz é medido no áudio. A logo entra 0,7 s depois da última palavra.
- **Legenda:** palavra por palavra no padrão do reel-09/Série Fala.
  - Inter Display 900, 68 px, branca, chaves em limão.
  - Linhas em y 1332/1412, x 130–950.
  - Cada página fica ≥ 1,5 s na tela.
- **Som** (`scripts/audio.py`): voz + trilha da Série Explica, ~10 dB abaixo da voz, com ducking, + efeitos nos gestos da animação. Master em −14 LUFS, com o limitador em −2,4 dBTP para deixar folga para o AAC (no MP4: pico ≤ −1,5 dBTP).

## Rodar

```bash
cd reels/educativo/reserva-whatsapp
python3 scripts/voz.py                              # locução (só gera se ainda não existir; --refaz para gerar de novo)
python3 scripts/linha.py                            # linha.json
python3 scripts/audio.py                            # audio/mix.wav (+ cues.json e as trilhas separadas)
node scripts/render.cjs video --mix audio/mix.wav   # output/reserva-whatsapp.mp4
node scripts/render.cjs info                        # output/info.json (páginas da legenda e caixas a cada 0,25 s)
python3 scripts/qa.py                               # output/revisao/relatorio.txt, zonas-seguras.jpg, capa e revisão da capa
```

## Revisão (scripts/qa.py) · resultado: aprovado

- **Formato:** H.264 yuv420p 1080×1920 60 fps · AAC 48 kHz estéreo · 35,75 s · vídeo e áudio com a mesma duração.
- **Som:** −14,0 LUFS · pico real −2,2 dBTP · trilha 10,3 dB abaixo da voz.
- **Legenda:** 15 páginas, a mais curta com 1,55 s na tela, sem sobreposição. Fica dentro de x 130–950, acima de y 1536, e não encosta na cena. 18 palavras-chave em limão.
- **Sincronia:**
  - 21 palavras depois de pausa: 3 ms em média e 31 ms no máximo (limite 80 ms).
  - Cada página aparece no quadro da 1ª palavra ou até 1 quadro depois.
  - "reserva", "forma" e "certa" não têm silêncio real antes e não entram na medida.
- **Zonas seguras:** nada na coluna de botões nem nos 20% de baixo; todas as caixas entre y 265 e 1536.
- **Grafia e dados:** nenhuma grafia fonética na tela. "Exemplo fictício" aparece em todos os quadros com dado.
- **Logo:** entra 0,70 s depois da última palavra e fica 3,2 s.
- **Capa:** o quadro 0 está dentro da regra das capas ([`capa.txt`](output/revisao/capa.txt), [`capa-no-feed.jpg`](output/revisao/capa-no-feed.jpg)).
