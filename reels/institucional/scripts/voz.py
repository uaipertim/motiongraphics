#!/usr/bin/env python3
"""
Narração do vídeo institucional do FAZLO Hospeda (≈ 92 s, para WhatsApp) — ElevenLabs.

    python3 scripts/voz.py            -> audio/voz/cena-<id>.wav (1, 2, 3a, 3b, …, 8) + audio/voz/falas.json
    python3 scripts/voz.py --so 3,4   -> refaz só as cenas 3 e 4 (as outras ficam como estão; aceita frases: --so 3b)
    python3 scripts/voz.py --medir    -> só refaz a conferência (sem chamar a API)

Roteiro aprovado em 16/10/2026, com os ajustes da prévia v2: nenhuma fala é cortada no meio de uma
frase. Cada chamada gera uma fala ou uma frase inteira, com final de frase, e recebe as falas vizinhas
como contexto (previous_text / next_text) para a entonação seguir de uma para a outra. A API devolve
o tempo de cada caractere (with-timestamps), usado para separar os trechos (scripts/trechos.py).

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

# Cada fala é uma frase inteira, com final de frase: a voz nunca é cortada no meio de uma frase.
# Nas cenas 3 a 6 cada frase é gerada numa chamada própria ('frases'); o motor coloca as pausas entre elas.
# Nas cenas 7 e 8 as frases já vêm separadas por pausas (<break>) e o corte cai no meio da pausa.
CENAS = [
    {'id': 1, 'cena': 'a dor',
     'fala': 'Reserva anotada no caderno, consumo no papel e um caixa que nunca bate?'},
    {'id': 2, 'cena': 'a virada',
     'fala': 'Conheça o FAZLO Hospeda: a gestão da sua pousada em um só lugar.',
     # "Hospeda" saía "Hóspeda" nesta frase (na cena 8 sai certo, "Hospéda"): a API recebe "Ospéda" (regra
     # da pronúncia) e a seed 810, a tomada mais parecida com o "Hospeda" da cena 8 (ver README)
     'api': 'Conheça o FAZLO Ospéda: a gestão da sua pousada em um só lugar.',
     'seed': 810},
    {'id': 3, 'cena': 'reservas', 'frases': [
        ('3a', 'Veja a ocupação no calendário.'),
        ('3b', 'Lance uma reserva em poucos passos.'),
        ('3c', 'E envie o voucher ao hóspede.')]},
    {'id': 4, 'cena': 'check-in', 'frases': [
        ('4a', 'No check-in, registre o pagamento.'),
        ('4b', 'E gere o recibo na hora.')]},
    {'id': 5, 'cena': 'comandas', 'frases': [
        ('5a', 'Durante a estadia, cada consumo do hóspede é lançado.'),
        ('5b', 'E vai direto para a conta dele.')]},
    {'id': 6, 'cena': 'caixa', 'frases': [
        ('6a', 'Cada recebimento entra no caixa.'),
        ('6b', 'Você abre e fecha o caixa sabendo exatamente quanto entrou.')]},
    {'id': 7, 'cena': 'check-out e relatórios',
     'fala': 'No check-out, tudo fecha com recibo. E os relatórios mostram como a pousada está indo.',
     'api': 'No check-out, tudo fecha com recibo. <break time="0.3s" /> E os relatórios mostram como a pousada está indo.'},
    {'id': 8, 'cena': 'fechamento',
     'fala': 'FAZLO Hospeda. No celular ou no computador. Teste agora na demonstração.',
     'api': 'FAZLO Hospeda. <break time="0.3s" /> No celular ou no computador. <break time="0.25s" /> Teste agora na demonstração.'},
]


def grafia(s):
    for a, b in GRAFIA.items():
        s = re.sub(r'\b%s\b' % re.escape(a), b, s)
    return s


def tts(text, prev, nxt, seed=SEED):
    body = {'text': grafia(text), 'model_id': MODEL, 'voice_settings': SETTINGS, 'seed': seed,
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
    txt = ''.join(ch)
    if txt.rstrip().endswith('/>'):                    # ignora a pausa marcada no fim (<break ... />)
        ch, end = ch[:txt.rindex('<')], end[:txt.rindex('<')]
    for c, e in zip(reversed(ch), reversed(end)):
        if c.strip() and c not in '.…,:;?!':
            return e
    return end[-1]


def fim_silencioso(x, ms=40, limite_db=-45.0):
    """a tomada termina em silêncio? (a API às vezes devolve o áudio cortado no fim da última sílaba)"""
    pk = np.abs(x).max() + 1e-9
    tail = x[-int(ms / 1000 * SR):]
    return 20 * np.log10(np.sqrt((tail ** 2).mean()) / pk + 1e-12) <= limite_db


def texto_da(c):
    return ' '.join(f for _, f in c['frases']) if 'frases' in c else c['fala']


def gerar(so=None):
    """so: só refaz estas cenas (as outras ficam como estão em falas.json)"""
    os.makedirs(OUT, exist_ok=True)
    antes = json.load(open(os.path.join(OUT, 'falas.json')))['falas'] if so else []
    falas = []
    for i, c in enumerate(CENAS):
        if so and c['id'] not in so and not any(pid in so for pid, _ in c.get('frases', [])):
            falas += [f for f in antes if f.get('cena_id', f['id']) == c['id']]
            continue
        prev = texto_da(CENAS[i - 1]) if i else None
        nxt = texto_da(CENAS[i + 1]) if i + 1 < len(CENAS) else None
        # uma chamada por frase (cenas 3 a 6) ou pela fala inteira; o contexto são as frases vizinhas
        partes = c['frases'] if 'frases' in c else [(c['id'], c['fala'])]
        for j, (pid, roteiro) in enumerate(partes):
            if so and c['id'] not in so and pid not in so:          # só algumas frases da cena
                falas += [f for f in antes if f['id'] == pid]
                continue
            p_prev = partes[j - 1][1] if j else prev
            p_nxt = partes[j + 1][1] if j + 1 < len(partes) else nxt
            # o texto enviado pode ter pausas (<break>); cada frase leva uma pausa depois do ponto final, para a
            # voz terminar a última sílaba (sem ela a API devolvia algumas frases cortadas no fim)
            texto = roteiro + ' <break time="0.4s" />' if 'frases' in c else c.get('api', roteiro)
            seed = c.get('seed', SEED)
            x, al, fmt = tts(texto, p_prev, p_nxt, seed)
            for _ in range(4):                          # tomada cortada no fim: tenta a semente seguinte
                if fim_silencioso(x):
                    break
                print(f'  {pid}: a tomada da seed {seed} termina com som (cortada) -> seed {seed + 1}')
                seed += 1
                x, al, fmt = tts(texto, p_prev, p_nxt, seed)
            assert fim_silencioso(x), (pid, 'nenhuma tomada terminou em silêncio')
            wavfile.write(os.path.join(OUT, f'cena-{pid}.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
            falas.append({'id': pid, 'cena_id': c['id'], 'cena': c['cena'], 'seed': seed, 'fala': roteiro,
                          'enviado': grafia(texto), 'formato': fmt, 'duracao_audio': round(len(x) / SR, 3),
                          'fim_da_fala': round(fala_fim(al), 3), 'alinhamento': al})
            print(f'  {pid} ({c["cena"]}): fala {fala_fim(al):.2f} s · {fmt} · "{roteiro}"')
    json.dump({'voz': 'Raquel - For Conversational', 'voice_id': VOICE, 'modelo': MODEL, 'ajustes': SETTINGS, 'seed': SEED,
               'grafia_enviada': GRAFIA, 'falas': falas}, open(os.path.join(OUT, 'falas.json'), 'w'), ensure_ascii=False, indent=1)


# ------------------------------------------------------------------ conferência
def medir():
    D = json.load(open(os.path.join(OUT, 'falas.json')))
    L = ['Narração do institucional — as falas geradas', '',
         f'voz: {D["voz"]} ({D["voice_id"]}) · modelo: {D["modelo"]} · ajustes: {json.dumps(D["ajustes"])} · seed {D["seed"]}',
         f'grafia enviada à API: {D["grafia_enviada"] or "a do roteiro (nenhuma troca)"}', '',
         'Duração de cada fala (velocidade 1,0, sem aceleração):']
    for f in D['falas']:
        L.append(f'  {str(f["id"]):<3} · {f["cena"]:<22} {f["fim_da_fala"]:.2f} s de fala · seed {f.get("seed", D["seed"])} · {f["formato"]} · "{f["enviado"]}"')
    os.makedirs(REV, exist_ok=True)
    open(os.path.join(REV, 'voz.txt'), 'w').write('\n'.join(L) + '\n')
    print('\n'.join(L))


if __name__ == '__main__':
    so = [int(a) if a.isdigit() else a for a in sys.argv[sys.argv.index('--so') + 1].split(',')] if '--so' in sys.argv else None
    if '--medir' not in sys.argv:
        gerar(so)
    medir()
