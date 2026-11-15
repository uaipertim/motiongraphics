#!/usr/bin/env python3
"""Master: saturação suave + limitador com lookahead + ganho até −14 LUFS, conferindo no MP4 final (depois do AAC).
uso: python3 src/master.py build/trilha_bruta.npy build/video_mudo.mp4 output/experimento.mp4"""
import numpy as np, subprocess, sys, re, wave
SR = 48000
raw, vid, out = sys.argv[1:4]
x0 = np.load(raw).astype(np.float64)

def limiter(x, thr):
    w = 240; pk = np.max(np.abs(x), axis=0)
    env = np.lib.stride_tricks.sliding_window_view(np.pad(pk, (w, w), mode='edge'), 2 * w + 1).max(axis=1)
    g = np.minimum(1.0, thr / np.maximum(env, 1e-9))
    g = np.convolve(np.pad(g, w // 2, mode='edge'), np.ones(w + 1) / (w + 1), 'valid')[:x.shape[1]]
    return x * g
def wav(path, x):
    d = (np.clip(x, -1, 1) * (2 ** 23 - 1)).astype(np.int32).T.reshape(-1)
    b = np.empty((len(d), 3), np.uint8); b[:, 0] = d & 255; b[:, 1] = (d >> 8) & 255; b[:, 2] = (d >> 16) & 255
    with wave.open(path, 'wb') as f: f.setnchannels(2); f.setsampwidth(3); f.setframerate(SR); f.writeframes(b.tobytes())
def measure(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = r[r.rfind('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1)), float(re.search(r'LRA:\s+(-?[\d.]+) LU', s).group(1))
def build(gdb, thr_db):
    x = np.tanh(x0 * 10 ** (gdb / 20) * 1.0) ; x = limiter(x, 10 ** (thr_db / 20))
    wav('build/trilha.wav', x)
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', vid, '-i', 'build/trilha.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out], check=True)
    return measure(out)
g, thr = -6.0, -3.2
for it in range(8):
    I, TP, LRA = build(g, thr); print(f'iter {it}: ganho {g:+.2f} dB, teto {thr:.1f} dBFS → I={I} LUFS, TP={TP} dBTP, LRA={LRA}')
    if abs(I + 14) <= 0.1 and TP <= -1.5: break
    if TP > -1.5: thr -= (TP + 1.6)
    g += (-14 - I)
print(f'FINAL (medido no MP4): I={I} LUFS, pico real={TP} dBTP, LRA={LRA} LU')
