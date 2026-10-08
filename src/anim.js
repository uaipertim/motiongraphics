/* =====================================================================
   FAZLO Hospeda — Reels 9:16 (1080x1920) — motor de animação
   Tudo é desenhado em Canvas 2D, de forma determinística: renderAt(t)
   desenha o quadro exato do instante t (segundos). Isso permite tanto o
   preview em tempo real quanto o render quadro a quadro (scripts/render.mjs).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920, DURATION = 28;
  const FONT = "'Fazlo Display', 'Inter Display', 'Inter', sans-serif";

  // ---------------------------------------------------------------- paleta
  const C = {
    ink: '#10163A', deep: '#060A22', coral: '#FF5B3A', sun: '#FFC23C',
    teal: '#1FC8A9', violet: '#6C7CFF', cream: '#FFF3E2', pink: '#FF8FB1',
    white: '#FFFFFF', sunDark: '#E39A12', violetLight: '#8C99FF',
    coralLight: '#FF7E62', sunLight: '#FFD46E', tealLight: '#52DCC2',
    inkLight: '#1D2552', creamDark: '#F6E2C4',
  };

  // ---------------------------------------------------------------- utilitários
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const TAU = Math.PI * 2;
  const deg = (d) => (d * Math.PI) / 180;

  const E = {
    lin: (x) => x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inOutExpo: (x) => x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
    inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
    outElastic: (x) => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1,
    outBounce: (x) => {
      const n = 7.5625, d = 2.75;
      if (x < 1 / d) return n * x * x;
      if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
      if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
      return n * (x -= 2.625 / d) * x + 0.984375;
    },
  };

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // ruído suave 1D determinístico (soma de senos)
  const wob = (t, s) => Math.sin(t * 1.7 + s * 3.1) * 0.6 + Math.sin(t * 2.9 + s * 7.7) * 0.3 + Math.sin(t * 5.3 + s * 1.3) * 0.1;

  // ---------------------------------------------------------------- primitivas
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
  function roundPoly(ctx, pts, r) {
    ctx.beginPath();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      if (i === 0) ctx.moveTo(mx, my);
      ctx.arcTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, r);
    }
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function fs(ctx, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill('evenodd'); }
    if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function font(size, weight = 900) { return `${weight} ${size}px ${FONT}`; }

  // ---------------------------------------------------------------- tipografia
  function setText(ctx, size, weight, align, ls) {
    ctx.font = font(size, weight);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = (ls || 0) + 'px';
  }
  function textW(ctx, str, size, weight, ls) {
    setText(ctx, size, weight, 'left', ls);
    return ctx.measureText(str).width;
  }
  /** Texto com máscara: sobe por trás de uma linha invisível (entrada) e sai para cima (saída). */
  function rise(ctx, str, x, y, pin, o) {
    const size = o.size, weight = o.weight || 900, align = o.align || 'left';
    if (pin <= 0) return;
    const pout = o.out || 0;
    if (pout >= 1) return;
    const w = textW(ctx, str, size, weight, o.ls);
    const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const sdx = o.shadow ? o.sdx ?? size * 0.05 : 0, sdy = o.shadow ? o.sdy ?? size * 0.05 : 0;
    const off = (1 - (o.ease || E.outExpo)(pin)) * size * 1.45 - E.inCubic(pout) * size * 1.45;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left - 40, y - size * 1.08, w + 80 + sdx, size * 1.42 + sdy);
    ctx.clip();
    setText(ctx, size, weight, align, o.ls);
    if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(str, x + sdx, y + off + sdy); }
    ctx.fillStyle = o.color;
    ctx.fillText(str, x, y + off);
    ctx.restore();
  }
  function plainText(ctx, str, x, y, o) {
    setText(ctx, o.size, o.weight || 900, o.align || 'left', o.ls);
    if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(str, x + (o.sdx ?? o.size * 0.05), y + (o.sdy ?? o.size * 0.05)); }
    ctx.fillStyle = o.color;
    ctx.fillText(str, x, y);
  }

  // ---------------------------------------------------------------- ícones
  // Todos os ícones são desenhados numa caixa unitária (-0.5..0.5) e escalados.
  // k = cores {line, a, b, c, d}. Para a "sombra dura" passamos todas as cores = sombra.
  const LW = 0.055;
  const ICONS = {
    house(ctx, k) {
      rr(ctx, -0.34, -0.06, 0.68, 0.48, 0.05); fs(ctx, k.a, k.line, LW);
      roundPoly(ctx, [[-0.47, 0.02], [0, -0.42], [0.47, 0.02]], 0.06); fs(ctx, k.b, k.line, LW);
      rr(ctx, -0.09, 0.15, 0.18, 0.27, 0.07); fs(ctx, k.c, k.line, LW);
      rr(ctx, -0.27, 0.06, 0.12, 0.12, 0.02); fs(ctx, k.d, k.line, LW * 0.8);
      rr(ctx, 0.15, 0.06, 0.12, 0.12, 0.02); fs(ctx, k.d, k.line, LW * 0.8);
      circle(ctx, 0, -0.14, 0.06); fs(ctx, k.d, k.line, LW * 0.8);
    },
    calendar(ctx, k) {
      rr(ctx, -0.42, -0.34, 0.84, 0.76, 0.09); fs(ctx, k.a, k.line, LW);
      ctx.save(); rr(ctx, -0.42, -0.34, 0.84, 0.76, 0.09); ctx.clip();
      ctx.beginPath(); ctx.rect(-0.45, -0.37, 0.9, 0.23); ctx.fillStyle = k.b; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(-0.42, -0.14); ctx.lineTo(0.42, -0.14); fs(ctx, null, k.line, LW);
      rr(ctx, -0.42, -0.34, 0.84, 0.76, 0.09); fs(ctx, null, k.line, LW);
      for (const x of [-0.2, 0.2]) { rr(ctx, x - 0.04, -0.45, 0.08, 0.2, 0.04); fs(ctx, k.line, null, 0); }
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const hl = r === 1 && c === 1;
        rr(ctx, -0.3 + c * 0.22, -0.06 + r * 0.15, 0.16, 0.1, 0.03);
        fs(ctx, hl ? k.c : k.line, hl ? k.line : null, hl ? LW * 0.6 : 0);
      }
    },
    key(ctx, k) {
      rr(ctx, -0.06, -0.06, 0.52, 0.12, 0.03); fs(ctx, k.a, k.line, LW);
      ctx.beginPath(); ctx.moveTo(0.27, 0.06); ctx.lineTo(0.27, 0.19); ctx.lineTo(0.33, 0.19); ctx.lineTo(0.33, 0.06);
      ctx.moveTo(0.37, 0.06); ctx.lineTo(0.37, 0.15); ctx.lineTo(0.43, 0.15); ctx.lineTo(0.43, 0.06); fs(ctx, k.a, k.line, LW);
      ctx.beginPath(); ctx.arc(-0.22, 0, 0.22, 0, TAU); ctx.moveTo(-0.15, 0); ctx.arc(-0.22, 0, 0.07, 0, TAU, true);
      fs(ctx, k.a, k.line, LW);
    },
    bed(ctx, k) {
      rr(ctx, -0.45, -0.3, 0.14, 0.62, 0.05); fs(ctx, k.c, k.line, LW);
      ctx.beginPath(); ctx.moveTo(-0.38, 0.32); ctx.lineTo(-0.38, 0.4); ctx.moveTo(0.4, 0.32); ctx.lineTo(0.4, 0.4); fs(ctx, null, k.line, LW);
      rr(ctx, -0.36, 0.02, 0.82, 0.2, 0.05); fs(ctx, k.a, k.line, LW);
      rr(ctx, -0.12, -0.1, 0.58, 0.16, 0.05); fs(ctx, k.b, k.line, LW);
      rr(ctx, -0.3, -0.13, 0.17, 0.13, 0.05); fs(ctx, k.d, k.line, LW);
    },
    receipt(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.3, -0.44); ctx.lineTo(0.3, -0.44); ctx.lineTo(0.3, 0.38);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const x0 = 0.3 - (i * 0.6) / n;
        ctx.lineTo(x0 - 0.05, 0.44); ctx.lineTo(x0 - 0.1, 0.38);
      }
      ctx.closePath(); fs(ctx, k.a, k.line, LW);
      ctx.beginPath();
      ctx.moveTo(-0.18, -0.28); ctx.lineTo(0.18, -0.28);
      ctx.moveTo(-0.18, -0.15); ctx.lineTo(0.08, -0.15);
      ctx.moveTo(-0.18, -0.02); ctx.lineTo(0.14, -0.02);
      fs(ctx, null, k.line, LW * 0.8);
      rr(ctx, -0.18, 0.1, 0.36, 0.13, 0.04); fs(ctx, k.b, k.line, LW * 0.8);
    },
    coin(ctx, k) {
      circle(ctx, 0, 0, 0.42); fs(ctx, k.a, k.line, LW);
      circle(ctx, 0, 0, 0.3); fs(ctx, null, k.line, LW * 0.6);
      ctx.save(); ctx.scale(0.01, 0.01); plainText(ctx, 'R$', 0, 11, { size: 31, weight: 900, color: k.line, align: 'center' }); ctx.restore();
    },
    card(ctx, k) {
      rr(ctx, -0.46, -0.3, 0.92, 0.6, 0.07); fs(ctx, k.a, k.line, LW);
      ctx.save(); rr(ctx, -0.46, -0.3, 0.92, 0.6, 0.07); ctx.clip(); ctx.fillStyle = k.line; ctx.fillRect(-0.5, -0.18, 1, 0.12); ctx.restore();
      rr(ctx, -0.34, 0.04, 0.16, 0.13, 0.03); fs(ctx, k.b, k.line, LW * 0.7);
      ctx.beginPath(); ctx.moveTo(0.04, 0.16); ctx.lineTo(0.32, 0.16); fs(ctx, null, k.line, LW * 0.8);
    },
    bell(ctx, k) {
      ctx.beginPath(); ctx.moveTo(0, -0.26); ctx.lineTo(0, -0.18); fs(ctx, null, k.line, LW * 1.2);
      circle(ctx, 0, -0.29, 0.06); fs(ctx, k.b, k.line, LW);
      ctx.beginPath(); ctx.arc(0, 0.2, 0.37, Math.PI, 0); ctx.closePath(); fs(ctx, k.a, k.line, LW);
      ctx.beginPath(); ctx.arc(0, 0.2, 0.26, Math.PI * 1.15, Math.PI * 1.4); fs(ctx, null, k.d, LW * 0.8);
      rr(ctx, -0.45, 0.18, 0.9, 0.12, 0.05); fs(ctx, k.c, k.line, LW);
    },
    suitcase(ctx, k) {
      rr(ctx, -0.14, -0.38, 0.28, 0.2, 0.06); fs(ctx, null, k.line, LW * 1.4);
      rr(ctx, -0.42, -0.22, 0.84, 0.6, 0.08); fs(ctx, k.a, k.line, LW);
      for (const x of [-0.22, 0.16]) { ctx.beginPath(); ctx.rect(x, -0.22, 0.06, 0.6); fs(ctx, k.b, k.line, LW * 0.7); }
    },
    cup(ctx, k) {
      ctx.beginPath(); ctx.arc(0.16, 0.1, 0.13, -Math.PI / 2, Math.PI / 2); fs(ctx, null, k.line, LW * 2.2);
      ctx.beginPath(); ctx.arc(0.16, 0.1, 0.13, -Math.PI / 2, Math.PI / 2); fs(ctx, null, k.a, LW * 0.9);
      rr(ctx, -0.32, -0.1, 0.48, 0.46, 0.08); fs(ctx, k.a, k.line, LW);
      ctx.beginPath(); ctx.rect(-0.32, 0.04, 0.48, 0.1); fs(ctx, k.b, null, 0);
      rr(ctx, -0.32, -0.1, 0.48, 0.46, 0.08); fs(ctx, null, k.line, LW);
      ctx.beginPath();
      for (const x of [-0.17, 0.0]) { ctx.moveTo(x, -0.2); ctx.bezierCurveTo(x - 0.07, -0.27, x + 0.07, -0.33, x, -0.42); }
      fs(ctx, null, k.line, LW * 0.8);
    },
    check(ctx, k, prog = 1) {
      circle(ctx, 0, 0, 0.44); fs(ctx, k.a, k.line, LW);
      checkPath(ctx, prog, 0.75); fs(ctx, null, k.b, 0.1);
    },
    glass(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.24, -0.34); ctx.lineTo(0.24, -0.34); ctx.lineTo(0.17, 0.4); ctx.lineTo(-0.17, 0.4); ctx.closePath(); fs(ctx, k.a, k.line, LW);
      ctx.beginPath(); ctx.moveTo(-0.21, -0.08); ctx.lineTo(0.21, -0.08); ctx.lineTo(0.17, 0.4); ctx.lineTo(-0.17, 0.4); ctx.closePath(); fs(ctx, k.b, k.line, LW);
      ctx.beginPath(); ctx.moveTo(0.06, -0.34); ctx.lineTo(0.2, -0.52); fs(ctx, null, k.line, LW * 1.1);
    },
  };
  function checkPath(ctx, prog, s = 1) {
    const pts = [[-0.24 * s, 0.02 * s], [-0.07 * s, 0.2 * s], [0.26 * s, -0.17 * s]];
    const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
    const L = (l1 + l2) * clamp(prog);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    if (L <= l1) { const f = L / l1; ctx.lineTo(lerp(pts[0][0], pts[1][0], f), lerp(pts[0][1], pts[1][1], f)); }
    else { ctx.lineTo(pts[1][0], pts[1][1]); const f = (L - l1) / l2; ctx.lineTo(lerp(pts[1][0], pts[2][0], f), lerp(pts[1][1], pts[2][1], f)); }
  }

  // Paletas padrão por ícone
  const ICON_COLORS = {
    house: { a: C.cream, b: C.coral, c: C.teal, d: C.sun },
    calendar: { a: C.cream, b: C.coral, c: C.teal },
    key: { a: C.sun },
    bed: { a: C.cream, b: C.teal, c: C.coral, d: C.white },
    receipt: { a: C.cream, b: C.sun },
    coin: { a: C.sun },
    card: { a: C.violet, b: C.sun },
    bell: { a: C.sun, b: C.coral, c: C.coral, d: C.white },
    suitcase: { a: C.coral, b: C.sun },
    cup: { a: C.cream, b: C.coral },
    check: { a: C.teal, b: C.cream },
    glass: { a: C.cream, b: C.sun },
  };

  /** Desenha um ícone com contorno e sombra dura deslocada. */
  function icon(ctx, name, x, y, size, o = {}) {
    const rot = o.rot || 0, sc = o.scale ?? 1, alpha = o.alpha ?? 1;
    if (sc <= 0.001 || alpha <= 0.001) return;
    const base = Object.assign({ line: C.ink }, ICON_COLORS[name], o.colors || {});
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.scale(size * sc, size * sc);
    const sd = o.shadow === undefined ? 0.06 : o.shadow;
    if (sd) {
      const sc2 = o.shadowColor || C.deep;
      const k = { line: sc2, a: sc2, b: sc2, c: sc2, d: sc2 };
      ctx.save(); ctx.translate(sd, sd); ctx.rotate(rot); ICONS[name](ctx, k, o.prog); ctx.restore();
    }
    ctx.rotate(rot);
    ICONS[name](ctx, base, o.prog);
    ctx.restore();
  }

  /** Marca FAZLO: casinha + check ("pousada em ordem"). */
  function mark(ctx, x, y, size, o = {}) {
    const sc = o.scale ?? 1, rot = o.rot || 0, chk = o.check ?? 1, alpha = o.alpha ?? 1;
    if (sc <= 0.001 || alpha <= 0) return;
    const pts = [[-0.43, -0.03], [0, -0.45], [0.43, -0.03], [0.43, 0.43], [-0.43, 0.43]];
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.scale(size * sc, size * sc); ctx.rotate(rot);
    if (o.shadow !== false) {
      ctx.save(); ctx.translate(0.06, 0.06); roundPoly(ctx, pts, 0.08); fs(ctx, o.shadowColor || C.ink, o.shadowColor || C.ink, LW); ctx.restore();
    }
    roundPoly(ctx, pts, 0.08); fs(ctx, o.fill || C.coral, C.ink, LW);
    ctx.translate(0, 0.08);
    checkPath(ctx, chk, 1.05); fs(ctx, null, o.checkColor || C.cream, 0.11);
    ctx.restore();
  }

  function tile(ctx, x, y, size, color, o = {}) {
    const sc = o.scale ?? 1;
    if (sc <= 0.001) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(sc, sc);
    const s = size, r = s * 0.2, sd = s * 0.06;
    rr(ctx, -s / 2 + sd, -s / 2 + sd, s, s, r); fs(ctx, o.shadowColor || C.deep, null, 0);
    rr(ctx, -s / 2, -s / 2, s, s, r); fs(ctx, color, C.ink, s * 0.03);
    ctx.restore();
  }

  function pill(ctx, x, y, w, h, fill, o = {}) {
    const sd = o.sd ?? h * 0.12;
    if (sd) { rr(ctx, x + sd, y + sd, w, h, h / 2); fs(ctx, o.shadowColor || C.deep, null, 0); }
    rr(ctx, x, y, w, h, h / 2); fs(ctx, fill, o.line === undefined ? C.ink : o.line, o.lw ?? h * 0.07);
  }

  /** Etiqueta tipo "post-it" usada no caos. */
  function sticker(ctx, x, y, text, color, rot, sc, o = {}) {
    if (sc <= 0.001) return;
    const size = o.size || 46;
    const w = textW(ctx, text, size, 800) + size * 1.2, h = size * 1.75;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    pill(ctx, -w / 2, -h / 2, w, h, color, { sd: 12, shadowColor: o.shadowColor || C.deep, lw: 5 });
    plainText(ctx, text, 0, size * 0.36, { size, weight: 800, color: o.textColor || C.ink, align: 'center' });
    ctx.restore();
  }

  /** Número da funcionalidade (01/05). */
  function numberPill(ctx, x, y, n, t, o = {}) {
    const e = E.outBack(p(t, 0, 0.35));
    if (e <= 0) return;
    ctx.save();
    ctx.translate(x, y); ctx.scale(e, e);
    const fill = o.fill || C.ink, fg = o.fg || C.cream;
    pill(ctx, 0, -38, 214, 76, fill, { sd: 0, line: o.line || C.ink, lw: 4 });
    plainText(ctx, n, 30, 16, { size: 46, weight: 900, color: fg });
    plainText(ctx, '/ 05', 98, 15, { size: 34, weight: 700, color: fg, });
    ctx.restore();
  }

  // ---------------------------------------------------------------- decor de fundo
  function decor(ctx, t, seed, color, count = 12, alpha = 1) {
    const r = rng(seed);
    ctx.save();
    ctx.globalAlpha *= alpha;
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? r() * 0.26 : 0.74 + r() * 0.26;
      const x0 = side * W, y0 = r() * H;
      const sp = 30 + r() * 60, type = Math.floor(r() * 4), s = 18 + r() * 34, rs = (r() - 0.5) * 2;
      const y = ((y0 - t * sp) % (H + 200) + H + 200) % (H + 200) - 100;
      const x = x0 + Math.sin(t * 0.8 + i) * 20;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * rs + i);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (type === 0) { circle(ctx, 0, 0, s); ctx.stroke(); }
      else if (type === 1) { ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke(); }
      else if (type === 2) { circle(ctx, 0, 0, s * 0.45); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(-s * 1.2, 0); ctx.bezierCurveTo(-s * 0.6, -s, -s * 0.2, s, s * 0.3, 0); ctx.bezierCurveTo(s * 0.6, -s * 0.8, s, s * 0.6, s * 1.3, 0); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  }
  function dotGrid(ctx, t, color, alpha) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
    const g = 72, oy = (t * 24) % g;
    for (let y = -g + oy; y < H + g; y += g) for (let x = g / 2; x < W; x += g) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function bg(ctx, color) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); }

  // =====================================================================
  // CENA 1 — INTRO (0–7s): gancho → caos → ordem → zoom no calendário
  // =====================================================================
  const HOUSE = { x: 540, y: 820 };
  const CHAOS = [
    { n: 'calendar', x: 205, y: 430, s: 175, grid: 0, tile: C.violet },
    { n: 'key', x: 860, y: 385, s: 185, grid: 1, tile: C.coral },
    { n: 'suitcase', x: 540, y: 265, s: 150, grid: 3, tile: C.teal },
    { n: 'card', x: 185, y: 800, s: 170, grid: 5, tile: C.pink },
    { n: 'coin', x: 895, y: 790, s: 160, grid: 7, tile: C.violet },
    { n: 'cup', x: 165, y: 1300, s: 160, grid: 6, tile: C.sun },
    { n: 'bell', x: 910, y: 1350, s: 165, grid: -1 },
    { n: 'receipt', x: 230, y: 1530, s: 180, grid: 2, tile: C.sun },
    { n: 'bed', x: 850, y: 1545, s: 185, grid: 8, tile: C.teal },
  ];
  // grade 3x3 (índice 4 = marca no centro)
  const GRID_C = { x: 540, y: 1075 }, GRID_S = 300, TILE = 252;
  const gridPos = (i) => ({ x: GRID_C.x + ((i % 3) - 1) * GRID_S, y: GRID_C.y + (Math.floor(i / 3) - 1) * GRID_S });

  const STICKERS = [
    { t: 2.5, txt: 'Reserva duplicada?!', c: C.coral, x: 370, y: 600, r: -8 },
    { t: 2.75, txt: 'Quem fez check-in?', c: C.sun, x: 660, y: 1290, r: 6 },
    { t: 3.0, txt: 'Comanda do quarto 4', c: C.teal, x: 400, y: 1440, r: -5 },
    { t: 3.25, txt: 'O Pix caiu?', c: C.violet, x: 790, y: 540, r: 7 },
    { t: 3.5, txt: 'Check-out às 12h!', c: C.cream, x: 690, y: 1590, r: 6 },
    { t: 3.75, txt: 'Cadê o caderninho?', c: C.pink, x: 600, y: 690, r: -5 },
    { t: 4.0, txt: 'Fechar o caixa…', c: C.sun, x: 400, y: 1170, r: -4 },
    { t: 4.25, txt: 'Hóspede chegando!', c: C.teal, x: 720, y: 1060, r: 8 },
    { t: 4.5, txt: 'Conta do quarto 2?', c: C.coral, x: 520, y: 760, r: -3 },
  ];

  function chaosState(i, t) {
    const it = CHAOS[i];
    const amp = 1 + 1.6 * p(t, 2, 5);
    const x = it.x + wob(t * 1.1 * amp, i) * 38 * amp;
    const y = it.y + wob(t * 0.9 * amp, i + 5) * 34 * amp;
    const rot = deg(wob(t * 1.3, i + 9) * 22 * amp + Math.sin(i) * 12);
    const beat = Math.pow(1 - ((t % 0.5) / 0.5), 4) * (t > 1 ? 0.1 : 0);
    return { x, y, rot, s: 1 + beat };
  }

  function sceneIntro(ctx, t) {
    bg(ctx, C.ink);
    // shake crescente no caos
    const shake = t > 2 && t < 5 ? Math.pow(p(t, 2, 5), 2) * 14 : 0;
    // impacto em 5s: tremor curto
    const hit = t >= 5 ? Math.max(0, 1 - (t - 5) / 0.35) * 22 : 0;
    const sx = (wob(t * 31, 1) * shake) + wob(t * 47, 3) * hit;
    const sy = (wob(t * 29, 2) * shake) + wob(t * 43, 4) * hit;
    // zoom final no calendário (6.45 → 7.0)
    const zp = E.inExpo(p(t, 6.42, 7.0));
    const tp = gridPos(0);
    const camS = Math.exp(lerp(0, Math.log(11), zp)) * (1 + 0.06 * E.inCubic(p(t, 4.5, 5)) * (t < 5 ? 1 : 0));
    const fx = lerp(540, tp.x, E.outCubic(p(t, 6.42, 6.85))), fy = lerp(960, tp.y, E.outCubic(p(t, 6.42, 6.85)));
    ctx.save();
    ctx.translate(540 + sx, 960 + sy); ctx.scale(camS, camS); ctx.translate(-fx, -fy);

    dotGrid(ctx, t, C.cream, 0.06 * (1 - zp));

    // --- casinha do gancho
    if (t < 2.4) {
      const pop = E.outBack(p(t, 0, 0.45), 2.2);
      const out = E.inBack(p(t, 2.0, 2.35));
      const burst = t > 1 ? Math.sin(p(t, 1, 1.35) * Math.PI) * 0.12 : 0;
      const sc = pop * (1 - out) * (1 + burst);
      ctx.save(); ctx.translate(HOUSE.x, HOUSE.y); ctx.scale(sc, sc);
      circle(ctx, 14, 14, 262); fs(ctx, C.deep, null, 0);
      circle(ctx, 0, 0, 262); fs(ctx, C.violet, C.deep, 6);
      ctx.restore();
      // anel de onda no estouro
      if (t > 1 && t < 1.6) { const q = E.outCubic(p(t, 1, 1.6)); circle(ctx, HOUSE.x, HOUSE.y, 262 + q * 420); fs(ctx, null, C.sun, 26 * (1 - q)); }
      icon(ctx, 'house', HOUSE.x, HOUSE.y + 6, 330, { scale: E.outBack(p(t, 0.08, 0.55), 2) * (1 - out) * (1 + burst), rot: deg(lerp(-18, 0, E.outBack(p(t, 0.08, 0.6)))) + deg(Math.sin(p(t, 1, 1.4) * Math.PI * 3) * 6 * (t > 1 ? 1 : 0)) });
    }

    // --- texto do gancho
    if (t < 2.1) {
      const o = p(t, 1.75, 2.0);
      rise(ctx, 'Gerir uma', 540, 1290, p(t, 0.12, 0.6), { size: 96, weight: 800, color: C.cream, align: 'center', out: o });
      rise(ctx, 'pousada', 540, 1480, p(t, 0.25, 0.75), { size: 200, weight: 900, color: C.sun, align: 'center', shadow: C.coral, sdx: 10, sdy: 10, out: o });
    }

    // --- texto do caos
    if (t >= 1.95 && t < 5.0) {
      const j = Math.pow(p(t, 2.5, 5), 2) * 8;
      ctx.save(); ctx.translate(wob(t * 53, 7) * j, wob(t * 49, 8) * j);
      rise(ctx, 'é fazer', 540, 840, p(t, 2.0, 2.4), { size: 100, weight: 800, color: C.cream, align: 'center' });
      rise(ctx, 'mil coisas', 540, 1020, p(t, 2.1, 2.55), { size: 176, weight: 900, color: C.sun, align: 'center', shadow: C.coral, sdx: 10, sdy: 10 });
      rise(ctx, 'ao mesmo tempo.', 540, 1150, p(t, 2.25, 2.7), { size: 100, weight: 800, color: C.cream, align: 'center' });
      ctx.restore();
    }

    // --- ícones: explodem da casa, caos, e encaixam na grade
    for (let i = 0; i < CHAOS.length; i++) {
      const it = CHAOS[i];
      const t0 = 1.0 + i * 0.035;
      if (t < t0) continue;
      const cs = chaosState(i, Math.min(t, 5));
      let x, y, rot, sc;
      const ein = E.outExpo(p(t, t0, t0 + 0.65));
      x = lerp(HOUSE.x, cs.x, ein); y = lerp(HOUSE.y, cs.y, ein);
      rot = lerp(deg(-200 + i * 40), cs.rot, ein);
      sc = cs.s * lerp(0.2, 1, ein);
      let tileSc = 0, size = it.s;
      if (t >= 5) {
        if (it.grid < 0) {
          // sino é arremessado para fora
          const q = E.inCubic(p(t, 5, 5.45));
          const dx = cs.x - 540, dy = cs.y - 1075, d = Math.hypot(dx, dy);
          x = cs.x + (dx / d) * q * 900; y = cs.y + (dy / d) * q * 900; rot = cs.rot + q * 6;
        } else {
          const g = gridPos(it.grid);
          const ts = 5.05 + it.grid * 0.03;
          const e = E.outBack(p(t, ts, ts + 0.5), 1.4);
          x = lerp(cs.x, g.x, e); y = lerp(cs.y, g.y, e);
          rot = lerp(cs.rot, 0, E.outCubic(p(t, ts, ts + 0.5)));
          size = lerp(it.s, 150, E.outCubic(p(t, ts, ts + 0.45)));
          sc = 1;
          tileSc = E.outBack(p(t, ts + 0.08, ts + 0.45), 2);
          // flutuação leve
          const bob = Math.sin((t - ts) * 3 + it.grid) * 6 * p(t, ts + 0.5, ts + 0.9);
          y += bob;
          if (tileSc > 0) tile(ctx, g.x, g.y + bob, TILE, it.tile, { scale: tileSc });
        }
      }
      const fade = it.grid === 0 ? 1 - p(t, 6.5, 6.75) : 1;
      icon(ctx, it.n, x, y, size, { rot, scale: sc, alpha: fade });
    }

    // --- stickers do caos
    for (let i = 0; i < STICKERS.length; i++) {
      const s = STICKERS[i];
      if (t < s.t) continue;
      let sc = E.outBack(p(t, s.t, s.t + 0.22), 2.5);
      let x = s.x + wob(t * 2, i) * 10 * p(t, 2, 5), y = s.y + wob(t * 2.2, i + 3) * 10 * p(t, 2, 5), r = deg(s.r);
      if (t >= 5) {
        const q = E.inCubic(p(t, 5, 5.4));
        const dx = s.x - 540, dy = s.y - 960, d = Math.hypot(dx, dy) || 1;
        x += (dx / d) * q * 1300; y += (dy / d) * q * 1300; r += q * (i % 2 ? 3 : -3);
        if (q >= 1) continue;
      }
      sticker(ctx, x, y, s.txt, s.c, r, sc);
    }

    // --- marca FAZLO no centro (impacto em 5s)
    if (t >= 4.98) {
      const e = E.outExpo(p(t, 4.98, 5.25));
      const sc = lerp(3.2, 1, e);
      const g = gridPos(4);
      const bob = Math.sin((t - 5) * 3) * 6 * p(t, 5.5, 5.9);
      tile(ctx, g.x, g.y + bob, TILE, C.cream, { scale: E.outBack(p(t, 5.08, 5.4), 2) });
      mark(ctx, g.x, g.y + bob, 190, { scale: sc, check: E.outCubic(p(t, 5.1, 5.45)), alpha: p(t, 4.98, 5.02) });
      // onda de choque
      if (t < 5.7) {
        const q = E.outCubic(p(t, 5, 5.7));
        circle(ctx, g.x, g.y, 150 + q * 1200); fs(ctx, null, C.sun, 60 * (1 - q));
        circle(ctx, g.x, g.y, 100 + q * 800); fs(ctx, null, C.coral, 30 * (1 - q));
      }
    }

    // --- texto da ordem
    if (t >= 5.3) {
      const o = p(t, 6.35, 6.55);
      rise(ctx, 'Com o FAZLO Hospeda,', 540, 420, p(t, 5.35, 5.8), { size: 66, weight: 800, color: C.cream, align: 'center', out: o });
      rise(ctx, 'tudo em ordem.', 540, 560, p(t, 5.5, 6.0), { size: 116, weight: 900, color: C.sun, align: 'center', shadow: C.coral, sdx: 7, sdy: 7, out: o });
    }
    ctx.restore();

    // flash do impacto
    if (t >= 5 && t < 5.18) { ctx.fillStyle = `rgba(255,243,226,${1 - p(t, 5, 5.18)})`; ctx.fillRect(0, 0, W, H); }
    // finaliza 100% violeta (casa com a próxima cena)
    if (t > 6.8) { ctx.fillStyle = C.violet; ctx.globalAlpha = E.inCubic(p(t, 6.85, 7.0)); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  // =====================================================================
  // Moldura comum das funcionalidades
  // =====================================================================
  function featureHeader(ctx, t, n, lines, o) {
    numberPill(ctx, 90, 250, n, t - 0.02, o.pill || {});
    const size = o.size || 160;
    lines.forEach((ln, i) => {
      rise(ctx, ln, 86, o.y0 + i * size * 0.98, p(t, 0.08 + i * 0.1, 0.6 + i * 0.1), { size, weight: 900, color: o.color, shadow: o.shadow, sdx: size * 0.055, sdy: size * 0.055, ls: -2 });
    });
  }
  function subline(ctx, t, lines, y, color, t0 = 0.55) {
    lines.forEach((ln, i) => rise(ctx, ln, 90, y + i * 70, p(t, t0 + i * 0.1, t0 + 0.5 + i * 0.1), { size: 58, weight: 700, color }));
  }

  // =====================================================================
  // CENA 2 — 01 RESERVAS (7.0–9.5)
  // =====================================================================
  function sceneReservas(ctx, t) {
    bg(ctx, C.violet);
    decor(ctx, t + 7, 11, C.violetLight, 12);
    featureHeader(ctx, t, '01', ['Reservas'], { y0: 470, size: 172, color: C.cream, shadow: C.ink });

    // calendário
    const e = E.outBack(p(t, -0.05, 0.5), 1.3);
    const cx = 540, cy = 1015, cw = 880, ch = 740;
    ctx.save();
    ctx.translate(cx, cy + (1 - e) * 1200); ctx.rotate(deg(lerp(-14, -2.5, E.outCubic(p(t, -0.05, 0.55)))));
    ctx.translate(-cw / 2, -ch / 2);
    rr(ctx, 22, 22, cw, ch, 44); fs(ctx, C.ink, null, 0);
    rr(ctx, 0, 0, cw, ch, 44); fs(ctx, C.cream, C.ink, 8);
    ctx.save(); rr(ctx, 0, 0, cw, ch, 44); ctx.clip(); ctx.fillStyle = C.coral; ctx.fillRect(0, 0, cw, 150); ctx.restore();
    ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(cw, 150); fs(ctx, null, C.ink, 8);
    rr(ctx, 0, 0, cw, ch, 44); fs(ctx, null, C.ink, 8);
    plainText(ctx, 'OUTUBRO', 54, 100, { size: 62, weight: 900, color: C.cream, ls: 3 });
    // argolas
    for (const x of [cw - 230, cw - 110]) { rr(ctx, x - 16, -44, 32, 96, 16); fs(ctx, C.ink, null, 0); }
    // grade de dias
    const gx = 40, gy = 190, colW = (cw - 80) / 7, rowH = 132;
    const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    days.forEach((d, i) => plainText(ctx, d, gx + colW * i + colW / 2, gy + 18, { size: 30, weight: 800, color: C.ink, align: 'center' }));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
      const a = p(t, 0.3 + (r * 7 + c) * 0.008, 0.5 + (r * 7 + c) * 0.008);
      ctx.globalAlpha = a * 0.45;
      plainText(ctx, String(r * 7 + c + 1), gx + colW * c + 12, gy + 70 + r * rowH, { size: 26, weight: 700, color: C.ink });
      ctx.globalAlpha = 1;
    }
    const BARS = [
      [0, 0, 3, C.coral], [0, 4, 3, C.teal],
      [1, 1, 4, C.sun], [1, 5, 2, C.violet],
      [2, 0, 2, C.teal], [2, 2, 3, C.coral], [2, 5, 2, C.ink],
      [3, 1, 3, C.violet], [3, 4, 3, C.sun],
    ];
    BARS.forEach(([r, c, len, col], k) => {
      const tb = 0.5 + k * 0.1;
      const q = E.outBack(p(t, tb, tb + 0.32), 1.6);
      if (q <= 0) return;
      const x = gx + colW * c + 8, y = gy + 82 + r * rowH, w = (colW * len - 16) * q, h = 64;
      rr(ctx, x + 7, y + 7, Math.max(w, h), h, h / 2); fs(ctx, C.ink, null, 0);
      rr(ctx, x, y, Math.max(w, h), h, h / 2); fs(ctx, col, C.ink, 5);
      circle(ctx, x + 32, y + 32, 15 * clamp(q)); fs(ctx, col === C.ink ? C.cream : C.white, C.ink, 4);
    });
    ctx.restore();

    // selo "sem conflito"
    const sp = E.outBack(p(t, 1.55, 1.85), 2.6);
    if (sp > 0) {
      ctx.save(); ctx.translate(860, 680); ctx.rotate(deg(12)); ctx.scale(sp, sp);
      icon(ctx, 'check', 0, 0, 190, { prog: E.outCubic(p(t, 1.7, 2.0)), colors: { a: C.teal, b: C.cream } });
      ctx.restore();
    }
    subline(ctx, t, ['Mapa de reservas', 'sem conflito de datas.'], 1500, C.cream);
  }

  // =====================================================================
  // CENA 3 — 02 CHECK-IN & CHECK-OUT (9.5–12.0)
  // =====================================================================
  const DOOR = { x: 540, y0: 690, w: 400, h: 640 };
  function sceneCheckin(ctx, t) {
    bg(ctx, C.coral);
    decor(ctx, t + 9, 22, C.coralLight, 12);
    featureHeader(ctx, t, '02', ['Check-in &', 'check-out'], { y0: 450, size: 138, color: C.cream, shadow: C.ink });

    const appear = E.outBack(p(t, 0.0, 0.45), 1.4);
    const open = E.inOutCubic(p(t, 1.05, 1.6));
    const { x, y0, w, h } = DOOR;
    const x0 = x - w / 2;
    ctx.save();
    ctx.translate(x, y0 + h); ctx.scale(appear, appear); ctx.translate(-x, -(y0 + h));
    // luz no chão
    if (open > 0) {
      ctx.beginPath(); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.lineTo(x0 + w + 200 * open, y0 + h + 150); ctx.lineTo(x0 - 200 * open, y0 + h + 150); ctx.closePath();
      ctx.fillStyle = `rgba(255,194,60,${0.55 * open})`; ctx.fill();
    }
    // batente (moldura)
    rr(ctx, x0 - 36 + 18, y0 - 36 + 18, w + 72, h + 36, 22); fs(ctx, C.ink, null, 0);
    rr(ctx, x0 - 36, y0 - 36, w + 72, h + 36, 22); fs(ctx, C.ink, C.ink, 6);
    // interior iluminado
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.fillStyle = C.sun; ctx.fill();
    // raios de luz
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(x, y0 + h * 0.4); ctx.rotate(t * 0.4 + (i * TAU) / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(500, -60); ctx.lineTo(500, 60); ctx.closePath(); ctx.fillStyle = C.sunLight; ctx.fill(); ctx.restore(); }
    icon(ctx, 'bed', x, y0 + h - 120, 230, { shadow: 0.05, shadowColor: C.sunDark, scale: lerp(0.8, 1, open) });
    ctx.restore();
    // folha da porta (abre em perspectiva)
    const th = open * deg(78);
    const map = (u, v) => [x0 + u * w * Math.cos(th), y0 + v * h + (v - 0.5) * h * 0.16 * u * Math.sin(th)];
    const quad = (u0, v0, u1, v1) => { const a = map(u0, v0), b = map(u1, v0), c = map(u1, v1), d = map(u0, v1); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); };
    quad(0, 0, 1, 1); fs(ctx, open > 0.02 ? lerp(0, 1, open) > 0.5 ? C.creamDark : C.cream : C.cream, C.ink, 8);
    quad(0.16, 0.08, 0.84, 0.42); fs(ctx, C.teal, C.ink, 6);
    quad(0.16, 0.52, 0.84, 0.88); fs(ctx, C.teal, C.ink, 6);
    // maçaneta + fechadura
    const kp = map(0.88, 0.47), kh = map(0.88, 0.53);
    ctx.save(); ctx.translate(kp[0], kp[1]); ctx.scale(Math.max(0.2, Math.cos(th)), 1); circle(ctx, 0, 0, 20); fs(ctx, C.sun, C.ink, 6); ctx.restore();
    ctx.save(); ctx.translate(kh[0], kh[1] + 10); ctx.scale(Math.max(0.2, Math.cos(th)), 1); circle(ctx, 0, -6, 9); fs(ctx, C.ink, null, 0); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(4, 18); ctx.lineTo(-4, 18); ctx.closePath(); fs(ctx, C.ink, null, 0); ctx.restore();
    ctx.restore();

    // chave: entra, gira, sai
    const KS = 210;
    const kIn = E.outExpo(p(t, 0.2, 0.7));
    const turn = E.inOutCubic(p(t, 0.75, 0.98));
    const kOut = E.inBack(p(t, 1.0, 1.2));
    if (t > 0.18 && kOut < 1) {
      const hole = [x0 + w * 0.88, y0 + h * 0.53 + 4];
      const kx = lerp(1300, hole[0] + 0.46 * KS * 0.95, kIn), ky = lerp(1100, hole[1], kIn);
      ctx.save(); ctx.translate(kx, ky); ctx.scale(1 - kOut, 1 - kOut);
      ctx.rotate(Math.PI + lerp(deg(-40), 0, kIn));
      ctx.scale(1, lerp(1, -1, turn) || 0.02);
      icon(ctx, 'key', 0, 0, KS, { shadow: 0 });
      ctx.restore();
    }

    // chips Entrada / Saída
    const chip = (cx, cy, rot, label, time, dir, col, tt) => {
      const s = E.outBack(p(t, tt, tt + 0.3), 2.2);
      if (s <= 0) return;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(deg(rot)); ctx.scale(s, s);
      const wch = 330, hch = 110;
      pill(ctx, -wch / 2, -hch / 2, wch, hch, col, { sd: 12, shadowColor: C.ink, lw: 6 });
      circle(ctx, -wch / 2 + 56, 0, 36); fs(ctx, C.ink, null, 0);
      ctx.save(); ctx.translate(-wch / 2 + 56, 0); ctx.scale(dir, 1);
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(13, 0); ctx.moveTo(2, -12); ctx.lineTo(14, 0); ctx.lineTo(2, 12); fs(ctx, null, C.cream, 7); ctx.restore();
      plainText(ctx, label, -wch / 2 + 108, -6, { size: 34, weight: 800, color: C.ink });
      plainText(ctx, time, -wch / 2 + 108, 34, { size: 34, weight: 700, color: C.ink });
      ctx.restore();
    };
    chip(205, 910, -7, 'Entrada', '14h00', 1, C.sun, 1.3);
    chip(850, 1180, 6, 'Saída', '12h00', -1, C.cream, 1.45);
    subline(ctx, t, ['Entradas e saídas', 'sob controle.'], 1500 + 40, C.cream, 0.6);
  }

  // =====================================================================
  // CENA 4 — 03 COMANDAS (12.0–14.5)
  // =====================================================================
  function sceneComandas(ctx, t) {
    bg(ctx, C.sun);
    decor(ctx, t + 12, 33, C.sunLight, 12);
    featureHeader(ctx, t, '03', ['Comandas'], { y0: 470, size: 168, color: C.ink, shadow: C.coral });

    const slotY = 640, pw = 560, px = 540 - pw / 2, finalL = 780;
    // fenda
    const se = E.outBack(p(t, 0, 0.35), 1.8);
    // papel "imprime" em degraus
    const L = finalL * E.outCubic(p(t, 0.25, 1.55)) + Math.sin(t * 60) * 2 * (t > 0.25 && t < 1.5 ? 1 : 0);
    if (L > 2) {
      const bottom = slotY + L;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(px, slotY); ctx.lineTo(px + pw, slotY); ctx.lineTo(px + pw, bottom - 16);
      const n = 10; for (let i = 0; i < n; i++) { const xx = px + pw - (i * pw) / n; ctx.lineTo(xx - pw / n / 2, bottom); ctx.lineTo(xx - pw / n, bottom - 16); }
      ctx.closePath();
      ctx.save(); ctx.translate(16, 16); ctx.fillStyle = C.ink; ctx.fill(); ctx.restore();
      fs(ctx, C.white, C.ink, 6);
      ctx.clip();
      const line = (y, label, val, k, ic) => {
        const a = clamp((L - y + 20) / 40);
        if (a <= 0) return;
        const yy = slotY + y;
        const sl = (1 - E.outCubic(a)) * -30;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(sl, 0);
        if (ic) icon(ctx, ic, px + 70, yy - 14, 56, { shadow: 0 });
        plainText(ctx, label, px + 116, yy, { size: 40, weight: 700, color: C.ink });
        plainText(ctx, val, px + pw - 50, yy, { size: 40, weight: 800, color: C.ink, align: 'right' });
        ctx.restore();
      };
      plainText(ctx, 'COMANDA #27', 540, slotY + 92, { size: 46, weight: 900, color: C.ink, align: 'center', ls: 2 });
      plainText(ctx, 'Quarto 04', 540, slotY + 140, { size: 34, weight: 700, color: C.ink, align: 'center' });
      const dash = (y) => { ctx.save(); ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(px + 40, slotY + y); ctx.lineTo(px + pw - 40, slotY + y); fs(ctx, null, C.ink, 4); ctx.restore(); };
      dash(180);
      line(250, 'Café', 'R$ 8', 0, 'cup');
      line(330, 'Suco', 'R$ 12', 1, 'glass');
      line(410, 'Porção', 'R$ 38', 2, 'bell');
      line(490, 'Água', 'R$ 6', 3, 'glass');
      dash(540);
      if (L > 600) {
        const a = clamp((L - 600) / 40);
        ctx.globalAlpha = a;
        plainText(ctx, 'TOTAL', px + 50, slotY + 625, { size: 50, weight: 900, color: C.ink });
        plainText(ctx, 'R$ 64', px + pw - 50, slotY + 625, { size: 50, weight: 900, color: C.coral, align: 'right' });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    // fenda por cima do papel
    ctx.save(); ctx.translate(540, slotY); ctx.scale(se, se);
    rr(ctx, -360 + 10, -40 + 10, 720, 64, 32); fs(ctx, C.deep, null, 0);
    rr(ctx, -360, -40, 720, 64, 32); fs(ctx, C.ink, C.ink, 4);
    rr(ctx, -300, -12, 600, 14, 7); fs(ctx, C.deep, null, 0);
    ctx.restore();

    // carimbo
    const st = p(t, 1.6, 1.78);
    if (st > 0) {
      const s = lerp(2.4, 1, E.outCubic(st));
      ctx.save(); ctx.translate(640, 1352); ctx.rotate(deg(-9)); ctx.scale(s, s); ctx.globalAlpha = clamp(st * 3);
      rr(ctx, -220, -62, 440, 124, 26); fs(ctx, 'rgba(31,200,169,0.12)', C.teal, 12);
      plainText(ctx, 'NA CONTA ✓', 0, 22, { size: 62, weight: 900, color: C.teal, align: 'center', ls: 2 });
      ctx.restore();
    }
    // ícones flutuantes de consumo
    icon(ctx, 'cup', 140, 900 + Math.sin(t * 3) * 10, 150, { scale: E.outBack(p(t, 0.5, 0.8), 2), rot: deg(-12 + Math.sin(t * 2) * 6) });
    icon(ctx, 'glass', 950, 1110 + Math.sin(t * 3 + 1) * 10, 150, { scale: E.outBack(p(t, 0.65, 0.95), 2), rot: deg(10 + Math.sin(t * 2 + 1) * 6) });
    subline(ctx, t, ['Cada consumo', 'na conta certa.'], 1540, C.ink, 0.7);
  }

  // =====================================================================
  // CENA 5 — 04 PAGAMENTOS (14.5–17.0)
  // =====================================================================
  const PAY_C = { x: 540, y: 1020 };
  function scenePagamentos(ctx, t) {
    bg(ctx, C.teal);
    decor(ctx, t + 14, 44, C.tealLight, 12);
    featureHeader(ctx, t, '04', ['Pagamentos'], { y0: 470, size: 148, color: C.cream, shadow: C.ink });

    const suck = E.inBack(p(t, 1.15, 1.45), 2);
    const place = (fx, fy, tx, ty, t0) => {
      const e = E.outBack(p(t, t0, t0 + 0.42), 1.5);
      const x = lerp(fx, tx, e), y = lerp(fy, ty, e);
      return [lerp(x, PAY_C.x, suck), lerp(y, PAY_C.y, suck), 1 - suck * 0.9, e];
    };
    if (suck < 1) {
      // cartão
      let [x, y, s, e] = place(-300, 820, 300, 860, 0.1);
      icon(ctx, 'card', x, y, 330, { rot: deg(lerp(-40, -10, e) + Math.sin(t * 3) * 3), scale: s, shadow: 0.05, shadowColor: C.ink });
      // pix (losango)
      [x, y, s, e] = place(1350, 820, 790, 870, 0.25);
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(deg(lerp(60, 8, e) + Math.sin(t * 3 + 1) * 3));
      ctx.save(); ctx.rotate(Math.PI / 4); rr(ctx, -95 + 14, -95 + 14, 190, 190, 40); fs(ctx, C.ink, null, 0); rr(ctx, -95, -95, 190, 190, 40); fs(ctx, C.violet, C.ink, 8); ctx.restore();
      plainText(ctx, 'Pix', 0, 22, { size: 66, weight: 900, color: C.cream, align: 'center' });
      ctx.restore();
      // cédula
      [x, y, s, e] = place(300, 2200, 320, 1230, 0.4);
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(deg(lerp(30, 6, e) + Math.sin(t * 3 + 2) * 3));
      rr(ctx, -170 + 14, -90 + 14, 340, 180, 22); fs(ctx, C.ink, null, 0);
      rr(ctx, -170, -90, 340, 180, 22); fs(ctx, C.cream, C.ink, 8);
      rr(ctx, -140, -62, 280, 124, 14); fs(ctx, null, C.teal, 6);
      circle(ctx, 0, 0, 46); fs(ctx, C.sun, C.ink, 6);
      plainText(ctx, 'R$', 0, 13, { size: 36, weight: 900, color: C.ink, align: 'center' });
      ctx.restore();
      // moedas caindo
      for (let i = 0; i < 3; i++) {
        const t0 = 0.5 + i * 0.1;
        const e2 = E.outBounce(p(t, t0, t0 + 0.55));
        const tx = 720 + i * 95, ty = 1250 - i * 30;
        let cx = tx, cy = lerp(-200, ty, e2);
        cx = lerp(cx, PAY_C.x, suck); cy = lerp(cy, PAY_C.y, suck);
        if (t > t0) icon(ctx, 'coin', cx, cy, 150, { scale: 1 - suck * 0.9, rot: deg(i * 15 - 15), shadowColor: C.ink });
      }
    }
    // check central
    const cp = E.outBack(p(t, 1.38, 1.65), 2.2);
    const fadeC = 1;
    if (cp > 0 && fadeC) {
      // raios
      const rp = p(t, 1.45, 1.9);
      if (rp > 0 && rp < 1) {
        ctx.save(); ctx.translate(PAY_C.x, PAY_C.y);
        for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); const r0 = 260 + E.outCubic(rp) * 120, r1 = r0 + 90 * (1 - rp); ctx.beginPath(); ctx.moveTo(r0, 0); ctx.lineTo(r1, 0); fs(ctx, null, i % 2 ? C.sun : C.cream, 16); }
        ctx.restore();
      }
      ctx.save(); ctx.translate(PAY_C.x, PAY_C.y); ctx.scale(cp, cp);
      circle(ctx, 16, 16, 230); fs(ctx, C.deep, null, 0);
      circle(ctx, 0, 0, 230); fs(ctx, C.ink, C.ink, 8);
      ctx.scale(380, 380); checkPath(ctx, E.outCubic(p(t, 1.5, 1.8)), 0.95); fs(ctx, null, C.teal, 0.1);
      ctx.restore();
      rise(ctx, 'PAGO!', 540, 1370, p(t, 1.7, 2.0), { size: 92, weight: 900, color: C.ink, align: 'center', ls: 6 });
    }
    subline(ctx, t, ['Pix, cartão ou dinheiro,', 'tudo registrado.'], 1520, C.ink, 0.65);
  }

  // =====================================================================
  // CENA 6 — 05 CONTROLE DE CAIXA (17.0–19.5)
  // =====================================================================
  function stackCoin(ctx, x, y, a = 1) {
    const w = 138, h = 46, th = 20;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.ellipse(x, y + th, w / 2, h / 2, 0, 0, Math.PI); ctx.lineTo(x - w / 2, y); ctx.ellipse(x, y, w / 2, h / 2, 0, Math.PI, 0, true); ctx.closePath();
    fs(ctx, C.sunDark, C.deep, 5);
    ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); fs(ctx, C.sun, C.deep, 5);
    ctx.beginPath(); ctx.ellipse(x, y, w / 2 - 18, h / 2 - 7, 0, 0, TAU); fs(ctx, null, C.sunDark, 4);
    ctx.restore();
  }
  function sceneCaixa(ctx, t) {
    bg(ctx, C.ink);
    dotGrid(ctx, t + 17, C.cream, 0.05);
    decor(ctx, t + 17, 55, C.inkLight, 10);
    featureHeader(ctx, t, '05', ['Controle', 'de caixa'], { y0: 440, size: 150, color: C.cream, shadow: C.coral, pill: { fill: C.cream, fg: C.ink } });

    // contador
    const cnt = E.outCubic(p(t, 0.35, 1.75));
    const val = Math.round(12480 * cnt);
    const str = val.toLocaleString('pt-BR');
    const ce = E.outBack(p(t, 0.25, 0.55), 1.8);
    if (ce > 0) {
      ctx.save(); ctx.translate(540, 870); ctx.scale(ce, ce);
      plainText(ctx, 'Saldo do dia', 0, -128, { size: 42, weight: 700, color: C.cream, align: 'center' });
      const wNum = textW(ctx, str + ',00', 128, 900, -2), wRs = textW(ctx, 'R$ ', 64, 900);
      const left = -(wNum + wRs) / 2;
      plainText(ctx, 'R$ ', left, 0, { size: 64, weight: 900, color: C.sun });
      plainText(ctx, str + ',00', left + wRs, 0, { size: 128, weight: 900, color: C.sun, shadow: C.coral, sdx: 7, sdy: 7, ls: -2 });
      ctx.restore();
    }
    // pilhas de moedas
    const HEIGHTS = [4, 7, 5, 9, 12];
    let k = 0;
    const baseY = 1340;
    // sombra/chão
    ctx.beginPath(); ctx.ellipse(540, baseY + 44, 420 * E.outCubic(p(t, 0.1, 0.5)), 26, 0, 0, TAU); fs(ctx, C.deep, null, 0);
    for (let s = 0; s < HEIGHTS.length; s++) {
      const sx = 220 + s * 160;
      for (let c = 0; c < HEIGHTS[s]; c++) {
        const t0 = 0.3 + (c * 5 + s) * 0.032;
        const q = p(t, t0, t0 + 0.28);
        if (q <= 0) { k++; continue; }
        const ty = baseY - c * 22;
        const y = lerp(ty - 520, ty, E.outBounce(q));
        stackCoin(ctx, sx, y, clamp(q * 4));
        k++;
      }
    }
    // selo caixa fechado
    const sp = E.outBack(p(t, 1.8, 2.1), 2.4);
    if (sp > 0) {
      ctx.save(); ctx.translate(540, 990); ctx.rotate(deg(-4)); ctx.scale(sp, sp);
      pill(ctx, -230, -48, 460, 96, C.teal, { sd: 10, shadowColor: C.deep, lw: 6, line: C.deep });
      plainText(ctx, 'Caixa fechado ✓', 0, 16, { size: 46, weight: 900, color: C.ink, align: 'center' });
      ctx.restore();
    }
    subline(ctx, t, ['Feche o dia', 'sem susto.'], 1530, C.cream, 0.7);
  }

  // =====================================================================
  // CENA 7 — FINAL (19.5–28): tudo em um só lugar → logo → CTA
  // =====================================================================
  const ORBIT = [
    { n: 'calendar', c: C.violet }, { n: 'key', c: C.coral }, { n: 'receipt', c: C.sun },
    { n: 'card', c: C.teal }, { n: 'coin', c: C.ink },
  ];
  const CONF = (() => {
    const r = rng(777), arr = [];
    const cols = [C.coral, C.sun, C.teal, C.violet, C.pink, C.ink];
    for (let i = 0; i < 46; i++) {
      const a = r() * TAU, v = 700 + r() * 1300;
      arr.push({ vx: Math.cos(a) * v, vy: Math.sin(a) * v - 500, rot: r() * TAU, w: (r() - 0.5) * 14, s: 14 + r() * 22, type: Math.floor(r() * 3), c: cols[i % cols.length] });
    }
    return arr;
  })();
  function sceneFinal(ctx, t) {
    bg(ctx, C.cream);
    const O = { x: 540, y: 1060 };
    // sunburst atrás
    const sb = E.outCubic(p(t, 2.0, 2.6));
    if (sb > 0) {
      const my = lerp(O.y, 640, E.inOutCubic(p(t, 3.1, 3.7)));
      ctx.save(); ctx.translate(540, my); ctx.rotate(t * 0.15); ctx.scale(sb, sb);
      ctx.fillStyle = C.creamDark;
      for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1500, (i * TAU) / 18, (i * TAU) / 18 + TAU / 36); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    decor(ctx, t + 19.5, 66, C.creamDark, 12, 1);

    // texto "Tudo em um só lugar."
    const to = p(t, 3.05, 3.35);
    rise(ctx, 'Tudo em', 540, 400, p(t, 0.05, 0.5), { size: 128, weight: 900, color: C.ink, align: 'center', out: to });
    rise(ctx, 'um só lugar.', 540, 530, p(t, 0.18, 0.65), { size: 128, weight: 900, color: C.coral, align: 'center', shadow: C.ink, sdx: 7, sdy: 7, out: to, ls: -2 });

    // órbita
    const merge = 2.0;
    if (t < merge + 0.05) {
      const items = ORBIT.map((it, i) => {
        const pop = E.outBack(p(t, 0.1 + i * 0.08, 0.45 + i * 0.08), 2);
        const ang = (i / ORBIT.length) * TAU + t * 1.2 + Math.pow(p(t, 0.8, merge), 2.2) * 9;
        const shrink = E.inBack(p(t, 1.25, merge), 1.4);
        const R = 360 * (1 - shrink);
        const x = O.x + Math.cos(ang) * R, y = O.y + Math.sin(ang) * R * 0.62;
        const depth = 0.82 + 0.18 * Math.sin(ang);
        return { it, x, y, s: pop * depth * lerp(1, 0.3, shrink), z: Math.sin(ang) };
      });
      // traço de órbita
      ctx.save(); ctx.globalAlpha = 0.35 * (1 - p(t, 1.3, 1.9)) * p(t, 0.1, 0.4);
      ctx.setLineDash([6, 22]); ctx.beginPath(); ctx.ellipse(O.x, O.y, 360, 360 * 0.62, 0, 0, TAU); fs(ctx, null, C.ink, 6); ctx.restore();
      const drawItem = (d) => { tile(ctx, d.x, d.y, 190, d.it.c, { scale: d.s, shadowColor: C.ink }); icon(ctx, d.it.n, d.x, d.y, 118, { scale: d.s, shadow: 0, colors: d.it.n === 'coin' ? {} : {} }); };
      items.filter((d) => d.z < 0).forEach(drawItem);
      mark(ctx, O.x, O.y, 210, { scale: E.outBack(p(t, 0.2, 0.55), 2) * (1 + 0.05 * Math.sin(t * 8)), check: 1 });
      items.filter((d) => d.z >= 0).forEach(drawItem);
    }

    // explosão no merge
    if (t >= merge) {
      const q = p(t, merge, merge + 0.8);
      if (q < 1) {
        [C.sun, C.coral, C.teal].forEach((c, i) => { const qq = E.outCubic(clamp(q * 1.2 - i * 0.12)); if (qq > 0 && qq < 1) { circle(ctx, O.x, O.y, 140 + qq * (700 + i * 250)); fs(ctx, null, c, 50 * (1 - qq)); } });
      }
      const ct = t - merge;
      if (ct < 2.6) {
        CONF.forEach((c) => {
          const x = O.x + c.vx * ct * Math.exp(-ct * 1.4), y = O.y + c.vy * ct * Math.exp(-ct * 1.4) + 260 * ct * ct;
          const a = 1 - p(ct, 1.8, 2.6);
          ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(c.rot + c.w * ct); ctx.fillStyle = c.c;
          if (c.type === 0) { circle(ctx, 0, 0, c.s * 0.5); ctx.fill(); }
          else if (c.type === 1) { ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2); }
          else { ctx.beginPath(); ctx.moveTo(0, -c.s / 2); ctx.lineTo(c.s / 2, c.s / 2); ctx.lineTo(-c.s / 2, c.s / 2); ctx.closePath(); ctx.fill(); }
          ctx.restore();
        });
      }
      // marca: pulso e sobe para o lockup
      const mv = E.inOutCubic(p(t, 3.1, 3.7));
      const pulse = 1 + 0.35 * E.outElastic(p(t, merge, merge + 0.9)) - 0.35 * p(t, merge + 0.9, 3.1) * 0;
      const size = lerp(210 * 1.35, 300, mv);
      const my = lerp(O.y, 640, mv);
      const breathe = 1 + Math.sin((t - 4) * 3) * 0.02 * p(t, 4, 4.5);
      // "carimbo" final: a marca quica, o check se redesenha e solta uma onda
      const bump = Math.sin(p(t, 6.0, 6.4) * Math.PI) * 0.14;
      const rq = p(t, 6.0, 6.8);
      if (rq > 0 && rq < 1) { circle(ctx, 540, 640, 170 + E.outCubic(rq) * 520); fs(ctx, null, C.coral, 22 * (1 - rq)); }
      const chk = t >= 6.0 && t < 6.45 ? E.outCubic(p(t, 6.08, 6.4)) : 1;
      mark(ctx, 540, my, size, { scale: lerp(pulse / 1.35, 1, mv) * breathe * (1 + bump), check: chk, rot: deg(Math.sin(p(t, 6.0, 6.5) * Math.PI * 2) * 4) });
    }

    // lockup
    const L0 = 3.5;
    if (t >= L0 - 0.05) {
      const word = 'FAZLO', size = 236;
      setText(ctx, size, 900, 'left', -4);
      const wTot = ctx.measureText(word).width;
      let left = 540 - wTot / 2;
      for (let i = 0; i < word.length; i++) {
        const pre = ctx.measureText(word.slice(0, i)).width;
        const q = p(t, L0 + i * 0.07, L0 + 0.45 + i * 0.07);
        if (q <= 0) continue;
        const e = E.outBack(q, 2.2);
        setText(ctx, size, 900, 'left', -4);
        const cw = ctx.measureText(word[i]).width;
        ctx.save(); ctx.translate(left + pre + cw / 2, 1060); ctx.scale(1, lerp(0.4, 1, e)); ctx.translate(0, (1 - e) * -160);
        ctx.globalAlpha = clamp(q * 3);
        plainText(ctx, word[i], -cw / 2, 0, { size, weight: 900, color: C.ink, shadow: C.coral, sdx: 11, sdy: 11, ls: -4 });
        ctx.restore();
      }
      // pílula "Hospeda"
      const hp = E.outBack(p(t, L0 + 0.4, L0 + 0.75), 1.8);
      if (hp > 0) {
        const pw = 470, ph = 112;
        ctx.save(); ctx.translate(540, 1170);
        ctx.scale(hp, 1);
        pill(ctx, -pw / 2, -ph / 2, pw, ph, C.coral, { sd: 10, shadowColor: C.ink, lw: 6 });
        ctx.restore();
        rise(ctx, 'Hospeda', 540, 1198, p(t, L0 + 0.55, L0 + 0.95), { size: 78, weight: 800, color: C.cream, align: 'center', ls: 3 });
      }
      rise(ctx, 'Sua pousada em ordem.', 540, 1340, p(t, L0 + 0.8, L0 + 1.25), { size: 66, weight: 800, color: C.ink, align: 'center' });
      // CTA
      const cp = E.outBack(p(t, L0 + 1.15, L0 + 1.5), 2.4);
      if (cp > 0) {
        const pulse = 1 + Math.sin((t - L0 - 1.5) * 5) * 0.03 * p(t, L0 + 1.6, L0 + 1.9);
        const cw = 730, chh = 112;
        ctx.save(); ctx.translate(540, 1460); ctx.scale(cp * pulse, cp * pulse);
        pill(ctx, -cw / 2, -chh / 2, cw, chh, C.ink, { sd: 10, shadowColor: C.coral, lw: 0 });
        plainText(ctx, 'Saiba mais no link da bio', -cw / 2 + 50, 15, { size: 44, weight: 800, color: C.cream });
        const ax = cw / 2 - 62 + Math.sin(t * 8) * 6;
        circle(ctx, cw / 2 - 58, 0, 38); fs(ctx, C.sun, null, 0);
        ctx.beginPath(); ctx.moveTo(ax - 18, 0); ctx.lineTo(ax + 12, 0); ctx.moveTo(ax, -12); ctx.lineTo(ax + 13, 0); ctx.lineTo(ax, 12); fs(ctx, null, C.ink, 7);
        ctx.restore();
      }
    }
    // fade final para o loop
    if (t > 8.1) { ctx.fillStyle = C.cream; ctx.globalAlpha = E.inCubic(p(t, 8.1, 8.5)) * 0; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  // =====================================================================
  // Linha do tempo + transições
  // =====================================================================
  const SCENES = [
    { fn: sceneIntro, start: 0, end: 7.0 },
    { fn: sceneReservas, start: 7.0, end: 9.5 },
    { fn: sceneCheckin, start: 9.5, end: 12.0 },
    { fn: sceneComandas, start: 12.0, end: 14.5 },
    { fn: scenePagamentos, start: 14.5, end: 17.0 },
    { fn: sceneCaixa, start: 17.0, end: 19.5 },
    { fn: sceneFinal, start: 19.5, end: DURATION },
  ];
  const TRANS = [
    { a: 1, b: 2, t0: 9.22, t1: 9.55, type: 'push' },
    { a: 2, b: 3, t0: 11.55, t1: 12.0, type: 'circle', cx: 540, cy: 1010, r0: 0, ring: C.cream },
    { a: 3, b: 4, t0: 14.15, t1: 14.6, type: 'bands', colors: [C.coral, C.violet, C.ink] },
    { a: 4, b: 5, t0: 16.68, t1: 17.0, type: 'circle', cx: PAY_C.x, cy: PAY_C.y, r0: 236, ease: E.inCubic },
    { a: 5, b: 6, t0: 19.1, t1: 19.55, type: 'bands', colors: [C.coral, C.sun, C.teal] },
  ];

  let bufA, bufB;
  function buffers() {
    if (!bufA) {
      const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      bufA = mk(); bufB = mk();
    }
  }
  function drawScene(ctx, idx, T) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    SCENES[idx].fn(ctx, T - SCENES[idx].start);
    ctx.restore();
  }

  function renderAt(ctx, T) {
    T = clamp(T, 0, DURATION - 1e-6);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const tr = TRANS.find((x) => T >= x.t0 && T < x.t1);
    if (!tr) {
      let idx = SCENES.findIndex((s) => T >= s.start && T < s.end);
      if (idx < 0) idx = SCENES.length - 1;
      drawScene(ctx, idx, T);
      return;
    }
    buffers();
    const ca = bufA.getContext('2d'), cb = bufB.getContext('2d');
    drawScene(ca, tr.a, T); drawScene(cb, tr.b, T);
    const q = p(T, tr.t0, tr.t1);
    if (tr.type === 'push') {
      const e = E.inOutCubic(q);
      ctx.drawImage(bufA, 0, -H * e);
      ctx.drawImage(bufB, 0, H * (1 - e));
      // barra de cor na emenda
      ctx.fillStyle = C.ink; ctx.fillRect(0, H * (1 - e) - 18, W, 18);
    } else if (tr.type === 'circle') {
      const e = (tr.ease || E.inCubic)(q);
      ctx.drawImage(bufA, 0, 0);
      const r = lerp(tr.r0, 2300, e);
      ctx.save(); circle(ctx, tr.cx, tr.cy, r); ctx.clip(); ctx.drawImage(bufB, 0, 0); ctx.restore();
      if (tr.ring) { circle(ctx, tr.cx, tr.cy, r); fs(ctx, null, tr.ring, 26 * (1 - q)); }
    } else if (tr.type === 'bands') {
      ctx.drawImage(bufA, 0, 0);
      const N = 6, ang = deg(-18), L = 1500, bh = 2600 / N;
      ctx.save(); ctx.translate(540, 960); ctx.rotate(ang);
      for (let i = 0; i < N; i++) {
        const st = i * 0.06;
        const lead = E.inOutCubic(p(q, st, st + 0.6));
        const rev = E.inOutCubic(p(q, st + 0.22, Math.min(1, st + 0.8)));
        const y = -1300 + i * bh;
        const xl = lerp(-L, L, lead), xr = lerp(-L, L, rev);
        ctx.fillStyle = tr.colors[i % tr.colors.length];
        ctx.fillRect(-L, y - 1, xl + L, bh + 2);
        if (rev > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(-L, y - 1, xr + L, bh + 2); ctx.clip();
          ctx.rotate(-ang); ctx.translate(-540, -960); ctx.drawImage(bufB, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  window.FAZLO = { W, H, DURATION, renderAt, SCENES, TRANS };
})();
