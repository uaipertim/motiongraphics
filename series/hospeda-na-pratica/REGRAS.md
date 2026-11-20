# FAZLO Hospeda na prática: regras da série

Vídeos informativos que mostram o uso real do Hospeda, tela por tela: a navegação, os toques e os estados mudando. O objetivo é provar que o sistema é fácil de usar. Este arquivo é a referência de todos os episódios.

## Modelo de referência (obrigatório)
O vídeo curto de venda do Hospeda ([`reels/venda-curta-hospeda`](../../reels/venda-curta-hospeda/README.md), cerca de 68 s, voz Alexa), feito em 19/11/2026. Os episódios seguem o mesmo estilo:
- **Ritmo:** animado e dinâmico, com muitos elementos e transições, sem ficar sonolento, mas com tempo para ler.
- **Telas:** sempre a tela **inteira** do app em funcionamento, nunca recortada em cartões soltos.
- **Destaques:** os elementos em destaque saltam da tela em janelas, mostrando onde tocar e o que muda.
- **Som:** trilha de fundo.

## Voz
- ElevenLabs, voz **Alexa**, modelo **eleven_v4**.
- Proibido usar Raquel ou Dona Maria.
- No texto enviado à voz:
  - "Hospeda" escrito como "Hospéda";
  - "WhatsApp" escrito como "Uátsap";
  - números e unidades por extenso.
  - "e-mail" fica escrito "e-mail" (decidido em 20/11/2026 pela amostra A do episódio 2; a grafia "i-mêil" foi descartada).

## Legenda
Palavra por palavra, no padrão dos vídeos narrados, com a grafia oficial na tela e as palavras-chave em verde-limão.

## Fecho
Todo vídeo termina com a logo do FAZLO Hospeda.

## Identidade
Fundo preto com verde-limão, tipografia forte, minimalista e moderno. Nunca com cara de hotel de luxo.

## Duração
- De 60 a 90 s; até cerca de 1,5 min se o tema pedir.
- Um vídeo por tema, sem "parte 1/parte 2".

## Conteúdo
- Não inventar telas nem funções. Se faltar referência, parar e pedir print.
- Só funções publicadas.
- Gravar pela Demo (demo.fazlohospeda.com.br) ou com dados inventados. **Nunca** usar tela da produção.
- Nunca mostrar:
  - dados reais;
  - e-mails reais;
  - senhas;
  - códigos de autenticador;
  - links de calendário iCal, nem inteiros nem cortados;
  - qualquer token.
- E-mails fictícios usam domínio inexistente (ex.: ana@pousadadaserra.exemplo).
- Nome de pousada nunca em caixa alta (ex.: Pousada da Serra).

## Capa
Padrão definido no episódio 2 (20/11/2026). Modelo: [`02-sua-equipe/capa/capa.html`](02-sua-equipe/capa/capa.html). A base de estilo são as capas v4 dos Reels e a miniatura do vídeo curto de venda; a capa não copia nenhuma delas.
- **Formato:** 1080×1920.
- **Área segura:** tudo o que importa fica no recorte 4:5 do feed (1080×1350, y 285–1635), com folga de 60 px: x 60–1020, y 345–1575. Ficam livres:
  - o canto do play (x ≥ 860, y 240–440);
  - a faixa do contador (y 1560–1680).
- **De cima para baixo:**
  1. **Logo pequena**, centrada: o símbolo, "FAZLO" em branco e "Hospeda" em limão.
  2. **Celular** com a **tela inteira** do app, a captura do episódio com os dados fictícios. Fica um pouco à esquerda, com um brilho limão difuso atrás.
  3. **Um único destaque** saltando numa janela recortada da mesma captura, com borda limão, levemente inclinada, saindo do celular para a direita. O ponto de origem fica com um contorno limão na tela.
  4. **Selo da série**: um chip escuro em fonte mono, com ponto limão e o texto "FAZLO Hospeda na prática".
  5. **Título** grande em Inter Display 900, sem caixa alta, em 2 linhas, com uma palavra-chave em limão (com halo).
- **Fundo:** preto com leve tom verde-petróleo, grade de pontinhos e vinheta, minimalista.
- **Sem número de episódio:** nada de "ep. 2" ou "parte 1".
- **Conferência:** `capa/render.cjs` gera a capa e o recorte do feed (`capa-no-feed.jpg`) e confere a área segura e as sobreposições. O OCR procura o mesmo texto proibido dos vídeos (`capa/revisao/`).

## Entrega: versão única (regra de 20/11/2026)
- Os vídeos da série são **só para o Instagram**.
- Entregar **apenas o mestre 1080×1920**.
- Não gerar versão WhatsApp nem qualquer outra versão do mesmo vídeo.

## Estrutura variada (regra de 20/11/2026)
Os episódios 2, 3 e 4 ficaram com o mesmo esqueleto (tabela abaixo). Daqui em diante:
- **Cada episódio tem uma estrutura própria**, diferente das já usadas.
- **Antes do roteiro**, a sessão apresenta a estrutura escolhida, em poucas linhas, e explica por que ela é diferente das anteriores, para aprovação.
- **Formas possíveis**, sem se limitar a elas:
  - começar pelo resultado e depois mostrar como chegou lá;
  - plano-sequência pelo app, sem cortes;
  - desafio com cronômetro;
  - tela dividida do início ao fim (jeito antigo × Hospeda);
  - pergunta e resposta (as dúvidas do dono respondidas na tela);
  - navegação em forma de trilha rápida, sem repetir "Toque em Mais e depois em…".
- **O que não muda:**
  - a identidade: preto e limão, tipografia forte;
  - a voz Alexa;
  - a legenda palavra por palavra;
  - telas inteiras e reais da Demo, com dados fictícios;
  - tempo para ler;
  - o fecho com a logo do FAZLO Hospeda.
- **Registro:** a cada episódio pronto, acrescentar uma linha na tabela abaixo.

### Estruturas já usadas

| Ep. | Tema | Estrutura |
|---|---|---|
| 2 | Sua equipe no Hospeda | Gancho com avatares e bilhete → bloco da logo com três selos → "Toque em Mais e depois em Usuários" → lista → convidar (novo) → alterar papel (editar) → desativar e reativar → fecho |
| 3 | Chalés e quartos | Gancho com caderno e avatar → bloco da logo com três selos → "Toque em Mais e depois em Acomodações" → lista → editar → antes e depois (dois celulares) → novo → bloquear → desativar → antes e depois → fecho |
| 4 | Produtos da comanda | Gancho com papel colado e avatares → bloco da logo com três selos → "Toque em Mais e depois em Produtos e serviços" → lista por categoria → busca → editar → antes e depois (com close nos cartões) → novo → desativar → antes e depois → fecho |

**Esqueleto comum dos três (não repetir):** gancho com avatares e bilhete → bloco da logo com três selos → "Toque em Mais e depois em…" → lista → editar → antes e depois → novo → desativar → fecho.

## Fluxo
Antes de produzir cada episódio:
1. apresentar a **estrutura** escolhida (seção "Estrutura variada"), para aprovação;
2. entregar o **roteiro e a linha do tempo**, para aprovação.

## Avisos da Demo
Até a próxima atualização da Demo, na Nova reserva uma data bloqueada pelo Airbnb ou pelo Booking aparece como livre. Nos episódios 6 e 8, nunca mostrar a Nova reserva numa data bloqueada pelo canal.

## Episódios
Ordem de produção: do 2 ao 15. O 1 fica por último, com prints fornecidos à parte.

| # | Tema |
|---|---|
| 1 | Primeiro acesso |
| 2 | Sua equipe no Hospeda |
| 3 | Chalés e quartos |
| 4 | Produtos da comanda |
| 5 | A pousada num olhar |
| 6 | Nova reserva em segundos |
| 7 | Sinal e cancelamento |
| 8 | Airbnb e Booking no mesmo calendário |
| 9 | O hóspede chegou |
| 10 | Tudo na comanda |
| 11 | Check-out sem susto |
| 12 | Abrindo o caixa |
| 13 | Fechamento conferido |
| 14 | Relatórios |
| 15 | Day Use: o visitante que vem só passar o dia |
