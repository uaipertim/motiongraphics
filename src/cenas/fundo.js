/* Fundo: preto da marca, grade de pontos e dois brilhos suaves que se movem devagar. */
(window.CENAS = window.CENAS || []).unshift(function () {
  const { h, T, A } = B;
  const f = document.getElementById('fundo');
  f.appendChild(h('div', { style: 'position:absolute;inset:0;background-image:radial-gradient(rgba(244,244,240,0.075) 1.6px, transparent 1.9px);background-size:54px 54px;background-position:27px 27px;' }));
  const g1 = h('div', { style: 'position:absolute;left:-300px;top:-300px;width:1100px;height:1100px;border-radius:50%;background:radial-gradient(closest-side, rgba(175,250,39,0.16), rgba(175,250,39,0));' });
  const g2 = h('div', { style: 'position:absolute;left:300px;top:1000px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(closest-side, rgba(175,250,39,0.10), rgba(175,250,39,0));' });
  const ga = h('div', { style: 'position:absolute;left:140px;top:300px;width:1000px;height:1000px;border-radius:50%;background:radial-gradient(closest-side, rgba(232,163,23,0.13), rgba(232,163,23,0));' });
  [g1, g2, ga].forEach((e) => f.appendChild(e));
  M.usarCena(null);
  const o1 = M.el(g1, { o: 1 }), o2 = M.el(g2, { o: 1 }), oa = M.el(ga, { o: 0 });
  // na dor o limão sai de cena (fica um âmbar discreto); a marca devolve o limão
  const tZ = T('virada', 'FAZLO'), tD = A('dor').ini;
  for (const o of [o1, o2]) { M.para(o, tD - 0.5, 0.6, { o: 0 }, 'io2'); M.para(o, tZ, 0.5, { o: 1 }, 'out2'); }
  M.para(oa, tD - 0.3, 1.0, { o: 1 }, 'io2'); M.para(oa, tZ - 0.2, 0.4, { o: 0 }, 'io2');
  // internet caindo: o âmbar volta por um instante
  const tC = T('internet', 'cair'), tN = T('internet', 'não');
  M.para(oa, tC, 0.4, { o: 1 }, 'out2'); M.para(oa, tN + 0.3, 0.6, { o: 0 }, 'io2');
  for (const o of [o1, o2]) { M.para(o, tC, 0.4, { o: 0.15 }, 'io2'); M.para(o, tN + 0.3, 0.6, { o: 1 }, 'io2'); }
  M.vivo((t) => {
    for (const [o, ax, ay, w, ph] of [[o1, 90, 70, 0.21, 0], [o2, 110, 80, 0.17, 2.1], [oa, 80, 60, 0.26, 4.0]]) {
      o.v.x = Math.sin(t * w + ph) * ax; o.v.y = Math.cos(t * w * 0.8 + ph) * ay;
      o.aplicar(o.v, t, o);
    }
  });
});
