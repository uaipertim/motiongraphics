# Episódio 4: Produtos da comanda (roteiro para aprovação)

**Status:** só planejamento. Não gerei voz, não renderizei e não criei composição. Segue as [regras da série](../REGRAS.md). Vai ao ar na sexta, 27/11, às 19h ([programação](../PROGRAMACAO.md)).

## 1. Levantamento da tela (Demo recarregada, 20/11/2026)

Tudo foi tocado e lido na própria Demo, no celular a 390×844, e os textos estão exatamente como aparecem. A folha de prints está em [`aprovacao/folha-levantamento-demo.jpg`](aprovacao/folha-levantamento-demo.jpg). Em âmbar ficam os prints em que **eu digitei** um valor antes de tirar a foto: os prints 6, 7 e 14.

### Caminho (cada toque)
1. **Início** → toque em **Mais** (barra de baixo, à direita).
2. No menu, na seção **Cadastros** (com "Hóspedes" e "Acomodações"), toque em **Produtos e serviços**.

### A lista
- **Título:** "Produtos e serviços".
- **Botão:** "+ Novo produto ou serviço" (preto, na largura inteira).
- **Contagem:** "9 itens em 5 categorias".
- **Busca:** o campo "Buscar produto ou serviço".
  - Digitando "cerv", sobra só "Bebidas · 1", com a Cerveja Artesanal Long Neck.
  - Sem resultado aparece "Nenhum item encontrado."
- **Agrupada por categoria,** com a contagem: "Bebidas · 4", "Alimentos · 2", "Restaurante · 1", "Experiências · 1", "Lavanderia · 1".
- **Cada item mostra** o nome, o preço e o estado: "Ativo" (preto com ponto limão) ou "Inativo" (contorno cinza).
  - **Ativo:** os botões "Editar" e "Desativar".
  - **Inativo:** os botões "Editar" e "Reativar".
- **Rodapé:** "Desativar mantém o histórico. Preço novo vale só para lançamentos novos."
- **Não há** tipo separado para "produto" e "serviço" (só categorias), nem estoque ou quantidade. O vídeo não fala disso.

| Item | Categoria | Preço | Estado |
|---|---|---|---|
| Água Mineral Sem Gás 500ml | Bebidas | R$ 5,00 | Ativo |
| Água Mineral Com Gás 500ml | Bebidas | R$ 6,00 | Ativo |
| Cerveja Artesanal Long Neck | Bebidas | R$ 14,00 | Ativo |
| Refrigerante Lata 350ml | Bebidas | R$ 8,00 | Ativo |
| Café Especial Expresso | Alimentos | R$ 7,00 | Ativo |
| Porção de Pastéis Artesanais | Alimentos | R$ 38,00 | Ativo |
| Jantar Sugestão do Chef | Restaurante | R$ 55,00 | Ativo |
| Passeio Guiado na Serra | Experiências | R$ 150,00 | Ativo |
| Lavanderia (por peça) | Lavanderia | R$ 18,00 | Inativo |

### Editar (painel que sobe de baixo)
- **Título:** "Editar produto ou serviço", e o nome embaixo.
- **Campos:**
  - **Nome:** com o exemplo "Ex.: Pão de queijo".
  - **Categoria:** uma lista com "Escolha a categoria", Bebidas, Alimentos, Frigobar, Restaurante, Bar, Lanches, Experiências, Serviços, Lavanderia e Outro.
  - **Preço:** em reais. Embaixo do campo, **"Preço atual: R$ 14,00"**. Esse texto continua mostrando o preço salvo enquanto se digita o novo.
  - **Descrição (opcional):** com o exemplo "Ex.: porção com 8 unidades".
  - **Interruptor "Ativo":** com "Aparece em Lançar consumo.".
- **Aviso:** "Preço novo vale só para lançamentos novos. O que já foi lançado mantém o preço da época."
- **Botões:** "Salvar" e "Cancelar".
- **Depois de salvar:**
  - o aviso "Produto "Cerveja Artesanal Long Neck" atualizado com sucesso!";
  - o preço novo no item;
  - ao reabrir, "Preço atual: R$ 16,00".

### Novo produto ou serviço
- **Título:** "Novo produto ou serviço", com o subtítulo "Nome, categoria e preço são obrigatórios."
- **Campos:** os mesmos de Editar, vazios, com o interruptor "Ativo" ligado.
- **"Salvar":** fica cinza até nome, categoria e preço estarem preenchidos.
- **Depois de salvar:**
  - o aviso "Produto "Pão de queijo" cadastrado com sucesso!";
  - "10 itens em 6 categorias";
  - a categoria nova "Lanches" na lista.

### Desativar e reativar
- **Confirmação:** "Desativar Passeio Guiado na Serra?", com "Experiências · R$ 150,00".
  - Texto: "Passeio Guiado na Serra deixa de aparecer em Lançar consumo. O histórico das comandas continua igual, com o preço da época. Dá para reativar quando quiser."
  - Botões: "Desativar" e "Voltar".
- **Depois de desativar:** o aviso "Produto "Passeio Guiado na Serra" desativado com sucesso!", e o item fica "Inativo", com "Editar" e "Reativar".
- **Reativar:** não tem confirmação. Aparece o aviso "Produto "Passeio Guiado na Serra" ativado com sucesso!".

### Lista e formulário batem
Abri o **Editar** dos 9 itens com a Demo recarregada, sem digitar nada. Nome, categoria e preço são **iguais** aos da lista em todos. O interruptor "Ativo" está ligado nos 8 ativos e desligado na Lavanderia (Inativo).

**Não encontrei divergência.**

### Avisos que cobrem botões
Os avisos de sucesso aparecem no topo da lista, logo abaixo do título, e **cobrem o "+ Novo produto ou serviço"** (print 15 da folha). Por isso, as cenas que tocam nesse botão ou no topo da lista partem de **capturas limpas**, feitas depois de sair para o Início e voltar, como a `acomodacoes-limpa` do episódio 3.

### Quem acessa esta área (só pelo que o app mostra)
Pelas descrições dos papéis em Usuários (episódio 2):
- **Administrador:** "Tudo da pousada…"
- **Operação:** "Reservas, hospedagens, comandas, hóspedes e **produtos**…"
- **Caixa:** "…lança consumo…". A descrição não fala de cadastrar produtos.

O vídeo não diz quem acessa.

### Conferência de texto
Nesta área não aparece:
- e-mail;
- senha, código ou token;
- link de calendário iCal.

Só precisam sumir os elementos da demonstração: o selo "Demonstração" (também no menu), a data do cabeçalho, "Quero usar" e "Quero usar na minha pousada".

## 2. Pontos para você decidir

1. **O exemplo da edição: a Cerveja Artesanal Long Neck, de R$ 14,00 para R$ 16,00.** Ela também é a cerveja da dor e da comanda do vídeo de venda.
   - Combina com a frase sobre o preço novo: no painel, "Preço atual: R$ 14,00" fica embaixo do campo enquanto se digita R$ 16,00.
2. **O produto novo: "Pão de queijo",** o nome do próprio exemplo do app.
   - Categoria Lanches, R$ 12,00, descrição "Porção com 8 unidades", que segue o exemplo "porção com 8 unidades".
   - Ao salvar, aparece a categoria nova "Lanches" e "10 itens em 6 categorias".
3. **O item desativado: Refrigerante Lata 350ml,** que combina com "Deixou de vender?".
   - O levantamento usou o Passeio Guiado na Serra, mas a confirmação e o aviso são os mesmos, com o nome trocado.
   - Se preferir o Passeio, só troco o nome.
4. **Busca antes da edição:** a cena da frase 6 digita "cerv" na busca e a edição parte do resultado. Na captura, confiro se a busca continua filtrada depois de salvar. Se não continuar, o "Depois" usa a lista rolada até a Cerveja.

## 3. Roteiro

**Título na tela:** "Produtos da comanda", com o selo da série "FAZLO Hospeda na prática".

**Duração:** cerca de **75 s**: 71,7 s de fala com as pausas de leitura, mais 3,6 s do fecho com a logo. Depois da frase 8 há uma pausa maior (cerca de 2 s), para o Salvar, o aviso e os dois celulares.
- A estimativa usa o ritmo real da Alexa no episódio 3 (10,2 letras por segundo).
- Os tempos definitivos saem da locução; se alguma ação ficar corrida, alongo só as pausas.

**Tom:** leve e direto, para o dono da pousada.
- **Dor:** o preço da cerveja, da porção e do passeio na cabeça ou num papel colado no balcão, e cada um cobrando de um jeito.
- **Solução:** tudo cadastrado com o preço certo, pronto para lançar na comanda. O lançamento em si fica para o episódio "Tudo na comanda".

### Narração: tela e legenda (grafia oficial)
1. O preço da cerveja ainda está num papel colado no balcão?
2. Aí cada um cobra de um jeito, e ninguém sabe ao certo quanto custa o passeio.
3. No FAZLO Hospeda, cada produto e cada serviço fica cadastrado, com o preço certo.
4. Toque em Mais e depois em Produtos e serviços.
5. Fica tudo separado por categoria: bebidas, alimentos, restaurante, experiências.
6. Procurando um item? É só buscar pelo nome.
7. O preço mudou? Toque em Editar, ajuste e salve.
8. O preço novo vale para os próximos lançamentos; o que já foi lançado mantém o preço da época.
9. Produto novo? Toque em Novo produto ou serviço e preencha nome, categoria e preço.
10. Deixou de vender? Desative: ele sai do Lançar consumo, e o histórico continua.
11. Tudo com o preço certo, pronto para lançar na comanda.
12. E no começo, a FAZLO configura tudo com você.

### Narração: texto enviado à voz
1. O preço da cerveja ainda está num papel colado no balcão?
2. Aí cada um cobra de um jeito, e ninguém sabe ao certo quanto custa o passeio.
3. No Fázlo Hospéda, cada produto e cada serviço fica cadastrado, com o preço certo.
4. Toque em Mais e depois em Produtos e serviços.
5. Fica tudo separado por categoria: bebidas, alimentos, restaurante, experiências.
6. Procurando um item? É só buscar pelo nome.
7. O preço mudou? Toque em Editar, ajuste e salve.
8. O preço novo vale para os próximos lançamentos; o que já foi lançado mantém o preço da época.
9. Produto novo? Toque em Novo produto ou serviço e preencha nome, categoria e preço.
10. Deixou de vender? Desative: ele sai do Lançar consumo, e o histórico continua.
11. Tudo com o preço certo, pronto para lançar na comanda.
12. E no começo, a Fázlo configura tudo com você.

**Pronúncia:**
- "FAZLO" vai como "Fázlo" e "Hospeda" como "Hospéda".
- Esta narração não tem números e não fala valores: eles ficam só na tela.

## 4. Linha do tempo (estimada)

A linguagem é a do episódio 3:
- telas inteiras;
- closes de **2×** em cada toque;
- **dois celulares lado a lado** no antes e depois;
- janelas recortadas da mesma captura;
- painéis que sobem;
- digitação letra a letra;
- tempo para ler.

**Regra:** nenhum aviso do app fica por cima de um botão ou campo no momento em que ele é destacado ou tocado. O script de captura recusa as capturas limpas se houver aviso na tela, e o vídeo passa pela conferência de avisos do episódio 3 (`conferir-avisos.cjs`).

| Tempo (s) | Frase | Tela (inteira) | Toque e navegação | Janela que salta | Estado que muda | Texto em destaque | Transição |
|---|---|---|---|---|---|---|---|
| 0,0–5,0 | 1 | **Sem tela (gancho).** | — | — | No alto, desde o quadro 0 (miniatura): "O preço da cerveja / ainda está num papel / colado no balcão?". Embaixo, um papel amarelo colado com fita: "Cerveja 1?,00", "Porção 3?,00", "Passeio ???". | "colado no balcão?" em âmbar | Entra com impacto. |
| 5,0–11,4 | 2 | **Sem tela.** | — | — | Dois avatares, "Recepção" e "Bar", cada um com um balão âmbar de preço diferente para a mesma cerveja ("R$ 12?" e "R$ 15?"). Em "passeio", um "?" sobre o papel. | "cada um cobra de um jeito" | O papel se descola e cai. |
| 11,4–18,4 | 3 | **Marca.** | — | — | O selo da série e o logo estourando em limão. O título "Produtos da comanda" ("comanda" em limão). Embaixo, três selos: "Bebidas", "Alimentos" e "Experiências", com margem livre do logo. | "cadastrado", "preço certo" | O celular entra girando. |
| 18,4–22,7 | 4 | `inicio` → `menu-mais` | Close na barra e toque em **Mais**; o menu abre. Close em **Produtos e serviços**, com contorno e toque. | — | Início → menu → lista | "Mais", "Produtos e serviços" | Fusão no toque. |
| 22,7–30,0 | 5 | `produtos` (limpa) | A câmera desce pela lista. | "9 itens em 5 categorias" salta. | Contornos nos títulos "Bebidas · 4", "Alimentos · 2", "Restaurante · 1" e "Experiências · 1", cada um na palavra falada. | "bebidas", "alimentos", "restaurante", "experiências" | — |
| 30,0–34,1 | 6 | `produtos` → `produtos-busca` | Close no campo **Buscar** e toque; "cerv" digitado letra a letra. | — | A lista encolhe até "Bebidas · 1", com a Cerveja Artesanal Long Neck. | "buscar pelo nome" | Fusão. |
| 34,1–38,6 | 7 | `produtos-busca` → `editar-cerveja` → `editar-cerveja-16` | Close no **Editar** da Cerveja e toque; o painel sobe. Toque no Preço e "R$ 16,00" digitado. Em "salve", contorno no **Salvar** (o toque vem no fim da frase 8). | — | "R$ 14,00" vira "R$ 16,00" no campo. | "Editar", "salve" | O painel sobe. |
| 38,6–48,0 | 8 | `editar-cerveja-16` → `produtos-cerveja-16-aviso` → **dois celulares:** `produtos-busca` (Antes) e `produtos-busca-16` (Depois) | Com o painel aberto: em "preço novo", salta "Preço atual: R$ 14,00"; em "o que já foi lançado", salta o aviso do próprio app, "Preço novo vale só para lançamentos novos. O que já foi lançado mantém o preço da época.". No fim da frase, close e toque em **Salvar**. | O aviso "…atualizado com sucesso!" salta. | Lado a lado: R$ 14,00 (antes) e R$ 16,00 (depois), com contornos. | "próximos lançamentos", "preço da época" | O painel desce; os dois celulares se separam do centro. |
| 48,0–56,3 | 9 | `produtos-limpa` → `novo` → `novo-preenchido` → `produtos-pao-aviso` | Close no **+ Novo produto ou serviço** (sem nenhum aviso) e toque; o painel sobe. "Pão de queijo" digitado; Categoria "Lanches"; "R$ 12,00"; "Porção com 8 unidades". "Salvar" passa de cinza a preto. Close e toque em **Salvar**. | O aviso "Produto "Pão de queijo" cadastrado com sucesso!" salta. | "10 itens em 6 categorias". | "nome", "categoria", "preço" | O painel sobe e desce. |
| 56,3–63,5 | 10 | `produtos-refrigerante` → `desativar-refrigerante` → **dois celulares:** `produtos-refrigerante` (Antes) e `produtos-refrigerante-inativo` (Depois) | Close no **Desativar** do Refrigerante Lata 350ml e toque; a confirmação sobe. Toque em **Desativar**. | O texto salta: "Refrigerante Lata 350ml deixa de aparecer em Lançar consumo. O histórico das comandas continua igual, com o preço da época." | Lado a lado: "Ativo" (antes) e "Inativo" (depois). | "Lançar consumo", "histórico continua" | Os dois celulares se separam do centro. |
| 63,5–71,7 | 11–12 | **Fecho.** | — | — | O logo estoura em limão, sem nada encostando. | "Tudo com o preço certo," / "pronto para lançar na comanda." / "E no começo," / "a FAZLO configura tudo com você." (em limão) | O celular sai. |
| 71,7–75,3 | — | **Logo.** | — | — | — | @fazlohospeda. A trilha resolve. | — |

**Legenda:**
- Palavra por palavra, numa faixa própria embaixo.
- Fora da legenda ficam a frase 1 e o fecho, porque estão escritos na tela.

## 5. Dados fictícios e telas

**Dados:** os itens e preços da Demo (tabela acima), mais os criados no vídeo:

| No vídeo | Dado |
|---|---|
| Edição | Cerveja Artesanal Long Neck, de R$ 14,00 para **R$ 16,00** |
| Produto novo | **Pão de queijo**, Lanches, R$ 12,00, "Porção com 8 unidades" |
| Desativado | **Refrigerante Lata 350ml** (Bebidas, R$ 8,00) |
| Gancho | "Cerveja 1?,00", "Porção 3?,00", "Passeio ???" e os balões "R$ 12?" e "R$ 15?": desenhos ilustrativos, não são telas do app |

Não aparece nenhum nome de pousada, e-mail, senha, código, token ou link iCal.

**Telas a capturar (Demo recarregada, 1170×2532):** com a conferência do texto da página e o OCR antes de salvar. As marcadas como "limpa" também são recusadas se houver aviso do app na tela.

| Etapa | Telas |
|---|---|
| Caminho | `inicio`, `menu-mais` |
| Lista e busca | `produtos` (limpa, topo), `produtos-busca` ("cerv", Cerveja R$ 14,00) |
| Editar | `editar-cerveja`, `editar-cerveja-16`, `produtos-cerveja-16-aviso` (com o aviso), `produtos-busca-16` (limpa, Cerveja R$ 16,00) |
| Novo | `produtos-limpa` (limpa, depois da edição, com o "+ Novo produto ou serviço" à vista), `novo`, `novo-preenchido`, `produtos-pao-aviso` (com o aviso) |
| Desativar | `produtos-refrigerante` (limpa, rolada até o Refrigerante), `desativar-refrigerante`, `produtos-refrigerante-inativo` (limpa) |

**Ficam escondidos:** o selo "Demonstração" (também no menu), a data do cabeçalho, "Quero usar" e "Quero usar na minha pousada".

## 6. Fecho
O logo do FAZLO Hospeda estoura em limão, sem nada encostando nele, com as quatro linhas e @fazlohospeda embaixo. A trilha resolve no último tempo, como nos episódios anteriores.
