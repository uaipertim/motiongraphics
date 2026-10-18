/* =====================================================================
   FAZLO Hospeda — REEL 00 · CORTE CURTO · CAPA (1080x1920)
   O gancho do vídeo: "Reserva no caderno," / "caixa na planilha," (branco) e
   "comanda no papel?" (limão), em Inter Display 900, com a SINETA do primeiro
   quadro do vídeo (desenhada pelo próprio motor, drawBell) tocando embaixo.
   Fundo preto da série; a logo pequena no topo, no centro.

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   faixa do contador livre (y 1560–1680), nada cortado nem escondido.
   O título fica centralizado na vertical do recorte 3:4 (centro em y = 960);
   a sineta vem logo abaixo.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  let I = null;
  const DISPLAY = "'R0 Display', 'Inter Display', 'Inter', sans-serif";
  const C = { bg: '#060606', bg2: '#0A0A0A', lime: '#AFFA27', white: '#FFFFFF' };
  const CENTER = 960;                                      // centro do recorte 3:4 (y 240–1680)
  const L = { logoY: 356, logoD: 52, wordFS: 30, size: 112, lead: 1.06, maxW: 900, bellW: 440, bellGap: 70, bellTop: 1210 };
  const LINES = [['Reserva no caderno,', C.white], ['caixa na planilha,', C.white], ['comanda no papel?', C.lime]];
  const BOXES = {};
  let LOGO = null;

  function setFont(ctx, size, weight, ls = 0) { ctx.font = `${weight} ${size}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px'; }
  const tw = (ctx, s, size, weight, ls = 0) => { setFont(ctx, size, weight, ls); return ctx.measureText(s).width; };
  function init(img) { LOGO = img; I = REEL00._capa; }

  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, CENTER + 150, 0, 540, CENTER + 150, 1100);
    g.addColorStop(0, '#141513'); g.addColorStop(0.55, C.bg2); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // a logo, pequena, no topo
    {
      const name = 'FAZLO Hospeda', nw = tw(ctx, name, L.wordFS, 900, -0.6), gap = 14, x = 540 - (L.logoD + gap + nw) / 2;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(LOGO, x, L.logoY - L.logoD / 2, L.logoD, L.logoD);
      setFont(ctx, L.wordFS, 900, -0.6); ctx.fillStyle = C.white; ctx.fillText(name, x + L.logoD + gap, L.logoY + 11);
      BOXES['logo'] = { x0: x, x1: x + L.logoD + gap + nw, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 };
    }

    // o título: o maior corpo em que a linha mais larga cabe em 900 px; bloco centrado em y = 960
    const S = Math.floor(Math.min(...LINES.map(([s]) => 100 * L.maxW / tw(ctx, s, 100, 900, -2.5)), L.size * 10)), ls = -0.025 * S, lh = Math.round(S * L.lead);
    const cap = 0.727 * S, h = cap + 2 * lh + 0.22 * S, top = CENTER - h / 2;
    LINES.forEach(([s, col], i) => {
      const w = tw(ctx, s, S, 900, ls), b = top + cap + i * lh;
      setFont(ctx, S, 900, ls); ctx.fillStyle = col; ctx.fillText(s, 540 - w / 2, b);
      BOXES[`título, linha ${i + 1}`] = { x0: 540 - w / 2, x1: 540 + w / 2, y0: b - cap, y1: b + (i === 2 ? 0.22 : 0.2) * S };
    });
    BOXES['_bloco'] = { topo: top, base: top + h, centro: top + h / 2, tamanho: S };

    // a sineta do gancho, tocando (ondas sonoras dos dois lados, como no quadro 0,3 s do vídeo)
    const bx = 540, bw = L.bellW, by = top + h + L.bellGap + bw * 0.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; I.radial(ctx, bx, by - bw * 0.3, 520, C.lime, 0.2); ctx.restore();
    const cy = by - bw * 0.16;
    for (let j = 0; j < 3; j++) {
      const r = bw * (0.62 + 0.2 * j);
      ctx.save(); ctx.globalAlpha = 0.85 - 0.25 * j;
      ctx.beginPath(); ctx.arc(bx, cy, r, I.deg(180 - 32), I.deg(180 + 32)); I.stroke(ctx, C.lime, 12 - 3 * j);
      ctx.beginPath(); ctx.arc(bx, cy, r, I.deg(-32), I.deg(32)); I.stroke(ctx, C.lime, 12 - 3 * j);
      ctx.restore();
    }
    I.drawBell(ctx, bx, by, bw, 0.9, 0.03);
    // a caixa da sineta + ondas: medida nos pixels (o que se destaca do fundo, na faixa da sineta)
    const y0 = Math.round(by - bw * 0.62), y1 = Math.round(by + bw * 0.36);
    const d = ctx.getImageData(0, y0, W, y1 - y0).data;
    let xa = W, xb = 0, ya = y1, yb = y0;
    for (let y = 0; y < y1 - y0; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 1] > 120 && d[i] < 230) { xa = Math.min(xa, x); xb = Math.max(xb, x); ya = Math.min(ya, y0 + y); yb = Math.max(yb, y0 + y); }
    }
    BOXES['visual (a sineta e as ondas)'] = { x0: xa, x1: xb + 1, y0: ya, y1: yb + 1 };
  }

  window.CAPACURTO = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
