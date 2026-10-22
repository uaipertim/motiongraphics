/*
 * SÉRIE EXPLICA (FAZLO Hospeda) — motor de vídeos explicativos em capítulos, 60–90 s.
 *
 * O episódio inteiro vem de episodios/<id>.json, já com o tempo da narração (audio/<id>/linha.json, de scripts/linha.py).
 * Identidade própria da FAZLO (regra fixa da série):
 *   • NOTINHA: uma fita de papel de notinha, estreita, na lateral esquerda (x 20–140). Sai de uma impressorinha no pé da
 *     coluna (y ≈ 1396): a cada capítulo ela imprime uma linha ("01 · A FRASE"…) e sobe; os pontinhos da linha atual
 *     enchem enquanto o capítulo anda e um check limão é carimbado quando ele termina. No fecho imprime
 *     "CONTA FECHADA ✓", destaca da impressora e sobe. É a barra de progresso do vídeo.
 *   • CHAVEIRO: o número do capítulo vai numa plaquinha de chave de chalé ("Nº 03"), pendurada na argola ao lado do
 *     rótulo mono; ela balança ao entrar e para.
 *   • SINETA: a troca de capítulo é uma passagem limão curta (TR = 0,5 s) com o "ding" da sineta da recepção, e a
 *     notinha avança uma linha. A câmera não anda: cada capítulo se constrói no mesmo quadro.
 *   • FECHO: título + pergunta + a notinha fechada (≥ 3 s parados) e, nos últimos 3 s, a logo oficial centralizada com
 *     a sineta (como o fecho dos outros Reels).
 * Dentro do capítulo nada é trocado: o rótulo e o título (2 linhas) ficam fixos, a linha de apoio muda a cada frase e o
 * DIAGRAMA cresce peça por peça no tempo da voz (cada peça tem "em": a palavra que a dispara).
 *
 * Biblioteca de diagramas (CENAS): capa · reserva · partes · calendario · barra · credito · pares · perguntas · lista · fecho.
 * Ícones: chale, mala, chave, moedas, cadeado, cadeado_aberto, check, x, alerta, calendario, cartao, recibo, comanda,
 * pix, etiqueta, taca, curtir, comentar, enviar, salvar, carteira, seta, relogio.
 *
 * Regras de quadro: nada importante fora de y 265–1456; nada (nem a notinha, nem a passagem) em x ≥ 950 entre
 * y 1060 e 1560; o conteúdo do capítulo fica em x 160–940 (até x 1010 acima de y 1060), à direita da notinha;
 * a marca (logo oficial + @fazlohospeda) fica fixa no topo; o quadro 0 é a capa.
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
  // o quadro de um capítulo (coordenadas locais)
  const L = { x0: 160, x1: 940, xR: 1010, cx: 550, rotY: 452, tituloTopo: 500, diaTop: 826, diaBot: 1406 };
  const BTN = { x: 950, y0: 1060, y1: 1560 };          // a coluna de botões do Reels
  // a notinha (fita de papel) e a impressorinha no pé da coluna esquerda
  const TP = { x0: 20, x1: 140, slot: 1396, topo: 14, papel: '#F1EDE2', papel2: '#E4DECF', tinta: '#1C1E1A', apagado: '#BDB6A4' };

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
    const words = [];
    runs(line, base).forEach((r) => r.s.split(/(\s+)/).forEach((w) => { if (w.trim()) words.push({ s: w, c: r.c }); }));
    const sp = tw(' ', fam, size, weight);
    const rows = [[]]; let x = 0;
    words.forEach((w) => {
      const ww = tw(w.s, fam, size, weight);
      if (rows[rows.length - 1].length && x + sp + ww > maxW) { rows.push([]); x = 0; }
      const row = rows[rows.length - 1];
      x += (row.length ? sp : 0) + ww; row.push({ ...w, w: ww });
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
  let LOGO = null;
  function logo(ctx, x, y, d) { if (LOGO) ctx.drawImage(LOGO, x - d / 2, y - d / 2, d, d); }

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

  // ---------------------------------------------------------------- estado
  let LN = null, DUR = 0, TR = 0.5, CAPS = [], CUES = [], NC = 0, NOTA = null;
  let BOXES = null, OFF = { dx: 0, dy: 0, n: 0 };
  function BOX(name, x0, y0, x1, y1) { if (BOXES) BOXES.push({ cap: OFF.n, nome: name, x0: x0 + OFF.dx, y0: y0 + OFF.dy, x1: x1 + OFF.dx, y1: y1 + OFF.dy }); }
  // o fecho: a fase do texto (título, pergunta, notinha fechada) e a fase da logo (os últimos 3 s)
  const FECHO = { ultima: 0, texto_de: 0, texto_ate: 0, wipe: 0, pousa: 0, sino: 0 };

  // a palavra que dispara uma peça: "palavra", "palavra#2" (2ª vez), "+1.2" (s depois do começo do capítulo) ou "fim"
  function at(cap, spec, fb) {
    if (spec === undefined || spec === null) return fb;
    if (typeof spec === 'number') return cap.t0 + spec;
    if (spec[0] === '+') return cap.t0 + parseFloat(spec.slice(1));
    if (spec === 'fim') return cap.t1 - 0.9;
    const [w, k] = spec.split('#'), n = norm(w), occ = k ? parseInt(k, 10) : 1;
    let c = 0;
    for (const x of cap.palavras) if (x.n === n && ++c === occ) return x.t0;
    c = 0;
    for (const x of cap.palavras) if (x.n.startsWith(n) && ++c === occ) return x.t0;
    console.error(`capítulo ${cap.n}: a palavra "${spec}" não está na fala`);
    return fb;
  }
  const cue = (t, type, extra = {}) => CUES.push({ t, type, ...extra });

  // em que capítulo / troca estamos
  function where(t) {
    for (let k = 0; k < NC; k++) {
      const c = CAPS[k];
      if (t < c.t1 || k === NC - 1) return { k, trans: false, u: 0 };
      const nx = CAPS[k + 1];
      if (t < nx.t0) return { k, trans: true, u: p(t, c.t1, nx.t0) };
    }
    return { k: NC - 1, trans: false, u: 0 };
  }

  // =====================================================================
  // A NOTINHA (a barra de progresso): uma fita de papel que sai da impressorinha e sobe uma linha por capítulo
  // =====================================================================
  // quebra o rótulo em até 2 linhas equilibradas que caibam na fita
  function wrapNota(s, size, maxW) {
    if (tw(s, MONO, size, 700) <= maxW) return [s];
    const ws = s.split(' ');
    let best = null;
    for (let i = 1; i < ws.length; i++) {
      const a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' ');
      const m = Math.max(tw(a, MONO, size, 700), tw(b, MONO, size, 700));
      if (!best || m < best.m) best = { m, l: [a, b] };
    }
    return best ? best.l : [s];
  }
  function buildNota() {
    const fs = 18, inner = TP.x1 - TP.x0 - 20;
    const ents = [{ tipo: 'topo', h: 56, t: CAPS[0].t1 - 0.32, d: 0.3 }];
    for (let k = 1; k < NC; k++) {
      const rot = CAPS[k].rotulo || '';
      let efs = fs; while (efs > 16 && tw(rot, MONO, efs, 700) > inner) efs -= 1;
      const lines = tw(rot, MONO, efs, 700) <= inner ? [rot] : wrapNota(rot, (efs = fs), inner);
      const fim = k < NC - 1 ? CAPS[k].t1 - 0.06 : CAPS[k].t0 + 0.2;
      ents.push({ tipo: 'item', k, num: String(k).padStart(2, '0'), lines, fs: efs, h: 34 + 23 * lines.length + 14, t: CAPS[k - 1].t1 + 0.1, d: 0.32, check: fim });
    }
    const fecho = CAPS[NC - 1];
    ents.push({ tipo: 'fim', h: 96, t: fecho.t0 + 0.45, d: 0.42 });
    let y = 0;
    ents.forEach((e) => { e.y = y; y += e.h; });
    const total = y + TP.topo;
    const rasga = fecho.t0 + 1.0;
    return { ents, total, entra: CAPS[0].t1 - 0.78, rasga, sobe: Math.min(160, TP.slot - total - 300), fs };
  }
  // quanto papel já saiu
  function notaLen(t) {
    let L0 = 0;
    NOTA.ents.forEach((e) => { L0 += e.h * E.inOutCubic(p(t, e.t, e.t + e.d)); });
    return L0;
  }
  function serra(ctx, x0, x1, y, dir, n = 10) {
    // borda serrilhada (dentes para cima: dir = -1; para baixo: dir = 1)
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { ctx.lineTo(x0 + (i + 0.5) * w, y + dir * 7); ctx.lineTo(x0 + (i + 1) * w, y); }
  }
  function impressora(ctx, t, dx) {
    const y = TP.slot;
    ctx.save(); ctx.translate(dx, 0);
    rr(ctx, 6, y - 8, 148, 46, 14);
    const g = ctx.createLinearGradient(0, y - 8, 0, y + 38); g.addColorStop(0, '#262A24'); g.addColorStop(1, '#151714');
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.stroke();
    ctx.fillStyle = '#060706'; rr(ctx, 14, y - 3, 132, 6, 3); ctx.fill();               // a fenda do papel
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; rr(ctx, 22 + i * 14, y + 16, 8, 12, 3); ctx.fill(); }
    const imprimindo = NOTA.ents.some((e) => t >= e.t && t <= e.t + e.d + 0.05);
    const led = imprimindo ? (Math.floor(t * 14) % 2 ? 1 : 0.35) : 0.85;
    ctx.beginPath(); ctx.arc(130, y + 22, 5.5, 0, TAU); ctx.fillStyle = css(C.lime, led); ctx.shadowColor = css(C.lime, 0.9 * led); ctx.shadowBlur = 12; ctx.fill();
    ctx.restore();
    BOX('impressora', 6 + dx, y - 8, 154 + dx, y + 38);
  }
  function drawNota(ctx, t) {
    if (t < NOTA.entra) return;
    const din = E.outCubic(p(t, NOTA.entra, NOTA.entra + 0.42));
    const dx = -180 * (1 - din);
    const rasg = t >= NOTA.rasga, su = E.outBack(p(t, NOTA.rasga + 0.05, NOTA.rasga + 0.7), 1.3);
    const pOut = E.inCubic(p(t, NOTA.rasga + 0.15, NOTA.rasga + 0.6));
    ctx.save();
    const len = notaLen(t), x0 = TP.x0 + dx, x1 = TP.x1 + dx, w = x1 - x0;
    const top = TP.slot - len - TP.topo;
    // o papel (preso na fenda até rasgar; depois sobe e inclina um pouco)
    ctx.save();
    if (!rasg) { ctx.beginPath(); ctx.rect(0, 0, TP.x1 + 40, TP.slot); ctx.clip(); }
    const cyM = (top + TP.slot) / 2, rise = NOTA.sobe * su, rot = -2.2 * DEG * su;
    ctx.translate((x0 + x1) / 2, cyM - rise); ctx.rotate(rot); ctx.translate(-(x0 + x1) / 2, -cyM);
    ctx.beginPath(); ctx.moveTo(x0, top + 7); serra(ctx, x0, x1, top + 7, -1, 9); ctx.lineTo(x1, TP.slot);
    if (rasg) serra(ctx, x1, x0, TP.slot, 1, 9); else ctx.lineTo(x0, TP.slot);
    ctx.closePath();
    const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, TP.papel2); g.addColorStop(0.18, TP.papel); g.addColorStop(0.85, TP.papel); g.addColorStop(1, TP.papel2);
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18 + 16 * su; ctx.shadowOffsetY = 6 + 10 * su; ctx.fill(); ctx.shadowColor = 'transparent';
    // as linhas impressas
    const y0 = top + TP.topo;
    NOTA.ents.forEach((e) => {
      if (t < e.t) return;
      const y = y0 + e.y;
      if (e.tipo === 'topo') {
        txt(ctx, 'CONTA', (x0 + x1) / 2, y + 30, { fam: MONO, size: 21, weight: 800, align: 'center', color: TP.tinta, ls: 3 });
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = css(TP.tinta, 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 10, y + 46); ctx.lineTo(x1 - 10, y + 46); ctx.stroke(); ctx.restore();
      } else if (e.tipo === 'item') {
        txt(ctx, e.num, x0 + 10, y + 32, { fam: MONO, size: 22, weight: 800, color: TP.tinta });
        e.lines.forEach((l, j) => txt(ctx, l, x0 + 10, y + 34 + 23 * (j + 1), { fam: MONO, size: e.fs, weight: 700, color: TP.tinta }));
        // os pontinhos: enchem enquanto o capítulo anda
        const ax = x0 + 44, bx = x1 - 34, n = Math.floor((bx - ax) / 7);
        const ch = CAPS[e.k], q = t >= ch.t1 || (e.k === NC - 1 && t >= e.check) ? 1 : p(t, ch.t0, ch.t1);
        for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.arc(ax + i * 7, y + 25, 1.6, 0, TAU); ctx.fillStyle = i / n <= q ? TP.tinta : TP.apagado; ctx.fill(); }
        // o check limão quando o capítulo termina
        const ck = p(t, e.check, e.check + 0.3);
        if (ck > 0) {
          const kk = E.outBack(ck, 2.6);
          ctx.save(); ctx.translate(x1 - 20, y + 24); ctx.scale(kk, kk);
          ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fillStyle = C.lime; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = TP.tinta; ctx.stroke();
          icon(ctx, 'check', 0, 0, 17, TP.tinta, { lw: 3.4 }); ctx.restore();
        }
        ctx.strokeStyle = css(TP.tinta, 0.18); ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(x0 + 8, y + e.h - 2); ctx.lineTo(x1 - 8, y + e.h - 2); ctx.stroke(); ctx.setLineDash([]);
      } else {
        rr(ctx, x0 + 7, y + 10, w - 14, e.h - 22, 8); ctx.fillStyle = TP.tinta; ctx.fill();
        txt(ctx, 'CONTA', (x0 + x1) / 2, y + 44, { fam: MONO, size: 20, weight: 800, align: 'center', color: C.lime, ls: 1 });
        const fw = tw('FECHADA', MONO, 19, 800);
        txt(ctx, 'FECHADA', (x0 + x1) / 2 - 11, y + 70, { fam: MONO, size: 19, weight: 800, align: 'center', color: C.lime });
        icon(ctx, 'check', (x0 + x1) / 2 - 11 + fw / 2 + 13, y + 63, 18, C.lime, { lw: 3.4 });
      }
    });
    ctx.restore();
    // a caixa da notinha (para a revisão): o retângulo que contém o papel (com a inclinação)
    const ext = Math.abs(Math.sin(2.2 * DEG * su)) * (TP.slot - top) / 2;
    BOX(rasg ? 'notinha (fechada)' : 'notinha', x0 - ext, top - rise - ext * 0.05, x1 + ext, TP.slot - rise + ext * 0.05);
    if (pOut < 1) impressora(ctx, t, dx - 190 * pOut);
    ctx.restore();
  }

  // =====================================================================
  // O CHAVEIRO (o número do capítulo): a plaquinha de chave de chalé, pendurada na argola
  // =====================================================================
  function chaveiro(ctx, x, y, num, t, tIn) {
    const dt = t - tIn;
    if (dt < 0) return;
    const e = E.outCubic(p(dt, 0, 0.22));
    const ang = (dt < 2.2 ? 14 * Math.exp(-3.4 * dt) * Math.cos(10 * dt) : 0) * DEG;
    const px = x + 20, py = y, hx = 22, rc = 20;          // a argola (centro no pivô) passa pelo furo em (hx, 0)
    const argola = (a0, a1, lw) => { ctx.beginPath(); ctx.arc(hx - rc, 0, rc, a0, a1); ctx.lineWidth = lw; ctx.stroke(); };
    ctx.save(); ctx.globalAlpha *= clamp(e * 1.5);
    ctx.translate(px, py - 26 * (1 - e)); ctx.rotate(ang);
    ctx.lineCap = 'round';
    // a argola, por trás
    ctx.strokeStyle = '#C9CCC5'; argola(0, TAU, 3.6);
    ctx.strokeStyle = '#FFFFFF'; argola(-2.5, -1.6, 1.6);
    // a plaquinha: ponta arredondada à esquerda (com o furo), ponta em bico à direita
    const tx0 = 8, tx1 = 158, h = 50;
    ctx.beginPath();
    ctx.moveTo(tx0 + 25, -h / 2); ctx.lineTo(tx1 - 26, -h / 2); ctx.quadraticCurveTo(tx1 - 6, -h / 2 + 4, tx1, 0);
    ctx.quadraticCurveTo(tx1 - 6, h / 2 - 4, tx1 - 26, h / 2); ctx.lineTo(tx0 + 25, h / 2);
    ctx.arc(tx0 + 25, 0, h / 2, Math.PI / 2, -Math.PI / 2); ctx.closePath();
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#CBFF6A'); g.addColorStop(1, '#9EE61C');
    ctx.fillStyle = g; ctx.shadowColor = css(C.lime, 0.45); ctx.shadowBlur = 18; ctx.shadowOffsetY = 4; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(10,10,10,0.25)'; ctx.stroke();
    // o furo, com o pedaço da argola que passa por ele
    ctx.beginPath(); ctx.arc(hx, 0, 6, 0, TAU); ctx.fillStyle = '#0D0F0C'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(hx, 0, 6, 0, TAU); ctx.clip(); ctx.strokeStyle = '#C9CCC5'; argola(-0.6, 0.6, 3.6); ctx.restore();
    icon(ctx, 'chale', 50, -1, 24, C.ink, { lw: 2.4 });
    txt(ctx, `Nº ${num}`, 68, 9, { fam: MONO, size: 24, weight: 800, color: C.ink });
    ctx.restore();
    if (dt > 1.2) BOX('chaveiro', x, y - 25, x + 178, y + 25);
  }

  // =====================================================================
  // A PASSAGEM LIMÃO (a troca de capítulo e a entrada da logo)
  // =====================================================================
  const SK = 0.2;                                       // inclinação da faixa
  function passagem(ctx, u, r, antes, depois) {
    // r = {x0, x1, y0, y1}: a área varrida; a faixa vai da esquerda para a direita; à esquerda dela, o quadro novo
    const bw = 96, ym = (r.y0 + r.y1) / 2, sk = SK * (r.y1 - r.y0) / 2;
    const c = lerp(r.x0 - bw - sk, r.x1 + bw + sk, E.inOutCubic(u));
    const edge = (off) => [[c + off - sk, r.y0], [c + off + sk, r.y1]];   // a faixa é inclinada (topo à esquerda)
    const poly = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((q) => ctx.lineTo(q[0], q[1])); ctx.closePath(); };
    const [a0, a1] = edge(-bw / 2), [b0, b1] = edge(bw / 2);
    // à direita da faixa, o quadro que sai; à esquerda, o que entra
    ctx.save(); poly([[b0[0], r.y0], [9999, r.y0], [9999, r.y1], [b1[0], r.y1]]); ctx.clip(); antes(); ctx.restore();
    ctx.save(); poly([[-9999, r.y0], [a0[0], r.y0], [a1[0], r.y1], [-9999, r.y1]]); ctx.clip(); depois(); ctx.restore();
    // a faixa limão com um brilho na frente
    ctx.save(); ctx.beginPath(); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.clip();
    poly([a0, b0, b1, a1]); ctx.fillStyle = C.lime; ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 40; ctx.fill(); ctx.shadowColor = 'transparent';
    const g = ctx.createLinearGradient(c + bw / 2, 0, c + bw / 2 + 70, 0); g.addColorStop(0, css(C.lime, 0.35)); g.addColorStop(1, css(C.lime, 0));
    ctx.fillStyle = g; poly([b0, [b0[0] + 70, r.y0], [b1[0] + 70, r.y1], b1]); ctx.fill();
    ctx.fillStyle = css(C.ink, 0.18); poly([[a0[0] + 18, r.y0], [a0[0] + 30, r.y0], [a1[0] + 30, r.y1], [a1[0] + 18, r.y1]]); ctx.fill();
    ctx.restore();
  }

  // =====================================================================
  // FUNDO, MARCA
  // =====================================================================
  function tint(t) {
    const w = where(t), a = TONS[CAPS[w.k].tom] || C.lime;
    if (!w.trans) return a;
    return mixHex(a, TONS[CAPS[w.k + 1].tom] || a, E.inOutSine(w.u));
  }
  function background(ctx, t) {
    const tn = tint(t), br = 1 + 0.16 * Math.sin(t * 1.25);   // o brilho do fundo respira devagar: o quadro nunca congela
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g1x = 820 + 90 * Math.sin(t * 0.33), g1y = 620 + 80 * Math.cos(t * 0.27);
    let g = ctx.createRadialGradient(g1x, g1y, 0, g1x, g1y, 980);
    g.addColorStop(0, css(tn, 0.17 * br)); g.addColorStop(0.45, css(tn, 0.06 * br)); g.addColorStop(1, css(tn, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2x = 300 + 50 * Math.cos(t * 0.13), g2y = 1520 + 60 * Math.sin(t * 0.15);
    g = ctx.createRadialGradient(g2x, g2y, 0, g2x, g2y, 860);
    g.addColorStop(0, css(tn, 0.1)); g.addColorStop(1, css(tn, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // pontos de grade, derivando devagar
    const oy = -((t * 4) % 48);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    for (let y = oy; y < H; y += 48) for (let x = 12; x < W; x += 48) ctx.fillRect(x, y, 2, 2);
    // bokeh e poeira subindo
    for (let i = 0; i < 12; i++) {
      const r = 30 + 60 * hash(i, 2), x = 40 + hash(i, 3) * 1000 + 20 * Math.sin(t * 0.3 + i);
      const y = ((hash(i, 4) * (H + 300) - t * 9) % (H + 300) + H + 300) % (H + 300) - 150;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, css(i % 3 ? tn : '#FFFFFF', 0.06)); gg.addColorStop(1, css(tn, 0));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = 20 + hash(i, 5) * 1040 + 8 * Math.sin(t * 0.7 + i);
      const y = ((hash(i, 6) * (H + 100) - t * (10 + 20 * hash(i, 7))) % (H + 100) + H + 100) % (H + 100) - 50;
      ctx.fillStyle = css(i % 4 ? '#FFFFFF' : tn, 0.05 + 0.12 * hash(i, 8));
      ctx.beginPath(); ctx.arc(x, y, 1.2 + 2 * hash(i, 9), 0, TAU); ctx.fill();
    }
    // vinheta
    g = ctx.createRadialGradient(540, 900, 500, 540, 900, 1250);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function brand(ctx) {
    const d = 50, nameW = tw('FAZLO Hospeda', DISPLAY, 27, 800), handleW = tw(LN.marca, MONO, 19, 700, 0.5);
    const gw = d + 14 + Math.max(nameW, handleW), x0 = 540 - gw / 2, cy = 334;
    logo(ctx, x0 + d / 2, cy, d);
    const tx = x0 + d + 14;
    const w1 = txt(ctx, 'FAZLO', tx, cy - 3, { size: 27, weight: 800, color: C.white });
    txt(ctx, 'Hospeda', tx + w1 + 6, cy - 3, { size: 27, weight: 800, color: C.lime });
    txt(ctx, LN.marca, tx, cy + 22, { fam: MONO, size: 19, weight: 700, color: C.gray, ls: 0.5 });
    BOX('marca', x0, cy - d / 2, x0 + gw, cy + d / 2);
  }

  // =====================================================================
  // CABEÇALHO DO CAPÍTULO (chaveiro + rótulo + título fixo) e LINHA DE APOIO
  // =====================================================================
  const ROT_X = L.x0 + 196;
  function layoutTitulo(cap) {
    const s = fitSize(cap.titulo, DISPLAY, 900, L.xR - L.x0, 94, -0.025);
    cap.ts = s;
    cap.tb = [L.tituloTopo + 0.73 * s, L.tituloTopo + 0.73 * s + 1.0 * s];
    cap.apY = cap.tb[1] + 0.25 * s + 58;
    cap.apX = L.x0; cap.apAlign = 'left';
  }
  function header(ctx, cap, t) {
    const t0 = cap.t0;
    chaveiro(ctx, L.x0, L.rotY - 9, String(cap.n).padStart(2, '0'), t, t0 - 0.2);
    // rótulo: máquina de escrever mono limão
    const n = cap.rotulo.length, k = Math.round(n * p(t, t0 - 0.05, t0 + 0.35));
    if (k > 0) {
      const s = cap.rotulo.slice(0, k);
      const w = txt(ctx, s, ROT_X, L.rotY, { fam: MONO, size: 26, weight: 800, color: C.lime, ls: 5, box: k === n ? 'rótulo' : null });
      if (k < n || (t - t0) < 0.8) { const blink = k < n || Math.floor((t - t0) * 4) % 2 === 0; if (blink) { ctx.fillStyle = C.lime; ctx.fillRect(ROT_X + w + 8, L.rotY - 21, 13, 24); } }
    }
    // título: duas linhas (branca + limão), sobem e ficam
    const s = cap.ts;
    cap.titulo.forEach((ln, i) => {
      const e = ent(t, t0 + 0.02 + 0.11 * i, 0.5);
      if (e <= 0) return;
      let col = i === 1 ? C.lime : C.white;
      const rk = cap.riscaT !== undefined && cap.risca_titulo.linha === i + 1 ? p(t, cap.riscaT, cap.riscaT + 0.35) : 0;
      if (rk > 0) col = mixHex(col, '#8C9087', E.outCubic(rk));
      ctx.save(); ctx.globalAlpha = clamp(e * 1.3); ctx.translate(0, 34 * (1 - e));
      const w = txt(ctx, ln, L.x0, cap.tb[i], { size: s, weight: 900, color: col, ls: -0.025 * s, box: e > 0.99 ? `título, linha ${i + 1}` : null });
      if (rk > 0) {
        const y = cap.tb[i] - 0.3 * s;
        ctx.strokeStyle = C.lime; ctx.lineWidth = Math.max(7, s * 0.085); ctx.lineCap = 'round';
        ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(L.x0 - 6, y + 3); ctx.lineTo(L.x0 - 6 + (w + 12) * E.inOutCubic(rk), y - 3); ctx.stroke();
      }
      ctx.restore();
    });
  }
  function apoioRows(cap, a) {
    if (!a._rows) a._rows = wrapRich(a.texto, C.gray, DISPLAY, 38, 600, cap.apAlign === 'center' ? 860 : L.xR - L.x0);
    return a._rows;
  }
  function drawApoio(ctx, cap, t) {
    cap.apoios.forEach((a, i) => {
      const nx = cap.apoios[i + 1];
      const ein = E.outCubic(p(t, a.t + 0.12, a.t + 0.34)), eout = nx ? p(t, nx.t, nx.t + 0.13) : 0;
      const al = ein * (1 - eout);
      if (al <= 0.002) return;
      const rows = apoioRows(cap, a);
      rows.forEach((r, j) => {
        const y = cap.apY + j * 48 + 12 * (1 - ein) - 8 * eout;
        let x = cap.apAlign === 'center' ? cap.apX - r.w / 2 : cap.apX;
        const x0 = x;
        r.words.forEach((wd) => { txt(ctx, wd.s, x, y, { size: 38, weight: 600, color: wd.c, alpha: al }); x += wd.w + r.sp; });
        if (al > 0.99) BOX(`apoio ${i + 1}, linha ${j + 1}`, x0, y - 30, x0 + r.w, y + 10);
      });
    });
  }

  // =====================================================================
  // DIAGRAMAS (ocupam x 160–940 e y ≈ 826–1406, à direita da notinha)
  // =====================================================================
  const CENAS = {};

  // ---- a capa (capítulo 00): chip, título grande, faixa limão "em 3 palavras." e três cadeados "? ? ?"
  CENAS.capa = {
    setup(cap) {
      const d = cap.diagrama;
      const S = fitSize(cap.titulo, DISPLAY, 900, 880, 158, -0.03);
      const F = Math.round(S * 0.5);
      const bandW = tw(d.faixa, DISPLAY, F, 900, -0.02 * F) + 64, bandH = Math.round(F * 1.34);
      const chipH = 58, lockH = 96;
      const titleH = 0.76 * S + 0.98 * S + 0.16 * S;
      const bandExt = bandH + bandW * Math.sin(3 * DEG);
      const total = chipH + 46 + titleH + 26 + bandExt + 52 + lockH;
      const top = 960 - total / 2;
      const Ly = {};
      Ly.chipY = top + chipH / 2;
      Ly.b1 = top + chipH + 46 + 0.76 * S; Ly.b2 = Ly.b1 + 0.98 * S;
      Ly.bandCy = Ly.b2 + 0.16 * S + 26 + bandExt / 2;
      Ly.lockY = Ly.bandCy + bandExt / 2 + 52 + lockH / 2;
      Ly.top = top; Ly.bottom = top + total;
      Object.assign(cap, { capaS: S, capaF: F, bandW, bandH, Ly });
      cap.apY = Ly.lockY + lockH / 2 + 84; cap.apX = 540; cap.apAlign = 'center';
      cap.ev.locks = d.cadeados.map((c, i) => at(cap, c.em, cap.t0 + 0.4 + 0.5 * i));
      cap.ev.locks.forEach((t) => cue(t, 'lockon'));
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, Ly = cap.Ly, S = cap.capaS;
      chip(ctx, cap.rotulo, 540, Ly.chipY, { size: 24, icon: 'chale', align: 'center', ls: 4, h: 58, box: 'chip' });
      cap.titulo.forEach((ln, i) => txt(ctx, ln, 540, i ? Ly.b2 : Ly.b1, { size: S, weight: 900, align: 'center', ls: -0.03 * S, color: C.white, box: `título, linha ${i + 1}` }));
      // a faixa limão, levemente inclinada
      ctx.save(); ctx.translate(540, Ly.bandCy); ctx.rotate((-3 + 0.35 * Math.sin(t * 1.3)) * DEG);
      rr(ctx, -cap.bandW / 2, -cap.bandH / 2, cap.bandW, cap.bandH, 14);
      ctx.shadowColor = css(C.lime, 0.45); ctx.shadowBlur = 34; ctx.fillStyle = C.lime; ctx.fill(); ctx.shadowColor = 'transparent';
      txt(ctx, d.faixa, 0, cap.capaF * 0.36, { size: cap.capaF, weight: 900, align: 'center', color: C.ink, ls: -0.02 * cap.capaF });
      ctx.restore();
      const ext = cap.bandH + cap.bandW * Math.sin(3 * DEG);
      BOX('faixa', 540 - cap.bandW / 2, Ly.bandCy - ext / 2, 540 + cap.bandW / 2, Ly.bandCy + ext / 2);
      // os três cadeados "? ? ?": cada um acende na sua palavra e mostra a palavra
      const n = d.cadeados.length, bw = 198, gap = 22, x0 = 540 - (n * bw + (n - 1) * gap) / 2, bh = 96;
      d.cadeados.forEach((c, i) => {
        const x = x0 + i * (bw + gap), y = Ly.lockY - bh / 2, on = p(t, cap.ev.locks[i], cap.ev.locks[i] + 0.3);
        ctx.save();
        rr(ctx, x, y, bw, bh, 20);
        ctx.fillStyle = css(C.lime, 0.04 + 0.08 * on); ctx.fill();
        ctx.setLineDash(on > 0.5 ? [] : [8, 7]); ctx.lineDashOffset = -t * 18;
        ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.lime, 0.42 + 0.58 * on);
        if (on > 0) { ctx.shadowColor = css(C.lime, 0.7 * on); ctx.shadowBlur = 22; }
        ctx.stroke(); ctx.restore();
        icon(ctx, on > 0.5 ? 'cadeado' : 'cadeado_aberto', x + 40, Ly.lockY, 34, on > 0 ? C.lime : C.gray, { lw: 2.2, fill: on > 0.5 ? css(C.lime, 0.2) : null });
        const flip = Math.abs(Math.cos(Math.PI * on));
        ctx.save(); ctx.translate(x + 40 + (bw - 40) / 2 + 2, Ly.lockY); ctx.scale(1, Math.max(0.05, flip)); ctx.translate(-(x + 40 + (bw - 40) / 2 + 2), -Ly.lockY);
        txt(ctx, on < 0.5 ? '? ? ?' : c.t, x + 40 + (bw - 40) / 2 + 2, Ly.lockY + 9, { fam: MONO, size: 25, weight: 800, align: 'center', color: on < 0.5 ? C.gray : C.lime, ls: on < 0.5 ? 2 : 1 });
        ctx.restore();
        BOX(`cadeado ${i + 1}`, x, y, x + bw, y + bh);
      });
    },
  };

  // ---- cartão de reserva estilizado
  function reservaCard(ctx, x, y, w, h, r, o = {}) {
    panel(ctx, x, y, w, h, { r: 28, stroke: o.stroke || css(C.white, 0.14), glow: o.glow, box: o.box });
    // o ladrilho do chalé à esquerda; à direita, três linhas: nome, diárias, valor (nada se sobrepõe)
    const tile = Math.round(h * 0.6), ty = y + (h - tile) / 2;
    rr(ctx, x + 28, ty, tile, tile, 22); ctx.fillStyle = css(C.lime, 0.1); ctx.fill(); ctx.strokeStyle = css(C.lime, 0.4); ctx.lineWidth = 2; ctx.stroke();
    icon(ctx, 'chale', x + 28 + tile / 2, ty + tile / 2, tile * 0.56, C.lime, { lw: 1.8 });
    const tx = x + 28 + tile + 30;
    txt(ctx, r.titulo, tx, y + h * 0.4, { size: Math.round(h * 0.19), weight: 800, color: C.white });
    txt(ctx, (r.linhas || []).join(' · '), tx, y + h * 0.6, { fam: MONO, size: Math.round(h * 0.1), weight: 700, color: C.gray, ls: 2 });
    txt(ctx, r.valor, tx, y + h * 0.83, { fam: MONO, size: Math.round(h * 0.14), weight: 800, color: C.white });
    if (o.status) chip(ctx, o.status.t, x + w - 28, y + 30 + Math.round(h * 0.085), { size: Math.round(h * 0.085), align: 'right', color: o.status.c, bg: css(o.status.c, 0.12), border: css(o.status.c, 0.6), h: Math.round(h * 0.17), pad: 14, alpha: o.status.a, box: o.status.box });
  }
  function coin(ctx, x, y, rx, ry, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    const th = o.th ?? 12;
    ctx.fillStyle = '#B88A2A'; ctx.beginPath(); ctx.ellipse(0, th / 2, rx, ry, 0, 0, TAU); ctx.fill(); ctx.fillRect(-rx, 0, rx * 2, th / 2);
    const g = ctx.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, '#F7D774'); g.addColorStop(1, '#D9A53B');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -th / 2, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,10,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -th / 2, rx * 0.7, ry * 0.7, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // ---- reserva: o cartão da reserva, a pilha do caixa que tomba e o "?" pulsando
  CENAS.reserva = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.card = at(cap, d.reserva.em, cap.t0 + 0.6);
      ev.coins = at(cap, d.moedas && d.moedas.em, null);
      ev.topple = ev.coins !== null ? ev.coins + 0.55 : null;
      ev.duv = at(cap, d.duvida.em, cap.t1 - 2);
      ev.status = ev.duv + 0.35;
      cue(ev.card, 'pop', { f: 620 });
      if (ev.coins !== null) { cue(ev.coins, 'coin'); cue(ev.topple, 'coinsfall'); }
      cue(ev.duv, 'question'); cue(ev.status, 'chip');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      const cx0 = L.x0, cy0 = 850, cw = 640, ch = 250;
      // a pilha do caixa (entra na palavra e tomba)
      if (ev.coins !== null && t >= ev.coins) {
        const bx = 420, floor = 1300, e = E.outBack(p(t, ev.coins, ev.coins + 0.35), 1.6);
        for (let i = 0; i < 6; i++) {
          const y0 = floor - i * 18 - 12;
          const u = p(t, ev.topple + i * 0.045, ev.topple + 0.62 + i * 0.045);
          const dir = [-1, 1, -0.6, 1.3, -1.4, 0.8][i];
          const x = bx + dir * 120 * E.outCubic(u) * (0.5 + i * 0.12);
          const hop = Math.sin(Math.PI * u) * (46 + i * 20);
          const y = lerp(y0 - 70 * (1 - e), floor - 10 + (i % 2) * 7, E.outCubic(u)) - hop;
          const rot = dir * 0.5 * Math.sin(Math.PI * u) + dir * 0.06 * E.outCubic(u);
          ctx.save(); ctx.globalAlpha = clamp(e * 2);
          coin(ctx, x, y, 70, 20, { rot, th: 13 }); ctx.restore();
        }
        txt(ctx, 'CAIXA', bx, 1388, { fam: MONO, size: 28, weight: 800, align: 'center', color: C.gray, ls: 5, alpha: clamp(e), box: 'caixa' });
        const sh = p(t, ev.topple, ev.topple + 0.5);
        if (sh > 0) chip(ctx, '− R$', bx + 236, 1218, { size: 28, color: C.red, bg: css(C.red, 0.12), border: css(C.red, 0.6), alpha: E.outCubic(sh), box: 'perda' });
      }
      // o cartão da reserva
      enter(ctx, ent(t, ev.card, 0.5), cx0 + cw / 2, cy0 + ch / 2, () => {
        reservaCard(ctx, cx0, cy0, cw, ch, d.reserva, { box: 'cartão da reserva', status: t >= ev.status ? { t: 'SEM REGISTRO', c: C.amber, a: E.outCubic(p(t, ev.status, ev.status + 0.3)), box: 'sem registro' } : null });
      });
      // o "?" pulsando, ligado ao cartão por um tracejado
      const e = p(t, ev.duv, ev.duv + 0.4);
      if (e > 0) {
        const qx = 890, qy = cy0 + ch / 2 - 10, R = 58;
        ctx.save(); ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = css(C.amber, 0.6 * e); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx0 + cw + 4, qy); ctx.lineTo(cx0 + cw + 4 + (qx - R - 4 - cx0 - cw - 4) * E.outCubic(e), qy); ctx.stroke(); ctx.restore();
        const k = E.outBack(e, 2.4) * (1 + 0.06 * Math.sin((t - ev.duv) * 5));
        for (let r = 0; r < 2; r++) {
          const ph = ((t - ev.duv) / 1.3 + r * 0.5) % 1;
          ctx.beginPath(); ctx.arc(qx, qy, R + 34 * ph, 0, TAU); ctx.strokeStyle = css(C.amber, 0.35 * (1 - ph) * e); ctx.lineWidth = 3; ctx.stroke();
        }
        ctx.save(); ctx.translate(qx, qy); ctx.scale(k, k);
        ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = css(C.amber, 0.14); ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = C.amber; ctx.shadowColor = css(C.amber, 0.7); ctx.shadowBlur = 22; ctx.stroke();
        ctx.shadowColor = 'transparent';
        txt(ctx, '?', 0, 26, { size: 74, weight: 900, align: 'center', color: C.amber });
        ctx.restore();
        BOX('dúvida', qx - R, qy - R, qx + R, qy + R);
      }
    },
  };

  // ---- partes: a reserva se abre em encaixes; um fica solto e vermelho
  CENAS.partes = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.card = at(cap, d.reserva.em, cap.t0 + 0.5);
      ev.abre = at(cap, d.abre, ev.card + 0.8);
      let prev = ev.abre - 0.22;
      ev.slots = d.partes.map((x) => (prev = Math.max(at(cap, x.em, ev.abre), prev + 0.22)));
      ev.solta = at(cap, d.solta.em, cap.t1 - 2);
      ev.prej = Math.max(at(cap, d.solta.em_t, ev.solta + 0.6), ev.solta + 0.35);
      cue(ev.card, 'pop', { f: 560 }); ev.slots.forEach((t, i) => cue(t, 'slot', { i }));
      cue(ev.solta, 'snap'); cue(ev.prej, 'alert');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      const cw = 700, ch = 196, cx0 = L.cx - cw / 2, cy0 = 832;
      enter(ctx, ent(t, ev.card, 0.5), L.cx, cy0 + ch / 2, () => reservaCard(ctx, cx0, cy0, cw, ch, d.reserva, { box: 'cartão da reserva' }));
      const n = d.partes.length, sw = 244, sh = 192, gap = (L.x1 - L.x0 - n * sw) / (n - 1), sy = 1120;
      d.partes.forEach((pt, i) => {
        const ts = ev.slots[i], e = ent(t, ts, 0.45);
        if (e <= 0) return;
        const sx = L.x0 + i * (sw + gap), scx = sx + sw / 2;
        const loose = d.solta.i === i ? E.outBack(p(t, ev.solta, ev.solta + 0.55), 1.4) : 0;
        // a ligação do cartão até o encaixe
        const lk = E.outCubic(p(t, ts - 0.1, ts + 0.3));
        ctx.save(); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        const ax = L.cx, ay = cy0 + ch, bx = scx, by = sy;
        const pt2 = (u) => { const v = 1 - u; return [v * v * v * ax + 3 * v * v * u * ax + 3 * v * u * u * bx + u * u * u * bx, v * v * v * ay + 3 * v * v * u * (ay + 60) + 3 * v * u * u * (by - 60) + u * u * u * by]; };
        const upto = loose > 0 ? lerp(lk, 0.45, clamp(loose)) : lk;
        ctx.strokeStyle = loose > 0.05 ? css(C.red, 0.85) : css(C.lime, 0.75);
        if (loose > 0.05) ctx.setLineDash([7, 7]);
        ctx.beginPath(); for (let u = 0; u <= upto + 1e-6; u += 0.02) { const [x, y] = pt2(Math.min(u, upto)); if (u === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
        ctx.restore();
        // o encaixe
        const red = loose > 0.05;
        const oy = 46 * clamp(loose), rot = 6 * DEG * clamp(loose);
        ctx.save(); ctx.globalAlpha *= clamp(e * 1.4);
        ctx.translate(scx, sy + sh / 2 + oy + 26 * (1 - e)); ctx.rotate(rot); ctx.translate(-scx, -(sy + sh / 2));
        panel(ctx, sx, sy, sw, sh, { r: 24, dash: red ? [] : [9, 7], dashOff: -t * 16, stroke: red ? C.red : css(C.lime, 0.75), flat: red ? css(C.red, 0.1) : css(C.lime, 0.05), shadow: false, glow: red ? css(C.red, 0.5) : null });
        icon(ctx, red ? 'alerta' : pt.icone || 'cadeado', scx, sy + 72, 56, red ? C.red : C.lime, { lw: 2 });
        txt(ctx, pt.t, scx, sy + 152, { fam: MONO, size: 32, weight: 800, align: 'center', color: red ? C.red : C.white, ls: 3 });
        ctx.restore();
        BOX(`encaixe ${pt.t}`, sx, sy + oy, sx + sw, sy + sh + oy);
        if (red) {
          const ep = p(t, ev.prej, ev.prej + 0.35);
          if (ep > 0) {
            const sk = Math.sin((t - ev.prej) * 40) * 6 * (1 - p(t, ev.prej, ev.prej + 0.5));
            ctx.save(); ctx.translate(sk, 0);
            const k = E.outBack(ep, 2), cyP = 1400;
            ctx.translate(scx, cyP); ctx.scale(k, k); ctx.translate(-scx, -cyP);
            chip(ctx, d.solta.t, scx, cyP, { size: 28, align: 'center', icon: 'alerta', color: C.ink, bg: C.red, border: 'none', glow: css(C.red, 0.6), h: 60, box: 'prejuízo' });
            ctx.restore();
          }
        }
      });
    },
  };

  // ---- calendário: a data pontilhada (promessa) recebe o cadeado no canto; o pagamento do sinal com check; o contraste "sem sinal"
  CENAS.calendario = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.cal = at(cap, d.em, cap.t0 + 0.5);
      ev.pag = at(cap, d.pagamento.em, ev.cal + 1);
      ev.check = ev.pag + 0.5;
      ev.lock = Math.max(at(cap, d.cadeado.em, ev.pag + 0.4), ev.pag + 0.3);
      ev.land = ev.lock + 0.38;
      ev.con = at(cap, d.contraste.em, cap.t1 - 2.5);
      ev.prom = at(cap, d.contraste.em_destaque, ev.con + 1);
      cue(ev.cal, 'pop', { f: 520 }); cue(ev.pag, 'chip'); cue(ev.check, 'check'); cue(ev.lock, 'drop'); cue(ev.land, 'lock');
      cue(ev.con, 'pop', { f: 440 }); cue(ev.prom, 'flicker');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      const X = L.x0, Y = 828, Wc = 520, Hc = 500;
      const eCal = ent(t, ev.cal, 0.5);
      const first = d.primeiro_dia_semana || 0, days = d.dias_no_mes || 30;
      const cw = 68, chh = 60, gx = X + (Wc - 7 * cw) / 2, gy = Y + 124;
      const di = d.dia - 1 + first, col = di % 7, row = Math.floor(di / 7);
      const dx = gx + col * cw, dy = gy + row * chh;
      const landed = t >= ev.land;
      enter(ctx, eCal, X + Wc / 2, Y + Hc / 2, () => {
        panel(ctx, X, Y, Wc, Hc, { r: 30, stroke: css(C.white, 0.14), box: 'calendário' });
        icon(ctx, 'calendario', X + 48, Y + 50, 36, C.lime, { lw: 2 });
        txt(ctx, d.mes, X + 82, Y + 62, { fam: MONO, size: 30, weight: 800, color: C.white, ls: 4 });
        txt(ctx, '‹  ›', X + Wc - 36, Y + 62, { fam: MONO, size: 28, weight: 700, color: C.grayD, align: 'right' });
        'DSTQQSS'.split('').forEach((w, i) => txt(ctx, w, gx + i * cw + cw / 2, Y + 108, { fam: MONO, size: 22, weight: 700, color: C.grayD, align: 'center' }));
        for (let i = 0; i < days; i++) {
          const k = i + first, cx = gx + (k % 7) * cw + cw / 2, cy = gy + Math.floor(k / 7) * chh + chh / 2;
          const a = clamp((t - ev.cal - 0.15 - k * 0.012) / 0.25);
          if (i === d.dia - 1) continue;
          txt(ctx, String(i + 1), cx, cy + 10, { fam: MONO, size: 26, weight: 700, color: '#C9CCC5', align: 'center', alpha: a });
        }
        // o dia: pontilhado (promessa) até o cadeado; depois, limão
        const fill = landed ? E.outCubic(p(t, ev.land, ev.land + 0.25)) : 0;
        rr(ctx, dx + 4, dy + 4, cw - 8, chh - 8, 14);
        if (fill > 0) { ctx.fillStyle = css(C.lime, fill); ctx.shadowColor = css(C.lime, 0.7 * fill); ctx.shadowBlur = 26; ctx.fill(); ctx.shadowColor = 'transparent'; }
        if (fill < 1) { ctx.save(); ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 20; ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.amber, 0.95 * (1 - fill)); ctx.stroke(); ctx.restore(); }
        txt(ctx, String(d.dia), dx + cw / 2, dy + chh / 2 + 10, { fam: MONO, size: 28, weight: 800, align: 'center', color: fill > 0.5 ? C.ink : C.amber, box: `número do dia ${d.dia}` });
        // o rodapé: "14/11 · PROMESSA" → "14/11 · DATA GARANTIDA"
        const fy = Y + Hc - 34;
        ctx.strokeStyle = css(C.white, 0.08); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 24, fy - 38); ctx.lineTo(X + Wc - 24, fy - 38); ctx.stroke();
        const lbl = landed ? d.garantida : d.promessa, lc = landed ? C.lime : C.amber;
        icon(ctx, landed ? 'check' : 'relogio', X + 46, fy - 9, 28, lc, { lw: 2.4 });
        txt(ctx, `${String(d.dia).padStart(2, '0')}/${String(11).padStart(2, '0')} · ${lbl}`, X + 74, fy, { fam: MONO, size: 24, weight: 800, color: lc, ls: 2 });
      });
      // o cadeado que cai no CANTO da data (nunca em cima do número)
      if (t >= ev.lock) {
        const u = p(t, ev.lock, ev.land), tx = dx + cw + 4, ty = dy - 4;
        const y = lerp(ty - 260, ty, E.inCubic(u)), k = landed ? 1 + 0.18 * (1 - p(t, ev.land, ev.land + 0.3)) : 1.25;
        ctx.save(); ctx.translate(tx, y); ctx.scale(k, k);
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fillStyle = '#10140A'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C.lime; ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowColor = 'transparent';
        icon(ctx, t >= ev.land + 0.12 ? 'cadeado' : 'cadeado_aberto', 0, 0, 22, C.lime, { lw: 2.6, fill: t >= ev.land + 0.12 ? css(C.lime, 0.25) : null });
        ctx.restore();
        if (landed) BOX('cadeado da data', tx - 18, ty - 18, tx + 18, ty + 18);
        if (landed) { const r = p(t, ev.land, ev.land + 0.6); if (r < 1) { ctx.beginPath(); ctx.arc(dx + cw / 2, dy + chh / 2, 32 + 60 * r, 0, TAU); ctx.strokeStyle = css(C.lime, 0.6 * (1 - r)); ctx.lineWidth = 3; ctx.stroke(); } }
      }
      // o pagamento do sinal
      const eP = ent(t, ev.pag, 0.45), py = Y + Hc + 16, ph = 64;
      enter(ctx, eP, X + Wc / 2, py + ph / 2, () => {
        panel(ctx, X, py, Wc, ph, { r: 20, stroke: css(C.lime, 0.35), box: 'pagamento' });
        icon(ctx, 'pix', X + 42, py + ph / 2, 32, C.lime, { lw: 2 });
        txt(ctx, d.pagamento.t, X + 74, py + ph / 2 + 9, { fam: MONO, size: 25, weight: 800, color: C.white, ls: 1 });
        badge(ctx, X + Wc - 38, py + ph / 2, 21, 'check', C.lime, p(t, ev.check, ev.check + 0.3));
      });
      // o contraste: "sem sinal"
      const cX = X + Wc + 24, cW = L.x1 - cX, cY = Y, cH = 420;
      enter(ctx, ent(t, ev.con, 0.5), cX + cW / 2, cY + cH / 2, () => {
        panel(ctx, cX, cY, cW, cH, { r: 28, stroke: css(C.red, 0.45), box: 'sem sinal' });
        icon(ctx, 'x', cX + 38, cY + 50, 28, C.red, { lw: 3 });
        txt(ctx, d.contraste.t, cX + 60, cY + 59, { fam: MONO, size: 24, weight: 800, color: C.red, ls: 1 });
        const pr = t >= ev.prom ? p(t, ev.prom, ev.prom + 0.4) : 0;
        const fl = t >= ev.prom ? 0.45 + 0.55 * Math.abs(Math.cos((t - ev.prom) * 7)) : 1;
        const bs = 146, bx = cX + cW / 2 - bs / 2, by = cY + 104;
        ctx.save(); ctx.globalAlpha *= fl; rr(ctx, bx, by, bs, bs - 8, 22); ctx.setLineDash([6, 7]); ctx.lineDashOffset = -t * 16; ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.gray, 0.7); ctx.stroke(); ctx.restore();
        txt(ctx, String(d.contraste.dia), bx + bs / 2, by + bs / 2 + 16, { size: 62, weight: 800, align: 'center', color: C.gray, alpha: fl });
        const sub = d.contraste.sub, ss = fitSize([sub], DISPLAY, 700, cW - 30, 36);
        txt(ctx, sub, cX + cW / 2, cY + cH - 70, { size: ss, weight: 700, align: 'center', color: mixHex(C.gray, C.amber, pr) });
        if (pr > 0) chip(ctx, '?', bx + bs - 4, by + 6, { size: 24, align: 'center', color: C.amber, bg: css(C.amber, 0.15), border: css(C.amber, 0.7), h: 44, pad: 13, alpha: pr });
      });
    },
  };

  // ---- barra de pagamento: total, pago, consumo, desconto e o que falta
  CENAS.barra = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.total = at(cap, d.total.em, cap.t0 + 0.6);
      let prev = ev.total + 0.3;
      ev.steps = d.passos.map((s) => (prev = Math.max(at(cap, s.em, prev + 0.6), prev + 0.35)));
      ev.res = Math.max(at(cap, d.resultado.em, prev + 0.8), prev + 0.7);
      ev.alert = Math.max(at(cap, d.alerta.em, ev.res + 1), ev.res + 0.6);
      let tot = d.total.v, pago = 0;
      d.passos.forEach((s) => { if (s.tipo === 'pago') pago += s.v; if (s.tipo === 'soma') tot += s.v; if (s.tipo === 'tira') tot -= s.v; });
      cap.falta = tot - pago; cap.final = tot;
      cue(ev.total, 'grow', { d: 0.6 });
      d.passos.forEach((s, i) => cue(ev.steps[i], s.tipo === 'pago' ? 'fill' : s.tipo === 'soma' ? 'pop' : 'cut', { f: 700 }));
      d.passos.forEach((s, i) => { if (s.tipo === 'tira') cue(ev.steps[i] + 0.55, 'drop'); });
      cue(ev.res, 'count', { d: 0.6 }); cue(ev.res + 0.62, 'big'); cue(ev.alert, 'alert');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev, k = (L.x1 - L.x0) / d.escala, X = L.x0, BY = 934, BH = 96;
      const xv = (v) => X + v * k;
      const eT = p(t, ev.total, ev.total + 0.6);
      if (eT <= 0) return;
      // o rótulo do total
      txt(ctx, d.total.t, X, 888, { fam: MONO, size: 26, weight: 800, color: C.gray, ls: 3, alpha: clamp(eT * 2) });
      txt(ctx, brl(d.total.v), X + tw(d.total.t, MONO, 26, 800, 3) + 16, 888, { fam: MONO, size: 36, weight: 800, color: C.white, alpha: clamp(eT * 2), box: 'total' });
      // a barra: o total e o que muda
      let end = d.total.v, endAnim = d.total.v * E.outCubic(eT);
      d.passos.forEach((s, i) => { if (s.tipo === 'soma') { const e = E.outCubic(p(t, ev.steps[i], ev.steps[i] + 0.45)); endAnim += s.v * e; end += s.v; } });
      ctx.save(); rr(ctx, X, BY, Math.max(30, endAnim * k), BH, 20); ctx.fillStyle = C.card2; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.white, 0.35); ctx.stroke(); ctx.restore();
      BOX('barra', X, BY, X + d.total.v * k, BY + BH);
      ctx.save(); rr(ctx, X, BY, Math.max(30, endAnim * k), BH, 20); ctx.clip();
      d.passos.forEach((s, i) => {
        const ts = ev.steps[i];
        if (t < ts) return;
        if (s.tipo === 'pago') {
          const e = E.outCubic(p(t, ts, ts + 0.5));
          ctx.fillStyle = C.lime; ctx.fillRect(X, BY, s.v * k * e, BH);
          txt(ctx, `${s.t} ${brl(s.v).replace(',00', '')}`, X + s.v * k / 2, BY + BH / 2 + 10, { fam: MONO, size: 28, weight: 800, align: 'center', color: C.ink, alpha: clamp((e - 0.6) * 3) });
        } else if (s.tipo === 'soma') {
          const e = E.outCubic(p(t, ts, ts + 0.45));
          ctx.fillStyle = css(C.amber, 0.85); ctx.fillRect(xv(d.total.v), BY, s.v * k * e, BH);
        } else if (s.tipo === 'tira') {
          const drop = p(t, ts + 0.55, ts + 1.05);
          const x0 = xv(end - s.v);
          ctx.save(); ctx.translate(0, 140 * E.inCubic(drop)); ctx.globalAlpha = 1 - drop;
          ctx.fillStyle = css(C.red, 0.9); ctx.fillRect(x0, BY, s.v * k, BH);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 4; for (let h = -BH; h < s.v * k; h += 14) { ctx.beginPath(); ctx.moveTo(x0 + h, BY + BH); ctx.lineTo(x0 + h + BH, BY); ctx.stroke(); }
          ctx.restore();
        }
      });
      ctx.restore();
      // o pedaço do desconto caindo (fora do recorte da barra)
      d.passos.forEach((s, i) => {
        if (s.tipo !== 'tira' || t < ev.steps[i] + 0.55) return;
        const drop = p(t, ev.steps[i] + 0.55, ev.steps[i] + 1.05); if (drop >= 1) return;
        const x0 = xv(end - s.v);
        ctx.save(); ctx.globalAlpha = 1 - drop; ctx.translate(x0 + s.v * k / 2, BY + BH / 2 + 160 * E.inCubic(drop)); ctx.rotate(0.5 * drop);
        ctx.fillStyle = css(C.red, 0.9); ctx.fillRect(-s.v * k / 2, -BH / 2, s.v * k, BH); ctx.restore();
      });
      // a barra que fica no fim: o total final com borda
      const tiraDone = d.passos.every((s, i) => s.tipo !== 'tira' || t >= ev.steps[i] + 1.05);
      if (tiraDone) { ctx.save(); rr(ctx, X, BY, cap.final * k, BH, 20); ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.white, 0.5); ctx.stroke(); ctx.restore(); }
      // as etiquetas de soma e desconto (embaixo, à direita)
      let ly = BY + BH + 52;
      d.passos.forEach((s, i) => {
        if (s.tipo === 'pago') return;
        const e = ent(t, ev.steps[i], 0.4);
        if (e <= 0) { ly += 50; return; }
        const col = s.tipo === 'soma' ? C.amber : C.red, sign = s.tipo === 'soma' ? '+' : '−';
        const label = `${sign} ${s.t} ${brl(s.v).replace(',00', '')}`;
        const w = tw(label, MONO, 28, 800, 1);
        const yy = ly;
        enter(ctx, e, L.x1 - w / 2, yy, () => {
          icon(ctx, s.icone || 'etiqueta', L.x1 - w - 28, yy - 9, 32, col, { lw: 2.2 });
          txt(ctx, label, L.x1, yy, { fam: MONO, size: 28, weight: 800, color: col, align: 'right', ls: 1, box: `etiqueta ${s.t}` });
        }, { dy: -14 });
        ly += 50;
      });
      // o que falta: colchete limão sobre a barra + o valor grande contando
      const eR = p(t, ev.res, ev.res + 0.5);
      if (eR > 0) {
        const pago = d.passos.filter((s) => s.tipo === 'pago').reduce((a, s) => a + s.v, 0);
        const a = xv(pago) + 6, b = xv(cap.final) - 6, yb = BY - 16;
        ctx.save(); ctx.strokeStyle = C.lime; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 14;
        const m = (a + b) / 2, half = (b - a) / 2 * E.outCubic(eR);
        ctx.beginPath(); ctx.moveTo(m - half, yb + 10); ctx.lineTo(m - half, yb); ctx.lineTo(m + half, yb); ctx.lineTo(m + half, yb + 10); ctx.stroke();
        ctx.restore();
        txt(ctx, d.resultado.t, m, yb - 14, { fam: MONO, size: 24, weight: 800, color: C.lime, align: 'center', ls: 4, alpha: E.outCubic(eR) });
        const v = cap.falta * E.outCubic(p(t, ev.res, ev.res + 0.6));
        const big = t >= ev.res + 0.62 ? 1 + 0.08 * (1 - p(t, ev.res + 0.62, ev.res + 0.9)) : 1;
        ctx.save(); ctx.translate(L.cx, 1260); ctx.scale(big, big); ctx.translate(-L.cx, -1260);
        txt(ctx, d.resultado.t, L.cx, 1196, { fam: MONO, size: 26, weight: 800, color: C.gray, align: 'center', ls: 5, alpha: E.outCubic(eR) });
        txt(ctx, brl(Math.round(v)), L.cx, 1296, { size: 112, weight: 900, color: C.lime, align: 'center', ls: -2, glow: css(C.lime, 0.4), blur: 30, alpha: E.outCubic(eR), box: 'falta' });
        ctx.restore();
        const nc = Math.round(d.conta.length * p(t, ev.res + 0.5, ev.res + 1.2));
        if (nc > 0) txt(ctx, d.conta.slice(0, nc), L.cx, 1348, { fam: MONO, size: 30, weight: 700, color: C.gray, align: 'center', box: nc === d.conta.length ? 'conta' : null });
      }
      // o alerta: cobrar errado
      const eA = p(t, ev.alert, ev.alert + 0.35);
      if (eA > 0) {
        const sk = Math.sin((t - ev.alert) * 42) * 7 * (1 - p(t, ev.alert, ev.alert + 0.5));
        ctx.save(); ctx.translate(sk, 0);
        chip(ctx, d.alerta.t, L.cx, 1408, { size: 26, icon: 'alerta', align: 'center', color: C.red, bg: css(C.red, 0.13), border: css(C.red, 0.75), h: 58, alpha: E.outCubic(eA), box: 'alerta' });
        ctx.restore();
      }
    },
  };

  // ---- crédito: o sinal sai da data cancelada, não vai pro bolso, vira um cartão de crédito GRANDE e encaixa na nova data
  function miniCal(ctx, x, y, w, h, title, first, hi, o = {}) {
    panel(ctx, x, y, w, h, { r: 26, stroke: o.stroke || css(C.white, 0.14), glow: o.glow, box: o.box });
    icon(ctx, 'calendario', x + 38, y + 46, 30, o.tc || C.gray, { lw: 2 });
    txt(ctx, title, x + 66, y + 56, { fam: MONO, size: 25, weight: 800, color: o.tc || C.gray, ls: 2 });
    const cw = (w - 28) / 7, ch = 72, gx = x + 14, gy = y + 100;
    const cells = {};
    for (let i = 0; i < 14; i++) {
      const dnum = first + i, cx = gx + (i % 7) * cw + cw / 2, cy = gy + Math.floor(i / 7) * ch + ch / 2;
      cells[dnum] = { x: cx, y: cy, w: cw, h: ch };
      if (dnum === hi) continue;
      txt(ctx, String(dnum), cx, cy + 10, { fam: MONO, size: 26, weight: 700, color: '#BFC2BB', align: 'center' });
    }
    return cells;
  }
  const CARTAO = { CW: 546, CH: 228, mono: 32, valor: 68, sub: 30 };   // o cartão de crédito grande (≈ 70% da área útil)
  CENAS.credito = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.cards = at(cap, d.antiga.em, cap.t0 + 0.5);
      ev.coin = Math.max(at(cap, d.sinal.em, ev.cards), ev.cards) + 0.25;
      ev.cancel = at(cap, d.cancelou.em, ev.coin + 1);
      ev.fica = at(cap, d.fica.em, ev.cancel + 1);
      ev.bolso = at(cap, d.bolso.em, ev.fica + 0.8);
      ev.vira = at(cap, d.vira.em, ev.bolso + 1);
      ev.seta = ev.vira + 0.45;                        // a seta termina; então o sinal desce e vira o cartão
      ev.card = ev.seta + 0.5; ev.plug = ev.card + 0.55; ev.fit = ev.plug + 0.3;
      cue(ev.cards, 'pop', { f: 500 }); cue(ev.coin, 'coin'); cue(ev.cancel, 'alert'); cue(ev.fica, 'rise'); cue(ev.bolso, 'deny');
      cue(ev.vira, 'whoosh'); cue(ev.seta + 0.05, 'whoosh'); cue(ev.card, 'big'); cue(ev.fit, 'lock'); cue(ev.fit + 0.2, 'check');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      const cw = 340, chh = 268, aX = L.x0, bX = L.x1 - cw, cY = 828;
      const fitOn = p(t, ev.fit, ev.fit + 0.3);
      let A = null, B = null;
      enter(ctx, ent(t, ev.cards, 0.5), aX + cw / 2, cY + chh / 2, () => { A = miniCal(ctx, aX, cY, cw, chh, d.antiga.t, d.antiga.dia - 6, d.antiga.dia, { box: 'data antiga', stroke: t >= ev.cancel ? css(C.red, 0.5) : null }); });
      enter(ctx, ent(t, ev.cards + 0.15, 0.5), bX + cw / 2, cY + chh / 2, () => { B = miniCal(ctx, bX, cY, cw, chh, d.nova.t, d.nova.dia - 6, d.nova.dia, { box: 'nova data', tc: fitOn > 0 ? C.lime : C.gray, stroke: fitOn > 0 ? css(C.lime, 0.7) : null, glow: fitOn > 0 ? css(C.lime, 0.35 * fitOn) : null }); });
      if (!A) return;
      // a data antiga: o dia do sinal e o "cancelou"
      const a = A[d.antiga.dia];
      const can = p(t, ev.cancel, ev.cancel + 0.3);
      txt(ctx, String(d.antiga.dia), a.x, a.y + 10, { fam: MONO, size: 26, weight: 800, align: 'center', color: can > 0 ? C.red : C.amber });
      if (can > 0) {
        ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.lineCap = 'round'; const r = 17 * E.outCubic(can);
        ctx.beginPath(); ctx.moveTo(a.x - r, a.y - r); ctx.lineTo(a.x + r, a.y + r); ctx.moveTo(a.x + r, a.y - r); ctx.lineTo(a.x - r, a.y + r); ctx.stroke(); ctx.restore();
        chip(ctx, d.cancelou.t, aX + cw / 2, cY + chh + 40, { size: 24, align: 'center', icon: 'x', color: C.red, bg: css(C.red, 0.12), border: css(C.red, 0.7), h: 52, alpha: E.outCubic(can), box: 'cancelou' });
      }
      // a nova data: o dia que recebe o crédito
      if (B) {
        const b = B[d.nova.dia];
        if (fitOn > 0) { rr(ctx, b.x - b.w / 2 + 2, b.y - b.h / 2 + 4, b.w - 4, b.h - 8, 10); ctx.fillStyle = css(C.lime, fitOn); ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 20; ctx.fill(); ctx.shadowColor = 'transparent'; }
        txt(ctx, String(d.nova.dia), b.x, b.y + 10, { fam: MONO, size: 26, weight: 800, align: 'center', color: fitOn > 0.5 ? C.ink : '#BFC2BB' });
      }
      // a seta entre as datas
      const eV = p(t, ev.vira, ev.seta);
      if (eV > 0) {
        const x0 = aX + cw + 24, x1 = bX - 24, y = cY + chh / 2;
        ctx.save(); ctx.strokeStyle = C.lime; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = css(C.lime, 0.7); ctx.shadowBlur = 12;
        const xe = lerp(x0, x1, E.outCubic(eV));
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xe, y); ctx.stroke();
        if (eV > 0.6) { ctx.beginPath(); ctx.moveTo(xe - 18, y - 15); ctx.lineTo(xe, y); ctx.lineTo(xe - 18, y + 15); ctx.stroke(); }
        ctx.restore();
        if (eV >= 1) BOX('seta', x0, y - 15, x1, y + 15);
      }
      // o bolso (o sinal não volta pra ele)
      const eB = ent(t, ev.bolso, 0.4);
      const wx = aX + 96, wy = 1278;
      if (eB > 0) {
        enter(ctx, eB, wx, wy, () => {
          icon(ctx, 'carteira', wx, wy, 84, C.gray, { lw: 1.8 });
          txt(ctx, 'BOLSO', wx, wy + 84, { fam: MONO, size: 24, weight: 800, color: C.gray, align: 'center', ls: 3, box: 'bolso' });
          const xr = p(t, ev.bolso + 0.25, ev.bolso + 0.5);
          if (xr > 0) badge(ctx, wx + 44, wy - 40, 22, 'x', C.red, xr, { ink: C.white });
        });
      }
      // o cartão de crédito GRANDE: surge depois da seta, embaixo da nova data, e se encaixa nela
      const { CW, CH } = CARTAO, CX0 = L.x1 - CW, CY0 = 1178, ccx = CX0 + CW / 2, ccy = CY0 + CH / 2;
      if (t >= ev.coin) {
        // a moeda do sinal: sobe ("não some") e, depois da seta, desce até onde nasce o cartão
        const lift = E.outCubic(p(t, ev.fica, ev.fica + 0.4));
        let x = a.x + 34, y = a.y - 6 - 30 * lift;
        const mv = E.inOutCubic(p(t, ev.seta, ev.card));
        if (mv > 0) { x = lerp(x, ccx, mv); y = lerp(y, ccy, mv) - Math.sin(Math.PI * mv) * 90; }
        const morph = p(t, ev.card - 0.08, ev.card + 0.3);
        if (morph < 1) {
          const e = E.outBack(p(t, ev.coin, ev.coin + 0.35), 2);
          ctx.save(); ctx.translate(x, y); ctx.scale(e * (1 + morph), e * (1 + morph)); ctx.globalAlpha *= 1 - morph;
          const pul = 1 + (lift > 0 && mv === 0 ? 0.05 * Math.sin((t - ev.fica) * 8) : 0);
          ctx.scale(pul, pul);
          ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); const g = ctx.createLinearGradient(-40, -40, 40, 40); g.addColorStop(0, '#F7D774'); g.addColorStop(1, '#D9A53B');
          ctx.fillStyle = g; ctx.shadowColor = css(C.gold, 0.6); ctx.shadowBlur = 20 + 14 * lift; ctx.fill(); ctx.shadowColor = 'transparent';
          txt(ctx, d.sinal.t.replace('R$ ', ''), 0, 8, { fam: MONO, size: 23, weight: 800, align: 'center', color: '#5A3D05' });
          ctx.restore();
        }
        if (morph > 0) {
          const [rot, val] = d.cartao.t.split(' · ');
          const sc = E.outBack(morph, 1.5);
          ctx.save(); ctx.translate(ccx, ccy); ctx.scale(lerp(0.3, 1, sc), lerp(0.3, 1, sc)); ctx.globalAlpha *= clamp(morph * 2.5);
          rr(ctx, -CW / 2, -CH / 2, CW, CH, 28);
          const g = ctx.createLinearGradient(-CW / 2, -CH / 2, CW / 2, CH / 2); g.addColorStop(0, '#1F2B12'); g.addColorStop(1, '#0F140B');
          ctx.fillStyle = g; ctx.shadowColor = css(C.lime, 0.35 + 0.25 * fitOn); ctx.shadowBlur = 36; ctx.fill(); ctx.shadowColor = 'transparent';
          ctx.lineWidth = 3; ctx.strokeStyle = C.lime; ctx.stroke();
          // o chip do cartão
          rr(ctx, CW / 2 - 96, -CH / 2 + 30, 62, 46, 9); ctx.fillStyle = css(C.gold, 0.85); ctx.fill();
          ctx.strokeStyle = 'rgba(90,60,5,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(CW / 2 - 96, -CH / 2 + 53); ctx.lineTo(CW / 2 - 34, -CH / 2 + 53); ctx.moveTo(CW / 2 - 65, -CH / 2 + 30); ctx.lineTo(CW / 2 - 65, -CH / 2 + 76); ctx.stroke();
          icon(ctx, 'cartao', -CW / 2 + 52, -CH / 2 + 54, 40, C.lime, { lw: 2 });
          txt(ctx, rot, -CW / 2 + 88, -CH / 2 + 66, { fam: MONO, size: CARTAO.mono, weight: 800, color: C.lime, ls: 3 });
          txt(ctx, val || '', -CW / 2 + 34, -CH / 2 + 148, { size: CARTAO.valor, weight: 900, color: C.white, ls: -1 });
          txt(ctx, d.cartao.sub, -CW / 2 + 34, CH / 2 - 30, { fam: MONO, size: CARTAO.sub, weight: 700, color: '#D9DCD4', ls: 0.5 });
          ctx.restore();
          if (morph >= 1) BOX('cartão de crédito', CX0, CY0, CX0 + CW, CY0 + CH);
          if (fitOn > 0) badge(ctx, CX0 + CW - 136, CY0 + 53, 22, 'check', C.lime, fitOn);
        }
        // o encaixe: um conector limão do cartão até a nova data, que acende
        const pl = E.outCubic(p(t, ev.plug, ev.fit));
        if (pl > 0 && B) {
          const px = bX + cw / 2, y0 = CY0, y1 = cY + chh;
          ctx.save(); ctx.strokeStyle = C.lime; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, lerp(y0, y1, pl)); ctx.stroke();
          ctx.fillStyle = C.lime; ctx.beginPath(); ctx.arc(px, y0, 8, 0, TAU); ctx.fill();
          if (pl >= 1) { ctx.beginPath(); ctx.arc(px, y1, 8, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
      }
    },
  };

  // ---- pares: dois pares de cartões com "=" que é cortado e vira "≠" limão
  CENAS.pares = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      let prev = cap.t0 + 0.3;
      ev.rows = d.pares.map((pr) => {
        const a = Math.max(at(cap, pr.a.em, prev + 0.3), prev), b = Math.max(at(cap, pr.b.em, a + 0.6), a + 0.45);
        prev = b + 0.3; return { a, b, neq: b + 0.32 };
      });
      ev.rows.forEach((r) => { cue(r.a, 'pop', { f: 600 }); cue(r.b, 'pop', { f: 720 }); cue(r.neq, 'neq'); });
      const subs = d.pares.flatMap((pr) => [pr.a.sub || '', pr.b.sub || '']);
      cap.subS = fitSize(subs, DISPLAY, 600, 344 - 52, 32);
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev, cw = 344, ch = 236;
      d.pares.forEach((pr, i) => {
        const y = 840 + i * (ch + 66), r = ev.rows[i];
        const side = (o, x, ts, tag) => enter(ctx, ent(t, ts, 0.45), x + cw / 2, y + ch / 2, () => {
          panel(ctx, x, y, cw, ch, { r: 28, stroke: css(C.white, 0.16), box: tag });
          rr(ctx, x + 26, y + 28, 76, 76, 20); ctx.fillStyle = css(C.lime, 0.1); ctx.fill();
          icon(ctx, o.icone || 'cadeado', x + 64, y + 66, 42, C.lime, { lw: 2 });
          txt(ctx, o.t, x + 120, y + 78, { fam: MONO, size: 32, weight: 800, color: C.white, ls: 2 });
          txt(ctx, o.sub || '', x + 26, y + ch - 46, { size: cap.subS, weight: 600, color: C.gray });
        });
        side(pr.a, L.x0, r.a, `par ${i + 1}: ${pr.a.t}`);
        side(pr.b, L.x1 - cw, r.b, `par ${i + 1}: ${pr.b.t}`);
        // "=" que vira "≠"
        const eq = p(t, r.b, r.b + 0.25), sl = p(t, r.neq, r.neq + 0.22);
        if (eq > 0) {
          const cx = L.cx, cy = y + ch / 2, k = sl > 0 ? 1 + 0.25 * (1 - p(t, r.neq, r.neq + 0.35)) : E.outBack(eq);
          ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
          ctx.strokeStyle = sl > 0 ? C.lime : C.gray; ctx.lineWidth = 9; ctx.lineCap = 'round';
          if (sl > 0) { ctx.shadowColor = css(C.lime, 0.8); ctx.shadowBlur = 22; }
          ctx.beginPath(); ctx.moveTo(-30, -13); ctx.lineTo(30, -13); ctx.moveTo(-30, 13); ctx.lineTo(30, 13); ctx.stroke();
          if (sl > 0) { ctx.beginPath(); ctx.moveTo(16, -40); ctx.lineTo(16 - 32 * E.outCubic(sl), -40 + 80 * E.outCubic(sl)); ctx.stroke(); }
          ctx.restore();
          BOX(`diferente ${i + 1}`, cx - 36, cy - 42, cx + 36, cy + 42);
        }
      });
    },
  };

  // ---- perguntas: a mala e a chave do check-out e três perguntas que entram com check
  CENAS.perguntas = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.ilu = at(cap, d.ilustracao.em, cap.t0 + 0.5);
      let prev = ev.ilu;
      ev.itens = d.itens.map((x) => (prev = Math.max(at(cap, x.em, prev + 0.6), prev + 0.4)));
      ev.checks = ev.itens.map((x) => x + 0.55);
      cue(ev.ilu, 'pop', { f: 480 }); ev.itens.forEach((x) => cue(x, 'slide')); ev.checks.forEach((x) => cue(x, 'check'));
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev;
      // a ilustração: a mala e a chave
      const iy = 884;
      enter(ctx, ent(t, ev.ilu, 0.5), L.cx, iy, () => {
        const sway = Math.sin(t * 1.6) * 3 * DEG;
        ctx.save(); ctx.translate(L.cx - 56, iy); ctx.rotate(sway); icon(ctx, 'mala', 0, 0, 104, C.white, { lw: 1.6 }); ctx.restore();
        ctx.save(); ctx.translate(L.cx + 72, iy + 10); ctx.rotate(-20 * DEG - sway); icon(ctx, 'chave', 0, 0, 74, C.lime, { lw: 2.2, glow: css(C.lime, 0.5) }); ctx.restore();
        BOX('mala e chave', L.cx - 118, iy - 52, L.cx + 118, iy + 52);
      });
      const rh = 128, gap = 28, y0 = 966;
      // o trilhinho que liga as perguntas
      const lastOn = ev.itens.filter((x) => t >= x).length;
      if (lastOn > 1) {
        const y1 = y0 + rh / 2, y2 = y0 + (lastOn - 1) * (rh + gap) + rh / 2;
        const e = p(t, ev.itens[lastOn - 1], ev.itens[lastOn - 1] + 0.4);
        ctx.save(); ctx.strokeStyle = css(C.lime, 0.6); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.x0 + 64, y1); ctx.lineTo(L.x0 + 64, lerp(y2 - (rh + gap), y2, e)); ctx.stroke(); ctx.restore();
      }
      d.itens.forEach((it, i) => {
        const y = y0 + i * (rh + gap), ts = ev.itens[i];
        enter(ctx, ent(t, ts, 0.45), L.cx, y + rh / 2, () => {
          const ok = t >= ev.checks[i];
          panel(ctx, L.x0, y, L.x1 - L.x0, rh, { r: 26, stroke: ok ? css(C.lime, 0.55) : css(C.white, 0.14), box: `pergunta ${i + 1}` });
          ctx.beginPath(); ctx.arc(L.x0 + 64, y + rh / 2, 38, 0, TAU); ctx.fillStyle = '#141A0E'; ctx.fill(); ctx.strokeStyle = css(C.lime, 0.5); ctx.lineWidth = 2; ctx.stroke();
          icon(ctx, it.icone, L.x0 + 64, y + rh / 2, 40, C.lime, { lw: 2 });
          txt(ctx, it.t, L.x0 + 128, y + rh / 2 + 17, { size: 48, weight: 800, color: C.white, ls: -0.5 });
          badge(ctx, L.x1 - 58, y + rh / 2, 30, 'check', C.lime, p(t, ev.checks[i], ev.checks[i] + 0.3));
        }, { dy: 0, k0: 1 });
      });
    },
  };

  // ---- lista: as três palavras ligadas ao significado
  CENAS.lista = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      let prev = cap.t0 + 0.2;
      ev.itens = d.itens.map((x) => (prev = Math.max(at(cap, x.em, prev + 0.5), prev + 0.4)));
      ev.sweep = cap.t1 - 1.1;
      ev.itens.forEach((x) => { cue(x, 'pop', { f: 640 }); cue(x + 0.3, 'tick'); });
      cue(ev.sweep, 'shine');
      // o significado: em 1 linha se couber; se não, em 2 (sem diminuir a letra)
      const tx = L.x0 + 262 + 8 + 48 + 22, maxW = L.x1 - tx, S = 50;
      cap.listaS = S; cap.listaTx = tx;
      d.itens.forEach((it) => {
        if (tw(it.sentido, DISPLAY, S, 800) <= maxW) { it._l = [it.sentido]; return; }
        const ws = it.sentido.split(' '); let best = null;
        for (let i = 1; i < ws.length; i++) { const a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' '); const m = Math.max(tw(a, DISPLAY, S, 800), tw(b, DISPLAY, S, 800)); if (!best || m < best.m) best = { m, l: [a, b] }; }
        it._l = best.l;
      });
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev, rh = 148, gap = 42, y0 = 862, chipW = 262, S = cap.listaS;
      d.itens.forEach((it, i) => {
        const y = y0 + i * (rh + gap), ts = ev.itens[i];
        const e = ent(t, ts, 0.4);
        if (e <= 0) return;
        enter(ctx, e, L.x0 + chipW / 2, y + rh / 2, () => {
          panel(ctx, L.x0, y, chipW, rh, { r: 28, stroke: css(C.lime, 0.6), flat: css(C.lime, 0.07), shadow: false, box: `palavra ${it.t}` });
          icon(ctx, it.icone, L.x0 + 54, y + rh / 2, 44, C.lime, { lw: 2 });
          txt(ctx, it.t, L.x0 + 94, y + rh / 2 + 12, { fam: MONO, size: 32, weight: 800, color: C.lime, ls: 1 });
        }, { dy: 0 });
        // a ligação e o significado (revelado da esquerda para a direita)
        const lk = E.outCubic(p(t, ts + 0.18, ts + 0.45));
        const lx0 = L.x0 + chipW + 8, lx1 = L.x0 + chipW + 56, ly = y + rh / 2;
        ctx.save(); ctx.strokeStyle = css(C.lime, 0.8); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lerp(lx0, lx1, lk), ly); ctx.stroke();
        if (lk > 0.9) { ctx.beginPath(); ctx.arc(lx1, ly, 7, 0, TAU); ctx.fillStyle = C.lime; ctx.fill(); }
        ctx.restore();
        const rv = E.outCubic(p(t, ts + 0.3, ts + 0.75));
        if (rv > 0) {
          const tx = cap.listaTx, w = Math.max(...it._l.map((l) => tw(l, DISPLAY, S, 800))), n = it._l.length;
          const yb = (j) => ly + 17 + (j - (n - 1) / 2) * 54;
          ctx.save(); ctx.beginPath(); ctx.rect(tx - 4, y - 10, (w + 12) * rv, rh + 20); ctx.clip();
          it._l.forEach((l, j) => txt(ctx, l, tx, yb(j), { size: S, weight: 800, color: C.white, box: rv >= 1 ? `significado ${it.t}${n > 1 ? ', linha ' + (j + 1) : ''}` : null }));
          ctx.restore();
          // o brilho que passa no fim
          const sw = p(t, ev.sweep + i * 0.12, ev.sweep + 0.6 + i * 0.12);
          if (sw > 0 && sw < 1) {
            const gx = lerp(tx - 120, tx + w + 120, sw), g = ctx.createLinearGradient(gx - 80, 0, gx + 80, 0);
            g.addColorStop(0, css(C.lime, 0)); g.addColorStop(0.5, css(C.lime, 0.45)); g.addColorStop(1, css(C.lime, 0));
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(tx - 10, y + 10, w + 20, rh - 20); ctx.restore();
          }
        }
      });
    },
  };

  // ---- fecho: a pergunta num balão grande (com o título fixo e a notinha fechada ao lado); nos últimos 3 s, a logo
  CENAS.fecho = {
    setup(cap) {
      const d = cap.diagrama, ev = cap.ev;
      ev.balao = at(cap, d.pergunta.em, cap.t0 + 1.2);
      // a fase da logo: a passagem limão entra em (fim − 3,35 s) e a logo pousa, com a sineta, em (fim − 3,05 s)
      ev.wipe = cap.t1 - 3.35; ev.pousa = cap.t1 - 3.05;
      const inner = L.x1 - L.x0 - 2 * 46;
      cap.pergS = fitSize(d.pergunta.linhas.map(plain), DISPLAY, 800, inner, 66);
      Object.assign(FECHO, {
        wipe: ev.wipe, pousa: ev.pousa, sino: ev.pousa, ultima: ev.pousa,
        texto_de: Math.max(ev.balao + 0.5, NOTA.rasga + 0.75, cap.t0 + 0.65, ...cap.apoios.map((a) => a.t + 0.34)), texto_ate: ev.wipe,
      });
      cue(ev.balao, 'slide'); cue(NOTA.rasga, 'tear'); cue(ev.wipe, 'logowipe', { d: 0.3 }); cue(ev.pousa, 'bell');
    },
    draw(ctx, cap, t) {
      const d = cap.diagrama, ev = cap.ev, S = cap.pergS;
      const n = d.pergunta.linhas.length, lh = S * 1.13;
      const bx = L.x0, bw = L.x1 - L.x0, by = 862, bh = 104 + n * lh + 40;
      enter(ctx, ent(t, ev.balao, 0.5), bx + bw / 2, by + bh / 2, () => {
        // o balão de comentário, com o bico embaixo à esquerda
        ctx.save();
        rr(ctx, bx, by, bw, bh, 34);
        ctx.moveTo(bx + 70, by + bh); ctx.lineTo(bx + 76, by + bh + 46); ctx.lineTo(bx + 132, by + bh);
        const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#1B1F18'); g.addColorStop(1, '#121411');
        ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.lime, 0.55); ctx.stroke();
        ctx.restore();
        // vivo sem mexer no texto: uma luz limão corre pela borda do balão e alguém está "digitando…" no canto
        ctx.save(); rr(ctx, bx, by, bw, bh, 34); ctx.setLineDash([220, 2 * (bw + bh)]); ctx.lineDashOffset = -(t - ev.balao) * 520;
        ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.strokeStyle = C.lime; ctx.shadowColor = css(C.lime, 0.9); ctx.shadowBlur = 22; ctx.stroke(); ctx.restore();
        for (let i = 0; i < 3; i++) {
          const ph = (t - ev.balao) * 5 - i * 0.7, up = Math.max(0, Math.sin(ph));
          ctx.beginPath(); ctx.arc(bx + bw - 118 + i * 30, by + 66 - 9 * up, 8, 0, TAU); ctx.fillStyle = css(C.lime, 0.35 + 0.65 * up); ctx.fill();
        }
        icon(ctx, 'comentar', bx + 70, by + 66, 46, C.lime, { lw: 2.2, fill: css(C.lime, 0.12) });
        d.pergunta.linhas.forEach((l, i) => {
          let x = bx + 46; const y = by + 104 + 0.78 * S + i * lh;
          runs(l, C.white).forEach((r) => { x += txt(ctx, r.s, x, y, { size: S, weight: 800, color: r.c, ls: -0.01 * S }); });
          BOX(`pergunta, linha ${i + 1}`, bx + 46, y - 0.76 * S, x, y + 0.22 * S);
        });
        BOX('balão da pergunta', bx, by, bx + bw, by + bh + 46);
      });
    },
  };
  // a logo final (os últimos 3 s): a logo oficial centralizada, "FAZLO Hospeda" e o @, com a sineta
  function fimLogo(ctx, t) {
    const F = FECHO, D = 320, cy = 742;
    const e = E.outBack(p(t, F.wipe + 0.05, F.pousa), 1.8);
    const bt = t - F.sino;
    const g0 = ctx.createRadialGradient(540, cy, 0, 540, cy, 620);
    g0.addColorStop(0, css(C.lime, 0.15 * clamp(e))); g0.addColorStop(1, css(C.lime, 0));
    ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    // o anel da sineta: sai da logo e some antes de chegar no nome
    if (bt >= 0) { const ru = p(bt, 0, 0.7); if (ru < 1) { ctx.beginPath(); ctx.arc(540, cy, lerp(D * 0.52, 225, E.outExpo(ru)), 0, TAU); ctx.strokeStyle = css(C.lime, 0.9 * (1 - ru)); ctx.lineWidth = 7 * (1 - ru) + 1; ctx.stroke(); } }
    ctx.save(); ctx.globalAlpha *= clamp(e * 2);
    logo(ctx, 540, cy, D * lerp(0.6, 1, e));
    ctx.restore();
    BOX('logo final', 540 - D / 2, cy - D / 2, 540 + D / 2, cy + D / 2);
    const NS = 96, w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.4), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.4), nx = 540 - (w1 + w2) / 2;
    const pin = E.outExpo(p(t, F.wipe + 0.05, F.pousa)), ny = 1052;
    ctx.save(); ctx.beginPath(); ctx.rect(60, ny - 100, 960, 130); ctx.clip();
    txt(ctx, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900, color: C.white, ls: -2.4 });
    txt(ctx, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime, ls: -2.4 });
    ctx.restore();
    BOX('nome final', nx, ny - 0.76 * NS, nx + w1 + w2, ny + 0.22 * NS);
    const hw = txt(ctx, LN.marca, 540, 1128, { fam: MONO, size: 34, weight: 700, color: C.gray, align: 'center', ls: 1, alpha: E.outCubic(p(t, F.wipe + 0.1, F.pousa)) });
    BOX('@ final', 540 - hw / 2, 1100, 540 + hw / 2, 1136);
  }

  // =====================================================================
  // O QUADRO
  // =====================================================================
  function drawChap(ctx, cap, t) {
    const tipo = cap.diagrama.tipo;
    OFF = { dx: 0, dy: 0, n: cap.n };
    if (tipo !== 'capa') header(ctx, cap, t);
    CENAS[tipo].draw(ctx, cap, t);
    drawApoio(ctx, cap, t);
  }
  const AREA = { x0: 0, x1: W, y0: 380, y1: 1470 };       // o que a passagem varre (a notinha e a marca ficam por cima)
  function cena(ctx, t) {
    // o capítulo (ou a troca), a notinha e a marca
    const w = where(t);
    if (!w.trans) drawChap(ctx, CAPS[w.k], t);
    else passagem(ctx, w.u, AREA, () => drawChap(ctx, CAPS[w.k], t), () => drawChap(ctx, CAPS[w.k + 1], t));
    OFF = { dx: 0, dy: 0, n: -1 };
    drawNota(ctx, t);
    brand(ctx);
  }
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowColor = 'transparent';
    background(ctx, t);
    ctx.save();
    // nada passa pela coluna de botões do Reels
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(BTN.x, BTN.y0, W - BTN.x, BTN.y1 - BTN.y0); ctx.clip('evenodd');
    if (t < FECHO.wipe) cena(ctx, t);
    else if (t < FECHO.wipe + 0.3) passagem(ctx, p(t, FECHO.wipe, FECHO.wipe + 0.3), { x0: 0, x1: W, y0: 0, y1: H }, () => cena(ctx, t), () => { OFF = { dx: 0, dy: 0, n: NC - 1 }; fimLogo(ctx, t); });
    else { OFF = { dx: 0, dy: 0, n: NC - 1 }; fimLogo(ctx, t); }
    ctx.restore();
    OFF = { dx: 0, dy: 0, n: -1 };
  }
  function renderAt(ctx, t) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    frame(ctx, clamp(t, 0, DUR - 1e-4));
  }

  // =====================================================================
  // INÍCIO
  // =====================================================================
  function init(img, linha) {
    LOGO = img; LN = linha; DUR = linha.duracao; TR = linha.tr; CUES = [];
    M = document.createElement('canvas').getContext('2d');
    CAPS = linha.capitulos.map((c) => ({ ...c, ev: {} }));
    NC = CAPS.length;
    if (CAPS[NC - 1].diagrama.tipo !== 'fecho') throw new Error('o último capítulo deve ser o fecho');
    NOTA = buildNota();
    CAPS.forEach((cap, k) => {
      if (!CENAS[cap.diagrama.tipo]) throw new Error('tipo de diagrama desconhecido: ' + cap.diagrama.tipo);
      if (cap.diagrama.tipo !== 'capa') layoutTitulo(cap);
      if (cap.risca_titulo) cap.riscaT = at(cap, cap.risca_titulo.em, cap.t1 - 0.9);
      CENAS[cap.diagrama.tipo].setup(cap, k);
      if (k > 0) { cue(CAPS[k - 1].t1, 'trans', { d: TR, k }); cue(cap.t0 - 0.2, 'chaveiro', { k }); cue(cap.t0 + 0.02, 'title'); }
      if (cap.riscaT !== undefined) cue(cap.riscaT, 'strike');
      cap.apoios.forEach((a, i) => { if (k > 0 || i > 0) cue(a.t, 'apoio'); });
    });
    // a notinha: a impressora entra, cada linha impressa, cada check carimbado, o "CONTA FECHADA" e o rasgo
    cue(NOTA.entra, 'printerin');
    NOTA.ents.forEach((e) => { cue(e.t, 'print', { d: e.d, big: e.tipo === 'fim' }); if (e.check !== undefined) cue(e.check, 'stamp'); });
    CUES.sort((a, b) => a.t - b.t);
  }

  function caixas(ctx, t) {
    BOXES = [];
    frame(ctx, t);
    const out = BOXES; BOXES = null;
    return out;
  }

  window.EXPLICA = {
    init, renderAt, W, H,
    get DURATION() { return DUR; },
    cues: () => ({ duration: DUR, capitulos: CAPS.map((c) => ({ n: c.n, rotulo: c.rotulo, tipo: c.diagrama.tipo, t0: c.t0, t1: c.t1, voz_t0: c.voz_t0, voz_t1: c.voz_t1, ev: c.ev })), cues: CUES.map((c) => ({ ...c, t: Math.round(c.t * 1e4) / 1e4 })) }),
    apoios: () => CAPS.flatMap((c) => c.apoios.map((a, i) => ({ cap: c.n, i: i + 1, texto: plain(a.texto), entra: a.t, inteira_de: a.t + 0.34, ate: c.n === NC - 1 && !c.apoios[i + 1] ? FECHO.wipe : (c.apoios[i + 1] ? c.apoios[i + 1].t : a.ate) }))),
    fecho: () => ({ ultima_mudanca_de_texto: FECHO.ultima, duracao: DUR, texto_de: FECHO.texto_de, texto_ate: FECHO.texto_ate, logo_passagem: FECHO.wipe, logo_pousa: FECHO.pousa, sineta: FECHO.sino }),
    notinha: () => ({ entra: NOTA.entra, rasga: NOTA.rasga, linhas: NOTA.ents.map((e) => ({ tipo: e.tipo, cap: e.k ?? null, texto: e.tipo === 'item' ? `${e.num} · ${e.lines.join(' ')}` : e.tipo === 'topo' ? 'CONTA' : 'CONTA FECHADA ✓', imprime: e.t, check: e.check ?? null })) }),
    medidas: () => ({ area_util: [L.x0, L.x1], cartao_credito: { largura: CARTAO.CW, altura: CARTAO.CH, mono_px: CARTAO.mono, valor_px: CARTAO.valor, sub_px: CARTAO.sub } }),
    trocas: () => CAPS.slice(0, -1).map((c, k) => ({ de: k, para: k + 1, t0: c.t1, t1: CAPS[k + 1].t0 })),
    caixas,
    montagens: () => CAPS.map((c) => {
      const ts = Object.values(c.ev).flat().flatMap((v) => (typeof v === 'number' ? [v] : typeof v === 'object' && v ? Object.values(v).filter((x) => typeof x === 'number') : [])).filter((x) => x >= c.t0 - 0.5 && x <= c.t1 + 0.5);
      return { n: c.n, t0: c.t0, t1: c.t1, primeira: ts.length ? Math.min(...ts) : c.t0, ultima: ts.length ? Math.max(...ts) : c.t1 };
    }),
  };
})();
