/*
 * FAZLO Hospeda — educativo "Reserva confirmada? Mande esta mensagem." (1080×1920, 60 fps)
 * Conteúdo EDUCATIVO: não mostra a interface do sistema e não imita o app de conversa: o balão é genérico, no DNA da
 * marca (cartão escuro com borda limão, "MENSAGEM ENVIADA", como o "MENSAGEM RECEBIDA" do reserva-whatsapp). A hóspede
 * é a mesma do reserva-whatsapp e do check-in (Ana Lima); os dados são fictícios, com "Exemplo fictício" sempre visível
 * quando há dado na tela, e o endereço é claramente fictício ("Estrada do Exemplo, km 4").
 * A linha do tempo vem de ../linha.json (scripts/linha.py, a partir da locução com a marcação de tempo do ElevenLabs).
 *
 * Cenas: GANCHO (quadro 0 = capa: título + o balão vazio com o cursor piscando) · "CINCO INFORMAÇÕES" (o título encolhe
 * e sobe; o balão cresce com as casas 01–05) · AS CINCO LINHAS (cada uma acende na própria frase, é digitada e recebe o
 * check na palavra-chave; o pino de mapa pulsa em "localização") · "ENVIADA" carimbado em "sabendo tudo"; em "dúvida",
 * dois checks de entregue e o avião saindo do balão · MANDE (sem legenda) · LOGO (últimos 3,2 s).
 * Mesmo motor e DNA do check-in, do conta-do-caixa e do reserva-whatsapp (legenda palavra por palavra: Inter Display
 * 900, 68 px, chaves em limão, linhas em y 1332/1412, x 130–936, cada página ≥ 1,5 s; a divisão vem do roteiro).
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
    T = { F, ganchoFim: IDS.cinco, fichaFim: F.cta.t0 + 0.14, ctaFim: LN.logo };
  }
  function saida(c, t, fim, desenha) {
    const u = p(t, fim - 0.3, fim);
    if (u >= 1) return;
    c.save(); c.globalAlpha *= 1 - E.inCubic(u); c.translate(0, -40 * E.inCubic(u)); desenha(); c.restore();
  }
  function saidaLado(c, t, fim, desenha) {                   // deslize rápido para a esquerda
    const u = E.inCubic(p(t, fim - 0.3, fim));
    if (u >= 1) return;
    const bx = BOXES; if (u > 0) BOXES = null;                 // em transição: as caixas paradas não valem
    c.save(); c.translate(-1150 * u, 0); desenha(); c.restore(); BOXES = bx;
  }
  function selo(c, x, y, o = {}) {                              // "EXEMPLO FICTÍCIO" (sempre que há dado na tela)
    const s = 'EXEMPLO FICTÍCIO', size = o.size || 22, w = tw(s, MONO, size, 800, 3) + 36, h = size * 2;
    rr(c, x, y - h / 2, w, h, 10);
    if (o.bg) { c.fillStyle = o.bg; c.fill(); }
    c.strokeStyle = o.cor || '#C25E00'; c.lineWidth = 2.5; c.setLineDash([7, 5]); c.stroke(); c.setLineDash([]);
    txt(c, s, x + 18, y + size * 0.36, { fam: MONO, size, weight: 800, color: o.cor || '#C25E00', ls: 3, box: 'exemplo fictício' });
    return w;
  }
  // o pino de mapa, no traço da marca
  function pino(c, x, y, s, col, lw = 5) {
    c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.lineWidth = lw / s; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0, 26); c.bezierCurveTo(-8, 14, -22, 2, -22, -10); c.arc(0, -10, 22, Math.PI, 0); c.bezierCurveTo(22, 2, 8, 14, 0, 26); c.closePath(); c.stroke();
    c.beginPath(); c.arc(0, -10, 8, 0, TAU); c.stroke();
    c.restore();
  }

  // ---------------------------------------------------------------- o balão "MENSAGEM ENVIADA" (genérico, no DNA da marca)
  // pequeno e vazio no gancho (com o cursor); cresce em "cinco" e recebe as cinco linhas
  const BAL = { x0: 130, x1: 930, y0a: 1040, ha: 132, y0b: 548, hb: 600, pad: 28, rows: [92, 92, 124, 124, 92] };
  const rowY = (i) => BAL.y0b + BAL.pad + BAL.rows.slice(0, i).reduce((a, b) => a + b, 0);
  function geoBalao(t) {
    const u = E.inOutCubic(p(t, T.ganchoFim - 0.04, T.ganchoFim + 0.36));
    return { u, y0: lerp(BAL.y0a, BAL.y0b, u), h: lerp(BAL.ha, BAL.hb, u) };
  }
  function cascaBalao(c, y0, h) {
    const { x0, x1 } = BAL, w = x1 - x0;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
    c.beginPath(); c.roundRect(x0, y0, w, h, [36, 36, 8, 36]);
    c.moveTo(x1 - 70, y0 + h - 2); c.quadraticCurveTo(x1 - 34, y0 + h + 4, x1 - 14, y0 + h + 22); c.quadraticCurveTo(x1 - 10, y0 + h + 4, x1 - 2, y0 + h - 30);
    c.fillStyle = C.card2; c.fill(); c.restore();
    c.beginPath(); c.roundRect(x0, y0, w, h, [36, 36, 8, 36]); c.strokeStyle = css(C.lime, 0.6); c.lineWidth = 2.5; c.stroke();
  }
  function cursor(c, t, x, y, size) { if (Math.floor(t / 0.45) % 2 === 0) { c.fillStyle = C.lime; c.fillRect(x, y - size * 0.8, 4, size * 0.95); } }
  function balao(c, t) {
    if (t > T.fichaFim) return;
    const g = geoBalao(t), { x0, x1 } = BAL, y1 = g.y0 + g.h;
    // rótulo do balão (e o selo, quando há dado na tela)
    txt(c, 'MENSAGEM ENVIADA', x0 + 8, g.y0 - 22, { fam: MONO, size: 22, weight: 800, color: C.gray, ls: 3, box: 'rótulo balão' });
    if (g.u > 0.5) { c.save(); c.globalAlpha *= clamp((g.u - 0.5) * 2); selo(c, x0 + 296, g.y0 - 30, { size: 17, cor: C.amber, bg: css(C.amber, 0.1) }); c.restore(); }
    cascaBalao(c, g.y0, g.h);
    BOX('balão', x0, g.y0, x1, y1 + 22);
    if (g.u < 1) { c.save(); c.globalAlpha *= 1 - g.u; cursor(c, t, x0 + 48, g.y0 + g.h / 2 + 14, 40); c.restore(); }
    if (g.u <= 0.6) return;                                     // as linhas só aparecem quando o balão já cresceu
    c.save(); c.globalAlpha *= clamp((g.u - 0.6) / 0.4);
    let cur = null;
    LN.exemplo.mensagem.forEach((it, i) => {
      const y = rowY(i), rh = BAL.rows[i], fr = T.F[it.frase], tc = at(it.id, fr.t0);
      const ativo = t >= fr.t0 - 0.1, k = kick(t, fr.t0 - 0.05, 0.4);
      if (ativo && t < fr.t1 + 0.35) { c.fillStyle = css(C.lime, 0.12 + 0.12 * k); rr(c, x0 + 16, y + 4, x1 - x0 - 32, rh - 8, 16); c.fill(); }
      if (i > 0) { c.fillStyle = css(C.white, 0.08); c.fillRect(x0 + 30, y - 1, x1 - x0 - 60, 2); }
      // as casas 01–05 aparecem em "cinco"
      const tq = at('cinco', 0) + i * 0.09, uq = p(t, tq, tq + 0.3);
      if (uq > 0) {
        const s = E.outBack(uq, 2.4);
        c.save(); c.translate(x0 + 54, y + 38); c.scale(s, s);
        txt(c, String(i + 1).padStart(2, '0'), 0, 0, { fam: MONO, size: 26, weight: 800, color: ativo ? C.lime : C.grayD, align: 'center' });
        c.restore();
        if (uq >= 1) BOX(`casa ${i + 1}`, x0 + 34, y + 16, x0 + 74, y + 46);
      }
      txt(c, it.rotulo, x0 + 96, y + 40, { size: 30, weight: 800, color: ativo ? C.white : css(C.white, 0.32), box: `rótulo ${it.id}` });
      // as linhas são digitadas ao longo da frase, até a palavra-chave
      if (ativo) {
        const total = it.linhas.join('').length, u = p(t, fr.t0 + 0.05, tc); let n = Math.ceil(total * u), yl = y + 74;
        it.linhas.forEach((ln, j) => {
          const s = ln.slice(0, Math.max(0, n)); n -= ln.length;
          if (s) { const w = txt(c, s, x0 + 96, yl, { fam: MONO, size: 24, weight: 700, color: '#E8F5D0', box: `valor ${it.id} ${j + 1}` }); if (u < 1 && s.length < ln.length) cur = [x0 + 100 + w, yl]; else if (u < 1 && j === it.linhas.length - 1) cur = [x0 + 100 + w, yl]; }
          yl += 32;
        });
        // o pino de mapa pulsa em "localização"
        if (it.pino && u > 0) {
          const kp = kick(t, tc, 0.5), pu = t >= tc ? 1 + 0.08 * Math.sin((t - tc) * 6) : 1;
          const px = x0 + 96 + tw(it.linhas[0], MONO, 24, 700) + 46, py = y + 64;
          if (t >= tc) { const r = p(t, tc, tc + 0.6); if (r < 1) { c.beginPath(); c.arc(px, py + 10, lerp(10, 46, E.outExpo(r)), 0, TAU); c.strokeStyle = css(C.lime, 0.9 * (1 - r)); c.lineWidth = 4; c.stroke(); } }
          pino(c, px, py - 4, (1 + 0.25 * kp) * pu, C.lime, 4.5);
          BOX('pino', px - 24, py - 40, px + 24, py + 24);
        }
      }
      // o check entra na palavra-chave
      const ck = p(t, tc, tc + 0.3), cy = y + rh / 2;
      c.save(); c.translate(x1 - 52, cy);
      c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.strokeStyle = css(C.white, 0.25); c.lineWidth = 3; c.setLineDash([5, 5]); c.stroke(); c.setLineDash([]);
      if (ck > 0) { const s = E.outBack(ck, 2.2); c.scale(s, s); c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.fillStyle = C.lime; c.fill(); icon(c, 'check', 0, 0, 28, C.ink, 6); }
      c.restore();
      BOX(`check ${it.id}`, x1 - 74, cy - 22, x1 - 30, cy + 22);
    });
    if (cur) cursor(c, t, cur[0], cur[1], 24);
    // "dúvida": dois checks de entregue no canto do balão
    const td = at('duvida', 99), ed = p(t, td, td + 0.25);
    if (ed > 0) {
      c.save(); c.translate(x1 - 66, y1 - 26); c.scale(E.outBack(ed, 2.2), E.outBack(ed, 2.2));
      icon(c, 'check', -12, 0, 30, C.lime, 5.5); icon(c, 'check', 6, 0, 30, C.lime, 5.5); c.restore();
      BOX('entregue', x1 - 96, y1 - 44, x1 - 36, y1 - 8);
    }
    c.restore();
    // "ENVIADA", carimbado em "sabendo tudo" (acima do balão, à direita)
    const tl = at('sabendo', 99), ec = p(t, tl, tl + 0.28);
    if (ec > 0) {
      const s = lerp(1.9, 1, E.outCubic(ec)), tr = kick(t, tl + 0.2, 0.2) * 6, sx = x1 - 112, sy = g.y0 - 36;
      c.save(); c.translate(sx + tr * Math.sin(t * 90), sy); c.rotate(-0.08); c.scale(s, s); c.globalAlpha *= clamp(ec * 1.6);
      rr(c, -100, -30, 200, 60, 12); c.fillStyle = css(C.bg, 0.9); c.fill(); c.strokeStyle = C.lime; c.lineWidth = 5; c.stroke();
      txt(c, 'ENVIADA', 0, 11, { fam: MONO, size: 30, weight: 800, color: C.lime, align: 'center', ls: 3 });
      c.restore();
      if (ec >= 1) BOX('carimbo', sx - 104, sy - 38, sx + 104, sy + 38);
    }
  }
  // "dúvida": o avião sai do canto do balão (sobe antes de cruzar x 940, fora da coluna de botões)
  function aviaoSai(c, t) {
    const td = at('duvida', 99), u = p(t, td + 0.05, td + 0.85);
    if (u <= 0 || u >= 1) return;
    const v = E.inOutCubic(u), a = [860, 1110], b = [900, 700], d = [1260, 600];
    const x = (1 - v) ** 2 * a[0] + 2 * v * (1 - v) * b[0] + v * v * d[0], y = (1 - v) ** 2 * a[1] + 2 * v * (1 - v) * b[1] + v * v * d[1];
    const s = E.outBack(p(t, td + 0.05, td + 0.3), 2);
    c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.arc(0, 0, 36, 0, TAU); c.fillStyle = C.lime; c.fill(); icon(c, 'aviao', 0, 0, 40, C.ink, 4.5); c.restore();
  }

  // ---------------------------------------------------------------- 1. GANCHO (o quadro 0 é a capa)
  function ganchoTitulo(c, t) {
    chip(c, 'DEPOIS DE CONFIRMAR', 540, 466, { align: 'center', box: 'chip' });
    const S = 100, k = kick(t, at('confirmada', 99), 0.3);
    const L = (s, y, cor, nome) => txt(c, s, 540, y, { size: S, weight: 900, align: 'center', ls: -0.03 * S, color: cor, box: nome });
    L('Reserva', 600, C.white, 'título 1');
    c.save(); c.translate(540, 674); c.scale(1 + 0.05 * k, 1 + 0.05 * k); c.translate(-540, -674);
    L('confirmada?', 702, C.white, 'título 2'); c.restore();
    L('Mande esta', 812, C.lime, 'título 3');
    L('mensagem.', 914, C.lime, 'título 4');
  }
  function gancho(c, t) {
    const t0 = T.ganchoFim - 0.04, u = E.inOutCubic(p(t, t0, t0 + 0.3));
    if (u >= 1 || 1.6 * u >= 1) return;
    // em "cinco": o título encolhe e sobe (o balão cresce por baixo)
    const bx = BOXES; if (u > 0) BOXES = null;                 // em transição: as caixas paradas não valem
    c.save(); c.globalAlpha *= clamp(1 - 1.6 * u);
    c.translate(540, 400); c.scale(lerp(1, 0.5, u), lerp(1, 0.5, u)); c.translate(-540, -400 - 60 * u);
    ganchoTitulo(c, t); c.restore(); BOXES = bx;
  }
  function tituloPequeno(c, t) {
    const t0 = T.ganchoFim + 0.14, e = E.outCubic(p(t, t0, t0 + 0.35));
    if (t < t0 || t > T.fichaFim) return;
    saida(c, t, T.fichaFim, () => {
      c.save(); c.globalAlpha *= e; c.translate(0, 26 * (1 - e));
      const a = 'Reserva confirmada? ', b = 'Mande esta mensagem.', S = 40;
      const w1 = tw(a, DISPLAY, S, 900, -1), w2 = tw(b, DISPLAY, S, 900, -1), x = 540 - (w1 + w2) / 2;
      txt(c, a, x, 440, { size: S, weight: 900, ls: -1, box: 'título pequeno 1' });
      txt(c, b, x + w1, 440, { size: S, weight: 900, ls: -1, color: C.lime, box: 'título pequeno 2' });
      c.restore();
    });
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
      txt(c, 'para quem responde', 130, 960, { size: 80, weight: 900, ls: -2, box: 'linha 2' });
      txt(c, 'as reservas da', 130, 1048, { size: 80, weight: 900, ls: -2, box: 'linha 3' });
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
      saidaLado(c, t, T.fichaFim, () => balao(c, t)); aviaoSai(c, t); mande(c, t);
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
    c.save(); c.translate(0, dy); ganchoTitulo(c, 0); balao(c, 0); c.restore();
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
