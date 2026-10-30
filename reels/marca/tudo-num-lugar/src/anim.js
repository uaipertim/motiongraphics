/*
 * FAZLO Hospeda — reel de marca "Tudo num lugar só" (1080×1920, 60 fps). Vídeo fixado no perfil e anúncio impulsionado.
 * Uma mensagem: o Hospeda junta numa ferramenta o que a pousada hoje controla espalhado no WhatsApp, no PIX e no caderno.
 * Uma chamada no fim: WhatsApp.
 *
 * NÃO mostra a interface do FAZLO Hospeda nem imita o layout dela; não usa dados da demonstração nem nome de hóspede.
 * Os cartões são ilustrativos e abstratos (preto, limão, branco). Valores só R$ 450 e R$ 1.020, sempre com o selo
 * "Exemplo fictício" no mesmo cartão.
 *
 * RITMO DE LEITURA: 7 cenas, uma por ideia; corte só quando a ideia muda. Dentro de cada cena, movimento contínuo e lento
 * (aproximação, deriva, giro leve). Toda palavra ou número de destaque fica ≥ 1,2 s parado depois de dito; nenhuma cena
 * tem menos de 2,5 s; o desfoque de movimento só aparece nas entradas (≤ 0,3 s), nunca sobre texto que precisa ser lido.
 *   gancho (a cena se monta: WhatsApp, PIX, caderno, o risco) · problema (quanto falta receber?) · virada (logo + "junta
 *   tudo isso:") · módulos (5 cartões em cascata 3D) · pedaços (R$ 450 → R$ 1.020) · fecho LIMÃO (os 5 módulos se
 *   encaixam no telaDestaque) · chamada (logo + botão + @fazlohospeda).
 *
 * Cartões 3D: textura projetada em perspectiva (grade de triângulos); a pose é uma função do tempo (determinística).
 * Em foco, sempre inclinados (rotateY −24° a −18°, rotateX 8° a 12°) e balançando devagar; o anterior recua (menor,
 * desfocado, mais escuro) quando entra o próximo; brilho limão atrás do cartão em foco.
 *
 * Legenda palavra por palavra (estilo do reel-09: Inter Display 900, branca, chaves em limão) na faixa y 1424–1536,
 * x 150–950 (54 px, linhas em y 1466/1524), SÓ nos módulos, nos pedaços e na chamada. Onde o texto grande da cena já
 * mostra a frase inteira (gancho, problema, virada, fecho), a faixa fica vazia.
 * Áreas seguras: nada em y > 1536 nem em x ≥ 950 entre y 1060 e 1560. A capa é desenhada à parte (REEL.capa).
 */
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const C = { bg: '#0A0A0A', card: '#141614', card2: '#1C1F1B', line: '#2C302B', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2',
    grayD: '#5E625B', ink: '#0A0A0A', red: '#FF5C5C' };
  const CAP = { size: 54, lh: 58, y1: 1466, maxW: 800, cx: 550, minPag: 1.5, segura: 0.8 };

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3), inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x, s = 1.70158) => (x <= 0 ? 0 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const css = (h, a = 1) => { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  let CENAS = [], M = null, LOGO = null, LN = null, DUR = 0, PREVIA = false, PAGES = [], IDS = {}, T = {}, BOXES = null, CARDS = {}, DEST = null, DEST_IMG = null;
  let L1 = null, L2 = null;                                        // as camadas do desfoque de movimento
  function BOX(nome, x0, y0, x1, y1) { if (BOXES) BOXES.push({ nome, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) }); }
  function setFont(c, fam, size, weight, ls = 0) { c.font = `${weight} ${size}px ${fam}`; c.letterSpacing = `${ls}px`; }
  function tw(s, fam, size, weight, ls = 0) { setFont(M, fam, size, weight, ls); return M.measureText(s).width - (s.length ? ls : 0); }
  function txt(c, s, x, y, o = {}) {
    const fam = o.fam || DISPLAY, size = o.size || 40, weight = o.weight || 700, ls = o.ls || 0;
    const w = tw(s, fam, size, weight, ls), x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    c.save(); setFont(c, fam, size, weight, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.globalAlpha *= o.alpha ?? 1; c.fillStyle = o.color || C.white;
    if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = o.blur || 22; }
    c.fillText(s, x0, y); c.restore();
    if (o.box) BOX(o.box, x0, y - 0.74 * size, x0 + w, y + 0.22 * size);
    return w;
  }
  const fit = (s, fam, weight, max, maxW, ls = -0.035) => { let z = max; while (z > 40 && tw(s, fam, z, weight, ls * z) > maxW) z -= 2; return z; };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }

  // ---------------------------------------------------------------- tempos: uma cena por ideia
  const at = (id, fb) => (id in IDS ? IDS[id] : fb);
  const fimDe = (id, fb) => (id in WID ? WID[id].t1 : fb);          // o fim da fala daquele token
  let WID = {};
  function tempos() {
    IDS = {}; WID = {};
    LN.frases.forEach((f) => f.palavras.forEach((w) => { if (w.id) { IDS[w.id] = w.t0; WID[w.id] = w; } }));
    // o fim de cada token com id (tokens de várias palavras, como "quanto falta"): a última palavra do mesmo token
    LN.frases.forEach((f) => f.palavras.forEach((w) => { const d = f.palavras.find((x) => x.tok === w.tok && x.id); if (d) WID[d.id] = { t0: d.t0, t1: w.t1 }; }));
    const F = Object.fromEntries(LN.frases.map((f) => [f.id, f]));
    const ini = (id) => Math.max(0, F[id].t0 - 0.2);                 // a cena entra 0,2 s antes da fala
    T = { F };
    const ordem = [['gancho', 'gancho'], ['problema', 'problema'], ['virada', 'virada'], ['modulos', 'modulos'], ['pedacos', 'pedacos'], ['fecho', 'fecho'], ['chamada', 'cta']];
    CENAS = ordem.map(([id, fid], i) => ({ id, frase: fid, t0: i ? ini(fid) : 0, t1: ordem[i + 1] ? ini(ordem[i + 1][1]) : DUR, legenda: F[fid].legenda !== false }));
    T.c = Object.fromEntries(CENAS.map((s) => [s.id, s.t0]));
    T.s = Object.fromEntries(CENAS.map((s) => [s.id, s]));
    // os pedaços: o R$ 1.020 só entra quando o R$ 450 já ficou 1,2 s legível depois de "pago"
    T.tCheckout = Math.max(at('falta2', T.c.pedacos + 2), fimDe('pago', T.c.pedacos + 1) + 1.25);
    T.fim = DUR;
  }
  const cenaDe = (t) => { let k = CENAS[0]; for (const s of CENAS) if (t >= s.t0) k = s; return k; };
  const ato = (t) => (t >= T.c.chamada ? 'chamada' : t >= T.c.fecho ? 'limao' : t >= T.c.virada ? 'solucao' : 'problema');
  const vida = (t, s, k = 1) => p(t, s.t0, s.t1) * k;                 // 0→1 ao longo da cena: o movimento contínuo

  // ---------------------------------------------------------------- ícones de traço (limão)
  function icon(c, nome, x, y, s, col, lw = 4) {
    c.save(); c.translate(x, y); c.scale(s / 48, s / 48); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    if (nome === 'calendario') {
      c.roundRect(-20, -16, 40, 36, 6); c.moveTo(-20, -4); c.lineTo(20, -4); c.moveTo(-10, -22); c.lineTo(-10, -11); c.moveTo(10, -22); c.lineTo(10, -11);
      c.stroke(); c.beginPath(); [[-9, 6], [0, 6], [9, 6], [-9, 14]].forEach(([a, b]) => c.rect(a - 2.5, b - 2.5, 5, 5)); c.fill();
    } else if (nome === 'moeda') {                                        // PIX / moeda: uma moeda com o cifrão
      c.arc(0, 0, 19, 0, TAU); c.moveTo(7, -8); c.bezierCurveTo(4, -12, -8, -12, -8, -5); c.bezierCurveTo(-8, 2, 8, -1, 8, 6); c.bezierCurveTo(8, 13, -5, 13, -8, 8);
      c.moveTo(0, -16); c.lineTo(0, -12); c.moveTo(0, 12); c.lineTo(0, 16); c.stroke();
    } else if (nome === 'sino') {                                         // o sino de recepção
      c.moveTo(-20, 12); c.lineTo(20, 12); c.moveTo(-16, 12); c.bezierCurveTo(-16, -10, 16, -10, 16, 12); c.moveTo(0, -6); c.lineTo(0, -12);
      c.moveTo(-4, -14); c.lineTo(4, -14); c.moveTo(-23, 18); c.lineTo(23, 18); c.stroke();
    } else if (nome === 'comanda') {
      c.moveTo(-15, -21); c.lineTo(15, -21); c.lineTo(15, 21); c.lineTo(10, 17); c.lineTo(5, 21); c.lineTo(0, 17); c.lineTo(-5, 21); c.lineTo(-10, 17); c.lineTo(-15, 21); c.closePath();
      c.moveTo(-8, -10); c.lineTo(8, -10); c.moveTo(-8, -2); c.lineTo(8, -2); c.moveTo(-8, 6); c.lineTo(2, 6); c.stroke();
    } else if (nome === 'caixa') {                                        // a caixa registradora: visor, teclas e gaveta
      c.roundRect(-20, -2, 40, 20, 4); c.moveTo(-14, -2); c.lineTo(-11, -16); c.lineTo(11, -16); c.lineTo(14, -2); c.moveTo(-6, -9); c.lineTo(6, -9);
      c.moveTo(-20, 10); c.lineTo(20, 10); c.moveTo(-4, 14); c.lineTo(4, 14); c.stroke();
    } else if (nome === 'balao') {
      c.moveTo(-20, -14); c.quadraticCurveTo(-20, -20, -14, -20); c.lineTo(14, -20); c.quadraticCurveTo(20, -20, 20, -14); c.lineTo(20, 6);
      c.quadraticCurveTo(20, 12, 14, 12); c.lineTo(-4, 12); c.lineTo(-14, 21); c.lineTo(-12, 12); c.quadraticCurveTo(-20, 12, -20, 6); c.closePath(); c.stroke();
      c.beginPath(); [-9, 0, 9].forEach((a) => { c.moveTo(a + 2.6, -4); c.arc(a, -4, 2.6, 0, TAU); }); c.fill();
    } else if (nome === 'caderno') {
      c.roundRect(-16, -21, 34, 42, 4); c.moveTo(-9, -21); c.lineTo(-9, 21); [-12, -2, 8].forEach((y) => { c.moveTo(-22, y); c.lineTo(-12, y); });
      c.moveTo(-3, -10); c.lineTo(11, -10); c.moveTo(-3, -2); c.lineTo(11, -2); c.stroke();
    } else if (nome === 'check') {
      c.moveTo(-14, 1); c.lineTo(-4, 11); c.lineTo(15, -10); c.stroke();
    }
    c.restore();
  }

  // ---------------------------------------------------------------- traços feitos à mão (risco e círculo)
  function risco(c, x0, x1, y, u, col, lw = 12, seed = 1) {
    if (u <= 0) return;
    const n = 40, xe = lerp(x0, x1, u);
    c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = lerp(x0, xe, i / n), k = (x - x0) / (x1 - x0);
      const yy = y + 9 * Math.sin(k * 5.2 + seed) * (0.6 + 0.4 * hash(seed)) - 10 * k + 4 * Math.sin(k * 17 + seed * 3);
      i ? c.lineTo(x, yy) : c.moveTo(x, yy);
    }
    c.stroke();
    // a volta do traço (o gesto de quem sublinha e volta)
    const u2 = p(u, 0.75, 1);
    if (u2 > 0) {
      c.beginPath();
      for (let i = 0; i <= 20; i++) { const k = 1 - 0.55 * (i / 20) * u2, x = lerp(x0, x1, k), yy = y + 16 - 12 * k + 5 * Math.sin(k * 9 + seed); i ? c.lineTo(x, yy) : c.moveTo(x, yy); }
      c.lineWidth = lw * 0.7; c.stroke();
    }
    c.restore();
  }
  function circulo(c, cx, cy, rx, ry, u, col, lw = 9, seed = 2) {
    if (u <= 0) return;
    const a0 = -2.6, a1 = a0 + TAU * 1.08 * u;
    c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath();
    for (let a = a0, i = 0; a <= a1; a += 0.04, i++) {
      const k = (a - a0) / (TAU * 1.08), r = 1 + 0.045 * Math.sin(a * 3 + seed) + 0.05 * k;
      const x = cx + rx * r * Math.cos(a), y = cy + ry * r * Math.sin(a) - 8 * k;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke(); c.restore();
  }

  // ---------------------------------------------------------------- fundo e selo
  function fundo(c, t) {
    const a = ato(t);
    if (a === 'limao') { c.fillStyle = C.lime; c.fillRect(0, 0, W, H); return; }
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    const gx = 540 + 140 * Math.sin(t * 0.37), gy = 860 + 110 * Math.cos(t * 0.29);
    let g = c.createRadialGradient(gx, gy, 0, gx, gy, 900);
    g.addColorStop(0, css(C.lime, a === 'solucao' ? 0.12 : 0.07)); g.addColorStop(1, css(C.lime, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(540, 900, 520, 540, 900, 1250);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function selo(c, x, y, size, cor = C.lime) {                 // "Exemplo fictício": tracejado, no mesmo cartão do valor
    const s = 'EXEMPLO FICTÍCIO', w = tw(s, MONO, size, 800, size * 0.12) + size * 1.6, h = size * 1.9;
    rr(c, x, y - h / 2, w, h, h * 0.3); c.strokeStyle = cor; c.lineWidth = Math.max(2, size * 0.11); c.setLineDash([size * 0.32, size * 0.24]); c.stroke(); c.setLineDash([]);
    txt(c, s, x + size * 0.8, y + size * 0.36, { fam: MONO, size, weight: 800, color: cor, ls: size * 0.12 });
    return [x, y - h / 2, x + w, y + h / 2];
  }

  // ---------------------------------------------------------------- 3D: projeção, textura em triângulos, desfoque
  const F3 = 1500, VX = 540, VY = 880;
  function rot(x, y, z, rx, ry, rz) {
    let c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c];
    c = Math.cos(rx); s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c];
    c = Math.cos(ry); s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c];
    return [x, y, z];
  }
  function ponto(card, P, u, v) {                              // (u, v) do cartão (0–1) -> tela
    const [x, y, z] = rot(card.w * (u - 0.5), card.h * (v - 0.5), 0, P.rx, P.ry, P.rz);
    const s = F3 / Math.max(80, F3 + z + P.z);
    return [VX + (P.x + x - VX) * s, VY + (P.y + y - VY) * s];
  }
  function grade(card, P, n) {
    const g = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) g.push(ponto(card, P, i / n, j / n));
    return g;
  }
  function tri(c, img, s0, s1, s2, d0, d1, d2) {
    const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
    if (Math.abs(den) < 1e-6) return;
    const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
    const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
    const cc = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
    const d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
    const e = d0[0] - a * s0[0] - cc * s0[1], f = d0[1] - b * s0[0] - d * s0[1];
    const mx = (d0[0] + d1[0] + d2[0]) / 3, my = (d0[1] + d1[1] + d2[1]) / 3, ex = (q) => { const dx = q[0] - mx, dy = q[1] - my, l = Math.hypot(dx, dy) || 1; return [q[0] + (dx / l) * 0.9, q[1] + (dy / l) * 0.9]; };
    const [q0, q1, q2] = [ex(d0), ex(d1), ex(d2)];
    c.save(); c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.lineTo(q2[0], q2[1]); c.closePath(); c.clip();
    c.transform(a, b, cc, d, e, f); c.drawImage(img, 0, 0); c.restore();
  }
  function desenhaPose(c, card, P) {                          // uma amostra: a textura na pose P, com a sombra do ângulo
    const n = 6, g = grade(card, P, n), tex = card.tex, sw = tex.width / n, sh = tex.height / n;
    const nz = rot(0, 0, -1, P.rx, P.ry, P.rz)[2];             // < 0: a frente está virada para a câmera
    const contorno = [g[0], g[n], g[(n + 1) * (n + 1) - 1], g[n * (n + 1)]];
    const poli = () => { c.beginPath(); contorno.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); };
    if (nz < 0) {
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const A = g[j * (n + 1) + i], B = g[j * (n + 1) + i + 1], Cc = g[(j + 1) * (n + 1) + i], D = g[(j + 1) * (n + 1) + i + 1];
        const a = [i * sw, j * sh], b = [(i + 1) * sw, j * sh], cq = [i * sw, (j + 1) * sh], d = [(i + 1) * sw, (j + 1) * sh];
        tri(c, tex, a, b, d, A, B, D); tri(c, tex, a, d, cq, A, D, Cc);
      }
      const sombra = clamp((1 + nz) * 0.85 * 0.75 + (P.escuro || 0));   // de lado (e quando recua), o cartão escurece
      if (sombra > 0.02) { poli(); c.fillStyle = `rgba(0,0,0,${clamp(sombra, 0, 0.85)})`; c.fill(); }
    } else { poli(); c.fillStyle = '#101210'; c.fill(); c.strokeStyle = css(C.lime, 0.35); c.lineWidth = 2; c.stroke(); }
    return { nz };
  }
  function bboxPts(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return [x0, y0, x1, y1]; }
  // o desfoque de movimento: amostras no obturador (0,8 quadro), proporcional à velocidade do canto mais rápido;
  // um cartão que está recuando (já desfocado pela profundidade) não ganha rastro
  function amostrasK(card, pose, t) {
    const P = pose(t), P0 = pose(t - 1 / 60);
    if (!P || !P0 || P.semRastro) return 1;
    const g1 = grade(card, P, 1), g0 = grade(card, P0, 1);
    const vel = Math.max(...g1.map((q, i) => Math.hypot(q[0] - g0[i][0], q[1] - g0[i][1])));
    return clamp(Math.ceil(vel / 6), 1, 9);
  }
  function brilho(c, card, P, a) {                            // o brilho limão sutil atrás do cartão em foco
    const [cx, cy] = ponto(card, P, 0.5, 0.5), r = card.w * 0.85;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, css(C.lime, 0.22 * a)); g.addColorStop(1, css(C.lime, 0));
    c.fillStyle = g; c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  }
  function cartao(c, card, pose, t) {
    const P = pose(t);
    if (!P || (P.a ?? 1) <= 0.002) return;
    if (P.brilho) brilho(c, card, P, P.brilho * (P.a ?? 1));
    const K = amostrasK(card, pose, t), obt = 0.8 / 60, borr = P.desfoque || 0;
    let res;
    if (K === 1 && borr < 0.3 && (P.a ?? 1) >= 0.999) res = desenhaPose(c, card, P);
    else {
      const amostras = Array.from({ length: K }, (_, k) => (K === 1 ? P : pose(t - (obt * k) / (K - 1)) || P));
      const bb = bboxPts(amostras.flatMap((q) => grade(card, q, 1))), m = 6 + borr * 3;
      const x0 = Math.max(0, Math.floor(bb[0] - m)), y0 = Math.max(0, Math.floor(bb[1] - m)), x1 = Math.min(W, Math.ceil(bb[2] + m)), y1 = Math.min(H, Math.ceil(bb[3] + m));
      if (x1 <= x0 || y1 <= y0) return;
      const l1 = L1.getContext('2d'), l2 = L2.getContext('2d');
      l1.setTransform(1, 0, 0, 1, 0, 0); l1.clearRect(x0, y0, x1 - x0, y1 - y0);
      amostras.forEach((q, k) => {
        l2.setTransform(1, 0, 0, 1, 0, 0); l2.clearRect(x0, y0, x1 - x0, y1 - y0); l2.globalAlpha = 1;
        const r = desenhaPose(l2, card, q); if (k === 0) res = r;
        l1.globalAlpha = 1 / (k + 1); l1.drawImage(L2, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);   // média corrida das amostras
      });
      l1.globalAlpha = 1;
      c.save(); c.globalAlpha *= P.a ?? 1; if (borr >= 0.3) c.filter = `blur(${borr.toFixed(1)}px)`;
      c.drawImage(L1, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); c.restore();
    }
    // caixas para a revisão: o cartão e, se tiver valor, o valor e o selo no mesmo cartão
    if (res && res.nz < 0 && (P.a ?? 1) > 0.5 && borr < 1) {
      const bb = bboxPts(grade(card, P, 1));
      BOX('cartão ' + card.id, ...bb);
      const reg = (r) => bboxPts([[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]].map(([u, v]) => ponto(card, P, u / card.w, v / card.h)));
      if (card.valor) BOX('valor ' + card.id, ...reg(card.valor));
      if (card.selo) BOX('selo ' + card.id, ...reg(card.selo));
    }
  }

  // ---------------------------------------------------------------- as texturas (ilustrativas, no estilo da marca; ~25% maiores)
  const ESC = 1.6;
  function textura(id, w, h, desenha) {
    const cv = document.createElement('canvas'); cv.width = Math.round(w * ESC); cv.height = Math.round(h * ESC);
    const c = cv.getContext('2d'); c.scale(ESC, ESC);
    const card = { id, w, h, tex: cv };
    rr(c, 0, 0, w, h, 36); c.fillStyle = C.card; c.fill();
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fill();
    rr(c, 1.5, 1.5, w - 3, h - 3, 35); c.strokeStyle = css(C.lime, 0.8); c.lineWidth = 3.5; c.stroke();
    desenha(c, card);
    return card;
  }
  const MOD = [['m-reservas', 'm1', 'calendario', 'Reservas'], ['m-sinal', 'm2', 'moeda', 'Sinal'], ['m-checkin', 'm3', 'sino', 'Check-in'],
    ['m-comanda', 'm4', 'comanda', 'Comanda'], ['m-caixa', 'm5', 'caixa', 'Caixa']];
  function criaCartoes() {
    CARDS = {};
    MOD.forEach(([id, , ic, nome], i) => {
      CARDS[id] = textura(id, 780, 168, (c) => {
        c.beginPath(); c.arc(92, 84, 54, 0, TAU); c.fillStyle = css(C.lime, 0.12); c.fill(); c.strokeStyle = css(C.lime, 0.85); c.lineWidth = 3; c.stroke();
        icon(c, ic, 92, 84, 64, C.lime, 4);
        txt(c, nome, 176, 110, { size: 80, weight: 900, ls: -2 });
        txt(c, String(i + 1).padStart(2, '0'), 736, 54, { fam: MONO, size: 26, weight: 800, color: C.grayD, align: 'right', ls: 2 });
      });
    });
    CARDS.sinal = textura('sinal', 900, 520, (c, card) => {
      icon(c, 'moeda', 86, 92, 60, C.lime, 4);
      txt(c, 'SINAL RECEBIDO', 140, 106, { fam: MONO, size: 38, weight: 800, color: C.white, ls: 5 });
      txt(c, 'R$ 450', 66, 330, { size: 215, weight: 900, color: C.lime, ls: -8 });
      card.valor = [66, 330 - 160, 66 + tw('R$ 450', DISPLAY, 215, 900, -8), 330 + 46];
      c.beginPath(); c.arc(796, 250, 50, 0, TAU); c.fillStyle = C.lime; c.fill(); icon(c, 'check', 796, 250, 58, C.ink, 6);
      card.selo = selo(c, 66, 460, 30);
    });
    CARDS.checkout = textura('checkout', 900, 520, (c, card) => {
      icon(c, 'sino', 86, 92, 60, C.lime, 4);
      txt(c, 'NO CHECK-OUT', 140, 106, { fam: MONO, size: 38, weight: 800, color: C.white, ls: 5 });
      txt(c, 'R$ 1.020', 66, 330, { size: 215, weight: 900, color: C.white, ls: -8 });
      card.valor = [66, 330 - 160, 66 + tw('R$ 1.020', DISPLAY, 215, 900, -8), 330 + 46];
      rr(c, 66, 378, 360, 12, 6); c.fillStyle = C.lime; c.fill();
      card.selo = selo(c, 66, 460, 30);
    });
  }

  // ---------------------------------------------------------------- texto grande da cena (mostra a frase inteira)
  // cada pedaço do texto marca, numa caixa "fala <frase> <i>-<j>", as palavras faladas que ele mostra (para o QA)
  function falaBox(frase, i, j, x0, y0, x1, y1) { BOX(`fala ${frase} ${i}-${j}`, x0, y0, x1, y1); }
  function bate(c, s, x, y, size, t0, o = {}) {                // a palavra bate na fala: escala + rastro só na entrada (0,22 s)
    const u = p(t, t0 - 0.04, t0 + 0.22);
    if (u <= 0) return 0;
    const v = E.outExpo(u), w = tw(s, DISPLAY, size, 900, o.ls ?? -0.035 * size);
    const ax = o.align === 'center' ? x : x + w / 2;
    for (let k = 3; k >= 0; k--) {
      if (k && v >= 0.98) continue;
      c.save(); c.globalAlpha *= k ? 0.16 * (1 - v) : clamp(v * 2.5);
      c.translate(ax + (1 - v) * 160 * (1 + k * 0.5), y); c.scale(lerp(1.3, 1, v), lerp(1.3, 1, v));
      txt(c, s, -w / 2, 0, { size, weight: 900, ls: o.ls ?? -0.035 * size, color: o.color || C.white });
      c.restore();
    }
    return w;
  }
  let t = 0;                                                   // o tempo do quadro (as cenas leem daqui)
  function ligacao(c, s, x, y, t0, o = {}) {                   // as palavras de ligação: menores, entram deslizando
    const u = E.outCubic(p(t, t0 - 0.12, t0 + 0.18));
    if (u <= 0) return 0;
    return txt(c, s, x + (o.align === 'center' ? 0 : -18 * (1 - u)), y, { size: o.size || 66, weight: 800, color: o.color || C.gray, alpha: u, align: o.align, ls: -1 });
  }
  function camera(c, s, cx, cy, k = 0.045) {                   // o movimento contínuo da cena: aproximação lenta + deriva
    const v = vida(t, s), z = 1 + k * E.inOutSine(v);
    c.translate(cx, cy); c.scale(z, z); c.rotate(-0.006 + 0.012 * v); c.translate(-cx, -cy - 10 * v);
  }

  // ---------------------------------------------------------------- 1. GANCHO (a cena se monta, sem cortes)
  const GANCHO = [['Reserva no', 'WhatsApp.', 'reserva', 'whats', 'balao', 0, 2], ['Sinal no', 'PIX.', 'sinal0', 'pix', 'moeda', 3, 5], ['Saldo no', 'caderno.', 'saldo0', 'caderno', 'caderno', 6, 8]];
  function gancho(c, s, capaFix) {
    c.save(); if (!capaFix) camera(c, s, 540, 860, 0.04);
    GANCHO.forEach(([lig, pal, idL, idP, ic, i0, ip], k) => {
      const yl = 480 + k * 300, yp = yl + 170, tl = capaFix ? -1 : (k === 0 ? 0 : at(idL)), tp = capaFix ? -1 : at(idP);
      const ul = E.outCubic(p(t, tl - 0.12, tl + 0.18));
      if (ul > 0) {
        c.save(); c.globalAlpha *= ul; icon(c, ic, 122, yl - 22, 52, C.lime, 4); c.restore();
        const wl = ligacao(c, lig, 168, yl, tl);
        falaBox('gancho', i0, i0 + 1, 100, yl - 50, 168 + wl, yl + 15);
      }
      const S = 168, wp = bate(c, pal, 92, yp, S, tp);
      if (wp) falaBox('gancho', ip, ip, 92, yp - 0.74 * S, 92 + wp, yp + 0.22 * S);
      if (k === 2 && wp) risco(c, 100, 92 + wp - 30, yp + 50, capaFix ? 1 : E.inOutSine(p(t, fimDe('caderno', tp + 0.5), fimDe('caderno', tp + 0.5) + 0.5)), C.lime, 14, 5);
    });
    c.restore();
  }

  // ---------------------------------------------------------------- 2. PROBLEMA ("quanto falta receber?")
  function problema(c, s) {
    c.save(); camera(c, s, 540, 860, 0.05);
    const te = Math.max(s.t0, at('eno', s.t0)), u = E.outCubic(p(t, te - 0.1, te + 0.2));
    if (u > 0) { c.save(); c.globalAlpha *= u; icon(c, 'sino', 540, 470, 70, C.lime, 4); c.restore(); }
    const we = ligacao(c, 'E no check-out:', 540, 620, te, { align: 'center', size: 72 });
    if (we) falaBox('problema', 0, 2, 540 - we / 2, 565, 540 + we / 2, 640);
    [['quanto', 'quanto', 3, 830, 176, C.white], ['falta', 'falta', 4, 1040, 230, C.lime], ['receber?', 'receber', 5, 1215, 150, C.white]].forEach(([w, id, i, y, S, cor]) => {
      const ww = bate(c, w, 540, y, S, at(id), { align: 'center', color: cor });
      if (ww) falaBox('problema', i, i, 540 - ww / 2, y - 0.74 * S, 540 + ww / 2, y + 0.22 * S);
    });
    c.restore();
  }

  // ---------------------------------------------------------------- 3. VIRADA (logo + "junta tudo isso:", na mesma cena)
  function virada(c, s) {
    c.save(); camera(c, s, 540, 820, 0.04);
    const tl = Math.max(s.t0 + 0.05, at('logo', s.t0) - 0.25), e = E.outBack(p(t, tl, tl + 0.4), 1.6), D = 210, cy = 470;
    const g0 = c.createRadialGradient(540, cy, 0, 540, cy, 420); g0.addColorStop(0, css(C.lime, 0.2 * clamp(e))); g0.addColorStop(1, css(C.lime, 0)); c.fillStyle = g0; c.fillRect(0, 100, W, 760);
    const ru = p(t, tl + 0.1, tl + 0.8);
    if (ru > 0 && ru < 1) { c.beginPath(); c.arc(540, cy, lerp(D * 0.52, 240, E.outExpo(ru)), 0, TAU); c.strokeStyle = css(C.lime, 0.9 * (1 - ru)); c.lineWidth = 8 * (1 - ru) + 1; c.stroke(); }
    if (e > 0) { const d = D * lerp(0.4, 1, clamp(e)); c.save(); c.globalAlpha *= clamp(e * 2); c.drawImage(LOGO, 540 - d / 2, cy - d / 2, d, d); c.restore(); BOX('logo', 540 - D / 2, cy - D / 2, 540 + D / 2, cy + D / 2); }
    // "O FAZLO Hospeda" (o "O" pequeno, a marca escrita como se escreve)
    const um = E.outCubic(p(t, tl + 0.1, tl + 0.45)), NS = 88, wo = tw('O ', DISPLAY, 66, 800, -1), w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.2), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.2);
    const nx = 540 - (wo + w1 + w2) / 2, ny = 720;
    if (um > 0) {
      c.save(); c.globalAlpha *= um; c.translate(0, 30 * (1 - um));
      txt(c, 'O', nx, ny, { size: 66, weight: 800, color: C.gray });
      txt(c, 'FAZLO ', nx + wo, ny, { size: NS, weight: 900, ls: -2.2 }); txt(c, 'Hospeda', nx + wo + w1, ny, { size: NS, weight: 700, color: C.lime, ls: -2.2 });
      c.restore(); falaBox('virada', 0, 1, nx, ny - 66, nx + wo + w1 + w2, ny + 20);
    }
    const wj = ligacao(c, 'junta', 540, 880, at('junta', tl + 0.8), { align: 'center', size: 80 });
    if (wj) falaBox('virada', 2, 2, 540 - wj / 2, 820, 540 + wj / 2, 900);
    const wt = bate(c, 'tudo isso:', 540, 1050, 164, at('tudoisso', tl + 1.2), { align: 'center', color: C.lime });
    if (wt) falaBox('virada', 3, 4, 540 - wt / 2, 1050 - 121, 540 + wt / 2, 1050 + 36);
    c.restore();
  }

  // ---------------------------------------------------------------- 4. MÓDULOS (cascata diagonal 3D)
  const ENTRA = 0.3;                                           // toda entrada de cartão dura 0,3 s (o único trecho com rastro)
  const balanco = (h, i) => ({ ry: (-21 + 3 * Math.sin(h * 0.55 + i * 1.3)) * DEG, rx: (10 + 2 * Math.sin(h * 0.43 + i)) * DEG });
  function poseModulo(i) {
    const fx = 480 + i * 18, fy = 450 + i * 182, fz = -i * 24;
    return (tt) => {
      const s = T.s.modulos, ti = Math.max(s.t0, at(MOD[i][1], s.t0 + 0.6 * i) - 0.05);
      if (tt < ti || tt >= s.t1) return null;
      const u = E.outCubic(p(tt, ti, ti + ENTRA)), h = tt - s.t0, b = balanco(h, i);
      // os anteriores recuam um pouco (e escurecem) a cada cartão novo, devagar (0,6 s), e seguem legíveis
      const novos = MOD.reduce((acc, m, j) => acc + (j > i ? E.inOutSine(p(tt, Math.max(s.t0, at(m[1], s.t0 + 0.6 * j) - 0.05), Math.max(s.t0, at(m[1], s.t0 + 0.6 * j) - 0.05) + 0.6)) : 0), 0);
      return { x: lerp(fx - 720, fx, u) - 6 * h, y: fy - 8 * h, z: lerp(fz + 420, fz, u) + 30 * Math.min(novos, 2.8), rx: lerp(18, b.rx / DEG, u) * DEG, ry: lerp(-68, b.ry / DEG, u) * DEG,
        rz: lerp(-8, -2.5, u) * DEG, a: clamp(u * 3), escuro: 0.07 * novos, brilho: 0.6 * u * clamp(1 - novos) };
    };
  }
  const PM = MOD.map((m, i) => poseModulo(i));
  function modulos(c) { PM.forEach((pose, i) => cartao(c, CARDS[MOD[i][0]], pose, t)); }

  // ---------------------------------------------------------------- 5. PEDAÇOS (R$ 450 → R$ 1.020)
  function poseSinal(tt) {
    const s = T.s.pedacos, ti = s.t0 + 0.05, tr = T.tCheckout;
    if (tt < ti || tt >= s.t1) return null;
    const u = E.outCubic(p(tt, ti, ti + ENTRA)), h = tt - s.t0, b = balanco(h, 0), r = E.inOutCubic(p(tt, tr, tr + 0.7));
    return { x: lerp(1500, 508, u) - 8 * h - 170 * r, y: lerp(560, 830, u) - 6 * h - 230 * r,     /* entra pelo alto: a direita de baixo é área segura */ z: lerp(600, 0, u) + 700 * r, rx: lerp(16, b.rx / DEG, u) * DEG, ry: (lerp(70, b.ry / DEG, u) - 6 * r) * DEG,
      rz: lerp(8, -2, u) * DEG, a: clamp(u * 3), escuro: 0.5 * r, desfoque: 8 * r, semRastro: r > 0, brilho: 0.8 * u * (1 - r) };
  }
  function poseCheckout(tt) {
    const s = T.s.pedacos, ti = T.tCheckout;
    if (tt < ti || tt >= s.t1) return null;
    const u = E.outCubic(p(tt, ti, ti + ENTRA)), h = tt - ti, b = balanco(h + 2, 1);
    return { x: lerp(1450, 510, u) - 8 * h, y: lerp(580, 845, u) - 6 * h, z: lerp(300, 0, u), rx: lerp(4, b.rx / DEG, u) * DEG, ry: lerp(60, b.ry / DEG, u) * DEG,
      rz: lerp(6, -2, u) * DEG, a: clamp(u * 3), brilho: 0.8 * u };
  }
  function pedacos(c) { cartao(c, CARDS.sinal, poseSinal, t); cartao(c, CARDS.checkout, poseCheckout, t); }

  // ---------------------------------------------------------------- 6. FECHO LIMÃO: os 5 módulos se encaixam no telaDestaque
  // telaDestaque(c, r, t0): o componente trocável. Hoje, um painel com 5 encaixes (Reservas, Sinal, Check-in, Comanda,
  // Caixa) que recebem os módulos voando; com src/tela-destaque.json apontando para uma imagem (a tela real da V2,
  // depois), os módulos voam e entram no painel, e a imagem aparece no lugar dos encaixes. Ver o README.
  const DEST_R = [150, 800, 930, 1392];
  function telaDestaque(c, r, t0) {
    const [x0, y0, x1, y1] = r, w = x1 - x0, h = y1 - y0, e = E.outBack(p(t, t0, t0 + 0.35), 1.2);
    if (e <= 0) return;
    c.save(); c.translate((x0 + x1) / 2, (y0 + y1) / 2); c.scale(lerp(0.9, 1, e), lerp(0.9, 1, e)); c.translate(-(x0 + x1) / 2, -(y0 + y1) / 2); c.globalAlpha *= clamp(e * 2);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 40; c.shadowOffsetY = 18; rr(c, x0, y0, w, h, 40); c.fillStyle = C.ink; c.fill(); c.restore();
    const slot = (i) => { const pad = 30, sh = (h - pad * 6) / 5; return [x0 + pad, y0 + pad + i * (sh + pad), w - 2 * pad, sh]; };
    const pousa = (i) => t0 + 0.3 + i * 0.16;                  // cada módulo pousa no seu encaixe
    if (DEST_IMG) {
      const ui = E.outCubic(p(t, pousa(4) + 0.35, pousa(4) + 0.75));
      c.save(); rr(c, x0, y0, w, h, 40); c.clip();
      const k = Math.max(w / DEST_IMG.width, h / DEST_IMG.height), iw = DEST_IMG.width * k, ih = DEST_IMG.height * k;
      c.globalAlpha *= ui; c.drawImage(DEST_IMG, x0 + (w - iw) * (DEST.alinhar_x ?? 0.5), y0 + (h - ih) * (DEST.alinhar_y ?? 0), iw, ih); c.restore();
    }
    MOD.forEach(([id, , ic, nome], i) => {
      const [sx, sy, sw, sh] = slot(i), tp = pousa(i), u = p(t, tp - 0.45, tp);
      if (!DEST_IMG || t < pousa(4) + 0.75) { rr(c, sx, sy, sw, sh, 22); c.strokeStyle = css(C.lime, 0.18); c.lineWidth = 2; c.setLineDash([8, 8]); c.stroke(); c.setLineDash([]); }
      if (u <= 0 || (DEST_IMG && t > pousa(4) + 0.75)) return;
      const v = E.outCubic(u), de = i % 2 ? 1 : -1;            // vêm de fora, alternando os lados, girando
      for (let k = (u < 0.66 ? 3 : 0); k >= 0; k--) {          // o rastro só no voo (0,3 s finais da entrada)
        const vv = E.outCubic(clamp(u - k * 0.06));
        c.save(); c.globalAlpha *= k ? 0.15 : 1;
        c.translate(sx + sw / 2 + de * 900 * (1 - vv), sy + sh / 2 - 220 * (1 - vv)); c.rotate(de * 0.5 * (1 - vv)); c.scale(lerp(1.6, 1, vv), lerp(1.6, 1, vv));
        rr(c, -sw / 2, -sh / 2, sw, sh, 22); c.fillStyle = C.card2; c.fill(); c.strokeStyle = css(C.lime, 0.75); c.lineWidth = 2.5; c.stroke();
        icon(c, ic, -sw / 2 + 58, 0, 48, C.lime, 4);
        txt(c, nome, -sw / 2 + 110, 18, { size: 50, weight: 900, ls: -1 });
        rr(c, sw / 2 - 210, -8, 170 * [0.9, 0.6, 0.75, 0.5, 0.8][i], 16, 8); c.fillStyle = i % 2 ? css(C.lime, 0.45) : C.lime; c.fill();
        c.restore();
      }
      if (v > 0.98) { const kp = kick(t, tp, 0.35); if (kp > 0.02) { rr(c, sx - 4, sy - 4, sw + 8, sh + 8, 24); c.strokeStyle = css(C.lime, kp); c.lineWidth = 4; c.stroke(); } }
    });
    rr(c, x0, y0, w, h, 40); c.strokeStyle = C.ink; c.lineWidth = 4; c.stroke();
    if (DEST_IMG && DEST.selo_exemplo !== false) {
      rr(c, x0 + 24, y1 - 78, tw('EXEMPLO FICTÍCIO', MONO, 22, 800, 2.6) + 60, 54, 16); c.fillStyle = C.ink; c.fill();
      selo(c, x0 + 36, y1 - 51, 22);
    }
    c.restore();
    BOX('telaDestaque', x0, y0, x1, y1);
  }
  function fecho(c, s) {
    c.save(); camera(c, s, 540, 900, 0.03);
    const tt = at('tudo', s.t0 + 0.2), e = E.outExpo(p(t, s.t0, s.t0 + 0.3));
    c.save(); c.globalAlpha *= e; c.translate(0, 40 * (1 - e));
    const S1 = 150, w1 = tw('Tudo isso', DISPLAY, S1, 900, -5.5);
    txt(c, 'Tudo isso', 540, 520, { size: S1, weight: 900, ls: -5.5, color: C.ink, align: 'center' });
    falaBox('fecho', 0, 0, 540 - w1 / 2, 520 - 111, 540 + w1 / 2, 520 + 33);
    c.restore();
    circulo(c, 540, 468, w1 / 2 + 46, 104, E.inOutSine(p(t, tt + 0.05, tt + 0.6)), C.ink, 10, 4);
    const u2 = E.outCubic(p(t, tt + 0.12, tt + 0.42)), w2 = tw('num lugar só.', DISPLAY, 112, 900, -4);
    if (u2 > 0) { txt(c, 'num lugar só.', 540, 700, { size: 112, weight: 900, ls: -4, color: C.ink, align: 'center', alpha: u2 }); falaBox('fecho', 1, 3, 540 - w2 / 2, 700 - 83, 540 + w2 / 2, 700 + 25); }
    c.restore();
    telaDestaque(c, DEST_R, s.t0 + 0.15);
  }

  // ---------------------------------------------------------------- 7. CHAMADA (logo + botão + @fazlohospeda)
  function chamada(c, s) {
    c.save(); camera(c, s, 540, 800, 0.03);
    const tc = s.t0, e = E.outBack(p(t, tc, tc + 0.45), 1.6), D = 230, cy = 600;
    const g0 = c.createRadialGradient(540, cy, 0, 540, cy, 520);
    g0.addColorStop(0, css(C.lime, 0.16 * clamp(e))); g0.addColorStop(1, css(C.lime, 0)); c.fillStyle = g0; c.fillRect(0, 250, W, 900);
    if (e > 0) { const d = D * lerp(0.5, 1, clamp(e)); c.save(); c.globalAlpha *= clamp(e * 2); c.drawImage(LOGO, 540 - d / 2, cy - d / 2, d, d); c.restore(); BOX('logo', 540 - D / 2, cy - D / 2, 540 + D / 2, cy + D / 2); }
    const NS = 88, w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.2), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.2), nx = 540 - (w1 + w2) / 2, ny = 832;
    const pin = E.outExpo(p(t, tc + 0.05, tc + 0.5));
    c.save(); c.beginPath(); c.rect(60, ny - 92, 960, 120); c.clip();
    txt(c, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900, ls: -2.2 });
    txt(c, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime, ls: -2.2 });
    c.restore(); BOX('nome', nx, ny - 66, nx + w1 + w2, ny + 20);
    const tw2 = at('whats2', tc + 1), ub = E.outBack(p(t, tc + 0.25, tc + 0.65), 1.6), kb = kick(t, tw2, 0.45);
    if (ub > 0) {
      const sb = 'Chame no WhatsApp', bw = tw(sb, DISPLAY, 52, 900, -1) + 190, bh = 124, bx = 540 - bw / 2, by = 950;
      const ru = clamp((t - tw2) / 1.1);
      if (t > tw2 && ru < 1) { rr(c, bx - 24 * ru, by - 24 * ru, bw + 48 * ru, bh + 48 * ru, (bh + 48 * ru) / 2); c.strokeStyle = css(C.lime, 0.7 * (1 - ru)); c.lineWidth = 4; c.stroke(); }
      c.save(); c.translate(540, by + bh / 2); c.scale(ub * (1 + 0.05 * kb), ub * (1 + 0.05 * kb)); c.translate(-540, -(by + bh / 2));
      rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = C.lime; c.fill();
      icon(c, 'balao', bx + 78, by + bh / 2 + 2, 60, C.ink, 4.5);
      txt(c, sb, bx + 132, by + bh / 2 + 19, { size: 52, weight: 900, ls: -1, color: C.ink });
      c.restore();
      BOX('botão', bx, by, bx + bw, by + bh);
    }
    txt(c, LN.marca, 540, 1166, { fam: MONO, size: 36, weight: 700, color: C.gray, align: 'center', ls: 1, alpha: E.outCubic(p(t, tc + 0.4, tc + 0.8)), box: '@fazlohospeda' });
    c.restore();
  }

  // ---------------------------------------------------------------- legenda palavra por palavra (só nas cenas sem texto grande)
  function layoutLegenda() {
    PAGES = [];
    const wid = (ws, a, b) => tw(ws.slice(a, b).map((x) => x.w).join(' '), DISPLAY, CAP.size, 900, -0.02 * CAP.size);
    LN.frases.forEach((f, fi) => {
      if (f.legenda === false) return;
      const ws = f.palavras, pages = [];
      const prox = LN.frases[fi + 1] ? LN.frases[fi + 1].palavras[0].t0 - 0.2 : DUR - 0.05;
      let i = 0;
      while (i < ws.length) {
        let j = i, lines = 1, a = i;
        while (j < ws.length) {
          if (wid(ws, a, j + 1) > CAP.maxW) { if (a === j) { j++; continue; } lines++; a = j; if (lines > 2) break; }
          else { j++; if (/[.?!]$/.test(ws[j - 1].w) && j < ws.length && ws[j - 1].t1 - ws[i].t0 >= CAP.minPag + 0.2) break; }
        }
        if (j < ws.length && !/[,.:;?!]$/.test(ws[j - 1].w)) {
          let achou = false;
          for (let k = j - 1; k > i + 1; k--) if (/[,.:;?!]$/.test(ws[k - 1].w) && ws[k - 1].t1 - ws[i].t0 >= CAP.minPag) { j = k; achou = true; break; }
          if (!achou) for (let k = j - 1; k > i + 1; k--) if (/^(e|ou|mais|menos)$/i.test(ws[k].w) && ws[k - 1].t1 - ws[i].t0 >= CAP.minPag) { j = k; break; }
        }
        pages.push([i, j]); i = j;
      }
      const cabe = (a, b) => { let ln = 1, x0 = a; for (let k = a + 1; k <= b; k++) if (wid(ws, x0, k) > CAP.maxW) { if (k - 1 === x0) continue; ln++; x0 = k - 1; } return ln <= 2; };
      const dura = (k) => (pages[k + 1] ? ws[pages[k + 1][0]].t0 : Math.min(prox, ws[pages[k][1] - 1].t1 + CAP.segura)) - ws[pages[k][0]].t0;
      for (let k = pages.length - 1; k > 0; k--)
        while ((dura(k) < CAP.minPag || pages[k][1] - pages[k][0] === 1) && pages[k - 1][1] - pages[k - 1][0] > 2 && cabe(pages[k][0] - 1, pages[k][1])) { pages[k - 1][1]--; pages[k][0]--; }
      for (let k = 0; k < pages.length - 1; k++)
        while (dura(k) < CAP.minPag && pages[k + 1][1] - pages[k + 1][0] > 1 && cabe(pages[k][0], pages[k][1] + 1)) { pages[k][1]++; pages[k + 1][0]++; }
      pages.forEach(([a, b]) => {
        const n = b - a; let brk = n;
        if (wid(ws, a, b) > CAP.maxW) {
          let best = 1e9;
          for (let k = 1; k < n; k++) { const m = Math.max(wid(ws, a, a + k), wid(ws, a + k, b)) + ((k === 1 || n - k === 1) && n > 2 ? 400 : 0); if (m < best) { best = m; brk = k; } }
        }
        const rows = brk >= n ? [[a, b]] : [[a, a + brk], [a + brk, b]], pos = {};
        rows.forEach(([r0, r1], ri) => {
          let x = CAP.cx - wid(ws, r0, r1) / 2;
          for (let k = r0; k < r1; k++) { pos[k] = { x, row: ri }; x += tw(ws[k].w + ' ', DISPLAY, CAP.size, 900, -0.02 * CAP.size) - 0.02 * CAP.size; }
        });
        PAGES.push({ frase: f.id, a, b, rows, pos, nrows: rows.length, t0: ws[a].t0, words: ws, fimFala: ws[b - 1].t1, prox });
      });
    });
    PAGES.forEach((q, i) => {
      const nx = PAGES[i + 1] && PAGES[i + 1].frase === q.frase ? PAGES[i + 1].t0 : q.prox;
      let t1 = Math.min(nx, q.fimFala + CAP.segura);
      t1 = Math.max(t1, Math.min(q.t0 + CAP.minPag, nx));
      q.t1 = Math.min(t1, DUR - 0.05);
    });
  }
  function legenda(c) {
    const s = cenaDe(t);
    if (!s.legenda) return;                                   // a cena já mostra a frase em texto grande: a faixa fica vazia
    const pg = PAGES.find((q) => t >= q.t0 && t < q.t1);
    if (!pg) return;
    const y0 = CAP.y1 + (pg.nrows === 1 ? CAP.lh / 2 : 0), ls = -0.02 * CAP.size;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 14; c.shadowOffsetY = 2;
    for (let k = pg.a; k < pg.b; k++) {
      const w = pg.words[k];
      if (t < w.t0) continue;
      const u = E.outCubic(p(t, w.t0, w.t0 + 0.09)), ps = pg.pos[k], ww = tw(w.w, DISPLAY, CAP.size, 900, ls);
      const pop = w.chave ? 1 + 0.07 * kick(t, w.t0, 0.18) : 1, y = y0 + ps.row * CAP.lh + (1 - u) * 8;
      c.save(); setFont(c, DISPLAY, CAP.size, 900, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.globalAlpha = u;
      c.translate(ps.x + ww / 2, y - CAP.size * 0.3); c.scale(pop, pop);
      c.fillStyle = w.chave ? C.lime : C.white; c.fillText(w.w, -ww / 2, CAP.size * 0.3); c.restore();
      if (u > 0.99) BOX('legenda', ps.x, y - CAP.size * 0.76, ps.x + ww, y + CAP.size * 0.22);
    }
    c.restore();
  }
  function avisoPrevia(c) {
    if (!PREVIA) return;
    const s = LN.provisoria ? 'PRÉVIA · SEM VOZ · TEMPOS ESTIMADOS' : 'PRÉVIA PARA APROVAÇÃO', w = tw(s, MONO, 22, 800, 2) + 40;
    rr(c, 540 - w / 2, 150, w, 46, 23); c.fillStyle = 'rgba(10,10,10,0.75)'; c.fill(); c.strokeStyle = css(C.white, 0.6); c.lineWidth = 2; c.stroke();
    txt(c, s, 540, 181, { fam: MONO, size: 22, weight: 800, color: C.white, ls: 2, align: 'center' });
  }

  // ---------------------------------------------------------------- o quadro e a capa
  const SAFE = (c) => { c.beginPath(); c.rect(0, 0, W, H); c.rect(950, 1060, W - 950, 500); c.rect(0, 1537, W, H - 1537); c.clip('evenodd'); };
  function frame(c, tt) {
    t = tt;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowColor = 'transparent'; c.filter = 'none';
    fundo(c, t);
    const s = cenaDe(t);
    c.save(); SAFE(c);
    if (s.id === 'gancho') gancho(c, s);
    else if (s.id === 'problema') problema(c, s);
    else if (s.id === 'virada') virada(c, s);
    else if (s.id === 'modulos') modulos(c);
    else if (s.id === 'pedacos') pedacos(c);
    else if (s.id === 'fecho') fecho(c, s);
    else chamada(c, s);
    c.restore();
    legenda(c);
    avisoPrevia(c);
  }
  function capa(c, dy = 0) {                                  // a capa: o gancho montado, a logo pequena e "Tudo num lugar só." (dy: o bloco desce)
    t = 0; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; fundo(c, 0);
    const d = 50, nome = tw('FAZLO Hospeda', DISPLAY, 28, 800), x0 = 540 - (d + 14 + nome) / 2, cy = 330;
    c.drawImage(LOGO, x0, cy - d / 2, d, d);
    const w1 = txt(c, 'FAZLO', x0 + d + 14, cy + 10, { size: 28, weight: 800 });
    txt(c, 'Hospeda', x0 + d + 14 + w1 + 6, cy + 10, { size: 28, weight: 800, color: C.lime });
    BOX('marca', x0, cy - d / 2, x0 + d + 14 + nome, cy + d / 2);
    c.save(); c.translate(0, dy - 40); gancho(c, T.s.gancho, true); c.restore();
    const s = 'Tudo num lugar só.', w = tw(s, DISPLAY, 66, 900, -1.4) + 84;
    c.save(); c.translate(0, dy);
    rr(c, 92, 1300, w, 118, 59); c.fillStyle = C.lime; c.fill();
    txt(c, s, 92 + 42, 1382, { size: 66, weight: 900, color: C.ink, ls: -1.4 });
    c.restore();
    BOX('chamada da capa', 92, 1300, 92 + w, 1418);
  }
  // a capa para a grade: o mesmo desenho, com o bloco (gancho + "Tudo num lugar só.") no centro do recorte 3:4 (y = 960)
  function capaGrade(c) {
    BOXES = []; capa(c, 0);
    const desl = (b) => (b.nome.startsWith('fala ') ? { ...b, y0: b.y0 - 40, y1: b.y1 - 40 } : b);   // o gancho é desenhado 40 px acima
    const bl = BOXES.filter((b) => b.nome !== 'marca').map(desl), topo = Math.min(...bl.map((b) => b.y0)), base = Math.max(...bl.map((b) => b.y1));
    const dy = Math.round(960 - (topo + base) / 2);
    BOXES = []; capa(c, dy);
    const caixas = BOXES.map((b) => (b.nome === 'marca' ? b : (({ y0, y1, ...r }) => ({ ...r, y0: y0 + dy, y1: y1 + dy }))(desl(b)))); BOXES = null;
    return { caixas, bloco: { topo: topo + dy, base: base + dy, centro: (topo + base) / 2 + dy }, dy };
  }

  // ---------------------------------------------------------------- o que o QA confere (a partir das próprias poses)
  function leitura() {
    const S = T.s, card = (id, pose, fala, some, texto) => ({ texto, cena: CENAS.find((s) => s.t0 <= fala && fala < s.t1)?.id, fala, some, cartao: id, pose });
    const L = [
      ...GANCHO.map(([, pal, , idP]) => ({ texto: pal, cena: 'gancho', fala: fimDe(idP), some: S.gancho.t1 })),
      ...[['quanto', 'quanto'], ['falta', 'falta'], ['receber?', 'receber']].map(([w, id]) => ({ texto: w, cena: 'problema', fala: fimDe(id), some: S.problema.t1 })),
      { texto: 'FAZLO Hospeda', cena: 'virada', fala: fimDe('logo'), some: S.virada.t1 }, { texto: 'tudo isso:', cena: 'virada', fala: fimDe('tudoisso'), some: S.virada.t1 },
      ...MOD.map(([id, w, , nome], i) => card(id, PM[i], fimDe(w), S.modulos.t1, nome)),
      card('sinal', poseSinal, fimDe('pago'), T.tCheckout, 'R$ 450'),
      card('checkout', poseCheckout, fimDe('checkout2'), S.pedacos.t1, 'R$ 1.020'),
      { texto: 'Tudo isso / num lugar só.', cena: 'fecho', fala: LN.frases.find((f) => f.id === 'fecho').t1, some: S.fecho.t1 },
      { texto: 'Chame no WhatsApp', cena: 'chamada', fala: fimDe('whats2'), some: DUR },
    ];
    return L.map((d) => {
      const o = { texto: d.texto, cena: d.cena, fala_fim: +d.fala.toFixed(3), some: +d.some.toFixed(3), parado: +(d.some - d.fala).toFixed(3) };
      if (d.cartao) {                                         // na janela de leitura: o rastro e a inclinação do cartão
        let kmax = 1, ry = [99, -99], rx = [99, -99];
        for (let tt = d.fala; tt <= Math.min(d.some, d.fala + 1.2) - 1e-6; tt += 1 / 60) {
          kmax = Math.max(kmax, amostrasK(CARDS[d.cartao], d.pose, tt));
          const P = d.pose(tt); if (!P) continue;
          ry = [Math.min(ry[0], P.ry / DEG), Math.max(ry[1], P.ry / DEG)]; rx = [Math.min(rx[0], P.rx / DEG), Math.max(rx[1], P.rx / DEG)];
        }
        Object.assign(o, { cartao: d.cartao, rastro_max: kmax, ry: ry.map((v) => +v.toFixed(1)), rx: rx.map((v) => +v.toFixed(1)) });
      }
      return o;
    });
  }
  function rastros() {                                         // os trechos com desfoque de movimento, por cartão, e as entradas
    const lista = [...MOD.map(([id], i) => [id, PM[i], Math.max(T.s.modulos.t0, at(MOD[i][1], T.s.modulos.t0 + 0.6 * i) - 0.05)]),
      ['sinal', poseSinal, T.s.pedacos.t0 + 0.05], ['checkout', poseCheckout, T.tCheckout]];
    return lista.map(([id, pose, entra]) => {
      const tr = []; let ini = null;
      for (let f = 0; f <= Math.round(DUR * 60); f++) {
        const tt = f / 60, k = pose(tt) ? amostrasK(CARDS[id], pose, tt) : 1;
        if (k > 1 && ini === null) ini = tt;
        if (k === 1 && ini !== null) { tr.push([+ini.toFixed(3), +tt.toFixed(3)]); ini = null; }
      }
      return { cartao: id, entra: +entra.toFixed(3), trechos: tr };
    });
  }
  function falas() {                                           // o que a cena mostra em texto grande, palavra a palavra (as frases sem legenda)
    return LN.frases.filter((f) => f.legenda === false).map((f) => ({ frase: f.id, cena: CENAS.find((s) => s.frase === f.id).id, palavras: f.palavras.map((w) => ({ w: w.w, t0: w.t0 })) }));
  }

  function renderAt(c, tt) { frame(c, clamp(tt, 0, DUR - 1e-4)); }
  function init(img, linha, o = {}) {
    LOGO = img; LN = linha; DUR = linha.duracao; PREVIA = !!o.previa; DEST = o.destaque || {}; DEST_IMG = o.destaqueImg || null;
    M = document.createElement('canvas').getContext('2d');
    L1 = document.createElement('canvas'); L1.width = W; L1.height = H; L2 = document.createElement('canvas'); L2.width = W; L2.height = H;
    tempos(); criaCartoes(); layoutLegenda();
  }
  function caixas(c, tt) { BOXES = []; frame(c, tt); const out = BOXES; BOXES = null; return out; }
  window.REEL = {
    init, renderAt, caixas, get DURATION() { return DUR; }, CAP,
    capa: (c) => { BOXES = []; capa(c); const out = BOXES; BOXES = null; return out; },
    capaGrade,
    legenda: () => PAGES.map((q) => ({ frase: q.frase, t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.w).join(' ')),
      palavras: Array.from({ length: q.b - q.a }, (_, i) => ({ w: q.words[q.a + i].w, t0: q.words[q.a + i].t0, chave: !!q.words[q.a + i].chave })) })),
    plano: () => ({ cenas: CENAS.map((s) => ({ id: s.id, frase: s.frase, t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3), legenda: s.legenda })),
      atos: { problema: 0, solucao: T.c.virada, limao: T.c.fecho, chamada: T.c.chamada }, tCheckout: T.tCheckout,
      modulos: MOD.map(([id, w], i) => ({ id, t: Math.max(T.s.modulos.t0, at(w, T.s.modulos.t0 + 0.6 * i) - 0.05) })),
      leitura: leitura(), rastros: rastros(), falas: falas() }),
    cores: () => ({ limao: C.lime, tinta: C.ink, branco: C.white }),
  };
})();
