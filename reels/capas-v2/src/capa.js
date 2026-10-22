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
  function neon(ctx, desenha, lw = 22, dash = null) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
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

  // uma mala de viagem (corpo, alça e duas faixas), de base em (x, y), largura w e altura h
  const mala = (c, x, y, w, h) => {
    rr(c, x - w / 2, y - h, w, h, w * 0.12);
    c.moveTo(x - w * 0.2, y - h); c.lineTo(x - w * 0.2, y - h - h * 0.22); c.lineTo(x + w * 0.2, y - h - h * 0.22); c.lineTo(x + w * 0.2, y - h);
    c.moveTo(x - w * 0.22, y - h + h * 0.18); c.lineTo(x - w * 0.22, y - h * 0.12); c.moveTo(x + w * 0.22, y - h + h * 0.18); c.lineTo(x + w * 0.22, y - h * 0.12);
  };
  // apaga o fundo atrás de uma peça (para ela ficar NA FRENTE de outra)
  const tapa = (ctx, f) => { ctx.save(); ctx.beginPath(); f(ctx); ctx.fillStyle = '#0B0B0B'; ctx.fill(); ctx.restore(); };
  // folha de calendário (as argolas, a barra do topo) com caixa x0..x0+w, y0..y0+h
  const folha = (c, x0, y0, w, h) => {
    rr(c, x0, y0, w, h, 38); c.moveTo(x0, y0 + 100); c.lineTo(x0 + w, y0 + 100);
    c.moveTo(x0 + w * 0.25, y0 - 35); c.lineTo(x0 + w * 0.25, y0 + 30); c.moveTo(x0 + w * 0.75, y0 - 35); c.lineTo(x0 + w * 0.75, y0 + 30);
  };

  // ---------------------------------------------------------------- as ilustrações (quadro de ±300)
  const ILUS = {
    // uma MOEDA (aro duplo + "R$" grande) partida em diagonal, com o corte passando pelo meio do "R$";
    // as metades se afastam e o "?" fica no vão
    moeda_partida(ctx) {
      const R0 = 240, R1 = 190, off = 84, n = [Math.SQRT1_2, Math.SQRT1_2], dv = [Math.SQRT1_2, -Math.SQRT1_2];
      const metade = (s) => {
        ctx.save(); ctx.translate(s * off * n[0], s * off * n[1]);
        // só o lado da metade (semiplano pelo corte), com o próprio traço do corte
        ctx.beginPath(); const L = 900;
        ctx.moveTo(-L * dv[0], -L * dv[1]); ctx.lineTo(L * dv[0], L * dv[1]); ctx.lineTo(L * dv[0] + s * L * n[0], L * dv[1] + s * L * n[1]); ctx.lineTo(-L * dv[0] + s * L * n[0], -L * dv[1] + s * L * n[1]); ctx.closePath();
        ctx.clip();
        neon(ctx, (c) => { c.moveTo(R0, 0); c.arc(0, 0, R0, 0, TAU); c.moveTo(R1, 0); c.arc(0, 0, R1, 0, TAU); }, 20);
        neonTexto(ctx, 'R$', 0, 8, 215);
        ctx.restore();
        ctx.save(); ctx.translate(s * off * n[0], s * off * n[1]);
        neon(ctx, (c) => { c.moveTo(-R0 * dv[0], -R0 * dv[1]); c.lineTo(R0 * dv[0], R0 * dv[1]); }, 20);
        ctx.restore();
      };
      metade(1); metade(-1);
      neonTexto(ctx, '?', 0, 4, 130);
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
    // contorno de chalé (telhado, porta e janela) e, NA FRENTE dele, embaixo, duas chaves completas se cruzando,
    // com uma faísca no ponto de encontro
    chale_chaves(ctx) {
      neon(ctx, (c) => {
        c.moveTo(-250, -95); c.lineTo(0, -320); c.lineTo(250, -95);              // telhado
        c.moveTo(-195, -142); c.lineTo(-195, 20); c.lineTo(195, 20); c.lineTo(195, -142);   // paredes
        c.moveTo(-45, 20); c.lineTo(-45, -105); c.lineTo(45, -105); c.lineTo(45, 20);       // porta
        c.moveTo(22, -40); c.lineTo(22, -30);                                               // maçaneta
        rr(c, 85, -115, 72, 72, 10); c.moveTo(121, -115); c.lineTo(121, -43); c.moveTo(85, -79); c.lineTo(157, -79);   // janela
      }, 18);
      // as chaves: argolas embaixo, nas pontas; as hastes sobem e se cruzam bem abaixo da casa
      const B = [175, 290], T = [-175, 100], L = Math.hypot(B[0] - T[0], B[1] - T[1]), ang = Math.atan2(T[1] - B[1], T[0] - B[0]), r = 50;
      ctx.save(); ctx.translate(-B[0], B[1]); ctx.rotate(Math.PI - ang); ctx.scale(1, -1); neon(ctx, (c) => chave(c, L, r), 17); ctx.restore();
      ctx.save(); ctx.translate(B[0], B[1]); ctx.rotate(ang); neon(ctx, (c) => chave(c, L, r), 17); ctx.restore();
      const cy = (B[1] + T[1]) / 2;
      neon(ctx, (c) => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r0 = k % 2 ? 26 : 30, r1 = k % 2 ? 44 : 64; c.moveTo(Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, cy + Math.sin(a) * r1); } }, 9);
    },
    // duas malas lado a lado diante de uma porta só (batente, porta com almofadas e maçaneta)
    malas_porta(ctx) {
      neon(ctx, (c) => {
        c.moveTo(-150, 270); c.lineTo(-150, -290); c.lineTo(150, -290); c.lineTo(150, 270);             // o batente
        rr(c, -105, -240, 210, 510, 10);                                                                  // a porta
        rr(c, -70, -200, 140, 150, 12); rr(c, -70, -10, 140, 110, 12);                                    // as almofadas
        c.moveTo(-290, 270); c.lineTo(290, 270);                                                          // o chão
      }, 16);
      neon(ctx, (c) => { c.moveTo(70, 140); c.arc(60, 140, 10, 0, TAU); }, 12);                            // a maçaneta
      tapa(ctx, (c) => { rr(c, -300, 120, 150, 150, 18); rr(c, 150, 120, 150, 150, 18); });
      neon(ctx, (c) => { mala(c, -225, 270, 150, 150); mala(c, 225, 270, 150, 150); }, 16);
    },
    // folha de calendário com o dia 02 circulado e uma ampulheta ao lado
    calendario_02_ampulheta(ctx) {
      neon(ctx, (c) => {
        folha(c, -290, -230, 370, 430);
        for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { if (r === 0 && k === 1) continue; const x = -250 + k * 82, y = -80 + r * 230; c.moveTo(x, y); c.lineTo(x + 26, y); }
        c.ellipse(-105, 30, 115, 82, -0.12, 0.25, TAU + 0.05);                                            // o círculo à mão em volta do 02
      }, 18);
      neonTexto(ctx, '02', -105, 36, 120);
      neon(ctx, (c) => {
        c.moveTo(150, -150); c.lineTo(290, -150); c.moveTo(150, 170); c.lineTo(290, 170);
        c.moveTo(165, -150); c.lineTo(220, 10); c.lineTo(165, 170); c.moveTo(275, -150); c.lineTo(220, 10); c.lineTo(275, 170);
        c.moveTo(190, 150); c.lineTo(220, 112); c.lineTo(250, 150); c.closePath();                        // a areia que caiu
      }, 16);
    },
    // copo de caipirinha (limão na borda, gelo, canudo) com uma comanda pendurada
    caipirinha_comanda(ctx) {
      neon(ctx, (c) => {
        c.moveTo(-150, -130); c.lineTo(-110, 260); c.lineTo(110, 260); c.lineTo(150, -130);              // o copo
        c.moveTo(-140, -40); c.lineTo(140, -40);                                                          // o nível
        rr(c, -95, 30, 80, 80, 14); rr(c, 5, 80, 80, 80, 14); rr(c, -60, 150, 70, 70, 12);               // gelo
        c.moveTo(60, -40); c.lineTo(120, -290);                                                           // canudo
      }, 17);
      neon(ctx, (c) => {
        // a rodela de limão na borda (meia-lua com os gomos), encaixada no canto do copo
        c.moveTo(70, -130); c.arc(150, -130, 80, Math.PI, 0); c.closePath();
        for (let k = 1; k < 4; k++) { const a = Math.PI + (k * Math.PI) / 4; c.moveTo(150, -132); c.lineTo(150 + 60 * Math.cos(a), -130 + 60 * Math.sin(a)); }
      }, 13);
      neon(ctx, (c) => {
        // a comanda pendurada por um cordão no lado esquerdo do copo
        c.moveTo(-135, -60); c.quadraticCurveTo(-200, -40, -215, 0);
      }, 14);
      tapa(ctx, (c) => rr(c, -300, 0, 170, 230, 18));
      neon(ctx, (c) => {
        rr(c, -300, 0, 170, 230, 18); c.moveTo(-215, 26); c.arc(-215, 18, 8, Math.PI / 2, Math.PI / 2 + TAU);
        for (let k = 0; k < 4; k++) { const y = 70 + k * 38; c.moveTo(-270, y); c.lineTo(k === 3 ? -200 : -160, y); }
      }, 14);
    },
    // balão de conversa com "…"; o contorno se desfaz em pontilhado à direita
    balao_sumindo(ctx) {
      neon(ctx, (c) => { c.moveTo(-60, -180); c.lineTo(-210, -180); c.arcTo(-280, -180, -280, -110, 70); c.lineTo(-280, 50); c.arcTo(-280, 120, -210, 120, 70); c.lineTo(-170, 120); c.lineTo(-215, 230); c.lineTo(-90, 120); c.lineTo(-60, 120); }, 20);
      neon(ctx, (c) => { c.moveTo(-60, -180); c.lineTo(210, -180); c.arcTo(280, -180, 280, -110, 70); c.lineTo(280, 50); c.arcTo(280, 120, 210, 120, 70); c.lineTo(-60, 120); }, 20, [2, 46]);
      neon(ctx, (c) => { [-130, -30, 70].forEach((x) => { c.moveTo(x, -30); c.lineTo(x + 0.1, -30); }); }, 46);
    },
    // notinha comprida de borda serrilhada, com um X grande riscando a linha do total
    notinha_x(ctx) {
      neon(ctx, (c) => {
        const x0 = -165, x1 = 165, y0 = -290, y1 = 290, n = 8, w = (x1 - x0) / n;
        c.moveTo(x0, y0 + 14); for (let i = 0; i < n; i++) { c.lineTo(x0 + (i + 0.5) * w, y0); c.lineTo(x0 + (i + 1) * w, y0 + 14); }
        c.lineTo(x1, y1 - 14); for (let i = n - 1; i >= 0; i--) { c.lineTo(x0 + (i + 0.5) * w, y1); c.lineTo(x0 + i * w, y1 - 14); } c.closePath();
        for (let k = 0; k < 5; k++) { const y = -200 + k * 60; c.moveTo(-115, y); c.lineTo(k % 2 ? 40 : 10, y); c.moveTo(75, y); c.lineTo(115, y); }
        c.moveTo(-115, 125); c.lineTo(115, 125);                                                           // o traço antes do total
        c.moveTo(-115, 195); c.lineTo(-20, 195); c.moveTo(50, 195); c.lineTo(115, 195);                    // a linha do total
      }, 16);
      neon(ctx, (c) => { c.moveTo(-200, 120); c.lineTo(200, 270); c.moveTo(200, 120); c.lineTo(-200, 270); }, 26);
    },
    // relógio de parede marcando 11h, com três malas enfileiradas na frente
    relogio_malas(ctx) {
      neon(ctx, (c) => {
        c.moveTo(180, -110); c.arc(0, -110, 180, 0, TAU);
        for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6, r0 = k % 3 ? 150 : 132; c.moveTo(Math.cos(a) * r0, -110 + Math.sin(a) * r0); c.lineTo(Math.cos(a) * 160, -110 + Math.sin(a) * 160); }
        c.moveTo(0, -110); c.lineTo(0, -245);                                                             // ponteiro dos minutos no 12
        c.moveTo(0, -110); c.lineTo(Math.cos(-Math.PI / 2 - Math.PI / 6) * 95, -110 + Math.sin(-Math.PI / 2 - Math.PI / 6) * 95);   // horas no 11
      }, 18);
      tapa(ctx, (c) => { rr(c, -275, 140, 150, 160, 18); rr(c, -75, 140, 150, 160, 18); rr(c, 125, 140, 150, 160, 18); });
      neon(ctx, (c) => { mala(c, -200, 300, 150, 160); mala(c, 0, 300, 150, 160); mala(c, 200, 300, 150, 160); }, 15);
    },
    // sino de notificação com "R$" e um "?" saindo dele (sem logo de app)
    sino_pix(ctx) {
      neon(ctx, (c) => {
        c.moveTo(-200, 150); c.quadraticCurveTo(-150, 110, -150, 20); c.lineTo(-150, -60); c.bezierCurveTo(-150, -190, -80, -235, 0, -235);
        c.bezierCurveTo(80, -235, 150, -190, 150, -60); c.lineTo(150, 20); c.quadraticCurveTo(150, 110, 200, 150); c.closePath();
        c.moveTo(-45, 175); c.arc(0, 175, 45, Math.PI, 0, true);                                         // o badalo
        c.moveTo(0, -235); c.lineTo(0, -270);
        c.moveTo(195, -230); c.arc(150, -230, 45, 0, -0.9, true);                                         // ondas do toque
        c.moveTo(-195, -230); c.arc(-150, -230, 45, Math.PI, Math.PI + 0.9, false);
      }, 18);
      neonTexto(ctx, 'R$', 0, -20, 130);
      neonTexto(ctx, '?', 235, -95, 120);
    },
    // mala de viagem ao lado de uma prancheta vazia (linhas tracejadas, sem nome)
    mala_prancheta(ctx) {
      neon(ctx, (c) => mala(c, -165, 270, 230, 300), 18);
      neon(ctx, (c) => {
        rr(c, 10, -250, 270, 520, 28);
        rr(c, 85, -282, 120, 60, 16);                                                                     // o prendedor
        c.moveTo(55, -150); c.lineTo(110, -150);                                                          // "NOME:" (só o traço do rótulo)
      }, 16);
      neon(ctx, (c) => { for (let k = 0; k < 6; k++) { const y = -150 + k * 66; c.moveTo(k ? 55 : 135, y); c.lineTo(235, y); } }, 12, [12, 18]);
    },
    // balança inclinada: moedas empilhadas de um lado só (o lado que pesa e desce)
    balanca(ctx) {
      const tilt = 0.22, bx = 230, py = -170, by = (s) => py - s * Math.sin(tilt) * bx;   // a esquerda (com as moedas) desce
      neon(ctx, (c) => {
        c.moveTo(0, py - 50); c.lineTo(0, 250); c.moveTo(-120, 250); c.lineTo(120, 250);                 // coluna e base
        c.moveTo(-bx * Math.cos(tilt), by(-1)); c.lineTo(bx * Math.cos(tilt), by(1));                    // o travessão
        [[-1, 150], [1, 150]].forEach(([s, h]) => {
          const x = s * bx * Math.cos(tilt), y = by(s);
          c.moveTo(x, y); c.lineTo(x - 85, y + h); c.moveTo(x, y); c.lineTo(x + 85, y + h);                // os fios
          c.moveTo(x - 110, y + h); c.quadraticCurveTo(x, y + h + 70, x + 110, y + h);                    // o prato
        });
        c.moveTo(14, py - 50); c.arc(0, py - 50, 14, 0, TAU);
      }, 15);
      // as moedas no prato da esquerda (que desce)
      const x = -bx * Math.cos(tilt), y = by(-1) + 150 + 18;
      // a pilha de moedas vista de lado: discos chatos, um sobre o outro, levemente desalinhados
      tapa(ctx, (c) => { rr(c, x - 75, y - 4 * 30 - 6, 150, 4 * 30 + 24, 14); });
      neon(ctx, (c) => { [[0, 0], [8, 1], [-6, 2], [4, 3]].forEach(([dx, k]) => { rr(c, x - 65 + dx, y - 22 - k * 30, 130, 26, 13); }); }, 11);
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
    while (larg(S) > (c.largura_titulo || Z.larguraTitulo)) S -= 2;
    const lh = S * 1.0, ultima = Z.base - 0.24 * S, base = (i) => ultima - (n - 1 - i) * lh;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    c.titulo.forEach((l, i) => {
      ctx.font = `900 ${S}px ${DISPLAY}`; ctx.letterSpacing = `${-0.03 * S}px`; ctx.fillStyle = i < (c.limao_desde ?? 1) ? '#FFFFFF' : LIME;
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
