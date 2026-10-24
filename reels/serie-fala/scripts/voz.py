#!/usr/bin/env python3
"""
Narração de um episódio da SÉRIE FALA — ElevenLabs, endpoint com marcação de tempo (with-timestamps).

    python3 scripts/voz.py fala-01              -> audio/fala-01/voz/cena-N.wav + falas.json
    python3 scripts/voz.py fala-01 --so 3,4     -> refaz só as cenas 3 e 4 (índices a partir de 1)
    python3 scripts/voz.py fala-01 --medir      -> só refaz a conferência (sem chamar a API)
    ... --forcar-modelo-novo                    -> libera a trava (ver TRAVA abaixo)

Cada fala do JSON (cenas[].fala) é gerada numa chamada própria, com as falas vizinhas como contexto
(previous_text / next_text) para a entonação seguir de uma cena para a outra. A API devolve o tempo de cada
caractere; scripts/linha.py transforma isso nos tempos de cena e de palavra do vídeo.

Voz: Raquel - For Conversational (GDzHdQOi6jjf8zaXhCYD), a voz oficial da FAZLO. Modelo eleven_v4 (decisão de
23/10/2026, teste A/B): voice_settings SÓ estabilidade 0,50 · semelhança 0,75; style, use_speaker_boost e speed NÃO
são enviados (ficam no padrão da API; a voz nunca é acelerada). O v4 aceita previous_text / next_text e seed.
Cada geração grava no falas.json o modelo e os ajustes usados.

PRONÚNCIA: o texto vai para a API com o dicionário compartilhado (../serie-explica/scripts/pronuncia.py:
"Hospeda" → "Hospéda", "WhatsApp" → "Uátsap", "FAZLO"/"Fazlo" → "Fázlo"); o alinhamento devolvido é refeito na
grafia oficial, palavra por palavra, e é ele que linha.py, entonacao.py e qa.py usam.

TRAVA: um episódio publicado (TRAVADOS) ou com narração gerada por outro modelo não é regenerado (nem com --so),
a menos que se passe --forcar-modelo-novo. A conferência (--medir) continua liberada.

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

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'serie-explica', 'scripts'))
from pronuncia import fonetica, realinha                    # noqa: E402  (o dicionário de pronúncia é um só, nas duas séries)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'fala-01'
OUT = os.path.join(ROOT, 'audio', EP, 'voz')
API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format={fmt}'
VOICE = 'GDzHdQOi6jjf8zaXhCYD'                      # Raquel - For Conversational
MODEL = 'eleven_v4'
SETTINGS = {'stability': 0.50, 'similarity_boost': 0.75}      # só isto; style, speaker boost e speed ficam no padrão
SEED = 808
SR = 44100
SCRIPT = json.load(open(os.path.join(ROOT, 'episodios', EP + '.json')))
# episódios publicados: a narração (audio/<id>/voz/, tomadas incluídas) e o vídeo ficam exatamente como estão
TRAVADOS = {'fala-01': 'publicado; narração em eleven_multilingual_v2 (+ tomadas de pergunta em eleven_v3)'}
FORCAR = '--forcar-modelo-novo' in sys.argv


def trava():
    """recusa chamar a API num episódio travado ou com narração de outro modelo (salvo --forcar-modelo-novo)"""
    motivo, path = None, os.path.join(OUT, 'falas.json')
    modelo = json.load(open(path)).get('modelo') if os.path.exists(path) else None
    if EP in TRAVADOS:
        motivo = f'{EP} está travado ({TRAVADOS[EP]})'
    elif modelo and modelo != MODEL:
        motivo = f'a narração de {EP} foi gerada com {modelo} (o modelo atual é {MODEL})'
    if motivo and not FORCAR:
        raise SystemExit(f'{motivo}: nada foi regenerado. Para regenerar mesmo assim, passe --forcar-modelo-novo.')


def tts(text, prev, nxt, seed):
    """(áudio, alinhamento NA GRAFIA OFICIAL, formato, texto enviado, alinhamento original da API)"""
    enviado = fonetica(text)
    body = {'text': enviado, 'model_id': MODEL, 'voice_settings': SETTINGS, 'seed': seed, 'previous_text': fonetica(prev), 'next_text': fonetica(nxt)}
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
        return x, realinha(text, enviado, d['alignment']), fmt, enviado, d['alignment']
    raise SystemExit('nenhum formato de áudio aceito pela API')


def limites(al):
    """início da 1ª letra e fim da última letra/dígito da fala (a pontuação e os espaços não contam)"""
    ch, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    idx = [i for i, c in enumerate(ch) if c.isalnum()]
    return st[idx[0]], en[idx[-1]]


def gerar(so):
    trava()
    os.makedirs(OUT, exist_ok=True)
    cenas = SCRIPT['cenas']
    prev_json = os.path.join(OUT, 'falas.json')
    falas = {f['n']: f for f in json.load(open(prev_json))['falas']} if os.path.exists(prev_json) and so else {}
    for n, c in enumerate(cenas, 1):
        if so and n not in so:
            continue
        prev = cenas[n - 2]['fala'] if n > 1 else None
        nxt = cenas[n]['fala'] if n < len(cenas) else None
        x, al, fmt, enviado, al_api = tts(c.get('api', c['fala']), prev, nxt, c.get('seed', SEED))
        wavfile.write(os.path.join(OUT, f'cena-{n}.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
        a, b = limites(al)
        falas[n] = {'n': n, 'fala': c['fala'], 'enviado': enviado, 'modelo': MODEL, 'ajustes': SETTINGS, 'seed': c.get('seed', SEED),
                    'formato': fmt, 'duracao_audio': round(len(x) / SR, 3),
                    'inicio_da_fala': round(a, 3), 'fim_da_fala': round(b, 3), 'alinhamento': al, 'alinhamento_api': al_api}
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
