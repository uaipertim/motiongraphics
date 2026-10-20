/* =====================================================================
   SÉRIE FALA · CAPA de cada episódio (1080x1920)
   O quadro 0 do vídeo: o gancho (a 1ª cena do JSON: 1ª linha branca, 2ª limão), em Inter Display 900 no maior
   corpo que cabe, com a logo oficial pequena no topo, no centro, num fundo preto. O título é o mesmo da cena
   "titulo" do episódio; se ficar pequeno em 2 linhas, cada linha pode quebrar em duas (no ponto mais equilibrado).
   O bloco fica centralizado na vertical do recorte 3:4 (centro em y = 960).

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px (x 60–1020, y 300–1620), canto do
   play livre (x ≥ 860, y 240–440), faixa do contador livre (y 1560–1680), nada cortado nem escondido.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920, CENTER = 960;
  const I = FALA;
  const { C, DISPLAY, M } = I;
  const L = { logoY: 356, logoD: 52, wordFS: 30, maxW: 880, max: 150, pref: 104, lead: 1.04 };
  const BOXES = {};
  let LOGO = null, EP = null;

  function init(img, ep) { LOGO = img; EP = ep; }

  function rowsFor(ctx) {
    const lines = EP.cenas[0].dados.linhas.map((l, i) => I.rich(l, i === 0 ? C.white : C.lime));
    const opts = lines.map((ln) => {
      const o = [[ln]];
      if (ln.length > 1) {
        let best = null;
        for (let k = 1; k < ln.length; k++) { const a = ln.slice(0, k), b = ln.slice(k), m = Math.max(I.rowW100(ctx, a), I.rowW100(ctx, b)); if (!best || m < best.m) best = { m, rows: [a, b] }; }
        o.push(best.rows);
      }
      return o;
    });
    let combos = [[]];
    opts.forEach((op) => { combos = combos.flatMap((c) => op.map((rows) => c.concat(rows))); });
    const size = (rows) => Math.floor(Math.min(L.max, ...rows.map((r) => L.maxW * 100 / I.rowW100(ctx, r)), 900 / (0.75 + (rows.length - 1) * L.lead + 0.2)));
    const whole = combos[0];
    if (size(whole) >= L.pref) return { rows: whole, size: size(whole) };
    let best = { rows: whole, size: size(whole) };
    combos.forEach((rows) => { const s = size(rows); if (s > best.size * 1.02) best = { rows, size: s }; });
    return best;
  }

  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, CENTER, 0, 540, CENTER, 1150);
    g.addColorStop(0, '#141513'); g.addColorStop(0.55, '#0E0F0E'); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // a logo: o símbolo oficial + o nome
    {
      const name = 'FAZLO Hospeda', nw = I.tw(ctx, name, DISPLAY, L.wordFS, 900, -0.6), gap = 14, x = 540 - (L.logoD + gap + nw) / 2;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(LOGO, x, L.logoY - L.logoD / 2, L.logoD, L.logoD);
      I.txt(ctx, name, x + L.logoD + gap, L.logoY + 11, { fam: DISPLAY, size: L.wordFS, weight: 900, color: C.white, ls: -0.6 });
      BOXES['logo'] = { x0: x, x1: x + L.logoD + gap + nw, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 };
    }
    // o título, centrado em y = 960
    const { rows, size } = rowsFor(M), lh = Math.round(size * L.lead), cap = 0.727 * size, h = cap + (rows.length - 1) * lh + 0.22 * size, top = CENTER - h / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; I.glow(ctx, 540, CENTER, 620, C.lime, 0.045); ctx.restore();
    rows.forEach((row, i) => {
      const y = top + cap + i * lh, w = I.drawRow(ctx, row, 540, y, size);
      BOXES[`título, linha ${i + 1}`] = { x0: 540 - w / 2, x1: 540 + w / 2, y0: y - cap, y1: y + 0.22 * size };
    });
    BOXES['_bloco'] = { topo: top, base: top + h, centro: top + h / 2, tamanho: size };
  }

  window.FALACAPA = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
