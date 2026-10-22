/*
 * SÉRIE EXPLICA (FAZLO Hospeda) — motor de vídeos explicativos em capítulos, 60–90 s.
 *
 * O episódio inteiro vem de episodios/<id>.json, já com o tempo da narração (audio/<id>/linha.json, de scripts/linha.py).
 * Cada capítulo é um "quadro" de 1080×1920 empilhado no mundo (o capítulo k fica em y = k·1920). Um TRILHO limão com
 * brilho liga os nós numerados 01…09; na troca de capítulo a câmera segue o trilho (desce, faz a curva) e o nó do
 * capítulo novo acende. Dentro do capítulo nada é trocado: o rótulo e o título (2 linhas) ficam fixos, a linha de apoio
 * muda a cada frase e o DIAGRAMA cresce peça por peça no tempo da voz (cada peça tem "em": a palavra que a dispara).
 *
 * Biblioteca de diagramas (CENAS): capa · reserva · partes · calendario · barra · credito · pares · perguntas · lista · fecho.
 * Ícones: chale, mala, chave, moedas, cadeado, cadeado_aberto, check, x, alerta, calendario, cartao, recibo, comanda,
 * pix, etiqueta, taca, curtir, comentar, enviar, salvar, carteira, seta, relogio.
 *
 * Regras de quadro: nada importante fora de y 265–1456; nada (nem o trilho) em x ≥ 950 entre y 1060 e 1560;
 * a marca (logo oficial + @fazlohospeda) fica fixa no topo de todos os quadros; o quadro 0 é a capa.
 */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', 'Noto Color Emoji', sans-serif";
  const MONO = "'FL Mono', monospace";
  const C = {
    bg: '#0A0B0A', card: '#131513', card2: '#191C19', line: '#2C302B', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2',
    grayD: '#6B6F68', red: '#FF5C5C', amber: '#FFB23F', ink: '#0A0A0A', gold: '#F2C14E', heart: '#FF4D6D',
  };
  const TONS = { limao: '#AFFA27', ambar: '#FFA62B', petroleo: '#13A6AE', roxo: '#8D6BFF' };
  // o quadro de um capítulo (coordenadas locais)
  const L = { x0: 110, x1: 940, cx: 525, nodeX: 64, nodeY: 446, rotY: 457, tituloTopo: 488, diaTop: 800, diaBot: 1430 };
  const BTN = { x: 950, y0: 1060, y1: 1560 };          // a coluna de botões do Reels
  const RAIL_X2 = 918;                                  // o lado direito do trilho (sempre < 950)

  // ---------------------------------------------------------------- utilitários
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x, s = 1.70158) => (x <= 0 ? 0 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const css = (h, a = 1) => { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const mixHex = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
  const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function setFont(ctx, fam, size, weight, ls = 0) { ctx.font = `${weight} ${size}px ${fam}`; ctx.letterSpacing = `${ls}px`; }
  let M = null;                                         // contexto só para medir
  function tw(s, fam, size, weight, ls = 0) { setFont(M, fam, size, weight, ls); return M.measureText(s).width - (s.length ? ls : 0); }
  function txt(ctx, s, x, y, o = {}) {
    const fam = o.fam || DISPLAY, size = o.size || 40, weight = o.weight || 700, ls = o.ls || 0;
    const w = tw(s, fam, size, weight, ls);
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    if ((o.alpha ?? 1) > 0.002) {
      ctx.save(); setFont(ctx, fam, size, weight, ls); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha *= o.alpha ?? 1; ctx.fillStyle = o.color || C.white;
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 22; }
      ctx.fillText(s, x0, y); ctx.restore();
    }
    if (o.box) BOX(o.box, x0, y - size * 0.76, x0 + w, y + size * 0.22);
    return w;
  }
  function fitSize(lines, fam, weight, maxW, maxS, lsK = 0) {
    let s = maxS;
    while (s > 20 && lines.some((l) => tw(l, fam, s, weight, lsK * s) > maxW)) s -= 1;
    return s;
  }
  // texto com marcação: *limão* e ~vermelho~
  function runs(line, base) {
    const out = []; let cur = '', mode = null;
    for (const ch of line) {
      if (ch === '*' || ch === '~') { if (cur) out.push({ s: cur, c: mode ? (mode === '*' ? C.lime : C.red) : base }); cur = ''; mode = mode === ch ? null : ch; continue; }
      cur += ch;
    }
    if (cur) out.push({ s: cur, c: mode ? (mode === '*' ? C.lime : C.red) : base });
    return out;
  }
  const plain = (s) => (s || '').replace(/[*~]/g, '');
  function wrapRich(line, base, fam, size, weight, maxW) {
    const words = [];
    runs(line, base).forEach((r) => r.s.split(/(\s+)/).forEach((w) => { if (w.trim()) words.push({ s: w, c: r.c }); }));
    const sp = tw(' ', fam, size, weight);
    const rows = [[]]; let x = 0;
    words.forEach((w) => {
      const ww = tw(w.s, fam, size, weight);
      if (rows[rows.length - 1].length && x + sp + ww > maxW) { rows.push([]); x = 0; }
      const row = rows[rows.length - 1];
      x += (row.length ? sp : 0) + ww; row.push({ ...w, w: ww });
    });
    // duas linhas equilibradas, sem palavra sozinha
    if (rows.length === 2 && rows[1].length === 1 && rows[0].length > 2) { rows[1].unshift(rows[0].pop()); }
    return rows.map((r) => ({ words: r, w: r.reduce((a, b) => a + b.w, 0) + sp * (r.length - 1), sp }));
  }

  // ---------------------------------------------------------------- ícones (traço em grade de 24, como os ícones de interface)
  const ICON = {
    chale: 'M3 11.5 12 3.5l9 8 M5.5 9.5V21h13V9.5 M10 21v-5.5h4V21 M8 12.5h2 M14 12.5h2',
    mala: 'M4.5 8h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-9A1.5 1.5 0 0 1 4.5 8z M9 8V5.2h6V8 M8 8v12 M16 8v12',
    chave: 'M7.5 15.8a3.8 3.8 0 1 1 0-7.6 3.8 3.8 0 0 1 0 7.6z M11.3 12H21 M18 12v3 M21 12v2.2',
    moedas: 'M12 4c3.9 0 7 1.1 7 2.5S15.9 9 12 9 5 7.9 5 6.5 8.1 4 12 4z M5 6.5v4C5 11.9 8.1 13 12 13s7-1.1 7-2.5v-4 M5 10.5v4C5 15.9 8.1 17 12 17s7-1.1 7-2.5v-4 M5 14.5v3C5 18.9 8.1 20 12 20s7-1.1 7-2.5v-3',
    cadeado: 'M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-7A1.5 1.5 0 0 1 6.5 11z M8 11V7.5a4 4 0 0 1 8 0V11 M12 15v2',
    cadeado_aberto: 'M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-7A1.5 1.5 0 0 1 6.5 11z M8 11V7a4 4 0 0 1 7.7-1.6 M12 15v2',
    check: 'M5 12.5l4.5 4.5L19 7',
    x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
    alerta: 'M12 3.5 2.8 19.5h18.4L12 3.5z M12 9.5v4.8 M12 17v.3',
    calendario: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M3 10h18 M8 3v4 M16 3v4',
    cartao: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M2 10h20 M6 15h4',
    recibo: 'M6 2.5h12v19l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z M9 7.5h6 M9 11.5h6 M9 15.5h4',
    comanda: 'M8.5 3.5h7v3h-7z M7 5H5.5A1.5 1.5 0 0 0 4 6.5v13A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 5H17 M8 11.5h8 M8 15.5h5',
    pix: 'M12 3l9 9-9 9-9-9z M12 8.2l3.8 3.8-3.8 3.8L8.2 12z',
    etiqueta: 'M3.5 12.5v-8a1 1 0 0 1 1-1h8l8.5 8.5-9 9z M8.3 8.3h.01',
    taca: 'M7.5 3h9c0 5.3-2 8.3-4.5 8.3S7.5 8.3 7.5 3z M12 11.3V19 M8.5 20.5h7',
    curtir: 'M12 20.3s-7.8-4.7-7.8-10.4A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.5c0 5.7-7.8 10.4-7.8 10.4z',
    comentar: 'M4.5 4.5h15A1.5 1.5 0 0 1 21 6v9.5a1.5 1.5 0 0 1-1.5 1.5H11l-4.8 3.8V17H4.5A1.5 1.5 0 0 1 3 15.5V6a1.5 1.5 0 0 1 1.5-1.5z',
    enviar: 'M21 3 10.6 13.4 M21 3l-6.6 18-3.8-7.6L3 9.6z',
    salvar: 'M6.5 3h11v18L12 16.6 6.5 21z',
    carteira: 'M4.5 6.5h14A1.5 1.5 0 0 1 20 8v11a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 19V8a1.5 1.5 0 0 1 1.5-1.5z M15.5 11.5H21v4h-5.5a2 2 0 0 1 0-4z M5 6.5l9.5-3v3',
    seta: 'M4 12h16 M14 6l6 6-6 6',
    relogio: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 7v5l3.2 2',
  };
  const ICON2D = {};
  function icon(ctx, name, x, y, s, col, o = {}) {
    if (!ICON2D[name]) ICON2D[name] = new Path2D(ICON[name] || ICON.x);
    ctx.save(); ctx.translate(x, y); const k = s / 24; ctx.scale(k, k); ctx.translate(-12, -12);
    ctx.lineWidth = o.lw || 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col;
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = (o.glowB || 18) / k; }
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(ICON2D[name]); }
    ctx.stroke(ICON2D[name]); ctx.restore();
  }
  let LOGO = null;
  function logo(ctx, x, y, d) { if (LOGO) ctx.drawImage(LOGO, x - d / 2, y - d / 2, d, d); }

  // ---------------------------------------------------------------- peças de interface
  function panel(ctx, x, y, w, h, o = {}) {
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    rr(ctx, x, y, w, h, o.r ?? 24);
    if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, o.fill2 || C.card2); g.addColorStop(1, o.fill || C.card);
    ctx.fillStyle = o.flat || g; ctx.fill();
    ctx.shadowColor = 'transparent';
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowB || 26; }
    ctx.setLineDash(o.dash || []); ctx.lineDashOffset = o.dashOff || 0;
    ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke || C.line; ctx.stroke();
    ctx.restore();
    if (o.box) BOX(o.box, x, y, x + w, y + h);
  }
  // pílula com texto (e ícone opcional); devolve a largura
  function chip(ctx, s, x, y, o = {}) {
    const size = o.size || 24, fam = o.fam || MONO, weight = o.weight || 800, ls = o.ls ?? 2, h = o.h || Math.round(size * 2.1);
    const iw = o.icon ? size * 1.25 + 10 : 0, pad = o.pad ?? 22;
    const w = o.w || pad * 2 + iw + tw(s, fam, size, weight, ls);
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    rr(ctx, x0, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || css(C.lime, 0.1); ctx.fill();
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 20; }
    ctx.setLineDash(o.dash || []); ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.border || css(C.lime, 0.55); if (o.border !== 'none') ctx.stroke();
    ctx.shadowColor = 'transparent';
    if (o.icon) icon(ctx, o.icon, x0 + pad + size * 0.62, y, size * 1.25, o.color || C.lime, { lw: 2.2 });
    txt(ctx, s, x0 + pad + iw, y + size * 0.36, { fam, size, weight, ls, color: o.color || C.lime });
    ctx.restore();
    if (o.box) BOX(o.box, x0, y - h / 2, x0 + w, y + h / 2);
    return w;
  }
  // círculo com ícone (check, alerta…) que estoura
  function badge(ctx, x, y, r, name, col, e, o = {}) {
    if (e <= 0.001) return;
    const k = E.outBack(clamp(e), 2.2);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = o.bg || col; ctx.shadowColor = css(col, 0.6); ctx.shadowBlur = 18; ctx.fill();
    ctx.shadowColor = 'transparent';
    icon(ctx, name, 0, 0, r * 1.25, o.ink || C.ink, { lw: 3 });
    ctx.restore();
    if (o.box) BOX(o.box, x - r, y - r, x + r, y + r);
  }
  // entrada padrão de uma peça: sobe 28 px e aparece (0..1)
  const ent = (t, t0, d = 0.45) => (t0 === null || t0 === undefined ? 0 : E.outCubic(p(t, t0, t0 + d)));
  function enter(ctx, e, x, y, fn, o = {}) {
    if (e <= 0.002) return;
    ctx.save(); ctx.globalAlpha *= clamp(e * 1.4);
    const dy = (o.dy ?? 28) * (1 - e), k = lerp(o.k0 ?? 0.94, 1, e);
    ctx.translate(x, y + dy); ctx.scale(k, k); ctx.translate(-x, -y);
    fn(); ctx.restore();
  }

  // ---------------------------------------------------------------- estado
  let LN = null, DUR = 0, TR = 0.9, CAPS = [], CUES = [], RAIL = null, NC = 0;
  let BOXES = null, OFF = { dx: 0, dy: 0, n: 0 };
  function BOX(name, x0, y0, x1, y1) { if (BOXES) BOXES.push({ cap: OFF.n, nome: name, x0: x0 + OFF.dx, y0: y0 + OFF.dy, x1: x1 + OFF.dx, y1: y1 + OFF.dy }); }
  const FECHO = { ultima: 0 };                          // a última mudança de texto do fecho (para a regra dos 3 s)

  // a palavra que dispara uma peça: "palavra", "palavra#2" (2ª vez), "+1.2" (s depois do começo do capítulo) ou "fim"
  function at(cap, spec, fb) {
    if (spec === undefined || spec === null) return fb;
    if (typeof spec === 'number') return cap.t0 + spec;
    if (spec[0] === '+') return cap.t0 + parseFloat(spec.slice(1));
    if (spec === 'fim') return cap.t1 - 0.9;
    const [w, k] = spec.split('#'), n = norm(w), occ = k ? parseInt(k, 10) : 1;
    let c = 0;
    for (const x of cap.palavras) if (x.n === n && ++c === occ) return x.t0;
    c = 0;
    for (const x of cap.palavras) if (x.n.startsWith(n) && ++c === occ) return x.t0;
    console.error(`capítulo ${cap.n}: a palavra "${spec}" não está na fala`);
    return fb;
  }
  const cue = (t, type, extra = {}) => CUES.push({ t, type, ...extra });

  // =====================================================================
  // O TRILHO
  // =====================================================================
  function buildRail() {
    const xs = [], ys = [];
    const push = (x, y) => { xs.push(x); ys.push(y); };
    const line = (x0, y0, x1, y1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4)); for (let i = 1; i <= n; i++) push(lerp(x0, x1, i / n), lerp(y0, y1, i / n)); };
    const quad = (x0, y0, x1, y1, x2, y2) => { for (let i = 1; i <= 24; i++) { const u = i / 24, v = 1 - u; push(v * v * x0 + 2 * v * u * x1 + u * u * x2, v * v * y0 + 2 * v * u * y1 + u * u * y2); } };
    const cubic = (x0, y0, x1, y1, x2, y2, x3, y3) => { for (let i = 1; i <= 140; i++) { const u = i / 140, v = 1 - u; push(v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3); } };
    const idx = { node: [], bottom: [] };
    const st = CAPS[0].railStart;                       // o começo, embaixo do gancho da capa
    push(st.x, st.y); idx.bottom[0] = 0; idx.start = 0;
    let cx = st.x, cy = st.y;
    for (let k = 1; k < NC; k++) {
      const top = k * H;
      line(cx, cy, cx, top + 90);
      quad(cx, top + 90, cx, top + 150, cx - 60, top + 150);
      line(cx - 60, top + 150, L.nodeX + 60, top + 150);
      quad(L.nodeX + 60, top + 150, L.nodeX, top + 150, L.nodeX, top + 210);
      line(L.nodeX, top + 210, L.nodeX, top + L.nodeY); idx.node[k] = xs.length - 1;
      line(L.nodeX, top + L.nodeY, L.nodeX, top + 1440); idx.bottom[k] = xs.length - 1;
      if (k < NC - 1) { cubic(L.nodeX, top + 1440, L.nodeX, top + 1640, RAIL_X2, top + 1530, RAIL_X2, top + 1740); cx = RAIL_X2; cy = top + 1740; }
    }
    const cum = new Float64Array(xs.length);
    for (let i = 1; i < xs.length; i++) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    const s = (i) => cum[i];
    return { xs, ys, cum, sNode: idx.node.map((i) => (i === undefined ? 0 : s(i))), sBottom: idx.bottom.map((i) => s(i)), sEnd: cum[xs.length - 1] };
  }
  function railAt(s) {
    const { cum, xs, ys } = RAIL;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m; else hi = m; }
    const u = clamp((s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]));
    return { i: lo, x: lerp(xs[lo], xs[hi], u), y: lerp(ys[lo], ys[hi], u) };
  }
  // em que capítulo / troca estamos
  function where(t) {
    for (let k = 0; k < NC; k++) {
      const c = CAPS[k];
      if (t < c.t1 || k === NC - 1) return { k, trans: false, u: 0 };
      const nx = CAPS[k + 1];
      if (t < nx.t0) return { k, trans: true, u: p(t, c.t1, nx.t0) };
    }
    return { k: NC - 1, trans: false, u: 0 };
  }
  function litS(t) {
    const w = where(t), c = CAPS[w.k];
    if (w.trans) return lerp(RAIL.sBottom[w.k], RAIL.sNode[w.k + 1], E.inOutCubic(w.u));
    if (w.k === 0) return 0;
    return lerp(RAIL.sNode[w.k], RAIL.sBottom[w.k], p(t, c.t0, c.t1));
  }
  function camera(t) {
    const w = where(t);
    if (!w.trans) return { x: 0, y: w.k * H, w };
    const e = E.inOutCubic(w.u);
    return { x: -26 * Math.sin(Math.PI * w.u), y: lerp(w.k * H, (w.k + 1) * H, e), w };
  }
  function drawRail(ctx, t, cam) {
    const { xs, ys } = RAIL, y0 = cam.y - 80, y1 = cam.y + H + 80;
    const sl = litS(t), head = railAt(sl);
    const visible = (i) => ys[i] >= y0 && ys[i] <= y1;
    const startVis = t >= CAPS[0].t1 - 1.0;
    // o trilho inteiro, apagado
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = (i0, i1) => { ctx.beginPath(); let on = false; for (let i = i0; i <= i1; i++) { if (!visible(i) || (!startVis && ys[i] < H)) { on = false; continue; } if (!on) { ctx.moveTo(xs[i], ys[i]); on = true; } else ctx.lineTo(xs[i], ys[i]); } };
    path(0, xs.length - 1); ctx.strokeStyle = 'rgba(255,255,255,0.075)'; ctx.lineWidth = 3; ctx.stroke();
    // a parte acesa, com brilho
    if (sl > 0.5) {
      path(0, head.i); ctx.lineTo(head.x, head.y);
      ctx.strokeStyle = css(C.lime, 0.12); ctx.lineWidth = 16; ctx.stroke();
      ctx.shadowColor = css(C.lime, 0.9); ctx.shadowBlur = 18; ctx.strokeStyle = C.lime; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.shadowColor = 'transparent';
    }
    // a ponta (a luz que corre no trilho)
    if (startVis || sl > 0.5) {
      const a = sl > 0.5 ? 1 : clamp((t - (CAPS[0].t1 - 1.0)) / 0.4);
      const pul = 0.85 + 0.15 * Math.sin(t * 6);
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 34);
      g.addColorStop(0, css(C.lime, 0.75 * a * pul)); g.addColorStop(1, css(C.lime, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(head.x, head.y, 34, 0, TAU); ctx.fill();
      ctx.fillStyle = css('#F4FFE0', a); ctx.beginPath(); ctx.arc(head.x, head.y, 7, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // os nós numerados
    for (let k = 1; k < NC; k++) {
      const nx = L.nodeX, ny = k * H + L.nodeY;
      if (ny < y0 - 60 || ny > y1 + 60) continue;
      const lit = clamp((t - (CAPS[k].t0 - 0.12)) / 0.25);
      ctx.save();
      if (lit > 0) {
        const fl = p(t, CAPS[k].t0 - 0.12, CAPS[k].t0 + 0.6);
        if (fl < 1) { ctx.beginPath(); ctx.arc(nx, ny, 28 + 60 * E.outCubic(fl), 0, TAU); ctx.strokeStyle = css(C.lime, 0.6 * (1 - fl)); ctx.lineWidth = 3; ctx.stroke(); }
      }
      ctx.beginPath(); ctx.arc(nx, ny, 27, 0, TAU);
      ctx.fillStyle = mixHex('#101210', '#152008', lit); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = lit > 0 ? css(C.lime, 0.25 + 0.75 * lit) : 'rgba(255,255,255,0.18)';
      if (lit > 0) { ctx.shadowColor = css(C.lime, 0.8 * lit); ctx.shadowBlur = 20; }
      ctx.stroke(); ctx.shadowColor = 'transparent';
      txt(ctx, String(k).padStart(2, '0'), nx, ny + 8, { fam: MONO, size: 22, weight: 800, align: 'center', color: lit > 0 ? mixHex('#6B6F68', C.lime, lit) : '#6B6F68' });
      ctx.restore();
    }
    // o fim do trilho
    const last = NC - 1, ex = L.nodeX, ey = last * H + 1440;
    if (sl >= RAIL.sBottom[last] - 2 && ey > y0 && ey < y1) {
      ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, 11, 0, TAU); ctx.fillStyle = C.lime; ctx.shadowColor = C.lime; ctx.shadowBlur = 24; ctx.fill(); ctx.restore();
    }
  }

  // =====================================================================
  // FUNDO, MARCA
  // =====================================================================
  function tint(camY) {
    const f = clamp(camY / H, 0, NC - 1), k = Math.floor(f), u = E.inOutSine(f - k);
    const a = TONS[CAPS[k].tom] || C.lime, b = TONS[(CAPS[k + 1] || CAPS[k]).tom] || a;
    return mixHex(a, b, u);
  }
  function background(ctx, t, cam) {
    const tn = tint(cam.y);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g1x = 820 + 70 * Math.sin(t * 0.21), g1y = 620 + 60 * Math.cos(t * 0.17);
    let g = ctx.createRadialGradient(g1x, g1y, 0, g1x, g1y, 980);
    g.addColorStop(0, css(tn, 0.17)); g.addColorStop(0.45, css(tn, 0.06)); g.addColorStop(1, css(tn, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2x = 160 + 50 * Math.cos(t * 0.13), g2y = 1520 + 60 * Math.sin(t * 0.15);
    g = ctx.createRadialGradient(g2x, g2y, 0, g2x, g2y, 860);
    g.addColorStop(0, css(tn, 0.1)); g.addColorStop(1, css(tn, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // pontos de grade (paralaxe 0,6): dão profundidade quando a câmera anda
    const oy = -((cam.y * 0.6) % 48), ox = -((cam.x * 0.6) % 48);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    for (let y = oy; y < H; y += 48) for (let x = ox + 12; x < W; x += 48) ctx.fillRect(x, y, 2, 2);
    // bokeh e poeira (paralaxe 0,35 e 0,8)
    for (let i = 0; i < 12; i++) {
      const r = 30 + 60 * hash(i, 2), x = 40 + hash(i, 3) * 1000 + 20 * Math.sin(t * 0.3 + i);
      const y = ((hash(i, 4) * (H + 300) - cam.y * 0.35 - t * 6) % (H + 300) + H + 300) % (H + 300) - 150;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, css(i % 3 ? tn : '#FFFFFF', 0.06)); gg.addColorStop(1, css(tn, 0));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = 20 + hash(i, 5) * 1040 + 8 * Math.sin(t * 0.7 + i);
      const y = ((hash(i, 6) * (H + 100) - cam.y * 0.8 - t * (10 + 20 * hash(i, 7))) % (H + 100) + H + 100) % (H + 100) - 50;
      ctx.fillStyle = css(i % 4 ? '#FFFFFF' : tn, 0.05 + 0.12 * hash(i, 8));
      ctx.beginPath(); ctx.arc(x, y, 1.2 + 2 * hash(i, 9), 0, TAU); ctx.fill();
    }
    // vinheta
    g = ctx.createRadialGradient(540, 900, 500, 540, 900, 1250);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function brand(ctx) {
    // véu escuro no topo (só aparece de verdade quando o conteúdo passa por baixo na troca de capítulo)
    const g = ctx.createLinearGradient(0, 230, 0, 410);
    g.addColorStop(0, css(C.bg, 0.92)); g.addColorStop(1, css(C.bg, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 410); ctx.fillStyle = css(C.bg, 0.92); ctx.fillRect(0, 0, W, 230);
    const d = 50, nameW = tw('FAZLO Hospeda', DISPLAY, 27, 800), handleW = tw(LN.marca, MONO, 19, 700, 0.5);
    const gw = d + 14 + Math.max(nameW, handleW), x0 = 540 - gw / 2, cy = 334;
    logo(ctx, x0 + d / 2, cy, d);
    const tx = x0 + d + 14;
    const w1 = txt(ctx, 'FAZLO', tx, cy - 3, { size: 27, weight: 800, color: C.white });
    txt(ctx, 'Hospeda', tx + w1 + 6, cy - 3, { size: 27, weight: 800, color: C.lime });
    txt(ctx, LN.marca, tx, cy + 22, { fam: MONO, size: 19, weight: 700, color: C.gray, ls: 0.5 });
    BOX('marca', x0, cy - d / 2, x0 + gw, cy + d / 2);
  }

  // =====================================================================
  // CABEÇALHO DO CAPÍTULO (rótulo + título fixo) e LINHA DE APOIO
  // =====================================================================
  function layoutTitulo(cap) {
    const s = fitSize(cap.titulo, DISPLAY, 900, L.x1 - L.x0, 94, -0.025);
    cap.ts = s;
    cap.tb = [L.tituloTopo + 0.73 * s, L.tituloTopo + 0.73 * s + 1.0 * s];
    cap.apY = cap.tb[1] + 0.25 * s + 58;
    cap.apX = L.x0; cap.apAlign = 'left';
  }
  function header(ctx, cap, t) {
    const t0 = cap.t0;
    // rótulo: máquina de escrever mono limão
    const n = cap.rotulo.length, k = Math.round(n * p(t, t0 - 0.1, t0 + 0.32));
    if (k > 0) {
      const s = cap.rotulo.slice(0, k);
      const w = txt(ctx, s, L.x0, L.rotY, { fam: MONO, size: 26, weight: 800, color: C.lime, ls: 5, box: k === n ? 'rótulo' : null });
      if (k < n || (t - t0) < 0.7) { const blink = k < n || Math.floor((t - t0) * 4) % 2 === 0; if (blink) { ctx.fillStyle = C.lime; ctx.fillRect(L.x0 + w + 8, L.rotY - 21, 13, 24); } }
    }
    // título: duas linhas (branca + limão), sobem e ficam
    const s = cap.ts;
    cap.titulo.forEach((ln, i) => {
      const e = ent(t, t0 + 0.02 + 0.11 * i, 0.5);
      if (e <= 0) return;
      let col = i === 1 ? C.lime : C.white;
      const rk = cap.riscaT !== undefined && cap.risca_titulo.linha === i + 1 ? p(t, cap.riscaT, cap.riscaT + 0.35) : 0;
      if (rk > 0) col = mixHex(col, '#8C9087', E.outCubic(rk));
      ctx.save(); ctx.globalAlpha = clamp(e * 1.3); ctx.translate(0, 34 * (1 - e));
      const w = txt(ctx, ln, L.x0, cap.tb[i], { size: s, weight: 900, color: col, ls: -0.025 * s, box: e > 0.99 ? `título, linha ${i + 1}` : null });
      if (rk > 0) {
        const y = cap.tb[i] - 0.3 * s;
        ctx.strokeStyle = C.lime; ctx.lineWidth = Math.max(7, s * 0.085); ctx.lineCap = 'round';
        ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(L.x0 - 6, y + 3); ctx.lineTo(L.x0 - 6 + (w + 12) * E.inOutCubic(rk), y - 3); ctx.stroke();
      }
      ctx.restore();
    });
  }
  function apoioRows(cap, a) {
    if (!a._rows) a._rows = wrapRich(a.texto, C.gray, DISPLAY, 38, 600, cap.apAlign === 'center' ? 860 : L.x1 - L.x0);
    return a._rows;
  }
  function drawApoio(ctx, cap, t) {
    cap.apoios.forEach((a, i) => {
      const nx = cap.apoios[i + 1];
      const ein = E.outCubic(p(t, a.t + 0.12, a.t + 0.34)), eout = nx ? p(t, nx.t, nx.t + 0.13) : 0;
      const al = ein * (1 - eout);
      if (al <= 0.002) return;
      const rows = apoioRows(cap, a);
      rows.forEach((r, j) => {
        const y = cap.apY + j * 48 + 12 * (1 - ein) - 8 * eout;
        let x = cap.apAlign === 'center' ? cap.apX - r.w / 2 : cap.apX;
        const x0 = x;
        r.words.forEach((wd) => { txt(ctx, wd.s, x, y, { size: 38, weight: 600, color: wd.c, alpha: al }); x += wd.w + r.sp; });
        if (al > 0.99) BOX(`apoio ${i + 1}, linha ${j + 1}`, x0, y - 30, x0 + r.w, y + 10);
      });
    });
  }

  // =====================================================================
  // DIAGRAMAS
  // =====================================================================
  const CENAS = {};

  // ---- a capa (capítulo 00): chip, título grande, faixa limão "em 3 palavras." e três cadeados "? ? ?"
  CENAS.capa = {
    setup(cap) {
      const d = cap.diagrama;
      const S = fitSize(cap.titulo, DISPLAY, 900, 880, 158, -0.03);
      const F = Math.round(S * 0.5);
      const bandW = tw(d.faixa, DISPLAY, F, 900, -0.02 * F) + 64, bandH = Math.round(F * 1.34);
      const chipH = 58, lockH = 96;
      const titleH = 0.76 * S + 0.98 * S + 0.16 * S;
      const bandExt = bandH + bandW * Math.sin(3 * DEG);
      const total = chipH + 46 + titleH + 26 + bandExt + 52 + lockH;
      const top = 960 - total / 2;
      const Ly = {};
      Ly.chipY = top + chipH / 2;
      Ly.b1 = top + chipH + 46 + 0.76 * S; Ly.b2 = Ly.b1 + 0.98 * S;
      Ly.bandCy = Ly.b2 + 0.16 * S + 26 + bandExt / 2;
      Ly.lockY = Ly.bandCy + bandExt / 2 + 52 + lockH / 2;
      Ly.top = top; Ly.bottom = top + total;
      Object.assign(cap, { capaS: S, capaF: F, bandW, bandH, Ly });
      cap.apY = Ly.lockY + lockH / 2 + 84; cap.apX = 540; cap.apAlign = 'center';
      cap.railStart = { x: 540, y: Math.max(1490, cap.apY + 90) };
      cap.ev.locks = d.cadeados.map((c, i) => at(cap, c.em, cap.t0 + 0.4 + 0.5 * i));
      cap.ev.locks.forEach((t) => cue(t, 'lockon'));
      cue(cap.t1 - 1.0, 'railstart');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, Ly = cap.Ly, S = cap.capaS;
      chip(ctx, cap.rotulo, 540, Ly.chipY, { size: 24, icon: 'chale', align: 'center', ls: 4, h: 58, box: 'chip' });
      cap.titulo.forEach((ln, i) => txt(ctx, ln, 540, i ? Ly.b2 : Ly.b1, { size: S, weight: 900, align: 'center', ls: -0.03 * S, color: C.white, box: `título, linha ${i + 1}` }));
      // a faixa limão, levemente inclinada
      ctx.save(); ctx.translate(540, Ly.bandCy); ctx.rotate((-3 + 0.35 * Math.sin(t * 1.3)) * DEG);
      rr(ctx, -cap.bandW / 2, -cap.bandH / 2, cap.bandW, cap.bandH, 14);
      ctx.shadowColor = css(C.lime, 0.45); ctx.shadowBlur = 34; ctx.fillStyle = C.lime; ctx.fill(); ctx.shadowColor = 'transparent';
      txt(ctx, d.faixa, 0, cap.capaF * 0.36, { size: cap.capaF, weight: 900, align: 'center', color: C.ink, ls: -0.02 * cap.capaF });
      ctx.restore();
      const ext = cap.bandH + cap.bandW * Math.sin(3 * DEG);
      BOX('faixa', 540 - cap.bandW / 2, Ly.bandCy - ext / 2, 540 + cap.bandW / 2, Ly.bandCy + ext / 2);
      // os três cadeados "? ? ?": cada um acende na sua palavra e mostra a palavra
      const n = d.cadeados.length, bw = 198, gap = 22, x0 = 540 - (n * bw + (n - 1) * gap) / 2, bh = 96;
      d.cadeados.forEach((c, i) => {
        const x = x0 + i * (bw + gap), y = Ly.lockY - bh / 2, on = p(t, cap.ev.locks[i], cap.ev.locks[i] + 0.3);
        ctx.save();
        rr(ctx, x, y, bw, bh, 20);
        ctx.fillStyle = css(C.lime, 0.04 + 0.08 * on); ctx.fill();
        ctx.setLineDash(on > 0.5 ? [] : [8, 7]); ctx.lineDashOffset = -t * 18;
        ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.lime, 0.42 + 0.58 * on);
        if (on > 0) { ctx.shadowColor = css(C.lime, 0.7 * on); ctx.shadowBlur = 22; }
        ctx.stroke(); ctx.restore();
        icon(ctx, on > 0.5 ? 'cadeado' : 'cadeado_aberto', x + 40, Ly.lockY, 34, on > 0 ? C.lime : C.gray, { lw: 2.2, fill: on > 0.5 ? css(C.lime, 0.2) : null });
        const flip = Math.abs(Math.cos(Math.PI * on));
        ctx.save(); ctx.translate(x + 40 + (bw - 40) / 2 + 2, Ly.lockY); ctx.scale(1, Math.max(0.05, flip)); ctx.translate(-(x + 40 + (bw - 40) / 2 + 2), -Ly.lockY);
        txt(ctx, on < 0.5 ? '? ? ?' : c.t, x + 40 + (bw - 40) / 2 + 2, Ly.lockY + 9, { fam: MONO, size: 25, weight: 800, align: 'center', color: on < 0.5 ? C.gray : C.lime, ls: on < 0.5 ? 2 : 1 });
        ctx.restore();
        BOX(`cadeado ${i + 1}`, x, y, x + bw, y + bh);
      });
    },
  };

  // ---- cartão de reserva estilizado
  function reservaCard(ctx, x, y, w, h, r, o = {}) {
    panel(ctx, x, y, w, h, { r: 26, stroke: o.stroke || css(C.white, 0.14), glow: o.glow, box: o.box });
    const tile = h - 52;
    rr(ctx, x + 26, y + 26, tile, tile, 20); ctx.fillStyle = css(C.lime, 0.1); ctx.fill(); ctx.strokeStyle = css(C.lime, 0.4); ctx.lineWidth = 2; ctx.stroke();
    icon(ctx, 'chale', x + 26 + tile / 2, y + 26 + tile / 2, tile * 0.55, C.lime, { lw: 1.8 });
    const tx = x + 26 + tile + 26;
    txt(ctx, r.titulo, tx, y + h * 0.45, { size: Math.round(h * 0.2), weight: 800, color: C.white });
    txt(ctx, (r.linhas || []).join(' · '), tx, y + h * 0.45 + h * 0.24, { fam: MONO, size: Math.round(h * 0.115), weight: 700, color: C.gray, ls: 2 });
    txt(ctx, r.valor, x + w - 30, y + h * 0.45 + h * 0.24, { fam: MONO, size: Math.round(h * 0.14), weight: 800, color: C.white, align: 'right' });
    if (o.status) chip(ctx, o.status.t, x + w - 30, y + h * 0.27, { size: Math.round(h * 0.075), align: 'right', color: o.status.c, bg: css(o.status.c, 0.12), border: css(o.status.c, 0.6), h: Math.round(h * 0.17), pad: 12, alpha: o.status.a });
  }
  function coin(ctx, x, y, rx, ry, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    const th = o.th ?? 12;
    ctx.fillStyle = '#B88A2A'; ctx.beginPath(); ctx.ellipse(0, th / 2, rx, ry, 0, 0, TAU); ctx.fill(); ctx.fillRect(-rx, 0, rx * 2, th / 2);
    const g = ctx.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, '#F7D774'); g.addColorStop(1, '#D9A53B');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -th / 2, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,10,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -th / 2, rx * 0.7, ry * 0.7, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // ---- reserva: o cartão da reserva, a pilha do caixa que tomba e o "?" pulsando
  CENAS.reserva = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.card = at(cap, d.reserva.em, cap.t0 + 0.6);
      ev.coins = at(cap, d.moedas && d.moedas.em, null);
      ev.topple = ev.coins !== null ? ev.coins + 0.55 : null;
      ev.duv = at(cap, d.duvida.em, cap.t1 - 2);
      ev.status = ev.duv + 0.35;
      cue(ev.card, 'pop', { f: 620 });
      if (ev.coins !== null) { cue(ev.coins, 'coin'); cue(ev.topple, 'coinsfall'); }
      cue(ev.duv, 'question'); cue(ev.status, 'chip');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      const cx0 = 150, cy0 = 880, cw = 610, ch = 220;
      // a pilha do caixa (entra na palavra e tomba)
      if (ev.coins !== null && t >= ev.coins) {
        const bx = 330, floor = 1352, e = E.outBack(p(t, ev.coins, ev.coins + 0.35), 1.6);
        for (let i = 0; i < 6; i++) {
          const y0 = floor - i * 15 - 10;
          const u = p(t, ev.topple + i * 0.045, ev.topple + 0.62 + i * 0.045);
          const dir = [-1, 1, -0.6, 1.3, -1.4, 0.8][i];
          const x = bx + dir * 150 * E.outCubic(u) * (0.5 + i * 0.12);
          const hop = Math.sin(Math.PI * u) * (40 + i * 18);
          const y = lerp(y0 - 60 * (1 - e), floor - 8 + (i % 2) * 6, E.outCubic(u)) - hop;
          const rot = dir * 0.5 * Math.sin(Math.PI * u) + dir * 0.06 * E.outCubic(u);
          ctx.save(); ctx.globalAlpha = clamp(e * 2);
          coin(ctx, x, y, 58, 17, { rot, th: 11 }); ctx.restore();
        }
        txt(ctx, 'CAIXA', bx, 1412, { fam: MONO, size: 24, weight: 800, align: 'center', color: C.gray, ls: 4, alpha: clamp(e), box: 'caixa' });
        const sh = p(t, ev.topple, ev.topple + 0.5);
        if (sh > 0) chip(ctx, '− R$', bx + 170, 1290, { size: 24, color: C.red, bg: css(C.red, 0.12), border: css(C.red, 0.6), alpha: E.outCubic(sh), box: 'perda' });
      }
      // o cartão da reserva
      enter(ctx, ent(t, ev.card, 0.5), cx0 + cw / 2, cy0 + ch / 2, () => {
        reservaCard(ctx, cx0, cy0, cw, ch, d.reserva, { box: 'cartão da reserva', status: t >= ev.status ? { t: 'SEM REGISTRO', c: C.amber, a: E.outCubic(p(t, ev.status, ev.status + 0.3)) } : null });
      });
      // o "?" pulsando, ligado ao cartão por um tracejado
      const e = p(t, ev.duv, ev.duv + 0.4);
      if (e > 0) {
        const qx = 866, qy = cy0 + ch / 2;
        ctx.save(); ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = css(C.amber, 0.6 * e); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx0 + cw + 4, qy); ctx.lineTo(cx0 + cw + 4 + (qx - 54 - cx0 - cw - 4) * E.outCubic(e), qy); ctx.stroke(); ctx.restore();
        const k = E.outBack(e, 2.4) * (1 + 0.06 * Math.sin((t - ev.duv) * 5));
        for (let r = 0; r < 2; r++) {
          const ph = ((t - ev.duv) / 1.3 + r * 0.5) % 1;
          ctx.beginPath(); ctx.arc(qx, qy, 52 + 46 * ph, 0, TAU); ctx.strokeStyle = css(C.amber, 0.35 * (1 - ph) * e); ctx.lineWidth = 3; ctx.stroke();
        }
        ctx.save(); ctx.translate(qx, qy); ctx.scale(k, k);
        ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.fillStyle = css(C.amber, 0.14); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = C.amber; ctx.shadowColor = css(C.amber, 0.7); ctx.shadowBlur = 22; ctx.stroke();
        ctx.shadowColor = 'transparent';
        txt(ctx, '?', 0, 23, { size: 66, weight: 900, align: 'center', color: C.amber });
        ctx.restore();
        BOX('dúvida', qx - 52, qy - 52, qx + 52, qy + 52);
      }
    },
  };

  // ---- partes: a reserva se abre em encaixes; um fica solto e vermelho
  CENAS.partes = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.card = at(cap, d.reserva.em, cap.t0 + 0.5);
      ev.abre = at(cap, d.abre, ev.card + 0.8);
      let prev = ev.abre - 0.22;
      ev.slots = d.partes.map((x) => (prev = Math.max(at(cap, x.em, ev.abre), prev + 0.22)));
      ev.solta = at(cap, d.solta.em, cap.t1 - 2);
      ev.prej = Math.max(at(cap, d.solta.em_t, ev.solta + 0.6), ev.solta + 0.35);
      cue(ev.card, 'pop', { f: 560 }); ev.slots.forEach((t, i) => cue(t, 'slot', { i }));
      cue(ev.solta, 'snap'); cue(ev.prej, 'alert');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      const cw = 620, ch = 168, cx0 = L.cx - cw / 2, cy0 = 826;
      enter(ctx, ent(t, ev.card, 0.5), L.cx, cy0 + ch / 2, () => reservaCard(ctx, cx0, cy0, cw, ch, d.reserva, { box: 'cartão da reserva' }));
      const n = d.partes.length, sw = 236, sh = 168, gap = (L.x1 - L.x0 - n * sw) / (n - 1), sy = 1112;
      d.partes.forEach((pt, i) => {
        const ts = ev.slots[i], e = ent(t, ts, 0.45);
        if (e <= 0) return;
        const sx = L.x0 + i * (sw + gap), scx = sx + sw / 2;
        const loose = d.solta.i === i ? E.outBack(p(t, ev.solta, ev.solta + 0.55), 1.4) : 0;
        // a ligação do cartão até o encaixe
        const lk = E.outCubic(p(t, ts - 0.1, ts + 0.3));
        ctx.save(); ctx.lineWidth = 3; ctx.lineCap = 'round';
        const ax = L.cx, ay = cy0 + ch, bx = scx, by = sy;
        const pt2 = (u) => { const v = 1 - u; return [v * v * v * ax + 3 * v * v * u * ax + 3 * v * u * u * bx + u * u * u * bx, v * v * v * ay + 3 * v * v * u * (ay + 70) + 3 * v * u * u * (by - 70) + u * u * u * by]; };
        const upto = loose > 0 ? lerp(lk, 0.45, clamp(loose)) : lk;
        ctx.strokeStyle = loose > 0.05 ? css(C.red, 0.85) : css(C.lime, 0.75);
        if (loose > 0.05) ctx.setLineDash([7, 7]);
        ctx.beginPath(); for (let u = 0; u <= upto + 1e-6; u += 0.02) { const [x, y] = pt2(Math.min(u, upto)); if (u === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
        ctx.restore();
        // o encaixe
        const red = loose > 0.05;
        const ox = 0, oy = 70 * clamp(loose), rot = 7 * DEG * clamp(loose);
        ctx.save(); ctx.globalAlpha *= clamp(e * 1.4);
        ctx.translate(scx + ox, sy + sh / 2 + oy + 26 * (1 - e)); ctx.rotate(rot); ctx.translate(-scx, -(sy + sh / 2));
        panel(ctx, sx, sy, sw, sh, { r: 22, dash: red ? [] : [9, 7], dashOff: -t * 16, stroke: red ? C.red : css(C.lime, 0.75), flat: red ? css(C.red, 0.1) : css(C.lime, 0.05), shadow: false, glow: red ? css(C.red, 0.5) : null });
        icon(ctx, red ? 'alerta' : pt.icone || 'cadeado', scx, sy + 62, 46, red ? C.red : C.lime, { lw: 2 });
        txt(ctx, pt.t, scx, sy + 132, { fam: MONO, size: 27, weight: 800, align: 'center', color: red ? C.red : C.white, ls: 3 });
        ctx.restore();
        BOX(`encaixe ${pt.t}`, sx, sy + oy, sx + sw, sy + sh + oy);
        if (red) {
          const ep = p(t, ev.prej, ev.prej + 0.35);
          if (ep > 0) {
            const sk = Math.sin((t - ev.prej) * 40) * 6 * (1 - p(t, ev.prej, ev.prej + 0.5));
            ctx.save(); ctx.translate(sk, 0);
            const k = E.outBack(ep, 2);
            ctx.translate(scx, 1398); ctx.scale(k, k); ctx.translate(-scx, -1398);
            chip(ctx, d.solta.t, scx, 1398, { size: 26, align: 'center', icon: 'alerta', color: C.ink, bg: C.red, border: 'none', glow: css(C.red, 0.6), h: 58, box: 'prejuízo' });
            ctx.restore();
          }
        }
      });
    },
  };

  // ---- calendário: a data pontilhada (promessa) recebe o cadeado; o pagamento do sinal com check; o contraste "sem sinal"
  CENAS.calendario = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.cal = at(cap, d.em, cap.t0 + 0.5);
      ev.pag = at(cap, d.pagamento.em, ev.cal + 1);
      ev.check = ev.pag + 0.5;
      ev.lock = Math.max(at(cap, d.cadeado.em, ev.pag + 0.4), ev.pag + 0.3);
      ev.land = ev.lock + 0.38;
      ev.con = at(cap, d.contraste.em, cap.t1 - 2.5);
      ev.prom = at(cap, d.contraste.em_destaque, ev.con + 1);
      cue(ev.cal, 'pop', { f: 520 }); cue(ev.pag, 'chip'); cue(ev.check, 'check'); cue(ev.lock, 'drop'); cue(ev.land, 'lock');
      cue(ev.con, 'pop', { f: 440 }); cue(ev.prom, 'flicker');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      const X = L.x0, Y = 812, Wc = 486, Hc = 478;
      const eCal = ent(t, ev.cal, 0.5);
      const first = d.primeiro_dia_semana || 0, days = d.dias_no_mes || 30;
      const cw = 62, chh = 60, gx = X + (Wc - 7 * cw) / 2, gy = Y + 126;
      const di = d.dia - 1 + first, col = di % 7, row = Math.floor(di / 7);
      const dx = gx + col * cw, dy = gy + row * chh;
      const landed = t >= ev.land;
      enter(ctx, eCal, X + Wc / 2, Y + Hc / 2, () => {
        panel(ctx, X, Y, Wc, Hc, { r: 28, stroke: css(C.white, 0.14), box: 'calendário' });
        icon(ctx, 'calendario', X + 46, Y + 48, 32, C.lime, { lw: 2 });
        txt(ctx, d.mes, X + 76, Y + 58, { fam: MONO, size: 26, weight: 800, color: C.white, ls: 4 });
        txt(ctx, '‹  ›', X + Wc - 36, Y + 58, { fam: MONO, size: 26, weight: 700, color: C.grayD, align: 'right' });
        'DSTQQSS'.split('').forEach((w, i) => txt(ctx, w, gx + i * cw + cw / 2, Y + 106, { fam: MONO, size: 20, weight: 700, color: C.grayD, align: 'center' }));
        for (let i = 0; i < days; i++) {
          const k = i + first, cx = gx + (k % 7) * cw + cw / 2, cy = gy + Math.floor(k / 7) * chh + chh / 2;
          const a = clamp((t - ev.cal - 0.15 - k * 0.012) / 0.25);
          if (i === d.dia - 1) continue;
          txt(ctx, String(i + 1), cx, cy + 9, { fam: MONO, size: 23, weight: 700, color: '#C9CCC5', align: 'center', alpha: a });
        }
        // o dia: pontilhado (promessa) até o cadeado; depois, limão
        const fill = landed ? E.outCubic(p(t, ev.land, ev.land + 0.25)) : 0;
        rr(ctx, dx + 4, dy + 4, cw - 8, chh - 8, 14);
        if (fill > 0) { ctx.fillStyle = css(C.lime, fill); ctx.shadowColor = css(C.lime, 0.7 * fill); ctx.shadowBlur = 26; ctx.fill(); ctx.shadowColor = 'transparent'; }
        if (fill < 1) { ctx.save(); ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 20; ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.amber, 0.95 * (1 - fill)); ctx.stroke(); ctx.restore(); }
        txt(ctx, String(d.dia), dx + cw / 2, dy + chh / 2 + 9, { fam: MONO, size: 24, weight: 800, align: 'center', color: fill > 0.5 ? C.ink : C.amber });
        // o rodapé: "14/11 · PROMESSA" → "14/11 · DATA GARANTIDA"
        const fy = Y + Hc - 34;
        ctx.strokeStyle = css(C.white, 0.08); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 24, fy - 34); ctx.lineTo(X + Wc - 24, fy - 34); ctx.stroke();
        const lbl = landed ? d.garantida : d.promessa, lc = landed ? C.lime : C.amber;
        icon(ctx, landed ? 'check' : 'relogio', X + 44, fy - 8, 26, lc, { lw: 2.4 });
        txt(ctx, `${String(d.dia).padStart(2, '0')}/${String(11).padStart(2, '0')} · ${lbl}`, X + 70, fy, { fam: MONO, size: 22, weight: 800, color: lc, ls: 2 });
      });
      // o cadeado que cai na data
      if (t >= ev.lock) {
        const u = p(t, ev.lock, ev.land), tx = dx + cw - 10, ty = dy + 8;
        const y = lerp(ty - 260, ty, E.inCubic(u)), k = landed ? 1 + 0.18 * (1 - p(t, ev.land, ev.land + 0.3)) : 1.25;
        ctx.save(); ctx.translate(tx, y); ctx.scale(k, k);
        ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fillStyle = '#10140A'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C.lime; ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowColor = 'transparent';
        icon(ctx, t >= ev.land + 0.12 ? 'cadeado' : 'cadeado_aberto', 0, 0, 30, C.lime, { lw: 2.4, fill: t >= ev.land + 0.12 ? css(C.lime, 0.25) : null });
        ctx.restore();
        if (landed) { const r = p(t, ev.land, ev.land + 0.6); if (r < 1) { ctx.beginPath(); ctx.arc(dx + cw / 2, dy + chh / 2, 30 + 60 * r, 0, TAU); ctx.strokeStyle = css(C.lime, 0.6 * (1 - r)); ctx.lineWidth = 3; ctx.stroke(); } }
      }
      // o pagamento do sinal
      const eP = ent(t, ev.pag, 0.45), py = Y + Hc + 30, ph = 76;
      enter(ctx, eP, X + Wc / 2, py + ph / 2, () => {
        panel(ctx, X, py, Wc, ph, { r: 20, stroke: css(C.lime, 0.35), box: 'pagamento' });
        icon(ctx, 'pix', X + 42, py + ph / 2, 30, C.lime, { lw: 2 });
        txt(ctx, d.pagamento.t, X + 72, py + ph / 2 + 9, { fam: MONO, size: 24, weight: 800, color: C.white, ls: 1 });
        badge(ctx, X + Wc - 40, py + ph / 2, 21, 'check', C.lime, p(t, ev.check, ev.check + 0.3));
      });
      // o contraste: "sem sinal"
      const cX = X + Wc + 32, cW = L.x1 - cX, cY = Y, cH = 360;
      enter(ctx, ent(t, ev.con, 0.5), cX + cW / 2, cY + cH / 2, () => {
        panel(ctx, cX, cY, cW, cH, { r: 26, stroke: css(C.red, 0.45), box: 'sem sinal' });
        icon(ctx, 'x', cX + 40, cY + 46, 26, C.red, { lw: 3 });
        txt(ctx, d.contraste.t, cX + 62, cY + 55, { fam: MONO, size: 22, weight: 800, color: C.red, ls: 2 });
        const pr = t >= ev.prom ? p(t, ev.prom, ev.prom + 0.4) : 0;
        const fl = t >= ev.prom ? 0.45 + 0.55 * Math.abs(Math.cos((t - ev.prom) * 7)) : 1;
        const bx = cX + cW / 2 - 64, by = cY + 96, bs = 128;
        ctx.save(); ctx.globalAlpha *= fl; rr(ctx, bx, by, bs, bs - 10, 20); ctx.setLineDash([6, 7]); ctx.lineDashOffset = -t * 16; ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.gray, 0.7); ctx.stroke(); ctx.restore();
        txt(ctx, String(d.contraste.dia), bx + bs / 2, by + bs / 2 + 12, { size: 52, weight: 800, align: 'center', color: C.gray, alpha: fl });
        txt(ctx, d.contraste.sub, cX + cW / 2, cY + cH - 52, { size: 30, weight: 700, align: 'center', color: mixHex(C.gray, C.amber, pr) });
        if (pr > 0) chip(ctx, '?', bx + bs - 4, by + 6, { size: 22, align: 'center', color: C.amber, bg: css(C.amber, 0.15), border: css(C.amber, 0.7), h: 40, pad: 12, alpha: pr });
      });
    },
  };

  // ---- barra de pagamento: total, pago, consumo, desconto e o que falta
  CENAS.barra = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.total = at(cap, d.total.em, cap.t0 + 0.6);
      let prev = ev.total + 0.3;
      ev.steps = d.passos.map((s) => (prev = Math.max(at(cap, s.em, prev + 0.6), prev + 0.35)));
      ev.res = Math.max(at(cap, d.resultado.em, prev + 0.8), prev + 0.7);
      ev.alert = Math.max(at(cap, d.alerta.em, ev.res + 1), ev.res + 0.6);
      let tot = d.total.v, pago = 0;
      d.passos.forEach((s) => { if (s.tipo === 'pago') pago += s.v; if (s.tipo === 'soma') tot += s.v; if (s.tipo === 'tira') tot -= s.v; });
      cap.falta = tot - pago; cap.final = tot;
      cue(ev.total, 'grow', { d: 0.6 });
      d.passos.forEach((s, i) => cue(ev.steps[i], s.tipo === 'pago' ? 'fill' : s.tipo === 'soma' ? 'pop' : 'cut', { f: 700 }));
      d.passos.forEach((s, i) => { if (s.tipo === 'tira') cue(ev.steps[i] + 0.55, 'drop'); });
      cue(ev.res, 'count', { d: 0.6 }); cue(ev.res + 0.62, 'big'); cue(ev.alert, 'alert');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev, k = (L.x1 - L.x0) / d.escala, X = L.x0, BY = 936, BH = 82;
      const xv = (v) => X + v * k;
      const eT = p(t, ev.total, ev.total + 0.6);
      if (eT <= 0) return;
      // o rótulo do total
      txt(ctx, d.total.t, X, 896, { fam: MONO, size: 22, weight: 800, color: C.gray, ls: 3, alpha: clamp(eT * 2) });
      txt(ctx, brl(d.total.v), X + tw(d.total.t, MONO, 22, 800, 3) + 14, 896, { fam: MONO, size: 30, weight: 800, color: C.white, alpha: clamp(eT * 2), box: 'total' });
      // a barra: o total e o que muda
      let end = d.total.v, endAnim = d.total.v * E.outCubic(eT);
      d.passos.forEach((s, i) => { if (s.tipo === 'soma') { const e = E.outCubic(p(t, ev.steps[i], ev.steps[i] + 0.45)); endAnim += s.v * e; end += s.v; } });
      ctx.save(); rr(ctx, X, BY, Math.max(30, endAnim * k), BH, 18); ctx.fillStyle = C.card2; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.white, 0.35); ctx.stroke(); ctx.restore();
      BOX('barra', X, BY, X + d.total.v * k, BY + BH);
      ctx.save(); rr(ctx, X, BY, Math.max(30, endAnim * k), BH, 18); ctx.clip();
      let acc = 0;
      d.passos.forEach((s, i) => {
        const ts = ev.steps[i];
        if (t < ts) return;
        if (s.tipo === 'pago') {
          const e = E.outCubic(p(t, ts, ts + 0.5));
          ctx.fillStyle = C.lime; ctx.fillRect(X, BY, s.v * k * e, BH);
          txt(ctx, `${s.t} ${brl(s.v).replace(',00', '')}`, X + s.v * k / 2, BY + BH / 2 + 9, { fam: MONO, size: 24, weight: 800, align: 'center', color: C.ink, alpha: clamp((e - 0.6) * 3) });
          acc += s.v;
        } else if (s.tipo === 'soma') {
          const e = E.outCubic(p(t, ts, ts + 0.45));
          ctx.fillStyle = css(C.amber, 0.85); ctx.fillRect(xv(d.total.v), BY, s.v * k * e, BH);
        } else if (s.tipo === 'tira') {
          const drop = p(t, ts + 0.55, ts + 1.05);
          const x0 = xv(end - s.v);
          ctx.save(); ctx.translate(0, 140 * E.inCubic(drop)); ctx.globalAlpha = 1 - drop;
          ctx.fillStyle = css(C.red, 0.9); ctx.fillRect(x0, BY, s.v * k, BH);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 4; for (let h = -BH; h < s.v * k; h += 14) { ctx.beginPath(); ctx.moveTo(x0 + h, BY + BH); ctx.lineTo(x0 + h + BH, BY); ctx.stroke(); }
          ctx.restore();
        }
      });
      ctx.restore();
      // o pedaço do desconto caindo (fora do recorte da barra)
      d.passos.forEach((s, i) => {
        if (s.tipo !== 'tira' || t < ev.steps[i] + 0.55) return;
        const drop = p(t, ev.steps[i] + 0.55, ev.steps[i] + 1.05); if (drop >= 1) return;
        const x0 = xv(end - s.v);
        ctx.save(); ctx.globalAlpha = 1 - drop; ctx.translate(x0 + s.v * k / 2, BY + BH / 2 + 160 * E.inCubic(drop)); ctx.rotate(0.5 * drop);
        ctx.fillStyle = css(C.red, 0.9); ctx.fillRect(-s.v * k / 2, -BH / 2, s.v * k, BH); ctx.restore();
      });
      // a barra que fica no fim: o total final com borda
      const tiraDone = d.passos.every((s, i) => s.tipo !== 'tira' || t >= ev.steps[i] + 1.05);
      if (tiraDone) { ctx.save(); rr(ctx, X, BY, cap.final * k, BH, 18); ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.white, 0.5); ctx.stroke(); ctx.restore(); }
      // as etiquetas de soma e desconto (embaixo, à direita)
      let ly = BY + BH + 44;
      d.passos.forEach((s, i) => {
        if (s.tipo === 'pago') return;
        const e = ent(t, ev.steps[i], 0.4);
        if (e <= 0) { ly += 46; return; }
        const col = s.tipo === 'soma' ? C.amber : C.red, sign = s.tipo === 'soma' ? '+' : '−';
        const label = `${sign} ${s.t} ${brl(s.v).replace(',00', '')}`;
        const w = tw(label, MONO, 24, 800, 1);
        enter(ctx, e, L.x1 - w / 2, ly, () => {
          icon(ctx, s.icone || 'etiqueta', L.x1 - w - 26, ly - 8, 28, col, { lw: 2.2 });
          txt(ctx, label, L.x1, ly, { fam: MONO, size: 24, weight: 800, color: col, align: 'right', ls: 1, box: `etiqueta ${s.t}` });
        }, { dy: -14 });
        ly += 46;
      });
      // o que falta: colchete limão sobre a barra + o valor grande contando
      const eR = p(t, ev.res, ev.res + 0.5);
      if (eR > 0) {
        const pago = d.passos.filter((s) => s.tipo === 'pago').reduce((a, s) => a + s.v, 0);
        const a = xv(pago) + 6, b = xv(cap.final) - 6, yb = BY - 18;
        ctx.save(); ctx.strokeStyle = C.lime; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 14;
        const m = (a + b) / 2, half = (b - a) / 2 * E.outCubic(eR);
        ctx.beginPath(); ctx.moveTo(m - half, yb + 10); ctx.lineTo(m - half, yb); ctx.lineTo(m + half, yb); ctx.lineTo(m + half, yb + 10); ctx.stroke();
        ctx.restore();
        txt(ctx, d.resultado.t, m, yb - 14, { fam: MONO, size: 22, weight: 800, color: C.lime, align: 'center', ls: 4, alpha: E.outCubic(eR) });
        const v = cap.falta * E.outCubic(p(t, ev.res, ev.res + 0.6));
        const big = t >= ev.res + 0.62 ? 1 + 0.08 * (1 - p(t, ev.res + 0.62, ev.res + 0.9)) : 1;
        ctx.save(); ctx.translate(L.cx, 1222); ctx.scale(big, big); ctx.translate(-L.cx, -1222);
        txt(ctx, d.resultado.t, L.cx, 1148, { fam: MONO, size: 24, weight: 800, color: C.gray, align: 'center', ls: 5, alpha: E.outCubic(eR) });
        txt(ctx, brl(Math.round(v)), L.cx, 1240, { size: 96, weight: 900, color: C.lime, align: 'center', ls: -2, glow: css(C.lime, 0.4), blur: 30, alpha: E.outCubic(eR), box: 'falta' });
        ctx.restore();
        const nc = Math.round(d.conta.length * p(t, ev.res + 0.5, ev.res + 1.2));
        if (nc > 0) txt(ctx, d.conta.slice(0, nc), L.cx, 1306, { fam: MONO, size: 27, weight: 700, color: C.gray, align: 'center', box: nc === d.conta.length ? 'conta' : null });
      }
      // o alerta: cobrar errado
      const eA = p(t, ev.alert, ev.alert + 0.35);
      if (eA > 0) {
        const sk = Math.sin((t - ev.alert) * 42) * 7 * (1 - p(t, ev.alert, ev.alert + 0.5));
        ctx.save(); ctx.translate(sk, 0);
        chip(ctx, d.alerta.t, L.cx, 1390, { size: 24, icon: 'alerta', align: 'center', color: C.red, bg: css(C.red, 0.13), border: css(C.red, 0.75), h: 58, alpha: E.outCubic(eA), box: 'alerta' });
        ctx.restore();
      }
    },
  };

  // ---- crédito: o sinal sai da data cancelada, não vai pro bolso, vira um cartão de crédito e encaixa na nova data
  function miniCal(ctx, x, y, w, h, title, first, hi, o = {}) {
    panel(ctx, x, y, w, h, { r: 24, stroke: o.stroke || css(C.white, 0.14), glow: o.glow, box: o.box });
    icon(ctx, 'calendario', x + 36, y + 42, 26, o.tc || C.gray, { lw: 2 });
    txt(ctx, title, x + 60, y + 51, { fam: MONO, size: 22, weight: 800, color: o.tc || C.gray, ls: 2 });
    const cw = (w - 28) / 7, ch = 62, gx = x + 14, gy = y + 92;
    const cells = {};
    for (let i = 0; i < 14; i++) {
      const dnum = first + i, cx = gx + (i % 7) * cw + cw / 2, cy = gy + Math.floor(i / 7) * ch + ch / 2;
      cells[dnum] = { x: cx, y: cy, w: cw, h: ch };
      if (dnum === hi) continue;
      txt(ctx, String(dnum), cx, cy + 9, { fam: MONO, size: 24, weight: 700, color: '#BFC2BB', align: 'center' });
    }
    return cells;
  }
  CENAS.credito = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.cards = at(cap, d.antiga.em, cap.t0 + 0.5);
      ev.coin = Math.max(at(cap, d.sinal.em, ev.cards), ev.cards) + 0.25;
      ev.cancel = at(cap, d.cancelou.em, ev.coin + 1);
      ev.fica = at(cap, d.fica.em, ev.cancel + 1);
      ev.bolso = at(cap, d.bolso.em, ev.fica + 0.8);
      ev.vira = at(cap, d.vira.em, ev.bolso + 1);
      ev.card = ev.vira + 0.5; ev.fly = ev.vira + 1.15; ev.fit = ev.fly + 0.5;
      cue(ev.cards, 'pop', { f: 500 }); cue(ev.coin, 'coin'); cue(ev.cancel, 'alert'); cue(ev.fica, 'rise'); cue(ev.bolso, 'deny');
      cue(ev.vira, 'whoosh'); cue(ev.card, 'pop', { f: 760 }); cue(ev.fly, 'whoosh'); cue(ev.fit, 'lock'); cue(ev.fit + 0.2, 'check');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      const aX = L.x0, bX = L.x1 - 330, cY = 816, cw = 330, chh = 236;
      const fitOn = p(t, ev.fit, ev.fit + 0.3);
      let A = null, B = null;
      enter(ctx, ent(t, ev.cards, 0.5), aX + cw / 2, cY + chh / 2, () => { A = miniCal(ctx, aX, cY, cw, chh, d.antiga.t, d.antiga.dia - 6, d.antiga.dia, { box: 'data antiga', stroke: t >= ev.cancel ? css(C.red, 0.5) : null }); });
      enter(ctx, ent(t, ev.cards + 0.15, 0.5), bX + cw / 2, cY + chh / 2, () => { B = miniCal(ctx, bX, cY, cw, chh, d.nova.t, d.nova.dia - 6, d.nova.dia, { box: 'nova data', tc: fitOn > 0 ? C.lime : C.gray, stroke: fitOn > 0 ? css(C.lime, 0.7) : null, glow: fitOn > 0 ? css(C.lime, 0.35 * fitOn) : null }); });
      if (!A) return;
      // a data antiga: o dia do sinal e o "cancelou"
      const a = A[d.antiga.dia];
      const can = p(t, ev.cancel, ev.cancel + 0.3);
      txt(ctx, String(d.antiga.dia), a.x, a.y + 9, { fam: MONO, size: 24, weight: 800, align: 'center', color: can > 0 ? C.red : C.amber });
      if (can > 0) {
        ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.lineCap = 'round'; const r = 16 * E.outCubic(can);
        ctx.beginPath(); ctx.moveTo(a.x - r, a.y - r); ctx.lineTo(a.x + r, a.y + r); ctx.moveTo(a.x + r, a.y - r); ctx.lineTo(a.x - r, a.y + r); ctx.stroke(); ctx.restore();
        chip(ctx, d.cancelou.t, aX + cw / 2, cY + chh + 44, { size: 22, align: 'center', icon: 'x', color: C.red, bg: css(C.red, 0.12), border: css(C.red, 0.7), h: 50, alpha: E.outCubic(can), box: 'cancelou' });
      }
      // a nova data: o dia que recebe o crédito
      if (B) {
        const b = B[d.nova.dia];
        if (fitOn > 0) { rr(ctx, b.x - b.w / 2 + 2, b.y - b.h / 2 + 2, b.w - 4, b.h - 4, 10); ctx.fillStyle = css(C.lime, fitOn); ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 20; ctx.fill(); ctx.shadowColor = 'transparent'; }
        txt(ctx, String(d.nova.dia), b.x, b.y + 9, { fam: MONO, size: 24, weight: 800, align: 'center', color: fitOn > 0.5 ? C.ink : '#BFC2BB' });
        if (fitOn > 0) chip(ctx, 'CRÉDITO', bX + cw / 2, cY + chh + 44, { size: 22, align: 'center', icon: 'check', color: C.ink, bg: C.lime, border: 'none', h: 50, alpha: fitOn, glow: css(C.lime, 0.5), box: 'crédito na nova data' });
      }
      // a seta entre as datas
      const eV = p(t, ev.vira, ev.vira + 0.45);
      if (eV > 0) {
        const x0 = aX + cw + 22, x1 = bX - 22, y = cY + chh / 2;
        ctx.save(); ctx.strokeStyle = C.lime; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowColor = css(C.lime, 0.7); ctx.shadowBlur = 12;
        const xe = lerp(x0, x1, E.outCubic(eV));
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xe, y); ctx.stroke();
        if (eV > 0.6) { ctx.beginPath(); ctx.moveTo(xe - 14, y - 12); ctx.lineTo(xe, y); ctx.lineTo(xe - 14, y + 12); ctx.stroke(); }
        ctx.restore();
      }
      // o bolso (o sinal não volta pra ele)
      const eB = ent(t, ev.bolso, 0.4);
      if (eB > 0) {
        const wx = aX + 96, wy = 1300;
        enter(ctx, eB, wx, wy, () => {
          icon(ctx, 'carteira', wx, wy, 70, C.gray, { lw: 1.8 });
          txt(ctx, 'BOLSO', wx, wy + 72, { fam: MONO, size: 20, weight: 800, color: C.gray, align: 'center', ls: 3, box: 'bolso' });
          const xr = p(t, ev.bolso + 0.25, ev.bolso + 0.5);
          if (xr > 0) badge(ctx, wx + 38, wy - 34, 20, 'x', C.red, xr, { ink: C.white });
        });
        // o caminho que não acontece: tracejado da data até o bolso
        const ps = p(t, ev.bolso, ev.bolso + 0.3);
        ctx.save(); ctx.setLineDash([6, 8]); ctx.strokeStyle = css(C.red, 0.55 * ps); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(a.x, a.y + 30); ctx.quadraticCurveTo(a.x - 40, 1180, wx + 30, 1250); ctx.stroke(); ctx.restore();
      }
      // a moeda do sinal → o cartão de crédito → a nova data
      if (t >= ev.coin) {
        const lift = E.outCubic(p(t, ev.fica, ev.fica + 0.4));
        let x = a.x + 34, y = a.y - 4 - 30 * lift, s = 1;
        const mv = E.inOutCubic(p(t, ev.vira, ev.card));
        const cx = L.cx, cy = 1268;
        if (mv > 0) { x = lerp(x, cx, mv); y = lerp(y, cy, mv) - Math.sin(Math.PI * mv) * 120; }
        const morph = p(t, ev.card - 0.1, ev.card + 0.25);
        const fly = E.inOutCubic(p(t, ev.fly, ev.fit));
        if (morph < 1) {
          const e = E.outBack(p(t, ev.coin, ev.coin + 0.35), 2);
          ctx.save(); ctx.translate(x, y); ctx.scale(e * (1 - morph * 0.6), e * (1 - morph * 0.6));
          const pul = 1 + (lift > 0 && mv === 0 ? 0.05 * Math.sin((t - ev.fica) * 8) : 0);
          ctx.scale(pul, pul);
          ctx.beginPath(); ctx.arc(0, 0, 36, 0, TAU); const g = ctx.createLinearGradient(-36, -36, 36, 36); g.addColorStop(0, '#F7D774'); g.addColorStop(1, '#D9A53B');
          ctx.fillStyle = g; ctx.shadowColor = css(C.gold, 0.6); ctx.shadowBlur = 20 + 14 * lift; ctx.fill(); ctx.shadowColor = 'transparent';
          txt(ctx, d.sinal.t.replace('R$ ', ''), 0, 8, { fam: MONO, size: 21, weight: 800, align: 'center', color: '#5A3D05' });
          ctx.restore();
        }
        if (morph > 0) {
          const bcell = B ? B[d.nova.dia] : { x: cx, y: cy };
          const W0 = 350, H0 = 156, sc = lerp(1, 0.16, fly) * E.outBack(morph, 1.6);
          const px = lerp(cx, bcell.x, fly), py = lerp(cy, bcell.y, fly) - Math.sin(Math.PI * fly) * 90;
          if (fly < 1) {
            ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(morph * 2) * (1 - p(t, ev.fit - 0.05, ev.fit + 0.1));
            rr(ctx, -W0 / 2, -H0 / 2, W0, H0, 22);
            const g = ctx.createLinearGradient(-W0 / 2, -H0 / 2, W0 / 2, H0 / 2); g.addColorStop(0, '#1C2611'); g.addColorStop(1, '#10140C');
            ctx.fillStyle = g; ctx.shadowColor = css(C.lime, 0.45); ctx.shadowBlur = 30; ctx.fill(); ctx.shadowColor = 'transparent';
            ctx.lineWidth = 2.5; ctx.strokeStyle = C.lime; ctx.stroke();
            icon(ctx, 'cartao', -W0 / 2 + 44, -H0 / 2 + 44, 34, C.lime, { lw: 2 });
            txt(ctx, d.cartao.t, -W0 / 2 + 76, -H0 / 2 + 54, { fam: MONO, size: 22, weight: 800, color: C.lime, ls: 1 });
            txt(ctx, d.cartao.sub, -W0 / 2 + 26, H0 / 2 - 34, { size: 28, weight: 700, color: C.white });
            ctx.restore();
            if (fly === 0 && morph >= 1) BOX('cartão de crédito', cx - W0 / 2, cy - H0 / 2, cx + W0 / 2, cy + H0 / 2);
          }
        }
      }
    },
  };

  // ---- pares: dois pares de chips com "≠" limão entre eles
  CENAS.pares = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      let prev = cap.t0 + 0.3;
      ev.rows = d.pares.map((pr) => {
        const a = Math.max(at(cap, pr.a.em, prev + 0.3), prev), b = Math.max(at(cap, pr.b.em, a + 0.6), a + 0.45);
        prev = b + 0.3; return { a, b, neq: b + 0.32 };
      });
      ev.rows.forEach((r) => { cue(r.a, 'pop', { f: 600 }); cue(r.b, 'pop', { f: 720 }); cue(r.neq, 'neq'); });
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev, cw = 326, ch = 190;
      d.pares.forEach((pr, i) => {
        const y = 846 + i * 300, r = ev.rows[i];
        const side = (o, x, ts, tag) => enter(ctx, ent(t, ts, 0.45), x + cw / 2, y + ch / 2, () => {
          panel(ctx, x, y, cw, ch, { r: 26, stroke: css(C.white, 0.16), box: tag });
          rr(ctx, x + 24, y + 26, 64, 64, 18); ctx.fillStyle = css(C.lime, 0.1); ctx.fill();
          icon(ctx, o.icone || 'cadeado', x + 56, y + 58, 36, C.lime, { lw: 2 });
          txt(ctx, o.t, x + 104, y + 70, { fam: MONO, size: 30, weight: 800, color: C.white, ls: 2 });
          txt(ctx, o.sub || '', x + 26, y + ch - 40, { size: 29, weight: 600, color: C.gray });
        });
        side(pr.a, L.x0, r.a, `par ${i + 1}: ${pr.a.t}`);
        side(pr.b, L.x1 - cw, r.b, `par ${i + 1}: ${pr.b.t}`);
        // "=" que vira "≠"
        const eq = p(t, r.b, r.b + 0.25), sl = p(t, r.neq, r.neq + 0.22);
        if (eq > 0) {
          const cx = L.cx, cy = y + ch / 2, k = sl > 0 ? 1 + 0.25 * (1 - p(t, r.neq, r.neq + 0.35)) : E.outBack(eq);
          ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
          ctx.strokeStyle = sl > 0 ? C.lime : C.gray; ctx.lineWidth = 9; ctx.lineCap = 'round';
          if (sl > 0) { ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 22; }
          ctx.beginPath(); ctx.moveTo(-34, -13); ctx.lineTo(34, -13); ctx.moveTo(-34, 13); ctx.lineTo(34, 13); ctx.stroke();
          if (sl > 0) { ctx.beginPath(); ctx.moveTo(18, -40); ctx.lineTo(18 - 36 * E.outCubic(sl), -40 + 80 * E.outCubic(sl)); ctx.stroke(); }
          ctx.restore();
          BOX(`diferente ${i + 1}`, cx - 40, cy - 42, cx + 40, cy + 42);
        }
      });
    },
  };

  // ---- perguntas: a mala e a chave do check-out e três perguntas que entram com check
  CENAS.perguntas = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.ilu = at(cap, d.ilustracao.em, cap.t0 + 0.5);
      let prev = ev.ilu;
      ev.itens = d.itens.map((x) => (prev = Math.max(at(cap, x.em, prev + 0.6), prev + 0.4)));
      ev.checks = ev.itens.map((x) => x + 0.55);
      cue(ev.ilu, 'pop', { f: 480 }); ev.itens.forEach((x) => cue(x, 'slide')); ev.checks.forEach((x) => cue(x, 'check'));
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      // a ilustração: a mala e a chave
      enter(ctx, ent(t, ev.ilu, 0.5), L.cx, 890, () => {
        const sway = Math.sin(t * 1.6) * 3 * DEG;
        ctx.save(); ctx.translate(L.cx - 48, 890); ctx.rotate(sway); icon(ctx, 'mala', 0, 0, 86, C.white, { lw: 1.6 }); ctx.restore();
        ctx.save(); ctx.translate(L.cx + 62, 900); ctx.rotate(-20 * DEG - sway); icon(ctx, 'chave', 0, 0, 60, C.lime, { lw: 2.2, glow: css(C.lime, 0.5) }); ctx.restore();
        BOX('mala e chave', L.cx - 100, 846, L.cx + 100, 934);
      });
      const rh = 112, gap = 26, y0 = 980;
      // o trilhinho que liga as perguntas
      const lastOn = ev.itens.filter((x) => t >= x).length;
      if (lastOn > 1) {
        const y1 = y0 + rh / 2, y2 = y0 + (lastOn - 1) * (rh + gap) + rh / 2;
        const e = p(t, ev.itens[lastOn - 1], ev.itens[lastOn - 1] + 0.4);
        ctx.save(); ctx.strokeStyle = css(C.lime, 0.6); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.x0 + 56, y1); ctx.lineTo(L.x0 + 56, lerp(y2 - (rh + gap), y2, e)); ctx.stroke(); ctx.restore();
      }
      d.itens.forEach((it, i) => {
        const y = y0 + i * (rh + gap), ts = ev.itens[i];
        enter(ctx, ent(t, ts, 0.45), L.cx, y + rh / 2, () => {
          const ok = t >= ev.checks[i];
          panel(ctx, L.x0, y, L.x1 - L.x0, rh, { r: 24, stroke: ok ? css(C.lime, 0.55) : css(C.white, 0.14), box: `pergunta ${i + 1}` });
          ctx.beginPath(); ctx.arc(L.x0 + 56, y + rh / 2, 32, 0, TAU); ctx.fillStyle = '#141A0E'; ctx.fill(); ctx.strokeStyle = css(C.lime, 0.5); ctx.lineWidth = 2; ctx.stroke();
          icon(ctx, it.icone, L.x0 + 56, y + rh / 2, 34, C.lime, { lw: 2 });
          txt(ctx, it.t, L.x0 + 110, y + rh / 2 + 15, { size: 42, weight: 800, color: C.white, ls: -0.5 });
          badge(ctx, L.x1 - 52, y + rh / 2, 26, 'check', C.lime, p(t, ev.checks[i], ev.checks[i] + 0.3));
        }, { dy: 0, k0: 1 });
        // entra deslizando da esquerda
      });
    },
  };

  // ---- lista: as três palavras ligadas ao significado
  CENAS.lista = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      let prev = cap.t0 + 0.2;
      ev.itens = d.itens.map((x) => (prev = Math.max(at(cap, x.em, prev + 0.5), prev + 0.4)));
      ev.sweep = cap.t1 - 1.1;
      ev.itens.forEach((x) => { cue(x, 'pop', { f: 640 }); cue(x + 0.3, 'tick'); });
      cue(ev.sweep, 'shine');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev, rh = 128, gap = 34, y0 = 880, chipW = 290;
      d.itens.forEach((it, i) => {
        const y = y0 + i * (rh + gap), ts = ev.itens[i];
        const e = ent(t, ts, 0.4);
        if (e <= 0) return;
        enter(ctx, e, L.x0 + chipW / 2, y + rh / 2, () => {
          panel(ctx, L.x0, y, chipW, rh, { r: 26, stroke: css(C.lime, 0.6), flat: css(C.lime, 0.07), shadow: false, box: `palavra ${it.t}` });
          icon(ctx, it.icone, L.x0 + 52, y + rh / 2, 38, C.lime, { lw: 2 });
          txt(ctx, it.t, L.x0 + 88, y + rh / 2 + 11, { fam: MONO, size: 30, weight: 800, color: C.lime, ls: 2 });
        }, { dy: 0 });
        // a ligação e o significado (revelado da esquerda para a direita)
        const lk = E.outCubic(p(t, ts + 0.18, ts + 0.45));
        const lx0 = L.x0 + chipW + 8, lx1 = L.x0 + chipW + 48, ly = y + rh / 2;
        ctx.save(); ctx.strokeStyle = css(C.lime, 0.8); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lerp(lx0, lx1, lk), ly); ctx.stroke();
        if (lk > 0.9) { ctx.beginPath(); ctx.arc(lx1, ly, 6, 0, TAU); ctx.fillStyle = C.lime; ctx.fill(); }
        ctx.restore();
        const rv = E.outCubic(p(t, ts + 0.3, ts + 0.75));
        if (rv > 0) {
          const tx = lx1 + 22, w = tw(it.sentido, DISPLAY, 44, 800);
          ctx.save(); ctx.beginPath(); ctx.rect(tx - 4, y, (w + 12) * rv, rh); ctx.clip();
          txt(ctx, it.sentido, tx, ly + 15, { size: 44, weight: 800, color: C.white, box: rv >= 1 ? `significado ${it.t}` : null });
          ctx.restore();
          // o brilho que passa no fim
          const sw = p(t, ev.sweep + i * 0.12, ev.sweep + 0.6 + i * 0.12);
          if (sw > 0 && sw < 1) {
            const gx = lerp(tx - 120, tx + w + 120, sw), g = ctx.createLinearGradient(gx - 80, 0, gx + 80, 0);
            g.addColorStop(0, css(C.lime, 0)); g.addColorStop(0.5, css(C.lime, 0.45)); g.addColorStop(1, css(C.lime, 0));
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(tx - 10, y + 14, w + 20, rh - 28); ctx.restore();
          }
        }
      });
    },
  };

  // ---- fecho: card vertical deste vídeo, ações (curtir, comentar, enviar, salvar) acendendo, chips e o comentário digitado
  CENAS.fecho = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.card = cap.t0 + 0.25;
      ev.acoes = d.acoes.map((a, i) => Math.max(at(cap, a.em, cap.t0 + 0.6 + i * 0.4), cap.t0 + 0.45));
      const n = [...d.comentario.t].length, dur = n / 22;
      cap.tipoDur = dur;
      ev.comBox = Math.min(at(cap, d.comentario.em, cap.t0 + 3), DUR - 3.4 - dur - 0.6);
      ev.tipo = ev.comBox + 0.3;
      ev.heart = ev.tipo + dur + 0.25;
      FECHO.ultima = Math.max(ev.heart + 0.35, ...ev.acoes.map((x) => x + 0.4), ...cap.apoios.map((a) => a.t + 0.34));
      cue(ev.card, 'pop', { f: 520 }); ev.acoes.forEach((x, i) => cue(x, 'light', { i }));
      cue(ev.comBox, 'slide'); cue(ev.tipo, 'type', { d: dur }); cue(ev.heart, 'heart');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      const cx0 = 214, cy0 = 794, cw = 300, ch = 520;
      // o card vertical do vídeo
      enter(ctx, ent(t, ev.card, 0.55), cx0 + cw / 2, cy0 + ch / 2, () => {
        ctx.save(); rr(ctx, cx0, cy0, cw, ch, 30);
        const g = ctx.createLinearGradient(0, cy0, 0, cy0 + ch); g.addColorStop(0, '#191D18'); g.addColorStop(1, '#0D0F0D');
        ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.clip();
        const gg = ctx.createRadialGradient(cx0 + cw * 0.8, cy0 + 120, 0, cx0 + cw * 0.8, cy0 + 120, 300); gg.addColorStop(0, css(TONS[CAPS[0].tom], 0.18)); gg.addColorStop(1, css(C.lime, 0));
        ctx.fillStyle = gg; ctx.fillRect(cx0, cy0, cw, ch);
        logo(ctx, cx0 + 92, cy0 + 50, 26);
        txt(ctx, LN.marca, cx0 + 112, cy0 + 57, { fam: MONO, size: 14, weight: 700, color: C.gray });
        const S = 46;
        d.card.titulo.forEach((l, i) => txt(ctx, l, cx0 + cw / 2, cy0 + 200 + i * S, { size: S, weight: 900, color: C.white, align: 'center', ls: -1.2 }));
        ctx.save(); ctx.translate(cx0 + cw / 2, cy0 + 296); ctx.rotate(-3 * DEG);
        const bw = tw(d.card.faixa, DISPLAY, 24, 900) + 30; rr(ctx, -bw / 2, -19, bw, 38, 8); ctx.fillStyle = C.lime; ctx.fill();
        txt(ctx, d.card.faixa, 0, 9, { size: 24, weight: 900, color: C.ink, align: 'center' }); ctx.restore();
        for (let i = 0; i < 3; i++) { rr(ctx, cx0 + 48 + i * 72, cy0 + 360, 60, 40, 10); ctx.setLineDash([4, 4]); ctx.strokeStyle = css(C.lime, 0.5); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); icon(ctx, 'cadeado', cx0 + 78 + i * 72, cy0 + 380, 20, C.lime, { lw: 2 }); }
        // a barra de progresso do vídeo
        const pr = ((t - ev.card) / 6) % 1;
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(cx0 + 24, cy0 + ch - 34, cw - 48, 4);
        ctx.fillStyle = C.white; ctx.fillRect(cx0 + 24, cy0 + ch - 34, (cw - 48) * pr, 4);
        ctx.restore();
        ctx.save(); rr(ctx, cx0, cy0, cw, ch, 30); ctx.lineWidth = 2; ctx.strokeStyle = css(C.white, 0.16); ctx.stroke(); ctx.restore();
        BOX('card do vídeo', cx0, cy0, cx0 + cw, cy0 + ch);
      });
      // as ações, acendendo, e os chips limão
      const ix = cx0 + cw + 60, step = 108, iy0 = cy0 + 70;
      d.acoes.forEach((a, i) => {
        const y = iy0 + i * step, on = p(t, ev.acoes[i], ev.acoes[i] + 0.3), eIn = ent(t, ev.card + 0.2 + i * 0.08, 0.4);
        if (eIn <= 0) return;
        ctx.save(); ctx.globalAlpha *= eIn;
        const k = on > 0 ? 1 + 0.25 * Math.sin(Math.PI * clamp(on * 1.2)) : 1;
        ctx.translate(ix, y); ctx.scale(k, k); ctx.translate(-ix, -y);
        const col = on > 0.5 ? (a.icone === 'curtir' ? C.heart : C.lime) : C.gray;
        icon(ctx, a.icone, ix, y, 50, col, { lw: 2, fill: on > 0.5 && (a.icone === 'curtir' || a.icone === 'salvar') ? col : null, glow: on > 0.5 ? css(col, 0.6) : null });
        ctx.restore();
        BOX(`ação ${a.icone}`, ix - 25, y - 25, ix + 25, y + 25);
        if (a.chip && on > 0) {
          const e = E.outBack(on, 2);
          ctx.save(); ctx.translate(ix + 44, y); ctx.scale(e, e); ctx.translate(-(ix + 44), -y);
          chip(ctx, a.chip, ix + 44, y, { fam: DISPLAY, size: 30, weight: 800, ls: 0, color: C.ink, bg: C.lime, border: 'none', h: 56, pad: 22, glow: css(C.lime, 0.5), box: `chip ${a.chip}` });
          ctx.restore();
        }
      });
      // o comentário sendo digitado
      const eC = ent(t, ev.comBox, 0.45);
      if (eC > 0) {
        const bx = L.x0, by = 1346, bw = L.x1 - L.x0, bh = 92;
        enter(ctx, eC, bx + bw / 2, by + bh / 2, () => {
          panel(ctx, bx, by, bw, bh, { r: 24, stroke: css(C.white, 0.16), box: 'comentário' });
          const ax = bx + 48, ay = by + bh / 2;
          const g = ctx.createLinearGradient(ax - 26, ay - 26, ax + 26, ay + 26); g.addColorStop(0, C.lime); g.addColorStop(1, '#3E8F2A');
          ctx.beginPath(); ctx.arc(ax, ay, 26, 0, TAU); ctx.fillStyle = g; ctx.fill();
          icon(ctx, 'chale', ax, ay, 28, C.ink, { lw: 2.2 });
          txt(ctx, d.comentario.nome, bx + 92, by + 34, { fam: MONO, size: 19, weight: 700, color: C.gray });
          const chars = [...d.comentario.t], nShow = Math.round(chars.length * p(t, ev.tipo, ev.tipo + cap.tipoDur));
          const s = chars.slice(0, nShow).join('');
          const w = txt(ctx, s, bx + 92, by + 72, { size: 32, weight: 600, color: C.white, box: nShow === chars.length ? 'texto do comentário' : null });
          if (t < ev.heart + 0.6 && Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = C.lime; ctx.fillRect(bx + 94 + w, by + 46, 3, 32); }
          const hk = p(t, ev.heart, ev.heart + 0.35);
          const hx = L.x1 - 44, hy = ay;
          if (hk > 0) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, r = 30 + 30 * hk; ctx.fillStyle = css(C.heart, 0.8 * (1 - hk)); ctx.beginPath(); ctx.arc(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 4, 0, TAU); ctx.fill(); }
          const kk = hk > 0 ? 1 + 0.35 * Math.sin(Math.PI * hk) : 1;
          ctx.save(); ctx.translate(hx, hy); ctx.scale(kk, kk); icon(ctx, 'curtir', 0, 0, 40, hk > 0 ? C.heart : C.gray, { lw: 2, fill: hk > 0.3 ? C.heart : null, glow: hk > 0 ? css(C.heart, 0.6) : null }); ctx.restore();
        }, { dy: 30 });
      }
    },
  };

  // =====================================================================
  // O QUADRO
  // =====================================================================
  function drawChap(ctx, cap, t) {
    const tipo = cap.diagrama.tipo;
    if (tipo !== 'capa') header(ctx, cap, t);
    CENAS[tipo].draw(ctx, cap, t);
    drawApoio(ctx, cap, t);
  }
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowColor = 'transparent';
    const cam = camera(t);
    background(ctx, t, cam);
    ctx.save();
    // nada passa pela coluna de botões do Reels
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(BTN.x, BTN.y0, W - BTN.x, BTN.y1 - BTN.y0); ctx.clip('evenodd');
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    drawRail(ctx, t, cam);
    ctx.restore();
    for (let k = 0; k < NC; k++) {
      const top = k * H - cam.y;
      if (top >= H || top <= -H) continue;           // só os capítulos que aparecem no quadro
      ctx.save(); ctx.translate(-cam.x, top);
      OFF = { dx: -cam.x, dy: top, n: k };
      drawChap(ctx, CAPS[k], t);
      ctx.restore();
    }
    ctx.restore();
    OFF = { dx: 0, dy: 0, n: -1 };
    brand(ctx);
  }
  let bufS = null, bufA = null;
  function renderAt(ctx, t, o = {}) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    t = clamp(t, 0, DUR - 1e-4);
    const w = where(t);
    const blur = !o.noBlur && w.trans && w.u > 0.08 && w.u < 0.92;
    if (!blur) { frame(ctx, t); return; }
    if (!bufS) { const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }; bufS = mk(); bufA = mk(); }
    const sctx = bufS.getContext('2d'), actx = bufA.getContext('2d'), n = 4;
    for (let k = 0; k < n; k++) {
      frame(sctx, clamp(t + (k / (n - 1) - 0.5) / 110, 0, DUR - 1e-4));
      actx.globalAlpha = 1 / (k + 1); actx.drawImage(bufS, 0, 0);
    }
    actx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(bufA, 0, 0);
  }

  // =====================================================================
  // INÍCIO
  // =====================================================================
  function init(img, linha) {
    LOGO = img; LN = linha; DUR = linha.duracao; TR = linha.tr; CUES = [];
    M = document.createElement('canvas').getContext('2d');
    CAPS = linha.capitulos.map((c) => ({ ...c, ev: {} }));
    NC = CAPS.length;
    CAPS.forEach((cap, k) => {
      if (!CENAS[cap.diagrama.tipo]) throw new Error('tipo de diagrama desconhecido: ' + cap.diagrama.tipo);
      if (cap.diagrama.tipo !== 'capa') layoutTitulo(cap);
      if (cap.risca_titulo) cap.riscaT = at(cap, cap.risca_titulo.em, cap.t1 - 0.9);
      CENAS[cap.diagrama.tipo].setup(cap, k);
      if (k > 0) { cue(CAPS[k - 1].t1, 'trans', { d: TR, k }); cue(cap.t0 - 0.1, 'node', { k }); cue(cap.t0 + 0.02, 'title'); }
      if (cap.riscaT !== undefined) cue(cap.riscaT, 'strike');
      cap.apoios.forEach((a, i) => { if (k > 0 || i > 0) cue(a.t, 'apoio'); });
    });
    RAIL = buildRail();
    CUES.sort((a, b) => a.t - b.t);
  }

  function caixas(ctx, t) {
    BOXES = [];
    frame(ctx, t);
    const out = BOXES; BOXES = null;
    return out;
  }

  window.EXPLICA = {
    init, renderAt, W, H,
    get DURATION() { return DUR; },
    cues: () => ({ duration: DUR, capitulos: CAPS.map((c) => ({ n: c.n, rotulo: c.rotulo, tipo: c.diagrama.tipo, t0: c.t0, t1: c.t1, voz_t0: c.voz_t0, voz_t1: c.voz_t1, ev: c.ev })), cues: CUES.map((c) => ({ ...c, t: Math.round(c.t * 1e4) / 1e4 })) }),
    apoios: () => CAPS.flatMap((c) => c.apoios.map((a, i) => ({ cap: c.n, i: i + 1, texto: plain(a.texto), entra: a.t, inteira_de: a.t + 0.34, ate: c.apoios[i + 1] ? c.apoios[i + 1].t : a.ate }))),
    fecho: () => ({ ultima_mudanca_de_texto: FECHO.ultima, duracao: DUR }),
    trocas: () => CAPS.slice(0, -1).map((c, k) => ({ de: k, para: k + 1, t0: c.t1, t1: CAPS[k + 1].t0 })),
    caixas,
    montagens: () => CAPS.map((c) => {
      const ts = Object.values(c.ev).flat().flatMap((v) => (typeof v === 'number' ? [v] : typeof v === 'object' && v ? Object.values(v).filter((x) => typeof x === 'number') : [])).filter((x) => x >= c.t0 - 0.5 && x <= c.t1 + 0.5);
      return { n: c.n, t0: c.t0, t1: c.t1, primeira: ts.length ? Math.min(...ts) : c.t0, ultima: ts.length ? Math.max(...ts) : c.t1 };
    }),
  };
})();
