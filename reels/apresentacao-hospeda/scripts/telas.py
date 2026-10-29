#!/usr/bin/env python3
"""
Os recortes das telas (só de hospeda-v2/, PNGs em tamanho original) usados na apresentação.

    python3 scripts/telas.py            -> src/telas/<nome>.png + src/telas.json (recortes e focos, em pixels do recorte)
    python3 scripts/telas.py --prova    -> output/revisao/recortes.jpg (cada recorte com os focos desenhados)

Cada recorte começa abaixo da faixa "Demonstração · dados de exemplo · Quero usar" das telas (y ≥ 160 no celular,
y ≥ 120 no computador): a faixa nunca entra no vídeo. Os focos marcam o dado que a narração cita (contorno limão)
e para onde a câmera vai; as coordenadas abaixo são da tela original (o script converte para o recorte).
"""
import json
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V2 = os.path.join(ROOT, '..', '..', 'hospeda-v2')
OUT = os.path.join(ROOT, 'src', 'telas')

# nome: (arquivo, recorte x0,y0,x1,y1, {foco: x0,y0,x1,y1}) — tudo em pixels da tela original
RECORTES = {
    'dia':        ('01-visao-geral-celular.png', (36, 560, 1134, 1700), {
                   'hospedado': (61, 1355, 388, 1675), 'chega': (422, 1355, 748, 1675), 'sai': (781, 1355, 1109, 1675),
                   'entrou': (61, 588, 1109, 1317), 'formas': (100, 1000, 1070, 1110)}),
    'calendario': ('02-calendario-celular.png', (36, 600, 1134, 1700), {
                   'acomodacoes': (61, 933, 338, 1690), 'reservas': (338, 933, 1109, 1690)}),
    'duplicada':  ('09-reserva-duplicada-computador.png', (1150, 300, 2690, 1290), {
                   'aviso': (1213, 989, 2627, 1181)}),
    'sinal':      ('03-nova-reserva-sinal-celular.png', (50, 705, 1120, 1860), {
                   'sinal': (108, 805, 1060, 971), 'saldo': (108, 1666, 1060, 1837)}),
    'reter':      ('11-cancelamento-sinal-reter-celular.png', (50, 473, 1120, 1697), {
                   'reter': (111, 1219, 1060, 1398), 'info': (111, 1443, 1060, 1690)}),
    'devolver':   ('11-cancelamento-sinal-devolver-celular.png', (50, 503, 1120, 1700), {
                   'devolver': (111, 1074, 1060, 1249), 'reter': (111, 1249, 1060, 1426), 'info': (111, 1473, 1060, 1660)}),
    'comanda':    ('05-comanda-aberta-celular.png', (36, 540, 1134, 2532), {
                   'topo': (61, 545, 1109, 1150), 'saldo': (61, 751, 1109, 1139), 'caipirinha': (61, 1688, 1109, 2110),
                   'qtd': (90, 1690, 1100, 1940)}),
    'checkout':   ('04-hospedagem-checkout-celular.png', (50, 800, 1120, 1734), {
                   'saldo': (108, 1212, 1060, 1480), 'libera': (150, 1380, 1000, 1445)}),
    # o caixa e o diário da sessão são a mesma tela: um recorte só, e a câmera rola da abertura até o diário
    'caixa':      ('06-caixa-aberto-celular.png', (36, 360, 1134, 4460), {
                   'abertura': (110, 1300, 1060, 1375), 'diario': (100, 3530, 1070, 4200), 'forma': (100, 3530, 1070, 3745)}),
    'fechamento': ('10-fechamento-caixa-celular.png', (36, 880, 1134, 1790), {
                   'contado': (61, 1316, 1109, 1527), 'diferenca': (61, 1567, 1109, 1760)}),
    'dayuse':     ('12-day-use-celular.png', (36, 360, 1134, 1690), {
                   'camila': (61, 1325, 1109, 1663)}),
    'dayuse-ativo': ('12-day-use-ativo-celular.png', (36, 1520, 1134, 2495), {
                   'consumos': (100, 1730, 1070, 1925), 'nota': (100, 2320, 1070, 2440)}),
    'diario':     ('06-caixa-aberto-celular.png', (36, 4480, 1134, 5100), {
                   'dayuse': (111, 4708, 1109, 4901)}),
    'acomodacoes': ('13-nova-pousada-acomodacoes-celular.png', (36, 690, 1134, 1900), {
                   'lista': (100, 1200, 1070, 1890), 'tarifas': (100, 1720, 1070, 1890)}),
    # só os itens 4 a 6: o item 1 (nome da pousada e datas do teste) e o texto do convite ficam fora
    'revisao':    ('14-nova-pousada-revisao-celular.png', (36, 1990, 1134, 2940), {
                   'acomodacoes': (100, 1995, 1070, 2370), 'produtos': (100, 2420, 1070, 2640), 'usuarios': (100, 2690, 1070, 2930)}),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for nome, (arq, (x0, y0, x1, y1), focos) in RECORTES.items():
        im = Image.open(os.path.join(V2, arq)).convert('RGB')
        assert y0 >= (160 if 'celular' in arq else 120), f'{nome}: o recorte entra na faixa de demonstração'
        assert x1 <= im.width and y1 <= im.height, (nome, im.size)
        im.crop((x0, y0, x1, y1)).save(os.path.join(OUT, nome + '.png'), optimize=True)
        meta[nome] = {'arquivo': 'hospeda-v2/' + arq, 'origem': [x0, y0, x1, y1], 'w': x1 - x0, 'h': y1 - y0,
                      'focos': {k: [a - x0, b - y0, c - x0, d - y0] for k, (a, b, c, d) in focos.items()}}
        for k, (a, b, c, d) in focos.items():
            assert x0 <= a < c <= x1 and y0 <= b < d <= y1, f'{nome}.{k} fora do recorte'
    json.dump(meta, open(os.path.join(ROOT, 'src', 'telas.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'{len(meta)} recortes em src/telas/')
    if '--prova' in sys.argv:
        th = []
        for nome, m in meta.items():
            im = Image.open(os.path.join(OUT, nome + '.png')).convert('RGB'); d = ImageDraw.Draw(im)
            for k, (a, b, c, e) in m['focos'].items():
                d.rectangle((a, b, c, e), outline=(175, 250, 39), width=8); d.text((a + 10, b + 6), k, fill=(200, 0, 120))
            s = 520 / im.width; im = im.resize((520, int(im.height * s)))
            th.append((nome, im))
        H = max(i.height for _, i in th) + 40
        cols = 6; rows = (len(th) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * 540, rows * H), (40, 40, 40)); d = ImageDraw.Draw(sheet)
        for i, (n, im) in enumerate(th):
            x, y = (i % cols) * 540 + 10, (i // cols) * H + 30
            sheet.paste(im, (x, y)); d.text((x, y - 22), n, fill=(255, 255, 255))
        os.makedirs(os.path.join(ROOT, 'output', 'revisao'), exist_ok=True)
        sheet.save(os.path.join(ROOT, 'output', 'revisao', 'recortes.jpg'), quality=85)


if __name__ == '__main__':
    main()
