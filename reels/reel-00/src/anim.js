/* =====================================================================
   FAZLO Hospeda — REEL 00 "Sob o mesmo teto" — 9:16 (1080x1920), 60 fps
   Motor em Canvas 2D, determinístico: renderAt(ctx, t) desenha o quadro
   exato do instante t (s). O mesmo código serve o preview em tempo real,
   o render quadro a quadro (scripts/render.cjs) e a lista de cues de som
   que a trilha usa (scripts/audio.py lê audio/cues.json).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;

  // ---------------------------------------------------------------- tempo
  // 128 BPM: 1 tempo = 0,469 s, 1 compasso = 1,875 s. A linha do tempo é
  // escrita em compassos e tempos para casar com a trilha.
  const BPM = 128, BT = 60 / BPM, BAR = 4 * BT;
  const bar = (n, beats = 0) => (n - 1) * BAR + beats * BT;
  const DURATION = 28.2;
  const T = {
    hook: 0,          // c.1      sineta + "Tem uma pousada?"
    build: bar(2),    // c.2–3    as palavras constroem a casa, o telhado fecha
    breath: bar(4),   // c.4      respiro: "Agora, a gestão também."
    drop: bar(5),     // c.5      a logo
    rooms: bar(6),    // c.6–11   seis cômodos = seis módulos
    house: bar(12),   // c.12     recuo: todos os cômodos sob o mesmo teto
    logo: bar(13),    // c.13     a casa vira a logo + pilares
    sign: bar(14),    // c.14–15  assinatura
  };

  const DISPLAY = "'R0 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'R0 Mono', 'JetBrains Mono', monospace";

  // ---------------------------------------------------------------- identidade
  // Preto + verde-limão da logo, branco, e as cores de status do próprio app.
  const C = {
    black: '#0A0A0A', void: '#050505', panel: '#161616', panel2: '#1F1F1F', line: '#262626', line2: '#3A3A3A',
    lime: '#AFFA27', limeD: '#8CD10C', limeL: '#D8FF8A',
    white: '#FFFFFF', paper: '#F2F2EC', ink: '#0A0A0A',
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
    QUIT: { label: 'QUITADO', fill: C.lime, text: C.ink, dot: C.ink },
  };

  // ---------------------------------------------------------------- utilitários
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const deg = (d) => (d * Math.PI) / 180;
  const E = {
    lin: (x) => x,
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    inQuart: (x) => x * x * x * x,
    inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
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
  function rgba(c, a) { const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${clamp(a)})`; }
  // pseudo-aleatório determinístico
  function hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const noise1 = (x, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u); };
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
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  function stroke(ctx, color, lw) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
  function fill(ctx, color) { ctx.fillStyle = color; ctx.fill(); }
  /** Brilho (sombra sem deslocamento). O raio acompanha a escala atual, para
   *  que o mesmo elemento brilhe igual em tela cheia e dentro da casa reduzida. */
  function glow(ctx, color, blur) {
    const m = ctx.getTransform();
    ctx.shadowColor = color; ctx.shadowBlur = blur * Math.hypot(m.a, m.b); ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }
  function noGlow(ctx) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
  function radial(ctx, x, y, r, color, a) {
    if (a <= 0.002) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(0.45, rgba(color, a * 0.35)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }

  // ---------------------------------------------------------------- tipografia
  function setFont(ctx, fam, size, weight, align = 'left', ls = 0) {
    ctx.font = `${weight} ${size}px ${fam}`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = ls + 'px';
  }
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, 'left', ls); return ctx.measureText(s).width; }
  /** Maior corpo (px) em que o texto cabe em maxW (títulos display com -2,5% de entreletra). */
  function fit(ctx, s, maxW, maxSize, fam = DISPLAY, weight = 900, lsr = -0.025) {
    return Math.min(maxSize, (100 * maxW) / tw(ctx, s, fam, 100, weight, 100 * lsr));
  }
  function txt(ctx, s, x, y, o) {
    setFont(ctx, o.fam || MONO, o.size, o.weight || 800, o.align || 'left', o.ls || 0);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    if (o.stroke) { ctx.strokeStyle = o.color; ctx.lineWidth = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    else { ctx.fillStyle = o.color; ctx.fillText(s, x, y); }
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
    if (o.align === 'center') { const w = tw(ctx, s, o.fam || MONO, o.size, o.weight || 800, o.ls || 0); txt(ctx, out, x - w / 2, y, Object.assign({}, o, { align: 'left' })); }
    else txt(ctx, out, x, y, o);
  }
  /** Linha de título com máscara: sobe por trás de uma linha invisível. segs: [{s, color}] */
  function riseLine(ctx, segs, x, y, pin, pout, o) {
    if (pin <= 0 || pout >= 1) return;
    const fam = o.fam || DISPLAY, size = o.size, weight = o.weight || 900, ls = o.ls ?? -size * 0.025;
    const ws = segs.map((s) => tw(ctx, s.s, s.fam || fam, size, s.weight || weight, ls));
    const total = ws.reduce((a, b) => a + b, 0);
    const left = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    const off = (1 - E.outExpo(clamp(pin))) * size * 1.3 - E.inCubic(clamp(pout)) * size * 1.3;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.beginPath(); ctx.rect(left - 80, y - size * 1.05, total + 160, size * 1.38); ctx.clip();
    let cx = left;
    segs.forEach((s, i) => {
      setFont(ctx, s.fam || fam, size, s.weight || weight, 'left', ls);
      if (s.stroke) { ctx.strokeStyle = s.color || o.color; ctx.lineWidth = s.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s.s, cx, y + off); }
      else { ctx.fillStyle = s.color || o.color; ctx.fillText(s.s, cx, y + off); }
      cx += ws[i];
    });
    ctx.restore();
    return total;
  }
  /** Dígitos que rolam até o valor final (fonte mono = larguras iguais). */
  function rollText(ctx, s, x, y, u, o) {
    const size = o.size, cw = tw(ctx, '0', MONO, size, o.weight || 800, 0);
    const adv = (ch) => (ch === ':' || ch === ',' || ch === '.' ? cw * 0.55 : cw);
    const total = [...s].reduce((a, ch) => a + adv(ch), 0);
    const left = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
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
      const pos = (d + 20) * ui;
      const k = Math.floor(pos), f = pos - k;
      const step = size * 1.05;
      ctx.fillText(String(k % 10), cx, y - f * step);
      ctx.fillText(String((k + 1) % 10), cx, y + (1 - f) * step);
    }
    ctx.restore();
    return total;
  }

  // ---------------------------------------------------------------- etiquetas
  function pillWidth(ctx, label, h, fs) { return h * 0.42 + h * 0.26 + h * 0.2 + tw(ctx, label, MONO, fs, 800, fs * 0.06) + h * 0.45; }
  function statusPill(ctx, x, y, st, o = {}) {
    const h = o.h || 64, fs = o.fs || h * 0.4, sc = o.scale ?? 1, alpha = o.alpha ?? 1;
    const label = o.label || st.label;
    const w = pillWidth(ctx, label, h, fs);
    if (sc <= 0.001 || alpha <= 0.001) return w;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.scale(sc, sc);
    const x0 = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2;
    rr(ctx, x0, -h / 2, w, h, h / 2); fill(ctx, o.fill || st.fill);
    if (st.border) { rr(ctx, x0, -h / 2, w, h, h / 2); stroke(ctx, st.border, Math.max(2, h * 0.06)); }
    const dx = x0 + h * 0.55;
    circle(ctx, dx, 0, h * 0.13);
    if (st.hollow) stroke(ctx, st.dot, h * 0.05); else fill(ctx, st.dot);
    txt(ctx, label, dx + h * 0.33, fs * 0.36, { size: fs, weight: 800, color: st.text, ls: fs * 0.06 });
    ctx.restore();
    return w;
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

  // ---------------------------------------------------------------- ícones (traço contínuo)
  // Caixa unitária (-0.5..0.5). k = {line, accent, lw}.
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
        ctx.restore();
      }
      ctx.beginPath(); ctx.ellipse(0, 0.28, 0.47, 0.12, 0, 0, Math.PI); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.47, 0.28); ctx.lineTo(0.47, 0.28); stroke(ctx, k.line, k.lw);
    },
    mountain(ctx, k) {
      circle(ctx, 0.27, -0.3, 0.09); fill(ctx, k.accent);
      ctx.beginPath(); ctx.moveTo(-0.47, 0.36); ctx.lineTo(-0.1, -0.24); ctx.lineTo(0.27, 0.36); ctx.closePath(); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(0.08, 0.06); ctx.lineTo(0.24, -0.14); ctx.lineTo(0.47, 0.36); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.5, 0.36); ctx.lineTo(0.5, 0.36); stroke(ctx, k.line, k.lw);
    },
    login(ctx, k) {
      ctx.beginPath(); ctx.moveTo(0.06, -0.42); ctx.lineTo(0.28, -0.42); ctx.quadraticCurveTo(0.42, -0.42, 0.42, -0.28); ctx.lineTo(0.42, 0.28);
      ctx.quadraticCurveTo(0.42, 0.42, 0.28, 0.42); ctx.lineTo(0.06, 0.42); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.44, 0); ctx.lineTo(0.18, 0); ctx.moveTo(-0.03, -0.21); ctx.lineTo(0.18, 0); ctx.lineTo(-0.03, 0.21); stroke(ctx, k.accent || k.line, k.lw);
    },
    logout(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.06, -0.42); ctx.lineTo(-0.28, -0.42); ctx.quadraticCurveTo(-0.42, -0.42, -0.42, -0.28); ctx.lineTo(-0.42, 0.28);
      ctx.quadraticCurveTo(-0.42, 0.42, -0.28, 0.42); ctx.lineTo(-0.06, 0.42); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.16, 0); ctx.lineTo(0.44, 0); ctx.moveTo(0.23, -0.21); ctx.lineTo(0.44, 0); ctx.lineTo(0.23, 0.21); stroke(ctx, k.accent || k.line, k.lw);
    },
    up(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.3, 0.3); ctx.lineTo(0.3, -0.3); ctx.moveTo(-0.06, -0.3); ctx.lineTo(0.3, -0.3); ctx.lineTo(0.3, 0.06); stroke(ctx, k.line, k.lw);
    },
    down(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.3, -0.3); ctx.lineTo(0.3, 0.3); ctx.moveTo(0.3, -0.06); ctx.lineTo(0.3, 0.3); ctx.lineTo(-0.06, 0.3); stroke(ctx, k.line, k.lw);
    },
    plus(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.3, 0); ctx.lineTo(0.3, 0); ctx.moveTo(0, -0.3); ctx.lineTo(0, 0.3); stroke(ctx, k.line, k.lw);
    },
  };
  function icon(ctx, name, x, y, size, o = {}) {
    const sc = o.scale ?? 1, alpha = o.alpha ?? 1;
    if (sc <= 0.001 || alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(size * sc, size * sc);
    ICONS[name](ctx, { line: o.line || C.white, accent: o.accent || C.lime, lw: (o.lw || 7) / size });
    ctx.restore();
  }

  // ---------------------------------------------------------------- logo (imagem fornecida, sem alteração)
  let LOGO = null;
  const LOGO_N = 1222;          // lado da imagem fazlo-hospeda-logo-alpha.png (px)
  function logo(ctx, x, y, d, o = {}) {
    const sc = o.scale ?? 1, alpha = o.alpha ?? 1;
    if (sc <= 0.001 || alpha <= 0.001) return;
    const D = d * sc;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (LOGO) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(LOGO, x - D / 2, y - D / 2, D, D); }
    else { circle(ctx, x, y, D / 2); fill(ctx, C.black); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- o telhado
  // Geometria medida na própria arte da logo (pixels da imagem de 1222 px, aqui
  // chamados de "unidades L"): telhado esquerdo + parede em branco, telhado direito
  // em limão, inclinação de ~33°. É o elemento gráfico que costura o filme e
  // permite o encaixe exato da casa animada na logo oficial no final.
  const ROOF_LIME = [[614.6, 254], [1019.5, 520.5], [1019.5, 633.5], [614.6, 375]];
  const roofWhite = (wallB) => [[615.2, 254.5], [206, 516], [206, wallB], [301.5, wallB], [301.5, 568], [615.2, 375]];
  const WALL_LOGO = 867;
  // limites internos (embaixo do telhado, à direita da parede)
  const innerL = (y) => (y < 568 ? 614.5 - (y - 375) / 0.6166 : 301.5);
  const innerR = (y) => (y < 633.5 ? 615 + (y - 375) / 0.6413 : 1019.5);
  /** Desenha telhado + parede em unidades L (o chamador aplica a transformação). */
  function houseFrame(ctx, o = {}) {
    const wallB = o.wall ?? WALL_LOGO, a = o.alpha ?? 1;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    const wp = roofWhite(wallB);
    if (o.wallGrow !== undefined) wp[2][1] = wp[3][1] = lerp(516, wallB, o.wallGrow);
    poly(ctx, wp); fill(ctx, o.white || C.white);
    poly(ctx, ROOF_LIME); fill(ctx, o.lime || C.lime);
    ctx.restore();
  }

  // ---------------------------------------------------------------- partículas e câmera
  /** Explosão determinística de partículas (dt = tempo desde o disparo). */
  function burst(ctx, x, y, dt, o) {
    if (dt < 0 || dt > o.life) return;
    ctx.save();
    for (let i = 0; i < o.n; i++) {
      const seed = o.seed || 0;
      const a = o.spread !== undefined ? o.a0 + o.spread * (hash(i, seed) - 0.5) : TAU * hash(i, seed);
      const v = lerp(o.v0, o.v1, Math.pow(hash(i, seed + 1), 0.7));
      const kd = o.drag ?? 3;
      const life = o.life * lerp(0.55, 1, hash(i, seed + 2));
      const u = dt / life;
      if (u >= 1) continue;
      const d = (v / kd) * (1 - Math.exp(-kd * dt));
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + (o.g || 0) * dt * dt * 0.5;
      const s = lerp(o.s0, o.s1, hash(i, seed + 3)) * (1 - u * 0.5);
      ctx.globalAlpha = (o.alpha ?? 1) * (1 - u * u);
      ctx.fillStyle = o.colors[i % o.colors.length];
      if (hash(i, seed + 4) < (o.squares ?? 0.5)) {
        ctx.save(); ctx.translate(px, py); ctx.rotate(a + dt * 6 * (hash(i, seed + 5) - 0.5)); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
      } else { ctx.beginPath(); ctx.arc(px, py, s / 2, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  // impactos que sacodem a câmera: [instante, amplitude (px), duração]
  const SHAKES = [];
  function shakeAt(t) {
    let x = 0, y = 0, r = 0;
    for (const [t0, amp, dur] of SHAKES) {
      if (t < t0 || t > t0 + dur * 1.6) continue;
      const k = Math.exp(-((t - t0) / dur) * 4) * amp, f = (t - t0) * 38;
      x += k * noise1(f, 11); y += k * noise1(f, 23); r += k * 0.0009 * noise1(f, 37);
    }
    return { x, y, r };
  }
  function applyShake(ctx, t, s = 1) {
    const k = shakeAt(t);
    ctx.translate(W / 2 + k.x * s, H / 2 + k.y * s); ctx.rotate(k.r * s); ctx.translate(-W / 2, -H / 2);
  }

  // ---------------------------------------------------------------- fundos
  const PATS = new WeakMap();
  function dotPattern(ctx, dark) {
    let pp = PATS.get(ctx);
    if (!pp) {
      const mk = (dot) => { const c = document.createElement('canvas'); c.width = c.height = 60; const g = c.getContext('2d'); g.fillStyle = dot; g.beginPath(); g.arc(30, 30, 2.4, 0, TAU); g.fill(); return ctx.createPattern(c, 'repeat'); };
      pp = { dark: mk('#191919'), lime: mk('rgba(0,0,0,0.085)') };
      PATS.set(ctx, pp);
    }
    return dark ? pp.dark : pp.lime;
  }
  function bgDots(ctx, dark, drift, w = W, h = H) {
    ctx.fillStyle = dark ? C.black : C.lime; ctx.fillRect(0, 0, w, h);
    const pat = dotPattern(ctx, dark);
    pat.setTransform(new DOMMatrix().translateSelf(0, -((drift * 14) % 60)));
    ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
  }
  function vignette(ctx, a = 0.6) {
    const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.22, W / 2, H * 0.5, H * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  // ---------------------------------------------------------------- cues de som
  // Cada evento visual relevante registra um cue; scripts/audio.py posiciona os
  // efeitos exatamente nesses instantes.
  const CUES = [];
  const cue = (t, type, o = {}) => CUES.push(Object.assign({ t: Math.round(t * 1e4) / 1e4, type }, o));

  // =====================================================================
  // 1) GANCHO (0 – 1,875 s): a sineta da recepção + "Tem uma pousada?"
  // =====================================================================
  const DINGS = [0.04, 0.27];
  const BELL = { x: 540, y: 1330, w: 600 };
  let HOOKT = null;   // medidas do título (dependem da fonte)
  const ZOOM_IN = [1.4, T.build];
  function layoutHook(ctx) {
    const s = 'pousada?', size = fit(ctx, s, 920, 240), ls = -size * 0.025, y = 830;
    const w = tw(ctx, s, DISPLAY, size, 900, ls), left = 540 - w / 2;
    const wp = tw(ctx, 'p', DISPLAY, size, 900, ls);
    setFont(ctx, DISPLAY, size, 900, 'left', ls);
    const m = ctx.measureText('o');
    const inkL = left + wp - m.actualBoundingBoxLeft, inkR = left + wp + m.actualBoundingBoxRight;
    const top = y - m.actualBoundingBoxAscent, bot = y + m.actualBoundingBoxDescent;
    HOOKT = { size, y, left, w, o: { x: (inkL + inkR) / 2, y: (top + bot) / 2, rx: (inkR - inkL) * 0.17, ry: (bot - top) * 0.24 } };
  }
  /** Sineta de recepção (campainha de balcão): base em perspectiva, cúpula,
   *  haste e botão. (x, y) = centro da base da cúpula; w = largura da base. */
  function drawBell(ctx, x, y, w, press, wob) {
    ctx.save(); ctx.translate(x, y); ctx.scale(w, w);
    // sombra no balcão
    ctx.beginPath(); ctx.ellipse(0, 0.2, 0.56, 0.07, 0, 0, TAU); fill(ctx, 'rgba(0,0,0,0.55)');
    // base: cilindro baixo visto de leve por cima
    ctx.beginPath(); ctx.ellipse(0, 0.12, 0.5, 0.09, 0, 0, Math.PI); ctx.lineTo(-0.5, 0.04); ctx.ellipse(0, 0.04, 0.5, 0.09, 0, Math.PI, 0, true); ctx.closePath();
    fill(ctx, '#181818');
    ctx.beginPath(); ctx.ellipse(0, 0.04, 0.5, 0.09, 0, 0, TAU); fill(ctx, '#2C2C2C');
    ctx.beginPath(); ctx.ellipse(0, 0.04, 0.5, 0.09, 0, deg(200), deg(340)); stroke(ctx, 'rgba(255,255,255,0.18)', 0.012);
    // cúpula (vibra quando toca)
    ctx.save(); ctx.translate(0, 0.04); ctx.scale(1 + wob, 1 - wob * 0.7);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.36, 0.06, 0, 0, TAU); fill(ctx, C.limeD);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.36, 0.34, 0, Math.PI, TAU); ctx.ellipse(0, 0, 0.36, 0.06, 0, 0, Math.PI); ctx.closePath();
    const g = ctx.createLinearGradient(-0.36, -0.3, 0.36, 0.05);
    g.addColorStop(0, C.limeL); g.addColorStop(0.35, C.lime); g.addColorStop(1, C.limeD);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 0.27, 0.25, 0, deg(200), deg(252)); stroke(ctx, 'rgba(255,255,255,0.95)', 0.035);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.28, 0, deg(268), deg(276)); stroke(ctx, 'rgba(255,255,255,0.7)', 0.03);
    ctx.restore();
    // haste + botão (desce quando a sineta é tocada)
    const py = 0.06 * press;
    rr(ctx, -0.022, -0.43 + py, 0.044, 0.14, 0.01); fill(ctx, '#D9D9D2');
    ctx.beginPath(); ctx.ellipse(0, -0.44 + py, 0.1, 0.034, 0, 0, TAU); fill(ctx, '#E9E9E3');
    ctx.beginPath(); ctx.ellipse(0, -0.455 + py, 0.1, 0.034, 0, 0, TAU); fill(ctx, C.white);
    ctx.restore();
  }
  function sceneHook(ctx, t) {
    bgDots(ctx, true, t);
    const dk = Math.max(...DINGS.map((d, i) => kick(t, d, 0.5) * (i ? 0.6 : 1)));
    radial(ctx, BELL.x, BELL.y - 90, 900, C.lime, 0.10 + 0.22 * dk);
    vignette(ctx, 0.55);
    const zu = p(t, ZOOM_IN[0], ZOOM_IN[1]);
    const Z = Math.exp(Math.log(90) * E.inCubic(zu));
    const o = HOOKT.o;
    ctx.save();
    applyShake(ctx, t);
    if (Z > 1.0001) { ctx.translate(o.x, o.y); ctx.scale(Z, Z); ctx.translate(-o.x, -o.y); }

    // sineta: entra já em movimento no quadro 0, toca duas vezes
    const enter = E.outBack(p(t, -0.12, 0.2), 1.4);
    let press = 0;
    for (const d of DINGS) press = Math.max(press, p(t, d - 0.035, d) * (1 - p(t, d + 0.04, d + 0.12)));
    const wob = DINGS.reduce((a, d, i) => a + (t > d ? 0.035 * Math.sin((t - d) * TAU * 11) * Math.exp(-(t - d) * 6) * (i ? 0.7 : 1) : 0), 0);
    // ondas sonoras
    DINGS.forEach((d, i) => {
      for (let j = 0; j < 3; j++) {
        const u = p(t, d + j * 0.07, d + j * 0.07 + 0.75);
        if (u <= 0 || u >= 1) continue;
        const r = BELL.w * lerp(0.46, 1.0, E.outCubic(u)), cy = BELL.y - BELL.w * 0.16;
        ctx.save(); ctx.globalAlpha = (1 - u) * (i ? 0.7 : 1);
        ctx.beginPath(); ctx.arc(BELL.x, cy, r, deg(180 - 32), deg(180 + 32)); stroke(ctx, C.lime, 12 * (1 - u) + 2);
        ctx.beginPath(); ctx.arc(BELL.x, cy, r, deg(-32), deg(32)); stroke(ctx, C.lime, 12 * (1 - u) + 2);
        ctx.restore();
      }
    });
    const ring = p(t, DINGS[0], DINGS[0] + 0.7);
    if (ring > 0 && ring < 1) { circle(ctx, BELL.x, BELL.y - 100, lerp(120, 1100, E.outCubic(ring))); stroke(ctx, rgba(C.lime, (1 - ring) * 0.55), 6); }
    const drop = E.inCubic(p(t, 1.15, 1.6));
    drawBell(ctx, BELL.x, BELL.y + drop * 900, BELL.w * lerp(0.75, 1, enter), press, wob);

    // título
    riseLine(ctx, [{ s: 'Tem uma' }], 540, 590, p(t, 0.1, 0.55), 0, { size: 120, weight: 800, color: C.white, align: 'center' });
    const sl = p(t, BT - 0.02, BT + 0.22);
    if (sl > 0) {
      const sc = lerp(1.7, 1, E.outExpo(sl)) * (1 + 0.05 * kick(t, BT + 0.16, 0.3));
      ctx.save();
      ctx.globalAlpha = clamp(sl * 4);
      ctx.translate(540, HOOKT.y - HOOKT.size * 0.36); ctx.scale(sc, sc); ctx.translate(-540, -(HOOKT.y - HOOKT.size * 0.36));
      txt(ctx, 'pousada?', HOOKT.left, HOOKT.y, { fam: DISPLAY, size: HOOKT.size, weight: 900, color: C.lime, ls: -HOOKT.size * 0.025 });
      ctx.restore();
    }
    // sublinhado no 3º tempo
    const ul = E.inOutCubic(p(t, 2 * BT, 2 * BT + 0.28));
    if (ul > 0) {
      const x0 = HOOKT.left + 6, x1 = HOOKT.left + HOOKT.w - 20;
      ctx.beginPath(); ctx.moveTo(x0, HOOKT.y + 44); ctx.lineTo(lerp(x0, x1, ul), HOOKT.y + 44); stroke(ctx, C.white, 14);
    }
    ctx.restore();

    // através do "o": a próxima cena aparece dentro do miolo da letra
    if (Z > 6) {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(o.x, o.y, o.rx * Z, o.ry * Z, 0, 0, TAU); ctx.clip();
      sceneBuild(ctx, t - T.build);
      ctx.restore();
    }
  }

  // =====================================================================
  // 2) CASA DE PALAVRAS (1,875 – 7,5 s): o dia a dia de uma pousada cai,
  //    palavra por palavra, e forma uma casa. O telhado fecha: "Tudo acontece
  //    sob o mesmo teto." Respiro: "Agora, a gestão também." Implosão.
  // =====================================================================
  // Termos que aparecem nas telas do produto. k: d = display, m = mono, p = pílulas.
  const WORDS = [
    { s: 'PIX', k: 'd', c: C.lime },
    { s: 'CAIXA', k: 'd' },
    { s: 'CHECK-IN', k: 'd' },
    { s: 'COMANDAS', k: 'd', c: C.lime },
    { s: 'RESERVAS', k: 'd' },
    { s: 'ENTRADA 14:15 · SAÍDA 12:00', k: 'm' },
    { k: 'p', pills: ['CONF', 'HOSP', 'PRE'] },
    { s: 'HÓSPEDES', k: 'd' },
    { s: 'SINAL · CARTÃO · DINHEIRO', k: 'm', c: C.lime },
    { s: 'CHECK-OUT', k: 'd' },
    { s: 'FRIGOBAR · CAFÉ · PASSEIO', k: 'm' },
    { s: 'PAGAMENTOS', k: 'd', c: C.lime },
  ];
  const ROOF_T = BAR + 2 * BT;   // telhado bate no 3º tempo do compasso 3 (2,8125 s após o início da cena)
  let HOUSE = null;
  function pillsNat(ctx, keys, h) { return keys.reduce((a, k) => a + pillWidth(ctx, ST[k].label, h, h * 0.4), 0) + (keys.length - 1) * h * 0.25; }
  function layoutHouse(ctx) {
    const PAD = 14, rows = [];
    let y = 418;
    for (const w of WORDS) {
      const x0 = innerL(y) + PAD, x1 = innerR(y) - PAD, avail = x1 - x0;
      let size, h;
      if (w.k === 'd') { size = (100 * avail) / tw(ctx, w.s, DISPLAY, 100, 900, -2.5); h = size * 0.727; }
      else if (w.k === 'm') { size = (100 * avail) / tw(ctx, w.s, MONO, 100, 800, 6); h = size * 0.73; }
      else { size = (100 * avail) / pillsNat(ctx, w.pills, 100); h = size; }
      rows.push(Object.assign({}, w, { x0, x1, size, top: y, base: w.k === 'p' ? y + h / 2 : y + h, h }));
      y += h + Math.max(9, size * (w.k === 'd' ? 0.12 : 0.2));
    }
    const bottom = y + 4;
    // encaixa a casa (bbox L: x 206–1019,5, y 254–bottom) na área da tela
    const s = Math.min(900 / 813.5, 1000 / (bottom - 254));
    const ox = 540 - ((206 + 1019.5) / 2) * s, oy = 545 - 254 * s;
    const n = rows.length;
    // as linhas caem de baixo para cima, em colcheias
    const land = rows.map((_, i) => (n - 1 - i) * (BT / 2));
    HOUSE = { rows, bottom, s, ox, oy, land, n };
  }
  const HX = (x) => HOUSE.ox + x * HOUSE.s, HY = (y) => HOUSE.oy + y * HOUSE.s;

  function drawRow(ctx, r, alpha, gray) {
    const s = HOUSE.s, x0 = HX(r.x0);
    const col = (c) => (gray ? mix(c, '#3A3A3A', gray) : c);
    if (r.k === 'd') txt(ctx, r.s, x0, HY(r.base), { fam: DISPLAY, size: r.size * s, weight: 900, color: col(r.c || C.white), ls: -r.size * s * 0.025, alpha });
    else if (r.k === 'm') txt(ctx, r.s, x0, HY(r.base), { size: r.size * s, weight: 800, color: col(r.c || C.grayL), ls: r.size * s * 0.06, alpha });
    else {
      const h = r.size * s;
      let x = x0;
      for (const k of r.pills) {
        const st = ST[k];
        const wv = statusPill(ctx, x, HY(r.base), gray ? Object.assign({}, st, { fill: mix(st.fill, '#2A2A2A', gray), text: col(st.text), border: st.border && col(st.border), dot: col(st.dot) }) : st, { h, align: 'left', alpha });
        x += wv + h * 0.25;
      }
    }
  }
  function sceneBuild(ctx, lt) {
    bgDots(ctx, true, lt + 3);
    vignette(ctx, 0.5);
    const Hs = HOUSE, s = Hs.s;
    const t = lt + T.build;
    const brU = p(lt, BAR * 2 - 0.03, BAR * 2 + 0.3), br = E.inOutCubic(brU);     // respiro
    const imp = p(lt, BAR * 2 + 2.75 * BT, BAR * 3);                               // implosão
    const ie = E.inCubic(imp);
    const CX = 540, CY = 960;

    ctx.save();
    applyShake(ctx, t);
    // câmera: aproximação lenta durante a construção, recua no respiro
    const cz = (1 + 0.035 * E.inOutSine(p(lt, 0, 2 * BAR))) * (1 - 0.08 * br);
    ctx.translate(CX, CY); ctx.scale(cz, cz); ctx.translate(-CX, -CY);

    // linhas de palavras
    const bump = Hs.land.reduce((a, tl) => a + 6 * kick(lt, tl, 0.14), 0) + 10 * kick(lt, ROOF_T, 0.2);
    for (let i = 0; i < Hs.n; i++) {
      const r = Hs.rows[i], tl = Hs.land[i];
      const u = p(lt, tl - 0.3, tl);
      if (u <= 0) continue;
      const rx = (HX(r.x0) + HX(r.x1)) / 2, ry = HY(r.top + r.h);   // pivô: base central
      const fall = (1 - Math.pow(u, 2.2)) * (ry + 260);
      const k = kick(lt, tl, 0.2);
      let sx = 1 + 0.12 * k - 0.06 * (u < 1 ? u * u : 0), sy = 1 - 0.3 * k + 0.2 * (u < 1 ? u * u : 0);
      ctx.save();
      // implosão: cada linha é sugada para o centro girando
      let alpha = 1 - 0.84 * br;
      if (ie > 0) {
        const mx = lerp(rx, CX, ie), my = lerp(ry, CY, ie);
        ctx.translate(mx - rx, my - ry);
        ctx.translate(rx, ry); ctx.rotate((i % 2 ? 1 : -1) * ie * 1.3); ctx.translate(-rx, -ry);
        sx *= 1 - 0.95 * ie; sy *= 1 - 0.95 * ie;
        alpha *= 1 - p(imp, 0.75, 1);
      }
      ctx.translate(rx, ry - fall + (u >= 1 ? bump * (1 - ie) : 0)); ctx.scale(sx, sy); ctx.translate(-rx, -ry);
      drawRow(ctx, r, alpha, br * 0.85);
      ctx.restore();
      // poeira na aterrissagem
      const dt = lt - tl;
      if (dt > 0 && dt < 0.5 && ie <= 0) {
        const xl = HX(r.x0), xr = HX(r.x1);
        burst(ctx, xl, ry, dt, { n: 7, seed: i * 7 + 1, a0: deg(200), spread: deg(50), v0: 180, v1: 520, drag: 5, g: 600, life: 0.45, s0: 4, s1: 10, colors: [C.white, C.lime], alpha: 0.8 });
        burst(ctx, xr, ry, dt, { n: 7, seed: i * 7 + 3, a0: deg(-20), spread: deg(50), v0: 180, v1: 520, drag: 5, g: 600, life: 0.45, s0: 4, s1: 10, colors: [C.white, C.lime], alpha: 0.8 });
      }
    }

    // telhado: cai do alto e fecha a casa; a parede desce em seguida
    const ru = p(lt, ROOF_T - 0.26, ROOF_T);
    if (ru > 0) {
      const fall = (1 - Math.pow(ru, 2.4)) * 1150;
      const k = kick(lt, ROOF_T, 0.25);
      const hx = 540, hy = HY(254);
      ctx.save();
      let a = 1 - 0.55 * br;
      if (ie > 0) {
        const my = lerp(HY(560), CY, ie);
        ctx.translate(0, my - HY(560));
        ctx.translate(hx, HY(560)); ctx.rotate(ie * 0.9); ctx.scale(1 - 0.96 * ie, 1 - 0.96 * ie); ctx.translate(-hx, -HY(560));
        a *= 1 - p(imp, 0.75, 1);
      }
      ctx.translate(hx, hy - fall); ctx.scale(1 + 0.04 * k, 1 - 0.1 * k); ctx.translate(-hx, -hy);
      ctx.translate(HOUSE.ox, HOUSE.oy); ctx.scale(s, s);
      houseFrame(ctx, { wall: Hs.bottom, wallGrow: E.outCubic(p(lt, ROOF_T + 0.02, ROOF_T + 0.3)), alpha: a });
      ctx.restore();
      if (lt > ROOF_T && ie <= 0) {
        const dt = lt - ROOF_T;
        burst(ctx, HX(206), HY(516), dt, { n: 16, seed: 91, a0: deg(200), spread: deg(70), v0: 300, v1: 900, drag: 4, g: 700, life: 0.6, s0: 5, s1: 13, colors: [C.white, C.grayL], alpha: 0.9 });
        burst(ctx, HX(1019.5), HY(633), dt, { n: 16, seed: 97, a0: deg(-20), spread: deg(70), v0: 300, v1: 900, drag: 4, g: 700, life: 0.6, s0: 5, s1: 13, colors: [C.lime, C.limeL], alpha: 0.9 });
        // clarão ao longo do telhado
        const fl = kick(lt, ROOF_T, 0.3);
        if (fl > 0.02) {
          ctx.save(); ctx.globalAlpha = fl * 0.8; ctx.translate(HOUSE.ox, HOUSE.oy - 14 * (1 - fl)); ctx.scale(s, s);
          glow(ctx, C.lime, 60); poly(ctx, ROOF_LIME); stroke(ctx, C.limeL, 6 / s); noGlow(ctx);
          ctx.restore();
        }
      }
    }
    // ponto que suga tudo (a logo chegando)
    if (imp > 0) {
      const r = lerp(4, 46, E.inCubic(p(imp, 0.3, 1)));
      ctx.save(); glow(ctx, C.lime, 40);
      circle(ctx, CX, CY, r); fill(ctx, C.black); circle(ctx, CX, CY, r); stroke(ctx, C.lime, 6);
      ctx.restore();
    }
    ctx.restore();

    // títulos
    const tOut = BAR * 2 - 0.05;
    riseLine(ctx, [{ s: 'Tudo acontece' }], 540, 345, p(lt, 0.0, 0.5), p(lt, tOut, tOut + 0.28), { size: 104, color: C.white, align: 'center' });
    riseLine(ctx, [{ s: 'sob o mesmo ' }, { s: 'teto.', color: C.lime }], 540, 458, p(lt, ROOF_T - 0.02, ROOF_T + 0.4), p(lt, tOut + 0.05, tOut + 0.33), { size: 104, color: C.white, align: 'center' });
    // respiro: frase grande sobre a casa apagada
    const L3 = [
      { segs: [{ s: 'Agora,' }], y: 790, t: BAR * 2 },
      { segs: [{ s: 'a gestão' }], y: 990, t: BAR * 2 + BT },
      { segs: [{ s: 'também.', color: C.lime }], y: 1190, t: BAR * 2 + 2 * BT },
    ];
    if (br > 0) radial(ctx, 540, 1000, 900, '#000000', 0.55 * br);
    L3.forEach((l, i) => {
      const pin = p(lt, l.t - 0.02, l.t + 0.42);
      if (pin <= 0) return;
      const size = 196;
      ctx.save();
      if (ie > 0) {
        const ly = l.y - size * 0.36;
        ctx.translate(540, lerp(ly, CY, ie)); ctx.rotate((i - 1) * 0.8 * ie); ctx.scale(1 - 0.96 * ie, 1 - 0.96 * ie); ctx.translate(-540, -ly);
      }
      riseLine(ctx, l.segs, 540, l.y, pin, 0, { size, color: C.white, align: 'center', alpha: 1 - p(imp, 0.8, 1) });
      ctx.restore();
    });
  }

  // =====================================================================
  // 3) A LOGO (7,5 – 9,375 s): explosão, nome, categoria e mergulho para
  //    dentro da casa da logo.
  // =====================================================================
  const DROP_LOGO = { x: 540, y: 860, d: 470 };
  const DIVE = [1.44, BAR];                          // relativo a T.drop
  const DIVE_PT = [772, 588];                        // ponto preto dentro da casa (unidades L)
  function sceneDrop(ctx, lt) {
    const t = lt + T.drop;
    bgDots(ctx, true, t);
    // raios de luz girando ao fundo
    ctx.save();
    ctx.translate(DROP_LOGO.x, DROP_LOGO.y); ctx.rotate(lt * 0.25);
    const ra = 0.05 + 0.08 * kick(lt, 0, 0.8);
    for (let i = 0; i < 18; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1700, (i / 18) * TAU, (i / 18) * TAU + TAU / 36); ctx.closePath();
      ctx.fillStyle = rgba(C.lime, ra * 0.5); ctx.fill();
    }
    ctx.restore();
    vignette(ctx, 0.7);
    const du = p(lt, DIVE[0], DIVE[1]);
    const Z = Math.exp(Math.log(110) * E.inCubic(du));
    const sL = DROP_LOGO.d / LOGO_N;
    const px = DROP_LOGO.x + (DIVE_PT[0] - LOGO_N / 2) * sL, py = DROP_LOGO.y + (DIVE_PT[1] - LOGO_N / 2) * sL;
    ctx.save();
    applyShake(ctx, t);
    if (Z > 1.0001) { ctx.translate(px, py); ctx.scale(Z, Z); ctx.translate(-px, -py); }
    const beat = Math.floor(lt / BT), pulse = lt > 0 ? kick(lt, beat * BT, 0.22) : 0;
    radial(ctx, DROP_LOGO.x, DROP_LOGO.y, 520, C.lime, 0.42 * kick(lt, 0, 0.9) + 0.18 + 0.06 * pulse);
    // ondas de choque
    for (const [d0, w0] of [[0, 18], [0.09, 8], [0.2, 4]]) {
      const u = p(lt, d0, d0 + 0.9);
      if (u <= 0 || u >= 1) continue;
      circle(ctx, DROP_LOGO.x, DROP_LOGO.y, lerp(DROP_LOGO.d * 0.5, 1500, E.outExpo(u))); stroke(ctx, rgba(C.lime, 1 - u), w0 * (1 - u) + 1);
    }
    // linhas de velocidade
    if (lt < 0.8) {
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU + hash(i, 5) * 0.12;
        const u = p(lt, hash(i, 6) * 0.05, 0.45 + hash(i, 7) * 0.3);
        if (u <= 0 || u >= 1) continue;
        const r1 = lerp(260, 1500, E.outCubic(u)), r0 = r1 - lerp(420, 40, u);
        ctx.beginPath(); ctx.moveTo(DROP_LOGO.x + Math.cos(a) * r0, DROP_LOGO.y + Math.sin(a) * r0); ctx.lineTo(DROP_LOGO.x + Math.cos(a) * r1, DROP_LOGO.y + Math.sin(a) * r1);
        stroke(ctx, i % 3 ? rgba(C.lime, 1 - u) : rgba(C.white, 1 - u), lerp(7, 2, u));
      }
    }
    burst(ctx, DROP_LOGO.x, DROP_LOGO.y, lt, { n: 90, seed: 3, v0: 500, v1: 2600, drag: 3.2, life: 1.3, s0: 5, s1: 18, colors: [C.lime, C.lime, C.white, C.limeL], alpha: 1, squares: 0.6 });
    const ls = E.outBack(p(lt, 0, 0.42), 2.4) * (1 + 0.03 * pulse);
    logo(ctx, DROP_LOGO.x, DROP_LOGO.y, DROP_LOGO.d, { scale: lerp(0.15, 1, ls) });
    // nome + categoria
    const nameY = 1290, NS = 112;
    const w1 = tw(ctx, 'FAZLO ', DISPLAY, NS, 900, -2.8), w2 = tw(ctx, 'Hospeda', DISPLAY, NS, 700, -2.8);
    riseLine(ctx, [{ s: 'FAZLO ' }], 540 - (w1 + w2) / 2, nameY, p(lt, 0.12, 0.6), 0, { size: NS, weight: 900, color: C.white, ls: -2.8 });
    riseLine(ctx, [{ s: 'Hospeda' }], 540 - (w1 + w2) / 2 + w1, nameY, p(lt, 0.2, 0.68), 0, { size: NS, weight: 700, color: C.white, ls: -2.8 });
    typeText(ctx, 'SISTEMA DE GESTÃO PARA POUSADAS', 540, nameY + 78, p(lt, 0.45, 0.95), { size: 28, weight: 800, color: C.lime, ls: 5, align: 'center' });
    ctx.restore();
  }

  // =====================================================================
  // 4) OS CÔMODOS (9,375 s →): a câmera entra na casa e percorre seis
  //    cômodos, um por módulo. No compasso 12 ela recua e mostra que todos
  //    estavam sob o mesmo teto; no 13 a casa se encaixa na logo.
  // =====================================================================
  const GX0 = 325.5, GY0 = 657.5, GG = 16;            // grade dentro da casa (unidades L)
  const RW = (1019.5 - GX0 - 2 * GG) / 3, RK = RW / W, RH = H * RK;
  const WALL_B = GY0 + 2 * RH + GG;
  const SROOM = 1 / RK;                                // px por L com um cômodo em tela cheia
  const ROOMS = [
    { r: 0, c: 0, dark: true, draw: roomReservas },
    { r: 0, c: 1, dark: false, draw: roomCheck },
    { r: 0, c: 2, dark: true, draw: roomHosp },
    { r: 1, c: 2, dark: false, draw: roomComandas },
    { r: 1, c: 1, dark: true, draw: roomPag },
    { r: 1, c: 0, dark: false, draw: roomCaixa },
  ];
  const roomX = (k) => GX0 + ROOMS[k].c * (RW + GG), roomY = (k) => GY0 + ROOMS[k].r * (RH + GG);
  const roomT = (k) => T.rooms + k * BAR;
  const PAN0 = 0.24, PAN1 = 0.2, DRIFT = 0.035;
  const HOUSE_CAM = (() => { const s = 720 / 813.5, my = (254 + WALL_B) / 2; return { x: 612.75, y: my + (H / 2 - 1050) / s, s }; })();
  const LOGO_POS = { x: 540, y: 600, d: 380 };
  const LOGO_CAM = { x: LOGO_N / 2, y: LOGO_N / 2 + (H / 2 - LOGO_POS.y) / (LOGO_POS.d / LOGO_N), s: LOGO_POS.d / LOGO_N };
  const PULL = [T.house - 0.1, T.house + 0.95];
  const ROOF2_T = T.house + 2 * BT;                    // telhado bate na casa (c.12, tempo 3)
  const MORPH = [T.logo, T.logo + 0.7];

  function roomCam(k, drift = 0) {
    return { x: roomX(k) + RW / 2, y: roomY(k) + RH / 2, s: SROOM * (1 + DRIFT * drift) };
  }
  const logInterp = (a, b, e) => Math.exp(lerp(Math.log(a), Math.log(b), e));
  function camAt(t) {
    const lt = t - T.rooms;
    if (t < PULL[0]) {
      const k = clamp(Math.floor((lt + PAN0) / BAR), 0, 5), tb = k * BAR;
      const driftOf = (j, x) => E.inOutSine(p(x, j * BAR + PAN1, (j + 1) * BAR - PAN0));
      if (k > 0 && lt < tb + PAN1) {
        const u = p(lt, tb - PAN0, tb + PAN1), e = E.inOutQuart(u);
        const c0 = roomCam(k - 1, 1), c1 = roomCam(k, 0);
        return { x: lerp(c0.x, c1.x, e), y: lerp(c0.y, c1.y, e), s: lerp(c0.s, c1.s, e) * (1 - 0.2 * Math.sin(Math.PI * u)) };
      }
      const c = roomCam(k, driftOf(k, lt));
      if (k === 0) c.s *= lerp(0.42, 1, E.outExpo(p(lt, -0.02, 0.6)));
      return c;
    }
    if (t < MORPH[0]) {
      const u = p(t, PULL[0], PULL[1]);
      const c0 = roomCam(5, 1), c1 = HOUSE_CAM;
      const e = E.inOutCubic(u), eC = E.inOutCubic(p(u, 0.05, 1));
      const hold = 1 + 0.02 * E.inOutSine(p(t, PULL[1], MORPH[0]));
      return { x: lerp(c0.x, c1.x, eC), y: lerp(c0.y, c1.y, eC), s: logInterp(c0.s, c1.s, e) * hold };
    }
    const u = p(t, MORPH[0], MORPH[1]), e = E.inOutCubic(u);
    const c0 = Object.assign({}, HOUSE_CAM, { s: HOUSE_CAM.s * 1.02 });
    return { x: lerp(c0.x, LOGO_CAM.x, e), y: lerp(c0.y, LOGO_CAM.y, e), s: logInterp(c0.s, LOGO_CAM.s, e) };
  }
  function roomVisible(k, t) {
    const a = roomT(k) - PAN0 - 0.04, b = roomT(k) + BAR + PAN1 + 0.04;
    return (t >= a && t < b) || t >= PULL[0] - 0.02 || (k === 0 && t >= T.rooms - 0.1 && t < b);
  }

  function sceneWorld(ctx, t) {
    ctx.fillStyle = '#060606'; ctx.fillRect(0, 0, W, H);
    const morphU = p(t, MORPH[0], MORPH[1]);
    if (morphU < 1) {
      const cam = camAt(t);
      ctx.save();
      applyShake(ctx, t);
      ctx.translate(W / 2, H / 2); ctx.scale(cam.s, cam.s); ctx.translate(-cam.x, -cam.y);
      // brilho e anel que se fecha em volta da casa durante o encaixe
      if (morphU > 0) {
        radial(ctx, LOGO_N / 2, LOGO_N / 2, LOGO_N * 0.85, C.lime, 0.22 * E.inOutCubic(p(morphU, 0.3, 1)));
        const ra = p(morphU, 0.15, 0.85);
        ctx.beginPath(); ctx.arc(LOGO_N / 2, LOGO_N / 2, 640, -Math.PI / 2, -Math.PI / 2 + TAU * E.inOutCubic(ra)); stroke(ctx, C.lime, 10 / cam.s);
      }
      // cômodos (a grade encolhe para dentro da cama da logo no encaixe)
      const ga = 1 - p(morphU, 0.2, 0.56);
      if (ga > 0) {
        const g0 = { x: GX0, y: GY0, w: 1019.5 - GX0, h: WALL_B - GY0 };
        const g1 = { x: 350, y: 640, w: 640, h: 230 };
        const ge = E.inOutCubic(p(morphU, 0.0, 0.5));
        const gx = lerp(g0.x, g1.x, ge), gy = lerp(g0.y, g1.y, ge), sx = lerp(1, g1.w / g0.w, ge), sy = lerp(1, g1.h / g0.h, ge);
        const vx0 = cam.x - W / 2 / cam.s, vx1 = cam.x + W / 2 / cam.s, vy0 = cam.y - H / 2 / cam.s, vy1 = cam.y + H / 2 / cam.s;
        for (let k = 0; k < 6; k++) {
          if (!roomVisible(k, t)) continue;
          const x = gx + (roomX(k) - GX0) * sx, y = gy + (roomY(k) - GY0) * sy, w = RW * sx, h = RH * sy;
          if (x > vx1 || x + w < vx0 || y > vy1 || y + h < vy0) continue;
          ctx.save();
          ctx.globalAlpha = ga;
          ctx.translate(x, y); ctx.scale(w / W, h / H);
          ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
          ROOMS[k].draw(ctx, t - roomT(k), t);
          ctx.restore();
          if (t >= PULL[0] && ROOMS[k].dark) { ctx.save(); ctx.globalAlpha = ga * p(t, PULL[0], PULL[0] + 0.5); rr(ctx, x, y, w, h, 0); stroke(ctx, '#2C2C2C', 1.6 / cam.s); ctx.restore(); }
        }
      }
      // telhado + parede batem na casa no recuo; no encaixe a parede encolhe
      const ru = p(t, ROOF2_T - 0.24, ROOF2_T);
      if (ru > 0) {
        const fall = (1 - Math.pow(ru, 2.4)) * 1100 / cam.s;
        const k = kick(t, ROOF2_T, 0.25);
        ctx.save();
        ctx.translate(612, 254 - fall); ctx.scale(1 + 0.03 * k, 1 - 0.08 * k); ctx.translate(-612, -254);
        const wall = lerp(WALL_B, WALL_LOGO, E.inOutCubic(p(morphU, 0.0, 0.48)));
        houseFrame(ctx, { wall, wallGrow: E.outCubic(p(t, ROOF2_T + 0.02, ROOF2_T + 0.32)) });
        ctx.restore();
        if (t > ROOF2_T && morphU <= 0) {
          const dt = t - ROOF2_T, sc = 1 / cam.s;
          ctx.save(); ctx.translate(206, 516); ctx.scale(sc, sc);
          burst(ctx, 0, 0, dt, { n: 14, seed: 41, a0: deg(200), spread: deg(70), v0: 260, v1: 760, drag: 4, g: 650, life: 0.55, s0: 4, s1: 10, colors: [C.white, C.grayL] });
          ctx.restore();
          ctx.save(); ctx.translate(1019.5, 633); ctx.scale(sc, sc);
          burst(ctx, 0, 0, dt, { n: 14, seed: 43, a0: deg(-20), spread: deg(70), v0: 260, v1: 760, drag: 4, g: 650, life: 0.55, s0: 4, s1: 10, colors: [C.lime, C.limeL] });
          ctx.restore();
        }
      }
      // a logo oficial assume no lugar exato da casa
      const la = E.inOutCubic(p(morphU, 0.3, 0.72));
      if (la > 0) { ctx.save(); ctx.globalAlpha = la; ctx.imageSmoothingQuality = 'high'; if (LOGO) ctx.drawImage(LOGO, 0, 0, LOGO_N, LOGO_N); ctx.restore(); }
      ctx.restore();
    }
    overlayHouseTitle(ctx, t);
    if (t >= MORPH[0]) sceneFinale(ctx, t, morphU);
  }
  function overlayHouseTitle(ctx, t) {
    if (t < T.house || t > T.logo + 0.5) return;
    const out = p(t, T.logo - 0.02, T.logo + 0.3);
    riseLine(ctx, [{ s: 'Tudo sob o' }], 540, 330, p(t, T.house + 0.55, T.house + 1.0), out, { size: 108, color: C.white, align: 'center' });
    riseLine(ctx, [{ s: 'mesmo ' }, { s: 'teto.', color: C.lime }], 540, 444, p(t, ROOF2_T - 0.02, ROOF2_T + 0.4), out, { size: 108, color: C.white, align: 'center' });
  }

  // ------------------------------------------------------------ cômodos
  // Cada cômodo é desenhado em coordenadas de tela cheia (1080 x 1920);
  // lt = tempo desde o início do seu compasso (a câmera chega em ~0,2 s).
  const CAP_Y = 1486;
  function roomHead(ctx, lt, k, title, dark, o = {}) {
    const fg = dark ? C.white : C.ink;
    // plaquinha de porta com o número do cômodo
    const a = E.outBack(p(lt, -0.2, 0.15));
    if (a > 0) {
      ctx.save(); ctx.translate(80, 262); ctx.scale(a, a);
      rr(ctx, 0, -32, 128, 64, 32);
      if (dark) stroke(ctx, C.line2, 3); else fill(ctx, C.ink);
      circle(ctx, 32, 0, 8); fill(ctx, C.lime);
      txt(ctx, String(k).padStart(2, '0'), 52, 11, { size: 30, weight: 800, color: dark ? C.white : C.lime, ls: 2 });
      ctx.restore();
    }
    const size = o.size || fit(ctx, title + '.', 920, 205);
    riseLine(ctx, [{ s: title, color: fg }, { s: '.', color: dark ? C.lime : C.white }], 80, o.y || 486, p(lt, -0.12, 0.42), 0, { size, color: fg });
    return size;
  }
  function roomCaption(ctx, lt, s, dark, t0 = 0.5) {
    typeText(ctx, s, 80, CAP_Y, p(lt, t0, t0 + 0.5), { size: 27, weight: 700, color: dark ? C.gray : 'rgba(10,10,10,0.62)', ls: 2 });
  }

  // 01 RESERVAS (escuro): calendário do mês, períodos reservados
  const RES = { x0: 80, y0: 700, cw: (920 - 6 * 12) / 7, ch: 108, gap: 12 };
  const RES_BARS = [
    { d0: 4, d1: 7, st: 'CONF' }, { d0: 8, d1: 10, st: 'CHECKIN' }, { d0: 13, d1: 16, st: 'PRE', hero: true },
    { d0: 18, d1: 21, st: 'HOSP' }, { d0: 22, d1: 24, st: 'CONF' }, { d0: 26, d1: 27, st: 'BLOQ' }, { d0: 28, d1: 31, st: 'CONF' },
  ];
  const RES_T = { bars: 0.234, step: BT / 4, hero: 1.17, mode: 0.82 };
  const dayCell = (d) => { const i = d + 3; return { r: Math.floor(i / 7), c: i % 7 }; }; // 1º/out/2026 = quinta
  function roomReservas(ctx, lt, t) {
    bgDots(ctx, true, t);
    roomHead(ctx, lt, 1, 'Reservas', true);
    const { x0, y0, cw, ch, gap } = RES;
    'DSTQQSS'.split('').forEach((d, i) => {
      txt(ctx, d, x0 + i * (cw + gap) + cw / 2, y0 - 24, { size: 26, weight: 800, color: C.gray, align: 'center', alpha: p(lt, -0.1 + i * 0.03, 0.2 + i * 0.03) });
    });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
      const d = r * 7 + c - 3;
      const a = E.outBack(p(lt, -0.15 + (r + c) * 0.035, 0.15 + (r + c) * 0.035));
      if (a <= 0) continue;
      const x = x0 + c * (cw + gap), y = y0 + r * (ch + gap);
      ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(a, a); ctx.translate(-(x + cw / 2), -(y + ch / 2));
      rr(ctx, x, y, cw, ch, 18); fill(ctx, d >= 1 && d <= 31 ? C.panel : '#0F0F0F');
      if (d >= 1 && d <= 31) txt(ctx, String(d), x + 16, y + 36, { size: 24, weight: 700, color: d === 8 ? C.lime : C.grayL });
      if (d === 8) { rr(ctx, x, y, cw, ch, 18); stroke(ctx, C.lime, 4); }
      ctx.restore();
    }
    // períodos: pinceladas que atravessam a semana
    RES_BARS.forEach((b, j) => {
      const t0 = RES_T.bars + j * RES_T.step;
      const u = E.outCubic(p(lt, t0, t0 + 0.3));
      if (u <= 0) return;
      const a = dayCell(b.d0), z = dayCell(b.d1);
      const bx0 = x0 + a.c * (cw + gap) + 8, bx1 = x0 + z.c * (cw + gap) + cw - 8, by = y0 + a.r * (ch + gap) + ch - 34;
      let st = ST[b.st], label = st.label;
      const conf = b.hero ? p(lt, RES_T.hero, RES_T.hero + 0.16) : 0;
      if (conf > 0) { st = Object.assign({}, ST.CONF, { fill: mix(C.pre, C.lime, conf) }); label = 'CONFIRMADA'; }
      const h = 44 * (1 + (b.hero ? 0.25 * kick(lt, RES_T.hero, 0.35) : 0));
      const w = (bx1 - bx0) * u;
      rr(ctx, bx0, by - h / 2, w, h, h / 2); fill(ctx, st.fill);
      if (st.border) { rr(ctx, bx0, by - h / 2, w, h, h / 2); stroke(ctx, st.border, 3); }
      ctx.save(); rr(ctx, bx0, by - h / 2, w, h, h / 2); ctx.clip();
      circle(ctx, bx0 + 22, by, 6); if (st.hollow) stroke(ctx, st.dot, 2.5); else fill(ctx, st.dot);
      if (bx1 - bx0 > 250) txt(ctx, label, bx0 + 38, by + 7, { size: 19, weight: 800, color: st.text, ls: 1 });
      ctx.restore();
      if (b.hero) {
        checkBadge(ctx, bx1 + 2, by - 30, 26, p(lt, RES_T.hero + 0.04, RES_T.hero + 0.6), C.lime, C.ink);
        const fl = kick(lt, RES_T.hero, 0.4);
        if (fl > 0.02) { ctx.save(); ctx.globalAlpha = fl; rr(ctx, bx0 - 16 * (1 - fl) - 6, by - 40 - 20 * (1 - fl), bx1 - bx0 + 12 + 32 * (1 - fl), 80 + 40 * (1 - fl), 40); stroke(ctx, C.lime, 5); ctx.restore(); }
      }
    });
    // visualização: dia · semana · mês
    const ma = E.outBack(p(lt, 0.45, 0.75));
    if (ma > 0) {
      const modes = ['DIA', 'SEMANA', 'MÊS'], y = 1352;
      ctx.save(); ctx.translate(80, y); ctx.scale(ma, ma);
      rr(ctx, 0, -38, 520, 76, 38); fill(ctx, C.panel);
      const xs = [24, 140, 340], ws = [92, 176, 156];
      const sel = E.inOutCubic(p(lt, RES_T.mode, RES_T.mode + 0.25));
      rr(ctx, lerp(xs[1], xs[2], sel) - 4, -28, lerp(ws[1], ws[2], sel), 56, 28); fill(ctx, C.lime);
      modes.forEach((m, i) => txt(ctx, m, xs[i] + ws[i] / 2 - 4, 10, { size: 26, weight: 800, color: (i === 1 && sel < 0.5) || (i === 2 && sel >= 0.5) ? C.ink : C.grayL, align: 'center', ls: 2 }));
      ctx.restore();
    }
    roomCaption(ctx, lt, 'CALENDÁRIO DE OCUPAÇÃO', true, 0.55);
  }

  // 02 CHECK-IN / CHECK-OUT (limão)
  const CHK = { a: 0.0, b: 0.117, hosp: 1.17 };
  function roomCheck(ctx, lt, t) {
    bgDots(ctx, false, t);
    // título duplo: "Check-in" cheio, "Check-out" vazado
    const a = E.outBack(p(lt, -0.2, 0.15));
    if (a > 0) {
      ctx.save(); ctx.translate(80, 262); ctx.scale(a, a);
      rr(ctx, 0, -32, 128, 64, 32); fill(ctx, C.ink); circle(ctx, 32, 0, 8); fill(ctx, C.lime);
      txt(ctx, '02', 52, 11, { size: 30, weight: 800, color: C.lime, ls: 2 });
      ctx.restore();
    }
    const size = fit(ctx, 'Check-out.', 920, 190);
    const sl = (u, dir) => (1 - E.outExpo(clamp(u))) * 1100 * dir;
    ctx.save(); ctx.translate(sl(p(lt, -0.15, 0.45), -1), 0);
    txt(ctx, 'Check-in', 80, 452, { fam: DISPLAY, size, weight: 900, color: C.ink, ls: -size * 0.025 });
    ctx.restore();
    ctx.save(); ctx.translate(sl(p(lt, -0.05, 0.55), 1), 0);
    txt(ctx, 'Check-out', 80, 452 + size * 0.98, { fam: DISPLAY, size, weight: 900, color: C.ink, ls: -size * 0.025, stroke: 5 });
    ctx.restore();
    // cartões de entrada e saída
    const cards = [
      { y: 700, ic: 'login', lab: 'ENTRADA', time: '14:15', st: ST.CHECKIN, t: CHK.a, dir: -1 },
      { y: 1010, ic: 'logout', lab: 'SAÍDA', time: '12:00', st: ST.CHECKOUT, t: CHK.b + 0.12, dir: 1 },
    ];
    cards.forEach((cd, i) => {
      const u = p(lt, cd.t + 0.05, cd.t + 0.5);
      if (u <= 0) return;
      ctx.save(); ctx.translate((1 - E.outExpo(u)) * 1200 * cd.dir, 0);
      rr(ctx, 80, cd.y, 920, 280, 40); fill(ctx, C.ink);
      const cy = cd.y + 140;
      circle(ctx, 190, cy, 70); fill(ctx, C.lime);
      icon(ctx, cd.ic, 192, cy, 74, { line: C.ink, accent: C.ink, lw: 9 });
      txt(ctx, cd.lab, 300, cy - 50, { size: 26, weight: 700, color: C.gray, ls: 3 });
      rollText(ctx, cd.time, 292, cy + 70, p(lt, cd.t + 0.2, cd.t + 0.85), { size: 132, color: C.white });
      let st = cd.st;
      if (i === 0 && lt > CHK.hosp) st = ST.HOSP;
      const ps = E.outBack(p(lt, cd.t + 0.55, cd.t + 0.8)) * (1 + (i === 0 ? 0.14 * kick(lt, CHK.hosp, 0.3) : 0));
      statusPill(ctx, 936, cy + 44, st, { h: 62, fs: 24, align: 'right', scale: ps });
      ctx.restore();
    });
    // a estadia entre os dois
    const fa = p(lt, 0.7, 1.1);
    if (fa > 0) {
      const y = 1376, x0 = 120, x1 = 960;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, E.outCubic(fa)), y); stroke(ctx, C.ink, 5);
      const dotX = lerp(x0, x1, (Math.max(0, lt - 0.7) * 0.45) % 1);
      circle(ctx, x0, y, 12); fill(ctx, C.ink); circle(ctx, x1, y, 12); fill(ctx, C.ink);
      circle(ctx, dotX, y, 9); fill(ctx, C.white);
    }
    roomCaption(ctx, lt, 'ENTRADAS E SAÍDAS DO DIA', false, 0.6);
  }

  // 03 HOSPEDAGENS (escuro): as acomodações e o status de cada uma
  const ACC = [
    ['BICA D\'ÁGUA 01', 'CASAL', 'HOSP'], ['BICA D\'ÁGUA 02', 'CASAL', 'LIVRE'], ['BICA D\'ÁGUA 03', 'CASAL', 'HOSP'],
    ['BICA D\'ÁGUA 04', 'CASAL', 'HOSP'], ['CHALÉ DE PEDRA 05', 'FAMÍLIA', 'LIVRE'], ['CHALÉ DE PEDRA 06', 'FAMÍLIA', 'HOSP'],
    ['CHALÉ DE PEDRA 07', 'FAMÍLIA', 'LIVRE'], ['IPÊ 08', 'CASAL STANDARD', 'LIVRE'], ['IPÊ 09', 'CASAL STANDARD', 'HOSP'],
    ['CHALÉ SERRA 01', 'CHALÉ MASTER', 'LIVRE'],
  ];
  const HOSP_T = { tiles: -0.08, step: BT / 4, status: 0.62 };
  function roomHosp(ctx, lt, t) {
    bgDots(ctx, true, t);
    roomHead(ctx, lt, 3, 'Hospedagens', true);
    const tw_ = 436, th = 118, gx = 16, gy = 16, y0 = 640;   // grade termina em x=968 (fora da coluna de ações)
    ACC.forEach((acc, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 80 + col * (tw_ + gx), y = y0 + row * (th + gy);
      const u = p(lt, HOSP_T.tiles + i * HOSP_T.step * 0.5, HOSP_T.tiles + i * HOSP_T.step * 0.5 + 0.3);
      if (u <= 0) return;
      const f = E.outBack(u, 1.6);
      ctx.save(); ctx.translate(x + tw_ / 2, y + th / 2); ctx.scale(1, f); ctx.translate(-(x + tw_ / 2), -(y + th / 2));
      rr(ctx, x, y, tw_, th, 22); fill(ctx, mix(C.panel2, C.panel, clamp(u * 2)));
      txt(ctx, acc[0], x + 26, y + 50, { size: 24, weight: 800, color: C.white, ls: 0.5 });
      txt(ctx, acc[1], x + 26, y + 88, { size: 19, weight: 700, color: C.gray, ls: 1.5 });
      const ts = HOSP_T.status + i * 0.05;
      const st = ST[acc[2]];
      const on = p(lt, ts, ts + 0.12);
      if (on > 0) {
        const lx = x + tw_ - 30, ly = y + 74;
        const sz = E.outBack(on) * (1 + 0.5 * kick(lt, ts, 0.3));
        circle(ctx, x + tw_ - 34, y + 40, 9 * sz);
        if (st.hollow) { stroke(ctx, C.lime, 3.5); } else fill(ctx, st.fill);
        txt(ctx, st.label, lx, ly + 8, { size: 18, weight: 800, color: st.hollow ? C.lime : st.fill, align: 'right', ls: 1.5, alpha: on });
      }
      ctx.restore();
    });
    // legenda
    const la = p(lt, 1.15, 1.45);
    if (la > 0) {
      const items = [[ST.HOSP, 'HOSPEDADA'], [ST.LIVRE, 'LIVRE']];
      let x = 80;
      items.forEach(([st, l], i) => {
        const s = E.outBack(p(lt, 1.15 + i * 0.08, 1.45 + i * 0.08));
        x += statusPill(ctx, x, 1352, st, { h: 58, fs: 22, align: 'left', scale: s, label: l }) + 18;
      });
    }
    roomCaption(ctx, lt, 'ACOMODAÇÕES, HÓSPEDES E STATUS', true, 0.6);
  }

  // 04 COMANDAS (limão): consumo lançado na acomodação
  const PRODUCTS = [
    { ic: 'bottle', name: 'ÁGUA MINERAL', cat: 'PRODUTO', v: 5 },
    { ic: 'cup', name: 'CAFÉ ESPECIAL', cat: 'PRODUTO', v: 7 },
    { ic: 'plate', name: 'PORÇÃO DE PASTÉIS', cat: 'PRODUTO', v: 38 },
    { ic: 'mountain', name: 'PASSEIO GUIADO', cat: 'SERVIÇO', v: 150 },
  ];
  const COM_T = { add: 0.47, step: BT / 2, fly: 0.2 };
  function roomComandas(ctx, lt, t) {
    bgDots(ctx, false, t);
    roomHead(ctx, lt, 4, 'Comandas', false);
    // seletor de acomodação
    const sa = E.outBack(p(lt, -0.05, 0.25));
    if (sa > 0) {
      ctx.save(); ctx.translate(80, 610); ctx.scale(1, sa);
      rr(ctx, 0, -42, 920, 84, 26); fill(ctx, C.ink);
      txt(ctx, 'BICA D\'ÁGUA 04', 36, 11, { size: 30, weight: 800, color: C.lime, ls: 2 });
      ctx.beginPath(); ctx.moveTo(864, -8); ctx.lineTo(876, -20); ctx.lineTo(888, -8); ctx.moveTo(864, 8); ctx.lineTo(876, 20); ctx.lineTo(888, 8); stroke(ctx, C.lime, 4);
      ctx.restore();
    }
    const cw = 432, chh = 262, gx = 16, y0 = 682;   // termina em x=960 (fora da coluna de ações)
    let total = 0;
    PRODUCTS.forEach((pr, i) => {
      const x = 80 + (i % 2) * (cw + gx), y = y0 + Math.floor(i / 2) * (chh + 16);
      const a = E.outBack(p(lt, -0.05 + i * 0.06, 0.28 + i * 0.06));
      const ta = COM_T.add + i * COM_T.step;
      if (a > 0) {
        ctx.save(); ctx.translate(x + cw / 2, y + chh / 2); ctx.scale(a, a); ctx.translate(-(x + cw / 2), -(y + chh / 2));
        rr(ctx, x, y, cw, chh, 32); fill(ctx, C.ink);
        icon(ctx, pr.ic, x + 84, y + 84, 92, { line: C.white, accent: C.lime, lw: 7 });
        txt(ctx, pr.cat, x + cw - 32, y + 58, { size: 19, weight: 800, color: C.gray, align: 'right', ls: 2 });
        txt(ctx, pr.name, x + 32, y + 178, { size: 23, weight: 800, color: C.white, ls: 0.5 });
        txt(ctx, brl(pr.v), x + 32, y + 228, { size: 34, weight: 800, color: C.white });
        // botão +
        const press = kick(lt, ta, 0.25);
        const bx = x + cw - 62, by = y + chh - 62, bs = 1 - 0.22 * press + (lt > ta ? 0.08 * kick(lt, ta + 0.08, 0.3) : 0);
        ctx.save(); ctx.translate(bx, by); ctx.scale(bs, bs);
        rr(ctx, -34, -34, 68, 68, 18); fill(ctx, C.lime);
        icon(ctx, 'plus', 0, 0, 44, { line: C.ink, lw: 7 });
        ctx.restore();
        const rp = p(lt, ta, ta + 0.45);
        if (rp > 0 && rp < 1) { rr(ctx, bx - 34 - 40 * rp, by - 34 - 40 * rp, 68 + 80 * rp, 68 + 80 * rp, 18 + 30 * rp); stroke(ctx, rgba(C.lime, 1 - rp), 5); }
        ctx.restore();
      }
      // item voa até a comanda
      const fu = p(lt, ta + 0.02, ta + 0.02 + COM_T.fly);
      if (fu > 0 && fu < 1) {
        const sx = x + cw - 62, sy = y + chh - 62, ex = 900, ey = 1290;
        const e = E.inOutCubic(fu);
        const fx = lerp(sx, ex, e), fy = lerp(sy, ey, e) - Math.sin(e * Math.PI) * 160;
        ctx.save(); ctx.translate(fx, fy); ctx.scale(1 - 0.4 * e, 1 - 0.4 * e);
        rr(ctx, -58, -28, 116, 56, 28); fill(ctx, C.ink); txt(ctx, '+1', 0, 10, { size: 28, weight: 800, color: C.lime, align: 'center' });
        ctx.restore();
      }
      total += pr.v * E.outCubic(p(lt, ta + COM_T.fly, ta + COM_T.fly + 0.18));
    });
    // comanda
    const ba = E.outBack(p(lt, 0.15, 0.45));
    if (ba > 0) {
      const y = 1236;
      const hit = COM_T.add + COM_T.fly;
      const fl = [0, 1, 2, 3].reduce((a, i) => Math.max(a, kick(lt, hit + i * COM_T.step, 0.3)), 0);
      ctx.save(); ctx.translate(540, y + 60); ctx.scale(ba * (1 + 0.02 * fl), ba); ctx.translate(-540, -(y + 60));
      rr(ctx, 80, y, 920, 120, 30); fill(ctx, C.ink);
      rr(ctx, 80, y, 920, 120, 30); stroke(ctx, mix(C.ink, C.white, fl * 0.8), 4);
      txt(ctx, 'COMANDA', 120, y + 52, { size: 24, weight: 800, color: C.gray, ls: 3 });
      txt(ctx, 'ATIVA', 120, y + 88, { size: 22, weight: 800, color: C.lime, ls: 3 });
      txt(ctx, brl(Math.round(total)), 930, y + 80, { size: 54, weight: 800, color: mix(C.white, C.lime, fl), align: 'right', ls: -1 });
      ctx.restore();
    }
    roomCaption(ctx, lt, 'PRODUTOS E SERVIÇOS POR ACOMODAÇÃO', false, 0.7);
  }

  // 05 PAGAMENTOS (escuro): Pix, cartão e dinheiro → quitado
  const PAG_T = { card: 0.0, pix: BT / 2, cash: BT, stamp: 2 * BT };
  function payCard(ctx) {
    rr(ctx, -260, -165, 520, 330, 36); fill(ctx, C.lime);
    rr(ctx, -200, -86, 92, 70, 14); fill(ctx, '#1C1C1C');
    ctx.beginPath(); ctx.moveTo(-200, -51); ctx.lineTo(-108, -51); ctx.moveTo(-154, -86); ctx.lineTo(-154, -16); stroke(ctx, C.lime, 3);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(150, -51, 22 + i * 18, -0.75, 0.75); stroke(ctx, C.ink, 7); }
    txt(ctx, 'CARTÃO', -200, 110, { size: 34, weight: 800, color: C.ink, ls: 3 });
    for (let i = 0; i < 4; i++) { rr(ctx, -200 + i * 70, 30, 52, 14, 7); fill(ctx, 'rgba(10,10,10,0.35)'); }
  }
  function payPix(ctx) {
    rr(ctx, -170, -170, 340, 340, 60); fill(ctx, C.white);
    txt(ctx, 'PIX', 0, 40, { fam: DISPLAY, size: 132, weight: 900, color: C.ink, align: 'center', ls: -2 });
    rr(ctx, -82, 74, 164, 12, 6); fill(ctx, C.lime);
  }
  function payCash(ctx) {
    rr(ctx, -250, -130, 500, 260, 22); fill(ctx, C.paper);
    rr(ctx, -228, -108, 456, 216, 14); stroke(ctx, '#CFCFC7', 4);
    circle(ctx, 0, 0, 72); fill(ctx, C.ink);
    txt(ctx, 'R$', 0, 17, { size: 50, weight: 800, color: C.lime, align: 'center' });
    txt(ctx, 'DINHEIRO', -206, -64, { size: 24, weight: 800, color: C.grayD, ls: 2 });
  }
  function roomPag(ctx, lt, t) {
    bgDots(ctx, true, t);
    roomHead(ctx, lt, 5, 'Pagamentos', true);
    const items = [
      { f: payCash, x: 590, y: 790, r: 5, from: [-1300, 120], t: PAG_T.cash },
      { f: payCard, x: 450, y: 955, r: -6, from: [1300, -200], t: PAG_T.card },
      { f: payPix, x: 790, y: 1095, r: 7, from: [0, 1300], t: PAG_T.pix },
    ];
    const st = p(lt, PAG_T.stamp, PAG_T.stamp + 0.16);
    const settle = kick(lt, PAG_T.stamp, 0.3);
    items.forEach((it, i) => {
      const u = p(lt, it.t - 0.22, it.t);
      if (u <= 0) return;
      const e = E.outCubic(u);
      const k = kick(lt, it.t, 0.25);
      ctx.save();
      ctx.translate(it.x + it.from[0] * (1 - e), it.y + it.from[1] * (1 - e) + 14 * settle * (i - 1));
      ctx.rotate(deg(it.r + (1 - e) * 40 * (i % 2 ? 1 : -1)) + 0.04 * Math.sin(lt * 1.3 + i));
      ctx.scale(1 + 0.05 * k, 1 + 0.05 * k);
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
      it.f(ctx);
      ctx.restore();
    });
    // carimbo QUITADO
    if (st > 0) {
      const sc = lerp(2.4, 1, E.outExpo(st)) * (1 + 0.06 * kick(lt, PAG_T.stamp + 0.16, 0.3));
      ctx.save(); ctx.translate(530, 1342); ctx.rotate(deg(-6)); ctx.scale(sc, sc); ctx.globalAlpha = clamp(st * 3);
      rr(ctx, -250, -70, 500, 140, 70); fill(ctx, C.lime);
      rr(ctx, -250, -70, 500, 140, 70); stroke(ctx, C.ink, 6);
      txt(ctx, 'QUITADO', -42, 26, { fam: DISPLAY, size: 78, weight: 900, color: C.ink, align: 'center', ls: -1 });
      circle(ctx, 172, 0, 42); fill(ctx, C.ink);
      checkMark(ctx, 172, 2, 26, p(lt, PAG_T.stamp + 0.1, PAG_T.stamp + 0.4), C.lime, 7);
      ctx.restore();
      if (lt > PAG_T.stamp) burst(ctx, 530, 1342, lt - PAG_T.stamp - 0.06, { n: 26, seed: 71, v0: 400, v1: 1300, drag: 4.5, life: 0.6, s0: 6, s1: 14, colors: [C.lime, C.white], squares: 0.7 });
    }
    roomCaption(ctx, lt, 'PIX · CARTÃO · DINHEIRO', true, 0.4);
  }

  // 06 CAIXA (limão): entradas, saídas e fechamento
  const CX_T = { rows: 0.05, step: BT / 2, line: 0.8, saldo: 0.9, close: 1.4 };
  function roomCaixa(ctx, lt, t) {
    bgDots(ctx, false, t);
    const size = roomHead(ctx, lt, 6, 'Caixa', false, { size: 205 });
    // status do caixa
    const pa = E.outBack(p(lt, 0.25, 0.5));
    if (pa > 0) {
      const closed = lt > CX_T.close;
      const x = 80 + tw(ctx, 'Caixa.', DISPLAY, size, 900, -size * 0.025) + 40;
      ctx.save(); ctx.translate(x, 420); ctx.scale(pa * (1 + 0.15 * kick(lt, CX_T.close, 0.3)), pa * (1 + 0.15 * kick(lt, CX_T.close, 0.3)));
      const label = closed ? 'FECHADO' : 'ABERTO';
      const w = tw(ctx, label, MONO, 30, 800, 3) + 104;
      rr(ctx, 0, -36, w, 72, 36); fill(ctx, C.ink);
      if (closed) checkMark(ctx, 40, 1, 16, p(lt, CX_T.close, CX_T.close + 0.3), C.lime, 5);
      else { circle(ctx, 40, 0, 10); fill(ctx, C.lime); }
      txt(ctx, label, 68, 11, { size: 30, weight: 800, color: C.lime, ls: 3 });
      ctx.restore();
    }
    const rows = [
      { l: 'ABERTURA', v: 300, sign: '', ic: null },
      { l: 'ENTRADAS', v: 1525, sign: '+ ', ic: 'up' },
      { l: 'SAÍDAS', v: 45, sign: '− ', ic: 'down' },
    ];
    rows.forEach((r, i) => {
      const t0 = CX_T.rows + i * CX_T.step;
      const a = E.outExpo(p(lt, t0, t0 + 0.4));
      if (a <= 0) return;
      const y = 720 + i * 128;
      ctx.save(); ctx.translate((1 - a) * -700, 0);
      if (r.ic) { circle(ctx, 112, y - 14, 32); fill(ctx, C.ink); icon(ctx, r.ic, 112, y - 14, 34, { line: C.lime, lw: 6 }); }
      else { circle(ctx, 112, y - 14, 32); stroke(ctx, C.ink, 4); circle(ctx, 112, y - 14, 8); fill(ctx, C.ink); }
      txt(ctx, r.l, 166, y, { size: 32, weight: 800, color: C.ink, ls: 3 });
      const v = r.v * E.outCubic(p(lt, t0 + 0.05, t0 + 0.6));
      txt(ctx, brl(Math.round(v), r.sign), 1000, y + 2, { size: 50, weight: 800, color: C.ink, align: 'right', ls: -1 });
      ctx.restore();
    });
    const ln = E.inOutCubic(p(lt, CX_T.line, CX_T.line + 0.25));
    if (ln > 0) { ctx.beginPath(); ctx.moveTo(80, 1036); ctx.lineTo(80 + 920 * ln, 1036); stroke(ctx, C.ink, 5); }
    const sa = p(lt, CX_T.saldo, CX_T.saldo + 0.2);
    if (sa > 0) {
      txt(ctx, 'SALDO LÍQUIDO', 80, 1124, { size: 30, weight: 800, color: 'rgba(10,10,10,0.6)', ls: 3, alpha: sa });
      const s = E.outBack(p(lt, CX_T.saldo, CX_T.saldo + 0.35), 2);
      ctx.save(); ctx.translate(80, 1290); ctx.scale(s, s);
      txt(ctx, brl(Math.round(1480 * E.outCubic(p(lt, CX_T.saldo, CX_T.saldo + 0.5)))), 0, 0, { size: 128, weight: 800, color: C.ink, ls: -5 });
      ctx.restore();
    }
    roomCaption(ctx, lt, 'ABERTURA · ENTRADAS · SAÍDAS · FECHAMENTO', false, 0.55);
  }

  // =====================================================================
  // 5) FINAL (22,5 s →): pilares e assinatura
  // =====================================================================
  const PILLARS = [
    { segs: [{ s: 'Gestão ' }, { s: 'simples.', color: C.lime }], t: T.logo + BT },
    { segs: [{ s: 'Pousada ' }, { s: 'organizada.', color: C.lime }], t: T.logo + 2 * BT },
    { segs: [{ s: 'Operação sob ' }, { s: 'controle.', color: C.lime }], t: T.logo + 3 * BT },
  ];
  const SIGN_LOGO = { x: 540, y: 770, d: 400 };
  const ROOF_END = { x: 540, y: 250, a: 33 };
  function sceneFinale(ctx, t, morphU) {
    const su = E.inOutCubic(p(t, T.sign, T.sign + 0.5));
    // logo (depois do encaixe ela vive em coordenadas de tela)
    if (morphU >= 1) {
      const x = lerp(LOGO_POS.x, SIGN_LOGO.x, su), y = lerp(LOGO_POS.y, SIGN_LOGO.y, su), d = lerp(LOGO_POS.d, SIGN_LOGO.d, su);
      const beat = Math.floor((t - T.sign) / BT), pulse = t > T.sign && t < T.sign + 2 * BAR ? kick(t, T.sign + beat * BT, 0.22) : 0;
      const ringA = 1 - p(t, MORPH[1], MORPH[1] + 0.5);
      radial(ctx, x, y, d * 1.25, C.lime, 0.22 + 0.08 * pulse + 0.25 * kick(t, T.sign, 0.8));
      if (ringA > 0) { circle(ctx, x, y, (640 / LOGO_N) * d); stroke(ctx, rgba(C.lime, ringA), 10); }
      logo(ctx, x, y, d, { scale: 1 + 0.025 * pulse + 0.05 * kick(t, T.sign, 0.35) });
    }
    // pilares
    PILLARS.forEach((pl, i) => {
      const y = 1030 + i * 108;
      riseLine(ctx, pl.segs, 540, y, p(t, pl.t - 0.02, pl.t + 0.42), p(t, T.sign - 0.22 + i * 0.03, T.sign + 0.06 + i * 0.03), { size: 76, color: C.white, align: 'center' });
    });
    if (t < T.sign - 0.1) return;
    signature(ctx, t);
  }
  function roofLine(ctx, prog, lw, o = {}) {
    const x = ROOF_END.x, y = o.y ?? ROOF_END.y, glint = o.glint, sl = Math.tan(deg(ROOF_END.a)), span = 640;
    const L = span * prog;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x - L, y + L * sl); stroke(ctx, C.white, lw);
    ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + L, y + L * sl); stroke(ctx, C.lime, lw);
    if (glint !== undefined && glint > 0 && glint < 1) {
      for (const side of [-1, 1]) {
        const d = span * glint;
        const gx = x + side * d, gy = y + d * sl;
        ctx.save(); glow(ctx, C.white, 30); circle(ctx, gx, gy, lw * 1.4); fill(ctx, C.white); ctx.restore();
      }
    }
    ctx.restore();
  }
  function signature(ctx, t) {
    const lt = t - T.sign;
    // poeira de luz subindo
    for (let i = 0; i < 36; i++) {
      const sp = 40 + hash(i, 81) * 90, x = hash(i, 82) * W, y = H - ((lt * sp + hash(i, 83) * H) % H);
      const a = 0.35 * hash(i, 84) * p(lt, 0, 0.6);
      circle(ctx, x + Math.sin(lt * 0.8 + i) * 12, y, 2 + hash(i, 85) * 3); fill(ctx, rgba(C.lime, a));
    }
    // telhado fino emoldurando o final
    roofLine(ctx, E.outExpo(p(lt, 0.02, 0.6)), 9, { glint: p(lt, 1.9, 2.9) });
    // nome
    const nameY = 1150;
    const NS = 112, w1 = tw(ctx, 'FAZLO ', DISPLAY, NS, 900, -2.8), w2 = tw(ctx, 'Hospeda', DISPLAY, NS, 700, -2.8);
    const nx = 540 - (w1 + w2) / 2;
    riseLine(ctx, [{ s: 'FAZLO ' }], nx, nameY, p(lt, 0.22, 0.7), 0, { size: NS, weight: 900, color: C.white, ls: -2.8 });
    riseLine(ctx, [{ s: 'Hospeda' }], nx + w1, nameY, p(lt, 0.3, 0.78), 0, { size: NS, weight: 700, color: C.white, ls: -2.8 });
    // brilho que atravessa o nome no último acorde
    const gl = p(lt, BAR + 0.02, BAR + 0.75);
    if (gl > 0 && gl < 1) {
      const gx = lerp(nx - 200, nx + w1 + w2 + 200, E.inOutCubic(gl));
      const g = ctx.createLinearGradient(gx - 120, 0, gx + 120, 0);
      g.addColorStop(0, 'rgba(175,250,39,0)'); g.addColorStop(0.5, 'rgba(175,250,39,0.95)'); g.addColorStop(1, 'rgba(175,250,39,0)');
      setFont(ctx, DISPLAY, NS, 900, 'left', -2.8); ctx.fillStyle = g; ctx.fillText('FAZLO ', nx, nameY);
      setFont(ctx, DISPLAY, NS, 700, 'left', -2.8); ctx.fillText('Hospeda', nx + w1, nameY);
    }
    typeText(ctx, 'SISTEMA DE GESTÃO PARA POUSADAS', 540, nameY + 76, p(lt, 0.42, 0.95), { size: 28, weight: 800, color: C.grayL, ls: 5, align: 'center' });
    riseLine(ctx, [{ s: 'Tudo sob o mesmo teto.' }], 540, nameY + 180, p(lt, 0.62, 1.1), 0, { size: 68, weight: 800, color: C.lime, align: 'center', ls: -1.5 });
    // CTA
    const ca = p(lt, 0.95, 1.3);
    if (ca > 0) {
      const label = 'SAIBA MAIS NO LINK DA BIO';
      const w = tw(ctx, label, MONO, 31, 800, 3) + 100;
      const s = E.outBack(ca) * (1 + 0.035 * Math.max(0, Math.sin((lt - 1.4) * 4.2)) * (lt > 1.4 ? 1 : 0)) * (1 + 0.06 * kick(lt, BAR, 0.4));
      ctx.save(); ctx.translate(540, nameY + 318); ctx.scale(s, s);
      rr(ctx, -w / 2, -46, w, 92, 46); fill(ctx, C.lime);
      txt(ctx, label, -w / 2 + 50, 11, { size: 31, weight: 800, color: C.ink, ls: 3 });
      ctx.restore();
    }
  }

  // =====================================================================
  // LINHA DO TEMPO, MOTION BLUR E RENDER
  // =====================================================================
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    noGlow(ctx);
    if (t < T.build) sceneHook(ctx, t);
    else if (t < T.drop) sceneBuild(ctx, t - T.build);
    else if (t < T.rooms) sceneDrop(ctx, t - T.drop);
    else sceneWorld(ctx, t);
  }
  // janelas de movimento rápido: [início, fim, amostras, obturador (s)]
  const BLUR = [
    [0, 0.12, 10, 1 / 60],
    [ZOOM_IN[0] - 0.05, T.build + 0.06, 22, 1 / 40],
    [T.build + 0.06, T.breath - 0.4, 10, 1 / 70],
    [T.drop - 0.5, T.drop + 0.45, 22, 1 / 45],
    [T.drop + DIVE[0] - 0.05, T.rooms + 0.6, 30, 1 / 40],
    ...[1, 2, 3, 4, 5].map((k) => [roomT(k) - PAN0 - 0.03, roomT(k) + PAN1 + 0.03, 22, 1 / 36]),
    [PULL[0] - 0.03, PULL[1] + 0.05, 18, 1 / 45],
    [ROOF2_T - 0.26, ROOF2_T + 0.05, 14, 1 / 60],
    [MORPH[0] - 0.03, MORPH[1] + 0.03, 16, 1 / 50],
    [T.sign - 0.25, T.sign + 0.6, 10, 1 / 60],
  ];
  function shutter(t) {
    for (const [a, b, n, dt] of BLUR) if (t >= a && t < b) return { n, dt };
    return { n: 4, dt: 1 / 120 };
  }
  let bufS = null, bufA = null;
  function buffers() {
    if (!bufS) {
      const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      bufS = mk(); bufA = mk();
    }
    return [bufS, bufA];
  }
  function renderAt(ctx, t, o = {}) {
    t = clamp(t, 0, DURATION - 1e-4);
    const sh = o.noBlur ? { n: 1 } : shutter(t);
    if (sh.n <= 1) { frame(ctx, t); return; }
    const [S, A] = buffers();
    const sctx = S.getContext('2d'), actx = A.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < sh.n; k++) {
      const tk = clamp(t + (k / (sh.n - 1) - 0.5) * sh.dt, 0, DURATION - 1e-4);
      frame(sctx, tk);
      actx.globalAlpha = 1 / (k + 1);
      actx.drawImage(S, 0, 0);
    }
    actx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(A, 0, 0);
  }

  // ------------------------------------------------------------ capa (Instagram)
  // Composição própria, pensada para o recorte 3:4 do feed (faixa central de 1440 px).
  function renderCover(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    bgDots(ctx, true, 0);
    // a casa de palavras, bem apagada, como textura atrás da logo
    ctx.save();
    ctx.translate(540, 760); ctx.scale(0.9, 0.9); ctx.translate(-540, -1045);
    ctx.globalAlpha = 0.12;
    for (const r of HOUSE.rows) drawRow(ctx, r, 1, 0.3);
    ctx.globalAlpha = 0.85;
    ctx.translate(HOUSE.ox, HOUSE.oy); ctx.scale(HOUSE.s, HOUSE.s); houseFrame(ctx, { wall: HOUSE.bottom });
    ctx.restore();
    const sc = ctx.createLinearGradient(0, 1020, 0, 1260);
    sc.addColorStop(0, 'rgba(10,10,10,0)'); sc.addColorStop(1, 'rgba(10,10,10,1)');
    ctx.fillStyle = sc; ctx.fillRect(0, 1020, W, 900);
    vignette(ctx, 0.7);
    radial(ctx, 540, 820, 560, C.lime, 0.3);
    logo(ctx, 540, 820, 400);
    txt(ctx, 'CONHEÇA O', 540, 1150, { size: 32, weight: 800, color: C.lime, align: 'center', ls: 8 });
    const NS = 122, w1 = tw(ctx, 'FAZLO ', DISPLAY, NS, 900, -3), w2 = tw(ctx, 'Hospeda', DISPLAY, NS, 700, -3);
    txt(ctx, 'FAZLO ', 540 - (w1 + w2) / 2, 1272, { fam: DISPLAY, size: NS, weight: 900, color: C.white, ls: -3 });
    txt(ctx, 'Hospeda', 540 - (w1 + w2) / 2 + w1, 1272, { fam: DISPLAY, size: NS, weight: 700, color: C.white, ls: -3 });
    txt(ctx, 'Tudo sob o mesmo teto.', 540, 1366, { fam: DISPLAY, size: 62, weight: 800, color: C.lime, align: 'center', ls: -1.4 });
    txt(ctx, 'SISTEMA DE GESTÃO PARA POUSADAS', 540, 1448, { size: 26, weight: 800, color: C.grayL, align: 'center', ls: 4 });
  }

  // ------------------------------------------------------------ cues (som)
  function buildCues() {
    CUES.length = 0; SHAKES.length = 0;
    const n = HOUSE.n;
    // GANCHO
    cue(DINGS[0], 'ding', { v: 1 }); cue(DINGS[1], 'ding', { v: 0.62 });
    SHAKES.push([DINGS[0], 7, 0.25], [BT, 12, 0.22]);
    cue(0.1, 'rise', { v: 0.5 });
    cue(BT, 'slam', { v: 1 });
    cue(2 * BT, 'swish', { v: 0.6, pan: 0 });
    cue(1.15, 'fall', { d: 0.45, v: 0.4 });
    cue(ZOOM_IN[0], 'zoom', { d: ZOOM_IN[1] - ZOOM_IN[0], v: 1 });
    // CASA DE PALAVRAS
    HOUSE.land.forEach((tl, i) => {
      cue(T.build + tl - 0.22, 'drop', { d: 0.22, v: 0.25 });
      cue(T.build + tl, 'land', { k: n - 1 - i, n, v: i === n - 1 ? 1 : 0.8, pan: clamp(((HX(HOUSE.rows[i].x0) + HX(HOUSE.rows[i].x1)) / 2 - 540) / 540, -1, 1) });
      SHAKES.push([T.build + tl, i === n - 1 ? 10 : 3, 0.15]);
    });
    cue(T.build, 'rise', { v: 0.6 });
    cue(T.build + ROOF_T - 0.26, 'fall', { d: 0.26, v: 0.8 });
    cue(T.build + ROOF_T, 'roof', { v: 1 });
    SHAKES.push([T.build + ROOF_T, 20, 0.35]);
    // RESPIRO
    cue(T.breath, 'cut', {});
    [0, 1, 2].forEach((i) => cue(T.breath + i * BT, 'slam', { v: 0.55 + 0.2 * i, soft: true }));
    cue(T.breath + 2.75 * BT, 'suck', { d: T.drop - (T.breath + 2.75 * BT) });
    // LOGO
    cue(T.drop, 'boom', { v: 1 }); cue(T.drop, 'ding', { v: 1, big: true });
    SHAKES.push([T.drop, 30, 0.45]);
    cue(T.drop + 0.12, 'rise', { v: 0.5 });
    cue(T.drop + 0.45, 'type', { d: 0.5, n: 31 });
    cue(T.drop + DIVE[0], 'dive', { d: DIVE[1] - DIVE[0] });
    // CÔMODOS
    for (let k = 1; k < 6; k++) {
      const a = ROOMS[k - 1], b = ROOMS[k];
      cue(roomT(k) - PAN0, 'pan', { d: PAN0 + PAN1, dx: b.c - a.c, dy: b.r - a.r });
    }
    const R = (k, dt, type, o = {}) => cue(roomT(k) + dt, type, o);
    // 01 reservas
    R(0, 0.0, 'grid', { d: 0.5 });
    RES_BARS.forEach((b, j) => R(0, RES_T.bars + j * RES_T.step, 'paint', { j }));
    R(0, RES_T.mode, 'click', { v: 0.6 });
    R(0, RES_T.hero, 'confirm', { v: 1 });
    R(0, 0.55, 'type', { d: 0.5, n: 22 });
    // 02 check-in / check-out
    R(1, -0.15, 'swish', { v: 0.5, pan: -0.6 }); R(1, -0.05, 'swish', { v: 0.5, pan: 0.6 });
    R(1, CHK.a + 0.05, 'whoosh', { d: 0.3, pan: -0.5 }); R(1, CHK.b + 0.17, 'whoosh', { d: 0.3, pan: 0.5 });
    R(1, CHK.a + 0.2, 'roll', { d: 0.65 }); R(1, CHK.b + 0.32, 'roll', { d: 0.65 });
    R(1, CHK.a + 0.55, 'pop', { f: 620 }); R(1, CHK.b + 0.67, 'pop', { f: 740 });
    R(1, CHK.hosp, 'key', { v: 1 });
    R(1, 0.6, 'type', { d: 0.5, n: 24 });
    // 03 hospedagens
    ACC.forEach((_, i) => R(2, HOSP_T.tiles + i * HOSP_T.step * 0.5, 'flip', { i }));
    ACC.forEach((a, i) => R(2, HOSP_T.status + i * 0.05, 'blip', { i, on: a[2] === 'HOSP' }));
    R(2, 1.15, 'pop', { f: 560 }); R(2, 1.23, 'pop', { f: 700 });
    R(2, 0.6, 'type', { d: 0.5, n: 30 });
    // 04 comandas
    PRODUCTS.forEach((_, i) => {
      R(3, COM_T.add + i * COM_T.step, 'press', { i });
      R(3, COM_T.add + i * COM_T.step + COM_T.fly, 'coin', { i, v: 0.7 });
    });
    R(3, -0.05, 'pop', { f: 480 });
    R(3, 0.7, 'type', { d: 0.5, n: 34 });
    // 05 pagamentos
    R(4, PAG_T.cash - 0.22, 'whoosh', { d: 0.24, pan: -0.8 }); R(4, PAG_T.cash, 'thud', { v: 0.5 });
    R(4, PAG_T.card - 0.22, 'whoosh', { d: 0.24, pan: 0.8 }); R(4, PAG_T.card, 'card', { v: 0.8 });
    R(4, PAG_T.pix - 0.22, 'whoosh', { d: 0.24, pan: 0 }); R(4, PAG_T.pix, 'thud', { v: 0.6 });
    R(4, PAG_T.stamp, 'stamp', { v: 1 });
    SHAKES.push([roomT(4) + PAG_T.stamp, 14, 0.25]);
    R(4, 0.4, 'type', { d: 0.5, n: 23 });
    // 06 caixa
    [0, 1, 2].forEach((i) => { R(5, CX_T.rows + i * CX_T.step, 'whoosh', { d: 0.25, pan: -0.6, v: 0.5 }); R(5, CX_T.rows + i * CX_T.step + 0.05, 'roll', { d: 0.55, v: 0.6 }); });
    R(5, CX_T.line, 'swish', { v: 0.6, pan: 0.3 });
    R(5, CX_T.saldo, 'register', { v: 1 });
    R(5, CX_T.close, 'confirm', { v: 0.8 });
    R(5, 0.25, 'pop', { f: 600 });
    R(5, 0.55, 'type', { d: 0.6, n: 40 });
    // RECUO + CASA
    cue(PULL[0], 'pull', { d: PULL[1] - PULL[0] });
    cue(ROOF2_T - 0.24, 'fall', { d: 0.24, v: 0.8 });
    cue(ROOF2_T, 'roof', { v: 0.9 });
    SHAKES.push([ROOF2_T, 12, 0.3]);
    cue(T.house + 0.55, 'rise', { v: 0.5 });
    // ENCAIXE NA LOGO + PILARES
    cue(MORPH[0], 'morph', { d: MORPH[1] - MORPH[0] });
    cue(MORPH[0] + 0.12, 'ring', { d: 0.5 });
    cue(MORPH[1] - 0.05, 'lock', { v: 1 });
    PILLARS.forEach((pl, i) => cue(pl.t, 'slam', { v: 0.55 + i * 0.15, soft: true }));
    // ASSINATURA
    cue(T.sign, 'ding', { v: 1, big: true }); cue(T.sign, 'boom', { v: 0.8, soft: true });
    SHAKES.push([T.sign, 10, 0.35]);
    cue(T.sign + 0.02, 'swish', { v: 0.6, pan: 0 });
    cue(T.sign + 0.22, 'rise', { v: 0.5 });
    cue(T.sign + 0.42, 'type', { d: 0.5, n: 31 });
    cue(T.sign + 0.95, 'pop', { f: 760, v: 1 });
    cue(T.sign + BAR, 'glint', { d: 0.75 });
    CUES.sort((a, b) => a.t - b.t);
  }

  function init(img) {
    LOGO = img;
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    layoutHook(ctx);
    layoutHouse(ctx);
    buildCues();
  }

  window.REEL00 = {
    init, renderAt, renderCover, DURATION, W, H, BPM,
    cues: () => ({ bpm: BPM, duration: DURATION, sections: T, cues: CUES.slice() }),
  };
})();
