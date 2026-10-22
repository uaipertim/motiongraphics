#!/usr/bin/env python3
"""
Revisão técnica de um episódio da SÉRIE EXPLICA (roda depois do render e de `render.cjs info`).

    python3 scripts/qa.py explica-01  ->  output/explica-01/revisao/relatorio-tecnico.txt
                                          output/explica-01/revisao/zonas-seguras.jpg

Confere:
  • formato: 1080x1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo; duração de 60–90 s (vídeo e áudio iguais);
  • som: −14 LUFS integrados (±0,5), pico real ≤ −1 dBTP, a voz sozinha na escala da mixagem;
  • sem quadros pretos e sem imagem congelada por 1,5 s ou mais;
  • áreas seguras: (pixels, a cada 0,25 s) nada aceso na coluna de botões x ≥ 950, y 1060–1560; (caixas do motor, a
    cada 0,25 s, fora das trocas de capítulo) todo conteúdo importante — marca, chaveiro, rótulo, título, linha de
    apoio, peças do diagrama, notinha — entre y 265 e 1456 e fora da coluna de botões;
  • nada cobre o conteúdo: a notinha (e a impressora) e o chaveiro não encostam em nenhuma outra caixa; a linha de
    apoio não encosta no diagrama; o cadeado da data não cobre o número do dia;
  • a identidade: a notinha imprime uma linha por capítulo, carimba o check no fim de cada um e imprime "CONTA
    FECHADA ✓" antes de destacar; cada troca tem a passagem com a sineta; o cartão de crédito tem ≈ 70% da área útil
    (mono ≥ 30 px, valor ≥ 56 px); os diagramas chegam perto de y 1400;
  • leitura: cada linha de apoio fica ao menos 1,5 s inteira na tela (do fim da entrada até a próxima);
  • a voz: cada capítulo é UMA geração inteira, colocada sem cortes — o trecho do vídeo é idêntico ao arquivo da
    geração (fora os fades de 8 ms / 60 ms nas pontas), e o arquivo é o mesmo registrado na geração (sha1);
  • a capa é o quadro 0 (o quadro 0 do vídeo bate com capa.png);
  • o fecho (8–9 s): o título, a pergunta e a notinha fechada ficam ≥ 3 s parados antes da logo; nos últimos 3 s, a
    logo oficial centralizada com a sineta, parada (as caixas de texto não mudam de pixel entre fim − 3 s e o fim).
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.io import wavfile
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else 'explica-01'
VIDEO = os.path.join(ROOT, 'output', EP, f'fazlo-hospeda-{EP}.mp4')
AUD = os.path.join(ROOT, 'audio', EP)
OUT = os.path.join(ROOT, 'output', EP, 'revisao')
LN = json.load(open(os.path.join(AUD, 'linha.json')))
MOT = json.load(open(os.path.join(OUT, 'motor.json')))
CX = json.load(open(os.path.join(OUT, 'caixas.json')))
FALAS = json.load(open(os.path.join(AUD, 'voz', 'falas.json')))['capitulos']
FONT = os.path.join(ROOT, 'src', 'fonts', 'JetBrainsMonoNL-Bold.ttf')
DUR = LN['duracao']
report, fails = [], []


def ok(cond, msg):
    report.append(('OK   ' if cond else 'FALHA') + '  ' + msg)
    if not cond:
        fails.append(msg)


def info(msg):
    report.append('       ' + msg)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


# ---------------------------------------------------------------- formato
report.append('FORMATO')
inf = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO]).stdout)
v = next(s for s in inf['streams'] if s['codec_type'] == 'video')
a = next(s for s in inf['streams'] if s['codec_type'] == 'audio')
fps = eval(v['r_frame_rate'])
vd, ad = float(v['duration']), float(a['duration'])
ok(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p', f"vídeo {v['codec_name']} {v.get('profile', '')} {v['pix_fmt']}")
ok((int(v['width']), int(v['height'])) == (1080, 1920), f"resolução {v['width']}x{v['height']} (9:16)")
ok(abs(fps - 60) < 0.01, f'{fps:.0f} fps, {v.get("nb_frames", "?")} quadros')
ok(60 <= vd <= 90, f'duração {vd:.2f} s (alvo 60–90 s)')
ok(a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000 and int(a['channels']) == 2, f"áudio {a['codec_name']} {a['sample_rate']} Hz, {a['channels']} canais, {int(a.get('bit_rate', 0)) // 1000} kb/s")
ok(abs(vd - ad) < 0.05, f'vídeo e áudio com a mesma duração (Δ {abs(vd - ad) * 1000:.0f} ms)')
info(f'arquivo {int(inf["format"]["size"]) / 1e6:.1f} MB, {int(inf["format"]["bit_rate"]) / 1e6:.1f} Mb/s')
info('capítulos: ' + ' · '.join(f'{c["n"]:02d} {c["t1"] - c["t0"]:.1f} s' for c in LN['capitulos']) + f' · trocas de {LN["tr"]:.1f} s')

# ---------------------------------------------------------------- som
report += ['', 'SOM']
e = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
summ = e[e.rindex('Summary:'):]
I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
ok(-14.5 <= I <= -13.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
ok(TP <= -1.0, f'pico real {TP:.1f} dBTP (limite −1)')
for nome, rot in (('voz-tratada', 'a voz sozinha'), ('musica', 'a trilha sozinha'), ('sfx', 'os efeitos sozinhos')):
    f = os.path.join(AUD, nome + '.wav')
    if os.path.exists(f):
        ev = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-']).stderr
        info(f'{rot}, na escala da mixagem: {float(re.search(r"I:\s+(-?[\d.]+) LUFS", ev[ev.rindex("Summary:"):]).group(1)):.1f} LUFS')

# ---------------------------------------------------------------- a voz: uma geração inteira por capítulo, sem emendas
report += ['', 'VOZ (uma geração inteira por capítulo, nada emendado)']
sr, voz = wavfile.read(os.path.join(AUD, 'voz.wav'))
voz = voz.astype(np.float64) / 32768
piores = []
for c in LN['colocacao']:
    key = f'{c["cap"]:02d}'
    srx, y = wavfile.read(os.path.join(AUD, c['arquivo']))
    sha_ok = hashlib.sha1(y.tobytes()).hexdigest() == FALAS[key]['sha1_audio']
    y = y.astype(np.float64) / 32768
    seg = resample_poly(y[int(round(c['de_s'] * srx)):int(round(c['ate_s'] * srx))], sr, srx)
    i = int(round(c['no_video_s'] * sr))
    k0, k1 = int(0.008 * sr), int(0.06 * sr)
    got = voz[i + k0:i + len(seg) - k1]
    ref = seg[k0:len(seg) - k1]
    dif = float(np.abs(got - ref).max()) if len(got) == len(ref) else 9.0
    piores.append(dif)
    nome_hist = FALAS[key]['geracoes']
    ok(sha_ok and dif < 2e-4, f'capítulo {key}: {c["ate_s"] - c["de_s"]:.2f} s contínuos da geração com seed {FALAS[key]["seed"]} '
       f'(arquivo íntegro: {"sim" if sha_ok else "NÃO"}; diferença máxima vídeo × geração {dif:.6f}; {nome_hist} geração(ões) inteiras feitas)')

# ---------------------------------------------------------------- leitura das linhas de apoio
report += ['', 'LEITURA (linhas de apoio: ≥ 1,5 s inteiras na tela)']
curtas = []
for ap in MOT['apoios']:
    tempo = ap['ate'] - ap['inteira_de']
    if tempo < 1.5 - 1e-3:
        curtas.append(ap)
    info(f'cap {ap["cap"]:02d} · apoio {ap["i"]}: {tempo:4.2f} s inteira · "{ap["texto"]}"')
ok(not curtas, f'{len(MOT["apoios"])} linhas de apoio, a mais curta fica {min(ap["ate"] - ap["inteira_de"] for ap in MOT["apoios"]):.2f} s inteira na tela (mínimo 1,5 s)')

# ---------------------------------------------------------------- áreas seguras pelas caixas do motor
report += ['', 'ÁREAS SEGURAS']
trocas = [(x['t0'], x['t1']) for x in MOT['trocas']]
FE = MOT['fecho']
trocas.append((FE['logo_passagem'], FE['logo_pousa']))
em_troca = lambda t: any(a - 0.05 <= t <= b + 0.65 for a, b in trocas)            # troca + a entrada do título
fora, botao, n_cx, n_t = [], [], 0, 0
for s in CX:
    if em_troca(s['t']):
        continue
    n_t += 1
    for b in s['caixas']:
        n_cx += 1
        if b['y0'] < 265 - 0.5 or b['y1'] > 1456 + 0.5:
            fora.append((s['t'], b))
        if b['x1'] > 950 and b['y1'] > 1060 and b['y0'] < 1560:
            botao.append((s['t'], b))
ok(not fora, f'conteúdo importante entre y 265 e 1456: {n_cx} caixas em {n_t} quadros fora das trocas' + ('' if not fora else ' · fora: ' + '; '.join(f'{t:.2f}s {b["nome"]} y {b["y0"]:.0f}–{b["y1"]:.0f}' for t, b in fora[:6])))
ok(not botao, 'nenhuma caixa na coluna de botões (x ≥ 950, y 1060–1560)' + ('' if not botao else ': ' + '; '.join(f'{t:.2f}s {b["nome"]}' for t, b in botao[:6])))
ys = [b['y0'] for s in CX if not em_troca(s['t']) for b in s['caixas']] + [b['y1'] for s in CX if not em_troca(s['t']) for b in s['caixas']]
info(f'faixa usada pelo conteúdo: y {min(ys):.0f}–{max(ys):.0f}')

# pixels: a coluna de botões, quadro a quadro (4 por segundo), streaming
proc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'fps=4,format=gray', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
n_fr, n_but, f0 = 0, 0, None
while True:
    buf = proc.stdout.read(1920 * 1080)
    if len(buf) < 1920 * 1080:
        break
    f = np.frombuffer(buf, np.uint8).reshape(1920, 1080)
    if f0 is None:
        f0 = f.copy()
    n_but += int((f[1060:1560, 950:1080] > 70).sum()); n_fr += 1
proc.wait()
ok(n_but == 0, f'coluna de botões: {n_but} pixel aceso em {n_fr} quadros amostrados (nem a notinha nem a passagem limão passam por ali)')

# quadros pretos / congelados
bd = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-']).stderr
ok(not re.findall(r'black_start', bd), 'sem trechos pretos')
fz = run(['ffmpeg', '-hide_banner', '-nostats', '-i', VIDEO, '-vf', 'freezedetect=n=-60dB:d=1.5', '-an', '-f', 'null', '-']).stderr
fr_ = re.findall(r'freeze_start: ([\d.]+)', fz)
ok(not fr_, 'sem imagem congelada por 1,5 s ou mais (o fundo, a notinha e as peças seguem vivos)' + ('' if not fr_ else ': ' + ', '.join(fr_)))

# ---------------------------------------------------------------- nada cobre o conteúdo
def cobre(a, b, folga=0.0):
    return min(a['x1'], b['x1']) - max(a['x0'], b['x0']) > folga and min(a['y1'], b['y1']) - max(a['y0'], b['y0']) > folga


CAB = ('título', 'rótulo', 'marca', 'chaveiro', 'apoio', 'notinha', 'impressora')
nota_c, chav_c, apoio_c, cad_c = [], [], [], []
for s in CX:
    if em_troca(s['t']):
        continue
    bs = s['caixas']
    for a in bs:
        if a['nome'].startswith(('notinha', 'impressora')):
            nota_c += [(s['t'], b['nome']) for b in bs if not b['nome'].startswith(('notinha', 'impressora')) and cobre(a, b)]
        if a['nome'] == 'chaveiro':
            chav_c += [(s['t'], b['nome']) for b in bs if b['nome'] != 'chaveiro' and cobre(a, b)]
        if a['nome'].startswith('apoio'):
            apoio_c += [(s['t'], b['nome']) for b in bs if b['cap'] == a['cap'] and not b['nome'].startswith(CAB) and cobre(a, b)]
        if a['nome'] == 'cadeado da data':
            cad_c += [(s['t'], b['nome']) for b in bs if b['nome'].startswith('número do dia') and cobre(a, b)]
lst = lambda xs: '' if not xs else ': ' + '; '.join(f'{t:.2f}s {n}' for t, n in xs[:5])
ok(not nota_c, 'a notinha (e a impressora) não cobre nenhum conteúdo' + lst(nota_c))
ok(not chav_c, 'o chaveiro não cobre nenhum conteúdo' + lst(chav_c))
ok(not apoio_c, 'a linha de apoio não encosta no diagrama' + lst(apoio_c))
tipos = [c['diagrama']['tipo'] for c in LN['capitulos']]
if 'calendario' in tipos:
    viu_cad = any(b['nome'] == 'cadeado da data' for s in CX for b in s['caixas'])
    ok(viu_cad and not cad_c, 'o cadeado da data fica no canto da célula, sem cobrir o número do dia' + lst(cad_c))

# ---------------------------------------------------------------- a identidade da série
report += ['', 'IDENTIDADE (notinha, chaveiro, sineta, fecho com a logo)']
NT = MOT['notinha']
itens = [x for x in NT['linhas'] if x['tipo'] == 'item']
ncap = len(LN['capitulos'])
ok(len(itens) == ncap - 1 and all(x['check'] is not None for x in itens), f'a notinha imprime {len(itens)} linhas (uma por capítulo) e carimba um check limão no fim de cada uma')
for x in NT['linhas']:
    info(f'notinha: imprime em {x["imprime"]:6.2f} s · "{x["texto"]}"' + (f' · check em {x["check"]:.2f} s' if x['check'] else ''))
fim_l = [x for x in NT['linhas'] if x['tipo'] == 'fim']
ok(bool(fim_l) and fim_l[0]['imprime'] < NT['rasga'], f'"CONTA FECHADA ✓" impresso em {fim_l[0]["imprime"]:.2f} s; a notinha destaca e sobe em {NT["rasga"]:.2f} s')
viu_ch = {b['cap'] for s in CX for b in s['caixas'] if b['nome'] == 'chaveiro'}
ok(viu_ch >= set(range(1, ncap)), f'o chaveiro "Nº NN" aparece em todos os capítulos 01–{ncap - 1:02d}')
tr_c = [c for c in MOT['cues'] if c['type'] == 'trans']
ok(len(tr_c) == ncap - 1, f'{len(tr_c)} trocas de capítulo, cada uma com a passagem limão e o "ding" da sineta ({LN["tr"]:.1f} s)')
CC = MOT['medidas']['cartao_credito']; util = MOT['medidas']['area_util'][1] - MOT['medidas']['area_util'][0]
cc_box = [b for s in CX for b in s['caixas'] if b['nome'] == 'cartão de crédito']
if 'credito' in tipos: ok(bool(cc_box) and 0.62 <= CC['largura'] / util <= 0.78 and CC['mono_px'] >= 30 and CC['valor_px'] >= 56,
   f'cartão de crédito: {CC["largura"]}×{CC["altura"]} px = {100 * CC["largura"] / util:.0f}% da área útil ({util} px); mono {CC["mono_px"]} px, valor {CC["valor_px"]} px, validade {CC["sub_px"]} px')
alc = []
for c in LN['capitulos'][1:-1]:
    ys = [b['y1'] for s in CX if c['t0'] + 0.7 <= s['t'] <= c['t1'] for b in s['caixas'] if b['cap'] == c['n'] and not b['nome'].startswith(CAB)]
    alc.append((c['n'], max(ys) if ys else 0))
ok(all(y >= 1330 for _, y in alc), 'os diagramas descem até y ≈ 1400: ' + ' · '.join(f'{n:02d} {y:.0f}' for n, y in alc))

# ---------------------------------------------------------------- capa = quadro 0
report += ['', 'CAPA E FECHO']
capa = np.asarray(Image.open(os.path.join(ROOT, 'output', EP, 'capa.png')).convert('L')).astype(float)
mse = float(np.mean((capa - f0.astype(float)) ** 2))
psnr = 99.0 if mse == 0 else 10 * np.log10(255 ** 2 / mse)
ok(psnr > 34, f'a capa é o quadro 0 do vídeo (PSNR {psnr:.1f} dB entre capa.png e o 1º quadro)')
ct = os.path.join(OUT, 'capa.txt')
if os.path.exists(ct):
    res = open(ct).read().strip().splitlines()[-1]
    ok('dentro da regra' in res, f'regra das capas (revisao/capa.txt): {res.replace("RESULTADO: ", "")}')

# ---------------------------------------------------------------- fecho: título + pergunta ≥ 3 s parados; a logo nos últimos 3 s
fc = LN['capitulos'][-1]
ok(8.0 <= fc['t1'] - fc['t0'] <= 9.0 + 1e-3, f'fecho de {fc["t1"] - fc["t0"]:.2f} s (8–9 s)')


def frame_at(t):
    with tempfile.TemporaryDirectory() as tmp:
        pth = os.path.join(tmp, 'f.png')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', VIDEO, '-frames:v', '1', pth], check=True)
        return np.asarray(Image.open(pth).convert('L')).astype(float)


def parado(t_a, t_b, nomes, so_texto=False):
    """diferença média entre dois quadros dentro das caixas; com so_texto, só nos pixels do texto/logo (claros no quadro final),
    para que o fundo vivo e o anel da sineta em volta não contem"""
    amostra = min(CX, key=lambda s: abs(s['t'] - (t_b - 0.1)))
    cxs = [b for b in amostra['caixas'] if b['nome'].startswith(nomes)]
    fa, fb = frame_at(t_a), frame_at(t_b)
    difs = []
    for b in cxs:
        x0, x1, y0, y1 = int(max(0, b['x0'])), int(min(1080, b['x1'])), int(max(0, b['y0'])), int(min(1920, b['y1']))
        d = np.abs(fa[y0:y1, x0:x1] - fb[y0:y1, x0:x1])
        m = fb[y0:y1, x0:x1] > 90 if so_texto else np.ones_like(d, bool)
        difs.append((b['nome'], float(d[m].mean()) if m.any() else 0.0))
    return difs


de, ate = FE['texto_de'], FE['texto_ate']
NOMES1 = ('título', 'rótulo', 'chaveiro', 'apoio', 'pergunta, linha', 'notinha')
d1 = parado(de + 0.02, ate - 0.05, NOMES1, so_texto=True)
mx1 = max(d for _, d in d1) if d1 else 99
d1c = parado(de + 0.02, ate - 0.05, NOMES1)
ok(ate - de >= 3.0 and mx1 < 3.0, f'fecho, fase do texto: título, pergunta e notinha fechada parados de {de:.2f} a {ate:.2f} s ({ate - de:.2f} s, mínimo 3 s); '
   f'os pixels do texto de {len(d1)} caixas iguais (maior diferença média {mx1:.2f} de 255)')
info('nas caixas inteiras (com o brilho do fundo, que respira por trás): maior diferença média ' + f'{max(d for _, d in d1c):.2f}')
ult = FE['ultima_mudanca_de_texto']
d2 = parado(DUR - 3.0, DUR - 0.08, ('logo final', 'nome final', '@ final'), so_texto=True)
mx2 = max(d for _, d in d2) if d2 else 99
d2c = parado(DUR - 3.0, DUR - 0.08, ('logo final', 'nome final', '@ final'))
sino = [c for c in MOT['cues'] if c['type'] == 'bell']
ok(len(d2) == 3 and DUR - ult >= 3.0 and mx2 < 3.0 and sino and abs(sino[-1]['t'] - FE['logo_pousa']) < 0.02,
   f'fecho, últimos 3 s: a logo oficial centralizada pousa com a sineta em {FE["logo_pousa"]:.2f} s e fica parada {DUR - ult:.2f} s '
   f'(os pixels da logo, de "FAZLO Hospeda" e do @ iguais entre {DUR - 3:.2f} s e o fim; maior diferença média {mx2:.2f} de 255)')
info('nas caixas inteiras (com o fundo e o anel da sineta em volta): ' + ' · '.join(f'{n} {d:.2f}' for n, d in d2c))
voz_fim = fc['voz_t1']
ok(FE['logo_passagem'] >= voz_fim + 0.05, f'a logo só entra depois da última palavra: a voz do fecho termina em {voz_fim:.2f} s e a passagem para a logo começa em {FE["logo_passagem"]:.2f} s ({FE["logo_passagem"] - voz_fim:.2f} s depois)')

# ---------------------------------------------------------------- folha das zonas seguras
font = ImageFont.truetype(FONT, 26)
CHECK_T = [0.0] + [round(c['t1'] - 0.2, 2) for c in LN['capitulos']]
with tempfile.TemporaryDirectory() as tmp:
    TW, TH, COLS = 300, 533, 6
    rows = (len(CHECK_T) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * (TW + 10) + 10, rows * (TH + 44) + 10), (40, 40, 40))
    dr = ImageDraw.Draw(sheet)
    for i, t in enumerate(CHECK_T):
        pth = os.path.join(tmp, f'{i}.png')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', VIDEO, '-frames:v', '1', pth], check=True)
        im = Image.open(pth).convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        d.rectangle((950, 1060, 1079, 1559), fill=(255, 40, 80, 70), outline=(255, 40, 80, 255), width=4)
        d.rectangle((0, 0, 1079, 264), fill=(255, 40, 80, 50)); d.rectangle((0, 1457, 1079, 1919), fill=(255, 40, 80, 30))
        im = Image.alpha_composite(im, ov).convert('RGB').resize((TW, TH), Image.LANCZOS)
        x0, y0 = 10 + (i % COLS) * (TW + 10), 10 + (i // COLS) * (TH + 44)
        sheet.paste(im, (x0, y0)); dr.text((x0, y0 + TH + 8), f'{t:05.2f}s', font=font, fill=(175, 250, 39))
    sheet.save(os.path.join(OUT, 'zonas-seguras.jpg'), quality=88)

res = 'RESULTADO: ' + ('aprovado' if not fails else f'{len(fails)} falha(s)')
txt = [f'SÉRIE EXPLICA · {EP} — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + report + ['', res]
open(os.path.join(OUT, 'relatorio-tecnico.txt'), 'w').write('\n'.join(txt) + '\n')
print('\n'.join(txt))
