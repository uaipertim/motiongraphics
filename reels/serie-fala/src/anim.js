/* =====================================================================
   FAZLO Hospeda — SÉRIE FALA · o motor (9:16, 1080x1920, 60 fps)
   Reel narrado que conta uma dor. Cada FRASE da narração ganha uma CENA
   diferente, escolhida num JSON (episodios/<id>.json: fala + tipo + dados).
   Motor em Canvas 2D, determinístico: renderAt(ctx, t) desenha o quadro t.

   Biblioteca de cenas (src/anim.js, objeto CENAS):
     titulo     o gancho: título grande em 2 linhas, aproximação lenta
     notinha    a nota impressa: linhas que imprimem, total em bloco negro,
                e a linha escrita "à caneta" (as notas de cenas seguidas
                continuam uma da outra: "herda")
     relogio    relógio grande que salta para uma hora + pergunta que cresce
     objetos    chips girando em volta de um contador de espera, e um carimbo
     valor      valor enorme em limão + a conta que fecha + valor que cai
     pergunta   uma pergunta grande que cresce, palavra a palavra
     riscada    uma linha riscada e a correta embaixo
     contador   um contador de tempo que corre
     virada     a frase de virada, sozinha na tela, com movimento lento
     fecho      a marca (logo + sineta)

   Em cima de toda cena: a LEGENDA falada, palavra a palavra, sincronizada
   com a voz (Inter Display 900, 68 px, palavras-chave em limão, até 2 linhas,
   numa faixa fixa embaixo: y 1280–1440).

   Áreas seguras: nada em x ≥ 950 entre y 1060 e 1560 (coluna de botões);
   conteúdo importante entre y 265 e 1456. Sem telas, celulares ou aparelhos.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'FL Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#0A0A0A', card: '#161616', border: '#3A3A3A', lime: '#AFFA27', white: '#FFFFFF', gray: '#B9B9B1', grayM: '#8E8E88',
    ink: '#0A0A0A', paper: '#F2F2EC', paperInk: '#141414',
  };
  const CX = 525;                                   // eixo dos textos: com ≤ 840 px vão de x 105 a 945, fora da coluna de botões
  const CAP = { size: 68, lh: 80, y1: 1332, maxW: 820, cx: 540, x0: 130, x1: 950 };   // legenda sem fundo, centrada em x = 540 e limitada a x 130–950: linhas em y 1332 e 1412
  const FAIXA = { y0: 300, y1: 1235 };            // faixa livre da cena: de y 300 até 60 px acima do topo da legenda (≈ y 1295)

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
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, 'left', ls); return ctx.measureText(s).width - ls; }
  function txt(ctx, s, x, y, o) {
    setFont(ctx, o.fam || MONO, o.size, o.weight || 800, o.align || 'left', o.ls || 0);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.fillStyle = o.color; ctx.fillText(s, x, y);
    ctx.restore();
  }
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

  // aspas retas viram tipográficas; trechos entre *asteriscos* ficam em limão
  function smart(s) { return s.replace(/(^|[\s(\[—–-])'/g, '$1‘').replace(/'/g, '’').replace(/(^|[\s(\[—–-])"/g, '$1“').replace(/"/g, '”'); }
  function rich(line, base) {
    const words = []; let lime = false;
    smart(line).split('*').forEach((part, i) => { if (i > 0) lime = !lime; part.split(/\s+/).filter(Boolean).forEach((w) => words.push({ s: w, c: lime ? C.lime : base })); });
    return words;
  }
  const rowText = (row) => row.map((w) => w.s).join(' ');
  const W100 = new Map();
  function rowW100(ctx, row) { const s = rowText(row); if (!W100.has(s)) W100.set(s, tw(ctx, s, DISPLAY, 100, 900, -3)); return W100.get(s); }
  // o maior corpo em que as linhas (cada uma inteira) cabem em maxW
  function fitSize(ctx, rows, maxW, max) { return Math.floor(Math.min(max, ...rows.map((r) => maxW * 100 / rowW100(ctx, r)))); }
  function drawRow(ctx, row, cx, y, size, alpha = 1) {
    const ls = -0.03 * size, w = tw(ctx, rowText(row), DISPLAY, size, 900, ls);
    let x = cx - w / 2;
    setFont(ctx, DISPLAY, size, 900, 'left', ls);
    ctx.save(); ctx.globalAlpha *= alpha;
    row.forEach((wd, i) => { ctx.fillStyle = wd.c; ctx.fillText(wd.s, x, y); x += ctx.measureText(wd.s + (i < row.length - 1 ? ' ' : '')).width; });
    ctx.restore();
    return w;
  }

  let LOGO = null;
  function logo(ctx, x, y, d, alpha = 1) {
    if (d <= 1 || alpha <= 0.001) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, x - d / 2, y - d / 2, d, d); ctx.restore();
  }

  // =====================================================================
  // ESTADO DO EPISÓDIO: linha do tempo (audio/<id>/linha.json) + roteiro
  // =====================================================================
  let LN = null, SC = [], DUR = 36, CUES = [], PAGES = [], FAST = [];
  const M = document.createElement('canvas').getContext('2d');

  // o instante (início) da palavra que casa com `em` (a 1ª palavra: "WhatsApp", "quatrocentos"…), dentro da cena
  function at(sc, em, def = null) {
    if (em === undefined || em === null) return def;
    const k = norm(String(em).split(/\s+/)[0]);
    const w = sc.palavras.find((x) => norm(x.w) === k) || sc.palavras.find((x) => norm(x.w).startsWith(k));
    return w ? w.t0 : def;
  }

  // ---------------------------------------------------------------- a nota (continua entre cenas)
  function receipt(i, memo = {}) {
    if (memo[i]) return memo[i];
    const sc = SC[i], d = sc.dados;
    const base = d.herda !== undefined && d.herda !== null ? receipt(d.herda, memo) : { linhas: [], total: null, caneta: null };
    const R = { linhas: base.linhas.map((l) => ({ ...l, at: -1 })), total: base.total && { ...base.total, at: -1 }, caneta: base.caneta && { ...base.caneta, at: -1 } };
    (d.linhas || []).forEach((l, k) => R.linhas.push({ t: l.t, v: l.v, at: at(sc, l.em, sc.t0 + 0.3 + 0.6 * k) }));
    if (d.total) R.total = { t: d.total.t, v: d.total.v, at: at(sc, d.total.em, sc.t0 + 1.5) };
    if (d.caneta) R.caneta = { t: d.caneta.t, at: at(sc, d.caneta.em, sc.t0 + 1.2) };
    return (memo[i] = R);
  }

  // ---------------------------------------------------------------- legenda: páginas de até 2 linhas, palavra a palavra
  function layoutPages() {
    PAGES = [];
    SC.forEach((sc) => {
      const ws = sc.palavras, wid = (a, b) => tw(M, ws.slice(a, b).map((x) => x.w).join(' '), DISPLAY, CAP.size, 900, -0.02 * CAP.size);
      const pages = [];
      let i = 0;
      while (i < ws.length) {
        // o máximo de palavras que cabe em 2 linhas
        let j = i, lines = 1, a = i;
        while (j < ws.length) {
          if (wid(a, j + 1) > CAP.maxW) { if (a === j) { j++; continue; } lines++; a = j; if (lines > 2) break; }
          else j++;
        }
        pages.push([i, j]); i = j;
      }
      // a última página não fica com uma palavra só: puxa a última da anterior
      if (pages.length > 1) {
        const last = pages[pages.length - 1], prev = pages[pages.length - 2];
        if (last[1] - last[0] === 1 && prev[1] - prev[0] > 2) { prev[1]--; last[0]--; }
      }
      pages.forEach(([a, b], k) => {
        const n = b - a, full = wid(a, b);
        let brk = n;                                   // 1 linha, ou o corte que equilibra as duas
        if (full > CAP.maxW) { let best = 1e9; for (let k2 = 1; k2 < n; k2++) { const m = Math.max(wid(a, a + k2), wid(a + k2, b)); if (m < best) { best = m; brk = k2; } } }
        const rows = brk >= n ? [[a, b]] : [[a, a + brk], [a + brk, b]];
        const pos = {};
        rows.forEach(([r0, r1], ri) => {
          const w = wid(r0, r1); let x = CAP.cx - w / 2;
          for (let k2 = r0; k2 < r1; k2++) { pos[k2] = { x, row: ri }; x += tw(M, ws[k2].w + ' ', DISPLAY, CAP.size, 900, -0.02 * CAP.size) + 0.02 * CAP.size; }
        });
        const t0 = ws[a].t0, nxt = pages[k + 1] ? ws[pages[k + 1][0]].t0 : sc.t1 + 0.12;
        PAGES.push({ sc: sc.n, a, b, rows, pos, nrows: rows.length, t0, t1: nxt, words: ws });
      });
    });
  }
  // cada página dura até a 1ª palavra da seguinte (inclusive entre cenas): a palavra nova aparece no instante da fala
  function encadeiaPaginas() { PAGES.forEach((q, i) => { q.t1 = PAGES[i + 1] ? PAGES[i + 1].t0 : DUR; }); }
  function caption(ctx, t) {
    const pg = PAGES.find((q) => t >= q.t0 && t < q.t1);
    if (!pg) return;
    const out = 1;                                   // a página seguinte entra no instante da 1ª palavra dela (corte seco)
    const y0 = CAP.y1 + (pg.nrows === 1 ? CAP.lh / 2 : 0);          // uma linha: no meio da faixa
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
    for (let k = pg.a; k < pg.b; k++) {
      const w = pg.words[k];
      if (t < w.t0) continue;
      const u = E.outCubic(p(t, w.t0, w.t0 + 0.09)), ps = pg.pos[k];
      setFont(ctx, DISPLAY, CAP.size, 900, 'left', -0.02 * CAP.size);
      ctx.globalAlpha = u * out; ctx.fillStyle = w.chave ? C.lime : C.white;
      const pop = w.chave ? 1 + 0.07 * kick(t, w.t0, 0.18) : 1, y = y0 + ps.row * CAP.lh + (1 - u) * 10;
      ctx.save(); ctx.translate(ps.x + tw(ctx, w.w, DISPLAY, CAP.size, 900, -0.02 * CAP.size) / 2, y - CAP.size * 0.3); ctx.scale(pop, pop);
      ctx.fillText(w.w, -tw(ctx, w.w, DISPLAY, CAP.size, 900, -0.02 * CAP.size) / 2, CAP.size * 0.3); ctx.restore();
    }
    ctx.restore();
  }

  // =====================================================================
  // CENAS (a biblioteca). Cada uma: (ctx, sc, t, lt, u) — lt: segundos desde o início da cena; u: 0..1 ao longo dela.
  // =====================================================================
  const CENAS = {};

  // ---- titulo: o gancho (já inteiro no quadro 0), aproximação lenta, golpe na linha limão
  CENAS.titulo = {
    setup(sc) {
      const rows = sc.dados.linhas.map((l, i) => rich(l, C.white));
      sc.R = rows; sc.size = fitSize(M, rows, 880, 150);
      sc.ev.punch = at(sc, sc.dados.em, sc.palavras.find((w) => norm(w.w).startsWith('quanto'))?.t0 ?? sc.t0 + 1.3);
      CUES.push({ t: sc.t0, type: 'hook' }, { t: sc.ev.punch, type: 'punch' });
    },
    draw(ctx, sc, t, lt, u) {
      const s = sc.size, lh = s * 1.06, top = 640 - lh / 2;
      sc.R.forEach((row, i) => {
        ctx.save();
        const y = top + 0.727 * s + i * lh;
        if (i === 1) { const k = 1 + 0.05 * kick(t, sc.ev.punch, 0.3); ctx.translate(CX, y - 0.36 * s); ctx.scale(k, k); ctx.translate(-CX, -(y - 0.36 * s)); }
        drawRow(ctx, row, CX, y, s);
        ctx.restore();
      });
      // um respiro limão atrás do título
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CX, 700, 700, C.lime, 0.05 + 0.05 * kick(t, sc.ev.punch, 0.6)); ctx.restore();
    },
  };

  // ---- notinha: a nota impressa (linhas, total, caneta)
  const PAPER = { x: 125, w: 800, slot: 460, row: 100, top: 590 };
  CENAS.notinha = {
    setup(sc, i) {
      sc.N = receipt(i);
      const n = sc.N;
      n.linhas.forEach((l) => { if (l.at >= sc.t0) CUES.push({ t: l.at, type: 'print', d: 0.4 }); });
      if (n.total && n.total.at >= sc.t0) CUES.push({ t: n.total.at, type: 'print', d: 0.5, big: 1 });
      if (n.caneta && n.caneta.at >= sc.t0) CUES.push({ t: n.caneta.at, type: 'pen', d: 0.9 });
    },
    draw(ctx, sc, t, lt, u) {
      const N = sc.N, X = PAPER.x, Wd = PAPER.w;
      const rev = (a) => (a < 0 ? 1 : E.outCubic(p(t, a, a + 0.4)));
      // alturas: linhas, caneta, total (cada uma cresce com o "revelar": o papel sai da fenda)
      let y = PAPER.top;
      const rows = N.linhas.map((l) => { const r = rev(l.at), yy = y; y += PAPER.row * r; return { l, r, y: yy }; });
      const cr = N.caneta ? rev(N.caneta.at) : 0, cy = y; y += 128 * cr;
      const tr = N.total ? rev(N.total.at) : 0, ty = y; y += 132 * tr;
      const bottom = y + 38;
      ctx.save();
      // o papel pende da fenda (balança de leve)
      ctx.translate(X + Wd / 2, PAPER.slot); ctx.rotate(0.006 * Math.sin(t * 1.3)); ctx.translate(-(X + Wd / 2), -PAPER.slot);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
      ctx.beginPath(); ctx.moveTo(X, PAPER.slot + 10); ctx.lineTo(X + Wd, PAPER.slot + 10); ctx.lineTo(X + Wd, bottom);
      for (let k = 0; k <= 24; k++) { const xx = X + Wd - (k / 24) * Wd; ctx.lineTo(xx, bottom + (k % 2 ? 0 : 16)); }
      ctx.lineTo(X, bottom); ctx.closePath();
      ctx.fillStyle = C.paper; ctx.fill(); ctx.shadowColor = 'transparent';
      // fibras leves do papel térmico
      ctx.fillStyle = 'rgba(0,0,0,0.025)'; for (let k = 0; k < 40; k++) ctx.fillRect(X + hash(k, 3) * Wd, PAPER.slot + 20 + hash(k, 4) * (bottom - PAPER.slot), 1.4, 26 + 40 * hash(k, 5));
      ctx.save(); ctx.beginPath(); ctx.rect(X, PAPER.slot + 10, Wd, bottom + 20 - PAPER.slot); ctx.clip();
      rows.forEach(({ l, r, y: yy }) => {
        if (r <= 0.02) return;
        const dy = (1 - r) * -34, a = clamp(r * 1.6);
        txt(ctx, l.t, X + 40, yy + 62 + dy, { size: 40, weight: 800, color: C.paperInk, alpha: a, ls: 0.5 });
        txt(ctx, l.v, X + Wd - 40, yy + 62 + dy, { size: 40, weight: 800, color: C.paperInk, align: 'right', alpha: a });
        ctx.save(); ctx.globalAlpha = a * 0.5; ctx.strokeStyle = C.paperInk; ctx.lineWidth = 2; ctx.setLineDash([2, 9]); ctx.beginPath(); ctx.moveTo(X + 40, yy + 82 + dy); ctx.lineTo(X + Wd - 40, yy + 82 + dy); ctx.stroke(); ctx.restore();
      });
      // a linha à caneta: entra torta, o traço aparece da esquerda para a direita
      if (N.caneta && cr > 0.02) {
        const label = N.caneta.t, sz = 58;
        const wipe = N.caneta.at < 0 ? 1 : E.inOutCubic(p(t, N.caneta.at, N.caneta.at + 0.8));
        ctx.save(); ctx.translate(X + 46, cy + 92); ctx.rotate(-3.4 * DEG);
        ctx.transform(1, 0, -0.2, 1, 0, 0);
        setFont(ctx, DISPLAY, sz, 800, 'left', -0.5);
        const w = ctx.measureText(label).width;
        ctx.beginPath(); ctx.rect(-6, -sz, (w + 16) * wipe, sz * 1.5); ctx.clip();
        ctx.fillStyle = C.ink; ctx.fillText(label, 0, 0);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4, 12); ctx.quadraticCurveTo(w * 0.5, 20, w + 6, 10); ctx.stroke();
        ctx.restore();
      }
      if (N.total && tr > 0.02) {
        const ky = 1 + 0.04 * kick(t, N.total.at, 0.3) * (N.total.at < 0 ? 0 : 1);
        ctx.save(); ctx.translate(CX, ty + 58); ctx.scale(ky, ky); ctx.translate(-CX, -(ty + 58));
        rr(ctx, X + 26, ty + 6, Wd - 52, 104, 18); ctx.fillStyle = C.ink; ctx.globalAlpha = tr; ctx.fill();
        txt(ctx, N.total.t, X + 54, ty + 70, { size: 32, weight: 800, color: C.lime, alpha: tr, ls: 1 });
        txt(ctx, N.total.v, X + Wd - 54, ty + 72, { size: 46, weight: 800, color: C.lime, align: 'right', alpha: tr });
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
      // a fenda da impressora, acesa
      const flick = Math.max(...N.linhas.map((l) => kick(t, l.at, 0.3)), N.total ? kick(t, N.total.at, 0.3) : 0, N.caneta ? 0 : 0);
      rr(ctx, X - 30, PAPER.slot - 28, Wd + 60, 44, 22); ctx.fillStyle = '#141414'; ctx.fill(); ctx.strokeStyle = C.border; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = css(C.lime, 0.5 + 0.5 * flick); rr(ctx, X + 20, PAPER.slot - 2, Wd - 40, 5, 2.5); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CX, PAPER.slot, 520, C.lime, 0.05 + 0.1 * flick); ctx.restore();
    },
  };

  // ---- relogio: o relógio grande que salta para a hora + a pergunta que cresce
  CENAS.relogio = {
    fases(sc) { return [{ t0: sc.t0, ts: [sc.ev.ask - 0.1] }, { t0: sc.ev.ask, ts: [sc.t1 - 0.1] }]; },   // o relógio sozinho; depois a pergunta entra embaixo
    setup(sc) {
      sc.ev.jump = at(sc, sc.dados.em_hora, sc.t0 + 0.2);
      sc.ev.ask = at(sc, sc.dados.em_pergunta, sc.t0 + 1.2);
      CUES.push({ t: sc.ev.jump, type: 'jump' }, { t: sc.ev.ask, type: 'grow' });
    },
    draw(ctx, sc, t, lt, u) {
      const d = sc.dados, size = 290, SLOT = (() => { const ws = '0123456789'.split('').map((c) => tw(M, c, DISPLAY, size, 900, -0.02 * size)); return Math.max(...ws) * 0.98; })();
      const COLON = size * 0.26, total = 4 * SLOT + COLON, x0 = CX - total / 2, base = 570;
      const a = d.antes.replace(':', ''), b = d.hora.replace(':', '');
      const xs = [x0, x0 + SLOT, x0 + 2 * SLOT + COLON, x0 + 3 * SLOT + COLON];
      const after = t >= sc.ev.jump;
      const blink = after && Math.floor((t - sc.ev.jump) / 0.35) % 2 === 0;
      const col = after && !blink ? C.lime : C.white;
      ctx.save();
      if (after) { const k = 1 + 0.05 * kick(t, sc.ev.jump, 0.3); ctx.translate(CX, base - size * 0.36); ctx.scale(k, k); ctx.translate(-CX, -(base - size * 0.36)); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CX, base - size * 0.36, 620, C.lime, after ? 0.16 : 0.06); ctx.restore();
      for (let i = 0; i < 4; i++) {
        const ch = (after ? b : a)[i], old = a[i];
        const top = base - size * 0.78, hgt = size * 0.92;
        ctx.save(); ctx.beginPath(); ctx.rect(xs[i] - 10, top, SLOT + 20, hgt); ctx.clip();
        setFont(ctx, DISPLAY, size, 900, 'center', -0.02 * size); ctx.fillStyle = col;
        const cx = xs[i] + SLOT / 2;
        if (b[i] !== a[i] && t >= sc.ev.jump && t < sc.ev.jump + 0.3 + 0.05 * i) {
          const e = E.outCubic(p(t, sc.ev.jump + 0.05 * i, sc.ev.jump + 0.05 * i + 0.22));
          ctx.fillText(old, cx, base - e * size * 0.95); ctx.fillText(b[i], cx, base + (1 - e) * size * 0.95);
        } else ctx.fillText(ch, cx, base);
        ctx.restore();
      }
      const colonOn = (lt % 1) < 0.5 || after;
      ctx.fillStyle = css(col, colonOn ? 1 : 0.2);
      const cxx = x0 + 2 * SLOT + COLON / 2;
      rr(ctx, cxx - 17, base - size * 0.56, 34, 34, 7); ctx.fill(); rr(ctx, cxx - 17, base - size * 0.16, 34, 34, 7); ctx.fill();
      ctx.restore();
      // a pergunta cresce: 2 linhas, no maior corpo
      const q = (d.pergunta || '').split(' '), grow = E.outBack(p(t, sc.ev.ask, sc.ev.ask + 0.45), 1.5);
      if (grow > 0.01 && q.length) {
        const rows = q.length > 1 ? [rich(q[0], C.lime), rich(q.slice(1).join(' '), C.lime)] : [rich(q[0], C.lime)];
        const s = fitSize(M, rows, 820, 210), lh = s * 1.0;
        ctx.save(); ctx.translate(CX, 940); ctx.scale(grow, grow); ctx.translate(-CX, -940);
        rows.forEach((row, i) => drawRow(ctx, row, CX, 940 + i * lh - (rows.length - 1) * lh / 2 + 0.3 * s, s, clamp(grow * 2)));
        ctx.restore();
      }
    },
  };

  // ---- objetos: chips girando em volta de um contador de espera + carimbo
  CENAS.objetos = {
    setup(sc) {
      const d = sc.dados;
      sc.ev.chips = d.objetos.map((o, k) => at(sc, o.em, sc.t0 + 0.8 + 0.7 * k));
      sc.ev.marcos = (d.contador.marcos || []).map(([v, em], k) => [at(sc, em, sc.t0 + 1 + k), v]);
      sc.ev.stamp = d.carimbo ? at(sc, d.carimbo.em, sc.t1 - 1.4) : null;
      sc.ev.chips.forEach((t0) => CUES.push({ t: t0, type: 'orbit' }));
      sc.ev.marcos.forEach(([t0]) => CUES.push({ t: t0, type: 'mark' }));
      if (sc.ev.stamp !== null) CUES.push({ t: sc.ev.stamp - 0.15, type: 'stampfall' }, { t: sc.ev.stamp, type: 'stamp' });
      CUES.push({ t: sc.t0 + 0.1, type: 'ticks', d: (sc.ev.marcos.length ? sc.ev.marcos[sc.ev.marcos.length - 1][0] : sc.t1) - sc.t0 });
    },
    draw(ctx, sc, t, lt, u) {
      const d = sc.dados, cx = CX, cy = 690, R = 150;
      // o contador corre: 0 no começo da cena e, a cada marco, o valor da palavra (interpolado entre eles)
      const pts = [[sc.t0, 0], ...sc.ev.marcos];
      let v = 0;
      for (let i = 1; i < pts.length; i++) { if (t >= pts[i - 1][0]) v = lerp(pts[i - 1][1], pts[i][1], p(t, pts[i - 1][0], pts[i][0])); }
      if (t >= pts[pts.length - 1][0]) v = pts[pts.length - 1][1];
      const mm = String(Math.floor(v / 60)).padStart(2, '0'), ss = String(Math.floor(v % 60)).padStart(2, '0');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx, cy, 560, C.lime, 0.08); ctx.restore();
      // o miolo: o círculo do contador
      circle(ctx, cx, cy, R); ctx.fillStyle = C.card; ctx.fill(); ctx.strokeStyle = C.border; ctx.lineWidth = 3; ctx.stroke();
      const sweep = (v % 60) / 60;
      ctx.beginPath(); ctx.arc(cx, cy, R - 2, -Math.PI / 2, -Math.PI / 2 + TAU * sweep); ctx.strokeStyle = C.lime; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
      txt(ctx, `${mm}:${ss}`, cx, cy + 28, { fam: MONO, size: 86, weight: 800, color: C.white, align: 'center', ls: -2 });
      txt(ctx, 'ESPERANDO', cx, cy - 62, { size: 24, weight: 800, color: C.gray, align: 'center', ls: 5 });
      // os chips giram em volta (elipse), entram um a um com mola
      d.objetos.forEach((o, k) => {
        const t0 = sc.ev.chips[k]; if (t < t0) return;
        const e = E.outBack(p(t, t0, t0 + 0.4), 1.8), ang = (k / d.objetos.length) * TAU + (t - sc.t0) * 0.95 - 0.6;
        const x = cx + Math.cos(ang) * 285, y = cy + Math.sin(ang) * 300;
        const w = tw(M, o.t, MONO, 30, 800, 2) + 64;
        ctx.save(); ctx.translate(x, y); ctx.scale(e, e);
        rr(ctx, -w / 2, -44, w, 88, 44); ctx.fillStyle = '#151515'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.strokeStyle = css(C.lime, 0.4 + 0.6 * kick(t, t0, 0.5)); ctx.lineWidth = 3; ctx.stroke();
        circle(ctx, -w / 2 + 32, 0, 8); ctx.fillStyle = C.lime; ctx.fill();
        txt(ctx, o.t, -w / 2 + 50, 11, { size: 30, weight: 800, color: C.white, ls: 2 });
        ctx.restore();
      });
      // o carimbo: COBRADO R$ 450,00
      if (sc.ev.stamp !== null) {
        const ts = sc.ev.stamp - 0.15;
        if (t >= ts) {
          const uu = p(t, ts, sc.ev.stamp), e = E.inCubic(uu), x = t - sc.ev.stamp;
          let s = lerp(1.6, 1, e); if (x >= 0) s = 1 - 0.05 * Math.exp(-x / 0.05) * Math.cos(x * 60);
          const label = d.carimbo.t, w = tw(M, label, MONO, 50, 800, 1) + 84, h = 108, yy = 1050;
          ctx.save(); ctx.globalAlpha = p(uu, 0, 0.35); ctx.translate(CX, yy); ctx.rotate(lerp(-9, -4, e) * DEG); ctx.scale(s, s);
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40 * (1 - e) + 24; ctx.shadowOffsetY = 18 * (1 - e) + 8;
          rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = C.lime; ctx.fill(); ctx.shadowColor = 'transparent';
          txt(ctx, label, 0, 18, { size: 50, weight: 800, color: C.ink, align: 'center', ls: 1 });
          ctx.restore();
          if (x >= 0 && x < 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CX, yy, 420, C.lime, 0.22 * kick(t, sc.ev.stamp, 0.4)); ctx.restore(); }
        }
      }
    },
  };

  // ---- valor: o valor enorme em limão, a conta que fecha e o valor que cai
  CENAS.valor = {
    fases(sc) { const q = sc.ev.queda !== null ? sc.ev.queda - 0.1 : sc.t1 - 0.1; return [{ t0: sc.t0, ts: [q - 0.4, q] }]; },   // a medida é antes da queda
    setup(sc) {
      const d = sc.dados;
      sc.ev.v = at(sc, d.em, sc.t0 + 0.8);
      sc.ev.cai = d.cai ? at(sc, d.cai.em, sc.t0 + 3) : null;
      sc.ev.queda = d.cai ? at(sc, d.cai.queda || 'balcão', sc.t1 - 0.8) : null;
      CUES.push({ t: sc.ev.v, type: 'slam' });
      if (sc.ev.cai !== null) CUES.push({ t: sc.ev.cai, type: 'pop' }, { t: sc.ev.queda, type: 'fall', d: 0.7 });
    },
    draw(ctx, sc, t, lt, u) {
      const d = sc.dados, tl = t - sc.ev.v;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CX, 640, 700, C.lime, tl >= 0 ? 0.1 + 0.12 * kick(t, sc.ev.v, 0.7) : 0.03); ctx.restore();
      // a conta (primeiro apagada, depois acesa quando o valor bate): as linhas em mono
      (d.conta || []).forEach((ln, k) => {
        const a = p(t, sc.ev.v + 0.35 + 0.35 * k, sc.ev.v + 0.7 + 0.35 * k);
        txt(ctx, ln, CX, 905 + k * 52, { size: 33, weight: 800, color: k === 1 ? C.lime : C.gray, align: 'center', ls: 1, alpha: a });
      });
      if (tl >= 0) {
        const sz = fitSize(M, [rich(d.valor, C.lime)], 830, 240), e = E.outBack(p(t, sc.ev.v, sc.ev.v + 0.35), 2.2), k = lerp(1.5, 1, E.outExpo(p(t, sc.ev.v, sc.ev.v + 0.3))) * (e > 0 ? 1 : 0);
        ctx.save(); ctx.translate(CX, 640); ctx.scale(k, k); ctx.translate(-CX, -640);
        drawRow(ctx, rich(d.valor, C.lime), CX, 640 + 0.36 * sz, sz, clamp(tl * 12));
        ctx.restore();
        txt(ctx, 'A CONTA CERTA', CX, 440, { size: 30, weight: 800, color: C.gray, align: 'center', ls: 6, alpha: clamp(tl * 6) });
      } else txt(ctx, 'A CONTA CERTA', CX, 440, { size: 30, weight: 800, color: C.gray, align: 'center', ls: 6, alpha: 0.9 });
      // o valor que cai: aparece, e depois cai pela parte de baixo, acelerando
      if (sc.ev.cai !== null && t >= sc.ev.cai) {
        const g = Math.max(0, t - sc.ev.queda), sz = 124, pop = E.outBack(p(t, sc.ev.cai, sc.ev.cai + 0.3), 2), fy = 1400 * g * g * 2.2 + 60 * g;
        const y = 1090 + fy, rot = (-3 - 14 * Math.min(1, g * 1.6)) * DEG;
        ctx.save(); ctx.translate(CX, y); ctx.rotate(rot); ctx.scale(pop, pop);
        const w = tw(M, d.cai.t, MONO, sz * 0.82, 800, 0) + 70;
        rr(ctx, -w / 2, -sz * 0.62, w, sz * 1.14, 26); ctx.fillStyle = C.card; ctx.fill(); ctx.strokeStyle = C.border; ctx.lineWidth = 3; ctx.stroke();
        txt(ctx, d.cai.t, 0, sz * 0.3, { size: sz * 0.82, weight: 800, color: C.white, align: 'center' });
        ctx.restore();
      }
    },
  };

  // ---- pergunta: uma pergunta grande que cresce, palavra a palavra
  CENAS.pergunta = {
    setup(sc) { sc.ev.words = (sc.dados.texto.split(' ')).map((w, k) => at(sc, w, sc.t0 + 0.2 + 0.4 * k)); CUES.push({ t: sc.t0 + 0.1, type: 'grow' }); },
    draw(ctx, sc, t, lt, u) {
      const ws = sc.dados.texto.split(' '), n = ws.length;
      const rows = ws.map((w) => rich(w, C.white)); rows[n - 1] = rich(ws[n - 1], C.lime);
      const s = fitSize(M, rows, 820, 200), lh = s * 1.0;
      ws.forEach((w, k) => {
        const e = E.outBack(p(t, sc.ev.words[k], sc.ev.words[k] + 0.4), 1.6); if (e <= 0.01) return;
        const y = 700 + k * lh - (n - 1) * lh / 2 + 0.3 * s;
        ctx.save(); ctx.translate(CX, y - s * 0.3); ctx.scale(e, e); ctx.translate(-CX, -(y - s * 0.3)); drawRow(ctx, rows[k], CX, y, s, clamp(e * 2)); ctx.restore();
      });
    },
  };

  // ---- riscada: uma linha riscada e a correta embaixo
  CENAS.riscada = {
    setup(sc) { sc.ev.cut = at(sc, sc.dados.em_risca, sc.t0 + 1); sc.ev.new = at(sc, sc.dados.em_nova, sc.t0 + 2); CUES.push({ t: sc.ev.cut, type: 'pen', d: 0.5 }, { t: sc.ev.new, type: 'slam' }); },
    draw(ctx, sc, t, lt, u) {
      const d = sc.dados, a = rich(d.riscado, C.gray), s = fitSize(M, [a], 840, 130);
      drawRow(ctx, a, CX, 560, s);
      const w = rowW100(M, a) * s / 100, k = E.inOutCubic(p(t, sc.ev.cut, sc.ev.cut + 0.35));
      ctx.strokeStyle = C.lime; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(CX - w / 2 - 14, 560 - s * 0.3); ctx.lineTo(CX - w / 2 - 14 + (w + 28) * k, 560 - s * 0.3 - 8 * k); ctx.stroke();
      const e = E.outBack(p(t, sc.ev.new, sc.ev.new + 0.4), 1.8);
      if (e > 0.01) { const b = rich(d.certo, C.lime), s2 = fitSize(M, [b], 840, 190); ctx.save(); ctx.translate(CX, 820); ctx.scale(e, e); ctx.translate(-CX, -820); drawRow(ctx, b, CX, 820 + 0.36 * s2, s2, clamp(e * 2)); ctx.restore(); }
    },
  };

  // ---- contador: um contador de tempo grande que corre
  CENAS.contador = {
    setup(sc) { CUES.push({ t: sc.t0 + 0.1, type: 'ticks', d: sc.t1 - sc.t0 - 0.2 }); },
    draw(ctx, sc, t, lt, u) {
      const d = sc.dados, v = lerp(d.de || 0, d.ate || 150, p(t, sc.t0, sc.t1)), mm = String(Math.floor(v / 60)).padStart(2, '0'), ss = String(Math.floor(v % 60)).padStart(2, '0');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CX, 640, 620, C.lime, 0.08); ctx.restore();
      txt(ctx, `${mm}:${ss}`, CX, 720, { fam: MONO, size: 250, weight: 800, color: C.white, align: 'center', ls: -6 });
      txt(ctx, d.rotulo || 'ESPERANDO', CX, 430, { size: 32, weight: 800, color: C.lime, align: 'center', ls: 8 });
    },
  };

  // ---- virada: a frase de virada, sozinha na tela, com movimento lento
  CENAS.virada = {
    setup(sc) { sc.rows = sc.dados.linhas.map((l, i) => rich(l, C.white)); sc.size = fitSize(M, sc.rows, 840, 118); CUES.push({ t: sc.t0 + 0.05, type: 'rise' }); },
    draw(ctx, sc, t, lt, u) {
      const s = sc.size, lh = s * 1.08, top = 700 - lh * (sc.rows.length - 1) / 2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CX, 720, 640, C.lime, 0.05 + 0.03 * Math.sin(lt * 1.2)); ctx.restore();
      sc.rows.forEach((row, i) => {
        const pin = E.outExpo(p(lt, 0.08 + 0.12 * i, 0.5 + 0.12 * i)), y = top + 0.727 * s + i * lh;
        ctx.save(); ctx.beginPath(); ctx.rect(CX - 480, y - s * 1.05, 960, s * 1.4); ctx.clip();
        drawRow(ctx, row, CX, y + (1 - pin) * s * 1.3, s); ctx.restore();
      });
    },
  };

  // ---- fecho: a marca (logo + sineta)
  CENAS.fecho = {
    setup(sc) { sc.ev.bell = Math.max(sc.t0 + 0.4, sc.voz_t1 - 0.45); CUES.push({ t: sc.t0 + 0.15, type: 'logoin' }, { t: sc.ev.bell, type: 'bell' }); },
    draw(ctx, sc, t, lt, u) {
      const e = E.outBack(p(lt, 0.15, 0.6), 2.0), bt = t - sc.ev.bell, D = 300;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CX, 620, 560, C.lime, 0.1 + 0.3 * kick(t, sc.ev.bell, 0.7)); ctx.restore();
      if (bt >= 0) { const ru = p(bt, 0, 0.9); if (ru < 1) { circle(ctx, CX, 620, lerp(D * 0.5, 340, E.outExpo(ru))); ctx.strokeStyle = css(C.lime, 1 - ru); ctx.lineWidth = 9 * (1 - ru) + 1; ctx.stroke(); } }
      logo(ctx, CX, 620, D * lerp(0.7, 1, e) * (1 + 0.03 * kick(t, sc.ev.bell, 0.4)), clamp(e * 2));
      const NS = 96, w1 = tw(M, 'FAZLO ', DISPLAY, NS, 900, -2.4), w2 = tw(M, 'Hospeda', DISPLAY, NS, 700, -2.4), nx = CX - (w1 + w2) / 2, pin = E.outExpo(p(bt, 0, 0.5));
      if (bt >= -0.05) {
        ctx.save(); ctx.beginPath(); ctx.rect(CX - 480, 770, 960, 190); ctx.clip();
        txt(ctx, 'FAZLO ', nx, 900 + (1 - pin) * 130, { fam: DISPLAY, size: NS, weight: 900, color: C.white, ls: -2.4 });
        txt(ctx, 'Hospeda', nx + w1, 900 + (1 - pin) * 130, { fam: DISPLAY, size: NS, weight: 700, color: C.lime, ls: -2.4 });
        ctx.restore();
      }
    },
  };

  // =====================================================================
  // QUADRO
  // =====================================================================
  function background(ctx, t, sc) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 760, 0, 540, 760, 1200);
    g.addColorStop(0, '#141513'); g.addColorStop(0.55, '#0E0F0E'); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // poeira limão subindo devagar (só em x < 945: fora da coluna de botões)
    for (let i = 0; i < 26; i++) {
      const x = 40 + hash(i, 11) * 880, sp = 14 + hash(i, 12) * 26, y = H - ((t * sp + hash(i, 13) * H) % H);
      ctx.fillStyle = css(C.lime, 0.05 + 0.1 * hash(i, 14)); circle(ctx, x + Math.sin(t * 0.7 + i) * 10, y, 1.6 + 2.4 * hash(i, 15)); ctx.fill();
    }
  }
  function sceneAt(t) { for (let i = SC.length - 1; i >= 0; i--) if (t >= SC[i].t0) return SC[i]; return SC[0]; }

  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const sc = sceneAt(t), i = sc.n - 1, lt = t - sc.t0, dur = sc.t1 - sc.t0, u = clamp(lt / dur);
    background(ctx, t, sc);
    ctx.save();
    // nada passa pela coluna de botões do Reels (x ≥ 950, y 1060–1560)
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(950, 1060, 130, 500); ctx.clip('evenodd');
    // e o conteúdo da cena fica entre y 265 e 1456 (o que cai, sai por baixo desse limite)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 265, W, 1456 - 265); ctx.clip();
    // a câmera: aproximação e subida lentas ao longo da cena (nada fica parado)
    const cont = sc.dados.herda !== undefined && sc.dados.herda !== null;
    const z = 1 + 0.045 * (cont ? E.inOutSine(clamp((t - SC[sc.dados.herda]?.t0) / 12)) : u), dy = -34 * (cont ? clamp((t - SC[sc.dados.herda].t0) / 12) : u);
    ctx.save(); ctx.translate(CX, 760 + dy); ctx.scale(z, z); ctx.translate(-CX, -760);
    // a entrada da cena: um golpe curto (zoom de 3%), exceto quando a nota continua
    const pun = cont || sc.n === 1 ? 0 : 0.03 * (1 - E.outCubic(p(lt, 0, 0.22)));
    if (pun) { ctx.translate(CX, 760); ctx.scale(1 + pun, 1 + pun); ctx.translate(-CX, -760); }
    ctx.translate(0, offsetAt(sc, t));
    CENAS[sc.tipo].draw(ctx, sc, t, lt, u);
    ctx.restore();
    // a troca de cena: uma barra limão varre o quadro (só em x < 945), exceto quando a nota continua
    if (!cont && sc.n > 1) {
      const sw = p(lt, 0, 0.2);
      if (sw > 0 && sw < 1) { const x = lerp(-60, 945, E.outCubic(sw)); ctx.fillStyle = css(C.lime, 0.9 * (1 - sw)); ctx.fillRect(Math.max(0, x - 38), 300, Math.min(x, 945) - Math.max(0, x - 38) + 0.1, 940); }
    }
    ctx.restore();
    // a legenda: sem painel, só sombra suave
    caption(ctx, t);
    ctx.restore();
    // o fade para o preto no fim
    const f = p(t, DUR - LN.fade_final, DUR);
    if (f > 0) { ctx.fillStyle = css('#000000', f); ctx.fillRect(0, 0, W, H); }
  }

  function shutterSpec(t) { for (const [a, b, k, dt] of FAST) if (t >= a && t < b) return { k, dt }; return { k: 1 }; }
  let bufS = null, bufA = null;
  function renderAt(ctx, t, o = {}) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    t = clamp(t, 0, DUR - 1e-4);
    const sh = o.noBlur ? { k: 1 } : shutterSpec(t);
    if (sh.k <= 1) { frame(ctx, t); return; }
    if (!bufS) { const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }; bufS = mk(); bufA = mk(); }
    const sctx = bufS.getContext('2d'), actx = bufA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < sh.k; k++) {
      frame(sctx, clamp(t + (k / (sh.k - 1) - 0.5) * sh.dt, 0, DUR - 1e-4));
      actx.globalAlpha = 1 / (k + 1); actx.drawImage(bufS, 0, 0);
    }
    actx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(bufA, 0, 0);
  }

  // centraliza cada cena na faixa livre: mede, no estado assentado, onde o conteúdo começa e termina (em y)
  // e desloca a cena (e as que continuam a mesma nota) para o centro da faixa
  function medeCenas() {
    const cv = document.createElement('canvas'); cv.width = W / 2; cv.height = H / 2;
    const c = cv.getContext('2d', { willReadFrequently: true });
    const mede = (sc, tempos) => {
      let lo = 1e9, hi = -1;
      tempos.forEach((t) => {
        c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.scale(0.5, 0.5);
        CENAS[sc.tipo].draw(c, sc, t, t - sc.t0, (t - sc.t0) / (sc.t1 - sc.t0));
        c.setTransform(1, 0, 0, 1, 0, 0);
        const d = c.getImageData(0, 0, cv.width, cv.height).data;
        for (let y = 0; y < cv.height; y++) { let on = false; for (let x = 0; x < cv.width; x += 2) if (d[(y * cv.width + x) * 4 + 3] > 200) { on = true; break; } if (on) { lo = Math.min(lo, y * 2); hi = Math.max(hi, y * 2 + 2); } }
      });
      return [lo, hi];
    };
    // cada cena é centrada pelo próprio conteúdo assentado. Uma cena pode ter fases (CENAS.x.fases): o conteúdo muda de
    // tamanho no meio dela (ex.: a pergunta que entra embaixo do relógio) e o conjunto desliza para o novo centro.
    SC.forEach((sc, i) => {
      const fases = CENAS[sc.tipo].fases ? CENAS[sc.tipo].fases(sc) : [{ t0: sc.t0, ts: [0.6, 0.8, 0.98].map((f) => sc.t0 + f * (sc.t1 - sc.t0)) }];
      const cont = sc.dados.herda !== undefined && sc.dados.herda !== null && i;
      let prev = cont ? SC[i - 1].off : null;
      sc.fases = fases.map((f) => {
        const bb = mede(sc, f.ts), off = Math.round((FAIXA.y0 + FAIXA.y1) / 2 - (bb[0] + bb[1]) / 2);
        const r = { t0: f.t0, off, prev: prev === null ? off : prev, bbox: bb }; prev = off; return r;
      });
      sc.off = sc.fases[sc.fases.length - 1].off; sc.bboxGrupo = sc.fases[sc.fases.length - 1].bbox;
    });
  }
  function offsetAt(sc, t) {
    let v = sc.fases[0].prev;
    for (const f of sc.fases) { if (t < f.t0) break; v = lerp(f.prev, f.off, E.outCubic(p(t, f.t0, f.t0 + 0.6))); }
    return v;
  }

  function init(img, linha) {
    LOGO = img; LN = linha; DUR = linha.duracao; CUES = []; FAST = [];
    SC = linha.cenas.map((c) => ({ ...c, ev: {} }));
    W100.clear();
    SC.forEach((sc, i) => {
      if (!CENAS[sc.tipo]) throw new Error('tipo de cena desconhecido: ' + sc.tipo);
      sc.palavras.forEach((w) => { w.w = smart(w.w); });
    });
    layoutPages(); encadeiaPaginas();
    SC.forEach((sc, i) => {
      const cont = sc.dados.herda !== undefined && sc.dados.herda !== null;
      CUES.push({ t: sc.t0, type: i && !cont ? 'trans' : 'start' });
      if (i && !cont) FAST.push([sc.t0, sc.t0 + 0.2, 4, 1 / 120]);
      CENAS[sc.tipo].setup(sc, i);
    });
    CUES.push({ t: DUR - LN.fade_final, type: 'fade', d: LN.fade_final });
    CUES.sort((a, b) => a.t - b.t);
    medeCenas();
  }

  window.FALA = {
    init, renderAt, W, H,
    get DURATION() { return DUR; },
    cues: () => ({ duration: DUR, cenas: SC.map((s) => ({ n: s.n, tipo: s.tipo, t0: s.t0, t1: s.t1, voz_t0: s.voz_t0, voz_t1: s.voz_t1, ev: s.ev })), cues: CUES.map((c) => ({ ...c, t: Math.round(c.t * 1e4) / 1e4 })) }),
    palavras: () => SC.flatMap((s) => s.palavras.map((w) => ({ cena: s.n, w: w.w, t0: w.t0, t1: w.t1, chave: w.chave }))),
    legenda: () => PAGES.map((q) => ({ cena: q.sc, t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.w).join(' ')),
      palavras: Array.from({ length: q.b - q.a }, (_, i) => { const k = q.a + i, ps = q.pos[k]; return { w: q.words[k].w, t0: q.words[k].t0, x: ps.x, w_px: tw(M, q.words[k].w, DISPLAY, CAP.size, 900, -0.02 * CAP.size), y: CAP.y1 + (q.nrows === 1 ? CAP.lh / 2 : 0) + ps.row * CAP.lh }; }) })),
    medidas: () => SC.map((s) => ({ n: s.n, tipo: s.tipo, fases: s.fases.map((f) => ({ t0: f.t0, bbox: f.bbox, off: f.off, topo: f.bbox[0] + f.off, base: f.bbox[1] + f.off })) })),
    CAP, C, DISPLAY, MONO, fitSize, rich, drawRow, rowW100, tw, txt, glow, smart, M,
  };
})();
