#!/usr/bin/env python3
"""
Linha do tempo do educativo "reserva-whatsapp" a partir da locução (audio/voz.wav + audio/falas.json do scripts/voz.py).

    python3 scripts/linha.py   -> linha.json (frases, palavras da legenda com tempos, chaves e ids da animação)

- Tempos de cada palavra: a marcação por caractere do ElevenLabs (with-timestamps), já na grafia oficial (o realinhamento
  do pronuncia.py: a API ouviu "Uátsap", a legenda mostra "WhatsApp").
- O início de cada palavra que vem depois de uma pausa (≥ 0,12 s) é medido no áudio, como na Série Fala (fim do último
  silêncio de ≥ 30 ms, 26 dB abaixo do nível da voz, antes da palavra). Nenhuma palavra passa do fim real da voz (−40 dBFS).
- A voz entra 0,35 s depois do quadro 0 (a capa fica limpa); a logo entra 0,7 s depois da última palavra e fica 3,2 s.
"""
import json
import os
import re
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
F = json.load(open(os.path.join(ROOT, 'audio', 'falas.json')))
INI, POS_VOZ, LOGO, PAUSA_REFINA = 0.35, 0.7, 3.2, 0.12


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


def refina_inicios(ws, y, sr):
    """o mesmo detector do serie-fala/scripts/linha.py: [(palavra, marcação, áudio)] das palavras refinadas"""
    env = 20 * np.log10(np.sqrt(uniform_filter1d(y.astype(np.float64) ** 2, int(0.01 * sr)) + 1e-12))
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


def main():
    sr, y = wavfile.read(os.path.join(ROOT, 'audio', 'voz.wav'))
    y = y.astype(np.float64) / 32768
    ws = palavras_al(F['alinhamento'])
    fim = F['fim_da_fala_s']
    for w in ws:
        w['t1'] = min(w['t1'], fim)
    mudou = refina_inicios(ws, y, sr)
    # cada palavra do roteiro (token a token) recebe o tempo da palavra correspondente da locução
    k, frases = 0, []
    for f in R['frases']:
        pw = []
        for t in f['tokens']:
            for j, wd in enumerate(t['fala'].split()):
                a = ws[k]
                assert a['w'] == wd, f'a locução e o roteiro divergem: "{a["w"]}" × "{wd}"'
                pw.append({'w': wd, 'chave': bool(t.get('chave')), 'id': t.get('id') if j == 0 else None,
                           't0': round(a['t0'] + INI, 3), 't1': round(a['t1'] + INI, 3)})
                k += 1
        frases.append({'id': f['id'], 't0': pw[0]['t0'], 't1': pw[-1]['t1'], 'palavras': pw})
    assert k == len(ws)
    fim_voz = round(fim + INI, 3)
    logo = round(fim_voz + POS_VOZ, 3)
    out = {'provisoria': False, 'audio': 'audio/voz.wav', 'inicio_voz': INI, 'fim_voz': fim_voz, 'logo': logo, 'duracao': round(logo + LOGO, 3),
           'marca': R['marca'], 'exemplo': R['exemplo'], 'frases': frases,
           'inicios_medidos_no_audio': [{'palavra': w, 'marcacao_s': round(a + INI, 3), 'audio_s': round(b + INI, 3)} for w, a, b in mudou]}
    json.dump(out, open(os.path.join(ROOT, 'linha.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'linha.json: voz {INI:.2f}–{fim_voz:.2f} s, logo {logo:.2f} s, duração {out["duracao"]:.2f} s')
    for f in frases:
        print(f'  {f["id"]:10s} {f["t0"]:6.2f}–{f["t1"]:6.2f}  ' + ' '.join(w['w'] for w in f['palavras']))
    for w, a, b in mudou:
        print(f'  "{w}": início medido no áudio {b + INI:.3f} s (marcação {a + INI:.3f} s, {(b - a) * 1000:+.0f} ms)')


if __name__ == '__main__':
    main()
