/* =====================================================================
   SÉRIE ROTINA · CAPA de cada episódio (1080x1920)
   Preta; a logo oficial pequena no topo, no centro; o título do episódio
   (linha 1 branca, linha 2 limão, Inter Display Black, no maior tamanho que
   cabe) centralizado na vertical do recorte 3:4 (centro em y = 960).
   O título usa o mesmo ajuste do quadro 0 do vídeo (fitRows do anim.js).

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   faixa do contador livre (y 1560–1680), nada cortado nem escondido.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const I = ROTINA._capa;
  const { C, DISPLAY } = I;
  const CENTER = 960;                                  // centro do recorte 3:4 (y 240–1680)
  const L = {
    logoY: 356, logoD: 52, name: 30,                   // a logo, pequena, no alto (como nas capas dos Reels 02, 06 e 08)
    title: { maxW: 860, maxH: 900, max: 150, pref: 88, lead: 1.02 },
  };
  const BOXES = {};
  let LOGO = null, EP = null;

  function init(img, ep) { LOGO = img; EP = ep; }

  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, CENTER, 0, 540, CENTER, 1150);
    g.addColorStop(0, '#131412'); g.addColorStop(0.55, '#0C0D0B'); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // a logo: o símbolo oficial + o nome
    {
      const name = 'FAZLO Hospeda', nw = I.tw(ctx, name, DISPLAY, L.name, 900, -0.6), gap = 14;
      const x = 540 - (L.logoD + gap + nw) / 2;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(LOGO, x, L.logoY - L.logoD / 2, L.logoD, L.logoD);
      I.txt(ctx, name, x + L.logoD + gap, L.logoY + 11, { fam: DISPLAY, size: L.name, weight: 900, color: C.white, ls: -0.6 });
      BOXES['logo'] = { x0: x, x1: x + L.logoD + gap + nw, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 };
    }

    // o título, centrado em y = 960
    const lines = EP.titulo.some((ln) => ln.includes('*')) ? EP.titulo.map((ln) => I.rich(ln, C.white))
      : EP.titulo.map((ln, i) => I.rich(ln, i === 0 ? C.white : C.lime));
    const f = I.fitRows(ctx, lines, L.title), b = I.blockOf(f);
    const top = CENTER - b.h / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; I.glow(ctx, 540, CENTER, 620, C.lime, 0.045); ctx.restore();
    f.rows.forEach((row, i) => {
      const y = top + b.base[i];
      const w = I.drawRow(ctx, row, 540, y, f.size);
      const s = row.map((x) => x.s).join(' ');
      const desc = /[çgjpqy()]/.test(s) ? 0.21 : /[,;]/.test(s) ? 0.12 : 0;
      BOXES[`título, linha ${i + 1}`] = { x0: 540 - w / 2, x1: 540 + w / 2, y0: y - 0.727 * f.size, y1: y + desc * f.size };
    });
    BOXES['_bloco'] = { topo: top, base: top + b.h, centro: top + b.h / 2, tamanho: f.size };
  }

  window.ROTINACAPA = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
