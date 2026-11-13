/*
 * FAZLO Hospeda — educativo "O hóspede chegou? Confira isto no check-in." (1080×1920, 60 fps)
 * Conteúdo EDUCATIVO: não mostra a interface do sistema nem imita telas. Os dados são fictícios e os mesmos da reserva do
 * educativo reserva-whatsapp (Ana Lima, 14 a 16/11, 2 adultos e 1 criança, Chalé 3, R$ 900,00, sinal R$ 450,00), com
 * "Exemplo fictício" sempre visível quando há dado na tela; nenhum número de documento ("documento conferido").
 * A linha do tempo vem de ../linha.json (scripts/linha.py, a partir da locução com a marcação de tempo do ElevenLabs).
 *
 * Cenas: GANCHO (quadro 0 = capa: título + a chave em traço limão, balançando) · "CONFIRA QUATRO COISAS" (o título
 * encolhe e sobe; a ficha "CHECK-IN" entra; as casas 01–04 em "quatro") · OS QUATRO ITENS (cada linha acende na
 * própria frase, o dado é escrito e o check entra na palavra-chave) · "CONFERIDO" carimbado; em "mão do hóspede" a
 * chave sai da ficha em limão · MANDE (sem legenda: a cena já mostra a frase) · LOGO (últimos 3,2 s).
 * Mesmo motor e DNA do conta-do-caixa e do reserva-whatsapp (legenda palavra por palavra: Inter Display 900, 68 px,
 * chaves em limão, linhas em y 1332/1412, x 130–936, cada página ≥ 1,5 s; a divisão das páginas vem do roteiro).
 * Conteúdo das cenas entre y 400 e 1270; nada na coluna de botões (x > 940, y > 1000).
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
    T = { F, ganchoFim: IDS.confira, fichaFim: F.cta.t0 + 0.14, ctaFim: LN.logo };
  }
  function saida(c, t, fim, desenha) {
    const u = p(t, fim - 0.3, fim);
    if (u >= 1) return;
    c.save(); c.globalAlpha *= 1 - E.inCubic(u); c.translate(0, -40 * E.inCubic(u)); desenha(); c.restore();
  }
  function saidaLado(c, t, fim, desenha) {                   // deslize rápido para a esquerda
    const u = E.inCubic(p(t, fim - 0.3, fim));
    if (u >= 1) return;
    c.save(); c.translate(-1150 * u, 0); desenha(); c.restore();
  }
  function selo(c, x, y, o = {}) {                              // "EXEMPLO FICTÍCIO" (sempre que há dado na tela)
    const s = 'EXEMPLO FICTÍCIO', size = o.size || 22, w = tw(s, MONO, size, 800, 3) + 36, h = size * 2;
    rr(c, x, y - h / 2, w, h, 10);
    if (o.bg) { c.fillStyle = o.bg; c.fill(); }
    c.strokeStyle = o.cor || '#C25E00'; c.lineWidth = 2.5; c.setLineDash([7, 5]); c.stroke(); c.setLineDash([]);
    txt(c, s, x + 18, y + size * 0.36, { fam: MONO, size, weight: 800, color: o.cor || '#C25E00', ls: 3, box: 'exemplo fictício' });
    return w;
  }

  // ---------------------------------------------------------------- a chave (traço da marca: linha única, pontas arredondadas)
  // desenhada em torno do centro da argola; o comprimento total é ~ 470 × s
  function chave(c, x, y, s, ang, o = {}) {
    const col = o.cor || C.lime, fill = o.fill ?? css(C.card2, 0.95);
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
    c.strokeStyle = col; c.lineWidth = (o.lw || 6) / s * s; c.lineCap = 'round'; c.lineJoin = 'round';
    if (o.glow) { c.shadowColor = col; c.shadowBlur = o.glow; }
    // a argolinha do chaveiro
    c.beginPath(); c.arc(-112, 0, 30, 0, TAU); c.stroke();
    // a cabeça da chave (com o furo) e a haste com os dentes, num contorno só
    c.beginPath();
    c.arc(0, 0, 74, Math.PI * 0.12, Math.PI * 1.88);
    c.lineTo(Math.cos(Math.PI * 1.88) * 74 + 6, -16); c.lineTo(330, -16); c.quadraticCurveTo(352, -16, 352, 4);
    c.lineTo(352, 46); c.lineTo(326, 46); c.lineTo(326, 26); c.lineTo(300, 26); c.lineTo(300, 54); c.lineTo(272, 54); c.lineTo(272, 26);
    c.lineTo(246, 26); c.lineTo(246, 42); c.lineTo(222, 42); c.lineTo(222, 16); c.lineTo(Math.cos(Math.PI * 0.12) * 74 + 6, 16); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    c.stroke();
    c.beginPath(); c.arc(-22, 0, 24, 0, TAU); c.stroke();                            // o furo
    c.beginPath(); c.moveTo(110, 0); c.lineTo(300, 0); c.globalAlpha *= 0.5; c.stroke(); // o sulco da haste
    c.restore();
  }

  // ---------------------------------------------------------------- 1. GANCHO (o quadro 0 é a capa)
  const KEY = { x: 405, y: 1100, s: 1.3 };
  function ganchoBloco(c, t) {
    chip(c, 'ANTES DE ENTREGAR A CHAVE', 540, 466, { align: 'center', box: 'chip' });
    const S = 100, k = kick(t, at('chegou', 99), 0.3);
    const L = (s, y, cor, nome) => txt(c, s, 540, y, { size: S, weight: 900, align: 'center', ls: -0.03 * S, color: cor, box: nome });
    L('O hóspede', 600, C.white, 'título 1');
    c.save(); c.translate(540, 674); c.scale(1 + 0.05 * k, 1 + 0.05 * k); c.translate(-540, -674);
    L('chegou?', 702, C.white, 'título 2'); c.restore();
    L('Confira isto', 812, C.lime, 'título 3');
    L('no check-in.', 914, C.lime, 'título 4');
    // a chave balança de leve; dá um tranco em "chegou" e brilha em "chave"
    const kc = kick(t, at('chegou', 99), 0.5), kv = kick(t, at('chave', 99), 0.5);
    const ang = -0.06 + 0.05 * Math.sin(t * 2.1) + 0.16 * kc * Math.sin((t - at('chegou', 0)) * 18);
    chave(c, KEY.x, KEY.y + 3 * Math.sin(t * 1.7), KEY.s * (1 + 0.06 * kv), ang, { glow: 34 * kv });
    BOX('chave', KEY.x - 148 * KEY.s, KEY.y - 96 * KEY.s, KEY.x + 358 * KEY.s, KEY.y + 96 * KEY.s);
  }
  function gancho(c, t) {
    const t0 = T.ganchoFim - 0.04, u = E.inOutCubic(p(t, t0, t0 + 0.3));
    if (u >= 1) return;
    // em "confira": o título encolhe e sobe; a chave sai
    if (1.6 * u >= 1) return;
    c.save(); c.globalAlpha *= clamp(1 - 1.6 * u);
    c.translate(540, 400); c.scale(lerp(1, 0.5, u), lerp(1, 0.5, u)); c.translate(-540, -400 - 60 * u);
    ganchoBloco(c, t); c.restore();
  }
  function tituloPequeno(c, t) {
    const t0 = T.ganchoFim + 0.14, e = E.outCubic(p(t, t0, t0 + 0.35));   // entra quando o bloco do gancho já sumiu
    if (t < t0 || t > T.fichaFim) return;
    saida(c, t, T.fichaFim, () => {
      c.save(); c.globalAlpha *= e; c.translate(0, 26 * (1 - e));
      const a = 'O hóspede chegou? ', b = 'Confira isto no check-in.', S = 38;
      const w1 = tw(a, DISPLAY, S, 900, -1), w2 = tw(b, DISPLAY, S, 900, -1), x = 540 - (w1 + w2) / 2;
      txt(c, a, x, 440, { size: S, weight: 900, ls: -1, box: 'título pequeno 1' });
      txt(c, b, x + w1, 440, { size: S, weight: 900, ls: -1, color: C.lime, box: 'título pequeno 2' });
      c.restore();
    });
  }

  // ---------------------------------------------------------------- 2–4. A FICHA "CHECK-IN" (papel)
  const FICHA = { x0: 130, x1: 930, y0: 486, cab: 116, row: 112, pe: 104 };
  function linhaFicha(c, t, it, i, y) {
    const { x0, x1, row } = FICHA, w = x1 - x0, fr = T.F[it.frase], tc = at(it.id, fr.t0);
    const ativo = t >= fr.t0 - 0.1, k = kick(t, fr.t0 - 0.05, 0.4);
    if (ativo && t < fr.t1 + 0.35) { c.fillStyle = css(C.lime, 0.24 + 0.25 * k); rr(c, x0 + 18, y + 6, w - 36, row - 12, 14); c.fill(); }
    // as casas 01–04 aparecem em "quatro"
    const tq = at('quatro', 0) + i * 0.09, uq = p(t, tq, tq + 0.3);
    if (uq > 0) {
      const s = E.outBack(uq, 2.4);
      c.save(); c.translate(x0 + 60, y + 44); c.scale(s, s);
      txt(c, String(i + 1).padStart(2, '0'), 0, 0, { fam: MONO, size: 28, weight: 800, color: ativo ? C.ink : C.inkSoft, align: 'center' });
      c.restore();
      if (uq >= 1) BOX(`casa ${i + 1}`, x0 + 40, y + 20, x0 + 80, y + 52);
    }
    const cor = ativo ? C.ink : css(C.ink, 0.38);
    const lw = txt(c, it.rotulo, x0 + 100, y + 48, { size: 36, weight: 800, color: cor, box: `rótulo ${it.id}` });
    if (it.nota && ativo) txt(c, it.nota, x0 + 100 + lw + 20, y + 46, { fam: MONO, size: 21, weight: 700, color: C.inkSoft, alpha: p(t, fr.t0, fr.t0 + 0.3), box: `valor nota ${it.id}` });
    // o dado fictício é escrito ao longo da frase, até a palavra-chave
    if (ativo) {
      const u = p(t, fr.t0 + 0.05, tc), s = it.valor.slice(0, Math.ceil(it.valor.length * u));
      if (s) txt(c, s, x0 + 100, y + 90, { fam: MONO, size: 28, weight: 800, color: '#3D4A2A', box: `valor ${it.id}` });
    }
    // o check entra na palavra-chave
    const ck = p(t, tc, tc + 0.3);
    c.save(); c.translate(x1 - 58, y + row / 2);
    c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.strokeStyle = css(C.ink, 0.3); c.lineWidth = 3; c.setLineDash([5, 5]); c.stroke(); c.setLineDash([]);
    if (ck > 0) { const s = E.outBack(ck, 2.2); c.scale(s, s); c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.fillStyle = C.ink; c.fill(); icon(c, 'check', 0, 0, 32, C.lime, 6); }
    c.restore();
    BOX(`check ${it.id}`, x1 - 84, y + row / 2 - 26, x1 - 32, y + row / 2 + 26);
  }
  function ficha(c, t) {
    const t0 = T.ganchoFim + 0.12;
    if (t < t0 || t > T.fichaFim) return;
    saidaLado(c, t, T.fichaFim, () => {
      // a ficha assenta antes de "quatro" (as casas 01–04)
      const e = ent(t, t0, 0.22), { x0, x1, y0, cab, row, pe } = FICHA, w = x1 - x0, itens = LN.exemplo.ficha;
      const h = cab + itens.length * row + pe;
      c.save(); c.globalAlpha *= e; c.translate(0, 110 * (1 - e));
      c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 50; c.shadowOffsetY = 24;
      c.beginPath(); c.moveTo(x0 + 18, y0); c.lineTo(x1 - 18, y0); c.quadraticCurveTo(x1, y0, x1, y0 + 18); c.lineTo(x1, y0 + h);
      const n = 20, step = w / n;
      for (let i = 0; i < n; i++) { c.lineTo(x1 - (i + 0.5) * step, y0 + h + 14); c.lineTo(x1 - (i + 1) * step, y0 + h); }
      c.lineTo(x0, y0 + 18); c.quadraticCurveTo(x0, y0, x0 + 18, y0); c.closePath();
      c.fillStyle = C.paper; c.fill(); c.restore();
      BOX('ficha', x0, y0, x1, y0 + h + 14);
      icon(c, 'recibo', x0 + 52, y0 + 50, 40, C.ink, 3.5);
      txt(c, 'CHECK-IN', x0 + 92, y0 + 60, { fam: MONO, size: 30, weight: 800, color: C.ink, ls: 3, box: 'ficha título' });
      selo(c, x0 + 92, y0 + 94, { size: 18 });
      c.fillStyle = C.paper2; c.fillRect(x0 + 30, y0 + cab - 2, w - 60, 3);
      itens.forEach((it, i) => {
        const y = y0 + cab + i * row;
        if (i > 0) { c.fillStyle = css(C.ink, 0.1); c.fillRect(x0 + 30, y - 1, w - 60, 2); }
        linhaFicha(c, t, it, i, y);
      });
      // o pé da ficha: a chave do chalé, presa ao papel até "mão do hóspede"
      const yp = y0 + cab + itens.length * row, tm = at('mao', 99);
      c.fillStyle = css(C.ink, 0.14); c.fillRect(x0 + 30, yp, w - 60, 2);
      txt(c, 'CHAVE', x0 + 48, yp + 46, { fam: MONO, size: 22, weight: 800, color: C.inkSoft, ls: 3, box: 'chave rótulo' });
      txt(c, LN.exemplo.chave, x0 + 48, yp + 82, { size: 32, weight: 800, color: C.ink, box: 'valor chave' });
      if (t < tm) {
        chave(c, x0 + 440, yp + 54, 0.36, -0.04, { cor: C.ink, fill: css(C.paper2, 1), lw: 5 });
      } else {
        c.save(); c.setLineDash([6, 8]); c.strokeStyle = css(C.ink, 0.3); c.lineWidth = 3; rr(c, x0 + 380, yp + 22, 220, 64, 16); c.stroke(); c.restore();
      }
      // "CONFERIDO", carimbado em "conferido"
      const tl = at('conferido', 99), ec = p(t, tl, tl + 0.28);
      if (ec > 0) {
        const s = lerp(1.9, 1, E.outCubic(ec)), tr = kick(t, tl + 0.2, 0.2) * 6;
        c.save(); c.translate(x1 - 170 + tr * Math.sin(t * 90), y0 + 58); c.rotate(-0.12); c.scale(s, s); c.globalAlpha *= clamp(ec * 1.6);
        rr(c, -128, -36, 256, 72, 14); c.fillStyle = css(C.paper, 0.85); c.fill(); c.strokeStyle = '#2F7A16'; c.lineWidth = 5; c.stroke();
        txt(c, 'CONFERIDO', 0, 12, { fam: MONO, size: 32, weight: 800, color: '#2F7A16', align: 'center', ls: 3 });
        c.restore();
        if (ec >= 1) BOX('carimbo', x1 - 170 - 135, y0 + 58 - 52, x1 - 170 + 135, y0 + 58 + 52);
      }
      c.restore();
    });
  }
  // "mão do hóspede": a chave sai da ficha e desliza para fora, em limão, com brilho
  function chaveSai(c, t) {
    const tm = at('mao', 99), u = p(t, tm, tm + 0.8);
    if (t < tm || u >= 1) return;
    const yp = FICHA.y0 + FICHA.cab + LN.exemplo.ficha.length * FICHA.row;
    const x0 = FICHA.x0 + 440, y0_ = yp + 54, v = E.inOutCubic(u);
    const lift = E.outBack(p(t, tm, tm + 0.25), 2);
    const x = lerp(x0, 1300, E.inCubic(clamp((u - 0.25) / 0.75))), y = y0_ - 70 * lift - 160 * E.inCubic(clamp((u - 0.25) / 0.75));
    const s = lerp(0.36, 0.62, lift), g = 1 - v * 0.3;
    // o brilho limão no instante em que a chave solta do papel
    const rb = p(t, tm, tm + 0.5);
    if (rb < 1) { c.beginPath(); c.arc(x0 + 40, y0_, lerp(40, 190, E.outExpo(rb)), 0, TAU); c.strokeStyle = css(C.lime, 0.9 * (1 - rb)); c.lineWidth = 8 * (1 - rb) + 1; c.stroke(); }
    chave(c, x, y, s, -0.04 - 0.25 * v, { cor: C.lime, glow: 30 * g, lw: 6 });
    if (u < 0.25) BOX('chave saindo', x - 150 * s, y - 100 * s, x + 370 * s, y + 100 * s);
  }

  // ---------------------------------------------------------------- 6. MANDE
  function mande(c, t) {
    const t0 = at('mande', T.fichaFim - 0.14);                 // o CTA desliza para dentro na própria palavra "Mande"
    if (t < t0 || t > T.ctaFim) return;
    saida(c, t, T.ctaFim, () => {
      const e = ent(t, t0, 0.35), dx = 700 * (1 - E.outCubic(p(t, t0, t0 + 0.35)));
      c.save(); c.translate(dx, 0);
      const u = E.inOutSine(p(t, t0 + 0.1, t0 + 2.2)), ax = lerp(200, 800, u), ay = 600 - 160 * Math.sin(Math.PI * u) + 40 * u;
      c.save(); c.globalAlpha *= e;
      c.strokeStyle = css(C.lime, 0.35); c.lineWidth = 4; c.setLineDash([4, 14]); c.beginPath();
      for (let k = 0; k <= 30; k++) { const v = (k / 30) * u, x = lerp(200, 800, v), y = 600 - 160 * Math.sin(Math.PI * v) + 40 * v; k ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(ax, ay, 66, 0, TAU); c.fillStyle = C.lime; c.fill();
      icon(c, 'aviao', ax, ay, 70, C.ink, 4.5);
      c.restore();
      BOX('avião', ax - 66, ay - 66, ax + 66, ay + 66);
      const ke = kick(t, at('mande', 99), 0.3);
      c.save(); c.globalAlpha *= e; c.translate(0, 30 * (1 - e));
      txt(c, 'Mande', 130, 860, { size: 120 * (1 + 0.04 * ke), weight: 900, color: C.lime, ls: -3, box: 'mande' });
      txt(c, 'para quem faz', 130, 960, { size: 80, weight: 900, ls: -2, box: 'linha 2' });
      txt(c, 'o check-in na', 130, 1048, { size: 80, weight: 900, ls: -2, box: 'linha 3' });
      txt(c, 'sua pousada.', 130, 1136, { size: 80, weight: 900, ls: -2, box: 'linha 4' });
      c.restore(); c.restore();
    });
  }

  // ---------------------------------------------------------------- 7. LOGO
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

  // ---------------------------------------------------------------- legenda palavra por palavra (divisão fixada no roteiro)
  function layoutLegenda() {
    PAGES = [];
    const ls = -0.02 * CAP.size, wid = (ws, a, b) => tw(ws.slice(a, b).map((x) => x.w).join(' '), DISPLAY, CAP.size, 900, ls);
    // regra da série: a frase que a cena já mostra como texto principal (sem_legenda) não entra na legenda
    const sem = LN.sem_legenda || [], todas = LN.frases.filter((f) => !sem.includes(f.id)).flatMap((f) => f.palavras);
    // cada página sai, no máximo, quando começa a próxima frase sem legenda (ou a logo)
    const limDe = (tf) => { const f = LN.frases.find((x) => sem.includes(x.id) && x.palavras[0].t0 >= tf); return f ? f.palavras[0].t0 : LN.logo - 0.05; };
    let k = 0;
    for (const pg of LN.legenda) {
      const a = k, rows = [], pos = {};
      pg.forEach((ln) => { const r0 = k; for (const w of ln.split(' ')) { if (!todas[k] || todas[k].w !== w) throw new Error(`legenda: "${w}" × "${todas[k] && todas[k].w}"`); k++; } rows.push([r0, k]); });
      rows.forEach(([r0, r1], ri) => {
        const lw = wid(todas, r0, r1); let x = Math.min(CAP.cx - lw / 2, 936 - lw);
        for (let j = r0; j < r1; j++) { pos[j] = { x, row: ri }; x += tw(todas[j].w + ' ', DISPLAY, CAP.size, 900, ls) - 0.02 * CAP.size; }
      });
      PAGES.push({ a, b: k, rows, pos, nrows: rows.length, t0: todas[a].t0, words: todas, fimFala: todas[k - 1].t1 });
    }
    if (k !== todas.length) throw new Error('legenda: sobram palavras');
    PAGES.forEach((q, i) => {
      const nx = PAGES[i + 1];
      const lim = limDe(q.fimFala), fim = nx ? Math.min(nx.t0, lim) : lim;
      let t1 = Math.min(fim, q.fimFala + CAP.segura);
      t1 = Math.max(t1, Math.min(q.t0 + CAP.minPag, fim));
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
    c.beginPath(); c.rect(0, 0, W, H); c.rect(941, 1001, W - 941, 600); c.clip('evenodd');      // a coluna de botões (x > 940, y > 1000) fica vazia
    if (t < LN.logo) {
      gancho(c, t); tituloPequeno(c, t);
      ficha(c, t); chaveSai(c, t); mande(c, t);
      marca(c);
      legenda(c, t);
    } else fimLogo(c, t);
    c.restore();
    avisoPrevia(c);
  }
  // ---------------------------------------------------------------- capa para a grade (à parte: o vídeo não muda)
  // o mesmo quadro 0, com a marca no lugar e o bloco principal deslocado para o centro do recorte 3:4 (y = 960)
  function desenhaCapa(c, dy) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowColor = 'transparent';
    fundo(c, 0);
    c.save(); c.translate(0, dy); ganchoBloco(c, 0); c.restore();
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
      x: q.rows.map(([a, b]) => [q.pos[a].x, q.pos[b - 1].x + tw(q.words[b - 1].w, DISPLAY, CAP.size, 900, -0.02 * CAP.size)]),
      palavras: Array.from({ length: q.b - q.a }, (_, i) => ({ w: q.words[q.a + i].w, t0: q.words[q.a + i].t0, chave: !!q.words[q.a + i].chave })) })),
    tempos: () => T, ids: () => IDS,
  };
})();
