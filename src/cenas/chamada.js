/* Chamada + fecho.
 * "Quer testar 30 dias na sua pousada? É só responder esta mensagem." (texto principal → fora da legenda)
 * Fecho: logo FAZLO Hospeda + @fazlohospeda.
 */
(window.CENAS = window.CENAS || []).push(function (raizCenas) {
  const { h, s, T, TF, A, som, COR, grupo, ico, txt, logo, desenhar, estala, entra, sai } = B;
  const el = h('div', { class: 'cena', id: 'c-chamada' });
  raizCenas.appendChild(el);
  const c = (w, n) => T('chamada', w, n);
  const t0 = A('chamada').ini, DUR = B.N.duracao;
  M.cena(el, t0 - 0.2, DUR + 1);

  /* ================= chamada ================= */
  const gC = grupo(el, 540, 800);
  const linhas = [
    { y: 392, tam: 112, peso: 800, gap: 28, pal: [['Quer', 'Quer'], ['testar', 'testar']] },
    { y: 590, tam: 216, peso: 800, gap: 40, cor: COR.limao, pal: [['30', '30'], ['dias', 'dias']] },
    { y: 790, tam: 100, peso: 800, gap: 26, pal: [['na', 'na'], ['sua', 'sua'], ['pousada?', 'pousada']] },
    { y: 1010, tam: 84, peso: 700, gap: 22, pal: [['É', 'É'], ['só', 'só'], ['responder', 'responder']] },
    { y: 1112, tam: 84, peso: 700, gap: 22, pal: [['esta', 'esta'], ['mensagem.', 'mensagem']] },
  ];
  linhas.forEach((ln) => {
    const cx = h('div', { style: `position:absolute;left:0;top:${ln.y - ln.tam * 0.62}px;width:1080px;height:${ln.tam * 1.24}px;display:flex;align-items:center;justify-content:center;gap:${ln.gap}px;font-weight:${ln.peso};font-size:${ln.tam}px;letter-spacing:-0.035em;color:${ln.cor || COR.branco};` });
    gC.dom.appendChild(cx);
    ln.pal.forEach(([texto, chave]) => {
      const dest = chave === 'responder';
      const e = h('span', { class: 'pal' + (chave === '30' ? ' mono' : ''), text: texto, style: dest ? `color:${COR.limao}` : (chave === '30' ? 'letter-spacing:-0.07em' : '') });
      cx.appendChild(e);
      const o = M.el(e, { o: 0, fluxo: true });
      const t = c(chave) - 0.04;
      M.para(o, t, 0.12, { o: [0, 1] }, 'out2');
      M.para(o, t, 0.44, { y: [ln.tam * 0.4, 0], s: [0.72, 1] }, 'back');
      if (chave === '30') { som(t, 'impacto', { forca: 0.4 }); } else if (dest) som(t, 'pop', { forca: 0.8 }); else som(t, 'pop', { forca: 0.4 });
    });
  });
  // sublinhado em "30 dias"
  const sub = h('div', { style: `position:absolute;left:234px;top:706px;width:612px;height:12px;border-radius:6px;background:${COR.limao};transform-origin:0 50%;` });
  gC.dom.appendChild(sub);
  const sOb = M.el(sub, { o: 0, sx: 0 });
  M.por(sOb, c('dias') + 0.12, { o: 1 }); M.para(sOb, c('dias') + 0.12, 0.45, { sx: [0, 1] }, 'out4');
  // na pausa: a interrogação "pergunta"
  M.vivo((t) => { if (gC.v.o > 0.01) M.mais(gC.dom, `scale(${M.r3(1 + 0.008 * Math.sin((t - t0) * 2.6))})`); });
  // responder: seta de resposta que se desenha e pulsa
  const RY = 1330;
  const anelR = h('div', { style: `position:absolute;left:${540 - 92}px;top:${RY - 92}px;width:184px;height:184px;border-radius:50%;background:${COR.limao};display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;` }, [B.icone('responder', 104, COR.tinta, 2.4)]);
  gC.dom.appendChild(anelR);
  const rOb = M.el(anelR, { o: 0, s: 0.2 });
  const tR = c('responder') - 0.02;
  estala(rOb, tR, { dur: 0.5, s0: 0.2, ease: 'back2' });
  desenhar(anelR.querySelector('svg'), tR + 0.1, 0.5);
  som(tR + 0.1, 'brilho', { forca: 0.5 });
  for (let k = 0; k < 3; k++) {
    const onda = h('div', { style: `position:absolute;left:${540 - 92}px;top:${RY - 92}px;width:184px;height:184px;border-radius:50%;box-shadow:inset 0 0 0 5px ${COR.limao};transform-origin:50% 50%;` });
    gC.dom.insertBefore(onda, anelR);
    const oo = M.el(onda, { o: 0, s: 1 });
    const tk = tR + 0.5 + k * 0.52;
    M.para(oo, tk, 0.9, { s: [1, 1.9] }, 'out3');
    M.para(oo, tk, 0.9, { o: [0.8, 0] }, 'out2');
  }
  M.vivo((t) => { if (rOb.v.o > 0.01 && t > tR + 0.5) M.mais(anelR, `translateX(${M.r3(-10 * Math.max(0, Math.sin((t - tR) * 4.2)))}px)`); });

  /* ================= fecho: logo + @fazlohospeda ================= */
  const tL = A('chamada').fim + 0.45;      // o acorde final da trilha cai aqui
  sai(gC, tL - 0.4, { dy: -90, dur: 0.34, s1: 0.92 });
  som(tL - 0.22, 'whoosh', { dur: 0.5, forca: 0.5 });
  const gL = grupo(el, 540, 860);
  const lg = logo(gL.dom, 540, 800, 800);
  M.para(lg.fazlo, tL - 0.04, 0.14, { o: [0, 1] }, 'out2');
  M.para(lg.fazlo, tL - 0.04, 0.55, { x: [-90, 0], s: [1.35, 1] }, 'out4');
  M.para(lg.pilula, tL + 0.12, 0.1, { o: [0, 1] }, 'out2');
  M.para(lg.pilula, tL + 0.12, 0.55, { s: [0.2, 1] }, 'back2');
  som(tL, 'brilho', { forca: 0.8 });
  // clarão discreto atrás do logo
  const cl = h('div', { style: `position:absolute;left:${540 - 420}px;top:${800 - 420}px;width:840px;height:840px;border-radius:50%;background:radial-gradient(closest-side, rgba(175,250,39,0.26), rgba(175,250,39,0));transform-origin:50% 50%;` });
  gL.dom.insertBefore(cl, gL.dom.firstChild);
  const clo = M.el(cl, { o: 0, s: 0.4 });
  M.para(clo, tL - 0.04, 0.7, { o: [0, 1], s: [0.4, 1] }, 'out3');
  // linha e @
  const fio = h('div', { style: `position:absolute;left:${540 - 150}px;top:912px;width:300px;height:6px;border-radius:3px;background:${COR.limao};transform-origin:50% 50%;` });
  gL.dom.appendChild(fio);
  const fo = M.el(fio, { o: 0, sx: 0 });
  M.por(fo, tL + 0.42, { o: 1 }); M.para(fo, tL + 0.42, 0.5, { sx: [0, 1] }, 'out4');
  const arroba = txt(gL.dom, 540, 986, '@fazlohospeda', { tam: 64, peso: 600, cor: COR.branco, esp: '-0.01em' }, { o: 0 });
  entra(arroba, tL + 0.55, { dy: 36, dur: 0.5 });
  som(tL + 0.6, 'pop', { forca: 0.5 });
  // brilho que varre a pílula, e respiro até o fim (nada parado)
  const pil = h('div', { style: `position:absolute;left:${540 + 31}px;top:${800 - 50}px;width:362px;height:100px;border-radius:50px;overflow:hidden;` });
  const fx = h('div', { style: 'position:absolute;left:-140px;top:-20px;width:110px;height:140px;background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.7), rgba(255,255,255,0));transform:skewX(-18deg);' });
  pil.appendChild(fx); gL.dom.appendChild(pil);
  const fxo = M.el(fx, { x: 0, o: 0 });
  [tL + 1.0, tL + 2.3, tL + 3.6].forEach((t) => { M.por(fxo, t, { o: 1, x: 0 }); M.para(fxo, t, 0.7, { x: [0, 620] }, 'io2'); });
  M.vivo((t) => { if (t > tL) M.mais(gL.dom, `scale(${M.r3(1 + 0.012 * (t - tL) + 0.004 * Math.sin((t - tL) * 2.2))})`); });
});
