#!/usr/bin/env python3
"""
Linha do tempo do vídeo educativo "saldo-checkout".

  python3 scripts/linha.py                      -> linha.json PROVISÓRIA (tempos estimados, locução pendente)
  python3 scripts/linha.py --audio voz.mp3      -> linha.json DEFINITIVA a partir do áudio aprovado (arquivo do ElevenLabs)
  python3 scripts/linha.py --alinhamento al.json --audio voz.mp3
                                                -> idem, usando os tempos por caractere do ElevenLabs (with-timestamps)

Sem alinhamento, o áudio é cortado nas pausas reais (energia abaixo de −40 dBFS por ≥ 0,22 s): cada frase do roteiro
recebe um trecho de fala, e as palavras dentro da frase são distribuídas pelo número de letras faladas.
A legenda mostra "tela" no lugar da "fala" (ex.: "mil trezentos e cinquenta reais" -> "R$ 1.350").
"""
import json, os, re, subprocess, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
args = sys.argv[1:]
opt = lambda k: args[args.index(k) + 1] if k in args else None
AUDIO, ALIN = opt('--audio'), opt('--alinhamento')

INI = 0.35          # a voz começa 0,35 s depois do quadro 0 (a capa fica limpa no 1º quadro)
LOGO = 3.2          # a logo final: últimos 3,2 s
POS_VOZ = 0.7       # respiro entre a última palavra e a entrada da logo
LPS = 14.0          # letras por segundo na estimativa (v4 medido: 7,5–19)


def letras(s):
    return len(re.sub(r'[^0-9A-Za-zÀ-ÿ]', '', s))


def tokens_palavras():
    """cada token vira 1 palavra de legenda (o "tela") ou várias (as palavras da "fala")"""
    out = []
    for fi, f in enumerate(R['frases']):
        for t in f['tokens']:
            if 'tela' in t:
                out.append({'frase': fi, 'w': t['tela'], 'fala': t['fala'], 'chave': t.get('chave', False), 'id': t.get('id')})
            else:
                ws = t['fala'].split()
                for k, w in enumerate(ws):
                    out.append({'frase': fi, 'w': w, 'fala': w, 'chave': t.get('chave', False), 'id': t.get('id') if k == 0 else None})
    return out


def estimar():
    ws, t = tokens_palavras(), INI
    for fi, f in enumerate(R['frases']):
        for w in [x for x in ws if x['frase'] == fi]:
            d = max(0.16, letras(w['fala']) / LPS)
            w['t0'], w['t1'] = round(t, 3), round(t + d, 3)
            t += d + (0.22 if re.search(r'[,:]$', w['fala']) else 0.05)
        t += f['pausa']
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
    ws = tokens_palavras()
    segs, dur_audio = trechos_de_fala(audio)
    nf = len(R['frases'])
    # agrupa os trechos de fala em nf frases: corta nas nf−1 maiores pausas
    gaps = sorted(range(len(segs) - 1), key=lambda k: segs[k + 1][0] - segs[k][1], reverse=True)[:nf - 1]
    cortes = sorted(gaps)
    grupos, a = [], 0
    for c in cortes + [len(segs) - 1]:
        grupos.append(segs[a:c + 1]); a = c + 1
    if len(grupos) != nf:
        sys.exit(f'o áudio tem {len(grupos)} blocos de fala e o roteiro {nf} frases; confira o arquivo')
    for fi, g in enumerate(grupos):
        pw = [w for w in ws if w['frase'] == fi]
        tot = sum(letras(w['fala']) for w in pw)
        fala = sum(b - a for a, b in g)
        acc = 0.0
        def tempo(frac):                                # posição (0..1) da fala da frase -> segundo do áudio
            alvo, s = frac * fala, 0.0
            for a, b in g:
                if s + (b - a) >= alvo: return a + (alvo - s)
                s += b - a
            return g[-1][1]
        for w in pw:
            l = letras(w['fala'])
            w['t0'], w['t1'] = round(tempo(acc / tot) + INI, 3), round(tempo((acc + l) / tot) + INI, 3)
            acc += l
    return ws, dur_audio


def main():
    if AUDIO:
        ws, dur_audio = pelo_audio(AUDIO)
        prov = False
    else:
        ws, dur_audio, prov = estimar(), None, True
    fim_voz = max(w['t1'] for w in ws)
    frases = []
    for fi, f in enumerate(R['frases']):
        pw = [w for w in ws if w['frase'] == fi]
        frases.append({'id': f['id'], 't0': pw[0]['t0'], 't1': pw[-1]['t1'], 'palavras': pw})
    logo_t0 = round(fim_voz + POS_VOZ, 3)
    dur = round(logo_t0 + LOGO, 3)
    out = {'provisoria': prov, 'audio': os.path.relpath(AUDIO, ROOT) if AUDIO else None, 'inicio_voz': INI, 'fim_voz': round(fim_voz, 3),
           'logo': logo_t0, 'duracao': dur, 'marca': R['marca'], 'frases': frases}
    json.dump(out, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'linha.json {"PROVISÓRIA (locução pendente)" if prov else "pelo áudio"}: voz {INI:.2f}–{fim_voz:.2f} s, logo {logo_t0:.2f} s, duração {dur:.2f} s')
    for f in frases:
        print(f'  {f["id"]:9s} {f["t0"]:6.2f}–{f["t1"]:6.2f}  ' + ' '.join(w['w'] for w in f['palavras']))


if __name__ == '__main__':
    main()
