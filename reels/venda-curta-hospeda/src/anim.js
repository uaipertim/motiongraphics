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
    const tin = s.t0 - 0.25;
    if (t < tin || t >= s.t1) return;
    const q = cam(s, t);
    // entrada e saída: desliza e gira de leve; a tela seguinte entra enquanto a anterior sai (empurra)
    const ue = E.out(p(t, tin, tin + 0.45)), us = E.in(p(t, s.t1 - 0.3, s.t1));
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
    const saiT = E.in(p(t, s.t1 - 0.3, s.t1));
    for (const e of s.selos || []) seloLink(c, t, e, saiT);
    for (const e of s.notas || []) nota(c, t, e, e.ate ? Math.max(saiT, E.in(p(t, e.ate, e.ate + 0.3))) : saiT);   // ate: a nota sai antes da cena
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
      const u = E.back(p(t, t0, t0 + 0.5)), x = 540 + lado * lerp(110, 0, u) + (i ? tre : -tre), r = lado * lerp(10, 3, u);
      c.save(); c.translate(x, y); c.rotate(r * Math.PI / 180);
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
      rr(c, -400, -110, 800, 220, 32); c.fillStyle = '#FFFFFF'; c.fill(); c.shadowColor = 'transparent';
      rr(c, -360, -76, 250, 62, 31); c.fillStyle = C.ink; c.fill();
      txt(c, canal, -235, -33, { size: 36, weight: 800, align: 'center', color: C.lime });
      txt(c, s, -360, 72, { size: 60, weight: 900, color: C.ink, ls: -1 });
      c.restore();
    });
    // a pergunta grande no alto desde o quadro 0 (é a miniatura no WhatsApp)
    const pz = 1 + 0.02 * Math.sin(t * 6);
    c.save(); c.translate(540, 330); c.scale(pz, pz);
    txt(c, 'Vendeu o mesmo', 0, 0, { size: 104, weight: 900, align: 'center', ls: -3 });
    txt(c, 'chalé duas vezes?', 0, 118, { size: 104, weight: 900, align: 'center', ls: -3, color: C.lime });
    c.restore();
    const tb = g.t0 + 0.9, ub = E.back(p(t, tb, tb + 0.35), 3);
    if (ub > 0) {
      c.save(); c.translate(900, 610); c.scale(ub, ub); c.rotate(-0.15);
      c.beginPath(); c.arc(0, 0, 92, 0, TAU); c.fillStyle = C.amber; c.fill();
      txt(c, '2×', 0, 26, { size: 80, weight: 900, align: 'center', color: C.ink });
      c.restore();
    }
    c.restore();
  }
  function chipCanal(c, x, y, nome, cor, esc, giro) {
    font(c, D, 46, 900, -0.5); const w = c.measureText(nome).width + 64;
    c.save(); c.translate(x, y); c.rotate(giro); c.scale(esc, esc);
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    rr(c, -w / 2, -42, w, 84, 42); c.fillStyle = cor; c.fill(); c.shadowColor = 'transparent';
    txt(c, nome, 0, 16, { size: 46, weight: 900, align: 'center', color: cor === C.ink ? C.white : C.ink, ls: -0.5 });
    c.restore();
  }
  function caderno(c, x, y, esc, giro) {
    c.save(); c.translate(x, y); c.rotate(giro); c.scale(esc, esc);
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    rr(c, -120, -150, 240, 300, 18); c.fillStyle = '#F1EDE2'; c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#C9C2AE'; for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(-120, -120 + k * 40, 9, 0, TAU); c.fill(); }
    c.strokeStyle = '#B8B09A'; c.lineWidth = 3; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-85, -95 + k * 40); c.lineTo(95, -95 + k * 40); c.stroke(); }
    c.strokeStyle = '#3A5BD9'; c.lineWidth = 6; c.lineCap = 'round';
    [[-70, -105, 60], [-70, -65, 30], [-70, -25, 75], [-70, 15, 45]].forEach(([a, b, w]) => { c.beginPath(); c.moveTo(a, b); c.bezierCurveTo(a + w * 0.3, b - 10, a + w * 0.6, b + 10, a + w + 40, b - 4); c.stroke(); });
    c.strokeStyle = '#D9402F'; c.lineWidth = 7; c.beginPath(); c.moveTo(-80, 60); c.lineTo(80, 120); c.moveTo(80, 60); c.lineTo(-80, 120); c.stroke();
    c.restore();
  }
  function caos(c, t, g) {
    if (!g || t < g.t0 || t >= g.t1) return;
    const sai = E.in(p(t, g.t1 - 0.35, g.t1));
    c.save(); c.globalAlpha = 1 - sai;
    // a reserva no meio, e tudo caindo em volta dela
    const tre = Math.sin(t * 40) * 5 * clamp((t - g.whats) / 0.5) * (1 - sai);
    c.save(); c.translate(540 + tre, 760);
    rr(c, -400, -110, 800, 220, 32); c.fillStyle = '#FFFFFF'; c.fill();
    txt(c, 'Chalé 05 · 23 a 26/11', -360, 22, { size: 60, weight: 900, color: C.ink, ls: -1 });
    c.restore();
    const itens = [[g.whats, 'WhatsApp', '#25D366', 250, 470, -0.12], [g.airbnb, 'Airbnb', '#FF5A5F', 820, 1000, 0.1], [g.booking, 'Booking', '#1E5BD9', 290, 1060, 0.08]];
    itens.forEach(([t0, nome, cor, x, y, giro], i) => {
      const u = E.back(p(t, t0 - 0.05, t0 + 0.4), 2.4); if (u <= 0) return;
      const fl = Math.sin(t * 2.2 + i) * 10;
      chipCanal(c, x, lerp(y - 500, y, clamp(u)) + fl, nome, cor, clamp(u, 0, 1.3), giro + Math.sin(t * 1.7 + i) * 0.04);
    });
    const uc = E.back(p(t, g.caderno - 0.1, g.caderno + 0.4), 2);
    if (uc > 0) caderno(c, 830, lerp(-300, 470, clamp(uc)) + Math.sin(t * 2) * 8, 0.9 * clamp(uc, 0, 1.2), 0.14);
    c.restore();
  }
  function gaveta(c, t, g) {
    if (!g || t < g.t0 || t >= g.t1) return;
    const u = E.back(p(t, g.t0, g.t0 + 0.5)), sai = E.in(p(t, g.t1 - 0.3, g.t1));
    c.save(); c.globalAlpha = 1 - sai; c.translate(540, 800); c.scale(u, u);
    rr(c, -380, -260, 760, 520, 40); c.fillStyle = '#1B1C1A'; c.fill(); c.strokeStyle = '#34372F'; c.lineWidth = 4; c.stroke();
    txt(c, 'CAIXA DO DIA', 0, -150, { fam: MONO, size: 40, weight: 700, align: 'center', color: C.gray, ls: 6 });
    const pis = 0.55 + 0.45 * Math.abs(Math.sin(t * 9));
    const v = t < g.ninguem ? 'R$ ' + (100 + Math.floor((t * 37) % 900)) + ',00' : 'R$ ???';
    txt(c, v, 0, 30, { fam: MONO, size: 130, weight: 700, align: 'center', color: t < g.ninguem ? C.white : C.amber, alpha: t < g.ninguem ? 1 : pis });
    // a gaveta abrindo
    const ab = E.out(p(t, g.entrou, g.entrou + 0.4));
    rr(c, -330, 120 + 70 * ab, 660, 110, 22); c.fillStyle = '#2A2C27'; c.fill();
    rr(c, -70, 160 + 70 * ab, 140, 22, 11); c.fillStyle = '#4A4D45'; c.fill();
    c.restore();
  }
  function nome(c, x, y, esc = 1) {                            // "FAZLO" branco + pílula limão "Hospeda", como no logo da marca
    c.save(); c.translate(x, y); c.scale(esc, esc);
    font(c, D, 112, 900, -2); const wf = c.measureText('FAZLO').width;
    font(c, D, 62, 800, -0.5); const wh = c.measureText('Hospeda').width;
    const pw = wh + 64, tot = wf + 26 + pw, x0 = -tot / 2;
    txt(c, 'FAZLO', x0, 40, { size: 112, weight: 900, ls: -2 });
    rr(c, x0 + wf + 26, -46, pw, 96, 48); c.fillStyle = C.lime; c.fill();
    txt(c, 'Hospeda', x0 + wf + 26 + pw / 2, 22, { size: 62, weight: 800, align: 'center', color: C.ink, ls: -0.5 });
    c.restore();
  }
  function logo(c, x, y, w, a = 1) { const h = w * LOGO.height / LOGO.width; c.save(); c.globalAlpha *= a; c.drawImage(LOGO, x - w / 2, y - h / 2, w, h); c.restore(); }
  // Cena da marca. Os selos ficam SEMPRE fora de uma área livre em volta do logo (símbolo e nome "FAZLO Hospeda"):
  // entram já em volta dele, chegam mais perto em "num lugar só" sem encostar e somem no lugar onde estão.
  const SELOS = [  // [nome, cor, perto (x, y), longe (x, y)]
    ['WhatsApp', '#25D366', [205, 480], [210, 400]],
    ['Airbnb', '#FF5A5F', [875, 480], [870, 400]],
    ['Booking', '#1E5BD9', [540, 1255], [540, 1330]],
  ];
  function geoMarca(t, m) {
    const u = E.back(p(t, m.fazlo - 0.1, m.fazlo + 0.45), 2.2);
    font(M2, D, 112, 900, -2); const wf = M2.measureText('FAZLO').width;
    font(M2, D, 62, 800, -0.5); const tot = wf + 26 + M2.measureText('Hospeda').width + 64;
    const logo = u > 0 ? [
      { tipo: 'circulo', cx: 540, cy: 760 - 120 * u, r: 180 * u },
      { tipo: 'ret', x0: 540 - tot / 2 * u, y0: 760 + (170 - 50) * u, x1: 540 + tot / 2 * u, y1: 760 + (170 + 50) * u },
    ] : [];
    const uk = t >= m.lugar + 0.6 ? E.back(p(t, m.lugar + 0.6, m.lugar + 0.95), 3) : 0;
    if (uk > 0) logo.push({ tipo: 'circulo', cx: 540, cy: 1110, r: 58 * uk });
    const ent = E.back(p(t, m.t0, m.t0 + 0.4), 2), perto = E.io(p(t, m.lugar - 0.25, m.lugar + 0.25)), some = E.in(p(t, m.lugar + 0.3, m.lugar + 0.6));
    const selos = SELOS.map(([nome, cor, P, L], k) => {
      font(M2, D, 46, 900, -0.5); const w = M2.measureText(nome).width + 64;
      const esc = 0.9 * clamp(ent, 0, 1.15) * (1 - some), fl = 8 * Math.sin(t * 2.4 + k * 2);
      const x = lerp(L[0], P[0], perto), y = lerp(L[1], P[1], perto) + fl * (1 - perto);
      return { nome, cor, x, y, esc, x0: x - w / 2 * esc, x1: x + w / 2 * esc, y0: y - 42 * esc, y1: y + 42 * esc };
    }).filter((q) => q.esc > 0.005);
    return { u, uk, logo, selos };
  }
  function folga(g) {                                            // menor distância (px) entre um selo e o logo
    let min = 1e9;
    for (const q of g.selos) for (const L of g.logo) {
      let d;
      if (L.tipo === 'circulo') { const dx = Math.max(q.x0 - L.cx, 0, L.cx - q.x1), dy = Math.max(q.y0 - L.cy, 0, L.cy - q.y1); d = Math.hypot(dx, dy) - L.r; }
      else { const dx = Math.max(q.x0 - L.x1, 0, L.x0 - q.x1), dy = Math.max(q.y0 - L.y1, 0, L.y0 - q.y1); d = Math.hypot(dx, dy); }
      min = Math.min(min, d);
    }
    return min;
  }
  let M2 = null;
  function marcaCena(c, t, m) {
    if (!m || t < m.t0 || t >= m.t1) return;
    M2 = M2 || document.createElement('canvas').getContext('2d');
    const sai = E.in(p(t, m.t1 - 0.3, m.t1)), g = geoMarca(t, m);
    c.save(); c.globalAlpha = 1 - sai;
    // anel de impacto
    const ui = p(t, m.fazlo - 0.05, m.fazlo + 0.6);
    if (ui > 0 && ui < 1) { c.beginPath(); c.arc(540, 760, 120 + 620 * E.out(ui), 0, TAU); c.strokeStyle = rgba(C.lime, 1 - ui); c.lineWidth = 26 * (1 - ui); c.stroke(); }
    for (const q of g.selos) chipCanal(c, q.x, q.y, q.nome, q.cor, q.esc, 0);
    if (g.u > 0) { c.save(); c.translate(540, 760); c.scale(g.u, g.u); logo(c, 0, -120, 360); nome(c, 0, 170, 1); c.restore(); }
    if (g.uk > 0) { c.save(); c.translate(540, 1110); c.scale(g.uk, g.uk);
      c.beginPath(); c.arc(0, 0, 58, 0, TAU); c.fillStyle = C.lime; c.fill();
      c.strokeStyle = C.ink; c.lineWidth = 12; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-24, 2); c.lineTo(-6, 20); c.lineTo(26, -16); c.stroke(); c.restore(); }
    c.restore();
  }
  function fechoCena(c, t, f) {
    if (!f || t < f.t0) return;
    const u = E.back(p(t, f.t0, f.t0 + 0.55), 2);
    // a chamada final (só na tela, sem voz): as linhas da oferta saem, a logo desce e a chamada entra ACIMA da logo
    const uc = f.chamada != null ? E.io(p(t, f.chamada, f.chamada + 0.45)) : 0, sl = 1 - p(t, f.chamada ?? 1e9, (f.chamada ?? 1e9) + 0.25);
    const ly = lerp(520, 1010, uc), le = lerp(1, 0.85, uc);
    // pulso no ritmo da trilha (120 BPM) e um anel limão a cada compasso: o fecho nunca fica parado
    const bt = Math.max(0, t - f.t0), pulso = 1 + 0.018 * Math.exp(-((bt % 0.5) / 0.12));
    const ua2 = (bt % 2) / 2, ry = ly - 110 * le;
    if (bt > 0.6) { c.beginPath(); c.arc(540, ry, (150 + 100 * E.out(ua2)) * le, 0, TAU); c.strokeStyle = rgba(C.lime, 0.35 * (1 - ua2)); c.lineWidth = 6; c.stroke(); }
    c.save(); c.translate(540, ly); const es = clamp(u, 0, 1.2) * pulso * le; c.scale(es, es); logo(c, 0, -110, 300); nome(c, 0, 150, 0.95); c.restore();
    const linha = (s2, y, t0, cor, size, a = 1) => {
      const v = E.back(p(t, t0, t0 + 0.4), 2); if (v <= 0 || a <= 0) return;
      font(c, D, size, 900, -1.5); const w = c.measureText(s2).width, sz = w > 960 ? size * 960 / w : size;
      c.save(); c.globalAlpha = a; c.translate(540, y); c.scale(v, v); txt(c, s2, 0, 0, { size: sz, weight: 900, align: 'center', color: cor, ls: -1.5 }); c.restore();
    };
    linha('30 dias para testar', 930, f.teste, C.lime, 96, sl);
    linha('e a FAZLO configura', 1060, f.configura - 0.05, C.white, 74, sl);
    linha('tudo para você.', 1150, f.configura + 0.35, C.white, 74, sl);
    if (f.chamada != null) {
      linha('Quer ver funcionando?', 560, f.chamada + 0.35, C.white, 90);   // só depois de a logo passar: nada encosta nela
      linha('É só responder esta conversa.', 675, f.chamada + 0.5, C.lime, 68);
    }
    const ua = E.out(p(t, f.arroba, f.arroba + 0.5));
    if (ua > 0) txt(c, '@fazlohospeda', 540, 1300, { fam: MONO, size: 46, weight: 700, align: 'center', color: C.gray, alpha: ua });
  }
  // selo sobre a tela (ex.: "Link de calendário"): pílula limão com o ícone de corrente
  function seloLink(c, t, e, sai) {
    const u = E.back(p(t, e.t, e.t + 0.45), 2.2); if (u <= 0) return;
    const pul = (e.pulsos || []).reduce((a, tp) => a + 0.1 * Math.exp(-Math.pow((t - tp - 0.15) / 0.12, 2)), 0);
    font(c, D, 52, 900, -1); const tw = c.measureText(e.texto).width, w = tw + 150, h = 100;
    c.save(); c.globalAlpha = 1 - sai; c.translate(540, e.y); c.scale(clamp(u, 0, 1.2) * (1 + pul), clamp(u, 0, 1.2) * (1 + pul)); c.rotate(-0.025);
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 36; c.shadowOffsetY = 14; rr(c, -w / 2, -h / 2, w, h, h / 2); c.fillStyle = C.lime; c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = C.ink; c.lineWidth = 7; c.lineCap = 'round'; const ix = -w / 2 + 62;
    c.save(); c.translate(ix, 0); c.rotate(-Math.PI / 4); rr(c, -26, -11, 30, 22, 11); c.stroke(); rr(c, -4, -11, 30, 22, 11); c.stroke(); c.restore();
    txt(c, e.texto, -w / 2 + 104, 18, { size: 52, weight: 900, color: C.ink, ls: -1 }); c.restore();
  }
  // nota sobre a tela (ex.: "O Hospeda confere os canais a cada 30 min"): cartão escuro com relógio limão
  function nota(c, t, e, sai) {                                  // até 2 linhas (\n), letra grande: legível até em 360 px
    const u = E.back(p(t, e.t, e.t + 0.45), 2); if (u <= 0) return;
    const linhas = e.texto.split('\n'), size = 54, lh = 64;
    font(c, D, size, 800, -0.5); const tw = Math.max(...linhas.map((l) => c.measureText(l).width)), w = tw + 150, h = 44 + lh * linhas.length;
    c.save(); c.globalAlpha = 1 - sai; c.translate(540, e.y + 30 * (1 - clamp(u))); c.scale(clamp(u, 0, 1.15), clamp(u, 0, 1.15));
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 36; c.shadowOffsetY = 14; rr(c, -w / 2, -h / 2, w, h, 32); c.fillStyle = '#141513'; c.fill(); c.shadowColor = 'transparent';
    rr(c, -w / 2, -h / 2, w, h, 32); c.strokeStyle = C.lime; c.lineWidth = 4; c.stroke();
    const ix = -w / 2 + 62; c.beginPath(); c.arc(ix, 0, 26, 0, TAU); c.strokeStyle = C.lime; c.lineWidth = 6; c.stroke();
    c.beginPath(); c.moveTo(ix, -14); c.lineTo(ix, 0); c.lineTo(ix + 12, 8); c.lineCap = 'round'; c.stroke();
    linhas.forEach((l, k) => txt(c, l, -w / 2 + 112, -h / 2 + 22 + lh * k + size * 0.86, { size, weight: 800, color: k ? C.lime : C.white, ls: -0.5 }));
    c.restore();
  }


  function marca(c, t, m) {
    if (t < m.t0 || t >= m.t1) return;
    const u = E.back(p(t, m.t0, m.t0 + 0.6)), sai = E.in(p(t, m.t1 - 0.3, m.t1));
    c.save(); c.globalAlpha = 1 - sai; c.translate(540, m.y || 760); c.scale(u, u);
    const w = 620, h = w * LOGO.height / LOGO.width; c.drawImage(LOGO, -w / 2, -h / 2, w, h);
    c.restore();
  }

  // ------------------------------------------------------------------ capa embutida (quadro 0 = miniatura do WhatsApp)
  // O quadro 0 é a capa completa. Do quadro 1 em diante os elementos já saem animados e revelam a abertura original;
  // em 0,6 s a capa sumiu. Nada é acrescentado nem congelado: a capa fica POR CIMA do início que já existe.
  const CAPA_FIM = 0.6;
  function capaCena(c, t, k) {
    if (!k || t >= CAPA_FIM) return;
    const u = E.out(p(t, 0, CAPA_FIM)), a = 1 - u;                // u = 0 no quadro 0; já ~0,08 no quadro 1
    // fundo das capas: tom escuro, grade de pontinhos, vinheta e brilho limão atrás do celular
    c.save(); c.globalAlpha = a;
    let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0A1714'); g.addColorStop(1, '#060707'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 12; y < H; y += 24) for (let x = 12; x < W; x += 24) c.fillRect(x - 1, y - 1, 2, 2);
    g = c.createRadialGradient(540, 1120, 40, 540, 1120, 620); g.addColorStop(0, 'rgba(175,250,39,0.22)'); g.addColorStop(1, 'rgba(175,250,39,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(540, 960, 420, 540, 960, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.restore();
    const L = k.layout;
    // logo em destaque: símbolo + "FAZLO" e a pílula "Hospeda"
    c.save(); c.globalAlpha = a; c.translate(540, L.logoY - 220 * u); c.scale(1 - 0.5 * u, 1 - 0.5 * u);
    M2 = M2 || document.createElement('canvas').getContext('2d');
    font(M2, D, 112, 900, -2); const wf = M2.measureText('FAZLO').width; font(M2, D, 62, 800, -0.5); const wn = (wf + 26 + M2.measureText('Hospeda').width + 64) * 0.8;
    const sw = 118, tot = sw + 26 + wn, x0 = -tot / 2;
    logo(c, x0 + sw / 2, 0, sw); nome(c, x0 + sw + 26 + wn / 2, -2, 0.8);
    c.restore();
    // título grande, a palavra-chave em limão
    k.titulo.forEach((linha, i) => {
      const y = L.tituloY + i * L.entre - 320 * u;
      font(c, D, L.corpo, 900, -0.03 * L.corpo); const larg = linha.reduce((s2, [tx]) => s2 + c.measureText(tx).width, 0); let x = 540 - larg / 2;
      for (const [tx, cor] of linha) {
        c.save(); c.globalAlpha = a; if (cor === 'lime') { c.shadowColor = 'rgba(175,250,39,0.5)'; c.shadowBlur = 30; }
        txt(c, tx, x, y, { size: L.corpo, weight: 900, ls: -0.03 * L.corpo, color: cor === 'lime' ? C.lime : C.white }); c.restore();
        font(c, D, L.corpo, 900, -0.03 * L.corpo); x += c.measureText(tx).width;
      }
    });
    // o celular com a tela inteira (encolhe e desce em direção à primeira cena)
    const ch = L.celAlt, kk = ch / IH, cw = IW * kk, es = 1 - 0.45 * u;
    c.save(); c.globalAlpha = a; c.translate(540, L.celTopo + ch / 2 + 380 * u); c.scale(es, es);
    const x0c = -cw / 2, y0c = -ch / 2, pad = 11, rad = 128 * kk;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 50; c.shadowOffsetY = 20; rr(c, x0c - pad, y0c - pad, cw + 2 * pad, ch + 2 * pad, rad + pad); c.fillStyle = C.bezel; c.fill(); c.restore();
    rr(c, x0c - pad, y0c - pad, cw + 2 * pad, ch + 2 * pad, rad + pad); c.strokeStyle = '#3A3D37'; c.lineWidth = 2.5; c.stroke();
    c.save(); rr(c, x0c, y0c, cw, ch, rad); c.clip(); c.imageSmoothingQuality = 'high'; c.drawImage(IMG[k.img], x0c, y0c, cw, ch); c.restore();
    c.restore();
    // os selos dos canais em volta do celular, sem encostar em nada (saem para fora)
    for (const [nm, cor, x, y, lado] of L.selos) chipCanal(c, x + lado * 560 * u, y, nm, cor, 0.85 * (1 - 0.3 * u), 0);
    c.globalAlpha = 1;
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
    caos(c, t, PLANO.caos); gaveta(c, t, PLANO.gaveta); marcaCena(c, t, PLANO.marca);
    for (const s of PLANO.telas) tela(c, s, t);
    for (const m of PLANO.marcas || []) marca(c, t, m);
    fechoCena(c, t, PLANO.fecho);
    legenda(c, t);
    capaCena(c, t, PLANO.capa);
  }
  function eventos() {
    const ev = [], P = PLANO;
    (P.ganchos || []).forEach((g) => { ev.push({ t: g.t0 + 0.3, tipo: 'whoosh' }, { t: g.t0 + 0.75, tipo: 'whoosh' }, { t: g.t0 + 0.85, tipo: 'impacto' }, { t: g.t0 + 0.95, tipo: 'pop' }); });
    if (P.caos) ['whats', 'airbnb', 'booking', 'caderno'].forEach((k) => ev.push({ t: P.caos[k], tipo: 'pop' }));
    if (P.gaveta) ev.push({ t: P.gaveta.t0, tipo: 'whoosh' }, { t: P.gaveta.ninguem, tipo: 'erro' }, { t: P.gaveta.entrou, tipo: 'gaveta' });
    if (P.marca) ev.push({ t: P.marca.fazlo - 0.05, tipo: 'impacto' }, { t: P.marca.lugar + 0.4, tipo: 'check' }, { t: P.marca.lugar - 0.2, tipo: 'suga' });
    for (const s of P.telas) {
      ev.push({ t: s.t0 - 0.25, tipo: 'whoosh' });
      (s.cam || []).forEach((k) => { if ((k.d || 0) > 0.1 && k.z > 1) ev.push({ t: k.t, tipo: 'zoom' }); });
      (s.aneis || []).forEach((r) => ev.push({ t: r.t + 0.05, tipo: 'tick' }));
      (s.saltos || []).forEach((j) => ev.push({ t: j.t, tipo: 'pop' }, { t: j.ate, tipo: 'volta' }));
      (s.toques || []).forEach((q) => ev.push({ t: q.t, tipo: 'toque' }));
      (s.estados || []).forEach((e) => ev.push({ t: e.t, tipo: 'desliza' }));
      (s.selos || []).forEach((e) => ev.push({ t: e.t, tipo: 'pop' }));
      (s.notas || []).forEach((e) => ev.push({ t: e.t, tipo: 'pop' }));
    }
    if (P.fecho) ev.push({ t: P.fecho.t0, tipo: 'impacto' }, { t: P.fecho.teste, tipo: 'check' }, { t: P.fecho.configura, tipo: 'pop' }, { t: P.fecho.arroba, tipo: 'sino' },
      ...(P.fecho.chamada != null ? [{ t: P.fecho.chamada + 0.35, tipo: 'pop' }] : []));
    return ev.sort((a, b) => a.t - b.t);
  }
  window.CURTO = {
    eventos: () => eventos(),
    marca: (t) => { M2 = M2 || document.createElement('canvas').getContext('2d'); const g = geoMarca(t, PLANO.marca); return { folga: folga(g), selos: g.selos.map((q) => [q.nome, q.x0, q.y0, q.x1, q.y1]), logo: g.logo }; },
    marcaT: () => [PLANO.marca.t0, PLANO.marca.t1, PLANO.marca.lugar],
    plano: () => ({ telas: PLANO.telas.map((s) => ({ img: s.img, t0: s.t0, t1: s.t1, focos: [...(s.aneis || []).map((r) => r.t), ...(s.saltos || []).map((j) => j.t)] })), legenda: PLANO.legenda.map((g) => ({ t0: g.t0, t1: g.t1, texto: g.palavras.map((w) => w.w).join(' ') })) }),
    init(imgs, logo, plano) { IMG = imgs; LOGO = logo; PLANO = plano; DUR = plano.duracao; },
    renderAt(c, t) { frame(c, Math.min(Math.max(t, 0), DUR - 1e-4)); },
    get DURATION() { return DUR; },
  };
})();
