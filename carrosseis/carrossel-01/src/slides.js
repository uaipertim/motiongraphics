/* =====================================================================
   FAZLO Hospeda — CARROSSEL 01 · Pilar DICA
   "Como cobrar o sinal sem constrangimento" — 8 slides 1080x1350 (4:5)

   Mesmo DNA dos Reels: fundo #0A0A0A, limão #AFFA27, Inter Display 900 nos
   títulos, JetBrains Mono NL nos chips e dados, cards #161616 com borda
   #3A3A3A. Sem telas do sistema e sem CTA de venda.

   Hierarquia fixa: título grande no terço superior, conteúdo no meio,
   apoio em cinza #B9B9B1 embaixo. Margem de 80 px nas laterais.
   Mecânicas: trilha de passos (slides 3–7), bolhas limão para as mensagens
   do dono da pousada (genéricas, sem imitar app de mensagens) e a notinha
   do Reel 07 (src/notinha.js) no slide 7.

   CARROSSEL.render(ctx, n)  desenha o slide n (1–8)
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1350, M = 80, CW = W - 2 * M;          // área útil: x 80–1000
  const DISPLAY = "'C1 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'C1 Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#0A0A0A', bg0: '#050505', card: '#161616', border: '#3A3A3A',
    lime: '#AFFA27', limeD: '#8CD10C', white: '#FFFFFF', gray: '#B9B9B1', grayM: '#8E8E88', grayD: '#5E5E59', ink: '#0A0A0A',
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
      if (wr.lines.length * size * lh <= maxH && wr.lines.every((l) => l.w <= maxW)) break;
    }
    const font = { fam: DISPLAY, size, weight: 900, ls: -0.03 * size };
    if (o.vcenter) top = (o.vcenter[0] + o.vcenter[1]) / 2 - (size * 0.727 + (wr.lines.length - 1) * size * lh + size * 0.24) / 2;
    const base = top + size * 0.727;
    drawLines(ctx, wr, font, o.x || M, base, size * lh, o.align);
    return { size, top, bottom: base + (wr.lines.length - 1) * size * lh + size * 0.24, lines: wr.lines.length };
  }
  function support(ctx, text, o = {}) {
    const size = o.size || SUPPORT, lh = size * 1.32;
    const font = { fam: DISPLAY, size, weight: 600, ls: -0.005 * size };
    const wr = wrap(ctx, [{ t: text, c: o.color || C.gray }], font, o.maxW || CW);
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
    const words = text.split(' ').filter(Boolean).map((wd) => {
      const runs = wd.split(/(\[[^\]]+\])/).filter(Boolean).map((r) => {
        const ph = /^\[.*\]$/.test(r);
        const w = ph ? tw(ctx, r, MONO, phSize, 800) + 16 : tw(ctx, r, font.fam, size, 700, font.ls);
        return { t: r, ph, w };
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
            rr(ctx, x, y - phSize * 0.98, r.w, phSize * 1.32, 10); ctx.fillStyle = 'rgba(10,10,10,0.13)'; ctx.fill();
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
  const W_ = C.white, Li = C.lime;
  const mid = (t, sp) => (t.bottom + sp.top) / 2;          // centro da faixa de conteúdo
  const SLIDES = {
    // 1 · capa
    1(ctx) {
      const t = title(ctx, [{ t: 'Como cobrar o sinal', c: W_ }, { t: 'sem ficar sem graça.', c: Li, br: true }], 0, { max: 170, maxH: 720, lh: 1.0, vcenter: [330, 1120], maxW: CW - 8, x: M + 2 });
      chip(ctx, M + 2, t.top - 74, 'GUIA RÁPIDO · SALVA ESSE', { size: 32, stroke: C.lime, color: C.lime, fill: rgba(C.lime, 0.08), lw: 3 });
      const fw = tw(ctx, 'ARRASTA', MONO, 34, 800, 4), aw = 64, ax = 996;
      setFont(ctx, MONO, 34, 800, 4); ctx.fillStyle = C.gray; ctx.fillText('ARRASTA', ax - aw - 18 - fw, 1252);
      ctx.strokeStyle = C.lime; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax - aw, 1240); ctx.lineTo(ax, 1240); ctx.moveTo(ax - 20, 1222); ctx.lineTo(ax, 1240); ctx.lineTo(ax - 20, 1258); ctx.stroke();
    },
    // 2 · o problema
    2(ctx) {
      const sp = support(ctx, 'Sem sinal, a reserva é só uma promessa.');
      const t = title(ctx, [{ t: 'O hóspede pede a vaga.', c: W_ }, { t: 'Você segura a data.', c: W_, br: true }, { t: 'Ele some.', c: Li, br: true }], L.titleTop0, { max: 96 });
      // a reserva sem sinal: um card tracejado que se desfaz
      const w = CW, h = 360, x = M, y = mid(t, sp) - h / 2;
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const o = off.getContext('2d');
      card(o, x, y, w, h, { dash: [16, 12], stroke: '#4A4A4A', lw: 3 });
      setFont(o, MONO, 30, 800, 3); o.fillStyle = C.grayM; o.fillText('CHALÉ 2', x + 48, y + 84);
      const cl = tw(o, 'CHALÉ 2', MONO, 30, 800, 3);
      chip(o, x + 48 + cl + 18, y + 74, 'SEM SINAL', { size: 26, stroke: C.grayD, color: C.gray });
      setFont(o, DISPLAY, 132, 900, -4); o.fillStyle = C.white; o.fillText('14 a 16/11', x + 44, y + 262);
      // só a ponta direita do card se desfaz: a reserva "some" (o texto fica inteiro)
      o.globalCompositeOperation = 'destination-out';
      const d0 = 0.74;
      for (let k = 0; k < 2600; k++) {
        const u = hash(k, 41), px = x + w * (d0 + (1.04 - d0) * Math.pow(u, 0.8)), py = y - 6 + (h + 12) * hash(k, 42);
        const pr = ((px - x) / w - d0) / (1 - d0);
        if (hash(k, 43) < pr * 1.15) { const s = 6 + 12 * hash(k, 44); o.fillRect(px, py, s, s); }
      }
      const fade = o.createLinearGradient(x + w * d0, 0, x + w, 0);
      fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.75)');
      o.fillStyle = fade; o.fillRect(x, y - 10, w + 20, h + 20);
      ctx.drawImage(off, 0, 0);
    },
    // 3 · passo 01
    3(ctx) {
      track(ctx, 1);
      const sp = support(ctx, 'Nem antes de passar o valor, nem dias depois. Data confirmada → sinal pedido.');
      const t = title(ctx, [{ t: 'Peça', c: W_ }, { t: 'logo depois', c: Li }, { t: 'que ele confirmar as datas.', c: W_ }], L.titleTop);
      const cy = mid(t, sp), size = 44;
      const a = chip(ctx, M, cy, 'DATAS OK', { size, fill: C.card, stroke: C.border, color: C.white, h: 116, padX: 34, icon: checkIcon(C.lime) });
      const bch = chip(ctx, 1000, cy, 'PEDE O SINAL', { size, fill: C.lime, color: C.ink, h: 116, padX: 34, align: 'right' });
      // a seta no meio do vão entre os dois chips
      const ax = (a.left + a.w + bch.left) / 2 - 36;
      ctx.strokeStyle = C.lime; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, cy); ctx.lineTo(ax + 70, cy); ctx.moveTo(ax + 48, cy - 22); ctx.lineTo(ax + 72, cy); ctx.lineTo(ax + 48, cy + 22); ctx.stroke();
    },
    // 4 · passo 02
    4(ctx) {
      track(ctx, 2);
      const sp = support(ctx, 'Tom de quem está garantindo a vaga dele, não de quem está cobrando.');
      const t = title(ctx, [{ t: 'Tenha a mensagem', c: W_ }, { t: 'pronta.', c: Li }], L.titleTop);
      bubble(ctx, 'Perfeito, [nome]! Para garantir o chalé de 14 a 16/11, o sinal é de 50% (R$ 450). Pode ser por Pix: [chave]. Assim que cair, te mando a confirmação 😊',
        { right: 982, vcenter: [t.bottom, sp.top], size: 40, maxW: 900, label: 'VOCÊ' });
    },
    // 5 · passo 03
    5(ctx) {
      track(ctx, 3);
      const sp = support(ctx, 'Os valores são exemplos. Use a regra da sua pousada.', { size: 30, color: C.grayM });
      const t = title(ctx, [{ t: 'Diga a regra', c: W_ }, { t: 'antes, não depois.', c: Li, br: true }], L.titleTop);
      const items = [['SINAL', '30% a 50% da hospedagem'], ['PRAZO', '24h para pagar; depois a data volta a ficar livre'], ['CANCELAMENTO', 'o que acontece com o sinal']];
      const font = { fam: DISPLAY, size: 40, weight: 700, ls: -0.4 };
      const cardH = (txt) => 40 + 30 + 22 + wrap(ctx, [{ t: txt, c: C.white }], font, CW - 96).lines.length * 52 + 26;
      const total = items.reduce((a, [, txt]) => a + cardH(txt), 0) + 22 * (items.length - 1);
      let y = mid(t, sp) - total / 2;
      items.forEach(([lab, txt]) => {
        const wr = wrap(ctx, [{ t: txt, c: C.white }], font, CW - 96);
        const h = cardH(txt);
        card(ctx, M, y, CW, h);
        setFont(ctx, MONO, 28, 800, 3); ctx.fillStyle = C.lime; ctx.fillText(lab, M + 48, y + 40 + 22);
        drawLines(ctx, wr, font, M + 48, y + 40 + 30 + 22 + 30, 52);
        y += h + 22;
      });
    },
    // 6 · passo 04
    6(ctx) {
      track(ctx, 4);
      const sp = support(ctx, 'Confirmação dá segurança pro hóspede e pra você.');
      const t = title(ctx, [{ t: 'Caiu o sinal?', c: W_ }, { t: 'Confirme na hora.', c: Li, br: true }], L.titleTop);
      bubble(ctx, 'Sinal recebido ✅ Sua reserva está confirmada: Chalé 2, 14 a 16/11, 2 adultos. Restante: R$ 450 no check-in.',
        { right: 982, vcenter: [t.bottom, sp.top], size: 40, maxW: 900, label: 'VOCÊ' });
    },
    // 7 · passo 05
    7(ctx) {
      track(ctx, 5);
      const sp = support(ctx, 'Sinal que não foi anotado vira dúvida no fim do mês.');
      const t = title(ctx, [{ t: 'Anote', c: W_ }, { t: 'no mesmo dia.', c: Li, br: true }], L.titleTop);
      const nota = { cx: 540, fs: 35, tilt: -1.2, lines: ['SINAL PAGO .......... R$ 450 · PIX', 'FALTA ............... R$ 450 · CHECK-IN'] };
      const nh = NOTINHA.height(nota);                    // papel acima da fenda + a boca da impressora
      NOTINHA.draw(ctx, Object.assign(nota, { slotY: mid(t, sp) + nh.paper / 2 - nh.mouth / 2 }));
    },
    // 8 · fechamento
    8(ctx) {
      title(ctx, [{ t: 'Sinal cobrado com clareza não afasta hóspede.', c: W_ }, { t: 'Afasta quem ia sumir.', c: Li, br: true }], L.titleTop0 + 40, { max: 100, maxH: 560 });
      support(ctx, 'Salva pra usar no próximo ‘tem vaga?’ e manda pra quem cuida das reservas aí.', { bottom: 1104 });
      brand(ctx, 540, 1226);
    },
  };

  function init(img) { LOGO = img; }
  function render(ctx, n) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    background(ctx);
    SLIDES[n](ctx);
  }
  window.CARROSSEL = { init, render, W, H, N: 8 };
})();
