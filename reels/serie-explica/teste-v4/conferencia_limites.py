#!/usr/bin/env python3
"""
Conferência dos limites de 24/10/2026 (eleven_v4), fora dos episódios: nada é gravado em audio/<id>/ nem em output/.

    python3 teste-v4/conferencia_limites.py     (de reels/serie-explica)  -> teste-v4/conferencia/{sincronia.json, *.mp3}

Gera de novo, no v4, os trechos do teste (mesmos textos e seeds; o v4 não repete o áudio idêntico) e GUARDA o
alinhamento, para medir a sincronia palavra a palavra:
  • antes: o início da palavra pela marcação da API;
  • depois: o início refinado pelo áudio (serie-fala/scripts/linha.py, refina_inicios);
e em cada caso a distância até o início medido no áudio pelo mesmo detector do qa.py da Série Fala (palavras depois
de uma pausa ≥ 0,12 s; janela de −0,15 a +0,20 s; fim do último silêncio de ≥ 30 ms, 26 dB abaixo do nível da voz).
Limite do QA: 80 ms.
"""
import importlib.util
import json
import os
import subprocess
import sys
import numpy as np
from scipy.ndimage import uniform_filter1d

AQUI = os.path.dirname(os.path.abspath(__file__))
EXP = os.path.dirname(AQUI)
FAL = os.path.join(os.path.dirname(EXP), 'serie-fala')
OUT = os.path.join(AQUI, 'conferencia')
os.makedirs(OUT, exist_ok=True)
SR = 44100


def carrega(nome, caminho, ep):
    sys.argv = [caminho, ep]
    sys.path.insert(0, os.path.dirname(caminho))
    spec = importlib.util.spec_from_file_location(nome, caminho)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


VE = carrega('voz_explica', os.path.join(EXP, 'scripts', 'voz.py'), 'explica-02')
VF = carrega('voz_fala', os.path.join(FAL, 'scripts', 'voz.py'), 'fala-01')
LF = carrega('linha_fala', os.path.join(FAL, 'scripts', 'linha.py'), 'fala-01')


def palavras(al):
    out, cur = [], None
    for c, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if c.isspace():
            if cur:
                out.append(cur); cur = None
            continue
        if cur is None:
            cur = {'w': '', 't0': a, 't1': b}
        cur['w'] += c; cur['t1'] = b
    if cur:
        out.append(cur)
    return out


def detector_qa(x, ws):
    """o detector do qa.py da Série Fala: [(palavra, t0, início no áudio)] nas palavras depois de uma pausa ≥ 0,12 s"""
    env = 20 * np.log10(np.sqrt(uniform_filter1d(x ** 2, int(0.01 * SR)) + 1e-12))
    ref = np.percentile(env[env > -80], 95)
    out = []
    for i, w in enumerate(ws):
        if i == 0 or w['t0'] - ws[i - 1]['t1'] < 0.12:
            continue
        a0, a1 = int((w['t0'] - 0.15) * SR), int((w['t0'] + 0.20) * SR)
        seg = env[max(0, a0): a1]; lim = ref - 26
        idx = np.nonzero(seg > lim)[0]
        if not len(idx):
            continue
        q = seg <= lim; fim_q = None; j = len(seg) - 1 - int(0.10 * SR)
        while j >= int(0.03 * SR):
            if q[j - int(0.03 * SR):j + 1].all():
                while j + 1 < len(q) and q[j + 1]:
                    j += 1
                fim_q = j + 1; break
            j -= 1
        t_on = (max(0, a0) + (fim_q if fim_q is not None and fim_q < len(seg) else idx[0])) / SR
        out.append((w['w'], w['t0'], t_on))
    return out


FE = json.load(open(os.path.join(EXP, 'audio', 'explica-02', 'voz', 'falas.json')))['capitulos']
EPE = json.load(open(os.path.join(EXP, 'episodios', 'explica-02.json')))['capitulos']
EPF = json.load(open(os.path.join(FAL, 'episodios', 'fala-01.json')))['cenas']
txt_cap = lambda c: ' '.join(f['texto'] for f in c['fala'])
trechos = [('explica-02-cap02', VE, FE['02']['texto'], txt_cap(EPE[1]), txt_cap(EPE[3]), [FE['02']['seed']]),
           ('explica-02-cap06', VE, FE['06']['texto'], txt_cap(EPE[5]), txt_cap(EPE[7]), [FE['06']['seed']]),
           ('fala-01-cena1', VF, EPF[0]['fala'], None, EPF[1]['fala'], [808, 809]),
           ('fala-01-cena6', VF, EPF[5]['fala'], EPF[4]['fala'], EPF[6]['fala'], [808, 809])]
R = []
for nome, V, texto, prev, nxt, seeds in trechos:
    for s in seeds:
        x, al, fmt, enviado, _ = V.tts(texto, prev, nxt, s)
        x = x.astype(np.float64)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '160k', os.path.join(OUT, f'{nome}-seed{s}.mp3')],
                       input=np.round(np.clip(x, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
        ws = palavras(al)
        antes = detector_qa(x, ws)
        ws2 = [dict(w) for w in ws]
        LF.refina_inicios(ws2, x, SR)
        depois = detector_qa(x, ws2)
        e_a = [round((on - t0) * 1000) for _, t0, on in antes]
        e_d = [round((on - t0) * 1000) for _, t0, on in depois]
        fim_api = max(b for c, b in zip(al['characters'], al['character_end_times_seconds']) if c.isalnum())
        R.append({'trecho': nome, 'seed': s, 'texto': texto, 'alinhamento': al, 'fim_da_fala_api_s': round(fim_api, 3),
                  'fim_da_fala_audio_s': round(VE.fim_da_voz(x), 3), 'audio_s': round(len(x) / SR, 3),
                  'antes_ms': dict(zip([w for w, _, _ in antes], e_a)), 'depois_ms': dict(zip([w for w, _, _ in depois], e_d))})
        pior = lambda e: max(map(abs, e)) if e else 0
        print(f'{nome} seed {s}: antes {e_a} (pior {pior(e_a)} ms, {sum(abs(v) > 80 for v in e_a)} > 80 ms) · depois {e_d} (pior {pior(e_d)} ms, {sum(abs(v) > 80 for v in e_d)} > 80 ms)')
json.dump(R, open(os.path.join(OUT, 'sincronia.json'), 'w'), ensure_ascii=False, indent=1)
print('ok -> teste-v4/conferencia/')
