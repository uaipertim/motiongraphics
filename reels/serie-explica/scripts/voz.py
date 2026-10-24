#!/usr/bin/env python3
"""
Narração de um episódio da SÉRIE EXPLICA — ElevenLabs, endpoint com marcação de tempo (with-timestamps).

    python3 scripts/voz.py explica-01               -> gera os capítulos que ainda não têm narração
    python3 scripts/voz.py explica-01 --refaz 3,5   -> gera de novo os capítulos 3 e 5, INTEIROS (nova seed)
    python3 scripts/voz.py explica-01 --medir       -> só mostra a conferência (sem chamar a API)
    ... --forcar-modelo-novo                        -> libera a trava (ver TRAVA abaixo)

REGRA DA SÉRIE: cada capítulo é UMA geração inteira (todas as frases do capítulo numa chamada só). Se uma frase sair
ruim, o capítulo inteiro é gerado de novo; nunca se emendam palavras ou trechos de gerações diferentes. Cada capítulo
fica em audio/<id>/voz/cap-NN.wav (o áudio que a API devolveu, sem cortes) e o histórico das gerações em falas.json.

Conferência automática de cada geração (se falhar, o capítulo inteiro é gerado de novo com outra seed, até 4 vezes):
  • ritmo entre 8 e 19 caracteres falados por segundo;
  • nenhuma pausa interna maior que 0,9 s entre palavras;
  • a fala termina antes do fim do áudio (nada cortado no fim).

Voz: Raquel - For Conversational (GDzHdQOi6jjf8zaXhCYD), a voz oficial da FAZLO. Modelo eleven_v4 (decisão de
23/10/2026, teste A/B): voice_settings SÓ estabilidade 0,50 · semelhança 0,75; style, use_speaker_boost e speed NÃO
são enviados (ficam no padrão da API). O texto vizinho vai como contexto (previous_text / next_text; o v4 aceita),
para a entonação seguir de um capítulo para o outro. Cada geração grava no falas.json o modelo e os ajustes usados.

PRONÚNCIA: o texto vai para a API com o dicionário de pronuncia.py ("Hospeda" → "Hospéda", "WhatsApp" → "Uátsap",
"FAZLO"/"Fazlo" → "Fázlo"); o alinhamento devolvido é refeito na grafia oficial (pronuncia.realinha), e é ele que
linha.py e qa.py usam. O falas.json guarda também o texto enviado e o alinhamento original da API.

TRAVA: um episódio publicado (TRAVADOS) ou com narração gerada por outro modelo não é regenerado (nem com --refaz),
a menos que se passe --forcar-modelo-novo. A conferência (--medir) continua liberada.

A chave da API NÃO fica no repositório nem é impressa: nesta nuvem a rede a põe no cabeçalho xi-api-key
(Segredos de rede); fora dela, defina ELEVENLABS_API_KEY no ambiente.
"""
import base64
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import numpy as np
from scipy.io import wavfile
from pronuncia import fonetica, realinha

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'explica-01'
OUT = os.path.join(ROOT, 'audio', EP, 'voz')
API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format={fmt}'
VOICE = 'GDzHdQOi6jjf8zaXhCYD'                      # Raquel - For Conversational
MODEL = 'eleven_v4'
SETTINGS = {'stability': 0.50, 'similarity_boost': 0.75}      # só isto; style, speaker boost e speed ficam no padrão
SR = 44100
SCRIPT = json.load(open(os.path.join(ROOT, 'episodios', EP + '.json')))
TENTATIVAS = 4
# episódios publicados: a narração (audio/<id>/voz/) e o vídeo ficam exatamente como estão
TRAVADOS = {
    'explica-01': 'publicado; narração em eleven_multilingual_v2',
    'explica-02': 'publicado; narração em eleven_multilingual_v2',
}
FORCAR = '--forcar-modelo-novo' in sys.argv


def trava(D):
    """recusa chamar a API num episódio travado ou com narração de outro modelo (salvo --forcar-modelo-novo)"""
    motivo = None
    if EP in TRAVADOS:
        motivo = f'{EP} está travado ({TRAVADOS[EP]})'
    elif D.get('modelo') and D['modelo'] != MODEL:
        motivo = f'a narração de {EP} foi gerada com {D["modelo"]} (o modelo atual é {MODEL})'
    if motivo and not FORCAR:
        raise SystemExit(f'{motivo}: nada foi regenerado. Para regenerar mesmo assim, passe --forcar-modelo-novo.')


def texto_cap(c):
    return ' '.join(f['texto'] for f in c['fala'])


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
            with urllib.request.urlopen(req, timeout=180) as r:
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


def palavras(al):
    ch, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    out, cur = [], None
    for c, a, b in zip(ch, st, en):
        if c.isspace():
            if cur:
                out.append(cur); cur = None
            continue
        if cur is None:
            cur = {'w': '', 't0': a, 't1': b, 'fim_letra': None}
        cur['w'] += c; cur['t1'] = b
        if c.isalnum():
            cur['fim_letra'] = b
    if cur:
        out.append(cur)
    return [w for w in out if w['fim_letra'] is not None]


def confere(x, al, texto):
    """(ok, motivo, números) de uma geração"""
    ws = palavras(al)
    ini, fim = ws[0]['t0'], ws[-1]['fim_letra']
    letras = sum(c.isalnum() for c in texto)
    ritmo = letras / max(0.1, fim - ini)
    gaps = [b['t0'] - a['fim_letra'] for a, b in zip(ws, ws[1:])]
    maior = max(gaps) if gaps else 0.0
    sobra = len(x) / SR - fim
    n = {'ritmo_letras_s': round(ritmo, 1), 'maior_pausa_s': round(maior, 2), 'sobra_no_fim_s': round(sobra, 2), 'fala_s': round(fim - ini, 2)}
    if not 8 <= ritmo <= 19:
        return False, f'ritmo {ritmo:.1f} letras/s', n
    if maior > 0.9:
        return False, f'pausa interna de {maior:.2f} s', n
    if sobra < 0.05:
        return False, 'fala cortada no fim', n
    return True, 'ok', n


def gerar(refaz):
    os.makedirs(OUT, exist_ok=True)
    caps = SCRIPT['capitulos']
    path = os.path.join(OUT, 'falas.json')
    D = json.load(open(path)) if os.path.exists(path) else {'capitulos': {}}
    for n, c in enumerate(caps):
        key = f'{n:02d}'
        texto = texto_cap(c)
        atual = D['capitulos'].get(key)
        if atual and atual['texto'] == texto and n not in refaz and os.path.exists(os.path.join(OUT, f'cap-{key}.wav')):
            continue
        prev = texto_cap(caps[n - 1]) if n else None
        nxt = texto_cap(caps[n + 1]) if n + 1 < len(caps) else None
        trava(D)                                          # daqui em diante a API seria chamada
        hist = atual['historico'] if atual and atual['texto'] == texto else []
        seed = c.get('seed', 300 + 17 * n) + 1000 * len(hist)
        for k in range(TENTATIVAS):
            x, al, fmt, enviado, al_api = tts(texto, prev, nxt, seed)
            ok, motivo, num = confere(x, al, texto)
            hist.append({'seed': seed, 'modelo': MODEL, 'ajustes': SETTINGS, 'formato': fmt, 'resultado': motivo, **num,
                         'quando': time.strftime('%Y-%m-%d %H:%M')})
            print(f'  cap {key}: seed {seed} · {motivo} · {num["fala_s"]} s · {num["ritmo_letras_s"]} letras/s · maior pausa {num["maior_pausa_s"]} s')
            if ok:
                break
            seed += 1000
        pcm = np.round(np.clip(x, -1, 1) * 32767).astype(np.int16)
        wavfile.write(os.path.join(OUT, f'cap-{key}.wav'), SR, pcm)
        ws = palavras(al)
        D['capitulos'][key] = {'n': n, 'texto': texto, 'enviado': enviado, 'modelo': MODEL, 'ajustes': SETTINGS, 'seed': seed, 'formato': fmt, 'duracao_audio': round(len(x) / SR, 3),
                               'inicio_da_fala': round(ws[0]['t0'], 3), 'fim_da_fala': round(ws[-1]['fim_letra'], 3),
                               'sha1_audio': hashlib.sha1(pcm.tobytes()).hexdigest(), 'geracoes': len(hist), 'historico': hist,
                               'alinhamento': al, 'alinhamento_api': al_api}
        D.update({'voz': 'Raquel - For Conversational', 'voice_id': VOICE, 'modelo': MODEL, 'ajustes': SETTINGS,
                  'regra': 'uma geração inteira por capítulo; nada emendado'})
        json.dump(D, open(path, 'w'), ensure_ascii=False, indent=1)


def medir():
    D = json.load(open(os.path.join(OUT, 'falas.json')))
    tot = 0
    print(f'voz: {D["voz"]} · modelo {D["modelo"]} · ajustes {json.dumps(D["ajustes"])}')
    for key in sorted(D['capitulos']):
        f = D['capitulos'][key]
        d = f['fim_da_fala'] - f['inicio_da_fala']; tot += d
        print(f'  cap {key}: {d:5.2f} s · {f["geracoes"]} geração(ões), usada a seed {f["seed"]} · "{f["texto"][:60]}…"')
    print(f'  soma das falas: {tot:.1f} s')


if __name__ == '__main__':
    refaz = set()
    if '--refaz' in sys.argv:
        refaz = {int(v) for v in sys.argv[sys.argv.index('--refaz') + 1].split(',')}
    if '--medir' not in sys.argv:
        gerar(refaz)
    medir()
