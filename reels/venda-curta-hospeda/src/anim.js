/*
 * FAZLO Hospeda — vídeo curto de venda (1080×1920, 60 fps), primeiro contato pelo WhatsApp.
 * As telas são SEMPRE a tela inteira do celular (telas/*.png, 1170×2532 = 390×844 a 3x), dentro de um aparelho.
 * O movimento vem da câmera (aproxima no ponto falado), do contorno limão, dos toques e das janelas que saltam da tela.
 * Todo o estado de um quadro é função do tempo: renderAt(ctx, t).
 */
(function () {
  'use strict';
  const W = 1080, H = 1920, IW = 1170, IH = 2532;
  const D = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const C = { bg: '#0A0A0A', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2', amber: '#FFB23F', ink: '#0A0A0A', bezel: '#141513' };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    out: (x) => 1 - Math.pow(1 - x, 3), in: (x) => x * x * x, io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    back: (x, s = 1.9) => (x <= 0 ? 0 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)),
    expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  };
  const TAU = Math.PI * 2;
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
  function font(c, fam, size, weight, ls = 0) { c.font = `${weight} ${size}px ${fam}`; c.letterSpacing = `${ls}px`; }
  function txt(c, s, x, y, o = {}) {
    font(c, o.fam || D, o.size || 60, o.weight || 900, o.ls || 0);
    const w = c.measureText(s).width, x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    c.save(); c.globalAlpha *= o.alpha ?? 1; c.fillStyle = o.color || C.white; c.textBaseline = 'alphabetic'; c.fillText(s, x0, y); c.restore();
    return w;
  }

  let IMG = {}, PLANO = null, DUR = 60, LOGO = null;

  // ------------------------------------------------------------------ fundo
  function fundo(c, t, tom) {
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    const gx = 540 + 220 * Math.sin(t * 0.35), gy = 880 + 180 * Math.cos(t * 0.28);
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, 980);
    g.addColorStop(0, rgba(tom || C.lime, 0.16)); g.addColorStop(1, rgba(tom || C.lime, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    const off = (t * 14) % 54;
    for (let y = -54 + off; y < H; y += 54) for (let x = 27; x < W; x += 54) { c.beginPath(); c.arc(x, y, 1.7, 0, TAU); c.fill(); }
  }

  // ------------------------------------------------------------------ o aparelho e a câmera
  // câmera: z (1 = celular inteiro), fx/fy = ponto da tela (px da imagem) que fica na âncora (ax, ay)
  const BASE = 1090 / IH;                                       // altura da tela inteira: 1090 px no vídeo
  const ANC = { x: 540, y: 750 };
  const PALCO = { y0: 140, y1: 1350 };                          // o celular vive aqui; embaixo fica a faixa da legenda
  function cam(s, t) {
    let cur = { z: 1, fx: IW / 2, fy: IH / 2 };
    for (const k of s.cam || []) {
      if (t < k.t) break;
      const u = E.io(p(t, k.t, k.t + (k.d || 0.55)));
      cur = { z: lerp(cur.z, k.z, u), fx: lerp(cur.fx, k.fx, u), fy: lerp(cur.fy, k.fy, u) };
    }
    return cur;
  }
  const mapa = (q, x, y) => { const k = BASE * q.z; return { x: ANC.x + (x - q.fx) * k + (q.dx || 0), y: ANC.y + (y - q.fy) * k + (q.dy || 0), k }; };
  function aparelho(c, s, t, q) {
    const a = mapa(q, 0, 0), k = a.k, w = IW * k, h = IH * k, pad = 15 * q.z, rad = 128 * k;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 60; c.shadowOffsetY = 24;
    rr(c, a.x - pad, a.y - pad, w + 2 * pad, h + 2 * pad, rad + pad); c.fillStyle = C.bezel; c.fill();
    c.shadowColor = 'transparent';
    rr(c, a.x - pad, a.y - pad, w + 2 * pad, h + 2 * pad, rad + pad); c.strokeStyle = '#3A3D37'; c.lineWidth = 2.5; c.stroke();
    c.save(); rr(c, a.x, a.y, w, h, rad); c.clip();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    // troca de estado da mesma tela (ex.: o valor contado sendo digitado): funde as imagens
    let img = IMG[s.img];
    c.drawImage(img, a.x, a.y, w, h);
    for (const e of s.estados || []) {
      const u = p(t, e.t, e.t + (e.d || 0.25));
      if (u > 0) { c.globalAlpha = u; c.drawImage(IMG[e.img], a.x, a.y, w, h); c.globalAlpha = 1; }
    }
    // contornos
    for (const r of s.aneis || []) anel(c, q, r, t, a);
    c.restore();
    // toques
    for (const tq of s.toques || []) toque(c, q, tq, t);
    c.restore();
  }
  function anel(c, q, r, t, a) {
    if (t < r.t || t > (r.ate ?? 1e9) + 0.3) return;
    const u = E.out(p(t, r.t, r.t + 0.4)), sai = r.ate != null ? p(t, r.ate, r.ate + 0.3) : 0;
    const [x0, y0, x1, y1] = r.ret, A = mapa(q, x0, y0), B = mapa(q, x1, y1), pad = 10;
    const cor = r.cor === 'ambar' ? C.amber : C.lime;
    c.save(); c.globalAlpha *= 1 - sai;
    c.beginPath(); c.rect(a.x - 50, a.y - 50, IW * a.k + 100, IH * a.k + 100); c.roundRect(A.x - pad, A.y - pad, B.x - A.x + 2 * pad, B.y - A.y + 2 * pad, 18);
    c.fillStyle = `rgba(10,10,10,${0.5 * u})`; c.fill('evenodd');
    const per = 2 * (B.x - A.x + B.y - A.y + 4 * pad);
    rr(c, A.x - pad, A.y - pad, B.x - A.x + 2 * pad, B.y - A.y + 2 * pad, 18);
    c.setLineDash([per * u, per]); c.strokeStyle = cor; c.lineWidth = 7; c.shadowColor = cor; c.shadowBlur = 22; c.stroke();
    c.restore();
  }
  function toque(c, q, tq, t) {
    const d = t - tq.t; if (d < -0.15 || d > 0.6) return;
    const P = mapa(q, tq.x, tq.y);
    const ap = clamp((d + 0.15) / 0.15), r = 34 + 70 * E.out(clamp(d / 0.6));
    c.save();
    c.globalAlpha = d < 0 ? ap : 1 - clamp(d / 0.6);
    c.beginPath(); c.arc(P.x, P.y, d < 0 ? 34 : 30, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
    c.strokeStyle = 'rgba(10,10,10,0.5)'; c.lineWidth = 3; c.stroke();
    if (d >= 0) { c.beginPath(); c.arc(P.x, P.y, r, 0, TAU); c.strokeStyle = C.lime; c.lineWidth = 6; c.stroke(); }
    c.restore();
  }
  // janela que salta da tela: o pedaço da própria tela, ampliado, com borda limão (ou âmbar)
  function salto(c, s, t, q, j) {
    if (t < j.t || t > j.ate + 0.4) return;
    const ent = E.back(p(t, j.t, j.t + 0.5)), sai = E.in(p(t, j.ate, j.ate + 0.35));
    const u = clamp(ent * (1 - sai), 0, 1.2);
    const [x0, y0, x1, y1] = j.ret, A = mapa(q, x0, y0), B = mapa(q, x1, y1);
    const larg = j.larg || 940, alt = larg * (y1 - y0) / (x1 - x0), cx = 540, cy = j.cy || 760;
    const x = lerp(A.x, cx - larg / 2, u), y = lerp(A.y, cy - alt / 2, u), w = lerp(B.x - A.x, larg, u), h = lerp(B.y - A.y, alt, u);
    const cor = j.cor === 'ambar' ? C.amber : C.lime;
    c.save();
    c.fillStyle = `rgba(10,10,10,${0.55 * clamp(u)})`; c.fillRect(0, 0, W, H);
    c.translate(x + w / 2, y + h / 2); c.rotate((j.giro || -1.2) * Math.PI / 180 * clamp(u)); c.translate(-(x + w / 2), -(y + h / 2));
    c.shadowColor = 'rgba(0,0,0,0.65)'; c.shadowBlur = 50; c.shadowOffsetY = 20;
    rr(c, x, y, w, h, 26); c.fillStyle = '#fff'; c.fill(); c.shadowColor = 'transparent';
    c.save(); rr(c, x, y, w, h, 26); c.clip(); c.imageSmoothingQuality = 'high';
    c.drawImage(IMG[j.img || s.img], x0, y0, x1 - x0, y1 - y0, x, y, w, h); c.restore();
    rr(c, x, y, w, h, 26); c.strokeStyle = cor; c.lineWidth = 8; c.shadowColor = cor; c.shadowBlur = 30 * clamp(u); c.stroke();
    c.restore();
  }
  function tela(c, s, t) {
    if (t < s.t0 || t >= s.t1) return;
    const q = cam(s, t);
    // entrada e saída: desliza e gira de leve (ritmo rápido)
    const ue = E.out(p(t, s.t0, s.t0 + 0.42)), us = E.in(p(t, s.t1 - 0.32, s.t1));
    q.dx = (s.de === 'baixo' ? 0 : 1100 * (1 - ue)) - 1100 * us;
    q.dy = (s.de === 'baixo' ? 1500 * (1 - ue) : 0);
    c.save();
    c.beginPath(); c.rect(0, PALCO.y0, W, PALCO.y1 - PALCO.y0); c.clip();
    const ang = (1 - ue) * 4 - us * 4;
    c.translate(540, 900); c.rotate(ang * Math.PI / 180); c.translate(-540, -900);
    aparelho(c, s, t, q);
    c.restore();
    // bordas suaves do palco quando a câmera aproxima (o celular continua, a câmera é que está perto)
    if (q.z > 1.02) {
      const a = clamp((q.z - 1) / 0.3);
      for (const [y0, y1] of [[PALCO.y0, PALCO.y0 + 90], [PALCO.y1, PALCO.y1 - 90]]) {
        const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgba(C.bg, a)); g.addColorStop(1, rgba(C.bg, 0));
        c.fillStyle = g; c.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
      }
    }
    for (const j of s.saltos || []) salto(c, s, t, q, j);
  }

  // ------------------------------------------------------------------ cenas sem tela
  function gancho(c, t, g) {
    if (t < g.t0 || t >= g.t1) return;
    const sai = E.in(p(t, g.t1 - 0.3, g.t1));
    c.save(); c.globalAlpha = 1 - sai;
    // duas reservas do mesmo chalé caem uma sobre a outra
    const cards = [['WhatsApp', 'Chalé 05 · 23 a 26/11', -1, g.t0 + 0.05, 640], ['Airbnb', 'Chalé 05 · 23 a 26/11', 1, g.t0 + 0.5, 860]];
    const choque = g.t0 + 0.85, tre = t > choque ? Math.exp(-(t - choque) * 6) * Math.sin((t - choque) * 70) * 14 : 0;
    cards.forEach(([canal, s, lado, t0, y], i) => {
      const u = E.back(p(t, t0, t0 + 0.5)), x = 540 + lado * lerp(900, 0, u) + (i ? tre : -tre), r = lado * lerp(14, 3, u);
      c.save(); c.translate(x, y); c.rotate(r * Math.PI / 180);
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
      rr(c, -400, -110, 800, 220, 32); c.fillStyle = '#FFFFFF'; c.fill(); c.shadowColor = 'transparent';
      rr(c, -360, -76, 250, 62, 31); c.fillStyle = C.ink; c.fill();
      txt(c, canal, -235, -33, { size: 36, weight: 800, align: 'center', color: C.lime });
      txt(c, s, -360, 72, { size: 60, weight: 900, color: C.ink, ls: -1 });
      c.restore();
    });
    const tb = g.t0 + 0.9, ub = E.back(p(t, tb, tb + 0.35), 3);
    if (ub > 0) {
      c.save(); c.translate(860, 520); c.scale(ub, ub); c.rotate(-0.15);
      c.beginPath(); c.arc(0, 0, 92, 0, TAU); c.fillStyle = C.amber; c.fill();
      txt(c, '2×', 0, 26, { size: 80, weight: 900, align: 'center', color: C.ink });
      c.restore();
    }
    c.restore();
  }
  function marca(c, t, m) {
    if (t < m.t0 || t >= m.t1) return;
    const u = E.back(p(t, m.t0, m.t0 + 0.6)), sai = E.in(p(t, m.t1 - 0.3, m.t1));
    c.save(); c.globalAlpha = 1 - sai; c.translate(540, m.y || 760); c.scale(u, u);
    const w = 620, h = w * LOGO.height / LOGO.width; c.drawImage(LOGO, -w / 2, -h / 2, w, h);
    c.restore();
  }

  // ------------------------------------------------------------------ legenda (palavra por palavra)
  function legenda(c, t) {
    const pg = (PLANO.legenda || []).find((g) => t >= g.t0 && t < g.t1);
    if (!pg) return;
    const size = 66, lh = 78, maxW = 900;
    font(c, D, size, 900, -1.2);
    const linhas = [[]]; let lw = 0;
    for (const w of pg.palavras) {
      const ww = c.measureText(w.w + ' ').width;
      if (lw + ww > maxW && linhas[linhas.length - 1].length) { linhas.push([]); lw = 0; }
      linhas[linhas.length - 1].push({ ...w, ww }); lw += ww;
    }
    const y0 = 1470 - (linhas.length - 1) * lh / 2;
    linhas.forEach((ln, i) => {
      const tot = ln.reduce((a, w) => a + w.ww, 0) - c.measureText(' ').width;
      let x = 540 - tot / 2;
      for (const w of ln) {
        const u = E.out(p(t, w.t - 0.04, w.t + 0.14));
        c.save(); c.globalAlpha = u; c.translate(0, (1 - u) * 14);
        c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 18;
        txt(c, w.w, x, y0 + i * lh, { size, weight: 900, ls: -1.2, color: w.chave ? C.lime : C.white });
        c.restore(); x += w.ww;
      }
    });
  }

  function frame(c, t) {
    fundo(c, t, PLANO.tom && PLANO.tom(t));
    for (const g of PLANO.ganchos || []) gancho(c, t, g);
    for (const s of PLANO.telas) tela(c, s, t);
    for (const m of PLANO.marcas || []) marca(c, t, m);
    legenda(c, t);
  }
  window.CURTO = {
    init(imgs, logo, plano) { IMG = imgs; LOGO = logo; PLANO = plano; DUR = plano.duracao; },
    renderAt(c, t) { frame(c, Math.min(Math.max(t, 0), DUR - 1e-4)); },
    get DURATION() { return DUR; },
  };
})();
