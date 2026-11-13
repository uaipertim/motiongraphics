"""Escrita/leitura mínima de WAV PCM 24 bits (sem dependências externas além do numpy)."""
import struct
import numpy as np


def escreve(caminho, x, sr):
    x = np.clip(np.asarray(x, dtype=np.float64), -1.0, 1.0 - 2 ** -23)
    if x.ndim == 1:
        x = x[:, None]
    nc = x.shape[1]
    q = np.round(x * (2 ** 23)).astype(np.int32)
    b = q.astype('<i4').view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with open(caminho, 'wb') as f:
        f.write(b'RIFF' + struct.pack('<I', 36 + len(b)) + b'WAVE')
        f.write(b'fmt ' + struct.pack('<IHHIIHH', 16, 1, nc, sr, sr * nc * 3, nc * 3, 24))
        f.write(b'data' + struct.pack('<I', len(b)) + b)
