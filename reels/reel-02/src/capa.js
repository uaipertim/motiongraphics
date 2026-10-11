/* =====================================================================
   FAZLO Hospeda — REEL 02 · CAPA NOVA (1080x1920)
   A mesma cena da capa anterior (o gancho do vídeo, ~3,0 s): "Tem vaga"
   (branco) / "pro fim de semana?" (limão) no corpo do vídeo, cercado pelas
   perguntas dos hóspedes em chips. Fundo, título e chips com o mesmo desenho
   do motor (bgSpace() e sceneHook() em anim.js, que só é lido).
   Correções em relação à capa anterior: 6 chips (eram 8), todos inteiros,
   sem um cobrindo o outro ("QUARTO PARA 4 PESSOAS?" ficava atrás de "TEM NO
   FERIADO?"), nenhum no canto do play nem saindo pelo alto do recorte
   ("2 ADULTOS E 1 CRIANÇA?") ou na faixa do contador; a logo pequena no
   alto, no mesmo lugar das capas dos Reels 06 e 05.

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   faixa do contador livre (y 1560–1680), nada cortado nem escondido.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080;
  const I = REEL02._capa;
  const { C, DISPLAY, MONO } = I;
  const TC = 3.0;                                // fundo (brilho e poeira) do quadro da capa anterior
  const L = { logoY: 356, logoD: 52, y1: 876 };  // título: o mesmo do vídeo (y 880), 4 px acima
  // os chips: texto, canto esquerdo (x), centro (y) e giro (graus) — o giro e o corpo de cada um como no vídeo
  const ASKS = [
    { s: 'DIA 12 AINDA TEM?', x: 70, y: 480, r: -3 },
    { s: '2 ADULTOS E 1 CRIANÇA?', x: 392, y: 612, r: 3 },
    { s: 'QUARTO PARA 4 PESSOAS?', x: 70, y: 1112, r: 2 },
    { s: 'TEM NO FERIADO?', x: 528, y: 1236, r: -3 },
    { s: 'CHEGO SEXTA, PODE SER?', x: 286, y: 1360, r: -2 },
    { s: 'DÁ PRA FICAR MAIS 1 DIÁRIA?', x: 70, y: 1480, r: 1 },
  ];
  const BOXES = {};
  let LOGO = null;

  function init(img) { LOGO = img; }

  // o chip de pergunta, com o desenho de sceneHook()
  function ask(ctx, a) {
    const w = I.tw(ctx, a.s, MONO, 36, 800, 1.5) + 104, cx = a.x + w / 2, ang = I.deg(a.r);
    ctx.save(); ctx.translate(cx, a.y); ctx.rotate(ang);
    I.rr(ctx, -w / 2, -44, w, 88, 44); I.fill(ctx, '#151515');
    I.rr(ctx, -w / 2, -44, w, 88, 44); I.stroke(ctx, C.line2, 3);
    I.circle(ctx, -w / 2 + 42, 0, 10); I.fill(ctx, C.lime);
    I.txt(ctx, a.s, -w / 2 + 72, 13, { size: 36, weight: 800, color: C.white, ls: 1.5 });
    ctx.restore();
    // caixa do chip girado (com o contorno)
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const dx = sx * (w / 2 + 1.5), dy = sy * 45.5;
      return [cx + dx * Math.cos(ang) - dy * Math.sin(ang), a.y + dx * Math.sin(ang) + dy * Math.cos(ang)];
    });
    return { x0: Math.min(...pts.map((q) => q[0])), x1: Math.max(...pts.map((q) => q[0])), y0: Math.min(...pts.map((q) => q[1])), y1: Math.max(...pts.map((q) => q[1])) };
  }

  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    I.bgSpace(ctx, TC, 0.06 + 0.05 * Math.min(1, TC / I.BAR));
    ASKS.forEach((a) => { BOXES['chip “' + a.s + '”'] = ask(ctx, a); });
    // o título, com os corpos do vídeo (layoutHook: "Tem vaga" e a 2ª linha cabem em 920 px)
    const s1 = I.fit(ctx, 'Tem vaga', 920, 250), s2 = I.fit(ctx, 'pro fim de semana?', 920, 110), y2 = L.y1 + s2 * 1.25;
    I.txt(ctx, 'Tem vaga', 540, L.y1, { fam: DISPLAY, size: s1, weight: 900, color: C.white, align: 'center', ls: -s1 * 0.025 });
    I.txt(ctx, 'pro fim de semana?', 540, y2, { fam: DISPLAY, size: s2, weight: 900, color: C.lime, align: 'center', ls: -s2 * 0.025 });
    const w1 = I.tw(ctx, 'Tem vaga', DISPLAY, s1, 900, -s1 * 0.025) + s1 * 0.025, w2 = I.tw(ctx, 'pro fim de semana?', DISPLAY, s2, 900, -s2 * 0.025) + s2 * 0.025;
    BOXES['título, linha 1'] = { x0: 540 - w1 / 2, x1: 540 + w1 / 2, y0: L.y1 - 0.73 * s1, y1: L.y1 };
    BOXES['título, linha 2'] = { x0: 540 - w2 / 2, x1: 540 + w2 / 2, y0: y2 - 0.73 * s2, y1: y2 + 0.21 * s2 };
    // a logo, pequena: o símbolo oficial + o nome
    const name = 'FAZLO Hospeda', nw = I.tw(ctx, name, DISPLAY, 30, 900, -0.6), gap = 14;
    const x = 540 - (L.logoD + gap + nw) / 2;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, x, L.logoY - L.logoD / 2, L.logoD, L.logoD);
    I.txt(ctx, name, x + L.logoD + gap, L.logoY + 11, { fam: DISPLAY, size: 30, weight: 900, color: C.white, ls: -0.6 });
    BOXES['logo'] = { x0: x, x1: x + L.logoD + gap + nw, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 };
  }

  window.REEL02CAPA = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
