/* =====================================================================
   FAZLO Hospeda — REEL 06 · CAPA NOVA (1080x1920)
   A mesma cena da capa anterior (o registro do pagamento, ~3,4 s do vídeo):
   "Registre cada / pagamento.", o cartão da forma de pagamento (PIX), o bloco
   "+ R$ 450,00" (PAGAMENTO PARCIAL), o rótulo VALOR A RECEBER e o resumo
   TOTAL DA HOSPEDAGEM / TOTAL RECEBIDO / DIÁRIAS · PENDENTE com os mesmos
   valores do vídeo. Desenhada pelo próprio motor (anim.js, só lido): mesma
   luz, mesmo piso, mesmos blocos. Correções em relação à capa anterior:
   título descido para a área segura (canto do play livre), o bloco e o
   resumo um pouco mais altos (longe do contador de visualizações) e sem os
   pedaços da balança que saíam cortados pela borda.

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   faixa do contador livre (y 1560–1680), nada cortado nem escondido.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080;
  const I = REEL06._capa;
  const { C, DISPLAY, MONO, BD } = I;
  const TC = 3.36;                               // o PIX já escolhido, cartão inteiro (no vídeo: 3,32–3,46 s)
  const L = {
    logoY: 356, logoD: 52,                       // a logo, pequena, acima do título
    size: 100, l1: 540, l2: 642,                 // título (vídeo: 92 px em y 318) — descido para a área segura
    scale: 1.04, top: 716, lift: 30,             // o cartão PIX + o bloco: escala, topo na tela e o cartão 30 px mais perto do bloco
    ledger: 1322, lh: 76, x0: 110, x1: 930,      // o resumo (vídeo: y 1330, rente ao contador)
  };
  const BOXES = {};
  let LOGO = null, NBAL = 0;

  function init(img) {
    LOGO = img;
    NBAL = I.worldFaces(1.0).out.length;         // faces da balança e do total (antes do 1º pagamento)
  }

  // a câmera do vídeo nesse instante, com o enquadramento ajustado (só escala e deslocamento na tela)
  function camera(faces) {
    const k = I.camAt(TC).k;
    const base = I.makeCam({ ...k, f: k.f * L.scale, cx: 540, cy: 960 });
    const bb = bbox(base, faces);
    return I.makeCam({ ...k, f: k.f * L.scale, cx: 540 + (540 - (bb.x0 + bb.x1) / 2), cy: 960 + (L.top - bb.y0) });
  }
  function bbox(cam, faces) {
    const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    for (const F of faces) for (const q of F.pts) {
      const s = cam.P(q); if (!s) continue;
      b.x0 = Math.min(b.x0, s[0]); b.x1 = Math.max(b.x1, s[0]); b.y0 = Math.min(b.y0, s[1]); b.y1 = Math.max(b.y1, s[1]);
    }
    return b;
  }

  // o cartão PIX (prisma da forma de pagamento) com o mesmo desenho de drawFaces() em anim.js, mas com o
  // rótulo projetado em perspectiva exata (homografia, 2x2 amostras por pixel): no tamanho da capa, as
  // 2 tiras afins do vídeo deixariam uma emenda no meio do "PIX"
  function homography(q) {                       // quadrado unitário -> quadrilátero (TL, TR, BR, BL)
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3, dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
    const den = dx1 * dy2 - dx2 * dy1, g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
    const M = [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
    const [a, b, c, d, e, f, gg, hh, ii] = M;      // inversa (adjunta) para ir da tela à textura
    return [e * ii - f * hh, c * hh - b * ii, b * f - c * e, f * gg - d * ii, a * ii - c * gg, c * d - a * f, d * hh - e * gg, b * gg - a * hh, a * e - b * d];
  }
  function warp(ctx, img, q, alpha) {
    const src = img.getContext('2d').getImageData(0, 0, img.width, img.height).data, tw_ = img.width, th_ = img.height;
    const Hi = homography(q);
    const x0 = Math.floor(Math.min(...q.map((v) => v[0]))), x1 = Math.ceil(Math.max(...q.map((v) => v[0])));
    const y0 = Math.floor(Math.min(...q.map((v) => v[1]))), y1 = Math.ceil(Math.max(...q.map((v) => v[1])));
    const w = x1 - x0, h = y1 - y0, out = new ImageData(w, h);
    const sample = (u, v, k) => {                 // bilinear
      const x = Math.min(tw_ - 1.001, Math.max(0, u * tw_ - 0.5)), y = Math.min(th_ - 1.001, Math.max(0, v * th_ - 0.5));
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, i = (iy * tw_ + ix) * 4;
      return (src[i + k] * (1 - fx) + src[i + 4 + k] * fx) * (1 - fy) + (src[i + tw_ * 4 + k] * (1 - fx) + src[i + tw_ * 4 + 4 + k] * fx) * fy;
    };
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const X = x0 + px + ox, Y = y0 + py + oy, z = Hi[6] * X + Hi[7] * Y + Hi[8];
        const u = (Hi[0] * X + Hi[1] * Y + Hi[2]) / z, v = (Hi[3] * X + Hi[4] * Y + Hi[5]) / z;
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        r += sample(u, v, 0); g += sample(u, v, 1); b += sample(u, v, 2); n++;
      }
      if (!n) continue;
      const i = (py * w + px) * 4;
      out.data[i] = r / n; out.data[i + 1] = g / n; out.data[i + 2] = b / n; out.data[i + 3] = 255 * n / 4;
    }
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(out, 0, 0);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(c, x0, y0); ctx.restore();
  }
  function drawPrism(ctx, cam, faces, t) {
    const items = [];
    for (const F of faces) {
      const cen = F.pts.reduce((s, q) => I.add(s, I.mul(q, 1 / F.pts.length)), [0, 0, 0]);
      if (F.alpha <= 0.01 || I.dot(F.n, I.sub(cam.pos, cen)) <= 0) continue;
      const sp = F.pts.map(cam.P);
      if (sp.some((q) => !q)) continue;
      items.push({ z: cam.toCam(cen)[2], F, sp });
    }
    items.sort((a, b) => b.z - a.z);
    for (const { F, sp } of items) {
      const path = () => { ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let k = 1; k < sp.length; k++) ctx.lineTo(sp[k][0], sp[k][1]); ctx.closePath(); };
      ctx.save(); ctx.globalAlpha *= F.alpha;
      path(); ctx.fillStyle = I.css(I.shade(F, cam, t)); ctx.fill();
      if (F.tex && sp.length === 4) warp(ctx, F.tex, sp, 0.75 + 0.25 * Math.max(0, I.dot(F.n, I.KEY)));
      path(); ctx.strokeStyle = F.edge ? I.css(F.edge, 0.55) : 'rgba(255,255,255,0.07)'; ctx.lineWidth = F.edge ? 2 : 1.2; ctx.stroke();
      ctx.restore();
    }
  }

  function title(ctx, s, y, color) {
    const size = L.size, ls = -size * 0.03;
    const w = I.tw(ctx, s, DISPLAY, size, 900, ls) - ls;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30;
    ctx.font = `900 ${size}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px';
    ctx.fillStyle = color; ctx.fillText(s, 540 - w / 2, y);
    ctx.restore();
    return { x0: 540 - w / 2, x1: 540 + w / 2, y0: y - 0.73 * size, y1: y + (/[gpqj,]/.test(s) ? 0.21 : 0) * size };
  }

  // o resumo, com o mesmo desenho do vídeo (ledger() em anim.js)
  function ledgerShade(ctx) {
    const y0 = L.ledger, g = ctx.createLinearGradient(0, y0 - 120, 0, y0 + 230);
    g.addColorStop(0, 'rgba(5,5,6,0)'); g.addColorStop(0.35, 'rgba(5,5,6,0.72)'); g.addColorStop(1, 'rgba(5,5,6,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, y0 - 120, W, 1920 - (y0 - 120));
  }
  function ledger(ctx) {
    const { x0, x1, lh } = L, y0 = L.ledger;
    const rows = [
      ['TOTAL DA HOSPEDAGEM', I.brl(1350), C.white, 46],
      ['TOTAL RECEBIDO', I.brl(0, '+ '), C.lime, 46],
      ['DIÁRIAS · PENDENTE', I.brl(1350), C.pend, 52],
    ];
    rows.forEach(([label, val, col, size], i) => {
      const y = y0 + i * lh;
      I.txt(ctx, label, x0, y, { size: 24, weight: 800, color: C.grayL, ls: 3 });
      I.txt(ctx, val, x1, y + 6, { fam: DISPLAY, size, weight: 900, color: col, align: 'right', ls: -1 });
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x0, y + 26, x1 - x0, 2);
      BOXES['resumo, linha ' + (i + 1)] = { x0, x1, y0: y + 6 - 0.73 * size, y1: y + 28 };
    });
  }

  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const { out, th } = I.worldFaces(TC);
    const faces = out.slice(NBAL);               // só o bloco do pagamento e o cartão da forma de pagamento
    const prism = faces.filter((F) => F.prism || F.side === 'cap'), block = faces.filter((F) => !(F.prism || F.side === 'cap'));
    const cam = camera(faces), camP = I.makeCam({ ...cam.k, cy: cam.k.cy + L.lift });
    I.stage(ctx, cam, TC, faces, th);            // fundo, refletor, piso espelhado e poeira do vídeo
    I.drawFaces(ctx, cam, block, TC);
    drawPrism(ctx, camP, prism, TC);
    ledgerShade(ctx);
    I.registerLabels(ctx, cam, TC);              // VALOR A RECEBER (por cima da sombra do resumo, legível)
    ledger(ctx);
    // a logo, pequena: o símbolo oficial + o nome, acima do título
    {
      const name = 'FAZLO Hospeda', nw = I.tw(ctx, name, DISPLAY, 30, 900, -0.6), gap = 14;
      const x = 540 - (L.logoD + gap + nw) / 2;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(LOGO, x, L.logoY - L.logoD / 2, L.logoD, L.logoD);
      I.txt(ctx, name, x + L.logoD + gap, L.logoY + 11, { fam: DISPLAY, size: 30, weight: 900, color: C.white, ls: -0.6 });
      BOXES['logo'] = { x0: x, x1: x + L.logoD + gap + nw, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 };
    }
    // título
    BOXES['título, linha 1'] = title(ctx, 'Registre cada', L.l1, C.white);
    BOXES['título, linha 2'] = title(ctx, 'pagamento.', L.l2, C.lime);
    // caixas do visual
    BOXES['cartão PIX'] = bbox(camP, prism);
    BOXES['bloco + R$ 450,00'] = bbox(cam, block);
    const st = I.payState(0, TC, I.theta(TC));
    const q = cam.P([st.c[0], st.c[1] - st.h / 2 - 0.45, -BD / 2]);
    const lw = I.tw(ctx, 'VALOR A RECEBER', MONO, 28, 800, 4) - 4;
    BOXES['VALOR A RECEBER'] = { x0: q[0] - lw / 2, x1: q[0] + lw / 2, y0: q[1] + 30 - 21, y1: q[1] + 30 };
  }

  window.REEL06CAPA = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
