# Padrão dos vídeos só com elementos (sem narração)

Vale para **todo vídeo sem narração** do FAZLO Hospeda daqui para frente (13/11/2026). O primeiro feito neste padrão é o [`educativo/comanda`](educativo/comanda) ("A caipirinha da piscina entrou na conta?").

## Por que existe

O diagnóstico, medido quadro a quadro com [`tools/qa_movimento.py`](tools/qa_movimento.py), comparou duas peças:

| | "Toda estadia é um ciclo" (v2, referência de dinâmica) | comanda, versão 1028f25 |
|---|---|---|
| movimento mediano | 1,15 | 0,43 |
| tempo parado | 2,0 s, nenhum trecho de 1 s | 10,7 s (trechos de 2,9 / 2,0 / 1,4 / 1,4 s) |
| mudanças grandes | 29 em 29 s | 4 |
| fundos | escuro / claro / limão | sempre escuro |

O problema era de **estrutura**: a mesma lista ficou na tela de 9 s a 29 s. As regras abaixo atacam a estrutura.

## As regras

1. **Uma composição NOVA a cada ideia ou texto.** Layout, escala e elemento principal mudam. É proibido manter a mesma composição por mais de ~4 s; uma cena mais longa troca de composição por dentro (corte, deslize, mergulho).
2. **O valor ou o dado da cena é o protagonista:** um número grande, com no mínimo 1/3 da largura do quadro (360 px), contando, virando ou batendo.
3. **Ícones de linha da marca, animados:** traço desenhando, balanço, gotas, brilho. Um por cena, grande. Quando a marca não tem o ícone (copo, garrafa, prato), ele é desenhado no mesmo traço: linha única, pontas e cantos arredondados.
4. **Ligações visíveis de causa e efeito:** linhas ou curvas que levam um elemento até outro, com um pulso viajando nelas.
5. **Manchete grande no ALTO do quadro**, alinhada à esquerda, com a palavra-chave em verde-limão na cor do texto. Nada de caixa de marca-texto. No fundo off-white, a palavra-chave usa o verde escuro `#4E8800`, para ler. A manchete é o título da cena, não legenda de rodapé.
6. **Fundos alternando** entre escuro, off-white e verde-limão ao longo do vídeo, com pelo menos 3 trocas.
7. **Transições com impacto, na batida:** deslizes rápidos, cortes com sobreposição, falha digital curta, mergulho/zoom. Nada de fusão lenta.
8. **Nunca nada parado.** Mesmo durante a leitura, algo respira: deriva lenta da câmera, pulso, partículas, contagem. Nenhum trecho parado acima de 0,5 s.
9. **Tempo de leitura continua valendo:** no mínimo 1,2 s + 0,3 s por palavra, com a cena viva enquanto se lê.
10. **A referência é só de DINÂMICA.** É proibido reutilizar do v2:
    - o anel/órbita;
    - o marcador "01/06";
    - o recibo com borda serrilhada;
    - a moeda R$ ligada por linha em L a um card de caixa;
    - o relógio gigante com chave ou com mala;
    - a palavra com caixa de marca-texto;
    - o final com logo dentro de círculo.
11. **Narrado × sem narração:**
    - vídeo NARRADO (voz da Raquel) usa as telas reais do app no celular;
    - vídeo SEM narração não usa tela, celular nem recorte do HTML. Só elementos gráficos vivos: cartões, chips, números, contadores, linhas e ícones de linha da marca.

## QA de movimento (obrigatório)

Todo vídeo sem narração roda, antes da entrega:

```bash
python3 reels/tools/qa_movimento.py <pasta>/output/<video>.mp4 --logo-final 0.8
```

A medição é a do diagnóstico: 10 fps, 108×192 em cinza, diferença média absoluta entre quadros seguidos. A referência v2 entra no relatório como linha de base.

**Para APROVAR:**
- movimento mediano ≥ 1,0;
- tempo parado total ≤ 1,5 s (diferença < 0,05), nenhum trecho parado > 0,5 s (o logo final pode segurar no máximo 0,8 s);
- mudanças grandes (diferença > 15) ≥ 0,6 por segundo;
- pelo menos 3 trocas de fundo (escuro / off-white / verde-limão, lidas na moldura do quadro).

Se não passar, o vídeo é ajustado antes da entrega. A tabela entra no `output/revisao/relatorio.txt` do vídeo.

## Regras técnicas de sempre

- 1080×1920, 60 fps.
- Nada acima de y 200, abaixo de y 1536 ou na coluna de botões (x > 940, y > 1000), fora das transições.
- Respiro mínimo de 24 px.
- Mix em −14 LUFS, pico ≤ −1,5 dBTP.
- Capa com o bloco centrado em y 960, dentro da área 3:4 e fora do canto do play (`tools/capa_grade.cjs` e `tools/revisao_capa.py`), com a prévia da linha da grade.
