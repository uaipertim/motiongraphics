#!/usr/bin/env python3
"""
Entonação de pergunta na narração da SÉRIE FALA: "pergunta na fala tem que soar como pergunta".

    python3 scripts/entonacao.py fala-01 gerar     -> gera as tomadas (várias por pergunta) na API, em audio/<id>/tomadas/
    python3 scripts/entonacao.py fala-01 medir     -> mede a subida de F0 na última sílaba de cada tomada e mostra a tabela
    python3 scripts/entonacao.py fala-01 aplicar   -> encaixa a melhor tomada de cada trecho na narração (audio/<id>/voz/cena-N.wav),
                                                      salva as 3 melhores em output/<id>/revisao/tomadas/ e atualiza falas.json

Os trechos vêm de `episodios/<id>.json`, no campo "perguntas" (lista de {cena, pergunta, variantes}). Só o trecho da pergunta é
trocado: o começo da cena fica exatamente como já estava (audio/<id>/voz/original/), e a tomada nova entra no silêncio (ou no fecho
do "qu") antes da pergunta, com 14 ms de transição em potência igual e o volume da tomada nova ajustado ao do começo antigo.

Medida: F0 por autocorrelação (quadros de 10 ms, 90–450 Hz). Na última palavra, "subida" = semitons entre a mediana dos 6 últimos
quadros vozeados (final da palavra) e o ponto mais baixo da palavra (vale da sílaba tônica). Natural = 2 a 7 st; acima disso soa caricato.

A chave da API não é lida de arquivo nem impressa: a rede da nuvem põe o cabeçalho xi-api-key (Segredos de rede); fora dela,
ELEVENLABS_API_KEY no ambiente.
"""
import json
import math
import os
import shutil
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.argv = [sys.argv[0]] + sys.argv[1:]
EP = sys.argv[1]
ACAO = sys.argv[2]
import voz as V                                      # noqa: E402  (usa o mesmo cliente da API e a mesma voz)

ROOT = V.ROOT
AUD = os.path.join(ROOT, 'audio', EP)
VOZ = os.path.join(AUD, 'voz')
ORIG = os.path.join(VOZ, 'original')
TOM = os.path.join(AUD, 'tomadas')
REV = os.path.join(ROOT, 'output', EP, 'revisao', 'tomadas')
SR = V.SR
ESC = os.path.join(AUD, 'tomadas', 'escolha.json')
SCRIPT = V.SCRIPT


# ---------------------------------------------------------------- gerar
def ajustes(estab, estilo):
    return {'stability': estab, 'similarity_boost': 0.80, 'style': estilo, 'use_speaker_boost': True, 'speed': 1.0}


def gerar():
    os.makedirs(TOM, exist_ok=True)
    cenas = SCRIPT['cenas']
    for q in SCRIPT['perguntas']:
        n = q['cena']
        prev0 = cenas[n - 2]['fala'] if n > 1 else None
        nxt = cenas[n]['fala'] if n < len(cenas) else None
        for k, v in enumerate(q['variantes'], 1):
            nome = f'c{n}-t{k:02d}'
            if os.path.exists(os.path.join(TOM, nome + '.json')):
                continue
            texto = v.get('texto', q['pergunta'] if v.get('so') else cenas[n - 1]['fala'])
            prev = v['prev'] if v.get('prev') else prev0
            v3 = v.get('modelo') == 'eleven_v3'              # o v3 não aceita previous_text/next_text
            try:
                x, al, fmt = V.tts(texto, None if v3 else prev, None if v3 else nxt, v.get('seed', 808 + k), ajustes(v['estab'], v['estilo']), v.get('modelo'))
            except Exception as e:                           # uma tomada recusada pela API não derruba as outras
                print(f'  {nome}: recusada pela API ({e})'); continue
            wavfile.write(os.path.join(TOM, nome + '.wav'), SR, np.round(np.clip(x, -1, 1) * 32767).astype(np.int16))
            json.dump({'texto': texto, 'variante': v, 'alinhamento': al, 'formato': fmt}, open(os.path.join(TOM, nome + '.json'), 'w'), ensure_ascii=False)
            print(f'  {nome}: "{texto}" · estab {v["estab"]} · estilo {v["estilo"]} · {v.get("modelo", V.MODEL)}')


# ---------------------------------------------------------------- F0
def f0_track(y, sr, fmin=90, fmax=450, hop=0.010, win=0.040):
    """F0 (Hz) por quadro; 0 onde não há voz. Autocorrelação normalizada com correção de oitava."""
    h, w = int(hop * sr), int(win * sr)
    lo, hi = int(sr / fmax), int(sr / fmin)
    out, tt = [], []
    for i in range(0, len(y) - w - hi, h):
        s = y[i:i + w + hi]
        a = s[:w] - s[:w].mean()
        e = np.sqrt((a ** 2).mean())
        f = 0.0
        if e > 0.01:
            c = np.array([np.dot(a, s[l:l + w] - (s[l:l + w]).mean()) / (np.linalg.norm(a) * np.linalg.norm(s[l:l + w] - (s[l:l + w]).mean()) + 1e-9) for l in range(lo, hi)])
            j = int(np.argmax(c))
            # o 1º pico alto (evita pegar o dobro do período)
            thr = 0.9 * c[j]
            for m in range(1, len(c) - 1):
                if c[m] >= thr and c[m] >= c[m - 1] and c[m] >= c[m + 1]:
                    j = m; break
            if c[j] > 0.5:
                f = sr / (lo + j)
        out.append(f); tt.append((i + w / 2) / sr)
    out = np.array(out)
    # mediana de 3 quadros para tirar saltos isolados
    sm = out.copy()
    for i in range(1, len(out) - 1):
        tri = out[i - 1:i + 2]
        if out[i] > 0 and np.count_nonzero(tri) == 3:
            sm[i] = np.median(tri)
    return np.array(tt), sm


def st(a, b):
    return 12 * math.log2(a / b)


def palavras(al):
    ch, a, b = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    out, cur = [], None
    for c, s0, s1 in zip(ch, a, b):
        if c.isspace():
            if cur:
                out.append(cur); cur = None
            continue
        if cur is None:
            cur = {'w': '', 't0': s0, 't1': s1, 'i0': len(''.join(x['w'] for x in out)) + len(out)}
        cur['w'] += c; cur['t1'] = s1
    if cur:
        out.append(cur)
    return [w for w in out if any(c.isalnum() for c in w['w'])]


def alnum_fim(al, w=None):
    """fim da última letra/dígito da fala (a pontuação final se estica até o fim do áudio e não conta)"""
    ch, b = al['characters'], al['character_end_times_seconds']
    return b[max(i for i, c in enumerate(ch) if c.isalnum())]


def trechos_vozeados(f, folga=2, minimo=5):
    """trechos contínuos de F0 (índices de quadro); falhas de até `folga` quadros não quebram o trecho"""
    runs, ini, gap = [], None, 0
    for i, v_ in enumerate(f):
        if v_ > 0:
            if ini is None:
                ini = i
            gap = 0
        elif ini is not None:
            gap += 1
            if gap > folga:
                runs.append((ini, i - gap)); ini = None
    if ini is not None:
        runs.append((ini, len(f) - 1 - gap))
    return [(a, b) for a, b in runs if b - a + 1 >= minimo]


def contorno_final(y, al, janela=0.45):
    """F0 dos últimos `janela` s de fala (do fim da energia para trás), em Hz, sem erros de oitava, e o instante de fim da fala"""
    fim = alnum_fim(al, palavras(al)[-1]) + 0.05          # fim da última letra da fala (a "?" se estica até o fim do áudio e não conta)
    t, f = f0_track(y, SR, fmax=330)
    med = np.median(f[f > 0])
    f = np.where((f > 0.68 * med) & (f < 1.55 * med), f, 0)
    # continuidade: um quadro que pula mais de 4 st dos dois vizinhos vozeados é erro
    g = f.copy()
    for i in range(1, len(f) - 1):
        if f[i] > 0 and f[i - 1] > 0 and f[i + 1] > 0 and abs(st(f[i], f[i - 1])) > 4 and abs(st(f[i], f[i + 1])) > 4:
            g[i] = 0
    m = (t >= fim - janela) & (t <= fim + 0.02)
    return t[m], g[m], fim


CUR = {}                                              # cena em medição (para achar a 1ª palavra do trecho trocado)


def Q(n):
    return SCRIPT['perguntas'][[q['cena'] for q in SCRIPT['perguntas']].index(n)]


def acha(ws, inicio):
    """índice da última palavra que começa com `inicio` (sem diferenciar maiúscula)"""
    c = [i for i, w in enumerate(ws) if w['w'].lower().startswith(inicio.lower())]
    return c[-1] if c else None


def medida(y, al, ultimas=1):
    """subida de F0 no fim da pergunta: nos últimos 450 ms de fala, o F0 final (mediana dos 3 últimos quadros vozeados)
    menos o ponto mais baixo do trecho, em semitons (suavizado em 3 quadros). Positivo e grande = a voz fecha subindo."""
    t, f, fim = contorno_final(y, al)
    v = f[f > 0]
    if len(v) < 12:
        return None
    sm = np.convolve(v, np.ones(3) / 3, mode='valid')
    fim_f = float(np.median(v[-3:]))
    vale_i = int(np.argmin(sm)) + 1
    vale = float(sm[vale_i - 1])
    after = v[vale_i:]
    # a subida tem de ser "para o fim": o vale fica antes e o F0 depois dele não desce de novo no final
    mono = float(np.mean(np.diff(after) >= -2)) if len(after) > 3 else 0.0
    lat = st(fim_f, vale)
    todos = f0_track(y, SR, fmax=330)[1]
    reg = float(fim_f / np.median(todos[todos > 0]))
    ki = acha(palavras(al), Q(CUR['n']).get('inicio', 'quanto')) if CUR else None
    dur_cauda = round(alnum_fim(al) - palavras(al)[ki]['t0'], 2) if ki is not None else 0
    return {'dur_cauda_s': dur_cauda, 'dur_pergunta_s': round(alnum_fim(al) - [w for w in palavras(al) if w['w'].lower().startswith('quanto')][-1]['t0'], 2), 'registro': round(reg, 2), 'mediana_hz': round(float(np.median(v))), 'subida_st': round(lat, 2), 'final_hz': round(fim_f), 'vale_hz': round(vale), 'final_vs_anterior_st': round(st(fim_f, float(np.median(v))), 2),
            'ultima_palavra_s': round(float(len(v)) * 0.01, 2), 'continua_subindo': round(mono, 2), 'contorno_hz': [int(x) for x in v[::3]]}


def carrega(nome):
    sr, y = wavfile.read(os.path.join(TOM, nome + '.wav'))
    J = json.load(open(os.path.join(TOM, nome + '.json')))
    return y.astype(np.float64) / 32768, J


def medir(verbose=True):
    res = {}
    for q in SCRIPT['perguntas']:
        n = q['cena']; CUR['n'] = n
        # referência: a tomada original (a que estava no vídeo)
        orig = os.path.join(ORIG, f'cena-{n}.wav')
        F = {f['n']: f for f in json.load(open(os.path.join(ORIG, 'falas.json')))['falas']}[n]
        sr, y0 = wavfile.read(orig)
        ref = medida(y0.astype(np.float64) / 32768, F['alinhamento'])
        tf = f0_track(y0.astype(np.float64) / 32768, sr, fmax=330)[1]; REF_HZ[n] = float(np.median(tf[tf > 0])); REF_DUR[n] = ref['dur_pergunta_s']
        if verbose:
            print(f'\ncena {n} · "{q["pergunta"]}"  —  original: subida {ref["subida_st"] if ref else "?"} st')
            print('  tomada   estab estilo  modelo               texto enviado                              subida  final/vale(Hz)  Δ mediana final  vozeado (s)')
        lista = []
        k = 1
        while os.path.exists(os.path.join(TOM, f'c{n}-t{k:02d}.json')):
            nome = f'c{n}-t{k:02d}'
            y, J = carrega(nome)
            m = medida(y, J['alinhamento'])
            wn_ = palavras(J['alinhamento']); k1_ = acha(wn_, q.get('inicio', 'quanto'))
            if m and (k1_ is None or len(wn_[k1_:]) != len(q['pergunta'].split())):
                m = None                                  # a tomada não tem as palavras do roteiro nesse trecho
            v = J['variante']
            lista.append({'nome': nome, 'medida': m, 'variante': v, 'texto': J['texto']})
            if verbose and m:
                print(f'  {nome}   {v["estab"]:.2f}  {v["estilo"]:.2f}   {v.get("modelo", "v2"):20s} {J["texto"][-42:]:42s} {m["subida_st"]:6.2f}  {m["final_hz"]:4d}/{m["vale_hz"]:<4d}      {m["final_vs_anterior_st"]:6.2f}            {m["ultima_palavra_s"]:.2f}')
            k += 1
        res[n] = {'original': ref, 'tomadas': lista}
    return res


REF_DUR = {}
REF_HZ = {}                                           # F0 típico da voz em cada cena, na narração original (para não trocar de registro na emenda)


def pontua(m, n=None):
    """a subida mais clara e natural: pontos crescem até 4,5 st; perdem acima de 6 st (caricato); contam o quanto o F0 segue subindo
    até o fim (sem cair de novo) e perdem se a voz salta de registro (final acima de 1,5× o F0 típico da própria tomada)"""
    if not m:
        return -99
    s = m['subida_st']
    return min(s, 4.5) - 1.0 * max(0.0, s - 6.0) + 1.5 * (m['continua_subindo'] - 0.5) - 2.0 * max(0.0, m['registro'] - 1.5) - 4.0 * max(0.0, m.get('dur_cauda_s', 0) - 1.9) - 5.0 * max(0.0, m['dur_pergunta_s'] - REF_DUR.get(n, 9) - 0.35) - 6.0 * max(0.0, m['mediana_hz'] / REF_HZ.get(n, m['mediana_hz']) - 1.25)


# ---------------------------------------------------------------- aplicar
def alnum_end_of(al, w):
    """fim da última letra de uma palavra do alinhamento (a pontuação colada não conta)"""
    ch, a, b = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    fim = w['t0']
    for c, s0, s1 in zip(ch, a, b):
        if c.isalnum() and s0 >= w['t0'] - 1e-6 and s1 <= w['t1'] + 1e-6:
            fim = s1
    return fim


def melhor_corte(y, sr, a, b, janela=0.012):
    """o ponto de menor energia entre a e b (s)"""
    w = int(janela * sr)
    i0, i1 = int(a * sr), max(int(b * sr), int(a * sr) + 2 * w)
    best, bi = 1e9, i0
    for i in range(i0, i1 - w, int(0.002 * sr)):
        e = float(np.mean(y[i:i + w] ** 2))
        if e < best:
            best, bi = e, i + w // 2
    return bi / sr


def emenda(n, nome_tomada):
    """cena-N.wav = começo da original + pergunta da tomada nova"""
    F = {f['n']: f for f in json.load(open(os.path.join(ORIG, 'falas.json')))['falas']}[n]
    sr, yo = wavfile.read(os.path.join(ORIG, f'cena-{n}.wav')); yo = yo.astype(np.float64) / 32768
    yn, J = carrega(nome_tomada)
    wo, wn = palavras(F['alinhamento']), palavras(J['alinhamento'])
    # a pergunta é o fim da cena: começa na última palavra "Quanto" (nas duas tomadas)
    k0, k1 = acha(wo, Q(n).get('inicio_original', 'quanto')), acha(wn, Q(n).get('inicio', 'quanto'))
    po, pn = wo[k0], wn[k1]
    # janela do corte: do fim da palavra anterior ao início da pergunta (e um pouco para dentro do "qu", onde há o fecho)
    ao, bo = wo[k0 - 1]['t1'], po['t0'] + 0.05
    an, bn = (wn[k1 - 1]['t1'] if k1 else 0.0), pn['t0'] + 0.05
    co = melhor_corte(yo, sr, ao - 0.03, bo)
    cn = melhor_corte(yn, sr, an - 0.03, bn)
    # volume: iguala o nível das palavras do começo (mesmo texto nas duas tomadas)
    def rms(y, ws):
        seg = np.concatenate([y[int(w['t0'] * sr):int(w['t1'] * sr)] for w in ws[:k0]])
        return float(np.sqrt((seg ** 2).mean()))
    if k1 == 0:                                       # tomada só da pergunta: iguala pelo nível da própria pergunta na original
        q_ = lambda y, ws, k: float(np.sqrt((np.concatenate([y[int(w['t0'] * sr):int(w['t1'] * sr)] for w in ws[k:]]) ** 2).mean()))
        ganho = q_(yo, wo, k0) / max(q_(yn, wn, 0), 1e-6)
    else:
        ganho = rms(yo, wo) / max(rms(yn, wn), 1e-6)
    ganho = float(np.clip(ganho, 0.6, 1.6))
    cn_ini = an
    cab = yo[: int(co * sr)]
    cauda = yn[int(cn * sr):] * ganho
    x = int(0.014 * sr)
    # transição em potência igual, centrada no ponto de corte
    a_out = cab[-x:] * np.cos(np.linspace(0, np.pi / 2, x))
    a_in = (yn[int(cn * sr) - x: int(cn * sr)] * ganho) * np.sin(np.linspace(0, np.pi / 2, x)) if int(cn * sr) >= x else np.zeros(x)
    y = np.concatenate([cab[:-x], a_out + a_in, cauda])
    # alinhamento fundido: caracteres da original até a pergunta + os da tomada nova a partir da pergunta
    def corta(al, k, ws):
        t0 = ws[k]['t0']
        return next(j for j, a in enumerate(al['character_start_times_seconds']) if a >= t0 - 1e-6 and not al['characters'][j].isspace())
    ja, jb = corta(F['alinhamento'], k0, wo), corta(J['alinhamento'], k1, wn)
    desl = co - cn                                    # tempo da tomada nova no tempo da fusão
    A, B = F['alinhamento'], J['alinhamento']
    # a legenda mostra o texto do roteiro (sem "…", sem MAIÚSCULAS da tomada): os caracteres de cada palavra da pergunta são
    # redistribuídos entre o início e o fim da palavra na tomada nova
    canon = SCRIPT['perguntas'][[q_['cena'] for q_ in SCRIPT['perguntas']].index(n)]['pergunta'].split()
    novas = [dict(w) for w in wn[k1:]]
    # a marcação da API chega a atrasar uma palavra depois de uma hesitação ("Peraí…"): o início de cada palavra é refinado pelo áudio,
    # que sobe a energia logo depois da pausa
    hop = int(0.005 * sr); env = np.sqrt(np.convolve(yn ** 2, np.ones(hop * 2) / (hop * 2), 'same'))[::hop]; lim = 0.12 * env.max()
    for i in range(1, len(novas)):
        a0 = novas[i]['t0']
        f1 = min(len(env) - 1, int((a0 + 0.05) / 0.005)); f0 = max(0, int((a0 - 0.4) / 0.005))
        quieto = env[f0:f1 + 1] < lim
        # o último trecho quieto (≥ 30 ms) dentro da janela termina onde a palavra de fato começa
        fim_q = None
        j = len(quieto) - 1
        while j >= 5:
            if quieto[j - 5:j + 1].all():
                while j + 1 < len(quieto) and quieto[j + 1]:
                    j += 1
                fim_q = j + 1; break
            j -= 1
        if fim_q is not None and (f0 + fim_q) * 0.005 < a0 - 0.03:
            novas[i]['t0'] = (f0 + fim_q) * 0.005
    cc, cs, ce = [], [], []
    for i, (w, cw) in enumerate(zip(novas, canon)):
        a0 = w['t0'] + desl; b0 = alnum_end_of(B, w) + desl
        if i:
            cc.append(' '); cs.append(ce[-1]); ce.append(a0)
        for j, ch_ in enumerate(cw):
            cc.append(ch_); cs.append(a0 + (b0 - a0) * j / len(cw)); ce.append(a0 + (b0 - a0) * (j + 1) / len(cw))
    chars = A['characters'][:ja] + cc
    st_ = A['character_start_times_seconds'][:ja] + cs
    en_ = A['character_end_times_seconds'][:ja] + ce
    # o espaço entre as palavras: termina onde a pergunta começa
    al = {'characters': chars, 'character_start_times_seconds': st_, 'character_end_times_seconds': en_}
    return y, al, ganho, (co, cn)


def aplicar():
    res = medir(verbose=False)
    esc = json.load(open(ESC)) if os.path.exists(ESC) else {}
    os.makedirs(REV, exist_ok=True)
    for f in os.listdir(REV):
        os.remove(os.path.join(REV, f))
    falas_path = os.path.join(VOZ, 'falas.json')
    D = json.load(open(os.path.join(ORIG, 'falas.json')))
    por = {f['n']: f for f in D['falas']}
    resumo = []
    for q in SCRIPT['perguntas']:
        n = q['cena']
        L = sorted([t for t in res[n]['tomadas'] if t['medida']], key=lambda t: -pontua(t['medida'], n))
        nome = esc.get(str(n), L[0]['nome'])
        y, al, ganho, cortes = emenda(n, nome)
        wavfile.write(os.path.join(VOZ, f'cena-{n}.wav'), SR, np.round(np.clip(y, -1, 1) * 32767).astype(np.int16))
        a, b = V.limites(al)
        f = dict(por[n]); f['alinhamento'] = al; f['inicio_da_fala'] = round(a, 3); f['fim_da_fala'] = round(b, 3)
        f['duracao_audio'] = round(len(y) / SR, 3); f['tomada_pergunta'] = nome
        f['enviado_pergunta'] = [t for t in L if t['nome'] == nome][0]['texto']
        por[n] = f
        m = [t for t in L if t['nome'] == nome][0]['medida']
        resumo.append((n, nome, m, ganho))
        # as 3 melhores, em WAV curto só com a pergunta (com 150 ms de margem antes)
        for t in L[:3]:
            yy, J = carrega(t['nome'])
            ws = palavras(J['alinhamento'])
            k1 = acha(ws, Q(n).get('inicio', 'quanto'))
            i0 = max(0, int((ws[k1]['t0'] - 0.15) * SR)); i1 = min(len(yy), int((alnum_fim(J['alinhamento'], ws[-1]) + 0.35) * SR))
            seg = yy[i0:i1].copy(); k = int(0.01 * SR); seg[:k] *= np.linspace(0, 1, k); seg[-k * 4:] *= np.linspace(1, 0, k * 4)
            marca = '-ESCOLHIDA' if t['nome'] == nome else ''
            wavfile.write(os.path.join(REV, f'cena{n}-{t["nome"].split("-")[1]}-subida{t["medida"]["subida_st"]:+.1f}st{marca}.wav'), SR, np.round(seg * 32767).astype(np.int16))
        # a original, para comparar
        sr0, y0 = wavfile.read(os.path.join(ORIG, f'cena-{n}.wav')); y0 = y0.astype(np.float64) / 32768
        wo = palavras(por[n]['alinhamento'])
        Fo = {ff['n']: ff for ff in json.load(open(os.path.join(ORIG, 'falas.json')))['falas']}[n]
        w0 = palavras(Fo['alinhamento']); kq = acha(w0, Q(n).get('inicio_original', 'quanto'))
        i0 = max(0, int((w0[kq]['t0'] - 0.15) * sr0)); i1 = min(len(y0), int((alnum_fim(Fo['alinhamento'], w0[-1]) + 0.35) * sr0))
        seg = y0[i0:i1].copy(); k = int(0.01 * sr0); seg[:k] *= np.linspace(0, 1, k); seg[-k * 4:] *= np.linspace(1, 0, k * 4)
        r0 = res[n]['original']
        wavfile.write(os.path.join(REV, f'cena{n}-ORIGINAL-subida{r0["subida_st"]:+.1f}st.wav'), sr0, np.round(seg * 32767).astype(np.int16))
    # a tabela completa de tomadas, para consulta
    with open(os.path.join(os.path.dirname(REV), 'entonacao.txt'), 'w') as fh:
        fh.write(f'{EP}: entonação das perguntas — subida de F0 na sílaba final de cada tomada (semitons)\n')
        fh.write('subida = F0 final − ponto mais baixo dos últimos 450 ms de fala; "segue" = fração do trecho final em que o F0 não volta a cair; mediana = F0 típico da tomada (Hz)\n')
        for q in SCRIPT['perguntas']:
            n = q['cena']; r0 = res[n]['original']
            fh.write(f'\ncena {n} · "{q["pergunta"]}" · original: subida {r0["subida_st"]:+.2f} st\n')
            for t in sorted([t for t in res[n]['tomadas'] if t['medida']], key=lambda t: -pontua(t['medida'], n)):
                m, v = t['medida'], t['variante']
                marca = ' <= ESCOLHIDA' if t['nome'] == por[n].get('tomada_pergunta') else ''
                fh.write(f'  {t["nome"]}  subida {m["subida_st"]:+6.2f}  segue {m["continua_subindo"]:.2f}  mediana {m["mediana_hz"]:3d}  pergunta {m["dur_pergunta_s"]:.2f} s  pontos {pontua(m, n):5.2f}  estab {v["estab"]:.2f} estilo {v["estilo"]:.2f} {v.get("modelo", "v2")[-6:]:7s} "{t["texto"]}"{marca}\n')
    D['falas'] = [por[k] for k in sorted(por)]
    D['entonacao'] = {str(n): {'tomada': nome, 'subida_st': m['subida_st']} for n, nome, m, _ in resumo}
    json.dump(D, open(falas_path, 'w'), ensure_ascii=False, indent=1)
    for n, nome, m, g in resumo:
        print(f'cena {n}: tomada {nome} · subida {m["subida_st"]:+.2f} st (final {m["final_hz"]} Hz, vale {m["vale_hz"]} Hz) · ganho do encaixe {g:.2f}')


if __name__ == '__main__':
    if not os.path.isdir(ORIG):                        # guarda a narração como estava, uma única vez
        os.makedirs(ORIG)
        for f in os.listdir(VOZ):
            if os.path.isfile(os.path.join(VOZ, f)):
                shutil.copy(os.path.join(VOZ, f), ORIG)
    {'gerar': gerar, 'medir': lambda: medir(True), 'aplicar': aplicar}[ACAO]()
