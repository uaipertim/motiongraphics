/* =====================================================================
   FAZLO Hospeda — REEL 03 · CAPA NOVA (1080x1920)
   O cartão de título do próprio Reel (cena 2, 4,5–6 s): fundo limão com a
   escala de segredo gravada ao fundo, "FAZLO HOSPEDA" em mono no topo,
   "CONTROLE / DE CAIXA." em Inter Display 900 preto, a linha e o rodapé em
   mono. Mesmo desenho do motor (sceneTitle em anim.js, copiado aqui), com o
   título um pouco menor (folga lateral), o rodapé completo — no vídeo, ele
   ainda estava sendo digitado no quadro usado antes — e a logo pequena.
   O motor e o vídeo não mudam.

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   nada cortado.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const DISPLAY = "'R3 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'R3 Mono', 'JetBrains Mono', monospace";
  const C = { ink: '#0A0A0A', lime: '#AFFA27', limeDeep: '#5A8A0E' };
  const ROT = 0.385;                         // a escala na mesma posição do quadro de 5,6 s
  // o bloco do cartão centrado no recorte 3:4; título de 180 px (vídeo) para 150 px
  const L = { brand: 610, size: 150, l1: 808, l2: 956, bar: 1018, foot: 1086, logoY: 1330, logoD: 104 };
  const FOOT = 'ABERTURA · LANÇAMENTOS · CONFERÊNCIA · FECHAMENTO';
  const BOXES = {};
  let LOGO = null;

  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  function setFont(ctx, fam, size, weight, ls) { ctx.font = `${weight} ${size}px ${fam}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px'; }
  function center(ctx, s, y, fam, size, weight, ls, color) {
    setFont(ctx, fam, size, weight, ls);
    const w = ctx.measureText(s).width - ls;              // sem o espaçamento depois da última letra
    ctx.fillStyle = color; ctx.fillText(s, 540 - w / 2, y);
    return { x0: 540 - w / 2, x1: 540 + w / 2 };
  }

  function init(img) { LOGO = img; }
  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W, H);
    // a escala de segredo gigante, gravada ao fundo (como no vídeo)
    ctx.save(); ctx.translate(1180, 1720); ctx.rotate(ROT);
    ctx.lineCap = 'round';
    for (let j = 0; j < 180; j++) {
      const a = (j / 180) * TAU, r1 = 1180, r0 = j % 10 === 0 ? 1080 : j % 5 === 0 ? 1120 : 1150;
      ctx.beginPath(); ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a)); ctx.lineTo(r1 * Math.cos(a), r1 * Math.sin(a));
      ctx.strokeStyle = rgba(C.limeDeep, j % 10 === 0 ? 0.55 : 0.3); ctx.lineWidth = j % 10 === 0 ? 5 : 3; ctx.stroke();
    }
    for (const r of [1000, 1010, 760]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.strokeStyle = rgba(C.limeDeep, 0.3); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
    // textos
    const b = center(ctx, 'FAZLO HOSPEDA', L.brand, MONO, 34, 800, 10, C.ink);
    const S = L.size;
    const t1 = center(ctx, 'CONTROLE', L.l1, DISPLAY, S, 900, -S * 0.045, C.ink);
    const t2 = center(ctx, 'DE CAIXA.', L.l2, DISPLAY, S, 900, -S * 0.045, C.ink);
    ctx.fillStyle = C.ink; ctx.fillRect(540 - 260, L.bar, 520, 7);
    const f = center(ctx, FOOT, L.foot, MONO, 24, 800, 2.5, C.ink);
    // a logo, pequena (o círculo preto da marca sobre o limão)
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, 540 - L.logoD / 2, L.logoY - L.logoD / 2, L.logoD, L.logoD);
    Object.assign(BOXES, {
      'FAZLO HOSPEDA (mono)': { x0: b.x0, x1: b.x1, y0: L.brand - 26, y1: L.brand + 2 },
      'título, linha 1': { x0: t1.x0, x1: t1.x1, y0: L.l1 - S * 0.727, y1: L.l1 + 2 },
      'título, linha 2': { x0: t2.x0, x1: t2.x1, y0: L.l2 - S * 0.727, y1: L.l2 + 2 },
      'rodapé': { x0: f.x0, x1: f.x1, y0: L.foot - 20, y1: L.foot + 6 },
      'logo': { x0: 540 - L.logoD / 2, x1: 540 + L.logoD / 2, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 },
    });
  }
  window.REEL03CAPA = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
