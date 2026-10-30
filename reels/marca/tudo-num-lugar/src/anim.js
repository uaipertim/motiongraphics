/*
 * FAZLO Hospeda — reel de marca "Tudo num lugar só" (1080×1920, 60 fps). Vídeo fixado no perfil e anúncio impulsionado.
 * Uma mensagem: o Hospeda junta numa ferramenta o que a pousada hoje controla espalhado no WhatsApp, no PIX e no caderno.
 * Uma chamada no fim: WhatsApp.
 *
 * NÃO mostra a interface do FAZLO Hospeda nem imita o layout dela; não usa dados da demonstração nem nome de hóspede.
 * Os cartões são ilustrativos e abstratos (preto, limão, branco). Valores só R$ 450 e R$ 1.020, sempre com o selo
 * "Exemplo fictício" no mesmo cartão.
 *
 * Atos (a cor de fundo marca cada um): PRETO (o problema) → PRETO com cartões em 3D (a solução) → LIMÃO (tudo num
 * lugar só, com o componente trocável telaDestaque) → PRETO (logo e chamada).
 * Os cortes caem na grade de meio tempo da trilha (92 BPM, 0,326 s), no máximo 80 ms depois da palavra.
 *
 * Cartões 3D: cada cartão é uma textura desenhada uma vez; a pose (posição e rotação) é uma função do tempo t, e a
 * textura é projetada em perspectiva (grade de triângulos com transformação afim em cada um). O desfoque de movimento
 * é a média de amostras dentro do obturador (0,8 quadro), com o número de amostras proporcional à velocidade do
 * cartão na tela. Tudo é determinístico: o mesmo t gera sempre o mesmo quadro.
 *
 * Legenda palavra por palavra no estilo do reel-09 (Inter Display 900, branca, chaves em limão), na faixa pedida
 * y 1424–1536, x 150–950: 54 px, linhas em y 1466/1524 (duas linhas de 68 px não cabem em 112 px de altura).
 * No ato limão, a legenda fica preta e as chaves ganham uma pílula preta com o texto em limão (contraste).
 * Áreas seguras: nada em y > 1536 nem em x ≥ 950 entre y 1060 e 1560. O quadro 0 é a capa.
 */
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const C = { bg: '#0A0A0A', card: '#141614', card2: '#1C1F1B', line: '#2C302B', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2',
    grayD: '#5E625B', ink: '#0A0A0A', red: '#FF5C5C' };
  const CAP = { size: 54, lh: 58, y1: 1466, maxW: 800, cx: 550, minPag: 1.5, segura: 0.8 };
  const HB = 60 / 92 / 2;                                          // meio tempo da trilha (92 BPM)

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

  let M = null, LOGO = null, LN = null, DUR = 0, PREVIA = false, PAGES = [], IDS = {}, T = {}, BOXES = null, CARDS = {}, DEST = null, DEST_IMG = null;
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

  // ---------------------------------------------------------------- tempos: cortes na grade da trilha
  const snap = (t) => Math.max(0, Math.floor((t + 0.08) / HB) * HB);       // o corte cai no meio tempo, até 80 ms depois da palavra
  const at = (id, fb) => (id in IDS ? IDS[id] : fb);
  function tempos() {
    IDS = {};
    LN.frases.forEach((f) => f.palavras.forEach((w) => { if (w.id) IDS[w.id] = w.t0; }));
    const F = Object.fromEntries(LN.frases.map((f) => [f.id, f]));
    T = { F };
    T.cortes = [
      ['capa', 0], ['whatsapp', snap(at('reserva'))], ['pix', snap(at('sinal0'))], ['caderno', snap(at('saldo0'))],
      ['eno', snap(F.problema.t0)], ['ninguem', snap(at('ninguem'))], ['falta', snap(at('falta'))],
      ['logo', snap(F.virada.t0)], ['tudoisso', snap(at('tudoisso'))], ['modulos', snap(F.modulos.t0)],
      ['ocupacao', snap(F.pedacos.t0)], ['sinal', snap(at('pago'))], ['comanda', snap(at('consumido'))], ['checkout', snap(at('falta2'))],
      ['limao', snap(F.fecho.t0)], ['chamada', snap(F.cta.t0)],
    ];
    T.c = Object.fromEntries(T.cortes);
    // batidas sem corte (no meio de um plano mais longo): o "falta?" pulsa no fim da frase; o cartão do check-out vem para a frente
    T.pulsoFalta = Math.max(T.c.falta + HB * 2, snap(F.problema.t1 - 0.05));
    T.pulsoCheckout = Math.max(T.c.checkout + HB * 2, snap(at('checkout2')));
    T.fim = DUR;
  }
  const cena = (t) => { let k = T.cortes[0][0]; for (const [n, t0] of T.cortes) if (t >= t0) k = n; return k; };
  const ato = (t) => (t >= T.c.chamada ? 'chamada' : t >= T.c.limao ? 'limao' : t >= T.c.logo ? 'solucao' : 'problema');

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

  // ---------------------------------------------------------------- 3D: projeção, textura em triângulos, desfoque de movimento
  const F3 = 1500, VX = 540, VY = 880;
  function rot(x, y, z, rx, ry, rz) {
    let c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c];
    c = Math.cos(rx); s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c];
    c = Math.cos(ry); s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c];
    return [x, y, z];
  }
  function grade(card, P, n) {                                 // os pontos projetados da grade (n+1)×(n+1) do cartão
    const g = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const [x, y, z] = rot(card.w * (i / n - 0.5), card.h * (j / n - 0.5), 0, P.rx, P.ry, P.rz);
      const zz = z + P.z, s = F3 / Math.max(80, F3 + zz);
      g.push([VX + (P.x + x - VX) * s, VY + (P.y + y - VY) * s]);
    }
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
    c.save(); c.globalAlpha *= P.a ?? 1;
    if (nz < 0) {
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const A = g[j * (n + 1) + i], B = g[j * (n + 1) + i + 1], Cc = g[(j + 1) * (n + 1) + i], D = g[(j + 1) * (n + 1) + i + 1];
        const a = [i * sw, j * sh], b = [(i + 1) * sw, j * sh], cq = [i * sw, (j + 1) * sh], d = [(i + 1) * sw, (j + 1) * sh];
        tri(c, tex, a, b, d, A, B, D); tri(c, tex, a, d, cq, A, D, Cc);
      }
      const sombra = clamp((1 + nz) * 0.85);                   // de lado, o cartão escurece
      if (sombra > 0.02) { c.beginPath(); contorno.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.fillStyle = `rgba(0,0,0,${sombra * 0.75})`; c.fill(); }
    } else {                                                   // o verso: escuro, com o filete limão
      c.beginPath(); contorno.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath();
      c.fillStyle = '#101210'; c.fill(); c.strokeStyle = css(C.lime, 0.35); c.lineWidth = 2; c.stroke();
    }
    c.restore();
    return { g, n, nz };
  }
  function bboxPts(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return [x0, y0, x1, y1]; }
  function cartao(c, card, pose, t) {                         // o cartão no tempo t, com desfoque proporcional à velocidade
    const P = pose(t);
    if (!P || (P.a ?? 1) <= 0.002) return;
    const dt = 1 / 60, P0 = pose(t - dt) || P;
    const g1 = grade(card, P, 1), g0 = grade(card, P0, 1);
    const vel = Math.max(...g1.map((q, i) => Math.hypot(q[0] - g0[i][0], q[1] - g0[i][1])));   // px por quadro (o canto mais rápido)
    const K = clamp(Math.ceil(vel / 6), 1, 9), obt = 0.8 * dt;
    let res;
    if (K === 1) res = desenhaPose(c, card, P);
    else {
      const amostras = Array.from({ length: K }, (_, k) => pose(t - (obt * k) / (K - 1)) || P);
      const bb = bboxPts(amostras.flatMap((q) => grade(card, q, 1)));
      const x0 = Math.max(0, Math.floor(bb[0]) - 4), y0 = Math.max(0, Math.floor(bb[1]) - 4), x1 = Math.min(W, Math.ceil(bb[2]) + 4), y1 = Math.min(H, Math.ceil(bb[3]) + 4);
      if (x1 <= x0 || y1 <= y0) return;
      const l1 = L1.getContext('2d'), l2 = L2.getContext('2d');
      l1.setTransform(1, 0, 0, 1, 0, 0); l1.clearRect(x0, y0, x1 - x0, y1 - y0);
      amostras.forEach((q, k) => {
        l2.setTransform(1, 0, 0, 1, 0, 0); l2.clearRect(x0, y0, x1 - x0, y1 - y0); l2.globalAlpha = 1;
        const r = desenhaPose(l2, card, q); if (k === 0) res = r;
        l1.globalAlpha = 1 / (k + 1); l1.drawImage(L2, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);   // média corrida das amostras
      });
      l1.globalAlpha = 1;
      c.drawImage(L1, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    }
    // caixas para a revisão: o cartão, e (se tiver valor) o valor e o selo no mesmo cartão
    if (res && res.nz < 0 && (P.a ?? 1) > 0.5) {
      const bb = bboxPts(grade(card, P, 1));
      if (bb[2] > 0 && bb[0] < W && bb[3] > 0 && bb[1] < H) {
        BOX('cartão ' + card.id, ...bb);
        const reg = (r) => { const pts = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]].map(([u, v]) => { const [x, y, z] = rot(u - card.w / 2, v - card.h / 2, 0, P.rx, P.ry, P.rz); const s = F3 / Math.max(80, F3 + z + P.z); return [VX + (P.x + x - VX) * s, VY + (P.y + y - VY) * s]; }); return bboxPts(pts); };
        if (card.valor) BOX('valor ' + card.id, ...reg(card.valor));
        if (card.selo) BOX('selo ' + card.id, ...reg(card.selo));
      }
    }
  }

  // ---------------------------------------------------------------- as texturas dos cartões (ilustrativas, no estilo da marca)
  const ESC = 1.6;                                             // a textura é desenhada 1,6× maior, para a perspectiva ficar nítida
  function textura(id, w, h, desenha) {
    const cv = document.createElement('canvas'); cv.width = Math.round(w * ESC); cv.height = Math.round(h * ESC);
    const c = cv.getContext('2d'); c.scale(ESC, ESC);
    const card = { id, w, h, tex: cv };
    rr(c, 0, 0, w, h, 34); c.fillStyle = C.card; c.fill();
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fill();
    rr(c, 1.5, 1.5, w - 3, h - 3, 33); c.strokeStyle = css(C.lime, 0.75); c.lineWidth = 3; c.stroke();
    desenha(c, card);
    return card;
  }
  function criaCartoes() {
    CARDS = {};
    // os cinco módulos (cascata): ícone + nome
    [['reservas', 'calendario', 'Reservas'], ['sinal', 'moeda', 'Sinal'], ['checkin', 'sino', 'Check-in'], ['comanda', 'comanda', 'Comanda'], ['caixa', 'caixa', 'Caixa']]
      .forEach(([id, ic, nome], i) => {
        CARDS['m-' + id] = textura('m-' + id, 660, 150, (c) => {
          c.beginPath(); c.arc(82, 75, 46, 0, TAU); c.fillStyle = css(C.lime, 0.12); c.fill(); c.strokeStyle = css(C.lime, 0.8); c.lineWidth = 2.5; c.stroke();
          icon(c, ic, 82, 75, 56, C.lime, 4);
          txt(c, nome, 156, 98, { size: 68, weight: 900, ls: -1.7 });
          txt(c, String(i + 1).padStart(2, '0'), 616, 50, { fam: MONO, size: 22, weight: 800, color: C.grayD, align: 'right', ls: 2 });
        });
      });
    // os pedaços: ocupação (calendário abstrato), sinal recebido, comanda, no check-out
    CARDS.ocupacao = textura('ocupacao', 760, 520, (c) => {
      icon(c, 'calendario', 70, 72, 46, C.lime, 4);
      txt(c, 'OCUPAÇÃO', 112, 84, { fam: MONO, size: 30, weight: 800, color: C.white, ls: 4 });
      const x0 = 48, y0 = 136, cw = 94, ch = 64;
      'STQQSSD'.split('').forEach((d, i) => txt(c, d, x0 + i * cw + cw / 2, y0 + 8, { fam: MONO, size: 22, weight: 800, color: C.grayD, align: 'center' }));
      for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) { rr(c, x0 + k * cw + 4, y0 + 26 + r * ch, cw - 8, ch - 10, 10); c.fillStyle = 'rgba(255,255,255,0.05)'; c.fill(); }
      // as estadias: barras limão (abstratas, sem nome)
      [[0, 1, 3, 1], [1, 3, 4, 0.55], [2, 0, 2, 0.55], [2, 4, 6, 1], [3, 2, 5, 1], [4, 0, 1, 0.55], [4, 5, 6, 0.55]].forEach(([r, a, b, al]) => {
        rr(c, x0 + a * cw + 8, y0 + 34 + r * ch, (b - a + 1) * cw - 16, ch - 26, 12); c.fillStyle = al === 1 ? C.lime : css(C.lime, 0.32); c.fill();
      });
    });
    CARDS.sinal = textura('sinal', 760, 440, (c, card) => {
      icon(c, 'moeda', 72, 74, 48, C.lime, 4);
      txt(c, 'SINAL RECEBIDO', 114, 86, { fam: MONO, size: 30, weight: 800, color: C.white, ls: 4 });
      txt(c, 'R$ 450', 56, 262, { size: 170, weight: 900, color: C.lime, ls: -6 });
      card.valor = [56, 262 - 126, 56 + tw('R$ 450', DISPLAY, 170, 900, -6), 262 + 36];
      c.beginPath(); c.arc(664, 196, 40, 0, TAU); c.fillStyle = C.lime; c.fill(); icon(c, 'check', 664, 196, 46, C.ink, 6);
      card.selo = selo(c, 56, 372, 24);
    });
    CARDS.comanda = textura('comanda', 760, 440, (c) => {
      icon(c, 'comanda', 72, 74, 48, C.lime, 4);
      txt(c, 'COMANDA', 114, 86, { fam: MONO, size: 30, weight: 800, color: C.white, ls: 4 });
      txt(c, 'Consumo', 56, 230, { size: 128, weight: 900, color: C.white, ls: -4 });
      [0.78, 0.6, 0.7].forEach((k, i) => { rr(c, 56, 280 + i * 42, 420 * k, 18, 9); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fill(); rr(c, 600, 280 + i * 42, 104, 18, 9); c.fillStyle = css(C.lime, 0.5); c.fill(); });
    });
    CARDS.checkout = textura('checkout', 760, 440, (c, card) => {
      icon(c, 'sino', 72, 74, 48, C.lime, 4);
      txt(c, 'NO CHECK-OUT', 114, 86, { fam: MONO, size: 30, weight: 800, color: C.white, ls: 4 });
      txt(c, 'R$ 1.020', 56, 262, { size: 170, weight: 900, color: C.white, ls: -6 });
      card.valor = [56, 262 - 126, 56 + tw('R$ 1.020', DISPLAY, 170, 900, -6), 262 + 36];
      rr(c, 56, 300, 300, 10, 5); c.fillStyle = C.lime; c.fill();
      card.selo = selo(c, 56, 372, 24);
    });
  }

  // ---------------------------------------------------------------- ATO 1 (preto): o problema
  function capa(c) {                                          // o quadro 0: as três palavras + "tudo num lugar só"
    const d = 50, nome = tw('FAZLO Hospeda', DISPLAY, 28, 800), x0 = 540 - (d + 14 + nome) / 2, cy = 360;
    c.drawImage(LOGO, x0, cy - d / 2, d, d);
    const w1 = txt(c, 'FAZLO', x0 + d + 14, cy + 10, { size: 28, weight: 800 });
    txt(c, 'Hospeda', x0 + d + 14 + w1 + 6, cy + 10, { size: 28, weight: 800, color: C.lime });
    BOX('marca', x0, cy - d / 2, x0 + d + 14 + nome, cy + d / 2);
    [['RESERVA NO', 'WhatsApp.', 640], ['SINAL NO', 'PIX.', 850], ['SALDO NO', 'caderno.', 1060]].forEach(([lab, pal, y], i) => {
      txt(c, lab, 96, y - 132, { fam: MONO, size: 30, weight: 800, color: C.gray, ls: 5, box: 'rótulo ' + (i + 1) });
      txt(c, pal, 88, y, { size: 156, weight: 900, ls: -5.5, box: 'palavra ' + (i + 1) });
    });
    risco(c, 96, 88 + tw('caderno.', DISPLAY, 156, 900, -5.5) - 30, 1098, 1, C.lime, 13, 3);
    const s = 'Tudo num lugar só.', w = tw(s, DISPLAY, 66, 900, -1.4) + 84;
    rr(c, 88, 1216, w, 118, 59); c.fillStyle = C.lime; c.fill();
    txt(c, s, 88 + 42, 1298, { size: 66, weight: 900, color: C.ink, ls: -1.4 });
    BOX('chamada da capa', 88, 1216, 88 + w, 1334);
  }
  function palavraGrande(c, t, o) {                           // rótulo (mono) + a palavra-chave que bate na fala, com rastro
    const tc = o.corte, tp = o.tPalavra, e = E.outCubic(p(t, tc, tc + 0.22)), soco = 1 + 0.06 * (1 - E.outCubic(p(t, tc, tc + 0.3)));
    c.save(); c.translate(540, 880); c.scale(soco, soco); c.translate(-540, -880);
    // o ícone de traço
    const ui = E.outBack(p(t, tc, tc + 0.35), 2);
    if (ui > 0) {
      c.save(); c.translate(540, o.yIcone); c.scale(ui, ui);
      c.beginPath(); c.arc(0, 0, 70, 0, TAU); c.strokeStyle = css(C.lime, 0.6); c.lineWidth = 3; c.stroke();
      icon(c, o.icone, 0, 0, 78, C.lime, 4); c.restore();
      BOX('ícone', 470, o.yIcone - 70, 610, o.yIcone + 70);
    }
    txt(c, o.rotulo, 540, o.yRotulo, { fam: MONO, size: 40, weight: 800, color: C.gray, ls: 6, align: 'center', alpha: e, box: 'rótulo' });
    const u = p(t, tp - 0.06, tp + 0.16);
    if (u > 0) {
      const S = fit(o.palavra, DISPLAY, 900, o.max, 860), ls = -0.035 * S;
      const v = E.outExpo(u), dx = (1 - v) * 220, sc = lerp(1.35, 1, v);
      for (let k = 3; k >= 0; k--) {                           // o rastro: cópias atrás, na direção do movimento
        if (k && v >= 0.98) continue;
        c.save(); c.globalAlpha *= k ? 0.18 * (1 - v) : 1; c.translate(540 + dx * (1 + k * 0.5), o.yPalavra); c.scale(sc, sc);
        txt(c, o.palavra, 0, 0, { size: S, weight: 900, ls, align: 'center', color: o.cor || C.white });
        c.restore();
      }
      const w = tw(o.palavra, DISPLAY, S, 900, ls);
      BOX('palavra', 540 - w / 2, o.yPalavra - 0.74 * S, 540 + w / 2, o.yPalavra + 0.22 * S);
      if (o.risco) risco(c, 540 - w / 2 + 6, 540 + w / 2 - 30, o.yPalavra + 0.2 * S + 8, E.inOutSine(p(t, tp + 0.12, tp + 0.62)), C.lime, 13, 5);
    }
    c.restore();
  }
  function problema(c, t, k) {
    if (k === 'whatsapp') palavraGrande(c, t, { corte: T.c.whatsapp, tPalavra: at('whats'), rotulo: 'RESERVA NO', palavra: 'WhatsApp.', icone: 'balao', yIcone: 560, yRotulo: 760, yPalavra: 960, max: 210 });
    if (k === 'pix') palavraGrande(c, t, { corte: T.c.pix, tPalavra: at('pix'), rotulo: 'SINAL NO', palavra: 'PIX.', icone: 'moeda', yIcone: 560, yRotulo: 760, yPalavra: 1010, max: 300 });
    if (k === 'caderno') palavraGrande(c, t, { corte: T.c.caderno, tPalavra: at('caderno'), rotulo: 'SALDO ANOTADO NO', palavra: 'caderno.', icone: 'caderno', yIcone: 560, yRotulo: 760, yPalavra: 960, max: 210, risco: true });
    if (k === 'eno') palavraGrande(c, t, { corte: T.c.eno, tPalavra: at('checkout'), rotulo: 'E NO', palavra: 'check-out,', icone: 'sino', yIcone: 560, yRotulo: 760, yPalavra: 960, max: 200 });
    if (k === 'ninguem') {                                    // "ninguém sabe": as duas palavras batem no corte
      const tc = T.c.ninguem, v = E.outExpo(p(t, tc, tc + 0.2)), v2 = E.outExpo(p(t, tc + 0.12, tc + 0.32));
      c.save(); c.translate(540, 860); c.scale(lerp(1.3, 1, v), lerp(1.3, 1, v)); c.globalAlpha *= clamp(v * 1.5);
      txt(c, 'ninguém', 0, 0, { size: 190, weight: 900, ls: -7, align: 'center', box: 'ninguém' }); c.restore();
      c.save(); c.translate(540, 1040); c.globalAlpha *= clamp(v2 * 1.5); c.translate(0, 40 * (1 - v2));
      txt(c, 'sabe', 0, 0, { size: 150, weight: 900, ls: -5, align: 'center', color: C.gray, box: 'sabe' }); c.restore();
    }
    if (k === 'falta') {
      const tf = at('falta', T.c.falta), u = p(t, Math.min(tf, T.c.falta) - 0.06, Math.min(tf, T.c.falta) + 0.18), v = E.outExpo(u);
      if (u > 0) {
        c.save(); c.translate(540, 900); c.scale(lerp(1.4, 1, v), lerp(1.4, 1, v)); c.globalAlpha *= clamp(v * 1.5);
        txt(c, 'quanto', 0, 0, { size: 180, weight: 900, ls: -6, align: 'center', box: 'quanto' });
        c.restore();
        const u2 = E.outBack(p(t, tf + 0.12, tf + 0.45), 1.8), wob = Math.sin((t - tf) * 7) * 0.05 * (1 - p(t, tf + 0.4, tf + 1.6));
        const kp = kick(t, T.pulsoFalta, 0.4);
        c.save(); c.translate(540, 1100); c.rotate(wob); c.scale(u2 * (1 + 0.1 * kp), u2 * (1 + 0.1 * kp));
        txt(c, 'falta?', 0, 0, { size: 220, weight: 900, ls: -8, align: 'center', color: C.lime, box: 'falta?' });
        c.restore();
      }
    }
  }

  // ---------------------------------------------------------------- ATO 2 (preto, cartões em 3D): a solução
  function virada(c, t) {
    const tc = T.c.logo, tl = at('logo', tc + 0.2), e = E.outBack(p(t, tl - 0.15, tl + 0.35), 1.7), D = 300, cy = 820;
    const g0 = c.createRadialGradient(540, cy, 0, 540, cy, 560);
    g0.addColorStop(0, css(C.lime, 0.2 * clamp(e))); g0.addColorStop(1, css(C.lime, 0));
    c.fillStyle = g0; c.fillRect(0, 300, W, 1100);
    const ru = p(t, tl, tl + 0.6);
    if (ru > 0 && ru < 1) { c.beginPath(); c.arc(540, cy, lerp(D * 0.52, 330, E.outExpo(ru)), 0, TAU); c.strokeStyle = css(C.lime, 0.9 * (1 - ru)); c.lineWidth = 9 * (1 - ru) + 1; c.stroke(); }
    const d = D * lerp(0.4, 1, clamp(e)) * (1 + 0.05 * kick(t, at('tudoisso', 99), 0.4));
    if (e > 0) { c.save(); c.globalAlpha *= clamp(e * 2); c.drawImage(LOGO, 540 - d / 2, cy - d / 2, d, d); c.restore(); BOX('logo', 540 - D / 2, cy - D / 2, 540 + D / 2, cy + D / 2); }
    const NS = 92, w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.3), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.3), nx = 540 - (w1 + w2) / 2;
    const pin = E.outExpo(p(t, tl, tl + 0.45)), ny = 1150;
    c.save(); c.beginPath(); c.rect(60, ny - 96, 960, 124); c.clip();
    txt(c, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900, ls: -2.3 });
    txt(c, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime, ls: -2.3 });
    c.restore();
    if (pin > 0.5) BOX('nome', nx, ny - 70, nx + w1 + w2, ny + 22);
  }
  function juntaTudo(c, t) {                                  // "junta tudo isso:": a logo sobe e "tudo isso" bate em limão
    const tc = T.c.tudoisso, v = E.outExpo(p(t, tc, tc + 0.22)), D = 150;
    c.drawImage(LOGO, 540 - D / 2, 470 - D / 2, D, D); BOX('logo', 540 - D / 2, 470 - D / 2, 540 + D / 2, 470 + D / 2);
    txt(c, 'JUNTA', 540, 690, { fam: MONO, size: 40, weight: 800, color: C.gray, ls: 6, align: 'center', box: 'junta' });
    for (let k = 3; k >= 0; k--) {
      if (k && v >= 0.98) continue;
      c.save(); c.globalAlpha *= k ? 0.18 * (1 - v) : 1; c.translate(540 + (1 - v) * 220 * (1 + k * 0.5), 900); c.scale(lerp(1.35, 1, v), lerp(1.35, 1, v));
      txt(c, 'tudo isso:', 0, 0, { size: 190, weight: 900, ls: -7, align: 'center', color: C.lime }); c.restore();
    }
    const w = tw('tudo isso:', DISPLAY, 190, 900, -7); BOX('tudo isso', 540 - w / 2, 900 - 140, 540 + w / 2, 900 + 42);
  }
  // os módulos: cada um entra na sua palavra, inclinado, e assenta na cascata
  const MOD = [['m-reservas', 'm1'], ['m-sinal', 'm2'], ['m-checkin', 'm3'], ['m-comanda', 'm4'], ['m-caixa', 'm5']];
  function poseModulo(i) {
    const fx = 455 + i * 30, fy = 470 + i * 186;
    return (t) => {
      const ti = snap(at(MOD[i][1], T.c.modulos + 0.45 * i)), sai = T.c.ocupacao;
      if (t < ti - 0.02 || t > sai + 0.05) return null;
      const u = E.outCubic(p(t, ti, ti + 0.42)), o = E.inExpo(p(t, sai - 0.4, sai));
      const resp = Math.sin((t - ti) * 1.6 + i) * 2 * DEG;
      return { x: lerp(fx - 900, fx, u) - 1300 * o, y: fy - 120 * o, z: lerp(500, 0, u) + 300 * o,     // entra pela esquerda (a direita de baixo é área segura)
        rx: (12 - 4 * u) * DEG + resp, ry: lerp(-75, -22, u) * DEG - 40 * o * DEG, rz: lerp(-8, -3, u) * DEG, a: clamp(u * 3) };
    };
  }
  function modulos(c, t) { MOD.forEach(([id], i) => cartao(c, CARDS[id], poseModulo(i), t)); }
  // os pedaços: cada cartão entra girando pela direita, fica (com um balanço leve) e sai girando pela esquerda
  const PED = [['ocupacao', 'ocupacao', 'sinal'], ['sinal', 'sinal', 'comanda'], ['comanda', 'comanda', 'checkout'], ['checkout', 'checkout', 'limao']];
  function posePedaco(i) {
    return (t) => {
      const ti = T.c[PED[i][1]], to = T.c[PED[i][2]], dur = 0.42;
      if (t < ti - 0.02 || t > to + 0.02) return null;
      const u = E.outCubic(p(t, ti, ti + dur)), o = i === PED.length - 1 ? 0 : E.inCubic(p(t, to - 0.32, to)), h = t - ti;
      const kp = PED[i][0] === 'checkout' ? kick(t, T.pulsoCheckout, 0.5) : 0;      // a batida: o cartão vem para a frente
      // entra pelo alto (a direita de baixo é área segura)
      return { x: 540 + lerp(1050, 0, u) - 1150 * o, y: lerp(560, 790, u) + 26 * Math.sin(h * 1.3) - 60 * o, z: lerp(700, 0, u) + 500 * o - 140 * kp,
        rx: (8 + 3 * Math.sin(h * 1.1)) * DEG, ry: (lerp(78, -14, u) + 6 * Math.sin(h * 0.9) - 70 * o) * DEG, rz: (lerp(-10, -2, u) + 4 * o) * DEG, a: clamp(u * 4) };
    };
  }
  function pedacos(c, t) { PED.forEach(([id], i) => cartao(c, CARDS[id], posePedaco(i), t)); }

  // ---------------------------------------------------------------- ATO 3 (limão): tudo num lugar só + telaDestaque
  // telaDestaque(c, t, r): o componente trocável. Hoje desenha uma composição abstrata; com src/tela-destaque.json
  // apontando para uma imagem (a tela real da V2, depois), mostra a imagem no mesmo lugar. Ver o README.
  const DEST_R = [150, 820, 930, 1376];                       // x0, y0, x1, y1 (acima da legenda, fora da coluna de botões)
  function telaDestaque(c, t, r, t0) {
    const [x0, y0, x1, y1] = r, w = x1 - x0, h = y1 - y0, e = E.outBack(p(t, t0, t0 + 0.45), 1.3);
    if (e <= 0) return;
    c.save(); c.translate((x0 + x1) / 2, (y0 + y1) / 2); c.scale(lerp(0.85, 1, e), lerp(0.85, 1, e)); c.translate(-(x0 + x1) / 2, -(y0 + y1) / 2); c.globalAlpha *= clamp(e * 2);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 40; c.shadowOffsetY = 18; rr(c, x0, y0, w, h, 40); c.fillStyle = C.ink; c.fill(); c.restore();
    c.save(); rr(c, x0, y0, w, h, 40); c.clip();
    if (DEST_IMG) {                                            // a imagem real (cobre o retângulo, sem distorcer)
      const k = Math.max(w / DEST_IMG.width, h / DEST_IMG.height), iw = DEST_IMG.width * k, ih = DEST_IMG.height * k;
      c.drawImage(DEST_IMG, x0 + (w - iw) * (DEST.alinhar_x ?? 0.5), y0 + (h - ih) * (DEST.alinhar_y ?? 0), iw, ih);
    } else {                                                   // a composição abstrata: quatro blocos que se encaixam
      const pad = 34, gw = (w - pad * 3) / 2, gh = (h - pad * 3) / 2;
      const blocos = [['calendario', 'Reservas'], ['moeda', 'Sinal'], ['comanda', 'Comanda'], ['caixa', 'Caixa']];
      blocos.forEach(([ic, nome], i) => {
        const bx = x0 + pad + (i % 2) * (gw + pad), by = y0 + pad + Math.floor(i / 2) * (gh + pad);
        const ub = E.outBack(p(t, t0 + 0.12 + i * 0.07, t0 + 0.42 + i * 0.07), 1.6);
        if (ub <= 0) return;
        c.save(); c.translate(bx + gw / 2, by + gh / 2); c.scale(ub, ub); c.translate(-(bx + gw / 2), -(by + gh / 2));
        rr(c, bx, by, gw, gh, 26); c.fillStyle = C.card2; c.fill(); c.strokeStyle = css(C.lime, 0.55); c.lineWidth = 2.5; c.stroke();
        icon(c, ic, bx + 60, by + 62, 46, C.lime, 4);
        txt(c, nome, bx + 32, by + gh - 40, { size: 44, weight: 900, ls: -1 });
        if (i === 0) for (let k = 0; k < 3; k++) { rr(c, bx + 120 + k * 0, by + 44 + k * 24, (gw - 160) * [1, 0.6, 0.8][k], 14, 7); c.fillStyle = k === 1 ? css(C.lime, 0.4) : C.lime; c.fill(); }
        else for (let k = 0; k < 3; k++) { rr(c, bx + 120, by + 44 + k * 24, (gw - 160) * [0.7, 0.9, 0.5][k], 14, 7); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fill(); }
        c.restore();
      });
    }
    c.restore();
    rr(c, x0, y0, w, h, 40); c.strokeStyle = C.ink; c.lineWidth = 4; c.stroke();
    if (DEST_IMG && DEST.selo_exemplo !== false) {           // a tela real traz dados de exemplo: o selo fica visível
      rr(c, x0 + 24, y1 - 78, tw('EXEMPLO FICTÍCIO', MONO, 22, 800, 2.6) + 60, 54, 16); c.fillStyle = C.ink; c.fill();
      selo(c, x0 + 36, y1 - 51, 22);
    }
    c.restore();
    BOX('telaDestaque', x0, y0, x1, y1);
  }
  function limao(c, t) {
    const tc = T.c.limao, tt = at('tudo', tc + 0.1), e = E.outExpo(p(t, tc, tc + 0.3));
    c.save(); c.translate(0, 60 * (1 - e));
    const S1 = 150, w1 = tw('Tudo isso', DISPLAY, S1, 900, -5.5);
    txt(c, 'Tudo isso', 540, 540, { size: S1, weight: 900, ls: -5.5, color: C.ink, align: 'center', box: 'tudo isso' });
    circulo(c, 540, 488, w1 / 2 + 46, 104, E.inOutSine(p(t, tt + 0.05, tt + 0.6)), C.ink, 10, 4);
    const u2 = E.outCubic(p(t, tt + 0.15, tt + 0.45));
    txt(c, 'num lugar só.', 540, 718, { size: 112, weight: 900, ls: -4, color: C.ink, align: 'center', alpha: u2, box: 'num lugar só' });
    c.restore();
    telaDestaque(c, t, DEST_R, tc + 0.25);
  }

  // ---------------------------------------------------------------- ATO 4 (preto): logo e a chamada
  function chamada(c, t) {
    const tc = T.c.chamada, e = E.outBack(p(t, tc, tc + 0.45), 1.6), D = 230, cy = 600;
    const g0 = c.createRadialGradient(540, cy, 0, 540, cy, 520);
    g0.addColorStop(0, css(C.lime, 0.16 * clamp(e))); g0.addColorStop(1, css(C.lime, 0)); c.fillStyle = g0; c.fillRect(0, 250, W, 900);
    if (e > 0) { const d = D * lerp(0.5, 1, clamp(e)); c.save(); c.globalAlpha *= clamp(e * 2); c.drawImage(LOGO, 540 - d / 2, cy - d / 2, d, d); c.restore(); BOX('logo', 540 - D / 2, cy - D / 2, 540 + D / 2, cy + D / 2); }
    const NS = 88, w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.2), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.2), nx = 540 - (w1 + w2) / 2, ny = 832;
    const pin = E.outExpo(p(t, tc + 0.05, tc + 0.5));
    c.save(); c.beginPath(); c.rect(60, ny - 92, 960, 120); c.clip();
    txt(c, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900, ls: -2.2 });
    txt(c, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime, ls: -2.2 });
    c.restore(); BOX('nome', nx, ny - 66, nx + w1 + w2, ny + 20);
    // o botão "Chame no WhatsApp": entra com a fala e pulsa na palavra
    const tw2 = at('whats2', tc + 1), ub = E.outBack(p(t, tc + 0.25, tc + 0.65), 1.6), kb = kick(t, tw2, 0.45);
    if (ub > 0) {
      const s = 'Chame no WhatsApp', bw = tw(s, DISPLAY, 52, 900, -1) + 190, bh = 124, bx = 540 - bw / 2, by = 950;
      const ru = clamp((t - tw2) / 1.1);
      if (t > tw2 && ru < 1) { rr(c, bx - 24 * ru, by - 24 * ru, bw + 48 * ru, bh + 48 * ru, (bh + 48 * ru) / 2); c.strokeStyle = css(C.lime, 0.7 * (1 - ru)); c.lineWidth = 4; c.stroke(); }
      c.save(); c.translate(540, by + bh / 2); c.scale(ub * (1 + 0.05 * kb), ub * (1 + 0.05 * kb)); c.translate(-540, -(by + bh / 2));
      rr(c, bx, by, bw, bh, bh / 2); c.fillStyle = C.lime; c.fill();
      icon(c, 'balao', bx + 78, by + bh / 2 + 2, 60, C.ink, 4.5);
      txt(c, s, bx + 132, by + bh / 2 + 19, { size: 52, weight: 900, ls: -1, color: C.ink });
      c.restore();
      BOX('botão', bx, by, bx + bw, by + bh);
    }
    txt(c, LN.marca, 540, 1166, { fam: MONO, size: 36, weight: 700, color: C.gray, align: 'center', ls: 1, alpha: E.outCubic(p(t, tc + 0.4, tc + 0.8)), box: '@fazlohospeda' });
  }

  // ---------------------------------------------------------------- legenda palavra por palavra (o motor do reel-09/educativo)
  function layoutLegenda() {
    PAGES = [];
    const wid = (ws, a, b) => tw(ws.slice(a, b).map((x) => x.w).join(' '), DISPLAY, CAP.size, 900, -0.02 * CAP.size);
    LN.frases.forEach((f, fi) => {
      const ws = f.palavras, pages = [];
      const prox = LN.frases[fi + 1] ? LN.frases[fi + 1].palavras[0].t0 : DUR - 0.05;
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
        if (wid(ws, a, b) > CAP.maxW) {                          // duas linhas equilibradas, sem palavra sozinha numa linha
          let best = 1e9;
          for (let k = 1; k < n; k++) { const m = Math.max(wid(ws, a, a + k), wid(ws, a + k, b)) + ((k === 1 || n - k === 1) && n > 2 ? 400 : 0); if (m < best) { best = m; brk = k; } }
        }
        const rows = brk >= n ? [[a, b]] : [[a, a + brk], [a + brk, b]], pos = {};
        rows.forEach(([r0, r1], ri) => {
          let x = CAP.cx - wid(ws, r0, r1) / 2;
          for (let k = r0; k < r1; k++) { pos[k] = { x, row: ri }; x += tw(ws[k].w + ' ', DISPLAY, CAP.size, 900, -0.02 * CAP.size) - 0.02 * CAP.size; }
        });
        PAGES.push({ a, b, rows, pos, nrows: rows.length, t0: ws[a].t0, words: ws, fimFala: ws[b - 1].t1 });
      });
    });
    PAGES.forEach((q, i) => {
      const nx = PAGES[i + 1], lim = DUR - 0.05;
      let t1 = Math.min(nx ? nx.t0 : lim, q.fimFala + CAP.segura);
      t1 = Math.max(t1, Math.min(q.t0 + CAP.minPag, nx ? nx.t0 : lim));
      q.t1 = Math.min(t1, lim);
    });
  }
  function legenda(c, t) {
    const pg = PAGES.find((q) => t >= q.t0 && t < q.t1);
    if (!pg) return;
    const lim = ato(t) === 'limao';
    const y0 = CAP.y1 + (pg.nrows === 1 ? CAP.lh / 2 : 0), ls = -0.02 * CAP.size;
    c.save();
    if (!lim) { c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 14; c.shadowOffsetY = 2; }
    for (let k = pg.a; k < pg.b; k++) {
      const w = pg.words[k];
      if (t < w.t0) continue;
      const u = E.outCubic(p(t, w.t0, w.t0 + 0.09)), ps = pg.pos[k], ww = tw(w.w, DISPLAY, CAP.size, 900, ls);
      const pop = w.chave ? 1 + 0.07 * kick(t, w.t0, 0.18) : 1, y = y0 + ps.row * CAP.lh + (1 - u) * 8;
      c.save(); setFont(c, DISPLAY, CAP.size, 900, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.globalAlpha = u;
      c.translate(ps.x + ww / 2, y - CAP.size * 0.3); c.scale(pop, pop);
      if (lim && w.chave) { c.shadowColor = 'transparent'; rr(c, -ww / 2 - 10, -CAP.size * 0.5, ww + 20, CAP.size * 1.02, 12); c.fillStyle = C.ink; c.fill(); }
      c.fillStyle = lim ? (w.chave ? C.lime : C.ink) : (w.chave ? C.lime : C.white);
      c.fillText(w.w, -ww / 2, CAP.size * 0.3); c.restore();
      if (u > 0.99) BOX('legenda', ps.x - (lim && w.chave ? 10 : 0), y - CAP.size * 0.76, ps.x + ww + (lim && w.chave ? 10 : 0), y + CAP.size * 0.22);
    }
    c.restore();
  }
  function avisoPrevia(c) {
    if (!PREVIA) return;
    const s = LN.provisoria ? 'PRÉVIA · SEM VOZ · TEMPOS ESTIMADOS' : 'PRÉVIA PARA APROVAÇÃO';
    const w = tw(s, MONO, 22, 800, 2) + 40;
    rr(c, 540 - w / 2, 150, w, 46, 23); c.fillStyle = 'rgba(10,10,10,0.75)'; c.fill(); c.strokeStyle = css(C.white, 0.6); c.lineWidth = 2; c.stroke();
    txt(c, s, 540, 181, { fam: MONO, size: 22, weight: 800, color: C.white, ls: 2, align: 'center' });
  }

  // ---------------------------------------------------------------- o quadro
  function frame(c, t) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowColor = 'transparent';
    fundo(c, t);
    const k = cena(t);
    c.save();
    c.beginPath(); c.rect(0, 0, W, H); c.rect(950, 1060, W - 950, 500); c.rect(0, 1537, W, H - 1537); c.clip('evenodd');   // as áreas seguras ficam vazias
    if (k === 'capa') capa(c);
    else if (['whatsapp', 'pix', 'caderno', 'eno', 'ninguem', 'falta'].includes(k)) problema(c, t, k);
    else if (k === 'logo') virada(c, t);
    else if (k === 'tudoisso') juntaTudo(c, t);
    else if (k === 'modulos') modulos(c, t);
    else if (['ocupacao', 'sinal', 'comanda', 'checkout'].includes(k)) { modulos(c, t); pedacos(c, t); }
    else if (k === 'limao') limao(c, t);
    else if (k === 'chamada') chamada(c, t);
    c.restore();
    legenda(c, t);
    avisoPrevia(c);
  }
  function renderAt(c, t) { frame(c, clamp(t, 0, DUR - 1e-4)); }
  function init(img, linha, o = {}) {
    LOGO = img; LN = linha; DUR = linha.duracao; PREVIA = !!o.previa; DEST = o.destaque || {}; DEST_IMG = o.destaqueImg || null;
    M = document.createElement('canvas').getContext('2d');
    L1 = document.createElement('canvas'); L1.width = W; L1.height = H; L2 = document.createElement('canvas'); L2.width = W; L2.height = H;
    tempos(); criaCartoes(); layoutLegenda();
  }
  function caixas(c, t) { BOXES = []; frame(c, t); const out = BOXES; BOXES = null; return out; }
  window.REEL = {
    init, renderAt, caixas, get DURATION() { return DUR; }, CAP,
    legenda: () => PAGES.map((q) => ({ t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.w).join(' ')),
      palavras: Array.from({ length: q.b - q.a }, (_, i) => ({ w: q.words[q.a + i].w, t0: q.words[q.a + i].t0, chave: !!q.words[q.a + i].chave })) })),
    plano: () => ({ cortes: T.cortes.map(([n, t0]) => ({ cena: n, t: Math.round(t0 * 1000) / 1000 })), hb: HB,
      atos: { problema: 0, solucao: T.c.logo, limao: T.c.limao, chamada: T.c.chamada },
      modulos: MOD.map(([id, w]) => ({ id, t: snap(at(w)) })),
      batidas: [...T.cortes.map(([n, t0]) => ({ o: 'corte ' + n, t: t0 })), ...MOD.map(([id, w]) => ({ o: 'entra ' + id, t: snap(at(w)) })),
        { o: 'pulso falta?', t: T.pulsoFalta }, { o: 'pulso check-out', t: T.pulsoCheckout },
        ...['whats', 'pix', 'caderno', 'checkout', 'logo'].map((id) => ({ o: 'bate ' + id, t: at(id) })),     // as palavras que batem na tela
        { o: 'entra telaDestaque', t: T.c.limao + 0.25 }].sort((a, b) => a.t - b.t) }),
    cores: () => ({ limao: C.lime, tinta: C.ink, branco: C.white }),
  };
})();
