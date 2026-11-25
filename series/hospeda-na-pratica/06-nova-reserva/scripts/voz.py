#!/usr/bin/env python3
"""
Locução do episódio 6 (Nova reserva em segundos): voz Alexa (sXSV9RZ095VZyL64w3ap), eleven_v4, só estabilidade 0,50 e
semelhança 0,75, endpoint with-timestamps (o ajuste de velocidade foi testado e não muda nada no eleven_v4; a agilidade vem das pausas curtas da montagem), uma chamada só para a narração inteira.

    python3 scripts/voz.py [--refaz]   -> audio/voz.wav + audio/falas.json (palavras na grafia oficial, com tempo)

Pronúncia (só no texto enviado): "Hospeda" → "Hospéda", "FAZLO" → "Fázlo". Valores só na tela, nunca na voz.
Cada troca é palavra por palavra, então as palavras da API voltam uma a uma para a grafia oficial.
A chave não fica em arquivo: a rede da sessão põe o cabeçalho xi-api-key.
"""
import base64, json, os, re, subprocess, sys, time, urllib.error, urllib.request
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
TEXTO = R['narracao']
VOZ, MODELO = R['voz']['voice_id'], R['voz']['modelo']
AJ = {'stability': R['voz']['stability'], 'similarity_boost': R['voz']['similarity_boost'], **({'speed': R['voz']['speed']} if 'speed' in R['voz'] else {})}
SR, SEED = 44100, 7100
API = 'https://api.elevenlabs.io/v1/text-to-speech/{v}/with-timestamps?output_format={f}'


def para_api(s):
    for de, para in R['pronuncia'].items():
        s = re.sub(r'(?<![\wÀ-ÿ])' + re.escape(de) + r'(?![\wÀ-ÿ])', para, s)
    return s


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


def main():
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    caminho = os.path.join(ROOT, 'audio', 'falas.json')
    D = json.load(open(caminho)) if os.path.exists(caminho) else {}
    if D.get('texto') == TEXTO and '--refaz' not in sys.argv:
        print('já gerada (seed', D['seed'], ')'); return
    seed = D['seed'] + 1 if D.get('texto') == TEXTO else SEED
    enviado = para_api(TEXTO)
    for tentativa in range(4):
        body = {'text': enviado, 'model_id': MODELO, 'voice_settings': AJ, 'seed': seed}
        d = None
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
        ws = palavras(d['alignment'])
        fim = fim_voz(x)
        ritmo = sum(ch.isalnum() for ch in enviado) / (fim - ws[0]['t0'])
        gaps = [b['t0'] - a['t1'] for a, b in zip(ws, ws[1:])]
        ok = len(x) / SR - fim >= 0.05 and max(gaps) < 1.2
        print(f'  seed {seed} · {fmt} · ritmo {ritmo:.1f} letras/s · maior pausa {max(gaps):.2f} s · fala {fim:.2f} s · {"ok" if ok else "refaz"}')
        if ok: break
        seed += 1
    ofi = TEXTO.split()
    assert len(ofi) == len(ws), (len(ofi), len(ws))
    pal = [{'w': o, 'falado': a['w'], 't0': round(a['t0'], 3), 't1': round(min(a['t1'], fim), 3)} for o, a in zip(ofi, ws)]
    wavfile.write(os.path.join(ROOT, 'audio', 'voz.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
    json.dump({'texto': TEXTO, 'enviado': enviado, 'voz': R['voz'], 'seed': seed, 'formato': fmt, 'ritmo_letras_s': round(ritmo, 1),
               'fim_da_fala_s': round(fim, 3), 'duracao_audio': round(len(x) / SR, 3), 'palavras': pal, 'quando': time.strftime('%Y-%m-%d %H:%M')},
              open(caminho, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
