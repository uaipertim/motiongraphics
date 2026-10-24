#!/usr/bin/env python3
"""
Dicionário de pronúncia da narração (Série Explica e Série Fala): um lugar só, usado pelos dois voz.py e pelas
tomadas de pergunta (serie-fala/scripts/entonacao.py).

A troca vale SÓ para o texto enviado à API. Legendas, capas, telas e o JSON dos episódios continuam com a grafia
oficial. Para isso, o alinhamento que a API devolve (com a grafia trocada) é refeito na grafia oficial por
`realinha()`: cada troca é 1 palavra → 1 palavra, e a correspondência é feita palavra por palavra. Assim, linha.py e
qa.py recebem a palavra oficial com o tempo certo, mesmo quando o comprimento muda ("WhatsApp" → "Uátsap").

    python3 pronuncia.py     -> autoteste (troca, palavras que não podem ser trocadas e realinhamento)
"""
import re

# palavra oficial -> como deve soar (palavra inteira, com maiúsculas exatas)
MAPA = {
    'Hospeda': 'Hospéda',
    'WhatsApp': 'Uátsap',
    'FAZLO': 'Fázlo',
    'Fazlo': 'Fázlo',
}
# o que nunca pode aparecer em legenda, tela ou quadro
FONETICAS = sorted(set(MAPA.values()))

_LETRA = r'0-9A-Za-zÀ-ÖØ-öø-ÿ'
_RE = re.compile(r'(?<![%s])(%s)(?![%s])' % (_LETRA, '|'.join(map(re.escape, sorted(MAPA, key=len, reverse=True))), _LETRA))


def fonetica(texto):
    """o texto como vai para a API (None continua None)"""
    if texto is None:
        return None
    return _RE.sub(lambda m: MAPA[m.group(1)], texto)


def _blocos(chars):
    """divide uma sequência de caracteres em blocos alternados (espaço / não espaço): [(é_espaço, i0, i1)]"""
    out, i0 = [], 0
    for i in range(1, len(chars) + 1):
        if i == len(chars) or chars[i].isspace() != chars[i0].isspace():
            out.append((chars[i0].isspace(), i0, i))
            i0 = i
    return out


def realinha(oficial, enviado, al):
    """o alinhamento da API (do texto enviado) refeito caractere a caractere sobre o texto oficial"""
    if oficial == enviado:
        return al
    ch, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    bo, ba = _blocos(oficial), _blocos(ch)
    if [b[0] for b in bo] != [b[0] for b in ba]:
        raise ValueError(f'a troca de pronúncia mudou o número de palavras: "{oficial}" × "{"".join(ch)}"')
    O_ch, O_st, O_en = [], [], []
    for (esp, a0, a1), (_, b0, b1) in zip(bo, ba):
        po, pa = oficial[a0:a1], ''.join(ch[b0:b1])
        ts, te = st[b0:b1], en[b0:b1]
        if len(po) == len(pa):                                    # mesmo comprimento ("Hospeda"/"Hospéda"): tempos 1:1
            O_ch += list(po); O_st += ts; O_en += te
            continue
        # comprimentos diferentes ("WhatsApp," / "Uátsap,"): prefixo e sufixo iguais (pontuação) mantêm os tempos;
        # o miolo trocado ganha o intervalo do miolo da API, dividido igualmente entre as letras oficiais
        p = 0
        while p < min(len(po), len(pa)) and po[p] == pa[p]:
            p += 1
        s = 0
        while s < min(len(po), len(pa)) - p and po[-1 - s] == pa[-1 - s]:
            s += 1
        mo, ma = po[p:len(po) - s], (p, len(pa) - s)
        t0 = ts[ma[0]] if ma[1] > ma[0] else (te[p - 1] if p else ts[0])
        t1 = te[ma[1] - 1] if ma[1] > ma[0] else t0
        O_ch += list(po[:p]); O_st += ts[:p]; O_en += te[:p]
        for k, c in enumerate(mo):
            O_ch.append(c); O_st.append(round(t0 + (t1 - t0) * k / len(mo), 4)); O_en.append(round(t0 + (t1 - t0) * (k + 1) / len(mo), 4))
        if s:
            O_ch += list(po[len(po) - s:]); O_st += ts[len(pa) - s:]; O_en += te[len(pa) - s:]
    assert ''.join(O_ch) == oficial
    return {'characters': O_ch, 'character_start_times_seconds': O_st, 'character_end_times_seconds': O_en}


def foneticas_em(texto):
    """as grafias fonéticas encontradas num texto (para o QA)"""
    return [f for f in FONETICAS if re.search(r'(?<![%s])%s(?![%s])' % (_LETRA, re.escape(f), _LETRA), texto)]


if __name__ == '__main__':
    t = 'No FAZLO Hospeda, a reserva do WhatsApp vira hospedagem; Fazlo hospeda o hóspede. "WhatsApp"…'
    f = fonetica(t)
    assert f == 'No Fázlo Hospéda, a reserva do Uátsap vira hospedagem; Fázlo hospeda o hóspede. "Uátsap"…', f
    for w in ('hospedagem', 'hospedar', 'hóspede', 'Hospedagem', 'hospeda'):
        assert fonetica(w) == w, w
    # realinhamento: um alinhamento falso do texto enviado (1 caractere a cada 0,05 s)
    al = {'characters': list(f), 'character_start_times_seconds': [i * 0.05 for i in range(len(f))],
          'character_end_times_seconds': [(i + 1) * 0.05 for i in range(len(f))]}
    r = realinha(t, f, al)
    assert ''.join(r['characters']) == t
    wo, wa = t.split(), f.split()
    # cada palavra oficial começa e termina no mesmo tempo da palavra enviada correspondente
    def tempos(chars, a):
        out, i = [], 0
        for w in chars.split(' '):
            out.append((round(a['character_start_times_seconds'][i], 4), round(a['character_end_times_seconds'][i + len(w) - 1], 4))); i += len(w) + 1
        return out
    assert tempos(t, r) == tempos(f, al), (tempos(t, r), tempos(f, al))
    assert foneticas_em('a Hospéda e o Uátsap') == ['Hospéda', 'Uátsap'] and not foneticas_em(t)
    print('pronuncia.py: ok ·', f)
