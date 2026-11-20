# Episódio 4: Produtos da comanda (roteiro aprovado em 20/11/2026)

**Status:** roteiro aprovado em 20/11/2026 (commit 646aca7), com a frase 10 ajustada. Narrado e renderizado como **primeira prévia** (74,7 s), para aprovação; ver o [README](README.md). Segue as [regras da série](../REGRAS.md). Vai ao ar na sexta, 27/11, às 19h ([programação](../PROGRAMACAO.md)).

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

## 2. Decisões (20/11/2026)

Aprovado como estava: Refrigerante Lata 350ml para desativar, Cerveja de R$ 14,00 para R$ 16,00 e Pão de queijo (Lanches, R$ 12,00). A frase 10 mudou (seção 3).

### Pontos levantados no planejamento

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

**Duração:** **74,7 s**, pela locução real: a voz vai de 0,3 a 71,1 s, e o fecho com a logo segue até 74,7 s.
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
10. Deixou de vender? Desative: ele não aparece mais na hora de lançar, e o histórico continua.
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
10. Deixou de vender? Desative: ele não aparece mais na hora de lançar, e o histórico continua.
11. Tudo com o preço certo, pronto para lançar na comanda.
12. E no começo, a Fázlo configura tudo com você.

**Pronúncia:**
- "FAZLO" vai como "Fázlo" e "Hospeda" como "Hospéda".
- Esta narração não tem números e não fala valores: eles ficam só na tela.

## 4. Linha do tempo (tempos reais da locução)

A linguagem é a do episódio 3:
- telas inteiras e closes de **2×** em cada toque;
- janelas recortadas da mesma captura e painéis que sobem;
- digitação letra a letra, revelando o texto da própria captura.

**Antes e depois:**
- os **dois celulares inteiros** aparecem lado a lado, com "Antes" e "Depois";
- 0,9 s depois, vem o **close nos dois cartões**: cada cartão salta numa janela grande, um em cima do outro, para o preço e o estado ficarem legíveis.

**Regra:** nenhum aviso do app fica por cima de um toque ou destaque.
- Os toques no topo da lista e no "+ Novo produto ou serviço" partem de capturas **limpas**; o script recusa a captura se houver aviso na tela.
- O vídeo passa por `scripts/conferir-avisos.cjs`, que verifica 69 instantes e acha 0 com aviso por cima.

| Tempo (s) | Frase | Tela (inteira) | O que acontece (s) |
|---|---|---|---|
| 0,0–4,0 | 1 | **Sem tela (gancho).** | Desde o quadro 0 (miniatura): "O preço da cerveja / ainda está num papel / colado no balcão?", com a última linha em âmbar. Embaixo, o papel colado com fita ("Cerveja 1?,00", "Porção 3?,00", "Passeio ???") e os avatares "Recepção" e "Bar". |
| 4,0–9,4 | 2 | **Sem tela.** | Em "cada um cobra" (4,4), saltam os balões âmbar "R$ 12?" e "R$ 15?", um em cada avatar. Em "passeio" (8,4), um "?" sobre o papel. O papel descola e cai entre 8,6 e 9,1. |
| 9,4–15,8 | 3 | **Marca.** | Selo da série. O logo estoura em "FAZLO" (9,6) e o título "Produtos da comanda" entra, com "comanda" em limão (10,1). Em "produto" (11,1), entram os selos "Bebidas", "Alimentos" e "Experiências", que pulsam em "serviço", "cadastrado" e "preço certo". A menor distância até o logo é de 265 px. |
| 15,8–18,2 | 4 | `inicio` → `menu-mais` | Close na barra e toque em **Mais** (16,5); o menu abre (16,6). Close em **Produtos e serviços**, com contorno (17,2) e toque (17,7). |
| 18,2–29,5 | 5–6 | `produtos` (limpa) → `produtos-categorias` → `produtos` → `produtos-busca` | "9 itens em 5 categorias" salta (21,2). Contorno em "Bebidas · 4" (22,1). A lista rola (22,6), com contornos em "Alimentos · 2" (22,9), "Restaurante · 1" (23,7) e "Experiências · 1" (24,6). A lista volta ao topo (26,2). Close na **busca** e toque (27,5), e "cerv" digitado (27,7 a 28,2). A lista encolhe para a Cerveja (28,6). |
| 29,5–42,6 | 7–8 | `produtos-busca` → `editar-cerveja` → `editar-cerveja-16` → `produtos-cerveja-16-aviso` | Contorno no "R$ 14,00" em "preço mudou?" (29,9). Close no **Editar** e toque (31,7); o painel sobe. Toque no Preço e "R$ 16,00" digitado (32,6 a 33,1). Contorno no **Salvar** em "salve" (33,5). Com o painel aberto, saltam "Preço atual: R$ 14,00" (34,7 a 37,2) e a regra do app: "Preço novo vale só para lançamentos novos. O que já foi lançado mantém o preço da época." (37,5 a 39,7). Close e toque em **Salvar** (40,3). Salta o aviso "Produto "Cerveja Artesanal Long Neck" atualizado com sucesso!" (40,7 a 42,1). |
| 42,6–45,9 | 8 | **Dois celulares:** `produtos-busca` (Antes) e `produtos-busca-16` (Depois) | Contornos nos dois preços (42,9 e 43,1). Close nos dois cartões a partir de 43,5: R$ 14,00 em cima e R$ 16,00 embaixo. |
| 45,9–54,4 | 9 | `produtos-limpa` → `novo` → `novo-preenchido` → `produtos-pao-aviso` | Close no **+ Novo produto ou serviço** (lista limpa), contorno (46,9) e toque (47,3); o painel sobe. "Pão de queijo" digitado (49,1 a 49,8). Categoria "Lanches" (50,6). "R$ 12,00" (51,0 a 51,4). "Porção com 8 unidades" (51,5 a 51,8). "Salvar" fica preto. Close e toque em **Salvar** (52,0). Salta o aviso "Produto "Pão de queijo" cadastrado com sucesso!" (52,4 a 53,9). |
| 54,4–60,6 | 10 | `produtos-refrigerante` (limpa) → `desativar-refrigerante` | Close no **Desativar** do Refrigerante Lata 350ml, contorno (55,3) e toque (55,8); a confirmação sobe. Salta o texto "Refrigerante Lata 350ml deixa de aparecer em Lançar consumo. O histórico das comandas continua igual, com o preço da época. Dá para reativar quando quiser." (56,9 a 60,0). Toque em **Desativar** (60,1). |
| 60,6–64,1 | 10 | **Dois celulares:** `produtos-refrigerante` (Antes) e `produtos-refrigerante-inativo` (Depois) | Contorno limão no "Ativo" (60,9) e âmbar no "Inativo" (61,1). Close nos dois cartões a partir de 61,5. |
| 64,1–71,1 | 11–12 | **Fecho.** | O logo estoura em limão (64,1). Entram "Tudo com o preço certo," (64,4) e "pronto para lançar na comanda." (66,0). Depois "E no começo," (68,1) e "a FAZLO configura tudo com você." em limão (69,0). |
| 71,1–74,7 | — | **Logo.** | @fazlohospeda aparece em 71,7 e a trilha resolve. |

**Legenda:**
- Palavra por palavra, numa faixa própria embaixo.
- Fora da legenda ficam a frase 1 e o fecho, porque estão escritos na tela.

### O que mudou na linha do tempo depois da locução real
1. **Duração:** a voz real ficou um pouco mais rápida que a estimativa (10,8 letras/s). Com as pausas do roteiro, o vídeo daria 67,6 s, mas os dois antes e depois e os avisos não teriam tempo para ler. Alonguei só as pausas, sem mexer na voz:

   | Pausa depois da frase | Antes (s) | Depois (s) | Para quê |
   |---|---|---|---|
   | 8 | 0,8 | 5,5 | Salvar, aviso legível por 1,4 s, os dois celulares e o close nos cartões |
   | 9 | 1,8 | 3,0 | o aviso de cadastro do Pão de queijo fica 1,5 s na janela |
   | 10 | 1,2 | 3,8 | o antes e depois do Refrigerante, com o close |

   **Resultado:** 74,7 s, contra os ~75 s estimados.
2. **Frase 5:** a lista rola até as outras categorias, com uma captura nova, `produtos-categorias`. Antes, Alimentos, Restaurante e Experiências ficavam abaixo da primeira tela.
3. **Frases 7 e 8:** como aprovado, o painel fica aberto durante a regra do preço novo, e o Salvar só vem no fim da frase 8.
4. **Antes e depois:** depois dos dois celulares inteiros, vem o close nos dois cartões, que deixa os preços e o estado legíveis.
5. **"Preço atual: R$ 14,00":** a janela recorta só o texto, para ele aparecer grande.

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
| Lista e busca | `produtos` (limpa, topo), `produtos-categorias` (limpa, rolada até Alimentos, Restaurante e Experiências), `produtos-busca` (limpa, "cerv", Cerveja R$ 14,00) |
| Editar | `editar-cerveja`, `editar-cerveja-16`, `produtos-cerveja-16-aviso` (com o aviso), `produtos-busca-16` (limpa, Cerveja R$ 16,00) |
| Novo | `produtos-limpa` (limpa, depois da edição, com o "+ Novo produto ou serviço" à vista), `novo`, `novo-nome`, `novo-preenchido`, `produtos-pao-aviso` (com o aviso) |
| Desativar | `produtos-refrigerante` (limpa, rolada até o Refrigerante), `desativar-refrigerante`, `produtos-refrigerante-inativo` (limpa) |

As 17 capturas estão em `telas/` e na folha [`aprovacao/folha-telas.jpg`](aprovacao/folha-telas.jpg).

**Observação da captura:** a Demo guarda o texto da busca ao sair da tela e voltar. Por isso, o campo é limpo antes de cada busca nova.

**Ficam escondidos:** o selo "Demonstração" (também no menu), a data do cabeçalho, "Quero usar" e "Quero usar na minha pousada".

## 6. Fecho
O logo do FAZLO Hospeda estoura em limão, sem nada encostando nele, com as quatro linhas e @fazlohospeda embaixo. A trilha resolve no último tempo, como nos episódios anteriores.
