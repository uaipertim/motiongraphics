/*
 * FAZLO Hospeda — STORIES PARA DESTAQUE (modelo reutilizável).
 *
 * Cada destaque é um JSON (stories/destaques/<id>.json) com uma lista de Stories de 6–8 s, sem áudio. A identidade é a
 * da Série EXPLICA: a NOTINHA (fita de papel na esquerda que imprime uma linha por Story e fecha o destaque), o CHAVEIRO
 * de chalé "Nº 01", o fundo escuro com tom por Story, limão #AFFA27, Inter Display + JetBrains Mono e a logo oficial.
 * Nada de texto em y < 250 nem em y > 1670 (o Instagram cobre essas faixas nos Stories); nenhuma tela do sistema.
 *
 * Tipos de Story (EL): abertura · cadeado · regra · checks · comanda · etiqueta · fechamento · agenda.
 * Todo texto entra até ~2,6 s e fica parado até o fim (≥ 3 s); no Story com "fecho", a notinha imprime o fim
 * ("7 DE 7 ✓") e, nos últimos 3 s, entra a logo oficial centralizada.
 *
 *   DESTAQUE.init(logo, json)   DESTAQUE.renderAt(ctx, i, t)   DESTAQUE.capa(ctx, icone)   DESTAQUE.caixas(ctx, i, t)
 */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', 'Noto Color Emoji', sans-serif";
  const MONO = "'FL Mono', monospace";
  const C = {
    bg: '#0A0B0A', card: '#131513', card2: '#191C19', line: '#2C302B', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2',
    grayD: '#6B6F68', red: '#FF5C5C', amber: '#FFB23F', ink: '#0A0A0A', gold: '#F2C14E', heart: '#FF4D6D',
  };
  const TONS = { limao: '#AFFA27', ambar: '#FFA62B', petroleo: '#13A6AE', roxo: '#8D6BFF' };
  // as cores do papel da notinha (a geometria dos Stories fica em Z, no fim do arquivo)
  const TP = { x0: 20, x1: 140, slot: 1572, topo: 14, papel: '#F1EDE2', papel2: '#E4DECF', tinta: '#1C1E1A', apagado: '#BDB6A4' };

  // ---------------------------------------------------------------- utilitários
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x, s = 1.70158) => (x <= 0 ? 0 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const css = (h, a = 1) => { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const mixHex = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
  const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function setFont(ctx, fam, size, weight, ls = 0) { ctx.font = `${weight} ${size}px ${fam}`; ctx.letterSpacing = `${ls}px`; }
  let M = null;                                         // contexto só para medir
  function tw(s, fam, size, weight, ls = 0) { setFont(M, fam, size, weight, ls); return M.measureText(s).width - (s.length ? ls : 0); }
  function txt(ctx, s, x, y, o = {}) {
    const fam = o.fam || DISPLAY, size = o.size || 40, weight = o.weight || 700, ls = o.ls || 0;
    const w = tw(s, fam, size, weight, ls);
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    if ((o.alpha ?? 1) > 0.002) {
      ctx.save(); setFont(ctx, fam, size, weight, ls); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha *= o.alpha ?? 1; ctx.fillStyle = o.color || C.white;
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 22; }
      ctx.fillText(s, x0, y); ctx.restore();
    }
    if (o.box) BOX(o.box, x0, y - size * 0.76, x0 + w, y + size * 0.22);
    // para a revisão: todo texto visível vira uma caixa "texto" (a revisão confere se cabe no cartão que o contém)
    if (BOXES && s.trim() && (o.alpha ?? 1) * ctx.globalAlpha > 0.5) BOXES.push({ tipo: 'texto', cap: OFF.n, nome: s, ...naTela(ctx, x0, y - size * 0.72, x0 + w, y + (/[gjpqyçÇ,;]/.test(s) ? size * 0.2 : 0)) });
    return w;
  }
  function fitSize(lines, fam, weight, maxW, maxS, lsK = 0) {
    let s = maxS;
    while (s > 20 && lines.some((l) => tw(l, fam, s, weight, lsK * s) > maxW)) s -= 1;
    return s;
  }
  // texto com marcação: *limão* e ~vermelho~
  function runs(line, base) {
    const out = []; let cur = '', mode = null;
    for (const ch of line) {
      if (ch === '*' || ch === '~') { if (cur) out.push({ s: cur, c: mode ? (mode === '*' ? C.lime : C.red) : base }); cur = ''; mode = mode === ch ? null : ch; continue; }
      cur += ch;
    }
    if (cur) out.push({ s: cur, c: mode ? (mode === '*' ? C.lime : C.red) : base });
    return out;
  }
  const plain = (s) => (s || '').replace(/[*~]/g, '');
  function wrapRich(line, base, fam, size, weight, maxW) {
    // uma palavra só começa depois de um espaço: "~confirmadas~." é uma palavra (vermelha + o ponto na cor base)
    const words = []; let cur = null;
    runs(line, base).forEach((r) => r.s.split(/(\s+)/).forEach((w, i, arr) => {
      if (!w) return;
      if (!w.trim()) { cur = null; return; }
      const seg = { s: w, c: r.c, w: tw(w, fam, size, weight) };
      if (cur) { cur.segs.push(seg); cur.w += seg.w; } else { cur = { segs: [seg], w: seg.w }; words.push(cur); }
      if (i < arr.length - 1) cur = null;
    }));
    const sp = tw(' ', fam, size, weight);
    const rows = [[]]; let x = 0;
    words.forEach((w) => {
      if (rows[rows.length - 1].length && x + sp + w.w > maxW) { rows.push([]); x = 0; }
      const row = rows[rows.length - 1];
      x += (row.length ? sp : 0) + w.w; row.push(w);
    });
    // duas linhas equilibradas, sem palavra sozinha
    if (rows.length === 2 && rows[1].length === 1 && rows[0].length > 2) { rows[1].unshift(rows[0].pop()); }
    return rows.map((r) => ({ words: r, w: r.reduce((a, b) => a + b.w, 0) + sp * (r.length - 1), sp }));
  }

  // ---------------------------------------------------------------- ícones (traço em grade de 24, como os ícones de interface)
  const ICON = {
    chale: 'M3 11.5 12 3.5l9 8 M5.5 9.5V21h13V9.5 M10 21v-5.5h4V21 M8 12.5h2 M14 12.5h2',
    mala: 'M4.5 8h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-9A1.5 1.5 0 0 1 4.5 8z M9 8V5.2h6V8 M8 8v12 M16 8v12',
    chave: 'M7.5 15.8a3.8 3.8 0 1 1 0-7.6 3.8 3.8 0 0 1 0 7.6z M11.3 12H21 M18 12v3 M21 12v2.2',
    moedas: 'M12 4c3.9 0 7 1.1 7 2.5S15.9 9 12 9 5 7.9 5 6.5 8.1 4 12 4z M5 6.5v4C5 11.9 8.1 13 12 13s7-1.1 7-2.5v-4 M5 10.5v4C5 15.9 8.1 17 12 17s7-1.1 7-2.5v-4 M5 14.5v3C5 18.9 8.1 20 12 20s7-1.1 7-2.5v-3',
    cadeado: 'M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-7A1.5 1.5 0 0 1 6.5 11z M8 11V7.5a4 4 0 0 1 8 0V11 M12 15v2',
    cadeado_aberto: 'M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-7A1.5 1.5 0 0 1 6.5 11z M8 11V7a4 4 0 0 1 7.7-1.6 M12 15v2',
    check: 'M5 12.5l4.5 4.5L19 7',
    x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
    alerta: 'M12 3.5 2.8 19.5h18.4L12 3.5z M12 9.5v4.8 M12 17v.3',
    calendario: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M3 10h18 M8 3v4 M16 3v4',
    cartao: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M2 10h20 M6 15h4',
    recibo: 'M6 2.5h12v19l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z M9 7.5h6 M9 11.5h6 M9 15.5h4',
    comanda: 'M8.5 3.5h7v3h-7z M7 5H5.5A1.5 1.5 0 0 0 4 6.5v13A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 5H17 M8 11.5h8 M8 15.5h5',
    pix: 'M12 3l9 9-9 9-9-9z M12 8.2l3.8 3.8-3.8 3.8L8.2 12z',
    etiqueta: 'M3.5 12.5v-8a1 1 0 0 1 1-1h8l8.5 8.5-9 9z M8.3 8.3h.01',
    taca: 'M7.5 3h9c0 5.3-2 8.3-4.5 8.3S7.5 8.3 7.5 3z M12 11.3V19 M8.5 20.5h7',
    curtir: 'M12 20.3s-7.8-4.7-7.8-10.4A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.5c0 5.7-7.8 10.4-7.8 10.4z',
    comentar: 'M4.5 4.5h15A1.5 1.5 0 0 1 21 6v9.5a1.5 1.5 0 0 1-1.5 1.5H11l-4.8 3.8V17H4.5A1.5 1.5 0 0 1 3 15.5V6a1.5 1.5 0 0 1 1.5-1.5z',
    enviar: 'M21 3 10.6 13.4 M21 3l-6.6 18-3.8-7.6L3 9.6z',
    salvar: 'M6.5 3h11v18L12 16.6 6.5 21z',
    carteira: 'M4.5 6.5h14A1.5 1.5 0 0 1 20 8v11a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 19V8a1.5 1.5 0 0 1 1.5-1.5z M15.5 11.5H21v4h-5.5a2 2 0 0 1 0-4z M5 6.5l9.5-3v3',
    seta: 'M4 12h16 M14 6l6 6-6 6',
    relogio: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 7v5l3.2 2',
    lupa: 'M10.5 3.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M15.6 15.6 21 21',
    telefone: 'M6.8 3.5h2.7l1.5 4.3-2.1 1.4a12.5 12.5 0 0 0 6 6l1.4-2.1 4.3 1.5v2.7a2 2 0 0 1-2.2 2A17 17 0 0 1 4.8 5.7a2 2 0 0 1 2-2.2z',
  };
  const ICON2D = {};
  function icon(ctx, name, x, y, s, col, o = {}) {
    if (!ICON2D[name]) ICON2D[name] = new Path2D(ICON[name] || ICON.x);
    ctx.save(); ctx.translate(x, y); const k = s / 24; ctx.scale(k, k); ctx.translate(-12, -12);
    ctx.lineWidth = o.lw || 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col;
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = (o.glowB || 18) / k; }
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(ICON2D[name]); }
    ctx.stroke(ICON2D[name]); ctx.restore();
  }

  // ---------------------------------------------------------------- peças de interface
  function panel(ctx, x, y, w, h, o = {}) {
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    rr(ctx, x, y, w, h, o.r ?? 24);
    if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, o.fill2 || C.card2); g.addColorStop(1, o.fill || C.card);
    ctx.fillStyle = o.flat || g; ctx.fill();
    ctx.shadowColor = 'transparent';
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowB || 26; }
    ctx.setLineDash(o.dash || []); ctx.lineDashOffset = o.dashOff || 0;
    ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke || C.line; ctx.stroke();
    ctx.restore();
    if (o.box) BOX(o.box, x, y, x + w, y + h);
    if (BOXES && (o.alpha ?? 1) * ctx.globalAlpha > 0.5) BOXES.push({ tipo: 'cartao', cap: OFF.n, nome: o.box || 'cartão', ...naTela(ctx, x, y, x + w, y + h) });
  }
  // pílula com texto (e ícone opcional); devolve a largura
  function chip(ctx, s, x, y, o = {}) {
    const size = o.size || 24, fam = o.fam || MONO, weight = o.weight || 800, ls = o.ls ?? 2, h = o.h || Math.round(size * 2.1);
    const iw = o.icon ? size * 1.25 + 10 : 0, pad = o.pad ?? 22;
    const w = o.w || pad * 2 + iw + tw(s, fam, size, weight, ls);
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    rr(ctx, x0, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || css(C.lime, 0.1); ctx.fill();
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 20; }
    ctx.setLineDash(o.dash || []); ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.border || css(C.lime, 0.55); if (o.border !== 'none') ctx.stroke();
    ctx.shadowColor = 'transparent';
    if (o.icon) icon(ctx, o.icon, x0 + pad + size * 0.62, y, size * 1.25, o.color || C.lime, { lw: 2.2 });
    txt(ctx, s, x0 + pad + iw, y + size * 0.36, { fam, size, weight, ls, color: o.color || C.lime });
    ctx.restore();
    if (o.box) BOX(o.box, x0, y - h / 2, x0 + w, y + h / 2);
    return w;
  }
  // círculo com ícone (check, alerta…) que estoura
  function badge(ctx, x, y, r, name, col, e, o = {}) {
    if (e <= 0.001) return;
    const k = E.outBack(clamp(e), 2.2);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = o.bg || col; ctx.shadowColor = css(col, 0.6); ctx.shadowBlur = 18; ctx.fill();
    ctx.shadowColor = 'transparent';
    icon(ctx, name, 0, 0, r * 1.25, o.ink || C.ink, { lw: 3 });
    ctx.restore();
    if (o.box) BOX(o.box, x - r, y - r, x + r, y + r);
  }
  // entrada padrão de uma peça: sobe 28 px e aparece (0..1)
  const ent = (t, t0, d = 0.45) => (t0 === null || t0 === undefined ? 0 : E.outCubic(p(t, t0, t0 + d)));
  function enter(ctx, e, x, y, fn, o = {}) {
    if (e <= 0.002) return;
    ctx.save(); ctx.globalAlpha *= clamp(e * 1.4);
    const dy = (o.dy ?? 28) * (1 - e), k = lerp(o.k0 ?? 0.94, 1, e);
    ctx.translate(x, y + dy); ctx.scale(k, k); ctx.translate(-x, -y);
    fn(); ctx.restore();
  }

  // a caixa (x0, y0)–(x1, y1) desenhada com a transformação atual do canvas, em coordenadas da tela
  function naTela(ctx, x0, y0, x1, y1) {
    const m = ctx.getTransform(), pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
    return { x0: Math.min(...pts.map((q) => q[0])), y0: Math.min(...pts.map((q) => q[1])), x1: Math.max(...pts.map((q) => q[0])), y1: Math.max(...pts.map((q) => q[1])) };
  }
  // ---------------------------------------------------------------- estado
  let BOXES = null, OFF = { dx: 0, dy: 0, n: 0 };
  function BOX(name, x0, y0, x1, y1) { if (BOXES) BOXES.push({ cap: OFF.n, nome: name, x0, y0, x1, y1 }); }
  // registra um "cartão" que não é um panel (o papel da notinha grande, a comanda) para a checagem de textos
  function CARTAO(name, x0, y0, x1, y1, ctx) { if (BOXES) BOXES.push({ tipo: 'cartao', cap: OFF.n, nome: name, ...(ctx ? naTela(ctx, x0, y0, x1, y1) : { x0, y0, x1, y1 }) }); }
  let D = null, LOGO = null, ST = null;                 // o destaque (JSON), a logo, o Story atual
  const ICONES_CAPA = {
    lampada: 'M9 18.5h6 M10 21.5h4 M12 2.5a6.5 6.5 0 0 1 3.9 11.7c-.8.6-1.2 1.4-1.2 2.3v.3H9.3v-.3c0-.9-.4-1.7-1.2-2.3A6.5 6.5 0 0 1 12 2.5z',
    ciclo: 'M20 12a8 8 0 0 1-14 5.3 M4 12a8 8 0 0 1 14-5.3 M18.6 2.6v4.2h-4.2 M5.4 21.4v-4.2h4.2',
    chale: ICON.chale,
    balao: ICON.comentar,
  };

  // =====================================================================
  // FUNDO, MARCA, CHAVEIRO
  // =====================================================================
  function background(ctx, t, tom) {
    const tn = TONS[tom] || C.lime, br = 1 + 0.16 * Math.sin(t * 1.25);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g1x = 820 + 90 * Math.sin(t * 0.33), g1y = 700 + 80 * Math.cos(t * 0.27);
    let g = ctx.createRadialGradient(g1x, g1y, 0, g1x, g1y, 1000);
    g.addColorStop(0, css(tn, 0.17 * br)); g.addColorStop(0.45, css(tn, 0.06 * br)); g.addColorStop(1, css(tn, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2x = 300 + 50 * Math.cos(t * 0.13), g2y = 1500 + 60 * Math.sin(t * 0.15);
    g = ctx.createRadialGradient(g2x, g2y, 0, g2x, g2y, 860);
    g.addColorStop(0, css(tn, 0.1)); g.addColorStop(1, css(tn, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    const oy = -((t * 4) % 48);
    for (let y = oy; y < H; y += 48) for (let x = 12; x < W; x += 48) ctx.fillRect(x, y, 2, 2);
    for (let i = 0; i < 36; i++) {
      const x = 20 + hash(i, 5) * 1040 + 8 * Math.sin(t * 0.7 + i);
      const y = ((hash(i, 6) * (H + 100) - t * (12 + 22 * hash(i, 7))) % (H + 100) + H + 100) % (H + 100) - 50;
      ctx.fillStyle = css(i % 4 ? '#FFFFFF' : tn, 0.05 + 0.12 * hash(i, 8));
      ctx.beginPath(); ctx.arc(x, y, 1.2 + 2 * hash(i, 9), 0, TAU); ctx.fill();
    }
    g = ctx.createRadialGradient(540, 960, 520, 540, 960, 1250);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function logo(ctx, x, y, d, a = 1) { if (LOGO) { ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(LOGO, x - d / 2, y - d / 2, d, d); ctx.restore(); } }
  function brand(ctx) {
    const d = 50, nameW = tw('FAZLO Hospeda', DISPLAY, 27, 800), handleW = tw(D.marca, MONO, 19, 700, 0.5);
    const gw = d + 14 + Math.max(nameW, handleW), x0 = 540 - gw / 2, cy = Z.marcaY;
    logo(ctx, x0 + d / 2, cy, d);
    const tx = x0 + d + 14;
    const w1 = txt(ctx, 'FAZLO', tx, cy - 3, { size: 27, weight: 800, color: C.white });
    txt(ctx, 'Hospeda', tx + w1 + 6, cy - 3, { size: 27, weight: 800, color: C.lime });
    txt(ctx, D.marca, tx, cy + 22, { fam: MONO, size: 19, weight: 700, color: C.gray, ls: 0.5 });
    BOX('marca', x0, cy - d / 2, x0 + gw, cy + d / 2);
  }
  // o chaveiro de chalé "Nº 03" (o mesmo da Série EXPLICA): balança ao entrar e para
  function chaveiro(ctx, x, y, num, t, tIn, decai = 3.4) {
    const dt = t - tIn;
    if (dt < 0) return;
    const e = E.outCubic(p(dt, 0, 0.22));
    const ang = (dt < 2.2 ? 16 * Math.exp(-decai * dt) * Math.cos(10 * dt) : 0) * DEG;
    const px = x + 20, py = y, hx = 22, rc = 20;
    const argola = (a0, a1, lw) => { ctx.beginPath(); ctx.arc(hx - rc, 0, rc, a0, a1); ctx.lineWidth = lw; ctx.stroke(); };
    ctx.save(); ctx.globalAlpha *= clamp(e * 1.5);
    ctx.translate(px, py - 26 * (1 - e)); ctx.rotate(ang); ctx.lineCap = 'round';
    ctx.strokeStyle = '#C9CCC5'; argola(0, TAU, 3.6);
    ctx.strokeStyle = '#FFFFFF'; argola(-2.5, -1.6, 1.6);
    const tx0 = 8, tx1 = 158, h = 50;
    ctx.beginPath();
    ctx.moveTo(tx0 + 25, -h / 2); ctx.lineTo(tx1 - 26, -h / 2); ctx.quadraticCurveTo(tx1 - 6, -h / 2 + 4, tx1, 0);
    ctx.quadraticCurveTo(tx1 - 6, h / 2 - 4, tx1 - 26, h / 2); ctx.lineTo(tx0 + 25, h / 2);
    ctx.arc(tx0 + 25, 0, h / 2, Math.PI / 2, -Math.PI / 2); ctx.closePath();
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#CBFF6A'); g.addColorStop(1, '#9EE61C');
    ctx.fillStyle = g; ctx.shadowColor = css(C.lime, 0.45); ctx.shadowBlur = 18; ctx.shadowOffsetY = 4; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(10,10,10,0.25)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, 0, 6, 0, TAU); ctx.fillStyle = '#0D0F0C'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(hx, 0, 6, 0, TAU); ctx.clip(); ctx.strokeStyle = '#C9CCC5'; argola(-0.6, 0.6, 3.6); ctx.restore();
    icon(ctx, 'chale', 50, -1, 24, C.ink, { lw: 2.4 });
    txt(ctx, `Nº ${num}`, 68, 9, { fam: MONO, size: 24, weight: 800, color: C.ink });
    ctx.restore();
    if (dt > 1.2) BOX('chaveiro', x, y - 25, x + 178, y + 25);
  }

  // =====================================================================
  // A NOTINHA DO DESTAQUE: uma linha por dica, impressa no Story da dica; a de cada dica anterior já vem com check
  // =====================================================================
  function buildNota() {
    const ents = [{ tipo: 'topo', h: 56, story: 0 }];
    D.stories.forEach((s, i) => { if (s.n) ents.push({ tipo: 'item', story: i, num: String(s.n).padStart(2, '0'), t: s.nota, h: 34 + 23 + 14 }); });
    ents.push({ tipo: 'fim', h: 96, story: D.stories.length - 1 });
    let y = 0;
    ents.forEach((e) => { e.y = y; y += e.h; });
    return ents;
  }
  // em que momento (no Story atual) cada linha é impressa: as dos Stories anteriores já estão impressas
  function quando(e) {
    if (e.story < ST.i) return -9;
    if (e.story > ST.i) return null;
    if (e.tipo === 'topo') return ST.T.nota;
    if (e.tipo === 'fim') return ST.T.fim_nota;
    return ST.T.nota;
  }
  function serra(ctx, x0, x1, y, dir, n = 9) { const w = (x1 - x0) / n; for (let i = 0; i < n; i++) { ctx.lineTo(x0 + (i + 0.5) * w, y + dir * 7); ctx.lineTo(x0 + (i + 1) * w, y); } }
  function drawNota(ctx, t) {
    const ents = D._nota, durE = (e) => (e.tipo === 'fim' ? 0.3 : 0.36), dur = 0.36;
    const din = ST.i === 0 ? E.outCubic(p(t, 0.05, 0.45)) : 1, dx = -180 * (1 - din);
    let len = 0;
    ents.forEach((e) => { const q = quando(e); if (q !== null) len += e.h * E.inOutCubic(p(t, q, q + durE(e))); });
    const x0 = Z.notaX0 + dx, x1 = Z.notaX1 + dx, slot = Z.slot, top = slot - len - 14;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x1 + 40, slot); ctx.clip();
    ctx.beginPath(); ctx.moveTo(x0, top + 7); serra(ctx, x0, x1, top + 7, -1); ctx.lineTo(x1, slot); ctx.lineTo(x0, slot); ctx.closePath();
    const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, TP.papel2); g.addColorStop(0.18, TP.papel); g.addColorStop(0.85, TP.papel); g.addColorStop(1, TP.papel2);
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.fill(); ctx.shadowColor = 'transparent';
    CARTAO('notinha', x0, Math.max(top, 0), x1, slot);
    const y0 = top + 14;
    ents.forEach((e) => {
      const q = quando(e);
      if (q === null || t < q) return;
      const y = y0 + e.y;
      if (e.tipo === 'topo') {
        txt(ctx, D.nota.topo, (x0 + x1) / 2, y + 30, { fam: MONO, size: 21, weight: 800, align: 'center', color: TP.tinta, ls: 2 });
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = css(TP.tinta, 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 10, y + 46); ctx.lineTo(x1 - 10, y + 46); ctx.stroke(); ctx.restore();
      } else if (e.tipo === 'item') {
        txt(ctx, e.num, x0 + 14, y + 32, { fam: MONO, size: 22, weight: 800, color: TP.tinta });
        let fs = 18; while (fs > 15 && tw(e.t, MONO, fs, 700) > x1 - x0 - 28) fs -= 1;
        txt(ctx, e.t, x0 + 14, y + 57, { fam: MONO, size: fs, weight: 700, color: TP.tinta });
        const ax = x0 + 48, bx = x1 - 36, n = Math.floor((bx - ax) / 7);
        const ck = e.story < ST.i ? 1 : p(t, ST.T.check, ST.T.check + 0.3);
        for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.arc(ax + i * 7, y + 25, 1.6, 0, TAU); ctx.fillStyle = ck > 0 || i / n <= p(t, q, ST.T.check) ? TP.tinta : TP.apagado; ctx.fill(); }
        if (ck > 0) {
          const kk = E.outBack(ck, 2.6);
          ctx.save(); ctx.translate(x1 - 22, y + 24); ctx.scale(kk, kk);
          ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fillStyle = C.lime; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = TP.tinta; ctx.stroke();
          icon(ctx, 'check', 0, 0, 17, TP.tinta, { lw: 3.4 }); ctx.restore();
        }
        ctx.strokeStyle = css(TP.tinta, 0.18); ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(x0 + 8, y + e.h - 2); ctx.lineTo(x1 - 8, y + e.h - 2); ctx.stroke(); ctx.setLineDash([]);
      } else {
        // o fim: "7 DE 7" e o check, em limão sobre a tarja escura
        rr(ctx, x0 + 7, y + 10, x1 - x0 - 14, e.h - 22, 8); ctx.fillStyle = TP.tinta; ctx.fill();
        txt(ctx, D.nota.fim, (x0 + x1) / 2, y + 46, { fam: MONO, size: 22, weight: 800, align: 'center', color: C.lime });
        icon(ctx, 'check', (x0 + x1) / 2, y + 66, 22, C.lime, { lw: 3.4 });
      }
    });
    ctx.restore();
    // a impressorinha
    ctx.save(); ctx.translate(dx, 0);
    rr(ctx, 6, slot - 8, 148, 46, 14);
    const gg = ctx.createLinearGradient(0, slot - 8, 0, slot + 38); gg.addColorStop(0, '#262A24'); gg.addColorStop(1, '#151714');
    ctx.fillStyle = gg; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.stroke();
    ctx.fillStyle = '#060706'; rr(ctx, 14, slot - 3, 132, 6, 3); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; rr(ctx, 22 + i * 14, slot + 16, 8, 12, 3); ctx.fill(); }
    const imp = ents.some((e) => { const q = quando(e); return q !== null && q >= 0 && t >= q && t <= q + dur + 0.05; });
    const led = imp ? (Math.floor(t * 14) % 2 ? 1 : 0.35) : 0.85;
    ctx.beginPath(); ctx.arc(130, slot + 22, 5.5, 0, TAU); ctx.fillStyle = css(C.lime, led); ctx.shadowColor = css(C.lime, 0.9 * led); ctx.shadowBlur = 12; ctx.fill();
    ctx.restore();
    BOX('notinha', x0, top, x1, slot + 38);
  }

  // =====================================================================
  // TÍTULO, APOIO
  // =====================================================================
  function layout(s) {
    const lines = s.titulo;
    s._ts = fitSize(lines.map(plain), DISPLAY, 900, Z.x1 - Z.x0, s.tipo === 'abertura' ? 128 : 92, -0.025);
    const S = s._ts, top = s.tipo === 'abertura' ? Z.aberturaTopo : Z.tituloTopo;
    s._tb = lines.map((_, i) => top + 0.73 * S + i * 1.0 * S);
    s._apRows = wrapRich(s.apoio || '', C.gray, DISPLAY, 40, 600, Z.x1 - Z.x0);
    s._apY = s._tb[lines.length - 1] + 0.25 * S + 62;
  }
  function header(ctx, s, t) {
    const T = s.T;
    if (s.n) {
      chaveiro(ctx, Z.x0, Z.rotY - 9, String(s.n).padStart(2, '0'), t, T.chave, s.fecho ? 4.8 : 3.4);
      const n = s.rotulo.length, k = Math.round(n * p(t, T.chave + 0.15, T.chave + 0.5));
      if (k > 0) txt(ctx, s.rotulo.slice(0, k), Z.x0 + 196, Z.rotY, { fam: MONO, size: 26, weight: 800, color: C.lime, ls: 5, box: k === n ? 'rótulo' : null });
    }
    const S = s._ts;
    s.titulo.forEach((ln, i) => {
      const e = ent(t, T.titulo + 0.11 * i, 0.5);
      if (e <= 0) return;
      ctx.save(); ctx.globalAlpha = clamp(e * 1.3); ctx.translate(0, 34 * (1 - e));
      // 2ª linha em limão; *trecho* fica limão em qualquer linha
      let x = Z.x0;
      runs(ln, i === 1 ? C.lime : C.white).forEach((r) => { x += txt(ctx, r.s, x, s._tb[i], { size: S, weight: 900, color: r.c, ls: -0.025 * S }); });
      ctx.restore();
      if (e > 0.99) BOX(`título, linha ${i + 1}`, Z.x0, s._tb[i] - 0.76 * S, x, s._tb[i] + 0.22 * S);
    });
    const ea = E.outCubic(p(t, T.apoio, T.apoio + 0.3));
    if (ea > 0.002) s._apRows.forEach((r, j) => {
      const y = s._apY + j * 50 + 12 * (1 - ea);
      let x = Z.x0;
      r.words.forEach((wd) => { let xx = x; wd.segs.forEach((g) => { txt(ctx, g.s, xx, y, { size: 40, weight: 600, color: g.c, alpha: ea }); xx += g.w; }); x += wd.w + r.sp; });
      if (ea > 0.99) BOX(`apoio, linha ${j + 1}`, Z.x0, y - 31, Z.x0 + r.w, y + 10);
    });
  }

  // =====================================================================
  // ELEMENTOS (um por tipo de Story). setup(s) define os tempos e devolve a última mudança de texto
  // =====================================================================
  const EL = {};
  const X0 = () => Z.x0, X1 = () => Z.x1, CXM = () => (Z.x0 + Z.x1) / 2;

  // abertura: o quadro de chaves da recepção, com uma plaquinha por dica
  EL.abertura = {
    setup(s) { s.T.chaves = 1.0; return s.T.chaves + 0.12 * (s.elemento.chaves - 1) + 1.4; },   // + o balanço da última plaquinha parar
    draw(ctx, s, t) {
      const n = s.elemento.chaves, porLinha = Math.ceil(n / 2), y0 = Z.elY + 60, gap = 210;
      const bw = (Z.x1 - Z.x0), sx = bw / porLinha;
      for (let r = 0; r < 2; r++) {
        const y = y0 + r * gap;
        const er = E.outCubic(p(t, s.T.chaves - 0.3 + r * 0.2, s.T.chaves + r * 0.2));
        if (er <= 0) continue;
        ctx.save(); ctx.globalAlpha *= er; ctx.strokeStyle = '#3A3E37'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Z.x0, y); ctx.lineTo(Z.x0 + bw * er, y); ctx.stroke(); ctx.restore();
      }
      for (let i = 0; i < n; i++) {
        const r = i < porLinha ? 0 : 1, c = r ? i - porLinha : i, cols = r ? n - porLinha : porLinha;
        const cx = Z.x0 + (c + 0.5) * (bw / porLinha) + (r && cols < porLinha ? sx / 2 : 0);
        const y = y0 + r * gap, ti = s.T.chaves + 0.12 * i, dt = t - ti;
        if (dt < 0) continue;
        const e = E.outBack(p(dt, 0, 0.35), 1.6), ang = 18 * Math.exp(-4.5 * dt) * Math.cos(9 * dt) * DEG;   // balança e para em ~1,4 s
        ctx.save(); ctx.globalAlpha *= clamp(dt * 5); ctx.translate(cx, y); ctx.rotate(ang); ctx.scale(e, e);
        ctx.fillStyle = '#C9CCC5'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#C9CCC5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 22, 14, 0, TAU); ctx.stroke();
        const tw0 = 96, th = 128;
        rr(ctx, -tw0 / 2, 36, tw0, th, 26);
        const g = ctx.createLinearGradient(0, 36, 0, 36 + th); g.addColorStop(0, '#CBFF6A'); g.addColorStop(1, '#9EE61C');
        ctx.fillStyle = g; ctx.shadowColor = css(C.lime, 0.35); ctx.shadowBlur = 16; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.beginPath(); ctx.arc(0, 56, 7, 0, TAU); ctx.fillStyle = '#0D0F0C'; ctx.fill();
        txt(ctx, 'Nº', 0, 102, { fam: MONO, size: 22, weight: 800, align: 'center', color: C.ink });
        txt(ctx, String(i + 1).padStart(2, '0'), 0, 142, { fam: MONO, size: 34, weight: 800, align: 'center', color: C.ink });
        ctx.restore();
        if (dt > 1.3) BOX(`chave ${i + 1}`, cx - 48, y - 7, cx + 48, y + 36 + 128);
      }
    },
  };

  // cadeado: a semana no calendário; a data recebe o cadeado no CANTO da célula (nunca sobre o número)
  EL.cadeado = {
    setup(s) { const T = s.T; T.cal = 0.8; T.lock = 1.4; T.land = 1.75; T.chip = 2.1; return T.chip + 0.3; },
    draw(ctx, s, t) {
      const d = s.elemento, T = s.T, x = Z.x0, y = Z.elY, w = Z.x1 - Z.x0, h = 330;
      let alvo = null;
      enter(ctx, ent(t, T.cal, 0.5), x + w / 2, y + h / 2, () => {
        panel(ctx, x, y, w, h, { r: 30, stroke: css(C.white, 0.14), box: 'calendário' });
        icon(ctx, 'calendario', x + 48, y + 50, 34, C.lime, { lw: 2 });
        txt(ctx, d.mes, x + 82, y + 61, { fam: MONO, size: 28, weight: 800, color: C.white, ls: 4 });
        const gap = 10, cw = (w - 48 - 6 * gap) / 7, gy = y + 100, ch = h - 100 - 24;
        d.dias.forEach((dn, i) => {
          const cx = x + 24 + i * (cw + gap), on = dn === d.alvo, fill = on ? E.outCubic(p(t, T.land, T.land + 0.25)) : 0;
          rr(ctx, cx, gy, cw, ch, 18);
          if (fill > 0) { ctx.fillStyle = css(C.lime, fill); ctx.shadowColor = css(C.lime, 0.6 * fill); ctx.shadowBlur = 24; ctx.fill(); ctx.shadowColor = 'transparent'; }
          else { ctx.fillStyle = css(C.white, 0.035); ctx.fill(); }
          if (on && fill < 1) { ctx.save(); ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 18; ctx.lineWidth = 3; ctx.strokeStyle = css(C.amber, 1 - fill); ctx.stroke(); ctx.restore(); }
          const col = on ? (fill > 0.5 ? C.ink : C.amber) : '#D9DCD4';
          txt(ctx, d.nomes[i], cx + cw / 2, gy + 38, { fam: MONO, size: 22, weight: 800, align: 'center', color: on ? col : C.grayD, box: on ? 'letra do dia' : null });
          txt(ctx, String(dn), cx + cw / 2, gy + ch - 30, { size: 52, weight: 800, align: 'center', color: col, box: on ? 'número da data' : null });
          if (on) alvo = { x0: cx, y0: gy, x1: cx + cw, y1: gy + ch };
        });
      });
      if (alvo && t >= T.lock) {
        // o cadeado: cai e pousa no canto de cima à direita da casa, longe do número (que fica embaixo)
        const lx = alvo.x1 - 22, ly = alvo.y0 + 22, u = p(t, T.lock, T.land);   // canto de cima à direita: longe do número e da letra do dia
        const yy = lerp(ly - 260, ly, E.inCubic(u)), k = t >= T.land ? 1 + 0.18 * (1 - p(t, T.land, T.land + 0.3)) : 1.2;
        ctx.save(); ctx.translate(lx, yy); ctx.scale(k, k);
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fillStyle = '#10140A'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C.lime; ctx.stroke();
        icon(ctx, t >= T.land + 0.1 ? 'cadeado' : 'cadeado_aberto', 0, 0, 22, C.lime, { lw: 2.6 });
        ctx.restore();
        if (t >= T.land) BOX('cadeado da data', lx - 18, ly - 18, lx + 18, ly + 18);
      }
      const ec = p(t, T.chip, T.chip + 0.3);
      if (ec > 0) chip(ctx, d.chip, Z.x0, y + h + 70, { size: 28, icon: 'check', color: C.ink, bg: C.lime, border: 'none', h: 64, pad: 24, alpha: E.outCubic(ec), box: 'chip' });
    },
  };

  // regra: uma notinha grande com as linhas da reserva; a última linha, limão, "REGRA ENVIADA ✓"
  EL.regra = {
    setup(s) { const T = s.T; T.papel = 0.8; T.linhas = s.elemento.linhas.map((_, i) => 1.05 + 0.25 * i); T.envia = 1.1 + 0.25 * s.elemento.linhas.length + 0.2; return T.envia + 0.3; },
    draw(ctx, s, t) {
      const d = s.elemento, T = s.T, w = 640, x = CXM() - w / 2, y = Z.elY, n = d.linhas.length, lh = 74, h = 70 + n * lh + 120;
      const e = ent(t, T.papel, 0.5);
      if (e <= 0) return;
      enter(ctx, e, x + w / 2, y + h / 2, () => {
        ctx.save(); ctx.beginPath(); ctx.moveTo(x, y + 10);
        serra(ctx, x, x + w, y + 10, -1, 16); ctx.lineTo(x + w, y + h - 10); serra(ctx, x + w, x, y + h - 10, 1, 16); ctx.closePath();
        ctx.fillStyle = TP.papel; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16; ctx.fill(); ctx.restore();
        CARTAO('notinha da regra', x, y, x + w, y + h, ctx);
        txt(ctx, d.cabecalho, x + w / 2, y + 62, { fam: MONO, size: 26, weight: 800, align: 'center', color: css(TP.tinta, 0.6), ls: 4 });
        d.linhas.forEach((l, i) => {
          if (t < T.linhas[i]) return;
          txt(ctx, l, x + 44, y + 70 + 52 + i * lh, { fam: MONO, size: 30, weight: 800, color: TP.tinta, ls: 1 });
        });
        const ee = p(t, T.envia, T.envia + 0.3);
        if (ee > 0) {
          const by = y + 70 + n * lh + 22;
          ctx.save(); ctx.globalAlpha *= E.outCubic(ee);
          rr(ctx, x + 30, by, w - 60, 76, 14); ctx.fillStyle = C.lime; ctx.fill();
          const tw1 = tw(d.enviada, MONO, 32, 800, 1);
          txt(ctx, d.enviada, x + w / 2 - 20, by + 50, { fam: MONO, size: 32, weight: 800, align: 'center', color: C.ink, ls: 1 });
          icon(ctx, 'check', x + w / 2 - 20 + tw1 / 2 + 24, by + 39, 30, C.ink, { lw: 3.6 });
          ctx.restore();
          CARTAO('regra enviada', x + 30, by, x + w - 30, by + 76, ctx);
        }
      });
    },
  };

  // checks: três linhas que ganham check, uma de cada vez
  EL.checks = {
    setup(s) { const T = s.T; T.itens = s.elemento.itens.map((_, i) => 0.8 + 0.35 * i); T.checks = T.itens.map((x) => x + 0.9); return T.itens[T.itens.length - 1] + 0.5; },
    draw(ctx, s, t) {
      const d = s.elemento, T = s.T, rh = 128, gap = 28;
      d.itens.forEach((it, i) => {
        const y = Z.elY + i * (rh + gap), ok = p(t, T.checks[i], T.checks[i] + 0.3);
        enter(ctx, ent(t, T.itens[i], 0.45), CXM(), y + rh / 2, () => {
          panel(ctx, Z.x0, y, Z.x1 - Z.x0, rh, { r: 28, stroke: ok > 0 ? css(C.lime, 0.6) : css(C.white, 0.14), box: `linha ${i + 1}` });
          ctx.beginPath(); ctx.arc(Z.x0 + 66, y + rh / 2, 38, 0, TAU); ctx.fillStyle = '#141A0E'; ctx.fill(); ctx.strokeStyle = css(C.lime, 0.5); ctx.lineWidth = 2; ctx.stroke();
          icon(ctx, it.icone, Z.x0 + 66, y + rh / 2, 40, C.lime, { lw: 2 });
          txt(ctx, it.t, Z.x0 + 132, y + rh / 2 + 16, { size: 46, weight: 800, color: C.white, ls: -0.5 });
          badge(ctx, Z.x1 - 60, y + rh / 2, 32, 'check', C.lime, ok);
        }, { dy: 0, k0: 1 });
      });
    },
  };

  // comanda: a comanda do bar desliza e entra na conta do quarto
  EL.comanda = {
    setup(s) { const T = s.T; T.comanda = 0.8; T.quarto = 1.1; T.desliza = 1.7; T.entra = 2.3; return T.entra + 0.35; },
    draw(ctx, s, t) {
      const d = s.elemento, T = s.T;
      const qx = Z.x1 - 470, qy = Z.elY + 300, qw = 470, qh = 250;
      enter(ctx, ent(t, T.quarto, 0.5), qx + qw / 2, qy + qh / 2, () => {
        const on = p(t, T.entra, T.entra + 0.3);
        panel(ctx, qx, qy, qw, qh, { r: 30, stroke: on > 0 ? css(C.lime, 0.7) : css(C.white, 0.16), glow: on > 0 ? css(C.lime, 0.3 * on) : null, box: 'quarto' });
        rr(ctx, qx + 26, qy + 26, 64, 64, 18); ctx.fillStyle = css(C.lime, 0.1); ctx.fill();
        icon(ctx, 'chale', qx + 58, qy + 58, 38, C.lime, { lw: 2 });
        txt(ctx, d.quarto, qx + 110, qy + 72, { fam: MONO, size: 34, weight: 800, color: C.white, ls: 2 });
        txt(ctx, d.conta, qx + 30, qy + 150, { size: 32, weight: 700, color: C.gray });
        if (on > 0) txt(ctx, d.lancado, qx + 30, qy + 210, { fam: MONO, size: 30, weight: 800, color: C.lime, alpha: E.outCubic(on) });
      });
      // a comanda (papel de bloquinho) que desliza até o quarto e encolhe dentro dele
      const e = ent(t, T.comanda, 0.5), mv = E.inOutCubic(p(t, T.desliza, T.entra));
      if (e <= 0 || mv >= 1) return;
      const cw = 420, chh = 330, x0 = Z.x0, y0 = Z.elY - 20;
      const cx = lerp(x0 + cw / 2, qx + qw / 2, mv), cy = lerp(y0 + chh / 2, qy + qh / 2, mv) - Math.sin(Math.PI * mv) * 60, k = lerp(1, 0.25, mv);
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.4) * (1 - p(mv, 0.75, 1)); ctx.translate(cx, cy + 28 * (1 - e)); ctx.rotate(-3 * DEG * (1 - mv)); ctx.scale(k, k);
      const x = -cw / 2, y = -chh / 2;
      rr(ctx, x, y, cw, chh, 18); ctx.fillStyle = TP.papel; ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 14; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = C.lime; rr(ctx, x, y, cw, 64, 18); ctx.fill(); ctx.fillRect(x, y + 40, cw, 24);
      txt(ctx, d.titulo, x + 28, y + 44, { fam: MONO, size: 26, weight: 800, color: C.ink, ls: 2 });
      d.itens.forEach((it, i) => {
        txt(ctx, it[0], x + 28, y + 118 + i * 54, { fam: MONO, size: 28, weight: 800, color: TP.tinta });
        txt(ctx, it[1], x + cw - 28, y + 118 + i * 54, { fam: MONO, size: 28, weight: 800, color: TP.tinta, align: 'right' });
      });
      ctx.strokeStyle = css(TP.tinta, 0.4); ctx.setLineDash([8, 6]); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 28, y + chh - 82); ctx.lineTo(x + cw - 28, y + chh - 82); ctx.stroke(); ctx.setLineDash([]);
      txt(ctx, d.total[0], x + 28, y + chh - 36, { fam: MONO, size: 32, weight: 800, color: TP.tinta });
      txt(ctx, d.total[1], x + cw - 28, y + chh - 36, { fam: MONO, size: 32, weight: 800, color: TP.tinta, align: 'right' });
      ctx.restore();
      if (mv <= 0 && e >= 1) { CARTAO('comanda', x0, y0, x0 + cw, y0 + chh); }
    },
  };

  // etiqueta: o Pix sem nome ganha a etiqueta de quem é
  EL.etiqueta = {
    setup(s) { const T = s.T; T.pix = 0.8; T.duvida = 1.2; T.tag = 1.8; return T.tag + 1.4; },   // a etiqueta balança e para
    draw(ctx, s, t) {
      const d = s.elemento, T = s.T, x = Z.x0, y = Z.elY, w = Z.x1 - Z.x0, h = 270;
      const tg = p(t, T.tag, T.tag + 0.45);
      enter(ctx, ent(t, T.pix, 0.5), x + w / 2, y + h / 2, () => {
        panel(ctx, x, y, w, h, { r: 30, stroke: tg > 0 ? css(C.lime, 0.6) : css(C.white, 0.16), box: 'pix' });
        rr(ctx, x + 30, y + 30, 84, 84, 22); ctx.fillStyle = css(C.lime, 0.1); ctx.fill();
        icon(ctx, 'pix', x + 72, y + 72, 46, C.lime, { lw: 2 });
        txt(ctx, d.t, x + 140, y + 88, { fam: MONO, size: 40, weight: 800, color: C.white, ls: 2 });
        txt(ctx, d.sub, x + 34, y + 190, { fam: MONO, size: 28, weight: 700, color: C.gray, ls: 1 });
        // "de quem?" some quando a etiqueta chega
        const dq = p(t, T.duvida, T.duvida + 0.3) * (1 - p(t, T.tag, T.tag + 0.25));
        if (dq > 0) txt(ctx, d.duvida, x + 34, y + 240, { size: 34, weight: 700, color: C.amber, alpha: dq });
      });
      if (tg > 0) {
        // a etiqueta de papel, presa por um cordão no canto do card, balança e para
        const ax = x + w - 210, ay = y + h - 10, dt = t - T.tag, ang = 12 * Math.exp(-3.2 * dt) * Math.cos(8 * dt) * DEG;
        const tw2 = Math.max(330, tw(d.etiqueta, DISPLAY, 44, 800) + 110), th = 104;
        ctx.save(); ctx.globalAlpha *= clamp(tg * 2); ctx.translate(ax, ay); ctx.rotate(ang - 4 * DEG * E.outCubic(tg)); ctx.translate(0, 40 * (1 - E.outBack(tg, 1.6)));
        ctx.strokeStyle = '#C9CCC5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 48); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-tw2 / 2 + 30, 48); ctx.lineTo(tw2 / 2, 48); ctx.lineTo(tw2 / 2, 48 + th); ctx.lineTo(-tw2 / 2 + 30, 48 + th); ctx.lineTo(-tw2 / 2, 48 + th / 2); ctx.closePath();
        ctx.fillStyle = C.lime; ctx.shadowColor = css(C.lime, 0.4); ctx.shadowBlur = 24; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.beginPath(); ctx.arc(-tw2 / 2 + 34, 48 + th / 2, 8, 0, TAU); ctx.fillStyle = '#0D0F0C'; ctx.fill();
        txt(ctx, d.etiqueta, -tw2 / 2 + 62, 48 + th / 2 + 15, { size: 44, weight: 800, color: C.ink });
        ctx.restore();
        if (dt > 1.6) { BOX('etiqueta', ax - tw2 / 2, ay + 48, ax + tw2 / 2, ay + 48 + th); }
      }
    },
  };

  // fechamento: o contado enche até o esperado e o caixa fecha em "DIFERENÇA R$ 0"
  EL.fechamento = {
    setup(s) { const T = s.T; T.barras = 0.8; T.conta = 1.2; T.fecha = 2.3; return T.fecha + 0.35; },
    draw(ctx, s, t) {
      const d = s.elemento, T = s.T, x = Z.x0, w = Z.x1 - Z.x0, bh = 92;
      const row = (i, rot, v, cor, fr, alpha) => {
        const y = Z.elY + i * 190;
        txt(ctx, rot, x, y + 30, { fam: MONO, size: 28, weight: 800, color: C.gray, ls: 3, alpha });
        txt(ctx, `R$ ${Math.round(v)}`, x + w, y + 30, { fam: MONO, size: 34, weight: 800, color: C.white, align: 'right', alpha });
        panel(ctx, x, y + 56, w, bh, { r: 22, stroke: css(C.white, 0.2), shadow: false, alpha, box: `barra ${rot}` });
        if (fr > 0) { ctx.save(); ctx.globalAlpha *= alpha; rr(ctx, x, y + 56, Math.max(bh, w * fr), bh, 22); ctx.fillStyle = cor; ctx.fill(); ctx.restore(); }
      };
      const eb = E.outCubic(p(t, T.barras, T.barras + 0.4));
      if (eb <= 0) return;
      row(0, d.esperado[0], d.esperado[1], css(C.white, 0.35), 1, eb);
      const u = E.inOutCubic(p(t, T.conta, T.fecha - 0.1));
      row(1, d.contado[0], d.contado[1] * u, C.lime, u, eb);
      const ef = p(t, T.fecha, T.fecha + 0.35);
      if (ef > 0) {
        const k = E.outBack(ef, 2), cy = Z.elY + 2 * 190 + 90;
        ctx.save(); ctx.translate(CXM(), cy); ctx.scale(k, k); ctx.translate(-CXM(), -cy);
        chip(ctx, d.diferenca, CXM(), cy, { size: 40, icon: 'check', align: 'center', color: C.ink, bg: C.lime, border: 'none', glow: css(C.lime, 0.5), h: 96, pad: 36, box: 'diferença' });
        ctx.restore();
      }
    },
  };

  // agenda: os canais mandam setas para uma agenda só
  EL.agenda = {
    setup(s) { const T = s.T; T.cal = 0.55; T.setas = 0.85; T.chip = 1.3; return T.chip + 0.3; },
    draw(ctx, s, t) {
      const d = s.elemento, T = s.T, n = d.canais.length, cw = 250, gap = (Z.x1 - Z.x0 - n * cw) / (n - 1), cy = Z.elY;
      const Y = cy + 220, h = 260, w = Z.x1 - Z.x0;
      enter(ctx, ent(t, T.cal, 0.45), CXM(), Y + h / 2, () => {
        const on = p(t, T.chip, T.chip + 0.3);
        panel(ctx, Z.x0, Y, w, h, { r: 30, stroke: on > 0 ? css(C.lime, 0.6) : css(C.white, 0.14), glow: on > 0 ? css(C.lime, 0.25 * on) : null, box: 'agenda' });
        icon(ctx, 'calendario', Z.x0 + 48, Y + 50, 34, C.lime, { lw: 2 });
        txt(ctx, d.mes, Z.x0 + 82, Y + 61, { fam: MONO, size: 28, weight: 800, color: C.white, ls: 4 });
        if (on > 0) chip(ctx, d.chip, Z.x1 - 26, Y + 50, { size: 24, icon: 'check', align: 'right', color: C.ink, bg: C.lime, border: 'none', h: 52, pad: 18, alpha: E.outCubic(on) });
        const g = 10, cc = (w - 48 - 6 * g) / 7;
        d.dias.forEach((dn, i) => {
          const x = Z.x0 + 24 + i * (cc + g), oc = d.ocupados.includes(dn);
          rr(ctx, x, Y + 100, cc, 130, 16); ctx.fillStyle = oc ? C.lime : css(C.white, 0.035); ctx.fill();
          txt(ctx, String(dn), x + cc / 2, Y + 186, { size: 44, weight: 800, align: 'center', color: oc ? C.ink : '#D9DCD4' });
        });
      });
      d.canais.forEach((c, i) => {
        const x = Z.x0 + i * (cw + gap), e = ent(t, T.cal - 0.2 + 0.1 * i, 0.45);
        const ea = E.outCubic(p(t, T.setas + 0.1 * i, T.setas + 0.1 * i + 0.4));
        if (ea > 0) {
          ctx.save(); ctx.strokeStyle = css(C.lime, 0.75); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowColor = css(C.lime, 0.5); ctx.shadowBlur = 10;
          const ax = x + cw / 2, a0 = cy + 84, a1 = Y - 6;
          ctx.beginPath(); ctx.moveTo(ax, a0); ctx.lineTo(ax, lerp(a0, a1, ea)); ctx.stroke();
          if (ea >= 1) { ctx.fillStyle = C.lime; ctx.beginPath(); ctx.moveTo(ax - 11, a1 - 14); ctx.lineTo(ax + 11, a1 - 14); ctx.lineTo(ax, a1); ctx.closePath(); ctx.fill(); }
          ctx.restore();
        }
        enter(ctx, e, x + cw / 2, cy + 42, () => {
          panel(ctx, x, cy, cw, 84, { r: 22, stroke: css(C.white, 0.16), box: `canal ${c.t}` });
          icon(ctx, c.icone, x + 42, cy + 42, 30, C.lime, { lw: 2 });
          txt(ctx, c.t, x + 72, cy + 52, { fam: MONO, size: 24, weight: 800, color: C.white, ls: 1 });
        });
      });
    },
  };

  // =====================================================================
  // O QUADRO
  // =====================================================================
  function passagem(ctx, u, r, antes, depois) {
    const bw = 96, sk = 0.2 * (r.y1 - r.y0) / 2, c = lerp(r.x0 - bw - sk, r.x1 + bw + sk, E.inOutCubic(u));
    const poly = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((q) => ctx.lineTo(q[0], q[1])); ctx.closePath(); };
    const a0 = [c - bw / 2 - sk, r.y0], a1 = [c - bw / 2 + sk, r.y1], b0 = [c + bw / 2 - sk, r.y0], b1 = [c + bw / 2 + sk, r.y1];
    ctx.save(); poly([[b0[0], r.y0], [9999, r.y0], [9999, r.y1], [b1[0], r.y1]]); ctx.clip(); antes(); ctx.restore();
    ctx.save(); poly([[-9999, r.y0], [a0[0], r.y0], [a1[0], r.y1], [-9999, r.y1]]); ctx.clip(); depois(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.clip();
    poly([a0, b0, b1, a1]); ctx.fillStyle = C.lime; ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 40; ctx.fill(); ctx.restore();
  }
  function fimLogo(ctx, t) {
    const T = ST.T, Dd = 320, cy = Z.logoY;
    const e = E.outBack(p(t, T.wipe + 0.05, T.pousa), 1.8), bt = t - T.pousa;
    const g0 = ctx.createRadialGradient(540, cy, 0, 540, cy, 620);
    g0.addColorStop(0, css(C.lime, 0.15 * clamp(e))); g0.addColorStop(1, css(C.lime, 0));
    ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    if (bt >= 0) { const ru = p(bt, 0, 0.7); if (ru < 1) { ctx.beginPath(); ctx.arc(540, cy, lerp(Dd * 0.52, 225, E.outExpo(ru)), 0, TAU); ctx.strokeStyle = css(C.lime, 0.9 * (1 - ru)); ctx.lineWidth = 7 * (1 - ru) + 1; ctx.stroke(); } }
    logo(ctx, 540, cy, Dd * lerp(0.6, 1, e), clamp(e * 2));
    BOX('logo final', 540 - Dd / 2, cy - Dd / 2, 540 + Dd / 2, cy + Dd / 2);
    const NS = 96, w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.4), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.4), nx = 540 - (w1 + w2) / 2;
    const pin = E.outExpo(p(t, T.wipe + 0.05, T.pousa)), ny = cy + 310;
    ctx.save(); ctx.beginPath(); ctx.rect(60, ny - 100, 960, 130); ctx.clip();
    txt(ctx, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900, color: C.white, ls: -2.4 });
    txt(ctx, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime, ls: -2.4 });
    ctx.restore();
    BOX('nome final', nx, ny - 0.76 * NS, nx + w1 + w2, ny + 0.22 * NS);
    const hw = txt(ctx, D.marca, 540, ny + 76, { fam: MONO, size: 34, weight: 700, color: C.gray, align: 'center', ls: 1, alpha: E.outCubic(p(t, T.wipe + 0.1, T.pousa)) });
    BOX('@ final', 540 - hw / 2, ny + 48, 540 + hw / 2, ny + 84);
  }
  function conteudo(ctx, s, t) {
    header(ctx, s, t);
    EL[s.tipo].draw(ctx, s, t);
  }
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowColor = 'transparent';
    const s = ST, T = s.T;
    OFF = { dx: 0, dy: 0, n: s.i };
    background(ctx, t, s.tom);
    if (!s.fecho || t < T.wipe) { conteudo(ctx, s, t); brand(ctx); }
    else if (t < T.pousa) passagem(ctx, p(t, T.wipe, T.pousa), { x0: Z.notaX1 + 14, x1: W, y0: 0, y1: H }, () => { conteudo(ctx, s, t); brand(ctx); }, () => fimLogo(ctx, t));
    else fimLogo(ctx, t);
    drawNota(ctx, t);
  }

  // =====================================================================
  // CAPAS DO DESTAQUE (no estilo da capa do "Conheça": anel em 3D, halo limão e o símbolo no centro)
  // =====================================================================
  function capa(ctx, icone, Dm = 1080) {
    ctx.canvas.width = Dm; ctx.canvas.height = Dm;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const cx = Dm / 2, cy = Dm / 2;
    ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, Dm, Dm);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Dm * 0.5);
    g.addColorStop(0, css(C.lime, 0.26)); g.addColorStop(1, css(C.lime, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Dm * 0.5, 0, TAU); ctx.fill();
    const rx = Dm * 0.42, ry = Dm * 0.3, w = Dm * 0.06, tilt = -0.17, ct = Math.cos(tilt), st = Math.sin(tilt), N = 360;
    const pt = (a) => { const x = rx * Math.cos(a), y = ry * Math.sin(a); return [cx + x * ct - y * st, cy + x * st + y * ct]; };
    ctx.save(); ctx.lineCap = 'butt';
    for (const front of [false, true]) {
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * TAU, a1 = ((k + 1.6) / N) * TAU, d = Math.sin((a0 + a1) / 2);
        if ((d > 0) !== front) continue;
        const u = E.inOutSine((d + 1) / 2), [x0, y0] = pt(a0), [x1, y1] = pt(a1);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = mixHex('#33490F', C.lime, u); ctx.lineWidth = w * (0.72 + 0.28 * u); ctx.stroke();
      }
      if (!front) {
        // o disco escuro do centro (como o círculo da logo na capa do Conheça) e o ícone em limão
        ctx.beginPath(); ctx.arc(cx, cy, Dm * 0.26, 0, TAU); ctx.fillStyle = '#050605'; ctx.fill();
        const path = new Path2D(ICONES_CAPA[icone] || ICON.x), k = (Dm * 0.36) / 24;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-12, -12);
        ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = C.lime;
        ctx.shadowColor = css(C.lime, 0.5); ctx.shadowBlur = 18 / k; ctx.stroke(path); ctx.restore();
      }
    }
    ctx.restore();
  }

  // =====================================================================
  // INÍCIO
  // =====================================================================
  const Z = { x0: 172, x1: 1008, rotY: 600, tituloTopo: 650, aberturaTopo: 700, elY: 1050, marcaY: 312, notaX0: 20, notaX1: 140, slot: 1572, logoY: 900, topo: 250, base: 1670 };
  function init(img, dest) {
    LOGO = img; D = dest; M = document.createElement('canvas').getContext('2d');
    D.marca = D.marca || '@fazlohospeda';
    D.stories.forEach((s, i) => {
      s.i = i; s.T = { chave: 0.0, titulo: 0.12, apoio: 0.62, nota: 0.18, check: 0 };
      s.dur = s.duracao || 7;
      layout(s);
      const ult = EL[s.tipo].setup(s);
      s.T.check = Math.max(1.2, ult);                      // o check da linha da notinha sai quando o elemento termina
      s.T.ultima = Math.max(ult, s.T.apoio + 0.32, s.T.titulo + 0.11 * (s.titulo.length - 1) + 0.5, s.n ? s.T.chave + 1.3 : 0, s.T.nota + 0.36);
      if (s.fecho) {
        s.T.fim_nota = s.dur - 3.35;                        // "7 DE 7 ✓" é impresso junto com a passagem para a logo (0,3 s) e fica até o fim
        s.T.wipe = s.dur - 3.35; s.T.pousa = s.dur - 3.05;
      }
    });
    D._nota = buildNota();
  }
  function usar(i) { ST = D.stories[i]; }
  function renderAt(ctx, i, t) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    usar(i); frame(ctx, clamp(t, 0, ST.dur - 1e-4));
  }
  function caixas(ctx, i, t) { BOXES = []; renderAt(ctx, i, t); const o = BOXES; BOXES = null; return o; }
  window.DESTAQUE = {
    init, renderAt, caixas, capa, W, H, Z,
    info: () => D.stories.map((s) => ({ i: s.i, n: s.n || null, tipo: s.tipo, dur: s.dur, texto_parado_de: s.T.ultima, fecho: s.fecho ? { fim_nota: s.T.fim_nota, wipe: s.T.wipe, pousa: s.T.pousa } : null })),
  };
})();
