/*
 * FAZLO Hospeda — Reel 09 "Dois hóspedes, um chalé" (1080×1920, 9:16).
 * Formato novo: a Clara (personagem gerada no Google Flow) sempre dentro de um card arredondado com borda limão,
 * motion graphics em volta e a narração da marca. Tudo vem de audio/linha.json (gerado por scripts/linha.py).
 *
 * Cenas (tempos do vídeo):
 *   1 · 0–6,8      Clara fala (card) · caderno rabiscado entra · dois hóspedes vão ao mesmo chalé e colidem · zoom no rosto
 *   2 · 6,8–8,8    corte: reação cansada · 9–13,6 motion: caderno + WhatsApp, anotado em dois lugares
 *   3 · 13,6–24    caos organizado: balão, página do caderno, papel solto (+ corte extra de 1 s) e as duas reservas colidindo
 *   4 · 24–26      corte: reação pensativa (sem narração)
 *   5/6 · 26–42,6  PENDENTE: interface real do Hospeda e o corte aliviado (aguardando os prints)
 *   7 · 42,6–48    menos caderno, menos susto · "link na bio"
 *   8 · 48–51      a logo
 * A legenda palavra por palavra (Clara e narração) fica em y 1332/1412, centrada em x 540, limitada a x 130–950.
 */
(function () {
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const C = { bg: '#060707', lime: '#AFFA27', white: '#F4F5F0', gray: '#8E8E88', dim: '#3A3D36', red: '#FF4B3E', panel: '#121411', paper: '#ECEAE1', ink: '#2A2C33' };
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const FPS_CLIPE = 24, NQ = 192;
  let LN = null, LOGO = null, FUNDO = null, PAGINAS = [];
  const CUES = [];

  // ---------------------------------------------------------------- utilidades
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (u) => 1 - Math.pow(1 - u, 3),
    inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    outBack: (u, s = 1.7) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
    outExpo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  };
  const css = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function font(size, weight = 900, fam = DISPLAY) { return `${weight} ${size}px ${fam}`; }
  function tw(ctx, s, size, weight = 900, fam = DISPLAY) { ctx.save(); ctx.font = font(size, weight, fam); const w = ctx.measureText(s).width; ctx.restore(); return w; }
  function txt(ctx, s, x, y, o = {}) {
    ctx.save();
    ctx.font = font(o.size || 40, o.weight || 900, o.fam || DISPLAY);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.blur ?? 18; ctx.shadowOffsetY = o.oy ?? 4; }
    ctx.fillStyle = o.color || C.white; ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width; ctx.restore(); return w;
  }
  // entrada com escala e opacidade em torno de (cx, cy)
  function enter(ctx, u, cx, cy, f, o = {}) {
    if (u <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp(u * (o.fade ?? 2));
    const s = lerp(o.from ?? 0.86, 1, o.back === false ? E.outCubic(u) : E.outBack(u, o.back ?? 1.6));
    ctx.translate(cx, cy); ctx.scale(s, s); if (o.rot) ctx.rotate(o.rot); ctx.translate(-cx, -cy);
    f(); ctx.restore();
  }
  const cue = (t, type, extra = {}) => CUES.push({ t: Math.round(t * 1000) / 1000, type, ...extra });

  // ---------------------------------------------------------------- tempos
  const T = {};
  function palavra(id, w, occ = 1) {                        // o início de uma palavra de um bloco (como no roteiro)
    const b = LN.blocos.find((x) => x.id === id); let c = 0;
    for (const x of b.palavras) if (x.w.replace(/[.,?:!…]/g, '') === w && ++c === occ) return x.t0;
    throw new Error(`${id}: a palavra "${w}" não está na fala`);
  }
  function fimPalavra(id, w, occ = 1) {
    const b = LN.blocos.find((x) => x.id === id); let c = 0;
    for (const x of b.palavras) if (x.w.replace(/[.,?:!…]/g, '') === w && ++c === occ) return x.t1;
    throw new Error(`${id}: a palavra "${w}" não está na fala`);
  }
  function setupTempos() {
    const corte = (id) => LN.cortes.find((c) => c.id === id);
    const cl = LN.clara;
    Object.assign(T, {
      claraFim: cl.t + (cl.ate - cl.de),
      caderno1: palavra('clara', 'caderno') - 0.15,
      chale1: palavra('clara', 'Até'),
      hospedes1: palavra('clara', 'dois'),
      colisao1: palavra('clara', 'mesmo'),
      cansada: corte('cansada'), extra: corte('cansada-extra'), pensativa: corte('pensativa'),
      m2: palavra('bloco-2', 'Pra') + 0.3,
      m2caderno: palavra('bloco-2', 'caderno'), m2whats: palavra('bloco-2', 'WhatsApp'), m2acontece: palavra('bloco-2', 'acontece'),
      m2fim: LN.blocos.find((b) => b.id === 'bloco-3').t - 0.3,
      balao: palavra('bloco-3', 'Reserva'), pagina: palavra('bloco-3', 'anotada') + 0.1, recado: palavra('bloco-3', 'recado'),
      quando: palavra('bloco-3', 'quando'), mesmo: palavra('bloco-3', 'mesmo'), choque: palavra('bloco-3', 'duas'),
      pendente: LN.pendente,
      menos1: palavra('bloco-7', 'Menos'), risco1: fimPalavra('bloco-7', 'caderno'), menos2: palavra('bloco-7', 'menos'),
      risco2: fimPalavra('bloco-7', 'susto'), conheca: palavra('bloco-7', 'Conheça'), marca7: palavra('bloco-7', 'FAZLO'),
      link: palavra('bloco-7', 'link'), logo: LN.logo,
    });
    T.cansadaFim = T.cansada.t + (T.cansada.ate - T.cansada.de);
    T.extraFim = T.extra.t + (T.extra.ate - T.extra.de);
    T.pensativaFim = T.pensativa.t + (T.pensativa.ate - T.pensativa.de);
    T.s3fim = T.pensativa.t;
    // os eventos de som (scripts/audio.py lê de audio/cues.json)
    cue(T.caderno1, 'pop'); cue(T.chale1, 'pop'); cue(T.hospedes1, 'pop'); cue(T.colisao1 + 0.32, 'impacto', { forca: 0.6 });
    cue(T.cansada.t, 'corte'); cue(T.cansadaFim, 'whoosh');
    cue(T.m2caderno, 'pop'); cue(T.m2whats, 'pop'); cue(T.m2acontece, 'alerta');
    cue(T.m2fim, 'whoosh'); cue(T.balao, 'pop'); cue(T.extra.t, 'corte'); cue(T.pagina + 0.35, 'pop'); cue(T.recado, 'pop');
    cue(T.mesmo, 'whoosh'); cue(T.choque + 0.18, 'impacto', { forca: 1 }); cue(T.pensativa.t, 'corte');
    cue(T.menos1, 'pop'); cue(T.risco1, 'risco'); cue(T.menos2, 'pop'); cue(T.risco2, 'risco'); cue(T.link, 'pop');
    cue(T.logo.t0, 'whoosh'); cue(T.logo.t0 + 0.42, 'sino');
  }

  // ---------------------------------------------------------------- quadros dos clipes da Clara
  const CACHE = new Map();
  function nomeQ(arq, s) { const n = clamp(Math.floor(s * FPS_CLIPE + 1e-6) + 1, 1, NQ); return `quadros/${arq.replace('.mp4', '')}/${String(n).padStart(4, '0')}.jpg`; }
  // o clipe (arquivo e tempo no clipe) que um card mostra no instante t, para cada card visível
  function clipesEm(t) {
    const out = [];
    const cl = LN.clara;
    if (t < T.cansada.t) out.push(nomeQ(cl.arquivo, cl.de + clamp(t - cl.t, 0, cl.ate - cl.de - 0.01)));
    for (const c of LN.cortes) {
      if (c.pendente) continue;
      const d = c.ate - c.de;
      if (t >= c.t - 0.02 && t < c.t + d + 0.5) out.push(nomeQ(c.arquivo, c.de + clamp(t - c.t, 0, d - 0.01)));
    }
    return out;
  }
  function carrega(src) {
    if (CACHE.has(src)) return CACHE.get(src);
    const img = new Image(); img.src = src;
    const pr = img.decode().then(() => img);
    CACHE.set(src, pr); pr.img = img;
    if (CACHE.size > 90) CACHE.delete(CACHE.keys().next().value);
    return pr;
  }
  async function prepara(t) { await Promise.all(clipesEm(t).map(carrega)); }
  function quadro(arq, s) { const pr = CACHE.get(nomeQ(arq, s)); return pr && pr.img.complete ? pr.img : null; }

  // ---------------------------------------------------------------- peças
  const CARD = { x: 270, y: 300, w: 540, h: 960, r: 44 };
  // o card da Clara: o clipe preenchendo o card, borda limão fina e o chip do nome no topo
  function cartao(ctx, img, o = {}) {
    const { x, y, w, h, r } = { ...CARD, ...o.box };
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
    rr(ctx, x, y, w, h, r); ctx.fillStyle = '#1A1C18'; ctx.fill();
    ctx.restore();
    ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
    if (img) {
      const z = o.zoom || 1, fx = o.fx ?? 0.5, fy = o.fy ?? 0.3;
      const dw = w * z, dh = h * z;
      ctx.drawImage(img, x + fx * w - fx * dw, y + fy * h - fy * dh, dw, dh);
    }
    // um véu escuro só na base, para o card assentar no preto
    const g = ctx.createLinearGradient(0, y + h * 0.72, 0, y + h); g.addColorStop(0, 'rgba(6,7,7,0)'); g.addColorStop(1, 'rgba(6,7,7,0.55)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (o.flash) { ctx.fillStyle = css(C.lime, 0.22 * o.flash); ctx.fillRect(x, y, w, h); }
    ctx.restore();
    ctx.save(); rr(ctx, x, y, w, h, r);
    ctx.lineWidth = 3 + 3 * (o.flash || 0); ctx.strokeStyle = C.lime; ctx.shadowColor = css(C.lime, 0.55 + 0.4 * (o.flash || 0)); ctx.shadowBlur = 18 + 20 * (o.flash || 0); ctx.stroke();
    ctx.restore();
    if (o.chip !== false) chip(ctx, 'CLARA · DONA DE POUSADA', x + w / 2, y, { size: Math.max(16, 22 * w / CARD.w) });
  }
  function chip(ctx, s, cx, cy, o = {}) {
    const size = o.size || 24, pw = tw(ctx, s, size, 800, MONO) + size * 1.6, ph = size * 1.9;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
    ctx.fillStyle = o.fill || '#0B0C0A'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = o.stroke || C.lime; ctx.stroke();
    txt(ctx, s, cx, cy + size * 0.36, { size, weight: 800, fam: MONO, color: o.color || C.lime, align: 'center' });
    ctx.restore();
    return pw;
  }
  function painel(ctx, x, y, w, h, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
    rr(ctx, x, y, w, h, o.r ?? 28);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, o.top || '#1B1F18'); g.addColorStop(1, o.bot || '#111310');
    ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = o.lw ?? 2.5; ctx.strokeStyle = o.stroke || css(C.lime, 0.55); ctx.stroke();
    if (o.glow) { ctx.shadowColor = o.glowColor || o.stroke; ctx.shadowBlur = o.glow; ctx.stroke(); }
    ctx.restore();
  }
  // ícones de traço (limão por padrão)
  function icone(ctx, tipo, cx, cy, s, cor = C.lime, lw = 0.075) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = cor; ctx.fillStyle = cor;
    ctx.beginPath();
    if (tipo === 'chale') {                                  // chalé em "A" com porta e janelinha redonda
      ctx.moveTo(-0.5, 0.42); ctx.lineTo(0, -0.48); ctx.lineTo(0.5, 0.42); ctx.closePath();
      ctx.moveTo(-0.6, 0.42); ctx.lineTo(0.6, 0.42);
      ctx.moveTo(-0.12, 0.42); ctx.lineTo(-0.12, 0.12); ctx.lineTo(0.12, 0.12); ctx.lineTo(0.12, 0.42);
      ctx.moveTo(0.075, -0.12); ctx.arc(0, -0.12, 0.075, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha *= 0.2; ctx.beginPath(); ctx.moveTo(-0.5, 0.42); ctx.lineTo(0, -0.48); ctx.lineTo(0.5, 0.42); ctx.closePath(); ctx.fill();
    } else if (tipo === 'hospede') {                         // pessoa: cabeça e ombros
      ctx.arc(0, -0.2, 0.2, 0, TAU); ctx.moveTo(-0.38, 0.45); ctx.quadraticCurveTo(-0.38, 0.06, 0, 0.06); ctx.quadraticCurveTo(0.38, 0.06, 0.38, 0.45); ctx.closePath();
      ctx.stroke(); ctx.globalAlpha *= 0.2; ctx.fill();
    } else if (tipo === 'caderno') {                         // caderno espiral
      rr(ctx, -0.36, -0.46, 0.76, 0.92, 0.08); ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 5; i++) { const y = -0.34 + i * 0.17; ctx.moveTo(-0.46, y); ctx.lineTo(-0.28, y); } ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 3; i++) { const y = -0.18 + i * 0.18; ctx.moveTo(-0.12, y); ctx.lineTo(0.26, y); } ctx.stroke();
    } else if (tipo === 'balao') {                           // balão de conversa genérico (sem logo de app)
      rr(ctx, -0.46, -0.38, 0.92, 0.64, 0.16); ctx.moveTo(-0.24, 0.26); ctx.lineTo(-0.34, 0.46); ctx.lineTo(-0.06, 0.26); ctx.stroke();
      ctx.beginPath(); for (let i = -1; i <= 1; i++) ctx.arc(i * 0.2, -0.06, 0.055, 0, TAU); ctx.fill();
    } else if (tipo === 'alerta') {                          // "!" num círculo
      ctx.arc(0, 0, 0.46, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -0.24); ctx.lineTo(0, 0.08); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0.24, 0.05, 0, TAU); ctx.fill();
    } else if (tipo === 'seta') {
      ctx.moveTo(-0.3, -0.3); ctx.lineTo(0.3, 0.3); ctx.moveTo(0.3, -0.05); ctx.lineTo(0.3, 0.3); ctx.lineTo(0.05, 0.3); ctx.stroke();
    }
    ctx.restore();
  }
  // rabisco de "letra de mão" (linhas onduladas que se desenham da esquerda para a direita)
  function rabisco(ctx, x, y, w, u, cor, seed = 1, lw = 4) {
    if (u <= 0) return;
    ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
    const n = Math.max(2, Math.floor(w / 6)), m = Math.floor(n * clamp(u));
    for (let i = 0; i <= m; i++) {
      const xx = x + (i / n) * w, yy = y + Math.sin(i * 0.9 + seed * 2.3) * 5 + Math.sin(i * 0.37 + seed) * 3;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke(); ctx.restore();
  }
  // estouro de alerta: anel que se abre + raios curtos
  function estouro(ctx, cx, cy, u, cor = C.red, R = 120) {
    if (u <= 0 || u >= 1) return;
    ctx.save(); const e = E.outExpo(u);
    ctx.beginPath(); ctx.arc(cx, cy, R * (0.3 + 0.9 * e), 0, TAU); ctx.strokeStyle = css(cor, 0.9 * (1 - u)); ctx.lineWidth = 8 * (1 - u) + 1; ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.3, r0 = R * (0.45 + 0.6 * e), r1 = r0 + 34 * (1 - u);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.strokeStyle = css(cor, 1 - u); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  }
  function tremor(t, t0, d = 0.45, a = 10) { const u = p(t, t0, t0 + d); if (u <= 0 || u >= 1) return [0, 0]; const k = (1 - u) * a; return [Math.sin(t * 93) * k, Math.cos(t * 71) * k * 0.6]; }

  // ---------------------------------------------------------------- cena 1: a Clara conta (0–6,8 s)
  function cena1(ctx, t) {
    const cl = LN.clara;
    if (t < T.cansada.t) {
      const z = 1 + 0.14 * E.inOutCubic(p(t, T.colisao1, T.colisao1 + 0.55));
      cartao(ctx, quadro(cl.arquivo, cl.de + clamp(t - cl.t, 0, cl.ate - cl.de - 0.01)), { zoom: z, fx: 0.5, fy: 0.27 });
    }
    const sai = 1 - p(t, T.cansada.t, T.cansada.t + 0.4);
    if (sai <= 0) return;
    ctx.save(); ctx.globalAlpha *= sai;
    // o caderno rabiscado entra pela esquerda e se encaixa na borda do card
    const uc = p(t, T.caderno1, T.caderno1 + 0.6);
    if (uc > 0) {
      const cx = lerp(-200, 175, E.outBack(uc, 1.2)), cy = 975, rot = lerp(-0.6, -0.16, E.outCubic(uc));
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      rr(ctx, -125, -160, 250, 320, 16); ctx.fillStyle = C.paper; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#D9D6CA'; ctx.fillRect(-125, -160, 26, 320);                       // a lombada
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-112, -132 + i * 44, 7, 0, TAU); ctx.fillStyle = '#9B988C'; ctx.fill(); }
      for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(80,110,160,0.25)'; ctx.fillRect(-85, -112 + i * 38, 190, 2); }
      for (let i = 0; i < 6; i++) rabisco(ctx, -78, -120 + i * 38, 150 - (i % 3) * 30, p(t, T.caderno1 + 0.35 + i * 0.16, T.caderno1 + 0.6 + i * 0.16), C.ink, i + 1, 3.5);
      // um risco forte por cima: a anotação rasurada
      rabisco(ctx, -82, 18, 170, p(t, T.caderno1 + 1.5, T.caderno1 + 1.8), C.red, 9, 5);
      ctx.restore();
    }
    // o chalé (coluna da direita) e os dois hóspedes que sobem até ele e colidem
    const CH = { x: 945, y: 430 };
    const uh = p(t, T.chale1, T.chale1 + 0.5);
    const [sx, sy] = tremor(t, T.colisao1 + 0.32, 0.5, 9);
    if (uh > 0) {
      const verm = p(t, T.colisao1 + 0.32, T.colisao1 + 0.45);
      enter(ctx, uh, CH.x, CH.y, () => {
        ctx.save(); ctx.translate(sx, sy);
        ctx.beginPath(); ctx.arc(CH.x, CH.y, 92, 0, TAU); ctx.fillStyle = '#0D0F0B'; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = verm > 0 ? css(C.red, 0.8) : css(C.lime, 0.45); ctx.stroke();
        icone(ctx, 'chale', CH.x, CH.y + 4, 112, verm > 0.5 ? C.red : C.lime);
        ctx.restore();
      });
    }
    const ug = p(t, T.hospedes1, T.hospedes1 + 0.4);
    if (ug > 0) {
      const anda = E.inOutCubic(p(t, T.hospedes1 + 0.25, T.colisao1 + 0.32));
      const bate = p(t, T.colisao1 + 0.32, T.colisao1 + 0.7);
      const rec = Math.sin(Math.PI * bate) * 16;                                         // o tranco da colisão
      for (const [k, x0] of [[-1, 880], [1, 1010]]) {
        const x = lerp(x0, CH.x + k * 38, anda) + k * rec, y = lerp(860, 610, anda);
        enter(ctx, ug, x, y, () => {
          ctx.beginPath(); ctx.arc(x, y, 50, 0, TAU); ctx.fillStyle = '#0D0F0B'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.white, 0.5); ctx.stroke();
          icone(ctx, 'hospede', x, y + 4, 66, C.white, 0.08);
        });
      }
      estouro(ctx, CH.x, 600, p(t, T.colisao1 + 0.32, T.colisao1 + 1.1), C.red, 90);
      const ua = p(t, T.colisao1 + 0.36, T.colisao1 + 0.66);
      if (ua > 0) enter(ctx, ua, CH.x, 720, () => {
        ctx.beginPath(); ctx.arc(CH.x, 720, 34, 0, TAU); ctx.fillStyle = C.red; ctx.fill();
        txt(ctx, '!', CH.x, 738, { size: 50, color: '#fff', align: 'center' });
      }, { from: 0.4 });
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- cena 2: reação cansada + "caderno e WhatsApp"
  function cena2(ctx, t) {
    const c = T.cansada;
    if (t >= c.t && t < T.cansadaFim + 0.45) {
      const s = c.de + clamp(t - c.t, 0, c.ate - c.de - 0.01);
      const u = p(t, T.cansadaFim, T.cansadaFim + 0.45);                               // o card encolhe e some
      ctx.save(); ctx.globalAlpha *= 1 - E.outCubic(u);
      const k = lerp(1, 0.55, E.inOutCubic(u));
      ctx.translate(540, 780); ctx.scale(k, k); ctx.translate(-540, -780);
      cartao(ctx, quadro(c.arquivo, s), { flash: 1 - p(t, c.t, c.t + 0.25) });
      ctx.restore();
    }
    if (t < T.m2caderno - 0.1 || t > T.m2fim + 0.35) return;
    const sai = E.inOutCubic(p(t, T.m2fim, T.m2fim + 0.35));
    ctx.save(); ctx.globalAlpha *= 1 - sai; ctx.translate(0, -80 * sai);
    const uChip = p(t, T.m2caderno - 0.1, T.m2caderno + 0.3);
    enter(ctx, uChip, 540, 520, () => chip(ctx, 'ANOTADO EM DOIS LUGARES', 540, 520, { size: 26 }));
    const cards = [[T.m2caderno, 120, 'caderno', 'Caderno'], [T.m2whats, 580, 'balao', 'WhatsApp']];
    const al = p(t, T.m2acontece, T.m2acontece + 0.3);
    for (const [t0, x, ic, nome] of cards) {
      const u = p(t, t0, t0 + 0.45);
      enter(ctx, u, x + 190, 760, () => {
        painel(ctx, x, 600, 380, 320, { stroke: al > 0 ? css(C.red, 0.4 + 0.5 * al) : css(C.lime, 0.55) });
        icone(ctx, ic, x + 190, 720, 130, C.lime);
        txt(ctx, nome, x + 190, 870, { size: 50, weight: 800, align: 'center' });
      });
    }
    // "acontece mais do que parece": a ligação vermelha tracejada entre os dois e os alertas pipocando
    if (al > 0) {
      ctx.save(); ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 40; ctx.lineWidth = 4; ctx.strokeStyle = css(C.red, al);
      ctx.beginPath(); ctx.moveTo(500, 760); ctx.lineTo(580, 760); ctx.stroke(); ctx.restore();
      enter(ctx, al, 540, 760, () => { ctx.beginPath(); ctx.arc(540, 760, 36, 0, TAU); ctx.fillStyle = C.red; ctx.fill(); txt(ctx, '!', 540, 779, { size: 52, color: '#fff', align: 'center' }); }, { from: 0.3 });
      const pts = [[300, 1010], [540, 1050], [780, 1010], [420, 1110], [660, 1110]];
      pts.forEach(([x, y], i) => {
        const ui = p(t, T.m2acontece + 0.35 + i * 0.22, T.m2acontece + 0.6 + i * 0.22);
        enter(ctx, ui, x, y, () => {
          ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU); ctx.fillStyle = css(C.red, 0.16); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.red, 0.85); ctx.stroke();
          txt(ctx, '!', x, y + 15, { size: 42, color: C.red, align: 'center' });
        }, { from: 0.4 });
      });
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- cena 3: o caos organizado e as duas reservas
  function cena3(ctx, t) {
    if (t < T.balao - 0.05 || t > T.s3fim + 0.05) return;
    const K = LN.caos, [h1, h2] = K.hospedes;
    const fim = E.inOutCubic(p(t, T.s3fim - 0.25, T.s3fim));
    ctx.save(); ctx.globalAlpha *= 1 - fim;
    const fundo = 1 - 0.86 * E.inOutCubic(p(t, T.mesmo - 0.1, T.mesmo + 0.4));          // o caos recua quando as reservas entram
    const treme = p(t, T.quando, T.mesmo) > 0 && t < T.mesmo + 0.4 ? 1 : 0;
    const jit = (i) => (treme ? [Math.sin(t * 40 + i) * 3, Math.cos(t * 33 + i * 2) * 3] : [0, 0]);
    ctx.save(); ctx.globalAlpha *= fundo;
    // 1) o balão de conversa cai do topo e assenta à esquerda
    const ub = p(t, T.balao, T.balao + 0.7);
    if (ub > 0) {
      const [jx, jy] = jit(1);
      const y = lerp(-200, 470, E.outBack(ub, 1.1)), x = 330 + jx, rot = lerp(0.4, -0.05, E.outCubic(ub));
      ctx.save(); ctx.translate(x, y + jy); ctx.rotate(rot);
      txt(ctx, 'WHATSAPP', -220, -102, { size: 22, weight: 800, fam: MONO, color: C.gray });
      rr(ctx, -230, -80, 460, 170, 30); ctx.fillStyle = '#16301F'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = css(C.lime, 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(150, 90); ctx.lineTo(205, 128); ctx.lineTo(196, 80); ctx.fillStyle = '#16301F'; ctx.fill();
      txt(ctx, `Fechado, ${h2}! ${K.chale},`, -200, -18, { size: 36, weight: 700 });
      txt(ctx, `de ${K.datas}`, -200, 32, { size: 36, weight: 700 });
      txt(ctx, '✓✓', 160, 64, { size: 30, weight: 800, color: C.lime });
      ctx.restore();
    }
    // 2) a página do caderno entra girando e assenta à direita
    const up = p(t, T.pagina, T.pagina + 0.65);
    if (up > 0) {
      const [jx, jy] = jit(2);
      const x = lerp(1300, 770, E.outBack(up, 1.1)) + jx, y = 700 + jy, rot = lerp(0.7, 0.07, E.outCubic(up));
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      ctx.fillStyle = C.paper; ctx.fillRect(-200, -150, 400, 300); ctx.shadowColor = 'transparent';
      for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(80,110,160,0.25)'; ctx.fillRect(-200, -100 + i * 38, 400, 2); }
      ctx.fillStyle = 'rgba(220,80,80,0.35)'; ctx.fillRect(-150, -150, 2, 300);
      txt(ctx, 'CADERNO', -136, -116, { size: 20, weight: 800, fam: MONO, color: '#7A776C' });
      ctx.save(); ctx.transform(1, 0, -0.18, 1, 0, 0);
      txt(ctx, `${h1} · ${K.chale}`, -120, -32, { size: 40, weight: 800, color: C.ink });
      txt(ctx, K.datas, -110, 26, { size: 40, weight: 800, color: C.ink });
      ctx.restore();
      rabisco(ctx, -126, 84, 220, p(t, T.pagina + 0.5, T.pagina + 1.1), C.ink, 3, 3.5);
      ctx.restore();
    }
    // 3) o papel solto (recado) cai e assenta embaixo à esquerda
    const ur = p(t, T.recado, T.recado + 0.7);
    if (ur > 0) {
      const [jx, jy] = jit(3);
      const x = 330 + jx, y = lerp(-250, 965, E.outBack(ur, 1.0)) + jy, rot = lerp(-0.9, -0.08, E.outCubic(ur));
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#E4F5B8'; ctx.fillRect(-180, -125, 360, 250); ctx.shadowColor = 'transparent';
      txt(ctx, 'RECADO', -156, -82, { size: 20, weight: 800, fam: MONO, color: '#6B7A45' });
      ctx.save(); ctx.transform(1, 0, -0.18, 1, 0, 0);
      txt(ctx, `${h2} ligou:`, -140, -20, { size: 38, weight: 800, color: C.ink });
      txt(ctx, `${K.chale},`, -130, 30, { size: 38, weight: 800, color: C.ink });
      txt(ctx, K.datas, -120, 80, { size: 38, weight: 800, color: C.ink });
      ctx.restore(); ctx.restore();
    }
    ctx.restore();
    // corte extra (1 s): a Clara lendo o caderno, num card menor embaixo à esquerda
    const x0 = T.extra;
    if (t >= x0.t && t < T.extraFim + 0.2) {
      const u = p(t, x0.t, x0.t + 0.22), v = p(t, T.extraFim, T.extraFim + 0.2);
      const box = { x: 70, y: 640, w: 306, h: 544, r: 30 };
      ctx.save(); ctx.globalAlpha *= 1 - v;
      const s = lerp(0.85, 1, E.outCubic(u)) * lerp(1, 0.9, v), cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
      cartao(ctx, quadro(x0.arquivo, x0.de + clamp(t - x0.t, 0, x0.ate - x0.de - 0.01)), { box, chip: false, flash: 1 - p(t, x0.t, x0.t + 0.25) });
      ctx.restore();
    }
    // 4) as duas reservas: entram dos lados e colidem no centro em "duas vezes"
    const ue = p(t, T.mesmo, T.mesmo + 0.6);
    if (ue > 0) {
      const bate = p(t, T.choque, T.choque + 0.18), volta = p(t, T.choque + 0.18, T.choque + 0.6);
      const gap = lerp(70, 0, E.inOutCubic(bate)) + 14 * Math.sin(Math.PI * volta);
      const verm = p(t, T.choque + 0.15, T.choque + 0.3);
      const [sx, sy] = tremor(t, T.choque + 0.18, 0.55, 14);
      ctx.save(); ctx.translate(sx, sy);
      const cards = [[-1, h1, 'CADERNO'], [1, h2, 'WHATSAPP']];
      for (const [k, nome, origem] of cards) {
        const wC = 420, hC = 250, xIn = k < 0 ? lerp(-500, 540 - gap / 2 - wC, E.outCubic(ue)) : lerp(1080 + 80, 540 + gap / 2, E.outCubic(ue));
        const y = 640;
        const borda = verm > 0 ? css(C.red, 0.5 + 0.5 * verm) : css(C.lime, 0.6);
        painel(ctx, xIn, y, wC, hC, { stroke: borda, lw: 3, glow: verm > 0 ? 24 * verm : 0, glowColor: css(C.red, 0.8) });
        txt(ctx, `RESERVA · ${origem}`, xIn + 32, y + 52, { size: 21, weight: 800, fam: MONO, color: C.gray });
        txt(ctx, nome, xIn + 32, y + 116, { size: 52, weight: 800 });
        const cor = verm > 0.5 ? C.red : C.lime;
        txt(ctx, K.chale, xIn + 32, y + 172, { size: 32, weight: 800, fam: MONO, color: cor });
        txt(ctx, K.datas, xIn + 32, y + 218, { size: 32, weight: 800, fam: MONO, color: cor });
      }
      estouro(ctx, 540, 765, p(t, T.choque + 0.18, T.choque + 1.0), C.red, 150);
      ctx.restore();
      const ua = p(t, T.choque + 0.25, T.choque + 0.55);
      enter(ctx, ua, 540, 975, () => chip(ctx, 'MESMO CHALÉ · MESMAS DATAS', 540, 975, { size: 30, stroke: C.red, color: '#fff', fill: css(C.red, 0.9) }), { from: 0.6 });
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- cena 4: reação pensativa (sem narração)
  function cena4(ctx, t) {
    const c = T.pensativa;
    if (t < c.t || t >= T.pendente.de) return;
    const u = p(t, c.t, c.t + 0.22);
    ctx.save(); ctx.globalAlpha *= clamp(u * 2);
    const k = lerp(0.92, 1, E.outCubic(u)); ctx.translate(540, 780); ctx.scale(k, k); ctx.translate(-540, -780);
    cartao(ctx, quadro(c.arquivo, c.de + clamp(t - c.t, 0, c.ate - c.de - 0.01)), { flash: 1 - p(t, c.t, c.t + 0.25) });
    ctx.restore();
  }

  // ---------------------------------------------------------------- cenas 5 e 6: pendentes (aguardando os prints)
  function pendente(ctx, t) {
    const P = T.pendente;
    if (t < P.de || t >= P.ate) return;
    const u = p(t, P.de, P.de + 0.3) * (1 - p(t, P.ate - 0.3, P.ate));
    ctx.save(); ctx.globalAlpha *= u;
    rr(ctx, 120, 420, 840, 700, 40); ctx.setLineDash([18, 14]); ctx.lineWidth = 3; ctx.strokeStyle = css(C.lime, 0.5); ctx.stroke(); ctx.setLineDash([]);
    txt(ctx, 'CENAS 5 E 6', 540, 700, { size: 64, weight: 900, align: 'center', color: C.lime });
    txt(ctx, 'aguardando os prints reais', 540, 790, { size: 34, weight: 800, fam: MONO, align: 'center', color: C.gray });
    txt(ctx, 'do Hospeda (reserva, calendário', 540, 840, { size: 34, weight: 800, fam: MONO, align: 'center', color: C.gray });
    txt(ctx, 'e bloqueio da duplicada)', 540, 890, { size: 34, weight: 800, fam: MONO, align: 'center', color: C.gray });
    ctx.restore();
  }

  // ---------------------------------------------------------------- cena 7: menos caderno, menos susto · link na bio
  function cena7(ctx, t) {
    if (t < T.menos1 - 0.1 || t > T.logo.t0 + 0.3) return;
    const sai = E.inOutCubic(p(t, T.logo.t0 - 0.1, T.logo.t0 + 0.25));
    ctx.save(); ctx.globalAlpha *= 1 - sai;
    const sobe = E.inOutCubic(p(t, T.conheca, T.conheca + 0.45));
    const itens = [[T.menos1, T.risco1, 'caderno', 'caderno', 560], [T.menos2, T.risco2, 'alerta', 'susto', 760]];
    for (const [t0, tr, ic, nome, y0] of itens) {
      const u = p(t, t0, t0 + 0.4); if (u <= 0) continue;
      const y = y0 - 260 * sobe;
      ctx.save(); ctx.globalAlpha *= 1 - sobe;
      enter(ctx, u, 540, y, () => {
        const risc = E.outCubic(p(t, tr, tr + 0.3));
        painel(ctx, 250, y - 75, 580, 150, { r: 75, stroke: css(C.white, 0.25 + 0.1 * (1 - risc)) });
        ctx.save(); ctx.globalAlpha *= 1 - 0.5 * risc;
        txt(ctx, '−', 330, y + 22, { size: 70, color: C.lime, align: 'center' });
        icone(ctx, ic, 430, y, 80, C.white, 0.08);
        txt(ctx, nome, 500, y + 22, { size: 62, weight: 800 });
        ctx.restore();
        if (risc > 0) { ctx.save(); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.strokeStyle = C.lime; ctx.shadowColor = css(C.lime, 0.7); ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.moveTo(300, y + 4); ctx.lineTo(lerp(300, 790, risc), y - 6); ctx.stroke(); ctx.restore(); }
      });
      ctx.restore();
    }
    // "Conheça o FAZLO Hospeda" e o chip "link na bio"
    const um = p(t, T.marca7, T.marca7 + 0.45);
    if (um > 0) enter(ctx, um, 540, 640, () => {
      txt(ctx, 'CONHEÇA O', 540, 560, { size: 30, weight: 800, fam: MONO, color: C.gray, align: 'center' });
      const w1 = tw(ctx, 'FAZLO ', 104, 900), w2 = tw(ctx, 'Hospeda', 104, 700), x = 540 - (w1 + w2) / 2;
      txt(ctx, 'FAZLO ', x, 680, { size: 104, weight: 900 });
      txt(ctx, 'Hospeda', x + w1, 680, { size: 104, weight: 700, color: C.lime });
    }, { back: 1.2 });
    const ul = p(t, T.link, T.link + 0.4);
    if (ul > 0) enter(ctx, ul, 540, 860, () => {
      const pulso = 1 + 0.03 * Math.sin((t - T.link) * 7);
      ctx.save(); ctx.translate(540, 860); ctx.scale(pulso, pulso); ctx.translate(-540, -860);
      rr(ctx, 270, 800, 540, 120, 60); ctx.fillStyle = C.lime; ctx.shadowColor = css(C.lime, 0.6); ctx.shadowBlur = 30; ctx.fill(); ctx.shadowColor = 'transparent';
      txt(ctx, 'link na bio', 515, 880, { size: 58, weight: 900, color: '#0B0C0A', align: 'center' });
      icone(ctx, 'seta', 735, 856, 52, '#0B0C0A', 0.13);
      ctx.restore();
    }, { from: 0.6 });
    ctx.restore();
  }

  // ---------------------------------------------------------------- cena 8: a logo (obrigatória no fim)
  function cena8(ctx, t) {
    const L = T.logo; if (t < L.t0) return;
    const pousa = L.t0 + 0.42, D = 320, cy = 742;
    const e = E.outBack(p(t, L.t0 + 0.05, pousa), 1.8);
    const g0 = ctx.createRadialGradient(540, cy, 0, 540, cy, 620);
    g0.addColorStop(0, css(C.lime, 0.15 * clamp(e))); g0.addColorStop(1, css(C.lime, 0));
    ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    const bt = t - pousa;
    if (bt >= 0) { const ru = p(bt, 0, 0.7); if (ru < 1) { ctx.beginPath(); ctx.arc(540, cy, lerp(D * 0.52, 225, E.outExpo(ru)), 0, TAU); ctx.strokeStyle = css(C.lime, 0.9 * (1 - ru)); ctx.lineWidth = 7 * (1 - ru) + 1; ctx.stroke(); } }
    ctx.save(); ctx.globalAlpha *= clamp(e * 2);
    const d = D * lerp(0.6, 1, e);
    if (LOGO) ctx.drawImage(LOGO, 540 - d / 2, cy - d / 2, d, d);
    ctx.restore();
    const NS = 96, w1 = tw(ctx, 'FAZLO ', NS, 900), w2 = tw(ctx, 'Hospeda', NS, 700), nx = 540 - (w1 + w2) / 2;
    const pin = E.outExpo(p(t, L.t0 + 0.05, pousa)), ny = 1052;
    ctx.save(); ctx.beginPath(); ctx.rect(60, ny - 100, 960, 130); ctx.clip();
    txt(ctx, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900 });
    txt(ctx, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime });
    ctx.restore();
    txt(ctx, LN.marca, 540, 1128, { fam: MONO, size: 34, weight: 800, color: C.gray, align: 'center', alpha: E.outCubic(p(t, L.t0 + 0.1, pousa)) });
  }

  // ---------------------------------------------------------------- legenda palavra por palavra
  const LEG = { size: 68, y: [1332, 1412], x0: 130, x1: 950 };
  // páginas por frase: corta nos sinais (. , ? ! … :), divide frase longa em partes equilibradas (sem separar um
  // destaque limão) e quebra cada página em até 2 linhas equilibradas
  const MAXP = 7;
  function setupLegenda(ctx) {
    PAGINAS = [];
    const cabe = (ws) => ws.length <= MAXP && linhas(ctx, ws) !== null;
    const parte = (ws) => {
      if (cabe(ws)) return [ws];
      let melhor = null;
      for (let k = 1; k < ws.length; k++) {
        const custo = Math.abs(ws.length - 2 * k) + (ws[k - 1].lima && ws[k].lima ? 50 : 0);
        if (!melhor || custo < melhor.c) melhor = { k, c: custo };
      }
      return [...parte(ws.slice(0, melhor.k)), ...parte(ws.slice(melhor.k))];
    };
    for (const b of LN.blocos) {
      const frases = []; let f = [];
      for (const w of b.palavras) { f.push(w); if (/[.,?!…:]$/.test(w.w)) { frases.push(f); f = []; } }
      if (f.length) frases.push(f);
      // frases curtas seguidas (ligadas por vírgula) dividem a página quando cabem juntas
      const pags = [];
      for (const fr of frases.flatMap(parte)) {
        const ult = pags[pags.length - 1];
        if (ult && /,$/.test(ult[ult.length - 1].w) && (ult.length < 3 || fr.length < 3) && cabe([...ult, ...fr])) ult.push(...fr);
        else pags.push(fr);
      }
      pags.forEach((ws) => PAGINAS.push({ bloco: b.id, palavras: ws, t0: ws[0].t0 }));
    }
    // cada página dura até a primeira palavra da próxima (ou, na última de um bloco, até 0,7 s depois da voz)
    PAGINAS.forEach((pg, i) => {
      const prox = PAGINAS[i + 1];
      const fimBloco = LN.blocos.find((b) => b.id === pg.bloco).t1;
      pg.t1 = prox && prox.bloco === pg.bloco ? prox.t0 : Math.min(fimBloco + 0.7, prox ? prox.t0 - 0.1 : 1e9, T.logo.t0);
      pg.linhas = linhas(ctx, pg.palavras);
    });
  }
  // 1 linha se couber (até 4 palavras); senão 2 linhas com a quebra que deixa as larguras mais parecidas; null se não couber
  function linhas(ctx, ws) {
    const esp = tw(ctx, ' ', LEG.size, 900), max = LEG.x1 - LEG.x0;
    const larg = (xs) => xs.reduce((s, w, i) => s + tw(ctx, w.w, LEG.size, 900) + (i ? esp : 0), 0);
    if (ws.length <= 4 && larg(ws) <= max) return [ws];
    let melhor = null;
    for (let k = 1; k < ws.length; k++) {
      const a = larg(ws.slice(0, k)), b = larg(ws.slice(k));
      if (a > max || b > max) continue;
      const custo = Math.max(a, b) + (ws[k - 1].lima && ws[k].lima ? 400 : 0);
      if (!melhor || custo < melhor.c) melhor = { k, c: custo };
    }
    return melhor ? [ws.slice(0, melhor.k), ws.slice(melhor.k)] : null;
  }
  function legenda(ctx, t) {
    const pg = PAGINAS.find((g) => t >= g.t0 && t < g.t1); if (!pg) return [];
    const esp = tw(ctx, ' ', LEG.size, 900), caixas = [];
    const sai = p(t, pg.t1 - 0.12, pg.t1);
    pg.linhas.forEach((ln, li) => {
      const larg = ln.reduce((s, w, i) => s + tw(ctx, w.w, LEG.size, 900) + (i ? esp : 0), 0);
      let x = 540 - larg / 2; const y = LEG.y[li] + (pg.linhas.length === 1 ? 40 : 0);
      for (const w of ln) {
        const lw = tw(ctx, w.w, LEG.size, 900);
        const u = p(t, w.t0 - 0.03, w.t0 + 0.12);
        if (u > 0) {
          ctx.save(); ctx.globalAlpha *= clamp(u * 1.5) * (1 - sai);
          const s = lerp(0.88, 1, E.outBack(u, 2)); ctx.translate(x + lw / 2, y - LEG.size * 0.3); ctx.scale(s, s); ctx.translate(-(x + lw / 2), -(y - LEG.size * 0.3));
          txt(ctx, w.w, x, y, { size: LEG.size, weight: 900, color: w.lima ? C.lime : C.white, shadow: 'rgba(0,0,0,0.85)', blur: 22, oy: 4 });
          ctx.restore();
        }
        caixas.push({ nome: `legenda: ${w.w}`, x0: x, x1: x + lw, y0: y - LEG.size * 0.76, y1: y + LEG.size * 0.22 });
        x += lw + esp;
      }
    });
    return caixas;
  }

  // ---------------------------------------------------------------- fundo e quadro
  function fazFundo() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    const r = g.createRadialGradient(540, 760, 0, 540, 760, 1100); r.addColorStop(0, 'rgba(175,250,39,0.06)'); r.addColorStop(1, 'rgba(175,250,39,0)');
    g.fillStyle = r; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.045)';
    for (let y = 12; y < H; y += 28) for (let x = 12; x < W; x += 28) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
    const v = g.createRadialGradient(540, 960, 500, 540, 960, 1250); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c;
  }
  function draw(ctx, t) {
    ctx.save(); ctx.clearRect(0, 0, W, H); ctx.drawImage(FUNDO, 0, 0);
    cena1(ctx, t); cena2(ctx, t); cena3(ctx, t); cena4(ctx, t); pendente(ctx, t); cena7(ctx, t); cena8(ctx, t);
    const cx = legenda(ctx, t);
    ctx.restore();
    return cx;
  }

  async function init(linha, logo) {
    LN = linha; LOGO = logo; FUNDO = fazFundo();
    setupTempos();
    setupLegenda(document.createElement('canvas').getContext('2d'));
  }
  window.REEL = { init, prepara, draw, cues: () => ({ duracao: LN.duracao, cues: CUES.slice().sort((a, b) => a.t - b.t) }), paginas: () => PAGINAS, T, get DURATION() { return LN.duracao; } };
})();
