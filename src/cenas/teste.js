/* Teste grátis — tipografia. A frase inteira está na tela, por isso fica fora da legenda.
 * "São 30 dias grátis para usar o Hospeda na sua pousada. Sem cartão e sem compromisso."
 */
(window.CENAS = window.CENAS || []).push(function (raizCenas) {
  const { h, s, T, A, som, COR, grupo, txt, chip, desenhar, estala, entra, sai, contador } = B;
  const el = h('div', { class: 'cena', id: 'c-teste' });
  raizCenas.appendChild(el);
  const q = (w, n) => T('teste', w, n);
  const t0 = A('teste').ini, tPreco = A('preco').ini;
  M.cena(el, t0 - 0.2, tPreco + 0.05);

  /* ---------- mostrador de 30 dias ---------- */
  const CX = 540, CY = 620, R = 344;
  const gD = grupo(el, CX, CY);
  const sv = s('svg', { viewBox: '0 0 1080 1920', width: 1080, height: 1920, style: 'position:absolute;left:0;top:0;overflow:visible' });
  gD.dom.appendChild(sv);
  const gT = s('g', { style: `transform-origin:${CX}px ${CY}px` });
  sv.appendChild(gT);
  const tCont = q('30') - 0.14, dCont = 0.8;
  const tiques = [];
  for (let k = 0; k < 30; k++) {
    const ang = (k / 30) * 360 - 90 + 6;
    const r = s('rect', { x: CX - 7, y: CY - R - 26, width: 14, height: 52, rx: 7, fill: '#33332F', transform: `rotate(${ang + 90} ${CX} ${CY})` });
    gT.appendChild(r);
    tiques.push(r);
  }
  const cont = M.obj({ n: 0 }, (v) => {
    const n = Math.round(v.n);
    tiques.forEach((r, k) => { const on = k < n; if (r.__on !== on) { r.__on = on; r.setAttribute('fill', on ? COR.limao : '#33332F'); } });
  });
  M.para(cont, tCont, dCont, { n: [0, 30] }, 'out2');
  som(tCont, 'contagem', { dur: dCont, forca: 0.7 });
  // o mostrador entra girando e continua vivo
  M.para(gD, t0 - 0.16, 0.2, { o: [0, 1] }, 'out2');
  M.para(gD, t0 - 0.16, 0.7, { s: [0.6, 1] }, 'back');
  som(t0 - 0.1, 'pop', { forca: 0.6 });
  M.vivo((t) => {
    gT.style.transform = `rotate(${M.r3((t - t0) * 5.5 + 26 * Math.exp(-(t - t0 + 0.16) * 3.2))}deg)`;
    // um brilho corre pelos tiques acesos
    const pos = ((t - tCont) * 13) % 30;
    tiques.forEach((r, k) => { r.setAttribute('opacity', M.r3(r.__on ? 0.72 + 0.28 * Math.max(0, 1 - Math.abs(((k - pos + 45) % 30) - 15) / 3) : 1)); });
  });

  /* ---------- "São 30 dias grátis" ---------- */
  const sao = txt(gD.dom, CX, CY - 190, 'São', { tam: 60, peso: 600, cor: COR.branco }, { o: 0 });
  entra(sao, q('São') - 0.05, { dy: 24, dur: 0.36 });
  const num = txt(gD.dom, CX, CY - 22, '0', { tam: 290, peso: 800, cor: COR.limao, esp: '-0.05em', alt: 300 }, { o: 0 });
  const nOb = contador(num.dom, (n) => String(Math.round(n)));
  M.para(num, tCont, 0.14, { o: [0, 1] }, 'out2');
  M.para(num, tCont, 0.5, { s: [0.5, 1] }, 'back');
  M.para(nOb, tCont, dCont, { n: [0, 30] }, 'out2');
  M.para(num, tCont + dCont, 0.14, { s: 1.12 }, 'out2'); M.para(num, tCont + dCont + 0.14, 0.34, { s: 1 }, 'io2');
  som(tCont + dCont, 'valor', { forca: 0.8 });
  const dias = txt(gD.dom, CX - 118, CY + 168, 'dias', { tam: 82, peso: 700, larg: 260 }, { o: 0 });
  M.para(dias, q('dias') - 0.05, 0.12, { o: [0, 1] }, 'out2');
  M.para(dias, q('dias') - 0.05, 0.4, { y: [40, 0], s: [0.7, 1] }, 'back');
  som(q('dias'), 'pop', { forca: 0.5 });
  const gratis = h('div', { style: `position:absolute;left:${CX - 8}px;top:${CY + 168 - 56}px;width:264px;height:112px;border-radius:56px;background:${COR.limao};color:${COR.tinta};font-weight:800;font-size:76px;letter-spacing:-0.02em;display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;` }, 'grátis');
  gD.dom.appendChild(gratis);
  const gOb = M.el(gratis, { o: 0, s: 0.3 });
  estala(gOb, q('grátis') - 0.05, { dur: 0.5, s0: 0.3, ease: 'back2' });
  som(q('grátis'), 'impacto', { forca: 0.4 });
  M.vivo((t) => { if (gOb.v.o > 0.01 && t > q('grátis') + 0.5) M.mais(gratis, `rotate(${M.r3(Math.sin((t - t0) * 2.3) * 1.6)}deg) scale(${M.r3(1 + 0.02 * Math.sin((t - t0) * 3.1))})`); });

  /* ---------- "para usar o Hospeda na sua pousada." ---------- */
  const lin = [
    [['para', 'para'], ['usar', 'usar'], ['o', 'o'], ['Hospeda', 'Hospeda']],
    [['na', 'na'], ['sua', 'sua'], ['pousada.', 'pousada']],
  ];
  lin.forEach((ln, li) => {
    const cx = h('div', { style: `position:absolute;left:0;top:${1040 + li * 92}px;width:1080px;height:86px;display:flex;align-items:center;justify-content:center;gap:18px;font-weight:600;font-size:66px;letter-spacing:-0.02em;` });
    el.appendChild(cx);
    ln.forEach(([texto, chave]) => {
      const pil = chave === 'Hospeda';
      const e = h('span', { class: 'pal', text: texto, style: pil ? `background:${COR.limao};color:${COR.tinta};border-radius:999px;padding:4px 30px 8px;font-size:58px;font-weight:600;` : '' });
      cx.appendChild(e);
      const o = M.el(e, { o: 0, fluxo: true });
      const t = q(chave) - 0.04;
      M.para(o, t, 0.12, { o: [0, 1] }, 'out2');
      M.para(o, t, 0.36, { y: [30, 0] }, 'out4');
      if (pil) { M.para(o, t, 0.42, { s: [0.6, 1] }, 'back'); som(t, 'pop', { forca: 0.6 }); }
      M.para(o, tPreco - 0.36 + li * 0.03, 0.26, { o: 0, y: -40 }, 'in3');
    });
  });

  /* ---------- "Sem cartão e sem compromisso." ---------- */
  const fichas = [['Sem cartão', q('Sem') - 0.08, 1300], ['Sem compromisso', q('sem') - 0.08, 1420]].map(([texto, t, y], k) => {
    const c = chip(el, CX, y, texto, { tipo: 'escuro', tam: 50, alt: 104, icone: 'check', corIcone: COR.limao, estilo: 'padding:0 44px;gap:20px;' }, { o: 0 });
    M.para(c, t, 0.14, { o: [0, 1] }, 'out2');
    M.para(c, t, 0.5, { y: [60, 0], s: [0.8, 1] }, 'back');
    desenhar(c.svg, t + 0.16, 0.36);
    som(t + 0.2, 'check', { forca: 0.7 });
    return c;
  });
  M.vivo((t) => { fichas.forEach((c, k) => { if (c.v.o > 0.01) M.mais(c.dom, `translateY(${M.r3(Math.sin(t * 2.2 + k * 1.6) * 4)}px)`); }); });

  /* ---------- saída ---------- */
  const tS = tPreco - 0.38;
  sai(gD, tS, { dy: -120, dur: 0.32, s1: 0.86 });
  fichas.forEach((c, k) => sai(c, tS + 0.03 + k * 0.03, { dy: 90, dur: 0.28 }));
  som(tS + 0.18, 'whoosh', { dur: 0.5, forca: 0.5 });
});
