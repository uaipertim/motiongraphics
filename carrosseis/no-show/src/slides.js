/* =====================================================================
   FAZLO Hospeda — CARROSSEL ANIMADO "O hóspede não apareceu. E agora?" · Pilar DICA (no-show)
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
  const POSE = { 1: 7.0, 2: 9.0, 3: 7.6, 4: 7.6, 5: 7.6, 6: 7.6, 7: 7.6, 8: 7.6 };
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
    if (o.nome !== false) marca(ctx, o.nome || text, left, cy - h / 2, left + w, cy + h / 2);
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
  const monoLab = (ctx, s, x, y, cor = C.gray, size = 26, align = 'left', ls = 3, nome) => {
    setFont(ctx, MONO, size, 800, ls, align); ctx.fillStyle = cor; ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width - ls, xa = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x, desce = /[gjpqyç,]/.test(s) ? 0.22 : 0.06;
    marca(ctx, nome || s, xa, y - size * 0.76, xa + w, y + size * desce);
  };
  function ficticio(ctx) { chip(ctx, M + CW, L.trackY, 'EXEMPLO FICTÍCIO', { size: 24, stroke: C.grayM, color: C.gray, lw: 2, align: 'right', h: 50, padX: 20, nome: 'selo EXEMPLO FICTÍCIO' }); }
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
    const eMax = Math.max(1, Math.min(o.escMax || 1.35, (cx - M) / (w / 2 + 6), (M + CW - cx) / (w / 2 + 6))), esc = k < 1 ? eMax - (eMax - 1) * eIn(k) : 1, treme = t - t0 > 0.28 && t - t0 < 0.6 ? 5 * Math.sin((t - t0) * 70) * (1 - p(t, t0 + 0.28, t0 + 0.6)) : 0;
    ctx.save(); ctx.translate(cx + treme, cy); ctx.rotate(ang); ctx.scale(esc, esc); ctx.globalAlpha *= Math.min(1, k * 1.6);
    if (o.fill) { rr(ctx, -w / 2, -h / 2, w, h, 12); ctx.fillStyle = cor; ctx.fill(); }
    rr(ctx, -w / 2, -h / 2, w, h, 12); ctx.strokeStyle = o.fill ? rgba(INK, 0.4) : cor; ctx.lineWidth = 5; ctx.stroke();
    rr(ctx, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 8); ctx.strokeStyle = o.fill ? rgba(INK, 0.35) : rgba(cor, 0.55); ctx.lineWidth = 2; ctx.stroke();
    setFont(ctx, MONO, size, 800, 3, 'center'); ctx.fillStyle = o.fill ? INK : cor; ctx.fillText(text, 0, size * 0.36);
    marca(ctx, 'carimbo ' + text, -w / 2, -h / 2, w / 2, h / 2);
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
    const ox0 = xx;
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
    marca(ctx, o.nome || 'valor ' + fim, ox0, y - size * 0.76, ox0 + total, y + size * 0.06);
    return { x0: xx - total + (suf ? sufw : 0), w: total };
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
    marca(ctx, o.nome || 'balão ' + text, x0, y, x0 + w, y + h);
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
    const k = mola(t, t0, o.dur || 0.55), a = cl((t - t0) / 0.18), kt = o.semSubir ? Math.min(k, 1) : k, ke = o.semPassar ? Math.min(k, 1) : k;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(ox, oy + (1 - kt) * (o.dy ?? 26)); ctx.scale(0.6 + 0.4 * ke, 0.6 + 0.4 * ke); ctx.translate(-ox, -oy); fn(k); ctx.restore();
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
  // (conferência, TODAS as cenas) a caixa de um elemento de texto, balão, selo, carimbo ou etiqueta, como aparece no quadro
  // (com a escala, a rotação e a posição da mola); elementos quase invisíveis (alfa < 0,05) não contam
  function marca(ctx, nome, x0, y0, x1, y1) {
    if (ctx.globalAlpha < 0.05) return;
    const m = ctx.getTransform(), ps = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
    // [nome, x0, y0, x1, y1 (a caixa reta que contém o elemento), os 4 cantos de verdade (com a rotação)]
    (CAIXAS.elems = CAIXAS.elems || []).push([nome, Math.min(...ps.map((q) => q[0])), Math.min(...ps.map((q) => q[1])), Math.max(...ps.map((q) => q[0])), Math.max(...ps.map((q) => q[1])), [ps[0], ps[1], ps[3], ps[2]]]);
  }
  // dois elementos presos de propósito um ao outro (o selo de canto do próprio elemento): a conferência não mede o par
  const junto = (a, b) => (CAIXAS.junto = CAIXAS.junto || []).push([a, b]);
  function palco(ctx, t, y0, y1, a = 1) { brilho(ctx, 540, (y0 + y1) / 2, 520, C.lime, (0.045 + 0.02 * Math.sin(TAU * t / DUR)) * a); }

  // =====================================================================
  // ÍCONES DE LINHA DESTA CENA (no traço da marca: linha única, pontas e cantos arredondados)
  // =====================================================================
  const traco = (ctx, cor, lw) => { ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
  // o relógio de parede: h em horas (pode passar de 24); marcas das horas, ponteiro das horas e dos minutos
  function relogioP(ctx, cx, cy, r, h, cor, o = {}) {
    ctx.save(); traco(ctx, cor, o.lw || Math.max(3, r * 0.05));
    if (o.fundo) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = o.fundo; ctx.fill(); }
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, r0 = r * (i % 3 ? 0.84 : 0.76); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92); ctx.stroke(); }
    const ah = ((h % 12) / 12) * TAU - Math.PI / 2, am = (h % 1) * TAU - Math.PI / 2;
    ctx.globalAlpha *= o.ponteiros ?? 1;
    ctx.lineWidth = (o.lw || Math.max(3, r * 0.05)) * 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ah) * r * 0.48, cy + Math.sin(ah) * r * 0.48); ctx.stroke();
    ctx.lineWidth = o.lw || Math.max(3, r * 0.05);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(am) * r * 0.72, cy + Math.sin(am) * r * 0.72); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.06, 0, TAU); ctx.fillStyle = cor; ctx.fill();
    ctx.restore();
  }
  const hora = (h) => { const hh = ((Math.floor(h) % 24) + 24) % 24, mm = Math.floor((h % 1) * 60 + 1e-6); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
  // a cama arrumada (cabeceira, colchão, travesseiro e a colcha dobrada)
  function cama(ctx, cx, by, w, cor) {
    ctx.save(); traco(ctx, cor, Math.max(3, w * 0.03));
    ctx.beginPath(); ctx.moveTo(cx - w / 2, by); ctx.lineTo(cx - w / 2, by - w * 0.62); ctx.moveTo(cx - w / 2, by - w * 0.2); ctx.lineTo(cx + w / 2, by - w * 0.2); ctx.lineTo(cx + w / 2, by); ctx.stroke();
    rr(ctx, cx - w / 2 + w * 0.08, by - w * 0.36, w * 0.24, w * 0.14, w * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w * 0.1, by - w * 0.2); ctx.lineTo(cx - w * 0.1, by - w * 0.34); ctx.lineTo(cx + w / 2, by - w * 0.34); ctx.lineTo(cx + w / 2, by - w * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w * 0.12, by - w * 0.34); ctx.lineTo(cx + w * 0.12, by - w * 0.2); ctx.stroke();
    ctx.restore();
  }
  // o kit de boas-vindas (a caixinha com laço)
  function kit(ctx, cx, by, w, cor) {
    ctx.save(); traco(ctx, cor, Math.max(3, w * 0.045));
    rr(ctx, cx - w / 2, by - w * 0.62, w, w * 0.62, 6); ctx.stroke();
    rr(ctx, cx - w * 0.56, by - w * 0.8, w * 1.12, w * 0.2, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, by - w * 0.8); ctx.lineTo(cx, by); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx - w * 0.16, by - w * 0.9, w * 0.16, w * 0.09, -0.4, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + w * 0.16, by - w * 0.9, w * 0.16, w * 0.09, 0.4, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // o cadeado: aberto 0 (fechado) … 1 (a alça girou e soltou)
  function cadeado(ctx, cx, cy, s, cor, aberto = 0, o = {}) {
    ctx.save(); traco(ctx, cor, o.lw || Math.max(3, s * 0.1));
    rr(ctx, cx - s * 0.5, cy - s * 0.1, s, s * 0.8, s * 0.14); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } ctx.stroke();
    ctx.save(); ctx.translate(cx + s * 0.3, cy - s * 0.1 - s * 0.18 * aberto); ctx.rotate(-1.0 * aberto);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.28); ctx.arc(-s * 0.3, -s * 0.28, s * 0.3, 0, Math.PI, true); ctx.lineTo(-s * 0.6, 0); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.24, s * 0.08, 0, TAU); ctx.fillStyle = cor; ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.28); ctx.lineTo(cx, cy + s * 0.44); ctx.stroke();
    ctx.restore();
  }
  // o pino de mapa (o hóspede a caminho)
  function pinoMapa(ctx, x, y, s, cor) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x - s * 0.2, y - s * 0.35, x - s * 0.5, y - s * 0.55, x - s * 0.5, y - s * 0.85);
    ctx.arc(x, y - s * 0.85, s * 0.5, Math.PI, 0); ctx.bezierCurveTo(x + s * 0.5, y - s * 0.55, x + s * 0.2, y - s * 0.35, x, y); ctx.closePath();
    ctx.fillStyle = cor; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - s * 0.95, s * 0.14, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - s * 0.62, s * 0.24, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  // a fachada do chalé com a porta grande (a capa): a porta e a janela acesas, o tapete de boas-vindas
  function fachada(ctx, cx, by, w, cor, luz, t) {
    const lw = 7;
    ctx.save(); traco(ctx, cor, lw);
    // a luz: um cone suave saindo da porta até o tapete (parado, só respira)
    const g = ctx.createRadialGradient(cx - w * 0.12, by - w * 0.2, 0, cx - w * 0.12, by - w * 0.2, w * 0.7);
    g.addColorStop(0, `rgba(255,255,255,${0.42 * luz})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(cx - w, by - w, 2 * w, w + 60);
    ctx.beginPath(); ctx.moveTo(cx - w * 0.44, by); ctx.lineTo(cx - w * 0.44, by - w * 0.52); ctx.lineTo(cx, by - w * 0.9); ctx.lineTo(cx + w * 0.44, by - w * 0.52); ctx.lineTo(cx + w * 0.44, by);
    ctx.moveTo(cx - w * 0.56, by - w * 0.42); ctx.lineTo(cx, by - w * 0.9); ctx.lineTo(cx + w * 0.56, by - w * 0.42); ctx.stroke();
    // a porta (acesa por dentro) e a maçaneta
    rr(ctx, cx - w * 0.3, by - w * 0.5, w * 0.26, w * 0.5, 6); ctx.fillStyle = `rgba(255,255,255,${0.78 * luz})`; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - w * 0.09, by - w * 0.24, 5, 0, TAU); ctx.fillStyle = cor; ctx.fill();
    // a janela (acesa) com a cruz
    rr(ctx, cx + w * 0.06, by - w * 0.46, w * 0.26, w * 0.2, 6); ctx.fillStyle = `rgba(255,255,255,${0.78 * luz})`; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w * 0.19, by - w * 0.46); ctx.lineTo(cx + w * 0.19, by - w * 0.26); ctx.moveTo(cx + w * 0.06, by - w * 0.36); ctx.lineTo(cx + w * 0.32, by - w * 0.36); ctx.stroke();
    // a lâmpada da varanda (acesa) acima da porta
    ctx.beginPath(); ctx.arc(cx - w * 0.17, by - w * 0.58, 9, 0, TAU); ctx.fillStyle = `rgba(255,255,255,${0.9 * luz})`; ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
    // o chão e o tapete de boas-vindas (intocado: as listras alinhadas)
    ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(cx - w * 0.6, by); ctx.lineTo(cx + w * 0.6, by); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - w * 0.36, by + 16); ctx.lineTo(cx + w * 0.04, by + 16); ctx.lineTo(cx + w * 0.1, by + 50); ctx.lineTo(cx - w * 0.42, by + 50); ctx.closePath(); ctx.stroke();
    for (let i = 1; i <= 4; i++) { const u = i / 5; ctx.beginPath(); ctx.moveTo(cx - w * 0.36 - w * 0.06 * 0.5 + (w * 0.46) * u - w * 0.03, by + 22); ctx.lineTo(cx - w * 0.42 + w * 0.52 * u, by + 44); ctx.stroke(); }
    ctx.restore();
  }
  // a gaveta do caixa (frente e bandeja); abre 0 (fechada) … 1 (aberta)
  function gavetaCaixa(ctx, cx, top, w, abre, cor) {
    ctx.save(); traco(ctx, cor, 4);
    rr(ctx, cx - w / 2, top, w, 56, 14); ctx.fillStyle = '#151514'; ctx.fill(); ctx.stroke();
    const d = 20 + 110 * abre, yb = top + 46, yf = yb + d, wb = w * 0.42, wf = w * 0.48;
    ctx.beginPath(); ctx.moveTo(cx - wb, yb); ctx.lineTo(cx + wb, yb); ctx.lineTo(cx + wf, yf); ctx.lineTo(cx - wf, yf); ctx.closePath(); ctx.fillStyle = '#0E0E0D'; ctx.fill(); ctx.stroke();
    for (let k = 1; k < 4; k++) { const x0 = cx - wb + (2 * wb) * k / 4, x1 = cx - wf + (2 * wf) * k / 4; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x0 + (x1 - x0) * 0.6, yb + d * 0.6); ctx.globalAlpha *= 0.6; ctx.stroke(); ctx.globalAlpha /= 0.6; }
    rr(ctx, cx - wf - 8, yf, 2 * wf + 16, 78, 14); ctx.fillStyle = '#1A1A18'; ctx.fill(); ctx.stroke();
    rr(ctx, cx - 50, yf + 30, 100, 14, 7); ctx.stroke();
    ctx.restore();
    return yf;
  }
  // o mostrador de 24 h (slide 04): a faixa de chegada acende em limão
  const ang24 = (h) => (h / 24) * TAU - Math.PI / 2;

  // =====================================================================
  // OS SLIDES
  // =====================================================================
  const SLIDES = {
    // 01 · capa: o título parado desde o quadro 0; embaixo, a porta do chalé com a luz acesa, o tapete intocado e o
    //      relógio de parede correndo 18h → 22h → 00h; no fim do loop, os ponteiros dão a volta até as 18h de novo
    1(ctx, t) {
      limeBackground(ctx);
      const tt = title(ctx, [{ t: 'O hóspede', c: INK }, { t: 'não apareceu.', c: INK, br: true }, { t: 'E agora?', c: INK, br: true }], 0,
        { lines: 3, max: 150, maxH: 470, lh: 1.0, vcenter: [250, 690], maxW: CW - 8, x: M + 2 });
      chip(ctx, M + 2, tt.top - 70, 'NO-SHOW', { size: 32, stroke: INK, color: INK, lw: 3, padX: 24, nome: 'chip NO-SHOW' });
      CAIXAS.texto = [[M, tt.top - 6, M + CW, tt.bottom + 2]];
      const yb = 1080;                                                             // o chão do chalé
      // a luz respira (periódica no slide: o último quadro emenda no primeiro)
      const luz = 0.86 + 0.14 * Math.sin(TAU * t / DUR * 3);
      fachada(ctx, M + 230, yb, 300, INK, luz, t);
      // o relógio: 18:00 → 22:00 (0,4–2,8 s), segura; 22:00 → 00:30 (3,6–5,6 s) e fica parado ali. Na dissolução do fim
      // (os últimos 0,75 s), os ponteiros e o rótulo esmaecem e reaparecem em 18:00: nenhum quadro mostra hora da manhã
      const volta = t >= DUR - 0.4, some = p(t, DUR - 0.75, DUR - 0.4), surge_ = p(t, DUR - 0.4, DUR - 0.06);
      const h = volta ? 18 : 18 + 4 * eIO(p(t, 0.4, 2.8)) + 2.5 * eIO(p(t, 3.6, 5.6));
      const aP = volta ? eIO(surge_) : 1 - eIO(some);
      const rx = M + CW - 140, ry = yb - 200;
      relogioP(ctx, rx, ry, 124, h, INK, { lw: 6, fundo: 'rgba(255,255,255,0.18)', ponteiros: aP });
      camada(ctx, aP, () => monoLab(ctx, hora(h), rx, ry + 124 + 54, INK, 34, 'center', 1, 'hora do relógio'));
      swipe(ctx, INK, INK, t);
      marca(ctx, 'ARRASTA', ...CAIXAS.arrasta);
      LINHAS.push({ tag: 'cena', texto: 'porta acesa · relógio 18:00 → 22:00 → 00:30 (volta a 18:00 na dissolução)', sozinha: false });
    },

    // 02 · o problema, em TELA DIVIDIDA: em cima, "A NOITE" (cinza): o chalé aceso, a cama arrumada e o kit parados, o
    //      relógio de 18h a 02h e a notificação âmbar "22h · sem notícia"; embaixo, "O DIA SEGUINTE" (âmbar): o sinal
    //      R$ 540 balançando entre "devolver?" e "ficar?", com o "?" pulsando, e as noites 27/12 e 28/12 presas no cadeado.
    //      No estado final, as duas metades ficam na tela.
    2(ctx, t) {
      ficticio(ctx);
      const tt = title(ctx, [{ t: 'O chalé ficou pronto a noite toda.', c: W_ }, { t: 'Sem regra combinada, ninguém sabe o que fazer com o sinal.', c: Li, br: true }],
        166, { max: 64, maxH: 300, lh: 1.08 });
      CAIXAS.texto = [[M, tt.top - 6, M + CW, tt.bottom + 6]];
      const k0 = saida(t), YA = tt.bottom + 44, YD = YA + 368, YB = YD + 20;
      palco(ctx, t, YA, 1180, k0);
      camada(ctx, k0, () => {
        // ---- (a) A NOITE
        const esm = 1 - 0.45 * eIO(p(t, 4.6, 5.3));
        camada(ctx, cl((t - 0.1) / 0.3), () => monoLab(ctx, 'A NOITE', M, YA, C.gray, 20, 'left', 3, 'rótulo A NOITE'));
        camada(ctx, esm, () => {
          const base = YA + 326;
          // as estrelas da noite
          faiscas(ctx, t, [M + 120, YA + 10, M + 640, YA + 80], 10, C.white, 5, 0.6 * cl((t - 0.4) / 0.5));
          // o chalé aceso
          camada(ctx, cl((t - 0.3) / 0.25), () => { const lz = eOut(p(t, 0.5, 0.9)) * (0.88 + 0.12 * Math.sin(t * 2.3)); brilho(ctx, M + 130, base - 100, 190, C.lime, 0.12 * lz); chale(ctx, M + 124, base, 224, C.white, { traco: eOut(p(t, 0.3, 0.8)), aceso: lz }); });
          // a cama arrumada e o kit de boas-vindas (parados a noite toda)
          surge(ctx, t, 0.6, M + 400, base - 50, () => cama(ctx, M + 400, base, 236, C.gray), { dy: 14 });
          surge(ctx, t, 0.8, M + 622, base - 40, () => kit(ctx, M + 622, base, 108, C.gray), { dy: 14 });
          // o relógio: 18h → 02h (1,0–4,6 s)
          const h = 18 + 8 * eIO(p(t, 1.0, 4.6)), rx = M + CW - 112, ry = YA + 150;
          surge(ctx, t, 0.5, rx, ry, () => {
            relogioP(ctx, rx, ry, 106, h, C.white, { lw: 4, fundo: '#141413' });
            monoLab(ctx, hora(h), rx, ry + 106 + 46, C.white, 30, 'center', 1, 'hora do relógio');
          }, { dy: 12 });
          // às 22h, a notificação âmbar desce e pulsa
          const t22 = 1.0 + 3.6 * 0.5;                                          // (eIO(0,5) = 0,5: 22h no meio do percurso)
          if (t >= t22) {
            const k = mola(t, t22, 0.5), pul = 0.5 + 0.5 * Math.sin(TAU * (t - t22) / 1.3), nx = M + 400, ny = YA + 60;
            ctx.save(); ctx.globalAlpha *= cl((t - t22) / 0.15); ctx.translate(nx, ny - 30 * (1 - Math.min(k, 1)));
            brilho(ctx, 0, 0, 200, AMB, 0.10 + 0.08 * pul);
            const s_ = '22H · SEM NOTÍCIA', w = tw(ctx, s_, MONO, 26, 800, 2) + 80, h_ = 56;
            rr(ctx, -w / 2, -h_ / 2, w, h_, h_ / 2); ctx.fillStyle = '#1F1B12'; ctx.fill(); ctx.strokeStyle = AMB; ctx.lineWidth = 3; ctx.stroke();
            ctx.beginPath(); ctx.arc(-w / 2 + 26, 0, 7 + 2 * pul, 0, TAU); ctx.fillStyle = AMB; ctx.fill();
            setFont(ctx, MONO, 26, 800, 2); ctx.fillStyle = AMB; ctx.fillText(s_, -w / 2 + 48, 10);
            marca(ctx, 'notificação 22h', -w / 2, -h_ / 2, w / 2, h_ / 2);
            ctx.restore();
          }
        });
        // ---- o divisor: "O DIA SEGUINTE" (âmbar) na própria linha
        const kd = eIO(p(t, 4.6, 5.2));
        if (kd > 0) {
          const lw_ = tw(ctx, 'O DIA SEGUINTE', MONO, 20, 800, 3) + 18;
          const g = ctx.createLinearGradient(M + lw_, 0, M + CW, 0); g.addColorStop(0, rgba(AMB, 0.5)); g.addColorStop(1, rgba(AMB, 0.04));
          ctx.fillStyle = g; ctx.fillRect(M + lw_, YD, (CW - lw_) * kd, 2);
          camada(ctx, kd, () => monoLab(ctx, 'O DIA SEGUINTE', M, YD + 8, AMB, 20, 'left', 3, 'rótulo O DIA SEGUINTE'));
        }
        // ---- (b) O DIA SEGUINTE: o sinal na balança e as noites presas
        if (t >= 4.9) {
          // a balança: o travessão balança devagar e o sinal desliza para o lado que desce
          const px = M + 310, py = YB + 236, L2 = 215;
          const osc = t < 5.6 ? 0 : 0.10 * Math.sin(TAU * (t - 5.6) / 2.6) * (1 - 0.35 * p(t, 5.6, 8.6));
          const ang = osc * eOut(p(t, 5.6, 6.1));
          camada(ctx, cl((t - 4.9) / 0.3), () => {
            monoLab(ctx, 'SINAL · 50%', M, YB + 38, C.gray, 26, 'left', 3, 'rótulo SINAL');
            ctx.save(); traco(ctx, C.gray, 5);
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 32, py + 80); ctx.lineTo(px + 32, py + 80); ctx.closePath(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px - 86, py + 80); ctx.lineTo(px + 86, py + 80); ctx.stroke();
            ctx.restore();
            const kb = eOut(p(t, 4.95, 5.4));
            ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
            traco(ctx, C.white, 6); ctx.beginPath(); ctx.moveTo(-L2 * kb, 0); ctx.lineTo(L2 * kb, 0); ctx.stroke();
            ctx.restore();
            // os pratos e as opções (penduradas nas pontas; ficam na vertical)
            [[-1, 'DEVOLVER?'], [1, 'FICAR?']].forEach(([lado, s_]) => {
              const ex = px + Math.cos(ang) * L2 * lado * kb, ey = py + Math.sin(ang) * L2 * lado * kb;
              camada(ctx, cl((t - 5.25) / 0.25), () => {
                ctx.save(); traco(ctx, C.gray, 4);
                ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 48, ey + 48); ctx.moveTo(ex, ey); ctx.lineTo(ex + 48, ey + 48); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(ex - 68, ey + 48); ctx.quadraticCurveTo(ex, ey + 88, ex + 68, ey + 48); ctx.closePath(); ctx.stroke();
                ctx.restore();
                monoLab(ctx, s_, ex, ey + 126, C.white, 28, 'center', 2, 'opção ' + s_);
              });
            });
          });
          // o sinal R$ 540, apoiado no travessão, escorrega para o lado que desce
          surge(ctx, t, 5.05, px, py - 34, () => {
            const desl = ang * 560;
            ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.translate(desl, -46);
            ctx.shadowColor = rgba(C.lime, 0.3); ctx.shadowBlur = 30;
            const s_ = 'R$ 540', w = tw(ctx, s_, MONO, 48, 800, 0) + 56, h_ = 80;
            rr(ctx, -w / 2, -h_ / 2, w, h_, h_ / 2); ctx.fillStyle = C.lime; ctx.fill(); ctx.shadowColor = 'transparent';
            setFont(ctx, MONO, 48, 800, 0, 'center'); ctx.fillStyle = INK; ctx.fillText(s_, 0, 17);
            marca(ctx, 'sinal R$ 540', -w / 2, -h_ / 2, w / 2, h_ / 2);
            ctx.restore();
          }, { dy: 30 });
          // o "?" pulsando em cima da balança (acima do sinal)
          if (t >= 5.7) {
            const kq = mola(t, 5.7, 0.5), pul = 1 + 0.1 * Math.sin(TAU * (t - 5.7) / 1.1);
            ctx.save(); ctx.translate(px, YB + 90); ctx.scale(kq * pul, kq * pul); ctx.globalAlpha *= cl((t - 5.7) / 0.15);
            brilho(ctx, 0, -20, 110, AMB, 0.16);
            setFont(ctx, DISPLAY, 96, 900, 0, 'center'); ctx.fillStyle = AMB; ctx.fillText('?', 0, 32);
            marca(ctx, '?', -28, -37, 28, 34);
            ctx.restore();
          }
          // as noites 27/12 e 28/12, presas no cadeado
          const tw_ = 144, th_ = 250, gx = 18, tx0 = M + CW - 2 * tw_ - gx, ty0 = YB + 52;
          ['27/12', '28/12'].forEach((d, i) => {
            const a0 = 6.0 + i * 0.15, x = tx0 + i * (tw_ + gx);
            surge(ctx, t, a0, x + tw_ / 2, ty0 + th_ / 2, () => {
              rr(ctx, x, ty0, tw_, th_, 20); ctx.fillStyle = '#161615'; ctx.fill(); ctx.strokeStyle = '#3A3A36'; ctx.lineWidth = 2; ctx.stroke();
              monoLab(ctx, d, x + tw_ / 2, ty0 + 62, C.white, 34, 'center', 0, 'noite ' + d);
              const fecha = eOut(p(t, 6.5 + i * 0.12, 6.75 + i * 0.12)), bate = t > 6.75 + i * 0.12 && t < 7.0 + i * 0.12 ? 3 * Math.sin((t - 6.75) * 60) : 0;
              cadeado(ctx, x + tw_ / 2 + bate, ty0 + 144, 76, fecha > 0.98 ? AMB : C.gray, 1 - fecha, {});
            }, { dy: 16 });
          });
          camada(ctx, cl((t - 7.0) / 0.3), () => monoLab(ctx, 'NOITES PRESAS', tx0 + tw_ + gx / 2, ty0 + th_ + 44, AMB, 24, 'center', 2, 'rótulo NOITES PRESAS'));
        }
      });
      LINHAS.push({ tag: 'dados', texto: 'chegada prevista 22h · sinal R$ 540 · noites 27/12 e 28/12 presas', sozinha: false });
    },

    // 03 · a regra vai escrita na confirmação: a confirmação sai impressa, linha a linha; a linha do não comparecimento
    //      acende em limão com um marca-texto; no fim, "REGRA ENVIADA" carimba com o check
    3(ctx, t) {
      const { y0, y1 } = topo(ctx, 1, 'A regra vai escrita', 'na confirmação.', 'Quem reserva já sabe o que acontece se não vier.', true);
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        const pw = 860, px = 540 - pw / 2, slot = y1 - 46, ph = slot - y0 - 6;
        // a folha sobe da fenda (0,6–3,4 s): o topo dela sai primeiro, e as linhas aparecem na ordem de leitura
        const sai_ = eIO(p(t, 0.6, 3.4)), sy = slot - ph * sai_;                // sy: o topo da folha
        // [texto, corpo, cor, base, destaque]: a regra em Inter Display 900, 40 px, com o marca-texto limão por trás
        const LIN = [['CONFIRMAÇÃO DE RESERVA', 26, '#6E6E68', 66], ['Chalé 3 · 26/12 a 29/12 · 3 noites', 30, INK, 146], ['Total R$ 1.080 · sinal R$ 540 pago', 30, INK, 206],
          ['Chegada até 22h', 30, INK, 266], ['Não comparecimento:', 40, INK, 356, true], ['o sinal fica com a pousada', 40, INK, 414, true]];
        const fnt = (sz, d) => (d ? [DISPLAY, sz, 900, -0.4] : [MONO, sz, 800, 0]);
        if (sai_ > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(px - 30, y0 - 4, pw + 60, slot - y0 + 4); ctx.clip();
          ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
          ctx.fillStyle = OFF; ctx.fillRect(px, sy, pw, ph + 20); ctx.restore();
          ctx.strokeStyle = 'rgba(10,10,10,0.15)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 40, sy + 98); ctx.lineTo(px + pw - 40, sy + 98); ctx.stroke();
          // o marca-texto passa pela regra (3,6–4,6 s): a faixa limão cresce da esquerda para a direita, linha a linha
          const mk = p(t, 3.6, 4.6);
          [[4, 0, 0.45], [5, 0.45, 1]].forEach(([i, a, b]) => {
            const u = cl((mk - a) / (b - a)); if (u <= 0) return;
            const [s_, sz, , yy, d_] = LIN[i], w = tw(ctx, s_, ...fnt(sz, d_)) + 28;
            ctx.save(); ctx.globalAlpha *= 0.95; ctx.fillStyle = C.lime; ctx.beginPath(); ctx.roundRect(px + 40 - 14, sy + yy - sz * 0.9, w * u, sz * 1.22, 8); ctx.fill(); ctx.restore();
          });
          LIN.forEach(([s_, sz, cor, yy, d_]) => {
            setFont(ctx, ...fnt(sz, d_)); ctx.fillStyle = cor; ctx.fillText(s_, px + 40, sy + yy);
            // só conta (conferência) a linha que já saiu inteira da fenda
            if (sy + yy + sz * 0.3 < slot - 2) { const w = ctx.measureText(s_).width; marca(ctx, 'linha ' + s_, px + 40, sy + yy - sz * 0.76, px + 40 + w, sy + yy + sz * 0.22); }
          });
          ctx.restore();
          if (mk > 0 && mk < 1) { const i = mk < 0.45 ? 4 : 5, u = mk < 0.45 ? mk / 0.45 : (mk - 0.45) / 0.55, [s_, sz, , yy, d_] = LIN[i], w = tw(ctx, s_, ...fnt(sz, d_)) + 28; brilho(ctx, px + 26 + w * u, sy + yy - 12, 70, C.lime, 0.4); }
        }
        // a impressora (embaixo; a folha sai pela fenda de cima dela)
        surge(ctx, t, 0.15, 540, slot + 24, () => {
          rr(ctx, px - 20, slot - 10, pw + 40, 62, 20); ctx.fillStyle = '#1F1F1D'; ctx.fill(); ctx.strokeStyle = '#3A3A36'; ctx.lineWidth = 2; ctx.stroke();
          rr(ctx, px - 8, slot - 5, pw + 16, 10, 5); ctx.fillStyle = INK; ctx.fill();
          ctx.beginPath(); ctx.arc(px + pw - 4, slot + 30, 7, 0, TAU); ctx.fillStyle = t > 0.6 && t < 3.4 ? C.lime : '#3A3A36'; ctx.fill();
        }, { dy: 10 });
        // o carimbo "REGRA ENVIADA" (com o check) no pé da folha
        const cy_ = y0 + 6 + 540;
        carimbo(ctx, 580, cy_, 'REGRA ENVIADA', -0.06, '#2E7D16', t, 4.9, { size: 34, pad: 26, escMax: 1.2 });
        if (t >= 5.15) {
          const kc = mola(t, 5.15, 0.45), cx_ = 580 - 222;
          ctx.save(); ctx.translate(cx_, cy_); ctx.scale(kc, kc);
          ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fillStyle = '#2E7D16'; ctx.fill(); checkIcon(OFF)(ctx, 40);
          marca(ctx, 'check da regra', -30, -30, 30, 30);
          ctx.restore();
          junto('check da regra', 'carimbo REGRA ENVIADA');
        }
        if (t > 4.7) brilho(ctx, 540, y0 + 340, 300, C.lime, 0.06 + 0.03 * Math.sin(t * 2.4));
      });
      LINHAS.push({ tag: 'dados', texto: 'Chalé 3 · 26/12 a 29/12 · 3 noites · Total R$ 1.080 · sinal R$ 540 pago · Chegada até 22h', sozinha: false });
    },

    // 04 · combine o horário de chegada: o mostrador de 24 h acende a faixa 14h–22h; o pino do hóspede percorre a
    //      estrada sinuosa até o chalé e chega dentro da faixa (o ponteiro marca 19h)
    4(ctx, t) {
      const { y0, y1 } = topo(ctx, 2, 'Combine o horário', 'de chegada.', 'Saber a hora evita esperar a noite inteira.');
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        const r = 214, cx = M + r + 14, cy = (y0 + y1) / 2 - 40;
        surge(ctx, t, 0.15, cx, cy, () => {
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = '#121211'; ctx.fill(); ctx.strokeStyle = '#3A3A36'; ctx.lineWidth = 3; ctx.stroke();
          for (let hh = 0; hh < 24; hh++) { const a = ang24(hh), r0 = r - (hh % 6 ? 18 : 30); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); ctx.strokeStyle = hh % 6 ? '#3A3A36' : C.grayM; ctx.lineWidth = hh % 6 ? 2 : 4; ctx.stroke(); }
          [[0, '0'], [6, '6'], [12, '12'], [18, '18']].forEach(([hh, s_]) => { const a = ang24(hh); monoLab(ctx, s_, cx + Math.cos(a) * (r - 62), cy + Math.sin(a) * (r - 62) + 10, C.grayM, 26, 'center', 0, 'hora ' + s_); });
        }, { dy: 12, semPassar: true });                                    // (a mola não passa da margem)
        // a faixa 14h–22h acende (0,7–1,7 s)
        const kf = eIO(p(t, 0.7, 1.7));
        if (kf > 0) {
          ctx.save(); ctx.shadowColor = rgba(C.lime, 0.5); ctx.shadowBlur = 24 + 10 * Math.sin(t * 2);
          ctx.beginPath(); ctx.arc(cx, cy, r - 12, ang24(14), ang24(14) + (ang24(22) - ang24(14)) * kf); ctx.strokeStyle = C.lime; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
        }
        // o ponteiro: a hora em que o hóspede está chegando (10h → 19h enquanto o pino viaja)
        const viagem = eIO(p(t, 2.0, 4.8)), hh = 10 + 9 * viagem;
        if (t >= 1.8) camada(ctx, cl((t - 1.8) / 0.3), () => {
          const a = ang24(hh); ctx.save(); traco(ctx, C.white, 5); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 40), cy + Math.sin(a) * (r - 40)); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, 9, 0, TAU); ctx.fillStyle = C.white; ctx.fill(); ctx.restore();
          odometro(ctx, hh, 19, cx, cy - 70, 40, { pre: '', suf: 'H', cor: hh >= 14 ? C.lime : C.white, align: 'center', zeros: false, nome: 'hora da chegada' });
        });
        // abaixo do mostrador: a faixa combinada
        camada(ctx, cl((t - 1.6) / 0.3), () => monoLab(ctx, 'CHEGADA · 14H–22H', cx, cy + r + 52, C.lime, 28, 'center', 2, 'faixa combinada'));
        // a estrada sinuosa (à direita) e o chalé no fim dela
        const chx = M + CW - 100, chy = y0 + 196;
        const P = [[M + CW - 340, y1 - 10], [M + CW - 40, y1 - 160], [M + CW - 420, y1 - 330], [M + CW - 60, chy - 140 + 300], [chx, chy + 24]];
        const bez = (u) => {                                                   // a curva passa pelos pontos (Catmull-Rom)
          const n = P.length - 1, s = Math.min(n - 1e-6, u * n), i = Math.floor(s), f = s - i;
          const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)];
          const c = (a, b, c_, d) => 0.5 * (2 * b + (-a + c_) * f + (2 * a - 5 * b + 4 * c_ - d) * f * f + (-a + 3 * b - 3 * c_ + d) * f * f * f);
          return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
        };
        const kr = eIO(p(t, 0.4, 1.6));
        if (kr > 0) { ctx.save(); traco(ctx, '#2C2C29', 26); ctx.beginPath(); for (let s = 0; s <= 80 * kr; s++) { const [x, y] = bez(s / 80); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
          ctx.setLineDash([14, 16]); traco(ctx, '#5E5E59', 3); ctx.stroke(); ctx.restore(); }
        const aceso = eOut(p(t, 4.8, 5.2));
        surge(ctx, t, 0.9, chx, chy, () => { if (aceso > 0) brilho(ctx, chx, chy - 60, 160, C.lime, 0.25 * aceso); chale(ctx, chx, chy, 150, aceso > 0 ? C.lime : C.gray, { aceso }); }, { dy: 12 });
        if (t >= 1.9) {
          const [x, y] = bez(0.02 + 0.96 * viagem), pula = t < 4.8 ? 6 * Math.abs(Math.sin(t * 9)) : 0;
          camada(ctx, cl((t - 1.9) / 0.25) * (1 - p(t, 4.8, 5.1)), () => { brilho(ctx, x, y - 40, 70, C.lime, 0.3); pinoMapa(ctx, x, y - pula, 64, C.lime); });
        }
        // a chegada dentro da faixa: um anel no ponto das 19h do mostrador
        if (t >= 4.8) {
          const a = ang24(19), ax = cx + Math.cos(a) * (r - 12), ay = cy + Math.sin(a) * (r - 12), kk = p(t, 4.8, 5.6);
          ctx.beginPath(); ctx.arc(ax, ay, 16, 0, TAU); ctx.fillStyle = C.white; ctx.fill();
          if (kk < 1) { ctx.save(); ctx.beginPath(); ctx.rect(M, y0, CW, y1 - y0); ctx.clip();      // (o anel fica dentro da margem)
            ctx.beginPath(); ctx.arc(ax, ay, 16 + 60 * eOut(kk), 0, TAU); ctx.strokeStyle = rgba(C.lime, 0.8 * (1 - kk)); ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); }
          const pul = 0.5 + 0.5 * Math.sin(TAU * (t - 4.8) / 1.4); brilho(ctx, ax, ay, 60, C.lime, 0.2 + 0.15 * pul);
        }
      });
      LINHAS.push({ tag: 'dados', texto: 'chegada 14h–22h · chegou 19h', sozinha: false });
    },

    // 05 · passou do horário? mande mensagem: às 22h10 sai a mensagem; a cena se divide em dois caminhos que acendem em
    //      sequência: "respondeu" → "Pneu furado, chego 23h" → o chalé continua aceso; "não respondeu até 8h" → NO-SHOW
    5(ctx, t) {
      const { y0, y1 } = topo(ctx, 3, 'Passou do horário?', 'Mande mensagem.', 'Às vezes é só um atraso na estrada.');
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        // 22:10 e a mensagem da pousada
        surge(ctx, t, 0.2, M + 100, y0 + 42, () => {
          const c = chip(ctx, M, y0 + 48, '22:10', { size: 38, stroke: '#3A3A36', fill: '#151514', color: C.white, h: 82, padX: 26 + 46, nome: 'hora 22:10' });
          relogioP(ctx, c.left + 42, y0 + 48, 20, 22 + 1 / 6, C.gray, { lw: 3 });
        }, { dy: 10 });
        const b1 = { x: M + CW, y: y0 + 8 };
        surge(ctx, t, 0.55, b1.x, b1.y, () => balao(ctx, b1.x, b1.y, 'Tudo certo com a viagem?', 'dir', { size: 38 }), { semSubir: true });
        // a bifurcação (1,3–1,9 s): sai do balão e abre em dois caminhos
        const fx = 540, fy = y0 + 170, L_ = [M + 220, y0 + 240], R_ = [M + CW - 220, y0 + 240];
        const kb = eIO(p(t, 1.3, 1.9));
        if (kb > 0) {
          ctx.save(); traco(ctx, '#3A3A36', 4);
          ctx.beginPath(); ctx.moveTo(fx + 200, y0 + 106); ctx.quadraticCurveTo(fx + 200, fy, fx, fy); ctx.stroke();
          for (const [ex, ey] of [L_, R_]) { ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + (ex - fx) * kb, fy, fx + (ex - fx) * kb, fy + (ey - fy) * kb); ctx.stroke(); }
          ctx.restore();
          ctx.beginPath(); ctx.arc(fx, fy, 8, 0, TAU); ctx.fillStyle = C.white; ctx.fill();
        }
        // o caminho da esquerda (1,9–3,6 s): respondeu
        const acL = eOut(p(t, 1.9, 2.3));
        if (acL > 0) { ctx.save(); traco(ctx, C.lime, 5); ctx.globalAlpha *= acL; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(L_[0], fy, L_[0], L_[1]); ctx.stroke(); ctx.restore(); }
        camada(ctx, cl((t - 2.0) / 0.25), () => monoLab(ctx, 'RESPONDEU', L_[0], L_[1] + 48, C.lime, 28, 'center', 3, 'caminho RESPONDEU'));
        surge(ctx, t, 2.3, M, L_[1] + 78, () => balao(ctx, M, L_[1] + 78, 'Pneu furado, chego 23h', 'esq', { size: 38 }), { semSubir: true });
        const acesoL = eOut(p(t, 3.0, 3.4));
        surge(ctx, t, 2.8, L_[0], y1 - 140, () => { if (acesoL > 0) brilho(ctx, L_[0], y1 - 210, 210, C.lime, 0.22 * acesoL * (0.85 + 0.15 * Math.sin(t * 3))); chale(ctx, L_[0], y1 - 86, 220, acesoL > 0 ? C.lime : C.gray, { aceso: acesoL }); }, { dy: 12 });
        surge(ctx, t, 3.3, L_[0], y1 - 30, () => chip(ctx, L_[0], y1 - 30, 'CONTINUA ACESO', { size: 26, fill: C.lime, color: INK, h: 54, padX: 24, align: 'center', nome: 'chip CONTINUA ACESO' }), { dy: 8 });
        // o caminho da direita (3,9–5,6 s): não respondeu até 8h
        const acR = eOut(p(t, 3.9, 4.3));
        if (acR > 0) { ctx.save(); traco(ctx, AMB, 5); ctx.globalAlpha *= acR; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(R_[0], fy, R_[0], R_[1]); ctx.stroke(); ctx.restore(); }
        camada(ctx, cl((t - 4.0) / 0.25), () => monoLab(ctx, 'NÃO RESPONDEU ATÉ 8H', R_[0] + 10, R_[1] + 48, AMB, 26, 'center', 1, 'caminho NÃO RESPONDEU'));
        surge(ctx, t, 4.3, R_[0], R_[1] + 119, () => {
          const hR = 22 + 1 / 6 + (10 - 1 / 6) * eIO(p(t, 4.35, 4.95));   // 22:10 → 08:00
          const c = chip(ctx, R_[0], R_[1] + 119, hora(hR), { size: 38, stroke: '#3A3A36', fill: '#151514', color: C.white, h: 82, padX: 26 + 46, align: 'center', nome: 'hora 08:00' });
          relogioP(ctx, c.left + 42, R_[1] + 119, 20, hR, C.gray, { lw: 3 });
        }, { dy: 10 });
        // o chalé apagado, e o carimbo NO-SHOW por cima
        camada(ctx, cl((t - 4.5) / 0.3), () => chale(ctx, R_[0], y1 - 86, 220, '#5E5E59', {}));
        carimbo(ctx, R_[0], y1 - 160, 'NO-SHOW', -0.1, AMB, t, 5.1, { size: 50, pad: 28, escMax: 1.25 });
        if (t > 5.6) brilho(ctx, R_[0], y1 - 160, 180, AMB, 0.08 + 0.05 * Math.sin(t * 2.6));
      });
      LINHAS.push({ tag: 'dados', texto: '22:10 · Tudo certo com a viagem? · respondeu: Pneu furado, chego 23h · não respondeu até 8h: NO-SHOW', sozinha: false });
    },

    // 06 · o sinal segue a regra combinada: o cartão da reserva (R$ 1.080) se divide; o sinal (R$ 540) cai na gaveta do
    //      caixa, que fecha com RETIDO; o saldo (R$ 540) esmaece com NÃO COBRADO
    6(ctx, t) {
      const { y0, y1 } = topo(ctx, 4, 'O sinal segue', 'a regra combinada.', 'Combinado antes, sem discussão depois.', true);
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        // a composição final é uma conta em linha, centralizada: em cima, o contorno do cartão original; duas setas;
        // embaixo à esquerda, a gaveta entreaberta com o R$ 540 dentro (RETIDO); à direita, o saldo riscado (NÃO COBRADO)
        const hw = 420, hh = 180, cw0 = 2 * hw + 14, ch0 = 196, cx0 = 540 - cw0 / 2, cy0 = y0 + 8;
        const div = eIO(p(t, 2.0, 2.7)), corte = t >= 2.0;
        const bw = 430, gap = CW - 2 * bw, bTop = y0 + 330, bH = 230;            // a linha de baixo: gaveta e saldo, do mesmo tamanho
        const gcx = M + bw / 2, scx = M + CW - bw / 2;
        // o cartão inteiro da reserva (até o corte, em 2,0 s)
        if (!corte) surge(ctx, t, 0.2, 540, cy0 + ch0 / 2, () => {
          rr(ctx, cx0, cy0, cw0, ch0, 24); ctx.fillStyle = '#161615'; ctx.fill(); ctx.strokeStyle = C.lime; ctx.lineWidth = 2.5; ctx.stroke();
          monoLab(ctx, 'RESERVA · CHALÉ 3', cx0 + 36, cy0 + 48, C.lime, 22, 'left', 3, 'rótulo RESERVA');
          odometro(ctx, 1080 * eOut(p(t, 0.4, 1.5)), 1080, cx0 + 32, cy0 + 128, 68, { cor: C.white, nome: 'valor R$ 1.080' });
          monoLab(ctx, '3 NOITES × R$ 360', cx0 + 36, cy0 + 172, C.grayM, 20, 'left', 2, 'conta 3 × 360');
          if (t > 1.6) { ctx.setLineDash([8, 8]); ctx.strokeStyle = rgba(C.white, 0.4 * p(t, 1.6, 1.9)); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(540, cy0 + 14); ctx.lineTo(540, cy0 + ch0 - 14); ctx.stroke(); ctx.setLineDash([]); }
        }, { dy: 16 });
        // o contorno tracejado do cartão original (4,4 s) e as duas setas que partem dele (4,6–5,2 s)
        const ko = eOut(p(t, 4.4, 4.9));
        if (ko > 0) camada(ctx, ko, () => {
          ctx.save(); ctx.setLineDash([12, 10]); rr(ctx, cx0, cy0, cw0, ch0, 24); ctx.strokeStyle = rgba(C.white, 0.45); ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
          monoLab(ctx, 'RESERVA · CHALÉ 3', cx0 + 36, cy0 + 48, C.grayM, 22, 'left', 3, 'contorno RESERVA');
          monoLab(ctx, 'R$ 1.080', cx0 + 34, cy0 + 128, C.gray, 64, 'left', 0, 'contorno R$ 1.080');
          monoLab(ctx, '3 NOITES × R$ 360', cx0 + 36, cy0 + 172, C.grayD, 20, 'left', 2, 'contorno 3 × 360');
          const ks = eIO(p(t, 4.6, 5.2));
          for (const [xa, xb, cor] of [[540 - 150, gcx, C.lime], [540 + 150, scx, C.grayM]]) {
            const ya = cy0 + ch0 + 12, yb = bTop - 18, xe = xa + (xb - xa) * ks, ye = ya + (yb - ya) * ks;
            if (ks > 0) { ctx.save(); traco(ctx, cor, 5); ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xe, ye); ctx.stroke();
              if (ks > 0.95) { const a = Math.atan2(yb - ya, xb - xa); ctx.beginPath(); ctx.moveTo(xe - 22 * Math.cos(a - 0.5), ye - 22 * Math.sin(a - 0.5)); ctx.lineTo(xe, ye); ctx.lineTo(xe - 22 * Math.cos(a + 0.5), ye - 22 * Math.sin(a + 0.5)); ctx.stroke(); }
              ctx.restore(); }
          }
        });
        // a gaveta (embaixo à esquerda, maior): abre (2,9–3,2 s), recebe o sinal e fica entreaberta (4,0–4,4 s)
        const abre = t < 4.0 ? eOut(p(t, 2.9, 3.2)) : 1 - 0.5 * eIO(p(t, 4.0, 4.4));
        const gTop = bTop + 6;
        camada(ctx, cl((t - 2.7) / 0.3), () => {
          const yf = gavetaCaixa(ctx, gcx, gTop, bw * 0.98, abre, C.gray);
          // a plaqueta "R$ 540" dentro da bandeja (o sinal que caiu), visível com a gaveta entreaberta
          if (t >= 3.85) {
            const kp = eOut(p(t, 3.85, 4.1)), yb_ = gTop + 46, ym = (yb_ + yf) / 2;
            ctx.save(); ctx.globalAlpha *= kp; ctx.beginPath(); ctx.rect(gcx - bw / 2, yb_ + 2, bw, yf - yb_ - 4); ctx.clip();
            chip(ctx, gcx, ym, 'R$ 540', { size: 30, fill: C.lime, color: INK, h: 50, padX: 22, align: 'center', nome: 'plaqueta R$ 540' });
            ctx.restore();
          }
        });
        if (corte) {
          // o sinal cai na gaveta (3,2–3,85 s), encolhendo
          const ly = cy0 + 8, sinalX = cx0 + (M - cx0) * div, cai = eIn(p(t, 3.2, 3.85));
          if (cai < 1) {
            const sx = sinalX + (gcx - hw * 0.2 - sinalX) * cai, sy = ly + (gTop + 50 - ly) * cai, esc = 1 - 0.6 * cai;
            ctx.save(); ctx.globalAlpha *= 1 - p(t, 3.7, 3.85); ctx.translate(sx, sy); ctx.scale(esc, esc);
            rr(ctx, 0, 0, hw, hh, 22); ctx.fillStyle = C.lime; ctx.fill();
            monoLab(ctx, 'SINAL · 50%', 30, 44, INK, 22, 'left', 3, 'rótulo SINAL');
            odometro(ctx, 540 * eOut(p(t, 2.2, 3.0)), 540, 26, 128, 64, { cor: INK, nome: 'valor sinal R$ 540' });
            ctx.restore();
          }
          // o saldo desce para a direita (3,5–4,3 s), do mesmo tamanho da gaveta, esmaece e ganha o risco
          const desce = eIO(p(t, 3.5, 4.3)), x0s = cx0 + cw0 - hw + (M + CW - hw - (cx0 + cw0 - hw)) * div;
          const sx = x0s + (M + CW - bw - x0s) * desce, sy = ly + (bTop - ly) * desce, w = hw + (bw - hw) * desce, h = hh + (bH - hh) * desce;
          const esm = 1 - 0.55 * eIO(p(t, 3.9, 4.5)), risco = eOut(p(t, 4.2, 4.6));
          ctx.save(); ctx.translate(sx, sy);
          ctx.save(); ctx.globalAlpha *= esm; rr(ctx, 0, 0, w, h, 22); ctx.fillStyle = '#161615'; ctx.fill(); ctx.strokeStyle = '#3A3A36'; ctx.lineWidth = 2; ctx.stroke();
          monoLab(ctx, 'SALDO', 34, 50 + 14 * desce, C.gray, 24, 'left', 3, 'rótulo SALDO');
          odometro(ctx, 540 * eOut(p(t, 2.2, 3.0)), 540, 30, 136 + 40 * desce, 64 + 12 * desce, { cor: C.white, nome: 'valor saldo R$ 540' });
          ctx.restore();
          if (risco > 0) { traco(ctx, C.white, 6); ctx.beginPath(); ctx.moveTo(24, 118 + 34 * desce); ctx.lineTo(24 + (w - 48) * risco, 110 + 34 * desce); ctx.stroke(); }
          ctx.restore();
        }
        // os rótulos da linha de baixo, alinhados: RETIDO (limão) e NÃO COBRADO (cinza)
        const yr = bTop + bH + 52;
        surge(ctx, t, 4.5, gcx, yr, () => { ctx.save(); ctx.shadowColor = rgba(C.lime, 0.4); ctx.shadowBlur = 30;
          chip(ctx, gcx, yr, 'RETIDO', { size: 32, fill: C.lime, color: INK, h: 64, padX: 30, align: 'center', nome: 'chip RETIDO' }); ctx.restore(); }, { dy: 10 });
        surge(ctx, t, 4.65, scx, yr, () => chip(ctx, scx, yr, 'NÃO COBRADO', { size: 32, stroke: C.grayM, color: C.gray, h: 64, padX: 30, align: 'center', nome: 'chip NÃO COBRADO' }), { dy: 10 });
        if (t > 4.6) brilho(ctx, gcx, bTop + 110, 220, C.lime, 0.08 + 0.04 * Math.sin(t * 2.2));
      });
      LINHAS.push({ tag: 'dados', texto: 'RESERVA R$ 1.080 = 3 NOITES × R$ 360 · SINAL R$ 540 RETIDO · SALDO R$ 540 NÃO COBRADO', sozinha: false });
    },

    // 07 · libere as noites que sobraram: 26/12 recebe NO-SHOW; os cadeados de 27 e 28 abrem (LIVRE); chega "Tem vaga 27
    //      e 28?" e os dois dias viram RESERVADO; o contador: voltou a vender 2 noites × R$ 360 = R$ 720
    7(ctx, t) {
      const { y0, y1 } = topo(ctx, 5, 'Libere as noites', 'que sobraram.', 'Noite livre ainda pode ser vendida.', true);
      const k0 = saida(t); palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        const gx = 20, tw_ = (CW - 2 * gx) / 3, th_ = 300, ty = y0 + 10;
        const DIAS_ = ['26/12', '27/12', '28/12'], vende = 4.4;
        DIAS_.forEach((d, i) => {
          const x = M + i * (tw_ + gx), a0 = 0.2 + i * 0.12;
          surge(ctx, t, a0, x + tw_ / 2, ty + th_ / 2, () => {
            const res = i > 0 && t >= vende, kr = i > 0 ? eOut(p(t, vende, vende + 0.35)) : 0;
            rr(ctx, x, ty, tw_, th_, 24); ctx.fillStyle = '#161615'; ctx.fill();
            if (kr > 0) { ctx.save(); rr(ctx, x, ty, tw_, th_, 24); ctx.clip(); ctx.fillStyle = C.lime; ctx.fillRect(x, ty + th_ * (1 - kr), tw_, th_ * kr); ctx.restore(); }
            rr(ctx, x, ty, tw_, th_, 24); ctx.strokeStyle = i === 0 ? rgba(AMB, 0.6) : res ? C.lime : '#3A3A36'; ctx.lineWidth = 2.5; ctx.stroke();
            monoLab(ctx, d, x + 28, ty + 58, kr > 0.5 ? INK : C.white, 36, 'left', 0, 'dia ' + d);
            if (i > 0) {
              // o cadeado abre com estalo (2,2 s) e some quando o dia é reservado; o estado embaixo: PRESA → LIVRE → RESERVADO
              const ab = eBack(p(t, 2.2 + (i - 1) * 0.1, 2.5 + (i - 1) * 0.1), 2.5), some = 1 - p(t, vende - 0.1, vende + 0.2);
              if (some > 0) camada(ctx, some, () => cadeado(ctx, x + tw_ / 2, ty + 150, 64, ab > 0.5 ? C.lime : C.gray, ab, {}));
              const est = t < 2.35 ? ['PRESA', C.gray, null] : !res ? ['LIVRE', C.lime, null] : ['RESERVADO', INK, null];
              const ks = t < 2.35 ? 1 : !res ? mola(t, 2.35, 0.45) : mola(t, vende + 0.1, 0.45);
              if (ks > 0.05) {                                                    // (a troca de estado nasce do ponto: escala ~0 não desenha)
                ctx.save(); ctx.translate(x + tw_ / 2, ty + th_ - 56); ctx.scale(ks, ks);
                chip(ctx, 0, 0, est[0], { size: 24, stroke: res ? INK : est[1], color: est[1], h: 50, padX: 20, align: 'center', nome: 'estado ' + d });
                ctx.restore();
              }
              if (t > 2.2 + (i - 1) * 0.1 && t < 2.9 + (i - 1) * 0.1) { const kk = p(t, 2.2 + (i - 1) * 0.1, 2.9 + (i - 1) * 0.1); ctx.beginPath(); ctx.arc(x + tw_ / 2, ty + 160, 30 + 60 * eOut(kk), 0, TAU); ctx.strokeStyle = rgba(C.lime, 0.7 * (1 - kk)); ctx.lineWidth = 3; ctx.stroke(); }
            }
          }, { dy: 16, semPassar: true });                                  // (a mola não passa da margem)
        });
        // o 26 recebe o NO-SHOW
        carimbo(ctx, M + tw_ / 2, ty + th_ - 110, 'NO-SHOW', -0.1, AMB, t, 0.9, { size: 30, pad: 18, escMax: 1.15 });
        // chega o pedido novo
        surge(ctx, t, 3.4, M, ty + th_ + 46, () => balao(ctx, M, ty + th_ + 46, 'Tem vaga 27 e 28?', 'esq', { size: 34 }), { semSubir: true });
        // o contador: voltou a vender
        const yc = y1 - 150;
        surge(ctx, t, 4.7, M, yc, () => {
          monoLab(ctx, 'VOLTOU A VENDER', M, yc, C.gray, 22, 'left', 3, 'rótulo VOLTOU A VENDER');
          brilho(ctx, M + 200, yc + 70, 260, C.lime, 0.10 + 0.04 * Math.sin(t * 3));
          odometro(ctx, 720 * eOut(p(t, 4.9, 5.9)), 720, M - 4, yc + 96, 92, { cor: C.lime, nome: 'valor R$ 720' });
          monoLab(ctx, '2 NOITES × R$ 360', M, yc + 140, C.grayM, 22, 'left', 2, 'conta 2 × 360');
        }, { dy: 14 });
        if (t > 5.0) faiscas(ctx, t, [M + tw_ + gx, ty - 10, M + CW, ty + th_ + 10], 14, C.lime, 31, p(t, 5.0, 5.6));
      });
      LINHAS.push({ tag: 'dados', texto: '26/12 NO-SHOW · 27/12 e 28/12 LIVRE → RESERVADO · 2 noites × R$ 360 = R$ 720', sozinha: false });
    },

    // 08 · o fecho: a confirmação com a regra (03), o relógio com a faixa (04) e o cadeado aberto (07), em miniatura,
    //      entram de profundidades diferentes e se juntam na folha "POLÍTICA DE NO-SHOW", que se inclina; o ícone de
    //      salvar surge na frente dela e pulsa. No estado final, a folha fica visível atrás do ícone.
    8(ctx, t) {
      const tt = title(ctx, [{ t: 'Regra combinada antes,', c: W_ }, { t: 'decisão tranquila depois.', c: Li, br: true }], L.titleTop0 + 40, { max: 92, maxH: 300 });
      const sp = support(ctx, 'Salva pra montar a sua política de no-show.', { bottom: 1128, color: C.white, size: 44 });
      setFont(ctx, MONO, 28, 800, 1); ctx.fillStyle = C.grayM; ctx.fillText('@fazlohospeda', M, 1180);
      LINHAS.push({ tag: 'assinatura', texto: '@fazlohospeda', sozinha: false });
      CAIXAS.texto = [[M, tt.top - 6, M + CW, tt.bottom + 6], [M, sp.top - 6, M + CW, 1192]];
      const y0 = tt.bottom + 30, y1 = sp.top - 30, cy = (y0 + y1) / 2, k0 = saida(t);
      palco(ctx, t, y0, y1, k0);
      camada(ctx, k0, () => {
        const junta = eIO(p(t, 1.7, 2.5)), folha = eIO(p(t, 2.3, 3.0)), inclina = eIO(p(t, 3.1, 3.8));
        const MINI = [[-300, -40, 0.2, 'conf'], [0, -140, 0.45, 'rel'], [300, -20, 0.7, 'cad']];
        if (folha < 1) MINI.forEach(([dx, dy, a0, tipo], i) => {
          const k = mola(t, a0, 0.6); if (k <= 0) return;
          const flut = 8 * Math.sin(t * 1.6 + i * 2), x = 540 + dx * (1 - junta) + (1 - k) * dx * 0.6, y = cy + dy * (1 - junta) + flut * (1 - junta) + (1 - k) * 60;
          const s_ = (1.05 - 0.12 * i) * (1 - 0.35 * junta);
          ctx.save(); ctx.translate(x, y); ctx.scale(s_, s_); ctx.rotate((i - 1) * 0.08 * (1 - junta)); ctx.globalAlpha *= cl((t - a0) / 0.2) * (1 - folha);
          rr(ctx, -120, -90, 240, 180, 18); ctx.fillStyle = tipo === 'conf' ? OFF : '#171716'; ctx.fill(); ctx.strokeStyle = '#3A3A36'; ctx.lineWidth = 2; ctx.stroke();
          if (tipo === 'conf') { for (let r = 0; r < 5; r++) { const dest = r === 3; if (dest) { rr(ctx, -96, -58 + r * 30, 192, 20, 5); ctx.fillStyle = C.lime; ctx.fill(); } rr(ctx, -90, -54 + r * 30, dest ? 170 : 120 + 40 * hash(r, 3), 10, 5); ctx.fillStyle = 'rgba(10,10,10,0.55)'; ctx.fill(); } }
          else if (tipo === 'rel') { ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.strokeStyle = '#5E5E59'; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 62, ang24(14), ang24(22)); ctx.strokeStyle = C.lime; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke(); }
          else cadeado(ctx, 0, -10, 80, C.lime, 1, {});
          ctx.restore();
        });
        if (folha > 0) {
          const fw = 480, fh = Math.min(540, y1 - y0 - 30), fx = 540 - 70 * inclina, fy = cy - 16 * inclina, ang = -0.07 * inclina;
          ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang); ctx.scale(0.7 + 0.3 * folha, 0.7 + 0.3 * folha); ctx.globalAlpha *= folha;
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
          rr(ctx, -fw / 2, -fh / 2, fw, fh, 18); ctx.fillStyle = OFF; ctx.fill(); ctx.shadowColor = 'transparent';
          const tx = -fw / 2 + 40, top = -fh / 2;
          monoLab(ctx, 'POLÍTICA DE', tx, top + 64, '#5E5E59', 24, 'left', 3, 'folha POLÍTICA DE');
          monoLab(ctx, 'NO-SHOW', tx, top + 122, INK, 44, 'left', 2, 'folha NO-SHOW');
          ctx.fillStyle = 'rgba(10,10,10,0.15)'; ctx.fillRect(tx, top + 148, fw - 80, 2);
          ['REGRA NA CONFIRMAÇÃO', 'CHEGADA ATÉ 22H', 'MENSAGEM SE ATRASAR', 'SINAL CONFORME A REGRA', 'NOITES LIBERADAS'].forEach((s_, j) => {
            const yy = top + 196 + j * 62, kj = eOut(p(t, 2.6 + j * 0.1, 3.0 + j * 0.1));
            ctx.save(); ctx.globalAlpha *= kj; ctx.translate((1 - kj) * 20, 0);
            rr(ctx, tx, yy - 26, 30, 30, 8); ctx.fillStyle = C.lime; ctx.fill(); ctx.save(); ctx.translate(tx + 15, yy - 11); checkIcon(INK)(ctx, 22); ctx.restore();
            monoLab(ctx, s_, tx + 46, yy - 2, INK, 21, 'left', 1, 'folha ' + s_);
            ctx.restore();
          });
          ctx.restore();
        }
        const km = mola(t, 3.7, 0.6);
        if (km > 0) {
          const mx = 540 + 200, my = cy + 200, pul = t > 4.5 ? 0.5 + 0.5 * Math.sin(TAU * (t - 4.5) / 1.4) : 0, bate = t > 4.4 && t < 4.8 ? 1 + 0.12 * Math.sin(Math.PI * p(t, 4.4, 4.8)) : 1;
          for (const fase of [0, 0.5]) { if (t <= 4.5) break; const u = ((t - 4.5) / 1.4 + fase) % 1; ctx.beginPath(); ctx.arc(mx, my, 90 + 70 * u, 0, TAU); ctx.strokeStyle = rgba(C.lime, 0.4 * (1 - u)); ctx.lineWidth = 3; ctx.stroke(); }
          ctx.save(); ctx.translate(mx, my); ctx.scale(km * bate, km * bate);
          ctx.shadowColor = rgba(C.lime, 0.35 + 0.2 * pul); ctx.shadowBlur = 60;
          ctx.beginPath(); ctx.arc(0, 0, 90, 0, TAU); ctx.fillStyle = C.lime; ctx.fill(); ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.arc(0, 0, 90, 0, TAU); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke();
          marcador(ctx, 0, 4, 86, INK); ctx.restore();
        }
      });
      LINHAS.push({ tag: 'dados', texto: 'POLÍTICA DE NO-SHOW · regra na confirmação · chegada até 22h · mensagem · sinal conforme a regra · noites liberadas', sozinha: false });
    },
  };

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
  window.CARROSSEL = { init, render, W, H, N: 8, FPS, durDe: (n) => DURS[n], poseDe: (n) => POSE[n], CAIXAS };
  window.__LINHAS = () => LINHAS.slice();
})();
