/* =====================================================================
   FAZLO Hospeda — Reels v2 "O ciclo da estadia" — 9:16 (1080x1920)
   Motor de animação em Canvas 2D, determinístico: renderAt(ctx, t)
   desenha o quadro exato do instante t (segundos). O mesmo código serve
   o preview em tempo real e o render quadro a quadro (scripts/render.cjs).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920, DURATION = 29;
  const DISPLAY = "'V2 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'V2 Mono', 'JetBrains Mono', monospace";

  // ---------------------------------------------------------------- identidade
  // Preto + verde-limão da logo, branco, e as cores de status do próprio produto
  // (legenda operacional do calendário de ocupação).
  const C = {
    black: '#0A0A0A', black2: '#111111', panel: '#161616', line: '#242424', line2: '#3A3A3A',
    lime: '#AFFA27', limeD: '#8CD10C',
    white: '#FFFFFF', paper: '#F2F2EC', paper2: '#E2E2DA', ink: '#0A0A0A',
    gray: '#8E8E88', grayD: '#5E5E59', grayL: '#B9B9B1',
    livre: '#4CC067', pre: '#FF8A1F', checkin: '#3D8BFF', checkout: '#F5B638', bloq: '#2E2E2E',
    in: '#3CCB6E', out: '#FF4D5E',
  };
  const ST = {
    LIVRE: { label: 'LIVRE', fill: C.livre, text: C.ink, dot: C.ink },
    PRE: { label: 'PRÉ-RESERVA', fill: C.pre, text: C.ink, dot: C.ink },
    CONF: { label: 'CONFIRMADA', fill: C.lime, text: C.ink, dot: C.ink },
    CHECKIN: { label: 'CHECK-IN', fill: C.checkin, text: C.ink, dot: C.ink },
    HOSP: { label: 'HOSPEDADA', fill: C.black, text: C.lime, dot: C.lime, border: C.lime, hollow: true },
    CHECKOUT: { label: 'CHECK-OUT', fill: C.checkout, text: C.ink, dot: C.ink },
    BLOQ: { label: 'BLOQUEADA', fill: C.bloq, text: '#CFCFC8', dot: '#8A8A85' },
  };

  // ---------------------------------------------------------------- utilitários
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const deg = (d) => (d * Math.PI) / 180;
  const E = {
    lin: (x) => x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    inQuart: (x) => x * x * x * x,
    inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inOutExpo: (x) => x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
    inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
  };
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b); t = clamp(t);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  }
  function rgba(c, a) { const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
  // pseudo-aleatório determinístico
  function hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  // impulso que decai: 1 no instante t0, ~0 depois de "dur"
  const kick = (t, t0, dur = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / dur) * 4));

  function brl(v, sign = '') {
    const c = Math.round(Math.abs(v) * 100);
    const int = Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${sign}R$ ${int},${String(c % 100).padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------- primitivas
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function stroke(ctx, color, lw) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
  function fill(ctx, color) { ctx.fillStyle = color; ctx.fill(); }
  function glow(ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  function noGlow(ctx) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }

  // ---------------------------------------------------------------- tipografia
  function setFont(ctx, fam, size, weight, align = 'left', ls = 0) {
    ctx.font = `${weight} ${size}px ${fam}`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = ls + 'px';
  }
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, 'left', ls); return ctx.measureText(s).width; }
  function txt(ctx, s, x, y, o) {
    setFont(ctx, o.fam || MONO, o.size, o.weight || 800, o.align || 'left', o.ls || 0);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.fillStyle = o.color;
    ctx.fillText(s, x, y);
    ctx.restore();
  }
  /** Texto mono que "digita" com 2 caracteres embaralhados na frente. */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$+';
  function typeText(ctx, s, x, y, u, o) {
    if (u <= 0) return;
    const n = s.length, shown = Math.floor(clamp(u) * (n + 2));
    let out = '';
    for (let i = 0; i < Math.min(n, shown); i++) {
      if (i >= shown - 2 && u < 1 && s[i] !== ' ') out += GLYPHS[Math.floor(hash(i, Math.floor(u * 40)) * GLYPHS.length)];
      else out += s[i];
    }
    txt(ctx, out, x, y, o);
  }
  /** Linha de título com máscara: sobe por trás de uma linha invisível. segs: [{s, color, hl}] */
  function riseLine(ctx, segs, x, y, pin, pout, o) {
    if (pin <= 0 || pout >= 1) return;
    const fam = o.fam || DISPLAY, size = o.size, weight = o.weight || 900, ls = o.ls ?? -size * 0.025;
    const ws = segs.map((s) => tw(ctx, s.s, fam, size, weight, ls));
    const total = ws.reduce((a, b) => a + b, 0);
    const left = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    const off = (1 - E.outExpo(clamp(pin))) * size * 1.3 - E.inCubic(clamp(pout)) * size * 1.3;
    ctx.save();
    ctx.beginPath(); ctx.rect(left - 60, y - size * 1.02, total + 120, size * 1.34); ctx.clip();
    let cx = left;
    segs.forEach((s, i) => {
      if (s.hl) {
        const hp = E.inOutCubic(clamp(o.hl ?? 1));
        if (hp > 0) { ctx.fillStyle = s.hl; ctx.fillRect(cx - size * 0.07, y + off - size * 0.78, (ws[i] + size * 0.06) * hp, size * 0.96); }
      }
      cx += ws[i];
    });
    setFont(ctx, fam, size, weight, 'left', ls);
    cx = left;
    segs.forEach((s, i) => { ctx.fillStyle = s.color || o.color; ctx.fillText(s.s, cx, y + off); cx += ws[i]; });
    ctx.restore();
  }
  /** Título de 1–3 linhas, com tamanho ajustado à largura disponível. */
  function headline(ctx, lt, lines, o) {
    const maxW = o.maxW || 920, base = o.size || 108;
    let size = base;
    for (const segs of lines) {
      const w = segs.reduce((a, s) => a + tw(ctx, s.s, DISPLAY, base, 900, -base * 0.025), 0);
      size = Math.min(size, (base * maxW) / w);
    }
    const lh = size * (o.lh || 1.04);
    lines.forEach((segs, i) => {
      const tin = o.tin + i * (o.stagger ?? 0.09);
      riseLine(ctx, segs, o.x, o.y + i * lh, p(lt, tin, tin + 0.55), o.tout !== undefined ? p(lt, o.tout + i * 0.05, o.tout + i * 0.05 + 0.3) : 0,
        { size, color: o.color, align: o.align, hl: o.hlAt !== undefined ? p(lt, o.hlAt, o.hlAt + 0.35) : 1 });
    });
    return size;
  }
  /** Dígitos que rolam até o valor final (fonte mono = larguras iguais). */
  function rollText(ctx, s, x, y, u, o) {
    const size = o.size, cw = tw(ctx, '0', MONO, size, o.weight || 800, o.ls || 0);
    const adv = (ch) => (ch === ':' || ch === ',' || ch === '.' ? cw * 0.55 : cw); // pontuação mais estreita
    const total = [...s].reduce((a, ch) => a + adv(ch), 0);
    let left = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    ctx.save();
    ctx.beginPath(); ctx.rect(left - 10, y - size * 0.92, total + 20, size * 1.1); ctx.clip();
    setFont(ctx, MONO, size, o.weight || 800, 'center', 0);
    ctx.fillStyle = o.color;
    let pen = left;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], cx = pen + adv(ch) / 2;
      pen += adv(ch);
      const d = '0123456789'.indexOf(ch);
      if (d < 0) { ctx.globalAlpha = clamp(u * 3); ctx.fillText(ch, cx, y); ctx.globalAlpha = 1; continue; }
      const ui = E.outCubic(clamp((u - i * 0.06) / 0.7));
      const pos = (d + 20) * ui; // passa por 2 voltas completas e para no dígito
      const k = Math.floor(pos), f = pos - k;
      const step = size * 1.05;
      ctx.fillText(String(k % 10), cx, y - f * step);
      ctx.fillText(String((k + 1) % 10), cx, y + (1 - f) * step);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- etiquetas de status
  function pillWidth(ctx, label, h, fs) {
    return h * 0.42 + h * 0.26 + h * 0.2 + tw(ctx, label, MONO, fs, 800, fs * 0.06) + h * 0.45;
  }
  function statusPill(ctx, x, y, st, o = {}) {
    const h = o.h || 64, fs = o.fs || h * 0.4, sc = o.scale ?? 1, alpha = o.alpha ?? 1;
    if (sc <= 0.001 || alpha <= 0.001) return 0;
    const label = o.label || st.label;
    const w = pillWidth(ctx, label, h, fs);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.scale(sc, sc);
    const x0 = o.align === 'left' ? 0 : -w / 2;
    rr(ctx, x0, -h / 2, w, h, h / 2); fill(ctx, st.fill);
    if (st.border) { rr(ctx, x0, -h / 2, w, h, h / 2); stroke(ctx, st.border, Math.max(3, h * 0.06)); }
    else if (o.outline) { rr(ctx, x0, -h / 2, w, h, h / 2); stroke(ctx, o.outline, Math.max(3, h * 0.05)); }
    const dx = x0 + h * 0.42 + h * 0.13;
    circle(ctx, dx, 0, h * 0.13);
    if (st.hollow) stroke(ctx, st.dot, h * 0.05); else fill(ctx, st.dot);
    txt(ctx, label, dx + h * 0.13 + h * 0.2, fs * 0.36, { size: fs, weight: 800, color: st.text, ls: fs * 0.06 });
    ctx.restore();
    return w;
  }
  /** Chip mono contornado (ex.: PIX, CPF). */
  function chip(ctx, x, y, label, o) {
    const h = o.h || 58, fs = o.fs || 24, sc = o.scale ?? 1;
    if (sc <= 0.001) return 0;
    const w = tw(ctx, label, MONO, fs, 800, 2) + h * 0.9 + (o.dot ? h * 0.35 : 0);
    ctx.save();
    ctx.translate(x, y); ctx.scale(sc, sc);
    const x0 = o.align === 'left' ? 0 : -w / 2;
    rr(ctx, x0, -h / 2, w, h, h / 2);
    if (o.fill) fill(ctx, o.fill);
    stroke(ctx, o.line, 3);
    let tx = x0 + h * 0.45;
    if (o.dot) { circle(ctx, tx + h * 0.08, 0, h * 0.1); fill(ctx, o.dot); tx += h * 0.35; }
    txt(ctx, label, tx, fs * 0.36, { size: fs, weight: 800, color: o.color, ls: 2 });
    ctx.restore();
    return w;
  }

  // ---------------------------------------------------------------- ícones (traço contínuo)
  // Desenhados numa caixa unitária (-0.5..0.5). k = {line, accent}.
  const ICONS = {
    bottle(ctx, k) {
      ctx.beginPath(); ctx.rect(-0.19, -0.02, 0.38, 0.2); fill(ctx, k.accent);
      ctx.beginPath();
      ctx.moveTo(-0.07, -0.42); ctx.lineTo(0.07, -0.42); ctx.lineTo(0.07, -0.32);
      ctx.bezierCurveTo(0.07, -0.26, 0.19, -0.24, 0.19, -0.12); ctx.lineTo(0.19, 0.4);
      ctx.quadraticCurveTo(0.19, 0.46, 0.12, 0.46); ctx.lineTo(-0.12, 0.46); ctx.quadraticCurveTo(-0.19, 0.46, -0.19, 0.4);
      ctx.lineTo(-0.19, -0.12); ctx.bezierCurveTo(-0.19, -0.24, -0.07, -0.26, -0.07, -0.32); ctx.closePath();
      stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.1, -0.48); ctx.lineTo(0.1, -0.48); stroke(ctx, k.line, k.lw);
    },
    cup(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.3, -0.06); ctx.lineTo(0.2, -0.06); ctx.lineTo(0.17, 0.27);
      ctx.quadraticCurveTo(0.16, 0.34, 0.09, 0.34); ctx.lineTo(-0.19, 0.34); ctx.quadraticCurveTo(-0.26, 0.34, -0.27, 0.27); ctx.closePath();
      stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.arc(0.24, 0.1, 0.1, -Math.PI / 2, Math.PI / 2); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.42, 0.45); ctx.lineTo(0.36, 0.45); stroke(ctx, k.line, k.lw);
      ctx.beginPath();
      for (const x of [-0.17, 0.0]) { ctx.moveTo(x, -0.16); ctx.bezierCurveTo(x - 0.08, -0.24, x + 0.08, -0.32, x, -0.42); }
      stroke(ctx, k.accent, k.lw);
    },
    plate(ctx, k) {
      for (const [x, y, r] of [[-0.2, 0.12, -0.15], [0.17, 0.1, 0.18], [0, -0.06, 0]]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r);
        ctx.beginPath(); ctx.arc(0, 0.06, 0.2, Math.PI, 0); ctx.closePath(); fill(ctx, k.accent); stroke(ctx, k.line, k.lw);
        ctx.beginPath();
        for (let i = 1; i < 6; i++) { const a = Math.PI + (i / 6) * Math.PI; ctx.moveTo(Math.cos(a) * 0.2, 0.06 + Math.sin(a) * 0.2); ctx.lineTo(Math.cos(a) * 0.15, 0.06 + Math.sin(a) * 0.15); }
        stroke(ctx, k.ink || k.line, k.lw * 0.6);
        ctx.restore();
      }
      ctx.beginPath(); ctx.ellipse(0, 0.28, 0.47, 0.12, 0, 0, Math.PI); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.47, 0.28); ctx.lineTo(0.47, 0.28); stroke(ctx, k.line, k.lw);
    },
    mountain(ctx, k) {
      circle(ctx, 0.27, -0.3, 0.09); fill(ctx, k.accent);
      ctx.beginPath(); ctx.moveTo(-0.47, 0.36); ctx.lineTo(-0.1, -0.24); ctx.lineTo(0.27, 0.36); ctx.closePath(); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(0.08, 0.06); ctx.lineTo(0.24, -0.14); ctx.lineTo(0.47, 0.36); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.22, -0.05); ctx.lineTo(-0.1, -0.24); ctx.lineTo(0.02, -0.05); ctx.lineTo(-0.04, -0.09); ctx.lineTo(-0.1, -0.03); ctx.lineTo(-0.16, -0.09); ctx.closePath();
      fill(ctx, k.accent);
      ctx.beginPath(); ctx.moveTo(-0.5, 0.36); ctx.lineTo(0.5, 0.36); stroke(ctx, k.line, k.lw);
    },
    key(ctx, k) {
      circle(ctx, -0.24, 0, 0.17); stroke(ctx, k.line, k.lw);
      circle(ctx, -0.24, 0, 0.05); fill(ctx, k.accent);
      ctx.beginPath(); ctx.moveTo(-0.07, 0); ctx.lineTo(0.45, 0); ctx.moveTo(0.3, 0); ctx.lineTo(0.3, 0.14); ctx.moveTo(0.41, 0); ctx.lineTo(0.41, 0.1);
      stroke(ctx, k.line, k.lw);
    },
    person(ctx, k) {
      circle(ctx, 0, -0.16, 0.16); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.32, 0.42); ctx.bezierCurveTo(-0.32, 0.12, -0.16, 0.06, 0, 0.06); ctx.bezierCurveTo(0.16, 0.06, 0.32, 0.12, 0.32, 0.42);
      stroke(ctx, k.line, k.lw);
    },
    suitcase(ctx, k) {
      rr(ctx, -0.13, -0.4, 0.26, 0.16, 0.05); stroke(ctx, k.line, k.lw);
      rr(ctx, -0.4, -0.24, 0.8, 0.6, 0.08); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.rect(-0.4, 0.0, 0.8, 0.1); fill(ctx, k.accent);
      rr(ctx, -0.4, -0.24, 0.8, 0.6, 0.08); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.26, 0.36); ctx.lineTo(-0.26, 0.44); ctx.moveTo(0.26, 0.36); ctx.lineTo(0.26, 0.44); stroke(ctx, k.line, k.lw);
    },
    search(ctx, k) {
      circle(ctx, -0.08, -0.08, 0.27); stroke(ctx, k.line, k.lw * 1.2);
      ctx.beginPath(); ctx.moveTo(0.12, 0.12); ctx.lineTo(0.4, 0.4); stroke(ctx, k.line, k.lw * 1.6);
    },
    coin(ctx, k) {
      circle(ctx, 0, 0, 0.44); stroke(ctx, k.line, k.lw);
      circle(ctx, 0, 0, 0.33); stroke(ctx, k.line, k.lw * 0.5);
      ctx.save(); ctx.scale(0.01, 0.01);
      txt(ctx, 'R$', 0, 12, { size: 34, weight: 800, color: k.line, align: 'center' });
      ctx.restore();
    },
  };
  function icon(ctx, name, x, y, size, o = {}) {
    const sc = o.scale ?? 1, alpha = o.alpha ?? 1;
    if (sc <= 0.001 || alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(size * sc, size * sc);
    ICONS[name](ctx, { line: o.line || C.white, accent: o.accent || C.lime, ink: o.ink, lw: (o.lw || 7) / size });
    ctx.restore();
  }
  function checkMark(ctx, x, y, r, prog, color, lw) {
    const pts = [[-0.42, 0.02], [-0.12, 0.32], [0.45, -0.3]];
    const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
    const L = (l1 + l2) * clamp(prog);
    if (L <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    if (L <= l1) ctx.lineTo(lerp(pts[0][0], pts[1][0], L / l1), lerp(pts[0][1], pts[1][1], L / l1));
    else { ctx.lineTo(pts[1][0], pts[1][1]); const f = (L - l1) / l2; ctx.lineTo(lerp(pts[1][0], pts[2][0], f), lerp(pts[1][1], pts[2][1], f)); }
    stroke(ctx, color, lw / r);
    ctx.restore();
  }
  function checkBadge(ctx, x, y, r, u, fillC, markC) {
    if (u <= 0) return;
    const s = E.outBack(clamp(u / 0.5));
    circle(ctx, x, y, r * s); fill(ctx, fillC);
    checkMark(ctx, x, y, r * 0.62, p(u, 0.25, 0.7), markC, r * 0.2);
  }

  // ---------------------------------------------------------------- logo (imagem fornecida, sem alteração)
  let LOGO = null;
  function logo(ctx, x, y, d, o = {}) {
    const sc = o.scale ?? 1, alpha = o.alpha ?? 1;
    if (sc <= 0.001 || alpha <= 0.001) return;
    const D = d * sc;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (LOGO) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(LOGO, x - D / 2, y - D / 2, D, D); }
    else { circle(ctx, x, y, D / 2); fill(ctx, C.black); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- fundos
  function bgDark(ctx, lt) {
    ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H);
    // grade de cruzetas, com leve deriva
    ctx.save();
    ctx.strokeStyle = '#1B1B1B'; ctx.lineWidth = 2;
    const g = 120, oy = (lt * 10) % g;
    ctx.beginPath();
    for (let y = -g + oy + 40; y < H + g; y += g) for (let x = 60; x < W; x += g) { ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); }
    ctx.stroke();
    // vinheta
    const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function bgLight(ctx, lt) {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.fillStyle = '#D9D9D1';
    const g = 60, oy = (lt * 10) % g;
    for (let y = -g + oy + 30; y < H + g; y += g) for (let x = 30; x < W; x += g) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- estrutura das estações
  const STATIONS = ['RESERVA', 'SINAL', 'CHECK-IN', 'COMANDA', 'CHECK-OUT', 'CAIXA'];
  const LX = 80; // margem esquerda dos títulos
  /** Cabeçalho: mini-anel de progresso + número + nome da etapa. */
  function stationHeader(ctx, lt, k, dark) {
    const a = E.outExpo(p(lt, -0.22, 0.25));
    if (a <= 0) return;
    const fg = dark ? C.white : C.ink, track = dark ? C.line2 : '#CFCFC7';
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate((1 - a) * -40, 0);
    const cx = LX + 34, cy = 322, r = 30;
    circle(ctx, cx, cy, r); stroke(ctx, track, 6);
    const prog = lerp((k - 1) / 6, k / 6, E.inOutCubic(p(lt, 0.0, 0.6)));
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + prog * TAU); stroke(ctx, dark ? C.lime : C.ink, 6);
    const ha = -Math.PI / 2 + prog * TAU;
    circle(ctx, cx + Math.cos(ha) * r, cy + Math.sin(ha) * r, 9); fill(ctx, C.lime);
    if (!dark) stroke(ctx, C.ink, 3);
    txt(ctx, String(k).padStart(2, '0'), LX + 90, 340, { size: 52, weight: 800, color: fg });
    txt(ctx, '/06', LX + 158, 340, { size: 26, weight: 700, color: dark ? C.gray : C.grayD });
    const label = STATIONS[k - 1];
    const lw = tw(ctx, label, MONO, 30, 800, 4);
    const bx = LX + 232;
    if (dark) txt(ctx, label, bx, 334, { size: 30, weight: 800, color: C.lime, ls: 4 });
    else {
      const hp = E.inOutCubic(p(lt, -0.05, 0.3));
      ctx.fillStyle = C.lime; ctx.fillRect(bx - 10, 300, (lw + 16) * hp, 46);
      txt(ctx, label, bx, 334, { size: 30, weight: 800, color: C.ink, ls: 4 });
    }
    ctx.restore();
  }
  function caption(ctx, lt, s, t0, dark, y = 1488) {
    typeText(ctx, s, LX, y, p(lt, t0, t0 + 0.5), { size: 28, weight: 700, color: dark ? C.gray : C.grayD, ls: 1.5 });
  }

  // =====================================================================
  // ABERTURA (0 – 5.6 s): status do chalé → "Toda estadia é um ciclo." → anel
  // =====================================================================
  const RING = { x: 540, y: 1150, r: 290 };
  const NODE_R = 26;
  const nodeAng = (k) => -Math.PI / 2 + (k * TAU) / 6; // k = 0..5
  const nodePos = (k, R = RING.r) => ({ x: RING.x + Math.cos(nodeAng(k)) * R, y: RING.y + Math.sin(nodeAng(k)) * R });

  const FLIPS = [
    { t: 0.0, st: 'LIVRE', d: '04 OUT 08:00' },
    { t: 0.25, st: 'PRE', d: '04 OUT 09:12' },
    { t: 0.5, st: 'CONF', d: '04 OUT 09:40' },
    { t: 0.75, st: 'CHECKIN', d: '05 OUT 14:15' },
    { t: 1.0, st: 'HOSP', d: '05 OUT 14:16' },
    { t: 1.25, st: 'CHECKOUT', d: '07 OUT 12:00' },
    { t: 1.5, st: 'LIVRE', d: '07 OUT 12:05' },
  ];
  const HOOK = { x: 540, y: 940, h: 176, fs: 72 };
  // zoom de "mergulho" no nó (abertura → estação 01, estação 06 → anel)
  const irisScale = (u) => Math.exp(Math.log(80) * E.inCubic(clamp(u)));
  const T_IRIS_IN = [5.0, 5.6];

  function drawHookPill(ctx, lt) {
    let i = 0;
    for (let j = 0; j < FLIPS.length; j++) if (lt >= FLIPS[j].t) i = j;
    const f = FLIPS[i], prev = FLIPS[Math.max(0, i - 1)];
    const st = ST[f.st], pst = ST[prev.st];
    const u = i === 0 ? 1 : p(lt, f.t, f.t + 0.13);
    const { h, fs } = HOOK;
    // colapso em ponto (2.0 – 2.35)
    const col = E.inOutCubic(p(lt, 2.0, 2.3));
    const w0 = pillWidth(ctx, pst.label, h, fs), w1 = pillWidth(ctx, st.label, h, fs);
    let w = lerp(w0, w1, E.outCubic(u));
    // entrada: ponto → pílula (0 – 0.14)
    const intro = E.outCubic(p(lt, 0.0, 0.16));
    w = lerp(h, w, intro);
    w = lerp(w, h, col);
    const hh = lerp(h, 36, E.inCubic(p(lt, 2.15, 2.35)));
    const ww = lerp(w, 36, E.inCubic(p(lt, 2.15, 2.35))) * (hh / h < 1 ? 1 : 1);
    const bump = 1 + 0.07 * kick(lt, f.t, 0.3) * (1 - col);
    const popIn = E.outBack(p(lt, -0.02, 0.14));
    const fillC = col > 0 ? mix(st.fill === C.black ? C.lime : st.fill, C.lime, col) : (u < 1 ? mix(pst.fill, st.fill, u) : st.fill);
    const x = HOOK.x, y = HOOK.y;
    ctx.save();
    ctx.translate(x, y); ctx.scale(bump * popIn, bump * popIn);
    // brilho da cor de status atrás
    const gc = st.fill === C.black ? C.lime : st.fill;
    const gl = ctx.createRadialGradient(0, 0, 10, 0, 0, 620);
    gl.addColorStop(0, rgba(gc, 0.22 * (1 - col))); gl.addColorStop(1, rgba(gc, 0));
    ctx.fillStyle = gl; ctx.fillRect(-700, -700, 1400, 1400);
    rr(ctx, -ww / 2, -hh / 2, ww, hh, hh / 2); fill(ctx, fillC);
    const borderA = (f.st === 'HOSP' ? E.outCubic(u) : prev.st === 'HOSP' && u < 1 ? 1 - u : 0) * (1 - col);
    if (borderA > 0) { ctx.globalAlpha = borderA; rr(ctx, -ww / 2, -hh / 2, ww, hh, hh / 2); stroke(ctx, C.lime, 7); ctx.globalAlpha = 1; }
    if (col < 1) {
      ctx.save();
      rr(ctx, -ww / 2, -hh / 2, ww, hh, hh / 2); ctx.clip();
      ctx.globalAlpha = 1 - col;
      const left = -ww / 2;
      const roll = (s, o, yy) => {
        const dx = left + h * 0.42 + h * 0.13;
        circle(ctx, dx, yy, h * 0.13);
        if (s.hollow) stroke(ctx, s.dot, h * 0.05); else fill(ctx, s.dot);
        txt(ctx, s.label, dx + h * 0.33, yy + fs * 0.36, { size: fs, weight: 800, color: s.text, ls: fs * 0.06 });
      };
      const e = E.outCubic(u);
      if (u < 1 && i > 0) roll(pst, 0, -e * h);
      roll(st, 0, (1 - e) * h);
      ctx.restore();
    }
    ctx.restore();
  }

  function sceneOpen(ctx, lt) {
    // câmera: mergulho no nó 01 no fim da cena
    const zs = irisScale(p(lt, T_IRIS_IN[0], T_IRIS_IN[1]));
    const n0 = nodePos(0);
    bgDark(ctx, lt);
    ctx.save();
    if (zs > 1) { ctx.translate(n0.x, n0.y); ctx.scale(zs, zs); ctx.translate(-n0.x, -n0.y); }

    // --- 1) etiqueta de status girando (0 – 2.35)
    if (lt < 2.4) {
      const fadeTop = 1 - p(lt, 1.95, 2.2);
      typeText(ctx, 'CHALÉ DE PEDRA 05', 540 - tw(ctx, 'CHALÉ DE PEDRA 05', MONO, 38, 700, 6) / 2, 770, p(lt, 0.02, 0.45) * (fadeTop > 0 ? 1 : 0), { size: 38, weight: 700, color: rgba(C.white, 0.6 * fadeTop), ls: 6 });
      drawHookPill(ctx, lt);
      // data/hora que avança junto (a estadia passando)
      let i = 0;
      for (let j = 0; j < FLIPS.length; j++) if (lt >= FLIPS[j].t) i = j;
      const u = i === 0 ? p(lt, 0.05, 0.4) : p(lt, FLIPS[i].t, FLIPS[i].t + 0.2);
      ctx.save();
      ctx.globalAlpha = fadeTop;
      const d = FLIPS[i].d;
      const dw = tw(ctx, d, MONO, 50, 700, 4);
      ctx.save();
      ctx.beginPath(); ctx.rect(240, 1085, 600, 80); ctx.clip();
      const prevD = FLIPS[Math.max(0, i - 1)].d;
      const e = E.outCubic(u);
      if (i > 0 && u < 1) txt(ctx, prevD, 540 - dw / 2, 1142 - e * 70, { size: 50, weight: 700, color: C.grayL, ls: 4 });
      txt(ctx, d, 540 - dw / 2, 1142 + (1 - e) * 70, { size: 50, weight: 700, color: C.grayL, ls: 4 });
      ctx.restore();
      // legenda de status: a linha do tempo da estadia
      const la = E.outCubic(p(lt, 0.05, 0.4));
      const gap = 86, x0 = 540 - gap * 3, ly = 1262;
      ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(x0 + gap * 6 * la, ly); stroke(ctx, C.line2, 3);
      ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(x0 + gap * lerp(Math.max(0, i - 1), i, i === 0 ? 1 : e), ly); stroke(ctx, rgba(C.white, 0.5), 3);
      for (let j = 0; j < FLIPS.length; j++) {
        const sj = ST[FLIPS[j].st], x = x0 + gap * j;
        const appear = p(lt, 0.05 + j * 0.03, 0.25 + j * 0.03);
        if (appear <= 0) continue;
        const c = sj.fill === C.black ? C.lime : sj.fill;
        if (j < i) { circle(ctx, x, ly, 11); fill(ctx, c); if (sj.hollow) { circle(ctx, x, ly, 6); fill(ctx, C.black); } }
        else if (j === i) {
          const r = 17 * (1 + 0.4 * kick(lt, FLIPS[j].t, 0.3));
          ctx.save(); glow(ctx, c, 26); circle(ctx, x, ly, r); fill(ctx, c); ctx.restore();
          if (sj.hollow) { circle(ctx, x, ly, r * 0.55); fill(ctx, C.black); }
          circle(ctx, x, ly, r + 9); stroke(ctx, rgba(c, 0.5), 3);
        } else { circle(ctx, x, ly, 9 * E.outBack(appear)); fill(ctx, C.black); circle(ctx, x, ly, 9 * E.outBack(appear)); stroke(ctx, C.grayD, 3); }
      }
      ctx.restore();
    }

    // --- 2) anel do ciclo
    const tTrace0 = 2.6, tTrace1 = 3.75;
    const tr = E.inOutCubic(p(lt, tTrace0, tTrace1));
    const ringIn = p(lt, 2.45, 2.8);
    if (ringIn > 0) {
      ctx.save();
      ctx.globalAlpha = ringIn;
      circle(ctx, RING.x, RING.y, RING.r); stroke(ctx, C.line2, 5);
      ctx.restore();
    }
    // raios do hub (logo → etapas)
    const spoke = p(lt, 4.15, 4.55);
    if (spoke > 0) {
      for (let k = 0; k < 6; k++) {
        const a = nodeAng(k), r0 = 168, r1 = lerp(r0, RING.r - NODE_R - 6, E.outCubic(spoke));
        ctx.beginPath(); ctx.moveTo(RING.x + Math.cos(a) * r0, RING.y + Math.sin(a) * r0); ctx.lineTo(RING.x + Math.cos(a) * r1, RING.y + Math.sin(a) * r1);
        ctx.setLineDash([2, 14]); stroke(ctx, rgba(C.lime, 0.55), 5); ctx.setLineDash([]);
        // pulso que viaja pelo raio
        const pu = p(lt, 4.3 + k * 0.04, 4.75 + k * 0.04);
        if (pu > 0 && pu < 1) {
          const rr_ = lerp(r0, RING.r - NODE_R, E.inOutCubic(pu));
          ctx.save(); glow(ctx, C.lime, 20);
          circle(ctx, RING.x + Math.cos(a) * rr_, RING.y + Math.sin(a) * rr_, 8); fill(ctx, C.lime);
          ctx.restore();
        }
      }
    }
    if (tr > 0) {
      ctx.save(); glow(ctx, C.lime, 28);
      ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, -Math.PI / 2, -Math.PI / 2 + tr * TAU); stroke(ctx, C.lime, 9);
      ctx.restore();
    }
    // nós + rótulos
    for (let k = 0; k < 6; k++) {
      const tk = lerp(tTrace0, tTrace1, k / 6) + (k === 0 ? 0 : 0.02);
      const ap = p(lt, tk, tk + 0.3);
      if (ap <= 0) continue;
      const pos = nodePos(k);
      const lit = Math.max(p(lt, 4.3 + k * 0.04 + 0.42, 4.3 + k * 0.04 + 0.5), k === 0 ? p(lt, 4.75, 4.85) : 0);
      const pulse = k === 0 ? kick(lt, 4.8, 0.5) : kick(lt, 4.75 + k * 0.04, 0.3);
      const s = E.outBack(ap) * (1 + 0.25 * pulse);
      circle(ctx, pos.x, pos.y, NODE_R * s); fill(ctx, mix(C.black, C.lime, lit));
      circle(ctx, pos.x, pos.y, NODE_R * s); stroke(ctx, mix(C.white, C.lime, lit), 4);
      txt(ctx, String(k + 1).padStart(2, '0'), pos.x, pos.y + 7, { size: 20, weight: 800, color: mix(C.white, C.ink, lit), align: 'center', alpha: ap });
      // rótulo
      const a = nodeAng(k), lr = RING.r + 56;
      const lx = RING.x + Math.cos(a) * lr, ly = RING.y + Math.sin(a) * lr;
      const cs = Math.cos(a);
      const align = cs > 0.3 ? 'left' : cs < -0.3 ? 'right' : 'center';
      const yoff = k === 0 ? -6 : k === 3 ? 30 : 10;
      ctx.save();
      ctx.globalAlpha = E.outCubic(ap);
      txt(ctx, STATIONS[k], lx + (align === 'left' ? -14 : align === 'right' ? 14 : 0), ly + yoff, { size: 28, weight: 800, color: mix(C.grayL, C.lime, lit), align, ls: 3 });
      ctx.restore();
    }
    // o ponto: centro → topo do anel → volta completa
    if (lt >= 2.3 && lt < 4.4) {
      let x, y;
      if (lt < tTrace0) { const u = E.inOutCubic(p(lt, 2.3, tTrace0)); x = 540; y = lerp(HOOK.y, nodePos(0).y, u); }
      else { const a = -Math.PI / 2 + tr * TAU; x = RING.x + Math.cos(a) * RING.r; y = RING.y + Math.sin(a) * RING.r; }
      ctx.save(); glow(ctx, C.lime, 40);
      circle(ctx, x, y, 18 * (1 - p(lt, 4.0, 4.4))); fill(ctx, C.lime);
      ctx.restore();
    }
    // logo no centro do anel (hub)
    const lg = p(lt, 4.0, 4.5);
    if (lg > 0) {
      const wave = p(lt, 4.0, 4.7);
      if (wave < 1) { circle(ctx, RING.x, RING.y, lerp(150, 330, E.outCubic(wave))); stroke(ctx, rgba(C.lime, 1 - wave), 6); }
      const g = ctx.createRadialGradient(RING.x, RING.y, 120, RING.x, RING.y, 300);
      g.addColorStop(0, rgba(C.lime, 0.18 * lg)); g.addColorStop(1, rgba(C.lime, 0));
      ctx.fillStyle = g; ctx.fillRect(RING.x - 300, RING.y - 300, 600, 600);
      logo(ctx, RING.x, RING.y, 300, { scale: E.outBack(lg, 2.2) });
    }
    ctx.restore();

    // --- títulos (fora da câmera, saem antes do mergulho)
    headline(ctx, lt, [[{ s: 'Toda estadia' }], [{ s: 'é um ' }, { s: 'ciclo.', color: C.lime }]],
      { x: 540, y: 470, align: 'center', size: 116, color: C.white, tin: 2.05, tout: 3.7 });
    headline(ctx, lt, [[{ s: 'O FAZLO Hospeda' }], [{ s: 'acompanha ' }, { s: 'cada etapa.', color: C.lime }]],
      { x: 540, y: 470, align: 'center', size: 100, color: C.white, tin: 3.92, tout: 4.95 });
  }

  // =====================================================================
  // 01 RESERVA (claro): reservas no calendário de ocupação
  // =====================================================================
  const DAYS = [['DOM', 4], ['SEG', 5], ['TER', 6], ['QUA', 7], ['QUI', 8], ['SEX', 9], ['SÁB', 10]];
  const BOARD = { x: 80, y: 768, w: 920, lane0: 878, laneH: 108, barH: 86 };
  const BARS = [
    { lane: 0, d0: 0, d1: 3, st: 'HOSP', t: 0.5 },
    { lane: 1, d0: 2, d1: 6, st: 'CONF', t: 0.58 },
    { lane: 3, d0: 0, d1: 1, st: 'BLOQ', t: 0.66 },
    { lane: 4, d0: 4, d1: 6, st: 'CHECKIN', t: 0.74 },
    { lane: 2, d0: 1, d1: 4, st: 'PRE', t: 1.05, hero: true },
  ];
  function st1(ctx, lt) {
    bgLight(ctx, lt);
    stationHeader(ctx, lt, 1, false);
    headline(ctx, lt, [[{ s: 'Reserva no' }], [{ s: 'calendário.', hl: C.lime }]], { x: LX, y: 505, size: 112, color: C.ink, tin: -0.12, hlAt: 0.75 });
    const colW = BOARD.w / 7;
    // dias da semana
    for (let i = 0; i < 7; i++) {
      const a = E.outCubic(p(lt, 0.3 + i * 0.03, 0.6 + i * 0.03));
      if (a <= 0) continue;
      const cx = BOARD.x + colW * (i + 0.5);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 20);
      const today = i === 3;
      txt(ctx, DAYS[i][0], cx, BOARD.y, { size: 25, weight: 700, color: today ? C.ink : C.grayD, align: 'center', ls: 2 });
      if (today) { circle(ctx, cx, BOARD.y + 50, 36); fill(ctx, C.ink); }
      txt(ctx, String(DAYS[i][1]), cx, BOARD.y + 66, { fam: DISPLAY, size: 46, weight: 900, color: today ? C.lime : C.ink, align: 'center' });
      ctx.restore();
    }
    // trilhas (acomodações)
    for (let l = 0; l < 5; l++) {
      const y = BOARD.lane0 + l * BOARD.laneH + BOARD.laneH / 2;
      const a = p(lt, 0.35 + l * 0.04, 0.7 + l * 0.04);
      ctx.save(); ctx.globalAlpha = a;
      ctx.setLineDash([3, 12]);
      ctx.beginPath(); ctx.moveTo(BOARD.x, y); ctx.lineTo(BOARD.x + BOARD.w * E.outCubic(a), y); stroke(ctx, '#C4C4BB', 3);
      ctx.setLineDash([]);
      ctx.restore();
    }
    // separadores verticais leves
    ctx.save(); ctx.globalAlpha = p(lt, 0.4, 0.8);
    for (let i = 1; i < 7; i++) { const x = BOARD.x + colW * i; ctx.beginPath(); ctx.moveTo(x, BOARD.lane0 - 4); ctx.lineTo(x, BOARD.lane0 + 5 * BOARD.laneH); stroke(ctx, '#E0E0D8', 2); }
    ctx.restore();
    // barras de estadia deslizando
    const tConfirm = 1.85;
    for (const b of BARS) {
      const u = p(lt, b.t, b.t + (b.hero ? 0.55 : 0.45));
      if (u <= 0) continue;
      const e = b.hero ? E.outQuart(u) : E.outCubic(u);
      const x0 = BOARD.x + colW * b.d0 + 8, x1 = BOARD.x + colW * (b.d1 + 1) - 8;
      const y = BOARD.lane0 + b.lane * BOARD.laneH + BOARD.laneH / 2;
      const dx = (1 - e) * 900;
      let st = ST[b.st];
      let label = st.label;
      let conf = 0;
      if (b.hero) {
        conf = p(lt, tConfirm, tConfirm + 0.18);
        if (conf > 0) { st = Object.assign({}, ST.CONF, { fill: mix(C.pre, C.lime, conf) }); label = 'CONFIRMADA'; }
      }
      const h = BOARD.barH * (b.hero ? 1 + 0.12 * kick(lt, tConfirm, 0.35) : 1);
      ctx.save();
      ctx.translate(dx, 0);
      if (b.hero) { ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; }
      rr(ctx, x0, y - h / 2, x1 - x0, h, h / 2); fill(ctx, st.fill);
      noGlow(ctx); ctx.shadowOffsetY = 0;
      if (st.border) { rr(ctx, x0, y - h / 2, x1 - x0, h, h / 2); stroke(ctx, st.border, 5); }
      if (b.st === 'BLOQ') {
        ctx.save(); rr(ctx, x0, y - h / 2, x1 - x0, h, h / 2); ctx.clip();
        ctx.beginPath(); for (let x = x0 - 80; x < x1; x += 22) { ctx.moveTo(x, y + h / 2); ctx.lineTo(x + 60, y - h / 2); } stroke(ctx, 'rgba(255,255,255,0.06)', 8);
        ctx.restore();
      }
      circle(ctx, x0 + 38, y, 10);
      if (st.hollow) stroke(ctx, st.dot, 4); else fill(ctx, st.dot);
      txt(ctx, label, x0 + 62, y + 10, { size: 28, weight: 800, color: st.text, ls: 1.5 });
      if (b.hero) checkBadge(ctx, x1 - 44, y, 29, p(lt, tConfirm + 0.05, tConfirm + 0.6), C.ink, C.lime);
      ctx.restore();
    }
    // flash do carimbo
    const fl = kick(lt, tConfirm, 0.35);
    if (fl > 0.01) {
      const y = BOARD.lane0 + 2 * BOARD.laneH + BOARD.laneH / 2;
      ctx.save(); ctx.globalAlpha = fl * 0.9;
      rr(ctx, BOARD.x + colW + 8 - 20 * (1 - fl), y - 50 - 30 * (1 - fl), colW * 4 - 16 + 40 * (1 - fl), 100 + 60 * (1 - fl), 60); stroke(ctx, C.lime, 6);
      ctx.restore();
    }
    // modos de visualização (dia · semana · mês)
    const modes = ['DIA', 'SEMANA', 'MÊS'];
    const ma = E.outCubic(p(lt, 0.9, 1.3));
    if (ma > 0) {
      ctx.save(); ctx.globalAlpha = ma;
      let x = LX;
      const xs = [];
      for (const m of modes) { xs.push([x, tw(ctx, m, MONO, 28, 800, 3)]); x += xs[xs.length - 1][1] + 48; }
      const sel = lt < 1.55 ? 0 : 1;
      const mv = E.inOutCubic(p(lt, 1.45, 1.75));
      const ux = lerp(xs[0][0], xs[1][0], mv), uw = lerp(xs[0][1], xs[1][1], mv);
      rr(ctx, ux - 18, 1450, uw + 30, 52, 26); fill(ctx, C.ink);
      modes.forEach((m, i) => txt(ctx, m, xs[i][0], 1486, { size: 28, weight: 800, color: (i === sel || (i === 1 && mv > 0.5)) && !(i === 0 && mv > 0.5) ? C.lime : C.grayD, ls: 3 }));
      ctx.restore();
    }
  }

  // =====================================================================
  // 02 SINAL (escuro): o sinal da reserva entra no caixa automaticamente
  // =====================================================================
  const BOX = { x: 560, y: 1120, w: 440, h: 280 };
  function cashBox(ctx, lt, value, flash, dark, o = {}) {
    const a = o.alpha ?? 1;
    if (a <= 0) return;
    const b = o.box || BOX;
    ctx.save(); ctx.globalAlpha *= a;
    const s = o.scale ?? 1;
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(s, s); ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
    if (flash > 0.01) { ctx.save(); glow(ctx, C.lime, 60 * flash); rr(ctx, b.x, b.y, b.w, b.h, 30); fill(ctx, dark ? C.panel : C.ink); ctx.restore(); }
    rr(ctx, b.x, b.y, b.w, b.h, 30); fill(ctx, dark ? C.panel : C.ink);
    rr(ctx, b.x, b.y, b.w, b.h, 30); stroke(ctx, mix(dark ? C.line2 : C.ink, C.lime, flash), 4);
    txt(ctx, 'CAIXA', b.x + 38, b.y + 68, { size: 34, weight: 800, color: C.white, ls: 4 });
    circle(ctx, b.x + b.w - 48, b.y + 56, 11); fill(ctx, C.in);
    txt(ctx, 'ENTRADAS', b.x + 38, b.y + 156, { size: 26, weight: 700, color: C.gray, ls: 2 });
    txt(ctx, brl(Math.round(value)), b.x + 38, b.y + 228, { size: 54, weight: 800, color: mix(C.white, C.lime, clamp(flash * 2)) });
    ctx.restore();
  }
  function flowPath(pts, r) {
    // polilinha com cantos arredondados → função (u) → ponto, e desenho parcial
    const segs = [];
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(l); L += l; }
    return {
      L,
      at(u) {
        let d = clamp(u) * L;
        for (let i = 0; i < segs.length; i++) {
          if (d <= segs[i] || i === segs.length - 1) { const f = segs[i] ? d / segs[i] : 0; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; }
          d -= segs[i];
        }
      },
      draw(ctx, u, color, lw) {
        if (u <= 0) return;
        let d = clamp(u) * L;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 0; i < segs.length && d > 0; i++) {
          const f = Math.min(1, d / segs[i]);
          if (f >= 1 && i < segs.length - 1) ctx.arcTo(pts[i + 1][0], pts[i + 1][1], pts[i + 2][0], pts[i + 2][1], r);
          else ctx.lineTo(lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f));
          d -= segs[i];
        }
        stroke(ctx, color, lw);
      },
    };
  }
  function st2(ctx, lt) {
    bgDark(ctx, lt);
    stationHeader(ctx, lt, 2, true);
    headline(ctx, lt, [[{ s: 'O sinal entra' }], [{ s: 'direto no ' }, { s: 'caixa.', color: C.lime }]], { x: LX, y: 505, size: 112, color: C.white, tin: -0.12 });
    // moeda R$ caindo
    const cx = 250, cy = 860;
    const drop = p(lt, 0.3, 0.75);
    if (drop > 0) {
      const yy = lerp(cy - 260, cy, E.outBack(drop, 1.3));
      ctx.save(); glow(ctx, C.lime, 30 * drop);
      icon(ctx, 'coin', cx, yy, 226, { line: C.lime, lw: 10, rot: (1 - E.outCubic(drop)) * 1.5 });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = E.outCubic(p(lt, 0.45, 0.8));
      txt(ctx, 'SINAL DE RESERVA', 400, 820, { size: 28, weight: 700, color: C.gray, ls: 2 });
      ctx.restore();
      const v = 930 * E.outCubic(p(lt, 0.5, 1.0));
      if (lt > 0.5) txt(ctx, brl(Math.round(v), '+ '), 400, 906, { size: 70, weight: 800, color: C.white, ls: -2 });
    }
    // trilha até o caixa
    const path = flowPath([[cx, cy + 128], [cx, BOX.y + BOX.h / 2], [BOX.x, BOX.y + BOX.h / 2]], 80);
    const pu = E.inOutCubic(p(lt, 0.95, 1.5));
    ctx.save();
    path.draw(ctx, 1, rgba(C.white, 0.08 * p(lt, 0.8, 1)), 6);
    glow(ctx, C.lime, 24); path.draw(ctx, pu, C.lime, 7);
    ctx.restore();
    if (pu > 0 && pu < 1) {
      const [px, py] = path.at(pu);
      ctx.save(); glow(ctx, C.lime, 40); circle(ctx, px, py, 16); fill(ctx, C.lime); ctx.restore();
    }
    // caixa
    const tArr = 1.5;
    const ba = E.outBack(p(lt, 0.6, 1.0));
    const fl = kick(lt, tArr, 0.6);
    cashBox(ctx, lt, lt < tArr ? 0 : 930 * E.outCubic(p(lt, tArr, tArr + 0.35)), fl, true, { alpha: clamp(ba), scale: (0.85 + 0.15 * ba) * (1 + 0.05 * fl) });
    // etiqueta ENTRADA
    const ea = p(lt, tArr + 0.05, tArr + 0.4);
    if (ea > 0) {
      chip(ctx, BOX.x + BOX.w / 2, BOX.y - 56, '+ ENTRADA', { h: 66, fs: 28, fill: C.lime, line: C.lime, color: C.ink, scale: E.outBack(ea) });
    }
    caption(ctx, lt, 'LANÇADO AUTOMATICAMENTE COMO ENTRADA', 1.6, true);
  }

  // =====================================================================
  // 03 CHECK-IN (claro): hora de chegada, status hospedada, cadastro do hóspede
  // =====================================================================
  function st3(ctx, lt) {
    bgLight(ctx, lt);
    stationHeader(ctx, lt, 3, false);
    headline(ctx, lt, [[{ s: 'Check-in e' }], [{ s: 'hóspede ' }, { s: 'cadastrado.', hl: C.lime }]], { x: LX, y: 505, size: 112, color: C.ink, tin: -0.12, hlAt: 0.8 });
    // relógio
    const ru = p(lt, 0.3, 1.05);
    if (ru > 0) {
      txt(ctx, 'ENTRADA', LX, 735, { size: 28, weight: 700, color: C.grayD, ls: 3, alpha: p(lt, 0.3, 0.6) });
      rollText(ctx, '14:15', LX - 6, 915, ru, { size: 210, color: C.ink });
    }
    // chave girando + status
    const ka = p(lt, 0.55, 0.9);
    if (ka > 0) {
      const turn = E.inOutCubic(p(lt, 1.15, 1.4));
      icon(ctx, 'key', 862, 836, 220, { line: C.ink, accent: C.checkin, lw: 11, scale: E.outBack(ka), rot: deg(-30) + turn * deg(90) });
    }
    const pa = p(lt, 0.7, 1.0);
    if (pa > 0) {
      const sw = p(lt, 1.4, 1.55);
      const st = sw > 0 ? ST.HOSP : ST.CHECKIN;
      statusPill(ctx, LX, 1012, st, { h: 86, fs: 33, align: 'left', scale: E.outBack(pa) * (1 + 0.1 * kick(lt, 1.4, 0.3)) });
      txt(ctx, '2 HÓSPEDES', 440, 1024, { size: 30, weight: 700, color: C.grayD, ls: 2, alpha: p(lt, 0.9, 1.2) });
    }
    // cadastro: pessoa + campos de busca
    const ga = E.outBack(p(lt, 1.0, 1.35));
    if (ga > 0) {
      const gx = 190, gy = 1275;
      ctx.save(); ctx.translate(gx, gy); ctx.scale(ga, ga);
      circle(ctx, 0, 0, 112); fill(ctx, C.ink);
      icon(ctx, 'person', 0, 8, 146, { line: C.lime, lw: 10 });
      ctx.restore();
    }
    const fields = ['NOME', 'WHATSAPP', 'E-MAIL', 'CPF'];
    const pos = [[350, 1215], [612, 1215], [350, 1335], [612, 1335]];
    // lupa varrendo os campos
    const sweep = p(lt, 1.75, 2.55);
    fields.forEach((f, i) => {
      const a = p(lt, 1.1 + i * 0.07, 1.4 + i * 0.07);
      if (a <= 0) return;
      const hit = sweep > 0 ? kick(lt, 1.8 + i * 0.18, 0.5) : 0;
      const on = sweep > 0 && lt > 1.8 + i * 0.18;
      chip(ctx, pos[i][0], pos[i][1], f, { h: 86, fs: 30, align: 'left', line: C.ink, fill: on ? C.lime : C.paper, color: C.ink, dot: C.ink, scale: E.outBack(a) * (1 + 0.08 * hit) });
    });
    if (sweep > 0 && sweep < 1) {
      const k = Math.min(3, Math.floor(sweep * 4)), f = sweep * 4 - k;
      const a0 = pos[k], a1 = pos[Math.min(3, k + 1)];
      const mx = lerp(a0[0] + 60, a1[0] + 60, E.inOutCubic(f)), my = lerp(a0[1], a1[1], E.inOutCubic(f));
      icon(ctx, 'search', mx + 80, my + 34, 110, { line: C.ink, lw: 10, alpha: Math.min(1, sweep * 8, (1 - sweep) * 8) });
    }
    caption(ctx, lt, 'BUSCA POR NOME, WHATSAPP, E-MAIL OU CPF', 1.5, false);
  }

  // =====================================================================
  // 04 COMANDA (escuro): consumo lançado na comanda da acomodação
  // =====================================================================
  const ITEMS = [
    { icon: 'bottle', q: '2×', name: 'ÁGUA MINERAL', price: 10, cat: 'PRODUTO' },
    { icon: 'cup', q: '1×', name: 'CAFÉ ESPECIAL', price: 7, cat: 'PRODUTO' },
    { icon: 'plate', q: '1×', name: 'PORÇÃO DE PASTÉIS', price: 38, cat: 'PRODUTO' },
    { icon: 'mountain', q: '1×', name: 'PASSEIO GUIADO', price: 150, cat: 'SERVIÇO' },
  ];
  const TICKET = { x: 384, y: 716, w: 616, h: 720 };
  function st4(ctx, lt) {
    bgDark(ctx, lt);
    stationHeader(ctx, lt, 4, true);
    headline(ctx, lt, [[{ s: 'Consumo direto' }], [{ s: 'na ' }, { s: 'comanda.', color: C.lime }]], { x: LX, y: 505, size: 112, color: C.white, tin: -0.12 });
    // comanda (papel)
    const ta = E.outCubic(p(lt, 0.25, 0.7));
    if (ta > 0) {
      const T = TICKET;
      ctx.save();
      ctx.translate(0, (1 - ta) * 500);
      ctx.translate(T.x + T.w / 2, T.y); ctx.rotate(deg(2) * (1 - ta) + deg(1.2)); ctx.translate(-(T.x + T.w / 2), -T.y);
      // papel com borda serrilhada
      ctx.beginPath();
      ctx.moveTo(T.x, T.y + 18); ctx.arcTo(T.x, T.y, T.x + 18, T.y, 18); ctx.lineTo(T.x + T.w - 18, T.y); ctx.arcTo(T.x + T.w, T.y, T.x + T.w, T.y + 18, 18);
      ctx.lineTo(T.x + T.w, T.y + T.h);
      const n = 15;
      for (let i = 0; i < n; i++) { const x = T.x + T.w - (i + 0.5) * (T.w / n); ctx.lineTo(x, T.y + T.h - 16); ctx.lineTo(x - T.w / n / 2, T.y + T.h); }
      ctx.closePath();
      fill(ctx, C.paper);
      txt(ctx, 'COMANDA', T.x + 40, T.y + 72, { size: 34, weight: 800, color: C.ink, ls: 4 });
      txt(ctx, 'BICA D\'ÁGUA 01', T.x + T.w - 40, T.y + 70, { size: 25, weight: 700, color: C.grayD, align: 'right', ls: 1 });
      ctx.setLineDash([8, 10]);
      ctx.beginPath(); ctx.moveTo(T.x + 40, T.y + 112); ctx.lineTo(T.x + T.w - 40, T.y + 112); stroke(ctx, '#BDBDB4', 3);
      ctx.beginPath(); ctx.moveTo(T.x + 40, T.y + T.h - 166); ctx.lineTo(T.x + T.w - 40, T.y + T.h - 166); stroke(ctx, '#BDBDB4', 3);
      ctx.setLineDash([]);
      let total = 0;
      ITEMS.forEach((it, i) => {
        const tl = 0.75 + i * 0.36 + 0.3;
        const a = p(lt, tl, tl + 0.25);
        if (a <= 0) return;
        total += it.price * E.outCubic(p(lt, tl, tl + 0.3));
        const y = T.y + 186 + i * 94;
        ctx.save(); ctx.globalAlpha = a;
        if (kick(lt, tl, 0.4) > 0.02) { ctx.fillStyle = rgba(C.lime, 0.7 * kick(lt, tl, 0.4)); ctx.fillRect(T.x + 22, y - 44, T.w - 44, 64); }
        typeText(ctx, `${it.q} ${it.name}`, T.x + 40, y, p(lt, tl, tl + 0.3), { size: 27, weight: 700, color: C.ink, ls: 0.5 });
        txt(ctx, brl(it.price).replace('R$ ', ''), T.x + T.w - 40, y, { size: 30, weight: 800, color: C.ink, align: 'right' });
        ctx.restore();
      });
      txt(ctx, 'TOTAL', T.x + 40, T.y + T.h - 84, { size: 30, weight: 800, color: C.grayD, ls: 3 });
      txt(ctx, brl(Math.round(total)), T.x + T.w - 40, T.y + T.h - 74, { size: 58, weight: 800, color: C.ink, align: 'right', ls: -1 });
      ctx.restore();
    }
    // ícones dos itens: aparecem à esquerda e voam para a comanda
    ITEMS.forEach((it, i) => {
      const t0 = 0.75 + i * 0.36;
      const a = p(lt, t0, t0 + 0.18), fly = p(lt, t0 + 0.12, t0 + 0.34);
      if (a <= 0 || fly >= 1) return;
      const sx = 205, sy = 1040;
      const tx = TICKET.x + 60, ty = TICKET.y + 172 + i * 94;
      const e = E.inCubic(fly);
      const x = lerp(sx, tx, e), y = lerp(sy, ty, e) - Math.sin(e * Math.PI) * 120;
      const s = E.outBack(a) * (1 - 0.8 * e);
      circle(ctx, x, y, 132 * s); fill(ctx, C.panel);
      circle(ctx, x, y, 132 * s); stroke(ctx, C.line2, 3);
      icon(ctx, it.icon, x, y, 170, { line: C.white, accent: C.lime, ink: C.ink, lw: 9, scale: s });
      if (fly <= 0) txt(ctx, it.cat, sx, sy + 186, { size: 26, weight: 800, color: C.lime, align: 'center', ls: 3, alpha: a });
    });
    caption(ctx, lt, 'PRODUTOS E SERVIÇOS POR ACOMODAÇÃO', 1.4, true);
  }

  // =====================================================================
  // 05 CHECK-OUT (claro): comanda liquidada → entrada no caixa
  // =====================================================================
  function st5(ctx, lt) {
    bgLight(ctx, lt);
    stationHeader(ctx, lt, 5, false);
    headline(ctx, lt, [[{ s: 'Check-out:' }], [{ s: 'comanda no ' }, { s: 'caixa.', hl: C.lime }]], { x: LX, y: 505, size: 112, color: C.ink, tin: -0.12, hlAt: 0.7 });
    const ru = p(lt, 0.25, 0.95);
    if (ru > 0) {
      txt(ctx, 'SAÍDA', LX, 735, { size: 28, weight: 700, color: C.grayD, ls: 3, alpha: p(lt, 0.25, 0.5) });
      rollText(ctx, '12:00', LX - 6, 915, ru, { size: 210, color: C.ink });
      statusPill(ctx, LX, 1012, ST.CHECKOUT, { h: 86, fs: 33, align: 'left', scale: E.outBack(p(lt, 0.5, 0.8)) });
      icon(ctx, 'suitcase', 862, 840, 200, { line: C.ink, accent: C.checkout, lw: 11, scale: E.outBack(p(lt, 0.45, 0.8)), rot: deg(6) * Math.sin(lt * 6) * (1 - p(lt, 0.8, 1.4)) });
    }
    // mini comanda que vira pulso
    const sx = 230, sy = 1268;
    const ma = E.outBack(p(lt, 0.6, 0.9));
    const fold = E.inCubic(p(lt, 1.05, 1.3));
    if (ma > 0 && fold < 1) {
      ctx.save(); ctx.translate(sx, sy); ctx.scale(ma * (1 - fold), ma * (1 - 0.6 * fold));
      rr(ctx, -150, -120, 300, 240, 22); fill(ctx, C.white);
      rr(ctx, -150, -120, 300, 240, 22); stroke(ctx, C.ink, 4);
      txt(ctx, 'COMANDA', -116, -60, { size: 25, weight: 800, color: C.grayD, ls: 3 });
      txt(ctx, brl(205), -116, 22, { size: 46, weight: 800, color: C.ink, ls: -1 });
      txt(ctx, 'LIQUIDADA', -116, 82, { size: 25, weight: 800, color: '#1E9E4A', ls: 3 });
      ctx.restore();
    }
    const box = { x: 560, y: 1128, w: 440, h: 280 };
    const path = flowPath([[sx + 30, sy], [box.x, sy]], 0);
    const pu = E.inOutCubic(p(lt, 1.2, 1.55));
    if (pu > 0) {
      path.draw(ctx, pu, C.ink, 7);
      if (pu < 1) { const [px, py] = path.at(pu); circle(ctx, px, py, 18); fill(ctx, C.lime); circle(ctx, px, py, 18); stroke(ctx, C.ink, 4); }
    }
    const tArr = 1.55;
    const fl = kick(lt, tArr, 0.6);
    const ba = E.outBack(p(lt, 0.7, 1.05));
    cashBox(ctx, lt, lt < tArr ? 930 : lerp(930, 1135, E.outCubic(p(lt, tArr, tArr + 0.35))), fl, false, { box, alpha: clamp(ba), scale: (0.85 + 0.15 * ba) * (1 + 0.05 * fl) });
    const ea = p(lt, tArr + 0.05, tArr + 0.35);
    if (ea > 0) chip(ctx, box.x + box.w / 2, box.y - 56, '+ R$ 205,00', { h: 66, fs: 28, fill: C.lime, line: C.ink, color: C.ink, scale: E.outBack(ea) });
    caption(ctx, lt, 'COMANDA LIQUIDADA = ENTRADA NO CAIXA', 1.3, false);
  }

  // =====================================================================
  // 06 CAIXA (escuro): diário de entradas e saídas, fechamento conferido
  // =====================================================================
  function st6(ctx, lt) {
    bgDark(ctx, lt);
    stationHeader(ctx, lt, 6, true);
    headline(ctx, lt, [[{ s: 'Caixa fechado' }], [{ s: 'e ' }, { s: 'conferido.', color: C.lime }]], { x: LX, y: 505, size: 112, color: C.white, tin: -0.12 });
    const rows = [
      { l: 'ABERTURA', v: 300, sign: '', c: C.white, t: 0.35 },
      { l: 'ENTRADAS', v: 1135, sign: '+ ', c: C.in, t: 0.5 },
      { l: 'SAÍDAS', v: 45, sign: '− ', c: C.out, t: 0.65 },
    ];
    rows.forEach((r, i) => {
      const a = E.outCubic(p(lt, r.t, r.t + 0.35));
      if (a <= 0) return;
      const y = 800 + i * 100;
      ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * -60, 0);
      txt(ctx, r.l, LX, y, { size: 32, weight: 700, color: C.grayL, ls: 3 });
      const v = r.v * E.outCubic(p(lt, r.t + 0.05, r.t + 0.55));
      txt(ctx, brl(Math.round(v), r.sign), 1000, y, { size: 50, weight: 800, color: r.c, align: 'right', ls: -1 });
      ctx.setLineDash([2, 10]);
      ctx.beginPath(); ctx.moveTo(LX + tw(ctx, r.l, MONO, 32, 700, 3) + 20, y - 11); ctx.lineTo(1000 - tw(ctx, brl(r.v, r.sign), MONO, 50, 800, -1) - 24, y - 11); stroke(ctx, C.line2, 3);
      ctx.setLineDash([]);
      ctx.restore();
    });
    // formas de pagamento
    ['PIX', 'CARTÃO', 'DINHEIRO'].forEach((m, i) => {
      const a = p(lt, 0.8 + i * 0.07, 1.1 + i * 0.07);
      if (a <= 0) return;
      const xs = [LX, LX + 168, LX + 392];
      chip(ctx, xs[i], 1078, m, { h: 64, fs: 25, align: 'left', line: C.line2, color: C.white, dot: C.lime, scale: E.outBack(a) });
    });
    // fechamento
    const sep = E.inOutCubic(p(lt, 1.15, 1.45));
    if (sep > 0) { ctx.beginPath(); ctx.moveTo(LX, 1158); ctx.lineTo(LX + 920 * sep, 1158); stroke(ctx, C.white, 3); }
    const ft = 1.4;
    const fa = p(lt, ft, ft + 0.25);
    if (fa > 0) {
      txt(ctx, 'FECHAMENTO · DIFERENÇA', LX, 1226, { size: 30, weight: 700, color: C.gray, ls: 3, alpha: fa });
      const s = E.outBack(p(lt, ft + 0.05, ft + 0.45), 2.5);
      ctx.save();
      ctx.translate(LX, 1418); ctx.scale(s, s);
      glow(ctx, C.lime, 40 * kick(lt, ft + 0.1, 0.8));
      txt(ctx, 'R$ 0,00', 0, 0, { fam: DISPLAY, size: 200, weight: 900, color: C.lime, ls: -6 });
      ctx.restore();
      const zw = tw(ctx, 'R$ 0,00', DISPLAY, 200, 900, -6);
      checkBadge(ctx, LX + zw + 82, 1348, 64, p(lt, ft + 0.25, ft + 0.9), C.lime, C.ink);
    }
    caption(ctx, lt, 'DIÁRIO DE CAIXA · ENTRADAS E SAÍDAS', 1.75, true, 1502);
  }

  // =====================================================================
  // ANEL (volta): o ciclo fecha e recomeça → contrai na logo
  // =====================================================================
  const T_IRIS_OUT = [22.3, 22.9];
  const RING_T0 = 22.6;
  function sceneRing(ctx, lt) {
    const t = lt + RING_T0;
    const zs = irisScale(1 - p(t, T_IRIS_OUT[0], T_IRIS_OUT[1]));
    const n5 = nodePos(5);
    bgDark(ctx, lt + 30);
    // contração final em torno da logo
    const con = E.inOutCubic(p(lt, 1.15, 1.6));
    const R = lerp(RING.r, 168, con);
    const spin = E.inOutCubic(p(lt, 1.0, 1.65)) * deg(120);
    ctx.save();
    if (zs > 1) { ctx.translate(n5.x, n5.y); ctx.scale(zs, zs); ctx.translate(-n5.x, -n5.y); }
    circle(ctx, RING.x, RING.y, R); stroke(ctx, C.line2, 5);
    // arco percorrido: 01→06 aceso; 06→01 se completa agora
    const close = E.inOutCubic(p(lt, 0.3, 0.85));
    ctx.save(); glow(ctx, C.lime, 28);
    ctx.beginPath(); ctx.arc(RING.x, RING.y, R, -Math.PI / 2 + spin, -Math.PI / 2 + spin + deg(300 + 60 * close)); stroke(ctx, C.lime, 9 + 3 * con);
    ctx.restore();
    for (let k = 0; k < 6; k++) {
      const a = nodeAng(k) + spin;
      const x = RING.x + Math.cos(a) * R, y = RING.y + Math.sin(a) * R;
      const pulse = k === 0 ? kick(lt, 0.85, 0.5) : 0;
      const s = (1 - E.inBack(p(lt, 1.15 + k * 0.03, 1.45 + k * 0.03))) * (1 + 0.3 * pulse);
      if (s <= 0.01) continue;
      circle(ctx, x, y, NODE_R * s); fill(ctx, C.lime);
      txt(ctx, String(k + 1).padStart(2, '0'), x, y + 7, { size: 20, weight: 800, color: C.ink, align: 'center', alpha: s });
      const lr = RING.r + 56, la = nodeAng(k);
      const cs = Math.cos(la);
      const align = cs > 0.3 ? 'left' : cs < -0.3 ? 'right' : 'center';
      const yoff = k === 0 ? -6 : k === 3 ? 30 : 10;
      const fadeL = 1 - p(lt, 0.95, 1.2);
      if (k !== 0 || lt < 0.85) {
        txt(ctx, STATIONS[k], RING.x + Math.cos(la) * lr + (align === 'left' ? -14 : align === 'right' ? 14 : 0), RING.y + Math.sin(la) * lr + yoff,
          { size: 28, weight: 800, color: C.lime, align, ls: 3, alpha: fadeL * (k === 0 ? 1 - p(lt, 0.8, 0.9) : 1) });
      }
    }
    // o ponto completa a volta (06 → 01)
    if (lt > 0.25 && lt < 0.95) {
      const a = nodeAng(5) + close * deg(60);
      ctx.save(); glow(ctx, C.lime, 40);
      circle(ctx, RING.x + Math.cos(a) * RING.r, RING.y + Math.sin(a) * RING.r, 18); fill(ctx, C.lime);
      ctx.restore();
    }
    // logo no centro
    const lg = ctx.createRadialGradient(RING.x, RING.y, 120, RING.x, RING.y, 320);
    lg.addColorStop(0, rgba(C.lime, 0.16 + 0.2 * con)); lg.addColorStop(1, rgba(C.lime, 0));
    ctx.fillStyle = lg; ctx.fillRect(RING.x - 320, RING.y - 320, 640, 640);
    logo(ctx, RING.x, RING.y, 300);
    ctx.restore();
    // quarto livre de novo
    const la = p(lt, 0.82, 1.0), lo = p(lt, 1.25, 1.42);
    if (la > 0 && lo < 1) {
      statusPill(ctx, 540, RING.y - RING.r - 74, ST.LIVRE, { h: 82, fs: 32, scale: E.outBack(la) * (1 - E.inBack(lo)) });
    }
    headline(ctx, lt, [[{ s: 'E o ciclo' }], [{ s: 'recomeça.', color: C.lime }]], { x: 540, y: 470, align: 'center', size: 120, color: C.white, tin: 0.15, tout: 1.45 });
  }

  // =====================================================================
  // ASSINATURA (verde-limão): logo, nome, frase e CTA
  // =====================================================================
  const END_T0 = 24.5;
  function sceneEnd(ctx, lt) {
    ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W, H);
    // textura sutil de pontos
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let y = 30; y < H; y += 60) for (let x = 30; x < W; x += 60) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); }
    ctx.restore();
    const mv = E.inOutCubic(p(lt, 0.15, 0.85));
    const lx = 540, ly = lerp(RING.y, 740, mv), d = lerp(300, 440, mv);
    // órbita com as 6 etapas
    const oa = E.outCubic(p(lt, 0.55, 1.0));
    if (oa > 0) {
      const R = d / 2 + 46 * oa;
      ctx.save(); ctx.globalAlpha = oa;
      circle(ctx, lx, ly, R); stroke(ctx, C.ink, 4);
      for (let k = 0; k < 6; k++) {
        const a = nodeAng(k) + lt * 0.35;
        circle(ctx, lx + Math.cos(a) * R, ly + Math.sin(a) * R, 11); fill(ctx, C.ink);
      }
      ctx.restore();
    }
    logo(ctx, lx, ly, d, { scale: 1 + 0.04 * kick(lt, 0.0, 0.5) });
    // nome
    const na = p(lt, 0.7, 1.2);
    if (na > 0) {
      const w1 = tw(ctx, 'FAZLO ', DISPLAY, 128, 900, -3), w2 = tw(ctx, 'Hospeda', DISPLAY, 128, 700, -3);
      riseLine(ctx, [{ s: 'FAZLO ' }], 540 - (w1 + w2) / 2, 1150, na, 0, { size: 128, weight: 900, color: C.ink, ls: -3 });
      riseLine(ctx, [{ s: 'Hospeda' }], 540 - (w1 + w2) / 2 + w1, 1150, p(lt, 0.78, 1.28), 0, { size: 128, weight: 700, color: C.ink, ls: -3 });
    }
    riseLine(ctx, [{ s: 'Da reserva ao caixa,' }], 540, 1260, p(lt, 0.95, 1.45), 0, { size: 64, weight: 700, color: C.ink, align: 'center', ls: -1 });
    riseLine(ctx, [{ s: 'tudo conectado.' }], 540, 1334, p(lt, 1.05, 1.55), 0, { size: 64, weight: 700, color: C.ink, align: 'center', ls: -1 });
    // CTA
    const ca = p(lt, 1.45, 1.8);
    if (ca > 0) {
      const label = 'SAIBA MAIS NO LINK DA BIO';
      const w = tw(ctx, label, MONO, 30, 800, 3) + 96;
      const s = E.outBack(ca) * (1 + 0.03 * Math.sin(Math.max(0, lt - 2) * 4.2));
      ctx.save(); ctx.translate(540, 1462); ctx.scale(s, s);
      rr(ctx, -w / 2, -44, w, 88, 44); fill(ctx, C.ink);
      txt(ctx, label, -w / 2 + 48, 11, { size: 30, weight: 800, color: C.lime, ls: 3 });
      ctx.restore();
    }
  }

  // =====================================================================
  // LINHA DO TEMPO + TRANSIÇÕES
  // =====================================================================
  // cortes (s): abertura | 01 | 02 | 03 | 04 | 05 | 06 | anel | assinatura
  const CUT = [0, 5.3, 8.5, 11.0, 14.0, 17.0, 19.5, RING_T0, END_T0, DURATION];
  const SCENES = [sceneOpen, st1, st2, st3, st4, st5, st6, sceneRing, sceneEnd];
  const TRANS = [
    { i: 0, type: 'irisIn', a: T_IRIS_IN[0], b: T_IRIS_IN[1] },
    { i: 1, type: 'whip', a: 8.3, b: 8.7 },
    { i: 2, type: 'whip', a: 10.8, b: 11.2 },
    { i: 3, type: 'whip', a: 13.8, b: 14.2 },
    { i: 4, type: 'whip', a: 16.8, b: 17.2 },
    { i: 5, type: 'whip', a: 19.3, b: 19.7 },
    { i: 6, type: 'irisOut', a: T_IRIS_OUT[0], b: T_IRIS_OUT[1] },
    { i: 7, type: 'flood', a: 24.3, b: 24.75 },
  ];

  let bufA = null, bufB = null;
  function buffers() {
    if (!bufA) {
      const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      bufA = mk(); bufB = mk();
    }
    return [bufA, bufB];
  }
  function drawScene(ctx, i, t) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    SCENES[i](ctx, t - CUT[i]);
    ctx.restore();
  }
  function toBuffer(buf, i, t) { const c = buf.getContext('2d'); drawScene(c, i, t); return buf; }

  function renderAt(ctx, t) {
    t = clamp(t, 0, DURATION - 1e-4);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const tr of TRANS) {
      if (t < tr.a || t >= tr.b) continue;
      const u = (t - tr.a) / (tr.b - tr.a);
      const [A, B] = buffers();
      if (tr.type === 'whip') {
        toBuffer(A, tr.i, t); toBuffer(B, tr.i + 1, t);
        const X = (v) => -W * E.inOutQuart(clamp(v));
        const du = 0.5 / 60 / (tr.b - tr.a) * 3; // "obturador" exagerado = rastro de velocidade
        const n = 10;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < n; k++) {
          const uk = u + (k / (n - 1) - 0.5) * du;
          const x = X(uk);
          ctx.globalAlpha = 1 / n;
          ctx.drawImage(A, x, 0); ctx.drawImage(B, x + W, 0);
        }
        ctx.restore();
      } else if (tr.type === 'irisIn') {
        drawScene(ctx, tr.i, t);
        const s = irisScale(u), n0 = nodePos(0);
        toBuffer(B, tr.i + 1, t);
        ctx.save(); circle(ctx, n0.x, n0.y, NODE_R * s); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
        circle(ctx, n0.x, n0.y, NODE_R * s); stroke(ctx, C.lime, 8);
      } else if (tr.type === 'irisOut') {
        drawScene(ctx, tr.i + 1, t);
        const s = irisScale(1 - u), n5 = nodePos(5);
        toBuffer(A, tr.i, t);
        ctx.save(); ctx.globalAlpha = clamp((NODE_R * s - 40) / 200);
        circle(ctx, n5.x, n5.y, NODE_R * s); ctx.clip(); ctx.drawImage(A, 0, 0); ctx.restore();
        circle(ctx, n5.x, n5.y, NODE_R * s); stroke(ctx, C.lime, 8);
      } else if (tr.type === 'flood') {
        drawScene(ctx, tr.i, t);
        toBuffer(B, tr.i + 1, t);
        const r = lerp(168, 2300, E.inCubic(u));
        ctx.save(); circle(ctx, RING.x, RING.y, r); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
      }
      return;
    }
    let i = 0;
    while (i < SCENES.length - 1 && t >= CUT[i + 1]) i++;
    drawScene(ctx, i, t);
  }

  window.FAZLO2 = { renderAt, DURATION, W, H, setLogo: (img) => { LOGO = img; } };
})();
