/*
 * FAZLO Hospeda na prática, episódio 5: A pousada num olhar (1080×1920, 60 fps).
 * Motor dos episódios 2 a 4 (fundo, aparelho, câmera, contornos, toques, janelas que saltam, legenda palavra por palavra),
 * com o que este episódio pede: o celular NÃO troca de tela. A tela Início rola dentro dele.
 *   - Cada estado é a PÁGINA inteira (telas/pg-*.png, 1170 × altura), recortada na rolagem do instante; o cabeçalho e a barra
 *     de baixo (fixos no app) vêm da captura do celular no topo (telas/vp-inicio.png). scripts/conferir-montagem.py confere
 *     que essa montagem dá a mesma imagem que a captura do celular em cada rolagem usada.
 *   - As medidas (alvos.json) estão em px da página; na tela, y − rolagem. As do cabeçalho e da barra ficam fixas (fixo: true).
 *   - Estrutura pergunta e resposta: a pergunta entra grande em cima do celular, a resposta salta numa janela (com marcas
 *     dentro dela) e a pergunta respondida vira um selinho "✓" na fileira do alto. No fecho, os selinhos cercam o celular.
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
  // texto em pedaços [[texto, cor], ...], centrado; reduz para caber em maxW
  function partes(c, pedacos, x, y, size, maxW = 980, ls = -2) {
    font(c, D, size, 900, ls); let tot = pedacos.reduce((a, [s]) => a + c.measureText(s).width, 0);
    if (tot > maxW) { size = size * maxW / tot; font(c, D, size, 900, ls); tot = pedacos.reduce((a, [s]) => a + c.measureText(s).width, 0); }
    let xx = x - tot / 2;
    for (const [s, cor] of pedacos) { xx += txt(c, s, xx, y, { size, weight: 900, ls, color: cor }); }
    return { w: tot, size };
  }

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

  // ------------------------------------------------------------------ o aparelho, a rolagem e a câmera
  // câmera: z (1 = celular inteiro), fx/fy = ponto da TELA do celular (px da captura do celular) que fica na âncora
  const BASE = 880 / IH;                                         // altura da tela inteira: 880 px no vídeo
  const ANC = { x: 540, y: 905 };
  const PALCO = { y0: 450, y1: 1360 };                           // em cima: selinhos e pergunta; embaixo: a legenda
  const CAB = 192, BARRA = 2337;                                 // cabeçalho e barra de baixo do app (fixos), px do celular
  function interp(chaves, t, ini, campo) {                       // valor de um campo animado por chaves {t, d, [campo]}
    let v = ini;
    for (const k of chaves || []) { if (t < k.t) break; v = lerp(v, k[campo], E.io(p(t, k.t, k.t + (k.d || 0.55)))); }
    return v;
  }
  const rolagem = (s, t) => interp(s.rolagem, t, 0, 'y');
  function cam(s, t) {
    let cur = { z: 1, fx: IW / 2, fy: IH / 2 };
    for (const k of s.cam || []) {
      if (t < k.t) break;
      const u = E.io(p(t, k.t, k.t + (k.d || 0.55)));
      cur = { z: lerp(cur.z, k.z, u), fx: IW / 2, fy: lerp(cur.fy, k.fy ?? IH / 2, u) };
    }
    const kk = BASE * cur.z, lo = (ANC.y - PALCO.y0) / kk, hi = IH - (PALCO.y1 - ANC.y) / kk;
    cur.fy = lo < hi ? clamp(cur.fy, lo, hi) : IH / 2;
    return cur;
  }
  const mapa = (q, x, y) => { const k = BASE * q.z; return { x: ANC.x + (x - q.fx) * k + (q.dx || 0), y: ANC.y + (y - q.fy) * k + (q.dy || 0), k }; };
  // retângulo da página → retângulo na tela do celular (no instante t)
  const naTela = (s, r, t, fixo) => (fixo ? r : [r[0], r[1] - rolagem(s, t), r[2], r[3] - rolagem(s, t)]);
  function paginaCamadas(s, t) {                                  // imagens da página no instante t, com a opacidade de cada uma
    const out = [{ img: s.img, a: 1 }];
    for (const e of s.paginas || []) { if (t < e.t) break; out.push({ img: e.img, a: p(t, e.t, e.t + (e.d || 0.25)) }); }
    return out;
  }
  function aparelho(c, s, t, q) {
    const a = mapa(q, 0, 0), k = a.k, w = IW * k, h = IH * k, pad = 15 * Math.max(0.6, q.z), rad = 128 * k;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 60; c.shadowOffsetY = 24;
    rr(c, a.x - pad, a.y - pad, w + 2 * pad, h + 2 * pad, rad + pad); c.fillStyle = C.bezel; c.fill();
    c.shadowColor = 'transparent';
    rr(c, a.x - pad, a.y - pad, w + 2 * pad, h + 2 * pad, rad + pad); c.strokeStyle = '#3A3D37'; c.lineWidth = 2.5; c.stroke();
    c.save(); rr(c, a.x, a.y, w, h, rad); c.clip();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    const sy = rolagem(s, t);
    for (const L of paginaCamadas(s, t)) {
      if (L.a <= 0) continue; const im = IMG[L.img], y = clamp(sy, 0, im.height - IH);
      c.globalAlpha = L.a; c.drawImage(im, 0, y, IW, IH, a.x, a.y, w, h); c.globalAlpha = 1;
    }
    const vi = IMG['vp-inicio'];                                  // cabeçalho e barra de baixo, fixos
    c.drawImage(vi, 0, 0, IW, CAB, a.x, a.y, w, CAB * k);
    c.drawImage(vi, 0, BARRA, IW, IH - BARRA, a.x, a.y + BARRA * k, w, (IH - BARRA) * k);
    for (const r of s.aneis || []) anel(c, s, q, r, t, a);
    const esc = s.escuro ? interp(s.escuro, t, s.escuro0 || 0, 'a') : 0;   // a tela escurecida do gancho
    if (esc > 0) { c.fillStyle = `rgba(10,10,10,${esc})`; c.fillRect(a.x, a.y, w, h); }
    c.restore();
    for (const tq of s.toques || []) toque(c, s, q, tq, t);
    c.restore();
  }
  function anel(c, s, q, r, t, a) {
    if (t < r.t || t > (r.ate ?? 1e9) + 0.3) return;
    const u = E.out(p(t, r.t, r.t + 0.4)), sai = r.ate != null ? p(t, r.ate, r.ate + 0.3) : 0;
    const [x0, y0, x1, y1] = naTela(s, r.ret, t, r.fixo), A = mapa(q, x0, y0), B = mapa(q, x1, y1), pad = 10;
    const cor = r.cor === 'ambar' ? C.amber : C.lime;
    c.save(); c.globalAlpha *= 1 - sai;
    if (r.escurece !== false) {
      c.beginPath(); c.rect(a.x - 50, a.y - 50, IW * a.k + 100, IH * a.k + 100); c.roundRect(A.x - pad, A.y - pad, B.x - A.x + 2 * pad, B.y - A.y + 2 * pad, 18);
      c.fillStyle = `rgba(10,10,10,${0.5 * u})`; c.fill('evenodd');
    }
    const per = 2 * (B.x - A.x + B.y - A.y + 4 * pad);
    rr(c, A.x - pad, A.y - pad, B.x - A.x + 2 * pad, B.y - A.y + 2 * pad, 18);
    c.setLineDash([per * u, per]); c.strokeStyle = cor; c.lineWidth = 7; c.shadowColor = cor; c.shadowBlur = 22; c.stroke();
    c.restore();
  }
  function toque(c, s, q, tq, t) {
    const d = t - tq.t; if (d < -0.15 || d > 0.6) return;
    const [x, y] = tq.fixo ? [tq.x, tq.y] : [tq.x, tq.y - rolagem(s, tq.t)];
    const P = mapa(q, x, y);
    const sc = tq.onda || 1, ap = clamp((d + 0.15) / 0.15), r = (34 + 70 * E.out(clamp(d / 0.6))) * sc;
    c.save();
    c.globalAlpha = d < 0 ? ap : 1 - clamp(d / 0.6);
    c.beginPath(); c.arc(P.x, P.y, (d < 0 ? 34 : 30) * sc, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
    c.strokeStyle = 'rgba(10,10,10,0.5)'; c.lineWidth = 3; c.stroke();
    if (d >= 0) { c.beginPath(); c.arc(P.x, P.y, r, 0, TAU); c.strokeStyle = C.lime; c.lineWidth = 6; c.stroke(); }
    c.restore();
  }
  // janela que salta da tela: o pedaço da própria página, ampliado, com borda limão (ou âmbar), e marcas dentro dela
  const geoJanela = (j) => { const [x0, y0, x1, y1] = j.ret, larg = j.larg || 940, alt = larg * (y1 - y0) / (x1 - x0), cy = j.cy || 760; return { larg, alt, cy }; };
  function salto(c, s, t, q, j) {
    if (t < j.t || t > j.ate + 0.4) return;
    const ent = E.back(p(t, j.t, j.t + 0.5)), sai = E.in(p(t, j.ate, j.ate + 0.35));
    const u = clamp(ent * (1 - sai), 0, 1.2);
    const [x0, y0, x1, y1] = j.ret, [v0, w0, v1, w1] = naTela(s, j.ret, j.t, false), A = mapa(q, v0, w0), B = mapa(q, v1, w1);
    const { larg, alt, cy } = geoJanela(j), cx = 540;
    const x = lerp(A.x, cx - larg / 2, u), y = lerp(A.y, cy - alt / 2, u), w = lerp(B.x - A.x, larg, u), h = lerp(B.y - A.y, alt, u);
    const cor = j.cor === 'ambar' ? C.amber : C.lime;
    c.save();
    if (j.fundo !== false) { c.fillStyle = `rgba(10,10,10,${0.55 * clamp(u)})`; c.fillRect(0, 0, W, H); }
    c.translate(x + w / 2, y + h / 2); c.rotate((j.giro ?? -1.2) * Math.PI / 180 * clamp(u)); c.translate(-(x + w / 2), -(y + h / 2));
    c.shadowColor = 'rgba(0,0,0,0.65)'; c.shadowBlur = 50; c.shadowOffsetY = 20;
    rr(c, x, y, w, h, 26); c.fillStyle = '#fff'; c.fill(); c.shadowColor = 'transparent';
    c.save(); rr(c, x, y, w, h, 26); c.clip(); c.imageSmoothingQuality = 'high';
    c.drawImage(IMG[j.img || s.img], x0, y0, x1 - x0, y1 - y0, x, y, w, h);
    // marcas: contornos dentro da janela, na hora da palavra
    const kx = w / (x1 - x0), ky = h / (y1 - y0);
    for (const m of j.marcas || []) {
      if (t < m.t) continue;
      const um = E.out(p(t, m.t, m.t + 0.35)), mc = m.cor === 'ambar' ? C.amber : C.lime, pd = 8;
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
    const us = p(t, s.t1 - 0.4, s.t1);                            // saída: o celular encolhe e some (o fecho entra no lugar)
    c.save(); c.globalAlpha = 1 - E.in(us);
    if (us > 0) { c.translate(540, ANC.y); c.scale(1 - 0.25 * E.in(us), 1 - 0.25 * E.in(us)); c.translate(-540, -ANC.y); }
    c.save(); c.beginPath(); c.rect(0, PALCO.y0, W, PALCO.y1 - PALCO.y0); c.clip();
    aparelho(c, s, t, q);
    c.restore();
    if (q.z > 1.02) {                                              // bordas suaves do palco quando a câmera aproxima
      const a = clamp((q.z - 1) / 0.3);
      for (const [y0, y1] of [[PALCO.y0, PALCO.y0 + 90], [PALCO.y1, PALCO.y1 - 90]]) {
        const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgba(C.bg, a)); g.addColorStop(1, rgba(C.bg, 0));
        c.fillStyle = g; c.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
      }
    }
    c.restore();
    for (const j of s.saltos || []) salto(c, s, t, q, j);
  }
  function retCelular(s, t) {                                      // o celular inteiro (com a moldura) na tela do vídeo
    const q = cam(s, t), a = mapa(q, 0, 0), b = mapa(q, IW, IH), pad = 15 * Math.max(0.6, q.z);
    return [a.x - pad, Math.max(PALCO.y0, a.y - pad), b.x + pad, Math.min(PALCO.y1, b.y + pad)];
  }

  // ------------------------------------------------------------------ gancho, título, perguntas e selinhos
  function gancho(c, t, g) {                                       // desde o quadro 0: a frase do dia corrido em cima do celular
    if (!g || t >= g.t1) return;
    const sai = E.in(p(t, g.t1 - 0.35, g.t1)), pz = 1 + 0.012 * Math.sin(t * 6);
    c.save(); c.globalAlpha = 1 - sai; c.translate(540, 300); c.scale(pz, pz);
    partes(c, [['Dia corrido na pousada,', C.white]], 0, 0, 84, 980, -2.5);
    partes(c, [['e as perguntas ', C.white], ['não param.', C.lime]], 0, 100, 84, 980, -2.5);
    c.restore();
    // três "?" piscam em volta do celular em "perguntas"
    [[250, 640, -0.2, 0], [850, 760, 0.18, 0.14], [230, 1080, 0.1, 0.28]].forEach(([x, y, giro, dt]) => {
      const u = E.back(p(t, g.perguntas + dt, g.perguntas + dt + 0.3), 3) * (1 - p(t, g.t1 - 0.6, g.t1 - 0.2));
      if (u <= 0) return;
      c.save(); c.translate(x, y); c.scale(u, u); c.rotate(giro);
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 24; c.beginPath(); c.arc(0, 0, 52, 0, TAU); c.fillStyle = C.lime; c.fill(); c.shadowColor = 'transparent';
      txt(c, '?', 0, 25, { size: 72, weight: 900, align: 'center', color: C.ink }); c.restore();
    });
  }
  function seloSerie(c, x, y, a) {
    font(c, MONO, 32, 700, 2); const w = c.measureText('FAZLO Hospeda na prática').width + 84;
    c.save(); c.globalAlpha *= a; rr(c, x - w / 2, y - 34, w, 68, 34); c.fillStyle = 'rgba(22,26,24,0.92)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(x - w / 2 + 32, y, 8, 0, TAU); c.fillStyle = C.lime; c.fill();
    txt(c, 'FAZLO Hospeda na prática', x - w / 2 + 56, y + 11, { fam: MONO, size: 32, weight: 700, color: '#E8EAE4', ls: 2 }); c.restore();
  }
  function titulo(c, t, m) {                                       // o selo da série e o título, em cima do celular
    if (!m || t < m.t0 || t >= m.t1) return;
    const sai = E.in(p(t, m.t1 - 0.35, m.t1));
    const us = E.out(p(t, m.t0, m.t0 + 0.4));
    c.save(); c.globalAlpha = 1 - sai; c.translate(0, -40 * sai);
    if (us > 0) seloSerie(c, 540, 205 - 20 * (1 - us), us);
    const ut = E.back(p(t, m.fazlo, m.fazlo + 0.45), 2);
    if (ut > 0) { c.save(); c.translate(540, 370); c.scale(ut, ut); partes(c, [['A pousada ', C.white], ['num olhar', C.lime]], 0, 0, 104, 980, -3); c.restore(); }
    c.restore();
  }
  // selinho "✓": pílula escura, ponto limão com o visto, texto mono
  function chipGeo(s) { const c = med(); font(c, MONO, 28, 700, 1); return c.measureText(s).width + 86; }
  function chip(c, x, y, s, esc, a = 1) {
    if (esc <= 0.001 || a <= 0) return;
    const w = chipGeo(s), h = 62;
    c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(esc, esc);
    rr(c, -w / 2, -h / 2, w, h, h / 2); c.fillStyle = 'rgba(24,27,23,0.95)'; c.fill(); c.strokeStyle = rgba(C.lime, 0.55); c.lineWidth = 2.5; c.stroke();
    const cx = -w / 2 + 33; c.beginPath(); c.arc(cx, 0, 17, 0, TAU); c.fillStyle = C.lime; c.fill();
    c.beginPath(); c.moveTo(cx - 8, 0); c.lineTo(cx - 2, 7); c.lineTo(cx + 9, -7); c.strokeStyle = C.ink; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
    txt(c, s, -w / 2 + 60, 10, { fam: MONO, size: 28, weight: 700, color: C.white, ls: 1 }); c.restore();
  }
  // posições: duas fileiras no alto (4 + 3) e, no fecho, duas colunas em volta do celular (4 à esquerda, 3 à direita)
  const FIL = [182, 256];
  function vagas(lista) {
    const ws = lista.map((q) => chipGeo(q.chip)), gap = 18, rows = [[0, 1, 2, 3], [4, 5, 6]], out = [];
    rows.forEach((r, i) => { const tot = r.reduce((a, k) => a + ws[k], 0) + gap * (r.length - 1); let x = 540 - tot / 2; r.forEach((k) => { out[k] = { x: x + ws[k] / 2, y: FIL[i], w: ws[k] }; x += ws[k] + gap; }); });
    return out;
  }
  function vagasFecho(lista) {
    const ws = lista.map((q) => chipGeo(q.chip)), esq = [0, 2, 4, 6], dir = [1, 3, 5], out = [];
    esq.forEach((k, i) => { out[k] = { x: 30 + ws[k] / 2, y: 640 + i * 150, w: ws[k] }; });
    dir.forEach((k, i) => { out[k] = { x: 1050 - ws[k] / 2, y: 715 + i * 150, w: ws[k] }; });
    return out;
  }
  const QY = 400;                                                  // linha de base da pergunta
  function chipEstado(t, k) {                                      // posição, escala e opacidade do selinho k no instante t
    const P = PLANO.perguntas, f = PLANO.fecho, q = P[k], v = vagas(P)[k], vf = vagasFecho(P)[k];
    const ue = clamp(E.back(p(t, q.t1 + 0.2, q.t1 + 0.55), 2.4), 0, 1.2);
    if (ue <= 0) return null;
    // no fecho, o selinho some da fileira e reaparece em volta do celular (sem passar por cima da tela)
    const sai = E.in(p(t, f.logo - 0.35, f.logo));
    if (t < f.t0 + 0.25) return { x: v.x, y: v.y, esc: ue * (1 - E.in(p(t, f.t0, f.t0 + 0.22))), a: 1, w: v.w, h: 62 };
    const uv = clamp(E.back(p(t, f.t0 + 0.25 + k * 0.07, f.t0 + 0.65 + k * 0.07), 2.4), 0, 1.2);
    return uv > 0 ? { x: vf.x, y: vf.y, esc: uv, a: 1 - sai, w: vf.w, h: 62 } : null;
  }
  function perguntas(c, t) {
    const P = PLANO.perguntas;
    P.forEach((q, k) => {
      if (t < q.t0 || t > q.t1 + 0.5) return;
      const ue = E.back(p(t, q.t0, q.t0 + 0.4), 2), um = E.io(p(t, q.t1, q.t1 + 0.45));
      const v = vagas(P)[k], x = lerp(540, v.x, um), y = lerp(QY, v.y + 10, um), esc = clamp(ue, 0, 1.15) * lerp(1, 0.32, um);
      c.save(); c.globalAlpha = clamp(ue * 2) * (1 - um); c.translate(x, y); c.scale(esc, esc);
      const tl = q.texto.indexOf(q.lime), ped = [[q.texto.slice(0, tl), C.white], [q.lime, C.lime], [q.texto.slice(tl + q.lime.length), C.white]].filter(([s]) => s);
      partes(c, ped, 0, 0, 88, 1000, -2.5); c.restore();
    });
    P.forEach((q, k) => { const e = chipEstado(t, k); if (e) chip(c, e.x, e.y, q.chip, e.esc, e.a); });
  }

  // ------------------------------------------------------------------ fecho
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
  function geoLogo(t, f) {                                         // a área do logo (símbolo + nome) no instante t, para a conferência
    const u = clamp(E.back(p(t, f.logo, f.logo + 0.55), 2), 0, 1.2); if (u <= 0.001) return [];
    const c = med(); font(c, D, 112, 900, -2); const wf = c.measureText('FAZLO').width; font(c, D, 62, 800, -0.5);
    const tot = (wf + 26 + c.measureText('Hospeda').width + 64) * 0.9 * u;
    return [{ tipo: 'circulo', cx: 540, cy: 545 - 125 * u, r: 140 * u }, { tipo: 'ret', x0: 540 - tot / 2, y0: 545 + (140 - 46 * 0.9) * u, x1: 540 + tot / 2, y1: 545 + (140 + 50 * 0.9) * u }];
  }
  function fechoCena(c, t, f) {
    if (!f || t < f.t0) return;
    // "Uma tela, o dia inteiro." em cima do celular, com os selinhos em volta
    const uf = 1 - E.in(p(t, f.logo - 0.35, f.logo));
    const l1 = E.back(p(t, f.umatela, f.umatela + 0.4), 2), l2 = E.back(p(t, f.diainteiro, f.diainteiro + 0.4), 2);
    if (uf > 0 && l1 > 0) { c.save(); c.globalAlpha = uf; c.translate(540, 300); c.scale(l1, l1); partes(c, [['Uma tela,', C.white]], 0, 0, 100, 980, -3); c.restore(); }
    if (uf > 0 && l2 > 0) { c.save(); c.globalAlpha = uf; c.translate(540, 412); c.scale(l2, l2); partes(c, [['o dia inteiro.', C.lime]], 0, 0, 100, 980, -3); c.restore(); }
    // a logo estoura
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
    gancho(c, t, PLANO.gancho); titulo(c, t, PLANO.titulo);
    perguntas(c, t);
    fechoCena(c, t, PLANO.fecho);
    legenda(c, t);
  }
  function eventos() {
    const ev = [], P = PLANO, g = P.gancho, m = P.titulo, f = P.fecho;
    ev.push({ t: 0.05, tipo: 'pop' }); [0, 0.14, 0.28].forEach((dt) => ev.push({ t: g.perguntas + dt, tipo: 'pop' }));
    ev.push({ t: m.t0, tipo: 'whoosh' }, { t: m.fazlo - 0.05, tipo: 'impacto' });
    P.perguntas.forEach((q) => ev.push({ t: q.t0, tipo: 'pop' }, { t: q.t1 + 0.05, tipo: 'whoosh' }, { t: q.t1 + 0.3, tipo: 'check' }));
    for (const s of P.telas) {
      (s.cam || []).forEach((k) => { if ((k.d || 0) > 0.1 && k.z > 1) ev.push({ t: k.t, tipo: 'zoom' }); });
      (s.rolagem || []).forEach((k) => ev.push({ t: k.t, tipo: 'desliza' }));
      (s.aneis || []).forEach((r) => ev.push({ t: r.t + 0.05, tipo: 'tick' }));
      (s.saltos || []).forEach((j) => { ev.push({ t: j.t, tipo: 'pop' }, { t: j.ate, tipo: 'volta' }); (j.marcas || []).forEach((mm) => ev.push({ t: mm.t + 0.03, tipo: 'tick' })); });
      (s.toques || []).forEach((q) => ev.push({ t: q.t, tipo: 'toque' }));
      (s.paginas || []).forEach((e) => ev.push({ t: e.t, tipo: 'desliza' }));
    }
    ev.push({ t: f.t0, tipo: 'whoosh' }, { t: f.umatela, tipo: 'pop' }, { t: f.diainteiro, tipo: 'pop' }, { t: f.logo, tipo: 'impacto' },
      { t: f.comeco, tipo: 'pop' }, { t: f.configura, tipo: 'check' }, { t: f.arroba, tipo: 'sino' });
    return ev.sort((a, b) => a.t - b.t);
  }
  const cruza = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  window.CURTO = {
    eventos: () => eventos(),
    plano: () => ({ telas: PLANO.telas.map((s) => ({ img: s.img, t0: s.t0, t1: s.t1 })), legenda: PLANO.legenda.map((g) => ({ t0: g.t0, t1: g.t1, texto: g.palavras.map((w) => w.w).join(' ') })) }),
    // marca: no instante t, a menor distância entre o logo e o que mais está na tela (selinhos e frases); e selinho × celular
    marca: (t) => {
      const f = PLANO.fecho, L = geoLogo(t, f), out = { folga: 1e9, logo: L.length > 0, selinhoCelular: [], selinhos: 0 };
      const chips = PLANO.perguntas.map((q, k) => chipEstado(t, k)).filter((e) => e && e.a > 0.01 && e.esc > 0.01)
        .map((e) => [e.x - e.w * e.esc / 2, e.y - e.h * e.esc / 2, e.x + e.w * e.esc / 2, e.y + e.h * e.esc / 2]);
      out.selinhos = chips.length;
      const s = PLANO.telas[0];
      if (t >= s.t0 && t < s.t1 - 0.4) { const R = retCelular(s, t); chips.forEach((b) => { if (cruza(b, R)) out.selinhoCelular.push(b.map(Math.round)); }); }
      for (const b of chips) for (const g of L) {
        let d;
        if (g.tipo === 'circulo') { const dx = Math.max(b[0] - g.cx, 0, g.cx - b[2]), dy = Math.max(b[1] - g.cy, 0, g.cy - b[3]); d = Math.hypot(dx, dy) - g.r; }
        else { const dx = Math.max(b[0] - g.x1, 0, g.x0 - b[2]), dy = Math.max(b[1] - g.y1, 0, g.y0 - b[3]); d = Math.hypot(dx, dy); }
        out.folga = Math.min(out.folga, d);
      }
      return out;
    },
    legendaCaixa: (t) => {
      const pg = (PLANO.legenda || []).find((g) => t >= g.t0 && t < g.t1); if (!pg) return null;
      const linhas = linhasLegenda(med(), pg), lh = 78, y0 = 1490 - (linhas.length - 1) * lh / 2;
      const larg = Math.max(...linhas.map((l) => l.reduce((a, w) => a + w.ww, 0)));
      return [540 - larg / 2, y0 - 56, 540 + larg / 2, y0 + (linhas.length - 1) * lh + 20, linhas.length];
    },
    caixas: (t) => {
      const out = { janelas: [], toques: [], perguntas: [] };
      for (const s of PLANO.telas) {
        if (t < s.t0 || t >= s.t1) continue;
        const q = cam(s, t);
        for (const j of s.saltos || []) if (t >= j.t + 0.5 && t <= j.ate) { const { larg, alt, cy } = geoJanela(j); out.janelas.push([540 - larg / 2, cy - alt / 2, 540 + larg / 2, cy + alt / 2]); }
        for (const tq of s.toques || []) if (t >= tq.t - 0.15 && t <= tq.t + 0.6) { const P = mapa(q, tq.x, tq.fixo ? tq.y : tq.y - rolagem(s, tq.t)); out.toques.push([P.x, P.y, tq.onda || 1]); }
      }
      return out;
    },
    // para a conferência dos toques e destaques: onde cada alvo está na tela do celular no instante, e qual página aparece
    alvo: (si, ret, t, fixo) => { const s = PLANO.telas[si]; return { ret: naTela(s, ret, t, fixo), rolagem: rolagem(s, t), camadas: paginaCamadas(s, t).filter((L) => L.a > 0.5).map((L) => L.img) }; },
    init(imgs, logo, plano) { IMG = imgs; LOGO = logo; PLANO = plano; DUR = plano.duracao; },
    renderAt(c, t) { frame(c, Math.min(Math.max(t, 0), DUR - 1e-4)); },
    get DURATION() { return DUR; },
  };
})();
