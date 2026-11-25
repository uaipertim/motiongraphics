#!/usr/bin/env python3
"""
A pergunta do começo, com entonação de pergunta (correção pedida em 25/11/2026).

    python3 scripts/pergunta.py candidatas -> audio/pergunta/candidatas/*.mp3 + res.json (5 jeitos de escrever × 3 seeds, medidos)
    python3 scripts/pergunta.py tomadas    -> audio/pergunta/tomada-1..3.wav/.mp3 + tomadas.json (as 3 seeds do texto escolhido)
    python3 scripts/pergunta.py montar N   -> audio/voz.wav + audio/falas.json com a tomada N no lugar da pergunta antiga

Só a pergunta é gerada de novo (Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75; seeds 7101, 7102 e 7103), escrita como
alguém perguntando e com o ponto de interrogação. Primeiro testei 5 jeitos de escrever (CANDIDATAS). Os que terminam em
"pessoas?" ou "pra dois?" depois de vírgula caem no fim (sobem na sílaba forte e descem: soa como afirmação). Com a pergunta
partida em duas ("…de Dezembro? Pra dois?"), as 3 seeds sobem no fim. Esse é o texto das 3 tomadas. O resto da locução é a tomada única de antes (seed 7100), guardada em
audio/voz-tomada-unica.wav e audio/falas-tomada-unica.json: dela ficam "Chegou pelo WhatsApp:" e tudo de "Desafio:" até
"em segundos." (a frase "E no começo, a FAZLO configura tudo com você." saiu: regra nova da série, seção "Fecho").
A subida no fim é medida: frequência fundamental (autocorrelação) da última sílaba falada × a do trecho logo antes, em semitons.
"""
import base64, json, os, shutil, subprocess, sys, urllib.request
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
DIR = os.path.join(ROOT, 'audio', 'pergunta'); os.makedirs(DIR, exist_ok=True)
TEXTO_TELA = 'Oi! Tem vaga de 12 a 14 de Dezembro? Pra 2?'
TEXTO_VOZ = 'Oi! Tem vaga de doze a catorze de Dezembro? Pra dois?'
CANDIDATAS = {'A': 'Oi! Tem vaga de doze a catorze de Dezembro, pra duas pessoas?', 'C': 'Oi, tudo bem? Tem vaga de doze a catorze de Dezembro, pra duas pessoas?',
              'E': TEXTO_VOZ, 'G': 'Oi! Será que tem vaga de doze a catorze de Dezembro, pra dois?', 'H': 'Oi! Tem vaga de doze a catorze de Dezembro, pra dois?'}
SEEDS, SR = [7101, 7102, 7103], 44100
API = 'https://api.elevenlabs.io/v1/text-to-speech/{v}/with-timestamps?output_format=mp3_44100_192'


def palavras(al):
    out, cur = [], None
    for c, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if c.isspace():
            if cur: out.append(cur); cur = None
            continue
        if cur is None: cur = {'w': '', 't0': a, 't1': b}
        cur['w'] += c
        if c.isalnum(): cur['t1'] = b
    if cur: out.append(cur)
    return out


def f0(x, t0, t1):                                   # frequência fundamental (Hz) por autocorrelação, em quadros de 40 ms
    out = []
    for a in np.arange(t0, t1 - 0.04, 0.01):
        q = x[int(a * SR): int((a + 0.04) * SR)]; q = q - q.mean()
        if np.sqrt((q ** 2).mean()) < 0.02: continue
        ac = np.correlate(q, q, 'full')[len(q) - 1:]; ac /= ac[0] + 1e-12
        lo, hi = int(SR / 400), int(SR / 90); k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.5: out.append(SR / k)
    return np.array(out)


def tomadas(textos=None, pasta=None):
    voz = R['voz']; res = []
    lista = [(f'tomada-{i}', TEXTO_VOZ, seed) for i, seed in enumerate(SEEDS, 1)] if not textos else [(f'{k}-{seed}', t, seed) for k, t in textos.items() for seed in SEEDS]
    for i, (nome, texto, seed) in enumerate(lista, 1):
        body = {'text': texto, 'model_id': voz['modelo'], 'voice_settings': {'stability': voz['stability'], 'similarity_boost': voz['similarity_boost']}, 'seed': seed}
        req = urllib.request.Request(API.format(v=voz['voice_id']), data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'}, method='POST')
        d = json.load(urllib.request.urlopen(req, timeout=180)); raw = base64.b64decode(d['audio_base64'])
        mp3 = os.path.join(pasta or DIR, f'{nome}.mp3'); open(mp3, 'wb').write(raw)
        x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', mp3, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout, '<i2').astype(np.float32) / 32768
        if not textos: wavfile.write(os.path.join(DIR, f'{nome}.wav'), SR, np.round(x * 32767).astype(np.int16))
        ws = palavras(d['alignment']); ult = ws[-1]
        fim = f0(x, ult['t0'] + (ult['t1'] - ult['t0']) * 0.5, ult['t1'] + 0.04)      # a metade final de "dois"
        antes = f0(x, ws[-2]['t0'], ws[-2]['t1'])                                    # "Pra"
        sub = 12 * np.log2(np.median(fim) / np.median(antes)) if len(fim) and len(antes) else float('nan')
        res.append({'tomada': i, 'nome': nome, 'texto': texto, 'seed': seed, 'duracao_s': round(len(x) / SR, 2), 'palavras': [{'w': w['w'], 't0': round(w['t0'], 3), 't1': round(w['t1'], 3)} for w in ws],
                    'f0_fim_hz': round(float(np.median(fim)), 1) if len(fim) else None, 'f0_antes_hz': round(float(np.median(antes)), 1) if len(antes) else None,
                    'subida_semitons': round(float(sub), 2), 'f0_fim_max_hz': round(float(fim.max()), 1) if len(fim) else None})
        print(f"{nome} (seed {seed}): subida no fim {sub:+.2f} semitons · {res[-1]['f0_antes_hz']} → {res[-1]['f0_fim_hz']} Hz")
    json.dump({'texto_tela': TEXTO_TELA, 'texto_voz': TEXTO_VOZ, 'medida': 'f0 da metade final da última palavra × f0 da palavra anterior, em semitons', 'tomadas': res},
              open(os.path.join(pasta or DIR, 'res.json' if textos else 'tomadas.json'), 'w'), ensure_ascii=False, indent=1)


def montar(n):
    T = json.load(open(os.path.join(DIR, 'tomadas.json')))['tomadas'][n - 1]
    orig_w, orig_f = os.path.join(ROOT, 'audio', 'voz-tomada-unica.wav'), os.path.join(ROOT, 'audio', 'falas-tomada-unica.json')
    if not os.path.exists(orig_w): shutil.copy(os.path.join(ROOT, 'audio', 'voz.wav'), orig_w); shutil.copy(os.path.join(ROOT, 'audio', 'falas.json'), orig_f)
    sr, y = wavfile.read(orig_w); y = y.astype(np.float32) / 32768; F = json.load(open(orig_f)); ws = F['palavras']
    _, q = wavfile.read(os.path.join(DIR, f'tomada-{n}.wav')); q = q.astype(np.float32) / 32768
    iw = next(i for i, w in enumerate(ws) if w['w'] == 'WhatsApp:'); idz = next(i for i, w in enumerate(ws) if w['w'] == 'Desafio:')
    ise = next(i for i, w in enumerate(ws) if w['w'] == 'segundos.')
    fade = lambda a: (a.__setitem__(slice(0, 441), a[:441] * np.linspace(0, 1, 441)), a.__setitem__(slice(-441, None), a[-441:] * np.linspace(1, 0, 441)), a)[-1]
    a = y[: int((ws[iw]['t1'] + 0.12) * sr)].copy()                            # "Chegou pelo WhatsApp:"
    p0, p1 = T['palavras'][0]['t0'] - 0.04, T['palavras'][-1]['t1'] + 0.14         # a pergunta nova
    b = q[int(max(0, p0) * sr): int(min(len(q) / sr, p1) * sr)].copy()
    c0, c1 = ws[idz]['t0'] - 0.06, ws[ise]['t1'] + 0.15                           # de "Desafio:" até "em segundos."
    c = y[int(c0 * sr): int(c1 * sr)].copy()
    g1, g2 = 0.40, 0.60                                                         # silêncio antes e depois da pergunta
    v = np.concatenate([fade(a), np.zeros(int(g1 * sr)), fade(b), np.zeros(int(g2 * sr)), fade(c)])
    wavfile.write(os.path.join(ROOT, 'audio', 'voz.wav'), sr, np.round(np.clip(v, -1, 1) * 32767).astype(np.int16))
    tb, tc = len(a) / sr + g1 - p0, len(a) / sr + g1 + len(b) / sr + g2 - c0
    ofi = TEXTO_TELA.split()
    nova = [{'w': o, 'falado': w['w'], 't0': round(w['t0'] + tb, 3), 't1': round(w['t1'] + tb, 3), 'tomada_pergunta': n} for o, w in zip(ofi, T['palavras'])]
    assert len(ofi) == len(T['palavras'])
    resto = [{**w, 't0': round(w['t0'] + tc - 0, 3), 't1': round(w['t1'] + tc, 3)} for w in ws[idz: ise + 1]]
    pal = ws[: iw + 1] + nova + resto
    texto = ' '.join(w['w'] for w in pal)
    F2 = {**F, 'texto': texto, 'enviado': None, 'palavras': pal, 'fim_da_fala_s': round(pal[-1]['t1'] + 0.05, 3), 'duracao_audio': round(len(v) / sr, 3),
          'montagem': {'tomada_unica_seed': F['seed'], 'pergunta': {'tomada': n, 'seed': T['seed'], 'texto_voz': TEXTO_VOZ, 'subida_semitons': T['subida_semitons']},
                       'tirado': 'E no começo, a FAZLO configura tudo com você.'}}
    json.dump(F2, open(os.path.join(ROOT, 'audio', 'falas.json'), 'w'), ensure_ascii=False, indent=1)
    print('montado:', texto)


if __name__ == '__main__':
    if sys.argv[1] == 'candidatas': os.makedirs(os.path.join(DIR, 'candidatas'), exist_ok=True); tomadas(CANDIDATAS, os.path.join(DIR, 'candidatas'))
    elif sys.argv[1] == 'tomadas': tomadas()
    else: montar(int(sys.argv[2]))
