"""
Segmentação de pessoa (mediapipe, modelo "selfie multiclass 256×256": fundo, cabelo, pele do corpo, rosto, roupa,
outros) e o refinamento da borda por guided filter na imagem em resolução cheia.

Usado por scripts/base.py (P2: as mãos/polegares na frente da tela do celular) e scripts/recorte.py (P4: a
personagem na frente dos cartões). O modelo é baixado uma vez para midia/modelos/ (fora do git).
"""
import os, urllib.request
import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'
MODELO = os.path.join(ROOT, 'midia', 'modelos', 'selfie_multiclass_256x256.tflite')
CLASSES = ['fundo', 'cabelo', 'pele', 'rosto', 'roupa', 'outros']
_seg = None


def segmentador():
    global _seg
    if _seg is None:
        if not os.path.exists(MODELO):
            os.makedirs(os.path.dirname(MODELO), exist_ok=True); urllib.request.urlretrieve(URL, MODELO)
        import mediapipe as mp
        from mediapipe.tasks.python import vision, BaseOptions
        _seg = (mp, vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
            base_options=BaseOptions(model_asset_path=MODELO), output_category_mask=True, output_confidence_masks=True)))
    return _seg


def confiancas(rgb):
    """rgb uint8 (h, w, 3) -> dict classe -> confiança float32 (h, w), na resolução da imagem"""
    mp, seg = segmentador()
    r = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
    return {n: np.array(m.numpy_view(), np.float32).squeeze() for n, m in zip(CLASSES, r.confidence_masks)}


def guiado(guia, p, r=8, eps=1e-3):
    """guided filter (He et al.): a máscara p segue as bordas da imagem guia (cinza 0–1)"""
    f = lambda x: cv2.boxFilter(x, -1, (2 * r + 1, 2 * r + 1))
    mI, mp_ = f(guia), f(p); cov = f(guia * p) - mI * mp_; var = f(guia * guia) - mI * mI
    a = cov / (var + eps); b = mp_ - a * mI
    return np.clip(f(a) * guia + f(b), 0, 1)
