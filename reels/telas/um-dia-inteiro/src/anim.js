/*
 * FAZLO Hospeda — "Um dia inteiro da pousada" (reel de telas, 9:16, sem voz)
 *
 * Palco em DOM com perspectiva CSS 3D. As PEÇAS são recortes das telas reais (scripts/pecas.cjs, src/pecas.json):
 * cada uma sai da interface (a tela fantasma ao fundo), cresce no centro sobre o preto da marca, com sombra suave
 * e leve perspectiva; o que fica para trás recua e desfoca. Valores contam dígito a dígito por cima do "furo"
 * deixado no recorte, com a mesma fonte (Geist Mono). Determinístico: REEL.renderAt(t) monta o quadro exato de t.
 */
(() => {
  const W = 1080, H = 1920;
  const C = { preto: '#0A0A0A', limao: '#AFFA27', branco: '#F7F7F2', cinza: '#8C8C85' };
  const DUR = 60.0;
  // cortes das etapas (s) — 120 BPM, 1 tempo = 0,5 s
  const E = { g: 0, r: 4.5, s: 14.0, c: 22.5, m: 30.5, o: 38.0, x: 47.5, f: 55.0 };

  // ---------------- utilidades ----------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const EZ = {
    lin: (u) => u,
    out: (u) => 1 - Math.pow(1 - u, 3),
    in: (u) => u * u * u,
    io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    expo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
    back: (u) => { const c1 = 1.55, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
    quad: (u) => 1 - (1 - u) * (1 - u),
  };
  const ramp = (t, a, b, e = EZ.out) => e(clamp((t - a) / (b - a), 0, 1));
  const el = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); if (parent) parent.appendChild(e); return e; };
  const brl = (cent) => { const neg = cent < 0; cent = Math.abs(Math.round(cent)); const r = Math.floor(cent / 100), c = cent % 100; return (neg ? '− ' : '') + 'R$ ' + String(r).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + String(c).padStart(2, '0'); };
  const parseBRL = (s) => { const neg = /[−-]/.test(s); const n = s.replace(/[^\d,]/g, '').replace(',', '.'); return (neg ? -1 : 1) * Math.round(parseFloat(n) * 100); };

  let ROOT, META, BG, GLOW, LINHAS, SVGF, FBLUR;
  const GRUPOS = {}, PECAS = [], TEXTOS = [], TAGS = [], EVENTOS = [], DESTAQUES = [], EXTRAS = [];
  let LOGO, MARCA;

  // ---------------- grupos (uma etapa = um grupo com sua própria perspectiva) ----------------
  function grupo(nome, t0, t1) {
    const g = el('div', 'grupo', ROOT, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px', perspective: '1900px', perspectiveOrigin: '540px 860px' });
    const fundo = el('div', 'camada-fundo', g, { position: 'absolute', inset: 0, maskImage: 'linear-gradient(#000 0px, #000 1240px, transparent 1500px)', WebkitMaskImage: 'linear-gradient(#000 0px, #000 1240px, transparent 1500px)' });
    const o = { nome, el: g, fundo, t0, t1 };
    GRUPOS[nome] = o; return o;
  }
  // chicote entre etapas: a etapa que sai vai para a esquerda, a que entra vem da direita
  function panX(g, t) {
    let x = 0;
    if (g.t0 > 0) x += (1 - ramp(t, g.t0 - 0.16, g.t0 + 0.34, EZ.out)) * 1250;
    if (g.t1 < DUR) x -= ramp(t, g.t1 - 0.34, g.t1 + 0.12, EZ.in) * 1250;
    return x;
  }

  // ---------------- peças ----------------
  // nova peça: id do pecas.json, grupo, s = px por px CSS no quadro, pad (px CSS da moldura)
  function peca(id, g, s, o = {}) {
    const m = META[id]; if (!m) throw new Error('peça ' + id);
    const pad = o.pad ?? 0, padY = o.padY ?? pad;
    const w = (m.w + 2 * pad) * s, h = (m.h + 2 * padY) * s;
    const tile = m.tile || {};
    const e = el('div', 'peca', o.dentro || g.el, {
      position: 'absolute', left: '0px', top: '0px', width: w + 'px', height: h + 'px', overflow: 'hidden',
      background: o.fundo || tile.fundo || '#FFFFFF', borderRadius: ((o.r ?? tile.r ?? 12) * s) + 'px', transformOrigin: '50% 50%',
      boxSizing: 'border-box', willChange: 'transform', display: 'none', backfaceVisibility: 'hidden',
    });
    if (tile.borda && !o.semBorda) { const b = tile.borda.split(' '); e.style.border = `${parseFloat(b[0]) * s}px ${b[1]} ${b.slice(2).join(' ')}`; }
    const img = el('img', null, e, { position: 'absolute', left: (pad * s - (tile.borda && !o.semBorda ? parseFloat(tile.borda) * s : 0)) + 'px', top: (padY * s - (tile.borda && !o.semBorda ? parseFloat(tile.borda) * s : 0)) + 'px', width: m.w * s + 'px', height: m.h * s + 'px' });
    img.src = m.png; img.decoding = 'sync';
    const p = { id, m, g, s, pad, padY, w, h, el: e, img, k: [], furos: [], ondas: [], filhos: [], vel: null, aro: 0, sombra: o.sombra ?? 1, destaque: [] };
    let p0escuro = false;
    // furos (valores que contam)
    for (const hl of m.holes || []) {
      const off = tile.borda && !o.semBorda ? parseFloat(tile.borda) * s : 0;
      const right = hl.x + hl.w >= m.w - 8 && !hl.input;
      const span = el('div', 'furo', e, {
        position: 'absolute', top: ((padY + hl.y) * s - off) + 'px', height: hl.h * s + 'px', lineHeight: hl.h * s + 'px',
        font: `${hl.peso} ${hl.px * s}px '${hl.fam}'`, color: hl.cor, letterSpacing: hl.ls === 'normal' ? 'normal' : parseFloat(hl.ls) * s + 'px',
        whiteSpace: 'pre', display: 'flex', alignItems: 'center',
      });
      if (right) { span.style.right = (w - (pad + hl.x + hl.w) * s - off) + 'px'; span.style.justifyContent = 'flex-end'; }
      else span.style.left = ((pad + hl.x) * s - off) + 'px';
      if (hl.input) { span.style.height = hl.h * s + 'px'; }
      const prefixo = hl.input ? '' : hl.texto.replace(/[\d.,]+$/, '');
      p.furos.push({ hl, span, alvo: parseBRL(hl.texto), cont: [], prefixo, input: hl.input, ultimo: null, lh: hl.h * s });
    }
    const fundoCor = o.fundo || tile.fundo || '#FFFFFF';
    const escuro = /^rgb\((\d+), (\d+), (\d+)/.exec(fundoCor); p0escuro = (escuro && +escuro[1] < 60) || /^#0A0A0A/i.test(fundoCor);
    p.vel = el('div', 'vel', e, { position: 'absolute', inset: '0', background: '#0A0A0A', opacity: 0, pointerEvents: 'none' });
    p.escuro = p0escuro;
    PECAS.push(p);
    return p;
  }
  // quadro-chave: p.at(t, {x,y,z,rx,ry,rz,k,op,blur,dim}, ease)
  const BASE = { x: 540, y: 960, z: 0, rx: 0, ry: 0, rz: 0, k: 1, op: 1, blur: 0, dim: 0, clip: 1 };
  function at(p, t, props, e = EZ.out) {
    const prev = p.k.length ? p.k[p.k.length - 1].v : { ...BASE };
    p.k.push({ t, v: { ...prev, ...props }, e });
    p.k.sort((a, b) => a.t - b.t);
    return p;
  }
  function estado(p, t) {
    const k = p.k; if (!k.length || t < k[0].t) return null;
    let i = 0; while (i < k.length - 1 && t >= k[i + 1].t) i++;
    if (i === k.length - 1) return k[i].v;
    const a = k[i], b = k[i + 1], u = b.e((t - a.t) / (b.t - a.t));
    const o = {}; for (const key in a.v) o[key] = lerp(a.v[key], b.v[key], u); return o;
  }
  // a peça nasce do lugar dela na tela fantasma (gh) e cresce até (x, y)
  function daTela(p, gh, t0, t1, alvo, e = EZ.out) {
    const src = p.m.src, gs = gh.s; // px por px CSS da fantasma
    const cx = gh.x - gh.w / 2 + (src.x + p.m.w / 2) * gs, cy = gh.y - gh.h / 2 + (src.y + p.m.h / 2) * gs;
    at(p, t0, { x: cx, y: cy, z: gh.z, k: gs / p.s, op: 0, rx: gh.rx, ry: gh.ry, blur: 0, dim: 0.2 }, EZ.lin);
    at(p, t0 + 0.06, { op: 1 }, EZ.lin);
    at(p, t1, { x: alvo.x, y: alvo.y, z: alvo.z ?? 0, k: alvo.k ?? 1, rx: alvo.rx ?? 3, ry: alvo.ry ?? -4, dim: 0 }, e);
    return p;
  }
  // entrada simples, vinda da profundidade
  function surge(p, t0, t1, alvo, de = {}) {
    at(p, t0, { x: alvo.x + (de.dx ?? 0), y: alvo.y + (de.dy ?? 90), z: de.z ?? -520, k: de.k ?? 0.9, op: 0, rx: de.rx ?? 14, ry: de.ry ?? -10, blur: de.blur ?? 0, dim: 0 }, EZ.lin);
    at(p, t1, { x: alvo.x, y: alvo.y, z: alvo.z ?? 0, k: alvo.k ?? 1, op: 1, rx: alvo.rx ?? 3, ry: alvo.ry ?? -4, blur: 0 }, EZ.out);
    return p;
  }
  // respiração leve (a peça nunca fica 100% parada, mas o texto continua legível)
  function respira(p, t0, t1, amp = 1) { p.resp = (p.resp || []).concat([[t0, t1, amp]]); return p; }
  // recua e desfoca (o que é antigo)
  function recua(p, t0, t1, para) { at(p, t0, {}, EZ.lin); at(p, t1, { z: -420, blur: 7, dim: 0.5, op: 0.85, ...para }, EZ.io); return p; }
  function sai(p, t0, t1, para = {}) { at(p, t0, {}, EZ.lin); at(p, t1, { op: 0, ...para }, EZ.in); return p; }
  // contagem de um furo: de -> até (centavos)
  function conta(p, i, t0, t1, de, ate) { const f = p.furos[i]; f.cont.push({ t0, t1, de, ate: ate ?? f.alvo }); ev(t0, 'conta', { dur: t1 - t0, digitos: String(Math.abs(Math.round((ate ?? f.alvo) / 100))).length }); ev(t1, 'conta_fim'); return p; }
  // destaque (um por vez): contorno limão + brilho
  function destaque(nome, t0, t1, ps, extra = {}) { const aro = extra.aro || [ps[0]]; delete extra.aro; DESTAQUES.push({ nome, t0, t1, pecas: ps.map((p) => p.id), aro: aro.map((p) => p.id), ...extra }); for (const p of aro) p.destaque.push([t0, t1]); }
  // toque: onda limão no ponto (u, v da peça, 0..1); o botão afunda
  function toque(p, t, u = 0.5, v = 0.5) {
    const d = el('div', 'onda', p.el, { position: 'absolute', left: (u * p.w) + 'px', top: (v * p.h) + 'px', width: '10px', height: '10px', marginLeft: '-5px', marginTop: '-5px', borderRadius: '50%', background: C.limao, opacity: 0, pointerEvents: 'none', mixBlendMode: 'normal' });
    p.ondas.push({ t, d, u, v });
    p.toques = (p.toques || []).concat([t]);
    ev(t, 'toque');
  }
  function ev(t, tipo, dados = {}) { EVENTOS.push({ t: +t.toFixed(3), tipo, ...dados }); }

  // tela fantasma: a interface de onde as peças saem (escura, inclinada, ao fundo)
  function fantasma(g, arq, t0, t1, o = {}) {
    const s = o.s ?? 1.55; // px por px CSS (a imagem tem 2 px por px CSS)
    g.fundo.style.perspective = '1900px'; g.fundo.style.perspectiveOrigin = '540px 860px';
    const img = el('img', 'fantasma', g.fundo, { position: 'absolute', left: 0, top: 0, width: 390 * s + 'px', transformOrigin: '50% 0', display: 'none', borderRadius: 24 * s + 'px', willChange: 'transform' });
    img.src = 'assets/telas/' + arq; img.decoding = 'sync';
    const gh = { x: o.x ?? 540, y: o.y ?? 1010, z: o.z ?? -650, rx: o.rx ?? 16, ry: o.ry ?? 14, s, w: 390 * s, h: (o.altura ?? 1000) * s, t0, t1, img, op: o.op ?? 0.34 };
    EXTRAS.push({ tipo: 'fantasma', gh, g });
    return gh;
  }

  // ---------------- textos ----------------
  // "linha 1\nlinha *chave*": a palavra-chave entre * fica em limão. Inter Display 900, 66 px (mín. 56).
  function texto(g, txt, t0, t1, o = {}) {
    const box = el('div', 'texto', o.raiz || g.el, { position: 'absolute', left: (o.x ?? 80) + 'px', top: (o.y ?? 236) + 'px', width: (o.w ?? 920) + 'px', font: `900 ${o.px ?? 66}px 'ID'`, lineHeight: '1.04', letterSpacing: '-0.025em', color: C.branco, textAlign: o.align ?? 'left', display: 'none' });
    const linhas = txt.split('\n').map((ln) => {
      const mask = el('div', null, box, { overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em' });
      const inner = el('div', null, mask, { whiteSpace: 'nowrap' });
      inner.innerHTML = ln.replace(/\*([^*]+)\*/g, `<span style="color:${C.limao}">$1</span>`);
      return inner;
    });
    const o2 = { box, linhas, t0, t1, px: o.px ?? 66, g };
    TEXTOS.push(o2); return o2;
  }
  function ajustaTexto(tx) { // reduz o corpo até caber (nunca abaixo de 56 px)
    let px = tx.px; tx.box.style.display = 'block';
    const maxW = parseFloat(tx.box.style.width);
    while (px > 56 && Math.max(...tx.linhas.map((l) => l.scrollWidth)) > maxW) { px -= 1; tx.box.style.fontSize = px + 'px'; }
    tx.px = px; tx.box.style.display = 'none';
  }
  // etiqueta da etapa: nó numerado + nome (o ciclo)
  function etiqueta(g, n, nome, t0, t1) {
    const e = el('div', 'tag', g.el, { position: 'absolute', left: '80px', top: '160px', height: '58px', display: 'none', alignItems: 'center', gap: '16px' });
    const no = el('div', null, e, { width: '58px', height: '58px', borderRadius: '50%', border: `4px solid ${C.limao}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 24px 'JBM'`, color: C.limao, background: '#0A0A0A' });
    no.textContent = String(n).padStart(2, '0');
    const nm = el('div', null, e, { font: `800 30px 'JBM'`, letterSpacing: '0.12em', color: C.branco }); nm.textContent = nome;
    const pr = el('div', null, e, { display: 'flex', gap: '8px', marginLeft: '6px' });
    const pts = [1, 2, 3, 4, 5, 6].map((i) => el('div', null, pr, { width: '12px', height: '12px', borderRadius: '50%', background: i < n ? C.limao : i === n ? C.limao : '#333', opacity: i <= n ? 1 : 0.9 }));
    const o = { e, no, t0, t1, n, pts, g }; TAGS.push(o); return o;
  }

  // ---------------- a linha limão do ciclo (liga cada etapa à seguinte) ----------------
  const CICLO = []; // {t0, t1, de: () => [x,y], ate: () => [x,y]}
  function ligacao(t0, t1, de, ate) { CICLO.push({ t0, t1, de, ate }); ev(t0, 'linha', { dur: t1 - t0 }); }

  // ---------------- cena ----------------
  function monta() {
    // ===== GANCHO 0–4,5 s · o painel do dia =====
    const G = grupo('g', -1, E.r);
    const ghG = fantasma(G, '01-visao-geral.jpg', 0.0, 4.4, { y: 820, z: -700, rx: 18, ry: -16, op: 0.3 });
    texto(G, 'Sexta-feira, 16/10.\nPousada *Vale Sereno.*', -1, 2.0);
    texto(G, 'Tudo o que acontece hoje,\n*numa tela só.*', 2.15, E.r);
    const gRec = daTela(peca('g_recebido', G, 2.88), ghG, 0.25, 0.9, { x: 540, y: 612, rx: 4, ry: 3 });
    conta(gRec, 0, 0.55, 1.35, 0);
    const gHos = daTela(peca('g_hospedados', G, 3.24), ghG, 1.2, 1.75, { x: 352, y: 990, rx: 4, ry: 6 });
    const gSai = daTela(peca('g_saidas', G, 3.24), ghG, 1.32, 1.87, { x: 728, y: 990, rx: 4, ry: -6 });
    const gAt = daTela(peca('g_atencao', G, 3.24), ghG, 2.1, 2.6, { x: 540, y: 1285, rx: 3, ry: 0 });
    destaque('Recebido hoje R$ 1.525,00', 0.55, 1.8, [gRec], { valor: 'R$ 1.525,00' });
    destaque('10 hospedados · 2 saídas', 1.8, 2.65, [gHos, gSai], { valor: '10 / 2', aro: [gHos, gSai] });
    destaque('Precisa de atenção 1', 2.65, E.r - 0.3, [gAt], { valor: '1' });
    for (const p of [gRec, gHos, gSai, gAt]) respira(p, 0, E.r);
    ev(0.25, 'whoosh'); ev(1.2, 'pop'); ev(1.32, 'pop'); ev(2.1, 'pop');

    // ===== 1 RESERVA 4,5–14 s =====
    const R = grupo('r', E.r, E.s);
    const r0 = E.r;
    etiqueta(R, 1, 'RESERVA', r0 + 0.2, E.s);
    texto(R, 'Só aparece o que\nestá *livre.*', r0 + 0.35, E.s);
    const cal = peca('r_cal_base', R, 0.86, {});
    surge(cal, r0 + 0.12, r0 + 0.65, { x: 540, y: 700, rx: 10, ry: 0 }, { rx: 40, z: -900, dy: 0 });
    const bars = cal.m.bars;
    bars.forEach((b, i) => {
      const id = 'r_bar' + String(i).padStart(2, '0'); if (!META[id]) return;
      const bp = peca(id, R, cal.s, { dentro: cal.el });
      bp.el.style.borderRadius = '0px'; bp.filho = true; bp.rel = { x: b.x * cal.s, y: b.y * cal.s };
      const tt = r0 + 0.5 + i * 0.05;
      at(bp, tt, { x: 0, y: -40, k: 0.2, op: 0 }, EZ.lin); at(bp, tt + 0.24, { x: 0, y: 0, k: 1, op: 1 }, EZ.back);
      ev(tt + 0.05, 'barra', { i });
    });
    respira(cal, r0, r0 + 1.6, 0.6);
    recua(cal, r0 + 1.15, r0 + 1.65, { y: 560, z: -700, blur: 8, dim: 0.55, op: 0.7 });
    const ghR = fantasma(R, '03-nova-reserva.jpg', r0 + 1.1, r0 + 3.7, { y: 860, z: -760, rx: 14, ry: 18, op: 0.26 });
    const rEnt = daTela(peca('r_entrada', R, 3.08, { pad: 8 }), ghR, r0 + 1.2, r0 + 1.75, { x: 288, y: 556, rx: 3, ry: 4 });
    const rSai = daTela(peca('r_saida', R, 3.08, { pad: 8 }), ghR, r0 + 1.3, r0 + 1.85, { x: 792, y: 556, rx: 3, ry: -4 });
    const rLiv = daTela(peca('r_livres', R, 3.1), ghR, r0 + 1.5, r0 + 2.0, { x: 540, y: 772, rx: 2, ry: 0 });
    const rLis = daTela(peca('r_lista', R, 2.0), ghR, r0 + 1.7, r0 + 2.25, { x: 540, y: 1150, rx: 8, ry: 0, z: -80 });
    at(rLis, r0 + 2.25, { dim: 0.25 });
    destaque('22/10 → 25/10 · Livres no período 5 de 10', r0 + 1.9, r0 + 3.25, [rLiv, rEnt, rSai], { valor: '5 de 10' });
    // Quarto Bromélia: sai da lista, recebe o toque e fica selecionado
    const lisTop = 1150 - rLis.h / 2, bromIdx = rLis.m.h - 53;
    const bOff = peca('r_brom_off', R, 3.45), bOn = peca('r_brom_on', R, 3.45);
    const bSrcY = lisTop + (bromIdx + 26.5) * 2.0, bY = 900;
    const tb = r0 + 2.75;
    at(bOff, tb, { x: 540, y: bSrcY, z: -80, k: 2.0 / 3.45, op: 0, rx: 8, ry: 0 }, EZ.lin); at(bOff, tb + 0.05, { op: 1 }, EZ.lin);
    at(bOff, tb + 0.25, { y: bY + 40, k: 0.72, z: -20, rx: 5 }, EZ.out);
    at(bOff, tb + 0.5, { x: 540, y: bY, z: 0, k: 1, rx: 3, ry: -3 }, EZ.out);
    toque(bOff, tb + 0.72, 0.09, 0.5);
    at(bOn, tb + 0.76, { x: 540, y: bY, z: 0, k: 1, op: 0, rx: 3, ry: -3 }, EZ.lin); at(bOn, tb + 0.86, { op: 1 }, EZ.lin);
    sai(bOff, tb + 0.86, tb + 0.92);
    recua(rLis, tb, tb + 0.5, { blur: 9, dim: 0.7, op: 0.4, z: -500 });
    for (const p of [rEnt, rSai, rLiv]) recua(p, tb + 1.0, tb + 1.4, { blur: 6, dim: 0.55, z: -380, op: 0.6 });
    destaque('Quarto Bromélia · R$ 320,00 por diária', r0 + 3.25, r0 + 4.85, [bOff, bOn], { valor: 'R$ 320,00', aro: [bOff, bOn], troca: true });
    // a barra nova cai no calendário (Quarto Bromélia, 22 → 25)
    const tq = r0 + 4.8;
    for (const p of [rEnt, rSai, rLiv, rLis]) sai(p, tq - 0.2, tq + 0.2, { z: -900 });
    recua(bOn, tq, tq + 0.4, { y: 760, k: 0.6, z: -500, blur: 7, dim: 0.6, op: 0.5 });
    at(cal, tq, {}, EZ.lin); at(cal, tq + 0.45, { y: 760, z: -560, blur: 6, dim: 0.62, op: 0.8 }, EZ.io);
    const sz = 3.5;
    const qua = peca('r_cal_quarto', R, 3.4), dias = peca('r_cal_dias', R, sz), lin = peca('r_cal_linha', R, sz), bru = peca('r_cal_bruno', R, sz);
    surge(qua, tq + 0.0, tq + 0.4, { x: 324, y: 520, rx: 2, ry: 3 }, { dy: 60 });
    surge(dias, tq + 0.06, tq + 0.46, { x: 540, y: 716, rx: 2, ry: 0 }, { dy: 60 });
    surge(lin, tq + 0.12, tq + 0.52, { x: 540, y: 912, rx: 2, ry: 0 }, { dy: 60 });
    const bx = 540 - lin.w / 2 + (bru.m.rel.x - lin.m.rel.x + bru.m.w / 2) * sz, by = 912 - lin.h / 2 + (bru.m.rel.y - lin.m.rel.y + bru.m.h / 2) * sz;
    at(bru, tq + 0.42, { x: bx, y: by - 520, z: 120, k: 1.08, op: 0, rx: -10, ry: 0, rz: -4 }, EZ.lin);
    at(bru, tq + 0.48, { op: 1 }, EZ.lin);
    at(bru, tq + 0.76, { x: bx, y: by, z: 0, k: 1, rx: 2, ry: 0, rz: 0 }, EZ.in);
    at(bru, tq + 0.88, { y: by - 10 }, EZ.out); at(bru, tq + 1.0, { y: by }, EZ.in);
    bru.impacto = tq + 0.76; ev(tq + 0.76, 'impacto');
    destaque('Barra nova: Bruno T. · Quarto Bromélia 22 → 25', tq + 0.76, tq + 2.55, [bru, lin, dias, qua], { valor: 'Bruno T.', aro: [bru] });
    // flash: período ocupado
    const tf = tq + 2.55;
    for (const p of [qua, dias, lin, bru]) recua(p, tf, tf + 0.35, { blur: 9, dim: 0.7, z: -500, op: 0.5 });
    const av = peca('r_aviso', R, 3.0);
    at(av, tf, { x: 540, y: 760, z: 260, k: 1.25, op: 0, rx: 0, ry: 0 }, EZ.lin);
    at(av, tf + 0.2, { z: 0, k: 1, op: 1, rx: 2, ry: -2 }, EZ.back);
    av.flash = tf + 0.2; ev(tf + 0.2, 'alerta');
    destaque('Período ocupado (Chalé de Pedra 05)', tf + 0.2, E.s - 0.3, [av]);
    ligacao(E.s - 0.45, E.s + 0.45, () => ponto(av, 1, 0.5), () => tagNo(2));

    // ===== 2 SINAL 14–22,5 s =====
    const S = grupo('s', E.s, E.c);
    const s0 = E.s;
    etiqueta(S, 2, 'SINAL', s0 + 0.2, E.c);
    texto(S, 'O saldo já fica\n*calculado.*', s0 + 0.35, E.c);
    const ghS = fantasma(S, '04-pre-reserva.jpg', s0 + 0.05, s0 + 2.1, { y: 760, z: -720, op: 0.3 });
    const gus = daTela(peca('s_gustavo', S, 3.24), ghS, s0 + 0.2, s0 + 0.65, { x: 540, y: 600, rx: 3, ry: 4 });
    destaque('Gustavo Ribeiro · Pré-reserva', s0 + 0.65, s0 + 1.45, [gus]);
    const bReg = daTela(peca('s_btn_registrar', S, 2.9), ghS, s0 + 1.0, s0 + 1.45, { x: 540, y: 905, rx: 2, ry: 0 });
    toque(bReg, s0 + 1.65, 0.5, 0.5);
    recua(gus, s0 + 2.2, s0 + 2.6, { y: 520, blur: 8, dim: 0.6, op: 0.5, z: -560 });
    sai(bReg, s0 + 1.85, s0 + 2.15, { z: -400 });
    const ghS2 = fantasma(S, '05-sinal.jpg', s0 + 1.8, s0 + 4.4, { y: 760, z: -740, ry: -16, op: 0.26 });
    const campo = daTela(peca('s_campo_sinal', S, 3.08, { pad: 8 }), ghS2, s0 + 1.95, s0 + 2.4, { x: 540, y: 556, rx: 3, ry: -3 });
    conta(campo, 0, s0 + 2.25, s0 + 2.75, 0);
    const dep = daTela(peca('s_depois', S, 3.0), ghS2, s0 + 2.15, s0 + 2.6, { x: 540, y: 790, rx: 2, ry: 3 });
    destaque('Sinal R$ 315,00 → saldo R$ 735,00', s0 + 2.25, s0 + 3.9, [campo, dep], { valor: 'R$ 315,00 / R$ 735,00' });
    const bConf = daTela(peca('s_btn_confirmar', S, 2.7), ghS2, s0 + 3.35, s0 + 3.8, { x: 505, y: 945, rx: 2, ry: 0 });
    toque(bConf, s0 + 4.0, 0.5, 0.5);
    for (const p of [campo, dep]) sai(p, s0 + 4.2, s0 + 4.5, { z: -700, blur: 8 });
    sai(bConf, s0 + 4.25, s0 + 4.5, { z: -500 });
    sai(gus, s0 + 4.0, s0 + 4.3);
    // o chip muda de cor na frente de quem assiste: Pré-reserva → Confirmada
    const tc = s0 + 4.3;
    const chA = peca('s_chip_pre', S, 6.0), chB = peca('s_chip_conf', S, 6.0);
    at(chA, tc, { x: 540, y: 700, z: -300, k: 0.6, op: 0, rx: 0, ry: 0 }, EZ.lin); at(chA, tc + 0.25, { z: 0, k: 1, op: 1 }, EZ.back);
    at(chB, tc + 0.38, { x: 540, y: 700, z: 0, k: 1, op: 1, rx: 0, ry: 0, clip: 0 }, EZ.lin); at(chB, tc + 0.68, { clip: 1 }, EZ.io);
    sai(chA, tc + 0.68, tc + 0.72);
    chB.burst = tc + 0.55; ev(tc + 0.52, 'status');
    destaque('Pré-reserva → Confirmada', tc + 0.25, tc + 1.05, [chA, chB], { aro: [chB] });
    // Fernanda Lima (reserva confirmada): total, sinal e saldo se montam; o chip encolhe para o cabeçalho dela
    const tF = tc + 0.65;
    const fer = peca('s_fernanda', S, 3.24);
    surge(fer, tF, tF + 0.4, { x: 540, y: 560, rx: 2, ry: 3 }, { dy: 40, z: -300 });
    const chipEm = META.s_fernanda, chipCSS = META.s_chip_conf;
    at(chB, tF + 0.05, {}, EZ.lin);
    at(chB, tF + 0.45, { x: 540 - fer.w / 2 + (chipCSS.src.x - chipEm.src.x + chipCSS.w / 2) * 3.24, y: 560 - fer.h / 2 + (chipCSS.src.y - chipEm.src.y + chipCSS.h / 2) * 3.24, k: 3.24 / 6, z: 0, rx: 2, ry: 3 }, EZ.io);
    sai(chB, tF + 0.45, tF + 0.5);
    const sT = peca('s_total', S, 2.88, { pad: 12, padY: 9 }), sS = peca('s_sinalpago', S, 2.88, { pad: 12, padY: 9 }), sSa = peca('s_saldo', S, 2.9);
    surge(sT, tF + 0.3, tF + 0.6, { x: 540, y: 790, rx: 2, ry: -2 }, { dx: 300, dy: 0, z: -300 }); conta(sT, 0, tF + 0.4, tF + 0.75, 0);
    surge(sS, tF + 0.42, tF + 0.72, { x: 540, y: 874, rx: 2, ry: -2 }, { dx: 300, dy: 0, z: -300 }); conta(sS, 0, tF + 0.52, tF + 0.9, 0);
    surge(sSa, tF + 0.6, tF + 0.95, { x: 540, y: 1070, rx: 3, ry: 3 }, { dy: 120, z: -400 }); conta(sSa, 0, tF + 0.8, tF + 1.25, sT.furos[0].alvo);
    destaque('Total R$ 1.640,00 − sinal R$ 780,00 = saldo R$ 860,00', tF + 0.45, E.c - 0.3, [sT, sS, sSa], { valor: 'R$ 860,00', aro: [sSa] });
    for (const p of [fer, sT, sS, sSa]) respira(p, tF + 1, E.c, 0.5);
    ligacao(E.c - 0.45, E.c + 0.45, () => ponto(sSa, 1, 0.5), () => tagNo(3));

    // ===== 3 CHECK-IN 22,5–30,5 s =====
    const CI = grupo('c', E.c, E.m);
    const c0 = E.c;
    etiqueta(CI, 3, 'CHECK-IN', c0 + 0.2, E.m);
    texto(CI, 'Confere, confirma\ne *pronto.*', c0 + 0.35, E.m);
    const ghC = fantasma(CI, '06-check-in.jpg', c0 + 0.05, c0 + 2.6, { y: 760, z: -720, op: 0.3 });
    const dad = daTela(peca('c_dados', CI, 3.24), ghC, c0 + 0.25, c0 + 0.85, { x: 540, y: 690, rx: 3, ry: 0 });
    dad.scan = [c0 + 0.95, c0 + 1.9];
    destaque('Conferência: Fernanda Lima · Chalé Ipê · 17/10 → 20/10', c0 + 0.85, c0 + 2.2, [dad]);
    const cBtn = daTela(peca('c_btn', CI, 2.8), ghC, c0 + 1.7, c0 + 2.15, { x: 540, y: 1062, rx: 2, ry: 0 });
    toque(cBtn, c0 + 2.35, 0.5, 0.5);
    recua(dad, c0 + 2.45, c0 + 2.85, { blur: 8, dim: 0.6, op: 0.45, z: -600 });
    sai(cBtn, c0 + 2.55, c0 + 2.85, { z: -500 });
    // o status muda na hora: Confirmada → Hospedada
    const tc2 = c0 + 2.45;
    const chC = peca('s_chip_conf', CI, 6.0), chH = peca('c_chip_hosp', CI, 6.0);
    at(chC, tc2, { x: 540, y: 700, z: -300, k: 0.6, op: 0, rx: 0, ry: 0 }, EZ.lin); at(chC, tc2 + 0.25, { z: 0, k: 1, op: 1 }, EZ.back);
    at(chH, tc2 + 0.38, { x: 540, y: 700, z: 0, k: 1, op: 1, rx: 0, ry: 0, clip: 0 }, EZ.lin); at(chH, tc2 + 0.68, { clip: 1 }, EZ.io);
    sai(chC, tc2 + 0.68, tc2 + 0.72); chH.burst = tc2 + 0.55; ev(tc2 + 0.52, 'status');
    sai(dad, tc2 + 0.5, tc2 + 0.9);
    destaque('Confirmada → Hospedada', tc2 + 0.25, tc2 + 1.0, [chC, chH], { aro: [chH] });
    // recibo do check-in (o chip sobe e fica no alto)
    const tR = tc2 + 0.85;
    at(chH, tR, {}, EZ.lin); at(chH, tR + 0.4, { y: 446, k: 3.6 / 6 }, EZ.io);
    const fei = surge(peca('c_feito', CI, 2.8), tR + 0.05, tR + 0.45, { x: 540, y: 588, rx: 3, ry: -3 });
    const rec = surge(peca('c_recibo', CI, 3.08), tR + 0.15, tR + 0.6, { x: 540, y: 836, rx: 3, ry: 3 }, { dy: -40, z: -420 });
    ev(tR + 0.2, 'recibo');
    destaque('Check-in feito · recibo', tR + 0.6, tR + 2.15, [fei, rec], { aro: [rec] });
    // na lista de hospedagens ativas, "Hospedada"
    const tA = tR + 2.15;
    for (const p of [fei, rec]) recua(p, tA, tA + 0.4, { blur: 8, dim: 0.6, op: 0.4, z: -600, y: 420 });
    sai(chH, tA, tA + 0.35, { z: -500 });
    const ghA = fantasma(CI, '06-ativas.jpg', tA - 0.05, E.m, { y: 640, z: -760, ry: -16, op: 0.3 });
    const hosp = daTela(peca('c_hospedagens', CI, 2.6), ghA, tA + 0.05, tA + 0.5, { x: 400, y: 520, rx: 2, ry: 3 });
    const mar = daTela(peca('c_mariana', CI, 3.24), ghA, tA + 0.15, tA + 0.65, { x: 540, y: 790, rx: 3, ry: -3 });
    mar.pulso = tA + 0.8;
    destaque('Mariana Costa · Hospedada', tA + 0.65, E.m - 0.3, [mar]);
    for (const p of [hosp, mar]) respira(p, tA + 0.7, E.m, 0.5);
    ligacao(E.m - 0.45, E.m + 0.45, () => ponto(mar, 1, 0.5), () => tagNo(4));

    // ===== 4 COMANDA 30–37,5 s =====
    const M = grupo('m', E.m, E.o);
    etiqueta(M, 4, 'COMANDA', E.m + 0.2, E.o);
    texto(M, 'O consumo vai direto\npara a *conta da estadia.*', E.m + 0.35, E.o);
    const ghM = fantasma(M, '08-comanda.jpg', E.m + 0.1, E.o, { y: 700, z: -760, op: 0.24 });
    const mNome = daTela(peca('m_nome', M, 2.9), ghM, E.m + 0.3, E.m + 0.8, { x: 432, y: 500, rx: 2, ry: 3 });
    const mChip = daTela(peca('m_chip', M, 3.4), ghM, E.m + 0.4, E.m + 0.9, { x: 868, y: 448, rx: 2, ry: -3 });
    const mTot = daTela(peca('m_total', M, 2.78, { pad: 10, padY: 10 }), ghM, E.m + 0.6, E.m + 1.1, { x: 540, y: 660, rx: 2, ry: 0 });
    const itens = [];
    let soma = 0;
    for (let i = 1; i <= 5; i++) {
      const it = peca('m_item' + i, M, 2.72, { pad: 6, padY: 9 });
      const t0 = E.m + 1.1 + (i - 1) * 0.92, y = 760 + (i - 1) * 92;
      at(it, t0, { x: 370, y: y - 70, z: -460, k: 0.9, op: 0, rx: 18, ry: 14 }, EZ.lin);
      at(it, t0 + 0.1, { op: 1 }, EZ.lin);
      at(it, t0 + 0.42, { x: 490, y, z: 0, k: 1, rx: 1, ry: -2 }, EZ.out);
      const de = soma; soma += it.m && META['m_item' + i] ? 0 : 0;
      itens.push(it); ev(t0, 'item'); ev(t0 + 0.42, 'pop');
      destaque('Item ' + i, t0 + 0.4, t0 + 0.92, [it]);
    }
    // o total sobe a cada item: 66 → 78 → 134 → 270 → 287
    const valores = [6600, 1200, 5600, 13600, 1700];
    let acc = 0;
    valores.forEach((v, i) => { const t0 = E.m + 1.1 + i * 0.92 + 0.45; conta(mTot, 0, t0, t0 + 0.4, acc, acc + v); acc += v; });
    destaque('Total da comanda R$ 287,00', E.m + 1.1 + 4 * 0.92 + 0.92, E.o - 0.05, [mTot], { valor: 'R$ 287,00' });
    for (const p of [mNome, mChip, mTot, ...itens]) respira(p, E.m, E.o, 0.4);
    ligacao(E.o - 0.45, E.o + 0.45, () => ponto(mTot, 1, 0.5), () => tagNo(5));

    // ===== 5 CHECK-OUT 38–47,5 s =====
    const O = grupo('o', E.o, E.x);
    const o0 = E.o;
    etiqueta(O, 5, 'CHECK-OUT', o0 + 0.2, E.x);
    texto(O, 'O check-out só libera\ncom o *saldo zerado.*', o0 + 0.35, E.x);
    const ghO = fantasma(O, '07-ficha.jpg', o0 + 0.05, o0 + 3.2, { y: 700, z: -760, op: 0.26 });
    const linhas = ['o_diarias', 'o_consumos', 'o_descontos', 'o_total', 'o_pagos'].map((id, i) => {
      const p = peca(id, O, 2.88, { pad: 12, padY: 11 });
      const y = 448 + i * 86 + (i >= 3 ? 14 : 0);
      daTela(p, ghO, o0 + 0.25 + i * 0.22, o0 + 0.7 + i * 0.22, { x: 540, y, rx: 2, ry: 0 });
      conta(p, 0, o0 + 0.5 + i * 0.22, o0 + 0.95 + i * 0.22, 0);
      return p;
    });
    const oSal = daTela(peca('o_saldo', O, 2.95), ghO, o0 + 1.6, o0 + 2.05, { x: 540, y: 1040, rx: 3, ry: 3 });
    conta(oSal, 0, o0 + 1.85, o0 + 2.35, 0);
    destaque('Conta: 2.440 + 287 − 157 = 2.570 · pagos 2.158 · saldo R$ 412,00', o0 + 0.5, o0 + 3.5, [...linhas, oSal], { valor: 'R$ 412,00', aro: [oSal] });
    // o cadeado fechado
    const tL = o0 + 3.5;
    for (const p of linhas) sai(p, tL, tL + 0.35, { y: 300, z: -500, blur: 6 });
    at(oSal, tL, {}, EZ.lin); at(oSal, tL + 0.45, { y: 540 }, EZ.io);
    const bLock = surge(peca('o_btn_lock', O, 2.9), tL + 0.15, tL + 0.6, { x: 540, y: 760, rx: 2, ry: 0 });
    const regra = surge(peca('o_regra', O, 3.3), tL + 0.3, tL + 0.75, { x: 540, y: 880, rx: 2, ry: 0 });
    bLock.cadeado = { fecha: tL + 0.75, abre: 99 }; ev(tL + 0.75, 'cadeado');
    destaque('Fazer check-out com cadeado · libera com saldo zero', tL + 0.6, tL + 1.15, [bLock, regra], { aro: [bLock] });
    // receber R$ 412,00 no PIX
    const tP = tL + 1.1;
    const ghP = fantasma(O, '05-pagamento.jpg', tP - 0.1, tP + 2.3, { y: 900, z: -800, ry: -16, op: 0.24 });
    const pix = daTela(peca('o_pix', O, 3.0), ghP, tP, tP + 0.45, { x: 540, y: 1062, rx: 2, ry: 0 });
    const conf = daTela(peca('o_confirmar', O, 2.8), ghP, tP + 0.15, tP + 0.6, { x: 540, y: 1210, rx: 2, ry: 0 });
    toque(pix, tP + 0.7, 0.5, 0.5);
    toque(conf, tP + 1.15, 0.5, 0.5);
    ev(tP + 1.3, 'pago');
    destaque('Receber R$ 412,00 no PIX', tP + 0.6, tP + 2.05, [pix, conf], { aro: [conf] });
    // saldo vai a R$ 0,00, o cadeado abre
    const tZ = tP + 2.05;
    for (const p of [pix, conf]) sai(p, tZ, tZ + 0.35, { z: -500, blur: 6 });
    conta(oSal, 0, tZ + 0.05, tZ + 0.5, oSal.furos[0].alvo, 0);
    const qui = peca('o_quitado', O, 3.2);
    at(qui, tZ + 0.5, { x: 540, y: 540, z: 0, k: 1, op: 1, rx: 3, ry: 3, clip: 0 }, EZ.lin); at(qui, tZ + 0.8, { clip: 1 }, EZ.io);
    sai(oSal, tZ + 0.8, tZ + 0.85); qui.burst = tZ + 0.65; ev(tZ + 0.62, 'status');
    bLock.cadeado.abre = tZ + 0.9; ev(tZ + 0.9, 'cadeado_abre');
    const bLiv = peca('o_btn_livre', O, 2.9);
    at(bLiv, tZ + 1.5, { x: 540, y: 760, z: 0, k: 1, op: 0, rx: 2, ry: 0 }, EZ.lin); at(bLiv, tZ + 1.72, { op: 1 }, EZ.io);
    sai(bLock, tZ + 1.72, tZ + 1.76); sai(regra, tZ + 1.3, tZ + 1.55, { y: 920 });
    bLock.cadeado.some = tZ + 1.45; bLiv.brilho = tZ + 1.72;
    destaque('Saldo R$ 0,00 · Quitado · check-out liberado', tZ + 0.5, E.x - 0.3, [qui, bLiv], { valor: 'R$ 0,00', aro: [qui] });
    for (const p of [qui, bLiv]) respira(p, tZ + 1.5, E.x, 0.4);
    ligacao(E.x - 0.45, E.x + 0.45, () => ponto(bLiv, 1, 0.5), () => tagNo(6));

    // ===== 6 CAIXA 47,5–55 s =====
    const X = grupo('x', E.x, E.f);
    const x0 = E.x;
    etiqueta(X, 6, 'CAIXA', x0 + 0.2, E.f);
    texto(X, 'Contou o dinheiro?\nEle mostra *se bateu.*', x0 + 0.35, E.f);
    const ghX = fantasma(X, '10-caixa.jpg', x0 + 0.05, x0 + 3.4, { y: 640, z: -760, op: 0.24 });
    const xRec = daTela(peca('x_recebido', X, 2.88, { pad: 14, padY: 10 }), ghX, x0 + 0.25, x0 + 0.7, { x: 540, y: 470, rx: 2, ry: 2 });
    const fv = [90000, 12500, 38000, 12000];
    let ac = 0;
    const fps = ['x_pix', 'x_dinheiro', 'x_credito', 'x_debito'].map((id, i) => {
      const p = peca(id, X, 2.88, { pad: 6, padY: 4 });
      const t0 = x0 + 0.55 + i * 0.3, y = 620 + i * 96;
      at(p, t0, { x: 540, y: y - 220, z: 120, k: 1, op: 0, rx: -16, ry: 0 }, EZ.lin); at(p, t0 + 0.12, { op: 1 }, EZ.lin);
      at(p, t0 + 0.3, { y, z: 0, rx: 2 }, EZ.in); at(p, t0 + 0.38, { y: y - 6 }, EZ.out); at(p, t0 + 0.46, { y }, EZ.in);
      conta(xRec, 0, t0 + 0.3, t0 + 0.62, ac, ac + fv[i]); ac += fv[i];
      ev(t0 + 0.3, 'moeda', { i });
      return p;
    });
    destaque('Recebido por forma de pagamento R$ 1.525,00', x0 + 0.85, x0 + 3.6, [xRec, ...fps], { valor: 'R$ 1.525,00' });
    const tE = x0 + 3.65;
    for (const p of [xRec, ...fps]) sai(p, tE, tE + 0.4, { z: -650, blur: 8 });
    const esp = surge(peca('x_esperado', X, 2.86), tE + 0.1, tE + 0.55, { x: 540, y: 522, rx: 3, ry: -3 }, { dy: 0, z: -500 });
    conta(esp, 0, tE + 0.35, tE + 0.75, 0); ev(tE + 0.15, 'gaveta');
    destaque('Esperado em dinheiro R$ 285,00', tE + 0.4, tE + 1.1, [esp], { valor: 'R$ 285,00' });
    const tK = tE + 0.6;
    const ghK = fantasma(X, '10-fechamento.jpg', tK, E.f, { y: 520, z: -800, ry: 16, op: 0.18 });
    const rot = daTela(peca('x_contado_rot', X, 3.2), ghK, tK + 0.05, tK + 0.45, { x: 250, y: 742, rx: 2, ry: 2 });
    const cont = daTela(peca('x_contado', X, 2.8), ghK, tK + 0.15, tK + 0.55, { x: 640, y: 742, rx: 2, ry: -2 });
    conta(cont, 0, tK + 0.45, tK + 0.85, 0);
    const fal = daTela(peca('x_falta', X, 2.97), ghK, tK + 0.95, tK + 1.35, { x: 540, y: 902, rx: 1, ry: 0 });
    fal.flash = tK + 1.35; ev(tK + 1.35, 'falta');
    destaque('Valor contado R$ 270,00', tE + 1.1, tK + 1.3, [rot, cont], { valor: 'R$ 270,00', aro: [cont] });
    destaque('Falta R$ 15,00', tK + 1.3, E.f - 0.3, [fal], { valor: 'Falta R$ 15,00' });
    for (const p of [rot, cont, esp]) respira(p, tK + 1.4, E.f, 0.4);

    // ===== FECHO 54–59,5 s · o anel das 6 etapas em volta da logo =====
    const F = grupo('f', E.f, DUR + 1);
    for (const p of [rot, cont, fal, esp]) { at(p, E.f - 0.3, {}, EZ.lin); at(p, E.f + 0.25, { x: 540, y: 800, k: 0.05, op: 0, z: -200 }, EZ.in); }
    FECHO = { t0: E.f, g: F };
    ev(E.f + 0.35, 'anel');
    for (let i = 0; i < 6; i++) ev(E.f + 0.45 + i * 0.16, 'no', { i });
    ev(E.f + 1.45, 'logo');
    ev(E.f + 2.2, 'pilula');
  }
  let FECHO = null;

  // pontos de ancoragem para a linha do ciclo
  function ponto(p, u, v) { return () => p.ultimo ? [p.ultimo.cx + (u - 0.5) * p.ultimo.w + panX(p.g, CUR_T), p.ultimo.cy + (v - 0.5) * p.ultimo.h] : [540, 960]; }
  function tagNo(n) { return () => { const g = Object.values(GRUPOS)[n]; return [80 + 29 + panX(g, CUR_T), 160 + 29]; }; }
  let CUR_T = 0;

  // ---------------- o fecho ----------------
  const NOMES = ['RESERVA', 'SINAL', 'CHECK-IN', 'COMANDA', 'CHECK-OUT', 'CAIXA'];
  const ICONES = ['reservas', 'dinheiro', 'chegada', 'comandas', 'saida', 'caixa'];
  let F_EL = null;
  function montaFecho() {
    const g = FECHO.g;
    const cx = 540, cy = 800, R0 = 250;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', H); Object.assign(svg.style, { position: 'absolute', left: 0, top: 0, display: 'none', overflow: 'visible' });
    g.el.appendChild(svg);
    const ns = (t, a, par = svg) => { const e = document.createElementNS('http://www.w3.org/2000/svg', t); for (const k in a) e.setAttribute(k, a[k]); par.appendChild(e); return e; };
    const defs = ns('defs', {});
    const fl = ns('filter', { id: 'glowF', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    ns('feGaussianBlur', { stdDeviation: '10', result: 'b' }, fl);
    const mg = ns('feMerge', {}, fl); ns('feMergeNode', { in: 'b' }, mg); ns('feMergeNode', { in: 'SourceGraphic' }, mg);
    const trilho = ns('circle', { cx, cy, r: R0, fill: 'none', stroke: '#262626', 'stroke-width': 6 });
    const arco = ns('circle', { cx, cy, r: R0, fill: 'none', stroke: C.limao, 'stroke-width': 7, 'stroke-linecap': 'round', filter: 'url(#glowF)', transform: `rotate(-90 ${cx} ${cy})`, 'stroke-dasharray': `${2 * Math.PI * R0}`, 'stroke-dashoffset': `${2 * Math.PI * R0}` });
    const nos = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3, x = cx + R0 * Math.cos(a), y = cy + R0 * Math.sin(a);
      const gg = ns('g', { transform: `translate(${x} ${y})` });
      const c = ns('circle', { r: 46, fill: '#0A0A0A', stroke: C.limao, 'stroke-width': 5 }, gg);
      const ic = ns('g', { transform: 'translate(-21 -21) scale(1.75)', stroke: C.branco, fill: 'none', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gg);
      ic.innerHTML = ICONE_SVG[ICONES[i]] || '';
      // rótulo do lado de fora
      const lx = x + Math.cos(a) * 74, ly = y + Math.sin(a) * 74;
      const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
      const tx = ns('text', { x: lx, y: ly + (Math.abs(Math.sin(a)) > 0.9 ? (Math.sin(a) > 0 ? 34 : -6) : 13), 'text-anchor': anchor, fill: C.branco, 'font-family': 'ID', 'font-weight': 800, 'font-size': 38, 'letter-spacing': '1' });
      tx.textContent = NOMES[i];
      nos.push({ gg, c, tx, x, y });
    }
    const logo = el('img', null, g.el, { position: 'absolute', left: (cx - 150) + 'px', top: (cy - 150) + 'px', width: '300px', height: '300px', display: 'none' });
    logo.src = 'assets/fazlo-hospeda-logo-alpha.png';
    const marca = el('img', null, g.el, { position: 'absolute', left: (540 - 230) + 'px', top: '1205px', width: '420px', display: 'none' });
    marca.src = 'assets/fazlo-hospeda-logo-escura@3x.png';
    const tx = texto(g, 'Da reserva ao caixa,\n*tudo conectado.*', E.f + 1.7, DUR + 1, { align: 'center', x: 70, w: 940, y: 236, px: 70 });
    const pil = el('div', null, g.el, { position: 'absolute', left: '540px', top: '1330px', transform: 'translateX(-50%)', background: C.limao, color: '#0A0A0A', font: `900 42px 'ID'`, letterSpacing: '-0.01em', padding: '22px 40px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'none', boxShadow: '0 20px 60px rgba(175,250,39,.25)' });
    pil.innerHTML = 'Chame no WhatsApp · link na bio';
    F_EL = { svg, arco, nos, logo, marca, pil, cx, cy, R0, trilho };
  }
  function desenhaFecho(t) {
    const f = F_EL, t0 = E.f;
    const vis = t >= t0 - 0.1;
    f.svg.style.display = vis ? 'block' : 'none';
    if (!vis) { f.logo.style.display = f.marca.style.display = f.pil.style.display = 'none'; return; }
    const L = 2 * Math.PI * f.R0;
    const u = ramp(t, t0 + 0.3, t0 + 1.35, EZ.io);
    f.arco.setAttribute('stroke-dashoffset', L * (1 - u));
    f.trilho.setAttribute('opacity', ramp(t, t0, t0 + 0.3));
    const rot = (1 - ramp(t, t0, t0 + 1.8, EZ.out)) * -40;
    f.svg.style.transform = `rotate(${rot}deg) scale(${0.85 + 0.15 * ramp(t, t0, t0 + 1.2, EZ.out)})`; f.svg.style.transformOrigin = `${f.cx}px ${f.cy}px`;
    f.nos.forEach((n, i) => {
      const ti = t0 + 0.45 + i * 0.16;
      const a = ramp(t, ti, ti + 0.3, EZ.back);
      n.gg.setAttribute('opacity', clamp((t - ti) / 0.12, 0, 1));
      n.gg.setAttribute('transform', `translate(${n.x} ${n.y}) scale(${0.4 + 0.6 * a}) rotate(${-rot})`);
      const lit = ramp(t, ti, ti + 0.2);
      n.c.setAttribute('fill', lit > 0.5 && t < ti + 0.35 ? C.limao : '#0A0A0A');
      n.tx.setAttribute('opacity', ramp(t, ti + 0.1, ti + 0.4));
    });
    // o rótulo não gira com o anel
    f.nos.forEach((n) => { n.tx.setAttribute('transform', `rotate(${-rot} ${f.cx} ${f.cy})`); });
    const lg = ramp(t, t0 + 1.35, t0 + 1.75, EZ.back);
    f.logo.style.display = t >= t0 + 1.3 ? 'block' : 'none';
    f.logo.style.transform = `scale(${0.2 + 0.8 * lg})`; f.logo.style.opacity = clamp((t - t0 - 1.3) / 0.12, 0, 1);
    const mk = ramp(t, t0 + 1.9, t0 + 2.4);
    f.marca.style.display = t >= t0 + 1.9 ? 'block' : 'none'; f.marca.style.opacity = mk; f.marca.style.transform = `translateY(${(1 - mk) * 30}px)`;
    const pk = ramp(t, t0 + 2.2, t0 + 2.65, EZ.back);
    f.pil.style.display = t >= t0 + 2.2 ? 'block' : 'none'; f.pil.style.opacity = clamp((t - t0 - 2.2) / 0.15, 0, 1); f.pil.style.transform = `translateX(-50%) scale(${0.6 + 0.4 * pk})`;
  }
  const ICONE_SVG = {};

  // ---------------- render ----------------
  function aplicaPeca(p, t) {
    let s = estado(p, t);
    if (p.filho) { // barras dentro do calendário
      if (!s || s.op <= 0.001) { p.el.style.display = 'none'; return; }
      p.el.style.display = 'block';
      p.el.style.transform = `translate(${p.rel.x + s.x}px, ${p.rel.y + s.y}px) scale(${s.k})`;
      p.el.style.transformOrigin = '50% 100%';
      p.el.style.opacity = s.op;
      return;
    }
    const g = p.g;
    if (!s || s.op <= 0.002 || t < g.t0 - 0.5 || t > g.t1 + 0.5) { p.el.style.display = 'none'; p.ultimo = null; return; }
    s = { ...s };
    // respiração
    for (const [a, b, amp] of p.resp || []) if (t >= a && t <= b) { const ph = (t - a); s.ry += Math.sin(ph * 0.9 + p.w * 0.01) * 1.2 * amp; s.rx += Math.sin(ph * 0.7 + 1.3) * 0.8 * amp; s.y += Math.sin(ph * 1.1) * 4 * amp; }
    // afunda no toque
    let afunda = 0; for (const tt of p.toques || []) { const d = t - tt; if (d > -0.06 && d < 0.4) afunda = Math.max(afunda, d < 0.08 ? (d + 0.06) / 0.14 : 1 - (d - 0.08) / 0.32); }
    afunda = clamp(afunda, 0, 1);
    const k = s.k * (1 - 0.03 * afunda), z = s.z - 60 * afunda;
    p.el.style.display = 'block';
    p.el.style.transform = `translate3d(${s.x - p.w / 2}px, ${s.y - p.h / 2}px, ${z}px) rotateX(${s.rx}deg) rotateY(${s.ry}deg) rotateZ(${s.rz}deg) scale(${k})`;
    p.el.style.opacity = s.op;
    p.el.style.filter = s.blur > 0.15 ? `blur(${s.blur.toFixed(2)}px)` : 'none';
    p.vel.style.opacity = clamp(s.dim, 0, 1);
    p.el.style.clipPath = s.clip < 0.999 ? `circle(${(s.clip * 75).toFixed(2)}% at 50% 50%)` : 'none';
    // destaque (contorno limão) e sombra
    let hi = 0; for (const [a, b] of p.destaque) hi = Math.max(hi, ramp(t, a, a + 0.25) * (1 - ramp(t, b - 0.05, b + 0.25)));
    const sh = p.sombra * (1 - afunda * 0.6);
    const fl = p.flash != null ? Math.max(0, 1 - Math.abs(t - p.flash - 0.08) / 0.3) : 0;
    p.el.style.boxShadow = `0 ${34 * sh}px ${80 * sh}px rgba(0,0,0,${0.62 * sh}), 0 ${8 * sh}px ${22 * sh}px rgba(0,0,0,0.4)` +
      (p.escuro ? `, 0 0 0 2px rgba(255,255,255,0.16)` : '') + (hi > 0.01 ? `, 0 0 0 ${4 * hi}px rgba(175,250,39,${0.95 * hi}), 0 0 ${60 * hi}px rgba(175,250,39,${0.28 * hi})` : '') +
      (fl > 0 ? `, 0 0 0 ${10 * fl}px rgba(232,163,23,${0.9 * fl}), 0 0 ${120 * fl}px rgba(232,163,23,${0.6 * fl})` : '');
    p.ultimo = { cx: s.x, cy: s.y, w: p.w * k, h: p.h * k, z, op: s.op, blur: s.blur, hi, dim: s.dim };
    // ondas do toque
    for (const o of p.ondas) {
      const d = t - o.t;
      if (d < -0.12 || d > 0.7) { o.d.style.opacity = 0; continue; }
      if (d < 0) { o.d.style.opacity = 0.9; o.d.style.transform = `scale(${4 + 2 * (d + 0.12) / 0.12})`; continue; }
      const u = EZ.out(clamp(d / 0.6, 0, 1));
      o.d.style.opacity = 0.55 * (1 - u);
      o.d.style.transform = `scale(${6 + u * p.w * 2.4 / 10})`;
    }
    // furos: valores que contam
    for (const f of p.furos) {
      let v = f.alvo, ativo = null;
      for (const c of f.cont) { if (t < c.t0) { if (!ativo) v = c.de; break; } ativo = c; v = t >= c.t1 ? c.ate : lerp(c.de, c.ate, EZ.out((t - c.t0) / (c.t1 - c.t0))); }
      if (f.cont.length && t < f.cont[0].t0) v = f.cont[0].de;
      const rolando = f.cont.some((c) => t >= c.t0 && t < c.t1);
      const txt = f.input ? brl(v).replace('R$ ', '') : (f.prefixo.trim().startsWith('−') ? '− ' + brl(Math.abs(v)) : brl(v));
      const chave = txt + (rolando ? '~' + v.toFixed(1) : '');
      if (f.ultimo === chave) continue; f.ultimo = chave;
      if (!rolando) { f.span.textContent = txt; continue; }
      // odômetro: cada dígito rola até o próximo
      f.span.innerHTML = '';
      const ab = Math.abs(v); let pos = 0; const dig = txt.replace(/\D/g, '').length;
      for (const ch of txt) {
        if (!/\d/.test(ch)) { const s2 = document.createElement('span'); s2.textContent = ch; Object.assign(s2.style, { display: 'inline-block', height: f.lh + 'px', lineHeight: f.lh + 'px', verticalAlign: 'top', whiteSpace: 'pre' }); f.span.appendChild(s2); continue; }
        const place = Math.pow(10, dig - 1 - pos); pos++;
        const q = ab / place, d0 = Math.floor(q) % 10, fr = q - Math.floor(q);
        const roll = place === 1 ? fr : clamp((fr - 0.8) / 0.2, 0, 1);
        const box = document.createElement('span'); Object.assign(box.style, { display: 'inline-block', height: f.lh + 'px', overflow: 'hidden', verticalAlign: 'top' });
        const col = document.createElement('span'); Object.assign(col.style, { display: 'block', transform: `translateY(${-roll * f.lh}px)` });
        col.innerHTML = `<span style="display:block;height:${f.lh}px;line-height:${f.lh}px">${d0}</span><span style="display:block;height:${f.lh}px;line-height:${f.lh}px">${(d0 + 1) % 10}</span>`;
        box.appendChild(col); f.span.appendChild(box);
      }
    }
  }

  // efeitos soltos (camada própria): explosão de status, varredura da conferência, cadeado, brilho
  let FX, LOCK;
  function montaFX() {
    FX = el('div', 'fx', ROOT, { position: 'absolute', inset: 0, pointerEvents: 'none' });
    LOCK = el('div', null, FX, { position: 'absolute', display: 'none' });
    LOCK.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path class="arco" d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  }
  const BURSTS = [];
  function fx(t) {
    // explosões de status (anel que se abre a partir da peça)
    let html = '';
    for (const p of PECAS) {
      for (const [tb, cor] of [[p.burst, C.limao], [p.impacto, C.limao], [p.pulso, C.limao], [p.brilho, C.limao]]) {
        if (tb == null || !p.ultimo) continue; const d = t - tb; if (d < 0 || d > 0.7) continue;
        const u = EZ.out(d / 0.7), r = Math.max(p.ultimo.w, p.ultimo.h) * (0.55 + 0.5 * u);
        html += `<div style="position:absolute;left:${p.ultimo.cx - r}px;top:${p.ultimo.cy - r * (p.ultimo.h / p.ultimo.w > 0.6 ? 1 : 0.35)}px;width:${2 * r}px;height:${2 * r * (p.ultimo.h / p.ultimo.w > 0.6 ? 1 : 0.35)}px;border-radius:50%;border:${6 * (1 - u)}px solid ${cor};opacity:${(1 - u) * 0.9}"></div>`;
      }
      // varredura limão na conferência dos dados
      if (p.scan && p.ultimo && t >= p.scan[0] && t <= p.scan[1]) {
        const u = EZ.io((t - p.scan[0]) / (p.scan[1] - p.scan[0])), y = p.ultimo.cy - p.ultimo.h / 2 + u * p.ultimo.h;
        html += `<div style="position:absolute;left:${p.ultimo.cx - p.ultimo.w / 2 - 20}px;top:${y - 3}px;width:${p.ultimo.w + 40}px;height:6px;background:${C.limao};box-shadow:0 0 30px ${C.limao};opacity:${Math.sin(u * Math.PI)}"></div>`;
      }
    }
    // a linha do ciclo
    for (const l of CICLO) {
      if (t < l.t0 || t > l.t1 + 0.6) continue;
      const a = l.de()(), b = l.ate()();
      const u = ramp(t, l.t0, l.t1, EZ.io), fade = 1 - ramp(t, l.t1, l.t1 + 0.6);
      const mx = (a[0] + b[0]) / 2, c1 = [a[0] + 260, a[1]], c2 = [b[0] - 60, b[1] + 520];
      const d = `M${a[0]},${a[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${b[0]},${b[1]}`;
      html += `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><path d="${d}" pathLength="1" fill="none" stroke="${C.limao}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${u} 1" opacity="${fade}" style="filter:drop-shadow(0 0 12px ${C.limao})"/></svg>`;
    }
    FX.innerHTML = html;
    FX.appendChild(LOCK);
    // cadeado do botão de check-out
    const bl = PECAS.find((p) => p.cadeado);
    if (bl && bl.ultimo && t >= bl.cadeado.fecha - 0.4 && bl.el.style.display !== 'none') {
      const ic = bl.m.icones[0], sc = bl.s * bl.ultimo.w / bl.w;
      const big = 1 + 0.9 * Math.max(0, 1 - Math.abs(t - bl.cadeado.fecha) / 0.35) + 0.9 * Math.max(0, 1 - Math.abs(t - bl.cadeado.abre - 0.1) / 0.45);
      const sz = ic.w * sc * big;
      const x = bl.ultimo.cx - bl.ultimo.w / 2 + (ic.x + ic.w / 2) * sc, y = bl.ultimo.cy - bl.ultimo.h / 2 + (ic.y + ic.h / 2) * sc;
      const aberto = ramp(t, bl.cadeado.abre, bl.cadeado.abre + 0.25, EZ.back);
      Object.assign(LOCK.style, { display: 'block', left: x - sz / 2 + 'px', top: y - sz / 2 + 'px', width: sz + 'px', height: sz + 'px', color: aberto > 0.05 ? '#2A3A00' : '#8C8C85', filter: aberto > 0.05 ? `drop-shadow(0 0 ${10 * aberto}px ${C.limao}) drop-shadow(0 0 ${4 * aberto}px ${C.limao})` : 'none', opacity: bl.ultimo.op * (1 - ramp(t, bl.cadeado.some ?? 99, (bl.cadeado.some ?? 99) + 0.12)), background: big > 1.02 || aberto > 0 ? 'transparent' : 'transparent' });
      const arco = LOCK.querySelector('.arco');
      arco.setAttribute('transform', `translate(${aberto * 5} ${-aberto * 3.2}) rotate(${aberto * 18} 17 11)`);
      // tampa o ícone original do botão enquanto o cadeado animado está por cima
      html = `<div style="position:absolute;left:${x - ic.w * sc * 0.6}px;top:${y - ic.h * sc * 0.6}px;width:${ic.w * sc * 1.2}px;height:${ic.h * sc * 1.2}px;background:${bl.m.tile.fundo};border-radius:8px;opacity:${bl.ultimo.op * (1 - ramp(t, bl.cadeado.some ?? 99, (bl.cadeado.some ?? 99) + 0.12))}"></div>`;
      FX.insertAdjacentHTML('afterbegin', html);
    } else LOCK.style.display = 'none';
  }

  function renderAt(t) {
    CUR_T = t;
    // fundo: preto da marca, com um brilho suave que acompanha o destaque
    for (const g of Object.values(GRUPOS)) {
      const vis = t >= g.t0 - 0.5 && t <= g.t1 + 0.5;
      g.el.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      const x = panX(g, t);
      const mov = Math.abs(x) > 2 && Math.abs(x) < 1240;
      g.el.style.transform = `translateX(${x}px)`;
      g.el.style.filter = mov ? 'url(#mblur)' : 'none';
    }
    const vel = Math.max(0, ...Object.values(GRUPOS).map((g) => { const x0 = panX(g, t - 1 / 60), x1 = panX(g, t); return Math.abs(x1 - x0); }));
    FBLUR.setAttribute('stdDeviation', `${Math.min(28, vel * 0.55).toFixed(1)} 0`);
    for (const e of EXTRAS) if (e.tipo === 'fantasma') {
      const gh = e.gh, vis = t >= gh.t0 && t <= gh.t1 + 0.4;
      gh.img.style.display = vis && gh.op > 0 ? 'block' : 'none';
      if (!vis) continue;
      const a = ramp(t, gh.t0, gh.t0 + 0.5) * (1 - ramp(t, gh.t1 - 0.1, gh.t1 + 0.4));
      const dz = (t - gh.t0) * -30;
      gh.img.style.transform = `translate3d(${gh.x - gh.w / 2}px, ${gh.y - gh.h / 2}px, ${gh.z + dz}px) rotateX(${gh.rx}deg) rotateY(${gh.ry}deg)`;
      gh.img.style.opacity = gh.op * a;
      gh.img.style.filter = 'blur(1.5px) brightness(0.9)';
    }
    for (const p of PECAS) aplicaPeca(p, t);
    for (const tx of TEXTOS) {
      const vis = t >= tx.t0 && t <= tx.t1 + 0.4 && t >= tx.g.t0 - 0.5 && t <= tx.g.t1 + 0.5;
      tx.box.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      tx.linhas.forEach((ln, i) => {
        const a = tx.t0 < 0 ? 1 : ramp(t, tx.t0 + i * 0.09, tx.t0 + i * 0.09 + 0.5, EZ.expo);
        const b = ramp(t, tx.t1 - 0.3 + i * 0.05, tx.t1 + 0.05 + i * 0.05, EZ.in);
        ln.style.transform = `translateY(${(1 - a) * 110 - b * 110}%)`;
      });
    }
    for (const tg of TAGS) {
      const vis = t >= tg.t0 - 0.1 && t <= tg.t1 + 0.5;
      tg.e.style.display = vis ? 'flex' : 'none';
      if (!vis) continue;
      const a = ramp(t, tg.t0, tg.t0 + 0.4, EZ.back);
      tg.e.style.opacity = clamp((t - tg.t0) / 0.15, 0, 1);
      tg.no.style.transform = `scale(${0.3 + 0.7 * a})`;
      tg.no.style.boxShadow = `0 0 ${30 * (1 - ramp(t, tg.t0 + 0.2, tg.t0 + 1))}px ${C.limao}`;
    }
    GLOW.style.opacity = 0.9;
    desenhaFecho(t);
    fx(t);
  }

  // caixas visíveis no quadro (para o QA): peças, textos, etiqueta e fecho
  function caixas(t) {
    renderAt(t);
    const out = [];
    const add = (nome, tipo, e, extra = {}) => { if (!e || e.style.display === 'none') return; const b = e.getBoundingClientRect(); if (b.width < 1) return; const sc = ROOT.getBoundingClientRect().width / W; out.push({ nome, tipo, x0: b.left / sc, y0: b.top / sc, x1: b.right / sc, y1: b.bottom / sc, ...extra }); };
    for (const p of PECAS) if (!p.filho && p.ultimo && p.ultimo.op > 0.05) add(p.id, 'peca', p.el, { blur: p.ultimo.blur, op: p.ultimo.op, hi: p.ultimo.hi, dim: p.ultimo.dim, corpo: p.m.minFont * p.s * (p.ultimo.w / p.w) });
    for (const tx of TEXTOS) if (tx.box.style.display !== 'none') { for (const ln of tx.linhas) add('texto', 'texto', ln, { px: tx.px }); }
    for (const tg of TAGS) add('etiqueta', 'tag', tg.e);
    if (F_EL && F_EL.svg.style.display !== 'none') { add('logo', 'fecho', F_EL.logo); add('marca', 'fecho', F_EL.marca); add('pilula', 'fecho', F_EL.pil); F_EL.nos.forEach((n, i) => { if (+n.tx.getAttribute('opacity') > 0.05) add(NOMES[i], 'fecho', n.tx); }); }
    return out;
  }

  async function init(root, meta) {
    ROOT = root; META = meta;
    for (const k in META) META[k].png = META[k].png; // caminhos relativos a src/
    BG = el('div', 'bg', ROOT, { position: 'absolute', inset: 0, background: `radial-gradient(ellipse 900px 1100px at 540px 820px, #161616 0%, #0B0B0B 60%, #070707 100%)` });
    el('div', 'grade', ROOT, { position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1.2px, transparent 1.6px)', backgroundSize: '36px 36px', maskImage: 'radial-gradient(ellipse 700px 900px at 540px 860px, #000 20%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 700px 900px at 540px 860px, #000 20%, transparent 80%)' });
    GLOW = el('div', 'glow', ROOT, { position: 'absolute', left: '90px', top: '360px', width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(175,250,39,0.07), rgba(175,250,39,0) 65%)' });
    SVGF = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); SVGF.setAttribute('width', 0); SVGF.setAttribute('height', 0); SVGF.style.position = 'absolute';
    SVGF.innerHTML = '<filter id="mblur" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="0 0"/></filter>';
    ROOT.appendChild(SVGF); FBLUR = SVGF.querySelector('feGaussianBlur');
    // ícones do anel (svg do pacote)
    await Promise.all(ICONES.map(async (n) => { const s = await (await fetch('assets/icones/' + n + '.svg')).text(); ICONE_SVG[n] = s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); }));
    monta();
    montaFecho();
    montaFX();
    for (const tx of TEXTOS) ajustaTexto(tx);
    await preparaCapa();
    // espera todas as imagens
    await Promise.all([...ROOT.querySelectorAll('img')].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = () => i.decode().then(r, r); i.onerror = r; }))));
  }

  let CAPA = null;
  function capaGrade() { return CAPA(); }

  // ---------------- capa (canvas 2D, para a grade) ----------------
  // "Um dia inteiro da pousada", o painel do dia (R$ 1.525,00) e o anel das 6 etapas com a logo no centro.
  let ICON_IMG = {}, LOGO_IMG = null, REC_IMG = null;
  async function preparaCapa() {
    const ld = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    for (const n of ICONES) ICON_IMG[n] = await ld('data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#F7F7F2" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONE_SVG[n]}</svg>`));
    LOGO_IMG = await ld('assets/fazlo-hospeda-logo-alpha.png');
    REC_IMG = await ld(META.g_recebido.png);
  }
  function desenhaCapa(c, dy, caixas) {
    const box = (nome, x0, y0, x1, y1) => caixas.push({ nome, x0, y0: y0 + dy, x1, y1: y1 + dy });
    c.save(); c.translate(0, dy);
    // título
    c.fillStyle = C.branco; c.font = `900 112px ID`; c.textBaseline = 'alphabetic';
    if (c.letterSpacing !== undefined) c.letterSpacing = '-2.5px';
    const L1 = 'Um dia inteiro', L2a = 'da ', L2b = 'pousada';
    const y1 = 0, xT = 92;
    c.fillText(L1, xT, y1 + 96); const w1 = c.measureText(L1).width;
    c.fillText(L2a, xT, y1 + 212); const wa = c.measureText(L2a).width;
    c.fillStyle = C.limao; c.fillText(L2b, xT + wa, y1 + 212); const wb = c.measureText(L2b).width;
    box('título', xT, y1 + 8, xT + Math.max(w1, wa + wb), y1 + 236);
    // o painel do dia: Recebido hoje R$ 1.525,00 (a peça real, com o valor escrito na mesma fonte)
    const m = META.g_recebido, s2 = 2.55, cw = m.w * s2, chh = m.h * s2, cx0 = 540 - cw / 2, cy0 = y1 + 296;
    c.save(); c.shadowColor = 'rgba(175,250,39,0.28)'; c.shadowBlur = 60;
    const rr = (m.tile.r || 18) * s2;
    c.beginPath(); c.roundRect(cx0, cy0, cw, chh, rr); c.fillStyle = '#0A0A0A'; c.fill(); c.restore();
    c.save(); c.beginPath(); c.roundRect(cx0, cy0, cw, chh, rr); c.clip(); c.drawImage(REC_IMG, cx0, cy0, cw, chh);
    const hl = m.holes[0]; c.fillStyle = hl.cor; c.font = `${hl.peso} ${hl.px * s2}px 'Geist Mono'`; c.textBaseline = 'middle';
    if (c.letterSpacing !== undefined) c.letterSpacing = parseFloat(hl.ls) * s2 + 'px';
    c.fillText('R$ 1.525,00', cx0 + hl.x * s2, cy0 + (hl.y + hl.h / 2) * s2 + 2); c.restore();
    c.save(); c.beginPath(); c.roundRect(cx0, cy0, cw, chh, rr); c.lineWidth = 4; c.strokeStyle = C.limao; c.stroke(); c.restore();
    box('painel', cx0, cy0, cx0 + cw, cy0 + chh);
    // anel das etapas com a logo
    const rcx = 540, rcy = cy0 + chh + 300, R0 = 196;
    c.save(); c.lineWidth = 7; c.strokeStyle = C.limao; c.shadowColor = C.limao; c.shadowBlur = 24; c.beginPath(); c.arc(rcx, rcy, R0, 0, Math.PI * 2); c.stroke(); c.restore();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3, x = rcx + R0 * Math.cos(a), y = rcy + R0 * Math.sin(a);
      c.beginPath(); c.arc(x, y, 40, 0, Math.PI * 2); c.fillStyle = '#0A0A0A'; c.fill(); c.lineWidth = 5; c.strokeStyle = C.limao; c.stroke();
      if (ICON_IMG[ICONES[i]]) c.drawImage(ICON_IMG[ICONES[i]], x - 21, y - 21, 42, 42);
    }
    c.drawImage(LOGO_IMG, rcx - 132, rcy - 132, 264, 264);
    box('anel', rcx - R0 - 45, rcy - R0 - 45, rcx + R0 + 45, rcy + R0 + 45);
    c.restore();
  }
  CAPA = () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const g = c.createRadialGradient(540, 900, 50, 540, 900, 1100); g.addColorStop(0, '#161616'); g.addColorStop(0.6, '#0B0B0B'); g.addColorStop(1, '#070707');
    let cx = []; desenhaCapa(document.createElement('canvas').getContext('2d'), 0, cx);
    const topo = Math.min(...cx.map((b) => b.y0)), base = Math.max(...cx.map((b) => b.y1));
    const dy = Math.round(960 - (topo + base) / 2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const caixas = []; desenhaCapa(c, dy, caixas);
    return { png: cv.toDataURL('image/png'), caixas, bloco: { topo: topo + dy, base: base + dy, centro: (topo + base) / 2 + dy } };
  };


  window.REEL = {
    init, renderAt, caixas, capaGrade, DURATION: DUR, E,
    destaques: () => DESTAQUES.slice().sort((a, b) => a.t0 - b.t0),
    eventos: () => EVENTOS.slice().sort((a, b) => a.t - b.t),
    pecas: () => PECAS.map((p) => ({ id: p.id, s: p.s, minFont: p.m.minFont, w: p.w, h: p.h })),
    setCapa: (f) => { CAPA = f; },
    META: () => META,
  };
})();
