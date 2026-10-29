#!/usr/bin/env python3
"""
Locução da apresentação do FAZLO Hospeda para a pousada abordada — ElevenLabs, endpoint com marcação de tempo (with-timestamps).

    python3 scripts/voz.py            -> audio/voz.wav + audio/falas.json (só gera se ainda não existir ou se o texto mudou)
    python3 scripts/voz.py --refaz    -> gera de novo (seed seguinte)

Configuração aprovada (23/10/2026): eleven_v4, voz Raquel - For Conversational (GDzHdQOi6jjf8zaXhCYD), voice_settings SÓ
estabilidade 0,50 · semelhança 0,75 (style, speaker boost e speed ficam no padrão da API). A narração inteira vai numa
chamada só, para a entonação seguir de uma frase para a outra.

Pronúncia: o texto vai para a API com o dicionário de reels/serie-explica/scripts/pronuncia.py ("Hospeda" → "Hospéda",
"FAZLO" → "Fázlo", "WhatsApp" → "Uátsap") e os valores por extenso do roteiro ("falado": "R$ 99,90" → "noventa e nove
reais e noventa centavos"). As palavras devolvidas pela API são juntadas de novo na grafia oficial (falas.json → "palavras":
"R$ 99,90" é uma palavra só, com o tempo das 7 palavras faladas), e a legenda mostra sempre a grafia oficial.

Conferência (as regras da voz v4 de 24/10/2026; se falhar, gera de novo com a seed seguinte, até 4 vezes):
  • ritmo de 7,5 a 19 letras/s;  • nenhuma pausa interna acima de 0,9 s;  • ao menos 0,05 s de áudio depois da fala.
O fim da fala é medido no áudio (último trecho de 10 ms acima de −40 dBFS), não na marcação da API.

A chave da API não fica no repositório nem é impressa: nesta nuvem a rede põe o cabeçalho xi-api-key (Segredos de rede).
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
sys.path.insert(0, os.path.join(ROOT, '..', 'serie-explica', 'scripts'))
from pronuncia import fonetica                                  # noqa: E402  (o dicionário de pronúncia é um só)

AUD = os.path.join(ROOT, 'audio')
API = 'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format={fmt}'
VOICE = 'GDzHdQOi6jjf8zaXhCYD'                                   # Raquel - For Conversational
MODEL = 'eleven_v4'
SETTINGS = {'stability': 0.50, 'similarity_boost': 0.75}
SEED = 5200
SR = 44100
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
TEXTO = ' '.join(t['fala'] for f in R['frases'] for t in f['tokens'])
FALADO = R.get('falado', {})
assert TEXTO == R['narracao'], 'os tokens do roteiro não refazem a narração aprovada'


def unidades(texto):
    """as palavras da grafia oficial: "R$" fica junto do valor ("R$ 99,90" é uma unidade)"""
    out = []
    for w in texto.split():
        if out and out[-1] == 'R$':
            out[-1] += ' ' + w
        else:
            out.append(w)
    return out


def para_api(texto):
    enviado = fonetica(texto)
    for k, v in FALADO.items():
        enviado = enviado.replace(k, v)
    return enviado


def palavras_oficiais(texto, al_api):
    """as palavras da API (texto enviado) juntadas de novo nas unidades da grafia oficial, com t0 e fim da última letra"""
    api = palavras(al_api)
    out, k = [], 0
    for u in unidades(texto):
        base = u.rstrip('.,:;?!')
        n = len(FALADO[base].split()) if base in FALADO else 1
        g = api[k:k + n]; k += n
        out.append({'w': u, 't0': g[0]['t0'], 't1': g[-1]['fim_letra'], 'falado': ' '.join(x['w'] for x in g)})
    assert k == len(api), f'sobraram palavras da API: {len(api) - k}'
    return out


def tts(text, seed):
    enviado = para_api(text)
    body = {'text': enviado, 'model_id': MODEL, 'voice_settings': SETTINGS, 'seed': seed}
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    key = os.environ.get('ELEVENLABS_API_KEY')
    if key:
        headers['xi-api-key'] = key                              # nunca impresso nem gravado
    for fmt in ('pcm_44100', 'mp3_44100_192', 'mp3_44100_128'):   # o melhor que o plano liberar
        req = urllib.request.Request(API.format(voice=VOICE, fmt=fmt), data=json.dumps(body).encode(), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                d = json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 422) and fmt != 'mp3_44100_128':
                continue
            raise
        raw = base64.b64decode(d['audio_base64'])
        if fmt.startswith('pcm'):
            x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
        else:
            x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', '-', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                                             input=raw, capture_output=True, check=True).stdout, '<i2').astype(np.float32) / 32768
        return x, d['alignment'], fmt, enviado, d['alignment']
    raise SystemExit('nenhum formato de áudio aceito pela API')


def palavras(al):
    out, cur = [], None
    for c, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if c.isspace():
            if cur:
                out.append(cur); cur = None
            continue
        if cur is None:
            cur = {'w': '', 't0': a, 'fim_letra': None}
        cur['w'] += c
        if c.isalnum():
            cur['fim_letra'] = b
    if cur:
        out.append(cur)
    return [w for w in out if w['fim_letra'] is not None]


def fim_da_voz(x, sr=SR, limiar_db=-40):
    h = int(0.01 * sr); n = len(x) // h
    rms = np.sqrt((x[:n * h].astype(np.float64).reshape(n, h) ** 2).mean(axis=1))
    acima = np.nonzero(rms > 10 ** (limiar_db / 20))[0]
    return (acima[-1] + 1) * h / sr if len(acima) else 0.0


def confere(x, al):
    ws = palavras(al)
    ini, fim = ws[0]['t0'], fim_da_voz(x)
    ritmo = sum(c.isalnum() for c in para_api(TEXTO)) / (fim - ini)
    gaps = [b['t0'] - a['fim_letra'] for a, b in zip(ws, ws[1:])]
    n = {'ritmo_letras_s': round(ritmo, 1), 'maior_pausa_s': round(max(gaps), 2), 'sobra_no_fim_s': round(len(x) / SR - fim, 2),
         'inicio_da_fala_s': round(ini, 3), 'fim_da_fala_s': round(fim, 3), 'fim_da_fala_api_s': round(ws[-1]['fim_letra'], 3)}
    if not 7.5 <= ritmo <= 19:
        return False, f'ritmo {ritmo:.1f} letras/s', n
    if max(gaps) > 0.9:
        return False, f'pausa interna de {max(gaps):.2f} s', n
    if n['sobra_no_fim_s'] < 0.05:
        return False, 'fala cortada no fim', n
    return True, 'ok', n


def main():
    os.makedirs(AUD, exist_ok=True)
    path = os.path.join(AUD, 'falas.json')
    D = json.load(open(path)) if os.path.exists(path) else {}
    if D.get('texto') == TEXTO and '--refaz' not in sys.argv and os.path.exists(os.path.join(AUD, 'voz.wav')):
        print(f'já gerada (seed {D["seed"]}); use --refaz para gerar de novo'); return
    hist = D.get('historico', []) if D.get('texto') == TEXTO else []
    seed = (D['seed'] + 1) if hist else SEED
    for _ in range(4):
        x, al, fmt, enviado, al_api = tts(TEXTO, seed)
        ok, motivo, num = confere(x, al)
        hist.append({'seed': seed, 'modelo': MODEL, 'ajustes': SETTINGS, 'formato': fmt, 'resultado': motivo, **num, 'quando': time.strftime('%Y-%m-%d %H:%M')})
        print(f'  seed {seed} · {fmt} · {motivo} · ritmo {num["ritmo_letras_s"]} letras/s · maior pausa {num["maior_pausa_s"]} s · fala até {num["fim_da_fala_s"]} s')
        if ok:
            break
        seed += 1
    wavfile.write(os.path.join(AUD, 'voz.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
    json.dump({'texto': TEXTO, 'enviado': enviado, 'voz': 'Raquel - For Conversational', 'voice_id': VOICE, 'modelo': MODEL, 'ajustes': SETTINGS,
               'seed': seed, 'formato': fmt, 'duracao_audio': round(len(x) / SR, 3), **num, 'historico': hist,
               'palavras': palavras_oficiais(TEXTO, al_api), 'alinhamento_api': al_api}, open(path, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
