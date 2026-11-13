/*
 * FAZLO Hospeda — educativo "Vai fechar o caixa? Faça esta conta antes." (1080×1920, 60 fps)
 * Conteúdo EDUCATIVO: não mostra a interface do sistema nem nome de hóspede; os valores são ilustrativos, com
 * "Exemplo fictício" sempre visível quando há dado na tela. A linha do tempo vem de ../linha.json (scripts/linha.py,
 * a partir da locução com a marcação de tempo do ElevenLabs).
 *
 * Cenas: GANCHO (quadro 0 = capa: título + gaveta do caixa em traço limão) · "FAÇA ESTA CONTA" (o título encolhe e
 * sobe; a ficha "Conferência do caixa" entra) · A CONTA (cada linha acende na própria frase, o valor é escrito e o
 * check entra na palavra-chave; 200 + 125 − 40 = 285) · PIX E CARTÃO (tentam entrar, são riscados e empurrados para
 * fora; a gaveta pisca só com dinheiro) · CONTADO / DIFERENÇA / MOTIVO / "CONFERIDO" · MANDE · LOGO (últimos 3,2 s).
 * Mesmo motor e DNA do educativo reserva-whatsapp (fundo, marca, chip, ícones, ficha de papel com borda serrilhada,
 * carimbo, avião, logo e a legenda palavra por palavra: Inter Display 900, 68 px, chaves em limão, linhas em
 * y 1332/1412, x 130–950, cada página ≥ 1,5 s; a divisão das páginas vem do roteiro).
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
    T = { F, ganchoFim: IDS.conta, fichaFim: F.cta.t0 + 0.14, ctaFim: LN.logo,
      pixIn: F.pix.t0 - 0.05, pixFora: IDS.fora, gavetaIn: F.pix.palavras.find((w) => w.w === 'eles').t0 - 0.08, gavetaFim: F.contado.t0 - 0.12 };
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

  // ---------------------------------------------------------------- a gaveta do caixa (traço limão, estilizada)
  // cx, top: centro e topo do móvel; abre: 0 (fechada) … 1 (aberta); vazio: 0…1 (o "flash" de "não estão na gaveta")
  function gaveta(c, cx, top, s, abre, o = {}) {
    const col = o.cor || C.lime, lw = (o.lw || 5) / s;
    c.save(); c.translate(cx, top); c.scale(s, s);
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    // o móvel (a boca do caixa)
    rr(c, -270, 0, 540, 70, 18); c.fillStyle = css(C.card2, 0.92); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-230, 46); c.lineTo(230, 46); c.globalAlpha *= 0.5; c.stroke(); c.globalAlpha /= 0.5;
    // a bandeja que sai em perspectiva: fundo (dentro do móvel) mais estreito, frente mais larga
    const d = lerp(26, 150, abre), yb = 58, yf = yb + d, wb = 226, wf = 262;
    c.beginPath(); c.moveTo(-wb, yb); c.lineTo(wb, yb); c.lineTo(wf, yf); c.lineTo(-wf, yf); c.closePath();
    c.fillStyle = css(C.bg, 0.96); c.fill(); c.stroke();
    // divisórias: 4 casas de cédulas e uma fileira de moedas
    const xs = (k, v) => lerp(-wb, wb, k / 4) * (1 - v) + lerp(-wf, wf, k / 4) * v;
    c.save(); c.globalAlpha *= 0.85;
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(xs(k, 0), yb); c.lineTo(xs(k, 0.62), yb + d * 0.62); c.stroke(); }
    c.beginPath(); c.moveTo(xs(0, 0.62), yb + d * 0.62); c.lineTo(xs(4, 0.62), yb + d * 0.62); c.stroke();
    c.restore();
    // cédulas e moedas (só desenhos: sem valores)
    if (abre > 0.25) {
      const a = clamp((abre - 0.25) / 0.5);
      c.save(); c.globalAlpha *= a;
      for (let k = 0; k < 4; k++) {
        if (k === 3) continue;
        const x0 = xs(k, 0.3) + 12, x1 = xs(k + 1, 0.3) - 12, y = yb + d * 0.12;
        for (let j = 0; j < 2; j++) { rr(c, x0 + j * 5, y + j * 8, x1 - x0 - j * 10, d * 0.38, 6); c.fillStyle = css(col, 0.16 + 0.1 * j); c.fill(); c.stroke(); }
      }
      for (let k = 0; k < 5; k++) { const x = lerp(xs(0, 0.82), xs(4, 0.82), (k + 0.5) / 5), y = yb + d * 0.82; c.beginPath(); c.ellipse(x, y, 20, Math.max(4, d * 0.06), 0, 0, TAU); c.fillStyle = css(col, 0.2); c.fill(); c.stroke(); }
      c.restore();
    }
    // a frente da gaveta, com o puxador
    rr(c, -wf - 8, yf, 2 * wf + 16, 92, 16); c.fillStyle = css(C.card2, 0.98); c.fill(); c.stroke();
    rr(c, -70, yf + 38, 140, 18, 9); c.stroke();
    c.beginPath(); c.arc(wf - 36, yf + 46, 9, 0, TAU); c.stroke();
    c.restore();
    return { x0: cx - 270 * s, y0: top, x1: cx + 270 * s, y1: top + (yf + 92) * s + lw * s / 2 };
  }

  // ---------------------------------------------------------------- 1. GANCHO (o quadro 0 é a capa)
  const GAV = { cx: 540, top: 990, s: 0.92 };
  function ganchoBloco(c, t) {
    chip(c, 'ANTES DE FECHAR', 540, 466, { align: 'center', box: 'chip' });
    const S = 100, k = kick(t, at('caixa', 99), 0.3);
    const L = (s, y, cor, nome) => txt(c, s, 540, y, { size: S, weight: 900, align: 'center', ls: -0.03 * S, color: cor, box: nome });
    L('Vai fechar', 600, C.white, 'título 1');
    c.save(); c.translate(540, 674); c.scale(1 + 0.05 * k, 1 + 0.05 * k); c.translate(-540, -674);
    L('o caixa?', 702, C.white, 'título 2'); c.restore();
    L('Faça esta', 812, C.lime, 'título 3');
    L('conta antes.', 914, C.lime, 'título 4');
    // a gaveta: entreaberta na capa; abre com um tranco em "caixa" e segue respirando
    const tc = at('caixa', 99), abre = clamp(0.42 + 0.58 * E.outBack(p(t, tc, tc + 0.45), 2.4) + (t > tc ? 0.04 * Math.sin((t - tc) * 4) : 0), 0, 1.08);
    const b = gaveta(c, GAV.cx, GAV.top + 2 * Math.sin(t * 2.2), GAV.s, abre);
    BOX('gaveta', b.x0, b.y0, b.x1, b.y1);
  }
  function gancho(c, t) {
    const t0 = T.ganchoFim - 0.04, u = E.inOutCubic(p(t, t0, t0 + 0.3));
    if (u >= 1) return;
    // em "faça": o título encolhe e sobe; a gaveta desce e sai
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
      const w1 = tw('Vai fechar o caixa? ', DISPLAY, 42, 900, -1.1), w2 = tw('Faça esta conta antes.', DISPLAY, 42, 900, -1.1), x = 540 - (w1 + w2) / 2;
      txt(c, 'Vai fechar o caixa? ', x, 440, { size: 42, weight: 900, ls: -1.1, box: 'título pequeno 1' });
      txt(c, 'Faça esta conta antes.', x + w1, 440, { size: 42, weight: 900, ls: -1.1, color: C.lime, box: 'título pequeno 2' });
      c.restore();
    });
  }

  // ---------------------------------------------------------------- 2–5. A CONFERÊNCIA DO CAIXA (papel)
  const FICHA = { x0: 130, x1: 930, y0: 486, cab: 116, row: 84, mot: 80 };
  const fmt = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');
  function linhaFicha(c, t, it, i, y) {
    const { x0, x1 } = FICHA, row = FICHA.row, w = x1 - x0;
    const fr = it.id === 'conte' ? T.F.contado : it.id === 'diferenca' ? { t0: at('diferenca'), t1: at('anote') } : T.F[it.id === 'troco' ? 'troco' : it.id === 'dinheiro' ? 'entrou' : it.id];
    const tc = at(it.id, fr.t0), ativo = t >= fr.t0 - 0.1, k = kick(t, tc, 0.4);
    const amb = it.ambar && t >= tc, tot = it.total && t >= tc;
    // o fundo da linha: acende na frase; total em limão; diferença em âmbar com pulso
    if (amb) { const pu = 0.5 + 0.5 * Math.sin((t - tc) * 7); c.fillStyle = css(C.amber, 0.30 + 0.2 * k + 0.08 * pu * (t < at('lembra', 99) ? 1 : 0)); rr(c, x0 + 18, y + 6, w - 36, row - 12, 14); c.fill(); }
    else if (tot) { c.fillStyle = css(C.lime, 0.9); rr(c, x0 + 18, y + 6, w - 36, row - 12, 14); c.fill(); }
    else if (ativo && t < fr.t1 + 0.35) { c.fillStyle = css(C.lime, 0.24 + 0.25 * k); rr(c, x0 + 18, y + 6, w - 36, row - 12, 14); c.fill(); }
    const cor = ativo ? C.ink : css(C.ink, 0.38), yb = y + row / 2 + 12;
    if (it.sinal) txt(c, it.sinal, x0 + 48, yb, { fam: MONO, size: 34, weight: 800, color: cor, align: 'center' });
    txt(c, it.rotulo, x0 + 82, yb, { size: 34, weight: 800, color: cor, box: `rótulo ${it.id}` });
    // o valor: escrito (ou contado) até a palavra-chave
    if (ativo) {
      let s = '';
      if (it.id === 'deveria' || it.id === 'conte') {
        const alvo = it.id === 'deveria' ? LN.exemplo.conta.deveria : LN.exemplo.conta.contado, a = it.id === 'deveria' ? fr.t0 + 0.1 : tc, b = it.id === 'deveria' ? tc : tc + 0.55;
        const u = E.outCubic(p(t, a, b)); s = u > 0 ? fmt(Math.round(alvo * u)) : '';
      } else if (it.id === 'diferenca') s = t >= tc ? it.valor : '';
      else { const u = p(t, fr.t0 + 0.05, tc); s = it.valor.slice(0, Math.ceil(it.valor.length * u)); }
      if (s) txt(c, s, x1 - 84, yb, { fam: MONO, size: 32, weight: 800, color: amb ? '#7A3D00' : C.ink, align: 'right', box: `valor ${it.id}` });
    }
    // o check (ou o alerta, na diferença) entra na palavra-chave
    const tk = it.id === 'conte' ? tc + 0.55 : tc, ck = p(t, tk, tk + 0.3);
    c.save(); c.translate(x1 - 48, y + row / 2);
    c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.strokeStyle = css(C.ink, 0.3); c.lineWidth = 3; c.setLineDash([5, 5]); c.stroke(); c.setLineDash([]);
    if (ck > 0) {
      const s = E.outBack(ck, 2.2); c.scale(s, s); c.beginPath(); c.arc(0, 0, 22, 0, TAU);
      if (it.ambar) { c.fillStyle = '#C25E00'; c.fill(); txt(c, '!', 0, 11, { size: 32, weight: 900, color: C.paper, align: 'center' }); }
      else { c.fillStyle = C.ink; c.fill(); icon(c, 'check', 0, 0, 28, C.lime, 6); }
    }
    c.restore();
    BOX(`check ${it.id}`, x1 - 70, y + row / 2 - 22, x1 - 26, y + row / 2 + 22);
  }
  function ficha(c, t) {
    const t0 = T.ganchoFim + 0.16;
    if (t < t0 || t > T.fichaFim) return;
    saidaLado(c, t, T.fichaFim, () => {
      const e = ent(t, t0, 0.5), { x0, x1, y0, cab, row, mot } = FICHA, w = x1 - x0, itens = LN.exemplo.ficha;
      const h = cab + itens.length * row + 16 + mot;
      c.save(); c.globalAlpha *= e; c.translate(0, 110 * (1 - e));
      c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 50; c.shadowOffsetY = 24;
      c.beginPath(); c.moveTo(x0 + 18, y0); c.lineTo(x1 - 18, y0); c.quadraticCurveTo(x1, y0, x1, y0 + 18); c.lineTo(x1, y0 + h);
      const n = 20, step = w / n;
      for (let i = 0; i < n; i++) { c.lineTo(x1 - (i + 0.5) * step, y0 + h + 14); c.lineTo(x1 - (i + 1) * step, y0 + h); }
      c.lineTo(x0, y0 + 18); c.quadraticCurveTo(x0, y0, x0 + 18, y0); c.closePath();
      c.fillStyle = C.paper; c.fill(); c.restore();
      BOX('ficha', x0, y0, x1, y0 + h + 14);
      icon(c, 'recibo', x0 + 52, y0 + 50, 40, C.ink, 3.5);
      txt(c, 'CONFERÊNCIA DO CAIXA', x0 + 92, y0 + 60, { fam: MONO, size: 27, weight: 800, color: C.ink, ls: 2, box: 'ficha título' });
      selo(c, x0 + 92, y0 + 92, { size: 18 });
      c.fillStyle = C.paper2; c.fillRect(x0 + 30, y0 + cab - 2, w - 60, 3);
      itens.forEach((it, i) => {
        const y = y0 + cab + i * row + (i >= 3 ? 8 : 0) + (i >= 4 ? 8 : 0);
        if (it.total) {   // a linha da soma, traçada no início da frase
          const u = E.outCubic(p(t, T.F.deveria.t0, T.F.deveria.t0 + 0.4));
          c.fillStyle = C.ink; if (u > 0) c.fillRect(x0 + 30, y - 2, (w - 60) * u, 4);
          if (u <= 0) { c.fillStyle = css(C.ink, 0.15); c.fillRect(x0 + 30, y - 1, w - 60, 2); }
        } else if (i > 0 && i !== 4) { c.fillStyle = css(C.ink, 0.1); c.fillRect(x0 + 30, y - 1, w - 60, 2); }
        if (i === 4) { c.fillStyle = css(C.ink, 0.1); c.fillRect(x0 + 30, y - 5, w - 60, 2); }
        linhaFicha(c, t, it, i, y);
      });
      // o motivo, escrito à mão em "anote o motivo"
      const ym = y0 + cab + itens.length * row + 16, ta = at('anote', 99), uw = p(t, ta, ta + 1.25);
      c.fillStyle = css(C.ink, 0.1); c.fillRect(x0 + 30, ym, w - 60, 2);
      if (uw > 0) {
        const s = LN.exemplo.motivo, size = 36, ww = tw(s, DISPLAY, size, 600, 0), x = x0 + 48, yb = ym + 54;
        c.save(); c.beginPath(); c.rect(x - 10, ym + 4, (ww + 30) * uw + 10, mot); c.clip();
        c.save(); c.translate(x, yb); c.transform(1, 0, -0.22, 1, 0, 0); c.rotate(-0.012);
        txt(c, s, 0, 0, { size, weight: 600, color: '#24408E' }); c.restore();
        c.restore();
        BOX('motivo', x - 4, yb - 0.74 * size - 6, x + ww * uw + 12, yb + 0.22 * size + 6);
        if (uw < 1) {     // a ponta da caneta
          const px = x + ww * uw + 10, py = yb - 10 + 4 * Math.sin(t * 40);
          c.save(); c.translate(px, py); c.rotate(-0.6); rr(c, -6, -70, 12, 64, 5); c.fillStyle = C.ink; c.fill(); c.beginPath(); c.moveTo(-6, -6); c.lineTo(6, -6); c.lineTo(0, 8); c.closePath(); c.fill(); c.restore();
        }
      }
      // "CONFERIDO", carimbado em "lembra"
      const tl = at('lembra', 99), ec = p(t, tl, tl + 0.28);
      if (ec > 0) {
        const s = lerp(1.9, 1, E.outCubic(ec)), sh = (1 - clamp(ec * 1.3)) * 0;
        const tr = kick(t, tl + 0.2, 0.2) * 6;
        c.save(); c.translate(x1 - 170 + tr * Math.sin(t * 90), y0 + 58); c.rotate(-0.12); c.scale(s, s); c.globalAlpha *= clamp(ec * 1.6);
        rr(c, -128, -36, 256, 72, 14); c.fillStyle = css(C.paper, 0.85); c.fill(); c.strokeStyle = '#2F7A16'; c.lineWidth = 5; c.stroke();
        txt(c, 'CONFERIDO', 0, 12, { fam: MONO, size: 32, weight: 800, color: '#2F7A16', align: 'center', ls: 3 });
        c.restore();
        if (ec >= 1) BOX('carimbo', x1 - 170 - 135, y0 + 58 - 52, x1 - 170 + 135, y0 + 58 + 52);
      }
      c.restore();
    });
  }

  // ---------------------------------------------------------------- 4. PIX E CARTÃO: tentam entrar, saem da conta
  function foraDaConta(c, t) {
    const t0 = T.pixIn, tf = T.pixFora;
    if (t < t0 || t > tf + 1.2) return;
    LN.exemplo.fora.forEach((sl, i) => {
      const ti = t0 + i * 0.16, e = E.outBack(p(t, ti, ti + 0.5), 1.6);
      // pousam por cima da conta (na linha da soma) …
      const xf = i ? 480 : 170, yf = i ? 880 : 780, rot = i ? 0.05 : -0.06;
      // … e em "fora dessa conta" são riscados e empurrados para fora
      const ri = p(t, tf, tf + 0.25), em = E.inCubic(p(t, tf + 0.32 + i * 0.08, tf + 0.85 + i * 0.08));
      const x = lerp(1120, xf, e) + em * (i ? 700 : -900), y = yf - 30 * Math.sin(Math.PI * clamp(e)) * (1 - e) + em * 60;
      const size = 34, wtxt = tw(sl.txt, MONO, size, 800, 1), wb = wtxt + 52, hb = 74;
      if (e <= 0) return;
      c.save(); c.translate(x + wb / 2, y); c.rotate(rot + em * (i ? 0.5 : -0.5)); c.translate(-wb / 2, 0);
      c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
      rr(c, 0, -hb / 2, wb, hb, 18); c.fillStyle = C.card2; c.fill(); c.restore();
      rr(c, 0, -hb / 2, wb, hb, 18); c.strokeStyle = css(C.white, 0.7); c.lineWidth = 3; c.stroke();
      txt(c, sl.txt, 26, size * 0.36, { fam: MONO, size, weight: 800, color: C.white, ls: 1 });
      if (ri > 0) { c.strokeStyle = C.red; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(12, 6); c.lineTo(12 + (wb - 24) * E.outCubic(ri), -6); c.stroke(); }
      c.restore();
      if (em <= 0 && e >= 1) BOX(`selo ${sl.id}`, x, y - hb / 2 - 4, x + wb, y + hb / 2 + 4);
    });
    // a etiqueta "fora da conta", em vermelho, no risco
    const ef = p(t, tf, tf + 0.3), sai = p(t, tf + 0.9, tf + 1.15);
    if (ef > 0 && sai < 1) chip(c, 'FORA DA CONTA', 540, 960, { align: 'center', color: C.red, stroke: css(C.red, 0.8), bg: 'rgba(30,10,10,0.92)', alpha: clamp(ef * 2) * (1 - sai), box: 'fora da conta' });
  }
  // "eles não estão na gaveta": a gaveta aparece sobre a ficha e pisca, só com dinheiro
  function gavetaPix(c, t) {
    const t0 = T.gavetaIn, t1 = T.gavetaFim;
    if (t < t0 || t > t1) return;
    const e = E.outBack(p(t, t0, t0 + 0.22), 1.5), sai = E.inCubic(p(t, t1 - 0.3, t1));
    const tn = at('naoestao', 99), pisca = t >= tn && t < tn + 0.72 ? (Math.floor((t - tn) / 0.12) % 2 === 0 ? 0.3 : 1) : 1;
    const cy = 760 + 60 * (1 - e) + 40 * sai;
    c.save(); c.globalAlpha *= clamp(e) * (1 - sai);
    // um cartão escuro por trás, para a gaveta ler sobre o papel
    rr(c, 160, cy - 40, 740, 440, 30); c.fillStyle = css(C.bg, 0.94); c.fill(); c.strokeStyle = css(C.lime, 0.5); c.lineWidth = 2.5; c.stroke();
    BOX('cartão gaveta', 160, cy - 40, 900, cy + 400);
    c.save(); c.globalAlpha *= pisca;
    const b = gaveta(c, 540, cy + 10, 0.86, 1, { cor: C.lime });
    c.restore();
    // os fantasmas de PIX e CARTÃO somem da gaveta no piscar ("vazia deles")
    const g = 1 - p(t, tn, tn + 0.6);
    if (g > 0) ['PIX', 'CARTÃO'].forEach((s, i) => txt(c, s, i ? 680 : 400, cy + 128 - 24 * (1 - g), { fam: MONO, size: 30, weight: 800, color: C.white, align: 'center', ls: 2, alpha: 0.75 * g }));
    const ok = p(t, tn + 0.15, tn + 0.45);
    if (ok > 0) txt(c, 'NA GAVETA: SÓ DINHEIRO', 540, cy + 362, { fam: MONO, size: 30, weight: 800, color: C.lime, align: 'center', ls: 2, alpha: ok, box: 'só dinheiro' });
    c.restore();
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
      txt(c, 'para quem fecha', 130, 960, { size: 80, weight: 900, ls: -2, box: 'linha 2' });
      txt(c, 'o caixa da', 130, 1048, { size: 80, weight: 900, ls: -2, box: 'linha 3' });
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
    const fs = LN.frases.find((f) => sem.includes(f.id)), lim = fs ? fs.palavras[0].t0 : LN.logo - 0.05;
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
    c.beginPath(); c.rect(0, 0, W, H); c.rect(941, 1001, W - 941, 600); c.clip('evenodd');      // a coluna de botões (x > 940, y > 1000) fica vazia
    if (t < LN.logo) {
      gancho(c, t); tituloPequeno(c, t);
      ficha(c, t); foraDaConta(c, t); gavetaPix(c, t); mande(c, t);
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
