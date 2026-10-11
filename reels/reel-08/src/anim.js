/* =====================================================================
   FAZLO Hospeda — REEL 08 "Você fechou a recepção. O celular, não." — 9:16
   Pilar ROTINA. Motor em Canvas 2D, determinístico: renderAt(ctx, t)
   desenha o quadro exato do instante t (s).

   Relógio de plantão: um relógio digital gigante avança de 23:00 a 23:59.
   A cada salto de minuto chega a mensagem de um hóspede, num card; os
   cards se empilham embaixo do relógio e os mais antigos sobem e se
   comprimem, dando a sensação de acúmulo. Às 23:59 o chip "+37 NÃO LIDAS"
   é carimbado em cima da pilha. Fica o convite para mandar o vídeo a quem
   responde hóspede às 23h, com a logo pequena.

   Sem telas, celulares ou interface de app: só cards soltos sobre o preto.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920, FPS = 60;
  const DURATION = 16.0;
  const MSG_T = [2.6, 3.8, 5.0, 6.2, 7.4, 8.6, 9.8];          // uma mensagem a cada 1,2 s
  const T = {
    hook: 0, buzz: 0.8, rise: 1.6, clock: 2.0, stamp: 11.0, exit: 12.6, msg: 12.9, logo: 13.5, fade: 15.6,
  };
  const ROLL = 0.3;                                            // os minutos giram até o próximo horário
  const STAMP_FALL = 0.15;

  const DISPLAY = "'R8 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'R8 Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#050505', card: '#161616', border: '#3A3A3A', lime: '#AFFA27', limeL: '#D8FF8A',
    white: '#FFFFFF', gray: '#B9B9B1', grayM: '#8E8E88', ink: '#0A0A0A',
  };

  // as mensagens, exatamente como no roteiro
  const MSGS = [
    { min: 2, name: 'CARLA', text: 'Oi! Tem vaga pra amanhã?' },
    { min: 9, name: 'RODRIGO', text: 'Aceita cachorro?' },
    { min: 15, name: 'NÚMERO NOVO', text: 'Qual o valor pra 2 noites?' },
    { min: 22, name: 'JULIANA', text: 'O café da manhã tá incluso?' },
    { min: 31, name: 'RODRIGO', text: 'Faz por 200 no Pix?' },
    { min: 44, name: 'CARLA', text: 'Áudio · 4:12', audio: true },
    { min: 58, name: 'NÚMERO NOVO', text: 'Oi??', shake: true },
  ];

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
  const hx = (c) => (typeof c === 'string' ? hex(c) : c);
  const mixA = (a, b, t) => { a = hx(a); b = hx(b); t = clamp(t); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
  const css = (a, al = 1) => { a = hx(a); return `rgba(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])},${clamp(al)})`; };
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
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, 'left', ls); return ctx.measureText(s).width; }
  function txt(ctx, s, x, y, o) {
    setFont(ctx, o.fam || MONO, o.size, o.weight || 800, o.align || 'left', o.ls || 0);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.fillStyle = o.color; ctx.fillText(s, x, y);
    ctx.restore();
  }
  // linha de título que sobe por trás de uma máscara
  function riseLine(ctx, s, color, x, y, pin, o) {
    if (pin <= 0) return;
    const size = o.size, weight = o.weight || 900, ls = o.ls ?? -0.03 * size;
    const w = tw(ctx, s, DISPLAY, size, weight, ls);
    const off = (1 - E.outExpo(clamp(pin))) * size * 1.3;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - w / 2 - 60, y - size * 1.05, w + 120, size * 1.4); ctx.clip();
    setFont(ctx, DISPLAY, size, weight, 'left', ls); ctx.fillStyle = color; ctx.fillText(s, x - w / 2, y + off);
    ctx.restore();
  }

  let LOGO = null;
  function logo(ctx, x, y, d, alpha = 1) {
    if (d <= 1 || alpha <= 0.001) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, x - d / 2, y - d / 2, d, d);
    ctx.restore();
  }

  // =====================================================================
  // LAYOUT (ver README: tamanhos e áreas seguras)
  // =====================================================================
  // título de abertura: 3 linhas em 124 px, bloco centrado em y = 940 e x = 530 (a 3ª linha termina em x ≈ 916,
  // fora da coluna de botões do Reels); depois vira cabeçalho (39%, centro em y = 338)
  const HOOK = { size: 124, base: [842, 971, 1100], cy: 940, cx: 530, headCy: 338, headS: 0.39 };
  const HOOK_LINES = [['Você fechou', C.white], ['a recepção.', C.white], ['O celular, não.', C.lime]];
  // relógio: 270 px, base em y = 650 (casas de largura fixa para os dígitos)
  const CLOCK = { size: 270, base: 650, cx: 540 };
  let SLOT = 170, COLON = 70;
  // cards: 860 x 156 (x 80–940); o mais novo com o topo em y = 1300
  const CARD = { x: 80, w: 860, h: 156, r: 28 };
  const SLOT_Y = [1300, 1128, 962, 926, 890, 854, 818, 782];   // topo do card em cada casa da pilha (0 = mais novo)
  const SLOT_S = [1, 1, 0.95, 0.9, 0.86, 0.82, 0.79, 0.76];     // escala em cada casa

  // ---------------------------------------------------------------- relógio
  // eventos de minuto: [instante, minuto]; antes de cada mensagem os minutos giram até o horário dela
  const MIN_EV = [[T.clock, 0]];
  (function () {
    let prev = 0;
    MSGS.forEach((m, k) => {
      const n = m.min - prev;
      for (let i = 1; i <= n; i++) MIN_EV.push([MSG_T[k] - ROLL + ROLL * i / n, prev + i]);
      prev = m.min;
    });
    MIN_EV.push([T.stamp, 59]);
  })();
  function minuteState(t) {
    let i = 0;
    while (i + 1 < MIN_EV.length && MIN_EV[i + 1][0] <= t + 1e-6) i++;
    const [te, m] = MIN_EV[i], prev = i > 0 ? MIN_EV[i - 1][1] : m;
    const next = i + 1 < MIN_EV.length ? MIN_EV[i + 1][0] : Infinity;
    const dur = Math.min(0.09, (next - te) * 0.9);
    return { m, prev, u: p(t, te, te + dur) };
  }
  function clock(ctx, t) {
    if (t < T.clock) return;
    const exitY = -820 * E.inCubic(p(t, T.exit, T.exit + 0.4));
    if (exitY < -800) return;
    const { m, prev, u } = minuteState(t);
    const digits = ['2', '3', String(Math.floor(m / 10)), String(m % 10)];
    const pd = ['2', '3', String(Math.floor(prev / 10)), String(prev % 10)];
    // pisca em 23:59 (branco <-> limão) e dá um pulo com o carimbo
    const blink = t >= T.stamp && t < T.exit ? Math.floor((t - T.stamp) / 0.2) % 2 === 0 : false;
    const col = blink ? C.lime : C.white;
    const bump = 1 + 0.06 * kick(t, T.stamp, 0.3);
    const size = CLOCK.size, total = 4 * SLOT + COLON, x0 = CLOCK.cx - total / 2;
    const xs = [x0, x0 + SLOT, x0 + 2 * SLOT + COLON, x0 + 3 * SLOT + COLON];
    ctx.save();
    ctx.translate(CLOCK.cx, CLOCK.base - size * 0.36 + exitY); ctx.scale(bump, bump); ctx.translate(-CLOCK.cx, -(CLOCK.base - size * 0.36));
    if (blink) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, CLOCK.cx, CLOCK.base - size * 0.36, 520, C.lime, 0.12); ctx.restore(); }
    const top = CLOCK.base - size * 0.78, hgt = size * 0.92;
    for (let i = 0; i < 4; i++) {
      // entrada: os dígitos sobem por trás de uma máscara, em sequência
      const pin = E.outExpo(p(t, T.clock + i * 0.06, T.clock + i * 0.06 + 0.42));
      ctx.save();
      ctx.beginPath(); ctx.rect(xs[i] - 10, top, SLOT + 20, hgt); ctx.clip();
      setFont(ctx, DISPLAY, size, 900, 'center', -0.02 * size); ctx.fillStyle = col;
      const cx = xs[i] + SLOT / 2, enter = (1 - pin) * size;
      if (digits[i] !== pd[i] && u < 1) {
        const e = E.outCubic(u);
        ctx.fillText(pd[i], cx, CLOCK.base - e * size * 0.95 + enter);
        ctx.fillText(digits[i], cx, CLOCK.base + (1 - e) * size * 0.95 + enter);
      } else ctx.fillText(digits[i], cx, CLOCK.base + enter);
      ctx.restore();
    }
    // os dois pontos piscam no ritmo de um segundo
    const colonOn = (t - T.clock) % 1 < 0.5 || blink;
    const ca = p(t, T.clock + 0.1, T.clock + 0.35) * (colonOn ? 1 : 0.18);
    const cx = x0 + 2 * SLOT + COLON / 2;
    ctx.fillStyle = css(col, ca);
    rr(ctx, cx - 15, CLOCK.base - size * 0.56, 30, 30, 6); ctx.fill();
    rr(ctx, cx - 15, CLOCK.base - size * 0.16, 30, 30, 6); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- título e cabeçalho
  function hook(ctx, t) {
    const exitY = -820 * E.inCubic(p(t, T.exit, T.exit + 0.4));
    if (exitY < -800) return;
    const e = E.inOutCubic(p(t, T.rise, T.rise + 0.5));
    const push = 1 + 0.03 * p(t, 0, T.rise);
    const sc = lerp(push, HOOK.headS, e), cy = lerp(HOOK.cy, HOOK.headCy, e);
    ctx.save();
    ctx.translate(lerp(HOOK.cx, W / 2, e), cy + exitY); ctx.scale(sc, sc); ctx.translate(-W / 2, -HOOK.cy);
    HOOK_LINES.forEach(([s, col], i) => {
      ctx.save();
      if (i === 2) {
        // "O celular, não." vibra como um aparelho em cima da mesa
        const u = p(t, T.buzz, T.buzz + 0.32), env = Math.sin(Math.PI * u);
        if (u > 0 && u < 1) {
          ctx.translate(W / 2 + 7 * env * Math.sin(TAU * 38 * (t - T.buzz)), HOOK.base[i]);
          ctx.rotate(0.6 * DEG * env * Math.sin(TAU * 31 * (t - T.buzz) + 1));
          ctx.translate(-W / 2, -HOOK.base[i]);
        }
      }
      txt(ctx, s, W / 2, HOOK.base[i], { fam: DISPLAY, size: HOOK.size, weight: 900, color: col, align: 'center', ls: -0.03 * HOOK.size });
      ctx.restore();
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- os cards
  function mic(ctx, x, y, s, color) {
    // microfone desenhado em vetor (cápsula, suporte em U, haste e base)
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = s * 0.11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    rr(ctx, -s * 0.17, -s * 0.5, s * 0.34, s * 0.62, s * 0.17); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -s * 0.06, s * 0.3, 0.05 * Math.PI, 0.95 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, s * 0.24); ctx.lineTo(0, s * 0.42); ctx.moveTo(-s * 0.16, s * 0.44); ctx.lineTo(s * 0.16, s * 0.44); ctx.stroke();
    ctx.restore();
  }
  function cardBody(ctx, k, t, dim) {
    const m = MSGS[k], x = CARD.x, y = 0, w = CARD.w, h = CARD.h;
    rr(ctx, x, y, w, h, CARD.r); ctx.fillStyle = C.card; ctx.fill();
    ctx.strokeStyle = C.border; ctx.lineWidth = 2; ctx.stroke();
    // ponto limão (pulsa na chegada)
    const pulse = p(t, MSG_T[k], MSG_T[k] + 0.6);
    if (pulse > 0 && pulse < 1) { ctx.strokeStyle = css(C.lime, 0.7 * (1 - pulse)); ctx.lineWidth = 3; circle(ctx, x + 44, y + 47, 9 + 26 * E.outCubic(pulse)); ctx.stroke(); }
    circle(ctx, x + 44, y + 47, 9); ctx.fillStyle = C.lime; ctx.fill();
    txt(ctx, m.name, x + 70, y + 58, { size: 30, weight: 800, color: C.gray, ls: 2 });
    txt(ctx, `23:${String(m.min).padStart(2, '0')}`, x + w - 40, y + 58, { size: 28, weight: 700, color: C.grayM, align: 'right', ls: 1 });
    if (m.audio) {
      mic(ctx, x + 62, y + 108, 46, C.lime);
      txt(ctx, m.text, x + 104, y + 124, { fam: DISPLAY, size: 46, weight: 700, color: C.white, ls: -0.46 });
    } else {
      txt(ctx, m.text, x + 40, y + 124, { fam: DISPLAY, size: 46, weight: 700, color: C.white, ls: -0.46 });
    }
    if (dim > 0.005) { rr(ctx, x, y, w, h, CARD.r); ctx.fillStyle = css(C.bg, dim); ctx.fill(); }
  }
  // casa (contínua) de cada card na pilha: quantas mensagens já chegaram depois dele, com mola
  function slotOf(k, t) {
    let s = 0;
    for (let j = k + 1; j < MSGS.length; j++) s += E.outBack(p(t, MSG_T[j], MSG_T[j] + 0.45), 1.3);
    return s;
  }
  const atSlot = (arr, s) => { const i = clamp(Math.floor(s), 0, arr.length - 2), f = s - i; return lerp(arr[i], arr[i + 1], f); };
  function pileJolt(t) {
    const x = t - T.stamp;
    return x < 0 ? 0 : 18 * (1 - Math.exp(-x / 0.012)) * Math.exp(-x / 0.1) * Math.cos(TAU * 6 * x);
  }
  function cards(ctx, t) {
    const jolt = pileJolt(t);
    const order = [];
    for (let k = 0; k < MSGS.length; k++) if (t >= MSG_T[k]) order.push(k);
    // os mais antigos (mais ao fundo) primeiro
    order.forEach((k) => {
      const s = slotOf(k, t);
      const inP = p(t, MSG_T[k], MSG_T[k] + 0.4), inE = E.outBack(inP, 1.4);
      let y = atSlot(SLOT_Y, s) + (1 - inE) * 150 + jolt * (1 - 0.08 * s);
      let sc = atSlot(SLOT_S, s) * lerp(0.96, 1, inE);
      const dim = clamp((s - 1.4) * 0.2, 0, 0.62);
      let dx = 0, rot = 0;
      if (MSGS[k].shake) {
        const x = t - (MSG_T[k] + 0.18);
        if (x > 0 && x < 0.4) dx = 9 * Math.sin(TAU * 21 * x) * Math.sin(Math.PI * x / 0.4);
      }
      // saída: os cards caem pela parte de baixo, em cascata (os mais novos primeiro)
      const ex = p(t, T.exit + 0.035 * Math.min(6, s), T.exit + 0.035 * Math.min(6, s) + 0.42);
      if (ex > 0) { y += 1500 * E.inCubic(ex); rot = (hash(k, 7) - 0.5) * 14 * DEG * ex; }
      if (y > H + 40) return;
      ctx.save();
      ctx.globalAlpha = p(inP, 0, 0.35);
      ctx.translate(CARD.x + CARD.w / 2 + dx, y + CARD.h / 2); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-(CARD.x + CARD.w / 2), -CARD.h / 2);
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      rr(ctx, CARD.x, 0, CARD.w, CARD.h, CARD.r); ctx.fillStyle = C.card; ctx.fill();
      ctx.shadowColor = 'transparent';
      cardBody(ctx, k, t, dim);
      ctx.restore();
    });
  }
  // "+37 NÃO LIDAS": carimbado em limão em cima da pilha
  let CHIP_W = 520;
  function stampChip(ctx, t) {
    const t0 = T.stamp - STAMP_FALL;
    if (t < t0) return;
    const u = p(t, t0, T.stamp), x = t - T.stamp, e = E.inCubic(u);
    let sc = lerp(1.6, 1, e);
    if (x >= 0) sc = 1 - 0.05 * Math.exp(-x / 0.05) * Math.cos(x * 60);
    const ex = p(t, T.exit, T.exit + 0.42);
    const cx = 500, cy = 1046 + pileJolt(t) + 1500 * E.inCubic(ex), h = 112;
    ctx.save();
    ctx.globalAlpha = p(u, 0, 0.35);
    ctx.translate(cx, cy); ctx.rotate(lerp(-9, -4, e) * DEG + 6 * DEG * ex); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40 * (1 - e) + 24; ctx.shadowOffsetY = 18 * (1 - e) + 8;
    rr(ctx, -CHIP_W / 2, -h / 2, CHIP_W, h, h / 2); ctx.fillStyle = C.lime; ctx.fill();
    ctx.shadowColor = 'transparent';
    txt(ctx, '+37 NÃO LIDAS', 0, 20, { size: 56, weight: 800, color: C.ink, align: 'center', ls: 1 });
    ctx.restore();
    if (x >= 0 && x < 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx, cy, 420, C.lime, 0.22 * kick(t, T.stamp, 0.4)); ctx.restore(); }
  }

  // ---------------------------------------------------------------- encerramento
  const FINAL = [['Manda pra quem', C.white, 858], ['responde hóspede', C.white, 966], ['às 23h.', C.lime, 1074]];
  function closing(ctx, t) {
    if (t < T.msg) return;
    const drift = 1 + 0.014 * E.inOutSine(p(t, T.msg + 0.4, DURATION));
    ctx.save(); ctx.translate(W / 2, 1040); ctx.scale(drift, drift); ctx.translate(-W / 2, -1040);
    FINAL.forEach(([s, col, y], i) => riseLine(ctx, s, col, W / 2, y, p(t, T.msg + i * 0.07, T.msg + i * 0.07 + 0.3), { size: 100 }));
    const a = p(t, T.logo, T.logo + 0.12);
    if (a > 0) {
      const D = 112, gap = 20, ww = tw(ctx, 'FAZLO Hospeda', DISPLAY, 42, 900, -1), total = D + gap + ww, x0 = W / 2 - total / 2, cy = 1260;
      const s = lerp(0.8, 1, E.outBack(p(t, T.logo, T.logo + 0.32), 2.4));
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(W / 2, cy); ctx.scale(s, s); ctx.translate(-W / 2, -cy);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x0 + D / 2, cy, D * 1.15, C.lime, 0.1 + 0.3 * kick(t, T.logo, 0.6)); ctx.restore();
      logo(ctx, x0 + D / 2, cy, D);
      txt(ctx, 'FAZLO Hospeda', x0 + D + gap, cy + 15, { fam: DISPLAY, size: 42, weight: 900, color: C.white, ls: -1 });
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- quadro
  function background(ctx, t) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 1000, 0, 540, 1000, 1150);
    g.addColorStop(0, '#121311'); g.addColorStop(0.55, '#0A0B0A'); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // a luz limão cresce com o acúmulo de mensagens
    let n = 0;
    MSG_T.forEach((m) => { n += p(t, m, m + 0.4); });
    const on = (n / MSGS.length) * (1 - p(t, T.exit, T.exit + 0.5));
    if (on > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 540, 1250, 700, C.lime, 0.05 * on); ctx.restore(); }
  }
  function shake(t) {
    const x = t - T.stamp;
    if (x < 0 || x > 0.4) return [0, 0];
    const a = 7 * (1 - Math.exp(-x / 0.01)) * Math.exp(-x / 0.08);
    return [a * Math.sin(TAU * 23 * x + 0.6), a * (0.5 * Math.cos(TAU * 29 * x) + 0.3)];
  }
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    background(ctx, t);
    const [sx, sy] = shake(t);
    ctx.save(); ctx.translate(sx, sy);
    cards(ctx, t);
    stampChip(ctx, t);
    clock(ctx, t);
    hook(ctx, t);
    closing(ctx, t);
    ctx.restore();
    const f = E.inOutSine(p(t, T.fade, DURATION));
    if (f > 0) { ctx.fillStyle = css('#000000', f); ctx.fillRect(0, 0, W, H); }
  }

  // motion blur por subamostragem nas passagens rápidas (nunca nos saltos do relógio)
  const FAST = [[T.rise, T.rise + 0.5, 8, 1 / 60]]
    .concat(MSG_T.map((m) => [m, m + 0.4, 4, 1 / 120]))
    .concat([[T.stamp - STAMP_FALL, T.stamp + 0.3, 8, 1 / 60], [T.exit, T.exit + 0.7, 10, 1 / 50], [T.logo, T.logo + 0.32, 6, 1 / 60]]);
  function shutterSpec(t) {
    for (const [a, b, k, dt] of FAST) if (t >= a && t < b) return { k, dt };
    return { k: 1 };
  }
  let bufS = null, bufA = null;
  function renderAt(ctx, t, o = {}) {
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) { ctx.canvas.width = W; ctx.canvas.height = H; }
    t = clamp(t, 0, DURATION - 1e-4);
    const sh = o.noBlur ? { k: 1 } : shutterSpec(t);
    if (sh.k <= 1) { frame(ctx, t); return; }
    if (!bufS) { const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }; bufS = mk(); bufA = mk(); }
    const sctx = bufS.getContext('2d'), actx = bufA.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0); actx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < sh.k; k++) {
      frame(sctx, clamp(t + (k / (sh.k - 1) - 0.5) * sh.dt, 0, DURATION - 1e-4));
      actx.globalAlpha = 1 / (k + 1); actx.drawImage(bufS, 0, 0);
    }
    actx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bufA, 0, 0);
  }

  // ---------------------------------------------------------------- cues de som
  const CUES = [];
  const cue = (t, type, o = {}) => CUES.push(Object.assign({ t: Math.round(t * 1e4) / 1e4, type }, o));
  function buildCues() {
    CUES.length = 0;
    cue(T.hook, 'hook');
    cue(T.buzz, 'buzz', { d: 0.32 });
    cue(T.rise, 'rise', { d: 0.5 });
    cue(T.clock, 'clock', { d: 0.42 });
    MSG_T.forEach((m, k) => cue(m, 'ping', { k, double: MSGS[k].shake ? 1 : 0 }));
    cue(T.stamp - STAMP_FALL, 'stampfall', { d: STAMP_FALL });
    cue(T.stamp, 'stamp');
    cue(T.exit, 'exit', { d: 0.5 });
    cue(T.msg, 'msg');
    cue(T.logo, 'logo');
    cue(T.fade, 'fade', { d: DURATION - T.fade });
    CUES.sort((a, b) => a.t - b.t);
  }

  function init(img) {
    LOGO = img;
    const m = document.createElement('canvas').getContext('2d');
    SLOT = Math.max(...'0123456789'.split('').map((d) => tw(m, d, DISPLAY, CLOCK.size, 900))) * 0.98;
    COLON = CLOCK.size * 0.26;
    CHIP_W = tw(m, '+37 NÃO LIDAS', MONO, 56, 800, 1) + 84;
    buildCues();
  }

  window.REEL08 = {
    init, renderAt, DURATION, W, H,
    cues: () => ({ duration: DURATION, sections: Object.assign({}, T, { msgs: MSG_T }), cues: CUES.slice() }),
  };
})();
