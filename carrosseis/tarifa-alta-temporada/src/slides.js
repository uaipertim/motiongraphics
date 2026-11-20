/* =====================================================================
   FAZLO Hospeda — CARROSSEL ANIMADO "Tarifa de dezembro: quando e quanto subir?" · Pilar DICA (piloto, v2)
   8 slides em vídeo, 1080x1350 (4:5), 9–10 s a 30 fps

   O motor dos carrosséis estáticos (o mesmo do "Nada de consumo fora da conta"): cores, fontes, margem de 80 px, capa
   LIMÃO com texto preto, trilha de passos 01–05. Na v2, cada slide é uma pequena CENA animada que conta a ideia
   sozinha, abaixo do texto do slide (fixo desde o quadro 0): começo, meio e fim (até ~6,5 s), o estado final vivo
   (brilho, partículas, pulsos) e, no fim, a cena se dissolve suavemente de volta ao quadro 0 (o loop não salta).
   O canto de baixo à direita (140×140 px) fica livre: é onde o Instagram põe o ícone de som no vídeo.
   Os valores são um exemplo fictício (selo "EXEMPLO FICTÍCIO" nos slides com valores).

   CARROSSEL.render(ctx, n, t)  desenha o slide n (1–8) no instante t (s)
   window.__LINHAS              as linhas de texto do slide (revisão: nenhuma palavra sozinha numa linha)
   ===================================================================== */
(function () {
  'use strict';
  const FPS = 30;
  const DURS = { 1: 9, 2: 10, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9 };   // a duração de cada slide (s)
  // o instante do estado final de cada cena (antes de ela se dissolver): é a versão estática de segurança (output/png/)
  const POSE = { 1: 0, 2: 9.0, 3: 7.6, 4: 7.6, 5: 7.6, 6: 7.6, 7: 7.6, 8: 7.6 };
  let DUR = 9;                                                     // a do slide que está sendo desenhado

  const W = 1080, H = 1350, M = 80, CW = W - 2 * M;          // área útil: x 80–1000
  const DISPLAY = "'C1 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'C1 Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#0A0A0A', bg0: '#050505', card: '#161616', border: '#3A3A3A',
    lime: '#AFFA27', amber: '#E8A317', off: '#F4F4F0', limeD: '#8CD10C', limeDeep: '#5A8A0E', white: '#FFFFFF', gray: '#B9B9B1', grayM: '#8E8E88', grayD: '#5E5E59', ink: '#0A0A0A',
  };
  const L = { trackY: 120, titleTop: 196, titleTop0: 164, titleMaxH: 360, supportBottom: 1180 };   // (o apoio termina acima do canto do ícone de som)
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
  function background(ctx, t = 0) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 760, 0, 540, 760, 1000);
    g.addColorStop(0, '#131412'); g.addColorStop(0.6, C.bg); g.addColorStop(1, C.bg0);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const l = ctx.createRadialGradient(540, 1350, 0, 540, 1350, 700);
    l.addColorStop(0, rgba(C.lime, 0.05 + 0.025 * (0.5 - 0.5 * Math.cos(TAU * t / DUR)))); l.addColorStop(1, rgba(C.lime, 0));
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

  // =====================================================================
  // AS CENAS (v2): cada slide é uma pequena cena animada que conta a ideia sozinha, abaixo do texto do slide (que fica
  // FIXO desde o quadro 0). A cena tem começo, meio e fim (até ~6,5 s; no 02, ~8 s), depois o estado final fica vivo
  // (brilho, partículas, pulsos) e, nos últimos 0,75 s, se dissolve suavemente de volta ao quadro 0 (só o texto):
  // o último quadro emenda no primeiro sem salto. Na capa, o letreiro volta sozinho a R$ 300.
  // =====================================================================
  const cl = (x) => Math.max(0, Math.min(1, x));
  const p = (t, a, b) => cl((t - a) / (b - a));
  const eOut = (x) => 1 - Math.pow(1 - cl(x), 3);
  const eIn = (x) => Math.pow(cl(x), 3);
  const eIO = (x) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eBack = (x, s = 1.7) => { x = cl(x); const c3 = s + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
  // mola: passa um pouco do ponto e assenta (sem salto no fim)
  const spr = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-5.4 * x) * Math.cos(8.6 * x));
  const mola = (t, a, dur = 0.55) => spr(p(t, a, a + dur));
  const brl = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const W_ = C.white, Li = C.lime, INK = C.ink, OFF = C.off, AMB = C.amber;
  const CAIXAS = {};                                         // (conferência) as caixas do texto fixo de cada slide
  // a cena inteira some suavemente nos últimos 0,75 s (o quadro final = o quadro 0: só o texto)
  const saida = (t) => 1 - eIO(p(t, DUR - 0.75, DUR - 1 / FPS));
  function camada(ctx, a, fn) { if (a <= 0.001) return; ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore(); }
  const monoLab = (ctx, s, x, y, cor = C.gray, size = 26, align = 'left', ls = 3) => { setFont(ctx, MONO, size, 800, ls, align); ctx.fillStyle = cor; ctx.fillText(s, x, y); };
  function ficticio(ctx) { chip(ctx, M + CW, L.trackY, 'EXEMPLO FICTÍCIO', { size: 24, stroke: C.grayM, color: C.gray, lw: 2, align: 'right', h: 50, padX: 20 }); }
  // brilho suave atrás de um elemento
  function brilho(ctx, x, y, r, cor, a) { if (a <= 0) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(cor, a)); g.addColorStop(1, rgba(cor, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
  // partículas ambientes (pontinhos que piscam devagar) numa caixa
  function faiscas(ctx, t, box, n, cor, seed, a = 1) {
    for (let i = 0; i < n; i++) {
      const x = box[0] + hash(seed, i) * (box[2] - box[0]), y0 = box[1] + hash(seed + 7, i) * (box[3] - box[1]);
      const ph = hash(seed + 13, i), y = y0 - 18 * ((t * 0.25 + ph) % 1), k = Math.sin(Math.PI * ((t * 0.5 + ph) % 1));
      ctx.beginPath(); ctx.arc(x, y, 1.6 + 1.6 * hash(seed + 3, i), 0, TAU); ctx.fillStyle = rgba(cor, 0.55 * k * a); ctx.fill();
    }
  }
  // carimbo com impacto: entra grande e inclinado, bate (tremidinha) e solta poeira
  function carimbo(ctx, cx, cy, text, ang, cor, t, t0, o = {}) {
    const k = p(t, t0, t0 + 0.28); if (t < t0) return;
    const size = o.size || 34, w = tw(ctx, text, MONO, size, 800, 3) - 3 + 2 * (o.pad || 28), h = size * 2.05;
    const eMax = Math.max(1, Math.min(1.9, (cx - M) / (w / 2 + 6), (M + CW - cx) / (w / 2 + 6))), esc = k < 1 ? eMax - (eMax - 1) * eIn(k) : 1, treme = t - t0 > 0.28 && t - t0 < 0.6 ? 5 * Math.sin((t - t0) * 70) * (1 - p(t, t0 + 0.28, t0 + 0.6)) : 0;
    ctx.save(); ctx.translate(cx + treme, cy); ctx.rotate(ang); ctx.scale(esc, esc); ctx.globalAlpha *= Math.min(1, k * 1.6);
    if (o.fill) { rr(ctx, -w / 2, -h / 2, w, h, 12); ctx.fillStyle = cor; ctx.fill(); }
    rr(ctx, -w / 2, -h / 2, w, h, 12); ctx.strokeStyle = o.fill ? rgba(INK, 0.4) : cor; ctx.lineWidth = 5; ctx.stroke();
    rr(ctx, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 8); ctx.strokeStyle = o.fill ? rgba(INK, 0.35) : rgba(cor, 0.55); ctx.lineWidth = 2; ctx.stroke();
    setFont(ctx, MONO, size, 800, 3, 'center'); ctx.fillStyle = o.fill ? INK : cor; ctx.fillText(text, 0, size * 0.36);
    ctx.restore();
    // a poeira do impacto
    const pk = p(t, t0 + 0.22, t0 + 0.9);
    if (pk > 0 && pk < 1) for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + hash(i, 5), r = w * 0.32 + 40 * eOut(pk);
      ctx.beginPath(); ctx.arc(Math.max(M + 4, Math.min(M + CW - 4, cx + Math.cos(a) * r)), cy + Math.sin(a) * r * 0.5, 3 * (1 - pk), 0, TAU); ctx.fillStyle = rgba(cor, 0.8 * (1 - pk)); ctx.fill();
    }
  }
  // número rolando tipo ODÔMETRO (JetBrains Mono: largura fixa, nada pula). v: o valor no instante; fim: o valor final
  function odometro(ctx, v, fim, x, y, size, o = {}) {
    const pre = o.pre ?? 'R$ ', suf = o.suf ?? '', cor = o.cor || W_, nd = String(Math.round(fim)).length;
    setFont(ctx, MONO, size, 800, 0);
    const dw = ctx.measureText('0').width, sepw = ctx.measureText('.').width, prew = ctx.measureText(pre).width, sufw = ctx.measureText(suf).width;
    const seps = nd >= 4 ? 1 : 0, total = prew + nd * dw + seps * sepw + sufw;
    let xx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    ctx.fillStyle = cor; ctx.fillText(pre, xx, y); xx += prew;
    const top = y - size * 0.86, hh = size * 1.12;
    for (let i = nd - 1; i >= 0; i--) {
      const pw = Math.pow(10, i), f = v / pw, d = Math.floor(f) % 10;
      const fr = i === 0 ? f - Math.floor(f) : cl((v % pw) - (pw - 1));
      const vis = v >= pw - 1 || i === 0;
      if (!vis && o.zeros !== false) { ctx.save(); ctx.globalAlpha *= 0.22; ctx.fillStyle = cor; ctx.fillText('0', xx, y); ctx.restore(); }
      if (vis) {
        ctx.save(); ctx.beginPath(); ctx.rect(xx - 4, top, dw + 8, hh); ctx.clip();
        ctx.fillStyle = cor; ctx.fillText(String(d), xx, y - fr * hh); ctx.fillText(String((d + 1) % 10), xx, y + (1 - fr) * hh);
        ctx.restore();
      }
      xx += dw;
      if (nd >= 4 && i === 3) { ctx.save(); if (v < 999) ctx.globalAlpha *= 0.22; ctx.fillStyle = cor; ctx.fillText('.', xx, y); ctx.restore(); xx += sepw; }
    }
    if (suf) { ctx.fillStyle = cor; ctx.fillText(suf, xx, y); }
    return { x0: xx - total + (suf ? sufw : 0), w: total };
  }
  // ---------------------------------------------------------------- o letreiro de aeroporto (split-flap)
  // uma célula: k 0→0,5 a metade de cima do caractere antigo cai (dobra no meio); 0,5→1 a metade de baixo do novo desce
  function flapCell(ctx, x, y, w, h, de, para, k, o = {}) {
    const fg = o.fg || OFF, bg = o.bg || '#1A1A18', size = o.size || h * 0.78, hy = y + h / 2;
    const meia = (ch, parte, sy, sombra) => {
      ctx.save(); ctx.beginPath(); ctx.rect(x, parte === 'cima' ? y : hy, w, h / 2); ctx.clip();
      if (sy !== 1) { ctx.translate(0, hy); ctx.scale(1, Math.max(0.001, sy)); ctx.translate(0, -hy); }
      rr(ctx, x, y, w, h, 12); ctx.fillStyle = bg; ctx.fill();
      setFont(ctx, MONO, size, 800, 0, 'center'); ctx.fillStyle = fg; ctx.fillText(ch, x + w / 2, y + h / 2 + size * 0.36);
      if (sombra > 0) { ctx.fillStyle = `rgba(0,0,0,${sombra})`; ctx.fillRect(x, y, w, h); }
      ctx.restore();
    };
    if (k <= 0 || de === para) { meia(para, 'cima', 1, 0); meia(para, 'baixo', 1, 0); }
    else if (k < 0.5) { meia(para, 'cima', 1, 0); meia(de, 'baixo', 1, 0.25 * k); meia(de, 'cima', 1 - 2 * k, 0.55 * k * 2); }
    else { meia(para, 'cima', 1, 0); meia(de, 'baixo', 1, 0.25); meia(para, 'baixo', 2 * k - 1, 0.5 * (1 - (2 * k - 1))); }
    // a dobradiça e os pininhos
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(x, hy - 1.5, w, 3);
    ctx.fillStyle = '#3A3A36'; ctx.fillRect(x - 3, hy - 6, 6, 12); ctx.fillRect(x + w - 3, hy - 6, 6, 12);
  }
  // a sequência de caracteres por onde uma célula passa (como no letreiro de verdade: sempre para a frente)
  const ciclo = (a, b) => { const out = [a]; let d = +a; while (String(d) !== b) { d = (d + 1) % 10; out.push(String(d)); } return out; };
  function flapEm(t, t0, seq, passo) {
    if (t < t0 || seq.length < 2) return { de: seq[0], para: seq[0], k: 0 };
    const f = (t - t0) / passo, i = Math.floor(f);
    if (i >= seq.length - 1) return { de: seq[seq.length - 1], para: seq[seq.length - 1], k: 0 };
    return { de: seq[i], para: seq[i + 1], k: f - i };
  }
  // ---------------------------------------------------------------- ícones de linha
  function chale(ctx, cx, by, w, cor, o = {}) {
    const lw = o.lw || Math.max(3, w * 0.035), aceso = o.aceso || 0, tr = o.traco ?? 1;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = cor;
    if (tr < 1) { ctx.setLineDash([w * 4 * tr, w * 4]); }
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.42, by); ctx.lineTo(cx - w * 0.42, by - w * 0.5); ctx.lineTo(cx, by - w * 0.86); ctx.lineTo(cx + w * 0.42, by - w * 0.5); ctx.lineTo(cx + w * 0.42, by); ctx.closePath();
    ctx.moveTo(cx - w * 0.54, by - w * 0.4); ctx.lineTo(cx, by - w * 0.86); ctx.lineTo(cx + w * 0.54, by - w * 0.4);
    ctx.stroke(); ctx.setLineDash([]);
    if (aceso > 0) { brilho(ctx, cx + w * 0.16, by - w * 0.3, w * 0.6, C.lime, 0.35 * aceso); }
    if (tr >= 1) {
      rr(ctx, cx - w * 0.3, by - w * 0.36, w * 0.2, w * 0.36, 3); ctx.stroke();                                  // a porta
      rr(ctx, cx + w * 0.06, by - w * 0.4, w * 0.22, w * 0.18, 3);                                              // a janela
      if (aceso > 0) { ctx.fillStyle = rgba(C.lime, aceso); ctx.fill(); }
      ctx.stroke();
    }
    ctx.restore();
  }
  function arvore(ctx, cx, by, s, cor, k = 1) {
    ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.setLineDash([400 * k, 400]);
    ctx.beginPath(); ctx.moveTo(cx, by - s); ctx.lineTo(cx - s * 0.45, by - s * 0.45); ctx.lineTo(cx - s * 0.2, by - s * 0.45); ctx.lineTo(cx - s * 0.5, by - s * 0.05);
    ctx.lineTo(cx + s * 0.5, by - s * 0.05); ctx.lineTo(cx + s * 0.2, by - s * 0.45); ctx.lineTo(cx + s * 0.45, by - s * 0.45); ctx.closePath();
    ctx.moveTo(cx, by - s * 0.05); ctx.lineTo(cx, by + s * 0.12); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function fogos(ctx, cx, cy, s, cor, k = 1) {
    ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, r0 = s * 0.18 * k, r1 = s * 0.5 * k;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + Math.cos(a + 0.4) * s * 0.42 * k, cy + Math.sin(a + 0.4) * s * 0.42 * k, 2, 0, TAU); ctx.fillStyle = cor; ctx.fill();
    }
    ctx.restore();
  }
  function relogio(ctx, cx, cy, r, cor, ang) {
    ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * r * 0.65, cy + Math.sin(ang) * r * 0.65); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang / 12 - 1.2) * r * 0.45, cy + Math.sin(ang / 12 - 1.2) * r * 0.45); ctx.stroke();
    ctx.restore();
  }
  function marcador(ctx, cx, cy, s, cor) {             // o ícone de salvar
    ctx.beginPath(); ctx.moveTo(cx - s * 0.36, cy - s * 0.5); ctx.lineTo(cx + s * 0.36, cy - s * 0.5); ctx.lineTo(cx + s * 0.36, cy + s * 0.52);
    ctx.lineTo(cx, cy + s * 0.26); ctx.lineTo(cx - s * 0.36, cy + s * 0.52); ctx.closePath(); ctx.fillStyle = cor; ctx.fill();
  }
  // o balão de conversa genérico: lado 'esq' (o hóspede: escuro, borda) ou 'dir' (a pousada: limão, texto preto)
  function balao(ctx, x, y, text, lado, o = {}) {
    const size = o.size || 36, padX = 30, h = size * 2.15, w = tw(ctx, text, DISPLAY, size, 700, -0.3) + 2 * padX;
    const x0 = lado === 'dir' ? x - w : x, raio = lado === 'esq' ? [30, 30, 30, 8] : [30, 30, 8, 30];
    ctx.save();
    if (lado === 'dir') { ctx.shadowColor = rgba(C.lime, 0.25); ctx.shadowBlur = 36; }
    else { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; }
    ctx.beginPath(); ctx.roundRect(x0, y, w, h, raio); ctx.fillStyle = lado === 'dir' ? C.lime : (o.fundo || '#1C1D1A'); ctx.fill(); ctx.restore();
    if (lado === 'esq') { ctx.beginPath(); ctx.roundRect(x0, y, w, h, raio); ctx.strokeStyle = o.borda || rgba(C.white, 0.18); ctx.lineWidth = o.bw || 2.5; ctx.stroke(); }
    setFont(ctx, DISPLAY, size, 700, -0.3); ctx.fillStyle = lado === 'dir' ? INK : C.white; ctx.fillText(text, x0 + padX, y + h / 2 + size * 0.36);
    LINHAS.push({ tag: 'balão', texto: text, sozinha: false });
    return { x0, y, w, h };
  }
  function avatar(ctx, cx, cy, r, cor) {
    ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.22, r * 0.3, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.62, r * 0.52, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.restore();
  }
  // um elemento que entra com mola a partir de um ponto (escala + leve subida)
  function surge(ctx, t, t0, ox, oy, fn, o = {}) {
    if (t < t0) return;
    const k = mola(t, t0, o.dur || 0.55), a = cl((t - t0) / 0.18), kt = o.semSubir ? Math.min(k, 1) : k;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(ox, oy + (1 - kt) * (o.dy ?? 26)); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.translate(-ox, -oy); fn(k); ctx.restore();
  }
  // "ARRASTA →" na margem direita, ACIMA do canto do ícone de som: a seta dá um empurrãozinho a cada 1,5 s
  function swipe(ctx, textColor, arrowColor, t = 0) {
    const right = M + CW, aw = 64, gap = 26, y = 1166, size = 34, sp = 4;
    setFont(ctx, MONO, size, 800, 0);
    const chars = [...'ARRASTA'], ws = chars.map((ch) => ctx.measureText(ch).width);
    const textW = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    let x = right - 3 - aw - gap - textW - 12;
    CAIXAS.arrasta = [x, y - 32, right + 3, y + 8];
    ctx.fillStyle = textColor;
    chars.forEach((ch, i) => { ctx.fillText(ch, x, y); x += ws[i] + sp; });
    const nud = 12 * Math.pow(Math.max(0, Math.sin(TAU * t / 1.5)), 2);
    const ax = right - 3 - 12 + nud;
    ctx.strokeStyle = arrowColor; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ax - aw, y - 12); ctx.lineTo(ax, y - 12); ctx.moveTo(ax - 20, y - 30); ctx.lineTo(ax, y - 12); ctx.lineTo(ax - 20, y + 6); ctx.stroke();
  }
  // a escala gravada ao fundo da capa limão (a mesma dos outros carrosséis), parada e sutil
  function limeBackground(ctx) {
    ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(1180, 1280); ctx.rotate(0.385); ctx.lineCap = 'round';
    for (let j = 0; j < 180; j++) {
      const a = (j / 180) * TAU, r1 = 1180, r0 = j % 10 === 0 ? 1080 : j % 5 === 0 ? 1120 : 1150;
      ctx.beginPath(); ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a)); ctx.lineTo(r1 * Math.cos(a), r1 * Math.sin(a));
      ctx.strokeStyle = rgba(C.limeDeep, j % 10 === 0 ? 0.5 : 0.28); ctx.lineWidth = j % 10 === 0 ? 5 : 3; ctx.stroke();
    }
    for (const r of [1000, 1010, 760]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.strokeStyle = rgba(C.limeDeep, 0.28); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
  }
  // o texto fixo dos slides internos: a trilha, o título de 2 linhas (branco + limão) e o apoio
  function topo(ctx, passo, a, b, apoio, fict) {
    if (passo) track(ctx, passo);
    if (fict) ficticio(ctx);
    const sp = support(ctx, apoio);
    const tt = title(ctx, [{ t: a, c: W_ }, { t: b, c: Li, br: true }], L.titleTop, { lines: 2, max: 84 });
    CAIXAS.texto = [[M, tt.top - 6, M + CW, tt.bottom + 2], [M, sp.top - 6, M + CW, L.supportBottom + 14]];
    return { tt, sp, y0: tt.bottom + 34, y1: sp.top - 34 };            // a faixa da cena
  }
  // o fundo de cada cena (atrás de tudo): uma luz limão que respira devagar no meio da faixa da cena
  // (conferência do 02) a caixa de um elemento da conversa como aparece no quadro (com a escala/posição da mola)
  function marca(ctx, nome, x0, y0, x1, y1) {
    const m = ctx.getTransform(), ps = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
    (CAIXAS.conversa = CAIXAS.conversa || []).push([nome, Math.min(...ps.map((q) => q[0])), Math.min(...ps.map((q) => q[1])), Math.max(...ps.map((q) => q[0])), Math.max(...ps.map((q) => q[1]))]);
  }
  function palco(ctx, t, y0, y1, a = 1) { brilho(ctx, 540, (y0 + y1) / 2, 520, C.lime, (0.045 + 0.02 * Math.sin(TAU * t / DUR)) * a); }

  // =====================================================================
  // OS SLIDES
  // =====================================================================
  // 01 · capa: o título parado desde o quadro 0; embaixo, o letreiro de aeroporto vira R$ 300 → 360 → 450 → 300
  const CAPA_SEQ = (() => {
    // [instante, célula, sequência, passo]: as dezenas e as unidades de centena viram como no letreiro (sempre para a frente)
    return [
      [1.3, 4, ciclo('0', '6'), 0.075],                              // R$ 300 → R$ 360
      [3.7, 3, ciclo('3', '4'), 0.12], [3.7, 4, ciclo('6', '5'), 0.06],   // R$ 360 → R$ 450
      [6.5, 3, ciclo('4', '3'), 0.06], [6.5, 4, ciclo('5', '0'), 0.08],   // R$ 450 → R$ 300 (o loop)
    ];
  })();
  function letreiroCapa(t) {
    const cel = ['R', '$', ' ', '3', '0', '0'].map((c) => ({ de: c, para: c, k: 0 }));
    for (const [t0, i, seq, passo] of CAPA_SEQ) { if (t >= t0) cel[i] = flapEm(t, t0, seq, passo); }
    return cel;
  }
  const SLIDES = {
    1(ctx, t) {
      limeBackground(ctx);
      const tt = title(ctx, [{ t: 'Tarifa de', c: INK }, { t: 'dezembro:', c: INK, br: true }, { t: 'quando e', c: INK, br: true }, { t: 'quanto subir?', c: INK, br: true }], 0,
        { lines: 4, max: 140, maxH: 480, lh: 1.0, vcenter: [330, 790], maxW: CW - 8, x: M + 2 });
      const c = chip(ctx, M + 2, tt.top - 70, 'ALTA TEMPORADA', { size: 32, stroke: INK, color: INK, lw: 3, padX: 24 + 34 });
      const pr = 8 + 3 * (0.5 - 0.5 * Math.cos(TAU * t / 3));
      ctx.beginPath(); ctx.arc(c.left + 30, tt.top - 70, pr, 0, TAU); ctx.fillStyle = INK; ctx.fill();
      CAIXAS.texto = [[M, tt.top - 6, M + CW, tt.bottom + 2], [c.left + 52, tt.top - 70 - 32, c.left + c.w + 4, tt.top - 70 + 32]];
      // o letreiro (painel preto com sombra e reflexo)
      const bx = M, by = 846, bw = CW, bh = 250, cw = 124, ch = 158, gap = 14;
      ctx.save(); ctx.shadowColor = 'rgba(10,10,10,0.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
      rr(ctx, bx, by, bw, bh, 28); ctx.fillStyle = INK; ctx.fill(); ctx.restore();
      rr(ctx, bx + 6, by + 6, bw - 12, bh - 12, 24); ctx.strokeStyle = '#2A2A27'; ctx.lineWidth = 2; ctx.stroke();
      const cel = letreiroCapa(t), x0 = bx + (bw - (6 * cw + 5 * gap)) / 2, y0 = by + 56;
      cel.forEach((c_, i) => flapCell(ctx, x0 + i * (cw + gap), y0, cw, ch, c_.de, c_.para, c_.k, { size: 122 }));
      // o rótulo de cima: a faixa do preço (troca junto com a virada)
      const faixa = t < 1.55 || t >= 6.9 ? ['NORMAL', ''] : t < 4.05 ? ['ALTA', '+20%'] : t < 6.9 ? ['PICO', '+50%'] : ['NORMAL', ''];
      monoLab(ctx, 'DIÁRIA · ' + faixa[0], bx + 40, by + 40, C.lime, 24);
      if (faixa[1]) monoLab(ctx, faixa[1], bx + bw - 40, by + 40, C.lime, 24, 'right');
      // o reflexo que passa pelo vidro do letreiro a cada virada
      for (const tv of [1.3, 3.7, 6.5]) {
        const k = p(t, tv, tv + 0.9); if (k <= 0 || k >= 1) continue;
        ctx.save(); rr(ctx, bx, by, bw, bh, 28); ctx.clip();
        const xx = bx - 200 + (bw + 400) * eIO(k), g = ctx.createLinearGradient(xx - 120, 0, xx + 120, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh); ctx.restore();
      }
      setFont(ctx, MONO, 18, 700, 2, 'right'); ctx.fillStyle = '#5E5E59'; ctx.fillText('EXEMPLO FICTÍCIO', bx + bw - 40, by + bh - 12);
      swipe(ctx, INK, INK, t);
      LINHAS.push({ tag: 'letreiro', texto: 'R$ 300 → R$ 360 → R$ 450 → R$ 300', sozinha: false });
    },

    // 02 · o problema, em TELA DIVIDIDA: em cima (a) "subiu em cima da hora": a conversa esfria e fica visível, esmaecida;
    //      embaixo (b) "não subiu": 4 chalés LOTADO a R$ 300 e o contador do que deixou de entrar (até R$ 1.800).
    //      No estado final, as duas metades ficam na tela ao mesmo tempo.
    2(ctx, t) {
      ficticio(ctx);
      const tt = title(ctx, [{ t: 'Subir o preço em cima da hora assusta quem já perguntou.', c: W_ }, { t: 'Não subir deixa dinheiro na mesa.', c: Li, br: true }],
        166, { max: 66, maxH: 300, lh: 1.08 });
      CAIXAS.texto = [[M, tt.top - 6, M + CW, tt.bottom + 6]];
      const k0 = saida(t), YA = tt.bottom + 30, YD = YA + 498, YB = YD + 26;
      palco(ctx, t, YA, 1180, k0);
      camada(ctx, k0, () => {
        // ---- os rótulos das duas metades e o divisor
        camada(ctx, cl((t - 0.1) / 0.3), () => monoLab(ctx, 'SUBIU EM CIMA DA HORA', M, YA, AMB, 20, 'left', 3));
        const kd = eIO(p(t, 4.2, 4.8));
        if (kd > 0) {
          // o divisor: o rótulo "NÃO SUBIU" na própria linha, e a linha segue depois dele
          const lw_ = tw(ctx, 'NÃO SUBIU', MONO, 20, 800, 3) + 18;
          const g = ctx.createLinearGradient(M + lw_, 0, M + CW, 0); g.addColorStop(0, rgba(C.white, 0.22)); g.addColorStop(1, rgba(C.white, 0.02));
          ctx.fillStyle = g; ctx.fillRect(M + lw_, YD, (CW - lw_) * kd, 2); marca(ctx, 'divisor', M, YD - 8, M + CW, YD + 9);
          camada(ctx, kd, () => monoLab(ctx, 'NÃO SUBIU', M, YD + 8, C.gray, 20, 'left', 3));
        }
        // ---- (a) a conversa (fica na tela; no fim esmaece até 45%)
        const esm = 1 - 0.55 * eIO(p(t, 3.9, 4.6));
        camada(ctx, esm, () => {
          const XA = M + 88, R = M + CW, Y0 = YA + 22, SL = [0, 94, 188, 252, 346, 446], y = (i) => Y0 + SL[i], BS = { size: 34 }, SO = { semSubir: true };
          const bal = (nome, x, yy, txt, lado, o) => { const b = balao(ctx, x, yy, txt, lado, o); marca(ctx, nome, b.x0, b.y, b.x0 + b.w, b.y + b.h); return b; };
          const someAv = p(t, 3.55, 4.1);
          if (t >= 0.25) {
            camada(ctx, (1 - someAv) * cl((t - 0.25) / 0.2), () => avatar(ctx, M + 34, y(0) + 37, 32, C.gray));
            if (someAv > 0 && someAv < 1) for (let i = 0; i < 16; i++) {
              const a = hash(i, 9) * TAU, r = 10 + 80 * eOut(someAv) * hash(i, 4);
              ctx.beginPath(); ctx.arc(Math.max(M + 4, M + 34 + Math.cos(a) * r * 0.6 + 30 * someAv), y(0) + 37 + Math.sin(a) * r * 0.6 - 40 * someAv, 2.4, 0, TAU);
              ctx.fillStyle = rgba(C.gray, 1 - someAv); ctx.fill();
            }
          }
          surge(ctx, t, 0.3, XA, y(0), () => bal('pergunta', XA, y(0), 'Quanto fica a diária no Natal?', 'esq', BS), SO);
          surge(ctx, t, 0.95, R, y(1), () => bal('R$ 300', R, y(1), 'R$ 300', 'dir', BS), SO);
          surge(ctx, t, 1.55, 540, y(2), () => {
            const w = tw(ctx, '3 DIAS DEPOIS', MONO, 22, 800, 3) + 90;
            marca(ctx, '3 dias depois', 540 - w / 2, y(2), 540 + w / 2, y(2) + 44);
            rr(ctx, 540 - w / 2, y(2), w, 44, 22); ctx.fillStyle = '#161615'; ctx.fill(); ctx.strokeStyle = '#3A3A36'; ctx.lineWidth = 2; ctx.stroke();
            relogio(ctx, 540 - w / 2 + 28, y(2) + 22, 12, C.gray, -Math.PI / 2 + TAU * 3 * eIO(p(t, 1.6, 2.3)));
            monoLab(ctx, '3 DIAS DEPOIS', 540 - w / 2 + 52, y(2) + 30, C.gray, 22);
          }, { dy: 10, semSubir: true });
          surge(ctx, t, 2.2, R, y(3), () => bal('R$ 450', R, y(3), 'Agora está R$ 450', 'dir', BS), SO);
          const tr = t > 2.9 && t < 3.4 ? 5 * Math.sin((t - 2.9) * 60) * (1 - p(t, 2.9, 3.4)) : 0;
          surge(ctx, t, 2.9, XA, y(4), () => {
            ctx.save(); ctx.translate(tr, 0);
            const b = bal('Ué', XA, y(4), 'Ué, semana passada era 300…', 'esq', { borda: AMB, bw: 3.5, fundo: '#1F1B12', size: 34 });
            // o selo "!" no canto superior direito do balão âmbar: o topo dele alinha com o topo do balão (não invade o vão)
            const sx_ = b.x0 + b.w - 2, sy_ = b.y + 16;
            brilho(ctx, sx_, sy_, 48, AMB, 0.3);
            ctx.beginPath(); ctx.arc(sx_, sy_, 16, 0, TAU); ctx.fillStyle = AMB; ctx.fill();
            setFont(ctx, DISPLAY, 24, 900, 0, 'center'); ctx.fillStyle = INK; ctx.fillText('!', sx_, sy_ + 8);
            marca(ctx, 'selo !', sx_ - 16, sy_ - 16, sx_ + 16, sy_ + 16);
            ctx.restore();
          }, SO);
          // "visualizado ✓✓": abaixo do balão âmbar, alinhado à esquerda dele (base em y(5); topo das letras 15 px acima)
          CAIXAS.visualizado = y(5) + 4; CAIXAS.divisor = YD;
          surge(ctx, t, 3.45, XA, y(5) - 15, () => {
            monoLab(ctx, 'VISUALIZADO', XA, y(5), C.gray, 20, 'left', 2);
            const xx = XA + tw(ctx, 'VISUALIZADO', MONO, 20, 800, 2) + 12;
            ctx.strokeStyle = C.gray; ctx.lineWidth = 3; ctx.lineCap = 'round';
            for (const d of [0, 11]) { ctx.beginPath(); ctx.moveTo(xx + d, y(5) - 6); ctx.lineTo(xx + d + 6, y(5)); ctx.lineTo(xx + d + 16, y(5) - 12); ctx.stroke(); }
            marca(ctx, 'visualizado', XA, y(5) - 15, xx + 29, y(5) + 4);
          }, { dy: 6, semSubir: true });
        });
        // ---- (b) à esquerda, os 4 chalés (2 × 2) acendem LOTADO a R$ 300; à direita, o contador e a mesa
        if (t >= 4.4) {
          const xs = [M + 100, M + 340, M + 580, M + 820], yb = YB + 180;
          CAIXAS.protegidas = xs.map((x) => [x - 80, yb - 180, x + 80, yb + 14]).concat([[M, YB + 210, M + 470, YB + 356]]);
          xs.forEach((x, i) => {
            const a0 = 4.5 + i * 0.12, tr_ = eOut(p(t, a0, a0 + 0.6)), ac = eOut(p(t, 5.2 + i * 0.18, 5.5 + i * 0.18));
            const tremula = ac >= 1 ? 0.85 + 0.15 * Math.sin(t * 3 + i * 1.7) : ac;
            camada(ctx, cl((t - a0) / 0.2), () => chale(ctx, x, yb - 30, 124, ac > 0 ? C.white : C.gray, { traco: tr_, aceso: tremula }));
            surge(ctx, t, 5.2 + i * 0.18, x, yb - 150, () => {
              const s_ = 'LOTADO', w = tw(ctx, s_, MONO, 20, 800, 2) + 26;
              rr(ctx, x - w / 2, yb - 176, w, 36, 18); ctx.fillStyle = C.lime; ctx.fill();
              setFont(ctx, MONO, 20, 800, 2, 'center'); ctx.fillStyle = INK; ctx.fillText(s_, x, yb - 151);
            }, { dy: 12 });
            surge(ctx, t, 5.35 + i * 0.18, x, yb, () => monoLab(ctx, 'R$ 300', x, yb + 6, C.white, 26, 'center', 1), { dy: 8 });
          });
          const xc = M, xm = M + 520, xr = M + CW;
          surge(ctx, t, 5.9, xc, YB + 268, () => {
            monoLab(ctx, 'DEIXOU DE ENTRAR', xc, YB + 236, C.gray, 22, 'left');
            const v = 1800 * eOut(p(t, 6.05, 7.5));
            brilho(ctx, xc + 220, YB + 288, 280, AMB, 0.12 + 0.04 * Math.sin(t * 4));
            odometro(ctx, v, 1800, xc - 4, YB + 314, 86, { cor: AMB });
            monoLab(ctx, '4 CHALÉS × 3 NOITES × R$ 150', xc, YB + 350, C.grayM, 20, 'left', 2);
          }, { dy: 16 });
          // a mesa (à direita) e as moedas/notas que escapam dela (somem antes da margem)
          const ym = YB + 340;
          camada(ctx, cl((t - 6.0) / 0.3), () => {
            const mesaFim = xr - 210; rr(ctx, xm, ym, mesaFim - xm, 10, 5); ctx.fillStyle = '#2C2C29'; ctx.fill();
            for (let i = 0; i < 7; i++) { const x = xm + 30 + i * 20; for (let j = 0; j < 3 - (i % 2); j++) { ctx.beginPath(); ctx.ellipse(x, ym - 8 - j * 9, 18, 6, 0, 0, TAU); ctx.fillStyle = rgba(C.lime, 0.85); ctx.fill(); } }
            for (let i = 0; i < 28; i++) {
              const nasc = 6.2 + i * 0.16, life = 1.3, u = (t - nasc) / life;
              if (u <= 0 || u >= 1) continue;
              // da ponta da mesa para a direita, caindo um pouco (nunca sobe até os chalés nem vai para o contador; para
              // antes do canto do ícone de som: com a mesa nesta altura, x + 24 ≤ 940)
              const sx = mesaFim - 40 + 30 * hash(i, 2), ex = 860 + 52 * hash(i, 3), ey = ym + 2 + 4 * hash(i, 6);
              const x = sx + (ex - sx) * eOut(u), yv = ym - 18 + (ey - ym + 18) * eIn(u) - 10 * Math.sin(Math.PI * u), al = Math.sin(Math.PI * u) * 0.9;
              if (x > 982) continue;
              (CAIXAS.moedas = CAIXAS.moedas || []).push([x, yv, 24]);
              ctx.save(); ctx.translate(x, yv); ctx.rotate((hash(i, 8) - 0.5) * 3 * u); ctx.globalAlpha *= al;
              if (i % 3) { ctx.beginPath(); ctx.ellipse(0, 0, 15, 15, 0, 0, TAU); ctx.strokeStyle = C.lime; ctx.lineWidth = 3; ctx.stroke(); setFont(ctx, MONO, 15, 800, 0, 'center'); ctx.fillStyle = C.lime; ctx.fillText('$', 0, 5); }
              else { rr(ctx, -22, -12, 44, 24, 4); ctx.strokeStyle = C.lime; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.stroke(); }
              ctx.restore();
            }
          });
          faiscas(ctx, t, [M, YB + 10, M + CW, YB + 200], 16, C.lime, 21, cl((t - 6) / 0.5));
        }
      });
      LINHAS.push({ tag: 'dados', texto: 'R$ 300 → R$ 450 · LOTADO R$ 300 × 4 · 4 chalés × 3 noites × R$ 150 = R$ 1.800', sozinha: false });
    },

    // 03 · as datas: o calendário de dezembro monta em cascata; uma onda pinta as faixas; o pico acende com ícones
    3(ctx, t) {
      const { y0, y1 } = topo(ctx, 1, 'Separe as datas', 'por demanda.', 'Normal, alta e pico, cada uma com o seu valor.');
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        const gap = 12, cw = (CW - 6 * gap) / 7, chh = 100, gy = y0 + 50, dow = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        dow.forEach((d, i) => camada(ctx, cl((t - 0.1 - i * 0.04) / 0.3), () => monoLab(ctx, d, M + i * (cw + gap) + cw / 2, gy - 16, C.grayM, 22, 'center', 0)));
        // dezembro de 2026 começa numa terça
        for (let d = 1; d <= 31; d++) {
          const pos = d + 1, col = pos % 7, row = Math.floor(pos / 7), x = M + col * (cw + gap), y = gy + row * (chh + gap);
          const a0 = 0.2 + (col + row) * 0.07, k = mola(t, a0, 0.5);
          if (t < a0) continue;
          const f = faixaDe(d), onda = 1.6 + (col * 0.6 + row) * 0.12, pin = eOut(p(t, onda, onda + 0.35));
          const cor = f === 'pico' ? C.lime : f === 'alta' ? OFF : '#3A3A37';
          ctx.save(); ctx.translate(x + cw / 2, y + chh / 2); ctx.scale(0.5 + 0.5 * k, 0.5 + 0.5 * k); ctx.globalAlpha *= cl((t - a0) / 0.15);
          rr(ctx, -cw / 2, -chh / 2, cw, chh, 14); ctx.fillStyle = '#161615'; ctx.fill();
          if (pin > 0) { ctx.save(); rr(ctx, -cw / 2, -chh / 2, cw, chh, 14); ctx.clip(); ctx.fillStyle = cor; ctx.fillRect(-cw / 2, chh / 2 - chh * pin, cw, chh * pin); ctx.restore(); }
          rr(ctx, -cw / 2, -chh / 2, cw, chh, 14); ctx.strokeStyle = '#2C2C29'; ctx.lineWidth = 2; ctx.stroke();
          const escuro = pin > 0.6 && f !== 'normal';
          setFont(ctx, MONO, 34, 800, 0, 'left'); ctx.fillStyle = escuro ? INK : C.white; ctx.fillText(String(d), -cw / 2 + 14, -chh / 2 + 42);
          // os ícones do pico (árvore no 24–25, fogos no 30–31) e o brilho que pulsa
          if (f === 'pico') {
            const ki = eOut(p(t, 3.3 + (d % 2) * 0.12, 3.9 + (d % 2) * 0.12));
            if (ki > 0) {
              if (d <= 25) arvore(ctx, cw / 2 - 30, chh / 2 - 12, 40, INK, ki); else fogos(ctx, cw / 2 - 30, chh / 2 - 30, 46, INK, ki);
            }
          }
          ctx.restore();
          if (f === 'pico' && t > 3.6) brilho(ctx, x + cw / 2, y + chh / 2, 110, C.lime, 0.16 + 0.1 * Math.sin(TAU * (t - 3.6) / 1.4));
        }
        // a frente da onda (uma faixa de luz que atravessa o calendário)
        const ko = p(t, 1.5, 2.9);
        if (ko > 0 && ko < 1) { const xx = M - 100 + (CW + 300) * eIO(ko); brilho(ctx, xx, gy + 2.5 * (chh + gap), 260, C.white, 0.08); }
        // a legenda das três faixas
        const ly = gy + 5 * (chh + gap) + 34, itens = [['NORMAL', '#5E5E59'], ['ALTA · 18–23 E 26–29', OFF], ['PICO · 24–25 E 30–31', C.lime]];
        let x = M;
        itens.forEach(([s, cor], i) => {
          surge(ctx, t, 4.0 + i * 0.15, x + 20, ly, () => { rr(ctx, x, ly - 24, 30, 30, 8); ctx.fillStyle = cor; ctx.fill(); monoLab(ctx, s, x + 42, ly, C.white, 22, 'left', 2); }, { dy: 10 });
          x += 42 + tw(ctx, s, MONO, 22, 800, 2) + 34;
        });
      });
    },

    // 04 · os valores: uma escada de três degraus; o chalé sobe e, em cada degrau, cai uma etiqueta balançando
    4(ctx, t) {
      const { y0, y1 } = topo(ctx, 2, 'Defina o valor de cada', 'faixa antes de abrir.', 'Preço pensado com calma, resposta rápida no WhatsApp.', true);
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        const base = y1 + 10, gx = 14, sw = (CW - 2 * gx) / 3, alt = [120, 240, 360], x0 = M;
        const DEG = [['NORMAL', 300, '', '#5E5E59'], ['ALTA', 360, '+20%', OFF], ['PICO', 450, '+50%', C.lime]];
        // os degraus sobem do chão, em sequência (com um pouco de profundidade: a face de cima mais clara)
        DEG.forEach(([lab, , , cor], i) => {
          const k = mola(t, 0.2 + i * 0.15, 0.6), x = x0 + i * (sw + gx), h = alt[i] * k, top = base - h;
          if (k <= 0) return;
          rr(ctx, x, top, sw, h, 14); ctx.fillStyle = '#171716'; ctx.fill(); ctx.strokeStyle = '#2C2C29'; ctx.lineWidth = 2; ctx.stroke();
          rr(ctx, x, top, sw, 16, 8); ctx.fillStyle = cor; ctx.fill();
          if (h > 50) monoLab(ctx, lab, x + sw / 2, Math.min(base - 24, top + 66), C.gray, 28, 'center');
        });
        // o chalé pula de degrau em degrau (amassa ao cair, estica ao pular)
        const pulos = [0.9, 2.3, 3.7], pos = (i) => [x0 + i * (sw + gx) + sw / 2, base - alt[i]];
        let cx = x0 + sw / 2 - 60, cy = base, sq = 1;
        if (t >= 0.6) {
          cx = x0 + sw / 2 - 60 * (1 - eOut(p(t, 0.6, 0.9))); cy = base;
          pulos.forEach((tp, i) => {
            const [px, py] = pos(i), [ax, ay] = i ? pos(i - 1) : [x0 + sw / 2 - 60, base];
            const u = p(t, tp, tp + 0.45);
            if (u > 0) { cx = ax + (px - ax) * eIO(u); cy = ay + (py - ay) * u - 150 * Math.sin(Math.PI * u); }
            const pouso = t - (tp + 0.45);
            if (pouso > 0 && pouso < 0.4) sq = 1 - 0.18 * Math.sin(Math.PI * pouso / 0.4) * Math.exp(-pouso * 4);
          });
        }
        if (t >= 0.6) camada(ctx, cl((t - 0.6) / 0.2), () => {
          ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + (1 - sq) * 0.6, sq); brilho(ctx, 0, -60, 130, C.lime, 0.22); chale(ctx, 0, 0, 132, C.lime, { aceso: 1 }); ctx.restore();
        });
        // as etiquetas caem e balançam presas por um fio (o número rola até o valor)
        DEG.forEach(([lab, v, pct, cor], i) => {
          const tc = pulos[i] + 0.5; if (t < tc) return;
          const [px, py] = pos(i), tw_ = 244, th_ = 112, topoFio = py - 132 - 36 - th_ - 70, cai = eOut(p(t, tc, tc + 0.35)), dt = t - tc;
          const ang = 0.14 * Math.exp(-dt * 1.6) * Math.sin(dt * 7) + 0.02 * Math.sin(t * 1.8 + i);
          const fio = 30 + 40 * cai;
          ctx.save(); ctx.beginPath(); ctx.rect(M - 20, y0 - 4, CW + 40, y1 - y0 + 60); ctx.clip();
          ctx.translate(px, topoFio - 60 * (1 - cai)); ctx.rotate(ang); ctx.globalAlpha *= cl(dt / 0.15);
          ctx.strokeStyle = '#5E5E59'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, fio); ctx.stroke();
          const ty = fio;
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
          ctx.beginPath(); ctx.moveTo(-tw_ / 2, ty + 18); ctx.lineTo(-tw_ / 2 + 18, ty); ctx.lineTo(tw_ / 2 - 18, ty); ctx.lineTo(tw_ / 2, ty + 18); ctx.lineTo(tw_ / 2, ty + th_); ctx.lineTo(-tw_ / 2, ty + th_); ctx.closePath();
          ctx.fillStyle = i === 2 ? C.lime : '#1C1C1A'; ctx.fill(); ctx.shadowColor = 'transparent';
          ctx.strokeStyle = i === 2 ? C.lime : cor; ctx.lineWidth = 3; ctx.stroke();
          ctx.beginPath(); ctx.arc(0, ty + 14, 6, 0, TAU); ctx.strokeStyle = i === 2 ? INK : cor; ctx.stroke();
          odometro(ctx, v * eOut(p(t, tc + 0.1, tc + 0.9)), v, 0, ty + 88, 54, { cor: i === 2 ? INK : C.white, align: 'center' });
          ctx.restore();
          // o selo do aumento, preso no canto de cima da etiqueta (um "badge")
          if (pct) surge(ctx, t, tc + 0.8, px + 108, topoFio + 70, () => {
            const w = tw(ctx, pct, MONO, 26, 800, 1) + 28, xx = Math.min(px + tw_ / 2 - w + 22, M + CW - w), yy = topoFio + 70 - 26;
            ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16;
            rr(ctx, xx, yy, w, 42, 21); ctx.fillStyle = i === 2 ? INK : OFF; ctx.fill(); ctx.restore();
            setFont(ctx, MONO, 26, 800, 1, 'center'); ctx.fillStyle = i === 2 ? C.lime : INK; ctx.fillText(pct, xx + w / 2, yy + 30);
          }, { dy: 10 });
        });
        if (t > 4.6) { const kb = p(t, 4.5, 5.3); faiscas(ctx, t, [x0 + 2 * (sw + gx), Math.max(y0 + 20, base - alt[2] - 420), x0 + 3 * sw + 2 * gx - 20, base - alt[2] - 60], 16, C.lime, 44, kb); }
      });
      LINHAS.push({ tag: 'dados', texto: 'NORMAL R$ 300 · ALTA R$ 360 +20% · PICO R$ 450 +50%', sozinha: false });
    },

    // 05 · a reserva confirmada: o quadro de preços vira para R$ 360; o ticket de outubro, carimbado, NÃO muda; sai um
    //      ticket novo impresso com R$ 360
    5(ctx, t) {
      const { y0, y1 } = topo(ctx, 3, 'Reserva confirmada fica', 'com o valor combinado.', 'Tabela nova vale só para reserva nova.', true);
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        // o quadro de preços (split-flap), em cima
        const by = y0 + 6, bh = 170;
        surge(ctx, t, 0.2, 540, by + bh / 2, () => {
          rr(ctx, M, by, CW, bh, 24); ctx.fillStyle = '#121211'; ctx.fill(); ctx.strokeStyle = '#2C2C29'; ctx.lineWidth = 2; ctx.stroke();
          monoLab(ctx, 'TABELA · DIÁRIA DE DEZEMBRO', M + 32, by + 40, C.lime, 22);
          const cel = ['R', '$', ' ', '3', '0', '0'].map((c) => ({ de: c, para: c, k: 0 }));
          if (t >= 3.0) cel[4] = flapEm(t, 3.0, ciclo('0', '6'), 0.075);
          const cw = 74, ch = 100, gap = 10, x0 = M + CW - 32 - (6 * cw + 5 * gap);
          cel.forEach((c_, i) => { if (c_.para === ' ' && c_.de === ' ') return; flapCell(ctx, x0 + i * (cw + gap), by + 52, cw, ch, c_.de, c_.para, c_.k, { size: 78 }); });
          const nova = t >= 3.5;
          monoLab(ctx, nova ? 'NOVA' : 'ATUAL', M + 32, by + 140, nova ? C.lime : C.gray, 24);
        }, { dy: 16 });
        // os dois tickets, do MESMO tamanho: o de outubro (à esquerda), carimbado, e o novo, que sai da impressora (à direita)
        const pty = by + bh + 34, ty = pty + 50, tw_ = 400, th_ = y1 - ty, ox = M + 20, px = M + CW / 2 + 20, pw = CW / 2 - 20, nx = px + (pw - tw_) / 2;
        const ticket = (x, y, linhas, rodape) => {
          ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let i = 0; i <= 16; i++) ctx.lineTo(x + (tw_ / 16) * i, y + (i % 2 ? 10 : 0));       // a borda serrilhada de cima
          ctx.lineTo(x + tw_, y + th_); ctx.lineTo(x, y + th_); ctx.closePath(); ctx.fillStyle = OFF; ctx.fill(); ctx.restore();
          linhas.forEach(([s_, sz, c_, yy]) => { setFont(ctx, MONO, sz, 800, 1); ctx.fillStyle = c_; ctx.fillText(s_, x + 32, y + yy); });
          ctx.strokeStyle = 'rgba(10,10,10,0.18)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 32, y + 162); ctx.lineTo(x + tw_ - 32, y + 162); ctx.stroke(); ctx.setLineDash([]);
          if (rodape === 'barras') for (let k = 0; k < 34; k++) { const w = 2 + 4 * hash(k, 31); ctx.fillStyle = INK; ctx.fillRect(x + 32 + k * 10, y + th_ - 92, w, 54); }
        };
        surge(ctx, t, 0.7, ox + tw_ / 2, ty + th_ / 2, () => {
          ticket(ox, ty, [['RESERVA · FEITA EM', 24, '#5E5E59', 62], ['OUTUBRO', 48, INK, 124], ['CHALÉ 2 · 3 NOITES', 24, '#5E5E59', 210], ['ENTRADA 26/12', 24, '#5E5E59', 250]]);
        });
        carimbo(ctx, ox + tw_ / 2, ty + th_ - 70, 'CONFIRMADA · R$ 300', -0.08, '#2E7D16', t, 1.6, { size: 28, pad: 22 });
        // quando o quadro vira, o ticket de outubro não muda: um cadeado acende e pulsa no canto dele
        if (t > 3.1) { const kp = p(t, 3.1, 3.5), pul = 0.5 + 0.5 * Math.sin(TAU * (t - 3.1) / 1.6);
          camada(ctx, kp, () => { brilho(ctx, ox + tw_ - 44, ty + 58, 80, C.lime, 0.22 + 0.15 * pul);
            ctx.save(); ctx.translate(ox + tw_ - 48, ty + 60); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
            rr(ctx, -18, -4, 36, 28, 5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -4, 11, Math.PI, 0); ctx.stroke(); ctx.restore(); }); }
        // a impressora e o ticket novo saindo dela (o mesmo tamanho do de outubro)
        surge(ctx, t, 3.7, px + pw / 2, pty + 32, () => {
          rr(ctx, px, pty, pw, 64, 18); ctx.fillStyle = '#1F1F1D'; ctx.fill(); ctx.strokeStyle = '#3A3A36'; ctx.lineWidth = 2; ctx.stroke();
          rr(ctx, nx - 8, pty + 44, tw_ + 16, 8, 4); ctx.fillStyle = INK; ctx.fill();
          ctx.beginPath(); ctx.arc(px + pw - 30, pty + 22, 6, 0, TAU); ctx.fillStyle = t > 4.0 && t < 5.6 ? C.lime : '#3A3A36'; ctx.fill();
        }, { dy: 10 });
        const sai_ = eIO(p(t, 4.1, 5.5));
        if (sai_ > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(nx - 20, pty + 50, tw_ + 40, th_ + 40); ctx.clip();
          ctx.translate(0, -(1 - sai_) * th_);
          ticket(nx, ty, [['RESERVA NOVA', 24, '#5E5E59', 62], ['R$ 360', 60, INK, 134], ['TABELA NOVA', 24, '#5E5E59', 210], ['ENTRADA 27/12', 24, '#5E5E59', 250]], 'barras');
          ctx.restore();
          if (sai_ >= 1) { const kk = p(t, 5.5, 5.9); brilho(ctx, nx + tw_ / 2, ty + th_ / 2, 220, C.lime, 0.14 * kk + 0.05 * Math.sin(t * 3)); }
        }
      });
      LINHAS.push({ tag: 'dados', texto: 'TABELA R$ 300 → R$ 360 · OUTUBRO CONFIRMADA R$ 300 · RESERVA NOVA R$ 360', sozinha: false });
    },

    // 06 · a mesma tabela: a tabela emite pulsos sincronizados para o WhatsApp, o Instagram e a recepção (rótulos, sem
    //      logos); os três acendem R$ 360 no mesmo instante, com um clique de sincronia
    6(ctx, t) {
      const { y0, y1 } = topo(ctx, 4, 'A mesma tabela', 'em todo lugar.', 'WhatsApp, Instagram e recepção falando o mesmo preço.', true);
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        const tx = 540, ty = y0 + 20, tW = 380, tH = 230;
        surge(ctx, t, 0.2, tx, ty + tH / 2, () => {
          ctx.save(); ctx.shadowColor = rgba(C.lime, 0.25); ctx.shadowBlur = 40;
          rr(ctx, tx - tW / 2, ty, tW, tH, 22); ctx.fillStyle = '#151514'; ctx.fill(); ctx.restore();
          rr(ctx, tx - tW / 2, ty, tW, tH, 22); ctx.strokeStyle = C.lime; ctx.lineWidth = 2.5; ctx.stroke();
          monoLab(ctx, 'TABELA', tx - tW / 2 + 28, ty + 40, C.lime, 22);
          [['NORMAL', 'R$ 300'], ['ALTA', 'R$ 360'], ['PICO', 'R$ 450']].forEach(([a, b], i) => {
            const yy = ty + 92 + i * 46, dest = i === 1;
            if (dest) { rr(ctx, tx - tW / 2 + 16, yy - 32, tW - 32, 44, 10); ctx.fillStyle = rgba(C.lime, 0.16); ctx.fill(); }
            monoLab(ctx, a, tx - tW / 2 + 28, yy, dest ? C.white : C.gray, 22, 'left', 2); monoLab(ctx, b, tx + tW / 2 - 28, yy, dest ? C.lime : C.gray, 24, 'right', 0);
          });
        });
        // os três pontos (embaixo): balão de conversa, mensagem direta e a placa do balcão
        const ey = y1 - 210, ew = 280, gx = (CW - 3 * ew) / 2;
        const PT = [['WHATSAPP', 'balao'], ['INSTAGRAM', 'direct'], ['RECEPÇÃO', 'placa']];
        const SYNC = 2.9;
        PT.forEach(([lab, tipo], i) => {
          const ex = M + i * (ew + gx), ecx = ex + ew / 2;
          // a linha da tabela até o ponto (se desenha) e os pulsos que correm nela, chegando juntos
          const ax = tx + (i - 1) * 110, ay = ty + tH, bx = ecx, byy = ey - 14;
          const path = (u) => { const cx1 = ax, cy1 = ay + 120, cx2 = bx, cy2 = byy - 120; const v = 1 - u;
            return [v * v * v * ax + 3 * v * v * u * cx1 + 3 * v * u * u * cx2 + u * u * u * bx, v * v * v * ay + 3 * v * v * u * cy1 + 3 * v * u * u * cy2 + u * u * u * byy]; };
          const kd = eIO(p(t, 0.7, 1.5));
          if (kd > 0) { ctx.save(); ctx.strokeStyle = rgba(C.lime, 0.35); ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.beginPath();
            for (let s = 0; s <= 40 * kd; s++) { const [x, y] = path(s / 40); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore(); }
          for (const t0 of [1.6, 2.15]) { const u = p(t, t0, t0 + 0.75); if (u > 0 && u < 1) { const [x, y] = path(eIO(u)); brilho(ctx, x, y, 40, C.lime, 0.6); ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fillStyle = C.lime; ctx.fill(); } }
          // pulsos ambientes depois da sincronia (sempre juntos)
          if (t > 4.2) { const u = ((t - 4.2) % 1.6) / 1.1; if (u < 1) { const [x, y] = path(eIO(u)); ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fillStyle = rgba(C.lime, 0.8 * Math.sin(Math.PI * u)); ctx.fill(); } }
          surge(ctx, t, 0.9 + i * 0.12, ecx, ey + 90, () => {
            const on = t >= SYNC, fl = on ? 1 - p(t, SYNC, SYNC + 0.5) : 0;
            rr(ctx, ex, ey, ew, 200, 24); ctx.fillStyle = '#151514'; ctx.fill(); ctx.strokeStyle = on ? C.lime : '#3A3A36'; ctx.lineWidth = on ? 3 : 2; ctx.stroke();
            if (fl > 0) brilho(ctx, ecx, ey + 100, 200, C.lime, 0.35 * fl);
            ctx.save(); ctx.translate(ex + 50, ey + 50); ctx.strokeStyle = on ? C.lime : C.gray; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            if (tipo === 'balao') { ctx.beginPath(); ctx.roundRect(-22, -18, 44, 32, 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-12, 14); ctx.lineTo(-18, 24); ctx.lineTo(-2, 14); ctx.stroke(); }
            else if (tipo === 'direct') { ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(22, -20); ctx.lineTo(8, 22); ctx.lineTo(2, 4); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(22, -20); ctx.stroke(); }
            else { ctx.beginPath(); ctx.roundRect(-24, -20, 48, 30, 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-12, 10); ctx.lineTo(-18, 26); ctx.moveTo(12, 10); ctx.lineTo(18, 26); ctx.stroke(); }
            ctx.restore();
            monoLab(ctx, lab, ex + 88, ey + 60, on ? C.white : C.gray, 22, 'left', 2);
            if (on) { const ks = mola(t, SYNC, 0.5); ctx.save(); ctx.translate(ecx, ey + 140); ctx.scale(ks, ks);
              setFont(ctx, MONO, 52, 800, 0, 'center'); ctx.fillStyle = C.lime; ctx.fillText('R$ 360', 0, 18); ctx.restore(); }
            else { monoLab(ctx, '· · ·', ecx, ey + 152, '#3A3A36', 40, 'center', 0); }
          }, { dy: 14 });
        });
        // o "clique" de sincronia: um anel que sai da tabela no instante em que os três acendem
        const kr = p(t, SYNC, SYNC + 0.7);
        if (kr > 0 && kr < 1) { ctx.save(); ctx.beginPath(); ctx.rect(M - 10, y0 - 4, CW + 20, y1 - y0 + 60); ctx.clip(); ctx.beginPath(); ctx.arc(tx, ty + tH / 2, 60 + 420 * eOut(kr), 0, TAU); ctx.strokeStyle = rgba(C.lime, 0.5 * (1 - kr)); ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); }
      });
      LINHAS.push({ tag: 'dados', texto: 'WHATSAPP · INSTAGRAM · RECEPÇÃO = R$ 360', sozinha: false });
    },

    // 07 · como vendeu: o mapa de ocupação (6 chalés × 31 dias) preenche com reservas; depois se recolhe nas três barras
    7(ctx, t) {
      const { y0, y1 } = topo(ctx, 5, 'Anote como', 'cada faixa vendeu.', 'É essa anotação que ajusta a tabela do ano que vem.', true);
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        const lab = 70, cw = (CW - lab) / 31, ch = 74, rg = 12, gy = y0 + 64, mapa = MAPA();
        const morph = eIO(p(t, 3.5, 4.7)), ocultaMapa = 1 - p(t, 3.4, 3.8);
        // o cursor do dia percorre dezembro (0,3 → 2,9 s): cada reserva entra quando ele passa pelo primeiro dia dela
        const cur = eIO(p(t, 0.3, 2.9)) * 31, apDe = (c) => 0.3 + (c.d0 / 31) * 2.6;
        // o mapa: as linhas dos chalés (ícone + número), as colunas do pico destacadas, os dias de referência
        camada(ctx, ocultaMapa * eOut(p(t, 0.0, 0.35)), () => {
          monoLab(ctx, 'OCUPAÇÃO · DEZEMBRO', M, gy - 40, C.gray, 22);
          // as noites vendidas, rolando enquanto as reservas entram
          const vend = mapa.reduce((a, c) => a + c.n * eOut(p(t, apDe(c), apDe(c) + 0.3)), 0);
          odometro(ctx, vend, 128, M + CW, gy - 40, 30, { pre: '', suf: ' / 186 NOITES', cor: C.lime, align: 'right', zeros: false });
          for (const d of [24, 25, 30, 31]) { rr(ctx, M + lab + (d - 1) * cw, gy - 6, cw, 6 * (ch + rg) + 2, 6); ctx.fillStyle = rgba(C.lime, 0.07); ctx.fill(); }
          for (const d of [1, 8, 15, 18, 24, 31]) monoLab(ctx, String(d), M + lab + (d - 0.5) * cw, gy - 12, C.grayD, 16, 'center', 0);
          for (let r = 0; r < 6; r++) {
            const ry = gy + r * (ch + rg);
            chale(ctx, M + 18, ry + ch / 2 + 14, 32, C.grayM, { lw: 2.5 });
            monoLab(ctx, String(r + 1), M + 46, ry + ch / 2 + 10, C.grayM, 22, 'left', 0);
            for (let d = 0; d < 31; d++) { rr(ctx, M + lab + d * cw + 1, ry, cw - 2, ch, 4); ctx.fillStyle = '#141413'; ctx.fill(); }
          }
          // o cursor (uma linha de luz)
          if (t > 0.3 && t < 3.3) {
            const xx = M + lab + cur * cw, a_ = 1 - p(t, 2.9, 3.3);
            brilho(ctx, xx, gy + 3 * (ch + rg), 120, C.lime, 0.18 * a_);
            ctx.fillStyle = rgba(C.lime, 0.8 * a_); ctx.fillRect(xx - 1.5, gy - 8, 3, 6 * (ch + rg) + 6);
          }
        });
        // as barras de destino (cada faixa: a ocupação dela)
        const bw = 230, bH = 380, bx = (i) => M + 40 + i * ((CW - 80 - bw) / 2), bb = y1 - 40;
        const BAR = [['NORMAL', 55, '#6E6E68'], ['ALTA', 80, OFF], ['PICO', 100, C.lime]];
        mapa.forEach((c, j) => {
          const ap = apDe(c), k = mola(t, ap, 0.45); if (t < ap) return;
          const x0 = M + lab + c.d0 * cw + 2, y0_ = gy + c.r * (ch + rg), w0 = c.n * cw - 4;
          const fi = c.faixa === 'normal' ? 0 : c.faixa === 'alta' ? 1 : 2, cor = BAR[fi][2];
          if (morph <= 0) { const hh = ch * k; rr(ctx, x0, y0_ + (ch - hh) / 2, w0, hh, 6); ctx.fillStyle = cor; ctx.fill();
            if (t - ap < 0.4) brilho(ctx, x0 + w0 / 2, y0_ + ch / 2, 40, C.white, 0.25 * (1 - (t - ap) / 0.4)); return; }
          // o recolhimento: cada bloco voa para dentro da barra da faixa dele, encolhendo
          const tx = bx(fi) + bw * (0.15 + 0.7 * hash(j, 1)), ty = bb - bH * BAR[fi][1] / 100 * (0.1 + 0.85 * hash(j, 2));
          const m = eIO(cl(morph * 1.25 - hash(j, 3) * 0.25));
          const x = x0 + (tx - x0) * m, y = y0_ + (ty - y0_) * m - 80 * Math.sin(Math.PI * m), w = w0 + (16 - w0) * m;
          camada(ctx, 1 - p(morph, 0.85, 1), () => { rr(ctx, x, y, Math.max(8, w), ch * (1 - 0.5 * m), 5); ctx.fillStyle = cor; ctx.fill(); });
        });
        // as barras (crescem enquanto os blocos chegam) e os percentuais rolando
        BAR.forEach(([lb, v, cor], i) => {
          const kb = eOut(p(t, 3.8, 4.9)); if (kb <= 0) return;
          const h = bH * v / 100 * kb, x = bx(i);
          camada(ctx, cl((t - 3.6) / 0.3), () => {
            rr(ctx, x, bb - bH, bw, bH, 16); ctx.fillStyle = '#141413'; ctx.fill();
            rr(ctx, x, bb - h, bw, h, 16); ctx.fillStyle = cor; ctx.fill();
            odometro(ctx, v * kb, v, x + bw / 2, bb - h - 24, 58, { pre: '', suf: '%', cor: C.white, align: 'center', zeros: false });
            monoLab(ctx, lb, x + bw / 2, bb + 34, C.gray, 24, 'center');
          });
        });
        carimbo(ctx, bx(2) + bw / 2, bb - 190, 'LOTADO', -0.12, INK, t, 5.2, { size: 34, pad: 20 });
        if (t > 5.6) faiscas(ctx, t, [bx(2) - 30, bb - bH - 80, bx(2) + bw + 30, bb - 20], 14, C.lime, 77, p(t, 5.6, 6.2));
      });
      LINHAS.push({ tag: 'dados', texto: 'OCUPAÇÃO NORMAL 55% · ALTA 80% · PICO 100% · LOTADO', sozinha: false });
    },

    // 08 · o fecho: o calendário, a tabela e o carimbo (em miniatura) entram de profundidades diferentes, se juntam e
    //      viram a folha "TABELA DE DEZEMBRO" (as três faixas com os preços), que se inclina; o ícone de salvar surge na
    //      frente dela e pulsa. No estado final, a folha fica visível atrás do ícone.
    8(ctx, t) {
      ficticio(ctx);
      const tt = title(ctx, [{ t: 'Preço definido antes,', c: W_ }, { t: 'resposta rápida depois.', c: Li, br: true }], L.titleTop0 + 40, { max: 92, maxH: 300 });
      const sp = support(ctx, 'Salva pra montar a sua tabela.', { bottom: 1128, color: C.white, size: 44 });
      setFont(ctx, MONO, 28, 800, 1); ctx.fillStyle = C.grayM; ctx.fillText('@fazlohospeda', M, 1180);
      LINHAS.push({ tag: 'assinatura', texto: '@fazlohospeda', sozinha: false });
      CAIXAS.texto = [[M, tt.top - 6, M + CW, tt.bottom + 6], [M, sp.top - 6, M + 520, 1192]];
      const y0 = tt.bottom + 30, y1 = sp.top - 30, cy = (y0 + y1) / 2, k0 = saida(t);
      palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        const junta = eIO(p(t, 1.7, 2.5)), folha = eIO(p(t, 2.3, 3.0)), inclina = eIO(p(t, 3.1, 3.8));
        // as três miniaturas (parallax) se juntam no centro
        const MINI = [[-300, -60, 0.2, 'cal'], [0, -150, 0.45, 'tab'], [300, -30, 0.7, 'car']];
        if (folha < 1) MINI.forEach(([dx, dy, a0, tipo], i) => {
          const k = mola(t, a0, 0.6); if (k <= 0) return;
          const flut = 8 * Math.sin(t * 1.6 + i * 2), x = 540 + dx * (1 - junta) + (1 - k) * dx * 0.6, y = cy + dy * (1 - junta) + flut * (1 - junta) + (1 - k) * 60;
          const s_ = (1.05 - 0.12 * i) * (1 - 0.35 * junta);
          ctx.save(); ctx.translate(x, y); ctx.scale(s_, s_); ctx.rotate((i - 1) * 0.08 * (1 - junta)); ctx.globalAlpha *= cl((t - a0) / 0.2) * (1 - folha);
          rr(ctx, -120, -90, 240, 180, 18); ctx.fillStyle = '#171716'; ctx.fill(); ctx.strokeStyle = '#3A3A36'; ctx.lineWidth = 2; ctx.stroke();
          if (tipo === 'cal') { for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { rr(ctx, -96 + c * 33, -62 + r * 34, 27, 27, 5); ctx.fillStyle = (r === 3 && c > 3) ? C.lime : (r === 2 && c > 2) ? OFF : '#3A3A37'; ctx.fill(); } }
          else if (tipo === 'tab') { [['NORMAL', '300'], ['ALTA', '360'], ['PICO', '450']].forEach(([a, b], j) => { monoLab(ctx, a, -96, -36 + j * 46, C.gray, 18, 'left', 1); monoLab(ctx, b, 96, -36 + j * 46, j === 2 ? C.lime : C.white, 22, 'right', 0); }); }
          else { ctx.save(); ctx.rotate(-0.12); rr(ctx, -90, -30, 180, 60, 10); ctx.strokeStyle = C.lime; ctx.lineWidth = 4; ctx.stroke(); setFont(ctx, MONO, 26, 800, 2, 'center'); ctx.fillStyle = C.lime; ctx.fillText('LOTADO', 0, 9); ctx.restore(); }
          ctx.restore();
        });
        // a folha "TABELA DE DEZEMBRO": nasce no centro, depois se inclina e vai um pouco para a esquerda e para cima
        if (folha > 0) {
          const fw = 440, fh = Math.min(560, y1 - y0 - 30), fx = 540 - 60 * inclina, fy = cy - 16 * inclina, ang = -0.07 * inclina;
          ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang); ctx.scale(0.7 + 0.3 * folha, 0.7 + 0.3 * folha); ctx.globalAlpha *= folha;
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
          rr(ctx, -fw / 2, -fh / 2, fw, fh, 18); ctx.fillStyle = OFF; ctx.fill(); ctx.shadowColor = 'transparent';
          const tx = -fw / 2 + 40, top = -fh / 2;
          monoLab(ctx, 'TABELA DE', tx, top + 64, '#5E5E59', 24, 'left', 3);
          monoLab(ctx, 'DEZEMBRO', tx, top + 112, INK, 44, 'left', 2);
          ctx.fillStyle = 'rgba(10,10,10,0.15)'; ctx.fillRect(tx, top + 140, fw - 80, 2);
          [['NORMAL', 'R$ 300', '#6E6E68'], ['ALTA', 'R$ 360', '#D9D9D2'], ['PICO', 'R$ 450', C.lime]].forEach(([a, b, cor], j) => {
            const yy = top + 210 + j * 82, kj = eOut(p(t, 2.6 + j * 0.12, 3.0 + j * 0.12));
            ctx.save(); ctx.globalAlpha *= kj; ctx.translate((1 - kj) * 20, 0);
            rr(ctx, tx, yy - 34, 40, 40, 10); ctx.fillStyle = cor; ctx.fill();
            monoLab(ctx, a, tx + 60, yy - 4, INK, 26, 'left', 2);
            setFont(ctx, MONO, 40, 800, 0, 'right'); ctx.fillStyle = INK; ctx.fillText(b, fw / 2 - 40, yy);
            ctx.restore();
          });
          monoLab(ctx, 'EXEMPLO FICTÍCIO', tx, fh / 2 - 32, '#8E8E88', 18, 'left', 2);
          ctx.restore();
        }
        // o ícone de salvar: surge na frente da folha (embaixo, à direita) e pulsa
        const km = mola(t, 3.7, 0.6);
        if (km > 0) {
          const mx = 540 + 190, my = cy + 214, pul = t > 4.5 ? 0.5 + 0.5 * Math.sin(TAU * (t - 4.5) / 1.4) : 0, bate = t > 4.4 && t < 4.8 ? 1 + 0.12 * Math.sin(Math.PI * p(t, 4.4, 4.8)) : 1;
          for (const fase of [0, 0.5]) { if (t <= 4.5) break; const u = ((t - 4.5) / 1.4 + fase) % 1; ctx.beginPath(); ctx.arc(mx, my, 96 + 90 * u, 0, TAU); ctx.strokeStyle = rgba(C.lime, 0.4 * (1 - u)); ctx.lineWidth = 3; ctx.stroke(); }
          ctx.save(); ctx.translate(mx, my); ctx.scale(km * bate, km * bate);
          ctx.shadowColor = rgba(C.lime, 0.35 + 0.2 * pul); ctx.shadowBlur = 60;
          ctx.beginPath(); ctx.arc(0, 0, 96, 0, TAU); ctx.fillStyle = C.lime; ctx.fill(); ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.arc(0, 0, 96, 0, TAU); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke();
          marcador(ctx, 0, 4, 92, INK); ctx.restore();
        }
      });
      LINHAS.push({ tag: 'dados', texto: 'TABELA DE DEZEMBRO · NORMAL R$ 300 · ALTA R$ 360 · PICO R$ 450', sozinha: false });
    },
  };
  // o mapa de ocupação do 07 (fictício e fixo): reservas por chalé que somam 55% (normal: dias 1–17), 80% (alta) e 100%
  // (pico) das noites; cada bloco é uma reserva de noites seguidas da mesma faixa
  let _MAPA = null;
  function MAPA() {
    if (_MAPA) return _MAPA;
    const occ = Array.from({ length: 6 }, () => Array(31).fill(false));
    const faixaIdx = (d) => faixaDe(d + 1);
    const alvo = { normal: Math.round(0.55 * 17 * 6), alta: Math.round(0.8 * 10 * 6), pico: 4 * 6 };
    const conta = { normal: 0, alta: 0, pico: 0 };
    // pico: tudo ocupado; alta e normal: preenche por chalé, em blocos, até bater o alvo exato
    for (let r = 0; r < 6; r++) for (let d = 0; d < 31; d++) if (faixaIdx(d) === 'pico') { occ[r][d] = true; conta.pico++; }
    let s = 1;
    for (const f of ['alta', 'normal']) {
      let guard = 0;
      while (conta[f] < alvo[f] && guard++ < 5000) {
        const r = Math.floor(hash(s, 1) * 6), d = Math.floor(hash(s, 2) * 31), n = 1 + Math.floor(hash(s, 3) * 3); s++;
        for (let k = 0; k < n && conta[f] < alvo[f]; k++) { const dd = d + k; if (dd < 31 && faixaIdx(dd) === f && !occ[r][dd]) { occ[r][dd] = true; conta[f]++; } }
      }
    }
    // junta noites seguidas da mesma faixa em blocos
    const blocos = [];
    for (let r = 0; r < 6; r++) { let d = 0; while (d < 31) { if (!occ[r][d]) { d++; continue; } const f = faixaIdx(d); let n = 1; while (d + n < 31 && occ[r][d + n] && faixaIdx(d + n) === f) n++; blocos.push({ r, d0: d, n, faixa: f }); d += n; } }
    blocos.forEach((b, i) => { b.ordem = hash(i, 11); });
    _MAPA = blocos; _MAPA.conta = conta; return _MAPA;
  }
  const DIAS = 31, ALTA = [18, 19, 20, 21, 22, 23, 26, 27, 28, 29], PICO = [24, 25, 30, 31];
  function faixaDe(d) { return PICO.includes(d) ? 'pico' : ALTA.includes(d) ? 'alta' : 'normal'; }

  function init(img) { LOGO = img; }
  let LOGO = null;
  function render(ctx, n, t = 0) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowColor = 'transparent';
    DUR = DURS[n];
    LINHAS.length = 0; for (const k in CAIXAS) delete CAIXAS[k];
    background(ctx, t);
    SLIDES[n](ctx, t);
  }
  window.CARROSSEL = { init, render, W, H, N: 8, FPS, durDe: (n) => DURS[n], poseDe: (n) => POSE[n], CAIXAS, mapa: () => { const m = MAPA(); return { blocos: m.length, conta: m.conta }; } };
  window.__LINHAS = () => LINHAS.slice();
})();
