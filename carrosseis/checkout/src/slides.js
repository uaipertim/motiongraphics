/* =====================================================================
   FAZLO Hospeda — CARROSSEL "Checklist do check-out" · Pilar DICA (o par do Carrossel 04)
   8 slides 1080x1350 (4:5)

   O mesmo modelo do carrossel "Quarto vendido duas vezes?" (d76e21f), que segue o "Réveillon na pousada": motor, cores, fontes, margem de
   80 px, capa LIMÃO com texto preto, trilha de passos 01–05, cards rotulados em mono, bolha limão do VOCÊ com os
   [campos] em mono. Conteúdo educativo: sem telas do sistema, sem CTA de venda e sem emojis; datas e números são
   exemplos ([campos] para preencher).

   CARROSSEL.render(ctx, n)  desenha o slide n (1–8)
   window.__LINHAS           as linhas de texto de cada slide (revisão: nenhuma palavra sozinha numa linha)
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1350, M = 80, CW = W - 2 * M;          // área útil: x 80–1000
  const DISPLAY = "'C1 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'C1 Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#0A0A0A', bg0: '#050505', card: '#161616', border: '#3A3A3A',
    lime: '#AFFA27', amber: '#FFB23F', limeD: '#8CD10C', limeDeep: '#5A8A0E', white: '#FFFFFF', gray: '#B9B9B1', grayM: '#8E8E88', grayD: '#5E5E59', ink: '#0A0A0A',
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
      // alinhado à esquerda: a tinta da 1ª letra começa na margem (o gancho do "j" não passa dela)
      if (align === 'left') x0 += Math.max(0, ctx.measureText(ln.words[0].t[0]).actualBoundingBoxLeft);
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
    // nada de palavra sozinha na última linha: leva a última palavra da linha anterior junto
    const nl = lines.length;
    if (nl > 1 && lines[nl - 1].words.length === 1 && lines[nl - 2].words.length > 2) {
      const mv = lines[nl - 2].words.pop(); lines[nl - 1].words.unshift(mv);
      [nl - 2, nl - 1].forEach((k) => { lines[k].w = lines[k].words.reduce((a, w) => a + w.w, 0) + sp * (lines[k].words.length - 1); });
    }
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

  // bolha do VOCÊ centrada na faixa entre o título e o apoio
  const voce = (ctx, t, sp, texto) => bubble(ctx, texto, { right: 982, vcenter: [t.bottom, sp.top], size: 42, maxW: 880, label: 'VOCÊ' });

  // nota pequena (30 px, cinza médio) logo acima do apoio; devolve o topo dela
  function nota(ctx, text, sp) {
    const size = 30, y = sp.top - 52;
    setFont(ctx, DISPLAY, size, 600, -0.15); ctx.fillStyle = C.grayM; ctx.fillText(text, M, y);
    LINHAS.push({ tag: 'nota', texto: text, sozinha: false });
    return { top: y - size * 0.75 };
  }
  // card do DADO EM DESTAQUE (slides 03–06): rótulo em mono, uma linha de apoio opcional (40 px) e o valor principal
  // em corpo grande (≥ 2× o texto do card comum); [campos] em mono numa caixinha tracejada.
  // so = true: só mede (devolve a altura); hMin: altura mínima (os dois cards lado a lado com a mesma altura)
  function linhaRica(ctx, txt, size, maxW) {
    const ph = Math.round(size * 0.84), fam = DISPLAY, wt = size >= 70 ? 900 : 700, ls = size >= 70 ? -0.025 * size : -0.4;
    const sp = tw(ctx, ' ', fam, size, wt, ls), NB = ' ';
    const words = txt.replace(/\[[^\]]+\]/g, (m) => m.replace(/ /g, NB)).split(' ').filter(Boolean).map((t) => {
      t = t.replace(new RegExp(NB, 'g'), ' '); const isPh = /^\[.*\]$/.test(t);
      return { t, ph: isPh, w: isPh ? tw(ctx, t, MONO, ph, 800) + 0.6 * ph : tw(ctx, t, fam, size, wt, ls) };
    });
    const lines = []; let cur = [], cw = 0;
    for (const w of words) { if (cur.length && cw + sp + w.w > maxW) { lines.push({ words: cur, w: cw }); cur = []; cw = 0; } cur.push(w); cw += (cur.length > 1 ? sp : 0) + w.w; }
    if (cur.length) lines.push({ words: cur, w: cw });
    const n = lines.length;
    if (n > 1 && lines[n - 1].words.length === 1 && lines[n - 2].words.length > 2) lines[n - 1].words.unshift(lines[n - 2].words.pop());
    lines.forEach((l) => { l.w = l.words.reduce((a, w) => a + w.w, 0) + sp * (l.words.length - 1); });
    if (lines.some((l) => l.w > maxW + 0.5)) throw new Error('o valor em destaque não cabe no card: ' + txt);
    return { lines, sp, ph, fam, wt, ls, size, lh: size * 1.12 };
  }
  function desenhaRica(ctx, r, x, y, dest) {
    r.lines.forEach((ln, i) => {
      let xx = x; const yy = y + i * r.lh;
      ln.words.forEach((w) => {
        if (w.ph) {
          const hh = r.ph * 1.3;
          rr(ctx, xx, yy - r.ph * 0.98, w.w, hh, Math.min(14, r.ph * 0.25)); ctx.fillStyle = dest ? 'rgba(10,10,10,0.13)' : 'rgba(255,255,255,0.1)'; ctx.fill();
          ctx.strokeStyle = dest ? 'rgba(10,10,10,0.4)' : rgba(C.lime, 0.6); ctx.lineWidth = r.size >= 70 ? 3 : 2; ctx.setLineDash(r.size >= 70 ? [9, 7] : [6, 5]); ctx.stroke(); ctx.setLineDash([]);
          setFont(ctx, MONO, r.ph, 800); ctx.fillStyle = dest ? C.ink : C.lime; ctx.fillText(w.t, xx + 0.3 * r.ph, yy - r.ph * 0.06);
        } else { setFont(ctx, r.fam, r.size, r.wt, r.ls); ctx.fillStyle = dest ? C.ink : C.white; ctx.fillText(w.t, xx, yy); }
        xx += w.w + r.sp;
      });
    });
    anota('texto', r.lines);
  }
  function grande(ctx, x, y, w, o, so = false, hMin = 0) {
    const pad = 52, size = o.size || 96, dest = !!o.destaque;
    const pre = o.pre ? linhaRica(ctx, o.pre, 40, w - 2 * pad) : null, main = linhaRica(ctx, o.main, size, w - 2 * pad);
    const hLab = 44 + 22, hPre = pre ? pre.lines.length * 52 + 14 : 0;
    const hMain = (main.lines.length - 1) * main.lh + size * 0.74 + main.ph * 0.32 + 18;
    const h = Math.max(hMin, pad + hLab + hPre + hMain + pad - 18);
    if (so) return h;
    if (dest) { ctx.save(); ctx.shadowColor = rgba(C.lime, 0.25); ctx.shadowBlur = 50; card(ctx, x, y, w, h, { fill: C.lime, stroke: C.lime, r: 32 }); ctx.restore(); }
    else card(ctx, x, y, w, h, { r: 32 });
    // o conteúdo centrado na altura do card (quando hMin estica o card)
    const ext = (h - (pad + hLab + hPre + hMain + pad - 18)) / 2;
    let yy = y + pad + ext;
    setFont(ctx, MONO, 30, 800, 3); ctx.fillStyle = dest ? C.ink : C.lime; ctx.fillText(o.lab, x + pad, yy + 22); yy += hLab;
    if (pre) { desenhaRica(ctx, pre, x + pad, yy + 30, dest); yy += hPre; }
    desenhaRica(ctx, main, x + pad, yy + size * 0.74, dest);
    return h;
  }
  // um card em destaque centrado entre o título e o que vem embaixo (a nota ou o apoio)
  const grandeNoMeio = (ctx, t, sp, o) => { const h = grande(ctx, 0, 0, CW, o, true); grande(ctx, M, mid(t, sp) - h / 2, CW, o); };
  // card rotulado em qualquer largura (os dois cards lado a lado do slide 4)
  function rotuladoEm(ctx, x, y, w, lab, txt, o = {}) {
    const dest = !!o.destaque, h = 40 + 30 + 22 + 52 + 26;
    if (dest) { ctx.save(); ctx.shadowColor = rgba(C.lime, 0.25); ctx.shadowBlur = 50; card(ctx, x, y, w, h, { fill: C.lime, stroke: C.lime }); ctx.restore(); }
    else card(ctx, x, y, w, h);
    setFont(ctx, MONO, 28, 800, 3); ctx.fillStyle = dest ? C.ink : C.lime; ctx.fillText(lab, x + 40, y + 40 + 22);
    const wr = cardWrap(ctx, txt); anota('texto', wr.lines);
    let xx = x + 40; const yy = y + 40 + 30 + 22 + 30;
    wr.lines[0].words.forEach((wd) => {
      if (wd.ph) {
        rr(ctx, xx, yy - PH * 0.98, wd.w, PH * 1.34, 10); ctx.fillStyle = dest ? 'rgba(10,10,10,0.13)' : 'rgba(255,255,255,0.1)'; ctx.fill();
        ctx.strokeStyle = dest ? 'rgba(10,10,10,0.35)' : rgba(C.lime, 0.55); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
        setFont(ctx, MONO, PH, 800); ctx.fillStyle = dest ? C.ink : C.lime; ctx.fillText(wd.t, xx + 10, yy - 2);
      } else { setFont(ctx, CARDF.fam, CARDF.size, CARDF.weight, CARDF.ls); ctx.fillStyle = dest ? C.ink : C.white; ctx.fillText(wd.t, xx, yy); }
      xx += wd.w + wr.sp;
    });
    if (xx - wr.sp > x + w - 40) throw new Error('card lado a lado: o texto não cabe');
    return h;
  }
  // balão genérico de quem pergunta (cartão escuro, borda limão, rabicho para o lado do card)
  function pergunta(ctx, x, y, text, lado) {
    const size = 34, padX = 30, h = 82, w = tw(ctx, text, DISPLAY, size, 700, -0.3) + 2 * padX;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, lado === 'esq' ? [30, 30, 30, 8] : [30, 30, 8, 30]); ctx.fillStyle = '#1C1D1A'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, lado === 'esq' ? [30, 30, 30, 8] : [30, 30, 8, 30]); ctx.strokeStyle = rgba(C.lime, 0.6); ctx.lineWidth = 2.5; ctx.stroke();
    setFont(ctx, DISPLAY, size, 700, -0.3); ctx.fillStyle = C.white; ctx.fillText(text, x + padX, y + h / 2 + size * 0.36);
    LINHAS.push({ tag: 'balão', texto: text, sozinha: false });
    return w;
  }
  // o carimbo limão (inclinado)
  function carimbo(ctx, cx, cy, text, ang, cor = C.lime) {
    const size = 36, w = tw(ctx, text, MONO, size, 800, 3) - 3 + 56, h = 76;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.shadowColor = rgba(cor, 0.35); ctx.shadowBlur = 40;
    rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fillStyle = cor; ctx.fill(); ctx.shadowBlur = 0;
    rr(ctx, -w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 9); ctx.strokeStyle = 'rgba(10,10,10,0.55)'; ctx.lineWidth = 2.5; ctx.stroke();
    setFont(ctx, MONO, size, 800, 3, 'center'); ctx.fillStyle = C.ink; ctx.fillText(text, 0, size * 0.36);
    ctx.restore();
  }

  // resposta curta do dono ("Fechado!"): bolinha limão com texto preto, rabicho à direita
  function resposta(ctx, x1, y, text) {
    const size = 34, padX = 28, h = 72, w = tw(ctx, text, DISPLAY, size, 700, -0.3) + 2 * padX, x = x1 - w;
    ctx.save(); ctx.shadowColor = rgba(C.lime, 0.22); ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, [28, 28, 8, 28]); ctx.fillStyle = C.lime; ctx.fill(); ctx.restore();
    setFont(ctx, DISPLAY, size, 700, -0.3); ctx.fillStyle = C.ink; ctx.fillText(text, x + padX, y + h / 2 + size * 0.36);
    LINHAS.push({ tag: 'resposta', texto: text, sozinha: false });
    return { x, y, w, h };
  }
  // seta limão de (x0, y0) até (x1, y1), com ponta
  function seta(ctx, x0, y0, x1, y1, o = {}) {
    const a = Math.atan2(y1 - y0, x1 - x0), k = o.ponta || 20;
    ctx.save(); ctx.strokeStyle = o.cor || C.lime; ctx.lineWidth = o.lw || 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1 - k * Math.cos(a - 0.5), y1 - k * Math.sin(a - 0.5)); ctx.lineTo(x1, y1); ctx.lineTo(x1 - k * Math.cos(a + 0.5), y1 - k * Math.sin(a + 0.5)); ctx.stroke();
    ctx.restore();
  }
  const chipW = (ctx, text, size) => tw(ctx, text, MONO, size, 800, size * 0.06) - size * 0.06 + 2 * size * 0.75;

  // chips grandes com o ícone de check (o desenho do slide 05 do Carrossel 04); o último é o destaque limão
  function checklist(ctx, t, sp, items) {
    const size = 38, h = 104, padX = 34, gapX = 22, gapY = 26, icon = size * 1.05;
    const widths = items.map((s) => tw(ctx, s, MONO, size, 800, size * 0.06) - size * 0.06 + 2 * padX + icon);
    const rows = []; let cur = [], cw = 0;
    items.forEach((s, i) => { if (cur.length && cw + gapX + widths[i] > CW) { rows.push(cur); cur = []; cw = 0; } cur.push(i); cw += (cur.length > 1 ? gapX : 0) + widths[i]; });
    rows.push(cur);
    const total = rows.length * h + (rows.length - 1) * gapY;
    let y = mid(t, sp) - total / 2 + h / 2;
    rows.forEach((r) => {
      let x = M;
      r.forEach((i) => {
        const last = i === items.length - 1;
        const c = chip(ctx, x, y, items[i], last ? { size, fill: C.lime, color: INK, h, padX, icon: checkIcon(INK) } : { size, fill: C.card, stroke: C.border, color: C.white, h, padX, icon: checkIcon(C.lime) });
        x += c.w + gapX;
      });
      y += h + gapY;
    });
    LINHAS.push({ tag: 'chips', texto: items.join(' · '), sozinha: false });
  }

  const SLIDES = {
    // 1 · capa limão, texto preto (a construção da capa do Carrossel 04, o par deste)
    1(ctx) {
      limeBackground(ctx);
      const t = title(ctx, [{ t: 'Checklist', c: INK }, { t: 'do check-out', c: INK, br: true }, { t: 'sem surpresa.', c: INK, br: true }], 0, { lines: 3, max: 170, maxH: 720, lh: 1.0, vcenter: [330, 1120], maxW: CW - 8, x: M + 2 });
      chip(ctx, M + 2, t.top - 74, 'GUIA RÁPIDO · SALVA ESSE', { size: 32, stroke: INK, color: INK, lw: 3 });
      swipe(ctx, INK, INK);
    },
    // 2 · o problema: a saída com a conta aberta (o card de chegada do Carrossel 04, agora de saída)
    2(ctx) {
      const t = title(ctx, [{ t: 'Mala na porta.', c: W_ }, { t: 'E a conta ainda aberta.', c: Li, br: true }], L.titleTop0 + 40, { max: 100, maxH: 330 });
      const sp = support(ctx, 'Check-out bom é o que dura dois minutos.');
      const w = CW, h = 340, x = M, y = mid(t, sp) - h / 2 - 10;
      card(ctx, x, y, w, h, { stroke: '#4A4A4A', lw: 3 });
      setFont(ctx, MONO, 30, 800, 3); ctx.fillStyle = C.grayM; ctx.fillText('CHALÉ 3 · SAÍDA', x + 48, y + 84);
      setFont(ctx, DISPLAY, 132, 900, -4); ctx.fillStyle = C.white; ctx.fillText('11:52', x + 44, y + 262);
      LINHAS.push({ tag: 'card', texto: 'CHALÉ 3 · SAÍDA · 11:52', sozinha: false });
      const label = 'CONTA ABERTA', fs = 34, sw = tw(ctx, label, MONO, fs, 800, 1.5) - 1.5 + 80, sh = 96;
      ctx.save(); ctx.translate(M + CW - sw / 2 - 6, y + h - 14); ctx.rotate(-0.07);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      rr(ctx, -sw / 2, -sh / 2, sw, sh, sh / 2); ctx.fillStyle = C.amber; ctx.fill(); ctx.shadowColor = 'transparent';
      setFont(ctx, MONO, fs, 800, 1.5); ctx.fillStyle = INK; ctx.fillText(label, -sw / 2 + 40, fs * 0.36);
      ctx.restore();
      LINHAS.push({ tag: 'carimbo', texto: label, sozinha: false });
    },
    // 3 · passo 01: feche o consumo na noite anterior (card em destaque + as origens)
    3(ctx) {
      track(ctx, 1);
      const sp = support(ctx, 'Conta revisada com calma não vira discussão na saída.');
      const t = titulo2(ctx, 'Feche o consumo', 'na noite anterior.');
      const o = { lab: 'CONSUMO DO CHALÉ 3', main: '[R$ 86,00]', size: 120 }, hc = grande(ctx, 0, 0, CW, o, true);
      const cs = 30, hs = 62, gap = 30, nomes = ['frigobar', 'bar', 'restaurante'], ws = nomes.map((n) => chipW(ctx, n, cs)), gx = 20;
      const y0 = mid(t, sp) - (hc + gap + hs) / 2;
      grande(ctx, M, y0, CW, o);
      let x = 540 - (ws.reduce((a, b) => a + b, 0) + gx * 2) / 2;
      nomes.forEach((n, i) => { chip(ctx, x, y0 + hc + gap + hs / 2, n, { size: cs, stroke: C.border, fill: C.card, color: C.gray, h: hs }); x += ws[i] + gx; });
      LINHAS.push({ tag: 'chips', texto: nomes.join(' · '), sozinha: false });
    },
    // 4 · passo 02: avise o valor antes (bolha grande)
    4(ctx) {
      track(ctx, 2);
      const sp = support(ctx, 'Hóspede avisado chega no balcão pronto pra pagar.');
      const t = titulo2(ctx, 'Avise o valor', 'antes da hora de sair.');
      bubble(ctx, 'Bom dia, [nome]! Seu check-out é até as [12h]. O consumo da estadia ficou em [R$ 86,00]. Pode acertar por [Pix ou cartão] quando quiser.',
        { right: 982, vcenter: [t.bottom, sp.top], size: 44, maxW: 900, label: 'VOCÊ' });
    },
    // 5 · passo 03: receba e registre (saldo zero + QUITADO)
    5(ctx) {
      track(ctx, 3);
      const sp = support(ctx, 'Saldo zero antes de liberar a saída.');
      const t = titulo2(ctx, 'Receba e registre', 'no mesmo momento.');
      const o = { lab: 'SALDO DO CHALÉ 3', main: 'R$ 0,00', size: 130 }, h = grande(ctx, 0, 0, CW, o, true), y = mid(t, sp) - h / 2;
      grande(ctx, M, y, CW, o);
      const mw = tw(ctx, 'R$ 0,00', DISPLAY, 130, 900, -0.025 * 130), base = y + 52 + 66 + 130 * 0.74;
      ctx.save(); ctx.shadowColor = rgba(C.lime, 0.35); ctx.shadowBlur = 40;
      chip(ctx, M + 52 + mw + 44, base - 130 * 0.36, 'QUITADO', { size: 40, fill: C.lime, color: INK, h: 90, icon: checkIcon(INK) }); ctx.restore();
      LINHAS.push({ tag: 'selo', texto: 'QUITADO', sozinha: false });
    },
    // 6 · passo 04: chave devolvida, acomodação conferida (chips com check)
    6(ctx) {
      track(ctx, 4);
      const sp = support(ctx, 'Conferir com o hóspede ainda ali evita mensagem chata depois.');
      const t = titulo2(ctx, 'Chave devolvida,', 'acomodação conferida.');
      checklist(ctx, t, sp, ['CHAVE', 'CONTROLE', 'TOALHAS', 'FRIGOBAR', 'ITENS ESQUECIDOS', 'CONFERIDO']);
    },
    // 7 · passo 05: agradeça e peça a avaliação
    7(ctx) {
      track(ctx, 5);
      const sp = support(ctx, 'Avaliação pedida na hora certa vira a próxima reserva de alguém.');
      const t = titulo2(ctx, 'Agradeça', 'e peça a avaliação.');
      bubble(ctx, 'Obrigado pela estadia, [nome]! Se puder deixar sua opinião no Google, ajuda muito a gente: [link]. Volte sempre!',
        { right: 982, vcenter: [t.bottom, sp.top], size: 46, maxW: 900, label: 'VOCÊ' });
    },
    // 8 · fechamento
    8(ctx) {
      title(ctx, [{ t: 'Check-out tranquilo', c: W_ }, { t: 'começa na noite anterior.', c: Li, br: true }], L.titleTop0 + 40, { max: 100, maxH: 560 });
      support(ctx, 'Salva pra usar na próxima saída e manda pra quem cuida da recepção aí.', { bottom: 1104 });
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
