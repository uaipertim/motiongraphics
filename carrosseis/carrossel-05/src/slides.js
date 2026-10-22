/* =====================================================================
   FAZLO Hospeda — CARROSSEL 05 · Pilar DICA
   "Fechamento do caixa do dia" — 8 slides 1080x1350 (4:5)

   O mesmo modelo dos Carrosséis 01 a 04: fundo #0A0A0A, limão #AFFA27,
   Inter Display 900 nos títulos, JetBrains Mono NL nos chips e dados, cards
   #161616 com borda #3A3A3A. Sem telas do sistema, sem CTA de venda e sem
   emojis. Capa LIMÃO com texto preto. Margem de 80 px nas laterais.
   Mecânicas: trilha de passos (slides 3–7), cards rotulados (um em destaque
   limão; [campos] em mono), a notinha de caixa com o selo carimbado e chips grandes.

   CARROSSEL.render(ctx, n)  desenha o slide n (1–8)
   window.__LINHAS           as linhas de texto de cada slide (para a revisão:
                             nenhuma palavra sozinha numa linha)
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1350, M = 80, CW = W - 2 * M;          // área útil: x 80–1000
  const DISPLAY = "'C1 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'C1 Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#0A0A0A', bg0: '#050505', card: '#161616', border: '#3A3A3A',
    lime: '#AFFA27', limeD: '#8CD10C', limeDeep: '#5A8A0E', white: '#FFFFFF', gray: '#B9B9B1', grayM: '#8E8E88', grayD: '#5E5E59', ink: '#0A0A0A',
  };
  const L = { trackY: 120, titleTop: 196, titleTop0: 164, titleMaxH: 360, supportBottom: 1252 };
  const TRACK = 34;                      // trilha de passos (mono)
  const SUPPORT = 40;                    // apoio (Inter Display 600, cinza)

  // ---------------------------------------------------------------- utilitários
  const TAU = Math.PI * 2;
  function hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); }
  function setFont(ctx, fam, size, weight, ls = 0, align = 'left') {
    ctx.font = `${weight} ${size}px ${fam}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px';
  }
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, ls); return ctx.measureText(s).width; }

  // texto rico com quebra automática: segs = [{ t, c, br }] (br = começa em linha nova)
  function wrap(ctx, segs, font, maxW) {
    const words = [];
    segs.forEach((s) => s.t.split(' ').filter(Boolean).forEach((w, i) => words.push({ t: w, c: s.c, br: !!s.br && i === 0 })));
    const sp = tw(ctx, ' ', font.fam, font.size, font.weight, font.ls);
    const lines = [];
    let cur = [], cw = 0;
    for (const w of words) {
      const ww = tw(ctx, w.t, font.fam, font.size, font.weight, font.ls);
      if (cur.length && (w.br || cw + sp + ww > maxW)) { lines.push({ words: cur, w: cw }); cur = []; cw = 0; }
      cur.push(Object.assign({ w: ww }, w)); cw += (cur.length > 1 ? sp : 0) + ww;
    }
    if (cur.length) lines.push({ words: cur, w: cw });
    return { lines, sp };
  }
  const LINHAS = [];
  // uma linha de palavra única só é intencional se o roteiro quebrou ali (br) ou se é a 1ª e a seguinte começa em br
  function anota(tag, lines) {
    lines.forEach((ln, i) => {
      const w = ln.words;
      const sozinha = w.length === 1 && lines.length > 1 && (i === 0 ? !(lines[1].words[0].br) : !w[0].br);
      LINHAS.push({ tag, texto: w.map((x) => (x.t !== undefined ? x.t : x.runs.map((r) => r.t).join(''))).join(' '), sozinha });
    });
  }
  // há uma linha com uma palavra só, vinda da quebra automática (não de uma quebra do roteiro)?
  const orfa = (wr) => wr.lines.length > 1 && wr.lines.some((ln, i) => ln.words.length === 1 && (i === 0 ? !wr.lines[1].words[0].br : !ln.words[0].br));
  function drawLines(ctx, wr, font, x, y0, lh, align = 'left') {
    anota('texto', wr.lines);
    setFont(ctx, font.fam, font.size, font.weight, font.ls);
    wr.lines.forEach((ln, i) => {
      let x0 = align === 'center' ? x - ln.w / 2 : align === 'right' ? x - ln.w : x;
      ln.words.forEach((w) => { ctx.fillStyle = w.c; ctx.fillText(w.t, x0, y0 + i * lh); x0 += w.w + wr.sp; });
    });
  }
  // título: o maior corpo em que o texto cabe na caixa
  function title(ctx, segs, top, o = {}) {
    const maxW = o.maxW || CW, maxH = o.maxH || L.titleMaxH, lh = o.lh || 1.04;
    let size = o.max || 104, wr;
    for (; size >= (o.min || 56); size -= 2) {
      wr = wrap(ctx, segs, { fam: DISPLAY, size, weight: 900, ls: -0.03 * size }, maxW);
      if (wr.lines.length * size * lh <= maxH && wr.lines.every((l) => l.w <= maxW) && (!o.lines || wr.lines.length <= o.lines) && !orfa(wr)) break;
    }
    const font = { fam: DISPLAY, size, weight: 900, ls: -0.03 * size };
    if (o.vcenter) top = (o.vcenter[0] + o.vcenter[1]) / 2 - (size * 0.727 + (wr.lines.length - 1) * size * lh + size * 0.24) / 2;
    const base = top + size * 0.727;
    drawLines(ctx, wr, font, o.x || M, base, size * lh, o.align);
    return { size, top, bottom: base + (wr.lines.length - 1) * size * lh + size * 0.24, lines: wr.lines.length };
  }
  // text: uma frase (quebra automática) ou uma lista de linhas (quebra definida, para não deixar palavra sozinha)
  function support(ctx, text, o = {}) {
    const size = o.size || SUPPORT, lh = size * 1.32;
    const font = { fam: DISPLAY, size, weight: 600, ls: -0.005 * size };
    const segs = (Array.isArray(text) ? text : [text]).map((t, i) => ({ t, c: o.color || C.gray, br: i > 0 }));
    // a quebra do apoio nunca deixa uma palavra sozinha na última linha: estreita a caixa até equilibrar
    let wr = wrap(ctx, segs, font, o.maxW || CW);
    for (let mw = (o.maxW || CW) - 20; orfa(wr) && mw > 400; mw -= 20) wr = wrap(ctx, segs, font, mw);
    const first = (o.bottom || L.supportBottom) - (wr.lines.length - 1) * lh - size * 0.22;
    drawLines(ctx, wr, font, o.x || M, first, lh, o.align);
    return { top: first - size * 0.75 };
  }
  function chip(ctx, x, cy, text, o = {}) {
    const size = o.size || 30, ls = o.ls ?? size * 0.06, padX = o.padX ?? size * 0.75, h = o.h || size * 1.9;
    const w = tw(ctx, text, MONO, size, 800, ls) - ls + 2 * padX + (o.icon ? size * 1.05 : 0);
    const left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    rr(ctx, left, cy - h / 2, w, h, h / 2);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2.5; ctx.stroke(); }
    let tx = left + padX;
    if (o.icon) { ctx.save(); ctx.translate(tx + size * 0.38, cy); o.icon(ctx, size); ctx.restore(); tx += size * 1.05; }
    setFont(ctx, MONO, size, 800, ls); ctx.fillStyle = o.color || C.white; ctx.fillText(text, tx, cy + size * 0.36);
    return { left, w };
  }
  const checkIcon = (color) => (ctx, size) => {
    ctx.strokeStyle = color; ctx.lineWidth = size * 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-size * 0.32, 0); ctx.lineTo(-size * 0.08, size * 0.26); ctx.lineTo(size * 0.36, -size * 0.28); ctx.stroke();
  };
  function card(ctx, x, y, w, h, o = {}) {
    rr(ctx, x, y, w, h, o.r ?? 26);
    ctx.fillStyle = o.fill || C.card; ctx.fill();
    ctx.save(); if (o.dash) ctx.setLineDash(o.dash);
    ctx.strokeStyle = o.stroke || C.border; ctx.lineWidth = o.lw || 2; ctx.stroke(); ctx.restore();
  }

  // ---------------------------------------------------------------- fundo e trilha de passos
  function background(ctx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 760, 0, 540, 760, 1000);
    g.addColorStop(0, '#131412'); g.addColorStop(0.6, C.bg); g.addColorStop(1, C.bg0);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const l = ctx.createRadialGradient(540, 1350, 0, 540, 1350, 700);
    l.addColorStop(0, rgba(C.lime, 0.05)); l.addColorStop(1, rgba(C.lime, 0));
    ctx.fillStyle = l; ctx.fillRect(0, 0, W, H);
  }
  function track(ctx, step) {
    // casas de largura fixa: os números ficam no mesmo lugar em todos os slides e a pílula do passo atual
    // (o fundo limão) nunca passa da margem
    const y = L.trackY, pad = 14, gap = 34;
    let x = M;
    for (let i = 1; i <= 5; i++) {
      const s = String(i).padStart(2, '0'), w = tw(ctx, s, MONO, TRACK, 800, 1) - 1;
      if (i === step) {
        rr(ctx, x, y - TRACK * 0.75, w + 2 * pad, TRACK * 1.5, TRACK * 0.75); ctx.fillStyle = C.lime; ctx.fill();
      }
      setFont(ctx, MONO, TRACK, 800, 1); ctx.fillStyle = i === step ? C.ink : C.grayD; ctx.fillText(s, x + pad, y + TRACK * 0.36);
      x += w + 2 * pad;
      if (i < 5) { ctx.fillStyle = C.grayD; ctx.beginPath(); ctx.arc(x + gap / 2, y, 3.2, 0, TAU); ctx.fill(); x += gap; }
    }
  }

  // ---------------------------------------------------------------- bolha (mensagem do dono da pousada)
  // genérica, no DNA da marca: limão com texto preto; [campos] marcados para preencher
  function bubble(ctx, text, o) {
    const size = o.size || 40, lh = size * 1.3, padX = 44, padY = 36, maxW = o.maxW || 860;
    const font = { fam: DISPLAY, size, weight: 700, ls: -0.01 * size };
    const phSize = size * 0.84;
    // palavras com trechos [campo] em mono
    const sp = tw(ctx, ' ', font.fam, size, 700, font.ls);
    const NB = '\u00A0';                                  // [campos com espaços] não quebram no meio
    const words = text.replace(/\[[^\]]+\]/g, (m) => m.replace(/ /g, NB)).split(' ').filter(Boolean).map((wd) => {
      const parts = wd.replace(new RegExp(NB, 'g'), ' ').split(/(\[[^\]]+\])/).filter(Boolean);
      const runs = parts.map((r, i) => {
        const ph = /^\[.*\]$/.test(r);
        if (!ph) return { t: r, ph, w: tw(ctx, r, font.fam, size, 700, font.ls) };
        // pontuação colada no campo ("[nome]!", "[X]%", "[chave]."): a caixa do campo fecha 3 px depois do
        // fim desenhado do "]" (sem a folga lateral da fonte mono) e a pontuação vem logo em seguida
        const glued = i + 1 < parts.length;
        setFont(ctx, MONO, phSize, 800);
        const ink = ctx.measureText(r).actualBoundingBoxRight;
        const w = glued ? 8 + ink + 3 : tw(ctx, r, MONO, phSize, 800) + 16;
        return { t: r, ph, w, box: w };
      });
      return { runs, w: runs.reduce((a, r) => a + r.w, 0) };
    });
    const lines = [];
    let cur = [], cw = 0;
    for (const w of words) {
      if (cur.length && cw + sp + w.w > maxW - 2 * padX) { lines.push({ words: cur, w: cw }); cur = []; cw = 0; }
      cur.push(w); cw += (cur.length > 1 ? sp : 0) + w.w;
    }
    if (cur.length) lines.push({ words: cur, w: cw });
    anota('bolha', lines.map((l, i) => ({ words: l.words.map((w) => ({ t: w.runs.map((r) => r.t).join(''), br: false })) })));
    const bw = Math.max(...lines.map((l) => l.w)) + 2 * padX, bh = lines.length * lh + 2 * padY - (lh - size * 1.12);
    const x1 = o.right, x0 = x1 - bw, y0 = o.vcenter ? (o.vcenter[0] + o.vcenter[1]) / 2 - bh / 2 + (o.label ? 20 : 0) : o.top;
    // etiqueta
    if (o.label) { setFont(ctx, MONO, 26, 800, 3, 'right'); ctx.fillStyle = C.grayM; ctx.fillText(o.label, x1, y0 - 22); }
    // corpo + rabicho no canto de baixo à direita (dentro da margem)
    ctx.save();
    ctx.shadowColor = rgba(C.lime, 0.22); ctx.shadowBlur = 50;
    ctx.beginPath(); ctx.roundRect(x0, y0, bw, bh, [40, 40, 10, 40]);
    ctx.moveTo(x1 - 2, y0 + bh - 34); ctx.quadraticCurveTo(x1 + 4, y0 + bh + 2, x1 + 18, y0 + bh + 14);
    ctx.quadraticCurveTo(x1 - 22, y0 + bh + 10, x1 - 40, y0 + bh - 2);
    ctx.fillStyle = C.lime; ctx.fill();
    ctx.restore();
    let y = y0 + padY + size * 0.86;
    lines.forEach((ln) => {
      let x = x0 + padX;
      ln.words.forEach((w) => {
        w.runs.forEach((r) => {
          if (r.ph) {
            rr(ctx, x, y - phSize * 0.98, r.box, phSize * 1.32, 10); ctx.fillStyle = 'rgba(10,10,10,0.13)'; ctx.fill();
            setFont(ctx, MONO, phSize, 800); ctx.fillStyle = C.ink; ctx.fillText(r.t, x + 8, y - 1);
          } else {
            setFont(ctx, font.fam, size, 700, font.ls); ctx.fillStyle = C.ink; ctx.fillText(r.t, x, y);
          }
          x += r.w;
        });
        x += sp;
      });
      y += lh;
    });
    return { x0, x1: x1 + 18, y0, y1: y0 + bh + 14 };
  }

  // "ARRASTA →" alinhado à margem direita (x 1000): letras posicionadas uma a uma (espaçamento fixo de 4 px,
  // sem depender do letter-spacing do navegador) e a seta com folga de 26 px depois do texto
  function swipe(ctx, textColor, arrowColor) {
    const right = M + CW, aw = 64, gap = 26, y = 1252, size = 34, sp = 4;
    setFont(ctx, MONO, size, 800, 0);
    const chars = [...'ARRASTA'], ws = chars.map((ch) => ctx.measureText(ch).width);
    const textW = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    let x = right - 3 - aw - gap - textW;               // a ponta da seta (com a espessura do traço) em x = 1000
    ctx.fillStyle = textColor;
    chars.forEach((ch, i) => { ctx.fillText(ch, x, y); x += ws[i] + sp; });
    const ax = right - 3;
    ctx.strokeStyle = arrowColor; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ax - aw, 1240); ctx.lineTo(ax, 1240); ctx.moveTo(ax - 20, 1222); ctx.lineTo(ax, 1240); ctx.lineTo(ax - 20, 1258); ctx.stroke();
  }

  // ---------------------------------------------------------------- logo
  let LOGO = null;
  function brand(ctx, cx, cy, d = 72, fs = 30) {
    const gap = 14, ww = tw(ctx, 'FAZLO Hospeda', DISPLAY, fs, 900, -0.75), total = d + gap + ww, x0 = cx - total / 2;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, x0, cy - d / 2, d, d);
    setFont(ctx, DISPLAY, fs, 900, -0.75); ctx.fillStyle = C.white; ctx.fillText('FAZLO Hospeda', x0 + d + gap, cy + fs * 0.36);
    ctx.restore();
  }

  // =====================================================================
  // OS SLIDES
  // =====================================================================
  const W_ = C.white, Li = C.lime, INK = C.ink;
  const mid = (t, sp) => (t.bottom + sp.top) / 2;          // centro da faixa de conteúdo

  // a escala gravada ao fundo da capa limão (a mesma do Carrossel 01, do cartão "Controle de caixa" do Reel 03)
  function limeBackground(ctx) {
    ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(1180, 1280); ctx.rotate(0.385); ctx.lineCap = 'round';
    for (let j = 0; j < 180; j++) {
      const a = (j / 180) * TAU, r1 = 1180, r0 = j % 10 === 0 ? 1080 : j % 5 === 0 ? 1120 : 1150;
      ctx.beginPath(); ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a)); ctx.lineTo(r1 * Math.cos(a), r1 * Math.sin(a));
      ctx.strokeStyle = rgba(C.limeDeep, j % 10 === 0 ? 0.55 : 0.3); ctx.lineWidth = j % 10 === 0 ? 5 : 3; ctx.stroke();
    }
    for (const r of [1000, 1010, 760]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.strokeStyle = rgba(C.limeDeep, 0.3); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
  }

  // slides 4 e 7: a trilha, o título (branco + limão), a bolha do VOCÊ no meio e o apoio embaixo
  function resposta(ctx, step, [a, b], texto, apoio) {
    track(ctx, step);
    const sp = support(ctx, apoio);
    const t = title(ctx, [{ t: a, c: W_ }, { t: b, c: Li, br: true }], L.titleTop, { lines: 2, max: 88 });
    bubble(ctx, texto, { right: 982, vcenter: [t.bottom, sp.top], size: 40, maxW: 900, label: 'VOCÊ' });
  }

  // card com rótulo em mono limão e texto em Inter Display 700 (o desenho dos cards do Carrossel 01, slide 5);
  // o: { destaque } = card limão com texto preto; [campos] no texto saem em mono, numa caixinha, como na bolha
  const CARDF = { fam: DISPLAY, size: 40, weight: 700, ls: -0.4 };
  const PH = 34;                                            // corpo do [campo] em mono
  function cardWrap(ctx, txt) {
    const maxW = CW - 96, sp = tw(ctx, ' ', CARDF.fam, CARDF.size, CARDF.weight, CARDF.ls);
    const NB = '\u00A0';
    const words = txt.replace(/(\S+) R\$ (\S+)/g, `$1${NB}R$${NB}$2`).replace(/\[[^\]]+\]/g, (m) => m.replace(/ /g, NB)).split(' ').filter(Boolean).map((t) => {
      t = t.replace(new RegExp(NB, 'g'), ' ');   // (valor com a moeda nunca quebra: "Dinheiro R$ 640")
      const ph = /^\[.*\]$/.test(t);
      return { t, ph, w: ph ? tw(ctx, t, MONO, PH, 800) + 20 : tw(ctx, t, CARDF.fam, CARDF.size, CARDF.weight, CARDF.ls) };
    });
    const lines = []; let cur = [], cw = 0;
    for (const w of words) {
      if (cur.length && cw + sp + w.w > maxW) { lines.push({ words: cur, w: cw }); cur = []; cw = 0; }
      cur.push(w); cw += (cur.length > 1 ? sp : 0) + w.w;
    }
    if (cur.length) lines.push({ words: cur, w: cw });
    // nada de palavra sozinha na última linha: leva a última palavra da linha anterior
    const n = lines.length;
    if (n > 1 && lines[n - 1].words.length === 1 && lines[n - 2].words.length > 2) {
      const mv = lines[n - 2].words.pop(); lines[n - 1].words.unshift(mv);
    }
    return { lines, sp };
  }
  const cardH = (ctx, txt) => 40 + 30 + 22 + cardWrap(ctx, txt).lines.length * 52 + 26;
  function rotulado(ctx, y, lab, txt, o = {}) {
    const wr = cardWrap(ctx, txt), h = cardH(ctx, txt), dest = !!o.destaque;
    if (dest) { ctx.save(); ctx.shadowColor = rgba(C.lime, 0.25); ctx.shadowBlur = 50; card(ctx, M, y, CW, h, { fill: C.lime, stroke: C.lime }); ctx.restore(); }
    else card(ctx, M, y, CW, h);
    setFont(ctx, MONO, 28, 800, 3); ctx.fillStyle = dest ? C.ink : C.lime; ctx.fillText(lab, M + 48, y + 40 + 22);
    anota('texto', wr.lines);
    let yy = y + 40 + 30 + 22 + 30;
    wr.lines.forEach((ln) => {
      let x = M + 48;
      ln.words.forEach((w) => {
        if (w.ph) {
          rr(ctx, x, yy - PH * 0.98, w.w, PH * 1.34, 10); ctx.fillStyle = dest ? 'rgba(10,10,10,0.13)' : 'rgba(255,255,255,0.1)'; ctx.fill();
          ctx.strokeStyle = dest ? 'rgba(10,10,10,0.35)' : rgba(C.lime, 0.55); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
          setFont(ctx, MONO, PH, 800); ctx.fillStyle = dest ? C.ink : C.lime; ctx.fillText(w.t, x + 10, yy - 2);
        } else {
          setFont(ctx, CARDF.fam, CARDF.size, CARDF.weight, CARDF.ls); ctx.fillStyle = dest ? C.ink : C.white; ctx.fillText(w.t, x, yy);
        }
        x += w.w + wr.sp;
      });
      yy += 52;
    });
    return h;
  }
  // título de 2 linhas (branco + limão), o mesmo corpo em todos os passos
  const titulo2 = (ctx, a, b) => title(ctx, [{ t: a, c: W_ }, { t: b, c: Li, br: true }], L.titleTop, { lines: 2, max: 88 });
  // lista de cards rotulados centrada na faixa do meio
  function cards(ctx, t, sp, items) {
    const total = items.reduce((a, [, tx]) => a + cardH(ctx, tx), 0) + 22 * (items.length - 1);
    let y = mid(t, sp) - total / 2;
    items.forEach(([lab, tx, o]) => { y += rotulado(ctx, y, lab, tx, o) + 22; });
  }

  // a notinha de caixa do slide 2: papel claro, borda serrilhada, linhas em mono e o TOTAL que ninguém conferiu
  function notinha(ctx, x, y, w, linhas) {
    const lh = 66, top = 70, h = top + linhas.length * lh + 120;
    const papel = '#F1EDE2', tinta = '#1C1E1A', teeth = 16, tw_ = w / teeth;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
    ctx.beginPath(); ctx.moveTo(x, y + 10);
    for (let i = 0; i < teeth; i++) { ctx.lineTo(x + (i + 0.5) * tw_, y); ctx.lineTo(x + (i + 1) * tw_, y + 10); }
    ctx.lineTo(x + w, y + h - 10);
    for (let i = teeth - 1; i >= 0; i--) { ctx.lineTo(x + (i + 0.5) * tw_, y + h); ctx.lineTo(x + i * tw_, y + h - 10); }
    ctx.closePath(); ctx.fillStyle = papel; ctx.fill();
    ctx.restore();
    const pad = 48;
    setFont(ctx, MONO, 26, 800, 4, 'center'); ctx.fillStyle = 'rgba(28,30,26,0.55)'; ctx.fillText('CAIXA · HOJE', x + w / 2, y + 58);
    linhas.forEach((ln, i) => {
      const yy = y + top + 40 + i * lh;
      setFont(ctx, MONO, 36, 800, 2); ctx.fillStyle = tinta; ctx.fillText(ln, x + pad, yy + 12);
      // pontinhos até o valor, que ninguém preencheu
      const x0 = x + pad + tw(ctx, ln, MONO, 36, 800, 2) + 18, x1 = x + w - pad - 70;
      ctx.fillStyle = 'rgba(28,30,26,0.4)'; for (let xx = x0; xx < x1; xx += 14) { ctx.beginPath(); ctx.arc(xx, yy + 4, 2.4, 0, TAU); ctx.fill(); }
      setFont(ctx, MONO, 36, 800, 2, 'right'); ctx.fillStyle = 'rgba(28,30,26,0.45)'; ctx.fillText('—', x + w - pad, yy + 12);
    });
    const ty = y + top + linhas.length * lh + 30;
    ctx.save(); ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(28,30,26,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + pad, ty - 26); ctx.lineTo(x + w - pad, ty - 26); ctx.stroke(); ctx.restore();
    setFont(ctx, MONO, 46, 800, 2); ctx.fillStyle = tinta; ctx.fillText('TOTAL: ???', x + pad, ty + 42);
    return { h };
  }
  // selo limão carimbado (o do Carrossel 04, slide 2)
  function selo(ctx, cx, cy, label) {
    const fs = 34, sw = tw(ctx, label, MONO, fs, 800, 1.5) - 1.5 + 80, sh = 96;
    ctx.save(); ctx.translate(cx - sw / 2, cy); ctx.rotate(-0.07);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    rr(ctx, -sw / 2, -sh / 2, sw, sh, sh / 2); ctx.fillStyle = C.lime; ctx.fill(); ctx.shadowColor = 'transparent';
    setFont(ctx, MONO, fs, 800, 1.5); ctx.fillStyle = INK; ctx.fillText(label, -sw / 2 + 40, fs * 0.36);
    ctx.restore();
  }

  const SLIDES = {
    // 1 · capa limão, texto preto
    1(ctx) {
      limeBackground(ctx);
      const t = title(ctx, [{ t: 'Fechamento', c: INK }, { t: 'do caixa', c: INK, br: true }, { t: 'em 5 minutos.', c: INK, br: true }], 0, { lines: 3, max: 170, maxH: 720, lh: 1.0, vcenter: [330, 1120], maxW: CW - 8, x: M + 2 });
      chip(ctx, M + 2, t.top - 74, 'GUIA RÁPIDO · SALVA ESSE', { size: 32, stroke: INK, color: INK, lw: 3 });
      swipe(ctx, INK, INK);
    },
    // 2 · o problema: a notinha do dia sem conferência
    2(ctx) {
      const sp = support(ctx, ['No dia, leva 5 minutos.', 'Na semana seguinte, leva uma tarde.']);
      const t = title(ctx, [{ t: 'O dia acabou.', c: W_ }, { t: 'E o caixa ficou pra amanhã.', c: Li, br: true }], L.titleTop0, { max: 96 });
      const w = 720, x = M, est = 70 + 3 * 66 + 120, y = mid(t, sp) - est / 2 - 10;
      const n = notinha(ctx, x, y, w, ['PIX', 'CARTÃO', 'DINHEIRO']);
      selo(ctx, M + CW - 14, y + n.h - 30, 'SEM CONFERÊNCIA');
    },
    // 3 · passo 01
    3(ctx) {
      track(ctx, 1);
      const sp = support(ctx, 'Cada forma confere num lugar diferente.');
      const t = titulo2(ctx, 'Separe por forma', 'de pagamento.');
      cards(ctx, t, sp, [['PIX', 'o que caiu na conta hoje'], ['CARTÃO', 'o resumo da maquininha'], ['DINHEIRO', 'o que está na gaveta']]);
    },
    // 4 · passo 02: o Pix sem nome e, embaixo, o identificado (destaque limão)
    4(ctx) {
      track(ctx, 2);
      const sp = support(ctx, 'Pix sem nome vira dúvida no fim do mês.');
      const t = titulo2(ctx, 'Confira o Pix', 'pelo nome, não pelo valor.');
      cards(ctx, t, sp, [['PIX · 14:02', 'R$ 380,00 · de quem?'], ['IDENTIFICADO', 'sinal do chalé 3', { destaque: true }]]);
    },
    // 5 · passo 03: esperado, contado e a diferença (chips grandes; a diferença em limão)
    5(ctx) {
      track(ctx, 3);
      const sp = support(ctx, ['Diferença zero é o objetivo.', 'Diferença anotada também vale.']);
      const t = titulo2(ctx, 'Conte o dinheiro', 'e compare com o esperado.');
      const items = ['ESPERADO R$ 640', 'CONTADO R$ 640', 'DIFERENÇA R$ 0'];
      const size = 50, h = 128, gap = 30, total = items.length * h + (items.length - 1) * gap;
      let y = mid(t, sp) - total / 2 + h / 2;
      items.forEach((s, i) => {
        const last = i === items.length - 1;
        chip(ctx, M, y, s, last ? { size, fill: C.lime, color: INK, h, padX: 48 } : { size, fill: C.card, stroke: C.border, color: C.white, h, padX: 48 });
        y += h + gap;
      });
    },
    // 6 · passo 04
    6(ctx) {
      track(ctx, 4);
      const sp = support(ctx, 'Comanda aberta é dinheiro saindo pela porta.');
      const t = titulo2(ctx, 'Feche as comandas', 'antes de fechar o caixa.');
      cards(ctx, t, sp, [['BAR DA PISCINA', '3 comandas abertas'], ['LANÇADAS', 'na conta de cada quarto']]);
    },
    // 7 · passo 05
    7(ctx) {
      track(ctx, 5);
      const sp = support(ctx, 'Amanhã começa do zero, sem dúvida de ontem.');
      const t = titulo2(ctx, 'Registre o fechamento', 'com hora e responsável.');
      cards(ctx, t, sp, [['FECHAMENTO · 21:40', 'Pix R$ 1.260 · Cartão R$ 890 · Dinheiro R$ 640 · conferido por [nome]']]);
    },
    // 8 · fechamento
    8(ctx) {
      title(ctx, [{ t: 'Caixa conferido hoje', c: W_ }, { t: 'é dor de cabeça a menos amanhã.', c: Li, br: true }], L.titleTop0 + 40, { max: 100, maxH: 560 });
      support(ctx, 'Salva pra usar no fechamento de hoje e manda pra quem cuida do caixa aí.', { bottom: 1104 });
      brand(ctx, 540, 1226);
    },
  };

  function init(img) { LOGO = img; }
  function render(ctx, n) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    LINHAS.length = 0;
    background(ctx);                                   // (a capa limão pinta o próprio fundo por cima)
    SLIDES[n](ctx);
  }
  window.CARROSSEL = { init, render, W, H, N: 8 };
  window.__LINHAS = () => LINHAS.slice();
})();
