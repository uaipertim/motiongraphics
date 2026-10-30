/*
 * FAZLO Hospeda — educativo "Recebeu uma reserva pelo WhatsApp? Confira antes de registrar." (1080×1920, 60 fps, sexta 30/10/2026)
 * Conteúdo EDUCATIVO: não mostra a interface do sistema, não imita telas nem o app de conversa (o balão é genérico, no
 * DNA da marca) e todos os dados são fictícios, com "Exemplo fictício" sempre visível quando há dado na tela.
 * A linha do tempo vem de ../linha.json (scripts/linha.py, a partir da locução com a marcação de tempo do ElevenLabs).
 *
 * Cenas: GANCHO (quadro 0 = capa: título + balão de mensagem fictícia) · CONFIRA 5 INFORMAÇÕES (o balão encolhe e sobe)
 * · FICHA DE CONFERÊNCIA (papel; cada item acende na própria frase, o dado fictício é escrito e o check entra na
 * palavra que nomeia o item; "CONFERIDA" carimbado em "conferido") · ENVIE · LOGO (últimos 3,2 s).
 * Base: o motor do saldo-checkout (fundo, marca, chip, ícones, logo e a legenda palavra por palavra no padrão do
 * reel-09/Série Fala: Inter Display 900, 68 px, chaves em limão, linhas em y 1332/1412, x 130–950, cada página ≥ 1,5 s).
 * Conteúdo das cenas entre y 300 e 1270; nada na coluna de botões (x ≥ 950, y 1060–1560).
 */
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const C = { bg: '#0A0A0A', card: '#141614', card2: '#1A1D19', line: '#2C302B', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2',
    grayD: '#6B6F68', amber: '#FFB23F', ink: '#141612', paper: '#F1EDE2', paper2: '#E5DFCF', inkSoft: '#6E685B', red: '#FF5C5C' };
  const CAP = { size: 68, lh: 80, y1: 1332, maxW: 820, cx: 540, minPag: 1.5, segura: 0.8 };

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
  const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const css = (h, a = 1) => { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));

  let M = null, LOGO = null, LN = null, DUR = 0, PREVIA = false, PAGES = [], IDS = {}, T = {}, BOXES = null;
  function BOX(nome, x0, y0, x1, y1) { if (BOXES) BOXES.push({ nome, x0, y0, x1, y1 }); }
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
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
  const ent = (t, t0, d = 0.45) => E.outCubic(p(t, t0, t0 + d));

  // ---------------------------------------------------------------- fundo, marca e aviso de prévia
  function fundo(c, t) {
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    const gx = 540 + 160 * Math.sin(t * 0.21), gy = 820 + 120 * Math.cos(t * 0.17);
    let g = c.createRadialGradient(gx, gy, 0, gx, gy, 900);
    g.addColorStop(0, css(C.lime, 0.10)); g.addColorStop(1, css(C.lime, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // trama de pontos bem leve, deslizando
    c.save(); c.fillStyle = css(C.white, 0.045);
    const off = (t * 9) % 60;
    for (let y = -60 + off; y < H; y += 60) for (let x = 30; x < W; x += 60) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
    c.restore();
    g = c.createRadialGradient(540, 900, 520, 540, 900, 1250);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function marca(c) {
    const d = 50, nameW = tw('FAZLO Hospeda', DISPLAY, 27, 800), hw = tw(LN.marca, MONO, 19, 700, 0.5);
    const gw = d + 14 + Math.max(nameW, hw), x0 = 540 - gw / 2, cy = 330;
    c.drawImage(LOGO, x0, cy - d / 2, d, d);
    const tx = x0 + d + 14;
    const w1 = txt(c, 'FAZLO', tx, cy - 3, { size: 27, weight: 800 });
    txt(c, 'Hospeda', tx + w1 + 6, cy - 3, { size: 27, weight: 800, color: C.lime });
    txt(c, LN.marca, tx, cy + 22, { fam: MONO, size: 19, weight: 700, color: C.gray, ls: 0.5 });
    BOX('marca', x0, cy - d / 2, x0 + gw, cy + d / 2);
  }
  function avisoPrevia(c) {
    if (!PREVIA) return;
    const s = LN.provisoria ? 'PRÉVIA · LOCUÇÃO PENDENTE · TEMPOS ESTIMADOS' : 'PRÉVIA PARA APROVAÇÃO';
    const w = tw(s, MONO, 22, 800, 2) + 40;
    rr(c, 540 - w / 2, 150, w, 46, 23); c.fillStyle = css(C.amber, 0.16); c.fill(); c.strokeStyle = css(C.amber, 0.8); c.lineWidth = 2; c.stroke();
    txt(c, s, 540, 181, { fam: MONO, size: 22, weight: 800, color: C.amber, ls: 2, align: 'center' });
  }
  function chip(c, s, x, y, o = {}) {
    const size = o.size || 24, ls = o.ls ?? 4, w = tw(s, MONO, size, 800, ls) + 44 + (o.dot ? 22 : 0), h = o.h || 54;
    const x0 = o.align === 'center' ? x - w / 2 : x;
    c.save(); c.globalAlpha *= o.alpha ?? 1;
    rr(c, x0, y - h / 2, w, h, h / 2); c.fillStyle = o.bg || css(C.lime, 0.12); c.fill();
    c.strokeStyle = o.stroke || css(C.lime, 0.7); c.lineWidth = 2; c.stroke();
    if (o.dot) { c.beginPath(); c.arc(x0 + 30, y, 7, 0, TAU); c.fillStyle = o.color || C.lime; c.fill(); }
    txt(c, s, x0 + 22 + (o.dot ? 22 : 0), y + size * 0.36, { fam: MONO, size, weight: 800, color: o.color || C.lime, ls });
    c.restore();
    if (o.box) BOX(o.box, x0, y - h / 2, x0 + w, y + h / 2);
    return w;
  }

  // ---------------------------------------------------------------- ícones (traço)
  function icon(c, nome, x, y, s, col, lw = 4) {
    c.save(); c.translate(x, y); c.scale(s / 48, s / 48); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    if (nome === 'calendario') {
      c.roundRect(-20, -16, 40, 36, 6); c.moveTo(-20, -4); c.lineTo(20, -4); c.moveTo(-10, -22); c.lineTo(-10, -11); c.moveTo(10, -22); c.lineTo(10, -11);
      c.stroke(); c.beginPath(); [[-9, 6], [0, 6], [9, 6], [-9, 14]].forEach(([a, b]) => c.rect(a - 2.5, b - 2.5, 5, 5)); c.fill();
    } else if (nome === 'xicara') {
      c.moveTo(-18, -8); c.lineTo(-15, 16); c.quadraticCurveTo(-14, 20, -9, 20); c.lineTo(7, 20); c.quadraticCurveTo(12, 20, 13, 16); c.lineTo(16, -8); c.closePath();
      c.moveTo(16, -2); c.bezierCurveTo(28, -4, 28, 12, 14, 12); c.moveTo(-8, -14); c.quadraticCurveTo(-4, -19, -8, -24); c.moveTo(2, -14); c.quadraticCurveTo(6, -19, 2, -24); c.stroke();
    } else if (nome === 'moedas') {
      c.ellipse(-4, 10, 16, 6, 0, 0, TAU); c.moveTo(-20, 10); c.lineTo(-20, 2); c.ellipse(-4, 2, 16, 6, 0, Math.PI, 0); c.moveTo(12, 2); c.lineTo(12, 10);
      c.moveTo(-20, 2); c.lineTo(-20, -6); c.ellipse(-4, -6, 16, 6, 0, Math.PI, TAU); c.moveTo(12, -6); c.lineTo(12, 2);
      c.moveTo(24, -14); c.lineTo(24, 16); c.moveTo(18, -9); c.lineTo(30, -9); c.stroke();
    } else if (nome === 'check') {
      c.moveTo(-14, 1); c.lineTo(-4, 11); c.lineTo(15, -10); c.stroke();
    } else if (nome === 'aviao') {
      c.moveTo(-22, -2); c.lineTo(22, -18); c.lineTo(10, 20); c.lineTo(2, 6); c.closePath(); c.moveTo(2, 6); c.lineTo(22, -18); c.moveTo(2, 6); c.lineTo(-2, 16); c.lineTo(10, 20); c.stroke();
    } else if (nome === 'recibo') {
      c.moveTo(-16, -22); c.lineTo(16, -22); c.lineTo(16, 22); c.lineTo(10, 18); c.lineTo(4, 22); c.lineTo(-2, 18); c.lineTo(-8, 22); c.lineTo(-16, 18); c.closePath();
      c.moveTo(-9, -11); c.lineTo(9, -11); c.moveTo(-9, -2); c.lineTo(9, -2); c.moveTo(-9, 7); c.lineTo(3, 7); c.stroke();
    }
    c.restore();
  }

  // ---------------------------------------------------------------- tempos
  const at = (id, fb) => (id in IDS ? IDS[id] : fb);
  function tempos() {
    IDS = {};
    LN.frases.forEach((f) => f.palavras.forEach((w) => { if (w.id) IDS[w.id] = w.t0; }));
    const F = Object.fromEntries(LN.frases.map((f) => [f.id, f]));
    T = { F, ganchoFim: F.confira.t0 - 0.15, confiraFim: F.nome.t0 - 0.15, fichaFim: F.cta.t0 - 0.15, ctaFim: LN.logo };
  }
  function saida(c, t, fim, desenha) {
    const u = p(t, fim - 0.3, fim);
    if (u >= 1) return;
    c.save(); c.globalAlpha *= 1 - E.inCubic(u); c.translate(0, -40 * E.inCubic(u)); desenha(); c.restore();
  }
  function selo(c, x, y, o = {}) {                              // "EXEMPLO FICTÍCIO" (sempre que há dado na tela)
    const s = 'EXEMPLO FICTÍCIO', size = o.size || 22, w = tw(s, MONO, size, 800, 3) + 36, h = size * 2;
    rr(c, x, y - h / 2, w, h, 10);
    if (o.bg) { c.fillStyle = o.bg; c.fill(); }
    c.strokeStyle = o.cor || '#C25E00'; c.lineWidth = 2.5; c.setLineDash([7, 5]); c.stroke(); c.setLineDash([]);
    txt(c, s, x + 18, y + size * 0.36, { fam: MONO, size, weight: 800, color: o.cor || '#C25E00', ls: 3, box: 'exemplo fictício' });
    return w;
  }

  // ---------------------------------------------------------------- o balão da mensagem (genérico, no DNA da marca)
  const BAL = { x0: 130, w: 820, y0: 962, h: 252 };
  function balao(c, t) {
    if (t > T.fichaFim) return;
    // grande no gancho; encolhe e sobe na cena "confira"; some com a ficha
    const u = E.inOutCubic(p(t, T.ganchoFim - 0.3, T.ganchoFim + 0.4));
    const s = lerp(1, 0.62, u), cx = 540, cy = lerp(BAL.y0 + BAL.h / 2, 502, u)   // ≥ 28 px abaixo da marca, ≥ 20 px acima da ficha;
    const vai = p(t, T.fichaFim - 0.3, T.fichaFim);
    c.save(); c.globalAlpha *= 1 - E.inCubic(vai);
    c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -(BAL.y0 + BAL.h / 2));
    const { x0, w, y0, h } = BAL;
    txt(c, 'MENSAGEM RECEBIDA', x0 + 8, y0 - 26, { fam: MONO, size: 24, weight: 800, color: C.gray, ls: 3 });
    const sw = tw('EXEMPLO FICTÍCIO', MONO, 26, 800, 3) + 36;
    selo(c, x0 + w - sw, y0 - 34, { size: 26, cor: C.amber, bg: css(C.amber, 0.1) });
    c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
    c.beginPath(); c.roundRect(x0, y0, w, h, [36, 36, 36, 8]);
    c.moveTo(x0 + 2, y0 + h - 30); c.quadraticCurveTo(x0 - 6, y0 + h + 4, x0 - 22, y0 + h + 16); c.quadraticCurveTo(x0 + 24, y0 + h + 12, x0 + 44, y0 + h - 2);
    c.fillStyle = C.card2; c.fill(); c.restore();
    c.beginPath(); c.roundRect(x0, y0, w, h, [36, 36, 36, 8]); c.strokeStyle = css(C.lime, 0.6); c.lineWidth = 2.5; c.stroke();
    LN.exemplo.mensagem.forEach((l, i) => txt(c, l, x0 + 44, y0 + 72 + i * 56, { size: 40, weight: 700, box: `dado mensagem ${i + 1}` }));
    // conferida: um check limão no canto do balão, em "certa"
    const ok = p(t, at('certa', 99), at('certa', 99) + 0.3);
    if (ok > 0) {
      const k = E.outBack(ok, 2.2);
      c.save(); c.translate(x0 + w - 10, y0 + 10); c.scale(k * 1.4, k * 1.4);
      c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fillStyle = C.lime; c.fill(); icon(c, 'check', 0, 0, 34, C.ink, 6); c.restore();
    }
    c.restore();
    BOX('balão', cx - (w / 2) * s, cy - (h / 2) * s - 60 * s, cx + (w / 2) * s, cy + (h / 2) * s + 16 * s);
  }

  // ---------------------------------------------------------------- 1. GANCHO (o quadro 0 é a capa)
  function gancho(c, t) {
    saida(c, t, T.ganchoFim, () => {
      chip(c, 'ANTES DE REGISTRAR', 540, 470, { align: 'center', box: 'chip' });
      const S = 104, k = kick(t, at('whats', 99), 0.3);
      txt(c, 'Recebeu uma', 540, 610, { size: S, weight: 900, align: 'center', ls: -0.03 * S, box: 'título 1' });
      txt(c, 'reserva pelo', 540, 714, { size: S, weight: 900, align: 'center', ls: -0.03 * S, box: 'título 2' });
      c.save(); c.translate(540, 788); c.scale(1 + 0.04 * k, 1 + 0.04 * k); c.translate(-540, -788);
      txt(c, 'WhatsApp?', 540, 818, { size: S, weight: 900, align: 'center', ls: -0.03 * S, color: C.lime, box: 'título 3' });
      c.restore();
    });
  }

  // ---------------------------------------------------------------- 2. CONFIRA 5 INFORMAÇÕES
  function confira(c, t) {
    const t0 = T.ganchoFim - 0.05;
    if (t < t0 || t > T.confiraFim) return;
    saida(c, t, T.confiraFim, () => {
      const e = ent(t, t0 + 0.2, 0.5);
      c.save(); c.globalAlpha *= e; c.translate(0, 30 * (1 - e));
      txt(c, 'Antes de registrar,', 540, 720, { size: 72, weight: 800, align: 'center', box: 'título 1' });
      const kt = kick(t, at('cinco', 99), 0.3);
      txt(c, 'confira 5 informações:', 540, 812, { size: 72 * (1 + 0.03 * kt), weight: 900, color: C.lime, align: 'center', box: 'título 2' });
      c.restore();
      // as cinco casas da conferência, uma a uma, em "cinco informações"
      for (let i = 0; i < 5; i++) {
        const u = E.outBack(p(t, at('cinco', t0 + 1) + i * 0.09, at('cinco', t0 + 1) + 0.3 + i * 0.09), 2);
        if (u <= 0) continue;
        const x = 540 + (i - 2) * 150, y = 960;
        c.save(); c.translate(x, y); c.scale(u, u);
        rr(c, -52, -52, 104, 104, 24); c.fillStyle = C.card; c.fill(); c.strokeStyle = css(C.lime, 0.7); c.lineWidth = 3; c.stroke();
        txt(c, String(i + 1).padStart(2, '0'), 0, 13, { fam: MONO, size: 36, weight: 800, color: C.lime, align: 'center' });
        c.restore();
        BOX(`casa ${i + 1}`, x - 52, y - 52, x + 52, y + 52);
      }
    });
  }

  // ---------------------------------------------------------------- 3. A FICHA DE CONFERÊNCIA (papel)
  const FICHA = { x0: 130, x1: 950, y0: 610, cab: 132, row: 94 };      // termina em y ≈ 1234 (a legenda começa em ≈ 1280)
  function ficha(c, t) {
    const t0 = T.confiraFim - 0.1;
    if (t < t0 || t > T.fichaFim) return;
    saida(c, t, T.fichaFim, () => {
      const e = ent(t, t0, 0.55), { x0, x1, y0, cab, row } = FICHA, w = x1 - x0, itens = LN.exemplo.ficha, h = cab + itens.length * row + 8;
      c.save(); c.globalAlpha *= e; c.translate(0, 90 * (1 - e));
      c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 50; c.shadowOffsetY = 24;
      c.beginPath(); c.moveTo(x0 + 18, y0); c.lineTo(x1 - 18, y0); c.quadraticCurveTo(x1, y0, x1, y0 + 18); c.lineTo(x1, y0 + h);
      const n = 20, step = w / n;
      for (let i = 0; i < n; i++) { c.lineTo(x1 - (i + 0.5) * step, y0 + h + 14); c.lineTo(x1 - (i + 1) * step, y0 + h); }
      c.lineTo(x0, y0 + 18); c.quadraticCurveTo(x0, y0, x0 + 18, y0); c.closePath();
      c.fillStyle = C.paper; c.fill(); c.restore();
      BOX('ficha', x0, y0, x1, y0 + h + 14);
      icon(c, 'recibo', x0 + 56, y0 + 54, 42, C.ink, 3.5);
      txt(c, 'CONFERÊNCIA DA RESERVA', x0 + 98, y0 + 66, { fam: MONO, size: 27, weight: 800, color: C.ink, ls: 2, box: 'ficha título' });
      selo(c, x0 + 98, y0 + 98, { size: 19 });            // abaixo do título, à direita do ícone
      c.fillStyle = C.paper2; c.fillRect(x0 + 36, y0 + cab - 2, w - 72, 3);
      itens.forEach((it, i) => {
        const fr = T.F[it.id], y = y0 + cab + i * row, tc = at(it.id, fr.t0);
        const ativo = t >= fr.t0 - 0.1, k = kick(t, fr.t0 - 0.05, 0.4);
        if (ativo && t < fr.t1 + 0.3) { c.fillStyle = css(C.lime, 0.22 + 0.25 * k); rr(c, x0 + 22, y + 5, w - 44, row - 10, 14); c.fill(); }
        txt(c, String(i + 1).padStart(2, '0'), x0 + 44, y + 42, { fam: MONO, size: 26, weight: 800, color: ativo ? C.ink : C.inkSoft });
        txt(c, it.rotulo, x0 + 100, y + 42, { size: 36, weight: 800, color: ativo ? C.ink : css(C.ink, 0.45), box: `item ${i + 1}` });
        // o dado fictício é escrito ao longo da frase
        if (ativo) {
          const u = clamp(p(t, fr.t0, fr.t0 + 0.75 * (fr.t1 - fr.t0)) * 1.0001), nch = Math.ceil(it.valor.length * u);
          if (nch > 0) txt(c, it.valor.slice(0, nch), x0 + 100, y + 82, { fam: MONO, size: 27, weight: 800, color: '#3D4A2A', box: `dado ${it.id}` });
        }
        // o check entra na palavra que nomeia o item
        const ck = p(t, tc, tc + 0.3);
        c.save(); c.translate(x1 - 70, y + row / 2);
        c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.strokeStyle = css(C.ink, 0.35); c.lineWidth = 3; c.setLineDash([5, 5]); c.stroke(); c.setLineDash([]);
        if (ck > 0) { const s = E.outBack(ck, 2.2); c.scale(s, s); c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.fillStyle = C.ink; c.fill(); icon(c, 'check', 0, 0, 32, C.lime, 6); }
        c.restore();
        if (i < itens.length - 1) { c.fillStyle = css(C.ink, 0.1); c.fillRect(x0 + 36, y + row - 1, w - 72, 2); }
      });
      // "CONFERIDA", carimbada em "conferido"
      const ec = p(t, at('conferido', 99), at('conferido', 99) + 0.3);
      if (ec > 0) {
        const s = lerp(1.8, 1, E.outCubic(ec));
        c.save(); c.translate(x1 - 160, y0 + 66); c.rotate(-0.12); c.scale(s, s); c.globalAlpha *= clamp(ec * 1.6);
        rr(c, -122, -36, 244, 72, 14); c.fillStyle = css(C.paper, 0.85); c.fill(); c.strokeStyle = '#2F7A16'; c.lineWidth = 5; c.stroke();
        txt(c, 'CONFERIDA', 0, 12, { fam: MONO, size: 32, weight: 800, color: '#2F7A16', align: 'center', ls: 3 });
        c.restore();
      }
      // "certa": a ficha toda brilha em limão
      const kc = kick(t, at('certa', 99), 0.6);
      if (kc > 0.01) { c.save(); c.strokeStyle = css(C.lime, 0.9 * kc); c.lineWidth = 8; c.shadowColor = C.lime; c.shadowBlur = 30 * kc; rr(c, x0 - 6, y0 - 6, w + 12, h + 12, 24); c.stroke(); c.restore(); }
      c.restore();
    });
  }

  // ---------------------------------------------------------------- 4. ENVIE
  function envie(c, t) {
    const t0 = T.fichaFim - 0.05;
    if (t < t0 || t > T.ctaFim) return;
    saida(c, t, T.ctaFim, () => {
      const e = ent(t, t0, 0.5);
      const u = E.inOutSine(p(t, t0 + 0.1, t0 + 2.2)), ax = lerp(200, 800, u), ay = 600 - 160 * Math.sin(Math.PI * u) + 40 * u;
      c.save(); c.globalAlpha *= e;
      c.strokeStyle = css(C.lime, 0.35); c.lineWidth = 4; c.setLineDash([4, 14]); c.beginPath();
      for (let k = 0; k <= 30; k++) { const v = (k / 30) * u, x = lerp(200, 800, v), y = 600 - 160 * Math.sin(Math.PI * v) + 40 * v; k ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(ax, ay, 66, 0, TAU); c.fillStyle = C.lime; c.fill();
      icon(c, 'aviao', ax, ay, 70, C.ink, 4.5);
      c.restore();
      const ke = kick(t, at('envie', 99), 0.3);
      c.save(); c.globalAlpha *= e; c.translate(0, 30 * (1 - e));
      txt(c, 'Envie', 130, 860, { size: 120 * (1 + 0.04 * ke), weight: 900, color: C.lime, ls: -3, box: 'envie' });
      txt(c, 'para quem atende', 130, 960, { size: 80, weight: 900, ls: -2, box: 'linha 2' });
      txt(c, 'o WhatsApp da', 130, 1048, { size: 80, weight: 900, ls: -2, box: 'linha 3' });
      txt(c, 'sua pousada.', 130, 1136, { size: 80, weight: 900, ls: -2, box: 'linha 4' });
      c.restore();
    });
  }

  // ---------------------------------------------------------------- 5. LOGO
  function fimLogo(c, t) {
    const t0 = LN.logo, e = E.outBack(p(t, t0, t0 + 0.45), 1.8), D = 300, cy = 760;
    if (t < t0) return;
    const g0 = c.createRadialGradient(540, cy, 0, 540, cy, 620);
    g0.addColorStop(0, css(C.lime, 0.15 * clamp(e))); g0.addColorStop(1, css(C.lime, 0));
    c.fillStyle = g0; c.fillRect(0, 0, W, H);
    const ru = p(t, t0 + 0.3, t0 + 1.0);
    if (ru > 0 && ru < 1) { c.beginPath(); c.arc(540, cy, lerp(D * 0.52, 230, E.outExpo(ru)), 0, TAU); c.strokeStyle = css(C.lime, 0.9 * (1 - ru)); c.lineWidth = 7 * (1 - ru) + 1; c.stroke(); }
    c.save(); c.globalAlpha *= clamp(e * 2); const d = D * lerp(0.6, 1, e); c.drawImage(LOGO, 540 - d / 2, cy - d / 2, d, d); c.restore();
    BOX('logo final', 540 - D / 2, cy - D / 2, 540 + D / 2, cy + D / 2);
    const NS = 96, w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.4), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.4), nx = 540 - (w1 + w2) / 2;
    const pin = E.outExpo(p(t, t0 + 0.05, t0 + 0.5)), ny = 1070;
    c.save(); c.beginPath(); c.rect(60, ny - 100, 960, 130); c.clip();
    txt(c, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900, ls: -2.4 });
    txt(c, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime, ls: -2.4 });
    c.restore();
    txt(c, LN.marca, 540, 1146, { fam: MONO, size: 34, weight: 700, color: C.gray, align: 'center', ls: 1, alpha: E.outCubic(p(t, t0 + 0.1, t0 + 0.6)) });
  }

  // ---------------------------------------------------------------- legenda palavra por palavra
  function layoutLegenda() {
    PAGES = [];
    const wid = (ws, a, b) => tw(ws.slice(a, b).map((x) => x.w).join(' '), DISPLAY, CAP.size, 900, -0.02 * CAP.size);
    LN.frases.forEach((f, fi) => {
      const ws = f.palavras, pages = [];
      const prox = LN.frases[fi + 1] ? LN.frases[fi + 1].palavras[0].t0 : LN.logo - 0.05;
      let i = 0;
      while (i < ws.length) {
        let j = i, lines = 1, a = i;
        while (j < ws.length) {
          if (wid(ws, a, j + 1) > CAP.maxW) { if (a === j) { j++; continue; } lines++; a = j; if (lines > 2) break; }
          else { j++; if (/[.?!]$/.test(ws[j - 1].w) && j < ws.length && ws[j - 1].t1 - ws[i].t0 >= CAP.minPag + 0.2) break; }
        }
        // página cheia no meio de uma frase: volta até a última vírgula/ponto, se a página continuar com ≥ 1,5 s
        if (j < ws.length && !/[,.:;?!]$/.test(ws[j - 1].w)) {
          let achou = false;
          for (let k = j - 1; k > i + 1; k--) if (/[,.:;?!]$/.test(ws[k - 1].w) && ws[k - 1].t1 - ws[i].t0 >= CAP.minPag) { j = k; achou = true; break; }
          // sem pontuação boa: corta antes de "e", "ou", "mais", "menos" (a página nova começa na conjunção)
          if (!achou) for (let k = j - 1; k > i + 1; k--) if (/^(e|ou|mais|menos)$/i.test(ws[k].w) && ws[k - 1].t1 - ws[i].t0 >= CAP.minPag) { j = k; break; }
        }
        pages.push([i, j]); i = j;
      }
      const cabe = (a, b) => { let ln = 1, x0 = a; for (let k = a + 1; k <= b; k++) if (wid(ws, x0, k) > CAP.maxW) { if (k - 1 === x0) continue; ln++; x0 = k - 1; } return ln <= 2; };
      const dura = (k) => (pages[k + 1] ? ws[pages[k + 1][0]].t0 : Math.min(prox, ws[pages[k][1] - 1].t1 + CAP.segura)) - ws[pages[k][0]].t0;
      for (let k = pages.length - 1; k > 0; k--)
        while ((dura(k) < CAP.minPag || pages[k][1] - pages[k][0] === 1) && pages[k - 1][1] - pages[k - 1][0] > 2 && cabe(pages[k][0] - 1, pages[k][1])) { pages[k - 1][1]--; pages[k][0]--; }
      pages.forEach(([a, b]) => {
        const n = b - a; let brk = n;
        if (wid(ws, a, b) > CAP.maxW) { let best = 1e9; for (let k = 1; k < n; k++) { const m = Math.max(wid(ws, a, a + k), wid(ws, a + k, b)); if (m < best) { best = m; brk = k; } } }
        const rows = brk >= n ? [[a, b]] : [[a, a + brk], [a + brk, b]], pos = {};
        rows.forEach(([r0, r1], ri) => {
          let x = CAP.cx - wid(ws, r0, r1) / 2;
          for (let k = r0; k < r1; k++) { pos[k] = { x, row: ri }; x += tw(ws[k].w + ' ', DISPLAY, CAP.size, 900, -0.02 * CAP.size) - 0.02 * CAP.size; }
        });
        PAGES.push({ a, b, rows, pos, nrows: rows.length, t0: ws[a].t0, words: ws, fimFala: ws[b - 1].t1 });
      });
    });
    PAGES.forEach((q, i) => {
      const nx = PAGES[i + 1], lim = LN.logo - 0.05;
      let t1 = Math.min(nx ? nx.t0 : lim, q.fimFala + CAP.segura);
      t1 = Math.max(t1, Math.min(q.t0 + CAP.minPag, nx ? nx.t0 : lim));
      q.t1 = Math.min(t1, lim);
    });
  }
  function legenda(c, t) {
    const pg = PAGES.find((q) => t >= q.t0 && t < q.t1);
    if (!pg) return;
    const y0 = CAP.y1 + (pg.nrows === 1 ? CAP.lh / 2 : 0), ls = -0.02 * CAP.size;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 16; c.shadowOffsetY = 2;
    for (let k = pg.a; k < pg.b; k++) {
      const w = pg.words[k];
      if (t < w.t0) continue;
      const u = E.outCubic(p(t, w.t0, w.t0 + 0.09)), ps = pg.pos[k], ww = tw(w.w, DISPLAY, CAP.size, 900, ls);
      const pop = w.chave ? 1 + 0.07 * kick(t, w.t0, 0.18) : 1, y = y0 + ps.row * CAP.lh + (1 - u) * 10;
      c.save(); setFont(c, DISPLAY, CAP.size, 900, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.globalAlpha = u; c.fillStyle = w.chave ? C.lime : C.white;
      c.translate(ps.x + ww / 2, y - CAP.size * 0.3); c.scale(pop, pop); c.fillText(w.w, -ww / 2, CAP.size * 0.3); c.restore();
      if (u > 0.99) BOX('legenda', ps.x, y - CAP.size * 0.76, ps.x + ww, y + CAP.size * 0.22);
    }
    c.restore();
  }

  // ---------------------------------------------------------------- o quadro
  function frame(c, t) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowColor = 'transparent';
    fundo(c, t);
    c.save();
    c.beginPath(); c.rect(0, 0, W, H); c.rect(950, 1060, W - 950, 500); c.clip('evenodd');      // a coluna de botões fica vazia
    if (t < LN.logo) {
      if (t < T.ganchoFim) gancho(c, t);
      confira(c, t); ficha(c, t); balao(c, t); envie(c, t);
      marca(c);
      legenda(c, t);
    } else fimLogo(c, t);
    c.restore();
    avisoPrevia(c);
  }
  // ---------------------------------------------------------------- capa para a grade (à parte: o vídeo não muda)
  // o mesmo quadro 0, com a logo pequena no lugar e o bloco principal deslocado para o centro do recorte 3:4 (y = 960)
  function desenhaCapa(c, dy) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowColor = 'transparent';
    fundo(c, 0);
    c.save(); c.translate(0, dy); gancho(c, 0); balao(c, 0); c.restore();
    marca(c);
  }
  function capaGrade(c) {
    BOXES = []; desenhaCapa(c, 0);
    const bl = BOXES.filter((b) => b.nome !== 'marca'), topo = Math.min(...bl.map((b) => b.y0)), base = Math.max(...bl.map((b) => b.y1));
    const dy = Math.round(960 - (topo + base) / 2);
    BOXES = []; desenhaCapa(c, dy);
    const caixas = BOXES.map((b) => (b.nome === 'marca' ? b : { ...b, y0: b.y0 + dy, y1: b.y1 + dy })); BOXES = null;
    return { caixas, bloco: { topo: topo + dy, base: base + dy, centro: (topo + base) / 2 + dy }, dy };
  }
  function renderAt(c, t) { frame(c, clamp(t, 0, DUR - 1e-4)); }
  function init(img, linha, o = {}) {
    LOGO = img; LN = linha; DUR = linha.duracao; PREVIA = !!o.previa;
    M = document.createElement('canvas').getContext('2d');
    tempos(); layoutLegenda();
  }
  function caixas(c, t) { BOXES = []; frame(c, t); const out = BOXES; BOXES = null; return out; }
  window.REEL = {
    init, renderAt, caixas, capaGrade, get DURATION() { return DUR; }, CAP,
    legenda: () => PAGES.map((q) => ({ t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.w).join(' ')),
      palavras: Array.from({ length: q.b - q.a }, (_, i) => ({ w: q.words[q.a + i].w, t0: q.words[q.a + i].t0, chave: !!q.words[q.a + i].chave })) })),
    tempos: () => T,
  };
})();
