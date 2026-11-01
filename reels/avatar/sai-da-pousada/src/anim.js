/*
 * FAZLO Hospeda — Reel avatar "Saí da pousada por duas horas" (1080×1920, 30 fps). Linha do tempo: linha.json.
 *
 * Este motor desenha só a CAMADA (PNG com transparência) que o render.cjs põe sobre midia/base-1080.mp4 (os 5 planos).
 * Um elemento novo por vez:
 *   P1  chip discreto "Personagem criada com IA" (0–3 s) · anel limão saindo do celular a cada vibração (2 pulsos até
 *       1,5 s) · chip "14:20 · fora da pousada" no alto · legenda.
 *   P2  balão 1 sai da tela do celular e segue o aparelho (rastreio da tela branca, quadro a quadro) · "digitando…"
 *       quando os polegares se mexem.
 *   P3  balão 2 · depois de ≥ 1,5 s legível, o selo "+6 mensagens" contando de 1 a 6.
 *   P4  na palavra "aqui": chave, comanda e moeda em traço limão, desenhando devagar nas laterais da cabeça; somem antes do corte.
 *   P5  só a legenda se mexe durante a fala ("não tira folga" em limão); ~1 s depois da última palavra entram juntas a
 *       chamada e a logo pequena, sobre o mesmo plano (sem fundo preto).
 * Legenda palavra por palavra no padrão do reel-09 (Inter Display 900, 68 px), abaixo do queixo, linhas em y 1440/1516,
 * fora dos 20 % de baixo e da coluna de botões (x 120–920). Grafia: "FAZLO Hospeda".
 */
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const C = { bg: '#0A0A0A', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2', ink: '#0A0A0A', bolha: '#141414' };
  const CAP = { size: 68, lh: 76, y1: 1440, maxW: 780, cx: 520, minPag: 1.2, segura: 0.7 };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3), inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x, s = 1.70158) => (x <= 0 ? 0 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  const TAU = Math.PI * 2;
  const css = (h, a = 1) => { const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return `rgba(${n[0]},${n[1]},${n[2]},${a})`; };
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));
  let M, LOGO, LN, EV, PL, BOXES = null, PAGES = [];
  const BOX = (nome, x0, y0, x1, y1) => { if (BOXES) BOXES.push({ nome, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) }); };
  function setFont(c, fam, size, weight, ls = 0) { c.font = `${weight} ${size}px ${fam}`; c.letterSpacing = `${ls}px`; }
  function tw(s, fam, size, weight, ls = 0) { setFont(M, fam, size, weight, ls); return M.measureText(s).width - (s.length ? ls : 0); }
  function txt(c, s, x, y, o = {}) {
    const fam = o.fam || DISPLAY, size = o.size || 40, weight = o.weight || 700, ls = o.ls || 0;
    const w = tw(s, fam, size, weight, ls), x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    c.save(); setFont(c, fam, size, weight, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.globalAlpha *= o.alpha ?? 1; c.fillStyle = o.color || C.white; c.fillText(s, x0, y); c.restore();
    return w;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
  function quebra(s, fam, size, weight, maxW) {                  // quebra de linha simples por palavras
    const ws = s.split(' '), out = []; let cur = '';
    for (const w of ws) { const tst = cur ? cur + ' ' + w : w; if (tw(tst, fam, size, weight) > maxW && cur) { out.push(cur); cur = w; } else cur = tst; }
    if (cur) out.push(cur); return out;
  }
  const plano = (t) => PL.find((q) => t >= q.t0 - 1e-6 && t < q.t1 - 1e-6) || PL[PL.length - 1];

  // ---------------------------------------------------------------- chips
  function chip(c, s, x, y, o = {}) {                            // pílula escura translúcida, contorno limão fino
    const size = o.size || 32, fam = o.fam || DISPLAY, weight = o.weight || 800, padX = o.padX || 22, h = o.h || size * 1.75;
    const w = tw(s, fam, size, weight, o.ls || 0) + 2 * padX + (o.ponto ? 26 : 0), x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    c.save(); c.globalAlpha *= o.alpha ?? 1;
    rr(c, x0, y, w, h, h / 2); c.fillStyle = o.fundo || 'rgba(10,10,10,0.72)'; c.fill();
    if (o.borda !== false) { c.strokeStyle = css(C.lime, o.bordaA ?? 0.85); c.lineWidth = 2.5; c.stroke(); }
    let tx = x0 + padX;
    if (o.ponto) { c.beginPath(); c.arc(tx + 7, y + h / 2, 7, 0, TAU); c.fillStyle = C.lime; c.fill(); tx += 26; }
    txt(c, s, tx, y + h / 2 + size * 0.36, { size, fam, weight, color: o.cor || C.white, ls: o.ls || 0 });
    c.restore(); BOX(o.nome || 'chip', x0, y, x0 + w, y + h);
    return { x0, w, h };
  }
  function p1(c, t) {
    // transparência: discreto, pequeno, no canto de cima; some aos 3 s
    const ia = p(t, EV.ia[0], EV.ia[0] + 0.25) * (1 - p(t, EV.ia[1] - 0.3, EV.ia[1]));
    if (ia > 0) chip(c, 'Personagem criada com IA', 48, 236, { size: 22, weight: 700, padX: 16, h: 40, alpha: 0.9 * ia, borda: false, cor: 'rgba(255,255,255,0.86)', fundo: 'rgba(10,10,10,0.55)', nome: 'chip-ia' });
    // o anel limão saindo do celular a cada vibração
    for (const tv of EV.vibra) {
      const u = p(t, tv, tv + 0.6);
      if (u <= 0 || u >= 1) continue;
      for (const [atraso, gA] of [[0, 1], [0.12, 0.55]]) {
        const v = p(t, tv + atraso, tv + atraso + 0.55); if (v <= 0 || v >= 1) continue;
        const r = lerp(70, 200, E.outCubic(v));
        c.save(); c.beginPath(); c.ellipse(PHONE1.x, PHONE1.y, r, r * 0.82, 0, 0, TAU);
        c.strokeStyle = css(C.lime, 0.95 * gA * (1 - v)); c.lineWidth = lerp(9, 2, v); c.shadowColor = C.lime; c.shadowBlur = 16; c.stroke(); c.restore();
      }
      BOX('anel', PHONE1.x - 200, PHONE1.y - 164, PHONE1.x + 200, PHONE1.y + 164);
    }
    // o chip do horário, no alto
    const e = E.outBack(p(t, EV.relogio, EV.relogio + 0.4), 1.5);
    if (e > 0) {
      c.save(); c.translate(0, (1 - e) * -24);
      chip(c, '14:20 · fora da pousada', 1032, 226, { size: 32, fam: DISPLAY, weight: 800, ponto: true, align: 'right', alpha: clamp(e * 1.6), nome: 'chip-relogio' });
      c.restore();
    }
  }
  const PHONE1 = { x: 452, y: 1366 };

  // ---------------------------------------------------------------- balões (genéricos, sem marca de app)
  function balao(c, linhas, hora, x, y, o = {}) {
    const size = o.size || 42, lh = size * 1.22, padX = 34, padY = 28;
    const wTxt = Math.max(...linhas.map((s) => tw(s, DISPLAY, size, 700))), w = wTxt + 2 * padX, h = linhas.length * lh + padY * 2 + 30;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
    // corpo + rabinho apontando para o celular
    const tx = o.rabo ? o.rabo[0] : x + w - 40, ty = o.rabo ? o.rabo[1] : y + h + 30;
    c.beginPath(); c.roundRect(x, y, w, h, 34); c.fillStyle = C.bolha; c.fill();
    const bx = clamp(tx, x + 50, x + w - 50);
    c.beginPath(); c.moveTo(bx - 26, y + h - 2); c.quadraticCurveTo(bx - 4, y + h + 6, tx, ty); c.quadraticCurveTo(bx + 4, y + h + 4, bx + 22, y + h - 2); c.closePath(); c.fill();
    c.shadowColor = 'transparent';
    c.beginPath(); c.roundRect(x, y, w, h, 34); c.strokeStyle = css(C.lime, 0.75); c.lineWidth = 2.5; c.stroke();
    linhas.forEach((s, i) => txt(c, s, x + padX, y + padY + size * 0.86 + i * lh, { size, weight: 700 }));
    txt(c, hora, x + w - padX + 6, y + h - 18, { fam: MONO, size: 22, weight: 700, color: C.gray, align: 'right' });
    c.restore();
    BOX(o.nome || 'balao', x, y, x + w, y + h);
    return { w, h };
  }
  function telaP2(t) {                                            // o centro de cima da tela do celular no P2 (rastreio)
    const T = LN.p2_tela, q = T.quadros, f = clamp((t - T.t0) * T.fps, 0, q.length - 1), i = Math.floor(f), a = f - i, b = q[Math.min(q.length - 1, i + 1)];
    return { x: lerp(q[i][0], b[0], a), y: lerp(q[i][1], b[1], a), x0: lerp(q[i][2], b[2], a), x1: lerp(q[i][3], b[3], a) };
  }
  let B1, B2;
  function p2(c, t) {
    const s = telaP2(t), e = p(t, EV.balao1, EV.balao1 + 0.5);
    if (e > 0) {
      const u = E.outBack(e, 1.25), dx = -B1.w + 70 + 40, dy = -B1.h - 70;            // posição final: em cima e à esquerda da tela
      const fx = s.x + dx, fy = s.y + dy, ox = s.x - B1.w / 2, oy = s.y + 120;      // sai do meio da tela
      c.save(); c.globalAlpha *= clamp(e * 3);
      const k = lerp(0.18, 1, u), x = lerp(ox, fx, u), y = lerp(oy, fy, u);
      c.translate(x + B1.w / 2, y + B1.h / 2); c.scale(k, k); c.translate(-(x + B1.w / 2), -(y + B1.h / 2));
      balao(c, B1.linhas, '14:21', x, y, { rabo: [s.x - 40, s.y + 18], nome: 'balao1' });
      c.restore();
    }
    const d = p(t, EV.digitando, EV.digitando + 0.3);
    if (d > 0) {                                                   // "digitando…" na própria tela, quando os polegares se mexem
      const w = 128, h = 62, x = s.x - w / 2 + 6, y = s.y + 70;
      c.save(); c.globalAlpha *= E.outCubic(d);
      c.translate(x + w / 2, y + h / 2); c.scale(lerp(0.6, 1, E.outBack(d, 2)), lerp(0.6, 1, E.outBack(d, 2))); c.translate(-(x + w / 2), -(y + h / 2));
      rr(c, x, y, w, h, h / 2); c.fillStyle = C.bolha; c.fill();
      for (let i = 0; i < 3; i++) {
        const ph = (t - EV.digitando) * 2.4 - i * 0.18, b = Math.max(0, Math.sin(ph * TAU)) ;
        c.beginPath(); c.arc(x + 36 + i * 28, y + h / 2 - 7 * b, 8, 0, TAU); c.fillStyle = css(C.lime, 0.55 + 0.45 * b); c.fill();
      }
      c.restore(); BOX('digitando', x, y, x + w, y + h);
    }
  }
  function p3(c, t) {
    const e = p(t, EV.balao2, EV.balao2 + 0.45);
    const x = 1036 - B2.w, y = 742;
    if (e > 0) {
      const u = E.outBack(e, 1.3);
      c.save(); c.globalAlpha *= clamp(e * 3);
      c.translate(x + B2.w - 60, y + B2.h + 40); c.scale(lerp(0.2, 1, u), lerp(0.2, 1, u)); c.translate(-(x + B2.w - 60), -(y + B2.h + 40));
      balao(c, B2.linhas, '14:23', x, y, { rabo: [900, 1110], nome: 'balao2' });
      c.restore();
    }
    const m = p(t, EV.mensagens, EV.mensagens + 0.3);
    if (m > 0) {                                                   // o selo: conta de 1 a 6
      const n = Math.min(6, 1 + Math.floor((t - EV.mensagens) / 0.17)), s = `+${n} ${n === 1 ? 'mensagem' : 'mensagens'}`;
      const tk = kick(t, EV.mensagens + (n - 1) * 0.17, 0.16);
      const size = 32, w = tw('+6 mensagens', DISPLAY, size, 900) + 44, h = 58, cx = x + B2.w - w / 2 + 14, cy = y - 10;
      c.save(); c.globalAlpha *= clamp(m * 3);
      c.translate(cx, cy); const k = E.outBack(m, 2) * (1 + 0.08 * tk); c.scale(k, k);
      c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
      rr(c, -w / 2, -h / 2, w, h, h / 2); c.fillStyle = C.lime; c.fill(); c.shadowColor = 'transparent';
      txt(c, s, 0, size * 0.36, { size, weight: 900, color: C.ink, align: 'center' });
      c.restore(); BOX('selo', cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    }
  }

  // ---------------------------------------------------------------- P4: os três ícones de linha
  function arco(cx, cy, r, a0, a1, n = 40) { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; }
  const ICONES = {
    chave: [arco(-34, -34, 30, Math.PI * 0.25, Math.PI * 2.25, 48), arco(-34, -34, 10, 0, TAU, 24), [[-13, -13], [48, 48]], [[30, 30], [14, 46]], [[42, 42], [28, 56]]],
    comanda: [[[-40, -56], [40, -56], [40, 50], [27, 60], [14, 50], [0, 60], [-14, 50], [-27, 60], [-40, 50], [-40, -56]], [[-22, -30], [22, -30]], [[-22, -8], [22, -8]], [[-22, 14], [6, 14]]],
    moeda: [arco(0, 0, 54, -Math.PI / 2, Math.PI * 1.5, 60), arco(0, 0, 40, -Math.PI / 2, Math.PI * 1.5, 50),
      [[14, -16], [8, -21], [-6, -21], [-14, -14], [-12, -4], [12, 4], [15, 14], [8, 21], [-6, 21], [-14, 16]], [[0, -30], [0, -21]], [[0, 21], [0, 30]]],
  };
  const comp = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  function icone(c, nome, cx, cy, k, u, a) {                     // desenha a fração u do traço, em ordem
    const tr = ICONES[nome], tot = tr.reduce((s, q) => s + comp(q), 0); let resto = u * tot;
    const passe = (cor, lw, blur) => {
      let r = resto;
      c.save(); c.translate(cx, cy); c.scale(k, k); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = cor; c.lineWidth = lw / k; c.shadowColor = blur ? C.lime : 'transparent'; c.shadowBlur = blur;
      for (const q of tr) {
        if (r <= 0) break;
        c.beginPath(); c.moveTo(q[0][0], q[0][1]);
        for (let i = 1; i < q.length && r > 0; i++) {
          const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
          if (d <= r) { c.lineTo(q[i][0], q[i][1]); r -= d; } else { const f = r / d; c.lineTo(lerp(q[i - 1][0], q[i][0], f), lerp(q[i - 1][1], q[i][1], f)); r = 0; }
        }
        c.stroke();
      }
      c.restore();
    };
    c.save(); c.globalAlpha *= a;
    passe('rgba(0,0,0,0.45)', 13, 0);                             // halo escuro: lê sobre o cabelo e sobre a janela clara
    passe(C.lime, 6, 10);
    c.restore();
    BOX('icone-' + nome, cx - 62 * k, cy - 62 * k, cx + 62 * k, cy + 62 * k);
  }
  const ICO_POS = [['chave', 128, 500, 0], ['comanda', 966, 480, 0.06], ['moeda', 126, 790, 0.12]];
  function p4(c, t) {
    const t0 = EV.aqui, sai = 1 - p(t, PL[3].t1 - 0.22, PL[3].t1 - 0.04);   // somem antes do corte
    if (t < t0 || sai <= 0) return;
    for (const [nome, x, y, atraso] of ICO_POS) {
      const u = E.inOutSine(p(t, t0 + atraso, t0 + atraso + 0.5));
      if (u > 0) icone(c, nome, x, y, 1.2, u, sai);
    }
  }

  // ---------------------------------------------------------------- P5: a chamada e a logo, sobre o mesmo plano
  let CHAMADA;
  function p5(c, t) {
    const t0 = EV.chamada, e = p(t, t0, t0 + 0.45);
    if (e <= 0) return;
    const u = E.outCubic(e);
    const g = c.createLinearGradient(0, 1040, 0, 1640);              // véu suave só embaixo (não é fundo preto)
    g.addColorStop(0, 'rgba(10,10,10,0)'); g.addColorStop(0.35, `rgba(10,10,10,${0.62 * u})`); g.addColorStop(0.8, `rgba(10,10,10,${0.7 * u})`); g.addColorStop(1, 'rgba(10,10,10,0)');
    c.fillStyle = g; c.fillRect(0, 1040, W, 600);
    c.save(); c.globalAlpha *= u; c.translate(0, (1 - u) * 22);
    const ls = CHAMADA, size = 58, lh = 68, y0 = 1312;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 14; c.shadowOffsetY = 2;
    ls.forEach((s, i) => {
      const w = tw(s, DISPLAY, size, 900, -1.2), x = CAP.cx - w / 2;
      txt(c, s, x, y0 + i * lh, { size, weight: 900, ls: -1.2 });
      BOX('chamada', x, y0 + i * lh - size * 0.76, x + w, y0 + i * lh + size * 0.22);
    });
    c.restore();
    // a logo pequena: o ícone e "FAZLO Hospeda"
    const D = 66, NS = 36, w1 = tw('FAZLO ', DISPLAY, NS, 900, -0.8), w2 = tw('Hospeda', DISPLAY, NS, 700, -0.8), tot = D + 14 + w1 + w2, lx = CAP.cx - tot / 2, ly = 1190;
    c.drawImage(LOGO, lx, ly, D, D);
    txt(c, 'FAZLO ', lx + D + 14, ly + D / 2 + NS * 0.36, { size: NS, weight: 900, ls: -0.8 });
    txt(c, 'Hospeda', lx + D + 14 + w1, ly + D / 2 + NS * 0.36, { size: NS, weight: 700, color: C.lime, ls: -0.8 });
    BOX('logo', lx, ly, lx + tot, ly + D);
    c.restore();
  }

  // ---------------------------------------------------------------- legenda palavra por palavra (o motor do reel-09 / Dona Maria)
  function layoutLegenda() {
    PAGES = [];
    const wid = (ws, a, b) => tw(ws.slice(a, b).map((x) => x.w).join(' '), DISPLAY, CAP.size, 900, -0.02 * CAP.size);
    const FR = LN.frases.map((f) => ({ clipe: f.clipe, palavras: f.palavras.slice() }));
    FR.forEach((f, fi) => {
      const ws = f.palavras, n = ws.length, prox = FR[fi + 1] ? FR[fi + 1].palavras[0].t0 : LN.duracao;
      const cabe = (a, b) => { if (wid(ws, a, b) <= CAP.maxW) return true; for (let k = a + 1; k < b; k++) if (wid(ws, a, k) <= CAP.maxW && wid(ws, k, b) <= CAP.maxW) return true; return false; };
      const ligacao = /^(o|a|os|as|do|da|no|na|de|e|é|já|um|uma|se|eu|que|só|não)$/i;
      const custoCorte = (j) => (j === n ? 0 : (/[,.:;?!]$/.test(ws[j - 1].w) ? 0 : 3) + (ligacao.test(ws[j - 1].w) ? 6 : 0) + (ws[j - 1].chave && ws[j] && ws[j].chave ? 20 : 0));
      const best = Array(n + 1).fill(null); best[0] = { c: 0, prev: -1 };
      for (let j = 1; j <= n; j++) for (let i = 0; i < j; i++) {
        if (!best[i] || !cabe(i, j)) continue;
        const curta = (j < n ? ws[j].t0 : ws[n - 1].t1 + 0.5) - ws[i].t0 < CAP.minPag ? 8 : 0;
        const c = { c: best[i].c + custoCorte(j) + 10 + curta, prev: i };
        if (!best[j] || c.c < best[j].c) best[j] = c;
      }
      const pages = []; for (let j = n; j > 0; j = best[j].prev) pages.unshift([best[j].prev, j]);
      pages.forEach(([a, b]) => {
        const n = b - a; let brk = n;
        if (wid(ws, a, b) > CAP.maxW) {
          let bm = 1e9;
          for (let k = 1; k < n; k++) {
            const mx = Math.max(wid(ws, a, a + k), wid(ws, a + k, b));
            const m = mx + ((k === 1 || n - k === 1) && n > 2 ? 300 : 0) - (/[,.]$/.test(ws[a + k - 1].w) ? 250 : 0) + (ws[a + k - 1].chave && ws[a + k].chave ? 400 : 0) + (ligacao.test(ws[a + k - 1].w) ? 260 : 0);   // a linha não termina em palavra de ligação
            if (m < bm && mx <= CAP.maxW) { bm = m; brk = k; }
          }
        }
        const rows = brk >= n ? [[a, b]] : [[a, a + brk], [a + brk, b]], pos = {};
        rows.forEach(([r0, r1], ri) => { let x = CAP.cx - wid(ws, r0, r1) / 2; for (let k = r0; k < r1; k++) { pos[k] = { x, row: ri }; x += tw(ws[k].w + ' ', DISPLAY, CAP.size, 900, -0.02 * CAP.size) - 0.02 * CAP.size; } });
        PAGES.push({ a, b, rows, pos, nrows: rows.length, t0: ws[a].t0, words: ws, fimFala: ws[b - 1].t1, prox, clipe: f.clipe });
      });
    });
    PAGES.forEach((q, i) => {
      const nx = PAGES[i + 1] && PAGES[i + 1].prox === q.prox ? PAGES[i + 1].t0 : q.prox;
      const fimPlano = PL.find((pl) => q.t0 >= pl.t0 && q.t0 < pl.t1).t1;
      q.t1 = Math.min(nx, Math.max(q.fimFala + CAP.segura, Math.min(q.t0 + CAP.minPag, nx)), fimPlano - 0.04, q.clipe === 'p5' ? EV.chamada - 0.2 : 1e9);
    });
  }
  function legenda(c, t) {
    const pg = PAGES.find((q) => t >= q.t0 && t < q.t1);
    if (!pg) return;
    const y0 = CAP.y1 + (pg.nrows === 1 ? CAP.lh / 2 : 0), ls = -0.02 * CAP.size;
    // véu escuro suave atrás da legenda (a camisa branca e o casaco claro pedem mais contraste que no Reel da Dona Maria)
    const top = y0 - 72, bot = y0 + (pg.nrows - 1) * CAP.lh + 30;
    const g = c.createLinearGradient(0, top - 50, 0, bot + 50);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(0,0,0,0.5)'); g.addColorStop(0.7, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, top - 50, W, bot - top + 100);
    for (let k = pg.a; k < pg.b; k++) {
      const w = pg.words[k];
      if (t < w.t0) continue;
      const u = E.outCubic(p(t, w.t0, w.t0 + 0.09)), ps = pg.pos[k], ww = tw(w.w, DISPLAY, CAP.size, 900, ls);
      const pop = w.chave ? 1 + 0.07 * kick(t, w.t0, 0.18) : 1, y = y0 + ps.row * CAP.lh + (1 - u) * 10;
      c.save(); setFont(c, DISPLAY, CAP.size, 900, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.globalAlpha = u;
      c.translate(ps.x + ww / 2, y - CAP.size * 0.3); c.scale(pop, pop);
      c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 18; c.shadowOffsetY = 2; c.fillStyle = w.chave ? C.lime : C.white; c.fillText(w.w, -ww / 2, CAP.size * 0.3);
      c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 5; c.fillText(w.w, -ww / 2, CAP.size * 0.3);
      c.restore();
      if (u > 0.99) BOX('legenda', ps.x, y - CAP.size * 0.76, ps.x + ww, y + CAP.size * 0.22);
    }
  }

  // ---------------------------------------------------------------- o quadro (a camada)
  function frame(c, t) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowColor = 'transparent'; c.clearRect(0, 0, W, H);
    const pl = plano(t).id;
    if (pl === 'p1') p1(c, t);
    else if (pl === 'p2') p2(c, t);
    else if (pl === 'p3') p3(c, t);
    else if (pl === 'p4') p4(c, t);
    else if (pl === 'p5') p5(c, t);
    legenda(c, t);
  }
  // capa da grade: um quadro do P1 (ela olhando a câmera, com o celular), escurecido, e o título centralizado em y = 960
  function capaGrade(c, img) {
    BOXES = [];
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, W, H);
    const k = 1.0, iw = W * k, ih = H * k, ix = 0, iy = 40;                         // o rosto inteiro no recorte 3:4, acima do título
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    c.drawImage(img, ix, iy, iw, ih);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(10,10,10,0.45)'); g.addColorStop(0.38, 'rgba(10,10,10,0.55)'); g.addColorStop(0.5, 'rgba(10,10,10,0.78)'); g.addColorStop(0.72, 'rgba(10,10,10,0.82)'); g.addColorStop(1, 'rgba(10,10,10,0.9)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const L = [['Saí da pousada', C.white], ['por duas horas.', C.lime]], size = 104, lh = 116;
    const alt = (L.length - 1) * lh + size * 0.98, topo = 960 - alt / 2;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 24;
    L.forEach(([s, cor], i) => {
      const y = topo + size * 0.76 + i * lh, w = tw(s, DISPLAY, size, 900, -3);
      txt(c, s, 540, y, { size, weight: 900, color: cor, align: 'center', ls: -3 });
      BOX('titulo', 540 - w / 2, y - size * 0.76, 540 + w / 2, y + size * 0.22);
    });
    c.restore();
    const bx = BOXES.filter((b) => b.nome === 'titulo'), bl = { topo: Math.min(...bx.map((b) => b.y0)), base: Math.max(...bx.map((b) => b.y1)) };
    bl.centro = (bl.topo + bl.base) / 2;
    const caixas = [{ nome: 'titulo', x0: Math.min(...bx.map((b) => b.x0)), x1: Math.max(...bx.map((b) => b.x1)), y0: bl.topo, y1: bl.base }];
    BOXES = null;
    return { caixas, bloco: bl };
  }
  function init(logoImg, linha) {
    LOGO = logoImg; LN = linha; EV = linha.eventos; PL = linha.planos; M = document.createElement('canvas').getContext('2d');
    B1 = { linhas: ['O casal do chalé 3 chegou.', 'Qual chave eu entrego?'] }; B1.w = Math.max(...B1.linhas.map((s) => tw(s, DISPLAY, 42, 700))) + 68; B1.h = B1.linhas.length * 42 * 1.22 + 86;
    B2 = { linhas: ['Quanto eu cobro do', 'pessoal que está saindo?'] }; B2.w = Math.max(...B2.linhas.map((s) => tw(s, DISPLAY, 42, 700))) + 68; B2.h = B2.linhas.length * 42 * 1.22 + 86;
    CHAMADA = ['Manda pra quem não consegue', 'sair da pousada', 'nem por uma tarde.'];
    layoutLegenda();
  }
  function caixas(c, t) { BOXES = []; frame(c, t); const out = BOXES; BOXES = null; return out; }
  window.REEL = { init, frame, caixas, capaGrade, get DURATION() { return LN.duracao; },
    legenda: () => PAGES.map((q) => ({ t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.w).join(' ')),
      palavras: Array.from({ length: q.b - q.a }, (_, i) => ({ w: q.words[q.a + i].w, t0: q.words[q.a + i].t0, chave: !!q.words[q.a + i].chave })) })) };
})();
