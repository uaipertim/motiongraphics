/*
 * FAZLO Hospeda — CAPAS V3 dos Reels (modelo reutilizável; cada capa é um item de capas.json).
 *
 * Regras da v3 (medidas na revisão, scripts/render.cjs):
 *   • TRAÇO único e nítido de 11 px, pontas arredondadas, cor sólida: só o ELEMENTO PRINCIPAL em limão #AFFA27; os
 *     detalhes em cinza (#5E5E59–#8E8E88). Nada de tubo duplo.
 *   • BRILHO curto e suave (halo de raio pequeno, ~35%) só no traço limão. Metas: limão ≤ 6% e halo ≤ 6% do recorte 3:4.
 *   • PREENCHIMENTO: uma área de cada ilustração em limão translúcido (24%) para dar corpo.
 *   • FUNDO: gradiente escuro com leve tom, alternando verde-petróleo e azul-noite, e uma grade de pontinhos (24 px, 5%).
 *   • PROPORÇÃO: ilustração com ~30% da altura do recorte 3:4; o TÍTULO é o protagonista (Inter Display 900, sem caixa
 *     alta, ≥ 110 px, 2–4 linhas, a 2ª parte em limão), com o chip da série logo acima dele; a logo pequena no topo.
 *   • Regra de capas do reels/README.md: tudo em x 60–1020, y 300–1540; canto do play e faixa do contador livres.
 *
 * Ilustração nova = uma função em ILUS, desenhada num quadro de ±300 com L() (traço limão), G() (traço cinza),
 * F() (preenchimento translúcido) e T() (texto do desenho).
 */
(function () {
  'use strict';
  const W = 1080, H = 1920, LIME = '#AFFA27', CINZA = '#7A7A74', CINZA2 = '#5E5E59';
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const Z = { x0: 60, x1: 1020, base: 1540, logoY: 338, ilusTopo: 392, ilusAlt: 440, larguraTitulo: 900, minTitulo: 110, maxTitulo: 176 };
  const FUNDOS = [['#0A1714', '#060707'], ['#0A0F1A', '#060707']];        // verde-petróleo, azul-noite (alternados)
  const TAU = Math.PI * 2;
  let K = 1, OPT = {};                                                     // escala da ilustração; opções (semPreenchimento)

  // ---------------------------------------------------------------- traços
  function traco(ctx, f, cor, lw, halo) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = cor; ctx.lineWidth = lw / K;
    if (halo) { ctx.shadowColor = 'rgba(175,250,39,0.35)'; ctx.shadowBlur = 14; }
    ctx.beginPath(); f(ctx); ctx.stroke(); ctx.restore();
  }
  const L = (ctx, f, lw = 11) => traco(ctx, f, LIME, lw, true);                // o elemento principal
  const G = (ctx, f, lw = 9, cor = CINZA) => traco(ctx, f, cor, lw, false);  // os detalhes
  function F(ctx, f, a = 0.24) { if (OPT.semPreenchimento) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = LIME; ctx.beginPath(); f(ctx); ctx.fill(); ctx.restore(); }
  function T(ctx, s, x, y, size, cor = LIME, halo = cor === LIME) {
    ctx.save(); ctx.font = `900 ${size}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cor;
    if (halo) { ctx.shadowColor = 'rgba(175,250,39,0.35)'; ctx.shadowBlur = 14; }
    ctx.fillText(s, x, y); ctx.restore();
  }
  // apaga o fundo atrás de uma peça (para ela ficar NA FRENTE de outra)
  const tapa = (ctx, f) => { ctx.save(); ctx.beginPath(); f(ctx); ctx.fillStyle = '#080B0B'; ctx.fill(); ctx.restore(); };
  const rr = (c, x, y, w, h, r) => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const cadeado = (c, x, y, s) => { const w = s, h = s * 0.8; rr(c, x - w / 2, y - h / 2 + s * 0.22, w, h, s * 0.16); c.moveTo(x - s * 0.3, y - h / 2 + s * 0.22); c.lineTo(x - s * 0.3, y - s * 0.38); c.arc(x, y - s * 0.38, s * 0.3, Math.PI, 0); c.lineTo(x + s * 0.3, y - h / 2 + s * 0.22); };
  const corpoCadeado = (c, x, y, s) => { const w = s, h = s * 0.8; rr(c, x - w / 2, y - h / 2 + s * 0.22, w, h, s * 0.16); };
  const chave = (c, Lc, r) => {
    c.moveTo(r, 0); c.arc(0, 0, r, 0, TAU); c.moveTo(r * 0.4, 0); c.arc(0, 0, r * 0.4, 0, TAU);
    c.moveTo(r, 0); c.lineTo(Lc, 0); c.moveTo(Lc - r * 0.15, 0); c.lineTo(Lc - r * 0.15, r * 0.75); c.lineTo(Lc - r * 0.65, r * 0.75); c.lineTo(Lc - r * 0.65, r * 0.35);
    c.moveTo(Lc - r * 1.05, 0); c.lineTo(Lc - r * 1.05, r * 0.5);
  };
  const mala = (c, x, y, w, h) => {
    rr(c, x - w / 2, y - h, w, h, w * 0.12);
    c.moveTo(x - w * 0.2, y - h); c.lineTo(x - w * 0.2, y - h - h * 0.22); c.lineTo(x + w * 0.2, y - h - h * 0.22); c.lineTo(x + w * 0.2, y - h);
    c.moveTo(x - w * 0.22, y - h + h * 0.18); c.lineTo(x - w * 0.22, y - h * 0.12); c.moveTo(x + w * 0.22, y - h + h * 0.18); c.lineTo(x + w * 0.22, y - h * 0.12);
  };
  const corpoMala = (c, x, y, w, h) => rr(c, x - w / 2, y - h, w, h, w * 0.12);
  const folha = (c, x0, y0, w, h) => {
    rr(c, x0, y0, w, h, 38); c.moveTo(x0, y0 + 100); c.lineTo(x0 + w, y0 + 100);
    c.moveTo(x0 + w * 0.25, y0 - 35); c.lineTo(x0 + w * 0.25, y0 + 30); c.moveTo(x0 + w * 0.75, y0 - 35); c.lineTo(x0 + w * 0.75, y0 + 30);
  };
  const topoFolha = (c, x0, y0, w) => { c.moveTo(x0 + 38, y0); c.arcTo(x0 + w, y0, x0 + w, y0 + 100, 38); c.lineTo(x0 + w, y0 + 100); c.lineTo(x0, y0 + 100); c.arcTo(x0, y0, x0 + w, y0, 38); c.closePath(); };

  // ---------------------------------------------------------------- as ilustrações (quadro de ±300)
  const ILUS = {
    // moeda (aro duplo + "R$", em cinza) partida em diagonal; o corte e o "?" em limão
    moeda_partida(ctx) {
      const R0 = 240, R1 = 190, off = 84, n = [Math.SQRT1_2, Math.SQRT1_2], dv = [Math.SQRT1_2, -Math.SQRT1_2];
      const lado = (s, f) => {
        ctx.save(); ctx.translate(s * off * n[0], s * off * n[1]);
        const Lm = 900; ctx.beginPath(); ctx.moveTo(-Lm * dv[0], -Lm * dv[1]); ctx.lineTo(Lm * dv[0], Lm * dv[1]); ctx.lineTo(Lm * dv[0] + s * Lm * n[0], Lm * dv[1] + s * Lm * n[1]); ctx.lineTo(-Lm * dv[0] + s * Lm * n[0], -Lm * dv[1] + s * Lm * n[1]); ctx.closePath(); ctx.clip();
        f(); ctx.restore();
      };
      [1, -1].forEach((s) => lado(s, () => {
        F(ctx, (c) => { c.moveTo(R1, 0); c.arc(0, 0, R1, 0, TAU); });
        G(ctx, (c) => { c.moveTo(R0, 0); c.arc(0, 0, R0, 0, TAU); c.moveTo(R1, 0); c.arc(0, 0, R1, 0, TAU); }, 10, '#8E8E88');
        T(ctx, 'R$', 0, 8, 215, '#8E8E88');
      }));
      [1, -1].forEach((s) => { ctx.save(); ctx.translate(s * off * n[0], s * off * n[1]); L(ctx, (c) => { c.moveTo(-R0 * dv[0], -R0 * dv[1]); c.lineTo(R0 * dv[0], R0 * dv[1]); }); ctx.restore(); });
      T(ctx, '?', 0, 4, 140);
    },
    // três cadeados; o do meio (maior, com "R$") em limão, os outros em cinza
    tres_cadeados(ctx) {
      G(ctx, (c) => { cadeado(c, -215, 40, 140); cadeado(c, 215, 40, 140); });
      F(ctx, (c) => corpoCadeado(c, 0, 10, 240));
      L(ctx, (c) => cadeado(c, 0, 10, 240));
      T(ctx, 'R$', 0, 76, 100);
    },
    // calendário (cinza) com a etiqueta de preço (limão) pendurada
    calendario_etiqueta(ctx) {
      G(ctx, (c) => {
        folha(c, -250, -230, 360, 380);
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const x = -200 + k * 80, y = -70 + r * 70; c.moveTo(x, y); c.lineTo(x + 26, y); }
        c.moveTo(110, 40); c.bezierCurveTo(165, 40, 190, 60, 195, 90);
      });
      const a = -0.35, ca = Math.cos(a), sa = Math.sin(a), P = (x, y) => [195 + x * ca - y * sa, 90 + x * sa + y * ca];
      const pts = [[0, 0], [70, 40], [70, 220], [-70, 220], [-70, 40]].map(([x, y]) => P(x, y));
      const tag = (c) => { c.moveTo(...pts[0]); pts.slice(1).forEach((q) => c.lineTo(...q)); c.closePath(); };
      F(ctx, tag);
      L(ctx, (c) => { tag(c); const [hx, hy] = P(0, 52); c.moveTo(hx + 14, hy); c.arc(hx, hy, 14, 0, TAU); });
      ctx.save(); ctx.translate(195, 90); ctx.rotate(-0.35); T(ctx, 'R$', 0, 140, 64); ctx.restore();
    },
    // a chave antiga (limão); a plaquinha "Nº 3", a lua e as estrelas em cinza
    chave_lua(ctx) {
      ctx.save(); ctx.translate(-150, -60); ctx.rotate(0.62); L(ctx, (c) => chave(c, 330, 70)); ctx.restore();
      F(ctx, (c) => rr(c, -300, 50, 170, 120, 28));
      G(ctx, (c) => { c.moveTo(-190, -10); c.lineTo(-215, 50); rr(c, -300, 50, 170, 120, 28); });
      T(ctx, 'Nº 3', -215, 116, 50, '#8E8E88');
      G(ctx, (c) => {
        const [ax, ay, ar, bx, by, br] = [180, -190, 110, 225, -225, 100];
        const dd = Math.hypot(bx - ax, by - ay), aa = (ar * ar - br * br + dd * dd) / (2 * dd), hh = Math.sqrt(ar * ar - aa * aa);
        const mx = ax + aa * (bx - ax) / dd, my = ay + aa * (by - ay) / dd;
        const P1 = [mx + hh * (by - ay) / dd, my - hh * (bx - ax) / dd], P2 = [mx - hh * (by - ay) / dd, my + hh * (bx - ax) / dd];
        const ang = (cx, cy, q) => Math.atan2(q[1] - cy, q[0] - cx);
        c.moveTo(...P1); c.arc(ax, ay, ar, ang(ax, ay, P1), ang(ax, ay, P2), true); c.arc(bx, by, br, ang(bx, by, P2), ang(bx, by, P1), false);
        [[60, -270, 16], [285, -40, 13]].forEach(([x, y, s]) => { c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); });
      });
    },
    // chalé (cinza, com a porta preenchida) e, na frente, as duas chaves cruzadas (limão) com a faísca
    chale_chaves(ctx) {
      F(ctx, (c) => rr(c, -45, -105, 90, 125, 4));
      G(ctx, (c) => {
        c.moveTo(-250, -95); c.lineTo(0, -320); c.lineTo(250, -95);
        c.moveTo(-195, -142); c.lineTo(-195, 20); c.lineTo(195, 20); c.lineTo(195, -142);
        c.moveTo(-45, 20); c.lineTo(-45, -105); c.lineTo(45, -105); c.lineTo(45, 20);
        rr(c, 85, -115, 72, 72, 10); c.moveTo(121, -115); c.lineTo(121, -43); c.moveTo(85, -79); c.lineTo(157, -79);
      });
      const B = [175, 290], Tp = [-175, 100], Lc = Math.hypot(B[0] - Tp[0], B[1] - Tp[1]), ang = Math.atan2(Tp[1] - B[1], Tp[0] - B[0]), r = 50;
      ctx.save(); ctx.translate(-B[0], B[1]); ctx.rotate(Math.PI - ang); ctx.scale(1, -1); L(ctx, (c) => chave(c, Lc, r)); ctx.restore();
      ctx.save(); ctx.translate(B[0], B[1]); ctx.rotate(ang); L(ctx, (c) => chave(c, Lc, r)); ctx.restore();
      const cy = (B[1] + Tp[1]) / 2;
      L(ctx, (c) => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r0 = k % 2 ? 28 : 32, r1 = k % 2 ? 44 : 62; c.moveTo(Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, cy + Math.sin(a) * r1); } }, 8);
    },
    // a porta (cinza) e as duas malas (limão, preenchidas) diante dela
    malas_porta(ctx) {
      G(ctx, (c) => {
        c.moveTo(-150, 270); c.lineTo(-150, -290); c.lineTo(150, -290); c.lineTo(150, 270);
        rr(c, -105, -240, 210, 510, 10); rr(c, -70, -200, 140, 150, 12); rr(c, -70, -10, 140, 110, 12);
        c.moveTo(-290, 270); c.lineTo(290, 270); c.moveTo(70, 140); c.arc(60, 140, 10, 0, TAU);
      });
      tapa(ctx, (c) => { rr(c, -300, 120, 150, 150, 18); rr(c, 150, 120, 150, 150, 18); });
      F(ctx, (c) => { corpoMala(c, -225, 270, 150, 150); corpoMala(c, 225, 270, 150, 150); });
      L(ctx, (c) => { mala(c, -225, 270, 150, 150); mala(c, 225, 270, 150, 150); });
    },
    // o "02" e o círculo em limão; a folha (com o topo preenchido), os tracinhos e a ampulheta em cinza
    calendario_02_ampulheta(ctx) {
      F(ctx, (c) => topoFolha(c, -290, -230, 370));
      G(ctx, (c) => {
        folha(c, -290, -230, 370, 430);
        for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { if (r === 0 && k === 1) continue; const x = -250 + k * 82, y = -80 + r * 230; c.moveTo(x, y); c.lineTo(x + 26, y); }
        c.moveTo(150, -150); c.lineTo(290, -150); c.moveTo(150, 170); c.lineTo(290, 170);
        c.moveTo(165, -150); c.lineTo(220, 10); c.lineTo(165, 170); c.moveTo(275, -150); c.lineTo(220, 10); c.lineTo(275, 170);
        c.moveTo(190, 150); c.lineTo(220, 112); c.lineTo(250, 150); c.closePath();
      });
      L(ctx, (c) => c.ellipse(-105, 30, 115, 82, -0.12, 0.25, TAU + 0.05));
      T(ctx, '02', -105, 36, 120);
    },
    // o copo (cinza, com o líquido preenchido) e a comanda pendurada (limão)
    caipirinha_comanda(ctx) {
      F(ctx, (c) => { c.moveTo(-140, -40); c.lineTo(-110, 260); c.lineTo(110, 260); c.lineTo(140, -40); c.closePath(); }, 0.2);
      G(ctx, (c) => {
        c.moveTo(-150, -130); c.lineTo(-110, 260); c.lineTo(110, 260); c.lineTo(150, -130);
        c.moveTo(-140, -40); c.lineTo(140, -40);
        rr(c, -95, 30, 80, 80, 14); rr(c, 5, 80, 80, 80, 14); rr(c, -60, 150, 70, 70, 12);
        c.moveTo(60, -40); c.lineTo(120, -290);
        c.moveTo(70, -130); c.arc(150, -130, 80, Math.PI, 0); c.closePath();
        for (let k = 1; k < 4; k++) { const a = Math.PI + (k * Math.PI) / 4; c.moveTo(150, -132); c.lineTo(150 + 60 * Math.cos(a), -130 + 60 * Math.sin(a)); }
        c.moveTo(-135, -60); c.quadraticCurveTo(-200, -40, -215, 0);
      });
      tapa(ctx, (c) => rr(c, -300, 0, 170, 230, 18));
      L(ctx, (c) => {
        rr(c, -300, 0, 170, 230, 18); c.moveTo(-207, 18); c.arc(-215, 18, 8, 0, TAU);
        for (let k = 0; k < 4; k++) { const y = 70 + k * 38; c.moveTo(-270, y); c.lineTo(k === 3 ? -200 : -160, y); }
      });
    },
    // o balão (limão onde ainda existe, preenchido) e o "…"; a parte que some, em cinza pontilhado
    balao_sumindo(ctx) {
      F(ctx, (c) => { c.moveTo(-60, -180); c.lineTo(-210, -180); c.arcTo(-280, -180, -280, -110, 70); c.lineTo(-280, 50); c.arcTo(-280, 120, -210, 120, 70); c.lineTo(-60, 120); c.closePath(); }, 0.2);
      L(ctx, (c) => { c.moveTo(-60, -180); c.lineTo(-210, -180); c.arcTo(-280, -180, -280, -110, 70); c.lineTo(-280, 50); c.arcTo(-280, 120, -210, 120, 70); c.lineTo(-170, 120); c.lineTo(-215, 230); c.lineTo(-90, 120); c.lineTo(-60, 120); });
      ctx.save(); ctx.setLineDash([2 / K, 40]); G(ctx, (c) => { c.moveTo(-60, -180); c.lineTo(210, -180); c.arcTo(280, -180, 280, -110, 70); c.lineTo(280, 50); c.arcTo(280, 120, 210, 120, 70); c.lineTo(-60, 120); }, 13); ctx.restore();
      L(ctx, (c) => { [-130, -30, 70].forEach((x) => { c.moveTo(x, -30); c.lineTo(x + 0.1, -30); }); }, 30);
    },
    // a notinha (cinza, com a faixa do total preenchida) e o X (limão) riscando o total
    notinha_x(ctx) {
      F(ctx, (c) => rr(c, -150, 150, 300, 90, 8), 0.22);
      G(ctx, (c) => {
        const x0 = -165, x1 = 165, y0 = -290, y1 = 290, n = 8, w = (x1 - x0) / n;
        c.moveTo(x0, y0 + 14); for (let i = 0; i < n; i++) { c.lineTo(x0 + (i + 0.5) * w, y0); c.lineTo(x0 + (i + 1) * w, y0 + 14); }
        c.lineTo(x1, y1 - 14); for (let i = n - 1; i >= 0; i--) { c.lineTo(x0 + (i + 0.5) * w, y1); c.lineTo(x0 + i * w, y1 - 14); } c.closePath();
        for (let k = 0; k < 5; k++) { const y = -200 + k * 60; c.moveTo(-115, y); c.lineTo(k % 2 ? 40 : 10, y); c.moveTo(75, y); c.lineTo(115, y); }
        c.moveTo(-115, 125); c.lineTo(115, 125); c.moveTo(-115, 195); c.lineTo(-20, 195); c.moveTo(50, 195); c.lineTo(115, 195);
      });
      L(ctx, (c) => { c.moveTo(-200, 120); c.lineTo(200, 270); c.moveTo(200, 120); c.lineTo(-200, 270); }, 13);
    },
    // o relógio (limão, com o mostrador preenchido) às 11h; as três malas em cinza
    relogio_malas(ctx) {
      F(ctx, (c) => { c.moveTo(180, -110); c.arc(0, -110, 180, 0, TAU); }, 0.16);
      L(ctx, (c) => {
        c.moveTo(180, -110); c.arc(0, -110, 180, 0, TAU);
        c.moveTo(0, -110); c.lineTo(0, -245);
        c.moveTo(0, -110); c.lineTo(Math.cos(-Math.PI / 2 - Math.PI / 6) * 95, -110 + Math.sin(-Math.PI / 2 - Math.PI / 6) * 95);
      });
      G(ctx, (c) => { for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6, r0 = k % 3 ? 150 : 132; c.moveTo(Math.cos(a) * r0, -110 + Math.sin(a) * r0); c.lineTo(Math.cos(a) * 160, -110 + Math.sin(a) * 160); } }, 8);
      tapa(ctx, (c) => { rr(c, -275, 140, 150, 160, 18); rr(c, -75, 140, 150, 160, 18); rr(c, 125, 140, 150, 160, 18); });
      G(ctx, (c) => { mala(c, -200, 300, 150, 160); mala(c, 0, 300, 150, 160); mala(c, 200, 300, 150, 160); });
    },
    // o sino (limão, preenchido) com "R$" e o "?"; as ondas do toque em cinza
    sino_pix(ctx) {
      const sino = (c) => { c.moveTo(-200, 150); c.quadraticCurveTo(-150, 110, -150, 20); c.lineTo(-150, -60); c.bezierCurveTo(-150, -190, -80, -235, 0, -235); c.bezierCurveTo(80, -235, 150, -190, 150, -60); c.lineTo(150, 20); c.quadraticCurveTo(150, 110, 200, 150); c.closePath(); };
      F(ctx, sino, 0.18);
      L(ctx, (c) => { sino(c); c.moveTo(-45, 175); c.arc(0, 175, 45, Math.PI, 0, true); c.moveTo(0, -235); c.lineTo(0, -270); });
      G(ctx, (c) => { c.moveTo(195, -230); c.arc(150, -230, 45, 0, -0.9, true); c.moveTo(-195, -230); c.arc(-150, -230, 45, Math.PI, Math.PI + 0.9, false); });
      T(ctx, 'R$', 0, -20, 130);
      T(ctx, '?', 240, -95, 120);
    },
    // a prancheta vazia (limão, com o prendedor preenchido); a mala em cinza
    mala_prancheta(ctx) {
      G(ctx, (c) => mala(c, -165, 270, 230, 300));
      F(ctx, (c) => rr(c, 85, -282, 120, 60, 16), 0.3);
      L(ctx, (c) => { rr(c, 10, -250, 270, 520, 28); rr(c, 85, -282, 120, 60, 16); });
      ctx.save(); ctx.setLineDash([14 / K * 1, 20]); G(ctx, (c) => { for (let k = 0; k < 6; k++) { const y = -150 + k * 66; c.moveTo(55, y); c.lineTo(235, y); } }, 8); ctx.restore();
    },
    // a balança (cinza) inclinada; as moedas (limão, preenchidas) no prato que desce
    balanca(ctx) {
      const tilt = 0.22, bx = 230, py = -170, by = (s) => py - s * Math.sin(tilt) * bx;
      G(ctx, (c) => {
        c.moveTo(0, py - 50); c.lineTo(0, 250); c.moveTo(-120, 250); c.lineTo(120, 250);
        c.moveTo(-bx * Math.cos(tilt), by(-1)); c.lineTo(bx * Math.cos(tilt), by(1));
        [[-1, 150], [1, 150]].forEach(([s, h]) => {
          const x = s * bx * Math.cos(tilt), y = by(s);
          c.moveTo(x, y); c.lineTo(x - 85, y + h); c.moveTo(x, y); c.lineTo(x + 85, y + h);
          c.moveTo(x - 110, y + h); c.quadraticCurveTo(x, y + h + 70, x + 110, y + h);
        });
        c.moveTo(14, py - 50); c.arc(0, py - 50, 14, 0, TAU);
      });
      const x = -bx * Math.cos(tilt), y = by(-1) + 150 + 18;
      const pilha = (c) => { [[0, 0], [8, 1], [-6, 2], [4, 3]].forEach(([dx, k]) => rr(c, x - 65 + dx, y - 22 - k * 30, 130, 26, 13)); };
      tapa(ctx, (c) => rr(c, x - 75, y - 4 * 30 - 6, 150, 4 * 30 + 24, 14));
      F(ctx, pilha, 0.3);
      L(ctx, pilha, 9);
    },
  };

  // ---------------------------------------------------------------- o título: quebra automática em 2–4 linhas, o maior corpo possível
  // as palavras das linhas antes de `limao_desde` ficam em branco, as outras em limão; branco e limão nunca dividem uma linha
  function quebras(palavras, k) {
    // a melhor divisão de `palavras` em k linhas (a de menor linha mais larga)
    if (k === 1) return [[palavras.join(' ')]];
    const out = [];
    for (let i = 1; i <= palavras.length - k + 1; i++) quebras(palavras.slice(i), k - 1).forEach((r) => out.push([palavras.slice(0, i).join(' '), ...r]));
    return out;
  }
  function titulo(ctx, c) {
    const ld = c.limao_desde ?? 1;
    const branco = c.titulo.slice(0, ld).join(' ').split(' '), limao = c.titulo.slice(ld).join(' ').split(' ');
    const larg = (l, s) => { ctx.font = `900 ${s}px ${DISPLAY}`; ctx.letterSpacing = `${-0.03 * s}px`; return ctx.measureText(l).width; };
    let best = null;
    for (let a = 1; a <= Math.min(3, branco.length); a++) for (let b = 1; b <= Math.min(3, limao.length); b++) {
      if (a + b > 4) continue;
      for (const qa of quebras(branco, a)) for (const qb of quebras(limao, b)) {
        const linhas = [...qa.map((t) => ({ t, cor: '#FFFFFF' })), ...qb.map((t) => ({ t, cor: LIME }))];
        const w100 = Math.max(...linhas.map((l) => larg(l.t, 100)));
        // a altura que sobra para o título depois da ilustração mínima (28% do recorte), do chip e das folgas
        const espaco = Z.base - Z.ilusTopo - Math.round(0.28 * 1440) - 36 - 58 - 34;
        const S = Math.min(Z.maxTitulo, Math.floor((100 * (c.largura_titulo || Z.larguraTitulo)) / w100), Math.floor(espaco / (0.98 * (linhas.length - 1) + 1.0)));
        const score = S - 4 * (linhas.length - 2);                     // a mesma letra com menos linhas é melhor
        if (!best || score > best.score) best = { linhas, S, score };
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- a capa
  function render(ctx, logo, c, o = {}) {
    OPT = o;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
    const caixas = {};
    // fundo: gradiente com leve tom (petróleo / azul-noite alternados) + grade de pontinhos + vinheta
    const [ca, cb] = FUNDOS[(c.fundo ?? (c._i || 0)) % 2];
    let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, ca); g.addColorStop(1, cb);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = 12; y < H; y += 24) for (let x = 12; x < W; x += 24) ctx.fillRect(x - 1, y - 1, 2, 2);
    g = ctx.createRadialGradient(540, 900, 380, 540, 900, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // logo pequena no topo
    const d = 54; ctx.font = `800 30px ${DISPLAY}`; const nw = ctx.measureText('FAZLO Hospeda').width, gw = d + 14 + nw, lx = 540 - gw / 2;
    ctx.drawImage(logo, lx, Z.logoY - d / 2, d, d);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF'; ctx.fillText('FAZLO', lx + d + 14, Z.logoY + 1);
    ctx.fillStyle = LIME; ctx.fillText('Hospeda', lx + d + 14 + ctx.measureText('FAZLO ').width, Z.logoY + 1);
    caixas.logo = { x0: lx, y0: Z.logoY - d / 2, x1: lx + gw, y1: Z.logoY + d / 2 };
    // o título (protagonista), ancorado embaixo
    const tt = titulo(ctx, c), S = tt.S, n = tt.linhas.length, lh = S * 0.98, ultima = Z.base - 0.24 * S, base = (i) => ultima - (n - 1 - i) * lh;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    tt.linhas.forEach((l, i) => {
      ctx.font = `900 ${S}px ${DISPLAY}`; ctx.letterSpacing = `${-0.03 * S}px`; ctx.fillStyle = l.cor; ctx.fillText(l.t, 540, base(i));
      const w = ctx.measureText(l.t).width;
      caixas[`título, linha ${i + 1}`] = { x0: 540 - w / 2, y0: base(i) - 0.74 * S, x1: 540 + w / 2, y1: base(i) + 0.2 * S };
    });
    ctx.letterSpacing = '0px';
    const topoTitulo = base(0) - 0.76 * S;
    // o chip da série, logo acima do título
    ctx.font = `800 26px ${MONO}`; ctx.letterSpacing = '3px';
    const cw = ctx.measureText(c.chip).width + 34 + 52, ch = 58, chipY = topoTitulo - 34 - ch / 2, cx0 = 540 - cw / 2;
    ctx.beginPath(); rr(ctx, cx0, chipY - ch / 2, cw, ch, ch / 2); ctx.fillStyle = 'rgba(22,26,24,0.9)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx0 + 30, chipY, 7, 0, TAU); ctx.fillStyle = LIME; ctx.fill();
    ctx.fillStyle = '#E8EAE4'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(c.chip, cx0 + 52, chipY + 2); ctx.letterSpacing = '0px';
    caixas.chip = { x0: cx0, y0: chipY - ch / 2, x1: cx0 + cw, y1: chipY + ch / 2 };
    // a ilustração (~30% da altura do recorte 3:4), centrada entre a logo e o chip
    const livreTopo = Z.ilusTopo, livreFundo = chipY - ch / 2 - 36, hI = Math.min(Z.ilusAlt, livreFundo - livreTopo), cy = (livreTopo + livreFundo) / 2;
    K = hI / 640;
    ctx.save(); ctx.translate(540, cy); ctx.scale(K, K); ILUS[c.ilustracao](ctx); ctx.restore();
    caixas['ilustração'] = { x0: 540 - 320 * K, y0: cy - hI / 2, x1: 540 + 320 * K, y1: cy + hI / 2 };
    return { caixas, corpo_titulo: S, linhas: tt.linhas.map((l) => l.t), altura_ilustracao: Math.round(hI) };
  }
  window.CAPA = { render, ILUS };
})();
