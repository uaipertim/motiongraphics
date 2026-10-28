/*
 * FAZLO Hospeda — destaque "Comece aqui": 3 telas de Story (1080×1920) + a capa do destaque.
 * Identidade: fundo preto, limão #AFFA27, Inter Display 900 nos títulos, JetBrains Mono no chip; logo oficial pequena no topo.
 * Área segura de Story: nada em y < 250 nem em y > 1620. Na tela 03, a faixa y 1150–1450 fica livre para a figurinha de link.
 * Sem interface do sistema e sem figurinhas desenhadas: só texto, a marca e um traço limão.
 *
 *   TELAS.render(ctx, n)   desenha a tela n (1–3) ou a capa (n = 'capa') e devolve as caixas de cada elemento
 */
(function () {
  'use strict';
  const W = 1080, H = 1920, X0 = 96, X1 = 984;
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const C = { bg: '#0A0A0A', lime: '#AFFA27', white: '#FFFFFF', gray: '#B9B9B1', grayD: '#5E5E59' };
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const css = (h, a = 1) => { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const mixHex = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
  let LOGO = null, BOXES = [];
  const BOX = (nome, x0, y0, x1, y1) => BOXES.push({ nome, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) });
  function setFont(c, fam, size, weight, ls = 0) { c.font = `${weight} ${size}px ${fam}`; c.letterSpacing = `${ls}px`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; }
  function tw(c, s, fam, size, weight, ls = 0) { setFont(c, fam, size, weight, ls); return c.measureText(s).width; }

  // texto com *trechos em limão*, quebrado em até `max` px; devolve as linhas (palavras com cor)
  function linhas(c, s, size, weight, maxW, base) {
    const ws = []; let lim = false;
    s.split('*').forEach((part, i) => { if (i) lim = !lim; part.split(' ').filter(Boolean).forEach((w) => ws.push({ w, c: lim ? C.lime : base })); });
    const sp = tw(c, ' ', DISPLAY, size, weight, -0.025 * size), out = []; let cur = [], cw = 0;
    for (const w of ws) {
      const ww = tw(c, w.w, DISPLAY, size, weight, -0.025 * size);
      if (cur.length && cw + sp + ww > maxW) { out.push(cur); cur = []; cw = 0; }
      cur.push({ ...w, ww }); cw += (cur.length > 1 ? sp : 0) + ww;
    }
    if (cur.length) out.push(cur);
    // nada de palavra sozinha na última linha
    const n = out.length;
    if (n > 1 && out[n - 1].length === 1 && out[n - 2].length > 2) out[n - 1].unshift(out[n - 2].pop());
    return { out, sp };
  }
  function bloco(c, s, y, o) {
    const { out, sp } = linhas(c, s, o.size, o.weight, X1 - X0, o.cor || C.white), lh = o.size * (o.lh || 1.06);
    out.forEach((ln, i) => {
      let x = X0; const yy = y + i * lh;
      ln.forEach((w) => { setFont(c, DISPLAY, o.size, o.weight, -0.025 * o.size); c.fillStyle = w.c; c.fillText(w.w, x, yy); x += w.ww + sp; });
      BOX(`${o.nome} ${i + 1}`, X0, yy - 0.74 * o.size, x - sp, yy + 0.24 * o.size);
    });
    return y + (out.length - 1) * lh;                      // a linha de base da última linha
  }
  const altura = (c, s, o) => (linhas(c, s, o.size, o.weight, X1 - X0, C.white).out.length - 1) * o.size * (o.lh || 1.06);

  function fundo(c) {
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    let g = c.createRadialGradient(540, 900, 0, 540, 900, 1000);
    g.addColorStop(0, css(C.lime, 0.07)); g.addColorStop(1, css(C.lime, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(540, 960, 600, 540, 960, 1300);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function marca(c) {                                      // a logo oficial pequena no topo (y 300–360)
    const d = 60, nome = tw(c, 'FAZLO Hospeda', DISPLAY, 32, 800), x0 = 540 - (d + 16 + nome) / 2, cy = 330;
    c.drawImage(LOGO, x0, cy - d / 2, d, d);
    setFont(c, DISPLAY, 32, 800); c.fillStyle = C.white; c.fillText('FAZLO', x0 + d + 16, cy + 11);
    const w1 = tw(c, 'FAZLO ', DISPLAY, 32, 800); setFont(c, DISPLAY, 32, 800); c.fillStyle = C.lime; c.fillText('Hospeda', x0 + d + 16 + w1, cy + 11);
    BOX('marca', x0, cy - d / 2, x0 + d + 16 + nome, cy + d / 2);
  }
  function chip(c, s, y) {                                 // "COMECE AQUI · 01/03" em mono
    const size = 26, w = tw(c, s, MONO, size, 800, 4) + 52, h = 56;
    c.beginPath(); c.roundRect(X0, y - h / 2, w, h, h / 2); c.fillStyle = css(C.lime, 0.1); c.fill(); c.strokeStyle = css(C.lime, 0.75); c.lineWidth = 2.5; c.stroke();
    setFont(c, MONO, size, 800, 4); c.fillStyle = C.lime; c.fillText(s, X0 + 26, y + size * 0.36);
    BOX('chip', X0, y - h / 2, X0 + w, y + h / 2);
  }
  function traco(c, y) { c.fillStyle = C.lime; c.beginPath(); c.roundRect(X0, y, 120, 10, 5); c.fill(); BOX('traço', X0, y, X0 + 120, y + 10); }

  // título + apoio, centrados verticalmente entre y0 e y1
  function tela(c, n, titulo, apoio, faixa) {
    fundo(c); marca(c);
    const T = { size: 104, weight: 900, nome: 'título' }, A = { size: 62, weight: 800, lh: 1.14, cor: C.gray, nome: 'apoio' };
    const hT = altura(c, titulo, T), hA = altura(c, apoio, A);
    const total = 56 + 66 + T.size * 0.74 + hT + 90 + 10 + 80 + A.size * 0.74 + hA;
    let y = (faixa[0] + faixa[1]) / 2 - total / 2;
    chip(c, `COMECE AQUI · 0${n}/03`, y + 28);
    y += 56 + 66 + T.size * 0.74;
    y = bloco(c, titulo, y, T);
    y += 90; traco(c, y); y += 10 + 80 + A.size * 0.74;
    bloco(c, apoio, y, A);
  }

  const TELAS = {
    1: (c) => tela(c, 1, 'O FAZLO Hospeda é um *sistema de gestão para pousadas.*', 'Reservas, calendário, comandas e caixa *em um só lugar.*', [420, 1560]),
    2: (c) => tela(c, 2, 'Aqui você encontra *dicas práticas* para a rotina da pousada.', '*Toda segunda, quarta e sexta.*', [420, 1560]),
    // a tela 03 deixa y 1150–1450 livre (a figurinha de link vai ali): o texto fica acima
    3: (c) => tela(c, 3, 'Quer conversar sobre a *sua pousada?*', 'Fale com a gente *pelo WhatsApp.*', [400, 1110]),
    // a capa do destaque: o mesmo desenho das capas de stories/destaques (anel 3D, halo limão, disco escuro), com o "play" de início
    capa(c) {
      c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
      const Dm = 1080, cx = 540, cy = 960;
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, Dm * 0.5);
      g.addColorStop(0, css(C.lime, 0.26)); g.addColorStop(1, css(C.lime, 0));
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, Dm * 0.5, 0, TAU); c.fill();
      const rx = Dm * 0.42, ry = Dm * 0.3, w = Dm * 0.06, tilt = -0.17, ct = Math.cos(tilt), st = Math.sin(tilt), N = 360;
      const pt = (a) => { const x = rx * Math.cos(a), y = ry * Math.sin(a); return [cx + x * ct - y * st, cy + x * st + y * ct]; };
      const ios = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
      c.save(); c.lineCap = 'butt';
      for (const front of [false, true]) {
        for (let k = 0; k < N; k++) {
          const a0 = (k / N) * TAU, a1 = ((k + 1.6) / N) * TAU, d = Math.sin((a0 + a1) / 2);
          if ((d > 0) !== front) continue;
          const u = ios((d + 1) / 2), [x0, y0] = pt(a0), [x1, y1] = pt(a1);
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
          c.strokeStyle = mixHex('#33490F', C.lime, u); c.lineWidth = w * (0.72 + 0.28 * u); c.stroke();
        }
        if (!front) {
          c.beginPath(); c.arc(cx, cy, Dm * 0.26, 0, TAU); c.fillStyle = '#050605'; c.fill();
          // o "play" de início, no mesmo traço limão dos ícones das capas (centrado pelo centroide do triângulo)
          const k = (Dm * 0.36) / 24, path = new Path2D('M9.2 6.2v11.6L18.6 12z');
          c.save(); c.translate(cx, cy); c.scale(k, k); c.translate(-12.33, -12);
          c.lineWidth = 2.3; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = C.lime;
          c.shadowColor = css(C.lime, 0.5); c.shadowBlur = 18 / k; c.stroke(path); c.restore();
        }
      }
      c.restore();
      BOX('capa', cx - rx - w, cy - ry - w, cx + rx + w, cy + ry + w);
    },
  };
  function init(logo) { LOGO = logo; }
  function render(c, n) { c.setTransform(1, 0, 0, 1, 0, 0); BOXES = []; TELAS[n](c); return BOXES; }
  window.TELAS = { init, render, W, H };
})();
