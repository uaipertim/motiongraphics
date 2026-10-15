/* =====================================================================
   FAZLO Hospeda — REEL 08 · CAPA (1080x1920)
   "Você fechou a recepção. O celular, não." — a cena do carimbo do vídeo
   (11 s), compacta: a logo no alto; o título em Inter Display Black; o
   relógio marcando 23:59, menor que no vídeo, com a pilha de mensagens
   comprimida atrás dele (mais escura, só a ideia do acúmulo) e o chip limão
   "+37 NÃO LIDAS" carimbado por cima, levemente inclinado.
   O relógio e os cards são desenhados pelo próprio motor (anim.js, só lido):
   clock() no instante 11,25 s (23:59 em branco) e cardBody() de cada card.

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   faixa do contador livre (y 1560–1680), nada cortado nem escondido.
   O bloco título + relógio + pilha + chip fica centralizado na vertical do
   recorte 3:4 (centro em y = 960).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920, DEG = Math.PI / 180;
  const I = REEL08._capa;
  const { C, DISPLAY, MONO, CARD } = I;
  const T_CLOCK = 11.25;                         // 23:59, branco, depois do carimbo (no vídeo: base 650, 270 px)
  const CENTER = 960;                            // centro do recorte 3:4 (y 240–1680)
  const L = {
    logoY: 356, logoD: 52,                       // a logo, pequena, no alto (como nas capas novas)
    title: 128, lead: 1.0,                       // "Você fechou / a recepção. / O celular, não." (no vídeo: 124 px)
    gap: 80,                                     // do título ao relógio
    clock: 252,                                  // o relógio (no vídeo, 270 px)
    // a pilha: 3 cards comprimidos atrás do relógio (topo em relação à base do relógio, escala, escurecimento);
    // os de trás quase apagados — só a borda aparece, como a pilha do vídeo
    pile: [[-66, 0.8, 0.8], [-24, 0.87, 0.7], [26, 0.94, 0.4]],
    chip: { dy: 118, rot: -4, s: 0.92 },         // o carimbo: abaixo da base do relógio, sobre a pilha
  };
  const LINES = [['Você fechou', C.white], ['a recepção.', C.white], ['O celular, não.', C.lime]];
  const PILE_CARDS = [3, 4, 6];                  // JULIANA, RODRIGO, NÚMERO NOVO (os textos ficam no escuro)
  const BOXES = {};
  let LOGO = null;

  function init(img) { LOGO = img; }

  // as medidas do bloco (relativas ao topo do título)
  function layout(ctx) {
    const s = L.title, cap = 0.727 * s;
    const b = [cap, cap + s * L.lead, cap + 2 * s * L.lead];       // bases das 3 linhas
    const titleBottom = b[2] + 0.06 * s;                            // vírgula/ponto da 3ª linha
    const k = L.clock / 270;
    const clockTop = titleBottom + L.gap;
    const clockBase = clockTop + 0.715 * L.clock;                   // altura dos algarismos (Inter Display Black)
    const pile = L.pile.map(([dy, sc, dim]) => ({ top: clockBase + dy, sc, dim, h: CARD.h * sc, w: CARD.w * sc }));
    const pileBottom = Math.max(...pile.map((q) => q.top + q.h));
    const chipY = clockBase + L.chip.dy;
    const chipW = I.chipW * L.chip.s, chipH = 112 * L.chip.s;
    const a = L.chip.rot * DEG;
    const chipBottom = chipY + (Math.abs(Math.sin(a)) * chipW + Math.cos(a) * chipH) / 2;
    const bottom = Math.max(pileBottom, chipBottom);
    return { b, titleBottom, k, clockTop, clockBase, pile, chipY, chipW, chipH, a, bottom };
  }

  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // fundo da série: #0A0A0A, um respiro mais claro no meio e o brilho limão discreto atrás da pilha
    ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, CENTER, 0, 540, CENTER, 1150);
    g.addColorStop(0, '#131412'); g.addColorStop(0.55, '#0C0D0B'); g.addColorStop(1, '#0A0A0A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const m = layout(ctx);
    const top = CENTER - m.bottom / 2;            // o bloco inteiro centrado em y = 960
    const Y = (y) => top + y;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; I.glow(ctx, 540, Y(m.clockBase) + 60, 640, C.lime, 0.06); ctx.restore();

    // a logo: o símbolo oficial + o nome
    {
      const name = 'FAZLO Hospeda', nw = I.tw(ctx, name, DISPLAY, 30, 900, -0.6), gap = 14;
      const x = 540 - (L.logoD + gap + nw) / 2;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(LOGO, x, L.logoY - L.logoD / 2, L.logoD, L.logoD);
      I.txt(ctx, name, x + L.logoD + gap, L.logoY + 11, { fam: DISPLAY, size: 30, weight: 900, color: C.white, ls: -0.6 });
      BOXES['logo'] = { x0: x, x1: x + L.logoD + gap + nw, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 };
    }

    // o título
    LINES.forEach(([s, col], i) => {
      const size = L.title, ls = -0.03 * size;
      const w = I.tw(ctx, s, DISPLAY, size, 900, ls) - ls;
      I.txt(ctx, s, 540 - w / 2, Y(m.b[i]), { fam: DISPLAY, size, weight: 900, color: col, ls });
      const desc = /[çpgjq]/.test(s) ? 0.21 : /,/.test(s) ? 0.12 : 0;
      BOXES[`título, linha ${i + 1}`] = { x0: 540 - w / 2, x1: 540 + w / 2, y0: Y(m.b[i]) - 0.727 * size, y1: Y(m.b[i]) + desc * size };
    });

    // a pilha comprimida atrás do relógio (os mais antigos, mais ao fundo, primeiro), com o desenho do vídeo
    let px0 = 1e9, px1 = -1e9, py0 = 1e9, py1 = -1e9;
    m.pile.forEach((q, i) => {
      const yTop = Y(q.top);
      ctx.save();
      ctx.translate(CARD.x + CARD.w / 2, yTop + q.h / 2); ctx.scale(q.sc, q.sc); ctx.translate(-(CARD.x + CARD.w / 2), -CARD.h / 2);
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      I.rr(ctx, CARD.x, 0, CARD.w, CARD.h, CARD.r); ctx.fillStyle = C.card; ctx.fill();
      ctx.shadowColor = 'transparent';
      I.cardBody(ctx, PILE_CARDS[i], T_CLOCK, q.dim);
      ctx.restore();
      px0 = Math.min(px0, 540 - q.w / 2); px1 = Math.max(px1, 540 + q.w / 2); py0 = Math.min(py0, yTop); py1 = Math.max(py1, yTop + q.h);
    });
    BOXES['pilha de mensagens'] = { x0: px0, x1: px1, y0: py0, y1: py1, cena: true };

    // o relógio (clock() do vídeo, reduzido e reposicionado)
    ctx.save();
    ctx.translate(540, Y(m.clockBase)); ctx.scale(m.k, m.k); ctx.translate(-540, -650);
    I.clock(ctx, T_CLOCK);
    ctx.restore();
    BOXES['relógio 23:59'] = clockBox(ctx, Y(m.clockBase));

    // o carimbo "+37 NÃO LIDAS" (o desenho de stampChip(), já pousado)
    {
      const cy = Y(m.chipY), w = m.chipW, h = m.chipH;
      ctx.save();
      ctx.translate(540, cy); ctx.rotate(m.a);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      I.rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = C.lime; ctx.fill();
      ctx.shadowColor = 'transparent';
      I.txt(ctx, '+37 NÃO LIDAS', 0, 20 * L.chip.s, { size: 56 * L.chip.s, weight: 800, color: C.ink, align: 'center', ls: 1 * L.chip.s });
      ctx.restore();
      const ex = (Math.abs(Math.cos(m.a)) * w + Math.abs(Math.sin(m.a)) * h) / 2, ey = (Math.abs(Math.sin(m.a)) * w + Math.abs(Math.cos(m.a)) * h) / 2;
      BOXES['chip +37 NÃO LIDAS'] = { x0: 540 - ex, x1: 540 + ex, y0: cy - ey, y1: cy + ey };
    }
    BOXES['_bloco'] = { topo: top, base: top + m.bottom, centro: top + m.bottom / 2 };
  }

  // a caixa dos algarismos do relógio, medida nos pixels do próprio canvas (branco sobre o escuro)
  function clockBox(ctx, base) {
    const y0 = Math.round(base - 0.78 * L.clock), y1 = Math.round(base + 4);
    const d = ctx.getImageData(0, y0, W, y1 - y0).data;
    let x0 = W, x1 = 0, t0 = y1, t1 = y0;
    for (let y = 0; y < y1 - y0; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); t0 = Math.min(t0, y0 + y); t1 = Math.max(t1, y0 + y); }
    }
    return { x0, x1, y0: t0, y1: t1 + 1 };
  }

  window.REEL08CAPA = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
