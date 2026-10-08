/* =====================================================================
   FAZLO Hospeda — REEL 03 "O caixa bateu?" — 9:16 (1080x1920)
   Controle de caixa. Motor em Canvas 2D, determinístico: renderAt(ctx, t)
   desenha o quadro exato do instante t (s).

   O caixa da pousada é um COFRE-FORTE em 3D (projeção em perspectiva real,
   calculada a cada quadro): a porta destrava e abre a sessão; tubos
   pneumáticos trazem cada lançamento até o diário de caixa; a gaveta mostra
   o saldo esperado em dinheiro; a conferência zera a diferença e a porta
   tranca. Todos os valores aparecem em painéis de palhetas (split-flap).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const BPM = 120, BT = 60 / BPM, S16 = BT / 4;          // 1 compasso = 2 s
  const DURATION = 30;                                  // 15 compassos
  const T = { hook: 0, drop: 4, title: 4.5, open: 6, flow: 8, cash: 14, close: 18, lock: 20.35, history: 23, finale: 26 };
  const DISPLAY = "'R3 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'R3 Mono', 'JetBrains Mono', monospace";

  const C = {
    black: '#0A0A0A', ink: '#0A0A0A', lime: '#AFFA27', limeD: '#8CD10C', limeL: '#D8FF8A', limeDeep: '#5A8A0E', olive: '#3E5A12',
    white: '#FFFFFF', paper: '#F2F2EC', gray: '#8E8E88', grayD: '#5E5E59', grayL: '#B9B9B1',
    steel0: '#0F110E', steel1: '#171A15', steel2: '#21251E', steel3: '#2E332A', steel4: '#454C40', steel5: '#6A7262',
    out: '#FF4D5E', checkin: '#3D8BFF', checkout: '#F5B638',
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
    inQuart: (x) => x * x * x * x,
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
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
  function radial(ctx, x, y, r, color, a, mid = 0.35) {
    if (a <= 0.002 || r <= 1) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(0.45, rgba(color, a * mid)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  function polyPath(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  function quad(ctx, pts, color) { ctx.beginPath(); polyPath(ctx, pts); ctx.fillStyle = color; ctx.fill(); }
  function bbox(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    return [x0, y0, x1, y1];
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
  /** Linha com máscara: sobe por trás de uma linha invisível e sai subindo. */
  function riseLine(ctx, segs, x, y, pin, pout, o) {
    if (pin <= 0 || pout >= 1) return 0;
    const size = o.size, weight = o.weight || 900, ls = o.ls ?? -size * 0.03, fam = o.fam || DISPLAY;
    const ws = segs.map((s) => tw(ctx, s.s, s.fam || fam, size, s.weight || weight, ls));
    const total = ws.reduce((a, b) => a + b, 0);
    const left = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    const off = (1 - E.outExpo(clamp(pin))) * size * 1.3 - E.inCubic(clamp(pout)) * size * 1.3;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.beginPath(); ctx.rect(left - 80, y - size * 1.05, total + 160, size * 1.38); ctx.clip();
    let cx = left;
    segs.forEach((s, i) => { setFont(ctx, s.fam || fam, size, s.weight || weight, 'left', ls); ctx.fillStyle = s.color || o.color; ctx.fillText(s.s, cx, y + off); cx += ws[i]; });
    ctx.restore();
    return total;
  }
  /** Bloco de linhas que entram uma a uma (colcheias) e saem juntas. */
  function lines(ctx, t, rows, o) {
    rows.forEach((r, i) => riseLine(ctx, r.segs, o.x ?? 540, o.y + i * (o.lh || o.size * 1.04), p(t, r.t - 0.02, r.t + 0.42),
      o.tout !== undefined ? p(t, o.tout + i * 0.04, o.tout + i * 0.04 + 0.3) : 0,
      { size: o.size, color: o.color || C.white, align: o.align || 'center', weight: o.weight, ls: o.ls }));
  }
  function pill(ctx, x, y, text, o) {
    const size = o.size || 28, w = tw(ctx, text, MONO, size, 800, o.ls ?? 3) + (o.dot ? size * 1.5 : 0) + size * 1.4, h = size * 2;
    const sc = o.scale ?? 1;
    if (sc <= 0.001) return w;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    rr(ctx, -w / 2, -h / 2, w, h, h / 2); fill(ctx, o.bg);
    if (o.border) { rr(ctx, -w / 2, -h / 2, w, h, h / 2); stroke(ctx, o.border, 3); }
    let tx = -w / 2 + size * 0.7;
    if (o.dot) { circle(ctx, tx + size * 0.35, 0, size * 0.28); fill(ctx, o.dot); tx += size * 1.5; }
    txt(ctx, text, tx, size * 0.36, { size, weight: 800, color: o.color, ls: o.ls ?? 3 });
    ctx.restore();
    return w;
  }

  // ---------------------------------------------------------------- logo (imagem fornecida, sem alteração)
  let LOGO = null;
  function logo(ctx, x, y, d, alpha = 1) {
    if (d <= 1 || alpha <= 0.001) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    if (LOGO) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(LOGO, x - d / 2, y - d / 2, d, d); }
    else { circle(ctx, x, y, d / 2); fill(ctx, C.black); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- ícones de traço (caixa unitária)
  function clockIcon(ctx, x, y, r, col, lw) {
    circle(ctx, x, y, r); stroke(ctx, col, lw);
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.55); ctx.lineTo(x, y); ctx.lineTo(x + r * 0.42, y + r * 0.2); stroke(ctx, col, lw);
  }
  function checkIcon(ctx, x, y, r, col, lw) {
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y); ctx.lineTo(x - r * 0.12, y + r * 0.38); ctx.lineTo(x + r * 0.55, y - r * 0.4); stroke(ctx, col, lw);
  }

  // =====================================================================
  // CÂMERA 3D (perspectiva): x à direita, y para baixo, z para dentro da tela
  // =====================================================================
  function makeCam(c) {
    const cy = Math.cos(c.yaw || 0), sy = Math.sin(c.yaw || 0), cp = Math.cos(c.pitch || 0), sp = Math.sin(c.pitch || 0);
    const cr = Math.cos(c.roll || 0), sr = Math.sin(c.roll || 0), f = c.f || 1400, ox = c.sx ?? 540, oy = c.sy ?? 960;
    return {
      c,
      P(x, y, z) {
        const X = x - c.x, Y = y - c.y, Z = z - c.z;
        const x1 = X * cy - Z * sy, z1 = X * sy + Z * cy;       // guinada
        const y1 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;     // arfagem (positivo = olhar para baixo)
        const x2 = x1 * cr - y1 * sr, y2 = x1 * sr + y1 * cr;   // rolagem
        const zz = Math.max(30, z2), s = f / zz;
        return [ox + x2 * s, oy + y2 * s, zz, s];
      },
    };
  }
  function lerpCam(a, b, u) {
    const o = {};
    for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) o[k] = lerp(a[k] ?? 0, b[k] ?? 0, u);
    return o;
  }
  /** Câmera por keyframes [{t, ...params, e: easing do trecho que termina nele}] */
  function camAt(keys, t) {
    if (t <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i].t) { const u = (keys[i].e || E.inOutCubic)(p(t, keys[i - 1].t, keys[i].t)); return lerpCam(keys[i - 1], keys[i], u); }
    }
    return keys[keys.length - 1];
  }
  const unit = (n) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * TAU), Math.sin((i / n) * TAU)]);
  const U128 = unit(128), U64 = unit(64), U32 = unit(32), U20 = unit(20);

  // =====================================================================
  // O COFRE
  // =====================================================================
  const VR = 430, VT = 130, FR0 = VR + 16, FR1 = VR + 172, HX = -VR - 30, NBAR = 8;
  const BAR_A = Array.from({ length: NBAR }, (_, k) => (k / NBAR) * TAU + TAU / 16);
  /** ponto local da porta (centro na origem, face em z = 0) -> mundo, girando na dobradiça */
  function dw(V, lx, ly, lz) {
    const c = Math.cos(V.open), s = Math.sin(V.open), dx = lx - HX;
    return [V.cx + HX + dx * c + lz * s, V.cy + ly, V.cz - dx * s + lz * c];
  }
  const pd = (cam, V, lx, ly, lz) => { const w = dw(V, lx, ly, lz); return cam.P(w[0], w[1], w[2]); };
  const ringD = (cam, V, r, lz, U, ox = 0, oy = 0) => U.map(([c, s]) => pd(cam, V, ox + r * c, oy + r * s, lz));
  const ringW = (cam, V, r, z, U) => U.map(([c, s]) => cam.P(V.cx + r * c, V.cy + r * s, V.cz + z));

  function drawWall(ctx, cam, o = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0C0E0B'); g.addColorStop(1, '#050605');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const a = o.alpha ?? 1;
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    // chapas de aço da parede: juntas horizontais e verticais, com rebites
    const z = o.z ?? 0;
    for (let k = -14; k <= 14; k++) {
      const y = k * 450 + 225;
      const A = cam.P(-9000, y, z), B = cam.P(9000, y, z);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); stroke(ctx, '#171A15', Math.max(1, 5 * A[3]));
      ctx.beginPath(); ctx.moveTo(A[0], A[1] + 3); ctx.lineTo(B[0], B[1] + 3); stroke(ctx, 'rgba(255,255,255,0.025)', 1);
    }
    for (let m = -10; m <= 10; m++) {
      const x = m * 650 + 325;
      const A = cam.P(x, -9000, z), B = cam.P(x, 9000, z);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); stroke(ctx, '#151813', Math.max(1, 4 * A[3]));
    }
    ctx.restore();
  }

  function frameRing(ctx, cam, V, U, lo) {
    const o1 = ringW(cam, V, FR1, 0, U), o0 = ringW(cam, V, FR0, 0, U), ctr = cam.P(V.cx, V.cy, V.cz), s = ctr[3];
    ctx.beginPath(); polyPath(ctx, o1); polyPath(ctx, o0);
    const [x0, y0, x1, y1] = bbox(o1);
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, C.steel3); g.addColorStop(0.5, C.steel1); g.addColorStop(1, '#0B0C0A');
    ctx.fillStyle = g; ctx.fill('evenodd');
    // lábio interno e aro externo
    const lip = ringW(cam, V, FR0 + 26, 0, U);
    ctx.beginPath(); polyPath(ctx, lip); stroke(ctx, 'rgba(255,255,255,0.07)', Math.max(1, 4 * s));
    ctx.beginPath(); polyPath(ctx, o1); stroke(ctx, rgba(C.lime, 0.55 * (V.rim ?? 1)), Math.max(1, 5 * s));
    if (!lo) {
      for (let k = 0; k < 16; k++) {     // parafusos da moldura
        const a = (k / 16) * TAU, q = cam.P(V.cx + (FR1 - 42) * Math.cos(a), V.cy + (FR1 - 42) * Math.sin(a), V.cz);
        circle(ctx, q[0], q[1], 11 * q[3]); fill(ctx, C.steel4);
        circle(ctx, q[0] - 3 * q[3], q[1] - 3 * q[3], 4 * q[3]); fill(ctx, 'rgba(255,255,255,0.18)');
      }
    }
    // encaixes das travas
    for (const a of BAR_A) {
      const c = Math.cos(a), sn = Math.sin(a), hw = 34;
      const pts = [[FR0 - 6, -hw], [FR0 + 78, -hw], [FR0 + 78, hw], [FR0 - 6, hw]].map(([r, w]) => cam.P(V.cx + r * c - w * sn, V.cy + r * sn + w * c, V.cz));
      quad(ctx, pts, '#060706');
    }
  }

  function tunnel(ctx, cam, V, U) {
    const o0 = ringW(cam, V, FR0, 0, U), far = ringW(cam, V, FR0, 1100, U), fc = cam.P(V.cx, V.cy, V.cz + 1100);
    const L = V.light ?? 1;
    ctx.save();
    ctx.beginPath(); polyPath(ctx, o0); ctx.clip();
    ctx.fillStyle = '#070806'; ctx.fillRect(0, 0, W, H);
    // paredes do túnel: anéis cada vez mais claros em direção ao fundo
    for (let k = 1; k <= 7; k++) {
      const rg = ringW(cam, V, FR0, k * 150, U);
      ctx.beginPath(); polyPath(ctx, rg); stroke(ctx, rgba(C.lime, (0.06 + 0.05 * k) * L), Math.max(1, 3 * rg[0][3]));
    }
    // o fundo aceso
    const fr = Math.max(4, FR0 * fc[3]);
    const g = ctx.createRadialGradient(fc[0], fc[1], 0, fc[0], fc[1], fr * 1.15);
    g.addColorStop(0, rgba('#FFFFFF', 0.95 * L)); g.addColorStop(0.35, rgba(C.limeL, 0.9 * L)); g.addColorStop(1, rgba(C.lime, 0.55 * L));
    ctx.beginPath(); polyPath(ctx, far); ctx.fillStyle = g; ctx.fill();
    radial(ctx, fc[0], fc[1], fr * 3.2, C.lime, 0.45 * L);
    ctx.restore();
  }

  function drawVault(ctx, cam, V) {
    const ctr = cam.P(V.cx, V.cy, V.cz), sc = ctr[3], pr = VR * sc;
    if (ctr[2] < 60) return;
    const lo = pr < 140, U = pr < 90 ? U32 : lo ? U64 : U128;
    frameRing(ctx, cam, V, U, lo);
    if (V.open > 0.002 || (V.light ?? 0) > 0) tunnel(ctx, cam, V, U);
    // fresta acesa entre a porta e a moldura
    if ((V.light ?? 0) > 0 && V.open < 0.4) {
      const gap = ringW(cam, V, VR + 9, 0, U);
      ctx.save(); ctx.shadowColor = rgba(C.lime, 0.9); ctx.shadowBlur = 40 * V.light;
      ctx.beginPath(); polyPath(ctx, gap); stroke(ctx, rgba(C.limeL, 0.9 * V.light), Math.max(1.5, 10 * sc));
      ctx.restore();
    }
    const fr = ringD(cam, V, VR, 0, U), n = U.length;
    const cosO = Math.cos(V.open), sinO = Math.sin(V.open), cc = cam.c;
    const C0 = dw(V, 0, 0, 0), facing = -sinO * (cc.x - C0[0]) - cosO * (cc.z - C0[2]) > 0;
    if (V.open > 0.002) {
      // espessura da porta (lateral), só as faces viradas para a câmera, de trás para a frente
      const bk = ringD(cam, V, VR, VT, U), qs = [];
      for (let i = 0; i < n; i++) {
        const [c, s] = U[i], j = (i + 1) % n;
        const Pw = dw(V, VR * c, VR * s, VT / 2), nx = c * cosO, nz = -c * sinO, ny = s;
        if (nx * (cc.x - Pw[0]) + ny * (cc.y - Pw[1]) + nz * (cc.z - Pw[2]) <= 0) continue;
        qs.push({ pts: [fr[i], fr[j], bk[j], bk[i]], z: fr[i][2] + bk[i][2], shade: 0.5 + 0.5 * (c * 0.6 - s * 0.8) });
      }
      qs.sort((a, b) => b.z - a.z);
      for (const q of qs) { quad(ctx, q.pts, mix('#0E100D', '#3B4235', q.shade)); }
      if (!facing) { ctx.beginPath(); polyPath(ctx, bk); fill(ctx, '#121410'); return; }
    }
    if (!facing) return;
    // face da porta: aço escovado
    const [x0, y0, x1, y1] = bbox(fr);
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#363C31'); g.addColorStop(0.45, '#1C1F19'); g.addColorStop(1, '#0D0F0C');
    ctx.beginPath(); polyPath(ctx, fr); ctx.fillStyle = g; ctx.fill();
    // ranhuras concêntricas (chanfros)
    for (const [r, col, lw] of [[VR - 6, 'rgba(255,255,255,0.10)', 3], [VR - 38, '#090A08', 6], [VR - 44, 'rgba(255,255,255,0.08)', 2], [VR - 205, '#090A08', 5], [VR - 211, 'rgba(255,255,255,0.07)', 2]]) {
      const rg = ringD(cam, V, r, -1, U);
      ctx.beginPath(); polyPath(ctx, rg); stroke(ctx, col, Math.max(1, lw * sc));
    }
    // brilho de luz rasante
    ctx.save(); ctx.beginPath(); polyPath(ctx, fr); ctx.clip();
    const hl = ctx.createLinearGradient(x0, y1, x1, y0);
    hl.addColorStop(0.3, 'rgba(255,255,255,0)'); hl.addColorStop(0.5, 'rgba(255,255,255,0.06)'); hl.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
    if (!lo) {
      for (let k = 0; k < 32; k++) {   // rebites do aro
        const a = (k / 32) * TAU, q = pd(cam, V, (VR - 21) * Math.cos(a), (VR - 21) * Math.sin(a), -2);
        circle(ctx, q[0], q[1], 6.5 * q[3]); fill(ctx, C.steel5);
      }
    }
    // travas radiais (limão): saem para dentro da moldura quando o cofre está trancado
    BAR_A.forEach((a, k) => {
      const b = typeof V.bars === 'function' ? V.bars(k) : V.bars;
      const r0 = lerp(VR - 150, VR - 250, b), r1 = lerp(VR + 66, VR - 40, b), hw = 25, c = Math.cos(a), s = Math.sin(a);
      const P4 = (r, w) => pd(cam, V, r * c - w * s, r * s + w * c, -6);
      quad(ctx, [P4(r0, -hw), P4(r1, -hw), P4(r1, hw), P4(r0, hw)], mix(C.limeDeep, C.lime, 0.7 + 0.3 * (V.glow ?? 0)));
      quad(ctx, [P4(r0, -hw), P4(r1, -hw), P4(r1, -hw * 0.25), P4(r0, -hw * 0.25)], rgba('#FFFFFF', 0.22));
      quad(ctx, [P4(r1 - 18, -hw), P4(r1, -hw), P4(r1, hw), P4(r1 - 18, hw)], C.limeDeep);
    });
    // volante de 3 raios (atrás do segredo)
    const hubC = pd(cam, V, 0, 0, -60);
    for (let k = 0; k < 3; k++) {
      const a = V.wheel + (k / 3) * TAU, A = pd(cam, V, 150 * Math.cos(a), 150 * Math.sin(a), -60), B = pd(cam, V, 318 * Math.cos(a), 318 * Math.sin(a), -60);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); stroke(ctx, C.steel4, Math.max(2, 34 * hubC[3]));
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); stroke(ctx, 'rgba(255,255,255,0.16)', Math.max(1, 8 * hubC[3]));
      const kn = ringD(cam, V, 36, -66, U20, 318 * Math.cos(a), 318 * Math.sin(a));
      ctx.beginPath(); polyPath(ctx, kn); fill(ctx, C.steel5);
      ctx.beginPath(); polyPath(ctx, kn); stroke(ctx, rgba(C.lime, 0.7), Math.max(1, 4 * hubC[3]));
    }
    // o segredo (disco numerado que gira)
    const dial = ringD(cam, V, 150, -30, U);
    ctx.beginPath(); polyPath(ctx, dial); fill(ctx, '#0B0C0A');
    ctx.beginPath(); polyPath(ctx, dial); stroke(ctx, C.lime, Math.max(1, 5 * sc));
    const dc = pd(cam, V, 0, 0, -30), hub = V.hub ?? 0;
    if ((!lo || pr > 60) && hub < 0.6) {
      for (let j = 0; j < 100; j++) {
        const a = V.dial + (j / 100) * TAU, r0 = j % 10 === 0 ? 104 : j % 5 === 0 ? 118 : 126;
        const A = pd(cam, V, r0 * Math.cos(a), r0 * Math.sin(a), -31), B = pd(cam, V, 144 * Math.cos(a), 144 * Math.sin(a), -31);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
        stroke(ctx, j % 10 === 0 ? C.lime : 'rgba(220,230,210,0.55)', Math.max(0.8, (j % 10 === 0 ? 4 : 2) * sc));
      }
      if (!lo && V.open < 0.25 && hub < 1) {
        for (let j = 0; j < 10; j++) {
          const a = V.dial + (j / 10) * TAU, q = pd(cam, V, 84 * Math.cos(a), 84 * Math.sin(a), -31);
          ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(a + Math.PI / 2 + (cam.c.roll || 0));
          txt(ctx, String(j * 10), 0, 8 * q[3], { size: 21 * q[3], weight: 800, color: 'rgba(230,236,220,0.85)', align: 'center', alpha: 1 - hub });
          ctx.restore();
        }
      }
    }
    // marcador fixo do segredo
    const m0 = pd(cam, V, -12, -172, -28), m1 = pd(cam, V, 12, -172, -28), m2 = pd(cam, V, 0, -152, -28);
    quad(ctx, [m0, m1, m2], C.lime);
    if (hub > 0) {
      // no fim, o centro do cofre é a logo oficial
      logo(ctx, dc[0], dc[1], 2 * 162 * dc[3] * E.outBack(clamp(hub), 2.2), clamp(hub * 3));
    } else {
      const cap = ringD(cam, V, 46, -36, U32);
      ctx.beginPath(); polyPath(ctx, cap); fill(ctx, C.steel3);
      ctx.beginPath(); polyPath(ctx, cap); stroke(ctx, rgba(C.lime, 0.8), Math.max(1, 4 * sc));
    }
  }

  // ---------------------------------------------------------------- estado do cofre ao longo do filme
  const UNLOCK = 2.5, LOCK = 21.0;
  const dialSteps = [];                                  // o segredo gira em semicolcheias no gancho
  for (let t = 0; t < 2.4 - 1e-6; t += S16) dialSteps.push(t);
  function dialAngle(t) {
    let a = 0;
    dialSteps.forEach((t0, i) => { const dir = i < 7 ? 1 : i < 13 ? -1 : 1; a += dir * 0.21 * E.outCubic(p(t, t0, t0 + 0.08)); });
    return a - 0.6 + 0.04 * Math.sin(t * 0.7);
  }
  // trancamento: 4 pares de travas opostas, em semicolcheias
  const lockAt = (k) => LOCK + (k % 4) * S16;
  const unlockAt = (k) => UNLOCK + k * S16;
  function vaultState(t) {
    const V = { cx: 0, cy: 0, cz: 0, open: 0, light: 0, wheel: 0, dial: dialAngle(Math.min(t, 2.5)), hub: 0, glow: 0, rim: 1 };
    if (t < T.lock) {
      V.bars = (k) => E.inOutCubic(p(t, unlockAt(k), unlockAt(k) + 0.11));
      V.wheel = -0.4 + 2 * TAU * E.inOutCubic(p(t, 2.35, 3.45));
      V.open = 0.06 * E.inOutSine(p(t, 3.5, 3.92)) + (1.82 - 0.06) * E.outQuart(p(t, T.drop, T.drop + 0.62));
      V.light = 0.75 * E.outCubic(p(t, 3.45, 3.9)) + 0.25 * p(t, T.drop, T.drop + 0.3);
    } else {
      V.bars = (k) => 1 - E.inOutCubic(p(t, lockAt(k), lockAt(k) + 0.1));
      V.wheel = 2 * TAU - 2 * TAU * E.inOutCubic(p(t, LOCK, LOCK + 0.9));
      V.open = 1.82 * (1 - E.inCubic(p(t, LOCK - 0.42, LOCK)));
      V.light = 1 - E.outCubic(p(t, LOCK - 0.1, LOCK + 0.2));
      V.dial = -0.6 + TAU * 0.5 * E.outCubic(p(t, LOCK + 0.2, LOCK + 1.4)) + 0.25 * E.inOutSine(p(t, T.finale - 0.4, T.finale + 0.8));
      V.hub = E.outCubic(p(t, T.finale, T.finale + 0.5));
      V.glow = kick(t, LOCK, 0.6) + kick(t, T.finale, 1.2) + (t > T.finale + 1 ? 0.35 * kick(t, Math.floor(t / BT) * BT, 0.3) : 0);
    }
    return V;
  }
  // câmeras do cofre
  const CAM_OPEN = [
    { t: 0, x: 120, y: -70, z: -540, roll: 0.14, yaw: -0.05, f: 1400, sx: 540, sy: 1230 },
    { t: 1.55, x: 70, y: -40, z: -780, roll: 0.09, yaw: -0.03, f: 1400, sx: 540, sy: 1230, e: (x) => x },
    { t: 2.45, x: 0, y: 0, z: -2080, roll: 0, yaw: 0, f: 1400, sx: 540, sy: 1180 },
    { t: 3.95, x: 0, y: 0, z: -1900, roll: 0, yaw: 0, f: 1400, sx: 540, sy: 1180, e: E.inOutSine },
    { t: 4.95, x: 0, y: 0, z: 650, roll: -0.08, yaw: 0, f: 1400, sx: 540, sy: 1080, e: E.inCubic },
  ];
  const WALL_COLS = [-1320, 0, 1320], WALL_ROWS = [-2760, -1380, 0, 1380, 2760];
  const CAM_CLOSE = [
    { t: T.lock, x: 0, y: 0, z: -2150, roll: 0, f: 1400, sx: 540, sy: 1040 },
    { t: T.history, x: 0, y: 0, z: -2080, roll: 0, f: 1400, sx: 540, sy: 1040, e: E.inOutSine },
    { t: T.history + 1.15, x: 0, y: -60, z: -6300, roll: 0, f: 1400, sx: 540, sy: 1060, e: E.inOutCubic },
    { t: T.finale - 0.65, x: 0, y: -60, z: -6050, roll: 0, f: 1400, sx: 540, sy: 1060, e: (x) => x },
    { t: T.finale - 0.12, x: 0, y: 0, z: -2280, roll: 0, f: 1400, sx: 540, sy: 905, e: E.inOutCubic },
    { t: DURATION, x: 0, y: 0, z: -2160, roll: 0, f: 1400, sx: 540, sy: 905, e: E.inOutSine },
  ];
  function shake(t, t0, amp) { const k = kick(t, t0, 0.35); return [Math.sin(t * 91) * amp * k, Math.cos(t * 77) * amp * k]; }

  // =====================================================================
  // PAINEL DE PALHETAS (split-flap)
  // =====================================================================
  const FLAP_SET = ' 0123456789';
  function flapSeq(a, b, loops = 0) {
    const ia = FLAP_SET.indexOf(a), ib = FLAP_SET.indexOf(b);
    if (ia < 0 || ib < 0) return a === b ? [a] : [a, b];
    if (ia === 0 && ib === 0) return [a];
    let n = (ib - ia + FLAP_SET.length) % FLAP_SET.length;
    if (n === 0 && !loops) return [a];
    n += loops * FLAP_SET.length;
    const seq = [a];
    for (let k = 1, i = ia; k <= n; k++) { i = (i + 1) % FLAP_SET.length; seq.push(FLAP_SET[i]); }
    return seq;
  }
  /** track: {n, keys: [{t, s, fd?, stagger?, loops?}]} — a primeira chave é o estado inicial */
  function flapState(track, i, t) {
    const pad = (s) => s.padStart(track.n, ' ');
    let ch = pad(track.keys[0].s)[i];
    for (let k = 1; k < track.keys.length; k++) {
      const K = track.keys[k], tgt = pad(K.s)[i], seq = flapSeq(ch, tgt, K.loops || 0);
      const t0 = K.t + (K.stagger ?? 0.035) * (K.rtl ? track.n - 1 - i : i), fd = K.fd ?? 0.045;
      if (t < t0) return { cur: ch, next: ch, f: 0 };
      const el = (t - t0) / fd, nn = seq.length - 1;
      if (el < nn) { const j = Math.floor(el); return { cur: seq[j], next: seq[j + 1], f: el - j }; }
      ch = tgt;
    }
    return { cur: ch, next: ch, f: 0 };
  }
  function flapClicks(track) {
    const out = [], pad = (s) => s.padStart(track.n, ' ');
    let cur = pad(track.keys[0].s).split('');
    for (let k = 1; k < track.keys.length; k++) {
      const K = track.keys[k], tgt = pad(K.s);
      for (let i = 0; i < track.n; i++) {
        const seq = flapSeq(cur[i], tgt[i], K.loops || 0), t0 = K.t + (K.stagger ?? 0.035) * (K.rtl ? track.n - 1 - i : i), fd = K.fd ?? 0.045;
        for (let j = 1; j < seq.length; j++) out.push(Math.round((t0 + j * fd) * 1000) / 1000);
        cur[i] = tgt[i];
      }
    }
    return out.sort((a, b) => a - b);
  }
  function flapHalf(ctx, ch, x, y, w, h, top, sy, o, shade) {
    const hh = h / 2, hy = y + hh;
    ctx.save();
    ctx.translate(0, hy); ctx.scale(1, Math.max(0.001, sy)); ctx.translate(0, -hy);
    ctx.beginPath(); ctx.rect(x, top ? y : hy, w, hh); ctx.clip();
    rr(ctx, x, y, w, h, Math.min(10, w * 0.14)); fill(ctx, top ? o.bgT : o.bgB);
    if (ch !== ' ') { setFont(ctx, MONO, h * 0.7, 800, 'center', 0); ctx.fillStyle = o.color; ctx.fillText(ch, x + w / 2, y + h * 0.5 + h * 0.255); }
    if (shade > 0) { ctx.fillStyle = `rgba(0,0,0,${shade})`; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
  function flapCard(ctx, st, x, y, w, h, o) {
    const hh = h / 2;
    flapHalf(ctx, st.f > 0 ? st.next : st.cur, x, y, w, h, true, 1, o, 0);
    flapHalf(ctx, st.cur, x, y, w, h, false, 1, o, 0);
    if (st.f > 0 && st.f < 0.5) flapHalf(ctx, st.cur, x, y, w, h, true, Math.cos(st.f * Math.PI), o, st.f * 0.7);
    else if (st.f >= 0.5) flapHalf(ctx, st.next, x, y, w, h, false, -Math.cos(st.f * Math.PI), o, (1 - st.f) * 0.6);
    ctx.fillStyle = '#050605'; ctx.fillRect(x, y + hh - 1.5, w, 3);
    ctx.fillStyle = C.steel4; ctx.fillRect(x - 3, y + hh - 6, 5, 12); ctx.fillRect(x + w - 2, y + hh - 6, 5, 12);
  }
  /** desenha a fileira; x = borda direita (alinhado à direita) */
  function flapRow(ctx, track, t, xr, y, o) {
    const w = o.w || 66, h = o.h || 100, gap = o.gap ?? 8, n = track.n;
    const x0 = xr - n * w - (n - 1) * gap;
    const sty = { bgT: o.bgT || '#1F231C', bgB: o.bgB || '#171A15', color: o.color || C.white };
    for (let i = 0; i < n; i++) {
      const st = flapState(track, i, t);
      if (o.skipBlank && st.cur === ' ' && st.next === ' ') continue;
      flapCard(ctx, st, x0 + i * (w + gap), y - h / 2, w, h, typeof o.colorAt === 'function' ? Object.assign({}, sty, { color: o.colorAt(i, st) }) : sty);
    }
    return x0;
  }

  // =====================================================================
  // DADOS (sessão de demonstração do app: abertura R$ 300; 3 movimentos)
  // =====================================================================
  const ENTRIES = [
    { tube: 0, time: '08:45', tag: 'LANÇAMENTO MANUAL', tagBg: '#2A2D27', tagFg: '#D9DBD3', desc: 'Padaria · insumos do café da manhã', short: 'Padaria · café da manhã', v: -45, method: 'DINHEIRO' },
    { tube: 1, time: '10:15', tag: 'CHECK-OUT / CONSUMOS', tagBg: '#3A2D0E', tagFg: C.checkout, desc: 'Pagamento de comanda', short: 'Pagamento de comanda', v: 85, method: 'PIX' },
    { tube: 2, time: '14:30', tag: 'CHECK-IN / DIÁRIAS', tagBg: '#0F2242', tagFg: '#7FB0FF', desc: 'Pagamento de hospedagem', short: 'Pagamento de hospedagem', v: 1440, method: 'PIX' },
  ];
  const ARRIVE = [T.flow + 1.0, T.flow + 2.5, T.flow + 4.0];      // 9,0 · 10,5 · 12,0 s
  const TRAVEL = 0.55;

  // =====================================================================
  // FUNDO DAS CENAS ESCURAS (dentro do cofre)
  // =====================================================================
  function bgDark(ctx, t, o = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0E100D'); g.addColorStop(1, '#040504');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    radial(ctx, o.gx ?? 540, o.gy ?? 820, 1050, C.lime, o.glow ?? 0.08);
    // feixes de luz vindos da porta aberta (alto, à esquerda)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const x = -200 + k * 260 + Math.sin(t * 0.4 + k) * 30, w = 160 + k * 60;
      const lg = ctx.createLinearGradient(x, 0, x + 900, H);
      lg.addColorStop(0, rgba(C.lime, 0.05)); lg.addColorStop(1, rgba(C.lime, 0));
      ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x + w, -50); ctx.lineTo(x + w + 1100, H + 50); ctx.lineTo(x + 1100, H + 50); ctx.closePath();
      ctx.fillStyle = lg; ctx.fill();
    }
    ctx.restore();
    // poeira dourada no feixe
    for (let i = 0; i < 60; i++) {
      const sp = 10 + hash(i, 3) * 30, x = (hash(i, 4) * W + Math.sin(t * 0.6 + i) * 24 + t * 12) % W, y = (hash(i, 5) * H + t * sp) % H;
      circle(ctx, x, y, 1.2 + hash(i, 6) * 2.4); fill(ctx, rgba(C.limeL, 0.08 + 0.18 * hash(i, 7)));
    }
  }
  // persiana metálica: 12 lâminas que fecham (u 0→1) a partir do centro de cada faixa
  function shutter(ctx, u, color = '#1E221B') {
    if (u <= 0) return;
    const n = 12, h = H / n;
    for (let i = 0; i < n; i++) {
      const v = E.inOutCubic(clamp(u * 1.45 - (i % 2 ? 0.06 : 0) - Math.abs(i - 5.5) * 0.012));
      if (v <= 0) continue;
      const hh = h * v + 1;
      const y0 = i * h + (h - hh) / 2, g = ctx.createLinearGradient(0, y0, 0, y0 + hh);
      g.addColorStop(0, '#2C3127'); g.addColorStop(0.5, color); g.addColorStop(1, '#111310');
      ctx.fillStyle = g; ctx.fillRect(0, y0, W, hh);
      ctx.fillStyle = rgba(C.lime, 0.55); ctx.fillRect(0, y0, W, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, y0 + 5, W, 2);
    }
  }

  // =====================================================================
  // 1 · GANCHO (0–4 s) e DROP: o cofre destrava e abre
  // =====================================================================
  function sceneVaultOpen(ctx, t) {
    const c = camAt(CAM_OPEN, t), [shx, shy] = shake(t, T.drop, 14);
    c.sx += shx; c.sy += shy;
    const cam = makeCam(c), V = vaultState(t);
    drawWall(ctx, cam);
    // sombra e luz em volta da porta
    const ct = cam.P(0, 0, 0);
    radial(ctx, ct[0], ct[1], VR * ct[3] * 2.4, C.lime, 0.06 + 0.25 * V.light);
    drawVault(ctx, cam, V);
    // vazamento de luz quando a porta abre
    if (V.open > 0.05) radial(ctx, ct[0] + VR * ct[3] * 0.3, ct[1], VR * ct[3] * 3, C.lime, 0.25 * clamp(V.open));
    // a pergunta (com véu escuro no topo para ler sobre o metal)
    const out = p(t, 3.3, 3.62), veil = ctx.createLinearGradient(0, 160, 0, 820);
    veil.addColorStop(0, 'rgba(5,6,5,0.9)'); veil.addColorStop(0.6, 'rgba(5,6,5,0.6)'); veil.addColorStop(1, 'rgba(5,6,5,0)');
    ctx.save(); ctx.globalAlpha *= 1 - p(t, 3.3, 3.9); ctx.fillStyle = veil; ctx.fillRect(0, 0, W, 820); ctx.restore();
    lines(ctx, t, [
      { segs: [{ s: 'O caixa' }], t: 0.05 },
      { segs: [{ s: 'bateu?', color: C.lime }], t: 0.3 },
    ], { y: 470, size: 178, lh: 172, tout: 3.3 });
    typeText(ctx, 'FIM DO EXPEDIENTE', 540, 300, p(t, 0.5, 0.95) * (1 - out), { size: 30, weight: 800, color: C.grayL, ls: 8, align: 'center' });
    // entrando na luz
    const fl = E.inCubic(p(t, 4.45, 4.9));
    if (fl > 0) { ctx.fillStyle = rgba(C.lime, fl); ctx.fillRect(0, 0, W, H); radial(ctx, 540, 960, 900, '#FFFFFF', 0.5 * fl * (1 - p(t, 4.75, 5))); }
  }

  // =====================================================================
  // 2 · TÍTULO (4,5–6 s): Controle de Caixa
  // =====================================================================
  function sceneTitle(ctx, t) {
    ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W, H);
    // gravação de precisão: escala de segredo gigante girando
    const a0 = (t - T.title) * 0.35;
    ctx.save(); ctx.translate(1180, 1720); ctx.rotate(a0);
    for (let j = 0; j < 180; j++) {
      const a = (j / 180) * TAU, r1 = 1180, r0 = j % 10 === 0 ? 1080 : j % 5 === 0 ? 1120 : 1150;
      ctx.beginPath(); ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a)); ctx.lineTo(r1 * Math.cos(a), r1 * Math.sin(a));
      stroke(ctx, rgba(C.limeDeep, j % 10 === 0 ? 0.55 : 0.3), j % 10 === 0 ? 5 : 3);
    }
    for (const r of [1000, 1010, 760]) { circle(ctx, 0, 0, r); stroke(ctx, rgba(C.limeDeep, 0.3), 3); }
    ctx.restore();
    const wIn = (t0) => E.outExpo(p(t, t0, t0 + 0.32));
    const word = (s, y, t0, size) => {
      const u = wIn(t0);
      if (u <= 0) return;
      ctx.save(); ctx.translate(540, y); ctx.scale(lerp(1.5, 1, u), lerp(1.5, 1, u)); ctx.globalAlpha *= clamp(u * 2.5);
      txt(ctx, s, 0, 0, { fam: DISPLAY, size, weight: 900, color: C.ink, align: 'center', ls: -size * 0.045 });
      ctx.restore();
    };
    typeText(ctx, 'FAZLO HOSPEDA', 540, 640, p(t, T.title - 0.1, T.title + 0.3), { size: 34, weight: 800, color: C.ink, ls: 10, align: 'center' });
    word('CONTROLE', 866, T.title + 0.05, 180);
    word('DE CAIXA.', 1044, T.title + 0.3, 180);
    const bar = E.outCubic(p(t, T.title + 0.5, T.title + 0.9));
    ctx.fillStyle = C.ink; ctx.fillRect(540 - 300 * bar, 1118, 600 * bar, 8);
    typeText(ctx, 'ABERTURA · LANÇAMENTOS · CONFERÊNCIA · FECHAMENTO', 540, 1188, p(t, T.title + 0.6, T.title + 1.0), { size: 23, weight: 800, color: C.ink, ls: 2.5, align: 'center' });
  }

  // =====================================================================
  // A GAVETA (3D) — usada na abertura e no saldo esperado
  // =====================================================================
  const DRW = { w: 860, h: 230, d: 540, cab: 640 };
  const CAM_DRAWER = { x: 0, y: -1320, z: -1080, pitch: 0.86, f: 1330, sx: 540, sy: 1400 };
  function drawDrawer(ctx, t, out, o = {}) {
    const cam = makeCam(Object.assign({}, CAM_DRAWER, o.cam || {})), P = cam.P;
    const zf = lerp(DRW.cab - 40, 0, out), zb = zf + DRW.d, x0 = -DRW.w / 2, x1 = DRW.w / 2, yT = -DRW.h / 2, yB = DRW.h / 2;
    const zc = (z) => Math.min(z, DRW.cab);
    // gabinete: tampo e frente com a abertura
    const cx0 = x0 - 140, cx1 = x1 + 140, cyT = yT - 90, cyB = yB + 60;
    quad(ctx, [P(cx0, cyT, DRW.cab), P(cx1, cyT, DRW.cab), P(cx1, cyT, DRW.cab + 900), P(cx0, cyT, DRW.cab + 900)], '#151813');
    ctx.beginPath();
    polyPath(ctx, [P(cx0, cyT, DRW.cab), P(cx1, cyT, DRW.cab), P(cx1, cyB, DRW.cab), P(cx0, cyB, DRW.cab)]);
    polyPath(ctx, [P(x0 - 6, yT - 6, DRW.cab), P(x0 - 6, yB + 6, DRW.cab), P(x1 + 6, yB + 6, DRW.cab), P(x1 + 6, yT - 6, DRW.cab)]);
    ctx.fillStyle = C.steel2; ctx.fill('evenodd');
    quad(ctx, [P(x0 - 6, yT - 6, DRW.cab), P(x1 + 6, yT - 6, DRW.cab), P(x1 + 6, yB + 6, DRW.cab), P(x0 - 6, yB + 6, DRW.cab)], '#040504');
    const a = P(cx0, cyT, DRW.cab), b = P(cx1, cyT, DRW.cab);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); stroke(ctx, rgba(C.lime, 0.5), 3);
    if (zf >= DRW.cab - 2) return cam;
    // gaveta: piso, divisórias, cédulas e moedas (só a parte para fora do gabinete)
    const fy = yB - 14;
    quad(ctx, [P(x0 + 14, fy, zf + 14), P(x1 - 14, fy, zf + 14), P(x1 - 14, fy, zc(zb - 14)), P(x0 + 14, fy, zc(zb - 14))], '#0B0D0A');
    // paredes internas
    quad(ctx, [P(x0 + 14, yT, zf + 14), P(x0 + 14, fy, zf + 14), P(x0 + 14, fy, zc(zb)), P(x0 + 14, yT, zc(zb))], '#1A1D17');
    quad(ctx, [P(x1 - 14, yT, zf + 14), P(x1 - 14, fy, zf + 14), P(x1 - 14, fy, zc(zb)), P(x1 - 14, yT, zc(zb))], '#1A1D17');
    const zm = zf + 290;
    // cédulas (fundo da gaveta): 4 compartimentos
    for (let k = 0; k < 4; k++) {
      const bx0 = x0 + 30 + k * ((DRW.w - 60) / 4), bx1 = bx0 + (DRW.w - 60) / 4 - 26;
      for (let s = 0; s < 6; s++) {
        const yy = fy - 4 - s * 7, inset = 14 + (s % 2) * 6;
        if (zc(zb - 30) <= zm + 20) continue;
        quad(ctx, [P(bx0 + inset, yy, zm + 20), P(bx1 - inset, yy, zm + 20), P(bx1 - inset, yy, zc(zb - 30)), P(bx0 + inset, yy, zc(zb - 30))],
          mix(C.olive, C.lime, 0.35 + 0.12 * s + 0.1 * (k % 2)));
      }
      const band = [P((bx0 + bx1) / 2 - 22, fy - 46, zm + 20), P((bx0 + bx1) / 2 + 22, fy - 46, zm + 20), P((bx0 + bx1) / 2 + 22, fy - 46, zc(zb - 30)), P((bx0 + bx1) / 2 - 22, fy - 46, zc(zb - 30))];
      if (zc(zb - 30) > zm + 20) quad(ctx, band, '#E8EDE0');
    }
    // moedas (frente da gaveta): 5 copos
    for (let k = 0; k < 5; k++) {
      const cx = x0 + 100 + k * ((DRW.w - 200) / 4), cz = zf + 150;
      if (cz > DRW.cab) continue;
      const cup = U32.map(([c, s]) => P(cx + 74 * c, fy, cz + 74 * s));
      ctx.beginPath(); polyPath(ctx, cup); fill(ctx, '#121510');
      ctx.beginPath(); polyPath(ctx, cup); stroke(ctx, C.steel3, 3);
      for (let s = 0; s < 5; s++) {
        const coin = U20.map(([c, sn]) => P(cx + (40 - s * 2) * c + (s % 2) * 8, fy - 6 - s * 9, cz + (40 - s * 2) * sn - s * 6));
        ctx.beginPath(); polyPath(ctx, coin); fill(ctx, mix(C.limeDeep, C.limeL, 0.3 + 0.12 * s));
        ctx.beginPath(); polyPath(ctx, coin); stroke(ctx, rgba(C.ink, 0.5), 2);
      }
    }
    // divisória entre cédulas e moedas
    quad(ctx, [P(x0 + 14, yT + 40, zm), P(x1 - 14, yT + 40, zm), P(x1 - 14, fy, zm), P(x0 + 14, fy, zm)], 'rgba(30,34,27,0.9)');
    // frente da gaveta
    quad(ctx, [P(x0, yT, zf), P(x1, yT, zf), P(x1, yT, zf + 14), P(x0, yT, zf + 14)], C.steel4);
    const fA = P(x0, yT, zf), fB = P(x1, yB, zf);
    const g = ctx.createLinearGradient(fA[0], fA[1], fB[0], fB[1]);
    g.addColorStop(0, '#2F342A'); g.addColorStop(1, '#141612');
    ctx.beginPath(); polyPath(ctx, [P(x0, yT, zf), P(x1, yT, zf), P(x1, yB, zf), P(x0, yB, zf)]); ctx.fillStyle = g; ctx.fill();
    const h0 = P(-150, -8, zf - 24), h1 = P(150, -8, zf - 24);
    ctx.beginPath(); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); stroke(ctx, C.lime, 22 * h0[3]);
    ctx.beginPath(); ctx.moveTo(h0[0], h0[1] - 4); ctx.lineTo(h1[0], h1[1] - 4); stroke(ctx, 'rgba(255,255,255,0.35)', 4 * h0[3]);
    return cam;
  }

  // =====================================================================
  // 3 · ABERTURA DA SESSÃO (6–8 s)
  // =====================================================================
  const TRK_OPEN = { n: 9, keys: [{ t: 0, s: '' }, { t: T.open + 0.62, s: 'R$ 300,00', fd: 0.042, stagger: 0.03 }] };
  function sceneOpen(ctx, t) {
    bgDark(ctx, t, { gy: 900 });
    const out = E.outBack(p(t, T.open + 0.08, T.open + 0.45), 1.2);
    drawDrawer(ctx, t, out);
    const tout = T.flow - 0.3;
    typeText(ctx, 'ABERTURA DE CAIXA', 540, 290, p(t, T.open + 0.05, T.open + 0.4) * (1 - p(t, tout, tout + 0.2)), { size: 30, weight: 800, color: C.lime, ls: 8, align: 'center' });
    riseLine(ctx, [{ s: 'Abra a sessão' }], 540, 410, p(t, T.open + 0.1, T.open + 0.5), p(t, tout, tout + 0.3), { size: 110, color: C.white, align: 'center' });
    riseLine(ctx, [{ s: 'com o saldo inicial da gaveta.' }], 540, 486, p(t, T.open + 0.35, T.open + 0.75), p(t, tout + 0.04, tout + 0.34), { size: 50, weight: 700, color: C.grayL, align: 'center', ls: -0.6 });
    // status da sessão
    const st = E.outBack(p(t, T.open + 1.4, T.open + 1.65), 2.4);
    pill(ctx, 540, 590, 'ABERTO · 08:00', { size: 28, bg: 'rgba(76,192,103,0.16)', border: 'rgba(76,192,103,0.7)', color: '#7BE296', dot: '#4CC067', scale: st });
    // valor inicial no painel de palhetas
    const pa = E.outCubic(p(t, T.open + 0.4, T.open + 0.7));
    if (pa > 0) {
      ctx.save(); ctx.globalAlpha *= pa; ctx.translate(0, (1 - pa) * 40);
      txt(ctx, 'SALDO INICIAL', 540, 712, { size: 26, weight: 800, color: C.grayL, ls: 6, align: 'center' });
      flapRow(ctx, TRK_OPEN, t, 540 + (9 * 74 - 8) / 2, 812, { w: 66, h: 104 });
      ctx.restore();
    }
  }

  // =====================================================================
  // 4 · O FLUXO (8–14 s): tubos pneumáticos levam cada lançamento ao diário
  // =====================================================================
  const HUB = { x: 540, y: 690, r: 98 };
  const TUBE_X = [165, 540, 915];
  const TUBE_LABEL = [['LANÇAMENTO', 'MANUAL'], ['CHECK-OUT', 'COMANDA'], ['CHECK-IN', 'HOSPEDAGEM']];
  let TUBES = null;
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
  function makePath(poly, step = 4) {
    const cum = [0];
    for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
    const L = cum[cum.length - 1], P = [];
    let j = 0;
    for (let s = 0; s <= L; s += step) {
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const f = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
      P.push([lerp(poly[j][0], poly[j + 1][0], f), lerp(poly[j][1], poly[j + 1][1], f)]);
    }
    const Tn = P.map((_, i) => {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return [dx / l, dy / l];
    });
    return { P, T: Tn, L, step };
  }
  function buildTubes() {
    const end = (k) => { const a = [-2.35, -Math.PI / 2, -0.79][k]; return [HUB.x + (HUB.r - 6) * Math.cos(a), HUB.y + (HUB.r - 6) * Math.sin(a)]; };
    TUBES = [
      makePath(catmull([[165, -160], [165, 200], [165, 410], [215, 520], [330, 575], end(0)], 18)),
      makePath(catmull([[540, -160], [540, 200], [540, 440], end(1)], 18)),
      makePath(catmull([[915, -160], [915, 200], [915, 410], [865, 520], [750, 575], end(2)], 18)),
    ];
  }
  function offsetLine(ctx, path, d, s0 = 0, s1 = Infinity) {
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < path.P.length; i += 2) {
      const s = i * path.step;
      if (s < s0 || s > s1) continue;
      const [x, y] = path.P[i], [tx, ty] = path.T[i], q = [x - ty * d, y + tx * d];
      if (first) { ctx.moveTo(q[0], q[1]); first = false; } else ctx.lineTo(q[0], q[1]);
    }
  }
  function tubePath(ctx, path) { ctx.beginPath(); ctx.moveTo(path.P[0][0], path.P[0][1]); for (let i = 2; i < path.P.length; i += 2) ctx.lineTo(path.P[i][0], path.P[i][1]); ctx.lineTo(path.P[path.P.length - 1][0], path.P[path.P.length - 1][1]); }
  function drawTube(ctx, path, glow, capsules) {
    ctx.save();
    tubePath(ctx, path); ctx.shadowColor = rgba(C.lime, 0.6); ctx.shadowBlur = 30 * glow; stroke(ctx, rgba(C.lime, 0.12 + 0.3 * glow), 104);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    tubePath(ctx, path); stroke(ctx, '#252A21', 96);
    tubePath(ctx, path); stroke(ctx, '#0A0C09', 78);
    // cápsulas dentro do vidro
    capsules.forEach((cp) => cp());
    // reflexos do vidro
    offsetLine(ctx, path, -27); stroke(ctx, 'rgba(255,255,255,0.20)', 5);
    offsetLine(ctx, path, 30); stroke(ctx, rgba(C.lime, 0.35 + 0.4 * glow), 3);
    // abraçadeiras
    for (let s = 120; s < path.L - 80; s += 230) {
      const i = Math.round(s / path.step), [x, y] = path.P[i], [tx, ty] = path.T[i];
      ctx.beginPath(); ctx.moveTo(x - ty * 60, y + tx * 60); ctx.lineTo(x + ty * 60, y - tx * 60); stroke(ctx, C.steel3, 16);
      circle(ctx, x - ty * 60, y + tx * 60, 6); fill(ctx, C.lime);
    }
    ctx.restore();
  }
  function capsule(ctx, path, s, glow) {
    const i = clamp(Math.round(s / path.step), 0, path.P.length - 1), [x, y] = path.P[i], [tx, ty] = path.T[i];
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(ty, tx));
    radial(ctx, 0, 0, 150, C.lime, 0.5 * glow + 0.25);
    rr(ctx, -82, -31, 164, 62, 31); fill(ctx, '#2C3227');
    rr(ctx, -82, -31, 164, 62, 31); stroke(ctx, 'rgba(255,255,255,0.25)', 3);
    rr(ctx, 50, -31, 32, 62, 16); fill(ctx, C.lime); rr(ctx, -82, -31, 32, 62, 16); fill(ctx, C.lime);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-46, -20, 90, 6);
    ctx.restore();
  }
  function tubeLabel(ctx, k, a) {
    const x = TUBE_X[k], y = 352, w = 248, h = 96;
    ctx.save(); ctx.globalAlpha *= a;
    rr(ctx, x - w / 2, y - h / 2, w, h, 14); fill(ctx, '#10120F');
    rr(ctx, x - w / 2, y - h / 2, w, h, 14); stroke(ctx, rgba(C.lime, 0.75), 3);
    TUBE_LABEL[k].forEach((s, j) => txt(ctx, s, x, y - 6 + j * 32, { size: 23, weight: 800, color: j ? C.white : C.lime, align: 'center', ls: 2 }));
    ctx.restore();
  }
  function entryCard(ctx, e, cx, cy, sc, a) {
    if (sc <= 0.01 || a <= 0.01) return;
    const w = 800, h = 236, x = -w / 2, y = -h / 2, pos = e.v > 0;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.globalAlpha *= a;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
    rr(ctx, x, y, w, h, 26); fill(ctx, '#131611'); ctx.restore();
    rr(ctx, x, y, w, h, 26); stroke(ctx, '#2C3128', 3);
    rr(ctx, x, y, 12, h, 6); fill(ctx, pos ? C.lime : C.out);
    // linha 1: origem e hora
    const tgw = tw(ctx, e.tag, MONO, 22, 800, 1.5) + 34;
    rr(ctx, x + 40, y + 28, tgw, 44, 10); fill(ctx, e.tagBg);
    txt(ctx, e.tag, x + 57, y + 58, { size: 22, weight: 800, color: e.tagFg, ls: 1.5 });
    clockIcon(ctx, w / 2 - 128, y + 50, 13, C.grayL, 3);
    txt(ctx, e.time, w / 2 - 36, y + 61, { size: 30, weight: 800, color: C.grayL, align: 'right' });
    // linha 2: descrição
    txt(ctx, e.desc, x + 40, y + 124, { fam: DISPLAY, size: e.desc.length > 26 ? 38 : 44, weight: 800, color: C.white, ls: -0.8 });
    // linha 3: valor e forma de pagamento
    txt(ctx, brl(e.v, pos ? '+ ' : '− '), x + 40, y + 206, { fam: DISPLAY, size: 74, weight: 900, color: pos ? C.lime : C.out, ls: -2 });
    const mw = tw(ctx, e.method, MONO, 24, 800, 2) + 36;
    rr(ctx, w / 2 - 36 - mw, y + 156, mw, 48, 24); stroke(ctx, C.steel5, 3);
    txt(ctx, e.method, w / 2 - 36 - mw / 2, y + 188, { size: 24, weight: 800, color: C.white, align: 'center', ls: 2 });
    ctx.restore();
  }
  function entryRow(ctx, e, cx, cy, a) {
    if (a <= 0.01) return;
    const w = 800, h = 74, x = cx - w / 2, pos = e.v > 0;
    ctx.save(); ctx.globalAlpha *= a;
    rr(ctx, x, cy - h / 2, w, h, 16); fill(ctx, '#11140F');
    rr(ctx, x, cy - h / 2, 8, h, 4); fill(ctx, pos ? C.lime : C.out);
    txt(ctx, e.time, x + 30, cy + 10, { size: 26, weight: 800, color: C.gray });
    txt(ctx, e.short, x + 132, cy + 11, { fam: DISPLAY, size: 31, weight: 700, color: C.white, ls: -0.4 });
    txt(ctx, brl(e.v, pos ? '+ ' : '− '), x + w - 26, cy + 11, { size: 30, weight: 800, color: pos ? C.lime : C.out, align: 'right', ls: -0.5 });
    ctx.restore();
  }
  const TOT_T = T.flow + 4.55;                    // 12,55 s: totais
  const TRK_IN = { n: 11, keys: [{ t: 0, s: '' }, { t: TOT_T + 0.15, s: 'R$ 1.525,00', fd: 0.04, stagger: 0.028 }] };
  const TRK_OUT = { n: 8, keys: [{ t: 0, s: '' }, { t: TOT_T + 0.4, s: 'R$ 45,00', fd: 0.04, stagger: 0.028 }] };
  function sceneFlow(ctx, t) {
    bgDark(ctx, t, { gy: HUB.y, glow: 0.1 });
    // a câmera se aproxima devagar: o sistema respira
    const zm = 1 + 0.035 * E.inOutSine(p(t, T.flow, T.cash));
    ctx.save(); ctx.translate(540, 900); ctx.scale(zm, zm); ctx.translate(-540, -900);
    flowContent(ctx, t);
    ctx.restore();
    flowCopy(ctx, t);
  }
  function flowContent(ctx, t) {
    const tin = p(t, T.flow - 0.2, T.flow + 0.5);
    // tubos e cápsulas
    TUBES.forEach((path, k) => {
      const e = ENTRIES.find((q) => q.tube === k), ta = ARRIVE[ENTRIES.indexOf(e)];
      const glow = kick(t, ta - TRAVEL, 0.7) + kick(t, ta, 0.4) * 0.6;
      const caps = [];
      const u = p(t, ta - TRAVEL, ta);
      if (u > 0 && u < 1) caps.push(() => capsule(ctx, path, path.L * E.inOutCubic(u) - 40, glow));
      ctx.save(); ctx.globalAlpha *= tin;
      drawTube(ctx, path, glow, caps);
      ctx.restore();
      tubeLabel(ctx, k, E.outCubic(p(t, T.flow + 0.1 + k * 0.12, T.flow + 0.45 + k * 0.12)));
    });
    // o receptor: diário de caixa
    const hitK = ARRIVE.reduce((m, ta) => Math.max(m, kick(t, ta, 0.5)), 0);
    radial(ctx, HUB.x, HUB.y, 260, C.lime, 0.2 + 0.5 * hitK);
    circle(ctx, HUB.x, HUB.y, HUB.r + 22); fill(ctx, C.steel2);
    circle(ctx, HUB.x, HUB.y, HUB.r + 22); stroke(ctx, rgba(C.lime, 0.6 + 0.4 * hitK), 5);
    circle(ctx, HUB.x, HUB.y, HUB.r - 8); fill(ctx, mix('#0B0D0A', '#3A5410', hitK));
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU + t * 0.6;
      circle(ctx, HUB.x + (HUB.r + 8) * Math.cos(a), HUB.y + (HUB.r + 8) * Math.sin(a), 4); fill(ctx, rgba(C.lime, 0.6));
    }
    txt(ctx, 'DIÁRIO', HUB.x, HUB.y - 4, { size: 24, weight: 800, color: C.lime, align: 'center', ls: 3 });
    txt(ctx, 'DE CAIXA', HUB.x, HUB.y + 26, { size: 20, weight: 800, color: C.white, align: 'center', ls: 2 });
    // cartões: saem do receptor; o anterior desce para a lista
    const CARD_Y = 960, ROW_Y0 = 1162, ROW_H = 80;
    ENTRIES.forEach((e, i) => {
      const ta = ARRIVE[i], u = p(t, ta + 0.02, ta + 0.36);
      if (u <= 0) return;
      const tDown = i < 2 ? ARRIVE[i + 1] : TOT_T, d = E.inOutCubic(p(t, tDown, tDown + 0.38));
      if (d < 1) {
        const e1 = E.outBack(u, 1.4);
        const y = lerp(HUB.y, CARD_Y, E.outCubic(u)), sc = lerp(0.2, 1, e1);
        entryCard(ctx, e, 540, lerp(y, ROW_Y0 + i * ROW_H, d), sc * lerp(1, 0.32, d), clamp(u * 3) * (1 - d));
      }
      if (d > 0) entryRow(ctx, e, 540, ROW_Y0 + i * ROW_H + (1 - d) * -60, d);
    });
    // totais da sessão
    const ta = E.outCubic(p(t, TOT_T + 0.05, TOT_T + 0.4));
    if (ta > 0) {
      ctx.save(); ctx.globalAlpha *= ta;
      txt(ctx, 'TOTAL DE ENTRADAS', 140, 850, { size: 25, weight: 800, color: C.grayL, ls: 4 });
      flapRow(ctx, TRK_IN, t, 940, 906, { w: 60, h: 88, gap: 7, color: C.lime });
      txt(ctx, 'TOTAL DE SAÍDAS', 140, 998, { size: 25, weight: 800, color: C.grayL, ls: 4 });
      const x0 = flapRow(ctx, TRK_OUT, t, 940, 1054, { w: 60, h: 88, gap: 7, color: C.out });
      txt(ctx, '−', x0 - 26, 1076, { fam: DISPLAY, size: 66, weight: 900, color: C.out, align: 'right', alpha: p(t, TOT_T + 0.5, TOT_T + 0.7) });
      ctx.restore();
    }
  }
  function flowCopy(ctx, t) {
    const msgs = [
      { a: T.flow + 0.15, b: ARRIVE[1] - 0.25, l1: 'Entradas e saídas,', l2: 'tudo no diário de caixa.' },
      { a: ARRIVE[1] - 0.05, b: TOT_T - 0.2, l1: 'Integrado às hospedagens', l2: 'e reservas, em tempo real.' },
      { a: TOT_T, b: T.cash - 0.3, l1: 'Total de entradas e saídas,', l2: 'sempre atualizado.' },
    ];
    msgs.forEach((m) => {
      riseLine(ctx, [{ s: m.l1 }], 540, 1456, p(t, m.a, m.a + 0.4), p(t, m.b, m.b + 0.25), { size: 50, weight: 800, color: C.white, align: 'center', ls: -0.8 });
      riseLine(ctx, [{ s: m.l2 }], 540, 1516, p(t, m.a + 0.08, m.a + 0.48), p(t, m.b + 0.04, m.b + 0.29), { size: 50, weight: 800, color: C.grayL, align: 'center', ls: -0.8 });
    });
  }

  // =====================================================================
  // 5 · SALDO ESPERADO EM DINHEIRO (14–18 s)
  // =====================================================================
  const CASH_IN = T.cash + 1.55;                         // 15,55 s: a saída em dinheiro entra na conta da gaveta
  const TRK_CASH = { n: 9, keys: [{ t: 0, s: 'R$ 300,00' }, { t: CASH_IN + 0.3, s: 'R$ 255,00', fd: 0.036, stagger: 0.05, rtl: true }] };
  function sceneCash(ctx, t) {
    bgDark(ctx, t, { gy: 1000 });
    // aproximação lenta e pulso de luz no tempo: a cena nunca congela
    const zm = 1 + 0.045 * E.inOutSine(p(t, T.cash, T.close));
    ctx.save(); ctx.translate(540, 1000); ctx.scale(zm, zm); ctx.translate(-540, -1000);
    radial(ctx, 540, 1180, 620, C.lime, 0.05 + 0.06 * kick(t, Math.floor(t / BT) * BT, 0.3));
    drawDrawer(ctx, t, 1 - 0.04 * kick(t, CASH_IN + 0.25, 0.3));
    ctx.restore();
    lines(ctx, t, [
      { segs: [{ s: 'Saldo esperado' }], t: T.cash + 0.1 },
      { segs: [{ s: 'em dinheiro.', color: C.lime }], t: T.cash + 0.35 },
    ], { y: 370, size: 104, lh: 100, tout: T.close - 0.3 });
    typeText(ctx, 'ABERTURA + ENTRADAS − SAÍDAS EM DINHEIRO', 540, 532, p(t, T.cash + 0.6, T.cash + 1.0) * (1 - p(t, T.close - 0.3, T.close)), { size: 25, weight: 800, color: C.grayL, ls: 2, align: 'center' });
    // os três lançamentos: os de Pix ficam fora da gaveta; a saída em dinheiro entra na conta
    const chips = [{ e: ENTRIES[1], x: 330, y: 636 }, { e: ENTRIES[2], x: 744, y: 636 }, { e: ENTRIES[0], x: 540, y: 724 }];
    chips.forEach((c, i) => {
      const t0 = T.cash + 0.35 + i * S16, u = E.outBack(p(t, t0, t0 + 0.3), 1.6);
      if (u <= 0) return;
      const pos = c.e.v > 0, isCash = c.e.method === 'DINHEIRO';
      const dim = E.inOutCubic(p(t, T.cash + 1.05 + i * 0.06, T.cash + 1.35 + i * 0.06));
      const drop = E.inCubic(p(t, CASH_IN, CASH_IN + 0.32));
      let y = c.y, a = 1, sc = u;
      if (!isCash) { a = lerp(1, 0.38, dim); sc = u * lerp(1, 0.94, dim); }
      else { y = lerp(c.y, 1170, drop); sc = u * lerp(1, 0.55, drop); a = 1 - p(drop, 0.75, 1); }
      const label = `${brl(c.e.v, pos ? '+ ' : '− ')} · ${c.e.method}`, w = tw(ctx, label, MONO, 30, 800, 0.5) + 56;
      ctx.save(); ctx.translate(c.x, y); ctx.scale(sc, sc); ctx.globalAlpha *= a * (1 - p(t, T.close - 0.3, T.close));
      rr(ctx, -w / 2, -33, w, 66, 33); fill(ctx, isCash ? '#2A0E12' : '#151912');
      rr(ctx, -w / 2, -33, w, 66, 33); stroke(ctx, isCash ? C.out : C.steel5, 3);
      txt(ctx, label, 0, 11, { size: 30, weight: 800, color: isCash ? '#FF8A95' : C.grayL, align: 'center', ls: 0.5 });
      ctx.restore();
    });
    const nt = p(t, T.cash + 1.3, T.cash + 1.65) * (1 - p(t, T.close - 0.3, T.close));
    typeText(ctx, 'PIX NÃO PASSA PELA GAVETA', 540, 590, nt, { size: 22, weight: 800, color: C.gray, ls: 3, align: 'center' });
    // o saldo esperado
    const la = E.outCubic(p(t, T.cash + 0.2, T.cash + 0.5)) * (1 - p(t, T.close - 0.3, T.close));
    ctx.save(); ctx.globalAlpha *= la;
    const lit = p(t, CASH_IN + 0.9, CASH_IN + 1.2);
    txt(ctx, 'SALDO ESPERADO EM DINHEIRO', 540, 840, { size: 26, weight: 800, color: mix(C.grayL, C.lime, lit), ls: 4, align: 'center' });
    radial(ctx, 540, 930, 420, C.lime, 0.18 * kick(t, CASH_IN + 0.9, 0.8));
    flapRow(ctx, TRK_CASH, t, 540 + (9 * 74 - 8) / 2, 930, { w: 66, h: 104, color: mix(C.white, C.lime, lit) });
    ctx.restore();
  }

  // =====================================================================
  // 6 · CONFERÊNCIA E FECHAMENTO (18–20,35 s)
  // =====================================================================
  const KEYS = [T.close + 0.75, T.close + 1.0, T.close + 1.25, T.close + 1.5, T.close + 1.75];   // 2 5 5 0 0
  const ZERO = T.close + 2.0;                            // 20,0 s: diferença zero
  const TRK_EXP = { n: 9, keys: [{ t: 0, s: '' }, { t: T.close + 0.3, s: 'R$ 255,00', fd: 0.035, stagger: 0.025 }] };
  const TRK_CNT = { n: 9, keys: [{ t: 0, s: '' }, { t: T.close + 0.45, s: 'R$ 0,00', fd: 0.035, stagger: 0.025 },
    { t: KEYS[0], s: 'R$ 0,02', stagger: 0, fd: 0.014 }, { t: KEYS[1], s: 'R$ 0,25', stagger: 0, fd: 0.014 }, { t: KEYS[2], s: 'R$ 2,55', stagger: 0, fd: 0.014 },
    { t: KEYS[3], s: 'R$ 25,50', stagger: 0, fd: 0.014 }, { t: KEYS[4], s: 'R$ 255,00', stagger: 0, fd: 0.014 }] };
  // a diferença é recalculada a cada tecla: contado − esperado, até zerar
  const TRK_DIF = { n: 10, keys: [{ t: 0, s: '' }, { t: T.close + 0.6, s: '−R$ 255,00', fd: 0.022, stagger: 0.015 },
    { t: KEYS[0] + 0.03, s: '−R$ 254,98', stagger: 0.004, fd: 0.012 }, { t: KEYS[1] + 0.03, s: '−R$ 254,75', stagger: 0.004, fd: 0.012 }, { t: KEYS[2] + 0.03, s: '−R$ 252,45', stagger: 0.004, fd: 0.012 },
    { t: KEYS[3] + 0.03, s: '−R$ 229,50', stagger: 0.004, fd: 0.012 }, { t: ZERO - 0.2, s: 'R$ 0,00', fd: 0.018, stagger: 0.003 }] };
  function sceneClose(ctx, t) {
    bgDark(ctx, t, { gy: 1000 });
    lines(ctx, t, [
      { segs: [{ s: 'Feche o caixa' }], t: T.close + 0.05 },
      { segs: [{ s: 'com conferência.', color: C.lime }], t: T.close + 0.3 },
    ], { y: 400, size: 106, lh: 100 });
    const rows = [
      { label: 'SALDO ESPERADO', trk: TRK_EXP, y: 700, col: C.white, a: T.close + 0.2 },
      { label: 'CONTADO NA GAVETA', trk: TRK_CNT, y: 900, col: C.white, a: T.close + 0.35 },
      { label: 'DIFERENÇA', trk: TRK_DIF, y: 1100, col: C.lime, a: T.close + 0.5 },
    ];
    const z = kick(t, ZERO, 0.6);
    rows.forEach((r, i) => {
      const u = E.outCubic(p(t, r.a, r.a + 0.3));
      if (u <= 0) return;
      ctx.save(); ctx.globalAlpha *= u; ctx.translate(-(1 - u) * 60, 0);
      txt(ctx, r.label, 160, r.y - 82, { size: 26, weight: 800, color: i === 2 ? mix(C.grayL, C.lime, p(t, ZERO, ZERO + 0.1)) : C.grayL, ls: 5 });
      if (i === 2) { rr(ctx, 140, r.y - 66, 800, 132, 22); fill(ctx, rgba(C.lime, 0.06 + 0.2 * z)); rr(ctx, 140, r.y - 66, 800, 132, 22); stroke(ctx, rgba(C.lime, 0.35 + 0.6 * z), 3); }
      flapRow(ctx, r.trk, t, 920, r.y, i === 2 ? { w: 62, h: 104, gap: 7, color: t >= ZERO ? C.lime : C.out } : { w: 66, h: 104, color: r.col });
      ctx.restore();
    });
    // cursor de digitação no "contado"
    if (t > KEYS[0] - 0.4 && t < KEYS[4] + 0.2) {
      const blink = Math.floor(t * 6) % 2 === 0;
      if (blink) { ctx.fillStyle = C.lime; ctx.fillRect(926, 900 - 44, 6, 88); }
    }
    // conferido
    const ca = E.outBack(p(t, ZERO + 0.02, ZERO + 0.3), 2);
    if (ca > 0) {
      ctx.save(); ctx.translate(540, 1300); ctx.scale(ca, ca);
      const msg = 'Caixa conferido sem divergências.', mw = tw(ctx, msg, DISPLAY, 44, 800, -0.6) + 120;
      rr(ctx, -mw / 2, -46, mw, 92, 46); fill(ctx, C.lime);
      circle(ctx, -mw / 2 + 52, 0, 26); fill(ctx, C.ink);
      checkIcon(ctx, -mw / 2 + 52, 0, 26, C.lime, 6);
      txt(ctx, msg, -mw / 2 + 92, 15, { fam: DISPLAY, size: 44, weight: 800, color: C.ink, ls: -0.6 });
      ctx.restore();
    }
    radial(ctx, 540, 1100, 700, C.lime, 0.25 * z);
  }

  // =====================================================================
  // 7 · O COFRE FECHA, O HISTÓRICO, A ASSINATURA (20,35–28 s)
  // =====================================================================
  function sceneVaultClose(ctx, t) {
    const c = camAt(CAM_CLOSE, t), [shx, shy] = shake(t, LOCK, 12);
    c.sx += shx; c.sy += shy;
    const cam = makeCam(c), V = vaultState(t);
    drawWall(ctx, cam);
    // outras sessões (histórico): portas trancadas na mesma parede
    const hist = p(t, T.history - 0.2, T.history + 0.6), wallA = p(t, T.history - 0.3, T.history + 0.25) * (1 - p(t, T.finale - 0.55, T.finale - 0.05));
    if (wallA > 0) {
      ctx.save(); ctx.globalAlpha *= wallA;
      WALL_ROWS.forEach((y, r) => WALL_COLS.forEach((x, k) => {
        if (x === 0 && y === 0) return;
        const Vo = { cx: x, cy: y, cz: 0, open: 0, light: 0, bars: 0, wheel: 0.3 * (r + k), dial: hash(r, k) * TAU, hub: 0, glow: 0, rim: 0.35 };
        drawVault(ctx, cam, Vo);
        const q = cam.P(x, y + FR1 + 120, 0);
        if (q[3] * 900 > 60) {
          ctx.save(); ctx.globalAlpha *= hist;
          rr(ctx, q[0] - 330 * q[3], q[1] - 70 * q[3], 660 * q[3], 140 * q[3], 20 * q[3]); fill(ctx, '#10120F');
          rr(ctx, q[0] - 330 * q[3], q[1] - 70 * q[3], 660 * q[3], 140 * q[3], 20 * q[3]); stroke(ctx, C.steel4, 3 * q[3]);
          txt(ctx, 'FECHADO', q[0], q[1] + 22 * q[3], { size: 64 * q[3], weight: 800, color: C.grayL, align: 'center', ls: 8 * q[3] });
          ctx.restore();
        }
      }));
      ctx.restore();
    }
    const ct = cam.P(0, 0, 0);
    radial(ctx, ct[0], ct[1], VR * ct[3] * 2.6, C.lime, 0.1 + 0.3 * V.light + 0.25 * V.glow);
    drawVault(ctx, cam, V);
    // placa da sessão atual (acima da faixa da legenda do Reels)
    const q = cam.P(0, FR1 + 62, 0);
    const pa = E.outCubic(p(t, LOCK + 0.45, LOCK + 0.75)) * (1 - p(t, T.finale - 0.5, T.finale - 0.1));
    if (pa > 0) {
      ctx.save(); ctx.globalAlpha *= pa;
      pill(ctx, q[0], q[1], 'FECHADO', { size: 46 * q[3] + 8, bg: '#2A0E12', border: C.out, color: '#FF8A95', dot: C.out });
      ctx.restore();
    }
    // mensagens
    lines(ctx, t, [
      { segs: [{ s: 'Caixa fechado' }], t: LOCK + 0.35 },
      { segs: [{ s: 'para novos lançamentos.', weight: 700, color: C.grayL }], t: LOCK + 0.55 },
    ], { y: 380, size: 92, lh: 90, tout: T.history - 0.1 });
    if (t > T.history - 0.4) {
      const sc = ctx.createLinearGradient(0, 0, 0, 720);
      sc.addColorStop(0, 'rgba(5,6,5,0.97)'); sc.addColorStop(0.62, 'rgba(5,6,5,0.88)'); sc.addColorStop(1, 'rgba(5,6,5,0)');
      ctx.save(); ctx.globalAlpha *= p(t, T.history - 0.4, T.history) * (1 - p(t, T.finale - 0.6, T.finale - 0.2));
      ctx.fillStyle = sc; ctx.fillRect(0, 0, W, 720); ctx.restore();
    }
    lines(ctx, t, [
      { segs: [{ s: 'Cada sessão' }], t: T.history + 0.3 },
      { segs: [{ s: 'fica no histórico.', color: C.lime }], t: T.history + 0.55 },
    ], { y: 360, size: 100, lh: 98, tout: T.finale - 0.75 });
    // assinatura
    if (t > T.finale - 0.2) finale(ctx, t);
  }
  function finale(ctx, t) {
    lines(ctx, t, [
      { segs: [{ s: 'O caixa' }], t: T.finale + 0.05 },
      { segs: [{ s: 'bateu.', color: C.lime }], t: T.finale + 0.3 },
    ], { y: 330, size: 132, lh: 128 });
    const NS = 92, w1 = tw(ctx, 'FAZLO ', DISPLAY, NS, 900, -2.6), w2 = tw(ctx, 'Hospeda', DISPLAY, NS, 700, -2.6), nx = 540 - (w1 + w2) / 2;
    riseLine(ctx, [{ s: 'FAZLO ' }], nx, 1360, p(t, T.finale + 0.6, T.finale + 1.0), 0, { size: NS, weight: 900, color: C.white, ls: -2.6 });
    riseLine(ctx, [{ s: 'Hospeda', weight: 700 }], nx + w1, 1360, p(t, T.finale + 0.68, T.finale + 1.08), 0, { size: NS, weight: 700, color: C.white, ls: -2.6 });
    typeText(ctx, 'CONTROLE DE CAIXA', 540, 1416, p(t, T.finale + 0.9, T.finale + 1.25), { size: 28, weight: 800, color: C.lime, ls: 8, align: 'center' });
    const da = E.outBack(p(t, T.finale + 1.5, T.finale + 1.85), 1.8);
    if (da > 0) {
      const s = 'fazlohospeda.com.br', dw2 = tw(ctx, s, DISPLAY, 50, 800, -1) + 70;
      const aw = tw(ctx, 'ACESSE', MONO, 24, 800, 4) + 34;
      ctx.save(); ctx.translate(540, 1494); ctx.scale(da, da);
      const tot = aw + 14 + dw2;
      rr(ctx, -tot / 2, -36, aw, 72, 36); fill(ctx, C.steel2);
      txt(ctx, 'ACESSE', -tot / 2 + aw / 2, 9, { size: 24, weight: 800, color: C.grayL, align: 'center', ls: 4 });
      rr(ctx, -tot / 2 + aw + 14, -36, dw2, 72, 36); fill(ctx, C.lime);
      txt(ctx, s, -tot / 2 + aw + 14 + dw2 / 2, 17, { fam: DISPLAY, size: 50, weight: 800, color: C.ink, align: 'center', ls: -1 });
      // brilho que atravessa o domínio
      const sh = p(t, T.finale + 2.5, T.finale + 3.1);
      if (sh > 0 && sh < 1) {
        ctx.save(); rr(ctx, -tot / 2 + aw + 14, -36, dw2, 72, 36); ctx.clip();
        const gx = lerp(-tot / 2 + aw - 100, tot / 2 + 100, E.inOutSine(sh));
        const g = ctx.createLinearGradient(gx - 80, 0, gx + 80, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(gx - 80, -36, 160, 72); ctx.restore();
      }
      ctx.restore();
    }
  }

  // =====================================================================
  // MONTAGEM: cenas, transições e motion blur
  // =====================================================================
  /** cena B entra por baixo (dir=1) ou por cima (dir=-1) empurrando a cena A */
  function whip(ctx, t, t0, A, B, dir) {
    const u = E.inOutCubic(p(t, t0, t0 + 0.32)), off = u * H * dir;
    ctx.save(); ctx.translate(0, -off); A(ctx, t); ctx.restore();
    ctx.save(); ctx.translate(0, H * dir - off); B(ctx, t); ctx.restore();
  }
  function zoomInto(ctx, t, t0, A, B) {
    // a conferência encolhe para dentro do cofre, que fecha
    const u = E.inOutCubic(p(t, t0, t0 + 0.4));
    B(ctx, t);
    if (u >= 1) return;
    const c = makeCam(camAt(CAM_CLOSE, t)), ct = c.P(0, 0, -30);
    ctx.save();
    ctx.globalAlpha *= 1 - E.inQuad(u);
    ctx.translate(lerp(540, ct[0], u), lerp(960, ct[1], u)); ctx.scale(lerp(1, 0.12, u), lerp(1, 0.12, u)); ctx.translate(-540, -960);
    A(ctx, t);
    ctx.restore();
  }
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    if (t < T.title) sceneVaultOpen(ctx, t);
    else if (t < 5.65) { sceneTitle(ctx, t); const f = 1 - p(t, T.title, T.title + 0.25); if (f > 0) { ctx.fillStyle = rgba('#FFFFFF', 0.6 * f); ctx.fillRect(0, 0, W, H); } }
    else if (t < 5.95) { sceneTitle(ctx, t); shutter(ctx, p(t, 5.65, 5.95)); }
    else if (t < T.open + 0.3) { sceneOpen(ctx, t); shutter(ctx, 1 - p(t, 5.95, T.open + 0.3)); }
    else if (t < T.flow - 0.15) sceneOpen(ctx, t);
    else if (t < T.flow + 0.17) whip(ctx, t, T.flow - 0.15, sceneOpen, sceneFlow, -1);
    else if (t < T.cash - 0.15) sceneFlow(ctx, t);
    else if (t < T.cash + 0.17) whip(ctx, t, T.cash - 0.15, sceneFlow, sceneCash, 1);
    else if (t < T.close - 0.2) sceneCash(ctx, t);
    else if (t < T.close + 0.1) { sceneCash(ctx, t); shutter(ctx, p(t, T.close - 0.2, T.close + 0.1)); }
    else if (t < T.close + 0.4) { sceneClose(ctx, t); shutter(ctx, 1 - p(t, T.close + 0.1, T.close + 0.4)); }
    else if (t < T.lock) sceneClose(ctx, t);
    else if (t < T.lock + 0.4) zoomInto(ctx, t, T.lock, sceneClose, sceneVaultClose);
    else sceneVaultClose(ctx, t);
  }
  const FAST = [[2.3, 3.6], [3.9, 5.3], [5.6, 6.6], [T.flow - 0.2, T.flow + 0.3], [ARRIVE[0] - 0.6, ARRIVE[0] + 0.45], [ARRIVE[1] - 0.6, ARRIVE[1] + 0.45],
    [ARRIVE[2] - 0.6, ARRIVE[2] + 0.45], [TOT_T, TOT_T + 0.5], [T.cash - 0.2, T.cash + 0.5], [CASH_IN - 0.05, CASH_IN + 0.5], [T.close - 0.25, T.close + 0.45],
    [ZERO - 0.45, ZERO + 0.3], [T.lock - 0.05, LOCK + 0.6], [T.history, T.history + 1.2], [T.finale - 0.7, T.finale + 0.2]];
  function shutterSpec(t) {
    for (const [a, b] of FAST) if (t >= a && t < b) return { k: 12, dt: 1 / 50 };
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

  // =====================================================================
  // CAPA (1080x1920; o recorte 3:4 do perfil fica no centro)
  // =====================================================================
  function renderCover(ctx) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    const cam = makeCam({ x: 330, y: 40, z: -2050, yaw: -0.12, f: 1400, sx: 640, sy: 1160 });
    const V = { cx: 0, cy: 0, cz: 0, open: 0.92, light: 1, bars: 1, wheel: 0.5, dial: 0.4, hub: 0, glow: 0.4, rim: 1 };
    drawWall(ctx, cam);
    const ct = cam.P(0, 0, 0);
    radial(ctx, ct[0] + 120, ct[1], 1100, C.lime, 0.4);
    drawVault(ctx, cam, V);
    radial(ctx, ct[0] + 60, ct[1], 900, C.lime, 0.3);
    const sc = ctx.createLinearGradient(0, 300, 0, 900);
    sc.addColorStop(0, 'rgba(5,6,5,0.85)'); sc.addColorStop(1, 'rgba(5,6,5,0)');
    ctx.fillStyle = sc; ctx.fillRect(0, 0, W, 900);
    txt(ctx, 'O caixa', 540, 520, { fam: DISPLAY, size: 168, weight: 900, color: C.white, align: 'center', ls: -5 });
    txt(ctx, 'bateu?', 540, 680, { fam: DISPLAY, size: 168, weight: 900, color: C.lime, align: 'center', ls: -5 });
    pill(ctx, 540, 1560, 'CONTROLE DE CAIXA · FAZLO HOSPEDA', { size: 28, bg: C.lime, color: C.ink, ls: 3 });
  }

  // =====================================================================
  // CUES DE SOM (exportados para audio/cues.json)
  // =====================================================================
  const CUES = [];
  const cue = (t, type, o = {}) => CUES.push(Object.assign({ t: Math.round(t * 1e4) / 1e4, type }, o));
  function buildCues() {
    CUES.length = 0;
    dialSteps.forEach((t0, i) => cue(t0, 'tick', { k: i }));
    cue(2.35, 'wheel', { d: 1.1 });
    for (let k = 0; k < NBAR; k++) cue(unlockAt(k), 'unlock', { k, pan: Math.cos(BAR_A[k]) * 0.7 });
    cue(3.5, 'crack', { d: 0.45 });
    cue(0.05, 'rise', {}); cue(0.3, 'rise', {});
    cue(T.drop, 'drop', {});
    cue(T.title + 0.05, 'slam', { k: 0 }); cue(T.title + 0.3, 'slam', { k: 1 });
    cue(5.65, 'shutter', { d: 0.3 }); cue(5.95, 'shutter', { d: 0.35, open: 1 });
    cue(T.open + 0.45, 'drawer', {});
    cue(T.open + 0.1, 'rise', {}); cue(T.open + 0.35, 'rise', {});
    cue(TRK_OPEN.keys[1].t, 'flaps', { times: flapClicks(TRK_OPEN) });
    cue(T.open + 1.4, 'stamp', {});
    cue(T.flow - 0.15, 'whip', { d: 0.32, dir: -1 });
    ENTRIES.forEach((e, i) => {
      cue(ARRIVE[i] - TRAVEL, 'tube', { d: TRAVEL, k: i, p0: (TUBE_X[e.tube] - 540) / 540 });
      cue(ARRIVE[i], 'arrive', { k: i, v: e.v });
      if (i > 0) cue(ARRIVE[i], 'row', { k: i - 1 });
    });
    cue(TOT_T, 'row', { k: 2 });
    cue(TRK_IN.keys[1].t, 'flaps', { times: flapClicks(TRK_IN) });
    cue(TRK_OUT.keys[1].t, 'flaps', { times: flapClicks(TRK_OUT), out: 1 });
    [T.flow + 0.15, ARRIVE[1] - 0.05, TOT_T].forEach((ts) => cue(ts, 'rise', {}));
    cue(T.cash - 0.15, 'whip', { d: 0.32, dir: 1 });
    [0, 1, 2].forEach((i) => cue(T.cash + 0.35 + i * S16, 'chip', { k: i }));
    cue(T.cash + 1.05, 'sort', { d: 0.4 });
    cue(CASH_IN, 'cashdrop', { d: 0.3 });
    cue(TRK_CASH.keys[1].t, 'flaps', { times: flapClicks(TRK_CASH) });
    cue(CASH_IN + 0.9, 'settle', {});
    cue(T.cash + 0.1, 'rise', {}); cue(T.cash + 0.35, 'rise', {});
    cue(T.close - 0.2, 'shutter', { d: 0.3 }); cue(T.close + 0.1, 'shutter', { d: 0.3, open: 1 });
    cue(TRK_EXP.keys[1].t, 'flaps', { times: flapClicks(TRK_EXP) });
    cue(TRK_CNT.keys[1].t, 'flaps', { times: flapClicks({ n: 9, keys: TRK_CNT.keys.slice(0, 2) }) });
    KEYS.forEach((tk, i) => cue(tk, 'key', { k: i }));
    cue(TRK_DIF.keys[1].t, 'flaps', { times: flapClicks(TRK_DIF).filter((x) => x < TRK_DIF.keys[6].t), out: 1 });
    cue(TRK_DIF.keys[6].t, 'spin', { times: flapClicks(TRK_DIF).filter((x) => x >= TRK_DIF.keys[6].t) });
    cue(ZERO, 'zero', {});
    cue(T.close + 0.05, 'rise', {}); cue(T.close + 0.3, 'rise', {});
    cue(T.lock, 'zoomout', { d: 0.4 });
    cue(LOCK - 0.42, 'swing', { d: 0.42 });
    cue(LOCK, 'boom', {});
    for (let k = 0; k < 4; k++) cue(lockAt(k), 'lock', { k, pan: Math.cos(BAR_A[k]) * 0.6 });
    cue(LOCK + 0.45, 'stamp', { closed: 1 });
    cue(LOCK + 0.35, 'rise', {});
    cue(T.history, 'pull', { d: 1.15 });
    cue(T.history + 0.3, 'rise', {});
    cue(T.finale - 0.65, 'dive', { d: 0.53 });
    cue(T.finale, 'logo', {});
    cue(T.finale + 0.6, 'rise', {});
    cue(T.finale + 0.9, 'type', { d: 0.35, n: 17 });
    cue(T.finale + 1.5, 'domain', {});
    cue(T.finale + 2.5, 'glint', { d: 0.6 });
    CUES.sort((a, b) => a.t - b.t);
  }

  function init(img) {
    LOGO = img;
    buildTubes();
    buildCues();
  }

  window.REEL03 = {
    init, renderAt, renderCover, DURATION, W, H,
    cues: () => ({ bpm: BPM, duration: DURATION, sections: T, cues: CUES.slice() }),
  };
})();
