/* =====================================================================
   FAZLO Hospeda — SÉRIE ROTINA · o modelo (9:16, 1080x1920, 60 fps)
   Um motion só; cada episódio troca apenas o roteiro (episodios/<id>.json).
   Motor em Canvas 2D, determinístico: renderAt(ctx, t) desenha o quadro
   exato do instante t (s). O DNA é o do Reel 08 ("Você fechou a recepção"):
   preto, limão, cards #161616 com borda #3A3A3A e ponto limão, carimbo.

   Estrutura fixa (os tempos se ajustam ao número de cards e ao texto):
     1. título da dor já no quadro 0 (vale como capa): chip "ROTINA DE
        POUSADA", linha 1 branca, linha 2 limão, no maior tamanho que cabe;
        em 1,8 s ele sobe e vira cabeçalho;
     2. a situação: 2 a 5 cards/chips entram um a um com um ping e se
        empilham (os anteriores sobem, o grupo fica centrado);
     3. o chip limão carimbado em cima da pilha, com tranco;
     4. a virada: frase branca com uma parte em limão, parada ≥ 1,8 s;
     5. últimos 1,5 s: "Manda pra quem…" + logo oficial + sineta; fade curto.

   Áreas seguras: conteúdo em y 265–1456; nada em x ≥ 950 entre y 1060 e
   1560 (coluna de botões); título dentro do recorte 3:4 (y 240–1680).
   Sem telas, celulares, balões de app, tiques de lido ou emojis.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const DISPLAY = "'RT Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'RT Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#0A0A0A', card: '#161616', border: '#3A3A3A', lime: '#AFFA27',
    white: '#FFFFFF', gray: '#B9B9B1', grayM: '#8E8E88', ink: '#0A0A0A',
  };
  const SERIE = 'ROTINA DE POUSADA';
  // eixo dos textos: com largura ≤ 840 eles vão de x 105 a 945, fora da coluna de botões (x ≥ 950)
  const CX = 525;
  const SAFE = { top: 265, bottom: 1456 };
  const STAMP_FALL = 0.15;

  // ---------------------------------------------------------------- utilitários
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  };
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const css = (a, al = 1) => { a = typeof a === 'string' ? hex(a) : a; return `rgba(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])},${clamp(al)})`; };
  function hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const kick = (t, t0, dur = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / dur) * 4));

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function glow(ctx, x, y, r, color, a) {
    if (a <= 0.003 || r <= 1) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, css(color, a)); g.addColorStop(0.4, css(color, a * 0.35)); g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  function setFont(ctx, fam, size, weight, align = 'left', ls = 0) {
    ctx.font = `${weight} ${size}px ${fam}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px';
  }
  // largura visível (o letterSpacing do canvas soma o espaço também depois da última letra)
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, 'left', ls); return ctx.measureText(s).width - ls; }
  function txt(ctx, s, x, y, o) {
    setFont(ctx, o.fam || MONO, o.size, o.weight || 800, o.align || 'left', o.ls || 0);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.fillStyle = o.color; ctx.fillText(s, x, y);
    ctx.restore();
  }

  // ---------------------------------------------------------------- texto rico do roteiro
  // aspas retas viram tipográficas; trechos entre *asteriscos* ficam em limão
  function smart(s) {
    return s.replace(/(^|[\s(\[—–-])'/g, '$1‘').replace(/'/g, '’').replace(/(^|[\s(\[—–-])"/g, '$1“').replace(/"/g, '”');
  }
  function rich(line, base) {
    const words = []; let lime = false;
    smart(line).split('*').forEach((part, i) => {
      if (i > 0) lime = !lime;
      part.split(/\s+/).filter(Boolean).forEach((w) => words.push({ s: w, c: lime ? C.lime : base }));
    });
    return words;
  }
  const rowText = (row) => row.map((w) => w.s).join(' ');
  // largura da linha em 100 px (Inter Display 900, entreletra −3%): as larguras escalam com o tamanho
  const W100 = new Map();
  function rowW100(ctx, row) {
    const s = rowText(row);
    if (!W100.has(s)) W100.set(s, tw(ctx, s, DISPLAY, 100, 900, -3));
    return W100.get(s);
  }
  /* o maior tamanho que cabe: cada linha do roteiro fica inteira ou, se o tamanho ficar abaixo de `pref`,
     pode quebrar em duas (no ponto mais equilibrado). Escolhe a combinação de maior tamanho. */
  function fitRows(ctx, lines, o) {
    const opts = lines.map((ln) => {
      const out = [[ln]];
      if (ln.length > 1) {
        let best = null;
        for (let k = 1; k < ln.length; k++) {
          const a = ln.slice(0, k), b = ln.slice(k), m = Math.max(rowW100(ctx, a), rowW100(ctx, b));
          if (!best || m < best.m) best = { m, rows: [a, b] };
        }
        out.push(best.rows);
      }
      return out;
    });
    const sizeOf = (rows) => Math.min(o.max, o.maxW * 100 / Math.max(...rows.map((r) => rowW100(ctx, r))),
      o.maxH / (0.75 + (rows.length - 1) * o.lead + 0.2));
    let combos = [[]];
    opts.forEach((op) => { combos = combos.flatMap((c) => op.map((rows) => c.concat(rows))); });
    const whole = combos[0], sw = sizeOf(whole);
    if (sw >= o.pref) return { rows: whole, size: Math.floor(sw), lead: o.lead };
    let best = { rows: whole, size: sw };
    combos.forEach((rows) => { const s = sizeOf(rows); if (s > best.size * 1.02) best = { rows, size: s }; });
    return { rows: best.rows, size: Math.floor(best.size), lead: o.lead };
  }
  // medidas de um bloco de linhas: bases (a partir do topo das maiúsculas) e altura até a descendente
  function blockOf(f) {
    const s = f.size, base = f.rows.map((_, i) => 0.727 * s + i * s * f.lead);
    const last = rowText(f.rows[f.rows.length - 1]);
    const desc = /[çgjpqy,;()]/.test(last) ? 0.22 : 0.05;
    return { base, h: base[base.length - 1] + desc * s };
  }
  // uma linha colorida palavra a palavra, centrada em cx
  function drawRow(ctx, row, cx, y, size, alpha = 1) {
    const ls = -0.03 * size, full = rowText(row);
    const w = tw(ctx, full, DISPLAY, size, 900, ls);
    let x = cx - w / 2;
    setFont(ctx, DISPLAY, size, 900, 'left', ls);
    ctx.save(); ctx.globalAlpha *= alpha;
    row.forEach((wd, i) => {
      ctx.fillStyle = wd.c; ctx.fillText(wd.s, x, y);
      x += ctx.measureText(wd.s + (i < row.length - 1 ? ' ' : '')).width;
    });
    ctx.restore();
    return w;
  }
  // a linha sobe por trás de uma máscara
  function riseRow(ctx, row, cx, y, size, pin) {
    if (pin <= 0) return;
    const w = rowW100(ctx, row) * size / 100, off = (1 - E.outExpo(clamp(pin))) * size * 1.3;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - w / 2 - 60, y - size * 1.05, w + 120, size * 1.4); ctx.clip();
    drawRow(ctx, row, cx, y + off, size);
    ctx.restore();
  }
  // quebra simples por largura (texto corrido dos cards e do fecho)
  function wrap(ctx, s, fam, size, weight, ls, maxW) {
    const words = s.split(/\s+/), out = [];
    let cur = '';
    words.forEach((w) => {
      const tryS = cur ? cur + ' ' + w : w;
      if (cur && tw(ctx, tryS, fam, size, weight, ls) > maxW) { out.push(cur); cur = w; } else cur = tryS;
    });
    if (cur) out.push(cur);
    return out;
  }
  // quebra equilibrada em n linhas (o fecho): a de menor linha mais longa
  function balance(ctx, s, fam, size, weight, ls, maxW) {
    const words = s.split(/\s+/);
    if (tw(ctx, s, fam, size, weight, ls) <= maxW) return [s];
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const m = Math.max(tw(ctx, a, fam, size, weight, ls), tw(ctx, b, fam, size, weight, ls));
      if (m <= maxW && (!best || m < best.m)) best = { m, rows: [a, b] };
    }
    return best ? best.rows : wrap(ctx, s, fam, size, weight, ls, maxW);
  }

  let LOGO = null;
  function logo(ctx, x, y, d, alpha = 1) {
    if (d <= 1 || alpha <= 0.001) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, x - d / 2, y - d / 2, d, d);
    ctx.restore();
  }

  // =====================================================================
  // EPISÓDIO: roteiro -> layout + linha do tempo (calculados no init)
  // =====================================================================
  let EP = null, T = null, L = null, DURATION = 12;

  // ---- tamanhos (ver README: tamanhos e áreas seguras)
  const TITLE = { maxW: 840, maxH: 640, max: 140, pref: 88, lead: 1.02, cy: 900 };    // quadro 0: as linhas do roteiro inteiras se der ≥ 88 px
  const CHIP = { size: 26, h: 56, gap: 44 };                                          // "ROTINA DE POUSADA"
  const HEAD = { top: 285, maxH: 170, maxW: 760, maxS: 0.46 };                        // o título como cabeçalho
  const CARD = { x: 80, w: 860, r: 28, gap: 22, text: 46, label: 30, chip: 40 };
  const STAMP = { size: 56, h: 112, maxW: 860, cx: 515, rot: -4 };
  const VIRADA = { maxW: 840, maxH: 430, max: 104, pref: 84, lead: 1.04, cy: 880 };
  const FECHO = { size: 58, weight: 800, maxW: 800, lead: 1.18, gap: 72 };
  const LOCK = { D: 100, name: 40, gap: 18, before: 64 };

  function measureCard(ctx, c) {
    const k = { ...c };
    if (c.chip !== undefined) {
      k.kind = 'chip'; k.chipS = smart(c.chip);
      k.h = 104; k.w = Math.max(300, tw(ctx, k.chipS, MONO, CARD.chip, 800, 2) + 72 + 44);
      k.chars = k.chipS.length;
      return k;
    }
    const text = smart(c.texto || '');
    k.kind = c.rotulo ? 'rotulo' : 'texto';
    const maxW = k.kind === 'rotulo' ? CARD.w - 80 : CARD.w - 76 - 40;
    let size = CARD.text, rows = wrap(ctx, text, DISPLAY, size, 700, -0.01 * size, maxW);
    while (rows.length > 2 && size > 36) { size -= 2; rows = wrap(ctx, text, DISPLAY, size, 700, -0.01 * size, maxW); }
    k.size = size; k.rows = rows; k.w = CARD.w;
    k.h = (k.kind === 'rotulo' ? 156 : 112) + (rows.length - 1) * 56;
    k.chars = text.length + (c.rotulo ? c.rotulo.length : 0) + (c.hora ? c.hora.length : 0);
    return k;
  }

  function setup(ep) {
    const m = document.createElement('canvas').getContext('2d');
    W100.clear();
    EP = ep;
    // ---- título (quadro 0) e cabeçalho
    const tLines = ep.titulo.map((ln, i) => rich(ln, i === 0 ? C.white : C.lime));
    if (ep.titulo.some((ln) => ln.includes('*'))) tLines.splice(0, tLines.length, ...ep.titulo.map((ln) => rich(ln, C.white)));
    const title = fitRows(m, tLines, TITLE);
    const tb = blockOf(title);
    const chipW = tw(m, SERIE, MONO, CHIP.size, 800, 4) + 46 + 28;
    const blockH = CHIP.h + CHIP.gap + tb.h;
    const top = TITLE.cy - blockH / 2;
    const rowsTop = top + CHIP.h + CHIP.gap;
    const maxRowW = Math.max(...title.rows.map((r) => rowW100(m, r) * title.size / 100));
    const hs = Math.min(HEAD.maxS, HEAD.maxH / tb.h, HEAD.maxW / maxRowW);
    const head = { s: hs, cy: HEAD.top + tb.h * hs / 2, bottom: HEAD.top + tb.h * hs };
    // ---- cards
    const cards = ep.cards.map((c) => measureCard(m, c));
    const zoneTop = head.bottom + 64, zoneBot = 1440;
    const groupH = cards.reduce((a, k) => a + k.h, 0) + CARD.gap * (cards.length - 1);
    const CY = (zoneTop + zoneBot) / 2;
    // ---- carimbo
    const stampS = smart(ep.carimbo);
    let ss = STAMP.size;
    while (tw(m, stampS, MONO, ss, 800, 1) + 84 > STAMP.maxW && ss > 36) ss -= 1;
    const stampW = tw(m, stampS, MONO, ss, 800, 1) + 84 * ss / STAMP.size;
    // ---- virada + fecho + logo
    const virada = fitRows(m, ep.virada.map((ln) => rich(ln, C.white)), VIRADA);
    const vb = blockOf(virada);
    const fechoS = smart(ep.fecho);
    // o fecho em até duas linhas: se não couber em 58 px, diminui (até 48)
    let fs = FECHO.size, fRows = balance(m, fechoS, DISPLAY, fs, FECHO.weight, -0.02 * fs, FECHO.maxW);
    while (fRows.length > 2 && fs > 48) { fs -= 1; fRows = balance(m, fechoS, DISPLAY, fs, FECHO.weight, -0.02 * fs, FECHO.maxW); }
    const fH = 0.727 * fs + (fRows.length - 1) * fs * FECHO.lead + 0.22 * fs;
    const total = vb.h + FECHO.gap + fH + LOCK.before + LOCK.D;
    let fTop = VIRADA.cy - total / 2;
    fTop -= Math.max(0, fTop + total - 1440);
    const fin = {
      vTop: fTop, vTop0: VIRADA.cy - vb.h / 2,
      fTop: fTop + vb.h + FECHO.gap, logoCy: fTop + total - LOCK.D / 2,
    };

    L = { title, tb, chipW, top, rowsTop, head, cards, CY, groupH, zoneTop, zoneBot, stampS, ss, stampW, virada, vb, fRows, fs, fH, fin };

    // ---- linha do tempo: cada card fica o tempo de leitura do seu texto antes do próximo
    const gapOf = (k) => clamp(0.5 + 0.036 * k.chars, 0.85, 1.7);
    const t = { knock: 0.7, rise: 1.8, cards: [] };
    let x = 2.25;
    cards.forEach((k, i) => { t.cards.push(x); x += gapOf(k); });
    const vChars = ep.virada.join(' ').replace(/\*/g, '').length;
    const tail = 0.15 + 2.1 + 0.35 + clamp(1.9 + 0.012 * vChars, 2.3, 2.7) + 1.5;
    // a duração fica entre 10 e 14 s: os intervalos dos cards encolhem ou crescem para caber
    let end = x + tail;
    if (end > 14 || end < 10) {
      const target = clamp(end, 10, 14), span = x - 2.25, f = (target - tail - 2.25) / span;
      t.cards = t.cards.map((c) => 2.25 + (c - 2.25) * f); x = 2.25 + span * f; end = target;
    }
    t.stamp = x + 0.15;
    t.exit = t.stamp + 2.1;
    t.virada = t.exit + 0.35;
    t.fecho = t.virada + clamp(1.9 + 0.012 * vChars, 2.3, 2.7);
    t.logo = t.fecho + 0.32;
    DURATION = Math.round((t.fecho + 1.5) * 60) / 60;          // quadro inteiro
    t.fade = DURATION - 0.3;
    T = t;
    buildFast();
    buildCues();
  }

  // =====================================================================
  // CENAS
  // =====================================================================
  // ---------------------------------------------------------------- chip da série
  function seriesChip(ctx, x, y, alpha) {
    if (alpha <= 0.002) return;
    const w = L.chipW, h = CHIP.h;
    ctx.save(); ctx.globalAlpha *= alpha;
    rr(ctx, x - w / 2, y, w, h, h / 2); ctx.fillStyle = C.card; ctx.fill();
    ctx.strokeStyle = C.border; ctx.lineWidth = 2; ctx.stroke();
    circle(ctx, x - w / 2 + 28, y + h / 2, 7); ctx.fillStyle = C.lime; ctx.fill();
    txt(ctx, SERIE, x - w / 2 + 46, y + h / 2 + 0.36 * CHIP.size, { size: CHIP.size, weight: 800, color: C.gray, ls: 4 });
    ctx.restore();
  }
  // ---------------------------------------------------------------- título -> cabeçalho
  function hook(ctx, t) {
    const exitY = -820 * E.inCubic(p(t, T.exit, T.exit + 0.4));
    if (exitY < -800) return;
    const e = E.inOutCubic(p(t, T.rise, T.rise + 0.5));
    const push = 1 + 0.025 * p(t, 0, T.rise);
    const { title, tb, rowsTop, head } = L;
    const rcy = rowsTop + tb.h / 2;                                // centro do bloco de linhas no quadro 0
    // o chip da série some quando o título vira cabeçalho
    seriesChip(ctx, CX, L.top + exitY, 1 - p(t, T.rise, T.rise + 0.22));
    const sc = lerp(push, head.s, e);
    ctx.save();
    ctx.translate(lerp(CX, W / 2, e), lerp(rcy, head.cy, e) + exitY); ctx.scale(sc, sc); ctx.translate(-CX, -rcy);
    const lime0 = title.rows.findIndex((r) => r.some((w) => w.c === C.lime));
    title.rows.forEach((row, i) => {
      const y = rowsTop + tb.base[i];
      ctx.save();
      // a parte limão leva uma batida seca em 0,7 s (como um carimbo leve na mesa)
      if (i >= lime0 && lime0 >= 0) {
        const k = 0.045 * kick(t, T.knock, 0.35) * Math.cos((t - T.knock) * 38);
        ctx.translate(CX, y - 0.36 * title.size); ctx.scale(1 + k, 1 + k); ctx.translate(-CX, -(y - 0.36 * title.size));
      }
      drawRow(ctx, row, CX, y, title.size);
      ctx.restore();
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- cards
  function cardBody(ctx, k, i, x, t, dim) {
    const h = k.h, w = k.w, r = k.kind === 'chip' ? h / 2 : CARD.r;
    rr(ctx, x, 0, w, h, r); ctx.fillStyle = C.card; ctx.fill();
    ctx.strokeStyle = C.border; ctx.lineWidth = 2; ctx.stroke();
    const dy = k.kind === 'rotulo' ? 47 : h / 2;
    // o ponto limão pulsa na chegada e segue pulsando (a cada 0,9 s) enquanto o card é o mais novo da pilha
    const next = i + 1 < T.cards.length ? T.cards[i + 1] : T.stamp;
    const pulse = t < next ? ((t - T.cards[i]) % 0.9) / 0.6 : p(t, T.cards[i], T.cards[i] + 0.6);
    if (pulse > 0 && pulse < 1) { ctx.strokeStyle = css(C.lime, 0.7 * (1 - pulse)); ctx.lineWidth = 3; circle(ctx, x + 44, dy, 9 + 26 * E.outCubic(pulse)); ctx.stroke(); }
    circle(ctx, x + 44, dy, 9); ctx.fillStyle = C.lime; ctx.fill();
    if (k.kind === 'chip') {
      txt(ctx, k.chipS, x + 72, h / 2 + 0.36 * CARD.chip, { size: CARD.chip, weight: 800, color: C.white, ls: 2 });
    } else if (k.kind === 'rotulo') {
      txt(ctx, smart(k.rotulo), x + 70, 58, { size: CARD.label, weight: 800, color: C.gray, ls: 2 });
      if (k.hora) txt(ctx, k.hora, x + w - 40, 58, { size: 28, weight: 700, color: C.grayM, align: 'right', ls: 1 });
      k.rows.forEach((s, j) => txt(ctx, s, x + 40, 124 + j * 56, { fam: DISPLAY, size: k.size, weight: 700, color: C.white, ls: -0.01 * k.size }));
    } else {
      const b0 = h / 2 - (k.rows.length - 1) * 28 + 0.36 * k.size;
      k.rows.forEach((s, j) => txt(ctx, s, x + 76, b0 + j * 56, { fam: DISPLAY, size: k.size, weight: 700, color: C.white, ls: -0.01 * k.size }));
    }
    if (dim > 0.005) { rr(ctx, x, 0, w, h, r); ctx.fillStyle = css(C.bg, dim); ctx.fill(); }
  }
  // a pilha sobe devagar (50 px, em velocidade constante) do primeiro card até a saída: a cena nunca fica parada
  const DRIFT = 50;
  const groupDrift = (t) => -DRIFT * p(t, T.cards[0], T.exit);
  const arrive = (j, t) => E.outBack(p(t, T.cards[j], T.cards[j] + 0.45), 1.3);
  function pileJolt(t) {
    const x = t - T.stamp;
    return x < 0 ? 0 : 18 * (1 - Math.exp(-x / 0.012)) * Math.exp(-x / 0.1) * Math.cos(TAU * 6 * x);
  }
  // topo de cada card: o grupo fica centrado em CY; o card novo entra embaixo e empurra os anteriores para cima
  function cardTops(t) {
    const { cards } = L;
    let sum = 0;
    const acc = cards.map((k, j) => { const a = t >= T.cards[j] ? arrive(j, t) : 0; const o = sum; sum += a * (k.h + CARD.gap); return o; });
    const top = L.CY - (sum - CARD.gap * Math.min(1, t >= T.cards[0] ? arrive(0, t) : 0)) / 2;
    return acc.map((o) => top + o);
  }
  function cards(ctx, t) {
    const { cards } = L, n = cards.length;
    const jolt = pileJolt(t), tops = cardTops(t);
    const stampDim = 0.38 * E.outCubic(p(t, T.stamp, T.stamp + 0.25));
    cards.forEach((k, i) => {
      if (t < T.cards[i]) return;
      const inP = p(t, T.cards[i], T.cards[i] + 0.4), inE = E.outBack(inP, 1.4);
      let after = 0;
      for (let j = i + 1; j < n; j++) after += p(t, T.cards[j], T.cards[j] + 0.4);
      const dim = clamp(after * 0.12, 0, 0.36) + stampDim;
      let y = tops[i] + (1 - inE) * 150 + jolt * (1 - 0.1 * (n - 1 - i));
      const sc = lerp(0.96, 1, inE);
      let rot = 0;
      // saída: os cards caem pela parte de baixo, em cascata (os mais novos primeiro)
      const d = 0.04 * (n - 1 - i), ex = p(t, T.exit + d, T.exit + d + 0.42);
      if (ex > 0) { y += 1500 * E.inCubic(ex); rot = (hash(i, 7) - 0.5) * 14 * DEG * ex; }
      if (y > H + 40) return;
      const x = CARD.x;
      ctx.save();
      ctx.globalAlpha = p(inP, 0, 0.35);
      ctx.translate(x + k.w / 2, y + k.h / 2); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-(x + k.w / 2), -k.h / 2);
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      rr(ctx, x, 0, k.w, k.h, k.kind === 'chip' ? k.h / 2 : CARD.r); ctx.fillStyle = C.card; ctx.fill();
      ctx.shadowColor = 'transparent';
      cardBody(ctx, k, i, x, t, dim);
      ctx.restore();
    });
  }
  // ---------------------------------------------------------------- o carimbo
  function stampChip(ctx, t) {
    const t0 = T.stamp - STAMP_FALL;
    if (t < t0) return;
    const u = p(t, t0, T.stamp), x = t - T.stamp, e = E.inCubic(u);
    let sc = lerp(1.6, 1, e);
    if (x >= 0) sc = 1 - 0.05 * Math.exp(-x / 0.05) * Math.cos(x * 60);
    const ex = p(t, T.exit, T.exit + 0.42);
    if (ex >= 1) return;
    const k = L.ss / STAMP.size, h = STAMP.h * k, w = L.stampW;
    const cx = STAMP.cx, cy = L.CY + 10 + pileJolt(t) + 1500 * E.inCubic(ex);
    // depois do golpe, um brilho limão respira atrás do carimbo
    if (x > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx, cy, 380, C.lime, (0.05 + 0.035 * Math.sin(TAU * (x - 0.3) / 1.4 - Math.PI / 2)) * p(x, 0.3, 0.6) * (1 - ex)); ctx.restore(); }
    ctx.save();
    ctx.globalAlpha = p(u, 0, 0.35);
    ctx.translate(cx, cy); ctx.rotate(lerp(-9, STAMP.rot, e) * DEG + 6 * DEG * ex); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40 * (1 - e) + 24; ctx.shadowOffsetY = 18 * (1 - e) + 8;
    rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = C.lime; ctx.fill();
    ctx.shadowColor = 'transparent';
    txt(ctx, L.stampS, 0, 0.36 * L.ss, { size: L.ss, weight: 800, color: C.ink, align: 'center', ls: 1 });
    ctx.restore();
    if (x >= 0 && x < 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx, cy, 420, C.lime, 0.22 * kick(t, T.stamp, 0.4)); ctx.restore(); }
  }

  // ---------------------------------------------------------------- virada + fecho
  function closing(ctx, t) {
    if (t < T.virada) return;
    const { virada, vb, fin, fRows } = L;
    const up = E.inOutCubic(p(t, T.fecho, T.fecho + 0.5));
    const vTop = lerp(fin.vTop0, fin.vTop, up);
    const drift = 1 + 0.025 * E.inOutSine(p(t, T.virada + 0.3, DURATION));
    ctx.save(); ctx.translate(CX, 960); ctx.scale(drift, drift); ctx.translate(-CX, -960);
    virada.rows.forEach((row, i) => riseRow(ctx, row, CX, vTop + vb.base[i], virada.size, p(t, T.virada + i * 0.08, T.virada + i * 0.08 + 0.36)));
    if (t >= T.fecho) {
      const s = L.fs, ls = -0.02 * s;
      fRows.forEach((r, i) => {
        const pin = p(t, T.fecho + 0.08 + i * 0.07, T.fecho + 0.08 + i * 0.07 + 0.32);
        if (pin <= 0) return;
        const y = fin.fTop + 0.727 * s + i * s * FECHO.lead, off = (1 - E.outExpo(pin)) * s * 1.3;
        const w = tw(ctx, r, DISPLAY, s, FECHO.weight, ls);
        ctx.save(); ctx.beginPath(); ctx.rect(CX - w / 2 - 40, y - s * 1.05, w + 80, s * 1.4); ctx.clip();
        txt(ctx, r, CX - w / 2, y + off, { fam: DISPLAY, size: s, weight: FECHO.weight, color: C.white, ls });
        ctx.restore();
      });
      const a = p(t, T.logo, T.logo + 0.12);
      if (a > 0) {
        const D = LOCK.D, ww = tw(ctx, 'FAZLO Hospeda', DISPLAY, LOCK.name, 900, -1), total = D + LOCK.gap + ww, x0 = CX - total / 2, cy = fin.logoCy;
        const sc = lerp(0.8, 1, E.outBack(p(t, T.logo, T.logo + 0.32), 2.4));
        ctx.save(); ctx.globalAlpha *= a; ctx.translate(CX, cy); ctx.scale(sc, sc); ctx.translate(-CX, -cy);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x0 + D / 2, cy, D * 1.15, C.lime, 0.1 + 0.3 * kick(t, T.logo, 0.6)); ctx.restore();
        logo(ctx, x0 + D / 2, cy, D);
        txt(ctx, 'FAZLO Hospeda', x0 + D + LOCK.gap, cy + 0.36 * LOCK.name, { fam: DISPLAY, size: LOCK.name, weight: 900, color: C.white, ls: -1 });
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- quadro
  function background(ctx, t) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 1000, 0, 540, 1000, 1150);
    g.addColorStop(0, '#141513'); g.addColorStop(0.55, '#0E0F0E'); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // a luz limão cresce com a pilha
    let n = 0;
    T.cards.forEach((m) => { n += p(t, m, m + 0.4); });
    const on = (n / T.cards.length) * (1 - p(t, T.exit, T.exit + 0.5));
    if (on > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 540, L.CY + 120, 700, C.lime, 0.05 * on); ctx.restore(); }
  }
  function shake(t) {
    const x = t - T.stamp;
    if (x < 0 || x > 0.4) return [0, 0];
    const a = 7 * (1 - Math.exp(-x / 0.01)) * Math.exp(-x / 0.08);
    return [a * Math.sin(TAU * 23 * x + 0.6), a * (0.5 * Math.cos(TAU * 29 * x) + 0.3)];
  }
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    background(ctx, t);
    const [sx, sy] = shake(t);
    ctx.save(); ctx.translate(sx, sy);
    ctx.save(); ctx.translate(0, groupDrift(t));
    cards(ctx, t);
    stampChip(ctx, t);
    ctx.restore();
    hook(ctx, t);
    closing(ctx, t);
    ctx.restore();
    const f = E.inOutSine(p(t, T.fade, DURATION));
    if (f > 0) { ctx.fillStyle = css('#000000', f); ctx.fillRect(0, 0, W, H); }
  }

  // motion blur por subamostragem nas passagens rápidas
  let FAST = [];
  function buildFast() {
    FAST = [[T.rise, T.rise + 0.5, 8, 1 / 60]]
      .concat(T.cards.map((m) => [m, m + 0.4, 4, 1 / 120]))
      .concat([[T.stamp - STAMP_FALL, T.stamp + 0.3, 8, 1 / 60], [T.exit, T.exit + 0.7, 10, 1 / 50],
        [T.virada, T.virada + 0.5, 4, 1 / 120], [T.fecho, T.fecho + 0.5, 4, 1 / 120], [T.logo, T.logo + 0.32, 6, 1 / 60]]);
  }
  function shutterSpec(t) {
    for (const [a, b, k, dt] of FAST) if (t >= a && t < b) return { k, dt };
    return { k: 1 };
  }
  let bufS = null, bufA = null;
  function renderAt(ctx, t, o = {}) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    t = clamp(t, 0, DURATION - 1e-4);
    const sh = o.noBlur ? { k: 1 } : shutterSpec(t);
    if (sh.k <= 1) { frame(ctx, t); return; }
    if (!bufS) { const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }; bufS = mk(); bufA = mk(); }
    const sctx = bufS.getContext('2d'), actx = bufA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < sh.k; k++) {
      frame(sctx, clamp(t + (k / (sh.k - 1) - 0.5) * sh.dt, 0, DURATION - 1e-4));
      actx.globalAlpha = 1 / (k + 1); actx.drawImage(bufS, 0, 0);
    }
    actx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bufA, 0, 0);
  }

  // ---------------------------------------------------------------- cues de som
  const CUES = [];
  const cue = (t, type, o = {}) => CUES.push(Object.assign({ t: Math.round(t * 1e4) / 1e4, type }, o));
  function buildCues() {
    CUES.length = 0;
    cue(0, 'hook');
    cue(T.knock, 'knock');
    cue(T.rise, 'rise', { d: 0.5 });
    T.cards.forEach((m, k) => cue(m, 'ping', { k, n: T.cards.length }));
    cue(T.stamp - STAMP_FALL, 'stampfall', { d: STAMP_FALL });
    cue(T.stamp, 'stamp');
    cue(T.exit, 'exit', { d: 0.5 });
    cue(T.virada, 'virada');
    cue(T.fecho, 'fecho');
    cue(T.logo, 'logo');
    cue(T.fade, 'fade', { d: DURATION - T.fade });
    CUES.sort((a, b) => a.t - b.t);
  }

  function init(img, ep) { LOGO = img; setup(ep); }

  // as caixas de cada elemento no seu instante de leitura (para a revisão de áreas seguras)
  function boxes() {
    const m = document.createElement('canvas').getContext('2d'), out = [];
    const { title, tb, rowsTop } = L;
    out.push({ el: 'chip da série', t: 0, x0: CX - L.chipW / 2, x1: CX + L.chipW / 2, y0: L.top, y1: L.top + CHIP.h });
    title.rows.forEach((r, i) => { const w = rowW100(m, r) * title.size / 100; out.push({ el: `título ${i + 1}`, t: 0, x0: CX - w / 2, x1: CX + w / 2, y0: rowsTop + tb.base[i] - 0.727 * title.size, y1: rowsTop + tb.base[i] + 0.22 * title.size }); });
    const hw = Math.max(...title.rows.map((r) => rowW100(m, r) * title.size / 100)) * L.head.s;
    out.push({ el: 'cabeçalho', t: T.stamp, x0: W / 2 - hw / 2, x1: W / 2 + hw / 2, y0: HEAD.top, y1: L.head.bottom });
    // pilha e carimbo com a subida lenta do instante
    const G = (t, x0, x1, y0, y1) => { const d = groupDrift(t); return { x0, x1, y0: y0 + d, y1: y1 + d }; };
    const tc = T.stamp - 0.2, tops = cardTops(tc);
    L.cards.forEach((k, i) => out.push({ el: `card ${i + 1}`, t: tc, ...G(tc, CARD.x, CARD.x + k.w, tops[i], tops[i] + k.h) }));
    const k = L.ss / STAMP.size, h = STAMP.h * k, a = STAMP.rot * DEG;
    const ex = (Math.cos(-a) * L.stampW + Math.sin(-a) * h) / 2, ey = (Math.sin(-a) * L.stampW + Math.cos(-a) * h) / 2;
    out.push({ el: 'carimbo', t: T.stamp + 0.5, ...G(T.stamp + 0.5, STAMP.cx - ex, STAMP.cx + ex, L.CY + 10 - ey, L.CY + 10 + ey) });
    // virada, fecho e logo com o leve avanço da cena (escala em torno de (525, 960)) do instante
    const dr = (t) => 1 + 0.025 * E.inOutSine(p(t, T.virada + 0.3, DURATION));
    const Dz = (t, x0, x1, y0, y1) => { const g = dr(t); return { t, x0: CX + (x0 - CX) * g, x1: CX + (x1 - CX) * g, y0: 960 + (y0 - 960) * g, y1: 960 + (y1 - 960) * g }; };
    const tv = T.fecho - 0.1, tf = DURATION - 0.35, vs = L.virada.size;
    L.virada.rows.forEach((r, i) => {
      const w = rowW100(m, r) * vs / 100;
      out.push({ el: `virada ${i + 1}`, ...Dz(tv, CX - w / 2, CX + w / 2, L.fin.vTop0 + L.vb.base[i] - 0.727 * vs, L.fin.vTop0 + L.vb.base[i] + 0.22 * vs) });
      out.push({ el: `virada ${i + 1}*`, ...Dz(tf, CX - w / 2, CX + w / 2, L.fin.vTop + L.vb.base[i] - 0.727 * vs, L.fin.vTop + L.vb.base[i] + 0.22 * vs) });
    });
    const fs = L.fs;
    L.fRows.forEach((r, i) => {
      const w = tw(m, r, DISPLAY, fs, FECHO.weight, -0.02 * fs), b = L.fin.fTop + 0.727 * fs + i * fs * FECHO.lead;
      out.push({ el: `fecho ${i + 1}`, ...Dz(tf, CX - w / 2, CX + w / 2, b - 0.727 * fs, b + 0.22 * fs) });
    });
    const lw = LOCK.D + LOCK.gap + tw(m, 'FAZLO Hospeda', DISPLAY, LOCK.name, 900, -1);
    out.push({ el: 'logo', ...Dz(tf, CX - lw / 2, CX + lw / 2, L.fin.logoCy - LOCK.D / 2, L.fin.logoCy + LOCK.D / 2) });
    return out;
  }

  window.ROTINA = {
    init, renderAt, W, H,
    get DURATION() { return DURATION; },
    boxes,
    layout: () => ({ titulo: { size: L.title.size, linhas: L.title.rows.map(rowText) }, cabecalho: L.head.s, virada: { size: L.virada.size, linhas: L.virada.rows.map(rowText) }, fecho: [L.fs, ...L.fRows], carimbo: L.ss, grupo: [L.zoneTop, L.zoneBot, L.groupH], duracao: DURATION }),
    cues: () => ({ episodio: EP.id, duration: DURATION, sections: Object.assign({}, T, { logoY: L.fin.logoCy, groupCY: L.CY }), cues: CUES.slice() }),
    // peças de desenho para a capa (src/capa.js)
    _capa: { C, DISPLAY, MONO, rich, fitRows, blockOf, drawRow, rowW100, tw, txt, glow, smart },
  };
})();
