#!/usr/bin/env python3
"""
Locução da parte de Airbnb e Booking (aprovada em 19/11/2026): as frases do roteiro.json com "tomada": "canais".

    python3 scripts/voz_canais.py            -> audio/voz-canais.wav + audio/falas-canais.json (só gera se o texto mudou)
    python3 scripts/voz_canais.py --refaz    -> gera de novo (seed seguinte)

É uma tomada própria, para não regravar a narração aprovada (audio/voz.wav). A configuração é a mesma do voz.py:
eleven_v4, voz Raquel (GDzHdQOi6jjf8zaXhCYD), só estabilidade 0,50 e semelhança 0,75, seed 5200, o mesmo dicionário de
pronúncia ("Hospeda" → "Hospéda"). Para a entonação seguir do vídeo, a API recebe a frase anterior ("…ele avisa na hora.")
e a seguinte ("Na reserva, você registra o sinal…") como contexto (previous_text / next_text); elas não são faladas.

"Airbnb" e "Booking" vão na grafia oficial: no teste de 19/11/2026 (output/revisao/pronuncia/) as duas palavras saíram com
a duração e o timbre da pronúncia brasileira ("érbiênbi", "búkin") e longe da leitura soletrada. Se um dia precisar trocar,
o lugar é o dicionário serie-explica/scripts/pronuncia.py.

A conferência é a do voz.py (ritmo, pausa interna ≤ 0,9 s, sobra no fim) e mais uma: o ritmo tem de ficar a ±15 % do
ritmo da tomada principal, para as duas tomadas soarem iguais.
"""
import json
import os
import sys
import time
import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voz as V                                                 # noqa: E402  (mesma API, mesmos ajustes, mesma conferência)

ROOT, AUD, SR = V.ROOT, V.AUD, V.SR
R = V.R
FR = [f for f in R['frases'] if f.get('tomada') == 'canais']
TEXTO = ' '.join(t['fala'] for f in FR for t in f['tokens'])
assert TEXTO == R['narracao_canais'], 'os tokens do roteiro não refazem a narração aprovada da parte de canais'
IDS = [f['id'] for f in R['frases']]
ANTES = ' '.join(t['fala'] for t in R['frases'][IDS.index(FR[0]['id']) - 1]['tokens'])
DEPOIS = ' '.join(t['fala'] for t in R['frases'][IDS.index(FR[-1]['id']) + 1]['tokens'])
RITMO_PRINCIPAL = json.load(open(os.path.join(AUD, 'falas.json')))['ritmo_letras_s']


def tts(seed, contexto=True):
    """V.tts com o contexto da frase anterior e da seguinte (se a API recusar, sem contexto)"""
    import base64, subprocess, urllib.error, urllib.request
    enviado = V.para_api(TEXTO)
    body = {'text': enviado, 'model_id': V.MODEL, 'voice_settings': V.SETTINGS, 'seed': seed}
    if contexto:
        body['previous_text'] = V.para_api(ANTES); body['next_text'] = V.para_api(DEPOIS)
    for fmt in ('pcm_44100', 'mp3_44100_192', 'mp3_44100_128'):
        req = urllib.request.Request(V.API.format(voice=V.VOICE, fmt=fmt), data=json.dumps(body).encode(),
                                     headers={'Content-Type': 'application/json', 'Accept': 'application/json'}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                d = json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 422) and fmt != 'mp3_44100_128':
                continue
            if e.code in (400, 422) and contexto:
                return tts(seed, contexto=False)
            raise
        raw = base64.b64decode(d['audio_base64'])
        if fmt.startswith('pcm'):
            x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
        else:
            x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', '-', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                                             input=raw, capture_output=True, check=True).stdout, '<i2').astype(np.float32) / 32768
        return x, d['alignment'], fmt, enviado, contexto
    raise SystemExit('nenhum formato de áudio aceito pela API')


def confere(x, al):
    ws = V.palavras(al)
    ini, fim = ws[0]['t0'], V.fim_da_voz(x)
    ritmo = sum(c.isalnum() for c in V.para_api(TEXTO)) / (fim - ini)
    gaps = [b['t0'] - a['fim_letra'] for a, b in zip(ws, ws[1:])]
    n = {'ritmo_letras_s': round(ritmo, 1), 'maior_pausa_s': round(max(gaps), 2), 'sobra_no_fim_s': round(len(x) / SR - fim, 2),
         'inicio_da_fala_s': round(ini, 3), 'fim_da_fala_s': round(fim, 3), 'fim_da_fala_api_s': round(ws[-1]['fim_letra'], 3)}
    if not 7.5 <= ritmo <= 19:
        return False, f'ritmo {ritmo:.1f} letras/s', n
    if abs(ritmo / RITMO_PRINCIPAL - 1) > 0.15:
        return False, f'ritmo {ritmo:.1f} letras/s, longe da tomada principal ({RITMO_PRINCIPAL})', n
    if max(gaps) > 0.9:
        return False, f'pausa interna de {max(gaps):.2f} s', n
    if n['sobra_no_fim_s'] < 0.05:
        return False, 'fala cortada no fim', n
    return True, 'ok', n


def main():
    path = os.path.join(AUD, 'falas-canais.json')
    D = json.load(open(path)) if os.path.exists(path) else {}
    if D.get('texto') == TEXTO and '--refaz' not in sys.argv and os.path.exists(os.path.join(AUD, 'voz-canais.wav')):
        print(f'já gerada (seed {D["seed"]}); use --refaz para gerar de novo'); return
    hist = D.get('historico', []) if D.get('texto') == TEXTO else []
    seed = (D['seed'] + 1) if hist else V.SEED
    for _ in range(4):
        x, al, fmt, enviado, ctx = tts(seed)
        ok, motivo, num = confere(x, al)
        hist.append({'seed': seed, 'formato': fmt, 'contexto': ctx, 'resultado': motivo, **num, 'quando': time.strftime('%Y-%m-%d %H:%M')})
        print(f'  seed {seed} · {fmt} · contexto {ctx} · {motivo} · ritmo {num["ritmo_letras_s"]} letras/s '
              f'(principal {RITMO_PRINCIPAL}) · maior pausa {num["maior_pausa_s"]} s · fala até {num["fim_da_fala_s"]} s')
        if ok:
            break
        seed += 1
    wavfile.write(os.path.join(AUD, 'voz-canais.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
    V.TEXTO = TEXTO                                             # palavras_oficiais usa as unidades deste texto
    json.dump({'texto': TEXTO, 'enviado': enviado, 'contexto_antes': ANTES, 'contexto_depois': DEPOIS, 'contexto_aceito': ctx,
               'voz': 'Raquel - For Conversational', 'voice_id': V.VOICE, 'modelo': V.MODEL, 'ajustes': V.SETTINGS,
               'seed': seed, 'formato': fmt, 'duracao_audio': round(len(x) / SR, 3), **num, 'historico': hist,
               'palavras': V.palavras_oficiais(TEXTO, al), 'alinhamento_api': al}, open(path, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
