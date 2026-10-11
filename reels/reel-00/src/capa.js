/* =====================================================================
   FAZLO Hospeda — REEL 00 · CAPA NOVA (1080x1920)
   "Sob o mesmo teto." — a casa inteira do próprio Reel (os seis cômodos
   sob o telhado, quadro de 22,35 s renderizado pelo motor do vídeo, sem o
   título que aparece por cima dele no filme), com título, subtítulo e a
   logo pequena. O motor (anim.js) é só lido: o vídeo não muda.

   Regra fixa das capas (reels/README.md):
     a) título, visual e logo dentro do recorte 3:4 (y 240–1680) com folga
        de 60 px: x 60–1020, y 300–1620;
     b) canto do ícone de play livre: nada em x ≥ 860, y 240–440;
     c) nenhum elemento cortado.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const DISPLAY = "'R0 Display', 'Inter Display', 'Inter', sans-serif";
  const C = { bg: '#060606', bg2: '#0A0A0A', lime: '#AFFA27', white: '#FFFFFF' };
  const HOUSE_T = 22.35;                                   // a casa inteira, telhado já pousado
  const CROP = { x: 160, y: 496, w: 760, h: 1104 };          // a casa no quadro (sem o título do filme, que fica acima de y 470)
  const L = { titleCap: 306, size: 150, lead: 0.98, sub: 56, houseGap: 64, houseBottom: 1520, logoY: 1578, logoD: 64, wordFS: 28 };
  const BOXES = {};

  function setFont(ctx, size, weight, ls = 0) { ctx.font = `${weight} ${size}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px'; }
  function tw(ctx, s, size, weight, ls = 0) { setFont(ctx, size, weight, ls); return ctx.measureText(s).width; }
  function center(ctx, s, y, size, weight, color, ls) { const w = tw(ctx, s, size, weight, ls); setFont(ctx, size, weight, ls); ctx.fillStyle = color; ctx.fillText(s, 540 - w / 2, y); return { x0: 540 - w / 2, x1: 540 + w / 2 }; }

  let HOUSE = null, LOGO = null;
  function init(img) {
    LOGO = img;
    // o quadro da casa, renderizado pelo motor do Reel 00 (sem motion blur)
    const f = document.createElement('canvas'); f.width = W; f.height = H;
    REEL00.renderAt(f.getContext('2d'), HOUSE_T, { noBlur: true });
    HOUSE = document.createElement('canvas'); HOUSE.width = CROP.w; HOUSE.height = CROP.h;
    const h = HOUSE.getContext('2d');
    h.drawImage(f, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, CROP.w, CROP.h);
    // o fundo do filme (#060606, liso) vira transparente: a casa pousa sobre o fundo da capa sem emenda
    const d = h.getImageData(0, 0, CROP.w, CROP.h), px = d.data;
    for (let i = 0; i < px.length; i += 4) if (Math.abs(px[i] - 6) <= 1 && Math.abs(px[i + 1] - 6) <= 1 && Math.abs(px[i + 2] - 6) <= 1) px[i + 3] = 0;
    h.putImageData(d, 0, 0);
  }

  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 1120, 0, 540, 1120, 1100);
    g.addColorStop(0, '#141513'); g.addColorStop(0.55, C.bg2); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // título: "Sob o" fica na faixa do ícone de play (y 240–440), por isso é a linha curta, centrada e longe de x 860
    const S = L.size, b1 = L.titleCap + S * 0.727, b2 = b1 + S * L.lead;
    const l1 = center(ctx, 'Sob o', b1, S, 900, C.white, -0.03 * S);
    const l2 = center(ctx, 'mesmo teto.', b2, S, 900, C.white, -0.03 * S);
    const bs = b2 + 18 + L.sub * 1.05;
    const sub = center(ctx, 'A pousada inteira num só sistema.', bs, L.sub, 800, C.lime, -0.01 * L.sub);
    // a casa: o maior tamanho que cabe entre o subtítulo e a logo
    const top = bs + L.houseGap, sc = (L.houseBottom - top) / CROP.h, hw = CROP.w * sc;
    const gl = ctx.createRadialGradient(540, top + CROP.h * sc * 0.62, 0, 540, top + CROP.h * sc * 0.62, 620);
    gl.addColorStop(0, 'rgba(175,250,39,0.07)'); gl.addColorStop(1, 'rgba(175,250,39,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(HOUSE, 540 - hw / 2, top, hw, CROP.h * sc);
    // logo pequena e discreta
    const ww = tw(ctx, 'FAZLO Hospeda', L.wordFS, 900, -0.7), total = L.logoD + 12 + ww, x0 = 540 - total / 2;
    ctx.save(); ctx.globalAlpha = 0.92;
    ctx.drawImage(LOGO, x0, L.logoY - L.logoD / 2, L.logoD, L.logoD);
    setFont(ctx, L.wordFS, 900, -0.7); ctx.fillStyle = C.white; ctx.fillText('FAZLO Hospeda', x0 + L.logoD + 12, L.logoY + L.wordFS * 0.36);
    ctx.restore();
    Object.assign(BOXES, {
      'título, linha 1': { x0: l1.x0, x1: l1.x1, y0: L.titleCap, y1: b1 },
      'título, linha 2': { x0: l2.x0, x1: l2.x1, y0: b2 - S * 0.727, y1: b2 + 6 },
      'subtítulo': { x0: sub.x0, x1: sub.x1, y0: bs - L.sub * 0.75, y1: bs + L.sub * 0.22 },
      'visual (a casa)': { x0: 540 - hw / 2, x1: 540 + hw / 2, y0: top, y1: top + CROP.h * sc },
      logo: { x0, x1: x0 + total, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 },
    });
  }

  window.REEL00CAPA = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
