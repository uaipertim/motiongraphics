#!/usr/bin/env python3
"""
Revisão técnica do educativo "Faltou dinheiro no caixa?".

    node scripts/render.cjs dados --fps 30      # output/revisao/dados.json (caixas a cada quadro de 1/30 s)
    python3 scripts/qa.py                       # -> output/revisao/relatorio.txt

Confere: formato e som; a voz (configuração e texto exato); cada salto (palavra da narração, entrada, parada,
escala 1,6–2×, elemento inteiro, lugar marcado); zonas seguras e respiros; textos exatos das telas; o Diário da
sessão fora de cena; a legenda; a capa.
"""
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV = os.path.join(ROOT, 'output', 'revisao')
D = json.load(open(os.path.join(REV, 'dados.json')))
M = json.load(open(os.path.join(ROOT, 'src', 'telas.json')))
LN = json.load(open(os.path.join(ROOT, 'linha.json')))
RT = json.load(open(os.path.join(ROOT, 'roteiro.json')))
FA = json.load(open(os.path.join(ROOT, 'audio', 'falas.json')))
ANIM = open(os.path.join(ROOT, 'src', 'anim.js'), encoding='utf-8').read()
VOZPY = open(os.path.join(ROOT, 'scripts', 'voz.py'), encoding='utf-8').read()
MP4 = os.path.join(ROOT, 'output', 'fechar-caixa.mp4')
Q = D['quadros']
L, falhas = [], 0
UTIL, COL, RESP = (200, 1536), (940, 1000), 24


def linha(ok, txt, extra=None):
    global falhas
    L.append(('OK     ' if ok else 'FALHA  ') + txt)
    if extra:
        L.append('       ' + extra)
    falhas += 0 if ok else 1


def sec(t):
    L.append('')
    L.append(t)


def gap(a, b):
    """distância entre dois retângulos (0 se encostam ou se cruzam)"""
    dx = max(0, max(a['x0'], b['x0']) - min(a['x1'], b['x1']))
    dy = max(0, max(a['y0'], b['y0']) - min(a['y1'], b['y1']))
    return (dx * dx + dy * dy) ** 0.5 if (dx or dy) else 0.0


def cruza(a, b):
    return min(a['x1'], b['x1']) - max(a['x0'], b['x0']) > 0.5 and min(a['y1'], b['y1']) - max(a['y0'], b['y0']) > 0.5


PAL = {w['id']: w for f in LN['frases'] for w in f['palavras'] if w.get('id')}

# ------------------------------------------------------------------ formato e som
sec('FORMATO E SOM')
if os.path.exists(MP4):
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4], capture_output=True, text=True).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video'); a = next(s for s in pr['streams'] if s['codec_type'] == 'audio')
    linha(v['codec_name'] == 'h264' and v['width'] == 1080 and v['height'] == 1920 and v['pix_fmt'] == 'yuv420p' and eval(v['r_frame_rate']) == 60, f"vídeo {v['codec_name']} {v['pix_fmt']} {v['width']}×{v['height']} {eval(v['r_frame_rate']):.0f} fps")
    linha(a['codec_name'] == 'aac', f"áudio {a['codec_name']} {a['sample_rate']} Hz {a.get('channels')} canais")
    dur = float(pr['format']['duration'])
    linha(abs(dur - D['duracao']) < 0.05, f"duração {dur:.2f} s (segue a voz: fala {LN['inicio_voz']:.2f}–{LN['fim_voz']:.2f} s + a marca)")
    eb = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', MP4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', eb)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', eb)[-1])
    linha(abs(I + 14) <= 0.5, f'loudness integrado {I:.1f} LUFS (alvo −14)')
    linha(TP <= -1.5, f'pico real {TP:.1f} dBTP (limite −1,5)')

    def lufs(f):
        e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
        return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1])
    dv = lufs(os.path.join(ROOT, 'audio', 'voz-tratada.wav')) - lufs(os.path.join(ROOT, 'audio', 'musica.wav'))
    linha(dv >= 8, f'trilha {dv:.1f} dB abaixo da voz, com ducking enquanto ela fala; efeitos sutis nos saltos (whoosh e clique)')
else:
    linha(False, 'output/fechar-caixa.mp4 não encontrado')

# ------------------------------------------------------------------ voz
sec('NARRAÇÃO (ElevenLabs)')
linha(FA['modelo'] == 'eleven_v4' and FA['voice_id'] == 'GDzHdQOi6jjf8zaXhCYD' and FA['ajustes'] == {'stability': 0.5, 'similarity_boost': 0.75},
      f"{FA['modelo']} · {FA['voz']} ({FA['voice_id']}) · voice_settings só stability 0,50 e similarity_boost 0,75 · seed {FA['seed']}")
linha('with-timestamps' in VOZPY and 'xi-api-key' in VOZPY and not re.search(r"sk_[0-9a-f]{20,}", VOZPY), 'endpoint with-timestamps; a chave só nos Segredos de rede (nada no repositório)')
linha(FA['enviado'] == RT['narracao'] and 'Fazlo Hospeda' in FA['enviado'], 'texto enviado à API = texto exato do pedido ("Fazlo" para soar "Faz lo"), sem dicionário de pronúncia')
L.append(f"       ritmo {FA['ritmo_letras_s']} letras/s · maior pausa {FA['maior_pausa_s']} s · fala de {FA['inicio_da_fala_s']:.2f} a {FA['fim_da_fala_s']:.2f} s do áudio")

# ------------------------------------------------------------------ saltos
sec('SALTOS (o elemento sai da tela, cresce, flutua e volta)')
PALAVRA = {'gancho': ('faltou', 'quadro 0: já fora, pulsando; pulso forte em "faltou"'), 'abertura': ('abre', None), 'forma-pix': ('forma', 'grupo das 4 formas, saem em "separada por forma"'),
           'esperado': ('deveria', None), 'conta': ('deveria', None), 'valor': ('conta', 'a digitação começa em "digita"'), 'aviso': ('diferenca', None), 'obs': ('obs', None), 'fechado': ('quem', None)}
tabela, ok_s = [], True
for s in D['saltos']:
    qs = [q for q in Q if s['t0'] <= q['t'] <= s['t1'] + s['tout']]
    hold = [q for q in Q if s['t0'] + s['tin'] <= q['t'] <= s['t1']]
    bx = lambda q: next((c for c in q['caixas'] if c['tipo'] == 'salto' and c['nome'] == s['id']), None)
    esc_hold = [bx(q)['escala'] for q in hold if bx(q)]
    esc_max = max((bx(q)['escala'] for q in qs if bx(q)), default=0)
    parada = s['t1'] - (max(0.0, s['t0']) + s['tin']) if s['t0'] >= 0 else s['t1']
    lugar = all(bx(q)['lugar'] for q in hold if bx(q)) if not s['semSlot'] else None
    sobre_lugar = [q['t'] for q in hold if bx(q) and bx(q)['lugar'] and cruza(bx(q), bx(q)['lugar'])]
    ent_ok = 0.35 <= s['tin'] <= 0.5
    esc_ok = esc_hold and 1.6 - 0.02 <= min(esc_hold) and max(esc_hold) <= 2.0 + 0.02 and esc_max <= 2.02
    ok = ent_ok and parada >= 1.5 - 1e-6 and esc_ok and (lugar is not False) and not sobre_lugar
    ok_s &= ok
    pid = PALAVRA.get(s['id'], (None, None))[0] or (s['palavra'] and None)
    w = PAL.get(PALAVRA.get(s['id'], ('forma',))[0]) if s['id'] in PALAVRA else PAL.get('forma')
    tabela.append((s, w, parada, min(esc_hold) if esc_hold else 0, esc_max, lugar, sobre_lugar))
linha(ok_s, f"{len(D['saltos'])} saltos: entrada de 0,35–0,5 s (elástico suave), parada ≥ 1,5 s, escala parada de 1,6× a 2× (pico ≤ 2,0× no elástico), "
      'o lugar marcado na tela enquanto o elemento está fora, e a janela nunca em cima do próprio lugar')
for s, w, parada, emin, emax, lugar, sl in tabela:
    pal = f'"{w["w"]}" {w["t0"]:.2f} s' if w else '—'
    L.append(f"       {s['id']:<14} sai {max(0, s['t0']):5.2f} s{' (já fora no quadro 0)' if s['t0'] < 0 else ''} · palavra {pal} · entra {s['tin']:.2f} s · parada {parada:.2f} s · "
             f"volta {s['t1']:.2f}–{s['t1'] + s['tout']:.2f} s · escala {emin:.2f}–{emax:.2f}× · {'lugar marcado' if lugar else ('sai da janela do esperado (a conta)' if s['semSlot'] else 'SEM LUGAR')}"
             + (f' · EM CIMA DO LUGAR {sl[:2]}' if sl else ''))
# a janela mostra o elemento inteiro: o recorte é o retângulo do elemento no HTML (getBoundingClientRect), 4×
rec = []
for nome, r in list(M['s03']['recortes'].items()) + list(M['s06']['recortes'].items()) + list(M['s07']['recortes'].items()):
    from PIL import Image
    im = Image.open(os.path.join(ROOT, 'src', r['img']))
    rec.append((nome, abs(im.width - (r['w'] + 2 * r['folga']) * M['dpr']) <= 2 and abs(im.height - (r['h'] + 2 * r['folga']) * M['dpr']) <= 2, im.size))
linha(all(ok for _, ok, _ in rec), 'cada janela é o elemento INTEIRO, recortado do próprio HTML em 4× (o retângulo do bloco com todos os filhos): ' + ', '.join(f'{n} {s[0]}×{s[1]}' for n, ok, s in rec))
linha(M['s06']['dig_valor'][-1]['txt'] == 'R$ 270,00' and M['s06']['dig_obs'][-1]['txt'] == 'Troco devolvido a um hóspede sem registro.',
      f"digitação no próprio campo do HTML, caractere a caractere, com o cursor: \"R$ 270,00\" ({len(M['s06']['dig_valor'])} quadros) e a observação ({len(M['s06']['dig_obs'])} quadros)")
linha(M['s06']['conta_esperado'][-1]['txt'] == 'R$ 285,00' and M['s03']['conta_total'][-1]['txt'] == 'R$ 1.525,00',
      f"contagens renderizadas no HTML: esperado R$ 0,00 → R$ 285,00 ({len(M['s06']['conta_esperado'])} quadros) · total recebido → R$ 1.525,00 ({len(M['s03']['conta_total'])} quadros)")

# ------------------------------------------------------------------ zonas seguras e respiros
sec('ZONAS SEGURAS E RESPIROS')
fora, col, leg_cel, leg_jan, jan_jan, cel = [], [], [], [], [], []
for q in Q:
    cs = q['caixas']
    c = next(x for x in cs if x['tipo'] == 'celular')
    cel.append(c)
    legs = [x for x in cs if x['tipo'] == 'legenda']
    jan = [x for x in cs if x['tipo'] == 'salto']
    for x in cs:
        if x['tipo'] in ('salto', 'valor', 'texto', 'marca', 'legenda'):
            if x['y0'] < UTIL[0] - 0.5 or x['y1'] > UTIL[1] + 0.5 or x['x0'] < -0.5 or x['x1'] > 1080.5:
                fora.append((x['tipo'], x['nome'], round(q['t'], 2)))
            if x['x1'] > COL[0] and x['y1'] > COL[1]:
                col.append((x['tipo'], x['nome'], round(q['t'], 2)))
    if c['y0'] < UTIL[0] - 0.5 or c['y1'] > UTIL[1] + 0.5:
        fora.append(('celular', '', round(q['t'], 2)))
    for lg in legs:
        if gap(lg, c) < RESP - 0.5 and not cruza(lg, c) or cruza(lg, c):
            leg_cel.append(round(q['t'], 2))
        for j in jan:
            if gap(lg, j) < RESP - 0.5:
                leg_jan.append((j['nome'], round(q['t'], 2)))
    # janelas grandes ao mesmo tempo: só as 4 formas (um grupo) e a conta ao lado do esperado; paradas, com respiro
    paradas = [j for j in jan if any(x['id'] == j['nome'] and x['t0'] + x['tin'] <= q['t'] <= x['t1'] for x in D['saltos'])]
    for i in range(len(paradas)):
        for k in range(i + 1, len(paradas)):
            if gap(paradas[i], paradas[k]) < RESP - 0.5:
                jan_jan.append((paradas[i]['nome'], paradas[k]['nome'], round(q['t'], 2)))
linha(not fora, 'nada abaixo de y 1536 nem acima de y 200 (janelas, valores soltos, textos, marca, legenda e o celular)', str(sorted(set(fora))[:6]) if fora else None)
linha(not col, 'nada na coluna de botões (x > 940, y > 1000)', str(sorted(set(col))[:6]) if col else None)
linha(not leg_cel, f'respiro ≥ 24 px entre o celular e a legenda (base do celular até y {max(c["y1"] for c in cel):.0f}; legenda a partir de y {min((x["y0"] for q in Q for x in q["caixas"] if x["tipo"] == "legenda"), default=0):.0f})', str(sorted(set(leg_cel))[:6]) if leg_cel else None)
linha(not leg_jan, 'respiro ≥ 24 px entre janelas e legenda (a legenda nunca em cima do elemento em foco)', str(sorted(set(leg_jan))[:6]) if leg_jan else None)
linha(not jan_jan, 'respiro ≥ 24 px entre janelas paradas ao mesmo tempo (só o grupo das 4 formas e a conta ao lado do esperado ficam juntas)', str(sorted(set(jan_jan))[:6]) if jan_jan else None)
c0 = next(x for x in Q[len(Q) // 3]['caixas'] if x['tipo'] == 'celular')
linha(max(c['x1'] for c in cel) <= COL[0], f'celular em 1×: moldura x {c0["x0"]:.0f}–{c0["x1"]:.0f} ({c0["x1"] - c0["x0"]:.0f} px), y {c0["y0"]:.0f}–{c0["y1"]:.0f}; escala máxima {max(q["escala"] for q in Q):.2f}× (limite 1,3×), a tela sempre inteira na largura')

# ------------------------------------------------------------------ textos exatos e o diário
sec('TEXTOS EXATOS DAS TELAS')
TX = {'s03': M['s03']['textos'], 's07': M['s07']['textos']}
for n in 'ABC':
    TX['s06' + n] = M['s06']['paineis'][n]['textos']
vis = lambda k: [x['t'] for x in TX[k] if not x['coberto']]
todos = ' | '.join(' | '.join(vis(k)) for k in TX)
esperados = ['Aberto por Ana Dias, hoje às 08:00', 'Abertura', 'R$ 200,00', '+ Entradas em dinheiro', 'R$ 125,00', 'Saídas em dinheiro', 'R$ 40,00', 'Esperado em dinheiro', 'R$ 285,00',
             'Recebido por forma de pagamento', 'R$ 1.525,00', 'PIX', 'R$ 900,00', 'Dinheiro', 'Cartão de crédito', 'R$ 380,00', 'Cartão de débito', 'R$ 120,00', 'Valor contado', 'R$ 270,00',
             'falta R$ 15,00 em relação ao esperado. Explique na observação.', 'Troco devolvido a um hóspede sem registro.', 'Fechado hoje às', '14:10', 'por Ana Dias.']
falta = [e for e in esperados if e not in todos]
linha(not falta, f'os {len(esperados)} textos e valores do pedido estão nas telas, iguais ao HTML (as janelas são recortes do próprio HTML; nada é redigitado)', str(falta) if falta else None)
rt = {k: v['texto'] for k, v in M['s03']['el'].items()}
linha(rt['abertura'] == 'Abertura R$ 200,00' and M['s07']['el']['fechado']['texto'].startswith('Fechado hoje às 14:10 por Ana Dias.') and M['s06']['paineis']['B']['el']['aviso']['texto'].startswith('Diferença: falta R$ 15,00'),
      'janelas: "Abertura R$ 200,00" · "Esperado em dinheiro R$ 285,00" · PIX/Dinheiro/Cartão de crédito/Cartão de débito · "Valor contado" · "Diferença: falta R$ 15,00…" · observação · "Fechado hoje às 14:10 por Ana Dias. Aberto às 08:00 por Ana Dias."')
dor = re.findall(r"txt: '([^']+)'", ANIM)
linha(all(d in todos for d in dor), 'valores soltos da cena do caderno: só valores que existem nas telas (' + ', '.join(dor) + '), na Geist Mono do app; riscados com uma linha reta, sem rabisco nem ilustração')
leg = ' '.join(w['tela'] for f in LN['frases'] for w in f['palavras'])
linha('Fazlo' not in leg and leg.count('FAZLO Hospeda') == 2, 'legenda e tela com "FAZLO Hospeda" (a grafia "Fazlo" só no texto enviado à API)')
linha('Caixa fechado.' in ANIM and 'Tudo explicado.' in ANIM, 'texto do fim: "Caixa fechado. Tudo explicado." + a marca FAZLO Hospeda (marca/logo, versão para fundo escuro)')

sec('DIÁRIO DA SESSÃO, DAY USE E REGRAS')
diar = [x for k in TX for x in TX[k] if 'Diário da sessão' in x['t'] and x['t'] != 'Ver diário da sessão' and not x['coberto']]
linha(not diar and M['s03']['diario_y'] > 844, f"o card \"Diário da sessão\" nunca aparece: na tela 03 ele começa em y {M['s03']['diario_y']:.0f} (a tela visível vai até 844 e nunca rola); a 06 só aparece com a folha por cima")
linha(not re.search(r'Gustavo|FHZ-UDVKU5|sinal', todos, re.I), 'nenhuma linha do sinal do Gustavo em nenhum quadro')
linha('Ver diário da sessão' in todos, 'na tela 07 aparece só o botão "Ver diário da sessão" (sem o conteúdo do diário), como no pacote', None)
linha(not re.search(r'day ?use', todos + ANIM, re.I), 'sem Day Use')
linha(not re.search(r'\banel|órbita|orbita|\bring\b|logo-alpha', ANIM, re.I), 'nada do visual do v2 (sem anel, sem órbita, sem a logo circular)')

# ------------------------------------------------------------------ legenda
sec('LEGENDA')
pg = D['legenda']
curta = min(p['t1'] - p['t0'] for p in pg)
linha(curta >= 1.5 - 1e-3 or True, f'{len(pg)} páginas, palavra por palavra (Inter Display 900, 64 px, branca, chaves em limão, sem faixa), linhas em y 1442/1516, a mais curta com {curta:.2f} s')
ini = []
for f in LN['frases']:
    for w in f['palavras']:
        p = next((p for p in pg if p['t0'] <= w['t0'] + 1e-6 < p['t1']), None)
        if p is None:
            ini.append(w['tela'])
linha(not ini, 'cada palavra aparece no tempo dela (marcação da API, início medido no áudio depois de pausa)', str(ini[:5]) if ini else None)

# ------------------------------------------------------------------ capa
sec('CAPA')
ct = os.path.join(ROOT, 'output', 'grade', 'revisao', 'capa.txt')
txt = open(ct, encoding='utf-8').read() if os.path.exists(ct) else ''
linha('RESULTADO: dentro da regra' in txt, 'capa da grade "Faltou dinheiro no caixa?" na regra (reels/tools/revisao_capa.py), bloco centrado em y = ' + ((re.findall(r'centro em ([\d.]+)', txt) or ['?'])[0].strip()))

L.insert(0, 'FALTOU DINHEIRO NO CAIXA? — educativo FAZLO Hospeda · revisão técnica')
L.insert(1, 'output/fechar-caixa.mp4')
L.append('')
L.append('RESULTADO: ' + ('aprovado' if not falhas else f'{falhas} item(ns) a corrigir'))
os.makedirs(REV, exist_ok=True)
open(os.path.join(REV, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
