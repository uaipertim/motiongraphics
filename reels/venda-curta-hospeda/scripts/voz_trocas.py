#!/usr/bin/env python3
"""
Revisão de 23/11/2026: só 3 frases trocadas (canais1, canais2, canais3). Cada uma é gerada sozinha, com a mesma voz e os
mesmos ajustes do vídeo (Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75, seed 7100), com a frase anterior e a
seguinte como contexto (previous_text / next_text, não faladas). As outras frases ficam com o áudio já aprovado.

    python3 scripts/voz_trocas.py [--refaz]   -> audio/trocas/<id>.wav + <id>.json (palavras com tempo) + aprovacao/vozes/<id>.mp3

A chave não fica em arquivo: a rede da sessão põe o cabeçalho xi-api-key.
"""
import base64, json, os, re, subprocess, sys, time, urllib.error, urllib.request
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
VOZ, MODELO = R['voz']['voice_id'], R['voz']['modelo']
AJ = {'stability': R['voz']['stability'], 'similarity_boost': R['voz']['similarity_boost']}
SR, SEED = 44100, 7100
API = 'https://api.elevenlabs.io/v1/text-to-speech/{v}/with-timestamps?output_format={f}'
TROCAS = ['canais1', 'canais2', 'canais3']


def para_api(s):
    for de, para in R['pronuncia'].items():
        s = re.sub(r'(?<![\wÀ-ÿ])' + re.escape(de) + r'(?![\wÀ-ÿ])', para, s)
    return s


def texto(f): return ' '.join(t['fala'] for t in f['tokens'])


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


def fim_voz(x, lim=-40):
    h = int(0.01 * SR); n = len(x) // h
    r = np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(axis=1)); a = np.nonzero(r > 10 ** (lim / 20))[0]
    return (a[-1] + 1) * h / SR


def tts(enviado, antes, depois, seed):
    body = {'text': enviado, 'model_id': MODELO, 'voice_settings': AJ, 'seed': seed, 'previous_text': antes, 'next_text': depois}
    for fmt in ('pcm_44100', 'mp3_44100_192'):
        req = urllib.request.Request(API.format(v=VOZ, f=fmt), data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'}, method='POST')
        try:
            d = json.load(urllib.request.urlopen(req, timeout=180)); break
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 422) and fmt != 'mp3_44100_192': continue
            raise
    raw = base64.b64decode(d['audio_base64'])
    x = (np.frombuffer(raw, '<i2') if fmt.startswith('pcm') else np.frombuffer(subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', '-', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], input=raw, capture_output=True, check=True).stdout, '<i2')).astype(np.float32) / 32768
    return x, d['alignment'], fmt


def main():
    ids = [f['id'] for f in R['frases']]
    for fid in TROCAS:
        caminho = os.path.join(ROOT, 'audio', 'trocas', fid + '.json')
        f = R['frases'][ids.index(fid)]; TX = texto(f)
        if os.path.exists(caminho) and json.load(open(caminho))['texto'] == TX and '--refaz' not in sys.argv:
            print(fid, 'já gerada'); continue
        i = ids.index(fid); antes = para_api(texto(R['frases'][i - 1])); depois = para_api(texto(R['frases'][i + 1]))
        enviado = para_api(TX); seed = SEED
        for tentativa in range(4):
            x, al, fmt = tts(enviado, antes, depois, seed)
            ws = palavras(al); fim = fim_voz(x)
            ritmo = sum(ch.isalnum() for ch in enviado) / (fim - ws[0]['t0'])
            gaps = [b['t0'] - a['t1'] for a, b in zip(ws, ws[1:])]
            ok = len(x) / SR - fim >= 0.05 and max(gaps) < 1.0 and len(ws) == len(TX.split())
            print(f'  {fid}: seed {seed} · {fmt} · ritmo {ritmo:.1f} letras/s · maior pausa {max(gaps):.2f} s · fala {fim - ws[0]["t0"]:.2f} s · {"ok" if ok else "refaz"}')
            if ok: break
            seed += 1
        pal = [{'w': o, 'falado': a['w'], 't0': round(a['t0'], 3), 't1': round(min(a['t1'], fim), 3)} for o, a in zip(TX.split(), ws)]
        wavfile.write(os.path.join(ROOT, 'audio', 'trocas', fid + '.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
        json.dump({'id': fid, 'texto': TX, 'enviado': enviado, 'contexto': {'antes': antes, 'depois': depois}, 'voz': R['voz'], 'seed': seed, 'formato': fmt,
                   'ritmo_letras_s': round(ritmo, 1), 'fim_da_fala_s': round(fim, 3), 'duracao_audio': round(len(x) / SR, 3), 'palavras': pal, 'quando': time.strftime('%Y-%m-%d %H:%M')},
                  open(caminho, 'w'), ensure_ascii=False, indent=1)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(ROOT, 'audio', 'trocas', fid + '.wav'), '-b:a', '192k', os.path.join(ROOT, 'aprovacao', 'vozes', f'{fid}-nova.mp3')], check=True)


if __name__ == '__main__':
    main()
