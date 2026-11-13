// cenas-b.js — ATO 2 (ordem): drop, jornada (ciclo da estadia), ciclo, volta, logo
'use strict';

// ---------------------------------------------------------------- geometria
function iniciaGeometriaB(ctx) {
  // grade do drop: 9 x 16 na frente; chão com 17 colunas
  G.grade = [];
  for (let j = 0; j < 20; j++) for (let i = -10; i <= 10; i++) {
    const frente = Math.abs(i) <= 4 && j < 16;
    G.grade.push({ i, j, frente, fx: 540 + i * 100, fy: 210 + j * 100, X: i * 120, Z: 300 + (15 - j) * 125, d: Math.hypot(i * 100, 210 + j * 100 - 900) });
  }
  // jornada: o trilho é o contorno da casa (mundo = (tela - C) * K), começando na base e indo para a esquerda
  const ry = (x) => 650 + (x - 540) * (280 / 330);
  G.K = 6; G.C = [540, 990];
  G.cam = [[620, 1330], [210, 1330], [210, 930], [540, 650], [735, ry(735)], [735, 725], [800, 725], [800, ry(800)], [870, 930], [870, 1330], [620, 1330]];
  G.camL = [0];
  for (let i = 1; i < G.cam.length; i++) G.camL.push(G.camL[i - 1] + Math.hypot(G.cam[i][0] - G.cam[i - 1][0], G.cam[i][1] - G.cam[i - 1][1]));
  const Lc = G.camL;
  // estações como pontos do contorno: base, parede esquerda, telhado esquerdo, telhado direito, parede direita; S5 = fecha a casa
  G.S = [0, Lc[1] + 200, (Lc[2] + Lc[3]) / 2, (Lc[3] + Lc[4]) / 2, Lc[8] + 200, Lc[10]];
  const segDe = (sv) => { let i = 0; while (i < G.cam.length - 2 && Lc[i + 1] <= sv + 1e-6) i++; return i; };
  const bruto = G.S.map((sv, k) => { const i = k === 5 ? G.cam.length - 2 : segDe(sv); return Math.atan2(G.cam[i + 1][1] - G.cam[i][1], G.cam[i + 1][0] - G.cam[i][0]); });
  G.H = [bruto[0]];
  for (let k = 1; k < bruto.length; k++) { let d = bruto[k] - bruto[k - 1]; d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; G.H.push(G.H[k - 1] + d); }
  G.est = [
    { nome: 'Reserva', ax: 540, ay: 1180, rot: 0, z: 1, fundo: 'off' },
    { nome: 'Chegada', ax: 540, ay: 960, rot: 24, z: 1, fundo: 'tinta' },
    { nome: 'Comanda', ax: 540, ay: 400, rot: 8, z: 1, fundo: 'limao' },
    { nome: 'Saída', ax: 540, ay: 930, rot: -36, z: 1, fundo: 'tinta' },
    { nome: 'Caixa', ax: 540, ay: 1070, rot: 0, z: 1, fundo: 'off' },
  ];
  // casa amostrada (para o morph casa -> "O" do logo)
  const N = 240;
  G.mCasa = amostraPath(polyPath(G.casa), N);
  // geometria do logo (SVG 416x72 escalado 2x, origem 124,828)
  G.logo = { s: 2, x: 124, y: 828 };
  fonte(ctx, 800, 128, 'Geist', -0.02);
  const wFazl = largura(ctx, 'FAZL');
  const bO = caixaTexto(ctx, 'O');
  const ox0 = 124 + wFazl - bO.l, ox1 = 124 + wFazl + bO.r;
  const oy0 = 947 - bO.asc, oy1 = 947 + bO.desc;
  const tracoO = 0.2 * 128;
  G.oCentro = [(ox0 + ox1) / 2, (oy0 + oy1) / 2];
  G.oRaios = [(ox1 - ox0) / 2 - tracoO / 2, (oy1 - oy0) / 2 - tracoO / 2];
  G.oTraco = tracoO;
  const elip = [];
  for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + (i / N) * Math.PI * 2; elip.push([G.oCentro[0] + Math.cos(a) * G.oRaios[0], G.oCentro[1] + Math.sin(a) * G.oRaios[1]]); }
  G.mO = alinhaPontos(G.mCasa, elip);
  // bolinhas em fileiras dentro da casa (volta)
  G.fileiras = [];
  const rr = rng(77);
  for (let y = 1290, r = 0; y > 690; y -= 52, r++) {
    for (let x = 236, c = 0; x < 860; x += 52, c++) {
      if (!dentroPoligono(x, y, G.casa) || distBorda(x, y, G.casa) < 25) continue;
      G.fileiras.push({ x, y, r, c, branca: rr() < 0.24, rad: 15, s: rr() * 10, dx: rr() - 0.5, dy: -0.5 - rr() * 0.5, d: 0.5 + rr(), base: -1 });
    }
  }
  const baixo = G.fileiras.filter((b) => b.r <= 2).sort((a, b) => a.x - b.x || a.r - b.r);
  baixo.forEach((b, i) => { b.base = i; });
  G.nBase = baixo.length;
}

// ================================================================ DROP — TUDO NUM LUGAR SÓ.
function cenaDrop(ctx, t) {
  const t0 = bar(13), tau = t - t0;
  ctx.fillStyle = COR.tinta; ctx.fillRect(0, 0, W, H);
  const pt = E.ioC(prog(t, t0 + 0.24, t0 + 0.95));
  const camZ = 300 * Math.max(0, t - (t0 + 0.24));
  const f = 950, h = 300, yh = 880;
  const pl = E.ioC(prog(t, bar(15) - 0.5, bar(15) - 0.04));
  const batidas = [];
  for (let k = 0; k < 8; k++) batidas.push(t0 + k * BEAT);
  for (const g of G.grade) {
    // frente (explosão do ponto)
    const del = g.d / 2600;
    const m = mola(tau - del, 2.3, 0.42);
    let x = lerp(540, g.fx, m), y = lerp(900, g.fy, m);
    let r = 9 * clamp(m * 1.5);
    let alfa = g.frente ? 1 : 0;
    // chão em perspectiva
    if (pt > 0) {
      const prof = 20 * 125;
      const Zc = ((g.Z - camZ - 260) % prof + prof) % prof + 260;
      const sx = 540 + (f * g.X) / Zc, sy = yh + (f * h) / Zc;
      let rr = 17 * 300 / Zc;
      // onda a cada bumbo
      for (const tb of batidas) {
        if (t < tb) continue;
        const wz = 260 + (t - tb) * 3000;
        rr *= 1 + 0.8 * Math.exp(-(((Zc - wz) / 140) ** 2)) * Math.exp(-(t - tb) / 0.6);
      }
      const af = clamp(1 - (Zc - 1900) / 800);
      x = lerp(x, sx, pt); y = lerp(y, sy, pt); r = lerp(r, rr, pt);
      alfa = lerp(alfa, af, pt);
    }
    // vira linha
    if (pl > 0) { y = lerp(y, 1180, pl); r = lerp(r, 8, pl); alfa = lerp(alfa, 1, pl); }
    if (alfa <= 0.01 || r <= 0.2) continue;
    ctx.globalAlpha = alfa;
    ctx.fillStyle = COR.limao;
    circulo(ctx, x, y, r); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (pl > 0.6) { ctx.fillStyle = COR.limao; ctx.globalAlpha = (pl - 0.6) / 0.4; ctx.fillRect(-10, 1172, W + 20, 16); ctx.globalAlpha = 1; }
  // texto
  ctx.save();
  camera(ctx, 540, 700, 1 + 0.04 * E.ioSine(prog(tau, 0, BAR * 2)) + 0.01 * pulso(t, 0.1), 0, 540, 700);
  blocoTexto(ctx, t, {
    id: 'drop.frase', linhas: ['Tudo num', 'lugar só.'], tam: 156, x: 540, y: 640, alinha: 'center', cor: COR.branco,
    entra: [t0 + 0.36, t0 + 0.46, t0 + 0.62, t0 + 0.72], lh: 1.12, sai: bar(15) - 0.42,
    destaque: { palavras: ['só.'], cor: COR.limao, corTexto: COR.tinta, entra: t0 + 0.68 },
  });
  ctx.restore();
}

// ================================================================ JORNADA
const PAL = {
  off: { fundo: COR.off, trilho: COR.tinta, ponto: COR.tinta, texto: COR.tinta, icone: COR.tinta, icone2: COR.tinta, acento: COR.limao, apagado: 'rgba(10,10,10,0.22)' },
  tinta: { fundo: COR.tinta, trilho: COR.limao, ponto: COR.limao, texto: COR.branco, icone: COR.branco, icone2: COR.limao, acento: COR.limao, apagado: 'rgba(175,250,39,0.28)' },
  limao: { fundo: COR.limao, trilho: COR.tinta, ponto: COR.tinta, texto: COR.tinta, icone: COR.tinta, icone2: COR.tinta, acento: COR.tinta, apagado: 'rgba(10,10,10,0.25)' },
};
function tEst(k) { return bar(15 + k); }
// aproximação lenta da casa já fechada; desfaz-se no começo da volta (continuidade sem corte)
function escalaCasa(t) {
  const sobe = E.ioSine(prog(t, tEst(5) + 1.2, bar(22)));
  const desce = E.ioSine(prog(t, bar(22), bar(22) + 0.75));
  return 1 + 0.07 * sobe * (1 - desce);
}
// fim de cada viagem; a última (Caixa -> fecha a casa) é mais lenta e termina no 3º tempo do compasso 21
function tFimViagem(k) { return k < 4 ? tEst(k + 1) : tEst(5) + 3 * BEAT; }
const T_FECHA = () => tFimViagem(4);
function pesoViagem(t, k) { return E.ioC(prog(t, tEst(k) + 0.76 * BAR, tFimViagem(k))); }
// posição do hóspede ao longo do contorno (unidades de tela da casa)
function sHospede(t) {
  let sv = G.S[0];
  for (let k = 0; k < 5; k++) sv += (G.S[k + 1] - G.S[k]) * pesoViagem(t, k);
  return sv;
}
function pontoCaminho(sv) {
  const L = G.camL;
  sv = clamp(sv, 0, L[L.length - 1]);
  let i = 0;
  while (i < G.cam.length - 2 && L[i + 1] < sv) i++;
  const f = (sv - L[i]) / (L[i + 1] - L[i] || 1);
  return [lerp(G.cam[i][0], G.cam[i + 1][0], f), lerp(G.cam[i][1], G.cam[i + 1][1], f)];
}
function mundoDe(p) { return [(p[0] - G.C[0]) * G.K, (p[1] - G.C[1]) * G.K]; }
function estMundo(k) { return mundoDe(pontoCaminho(G.S[k])); }
// traça o contorno percorrido de s0 a s1 (em coordenadas do mundo)
function tracaCaminho(ctx, s0, s1) {
  const L = G.camL;
  ctx.beginPath();
  const a = mundoDe(pontoCaminho(s0));
  ctx.moveTo(a[0], a[1]);
  for (let i = 1; i < G.cam.length; i++) if (L[i] > s0 && L[i] < s1) { const q = mundoDe(G.cam[i]); ctx.lineTo(q[0], q[1]); }
  const b = mundoDe(pontoCaminho(s1));
  ctx.lineTo(b[0], b[1]);
}
// parâmetros de câmera da jornada (segue o hóspede; a rotação acompanha a direção do trecho da estação)
function camJornada(t) {
  let k = 0;
  for (let i = 0; i < 5; i++) if (t >= tEst(i) + 0.76 * BAR) k = i;
  const a = G.est[k], b = G.est[(k + 1) % 5];
  const w = pesoViagem(t, k);
  let hc = G.H[0];
  for (let i = 0; i < 5; i++) hc += (G.H[i + 1] - G.H[i]) * pesoViagem(t, i);
  const sv = sHospede(t);
  const dot = mundoDe(pontoCaminho(sv));
  let c = {
    wf: dot, sf: [lerp(a.ax, b.ax, w), lerp(a.ay, b.ay, w)],
    rot: -hc + (lerp(a.rot, k === 4 ? 0 : b.rot, w) * Math.PI) / 180,
    z: 1 + 0.3 * Math.sin(Math.PI * w), s: sv, dot,
  };
  // deriva lenta de câmera enquanto o hóspede está parado na estação (nada fica congelado)
  let kd = 0;
  for (let i = 0; i < 5; i++) if (t >= tEst(i)) kd = i;
  const pd = prog(t, tEst(kd), tEst(kd) + 0.76 * BAR);
  const df = E.ioSine(pd) * (1 - pesoViagem(t, kd));
  c.z *= 1 + 0.07 * df;
  c.rot += 0.04 * df * (kd % 2 ? -1 : 1);
  // recuo: a casa inteira aparece em pé, exatamente onde fica a casa da volta
  const wp = E.ioC(prog(t, tEst(5) - 0.1, tEst(5) + 1.2));
  if (wp > 0) {
    const resp = escalaCasa(t);
    c = {
      wf: [lerp(dot[0], 0, wp), lerp(dot[1], 0, wp)],
      sf: [lerp(c.sf[0], G.C[0], wp), lerp(c.sf[1], G.C[1], wp)],
      rot: lerp(c.rot, -Math.PI * 2, wp),
      z: Math.exp(lerp(Math.log(c.z), Math.log(1 / G.K), wp)) * resp, s: sv, dot,
    };
  }
  return c;
}
function aplicaCam(ctx, c) {
  ctx.translate(c.sf[0], c.sf[1]); ctx.rotate(c.rot); ctx.scale(c.z, c.z); ctx.translate(-c.wf[0], -c.wf[1]);
}
function telaDe(c, p) {
  const dx = (p[0] - c.wf[0]) * c.z, dy = (p[1] - c.wf[1]) * c.z;
  const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  return [c.sf[0] + dx * cs - dy * sn, c.sf[1] + dx * sn + dy * cs];
}
// desenha o mundo (contorno da casa como trilho, estações, hóspede)
function mundoJornada(ctx, t, c, pal, lwTela = 16) {
  ctx.save();
  aplicaCam(ctx, c);
  const lw = lwTela / c.z;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // caminho ainda por percorrer: pontilhado andando
  ctx.strokeStyle = pal.apagado; ctx.lineWidth = lw;
  ctx.setLineDash([lw * 0.01, lw * 2.2]);
  ctx.lineDashOffset = -t * 90 / c.z;
  tracaCaminho(ctx, c.s, G.camL[G.camL.length - 1]); ctx.stroke();
  ctx.lineDashOffset = 0;
  ctx.setLineDash([]);
  // caminho percorrido: o traço que vai desenhando a casa
  if (c.s > 0.5) {
    ctx.strokeStyle = pal.trilho; ctx.lineWidth = lw * (1 + 0.25 * pulso(t, 0.12));
    tracaCaminho(ctx, 0, c.s); ctx.stroke();
  }
  // estações
  for (let k = 0; k < 5; k++) {
    const p = estMundo(k);
    const visit = c.s >= G.S[k] - 0.5;
    ctx.fillStyle = visit ? pal.trilho : pal.fundo;
    ctx.strokeStyle = pal.trilho; ctx.lineWidth = lw * 0.55;
    circulo(ctx, p[0], p[1], 26 / c.z * Math.min(1, c.z * 1.4)); ctx.fill(); ctx.stroke();
  }
  // hóspede
  const hp = c.dot;
  const P = pulso(t, 0.16);
  ctx.strokeStyle = pal.ponto; ctx.lineWidth = 4 / c.z; ctx.globalAlpha = 0.5 * P;
  circulo(ctx, hp[0], hp[1], (30 + 40 * (1 - P)) / c.z); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.ponto; circulo(ctx, hp[0], hp[1], 24 / c.z); ctx.fill();
  ctx.fillStyle = pal.fundo; circulo(ctx, hp[0], hp[1], 9 / c.z); ctx.fill();
  ctx.restore();
}
// transforma para o "quadro da estação k" (layout desenhado em coordenadas de tela do momento parado)
function quadroEstacao(ctx, c, k) {
  const e = G.est[k];
  const P = estMundo(k);
  const rotK = -G.H[k] + (e.rot * Math.PI) / 180;
  aplicaCam(ctx, c);
  ctx.translate(P[0], P[1]); ctx.rotate(-rotK); ctx.scale(1 / e.z, 1 / e.z); ctx.translate(-e.ax, -e.ay);
}
function textoEstacao(ctx, t, k, cfg, pal) {
  const tk = tEst(k);
  return blocoTexto(ctx, t, Object.assign({ id: 'jornada.' + k, cor: pal.texto, entra: [tk - 0.05], dur: 0.32, sai: tEst(k + 1) - 0.2, saiDur: 0.24 }, cfg));
}
function conteudoEstacao(ctx, t, k, pal) {
  const tk = tEst(k);
  if (t < tk - 0.2 || t > tEst(k + 1) + 0.6) return;
  if (k === 0) {
    const tam = tamanhoQueCabe(ctx, ['Reserva'], 800, 186, 700);
    textoEstacao(ctx, t, k, { linhas: ['Reserva'], tam, x: 88, y: 560, alinha: 'left' }, pal);
    // semana: 7 dias, a reserva ocupa sex-sáb-dom
    for (let i = 0; i < 7; i++) {
      const pc = E.outBack(prog(t, tk + 0.1 + i * 0.035, tk + 0.4 + i * 0.035));
      if (pc <= 0) continue;
      const x = 88 + i * 131, y = 700;
      ctx.save(); ctx.translate(x + 60, y + 85); ctx.scale(pc, pc);
      ctx.strokeStyle = pal.apagado; ctx.lineWidth = 6; retRed(ctx, -60, -85, 120, 170, 26); ctx.stroke();
      ctx.fillStyle = pal.apagado; circulo(ctx, 0, -52, 7); ctx.fill();
      ctx.restore();
    }
    const pr = E.outQt(prog(t, tk + 0.5, tk + 0.84));
    if (pr > 0) {
      const x = 88 + 4 * 131, w = 2 * 131 + 120;
      ctx.fillStyle = pal.acento; retRed(ctx, x, 700, w * pr + 1, 170, 26); ctx.fill();
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 6; ctx.stroke();
      const pd = E.outBack(prog(t, tk + 0.78, tk + 1.0), 2.2);
      ctx.fillStyle = COR.tinta; circulo(ctx, x + 72, 785, 26 * pd); ctx.fill();
      ctx.fillStyle = pal.acento; circulo(ctx, x + 72, 785, 10 * pd); ctx.fill();
    }
  } else if (k === 1) {
    const tam = tamanhoQueCabe(ctx, ['Chegada'], 800, 210, 740);
    textoEstacao(ctx, t, k, { linhas: ['Chegada'], tam, x: 88, y: 1420, alinha: 'left' }, pal);
    const dx = -150 * (1 - E.outQt(prog(t, tk + 0.1, tk + 0.6)));
    desenhaIcone(ctx, 'chegada', 680, 540, 440, [0, 0, E.outC(prog(t, tk + 0.02, tk + 0.4))], pal.icone, 1.7);
    ctx.save(); ctx.translate(dx, 0);
    desenhaIcone(ctx, 'chegada', 680, 540, 440, [E.outC(prog(t, tk + 0.32, tk + 0.55)), E.outC(prog(t, tk + 0.12, tk + 0.45)), 0], pal.icone2, 1.7);
    ctx.restore();
    // brilho dentro da porta quando o hóspede entra
    const pb = prog(t, tk + 0.6, tk + 1.2);
    if (pb > 0 && pb < 1) { ctx.strokeStyle = pal.acento; ctx.globalAlpha = 1 - pb; ctx.lineWidth = 6; circulo(ctx, 800, 540, 40 + pb * 160); ctx.stroke(); ctx.globalAlpha = 1; }
  } else if (k === 2) {
    const tam = tamanhoQueCabe(ctx, ['Comanda'], 800, 210, 800);
    textoEstacao(ctx, t, k, { linhas: ['Comanda'], tam, x: 540, y: 1390, alinha: 'center' }, pal);
    const pr = [E.ioC(prog(t, tk + 0.0, tk + 0.55)), E.outC(prog(t, tk + 0.3, tk + 0.48)), E.outC(prog(t, tk + 0.42, tk + 0.6)), E.outC(prog(t, tk + 0.54, tk + 0.72))];
    const sc = 1 + 0.02 * pulso(t, 0.12);
    desenhaIcone(ctx, 'comandas', 540, 880, 540 * sc, pr, pal.icone, 1.45);
    // itens caindo nas linhas
    [[8, 8], [8, 12], [8, 16]].forEach(([ix, iy], i) => {
      const pi = E.outBack(prog(t, tk + 0.62 + i * 0.12, tk + 0.82 + i * 0.12), 2.5);
      if (pi <= 0) return;
      ctx.fillStyle = pal.icone; circulo(ctx, 540 + (ix - 12) * 22.5 * sc - 46, 880 + (iy - 12) * 22.5 * sc, 13 * pi); ctx.fill();
    });
  } else if (k === 3) {
    const tam = tamanhoQueCabe(ctx, ['Saída'], 800, 230, 760);
    textoEstacao(ctx, t, k, { linhas: ['Saída'], tam, x: 88, y: 560, alinha: 'left' }, pal);
    desenhaIcone(ctx, 'saida', 720, 1250, 400, [0, 0, E.outC(prog(t, tk + 0.02, tk + 0.4))], pal.icone, 1.7);
    const empurra = 40 * E.outC(prog(t, tk + 0.55, tk + 0.8)) * (1 - E.ioC(prog(t, tk + 0.95, tk + 1.3))) + 14 * pulso(t, 0.12);
    ctx.save(); ctx.translate(empurra, 0);
    desenhaIcone(ctx, 'saida', 720, 1250, 400, [E.outC(prog(t, tk + 0.32, tk + 0.55)), E.outC(prog(t, tk + 0.12, tk + 0.45)), 0], pal.icone2, 1.7);
    ctx.restore();
  } else if (k === 4) {
    const tam = tamanhoQueCabe(ctx, ['Caixa'], 800, 210, 600);
    textoEstacao(ctx, t, k, { linhas: ['Caixa'], tam, x: 88, y: 1430, alinha: 'left' }, pal);
    desenhaIcone(ctx, 'caixa', 812, 1355, 210, [E.outC(prog(t, tk + 0.05, tk + 0.4)), E.outC(prog(t, tk + 0.25, tk + 0.45)), E.outC(prog(t, tk + 0.38, tk + 0.55))], pal.icone, 1.7);
    // janelas que agora PARAM no valor
    const wj = 108, hj = 156, gap = 12, virg = 28, x0 = 86, y0 = 540;
    fonte(ctx, 700, 54, 'Geist', -0.02); ctx.fillStyle = pal.texto;
    const pa = E.outC(prog(t, tk - 0.06, tk + 0.12));
    ctx.globalAlpha = pa; ctx.fillText('R$', x0, 508); ctx.globalAlpha = 1;
    registra(ctx, 'jornada.4.rs', 1, 'R$', x0, 508, pa > 0.8);
    const alvo = [4, 8, 7, 1, 3, 0];
    for (let i = 0; i < 6; i++) {
      const x = x0 + i * (wj + gap) + (i >= 1 ? virg : 0) + (i >= 4 ? virg : 0);
      const pw = E.outBack(prog(t, tk + i * 0.03, tk + 0.3 + i * 0.03), 1.7);
      if (pw <= 0) continue;
      const ts = tk + 0.3 + i * BEAT / 4;
      const v = alvo[i] - (4 + i) * (1 - E.outQt(prog(t, tk, ts)));
      const dt = t - ts;
      const quica = dt > 0 ? 8 * Math.exp(-dt / 0.08) * Math.sin(dt * 40) : 0;
      ctx.save(); ctx.translate(x + wj / 2, y0 + hj / 2); ctx.scale(pw, pw); ctx.translate(-(x + wj / 2), -(y0 + hj / 2));
      ctx.fillStyle = COR.tinta; retRed(ctx, x, y0, wj, hj, 18); ctx.fill();
      ctx.save(); retRed(ctx, x, y0, wj, hj, 18); ctx.clip();
      fonte(ctx, 700, 112, 'mono', 0); ctx.textAlign = 'center';
      const vel = dt < 0 ? 1 : 0;
      digitoRolante(ctx, v, x + wj / 2, y0 + hj / 2 + 40 + quica, 112, dt > 0 ? COR.limao : COR.off, 10, vel * 0.8);
      ctx.restore(); ctx.restore();
      if (i === 0 || i === 3) separador(ctx, x + wj + gap / 2 + virg / 2, y0 + hj - 10, 8 * pw, i === 3, pal.texto);
    }
    ctx.textAlign = 'left';
    // check
    const pc = E.outBack(prog(t, tk + 1.0, tk + 1.25), 2);
    if (pc > 0) {
      const cx = 86 + 764 + 24 + 60, cy = 618;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(pc, pc);
      ctx.fillStyle = COR.limao; circulo(ctx, 0, 0, 60); ctx.fill();
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      const pk = E.outC(prog(t, tk + 1.08, tk + 1.3));
      ctx.save(); ctx.translate(cx, cy);
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const d = 'M-22 2 L-6 18 L24 -16';
      const L = 22.6 + 45.3;
      ctx.setLineDash([L * pk, 200]); ctx.stroke(new Path2D(d)); ctx.setLineDash([]);
      ctx.restore();
    }
  }
}
function estadoJornada(ctx, t, c, k) {
  const pal = PAL[G.est[k].fundo];
  ctx.fillStyle = pal.fundo; ctx.fillRect(-20, -20, W + 40, H + 40);
  mundoJornada(ctx, t, c, pal);
  ctx.save(); quadroEstacao(ctx, c, k); conteudoEstacao(ctx, t, k, pal); ctx.restore();
}
function cenaJornada(ctx, t) {
  const c = camJornada(t);
  const hs = telaDe(c, c.dot);
  let atual = 0;
  for (let k = 0; k < 5; k++) if (t >= tEst(k) - 0.1) atual = k;
  const pw = E.outC(prog(t, tEst(atual) - 0.1, tEst(atual) + 0.32));
  if (pw < 1 && atual > 0) {
    estadoJornada(ctx, t, c, atual - 1);
    ctx.save(); circulo(ctx, hs[0], hs[1], pw * 2300); ctx.clip();
    estadoJornada(ctx, t, c, atual);
    ctx.restore();
  } else estadoJornada(ctx, t, c, atual);
}
// máscara de entrada da jornada sobre o drop
function raioWipe(t, tk) { return E.outC(prog(t, tk - 0.1, tk + 0.32)) * 2300; }

// ================================================================ CICLO (recuo)
const ICONES_EST = ['reservas', 'chegada', 'comandas', 'saida', 'caixa'];
function cenaCiclo(ctx, t, comFundo = true, comCasa = true) {
  const t0 = tEst(5);
  const c = camJornada(t);
  const pal = PAL.tinta;
  if (comFundo) { ctx.fillStyle = pal.fundo; ctx.fillRect(-20, -20, W + 40, H + 40); }
  const wp = E.ioC(prog(t, t0 - 0.1, t0 + 1.2));
  const saida = E.ioC(prog(t, bar(22) - 0.25, bar(22) + 0.1));
  const tf = T_FECHA();
  const fecho = t >= tf ? Math.exp(-(t - tf) / 0.22) : 0;
  const Ltot = G.camL[G.camL.length - 1];
  // contorno da casa: pontilhado do que falta + traço percorrido; no 3º tempo o traço fecha a casa
  if (comCasa) {
    ctx.save();
    aplicaCam(ctx, c);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const lwT = lerp(16, 14, wp) * (1 + 0.35 * pulso(t, 0.12) * wp);
    if (c.s < Ltot - 0.5) {
      ctx.strokeStyle = pal.apagado; ctx.lineWidth = lwT / c.z;
      ctx.setLineDash([lwT * 0.01 / c.z, lwT * 2.2 / c.z]); ctx.lineDashOffset = -t * 90 / c.z;
      tracaCaminho(ctx, c.s, Ltot); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    ctx.strokeStyle = pal.trilho; ctx.lineWidth = lwT * (1 + 0.5 * fecho) / c.z;
    if (c.s >= Ltot - 0.5) { tracaPts(ctx, G.casa.map(mundoDe)); } else tracaCaminho(ctx, 0, c.s);
    ctx.stroke();
    // lampejo dentro da casa quando o contorno fecha
    if (fecho > 0.01) { ctx.fillStyle = pal.trilho; ctx.globalAlpha = 0.14 * fecho; tracaPts(ctx, G.casa.map(mundoDe)); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  // estações = pontos do contorno, com os ícones da marca
  for (let k = 0; k < 5; k++) {
    const sc = telaDe(c, estMundo(k));
    const pi = E.outBack(prog(t, t0 + 0.55 + k * 0.08, t0 + 0.9 + k * 0.08), 2) * (1 - saida);
    const rn = lerp(26, 50, clamp(pi)) * (1 + 0.12 * fecho);
    ctx.fillStyle = pal.fundo; ctx.strokeStyle = pal.trilho; ctx.lineWidth = 6;
    circulo(ctx, sc[0], sc[1], rn * (pi > 0 ? 1 : 1 - saida)); ctx.fill(); ctx.stroke();
    if (pi > 0) desenhaIcone(ctx, ICONES_EST[k], sc[0], sc[1], 52 * pi, 1, pal.icone2, 1.9);
  }
  // hóspede: termina o caminho de volta na Reserva e se funde ao ponto
  const hs = telaDe(c, c.dot);
  const funde = 1 - E.inC(prog(t, tf, tf + 0.3));
  if (funde > 0) {
    ctx.fillStyle = pal.ponto; circulo(ctx, hs[0], hs[1], lerp(24, 20, wp) * funde); ctx.fill();
    ctx.fillStyle = pal.fundo; circulo(ctx, hs[0], hs[1], lerp(9, 7, wp) * funde); ctx.fill();
  }
  // texto dentro da casa
  ctx.save();
  camera(ctx, 540, 1040, 1 + 0.03 * E.ioSine(prog(t, t0, bar(22))) + 0.008 * pulso(t, 0.1), 0, 540, 1040);
  const tam = tamanhoQueCabe(ctx, ['Do início', 'ao fim.'], 800, 112, 480);
  blocoTexto(ctx, t, {
    id: 'ciclo.frase', linhas: ['Do início', 'ao fim.'], tam, x: 540, y: 1000, alinha: 'center', cor: COR.branco, lh: 1.1,
    entra: [t0 + 0.55, t0 + 0.65, t0 + 0.78, t0 + 0.88], sai: bar(22) - 0.3,
  });
  ctx.restore();
}

// posição das bolinhas da volta (fileiras -> partículas do logo); compartilhada pelas duas cenas
function particulaVolta(b, t) {
  const t0 = bar(22);
  const ts = t0 + 0.5 + b.r * 0.055 + b.c * 0.006;
  const p = prog(t, ts, ts + 0.32);
  if (p <= 0) return null;
  const yq = lerp(b.y - 300, b.y, E.outBack(p, 1.3));
  let x = b.x, y = yq + 3 * Math.sin(t * 3 + b.c * 0.6) * clamp(p * 2);
  let r = b.rad, al = clamp(p * 2.5);
  const ini = bar(24) - 0.5;
  if (t > ini) {
    if (b.base >= 0) {
      // assenta numa linha de base, abaixo da assinatura
      const d = b.base / (G.nBase - 1);
      const atraso = Math.abs(d - 0.5) * 0.5;
      const q = E.ioC(prog(t, ini + atraso, ini + 1.3 + atraso));
      x = lerp(x, 150 + d * 780, q);
      y = lerp(y, 1262, q) - Math.sin(Math.PI * q) * 90;
      r = lerp(b.rad, 7.5, q);
      // a linha respira: onda lenta + pulinho que corre do centro para as pontas a cada batida
      const as = prog(t, ini + 1.3 + atraso, ini + 1.7 + atraso);
      let onda = 8 * Math.sin(t * 5.2 - d * 10);
      for (let k = 0; k < 10; k++) {
        const tb = bar(24) + BEAT + k * BEAT;
        if (t < tb || tb > bar(26) + 0.01) continue;
        const forte = Math.abs(tb - bar(26)) < 0.01 ? 2.2 : 1;
        const fr = (t - tb) * 1100;
        onda -= forte * 12 * Math.exp(-(((Math.abs(d - 0.5) * 780 - fr) / 70) ** 2)) * Math.exp(-(t - tb) / 0.5);
      }
      y += as * onda;
      // depois do último acorde a linha se dissolve para os lados, do centro para as pontas
      const sd = E.inQ(prog(t, bar(26) + 0.15 + (0.5 - Math.abs(d - 0.5)) * 0.4, TEMPO.duracao + 0.3));
      if (sd > 0) { x += (d < 0.5 ? -1 : 1) * sd * 520; al *= 1 - sd; }
    } else {
      // as demais se dissolvem para os lados
      const lado = b.x < 540 ? -1 : 1;
      const q = E.inC(prog(t, ini + b.d * 0.25, ini + 1.5 + b.d * 0.25));
      x += lado * q * (650 + 300 * b.d);
      y += (b.dy * 140 - 60) * q;
      r *= 1 - 0.5 * q;
      al *= 1 - q;
      // abre espaço para o logo
      const ql = E.outC(prog(t, ini, ini + 0.6));
      const dl = Math.max(0, Math.abs(x - 540) - 440) + Math.max(0, Math.abs(y - 900) - 110);
      al *= lerp(1, clamp(dl / 60), ql);
    }
  }
  return { x, y, r, al };
}

// ================================================================ VOLTA — CASA CHEIA. CABEÇA LEVE.
function pilulaCabeca(t) {
  // retângulo da pílula (centro, w, h) — vira a pílula do logo
  fonte(document.getElementById('tela').getContext('2d'), 750, 80, 'Geist', -0.03);
  const ctx = document.getElementById('tela').getContext('2d');
  const wt = largura(ctx, 'Cabeça leve.');
  const a = { cx: 540, cy: 1452, w: wt + 100, h: 128 };
  const b = { cx: 572 + 188, cy: 848 + 52, w: 376, h: 104 };
  const p = E.ioC(prog(t, bar(24) - 0.42, bar(24) - 0.02));
  return { cx: lerp(a.cx, b.cx, p), cy: lerp(a.cy, b.cy, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p), p };
}
function cenaVolta(ctx, t) {
  const t0 = bar(22), tau = t - t0;
  ctx.fillStyle = COR.tinta; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const ec = escalaCasa(t);
  ctx.translate(G.C[0], G.C[1]); ctx.scale(ec, ec); ctx.translate(-G.C[0], -G.C[1]);
  const po = E.ioC(prog(t, bar(24) - 0.42, bar(24) - 0.02));
  const pf = prog(t, bar(24) - 0.5, bar(24) + 3.5);   // dispersão em partículas
  // bolinhas em fileiras
  for (const b of G.fileiras) {
    const q = particulaVolta(b, t);
    if (!q || q.al <= 0.01) continue;
    ctx.globalAlpha = clamp(q.al);
    ctx.fillStyle = b.branca ? COR.branco : COR.limao;
    circulo(ctx, q.x, q.y, q.r); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // contorno: casa (desenhada pelo trilho) -> "O" de FAZLO
  let pts = G.mCasa;
  if (po > 0) pts = morphPts(G.mCasa, G.mO, po);
  ctx.strokeStyle = po > 0.5 ? COR.branco : COR.limao;
  ctx.lineWidth = lerp(14 * (1 + 0.35 * pulso(t, 0.12) * (1 - prog(t, bar(22) + 0.4, bar(22) + 1.2))), G.oTraco, po);
  ctx.lineJoin = 'round';
  tracaPts(ctx, pts); ctx.stroke();
  ctx.restore();
  // título igual ao do gancho
  ctx.save();
  camera(ctx, 540, 960, 1 + 0.02 * E.ioSine(prog(tau, 0, BAR * 2)), 0);
  blocoTexto(ctx, t, {
    id: 'volta.titulo', linhas: ['Casa cheia.'], tam: 160, x: 540, y: 568, alinha: 'center', cor: COR.branco,
    entra: [t0 + 0.3, t0 + 0.42], sai: bar(24) - 0.5,
  });
  ctx.restore();
  pilulaVolta(ctx, t);
}
function pilulaVolta(ctx, t) {
  const t0 = bar(22);
  const pp = E.outBack(prog(t, t0 + 0.86, t0 + 1.2), 2.2);
  if (pp <= 0) return;
  const r = pilulaCabeca(t);
  ctx.save();
  ctx.translate(r.cx, r.cy);
  const esc = r.p > 0 ? 1 : pp * (1 + 0.04 * pulso(t, 0.1));
  ctx.scale(esc, esc);
  ctx.fillStyle = COR.limao; retRed(ctx, -r.w / 2, -r.h / 2, r.w, r.h, r.h / 2); ctx.fill();
  ctx.beginPath(); retRed(ctx, -r.w / 2, -r.h / 2, r.w, r.h, r.h / 2); ctx.clip();
  const sai = E.inC(prog(t, bar(24) - 0.46, bar(24) - 0.2));
  fonte(ctx, 750, 80, 'Geist', -0.03);
  ctx.fillStyle = COR.tinta; ctx.textAlign = 'center';
  if (sai < 1) {
    ctx.fillText('Cabeça leve.', 0, 28 - sai * 130);
    registra(ctx, 'volta.pilula', 2, 'Cabeça leve.', -largura(ctx, 'Cabeça leve.') / 2, 28, sai < 0.3 && pp > 0.9);
  }
  ctx.textAlign = 'left';
  ctx.restore();
}

// ================================================================ LOGO
function cenaLogo(ctx, t) {
  const t0 = bar(24), tau = t - t0;
  ctx.fillStyle = COR.tinta; ctx.fillRect(0, 0, W, H);
  // respiração: aproximação lenta + leve escala na batida e numa onda de 2 compassos
  const resp = 1 + 0.012 * Math.sin(Math.PI * 2 * tau / BAR);
  const zoom = (1 + 0.035 * E.ioSine(prog(t, t0, TEMPO.duracao)) + 0.04 * E.inQ(prog(t, bar(26), TEMPO.duracao)) + 0.014 * pulso(t, 0.14)) * resp;
  // bolinhas: linha de base + as que se dissolvem para os lados (nada gira em volta do logo)
  for (const b of G.fileiras) {
    const q = particulaVolta(b, t);
    if (!q || q.al <= 0.01) continue;
    ctx.globalAlpha = clamp(q.al);
    ctx.fillStyle = b.branca ? COR.branco : COR.limao;
    circulo(ctx, q.x, q.y, q.r); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  camera(ctx, 540, 940, zoom, 0, 540, 940);
  // pílula Hospeda (brilha na batida)
  const pl = { x: 572, y: 848, w: 376, h: 104 };
  ctx.fillStyle = COR.limao; retRed(ctx, pl.x, pl.y, pl.w, pl.h, pl.h / 2); ctx.fill();
  ctx.save(); retRed(ctx, pl.x, pl.y, pl.w, pl.h, pl.h / 2); ctx.clip();
  const brilho = 0.16 * pulso(t, 0.16) * prog(t, t0 + 0.4, t0 + 0.6);
  if (brilho > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + brilho.toFixed(3) + ')'; ctx.fillRect(pl.x, pl.y, pl.w, pl.h); }
  const ph = E.outQt(prog(t, t0, t0 + 0.32));
  fonte(ctx, 600, 68, 'Geist', 0);
  ctx.fillStyle = COR.tinta; ctx.textAlign = 'center';
  ctx.fillText('Hospeda', 760, 924 + (1 - ph) * 110);
  registra(ctx, 'logo.marca', 2, 'Hospeda', 760 - largura(ctx, 'Hospeda') / 2, 924, ph > 0.9);
  ctx.textAlign = 'left';
  // varredura de luz na pílula
  for (const tg of [bar(24) + 1.9, bar(25) + 1.3]) {
    const g = prog(t, tg, tg + 0.6);
    if (g > 0 && g < 1) {
      const gx = lerp(pl.x - 120, pl.x + pl.w + 120, E.ioC(g));
      const gr = ctx.createLinearGradient(gx - 60, 0, gx + 60, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.save(); ctx.translate(gx, 900); ctx.transform(1, 0, -0.35, 1, 0, 0); ctx.translate(-gx, -900); ctx.fillRect(gx - 60, pl.y, 120, pl.h); ctx.restore();
    }
  }
  ctx.restore();
  // FAZLO: o "O" já está lá (veio da casa); FAZL sobem da máscara
  fonte(ctx, 800, 128, 'Geist', -0.02);
  ctx.fillStyle = COR.branco;
  const letras = layoutLetras(ctx, 'FAZLO');
  ctx.save();
  ctx.beginPath(); ctx.rect(100, 780, 520, 180); ctx.clip();
  letras.letras.forEach((l, i) => {
    if (i === 4) { ctx.fillText('O', 124 + l.x, 947); return; }
    const p = E.outQt(prog(t, t0 + i * BEAT / 4, t0 + i * BEAT / 4 + 0.4));
    if (p <= 0) return;
    ctx.fillText(l.c, 124 + l.x, 947 + (1 - p) * 150);
  });
  ctx.restore();
  registra(ctx, 'logo.marca', 2, 'FAZLO', 124, 947, t > t0 + 0.8);
  // @fazlohospeda (respira no brilho)
  const handle = '@fazlohospeda';
  fonte(ctx, 500, 50, 'mono', 0);
  const wh = largura(ctx, handle);
  const xh = 540 - wh / 2;
  ctx.fillStyle = COR.off;
  const aResp = 0.8 + 0.12 * Math.sin(Math.PI * 2 * tau / (2 * BAR) + 1) + 0.08 * pulso(t, 0.2);
  for (let i = 0; i < handle.length; i++) {
    const p = E.outC(prog(t, t0 + 0.75 + i * 0.03, t0 + 0.95 + i * 0.03));
    if (p <= 0) continue;
    ctx.globalAlpha = clamp(aResp * p);
    ctx.fillText(handle[i], xh + largura(ctx, handle.slice(0, i)), 1072 + (1 - p) * 18);
  }
  ctx.globalAlpha = 1;
  registra(ctx, 'logo.arroba', 1, handle, xh, 1072, t > t0 + 1.4);
  ctx.restore();
}
