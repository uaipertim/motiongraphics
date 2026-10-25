# Educativo · "Recebeu o sinal. Quanto falta no check-out?"

Reel educativo do @fazlohospeda (segunda, 26/10/2026). **Não é demonstração do sistema**: não mostra a interface,
não imita telas e não usa nome de hóspede. Os valores são ilustrativos e a tela avisa "Exemplo fictício".

Conta do exemplo (sem descontos): R$ 1.350 + R$ 120 − R$ 450 = **R$ 1.020**.

## Estado

- Roteiro, legenda do post e montagem-base: prontos para aprovação.
- **Locução pendente.** A montagem usa tempos estimados (`linha.json` com `"provisoria": true`) e traz o aviso
  "PRÉVIA · LOCUÇÃO PENDENTE" no topo. Não publicar esta versão.

## Locução (ElevenLabs, conta autorizada)

Modelo `eleven_v4`, voz Raquel - For Conversational (`GDzHdQOi6jjf8zaXhCYD`), stability 0,50, similarity 0,75.
O texto exato está em `roteiro.json` (o "fala" de cada token, na ordem). A chave da API nunca entra em chat, arquivo ou commit.

## Depois que o áudio chegar

```
python3 scripts/linha.py --audio caminho/voz.mp3      # tempos reais: frases nas pausas do áudio, palavras pelas letras
node scripts/render.cjs stills 0,5,15,25 --previa      # conferir quadros
node scripts/render.cjs video --audio caminho/voz.mp3  # vídeo final, sem o aviso de prévia
```

Com o arquivo de tempos do ElevenLabs (with-timestamps), use também `--alinhamento` para sincronizar palavra por palavra.

## Arquivos

- `roteiro.json`: locução (fala), legenda (tela), palavras-chave em limão e a legenda do post.
- `scripts/linha.py`: linha do tempo (estimada ou pelo áudio).
- `src/anim.js`: as cenas (gancho = capa, confira 3 coisas, notinha de conferência, envie, logo) e a legenda palavra por palavra.
- `scripts/render.cjs`: stills, informações e vídeo 1080×1920, 60 fps.
- `pedido-sessao-a.md`: pedido de investigação da falha do sinal na demo (separado deste vídeo).
