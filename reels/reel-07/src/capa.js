/* =====================================================================
   FAZLO Hospeda — REEL 07 · CAPA (1080x1920)
   Composta com os mesmos elementos do vídeo (fontes, cores, papel térmico,
   blocos das perguntas, carimbo, fenda da impressora e logo), em arquivo
   próprio: o motor do Reel (anim.js) não é alterado.

   Área segura: a grade do perfil mostra só o recorte central 3:4
   (y 240–1680). Título, notinha e logo ficam inteiros dentro dele, com
   folga de 60 px: x 60–1020, y 300–1620 (SAFE).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const SAFE = { x0: 60, x1: 1020, y0: 300, y1: 1620 };
  const DISPLAY = "'R7 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'R7 Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#050505', bg2: '#0A0A0A', ink: '#121212', inkDots: '#8F8E87', paper: '#F2F2EC', lime: '#AFFA27', white: '#FFFFFF',
  };
  const LINES = [
    'SINAL DO CHALÉ 2 ...... caiu?',
    'PIX DO QUARTO 4 ....... de quem?',
    'COMANDA DA PISCINA .... fechou?',
    'DIÁRIA EXTRA DOMINGO .. anotou?',
  ];
  const TOTAL_S = 'TOTAL ............ ???';

  // ---------------------------------------------------------------- layout
  const TITLE = { l1: 'O feriado acabou.', l2: 'Agora começa a conta.', capTop: 372, maxW: 944, lead: 1.08, track: -0.03 };
  const PCX = 540, PW = 905, PX0 = PCX - PW / 2, PX1 = PCX + PW / 2;
  const SY = 1400;                                   // a fenda da impressora
  const TILT = -1.5 * Math.PI / 180;                 // a notinha (com a impressora) levemente inclinada
  const RS = 0.88;                                   // notinha um pouco menor que no vídeo: o título manda
  const FS = 44, FS_T = 56, COLS = 32;
  const V = { rule1: 56, line0: 130, pitch: 112, rule2: 556, total: 652, end: 750 };
  const LOGO_Y = 1530, LOGO_D = 72, WORD_FS = 30;

  // ---------------------------------------------------------------- utilitários (os mesmos do motor)
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  function hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const css = (c, al = 1) => { const a = hex(c); return `rgba(${a[0]},${a[1]},${a[2]},${al})`; };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function glow(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, css(color, a)); g.addColorStop(0.4, css(color, a * 0.35)); g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  function setFont(ctx, fam, size, weight, align = 'left', ls = 0) {
    ctx.font = `${weight} ${size}px ${fam}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px';
  }
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, 'left', ls); return ctx.measureText(s).width; }
  function parse(s) {
    const c1 = s.indexOf(' .'), c2 = s.lastIndexOf('. ') + 2;
    return { label: s.slice(0, c1), dots: s.slice(c1, c2), q: s.slice(c2), c1, c2 };
  }

  let LOGO = null, CW = 26.4, TX0 = 0, CW_T = 33.6, TW_T = 739, PARSED = [], TP = null;
  let STAMP_POLY = [], HOLES = [], SPECKS = [], PAPER_CANVAS = null;
  const BOXES = {};                                   // caixas ocupadas (para a verificação da área segura)

  // ---------------------------------------------------------------- fundo
  function background(ctx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 1060, 0, 540, 1060, 1150);
    g.addColorStop(0, '#141513'); g.addColorStop(0.55, C.bg2); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 540, SY, 640, C.lime, 0.05);                     // o brilho verde suave da fenda
    glow(ctx, 540, 1060, 760, C.lime, 0.018);
    ctx.restore();
  }

  // ---------------------------------------------------------------- título
  function title(ctx) {
    // mesmo corpo nas duas linhas, o maior que cabe na largura útil (a linha 2 é a mais longa)
    let size = 140;
    const fits = (s) => tw(ctx, TITLE.l2, DISPLAY, s, 900, s * TITLE.track) <= TITLE.maxW && tw(ctx, TITLE.l1, DISPLAY, s, 900, s * TITLE.track) <= TITLE.maxW;
    while (size > 40 && !fits(size)) size -= 1;
    const cap = size * 0.727, base1 = TITLE.capTop + cap, base2 = base1 + size * TITLE.lead;
    [[TITLE.l1, C.white, base1], [TITLE.l2, C.lime, base2]].forEach(([s, col, y]) => {
      const w = tw(ctx, s, DISPLAY, size, 900, size * TITLE.track);
      setFont(ctx, DISPLAY, size, 900, 'left', size * TITLE.track);
      ctx.fillStyle = col; ctx.fillText(s, 540 - w / 2, y);
    });
    BOXES.title = { size, y0: TITLE.capTop, y1: base2 + size * 0.2 };
  }

  // ---------------------------------------------------------------- a notinha saindo da fenda
  function paperPath(ctx, bottom) {
    const tooth = 18, hT = 9;
    ctx.beginPath(); ctx.moveTo(PX0, hT);
    for (let x = PX0; x < PX1 - 0.5; x += tooth) { ctx.lineTo(x + tooth / 2, 0); ctx.lineTo(Math.min(PX1, x + tooth), hT); }
    ctx.lineTo(PX1, bottom); ctx.lineTo(PX0, bottom); ctx.closePath();
  }
  function dashRow(ctx, v, color) {
    ctx.fillStyle = color;
    for (let k = 0; k < COLS; k++) ctx.fillRect(TX0 + k * CW + CW * 0.2, v - 1.5, CW * 0.6, 3);
  }
  function line(ctx, i) {
    const P = PARSED[i], y = V.line0 + i * V.pitch, base = y + 16;
    setFont(ctx, MONO, FS, 800); ctx.fillStyle = C.ink; ctx.fillText(P.label, TX0, base);
    setFont(ctx, MONO, FS, 700); ctx.fillStyle = C.inkDots; ctx.fillText(P.dots, TX0 + P.c1 * CW, base);
    // a pergunta em destaque: verde-limão num bloco impresso em negativo
    const x0 = TX0 + P.c2 * CW - 11, wch = P.q.length * CW + 22, hh = 60;
    rr(ctx, x0, y - hh / 2, wch, hh, 10); ctx.fillStyle = C.ink; ctx.fill();
    setFont(ctx, MONO, FS, 800); ctx.fillStyle = C.lime; ctx.fillText(P.q, x0 + 11, base);
  }
  function stamp(ctx) {
    ctx.save(); ctx.translate(PCX, V.total); ctx.rotate(-2.2 * DEG);
    ctx.beginPath(); STAMP_POLY.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
    ctx.fillStyle = C.ink; ctx.fill();
    setFont(ctx, MONO, FS_T, 800);
    ctx.fillStyle = C.paper; ctx.fillText(TP.label, -TW_T / 2, 20);
    ctx.fillStyle = '#BDBCB5'; ctx.fillText(TP.dots, -TW_T / 2 + TP.c1 * CW_T, 20);
    ctx.fillStyle = C.lime; ctx.fillText(TP.q, -TW_T / 2 + TP.c2 * CW_T, 20);
    ctx.fillStyle = C.paper;
    for (const [hx, hy, r] of HOLES) { circle(ctx, hx, hy, r); ctx.fill(); }
    ctx.fillStyle = C.ink;
    for (const [sx, sy, r] of SPECKS) { circle(ctx, sx, sy, r); ctx.fill(); }
    ctx.restore();
  }
  function receipt(ctx) {
    ctx.save();
    ctx.translate(540, SY); ctx.rotate(TILT); ctx.scale(RS, RS); ctx.translate(-540, -SY);
    // o papel (só acima da fenda)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, SY); ctx.clip();
    ctx.translate(0, SY - V.end);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 14;
    paperPath(ctx, V.end + 40); ctx.fillStyle = C.paper; ctx.fill(); ctx.restore();
    ctx.save(); paperPath(ctx, V.end + 40); ctx.clip();
    ctx.globalAlpha = 0.9; ctx.fillStyle = ctx.createPattern(PAPER_CANVAS, 'repeat'); ctx.fillRect(PX0, 0, PW, V.end + 40); ctx.globalAlpha = 1;
    let g = ctx.createLinearGradient(PX0, 0, PX0 + 22, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(PX0, 0, 22, V.end + 40);
    g = ctx.createLinearGradient(PX1, 0, PX1 - 22, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(PX1 - 22, 0, 22, V.end + 40);
    g = ctx.createLinearGradient(0, 0, 0, 46);
    g.addColorStop(0, 'rgba(0,0,0,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(PX0, 0, PW, 46);
    g = ctx.createLinearGradient(0, V.end - 80, 0, V.end);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.24)'); ctx.fillStyle = g; ctx.fillRect(PX0, V.end - 80, PW, 80);
    g = ctx.createLinearGradient(0, V.end - 46, 0, V.end);
    g.addColorStop(0, css(C.lime, 0)); g.addColorStop(1, css(C.lime, 0.12)); ctx.fillStyle = g; ctx.fillRect(PX0, V.end - 46, PW, 46);
    dashRow(ctx, V.rule1, C.inkDots);
    for (let i = 0; i < LINES.length; i++) line(ctx, i);
    dashRow(ctx, V.rule2 - 6, C.ink); dashRow(ctx, V.rule2 + 6, C.ink);
    ctx.restore();
    stamp(ctx);
    ctx.restore();
    // a impressora: só a boca, com a fenda acesa (a frente se apaga para o fundo)
    const x0 = 72, x1 = 1008;
    const gb = ctx.createLinearGradient(0, SY - 12, 0, SY + 120);
    gb.addColorStop(0, '#20211F'); gb.addColorStop(0.35, '#121311'); gb.addColorStop(1, 'rgba(5,5,5,0)');
    rr(ctx, x0, SY - 12, x1 - x0, 140, 28); ctx.fillStyle = gb; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(x0 + 34, SY - 11, x1 - x0 - 68, 2);
    rr(ctx, x0 + 22, SY - 7, x1 - x0 - 44, 14, 7); ctx.fillStyle = '#000'; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const hw = 440, gl = ctx.createLinearGradient(540 - hw, 0, 540 + hw, 0);
    gl.addColorStop(0, css(C.lime, 0)); gl.addColorStop(0.12, css(C.lime, 0.75)); gl.addColorStop(0.88, css(C.lime, 0.75)); gl.addColorStop(1, css(C.lime, 0));
    ctx.fillStyle = gl; ctx.fillRect(540 - hw, SY - 2, 2 * hw, 4);
    ctx.save(); ctx.translate(540, SY); ctx.scale(hw / 70, 1); glow(ctx, 0, 0, 70, C.lime, 0.2); ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- logo pequena e discreta
  function brand(ctx) {
    const gap = 14, ww = tw(ctx, 'FAZLO Hospeda', DISPLAY, WORD_FS, 900, -0.75);
    const total = LOGO_D + gap + ww, x0 = 540 - total / 2;
    ctx.save(); ctx.globalAlpha = 0.92;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, x0, LOGO_Y - LOGO_D / 2, LOGO_D, LOGO_D);
    setFont(ctx, DISPLAY, WORD_FS, 900, 'left', -0.75); ctx.fillStyle = C.white;
    ctx.fillText('FAZLO Hospeda', x0 + LOGO_D + gap, LOGO_Y + WORD_FS * 0.36);
    ctx.restore();
    BOXES.logo = { x0, x1: x0 + total, y0: LOGO_Y - LOGO_D / 2, y1: LOGO_Y + LOGO_D / 2 };
  }

  function init(img) {
    LOGO = img;
    const m = document.createElement('canvas').getContext('2d');
    CW = tw(m, '0', MONO, FS, 800);
    TX0 = PCX - (COLS * CW) / 2;
    CW_T = tw(m, '0', MONO, FS_T, 800);
    TW_T = TOTAL_S.length * CW_T;
    PARSED = LINES.map(parse);
    TP = parse(TOTAL_S);
    // carimbo: mesmas sementes do vídeo
    const bw = TW_T / 2 + 30, bh = 50;
    STAMP_POLY = [];
    const edge = (x0, y0, x1, y1, seed) => {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 7));
      for (let k = 0; k < n; k++) {
        const u = k / n, j = (hash(k, seed) - 0.5) * 3.2;
        const nx = y1 - y0, ny = x0 - x1, l = Math.hypot(nx, ny);
        STAMP_POLY.push([lerp(x0, x1, u) + (nx / l) * j, lerp(y0, y1, u) + (ny / l) * j]);
      }
    };
    edge(-bw, -bh, bw, -bh, 11); edge(bw, -bh, bw, bh, 12); edge(bw, bh, -bw, bh, 13); edge(-bw, bh, -bw, -bh, 14);
    HOLES = [];
    for (let k = 0; k < 140; k++) {
      const hx = (hash(k, 21) - 0.5) * 2 * bw, hy = (hash(k, 22) - 0.5) * 2 * bh;
      if (Math.min(bw - Math.abs(hx), bh - Math.abs(hy)) < 11) HOLES.push([hx, hy, 0.8 + 1.6 * hash(k, 23)]);
    }
    SPECKS = [];
    for (let k = 0; k < 26; k++) {
      const side = hash(k, 31), along = (hash(k, 32) - 0.5) * 2, out = 8 + 26 * hash(k, 33);
      const sx = side < 0.5 ? along * bw : Math.sign(along || 1) * (bw + out);
      const sy = side < 0.5 ? Math.sign(hash(k, 34) - 0.5) * (bh + out * 0.6) : (hash(k, 35) - 0.5) * 2 * bh;
      SPECKS.push([sx, sy, 1 + 2.4 * hash(k, 36)]);
    }
    PAPER_CANVAS = document.createElement('canvas'); PAPER_CANVAS.width = PAPER_CANVAS.height = 256;
    const g = PAPER_CANVAS.getContext('2d');
    for (let k = 0; k < 1400; k++) {
      g.fillStyle = `rgba(110,106,96,${0.025 + 0.05 * hash(k, 5)})`;
      g.fillRect(hash(k, 3) * 256, hash(k, 4) * 256, 1 + 3 * hash(k, 6), 1);
    }
  }

  function render(ctx) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    background(ctx);
    receipt(ctx);
    title(ctx);
    brand(ctx);
    // caixas da notinha (com a inclinação) para a verificação
    const corners = [[PX0, SY - V.end], [PX1, SY - V.end], [PX0, SY], [PX1, SY]].map(([x, y]) => {
      const dx = (x - 540) * RS, dy = (y - SY) * RS;
      return [540 + dx * Math.cos(TILT) - dy * Math.sin(TILT), SY + dx * Math.sin(TILT) + dy * Math.cos(TILT)];
    });
    BOXES.receipt = { x0: Math.min(...corners.map((c) => c[0])), x1: Math.max(...corners.map((c) => c[0])), y0: Math.min(...corners.map((c) => c[1])), y1: SY + 7 * RS };
  }

  window.REEL07CAPA = { init, render, SAFE, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
