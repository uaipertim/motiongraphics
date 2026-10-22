/*
 * FAZLO Hospeda — CAPAS V2 dos Reels (modelo reutilizável; cada capa é um item de capas.json).
 *
 * Composição (1080x1920, regra de capas do reels/README.md): logo pequena no alto → chip da série (pílula escura com
 * ponto limão) → ILUSTRAÇÃO GRANDE em traço neon limão com brilho → título em Inter Display 900, 2–3 linhas, ~85% da
 * largura útil, da 2ª linha em diante em limão. Tudo em x 60–1020, y 300–1540: o recorte 3:4 com folga de 60 px, o
 * canto do play (x ≥ 860, y 240–440) e a faixa do contador (y 1560–1680) ficam livres.
 *
 * Ilustração nova = uma função em ILUS (desenha num quadro de ±300 em torno do centro, com neon()/neonTexto()).
 */
(function () {
  'use strict';
  const W = 1080, H = 1920, LIME = '#AFFA27', INK = '#0A0A0A';
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const Z = { x0: 60, x1: 1020, topo: 300, base: 1540, logoY: 338, chipY: 422, ilusTopo: 482, larguraTitulo: 816 };
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- neon: brilho largo + traço limão + miolo claro
  function neon(ctx, desenha, lw = 22) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const passo = (cor, l, blur, a) => { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = cor; ctx.lineWidth = l; ctx.shadowColor = LIME; ctx.shadowBlur = blur; ctx.beginPath(); desenha(ctx); ctx.stroke(); ctx.restore(); };
    passo(LIME, lw * 1.9, 70, 0.22);
    passo(LIME, lw, 34, 1);
    passo('#F2FFD6', lw * 0.32, 0, 0.75);
    ctx.restore();
  }
  function neonTexto(ctx, s, x, y, size) {
    ctx.save(); ctx.font = `900 ${size}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = LIME; ctx.shadowBlur = 50; ctx.fillStyle = LIME; ctx.fillText(s, x, y);
    ctx.shadowBlur = 0; ctx.fillStyle = '#F2FFD6'; ctx.globalAlpha = 0.35; ctx.fillText(s, x, y);
    ctx.restore();
  }
  const rr = (c, x, y, w, h, r) => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  // um cadeado (corpo + alça) centrado em (x, y), de largura s
  const cadeado = (c, x, y, s) => { const w = s, h = s * 0.8; rr(c, x - w / 2, y - h / 2 + s * 0.22, w, h, s * 0.16); c.moveTo(x - s * 0.3, y - h / 2 + s * 0.22); c.lineTo(x - s * 0.3, y - s * 0.38); c.arc(x, y - s * 0.38, s * 0.3, Math.PI, 0); c.lineTo(x + s * 0.3, y - h / 2 + s * 0.22); };
  // uma chave antiga: argola (com furo), haste e dentes; desenhada na horizontal a partir da argola em (0, 0)
  const chave = (c, L, r) => {
    c.moveTo(r, 0); c.arc(0, 0, r, 0, TAU); c.moveTo(r * 0.4, 0); c.arc(0, 0, r * 0.4, 0, TAU);
    c.moveTo(r, 0); c.lineTo(L, 0); c.moveTo(L - r * 0.15, 0); c.lineTo(L - r * 0.15, r * 0.75); c.lineTo(L - r * 0.65, r * 0.75); c.lineTo(L - r * 0.65, r * 0.35);
    c.moveTo(L - r * 1.05, 0); c.lineTo(L - r * 1.05, r * 0.5);
  };

  // ---------------------------------------------------------------- as ilustrações (quadro de ±300)
  const ILUS = {
    // uma moeda partida ao meio em diagonal, as metades afastadas, e um "?" entre elas
    moeda_partida(ctx) {
      const R = 205, off = 112, n = [Math.SQRT1_2, Math.SQRT1_2];
      const metade = (a0, a1, s) => (c) => {
        const dx = s * off * n[0], dy = s * off * n[1];
        c.moveTo(dx + R * Math.cos(a0), dy + R * Math.sin(a0)); c.arc(dx, dy, R, a0, a1); c.closePath();
        c.moveTo(dx + 135 * Math.cos(a0 + 0.25), dy + 135 * Math.sin(a0 + 0.25)); c.arc(dx, dy, 135, a0 + 0.25, a1 - 0.25);
      };
      neon(ctx, metade(-Math.PI / 4, (3 * Math.PI) / 4, 1));
      neon(ctx, metade((3 * Math.PI) / 4, (7 * Math.PI) / 4, -1));
      neonTexto(ctx, '?', 0, 4, 170);
    },
    // três cadeados em fila; o do meio maior, com "R$" gravado
    tres_cadeados(ctx) {
      neon(ctx, (c) => { cadeado(c, -205, 40, 140); cadeado(c, 205, 40, 140); }, 18);
      neon(ctx, (c) => cadeado(c, 0, 10, 230), 22);
      neonTexto(ctx, 'R$', 0, 74, 96);
    },
    // folha de calendário com uma etiqueta de preço pendurada por um cordão
    calendario_etiqueta(ctx) {
      neon(ctx, (c) => {
        rr(c, -250, -230, 360, 380, 40);
        c.moveTo(-250, -130); c.lineTo(110, -130);
        c.moveTo(-170, -265); c.lineTo(-170, -200); c.moveTo(30, -265); c.lineTo(30, -200);
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const x = -200 + k * 80, y = -70 + r * 70; c.moveTo(x, y); c.lineTo(x + 26, y); }
      }, 20);
      neon(ctx, (c) => {
        c.moveTo(110, 40); c.bezierCurveTo(165, 40, 190, 60, 195, 90);
        // a etiqueta (pentágono com furo), inclinada
        const a = -0.35, ca = Math.cos(a), sa = Math.sin(a), P = (x, y) => [195 + x * ca - y * sa, 90 + x * sa + y * ca];
        const pts = [[0, 0], [70, 40], [70, 220], [-70, 220], [-70, 40]].map(([x, y]) => P(x, y));
        c.moveTo(...pts[0]); pts.slice(1).forEach((q) => c.lineTo(...q)); c.closePath();
        const [hx, hy] = P(0, 52); c.moveTo(hx + 14, hy); c.arc(hx, hy, 14, 0, TAU);
      }, 18);
      ctx.save(); ctx.translate(195, 90); ctx.rotate(-0.35); neonTexto(ctx, 'R$', 0, 140, 64); ctx.restore();
    },
    // uma chave antiga com a plaquinha de chalé "Nº 3" e uma lua crescente ao lado
    chave_lua(ctx) {
      ctx.save(); ctx.translate(-150, -60); ctx.rotate(0.62);
      neon(ctx, (c) => chave(c, 330, 70), 20);
      ctx.restore();
      // a plaquinha pendurada na argola
      neon(ctx, (c) => {
        c.moveTo(-190, -10); c.lineTo(-215, 50);
        rr(c, -300, 50, 170, 120, 28); c.moveTo(-200, 72); c.arc(-215, 72, 12, 0, TAU);
      }, 16);
      neonTexto(ctx, 'Nº 3', -215, 128, 50);
      // a lua crescente e duas estrelinhas
      neon(ctx, (c) => {
        const [ax, ay, ar, bx, by, br] = [180, -190, 110, 225, -225, 100];
        const dd = Math.hypot(bx - ax, by - ay), aa = (ar * ar - br * br + dd * dd) / (2 * dd), hh = Math.sqrt(ar * ar - aa * aa);
        const mx = ax + aa * (bx - ax) / dd, my = ay + aa * (by - ay) / dd;
        const P1 = [mx + hh * (by - ay) / dd, my - hh * (bx - ax) / dd], P2 = [mx - hh * (by - ay) / dd, my + hh * (bx - ax) / dd];
        const ang = (cx, cy, q) => Math.atan2(q[1] - cy, q[0] - cx);
        c.moveTo(...P1); c.arc(ax, ay, ar, ang(ax, ay, P1), ang(ax, ay, P2), true);
        c.arc(bx, by, br, ang(bx, by, P2), ang(bx, by, P1), false);
      }, 18);
      neon(ctx, (c) => { [[60, -270, 16], [285, -40, 13]].forEach(([x, y, s]) => { c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); }); }, 10);
    },
    // contorno de chalé com duas chaves se cruzando em X na frente
    chale_chaves(ctx) {
      neon(ctx, (c) => {
        c.moveTo(-270, -20); c.lineTo(0, -280); c.lineTo(270, -20);
        c.moveTo(-210, -80); c.lineTo(-210, 260); c.lineTo(210, 260); c.lineTo(210, -80);
      }, 20);
      ctx.save(); ctx.translate(-150, -20); ctx.rotate(0.72); neon(ctx, (c) => chave(c, 400, 58), 18); ctx.restore();
      ctx.save(); ctx.translate(150, -20); ctx.rotate(Math.PI - 0.72); ctx.scale(1, -1); neon(ctx, (c) => chave(c, 400, 58), 18); ctx.restore();
    },
  };

  // ---------------------------------------------------------------- a capa
  function render(ctx, logo, c) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
    const caixas = {};
    // fundo preto da série com vinheta sutil e um brilho limão bem baixo atrás da ilustração
    ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(540, 900, 300, 540, 900, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // logo + "FAZLO Hospeda", pequena, no alto
    const d = 54; ctx.font = `800 30px ${DISPLAY}`; const nw = ctx.measureText('FAZLO Hospeda').width, gw = d + 14 + nw, lx = 540 - gw / 2;
    ctx.drawImage(logo, lx, Z.logoY - d / 2, d, d);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF'; ctx.fillText('FAZLO', lx + d + 14, Z.logoY + 1);
    ctx.fillStyle = LIME; ctx.fillText('Hospeda', lx + d + 14 + ctx.measureText('FAZLO ').width, Z.logoY + 1);
    caixas.logo = { x0: lx, y0: Z.logoY - d / 2, x1: lx + gw, y1: Z.logoY + d / 2 };
    // o chip da série
    ctx.font = `800 26px ${MONO}`; ctx.letterSpacing = '3px';
    const cw = ctx.measureText(c.chip).width + 34 + 52, ch = 58, cx0 = 540 - cw / 2;
    ctx.beginPath(); rr(ctx, cx0, Z.chipY - ch / 2, cw, ch, ch / 2); ctx.fillStyle = '#161816'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx0 + 30, Z.chipY, 7, 0, TAU); ctx.fillStyle = LIME; ctx.shadowColor = LIME; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#E8EAE4'; ctx.textAlign = 'left'; ctx.fillText(c.chip, cx0 + 52, Z.chipY + 2); ctx.letterSpacing = '0px';
    caixas.chip = { x0: cx0, y0: Z.chipY - ch / 2, x1: cx0 + cw, y1: Z.chipY + ch / 2 };
    // o título: o maior corpo em que a linha mais larga cabe em ~85% da largura útil
    const n = c.titulo.length;
    let S = n >= 3 ? 150 : 176;
    const larg = (s) => { ctx.font = `900 ${s}px ${DISPLAY}`; ctx.letterSpacing = `${-0.03 * s}px`; return Math.max(...c.titulo.map((l) => ctx.measureText(l).width)); };
    while (larg(S) > Z.larguraTitulo) S -= 2;
    const lh = S * 1.0, ultima = Z.base - 0.24 * S, base = (i) => ultima - (n - 1 - i) * lh;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    c.titulo.forEach((l, i) => {
      ctx.font = `900 ${S}px ${DISPLAY}`; ctx.letterSpacing = `${-0.03 * S}px`; ctx.fillStyle = i === 0 ? '#FFFFFF' : LIME;
      ctx.fillText(l, 540, base(i));
      const w = ctx.measureText(l).width;
      caixas[`título, linha ${i + 1}`] = { x0: 540 - w / 2, y0: base(i) - 0.76 * S, x1: 540 + w / 2, y1: base(i) + 0.22 * S };
    });
    ctx.letterSpacing = '0px';
    // a ilustração ocupa o espaço entre o chip e o título
    const topo = Z.ilusTopo, fundo = base(0) - 0.76 * S - 44, hI = fundo - topo, k = hI / 640, cy = topo + hI / 2;
    g = ctx.createRadialGradient(540, cy, 0, 540, cy, hI * 0.7); g.addColorStop(0, 'rgba(175,250,39,0.10)'); g.addColorStop(1, 'rgba(175,250,39,0)');
    ctx.fillStyle = g; ctx.fillRect(0, topo - 60, W, hI + 120);
    ctx.save(); ctx.translate(540, cy); ctx.scale(k, k); ILUS[c.ilustracao](ctx); ctx.restore();
    caixas['ilustração'] = { x0: 540 - 320 * k, y0: topo, x1: 540 + 320 * k, y1: fundo };
    return { caixas, corpo_titulo: S, altura_ilustracao: Math.round(hI) };
  }
  window.CAPA = { render, ILUS };
})();
