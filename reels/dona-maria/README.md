# Reel "Dona Maria": duas famílias no mesmo chalé

Reel do @fazlohospeda com a personagem Dona Maria, dona de pousada: 1080×1920, 30 fps, **33,6 s**. A timeline aprovada (com a pausa de 2,5 s depois de "não deixa") está em [`TIMELINE.md`](TIMELINE.md). **Não publicar antes do OK.**

▶ [`output/dona-maria.mp4`](output/dona-maria.mp4) · revisão: [`output/revisao/relatorio.txt`](output/revisao/relatorio.txt) (aprovado) · [`output/revisao/quadros.jpg`](output/revisao/quadros.jpg) · [`output/revisao/boca.jpg`](output/revisao/boca.jpg)

| Trecho | Tempo |
|---|---|
| Abertura (Dona Maria) | 0–10,84 s |
| Meio: calendário | 10,95–18,60 s |
| Meio: nova reserva | 18,60–22,43 s |
| Meio: período ocupado | 22,43–26,45 s (parado 2,75 s depois de "não deixa") |
| Fechamento (Dona Maria) | 26,65–31,59 s |
| Logo | 31,59–33,60 s |

- **Vídeos da Dona Maria** (`midia/`):
  - corte do silêncio inicial (0,45 s e 0,30 s);
  - upscale lanczos para 1080 de largura, com nitidez leve e recorte dos 86 px de baixo;
  - 25 → 30 fps por repetição de quadros (sem interpolação);
  - a voz entra sem tratamento: só o ganho geral do master, e o limitador age em 0,13% das amostras.
- **Telas:** só as 3 anexadas (`telas/`). A tela 03 entra sem pulo: os deslocamentos do modal foram medidos nas próprias telas.
- **Legenda:**
  - palavra por palavra (padrão do reel-09), chaves em limão, linhas em y 1440/1516, abaixo do queixo;
  - os tempos vêm de `scripts/alinha.py`: os inícios de frase são medidos nas pausas, e as palavras no meio do trecho caem no vale de energia mais próximo;
  - a chave do ElevenLabs não tem permissão de transcrição nem de alinhamento forçado.
- **Trilha:** a cama sintetizada, 80 BPM, 18 dB abaixo da voz, com fade no fecho. Master em −14 LUFS, pico −2,3 dBTP.

```bash
python3 scripts/alinha.py                  # audio/palavras.json (os tempos de cada palavra)
node scripts/render.cjs info               # output/info.json
python3 scripts/audio.py                   # audio/mix.wav
node scripts/render.cjs video              # output/dona-maria.mp4
python3 scripts/qa.py                      # output/revisao/relatorio.txt
```
