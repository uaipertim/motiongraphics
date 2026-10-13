#!/usr/bin/env python3
"""
Narração do Reel 08 (teste de voz da @fazlohospeda) — ElevenLabs.

    python3 scripts/voz.py            -> audio/voz/cena-1..4.wav + audio/voz/falas.json
    python3 scripts/voz.py --medir    -> só refaz a conferência (sem chamar a API)

Roteiro A aprovado (16 s, o vídeo não muda): uma fala por cena, cada uma gerada numa chamada
própria, com as falas vizinhas como contexto (previous_text / next_text) para a entonação seguir
de uma cena para a outra. A API devolve o tempo de cada caractere (with-timestamps), usado para
conferir se cada fala cabe na sua janela (a montagem em scripts/mix_voz.py usa esses tempos).

Voz: Raquel - For Conversational (GDzHdQOi6jjf8zaXhCYD), a voz oficial da FAZLO.
Modelo: eleven_multilingual_v2. Ajustes: estabilidade 0,40 · semelhança 0,80 · estilo 0,35 ·
speaker boost ligado · velocidade 1,0 (a voz nunca é acelerada).

A chave da API NÃO fica no repositório nem é impressa: nesta nuvem ela é posta no cabeçalho
xi-api-key pela própria rede (Segredos de rede); fora dela, defina ELEVENLABS_API_KEY.
"""
import base64
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'audio', 'voz')
REV = os.path.join(ROOT, 'output', 'revisao')
API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format={fmt}'
VOICE = 'GDzHdQOi6jjf8zaXhCYD'                      # Raquel - For Conversational
MODEL = 'eleven_multilingual_v2'
SETTINGS = {'stability': 0.40, 'similarity_boost': 0.80, 'style': 0.35, 'use_speaker_boost': True, 'speed': 1.0}
SEED = 808
SR = 44100
# grafia enviada à API quando a voz erra a pronúncia (o roteiro e o vídeo não mudam):
#   FAZLO = "FÁZ-lo" -> "Fázlo" ; Hospeda = "os-PÉ-da" (H mudo, É aberto) -> "Ospéda"
GRAFIA = {}

CENAS = [
    {'id': 1, 'cena': 'título', 'janela': [0.2, 2.4], 'fala': 'Você fechou a recepção… O celular, não.'},
    {'id': 2, 'cena': 'mensagens', 'janela': [2.8, 10.6],
     'fala': 'Onze da noite: tem vaga pra amanhã? Aceita cachorro? Faz por duzentos no Pix? E ainda chega um áudio de quatro minutos.',
     'curta': 'Onze da noite: tem vaga pra amanhã? Aceita cachorro? Faz por duzentos no Pix? E chega um áudio de quatro minutos.'},
    {'id': 3, 'cena': '+37 NÃO LIDAS', 'janela': [11.0, 12.4], 'fala': 'Trinta e sete não lidas.'},
    {'id': 4, 'cena': 'convite + logo', 'janela': [12.7, 15.5], 'fala': 'Manda pra quem responde hóspede às onze. FAZLO Hospeda.',
     'api': 'Manda pra quem responde hóspede às onze. <break time="0.25s" /> FAZLO Hospeda.'},   # respiro antes da marca
]


def grafia(s):
    for a, b in GRAFIA.items():
        s = re.sub(r'\b%s\b' % re.escape(a), b, s)
    return s


def tts(text, prev, nxt):
    body = {'text': grafia(text), 'model_id': MODEL, 'voice_settings': SETTINGS, 'seed': SEED,
            'previous_text': grafia(prev) if prev else None, 'next_text': grafia(nxt) if nxt else None}
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    key = os.environ.get('ELEVENLABS_API_KEY')
    if key:
        headers['xi-api-key'] = key                    # nunca impresso nem gravado
    for fmt in ('pcm_44100', 'mp3_44100_192', 'mp3_44100_128'):     # o melhor que o plano liberar (hoje: mp3 128 kb/s)
        req = urllib.request.Request(API.format(voice=VOICE, fmt=fmt), data=json.dumps(body).encode(), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
        except urllib.error.HTTPError as e:
            msg = json.loads(e.read() or b'{}').get('detail', {})
            if e.code in (400, 403, 422) and fmt != 'mp3_44100_128':
                continue
            print(f'  {fmt}: HTTP {e.code} {msg.get("status", "") if isinstance(msg, dict) else ""}')                               # formato fora do plano: tenta o próximo
            raise
        raw = base64.b64decode(d['audio_base64'])
        if fmt.startswith('pcm'):
            x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
        else:                                          # mp3 -> pcm pelo ffmpeg
            x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', '-', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                                             input=raw, capture_output=True, check=True).stdout, '<i2').astype(np.float32) / 32768
        return x, d['alignment'], fmt
    raise SystemExit('nenhum formato de áudio aceito pela API')


def fala_fim(al):
    """fim da fala: o fim do último caractere que não é pontuação nem espaço"""
    ch, end = al['characters'], al['character_end_times_seconds']
    for c, e in zip(reversed(ch), reversed(end)):
        if c.strip() and c not in '.…,:;?!':
            return e
    return end[-1]


def gerar():
    os.makedirs(OUT, exist_ok=True)
    falas = []
    for i, c in enumerate(CENAS):
        prev = CENAS[i - 1]['fala'] if i else None
        nxt = CENAS[i + 1]['fala'] if i + 1 < len(CENAS) else None
        roteiro = c['fala']
        texto = c.get('api', roteiro)                  # o texto enviado pode ter uma pausa marcada (<break>)
        x, al, fmt = tts(texto, prev, nxt)
        janela = c['janela'][1] - c['janela'][0]
        if fala_fim(al) > janela + 0.15 and c.get('curta'):
            print(f'  cena {c["id"]}: {fala_fim(al):.2f} s não cabe em {janela:.1f} s -> versão curta ("E chega…")')
            roteiro = texto = c['curta']
            x, al, fmt = tts(texto, prev, nxt)
        wavfile.write(os.path.join(OUT, f'cena-{c["id"]}.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
        falas.append({**{k: c[k] for k in ('id', 'cena', 'janela')}, 'fala': roteiro, 'enviado': grafia(texto), 'formato': fmt,
                      'duracao_audio': round(len(x) / SR, 3), 'fim_da_fala': round(fala_fim(al), 3), 'alinhamento': al})
        print(f'  cena {c["id"]} ({c["cena"]}): fala {fala_fim(al):.2f} s / janela {janela:.1f} s · {fmt}')
    json.dump({'voz': 'Raquel - For Conversational', 'voice_id': VOICE, 'modelo': MODEL, 'ajustes': SETTINGS, 'seed': SEED,
               'grafia_enviada': GRAFIA, 'falas': falas}, open(os.path.join(OUT, 'falas.json'), 'w'), ensure_ascii=False, indent=1)


# ------------------------------------------------------------------ conferência
def medir():
    D = json.load(open(os.path.join(OUT, 'falas.json')))
    L = ['Narração do Reel 08 — as falas geradas', '',
         f'voz: {D["voz"]} ({D["voice_id"]}) · modelo: {D["modelo"]} · ajustes: {json.dumps(D["ajustes"])} · seed {D["seed"]}',
         f'grafia enviada à API: {D["grafia_enviada"] or "a do roteiro (nenhuma troca)"}', '',
         'Duração de cada fala (velocidade 1,0, sem aceleração):']
    for f in D['falas']:
        jan = f['janela'][1] - f['janela'][0]
        L.append(f'  cena {f["id"]} · {f["cena"]:<15} {f["fim_da_fala"]:.2f} s de fala · janela {jan:.1f} s · formato {f["formato"]} · "{f["enviado"]}"')
    os.makedirs(REV, exist_ok=True)
    open(os.path.join(REV, 'voz.txt'), 'w').write('\n'.join(L) + '\n')
    print('\n'.join(L))


if __name__ == '__main__':
    if '--medir' not in sys.argv:
        gerar()
    medir()
