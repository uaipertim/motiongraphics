/* =====================================================================
   FAZLO Hospeda — REEL 07 "O feriado acabou. Agora começa a conta." — 9:16
   Pilar ROTINA. Motor em Canvas 2D, determinístico: renderAt(ctx, t)
   desenha o quadro exato do instante t (s).

   A conferência do pós-feriado vira uma notinha de caixa sendo impressa.
   Papel térmico branco sobe de uma fenda; cada linha é uma dúvida da rotina
   de quem administra uma pousada, e a pergunta do fim da linha é digitada em
   verde-limão, num bloco impresso em negativo. No fim, o TOTAL é carimbado
   ("???"), a notinha leva um tranco, é arrancada e sai de cena. Fica o
   convite para mandar o vídeo a quem fecha a conta, com a logo pequena.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920, FPS = 60;
  const BPM = 100, BT = 60 / BPM;                // pulso interno: tempos em 0,2 + 0,6·k
  const DURATION = 14.0;
  const T = {
    hook: 0, cut: 0.8, rise: 1.8, slot: 2.0, lead: 2.3,
    l1: 2.6, l2: 4.4, l3: 6.2, l4: 8.0, rule: 9.8, stamp: 10.4, tear: 11.5, msg: 12.0, logo: 12.6, fade: 13.6,
  };
  const LINE_T = [T.l1, T.l2, T.l3, T.l4];
  const FEED_D = 0.35;
  const TYPE_DELAY = BT;                         // a pergunta é digitada um tempo depois da linha sair
  const KEY_DT = BT / 8;                         // 75 ms por letra
  const STAMP_FALL = 0.18;

  const DISPLAY = "'R7 Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'R7 Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#050505', ink: '#121212', inkDots: '#8F8E87', paper: '#F3F2EC', lime: '#AFFA27', limeL: '#D8FF8A',
    white: '#FFFFFF',
  };

  // o conteúdo da notinha, exatamente como no roteiro
  const LINES = [
    'SINAL DO CHALÉ 2 ...... caiu?',
    'PIX DO QUARTO 4 ....... de quem?',
    'COMANDA DA PISCINA .... fechou?',
    'DIÁRIA EXTRA DOMINGO .. anotou?',
  ];
  const TOTAL_S = 'TOTAL ............ ???';

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

  // ---------------------------------------------------------------- primitivas 2D
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
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.blur ?? 24; }
    ctx.fillStyle = o.color; ctx.fillText(s, x, y);
    ctx.restore();
  }
  // linha de título que sobe por trás de uma máscara
  function riseLine(ctx, s, color, x, y, pin, o) {
    if (pin <= 0) return;
    const size = o.size, weight = o.weight || 900, ls = o.ls ?? -2;
    const w = tw(ctx, s, DISPLAY, size, weight, ls);
    const off = (1 - E.outExpo(clamp(pin))) * size * 1.3;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - w / 2 - 60, y - size * 1.05, w + 120, size * 1.4); ctx.clip();
    setFont(ctx, DISPLAY, size, weight, 'left', ls); ctx.fillStyle = color; ctx.fillText(s, x - w / 2, y + off);
    ctx.restore();
  }

  // ---------------------------------------------------------------- logo (imagem fornecida, sem alteração)
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
  // gancho: 3 linhas em 104 px, bloco centrado em y = 960; depois vira cabeçalho (60%, centro em y = 372)
  const HOOK = { size: 104, ls: -2, base: [881, 993, 1105], solo: 998, cy: 960, headCy: 372, headS: 0.66 };
  const HOOK_LINES = [['O feriado acabou.', C.white], ['Agora começa', C.lime], ['a conta.', C.lime]];

  // a notinha: papel de 910 px (x 43–953), centrado em x = 498 para o texto (x 76–920) e os blocos ficarem longe dos botões do Reels
  const PCX = 498, PW = 910, PX0 = PCX - PW / 2, PX1 = PCX + PW / 2;
  const SY = 1380;                                   // a fenda da impressora
  const SLOT_CX = 540;
  const FS = 44, FS_T = 56;                          // corpo das linhas e do total
  const COLS = 32;                                   // a linha mais longa tem 32 caracteres
  // posições no papel (v = distância a partir da borda de cima)
  const V = { rule1: 58, line0: 136, pitch: 116, rule2: 578, total: 676, end: 772 };
  // alimentação do papel: [início, duração, comprimento antes, depois]
  const FEEDS = [[T.lead, 0.25, 0, 88], [T.l1, FEED_D, 88, 196], [T.l2, FEED_D, 196, 312], [T.l3, FEED_D, 312, 428],
    [T.l4, FEED_D, 428, 544], [T.rule, FEED_D, 544, V.end]];

  let CW = 26.4, TX0 = 75.6, CW_T = 33.6, TW_T = 739;
  let PARSED = [], TP = null, KEYS = [], STAMP_POLY = [], HOLES = [], SPECKS = [], PAPER_CANVAS = null, WORD_W = 300;

  // separa "RÓTULO", " ...... " e "pergunta?" pelas colunas da fonte monoespaçada
  function parse(s) {
    const c1 = s.indexOf(' .'), c2 = s.lastIndexOf('. ') + 2;
    return { label: s.slice(0, c1), dots: s.slice(c1, c2), q: s.slice(c2), c1, c2 };
  }

  // ---------------------------------------------------------------- tempo do papel
  function feedL(t) {
    let L = 0;
    for (const [a, d, f0, f1] of FEEDS) if (t >= a) L = lerp(f0, f1, E.inOutSine(p(t, a, a + d)));
    return L;
  }
  function feeding(t) {
    for (const [a, d] of FEEDS) if (t >= a && t < a + d) return Math.sin(Math.PI * (t - a) / d);
    return 0;
  }
  function paperFrame(t) {
    const L = feedL(t);
    let rot = 0, dy = 0;
    // o papel inclina durante a alimentação e balança de leve depois (pivô na fenda)
    for (const [a, d] of FEEDS) {
      if (t >= a && t < a + d) rot -= 0.0028 * Math.sin(Math.PI * (t - a) / d);
      const x = t - (a + d);
      if (x > 0 && x < 2.5) rot += 0.0042 * Math.sin(TAU * 1.25 * x) * Math.exp(-x / 0.5);
    }
    // o tranco do carimbo: o papel é empurrado para dentro da fenda e volta
    const xs = t - T.stamp;
    if (xs >= 0) {
      dy += 18 * (1 - Math.exp(-xs / 0.01)) * Math.exp(-xs / 0.1) * Math.cos(TAU * 6 * xs);
      rot += 0.012 * Math.exp(-xs / 0.16) * Math.sin(TAU * 4.5 * xs);
    }
    // arrancada: um puxão rasga o papel na serrilha e ele sobe para fora do quadro
    let ex = 0, ey = 0, er = 0;
    if (t >= T.tear) {
      const u = p(t, T.tear + 0.05, T.tear + 0.47);
      ey = -10 * p(t, T.tear, T.tear + 0.05) - 1950 * Math.pow(u, 2.2);
      ex = 70 * u * u;
      er = 0.12 * u * u;
    }
    return { L, rot, dy, ex, ey, er, torn: t >= T.tear };
  }
  // instantes de cada tecla, presos à grade de quadros (som e imagem no mesmo quadro)
  const keyTime = (i, j) => LINE_T[i] + TYPE_DELAY + Math.round(j * KEY_DT * FPS) / FPS;

  // =====================================================================
  // CENA
  // =====================================================================
  function background(ctx, t) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 1020, 0, 540, 1020, 1150);
    g.addColorStop(0, '#121311'); g.addColorStop(0.55, '#0A0B0A'); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const on = p(t, T.slot, T.slot + 0.6) * (1 - p(t, T.tear, T.tear + 0.6));
    if (on > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, SLOT_CX, SY, 620, C.lime, 0.045 * on); ctx.restore(); }
  }

  // ---------------------------------------------------------------- gancho e cabeçalho
  function hook(ctx, t) {
    const exitY = -760 * E.inCubic(p(t, T.tear + 0.04, T.tear + 0.46));
    if (exitY < -740) return;
    const e = E.inOutCubic(p(t, T.rise, T.rise + 0.45));
    const push = 1 + 0.03 * p(t, T.cut, T.rise);              // depois do corte, o bloco se aproxima devagar
    const sc = lerp(push, HOOK.headS, e), cy = lerp(HOOK.cy, HOOK.headCy, e);
    // o corte seco: a frase em limão entra de uma vez e o bloco leva um tranco
    const jolt = t >= T.cut ? 6 * Math.exp(-(t - T.cut) / 0.06) * Math.cos((t - T.cut) * 55) : 0;
    ctx.save();
    ctx.translate(W / 2, cy + exitY + jolt); ctx.scale(sc, sc); ctx.translate(-W / 2, -HOOK.cy);
    if (t < T.cut) {
      // antes do corte, só a 1ª frase: já visível no 1º quadro, assenta e sobe para o lugar
      const st = E.outCubic(p(t, 0, 0.75));
      ctx.translate(W / 2, lerp(HOOK.solo, HOOK.base[0], st)); ctx.scale(lerp(1.04, 1, st), lerp(1.04, 1, st));
      txt(ctx, HOOK_LINES[0][0], 0, 0, { fam: DISPLAY, size: HOOK.size, weight: 900, color: HOOK_LINES[0][1], align: 'center', ls: HOOK.ls });
    } else {
      HOOK_LINES.forEach(([s, col], i) => txt(ctx, s, W / 2, HOOK.base[i], { fam: DISPLAY, size: HOOK.size, weight: 900, color: col, align: 'center', ls: HOOK.ls }));
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- a impressora (só a frente e a fenda)
  function printerY(t) {
    const inn = E.outCubic(p(t, T.slot - 0.12, T.slot + 0.22));
    const out = E.inCubic(p(t, T.tear + 0.3, T.tear + 0.65));
    const xs = t - T.stamp, bump = xs >= 0 ? 5 * Math.exp(-xs / 0.07) * Math.cos(TAU * 7 * xs) : 0;
    return (1 - inn) * 220 + out * 640 + bump;
  }
  function printer(ctx, t) {
    if (t < T.slot - 0.12) return;
    const py = printerY(t);
    if (py > 600) return;
    const y0 = SY + py;
    const g = ctx.createLinearGradient(0, y0 - 12, 0, y0 + 380);
    g.addColorStop(0, '#20211F'); g.addColorStop(0.18, '#141513'); g.addColorStop(1, '#070707');
    rr(ctx, 24, y0 - 12, W - 48, H - y0 + 80, 36); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(60, y0 - 11, W - 120, 2);
    rr(ctx, 48, y0 - 7, W - 96, 14, 7); ctx.fillStyle = '#000'; ctx.fill();
  }
  // a cabeça térmica: uma linha de luz limão dentro da fenda, mais forte enquanto imprime
  function head(ctx, t) {
    const open = E.outCubic(p(t, T.slot, T.slot + 0.3));
    const off = 1 - p(t, T.tear + 0.1, T.tear + 0.4);
    if (open <= 0 || off <= 0) return;
    const y = SY + printerY(t), hw = 470 * open;
    const lvl = (0.55 + 0.05 * Math.sin(TAU * 1.3 * t) + 0.45 * feeding(t) + 0.6 * kick(t, T.stamp, 0.25)) * off;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(SLOT_CX - hw, 0, SLOT_CX + hw, 0);
    g.addColorStop(0, css(C.lime, 0)); g.addColorStop(0.12, css(C.lime, lvl)); g.addColorStop(0.88, css(C.lime, lvl)); g.addColorStop(1, css(C.lime, 0));
    ctx.fillStyle = g; ctx.fillRect(SLOT_CX - hw, y - 2, 2 * hw, 4);
    ctx.save(); ctx.translate(SLOT_CX, y); ctx.scale(Math.max(0.01, hw / 70), 1);
    glow(ctx, 0, 0, 70, C.lime, 0.22 * lvl);
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- a notinha
  function paperPath(ctx, bottom, torn) {
    const tooth = 18, hT = 9;
    ctx.beginPath(); ctx.moveTo(PX0, hT);
    for (let x = PX0; x < PX1 - 0.5; x += tooth) { ctx.lineTo(x + tooth / 2, 0); ctx.lineTo(x + tooth, hT); }
    ctx.lineTo(PX1, bottom);
    if (torn) for (let x = PX1; x > PX0 + 0.5; x -= tooth) { ctx.lineTo(x - tooth / 2, bottom + hT * (0.6 + 0.8 * hash(x | 0, 9))); ctx.lineTo(x - tooth, bottom); }
    else ctx.lineTo(PX0, bottom);
    ctx.closePath();
  }
  function paper(ctx, t) {
    if (t < T.lead) return;
    const F = paperFrame(t);
    if (F.ey < -2700) return;
    ctx.save();
    if (!F.torn) { ctx.beginPath(); ctx.rect(0, 0, W, SY); ctx.clip(); }
    ctx.translate(PCX, SY); ctx.rotate(F.rot); ctx.translate(0, F.dy); ctx.translate(-PCX, -F.L);
    if (F.torn) { ctx.translate(PCX + F.ex, F.L / 2 + F.ey); ctx.rotate(F.er); ctx.translate(-PCX, -F.L / 2); }
    const bottom = F.torn ? V.end : F.L + 40;
    // sombra/brilho em volta do papel
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 10;
    paperPath(ctx, bottom, F.torn); ctx.fillStyle = C.paper; ctx.fill(); ctx.restore();
    ctx.save();
    paperPath(ctx, bottom, F.torn); ctx.clip();
    ctx.globalAlpha = 0.9; ctx.fillStyle = ctx.createPattern(PAPER_CANVAS, 'repeat'); ctx.fillRect(PX0, 0, PW, bottom + 20); ctx.globalAlpha = 1;
    let g = ctx.createLinearGradient(PX0, 0, PX0 + 22, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(PX0, 0, 22, bottom + 20);
    g = ctx.createLinearGradient(PX1, 0, PX1 - 22, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(PX1 - 22, 0, 22, bottom + 20);
    g = ctx.createLinearGradient(0, 0, 0, 46);
    g.addColorStop(0, 'rgba(0,0,0,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(PX0, 0, PW, 46);
    if (!F.torn) {
      // perto da fenda: sombra da boca da impressora e a luz da cabeça térmica
      g = ctx.createLinearGradient(0, F.L - 80, 0, F.L);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.26)'); ctx.fillStyle = g; ctx.fillRect(PX0, F.L - 80, PW, 80);
      const lv = 0.08 + 0.12 * feeding(t);
      g = ctx.createLinearGradient(0, F.L - 46, 0, F.L);
      g.addColorStop(0, css(C.lime, 0)); g.addColorStop(1, css(C.lime, lv)); ctx.fillStyle = g; ctx.fillRect(PX0, F.L - 46, PW, 46);
    }
    content(ctx, t);
    ctx.restore();
    stamp(ctx, t);
    ctx.restore();
  }
  function dashRow(ctx, v, color) {
    ctx.fillStyle = color;
    for (let k = 0; k < COLS; k++) ctx.fillRect(TX0 + k * CW + CW * 0.2, v - 1.5, CW * 0.6, 3);
  }
  function content(ctx, t) {
    dashRow(ctx, V.rule1, C.inkDots);
    for (let i = 0; i < LINES.length; i++) printLine(ctx, t, i);
    dashRow(ctx, V.rule2 - 6, C.ink); dashRow(ctx, V.rule2 + 6, C.ink);
  }
  function printLine(ctx, t, i) {
    const P = PARSED[i], y = V.line0 + i * V.pitch, base = y + 16;
    setFont(ctx, MONO, FS, 800); ctx.fillStyle = C.ink; ctx.fillText(P.label, TX0, base);
    setFont(ctx, MONO, FS, 700); ctx.fillStyle = C.inkDots; ctx.fillText(P.dots, TX0 + P.c1 * CW, base);
    // a pergunta, digitada em verde-limão num bloco impresso em negativo
    const ks = KEYS[i];
    let n = 0;
    while (n < ks.length && ks[n] <= t + 1e-6) n++;
    if (n === 0) return;
    const tEnd = ks[ks.length - 1];
    const cur = 1 - p(t, tEnd + 0.32, tEnd + 0.44);              // o espaço do cursor se fecha no fim
    const pop = E.outBack(p(t, ks[0], ks[0] + 0.1), 2.2);
    const x0 = TX0 + P.c2 * CW - 11, wch = (n + cur) * CW + 22, hh = 60;
    ctx.save(); ctx.translate(x0, y); ctx.scale(1, lerp(0.3, 1, pop));
    rr(ctx, 0, -hh / 2, wch, hh, 10); ctx.fillStyle = C.ink; ctx.fill();
    setFont(ctx, MONO, FS, 800);
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = css(mixA(C.white, C.lime, p(t, ks[j], ks[j] + 0.12)));
      ctx.fillText(P.q[j], 11 + j * CW, 16);
    }
    const blinkOn = t < tEnd + 0.06 || Math.floor((t - tEnd) / 0.1) % 2 === 1;
    if (cur > 0.02 && blinkOn) { ctx.fillStyle = css(C.lime, 0.95 * cur); ctx.fillRect(11 + n * CW + 3, -20, (CW - 6) * cur, 40); }
    ctx.restore();
  }
  // o carimbo do total: bloco de tinta preta com bordas irregulares, texto vazado e "???" em limão
  function stamp(ctx, t) {
    const t0 = T.stamp - STAMP_FALL;
    if (t < t0) return;
    const u = p(t, t0, T.stamp), x = t - T.stamp, e = E.inCubic(u);
    let sc = lerp(1.45, 1, e);
    const rot = lerp(-8, -2.2, e) * DEG, al = p(u, 0, 0.3);
    if (x >= 0) sc = 1 - 0.035 * Math.exp(-x / 0.05) * Math.cos(x * 70);
    ctx.save(); ctx.translate(PCX, V.total);
    if (x < 0) {
      // a sombra do carimbo chegando
      ctx.save(); ctx.globalAlpha *= 0.35 * al * (0.4 + 0.6 * e);
      ctx.shadowColor = '#000'; ctx.shadowBlur = 8 + 46 * (1 - e); ctx.shadowOffsetX = 10000 + 14 * (1 - e); ctx.shadowOffsetY = 24 * (1 - e);
      ctx.fillStyle = '#000'; ctx.fillRect(-10000 - TW_T / 2 - 30, -50, TW_T + 60, 100);
      ctx.restore();
    }
    ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha *= al;
    ctx.beginPath(); STAMP_POLY.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
    ctx.fillStyle = C.ink; ctx.fill();
    setFont(ctx, MONO, FS_T, 800);
    ctx.fillStyle = C.paper; ctx.fillText(TP.label, -TW_T / 2, 20);
    ctx.fillStyle = '#BDBCB5'; ctx.fillText(TP.dots, -TW_T / 2 + TP.c1 * CW_T, 20);
    ctx.fillStyle = C.lime; ctx.fillText(TP.q, -TW_T / 2 + TP.c2 * CW_T, 20);
    // falhas da tinta
    ctx.fillStyle = C.paper;
    for (const [hx_, hy, r] of HOLES) { circle(ctx, hx_, hy, r); ctx.fill(); }
    // respingos em volta, só depois da batida
    if (x >= 0) {
      ctx.fillStyle = C.ink; ctx.globalAlpha *= p(x, 0, 0.03);
      for (const [sx, sy, r] of SPECKS) { circle(ctx, sx, sy, r); ctx.fill(); }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- encerramento
  function closing(ctx, t) {
    if (t < T.msg) return;
    const drift = 1 + 0.014 * E.inOutSine(p(t, T.msg + 0.4, DURATION));
    ctx.save(); ctx.translate(W / 2, 1040); ctx.scale(drift, drift); ctx.translate(-W / 2, -1040);
    riseLine(ctx, 'Manda pra quem', C.white, W / 2, 930, p(t, T.msg, T.msg + 0.35), { size: 84 });
    riseLine(ctx, 'fecha a conta aí.', C.lime, W / 2, 1030, p(t, T.msg + 0.1, T.msg + 0.45), { size: 84 });
    // a logo, pequena, abaixo
    const a = p(t, T.logo, T.logo + 0.12);
    if (a > 0) {
      const D = 112, gap = 20, total = D + gap + WORD_W, x0 = W / 2 - total / 2, cy = 1196;
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
  function shake(t) {
    const x = t - T.stamp;
    if (x < 0 || x > 0.4) return [0, 0];
    const a = 9 * (1 - Math.exp(-x / 0.01)) * Math.exp(-x / 0.08);   // contínuo: o motion blur não duplica a imagem
    return [a * Math.sin(TAU * 23 * x + 0.6), a * (0.5 * Math.cos(TAU * 29 * x) + 0.3)];
  }
  function frame(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    background(ctx, t);
    const [sx, sy] = shake(t);
    ctx.save(); ctx.translate(sx, sy);
    paper(ctx, t);
    printer(ctx, t);
    head(ctx, t);
    hook(ctx, t);
    closing(ctx, t);
    ctx.restore();
    const fl = 0.07 * kick(t, T.stamp, 0.12);
    if (fl > 0.005) { ctx.fillStyle = css('#FFFFFF', fl); ctx.fillRect(0, 0, W, H); }
    const f = E.inOutSine(p(t, T.fade, DURATION));
    if (f > 0) { ctx.fillStyle = css('#000000', f); ctx.fillRect(0, 0, W, H); }
  }

  // motion blur por subamostragem nas passagens rápidas (nunca no corte seco)
  const FAST = [[T.rise, T.rise + 0.47, 8, 1 / 60], [T.lead, T.lead + 0.25, 4, 1 / 120]]
    .concat(LINE_T.map((a) => [a, a + FEED_D, 4, 1 / 120]))
    .concat([[T.rule, T.rule + FEED_D, 4, 1 / 120], [T.stamp - STAMP_FALL, T.stamp + 0.3, 8, 1 / 60],
      [T.tear, T.tear + 0.6, 10, 1 / 50], [T.msg, T.msg + 0.5, 6, 1 / 60], [T.logo, T.logo + 0.32, 6, 1 / 60]]);
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
    cue(T.cut, 'cut');
    cue(T.rise, 'rise', { d: 0.45 });
    cue(T.slot, 'power', { d: 0.3 });
    FEEDS.forEach(([a, d, f0, f1], k) => cue(a, 'feed', { d, k, amt: f1 - f0 }));
    KEYS.forEach((ks, i) => ks.forEach((tk, j) => cue(tk, 'key', { k: i, i: j, last: j === ks.length - 1 ? 1 : 0, ch: PARSED[i].q[j] })));
    cue(T.stamp - STAMP_FALL, 'stampfall', { d: STAMP_FALL });
    cue(T.stamp, 'stamp');
    cue(T.tear, 'tear');
    cue(T.tear + 0.05, 'fly', { d: 0.42 });
    cue(T.msg, 'msg');
    cue(T.logo, 'logo');
    cue(T.fade, 'fade', { d: DURATION - T.fade });
    CUES.sort((a, b) => a.t - b.t);
  }

  function init(img) {
    LOGO = img;
    const m = document.createElement('canvas').getContext('2d');
    CW = tw(m, '0', MONO, FS, 800);
    TX0 = PCX - (COLS * CW) / 2;
    CW_T = tw(m, '0', MONO, FS_T, 800);
    TW_T = TOTAL_S.length * CW_T;
    WORD_W = tw(m, 'FAZLO Hospeda', DISPLAY, 42, 900, -1);
    PARSED = LINES.map(parse);
    TP = parse(TOTAL_S);
    KEYS = PARSED.map((P, i) => [...P.q].map((_, j) => keyTime(i, j)));
    // contorno irregular do carimbo e falhas da tinta (sementes fixas)
    const bw = TW_T / 2 + 30, bh = 50;
    STAMP_POLY = [];
    const edge = (x0, y0, x1, y1, seed) => {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 7));
      for (let k = 0; k < n; k++) {
        const u = k / n, j = (hash(k, seed) - 0.5) * 3.2;
        const nx = y1 - y0, ny = x0 - x1, l = Math.hypot(nx, ny);
        STAMP_POLY.push([lerp(x0, x1, u) + (nx / l) * j, lerp(y0, y1, u) + (ny / l) * j]);
      }
    };
    edge(-bw, -bh, bw, -bh, 11); edge(bw, -bh, bw, bh, 12); edge(bw, bh, -bw, bh, 13); edge(-bw, bh, -bw, -bh, 14);
    HOLES = [];
    for (let k = 0; k < 140; k++) {
      const hx_ = (hash(k, 21) - 0.5) * 2 * bw, hy = (hash(k, 22) - 0.5) * 2 * bh;
      const edgeNear = Math.min(bw - Math.abs(hx_), bh - Math.abs(hy));
      if (edgeNear < 11) HOLES.push([hx_, hy, 0.8 + 1.6 * hash(k, 23)]);       // falhas só perto da borda: não se confundem com os pontos
    }
    SPECKS = [];
    for (let k = 0; k < 26; k++) {
      const side = hash(k, 31), along = (hash(k, 32) - 0.5) * 2, out = 8 + 26 * hash(k, 33);
      const sx = side < 0.5 ? along * bw : Math.sign(along || 1) * (bw + out);
      const sy = side < 0.5 ? Math.sign(hash(k, 34) - 0.5) * (bh + out * 0.6) : (hash(k, 35) - 0.5) * 2 * bh;
      SPECKS.push([sx, sy, 1 + 2.4 * hash(k, 36)]);
    }
    // fibras do papel térmico
    PAPER_CANVAS = document.createElement('canvas'); PAPER_CANVAS.width = PAPER_CANVAS.height = 256;
    const g = PAPER_CANVAS.getContext('2d');
    for (let k = 0; k < 1400; k++) {
      g.fillStyle = `rgba(110,106,96,${0.025 + 0.05 * hash(k, 5)})`;
      g.fillRect(hash(k, 3) * 256, hash(k, 4) * 256, 1 + 3 * hash(k, 6), 1);
    }
    buildCues();
  }

  window.REEL07 = {
    init, renderAt, DURATION, W, H,
    cues: () => ({ bpm: BPM, duration: DURATION, sections: Object.assign({}, T, { lines: LINE_T }), cues: CUES.slice() }),
  };
})();
