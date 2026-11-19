# FAZLO Hospeda — vídeo curto de venda (68 s, 9:16, WhatsApp)

Primeiro contato com donos de pousada. Roteiro aprovado em [`ROTEIRO.md`](ROTEIRO.md). **Vídeo aprovado em 19/11/2026 com um ajuste na cena da marca (frase 4); a versão com o ajuste aguarda a conferência final.**

- ▶ **WhatsApp:** [`output/fazlo-hospeda-curto-whatsapp.mp4`](output/fazlo-hospeda-curto-whatsapp.mp4) — 1080×1920, 30 fps, 9,6 MB, −14,0 LUFS, pico −2,0 dBTP.
- **Mestre:** [`output/fazlo-hospeda-curto.mp4`](output/fazlo-hospeda-curto.mp4) — 1080×1920, 60 fps, 68,1 s.
- **Quadros da cena da marca:** [`aprovacao/quadros/marca-meio.jpg`](aprovacao/quadros/marca-meio.jpg) (13,06 s) e [`aprovacao/quadros/marca-mais-perto.jpg`](aprovacao/quadros/marca-mais-perto.jpg) (14,12 s, selos mais perto do logo).
- **Miniatura:** [`output/miniatura.jpg`](output/miniatura.jpg) (quadro 0, já com a pergunta do gancho). **Folha de contato:** [`output/folha-contato.jpg`](output/folha-contato.jpg) (1 quadro por segundo).

## Ajuste da cena da marca (frase 4)
Na primeira versão o selo "Airbnb" ficava por cima do "Hospeda" do logo e os três selos eram sugados por cima do símbolo. Agora:
- **WhatsApp** e **Airbnb** ficam dos dois lados, acima do símbolo, e **Booking** fica embaixo do nome. O caderno não aparece nesta cena: ele sai junto com a cena da frase 2.
- Em "num lugar só", os selos se aproximam do logo sem encostar e somem encolhendo no próprio lugar. Nenhum passa por cima do símbolo nem do nome "FAZLO Hospeda".
- `scripts/conferir-marca.cjs` confere a cena inteira, quadro a quadro a 60 fps (entrada, momento parado e saída). O teste exige uma margem livre de pelo menos 40 px entre cada selo e o símbolo, o nome e o check. Ele também exige que os selos não se sobreponham e fiquem dentro do quadro. Resultado: 228 quadros, 0 erros. A menor folga é de 54 px, aos 14,12 s, no instante em que os selos estão mais perto do logo.

## Voz
Alexa (`sXSV9RZ095VZyL64w3ap`), eleven_v4, estabilidade 0,50, semelhança 0,75, uma tomada só (seed 7100), ritmo 10,9 letras/s.
- Pronúncia no texto enviado: "Hospéda", "Fázlo", "Uátsap", "Trinta"; "Airbnb" e "Booking" na grafia oficial.
- O ajuste de velocidade da API foi testado e não muda nada no eleven_v4. A agilidade vem das frases curtas e das pausas de 0,25 a 0,5 s entre elas (`scripts/linha.py` só encurta silêncio; nenhuma palavra é cortada nem acelerada).

## Telas (celular, tela inteira) e tempo de cada uma
| Tempo | Tela | Na tela |
|---|---|---|
| 15.0–18.2 s | `calendario` | 3.2 s |
| 18.2–21.3 s | `canais-links` | 3.1 s |
| 21.3–24.5 s | `calendario` | 3.2 s |
| 24.5–29.0 s | `inicio-conflito` | 4.5 s |
| 29.0–31.9 s | `calendario` | 2.9 s |
| 31.9–33.9 s | `nova-datas` | 2.0 s |
| 33.9–37.3 s | `nova-livres` | 3.4 s |
| 37.3–40.1 s | `inicio-chegadas` | 2.8 s |
| 40.1–42.8 s | `ficha` | 2.7 s |
| 42.8–45.6 s | `ficha-comanda` | 2.8 s |
| 45.6–50.1 s | `ficha-saldo` | 4.5 s |
| 50.1–53.5 s | `caixa` | 3.4 s |
| 53.5–56.0 s | `caixa-formas` | 2.5 s |
| 56.0–58.1 s | `relatorios-ocupacao` | 2.1 s |
| 58.1–60.2 s | `relatorios-topo` | 2.0 s |

As telas são capturas da Demo em 19/11/2026 (`scripts/capturar.cjs` e `scripts/capturar2.cjs`). O selo "Demonstração", a data do cabeçalho, o botão "Quero usar", a versão e o aviso da demonstração ficam invisíveis no próprio navegador. A posição de cada destaque foi medida na Demo (`scripts/medir.cjs` → `telas/alvos.json`).

## Som
- **Trilha** composta por código: 120 BPM, Dó maior, C–G–Am–F. Fica tensa e filtrada no gancho, o groove entra no logo, aos 11,5 s, e resolve com a sineta no fecho.
- **Ducking:** a trilha desce 7 dB sob a voz e fica 13.8 dB abaixo dela durante a fala.
- **Efeitos:** 92 eventos, cada um tirado de um gesto da animação (transição, zoom, contorno, janela, toque, check).
- **Mixagem:** −14,0 LUFS; pico real −2,2 dBTP no WAV, −2,1 no mestre e −2,0 na versão WhatsApp.

## Rodar
```bash
python3 scripts/voz.py && python3 scripts/linha.py
node scripts/render.cjs info && python3 scripts/audio.py
node scripts/render.cjs video --mix audio/mix.wav
ffmpeg -i output/fazlo-hospeda-curto.mp4 -vf fps=30 -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart output/fazlo-hospeda-curto-whatsapp.mp4
```
