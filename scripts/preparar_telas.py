"""Recorta as telas do pacote para src/telas/.

O que as "Regras de conteúdo" do ROTEIRO.md proíbem é removido FISICAMENTE
do arquivo que o vídeo carrega — assim não há quadro em que possa aparecer:

- faixa "Demonstração · dados de exemplo · Quero usar": cortada em todas;
- 06-caixa-aberto: a página termina na linha "Consumo · Patricia Almeida"
  (a linha "Day Use · Camila Rocha" e as seguintes não existem no recorte);
- 10-fechamento: só a área visível do celular (o diário de baixo sai);
- 14-revisão: item 1 (nome da pousada, cidade, responsável, datas) e o texto
  do convite/datas do rodapé ficam de fora — sobram os itens 2 a 6;
- 09 (computador): só a janela "Nova reserva"; menu lateral (Day Use, nome
  da pousada de demonstração) e fundo ficam de fora.

Coordenadas em px da imagem original (3x). Uso: python3 -I scripts/preparar_telas.py
"""
import os
from PIL import Image, ImageDraw

ORIG = "pacote/fazlo-hospeda-apresentacao-teste/telas"
DEST = "src/telas"
FAIXA = 96            # altura da faixa de demonstração (celular), px
CAB = 216             # cabeçalho do app (72 css)
NAV = 252             # barra inferior (84 css)
VIEW = 812 * 3        # altura visível do celular simulado (812 css)


def abrir(nome):
    return Image.open(os.path.join(ORIG, nome)).convert("RGB")


def salvar(im, nome):
    im.save(os.path.join(DEST, nome), optimize=True)
    print(f"{nome:28s} {im.size[0]}x{im.size[1]}")


def fab(im, nav_top):
    """Botão '+' (círculo de 34 css com o anel) sobre fundo transparente."""
    cx, cy, r = 585, nav_top + 21, 102
    rec = im.crop((cx - r, cy - r, cx + r, cy + r)).convert("RGBA")
    m = Image.new("L", (r * 8, r * 8), 0)
    ImageDraw.Draw(m).ellipse((0, 0, r * 8 - 1, r * 8 - 1), fill=255)
    rec.putalpha(m.resize((r * 2, r * 2), Image.LANCZOS))
    return rec


def pagina_com_rolagem(arq, saida, fim=None):
    """Página longa: corpo (sem faixa), cabeçalho e barra inferior separados."""
    im = abrir(arq)
    w, h = im.size
    nav_top = h - NAV
    corpo = im.crop((0, FAIXA, w, fim if fim else nav_top))
    if not fim:
        # o "+" é fixo na tela: apaga a parte dele que ficou impressa no fim do corpo
        cy = nav_top + 21 - FAIXA
        ImageDraw.Draw(corpo).ellipse((585 - 104, cy - 104, 585 + 104, cy + 104),
                                      fill=(244, 244, 240))
    salvar(corpo, f"{saida}.png")
    salvar(im.crop((0, FAIXA, w, FAIXA + CAB)), f"{saida}-cab.png")
    salvar(im.crop((0, nav_top, w, h)), f"{saida}-nav.png")
    salvar(fab(im, nav_top), f"{saida}-fab.png")


def main():
    os.makedirs(DEST, exist_ok=True)

    pagina_com_rolagem("01-visao-geral-celular.png", "01")
    pagina_com_rolagem("02-calendario-celular.png", "02")
    pagina_com_rolagem("05-comanda-aberta-celular.png", "05")
    # 06: corta no separador depois de "Consumo · Patricia Almeida" (y = 1538 css)
    pagina_com_rolagem("06-caixa-aberto-celular.png", "06", fim=FAIXA + 1538 * 3)

    # Telas com janela/folha: exatamente a área visível (390 x 812 css)
    for arq, saida in [
        ("03-nova-reserva-sinal-celular.png", "03"),
        ("04-hospedagem-checkout-celular.png", "04"),
        ("11-cancelamento-sinal-reter-celular.png", "11r"),
        ("11-cancelamento-sinal-devolver-celular.png", "11d"),
        ("10-fechamento-caixa-celular.png", "10"),
    ]:
        salvar(abrir(arq).crop((0, FAIXA, 1170, FAIXA + VIEW)), f"{saida}.png")

    # 10: a folha "Fechar caixa" sozinha (sobe por cima do caixa aberto)
    im10 = abrir("10-fechamento-caixa-celular.png")
    salvar(im10.crop((0, FAIXA + 241 * 3, 1170, FAIXA + VIEW)), "10-folha.png")

    # 13 (plataforma, sem faixa): cabeçalho + página inteira
    im13 = abrir("13-nova-pousada-acomodacoes-celular.png")
    salvar(im13.crop((0, 0, 1170, CAB)), "13-cab.png")
    salvar(im13, "13.png")

    # 14: só dos itens 2 a 6 (y 462 → 1000 css). Item 1 e rodapé ficam de fora.
    im14 = abrir("14-nova-pousada-revisao-celular.png")
    salvar(im14.crop((0, 462 * 3, 1170, 1000 * 3)), "14-itens.png")

    # 09 (computador): só a janela "Nova reserva", com os cantos arredondados
    im09 = abrir("09-reserva-duplicada-computador.png")
    jan = im09.crop((1140, 288, 2700, 2406)).convert("RGBA")
    m = Image.new("L", (jan.size[0] * 4, jan.size[1] * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        (0, 0, m.size[0] - 1, m.size[1] - 1), radius=72 * 4, fill=255)
    jan.putalpha(m.resize(jan.size, Image.LANCZOS))
    salvar(jan, "09-janela.png")


if __name__ == "__main__":
    main()
