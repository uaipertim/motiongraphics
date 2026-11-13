#!/usr/bin/env python3
"""
Revisão técnica do educativo "confirmacao" (roda depois de `render.cjs video --mix audio/mix.wav` e `render.cjs info`).

    python3 scripts/qa.py  ->  output/revisao/relatorio.txt · output/revisao/zonas-seguras.jpg
                               output/capa.png + capa.jpg (o quadro 0) e a revisão da capa (../../tools/revisao_capa.py)

Confere:
  • formato: 1080x1920, 60 fps, H.264 yuv420p, AAC 48 kHz estéreo; 30–40 s; vídeo e áudio com a mesma duração;
  • som: −14 LUFS integrados (±0,5), pico real ≤ −1,5 dBTP; a trilha ~10 dB abaixo da voz (8–13 dB);
  • legenda (o motor exporta páginas e caixas a cada 0,25 s em output/info.json): cada página ≥ 1,5 s na tela e a
    anterior sai antes da próxima entrar; toda palavra dentro de x 130–950 e acima de y 1536; a legenda não encosta
    em nenhum elemento da cena; chaves em limão;
  • sincronia: nas palavras que vêm depois de uma pausa (≥ 0,12 s), o instante em que a legenda mostra a palavra fica a
    ≤ 80 ms do início medido no áudio da voz (fim do último silêncio de ≥ 30 ms, 26 dB abaixo do nível da voz — o
    detector do qa.py da Série Fala); e cada página nova aparece no quadro da 1ª palavra (≤ 2 quadros);
  • zonas seguras (pixels de quadros a cada 0,25 s): nada aceso na coluna de botões (x > 940, y > 1000) nem nos
    20% de baixo (y > 1536); as caixas do motor dentro de y 265–1536;
  • grafia oficial: nenhuma grafia fonética ("Hospéda", "Uátsap", "Fázlo") na legenda ou no texto do quadro;
  • "Exemplo fictício" visível em todo quadro que mostra um dado (mensagem ou ficha);
  • a logo entra só depois da última palavra e fecha o vídeo; a capa é o quadro 0.
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
sys.path.insert(0, os.path.join(ROOT, '..', '..', 'serie-explica', 'scripts'))
from pronuncia import FONETICAS, foneticas_em                   # noqa: E402

OUT = os.path.join(ROOT, 'output'); REV = os.path.join(OUT, 'revisao'); os.makedirs(REV, exist_ok=True)
VIDEO = os.path.join(OUT, 'confirmacao.mp4')
LN = json.load(open(os.path.join(ROOT, 'linha.json')))
INFO = json.load(open(os.path.join(OUT, 'info.json')))
DUR = LN['duracao']
rep, falhas = [], []
DADO = lambda n: n.startswith('valor')


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
ok(30 <= vd <= 40, f'duração {vd:.2f} s (alvo 30–40 s)')
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
ok(not fora, 'legenda dentro de x 130–950 (as linhas até x 936; a coluna de botões começa em x > 940) e acima de y 1536 em todos os quadros amostrados')
ok(not encosta, 'a legenda não encosta em nenhum elemento da cena' + ('' if not encosta else ': ' + ', '.join(f'{t:.2f}s {n}' for t, n in encosta[:6])))

# ---------------------------------------------------------------- sincronia
rep.append(''); rep.append('SINCRONIA')
sr, x = wavfile.read(os.path.join(ROOT, 'audio', 'voz-tratada.wav'))
x = x.astype(float) / 32768
x = x.mean(axis=1) if x.ndim > 1 else x
env = 20 * np.log10(np.sqrt(uniform_filter1d(x ** 2, int(0.01 * sr)) + 1e-12))
ref = np.percentile(env[env > -80], 95)
ws = [w for f in LN['frases'] if f['id'] not in LN.get('sem_legenda', []) for w in f['palavras']]   # a frase sem legenda (CTA) não entra
med, sem = [], []
for i, w in enumerate(ws):
    if i == 0 or w['t0'] - ws[i - 1]['t1'] < 0.12:
        continue
    a0, a1 = int((w['t0'] - 0.15) * sr), int((w['t0'] + 0.20) * sr)
    seg = env[max(0, a0): a1]; lim = ref - 26
    q = seg <= lim; fim_q = None; j = min(len(seg) - 1, int((w['t0'] + 0.09) * sr) - max(0, a0))   # busca até 90 ms depois da palavra: a oclusão de um 't' dentro dela não é pausa
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
for q in PG:
    f0 = int(round(q['t0'] * 60)); win = d[max(0, f0 - 3): f0 + 6]
    k = int(np.argmax(win > 0.6)) + max(0, f0 - 3) + 1 - f0 if (win > 0.6).any() else 99
    atraso.append(k)
ok(all(-1 <= k <= 2 for k in atraso), f'cada página aparece no quadro da 1ª palavra (atraso em quadros: {atraso})')

# ---------------------------------------------------------------- zonas seguras e conteúdo
rep.append(''); rep.append('ZONAS SEGURAS E CONTEÚDO')
fz = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'fps=4,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout,
                   np.uint8).reshape(-1, 1920, 1080)
n_but = int(sum((f[1001:1560, 941:] > 70).sum() for f in fz))
baixo = sum(1 for f in fz if (f[1537:, :] > 110).sum() > 0)
ok(n_but == 0, f'coluna de botões (x > 940, y > 1000): {n_but} pixel aceso em {len(fz)} quadros')
ok(baixo == 0, f'20% de baixo (y > 1536): nada aceso em {len(fz)} quadros')
cx_fora = [(s['t'], b['nome']) for s in INFO['caixas'] for b in s['caixas'] if b['nome'] != 'legenda' and (b['y0'] < 200 or b['y1'] > 1536 or (b['x1'] > 940 and b['y1'] > 1000))]
ok(not cx_fora, 'todas as caixas da cena entre y 200 e 1536 e fora da coluna de botões' + ('' if not cx_fora else ': ' + ', '.join(f'{t:.2f}s {n}' for t, n in cx_fora[:6])))
textos = [w['w'] for q in PG for w in q['palavras']] + [json.dumps(LN['exemplo'], ensure_ascii=False)] + [b['nome'] for s in INFO['caixas'] for b in s['caixas']]
achou = sorted({f for s in textos for f in foneticas_em(s)})
ok(not achou, f'grafia oficial: nenhuma grafia fonética ({", ".join(FONETICAS)}) na legenda nem no quadro' + ('' if not achou else ': ' + ', '.join(achou)))
sem_selo = [s['t'] for s in INFO['caixas'] if any(DADO(b['nome']) for b in s['caixas']) and not any(b['nome'] == 'exemplo fictício' for b in s['caixas'])]
com_dado = sum(1 for s in INFO['caixas'] if any(DADO(b['nome']) for b in s['caixas']))
ok(not sem_selo, f'"Exemplo fictício" visível em todos os {com_dado} quadros amostrados que mostram dado' + ('' if not sem_selo else f': falta em {sem_selo[:6]}'))
ok(LN['logo'] >= LN['fim_voz'] + 0.05 and DUR - LN['logo'] >= 3.0, f'a logo entra {LN["logo"] - LN["fim_voz"]:.2f} s depois da última palavra e fica {DUR - LN["logo"]:.2f} s até o fim')
fim = [s for s in INFO['caixas'] if s['t'] >= DUR - 1.0]
ok(all(any(b['nome'] == 'logo final' for b in s['caixas']) for s in fim), 'o vídeo termina com a logo')

# ---------------------------------------------------------------- divisão da legenda
rep.append(''); rep.append('DIVISÃO DA LEGENDA (quebras só em pausa ou pontuação; nenhuma linha termina em artigo, preposição ou conjunção)')
FUNC = {'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'pelo', 'pela', 'para', 'por', 'com', 'e', 'ou', 'que', 'se', 'mas', 'nem', 'esta', 'esse', 'essa'}
todas = [w for f in LN['frases'] if f['id'] not in LN.get('sem_legenda', []) for w in f['palavras']]
SL = [(f, (LN['frases'][i + 1]['palavras'][0]['t0'] if i + 1 < len(LN['frases']) else DUR)) for i, f in enumerate(LN['frases']) if f['id'] in LN.get('sem_legenda', [])]
viol = [(f['id'], q['linhas'][0]) for f, fim in SL for q in PG if q['t0'] < fim - 1e-6 and q['t1'] > f['palavras'][0]['t0'] + 1e-6]
ok(not viol, 'sem legenda nas frases que a cena já mostra como texto principal (regra da série): '
   + '; '.join(f'"{" ".join(w["w"] for w in f["palavras"])}" {f["palavras"][0]["t0"]:.2f}–{fim:.2f} s' for f, fim in SL)
   + ('' if not viol else ' · página por cima: ' + ', '.join(f'{a}: "{b}"' for a, b in viol)))
rep.append(f'       a legenda começa em {PG[0]["t0"]:.2f} s ("{PG[0]["linhas"][0]}…") e a última página sai em {PG[-1]["t1"]:.2f} s')
# ---------------------------------------------------------------- sincronia de cada gesto × palavra (medida nos pixels do vídeo)
rep.append(''); rep.append('SINCRONIA GESTO × PALAVRA (início do movimento medido nos pixels da região do gesto, a 60 fps; tolerância 80 ms)')
IDS = {w['id']: w for f in LN['frases'] for w in f['palavras'] if w.get('id')}
rows = [92, 92, 124, 124, 92]; yb = [548 + 28 + sum(rows[:i]) for i in range(5)]
ck = lambda i: (848, yb[i] + rows[i] // 2 - 24, 908, yb[i] + rows[i] // 2 + 24)
GESTOS = [
    ('confirmada', '"confirmada?" pulsa no título', (250, 630, 830, 730)),
    ('cinco', 'o título encolhe e sobe; o balão cresce com as casas 01–05', (130, 520, 950, 940)),
    ('noites', 'check em "01 Datas"', ck(0)),
    ('pessoas', 'check em "02 Acomodação"', ck(1)),
    ('falta', 'check em "03 Valores"', ck(2)),
    ('saida', 'check em "04 Horários"', ck(3)),
    ('localizacao', 'check em "05 Endereço" (e o pino pulsa)', ck(4)),
    ('sabendo', 'carimbo "ENVIADA"', (712, 472, 936, 546)),
    ('duvida', 'dois checks de entregue no canto do balão e o avião saindo', (820, 1098, 912, 1144)),
    ('mande', '"Mande" e o avião deslizam para dentro', (945, 740, 1075, 880)),
]
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', VIDEO, '-vf', 'scale=540:960,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
FR = np.frombuffer(raw, np.uint8).reshape(-1, 960, 540)
sinc = []
for gid, desc, (x0, ya, x1, yb) in GESTOS:
    tw_ = IDS[gid]['t0']; f0 = int(round(tw_ * 60))
    assert f0 >= 30, f'o gesto "{gid}" está cedo demais para a janela de medida'
    reg = FR[f0 - 30: f0 + 30, ya // 2: yb // 2, x0 // 2: x1 // 2].astype(np.float32)
    dd = np.abs(np.diff(reg, axis=0)).mean(axis=(1, 2))           # dd[i]: quadro (f0 − 30 + i) → (f0 − 29 + i)
    base = np.median(dd[20:26])                                    # repouso: de −167 a −67 ms
    lim = max(1.2, base * 3 + 0.8)
    on = next((i for i in range(25, len(dd)) if dd[i] > lim), None)   # procura a partir de −83 ms
    if on is None:
        sinc.append((gid, desc, tw_, None)); continue
    t_on = (f0 - 30 + on + 1) / 60
    sinc.append((gid, desc, tw_, t_on))
for gid, desc, tw_, t_on in sinc:
    d_ = None if t_on is None else (t_on - tw_) * 1000
    rep.append(f'       "{IDS[gid]["w"]}" {tw_:6.3f} s → {desc}: ' + ('sem movimento medido' if d_ is None else f'{t_on:6.3f} s ({d_:+.0f} ms)'))
ok(all(t is not None and abs(t - w) <= 0.08 for _, _, w, t in sinc), f'{len(sinc)} gestos, cada um a ≤ 80 ms da palavra (pior: {max(abs(t - w) * 1000 for _, _, w, t in sinc if t is not None):.0f} ms)')

# ---------------------------------------------------------------- varredura de texto (nada encostando nem cortado)
rep.append(''); rep.append('VARREDURA DE TEXTO (caixas do motor a cada 0,25 s)')
TXT = ('rótulo', 'valor', 'título', 'chip', 'mande', 'linha', 'exemplo fictício', 'carimbo', 'casa', 'pino', 'entregue', 'marca', 'avião')
INTENC = lambda a, b: False
toques, cortes = [], []
for s_ in INFO['caixas']:
    bx = s_['caixas']; card = next((b for b in bx if b['nome'] == 'cartão gaveta'), None); fic = next((b for b in bx if b['nome'] == 'balão'), None)
    tx = [b for b in bx if b['nome'].startswith(TXT) or b['nome'].startswith('check')]
    if card:
        tx = [b for b in tx if not (b['nome'].startswith(('rótulo', 'valor', 'check')) and b['y0'] >= card['y0'] - 10)]
    for i in range(len(tx)):
        for j in range(i + 1, len(tx)):
            a_, b_ = tx[i], tx[j]
            if INTENC(a_['nome'], b_['nome']) or (a_['nome'].startswith('título') and b_['nome'].startswith('título')) and a_['y0'] == b_['y0']:
                continue
            if a_['x0'] < b_['x1'] + 4 and a_['x1'] + 4 > b_['x0'] and a_['y0'] < b_['y1'] + 4 and a_['y1'] + 4 > b_['y0']:
                if a_['nome'] == 'carimbo' and b_['nome'] == 'ficha título' or b_['nome'] == 'carimbo' and a_['nome'] == 'ficha título':
                    if not (a_['x0'] < b_['x1'] and a_['x1'] > b_['x0']):
                        continue
                toques.append((s_['t'], a_['nome'], b_['nome']))
        if fic and tx[i]['nome'].startswith(('rótulo ', 'valor', 'check', 'casa', 'pino', 'entregue')) and tx[i]['nome'] != 'rótulo balão' and (tx[i]['x0'] < fic['x0'] + 20 or tx[i]['x1'] > fic['x1'] - 20):
            cortes.append((s_['t'], tx[i]['nome']))
    for b in tx:
        if b['x0'] < 0 or b['x1'] > 1080:
            if not b['nome'].startswith(('selo ', 'mande', 'linha', 'avião')):
                cortes.append((s_['t'], b['nome']))
ok(not toques, f'nenhum texto encosta em outro (respiro ≥ 4 px) em {len(INFO["caixas"])} quadros amostrados' + ('' if not toques else ': ' + ', '.join(f'{t:.2f}s {a}×{b}' for t, a, b in toques[:8])))
ok(not cortes, 'nenhum texto cortado: os do balão ficam ≥ 20 px dentro dele; nada sai do quadro (fora as transições)' + ('' if not cortes else ': ' + ', '.join(f'{t:.2f}s {n}' for t, n in cortes[:8])))

# ---------------------------------------------------------------- a conta
rep.append(''); rep.append('DADOS CONFERIDOS COM OS ROTEIROS DO reserva-whatsapp E DO check-in (a mesma hóspede, exemplo fictício)')
import datetime
RW = {f['id']: f['valor'] for f in json.load(open(os.path.join(ROOT, '..', 'reserva-whatsapp', 'roteiro.json')))['exemplo']['ficha']}
CI = json.load(open(os.path.join(ROOT, '..', 'check-in', 'roteiro.json')))['exemplo']
ci = {f['id']: f['valor'] for f in CI['ficha']}; cr = CI['reserva']
rs = LN['exemplo']['reserva']; MSG = {m['id']: m for m in LN['exemplo']['mensagem']}; ln = lambda k: ' '.join(MSG[k]['linhas'])
brl = lambda v: f'R$ {v:.2f}'.replace('.', ',')
e_, s_ = datetime.date.fromisoformat(rs['entrada']), datetime.date.fromisoformat(rs['saida'])
ok(all(rs[k] == cr[k] for k in ('nome', 'entrada', 'saida', 'adultos', 'criancas', 'acomodacao', 'valor', 'sinal', 'saldo')),
   f'a reserva é a mesma do check-in: {rs["nome"]}, {e_:%d/%m} a {s_:%d/%m}, {rs["acomodacao"]}, {rs["adultos"]} adultos e {rs["criancas"]} criança, {brl(rs["valor"])}, sinal {brl(rs["sinal"])}, saldo {brl(rs["saldo"])}')
ok((s_ - e_).days == rs['noites'] and ln('noites') == f'{e_.day} a {s_:%d/%m} · {rs["noites"]} noites' and RW['datas'] == f'{e_:%d/%m} → {s_:%d/%m} · {rs["noites"]} noites',
   f'01 datas: "{ln("noites")}" — reserva "{RW["datas"]}" ({(s_ - e_).days} noites no calendário)')
ok(ln('pessoas') == f'{rs["acomodacao"]} · {rs["adultos"]} adultos e {rs["criancas"]} criança' and RW['acomodacao'].startswith(rs['acomodacao'] + ' ·') and RW['pessoas'].startswith(f'{rs["adultos"]} adultos · {rs["criancas"]} criança'),
   f'02 acomodação: "{ln("pessoas")}" — reserva "{RW["acomodacao"]}" e "{RW["pessoas"]}"')
ok(rs['valor'] - rs['sinal'] == rs['saldo'] and ln('falta') == f'total {brl(rs["valor"])} · sinal {brl(rs["sinal"])} recebido saldo {brl(rs["saldo"])} no check-out'
   and RW['acomodacao'].endswith(brl(rs['valor'])) and RW['sinal'].startswith(brl(rs['sinal'])) and ci['checkout'].startswith(brl(rs['saldo']) + ' · no check-out'),
   f'03 valores: {brl(rs["valor"])} − sinal {brl(rs["sinal"])} = saldo {brl(rs["valor"] - rs["sinal"])} no check-out (check-in: "{ci["checkout"]}")')
ok(ln('saida') == f'entrada a partir das {rs["hora_entrada"]} saída até {rs["hora_saida"]}' and ci['voz'].endswith('até ' + rs['hora_saida']),
   f'04 horários: entrada a partir das {rs["hora_entrada"]} (dado novo deste vídeo) · saída até {rs["hora_saida"]} (check-in: "{ci["voz"]}")')
ok(ln('localizacao') == rs['endereco'] and 'Exemplo' in rs['endereco'], f'05 endereço claramente fictício: "{ln("localizacao")}"')
# ---------------------------------------------------------------- capa (quadro 0) e folha das zonas seguras
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', VIDEO, '-frames:v', '1', os.path.join(OUT, 'capa.png')], check=True)
c0 = [s for s in INFO['caixas'] if s['t'] == 0][0]['caixas']
# cada elemento entra uma vez: o que está inteiro dentro de outra caixa (o texto e o selo do balão) faz parte dela
dentro = lambda b, o: o is not b and o['x0'] <= b['x0'] + 1 and o['x1'] >= b['x1'] - 1 and o['y0'] <= b['y0'] + 1 and o['y1'] >= b['y1'] - 1
c0 = [b for b in c0 if b['nome'] != 'legenda' and not any(dentro(b, o) for o in c0 if o['nome'] != 'legenda')]
json.dump({b['nome']: {k: b[k] for k in ('x0', 'x1', 'y0', 'y1')} for b in c0}, open(os.path.join(REV, 'capa-caixas.json'), 'w'), ensure_ascii=False, indent=1)
cap = run([sys.executable, os.path.join(ROOT, '..', '..', 'tools', 'revisao_capa.py'), ROOT]).stdout
res = [l for l in cap.splitlines() if 'RESULTADO' in l]
ok(bool(res) and 'dentro da regra' in res[-1], 'capa (quadro 0) na regra das capas: ' + (res[-1].replace('RESULTADO: ', '') if res else 'sem resultado'))
ts = [0.0] + [round((f['t0'] + f['t1']) / 2, 2) for f in LN['frases']] + [round(DUR - 1, 2)]
TW, TH = 216, 384
folha = Image.new('RGB', (len(ts) * (TW + 8) + 8, TH + 40), (40, 40, 40)); dr = ImageDraw.Draw(folha)
for i, t in enumerate(ts):
    im = Image.fromarray(fz[min(len(fz) - 1, int(round(t * 4)))]).convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); o = ImageDraw.Draw(ov)
    o.rectangle((941, 1001, 1079, 1559), fill=(255, 40, 80, 80)); o.rectangle((0, 1537, 1079, 1919), fill=(255, 40, 80, 50)); o.line((130, 0, 130, 1920), fill=(80, 160, 255, 200), width=3); o.line((950, 0, 950, 1920), fill=(80, 160, 255, 200), width=3)
    folha.paste(Image.alpha_composite(im, ov).convert('RGB').resize((TW, TH)), (8 + i * (TW + 8), 8)); dr.text((8 + i * (TW + 8), TH + 14), f'{t:05.2f}s', fill=(175, 250, 39))
folha.save(os.path.join(REV, 'zonas-seguras.jpg'), quality=86)

R = 'RESULTADO: ' + ('aprovado' if not falhas else f'{len(falhas)} falha(s)')
txt = ['EDUCATIVO confirmacao ("Reserva confirmada? Mande esta mensagem.") — revisão técnica', os.path.relpath(VIDEO, ROOT), ''] + rep + ['', R]
open(os.path.join(REV, 'relatorio.txt'), 'w').write('\n'.join(txt) + '\n')
print('\n'.join(txt))
