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
    c.globalAlpha *= o.alpha ?? 1; c.fillStyle = o.color || C.white; c.fillText(s, x0, y); c.restore();
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
  // a notificação de vidro (genérica): avatar R, "Recepção", "agora", a mensagem
  function notificacao(c, x, y, w, msg, o = {}) {
    const sz = o.size || 30, padX = 26, av = 30, tx = x + padX + av * 2 + 20, maxW = x + w - padX - tx;
    const linhas = quebra(msg, TEXT, sz, 500, maxW), h = 40 + 32 + linhas.length * (sz * 1.28) + 18;
    if (o.medir) return h;
    vidro(c, x, y, w, h, 30, o);
    c.save(); c.globalAlpha *= o.alpha ?? 1;
    avatarR(c, x + padX + av, y + h / 2, av, { ponto: !o.lida });
    txt(c, 'Recepção', tx, y + 52, { size: 25, weight: 700, ls: 0.3 });
    txt(c, o.quando || 'agora', x + w - padX, y + 52, { size: 22, weight: 500, color: C.gray, align: 'right', ls: 0.4 });
    linhas.forEach((s, i) => txt(c, s, tx, y + 52 + 14 + (i + 1) * sz * 1.28, { size: sz, weight: 500, color: 'rgba(255,255,255,0.94)', ls: 0.1 }));
    c.restore();
    if ((o.alpha ?? 1) > 0.5 && !o.semCaixa) BOX(o.nome || 'notificacao', x, y, x + w, y + h, { txt: msg });
    return h;
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
  const P1 = { x: 110, w: 860, y: 846, gap: 14, size: 35 };
  function p1(c, t) {
    const N = EV.notificacoes, ag = E.inOutCubic(p(t, EV.agrupa, EV.agrupa + 0.5));
    const h = notificacao(c, 0, 0, P1.w, N[1][1], { medir: true, size: P1.size });
    const n = N.filter((q) => t >= q[0]).length;
    // ordem na lista: a mais nova em cima; as antigas descem (mola) — e no agrupamento recuam atrás da mais nova
    const desenha = [];
    for (let i = 0; i < n; i++) {
      const [t0, msg] = N[i], idade = n - 1 - i;                     // 0 = a mais nova
      let ySlot = P1.y;                                             // posição na lista, com a mola de cada empurrão
      for (let j = i + 1; j < n; j++) ySlot += (h + P1.gap) * E.mola(p(t, N[j][0], N[j][0] + 0.55));
      const yGrupo = P1.y + 14 * idade, sGrupo = 1 - 0.05 * idade;     // no grupo: lâminas logo abaixo da mais nova
      const y = lerp(ySlot, yGrupo, ag), s = lerp(1, sGrupo, ag), blur = 6 * ag * Math.min(idade, 1) + 2 * ag * Math.max(0, idade - 1);
      const ent = E.mola(p(t, t0, t0 + 0.55)), yy = y - (1 - ent) * 110;
      desenha.push({ i, idade, y: yy, s, blur, alpha: clamp(p(t, t0, t0 + 0.18)) * (1 - 0.35 * ag * Math.min(idade, 1)), msg, brilho: 0.78 - 0.18 * ag * Math.min(idade, 1) });
    }
    desenha.sort((a, b) => b.idade - a.idade);                       // as antigas atrás
    for (const d of desenha) {
      const cx = P1.x + P1.w / 2;
      const f = (cc) => { cc.translate(cx, d.y); cc.scale(d.s, d.s); cc.translate(-cx, -d.y); notificacao(cc, P1.x, d.y, P1.w, d.msg, { size: P1.size, alpha: d.alpha, brilho: d.brilho, lida: d.idade > 0 && ag > 0.5, semCaixa: true }); };
      if (d.blur > 0.3) desfocado(c, f, d.blur, 1);
      else { c.save(); f(c); c.restore(); }
      if (d.alpha > 0.5 && (d.idade === 0 || ag < 0.5)) BOX('notificacao', P1.x, d.y, P1.x + P1.w, d.y + h, { txt: d.msg });
    }
    // o contador do grupo
    const k = E.mola(p(t, EV.agrupa + 0.25, EV.agrupa + 0.75));
    if (k > 0) {
      const s = '3 notificações', w = tw(s, TEXT, 24, 600, 0.4) + 40, x = 540 - w / 2, y = P1.y + h + 40 - (1 - k) * 14;
      vidro(c, x, y, w, 48, 24, { alpha: clamp(k * 2), blur: 20, sombra: 0.25 });
      txt(c, s, 540, y + 32, { size: 24, weight: 600, align: 'center', alpha: clamp(k * 2), ls: 0.4, color: 'rgba(255,255,255,0.86)' });
      BOX('contador', x, y, x + w, y + 48);
    }
  }

  // ---------------------------------------------------------------- P2: a tela do chat (desenhada plana; base.py põe na tela em perspectiva)
  const TELA = { w: 600, h: 1272 };
  function telaP2(c, t) {
    const w = TELA.w, h = TELA.h;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h); c.filter = 'none'; c.globalAlpha = 1;
    c.save();                                                      // retângulo cheio: quem recorta é o branco da tela real
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#15181B'); g.addColorStop(1, '#0C0E10'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    // barra de status
    txt(c, t >= EV.chat_chega ? '14:21' : '14:20', 56, 58, { size: 26, weight: 700, ls: 0.3 });
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2.2;
    rr(c, w - 98, 38, 44, 22, 6); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(w - 94, 42, 30, 14); c.fillRect(w - 52, 45, 3, 8);
    for (let k = 0; k < 4; k++) c.fillRect(w - 160 + k * 9, 56 - 5 - k * 4, 6, 5 + k * 4);
    c.restore();
    // cabeçalho: voltar, avatar R, "Recepção", "online"
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 3.4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(48, 118); c.lineTo(34, 134); c.lineTo(48, 150); c.stroke(); c.restore();
    avatarR(c, 100, 134, 30);
    txt(c, 'Recepção', 146, 128, { size: 30, weight: 700, ls: 0.2 });
    c.beginPath(); c.arc(152, 150, 5, 0, TAU); c.fillStyle = C.lime; c.fill();
    txt(c, 'online', 164, 158, { size: 21, weight: 500, color: C.gray, ls: 0.5 });
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, 190, w, 1.5);
    // mensagens (sobem quando chega uma nova): a de baixo fica em ~ 58 % da altura (os polegares cobrem o resto)
    const msgs = [];
    const chega = E.mola(p(t, EV.chat_chega, EV.chat_chega + 0.5));
    msgs.push({ lado: 'e', txt: 'O casal do chalé 3 chegou. Qual chave eu entrego?', hora: '14:21', u: chega, t0: EV.chat_chega });
    const dig = p(t, EV.chat_digita, EV.chat_digita + 0.25), env = p(t, EV.chat_envia, EV.chat_envia + 0.4);
    if (dig > 0 && env < 1) msgs.push({ lado: 'd', digitando: true, u: E.mola(dig) * (1 - E.outCubic(env)) });
    if (env > 0) msgs.push({ lado: 'd', txt: 'Na gaveta da recepção, a azul.', hora: '14:21', u: E.mola(env), t0: EV.chat_envia, lido: p(t, EV.chat_lido, EV.chat_lido + 0.2) });
    // data
    txt(c, 'Hoje', w / 2, 236, { size: 20, weight: 600, color: 'rgba(255,255,255,0.45)', align: 'center', ls: 1.2 });
    const SZ = 34, LH = 42, maxW = 400;
    const alt = (m) => (m.digitando ? 70 : quebra(m.txt, TEXT, SZ, 500, maxW).length * LH + 60);
    let base_ = 740; const hs = msgs.map(alt);
    let tot = 0; msgs.forEach((m, i) => { tot += (hs[i] + 16) * clamp(m.u * 1.4); });
    let y = base_ - tot;
    msgs.forEach((m, i) => {
      const hh = hs[i], u = m.u; if (u <= 0.001) return;
      const ls = m.digitando ? [] : quebra(m.txt, TEXT, SZ, 500, maxW), bw = m.digitando ? 112 : Math.max(...ls.map((s) => tw(s, TEXT, SZ, 500))) + 48 + (m.lado === 'd' ? 0 : 0);
      const bx = m.lado === 'e' ? 34 : w - 34 - bw;
      c.save(); c.globalAlpha *= clamp(u * 2);
      const ox = m.lado === 'e' ? bx : bx + bw, oy = y + hh; c.translate(ox, oy); c.scale(lerp(0.7, 1, u), lerp(0.7, 1, u)); c.translate(-ox, -oy);
      rr(c, bx, y, bw, hh, 30);
      if (m.lado === 'e') { c.fillStyle = '#23272B'; c.fill(); }
      else { const gg = c.createLinearGradient(bx, y, bx + bw, y + hh); gg.addColorStop(0, '#2C3A16'); gg.addColorStop(1, '#22300F'); c.fillStyle = gg; c.fill(); c.strokeStyle = 'rgba(181,255,46,0.35)'; c.lineWidth = 1.5; c.stroke(); }
      if (m.digitando) {
        for (let k = 0; k < 3; k++) { const ph = (t - EV.chat_digita) * 2.6 - k * 0.17, b = Math.max(0, Math.sin(ph * TAU)); c.beginPath(); c.arc(bx + 32 + k * 24, y + hh / 2 - 6 * b, 7.5, 0, TAU); c.fillStyle = `rgba(181,255,46,${0.45 + 0.55 * b})`; c.fill(); }
      } else {
        ls.forEach((s, k) => txt(c, s, bx + 24, y + 46 + k * LH, { size: SZ, weight: 500, ls: 0.1 }));
        const hx = bx + bw - 22 - (m.lado === 'd' ? 34 : 0);
        txt(c, m.hora, hx, y + hh - 16, { size: 19, weight: 500, color: 'rgba(255,255,255,0.5)', align: 'right', ls: 0.4 });
        if (m.lado === 'd') {                                   // o check (e o segundo, quando lida), finos e limão
          c.save(); c.strokeStyle = m.lido > 0 ? C.lime : 'rgba(255,255,255,0.6)'; c.lineWidth = 2.6; c.lineCap = 'round'; c.lineJoin = 'round';
          const cx = bx + bw - 44, cy = y + hh - 24;
          c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 6, cy + 6); c.lineTo(cx + 17, cy - 6); c.stroke();
          if (m.lido > 0) { c.globalAlpha *= m.lido; c.beginPath(); c.moveTo(cx + 9, cy + 6); c.lineTo(cx + 26, cy - 6); c.stroke(); }
          c.restore();
        }
      }
      c.restore();
      y += (hh + 16) * clamp(u * 1.4);
    });
    // a barra de digitar (fica sob os polegares)
    rr(c, 28, 1150, w - 56, 70, 35); c.fillStyle = '#1E2226'; c.fill();
    txt(c, 'Mensagem', 64, 1196, { size: 26, weight: 500, color: 'rgba(255,255,255,0.4)' });
    c.restore();
  }

  // ---------------------------------------------------------------- P3: a notificação ao lado do rosto e o "+6"
  const P3 = { x: 560, w: 480, y: 884 };
  function p3(c, t) {
    const t0 = EV.p3_notif, e = E.mola(p(t, t0, t0 + 0.55));
    if (e <= 0) return;
    const msg = 'Quanto eu cobro do pessoal que está saindo?', h = notificacao(c, 0, 0, P3.w, msg, { medir: true, size: 31 });
    // a pilha atrás: 6 cartões que entram um a um (recuados, desfocados) e viram o "+6"
    const tp = EV.p3_pilha, n = Math.min(6, Math.floor((t - tp) / 0.12) + 1);
    if (t >= tp) {
      const vira = E.inOutCubic(p(t, EV.p3_mais6 - 0.1, EV.p3_mais6 + 0.35));
      for (let k = Math.min(n, 3) - 1; k >= 0; k--) {          // só 3 lâminas visíveis atrás (as outras ficam no número)
        const u = E.mola(p(t, tp + k * 0.12, tp + k * 0.12 + 0.4)), d = k + 1;
        const s = 1 - 0.05 * d, y = P3.y - (12 + 13 * d) * u * (1 - 0.4 * vira), cx = P3.x + P3.w / 2;
        desfocado(c, (cc) => { cc.translate(cx, y + h / 2); cc.scale(s, s); cc.translate(-cx, -(y + h / 2)); vidro(cc, P3.x, y, P3.w, h, 30, { alpha: 0.9, brilho: 0.62 - 0.06 * d, sombra: 0.2 }); }, 2.5 + 1.5 * d, clamp(u * 2));
      }
      // o número: conta de +1 a +6 e fica
      const sz = 30, s = `+${n}`, w = Math.max(64, tw('+6', DISPLAY, sz, 800) + 34), cx = P3.x + P3.w - 46, cy = P3.y - 4;
      const k = E.mola(p(t, tp, tp + 0.4)) * (1 + 0.1 * kick(t, tp + (n - 1) * 0.12, 0.14));
      c.save(); c.translate(cx, cy); c.scale(k, k);
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 18; c.shadowOffsetY = 6; rr(c, -w / 2, -24, w, 48, 24); c.fillStyle = C.lime; c.fill(); c.shadowColor = 'transparent';
      txt(c, s, 0, 11, { fam: DISPLAY, size: sz, weight: 800, color: C.ink, align: 'center', ls: 0 });
      c.restore(); BOX('mais6', cx - w / 2, cy - 24, cx + w / 2, cy + 24);
    }
    c.save(); const cx = P3.x + P3.w / 2, yy = P3.y + (1 - e) * 60; c.translate(cx, yy + h / 2); c.scale(lerp(0.9, 1, e), lerp(0.9, 1, e)); c.translate(-cx, -(yy + h / 2));
    notificacao(c, P3.x, yy, P3.w, msg, { size: 31, alpha: clamp(p(t, t0, t0 + 0.2)), nome: 'notificacao-p3', semCaixa: true });
    c.restore();
    if (e > 0.6) BOX('notificacao-p3', P3.x, P3.y, P3.x + P3.w, P3.y + h, { txt: msg });
  }

  // ---------------------------------------------------------------- P4: as perguntas atrás da cabeça
  // posições finais (o centro de cada cartão) nos cantos de cima, onde o fundo aparece em volta da cabeça; a borda de
  // dentro de cada cartão fica um pouco atrás do cabelo. Profundidade: z 0 (perto) a 1 (longe) → escala, desfoque, parallax.
  // vagas medidas no recorte (scripts/recorte.py): o fundo aparece inteiro nos cantos de cima, em volta do topo da cabeça.
  // Cada cartão SAI DE TRÁS da cabeça (começa encoberto pelo cabelo) e para na sua vaga, inteiro e legível.
  // Profundidade: z 0 (perto: maior, nítido) a 1 (longe: menor, levemente desfocado, parallax menor).
  const PERG = [
    { x: 44, y: 236, z: 0.1, lado: 'e' }, { x: 1036, y: 236, z: 0.1, lado: 'd' }, { x: 44, y: 300, z: 0.4, lado: 'e' },
    { x: 1038, y: 300, z: 0.4, lado: 'd' }, { x: 1000, y: 366, z: 0.75, lado: 'd' },
  ];
  const LUZ = { x: 540, y: 290 };
  function p4atras(c, t) {
    const Q = EV.perguntas, aq = EV.aqui, fim = PL[3].t1;
    const fecha = E.inOutCubic(p(t, aq + 0.02, aq + 0.5));
    Q.forEach(([t0, s], i) => {
      if (t < t0) return;
      const P = PERG[i], e = E.mola(p(t, t0, t0 + 0.65)), sc = 1 - 0.12 * P.z, sg = P.lado === 'e' ? 1 : -1;
      const sz = s === '+6' ? 30 : (P.z > 0.3 ? 26 : 27), w = tw(s, TEXT, sz, 650, 0.2) + 36, h = 54;
      const cx0 = P.lado === 'e' ? P.x + w / 2 : P.x - w / 2;          // a vaga (borda de fora encostada na margem)
      const drift = Math.sin((t - t0) * 0.9) * (4 - 3 * P.z) * -sg;      // parallax leve (para fora, nunca para o cabelo)
      let x = cx0 + sg * (1 - e) * 170 + drift, y = P.y + (1 - e) * 18;        // sai de trás da cabeça para fora
      x = lerp(x, LUZ.x, fecha); y = lerp(y, LUZ.y, fecha);
      const k = sc * lerp(lerp(0.88, 1, e), 0.2, fecha), a = clamp(p(t, t0, t0 + 0.12)) * (1 - p(fecha, 0.65, 1));
      const blur = 0.9 * P.z * (1 - fecha) + 3 * fecha;
      const desenha = (cc) => {
        vidro(cc, -w / 2, -h / 2, w, h, 20, { alpha: a, blur: 18, sombra: 0.3, brilho: 0.72, tinta: 'rgba(14,16,18,0.56)' });
        txt(cc, s, 0, sz * 0.36, { size: sz, weight: 650, align: 'center', alpha: a, color: s === '+6' ? C.lime : C.white, ls: 0.2 });
      };
      if (blur > 0.4) desfocado(c, (cc) => { cc.translate(x, y); cc.scale(k, k); desenha(cc); }, blur, 1);
      else { c.save(); c.translate(x, y); c.scale(k, k); desenha(c); c.restore(); }
      if (a > 0.5 && fecha < 0.05) BOX('pergunta', x - w * k / 2, y - h * k / 2, x + w * k / 2, y + h * k / 2, { txt: s, atras: true });
    });
    // o ponto de luz limão atrás da cabeça (vira um contorno de luz no cabelo) — some antes do corte
    const lz = p(t, aq + 0.25, aq + 0.55) * (1 - p(t, fim - 0.45, fim - 0.12));
    if (lz > 0) {
      const r = lerp(60, 470, E.outCubic(p(t, aq + 0.25, aq + 0.75)));
      const g = c.createRadialGradient(LUZ.x, LUZ.y, 0, LUZ.x, LUZ.y, r);
      g.addColorStop(0, `rgba(235,255,190,${0.9 * lz})`); g.addColorStop(0.35, `rgba(150,230,30,${0.45 * lz})`); g.addColorStop(0.7, `rgba(120,200,20,${0.14 * lz})`); g.addColorStop(1, 'rgba(181,255,46,0)');
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(LUZ.x - r, LUZ.y - r, 2 * r, 2 * r); c.restore();   // luz (soma), não tinta
      BOX('luz', LUZ.x - r, LUZ.y - r, LUZ.x + r, LUZ.y + r, { atras: true });
    }
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
  function p5(c, t) {
    const t0 = EV.cartao, e = E.mola(p(t, t0, t0 + 0.7));
    if (e <= 0) return;
    const x = 64, w = 952, h = 392, y = 1140 + (1 - e) * 460, a = clamp(p(t, t0, t0 + 0.2));
    vidro(c, x, y, w, h, 44, { alpha: a, blur: 30, sombra: 0.42, sombraBlur: 60, tinta: 'rgba(14,16,18,0.56)' });
    c.save(); c.globalAlpha *= a;
    // cabeçalho
    c.beginPath(); c.arc(x + 58, y + 58, 26, 0, TAU); c.fillStyle = 'rgba(181,255,46,0.12)'; c.fill(); c.strokeStyle = 'rgba(181,255,46,0.55)'; c.lineWidth = 1.5; c.stroke();
    aviao(c, x + 57, y + 59, 1.0, C.lime);
    txt(c, 'Enviar para…', x + 98, y + 67, { size: 25, weight: 600, color: C.gray, ls: 0.6 });
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(x + 32, y + 104, w - 64, 1.5);
    // o texto
    const L = ['Manda pra quem não consegue', 'sair da pousada nem por uma tarde.'];
    L.forEach((s, i) => txt(c, s, x + 40, y + 168 + i * 56, { fam: DISPLAY, size: 46, weight: 800, ls: -0.6 }));
    // a logo, dentro do cartão
    const D = 46, ly = y + h - 40 - D, lx = x + 40;
    c.drawImage(LOGO, lx, ly, D, D);
    const w1 = txt(c, 'FAZLO ', lx + D + 12, ly + D / 2 + 10, { fam: DISPLAY, size: 28, weight: 900, ls: -0.4 });
    txt(c, 'Hospeda', lx + D + 12 + w1, ly + D / 2 + 10, { fam: DISPLAY, size: 28, weight: 700, color: C.lime, ls: -0.4 });
    // o botão "Enviar": pressão (afunda e volta) e o avião sai
    const tp = EV.enviar, pr = p(t, tp, tp + 0.12) * (1 - p(t, tp + 0.12, tp + 0.36)), sent = p(t, tp + 0.15, tp + 0.5);
    const bw = 196, bh = 64, bx = x + w - 40 - bw, by = y + h - 40 - bh + 4, sc = 1 - 0.06 * pr;
    c.save(); c.translate(bx + bw / 2, by + bh / 2); c.scale(sc, sc);
    c.shadowColor = `rgba(181,255,46,${0.25 + 0.35 * kick(t, tp + 0.12, 0.5)})`; c.shadowBlur = 24 + 30 * kick(t, tp + 0.12, 0.5);
    rr(c, -bw / 2, -bh / 2, bw, bh, 32); c.fillStyle = C.lime; c.fill(); c.shadowColor = 'transparent';
    txt(c, 'Enviar', -14, 11, { fam: TEXT, size: 28, weight: 700, color: C.ink, align: 'center', ls: 0.3 });
    aviao(c, 50 + 40 * E.inCubic(sent), -26 * E.inCubic(sent), 0.75, `rgba(11,12,13,${1 - sent * 0.9})`);
    c.restore();
    if (sent > 0.6) { c.beginPath(); c.arc(bx + bw - 24, by - 16, 0, 0, 0); }
    c.restore();
    if (a > 0.5 && e > 0.9) BOX('cartao', x, y, x + w, y + h);
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
      q.t1 = Math.min(nx, Math.max(q.fimFala + CAP.segura, Math.min(q.t0 + CAP.minPag, nx)), fimPlano - 0.04, q.clipe === 'p5' ? EV.cartao - 0.25 : 1e9);
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
    SHK = plano(t).id === 'p1' ? tremor(t) : { x: 0, y: 0, s: 1 };
    if (FRAME) base(c); else { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
    const pl = plano(t).id;
    if (pl === 'p4') { p4atras(c, t); pessoaNaFrente(c); }
    if (pl === 'p1') p1(c, t);
    else if (pl === 'p3') p3(c, t);
    else if (pl === 'p5') p5(c, t);
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
    const msg = 'O casal do chalé 3 chegou.', nh = notificacao(c, 0, 0, 800, msg, { medir: true, size: 36 });
    const gap = 46, altT = (L.length - 1) * lh + size * 0.98, alt = nh + gap + altT, topo = 960 - alt / 2;
    BOXES = [];
    notificacao(c, 140, topo, 800, msg, { size: 36, nome: 'notificacao' });
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
