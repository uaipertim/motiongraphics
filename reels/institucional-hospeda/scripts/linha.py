#!/usr/bin/env python3
"""
Linha do tempo do institucional a partir da locução (audio/voz.wav + audio/falas.json do scripts/voz.py).

    python3 scripts/linha.py   -> audio/voz-montada.wav + linha.json (frases, palavras da legenda com tempos, chaves e ids)

- A narração é gerada numa chamada só (a entonação segue de uma frase para a outra). Aqui ela é cortada no silêncio entre
  as frases e recebe, depois de cada frase, a pausa do roteiro ("pausa_depois"): é a pausa para entender a tela.
  O corte cai no ponto mais baixo do silêncio entre a última palavra de uma frase e a primeira da seguinte, com
  fades de 15 ms; a voz em si não é acelerada nem cortada.
- Tempos de cada palavra: a marcação por caractere do ElevenLabs (with-timestamps), já na grafia oficial (o realinhamento
  do pronuncia.py). O início de cada palavra que vem depois de uma pausa (≥ 0,12 s) é medido no áudio, como na Série
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
        if abs(t_on - w['t0']) > 0.02 and ws[i - 1]['t1'] < t_on < w['t1'] - 0.03:
            mudou.append((w['w'], w['t0'], t_on)); w['t0'] = t_on
    for f in frases:
        f['t0'] = f['palavras'][0]['t0']
    return mudou


def main():
    sr, y = wavfile.read(os.path.join(ROOT, 'audio', 'voz.wav'))
    y = y.astype(np.float64) / 32768
    env = 20 * np.log10(np.sqrt(uniform_filter1d(y ** 2, int(0.01 * sr)) + 1e-12))
    ws = palavras_al(F['alinhamento'])
    fim = F['fim_da_fala_s']
    for w in ws:
        w['t1'] = min(w['t1'], fim)
    mudou = refina_inicios(ws, env, sr)
    # cada palavra do roteiro (token a token) recebe a palavra correspondente da locução
    k, grupos = 0, []
    for f in R['frases']:
        pw = []
        for t in f['tokens']:
            for j, wd in enumerate(t['fala'].split()):
                a = ws[k]
                assert a['w'] == wd, f'a locução e o roteiro divergem: "{a["w"]}" × "{wd}"'
                pw.append((a, {'w': wd, 'chave': bool(t.get('chave')), 'id': t.get('id') if j == 0 else None}))
                k += 1
        grupos.append((f, pw))
    assert k == len(ws)
    # cortes: o ponto mais baixo do silêncio entre as frases
    cortes = []
    for (f, pw), (_, nx) in zip(grupos, grupos[1:]):
        a, b = int(pw[-1][0]['t1'] * sr), int(nx[0][0]['t0'] * sr)
        assert b > a, f'sem silêncio entre "{pw[-1][1]["w"]}" e "{nx[0][1]["w"]}"'
        cortes.append((a + int(np.argmin(env[a:b]))) / sr)
    # a montagem: cada frase, a sua pausa, a frase seguinte
    lim = [0.0] + cortes + [len(y) / sr]
    partes, frases, desloc, rel = [], [], 0.0, []
    nf = int(FADE * sr)
    for i, (f, pw) in enumerate(grupos):
        s = y[int(lim[i] * sr): int(lim[i + 1] * sr)].copy()
        if i:
            s[:nf] *= np.linspace(0, 1, nf)
        if i < len(grupos) - 1:
            s[-nf:] *= np.linspace(1, 0, nf)
        partes += [s, np.zeros(int(round(f['pausa_depois'] * sr)))]
        out = [{**m, 't0': round(a['t0'] + desloc + INI, 3), 't1': round(a['t1'] + desloc + INI, 3)} for a, m in pw]
        frases.append({'id': f['id'], 't0': out[0]['t0'], 't1': out[-1]['t1'], 'pausa_depois': f['pausa_depois'], 'palavras': out})
        rel.append((lim[i], desloc))
        desloc += f['pausa_depois']
    v = np.concatenate(partes)
    mudou2 = refina_montada(frases, v, sr)
    wavfile.write(os.path.join(ROOT, 'audio', 'voz-montada.wav'), sr, np.round(np.clip(v, -1, 1) * 32767).astype(np.int16))
    shift = lambda t: t + [d for l0, d in rel if l0 <= t][-1]
    fim_voz = round(shift(fim) + INI, 3)
    logo = round(fim_voz + POS_VOZ, 3)
    out = {'provisoria': False, 'audio': 'audio/voz-montada.wav', 'inicio_voz': INI, 'fim_voz': fim_voz, 'logo': logo, 'duracao': round(logo + LOGO, 3),
           'marca': R['marca'], 'cortes_s': [round(c, 3) for c in cortes], 'frases': frases,
           'inicios_medidos_no_audio': [{'palavra': w, 'marcacao_s': round(shift(a) + INI, 3), 'audio_s': round(shift(b) + INI, 3)} for w, a, b in mudou],
           'inicios_acertados_na_montagem': [{'palavra': w, 'antes_s': a, 'audio_s': b} for w, a, b in mudou2]}
    json.dump(out, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'linha.json: voz {INI:.2f}–{fim_voz:.2f} s, logo {logo:.2f} s, duração {out["duracao"]:.2f} s')
    for f in frases:
        print(f'  {f["id"]:10s} {f["t0"]:6.2f}–{f["t1"]:6.2f} (+{f["pausa_depois"]:.1f})  ' + ' '.join(w['w'] for w in f['palavras']))
    print(f'  {len(mudou)} inícios medidos no áudio; {len(mudou2)} acertados de novo no áudio montado: ' + ', '.join(f'{w} {(b - a) * 1000:+.0f} ms' for w, a, b in mudou2))


if __name__ == '__main__':
    main()
