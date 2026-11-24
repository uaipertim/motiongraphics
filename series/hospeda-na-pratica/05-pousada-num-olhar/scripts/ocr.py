#!/usr/bin/env python3
"""OCR (Tesseract, português) para procurar texto proibido.
    python3 scripts/ocr.py telas            -> confere as capturas em telas/*.png
    python3 scripts/ocr.py video [passo_s]  -> confere quadros do vídeo (a cada passo_s, padrão 0,25 s) nos trechos com tela
Proibido: fazlodigital, Demo/Demonstração, Quero usar, código, token, senha, "João Caixa", "Mariana Recepção", nome de pousada em
caixa alta, link (http, .ics, iCal), e-mail (@ seguido de domínio) e os erros de exemplo dos canais ("não consegue ler",
"Confira o link", "não lê o calendário", "Confira se o link").
Resultado em output/revisao/ocr-<modo>.json."""
import json, os, re, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROIBIDO = [r'fazlo\s*digital', r'\bdemo\b', r'demonstra', r'quero\s+usar', r'c[oó]digo', r'token', r'senha', r'https?://', r'\.ics\b', r'\bical\b', r'POUSADA',
            r'jo[aã]o\s+caixa', r'mariana\s+recep', r'\w@\w+\.\w', r'n[aã]o\s+consegue\s+ler', r'confira\s+o\s+link', r'n[aã]o\s+l[eê]\s+o\s+calend', r'confira\s+se\s+o\s+link']
def ocr(png):
    return subprocess.run(['tesseract', png, '-', '-l', 'por', '--psm', '11'], capture_output=True, text=True).stdout
def achados(texto, com_senha=True):
    out = []
    for p in PROIBIDO:
        if p == 'senha' and not com_senha: continue
        flags = 0 if p == 'POUSADA' else re.I
        out += [m.group(0) for m in re.finditer(p, texto, flags)]
    return out
modo = sys.argv[1]
os.makedirs(os.path.join(ROOT, 'output', 'revisao'), exist_ok=True)
res = {}
if modo == 'telas':
    for f in sorted(os.listdir(os.path.join(ROOT, 'telas'))):
        if f.endswith('.png'):
            t = ocr(os.path.join(ROOT, 'telas', f)); res[f] = {'achados': achados(t), 'letras_lidas': len(t)}
else:
    passo = float(sys.argv[2]) if len(sys.argv) > 2 else 0.25
    info = json.load(open(os.path.join(ROOT, 'output', 'info.json')))
    trechos = info['telas']
    t0, t1 = min(s['t0'] for s in trechos) - 0.25, max(s['t1'] for s in trechos)
    video = os.path.join(ROOT, 'output', 'hospeda-na-pratica-05-pousada-num-olhar.mp4')
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t0:.3f}', '-to', f'{t1:.3f}', '-i', video, '-vf', f'fps={1 / passo}', os.path.join(d, 'q%05d.png')], check=True)
        for i, f in enumerate(sorted(os.listdir(d))):
            t = round(t0 + i * passo, 3); tx = ocr(os.path.join(d, f)); res[f't={t:.2f}'] = {'achados': achados(tx), 'letras_lidas': len(tx)}
ruins = {k: v for k, v in res.items() if v['achados']}
json.dump({'modo': modo, 'quadros': len(res), 'com_achados': ruins, 'todos': res}, open(os.path.join(ROOT, 'output', 'revisao', f'ocr-{modo}.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps({'modo': modo, 'quadros': len(res), 'com_achados': ruins}, ensure_ascii=False, indent=1))
