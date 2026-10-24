#!/usr/bin/env python3
"""
Teste de medição v2 × v4 (23/10/2026), fora dos episódios: NADA é gravado em audio/<id>/ nem em output/.

    python3 teste-v4/teste_v4.py     (de reels/serie-explica)  -> teste-v4/medidas.json + teste-v4/audios/*.mp3

- v4: gera agora, com os geradores novos (voz.py das duas séries: eleven_v4, só estabilidade 0,50 · semelhança 0,75,
  com o dicionário de pronúncia e o contexto dos vizinhos), duas seeds por trecho (a do episódio e a seguinte).
- v2: a geração publicada, lida do falas.json e do wav do episódio (sem chamar a API).
- pronúncia: uma frase com "FAZLO Hospeda" e "WhatsApp", gerada nos dois modelos (v2 com os ajustes antigos, sem o
  dicionário, como era; v4 com o dicionário).
Medidas de cada trecho: ritmo (letras/s), maior pausa interna, pausas acima de 0,6 s, duração da fala, sobra no fim
(áudio depois da última letra), passo da marcação de tempo e, nas palavras depois de uma pausa, a diferença entre a
marcação de tempo e o início medido no áudio (a base da sincronia legenda × voz da Série Fala).
"""
import base64
import importlib.util
import json
import os
import subprocess
import sys
import urllib.request
import numpy as np
from scipy.io import wavfile

AQUI = os.path.dirname(os.path.abspath(__file__))
EXP = os.path.dirname(AQUI)
FAL = os.path.join(os.path.dirname(EXP), 'serie-fala')
AUD = os.path.join(AQUI, 'audios')
os.makedirs(AUD, exist_ok=True)


def carrega(nome, caminho, ep):
    """importa um voz.py como módulo, para o episódio `ep` (só para usar o tts; nada é gerado no episódio)"""
    sys.argv = [caminho, ep]
    sys.path.insert(0, os.path.dirname(caminho))
    spec = importlib.util.spec_from_file_location(nome, caminho)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


VE = carrega('voz_explica', os.path.join(EXP, 'scripts', 'voz.py'), 'explica-02')
VF = carrega('voz_fala', os.path.join(FAL, 'scripts', 'voz.py'), 'fala-01')
SR = 44100


# ---------------------------------------------------------------- medidas
def palavras(al):
    out, cur = [], None
    for c, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if c.isspace():
            if cur:
                out.append(cur); cur = None
            continue
        if cur is None:
            cur = {'w': '', 't0': a, 'fim': None}
        cur['w'] += c
        if c.isalnum():
            cur['fim'] = b
    if cur:
        out.append(cur)
    return [w for w in out if w['fim'] is not None]


def onset_audio(x, t_de, t_ate):
    """início medido no áudio: 1º quadro de 5 ms acima de −38 dBFS (e de 30% do pico local) entre t_de e t_ate"""
    h = int(0.005 * SR); a, b = int(t_de * SR), int(min(len(x) / SR, t_ate) * SR)
    seg = x[a:b]
    if len(seg) < h:
        return None
    e = np.array([np.sqrt(np.mean(seg[i:i + h] ** 2)) for i in range(0, len(seg) - h, h)])
    lim = max(10 ** (-38 / 20), 0.3 * e.max())
    k = np.argmax(e > lim)
    return t_de + k * h / SR if e[k] > lim else None


def mede(x, al, texto):
    ws = palavras(al)
    ini, fim = ws[0]['t0'], ws[-1]['fim']
    letras = sum(c.isalnum() for c in texto)
    gaps = [b['t0'] - a['fim'] for a, b in zip(ws, ws[1:])]
    tempos = np.array(al['character_start_times_seconds'])
    passo = float(np.min(np.diff(np.unique(np.round(tempos, 4))))) if len(tempos) > 2 else 0
    # sincronia: palavras depois de uma pausa ≥ 0,15 s — marcação de tempo × início no áudio
    sinc = []
    for a, b in zip(ws, ws[1:]):
        if b['t0'] - a['fim'] >= 0.15:
            on = onset_audio(x, a['fim'] + 0.03, b['t0'] + 0.25)
            if on is not None:
                sinc.append(round((on - b['t0']) * 1000))
    return {'ritmo_letras_s': round(letras / (fim - ini), 1), 'maior_pausa_s': round(max(gaps) if gaps else 0, 2),
            'pausas_acima_0_6': sum(g > 0.6 for g in gaps), 'fala_s': round(fim - ini, 2), 'audio_s': round(len(x) / SR, 2),
            'sobra_no_fim_s': round(len(x) / SR - fim, 2), 'passo_marcacao_s': round(passo, 3),
            'sinc_ms': sinc, 'sinc_pior_ms': max(map(abs, sinc)) if sinc else None,
            'pausas_s': [round(g, 2) for g in gaps if g > 0.3]}


def wav(path):
    sr, y = wavfile.read(path)
    return y.astype(np.float32) / 32768


def mp3(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '160k', path],
                   input=np.round(np.clip(x, -1, 1) * 32767).astype('<i2').tobytes(), check=True)


def v2_direto(texto, seed):
    """uma geração no v2 com os ajustes antigos, sem o dicionário (só para a frase de pronúncia)"""
    body = {'text': texto, 'model_id': 'eleven_multilingual_v2', 'seed': seed,
            'voice_settings': {'stability': 0.45, 'similarity_boost': 0.80, 'style': 0.30, 'use_speaker_boost': True, 'speed': 1.0}}
    req = urllib.request.Request(VE.API.format(voice=VE.VOICE, fmt='mp3_44100_128'), data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'}, method='POST')
    d = json.load(urllib.request.urlopen(req, timeout=180))
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', '-', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                                     input=base64.b64decode(d['audio_base64']), capture_output=True, check=True).stdout, '<i2').astype(np.float32) / 32768
    return x, d['alignment']


# ---------------------------------------------------------------- os trechos
FE = json.load(open(os.path.join(EXP, 'audio', 'explica-02', 'voz', 'falas.json')))['capitulos']
FF = {f['n']: f for f in json.load(open(os.path.join(FAL, 'audio', 'fala-01', 'voz', 'falas.json')))['falas']}
EPE = json.load(open(os.path.join(EXP, 'episodios', 'explica-02.json')))['capitulos']
EPF = json.load(open(os.path.join(FAL, 'episodios', 'fala-01.json')))['cenas']
txt_cap = lambda c: ' '.join(f['texto'] for f in c['fala'])

trechos = []
for n in (2, 6):                                             # Série Explica: capítulos 02 e 06 do explica-02
    k = f'{n:02d}'
    trechos.append({'id': f'explica-02-cap{k}', 'serie': 'explica', 'texto': FE[k]['texto'], 'seed': FE[k]['seed'],
                    'prev': txt_cap(EPE[n - 1]), 'next': txt_cap(EPE[n + 1]), 'v2_wav': os.path.join(EXP, 'audio', 'explica-02', 'voz', f'cap-{k}.wav'),
                    'v2_al': FE[k]['alinhamento']})
for n in (1, 6):                                             # Série Fala: cena 1 (com pergunta) e cena 6 (WhatsApp) do fala-01
    orig = os.path.join(FAL, 'audio', 'fala-01', 'voz', 'original', f'cena-{n}.wav')
    trechos.append({'id': f'fala-01-cena{n}', 'serie': 'fala', 'texto': EPF[n - 1]['fala'], 'seed': EPF[n - 1].get('seed', 808),
                    'prev': EPF[n - 2]['fala'] if n > 1 else None, 'next': EPF[n]['fala'] if n < len(EPF) else None,
                    'v2_wav': os.path.join(FAL, 'audio', 'fala-01', 'voz', f'cena-{n}.wav'), 'v2_al': FF[n]['alinhamento']})

R = {'v4': {'modelo': VE.MODEL, 'ajustes': VE.SETTINGS}, 'trechos': []}
for t in trechos:
    x2 = wav(t['v2_wav'])
    m2 = mede(x2, t['v2_al'], t['texto'])
    mp3(os.path.join(AUD, f'{t["id"]}-v2.mp3'), x2)
    item = {'id': t['id'], 'texto': t['texto'], 'v2': m2, 'v4': []}
    V = VE if t['serie'] == 'explica' else VF
    for s in (t['seed'], t['seed'] + 1):
        x4, al4, fmt, enviado, _ = V.tts(t['texto'], t['prev'], t['next'], s)
        m4 = mede(x4, al4, t['texto']); m4['seed'] = s; m4['enviado'] = enviado
        item['v4'].append(m4)
        mp3(os.path.join(AUD, f'{t["id"]}-v4-seed{s}.mp3'), x4)
    R['trechos'].append(item)
    print(t['id'], '\n  v2', m2, '\n  v4', *item['v4'], sep='\n    ')

# a frase de pronúncia nos dois modelos
FRASE = 'Conheça o FAZLO Hospeda: a reserva que chega pelo WhatsApp entra no mesmo lugar. Fazlo Hospeda, link na bio.'
x2, al2 = v2_direto(FRASE, 808); mp3(os.path.join(AUD, 'pronuncia-v2.mp3'), x2)
x4, al4, fmt, enviado, _ = VE.tts(FRASE, None, None, 808); mp3(os.path.join(AUD, 'pronuncia-v4.mp3'), x4)
R['pronuncia'] = {'texto': FRASE, 'enviado_v4': enviado, 'v2': mede(x2, al2, FRASE), 'v4': mede(x4, al4, FRASE)}
# o par v2 × v4 de cada trecho num arquivo só (v2, 0,8 s de silêncio, v4 com a seed do episódio)
for t in R['trechos'] + [{'id': 'pronuncia'}]:
    a = os.path.join(AUD, f'{t["id"]}-v2.mp3')
    b = os.path.join(AUD, f'{t["id"]}-v4-seed{t["v4"][0]["seed"]}.mp3') if t['id'] != 'pronuncia' else os.path.join(AUD, 'pronuncia-v4.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a, '-f', 'lavfi', '-t', '0.8', '-i', 'anullsrc=r=44100:cl=mono', '-i', b,
                    '-filter_complex', '[0][1][2]concat=n=3:v=0:a=1', '-b:a', '160k', os.path.join(AUD, f'par-{t["id"]}-v2-v4.mp3')], check=True)
json.dump(R, open(os.path.join(AQUI, 'medidas.json'), 'w'), ensure_ascii=False, indent=1)
print('ok -> teste-v4/medidas.json · teste-v4/audios/')
