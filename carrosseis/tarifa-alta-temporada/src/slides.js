/* =====================================================================
   FAZLO Hospeda — CARROSSEL ANIMADO "Tarifa de dezembro: quando e quanto subir?" · Pilar DICA (piloto)
   8 slides em vídeo, 1080x1350 (4:5), 7 s a 30 fps

   O motor dos carrosséis estáticos (o mesmo do "Nada de consumo fora da conta"): cores, fontes, margem de 80 px, capa
   LIMÃO com texto preto, trilha de passos 01–05 e cards rotulados em mono. Aqui, cada slide é desenhado num instante t:
   a animação fica nos primeiros 2 s e, de 2,5 s a 7 s, o slide fica completo e parado para a leitura (só a luz do fundo
   e, na capa, a escala gravada se mexem devagar, voltando ao começo em 7 s: o loop não salta).
   O canto de baixo à direita (140×140 px) fica livre: é onde o Instagram põe o ícone de som no vídeo.
   Os valores são um exemplo fictício (selo "EXEMPLO FICTÍCIO" nos slides com valores).

   CARROSSEL.render(ctx, n, t)  desenha o slide n (1–8) no instante t (s)
   window.__LINHAS              as linhas de texto do slide (revisão: nenhuma palavra sozinha numa linha)
   ===================================================================== */
(function () {
  'use strict';
  const DUR = 7, FPS = 30;

  const W = 1080, H = 1350, M = 80, CW = W - 2 * M;          // área útil: x 80–1000
  const DISPLAY = "'C1 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'C1 Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#0A0A0A', bg0: '#050505', card: '#161616', border: '#3A3A3A',
    lime: '#AFFA27', amber: '#FFB23F', limeD: '#8CD10C', limeDeep: '#5A8A0E', white: '#FFFFFF', gray: '#B9B9B1', grayM: '#8E8E88', grayD: '#5E5E59', ink: '#0A0A0A',
  };
  const L = { trackY: 120, titleTop: 196, titleTop0: 164, titleMaxH: 360, supportBottom: 1146 };   // (o apoio termina acima do canto do ícone de som)
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
  // ANIMAÇÃO (carrossel animado): cada slide é desenhado no instante t (0–7 s). O movimento fica nos primeiros 2 s;
  // de 2,5 s até o fim o slide está completo e parado (só a luz de fundo respira, e volta igual em 7 s: o loop não salta).
  // =====================================================================
  const cl = (x) => Math.max(0, Math.min(1, x));
  const p = (t, a, b) => cl((t - a) / (b - a));                         // progresso de a até b
  const eOut = (x) => 1 - Math.pow(1 - x, 3);
  const eIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eBack = (x) => { const c1 = 1.5, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const brl = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  // um bloco que entra com leve deslocamento (de baixo) e opacidade
  function entra(ctx, t, a, dur, draw, dy = 34) {
    const k = eOut(p(t, a, a + dur));
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - k) * dy); draw(); ctx.restore();
  }
  // o selo "EXEMPLO FICTÍCIO" (nos slides com valores): no alto, à direita, na linha da trilha de passos
  function ficticio(ctx) {
    chip(ctx, M + CW, L.trackY, 'EXEMPLO FICTÍCIO', { size: 24, stroke: C.grayM, color: C.gray, lw: 2, align: 'right', h: 50, padX: 20 });
  }

  // "ARRASTA →" na margem direita, ACIMA do canto do ícone de som (140×140 px embaixo à direita, livre): a seta dá um
  // empurrãozinho para a direita a cada 1,75 s (4 vezes em 7 s: o loop não salta)
  function swipe(ctx, textColor, arrowColor, t = 0) {
    const right = M + CW, aw = 64, gap = 26, y = 1166, size = 34, sp = 4;
    setFont(ctx, MONO, size, 800, 0);
    const chars = [...'ARRASTA'], ws = chars.map((ch) => ctx.measureText(ch).width);
    const textW = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    let x = right - 3 - aw - gap - textW - 12;
    CAIXAS.arrasta = [x, y - 32, right + 3, y + 8];
    ctx.fillStyle = textColor;
    chars.forEach((ch, i) => { ctx.fillText(ch, x, y); x += ws[i] + sp; });
    const nud = 12 * Math.pow(Math.max(0, Math.sin(TAU * t / 1.75)), 2);          // 0–12 px, sempre dentro da margem
    const ax = right - 3 - 12 + nud;
    ctx.strokeStyle = arrowColor; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ax - aw, y - 12); ctx.lineTo(ax, y - 12); ctx.moveTo(ax - 20, y - 30); ctx.lineTo(ax, y - 12); ctx.lineTo(ax - 20, y + 6); ctx.stroke();
  }
  // a capa vira um MEDIDOR (revisão de 2026-11-20, 2ª): a escala gravada ao fundo (a mesma dos outros carrosséis,
  // centro fora do quadro em 1180, 1280) fica PARADA, com a região "pico" marcada no aro por uma faixa mais escura,
  // inteira dentro do quadro (no alto, à direita, acima do chip e do título). SÓ O PONTEIRO SE MOVE: uma agulha preta
  // (45%, a espessura dos traços maiores) sobre o raio da escala, com o pivô no centro dela (fora do quadro); a
  // agulha vai do raio 820 até a ponta no raio 1070, encostando no aro, e some aos poucos para o lado do pivô. A ponta
  // fica dentro do quadro em todo o percurso, e a agulha nunca chega perto do "ARRASTA →" nem do chip.
  //   0,3–2,0 s: sobe de "normal" (190°, embaixo à esquerda, sob a última linha do título) até o meio da faixa de pico
  //   (253°), com um leve assentamento; fica lá até 6,2 s; volta devagar e chega em casa no último quadro (= quadro 0).
  const GRAU = Math.PI / 180;
  const MED = { cx: 1180, cy: 1280, a0: 190 * GRAU, a1: 253 * GRAU, r0: 820, r1: 1070, pico: [247 * GRAU, 259 * GRAU], rPico: 1060, wPico: 30, alfa: 0.45 };
  const eSettle = (x) => { if (x <= 0) return 0; if (x >= 1) return 1; const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const medidor = (t) => (t < 6.2 ? eSettle(p(t, 0.3, 2.0)) : 1 - eIO(p(t, 6.2, DUR - 1 / FPS)));   // 0 = normal, 1 = pico (no último quadro, já em casa)
  // a agulha no instante t: a base (raio 820) e a ponta (raio 1070), em coordenadas do quadro
  function agulha(t) {
    const a = MED.a0 + (MED.a1 - MED.a0) * medidor(t), c = Math.cos(a), s_ = Math.sin(a);
    return { a, base: [MED.cx + MED.r0 * c, MED.cy + MED.r0 * s_], ponta: [MED.cx + MED.r1 * c, MED.cy + MED.r1 * s_] };
  }
  function limeBackground(ctx, t = 0) {
    ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(MED.cx, MED.cy); ctx.rotate(0.385); ctx.lineCap = 'round';
    for (let j = 0; j < 180; j++) {
      const a = (j / 180) * TAU, r1 = 1180, r0 = j % 10 === 0 ? 1080 : j % 5 === 0 ? 1120 : 1150;
      ctx.beginPath(); ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a)); ctx.lineTo(r1 * Math.cos(a), r1 * Math.sin(a));
      ctx.strokeStyle = rgba(C.limeDeep, j % 10 === 0 ? 0.55 : 0.3); ctx.lineWidth = j % 10 === 0 ? 5 : 3; ctx.stroke();
    }
    for (const r of [1000, 1010, 760]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.strokeStyle = rgba(C.limeDeep, 0.3); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
    // a região "pico": a faixa mais escura no aro (parada, inteira no quadro)
    ctx.beginPath(); ctx.arc(MED.cx, MED.cy, MED.rPico, MED.pico[0], MED.pico[1]); ctx.strokeStyle = rgba(C.limeDeep, 0.55); ctx.lineWidth = MED.wPico; ctx.lineCap = 'butt'; ctx.stroke();
    // a agulha (some aos poucos para o lado do pivô, que fica fora do quadro)
    const g = agulha(t), gr = ctx.createLinearGradient(g.base[0], g.base[1], g.ponta[0], g.ponta[1]);
    gr.addColorStop(0, rgba(C.ink, 0)); gr.addColorStop(0.45, rgba(C.ink, MED.alfa)); gr.addColorStop(1, rgba(C.ink, MED.alfa));
    ctx.save(); ctx.strokeStyle = gr; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g.base[0], g.base[1]); ctx.lineTo(g.ponta[0], g.ponta[1]); ctx.stroke();
    ctx.beginPath(); ctx.arc(g.ponta[0], g.ponta[1], 7, 0, TAU); ctx.fillStyle = rgba(C.ink, MED.alfa); ctx.fill();   // a pontinha
    ctx.restore();
  }
  const CAIXAS = {};   // (conferência) as caixas do chip e do "ARRASTA →" na capa
  const W_ = C.white, Li = C.lime, INK = C.ink;
  const mid = (t, sp) => (t.bottom + sp.top) / 2;
  const titulo2 = (ctx, a, b, o = {}) => title(ctx, [{ t: a, c: W_ }, { t: b, c: Li, br: true }], L.titleTop, Object.assign({ lines: 2, max: 84 }, o));
  const monoLab = (ctx, s, x, y, cor = C.lime, size = 28, align = 'left') => { setFont(ctx, MONO, size, 800, 3, align); ctx.fillStyle = cor; ctx.fillText(s, x, y); };

  // ---------------------------------------------------------------- desenhos dos slides
  // 02 · a etiqueta de preço subindo de repente (âmbar) e o dinheiro parado na mesa (limão)
  function etiqueta(ctx, cx, cy, s, cor) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.12); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-120, -64); ctx.lineTo(70, -64); ctx.lineTo(130, 0); ctx.lineTo(70, 64); ctx.lineTo(-120, 64); ctx.closePath();
    ctx.fillStyle = C.card; ctx.fill(); ctx.strokeStyle = cor; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.arc(84, 0, 12, 0, TAU); ctx.strokeStyle = cor; ctx.lineWidth = 4; ctx.stroke();
    setFont(ctx, MONO, 62, 800, 0, 'center'); ctx.fillStyle = cor; ctx.fillText('R$', -22, 22);
    ctx.restore();
  }
  function moeda(ctx, x, y, cor) {
    ctx.beginPath(); ctx.ellipse(x, y + 8, 58, 18, 0, 0, TAU); ctx.fillStyle = rgba(cor, 0.55); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y, 58, 18, 0, 0, TAU); ctx.fillStyle = cor; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y, 40, 11, 0, 0, TAU); ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 3; ctx.stroke();
  }
  // 03 · dezembro em faixas de demanda
  const DIAS = 31, ALTA = [18, 19, 20, 21, 22, 23, 26, 27, 28, 29], PICO = [24, 25, 30, 31];
  const faixaDe = (d) => (PICO.includes(d) ? 'pico' : ALTA.includes(d) ? 'alta' : 'normal');
  const COR_FAIXA = { normal: '#6E6E68', alta: '#F4F4F0', pico: C.lime };   // (o âmbar é só para alertas)

  const SLIDES = {
    // 01 · capa limão: completa no quadro 0; o movimento fica na escala do fundo, no chip e no "ARRASTA →"
    1(ctx, t) {
      limeBackground(ctx, t);
      const tt = title(ctx, [{ t: 'Tarifa de', c: INK }, { t: 'dezembro:', c: INK, br: true }, { t: 'quando e', c: INK, br: true }, { t: 'quanto subir?', c: INK, br: true }], 0,
        { lines: 4, max: 170, maxH: 760, lh: 1.0, vcenter: [320, 1100], maxW: CW - 8, x: M + 2 });
      // o chip: o pontinho da frente pulsa (2 vezes em 7 s)
      const c = chip(ctx, M + 2, tt.top - 74, 'ALTA TEMPORADA', { size: 32, stroke: INK, color: INK, lw: 3, padX: 24 + 34 });
      CAIXAS.chip = [c.left, tt.top - 74 - 32 * 0.95, c.left + c.w, tt.top - 74 + 32 * 0.95];
      CAIXAS.titulo = [M, tt.top, M + CW, tt.bottom];
      const pr = 8 + 3 * (0.5 - 0.5 * Math.cos(TAU * t / 3.5));
      ctx.beginPath(); ctx.arc(c.left + 30, tt.top - 74, pr, 0, TAU); ctx.fillStyle = INK; ctx.fill();
      swipe(ctx, INK, INK, t);
    },
    // 02 · o problema
    2(ctx, t) {
      const tt = title(ctx, [{ t: 'Subir o preço em cima da hora assusta quem já perguntou.', c: W_ }, { t: 'Não subir deixa dinheiro na mesa.', c: Li, br: true }],
        L.titleTop0 + 40, { max: 96, maxH: 600, lh: 1.06 });
      const cy = (tt.bottom + 1150) / 2;
      ctx.save(); ctx.translate(540, cy); ctx.scale(1.45, 1.45); ctx.translate(-540, -cy);       // o desenho, maior
      // à esquerda: a etiqueta sobe de repente (âmbar), com a seta
      const k = eBack(p(t, 0.25, 0.95)), y = cy + 40 - 90 * k;
      ctx.save(); ctx.globalAlpha = cl(p(t, 0.15, 0.4)); etiqueta(ctx, 372, y, 1, C.amber); ctx.restore();
      entra(ctx, t, 0.5, 0.45, () => {
        ctx.strokeStyle = C.amber; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(530, cy + 90); ctx.lineTo(530, cy - 120); ctx.moveTo(496, cy - 86); ctx.lineTo(530, cy - 120); ctx.lineTo(564, cy - 86); ctx.stroke();
      }, 20);
      // à direita: a mesa e as moedas que ficaram nela (limão)
      entra(ctx, t, 0.6, 0.4, () => { ctx.fillStyle = '#2A2A27'; rr(ctx, 590, cy + 110, 240, 22, 11); ctx.fill(); }, 0);
      const pilhas = [[640, 4, 0.8], [715, 6, 1.0], [782, 3, 1.2]];
      pilhas.forEach(([x, n, a]) => {
        for (let i = 0; i < n; i++) {
          const k2 = eOut(p(t, a + i * 0.07, a + i * 0.07 + 0.3));
          if (k2 <= 0) continue;
          ctx.save(); ctx.globalAlpha = k2; moeda(ctx, x, cy + 92 - i * 26 - (1 - k2) * 40, C.lime); ctx.restore();
        }
      });
      ctx.restore();
    },
    // 03 · passo 1: as datas por demanda (a faixa de dezembro pinta em três cores, da esquerda para a direita: normal
    // cinza, alta off-white, pico limão)
    3(ctx, t) {
      track(ctx, 1);
      const sp = support(ctx, 'Normal, alta e pico, cada uma com o seu valor.');
      const tt = titulo2(ctx, 'Separe as datas', 'por demanda.');
      const m = mid(tt, sp), gap = 4, w = (CW - gap * (DIAS - 1)) / DIAS, h = 150, y0 = m - 150;
      monoLab(ctx, 'DEZEMBRO', M, y0 - 30, C.gray, 28);
      for (let d = 1; d <= DIAS; d++) {
        const x = M + (d - 1) * (w + gap), f = faixaDe(d), k = eOut(p(t, 0.25 + (d - 1) * 0.035, 0.25 + (d - 1) * 0.035 + 0.3));
        rr(ctx, x, y0, w, h, 6); ctx.fillStyle = '#1C1C1A'; ctx.fill();
        if (k > 0) { const hh = h * k; rr(ctx, x, y0 + h - hh, w, hh, 6); ctx.fillStyle = COR_FAIXA[f]; ctx.fill(); }
      }
      // os dias de referência embaixo da faixa
      const marca = (d, s) => { const x = M + (d - 1) * (w + gap) + w / 2; monoLab(ctx, s, x, y0 + h + 40, C.gray, 24, 'center'); };
      entra(ctx, t, 1.2, 0.4, () => { marca(1, '1'); marca(18, '18'); marca(24, '24'); marca(31, '31'); }, 10);
      // a legenda das três faixas
      const ly = y0 + h + 130, itens = [['NORMAL', COR_FAIXA.normal], ['ALTA', COR_FAIXA.alta], ['PICO · 24–25 E 30–31', COR_FAIXA.pico]];
      let x = M;
      itens.forEach(([s, cor], i) => entra(ctx, t, 1.3 + i * 0.15, 0.4, () => {
        rr(ctx, x, ly - 26, 34, 34, 8); ctx.fillStyle = cor; ctx.fill();
        monoLab(ctx, s, x + 48, ly, C.white, 28);
      }, 14) || (x += 48 + tw(ctx, s, MONO, 28, 800, 3) + 44));
      LINHAS.push({ tag: 'faixa', texto: 'DEZEMBRO · NORMAL · ALTA · PICO · 24–25 E 30–31', sozinha: false });
    },
    // 04 · passo 2: o valor de cada faixa (barras crescendo, números contando)
    4(ctx, t) {
      track(ctx, 2); ficticio(ctx);
      const sp = support(ctx, 'Preço pensado com calma, resposta rápida no WhatsApp.');
      const tt = titulo2(ctx, 'Defina o valor de cada', 'faixa antes de abrir.');
      const rows = [['NORMAL', 300, '', COR_FAIXA.normal], ['ALTA', 360, '+20%', COR_FAIXA.alta], ['PICO', 450, '+50%', C.lime]];
      const rh = 150, gap = 40, total = rows.length * rh + (rows.length - 1) * gap;
      let y = mid(tt, sp) - total / 2;
      rows.forEach(([lab, v, pct, cor], i) => {
        const a = 0.2 + i * 0.25, k = eOut(p(t, a, a + 1.1));
        monoLab(ctx, lab, M, y + 30, C.gray, 30);
        setFont(ctx, DISPLAY, 64, 900, -1.5, 'right'); ctx.fillStyle = C.white; ctx.fillText(brl(v * k), M + CW, y + 52);
        if (pct) { const xv = M + CW - tw(ctx, brl(v), DISPLAY, 64, 900, -1.5) - 26;     // (a largura do valor final: o selo não pula)
          entra(ctx, t, a + 1.0, 0.35, () => { setFont(ctx, MONO, 32, 800, 1, 'right'); ctx.fillStyle = cor; ctx.fillText(pct, xv, y + 50); }, 10); }
        rr(ctx, M, y + 80, CW, 56, 14); ctx.fillStyle = '#1C1C1A'; ctx.fill();
        if (k > 0) { rr(ctx, M, y + 80, CW * (v / 450) * k, 56, 14); ctx.fillStyle = cor; ctx.fill(); }
        y += rh + gap;
      });
      LINHAS.push({ tag: 'dados', texto: 'NORMAL R$ 300 · ALTA R$ 360 +20% · PICO R$ 450 +50%', sozinha: false });
    },
    // 05 · passo 3: a reserva confirmada fica com o valor combinado; a tabela nova vale só para a reserva nova
    5(ctx, t) {
      track(ctx, 3); ficticio(ctx);
      const sp = support(ctx, 'Tabela nova vale só para reserva nova.');
      const tt = titulo2(ctx, 'Reserva confirmada fica', 'com o valor combinado.');
      const ch = 290, gap = 36, y0 = mid(tt, sp) - (2 * ch + gap) / 2;
      // a reserva de outubro: R$ 300 → continua R$ 300, com o check
      entra(ctx, t, 0.1, 0.5, () => {
        card(ctx, M, y0, CW, ch, { r: 32 });
        monoLab(ctx, 'RESERVA CONFIRMADA EM OUTUBRO', M + 48, y0 + 66, C.lime, 28);
        setFont(ctx, DISPLAY, 40, 700, -0.4); ctx.fillStyle = C.gray; ctx.fillText('R$ 300  →  continua', M + 48, y0 + 140);
        setFont(ctx, DISPLAY, 84, 900, -2); ctx.fillStyle = C.white; ctx.fillText('R$ 300', M + 48, y0 + 240);
      });
      const kc = eBack(p(t, 0.75, 1.15));
      if (kc > 0) {
        const cx = M + CW - 48 - 52, cy = y0 + ch / 2;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(kc, kc); ctx.shadowColor = rgba(C.lime, 0.35); ctx.shadowBlur = 40;
        ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.fillStyle = C.lime; ctx.fill(); ctx.shadowBlur = 0; checkIcon(INK)(ctx, 74); ctx.restore();
      }
      // a reserva nova de dezembro: a tabela nova (R$ 300 → R$ 360, contando)
      const y1 = y0 + ch + gap, kv = eOut(p(t, 1.0, 1.8));
      entra(ctx, t, 0.6, 0.5, () => {
        ctx.save(); ctx.shadowColor = rgba(C.lime, 0.25); ctx.shadowBlur = 50; card(ctx, M, y1, CW, ch, { fill: C.lime, stroke: C.lime, r: 32 }); ctx.restore();
        monoLab(ctx, 'RESERVA NOVA DE DEZEMBRO', M + 48, y1 + 66, C.ink, 28);
        setFont(ctx, DISPLAY, 40, 700, -0.4); ctx.fillStyle = 'rgba(10,10,10,0.7)'; ctx.fillText('tabela nova', M + 48, y1 + 140);
        setFont(ctx, DISPLAY, 84, 900, -2); ctx.fillStyle = C.ink; ctx.fillText(brl(300 + 60 * kv), M + 48, y1 + 240);
      });
      LINHAS.push({ tag: 'dados', texto: 'RESERVA CONFIRMADA EM OUTUBRO R$ 300 → continua R$ 300 · RESERVA NOVA DE DEZEMBRO R$ 360', sozinha: false });
    },
    // 06 · passo 4: a mesma tabela em todo lugar (três etiquetas com o mesmo R$ 360)
    6(ctx, t) {
      track(ctx, 4); ficticio(ctx);
      const sp = support(ctx, 'WhatsApp, Instagram e recepção falando o mesmo preço.');
      const tt = titulo2(ctx, 'A mesma tabela', 'em todo lugar.');
      const ch = 150, gap = 28, total = 3 * ch + 2 * gap;
      let y = mid(tt, sp) - total / 2;
      ['WHATSAPP', 'INSTAGRAM', 'RECEPÇÃO'].forEach((lab, i) => {
        const a = 0.2 + i * 0.25, k = eOut(p(t, a, a + 0.55)), yy = y;
        if (k > 0) {
          ctx.save(); ctx.globalAlpha = k; ctx.translate((1 - k) * 60, 0);
          card(ctx, M, yy, CW, ch, { r: 30 });
          ctx.beginPath(); ctx.arc(M + 56, yy + ch / 2, 13, 0, TAU); ctx.fillStyle = C.lime; ctx.fill();        // o furinho da etiqueta
          monoLab(ctx, lab, M + 96, yy + ch / 2 + 11, C.gray, 32);
          setFont(ctx, DISPLAY, 80, 900, -2, 'right'); ctx.fillStyle = C.lime; ctx.fillText('R$ 360', M + CW - 48, yy + ch / 2 + 29);
          ctx.restore();
        }
        y += ch + gap;
      });
      LINHAS.push({ tag: 'dados', texto: 'WHATSAPP R$ 360 · INSTAGRAM R$ 360 · RECEPÇÃO R$ 360', sozinha: false });
    },
    // 07 · passo 5: como cada faixa vendeu (ocupação em barras)
    7(ctx, t) {
      track(ctx, 5); ficticio(ctx);
      const sp = support(ctx, 'É essa anotação que ajusta a tabela do ano que vem.');
      const tt = titulo2(ctx, 'Anote como', 'cada faixa vendeu.');
      const m = mid(tt, sp), hMax = 380, base = m + hMax / 2 + 20, bw = 220, gapX = (CW - 3 * bw) / 2;
      monoLab(ctx, 'OCUPAÇÃO', M, base - hMax - 92, C.gray, 28);
      [['NORMAL', 55, COR_FAIXA.normal], ['ALTA', 80, COR_FAIXA.alta], ['PICO', 100, C.lime]].forEach(([lab, v, cor], i) => {
        const x = M + i * (bw + gapX), a = 0.2 + i * 0.25, k = eOut(p(t, a, a + 1.1)), h = hMax * (v / 100) * k;
        rr(ctx, x, base - hMax, bw, hMax, 18); ctx.fillStyle = '#1C1C1A'; ctx.fill();
        if (h > 0) { rr(ctx, x, base - h, bw, h, 18); ctx.fillStyle = cor; ctx.fill(); }
        setFont(ctx, DISPLAY, 64, 900, -1.5, 'center'); ctx.fillStyle = C.white; ctx.fillText(Math.round(v * k) + '%', x + bw / 2, base - h - 18);
        monoLab(ctx, lab, x + bw / 2, base + 46, C.gray, 28, 'center');
      });
      LINHAS.push({ tag: 'dados', texto: 'OCUPAÇÃO NORMAL 55% · ALTA 80% · PICO 100%', sozinha: false });
    },
    // 08 · fecho: o selo de "salvar" surge; @fazlohospeda pequeno
    8(ctx, t) {
      const tt = title(ctx, [{ t: 'Preço definido antes,', c: W_ }, { t: 'resposta rápida depois.', c: Li, br: true }], L.titleTop0 + 60, { max: 100, maxH: 520 });
      // o traço limão embaixo do título se desenha
      const k = eIO(p(t, 0.3, 1.0));
      if (k > 0) { ctx.strokeStyle = C.lime; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(M + 4, tt.bottom + 40); ctx.lineTo(M + 4 + 260 * k, tt.bottom + 40); ctx.stroke(); }
      // o selo de salvar (o marcador), no meio
      const ks = eBack(p(t, 0.7, 1.15)), cx = 540, cy = (tt.bottom + 980) / 2 + 30;
      if (ks > 0) {
        ctx.save(); ctx.translate(cx, cy); ctx.scale(ks, ks);
        ctx.shadowColor = rgba(C.lime, 0.3); ctx.shadowBlur = 50;
        ctx.beginPath(); ctx.arc(0, 0, 110, 0, TAU); ctx.fillStyle = C.lime; ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.moveTo(-36, -52); ctx.lineTo(36, -52); ctx.lineTo(36, 56); ctx.lineTo(0, 28); ctx.lineTo(-36, 56); ctx.closePath();
        ctx.fillStyle = INK; ctx.fill(); ctx.restore();
      }
      support(ctx, 'Salva pra montar a sua tabela.', { bottom: 1060, color: C.white, size: 44 });
      setFont(ctx, MONO, 28, 800, 1); ctx.fillStyle = C.grayM; ctx.fillText('@fazlohospeda', M, 1150);
      LINHAS.push({ tag: 'assinatura', texto: '@fazlohospeda', sozinha: false });
    },
  };

  function init(img) { LOGO = img; }
  let LOGO = null;
  function render(ctx, n, t = DUR) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    LINHAS.length = 0;
    background(ctx, t);
    SLIDES[n](ctx, t);
  }
  window.CARROSSEL = { init, render, W, H, N: 8, DUR, FPS, agulha, CAIXAS, MED };
  window.__LINHAS = () => LINHAS.slice();
})();
