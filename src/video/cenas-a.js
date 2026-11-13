// cenas-a.js — ATO 1 (caos): gancho, sexta, vaga, quarto, conta, caixa, respira
'use strict';
const G = {};      // geometria pré-calculada
let REG = null;    // registro de textos para QA (null = desligado)

// ---------------------------------------------------------------- texto
// registra a caixa de um texto (coordenadas de tela) para o QA
function registra(ctx, id, nPal, txt, x, y, visivel) {
  if (!REG || !visivel) return;
  const al = ctx.textAlign; ctx.textAlign = 'left';
  const b = caixaTexto(ctx, txt);
  ctx.textAlign = al;
  const m = ctx.getTransform();
  const cs = [[x - b.l, y - b.asc], [x + b.r, y - b.asc], [x - b.l, y + b.desc], [x + b.r, y + b.desc]].map(([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]);
  const xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]);
  REG.push({ id, nPal, txt, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
}

// palavra com máscara; aceita "parte|sufixo" para colorir o sufixo com corAlt
function palavraMascara2(ctx, txt, x, y, tam, p, q, cor, corAlt) {
  if (p <= 0 || q >= 1) return;
  const [a, b] = txt.split('|');
  const asc = tam * 1.12, desc = tam * 0.36;
  const wa = largura(ctx, a), wt = wa + (b ? largura(ctx, b) : 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - tam * 0.25, y - asc, wt + tam * 0.5, asc + desc);
  ctx.clip();
  const dy = (1 - E.outQt(p)) * (asc + desc) * 0.92 - E.inC(q) * (asc + desc);
  ctx.fillStyle = cor;
  ctx.fillText(a, x, y + dy);
  if (b) { ctx.fillStyle = corAlt || cor; ctx.fillText(b, x + wa, y + dy); }
  ctx.restore();
}

// bloco de texto com revelação palavra a palavra e destaque em pílula
function blocoTexto(ctx, t, c) {
  const peso = c.peso ?? 800, track = c.track ?? -0.045;
  fonte(ctx, peso, c.tam, c.fam ?? 'Geist', track);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const lh = c.lh ?? 1.1;
  const dur = c.dur ?? 0.42;
  const L = c.linhas.map((l) => layoutPalavras(ctx, l.replace(/\|/g, '')));
  if (c.destaque) {
    const padX = c.tam * 0.2;
    for (const lin of L) {
      let sh = 0;
      for (const pw of lin.palavras) {
        const d = c.destaque.palavras.includes(pw.p);
        if (d && pw.x > 0) sh += padX * 0.85;
        pw.x += sh;
        if (d) sh += padX * 0.85;
      }
      lin.w += sh;
    }
  }
  const total = L.reduce((s, l) => s + l.palavras.length, 0);
  let k = 0;
  L.forEach((lin, li) => {
    const y = c.y + li * c.tam * lh;
    const x0 = c.alinha === 'center' ? c.x - lin.w / 2 : c.alinha === 'right' ? c.x - lin.w : c.x;
    const brutas = c.linhas[li].split(' ');
    lin.palavras.forEach((pw, wi) => {
      const bruta = brutas[wi];
      const te = c.entra[Math.min(k, c.entra.length - 1)];
      const p = prog(t, te, te + dur);
      const ts = (c.sai ?? 1e9) + k * (c.saiPasso ?? 0.03);
      const q = prog(t, ts, ts + (c.saiDur ?? 0.28));
      const d = c.destaque && c.destaque.palavras.includes(pw.p) ? c.destaque : null;
      if (d) {
        const pe = E.outQt(prog(t, d.entra, d.entra + 0.32));
        const ps = E.inC(q);
        if (pe > 0 && ps < 1) {
          const padX = c.tam * 0.2, h = c.tam * 1.08;
          const x = x0 + pw.x - padX, yy = y - c.tam * 0.8;
          const wFull = pw.w + padX * 2;
          ctx.fillStyle = d.cor;
          if (d.desenhoPilula) d.desenhoPilula(ctx, x, yy, wFull, h, pe, ps);
          else { retRed(ctx, x + wFull * ps, yy, Math.max(h * 0.2, wFull * pe * (1 - ps)), h, h / 2); ctx.fill(); }
          if (c.onPilula) c.onPilula({ x, y: yy, w: wFull, h });
        }
      }
      palavraMascara2(ctx, bruta, x0 + pw.x, y, c.tam, p, q, d ? d.corTexto : c.cor, c.corAlt);
      registra(ctx, c.id, total, pw.p, x0 + pw.x, y, p > 0.5 && q < 0.5);
      k++;
    });
  });
  return L;
}

// ---------------------------------------------------------------- geometria
function iniciaGeometriaA(ctx) {
  const ry = (x) => 650 + (x - 540) * (280 / 330);
  G.casa = [[540, 650], [735, ry(735)], [735, 725], [800, 725], [800, ry(800)], [870, 930], [870, 1330], [210, 1330], [210, 930]];
  const pts = poissonPoligono(G.casa, 45, 25, 7, 9000);
  const r = rng(11);
  G.bolas = pts.map((p) => {
    const dx = p[0] - 540, dy = p[1] - 1040;
    return { x: p[0], y: p[1], r: 13 + r() * 6, branca: r() < 0.24, d: 0.85 + r() * 0.3, s: r() * 100, ang: Math.atan2(dy, dx), dist: Math.hypot(dx, dy), anel: -1 };
  });
  // 60 bolas viram os marcadores do relógio (ordenadas por ângulo)
  const idx = G.bolas.map((b, i) => i).sort((a, b) => G.bolas[a].dist - G.bolas[b].dist);
  const escolhidas = idx.filter((_, i) => i % Math.floor(G.bolas.length / 60) === 0).slice(0, 60);
  escolhidas.sort((a, b) => G.bolas[a].ang - G.bolas[b].ang);
  // alinhar o ângulo do primeiro com -90°
  escolhidas.forEach((bi, k) => { G.bolas[bi].anel = k; });
  // alvo de zoom: centro do traço esquerdo do "0" (Geist Mono 700, 220px)
  const oc = document.createElement('canvas'); oc.width = 400; oc.height = 400;
  const o = oc.getContext('2d');
  fonte(o, 700, 220, 'mono', 0);
  o.textAlign = 'center'; o.fillStyle = '#000'; o.fillText('0', 200, 300);
  const yy = Math.round(300 - 0.36 * 220);
  const row = o.getImageData(0, yy, 400, 1).data;
  let a = -1, b = -1;
  for (let x = 0; x < 400; x++) { const al = row[x * 4 + 3]; if (al > 200 && a < 0) a = x; if (a >= 0 && al < 60) { b = x; break; } }
  G.zeroAlvo = [((a + b) / 2) - 200, yy - 300];
  // ondas de perguntas (cena vaga)
  G.perguntas = [
    ['Tem café da manhã?', 270, 430, 40, -3],
    ['Ainda tem quarto?', 730, 395, 42, 3],
    ['Tem vaga dia 14?', 330, 580, 44, 2],
    ['Aceita pet?', 790, 590, 48, -4],
    ['Quanto fica?', 330, 1135, 50, -2],
    ['E pro feriado?', 750, 1120, 42, 3],
    ['Pode chegar 22h?', 320, 1275, 42, 3],
    ['Tem vaga?', 740, 1265, 54, -4],
    ['Tem pra 4?', 300, 1415, 46, -2],
    ['Tem vaga?', 690, 1430, 44, 2],
  ];
  // pilha de comandas
  const rp = rng(5);
  G.comandas = [];
  for (let i = 0; i < 7; i++) {
    G.comandas.push({ x: 540 + (i === 0 ? 0 : (rp() - 0.5) * 150), y: 1270 - i * 56, rot: i === 0 ? -0.03 : (rp() - 0.5) * 0.42, r0: (rp() - 0.5) * 1.6, linhas: [0.5 + rp() * 0.35, 0.35 + rp() * 0.4, 0.55 + rp() * 0.3, 0.3 + rp() * 0.4] });
  }
  // detritos do vórtice
  const rv = rng(23);
  G.detritos = [];
  for (let i = 0; i < 46; i++) G.detritos.push({ tipo: i % 5, a0: rv() * Math.PI * 2, r0: 900 + rv() * 900, s: 0.5 + rv() * 0.9, rot: rv() * 6, cor: rv() < 0.55 ? COR.tinta : COR.limao, atraso: rv() * 0.35 });
  // poeira
  const rd = rng(31);
  G.poeira = [];
  for (let i = 0; i < 60; i++) G.poeira.push({ x: rd() * W, y: rd() * H, r: 2 + rd() * 5, v: 15 + rd() * 45, d: 0.5 + rd(), f: rd() * 10 });
}

// ---------------------------------------------------------------- casa com bojo
function casaBojo(ctx, poly, bojo, ox = 540, oy = 1040) {
  ctx.beginPath();
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    let nx = dy / L, ny = -dx / L;
    if (nx * (mx - ox) + ny * (my - oy) < 0) { nx = -nx; ny = -ny; }
    const k = bojo * Math.min(1, L / 420);
    if (i === 0) ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(mx + nx * k * 2, my + ny * k * 2, b[0], b[1]);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- HUD (dia + hora rolando)
const HUD_KF = [[bar(4), 1300], [bar(6), 2090], [bar(8), 2670], [bar(10), 4310]];
function hudMinutos(t) {
  let m = HUD_KF[0][1];
  for (let i = 1; i < HUD_KF.length; i++) {
    const [tk, mk] = HUD_KF[i];
    m = lerp(m, mk, E.ioC(prog(t, tk - 0.08, tk + 0.42)));
  }
  return m;
}
function fmtHora(M) {
  const d = Math.floor(M / 1440), r = ((M % 1440) + 1440) % 1440;
  const h = Math.floor(r / 60), mi = Math.floor(r % 60);
  return { dia: ['SEX', 'SÁB', 'DOM', 'SEG'][d] || 'DOM', hh: String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') };
}
// desenha string de dígitos rolando entre s0 e s1 com fração f (caracteres iguais ficam parados)
function digitosRolando(ctx, s0, s1, f, x, y, tam, adv, blur = 0, clipH = 1.25) {
  ctx.textAlign = 'center';
  for (let j = 0; j < s0.length; j++) {
    const cx = x + adv * (j + 0.5);
    if (s0[j] === s1[j] || f <= 0) { ctx.fillText(s0[j], cx, y); continue; }
    const passo = tam * 1.05;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - adv * 0.6, y - tam * 0.92, adv * 1.2, tam * clipH); ctx.clip();
    const ff = E.ioC(f);
    ctx.fillText(s0[j], cx, y - ff * passo);
    ctx.fillText(s1[j], cx, y + (1 - ff) * passo);
    if (blur > 0.05) {
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.25 * blur;
      ctx.fillText(s0[j], cx, y - ff * passo + blur * tam * 0.2);
      ctx.fillText(s1[j], cx, y + (1 - ff) * passo - blur * tam * 0.2);
      ctx.globalAlpha = a;
    }
    ctx.restore();
  }
  ctx.textAlign = 'left';
}
function hud(ctx, t, cor, alfa = 1) {
  const ini = bar(4) + 0.12;
  if (t < ini) return;
  const m = hudMinutos(t);
  const M = Math.floor(m), f = m - M;
  const a = fmtHora(M), b = fmtHora(M + 1);
  const vel = Math.abs(hudMinutos(t + 0.01) - hudMinutos(t - 0.01)) / 0.02;
  ctx.save();
  ctx.globalAlpha = alfa * E.outC(prog(t, ini, ini + 0.25));
  fonte(ctx, 600, 38, 'mono', 0.02);
  ctx.fillStyle = cor;
  const x = 84, y = 290;
  // ponto pulsando
  circulo(ctx, x + 9, y - 13, 9 * (0.75 + 0.25 * pulso(t, 0.2))); ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillText(a.dia, x + 32, y);
  const adv = largura(ctx, '0');
  digitosRolando(ctx, a.hh, b.hh, f, x + 32 + largura(ctx, 'SÁB') + adv * 0.6, y, 38, adv, clamp(vel / 300));
  registra(ctx, 'hud', 2, a.dia + ' ' + a.hh, x + 32, y, true);
  ctx.restore();
}

// ================================================================ CENA 0 — GANCHO
function cenaGancho(ctx, t) {
  ctx.fillStyle = COR.tinta; ctx.fillRect(0, 0, W, H);
  const P = pulso(t, 0.13);
  const tens = prog(t, 0, 3.6);
  const ant = E.inC(prog(t, 3.5, bar(2)));
  const s = 1 + 0.035 * E.ioSine(prog(t, 0, bar(2))) - 0.035 * ant;
  ctx.save();
  camera(ctx, 540, 990, s, -0.012 * E.ioSine(prog(t, 0, bar(2))), 540, 990);

  // fumaça de bolinhas saindo pela chaminé
  for (let i = -3; i < 16; i++) {
    const ts = 0.12 + i * BEAT / 2;
    const tau = t - ts;
    if (tau < 0 || tau > 0.95) continue;
    const r = rng(100 + i + 50);
    const vx = 230 + 150 * r(), vy = -430 - 120 * r();
    const x = 767 + vx * tau, y = 722 + vy * tau + 0.5 * 1300 * tau * tau;
    ctx.globalAlpha = 1 - Math.pow(tau / 0.95, 2);
    ctx.fillStyle = i % 3 === 0 ? COR.branco : COR.limao;
    circulo(ctx, x, y, 14 * (1 - 0.55 * tau / 0.95)); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // bolinhas (hóspedes) espremidas dentro da casa
  for (const b of G.bolas) {
    const amp = 2.5 + 5 * P + 3 * tens;
    const push = (P * 9 + 5 * tens) * (b.dist / 350) - ant * 18 * (b.dist / 350);
    const x = b.x + Math.cos(b.ang) * push + ruido(t * 4 + b.s, b.s) * amp;
    const y = b.y + Math.sin(b.ang) * push + ruido(t * 4.3 + b.s + 3, b.s + 1) * amp;
    ctx.fillStyle = b.branca ? COR.branco : COR.limao;
    circulo(ctx, x, y, b.r * (1 + 0.07 * P)); ctx.fill();
  }

  // contorno da casa respirando no bumbo
  ctx.strokeStyle = COR.limao; ctx.lineWidth = 14; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  casaBojo(ctx, G.casa, 5 + 16 * P + 9 * tens - 14 * ant);
  ctx.stroke();

  // título com tremida por letra
  const tam = 160;
  fonte(ctx, 800, tam, 'Geist', -0.045);
  const Lt = layoutLetras(ctx, 'Casa cheia.');
  const x0 = 540 - Lt.w / 2, yb = 568;
  ctx.fillStyle = COR.branco;
  const nb = Math.floor(t / BEAT);
  Lt.letras.forEach((l, i) => {
    const j = -P * 9 * Math.sin(i * 1.9 + nb * 2.3) * smooth(clamp(t / 0.3));
    ctx.fillText(l.c, x0 + l.x, yb + j);
  });
  registra(ctx, 'gancho.titulo', 2, 'Casa cheia.', x0, yb, true);

  // pílula "E agora?" balançando nas palmas
  let rot = 0, esc = 1;
  for (let k = 0; k < 8; k++) {
    const tc = BEAT * (1 + 2 * k);
    if (t >= tc) { const d = t - tc; rot += 0.075 * Math.exp(-d / 0.18) * Math.sin(d * 30); esc += 0.06 * Math.exp(-d / 0.09); }
  }
  ctx.save();
  ctx.translate(540, 1452); ctx.rotate(rot); ctx.scale(esc, esc);
  fonte(ctx, 750, 80, 'Geist', -0.03);
  const wp = largura(ctx, 'E agora?');
  ctx.fillStyle = COR.limao; retRed(ctx, -wp / 2 - 50, -64, wp + 100, 128, 64); ctx.fill();
  ctx.fillStyle = COR.tinta; ctx.textAlign = 'center';
  ctx.fillText('E agora?', 0, 28);
  ctx.textAlign = 'left';
  registra(ctx, 'gancho.pergunta', 2, 'E agora?', -wp / 2, 28, true);
  ctx.restore();

  ctx.restore();
}

// ================================================================ CENA 1 — SEXTA 18:00
function relogioMin(t) { return lerp(867, 1080, E.outQt(prog(t, 3.93, bar(2) + BEAT * 2))); }
function cenaSexta(ctx, t) {
  const t0 = bar(2), tau = t - t0;
  ctx.fillStyle = COR.off; ctx.fillRect(0, 0, W, H);
  const pz = prog(t, bar(4) - 0.4, bar(4));
  const zoom = Math.exp(Math.log(90) * E.inC(pz));
  ctx.save();
  const s = 1 + 0.045 * E.ioSine(prog(t, t0, bar(4)));
  // posição de tela do alvo (traço do último "0")
  fonte(ctx, 700, 220, 'mono', 0);
  const adv = largura(ctx, '0');
  const xD = 540 - adv * 2.5, yD = 1040;
  const alvo = [xD + adv * 4.5 + G.zeroAlvo[0], yD + G.zeroAlvo[1]];
  const ax = 540 + (alvo[0] - 540) * s, ay = 960 + (alvo[1] - 960) * s;
  ctx.translate(lerp(ax, 540, E.inC(pz)), lerp(ay, 960, E.inC(pz)));
  ctx.scale(zoom, zoom);
  ctx.translate(-ax, -ay);
  camera(ctx, 540, 960, s, 0.02 * E.ioSine(prog(t, t0, bar(4))));

  // explosão das bolinhas + formação do anel do relógio
  const rotAnel = tau * 0.1;
  const varre = -Math.PI / 2 + Math.max(0, t - (t0 + BEAT * 2)) / BAR * Math.PI * 2;
  for (const b of G.bolas) {
    const dx = Math.cos(b.ang), dy = Math.sin(b.ang);
    const ex = E.outC(prog(tau, 0, 0.55));
    if (b.anel >= 0) {
      const pe = [b.x + dx * (b.dist * 1.2 + 260) * ex, b.y + dy * (b.dist * 1.2 + 260) * ex];
      const a = -Math.PI / 2 + b.anel * (Math.PI * 2 / 60) + rotAnel;
      const g = E.ioC(prog(tau, 0.3, 0.98));
      const grande = b.anel % 5 === 0;
      const ra = [540 + Math.cos(a) * 400, 960 + Math.sin(a) * 400];
      const x = lerp(pe[0], ra[0], g), y = lerp(pe[1], ra[1], g);
      let dif = ((varre - a) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
      const aceso = t > t0 + BEAT * 2 ? Math.exp(-dif / 0.5) : 0;
      const rr = lerp(b.r * (1 + 0.8 * ex), grande ? 12 : 7, g) * (1 + 0.5 * aceso);
      ctx.fillStyle = aceso > 0.3 ? COR.limao : (g < 0.5 && !b.branca ? COR.limao : COR.tinta);
      circulo(ctx, x, y, rr); ctx.fill();
      if (aceso > 0.3) { ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2.5; ctx.stroke(); }
    } else {
      const k = E.outC(prog(tau, 0, 0.75));
      const x = b.x + dx * (b.dist * 2.6 + 700) * k, y = b.y + dy * (b.dist * 2.6 + 700) * k;
      const al = 1 - prog(tau, 0.35, 0.75);
      if (al <= 0) continue;
      ctx.globalAlpha = al;
      ctx.fillStyle = b.branca ? COR.tinta : COR.limao;
      circulo(ctx, x, y, b.r * (1 + 1.8 * k)); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // cometa do ponteiro
  if (t > t0 + BEAT * 2) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = COR.limao; ctx.globalAlpha = (1 - i / 14) * 0.9;
      ctx.lineWidth = 14 - i * 0.6;
      ctx.beginPath(); ctx.arc(540, 960, 445, varre - (i + 1) * 0.045, varre - i * 0.045); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // dígitos "18:00" rolando (odômetro)
  const pin = E.outBack(prog(tau, 0, 0.22));
  const m = relogioMin(t);
  const M = Math.floor(m), f = m - M;
  const vel = (relogioMin(t + 0.005) - relogioMin(t - 0.005)) / 0.01;
  const tl = t - (t0 + BEAT * 2);
  const quica = tl > 0 ? 16 * Math.exp(-tl / 0.12) * Math.sin(tl * 32) : 0;
  const h0 = fmtHora(M).hh, h1 = fmtHora(M + 1).hh;
  ctx.save();
  const bate = 1 + 0.03 * pulso(t, 0.1) * (t > t0 + BEAT * 2 ? 1 : 0);
  ctx.translate(540, 960); ctx.scale(pin * bate, pin * bate); ctx.translate(-540, -960);
  ctx.fillStyle = COR.tinta;
  fonte(ctx, 700, 220, 'mono', 0);
  const pisca = t > t0 + BEAT * 2 ? (((t - t0) / BEAT) % 1 < 0.5 ? 1 : 0.25) : 1;
  // dois pontos piscando: desenhar dígitos sem o ':' e depois o ':' com alfa
  const s0 = h0.replace(':', ' '), s1 = h1.replace(':', ' ');
  digitosRolando(ctx, s0, s1, f, xD, yD + quica, 220, adv, clamp(vel / 120), 1.2);
  ctx.globalAlpha = pisca; ctx.textAlign = 'center'; ctx.fillText(':', xD + adv * 2.5, yD + quica); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  if (tl > 0) registra(ctx, 'sexta.relogio', 2, '18:00', xD, yD, true);
  ctx.restore();

  // pílula SEXTA
  const ps = E.outBack(prog(t, t0 + 0.62, t0 + 0.97), 2.2);
  if (ps > 0) {
    ctx.save();
    ctx.translate(540, 762); ctx.scale(ps, ps);
    fonte(ctx, 800, 62, 'Geist', 0.06);
    const w = largura(ctx, 'SEXTA');
    ctx.fillStyle = COR.tinta; retRed(ctx, -w / 2 - 40, -50, w + 80, 100, 50); ctx.fill();
    ctx.fillStyle = COR.off; ctx.textAlign = 'center'; ctx.fillText('SEXTA', 4, 22); ctx.textAlign = 'left';
    registra(ctx, 'sexta.relogio', 2, 'SEXTA', -w / 2, 22, ps > 0.9);
    ctx.restore();
  }
  ctx.restore();
}

// ================================================================ CENA 2 — TEM VAGA PRO SÁBADO?
function cenaVaga(ctx, t) {
  const t0 = bar(4), tau = t - t0;
  ctx.fillStyle = COR.tinta; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const s = 1 + 0.35 * (1 - E.outQt(prog(tau, 0, 0.5))) + 0.03 * E.ioSine(prog(tau, 0, BAR * 2));
  camera(ctx, 540, 960, s, -0.015 + 0.03 * E.ioSine(prog(tau, 0, BAR * 2)));
  // "?" gigante ao fundo
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.translate(640, 1150); ctx.rotate(-0.12 + 0.18 * E.ioSine(prog(tau, 0, BAR * 2)));
  fonte(ctx, 800, 1500, 'Geist', 0); ctx.fillStyle = COR.branco; ctx.textAlign = 'center';
  ctx.fillText('?', 0, 520); ctx.textAlign = 'left';
  ctx.restore();

  // nuvem de perguntas (chegando de todo lado)
  G.perguntas.forEach(([txt, x, y, tam, rotg], i) => {
    const tp = t0 + 0.6 + i * BEAT / 4;
    const p = prog(t, tp, tp + 0.3);
    if (p <= 0) return;
    const desl = (t - tp) * (tam * 0.5);
    const sc = E.outBack(p, 2.4) * (1 + 0.03 * pulso(t, 0.1));
    ctx.save();
    ctx.translate(x, y - desl); ctx.rotate(rotg * Math.PI / 180 + ruido(t * 0.8 + i, i) * 0.02); ctx.scale(sc, sc);
    fonte(ctx, 600, tam, 'Geist', -0.02);
    ctx.globalAlpha = 0.5 * clamp(p * 3);
    ctx.fillStyle = COR.branco; ctx.textAlign = 'center';
    ctx.fillText(txt, 0, tam * 0.35);
    registra(ctx, 'vaga.nuvem' + i, txt.split(' ').length, txt, -largura(ctx, txt) / 2, tam * 0.35, p > 0.6);
    ctx.textAlign = 'left';
    ctx.restore();
  });
  ctx.restore();

  // frase principal + pílula que vira o fundo da próxima cena
  ctx.save();
  camera(ctx, 540, 960, 1 + 0.05 * E.ioSine(prog(tau, 0, BAR * 2)) + 0.012 * pulso(t, 0.12), 0);
  const pex = E.inQt(prog(t, bar(6) - 0.26, bar(6)));
  let pil = null;
  blocoTexto(ctx, t, {
    id: 'vaga.frase', linhas: ['Tem vaga', 'pro sábado?'], tam: 142, x: 540, y: 830, alinha: 'center', cor: COR.branco,
    entra: [t0 + 0.12, t0 + 0.24, t0 + 0.42, t0 + 0.54], lh: 1.12,
    destaque: { palavras: ['sábado?'], cor: COR.limao, corTexto: COR.tinta, entra: t0 + 0.48 },
    onPilula: (r) => { pil = r; },
  });
  ctx.restore();
  // expansão da pílula (transição)
  if (pex > 0 && pil) {
    const m = ctx.getTransform();
    ctx.save();
    const x = lerp(pil.x, -80, pex), y = lerp(pil.y, -80, pex), w = lerp(pil.w, W + 160, pex), h = lerp(pil.h, H + 160, pex);
    ctx.fillStyle = COR.limao;
    retRed(ctx, x, y, w, h, lerp(pil.h / 2, 0, pex)); ctx.fill();
    ctx.restore();
  }
  hud(ctx, t, COR.limao);
}

// ================================================================ CENA 3 — QUARTO 4 JÁ LIBEROU?
function anguloPendulo(t) {
  const t0 = bar(6), tau = t - t0;
  const ent = 0.42 * Math.exp(-tau / 0.5);
  const amp = 0.15 + ent;
  const saida = 1 - E.ioC(prog(t, bar(8) - 0.5, bar(8) - 0.1));
  return amp * Math.sin((tau / (2 * BEAT)) * Math.PI * 2) * saida;
}
function giroEtiqueta(t) {
  let phi = 0;
  for (const k of [1, 3, 5]) { const tc = bar(6) + BEAT * k; phi += Math.PI * 2 * E.ioC(prog(t, tc - 0.05, tc + 0.33)); }
  phi += (Math.PI / 2 + Math.PI * 2) * E.inC(prog(t, bar(8) - 0.42, bar(8)));
  return phi;
}
function etiqueta(ctx, phi, numero, corFundo, corNum, mostrarFuro = true) {
  // origem: centro do anel. etiqueta 330x470 abaixo
  const sx = Math.cos(phi);
  ctx.save();
  ctx.scale(Math.max(0.02, Math.abs(sx)), 1);
  ctx.beginPath();
  const x = -165, y = 40, w = 330, h = 470, r = 56;
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  if (mostrarFuro) { ctx.moveTo(22, 92); ctx.arc(0, 92, 22, 0, Math.PI * 2, true); }
  ctx.fillStyle = corFundo; ctx.fill('evenodd');
  fonte(ctx, 700, 230, 'mono', -0.02);
  ctx.fillStyle = corNum; ctx.textAlign = 'center';
  ctx.fillText(numero, 0, 380);
  ctx.textAlign = 'left';
  // brilho na virada
  ctx.globalAlpha = 0.18 * (1 - Math.abs(sx));
  ctx.fillStyle = COR.branco; retRed(ctx, x, y, w, h, r); ctx.fill();
  ctx.restore();
}
function cenaQuarto(ctx, t) {
  const t0 = bar(6), tau = t - t0;
  ctx.fillStyle = COR.limao; ctx.fillRect(0, 0, W, H);
  const th = anguloPendulo(t);
  const phi = giroEtiqueta(t);
  ctx.save();
  camera(ctx, 540, 960, 1.0 + 0.04 * E.ioSine(prog(tau, 0, BAR * 2)), 0.01 * Math.sin(tau * 1.3));
  // "04" gigante ao fundo, em paralaxe contra o balanço
  ctx.save();
  ctx.globalAlpha = 0.07; ctx.fillStyle = COR.tinta;
  fonte(ctx, 700, 760, 'mono', -0.04); ctx.textAlign = 'center';
  ctx.fillText('04', 540 - th * 260, 1300);
  ctx.textAlign = 'left';
  ctx.restore();
  // poeira
  for (const p of G.poeira) {
    const y = ((p.y - tau * p.v) % H + H) % H;
    ctx.globalAlpha = 0.22; ctx.fillStyle = COR.tinta;
    circulo(ctx, p.x + Math.sin(tau + p.f) * 12 - th * 120 * p.d, y, p.r * 0.8); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // pendurada: queda inicial com mola
  const cai = (1 - mola(tau, 2.2, 0.32)) * -1100;
  const piv = [540, 300 + cai];
  ctx.save();
  ctx.translate(piv[0], piv[1]);
  // prego
  ctx.fillStyle = COR.tinta; circulo(ctx, 0, 0, 12); ctx.fill();
  ctx.rotate(th);
  // anel
  ctx.strokeStyle = COR.tinta; ctx.lineWidth = 11;
  circulo(ctx, 0, 52, 36); ctx.stroke();
  // chave (atrás da etiqueta)
  ctx.save();
  ctx.translate(0, 86); ctx.rotate(0.85 + th * 0.6 + 0.08 * Math.sin(tau * 5));
  ctx.scale(Math.max(0.05, Math.abs(Math.cos(phi * 0.7))), 1);
  ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  circulo(ctx, 0, 62, 44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 106); ctx.lineTo(0, 330); ctx.moveTo(0, 290); ctx.lineTo(40, 290); ctx.moveTo(0, 322); ctx.lineTo(30, 322); ctx.stroke();
  ctx.restore();
  ctx.translate(0, 52);
  etiqueta(ctx, phi, '04', COR.tinta, COR.limao);
  ctx.restore();
  ctx.restore();

  // texto
  ctx.save();
  camera(ctx, 540, 960, 1.0 + 0.02 * E.ioSine(prog(tau, 0, BAR * 2)), 0);
  blocoTexto(ctx, t, {
    id: 'quarto.frase', linhas: ['Quarto 4', 'já liberou?'], tam: 140, x: 88, y: 1232, alinha: 'left', cor: COR.tinta,
    entra: [t0 + 0.24, t0 + 0.36, t0 + 0.5, t0 + 0.62], sai: bar(8) - 0.36,
  });
  ctx.restore();
  hud(ctx, t, COR.tinta);
}

// ================================================================ CENA 4 — PÕE NA CONTA DO 6.
function comanda(ctx, c, phi, numero) {
  const sx = Math.max(0.02, Math.abs(Math.cos(phi)));
  ctx.save();
  ctx.scale(sx, 1);
  const w = 330, h = 470, x = -w / 2, y = -h / 2, dente = 14, n = 11;
  ctx.beginPath();
  ctx.moveTo(x, y + dente);
  for (let i = 0; i < n; i++) { const xa = x + (w * i) / n; ctx.lineTo(xa + w / n / 2, y); ctx.lineTo(xa + w / n, y + dente); }
  ctx.lineTo(x + w, y + h - dente);
  for (let i = n - 1; i >= 0; i--) { const xa = x + (w * i) / n; ctx.lineTo(xa + w / n / 2, y + h); ctx.lineTo(xa, y + h - dente); }
  ctx.closePath();
  ctx.fillStyle = COR.off; ctx.fill();
  // faixa e itens
  ctx.fillStyle = COR.limao; retRed(ctx, x + 30, y + 46, w - 60, 54, 14); ctx.fill();
  ctx.fillStyle = 'rgba(10,10,10,0.16)';
  c.linhas.forEach((l, i) => { retRed(ctx, x + 30, y + 140 + i * 56, (w - 140) * l, 20, 10); ctx.fill(); retRed(ctx, x + w - 90, y + 140 + i * 56, 60, 20, 10); ctx.fill(); });
  ctx.fillStyle = 'rgba(10,10,10,0.75)'; retRed(ctx, x + 30, y + h - 96, w - 60, 26, 13); ctx.fill();
  if (numero) {
    ctx.fillStyle = COR.tinta; circulo(ctx, x + w - 58, y + 73, 0); ctx.fill();
  }
  ctx.globalAlpha = 0.15 * (1 - sx); ctx.fillStyle = COR.tinta; ctx.fillRect(x, y, w, h);
  ctx.restore();
}
function cenaConta(ctx, t) {
  const t0 = bar(8), tau = t - t0;
  ctx.fillStyle = COR.tinta; ctx.fillRect(0, 0, W, H);
  ctx.save();
  camera(ctx, 540, 1100, 1.0 + 0.05 * E.ioSine(prog(tau, 0, BAR * 2)), -0.02 * E.ioSine(prog(tau, 0, BAR * 2)), 540, 1100);
  // pilha
  let esm = 0;
  for (let i = 1; i < 7; i++) { const tl = t0 + BEAT * (1 + i); if (t >= tl) esm += Math.exp(-(t - tl) / 0.08) * Math.sin((t - tl) * 40) * 0.5 + Math.exp(-(t - tl) / 0.1) * 0.5; }
  G.comandas.forEach((c, i) => {
    let x, y, rot, phi = 0;
    if (i === 0) {
      // veio da etiqueta girando
      const p = E.outC(prog(t, t0, t0 + 0.5));
      x = 540; y = lerp(627, c.y, p);
      rot = lerp(0, c.rot, p);
      phi = Math.PI / 2 + Math.PI * 1.5 * E.outC(prog(t, t0, t0 + 0.55));
      const sc = lerp(1.0, 1, p);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc * (1 - 0.03 * esm));
      comanda(ctx, c, phi, true); ctx.restore();
      return;
    }
    const tl = t0 + BEAT * (1 + i);
    const pc = prog(t, tl - 0.36, tl);
    if (pc <= 0) return;
    // arremessada de fora do quadro (alterna esquerda/direita), em arco, cai na pilha na batida
    const lado = i % 2 ? 1 : -1;
    const xq = lerp(c.x + lado * 820, c.x, E.outQ(pc));
    const yq = lerp(c.y + 60, c.y, pc) - Math.sin(Math.PI * pc) * 110;
    const dt = t - tl;
    const quique = dt > 0 ? -18 * Math.exp(-dt / 0.07) * Math.abs(Math.sin(dt * 34)) : 0;
    rot = lerp(c.r0 + lado * 2.4, c.rot, E.outC(pc)) + (dt > 0 ? 0.04 * Math.exp(-dt / 0.1) * Math.sin(dt * 30) : 0);
    ctx.save(); ctx.translate(xq, yq + quique); ctx.rotate(rot);
    comanda(ctx, c, 0, false); ctx.restore();
  });
  ctx.restore();

  // texto no topo
  ctx.save();
  camera(ctx, 540, 960, 1.0 + 0.025 * E.ioSine(prog(tau, 0, BAR * 2)), 0);
  const L = blocoTexto(ctx, t, {
    id: 'conta.frase', linhas: ['Põe na conta', 'do 6.'], tam: 138, x: 88, y: 500, alinha: 'left', cor: COR.branco,
    entra: [t0 + 0.24, t0 + 0.34, t0 + 0.44, t0 + 0.66, t0 + 0.9], lh: 1.12,
    destaque: { palavras: ['6.'], cor: COR.limao, corTexto: COR.tinta, entra: t0 + 0.86 },
  });
  ctx.restore();
  hud(ctx, t, COR.limao);
}

// ================================================================ CENA 5 — O CAIXA BATEU?
function slotValor(i, t) {
  const base = [4, 8, 7, 1, 3, 0][i];
  const s0 = [9, 13, 17, 11, 21, 15][i];
  const w = [3.1, 2.3, 4.2, 2.9, 3.7, 2.6][i];
  return base + s0 * (t - bar(10)) + (s0 * 0.85 / w) * Math.sin(w * (t - bar(10)) + i);
}
function cenaCaixa(ctx, t, vortice = true) {
  const t0 = bar(10), tau = t - t0;
  ctx.fillStyle = COR.off; ctx.fillRect(0, 0, W, H);
  const pv = vortice ? prog(t, bar(11) + 0.35, bar(12)) : 0;
  const v = E.inQt(pv);
  // transforma um ponto/camada em direção ao centro com espiral
  const espiral = (cx, cy, vel) => {
    const ang = v * Math.PI * 2.2 * vel;
    const k = Math.pow(1 - v, 1.4);
    ctx.translate(540, 960); ctx.rotate(ang); ctx.scale(k, k); ctx.translate(-540, -960);
  };
  ctx.save();
  camera(ctx, 540, 960, 1.0 + 0.04 * E.ioSine(prog(tau, 0, BAR * 2)), 0.01 * Math.sin(tau));
  // linhas de livro-caixa rolando
  ctx.save(); espiral(540, 960, 0.6);
  ctx.strokeStyle = 'rgba(10,10,10,0.07)'; ctx.lineWidth = 3;
  for (let i = -2; i < 30; i++) { const y = ((i * 74 - tau * 120) % (H + 148) + H + 148) % (H + 148) - 74; ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(1020, y); ctx.stroke(); }
  ctx.restore();
  // janelas do caça-níquel
  ctx.save(); espiral(540, 960, 1.0);
  const pw = E.outBack(prog(tau, 0.1, 0.45), 1.6);
  const wj = 118, hj = 172, gap = 12, virg = 34;
  const tot = 6 * wj + 5 * gap + 2 * virg;
  const xs = 540 - tot / 2;
  fonte(ctx, 700, 54, 'Geist', -0.02); ctx.fillStyle = COR.tinta;
  ctx.globalAlpha = clamp(pw);
  ctx.fillText('R$', xs, 538);
  registra(ctx, 'caixa.rs', 1, 'R$', xs, 538, pw > 0.8);
  // ponto âmbar de alerta
  ctx.fillStyle = COR.ambar; circulo(ctx, xs + largura(ctx, 'R$') + 26, 520, 11 * (0.7 + 0.5 * pulso(t, 0.15))); ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i++) {
    const x = xs + i * (wj + gap) + (i >= 1 ? virg : 0) + (i >= 4 ? virg : 0);
    const y = 590;
    ctx.save();
    ctx.translate(x + wj / 2, y + hj / 2); ctx.scale(pw, pw); ctx.translate(-(x + wj / 2), -(y + hj / 2));
    const val = slotValor(i, t);
    const vel = Math.abs(slotValor(i, t + 0.004) - slotValor(i, t - 0.004)) / 0.008;
    ctx.fillStyle = COR.tinta; retRed(ctx, x, y, wj, hj, 22); ctx.fill();
    ctx.save(); retRed(ctx, x, y, wj, hj, 22); ctx.clip();
    fonte(ctx, 700, 124, 'mono', 0); ctx.textAlign = 'center';
    digitoRolante(ctx, val, x + wj / 2, y + hj / 2 + 44, 124, COR.off, 10, clamp(vel / 14));
    // sombra interna
    const gr = ctx.createLinearGradient(0, y, 0, y + hj);
    gr.addColorStop(0, 'rgba(10,10,10,0.85)'); gr.addColorStop(0.28, 'rgba(10,10,10,0)'); gr.addColorStop(0.72, 'rgba(10,10,10,0)'); gr.addColorStop(1, 'rgba(10,10,10,0.85)');
    ctx.fillStyle = gr; ctx.fillRect(x, y, wj, hj);
    ctx.restore();
    ctx.restore();
    if (i === 0 || i === 3) { ctx.globalAlpha = clamp(pw); separador(ctx, x + wj + gap / 2 + virg / 2, y + hj - 12, 10, i === 3, COR.tinta); ctx.globalAlpha = 1; }
  }
  ctx.textAlign = 'left';
  ctx.restore();
  ctx.restore();

  // texto
  ctx.save();
  camera(ctx, 540, 960, 1.0 + 0.02 * E.ioSine(prog(tau, 0, BAR * 2)), 0);
  espiral(540, 960, 1.6);
  blocoTexto(ctx, t, {
    id: 'caixa.frase', linhas: ['O caixa', 'bateu|?'], tam: 176, x: 88, y: 1180, alinha: 'left', cor: COR.tinta, corAlt: COR.ambar,
    entra: [t0 + 0.24, t0 + 0.36, t0 + 0.6], lh: 1.06,
  });
  ctx.restore();
  // HUD também é sugado
  ctx.save(); espiral(540, 960, 2.0); hud(ctx, t, COR.tinta); ctx.restore();

  // detritos de todas as cenas sendo sugados
  if (pv > 0) {
    for (const d of G.detritos) {
      const p = clamp((pv - d.atraso * 0.4) / (1 - d.atraso * 0.4));
      if (p <= 0) continue;
      const pp = E.inQ(p);
      const r = d.r0 * (1 - pp);
      const a = d.a0 + pp * Math.PI * 3;
      const x = 540 + Math.cos(a) * r, y = 960 + Math.sin(a) * r;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(d.rot + pp * 8); ctx.scale(d.s * (1 - pp * 0.7), d.s * (1 - pp * 0.7));
      ctx.globalAlpha = clamp(p * 4);
      ctx.strokeStyle = d.cor; ctx.fillStyle = d.cor; ctx.lineWidth = 12; ctx.lineJoin = 'round';
      if (d.tipo === 0) { ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(60, -20); ctx.lineTo(60, 60); ctx.lineTo(-60, 60); ctx.lineTo(-60, -20); ctx.closePath(); ctx.stroke(); }
      else if (d.tipo === 1) { retRed(ctx, -45, -65, 90, 130, 18); ctx.fill(); }
      else if (d.tipo === 2) { circulo(ctx, 0, 0, 22); ctx.fill(); }
      else if (d.tipo === 3) { retRed(ctx, -40, -55, 80, 110, 6); ctx.stroke(); }
      else { circulo(ctx, 0, 0, 40); ctx.stroke(); }
      ctx.restore();
    }
    // ponto central crescendo
    ctx.fillStyle = COR.tinta; circulo(ctx, 540, 900 + 60 * (1 - pv), 14 * E.inC(pv)); ctx.fill();
  }
}

// ponto de milhar ou vírgula decimal desenhados (formato 4.871,30)
function separador(ctx, x, y, r, virgula, cor) {
  ctx.fillStyle = cor; circulo(ctx, x, y, r); ctx.fill();
  if (virgula) { ctx.beginPath(); ctx.moveTo(x + r * 0.2, y + r * 0.6); ctx.quadraticCurveTo(x + r * 0.6, y + r * 2.0, x - r * 0.9, y + r * 2.6); ctx.lineWidth = r * 0.9; ctx.strokeStyle = cor; ctx.lineCap = 'round'; ctx.stroke(); }
}

// ================================================================ CENA 6 — RESPIRA.
function raioRespira(t) {
  const t0 = bar(12);
  let r = lerp(14, 200, E.ioSine(prog(t, t0, t0 + 0.98)));
  r = lerp(r, 186, E.ioSine(prog(t, t0 + 0.98, t0 + 1.3)));
  r = lerp(r, 70, E.ioSine(prog(t, t0 + 1.3, t0 + 1.78)));
  r = lerp(r, 8, E.inC(prog(t, t0 + 1.78, bar(13))));
  return r;
}
function cenaRespira(ctx, t) {
  const t0 = bar(12), tau = t - t0;
  ctx.fillStyle = COR.off; ctx.fillRect(0, 0, W, H);
  const cy = 900;
  // ondulações
  for (let k = 0; k < 4; k++) {
    const ts = t0 + 0.06 + k * BEAT;
    const d = t - ts;
    if (d < 0 || d > 1.7) continue;
    const r = raioRespira(ts) + 20 + d * 330;
    ctx.globalAlpha = 0.28 * (1 - d / 1.7);
    ctx.strokeStyle = COR.tinta; ctx.lineWidth = 3;
    circulo(ctx, 540, cy, r); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = COR.tinta; circulo(ctx, 540, cy, raioRespira(t)); ctx.fill();
  // texto
  const a = E.outC(prog(t, t0 + 0.06, t0 + 0.3)) * (1 - prog(t, bar(13) - 0.14, bar(13) - 0.04));
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a;
    const tr = -0.03 + 0.05 * E.ioSine(prog(t, t0, bar(13)));
    fonte(ctx, 600, 104, 'Geist', tr);
    ctx.fillStyle = COR.tinta; ctx.textAlign = 'center';
    const y = 1300 + 26 * (1 - E.outC(prog(t, t0 + 0.06, t0 + 0.4)));
    ctx.fillText('Respira.', 540, y);
    registra(ctx, 'respira', 1, 'Respira.', 540 - largura(ctx, 'Respira.') / 2, y, a > 0.8);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}
