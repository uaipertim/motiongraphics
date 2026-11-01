#!/usr/bin/env python3
"""
V4 — o silêncio final do P5 sem trecho de trás para frente: midia/plano5.mp4 (principal) e, depois de uma fusão de
6 quadros, midia/plano5-alt.mp4 (reserva) no trecho silencioso equivalente, até ~7,6 s.

    python3 scripts/emenda_p5.py   -> midia/emenda-p5.json (o par de quadros, a diferença medida, os olhos)

- Olhos: mediapipe face landmarker (blendshapes eyeBlinkLeft/Right) em todos os quadros das duas fontes; "aberto" =
  piscada < 0,35 nos dois olhos.
- O par (m, a): a fusão usa principal m−5…m sobre reserva a−5…a. Escolhe o menor erro médio no enquadramento do P5
  (janela do zoom de 114 %), com os olhos abertos nos 6 quadros dos dois lados (nenhuma piscada cortada ao meio),
  a principal só depois do fim da fala (5,37 s) e até o quadro 193 (os seguintes repetem e pulam), a reserva dentro
  do silêncio dela (5,37–7,6 s) e com o plano longo o bastante para o cartão final ficar ≥ 2,5 s legível.
"""
import json, os, subprocess
import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOD = os.path.join(ROOT, 'midia', 'modelos', 'face_landmarker.task')
URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
if not os.path.exists(MOD):
    import urllib.request; urllib.request.urlretrieve(URL, MOD)
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
fl = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=MOD), output_face_blendshapes=True, num_faces=1))


def quadros(arq):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'midia', arq), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 832, 448, 3)


def piscada(v):
    out = []
    for fr in v:
        r = fl.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(fr)))
        bs = {c.category_name: c.score for c in r.face_blendshapes[0]} if r.face_blendshapes else {}
        out.append(max(bs.get('eyeBlinkLeft', 1), bs.get('eyeBlinkRight', 1)))
    return np.array(out)


M, A = quadros('plano5.mp4'), quadros('plano5-alt.mp4')
pM, pA = piscada(M), piscada(A)
janela = lambda v: cv2.resize(cv2.cvtColor(v[0:699, 27:420], cv2.COLOR_RGB2GRAY), (131, 233), interpolation=cv2.INTER_AREA).astype(np.float32)
gM = np.array([janela(f) for f in M]); gA = np.array([janela(f) for f in A])
N, ALT_FIM, CARTAO_MIN = 6, int(7.6 * 25), 2.5
FALA_FIM = 5.37                                                                     # a última palavra termina aqui (nas duas fontes)
melhor = None
for m in range(int((FALA_FIM + 0.1) * 25) + N, 194):
    for a in range(int((FALA_FIM + 0.1) * 25) + N, ALT_FIM - 10):
        dur = (m + 1 + ALT_FIM - a) / 25                                            # duração do P5 inteiro
        if dur - (FALA_FIM + 0.5 + 0.45) < CARTAO_MIN + 0.1: continue               # o cartão (0,5 s depois da fala + entrada) fica ≥ 2,5 s
        if (pM[m - N + 1:m + 1] > 0.35).any() or (pA[a - N + 1:a + 1] > 0.35).any(): continue
        e = float(np.abs(gM[m - N + 1:m + 1] - gA[a - N + 1:a + 1]).mean())
        if melhor is None or e < melhor[0]: melhor = (e, m, a, dur)
e, m, a, dur = melhor
res = {'principal_ate': m, 'reserva_de': a, 'reserva_ate': ALT_FIM, 'fusao_quadros': N, 'duracao_p5': round(dur, 3),
       'diferenca_media_cinza': round(e, 2), 'piscada_max_na_fusao': [round(float(pM[m - N + 1:m + 1].max()), 3), round(float(pA[a - N + 1:a + 1].max()), 3)],
       'piscada_principal': [round(float(x), 3) for x in pM], 'piscada_reserva': [round(float(x), 3) for x in pA]}
json.dump(res, open(os.path.join(ROOT, 'midia', 'emenda-p5.json'), 'w'))
print(f'emenda P5: principal até o quadro {m} ({m / 25:.2f} s) → reserva desde o {a} ({a / 25:.2f} s), fusão de {N} quadros; '
      f'diferença média {e:.2f} níveis de cinza; piscada máx. na fusão {res["piscada_max_na_fusao"]}; P5 com {dur:.2f} s')
