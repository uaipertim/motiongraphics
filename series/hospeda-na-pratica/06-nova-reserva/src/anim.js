/*
 * FAZLO Hospeda na prática, episódio 6: Nova reserva em segundos (1080×1920, 60 fps).
 * Motor dos episódios 2 a 5 (fundo, aparelho, câmera, contornos, toques, janelas com marcas, digitação letra a letra, rolagem
 * da página, legenda palavra por palavra), com o que este episódio pede: o DESAFIO COM CRONÔMETRO, em tempo real.
 *   - O cronômetro corre 1 s por 1 s de vídeo entre D (início do desafio) e D + total (o tempo medido na captura final:
 *     telas/eventos.json). As telas trocam nos instantes medidos; cada passo terminado acende um trecho da barra, com o tempo
 *     parcial medido embaixo dele.
 *   - Cada estado é uma captura do celular (vp, 1170×2532) ou a página inteira (pg, rolando por baixo do cabeçalho e da barra
 *     de baixo, que vêm da captura do celular do mesmo estado).
 * Todo o estado de um quadro é função do tempo: renderAt(ctx, t).
 */
(function () {
  'use strict';
  const W = 1080, H = 1920, IW = 1170, IH = 2532;
  const D = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const C = { bg: '#0A0A0A', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2', amber: '#FFB23F', ink: '#0A0A0A', bezel: '#141513', dim: '#3A3D37' };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    out: (x) => 1 - Math.pow(1 - x, 3), in: (x) => x * x * x, io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    back: (x, s = 1.9) => (x <= 0 ? 0 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)),
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
  function partes(c, pedacos, x, y, size, maxW = 980, ls = -2) {
    font(c, D, size, 900, ls); let tot = pedacos.reduce((a, [s]) => a + c.measureText(s).width, 0);
    if (tot > maxW) { size = size * maxW / tot; font(c, D, size, 900, ls); tot = pedacos.reduce((a, [s]) => a + c.measureText(s).width, 0); }
    let xx = x - tot / 2;
    for (const [s, cor] of pedacos) { xx += txt(c, s, xx, y, { size, weight: 900, ls, color: cor }); }
    return { w: tot, size };
  }
  const virgula = (x) => x.toFixed(1).replace('.', ',');

  let IMG = {}, PLANO = null, DUR = 60, LOGO = null, M2 = null;
  const med = () => (M2 = M2 || document.createElement('canvas').getContext('2d'));

  // ------------------------------------------------------------------ fundo
  function fundo(c, t) {
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    const gx = 540 + 220 * Math.sin(t * 0.35), gy = 900 + 180 * Math.cos(t * 0.28);
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, 980);
    g.addColorStop(0, rgba(C.lime, 0.15)); g.addColorStop(1, rgba(C.lime, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    const off = (t * 14) % 54;
    for (let y = -54 + off; y < H; y += 54) for (let x = 27; x < W; x += 54) { c.beginPath(); c.arc(x, y, 1.7, 0, TAU); c.fill(); }
  }

  // ------------------------------------------------------------------ o aparelho, as camadas, a rolagem e a câmera
  const BASE = 880 / IH;                                         // a tela inteira do celular: 880 px de altura no vídeo
  const ANC = { x: 540, y: 905 };
  const PALCO = { y0: 450, y1: 1360 };                           // em cima: o cronômetro; embaixo: a legenda
  const CAB = 192, BARRA = 2337;                                 // cabeçalho e barra de baixo do app (fixos), px do celular
  function interp(chaves, t, ini, campo) {
    let v = ini;
    for (const k of chaves || []) { if (t < k.t) break; v = lerp(v, k[campo], E.io(p(t, k.t, k.t + (k.d || 0.55)))); }
    return v;
  }
  const rolagem = (s, t) => interp(s.rolagem, t, 0, 'y');
  function cam(s, t) {
    let cur = { z: 1, fx: IW / 2, fy: IH / 2 };
    for (const k of s.cam || []) {
      if (t < k.t) break;
      const u = E.io(p(t, k.t, k.t + (k.d || 0.45)));
      cur = { z: lerp(cur.z, k.z, u), fx: IW / 2, fy: lerp(cur.fy, k.fy ?? IH / 2, u) };
    }
    const kk = BASE * cur.z, lo = (ANC.y - PALCO.y0) / kk, hi = IH - (PALCO.y1 - ANC.y) / kk;
    cur.fy = lo < hi ? clamp(cur.fy, lo, hi) : IH / 2;
    return cur;
  }
  const mapa = (q, x, y) => { const k = BASE * q.z; return { x: ANC.x + (x - q.fx) * k, y: ANC.y + (y - q.fy) * k, k }; };
  const ehPagina = (n) => IMG[n] && IMG[n].height > IH + 1;
  // camada em cima no instante t (para saber se uma medida é da página ou do celular)
  function camadas(s, t) {
    const out = [{ img: s.img, a: 1, lado: 0, fixos: s.fixos }];
    for (const e of s.paginas || []) {
      if (t < e.t) break;
      const u = p(t, e.t, e.t + (e.d ?? 0.15));
      out.push({ img: e.img, a: e.lado ? 1 : u, lado: e.lado ? 1 - E.out(u) : 0, fixos: e.fixos });
    }
    // só desenha a partir da última camada opaca
    let i0 = 0; out.forEach((L, i) => { if (L.a >= 1 && L.lado === 0) i0 = i; });
    return out.slice(i0);
  }
  const naTela = (s, r, t, pagina) => (pagina ? [r[0], r[1] - rolagem(s, t), r[2], r[3] - rolagem(s, t)] : r);
  function aparelho(c, s, t, q) {
    const a = mapa(q, 0, 0), k = a.k, w = IW * k, h = IH * k, pad = 15 * Math.max(0.6, q.z), rad = 128 * k;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 60; c.shadowOffsetY = 24;
    rr(c, a.x - pad, a.y - pad, w + 2 * pad, h + 2 * pad, rad + pad); c.fillStyle = C.bezel; c.fill();
    c.shadowColor = 'transparent';
    rr(c, a.x - pad, a.y - pad, w + 2 * pad, h + 2 * pad, rad + pad); c.strokeStyle = '#3A3D37'; c.lineWidth = 2.5; c.stroke();
    c.save(); rr(c, a.x, a.y, w, h, rad); c.clip(); c.fillStyle = '#F3F3EF'; c.fillRect(a.x, a.y, w, h);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    const sy = rolagem(s, t);
    for (const L of camadas(s, t)) {
      if (L.a <= 0) continue; const im = IMG[L.img], dx = L.lado * w;
      c.globalAlpha = L.a;
      if (ehPagina(L.img)) {
        const y = clamp(sy, 0, im.height - IH);
        c.drawImage(im, 0, y, IW, IH, a.x + dx, a.y, w, h);
        const fx = IMG[L.fixos];
        if (fx) { c.drawImage(fx, 0, 0, IW, CAB, a.x + dx, a.y, w, CAB * k); c.drawImage(fx, 0, BARRA, IW, IH - BARRA, a.x + dx, a.y + BARRA * k, w, (IH - BARRA) * k); }
      } else c.drawImage(im, a.x + dx, a.y, w, h);
      c.globalAlpha = 1;
    }
    for (const e of s.digita || []) digita(c, q, e, t);
    for (const r of s.aneis || []) anel(c, s, q, r, t, a);
    const esc = s.escuro ? interp(s.escuro, t, s.escuro0 || 0, 'a') : 0;
    if (esc > 0) { c.fillStyle = `rgba(10,10,10,${esc})`; c.fillRect(a.x, a.y, w, h); }
    c.restore();
    for (const tq of s.toques || []) toque(c, s, q, tq, t);
    c.restore();
  }
  // digitação: o campo fica vazio e o texto da captura preenchida aparece letra a letra, com o cursor
  function digita(c, q, e, t) {
    if (t < e.t || t > e.ate) return;
    const [x0, y0, x1, y1] = e.ret, [tx0, ty0, tx1, ty1] = e.tx, prog = p(t, e.t, e.fim), u = Math.floor(prog * e.n) / e.n;
    const [v0, v1] = e.vazio || [x0 + 16, x1 - 16], A = mapa(q, v0, y0 + 10), B = mapa(q, v1, y1 - 10);
    c.fillStyle = '#FFFFFF'; c.fillRect(A.x, A.y, B.x - A.x, B.y - A.y);
    const sx = tx0 - 6, sy = ty0 - 8, sh = ty1 - ty0 + 16, sw = (tx1 + 8 - sx) * u;
    if (sw > 0) { const P = mapa(q, sx, sy); c.drawImage(IMG[e.img], sx, sy, sw, sh, P.x, P.y, sw * P.k, sh * P.k); }
    if (prog < 1 || Math.sin(t * 18) > 0) {
      const P = mapa(q, sx + sw + 3, sy), Q = mapa(q, sx + sw + 9, sy + sh);
      c.fillStyle = C.ink; c.fillRect(P.x, P.y, Math.max(2, Q.x - P.x), Q.y - P.y);
    }
  }
  function anel(c, s, q, r, t, a) {
    if (t < r.t || t > (r.ate ?? 1e9) + 0.3) return;
    const u = E.out(p(t, r.t, r.t + 0.35)), sai = r.ate != null ? p(t, r.ate, r.ate + 0.3) : 0;
    const [x0, y0, x1, y1] = naTela(s, r.ret, t, r.pagina), A = mapa(q, x0, y0), B = mapa(q, x1, y1), pad = 10;
    const cor = r.cor === 'ambar' ? C.amber : C.lime;
    c.save(); c.globalAlpha *= 1 - sai;
    if (r.escurece !== false) {
      c.beginPath(); c.rect(a.x - 50, a.y - 50, IW * a.k + 100, IH * a.k + 100); c.roundRect(A.x - pad, A.y - pad, B.x - A.x + 2 * pad, B.y - A.y + 2 * pad, 18);
      c.fillStyle = `rgba(10,10,10,${0.45 * u})`; c.fill('evenodd');
    }
    const per = 2 * (B.x - A.x + B.y - A.y + 4 * pad);
    rr(c, A.x - pad, A.y - pad, B.x - A.x + 2 * pad, B.y - A.y + 2 * pad, 18);
    c.setLineDash([per * u, per]); c.strokeStyle = cor; c.lineWidth = 7; c.shadowColor = cor; c.shadowBlur = 22; c.stroke();
    c.restore();
  }
  function toque(c, s, q, tq, t) {
    const d = t - tq.t; if (d < -0.15 || d > 0.6) return;
    const P = mapa(q, tq.x, tq.pagina ? tq.y - rolagem(s, tq.t) : tq.y);
    const sc = tq.onda || 1, ap = clamp((d + 0.15) / 0.15), r = (34 + 70 * E.out(clamp(d / 0.6))) * sc;
    c.save();
    c.globalAlpha = d < 0 ? ap : 1 - clamp(d / 0.6);
    c.beginPath(); c.arc(P.x, P.y, (d < 0 ? 34 : 30) * sc, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
    c.strokeStyle = 'rgba(10,10,10,0.5)'; c.lineWidth = 3; c.stroke();
    if (d >= 0) { c.beginPath(); c.arc(P.x, P.y, r, 0, TAU); c.strokeStyle = C.lime; c.lineWidth = 6; c.stroke(); }
    c.restore();
  }
  const geoJanela = (j) => { const [x0, y0, x1, y1] = j.ret, larg = j.larg || 940, alt = larg * (y1 - y0) / (x1 - x0), cy = j.cy || 760; return { larg, alt, cy }; };
  function salto(c, s, t, q, j) {
    if (t < j.t || t > j.ate + 0.4) return;
    const ent = E.back(p(t, j.t, j.t + 0.45)), sai = E.in(p(t, j.ate, j.ate + 0.3));
    const u = clamp(ent * (1 - sai), 0, 1.2);
    const [x0, y0, x1, y1] = j.ret, [v0, w0, v1, w1] = naTela(s, j.ret, j.t, j.pagina), A = mapa(q, v0, w0), B = mapa(q, v1, w1);
    const { larg, alt, cy } = geoJanela(j), cx = 540;
    const x = lerp(A.x, cx - larg / 2, u), y = lerp(A.y, cy - alt / 2, u), w = lerp(B.x - A.x, larg, u), h = lerp(B.y - A.y, alt, u);
    const cor = j.cor === 'ambar' ? C.amber : C.lime;
    c.save();
    if (j.fundo !== false) { c.fillStyle = `rgba(10,10,10,${0.55 * clamp(u)})`; c.fillRect(0, PALCO.y0 - 10, W, PALCO.y1 - PALCO.y0 + 20); }
    c.translate(x + w / 2, y + h / 2); c.rotate((j.giro ?? -1.2) * Math.PI / 180 * clamp(u)); c.translate(-(x + w / 2), -(y + h / 2));
    c.shadowColor = 'rgba(0,0,0,0.65)'; c.shadowBlur = 50; c.shadowOffsetY = 20;
    rr(c, x, y, w, h, 26); c.fillStyle = '#fff'; c.fill(); c.shadowColor = 'transparent';
    c.save(); rr(c, x, y, w, h, 26); c.clip(); c.imageSmoothingQuality = 'high';
    c.drawImage(IMG[j.img || s.img], x0, y0, x1 - x0, y1 - y0, x, y, w, h);
    const kx = w / (x1 - x0), ky = h / (y1 - y0);
    for (const m of j.marcas || []) {
      if (t < m.t) continue;
      const um = E.out(p(t, m.t, m.t + 0.3)), mc = m.cor === 'ambar' ? C.amber : C.lime, pd = 8;
      const mx = x + (m.ret[0] - x0) * kx - pd, my = y + (m.ret[1] - y0) * ky - pd, mw = (m.ret[2] - m.ret[0]) * kx + 2 * pd, mh = (m.ret[3] - m.ret[1]) * ky + 2 * pd;
      if (m.fundo) { c.fillStyle = rgba(mc, 0.16 * um); rr(c, mx, my, mw, mh, 14); c.fill(); }
      const per = 2 * (mw + mh); rr(c, mx, my, mw, mh, 14);
      c.setLineDash([per * um, per]); c.strokeStyle = mc; c.lineWidth = 6; c.stroke(); c.setLineDash([]);
    }
    c.restore();
    rr(c, x, y, w, h, 26); c.strokeStyle = cor; c.lineWidth = 8; c.shadowColor = cor; c.shadowBlur = 30 * clamp(u); c.stroke();
    c.restore();
  }
  function tela(c, s, t) {
    if (t < s.t0 || t >= s.t1) return;
    const q = cam(s, t);
    const us = p(t, s.t1 - 0.4, s.t1);
    c.save(); c.globalAlpha = 1 - E.in(us);
    if (us > 0) { c.translate(540, ANC.y); c.scale(1 - 0.25 * E.in(us), 1 - 0.25 * E.in(us)); c.translate(-540, -ANC.y); }
    c.save(); c.beginPath(); c.rect(0, PALCO.y0, W, PALCO.y1 - PALCO.y0); c.clip();
    aparelho(c, s, t, q);
    c.restore();
    if (q.z > 1.02) {
      const a = clamp((q.z - 1) / 0.3);
      for (const [y0, y1] of [[PALCO.y0, PALCO.y0 + 80], [PALCO.y1, PALCO.y1 - 80]]) {
        const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgba(C.bg, a)); g.addColorStop(1, rgba(C.bg, 0));
        c.fillStyle = g; c.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
      }
    }
    c.restore();
    for (const j of s.saltos || []) salto(c, s, t, q, j);
  }

  // ------------------------------------------------------------------ o pedido, o título e o cronômetro
  function balao(c, t, b) {                                        // o pedido: um balão de mensagem genérico, desde o quadro 0
    if (!b || t >= b.t1) return;
    const sai = E.in(p(t, b.t1 - 0.35, b.t1)), pz = 1 + 0.01 * Math.sin(t * 5);
    const x0 = 120, y0 = 190, w = 840, h = 230;
    c.save(); c.globalAlpha = 1 - sai; c.translate(540, y0 + h / 2 - 30 * sai); c.scale(pz, pz); c.translate(-540, -(y0 + h / 2));
    // selo "pelo WhatsApp"
    font(c, MONO, 28, 700, 1); const sw = c.measureText('pelo WhatsApp').width + 70;
    rr(c, x0, y0 - 64, sw, 50, 25); c.fillStyle = 'rgba(24,27,23,0.95)'; c.fill(); c.strokeStyle = rgba(C.lime, 0.55); c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(x0 + 26, y0 - 39, 7, 0, TAU); c.fillStyle = C.lime; c.fill();
    txt(c, 'pelo WhatsApp', x0 + 44, y0 - 29, { fam: MONO, size: 28, weight: 700, color: '#E8EAE4', ls: 1 });
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 14;
    rr(c, x0, y0, w, h, 40); c.fillStyle = '#FFFFFF'; c.fill(); c.shadowColor = 'transparent';
    c.beginPath(); c.moveTo(x0 + 40, y0 + h - 2); c.lineTo(x0 + 10, y0 + h + 42); c.lineTo(x0 + 110, y0 + h - 2); c.fillStyle = '#FFFFFF'; c.fill();
    const pulso = 1 + 0.06 * Math.exp(-Math.pow((t - b.datas - 0.15) / 0.18, 2));
    const L1 = [['Tem vaga de ', C.ink], ['12 a 14', C.ink]], L2 = [['de dezembro ', C.ink], ['para 2?', C.ink]];
    font(c, D, 64, 900, -1.5);
    const w1 = c.measureText('Tem vaga de ').width; let xx = x0 + 52;
    txt(c, 'Tem vaga de ', xx, y0 + 95, { size: 64, weight: 900, color: C.ink, ls: -1.5 });
    const w12 = (font(c, D, 64, 900, -1.5), c.measureText('12 a 14').width);
    c.save(); c.translate(xx + w1 + w12 / 2, y0 + 75); c.scale(pulso, pulso);
    if (t >= b.datas) { rr(c, -w12 / 2 - 12, -44, w12 + 24, 72, 16); c.fillStyle = rgba(C.lime, clamp((t - b.datas) / 0.25)); c.fill(); }
    txt(c, '12 a 14', -w12 / 2, 20, { size: 64, weight: 900, color: C.ink, ls: -1.5 }); c.restore();
    txt(c, 'de dezembro para 2?', xx, y0 + 180, { size: 64, weight: 900, color: C.ink, ls: -1.5 });
    c.restore();
    void L1; void L2;
  }
  function seloSerie(c, x, y, a) {
    font(c, MONO, 30, 700, 2); const w = c.measureText('FAZLO Hospeda na prática').width + 80;
    c.save(); c.globalAlpha *= a; rr(c, x - w / 2, y - 32, w, 64, 32); c.fillStyle = 'rgba(22,26,24,0.92)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(x - w / 2 + 30, y, 8, 0, TAU); c.fillStyle = C.lime; c.fill();
    txt(c, 'FAZLO Hospeda na prática', x - w / 2 + 52, y + 10, { fam: MONO, size: 30, weight: 700, color: '#E8EAE4', ls: 2 }); c.restore();
  }
  function titulo(c, t, m) {
    if (!m || t < m.t0 || t >= m.t1) return;
    const sai = E.in(p(t, m.t1 - 0.3, m.t1)), us = E.out(p(t, m.t0, m.t0 + 0.35));
    c.save(); c.globalAlpha = 1 - sai; c.translate(0, -40 * sai);
    if (us > 0) seloSerie(c, 540, 200 - 20 * (1 - us), us);
    const ut = E.back(p(t, m.t0 + 0.1, m.t0 + 0.5), 2);
    if (ut > 0) { c.save(); c.translate(540, 350); c.scale(ut, ut); partes(c, [['Nova reserva ', C.white], ['em segundos', C.lime]], 0, 0, 96, 990, -3); c.restore(); }
    c.restore();
  }
  // o cronômetro: o ícone (o ponteiro gira com os segundos), os dígitos e a barra de 7 trechos com os parciais
  function relogio(cr, t) { return clamp(t - cr.D, 0, cr.total); }
  function icone(c, x, y, r, seg, cor) {
    c.save(); c.translate(x, y);
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.strokeStyle = cor; c.lineWidth = r * 0.16; c.stroke();
    rr(c, -r * 0.22, -r * 1.42, r * 0.44, r * 0.3, 4); c.fillStyle = cor; c.fill();
    c.rotate(seg / 60 * TAU); c.beginPath(); c.moveTo(0, r * 0.12); c.lineTo(0, -r * 0.72); c.strokeStyle = cor; c.lineWidth = r * 0.13; c.lineCap = 'round'; c.stroke();
    c.restore();
  }
  function cronometro(c, t, cr) {
    if (!cr || t < cr.entra || t >= cr.some + 0.4) return;
    const ue = E.back(p(t, cr.entra, cr.entra + 0.45), 2), us = E.in(p(t, cr.some, cr.some + 0.4));
    const seg = relogio(cr, t), parado = t >= cr.D + cr.total, pisca = t >= cr.D - 0.25 && t < cr.D + 0.15;
    // o tempo final grande no centro, logo depois de parar
    const ug = cr.grande ? E.io(p(t, cr.grande[0], cr.grande[0] + 0.5)) * (1 - E.io(p(t, cr.grande[1], cr.grande[1] + 0.5))) : 0;
    c.save(); c.globalAlpha = clamp(ue) * (1 - us);
    const yD = lerp(290, 760, ug), size = lerp(150, 250, ug), cor = parado ? C.lime : C.white;
    if (ug > 0) { c.fillStyle = `rgba(10,10,10,${0.55 * ug})`; c.fillRect(0, PALCO.y0, W, PALCO.y1 - PALCO.y0); }
    const s = (seg < 10 ? '0' : '') + virgula(Math.floor(seg * 10 + 1e-6) / 10);
    font(c, MONO, size, 800, -4); const wd = c.measureText(s).width; font(c, MONO, size * 0.42, 800, 0); const ws = c.measureText(' s').width;
    const tot = wd + ws + size * 0.62, x0 = 540 - tot / 2;
    c.save(); c.translate(540, yD - size * 0.35); c.scale(clamp(ue, 0, 1.15), clamp(ue, 0, 1.15)); c.translate(-540, -(yD - size * 0.35));
    icone(c, x0 + size * 0.24, yD - size * 0.36, size * 0.24, seg, parado ? C.lime : (pisca ? C.lime : C.white));
    if (parado) { c.save(); c.shadowColor = rgba(C.lime, 0.6); c.shadowBlur = 40 * (0.5 + ug); txt(c, s, x0 + size * 0.62, yD, { fam: MONO, size, weight: 800, color: cor, ls: -4 }); c.restore(); }
    else txt(c, s, x0 + size * 0.62, yD, { fam: MONO, size, weight: 800, color: pisca ? C.lime : cor, ls: -4 });
    txt(c, ' s', x0 + size * 0.62 + wd, yD, { fam: MONO, size: size * 0.42, weight: 800, color: cor, ls: 0 });
    c.restore();
    // a barra de 7 trechos (some enquanto o tempo grande está no centro)
    const ab = 1 - ug; if (ab > 0.01) {
      const n = cr.parciais.length, x0b = 70, x1b = 1010, gap = 10, wseg = (x1b - x0b - gap * (n - 1)) / n, yb = 338;
      cr.parciais.forEach((pp, i) => {
        const xs = x0b + i * (wseg + gap), feito = t >= cr.D + pp.t, ua = E.out(p(t, cr.D + pp.t, cr.D + pp.t + 0.3));
        const atual = !feito && (i === 0 ? t >= cr.D : t >= cr.D + cr.parciais[i - 1].t);
        c.save(); c.globalAlpha *= ab;
        rr(c, xs, yb, wseg, 12, 6); c.fillStyle = '#2A2D27'; c.fill();
        if (atual) { const pr = (t - cr.D - (i ? cr.parciais[i - 1].t : 0)) / (pp.t - (i ? cr.parciais[i - 1].t : 0)); rr(c, xs, yb, wseg * clamp(pr), 12, 6); c.fillStyle = rgba(C.white, 0.55); c.fill(); }
        if (feito) { rr(c, xs, yb, wseg, 12, 6); c.fillStyle = C.lime; c.fill(); }
        txt(c, pp.rotulo, xs + wseg / 2, yb + 46, { fam: MONO, size: 20, weight: 700, align: 'center', color: feito ? C.white : C.gray, ls: 0 });
        if (feito) { c.save(); c.translate(xs + wseg / 2, yb + 82); c.scale(lerp(1.5, 1, ua), lerp(1.5, 1, ua)); txt(c, virgula(pp.t), 0, 0, { fam: MONO, size: 28, weight: 800, align: 'center', color: C.lime, alpha: ua }); c.restore(); }
        c.restore();
      });
    }
    c.restore();
  }

  // ------------------------------------------------------------------ fecho
  function nome(c, x, y, esc = 1) {
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
  function geoLogo(t, f) {
    const u = clamp(E.back(p(t, f.logo, f.logo + 0.55), 2), 0, 1.2); if (u <= 0.001) return [];
    const c = med(); font(c, D, 112, 900, -2); const wf = c.measureText('FAZLO').width; font(c, D, 62, 800, -0.5);
    const tot = (wf + 26 + c.measureText('Hospeda').width + 64) * 0.9 * u;
    return [{ tipo: 'circulo', cx: 540, cy: 545 - 125 * u, r: 140 * u }, { tipo: 'ret', x0: 540 - tot / 2, y0: 545 + (140 - 46 * 0.9) * u, x1: 540 + tot / 2, y1: 545 + (140 + 50 * 0.9) * u }];
  }
  function fechoCena(c, t, f) {
    if (!f || t < f.t0) return;
    const uf = 1 - E.in(p(t, f.logo - 0.35, f.logo));
    const l1 = E.back(p(t, f.nova, f.nova + 0.4), 2), l2 = E.back(p(t, f.segundos, f.segundos + 0.4), 2);
    if (uf > 0 && l1 > 0) { c.save(); c.globalAlpha = uf; c.translate(540, 300); c.scale(l1, l1); partes(c, [['Reserva nova,', C.white]], 0, 0, 100, 980, -3); c.restore(); }
    if (uf > 0 && l2 > 0) { c.save(); c.globalAlpha = uf; c.translate(540, 412); c.scale(l2, l2); partes(c, [['em segundos.', C.lime]], 0, 0, 100, 980, -3); c.restore(); }
    if (t < f.logo) return;
    const u = E.back(p(t, f.logo, f.logo + 0.55), 2);
    const bt = Math.max(0, t - f.logo), pulso = 1 + 0.018 * Math.exp(-((bt % 0.5) / 0.12));
    const ui = p(t, f.logo, f.logo + 0.6);
    if (ui > 0 && ui < 1) { c.beginPath(); c.arc(540, 450, 100 + 560 * E.out(ui), 0, TAU); c.strokeStyle = rgba(C.lime, 1 - ui); c.lineWidth = 24 * (1 - ui); c.stroke(); }
    const ua2 = (bt % 2) / 2;
    if (bt > 0.6) { c.beginPath(); c.arc(540, 420, 150 + 28 * E.out(ua2), 0, TAU); c.strokeStyle = rgba(C.lime, 0.4 * (1 - ua2)); c.lineWidth = 5; c.stroke(); }
    c.save(); c.translate(540, 545); c.scale(clamp(u, 0, 1.2) * pulso, clamp(u, 0, 1.2) * pulso); logo(c, 0, -125, 260); nome(c, 0, 140, 0.9); c.restore();
    const linha = (s, y, t0, cor, size0) => {
      const v = E.back(p(t, t0, t0 + 0.4), 2); if (v <= 0) return;
      let size = size0; font(c, D, size, 900, -1.5); const w = c.measureText(s).width; if (w > 960) size = size0 * 960 / w;
      c.save(); c.translate(540, y); c.scale(v, v); txt(c, s, 0, 0, { size, weight: 900, align: 'center', color: cor, ls: -1.5 }); c.restore();
    };
    linha('E no começo,', 930, f.comeco, C.white, 72);
    linha('a FAZLO configura tudo com você.', 1020, f.configura, C.lime, 72);
    const ua = E.out(p(t, f.arroba, f.arroba + 0.5));
    if (ua > 0) txt(c, '@fazlohospeda', 540, 1170, { fam: MONO, size: 46, weight: 700, align: 'center', color: C.gray, alpha: ua });
  }

  // ------------------------------------------------------------------ legenda (palavra por palavra)
  function linhasLegenda(c, pg) {
    const size = 66, maxW = 900; font(c, D, size, 900, -1.2);
    const linhas = [[]]; let lw = 0;
    for (const w of pg.palavras) {
      const ww = c.measureText(w.w + ' ').width;
      if (lw + ww > maxW && linhas[linhas.length - 1].length) { linhas.push([]); lw = 0; }
      linhas[linhas.length - 1].push({ ...w, ww }); lw += ww;
    }
    return linhas;
  }
  function legenda(c, t) {
    const pg = (PLANO.legenda || []).find((g) => t >= g.t0 && t < g.t1);
    if (!pg) return;
    const size = 66, lh = 78, linhas = linhasLegenda(c, pg);
    const y0 = 1490 - (linhas.length - 1) * lh / 2;
    linhas.forEach((ln, i) => {
      font(c, D, size, 900, -1.2);
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
    fundo(c, t);
    for (const s of PLANO.telas) tela(c, s, t);
    balao(c, t, PLANO.balao); titulo(c, t, PLANO.titulo);
    cronometro(c, t, PLANO.crono);
    fechoCena(c, t, PLANO.fecho);
    legenda(c, t);
  }
  function eventos() {
    const ev = [], P = PLANO, b = P.balao, m = P.titulo, cr = P.crono, f = P.fecho;
    ev.push({ t: 0.05, tipo: 'pop' }, { t: b.datas, tipo: 'tick' }, { t: m.t0, tipo: 'whoosh' }, { t: cr.entra, tipo: 'pop' }, { t: cr.D, tipo: 'largada' });
    cr.parciais.forEach((pp) => ev.push({ t: cr.D + pp.t, tipo: 'check' }));
    ev.push({ t: cr.D + cr.total, tipo: 'impacto' });
    for (const s of P.telas) {
      (s.cam || []).forEach((k) => { if ((k.d || 0) > 0.1 && k.z > 1.05) ev.push({ t: k.t, tipo: 'zoom' }); });
      (s.aneis || []).forEach((r) => ev.push({ t: r.t + 0.05, tipo: 'tick' }));
      (s.saltos || []).forEach((j) => { ev.push({ t: j.t, tipo: 'pop' }, { t: j.ate, tipo: 'volta' }); (j.marcas || []).forEach((mm) => ev.push({ t: mm.t + 0.03, tipo: 'tick' })); });
      (s.toques || []).forEach((q) => ev.push({ t: q.t, tipo: 'toque' }));
      (s.paginas || []).forEach((e) => ev.push({ t: e.t, tipo: e.lado ? 'whoosh' : 'desliza' }));
      (s.rolagem || []).forEach((k) => { if ((k.d || 0) > 0.1) ev.push({ t: k.t, tipo: 'desliza' }); });
      (s.digita || []).forEach((e) => { for (let i = 0; i < e.n; i += 2) ev.push({ t: e.t + (i / e.n) * (e.fim - e.t), tipo: 'tecla' }); });
    }
    ev.push({ t: f.nova, tipo: 'pop' }, { t: f.segundos, tipo: 'pop' }, { t: f.logo, tipo: 'impacto' }, { t: f.comeco, tipo: 'pop' }, { t: f.configura, tipo: 'check' }, { t: f.arroba, tipo: 'sino' });
    return ev.sort((a, b2) => a.t - b2.t);
  }
  window.CURTO = {
    eventos: () => eventos(),
    plano: () => ({ telas: PLANO.telas.map((s) => ({ img: s.img, t0: s.t0, t1: s.t1 })), crono: { D: PLANO.crono.D, total: PLANO.crono.total },
      legenda: PLANO.legenda.map((g) => ({ t0: g.t0, t1: g.t1, texto: g.palavras.map((w) => w.w).join(' ') })) }),
    // o que aparece na tela do celular no instante t (para as conferências): as imagens e a rolagem
    naTela: (t) => { const s = PLANO.telas[0]; if (t < s.t0 || t >= s.t1) return null; return { camadas: camadas(s, t).map((L) => ({ img: L.img, a: +L.a.toFixed(2), lado: +L.lado.toFixed(2), fixos: L.fixos || null })), rolagem: Math.round(rolagem(s, t)) }; },
    relogio: (t) => relogio(PLANO.crono, t),
    marca: (t) => {
      const f = PLANO.fecho, L = geoLogo(t, f);
      const cr = PLANO.crono, ab = t >= cr.entra && t < cr.some + 0.4;
      return { logo: L.length > 0, cronometro: ab, folga: ab && L.length ? 0 : 1e9 };
    },
    legendaCaixa: (t) => {
      const pg = (PLANO.legenda || []).find((g) => t >= g.t0 && t < g.t1); if (!pg) return null;
      const linhas = linhasLegenda(med(), pg), lh = 78, y0 = 1490 - (linhas.length - 1) * lh / 2;
      const larg = Math.max(...linhas.map((l) => l.reduce((a, w) => a + w.ww, 0)));
      return [540 - larg / 2, y0 - 56, 540 + larg / 2, y0 + (linhas.length - 1) * lh + 20, linhas.length];
    },
    caixas: (t) => {
      const out = { janelas: [], toques: [] };
      for (const s of PLANO.telas) {
        if (t < s.t0 || t >= s.t1) continue;
        const q = cam(s, t);
        for (const j of s.saltos || []) if (t >= j.t + 0.45 && t <= j.ate) { const { larg, alt, cy } = geoJanela(j); out.janelas.push([540 - larg / 2, cy - alt / 2, 540 + larg / 2, cy + alt / 2]); }
        for (const tq of s.toques || []) if (t >= tq.t - 0.15 && t <= tq.t + 0.6) { const P = mapa(q, tq.x, tq.pagina ? tq.y - rolagem(s, tq.t) : tq.y); out.toques.push([P.x, P.y, tq.onda || 1]); }
      }
      return out;
    },
    alvo: (si, ret, t, pagina) => { const s = PLANO.telas[si]; return { ret: naTela(s, ret, t, pagina), rolagem: rolagem(s, t), camadas: camadas(s, t).filter((L) => L.a > 0.5).map((L) => L.img) }; },
    init(imgs, logo, plano) { IMG = imgs; LOGO = logo; PLANO = plano; DUR = plano.duracao; },
    renderAt(c, t) { frame(c, Math.min(Math.max(t, 0), DUR - 1e-4)); },
    get DURATION() { return DUR; },
  };
})();
