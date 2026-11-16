/* Abertura (cartaz do quadro 0) + a dor. Sem telas: só elementos gráficos.
 * Paleta da dor: off-white + âmbar (alerta). O limão só volta na virada para a marca.
 */
(window.CENAS = window.CENAS || []).push(function (raizCenas) {
  const { h, s, T, A, som, COR, grupo, ico, txt, chip, logo, desenhar, entra, estala, sai, contador, moeda, rnd } = B;
  const el = h('div', { class: 'cena', id: 'c-dor' });
  raizCenas.appendChild(el);
  const tZ = T('virada', 'FAZLO');
  M.cena(el, 0, tZ + 0.12);
  const d = (w, n) => T('dor', w, n);

  /* ================= cartaz: quadro 0 (miniatura no WhatsApp) ================= */
  const cz = grupo(el, 540, 800);
  const lg = logo(cz.dom, 540, 640, 660);
  const t1 = txt(cz.dom, 540, 838, 'Veja como fica o dia a dia', { tam: 68, peso: 700 });
  const t2 = txt(cz.dom, 540, 924, 'da sua pousada', { tam: 68, peso: 700, cor: COR.limao });
  const linha = h('div', { style: `position:absolute;left:390px;top:992px;width:300px;height:6px;border-radius:3px;background:${COR.limao};transform-origin:0 50%;` });
  cz.dom.appendChild(linha);
  const linhaOb = M.el(linha, { sx: 0.35 });
  const selo = chip(cz.dom, 540, 1092, 'em menos de 3 minutos', { tipo: 'escuro', icone: 'relogio', tam: 30, alt: 64 });
  // movimento desde o primeiro quadro, saída a partir de 0,45 s
  M.para(linhaOb, 0, 0.5, { sx: [0.35, 1] }, 'out3');
  M.para(cz, 0, 0.6, { s: [1, 1.035] }, 'lin');
  const tSai = 0.46;
  sai(lg, tSai, { dy: -70, dur: 0.34 });
  sai(t1, tSai + 0.04, { dy: -50, dur: 0.32 });
  sai(t2, tSai + 0.08, { dy: -50, dur: 0.32 });
  M.para(linhaOb, tSai + 0.06, 0.26, { sx: 0 }, 'in3');
  sai(selo, tSai + 0.1, { dy: 40, dur: 0.3 });
  som(tSai + 0.22, 'whoosh', { dur: 0.5, forca: 0.55 });

  /* ================= A · "Em muita pousada, o dono faz tudo:" ================= */
  const gA = grupo(el, 540, 640);
  const casa = ico(gA.dom, 'casa', 540, 600, 300, COR.branco, 1.05);
  desenhar(casa.svg, d('Em') - 0.16, 1.0);
  som(d('Em') - 0.1, 'risco', { dur: 0.9, forca: 0.6 });
  M.para(casa, d('Em') - 0.16, 1.4, { s: [0.94, 1] }, 'out3');
  // "muita pousada": outras duas, menores, dos lados
  const vizinhas = [[248, 660, 0.02], [832, 660, 0.2]].map(([x, y, dt], i) => {
    const c = ico(gA.dom, 'casa', x, y, 176, COR.cinza, 1.3);
    desenhar(c.svg, d('muita') - 0.04 + dt, 0.7);
    som(d('muita') + dt, 'risco', { dur: 0.5, forca: 0.4, pan: i ? 0.5 : -0.5 });
    M.para(c, d('dono') - 0.2, 0.3, { o: 0, s: 0.7 }, 'in3');
    return c;
  });
  M.vivo((t) => { vizinhas.forEach((c, i) => { if (c.v.o > 0.01) M.mais(c.dom, `translateY(${M.r3(Math.sin(t * 2.4 + i * 2) * 6)}px)`); }); if (casa.v.o > 0.01 && t < d('dono')) M.mais(casa.dom, `translateY(${M.r3(Math.sin(t * 2.4 + 1) * 5)}px)`); });
  // o dono no centro
  const disco = h('div', { style: `position:absolute;left:${540 - 112}px;top:${640 - 112}px;width:224px;height:224px;border-radius:50%;background:${COR.branco};display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;` }, [B.icone('pessoa', 128, COR.tinta, 1.9)]);
  gA.dom.appendChild(disco);
  const discoOb = M.el(disco, { o: 0, s: 0.3 });
  const tDono = d('dono') - 0.06;
  M.para(casa, tDono - 0.1, 0.5, { s: 0.42, y: -300 }, 'io3');
  M.para(casa, tDono - 0.1, 0.5, { o: 0.6 }, 'io2');
  estala(discoOb, tDono, { dur: 0.5 });
  som(tDono, 'pop', { forca: 0.8 });
  // tarefas saltam do dono: "faz tudo"
  const tarefas = [
    ['Reservas', 'reservas', 236, 452], ['Consumo', 'comandas', 844, 452],
    ['Check-out', 'saida', 236, 828], ['Caixa', 'caixa', 844, 828],
  ];
  const sv = s('svg', { viewBox: '0 0 1080 1920', width: 1080, height: 1920, style: 'position:absolute;left:0;top:0;overflow:visible' });
  gA.dom.insertBefore(sv, disco);
  const linhasA = [];
  const chipsA = tarefas.map(([nome, ic, x, y], i) => {
    const t0 = d('faz') - 0.04 + i * 0.17;
    const ln = s('line', { x1: 540, y1: 640, x2: x, y2: y, stroke: COR.cinza2, 'stroke-width': 3, 'stroke-dasharray': '2 12', 'stroke-linecap': 'round' });
    sv.appendChild(ln);
    const lo = M.el(ln, { o: 0, fluxo: true });
    linhasA.push(lo);
    M.para(lo, t0, 0.3, { o: [0, 1] }, 'out2');
    const c = chip(gA.dom, x, y, nome, { icone: ic, tam: 42, alt: 92 }, { o: 0 });
    M.para(c, t0, 0.14, { o: [0, 1] }, 'out2');
    M.para(c, t0, 0.5, { x: [540 - x, 0], y: [640 - y, 0], s: [0.3, 1] }, 'back');
    som(t0 + 0.05, 'pop', { forca: 0.55, pan: x < 540 ? -0.4 : 0.4 });
    return c;
  });
  // vida: as tarefas flutuam e o dono "balança" com a carga
  M.vivo((t) => {
    chipsA.forEach((c, i) => {
      if (c.v.o < 0.01) return;
      M.mais(c.dom, ` translate(${M.r3(Math.sin(t * 1.9 + i * 1.7) * 7)}px,${M.r3(Math.cos(t * 2.3 + i) * 9)}px)`);
    });
    if (discoOb.v.o > 0.01) M.mais(disco, ` rotate(${M.r3(Math.sin(t * 5.2) * 2.4)}deg)`);
  });

  /* ================= B · "a reserva fica no caderno e no WhatsApp, o consumo, no papel." ================= */
  const tB = d('a') - 0.12;
  // as tarefas voltam para o dono, que sobe e vira cabeçalho; cada uma volta depois como um problema
  chipsA.forEach((c, i) => {
    const [, , x, y] = tarefas[i];
    M.para(c, tB + i * 0.04, 0.3, { x: 540 - x, y: 640 - y, s: 0.3 }, 'in3');
    M.para(c, tB + i * 0.04 + 0.16, 0.14, { o: 0 }, 'in2');
  });
  linhasA.forEach((lo) => M.para(lo, tB, 0.2, { o: 0 }, 'in2'));
  M.para(gA, tB + 0.1, 0.6, { y: -340 }, 'io3');
  M.para(discoOb, tB + 0.1, 0.6, { s: 0.5 }, 'io3');
  M.para(casa, tB, 0.3, { o: 0 }, 'in2');
  som(tB + 0.3, 'whoosh', { dur: 0.6, forca: 0.5 });

  const gB = grupo(el, 540, 660);
  const CX = [222, 540, 858], CY = 672, CW = 296, CH = 340;
  const cartoes = [
    { nome: 'Caderno', ic: 'caderno', t: d('caderno') - 0.1 },
    { nome: 'WhatsApp', ic: 'conversa', t: d('WhatsApp') - 0.1 },
    { nome: 'Papel', ic: 'papel', t: d('papel') - 0.12 },
  ].map((c, i) => {
    const g = grupo(gB.dom, CX[i], CY, { o: 0 });
    const cx = CX[i];
    g.dom.appendChild(h('div', { class: 'cartao', style: `position:absolute;left:${cx - CW / 2}px;top:${CY - CH / 2}px;width:${CW}px;height:${CH}px;` }));
    const ic = ico(g.dom, c.ic, cx, CY - 44, 150, COR.branco, 1.3);
    desenhar(ic.svg, c.t + 0.1, 0.75);
    txt(g.dom, cx, CY + 112, c.nome, { tam: 38, peso: 600, larg: CW });
    M.para(g, c.t, 0.16, { o: [0, 1] }, 'out2');
    M.para(g, c.t, 0.55, { y: [70, 0], s: [0.86, 1], r: [i === 1 ? 4 : -4, [-2.2, 1.6, -1.4][i]] }, 'back');
    som(c.t + 0.02, 'pop', { forca: 0.7, pan: (cx - 540) / 500 });
    som(c.t + 0.15, 'risco', { dur: 0.6, forca: 0.55, pan: (cx - 540) / 500 });
    return Object.assign(c, { g, ic, cx });
  });
  // detalhes vivos dentro de cada cartão
  // caderno: rabisco que se escreve e é riscado
  {
    const c = cartoes[0];
    const r = s('svg', { viewBox: '0 0 296 340', width: CW, height: CH, style: `position:absolute;left:${c.cx - CW / 2}px;top:${CY - CH / 2}px;overflow:visible`, fill: 'none', stroke: COR.ambar, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    r.innerHTML = '<path d="M196 96c8-10 14 10 22 0s14 10 22 0"/><path d="M190 132l58-26"/>';
    c.g.dom.appendChild(r);
    desenhar(r, c.t + 0.75, 0.6);
  }
  // WhatsApp: balõezinhos de mensagem que pipocam
  {
    const c = cartoes[1];
    [[c.cx + 84, CY - 118, 0.95], [c.cx + 104, CY - 84, 1.25], [c.cx + 78, CY - 52, 1.6]].forEach(([x, y, dt], i) => {
      const b = h('div', { style: `position:absolute;left:${x - 27}px;top:${y - 13}px;width:${[54, 40, 60][i]}px;height:26px;border-radius:13px 13px 13px 4px;background:${COR.ambar};transform-origin:0 100%;` });
      c.g.dom.appendChild(b);
      const bo = M.el(b, { o: 0, s: 0.2 });
      estala(bo, c.t + dt, { dur: 0.36, s0: 0.2 });
      som(c.t + dt, 'tick', { forca: 0.45, pan: 0.1 });
    });
  }
  // papel: risquinhos de contagem
  {
    const c = cartoes[2];
    const r = s('svg', { viewBox: '0 0 296 340', width: CW, height: CH, style: `position:absolute;left:${c.cx - CW / 2}px;top:${CY - CH / 2}px;overflow:visible`, fill: 'none', stroke: COR.ambar, 'stroke-width': 4, 'stroke-linecap': 'round' });
    r.innerHTML = '<path d="M212 78v30"/><path d="M224 78v30"/><path d="M236 78v30"/><path d="M248 78v30"/><path d="M204 104l52-22"/>';
    c.g.dom.appendChild(r);
    desenhar(r, c.t + 0.6, 0.6, { sobre: 0.8 });
  }
  // rótulos: "a reserva" aponta para caderno e WhatsApp; "o consumo", para o papel
  const svB = s('svg', { viewBox: '0 0 1080 1920', width: 1080, height: 1920, style: 'position:absolute;left:0;top:0;overflow:visible', fill: 'none', stroke: COR.cinza, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  gB.dom.insertBefore(svB, gB.dom.firstChild);
  const yR = 410, yTopo = CY - CH / 2;
  const pR1 = s('path', { d: `M381 ${yR + 35}v14q0 12-12 12H234q-12 0-12 12V${yTopo}` });
  const pR2 = s('path', { d: `M381 ${yR + 35}v14q0 12 12 12h135q12 0 12 12V${yTopo}` });
  const pC = s('path', { d: `M858 ${yR + 35}V${yTopo}` });
  [pR1, pR2, pC].forEach((p) => svB.appendChild(p));
  const rotR = chip(gB.dom, 381, yR, 'A reserva', { icone: 'reservas', tam: 32, alt: 70 }, { o: 0 });
  estala(rotR, d('reserva') - 0.1, { dur: 0.42, s0: 0.5 });
  som(d('reserva') - 0.08, 'pop', { forca: 0.6, pan: -0.2 });
  for (const [p, t0] of [[pR1, cartoes[0].t - 0.18], [pR2, cartoes[1].t - 0.18]]) {
    p.setAttribute('pathLength', 1); p.style.strokeDasharray = '1';
    const o = M.el(p, { tr: 0, o: 0, fluxo: true });
    M.por(o, t0, { o: 1 }); M.para(o, t0, 0.36, { tr: [0, 1] }, 'io3');
  }
  const rotC = chip(gB.dom, 858, yR, 'O consumo', { icone: 'comandas', tam: 32, alt: 70 }, { o: 0 });
  estala(rotC, d('consumo') - 0.1, { dur: 0.42, s0: 0.5 });
  som(d('consumo') - 0.08, 'pop', { forca: 0.6, pan: 0.4 });
  {
    pC.setAttribute('pathLength', 1); pC.style.strokeDasharray = '1';
    const o = M.el(pC, { tr: 0, o: 0, fluxo: true });
    M.por(o, cartoes[2].t - 0.18, { o: 1 }); M.para(o, cartoes[2].t - 0.18, 0.3, { tr: [0, 1] }, 'io3');
  }
  M.vivo((t) => {
    cartoes.forEach((c, i) => {
      if (c.g.v.o < 0.01) return;
      M.mais(c.g.dom, ` translate(${M.r3(Math.sin(t * 1.3 + i * 2.1) * 5)}px,${M.r3(Math.cos(t * 1.7 + i * 1.3) * 7)}px) rotate(${M.r3(Math.sin(t * 1.1 + i) * 0.9)}deg)`);
    });
  });

  /* ================= C · "No check-out, ninguém sabe ao certo quanto o hóspede ainda deve." ================= */
  const tC = d('No') - 0.14;
  M.para(gB, tC, 0.5, { o: 0.5 }, 'io2');
  M.para(gA, tC, 0.5, { o: 0.5 }, 'io2');
  const PY = 1100, PW = 414, PH = 380, XC = 293, XD = 727;   // painéis terminam em x = 934
  const gC = grupo(el, XC, PY, { o: 0 });
  gC.dom.appendChild(h('div', { class: 'cartao', style: `position:absolute;left:${XC - PW / 2}px;top:${PY - PH / 2}px;width:${PW}px;height:${PH}px;` }));
  const icC = ico(gC.dom, 'saida', 146, PY - 132, 56, COR.branco, 1.9);
  desenhar(icC.svg, tC + 0.15, 0.6);
  txt(gC.dom, 188, PY - 132, 'Check-out', { tam: 42, peso: 700, alinh: 'left', larg: 300 });
  txt(gC.dom, 118, PY - 52, 'O hóspede ainda deve', { tam: 30, peso: 500, cor: COR.cinza, alinh: 'left', larg: 380 });
  // s: 1 explícito — sem ele o número ficava na escala de origem do "pulo" final (1,25) durante todo o giro
  // e "R$ 412,00" passava da borda. A 64 px o valor mais largo mede 328 px: margens 32 / 54 px.
  const valC = txt(gC.dom, 118, PY + 44, 'R$ 0,00', { tam: 64, peso: 700, cor: COR.branco, alinh: 'left', larg: 330, mono: true, esp: '-0.03em' }, { s: 1 });
  M.para(gC, tC, 0.18, { o: [0, 1] }, 'out2');
  M.para(gC, tC, 0.55, { y: [90, 0], s: [0.9, 1] }, 'back');
  som(tC + 0.04, 'pop', { forca: 0.75, pan: -0.4 });
  // número que gira e não para em valor nenhum
  const tGira = d('ninguém') - 0.1, tDeve = d('deve');
  som(tGira, 'contagem', { dur: tDeve - tGira - 0.1, forca: 0.6, pan: -0.3 });
  const opcoes = [412, 380, 287, 520, 94, 610, 156, 345, 66, 490, 238, 715];
  M.vivo((t) => {
    if (gC.v.o < 0.01) return;
    let s2;
    if (t < tGira) s2 = 'R$ 0,00';
    else if (t < tDeve + 0.25) s2 = 'R$ ' + moeda(opcoes[Math.floor((t - tGira) * 14) % opcoes.length]);
    else s2 = 'R$ ???';
    if (valC.dom.__t !== s2) { valC.dom.__t = s2; valC.dom.textContent = s2; }
    valC.dom.style.color = t >= tDeve + 0.25 ? COR.ambar : COR.branco;
  });
  M.para(valC, tDeve + 0.25, 0.4, { s: [1.25, 1] }, 'back');
  som(tDeve + 0.25, 'erro', { forca: 0.65, pan: -0.3 });
  // interrogações âmbar
  [[446, PY - 136, d('sabe')], [462, PY - 52, d('quanto')], [456, PY + 132, d('ainda')]].forEach(([x, y, t0], i) => {
    const q = ico(gC.dom, 'interrogacao', x, y, [64, 50, 48][i], COR.ambar, 2.2, { o: 0 });
    estala(q, t0, { dur: 0.42, s0: 0.2 });
    M.para(q, t0, 0.5, { r: [-30, [12, -8, 16][i]] }, 'out3');
    som(t0, 'tick', { forca: 0.6, pan: -0.2 });
    M.vivo((t) => { if (q.v.o > 0.01) M.mais(q.dom, ` translateY(${M.r3(Math.sin(t * 2.6 + i * 2) * 6)}px)`); });
  });
  const rotQ = txt(gC.dom, 118, PY + 136, 'ninguém sabe ao certo', { tam: 30, peso: 600, cor: COR.ambar, alinh: 'left', larg: 380 }, { o: 0 });
  entra(rotQ, tDeve + 0.3, { dy: 20, dur: 0.4 });

  /* ================= D · "E no fim do dia, o caixa não bate." ================= */
  const tD = d('E') - 0.14;
  M.para(gC, tD + 0.1, 0.5, { o: 0.62 }, 'io2');
  const gD = grupo(el, XD, PY, { o: 0 });
  gD.dom.appendChild(h('div', { class: 'cartao', style: `position:absolute;left:${XD - PW / 2}px;top:${PY - PH / 2}px;width:${PW}px;height:${PH}px;` }));
  const icD = ico(gD.dom, 'caixa', 580, PY - 132, 56, COR.branco, 1.9);
  desenhar(icD.svg, tD + 0.15, 0.6);
  txt(gD.dom, 622, PY - 132, 'Caixa', { tam: 42, peso: 700, alinh: 'left', larg: 200 });
  const lua = ico(gD.dom, 'lua', 878, PY - 132, 50, COR.cinza, 2);
  desenhar(lua.svg, d('fim') - 0.05, 0.6);
  M.para(lua, d('fim') - 0.05, 0.9, { r: [-50, 0] }, 'out3');
  txt(gD.dom, 552, PY - 46, 'Esperado', { tam: 30, peso: 500, cor: COR.cinza, alinh: 'left', larg: 200 });
  const vE = txt(gD.dom, 902, PY - 46, 'R$ 0,00', { tam: 36, peso: 700, alinh: 'right', larg: 260, mono: true, esp: '-0.03em' });
  txt(gD.dom, 552, PY + 24, 'Na gaveta', { tam: 30, peso: 500, cor: COR.cinza, alinh: 'left', larg: 200 });
  const vG = txt(gD.dom, 902, PY + 24, 'R$ 0,00', { tam: 36, peso: 700, alinh: 'right', larg: 260, mono: true, esp: '-0.03em' });
  M.para(gD, tD, 0.18, { o: [0, 1] }, 'out2');
  M.para(gD, tD, 0.55, { y: [90, 0], s: [0.9, 1] }, 'back');
  som(tD + 0.04, 'pop', { forca: 0.75, pan: 0.4 });
  // os dois números contam… e param em valores diferentes (os da tela real do fechamento)
  const cE = contador(vE.dom, (n) => 'R$ ' + moeda(Math.round(n)));
  const cG = contador(vG.dom, (n) => 'R$ ' + moeda(Math.round(n)));
  const tCx = d('caixa') - 0.3;
  M.para(cE, tCx, 0.62, { n: [0, 285] }, 'out3');
  M.para(cG, tCx + 0.08, 0.62, { n: [0, 270] }, 'out3');
  som(tCx, 'contagem', { dur: 0.66, forca: 0.6, pan: 0.3 });
  // "não bate": o sinal de diferente carimba e o painel treme
  const tNB = d('não') - 0.02;
  const selo2 = h('div', { style: `position:absolute;left:${XD - 150}px;top:${PY + 82}px;width:300px;height:76px;border-radius:38px;background:${COR.ambar};color:${COR.tinta};display:flex;align-items:center;justify-content:center;gap:12px;font-weight:800;font-size:36px;transform-origin:50% 50%;` }, [B.icone('desigual', 44, COR.tinta, 2.6), h('span', { text: 'não bate' })]);
  gD.dom.appendChild(selo2);
  const seloOb = M.el(selo2, { o: 0, s: 1.15, r: -6 });   // carimba sem passar da borda do cartão
  M.para(seloOb, tNB, 0.1, { o: [0, 1] }, 'out2');
  M.para(seloOb, tNB, 0.34, { s: [1.15, 1], r: [-6, -4] }, 'out4');
  som(tNB + 0.16, 'carimbo', { forca: 0.8, pan: 0.3 });
  som(tNB + 0.2, 'erro', { forca: 0.6, pan: 0.3 });
  vG.dom.style.transition = 'none';
  M.vivo((t) => {
    if (gD.v.o < 0.01) return;
    vG.dom.style.color = t >= tNB + 0.16 ? COR.ambar : COR.branco;
    // tremida que decai depois do carimbo, e volta em pulsos na pausa
    const dt = t - (tNB + 0.16);
    if (dt > 0) {
      const amp = 9 * Math.exp(-dt * 5) + 2.2 * Math.max(0, Math.sin(dt * 4.2)) ** 6;
      M.mais(gD.dom, ` translate(${M.r3(Math.sin(t * 61) * amp)}px,${M.r3(Math.cos(t * 47) * amp * 0.5)}px)`);
    }
  });

  /* ================= pausa → tudo é puxado para o centro (virada) ================= */
  const fimDor = A('dor').fim;
  // enquanto a voz respira: os alertas pulsam
  [gC, gD].forEach((g, i) => {
    for (let k = 0; k < 3; k++) {
      const t0 = fimDor + 0.12 + k * 0.42 + i * 0.2;
      M.para(g, t0, 0.2, { s: 1.035 }, 'out2'); M.para(g, t0 + 0.2, 0.22, { s: 1 }, 'io2');
    }
  });
  M.para(gA, fimDor + 0.1, 0.5, { o: 1 }, 'io2');
  M.para(gB, fimDor + 0.1, 0.5, { o: 1 }, 'io2');
  M.para(gC, fimDor + 0.1, 0.5, { o: 1 }, 'io2');
  const tPuxa = tZ - 0.42;
  som(tPuxa - 0.75, 'subida', { dur: 1.15, forca: 0.45 });
  [[gA, 540, 640, 0], [gB, 540, 660, 0.03], [gC, XC, PY, 0.06], [gD, XD, PY, 0.09]].forEach(([g, cx, cy, dt]) => {
    // antecipação: abre um pouco… e é sugado
    M.para(g, tPuxa - 0.3 + dt, 0.3, { s: 1.06 }, 'out2');
    M.para(g, tPuxa + dt, 0.4, g === gA ? { y: 60, s: 0.03 } : { x: 540 - cx, y: 700 - cy, s: 0.03 }, 'in4');
    M.para(g, tPuxa + dt + 0.22, 0.18, { o: 0 }, 'in2');
  });
});
