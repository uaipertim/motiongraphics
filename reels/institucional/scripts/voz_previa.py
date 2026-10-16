#!/usr/bin/env python3
"""
Prévia da narração do institucional (só a voz, sem trilha): as 8 falas nas posições do vídeo (60 s).

    python3 scripts/voz_previa.py   -> output/revisao/voz-previa.mp3

As posições são o início da janela de cada cena (scripts/voz.py), as mesmas que o motor usa.
Loudness: −16 LUFS integrado (a mixagem final, com a trilha, fica em −14 LUFS).
"""
import json
import os
import subprocess
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 44100, 60.0
D = json.load(open(os.path.join(ROOT, 'audio', 'voz', 'falas.json')))
mix = np.zeros(int(SR * DUR), np.float32)
for f in D['falas']:
    sr, x = wavfile.read(os.path.join(ROOT, 'audio', 'voz', f'cena-{f["id"]}.wav'))
    x = x.astype(np.float32) / 32768
    i = int(round(f['janela'][0] * SR))
    mix[i:i + len(x)] += x[:len(mix) - i]
tmp = os.path.join(ROOT, 'output', 'revisao', '_voz.wav')
os.makedirs(os.path.dirname(tmp), exist_ok=True)
wavfile.write(tmp, SR, np.round(np.clip(mix, -1, 1) * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', str(SR),
                '-c:a', 'libmp3lame', '-b:a', '160k', os.path.join(ROOT, 'output', 'revisao', 'voz-previa.mp3')], check=True)
os.remove(tmp)
print('output/revisao/voz-previa.mp3')
