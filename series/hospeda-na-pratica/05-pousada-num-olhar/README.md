# FAZLO Hospeda na prática, episódio 5: A pousada num olhar (etapa 1)

Segue as [regras da série](../REGRAS.md). Vai ao ar na segunda, 30/11, às 19h. **Etapa 1, para aprovação:** levantamento, estrutura, roteiro e linha do tempo. Ainda sem voz e sem render. **Não publicar.**

## Arquivos
- **Roteiro, estrutura e linha do tempo:** [`ROTEIRO.md`](ROTEIRO.md).
- **Levantamento da tela Início:** [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg), com 10 capturas em `aprovacao/levantamento/`. O texto de cada bloco e as conferências dos números estão em `aprovacao/levantamento/levantamento.json`.

## Rodar
```bash
cd series/hospeda-na-pratica/05-pousada-num-olhar
node scripts/levantar.cjs               # aprovacao/levantamento/*.png + levantamento.json (para se achar texto proibido)
python3 scripts/folha_levantamento.py   # aprovacao/folha-levantamento-demo.jpg
```

## Etapa 2 (depois da aprovação)
Voz, montagem com o motor dos episódios 2 a 4, render, legenda palavra por palavra, capa, as conferências de sempre e **só o mestre 1080×1920**.
