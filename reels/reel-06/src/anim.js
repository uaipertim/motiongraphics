/* =====================================================================
   FAZLO Hospeda — REEL 06 "Em equilíbrio" — 9:16 (1080x1920)
   Gestão de pagamentos. Motor em Canvas 2D, determinístico: renderAt(ctx, t)
   desenha o quadro exato do instante t (s).

   Uma balança de precisão monumental, em 3D. De um lado, o total da
   hospedagem; do outro, cada pagamento registrado: o valor se monta dígito a
   dígito e ganha corpo, um prisma escolhe a forma de pagamento (PIX · CARTÃO ·
   DINHEIRO), o recebimento é confirmado e o bloco cai no prato. O ponteiro
   mostra o que ainda está pendente até a balança ficar nivelada: quitada.
   A linha de nível vira o histórico de pagamentos; o histórico vira a visão
   geral; no fim, a logo pousa no centro da balança, em equilíbrio.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const BPM = 104, BT = 60 / BPM, BAR = 4 * BT, S16 = BT / 4;    // 1 compasso = 2,31 s
  const DURATION = 24.25;
  const T = {
    hook: 0, registre: BAR, parcial: 2 * BAR, diarias: 3 * BAR, equilibrio: 4 * BAR,
    historico: 5 * BAR, geral: 6 * BAR, ordem: 7 * BAR, marca: 8 * BAR, site: 9 * BAR,
  };
  const DISPLAY = "'R6 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'R6 Mono', 'JetBrains Mono', monospace";
  const C = {
    black: '#0A0A0A', ink: '#0A0A0A', lime: '#AFFA27', limeD: '#8CD10C', limeL: '#D8FF8A', limeDeep: '#4E7410',
    white: '#FFFFFF', paper: '#F2F2EC', gray: '#8E8E88', grayD: '#5E5E59', grayL: '#B9B9B1',
    pend: '#F5A524', quit: '#4CC067', checkin: '#5B9BFF', checkout: '#F5B638',
  };

  // ---------------------------------------------------------------- utilitários
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
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
  const hx = (c) => (typeof c === 'string' ? hex(c) : c);
  const mixA = (a, b, t) => { a = hx(a); b = hx(b); t = clamp(t); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
  const css = (a, al = 1) => { a = hx(a); return `rgba(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])},${clamp(al)})`; };
  function hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const kick = (t, t0, dur = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / dur) * 4));
  // resposta de mola amortecida a um degrau em t0 (0 -> 1, com ultrapassagem)
  function spring(t, t0, f = 1.25, z = 0.3) {
    if (t <= t0) return 0;
    const x = t - t0, w = TAU * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * x));
  }
  function brl(v, sign = '') {
    const c = Math.round(Math.abs(v) * 100);
    return `${sign}R$ ${Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${String(c % 100).padStart(2, '0')}`;
  }
  // vetores
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const rotZ = (q, piv, a) => { const x = q[0] - piv[0], y = q[1] - piv[1], c = Math.cos(a), s = Math.sin(a); return [piv[0] + x * c - y * s, piv[1] + x * s + y * c, q[2]]; };
  const rotX = (q, piv, a) => { const y = q[1] - piv[1], z = q[2] - piv[2], c = Math.cos(a), s = Math.sin(a); return [q[0], piv[1] + y * c - z * s, piv[2] + y * s + z * c]; };

  // ---------------------------------------------------------------- primitivas 2D
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function glow(ctx, x, y, r, color, a) {
    if (a <= 0.003 || r <= 1) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, css(color, a)); g.addColorStop(0.4, css(color, a * 0.35)); g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  function setFont(ctx, fam, size, weight, align = 'left', ls = 0) {
    ctx.font = `${weight} ${size}px ${fam}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px';
  }
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, 'left', ls); return ctx.measureText(s).width; }
  function txt(ctx, s, x, y, o) {
    setFont(ctx, o.fam || MONO, o.size, o.weight || 800, o.align || 'left', o.ls || 0);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.blur ?? 24; }
    ctx.fillStyle = o.color; ctx.fillText(s, x, y);
    ctx.restore();
  }
  function chipW(ctx, text, size, ls = 2) { return tw(ctx, text, MONO, size, 800, ls) + size * 1.4; }
  function chip(ctx, x, y, text, o) {
    const size = o.size || 24, ls = o.ls ?? 2, w = chipW(ctx, text, size, ls) + (o.dot ? size * 1.2 : 0), h = size * 1.9;
    const left = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    rr(ctx, left, y - h / 2, w, h, h / 2); ctx.fillStyle = o.bg || 'rgba(255,255,255,0.08)'; ctx.fill();
    if (o.border) { rr(ctx, left, y - h / 2, w, h, h / 2); ctx.strokeStyle = o.border; ctx.lineWidth = 2.5; ctx.stroke(); }
    let tx = left + size * 0.7;
    if (o.dot) { circle(ctx, tx + size * 0.25, y, size * 0.25); ctx.fillStyle = o.dot; ctx.fill(); tx += size * 1.2; }
    txt(ctx, text, tx, y + size * 0.36, { size, weight: 800, color: o.color || C.white, ls });
    ctx.restore();
    return w;
  }
  function riseLine(ctx, segs, x, y, pin, pout, o) {
    if (pin <= 0 || pout >= 1) return;
    const size = o.size, weight = o.weight || 900, ls = o.ls ?? -size * 0.03;
    const ws = segs.map((s) => tw(ctx, s.s, DISPLAY, size, weight, ls));
    const total = ws.reduce((a, b) => a + b, 0);
    const left = x - total / 2;
    const off = (1 - E.outExpo(clamp(pin))) * size * 1.3 - E.inCubic(clamp(pout)) * size * 1.3;
    ctx.save();
    ctx.beginPath(); ctx.rect(left - 80, y - size * 1.05, total + 160, size * 1.38); ctx.clip();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30;
    let cx = left;
    segs.forEach((s, i) => { setFont(ctx, DISPLAY, size, weight, 'left', ls); ctx.fillStyle = s.color || C.white; ctx.fillText(s.s, cx, y + off); cx += ws[i]; });
    ctx.restore();
  }
  // título de duas linhas (a segunda em limão), sobe e sai
  function title(ctx, t, l1, l2, t0, t1, o = {}) {
    const size = o.size || 92, y = o.y || 318;
    const rows = l2 ? [[l1, C.white, t0], [l2, o.c2 || C.lime, t0 + 0.28]] : [[l1, C.white, t0]];
    rows.forEach(([s, col, ts], i) => riseLine(ctx, [{ s, color: col }], W / 2, y + i * size * 1.02, p(t, ts - 0.02, ts + 0.42), p(t, t1 + i * 0.04, t1 + i * 0.04 + 0.3), { size }));
  }

  // ---------------------------------------------------------------- logo (imagem fornecida, sem alteração)
  let LOGO = null;
  function logo(ctx, x, y, d, alpha = 1) {
    if (d <= 1 || alpha <= 0.001) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, x - d / 2, y - d / 2, d, d);
    ctx.restore();
  }

  // =====================================================================
  // CÂMERA 3D
  // =====================================================================
  const NEAR = 0.15;
  function makeCam(k) {
    const cy_ = Math.cos(k.yaw), sy_ = Math.sin(k.yaw), cp = Math.cos(k.pitch), sp = Math.sin(k.pitch);
    const pos = [k.x, k.y, k.z];
    const toCam = (q) => {
      const x = q[0] - k.x, y = q[1] - k.y, z = q[2] - k.z;
      const x1 = cy_ * x - sy_ * z, z1 = sy_ * x + cy_ * z;
      return [x1, cp * y - sp * z1, sp * y + cp * z1];
    };
    const proj = (q) => { const s = k.f / q[2]; return [k.cx + q[0] * s, k.cy - q[1] * s, q[2], s]; };
    const P = (q) => { const c = toCam(q); return c[2] > NEAR ? proj(c) : null; };
    return { k, pos, toCam, proj, P, f: k.f };
  }
  const lookAng = (a, b) => { const d = sub(b, a); return [Math.atan2(d[0], d[2]), Math.atan2(d[1], Math.hypot(d[0], d[2]))]; };
  const CAMK = [];
  function key(t, pos, look, f = 1150, ease = 'inOutCubic') { const [yaw, pitch] = lookAng(pos, look); CAMK.push({ t, pos, yaw, pitch, f, ease }); }
  function buildCamera() {
    CAMK.length = 0;
    key(0, [-2.4, 4.6, -8.6], [-5.0, 7.6, 0], 1040);                       // de baixo: o total cai no prato
    key(1.6, [3.0, 6.8, -14.8], [-0.4, 6.2, 0], 1100, 'inOutSine');        // a balança se revela, em 3/4
    key(T.registre + 0.25, [8.2, 9.6, -8.4], [5.0, 10.4, 0], 1120);         // o registro, de perto
    key(T.parcial - 0.3, [7.8, 9.4, -9.0], [4.8, 9.8, 0], 1120, 'inOutSine');
    key(T.parcial + 0.35, [7.4, 7.6, -13.6], [0.8, 6.4, 0], 1110, 'outCubic');
    key(T.diarias - 0.05, [6.9, 7.8, -14.0], [0.8, 6.4, 0], 1110, 'inOutSine');
    key(T.diarias + 0.35, [8.2, 10.4, -8.4], [5.0, 11.2, 0], 1120);
    key(T.equilibrio - 0.3, [7.8, 10.2, -9.0], [4.8, 10.6, 0], 1120, 'inOutSine');
    key(T.equilibrio + 0.3, [0, 6.8, -14.4], [0, 6.4, 0], 1110, 'outCubic');      // nivelada, de frente
    key(T.historico - 0.1, [0, 7.0, -13.8], [0, 6.4, 0], 1110, 'inOutSine');
    key(T.historico + 0.5, [15.4, 8.9, -11.2], [12.3, 0.4, -0.9], 1120);         // o histórico no chão, à direita
    key(T.geral - 0.1, [15.1, 9.2, -11.7], [12.3, 0.4, -0.9], 1120, 'inOutSine');
    key(T.geral + 0.55, [17.4, 14.8, -10.9], [17.4, 0, -1.5], 1100);             // de cima: a visão geral
    key(T.ordem - 0.1, [17.3, 14.4, -10.5], [17.35, 0, -1.5], 1100, 'inOutSine');
    key(T.ordem + 0.6, [0, 7.0, -13.4], [0, 6.3, 0], 1110);                      // de volta à balança
    key(T.marca - 0.05, [0, 6.8, -12.4], [0, 6.3, 0], 1120, 'inOutSine');
    key(T.marca + 0.6, [0, 6.9, -9.9], [0, 6.2, 0], 1150, 'outCubic');
    key(DURATION, [0, 6.9, -9.4], [0, 6.2, 0], 1150, 'inOutSine');
  }
  function camAt(t) {
    let i = 1;
    while (i < CAMK.length - 1 && t > CAMK[i].t) i++;
    const a = CAMK[i - 1], b = CAMK[i], u = E[b.ease](p(t, a.t, b.t));
    const pos = lerp3(a.pos, b.pos, u);
    const sh = shakeAt(t);
    return makeCam({ x: pos[0] + sh[0], y: pos[1] + sh[1], z: pos[2], yaw: lerp(a.yaw, b.yaw, u), pitch: lerp(a.pitch, b.pitch, u), f: lerp(a.f, b.f, u), cx: W / 2, cy: 960 });
  }
  const SHAKES = [];
  function shakeAt(t) {
    let x = 0, y = 0;
    for (const [t0, amp, dur] of SHAKES) {
      if (t < t0 || t > t0 + dur * 1.5) continue;
      const k = kick(t, t0, dur) * amp;
      x += Math.sin((t - t0) * 61) * k; y += Math.sin((t - t0) * 47 + 1.3) * k;
    }
    return [x, y];
  }

  // =====================================================================
  // A BALANÇA (Roberval: pratos sobre o braço, sempre na horizontal)
  // =====================================================================
  const PIV = [0, 3.8, 0];                       // ponto de apoio (o fulcro)
  const ARM = 5.0, POST = 1.0, PLAT = [3.3, 0.18, 2.7];
  const BW = 2.6, BD = 1.8, HV = (v) => (v / 1350) * 3.6;  // altura do bloco proporcional ao valor
  const THMAX = 12.5 * DEG;
  // pagamentos (dados de demonstração das capturas)
  const PAY = [
    { v: 450, method: 'PIX', tag: 'CHECK-IN / DIÁRIAS', label: 'PAGAMENTO PARCIAL', date: '08/10', t: T.registre, land: T.parcial, sel: 0 },
    { v: 900, method: 'CARTÃO', tag: 'CHECK-IN / DIÁRIAS', label: 'RECEBER DIÁRIAS', date: '', t: T.diarias, land: T.equilibrio, sel: 1 },
  ];
  const TOTAL_LAND = BT;                         // o total da hospedagem pousa no 2º tempo
  // ângulo do braço: soma de respostas de mola a cada pouso (positivo = esquerda para baixo)
  function theta(t) {
    let th = THMAX * spring(t, TOTAL_LAND, 1.15, 0.28);
    th += -THMAX * (450 / 1350) * spring(t, PAY[0].land, 1.25, 0.3);
    th += -THMAX * (900 / 1350) * spring(t, PAY[1].land, 1.1, 0.34);
    return th;
  }
  const armEnd = (side, th) => rotZ([side * ARM, PIV[1], 0], PIV, th);
  const platTop = (side, th) => armEnd(side, th)[1] + POST + PLAT[1];
  // pagamento i: estado (montagem, espera, queda, no prato)
  function payState(i, t, th) {
    const P0 = PAY[i];
    const stackBelow = PAY.slice(0, i).reduce((s, q) => s + HV(q.v), 0);
    const h = HV(P0.v);
    const x = armEnd(1, th)[0];
    const rest = platTop(1, th) + stackBelow + h / 2;
    const tRel = P0.land - 0.42;
    const thL = theta(P0.land);
    const restAtLand = platTop(1, thL) + stackBelow + h / 2;
    const hold = restAtLand + 2.6 + 0.25 * Math.sin((t - P0.t) * 2.2);
    let y;
    if (t < tRel) y = hold;
    else if (t < P0.land) { const u = (t - tRel) / (P0.land - tRel); y = lerp(hold, restAtLand, u * u); }
    else y = rest;
    const xx = t < P0.land ? armEnd(1, thL)[0] : x;
    return { c: [xx, y, 0], h, landed: t >= P0.land };
  }

  // ---------------------------------------------------------------- malhas
  // caixa: centro c, tamanho s; rot = ângulo em torno do eixo z passando por piv
  function boxFaces(out, c, s, mat, o = {}) {
    const hx_ = s[0] / 2, hy = s[1] / 2, hz = s[2] / 2;
    let v = [];
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) v.push([c[0] + dx * hx_, c[1] + dy * hy, c[2] + dz * hz]);
    if (o.rot) v = v.map((q) => rotZ(q, o.piv, o.rot));
    if (o.rx) v = v.map((q) => rotX(q, o.pivx, o.rx));
    // índices: (dx,dy,dz) -> ((dx+1)/2)*4 + ((dy+1)/2)*2 + (dz+1)/2
    const I = (dx, dy, dz) => ((dx + 1) / 2) * 4 + ((dy + 1) / 2) * 2 + (dz + 1) / 2;
    const quads = [
      ['front', [I(-1, 1, -1), I(1, 1, -1), I(1, -1, -1), I(-1, -1, -1)]],
      ['back', [I(1, 1, 1), I(-1, 1, 1), I(-1, -1, 1), I(1, -1, 1)]],
      ['left', [I(-1, 1, 1), I(-1, 1, -1), I(-1, -1, -1), I(-1, -1, 1)]],
      ['right', [I(1, 1, -1), I(1, 1, 1), I(1, -1, 1), I(1, -1, -1)]],
      ['top', [I(-1, 1, 1), I(1, 1, 1), I(1, 1, -1), I(-1, 1, -1)]],
      ['bottom', [I(-1, -1, -1), I(1, -1, -1), I(1, -1, 1), I(-1, -1, 1)]],
    ];
    for (const [name, q] of quads) {
      const pts = q.map((k) => v[k]);
      const n = nrm(cross(sub(pts[1], pts[0]), sub(pts[3], pts[0])));
      out.push({ pts, n, mat, side: name, tex: name === 'front' ? o.tex : null, alpha: o.alpha ?? 1, glow: o.glow || 0, edge: o.edge });
    }
  }
  function prismFaces(out, c, len, r, ang, texs, alpha) {
    const a_ = r / 2, h_ = r * Math.sqrt(3) / 2;
    const base = [[-a_, h_], [-a_, -h_], [r, 0]];                 // (z, y): a face 0 (V0-V1) olha para -z
    const V = base.map(([z, y]) => [y * Math.sin(ang) + z * Math.cos(ang), y * Math.cos(ang) - z * Math.sin(ang)]);   // (z, y) girados
    const W3 = (x, q) => [c[0] + x, c[1] + q[1], c[2] + q[0]];
    for (let k = 0; k < 3; k++) {
      const top = V[k], bot = V[(k + 1) % 3];
      const mid = [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2];
      out.push({ pts: [W3(-len / 2, top), W3(len / 2, top), W3(len / 2, bot), W3(-len / 2, bot)], n: nrm([0, mid[1], mid[0]]), mat: 'ink', side: 'front', tex: texs[k], alpha, prism: true });
    }
    const cap = (x, sgn) => ({ pts: (sgn < 0 ? V : V.slice().reverse()).map((q) => W3(x, q)), n: [sgn, 0, 0], mat: 'lime', side: 'cap', alpha });
    out.push(cap(-len / 2, -1), cap(len / 2, 1));
  }

  // ---------------------------------------------------------------- texturas (os rótulos gravados nos blocos)
  const TEX = {};
  function mkTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
  function buildTextures() {
    const PX = 400;                                // pixels por unidade
    // o total da hospedagem (bloco branco)
    TEX.total = mkTex(BW * PX, HV(1350) * PX, (g, w, h) => {
      g.fillStyle = '#F4F4EE'; g.fillRect(0, 0, w, h);
      txt(g, 'TOTAL DA HOSPEDAGEM', 60, 120, { size: 46, weight: 800, color: '#55554F', ls: 4 });
      txt(g, 'R$ 1.350,00', 60, 300, { fam: DISPLAY, size: 150, weight: 900, color: '#0A0A0A', ls: -4 });
      g.fillStyle = '#D9D9D2'; g.fillRect(60, 380, w - 120, 4);
      txt(g, 'DIÁRIAS', 60, 470, { size: 44, weight: 800, color: '#0A0A0A', ls: 4 });
      txt(g, 'IPÊ 09 · FHZ-000138', 60, 540, { size: 38, weight: 700, color: '#77776F', ls: 2 });
      g.fillStyle = '#0A0A0A'; g.fillRect(0, h - 26, w, 26);
    });
    for (const [i, P0] of PAY.entries()) {
      const hpx = HV(P0.v) * PX;
      const base = (g, w, h, withMethod) => {
        g.fillStyle = C.lime; g.fillRect(0, 0, w, h);
        const vy = h < 500 ? 190 : 260;
        txt(g, brl(P0.v, '+ '), 56, vy, { fam: DISPLAY, size: h < 500 ? 120 : 150, weight: 900, color: '#0A0A0A', ls: -4 });
        txt(g, P0.label, 60, h < 500 ? 62 : 110, { size: 40, weight: 800, color: '#1E2A08', ls: 4 });
        const cy = h < 500 ? 300 : 420;
        let x = 60;
        if (withMethod) { x += chip(g, x, cy, P0.method, { size: 40, bg: '#0A0A0A', color: C.lime, align: 'left' }) + 22; }
        chip(g, x, cy, P0.tag, { size: 34, bg: 'rgba(10,10,10,0.12)', color: '#0A0A0A', align: 'left', border: 'rgba(10,10,10,0.5)' });
        if (h >= 500) txt(g, 'IPÊ 09 · FHZ-000138', 60, 560, { size: 36, weight: 700, color: '#2C3A10', ls: 2 });
      };
      TEX['pay' + i] = mkTex(BW * PX, hpx, (g, w, h) => base(g, w, h, false));
      TEX['payM' + i] = mkTex(BW * PX, hpx, (g, w, h) => base(g, w, h, true));
    }
    // as faces do prisma da forma de pagamento
    TEX.methods = ['PIX', 'CARTÃO', 'DINHEIRO'].map((s) => mkTex(900, 330, (g, w, h) => {
      g.fillStyle = '#0D0E0B'; g.fillRect(0, 0, w, h);
      g.strokeStyle = C.lime; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
      txt(g, 'FORMA DE PAGAMENTO', w / 2, 80, { size: 34, weight: 800, color: '#8DA35A', align: 'center', ls: 4 });
      txt(g, s, w / 2, 230, { fam: DISPLAY, size: 140, weight: 900, color: C.lime, align: 'center', ls: -2 });
    }));
  }
  // desenha a textura no quadrilátero projetado (afim, em tiras verticais para a perspectiva)
  function texQuad(ctx, img, P4, n = 4) {
    const [A, B, Cc, D] = P4;                       // topo-esq, topo-dir, base-dir, base-esq
    for (let k = 0; k < n; k++) {
      const u0 = k / n, u1 = (k + 1) / n;
      const TL = [lerp(A[0], B[0], u0), lerp(A[1], B[1], u0)], TR = [lerp(A[0], B[0], u1), lerp(A[1], B[1], u1)];
      const BL = [lerp(D[0], Cc[0], u0), lerp(D[1], Cc[1], u0)], BR = [lerp(D[0], Cc[0], u1), lerp(D[1], Cc[1], u1)];
      const sw = img.width / n, sx = u0 * img.width, sh = img.height;
      ctx.save();
      if (n > 1) { ctx.beginPath(); ctx.moveTo(TL[0] - 1, TL[1] - 1); ctx.lineTo(TR[0] + 1, TR[1] - 1); ctx.lineTo(BR[0] + 1, BR[1] + 1); ctx.lineTo(BL[0] - 1, BL[1] + 1); ctx.closePath(); ctx.clip(); }
      const a = (TR[0] - TL[0]) / sw, b = (TR[1] - TL[1]) / sw, c = (BL[0] - TL[0]) / sh, d = (BL[1] - TL[1]) / sh;
      ctx.transform(a, b, c, d, TL[0], TL[1]);
      ctx.drawImage(img, sx, 0, sw, sh, 0, 0, sw, sh);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- materiais e luz
  const KEY = nrm([-0.55, 0.7, -0.45]);           // luz-chave: alto, à esquerda, pela frente
  const RIM = nrm([0.6, 0.35, 0.7]);              // contraluz limão, por trás à direita
  function shade(F, cam, t) {
    const n = F.n;
    const lam = Math.max(0, dot(n, KEY)), rim = Math.max(0, dot(n, RIM));
    const facing = Math.max(0, -dot(n, nrm(sub(F.pts[0], cam.pos))));
    const v = 0.22 + 0.78 * lam;
    let col;
    switch (F.mat) {
      case 'white': col = mixA('#3B3C3A', '#FFFFFF', v); break;
      case 'lime': col = mixA('#3E5E0C', C.limeL, clamp(v + 0.1)); break;
      case 'steel': col = mixA('#121316', '#4A4D55', v * 0.9 + 0.1 * facing); break;
      default: col = mixA('#0B0B0D', '#2E3036', v); break;          // tinta (preto acetinado)
    }
    col = mixA(col, C.lime, 0.28 * rim * (F.mat === 'white' ? 0.4 : 1) + (F.glow || 0));
    return col;
  }

  // =====================================================================
  // O MUNDO NO INSTANTE t
  // =====================================================================
  function worldFaces(t) {
    const out = [];
    const th = theta(t);
    const fadeBal = 1;                                                      // a balança está sempre lá
    // base e coluna
    boxFaces(out, [0, 0.12, 0], [3.4, 0.24, 2.4], 'steel', { alpha: fadeBal });
    boxFaces(out, [0, (PIV[1] - 0.6) / 2 + 0.24, 0], [0.5, PIV[1] - 0.6 - 0.24, 0.5], 'steel', { alpha: fadeBal });
    // o fulcro: prisma limão de ponta para cima
    {
      const a = [-0.62, PIV[1] - 0.66], b = [0.62, PIV[1] - 0.66], cTop = [0, PIV[1]];
      const z0 = -0.36, z1 = 0.36;
      const tri = (z) => [[a[0], a[1], z], [b[0], b[1], z], [cTop[0], cTop[1], z]];
      const f0 = tri(z0), f1 = tri(z1);
      out.push({ pts: f0, n: [0, 0, -1], mat: 'lime', side: 'fx', alpha: 1, glow: 0.15 });
      out.push({ pts: [f0[0], f0[2], f1[2], f1[0]], n: nrm([-0.6, 0.55, 0]), mat: 'lime', side: 'fx', alpha: 1 });
      out.push({ pts: [f0[2], f0[1], f1[1], f1[2]], n: nrm([0.6, 0.55, 0]), mat: 'lime', side: 'fx', alpha: 1 });
      out.push({ pts: f1, n: [0, 0, 1], mat: 'lime', side: 'fx', alpha: 1 });
    }
    // o braço
    boxFaces(out, [0, PIV[1] + 0.18, 0], [2 * ARM + 0.7, 0.34, 0.56], 'ink', { rot: th, piv: PIV, edge: C.lime });
    // postes e pratos (sempre na horizontal)
    for (const side of [-1, 1]) {
      const e = armEnd(side, th);
      boxFaces(out, [e[0], e[1] + 0.3 + POST / 2, 0], [0.3, POST, 0.3], 'steel');
      boxFaces(out, [e[0], e[1] + 0.3 + POST + PLAT[1] / 2 - 0.3, 0], PLAT, 'ink', { edge: C.lime });
    }
    // o total da hospedagem (cai no 1º tempo)
    {
      const h = HV(1350), rest = platTop(-1, th) + h / 2, x = armEnd(-1, th)[0];
      const t0 = -0.3, u = p(t, t0, TOTAL_LAND);
      const y = t < TOTAL_LAND ? lerp(platTop(-1, 0) + h / 2 + 8, platTop(-1, 0) + h / 2, u * u) : rest;
      boxFaces(out, [x, y, 0], [BW, h, BD], 'white', { tex: TEX.total });
    }
    // os pagamentos
    PAY.forEach((P0, i) => {
      if (t < P0.t + 0.32) return;
      const st = payState(i, t, th);
      // o valor ganha corpo: a placa se aprofunda (o texto não deforma)
      const depth = BD * E.outCubic(p(t, P0.t + 0.32, P0.t + 0.32 + 0.38));
      if (depth <= 0.01) return;
      const c = [st.c[0], st.c[1], -BD / 2 + depth / 2];
      const withM = t >= P0.t + 4 * S16 * 2 + 0.05;
      boxFaces(out, c, [BW, st.h, depth], 'lime', { tex: TEX[(withM ? 'payM' : 'pay') + i], glow: 0.25 * kick(t, P0.land, 0.4) + 0.3 * kick(t, P0.t + 6 * S16 * 2, 0.3) });
    });
    // o prisma da forma de pagamento (gira e escolhe)
    PAY.forEach((P0, i) => {
      const ts = P0.t + 4 * S16, tl = P0.t + 7 * S16, te = P0.t + 8 * S16 + 0.05;
      const a = p(t, ts - 0.05, ts + 0.12) * (1 - p(t, te - 0.05, te + 0.1));
      if (a <= 0.01) return;
      const st = payState(i, t, theta(t));
      const target = P0.sel * TAU / 3;
      const ang = target + (1 - E.outBack(p(t, ts, tl), 1.2)) * TAU * 1.5;
      const sc = 1 - 0.85 * E.inCubic(p(t, te - 0.12, te + 0.05));
      prismFaces(out, [st.c[0], st.c[1] + st.h / 2 + 0.95 * sc + 0.2, -BD / 2 - 0.2], 2.7 * sc, 0.72 * sc, ang, TEX.methods, a);
    });
    return { out, th };
  }

  // ---------------------------------------------------------------- desenho das faces
  function drawFaces(ctx, cam, faces, t, o = {}) {
    const items = [];
    for (const F of faces) {
      if (F.alpha <= 0.01) continue;
      const pts = o.mirror ? F.pts.map((q) => [q[0], -q[1], q[2]]) : F.pts;
      const n = o.mirror ? [F.n[0], -F.n[1], F.n[2]] : F.n;
      const cen = pts.reduce((s, q) => add(s, mul(q, 1 / pts.length)), [0, 0, 0]);
      if (dot(n, sub(cam.pos, cen)) <= 0) continue;                 // só as faces voltadas para a câmera
      const sp = pts.map(cam.P);
      if (sp.some((q) => !q)) continue;
      items.push({ z: cam.toCam(cen)[2], F, sp });
    }
    items.sort((a, b) => b.z - a.z);
    for (const it of items) {
      const { F, sp } = it;
      ctx.save(); ctx.globalAlpha *= F.alpha * (o.alpha ?? 1);
      ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let k = 1; k < sp.length; k++) ctx.lineTo(sp[k][0], sp[k][1]); ctx.closePath();
      ctx.fillStyle = css(shade(F, cam, t)); ctx.fill();
      if (F.tex && !o.mirror && sp.length === 4) {
        const lam = 0.75 + 0.25 * Math.max(0, dot(F.n, KEY));
        ctx.globalAlpha *= lam;
        texQuad(ctx, F.tex, sp, F.prism ? 2 : 1);
      }
      if (!o.mirror) {
        ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let k = 1; k < sp.length; k++) ctx.lineTo(sp[k][0], sp[k][1]); ctx.closePath();
        ctx.strokeStyle = F.edge ? css(F.edge, 0.55) : F.mat === 'white' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.07)';
        ctx.lineWidth = F.edge ? 2 : 1.2; ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- mostrador (arco de precisão + ponteiro)
  function drawDial(ctx, cam, t, th, a) {
    if (a <= 0.01) return;
    const R = 2.5, z = 0.45;
    ctx.save(); ctx.lineCap = 'round';
    for (let d = -24; d <= 24; d += 2) {
      const ang = 90 * DEG + d * DEG, big = d % 12 === 0;
      const r0 = R, r1 = R + (big ? 0.34 : 0.18);
      const q0 = cam.P([PIV[0] + Math.cos(ang) * r0, PIV[1] + Math.sin(ang) * r0, z]), q1 = cam.P([PIV[0] + Math.cos(ang) * r1, PIV[1] + Math.sin(ang) * r1, z]);
      if (!q0 || !q1) continue;
      const near = Math.abs(d * DEG + th) < 1.5 * DEG;
      ctx.strokeStyle = d === 0 ? css(C.lime, a) : near ? css(C.white, a) : css('#FFFFFF', a * (big ? 0.55 : 0.28));
      ctx.lineWidth = (d === 0 ? 5 : big ? 3.5 : 2) * q0[3] / 90;
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
    }
    // ponteiro: sobe do fulcro e inclina com o braço
    const tip = rotZ([0, PIV[1] + R + 0.15, -0.3], PIV, th), base = [0, PIV[1] + 0.2, -0.3];
    const q0 = cam.P(base), q1 = cam.P(tip);
    if (q0 && q1) {
      const lev = 1 - clamp(Math.abs(th) / (1.2 * DEG));
      const col = mixA(C.pend, C.lime, lev);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, q1[0], q1[1], 70 * q1[3] / 90, col, 0.6 * a); ctx.restore();
      ctx.strokeStyle = css(col, a); ctx.lineWidth = 5 * q1[3] / 90;
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
      circle(ctx, q1[0], q1[1], 7 * q1[3] / 90); ctx.fillStyle = css(col, a); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- dígitos que se juntam e viram o valor
  function drawDigits(ctx, cam, t) {
    PAY.forEach((P0, i) => {
      const t0 = P0.t, t1 = P0.t + 0.36;
      if (t < t0 || t > t1 + 0.05) return;
      const st = payState(i, t, theta(t));
      const s = brl(P0.v, '+ ');
      const front = -BD / 2 - 0.01, PX = 400;
      const size = HV(P0.v) * PX < 500 ? 120 : 150, vy = HV(P0.v) * PX < 500 ? 190 : 260;
      // posição de cada caractere no plano da face (unidades do mundo)
      let x = 56;
      const pos = [];
      for (const ch of s) { const w = tw(ctx, ch, DISPLAY, size, 900, -4); pos.push([x + w / 2, ch]); x += w; }
      pos.forEach(([px, ch], k) => {
        const u = E.outCubic(p(t, t0 + k * 0.02, t1 - 0.02 + k * 0.004));
        const wx = st.c[0] - BW / 2 + px / PX, wy = st.c[1] + st.h / 2 - vy / PX + size * 0.35 / PX;
        const from = [wx + (hash(k, 3 + i) - 0.5) * 3.4, wy + (hash(k, 5 + i) - 0.5) * 2.6 + 0.6, front - 1.2 - 2.4 * hash(k, 7 + i)];
        const q = cam.P(lerp3(from, [wx, wy, front], u));
        if (!q) return;
        const sz = size / PX * q[3];
        txt(ctx, ch, q[0], q[1] + sz * 0.35, { fam: DISPLAY, size: sz, weight: 900, color: mix2(u), align: 'center', alpha: clamp(u * 3) });
      });
    });
  }
  const mix2 = (u) => css(mixA(C.white, C.lime, u));

  // ---------------------------------------------------------------- confirmação (selo que contorna o bloco)
  function drawConfirm(ctx, cam, t) {
    PAY.forEach((P0, i) => {
      const tc = P0.t + 6 * S16 * 2;
      const u = p(t, tc, tc + 0.42);
      if (u <= 0 || u >= 1) return;
      const st = payState(i, t, theta(t));
      const z = -BD / 2 - 0.02, g = 0.12 + 0.5 * E.outCubic(u);
      const pts = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => cam.P([st.c[0] + sx * (BW / 2 + g), st.c[1] + sy * (st.h / 2 + g), z]));
      if (pts.some((q) => !q)) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = css(C.limeL, 1 - u); ctx.lineWidth = 6 * (1 - u) + 1.5;
      ctx.beginPath(); pts.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.stroke();
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------- linha de nível, histórico e visão geral
  const LEVEL_Y = PIV[1] + POST + PLAT[1] + HV(1350) + 0.02;   // topo das pilhas quando nivelada
  // histórico e visão geral: uma trilha de luz por reserva/hospedagem, no chão à frente da balança
  const LANES = [
    { x: 12.4, code: 'FHZ-000138', place: 'IPÊ 09', items: [{ z: 2.6, v: 450, m: 'PIX', note: '08/10', tag: 'CHECK-IN / DIÁRIAS' }, { z: -4.0, v: 900, m: 'CARTÃO', note: '', tag: 'CHECK-IN / DIÁRIAS' }] },
    { x: 15.7, code: 'FHZ-000129', place: 'BICA D’ÁGUA 02', items: [{ z: -0.9, v: 85, m: 'PIX', note: '10:15', tag: 'CHECK-OUT / CONSUMOS' }] },
    { x: 19.0, code: 'FHZ-000131', place: 'BICA D’ÁGUA 04', items: [{ z: 2.3, v: 1440, m: '', note: '', tag: 'HOSPEDAGEM' }] },
    { x: 22.3, code: 'FHZ-000132', place: 'RESERVA', items: [{ z: -2.2, v: 930, m: 'PIX', note: '', tag: 'RESERVA' }] },
  ];
  const Z_FAR = 4.2, Z_NEAR = -7.6;
  const laneOn = (k, t) => (k === 0 ? E.inOutCubic(p(t, T.historico - 0.05, T.historico + 0.55)) : E.inOutCubic(p(t, T.geral + (2 * k - 1) * S16, T.geral + (2 * k + 3) * S16)));
  const laneOff = (t) => 1 - p(t, T.ordem + 0.05, T.ordem + 0.55);
  // os registros pousam na grade de semicolcheias (o som cai junto com a percussão)
  const itemTime = (k, j) => (k === 0 ? T.historico + 6 * S16 + j * 2 * BT : T.geral + (4 + 2 * k) * S16) - 0.38;
  const recH = (v) => Math.max(0.3, v * 0.0013);
  function drawLevelAndHistory(ctx, cam, t, faces, lines = true) {
    // a linha de nível (laser) quando a balança fica quitada
    const lv = E.outCubic(p(t, T.equilibrio + 0.25, T.equilibrio + 0.7)) * (1 - p(t, T.historico + 0.3, T.historico + 0.8));
    if (lv > 0.01 && lines) seg3(ctx, cam, [-11 * lv, LEVEL_Y, 0], [11 * lv, LEVEL_Y, 0], C.lime, 3, lv);
    LANES.forEach((L, k) => {
      const r = laneOn(k, t) * laneOff(t);
      if (r <= 0.01) return;
      const zEnd = lerp(Z_FAR, Z_NEAR, laneOn(k, t));
      if (lines) {
        // da balança para o chão (só na trilha desta hospedagem) e ao longo do chão
        if (k === 0) seg3(ctx, cam, [ARM + PLAT[0] / 2, platTop(1, theta(t)) - 0.1, 0], [L.x, 0.02, Z_FAR], C.lime, 2.5, 0.8 * r);
        seg3(ctx, cam, [L.x, 0.02, Z_FAR], [L.x, 0.02, zEnd], k === 0 ? C.lime : C.limeL, 3, 0.9 * r);
        for (let z = Z_FAR - 1; z > zEnd; z -= 1) seg3(ctx, cam, [L.x - 0.22, 0.02, z], [L.x + 0.22, 0.02, z], '#FFFFFF', 1.5, 0.3 * r);
      }
      L.items.forEach((it, j) => {
        const ti = itemTime(k, j), u = E.outBack(p(t, ti, ti + 0.4), 1.5);
        if (u <= 0.01) return;
        const h = recH(it.v);
        // a cópia do pagamento desce do prato (histórico) ou brota do chão (visão geral)
        const from = k === 0 ? [ARM, platTop(1, theta(ti)) + HV(PAY.slice(0, j).reduce((s, q) => s + q.v, 0)) + HV(it.v) / 2, 0] : [L.x, -h, it.z];
        const c = lerp3(from, [L.x, h / 2 + 0.02, it.z], E.outCubic(p(t, ti, ti + 0.38)));
        boxFaces(faces, c, [2.3, h, 1.5], 'lime', { alpha: clamp(u * 2) * laneOff(t), glow: 0.4 * kick(t, ti + 0.38, 0.4) });
      });
    });
  }
  function seg3(ctx, cam, a, b, col, lw, al) {
    const qa = cam.P(a), qb = cam.P(b);
    if (!qa || !qb) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = css(col, al * 0.3); ctx.lineWidth = lw * 4;
    ctx.beginPath(); ctx.moveTo(qa[0], qa[1]); ctx.lineTo(qb[0], qb[1]); ctx.stroke();
    ctx.strokeStyle = css(col, al); ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(qa[0], qa[1]); ctx.lineTo(qb[0], qb[1]); ctx.stroke();
    ctx.restore();
  }
  // rótulos das trilhas (texto de tela ancorado no 3D)
  function historyLabels(ctx, cam, t) {
    LANES.forEach((L, k) => {
      const r = laneOn(k, t) * laneOff(t);
      if (r <= 0.05) return;
      const q = cam.P([L.x, 0.02, Z_NEAR - 0.6]);
      if (q) {
        const sc = clamp(q[3] / 75, 0.75, 1.25);
        txt(ctx, L.code, q[0], q[1] + 36 * sc, { size: 30 * sc, weight: 800, color: C.white, align: 'center', alpha: r, shadow: 'rgba(0,0,0,0.9)', blur: 12, ls: 1 });
        txt(ctx, L.place, q[0], q[1] + 70 * sc, { size: 24 * sc, weight: 800, color: C.grayL, align: 'center', alpha: r, ls: 2 });
      }
      L.items.forEach((it, j) => {
        const ti = itemTime(k, j), a = p(t, ti + 0.3, ti + 0.55) * r;
        if (a <= 0.01) return;
        const qv = cam.P([L.x, recH(it.v) + 0.05, it.z - 0.65]);
        if (!qv) return;
        const sc = clamp(qv[3] / 75, 0.8, 1.3);
        txt(ctx, brl(it.v, '+ '), qv[0], qv[1] + 48 * sc, { fam: DISPLAY, size: 42 * sc, weight: 900, color: C.lime, align: 'center', alpha: a, shadow: 'rgba(0,0,0,0.9)', blur: 14 });
        const meta = [it.m, it.note].filter(Boolean).join(' · ');
        let yy = qv[1] + 88 * sc;
        if (meta) { txt(ctx, meta, qv[0], yy, { size: 26 * sc, weight: 800, color: C.white, align: 'center', alpha: a, ls: 2, shadow: 'rgba(0,0,0,0.9)', blur: 10 }); yy += 34 * sc; }
        txt(ctx, it.tag, qv[0], yy, { size: 21 * sc, weight: 800, color: it.tag.startsWith('CHECK-OUT') ? C.checkout : it.tag.startsWith('CHECK-IN') ? C.checkin : C.grayL, align: 'center', alpha: a, ls: 2, shadow: 'rgba(0,0,0,0.9)', blur: 10 });
      });
    });
  }

  // ---------------------------------------------------------------- o resumo (livro-razão tipográfico na base)
  function ledger(ctx, t, th) {
    const a = p(t, TOTAL_LAND + 0.15, TOTAL_LAND + 0.5) * (1 - p(t, T.historico - 0.3, T.historico + 0.05));
    if (a <= 0.01) return;
    const rec = 450 * E.outCubic(p(t, PAY[0].land, PAY[0].land + 0.35)) + 900 * E.outCubic(p(t, PAY[1].land, PAY[1].land + 0.3));
    const pend = 1350 - rec;
    const x0 = 110, x1 = 930, y0 = 1330, lh = 74;
    ctx.save(); ctx.globalAlpha *= a;
    const g = ctx.createLinearGradient(0, y0 - 120, 0, 1560);
    g.addColorStop(0, 'rgba(5,5,6,0)'); g.addColorStop(0.35, 'rgba(5,5,6,0.72)'); g.addColorStop(1, 'rgba(5,5,6,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, y0 - 120, W, 1560 - (y0 - 120));
    const row = (i, label, val, col, size = 46, al = 1) => {
      const y = y0 + i * lh;
      txt(ctx, label, x0, y, { size: 24, weight: 800, color: C.grayL, ls: 3, alpha: al });
      txt(ctx, val, x1, y + 6, { fam: DISPLAY, size, weight: 900, color: col, align: 'right', ls: -1, alpha: al });
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x0, y + 26, x1 - x0, 2);
    };
    row(0, 'TOTAL DA HOSPEDAGEM', brl(1350), C.white);
    row(1, 'TOTAL RECEBIDO', brl(rec, '+ '), C.lime);
    const q = p(t, PAY[1].land + 2 * S16, PAY[1].land + 2 * S16 + 0.2);
    if (q < 1) row(2, 'DIÁRIAS · PENDENTE', brl(pend), C.pend, 52, 1 - q);
    if (q > 0) {
      const y = y0 + 2 * lh, s = E.outBack(q, 2);
      txt(ctx, 'DIÁRIAS', x0, y, { size: 24, weight: 800, color: C.grayL, ls: 3, alpha: q });
      ctx.save(); ctx.translate(x1, y - 8); ctx.scale(s, s);
      chip(ctx, 0, 0, 'QUITADA', { size: 30, align: 'right', dot: C.quit, bg: 'rgba(76,192,103,0.16)', border: 'rgba(76,192,103,0.8)', color: '#7BE296' });
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- rótulos de apoio no 3D (registro)
  function registerLabels(ctx, cam, t) {
    PAY.forEach((P0, i) => {
      const a = p(t, P0.t + 0.05, P0.t + 0.3) * (1 - p(t, P0.land - 0.45, P0.land - 0.2));
      if (a <= 0.01) return;
      const st = payState(i, t, theta(t));
      const q = cam.P([st.c[0], st.c[1] - st.h / 2 - 0.45, -BD / 2]);
      if (!q) return;
      const tc = P0.t + 6 * S16 * 2;
      const lab = t < tc ? 'VALOR A RECEBER' : 'RECEBIMENTO CONFIRMADO';
      const col = t < tc ? C.grayL : C.lime;
      txt(ctx, lab, q[0], q[1] + 30, { size: 28, weight: 800, color: col, align: 'center', ls: 4, alpha: a, shadow: 'rgba(0,0,0,0.8)', blur: 14 });
    });
  }

  // ---------------------------------------------------------------- palco: fundo, chão espelhado, partículas
  function stage(ctx, cam, t, faces, th) {
    const hy = cam.k.cy + cam.f * Math.tan(clamp(cam.k.pitch, -1.5, 1.5));
    ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, W, H);
    // halo atrás da balança
    const c0 = cam.P([0, 5.5, 8]);
    if (c0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, c0[0], c0[1], 900, '#1B2408', 0.9); glow(ctx, c0[0], c0[1], 500, C.lime, 0.05 + 0.1 * kick(t, T.equilibrio, 1.0)); ctx.restore(); }
    // um refletor de cima sobre a balança (luz volumétrica)
    const top = cam.P([0, 16, 0]), bot = cam.P([0, 0, 0]);
    if (top && bot) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const wTop = 1.2 * top[3], wBot = 9 * bot[3];
      const g = ctx.createLinearGradient(0, top[1], 0, bot[1]);
      g.addColorStop(0, 'rgba(230,255,190,0.0)'); g.addColorStop(0.35, 'rgba(230,255,190,0.035)'); g.addColorStop(1, 'rgba(197,250,64,0.06)');
      ctx.beginPath(); ctx.moveTo(top[0] - wTop, top[1]); ctx.lineTo(top[0] + wTop, top[1]); ctx.lineTo(bot[0] + wBot, bot[1]); ctx.lineTo(bot[0] - wBot, bot[1]); ctx.closePath();
      ctx.fillStyle = g; ctx.fill(); ctx.restore();
    }
    // reflexo no chão (cena espelhada, esmaecida)
    if (hy < H) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, Math.max(0, hy), W, H); ctx.clip();
      drawFaces(ctx, cam, faces, t, { mirror: true, alpha: 0.22 });
      const g = ctx.createLinearGradient(0, Math.max(0, hy), 0, H);
      g.addColorStop(0, 'rgba(8,8,10,0.35)'); g.addColorStop(0.5, 'rgba(6,6,7,0.8)'); g.addColorStop(1, 'rgba(5,5,6,0.95)');
      ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, hy), W, H);
      const fc = cam.P([0, 0, 0]);
      if (fc) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(fc[0], fc[1]); ctx.scale(1, 0.32); glow(ctx, 0, 0, 11 * fc[3], C.lime, 0.12 + 0.18 * kick(t, T.equilibrio, 1.2)); ctx.restore(); }
      // grade do piso
      ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 1;
      for (let i = -30; i <= 30; i += 2) {
        const a = cam.P([i, 0, -12]), b = cam.P([i, 0, 40]);
        if (a && b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      }
      for (let z = -12; z <= 40; z += 2) {
        const a = cam.P([-30, 0, z]), b = cam.P([30, 0, z]);
        if (a && b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      }
      ctx.restore();
    }
    // poeira na luz
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = C.limeL;
    for (let i = 0; i < 140; i++) {
      const x = -12 + 24 * hash(i, 11), z = -4 + 14 * hash(i, 12), y = (hash(i, 13) * 11 + t * (0.15 + 0.25 * hash(i, 14))) % 11;
      const q = cam.P([x + Math.sin(t * 0.5 + i) * 0.3, y, z]);
      if (!q) continue;
      ctx.globalAlpha = (0.15 + 0.35 * hash(i, 15)) * Math.sin(Math.PI * y / 11);
      const s = Math.max(1, 0.03 * q[3]);
      ctx.fillRect(q[0], q[1], s, s);
    }
    ctx.restore();
  }

  // =====================================================================
  // O QUADRO
  // =====================================================================
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const cam = camAt(t);
    const { out: faces, th } = worldFaces(t);
    drawLevelAndHistory(ctx, cam, t, faces, false);        // acrescenta os blocos do histórico às faces
    stage(ctx, cam, t, faces, th);
    drawDial(ctx, cam, t, th, p(t, 0.2, 0.6) * (1 - p(t, T.marca - 0.2, T.marca + 0.3)));
    drawFaces(ctx, cam, faces, t);
    drawLevelAndHistoryLines(ctx, cam, t);
    drawDigits(ctx, cam, t);
    drawConfirm(ctx, cam, t);
    registerLabels(ctx, cam, t);
    historyLabels(ctx, cam, t);
    impacts(ctx, cam, t);
    ledger(ctx, t, th);
    copy(ctx, t);
    finale(ctx, t, cam);
    const fl = 0.16 * kick(t, TOTAL_LAND, 0.22) + 0.22 * kick(t, T.equilibrio, 0.28) + 0.18 * kick(t, T.marca + 0.02, 0.25);
    if (fl > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = css('#F4FFE0', fl); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  // as linhas (desenhadas depois das faces para brilhar por cima)
  function drawLevelAndHistoryLines(ctx, cam, t) { drawLevelAndHistory(ctx, cam, t, [], true); }
  // ondas de choque nos pousos
  function impacts(ctx, cam, t) {
    const hits = [[TOTAL_LAND, -1, HV(1350)], [PAY[0].land, 1, 0], [PAY[1].land, 1, HV(450)]];
    for (const [t0, side, below] of hits) {
      const u = p(t, t0, t0 + 0.55);
      if (u <= 0 || u >= 1) continue;
      const th = theta(t0), e = armEnd(side, th), y = platTop(side, th) + (side < 0 ? 0 : below);
      const r = 1.4 + 2.6 * E.outCubic(u);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = css(C.limeL, 0.8 * (1 - u)); ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const a = k / 40 * TAU, q = cam.P([e[0] + Math.cos(a) * r, y, Math.sin(a) * r * 0.8]);
        if (!q) continue;
        if (k === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke(); ctx.restore();
    }
  }

  // ---------------------------------------------------------------- textos
  function copy(ctx, t) {
    title(ctx, t, 'Toda estadia', 'tem um saldo.', TOTAL_LAND + 0.04, T.registre - 0.3);
    title(ctx, t, 'Registre cada', 'pagamento.', T.registre + 0.05, T.parcial - 0.35);
    title(ctx, t, 'Parcial ou total,', 'tudo na conta.', T.parcial + 0.1, T.diarias - 0.3);
    title(ctx, t, 'O que falta', 'fica à vista.', T.diarias + 0.05, T.equilibrio - 0.35);
    title(ctx, t, 'Saldo zerado.', 'Em equilíbrio.', T.equilibrio + 0.1, T.historico - 0.3);
    title(ctx, t, 'Cada pagamento', 'no histórico.', T.historico + 0.1, T.geral - 0.3);
    title(ctx, t, 'Tudo o que entrou,', 'num só lugar.', T.geral + 0.1, T.ordem - 0.3);
    title(ctx, t, 'Pagamentos em ordem,', 'contas em equilíbrio.', T.ordem + 0.1, T.marca - 0.72, { size: 80 });
  }
  function finale(ctx, t, cam) {
    if (t < T.marca - 0.45) return;
    // a logo desce e pousa no centro da balança (o braço não se move: carga no centro)
    const d = 2.7;                                                 // diâmetro em unidades
    const u = p(t, T.marca - 0.42, T.marca);
    const yl = lerp(PIV[1] + 9.5, PIV[1] + 0.31 + d / 2, E.inQuad(u)) - 0.06 * Math.sin(p(t, T.marca, T.marca + 0.3) * Math.PI);
    const q = cam.P([0, yl, -0.6]);
    if (!q) return;
    const sz = d * q[3];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, q[0], q[1], sz * 1.6, C.lime, 0.18 + 0.4 * kick(t, T.marca, 0.6)); ctx.restore();
    logo(ctx, q[0], q[1], sz, p(t, T.marca - 0.42, T.marca - 0.3));
    // apoio e convite
    const ky = Math.min(1236, q[1] + sz / 2 + 128);
    const ka = p(t, T.marca + 0.45, T.marca + 0.75);
    if (ka > 0) {
      const g = ctx.createLinearGradient(0, ky - 140, 0, 1560);
      g.addColorStop(0, 'rgba(5,5,6,0)'); g.addColorStop(0.3, 'rgba(5,5,6,0.78)'); g.addColorStop(1, 'rgba(5,5,6,0.9)');
      ctx.save(); ctx.globalAlpha *= ka; ctx.fillStyle = g; ctx.fillRect(0, ky - 140, W, 1560 - (ky - 140)); ctx.restore();
    }
    riseLine(ctx, [{ s: 'FAZLO ', color: C.white }, { s: 'Hospeda', color: C.white }], W / 2, ky + 52, p(t, T.marca + 0.45, T.marca + 0.85), 0, { size: 84, weight: 900, ls: -2.4 });
    txt(ctx, 'GESTÃO DE PAGAMENTOS', W / 2, ky + 100, { size: 28, weight: 800, color: C.lime, align: 'center', ls: 8, alpha: p(t, T.marca + 0.7, T.marca + 1.0) });
    const sa = p(t, T.site - 0.05, T.site + 0.25);
    txt(ctx, 'ACESSE O SITE', W / 2, ky + 168, { size: 30, weight: 800, color: C.white, align: 'center', ls: 8, alpha: sa });
    const da = E.outBack(p(t, T.site + 0.25, T.site + 0.6), 1.8);
    if (da > 0) {
      const s = 'fazlohospeda.com.br', dw = tw(ctx, s, DISPLAY, 52, 800, -1) + 76;
      ctx.save(); ctx.translate(W / 2, ky + 238); ctx.scale(da, da);
      rr(ctx, -dw / 2, -40, dw, 80, 40); ctx.fillStyle = C.lime; ctx.fill();
      txt(ctx, s, 0, 18, { fam: DISPLAY, size: 52, weight: 800, color: C.ink, align: 'center', ls: -1 });
      const gl = p(t, T.site + 1.5, T.site + 2.1);
      if (gl > 0 && gl < 1) {
        rr(ctx, -dw / 2, -40, dw, 80, 40); ctx.clip();
        const gx = lerp(-dw / 2 - 120, dw / 2 + 120, E.inOutSine(gl)), g = ctx.createLinearGradient(gx - 80, 0, gx + 80, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.65)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(gx - 80, -40, 160, 80);
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- motion blur por subamostragem
  const FAST = [[0, 0.75, 10, 1 / 55], [T.registre, T.registre + 0.4, 10, 1 / 55], [T.parcial - 0.45, T.parcial + 0.4, 10, 1 / 55],
    [T.diarias, T.diarias + 0.4, 10, 1 / 55], [T.equilibrio - 0.45, T.equilibrio + 0.4, 10, 1 / 55], [T.historico - 0.1, T.historico + 0.7, 10, 1 / 55],
    [T.geral - 0.05, T.geral + 0.7, 10, 1 / 55], [T.ordem - 0.05, T.ordem + 0.7, 10, 1 / 55], [T.marca - 0.6, T.marca + 0.15, 12, 1 / 55]];
  function shutterSpec(t) {
    for (const [a, b, k, dt] of FAST) if (t >= a && t < b) return { k, dt };
    return { k: 4, dt: 1 / 120 };
  }
  let bufS = null, bufA = null;
  function renderAt(ctx, t, o = {}) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    t = clamp(t, 0, DURATION - 1e-4);
    const sh = o.noBlur ? { k: 1 } : shutterSpec(t);
    if (sh.k <= 1) { frame(ctx, t); return; }
    if (!bufS) { const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }; bufS = mk(); bufA = mk(); }
    const sctx = bufS.getContext('2d'), actx = bufA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < sh.k; k++) {
      frame(sctx, clamp(t + (k / (sh.k - 1) - 0.5) * sh.dt, 0, DURATION - 1e-4));
      actx.globalAlpha = 1 / (k + 1); actx.drawImage(bufS, 0, 0);
    }
    actx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bufA, 0, 0);
  }

  // ---------------------------------------------------------------- capa
  function renderCover(ctx) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    const t = T.equilibrio + 1.4;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    const pos = [0, 6.0, -13.6], [yaw, pitch] = lookAng(pos, [0, 5.0, 0]);
    const cam = makeCam({ x: pos[0], y: pos[1], z: pos[2], yaw, pitch, f: 1120, cx: W / 2, cy: 1080 });
    const { out: faces, th } = worldFaces(t);
    stage(ctx, cam, t, faces, th);
    drawDial(ctx, cam, t, th, 1);
    drawFaces(ctx, cam, faces, t);
    seg3(ctx, cam, [-9, LEVEL_Y, 0], [9, LEVEL_Y, 0], C.lime, 3, 1);
    const tv = ctx.createLinearGradient(0, 220, 0, 780);
    tv.addColorStop(0, 'rgba(5,5,6,0.85)'); tv.addColorStop(1, 'rgba(5,5,6,0)');
    ctx.fillStyle = tv; ctx.fillRect(0, 0, W, 780);
    txt(ctx, 'Pagamentos', W / 2, 470, { fam: DISPLAY, size: 132, weight: 900, color: C.white, align: 'center', ls: -4, shadow: 'rgba(0,0,0,0.5)' });
    txt(ctx, 'em equilíbrio.', W / 2, 600, { fam: DISPLAY, size: 120, weight: 900, color: C.lime, align: 'center', ls: -4, shadow: 'rgba(0,0,0,0.5)' });
    chip(ctx, W / 2, 1530, 'GESTÃO DE PAGAMENTOS · FAZLO HOSPEDA', { size: 26, bg: C.lime, color: C.ink, ls: 3 });
  }

  // ---------------------------------------------------------------- cues de som
  const CUES = [];
  const cue = (t, type, o = {}) => CUES.push(Object.assign({ t: Math.round(t * 1e4) / 1e4, type }, o));
  function buildCues() {
    CUES.length = 0;
    cue(0, 'fall', { d: TOTAL_LAND });
    cue(TOTAL_LAND, 'slam', { side: -1 });
    cue(TOTAL_LAND + 0.02, 'swing', { d: 1.6, amp: 1 });
    [[TOTAL_LAND + 0.04, TOTAL_LAND + 0.32], [T.registre + 0.05, T.registre + 0.33], [T.parcial + 0.1, T.parcial + 0.38], [T.diarias + 0.05, T.diarias + 0.33],
      [T.equilibrio + 0.1, T.equilibrio + 0.38], [T.historico + 0.1, T.historico + 0.38], [T.geral + 0.1, T.geral + 0.38], [T.ordem + 0.1, T.ordem + 0.38]]
      .forEach(([a, b]) => { cue(a, 'rise', {}); cue(b, 'rise', {}); });
    cue(TOTAL_LAND + 0.15, 'ledger', {});
    PAY.forEach((P0, i) => {
      cue(P0.t, 'digits', { d: 0.36, n: brl(P0.v, '+ ').length });
      cue(P0.t + 0.32, 'extrude', { d: 0.38 });
      cue(P0.t + 4 * S16, 'prism', { d: 3 * S16, k: i });
      cue(P0.t + 7 * S16, 'select', { k: P0.sel });
      cue(P0.t + 6 * S16 * 2, 'confirm', { k: i });
      cue(P0.land - 0.42, 'drop', { d: 0.42 });
      cue(P0.land, 'land', { k: i, final: i === PAY.length - 1 ? 1 : 0 });
      cue(P0.land + 0.02, 'swing', { d: 1.4, amp: i === 0 ? 0.5 : 0.8 });
    });
    cue(PAY[1].land + 2 * S16, 'quitada', {});
    cue(T.equilibrio + 0.25, 'laser', { d: 0.45 });
    cue(T.historico - 0.25, 'travel', { d: 0.8, dir: -1 });
    LANES[0].items.forEach((_, j) => cue(itemTime(0, j) + 0.38, 'record', { k: j }));
    cue(T.geral - 0.05, 'crane', { d: 0.6 });
    LANES.forEach((L, k) => { if (k > 0) cue(itemTime(k, 0) + 0.38, 'record', { k: k + 1 }); });
    cue(T.ordem - 0.05, 'travel', { d: 0.65, dir: 1 });
    cue(T.marca - 0.42, 'logofall', { d: 0.42 });
    cue(T.marca, 'logo', {});
    cue(T.marca + 0.45, 'rise', {});
    cue(T.marca + 0.7, 'type', { d: 0.3, n: 20 });
    cue(T.site, 'site', {});
    cue(T.site + 0.25, 'domain', {});
    cue(T.site + 1.5, 'glint', { d: 0.6 });
    CUES.sort((a, b) => a.t - b.t);
  }

  function init(img) {
    LOGO = img;
    buildCamera();
    buildTextures();
    buildCues();
    SHAKES.length = 0;
    SHAKES.push([TOTAL_LAND, 0.16, 0.45], [PAY[0].land, 0.07, 0.3], [PAY[1].land, 0.1, 0.35], [T.marca, 0.05, 0.3]);
  }

  window.REEL06 = {
    init, renderAt, renderCover, DURATION, W, H,
    cues: () => ({ bpm: BPM, duration: DURATION, sections: T, cues: CUES.slice() }),
  };
})();
