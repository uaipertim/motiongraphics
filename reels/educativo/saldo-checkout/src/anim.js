/*
 * FAZLO Hospeda — vídeo educativo "Recebeu o sinal. Quanto falta no check-out?" (1080×1920, 60 fps)
 * Conteúdo EDUCATIVO com valores ilustrativos: não mostra a interface do sistema, não imita telas e não usa nome de hóspede.
 * A linha do tempo vem de ../linha.json (provisória enquanto a locução está pendente; depois, do áudio aprovado).
 *
 * Cenas: GANCHO (quadro 0 = capa) · CONFIRA 3 COISAS · A CONTA (notinha de conferência "Exemplo fictício",
 * linha a linha na palavra falada, saldo em limão, depois a linha de descontos) · ENVIE · LOGO (últimos 3,2 s).
 * Legenda palavra por palavra no padrão do reel-09/Série Fala: Inter Display 900, 68 px, branca, chaves em limão,
 * linhas em y 1332/1412, x 130–950. Conteúdo das cenas entre y 300 e 1270; nada na coluna de botões (x ≥ 950, y 1060–1560).
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
    T = {
      ganchoFim: F.confira.t0 - 0.15,
      confiraFim: F.conta.t0 - 0.15,
      contaFim: F.cta.t0 - 0.15,
      ctaFim: LN.logo,
      F,
    };
    T.linhas = { diarias: at('diarias'), consumo: at('consumo'), pago: at('pago'), saldo: at('resultado'), desconto: at('desconto'), conferido: at('conferencia') };
  }
  // saída padrão de uma cena: sobe e some em 0,3 s
  function saida(c, t, fim, desenha) {
    const u = p(t, fim - 0.3, fim);
    if (u >= 1) return;
    c.save(); c.globalAlpha *= 1 - E.inCubic(u); c.translate(0, -40 * E.inCubic(u)); desenha(); c.restore();
  }

  // ---------------------------------------------------------------- 1. GANCHO (o quadro 0 é a capa)
  function gancho(c, t) {
    saida(c, t, T.ganchoFim, () => {
      chip(c, 'CONFERÊNCIA DE CHECK-OUT', 540, 470, { align: 'center', box: 'chip' });
      const S = 112;
      txt(c, 'Recebeu o sinal.', 540, 640, { size: S, weight: 900, align: 'center', ls: -0.03 * S, box: 'título 1' });
      const k = kick(t, at('checkout', 99), 0.3);
      c.save(); c.translate(540, 770 - 30); c.scale(1 + 0.04 * k, 1 + 0.04 * k); c.translate(-540, -(770 - 30));
      txt(c, 'Quanto falta', 540, 770, { size: S, weight: 900, align: 'center', ls: -0.03 * S, color: C.lime, box: 'título 2' });
      txt(c, 'no check-out?', 540, 880, { size: S, weight: 900, align: 'center', ls: -0.03 * S, color: C.lime, box: 'título 3' });
      c.restore();
      // o cartão: sinal recebido (com check) e o saldo ainda desconhecido (dígitos girando)
      const x0 = 150, w = 780, y0 = 980, h = 230;
      rr(c, x0, y0, w, h, 34); c.fillStyle = C.card; c.fill(); c.strokeStyle = css(C.white, 0.12); c.lineWidth = 2; c.stroke();
      BOX('cartão', x0, y0, x0 + w, y0 + h);
      txt(c, 'SINAL', x0 + 44, y0 + 70, { fam: MONO, size: 26, weight: 800, color: C.gray, ls: 3 });
      const ks = kick(t, at('sinal', 99), 0.35);
      c.save(); c.translate(x0 + 200, y0 + 61); c.scale(1 + 0.25 * ks, 1 + 0.25 * ks);
      c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.fillStyle = C.lime; c.fill(); icon(c, 'check', 0, 0, 26, C.ink, 6); c.restore();
      txt(c, 'RECEBIDO', x0 + w - 44, y0 + 70, { fam: MONO, size: 26, weight: 800, color: C.lime, ls: 3, align: 'right' });
      c.fillStyle = css(C.white, 0.1); c.fillRect(x0 + 44, y0 + 108, w - 88, 2);
      txt(c, 'FALTA', x0 + 44, y0 + 180, { fam: MONO, size: 26, weight: 800, color: C.gray, ls: 3 });
      // o saldo ainda é uma pergunta: os "?" piscam em sequência (nenhum número inventado)
      const qs = 'R$ ?.???,??';
      let xq = x0 + w - 44 - tw(qs, MONO, 58, 800, 1);
      for (let i = 0; i < qs.length; i++) {
        const ch = qs[i], wd = tw(ch, MONO, 58, 800, 1) + 1;
        const on = ch === '?' ? 0.45 + 0.55 * Math.max(0, Math.sin(t * 5 - i * 0.7)) : 1;
        txt(c, ch, xq, y0 + 186, { fam: MONO, size: 58, weight: 800, color: ch === '?' ? C.lime : C.white, alpha: t < 0.05 ? 1 : on });
        xq += wd;
      }
    });
  }

  // ---------------------------------------------------------------- 2. CONFIRA 3 COISAS
  const ITENS = [
    { id: 'estadia', n: '01', icone: 'calendario', t: 'Valor da estadia', s: 'diárias contratadas' },
    { id: 'consumos', n: '02', icone: 'xicara', t: 'Consumos', s: 'tudo o que foi lançado' },
    { id: 'pagamentos', n: '03', icone: 'moedas', t: 'Pagamentos registrados', s: 'sinal e o que já entrou' },
  ];
  function confira(c, t) {
    const t0 = T.ganchoFim - 0.05;
    if (t < t0) return;
    saida(c, t, T.confiraFim, () => {
      const e1 = ent(t, t0, 0.5);
      c.save(); c.globalAlpha *= e1; c.translate(0, 30 * (1 - e1));
      txt(c, 'Antes de fechar a conta,', 130, 560, { size: 66, weight: 800, box: 'título 1' });
      const kt = kick(t, at('tres', 99), 0.3);
      txt(c, 'confira 3 coisas:', 130, 650, { size: 66 * (1 + 0.03 * kt), weight: 900, color: C.lime, box: 'título 2' });
      c.restore();
      ITENS.forEach((it, i) => {
        const ti = at(it.id, t0 + 1 + i), e = ent(t, ti - 0.12, 0.45);
        if (e <= 0) return;
        const y = 740 + i * 172, x = 130, w = 820, h = 148, on = p(t, ti + 0.25, ti + 0.55);
        c.save(); c.globalAlpha *= e; c.translate(60 * (1 - e), 0);
        rr(c, x, y, w, h, 30); c.fillStyle = C.card; c.fill();
        c.strokeStyle = on > 0 ? css(C.lime, 0.25 + 0.5 * on) : css(C.white, 0.12); c.lineWidth = 2.5; c.stroke();
        txt(c, it.n, x + 46, y + 88, { fam: MONO, size: 30, weight: 800, color: C.lime });
        c.beginPath(); c.arc(x + 150, y + h / 2, 40, 0, TAU); c.fillStyle = css(C.lime, 0.1); c.fill();
        icon(c, it.icone, x + 150, y + h / 2, 46, C.lime, 3.5);
        txt(c, it.t, x + 214, y + 72, { size: 42, weight: 800, box: `item ${i + 1}` });
        txt(c, it.s, x + 214, y + 112, { fam: MONO, size: 22, weight: 700, color: C.gray, ls: 0.5 });
        if (on > 0) {
          const s = E.outBack(on, 2.2);
          c.save(); c.translate(x + w - 56, y + h / 2); c.scale(s, s);
          c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.fillStyle = C.lime; c.fill(); icon(c, 'check', 0, 0, 30, C.ink, 6); c.restore();
        }
        c.restore();
      });
    });
  }

  // ---------------------------------------------------------------- 3. A CONTA (a notinha de conferência)
  const NOTA = { x0: 160, x1: 920, y0: 470 };
  const LINHAS = [
    { k: 'diarias', sinal: '', rot: 'Diárias', v: 'R$ 1.350,00' },
    { k: 'consumo', sinal: '+', rot: 'Consumos', v: 'R$ 120,00' },
    { k: 'pago', sinal: '−', rot: 'Pagamentos recebidos', v: 'R$ 450,00' },
  ];
  function nota(c, t) {
    const t0 = T.confiraFim - 0.05;
    if (t < t0 || t > T.contaFim + 0.01) return;
    saida(c, t, T.contaFim, () => {
      const e = ent(t, t0, 0.55);
      const { x0, x1, y0 } = NOTA, w = x1 - x0;
      const temDesc = t >= T.linhas.desconto - 0.1;
      const ed = E.outCubic(p(t, T.linhas.desconto - 0.1, T.linhas.desconto + 0.35));
      const rowH = 92, top = y0 + 190;
      const yLinhas = (i) => top + i * rowH;
      const ySep = top + 3 * rowH + ed * rowH + 10;
      const h = ySep - y0 + 230;
      c.save(); c.globalAlpha *= e; c.translate(0, 80 * (1 - e)); c.rotate(0);
      // o papel com a borda de baixo picotada
      c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 50; c.shadowOffsetY = 24;
      c.beginPath(); c.moveTo(x0 + 18, y0); c.lineTo(x1 - 18, y0); c.quadraticCurveTo(x1, y0, x1, y0 + 18); c.lineTo(x1, y0 + h);
      const n = 19, step = w / n;
      for (let i = 0; i < n; i++) { c.lineTo(x1 - (i + 0.5) * step, y0 + h + 16); c.lineTo(x1 - (i + 1) * step, y0 + h); }
      c.lineTo(x0, y0 + 18); c.quadraticCurveTo(x0, y0, x0 + 18, y0); c.closePath();
      c.fillStyle = C.paper; c.fill(); c.restore();
      BOX('notinha', x0, y0, x1, y0 + h + 16);
      // cabeçalho
      icon(c, 'recibo', x0 + 60, y0 + 64, 44, C.ink, 3.5);
      txt(c, 'CONFERÊNCIA DO CHECK-OUT', x0 + 104, y0 + 76, { fam: MONO, size: 28, weight: 800, color: C.ink, ls: 2 });
      // "Exemplo fictício", em selo
      const sw = tw('EXEMPLO FICTÍCIO', MONO, 22, 800, 3) + 36;
      rr(c, x0 + 46, y0 + 106, sw, 44, 10); c.strokeStyle = '#C25E00'; c.lineWidth = 2.5; c.setLineDash([7, 5]); c.stroke(); c.setLineDash([]);
      txt(c, 'EXEMPLO FICTÍCIO', x0 + 64, y0 + 136, { fam: MONO, size: 22, weight: 800, color: '#C25E00', ls: 3, box: 'exemplo fictício' });
      c.fillStyle = C.paper2; c.fillRect(x0 + 40, y0 + 168, w - 80, 3);
      // as linhas, cada uma na palavra falada
      const linhas = LINHAS.map((l) => ({ ...l, t: T.linhas[l.k] }));
      linhas.forEach((l, i) => {
        const el = ent(t, l.t - 0.06, 0.35);
        if (el <= 0) return;
        const y = yLinhas(i) + 52, k = kick(t, l.t, 0.35);
        c.save(); c.globalAlpha *= el; c.translate(-24 * (1 - el), 0);
        if (k > 0.02) { c.fillStyle = css('#AFFA27', 0.35 * k); c.fillRect(x0 + 30, y - 46, w - 60, 66); }
        if (l.sinal) txt(c, l.sinal, x0 + 50, y, { fam: MONO, size: 40, weight: 800, color: C.ink });
        txt(c, l.rot, x0 + 92, y, { size: 36, weight: 700, color: C.ink, box: `linha ${l.k}` });
        txt(c, l.v, x1 - 50, y, { fam: MONO, size: 36, weight: 800, color: C.ink, align: 'right', box: `valor ${l.k}` });
        c.restore();
      });
      // a linha dos descontos (neste exemplo: nenhum)
      if (temDesc) {
        const y = top + 3 * rowH + 52;
        c.save(); c.globalAlpha *= ed; c.translate(-24 * (1 - ed), 0);
        const pulse = 0.5 + 0.5 * Math.sin((t - T.linhas.desconto) * 6);
        rr(c, x0 + 30, y - 50, w - 60, 72, 12); c.strokeStyle = css('#C25E00', 0.5 + 0.4 * pulse * (1 - p(t, T.linhas.conferido, T.linhas.conferido + 0.4)));
        c.lineWidth = 2.5; c.setLineDash([9, 6]); c.stroke(); c.setLineDash([]);
        txt(c, '−', x0 + 50, y, { fam: MONO, size: 40, weight: 800, color: C.ink });
        const dw = txt(c, 'Descontos', x0 + 92, y, { size: 36, weight: 700, color: C.ink, box: 'linha descontos' });
        txt(c, '(nenhum)', x0 + 104 + dw, y, { size: 30, weight: 600, color: C.inkSoft });
        txt(c, 'R$ 0,00', x1 - 50, y, { fam: MONO, size: 36, weight: 800, color: C.ink, align: 'right', box: 'valor descontos' });
        c.restore();
      }
      // o traço e o saldo
      const es = ent(t, T.linhas.saldo - 0.25, 0.4);
      if (t >= at('saldo', T.linhas.saldo) - 0.3) {
        const ul = E.inOutCubic(p(t, at('saldo', T.linhas.saldo) - 0.3, at('saldo', T.linhas.saldo) + 0.1));
        c.strokeStyle = C.ink; c.lineWidth = 3; c.setLineDash([10, 8]);
        c.beginPath(); c.moveTo(x0 + 40, ySep); c.lineTo(x0 + 40 + (w - 80) * ul, ySep); c.stroke(); c.setLineDash([]);
      }
      if (es > 0) {
        const y = ySep + 40, k = kick(t, T.linhas.saldo, 0.4);
        c.save(); c.globalAlpha *= es;
        rr(c, x0 + 26, y, w - 52, 150, 22); c.fillStyle = C.ink; c.fill();
        txt(c, 'SALDO A RECEBER', x0 + 62, y + 50, { fam: MONO, size: 24, weight: 800, color: C.lime, ls: 3 });
        txt(c, '1.350 + 120 − 450', x0 + 62, y + 118, { fam: MONO, size: 22, weight: 700, color: C.gray, ls: 0.5 });
        c.save(); c.translate(x1 - 60, y + 122); c.scale(1 + 0.08 * k, 1 + 0.08 * k);
        txt(c, 'R$ 1.020,00', 0, 0, { fam: MONO, size: 56, weight: 800, color: C.lime, align: 'right', glow: css(C.lime, 0.5), blur: 18 });
        c.restore();
        BOX('saldo', x0 + 26, y, x1 - 26, y + 150);
        c.restore();
      }
      // carimbo "CONFERIDO" na palavra "conferência"
      const ec = p(t, T.linhas.conferido, T.linhas.conferido + 0.3);
      if (ec > 0) {
        const s = lerp(1.8, 1, E.outCubic(ec));
        c.save(); c.translate(x1 - 150, y0 + 132); c.rotate(-0.16); c.scale(s, s); c.globalAlpha *= clamp(ec * 1.6);
        rr(c, -118, -36, 236, 72, 14); c.strokeStyle = '#2F7A16'; c.lineWidth = 5; c.stroke();
        txt(c, 'CONFERIDO', 0, 12, { fam: MONO, size: 32, weight: 800, color: '#2F7A16', align: 'center', ls: 3 });
        c.restore();
      }
      c.restore();
    });
  }

  // ---------------------------------------------------------------- 4. ENVIE
  function envie(c, t) {
    const t0 = T.contaFim - 0.05;
    if (t < t0 || t > T.ctaFim) return;
    saida(c, t, T.ctaFim, () => {
      const e = ent(t, t0, 0.5);
      // o avião sai do canto e voa em arco
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
      txt(c, 'para quem fecha', 130, 960, { size: 80, weight: 900, ls: -2, box: 'linha 2' });
      txt(c, 'essas contas', 130, 1048, { size: 80, weight: 900, ls: -2, box: 'linha 3' });
      txt(c, 'com você.', 130, 1136, { size: 80, weight: 900, ls: -2, box: 'linha 4' });
      c.restore();
      chip(c, 'EXEMPLO FICTÍCIO · SEM DESCONTOS', 130, 1218, { size: 20, ls: 2, h: 46, color: C.amber, stroke: css(C.amber, 0.7), bg: css(C.amber, 0.1), alpha: e });
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
    LN.frases.forEach((f) => {
      const ws = f.palavras, pages = [];
      let i = 0;
      while (i < ws.length) {
        let j = i, lines = 1, a = i;
        while (j < ws.length) {
          if (wid(ws, a, j + 1) > CAP.maxW) { if (a === j) { j++; continue; } lines++; a = j; if (lines > 2) break; }
          else { j++; if (/[.?!]$/.test(ws[j - 1].w) && j < ws.length && ws[j - 1].t1 - ws[i].t0 >= CAP.minPag + 0.2) break; }
        }
        pages.push([i, j]); i = j;
      }
      const cabe = (a, b) => { let ln = 1, x0 = a; for (let k = a + 1; k <= b; k++) if (wid(ws, x0, k) > CAP.maxW) { if (k - 1 === x0) continue; ln++; x0 = k - 1; } return ln <= 2; };
      const dura = (k) => (pages[k + 1] ? ws[pages[k + 1][0]].t0 : ws[pages[k][1] - 1].t1 + CAP.segura) - ws[pages[k][0]].t0;
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
      confira(c, t); nota(c, t); envie(c, t);
      marca(c);
      legenda(c, t);
    } else fimLogo(c, t);
    c.restore();
    avisoPrevia(c);
  }
  function renderAt(c, t) { frame(c, clamp(t, 0, DUR - 1e-4)); }
  function init(img, linha, o = {}) {
    LOGO = img; LN = linha; DUR = linha.duracao; PREVIA = !!o.previa;
    M = document.createElement('canvas').getContext('2d');
    tempos(); layoutLegenda();
  }
  function caixas(c, t) { BOXES = []; frame(c, t); const out = BOXES; BOXES = null; return out; }
  window.SALDO = {
    init, renderAt, caixas, get DURATION() { return DUR; }, CAP,
    legenda: () => PAGES.map((q) => ({ t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.w).join(' ')) })),
    tempos: () => T,
  };
})();
