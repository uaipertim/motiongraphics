#!/usr/bin/env python3
"""
Revisão técnica da apresentação do FAZLO Hospeda (roda depois de `render.cjs video --mix audio/mix.wav` e `render.cjs info`).

    python3 scripts/qa.py  ->  output/revisao/relatorio.txt · output/revisao/zonas-seguras.jpg · output/miniatura.jpg (o quadro 0)

Confere:
  • formato: 1080x1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo; 2 a 3 min; vídeo e áudio com a mesma duração;
  • som: −14 LUFS integrados (±0,5), pico real ≤ −1,5 dBTP; a trilha ~10 dB abaixo da voz (8–13 dB);
  • legenda (o motor exporta páginas e caixas a cada 0,25 s em output/info.json): cada página ≥ 1,5 s na tela e a
    anterior sai antes da próxima entrar; toda palavra dentro de x 130–950 e acima de y 1536; a legenda não encosta
    em nenhum elemento da cena; chaves em limão;
  • sincronia: nas palavras que vêm depois de uma pausa (≥ 0,12 s), o instante em que a legenda mostra a palavra fica a
    ≤ 80 ms do início medido no áudio da voz (fim do último silêncio de ≥ 30 ms, 26 dB abaixo do nível da voz — o
    detector do qa.py da Série Fala); e cada página nova aparece no quadro da 1ª palavra (≤ 2 quadros);
  • zonas seguras (pixels de quadros a cada 0,25 s): nada aceso nos 20% de baixo (y > 1536); as caixas do motor dentro
    de y 265–1536 (o vídeo vai pelo WhatsApp: não há a coluna de botões do Reels);
  • miniatura (quadro 0): o centro (círculo de 240 px de raio em volta de 540, 960), onde o WhatsApp põe o play, fica livre;
  • telas: todo recorte vem de hospeda-v2/ e começa abaixo da faixa "Demonstração · Quero usar"; cada tela fica
    ≥ 3,5 s na tela; a última tela de cada cena fica parada ≥ 2,5 s depois do último foco (o tempo de leitura);
  • valores: a legenda mostra "R$ 99,90" e "R$ 79,90" (a voz fala por extenso);
  • grafia oficial: nenhuma grafia fonética ("Hospéda", "Uátsap", "Fázlo") na legenda ou no texto do quadro;
  • a logo entra só depois da última palavra e fecha o vídeo.
"""
import json
import os
import re
import subprocess
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, '..', 'serie-explica', 'scripts'))
from pronuncia import FONETICAS, foneticas_em                   # noqa: E402

OUT = os.path.join(ROOT, 'output'); REV = os.path.join(OUT, 'revisao'); os.makedirs(REV, exist_ok=True)
VIDEO = os.path.join(OUT, 'fazlo-hospeda-apresentacao.mp4')
LN = json.load(open(os.path.join(ROOT, 'linha.json')))
INFO = json.load(open(os.path.join(OUT, 'info.json')))
DUR = LN['duracao']
rep, falhas = [], []


def ok(cond, msg):
    rep.append(('OK     ' if cond else 'FALHA  ') + msg)
    if not cond:
        falhas.append(msg)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def lufs(path):
    e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    s = e[e.rindex('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))


# ---------------------------------------------------------------- formato
rep.append('FORMATO')
pr = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO]).stdout)
v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in pr['streams'] if s['codec_type'] == 'audio'][0]
fps = eval(v['r_frame_rate']); vd = float(v['duration']); ad = float(a['duration'])
ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p' and (v['width'], v['height']) == (1080, 1920) and abs(fps - 60) < 0.01,
   f"vídeo {v['codec_name']} {v['pix_fmt']} {v['width']}x{v['height']} {fps:.0f} fps")
ok(a['codec_name'] == 'aac' and a['sample_rate'] == '48000' and a['channels'] == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz {a['channels']} canais")
ok(120 <= vd <= 180, f'duração {vd:.2f} s (alvo 2 a 3 min)')
ok(abs(vd - ad) < 0.05, f'vídeo e áudio com a mesma duração (Δ {abs(vd - ad) * 1000:.0f} ms)')

# ---------------------------------------------------------------- som
rep.append(''); rep.append('SOM')
I, TP = lufs(VIDEO)
ok(-14.5 <= I <= -13.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
ok(TP <= -1.5, f'pico real {TP:.1f} dBTP (limite −1,5)')
Iv, _ = lufs(os.path.join(ROOT, 'audio', 'voz-tratada.wav')); Im, _ = lufs(os.path.join(ROOT, 'audio', 'musica.wav'))
ok(8 <= Iv - Im <= 13, f'a trilha fica {Iv - Im:.1f} dB abaixo da voz (voz {Iv:.1f} LUFS, trilha {Im:.1f} LUFS; alvo ~10 dB, com ducking)')

# ---------------------------------------------------------------- legenda
rep.append(''); rep.append('LEGENDA')
PG = INFO['legenda']
curtas = [q for q in PG if q['t1'] - q['t0'] < 1.5 - 1e-6]
ok(not curtas, f'{len(PG)} páginas; cada uma fica ≥ 1,5 s na tela (a mais curta: {min(q["t1"] - q["t0"] for q in PG):.2f} s)'
   + ('' if not curtas else ' · curtas: ' + '; '.join(f'"{" / ".join(q["linhas"])}" {q["t1"] - q["t0"]:.2f} s' for q in curtas)))
sob = [i for i in range(len(PG) - 1) if PG[i]['t1'] > PG[i + 1]['t0'] + 1e-6]
ok(not sob, 'a página anterior sai antes da próxima entrar (nenhuma sobreposição)')
ok(any(w['chave'] for q in PG for w in q['palavras']), f'chaves em limão: {sum(w["chave"] for q in PG for w in q["palavras"])} palavras')
fora, encosta = [], []
for s in INFO['caixas']:
    leg = [b for b in s['caixas'] if b['nome'] == 'legenda']
    resto = [b for b in s['caixas'] if b['nome'] not in ('legenda',)]
    for b in leg:
        if b['x0'] < 130 - 0.5 or b['x1'] > 950 + 0.5 or b['y1'] > 1536:
            fora.append((s['t'], b))
        for r in resto:
            if b['x0'] < r['x1'] and b['x1'] > r['x0'] and b['y0'] < r['y1'] and b['y1'] > r['y0']:
                encosta.append((s['t'], r['nome']))
ok(not fora, 'legenda dentro de x 130–950 e acima de y 1536 em todos os quadros amostrados')
ok(not encosta, 'a legenda não encosta em nenhum elemento da cena' + ('' if not encosta else ': ' + ', '.join(f'{t:.2f}s {n}' for t, n in encosta[:6])))

# ---------------------------------------------------------------- sincronia
rep.append(''); rep.append('SINCRONIA')
sr, x = wavfile.read(os.path.join(ROOT, 'audio', 'voz-tratada.wav'))
x = x.astype(float) / 32768
x = x.mean(axis=1) if x.ndim > 1 else x
env = 20 * np.log10(np.sqrt(uniform_filter1d(x ** 2, int(0.01 * sr)) + 1e-12))
ref = np.percentile(env[env > -80], 95)
ws = [w for f in LN['frases'] for w in f['palavras']]
med, sem = [], []
for i, w in enumerate(ws):
    if i == 0 or w['t0'] - ws[i - 1]['t1'] < 0.12:
        continue
    a0, a1 = int((w['t0'] - 0.15) * sr), int((w['t0'] + 0.20) * sr)
    seg = env[max(0, a0): a1]; lim = ref - 26
    q = seg <= lim; fim_q = None; j = len(seg) - 1 - int(0.10 * sr)
    while j >= int(0.03 * sr):
        if q[j - int(0.03 * sr):j + 1].all():
            while j + 1 < len(q) and q[j + 1]:
                j += 1
            fim_q = j + 1; break
        j -= 1
    if fim_q is None or fim_q >= len(seg):
        sem.append(w['w']); continue                                     # sem silêncio real antes: não há pausa para medir
    med.append((w['w'], round(((max(0, a0) + fim_q) / sr - w['t0']) * 1000)))
pior = max((abs(m) for _, m in med), default=0)
ok(pior <= 80, f'voz × legenda: {len(med)} palavras depois de pausa, a {np.mean([abs(m) for _, m in med]):.0f} ms em média e {pior} ms no máximo (limite 80 ms)'
   + (f' · sem silêncio real antes (não medidas): {", ".join(sem)}' if sem else ''))
rep.append('       ' + ' · '.join(f'{w} {m:+d}' for w, m in med))
# a página nova aparece no quadro da 1ª palavra: mudança de pixels na faixa da legenda
fr = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'crop=820:200:130:1260,scale=205:50,format=gray', '-f', 'rawvideo', '-'],
                                  capture_output=True).stdout, np.uint8).reshape(-1, 50, 205).astype(float)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
atraso = []
for i, q in enumerate(PG):
    # se a última palavra da página anterior acendeu logo antes (< 0,15 s), a busca começa 1 quadro antes da página
    # (o fade-in daquela palavra não é a página nova chegando)
    antes = 1 if i and q['t0'] - PG[i - 1]['palavras'][-1]['t0'] < 0.15 else 3
    f0 = int(round(q['t0'] * 60)); win = d[max(0, f0 - antes): f0 + 6]
    k = int(np.argmax(win > 0.6)) + max(0, f0 - antes) + 1 - f0 if (win > 0.6).any() else 99
    atraso.append(k)
ok(all(-1 <= k <= 2 for k in atraso), f'cada página aparece no quadro da 1ª palavra (atraso em quadros: {atraso})')

# ---------------------------------------------------------------- zonas seguras e conteúdo
rep.append(''); rep.append('ZONAS SEGURAS E CONTEÚDO')
fz = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'fps=4,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout,
                   np.uint8).reshape(-1, 1920, 1080)
baixo = sum(1 for f in fz if (f[1537:, :] > 110).sum() > 0)
ok(baixo == 0, f'20% de baixo (y > 1536): nada aceso em {len(fz)} quadros')
cx_fora = [(s['t'], b['nome']) for s in INFO['caixas'] for b in s['caixas'] if b['nome'] != 'legenda' and (b['y0'] < 265 or b['y1'] > 1536)]
ok(not cx_fora, 'todas as caixas da cena entre y 265 e 1536' + ('' if not cx_fora else ': ' + ', '.join(f'{t:.2f}s {n}' for t, n in cx_fora[:6])))
yy, xx = np.mgrid[0:1920, 0:1080]
centro = (xx - 540) ** 2 + (yy - 960) ** 2 <= 240 ** 2
n_centro = int((fz[0][centro] > 110).sum())
ok(n_centro == 0, f'miniatura (quadro 0): o centro onde fica o play (raio 240 px) está livre ({n_centro} pixels acesos)')
TEL = json.load(open(os.path.join(ROOT, 'src', 'telas.json')))
fora_v2 = [n for n, m in TEL.items() if not m['arquivo'].startswith('hospeda-v2/') or not os.path.exists(os.path.join(ROOT, '..', '..', m['arquivo']))]
faixa = [n for n, m in TEL.items() if m['origem'][1] < (160 if 'celular' in m['arquivo'] else 120)]
ok(not fora_v2 and not faixa, f'{len(TEL)} recortes, todos de hospeda-v2/ e abaixo da faixa "Demonstração · Quero usar"' + (f' · fora: {fora_v2 + faixa}' if fora_v2 or faixa else ''))
PL = INFO['plano']['telas']
vis = [(s['nome'], round(s['sai'] - s['entra'], 2)) for s in PL]
ok(min(d for _, d in vis) >= 3.5, f'{len(PL)} telas; cada uma fica ≥ 3,5 s na tela (a menor: {min(vis, key=lambda x: x[1])[0]} {min(d for _, d in vis):.2f} s)')
rep.append('       ' + ' · '.join(f'{n} {d:.1f}s' for n, d in vis))
ult = {}
for s in PL:
    ult[s['cena']] = s
pausa = [(s['cena'], round(s['sai'] - (s['focos'][-1]['t'] if s['focos'] else s['entra']), 2)) for s in ult.values()]
ok(min(d for _, d in pausa) >= 2.5, 'tempo de leitura: a última tela de cada cena fica parada ≥ 2,5 s depois do último foco ('
   + ' · '.join(f'{n} {d:.1f}s' for n, d in pausa) + ')')
precos = [w['w'] for q in PG for w in q['palavras'] if w['w'].startswith('R$')]
ok(precos == ['R$ 99,90', 'R$ 79,90'], f'valores na legenda: {precos} (a voz fala por extenso)')
textos = [w['w'] for q in PG for w in q['palavras']] + [b['nome'] for s in INFO['caixas'] for b in s['caixas']]
achou = sorted({f for s in textos for f in foneticas_em(s)})
ok(not achou, f'grafia oficial: nenhuma grafia fonética ({", ".join(FONETICAS)}) na legenda nem no quadro' + ('' if not achou else ': ' + ', '.join(achou)))
ok(LN['logo'] >= LN['fim_voz'] + 0.05 and DUR - LN['logo'] >= 3.0, f'a logo entra {LN["logo"] - LN["fim_voz"]:.2f} s depois da última palavra e fica {DUR - LN["logo"]:.2f} s até o fim')
fim = [s for s in INFO['caixas'] if s['t'] >= DUR - 1.0]
ok(all(any(b['nome'] == 'logo final' for b in s['caixas']) for s in fim), 'o vídeo termina com a logo')

# ---------------------------------------------------------------- miniatura (quadro 0) e folha das zonas seguras
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', VIDEO, '-frames:v', '1', '-q:v', '3', os.path.join(OUT, 'miniatura.jpg')], check=True)
ts = [0.0] + [round((f['t0'] + f['t1']) / 2, 2) for f in LN['frases']] + [round(DUR - 1, 2)]
TW, TH = 216, 384
folha = Image.new('RGB', (len(ts) * (TW + 8) + 8, TH + 40), (40, 40, 40)); dr = ImageDraw.Draw(folha)
for i, t in enumerate(ts):
    im = Image.fromarray(fz[min(len(fz) - 1, int(round(t * 4)))]).convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); o = ImageDraw.Draw(ov)
    o.rectangle((0, 1537, 1079, 1919), fill=(255, 40, 80, 50)); o.line((130, 0, 130, 1920), fill=(80, 160, 255, 200), width=3); o.line((950, 0, 950, 1920), fill=(80, 160, 255, 200), width=3)
    folha.paste(Image.alpha_composite(im, ov).convert('RGB').resize((TW, TH)), (8 + i * (TW + 8), 8)); dr.text((8 + i * (TW + 8), TH + 14), f'{t:05.2f}s', fill=(175, 250, 39))
folha.save(os.path.join(REV, 'zonas-seguras.jpg'), quality=86)

R = 'RESULTADO: ' + ('aprovado' if not falhas else f'{len(falhas)} falha(s)')
txt = ['APRESENTAÇÃO FAZLO Hospeda — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + rep + ['', R]
open(os.path.join(REV, 'relatorio.txt'), 'w').write('\n'.join(txt) + '\n')
print('\n'.join(txt))
