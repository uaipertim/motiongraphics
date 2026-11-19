#!/usr/bin/env python3
"""
Linha do tempo da apresentação a partir da locução (audio/voz.wav + audio/falas.json do scripts/voz.py).

    python3 scripts/linha.py   -> audio/voz-montada.wav + linha.json (frases, palavras da legenda com tempos, chaves e ids)

- A narração é gerada numa chamada só (a entonação segue de uma frase para a outra). Aqui ela é cortada no silêncio entre
  as frases e recebe, depois de cada frase, a pausa do roteiro ("pausa_depois"): é a pausa para entender a tela.
  O corte cai no ponto mais baixo do silêncio entre a última palavra de uma frase e a primeira da seguinte, com
  fades de 15 ms; a voz em si não é acelerada nem cortada.
- Tempos de cada palavra: a marcação do ElevenLabs (with-timestamps), já juntada nas palavras da grafia oficial pelo
  voz.py (falas.json → "palavras"; "R$ 99,90" é uma palavra só, com o tempo do valor falado por extenso). O início de cada palavra que vem depois de uma pausa (≥ 0,12 s) é medido no áudio, como na Série
  Fala. Nenhuma palavra passa do fim real da voz (−40 dBFS).
- Depois da montagem, os inícios das palavras que vêm depois de pausa são medidos de novo no áudio montado, com o
  mesmo detector do qa.py (fim do último silêncio de ≥ 30 ms, 26 dB abaixo do nível da voz, de 0,15 s antes a 0,20 s
  depois da marcação).
- A voz entra 0,35 s depois do quadro 0; a logo entra 1,0 s depois da última palavra (a última página da legenda fica
  1,5 s na tela) e fica 3,2 s.
"""
import json
import os
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
F = json.load(open(os.path.join(ROOT, 'audio', 'falas.json')))
INI, POS_VOZ, LOGO, PAUSA_REFINA, FADE = 0.35, 1.0, 3.2, 0.12, 0.015


def palavras_al(al):
    out, cur = [], None
    for c, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if c.isspace():
            if cur:
                out.append(cur); cur = None
            continue
        if cur is None:
            cur = {'w': '', 't0': a, 't1': b}
        cur['w'] += c
        if c.isalnum():
            cur['t1'] = b
    if cur:
        out.append(cur)
    return out


def unidades(texto):
    """as palavras da grafia oficial: "R$" fica junto do valor (como no voz.py)"""
    out = []
    for w in texto.split():
        if out and out[-1] == 'R$':
            out[-1] += ' ' + w
        else:
            out.append(w)
    return out


def refina_inicios(ws, env, sr):
    """o mesmo detector do serie-fala/scripts/linha.py: [(palavra, marcação, áudio)] das palavras refinadas"""
    lim = np.percentile(env[env > -80], 95) - 26
    q30, mudou = int(0.03 * sr), []
    for i in range(1, len(ws)):
        w, ant = ws[i], ws[i - 1]
        if w['t0'] - ant['t1'] < PAUSA_REFINA:
            continue
        a0 = max(int((ant['t0'] + 0.05) * sr), int((w['t0'] - 0.40) * sr))
        a1 = min(len(env), int((w['t0'] + 0.20) * sr))
        q = env[a0:a1] <= lim
        j, fim_q = len(q) - 1 - int(0.10 * sr), None
        while j >= q30:
            if q[j - q30:j + 1].all():
                while j + 1 < len(q) and q[j + 1]:
                    j += 1
                fim_q = j + 1; break
            j -= 1
        if fim_q is None or fim_q >= len(q):
            continue
        t_on = (a0 + fim_q) / sr
        if ant['t0'] + 0.05 < t_on < w['t1'] - 0.03:
            mudou.append((w['w'], round(w['t0'], 3), round(t_on, 3)))
            w['t0'] = t_on
    return mudou


def refina_montada(frases, v, sr):
    """o detector do qa.py, no áudio montado: [(palavra, antes, depois)]"""
    env = 20 * np.log10(np.sqrt(uniform_filter1d(v ** 2, int(0.01 * sr)) + 1e-12))
    lim = np.percentile(env[env > -80], 95) - 26
    ws = [w for f in frases for w in f['palavras']]
    q30, mudou = int(0.03 * sr), []
    for i, w in enumerate(ws):
        if i == 0 or w['t0'] - ws[i - 1]['t1'] < PAUSA_REFINA:
            continue
        a0, a1 = int((w['t0'] - INI - 0.15) * sr), int((w['t0'] - INI + 0.20) * sr)
        seg = env[max(0, a0):a1]; q = seg <= lim; fim_q = None; j = len(seg) - 1 - int(0.10 * sr)
        while j >= q30:
            if q[j - q30:j + 1].all():
                while j + 1 < len(q) and q[j + 1]:
                    j += 1
                fim_q = j + 1; break
            j -= 1
        if fim_q is None or fim_q >= len(seg):
            continue
        t_on = round((max(0, a0) + fim_q) / sr + INI, 3)
        # palavras curtas ("o", "e"): a marcação da API pode vir adiantada nela e na seguinte; a palavra vai para o
        # início medido e as seguintes andam junto, se preciso, mantendo a ordem (≥ 60 ms entre os inícios)
        if abs(t_on - w['t0']) > 0.02 and ws[i - 1]['t1'] < t_on < w['t0'] + 0.25:
            mudou.append((w['w'], w['t0'], t_on)); w['t0'] = t_on; w['t1'] = round(max(w['t1'], t_on + 0.06), 3)
            for j in range(i + 1, len(ws)):
                if ws[j]['t0'] >= ws[j - 1]['t0'] + 0.06:
                    break
                ws[j]['t0'] = round(ws[j - 1]['t0'] + 0.06, 3); ws[j]['t1'] = round(max(ws[j]['t1'], ws[j]['t0'] + 0.06), 3)
    for f in frases:
        f['t0'] = f['palavras'][0]['t0']
    return mudou


TOMADAS = {'principal': ('voz.wav', 'falas.json'), 'canais': ('voz-canais.wav', 'falas-canais.json')}
MARGEM = 0.20      # na tomada própria (canais): voz antes da 1ª palavra e depois da última que entra na montagem


def main():
    so_principal = os.environ.get('LINHA_SO_PRINCIPAL') == '1'      # para conferir que a montagem antiga não mudou
    frases_r = [f for f in R['frases'] if not (so_principal and f.get('tomada', 'principal') != 'principal')]
    usadas = sorted({f.get('tomada', 'principal') for f in frases_r})
    T = {}
    for nome in usadas:
        wav, js = TOMADAS[nome]
        sr, y = wavfile.read(os.path.join(ROOT, 'audio', wav))
        y = y.astype(np.float64) / 32768
        Fj = F if nome == 'principal' else json.load(open(os.path.join(ROOT, 'audio', js)))
        env = 20 * np.log10(np.sqrt(uniform_filter1d(y ** 2, int(0.01 * sr)) + 1e-12))
        ws = [dict(w) for w in Fj['palavras']]
        fim = Fj['fim_da_fala_s']
        for w in ws:
            w['t1'] = min(w['t1'], fim)
        T[nome] = {'y': y, 'sr': sr, 'env': env, 'ws': ws, 'fim': fim, 'k': 0, 'mudou': refina_inicios(ws, env, sr)}
    srs = {t['sr'] for t in T.values()}
    assert len(srs) == 1, 'as tomadas têm taxas de amostragem diferentes'
    sr = srs.pop()
    # o nível: a tomada própria fica no mesmo nível de voz da principal (RMS dos trechos com fala, acima de −40 dBFS)
    def nivel(t):
        h = int(0.01 * sr); n = len(t['y']) // h
        r = np.sqrt((t['y'][:n * h].reshape(n, h) ** 2).mean(axis=1)); r = r[r > 10 ** (-40 / 20)]
        return float(np.sqrt((r ** 2).mean()))
    if 'principal' in T:
        for nome, t in T.items():
            t['ganho'] = nivel(T['principal']) / nivel(t) if nome != 'principal' else 1.0
    # cada palavra do roteiro (token a token) recebe a palavra correspondente da sua tomada
    grupos = []
    for f in frases_r:
        t = T[f.get('tomada', 'principal')]
        pw = []
        for tk in f['tokens']:
            for j, wd in enumerate(unidades(tk['fala'])):
                a = t['ws'][t['k']]
                assert a['w'] == wd, f'a locução e o roteiro divergem: "{a["w"]}" × "{wd}"'
                pw.append((a, {'w': wd, 'chave': bool(tk.get('chave')), 'id': tk.get('id') if j == 0 else None}))
                t['k'] += 1
        grupos.append((f, pw))
    for nome, t in T.items():
        assert t['k'] == len(t['ws']), f'{nome}: sobraram palavras da locução'
    # cortes: o ponto mais baixo do silêncio entre frases seguidas da MESMA tomada; nas pontas da tomada própria,
    # a voz da 1ª à última palavra com MARGEM (a principal começa em 0 e vai até o fim do arquivo, como antes)
    lim = []
    for nome, t in T.items():
        idx = [i for i, (f, _) in enumerate(grupos) if f.get('tomada', 'principal') == nome]
        cortes = []
        for i, j in zip(idx, idx[1:]):
            pa, pb = grupos[i][1], grupos[j][1]
            a, b = int(pa[-1][0]['t1'] * sr), int(pb[0][0]['t0'] * sr)
            assert b > a, f'sem silêncio entre "{pa[-1][1]["w"]}" e "{pb[0][1]["w"]}"'
            cortes.append((a + int(np.argmin(t['env'][a:b]))) / sr)
        t['cortes'] = cortes
        ini = 0.0 if nome == 'principal' else max(0.0, grupos[idx[0]][1][0][0]['t0'] - MARGEM)
        fim = len(t['y']) / sr if nome == 'principal' else min(len(t['y']) / sr, t['fim'] + MARGEM)
        bordas = [ini] + cortes + [fim]
        for n_, i in enumerate(idx):
            lim.append((i, bordas[n_], bordas[n_ + 1]))
    lim = [(a, b) for _, a, b in sorted(lim)]
    # a montagem: cada frase (da sua tomada), a sua pausa, a frase seguinte
    partes, frases, pos, segs = [], [], 0.0, []
    nf = int(FADE * sr)
    for i, (f, pw) in enumerate(grupos):
        t = T[f.get('tomada', 'principal')]
        a0, a1 = lim[i]
        s = t['y'][int(a0 * sr): int(a1 * sr)].copy() * t.get('ganho', 1.0)
        if i:
            s[:nf] *= np.linspace(0, 1, nf)
        if i < len(grupos) - 1:
            s[-nf:] *= np.linspace(1, 0, nf)
        # a posição exata (em amostras) onde o trecho entra na montagem
        ini_s = sum(len(x) for x in partes) / sr
        desloc = ini_s - a0
        partes += [s, np.zeros(int(round(f['pausa_depois'] * sr)))]
        out = [{**m, 't0': round(a['t0'] + desloc + INI, 3), 't1': round(a['t1'] + desloc + INI, 3)} for a, m in pw]
        frases.append({'id': f['id'], **({'tomada': f['tomada']} if f.get('tomada') else {}), 't0': out[0]['t0'], 't1': out[-1]['t1'],
                       'pausa_depois': f['pausa_depois'], 'palavras': out})
        segs.append((f.get('tomada', 'principal'), a0, a1, desloc))
    v = np.concatenate(partes)
    mudou2 = refina_montada(frases, v, sr)
    wavfile.write(os.path.join(ROOT, 'audio', 'voz-montada.wav'), sr, np.round(np.clip(v, -1, 1) * 32767).astype(np.int16))
    def shift(nome, x):
        for tom, a0, a1, d in segs:
            if tom == nome and a0 <= x < a1:
                return x + d
        return x + [d for tom, a0, a1, d in segs if tom == nome][-1]
    ult = grupos[-1][0].get('tomada', 'principal')
    fim_voz = round(shift(ult, T[ult]['fim']) + INI, 3)
    logo = round(fim_voz + POS_VOZ, 3)
    out = {'provisoria': False, 'audio': 'audio/voz-montada.wav', 'inicio_voz': INI, 'fim_voz': fim_voz, 'logo': logo, 'duracao': round(logo + LOGO, 3),
           'marca': R['marca'], 'tomadas': {n: {'arquivo': 'audio/' + TOMADAS[n][0], 'ganho_db': round(20 * np.log10(t.get('ganho', 1.0)), 2), 'cortes_s': [round(c, 3) for c in t['cortes']]} for n, t in T.items()},
           'cortes_s': [round(c, 3) for c in T['principal']['cortes']], 'frases': frases,
           'inicios_medidos_no_audio': [{'palavra': w, **({'tomada': n} if n != 'principal' else {}), 'marcacao_s': round(shift(n, a) + INI, 3), 'audio_s': round(shift(n, b) + INI, 3)}
                                        for n, t in T.items() for w, a, b in t['mudou']],
           'inicios_acertados_na_montagem': [{'palavra': w, 'antes_s': a, 'audio_s': b} for w, a, b in mudou2]}
    if so_principal:
        out.pop('tomadas')
    destino = os.environ.get('LINHA_SAIDA', os.path.join(ROOT, 'linha.json'))
    json.dump(out, open(destino, 'w'), ensure_ascii=False, indent=1)
    print(f'{os.path.basename(destino)}: voz {INI:.2f}–{fim_voz:.2f} s, logo {logo:.2f} s, duração {out["duracao"]:.2f} s')
    for f in frases:
        print(f'  {f["id"]:10s} {f["t0"]:6.2f}–{f["t1"]:6.2f} (+{f["pausa_depois"]:.1f})  ' + ' '.join(w['w'] for w in f['palavras']))
    print(f'  {sum(len(t["mudou"]) for t in T.values())} inícios medidos no áudio; {len(mudou2)} acertados de novo no áudio montado: ' + ', '.join(f'{w} {(b - a) * 1000:+.0f} ms' for w, a, b in mudou2))


if __name__ == '__main__':
    main()
