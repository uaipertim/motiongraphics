# Casa cheia. — experimento FAZLO Hospeda

Reel vertical de **51,6 s**, sem narração, feito só com elementos gráficos, texto curto e uma trilha composta por código. Tudo nesta branch nasceu do zero. A única coisa trazida de fora foi a pasta `marca/` (cores, Geist, logo e ícones).

| arquivo | o que é |
|---|---|
| `output/experimento.mp4` | o Reel (1080×1920, 60 fps, H.264 + AAC) |
| `output/capa-grade.jpg` | capa para a grade do perfil |
| `output/folha-contato.jpg` | 2 quadros por segundo do vídeo final |

---

## A ideia

**Todo dono de pousada conhece as duas caras do fim de semana lotado.** A primeira é a alegria: casa cheia. A segunda vem logo depois e é a pergunta que dá frio na barriga: *e agora?*

O vídeo tem duas metades que se espelham:

1. **O caos (antes do drop).** Uma casa estufada de hóspedes, que são bolinhas espremidas dentro do contorno, e um relógio que dispara de sexta às 18h até domingo à noite. Uma sequência de perguntas que todo dono já ouviu: *Tem vaga pro sábado?*, *Quarto 4 já liberou?*, *Põe na conta do 6.*, *O caixa bateu?* Cada pergunta corresponde a um pilar do produto (reservas, hospedagens, comanda e caixa), mas o vídeo nunca diz isso. Ele só mostra a situação.
2. **A ordem (depois do drop).** Tudo é sugado num vórtice, a música para e aparece uma palavra: **Respira.** No drop, as mesmas bolinhas explodem e encaixam numa grade perfeita (*Tudo num lugar só*). Em seguida a câmera acompanha um hóspede pelo trilho de uma estadia: **Reserva → Chegada → Comanda → Saída → Caixa**. Esse trilho, visto de longe, é o próprio contorno da casa: o hóspede desenha parede, telhado e chaminé, e em *Do início ao fim* o traço fecha a casa. Ela se enche de novo, agora em fileiras, e fecha a história: **Casa cheia. Cabeça leve.**

A frase final repete a primeira, na mesma posição e no mesmo tamanho. Só a segunda linha muda, de *E agora?* para *Cabeça leve.* Esse callback é a promessa do produto, dita sem nenhum número e sem nenhuma tela.

### Por que prende

- **O quadro 0 já é uma imagem completa e estranha:** uma casa estufando no ritmo do bumbo, com hóspedes saindo pela chaminé. Quem rola o feed entende em meio segundo ("casa cheia") e fica com a pergunta ("e agora?").
- **Identificação imediata.** As frases são as que o dono de pousada ouve no WhatsApp e no balcão. O público-alvo se reconhece antes de saber que é propaganda.
- **Tensão e alívio de verdade.** A metade do caos é construída para cansar: perguntas que se acumulam, relógio correndo, caça-níquel que não para. A quebra em silêncio ("Respira.") e o drop dão alívio físico, porque a música e a imagem mudam no mesmo quadro.
- **Continuidade em vez de slides.** As bolinhas do gancho atravessam o vídeo inteiro: explodem, viram os ponteiros do relógio, viram a grade do drop e voltam a encher a casa, desta vez em fileiras. O trilho da jornada *é* a casa do começo, redesenhada passo a passo. Quem assiste sente que é uma história só.
- **Pagamento visual das perguntas.** O caça-níquel do *O caixa bateu?* reaparece na estação Caixa e agora **para** no valor, com um ✓ e um "ding".

---

## Roteiro cena a cena

124 BPM: 1 compasso = 1,935 s. Os tempos abaixo são os do vídeo final.

| # | tempo | compassos | fundo | texto na tela | o que acontece | técnica principal |
|---|---|---|---|---|---|---|
| 1 | 0,00–3,87 | 1–2 | tinta | **Casa cheia.** / **E agora?** | Casa de traço limão com ~190 hóspedes (bolinhas) espremidos. As paredes estufam a cada bumbo, bolinhas escapam pela chaminé e a pílula balança nas palmas. | bojo por curvas de Bézier dirigido pelo bumbo, distribuição de Poisson dentro do polígono |
| 2 | 3,87–7,74 | 3–4 | off-white | **SEXTA 18:00** | A casa explode, as bolinhas voltam como os 60 marcadores de um relógio e os dígitos rolam como odômetro de 14:27 até 18:00. O ponteiro varre o anel e os dígitos pulsam no bumbo. | match cut por movimento (explosão → anel), números contando |
| 3 | 7,74–11,61 | 5–6 | tinta | **Tem vaga pro sábado?** + nuvem de perguntas reais | A câmera mergulha no traço do "0" até a tela ficar preta e sai dentro da nova cena. Dez perguntas de hóspede aparecem nas semicolcheias em volta da frase principal. Relógio no canto: SEX 21:40. | zoom-through num glifo, tipografia cinética com máscara por palavra, paralaxe |
| 4 | 11,61–15,48 | 7–8 | limão | **Quarto 4 já liberou?** | A pílula de "sábado?" cresce até virar o fundo. Uma etiqueta de chave "04" cai, balança como pêndulo no tempo da música e gira em 2,5D nas palmas. O relógio rola para SÁB 10:50. | forma vira fundo, pêndulo sincronizado, giro 3D falso (escala X + brilho) |
| 5 | 15,48–19,35 | 9–10 | tinta | **Põe na conta do 6.** | A etiqueta gira de perfil e, no corte, volta como comanda (mesmo tamanho e posição). Seis comandas são arremessadas pelas laterais e empilham em cada tempo. SÁB 20:30. | match cut por giro (troca escondida no quadro de perfil) |
| 6 | 19,35–23,23 | 11–12 | off-white | **O caixa bateu?** (com "?" âmbar) | Chicote horizontal com faixa limão. Seis janelas de caça-níquel giram sem parar e o ponto âmbar pisca (único uso do âmbar no vídeo). DOM 23:50. No build, tudo, inclusive detritos das cenas anteriores, é sugado num vórtice até virar um ponto. | whip pan com motion blur, vórtice por camadas com velocidades diferentes |
| 7 | 23,23–25,16 | 13 | off-white | **Respira.** | Silêncio na trilha. O ponto inspira e expira com ondas concêntricas e o espaçamento das letras respira junto. | quebra, respiração como animação |
| 8 | 25,16–29,03 | 14–15 | tinta | **Tudo num lugar só.** | DROP: impacto, flash curto e tremor. O ponto explode numa grade perfeita, a grade tomba e vira um chão de pontos em perspectiva com ondas a cada bumbo, depois se fecha numa única linha. | morph grade → chão 2.5D, câmera avançando |
| 9 | 29,03–38,71 | 16–20 | alterna | **Reserva · Chegada · Comanda · Saída · Caixa** | A câmera segue um hóspede por um trilho que é o contorno da casa em escala 6× (base → parede esquerda → telhado esquerdo → telhado direito → parede direita), e o traço percorrido vai desenhando a casa. A cada compasso o fundo abre em círculo a partir dele (off-white, tinta, limão, tinta, off-white) e o ícone da marca se desenha. Cada estação tem uma composição diferente. Na estação Caixa as janelas agora param em 4.871,30 com ✓. | câmera que segue o trilho e gira com a direção de cada trecho, wipes radiais na batida, ícones desenhando (dash), deriva contínua |
| 10 | 38,71–42,58 | 21–22 | tinta | **Do início ao fim.** | A câmera recua e endireita a imagem: o trilho é a casa. O hóspede vira a parede direita, percorre a base e, no 3º tempo do compasso 21 (40,16 s), o traço **fecha a casa** de volta na Reserva, com clique, sino e um lampejo dentro dela. Os 5 ícones ficam como pontos do contorno, e o texto fica dentro da casa. O contorno pulsa no bumbo e a câmera se aproxima devagar. | pull-back com interpolação de câmera, traço desenhando o contorno |
| 11 | 42,58–46,45 | 23–24 | tinta | **Casa cheia.** / **Cabeça leve.** | É a mesma casa desenhada pelo trilho, na mesma posição: os ícones saem e a aproximação se desfaz. As bolinhas caem em fileiras perfeitas, linha a linha, cada uma com uma nota de uma escala subindo. É o mesmo layout do quadro 0, agora em ordem. | continuidade exata recuo → volta, callback de composição |
| 12 | 46,45–51,60 | 25–26 | tinta | **FAZLO Hospeda** + **@fazlohospeda** | A pílula "Cabeça leve." viaja e vira a pílula "Hospeda". A casa vira o "O" de FAZLO e "FAZL" sobe em semicolcheias. As bolinhas das fileiras de baixo assentam numa linha de base pontilhada sob o @fazlohospeda; as demais se dissolvem para os lados. Nada gira em volta do logo: o logo e o @ respiram (escala leve no compasso e na batida, brilho na pílula e no @). A linha de base ondula, dá um pulinho do centro para as pontas a cada batida, salta no último acorde e depois se dissolve para os lados. | match cut de forma (pílula → pílula, casa → "O"), respiração na batida |

**Regras de conteúdo:** não há cliente, depoimento, estatística ou resultado prometido. O "R$ 4.871,30" é cenográfico: é o valor do caixa da cena, e não uma afirmação sobre o produto. Não há tela de aplicativo, celular, print ou imitação de interface. Day Use não é citado.

---

## Trilha (composta por código)

A chave do ElevenLabs disponível nos Segredos de rede respondeu **401 (sem permissão de música nem de efeitos)**. Por isso a trilha e todos os efeitos foram sintetizados em `src/audio/trilha.py` (numpy + numba + scipy), e nenhuma chave foi parar em arquivo.

- **124 BPM, Lá menor → Dó maior.** Ato 1: Am–Am–F–G, com bumbo 4×4, palmas no 2 e no 4, chimbal no contratempo, baixo nos contratempos, arpejo pluck que abre o filtro aos poucos e stabs de supersaw.
- **Build (compassos 11–12):** rufo de caixa em colcheias, depois semicolcheias e fusas, mais um riser de ruído e tom. O bumbo sai antes da quebra.
- **Quebra (13):** pad filtrado, respiração (ruído filtrado) e prato reverso entrando no drop.
- **Drop (14–22):** C–G–Am–F com supersaw sustentado e sidechain (bombeando), baixo rolante em semicolcheias, lead com tema próprio, eco pontuado e reverb por convolução com IR sintética.
- **Volta (23–24):** só stabs leves, para dar a sensação de "cabeça leve". **Logo (25–26):** impacto, groove completo e cadência plagal F → C no acorde final.
- **Efeitos sincronizados com a imagem:** pops das bolinhas na chaminé, tiques do relógio acompanhando a velocidade do odômetro, whoosh do zoom pelo "0", pops da nuvem de perguntas, chaves tilintando nos giros da etiqueta, papel caindo, caça-níquel, vórtice, respiração, impacto do drop, whoosh e pop em cada estação, sino do "caixa bateu", escala subindo nas fileiras e brilho no logo.
- **Sincronia medida** (onset do áudio contra o corte da imagem): início, explosão da casa, zoom pelo "0", chicote, DROP, estação Comanda, logo e acorde final, todos com erro de **±3 ms** (menos de 1 quadro).
- **Mix:** EQ por barramento (realce de agudos em música e bateria, passa-alta no master), compressor de barramento, normalização iterativa para −14 LUFS e limitador com detecção de pico real (sobreamostragem 4×, antecipação). O teto fica em −3,2 dBTP no WAV para sobrar margem depois da codificação AAC, que soma cerca de 1,2 dB.

---

## Técnicas de imagem

- **Motor próprio em canvas 2D** (`src/video/`): cada quadro é uma função pura do tempo, `f(t)`. Isso deixa o render determinístico e permite renderizar em paralelo. O Playwright chama `renderFrame(t)`, captura em PNG e manda para o ffmpeg em 4 segmentos simultâneos, que depois são concatenados.
- **Grid musical compartilhado** (`src/tempo.json`): vídeo e áudio leem o mesmo BPM e os mesmos compassos. Bojo da casa, ondas no chão, pulsos e brilhos usam o mesmo envelope do bumbo.
- **Tipografia cinética:** revelação por palavra com máscara, tremida por letra no bumbo, letter-spacing que respira, auto-ajuste de tamanho para caber nas zonas seguras e pílula de destaque herdada da pílula "Hospeda" do logo.
- **Ícones da marca desenhando** (`marca/icones`): os caminhos SVG originais, animados por comprimento de traço.
- **Morph de formas:** amostragem de caminhos com alinhamento de ponto inicial (casa → "O" de FAZLO), mais grade → chão em perspectiva → linha. O trilho da jornada é um caminho poligonal (o contorno da casa) percorrido por comprimento de arco.
- **2.5D:** chão de pontos com projeção perspectiva e câmera avançando, giros 3D falsos e paralaxe de fundo.
- **Câmera:** push-ins, zoom-through num glifo, whip pan, câmera que segue o trilho com rotação pela tangente e pull-back final. Durante a jornada há uma deriva contínua para nada congelar.
- **Motion blur** por acumulação de subquadros (5 a 7 amostras) só nas janelas rápidas: zoom, chicote, vórtice, drop e viagens.
- **Transições com impacto:** a forma vira o fundo (pílula → tela limão), wipes radiais a partir do hóspede, cortes casados por giro e por forma, tremor de câmera nos impactos.

---

## Como eu assisti ao próprio vídeo (QA)

Como aqui não dá para ouvir nem ver em tempo real, o vídeo e a trilha foram revisados por medição:

| verificação | ferramenta | resultado no `output/experimento.mp4` |
|---|---|---|
| Movimento (diferença média entre quadros a 10 fps, escala 0–255) | `src/ferramentas/analise.py` | **mediana 2,90** (meta ≥ 1,0); mínimo 0,23; pior janela de 0,5 s com média 0,59 |
| Trechos parados (diferença < 0,5) | idem | **maior trecho: 0,2 s** (meta ≤ 0,5 s) |
| Folha de contato, 2 quadros por segundo | idem | `output/folha-contato.jpg` |
| Tempo de leitura de cada texto (1,2 s + 0,3 s/palavra) | `src/ferramentas/qa_textos.py` (o motor registra a caixa de cada palavra em cada quadro) | **todos os 32 blocos aprovados** |
| Zonas seguras (y 200–1536, coluna x>940 & y>1000), texto cortado ou encostado (margem de 24 px, blocos sem se tocar) | idem | **0 ocorrências** com texto assentado |
| Loudness e pico real **depois do AAC** | `ffmpeg ebur128=peak=true` | **−14,1 LUFS · −2,2 dBTP** (meta −14 / ≤ −1,5) |
| Equilíbrio de frequências (para alto-falante de celular) | análise por oitavas | drop com 2 kHz em −2,8 dB e 4 kHz em −5,5 dB em relação a 500 Hz |
| Capa da grade | `render.cjs capa` | bloco do título até a pílula centralizado em y 960, dentro da área 3:4 (y 240–1680); o centro (botão de play) cai sobre as bolinhas, sem texto |

As medições mudaram o vídeo nestes pontos:
- As estações da jornada congelavam por até 1 s. A correção foi a deriva de câmera mais o tracejado correndo.
- A assinatura final ficava parada. Entraram a linha de base que ondula na batida e a respiração do logo.
- Duas frases estavam ~0,1 s abaixo do tempo de leitura e foram ajustadas.
- "sábado?" invadia a coluna de botões e a frase subiu.
- As comandas caíam por cima do título e passaram a ser arremessadas pelas laterais.
- A primeira mixagem era quase só bateria (RMS de −8 dB contra −28 dB da harmonia), sem diferença entre o caos e o drop. Hoje o Ato 1 fica em −15,5 LUFS e o drop em −12,3 LUFS.
- O pico real passava de −1,5 dBTP depois do AAC e o teto do limitador foi reduzido.

---

## Como reproduzir

Requisitos: node 22 com Playwright e Chromium (`require('playwright')`), Python 3 com numpy, scipy, numba e pyloudnorm, e ffmpeg.

```bash
python3 src/audio/trilha.py                                         # build/trilha.wav (−14 LUFS)
node src/video/render.cjs video --workers 4 --saida build/video.mp4  # ~3 min
ffmpeg -i build/video.mp4 -i build/trilha.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart output/experimento.mp4
node src/video/render.cjs capa --saida build/capa.png               # capa da grade
node src/video/render.cjs qa --saida build/qa.json && python3 src/ferramentas/qa_textos.py build/qa.json
python3 src/ferramentas/analise.py output/experimento.mp4 --folha output/folha-contato.jpg
```

As fontes ficam em `fontes/` (Geist e Geist Mono, licença OFL, pacote npm `geist`).

---

## O que eu faria numa próxima versão

1. **Ouvir de verdade.** A trilha foi revisada por espectrograma, medição de loudness por seção e balanço por oitavas, mas ninguém a ouviu. Com um par de ouvidos eu ajustaria o timbre do lead e do supersaw, a humanização (swing nos chimbais, variação de velocidade) e o volume relativo dos efeitos. Se a chave do ElevenLabs ganhar permissão de efeitos, eu trocaria os impactos e whooshes sintéticos por gravados e manteria a música por código, que garante a sincronia.
2. **Variações de gancho para teste A/B:** "Sexta, 18h. Casa cheia." contra "E agora?" no quadro 0, e uma versão que abre já no caos das perguntas.
3. **Versões curtas** (15 s e 30 s) reaproveitando o mesmo motor: só o caos → drop → logo.
4. **Motion blur em todos os quadros** (obturador de 180°) e um leve grão para dar textura. Hoje o blur só existe nos trechos rápidos, para o render ficar em ~3 min.
5. **Legendas de acessibilidade e texto alternativo** para o post, e uma versão com contraste reforçado da nuvem de perguntas (hoje ela está a 50% de opacidade, de propósito, como textura).
6. **Loop perfeito:** fazer o último quadro (a linha de base se dissolvendo) encaixar no primeiro (a casa), para quem assiste duas vezes.

---

## Revisão 2: trecho final sem círculo e sem órbita

Pedido: o final lembrava um vídeo antigo da marca. Mudou só o trecho da jornada até o logo; cenas, tempos, textos, trilha e capa continuam iguais.

- **Sem círculo nem anel.** O trilho da jornada deixou de ser um círculo. Agora é o contorno da casa do gancho, e as 5 estações são pontos dele: a base (Reserva), a parede esquerda (Chegada), o telhado esquerdo (Comanda), o telhado direito (Saída) e a parede direita (Caixa). As composições de cada estação foram mantidas. No recuo, a casa aparece em pé e o traço a fecha em "Do início ao fim." (40,16 s). Ela fica exatamente na posição da casa do callback, então não há mais morph de círculo para casa.
- **Sem órbita no logo.** Saíram a elipse, o hóspede orbitando e o anel do acorde final. As bolinhas assentam numa linha de base ou se dissolvem para os lados; o logo e o @fazlohospeda respiram (escala e brilho).
- **Efeitos sonoros do trecho novo**, sincronizados: o traço correndo até fechar a casa (whoosh longo), o clique, o pop e o sino no fecho (40,16 s) e os tiques das bolinhas assentando na linha de base (47,25 s).
- **Medido de novo no arquivo final:** movimento com mediana 2,90 e nenhum trecho abaixo de 0,5 por mais de 0,2 s. Os 32 blocos de texto passam em tempo de leitura e zonas seguras, sem nada cortado ou encostado. Áudio: −14,1 LUFS e −2,2 dBTP depois do AAC.
