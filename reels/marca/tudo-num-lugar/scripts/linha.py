#!/usr/bin/env python3
"""
Linha do tempo do reel de marca "Tudo num lugar só" (base: reels/educativo/saldo-checkout/scripts/linha.py).

  python3 scripts/linha.py                      -> linha.json PROVISÓRIA (tempos estimados, locução pendente)
  python3 scripts/linha.py --audio voz.mp3      -> linha.json DEFINITIVA a partir do áudio aprovado (arquivo do ElevenLabs)
  python3 scripts/linha.py --alinhamento al.json --audio voz.mp3
                                                -> idem, palavra por palavra, com os tempos por caractere do ElevenLabs
                                                   (o JSON do endpoint with-timestamps: "alignment" ou o objeto direto)

Sem alinhamento, o áudio é cortado nas pausas reais (energia abaixo de −40 dBFS por ≥ 0,22 s): cada frase do roteiro
recebe um trecho de fala, e as palavras dentro da frase são distribuídas pelo número de letras faladas.
A legenda mostra "tela" no lugar da "fala" (ex.: "FAZLO Hospeda" vira uma palavra só).

Cada frase do roteiro é uma ideia (uma cena) e tem um "respiro": o silêncio acrescentado depois dela, para os destaques
ficarem ≥ 1,2 s parados depois de ditos. Com o áudio, a narração é MONTADA: cortada no ponto mais baixo do silêncio
entre as frases (fades de 15 ms) e com o respiro de cada frase inserido -> audio/voz-montada.wav (a voz não é acelerada
nem cortada no meio). Na estimativa, o respiro entra direto na linha do tempo.
"""
import json, os, re, subprocess, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
args = sys.argv[1:]
opt = lambda k: args[args.index(k) + 1] if k in args else None
AUDIO, ALIN = opt('--audio'), opt('--alinhamento')

INI = 0.35          # a voz começa 0,35 s depois do quadro 0 (o quadro 0 é a capa)
FIM = 2.4           # a chamada final (logo + botão + @fazlohospeda) fica 2,4 s parada depois da última palavra
POS_VOZ = 0.3       # o último pulso do botão, 0,3 s depois da última palavra
LPS = 12.15         # letras por segundo na estimativa: 13,5 do perfil −10% (a voz sai com velocidade 0,9)
PONTO = 0.5         # a pausa da voz depois de cada ponto ou interrogação (na estimativa)


def letras(s):
    return len(re.sub(r'[^0-9A-Za-zÀ-ÿ]', '', s))


def tokens_palavras():
    """cada token vira 1 palavra de legenda (o "tela") ou várias (as palavras da "fala")"""
    out, tok = [], 0
    for fi, f in enumerate(R['frases']):
        for t in f['tokens']:
            if 'tela' in t:
                out.append({'frase': fi, 'tok': tok, 'w': t['tela'], 'fala': t['fala'], 'chave': t.get('chave', False), 'id': t.get('id')})
            else:
                ws = t['fala'].split()
                for k, w in enumerate(ws):
                    out.append({'frase': fi, 'tok': tok, 'w': w, 'fala': w, 'chave': t.get('chave', False), 'id': t.get('id') if k == 0 else None})
            tok += 1
    return out


def estimar():
    ws, t = tokens_palavras(), INI
    for fi, f in enumerate(R['frases']):
        for w in [x for x in ws if x['frase'] == fi]:
            d = max(0.16, letras(w['fala']) / LPS)
            w['t0'], w['t1'] = round(t, 3), round(t + d, 3)
            t += d + (PONTO if re.search(r'[.?!]$', w['fala']) else 0.22 if re.search(r'[,:]$', w['fala']) else 0.05)
        t += f.get('respiro', 0)
    return ws


def trechos_de_fala(audio):
    """intervalos de fala do arquivo (−40 dBFS, pausas ≥ 0,22 s)"""
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(float) / 32768
    hop = 160
    rms = np.sqrt(np.convolve(x ** 2, np.ones(400) / 400, 'same'))[::hop]
    on = 20 * np.log10(rms + 1e-9) > -40
    segs, i, n = [], 0, len(on)
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]: j += 1
            segs.append([i * hop / 16000, j * hop / 16000]); i = j
        else: i += 1
    out = []
    for a, b in segs:                                   # junta trechos separados por menos de 0,22 s
        if out and a - out[-1][1] < 0.22: out[-1][1] = b
        else: out.append([a, b])
    return [s for s in out if s[1] - s[0] > 0.08], len(x) / 16000


def pelo_audio(audio):
    """cada trecho de fala do áudio recebe um bloco de palavras que termina em pontuação (vírgula, dois-pontos, ponto,
    interrogação); escolhe os cortes que deixam o ritmo (letras por segundo) mais parecido entre os trechos.
    Dentro do trecho, as palavras dividem o tempo pelo número de letras faladas."""
    import itertools, math
    ws = tokens_palavras()
    segs, dur_audio = trechos_de_fala(audio)
    fins = [i for i, w in enumerate(ws) if re.search(r'[,.:;?!]$', w['fala'])]       # depois destas palavras pode haver pausa
    if fins[-1] != len(ws) - 1: fins.append(len(ws) - 1)
    cand, ns = fins[:-1], len(segs)
    if len(cand) < ns - 1:
        sys.exit(f'o áudio tem {ns} trechos de fala e o roteiro só {len(cand) + 1} blocos com pontuação; confira o arquivo')
    L = [letras(w['fala']) for w in ws]
    melhor = None
    for cortes in itertools.combinations(cand, ns - 1):
        bordas = [-1, *cortes, len(ws) - 1]
        rates = [math.log(sum(L[bordas[k] + 1:bordas[k + 1] + 1]) / (segs[k][1] - segs[k][0])) for k in range(ns)]
        m = sum(rates) / ns
        custo = sum((r - m) ** 2 for r in rates)
        if melhor is None or custo < melhor[0]: melhor = (custo, bordas, rates)
    _, bordas, rates = melhor
    for k in range(ns):
        a, b = segs[k]
        grupo = ws[bordas[k] + 1:bordas[k + 1] + 1]
        tot = sum(letras(w['fala']) for w in grupo); acc = 0
        for w in grupo:
            l = letras(w['fala'])
            w['t0'] = round(a + (b - a) * acc / tot + INI, 3); acc += l
            w['t1'] = round(a + (b - a) * acc / tot + INI, 3)
        print(f'  trecho {k + 1:2d} {a:5.2f}–{b:5.2f} s  {math.exp(rates[k]):4.1f} letras/s  ' + ' '.join(w['fala'] for w in grupo))
    return ws, dur_audio


def pelo_alinhamento(alin, audio):
    """tempos por caractere do ElevenLabs: cada palavra falada recebe o início da 1ª letra e o fim da última letra;
    o texto enviado pode ter a grafia fonética ("Fázlo", "Uátsap"): a correspondência é palavra a palavra, na ordem"""
    d = json.load(open(alin))
    al = d.get('alignment') or d.get('normalized_alignment') or d
    pal, cur = [], None
    for c, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if c.isspace():
            if cur: pal.append(cur); cur = None
            continue
        if cur is None: cur = {'w': '', 't0': a, 't1': b}
        cur['w'] += c
        if c.isalnum(): cur['t1'] = b
    if cur: pal.append(cur)
    ws = tokens_palavras()
    falas = [len(w['fala'].split()) for w in ws]
    if sum(falas) != len(pal):
        sys.exit(f'o alinhamento tem {len(pal)} palavras e o roteiro {sum(falas)}; confira o texto enviado ao ElevenLabs')
    k = 0
    for w, n in zip(ws, falas):
        w['t0'], w['t1'] = round(pal[k]['t0'] + INI, 3), round(pal[k + n - 1]['t1'] + INI, 3); k += n
    dur = None
    if audio:
        dur = trechos_de_fala(audio)[1]
    return ws, dur


def montar(ws, audio):
    """a narração montada: cada frase, o seu respiro, a frase seguinte -> audio/voz-montada.wav; desloca as palavras"""
    import numpy as np
    from scipy.io import wavfile
    SR = 48000
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(float) / 32768
    env = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, 'same'))
    nf, partes, desloc, a0, cortes = int(0.015 * SR), [], 0.0, 0, []
    for fi, f in enumerate(R['frases']):
        pw = [w for w in ws if w['frase'] == fi]
        if fi + 1 < len(R['frases']):
            nx = [w for w in ws if w['frase'] == fi + 1]
            a, b = int((pw[-1]['t1'] - INI) * SR), int((nx[0]['t0'] - INI) * SR)
            cut = a + int(np.argmin(env[a:b])) if b > a else (a + b) // 2
        else:
            cut = len(x)
        seg = x[a0:cut].copy()
        if a0: seg[:nf] *= np.linspace(0, 1, nf)
        if cut < len(x): seg[-nf:] *= np.linspace(1, 0, nf)
        partes += [seg, np.zeros(int(round(f.get('respiro', 0) * SR)))]
        for w in pw:
            w['t0'], w['t1'] = round(w['t0'] + desloc, 3), round(w['t1'] + desloc, 3)
        cortes.append(round(cut / SR, 3))
        desloc += f.get('respiro', 0); a0 = cut
    v = np.concatenate(partes)
    wavfile.write(os.path.join(ROOT, 'audio', 'voz-montada.wav'), SR, np.round(np.clip(v, -1, 1) * 32767).astype(np.int16))
    print(f'  narração montada: cortes em {cortes[:-1]} s do original; respiros somam {desloc:.1f} s -> audio/voz-montada.wav')
    return 'audio/voz-montada.wav'


def main():
    if ALIN:
        ws, dur_audio = pelo_alinhamento(ALIN, AUDIO)
        prov = False
    elif AUDIO:
        ws, dur_audio = pelo_audio(AUDIO)
        prov = False
    else:
        ws, dur_audio, prov = estimar(), None, True
    montada = montar(ws, AUDIO) if AUDIO else None
    fim_voz = max(w['t1'] for w in ws)
    frases = []
    for fi, f in enumerate(R['frases']):
        pw = [w for w in ws if w['frase'] == fi]
        frases.append({'id': f['id'], 't0': pw[0]['t0'], 't1': pw[-1]['t1'], 'respiro': f.get('respiro', 0), 'legenda': f.get('legenda', True), 'palavras': pw})
    logo_t0 = round(fim_voz + POS_VOZ, 3)
    dur = round(fim_voz + FIM, 3)
    out = {'provisoria': prov, 'audio': montada, 'audio_original': os.path.relpath(AUDIO, ROOT) if AUDIO else None, 'inicio_voz': INI, 'fim_voz': round(fim_voz, 3),
           'logo': logo_t0, 'duracao': dur, 'marca': R['marca'], 'frases': frases}
    json.dump(out, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'linha.json {"PROVISÓRIA (locução pendente)" if prov else "pelo áudio"}: voz {INI:.2f}–{fim_voz:.2f} s, duração {dur:.2f} s')
    for f in frases:
        print(f'  {f["id"]:9s} {f["t0"]:6.2f}–{f["t1"]:6.2f}  ' + ' '.join(w['w'] for w in f['palavras']))


if __name__ == '__main__':
    main()
