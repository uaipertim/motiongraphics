/* =====================================================================
   FAZLO Hospeda — REEL 05 · CAPA (1080x1920)
   A cena da abertura do vídeo (~2,0 s): o sol nascendo sobre a serra, os
   pinheiros, a pousada e os chalés, o lago e o carro do hóspede subindo a
   estrada, com a logo e "Seu hóspede / está chegando.".

   Ajuste aprovado em outubro de 2026: o bloco de texto (logo + 2 linhas,
   nos mesmos corpos) fica centralizado na capa e no recorte 3:4 — centro em
   y = 960. Para o texto não cobrir a paisagem nem ficar sobre o brilho do
   sol, a paisagem foi ajustada, não o texto:
   - a câmera do motor se afasta (zoom 0,6, o mesmo mecanismo do vídeo), e a
     serra, a pousada, o lago e a estrada com o carro ficam abaixo do título;
   - o sol nasce logo abaixo do título, atrás da serra, com halo baixo (sol
     de amanhecer) e os raios do vídeo;
   - o céu clareia só perto do horizonte (no vídeo, o claro começava mais
     alto), e um escurecimento suave e redondo atrás do bloco mantém o
     contraste que o título tinha no alto da capa.
   A paisagem é desenhada pelas funções do motor (anim.js, só lido); o céu e
   o sol repetem o desenho de drawSky() com o horizonte mais baixo.

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   faixa do contador livre (y 1560–1680), nada cortado nem escondido.
   Cena de fundo de ponta a ponta: a revisão usa as caixas (--cena).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const I = REEL05._capa;
  const { C, DISPLAY } = I;
  const TC = 2.0;                                // o instante da cena
  // o bloco de texto: logo (52 px) + título (100 px), com os mesmos espaços da capa anterior
  const T = { logoD: 52, size: 100, toL1: 192, lead: 98, center: 960 };
  const BLOCK_H = T.logoD / 2 + T.toL1 + T.lead + 0.21 * T.size;   // do alto da logo ao pé do "g" de "chegando"
  const L = {};
  L.logoY = T.center - BLOCK_H / 2 + T.logoD / 2;
  L.l1 = L.logoY + T.toL1;
  L.l2 = L.l1 + T.lead;
  // a paisagem
  const P = {
    z: 0.6, zc: [540, 1687],                     // câmera afastada em torno de um ponto abaixo do quadro
    sky: { mid: 1120, hor: 1300 },               // o céu: cor do meio e do horizonte (no vídeo: 627 e 1140)
    sun: { x: 437, y: 1212, glow: 0.3, rays: 1 },
    veil: { y: 905, rx: 640, ry: 380, a: 0.65 },  // escurecimento suave atrás do bloco (elíptico, sem borda)
    carBottom: 1532,                             // o carro sobe a estrada até ficar acima da faixa do contador
  };
  const BOXES = {};
  let LOGO = null;

  function init(img) { LOGO = img; }

  // a câmera do motor (view() em anim.js) com zoom e centro escolhidos
  function makeV(cx, cy, z, zc) {
    return {
      cx, cy, z, zc,
      S(x, y, k) { const sx = x - cx * k, sy = y + cy * k; return [zc[0] + (sx - zc[0]) * z, zc[1] + (sy - zc[1]) * z]; },
      layer(ctx, k) { ctx.translate(zc[0], zc[1]); ctx.scale(z, z); ctx.translate(-zc[0] - cx * k, -zc[1] + cy * k); },
    };
  }

  // o céu e o sol, com o desenho de drawSky() (de manhã não há estrelas nem lua)
  function sky(ctx, t, S, V) {
    const g = ctx.createLinearGradient(0, 0, 0, P.sky.hor);
    g.addColorStop(0, S.top); g.addColorStop(P.sky.mid / P.sky.hor, S.mid); g.addColorStop(1, S.hor);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const { x, y } = P.sun, day = 1 - S.stars, burst = I.SUNBURST(t);
    I.radial(ctx, x, y, 620, C.lime, 0.06 + (0.12 + 0.26 * S.glow) * P.sun.glow + 0.25 * burst);
    I.radial(ctx, x, y, 200, C.limeL, 0.15 + 0.45 * P.sun.glow);
    const ra = P.sun.rays * day * (0.1 + 0.12 * S.glow + 0.75 * burst);
    if (ra > 0.004) {
      ctx.save(); ctx.globalAlpha *= ra;
      ctx.translate(x, y); ctx.rotate(t * 0.05);
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU, w = 0.03 + 0.018 * (k % 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1100, a - w, a + w); ctx.closePath();
        const rg = ctx.createRadialGradient(0, 0, 60, 0, 0, 1100);
        rg.addColorStop(0, I.rgba(C.limeL, 0.42)); rg.addColorStop(1, I.rgba(C.limeL, 0));
        ctx.fillStyle = rg; ctx.fill();
      }
      ctx.restore();
    }
    I.circle(ctx, x, y, 66); I.fill(ctx, I.mix(C.lime, '#F4FFE0', 0.35));
    I.circle(ctx, x, y, 66); I.stroke(ctx, I.rgba('#FFFFFF', 0.5), 3);
    const off = I.cloudOff(t);
    for (const c of I.CLOUDS) {
      const cxp = ((c.x + off) % 1900) - 400, cyp = c.y + V.cy * 0.08;
      ctx.save(); ctx.globalAlpha *= 0.55;
      const cg = ctx.createLinearGradient(0, cyp - c.h, 0, cyp + c.h);
      cg.addColorStop(0, I.rgba(I.mix(S.mid, S.hor, 0.5), 0.0)); cg.addColorStop(0.6, I.rgba(I.mix(S.mid, S.hor, 0.35), 0.55)); cg.addColorStop(1, I.rgba(S.hor, 0.35 * S.glow));
      ctx.fillStyle = cg;
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(cxp + j * c.w * 0.22, cyp - (j % 2) * c.h * 0.4, c.w * 0.36, c.h * (0.7 + 0.2 * (j % 2)), 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }

  function title(ctx, s, y, color) {
    const size = T.size, ls = -size * 0.03;
    const w = I.tw(ctx, s, DISPLAY, size, 900, ls) - ls;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30;
    ctx.font = `900 ${size}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px';
    ctx.fillStyle = color; ctx.fillText(s, 540 - w / 2, y);
    ctx.restore();
    return { x0: 540 - w / 2, x1: 540 + w / 2, y0: y - 0.73 * size, y1: y + (/[gpqj,]/.test(s) ? 0.21 : 0) * size };
  }

  // caixa do carro na tela (o desenho de car() em anim.js, no plano do chão)
  function carBox(V, u) {
    const q = I.roadAt(u), s = I.roadW(q.y) / 330, w = 230 * s, h = 92 * s, gl = 50 * s + 6;
    const a = V.S(q.x - w / 2 - gl, q.y - h * 0.5 - h * 0.55, I.GROUND_K), b = V.S(q.x + w / 2 + gl, q.y - h * 0.5 + h * 0.47, I.GROUND_K);
    return { x0: a[0], x1: b[0], y0: a[1], y1: b[1] };
  }

  function render(ctx, o = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    const t = TC, S = I.skyAt(t), V0 = I.view(t), st = I.stateAt(t);
    const V = makeV(V0.cx, V0.cy, P.z, P.zc);
    // o carro: o ponto mais perto da câmera (maior) em que ele fica acima da faixa do contador
    let u = st.car;
    while (carBox(V, u).y1 > P.carBottom && u < 1) u += 0.0025;
    st.car = u;
    // a paisagem, na mesma ordem de frame() em anim.js
    sky(ctx, t, S, V0);
    I.drawRidge(ctx, I.RIDGES[0], S, V);
    I.giantWord(ctx, t, V);
    I.drawRidge(ctx, I.RIDGES[1], S, V);
    I.drawHills(ctx, t, S, V, st);
    const sun0 = I.SUN.splice(0, I.SUN.length, [0, P.sun.x, 850]);   // o reflexo do sol no lago, sob o sol da capa
    I.drawLake(ctx, t, S, V, st);
    I.SUN.splice(0, I.SUN.length, ...sun0);
    I.drawGround(ctx, t, S, V, st);
    I.drawFireflies(ctx, t, S, V);
    I.drawForeground(ctx, t, S, V0);              // o mato e os pinheiros grandes da moldura, no tamanho do vídeo
    I.drawBirds(ctx, t);
    I.lanterns(ctx, t, V);
    // véu da base (o do vídeo) e o escurecimento suave atrás do bloco de texto
    const bv = ctx.createLinearGradient(0, 1180, 0, 1560);
    bv.addColorStop(0, 'rgba(3,4,3,0)'); bv.addColorStop(1, 'rgba(3,4,3,0.5)');
    ctx.fillStyle = bv; ctx.fillRect(0, 1180, W, 740);
    ctx.save(); ctx.translate(540, P.veil.y); ctx.scale(1, P.veil.ry / P.veil.rx);
    const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, P.veil.rx);
    vg.addColorStop(0, `rgba(3,4,3,${P.veil.a})`); vg.addColorStop(0.55, `rgba(3,4,3,${P.veil.a * 0.75})`); vg.addColorStop(1, 'rgba(3,4,3,0)');
    ctx.fillStyle = vg; ctx.fillRect(-P.veil.rx, -P.veil.rx, 2 * P.veil.rx, 2 * P.veil.rx);
    ctx.restore();
    if (o.semTexto) return;                       // (só para a conferência de contraste)
    // a logo, pequena: o símbolo oficial + o nome
    {
      const name = 'FAZLO Hospeda', nw = I.tw(ctx, name, DISPLAY, 30, 900, -0.6), gap = 14;
      const x = 540 - (T.logoD + gap + nw) / 2;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(LOGO, x, L.logoY - T.logoD / 2, T.logoD, T.logoD);
      I.txt(ctx, name, x + T.logoD + gap, L.logoY + 11, { fam: DISPLAY, size: 30, weight: 900, color: C.white, ls: -0.6, shadow: 'rgba(0,0,0,0.5)', blur: 16 });
      BOXES['logo'] = { x0: x, x1: x + T.logoD + gap + nw, y0: L.logoY - T.logoD / 2, y1: L.logoY + T.logoD / 2 };
    }
    BOXES['título, linha 1'] = title(ctx, 'Seu hóspede', L.l1, C.white);
    BOXES['título, linha 2'] = title(ctx, 'está chegando.', L.l2, C.lime);
    // caixas da cena (o sol, a serra e a pousada são fundo; o carro tem de aparecer inteiro, fora da faixa do contador)
    BOXES['sol'] = { x0: P.sun.x - 66, x1: P.sun.x + 66, y0: P.sun.y - 66, y1: P.sun.y + 66, cena: true };
    const hs0 = I.HOUSES[0], hs1 = I.HOUSES[I.HOUSES.length - 1];
    const a = V.S(hs0.x - hs0.w / 2, I.PLATEAU - Math.max(...I.HOUSES.map((h) => h.h)), 0.5), b = V.S(hs1.x + hs1.w / 2, I.PLATEAU + 4, 0.5);
    BOXES['pousada'] = { x0: a[0], x1: b[0], y0: a[1], y1: b[1], cena: true };
    BOXES['carro'] = carBox(V, st.car);
  }

  // o centro do bloco de texto (do alto da logo ao pé do "g" de "chegando")
  const block = () => ({ y0: L.logoY - T.logoD / 2, y1: L.l2 + 0.21 * T.size, centro: (L.logoY - T.logoD / 2 + L.l2 + 0.21 * T.size) / 2 });
  window.REEL05CAPA = { init, render, block, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
