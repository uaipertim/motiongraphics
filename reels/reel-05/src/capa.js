/* =====================================================================
   FAZLO Hospeda — REEL 05 · CAPA NOVA (1080x1920)
   A mesma cena da capa anterior (a abertura do vídeo, ~2,0 s): o sol que
   acabou de nascer sobre a serra, os pinheiros, a pousada e o carro do
   hóspede subindo a estrada, com "Seu hóspede / está chegando.".
   A paisagem é desenhada pelo próprio motor (anim.js, só lido), no mesmo
   instante, sem o desfoque de movimento do vídeo. Correção em relação à
   capa anterior: o título desce para o céu entre o topo e o sol, fora do
   canto do ícone de play (lá, "chegando." ficava embaixo do ícone); a logo
   pequena entra no alto, no mesmo lugar da capa do Reel 06.

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   faixa do contador livre (y 1560–1680), nada cortado nem escondido.
   Cena de fundo de ponta a ponta: a revisão usa as caixas (--cena).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080;
  const I = REEL05._capa;
  const { C, DISPLAY } = I;
  const TC = 2.0;                                // o quadro da capa anterior
  const L = {
    logoY: 356, logoD: 52,                       // a logo, pequena, acima do título (como no Reel 06)
    size: 100, l1: 548, l2: 646,                 // título com o corpo do vídeo (100 px), descido de y 340 para 548
  };
  const BOXES = {};
  let LOGO = null;

  function init(img) { LOGO = img; }

  function title(ctx, s, y, color) {
    const size = L.size, ls = -size * 0.03;
    const w = I.tw(ctx, s, DISPLAY, size, 900, ls) - ls;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30;
    ctx.font = `900 ${size}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px';
    ctx.fillStyle = color; ctx.fillText(s, 540 - w / 2, y);
    ctx.restore();
    return { x0: 540 - w / 2, x1: 540 + w / 2, y0: y - 0.73 * size, y1: y + (/[gpqj,]/.test(s) ? 0.21 : 0) * size };
  }

  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    const t = TC, S = I.skyAt(t), V = I.view(t), st = I.stateAt(t);
    // a paisagem, na mesma ordem de frame() em anim.js
    I.drawSky(ctx, t, S, V);
    I.drawRidge(ctx, I.RIDGES[0], S, V);
    I.giantWord(ctx, t, V);
    I.drawRidge(ctx, I.RIDGES[1], S, V);
    I.drawHills(ctx, t, S, V, st);
    I.drawLake(ctx, t, S, V, st);
    I.drawGround(ctx, t, S, V, st);
    I.drawFireflies(ctx, t, S, V);
    I.drawForeground(ctx, t, S, V);
    I.drawBirds(ctx, t);
    I.lanterns(ctx, t, V);
    // véus de leitura: o do topo acompanha o título (no vídeo, 180–640), o da base é o do vídeo
    const tv = ctx.createLinearGradient(0, 300, 0, 780);
    tv.addColorStop(0, 'rgba(3,4,3,0.55)'); tv.addColorStop(1, 'rgba(3,4,3,0)');
    ctx.fillStyle = tv; ctx.fillRect(0, 0, W, 780);
    const bv = ctx.createLinearGradient(0, 1180, 0, 1560);
    bv.addColorStop(0, 'rgba(3,4,3,0)'); bv.addColorStop(1, 'rgba(3,4,3,0.5)');
    ctx.fillStyle = bv; ctx.fillRect(0, 1180, W, 740);
    // a logo, pequena: o símbolo oficial + o nome
    {
      const name = 'FAZLO Hospeda', nw = I.tw(ctx, name, DISPLAY, 30, 900, -0.6), gap = 14;
      const x = 540 - (L.logoD + gap + nw) / 2;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(LOGO, x, L.logoY - L.logoD / 2, L.logoD, L.logoD);
      I.txt(ctx, name, x + L.logoD + gap, L.logoY + 11, { fam: DISPLAY, size: 30, weight: 900, color: C.white, ls: -0.6, shadow: 'rgba(0,0,0,0.5)', blur: 16 });
      BOXES['logo'] = { x0: x, x1: x + L.logoD + gap + nw, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 };
    }
    // título
    BOXES['título, linha 1'] = title(ctx, 'Seu hóspede', L.l1, C.white);
    BOXES['título, linha 2'] = title(ctx, 'está chegando.', L.l2, C.lime);
    // caixas da cena (o sol e a pousada são fundo; o carro tem de aparecer inteiro, fora da faixa do contador)
    const [sx, sy] = I.keyed2(I.SUN, t), suy = sy + V.cy * 0.06;
    BOXES['sol'] = { x0: sx - 66, x1: sx + 66, y0: suy - 66, y1: suy + 66, cena: true };
    const hs0 = I.HOUSES[0], hs1 = I.HOUSES[I.HOUSES.length - 1];
    const a = V.S(hs0.x - hs0.w / 2, I.PLATEAU - Math.max(...I.HOUSES.map((h) => h.h)), 0.5), b = V.S(hs1.x + hs1.w / 2, I.PLATEAU + 4, 0.5);
    BOXES['pousada'] = { x0: a[0], x1: b[0], y0: a[1], y1: b[1], cena: true };
    const q = I.roadAt(st.car), s = I.roadW(q.y) / 330, w = 230 * s, h = 92 * s, gl = 50 * s + 6;
    const c0 = V.S(q.x - w / 2 - gl, q.y - h * 0.5 - h * 0.55, I.GROUND_K), c1 = V.S(q.x + w / 2 + gl, q.y - h * 0.5 + h * 0.47, I.GROUND_K);
    BOXES['carro'] = { x0: c0[0], x1: c1[0], y0: c0[1], y1: c1[1] };
  }

  window.REEL05CAPA = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
