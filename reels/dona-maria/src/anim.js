/*
 * FAZLO Hospeda — Reel "Dona Maria" (1080×1920, 30 fps, 33,6 s). Timeline aprovada: TIMELINE.md.
 *
 * Este motor desenha uma CAMADA sobre os vídeos: transparente nos trechos da Dona Maria (só a legenda, com um véu
 * escuro suave atrás dela, e as faixas de transição) e opaca no meio (o celular com as 3 telas anexadas, sem nenhuma
 * tela inventada) e no fecho (a logo). O render.cjs põe a camada por cima dos vídeos da Dona Maria (scripts/render.cjs).
 *
 * Meio: tela 01 (calendário) com o contorno limão na reserva F. Andrade do Chalé Ipê em "Eu vejo"; tela 02 (nova
 * reserva) com o destaque em Chalé Ipê ("mesmo chalé") e no período ("data já ocupada"); tela 03 (período ocupado)
 * entra sem pulo: o modal cresce para cima, o resumo sobe 140 px, "Nasce como" e os botões descem 137 px, o aviso
 * amarelo abre no meio e o botão fica cinza (deslocamentos medidos nas próprias telas). Em "não deixa", o contorno
 * limão no "Período ocupado."; a tela fica parada 2,5 s depois da fala.
 * Legenda palavra por palavra no padrão do reel-09 (Inter Display 900, 68 px, branca, chaves em limão), linhas em
 * y 1440/1516: abaixo do queixo da Dona Maria e acima dos 20% de baixo. Grafia oficial: "FAZLO Hospeda".
 */
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const C = { bg: '#0A0A0A', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2', ink: '#0A0A0A' };
  const CAP = { size: 68, lh: 76, y1: 1440, maxW: 860, cx: 540, minPag: 1.2, segura: 0.7 };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3), inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x, s = 1.70158) => (x <= 0 ? 0 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  const TAU = Math.PI * 2;
  const css = (h, a = 1) => { const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return `rgba(${n[0]},${n[1]},${n[2]},${a})`; };
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));
  let M, LOGO, TEL, LN, BOXES = null, PAGES = [];
  const BOX = (nome, x0, y0, x1, y1) => { if (BOXES) BOXES.push({ nome, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) }); };
  function setFont(c, fam, size, weight, ls = 0) { c.font = `${weight} ${size}px ${fam}`; c.letterSpacing = `${ls}px`; }
  function tw(s, fam, size, weight, ls = 0) { setFont(M, fam, size, weight, ls); return M.measureText(s).width - (s.length ? ls : 0); }
  function txt(c, s, x, y, o = {}) {
    const fam = o.fam || DISPLAY, size = o.size || 40, weight = o.weight || 700, ls = o.ls || 0;
    const w = tw(s, fam, size, weight, ls), x0 = o.align === 'center' ? x - w / 2 : x;
    c.save(); setFont(c, fam, size, weight, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.globalAlpha *= o.alpha ?? 1; c.fillStyle = o.color || C.white; c.fillText(s, x0, y); c.restore();
    return w;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }

  // ---------------------------------------------------------------- o celular e as telas (coordenadas da tela: 924×2000)
  const K = 0.53, SW = 924 * K, SH = 2000 * K, BZ = 15;             // a tela no celular: 490×1060, moldura de 15 px
  const PX = 540 - SW / 2, PY = 228;                               // o canto da tela no quadro (o celular vai de y ≈ 213 a 1303)
  // os destaques (em pixels da tela original)
  const R = {
    andrade: [484, 826, 658, 900], ipe: [50, 797, 870, 930],
    acomodacao: [118, 828, 806, 884], periodo: [118, 894, 806, 952],
    aviso: [86, 1095, 838, 1343], ocupado: [219, 1131, 486, 1167, 2],     // só "Período ocupado." (o "O Chalé Ipê" começa em x 495)
  };
  const sx = (x) => PX + x * K, sy = (y) => PY + y * K;
  // a câmera: escala e centro (em pixels da tela) em cada momento
  function camera(t) {
    const key = [[0, 1, 462, 1000], [T.vejo - 0.1, 1, 462, 1000], [T.vejo + 0.5, 1.42, 560, 860],
      [T.tela2 - 0.25, 1.42, 560, 860], [T.tela2 + 0.3, 1.0, 462, 1000], [T.mesmo - 0.1, 1.0, 462, 1000], [T.mesmo + 0.5, 1.32, 462, 900],
      [T.tela3, 1.32, 462, 900], [T.tela3 + 0.5, 1.12, 462, 1050], [T.periodo - 0.1, 1.12, 462, 1050], [T.periodo + 0.5, 1.06, 462, 1000, 670]];   // na pausa: o celular inteiro, parado, centralizado entre o topo e a legenda
    let a = key[0], b = key[0];
    for (let i = 0; i < key.length; i++) { if (t >= key[i][0]) { a = key[i]; b = key[i + 1] || key[i]; } }
    const u = b === a ? 0 : E.inOutCubic(p(t, a[0], b[0]));
    const oy = (k) => k[4] ?? (PY + SH / 2 - 40 * (k[1] - 1));     // onde fica o centro do celular no quadro
    return { z: lerp(a[1], b[1], u), cx: lerp(a[2], b[2], u), cy: lerp(a[3], b[3], u), oy: lerp(oy(a), oy(b), u) };
  }
  function contorno(c, r, t0, t, cor = C.lime) {                  // o contorno limão que se desenha, com o resto escurecido
    const u = E.outCubic(p(t, t0, t0 + 0.4));
    if (u <= 0) return;
    const [x0, y0, x1, y1] = r, pad = r[4] ?? 8, X = sx(x0) - pad, Y = sy(y0) - pad, Wd = (x1 - x0) * K + 2 * pad, Hd = (y1 - y0) * K + 2 * pad;
    c.save(); c.beginPath(); c.rect(PX, PY, SW, SH); c.roundRect(X, Y, Wd, Hd, 12); c.fillStyle = `rgba(10,10,10,${0.38 * u})`; c.fill('evenodd'); c.restore();
    const per = 2 * (Wd + Hd);
    c.save(); rr(c, X, Y, Wd, Hd, 12); c.setLineDash([per * u, per]); c.strokeStyle = cor; c.lineWidth = 5 / 1.3;
    c.shadowColor = cor; c.shadowBlur = 8 + 20 * kick(t, t0 + 0.4, 0.6); c.stroke(); c.restore();
    BOX('destaque', X, Y, X + Wd, Y + Hd);
  }
  function tela2para3(c, u) {                                    // a transição sem pulo da tela 02 para a 03
    const A = TEL[1], B = TEL[2], X0 = 38, X1 = 886;
    c.drawImage(A, PX, PY, SW, SH);
    const y0 = lerp(509, 369, u), y1 = lerp(1492, 1630, u);
    c.save(); rr(c, sx(X0), sy(y0 - 7), (X1 - X0) * K, (y1 - y0 + 14) * K, 48 * K); c.fillStyle = '#FFFFFF'; c.fill(); c.clip();
    const dTop = lerp(140, 0, u), dBot = lerp(-137, 0, u);
    const parte = (img, ya, yb, dy, alpha = 1) => { c.save(); c.globalAlpha *= alpha; c.drawImage(img, X0, ya, X1 - X0, yb - ya, sx(X0), sy(ya + dy), (X1 - X0) * K, (yb - ya) * K); c.restore(); };
    parte(B, 369, 1075, dTop);                                  // título e resumo (iguais nas duas telas): sobem
    const ua = E.outCubic(p(u, 0.25, 1));                       // o aviso abre no espaço que se forma
    c.save(); c.beginPath(); c.rect(sx(X0), sy(1075 + dTop), (X1 - X0) * K, (1360 - 1075 + dBot - dTop) * K); c.clip(); parte(B, 1075, 1360, 0, ua); c.restore();
    parte(A, 1223, 1500, 137 + dBot, 1 - u);                     // "Nasce como" e os botões descem; o botão vira cinza
    parte(B, 1360, 1637, dBot, u);
    c.restore();
  }
  function meio(c, t) {
    const ent = E.outBack(p(t, T.transicao1 + 0.2, T.transicao1 + 0.75), 1.3), sai = E.inCubic(p(t, T.transicao2 - 0.05, T.transicao2 + 0.2));
    if (ent <= 0) return;
    const g = c.createRadialGradient(540, 760, 0, 540, 760, 820);
    g.addColorStop(0, css(C.lime, 0.13 * ent)); g.addColorStop(1, css(C.lime, 0)); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const cam = camera(t), z = cam.z;
    c.save();
    c.beginPath(); c.rect(0, 0, W, 1352); c.clip();                // o celular nunca desce até a legenda
    c.translate(0, 300 * (1 - ent) - 120 * sai); c.globalAlpha *= clamp(ent * 1.5) * (1 - sai);
    // a câmera: aproxima o ponto (cx, cy) da tela, que vai para o centro do celular
    const fx = sx(cam.cx), fy = sy(cam.cy), ox = PX + SW / 2, oy = cam.oy;
    const balanco = 1 - p(t, T.periodo, T.periodo + 0.5);          // depois que o aviso entra, o celular fica parado
    c.translate(ox, oy); c.scale(z, z); c.rotate(Math.sin(t * 0.6) * 0.006 * balanco); c.translate(-fx, -fy);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 60; c.shadowOffsetY = 24;
    rr(c, PX - BZ, PY - BZ, SW + 2 * BZ, SH + 2 * BZ, 64); c.fillStyle = '#050505'; c.fill(); c.restore();
    rr(c, PX - BZ, PY - BZ, SW + 2 * BZ, SH + 2 * BZ, 64); c.strokeStyle = css(C.lime, 0.35); c.lineWidth = 2.5; c.stroke();
    c.save(); rr(c, PX, PY, SW, SH, 50); c.clip();
    if (t < T.tela2) {
      c.drawImage(TEL[0], PX, PY, SW, SH);
      const gb = kick(t, T.calendario, 0.9);                      // "calendário": a grade brilha
      if (gb > 0.02) { rr(c, sx(50), sy(680), 824 * K, 655 * K, 24); c.strokeStyle = css(C.lime, 0.8 * gb); c.lineWidth = 4; c.stroke(); }
      contorno(c, R.andrade, T.vejo, t);
    } else if (t < T.tela3) {
      const u = E.outCubic(p(t, T.tela2, T.tela2 + 0.35));      // a tela 02 entra por cima da 01 (o modal sobe)
      c.drawImage(TEL[0], PX, PY, SW, SH);
      c.save(); c.globalAlpha *= u; c.translate(0, 120 * (1 - u)); c.drawImage(TEL[1], PX, PY, SW, SH); c.restore();
      if (t < T.data) contorno(c, R.acomodacao, T.mesmo, t); else contorno(c, R.periodo, T.data, t);
    } else {
      const u = E.inOutCubic(p(t, T.tela3, T.tela3 + 0.5));
      if (u < 1) tela2para3(c, u); else c.drawImage(TEL[2], PX, PY, SW, SH);
      contorno(c, R.ocupado, T.periodo, t);
    }
    c.restore();
    c.restore();
    // o fundo do celular some antes da legenda
    const gf = c.createLinearGradient(0, 1250, 0, 1352); gf.addColorStop(0, 'rgba(10,10,10,0)'); gf.addColorStop(1, C.bg);
    c.fillStyle = gf; c.fillRect(0, 1250, W, 102);
    BOX('celular', PX - BZ, PY - BZ, PX + SW + BZ, Math.min(1352, PY + SH + BZ));
  }

  // ---------------------------------------------------------------- transições e fecho
  function faixa(c, t, t0, dur, revela) {                         // a faixa limão que varre a tela (de baixo para cima)
    const u = p(t, t0, t0 + dur);
    if (u <= 0 || u >= 1) return;
    const y = lerp(H + 200, -400, E.inOutCubic(u));
    c.save(); c.fillStyle = C.lime; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y - 180); c.lineTo(W, y + 140); c.lineTo(0, y + 320); c.fill(); c.restore();
  }
  function logo(c, t) {
    const t0 = T.logo, e = E.outBack(p(t, t0 + 0.1, t0 + 0.55), 1.8), D = 300, cy = 800;
    const g0 = c.createRadialGradient(540, cy, 0, 540, cy, 620);
    g0.addColorStop(0, css(C.lime, 0.15 * clamp(e))); g0.addColorStop(1, css(C.lime, 0)); c.fillStyle = g0; c.fillRect(0, 0, W, H);
    const ru = p(t, t0 + 0.35, t0 + 1.05);
    if (ru > 0 && ru < 1) { c.beginPath(); c.arc(540, cy, lerp(D * 0.52, 230, E.outExpo(ru)), 0, TAU); c.strokeStyle = css(C.lime, 0.9 * (1 - ru)); c.lineWidth = 7 * (1 - ru) + 1; c.stroke(); }
    if (e > 0) { c.save(); c.globalAlpha *= clamp(e * 2); const d = D * lerp(0.6, 1, e); c.drawImage(LOGO, 540 - d / 2, cy - d / 2, d, d); c.restore(); BOX('logo', 540 - D / 2, cy - D / 2, 540 + D / 2, cy + D / 2); }
    const NS = 96, w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.4), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.4), nx = 540 - (w1 + w2) / 2;
    const pin = E.outExpo(p(t, t0 + 0.15, t0 + 0.6)), ny = 1110;
    c.save(); c.beginPath(); c.rect(60, ny - 100, 960, 130); c.clip();
    txt(c, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900, ls: -2.4 });
    txt(c, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime, ls: -2.4 });
    c.restore();
    txt(c, '@fazlohospeda', 540, 1186, { fam: MONO, size: 34, weight: 700, color: C.gray, align: 'center', ls: 1, alpha: E.outCubic(p(t, t0 + 0.2, t0 + 0.7)) });
  }

  // ---------------------------------------------------------------- legenda palavra por palavra (o motor do reel-09)
  function layoutLegenda() {
    PAGES = [];
    const wid = (ws, a, b) => tw(ws.slice(a, b).map((x) => x.w).join(' '), DISPLAY, CAP.size, 900, -0.02 * CAP.size);
    // uma frase de uma palavra só ("Oi!") entra na página da frase seguinte do mesmo clipe
    const FR = [];
    LN.frases.forEach((f) => { const ant = FR[FR.length - 1]; if (ant && ant.palavras.length === 1 && ant.clipe === f.clipe) ant.palavras = ant.palavras.concat(f.palavras); else FR.push({ clipe: f.clipe, palavras: f.palavras.slice() }); });
    FR.forEach((f, fi) => {
      const ws = f.palavras, n = ws.length, prox = FR[fi + 1] ? FR[fi + 1].palavras[0].t0 : LN.duracao;
      // as páginas da frase: o menor número de páginas de até 2 linhas, cortando de preferência depois de pontuação,
      // nunca depois de uma palavra de ligação, sem separar uma chave de duas palavras ("mesmo chalé", "não deixa")
      const cabe = (a, b) => { if (wid(ws, a, b) <= CAP.maxW) return true; for (let k = a + 1; k < b; k++) if (wid(ws, a, k) <= CAP.maxW && wid(ws, k, b) <= CAP.maxW) return true; return false; };
      const ligacao = /^(o|a|os|as|do|da|no|na|de|e|já|um|uma|numa|se|eu|que)$/i;
      const custoCorte = (j) => (j === n ? 0 : (/[,.:;?!]$/.test(ws[j - 1].w) ? 0 : 3) + (ligacao.test(ws[j - 1].w) ? 6 : 0) + (ws[j - 1].chave && ws[j] && ws[j].chave ? 20 : 0));
      const best = Array(n + 1).fill(null); best[0] = { c: 0, p: 0, prev: -1 };
      for (let j = 1; j <= n; j++) for (let i = 0; i < j; i++) {
        if (!best[i] || !cabe(i, j)) continue;
        const curta = (j < n ? ws[j].t0 : ws[n - 1].t1 + 0.5) - ws[i].t0 < CAP.minPag ? 8 : 0;   // página que passa rápido demais
        const c = { c: best[i].c + custoCorte(j) + 10 + curta, p: best[i].p + 1, prev: i };
        if (!best[j] || c.c < best[j].c) best[j] = c;
      }
      const pages = []; for (let j = n; j > 0; j = best[j].prev) pages.unshift([best[j].prev, j]);
      pages.forEach(([a, b]) => {
        const n = b - a; let brk = n;
        if (wid(ws, a, b) > CAP.maxW) {                          // duas linhas: de preferência depois de uma vírgula; sem palavra sozinha
          let best = 1e9;
          for (let k = 1; k < n; k++) { const m = Math.max(wid(ws, a, a + k), wid(ws, a + k, b)) + ((k === 1 || n - k === 1) && n > 2 ? 300 : 0) - (/,$/.test(ws[a + k - 1].w) ? 250 : 0); if (m < best && Math.max(wid(ws, a, a + k), wid(ws, a + k, b)) <= CAP.maxW) { best = m; brk = k; } }
        }
        const rows = brk >= n ? [[a, b]] : [[a, a + brk], [a + brk, b]], pos = {};
        rows.forEach(([r0, r1], ri) => { let x = CAP.cx - wid(ws, r0, r1) / 2; for (let k = r0; k < r1; k++) { pos[k] = { x, row: ri }; x += tw(ws[k].w + ' ', DISPLAY, CAP.size, 900, -0.02 * CAP.size) - 0.02 * CAP.size; } });
        PAGES.push({ a, b, rows, pos, nrows: rows.length, t0: ws[a].t0, words: ws, fimFala: ws[b - 1].t1, prox, clipe: f.clipe });
      });
    });
    PAGES.forEach((q, i) => {
      const nx = PAGES[i + 1] && PAGES[i + 1].prox === q.prox ? PAGES[i + 1].t0 : q.prox;
      q.t1 = Math.min(nx, Math.max(q.fimFala + CAP.segura, Math.min(q.t0 + CAP.minPag, nx)), LN.logo - 0.05);
      // a última legenda do meio fica na tela durante toda a pausa, até a faixa da transição para a Dona Maria
      if (q.clipe === 'meio' && !(PAGES[i + 1] && PAGES[i + 1].clipe === 'meio')) q.t1 = LN.transicao2 + 0.15;
    });
  }
  function legenda(c, t, sobreVideo) {
    const pg = PAGES.find((q) => t >= q.t0 && t < q.t1);
    if (!pg) return;
    const y0 = CAP.y1 + (pg.nrows === 1 ? CAP.lh / 2 : 0), ls = -0.02 * CAP.size;
    if (sobreVideo) {                                             // sobre a Dona Maria: um véu escuro suave atrás da legenda
      // um véu bem suave e estreito (a legenda se apoia na sombra do próprio texto)
      const g = c.createLinearGradient(0, 1380, 0, 1550); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 1380, W, 170);
    }
    c.save(); c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 18; c.shadowOffsetY = 2;
    for (let k = pg.a; k < pg.b; k++) {
      const w = pg.words[k];
      if (t < w.t0) continue;
      const u = E.outCubic(p(t, w.t0, w.t0 + 0.09)), ps = pg.pos[k], ww = tw(w.w, DISPLAY, CAP.size, 900, ls);
      const pop = w.chave ? 1 + 0.07 * kick(t, w.t0, 0.18) : 1, y = y0 + ps.row * CAP.lh + (1 - u) * 10;
      c.save(); setFont(c, DISPLAY, CAP.size, 900, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.globalAlpha = u;
      c.translate(ps.x + ww / 2, y - CAP.size * 0.3); c.scale(pop, pop); c.fillStyle = w.chave ? C.lime : C.white; c.fillText(w.w, -ww / 2, CAP.size * 0.3);
      if (sobreVideo) { c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 5; c.shadowOffsetY = 2; c.fillText(w.w, -ww / 2, CAP.size * 0.3); }   // sombra justa no texto, sobre a camisa
      c.restore();
      if (u > 0.99) BOX('legenda', ps.x, y - CAP.size * 0.76, ps.x + ww, y + CAP.size * 0.22);
    }
    c.restore();
  }

  // ---------------------------------------------------------------- o quadro (a camada)
  let T = {};
  function frame(c, t) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowColor = 'transparent'; c.clearRect(0, 0, W, H);
    // o fundo preto do meio entra por trás da faixa limão e sai por trás da segunda faixa; o do fecho entra no fim do vídeo
    const pretoIn = p(t, T.transicao1 + 0.22, T.transicao1 + 0.26), pretoOut = p(t, T.transicao2 + 0.14, T.transicao2 + 0.18);
    const noMeio = t >= T.transicao1 && t < T.transicao2 + 0.3, noLogo = t >= T.logo;
    if (noMeio) {
      c.fillStyle = css(C.bg, pretoIn * (1 - pretoOut)); c.fillRect(0, 0, W, H);
      if (pretoIn * (1 - pretoOut) > 0.5) meio(c, t);
    }
    if (noLogo) { c.fillStyle = css(C.bg, E.outCubic(p(t, T.logo - 0.12, T.logo + 0.1))); c.fillRect(0, 0, W, H); logo(c, t); }
    faixa(c, t, T.transicao1, 0.5); faixa(c, t, T.transicao2 - 0.05, 0.45);
    const sobreVideo = !noLogo && !(noMeio && pretoIn * (1 - pretoOut) > 0.5);
    if (!noLogo) legenda(c, t, sobreVideo);
  }
  function init(logoImg, telas, linha) {
    LOGO = logoImg; TEL = telas; LN = linha; M = document.createElement('canvas').getContext('2d');
    T = { ...linha, vejo: linha.vejo, mesmo: linha.mesmo_chale, data: linha.data, periodo: linha.periodo };
    layoutLegenda();
  }
  function caixas(c, t) { BOXES = []; frame(c, t); const out = BOXES; BOXES = null; return out; }
  window.REEL = { init, frame, caixas, get DURATION() { return LN.duracao; },
    legenda: () => PAGES.map((q) => ({ t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.w).join(' ')),
      palavras: Array.from({ length: q.b - q.a }, (_, i) => ({ w: q.words[q.a + i].w, t0: q.words[q.a + i].t0, chave: !!q.words[q.a + i].chave })) })) };
})();
