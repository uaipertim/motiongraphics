/* "E se a internet cair no meio de um recebimento, o mesmo pagamento não é lançado duas vezes."
 * Cena gráfica (sem tela): o sinal cai, o recebimento fica LANÇADO 1 VEZ e a repetição é barrada.
 */
(window.CENAS = window.CENAS || []).push(function (raizCenas) {
  const { h, s, T, A, som, COR, grupo, ico, txt, chip, desenhar, estala, entra, sai, rnd } = B;
  const el = h('div', { class: 'cena', id: 'c-internet' });
  raizCenas.appendChild(el);
  const i = (w, n) => T('internet', w, n);
  const t0 = A('internet').ini, tFim = A('comeca1').ini;
  M.cena(el, t0 - 0.15, tFim + 0.05);

  /* ---------- sinal da internet ---------- */
  const WX = 540, WY = 366, WT = 220;
  const gW = grupo(el, WX, WY);
  const k = WT / 24;
  const sv = s('svg', { viewBox: '0 0 24 24', width: WT, height: WT, style: `position:absolute;left:${WX - WT / 2}px;top:${WY - WT / 2}px;overflow:visible`, fill: 'none', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const partes = ['M12 20h.01', 'M8.5 16.4a5 5 0 0 1 7 0', 'M5 12.9a10 10 0 0 1 14 0', 'M2 8.8a15 15 0 0 1 20 0'].map((d) => {
    const p = s('path', { d, stroke: COR.limao, pathLength: 1, style: 'transform-box:fill-box;transform-origin:50% 100%' });
    sv.appendChild(p);
    return p;
  });
  gW.dom.appendChild(sv);
  const tCai = i('cair') - 0.04;
  const pOb = partes.map((p, n) => {
    p.style.strokeDasharray = '1';
    const o = M.el(p, { tr: 0, o: 0, fluxo: true });
    M.por(o, t0 - 0.1 + n * 0.1, { o: 1 });
    M.para(o, t0 - 0.1 + n * 0.1, 0.4, { tr: [0, 1] }, 'out3');
    return o;
  });
  som(t0 - 0.2, 'pop', { forca: 0.6 });
  // ondas de sinal enquanto está no ar
  M.vivo((t) => {
    partes.forEach((p, n) => {
      if (n === 0) return;
      const vivo = t < tCai + (3 - n) * 0.13 || t > tVolta + 0.6;
      if (vivo && t > t0 + 0.4) p.style.opacity = String(M.r3(0.55 + 0.45 * Math.max(0, Math.sin((t - t0) * 7 - n * 1.1))));
    });
  });
  // "cair": os arcos despencam um a um, de fora para dentro; o ponto fica âmbar
  [3, 2, 1].forEach((n, q) => {
    const tq = tCai + q * 0.13;
    M.para(pOb[n], tq, 0.42, { y: [0, 2.2], r: [0, (q % 2 ? -1 : 1) * 11] }, 'mola');   // o arco despenca e fica "morto"
    M.para(pOb[n], tq, 0.3, { o: 0.3 }, 'in2');
    som(tq, 'tick', { forca: 0.6 });
  });
  som(tCai, 'queda', { dur: 0.8, forca: 0.7 });
  const ponto = partes[0];
  M.vivo((t) => {
    ponto.setAttribute('stroke', t >= tCai + 0.3 && t < tVolta ? COR.ambar : COR.limao);
    [3, 2, 1].forEach((n, q) => partes[n].setAttribute('stroke', t >= tCai + q * 0.13 + 0.1 && t < tVolta + (3 - q - 1) * 0.1 ? COR.cinza : COR.limao));
  });
  // risco âmbar por cima
  const risco = s('path', { d: 'M4.5 4.5 19.5 19.5', stroke: COR.ambar, 'stroke-width': 2.1, pathLength: 1 });
  sv.appendChild(risco);
  risco.style.strokeDasharray = '1';
  const rOb = M.el(risco, { tr: 0, o: 0, fluxo: true });
  M.por(rOb, tCai + 0.3, { o: 1 });
  M.para(rOb, tCai + 0.3, 0.3, { tr: [0, 1] }, 'out3');
  M.para(gW, tCai + 0.3, 0.5, { x: [0, 0] });
  M.vivo((t) => { const dt = t - (tCai + 0.3); if (dt > 0 && dt < 0.7) M.mais(gW.dom, `translate(${M.r3(Math.sin(t * 70) * 10 * Math.exp(-dt * 6))}px,0)`); });
  const semNet = chip(el, WX, WY + 168, 'Sem internet', { tipo: 'ambar', tam: 34, alt: 70 }, { o: 0 });
  estala(semNet, tCai + 0.42, { dur: 0.42, s0: 0.5 });

  /* ---------- o recebimento ---------- */
  const CW = 860, CH = 262, CX = 540, CY = 760;
  function cartao(cy, fantasma) {
    const g = grupo(el, CX, cy, { o: 0 });
    const cor = fantasma ? 'rgba(232,163,23,0.85)' : '#33332F';
    g.dom.appendChild(h('div', { style: `position:absolute;left:${CX - CW / 2}px;top:${cy - CH / 2}px;width:${CW}px;height:${CH}px;border-radius:32px;background:${fantasma ? 'rgba(26,26,24,0.6)' : COR.grafite};${fantasma ? `border:3px dashed ${cor};` : `box-shadow:inset 0 0 0 1.5px ${cor};`}` }));
    g.dom.appendChild(h('div', { style: `position:absolute;left:${CX - CW / 2 + 36}px;top:${cy - CH / 2 + 36}px;width:104px;height:104px;border-radius:28px;background:${COR.grafite2};display:flex;align-items:center;justify-content:center;` }, [B.icone('dinheiro', 60, fantasma ? COR.ambar : COR.limao, 1.9)]));
    txt(g.dom, CX - CW / 2 + 168, cy - CH / 2 + 66, 'Recebimento', { tam: 44, peso: 700, alinh: 'left', larg: 400 });
    txt(g.dom, CX - CW / 2 + 168, cy - CH / 2 + 114, fantasma ? 'o mesmo pagamento' : 'do check-out', { tam: 28, peso: 500, cor: fantasma ? COR.ambar : COR.cinza, alinh: 'left', larg: 460 });
    txt(g.dom, CX + CW / 2 - (fantasma ? 84 : 40), cy - CH / 2 + 86, 'R$ 412,00', { tam: 54, peso: 700, alinh: 'right', larg: 360, mono: true, esp: '-0.03em' });
    return g;
  }
  const gR = cartao(CY, false);
  M.para(gR, t0 - 0.02, 0.18, { o: [0, 1] }, 'out2');
  M.para(gR, t0 - 0.02, 0.6, { y: [130, 0], s: [0.92, 1] }, 'back');
  som(t0 + 0.03, 'pop', { forca: 0.7 });
  // barra de envio: avança, trava no meio quando a internet cai
  const BX = CX - CW / 2 + 36, BY = CY + CH / 2 - 86, BW = CW - 72;   // estado do envio a 26 px da borda de baixo
  gR.dom.appendChild(h('div', { style: `position:absolute;left:${BX}px;top:${BY}px;width:${BW}px;height:12px;border-radius:6px;background:${COR.grafite2};` }));
  const barra = h('div', { style: `position:absolute;left:${BX}px;top:${BY}px;width:${BW}px;height:12px;border-radius:6px;background:${COR.limao};transform-origin:0 50%;` });
  gR.dom.appendChild(barra);
  const estado = txt(gR.dom, BX, BY + 38, 'Lançando…', { tam: 30, peso: 500, cor: COR.cinza, alinh: 'left', larg: 500 });
  const tVolta = A('internet').fim + 0.45;       // a internet volta na pausa
  const bOb = M.obj({ p: 0 }, (q) => { M.setEstilo(barra, 'transform', `scaleX(${M.r3(Math.max(0.001, q.p))})`); });
  M.para(bOb, t0 + 0.15, tCai + 0.35 - (t0 + 0.15), { p: [0, 0.52] }, 'out2');
  M.para(bOb, tVolta + 0.1, 0.5, { p: 1 }, 'io3');
  M.vivo((t) => {
    const parado = t >= tCai + 0.35 && t < tVolta + 0.1;
    barra.style.background = parado ? COR.ambar : COR.limao;
    const s2 = t < tCai + 0.35 ? 'Lançando…' : t < tVolta + 0.1 ? 'Sem resposta' + '.'.repeat(1 + (Math.floor(t * 3) % 3)) : 'Lançado';
    if (estado.dom.__t !== s2) { estado.dom.__t = s2; estado.dom.textContent = s2; }
    estado.dom.style.color = parado ? COR.ambar : t >= tVolta + 0.1 ? COR.limao : COR.cinza;
    if (parado && barra.style.opacity !== undefined) barra.style.opacity = String(M.r3(0.65 + 0.35 * Math.sin(t * 9)));
    else barra.style.opacity = '1';
  });
  // tentar de novo: a seta gira no meio do recebimento
  const refaz = ico(gR.dom, 'refazer', CX + CW / 2 - 62, BY + 36, 40, COR.ambar, 2.2, { o: 0 });
  M.para(refaz, i('meio') - 0.05, 0.2, { o: [0, 1] }, 'out2');
  M.para(refaz, i('meio') - 0.05, i('não') - i('meio') + 0.2, { r: [0, 1080] }, 'io2');
  M.para(refaz, i('não') + 0.1, 0.2, { o: 0 }, 'in2');
  som(i('meio'), 'teclas', { dur: 0.9, forca: 0.4 });

  /* ---------- "o mesmo pagamento": a repetição tenta entrar ---------- */
  const FY = 1106;
  const gF = cartao(FY, true);
  const tMesmo = i('mesmo') - 0.12;
  M.para(gF, tMesmo, 0.16, { o: [0, 0.95] }, 'out2');
  M.para(gF, tMesmo, 0.75, { y: [320, 60], s: [0.86, 0.94] }, 'out4');
  som(tMesmo + 0.3, 'whoosh', { dur: 0.55, forca: 0.45 });
  // "não é lançado duas vezes": bate na barreira e é barrada
  const tNao = i('não') - 0.02;
  const barreira = h('div', { style: `position:absolute;left:${CX - 470}px;top:${CY + CH / 2 + 38}px;width:940px;height:8px;border-radius:4px;background:${COR.limao};box-shadow:0 0 34px rgba(175,250,39,0.65);transform-origin:50% 50%;` });
  el.appendChild(barreira);
  const baOb = M.el(barreira, { o: 0, sx: 0.05 });
  M.para(baOb, tNao - 0.12, 0.1, { o: [0, 1] }, 'out2');
  M.para(baOb, tNao - 0.12, 0.34, { sx: [0.05, 1] }, 'out4');
  M.para(gF, tNao - 0.06, 0.16, { y: 22 }, 'in3');            // investe…
  M.para(gF, tNao + 0.1, 0.5, { y: 96 }, 'out4');             // …e volta
  M.para(gF, tNao + 0.1, 0.5, { s: 0.9, r: [0, -2.5] }, 'out3');
  M.para(baOb, tNao + 0.1, 0.12, { sy: 2.6 }, 'out2'); M.para(baOb, tNao + 0.22, 0.3, { sy: 1 }, 'io2');
  som(tNao + 0.1, 'barrado', { forca: 0.85 });
  M.vivo((t) => { const dt = t - (tNao + 0.1); if (dt > 0 && dt < 0.6) M.mais(gF.dom, `translate(${M.r3(Math.sin(t * 64) * 12 * Math.exp(-dt * 7))}px,0)`); });
  // selo "barrada" na repetição
  const xSelo = h('div', { style: `position:absolute;left:${CX - 190}px;top:${FY - 46}px;width:380px;height:92px;border-radius:20px;background:${COR.tinta};box-shadow:inset 0 0 0 4px ${COR.branco};color:${COR.branco};display:flex;align-items:center;justify-content:center;gap:14px;font-weight:800;font-size:38px;letter-spacing:0.04em;transform-origin:50% 50%;` }, [B.icone('xis', 46, COR.branco, 3), h('span', { text: 'BARRADA' })]);
  gF.dom.appendChild(xSelo);
  const xOb = M.el(xSelo, { o: 0, s: 2, r: 6 });
  M.para(xOb, tNao + 0.34, 0.1, { o: [0, 1] }, 'out2');
  M.para(xOb, tNao + 0.34, 0.3, { s: [2, 1], r: [14, 5] }, 'out4');
  som(tNao + 0.46, 'carimbo', { forca: 0.6 });
  M.para(gF, i('duas') + 0.2, 0.6, { o: 0.42 }, 'io2');

  /* ---------- carimbo: LANÇADO 1 VEZ ---------- */
  const tL = i('lançado') - 0.03;
  const selo = h('div', { style: `position:absolute;left:${CX - 26}px;top:${CY + 12}px;width:440px;height:104px;border-radius:22px;background:${COR.limao};color:${COR.tinta};white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:14px;font-weight:800;font-size:40px;letter-spacing:0.02em;transform-origin:50% 50%;box-shadow:0 14px 40px rgba(0,0,0,0.45);` }, [B.icone('check', 50, COR.tinta, 3.2), h('span', { html: 'LANÇADO <span class="mono" style="font-weight:700">1</span> VEZ' })]);
  gR.dom.appendChild(selo);
  const sOb = M.el(selo, { o: 0, s: 2.6, r: -18 });
  M.para(sOb, tL, 0.1, { o: [0, 1] }, 'out2');
  M.para(sOb, tL, 0.32, { s: [2.6, 1], r: [-20, -5] }, 'out4');
  som(tL + 0.2, 'carimbo', { forca: 0.9 });
  som(tL + 0.34, 'check', { forca: 0.7 });
  M.vivo((t) => { const dt = t - (tL + 0.24); if (dt > 0 && dt < 0.5) M.mais(gR.dom, `translate(0,${M.r3(Math.sin(t * 58) * 8 * Math.exp(-dt * 8))}px)`); });
  // "duas vezes": o 2 não passa
  M.para(sOb, i('duas'), 0.14, { s: 1.08 }, 'out2'); M.para(sOb, i('duas') + 0.14, 0.26, { s: 1 }, 'io2');
  M.para(sOb, i('vezes'), 0.14, { s: 1.08 }, 'out2'); M.para(sOb, i('vezes') + 0.14, 0.26, { s: 1 }, 'io2');

  /* ---------- na pausa: a internet volta e o lançamento continua único ---------- */
  M.para(rOb, tVolta - 0.1, 0.25, { tr: 0 }, 'in3');
  M.para(semNet, tVolta - 0.1, 0.25, { o: 0, s: 0.7 }, 'in3');
  [1, 2, 3].forEach((n, q) => {
    const tq = tVolta + q * 0.1;
    M.para(pOb[n], tq, 0.3, { y: 0, r: 0, o: 1 }, 'back');
    som(tq, 'tick', { forca: 0.5 });
  });
  som(tVolta + 0.55, 'check', { forca: 0.55 });
  for (let q = 0; q < 2; q++) { M.para(sOb, tVolta + 0.6 + q * 0.5, 0.16, { s: 1.07 }, 'out2'); M.para(sOb, tVolta + 0.76 + q * 0.5, 0.28, { s: 1 }, 'io2'); }

  /* ---------- saída ---------- */
  const tS = tFim - 0.34;
  sai(gW, tS, { dy: -80, dur: 0.3 });
  sai(gR, tS + 0.03, { dy: -110, dur: 0.3 });
  sai(gF, tS, { dy: 120, dur: 0.28 });
  M.para(baOb, tS, 0.2, { o: 0 }, 'in2');
  som(tS + 0.15, 'whoosh', { dur: 0.5, forca: 0.5 });
});
