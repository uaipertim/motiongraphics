/* =====================================================================
   FAZLO Hospeda — Stories "Conheça" (Destaque permanente) — 4 x 8 s, 1080x1920
   Motor em Canvas 2D, determinístico: renderAt(ctx, n, t) desenha o quadro
   exato do instante t do Story n. Um mesmo elemento costura os quatro: a
   FITA, uma faixa limão com texto que gira em 3D. Ela sai pela direita de um
   Story e entra pela esquerda do seguinte, sempre na mesma altura (a "pista").
     1 · marca       a fita vira um anel planetário em volta da logo
     2 · reservas    a fita vira o cordão de um chaveiro de acomodações
     3 · financeiro  a fita vira a linha do fluxo de caixa
     4 · convite     a fita emoldura o convite e aponta para o link
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const BPM = 120, BT = 60 / BPM;                     // 1 tempo = 0,5 s · cada Story = 4 compassos
  const DURATION = [8, 8, 8, 8];
  const LANE_Y = 1588;                                 // pista de entrada/saída da fita
  const DISPLAY = "'ST Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'ST Mono', 'JetBrains Mono', monospace";

  const C = {
    black: '#0A0A0A', panel: '#151515', line2: '#3A3A3A',
    lime: '#AFFA27', limeD: '#8CD10C', limeL: '#D8FF8A', limeDeep: '#5A8A0E',
    white: '#FFFFFF', paper: '#F2F2EC', ink: '#0A0A0A',
    gray: '#8E8E88', grayD: '#5E5E59', grayL: '#B9B9B1',
    livre: '#4CC067', pre: '#FF8A1F', checkin: '#3D8BFF', checkout: '#F5B638', in: '#3CCB6E', out: '#FF4D5E',
  };

  // ---------------------------------------------------------------- utilitários
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    inQuad: (x) => x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  };
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b); t = clamp(t);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  }
  function rgba(c, a) { const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${clamp(a)})`; }
  function hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const kick = (t, t0, dur = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / dur) * 4));
  function brl(v, sign = '') {
    const c = Math.round(Math.abs(v) * 100);
    return `${sign}R$ ${Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${String(c % 100).padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------- primitivas
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function stroke(ctx, color, lw) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
  function fill(ctx, color) { ctx.fillStyle = color; ctx.fill(); }
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
  function txt(ctx, s, x, y, o) {
    setFont(ctx, o.fam || MONO, o.size, o.weight || 800, o.align || 'left', o.ls || 0);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.fillStyle = o.color; ctx.fillText(s, x, y);
    ctx.restore();
  }
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
  /** Linha com máscara: sobe por trás de uma linha invisível. */
  function riseLine(ctx, segs, x, y, pin, pout, o) {
    if (pin <= 0 || pout >= 1) return 0;
    const size = o.size, weight = o.weight || 900, ls = o.ls ?? -size * 0.025, fam = o.fam || DISPLAY;
    const ws = segs.map((s) => tw(ctx, s.s, s.fam || fam, size, s.weight || weight, ls));
    const total = ws.reduce((a, b) => a + b, 0);
    const left = o.align === 'center' ? x - total / 2 : x;
    const off = (1 - E.outExpo(clamp(pin))) * size * 1.3 - E.inCubic(clamp(pout)) * size * 1.3;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.beginPath(); ctx.rect(left - 80, y - size * 1.05, total + 160, size * 1.4); ctx.clip();
    let cx = left;
    segs.forEach((s, i) => { setFont(ctx, s.fam || fam, size, s.weight || weight, 'left', ls); ctx.fillStyle = s.color || o.color; ctx.fillText(s.s, cx, y + off); cx += ws[i]; });
    ctx.restore();
    return total;
  }
  function lines(ctx, t, rows, o) {
    // rows: [{segs, t}] — entram uma a uma e saem juntas em o.tout
    rows.forEach((r, i) => riseLine(ctx, r.segs, o.x ?? 540, o.y + i * o.size * (o.lh || 1.06), p(t, r.t - 0.02, r.t + 0.42),
      o.tout !== undefined ? p(t, o.tout + i * 0.05, o.tout + i * 0.05 + 0.3) : 0, { size: o.size, color: o.color || C.white, align: o.align || 'center', weight: o.weight }));
  }

  // ---------------------------------------------------------------- ícones (traço contínuo, caixa unitária)
  const ICONS = {
    calendar(ctx, k) {
      ctx.beginPath(); ctx.roundRect(-0.4, -0.32, 0.8, 0.72, 0.1); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.4, -0.1); ctx.lineTo(0.4, -0.1); ctx.moveTo(-0.2, -0.45); ctx.lineTo(-0.2, -0.24); ctx.moveTo(0.2, -0.45); ctx.lineTo(0.2, -0.24); stroke(ctx, k.line, k.lw);
      for (const [x, y] of [[-0.2, 0.08], [0, 0.08], [0.2, 0.08], [-0.2, 0.24], [0, 0.24]]) { circle(ctx, x, y, 0.045); fill(ctx, k.line); }
    },
    key(ctx, k) {
      circle(ctx, -0.22, 0, 0.18); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.04, 0); ctx.lineTo(0.44, 0); ctx.moveTo(0.3, 0); ctx.lineTo(0.3, 0.15); ctx.moveTo(0.41, 0); ctx.lineTo(0.41, 0.11); stroke(ctx, k.line, k.lw);
    },
    receipt(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.3, -0.42); ctx.lineTo(0.3, -0.42); ctx.lineTo(0.3, 0.42);
      for (let i = 0; i < 6; i++) { const x = 0.3 - (i + 0.5) * 0.1; ctx.lineTo(x, 0.34); ctx.lineTo(x - 0.05, 0.42); }
      ctx.closePath(); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); for (const y of [-0.22, -0.06, 0.1]) { ctx.moveTo(-0.16, y); ctx.lineTo(0.16, y); } stroke(ctx, k.line, k.lw);
    },
    card(ctx, k) {
      ctx.beginPath(); ctx.roundRect(-0.44, -0.3, 0.88, 0.6, 0.1); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.44, -0.1); ctx.lineTo(0.44, -0.1); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.28, 0.14); ctx.lineTo(-0.06, 0.14); stroke(ctx, k.line, k.lw);
    },
    qr(ctx, k) {
      for (const [x, y] of [[-0.42, -0.42], [0.12, -0.42], [-0.42, 0.12]]) { ctx.beginPath(); ctx.rect(x, y, 0.3, 0.3); stroke(ctx, k.line, k.lw); }
      for (const [x, y] of [[0.14, 0.14], [0.32, 0.32], [0.14, 0.34], [0.34, 0.12]]) { ctx.beginPath(); ctx.rect(x - 0.05, y - 0.05, 0.1, 0.1); fill(ctx, k.line); }
    },
    in(ctx, k) {
      ctx.beginPath(); ctx.moveTo(0.04, -0.42); ctx.lineTo(0.38, -0.42); ctx.lineTo(0.38, 0.42); ctx.lineTo(0.04, 0.42); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.42, 0); ctx.lineTo(0.18, 0); ctx.moveTo(0, -0.18); ctx.lineTo(0.18, 0); ctx.lineTo(0, 0.18); stroke(ctx, k.line, k.lw);
    },
    out(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.04, -0.42); ctx.lineTo(-0.38, -0.42); ctx.lineTo(-0.38, 0.42); ctx.lineTo(-0.04, 0.42); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.16, 0); ctx.lineTo(0.42, 0); ctx.moveTo(0.24, -0.18); ctx.lineTo(0.42, 0); ctx.lineTo(0.24, 0.18); stroke(ctx, k.line, k.lw);
    },
    bed(ctx, k) {
      ctx.beginPath(); ctx.moveTo(-0.42, -0.32); ctx.lineTo(-0.42, 0.32); ctx.moveTo(-0.42, 0.14); ctx.lineTo(0.42, 0.14); ctx.lineTo(0.42, 0.32); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.42, -0.04); ctx.lineTo(0.3, -0.04); ctx.quadraticCurveTo(0.42, -0.04, 0.42, 0.08); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.roundRect(-0.32, -0.24, 0.24, 0.12, 0.05); stroke(ctx, k.line, k.lw);
    },
    check(ctx, k) {
      circle(ctx, 0, 0, 0.4); stroke(ctx, k.line, k.lw);
      ctx.beginPath(); ctx.moveTo(-0.18, 0.01); ctx.lineTo(-0.04, 0.15); ctx.lineTo(0.2, -0.12); stroke(ctx, k.line, k.lw);
    },
    cash(ctx, k) {
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0.24 - i * 0.2, 0.36, 0.1, 0, 0, TAU); stroke(ctx, k.line, k.lw); }
      ctx.beginPath(); ctx.moveTo(-0.36, 0.24); ctx.lineTo(-0.36, -0.16); ctx.moveTo(0.36, 0.24); ctx.lineTo(0.36, -0.16); stroke(ctx, k.line, k.lw);
    },
  };
  function icon(ctx, name, x, y, size, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
    ICONS[name](ctx, { line: o.line || C.ink, lw: (o.lw || 7) / size });
    ctx.restore();
  }

  // ---------------------------------------------------------------- logo (imagem fornecida, sem alteração)
  let LOGO = null;
  function logo(ctx, x, y, d, o = {}) {
    const sc = o.scale ?? 1, alpha = o.alpha ?? 1;
    if (sc <= 0.001 || alpha <= 0.001) return;
    const D = d * sc;
    ctx.save(); ctx.globalAlpha *= alpha;
    if (LOGO) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(LOGO, x - D / 2, y - D / 2, D, D); }
    else { circle(ctx, x, y, D / 2); fill(ctx, C.black); }
    ctx.restore();
  }

  // =====================================================================
  // A FITA
  // =====================================================================
  function catmull(pts, seg = 14) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < seg; k++) {
        const u = k / seg, u2 = u * u, u3 = u2 * u;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  /** Reamostra por comprimento de arco: P[i] fica a i*step px do início. */
  function makePath(poly, step = 5) {
    const cum = [0];
    for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
    const L = cum[cum.length - 1], P = [];
    let j = 0;
    for (let s = 0; s <= L; s += step) {
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const f = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
      P.push([lerp(poly[j][0], poly[j + 1][0], f), lerp(poly[j][1], poly[j + 1][1], f)]);
    }
    const T = P.map((_, i) => {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return [dx / l, dy / l];
    });
    return { P, T, L, step, cum };
  }
  function pathAt(path, s) {
    const i = clamp(Math.round(s / path.step), 0, path.P.length - 1);
    return { x: path.P[i][0], y: path.P[i][1], tx: path.T[i][0], ty: path.T[i][1], i };
  }
  /** Desenha a fita entre s0 e s1. Torção: a largura projetada é w·cos(φ), φ = phase + s·twist.
   *  Frente limão, verso oliva; o tom acompanha |cos φ| (luz). o.pass(i) separa passes de profundidade. */
  function ribbon(ctx, path, o) {
    const step = path.step, n = path.P.length;
    const i0 = Math.max(0, Math.floor(o.s0 / step)), i1 = Math.min(n - 1, Math.ceil(o.s1 / step));
    if (i1 - i0 < 2) return;
    const w2 = o.w / 2, tail = o.taper ?? 90, headT = o.taperHead ?? 40;
    const Lp = [], Rp = [], cs = [], ok = [];
    for (let i = i0; i <= i1; i++) {
      const [x, y] = path.P[i], [tx, ty] = path.T[i], s = i * step;
      const c = Math.cos(o.phase + s * o.twist);
      const tp = clamp(Math.min((s - o.s0) / tail, (o.s1 - s) / headT));
      const h = w2 * c * Math.sqrt(tp);
      Lp.push([x - ty * h, y + tx * h]); Rp.push([x + ty * h, y - tx * h]);
      cs.push(c); ok.push(!o.pass || o.pass(i));
    }
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    // brilho difuso por baixo
    if (o.glow !== false) {
      ctx.beginPath();
      let started = false;
      for (let k = 0; k < cs.length; k += 2) {
        if (!ok[k]) { started = false; continue; }
        const [x, y] = path.P[i0 + k];
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.shadowColor = rgba(C.lime, 0.55); ctx.shadowBlur = 50;
      stroke(ctx, rgba(C.lime, 0.12), o.w * 0.8);
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    }
    // faixas agrupadas por lado e tom
    const keyOf = (c) => (c >= 0 ? 'f' : 'b') + Math.min(7, Math.floor(Math.abs(c) * 8));
    let a = 0;
    while (a < cs.length - 1) {
      if (!ok[a] || !ok[a + 1]) { a++; continue; }
      const k = keyOf((cs[a] + cs[a + 1]) / 2);
      let b = a + 1;
      while (b < cs.length - 1 && ok[b + 1] && keyOf((cs[b] + cs[b + 1]) / 2) === k) b++;
      ctx.beginPath();
      ctx.moveTo(Lp[a][0], Lp[a][1]);
      for (let q = a + 1; q <= b; q++) ctx.lineTo(Lp[q][0], Lp[q][1]);
      for (let q = b; q >= a; q--) ctx.lineTo(Rp[q][0], Rp[q][1]);
      ctx.closePath();
      const lvl = (parseInt(k.slice(1), 10) + 0.5) / 8;
      const col = k[0] === 'f' ? mix(C.limeDeep, C.lime, 0.25 + 0.75 * lvl) : mix('#101804', '#46661A', 0.2 + 0.8 * lvl);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();       // fecha as costuras entre faixas
      a = b;
    }
    // texto impresso na fita
    if (o.text) {
      const len = o.text.length, fs = o.fs, adv = o.adv;
      setFont(ctx, MONO, fs, 800, 'center', 0);
      const j0 = Math.ceil((o.s0 + tail - o.shift) / adv), j1 = Math.floor((o.s1 - headT - o.shift) / adv);
      for (let j = j0; j <= j1; j++) {
        const s = o.shift + j * adv, i = Math.round(s / step);
        if (i < i0 || i > i1 || !ok[i - i0]) continue;
        const c = Math.cos(o.phase + s * o.twist);
        if (c < 0.28) continue;
        const ch = o.text[((j % len) + len) % len];
        if (ch === ' ') continue;
        const [x, y] = path.P[i], [tx, ty] = path.T[i];
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(ty, tx)); ctx.scale(1, c);
        ctx.fillStyle = rgba(C.ink, clamp((c - 0.28) * 3)); ctx.fillText(ch, 0, fs * 0.36);
        ctx.restore();
      }
    }
    // ponta luminosa
    if (o.head && o.s1 < path.L - 2) {
      const h = pathAt(path, o.s1 - 6);
      radial(ctx, h.x, h.y, 90, C.limeL, 0.5);
    }
    ctx.restore();
  }
  const RIB = { w: 78, fs: 31, adv: 31 * 0.62 };

  // ---------------------------------------------------------------- fundo comum aos quatro Stories
  function bg(ctx, n, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0C0C0C'); g.addColorStop(1, '#050505');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const gx = [[300, 700], [780, 1000], [260, 1250], [540, 760]][n - 1];
    radial(ctx, gx[0] + Math.sin(t * 0.6) * 60, gx[1] + Math.cos(t * 0.5) * 50, 900, C.lime, 0.09);
    radial(ctx, 1080 - gx[0], H - gx[1] * 0.6, 700, C.lime, 0.05);
    for (let i = 0; i < 46; i++) {
      const sp = 14 + hash(i, 5 + n) * 36, x = (hash(i, 6 + n) * W + Math.sin(t * 0.5 + i) * 18) % W, y = H - ((t * sp + hash(i, 7 + n) * H) % H);
      circle(ctx, x, y, 1.4 + hash(i, 8) * 2.4); fill(ctx, rgba(C.lime, 0.1 + 0.2 * hash(i, 9)));
    }
  }

  // ---------------------------------------------------------------- cues de som
  const CUES = [[], [], [], []];
  const cue = (n, t, type, o = {}) => CUES[n - 1].push(Object.assign({ t: Math.round(t * 1e4) / 1e4, type }, o));

  // entra pela pista da esquerda / sai pela pista da direita (os mesmos pontos nos 4 Stories)
  const IN = [[-300, LANE_Y + 10], [-80, LANE_Y - 6]];
  const OUT = [[1160, LANE_Y - 6], [1380, LANE_Y + 10]];

  // =====================================================================
  // STORY 1 · A MARCA — a fita vira um anel planetário em volta da logo
  // =====================================================================
  const S1 = { logo: 2 * BT, name: 2.5 * BT, up: [4.7 * BT, 5.9 * BT], statement: 6 * BT, list: 9 * BT, exit: [14.5 * BT, 16 * BT] };
  const MODULES = [
    { s: 'Reservas', ic: 'calendar' }, { s: 'Hospedagens', ic: 'key' }, { s: 'Comandas', ic: 'receipt' },
    { s: 'Pagamentos', ic: 'card' }, { s: 'Caixa', ic: 'cash' },
  ];
  function s1Ring(t) {
    const u = E.inOutCubic(p(t, S1.up[0], S1.up[1]));
    return { cx: 540, cy: lerp(790, 570, u), rx: lerp(430, 345, u), ry: lerp(136, 108, u), tilt: -0.17, d: lerp(430, 320, u) };
  }
  function s1Path(t) {
    const R = s1Ring(t), ct = Math.cos(R.tilt), st = Math.sin(R.tilt);
    const ell = (a) => { const x = R.rx * Math.cos(a), y = R.ry * Math.sin(a); return [R.cx + x * ct - y * st, R.cy + x * st + y * ct]; };
    const a0 = Math.PI, a1 = Math.PI - (480 / 180) * Math.PI;          // 1 volta e 1/3, pela frente primeiro
    const entry = catmull([IN[0], IN[1], [160, LANE_Y - 70], [R.cx - R.rx - 120, R.cy + 330], [R.cx - R.rx - 30, R.cy + 90], ell(a0)], 18);
    const ring = [];
    for (let k = 1; k <= 160; k++) ring.push(ell(lerp(a0, a1, k / 160)));
    const exit = catmull([ell(a1), [R.cx + R.rx + 30, R.cy - 30], [R.cx + R.rx + 95, R.cy + 240], [1000, LANE_Y - 210], [1045, LANE_Y - 40], OUT[0], OUT[1]], 18).slice(1);
    const path = makePath(entry.concat(ring, exit));
    // fronteiras (em px) entre entrada, anel e saída, e o lado de trás do anel
    const lenOf = (poly) => poly.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - poly[i - 1][0], q[1] - poly[i - 1][1]) : 0), 0);
    path.eL = lenOf(entry);
    path.rL = lenOf([entry[entry.length - 1]].concat(ring));
    path.back = (i) => {
      const s = i * path.step;
      if (s < path.eL || s > path.eL + path.rL) return false;
      const [x, y] = path.P[i], dx = x - R.cx, dy = y - R.cy;
      return -dx * st + dy * ct < 0;           // metade de cima da elipse = atrás da logo
    };
    path.R = R;
    return path;
  }
  function story1(ctx, t) {
    bg(ctx, 1, t);
    const path = s1Path(t), R = path.R;
    const loopS = path.eL, ringEnd = path.eL + path.rL;
    // cabeça corre a entrada e o anel; a cauda recolhe a entrada; na saída o anel se desenrola pela pista
    const exP = p(t, S1.exit[0], S1.exit[1]), ex = E.inCubic(exP);
    let s1 = lerp(0, ringEnd, E.outCubic(p(t, -0.12, 1.05)));
    let s0 = lerp(0, loopS + path.rL * 0.24, E.inOutCubic(p(t, 0.45, 1.5)));
    s1 = lerp(s1, path.L + 300, E.inOutCubic(exP)); s0 = lerp(s0, path.L, ex);   // a ponta puxa a saída pela pista; a cauda vem atrás
    const common = { s0, s1, w: RIB.w, twist: TAU / 1500, phase: -t * 1.4, text: 'RESERVAS · HOSPEDAGENS · COMANDAS · PAGAMENTOS · CAIXA · ', fs: RIB.fs, adv: RIB.adv, shift: t * 140, head: t < 1.1 || ex > 0 };
    ribbon(ctx, path, Object.assign({}, common, { pass: (i) => path.back(i), glow: false }));
    // logo no centro do anel
    const la = p(t, S1.logo - 0.04, S1.logo + 0.4);
    if (la > 0) {
      const sw = p(t, S1.logo, S1.logo + 0.9);
      if (sw < 1) { circle(ctx, R.cx, R.cy, lerp(R.d * 0.5, 820, E.outExpo(sw))); stroke(ctx, rgba(C.lime, 1 - sw), 12 * (1 - sw) + 1); }
      radial(ctx, R.cx, R.cy, R.d * 1.1, C.lime, 0.24 + 0.3 * kick(t, S1.logo, 0.8));
      const beat = Math.floor(t / BT), pulse = t > S1.logo ? kick(t, beat * BT, 0.22) * 0.02 : 0;
      logo(ctx, R.cx, R.cy, R.d, { scale: E.outBack(la, 2.4) * (1 + pulse) * (1 - 0.9 * ex), alpha: 1 - p(ex, 0.6, 1) });
    }
    ribbon(ctx, path, Object.assign({}, common, { pass: (i) => !path.back(i) }));
    // nome
    const nOut = p(t, S1.up[0] - 0.15, S1.up[0] + 0.2);
    typeText(ctx, 'CONHEÇA O', 540, 1150 - 40 * E.inCubic(nOut), p(t, S1.logo + 0.1, S1.logo + 0.45), { size: 36, weight: 800, color: C.lime, ls: 9, align: 'center', alpha: 1 - nOut });
    const NS = 132, w1 = tw(ctx, 'FAZLO ', DISPLAY, NS, 900, -3.3), w2 = tw(ctx, 'Hospeda', DISPLAY, NS, 700, -3.3), nx = 540 - (w1 + w2) / 2;
    riseLine(ctx, [{ s: 'FAZLO ' }], nx, 1290, p(t, S1.name, S1.name + 0.45), nOut, { size: NS, weight: 900, color: C.white, ls: -3.3 });
    riseLine(ctx, [{ s: 'Hospeda', weight: 700 }], nx + w1, 1290, p(t, S1.name + 0.08, S1.name + 0.53), nOut, { size: NS, weight: 700, color: C.white, ls: -3.3 });
    // a promessa
    lines(ctx, t, [
      { segs: [{ s: 'Toda a gestão' }], t: S1.statement },
      { segs: [{ s: 'da pousada em' }], t: S1.statement + BT / 2 },
      { segs: [{ s: 'um só sistema.', color: C.lime }], t: S1.statement + BT },
    ], { y: 1010, size: 108, tout: S1.list - 0.4 });
    // os cinco módulos: uma faísca sai do anel e cada linha se desdobra como uma aba
    const lOut = p(t, S1.exit[0] - 0.35, S1.exit[0]);
    typeText(ctx, 'MÓDULOS INTEGRADOS', 540, 905 - 30 * E.inCubic(lOut), p(t, S1.list - 0.1, S1.list + 0.3), { size: 30, weight: 800, color: C.lime, ls: 7, align: 'center', alpha: 1 - lOut });
    const colW = Math.max(...MODULES.map((m) => tw(ctx, m.s, DISPLAY, 70, 800, -1.6))) + 96, colX = 540 - colW / 2;
    MODULES.forEach((m, i) => {
      const t0 = S1.list + i * (BT / 2), ty = 1000 + i * 104;
      // faísca: do anel até o ícone
      const sp = p(t, t0 - 0.24, t0);
      if (sp > 0 && sp < 1) {
        const a0 = R.cy + R.ry + 20, e = E.inQuad(sp);
        const fx = lerp(R.cx + (i - 2) * 60, colX + 32, e), fy = lerp(a0, ty - 22, e);
        const fx0 = lerp(R.cx + (i - 2) * 60, colX + 32, E.inQuad(Math.max(0, sp - 0.25))), fy0 = lerp(a0, ty - 22, E.inQuad(Math.max(0, sp - 0.25)));
        ctx.beginPath(); ctx.moveTo(fx0, fy0); ctx.lineTo(fx, fy); stroke(ctx, rgba(C.limeL, 0.8), 6);
        radial(ctx, fx, fy, 50, C.limeL, 0.7);
      }
      const u = p(t, t0, t0 + 0.38);
      if (u <= 0) return;
      const out = E.inCubic(p(t, S1.exit[0] - 0.35 + i * 0.05, S1.exit[0] + 0.05 + i * 0.05));
      const sy = Math.max(0.02, E.outBack(u, 2.2));
      ctx.save(); ctx.globalAlpha *= clamp(u * 3) * (1 - out);
      ctx.translate(colX + out * 900, ty - 22); ctx.scale(1, sy); ctx.translate(0, 22);
      radial(ctx, 32, -22, 90, C.lime, 0.5 * kick(t, t0, 0.3));
      circle(ctx, 32, -22, 34); fill(ctx, C.lime);
      icon(ctx, m.ic, 32, -22, 40, { line: C.ink, lw: 5 });
      txt(ctx, m.s, 96, 4, { fam: DISPLAY, size: 70, weight: 800, color: mix(C.lime, C.white, p(t, t0 + 0.1, t0 + 0.4)), ls: -1.6 });
      ctx.restore();
    });
  }

  // =====================================================================
  // STORY 2 · RESERVAS E HOSPEDAGENS — o cordão do chaveiro
  // =====================================================================
  // acomodações e status dos dados de demonstração do app; cada status com a cor da legenda do calendário
  const TAGS = [
    { n: '01', name: 'BICA D\'ÁGUA', type: 'CASAL', st: 'CHECK-IN', col: C.checkin, fg: C.ink, ic: 'in' },
    { n: '05', name: 'CHALÉ DE PEDRA', type: 'FAMÍLIA', st: 'HOSPEDADA', col: C.ink, fg: C.lime, ic: 'bed' },
    { n: '08', name: 'IPÊ', type: 'CASAL STANDARD', st: 'CHECK-OUT', col: C.checkout, fg: C.ink, ic: 'out' },
    { n: '09', name: 'IPÊ', type: 'CASAL STANDARD', st: 'LIVRE', col: C.livre, fg: C.ink, ic: 'check' },
  ];
  const TAG = { w: 204, h: 330, xs: [180, 413, 646, 879] };
  const S2 = { title: 0.15, tags: 2 * BT, flip: 5 * BT, sub: 9 * BT, chips: 11 * BT, exit: [14.4 * BT, 16 * BT] };
  const s2Sag = (x) => 818 + 46 * (1 - Math.pow((x - 530) / 470, 2));
  function s2Path() {
    const cat = [];
    for (let k = 0; k <= 12; k++) { const x = lerp(60, 1000, k / 12); cat.push([x, s2Sag(x)]); }
    const pts = [IN[0], IN[1], [120, LANE_Y - 120], [40, 1200]].concat(cat, [[1042, 1000], [1040, 1300], [1000, LANE_Y - 110], OUT[0], OUT[1]]);   // desce pela direita até a pista
    const path = makePath(catmull(pts, 16));
    // s de cada etiqueta = ponto do cordão mais próximo do x da etiqueta, na parte do varal
    const onCord = (i) => path.P[i][1] < 1000 && path.P[i][0] < 1040;
    path.tagS = TAG.xs.map((x) => {
      let best = 0, bd = 1e9;
      path.P.forEach(([px], i) => { if (onCord(i)) { const d = Math.abs(px - x); if (d < bd) { bd = d; best = i; } } });
      return best * path.step;
    });
    path.cordS = path.P.findIndex((_, i) => onCord(i)) * path.step;      // início do varal
    path.catEnd = path.tagS[3] + 200;
    return path;
  }
  let S2PATH = null;
  const tagArrive = (i) => S2.tags + (TAGS.length - 1 - i) * (BT / 2);   // da direita para a esquerda
  function tagShape(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 50, 0); ctx.lineTo(w / 2 - 50, 0); ctx.lineTo(w / 2, 50); ctx.lineTo(w / 2, h - 26); ctx.quadraticCurveTo(w / 2, h, w / 2 - 26, h);
    ctx.lineTo(-w / 2 + 26, h); ctx.quadraticCurveTo(-w / 2, h, -w / 2, h - 26); ctx.lineTo(-w / 2, 50); ctx.closePath();
  }
  function drawTag(ctx, tg, x, y, ang, flip, glow) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    // argola presa à fita
    circle(ctx, 0, 0, 20); stroke(ctx, '#D9D9D2', 7);
    const fx = Math.cos(flip * Math.PI), back = fx < 0;
    ctx.translate(0, 18); ctx.scale(Math.max(0.02, Math.abs(fx)), 1);
    const w = TAG.w, h = TAG.h;
    if (back && glow > 0) radial(ctx, 0, h / 2, 260, tg.col === C.ink ? C.lime : tg.col, 0.45 * glow);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
    tagShape(ctx, w, h); fill(ctx, back ? tg.col : C.paper);
    ctx.restore();
    if (back && tg.col === C.ink) { tagShape(ctx, w, h); stroke(ctx, C.lime, 4); }
    circle(ctx, 0, 34, 14); fill(ctx, back ? rgba(C.black, 0.3) : '#CFCFC7');
    if (!back) {
      // frente: número e acomodação
      txt(ctx, 'Nº', 0, 96, { size: 20, weight: 800, color: C.grayD, align: 'center', ls: 2 });
      txt(ctx, tg.n, 0, 200, { fam: DISPLAY, size: 112, weight: 900, color: C.ink, align: 'center', ls: -4 });
      txt(ctx, tg.name, 0, 248, { size: tg.name.length > 11 ? 19 : 22, weight: 800, color: C.ink, align: 'center', ls: 1 });
      ctx.beginPath(); ctx.moveTo(-w / 2 + 22, 272); ctx.lineTo(w / 2 - 22, 272); ctx.setLineDash([5, 7]); stroke(ctx, '#BDBDB4', 2.5); ctx.setLineDash([]);
      txt(ctx, tg.type, 0, 306, { size: tg.type.length > 9 ? 15 : 18, weight: 700, color: C.grayD, align: 'center', ls: 1.5 });
    } else {
      // verso: o status, com ícone
      icon(ctx, tg.ic, 0, 160, 116, { line: tg.fg, lw: 9 });
      txt(ctx, tg.st, 0, 282, { size: tg.st.length > 8 ? 24 : 28, weight: 800, color: tg.fg, align: 'center', ls: 1.5 });
    }
    ctx.restore();
  }
  function story2(ctx, t) {
    bg(ctx, 2, t);
    const path = S2PATH;
    const exP = p(t, S2.exit[0], S2.exit[1]), ex = E.inCubic(exP);
    const s1 = lerp(lerp(0, path.catEnd, E.outCubic(p(t, -0.12, 1.0))), path.L + 300, E.inOutCubic(exP));
    const s0 = lerp(0, path.L, ex);
    const adv = ex * (path.L - path.tagS[0] + 300);
    // etiquetas: deslizam pelo varal vindas da esquerda, uma por colcheia, e balançam ao parar
    const c0 = pathAt(path, path.cordS);
    const tagInfo = TAGS.map((tg, i) => {
      const ta = tagArrive(i);
      const u = E.outCubic(p(t, ta - 0.5, ta));
      const s = lerp(path.cordS - 420, path.tagS[i], u);
      let x, y;
      if (s >= path.cordS) { const q = pathAt(path, s); x = q.x; y = q.y; } else { x = c0.x - (path.cordS - s); y = c0.y; }
      x += ex * 1500;                                  // na saída, seguem para a direita na altura do varal
      const dt = t - ta;
      const swing = dt > 0 ? 0.36 * Math.exp(-dt * 2.6) * Math.sin(dt * 9) : -0.25 * Math.sin(u * Math.PI);
      const exSwing = ex > 0 ? -0.5 * Math.sin(ex * Math.PI) : 0;
      return { tg, i, x, y, ang: swing + exSwing + 0.03 * Math.sin(t * 2.2 + i), on: u > 0 };
    });
    ribbon(ctx, path, { s0, s1, w: RIB.w, twist: TAU / 1700, phase: -t * 1.3, text: 'LIVRE · CONFIRMADA · CHECK-IN · HOSPEDADA · CHECK-OUT · ', fs: RIB.fs, adv: RIB.adv, shift: t * 120 + adv, head: t < 1.0 || ex > 0 });
    tagInfo.forEach((g) => {
      if (!g.on) return;
      const tf = S2.flip + g.i * (BT / 2);
      const fl = E.inOutCubic(p(t, tf, tf + BT));       // de perfil em tf + 1/8, status à mostra em tf + 1/4
      drawTag(ctx, g.tg, g.x, g.y, g.ang, fl, kick(t, tf + BT * 0.8, 0.5));
    });
    lines(ctx, t, [
      { segs: [{ s: 'Reservas e' }], t: S2.title },
      { segs: [{ s: 'hospedagens' }], t: S2.title + BT / 2 },
      { segs: [{ s: 'organizadas.', color: C.lime }], t: S2.title + BT },
    ], { y: 390, size: 106, tout: S2.exit[0] - 0.1 });
    lines(ctx, t, [
      { segs: [{ s: 'Calendário de ocupação,' }], t: S2.sub },
      { segs: [{ s: 'check-in, check-out e status', color: C.grayL }], t: S2.sub + BT / 2 },
      { segs: [{ s: 'de cada acomodação.', color: C.grayL }], t: S2.sub + BT },
    ], { y: 1330, size: 50, weight: 800, tout: S2.exit[0] - 0.05 });
    // visões do calendário: o destaque percorre dia, semana e mês
    const VIEWS = ['DIA', 'SEMANA', 'MÊS'], vx = [290, 540, 790];
    const out = E.inCubic(p(t, S2.exit[0] - 0.1, S2.exit[0] + 0.25));
    const hop = clamp((t - (S2.chips + 1.5 * BT)) / BT, 0, 2), hi = Math.floor(hop), hf = E.inOutCubic(clamp((hop - hi) * 2.5));
    const selX = hop >= 2 ? vx[2] : lerp(vx[hi], vx[Math.min(2, hi + 1)], hf);
    const ws = VIEWS.map((m) => tw(ctx, m, MONO, 30, 800, 3) + 70);
    const selW = hop >= 2 ? ws[2] : lerp(ws[hi], ws[Math.min(2, hi + 1)], hf);
    VIEWS.forEach((m, i) => {
      const u = E.outBack(p(t, S2.chips + i * (BT / 2), S2.chips + i * (BT / 2) + 0.3));
      if (u <= 0) return;
      ctx.save(); ctx.translate(vx[i], 1550); ctx.scale(u * (1 - out), u * (1 - out));
      rr(ctx, -ws[i] / 2, -36, ws[i], 72, 36); fill(ctx, '#1A1A1A'); rr(ctx, -ws[i] / 2, -36, ws[i], 72, 36); stroke(ctx, C.line2, 3);
      ctx.restore();
    });
    const su = E.outBack(p(t, S2.chips, S2.chips + 0.3)) * (1 - out);
    if (su > 0) { ctx.save(); ctx.translate(selX, 1550); ctx.scale(su, su); rr(ctx, -selW / 2, -36, selW, 72, 36); fill(ctx, C.lime); ctx.restore(); }
    VIEWS.forEach((m, i) => {
      const u = E.outBack(p(t, S2.chips + i * (BT / 2), S2.chips + i * (BT / 2) + 0.3));
      if (u <= 0) return;
      const on = clamp(1 - Math.abs(selX - vx[i]) / 160);
      ctx.save(); ctx.translate(vx[i], 1550); ctx.scale(u * (1 - out), u * (1 - out));
      txt(ctx, m, 0, 11, { size: 30, weight: 800, color: mix(C.white, C.ink, on), align: 'center', ls: 3 });
      ctx.restore();
    });
  }

  // =====================================================================
  // STORY 3 · COMANDAS, PAGAMENTOS E CAIXA — a linha do fluxo de caixa
  // =====================================================================
  // itens e valores do cardápio de demonstração do app; caixa do dia da tela "Visão geral"
  const ITEMS = [
    { s: 'ÁGUA MINERAL', v: 5 }, { s: 'CERVEJA ARTESANAL', v: 14 }, { s: 'PORÇÃO DE PASTÉIS', v: 38 }, { s: 'PASSEIO GUIADO', v: 150 },
  ];
  const S3 = { title: 0.15, counter: 1.6 * BT, items: 2 * BT, pay: 6 * BT, paid: 7.5 * BT, drop: 8.5 * BT, cash: 9.5 * BT, exit: [14.4 * BT, 16 * BT] };
  const BELT = 1330;                                   // a fita vira uma esteira
  const CASH = [
    { label: 'ENTRADAS', v: 1525, sign: '+ ', col: C.lime },
    { label: 'SAÍDAS', v: 45, sign: '− ', col: C.out },
    { label: 'SALDO LÍQUIDO', v: 1480, sign: '', col: C.white },
  ];
  let S3PATH = null;
  function s3Path() {
    const pts = [IN[0], IN[1], [60, 1500], [175, 1352], [300, BELT], [540, BELT], [780, BELT], [905, 1352], [1020, 1500], OUT[0], OUT[1]];
    return makePath(catmull(pts, 18));
  }
  const itemAt = (i) => S3.items + i * BT;              // o item para no centro da esteira
  function comandaTotal(t) {
    let v = 0;
    ITEMS.forEach((it, i) => { v += it.v * E.outCubic(p(t, itemAt(i) + BT - 0.04, itemAt(i) + BT + 0.28)); });   // gira quando o ticket chega
    return v;
  }
  /** Odômetro: cada coluna gira; a de cima só vira quando a de baixo passa do 9. */
  function odometer(ctx, v, x, y, o) {
    const fin = o.digits, size = o.size, cellW = tw(ctx, '0', DISPLAY, size, 800, 0) * 1.02;
    const pre = tw(ctx, 'R$', DISPLAY, size * 0.42, 800, 0), suf = tw(ctx, ',00', DISPLAY, size * 0.5, 800, 0);
    const nVis = 1 + clamp(v - 9) + clamp(v - 99) + (fin > 3 ? clamp(v - 999) : 0);   // colunas visíveis (contínuo)
    const total = pre + 22 + cellW * nVis + 8 + suf, left = x - total / 2;
    txt(ctx, 'R$', left, y - size * 0.36, { fam: DISPLAY, size: size * 0.42, weight: 800, color: o.dim });
    ctx.save(); ctx.beginPath(); ctx.rect(left + pre + 10, y - size * 0.86, cellW * nVis + 20, size * 1.04); ctx.clip();
    setFont(ctx, DISPLAY, size, 800, 'center', 0); ctx.fillStyle = o.color;
    for (let k = 0; k < fin; k++) {
      const pk = Math.pow(10, k), pos = Math.floor(v / pk + 1e-9) + (k === 0 ? v - Math.floor(v) : clamp((v % pk) - (pk - 1)));
      const shown = k === 0 || v >= pk - 1 ? clamp(k === 0 ? 1 : v - (pk - 1)) : 0;
      if (shown <= 0) continue;
      const d = Math.floor(pos) % 10, f = pos - Math.floor(pos), cx = left + pre + 22 + cellW * (nVis - 1 - k) + cellW / 2;
      ctx.globalAlpha = shown;
      ctx.fillText(String(d), cx, y - f * size * 0.98);
      if (f > 0.001) ctx.fillText(String((d + 1) % 10), cx, y + (1 - f) * size * 0.98);
    }
    ctx.restore();
    txt(ctx, ',00', left + pre + 22 + cellW * nVis + 8, y, { fam: DISPLAY, size: size * 0.5, weight: 800, color: o.dim });
  }
  function ticket(ctx, it, x, y, sc, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
    const w = 580, h = 106;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 12;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 16); fill(ctx, C.paper);
    ctx.restore();
    // picote do ticket
    circle(ctx, -w / 2, 0, 13); fill(ctx, '#1E2A0C'); circle(ctx, w / 2, 0, 13); fill(ctx, '#1E2A0C');
    ctx.beginPath(); ctx.moveTo(w / 2 - 176, -h / 2 + 12); ctx.lineTo(w / 2 - 176, h / 2 - 12); ctx.setLineDash([4, 6]); stroke(ctx, '#BDBDB4', 2.5); ctx.setLineDash([]);
    txt(ctx, it.s, -w / 2 + 34, 11, { size: it.s.length > 15 ? 27 : 30, weight: 800, color: C.ink, ls: 0.3 });
    txt(ctx, brl(it.v), w / 2 - 88, 11, { size: 30, weight: 800, color: C.ink, align: 'center', ls: -0.5 });
    ctx.restore();
  }
  function story3(ctx, t) {
    bg(ctx, 3, t);
    const path = S3PATH;
    const ex = E.inCubic(p(t, S3.exit[0], S3.exit[1]));
    const s1 = lerp(lerp(0, path.L, E.outCubic(p(t, -0.12, 1.15))), path.L + 300, ex);
    const s0 = lerp(0, path.L, ex);
    ribbon(ctx, path, { s0, s1, w: RIB.w, twist: TAU / 1600, phase: -t * 1.2, text: 'PIX · CARTÃO · DINHEIRO · ENTRADA · SAÍDA · SALDO · ', fs: RIB.fs, adv: RIB.adv, shift: t * 150, head: t < 1.2 || ex > 0 });

    // --- comanda: o total é um odômetro; os itens chegam pela esteira e sobem para ele
    const cIn = E.outBack(p(t, S3.counter, S3.counter + 0.4));
    const drop = p(t, S3.drop, S3.drop + 0.55), cOut = E.inCubic(p(t, S3.drop - 0.05, S3.drop + 0.3));
    if (cIn > 0 && cOut < 1) {
      ctx.save(); ctx.globalAlpha *= clamp(cIn * 2) * (1 - cOut);
      typeText(ctx, 'COMANDA · BICA D\'ÁGUA 01', 540, 880, p(t, S3.counter, S3.counter + 0.4), { size: 30, weight: 800, color: C.lime, ls: 4, align: 'center' });
      ctx.restore();
    }
    const paid = p(t, S3.paid, S3.paid + 0.3);
    if (cIn > 0 && drop < 1) {
      const v = comandaTotal(t);
      // ao ser quitado, o valor desce para a esteira e segue para o caixa
      const ride = E.inCubic(p(drop, 0.55, 1));
      const ox = lerp(540, 540 + 900, ride), oy = lerp(1035, BELT + 22, E.outCubic(p(drop, 0, 0.6))), sc = lerp(1, 0.42, E.outCubic(p(drop, 0, 0.6)));
      ctx.save(); ctx.translate(ox, oy); ctx.scale(cIn * sc, cIn * sc);
      radial(ctx, 0, -60, 420, C.lime, 0.16 * paid + 0.25 * kick(t, S3.paid, 0.5));
      odometer(ctx, v, 0, 0, { digits: 3, size: 176, color: mix(C.white, C.lime, paid), dim: mix(C.grayL, C.lime, paid) });
      ctx.restore();
    }
    // carimbo "QUITADO" (status real da comanda)
    const qa = E.outBack(p(t, S3.paid, S3.paid + 0.3), 2.2), qOut = E.inCubic(p(t, S3.drop - 0.1, S3.drop + 0.08));
    if (qa > 0 && qOut < 1) {
      ctx.save(); ctx.translate(540, 1112); ctx.scale(qa * (1 - qOut), qa * (1 - qOut));
      rr(ctx, -150, -34, 300, 68, 34); fill(ctx, C.lime);
      ctx.beginPath(); ctx.moveTo(-104, 0); ctx.lineTo(-90, 14); ctx.lineTo(-66, -12); stroke(ctx, C.ink, 7);
      txt(ctx, 'QUITADO', 22, 11, { size: 30, weight: 800, color: C.ink, align: 'center', ls: 3 });
      ctx.restore();
    }
    // tickets na esteira
    ITEMS.forEach((it, i) => {
      const ta = itemAt(i), ride = p(t, ta - 0.25, ta), jump = p(t, ta + 0.25, ta + 0.5);
      if (ride <= 0 || jump >= 1) return;
      const x = lerp(-340, 540, E.outCubic(ride)), j = E.outCubic(jump);     // sobe logo: libera a esteira para o próximo
      const y = lerp(BELT - 6, 1000, j) - Math.sin(j * Math.PI) * 50 + 6 * kick(t, ta, 0.12);
      ticket(ctx, it, x, y, lerp(1, 0.25, E.inOutCubic(jump)), 1 - p(jump, 0.7, 1));
    });
    // formas de pagamento
    ['PIX', 'CARTÃO', 'DINHEIRO'].forEach((m, i) => {
      const tp = S3.pay + i * (BT / 2), u = E.outBack(p(t, tp, tp + 0.3), 2);
      if (u <= 0) return;
      const out = E.inCubic(p(t, S3.paid + 0.08 + i * 0.04, S3.paid + 0.3 + i * 0.04));
      if (out >= 1) return;
      const w = tw(ctx, m, MONO, 30, 800, 2) + 120, x = [270, 540, 810][i], y = 1218;
      ctx.save(); ctx.translate(x, y); ctx.scale(u * (1 - out), u * (1 - out));
      rr(ctx, -w / 2, -40, w, 80, 40); fill(ctx, i === 0 ? C.lime : '#1A1A1A');
      if (i) { rr(ctx, -w / 2, -40, w, 80, 40); stroke(ctx, C.line2, 3); }
      icon(ctx, ['qr', 'card', 'cash'][i], -w / 2 + 44, 0, 40, { line: i === 0 ? C.ink : C.lime, lw: 5 });
      txt(ctx, m, -w / 2 + 76, 11, { size: 30, weight: 800, color: i === 0 ? C.ink : C.white, ls: 2 });
      ctx.restore();
    });
    // --- caixa: entradas, saídas e saldo
    const caOut = E.inCubic(p(t, S3.exit[0] - 0.15, S3.exit[0] + 0.3));
    const BX = 120, BWID = 840;
    CASH.forEach((c, i) => {
      const t0 = S3.cash + i * BT, u = p(t, t0, t0 + 0.5);
      if (u <= 0 || caOut >= 1) return;
      const y = 826 + i * 162, g = E.outCubic(p(t, t0 + 0.05, t0 + 0.55));
      ctx.save(); ctx.globalAlpha *= 1 - caOut; ctx.translate(-caOut * 200 * (i + 1), 0);
      typeText(ctx, c.label, BX, y, p(t, t0 - 0.05, t0 + 0.25), { size: 28, weight: 800, color: C.grayL, ls: 4 });
      riseLine(ctx, [{ s: brl(Math.round(c.v * g), c.sign) }], BX, y + 90, u, 0, { size: 90, weight: 800, color: c.col, ls: -2.5 });
      const bw = Math.max(26, (c.v / 1525) * BWID) * g;
      rr(ctx, BX, y + 110, BWID, 16, 8); fill(ctx, '#1C1C1C');
      if (bw > 1) { rr(ctx, BX, y + 110, bw, 16, 8); fill(ctx, c.col); radial(ctx, BX + bw, y + 118, 80, c.col === C.white ? C.lime : c.col, 0.4 * kick(t, t0 + 0.4, 0.4)); }
      ctx.restore();
    });
    // títulos
    lines(ctx, t, [
      { segs: [{ s: 'Comandas,' }], t: S3.title },
      { segs: [{ s: 'pagamentos' }], t: S3.title + BT / 2 },
      { segs: [{ s: 'e caixa.', color: C.lime }], t: S3.title + BT },
    ], { y: 390, size: 106, tout: S3.exit[0] - 0.1 });
    const subs = [
      { s: 'Consumo lançado na comanda.', a: S3.counter, b: S3.pay - 0.2 },
      { s: 'Pix, cartão ou dinheiro.', a: S3.pay, b: S3.cash - 0.35 },
      { s: 'Entradas, saídas e saldo.', a: S3.cash - 0.05, b: S3.exit[0] - 0.1 },
    ];
    subs.forEach((sb) => riseLine(ctx, [{ s: sb.s }], 540, 735, p(t, sb.a, sb.a + 0.4), p(t, sb.b, sb.b + 0.28), { size: 54, weight: 800, color: C.white, align: 'center', ls: -1 }));
  }

  // =====================================================================
  // STORY 4 · CONVITE — a fita emoldura o convite e aponta para o link
  // =====================================================================
  const S4 = { logo: BT, title: 2 * BT, tag: 3 * BT, domain: 4 * BT, link: 5.5 * BT };
  const LINK = { y0: 1360, y1: 1530 };              // área livre para o adesivo de link
  function s4Path() {
    const pts = [IN[0], IN[1], [84, LANE_Y - 150], [74, 1100], [74, 590], [134, 372], [540, 330], [946, 372], [1006, 590], [1006, 1240], [984, 1416], [920, 1446]];
    return makePath(catmull(pts, 18));
  }
  let S4PATH = null;
  function story4(ctx, t) {
    bg(ctx, 4, t);
    const path = S4PATH;
    const s1 = lerp(0, path.L, E.outCubic(p(t, -0.12, 1.5)));
    const s0 = lerp(0, 380, E.inOutCubic(p(t, 0.7, 1.8)));
    ribbon(ctx, path, { s0, s1, w: RIB.w, twist: TAU / 1800, phase: -t * 1.2, text: 'FAZLOHOSPEDA.COM.BR · CONHEÇA O SISTEMA · ', fs: RIB.fs, adv: RIB.adv, shift: t * 130, head: t < 1.5, taperHead: 6 });
    // ponta de seta: a fita aponta para o adesivo de link
    const ar = p(t, 1.3, 1.6);
    if (ar > 0) {
      const q = pathAt(path, path.L - 4), a = Math.atan2(q.ty, q.tx), s = E.outBack(ar) * (1 + 0.08 * kick(t, Math.floor(t / BT) * BT, 0.2));
      const bob = 10 * Math.sin(((t - 1.3) / BT) * Math.PI) * clamp((t - 1.6) * 2);
      ctx.save(); ctx.translate(q.x + q.tx * bob, q.y + q.ty * bob); ctx.rotate(a); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(52, 0); ctx.lineTo(-6, -50); ctx.lineTo(-6, 50); ctx.closePath(); fill(ctx, C.lime);
      ctx.restore();
    }
    // logo
    const la = p(t, S4.logo - 0.04, S4.logo + 0.4);
    if (la > 0) {
      const sw = p(t, S4.logo, S4.logo + 0.9);
      for (let k = 0; k < 16; k++) {    // raios curtos em volta da logo
        const a = (k / 16) * TAU + t * 0.15, r0 = 190 + 10 * Math.sin(t * 3 + k), r1 = r0 + 26 + 40 * kick(t, S4.logo, 0.6);
        ctx.beginPath(); ctx.moveTo(540 + Math.cos(a) * r0, 600 + Math.sin(a) * r0); ctx.lineTo(540 + Math.cos(a) * r1, 600 + Math.sin(a) * r1);
        stroke(ctx, rgba(C.lime, 0.5 * clamp(la * 2)), 6);
      }
      if (sw < 1) { circle(ctx, 540, 600, lerp(150, 700, E.outExpo(sw))); stroke(ctx, rgba(C.lime, 1 - sw), 10 * (1 - sw) + 1); }
      radial(ctx, 540, 600, 360, C.lime, 0.22 + 0.3 * kick(t, S4.logo, 0.8));
      const beat = Math.floor(t / BT), pulse = t > S4.logo ? kick(t, beat * BT, 0.22) * 0.02 : 0;
      logo(ctx, 540, 600, 320, { scale: E.outBack(la, 2.4) * (1 + pulse) });
    }
    typeText(ctx, 'CONHEÇA O', 540, 880, p(t, S4.title - 0.1, S4.title + 0.25), { size: 34, weight: 800, color: C.lime, ls: 9, align: 'center' });
    const NS = 120, w1 = tw(ctx, 'FAZLO ', DISPLAY, NS, 900, -3), w2 = tw(ctx, 'Hospeda', DISPLAY, NS, 700, -3), nx = 540 - (w1 + w2) / 2;
    riseLine(ctx, [{ s: 'FAZLO ' }], nx, 1000, p(t, S4.title, S4.title + 0.45), 0, { size: NS, weight: 900, color: C.white, ls: -3 });
    riseLine(ctx, [{ s: 'Hospeda', weight: 700 }], nx + w1, 1000, p(t, S4.title + 0.08, S4.title + 0.53), 0, { size: NS, weight: 700, color: C.white, ls: -3 });
    riseLine(ctx, [{ s: 'Gestão para pousadas e' }], 540, 1074, p(t, S4.tag, S4.tag + 0.42), 0, { size: 44, weight: 700, color: C.grayL, align: 'center', ls: -0.6 });
    riseLine(ctx, [{ s: 'pequenos meios de hospedagem.' }], 540, 1128, p(t, S4.tag + 0.1, S4.tag + 0.52), 0, { size: 44, weight: 700, color: C.grayL, align: 'center', ls: -0.6 });
    // domínio
    const da = p(t, S4.domain, S4.domain + 0.55);
    if (da > 0) {
      const dw = tw(ctx, 'fazlohospeda.com.br', DISPLAY, 70, 800, -1.4);
      ctx.save(); ctx.translate(540, 1248); ctx.scale(lerp(0.9, 1, E.outBack(clamp(da * 1.4))), lerp(0.9, 1, E.outBack(clamp(da * 1.4))));
      rr(ctx, -dw / 2 - 34, -66, dw + 68, 96, 48); fill(ctx, rgba(C.lime, 0.12 * clamp(da * 2))); rr(ctx, -dw / 2 - 34, -66, dw + 68, 96, 48); stroke(ctx, rgba(C.lime, 0.6 * clamp(da * 2)), 3);
      ctx.restore();
      typeText(ctx, 'fazlohospeda.com.br', 540, 1248, da, { fam: DISPLAY, size: 70, weight: 800, color: C.lime, ls: -1.4, align: 'center' });
      // brilho que atravessa o domínio a cada 2 compassos
      const sh = ((t - S4.domain - 0.9) % (4 * BT)) / 0.7;
      if (t > S4.domain + 0.9 && sh < 1) {
        ctx.save(); rr(ctx, -dw / 2 - 34 + 540, 1182, dw + 68, 96, 48); ctx.clip();
        const gx = lerp(540 - dw / 2 - 200, 540 + dw / 2 + 200, E.inOutSine(sh));
        const g = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(gx - 90, 1182, 180, 96); ctx.restore();
      }
    }
    // área do adesivo de link (fica livre): só uma chamada acima dela
    const lk = p(t, S4.link, S4.link + 0.4);
    if (lk > 0) {
      typeText(ctx, 'ACESSE O SITE', 540, LINK.y0 - 8, lk, { size: 30, weight: 800, color: C.white, ls: 6, align: 'center' });
      radial(ctx, 540, (LINK.y0 + LINK.y1) / 2 + 20, 380, C.lime, 0.08 * lk * (0.8 + 0.2 * Math.sin(t * 4)));
    }
  }

  // =====================================================================
  // CAPA DO DESTAQUE
  // =====================================================================
  // O Instagram recorta um círculo do centro da imagem. Tudo fica dentro do círculo,
  // e o símbolo ocupa a maior parte dele para continuar legível pequeno.
  // A fita do Story 1 (anel planetário em volta da logo) vira o símbolo do Destaque.
  function highlight(ctx, cx, cy, D) {
    circle(ctx, cx, cy, D / 2); fill(ctx, C.black);
    radial(ctx, cx, cy, D * 0.5, C.lime, 0.26);
    // anel: a menor distância ao centro (ry − w/2) é maior que o raio da logo, então nada a cobre
    const rx = D * 0.42, ry = D * 0.3, w = D * 0.06, tilt = -0.17, ct = Math.cos(tilt), st = Math.sin(tilt), N = 360;
    const pt = (a) => { const x = rx * Math.cos(a), y = ry * Math.sin(a); return [cx + x * ct - y * st, cy + x * st + y * ct]; };
    ctx.save(); ctx.lineCap = 'butt';
    for (const front of [false, true]) {
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * TAU, a1 = ((k + 1.6) / N) * TAU, d = Math.sin((a0 + a1) / 2);   // d > 0: metade da frente
        if ((d > 0) !== front) continue;
        const u = E.inOutSine((d + 1) / 2), [x0, y0] = pt(a0), [x1, y1] = pt(a1);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = mix('#33490F', C.lime, u); ctx.lineWidth = w * (0.72 + 0.28 * u); ctx.stroke();
      }
    }
    ctx.restore();
    logo(ctx, cx, cy, D * 0.52);
  }
  function renderCover(ctx, kind = 'story') {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (kind === 'square') {
      ctx.canvas.width = 1080; ctx.canvas.height = 1080;
      ctx.fillStyle = C.black; ctx.fillRect(0, 0, 1080, 1080);
      highlight(ctx, 540, 540, 1080);
      return;
    }
    ctx.canvas.width = W; ctx.canvas.height = H;
    ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H);
    highlight(ctx, 540, 960, 1080);
  }

  // =====================================================================
  // RENDER (motion blur por subamostragem) E CUES
  // =====================================================================
  const SCENES = [story1, story2, story3, story4];
  function frame(ctx, n, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    SCENES[n - 1](ctx, t);
  }
  const FAST = [
    [[-1, 1.2], [S1.logo - 0.05, S1.logo + 0.35], [S1.up[0], S1.up[1]], [S1.list, S1.list + 2.6], [S1.exit[0] - 0.4, 9]],
    [[-1, 1.0], [S2.tags - 0.6, S2.tags + 2.0], [S2.flip, S2.flip + 2.0], [S2.exit[0] - 0.2, 9]],
    [[-1, 1.2], [S3.items - 0.3, S3.items + 2.1], [S3.pay, S3.pay + 0.8], [S3.paid, S3.cash + 1.6], [S3.exit[0] - 0.4, 9]],
    [[-1, 1.7], [S4.logo - 0.05, S4.logo + 0.4]],
  ];
  function shutter(n, t) {
    for (const [a, b] of FAST[n - 1]) if (t >= a && t < b) return { k: 12, dt: 1 / 50 };
    return { k: 4, dt: 1 / 120 };
  }
  let bufS = null, bufA = null;
  function renderAt(ctx, n, t, o = {}) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    t = clamp(t, 0, DURATION[n - 1] - 1e-4);
    const sh = o.noBlur ? { k: 1 } : shutter(n, t);
    if (sh.k <= 1) { frame(ctx, n, t); return; }
    if (!bufS) { const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }; bufS = mk(); bufA = mk(); }
    const sctx = bufS.getContext('2d'), actx = bufA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < sh.k; k++) {
      frame(sctx, n, clamp(t + (k / (sh.k - 1) - 0.5) * sh.dt, 0, DURATION[n - 1] - 1e-4));
      actx.globalAlpha = 1 / (k + 1); actx.drawImage(bufS, 0, 0);
    }
    actx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bufA, 0, 0);
  }

  function buildCues() {
    CUES.forEach((c) => (c.length = 0));
    // 1 · marca
    cue(1, 0, 'swoosh', { d: 1.05, p0: -1, p1: 0.6 });
    cue(1, S1.logo, 'logo', {});
    cue(1, S1.logo + 0.1, 'type', { d: 0.35, n: 9 });
    cue(1, S1.name, 'rise', {});
    cue(1, S1.up[0], 'lift', { d: S1.up[1] - S1.up[0] });
    [0, 1, 2].forEach((i) => cue(1, S1.statement + i * BT / 2, 'line', { k: i }));
    cue(1, S1.list - 0.1, 'type', { d: 0.4, n: 18 });
    MODULES.forEach((_, i) => cue(1, S1.list + i * BT / 2, 'chip', { k: i }));
    cue(1, S1.exit[0], 'exit', { d: S1.exit[1] - S1.exit[0] });
    // 2 · reservas
    cue(2, 0, 'swoosh', { d: 1.0, p0: -1, p1: 0.4 });
    [0, 1, 2].forEach((i) => cue(2, S2.title + i * BT / 2, 'line', { k: i }));
    TAGS.forEach((_, i) => cue(2, tagArrive(i), 'tag', { k: i, pan: (TAG.xs[i] - 540) / 540 }));
    TAGS.forEach((_, i) => cue(2, S2.flip + i * BT / 2 + BT, 'flip', { k: i, pan: (TAG.xs[i] - 540) / 540 }));
    [0, 1, 2].forEach((i) => cue(2, S2.sub + i * BT / 2, 'rise', {}));
    [0, 1, 2].forEach((i) => cue(2, S2.chips + i * BT / 2, 'chip', { k: i, pan: (i - 1) * 0.45 }));
    [1, 2].forEach((k) => cue(2, S2.chips + 1.5 * BT + (k - 1) * BT, 'hop', { k, pan: (k - 1) * 0.45 }));
    cue(2, S2.exit[0], 'exit', { d: S2.exit[1] - S2.exit[0] });
    // 3 · financeiro
    cue(3, 0, 'swoosh', { d: 1.15, p0: -1, p1: 1 });
    [0, 1, 2].forEach((i) => cue(3, S3.title + i * BT / 2, 'line', { k: i }));
    cue(3, S3.counter, 'pop', { k: 0 });
    cue(3, S3.counter, 'type', { d: 0.4, n: 24 });
    ITEMS.forEach((_, i) => {
      cue(3, itemAt(i) - 0.25, 'slide', { k: i, d: 0.25 });
      cue(3, itemAt(i), 'stop', { k: i });
      cue(3, itemAt(i) + BT, 'coin', { k: i, d: 0.32 });
    });
    ['pix', 'card', 'cash'].forEach((m, i) => cue(3, S3.pay + i * BT / 2, 'pay', { k: i, m, pan: [-0.5, 0, 0.5][i] }));
    cue(3, S3.paid, 'paid', {});
    cue(3, S3.drop, 'drop', { d: 0.55 });
    CASH.forEach((_, i) => cue(3, S3.cash + i * BT, 'bar', { k: i, d: 0.5 }));
    [S3.counter, S3.pay, S3.cash - 0.05].forEach((ts) => cue(3, ts, 'rise', {}));
    cue(3, S3.exit[0], 'exit', { d: S3.exit[1] - S3.exit[0] });
    // 4 · convite
    cue(4, 0, 'swoosh', { d: 1.5, p0: -1, p1: 1 });
    cue(4, S4.logo, 'logo', {});
    cue(4, S4.title - 0.1, 'type', { d: 0.35, n: 9 });
    cue(4, S4.title, 'rise', {});
    cue(4, S4.tag, 'rise', {});
    cue(4, S4.domain, 'type', { d: 0.55, n: 19 });
    cue(4, S4.domain, 'domain', {});
    cue(4, 1.3, 'arrow', {});
    cue(4, S4.link, 'link', {});
    for (let ts = S4.domain + 0.9; ts < DURATION[3] - 0.3; ts += 4 * BT) cue(4, ts, 'shine', { d: 0.7 });
    CUES.forEach((c) => c.sort((a, b) => a.t - b.t));
  }

  function init(img) {
    LOGO = img;
    S2PATH = s2Path();
    S3PATH = s3Path();
    S4PATH = s4Path();
    buildCues();
  }

  window.STORIES = {
    init, renderAt, renderCover, DURATION, W, H, BPM,
    cues: () => ({ bpm: BPM, durations: DURATION, stories: CUES.map((c) => c.slice()) }),
  };
})();
