/* Motor de animação determinístico: o estado de cada quadro é função só do tempo.
 * Nada de CSS transition/animation nem relógio real — render(t) pode ser chamado
 * em qualquer ordem e dá sempre o mesmo quadro.
 */
(function () {
  const E = {
    lin: (p) => p,
    in2: (p) => p * p,
    out2: (p) => 1 - (1 - p) * (1 - p),
    io2: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    in3: (p) => p * p * p,
    out3: (p) => 1 - Math.pow(1 - p, 3),
    io3: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    out4: (p) => 1 - Math.pow(1 - p, 4),
    io4: (p) => (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2),
    out5: (p) => 1 - Math.pow(1 - p, 5),
    in4: (p) => p * p * p * p,
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inExpo: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    back: (p) => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    back2: (p) => { const c = 2.6, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    inBack: (p) => { const c = 1.70158, c3 = c + 1; return c3 * p * p * p - c * p * p; },
    elastic: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -9 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3.2) + 1),
    mola: (p) => 1 - Math.exp(-6.5 * p) * Math.cos(11 * p) * (1 - p),
  };

  const objs = [];
  const cenas = [];
  const vivos = [];
  let cenaAtual = null;
  let pronto = false;

  /** Cena = intervalo em que seus elementos existem (fora dele: display none). */
  function cena(el, ini, fim) {
    const c = { el, ini, fim, objs: [], vivos: [], ativa: null };
    cenas.push(c);
    cenaAtual = c;
    return c;
  }
  function usarCena(c) { cenaAtual = c; }

  /** Objeto animável: valores numéricos + função que os aplica. */
  function obj(init, aplicar) {
    const o = { base: Object.assign({}, init), v: Object.assign({}, init), tr: {}, aplicar, cena: cenaAtual, expl: Object.assign({}, init) };
    (cenaAtual ? cenaAtual.objs : objs).push(o);
    objs.includes(o) || objs.push(o);
    return o;
  }

  /** props: {k: destino} ou {k: [origem, destino]} */
  function para(o, t, dur, props, ease) {
    const fn = typeof ease === 'function' ? ease : E[ease || 'io3'];
    for (const k in props) {
      let de, ate;
      if (Array.isArray(props[k])) { de = props[k][0]; ate = props[k][1]; } else { ate = props[k]; }
      (o.tr[k] = o.tr[k] || []).push({ t0: t, t1: t + Math.max(dur, 0), de, ate, fn, n: o.tr[k].length });
      if (!(k in o.base)) o.base[k] = de !== undefined ? de : ate;
    }
    pronto = false;
    return o;
  }
  const por = (o, t, props) => para(o, t, 0, props, 'lin');

  function valorSeg(s, t) {
    if (t >= s.t1) return s.ate;
    const p = (t - s.t0) / (s.t1 - s.t0);
    return s.de + (s.ate - s.de) * s.fn(p);
  }

  function preparar() {
    for (const o of objs) {
      for (const k in o.tr) {
        const segs = o.tr[k];
        segs.sort((a, b) => a.t0 - b.t0 || a.n - b.n);
        let i = 0;
        for (const s of segs) {
          if (s.de === undefined) s.de = i === 0 ? o.base[k] : valorSeg(segs[i - 1], s.t0);
          i++;
        }
      }
    }
    pronto = true;
  }

  function valor(o, k, t) {
    const segs = o.tr[k];
    if (!segs) return o.base[k];
    let lo = 0, hi = segs.length - 1, idx = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (segs[m].t0 <= t) { idx = m; lo = m + 1; } else hi = m - 1; }
    // antes da primeira animação: o valor inicial declarado; se não houver, a origem dela
    if (idx < 0) return k in o.expl ? o.base[k] : segs[0].de;
    return valorSeg(segs[idx], t);
  }

  /** Estado de um objeto no tempo t (sem aplicar). */
  function estado(o, t) {
    if (!pronto) preparar();
    const v = {};
    for (const k in o.base) v[k] = valor(o, k, t);
    return v;
  }

  /** Função livre de t, executada enquanto a cena está ativa (depois dos objetos). */
  function vivo(fn) { (cenaAtual ? cenaAtual.vivos : vivos).push(fn); }

  function render(t) {
    if (!pronto) preparar();
    for (const c of cenas) {
      const ativa = t >= c.ini && t < c.fim;
      if (ativa !== c.ativa) { c.el.style.display = ativa ? '' : 'none'; c.ativa = ativa; }
    }
    for (const o of objs) {
      if (o.cena && !o.cena.ativa) continue;
      for (const k in o.base) o.v[k] = valor(o, k, t);
      o.aplicar(o.v, t, o);
    }
    for (const c of cenas) if (c.ativa) for (const f of c.vivos) f(t);
    for (const f of vivos) f(t);
  }

  /* ---------- elementos do DOM ---------- */
  function setEstilo(el, k, val) {
    const c = el.__c || (el.__c = {});
    if (c[k] !== val) { c[k] = val; el.style[k] = val; }
  }
  function setAttr(el, k, val) {
    const c = el.__a || (el.__a = {});
    if (c[k] !== val) { c[k] = val; el.setAttribute(k, val); }
  }
  const r3 = (n) => Math.round(n * 1000) / 1000;
  /** Esconde de verdade (display:none): filho de elemento escondido nunca aparece. */
  function mostrar(dom, vis) {
    if (dom.__vis === vis) return;
    dom.__vis = vis;
    if (!('__disp' in dom)) dom.__disp = dom.style.display || '';
    dom.style.display = vis ? dom.__disp : 'none';
  }

  /** Elemento com x, y, s (escala), sx, sy, r (graus), o (opacidade) e extras. */
  function el(dom, init, extra) {
    const base = Object.assign({ x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, o: 1 }, init || {});
    const fluxo = !!base.fluxo;   // fluxo: mantém o espaço no texto mesmo invisível
    delete base.fluxo;
    const expl = Object.assign({}, init || {});
    delete expl.fluxo;
    const ob = obj(base, (v, t, o) => {
      const vis = v.o > 0.002;
      if (fluxo) { if (!vis) { setEstilo(dom, 'opacity', '0'); return; } } else { mostrar(dom, vis); if (!vis) return; }
      setEstilo(dom, 'opacity', String(r3(Math.min(1, v.o))));
      setEstilo(dom, 'transform',
        `translate(${r3(v.x)}px,${r3(v.y)}px) rotate(${r3(v.r)}deg) scale(${r3(v.s * v.sx)},${r3(v.s * v.sy)})`);
      if ('tr' in v) dom.style.strokeDashoffset = String(r3(1 - v.tr)); // traço que se desenha (pathLength=1)
      if ('blur' in v) setEstilo(dom, 'filter', v.blur > 0.05 ? `blur(${r3(v.blur)}px)` : 'none');
      if (extra) extra(v, t, dom);
    });
    ob.expl = expl;
    return ob;
  }

  /** Soma um transform "vivo" (flutuar, tremer) ao transform base do quadro. */
  function mais(dom, extra) { dom.style.transform = ((dom.__c && dom.__c.transform) || '') + ' ' + extra; }

  window.M = { mais, E, cena, usarCena, obj, el, para, por, estado, vivo, render, setEstilo, setAttr, mostrar, r3, objs, cenas };
})();
