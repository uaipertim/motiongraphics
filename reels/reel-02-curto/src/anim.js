/* =====================================================================
   FAZLO Hospeda — REEL 02 "Cada reserva no seu lugar" — 9:16 (1080x1920)
   Gestão de reservas. Motor em Canvas 2D, determinístico: renderAt(ctx, t)
   desenha o quadro exato do instante t (s). O calendário de ocupação vira
   um tabuleiro 3D (projeção axonométrica): acomodações x datas no plano e
   as reservas como blocos extrudados. O mesmo código serve o preview, o
   render quadro a quadro e a lista de cues da trilha (audio/cues.json).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;

  // ---------------------------------------------------------------- tempo
  // 140 BPM em meio-tempo: 1 tempo = 0,4286 s, 1 compasso = 1,714 s.
  const BPM = 140, BT = 60 / BPM, BAR = 4 * BT;
  const bar = (n, beats = 0) => (n - 1) * BAR + beats * BT;
  const DURATION = 27.8;
  const T = {
    hook: 0,           // c.1–2   "Tem vaga pro fim de semana?" + enxurrada de perguntas
    build: bar(3),     // c.3–4   as perguntas viram o calendário; as reservas se encaixam
    drop: bar(5),      // c.5     o calendário se ergue em 3D
    scan: bar(6),      // c.6–7   feixe de luz acende as diárias livres
    views: bar(8),     // c.8–9   dia → semana → mês
    filters: bar(10),  // c.10–11 filtros por status
    voucher: bar(12),  // c.12–13 uma reserva vira voucher
    finale: bar(14),   // c.14–16 marca e convite
  };

  const DISPLAY = "'R2 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'R2 Mono', 'JetBrains Mono', monospace";

  // ---------------------------------------------------------------- identidade
  const C = {
    black: '#0A0A0A', void: '#060606', panel: '#161616', line2: '#3A3A3A',
    lime: '#AFFA27', limeD: '#8CD10C', limeL: '#D8FF8A',
    white: '#FFFFFF', paper: '#F2F2EC', ink: '#0A0A0A',
    gray: '#8E8E88', grayD: '#5E5E59', grayL: '#B9B9B1',
    livre: '#4CC067', pre: '#FF8A1F', checkin: '#3D8BFF', checkout: '#F5B638', fin: '#8E8E88', bloq: '#2E2E2E',
  };
  // status do calendário de ocupação (legenda operacional do app)
  const ST = {
    CONF: { label: 'CONFIRMADA', top: C.lime, sideL: '#97D61F', sideR: '#5E8A10', text: C.ink },
    PRE: { label: 'PRÉ-RESERVA', top: C.pre, sideL: '#E07716', sideR: '#8F4A0B', text: C.ink },
    HOSP: { label: 'HOSPEDADA', top: '#141414', sideL: '#3E5A12', sideR: '#141E06', text: C.lime, border: C.lime },
    CHECKIN: { label: 'CHECK-IN', top: C.checkin, sideL: '#2F72D8', sideR: '#1B437F', text: C.ink },
    CHECKOUT: { label: 'CHECK-OUT', top: C.checkout, sideL: '#D59E2B', sideR: '#80601A', text: C.ink },
    FIN: { label: 'FINALIZADA', top: '#9A9A93', sideL: '#7D7D77', sideR: '#4A4A46', text: C.ink },
    BLOQ: { label: 'BLOQUEADA', top: '#2A2A2A', sideL: '#222222', sideR: '#111111', text: '#C9C9C2', hatch: true },
  };

  // ---------------------------------------------------------------- dados (demonstração do app)
  // Outubro de 2026 (1º = quinta). Hoje = quinta, 8. Reservas da lista do app.
  const ROOMS = ['BICA D\'ÁGUA 01', 'BICA D\'ÁGUA 02', 'BICA D\'ÁGUA 03', 'BICA D\'ÁGUA 04', 'CHALÉ DE PEDRA 05',
    'CHALÉ DE PEDRA 06', 'CHALÉ DE PEDRA 07', 'IPÊ 08', 'IPÊ 09', 'CHALÉ SERRA 01'];
  const NR = ROOMS.length, ND = 31, TODAY = 8;
  const RES = [
    { code: 'FHZ-000128', guest: 'MARIANA SOUZA', r: 7, d0: 2, d1: 5, st: 'FIN' },
    { code: 'FHZ-000137', guest: 'LUCAS MARTINS', r: 5, d0: 4, d1: 7, st: 'HOSP' },
    { code: 'FHZ-000127', guest: 'ANA JULIA COSTA', r: 0, d0: 6, d1: 10, st: 'HOSP', hero: true },
    { code: 'FHZ-000129', guest: 'CARLOS HENRIQUE SILVA', r: 1, d0: 6, d1: 8, st: 'CHECKOUT' },
    { code: 'FHZ-000136', guest: 'BEATRIZ NOGUEIRA', r: 2, d0: 6, d1: 8, st: 'CHECKOUT' },
    { code: 'FHZ-000138', guest: 'PATRÍCIA RIBEIRO', r: 8, d0: 7, d1: 10, st: 'HOSP' },
    { code: 'FHZ-000131', guest: 'THIAGO OLIVEIRA', r: 3, d0: 8, d1: 11, st: 'CHECKIN' },
    { code: 'MANUTENÇÃO', guest: 'BLOQUEIO', r: 6, d0: 9, d1: 11, st: 'BLOQ' },
    { code: 'FHZ-000132', guest: 'ROBERTO SILVEIRA', r: 4, d0: 12, d1: 15, st: 'CONF' },
    { code: 'FHZ-000134', guest: 'CAMILA GUIMARÃES', r: 2, d0: 13, d1: 16, st: 'CONF' },
    { code: 'FHZ-000135', guest: 'MARCELO PEIXOTO', r: 8, d0: 14, d1: 16, st: 'PRE' },
    { code: 'FHZ-000133', guest: 'JOÃO FERREIRA', r: 9, d0: 15, d1: 18, st: 'CONF' },
    { code: 'FHZ-000130', guest: 'FERNANDA ALVES', r: 5, d0: 18, d1: 21, st: 'CONF' },
  ];
  const WEEKDAY = (d) => (d + 3) % 7;            // 0 = domingo (1º/out = quinta)
  const WD = 'DSTQQSS';
  // retângulo de cada reserva no plano: entra na metade do dia de chegada, sai na metade do dia de saída
  RES.forEach((b) => { b.x0 = b.d0 - 0.5 + 0.05; b.x1 = b.d1 - 0.5 - 0.05; b.y0 = b.r + 0.15; b.y1 = b.r + 0.85; });
  const nightFree = (r, d) => !RES.some((b) => b.r === r && d >= b.d0 && d < b.d1);

  // ---------------------------------------------------------------- utilitários
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const deg = (d) => (d * Math.PI) / 180;
  const E = {
    inQuad: (x) => x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
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
  const noise1 = (x, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u); };
  const kick = (t, t0, dur = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / dur) * 4));
  function brl(v) {
    const c = Math.round(Math.abs(v) * 100);
    return `R$ ${Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${String(c % 100).padStart(2, '0')}`;
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
  function polyPath(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  function hull(pts) {   // envoltória convexa (monotone chain)
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  // ---------------------------------------------------------------- tipografia
  function setFont(ctx, fam, size, weight, align = 'left', ls = 0) {
    ctx.font = `${weight} ${size}px ${fam}`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = ls + 'px';
  }
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, 'left', ls); return ctx.measureText(s).width; }
  function fit(ctx, s, maxW, maxSize, fam = DISPLAY, weight = 900, lsr = -0.025) {
    return Math.min(maxSize, (100 * maxW) / tw(ctx, s, fam, 100, weight, 100 * lsr));
  }
  function txt(ctx, s, x, y, o) {
    setFont(ctx, o.fam || MONO, o.size, o.weight || 800, o.align || 'left', o.ls || 0);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.fillStyle = o.color; ctx.fillText(s, x, y);
    ctx.restore();
  }
  /** Texto no plano do tabuleiro: tamanho em unidades do plano (desenhado a 100x e reduzido,
   *  para o Chromium não arredondar corpos de fonte minúsculos). */
  function ptxt(ctx, s, x, y, size, o) {
    ctx.save(); ctx.translate(x, y); ctx.scale(0.01, 0.01);
    txt(ctx, s, 0, 0, Object.assign({}, o, { size: size * 100, ls: (o.ls || 0) * 100 }));
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
  function riseLine(ctx, segs, x, y, pin, pout, o) {
    if (pin <= 0 || pout >= 1) return 0;
    const fam = o.fam || DISPLAY, size = o.size, weight = o.weight || 900, ls = o.ls ?? -size * 0.025;
    const ws = segs.map((s) => tw(ctx, s.s, fam, size, weight, ls));
    const total = ws.reduce((a, b) => a + b, 0);
    const left = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    const off = (1 - E.outExpo(clamp(pin))) * size * 1.3 - E.inCubic(clamp(pout)) * size * 1.3;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.beginPath(); ctx.rect(left - 80, y - size * 1.05, total + 160, size * 1.38); ctx.clip();
    setFont(ctx, fam, size, weight, 'left', ls);
    let cx = left;
    segs.forEach((s, i) => { ctx.fillStyle = s.color || o.color; ctx.fillText(s.s, cx, y + off); cx += ws[i]; });
    ctx.restore();
    return total;
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

  // ---------------------------------------------------------------- câmera axonométrica
  // Plano do tabuleiro: x = dias (coluna do dia d = [d-1, d]), y = acomodações (linha r = [r, r+1]),
  // h = altura. cam = {fx, fy: foco no plano; s: px por unidade; th: giro; k: inclinação (1 = visto de cima); cx, cy}.
  const hzOf = (cam) => Math.sqrt(Math.max(0, 1 - cam.k * cam.k));
  function planeM(cam, h = 0) {
    const c = Math.cos(cam.th), sn = Math.sin(cam.th), S = cam.s, k = cam.k;
    const a = S * c, b = S * k * sn, cc = -S * sn, d = S * k * c;
    return [a, b, cc, d, cam.cx - (a * cam.fx + cc * cam.fy), cam.cy - (b * cam.fx + d * cam.fy) - S * hzOf(cam) * h];
  }
  function proj(cam, x, y, h = 0) {
    const m = planeM(cam, h);
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }
  function onPlane(ctx, cam, h, fn) { ctx.save(); ctx.transform(...planeM(cam, h)); fn(); ctx.restore(); }
  function rrPts(x0, y0, x1, y1, r, n = 4) {
    const pts = [];
    for (const [cx, cy, a0] of [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]]) {
      for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    }
    return pts;
  }
  /** Bloco extrudado: laterais = envoltória da base e do topo (projeção ortográfica). */
  function prism(ctx, cam, x0, y0, x1, y1, h0, h1, r, sideL, sideR) {
    if (h1 - h0 < 0.002 || hzOf(cam) < 0.01) return;
    const base = rrPts(x0, y0, x1, y1, r);
    const pts = base.map(([x, y]) => proj(cam, x, y, h0)).concat(base.map(([x, y]) => proj(cam, x, y, h1)));
    const hl = hull(pts);
    let mn = Infinity, mx = -Infinity;
    for (const [x] of hl) { mn = Math.min(mn, x); mx = Math.max(mx, x); }
    const g = ctx.createLinearGradient(mn, 0, mx, 0);
    g.addColorStop(0, sideL); g.addColorStop(1, sideR);
    polyPath(ctx, hl); ctx.fillStyle = g; ctx.fill();
  }
  const camLerp = (a, b, e) => ({
    fx: lerp(a.fx, b.fx, e), fy: lerp(a.fy, b.fy, e), s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), e)),
    th: lerp(a.th, b.th, e), k: lerp(a.k, b.k, e), cx: lerp(a.cx ?? 540, b.cx ?? 540, e), cy: lerp(a.cy, b.cy, e),
  });

  // ---------------------------------------------------------------- choques de câmera
  const SHAKES = [];
  function applyShake(ctx, t, s = 1) {
    let x = 0, y = 0;
    for (const [t0, amp, dur] of SHAKES) {
      if (t < t0 || t > t0 + dur * 1.6) continue;
      const k = Math.exp(-((t - t0) / dur) * 4) * amp, f = (t - t0) * 38;
      x += k * noise1(f, 11); y += k * noise1(f, 23);
    }
    ctx.translate(x * s, y * s);
  }

  // ---------------------------------------------------------------- cues de som
  const CUES = [];
  const cue = (t, type, o = {}) => CUES.push(Object.assign({ t: Math.round(t * 1e4) / 1e4, type }, o));

  // ---------------------------------------------------------------- fundo
  function bgSpace(ctx, t, glowA = 0.12) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0B0B0B'); g.addColorStop(1, '#040404');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    radial(ctx, 540, 1250, 1100, C.lime, glowA);
    // poeira de luz flutuando
    for (let i = 0; i < 40; i++) {
      const sp = 18 + hash(i, 5) * 40, x = (hash(i, 6) * W + Math.sin(t * 0.4 + i) * 20) % W, y = H - ((t * sp + hash(i, 7) * H) % H);
      circle(ctx, x, y, 1.5 + hash(i, 8) * 2.5); fill(ctx, rgba(C.lime, 0.12 + 0.18 * hash(i, 9)));
    }
  }

  // =====================================================================
  // 1) GANCHO (0 – 3,43 s): a pergunta que toda pousada recebe
  // =====================================================================
  // Perguntas de hóspedes (genéricas), espalhadas pela tela e chegando cada vez mais rápido.
  const ASKS = [
    { s: 'DIA 12 AINDA TEM?', x: 70, y: 380, r: -3 },
    { s: 'QUARTO PARA 4 PESSOAS?', x: 70, y: 1210, r: 2 },
    { s: 'O CHALÉ ESTÁ LIVRE?', x: 460, y: 500, r: 2 },
    { s: 'CHEGO SEXTA, PODE SER?', x: 300, y: 1330, r: -2 },
    { s: 'AINDA TEM O IPÊ 08?', x: 110, y: 620, r: -1 },
    { s: 'DÁ PRA FICAR MAIS 1 DIÁRIA?', x: 50, y: 1450, r: 1 },
    { s: '2 ADULTOS E 1 CRIANÇA?', x: 400, y: 270, r: 3 },
    { s: 'TEM NO FERIADO?', x: 500, y: 1230, r: -3 },
    { s: 'SAÍDA ATÉ QUE HORAS?', x: 480, y: 380, r: 2 },
    { s: 'E NA OUTRA SEMANA?', x: 520, y: 620, r: -2 },
    { s: 'TEM CAMA DE CASAL?', x: 420, y: 1450, r: 2 },
    { s: 'CONFIRMA PRA MIM?', x: 90, y: 1330, r: -1 },
  ];
  // pipocam nos tempos 2 e 3, depois em colcheias, depois em semicolcheias
  const ASK_T = [2 * BT, 3 * BT, BAR, BAR + BT / 2, BAR + BT, BAR + 1.5 * BT, BAR + 2 * BT, BAR + 2.5 * BT, BAR + 3 * BT, BAR + 3.25 * BT, BAR + 3.5 * BT, BAR + 3.75 * BT];
  let HOOKT = null;
  function layoutHook(ctx) {
    const s1 = fit(ctx, 'Tem vaga', 920, 250);
    const s2 = fit(ctx, 'pro fim de semana?', 920, 110);
    HOOKT = { s1, s2, y1: 880, y2: 880 + s2 * 1.25 };   // termina acima da coluna de ações do Reels
    ASKS.forEach((a) => { a.w = tw(ctx, a.s, MONO, 36, 800, 1.5) + 104; });
  }
  function sceneHook(ctx, t) {
    bgSpace(ctx, t, 0.06 + 0.05 * Math.min(1, t / BAR));
    const shat = p(t, T.build - 0.04, T.build + 0.12);  // estilhaçar
    ctx.save();
    applyShake(ctx, t);
    // tensão: a cena "aperta" no fim do c.2
    const sq = 1 - 0.035 * E.inCubic(p(t, BAR + 2 * BT, T.build));
    ctx.translate(540, 960); ctx.scale(sq, sq); ctx.translate(-540, -960);
    // perguntas
    ASKS.forEach((a, i) => {
      const u = p(t, ASK_T[i], ASK_T[i] + 0.16);
      if (u <= 0) return;
      const s = E.outBack(u, 2.2) * (1 - shat);
      if (s <= 0.01) return;
      ctx.save(); ctx.translate(a.x + a.w / 2, a.y); ctx.rotate(deg(a.r)); ctx.scale(s, s);
      rr(ctx, -a.w / 2, -44, a.w, 88, 44); fill(ctx, '#151515');
      rr(ctx, -a.w / 2, -44, a.w, 88, 44); stroke(ctx, mix(C.line2, C.lime, kick(t, ASK_T[i], 0.4)), 3);
      circle(ctx, -a.w / 2 + 42, 0, 10); fill(ctx, C.lime);
      txt(ctx, a.s, -a.w / 2 + 72, 13, { size: 36, weight: 800, color: C.white, ls: 1.5 });
      ctx.restore();
    });
    // a pergunta principal
    const k1 = p(t, -0.08, 0.16);
    if (k1 > 0 && shat < 1) {
      const sc = lerp(1.35, 1, E.outExpo(k1)) * (1 + 0.04 * kick(t, 0.1, 0.3)) * (1 - shat);
      ctx.save(); ctx.translate(540, HOOKT.y1 - HOOKT.s1 * 0.35); ctx.scale(sc, sc); ctx.translate(-540, -(HOOKT.y1 - HOOKT.s1 * 0.35));
      txt(ctx, 'Tem vaga', 540, HOOKT.y1, { fam: DISPLAY, size: HOOKT.s1, weight: 900, color: C.white, align: 'center', ls: -HOOKT.s1 * 0.025 });
      ctx.restore();
      ctx.save(); ctx.translate(540, HOOKT.y2); ctx.scale(1 - shat, 1 - shat); ctx.translate(-540, -HOOKT.y2);
      riseLine(ctx, [{ s: 'pro fim de semana?' }], 540, HOOKT.y2, p(t, BT - 0.02, BT + 0.4), 0, { size: HOOKT.s2, color: C.lime, align: 'center' });
      ctx.restore();
    }
    ctx.restore();
  }

  // =====================================================================
  // 2) TABULEIRO (3,43 s →): calendário de ocupação em 3D
  // =====================================================================
  const CAMS = {
    FLAT: { fx: 4.75, fy: 4.25, s: 61, th: 0, k: 1, cy: 1060 },
    FLAT_END: { fx: 7.4, fy: 4.4, s: 64, th: -0.12, k: 0.92, cy: 1060 },
    HERO_A: { fx: 8.6, fy: 4.8, s: 116, th: -0.95, k: 0.63, cy: 1010 },
    HERO_B: { fx: 10.2, fy: 4.8, s: 110, th: -1.05, k: 0.6, cy: 990 },
    SCAN: { fx: 12.5, fy: 4.8, s: 88, th: -1.12, k: 0.58, cy: 990 },
    WEEKEND: { fx: 9.9, fy: 4.7, s: 118, th: -0.88, k: 0.62, cy: 1060 },
    DAY: { fx: 7.6, fy: 4.7, s: 132, th: -0.68, k: 0.64, cy: 1090 },
    WEEK: { fx: 6.9, fy: 4.7, s: 98, th: -0.86, k: 0.62, cy: 1060 },
    MONTH: { fx: 15.4, fy: 4.5, s: 47, th: -1.15, k: 0.6, cy: 1010 },
    FILTER: { fx: 12.4, fy: 4.5, s: 64, th: -1.2, k: 0.5, cy: 1090 },
    VOUCHER: { fx: 7.7, fy: 0.6, s: 122, th: -0.8, k: 0.56, cy: 1360 },
    FINALE: { fx: 13.0, fy: 4.6, s: 50, th: -1.15, k: 0.5, cy: 1520 },
  };
  const drift = (c, o) => Object.assign({}, c, o);
  // [instante em que a câmera chega, enquadramento, curva]
  const KEYS = [
    [T.build - 0.2, CAMS.FLAT, 'sine'],
    [T.drop - 0.1, CAMS.FLAT_END, 'sine'],
    [T.drop + 0.62, CAMS.HERO_A, 'cubic'],
    [T.scan - 0.1, CAMS.HERO_B, 'sine'],
    [T.scan + 1.45, CAMS.SCAN, 'sine'],
    [T.scan + BAR + 0.15, CAMS.WEEKEND, 'cubic'],
    [T.views - 0.25, drift(CAMS.WEEKEND, { th: -0.82, s: 122 }), 'sine'],
    [T.views + 0.25, CAMS.DAY, 'cubic'],
    [T.views + 2 * BT - 0.2, drift(CAMS.DAY, { th: -0.64, s: 136 }), 'sine'],
    [T.views + 2 * BT + 0.3, CAMS.WEEK, 'cubic'],
    [T.views + BAR - 0.2, drift(CAMS.WEEK, { th: -0.9 }), 'sine'],
    [T.views + BAR + 0.6, CAMS.MONTH, 'cubic'],
    [T.filters - 0.25, drift(CAMS.MONTH, { th: -1.08, s: 49 }), 'sine'],
    [T.filters + 0.4, CAMS.FILTER, 'cubic'],
    [T.voucher - 0.25, drift(CAMS.FILTER, { th: -1.12, s: 66 }), 'sine'],
    [T.voucher + 0.55, CAMS.VOUCHER, 'cubic'],
    [T.finale - 0.15, drift(CAMS.VOUCHER, { th: -0.74, s: 126 }), 'sine'],
    [T.finale + 1.1, CAMS.FINALE, 'cubic'],
    [DURATION, drift(CAMS.FINALE, { th: -1.02, fx: 14.5 }), 'sine'],
  ];
  let DEBUG_CAM = null;   // só para estudos de enquadramento (scripts de teste)
  function camAt(t) {
    if (DEBUG_CAM) return Object.assign({ cx: 540 }, DEBUG_CAM);
    if (t <= KEYS[0][0]) return Object.assign({ cx: 540 }, KEYS[0][1]);
    for (let i = 1; i < KEYS.length; i++) {
      const [t1, c1, ease] = KEYS[i];
      if (t <= t1) {
        const [t0, c0] = KEYS[i - 1];
        const u = p(t, t0, t1);
        return camLerp(c0, c1, ease === 'cubic' ? E.inOutCubic(u) : E.inOutSine(u));
      }
    }
    return Object.assign({ cx: 540 }, KEYS[KEYS.length - 1][1]);
  }

  // ---------------------------------------------------------------- linha do tempo das reservas
  // encaixe no c.3–4: 6 em colcheias, depois 7 em semicolcheias
  const SNAP = RES.map((_, i) => (i < 6 ? T.build + BT + i * (BT / 2) : T.build + BAR + (i - 6) * (BT / 4)));
  const FILTERS = [
    { key: 'CONF', word: 'Confirmadas.', color: C.lime, match: (b) => b.st === 'CONF' },
    { key: 'PRE', word: 'Pré-reservas.', color: C.pre, match: (b) => b.st === 'PRE' },
    { key: 'HOSP', word: 'Hospedados.', color: C.white, match: (b) => b.st === 'HOSP' || b.st === 'CHECKIN' },
    { key: 'BLOQ', word: 'Bloqueios.', color: C.grayL, match: (b) => b.st === 'BLOQ' },
  ];
  const FILTER_T = FILTERS.map((_, i) => T.filters + i * 2 * BT);
  const FILTER_END = T.voucher - 0.22;
  const HERO = RES.find((b) => b.hero);
  const BASE_H = 0.3;

  /** Altura e opacidade de cada bloco no instante t. */
  function blockState(b, i, t) {
    // extrusão em onda no drop (da esquerda para a direita)
    const w = p(t, T.drop + 0.02 + b.d0 * 0.012, T.drop + 0.4 + b.d0 * 0.012);
    let h = BASE_H * E.outBack(w, 2.4), a = 1, glowB = 0;
    // filtros: o status escolhido sobe, o resto afunda
    if (t >= FILTER_T[0] - 0.1 && t < FILTER_END + 0.4) {
      let target = BASE_H, dim = 1, hit = 0;
      for (let f = 0; f < FILTERS.length; f++) {
        const tf = FILTER_T[f], tn = f + 1 < FILTERS.length ? FILTER_T[f + 1] : FILTER_END;
        if (t >= tf - 0.06) {
          const m = FILTERS[f].match(b);
          const u = E.outBack(p(t, tf - 0.06, tf + 0.3), 1.6);
          target = m ? lerp(BASE_H, 1.6, u) : lerp(BASE_H, 0.05, u);
          dim = m ? 1 : lerp(1, 0.32, u);
          hit = m ? kick(t, tf, 0.5) : 0;
          if (t >= tn - 0.06 && f === FILTERS.length - 1) {
            const v = E.inOutCubic(p(t, tn - 0.06, tn + 0.3));
            target = lerp(target, BASE_H, v); dim = lerp(dim, 1, v);
          }
        }
      }
      h = target; a = dim; glowB = hit;
    }
    // a reserva-destaque se levanta para virar voucher (e volta no fim)
    if (b.hero) {
      const up = E.inOutCubic(p(t, T.voucher + 0.15, T.voucher + 0.6)) * (1 - E.inOutCubic(p(t, T.finale - 0.05, T.finale + 0.4)));
      h += up * 1.4;
      glowB = Math.max(glowB, up * 0.6);
    }
    // onda limão de "tudo no lugar" no final
    const fw = kick(t, T.finale + 0.55 + b.d0 * 0.02, 0.45);
    return { h, a, glowB, fw };
  }

  function drawBoard(ctx, cam, t) {
    const flat = hzOf(cam) < 0.02;
    // espessura do tabuleiro
    if (!flat) prism(ctx, cam, -3.8, -1.6, 31.35, 10.4, -0.5, 0, 0.5, '#151515', '#070707');
    const cellsIn = (c, r) => E.outCubic(p(t, T.build + 0.12 + c * 0.018 + r * 0.008, T.build + 0.34 + c * 0.018 + r * 0.008));
    const slab = E.outCubic(p(t, T.build + 0.15, T.build + 0.6));
    onPlane(ctx, cam, 0, () => {
      ctx.save(); ctx.globalAlpha *= slab;
      rr(ctx, -3.8, -1.6, 35.15, 12.0, 0.5); fill(ctx, '#101010');
      rr(ctx, -3.8, -1.6, 35.15, 12.0, 0.5); stroke(ctx, rgba(C.lime, 0.22), 0.04);
      ctx.restore();
      // células (noites)
      const shatter = t < T.build + 0.8;
      for (const weekend of [false, true]) {
        ctx.beginPath();
        for (let c = 0; c < ND; c++) {
          const wd = WEEKDAY(c + 1);
          if ((wd === 0 || wd === 6) !== weekend) continue;
          for (let r = 0; r < NR; r++) {
            const a = shatter ? cellsIn(c, r) : 1;
            if (a <= 0) continue;
            if (shatter && a < 1) { ctx.save(); ctx.globalAlpha *= a; rr(ctx, c + 0.06, r + 0.07, 0.88, 0.86, 0.12); fill(ctx, weekend ? '#1D1D1D' : '#181818'); ctx.restore(); continue; }
            ctx.roundRect(c + 0.06, r + 0.07, 0.88, 0.86, 0.12);
          }
        }
        fill(ctx, weekend ? '#1D1D1D' : '#181818');
      }
      // cabeçalho: dia da semana + número
      for (let c = 0; c < ND; c++) {
        const d = c + 1, a = p(t, T.build + 0.3 + c * 0.012, T.build + 0.6 + c * 0.012);
        if (a <= 0) continue;
        const wd = WEEKDAY(d);
        ptxt(ctx, WD[wd], c + 0.5, -0.92, 0.2, { weight: 700, color: wd === 0 || wd === 6 ? C.lime : C.gray, align: 'center', alpha: a });
        if (d === TODAY) { circle(ctx, c + 0.5, -0.42, 0.27); ctx.save(); ctx.globalAlpha *= a; fill(ctx, C.lime); ctx.restore(); }
        ptxt(ctx, String(d), c + 0.5, -0.31, 0.3, { weight: 800, color: d === TODAY ? C.ink : C.white, align: 'center', alpha: a });
      }
      // acomodações
      ROOMS.forEach((name, r) => {
        ctx.save(); ctx.translate(-3.55, r + 0.62); ctx.scale(0.01, 0.01);
        typeText(ctx, name, 0, 0, p(t, T.build + 0.35 + r * 0.04, T.build + 0.75 + r * 0.04), { size: 25, weight: 800, color: C.grayL, ls: 0.5 });
        ctx.restore();
      });
      // hoje
      const ta = p(t, T.build + 0.5, T.build + 0.8);
      if (ta > 0) { rr(ctx, TODAY - 1 + 0.02, -0.02, 0.96, NR + 0.04, 0.14); fill(ctx, rgba(C.lime, 0.07 * ta)); }
      // sombras de contato dos blocos
      if (!flat) RES.forEach((b, i) => {
        const s = blockState(b, i, t);
        if (s.h < 0.01 || t < SNAP[i]) return;
        ctx.save(); ctx.globalAlpha *= 0.55 * clamp(s.h / 0.3) * s.a;
        rr(ctx, b.x0 + 0.08, b.y0 + 0.12, b.x1 - b.x0, b.y1 - b.y0, 0.16); fill(ctx, '#000000');
        ctx.restore();
      });
    });
  }

  /** Diárias livres que o feixe acende (c.6–7) e o destaque do fim de semana. */
  const SCAN = [T.scan + 0.05, T.scan + 1.35];
  const WKND = [9, 10];   // noites de sexta (9) e sábado (10)
  function drawFree(ctx, cam, t) {
    const su = p(t, SCAN[0], SCAN[1]);
    if (su <= 0) return;
    const sx = lerp(-0.5, 31.5, E.inOutSine(su));
    const fade = 1 - p(t, T.views + BAR - 0.2, T.views + BAR + 0.4);
    if (fade <= 0) return;
    const wk = p(t, T.scan + BAR, T.scan + BAR + 0.3);
    onPlane(ctx, cam, 0.02, () => {
      for (let r = 0; r < NR; r++) for (let d = 1; d <= ND; d++) {
        if (!nightFree(r, d)) continue;
        const x0 = d - 0.5 + 0.08, x1 = d + 0.5 - 0.08;
        if (sx < x0) continue;
        const k = kick(t, SCAN[0] + (SCAN[1] - SCAN[0]) * E.inOutSine(clamp((x0 + 0.5) / 32)), 0.35);
        const isW = WKND.includes(d);
        const a = (0.16 + 0.5 * k + (isW ? 0.5 * wk : -0.08 * wk)) * fade;
        rr(ctx, x0, r + 0.2, x1 - x0, 0.6, 0.14); fill(ctx, rgba(C.livre, a * 0.55));
        rr(ctx, x0, r + 0.2, x1 - x0, 0.6, 0.14); stroke(ctx, rgba(isW && wk > 0 ? C.lime : C.livre, Math.min(1, a * 1.4)), 0.035);
      }
      if (wk > 0) {
        rr(ctx, 8 + 0.02, -0.1, 1.96, NR + 0.2, 0.2); stroke(ctx, rgba(C.lime, wk * fade), 0.06);
      }
    });
    // o feixe: uma cortina de luz atravessando o tabuleiro
    if (su > 0 && su < 1) {
      const a0 = proj(cam, sx, -1.6, 0), a1 = proj(cam, sx, 10.4, 0), b1 = proj(cam, sx, 10.4, 2.4), b0 = proj(cam, sx, -1.6, 2.4);
      const g = ctx.createLinearGradient(0, Math.min(b0[1], b1[1]), 0, Math.max(a0[1], a1[1]));
      g.addColorStop(0, rgba(C.lime, 0)); g.addColorStop(1, rgba(C.lime, 0.22));
      polyPath(ctx, [a0, a1, b1, b0]); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); stroke(ctx, C.limeL, 5);
    }
  }

  /** Volumes de luz das visões dia / semana / mês. */
  function drawViewLight(ctx, cam, t) {
    const a = p(t, T.views - 0.1, T.views + 0.2) * (1 - p(t, T.filters - 0.3, T.filters + 0.1));
    if (a <= 0) return;
    const dU = E.inOutCubic(p(t, T.views + 2 * BT - 0.2, T.views + 2 * BT + 0.3)), mU = E.inOutCubic(p(t, T.views + BAR - 0.2, T.views + BAR + 0.6));
    const x0 = lerp(lerp(TODAY - 1, 3, dU), -0.2, mU), x1 = lerp(lerp(TODAY, 10, dU), 31.2, mU);
    const hgt = lerp(2.2, 1.0, mU);
    const P = (x, y, h) => proj(cam, x, y, h);
    const pts = [P(x0, -1.5, 0), P(x1, -1.5, 0), P(x1, 10.3, 0), P(x0, 10.3, 0), P(x0, -1.5, hgt), P(x1, -1.5, hgt), P(x1, 10.3, hgt), P(x0, 10.3, hgt)];
    polyPath(ctx, hull(pts)); ctx.fillStyle = rgba(C.lime, 0.07 * a); ctx.fill();
    onPlane(ctx, cam, 0.01, () => { rr(ctx, x0, -1.5, x1 - x0, 11.8, 0.2); stroke(ctx, rgba(C.lime, 0.85 * a), 0.05); });
    // arestas verticais do volume
    for (const [x, y] of [[x0, 10.3], [x1, 10.3], [x0, -1.5], [x1, -1.5]]) {
      const q0 = P(x, y, 0), q1 = P(x, y, hgt);
      const g = ctx.createLinearGradient(0, q0[1], 0, q1[1]);
      g.addColorStop(0, rgba(C.lime, 0.6 * a)); g.addColorStop(1, rgba(C.lime, 0));
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.stroke();
    }
  }

  function drawBlocks(ctx, cam, t) {
    const flat = hzOf(cam) < 0.02;
    const sn = Math.sin(cam.th);
    // ordem do pintor: linhas de trás para a frente; dentro da linha, conforme o giro
    const order = RES.map((b, i) => i).sort((i, j) => (RES[i].r - RES[j].r) || (sn >= 0 ? RES[i].x0 - RES[j].x0 : RES[j].x0 - RES[i].x0));
    for (const i of order) {
      const b = RES[i];
      if (t < SNAP[i] - 0.2) continue;
      const st = ST[b.st];
      const s = blockState(b, i, t);
      // encaixe: desliza de fora do quadro e trava no lugar
      const su = p(t, SNAP[i] - 0.17, SNAP[i]);
      const dir = b.r % 2 ? -1 : 1;
      const dx = (1 - E.inCubic(su)) * 16 * dir;
      const sq = kick(t, SNAP[i], 0.2);
      const x0 = b.x0 + dx + sq * 0.12 * dir, x1 = b.x1 + dx - sq * 0.05 * dir;
      const r = 0.16;
      ctx.save();
      ctx.globalAlpha *= s.a;
      let top = st.top;
      if (s.fw > 0.01) top = mix(st.top, C.lime, s.fw * 0.85);
      if (!flat) prism(ctx, cam, x0, b.y0, x1, b.y1, 0, s.h, r, s.fw > 0.01 ? mix(st.sideL, C.limeD, s.fw * 0.8) : st.sideL, st.sideR);
      onPlane(ctx, cam, flat ? 0 : s.h, () => {
        if (s.glowB > 0.01) { rr(ctx, x0 - 0.12, b.y0 - 0.12, x1 - x0 + 0.24, b.y1 - b.y0 + 0.24, 0.26); stroke(ctx, rgba(C.lime, s.glowB), 0.07); }
        rr(ctx, x0, b.y0, x1 - x0, b.y1 - b.y0, r); fill(ctx, top);
        if (st.border) { rr(ctx, x0 + 0.02, b.y0 + 0.02, x1 - x0 - 0.04, b.y1 - b.y0 - 0.04, r); stroke(ctx, C.lime, 0.045); }
        if (st.hatch) {
          ctx.save(); rr(ctx, x0, b.y0, x1 - x0, b.y1 - b.y0, r); ctx.clip();
          ctx.beginPath(); for (let x = x0 - 1; x < x1 + 1; x += 0.22) { ctx.moveTo(x, b.y1); ctx.lineTo(x + 0.7, b.y0); }
          stroke(ctx, 'rgba(255,255,255,0.08)', 0.06); ctx.restore();
        }
        // brilho do encaixe
        if (sq > 0.02) { rr(ctx, x0 - 0.06, b.y0 - 0.06, x1 - x0 + 0.12, b.y1 - b.y0 + 0.12, 0.2); stroke(ctx, rgba(C.white, sq), 0.06); }
        circle(ctx, x0 + 0.3, (b.y0 + b.y1) / 2, 0.08);
        if (st.border) stroke(ctx, st.text, 0.03); else fill(ctx, st.text);
        const len = x1 - x0;
        if (len > 1.5) {
          ptxt(ctx, b.guest, x0 + 0.48, (b.y0 + b.y1) / 2 + 0.02, 0.2, { weight: 800, color: st.text, ls: 0.005 });
          if (len > 2.6) ptxt(ctx, b.code, x0 + 0.48, (b.y0 + b.y1) / 2 + 0.24, 0.14, { weight: 700, color: st.border ? C.grayL : rgba(C.ink, 0.65), ls: 0.004 });
        } else ptxt(ctx, b.code === 'MANUTENÇÃO' ? 'MANUT.' : b.guest.split(' ')[0], x0 + 0.48, (b.y0 + b.y1) / 2 + 0.07, 0.17, { weight: 800, color: st.text });
      });
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ partículas: perguntas → células
  function shards(ctx, t) {
    const u0 = T.build - 0.04;
    if (t < u0 || t > T.build + 0.6) return;
    const cam = camAt(t);
    for (let c = 0; c < 14; c++) for (let r = 0; r < NR; r++) {
      const i = c * NR + r;
      const a = ASKS[i % ASKS.length];
      const sx = a.x + hash(i, 3) * a.w, sy = a.y + (hash(i, 4) - 0.5) * 60;
      const t0 = u0 + hash(i, 5) * 0.06, t1 = T.build + 0.12 + c * 0.018 + r * 0.008 + 0.2;
      const u = p(t, t0, t1);
      if (u <= 0 || u >= 1) continue;
      const e = E.inOutCubic(u);
      const [tx, ty] = proj(cam, c + 0.5, r + 0.5, 0);
      const mx = (sx + tx) / 2 + (hash(i, 6) - 0.5) * 500, my = (sy + ty) / 2 + (hash(i, 7) - 0.5) * 300;
      const x = lerp(lerp(sx, mx, e), lerp(mx, tx, e), e), y = lerp(lerp(sy, my, e), lerp(my, ty, e), e);
      const sz = lerp(14, cam.s * 0.86, e);
      ctx.save(); ctx.translate(x, y); ctx.rotate((1 - e) * (hash(i, 8) - 0.5) * 6);
      ctx.fillStyle = mix(hash(i, 9) < 0.2 ? C.lime : C.white, '#1C1C1C', E.inQuad(e));
      ctx.globalAlpha = 0.9;
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ voucher
  const VC = { x: 110, y: 520, w: 860, h: 1000 };
  const VT = [T.voucher + 0.25, T.voucher + 0.85];   // o bloco se desdobra no cartão
  const VOUT = [T.finale - 0.1, T.finale + 0.32];     // e volta para o tabuleiro
  function voucherMatrix(cam, t) {
    const b = HERO, s = blockState(b, 0, t);
    const m = planeM(cam, s.h);
    // topo do bloco em coordenadas do cartão (0..VC.w, 0..VC.h)
    const sx = (b.x1 - b.x0) / VC.w, sy = (b.y1 - b.y0) / VC.h;
    const A = [m[0] * sx, m[1] * sx, m[2] * sy, m[3] * sy, m[0] * b.x0 + m[2] * b.y0 + m[4], m[1] * b.x0 + m[3] * b.y0 + m[5]];
    const B = [1, 0, 0, 1, VC.x, VC.y];
    const u = E.inOutCubic(p(t, VT[0], VT[1])) * (1 - E.inOutCubic(p(t, VOUT[0], VOUT[1])));
    return { m: A.map((v, i) => lerp(v, B[i], u)), u };
  }
  function drawVoucher(ctx, cam, t) {
    if (t < VT[0] || t > VOUT[1]) return;
    const { m, u } = voucherMatrix(cam, t);
    const ca = p(u, 0.55, 1);   // conteúdo aparece quando o cartão já está quase de frente
    const lt = t - VT[1];
    ctx.save();
    ctx.transform(...m);
    // cartão: começa preto com borda limão (o bloco hospedado) e vira papel
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60 * u; ctx.shadowOffsetY = 30 * u;
    rr(ctx, 0, 0, VC.w, VC.h, 40); fill(ctx, mix('#111111', C.paper, p(u, 0.3, 0.8)));
    ctx.restore();
    rr(ctx, 0, 0, VC.w, VC.h, 40); stroke(ctx, rgba(C.lime, 1 - p(u, 0.5, 0.9)), 6 / Math.max(0.05, Math.abs(m[0])));
    if (ca > 0) {
      ctx.save(); ctx.globalAlpha *= ca;
      // faixa superior
      ctx.save(); rr(ctx, 0, 0, VC.w, VC.h, 40); ctx.clip();
      ctx.fillStyle = C.ink; ctx.fillRect(0, 0, VC.w, 128);
      ctx.restore();
      txt(ctx, 'VOUCHER DE RESERVA', 48, 78, { size: 30, weight: 800, color: C.lime, ls: 3 });
      txt(ctx, HERO.code, VC.w - 48, 78, { size: 30, weight: 800, color: C.white, align: 'right', ls: 1 });
      const row = (i) => p(lt, -0.15 + i * (BT / 4), 0.15 + i * (BT / 4));
      // status
      const s1 = E.outBack(row(0));
      if (s1 > 0) {
        ctx.save(); ctx.translate(48, 196); ctx.scale(s1, s1);
        rr(ctx, 0, -30, 252, 60, 30); fill(ctx, C.lime); circle(ctx, 32, 0, 8); fill(ctx, C.ink);
        txt(ctx, 'CONFIRMADA', 54, 9, { size: 24, weight: 800, color: C.ink, ls: 1.5 });
        rr(ctx, 270, -30, 236, 60, 30); fill(ctx, C.ink); circle(ctx, 302, 0, 8); stroke(ctx, C.lime, 3);
        txt(ctx, 'HOSPEDADA', 324, 9, { size: 24, weight: 800, color: C.lime, ls: 1.5 });
        ctx.restore();
      }
      typeText(ctx, 'HÓSPEDE PRINCIPAL', 48, 292, row(1), { size: 22, weight: 700, color: C.grayD, ls: 2 });
      riseLine(ctx, [{ s: 'Ana Julia Costa' }], 46, 370, row(1), 0, { size: 70, color: C.ink });
      typeText(ctx, '2 ADULTOS · 0 CRIANÇAS', 48, 422, row(2), { size: 26, weight: 800, color: C.grayD, ls: 1.5 });
      // picote
      const dv = row(3);
      if (dv > 0) {
        ctx.save(); ctx.setLineDash([10, 12]);
        ctx.beginPath(); ctx.moveTo(48, 474); ctx.lineTo(48 + (VC.w - 96) * E.outCubic(dv), 474); stroke(ctx, '#BDBDB4', 4);
        ctx.restore();
        circle(ctx, 0, 474, 26); fill(ctx, '#0A0A0A'); circle(ctx, VC.w, 474, 26); fill(ctx, '#0A0A0A');
      }
      typeText(ctx, 'BICA D\'ÁGUA 01 · CASAL', 48, 540, row(3), { size: 28, weight: 800, color: C.ink, ls: 1.5 });
      const dd = row(4);
      if (dd > 0) {
        riseLine(ctx, [{ s: '06/10' }], 46, 650, dd, 0, { size: 92, fam: MONO, weight: 800, ls: -2, color: C.ink });
        const ax = 46 + tw(ctx, '06/10', MONO, 92, 800, -2) + 26;
        ctx.save(); ctx.globalAlpha *= dd; ctx.beginPath(); ctx.moveTo(ax, 618); ctx.lineTo(ax + 54 * E.outCubic(dd), 618);
        ctx.moveTo(ax + 54 * E.outCubic(dd) - 16, 602); ctx.lineTo(ax + 54 * E.outCubic(dd), 618); ctx.lineTo(ax + 54 * E.outCubic(dd) - 16, 634); stroke(ctx, C.ink, 7); ctx.restore();
        riseLine(ctx, [{ s: '10/10' }], ax + 84, 650, row(5), 0, { size: 92, fam: MONO, weight: 800, ls: -2, color: C.ink });
      }
      const c4 = E.outBack(row(6));
      if (c4 > 0) { ctx.save(); ctx.translate(48, 712); ctx.scale(c4, c4); rr(ctx, 0, -28, 198, 56, 28); fill(ctx, C.ink); txt(ctx, '4 DIÁRIAS', 26, 9, { size: 24, weight: 800, color: C.lime, ls: 1.5 }); ctx.restore(); }
      typeText(ctx, 'CHECK-IN 14:00 · CHECK-OUT 11:00', 270, 721, row(6), { size: 24, weight: 800, color: C.grayD, ls: 1 });
      const vl = row(7);
      if (vl > 0) {
        ctx.save(); ctx.globalAlpha *= vl; ctx.beginPath(); ctx.moveTo(48, 790); ctx.lineTo(VC.w - 48, 790); stroke(ctx, '#D6D6CE', 3); ctx.restore();
        typeText(ctx, 'VALOR TOTAL DAS DIÁRIAS', 48, 846, vl, { size: 22, weight: 700, color: C.grayD, ls: 2 });
        txt(ctx, brl(1920 * E.outCubic(p(lt, 0.7, 1.15))), VC.w - 48, 854, { size: 54, weight: 800, color: C.ink, align: 'right', ls: -1 });
      }
      // voucher em PDF e envio por e-mail
      const b1 = E.outBack(row(9)), b2 = E.outBack(row(10));
      if (b1 > 0) {
        ctx.save(); ctx.translate(48 + 180, 930); ctx.scale(b1, b1);
        rr(ctx, -180, -38, 360, 76, 38); fill(ctx, C.lime);
        ctx.beginPath(); ctx.moveTo(-130, -16); ctx.lineTo(-130, 10); ctx.moveTo(-142, -2); ctx.lineTo(-130, 10); ctx.lineTo(-118, -2); ctx.moveTo(-144, 18); ctx.lineTo(-116, 18); stroke(ctx, C.ink, 5);
        txt(ctx, 'VOUCHER PDF', -98, 10, { size: 26, weight: 800, color: C.ink, ls: 1.5 });
        ctx.restore();
      }
      if (b2 > 0) {
        ctx.save(); ctx.translate(VC.w - 48 - 180, 930); ctx.scale(b2, b2);
        rr(ctx, -180, -38, 360, 76, 38); fill(ctx, C.ink);
        rr(ctx, -148, -14, 36, 26, 4); stroke(ctx, C.lime, 4); ctx.beginPath(); ctx.moveTo(-148, -12); ctx.lineTo(-130, 2); ctx.lineTo(-112, -12); stroke(ctx, C.lime, 4);
        txt(ctx, 'POR E-MAIL', -94, 10, { size: 26, weight: 800, color: C.white, ls: 1.5 });
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ títulos e sobreposições
  function topScrim(ctx, a) {
    if (a <= 0) return;
    const g = ctx.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, `rgba(5,5,5,${0.92 * a})`); g.addColorStop(0.7, `rgba(5,5,5,${0.6 * a})`); g.addColorStop(1, 'rgba(5,5,5,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 720);
  }
  function title2(ctx, t, l1, l2, t1, t2, tout, y = 360, size = 104) {
    riseLine(ctx, l1, 540, y, p(t, t1 - 0.02, t1 + 0.42), p(t, tout, tout + 0.28), { size, color: C.white, align: 'center' });
    riseLine(ctx, l2, 540, y + size * 1.06, p(t, t2 - 0.02, t2 + 0.42), p(t, tout + 0.04, tout + 0.32), { size, color: C.white, align: 'center' });
  }
  function modeSwitch(ctx, t) {
    const a = E.outBack(p(t, T.views - 0.15, T.views + 0.15)) * (1 - E.inCubic(p(t, T.filters - 0.25, T.filters)));
    if (a <= 0) return;
    const modes = ['DIA', 'SEMANA', 'MÊS'], xs = [0, 150, 360], ws = [128, 196, 150];
    const sel = E.inOutCubic(p(t, T.views + 2 * BT - 0.12, T.views + 2 * BT + 0.12)) + E.inOutCubic(p(t, T.views + BAR - 0.12, T.views + BAR + 0.12));
    const sx = sel < 1 ? lerp(xs[0], xs[1], sel) : lerp(xs[1], xs[2], sel - 1), sw = sel < 1 ? lerp(ws[0], ws[1], sel) : lerp(ws[1], ws[2], sel - 1);
    ctx.save(); ctx.translate(540 - 255, 600); ctx.scale(a, a);
    rr(ctx, -12, -42, 534, 84, 42); fill(ctx, '#151515'); rr(ctx, -12, -42, 534, 84, 42); stroke(ctx, C.line2, 3);
    rr(ctx, sx, -32, sw, 64, 32); fill(ctx, C.lime);
    const cur = Math.round(sel);
    modes.forEach((m, i) => txt(ctx, m, xs[i] + ws[i] / 2, 10, { size: 28, weight: 800, color: i === cur ? C.ink : C.grayL, align: 'center', ls: 2 }));
    ctx.restore();
    const labels = ['QUINTA-FEIRA, 8 DE OUTUBRO', 'SEMANA 4 A 10 DE OUT 2026', 'OUTUBRO 2026'];
    const lt = [T.views, T.views + 2 * BT, T.views + BAR][cur];
    typeText(ctx, labels[cur], 540, 690, p(t, lt, lt + 0.35) * a, { size: 26, weight: 800, color: C.grayL, ls: 3, align: 'center' });
  }
  function filterWord(ctx, t) {
    FILTERS.forEach((f, i) => {
      const t0 = FILTER_T[i], t1 = i + 1 < FILTERS.length ? FILTER_T[i + 1] : FILTER_END;
      riseLine(ctx, [{ s: f.word, color: f.color }], 540, 470, p(t, t0 - 0.04, t0 + 0.3), p(t, t1 - 0.12, t1 + 0.08), { size: fit(ctx, f.word, 900, 150), color: f.color, align: 'center' });
    });
    const a = p(t, T.filters - 0.1, T.filters + 0.2) * (1 - p(t, FILTER_END - 0.1, FILTER_END + 0.2));
    if (a > 0) typeText(ctx, 'FILTRO POR STATUS', 540, 300, a, { size: 28, weight: 800, color: C.grayL, ls: 5, align: 'center' });
  }

  // ------------------------------------------------------------ final
  const FIN = { logo: T.finale + BAR, x: 540, y: 560, d: 330 };
  function finale(ctx, t) {
    const lt = t - FIN.logo;
    if (lt < -0.3) return;
    const sc = ctx.createLinearGradient(0, 0, 0, 1380);
    const a = p(lt, -0.3, 0.2);
    sc.addColorStop(0, `rgba(5,5,5,${0.95 * a})`); sc.addColorStop(0.75, `rgba(5,5,5,${0.85 * a})`); sc.addColorStop(1, 'rgba(5,5,5,0)');
    ctx.fillStyle = sc; ctx.fillRect(0, 0, W, 1380);
    const beat = Math.floor(lt / BT), pulse = lt > 0 && lt < 2 * BAR ? kick(lt, beat * BT, 0.22) : 0;
    radial(ctx, FIN.x, FIN.y, 420, C.lime, (0.2 + 0.1 * pulse + 0.35 * kick(lt, 0, 0.8)) * a);
    // anel de impacto
    const ru = p(lt, 0, 0.8);
    if (ru > 0 && ru < 1) { circle(ctx, FIN.x, FIN.y, lerp(FIN.d * 0.5, 900, E.outExpo(ru))); stroke(ctx, rgba(C.lime, 1 - ru), 10 * (1 - ru) + 1); }
    logo(ctx, FIN.x, FIN.y, FIN.d, { scale: E.outBack(p(lt, 0, 0.4), 2.2) * (1 + 0.025 * pulse) });
    typeText(ctx, 'GESTÃO DE RESERVAS', 540, 830, p(lt, 0.15, 0.6), { size: 30, weight: 800, color: C.lime, ls: 6, align: 'center' });
    const NS = 112, w1 = tw(ctx, 'FAZLO ', DISPLAY, NS, 900, -2.8), w2 = tw(ctx, 'Hospeda', DISPLAY, NS, 700, -2.8), nx = 540 - (w1 + w2) / 2;
    riseLine(ctx, [{ s: 'FAZLO ' }], nx, 960, p(lt, 0.22, 0.7), 0, { size: NS, weight: 900, color: C.white, ls: -2.8 });
    riseLine(ctx, [{ s: 'Hospeda' }], nx + w1, 960, p(lt, 0.3, 0.78), 0, { size: NS, weight: 700, color: C.white, ls: -2.8 });
    riseLine(ctx, [{ s: 'Cada reserva ' }, { s: 'no seu lugar.', color: C.lime }], 540, 1062, p(lt, 0.5, 0.95), 0, { size: 62, weight: 800, color: C.white, align: 'center', ls: -1.4 });
    const ca = p(lt, 0.85, 1.2);
    if (ca > 0) {
      const label = 'CONHEÇA O SISTEMA · LINK NA BIO';
      const w = tw(ctx, label, MONO, 29, 800, 2.5) + 96;
      const s = E.outBack(ca) * (1 + 0.035 * Math.max(0, Math.sin((lt - 1.3) * 4.4)) * (lt > 1.3 ? 1 : 0));
      ctx.save(); ctx.translate(540, 1190); ctx.scale(s, s);
      rr(ctx, -w / 2, -45, w, 90, 45); fill(ctx, C.lime);
      txt(ctx, label, -w / 2 + 48, 11, { size: 29, weight: 800, color: C.ink, ls: 2.5 });
      ctx.restore();
    }
    // brilho que atravessa o nome
    const gl = p(lt, 1.5, 2.2);
    if (gl > 0 && gl < 1) {
      const gx = lerp(nx - 200, nx + w1 + w2 + 200, E.inOutCubic(gl));
      const g = ctx.createLinearGradient(gx - 120, 0, gx + 120, 0);
      g.addColorStop(0, 'rgba(175,250,39,0)'); g.addColorStop(0.5, 'rgba(175,250,39,0.95)'); g.addColorStop(1, 'rgba(175,250,39,0)');
      setFont(ctx, DISPLAY, NS, 900, 'left', -2.8); ctx.fillStyle = g; ctx.fillText('FAZLO ', nx, 960);
      setFont(ctx, DISPLAY, NS, 700, 'left', -2.8); ctx.fillText('Hospeda', nx + w1, 960);
    }
  }

  // ------------------------------------------------------------ cena do tabuleiro
  function sceneBoard(ctx, t) {
    const cam = camAt(t);
    bgSpace(ctx, t, 0.1 + 0.12 * kick(t, T.drop, 1.2));
    ctx.save();
    applyShake(ctx, t);
    drawBoard(ctx, cam, t);
    drawFree(ctx, cam, t);
    drawViewLight(ctx, cam, t);
    // varredura de luz no drop
    const dw = p(t, T.drop, T.drop + 0.6);
    if (dw > 0 && dw < 1) {
      const x = lerp(-1, 32, E.outCubic(dw));
      onPlane(ctx, cam, 0.01, () => { ctx.beginPath(); ctx.moveTo(x, -1.6); ctx.lineTo(x, 10.4); stroke(ctx, rgba(C.lime, 1 - dw), 0.12); });
    }
    drawBlocks(ctx, cam, t);
    ctx.restore();
    shards(ctx, t);
    // títulos
    const scrimA = t < T.drop ? 0.6 : 1;
    if (t < T.finale + BAR - 0.3) topScrim(ctx, scrimA);
    title2(ctx, t, [{ s: 'Cada reserva' }], [{ s: 'no seu ', color: C.white }, { s: 'lugar.', color: C.lime }], T.build + 0.3, T.build + BAR, T.drop - 0.05);
    title2(ctx, t, [{ s: 'Tem vaga?' }], [{ s: 'Está ', color: C.white }, { s: 'à vista.', color: C.lime }], T.scan + BT, T.scan + BAR, T.views - 0.3);
    title2(ctx, t, [{ s: 'Do dia' }], [{ s: 'ao ', color: C.white }, { s: 'mês.', color: C.lime }], T.views, T.views + BAR, T.filters - 0.3, 380, 92);
    modeSwitch(ctx, t);
    filterWord(ctx, t);
    title2(ctx, t, [{ s: 'Cada hóspede,' }], [{ s: 'cada ', color: C.white }, { s: 'detalhe.', color: C.lime }], T.voucher + 0.1, T.voucher + 2 * BT, T.finale - 0.15, 300, 92);
    // fim de semana em destaque
    const wa = p(t, T.scan + BAR, T.scan + BAR + 0.3) * (1 - p(t, T.views - 0.3, T.views));
    if (wa > 0) {
      const cam2 = camAt(t), q = proj(cam2, 9.5, 4.5, 2.4);
      ctx.save(); ctx.globalAlpha *= wa; ctx.translate(q[0], q[1] - 30);
      rr(ctx, -150, -34, 300, 68, 34); fill(ctx, C.lime);
      txt(ctx, 'FIM DE SEMANA', 0, 10, { size: 26, weight: 800, color: C.ink, align: 'center', ls: 2 });
      ctx.beginPath(); ctx.moveTo(-12, 33); ctx.lineTo(0, 48); ctx.lineTo(12, 33); ctx.closePath(); fill(ctx, C.lime);
      ctx.restore();
    }
    drawVoucher(ctx, cam, t);
    finale(ctx, t);
  }

  // =====================================================================
  // LINHA DO TEMPO, MOTION BLUR E RENDER
  // =====================================================================
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    if (t < T.build - 0.04) sceneHook(ctx, t);
    else {
      sceneBoard(ctx, t);
      if (t < T.build + 0.12) { ctx.save(); ctx.globalAlpha = 1 - p(t, T.build - 0.04, T.build + 0.12); sceneHook(ctx, t); ctx.restore(); }
    }
  }
  const BLUR = [
    [0, 0.14, 10, 1 / 60],
    [T.build - 0.1, T.build + 0.7, 16, 1 / 50],
    [T.build + 0.7, T.drop - 0.2, 12, 1 / 60],
    [T.drop - 0.2, T.drop + 0.8, 18, 1 / 45],
    [T.scan + BAR - 0.05, T.scan + BAR + 0.4, 12, 1 / 60],
    [T.views - 0.3, T.views + BAR + 0.7, 14, 1 / 50],
    [T.filters - 0.3, T.filters + 0.5, 14, 1 / 50],
    [T.voucher - 0.3, T.voucher + 0.95, 14, 1 / 50],
    [T.finale - 0.15, T.finale + 1.2, 14, 1 / 50],
    [FIN.logo - 0.1, FIN.logo + 0.45, 10, 1 / 60],
  ];
  function shutter(t) {
    for (const [a, b, n, dt] of BLUR) if (t >= a && t < b) return { n, dt };
    return { n: 4, dt: 1 / 120 };
  }
  let bufS = null, bufA = null;
  function buffers() {
    if (!bufS) { const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }; bufS = mk(); bufA = mk(); }
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
      frame(sctx, clamp(t + (k / (sh.n - 1) - 0.5) * sh.dt, 0, DURATION - 1e-4));
      actx.globalAlpha = 1 / (k + 1);
      actx.drawImage(S, 0, 0);
    }
    actx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(A, 0, 0);
  }

  // ------------------------------------------------------------ capa (Instagram)
  function renderCover(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    const t = T.scan - 0.4;   // tabuleiro 3D já montado
    const cam = { fx: 8.2, fy: 4.8, s: 78, th: -0.5, k: 0.48, cx: 540, cy: 1160 };
    bgSpace(ctx, 3, 0.16);
    drawBoard(ctx, cam, t);
    drawBlocks(ctx, cam, t);
    topScrim(ctx, 1);
    typeText(ctx, 'GESTÃO DE RESERVAS', 540, 400, 1, { size: 32, weight: 800, color: C.lime, ls: 7, align: 'center' });
    txt(ctx, 'Cada reserva', 540, 540, { fam: DISPLAY, size: 122, weight: 900, color: C.white, align: 'center', ls: -3 });
    const w1 = tw(ctx, 'no seu ', DISPLAY, 122, 900, -3), w2 = tw(ctx, 'lugar.', DISPLAY, 122, 900, -3);
    txt(ctx, 'no seu ', 540 - (w1 + w2) / 2, 668, { fam: DISPLAY, size: 122, weight: 900, color: C.white, ls: -3 });
    txt(ctx, 'lugar.', 540 - (w1 + w2) / 2 + w1, 668, { fam: DISPLAY, size: 122, weight: 900, color: C.lime, ls: -3 });
    const g = ctx.createLinearGradient(0, 1380, 0, 1700);
    g.addColorStop(0, 'rgba(5,5,5,0)'); g.addColorStop(1, 'rgba(5,5,5,0.95)');
    ctx.fillStyle = g; ctx.fillRect(0, 1380, W, 540);
    radial(ctx, 380, 1555, 200, C.lime, 0.2);
    logo(ctx, 380, 1555, 150);
    txt(ctx, 'FAZLO', 480, 1548, { fam: DISPLAY, size: 64, weight: 900, color: C.white, ls: -1.6 });
    txt(ctx, 'Hospeda', 480 + tw(ctx, 'FAZLO ', DISPLAY, 64, 900, -1.6), 1548, { fam: DISPLAY, size: 64, weight: 700, color: C.white, ls: -1.6 });
    txt(ctx, 'SISTEMA DE GESTÃO', 482, 1596, { size: 22, weight: 800, color: C.grayL, ls: 4 });
  }

  // ------------------------------------------------------------ cues (som)
  function buildCues() {
    CUES.length = 0; SHAKES.length = 0;
    // GANCHO
    cue(0, 'slam', { v: 1 }); SHAKES.push([0.02, 10, 0.25]);
    cue(BT, 'rise', { v: 0.6 });
    ASK_T.forEach((ta, i) => cue(ta, 'ping', { i, n: ASKS.length, pan: clamp((ASKS[i].x + ASKS[i].w / 2 - 540) / 540, -1, 1) }));
    cue(T.build - 0.04, 'shatter', { v: 1 }); SHAKES.push([T.build, 12, 0.3]);
    cue(T.build + 0.12, 'cells', { d: 0.55 });
    cue(T.build + 0.35, 'type', { d: 0.6, n: 30 });
    cue(T.build + 0.3, 'rise', { v: 0.5 }); cue(T.build + BAR, 'rise', { v: 0.5 });
    // ENCAIXES
    RES.forEach((b, i) => cue(SNAP[i], 'snap', { i, st: b.st, pan: clamp(((b.x0 + b.x1) / 2 - 5.3) / 9, -1, 1), dir: b.r % 2 ? -1 : 1 }));
    // DROP
    cue(T.drop, 'drop', { v: 1 }); SHAKES.push([T.drop, 24, 0.45]);
    cue(T.drop + 0.02, 'extrude', { d: 0.6 });
    cue(T.drop - 0.1, 'orbit', { d: 0.72 });
    // VARREDURA
    cue(SCAN[0], 'scan', { d: SCAN[1] - SCAN[0] });
    let nFree = 0;
    for (let d = 1; d <= ND; d++) {
      const free = Array.from({ length: NR }, (_, r) => nightFree(r, d)).filter(Boolean).length;
      if (!free) continue;
      const tx = SCAN[0] + (SCAN[1] - SCAN[0]) * E.inOutSine(clamp((d - 0.5 + 0.08 + 0.5) / 32));
      if (d % 2 === 0) cue(tx, 'free', { k: nFree++, n: free, pan: clamp((d - 16) / 16, -1, 1) });
    }
    cue(T.scan + BT, 'rise', { v: 0.5 }); cue(T.scan + BAR, 'rise', { v: 0.6 });
    cue(T.scan + BAR - 0.1, 'orbit', { d: 0.4 });
    cue(T.scan + BAR, 'weekend', { v: 1 });
    // VISÕES
    cue(T.views - 0.25, 'zoom', { d: 0.5, dir: 1 }); cue(T.views, 'click', { k: 0 });
    cue(T.views + 2 * BT - 0.2, 'zoom', { d: 0.5, dir: -1 }); cue(T.views + 2 * BT, 'click', { k: 1 });
    cue(T.views + BAR - 0.2, 'zoom', { d: 0.8, dir: -1, big: true }); cue(T.views + BAR, 'click', { k: 2 });
    cue(T.views, 'type', { d: 0.35, n: 26 }); cue(T.views + 2 * BT, 'type', { d: 0.35, n: 25 }); cue(T.views + BAR, 'type', { d: 0.35, n: 12 });
    cue(T.views, 'rise', { v: 0.5 }); cue(T.views + BAR, 'rise', { v: 0.5 });
    // FILTROS
    cue(T.filters - 0.25, 'orbit', { d: 0.65 });
    FILTERS.forEach((f, i) => cue(FILTER_T[i], 'filter', { k: i, n: RES.filter(f.match).length }));
    cue(FILTER_END, 'settle', { v: 0.7 });
    cue(T.filters, 'type', { d: 0.3, n: 17 });
    // VOUCHER
    cue(T.voucher - 0.25, 'zoom', { d: 0.8, dir: 1 });
    cue(T.voucher + 0.15, 'lift', { d: 0.45 });
    cue(VT[0], 'unfold', { d: VT[1] - VT[0] });
    for (let i = 0; i <= 10; i++) if ([0, 2, 6, 9, 10].includes(i)) cue(VT[1] - 0.15 + i * (BT / 4) + 0.15, 'pop', { k: i });
    cue(VT[1], 'type', { d: 1.2, n: 60 });
    cue(VT[1] + 0.7, 'roll', { d: 0.45 });
    cue(T.voucher + 0.1, 'rise', { v: 0.5 }); cue(T.voucher + 2 * BT, 'rise', { v: 0.5 });
    // FINAL
    cue(VOUT[0], 'fold', { d: VOUT[1] - VOUT[0] });
    cue(T.finale + 0.05, 'pull', { d: 1.05 });
    cue(T.finale + 0.55, 'wave', { d: 0.7 });
    cue(FIN.logo, 'ding', { v: 1 }); cue(FIN.logo, 'boom', { v: 1 }); SHAKES.push([FIN.logo, 12, 0.35]);
    cue(FIN.logo + 0.15, 'type', { d: 0.45, n: 18 });
    cue(FIN.logo + 0.22, 'rise', { v: 0.5 }); cue(FIN.logo + 0.5, 'rise', { v: 0.4 });
    cue(FIN.logo + 0.85, 'pop', { k: 99, v: 1 });
    cue(FIN.logo + 1.5, 'glint', { d: 0.7 });
    CUES.sort((a, b) => a.t - b.t);
  }

  function init(img) {
    LOGO = img;
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    layoutHook(c.getContext('2d'));
    buildCues();
  }

  window.REEL02 = {
    init, renderAt, renderCover, DURATION, W, H, BPM, setDebugCam: (c) => { DEBUG_CAM = c; },
    cues: () => ({ bpm: BPM, duration: DURATION, sections: T, cues: CUES.slice() }),
  };
})();
