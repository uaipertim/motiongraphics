/* Quanto custa depois.
 * "Depois dos 30 dias, se fizer sentido para você,"            → legenda + linha do tempo
 * "a mensalidade é de R$ 99,90 por mês."                        → valor grande (fora da legenda)
 * "Sem taxa por reserva e sem fidelidade."                      → fichas (fora da legenda)
 * "E as 10 primeiras pousadas pagam R$ 79,90 por mês durante os primeiros 12 meses." → selo
 */
(window.CENAS = window.CENAS || []).push(function (raizCenas) {
  const { h, s, T, TF, TFala, A, som, COR, grupo, ico, txt, chip, desenhar, estala, entra, sai, contador } = B;
  const el = h('div', { class: 'cena', id: 'c-preco' });
  raizCenas.appendChild(el);
  const p = (w, n) => T('preco', w, n);
  const t0 = A('preco').ini, tCham = A('chamada').ini;
  M.cena(el, t0 - 0.2, tCham + 0.05);
  const centavos = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ================= 1 · depois dos 30 dias, se fizer sentido para você ================= */
  const g1 = grupo(el, 540, 700);
  const X0 = 120, X1 = 960, XM = 620, LY = 590;
  g1.dom.appendChild(h('div', { style: `position:absolute;left:${X0}px;top:${LY - 9}px;width:${X1 - X0}px;height:18px;border-radius:9px;background:#33332F;` }));
  const fill = h('div', { style: `position:absolute;left:${X0}px;top:${LY - 9}px;width:${X1 - X0}px;height:18px;border-radius:9px;background:${COR.limao};transform-origin:0 50%;` });
  g1.dom.appendChild(fill);
  const fOb = M.obj({ p: 0 }, (v) => M.setEstilo(fill, 'transform', `scaleX(${M.r3(Math.max(0.001, v.p))})`));
  M.para(g1, t0 - 0.16, 0.25, { o: [0, 1] }, 'out2');
  M.para(g1, t0 - 0.16, 0.5, { y: [60, 0] }, 'out4');
  M.para(fOb, t0 - 0.05, p('dias') + 0.3 - t0, { p: [0, (XM - X0) / (X1 - X0)] }, 'io2');
  som(t0, 'deslize', { dur: 0.9, forca: 0.5 });
  const lab30 = chip(g1.dom, (X0 + XM) / 2, LY - 108, '30 dias grátis', { tipo: 'limao', tam: 46, alt: 96, icone: 'check' }, { o: 0 });
  estala(lab30, p('30') - 0.1, { dur: 0.45, s0: 0.4 });
  som(p('30') - 0.05, 'pop', { forca: 0.6, pan: -0.3 });
  // marco: fim do teste
  const marco = h('div', { style: `position:absolute;left:${XM - 26}px;top:${LY - 26}px;width:52px;height:52px;border-radius:50%;background:${COR.branco};box-shadow:0 0 0 8px ${COR.tinta};transform-origin:50% 50%;` });
  g1.dom.appendChild(marco);
  const mOb = M.el(marco, { o: 0, s: 0.2 });
  estala(mOb, p('dias') + 0.22, { dur: 0.4, s0: 0.2, ease: 'back2' });
  som(p('dias') + 0.24, 'tick', { forca: 0.8 });
  const depois = txt(g1.dom, (XM + X1) / 2, LY - 108, 'depois', { tam: 52, peso: 600, cor: COR.cinza, larg: 300 }, { o: 0 });
  entra(depois, p('dias') + 0.3, { dy: 20, dur: 0.4 });
  // pulso que corre pelo trecho "depois"
  const pulso = h('div', { style: `position:absolute;left:${XM}px;top:${LY - 9}px;width:90px;height:18px;border-radius:9px;background:linear-gradient(90deg, rgba(244,244,240,0), rgba(244,244,240,0.85), rgba(244,244,240,0));` });
  g1.dom.appendChild(pulso);
  M.vivo((t) => { const u = ((t - t0) * 0.9) % 1; pulso.style.transform = `translateX(${M.r3(u * (X1 - XM - 90))}px)`; pulso.style.opacity = t > p('dias') + 0.4 ? String(M.r3(Math.sin(u * Math.PI))) : '0'; });
  // "se fizer sentido para você": você decide
  const voce = h('div', { style: `position:absolute;left:${540 - 262}px;top:${930 - 118}px;width:236px;height:236px;border-radius:50%;background:${COR.branco};display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;` }, [B.icone('pessoa', 136, COR.tinta, 1.9)]);
  g1.dom.appendChild(voce);
  const vOb = M.el(voce, { o: 0, s: 0.3 });
  estala(vOb, p('se') - 0.08, { dur: 0.46, s0: 0.3 });
  som(p('se') - 0.04, 'pop', { forca: 0.7, pan: -0.2 });
  const ok = h('div', { style: `position:absolute;left:${540 + 26}px;top:${930 - 118}px;width:236px;height:236px;border-radius:50%;background:${COR.limao};display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;` }, [B.icone('check', 144, COR.tinta, 2.6)]);
  g1.dom.appendChild(ok);
  const okOb = M.el(ok, { o: 0, s: 0.3 });
  estala(okOb, p('sentido') - 0.06, { dur: 0.5, s0: 0.3, ease: 'back2' });
  desenhar(ok.querySelector('svg'), p('sentido'), 0.4);
  som(p('sentido'), 'check', { forca: 0.75, pan: 0.2 });
  M.para(vOb, p('você') - 0.02, 0.16, { s: 1.12 }, 'out2'); M.para(vOb, p('você') + 0.14, 0.3, { s: 1 }, 'io2');
  M.vivo((t) => { if (okOb.v.o > 0.01) { M.mais(ok, `translateY(${M.r3(Math.sin(t * 2.4 + 1) * 6)}px)`); M.mais(voce, `translateY(${M.r3(Math.sin(t * 2.4) * 6)}px)`); } });
  const t1s = p('a') - 0.3;
  sai(g1, t1s, { dy: -150, dur: 0.32, s1: 0.9 });
  som(t1s + 0.2, 'whoosh', { dur: 0.5, forca: 0.5 });

  /* ================= 2 · a mensalidade é de R$ 99,90 por mês ================= */
  const g2 = grupo(el, 540, 800);
  const lab = txt(g2.dom, 540, 470, 'Mensalidade', { tam: 62, peso: 600, cor: COR.branco }, { o: 0 });
  entra(lab, p('mensalidade') - 0.08, { dy: 30, dur: 0.42 });
  som(p('mensalidade') - 0.04, 'pop', { forca: 0.5 });
  // R$ + valor que conta enquanto a voz fala o preço
  const linhaV = h('div', { class: 'mono', style: `position:absolute;left:0;top:560px;width:1080px;height:280px;display:flex;align-items:baseline;justify-content:center;gap:26px;font-weight:700;line-height:1;letter-spacing:-0.05em;transform-origin:50% 60%;` });
  const rs = h('span', { text: 'R$', style: `font-size:104px;color:${COR.branco};` });
  const val = h('span', { text: '0,00', style: `font-size:244px;color:${COR.limao};` });
  linhaV.appendChild(rs); linhaV.appendChild(val);
  g2.dom.appendChild(linhaV);
  const lv = M.el(linhaV, { o: 0 });
  const tV = TFala('preco', 'R$ 99,90', 'noventa') - 0.1;
  M.para(lv, tV, 0.14, { o: [0, 1] }, 'out2');
  M.para(lv, tV, 0.5, { s: [0.6, 1] }, 'back');
  const cV = contador(val, (n) => (n < 99 ? Math.floor(n) + ',00' : centavos(Math.round(n * 10) / 10)));   // reais primeiro, depois os centavos
  const tReais = TFala('preco', 'R$ 99,90', 'reais') + 0.25, tCent = TFala('preco', 'R$ 99,90', 'noventa', 2), tCentF = TFala('preco', 'R$ 99,90', 'centavos') + 0.2;
  M.para(cV, tV, tReais - tV, { n: [0, 99] }, 'out2');                 // "noventa e nove reais"
  M.para(cV, tCent - 0.05, tCentF - tCent + 0.05, { n: 99.9 }, 'out2'); // "e noventa centavos"
  som(tV, 'contagem', { dur: tReais - tV, forca: 0.7 });
  som(tCent - 0.05, 'contagem', { dur: tCentF - tCent + 0.05, forca: 0.6 });
  M.para(lv, tCentF, 0.16, { s: 1.07 }, 'out2'); M.para(lv, tCentF + 0.16, 0.36, { s: 1 }, 'io2');
  som(tCentF, 'valor', { forca: 0.9 });
  const mes = txt(g2.dom, 934, 880, '/mês', { tam: 96, peso: 700, cor: COR.branco, alinh: 'right', larg: 400 }, { o: 0 });
  M.para(mes, p('por') - 0.04, 0.12, { o: [0, 1] }, 'out2');
  M.para(mes, p('por') - 0.04, 0.42, { x: [-60, 0], s: [0.7, 1] }, 'back');
  som(p('por'), 'pop', { forca: 0.6, pan: 0.3 });
  // sublinhado que se desenha na pausa
  const sub = h('div', { style: `position:absolute;left:150px;top:948px;width:780px;height:10px;border-radius:5px;background:${COR.limao};transform-origin:0 50%;` });
  g2.dom.appendChild(sub);
  const sOb = M.el(sub, { o: 0, sx: 0 });
  const tSub = TF('preco', 'mês') + 0.1;
  M.por(sOb, tSub, { o: 1 }); M.para(sOb, tSub, 0.6, { sx: [0, 1] }, 'io3');
  som(tSub, 'risco', { dur: 0.55, forca: 0.5 });
  M.vivo((t) => { if (lv.v.o > 0.01 && t > tCentF + 0.6) M.mais(linhaV, `scale(${M.r3(1 + 0.012 * Math.sin((t - tCentF) * 2.8))})`); });

  /* ================= 3 · sem taxa por reserva e sem fidelidade ================= */
  const fichas = [['Sem taxa por reserva', p('Sem') - 0.08, 1090], ['Sem fidelidade', p('sem') - 0.08, 1214]].map(([texto, t, y], k) => {
    const c = chip(g2.dom, 540, y, texto, { tipo: 'escuro', tam: 50, alt: 104, icone: 'check', corIcone: COR.limao, estilo: 'padding:0 44px;gap:20px;' }, { o: 0 });
    M.para(c, t, 0.14, { o: [0, 1] }, 'out2');
    M.para(c, t, 0.5, { y: [60, 0], s: [0.8, 1] }, 'back');
    desenhar(c.svg, t + 0.16, 0.36);
    som(t + 0.2, 'check', { forca: 0.7 });
    return c;
  });
  M.vivo((t) => { fichas.forEach((c, k) => { if (c.v.o > 0.01) M.mais(c.dom, `translateY(${M.r3(Math.sin(t * 2.2 + k * 1.6) * 4)}px)`); }); });

  /* ================= 4 · selo das 10 primeiras ================= */
  const tE = p('E') - 0.1;
  // o preço normal sobe e fica menor; o selo ocupa o centro
  fichas.forEach((c) => M.para(c, tE - 0.05, 0.25, { o: 0 }, 'in2'));
  M.para(sOb, tE - 0.05, 0.25, { o: 0 }, 'in2');
  M.para(g2, tE, 0.6, { s: 0.52, y: -396 }, 'io3');
  M.para(g2, tE, 0.6, { o: 0.8 }, 'io2');
  som(tE + 0.3, 'whoosh', { dur: 0.55, forca: 0.45 });
  const SX = 540, SY = 1000, SW = 884, SH = 640;
  const gS = grupo(el, SX, SY, { o: 0 });
  const selo = h('div', { style: `position:absolute;left:${SX - SW / 2}px;top:${SY - SH / 2}px;width:${SW}px;height:${SH}px;border-radius:52px;background:${COR.limao};box-shadow:0 30px 80px rgba(0,0,0,0.5);` });
  selo.appendChild(h('div', { style: `position:absolute;inset:16px;border-radius:38px;border:3px dashed rgba(10,10,10,0.45);` }));
  gS.dom.appendChild(selo);
  const tSelo = p('as') - 0.08;
  M.para(gS, tSelo, 0.12, { o: [0, 1] }, 'out2');
  M.para(gS, tSelo, 0.36, { s: [1.7, 1], r: [-12, -2] }, 'out4');
  som(tSelo + 0.22, 'carimbo', { forca: 0.9 });
  M.vivo((t) => { const dt = t - (tSelo + 0.26); if (dt > 0 && dt < 0.5) M.mais(gS.dom, `translate(0,${M.r3(Math.sin(t * 60) * 9 * Math.exp(-dt * 8))}px)`); else if (dt >= 0.5 && gS.v.o > 0.01) M.mais(gS.dom, `rotate(${M.r3(Math.sin((t - tSelo) * 1.5) * 0.5)}deg)`); });
  const TXT = `color:${COR.tinta};`;
  // linha 1: "10 primeiras pousadas:"
  const l1 = h('div', { style: `position:absolute;left:${SX - SW / 2}px;top:${SY - 270}px;width:${SW}px;height:110px;display:flex;align-items:baseline;justify-content:center;gap:20px;${TXT}font-weight:800;font-size:62px;letter-spacing:-0.02em;white-space:nowrap;` });
  const n10 = h('span', { class: 'mono', text: '0', style: 'font-size:104px;font-weight:700;letter-spacing:-0.06em;display:inline-block;min-width:118px;text-align:right;' });
  const l1t = h('span', { text: 'primeiras pousadas:' });
  l1.appendChild(n10); l1.appendChild(l1t);
  selo.parentNode.appendChild(l1);
  const c10 = contador(n10, (n) => String(Math.round(n)));
  const o10 = M.el(n10, { o: 0, fluxo: true }), o1t = M.el(l1t, { o: 0, fluxo: true });
  M.para(o10, p('10') - 0.08, 0.12, { o: [0, 1] }, 'out2');
  M.para(c10, p('10') - 0.08, 0.55, { n: [0, 10] }, 'out2');
  som(p('10') - 0.08, 'contagem', { dur: 0.55, forca: 0.7 });
  M.para(o1t, p('primeiras') - 0.05, 0.14, { o: [0, 1] }, 'out2');
  M.para(o1t, p('primeiras') - 0.05, 0.4, { x: [40, 0] }, 'out4');
  // dez casinhas
  const casas = h('div', { style: `position:absolute;left:${SX - SW / 2}px;top:${SY - 156}px;width:${SW}px;height:60px;display:flex;align-items:center;justify-content:center;gap:16px;` });
  gS.dom.appendChild(casas);
  for (let k = 0; k < 10; k++) {
    const c = B.icone('casa', 50, COR.tinta, 2.2);
    const w = h('span', { style: 'display:inline-block;transform-origin:50% 60%;' }, [c]);
    casas.appendChild(w);
    const o = M.el(w, { o: 0, s: 0.2, fluxo: true });
    estala(o, p('10') - 0.06 + k * 0.055, { dur: 0.3, s0: 0.2 });
  }
  // linha 2: "R$ 79,90 /mês" — desce de 99,90 até 79,90 enquanto a voz fala
  const l2 = h('div', { class: 'mono', style: `position:absolute;left:${SX - SW / 2}px;top:${SY - 96}px;width:${SW}px;height:230px;display:flex;align-items:baseline;justify-content:center;gap:18px;${TXT}font-weight:700;line-height:1;letter-spacing:-0.05em;white-space:nowrap;transform-origin:50% 60%;` });
  const rs2 = h('span', { text: 'R$', style: 'font-size:72px;' });
  const v2 = h('span', { text: '99,90', style: 'font-size:162px;' });
  const mes2 = h('span', { text: '/mês', style: `font-family:'Geist';font-size:56px;font-weight:700;letter-spacing:-0.02em;display:inline-block;transform-origin:0 80%;` });
  l2.appendChild(rs2); l2.appendChild(v2); l2.appendChild(mes2);
  gS.dom.appendChild(l2);
  const o2 = M.el(l2, { o: 0 });
  const tV2 = TFala('preco', 'R$ 79,90', 'setenta') - 0.12;
  M.para(o2, tV2, 0.12, { o: [0, 1] }, 'out2');
  M.para(o2, tV2, 0.45, { s: [0.6, 1] }, 'back');
  const cV2 = contador(v2, (n) => centavos(Math.round(n - 0.9) + 0.9), 99.9);   // desce de real em real, sempre ,90
  const tR2 = TFala('preco', 'R$ 79,90', 'reais') + 0.25;
  M.para(cV2, tV2 + 0.1, tR2 - tV2 - 0.1, { n: [99.9, 79.9] }, 'out2');
  som(tV2 + 0.1, 'contagem', { dur: tR2 - tV2 - 0.1, forca: 0.7 });
  const tC2 = TFala('preco', 'R$ 79,90', 'centavos') + 0.2;
  M.para(o2, tC2, 0.16, { s: 1.08 }, 'out2'); M.para(o2, tC2 + 0.16, 0.36, { s: 1 }, 'io2');
  som(tC2, 'valor', { forca: 0.95 });
  const oMes2 = M.el(mes2, { o: 0, fluxo: true });
  M.para(oMes2, p('por', 3) - 0.04, 0.12, { o: [0, 1] }, 'out2');
  M.para(oMes2, p('por', 3) - 0.04, 0.4, { s: [0.5, 1] }, 'back');
  som(p('por', 3), 'pop', { forca: 0.6 });
  // linha 3: "nos primeiros 12 meses" + doze marcas
  const l3 = h('div', { style: `position:absolute;left:${SX - SW / 2}px;top:${SY + 132}px;width:${SW}px;height:96px;display:flex;align-items:baseline;justify-content:center;gap:18px;${TXT}font-weight:800;font-size:60px;letter-spacing:-0.02em;white-space:nowrap;` });
  const l3a = h('span', { text: 'nos primeiros' }), n12 = h('span', { class: 'mono', text: '0', style: 'font-size:92px;font-weight:700;letter-spacing:-0.06em;display:inline-block;min-width:104px;text-align:center;' }), l3b = h('span', { text: 'meses' });
  l3.appendChild(l3a); l3.appendChild(n12); l3.appendChild(l3b);
  gS.dom.appendChild(l3);
  const o3a = M.el(l3a, { o: 0, fluxo: true }), o12 = M.el(n12, { o: 0, fluxo: true }), o3b = M.el(l3b, { o: 0, fluxo: true });
  M.para(o3a, p('durante') - 0.05, 0.14, { o: [0, 1] }, 'out2');
  M.para(o3a, p('durante') - 0.05, 0.4, { x: [-40, 0] }, 'out4');
  const c12 = contador(n12, (n) => String(Math.round(n)));
  M.para(o12, p('12') - 0.08, 0.12, { o: [0, 1] }, 'out2');
  M.para(c12, p('12') - 0.08, 0.5, { n: [0, 12] }, 'out2');
  som(p('12') - 0.08, 'contagem', { dur: 0.5, forca: 0.7 });
  M.para(o3b, p('meses') - 0.05, 0.14, { o: [0, 1] }, 'out2');
  M.para(o3b, p('meses') - 0.05, 0.4, { x: [40, 0] }, 'out4');
  const barras = h('div', { style: `position:absolute;left:${SX - 360}px;top:${SY + 246}px;width:720px;height:20px;display:flex;gap:8px;` });
  gS.dom.appendChild(barras);
  for (let k = 0; k < 12; k++) {
    const b = h('div', { style: `flex:1;height:20px;border-radius:10px;background:rgba(10,10,10,0.2);position:relative;overflow:hidden;` });
    const f = h('div', { style: `position:absolute;inset:0;border-radius:10px;background:${COR.tinta};transform-origin:0 50%;` });
    b.appendChild(f); barras.appendChild(b);
    const fo = M.obj({ p: 0 }, (v) => M.setEstilo(f, 'transform', `scaleX(${M.r3(v.p)})`));
    M.para(fo, p('12') - 0.06 + k * 0.045, 0.2, { p: [0, 1] }, 'out3');
  }
  // na pausa: o selo respira
  const fim = A('preco').fim;
  for (let k = 0; k < 2; k++) { M.para(gS, fim + 0.2 + k * 0.55, 0.18, { s: 1.03 }, 'out2'); M.para(gS, fim + 0.38 + k * 0.55, 0.3, { s: 1 }, 'io2'); }

  /* ================= saída ================= */
  const tS = tCham - 0.38;
  sai(g2, tS, { dy: -560, dur: 0.3 });
  M.para(gS, tS + 0.02, 0.32, { s: 0.8, y: 80, r: 4 }, 'in3');
  M.para(gS, tS + 0.14, 0.2, { o: 0 }, 'in2');
  som(tS + 0.18, 'whoosh', { dur: 0.5, forca: 0.55 });
});
