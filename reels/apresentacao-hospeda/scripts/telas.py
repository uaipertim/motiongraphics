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
    # ---- Airbnb e Booking (capturas da Demo de 19/11/2026, 390 px a 3x). A Demo de hoje tem margem lateral de 16 px (48 px
    # na imagem), não os 20 px das telas de outubro: por isso os recortes vão de x 24 a 1146, a mesma folga de 24 px até a
    # borda do cartão que as telas de outubro têm. Cada corte de cima e de baixo cai numa faixa vazia (medida na imagem,
    # scripts/telas.py --bordas): nada de texto ou botão encostado ou cortado. Ficam fora o selo "Demonstração" e a data do
    # cabeçalho (y 252–348), o aviso "Na demonstração, a sincronização não é feita." (y 990–1122) e a versão.
    # 'pad' (cima, direita, baixo, esquerda): respiro com a cor de fundo da própria página, quando o corte não pode subir
    # mais sem pegar o selo "Demonstração".
    'canais-topo':  ('15-canais-celular.png', (0, 350, 1170, 987), {
                     'texto': (48, 520, 1122, 764)}, {'faixa': 349, 'pad': (19, 0, 0, 0)}),
    'canais-envio': ('15-canais-celular.png', (24, 1146, 1146, 1791), {
                     'link': (72, 1478, 1098, 1600), 'envio-airbnb': (72, 1472, 1098, 1779)}),
    'canais-recebe': ('15-canais-celular.png', (24, 2171, 1146, 2928), {
                     'recebendo': (72, 2279, 1098, 2409), 'sincronizar': (90, 2421, 1080, 2583)}),
    'calendario-airbnb': ('16-calendario-14-dias-celular.png', (24, 1008, 1146, 1489), {
                     'linha': (51, 1200, 1119, 1341), 'bloqueio': (711, 1211, 1029, 1331)}),
    # a ficha cobre a tela inteira (sem cabeçalho nem selo); o meio dela é vazio (o botão fica no pé da tela), então a
    # câmera mostra primeiro o período e o "Ocupado pelo Airbnb" e depois desce até o botão
    'bloqueio':     ('17-bloqueio-airbnb-celular.png', (0, 504, 1170, 2527), {
                     'ocupado': (72, 819, 1098, 1233), 'botao': (72, 2244, 1098, 2388)}, {'faixa': 0}),
    'registrar-airbnb': ('18-registrar-reserva-airbnb-celular.png', (24, 498, 1146, 1434), {
                     'reserva': (111, 957, 1059, 1410)}),
    'inicio-conflito': ('19-visao-geral-avisos-canais-celular.png', (24, 3975, 1146, 4749), {
                     'conflito': (48, 3999, 1122, 4725), 'nada': (72, 4415, 1098, 4499)}),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for nome, (arq, (x0, y0, x1, y1), focos, *resto) in RECORTES.items():
        im = Image.open(os.path.join(V2, arq)).convert('RGB')
        op = resto[0] if resto else {}
        faixa = op.get('faixa', 160 if 'celular' in arq else 120)   # até onde vai a marca de demonstração no alto
        assert y0 >= faixa, f'{nome}: o recorte entra na faixa de demonstração'
        assert x1 <= im.width and y1 <= im.height, (nome, im.size)
        rec = im.crop((x0, y0, x1, y1))
        pt, pr, pb, pl = op.get('pad', (0, 0, 0, 0))
        if any((pt, pr, pb, pl)):                                   # respiro com a cor do fundo da página
            fundo = im.getpixel((x0 + 4, y0 + 2))
            novo = Image.new('RGB', (rec.width + pl + pr, rec.height + pt + pb), fundo); novo.paste(rec, (pl, pt)); rec = novo
        rec.save(os.path.join(OUT, nome + '.png'), optimize=True)
        meta[nome] = {'arquivo': 'hospeda-v2/' + arq, 'origem': [x0, y0, x1, y1], 'w': rec.width, 'h': rec.height, 'faixa_ate': faixa,
                      **({'respiro': [pt, pr, pb, pl]} if any((pt, pr, pb, pl)) else {}),
                      'focos': {k: [a - x0 + pl, b - y0 + pt, c - x0 + pl, d - y0 + pt] for k, (a, b, c, d) in focos.items()}}
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


NOVOS = ['canais-topo', 'canais-envio', 'canais-recebe', 'calendario-airbnb', 'bloqueio', 'registrar-airbnb', 'inicio-conflito']


def bordas():
    """os recortes da parte Airbnb e Booking: nada encostado nem cortado nas bordas"""
    import numpy as np
    ok = True
    for nome in NOVOS:
        a = np.asarray(Image.open(os.path.join(OUT, nome + '.png')).convert('RGB')).astype(int)
        h, w, _ = a.shape
        miolo = a[:, 60:w - 60]
        cheia = (miolo.max(axis=1) - miolo.min(axis=1)).max(axis=1) > 10          # linha com algo além do fundo
        cima = int(np.argmax(cheia)); baixo = int(np.argmax(cheia[::-1]))
        escuro = np.nonzero((a.mean(axis=2) < 170).any(axis=0))[0]                 # texto e botões escuros
        esq, dir_ = int(escuro.min()), int(w - 1 - escuro.max())
        # o calendário é mais alto que o cartão do vídeo: o corte de baixo é a própria linha entre as acomodações 02 e 03
        regua = nome == 'calendario-airbnb' and baixo == 0 and (np.ptp(a[-3:, 60:w - 60].mean(axis=2), axis=1) < 40).any()
        bom = cima >= 12 and (baixo >= 12 or regua) and esq >= 36 and dir_ >= 36
        ok &= bom
        print(f'  {"ok   " if bom else "FALHA"} {nome:18s} {w}×{h} · vazio no alto {cima} px, embaixo {baixo} px · texto a {esq} px da esquerda e {dir_} px da direita' + (' · embaixo: a linha entre as acomodações 02 e 03' if regua else ''))
    return ok


if __name__ == '__main__':
    if '--bordas' in sys.argv:
        sys.exit(0 if bordas() else 1)
    main()
