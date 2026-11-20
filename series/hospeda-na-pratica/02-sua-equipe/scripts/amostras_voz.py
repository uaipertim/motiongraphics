#!/usr/bin/env python3
"""Episódio 2: duas amostras da frase 7 para escolher a pronúncia de "e-mail".
Voz Alexa, eleven_v4, estabilidade 0,50, semelhança 0,75, seed 7100: as mesmas do vídeo curto de venda.
A chave não fica em arquivo: a rede da sessão põe o cabeçalho xi-api-key.
  python3 scripts/amostras_voz.py  ->  aprovacao/vozes/frase7-A-e-mail.mp3 e frase7-B-i-meil.mp3
"""
import json, os, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOZ, MODELO, SEED = 'sXSV9RZ095VZyL64w3ap', 'eleven_v4', 7100
AJ = {'stability': 0.5, 'similarity_boost': 0.75}
AMOSTRAS = {
    'frase7-A-e-mail': 'Coloque o nome, o e-mail e escolha o papel: Administrador, Operação ou Caixa.',
    'frase7-B-i-meil': 'Coloque o nome, o i-mêil e escolha o papel: Administrador, Operação ou Caixa.',
}
for nome, texto in AMOSTRAS.items():
    body = {'text': texto, 'model_id': MODELO, 'voice_settings': AJ, 'seed': SEED}
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOZ}?output_format=mp3_44100_128',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    dados = urllib.request.urlopen(req, timeout=180).read()
    out = os.path.join(ROOT, 'aprovacao', 'vozes', nome + '.mp3')
    open(out, 'wb').write(dados); print(out, len(dados), 'bytes')
