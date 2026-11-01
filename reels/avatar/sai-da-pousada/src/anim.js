/*
 * FAZLO Hospeda — Reel avatar "Saí da pousada por duas horas", V2 da camada de motion (1080×1920, 30 fps; linha.json).
 *
 * A página desenha o QUADRO INTEIRO: o quadro-base (midia/quadros/NNNN.jpg, já com a conversa aplicada na tela do
 * celular do P2 por scripts/base.py) + a camada de motion por cima. Assim os cartões de vidro desfocam o que está
 * atrás deles de verdade, a imagem treme nas vibrações e, no P4, a personagem recortada (midia/recorte-p4) fica NA
 * FRENTE dos cartões.
 *
 * Linguagem: interface de celular moderna, genérica ("Mensagens", remetente "Recepção", avatar "R"); cartões de vidro
 * fosco escuros com desfoque do fundo, sombra suave e borda de 1 px clara; Inter pequena e espaçada; limão só como
 * acento. Mola suave com leve overshoot; o que é antigo recua, desfoca e escurece. Um elemento novo por vez.
 *
 *   P1  quadro 0 já em ação: notificação desce, a imagem treme · relógio "14:20" no alto · mais duas notificações em
 *       ~1,2 s (cada uma com tremor) · as de baixo recuam e viram "3 notificações".
 *   P2  (a conversa está dentro da tela, em perspectiva: scripts/base.py) · relógio → 14:21.
 *   P3  notificação de vidro ao lado do rosto · ≥ 1,5 s depois, outras empilham atrás e viram "+6" · relógio → 14:23 → 14:31.
 *   P4  em "essas respostas" as perguntas voltam como cartões de vidro ATRÁS da cabeça, em camadas com parallax; em
 *       "aqui" se fecham num ponto de luz limão atrás da cabeça, que some antes do corte.
 *   P5  só a legenda durante a fala; ~1 s depois, sobe o cartão de envio (avião de papel, texto, logo, "Enviar" com pressão).
 * Legenda palavra por palavra (Inter Display 900, 76 px), branca com sombra difusa, sem faixa; chaves em limão.
 */
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', sans-serif", TEXT = "'FL Text', sans-serif";
  const C = { lime: '#B5FF2E', white: '#FFFFFF', gray: 'rgba(235,238,240,0.62)', ink: '#0B0C0D' };
  const CAP = { size: 76, lh: 84, y1: 1426, maxW: 860, cx: 520, minPag: 1.2, segura: 0.7 };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3), inCubic: (x) => x * x * x, inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2, outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    mola: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-7.5 * x) * Math.cos(8.2 * x)),   // mola suave: ~4 % de overshoot
  };
  const TAU = Math.PI * 2;
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));
  let M, LOGO, LN, EV, PL, FRAME = null, MASK = null, BOXES = null, PAGES = [], OFF, OFF2, SHK = { x: 0, y: 0, s: 1 };
  const BOX = (nome, x0, y0, x1, y1, extra) => { if (BOXES) BOXES.push({ nome, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1), ...(extra || {}) }); };
  function setFont(c, fam, size, weight, ls = 0) { c.font = `${weight} ${size}px ${fam}`; c.letterSpacing = `${ls}px`; }
  function tw(s, fam, size, weight, ls = 0) { setFont(M, fam, size, weight, ls); return M.measureText(s).width - (s.length ? ls : 0); }
  function txt(c, s, x, y, o = {}) {
    const fam = o.fam || TEXT, size = o.size || 30, weight = o.weight || 600, ls = o.ls ?? 0.2;
    const w = tw(s, fam, size, weight, ls), x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    c.save(); setFont(c, fam, size, weight, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.globalAlpha *= o.alpha ?? 1; c.fillStyle = o.color || C.white; c.fillText(s, x0, y);
    if (o.papel && BOXES && c.globalAlpha > 0.9) { const m = c.getTransform(); BOX('texto', m.a * x0 + m.e, m.d * (y - size * 0.75) + m.f, m.a * (x0 + w) + m.e, m.d * y + m.f, { papel: o.papel, size: size * m.d, txt: s, base: m.d * y + m.f }); }
    c.restore();
    return w;
  }
  function quebra(s, fam, size, weight, maxW, ls = 0.2) {
    const out = []; let cur = '';
    for (const w of s.split(' ')) { const t2 = cur ? cur + ' ' + w : w; if (tw(t2, fam, size, weight, ls) > maxW && cur) { out.push(cur); cur = w; } else cur = t2; }
    if (cur) out.push(cur); return out;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
  const plano = (t) => PL.find((q) => t >= q.t0 - 1e-6 && t < q.t1 - 1e-6) || PL[PL.length - 1];

  // ---------------------------------------------------------------- o quadro-base (com o tremor das vibrações)
  function tremor(t) {
    let a = 0;
    for (const t0 of EV.tremor) { const u = (t - t0) / 0.2; if (u >= 0 && u < 1) a = Math.max(a, (t0 === 0 ? 3 : 2) * (1 - u)); }
    // tremor de 2–3 px (≈ 60 Hz de motor, amostrado a 30 fps: alterna de lado a cada quadro)
    const k = Math.round(t * 30);
    return { x: a * (k % 2 ? 1 : -1) * 0.9, y: a * (k % 3 === 0 ? 0.5 : -0.5), s: a > 0 ? 1.006 : 1 };
  }
  function base(c, filtro) {
    c.save(); if (filtro) c.filter = filtro;
    c.translate(W / 2 + SHK.x, H / 2 + SHK.y); c.scale(SHK.s, SHK.s); c.drawImage(FRAME, -W / 2, -H / 2, W, H);
    c.restore();
  }

  // ---------------------------------------------------------------- vidro fosco
  function vidro(c, x, y, w, h, r, o = {}) {
    const a = o.alpha ?? 1;
    if (a <= 0.001) return;
    c.save(); c.globalAlpha *= a;
    // sombra suave: só fora do cartão (o vidro fica limpo)
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.roundRect(x, y, w, h, r); c.clip('evenodd');
    c.shadowColor = `rgba(0,0,0,${o.sombra ?? 0.38})`; c.shadowBlur = o.sombraBlur ?? 46; c.shadowOffsetY = o.sombraY ?? 16;
    rr(c, x, y, w, h, r); c.fillStyle = '#000'; c.fill(); c.restore();
    // o fundo de verdade, desfocado e um pouco mais escuro e saturado
    c.save(); rr(c, x, y, w, h, r); c.clip();
    if (FRAME) base(c, `blur(${o.blur ?? 26}px) saturate(1.35) brightness(${o.brilho ?? 0.78})`);
    c.fillStyle = o.tinta || 'rgba(14,16,18,0.50)'; c.fillRect(x, y, w, h);
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.45, 'rgba(255,255,255,0.02)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.restore();
    rr(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r - 0.75); c.strokeStyle = `rgba(255,255,255,${o.borda ?? 0.2})`; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }
  function avatarR(c, cx, cy, r, o = {}) {
    const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#3A4046'); g.addColorStop(1, '#1C2024');
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1.2; c.stroke();
    txt(c, 'R', cx, cy + r * 0.36, { fam: TEXT, size: r * 1.0, weight: 700, align: 'center', ls: 0 });
    if (o.ponto) { c.beginPath(); c.arc(cx + r * 0.72, cy - r * 0.72, r * 0.24, 0, TAU); c.fillStyle = C.lime; c.fill(); c.strokeStyle = 'rgba(14,16,18,0.9)'; c.lineWidth = 3; c.stroke(); }
  }
  // a notificação de vidro (genérica): avatar R, "Recepção", "agora", a mensagem. V3: corpo 40 px, remetente/horário 28 px
  const NT = { corpo: 40, meta: 28, padX: 28, padT: 26, padB: 24, av: 36, lh: 1.27 };
  function notificacao(c, x, y, w, msg, o = {}) {
    const sz = o.size || NT.corpo, tx = x + NT.padX + NT.av * 2 + 22, maxW = x + w - NT.padX - tx;
    const linhas = quebra(msg, TEXT, sz, 500, maxW), topoCorpo = NT.padT + NT.meta * 1.25 + 4;
    const h = topoCorpo + linhas.length * sz * NT.lh + NT.padB;
    if (o.medir) return h;
    const papel = o.semTexto ? null : (o.papel ?? 'corpo');
    vidro(c, x, y, w, h, 34, o);
    c.save(); c.globalAlpha *= o.alpha ?? 1;
    avatarR(c, x + NT.padX + NT.av, y + NT.padT + NT.av + 2, NT.av, { ponto: !o.lida });
    txt(c, 'Recepção', tx, y + NT.padT + NT.meta, { size: NT.meta, weight: 700, ls: 0.2, papel: papel && 'meta' });
    txt(c, o.quando || 'agora', x + w - NT.padX, y + NT.padT + NT.meta, { size: NT.meta, weight: 500, color: C.gray, align: 'right', ls: 0.3, papel: papel && 'meta' });
    linhas.forEach((s, i) => txt(c, s, tx, y + topoCorpo + sz * 0.98 + i * sz * NT.lh, { size: sz, weight: 500, color: 'rgba(255,255,255,0.96)', ls: 0, papel }));
    c.restore();
    if ((o.alpha ?? 1) > 0.5 && !o.semCaixa) BOX(o.nome || 'notificacao', x, y, x + w, y + h, { txt: msg });
    return h;
  }
  function pilula(c, s, cx, y, o = {}) {                         // pílula de vidro com texto de 30 px (os contadores)
    const sz = 30, w = Math.max(o.minW || 0, tw(s, TEXT, sz, 600, 0.3) + 52), h = 60, x = cx - w / 2;
    vidro(c, x, y, w, h, 30, { alpha: o.alpha ?? 1, blur: 20, sombra: 0.28 });
    c.save(); c.globalAlpha *= o.alpha ?? 1;
    if (o.ponto) { c.beginPath(); c.arc(x + 30, y + h / 2, 7, 0, TAU); c.fillStyle = C.lime; c.fill(); }
    txt(c, s, cx + (o.ponto ? 10 : 0), y + h / 2 + sz * 0.36, { size: sz, weight: 600, align: 'center', ls: 0.3, color: 'rgba(255,255,255,0.95)', papel: 'contador' });
    c.restore();
    return { x, w, h };
  }
  function desfocado(c, f, blur, alpha = 1) {            // desenha f(c2) numa camada e põe com desfoque (profundidade)
    const o = OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H); o.filter = 'none'; o.globalAlpha = 1;
    f(o);
    c.save(); c.globalAlpha *= alpha; if (blur > 0.2) c.filter = `blur(${blur}px)`; c.drawImage(OFF, 0, 0); c.restore();
  }

  // ---------------------------------------------------------------- relógio de vidro (no alto, ao centro): os dígitos rolam
  function relogio(c, t) {
    const R = EV.relogio; if (t < R[0][0] || t >= EV.relogio_sai) return;
    let i = 0; for (let k = 0; k < R.length; k++) if (t >= R[k][0]) i = k;
    const e = E.mola(p(t, R[0][0], R[0][0] + 0.5)), w = 196, h = 64, x = 540 - w / 2, y = 218 - (1 - e) * 14;
    vidro(c, x, y, w, h, 32, { alpha: clamp(e * 2), blur: 22, sombra: 0.3 });
    c.save(); c.globalAlpha *= clamp(e * 2);
    c.beginPath(); c.arc(x + 34, y + h / 2, 6, 0, TAU); c.fillStyle = C.lime; c.fill();
    const g = c.createRadialGradient(x + 34, y + h / 2, 0, x + 34, y + h / 2, 18); g.addColorStop(0, 'rgba(181,255,46,0.35)'); g.addColorStop(1, 'rgba(181,255,46,0)'); c.fillStyle = g; c.fillRect(x + 14, y + 12, 40, 40);
    const novo = R[i][1], velho = i > 0 ? R[i - 1][1] : novo, u = i > 0 ? E.outCubic(p(t, R[i][0], R[i][0] + 0.32)) : 1;
    const sz = 34, x0 = x + 58;
    c.save(); rr(c, x + 50, y + 6, w - 60, h - 12, 10); c.clip();
    // rola só os dígitos que mudam ("14:2|0" → "14:2|1")
    let xx = x0;
    for (let k = 0; k < novo.length; k++) {
      const ch = novo[k], cv = velho[k] || ch, dw = tw(ch, DISPLAY, sz, 800, 0.5);
      if (ch !== cv && u < 1) { txt(c, cv, xx, y + 45 - u * 40, { fam: DISPLAY, size: sz, weight: 800, alpha: 1 - u, ls: 0.5 }); txt(c, ch, xx, y + 45 + (1 - u) * 40, { fam: DISPLAY, size: sz, weight: 800, alpha: u, ls: 0.5 }); }
      else txt(c, ch, xx, y + 45, { fam: DISPLAY, size: sz, weight: 800, ls: 0.5 });
      xx += dw + 0.5;
    }
    c.restore(); c.restore();
    BOX('relogio', x, y, x + w, y + h);
  }

  // ---------------------------------------------------------------- P1: o gancho
  // V4: uma notificação legível por vez. Cada nova cai no mesmo lugar; a anterior recua para uma borda atrás (pilha do
  // iOS: menor, mais escura, desfocada, só a beirada aparecendo embaixo) e a pílula conta o total.
  const P1 = { x: 50, w: 900, y: 820, size: 40 };
  function p1(c, t) {
    const N = EV.notificacoes, n = N.filter((q) => t >= q[0]).length;
    if (!n) return;
    const h = notificacao(c, 0, 0, P1.w, N[1][1], { medir: true }), cx = P1.x + P1.w / 2;
    for (let i = 0; i < n; i++) {
      const [t0_, msg] = N[i], t0 = i === 0 ? t0_ - 0.45 : t0_;            // a 1ª já chega pousada no quadro 0 (o gancho)
      const ent = E.mola(p(t, t0 + (i ? 0.1 : 0), t0 + (i ? 0.1 : 0) + 0.55));
      // quanto esta já recuou (cada notificação nova empurra as anteriores um nível para trás)
      let recuo = 0; for (let j = i + 1; j < n; j++) recuo += E.inOutCubic(p(t, N[j][0], N[j][0] + 0.4));
      const nivel = Math.min(recuo, 2);
      const yy = P1.y - (1 - ent) * 110 + 16 * nivel, s = 1 - 0.05 * nivel, alpha = clamp(p(t, t0 + (i ? 0.1 : 0), t0 + (i ? 0.1 : 0) + 0.18));
      const novaChegando = i + 1 < n ? clamp(p(t, N[i + 1][0], N[i + 1][0] + 0.12)) : 0;   // o texto antigo some antes do novo aparecer
      if (recuo >= 2.99) continue;                                     // a 3ª para trás some atrás das outras
      const f = (cc) => { cc.translate(cx, yy + h); cc.scale(s, s); cc.translate(-cx, -(yy + h));
        notificacao(cc, P1.x, yy, P1.w, msg, { alpha, brilho: 0.78 - 0.16 * Math.min(nivel, 1), lida: nivel > 0.5, semCaixa: true, semTexto: nivel > 0.02, tinta: nivel > 0.5 ? 'rgba(14,16,18,0.7)' : undefined }); };
      if (nivel > 0.05) {
        // atrás: o texto some (fica só a borda do cartão), desfocado
        desfocado(c, (cc) => { cc.translate(cx, yy + h); cc.scale(s, s); cc.translate(-cx, -(yy + h)); vidro(cc, P1.x, yy, P1.w, h, 34, { alpha, brilho: 0.6, sombra: 0.2, tinta: 'rgba(14,16,18,0.7)' }); }, 4 * Math.min(nivel, 1), 1);
        if (novaChegando < 1) { c.save(); c.globalAlpha *= 1 - novaChegando; f(c); c.restore(); }
      } else { c.save(); f(c); c.restore(); if (alpha > 0.5 && ent > 0.85) BOX('notificacao', P1.x, yy, P1.x + P1.w, yy + h, { txt: msg }); }
    }
    // a pílula do total (a partir da 2ª)
    if (n >= 2) {
      const tk = N[n - 1][0], k = E.mola(p(t, N[1][0], N[1][0] + 0.45)), pulso = 1 + 0.08 * kick(t, tk, 0.25);
      const y = P1.y + h + 52 - (1 - k) * 14, s = `${n} notificações`, pcx = P1.x + 170;
      c.save(); c.translate(pcx, y + 30); c.scale(pulso, pulso); c.translate(-pcx, -(y + 30));
      const pl = pilula(c, s, pcx, y, { alpha: clamp(k * 2), ponto: true, minW: tw('3 notificações', TEXT, 30, 600, 0.3) + 80 });
      c.restore();
      if (k > 0.9) BOX('contador', pl.x, y, pl.x + pl.w, y + pl.h);
    }
  }

  // ---------------------------------------------------------------- P2: a tela do chat (desenhada plana; base.py põe na tela em perspectiva)
  const TELA = { w: 600, h: 1272 };
  const RESP = 'Na gaveta da recepção, a azul.';
  const TECLADO = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  function digitado(t) {                                          // quantos caracteres da resposta já estão no campo
    const D = EV.digitar, tot = D.reduce((a, [x, y]) => a + (y - x), 0); let feito = 0;
    for (const [x, y] of D) feito += clamp(t - x, 0, y - x);
    return Math.round(RESP.length * feito / tot);
  }
  function telaP2(c, t) {
    const w = TELA.w, h = TELA.h, INK = '#121416', CINZA = '#6B7178';
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h); c.filter = 'none'; c.globalAlpha = 1;
    c.save();                                                      // retângulo cheio: quem recorta é o branco da tela real
    c.fillStyle = '#F3F4F6'; c.fillRect(0, 0, w, h);
    // barra de status
    txt(c, t >= EV.chat_chega ? '14:21' : '14:20', 56, 58, { size: 26, weight: 700, ls: 0.3, color: INK });
    c.save(); c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 2.2;
    rr(c, w - 98, 38, 44, 22, 6); c.stroke(); c.fillRect(w - 94, 42, 30, 14); c.fillRect(w - 52, 45, 3, 8);
    for (let k = 0; k < 4; k++) c.fillRect(w - 160 + k * 9, 56 - 5 - k * 4, 6, 5 + k * 4);
    c.restore();
    // cabeçalho
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 80, w, 112); c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, 191, w, 1.5);
    c.save(); c.strokeStyle = INK; c.lineWidth = 3.4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(48, 118); c.lineTo(34, 134); c.lineTo(48, 150); c.stroke(); c.restore();
    avatarR(c, 100, 134, 30);
    txt(c, 'Recepção', 146, 128, { size: 30, weight: 700, ls: 0.2, color: INK });
    c.beginPath(); c.arc(152, 150, 5, 0, TAU); c.fillStyle = '#5BA300'; c.fill();
    txt(c, 'online', 164, 158, { size: 21, weight: 500, color: CINZA, ls: 0.5 });
    txt(c, 'Hoje', w / 2, 236, { size: 20, weight: 600, color: '#9AA0A6', align: 'center', ls: 1.2 });
    // mensagens (acima do teclado; sobem quando a resposta é enviada)
    const SZ = 32, LH = 40, maxW = 400, K0 = 700;                 // K0: topo do campo de digitar
    const chega = E.mola(p(t, EV.chat_chega, EV.chat_chega + 0.5)), env = E.mola(p(t, EV.chat_envia, EV.chat_envia + 0.45));
    const msgs = [{ lado: 'e', txt: 'O casal do chalé 3 chegou. Qual chave eu entrego?', u: chega }];
    if (env > 0) msgs.push({ lado: 'd', txt: RESP, u: env, lido: p(t, EV.chat_lido, EV.chat_lido + 0.2) });
    const alt = (m) => quebra(m.txt, TEXT, SZ, 500, maxW).length * LH + 58;
    let tot = 0; msgs.forEach((m) => { tot += (alt(m) + 14) * clamp(m.u * 1.4); });
    let y = K0 - 20 - tot;
    msgs.forEach((m) => {
      const hh = alt(m), u = m.u; if (u <= 0.001) return;
      const ls = quebra(m.txt, TEXT, SZ, 500, maxW), bw = Math.max(...ls.map((x) => tw(x, TEXT, SZ, 500))) + 46, bx = m.lado === 'e' ? 30 : w - 30 - bw;
      c.save(); c.globalAlpha *= clamp(u * 2);
      const ox = m.lado === 'e' ? bx : bx + bw, oy = y + hh; c.translate(ox, oy); c.scale(lerp(0.75, 1, u), lerp(0.75, 1, u)); c.translate(-ox, -oy);
      rr(c, bx, y, bw, hh, 28); c.fillStyle = m.lado === 'e' ? '#E3E6EA' : '#D9F7A0'; c.fill();
      ls.forEach((x, k) => txt(c, x, bx + 23, y + 44 + k * LH, { size: SZ, weight: 500, color: INK, ls: 0 }));
      txt(c, '14:21', bx + bw - 20 - (m.lado === 'd' ? 32 : 0), y + hh - 14, { size: 18, weight: 500, color: CINZA, align: 'right', ls: 0.3 });
      if (m.lado === 'd') {
        c.save(); c.strokeStyle = m.lido > 0 ? '#4C8A00' : CINZA; c.lineWidth = 2.6; c.lineCap = 'round'; c.lineJoin = 'round';
        const cx = bx + bw - 44, cy = y + hh - 22;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 6, cy + 6); c.lineTo(cx + 17, cy - 6); c.stroke();
        if (m.lido > 0) { c.globalAlpha *= m.lido; c.beginPath(); c.moveTo(cx + 9, cy + 6); c.lineTo(cx + 26, cy - 6); c.stroke(); }
        c.restore();
      }
      c.restore();
      y += (hh + 14) * clamp(u * 1.4);
    });
    // o campo de digitar: o texto dela aparece aos poucos (some quando é enviado)
    c.fillStyle = '#FFFFFF'; c.fillRect(0, K0, w, 86); c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, K0, w, 1.5);
    rr(c, 22, K0 + 14, w - 110, 58, 29); c.fillStyle = '#F0F1F3'; c.fill();
    const n = t < EV.chat_envia ? digitado(t) : 0, campo = RESP.slice(0, n);
    c.save(); rr(c, 22, K0 + 14, w - 110, 58, 29); c.clip();
    const tw_ = tw(campo, TEXT, 26, 500), tx0 = Math.min(44, w - 110 - 16 - tw_);
    if (n > 0) txt(c, campo, tx0, K0 + 52, { size: 26, weight: 500, color: INK, ls: 0 });
    else txt(c, 'Mensagem', 44, K0 + 52, { size: 26, weight: 500, color: '#A0A5AB' });
    if (n > 0 && Math.floor(t * 2.2) % 2 === 0) { c.fillStyle = '#4C8A00'; c.fillRect(tx0 + tw_ + 3, K0 + 28, 2.5, 30); }
    c.restore();
    c.beginPath(); c.arc(w - 50, K0 + 43, 27, 0, TAU); c.fillStyle = n > 0 ? '#9BE01F' : '#DADDE1'; c.fill();
    aviao(c, w - 51, K0 + 44, 0.85, n > 0 ? INK : '#FFFFFF');
    // o teclado claro: as teclas acendem no ritmo dos polegares (teclas do lado de cada polegar)
    const KY = K0 + 86; c.fillStyle = '#D5D8DD'; c.fillRect(0, KY, w, h - KY);
    const kw = (w - 20) / 10, kh = 86, gap = 8;
    const prox = EV.teclas.filter(([tt0]) => t >= tt0 && t < tt0 + 0.14);
    TECLADO.forEach((linha, r) => {
      const off = r === 0 ? 10 : r === 1 ? 10 + kw / 2 : 10 + kw * 1.5;
      [...linha].forEach((ch, i) => {
        const x = off + i * kw + gap / 2, yy = KY + 16 + r * (kh + 14);
        const lado = x + kw / 2 < w / 2 ? 'e' : 'd';
        // a tecla da próxima letra digitada acende quando o polegar daquele lado toca
        const alvo = RESP[Math.max(0, digitado(t) - 1)]?.toLowerCase(), aceso = prox.some(([, l]) => l === lado) && ch === alvo;
        rr(c, x, yy, kw - gap, kh, 10); c.fillStyle = aceso ? '#E9FBC4' : '#FFFFFF'; c.fill();
        if (aceso) { c.strokeStyle = 'rgba(91,163,0,0.5)'; c.lineWidth = 2; c.stroke(); }
        txt(c, ch, x + (kw - gap) / 2, yy + kh / 2 + 11, { size: 30, weight: 500, color: INK, align: 'center', ls: 0 });
      });
    });
    const by = KY + 16 + 3 * (kh + 14), bAceso = prox.length && RESP[Math.max(0, digitado(t) - 1)] === ' ';
    rr(c, 10 + kw * 2.5 + gap / 2, by, kw * 5 - gap, kh, 10); c.fillStyle = bAceso ? '#E9FBC4' : '#FFFFFF'; c.fill();
    txt(c, 'espaço', w / 2, by + kh / 2 + 9, { size: 24, weight: 500, color: CINZA, align: 'center' });
    rr(c, 14, by, kw * 2.3, kh, 10); c.fillStyle = '#B9BEC5'; c.fill(); txt(c, '123', 14 + kw * 1.15, by + kh / 2 + 9, { size: 24, weight: 600, color: INK, align: 'center' });
    rr(c, w - 14 - kw * 2.3, by, kw * 2.3, kh, 10); c.fillStyle = '#B9BEC5'; c.fill(); txt(c, 'enviar', w - 14 - kw * 1.15, by + kh / 2 + 9, { size: 22, weight: 600, color: INK, align: 'center' });
    c.restore();
  }
  // P2: a notificação de vidro grande ao lado do celular (a leitura fica aqui)
  function p2(c, t) {
    const t0 = EV.p2_notif, e = E.mola(p(t, t0, t0 + 0.55));
    if (e <= 0) return;
    const x = 40, w = 1000, y = 300 - (1 - e) * 90;
    notificacao(c, x, y, w, 'O casal do chalé 3 chegou. Qual chave eu entrego?', { alpha: clamp(p(t, t0, t0 + 0.18)), nome: 'notificacao-p2', semCaixa: e < 0.95 });
  }

  // ---------------------------------------------------------------- P3: a notificação ao lado do rosto e o "+6"
  const P3 = { x: 470, w: 570, y: 884 };
  function p3(c, t) {
    const t0 = EV.p3_notif, e = E.mola(p(t, t0, t0 + 0.55));
    if (e <= 0) return;
    const msg = 'Quanto eu cobro do pessoal que está saindo?', h = notificacao(c, 0, 0, P3.w, msg, { medir: true });
    const yy = P3.y + (1 - e) * 60, cx = P3.x + P3.w / 2;
    // a pilha (como no iOS): duas bordas de cartões atrás, aparecendo embaixo da notificação
    const pil = E.mola(p(t, EV.p3_pilha, EV.p3_pilha + 0.5));
    for (let k = 2; k >= 1; k--) {
      const u = clamp(pil * 1.2 - (k - 1) * 0.2), s = 1 - 0.05 * k, yk = yy + 15 * k * u;
      if (u <= 0) continue;
      c.save(); c.translate(cx, yk + h); c.scale(s, s); c.translate(-cx, -(yk + h));
      vidro(c, P3.x, yk, P3.w, h, 34, { alpha: 0.95 * clamp(u * 2), brilho: 0.6 - 0.05 * k, sombra: 0.22, tinta: 'rgba(14,16,18,0.6)' });
      c.restore();
    }
    c.save(); c.translate(cx, yy + h / 2); c.scale(lerp(0.9, 1, e), lerp(0.9, 1, e)); c.translate(-cx, -(yy + h / 2));
    notificacao(c, P3.x, yy, P3.w, msg, { alpha: clamp(p(t, t0, t0 + 0.2)), semCaixa: true, papel: e > 0.95 ? 'corpo' : null });
    c.restore();
    if (e > 0.95) BOX('notificacao-p3', P3.x, P3.y, P3.x + P3.w, P3.y + h, { txt: msg });
    // a pílula "+N mensagens" embaixo: conta de 1 a 6 com um leve pulso em cada número
    if (t >= EV.p3_pilha) {
      const C6 = EV.p3_conta, n = Math.max(1, C6.filter((x) => t >= x).length), pulso = 1 + 0.07 * kick(t, C6[n - 1], 0.22);
      const k = E.mola(p(t, EV.p3_pilha, EV.p3_pilha + 0.45)), py = P3.y + h + 52 - (1 - k) * 16, s = `+${n} ${n === 1 ? 'mensagem' : 'mensagens'}`;
      const pcx = P3.x + 150;
      c.save(); c.translate(pcx, py + 30); c.scale(pulso, pulso); c.translate(-pcx, -(py + 30));
      const pl = pilula(c, s, pcx, py, { alpha: clamp(k * 2), ponto: true, minW: tw('+6 mensagens', TEXT, 30, 600, 0.3) + 80 });
      c.restore();
      if (k > 0.9) BOX('mensagens', pl.x, py, pl.x + pl.w, py + pl.h, { txt: '+6 mensagens' });
    }
  }

  // ---------------------------------------------------------------- P4: as perguntas atrás da cabeça
  // posições finais (o centro de cada cartão) nos cantos de cima, onde o fundo aparece em volta da cabeça; a borda de
  // dentro de cada cartão fica um pouco atrás do cabelo. Profundidade: z 0 (perto) a 1 (longe) → escala, desfoque, parallax.
  // V3: 3 cartões grandes (corpo 40 px). Vagas medidas no recorte (pior caso de todos os quadros): o fundo só aparece
  // inteiro em volta do topo da cabeça. Dois à esquerda, um à direita; o texto fica no lado de fora e só a margem do
  // cartão passa atrás do cabelo (a personagem recortada fica na frente). Entram em sequência a partir de "essas
  // respostas", param (legíveis) e, antes do corte, recuam e desfocam até sumir.
  const PERG = [
    { linhas: ['Qual', 'chave?'], x: 30, y: 200, lado: 'e', z: 0.2 },
    { linhas: ['Pagou o', 'sinal?'], x: 30, y: 344, lado: 'e', z: 0.5 },
    { linhas: ['Quanto eu', 'cobro?'], x: 1050, y: 200, lado: 'd', z: 0.0 },
  ];
  function p4atras(c, t) {
    const Q = EV.perguntas, sai = E.inOutCubic(p(t, EV.perguntas_saem, EV.perguntas_saem + 0.32)), param = EV.perguntas_param;
    Q.forEach(([t0, nome], i) => {
      if (t < t0) return;
      const P = PERG[i], sg = P.lado === 'e' ? 1 : -1, e = E.mola(p(t, t0, t0 + 0.6));
      const sz = 40, padX = 26, padY = 18, lh = 48, wt = Math.max(...P.linhas.map((x) => tw(x, TEXT, sz, 600, 0))), extra = 70;   // margem que passa atrás do cabelo
      const w = wt + 2 * padX + extra, h = padY * 2 + P.linhas.length * lh + 4;
      const x0 = P.lado === 'e' ? P.x : P.x - w;
      const deriva = (1 - p(t, t0 + 0.6, param)) * Math.sin((t - t0) * 2.2) * (5 - 4 * P.z) * 0 + (1 - E.outCubic(p(t, t0, param))) * 10 * sg * (1 - P.z);  // parallax leve até parar
      const dx = sg * (1 - Math.min(e, 1)) * 150 + deriva;            // sai de trás da cabeça para fora (sem passar da vaga)
      const k = lerp(1, 0.84, sai), blur = 9 * sai + 0.6 * P.z * (1 - sai), a = clamp(p(t, t0, t0 + 0.14)) * (1 - p(sai, 0.55, 1));
      const ox = P.lado === 'e' ? x0 + w : x0, oy = P.y + h / 2;     // recua em direção à cabeça
      const desenha = (cc) => {
        cc.translate(dx, (1 - e) * 14); cc.translate(ox, oy); cc.scale(k, k); cc.translate(-ox, -oy);
        vidro(cc, x0, P.y, w, h, 26, { alpha: a, blur: 20, sombra: 0.32, brilho: 0.72 - 0.08 * P.z, tinta: 'rgba(14,16,18,0.58)' });
        P.linhas.forEach((l, j) => txt(cc, l, P.lado === 'e' ? x0 + padX : x0 + w - padX, P.y + padY + 2 + sz * 0.95 + j * lh,
          { size: sz, weight: 600, align: P.lado === 'e' ? 'left' : 'right', alpha: a, ls: 0, papel: a > 0.95 && sai < 0.01 && e > 0.97 ? 'corpo' : null }));
      };
      if (blur > 0.4) desfocado(c, desenha, blur, 1);
      else { c.save(); desenha(c); c.restore(); }
      if (a > 0.9 && sai < 0.01 && e > 0.97) {
        const linhasTx = P.linhas.map((l, j) => {                    // o retângulo de cada linha de texto (para o QA)
          const lw = tw(l, TEXT, 40, 600, 0), lx = P.lado === 'e' ? x0 + padX : x0 + w - padX - lw, by = P.y + padY + 2 + 40 * 0.95 + j * lh;
          return [lx + dx, by - 30, lx + lw + dx, by + 2];
        });
        BOX('pergunta', x0 + dx, P.y, x0 + w + dx, P.y + h, { txt: nome, atras: true, texto: linhasTx });
      }
    });
  }
  function pessoaNaFrente(c) {                                       // o recorte da personagem por cima do que ficou atrás
    if (!MASK) return;
    const o = OFF2.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, W, H);
    o.save(); o.translate(W / 2 + SHK.x, H / 2 + SHK.y); o.scale(SHK.s, SHK.s); o.drawImage(FRAME, -W / 2, -H / 2, W, H); o.restore();
    o.globalCompositeOperation = 'destination-in'; o.drawImage(MASK, 0, 0, W, H); o.globalCompositeOperation = 'source-over';
    c.drawImage(OFF2, 0, 0);
  }

  // ---------------------------------------------------------------- P5: o cartão de envio
  function aviao(c, x, y, s, cor) {                                  // avião de papel em traço fino
    c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = cor; c.lineWidth = 2.2 / s; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-14, -2); c.lineTo(16, -14); c.lineTo(6, 16); c.lineTo(0, 4); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(0, 4); c.lineTo(16, -14); c.stroke(); c.restore();
  }
  // V4: o cartão de envio SOBRE a imagem dela, na parte de baixo (acima dos 20 % de baixo, fora da coluna de botões,
  // abaixo do queixo); vidro fosco; "Enviar" afunda e o avião sai
  const FIM = { x: 50, w: 900, base: 1528 };
  function cartaoFinal(c, t) {
    const t0 = EV.cartao, e = E.mola(p(t, t0, t0 + 0.7)), a = clamp(p(t, t0, t0 + 0.22));
    if (e <= 0) return;
    const sz = 44, lh = 54, L = quebra('Manda pra quem não consegue sair da pousada nem por uma tarde.', DISPLAY, sz, 800, FIM.w - 84, -0.5);
    const h = 30 + 52 + 22 + L.length * lh + 22 + 76 + 30, x = FIM.x, y = FIM.base - h + (1 - e) * 340;
    vidro(c, x, y, FIM.w, h, 44, { alpha: a, blur: 30, sombra: 0.45, sombraBlur: 60, tinta: 'rgba(14,16,18,0.6)' });
    c.save(); c.globalAlpha *= a;
    const hy = y + 30 + 26;
    c.beginPath(); c.arc(x + 42 + 26, hy, 26, 0, TAU); c.fillStyle = 'rgba(181,255,46,0.12)'; c.fill(); c.strokeStyle = 'rgba(181,255,46,0.6)'; c.lineWidth = 1.5; c.stroke();
    aviao(c, x + 67, hy + 1, 1.0, C.lime);
    txt(c, 'Enviar para…', x + 42 + 66, hy + 10, { size: 28, weight: 600, color: C.gray, ls: 0.4, papel: 'meta' });
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(x + 36, y + 30 + 52 + 10, FIM.w - 72, 1.5);
    const ty = y + 30 + 52 + 22;
    L.forEach((l, i) => txt(c, l, x + 42, ty + sz * 0.95 + i * lh, { fam: DISPLAY, size: sz, weight: 800, ls: -0.5, papel: 'corpo' }));
    const by = ty + L.length * lh + 22, D = 56, lx = x + 42;
    c.drawImage(LOGO, lx, by + 10, D, D);
    const w1 = txt(c, 'FAZLO ', lx + D + 12, by + 10 + D / 2 + 11, { fam: DISPLAY, size: 30, weight: 900, ls: -0.4 });
    txt(c, 'Hospeda', lx + D + 12 + w1, by + 10 + D / 2 + 11, { fam: DISPLAY, size: 30, weight: 700, color: C.lime, ls: -0.4 });
    const tp = EV.enviar, pr = p(t, tp, tp + 0.1) * (1 - p(t, tp + 0.1, tp + 0.34)), sent = p(t, tp + 0.12, tp + 0.5);
    const bw = 220, bh = 76, bx = x + FIM.w - 42 - bw, sc = 1 - 0.07 * pr;
    c.save(); c.translate(bx + bw / 2, by + bh / 2); c.scale(sc, sc);
    c.shadowColor = `rgba(181,255,46,${0.25 + 0.4 * kick(t, tp + 0.1, 0.5)})`; c.shadowBlur = 24 + 30 * kick(t, tp + 0.1, 0.5);
    rr(c, -bw / 2, -bh / 2, bw, bh, 38); c.fillStyle = C.lime; c.fill(); c.shadowColor = 'transparent';
    txt(c, 'Enviar', -16, 12, { size: 34, weight: 700, color: C.ink, align: 'center', ls: 0.2 });
    aviao(c, 58 + 46 * E.inCubic(sent), -28 * E.inCubic(sent), 0.9, `rgba(11,12,13,${1 - sent * 0.9})`);
    c.restore();
    c.restore();
    if (a > 0.9 && e > 0.97) BOX('cartao', x, y, x + FIM.w, y + h);
  }

  // ---------------------------------------------------------------- legenda (sem faixa): branca, sombra difusa, chaves em limão
  function layoutLegenda() {
    PAGES = [];
    const ls0 = -0.02 * CAP.size;
    const wid = (ws, a, b) => tw(ws.slice(a, b).map((x) => x.w).join(' '), DISPLAY, CAP.size, 900, ls0);
    const ligacao = /^(o|a|os|as|do|da|no|na|de|e|é|já|um|uma|se|eu|que|só|não)$/i;
    LN.frases.forEach((f, fi) => {
      const ws = f.palavras, n = ws.length, prox = LN.frases[fi + 1] ? LN.frases[fi + 1].palavras[0].t0 : LN.duracao;
      const cabe = (a, b) => { if (wid(ws, a, b) <= CAP.maxW) return true; for (let k = a + 1; k < b; k++) if (wid(ws, a, k) <= CAP.maxW && wid(ws, k, b) <= CAP.maxW) return true; return false; };
      const custoCorte = (j) => (j === n ? 0 : (/[,.:;?!]$/.test(ws[j - 1].w) ? 0 : 3) + (ligacao.test(ws[j - 1].w) ? 6 : 0) + (ws[j - 1].chave && ws[j] && ws[j].chave ? 20 : 0));
      const best = Array(n + 1).fill(null); best[0] = { c: 0, prev: -1 };
      for (let j = 1; j <= n; j++) for (let i = 0; i < j; i++) {
        if (!best[i] || !cabe(i, j)) continue;
        const curta = (j < n ? ws[j].t0 : ws[n - 1].t1 + 0.5) - ws[i].t0 < CAP.minPag ? 8 : 0;
        const cc = { c: best[i].c + custoCorte(j) + 10 + curta, prev: i };
        if (!best[j] || cc.c < best[j].c) best[j] = cc;
      }
      const pages = []; for (let j = n; j > 0; j = best[j].prev) pages.unshift([best[j].prev, j]);
      pages.forEach(([a, b]) => {
        const nn = b - a; let brk = nn;
        if (wid(ws, a, b) > CAP.maxW) {
          let bm = 1e9;
          for (let k = 1; k < nn; k++) {
            const mx = Math.max(wid(ws, a, a + k), wid(ws, a + k, b));
            const m = mx + ((k === 1 || nn - k === 1) && nn > 2 ? 300 : 0) - (/[,.]$/.test(ws[a + k - 1].w) ? 250 : 0) + (ws[a + k - 1].chave && ws[a + k].chave ? 400 : 0) + (ligacao.test(ws[a + k - 1].w) ? 260 : 0);
            if (m < bm && mx <= CAP.maxW) { bm = m; brk = k; }
          }
        }
        const rows = brk >= nn ? [[a, b]] : [[a, a + brk], [a + brk, b]], pos = {};
        rows.forEach(([r0, r1], ri) => { let x = CAP.cx - wid(ws, r0, r1) / 2; for (let k = r0; k < r1; k++) { pos[k] = { x, row: ri }; x += tw(ws[k].w + ' ', DISPLAY, CAP.size, 900, ls0) + ls0; } });
        PAGES.push({ a, b, rows, pos, nrows: rows.length, t0: ws[a].t0, words: ws, fimFala: ws[b - 1].t1, prox, clipe: f.clipe });
      });
    });
    PAGES.forEach((q, i) => {
      const nx = PAGES[i + 1] && PAGES[i + 1].prox === q.prox ? PAGES[i + 1].t0 : q.prox;
      const fimPlano = PL.find((pl) => q.t0 >= pl.t0 && q.t0 < pl.t1).t1;
      q.t1 = Math.min(nx, Math.max(q.fimFala + CAP.segura, Math.min(q.t0 + CAP.minPag, nx)), fimPlano - 0.04, q.clipe === 'p5' ? EV.cartao - 0.05 : 1e9);
    });
  }
  function legenda(c, t) {
    const pg = PAGES.find((q) => t >= q.t0 && t < q.t1);
    if (!pg) return;
    const y0 = CAP.y1 + (pg.nrows === 1 ? CAP.lh / 2 : 0), ls = -0.02 * CAP.size;
    const vis = [];
    for (let k = pg.a; k < pg.b; k++) {
      const w = pg.words[k]; if (t < w.t0) continue;
      const u = E.outCubic(p(t, w.t0, w.t0 + 0.1)), ps = pg.pos[k], ww = tw(w.w, DISPLAY, CAP.size, 900, ls);
      const cres = w.chave ? lerp(0.86, 1, E.mola(p(t, w.t0, w.t0 + 0.4))) : 1;      // a chave cresce ao entrar
      vis.push({ w, u, ps, ww, cres, y: y0 + ps.row * CAP.lh + (1 - u) * 8 });
    }
    // sombra difusa (sem faixa): um halo escuro que acompanha cada letra — contorno grosso desfocado, em duas camadas
    // (uma larga e suave, outra justa), para dar contraste até sobre a camisa branca
    const halo = (lw, blur, a) => {
      const o = OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H); o.filter = 'none'; o.globalAlpha = 1;
      for (const v of vis) {
        o.save(); setFont(o, DISPLAY, CAP.size, 900, ls); o.globalAlpha = v.u; o.translate(v.ps.x + v.ww / 2, v.y - CAP.size * 0.3); o.scale(v.cres, v.cres);
        o.lineJoin = 'round'; o.lineWidth = lw; o.strokeStyle = '#000'; o.fillStyle = '#000';
        o.strokeText(v.w.w, -v.ww / 2, CAP.size * 0.3 + 3); o.fillText(v.w.w, -v.ww / 2, CAP.size * 0.3 + 3); o.restore();
      }
      c.save(); c.globalAlpha = a; c.filter = `blur(${blur}px)`; c.drawImage(OFF, 0, 0); c.restore();
    };
    halo(30, 16, 0.62); halo(12, 5, 0.6);
    for (const v of vis) {
      c.save(); setFont(c, DISPLAY, CAP.size, 900, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.globalAlpha = v.u;
      c.translate(v.ps.x + v.ww / 2, v.y - CAP.size * 0.3); c.scale(v.cres, v.cres);
      c.fillStyle = v.w.chave ? C.lime : C.white; c.fillText(v.w.w, -v.ww / 2, CAP.size * 0.3);
      c.restore();
      if (v.u > 0.99) BOX('legenda', v.ps.x, v.y - CAP.size * 0.76, v.ps.x + v.ww, v.y + CAP.size * 0.22);
    }
  }

  // ---------------------------------------------------------------- o quadro
  function frame(c, t, img, mask) {
    FRAME = img; MASK = mask;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none'; c.shadowColor = 'transparent'; c.clearRect(0, 0, W, H);
    const pl = plano(t).id;
    SHK = pl === 'p1' ? tremor(t) : { x: 0, y: 0, s: 1 };
    if (FRAME) base(c); else { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
    if (pl === 'p4') { p4atras(c, t); pessoaNaFrente(c); }
    if (pl === 'p1') p1(c, t);
    else if (pl === 'p2') p2(c, t);
    else if (pl === 'p3') p3(c, t);
    else if (pl === 'p5') cartaoFinal(c, t);
    relogio(c, t);
    legenda(c, t);
  }
  // capa: o quadro do P1 (ela olhando a câmera, com o celular) escurecido, uma notificação de vidro e o título em y = 960
  function capaGrade(c, img) {
    FRAME = img; SHK = { x: 0, y: 0, s: 1 }; BOXES = [];
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none'; c.clearRect(0, 0, W, H);
    c.save(); c.translate(0, 40); base(c, 'brightness(0.62)'); c.restore();
    c.fillStyle = '#0A0A0A'; c.fillRect(0, 0, W, 40);
    const g = c.createLinearGradient(0, 600, 0, 1500); g.addColorStop(0, 'rgba(10,10,10,0)'); g.addColorStop(0.35, 'rgba(10,10,10,0.55)'); g.addColorStop(1, 'rgba(10,10,10,0.75)');
    c.fillStyle = g; c.fillRect(0, 600, W, 1320);
    const L = [['Saí da pousada', C.white], ['por duas horas.', C.lime]], size = 104, lh = 116;
    const msg = 'O casal do chalé 3 chegou.', nh = notificacao(c, 0, 0, 860, msg, { medir: true });
    const gap = 46, altT = (L.length - 1) * lh + size * 0.98, alt = nh + gap + altT, topo = 960 - alt / 2;
    BOXES = [];
    notificacao(c, 110, topo, 860, msg, { nome: 'notificacao' });
    const ty = topo + nh + gap;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30;
    L.forEach(([s, cor], i) => {
      const y = ty + size * 0.76 + i * lh, w = tw(s, DISPLAY, size, 900, -3);
      txt(c, s, 540, y, { fam: DISPLAY, size, weight: 900, color: cor, align: 'center', ls: -3 });
      BOX('titulo', 540 - w / 2, y - size * 0.76, 540 + w / 2, y + size * 0.22);
    });
    c.restore();
    const tb = BOXES.filter((b) => b.nome === 'titulo'), nb = BOXES.find((b) => b.nome === 'notificacao');
    const caixas = [{ nome: 'notificacao', x0: nb.x0, x1: nb.x1, y0: nb.y0, y1: nb.y1 },
      { nome: 'titulo', x0: Math.min(...tb.map((b) => b.x0)), x1: Math.max(...tb.map((b) => b.x1)), y0: Math.min(...tb.map((b) => b.y0)), y1: Math.max(...tb.map((b) => b.y1)) }];
    const bl = { topo: Math.min(...caixas.map((b) => b.y0)), base: Math.max(...caixas.map((b) => b.y1)) }; bl.centro = (bl.topo + bl.base) / 2;
    BOXES = null;
    return { caixas, bloco: bl };
  }
  function init(logoImg, linha) {
    LOGO = logoImg; LN = linha; EV = linha.eventos; PL = linha.planos; M = document.createElement('canvas').getContext('2d');
    OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H; OFF2 = document.createElement('canvas'); OFF2.width = W; OFF2.height = H;
    layoutLegenda();
  }
  function caixas(c, t, img, mask) { BOXES = []; frame(c, t, img, mask); const out = BOXES; BOXES = null; return out; }
  window.REEL = { init, frame, caixas, capaGrade, telaP2, TELA, get DURATION() { return LN.duracao; },
    legenda: () => PAGES.map((q) => ({ t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.w).join(' ')),
      palavras: Array.from({ length: q.b - q.a }, (_, i) => ({ w: q.words[q.a + i].w, t0: q.words[q.a + i].t0, chave: !!q.words[q.a + i].chave })) })) };
})();
