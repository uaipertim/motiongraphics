#!/usr/bin/env python3
"""
Narração de um episódio da SÉRIE FALA — ElevenLabs, endpoint com marcação de tempo (with-timestamps).

    python3 scripts/voz.py fala-01              -> audio/fala-01/voz/cena-N.wav + falas.json
    python3 scripts/voz.py fala-01 --so 3,4     -> refaz só as cenas 3 e 4 (índices a partir de 1)
    python3 scripts/voz.py fala-01 --medir      -> só refaz a conferência (sem chamar a API)

Cada fala do JSON (cenas[].fala) é gerada numa chamada própria, com as falas vizinhas como contexto
(previous_text / next_text) para a entonação seguir de uma cena para a outra. A API devolve o tempo de cada
caractere; scripts/linha.py transforma isso nos tempos de cena e de palavra do vídeo.

Voz: Raquel - For Conversational (GDzHdQOi6jjf8zaXhCYD), a voz oficial da FAZLO (a mesma da versão com voz do
Reel 08 e do institucional). Modelo eleven_multilingual_v2; estabilidade 0,40 · semelhança 0,80 · estilo 0,35 ·
speaker boost ligado · velocidade 1,0 (a voz nunca é acelerada): tom de conversa, não de locutor.

A chave da API NÃO fica no repositório nem é impressa: nesta nuvem ela é posta no cabeçalho xi-api-key pela
própria rede (Segredos de rede); fora dela, defina ELEVENLABS_API_KEY no ambiente.
"""
import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'fala-01'
OUT = os.path.join(ROOT, 'audio', EP, 'voz')
API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format={fmt}'
VOICE = 'GDzHdQOi6jjf8zaXhCYD'                      # Raquel - For Conversational
MODEL = 'eleven_multilingual_v2'
SETTINGS = {'stability': 0.40, 'similarity_boost': 0.80, 'style': 0.35, 'use_speaker_boost': True, 'speed': 1.0}
SEED = 808
SR = 44100
SCRIPT = json.load(open(os.path.join(ROOT, 'episodios', EP + '.json')))


def tts(text, prev, nxt, seed):
    body = {'text': text, 'model_id': MODEL, 'voice_settings': SETTINGS, 'seed': seed, 'previous_text': prev, 'next_text': nxt}
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    key = os.environ.get('ELEVENLABS_API_KEY')
    if key:
        headers['xi-api-key'] = key                    # nunca impresso nem gravado
    for fmt in ('pcm_44100', 'mp3_44100_192', 'mp3_44100_128'):     # o melhor que o plano liberar
        req = urllib.request.Request(API.format(voice=VOICE, fmt=fmt), data=json.dumps(body).encode(), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 422) and fmt != 'mp3_44100_128':
                continue
            print(f'  {fmt}: HTTP {e.code}')
            raise
        raw = base64.b64decode(d['audio_base64'])
        if fmt.startswith('pcm'):
            x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
        else:
            x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', '-', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                                             input=raw, capture_output=True, check=True).stdout, '<i2').astype(np.float32) / 32768
        return x, d['alignment'], fmt
    raise SystemExit('nenhum formato de áudio aceito pela API')


def limites(al):
    """início da 1ª letra e fim da última letra/dígito da fala (a pontuação e os espaços não contam)"""
    ch, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    idx = [i for i, c in enumerate(ch) if c.isalnum()]
    return st[idx[0]], en[idx[-1]]


def gerar(so):
    os.makedirs(OUT, exist_ok=True)
    cenas = SCRIPT['cenas']
    prev_json = os.path.join(OUT, 'falas.json')
    falas = {f['n']: f for f in json.load(open(prev_json))['falas']} if os.path.exists(prev_json) and so else {}
    for n, c in enumerate(cenas, 1):
        if so and n not in so:
            continue
        prev = cenas[n - 2]['fala'] if n > 1 else None
        nxt = cenas[n]['fala'] if n < len(cenas) else None
        x, al, fmt = tts(c.get('api', c['fala']), prev, nxt, c.get('seed', SEED))
        wavfile.write(os.path.join(OUT, f'cena-{n}.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
        a, b = limites(al)
        falas[n] = {'n': n, 'fala': c['fala'], 'enviado': c.get('api', c['fala']), 'formato': fmt, 'duracao_audio': round(len(x) / SR, 3),
                    'inicio_da_fala': round(a, 3), 'fim_da_fala': round(b, 3), 'alinhamento': al}
        print(f'  cena {n}: fala {b - a:.2f} s · {fmt}')
    json.dump({'voz': 'Raquel - For Conversational', 'voice_id': VOICE, 'modelo': MODEL, 'ajustes': SETTINGS, 'seed': SEED,
               'falas': [falas[k] for k in sorted(falas)]}, open(prev_json, 'w'), ensure_ascii=False, indent=1)


def medir():
    D = json.load(open(os.path.join(OUT, 'falas.json')))
    tot = 0
    print(f'voz: {D["voz"]} · modelo {D["modelo"]} · ajustes {json.dumps(D["ajustes"])}')
    for f in D['falas']:
        d = f['fim_da_fala'] - f['inicio_da_fala']; tot += d
        print(f'  cena {f["n"]}: {d:5.2f} s · {f["formato"]} · "{f["enviado"]}"')
    print(f'  soma das falas: {tot:.1f} s')


if __name__ == '__main__':
    so = None
    if '--so' in sys.argv:
        so = {int(v) for v in sys.argv[sys.argv.index('--so') + 1].split(',')}
    if '--medir' not in sys.argv:
        gerar(so)
    medir()
