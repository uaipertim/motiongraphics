/*
 * FAZLO Hospeda na prática, episódio 3: Chalés e quartos (1080×1920, 60 fps).
 * Mesmo motor do vídeo curto de venda (reels/venda-curta-hospeda), com estados que deslizam e a digitação nos campos.
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
    // a tela sempre preenche o palco: o foco nunca deixa a borda do celular entrar no palco; na horizontal fica no centro
    const kk = BASE * cur.z, lo = (ANC.y - PALCO.y0) / kk, hi = IH - (PALCO.y1 - ANC.y) / kk;
    cur.fy = lo < hi ? clamp(cur.fy, lo, hi) : IH / 2; cur.fx = IW / 2;
    return cur;
  }
  const mapa = (q, x, y) => { const k = BASE * q.z; return { x: (q.ax ?? ANC.x) + (x - q.fx) * k + (q.dx || 0), y: (q.ay ?? ANC.y) + (y - q.fy) * k + (q.dy || 0), k }; };
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
    const camadas = [...(s.estados || []).map((e) => ({ ...e, tipo: 'estado' })), ...(s.digita || []).map((e) => ({ ...e, tipo: 'digita' }))].sort((x, y) => x.t - y.t);
    for (const e of camadas) {
      if (t < e.t) continue;
      if (e.tipo === 'estado') {
        const u = p(t, e.t, e.t + (e.d || 0.25)), dy = (e.sobe || 0) * (1 - E.out(u)) * k;
        c.globalAlpha = e.sobe ? Math.min(1, u * 2.5) : u; c.drawImage(IMG[e.img], a.x, a.y + dy, w, h); c.globalAlpha = 1;
      } else digita(c, q, e, t);
    }
    // contornos
    for (const r of s.aneis || []) anel(c, q, r, t, a);
    c.restore();
    // toques
    for (const tq of s.toques || []) toque(c, q, tq, t);
    c.restore();
  }
  // digitação: o campo fica vazio e o texto da captura preenchida aparece letra a letra, com o cursor.
  // e.ret = o campo; e.tx = a caixa do texto na captura preenchida (medida na imagem: telas/textos.json)
  function digita(c, q, e, t) {
    const [x0, y0, x1, y1] = e.ret, [tx0, ty0, tx1, ty1] = e.tx, prog = p(t, e.t, e.t + e.d), u = Math.floor(prog * e.n) / e.n;
    const A = mapa(q, x0 + 14, y0 + 8), B = mapa(q, x1 - 14, y1 - 8);
    c.fillStyle = '#FFFFFF'; c.fillRect(A.x, A.y, B.x - A.x, B.y - A.y);
    const sx = tx0 - 6, sy = ty0 - 8, sh = ty1 - ty0 + 16, sw = (tx1 + 8 - sx) * u;
    if (sw > 0) { const P = mapa(q, sx, sy); c.drawImage(IMG[e.img], sx, sy, sw, sh, P.x, P.y, sw * P.k, sh * P.k); }
    if (t < e.t + e.d + 0.5 && (prog < 1 || Math.sin(t * 18) > 0)) {
      const P = mapa(q, sx + sw + 3, sy), Q = mapa(q, sx + sw + 9, sy + sh);
      c.fillStyle = C.ink; c.fillRect(P.x, P.y, Math.max(2, Q.x - P.x), Q.y - P.y);
    }
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
    const sc = tq.onda || 1, ap = clamp((d + 0.15) / 0.15), r = (34 + 70 * E.out(clamp(d / 0.6))) * sc;
    c.save();
    c.globalAlpha = d < 0 ? ap : 1 - clamp(d / 0.6);
    c.beginPath(); c.arc(P.x, P.y, (d < 0 ? 34 : 30) * sc, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
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
    if (j.fundo !== false) { c.fillStyle = `rgba(10,10,10,${0.55 * clamp(u)})`; c.fillRect(0, 0, W, H); }
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
  }

  // dois celulares lado a lado (antes e depois): saem juntos do centro e se separam; a tela inteira em cada um
  const DUPLA = { z: 0.97, xs: [282, 798], y: 800 };
  function dupla(c, d, t) {
    const tin = d.t0 - 0.25; if (t < tin || t >= d.t1) return;
    const ue = E.out(p(t, tin, d.t0 + 0.35)), us = E.in(p(t, d.t1 - 0.3, d.t1));
    c.save(); c.beginPath(); c.rect(0, PALCO.y0, W, PALCO.y1 - PALCO.y0); c.clip();
    d.lados.forEach((l, i) => {
      const q = { z: DUPLA.z, fx: IW / 2, fy: IH / 2, ax: lerp(540, DUPLA.xs[i], ue), ay: DUPLA.y + 60 * (1 - ue), dx: -1100 * us, dy: 0 };
      aparelho(c, { img: l.img, aneis: l.aneis, toques: [], estados: [] }, t, q);
    });
    c.restore();
    d.lados.forEach((l, i) => {                                   // "Antes" / "Depois" acima de cada celular
      const a = clamp(ue) * (1 - us), x = lerp(540, DUPLA.xs[i], ue) - 1100 * us, topo = DUPLA.y - IH * BASE * DUPLA.z / 2 - 30;
      font(c, MONO, 38, 700, 4); const w = c.measureText(l.rot).width + 44;
      c.save(); c.globalAlpha = a; rr(c, x - w / 2, topo - 62, w, 58, 29); c.fillStyle = i ? C.lime : '#1B1C1A'; c.fill();
      if (!i) { c.strokeStyle = '#3A3D37'; c.lineWidth = 2; c.stroke(); }
      txt(c, l.rot, x, topo - 21, { fam: MONO, size: 38, weight: 700, align: 'center', color: i ? C.ink : C.white, ls: 4 }); c.restore();
    });
  }

  // ------------------------------------------------------------------ cenas sem tela
  function pessoa(c, x, y, r, rotulo, borda, esc = 1, a = 1) {      // avatar genérico: cabeça e ombros, com o rótulo embaixo
    if (esc <= 0.001 || a <= 0) return;
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(esc, esc);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = '#1B1C1A'; c.fill(); c.shadowColor = 'transparent';
    c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
    c.fillStyle = '#D9D6CC'; c.beginPath(); c.arc(0, -r * 0.18, r * 0.34, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, r * 0.78, r * 0.62, r * 0.5, 0, 0, TAU); c.fill(); c.restore();
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.strokeStyle = borda; c.lineWidth = 6; c.stroke();
    if (rotulo) {
      font(c, MONO, 34, 700, 1); const w = c.measureText(rotulo).width + 40;
      rr(c, -w / 2, r + 18, w, 56, 28); c.fillStyle = '#1B1C1A'; c.fill(); c.strokeStyle = '#34372F'; c.lineWidth = 3; c.stroke();
      txt(c, rotulo, 0, r + 58, { fam: MONO, size: 34, weight: 700, align: 'center', color: C.white, ls: 1 });
    }
    c.restore();
  }
  function balao(c, x, y, s, u) {                              // balão âmbar com a dúvida da recepção
    if (u <= 0) return;
    font(c, D, 50, 900, -1); const w = c.measureText(s).width + 56;
    c.save(); c.translate(x, y); c.scale(u, u); c.rotate(-0.04);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 26; c.shadowOffsetY = 10;
    rr(c, -w / 2, -42, w, 84, 42); c.fillStyle = C.amber; c.fill(); c.shadowColor = 'transparent';
    c.beginPath(); c.moveTo(-w / 2 + 34, 30); c.lineTo(-w / 2 + 10, 66); c.lineTo(-w / 2 + 64, 36); c.fillStyle = C.amber; c.fill();
    txt(c, s, 0, 17, { size: 50, weight: 900, align: 'center', color: C.ink, ls: -1 }); c.restore();
  }
  function caderno(c, x, y, esc, giro, fecha = 0) {                // o caderno de preços: rabiscado, riscado, reescrito
    c.save(); c.translate(x, y); c.rotate(giro); c.scale(esc, esc * (1 - 0.92 * fecha));
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    rr(c, -150, -190, 300, 380, 18); c.fillStyle = '#F1EDE2'; c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#C9C2AE'; for (let k = 0; k < 9; k++) { c.beginPath(); c.arc(-150, -160 + k * 40, 9, 0, TAU); c.fill(); }
    c.strokeStyle = '#B8B09A'; c.lineWidth = 3; for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(-115, -130 + k * 40); c.lineTo(125, -130 + k * 40); c.stroke(); }
    const linha = (s, yy, cor = '#2F4FBF') => txt(c, s, -105, yy, { size: 32, weight: 700, color: cor, ls: -0.5 });
    linha('Chalé 5', -138); linha('R$ 6__?', -98, '#2F4FBF'); linha('Quarto Ipê', -18); linha('R$ 4__ / 5__', 22); linha('Suíte', 102); linha('cabem 2? 3?', 142);
    c.strokeStyle = '#D9402F'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-110, -108); c.lineTo(20, -92); c.moveTo(-110, 12); c.lineTo(80, 28); c.stroke();
    c.restore();
  }
  // gancho + dor: a pergunta no alto desde o quadro 0; o caderno de preços; a recepção sem saber quanto cobrar
  function dorCena(c, t, g) {
    if (!g || t < g.t0 || t >= g.t1) return;
    const sai = E.in(p(t, g.t1 - 0.3, g.t1));
    c.save(); c.globalAlpha = 1 - sai;
    const pz = 1 + 0.015 * Math.sin(t * 6), uq = 1 - E.in(p(t, g.g2 - 0.35, g.g2));
    if (uq > 0) {
      c.save(); c.globalAlpha *= uq; c.translate(540, 290); c.scale(pz, pz);
      txt(c, 'O valor de cada', 0, 0, { size: 96, weight: 900, align: 'center', ls: -3 });
      txt(c, 'chalé ainda mora', 0, 108, { size: 96, weight: 900, align: 'center', ls: -3 });
      txt(c, 'na sua cabeça?', 0, 216, { size: 96, weight: 900, align: 'center', ls: -3, color: C.amber });
      c.restore();
    }
    const tre = t > g.cobrar ? Math.sin(t * 38) * 4 * clamp((t - g.cobrar) / 0.3) * (1 - p(t, g.t1 - 0.9, g.t1 - 0.6)) : 0;
    const fecha = E.in(p(t, g.t1 - 0.75, g.t1 - 0.35));
    caderno(c, 770 + tre, 880 + Math.sin(t * 2) * 6, 1.05, 0.06 + Math.sin(t * 1.4) * 0.02, fecha);
    const up = t < 0.05 ? 1 : clamp(E.back(p(t, g.t0, g.t0 + 0.4), 2), 0, 1.2);
    pessoa(c, 270, 1060 + Math.sin(t * 2.3) * 8, 100, 'Recepção', C.amber, up);
    balao(c, 330, 840, 'R$ ?', E.back(p(t, g.cobrar - 0.05, g.cobrar + 0.3), 3));
    balao(c, 330, 680, '? pessoas', E.back(p(t, g.pessoas - 0.05, g.pessoas + 0.3), 3));
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
  // marca: o selo da série, o logo estourando, o título e os três tipos embaixo. Nada encosta no logo.
  const TIPOS = [[250, 'Chalé'], [540, 'Quarto'], [830, 'Suíte']], TP_Y = 1240;
  function selo(c, x, y, s, esc) {
    if (esc <= 0.001) return;
    font(c, D, 48, 900, -0.5); const w = c.measureText(s).width + 70;
    c.save(); c.translate(x, y); c.scale(esc, esc);
    rr(c, -w / 2, -42, w, 84, 42); c.fillStyle = '#1B1C1A'; c.fill(); c.strokeStyle = C.lime; c.lineWidth = 4; c.stroke();
    txt(c, s, 0, 17, { size: 48, weight: 900, align: 'center', color: C.white, ls: -0.5 }); c.restore();
    return w;
  }
  function geoMarca(t, m) {
    const u = E.back(p(t, m.fazlo - 0.1, m.fazlo + 0.45), 2.2);
    M2 = M2 || document.createElement('canvas').getContext('2d');
    font(M2, D, 112, 900, -2); const wf = M2.measureText('FAZLO').width;
    font(M2, D, 62, 800, -0.5); const tot = (wf + 26 + M2.measureText('Hospeda').width + 64) * 0.95;
    const logo = u > 0 ? [{ tipo: 'circulo', cx: 540, cy: 700 - 80 * u, r: 150 * u }, { tipo: 'ret', x0: 540 - tot / 2 * u, y0: 700 + (180 - 46 * 0.95) * u, x1: 540 + tot / 2 * u, y1: 700 + (180 + 50 * 0.95) * u }] : [];
    font(M2, D, 48, 900, -0.5);
    const pessoas = TIPOS.map(([x, s], k) => { const e = clamp(E.back(p(t, m.cad - 0.1 + k * 0.12, m.cad + 0.3 + k * 0.12), 2), 0, 1.15) * (1 + 0.12 * E.out(p(t, m.marcos[k], m.marcos[k] + 0.15)) * (1 - p(t, m.marcos[k] + 0.15, m.marcos[k] + 0.45))); const w = M2.measureText(s).width + 70; return { x, y: TP_Y, e, s, x0: x - w / 2 * e, x1: x + w / 2 * e, y0: TP_Y - 42 * e, y1: TP_Y + 42 * e }; });
    return { u, logo, pessoas };
  }
  let M2 = null;
  function folga(g) {
    let min = 1e9;
    for (const q of g.pessoas) if (q.e > 0.01) for (const L of g.logo) {
      let d;
      if (L.tipo === 'circulo') { const dx = Math.max(q.x0 - L.cx, 0, L.cx - q.x1), dy = Math.max(q.y0 - L.cy, 0, L.cy - q.y1); d = Math.hypot(dx, dy) - L.r; }
      else { const dx = Math.max(q.x0 - L.x1, 0, L.x0 - q.x1), dy = Math.max(q.y0 - L.y1, 0, L.y0 - q.y1); d = Math.hypot(dx, dy); }
      min = Math.min(min, d);
    }
    return min;
  }
  function marcaCena(c, t, m) {
    if (!m || t < m.t0 || t >= m.t1) return;
    const sai = E.in(p(t, m.t1 - 0.3, m.t1)), g = geoMarca(t, m);
    c.save(); c.globalAlpha = 1 - sai;
    const us = E.out(p(t, m.t0, m.t0 + 0.4));
    if (us > 0) {
      font(c, MONO, 34, 700, 2); const w = c.measureText('FAZLO Hospeda na prática').width + 60;
      c.save(); c.globalAlpha *= us; c.translate(540, 250 - 20 * (1 - us));
      rr(c, -w / 2, -36, w, 72, 36); c.strokeStyle = C.lime; c.lineWidth = 3; c.stroke();
      txt(c, 'FAZLO Hospeda na prática', 0, 12, { fam: MONO, size: 34, weight: 700, align: 'center', color: C.lime, ls: 2 }); c.restore();
    }
    const ui = p(t, m.fazlo - 0.05, m.fazlo + 0.6);
    if (ui > 0 && ui < 1) { c.beginPath(); c.arc(540, 700, 120 + 620 * E.out(ui), 0, TAU); c.strokeStyle = rgba(C.lime, 1 - ui); c.lineWidth = 26 * (1 - ui); c.stroke(); }
    if (g.u > 0) { c.save(); c.translate(540, 700); c.scale(g.u, g.u); logo(c, 0, -80, 300); nome(c, 0, 180, 0.95); c.restore(); }
    const ut = E.back(p(t, m.fazlo + 0.45, m.fazlo + 0.85), 2);
    if (ut > 0) {
      c.save(); c.translate(540, 1070); c.scale(ut, ut);
      font(c, D, 84, 900, -2); const a = c.measureText('Chalés e ').width, b = c.measureText('quartos').width;
      txt(c, 'Chalés e ', -(a + b) / 2, 0, { size: 84, weight: 900, ls: -2 });
      txt(c, 'quartos', -(a + b) / 2 + a, 0, { size: 84, weight: 900, ls: -2, color: C.lime }); c.restore();
    }
    g.pessoas.forEach((q) => selo(c, q.x, q.y, q.s, q.e));
    c.restore();
  }
  function fechoCena(c, t, f) {
    if (!f || t < f.t0) return;
    const u = E.back(p(t, f.t0, f.t0 + 0.55), 2);
    const bt = Math.max(0, t - f.t0), pulso = 1 + 0.018 * Math.exp(-((bt % 0.5) / 0.12));
    const ui = p(t, f.t0, f.t0 + 0.6);
    if (ui > 0 && ui < 1) { c.beginPath(); c.arc(540, 450, 100 + 560 * E.out(ui), 0, TAU); c.strokeStyle = rgba(C.lime, 1 - ui); c.lineWidth = 24 * (1 - ui); c.stroke(); }
    const ua2 = (bt % 2) / 2;                                      // halo no compasso, sem chegar no nome
    if (bt > 0.6) { c.beginPath(); c.arc(540, 420, 150 + 28 * E.out(ua2), 0, TAU); c.strokeStyle = rgba(C.lime, 0.4 * (1 - ua2)); c.lineWidth = 5; c.stroke(); }
    c.save(); c.translate(540, 545); c.scale(clamp(u, 0, 1.2) * pulso, clamp(u, 0, 1.2) * pulso); logo(c, 0, -125, 260); nome(c, 0, 140, 0.9); c.restore();
    const linha = (s, y, t0, cor, size0) => {
      const v = E.back(p(t, t0, t0 + 0.4), 2); if (v <= 0) return;
      let size = size0; font(c, D, size, 900, -1.5); const w = c.measureText(s).width; if (w > 960) size = size0 * 960 / w;
      c.save(); c.translate(540, y); c.scale(v, v); txt(c, s, 0, 0, { size, weight: 900, align: 'center', color: cor, ls: -1.5 }); c.restore();
    };
    linha('Tudo cadastrado no Hospeda,', 860, f.tudo, C.white, 68);
    linha('e fácil de ajustar quando precisar.', 945, f.facil, C.white, 60);
    linha('E no começo,', 1065, f.comeco, C.white, 68);
    linha('a FAZLO configura tudo com você.', 1150, f.configura, C.lime, 68);
    const ua = E.out(p(t, f.arroba, f.arroba + 0.5));
    if (ua > 0) txt(c, '@fazlohospeda', 540, 1270, { fam: MONO, size: 46, weight: 700, align: 'center', color: C.gray, alpha: ua });
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
    dorCena(c, t, PLANO.dor); marcaCena(c, t, PLANO.marca);
    for (const s of PLANO.telas) tela(c, s, t);
    for (const d of PLANO.duplas || []) dupla(c, d, t);
    fechoCena(c, t, PLANO.fecho);
    legenda(c, t);
  }
  function eventos() {
    const ev = [], P = PLANO, g = P.dor;
    ev.push({ t: 0.05, tipo: 'pop' }, { t: g.cobrar - 0.05, tipo: 'erro' }, { t: g.pessoas - 0.05, tipo: 'pop' }, { t: g.t1 - 0.75, tipo: 'suga' });
    const m = P.marca;
    ev.push({ t: m.t0, tipo: 'whoosh' }, { t: m.fazlo - 0.05, tipo: 'impacto' }, { t: m.fazlo + 0.45, tipo: 'pop' });
    [0, 1, 2].forEach((k) => ev.push({ t: m.cad + k * 0.12, tipo: 'pop' }, { t: m.marcos[k], tipo: 'tick' }));
    for (const d of P.duplas || []) { ev.push({ t: d.t0 - 0.25, tipo: 'whoosh' }); d.lados.forEach((l) => (l.aneis || []).forEach((r) => ev.push({ t: r.t + 0.05, tipo: 'tick' }))); }
    for (const s of P.telas) {
      ev.push({ t: s.t0 - 0.25, tipo: 'whoosh' });
      (s.cam || []).forEach((k) => { if ((k.d || 0) > 0.1 && k.z > 1) ev.push({ t: k.t, tipo: 'zoom' }); });
      (s.aneis || []).forEach((r) => ev.push({ t: r.t + 0.05, tipo: 'tick' }));
      (s.saltos || []).forEach((j) => ev.push({ t: j.t, tipo: 'pop' }, { t: j.ate, tipo: 'volta' }));
      (s.toques || []).forEach((q) => ev.push({ t: q.t, tipo: 'toque' }));
      (s.estados || []).forEach((e) => ev.push({ t: e.t, tipo: 'desliza' }));
      (s.digita || []).forEach((e) => { for (let i = 0; i < e.n; i += 2) ev.push({ t: e.t + (i / e.n) * e.d, tipo: 'tecla' }); });
    }
    const f = P.fecho;
    ev.push({ t: f.t0, tipo: 'impacto' }, { t: f.tudo, tipo: 'pop' }, { t: f.facil, tipo: 'pop' }, { t: f.comeco, tipo: 'pop' }, { t: f.configura, tipo: 'check' }, { t: f.arroba, tipo: 'sino' });
    return ev.sort((a, b) => a.t - b.t);
  }
  window.CURTO = {
    eventos: () => eventos(),
    marca: (t) => { const g = geoMarca(t, PLANO.marca); return { folga: folga(g), pessoas: g.pessoas.filter((q) => q.e > 0.01).length, logo: g.logo.length }; },
    marcaT: () => [PLANO.marca.t0, PLANO.marca.t1],
    plano: () => ({ duplas: (PLANO.duplas || []).map((d) => ({ t0: d.t0, t1: d.t1, imgs: d.lados.map((l) => l.img) })), telas: PLANO.telas.map((s) => ({ img: s.img, t0: s.t0, t1: s.t1, focos: [...(s.aneis || []).map((r) => r.t), ...(s.saltos || []).map((j) => j.t)] })), legenda: PLANO.legenda.map((g) => ({ t0: g.t0, t1: g.t1, texto: g.palavras.map((w) => w.w).join(' ') })) }),
    // caixas na tela (px do vídeo) num instante: janelas, toques e legenda — para a conferência
    legendaCaixa: (t) => {                                     // a caixa da legenda no instante t (o mesmo cálculo de legenda())
      const pg = (PLANO.legenda || []).find((g) => t >= g.t0 && t < g.t1); if (!pg) return null;
      M2 = M2 || document.createElement('canvas').getContext('2d'); const c = M2, size = 66, lh = 78, maxW = 900;
      font(c, D, size, 900, -1.2); const linhas = [[]]; let lw = 0;
      for (const w of pg.palavras) { const ww = c.measureText(w.w + ' ').width; if (lw + ww > maxW && linhas[linhas.length - 1].length) { linhas.push([]); lw = 0; } linhas[linhas.length - 1].push(ww); lw += ww; }
      const y0 = 1470 - (linhas.length - 1) * lh / 2, larg = Math.max(...linhas.map((l) => l.reduce((a, b) => a + b, 0)));
      return [540 - larg / 2, y0 - 56, 540 + larg / 2, y0 + (linhas.length - 1) * lh + 20, linhas.length];
    },
    caixas: (t) => {
      const out = { janelas: [], toques: [], legenda: null };
      for (const s of PLANO.telas) {
        if (t < s.t0 - 0.25 || t >= s.t1) continue;
        const q = cam(s, t);
        for (const j of s.saltos || []) if (t >= j.t + 0.5 && t <= j.ate) { const larg = j.larg || 940, alt = larg * (j.ret[3] - j.ret[1]) / (j.ret[2] - j.ret[0]), cy = j.cy || 760; out.janelas.push([540 - larg / 2, cy - alt / 2, 540 + larg / 2, cy + alt / 2]); }
        for (const tq of s.toques || []) if (t >= tq.t - 0.15 && t <= tq.t + 0.6) { const P = mapa(q, tq.x, tq.y); out.toques.push([P.x, P.y, tq.onda || 1]); }
      }
      const pg = (PLANO.legenda || []).find((g) => t >= g.t0 && t < g.t1);
      if (pg) out.legenda = [90, 1400, 990, 1560];
      return out;
    },
    init(imgs, logo, plano) { IMG = imgs; LOGO = logo; PLANO = plano; DUR = plano.duracao; },
    renderAt(c, t) { frame(c, Math.min(Math.max(t, 0), DUR - 1e-4)); },
    get DURATION() { return DUR; },
  };
})();
