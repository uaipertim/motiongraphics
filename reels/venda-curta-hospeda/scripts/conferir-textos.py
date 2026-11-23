#!/usr/bin/env python3
"""Conferência de texto do vídeo curto (revisão de 23/11/2026).
    python3 scripts/conferir-textos.py plano [passo_s]      -> quadros do plano atual, renderizados (sem render final)
    python3 scripts/conferir-textos.py video <arquivo.mp4>  -> quadros do vídeo pronto
OCR (Tesseract, português) em um quadro a cada passo_s (padrão 0,25 s). Recusa qualquer quadro com texto proibido:
 - erro de exemplo da Demo: "não consegue ler", "Confira o link", "não lê o calendário", "Confira se o link";
 - promessas proibidas: "na hora", "em tempo real", "sincronização instantânea", "nunca mais vende duas vezes",
   "traz as reservas com os dados do hóspede";
 - demonstração e dados: fazlodigital, "Demo"/"Demonstração", "Quero usar", e-mail, link (http, .ics), token, senha.
Também confere a narração (o texto da tela/legenda e o enviado à voz) contra as promessas proibidas.
Resultado: output/revisao/textos-<modo>.json; sai com erro se houver achados."""
import json, os, re, subprocess, sys, tempfile, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ERRO_DEMO = [r'não\s+consegue\s+ler', r'confira\s+o\s+link', r'não\s+lê\s+o\s+calend', r'confira\s+se\s+o\s+link']
PROMESSA = [r'\bna\s+hora\b', r'em\s+tempo\s+real', r'sincroniza\w*\s+instant', r'nunca\s+mais\s+vend', r'dados\s+do\s+h[óo]spede']
DEMO = [r'fazlo\s*digital', r'\bdemo\b', r'demonstra', r'quero\s+usar', r'\S+@\S+\.\w', r'https?://', r'\.ics\b', r'token', r'senha']
def achados(t):
    t = re.sub(r'\s+', ' ', t)
    return [(g, m.group(0)) for g, ps in (('erro de exemplo da Demo', ERRO_DEMO), ('promessa proibida', PROMESSA), ('demonstração/dados', DEMO)) for p in ps for m in re.finditer(p, t, re.I) if not (g == 'demonstração/dados' and '@fazlohospeda' in m.group(0))]
def ocr(png): return subprocess.run(['tesseract', png, '-', '-l', 'por', '--psm', '11'], capture_output=True, text=True).stdout
modo = sys.argv[1]; res = {}
R = json.load(open(os.path.join(ROOT, 'roteiro.json')))
narr = ' '.join(t['fala'] for f in R['frases'] for t in f['tokens'])
fala = [g for g in achados(narr) if g[0] == 'promessa proibida']
with tempfile.TemporaryDirectory() as d:
    if modo == 'plano':
        passo = float(sys.argv[2]) if len(sys.argv) > 2 else 0.25
        dur = json.load(open(os.path.join(ROOT, 'linha.json')))['duracao']; ts = [round(k * passo, 3) for k in range(int(dur / passo) + 1)]
        subprocess.run(['node', os.path.join(ROOT, 'scripts', 'quadros.cjs'), ','.join(map(str, ts))], cwd=ROOT, capture_output=True, check=True)
        pngs = sorted(glob.glob(os.path.join(ROOT, 'output', 'quadros', 't*.png')), key=lambda f: float(os.path.basename(f)[1:-4]))
        quadros = [(float(os.path.basename(f)[1:-4]), f) for f in pngs]
    else:
        passo = 0.25
        subprocess.run(['ffmpeg', '-v', 'error', '-i', sys.argv[2], '-vf', f'fps={1 / passo}', os.path.join(d, 'q%05d.png')], check=True)
        quadros = [(round(i * passo, 2), f) for i, f in enumerate(sorted(glob.glob(os.path.join(d, 'q*.png'))))]
    for t, f in quadros:
        a = achados(ocr(f))
        if a: res[f'{t:.2f}'] = a
plano = json.load(open(os.path.join(ROOT, 'telas', 'inicio-conflito.json')))
out = {'modo': modo, 'quadros': len(quadros), 'narracao_promessas_proibidas': fala, 'quadros_com_achados': res,
       'inicio_conflito_a_recapturar': plano.get('a_recapturar', False)}
os.makedirs(os.path.join(ROOT, 'output', 'revisao'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'output', 'revisao', f'textos-{modo}.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in out.items() if k != 'quadros_com_achados'}, ensure_ascii=False))
for t, a in res.items(): print(f'  {t} s: {a}')
sys.exit(1 if (res or fala) else 0)
