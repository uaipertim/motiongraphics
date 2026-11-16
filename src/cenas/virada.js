/* Virada para a marca: "O FAZLO Hospeda junta tudo isso em um só lugar. Veja como fica o dia a dia." */
(window.CENAS = window.CENAS || []).push(function (raizCenas) {
  const { h, s, T, A, som, COR, grupo, ico, txt, logo, desenhar, estala, rnd } = B;
  const el = h('div', { class: 'cena', id: 'c-virada' });
  raizCenas.appendChild(el);
  const v = (w, n) => T('virada', w, n);
  const tZ = v('FAZLO');
  const tFone = v('fica') + 0.05;          // o celular (cena das telas) aparece aqui
  M.cena(el, tZ - 0.06, tFone + 0.6);

  /* ---------- impacto ---------- */
  const clarao = h('div', { style: `position:absolute;left:${540 - 220}px;top:${660 - 220}px;width:440px;height:440px;border-radius:50%;background:radial-gradient(closest-side, ${COR.limao} 0%, rgba(175,250,39,0.55) 45%, rgba(175,250,39,0) 100%);transform-origin:50% 50%;` });
  el.appendChild(clarao);
  const cl = M.el(clarao, { o: 0, s: 0.2 });
  M.para(cl, tZ - 0.03, 0.55, { s: [0.2, 7] }, 'out3');
  M.para(cl, tZ - 0.03, 0.55, { o: [0.95, 0] }, 'out2');
  for (let i = 0; i < 2; i++) {
    const onda = h('div', { style: `position:absolute;left:${540 - 200}px;top:${660 - 200}px;width:400px;height:400px;border-radius:50%;box-shadow:inset 0 0 0 ${i ? 5 : 9}px ${COR.limao};transform-origin:50% 50%;` });
    el.appendChild(onda);
    const oo = M.el(onda, { o: 0, s: 0.2 });
    M.para(oo, tZ + i * 0.12, 0.8, { s: [0.25, 4.6] }, 'out3');
    M.para(oo, tZ + i * 0.12, 0.8, { o: [0.9, 0] }, 'out2');
  }
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2 + rnd(i) * 0.3, dist = 420 + rnd(i + 7) * 420, tam = 8 + rnd(i + 3) * 14;
    const p = h('div', { style: `position:absolute;left:${540 - tam / 2}px;top:${660 - tam / 2}px;width:${tam}px;height:${tam * (i % 3 === 0 ? 3.2 : 1)}px;border-radius:${tam}px;background:${i % 4 === 1 ? COR.branco : COR.limao};transform-origin:50% 50%;` });
    el.appendChild(p);
    const po = M.el(p, { o: 0, r: (ang * 180) / Math.PI + 90 });
    const t0 = tZ + rnd(i + 11) * 0.06;
    M.para(po, t0, 0.75, { x: [0, Math.cos(ang) * dist], y: [0, Math.sin(ang) * dist] }, 'out4');
    M.para(po, t0, 0.75, { o: [1, 0] }, 'in2');
    M.para(po, t0, 0.75, { s: [1.2, 0.3] }, 'io2');
  }
  som(tZ, 'impacto', { forca: 0.45 });

  /* ---------- logo ---------- */
  const gL = grupo(el, 540, 660);
  const lg = logo(gL.dom, 540, 660, 800);
  M.para(lg.fazlo, tZ - 0.02, 0.12, { o: [0, 1] }, 'out2');
  M.para(lg.fazlo, tZ - 0.02, 0.5, { x: [-70, 0], s: [1.5, 1] }, 'back');
  const tH = v('Hospeda') - 0.04;
  M.para(lg.pilula, tH, 0.1, { o: [0, 1] }, 'out2');
  M.para(lg.pilula, tH, 0.5, { s: [0.2, 1] }, 'back2');
  som(tH + 0.04, 'brilho', { forca: 0.6 });
  // respiro do logo
  M.vivo((t) => { if (gL.v.o > 0.01) M.mais(gL.dom, `scale(${M.r3(1 + Math.sin((t - tZ) * 2.4) * 0.008)})`); });

  /* ---------- "junta tudo isso": quatro peças chegam e se encaixam ---------- */
  const tJ = v('junta') - 0.16;
  M.para(gL, tJ, 0.6, { y: -272, s: 0.7 }, 'io3');
  som(tJ + 0.3, 'whoosh', { dur: 0.5, forca: 0.4 });
  const TW = 262, TH = 236, GAP = 26, GX = 540, GY = 838;
  const pecas = [
    ['Reservas', 'reservas', -1, -1, tJ + 0.12], ['Comandas', 'comandas', 1, -1, v('junta') + 0.2],
    ['Check-out', 'saida', -1, 1, v('tudo') + 0.02], ['Caixa', 'caixa', 1, 1, v('isso') - 0.02],
  ].map(([nome, ic, dx, dy, t0], i) => {
    const cx = GX + dx * (TW + GAP) / 2, cy = GY + dy * (TH + GAP) / 2;
    const g = grupo(el, cx, cy, { o: 0 });
    g.dom.appendChild(h('div', { style: `position:absolute;left:${cx - TW / 2}px;top:${cy - TH / 2}px;width:${TW}px;height:${TH}px;border-radius:34px;background:${COR.grafite};box-shadow:inset 0 0 0 1.5px #33332F;` }));
    const icn = ico(g.dom, ic, cx, cy - 30, 96, COR.limao, 1.7);
    desenhar(icn.svg, t0 + 0.22, 0.55);
    txt(g.dom, cx, cy + 68, nome, { tam: 36, peso: 600, larg: TW });
    M.para(g, t0, 0.12, { o: [0, 1] }, 'out2');
    M.para(g, t0, 0.62, { x: [dx * 620, 0], y: [dy * 520 - 140, 0], r: [dx * 38, 0], s: [0.7, 1] }, 'out4');
    som(t0 + 0.3, 'pop', { forca: 0.7, pan: dx * 0.5 });
    return { g, cx, cy, dx, dy };
  });

  /* ---------- "em um só lugar": o contorno fecha em volta de tudo ---------- */
  const tU = v('em') - 0.08;
  const R0 = { x: GX - TW - GAP / 2 - 30, y: GY - TH - GAP / 2 - 30, w: 2 * TW + GAP + 60, h: 2 * TH + GAP + 60, r: 58 };
  const sv = s('svg', { viewBox: '0 0 1080 1920', width: 1080, height: 1920, style: 'position:absolute;left:0;top:0;overflow:visible' });
  const cont = s('rect', { fill: 'none', stroke: COR.limao, 'stroke-width': 7, 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1 });
  sv.appendChild(cont);
  el.appendChild(sv);
  // INTEIRO do celular (ver aparelho.js): moldura 412×834 css, escala 1118/834, centro (540, 765)
  const sF = 1118 / 834, RF = { x: 540 - 206 * sF, y: 765 - 417 * sF, w: 412 * sF, h: 834 * sF, r: 55 * sF };
  const co = M.obj(Object.assign({ tr: 0, o: 0, esp: 7 }, R0), (q) => {
    M.mostrar(cont, q.o > 0.003);
    if (q.o <= 0.003) return;
    for (const [k, val] of [['x', q.x], ['y', q.y], ['width', q.w], ['height', q.h], ['rx', q.r], ['opacity', q.o], ['stroke-width', q.esp]]) cont.setAttribute(k, M.r3(val));
    cont.style.strokeDashoffset = String(M.r3(1 - q.tr));
  });
  M.por(co, tU, { o: 1 });
  M.para(co, tU, 0.75, { tr: [0, 1] }, 'io3');
  som(tU, 'risco', { dur: 0.7, forca: 0.5 });
  // as peças se juntam (o vão fecha) e ganham check
  pecas.forEach((p, i) => {
    M.para(p.g, v('só') - 0.05, 0.4, { x: -p.dx * (GAP / 2 - 5), y: -p.dy * (GAP / 2 - 5) }, 'back');
  });
  const tL = v('lugar');
  M.para(co, tL, 0.18, { esp: 12 }, 'out2'); M.para(co, tL + 0.18, 0.4, { esp: 7 }, 'io2');
  const selo = h('div', { style: `position:absolute;left:${R0.x + R0.w - 58}px;top:${R0.y - 40}px;width:98px;height:98px;border-radius:50%;background:${COR.limao};display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;box-shadow:0 0 0 8px ${COR.tinta};` }, [B.icone('check', 58, COR.tinta, 3)]);
  el.appendChild(selo);
  const so = M.el(selo, { o: 0, s: 0.2 });
  estala(so, tL + 0.02, { dur: 0.5, s0: 0.2, ease: 'back2' });
  desenhar(selo.querySelector('svg'), tL + 0.12, 0.3);
  som(tL + 0.05, 'check', { forca: 0.75 });
  // enquanto a voz respira: as peças pulsam em cascata
  pecas.forEach((p, i) => {
    for (let k = 0; k < 2; k++) {
      const t0 = tL + 0.5 + i * 0.1 + k * 0.5;
      M.para(p.g, t0, 0.16, { s: 1.05 }, 'out2'); M.para(p.g, t0 + 0.16, 0.24, { s: 1 }, 'io2');
    }
  });

  /* ---------- "Veja como fica o dia a dia": o contorno vira o celular ---------- */
  const tM = v('Veja') - 0.1;
  M.para(gL, tM, 0.4, { y: -420, o: 0 }, 'in3');
  M.para(so, tM, 0.25, { s: 0, o: 0 }, 'in3');
  pecas.forEach((p, i) => {
    M.para(p.g, tM + i * 0.03, 0.42, { x: GX - p.cx, y: GY - p.cy, s: 0.25 }, 'in3');
    M.para(p.g, tM + i * 0.03 + 0.24, 0.18, { o: 0 }, 'in2');
  });
  M.para(co, tM + 0.12, tFone + 0.02 - (tM + 0.12), { x: RF.x, y: RF.y, w: RF.w, h: RF.h, r: RF.r, esp: 5 }, 'io3');
  M.para(co, tFone + 0.05, 0.45, { o: 0 }, 'io2');
  som(tM + 0.3, 'whoosh', { dur: 0.6, forca: 0.55 });
});
