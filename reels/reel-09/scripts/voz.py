#!/usr/bin/env python3
"""
Narração do Reel 09 "Dois hóspedes, um chalé" — ElevenLabs, voz Raquel, endpoint com marcação de tempo (with-timestamps).
Configuração de voz SÓ deste Reel (não importa nem altera a narração das séries e dos outros Reels).

    python3 scripts/voz.py              -> gera os blocos que faltam em audio/voz/ (bloco-N.wav + falas.json)
    python3 scripts/voz.py --refaz 2,5  -> refaz esses blocos (semente seguinte)

Cada bloco vai como frase completa, numa chamada própria, para manter a entonação das perguntas. A pronúncia da marca
vai escrita como deve soar: "Fazlo Hospéda" (nunca "Hóspeda"); "WhatsApp" vai como "Uátsap" só no texto enviado (GRAFIA). A chave da API não fica no repositório: nesta nuvem a rede
põe o cabeçalho xi-api-key (Segredos de rede); fora dela, defina ELEVENLABS_API_KEY no ambiente.
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'audio', 'voz')
API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format={fmt}'
VOICE = 'GDzHdQOi6jjf8zaXhCYD'                      # Raquel - For Conversational
MODEL = 'eleven_v4'                                  # o mais expressivo disponível na API (nunca Flash nem Turbo)
SETTINGS = {'stability': 0.50, 'similarity_boost': 0.75}     # versão C do teste A/B: style, speaker boost e speed no padrão (não enviados)
# grafia enviada à API para a pronúncia (a legenda usa o texto do roteiro): "WhatsApp" -> "Uátsap"
GRAFIA = {'WhatsApp': 'Uátsap'}
SR = 44100
BLOCOS = json.load(open(os.path.join(ROOT, 'roteiro.json')))['narracao']


def tts(text, seed):
    body = {'text': text, 'model_id': MODEL, 'voice_settings': SETTINGS, 'seed': seed}
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    key = os.environ.get('ELEVENLABS_API_KEY')
    if key:
        headers['xi-api-key'] = key                    # nunca impresso nem gravado
    for fmt in ('pcm_44100', 'mp3_44100_192', 'mp3_44100_128'):     # o melhor que o plano liberar
        req = urllib.request.Request(API.format(voice=VOICE, fmt=fmt), data=json.dumps(body).encode(), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                d = json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 422) and fmt != 'mp3_44100_128':
                continue
            print(f'  {fmt}: HTTP {e.code} {e.read()[:300]!r}')
            raise
        raw = base64.b64decode(d['audio_base64'])
        if fmt.startswith('pcm'):
            x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
        else:
            x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', '-', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                                             input=raw, capture_output=True, check=True).stdout, '<i2').astype(np.float32) / 32768
        return x, d['alignment'], fmt
    raise SystemExit('nenhum formato de áudio aceito pela API')


def grafia(s):
    for a, b in GRAFIA.items():
        s = s.replace(a, b)
    return s


def palavras(al):
    """tempo de cada palavra (início, fim da última letra) a partir do alinhamento por caractere"""
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
    return [{**w, 't0': round(w['t0'], 3), 't1': round(w['t1'], 3)} for w in out if any(ch.isalnum() for ch in w['w'])]


def main():
    os.makedirs(OUT, exist_ok=True)
    refaz = {int(v) for v in sys.argv[sys.argv.index('--refaz') + 1].split(',')} if '--refaz' in sys.argv else set()
    path = os.path.join(OUT, 'falas.json')
    D = json.load(open(path)) if os.path.exists(path) else {}
    D.update({'voz': 'Raquel - For Conversational', 'voice_id': VOICE, 'modelo': MODEL, 'ajustes': SETTINGS})
    D.setdefault('blocos', {})
    for b in BLOCOS:
        k = str(b['bloco'])
        atual = D['blocos'].get(k)
        enviado = grafia(b['texto'])
        if (atual and atual['texto'] == b['texto'] and atual.get('enviado') == enviado and atual.get('ajustes') == SETTINGS
                and atual.get('modelo') == MODEL and b['bloco'] not in refaz and os.path.exists(os.path.join(OUT, f'bloco-{k}.wav'))):
            continue
        seed = (atual['seed'] + 1) if atual and b['bloco'] in refaz else b.get('seed', 900 + 10 * b['bloco'])
        x, al, fmt = tts(enviado, seed)
        wavfile.write(os.path.join(OUT, f'bloco-{k}.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
        ws = palavras(al)
        leg = b['texto'].split()                         # a legenda é o texto do roteiro, palavra a palavra
        assert len(leg) == len(ws), f'bloco {k}: {len(leg)} palavras no roteiro, {len(ws)} no alinhamento'
        ws = [{**w, 'legenda': l} for w, l in zip(ws, leg)]
        D['blocos'][k] = {'texto': b['texto'], 'enviado': enviado, 'modelo': MODEL, 'ajustes': SETTINGS, 'seed': seed, 'formato': fmt, 'duracao_audio': round(len(x) / SR, 3),
                          'fala_ini': ws[0]['t0'], 'fala_fim': ws[-1]['t1'], 'palavras': ws,
                          'quando': time.strftime('%Y-%m-%d %H:%M')}
        print(f'  bloco {k}: seed {seed} · {fmt} · áudio {len(x) / SR:.2f} s · fala {ws[0]["t0"]:.2f}–{ws[-1]["t1"]:.2f} s')
    json.dump(D, open(path, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
