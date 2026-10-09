/* =====================================================================
   FAZLO Hospeda — REEL 05 "Da chegada à saída" — 9:16 (1080x1920)
   Check-in & check-out. Motor em Canvas 2D, determinístico: renderAt(ctx, t)
   desenha o quadro exato do instante t (s).

   Um dia inteiro na pousada em time-lapse: a paisagem é feita de camadas com
   paralaxe (serras, colinas com pinheiros, chalés, lago, estrada, mato em
   primeiro plano) e o céu atravessa aurora, meio-dia, pôr do sol, noite e a
   manhã seguinte, sempre em preto e limão. CHECK-IN nasce atrás da serra como
   um sol; os consumos sobem do chalé como lanternas e viram a constelação da
   comanda; CHECK-OUT se põe atrás da serra quando o carro parte; no fim, a
   logo nasce como o sol.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const BPM = 100, BT = 60 / BPM, BAR = 4 * BT;          // 1 tempo = 0,6 s · 1 compasso = 2,4 s
  const DURATION = 12 * BAR;                              // 28,8 s
  const T = { hook: 0, ready: BAR, checkin: 2 * BAR, stay: 3 * BAR, night: 4 * BAR, ficha: 5 * BAR, morning: 6 * BAR,
    pay: 7 * BAR, checkout: 8 * BAR, final: 9 * BAR, finale: 10 * BAR };
  const DISPLAY = "'R5 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'R5 Mono', 'JetBrains Mono', monospace";

  const C = {
    black: '#0A0A0A', ink: '#0A0A0A', lime: '#AFFA27', limeD: '#8CD10C', limeL: '#D8FF8A', limeDeep: '#5A8A0E', olive: '#3E5A12',
    white: '#FFFFFF', paper: '#F2F2EC', gray: '#8E8E88', grayD: '#5E5E59', grayL: '#B9B9B1',
    out: '#FF4D5E', checkin: '#3D8BFF', checkout: '#F5B638', livre: '#4CC067',
  };

  // ---------------------------------------------------------------- utilitários
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = (x) => x * x * (3 - 2 * x);
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
    return '#' + [0, 1, 2].map((i) => Math.round(lerp(A[i], B[i], t)).toString(16).padStart(2, '0')).join('');
  }
  function rgba(c, a) { const A = hex(c); return `rgba(${A[0]},${A[1]},${A[2]},${clamp(a)})`; }
  function hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, seed) { const i = Math.floor(x), f = x - i; return lerp(hash(i, seed), hash(i + 1, seed), smooth(f)); }
  function fbm(x, seed) { return vnoise(x, seed) * 0.58 + vnoise(x * 2.13, seed + 7) * 0.28 + vnoise(x * 4.7, seed + 13) * 0.14; }
  const kick = (t, t0, dur = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / dur) * 4));
  function brl(v, sign = '') {
    const c = Math.round(Math.abs(v) * 100);
    return `${sign}R$ ${Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${String(c % 100).padStart(2, '0')}`;
  }
  /** valor por keyframes [[t, v], ...] com easing suave */
  function keyed(keys, t, ease = E.inOutSine) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(p(t, keys[i - 1][0], keys[i][0])));
    return keys[keys.length - 1][1];
  }
  function keyed2(keys, t, ease = E.inOutSine) {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const u = ease(p(t, keys[i - 1][0], keys[i][0])); return [lerp(keys[i - 1][1], keys[i][1], u), lerp(keys[i - 1][2], keys[i][2], u)]; }
    const k = keys[keys.length - 1]; return [k[1], k[2]];
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
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.blur ?? 24; }
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
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = 30; }
    let cx = left;
    segs.forEach((s, i) => { setFont(ctx, s.fam || fam, size, s.weight || weight, 'left', ls); ctx.fillStyle = s.color || o.color; ctx.fillText(s.s, cx, y + off); cx += ws[i]; });
    ctx.restore();
    return total;
  }
  function lines(ctx, t, rows, o) {
    rows.forEach((r, i) => riseLine(ctx, r.segs, o.x ?? 540, o.y + i * (o.lh || o.size * 1.04), p(t, r.t - 0.02, r.t + 0.42),
      o.tout !== undefined ? p(t, o.tout + i * 0.04, o.tout + i * 0.04 + 0.3) : 0,
      { size: o.size, color: o.color || C.white, align: o.align || 'center', weight: o.weight, ls: o.ls, shadow: 'rgba(0,0,0,0.55)' }));
  }
  function chip(ctx, x, y, text, o) {
    const size = o.size || 24, w = tw(ctx, text, MONO, size, 800, o.ls ?? 2) + (o.dot ? size * 1.3 : 0) + size * 1.3, h = size * 1.9;
    const left = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    rr(ctx, left, y - h / 2, w, h, h / 2); fill(ctx, o.bg || 'rgba(255,255,255,0.06)');
    if (o.border) { rr(ctx, left, y - h / 2, w, h, h / 2); stroke(ctx, o.border, 2.5); }
    let tx = left + size * 0.65;
    if (o.dot) { circle(ctx, tx + size * 0.3, y, size * 0.26); fill(ctx, o.dot); tx += size * 1.3; }
    txt(ctx, text, tx, y + size * 0.36, { size, weight: 800, color: o.color || C.white, ls: o.ls ?? 2 });
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

  // =====================================================================
  // O CÉU: paletas do dia (sempre preto e limão) e o time-lapse
  // =====================================================================
  const SKY = {
    predawn: { top: '#030503', mid: '#0A1207', hor: '#2E4A16', stars: 0.85, win: 1, fire: 0.7, rim: 0.12, glow: 0.18 },
    night: { top: '#020302', mid: '#060A05', hor: '#101A09', stars: 1, win: 1, fire: 1, rim: 0, glow: 0.05 },
    dawn: { top: '#040604', mid: '#0E1709', hor: '#4E721B', stars: 0.45, win: 0.55, fire: 0.25, rim: 0.35, glow: 0.3 },
    morning: { top: '#091008', mid: '#1F330E', hor: '#A8E23C', stars: 0, win: 0, fire: 0, rim: 0.75, glow: 0.5 },
    noon: { top: '#0E180A', mid: '#2C4611', hor: '#C9F672', stars: 0, win: 0, fire: 0, rim: 1, glow: 0.55 },
    sunset: { top: '#050705', mid: '#16240A', hor: '#AFFA27', stars: 0.12, win: 0.75, fire: 0.2, rim: 1, glow: 0.85 },
    golden: { top: '#070B06', mid: '#243A0E', hor: '#D8FF8A', stars: 0, win: 0.35, fire: 0, rim: 0.9, glow: 0.75 },
  };
  const SKY_KEYS = [[0, 'predawn'], [0.75, 'dawn'], [2.0, 'morning'], [T.checkin, 'noon'], [7.9, 'noon'], [9.1, 'sunset'], [10.3, 'night'],
    [13.5, 'night'], [14.9, 'dawn'], [16.2, 'morning'], [T.checkout, 'noon'], [22.4, 'noon'], [23.7, 'golden'], [DURATION, 'golden']];
  function skyAt(t) {
    let i = 1;
    while (i < SKY_KEYS.length - 1 && t > SKY_KEYS[i][0]) i++;
    const [ta, na] = SKY_KEYS[i - 1], [tb, nb] = SKY_KEYS[i], u = E.inOutSine(p(t, ta, tb)), A = SKY[na], B = SKY[nb];
    const o = {};
    for (const k of Object.keys(A)) o[k] = typeof A[k] === 'string' ? mix(A[k], B[k], u) : lerp(A[k], B[k], u);
    return o;
  }
  // sol e lua (posição na tela, com um quase nada de paralaxe)
  const SUN = [[0, 250, 1180], [1.2, 290, 975], [2.6, 380, 770], [T.checkin, 840, 560], [7.9, 905, 720], [9.2, 950, 1015], [9.9, 970, 1190],
    [14.3, 170, 1190], [15.2, 230, 985], [16.5, 310, 800], [T.checkout, 640, 560], [22.2, 800, 650], [23.3, 870, 900], [23.9, 900, 1120]];
  const MOON = [[9.4, 95, 1010], [10.6, 120, 800], [13.2, 150, 565], [14.8, 230, 690]];
  // nuvens: deslocamento acumulado, rápido nos time-lapses
  const SUNBURST = (t) => kick(t, 1.2, 1.1) + 0.6 * kick(t, T.checkin, 0.9);
  const cloudOff = (t) => 55 * t + 900 * E.inOutSine(p(t, 7.6, 10.6)) + 800 * E.inOutSine(p(t, 13.0, 15.8)) + 500 * E.inOutSine(p(t, 21.6, 24.2));

  // =====================================================================
  // CÂMERA: pan (paralaxe), inclinação e aproximação
  // =====================================================================
  const CAMX = [[0, -110], [T.checkin, 0], [T.night, 70], [T.morning, 130], [T.checkout, 170], [T.finale, 215], [DURATION, 240]];
  const CAMY = [[0, 600], [0.3, 600], [2.25, 0], [DURATION, 0]];          // positivo = olhando para cima
  function zoomAt(t) {
    const night = E.inOutSine(p(t, T.night, T.night + 2.0)) * (1 - E.inOutSine(p(t, T.ficha, T.ficha + 0.8)));
    return { z: 1 + 0.2 * night + 0.045 * kick(t, T.checkin, 0.7) + 0.045 * kick(t, T.checkout, 0.7) + 0.03 * kick(t, T.finale, 0.9), night };
  }
  function view(t) {
    const cx = keyed(CAMX, t), cy = keyed(CAMY, t, E.inOutCubic), zz = zoomAt(t);
    const chalet = [OURS.x - cx * 0.5, PLATEAU + cy * 0.5 - OURS.h * 0.45];
    const zc = [lerp(540, chalet[0], 0.85), lerp(960, chalet[1], 0.85)];
    return {
      cx, cy, z: zz.z, zc,
      S(x, y, k) { const sx = x - cx * k, sy = y + cy * k; return [zc[0] + (sx - zc[0]) * zz.z, zc[1] + (sy - zc[1]) * zz.z]; },
      layer(ctx, k) { ctx.translate(zc[0], zc[1]); ctx.scale(zz.z, zz.z); ctx.translate(-zc[0] - cx * k, -zc[1] + cy * k); },
    };
  }

  // =====================================================================
  // A PAISAGEM
  // =====================================================================
  const X0 = -900, X1 = 2200;
  const RIDGES = [
    { k: 0.12, base: 1015, amp: 190, f: 1 / 430, seed: 3, haze: 0.5 },
    { k: 0.27, base: 1080, amp: 130, f: 1 / 310, seed: 11, haze: 0.74 },
  ];
  const ridgeY = (R, x) => R.base - R.amp * fbm(x * R.f + 10, R.seed);
  const PLATEAU = 1175;
  function hillY(x) {
    const y = 1190 - 70 * fbm(x / 240 + 3, 21);
    const w = smooth(clamp(1 - Math.abs(x - 600) / 330));
    return lerp(y, PLATEAU, clamp(w * 1.6));
  }
  const HOUSES = [
    { x: 405, w: 200, h: 88, kind: 'lodge' },
    { x: 565, w: 110, h: 124, kind: 'a', ours: true },
    { x: 690, w: 98, h: 110, kind: 'a', lit: 0.8 },
    { x: 805, w: 92, h: 102, kind: 'a', lit: 0.55 },
  ];
  const OURS = HOUSES[1];
  const PINES = [];
  for (let x = X0, i = 0; x < X1; i++) {
    x += 26 + hash(i, 40) * 34;
    if (x > 300 && x < 880 && hash(i, 41) < 0.8) continue;           // clareira da pousada
    PINES.push({ x, h: 52 + hash(i, 42) * 70, w: 0.36 + hash(i, 43) * 0.12 });
  }
  const STARS = Array.from({ length: 170 }, (_, i) => ({ x: hash(i, 60) * W, y: hash(i, 61) * 960, r: 0.8 + hash(i, 62) * 2.1, ph: hash(i, 63) * TAU }));
  const CLOUDS = Array.from({ length: 9 }, (_, i) => ({ x: hash(i, 70) * 1900, y: 160 + hash(i, 71) * 560, w: 260 + hash(i, 72) * 380, h: 34 + hash(i, 73) * 40 }));
  const FIREFLIES = Array.from({ length: 46 }, (_, i) => ({ x: hash(i, 80) * 1400 - 150, y: 1130 + hash(i, 81) * 520, ph: hash(i, 82) * TAU, sp: 0.4 + hash(i, 83) }));
  const GRASS = Array.from({ length: 150 }, (_, i) => ({ x: -140 + i * 9.2 + hash(i, 90) * 8, h: 70 + hash(i, 91) * 190 + (i % 7 === 0 ? 90 : 0), lean: (hash(i, 92) - 0.5) * 0.5, ph: hash(i, 93) * TAU }));

  function drawSky(ctx, t, S, V, noSun = false) {
    const hy = 1060 + V.cy * 0.1;
    const g = ctx.createLinearGradient(0, 0, 0, hy + 80);
    g.addColorStop(0, S.top); g.addColorStop(0.55, S.mid); g.addColorStop(1, S.hor);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // estrelas (somem de dia), com cintilação
    if (S.stars > 0.01) {
      for (const s of STARS) {
        const a = S.stars * (0.45 + 0.55 * Math.sin(t * 2.3 + s.ph) ** 2);
        circle(ctx, s.x, s.y + V.cy * 0.04, s.r); fill(ctx, rgba('#EEF7DC', a));
      }
      // estrela cadente quando a comanda vira constelação
      const sh = p(t, 12.25, 12.8);
      if (sh > 0 && sh < 1) {
        const x = lerp(900, 420, sh), y = lerp(180, 420, sh);
        const g2 = ctx.createLinearGradient(x, y, x + 220, y - 110);
        g2.addColorStop(0, rgba('#FFFFFF', 0.9 * (1 - sh))); g2.addColorStop(1, rgba('#FFFFFF', 0));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 220, y - 110); stroke(ctx, g2, 3);
      }
    }
    // lua crescente
    const ma = clamp(S.stars * 1.2) * p(t, MOON[0][0], MOON[0][0] + 0.6) * (1 - p(t, MOON[3][0] - 0.6, MOON[3][0]));
    if (ma > 0) {
      const [mx, my] = keyed2(MOON, t);
      radial(ctx, mx, my, 160, '#EEF7DC', 0.18 * ma);
      ctx.save(); ctx.globalAlpha *= ma;
      // crescente recortado (sem disco escuro por cima do halo)
      ctx.beginPath(); ctx.rect(mx - 60, my - 60, 120, 120); ctx.arc(mx + 17, my - 10, 38, 0, TAU, true); ctx.clip();
      circle(ctx, mx, my, 42); fill(ctx, '#EEF5E0');
      ctx.restore();
    }
    // sol limão com halo e raios
    const [sx, sy] = keyed2(SUN, t), suy = sy + V.cy * 0.06;
    const sa = noSun ? 0 : 1 - p(t, T.finale - 0.5, T.finale - 0.1);
    if (sa > 0 && suy < 1260) {
      // acima da serra o sol brilha; abaixo dela só tinge o horizonte
      const up = clamp((1210 - suy) / 200), day = 1 - S.stars;
      const burst = SUNBURST(t);
      radial(ctx, sx, suy, 620, C.lime, (0.06 + (0.12 + 0.26 * S.glow) * up + 0.25 * burst) * sa);
      radial(ctx, sx, suy, 200, C.limeL, (0.15 + 0.45 * up) * sa);
      const ra = sa * up * day * (0.1 + 0.12 * S.glow + 0.75 * burst);
      if (ra > 0.004) {
        ctx.save(); ctx.globalAlpha *= ra;
        ctx.translate(sx, suy); ctx.rotate(t * 0.05);
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * TAU, w = 0.03 + 0.018 * (k % 3);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1100, a - w, a + w); ctx.closePath();
          const rg = ctx.createRadialGradient(0, 0, 60, 0, 0, 1100);
          rg.addColorStop(0, rgba(C.limeL, 0.42)); rg.addColorStop(1, rgba(C.limeL, 0));
          ctx.fillStyle = rg; ctx.fill();
        }
        ctx.restore();
      }
      circle(ctx, sx, suy, 66); fill(ctx, mix(C.lime, '#F4FFE0', 0.35));
      circle(ctx, sx, suy, 66); stroke(ctx, rgba('#FFFFFF', 0.5 * sa), 3);
    }
    // nuvens em time-lapse
    const off = cloudOff(t);
    for (const c of CLOUDS) {
      const x = ((c.x + off) % 1900) - 400, y = c.y + V.cy * 0.08;
      ctx.save(); ctx.globalAlpha *= 0.55;
      const cg = ctx.createLinearGradient(0, y - c.h, 0, y + c.h);
      cg.addColorStop(0, rgba(mix(S.mid, S.hor, 0.5), 0.0)); cg.addColorStop(0.6, rgba(mix(S.mid, S.hor, 0.35), 0.55)); cg.addColorStop(1, rgba(S.hor, 0.35 * S.glow));
      ctx.fillStyle = cg;
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(x + j * c.w * 0.22, y - (j % 2) * c.h * 0.4, c.w * 0.36, c.h * (0.7 + 0.2 * (j % 2)), 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  function drawRidge(ctx, R, S, V) {
    ctx.save(); V.layer(ctx, R.k);
    const col = mix(S.hor, '#070906', R.haze + (1 - R.haze) * (1 - S.glow) * 0.6);
    ctx.beginPath(); ctx.moveTo(X0, H + 900);
    for (let x = X0; x <= X1; x += 10) ctx.lineTo(x, ridgeY(R, x));
    ctx.lineTo(X1, H + 900); ctx.closePath();
    const g = ctx.createLinearGradient(0, R.base - R.amp, 0, R.base + 260);
    g.addColorStop(0, col); g.addColorStop(1, mix(col, '#050605', 0.6));
    ctx.fillStyle = g; ctx.fill();
    // luz de borda (o sol contorna a crista)
    if (S.rim > 0.02) {
      ctx.beginPath();
      for (let x = X0; x <= X1; x += 10) { const y = ridgeY(R, x); if (x === X0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      stroke(ctx, rgba(C.limeL, 0.35 * S.rim * (R.k < 0.2 ? 0.7 : 1)), 2.5);
    }
    ctx.restore();
  }
  function pine(ctx, x, y, h, wr, col) {
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const ty = y - h * (0.35 + 0.3 * k), bw = h * wr * (1 - 0.25 * k);
      ctx.moveTo(x, ty - h * 0.28); ctx.lineTo(x + bw, ty + h * 0.12); ctx.lineTo(x - bw, ty + h * 0.12); ctx.closePath();
    }
    ctx.rect(x - h * 0.03, y - h * 0.2, h * 0.06, h * 0.2);
    ctx.fillStyle = col; ctx.fill();
  }
  function drawHills(ctx, t, S, V, st) {
    ctx.save(); V.layer(ctx, 0.5);
    const col = mix(S.hor, '#060805', 0.88);
    ctx.beginPath(); ctx.moveTo(X0, H + 900);
    for (let x = X0; x <= X1; x += 8) ctx.lineTo(x, hillY(x));
    ctx.lineTo(X1, H + 900); ctx.closePath(); fill(ctx, col);
    if (S.rim > 0.02) {
      ctx.beginPath();
      for (let x = X0; x <= X1; x += 8) { if (x === X0) ctx.moveTo(x, hillY(x)); else ctx.lineTo(x, hillY(x)); }
      stroke(ctx, rgba(C.lime, 0.28 * S.rim), 2);
    }
    for (const pn of PINES) pine(ctx, pn.x, hillY(pn.x) + 6, pn.h, pn.w, mix(col, '#030403', 0.4));
    // a pousada
    for (const hs of HOUSES) house(ctx, t, S, hs, st);
    ctx.restore();
  }
  function house(ctx, t, S, hs, st) {
    const gy = PLATEAU + 4, x = hs.x, w = hs.w, h = hs.h, col = mix(S.hor, '#050605', 0.92);
    const lit = hs.ours ? st.oursLit : hs.kind === 'lodge' ? 0.4 + 0.6 * S.win : (hs.lit || 0) * S.win;
    if (hs.kind === 'lodge') {
      ctx.beginPath(); ctx.moveTo(x - w / 2, gy); ctx.lineTo(x - w / 2, gy - h * 0.6); ctx.lineTo(x - w * 0.56, gy - h * 0.6);
      ctx.lineTo(x, gy - h); ctx.lineTo(x + w * 0.56, gy - h * 0.6); ctx.lineTo(x + w / 2, gy - h * 0.6); ctx.lineTo(x + w / 2, gy); ctx.closePath(); fill(ctx, col);
      ctx.beginPath(); ctx.moveTo(x - w * 0.56, gy - h * 0.6); ctx.lineTo(x, gy - h); ctx.lineTo(x + w * 0.56, gy - h * 0.6); stroke(ctx, rgba(C.lime, 0.25 + 0.4 * S.rim * 0.5), 2);
      for (let k = 0; k < 3; k++) { const wx = x - w * 0.34 + k * w * 0.34; windowRect(ctx, wx - 14, gy - h * 0.48, 28, 26, lit); }
      // luz da varanda (recepção)
      radial(ctx, x + w * 0.42, gy - h * 0.5, 50, C.limeL, 0.6 * (0.3 + 0.7 * S.win));
      circle(ctx, x + w * 0.42, gy - h * 0.5, 4); fill(ctx, mix('#556B33', C.limeL, 0.3 + 0.7 * S.win));
    } else {
      ctx.beginPath(); ctx.moveTo(x - w / 2, gy); ctx.lineTo(x, gy - h); ctx.lineTo(x + w / 2, gy); ctx.closePath(); fill(ctx, col);
      ctx.beginPath(); ctx.moveTo(x - w / 2, gy); ctx.lineTo(x, gy - h); ctx.lineTo(x + w / 2, gy); stroke(ctx, rgba(C.lime, 0.22 + 0.5 * S.rim * (hs.ours ? 1 : 0.5) + (hs.ours ? 0.5 * st.hl : 0)), hs.ours ? 3 : 2);
      // janela triangular e porta
      ctx.beginPath(); ctx.moveTo(x, gy - h * 0.72); ctx.lineTo(x + w * 0.16, gy - h * 0.46); ctx.lineTo(x - w * 0.16, gy - h * 0.46); ctx.closePath();
      fill(ctx, lit > 0.02 ? mix('#141A0E', C.limeL, lit) : '#141A0E');
      windowRect(ctx, x - w * 0.11, gy - h * 0.38, w * 0.22, h * 0.38, lit);
      if (lit > 0.05) radial(ctx, x, gy - h * 0.35, w * 1.4, C.lime, 0.32 * lit);
    }
  }
  function windowRect(ctx, x, y, w, h, lit) {
    ctx.fillStyle = lit > 0.02 ? mix('#141A0E', C.limeL, lit) : '#141A0E'; ctx.fillRect(x, y, w, h);
    if (lit > 0.05) { ctx.fillStyle = rgba('#FFFFFF', 0.35 * lit); ctx.fillRect(x, y, w, 3); }
  }
  // lago: espelha o céu, com reflexos do sol, da lua e das janelas
  const LAKE_TOP = 1196, LAKE_BOT = 1420;
  function drawLake(ctx, t, S, V, st) {
    ctx.save(); V.layer(ctx, 0.55);
    const g = ctx.createLinearGradient(0, LAKE_TOP, 0, LAKE_BOT);
    g.addColorStop(0, mix(S.hor, S.mid, 0.35)); g.addColorStop(0.3, mix(S.mid, '#050605', 0.3)); g.addColorStop(1, '#040504');
    ctx.fillStyle = g; ctx.fillRect(X0, LAKE_TOP, X1 - X0, LAKE_BOT - LAKE_TOP + 600);
    // ondulações
    for (let k = 0; k < 18; k++) {
      const y = LAKE_TOP + 8 + k * k * 0.7, x0 = ((k * 173 + t * 40) % 1400) - 300, len = 120 + (k % 5) * 70;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len, y); stroke(ctx, rgba(C.limeL, 0.05 + 0.08 * S.glow), 1.5);
    }
    ctx.restore();
    // reflexo do sol / lua (espelho vertical cintilante), em coordenadas de tela
    const [sx] = keyed2(SUN, t), [, sy] = keyed2(SUN, t);
    const ly0 = V.S(0, LAKE_TOP, 0.55)[1], ly1 = V.S(0, LAKE_BOT, 0.55)[1];
    const glint = (x, a, col) => {
      for (let k = 0; k < 26; k++) {
        const y = lerp(ly0 + 4, ly1, k / 26), w = (40 + 90 * (k / 26)) * (0.4 + 0.6 * Math.sin(t * 3 + k * 1.7) ** 2);
        ctx.fillStyle = rgba(col, a * (1 - k / 30)); ctx.fillRect(x - w / 2, y, w, 2.5);
      }
    };
    const sa = clamp((1250 - sy) / 400) * (1 - p(t, T.finale - 0.5, T.finale));
    if (sa > 0) glint(sx, 0.55 * sa, C.limeL);
    const ma = clamp(S.stars) * (t > 9.4 && t < 14.8 ? 1 : 0);
    if (ma > 0) { const [mx] = keyed2(MOON, t); glint(mx, 0.35 * ma, '#EEF7DC'); }
    // janelas acesas refletidas
    for (const hs of HOUSES) {
      const lit = hs.ours ? st.oursLit : hs.kind === 'lodge' ? 0.4 + 0.6 * S.win : (hs.lit || 0) * S.win;
      if (lit < 0.05) continue;
      const [wx] = V.S(hs.x, 0, 0.5);
      for (let k = 0; k < 9; k++) {
        const y = ly0 + 6 + k * 13, w = 18 * (0.5 + 0.5 * Math.sin(t * 4 + k));
        ctx.fillStyle = rgba(C.limeL, 0.45 * lit * (1 - k / 10)); ctx.fillRect(wx - w / 2, y, w, 3);
      }
    }
  }
  // chão em primeiro plano + estrada (o carro chega por aqui e vai embora por aqui)
  const GROUND_K = 0.62;
  function groundY(x) {
    const shore = 1405 + 14 * Math.sin(x / 90);
    const w = smooth(clamp((x - 470) / 300));                   // à esquerda a terra sobe até a pousada
    return lerp(1192 + 10 * Math.sin(x / 70), shore, w);
  }
  let ROAD = null;
  function buildRoad() {
    const pts = [[-420, 2100], [-80, 1860], [210, 1640], [380, 1460], [470, 1320], [520, 1236], [548, PLATEAU + 6]];
    const poly = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < 20; k++) {
        const u = k / 20, u2 = u * u, u3 = u2 * u;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        poly.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    poly.push(pts[pts.length - 1]);
    const cum = [0];
    for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
    ROAD = { poly, cum, L: cum[cum.length - 1] };
  }
  const roadW = (y) => lerp(14, 330, clamp((y - PLATEAU) / (2100 - PLATEAU)) ** 1.15);
  function roadAt(u) {                                         // u: 0 = primeiro plano, 1 = portão da pousada
    const s = clamp(u) * ROAD.L;
    let i = 1;
    while (i < ROAD.cum.length - 1 && ROAD.cum[i] < s) i++;
    const f = (s - ROAD.cum[i - 1]) / Math.max(1e-6, ROAD.cum[i] - ROAD.cum[i - 1]);
    const a = ROAD.poly[i - 1], b = ROAD.poly[i];
    return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  function drawGround(ctx, t, S, V, st) {
    ctx.save(); V.layer(ctx, GROUND_K);
    const col = mix(S.hor, '#050604', 0.94);
    ctx.beginPath(); ctx.moveTo(X0, H + 900);
    for (let x = X0; x <= X1; x += 10) ctx.lineTo(x, groundY(x));
    ctx.lineTo(X1, H + 900); ctx.closePath(); fill(ctx, col);
    ctx.beginPath();
    for (let x = X0; x <= X1; x += 10) { if (x === X0) ctx.moveTo(x, groundY(x)); else ctx.lineTo(x, groundY(x)); }
    stroke(ctx, rgba(C.lime, 0.12 + 0.25 * S.rim), 2);
    // estrada
    const L = [], R = [];
    for (const [x, y] of ROAD.poly) { L.push([x - roadW(y) / 2, y]); R.push([x + roadW(y) / 2, y]); }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (const q of L) ctx.lineTo(q[0], q[1]);
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath(); fill(ctx, mix('#14180F', S.hor, 0.06));
    ctx.beginPath(); L.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); stroke(ctx, rgba(C.lime, 0.18 + 0.2 * S.rim), 2);
    ctx.beginPath(); R.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); stroke(ctx, rgba(C.lime, 0.18 + 0.2 * S.rim), 2);
    // faixa central tracejada
    for (let k = 0; k < 30; k++) {
      const a = roadAt(k / 30 + 0.004), b = roadAt(k / 30 + 0.016), wv = roadW(a.y) / 330;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); stroke(ctx, rgba(C.limeL, 0.35), Math.max(1, 6 * wv));
    }
    car(ctx, t, st);
    ctx.restore();
  }
  // o carro do hóspede: chega de costas (lanternas) e parte de frente (faróis)
  function car(ctx, t, st) {
    if (st.car < 0) return;
    const q = roadAt(st.car), s = roadW(q.y) / 330, front = st.carFront;
    const w = 230 * s, h = 92 * s;
    ctx.save(); ctx.translate(q.x, q.y - h * 0.5);
    if (front) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; radial(ctx, 0, h * 0.2, 420 * s, C.limeL, 0.16); ctx.restore(); }
    ctx.beginPath(); ctx.roundRect(-w / 2, -h * 0.15, w, h * 0.62, 10 * s); fill(ctx, '#0C0E0A');
    ctx.beginPath(); ctx.moveTo(-w * 0.34, -h * 0.15); ctx.lineTo(-w * 0.24, -h * 0.55); ctx.lineTo(w * 0.24, -h * 0.55); ctx.lineTo(w * 0.34, -h * 0.15); ctx.closePath(); fill(ctx, '#11140E');
    ctx.beginPath(); ctx.moveTo(-w * 0.28, -h * 0.18); ctx.lineTo(-w * 0.2, -h * 0.48); ctx.lineTo(w * 0.2, -h * 0.48); ctx.lineTo(w * 0.28, -h * 0.18); ctx.closePath();
    fill(ctx, front ? rgba(C.limeL, 0.25) : 'rgba(255,255,255,0.08)');
    const lc = front ? '#FFFFFF' : C.out;
    for (const sx of [-1, 1]) {
      circle(ctx, sx * w * 0.36, h * 0.12, 9 * s + 1.5); fill(ctx, lc);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      radial(ctx, sx * w * 0.36, h * 0.12, (front ? 110 : 50) * s + 6, lc, front ? 0.7 : 0.6);
      ctx.restore();
    }
    ctx.restore();
  }
  /** pinheiro de primeiro plano: camadas de galhos caídos, recortadas e irregulares */
  function bigPine(ctx, x, y, h, w, col, sw, seed) {
    const n = 12, R = [], L = [];
    for (let i = 1; i <= n; i++) {
      const u = i / n, yy = y - h + h * u * 0.93, s = sw * (1 - u) * (1 - u), tier = h * 0.93 / n;
      for (const [side, arr, sd] of [[1, R, seed], [-1, L, seed + 1]]) {
        const tip = w * Math.pow(u, 0.92) * (0.84 + 0.3 * hash(i, sd)), notch = tip * (0.38 + 0.12 * hash(i, sd + 5));
        arr.push([x + s + side * notch, yy - tier * 0.7, x + s + side * tip * 0.78, yy - tier * 0.25, x + s + side * tip, yy + tier * 0.12]);
      }
    }
    ctx.beginPath(); ctx.moveTo(x + sw, y - h);
    for (const q of R) { ctx.lineTo(q[0], q[1]); ctx.quadraticCurveTo(q[2], q[3], q[4], q[5]); }
    ctx.lineTo(x + w * 0.05, y - h * 0.04); ctx.lineTo(x + w * 0.05, y + 600); ctx.lineTo(x - w * 0.05, y + 600); ctx.lineTo(x - w * 0.05, y - h * 0.04);
    for (let i = L.length - 1; i >= 0; i--) { const q = L[i]; ctx.lineTo(q[4], q[5]); ctx.quadraticCurveTo(q[2], q[3], q[0], q[1]); }
    ctx.closePath(); fill(ctx, col);
  }
  function drawForeground(ctx, t, S, V) {
    ctx.save(); V.layer(ctx, 1.0);
    // mato balançando e dois pinheiros grandes emoldurando
    const col = '#040503';
    for (const g of GRASS) {
      const sway = Math.sin(t * 1.6 + g.ph) * 10 + g.lean * g.h;
      ctx.beginPath(); ctx.moveTo(g.x - 6, H + 20); ctx.quadraticCurveTo(g.x + sway * 0.3, H - g.h * 0.5, g.x + sway, H - g.h); ctx.lineTo(g.x + 6, H + 20); ctx.closePath(); fill(ctx, col);
    }
    bigPine(ctx, -70, H + 40, 1120, 330, col, Math.sin(t * 0.9) * 9, 3);
    bigPine(ctx, 1300, H + 60, 1000, 300, col, Math.sin(t * 0.9 + 1.3) * 8, 9);
    ctx.beginPath(); ctx.rect(X0, H - 40, X1 - X0, 400); fill(ctx, col);
    // brilho de borda no mato quando o sol está alto
    if (S.rim > 0.3) {
      ctx.globalAlpha *= 0.25 * S.rim;
      for (const g of GRASS) { if (g.h < 160) continue; const sway = Math.sin(t * 1.6 + g.ph) * 10 + g.lean * g.h; circle(ctx, g.x + sway, H - g.h, 2); fill(ctx, C.limeL); }
    }
    ctx.restore();
  }
  function drawFireflies(ctx, t, S, V) {
    if (S.fire < 0.02) return;
    for (const f of FIREFLIES) {
      const [x, y] = V.S(f.x + Math.sin(t * f.sp + f.ph) * 40, f.y + Math.cos(t * f.sp * 1.3 + f.ph) * 26, 0.7);
      const a = S.fire * (0.3 + 0.7 * Math.sin(t * 3 * f.sp + f.ph) ** 2);
      radial(ctx, x, y, 22, C.lime, 0.55 * a);
      circle(ctx, x, y, 2.2); fill(ctx, rgba(C.limeL, a));
    }
  }
  function drawBirds(ctx, t) {
    const a = p(t, 14.7, 15.1) * (1 - p(t, 17.6, 18.2));
    if (a <= 0) return;
    for (let i = 0; i < 7; i++) {
      const u = (t - 14.7) * (0.09 + 0.012 * i), x = lerp(-120, 1200, u) + i * 38, y = 520 + i * 22 - u * 160 + Math.sin(t * 3 + i) * 6;
      const fl = Math.sin(t * 9 + i * 1.3) * 8;
      ctx.beginPath(); ctx.moveTo(x - 14, y - fl); ctx.quadraticCurveTo(x - 6, y - 4, x, y); ctx.quadraticCurveTo(x + 6, y - 4, x + 14, y - fl);
      stroke(ctx, rgba('#050605', 0.75 * a), 3);
    }
  }

  // =====================================================================
  // PALAVRAS GIGANTES ENTRE AS SERRAS (nascem e se põem como o sol)
  // =====================================================================
  function giantWord(ctx, t, V) {
    ctx.save(); V.layer(ctx, 0.2);
    const draw = (s, y, a, sc) => {
      if (a <= 0.01) return;
      const fit = Math.min(1, 940 / tw(ctx, s, DISPLAY, 212, 900, -8));
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(540 + V.cx * 0.2, y); ctx.scale(sc * fit, sc * fit);
      // raios atrás da palavra
      ctx.save(); ctx.rotate(t * 0.08);
      for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * TAU;
        ctx.beginPath(); ctx.moveTo(0, -60); ctx.arc(0, -60, 900, ang - 0.05, ang + 0.05); ctx.closePath();
        const rg = ctx.createRadialGradient(0, -60, 80, 0, -60, 900);
        rg.addColorStop(0, rgba(C.limeL, 0.26)); rg.addColorStop(1, rgba(C.limeL, 0)); ctx.fillStyle = rg; ctx.fill();
      }
      ctx.restore();
      radial(ctx, 0, -70, 640, C.lime, 0.4);
      txt(ctx, s, 0, 0, { fam: DISPLAY, size: 212, weight: 900, color: C.white, align: 'center', ls: -8, shadow: rgba(C.lime, 0.9), blur: 60 });
      ctx.restore();
    };
    // CHECK-IN nasce
    const ui = E.outCubic(p(t, T.checkin - 0.05, T.checkin + 0.75)), uo = p(t, 6.7, 7.25);
    draw('CHECK-IN', lerp(1320, 870, ui) - 40 * E.inCubic(uo), p(t, T.checkin - 0.05, T.checkin + 0.15) * (1 - uo), 1);
    // CHECK-OUT aparece e se põe atrás da serra
    const oi = E.outExpo(p(t, T.checkout, T.checkout + 0.35)), os = E.inCubic(p(t, 20.4, 21.5));
    draw('CHECK-OUT', lerp(870, 1360, os), oi * (1 - p(os, 0.85, 1)), lerp(1.25, 1, oi));
    // a logo nasce como o sol (inteira acima da serra no tempo forte)
    const li = E.inOutCubic(p(t, T.finale - 0.6, T.finale));
    if (li > 0) {
      const y = lerp(1300, 760, li), x = 540 + V.cx * 0.2;
      ctx.save(); ctx.rotate(0); ctx.translate(x, y);
      ctx.save(); ctx.rotate(t * 0.06);
      for (let k = 0; k < 18; k++) {
        const ang = (k / 18) * TAU;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1000, ang - 0.04, ang + 0.04); ctx.closePath();
        const rg = ctx.createRadialGradient(0, 0, 150, 0, 0, 1000);
        rg.addColorStop(0, rgba(C.limeL, 0.4 * li)); rg.addColorStop(1, rgba(C.limeL, 0)); ctx.fillStyle = rg; ctx.fill();
      }
      ctx.restore();
      radial(ctx, 0, 0, 720, C.lime, 0.55 * li);
      radial(ctx, 0, 0, 260, '#FFFFFF', 0.35 * kick(t, T.finale, 0.9));
      ctx.restore();
      logo(ctx, x, y, 300 * (1 + 0.03 * kick(t, T.finale, 0.5)));
    }
    ctx.restore();
  }

  // =====================================================================
  // LANTERNAS -> CONSTELAÇÃO DA COMANDA (noite)
  // =====================================================================
  const ITEMS = [
    { s: 'Jantar do chef', v: 55, to: [300, 780] },
    { s: 'Cerveja artesanal', v: 14, to: [560, 610] },
    { s: '2 refrigerantes', v: 16, to: [850, 720], below: true },
  ];
  const LAUNCH = [T.night + 0.3, T.night + 0.9, T.night + 1.5];
  const TRAVEL = 0.9;
  const COMANDA = { x: 560, y: 900, pop: T.ficha, fly: T.ficha + 0.7, land: T.ficha + 1.2 };
  function lanterns(ctx, t, V) {
    const src = V.S(OURS.x, PLATEAU - OURS.h * 0.4, 0.5);
    const fade = 1 - p(t, 14.2, 14.9);
    if (fade <= 0) return;
    const pts = [];
    ITEMS.forEach((it, i) => {
      const t0 = LAUNCH[i], u = p(t, t0, t0 + TRAVEL);
      if (u <= 0) return;
      const e = E.inOutSine(u);
      const x = lerp(src[0], it.to[0], e) + Math.sin(u * 6 + i) * 18 * (1 - u), y = lerp(src[1], it.to[1], e);
      pts.push([x, y, u]);
      ctx.save(); ctx.globalAlpha *= fade;
      if (u < 1) {
        // lanterna de papel acesa
        radial(ctx, x, y, 120, C.lime, 0.55);
        ctx.beginPath(); ctx.moveTo(x - 20, y - 26); ctx.lineTo(x + 20, y - 26); ctx.lineTo(x + 26, y + 22); ctx.quadraticCurveTo(x, y + 32, x - 26, y + 22); ctx.closePath();
        const lg = ctx.createLinearGradient(0, y - 26, 0, y + 30); lg.addColorStop(0, C.limeL); lg.addColorStop(1, C.lime);
        ctx.fillStyle = lg; ctx.fill();
        radial(ctx, x, y + 12, 22, '#FFFFFF', 0.9);
      }
      // estrela quando chega
      const st = p(t, t0 + TRAVEL - 0.05, t0 + TRAVEL + 0.2);
      if (st > 0) {
        const tw2 = 1 + 0.25 * Math.sin(t * 5 + i);
        radial(ctx, x, y, 90 * tw2, C.limeL, 0.6 * st);
        ctx.beginPath(); ctx.moveTo(x - 34 * tw2, y); ctx.lineTo(x + 34 * tw2, y); ctx.moveTo(x, y - 34 * tw2); ctx.lineTo(x, y + 34 * tw2); stroke(ctx, rgba('#FFFFFF', 0.8 * st), 2.5);
        circle(ctx, x, y, 7); fill(ctx, rgba('#FFFFFF', st));
      }
      // rótulo do item
      const la = E.outCubic(p(t, t0 + 0.15, t0 + 0.5));
      if (la > 0) {
        const lx = it.below ? x : x + 40, al = it.below ? 'center' : 'left', ly = it.below ? y + 66 : y - 6;
        txt(ctx, it.s, lx, ly, { size: 26, weight: 800, color: C.white, align: al, alpha: la, shadow: 'rgba(0,0,0,0.8)', blur: 14 });
        txt(ctx, brl(it.v), lx, ly + 32, { size: 26, weight: 800, color: C.lime, align: al, alpha: la, shadow: 'rgba(0,0,0,0.8)', blur: 14 });
      }
      ctx.restore();
    });
    // as estrelas se ligam: a comanda é uma constelação
    const cl = E.inOutCubic(p(t, LAUNCH[2] + TRAVEL, LAUNCH[2] + TRAVEL + 0.45));
    if (cl > 0 && pts.length === 3) {
      ctx.save(); ctx.globalAlpha *= fade;
      const seg = (a, b, u) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], u), lerp(a[1], b[1], u)); stroke(ctx, rgba(C.limeL, 0.7), 2.5); };
      seg(pts[0], pts[1], clamp(cl * 2)); seg(pts[1], pts[2], clamp(cl * 2 - 1));
      ctx.restore();
    }
    // a comanda (R$ 85,00) desce da constelação para a ficha da hospedagem
    const ta = E.outBack(p(t, COMANDA.pop - 0.1, COMANDA.pop + 0.25), 1.8);
    const fy = E.inOutCubic(p(t, COMANDA.fly, COMANDA.land));
    if (ta > 0 && fy < 1) {
      const tx = CARD.x + CARD.w - 40 - 95, ty = CARD.y + 166 - 11;
      const x = lerp(COMANDA.x, tx, fy), y = lerp(COMANDA.y, ty, fy) - Math.sin(fy * Math.PI) * 60, sc = ta * lerp(1, 0.62, fy);
      ctx.save(); ctx.globalAlpha *= 1 - p(fy, 0.82, 1); ctx.translate(x, y); ctx.scale(sc, sc);
      if (fy > 0) radial(ctx, 0, 0, 160, C.lime, 0.5 * Math.sin(fy * Math.PI));
      chip(ctx, 0, 0, 'COMANDA · R$ 85,00', { size: 30, bg: C.lime, color: C.ink, ls: 2 });
      ctx.restore();
    }
    // pouso na ficha: clarão e anel no valor da comanda
    const hit = kick(t, COMANDA.land, 0.5);
    if (hit > 0.01) {
      const tx = CARD.x + CARD.w - 40 - 95, ty = CARD.y + 166 - 11, u = p(t, COMANDA.land, COMANDA.land + 0.5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      radial(ctx, tx, ty, 240, C.lime, 0.55 * hit);
      ctx.restore();
      ctx.beginPath(); ctx.arc(tx, ty, lerp(30, 170, E.outCubic(u)), 0, TAU); stroke(ctx, rgba(C.limeL, 0.8 * hit), 4);
    }
  }

  // =====================================================================
  // CARTÕES DE VIDRO (a ficha da hospedagem, sem nenhuma tela do app)
  // =====================================================================
  const CARD = { x: 130, w: 820, y: 1262 };
  const CR = CARD.w - 40;                                      // borda direita do conteúdo
  function glass(ctx, x, y, w, h, a, accent = C.lime) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    rr(ctx, x, y, w, h, 30); fill(ctx, 'rgba(8,10,7,0.78)');
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    rr(ctx, x, y, w, h, 30); stroke(ctx, 'rgba(255,255,255,0.14)', 2);
    ctx.save(); rr(ctx, x, y, w, h, 30); ctx.clip(); ctx.fillStyle = accent; ctx.fillRect(x, y, w, 6); ctx.restore();
    ctx.restore();
  }
  /** cartão que entra subindo e sai subindo; draw(ctx) desenha o conteúdo em coordenadas do cartão */
  function card(ctx, t, tin, tout, h, draw, accent) {
    const u = E.outCubic(p(t, tin, tin + 0.45)), o = E.inCubic(p(t, tout, tout + 0.35));
    if (u <= 0 || o >= 1) return;
    const a = u * (1 - o), dy = (1 - u) * 60 - o * 40;
    ctx.save(); ctx.translate(0, dy);
    glass(ctx, CARD.x, CARD.y, CARD.w, h, a, accent);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(CARD.x, CARD.y); draw(ctx); ctx.restore();
    ctx.restore();
  }
  /** chip de status que vira (de um estado para outro) num tempo */
  function statusFlip(ctx, t, tf, x, y, A, B) {
    const u = p(t, tf, tf + 0.3), sy = Math.abs(Math.cos(u * Math.PI)), S2 = u < 0.5 ? A : B;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, Math.max(0.02, sy));
    chip(ctx, 0, 0, S2.s, { size: 24, bg: S2.bg, border: S2.border, color: S2.color, dot: S2.dot, align: 'left' });
    ctx.restore();
  }
  const ST_FUT = { s: 'RESERVA FUTURA', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.35)', color: C.white, dot: C.grayL };
  const ST_HOSP = { s: 'HOSPEDADO ATIVO', bg: rgba(C.lime, 0.16), border: rgba(C.lime, 0.8), color: C.lime, dot: C.lime };
  const ST_FIN = { s: 'FINALIZADO', bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.3)', color: '#D9DBD3', dot: C.grayL };
  function amount(ctx, s, x, y, size, color, o = {}) { txt(ctx, s, x, y, { fam: DISPLAY, size, weight: 900, color, ls: -size * 0.025, align: o.align || 'left' }); }

  function cards(ctx, t) {
    // reserva futura: o hóspede ainda está a caminho
    card(ctx, t, T.ready + 0.15, T.checkin - 0.25, 232, (c) => {
      chip(c, 40, 46, ST_FUT.s, Object.assign({ size: 24, align: 'left' }, ST_FUT));
      txt(c, 'SITE', CR, 54, { size: 24, weight: 800, color: C.grayL, align: 'right', ls: 3 });
      txt(c, 'Bica D’Água 02 · Casal', 40, 128, { fam: DISPLAY, size: 46, weight: 800, color: C.white, ls: -0.8 });
      txt(c, '07/10 → 09/10 · 2 diárias', 40, 176, { size: 28, weight: 800, color: C.grayL });
      const cw = chip(c, 40, 212, 'CHECK-IN 14:00', { size: 24, align: 'left', bg: rgba(C.lime, 0.12), color: C.lime });
      chip(c, 40 + cw + 14, 212, 'CHECK-OUT 11:00', { size: 24, align: 'left' });
    });
    // check-in: o status vira
    card(ctx, t, T.checkin + 0.2, T.stay - 0.25, 168, (c) => {
      txt(c, 'CHECK-IN', 40, 70, { fam: DISPLAY, size: 52, weight: 900, color: C.white, ls: -1 });
      txt(c, '07/10 · 14:00', CR, 68, { size: 30, weight: 800, color: C.grayL, align: 'right' });
      statusFlip(c, t, T.checkin + 0.6, 40, 122, ST_FUT, ST_HOSP);
      txt(c, 'BICA D’ÁGUA 02', CR, 132, { size: 24, weight: 800, color: C.lime, align: 'right', ls: 2 });
    });
    // diárias pagas
    card(ctx, t, T.stay + 0.15, T.night - 0.3, 220, (c) => {
      chip(c, 40, 46, ST_HOSP.s, Object.assign({ size: 24, align: 'left' }, ST_HOSP));
      txt(c, 'DIÁRIAS', 40, 120, { size: 26, weight: 800, color: C.grayL, ls: 3 });
      amount(c, 'R$ 960,00', 40, 190, 72, C.white);
      chip(c, CR, 128, 'QUITADA', { size: 24, align: 'right', dot: C.livre, bg: 'rgba(76,192,103,0.14)', color: '#7BE296' });
      chip(c, CR, 186, 'CARTÃO', { size: 24, align: 'right', border: 'rgba(255,255,255,0.3)' });
    });
    // resumo financeiro da hospedagem
    card(ctx, t, T.ficha + 0.45, T.morning - 0.25, 268, (c) => {
      txt(c, 'RESUMO FINANCEIRO', 40, 58, { size: 24, weight: 800, color: C.lime, ls: 4 });
      const row = (y, l, r, col, big) => { txt(c, l, 40, y, { fam: DISPLAY, size: big ? 40 : 34, weight: big ? 900 : 700, color: big ? C.white : C.grayL, ls: -0.5 }); txt(c, r, CR, y, { size: big ? 36 : 30, weight: 800, color: col, align: 'right' }); };
      row(116, 'Diárias · quitada', 'R$ 960,00', C.white);
      const hit = kick(t, COMANDA.land, 0.6);
      if (hit > 0.01) { c.save(); c.globalAlpha *= hit; rr(c, 24, 128, CR - 8, 52, 14); fill(c, rgba(C.lime, 0.22)); c.restore(); }
      row(166, 'Comanda (extras)', 'R$ 85,00', mix(C.white, C.lime, p(t, COMANDA.land - 0.05, COMANDA.land)));
      c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(40, 190, CR - 40, 2);
      row(240, 'Total da hospedagem', 'R$ 1.045,00', C.lime, true);
    });
    // check-out: só os consumos
    const PIX = T.pay + 0.6, REC = T.pay + 1.2;
    card(ctx, t, T.morning + 0.15, T.checkout - 0.3, 232, (c) => {
      txt(c, 'A RECEBER NO CHECK-OUT', 40, 60, { size: 24, weight: 800, color: C.grayL, ls: 3 });
      txt(c, 'somente consumos e extras', 40, 98, { size: 25, weight: 700, color: C.gray });
      const z = E.inOutCubic(p(t, PIX + 0.05, PIX + 0.4));
      c.save(); c.beginPath(); c.rect(30, 110, 500, 100); c.clip();
      amount(c, 'R$ 85,00', 40, 190 - z * 90, 76, C.checkout);
      amount(c, 'R$ 0,00', 40, 280 - z * 90, 76, C.lime);
      c.restore();
      const pa = E.outBack(p(t, PIX - 0.2, PIX + 0.1), 2);
      if (pa > 0) { c.save(); c.translate(CR, 140); c.scale(pa, pa); chip(c, 0, 0, 'PIX ✓', { size: 26, align: 'right', bg: rgba(C.lime, 0.16), border: rgba(C.lime, 0.8), color: C.lime }); c.restore(); }
      const ra = E.outBack(p(t, REC, REC + 0.3), 2);
      if (ra > 0) { c.save(); c.translate(CR, 196); c.scale(ra, ra); chip(c, 0, 0, 'RECIBO FINAL', { size: 24, align: 'right', bg: C.lime, color: C.ink }); c.restore(); }
    }, C.checkout);
    // check-out: o status vira
    card(ctx, t, T.checkout + 0.25, T.final - 0.25, 168, (c) => {
      txt(c, 'CHECK-OUT', 40, 70, { fam: DISPLAY, size: 52, weight: 900, color: C.white, ls: -1 });
      txt(c, '09/10 · 10:15', CR, 68, { size: 30, weight: 800, color: C.grayL, align: 'right' });
      statusFlip(c, t, T.checkout + 0.6, 40, 122, ST_HOSP, ST_FIN);
      txt(c, 'SALDO FINAL R$ 0,00', CR, 132, { size: 24, weight: 800, color: C.lime, align: 'right', ls: 1 });
    }, C.checkout);
    // a estadia, finalizada
    card(ctx, t, T.final + 0.15, T.finale - 0.4, 256, (c) => {
      chip(c, 40, 46, ST_FIN.s, Object.assign({ size: 24, align: 'left' }, ST_FIN));
      txt(c, '07/10 → 09/10', CR, 54, { size: 26, weight: 800, color: C.grayL, align: 'right' });
      txt(c, 'TOTAL DA ESTADIA', 40, 116, { size: 24, weight: 800, color: C.grayL, ls: 3 });
      amount(c, 'R$ 1.045,00', 40, 172, 54, C.white);
      txt(c, 'SALDO FINAL', 450, 116, { size: 24, weight: 800, color: C.grayL, ls: 3 });
      amount(c, 'R$ 0,00', 450, 172, 54, C.lime);
      txt(c, 'Saída contratada 09/10 · registrada às 10:15', 40, 228, { size: 24, weight: 700, color: C.gray });
    }, C.grayL);
  }

  // etiqueta do chalé (aponta a acomodação do hóspede)
  function chaletTag(ctx, t, V, st) {
    if (st.tagA <= 0.01) return;
    const [x, y] = V.S(OURS.x, PLATEAU - OURS.h - 10, 0.5);
    ctx.save(); ctx.globalAlpha *= st.tagA;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 90); stroke(ctx, rgba(C.lime, 0.9), 3);
    circle(ctx, x, y, 6); fill(ctx, C.lime);
    chip(ctx, x, y - 112, 'BICA D’ÁGUA 02', { size: 24, bg: C.lime, color: C.ink });
    ctx.restore();
  }

  // =====================================================================
  // MONTAGEM
  // =====================================================================
  function stateAt(t) {
    const st = {};
    // luz do chalé: acende no check-in, apaga no check-out
    st.oursLit = clamp(0.25 + 0.75 * skyAt(t).win + 0.35) * p(t, T.checkin + 0.25, T.checkin + 0.4) * (1 - p(t, T.checkout + 0.3, T.checkout + 0.38));
    st.tagA = E.outCubic(p(t, T.ready + 0.6, T.ready + 1.0)) * (1 - p(t, T.checkin - 0.3, T.checkin - 0.05));
    st.hl = E.outCubic(p(t, T.ready + 0.6, T.ready + 1.0)) * (1 - p(t, T.stay - 0.2, T.stay + 0.2))
      + E.outCubic(p(t, T.checkout - 0.3, T.checkout)) * (1 - p(t, T.final - 0.3, T.final));
    // o carro: chega (de costas) na abertura; parte (de frente) no check-out
    st.car = -1;
    if (t < T.checkin + 0.2) { st.car = E.outCubic(p(t, 0.4, T.checkin - 0.35)); st.carFront = false; }
    else if (t >= T.checkout && t < T.checkout + 1.4) { st.car = 1 - E.inCubic(p(t, T.checkout + 0.1, T.checkout + 1.25)); st.carFront = true; }
    return st;
  }
  const FLARE = T.checkout + 1.05;
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    const S = skyAt(t), V = view(t), st = stateAt(t);
    drawSky(ctx, t, S, V);
    drawRidge(ctx, RIDGES[0], S, V);
    giantWord(ctx, t, V);
    drawRidge(ctx, RIDGES[1], S, V);
    drawHills(ctx, t, S, V, st);
    drawLake(ctx, t, S, V, st);
    drawGround(ctx, t, S, V, st);
    drawFireflies(ctx, t, S, V);
    drawForeground(ctx, t, S, V);
    drawBirds(ctx, t);
    lanterns(ctx, t, V);
    chaletTag(ctx, t, V, st);
    // clarão dos faróis quando o carro passa pela câmera
    // os faróis crescem e, no tempo do golpe, estouram num clarão que decai
    const fl = Math.max(0.35 * E.inQuad(p(t, T.checkout + 0.75, FLARE)) * (t < FLARE ? 1 : 0), kick(t, FLARE, 0.5));
    if (fl > 0.01) {
      // clarão anamórfico: os faróis passam pela câmera
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fx = 150, fy = 1690;
      ctx.fillStyle = rgba(C.limeL, 0.09 * fl); ctx.fillRect(0, 0, W, H);          // a luz dos faróis invade o quadro
      radial(ctx, fx, fy, 900, C.limeL, 0.5 * fl, 0.25);
      radial(ctx, fx, fy, 260, '#FFFFFF', 0.85 * fl);
      const sg = ctx.createLinearGradient(0, 0, W, 0);
      sg.addColorStop(0, rgba('#FFFFFF', 0.9 * fl)); sg.addColorStop(0.35, rgba(C.limeL, 0.45 * fl)); sg.addColorStop(1, rgba(C.limeL, 0));
      ctx.fillStyle = sg; ctx.fillRect(0, fy - 3, W, 6);
      const sb = ctx.createLinearGradient(0, 0, W, 0);
      sb.addColorStop(0, rgba(C.limeL, 0.22 * fl)); sb.addColorStop(1, rgba(C.limeL, 0));
      ctx.fillStyle = sb; ctx.fillRect(0, fy - 20, W, 40);
      ctx.restore();
    }
    // véus de leitura: topo (títulos) e base (cartões)
    const tv = ctx.createLinearGradient(0, 180, 0, 640);
    tv.addColorStop(0, 'rgba(3,4,3,0.55)'); tv.addColorStop(1, 'rgba(3,4,3,0)');
    ctx.fillStyle = tv; ctx.fillRect(0, 0, W, 640);
    const bv = ctx.createLinearGradient(0, 1180, 0, 1560);
    bv.addColorStop(0, 'rgba(3,4,3,0)'); bv.addColorStop(1, 'rgba(3,4,3,0.5)');
    ctx.fillStyle = bv; ctx.fillRect(0, 1180, W, 740);
    copy(ctx, t);
    cards(ctx, t);
    finale(ctx, t);
    // abertura: a exposição sobe nos primeiros quadros (sem quadro preto)
    const o = 0.35 * (1 - E.outCubic(p(t, 0, 0.3)));
    if (o > 0) { ctx.fillStyle = rgba('#000000', o); ctx.fillRect(0, 0, W, H); }
  }
  function copy(ctx, t) {
    const L = (rows, y, tout, size = 100) => lines(ctx, t, rows, { y, size, lh: size * 0.98, tout });
    L([{ segs: [{ s: 'Seu hóspede' }], t: 0.15 }, { segs: [{ s: 'está chegando.', color: C.lime }], t: 0.45 }], 340, T.ready - 0.3);
    L([{ segs: [{ s: 'Tudo pronto' }], t: T.ready + 0.05 }, { segs: [{ s: 'para receber.', color: C.lime }], t: T.ready + 0.35 }], 340, T.checkin - 0.3);
    L([{ segs: [{ s: 'Boas-vindas.' }], t: T.checkin + 0.6 }], 360, T.stay - 0.3, 118);
    L([{ segs: [{ s: 'Hospedagem' }], t: T.stay + 0.05 }, { segs: [{ s: 'em andamento.', color: C.lime }], t: T.stay + 0.35 }], 340, T.night - 0.3);
    L([{ segs: [{ s: 'Consumos' }], t: T.night + 0.05 }, { segs: [{ s: 'na comanda.', color: C.lime }], t: T.night + 0.35 }], 340, T.ficha - 0.3);
    L([{ segs: [{ s: 'Tudo na ficha' }], t: T.ficha + 0.05 }, { segs: [{ s: 'da hospedagem.', color: C.lime }], t: T.ficha + 0.35 }], 340, T.morning - 0.3);
    L([{ segs: [{ s: 'No check-out,' }], t: T.morning + 0.05 }, { segs: [{ s: 'só os extras.', color: C.lime }], t: T.morning + 0.35 }], 340, T.pay - 0.3);
    L([{ segs: [{ s: 'Acerto feito,' }], t: T.pay + 0.05 }, { segs: [{ s: 'recibo final.', color: C.lime }], t: T.pay + 0.35 }], 340, T.checkout - 0.3);
    L([{ segs: [{ s: 'Boa viagem.' }], t: T.checkout + 0.6 }], 360, T.final - 0.3, 118);
    L([{ segs: [{ s: 'Da chegada' }], t: T.final + 0.05 }, { segs: [{ s: 'à saída.', color: C.lime }], t: T.final + 0.35 }], 340, T.finale - 0.5);
  }
  function finale(ctx, t) {
    if (t < T.finale - 0.1) return;
    lines(ctx, t, [{ segs: [{ s: 'Até a próxima.' }], t: T.finale + 0.25 }], { y: 360, size: 118 });
    const sc = ctx.createLinearGradient(0, 1220, 0, 1600);
    sc.addColorStop(0, 'rgba(3,4,3,0)'); sc.addColorStop(1, 'rgba(3,4,3,0.75)');
    ctx.save(); ctx.globalAlpha *= p(t, T.finale, T.finale + 0.6); ctx.fillStyle = sc; ctx.fillRect(0, 1220, W, 700); ctx.restore();
    const NS = 96, w1 = tw(ctx, 'FAZLO ', DISPLAY, NS, 900, -2.6), w2 = tw(ctx, 'Hospeda', DISPLAY, NS, 700, -2.6), nx = 540 - (w1 + w2) / 2;
    riseLine(ctx, [{ s: 'FAZLO ' }], nx, 1336, p(t, T.finale + 0.7, T.finale + 1.1), 0, { size: NS, weight: 900, color: C.white, ls: -2.6, shadow: 'rgba(0,0,0,0.6)' });
    riseLine(ctx, [{ s: 'Hospeda', weight: 700 }], nx + w1, 1336, p(t, T.finale + 0.78, T.finale + 1.18), 0, { size: NS, weight: 700, color: C.white, ls: -2.6, shadow: 'rgba(0,0,0,0.6)' });
    typeText(ctx, 'CHECK-IN & CHECK-OUT', 540, 1394, p(t, T.finale + 1.0, T.finale + 1.35), { size: 28, weight: 800, color: C.lime, ls: 8, align: 'center' });
    const da = E.outBack(p(t, T.finale + 1.4, T.finale + 1.75), 1.8);
    if (da > 0) {
      const s = 'fazlohospeda.com.br', dw = tw(ctx, s, DISPLAY, 52, 800, -1) + 72;
      ctx.save(); ctx.translate(540, 1480); ctx.scale(da, da);
      rr(ctx, -dw / 2, -38, dw, 76, 38); fill(ctx, C.lime);
      txt(ctx, s, 0, 18, { fam: DISPLAY, size: 52, weight: 800, color: C.ink, align: 'center', ls: -1 });
      const sh = p(t, T.finale + 2.6, T.finale + 3.2);
      if (sh > 0 && sh < 1) {
        ctx.save(); rr(ctx, -dw / 2, -38, dw, 76, 38); ctx.clip();
        const gx = lerp(-dw / 2 - 120, dw / 2 + 120, E.inOutSine(sh)), g = ctx.createLinearGradient(gx - 80, 0, gx + 80, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.65)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(gx - 80, -38, 160, 76); ctx.restore();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- motion blur por subamostragem
  const FAST = [[0.25, 2.4], [T.checkin - 0.1, T.checkin + 0.9], [T.night, T.night + 2.4], [T.checkout - 0.05, T.checkout + 1.6], [20.3, 21.6], [T.finale - 0.65, T.finale + 0.3]];
  function shutterSpec(t) {
    for (const [a, b] of FAST) if (t >= a && t < b) return { k: 10, dt: 1 / 55 };
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
    const t = T.checkin + 0.9;
    frameCover(ctx, t);
  }
  function frameCover(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    const S = skyAt(t), V = view(t), st = stateAt(t);
    st.tagA = 0; st.car = -1;
    drawSky(ctx, t, S, V, true);                                  // na capa o sol é a palavra
    drawRidge(ctx, RIDGES[0], S, V);
    giantWord(ctx, t, V);
    drawRidge(ctx, RIDGES[1], S, V);
    drawHills(ctx, t, S, V, st);
    drawLake(ctx, t, S, V, st);
    drawGround(ctx, t, S, V, st);
    drawForeground(ctx, t, S, V);
    const tv = ctx.createLinearGradient(0, 200, 0, 720);
    tv.addColorStop(0, 'rgba(3,4,3,0.7)'); tv.addColorStop(1, 'rgba(3,4,3,0)');
    ctx.fillStyle = tv; ctx.fillRect(0, 0, W, 720);
    txt(ctx, 'Da chegada', 540, 470, { fam: DISPLAY, size: 132, weight: 900, color: C.white, align: 'center', ls: -4, shadow: 'rgba(0,0,0,0.5)' });
    txt(ctx, 'à saída.', 540, 600, { fam: DISPLAY, size: 132, weight: 900, color: C.lime, align: 'center', ls: -4, shadow: 'rgba(0,0,0,0.5)' });
    chip(ctx, 540, 1460, 'CHECK-IN & CHECK-OUT · FAZLO HOSPEDA', { size: 26, bg: C.lime, color: C.ink, ls: 3 });
  }

  // ---------------------------------------------------------------- cues de som
  const CUES = [];
  const cue = (t, type, o = {}) => CUES.push(Object.assign({ t: Math.round(t * 1e4) / 1e4, type }, o));
  function buildCues() {
    CUES.length = 0;
    cue(0, 'dawn', { d: 1.2 });
    cue(1.2, 'sunrise', {});
    cue(0.4, 'car', { d: T.checkin - 0.75, dir: -1 });
    [[0.15, 0.45], [T.ready + 0.05, T.ready + 0.35], [T.stay + 0.05, T.stay + 0.35], [T.night + 0.05, T.night + 0.35], [T.ficha + 0.05, T.ficha + 0.35],
      [T.morning + 0.05, T.morning + 0.35], [T.pay + 0.05, T.pay + 0.35], [T.final + 0.05, T.final + 0.35]].forEach(([a, b]) => { cue(a, 'rise', {}); cue(b, 'rise', {}); });
    [T.ready + 0.15, T.checkin + 0.2, T.stay + 0.15, T.ficha + 0.45, T.morning + 0.15, T.checkout + 0.25, T.final + 0.15].forEach((ts, i) => cue(ts, 'card', { k: i }));
    cue(T.ready + 0.6, 'tag', {});
    cue(T.checkin, 'checkin', {});
    cue(T.checkin + 0.3, 'light', { on: 1 });
    cue(T.checkin + 0.6, 'flip', { k: 0 });
    cue(T.checkin + 0.6, 'word', { k: 0 });
    cue(7.8, 'timelapse', { d: 2.6 });
    LAUNCH.forEach((t0, i) => { cue(t0, 'lantern', { k: i, d: TRAVEL }); cue(t0 + TRAVEL, 'star', { k: i }); });
    cue(COMANDA.pop, 'total', {});
    cue(COMANDA.fly, 'fly', { d: COMANDA.land - COMANDA.fly });
    cue(COMANDA.land, 'merge', {});
    cue(12.25, 'shooting', { d: 0.55 });
    cue(13.2, 'timelapse', { d: 2.4 });
    cue(14.7, 'birds', { d: 3.0 });
    cue(T.pay + 0.4, 'pix', {});
    cue(T.pay + 0.6, 'zero', {});
    cue(T.pay + 1.2, 'receipt', {});
    cue(T.checkout, 'checkout', {});
    cue(T.checkout + 0.3, 'light', { on: 0 });
    cue(T.checkout + 0.6, 'flip', { k: 1 });
    cue(T.checkout + 0.1, 'car', { d: 1.15, dir: 1 });
    cue(T.checkout + 1.05, 'flare', {});
    cue(20.4, 'sink', { d: 1.1 });
    cue(T.finale - 0.6, 'logorise', { d: 0.6 });
    cue(T.finale, 'logo', {});
    cue(T.finale + 0.25, 'rise', {});
    cue(T.finale + 0.7, 'rise', {});
    cue(T.finale + 1.0, 'type', { d: 0.35, n: 20 });
    cue(T.finale + 1.4, 'domain', {});
    cue(T.finale + 2.6, 'glint', { d: 0.6 });
    CUES.sort((a, b) => a.t - b.t);
  }

  function init(img) {
    LOGO = img;
    buildRoad();
    buildCues();
  }

  window.REEL05 = {
    init, renderAt, renderCover, DURATION, W, H,
    cues: () => ({ bpm: BPM, duration: DURATION, sections: T, cues: CUES.slice() }),
  };
})();
