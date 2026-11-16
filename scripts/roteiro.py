"""Narração aprovada (texto exato do ROTEIRO.md), dividida por assunto.

- `texto`  : grafia oficial, usada na tela e na legenda.
- A versão enviada à API de voz sai de `texto_api()`, que aplica SOMENTE as
  trocas da seção "Pronúncia" do ROTEIRO.md.
- `pausa`  : silêncio (s) entre o fim deste assunto e o início do próximo.
- `pausas_internas`: silêncio mínimo (s) depois da frase de índice N dentro do
  assunto (só alonga a pausa natural, nunca corta voz).
"""

ASSUNTOS = [
    dict(id="dor", pausa=1.60, texto=(
        "Em muita pousada, o dono faz tudo: a reserva fica no caderno e no WhatsApp, "
        "o consumo, no papel. No check-out, ninguém sabe ao certo quanto o hóspede ainda deve. "
        "E no fim do dia, o caixa não bate.")),
    dict(id="virada", pausa=1.50, texto=(
        "O FAZLO Hospeda junta tudo isso em um só lugar. Veja como fica o dia a dia.")),
    dict(id="visao", pausa=2.20, texto=(
        "Ao abrir o Hospeda, você vê o dia da pousada: quem está hospedado, quem chega, "
        "quem sai e quanto já entrou, por forma de pagamento.")),
    dict(id="calendario", pausa=2.20, texto=(
        "No calendário, cada acomodação tem a sua linha, e cada reserva aparece no período dela.")),
    dict(id="duplicada", pausa=2.10, texto=(
        "E o Hospeda não deixa vender o mesmo chalé duas vezes nas mesmas datas: ele avisa na hora.")),
    dict(id="sinal", pausa=1.80, texto=(
        "Na reserva, você registra o sinal, e o saldo que falta já fica calculado.")),
    dict(id="cancelamento", pausa=2.10, texto=(
        "Se o hóspede cancelar, você decide: reter o sinal, que fica com a pousada, "
        "ou devolver, e a saída já é lançada no caixa.")),
    dict(id="comanda", pausa=2.20, texto=(
        "Durante a estadia, cada consumo vai para a comanda do hóspede: o que foi, quantos e quanto.")),
    dict(id="checkout", pausa=1.90, texto=(
        "No check-out, o saldo aparece claro, e a saída só libera com tudo quitado.")),
    dict(id="caixa", pausa=2.20, texto=(
        "O caixa abre com o dinheiro da gaveta, e cada recebimento entra no diário, "
        "com a forma de pagamento.")),
    dict(id="fechamento", pausa=2.10, texto=(
        "No fechamento, você conta o dinheiro, e o Hospeda mostra na hora se sobrou ou faltou.")),
    dict(id="internet", pausa=1.60, texto=(
        "E se a internet cair no meio de um recebimento, o mesmo pagamento não é lançado duas vezes.")),
    dict(id="comeca1", pausa=2.20, texto=(
        "Você não precisa cadastrar nada. A equipe FAZLO configura a sua pousada: "
        "acomodações, tarifas, produtos da comanda e usuários.")),
    dict(id="comeca2", pausa=1.60, texto=(
        "Você recebe o convite por e-mail, cria a sua senha e já começa a usar. "
        "E qualquer dúvida, é só chamar a gente no WhatsApp.")),
    dict(id="teste", pausa=1.60, texto=(
        "São 30 dias grátis para usar o Hospeda na sua pousada. Sem cartão e sem compromisso.")),
    dict(id="preco", pausa=1.70, texto=(
        "Depois dos 30 dias, se fizer sentido para você, a mensalidade é de R$ 99,90 por mês. "
        "Sem taxa por reserva e sem fidelidade. "
        "E as 10 primeiras pousadas pagam R$ 79,90 por mês durante os primeiros 12 meses.")),
    dict(id="chamada", pausa=0.0, texto=(
        "Quer testar 30 dias na sua pousada? É só responder esta mensagem.")),
]

# Seção "Pronúncia" do ROTEIRO.md — aplicada só no texto enviado à API de voz.
PRONUNCIA = [
    ("R$ 99,90", "noventa e nove reais e noventa centavos"),
    ("R$ 79,90", "setenta e nove reais e noventa centavos"),
    ("Hospeda", "Hospéda"),
    ("FAZLO", "Fázlo"),
    ("WhatsApp", "Uátsap"),
]


def texto_api(texto: str) -> str:
    for de, para in PRONUNCIA:
        texto = texto.replace(de, para)
    return texto


def tokens(texto: str):
    """Divide a grafia oficial em tokens de legenda. 'R$ 99,90' é um token só."""
    out, partes, i = [], texto.split(" "), 0
    while i < len(partes):
        p = partes[i]
        if p == "R$" and i + 1 < len(partes):
            out.append(p + " " + partes[i + 1])
            i += 2
        else:
            out.append(p)
            i += 1
    return out


def tokens_api(token: str):
    """Palavras que a voz fala para um token de legenda (após a pronúncia)."""
    return texto_api(token).split(" ")


if __name__ == "__main__":
    total = 0
    for a in ASSUNTOS:
        t = texto_api(a["texto"])
        total += len(t)
        print(f"[{a['id']}] ({len(t)} car.)\n{t}\n")
    print("total de caracteres enviados:", total)
