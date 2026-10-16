/* =====================================================================
   FAZLO Hospeda — CARROSSEL 02 · Pilar DICA
   "5 respostas prontas pro ‘tem vaga?’" — 8 slides 1080x1350 (4:5)

   O mesmo modelo do Carrossel 01 ("Como cobrar o sinal"): fundo #0A0A0A,
   limão #AFFA27, Inter Display 900 nos títulos, JetBrains Mono NL nos chips
   e dados, cards #161616 com borda #3A3A3A. Sem telas do sistema, sem CTA
   de venda e sem emojis.

   Hierarquia fixa: título grande no terço superior, conteúdo no meio,
   apoio em cinza #B9B9B1 embaixo. Margem de 80 px nas laterais.
   Capa LIMÃO com texto preto (regra dos carrosséis do pilar DICA).
   Mecânicas: trilha de passos (slides 3–7, uma resposta por passo) e as
   bolhas limão do "VOCÊ", com os campos a preencher em mono, marcados.

   CARROSSEL.render(ctx, n)  desenha o slide n (1–8)
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
  function drawLines(ctx, wr, font, x, y0, lh, align = 'left') {
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
      if (wr.lines.length * size * lh <= maxH && wr.lines.every((l) => l.w <= maxW) && (!o.lines || wr.lines.length <= o.lines)) break;
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
    const wr = wrap(ctx, segs, font, o.maxW || CW);
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

  // slides 3–7: a trilha, a situação em caixa alta ("QUANDO" em branco, o resto em limão),
  // a bolha do VOCÊ no meio e o apoio embaixo
  function resposta(ctx, step, [a, b], texto, apoio) {
    track(ctx, step);
    const sp = support(ctx, apoio);
    const t = title(ctx, [{ t: a, c: W_ }, { t: b, c: Li }], L.titleTop, { max: 88 });   // o mesmo corpo nos 5 passos
    bubble(ctx, texto, { right: 982, vcenter: [t.bottom, sp.top], size: 40, maxW: 900, label: 'VOCÊ' });
  }

  const SLIDES = {
    // 1 · capa limão, texto preto
    1(ctx) {
      limeBackground(ctx);
      // "5 respostas prontas / pro ‘tem vaga?’" em 3 linhas, no maior corpo: ‘tem vaga?’ fica inteiro e o "pro" não sobra sozinho
      const t = title(ctx, [{ t: '5 respostas', c: INK }, { t: 'prontas pro', c: INK, br: true }, { t: '‘tem\u00A0vaga?’', c: INK, br: true }], 0, { lines: 3, max: 170, maxH: 720, lh: 1.0, vcenter: [330, 1120], maxW: CW - 8, x: M + 2 });
      chip(ctx, M + 2, t.top - 74, 'SALVA E COPIA', { size: 32, stroke: INK, color: INK, lw: 3 });
      swipe(ctx, INK, INK);
    },
    // 2 · o problema: a mesma pergunta, dezenas de vezes
    2(ctx) {
      const sp = support(ctx, ['Resposta pronta é resposta rápida.', 'E rápida fecha mais.']);
      const t = title(ctx, [{ t: 'Toda pousada recebe a mesma pergunta.', c: W_ }, { t: 'Dezenas de vezes por semana.', c: Li, br: true }], L.titleTop0, { max: 96 });
      // uma parede de cards "tem vaga?" (o desenho dos cards da série: #161616, borda, ponto limão), 4 fileiras de 3,
      // mais apagados no fundo e acendendo para a frente; o último, inteiro e com borda limão: a pergunta de agora
      const rows = 4, cols = 3, ch = 92, gx = 22, gy = 22, label = '‘tem vaga?’', fs = 30;
      const cw = (CW - 4 - (cols - 1) * gx) / cols,     // −4: a borda de 3 px do card aceso fica dentro de x 1000
        total = rows * ch + (rows - 1) * gy;
      const y0 = mid(t, sp) - total / 2;
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
        const x = M + 2 + k * (cw + gx), y = y0 + r * (ch + gy);
        const last = r === rows - 1 && k === cols - 1;
        const alpha = last ? 1 : 0.16 + 0.42 * ((r * cols + k) / (rows * cols - 1)) + 0.1 * hash(r, k + 3);
        ctx.save(); ctx.globalAlpha = alpha;
        card(ctx, x, y, cw, ch, { r: ch / 2, stroke: last ? C.lime : C.border, lw: last ? 3 : 2 });
        ctx.beginPath(); ctx.arc(x + 40, y + ch / 2, 9, 0, TAU); ctx.fillStyle = C.lime; ctx.fill();
        setFont(ctx, MONO, fs, 800, 1); ctx.fillStyle = C.white; ctx.fillText(label, x + 66, y + ch / 2 + fs * 0.36);
        ctx.restore();
      }
    },
    3(ctx) {
      resposta(ctx, 1, ['QUANDO', 'TEM VAGA'],
        'Oi, [nome]! Tenho sim para [datas]: [chalé], R$ [valor] a diária, com café da manhã. Quer que eu reserve pra você?',
        'Responda já com valor. Quem pergunta preço por último é quem mais desiste.');
    },
    4(ctx) {
      resposta(ctx, 2, ['QUANDO', 'NÃO TEM'],
        'Para essas datas estou lotada, mas tenho [outras datas] disponíveis. Quer que eu veja pra você?',
        'Nunca termine no ‘não tenho’. Ofereça outra data.');
    },
    5(ctx) {
      resposta(ctx, 3, ['QUANDO', 'NÃO DISSE AS DATAS'],
        'Tenho sim! Me confirma a entrada, a saída e quantas pessoas, que eu já te passo os valores.',
        'Peça os 3 dados de uma vez. Evita 10 mensagens de ida e volta.');
    },
    6(ctx) {
      resposta(ctx, 4, ['QUANDO', 'PEDE DESCONTO'],
        'Esse é o valor da data. Para [3 noites ou mais], consigo [condição].',
        'Desconto com condição. Nunca desconto solto.');
    },
    7(ctx) {
      resposta(ctx, 5, ['PARA', 'FECHAR'],
        'Para garantir a reserva, o sinal é de [X]% no Pix: [chave]. Assim que cair, te mando a confirmação.',
        'Sem sinal, a reserva é só uma promessa.');
    },
    // 8 · fechamento
    8(ctx) {
      title(ctx, [{ t: 'Resposta pronta não é resposta fria.', c: W_ }, { t: 'É resposta rápida.', c: Li, br: true }], L.titleTop0 + 40, { max: 100, maxH: 560 });
      support(ctx, 'Salva pra usar no próximo ‘tem vaga?’ e manda pra quem responde os hóspedes aí.', { bottom: 1104 });
      brand(ctx, 540, 1226);
    },
  };

  function init(img) { LOGO = img; }
  function render(ctx, n) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    background(ctx);                                   // (a capa limão pinta o próprio fundo por cima)
    SLIDES[n](ctx);
  }
  window.CARROSSEL = { init, render, W, H, N: 8 };
})();
