/* Aparelho: celular (ou janela de computador) com as telas reais.
 * Coordenadas das telas em px CSS do app (390 de largura no celular).
 * Câmera = escala + ponto da tela que fica na âncora do palco.
 */
(function () {
  const { h, s, COR, som } = B;
  const AX = 540;          // âncora horizontal do palco
  const AY = 770;          // centro vertical da área de telas
  const CORTE = 1340;      // abaixo disso o palco é rodapé opaco (legenda)

  function Aparelho(pai, opts) {
    const o = Object.assign({ tipo: 'celular', tw: 390, th: 812, bz: 11, raio: 44 }, opts || {});
    const ap = { o, paginas: {}, atual: null, pai };
    const REG = (B.registro = B.registro || []);
    const reg = (t, tipo, extra) => REG.push(Object.assign({ t: Math.round(t * 1000) / 1000, tipo, ap: o.tipo }, extra || {}));
    ap.saiu = (t) => reg(t, 'saida');
    ap.visivel = (t) => reg(t, 'visivel');
    const fw = o.tw + 2 * o.bz, fh = o.th + 2 * o.bz;

    /* --- estrutura --- */
    const corpo = h('div', { class: 'ap ap-' + o.tipo, style: `position:absolute;left:0;top:0;width:${fw}px;height:${fh}px;transform-origin:0 0;` });
    const tela = h('div', { class: 'ap-tela', style: `position:absolute;left:${o.bz}px;top:${o.bz}px;width:${o.tw}px;height:${o.th}px;border-radius:${o.raio}px;overflow:hidden;background:${o.fundo || '#F4F4F0'};` });
    corpo.appendChild(tela);
    const camadaPag = h('div', { style: 'position:absolute;inset:0;' });
    tela.appendChild(camadaPag);

    // foco: véu com furo + anel
    const svgFoco = s('svg', { viewBox: `0 0 ${o.tw} ${o.th}`, width: o.tw, height: o.th, style: 'position:absolute;left:0;top:0;overflow:visible' });
    const veuFoco = s('path', { 'fill-rule': 'evenodd', fill: COR.tinta });
    const brilho = s('rect', { fill: 'none', 'stroke-linejoin': 'round' });
    const anel = s('rect', { fill: 'none', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1 });
    svgFoco.appendChild(veuFoco); svgFoco.appendChild(brilho); svgFoco.appendChild(anel);
    tela.appendChild(svgFoco);
    // toques
    const camadaToque = h('div', { style: 'position:absolute;inset:0;pointer-events:none' });
    tela.appendChild(camadaToque);
    // tela apagada (antes de "abrir o Hospeda")
    const apagada = h('div', { class: 'ap-apagada', style: 'position:absolute;inset:0;' });
    tela.appendChild(apagada);
    if (o.tipo === 'celular') {
      corpo.appendChild(h('div', { class: 'ap-furo', style: `position:absolute;left:${fw / 2 - 4.5}px;top:${o.bz + 9}px;width:9px;height:9px;border-radius:50%;background:#050505;box-shadow:0 0 0 1px #1c1c1a;` }));
    }
    // rodapé opaco (a legenda vive aqui; o aparelho some atrás dele) e véu das janelas
    if (!pai.querySelector('.rodape')) {
      pai.appendChild(h('div', { class: 'rodape', style: `position:absolute;left:0;top:${CORTE - 26}px;width:1080px;height:${1920 - CORTE + 26}px;background:linear-gradient(to bottom, rgba(10,10,10,0) 0, #0A0A0A 26px);` }));
      const veuPalco = h('div', { class: 'veu-palco', style: 'position:absolute;left:0;top:0;width:1080px;height:1920px;background:rgba(10,10,10,0.66);' });
      pai.appendChild(veuPalco);
      pai.__veu = M.el(veuPalco, { o: 0 });
    }
    pai.insertBefore(corpo, pai.querySelector('.rodape')); // aparelhos sempre atrás do rodapé
    ap.veu = pai.__veu;

    /* --- câmera --- */
    ap.INTEIRO = { cx: o.tw / 2, cy: o.th / 2, s: Math.min(1118 / fh, 900 / fw), ay: 765, ax: AX };
    ap.cam = M.obj(Object.assign({ o: 0, dx: 0, dy: 0, r: 0 }, ap.INTEIRO), (v) => {
      const vis = v.o > 0.002;
      M.mostrar(corpo, vis);
      if (!vis) return;
      M.setEstilo(corpo, 'opacity', String(M.r3(Math.min(1, v.o))));
      const x = v.ax + v.dx - (v.cx + o.bz) * v.s, y = v.ay + v.dy - (v.cy + o.bz) * v.s;
      M.setEstilo(corpo, 'transform', `translate(${M.r3(x)}px,${M.r3(y)}px) rotate(${M.r3(v.r)}deg) scale(${M.r3(v.s)})`);
    });
    /** Enquadra um retângulo da tela (coords. de tela) na área útil do palco. */
    ap.enquadrar = (x, y, w, hh, q) => {
      const p = Object.assign({ larg: 960, alt: 1080, maxS: 2.7, ay: AY, ax: AX }, q || {});
      const sc = Math.min(p.maxS, p.larg / w, p.alt / hh);
      return { cx: x + w / 2, cy: y + hh / 2, s: p.s || sc, ay: p.ay, ax: p.ax };
    };
    ap.vista = (t, dur, v, ease) => { M.para(ap.cam, t, dur, { cx: v.cx, cy: v.cy, s: v.s, ay: v.ay == null ? AY : v.ay, ax: v.ax == null ? AX : v.ax }, ease || 'io3'); return ap; };
    /** Posição no palco de um ponto da tela, para o estado de câmera v. */
    ap.noPalco = (v, x, y) => ({ x: v.ax + v.dx - (v.cx - x) * v.s, y: v.ay + v.dy - (v.cy - y) * v.s });

    /* --- páginas --- */
    const fundoImg = (arq, larg) => `background-image:url(${arq});background-size:${larg || o.tw}px auto;background-repeat:no-repeat;`;
    ap.pagina = (id, def) => {
      const raiz = h('div', { class: 'ap-pag', style: `position:absolute;left:0;top:0;width:${o.tw}px;height:${o.th}px;overflow:hidden;transform-origin:50% 40%;background:${def.fundo || '#F4F4F0'};` });
      const pg = { id, def, raiz, rol: null };
      if (def.tipo === 'fixa') {
        raiz.appendChild(h('div', { style: `position:absolute;left:0;top:0;width:${o.tw}px;height:${o.th}px;${fundoImg(def.img)}` }));
      } else {
        // corpo que rola
        const corpoPg = h('div', { style: `position:absolute;left:0;top:${def.topo || 0}px;width:${o.tw}px;height:${def.alt}px;${fundoImg(def.corpo)}` });
        raiz.appendChild(corpoPg);
        pg.rol = M.obj({ y: 0 }, (v) => M.setEstilo(corpoPg, 'transform', `translateY(${M.r3(-v.y)}px)`));
        if (def.cab) raiz.appendChild(h('div', { style: `position:absolute;left:0;top:0;width:${o.tw}px;height:72px;${fundoImg(def.cab)}` }));
        if (def.nav) {
          raiz.appendChild(h('div', { style: `position:absolute;left:0;top:${o.th - 84}px;width:${o.tw}px;height:84px;${fundoImg(def.nav)}` }));
          raiz.appendChild(h('div', { style: `position:absolute;left:${195 - 34}px;top:${o.th - 84 + 7 - 34}px;width:68px;height:68px;${fundoImg(def.fab, 68)}` }));
        }
        (def.extras || []).forEach((x) => raiz.appendChild(x));
      }
      camadaPag.appendChild(raiz);
      pg.ob = M.el(raiz, { o: 0 });
      ap.paginas[id] = pg;
      return pg;
    };
    ap.rolar = (id, t, dur, y, ease) => { M.para(ap.paginas[id].rol, t, dur, { y }, ease || 'io3'); if (dur > 0.25) som(t, 'deslize', { dur, forca: 0.35 }); return ap; };

    /** Troca de página. modos: corte | troca | empurra | sobe | funde */
    ap.trocar = (t, id, modo, q) => {
      const p = q || {};
      reg(t, 'tela', { id });
      const nova = ap.paginas[id], velha = ap.atual ? ap.paginas[ap.atual] : null;
      const m = modo || 'troca';
      camadaPag.appendChild(nova.raiz); // a nova fica por cima
      if (m === 'corte') {
        if (velha) M.por(velha.ob, t, { o: 0 });
        M.por(nova.ob, t, { o: 1, x: 0, y: 0, s: 1 });
      } else if (m === 'troca') {
        if (velha) { M.para(velha.ob, t, 0.16, { o: 0 }, 'in2'); M.para(velha.ob, t, 0.16, { s: 0.985 }, 'in2'); }
        M.para(nova.ob, t + 0.13, 0.24, { o: [0, 1] }, 'out2');
        M.para(nova.ob, t + 0.13, 0.42, { y: [14, 0] }, 'out4');
        M.por(nova.ob, t, { x: 0, s: 1 });
      } else if (m === 'empurra') {
        if (velha) { M.para(velha.ob, t, 0.3, { x: -110 }, 'in3'); M.para(velha.ob, t + 0.08, 0.2, { o: 0 }, 'in2'); }
        M.por(nova.ob, t, { y: 0, s: 1 });
        M.para(nova.ob, t + 0.2, 0.2, { o: [0, 1] }, 'out2');
        M.para(nova.ob, t + 0.2, 0.46, { x: [150, 0] }, 'out4');
      } else if (m === 'sobe') {
        M.por(nova.ob, t, { o: 1, x: 0, s: 1 });
        M.para(nova.ob, t, p.dur || 0.55, { y: [o.th, 0] }, 'out4');
        if (velha) M.por(velha.ob, t + (p.dur || 0.55), { o: 0 });
      } else if (m === 'funde') {
        M.por(nova.ob, t, { x: 0, y: 0, s: 1 });
        M.para(nova.ob, t, p.dur || 0.26, { o: [0, 1] }, 'io2');
        if (velha) M.por(velha.ob, t + (p.dur || 0.26), { o: 0 });
      }
      ap.atual = id;
      return ap;
    };

    /* --- tela apagada --- */
    ap.apagada = M.el(apagada, { o: 0 });

    /* --- foco (véu com furo + anel) --- */
    const F = { x: 0, y: 0, w: 10, h: 10, r: 10, a: 0, anel: 0, cor: 0, esp: 2.4, pul: 0 };
    ap.focoOb = M.obj(F, (v) => {
      const vis = v.a > 0.003 || v.anel > 0.003;
      M.mostrar(anel, vis); M.mostrar(brilho, vis); M.mostrar(veuFoco, vis);
      if (!vis) return;
      const r = Math.min(v.r, v.w / 2, v.h / 2), x = v.x, y = v.y, w = v.w, hh = v.h, r3 = M.r3;
      const furo = `M${r3(x + r)} ${r3(y)}h${r3(w - 2 * r)}a${r3(r)} ${r3(r)} 0 0 1 ${r3(r)} ${r3(r)}v${r3(hh - 2 * r)}a${r3(r)} ${r3(r)} 0 0 1 ${r3(-r)} ${r3(r)}h${r3(-(w - 2 * r))}a${r3(r)} ${r3(r)} 0 0 1 ${r3(-r)} ${r3(-r)}v${r3(-(hh - 2 * r))}a${r3(r)} ${r3(r)} 0 0 1 ${r3(r)} ${r3(-r)}z`;
      veuFoco.setAttribute('d', `M-40 -40H${o.tw + 40}V${o.th + 40}H-40Z ${furo}`);
      veuFoco.setAttribute('opacity', r3(v.a));
      const cor = v.cor > 0.5 ? COR.ambar : COR.limao;
      const g = v.pul * 9; // pulso: o brilho abre e some
      for (const [e, esp, op, d] of [[brilho, v.esp * (3.2 - 1.6 * v.pul), (v.pul > 0 ? 0.85 * (1 - v.pul) : 0.22) * v.anel, g], [anel, v.esp, 1, 0]]) {
        e.setAttribute('x', r3(x - d)); e.setAttribute('y', r3(y - d)); e.setAttribute('width', r3(w + 2 * d)); e.setAttribute('height', r3(hh + 2 * d));
        e.setAttribute('rx', r3(r + d)); e.setAttribute('stroke', cor); e.setAttribute('stroke-width', r3(esp)); e.setAttribute('opacity', r3(op));
      }
      anel.style.strokeDashoffset = String(r3(1 - v.anel));
    });
    let focoLigado = false;
    /** ret = [x, y, w, h] em coords. de tela; margem amplia o contorno. */
    ap.foco = (t, ret, q) => {
      const p = Object.assign({ m: 5, raio: 10, dur: 0.42, escuro: 0.4, cor: 0, som: true }, q || {});
      reg(t, 'destaque', { como: 'contorno' });
      const alvo = { x: ret[0] - p.m, y: ret[1] - p.m, w: ret[2] + 2 * p.m, h: ret[3] + 2 * p.m, r: p.raio };
      if (!focoLigado) {
        M.por(ap.focoOb, t, Object.assign({ cor: p.cor }, alvo));
        M.para(ap.focoOb, t, 0.3, { a: p.escuro }, 'out2');
        M.para(ap.focoOb, t, 0.38, { anel: [0, 1] }, 'io3');
      } else {
        M.para(ap.focoOb, t, p.dur, alvo, 'io3');
        M.para(ap.focoOb, t, p.dur, { a: p.escuro }, 'io2');
        M.por(ap.focoOb, t + p.dur * 0.5, { cor: p.cor });
      }
      focoLigado = true;
      if (p.som) som(t + 0.05, 'tick', { forca: 0.55 });
      return ap;
    };
    /** Pulso no anel atual (reforça o destaque sem mudar de lugar). */
    ap.pulso = (t) => { reg(t, 'destaque', { como: 'pulso' }); M.para(ap.focoOb, t, 0.55, { pul: [0.001, 1] }, 'out3'); M.por(ap.focoOb, t + 0.56, { pul: 0 }); som(t, 'tick', { forca: 0.45 }); return ap; };
    ap.semFoco = (t, dur) => {
      if (!focoLigado) return ap;
      M.para(ap.focoOb, t, dur || 0.3, { a: 0 }, 'io2');
      M.para(ap.focoOb, t, dur || 0.3, { anel: 0 }, 'io2');
      focoLigado = false;
      return ap;
    };

    /** Vários contornos ao mesmo tempo: véu com um furo por item, anéis em cascata. */
    ap.focoMulti = (t, tFim, rets, q) => {
      const p = Object.assign({ m: 3, raio: 8, passo: 0.09, escuro: 0.42, cor: 0 }, q || {});
      reg(t, 'destaque', { como: 'contornos' });
      const g = s('g', {});
      let d = `M-40 -40H${o.tw + 40}V${o.th + 40}H-40Z`;
      const aneis = rets.map((r) => {
        const x = r[0] - p.m, y = r[1] - p.m, w = r[2] + 2 * p.m, hh = r[3] + 2 * p.m, rr = Math.min(p.raio, hh / 2);
        d += ` M${x + rr} ${y}h${w - 2 * rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}v${hh - 2 * rr}a${rr} ${rr} 0 0 1 ${-rr} ${rr}h${-(w - 2 * rr)}a${rr} ${rr} 0 0 1 ${-rr} ${-rr}v${-(hh - 2 * rr)}a${rr} ${rr} 0 0 1 ${rr} ${-rr}z`;
        return s('rect', { x, y, width: w, height: hh, rx: rr, fill: 'none', stroke: p.cor ? COR.ambar : COR.limao, 'stroke-width': 2.2, pathLength: 1, 'stroke-dasharray': 1 });
      });
      const veu = s('path', { d, 'fill-rule': 'evenodd', fill: COR.tinta });
      g.appendChild(veu); aneis.forEach((a) => g.appendChild(a));
      svgFoco.insertBefore(g, svgFoco.firstChild);
      const vo = M.obj({ a: 0 }, (v) => { M.mostrar(g, v.a > 0.003); veu.setAttribute('opacity', M.r3(v.a * p.escuro)); aneis.forEach((a) => a.setAttribute('opacity', M.r3(Math.min(1, v.a * 1.4)))); });
      M.para(vo, t, 0.3, { a: [0, 1] }, 'out2');
      M.para(vo, tFim, 0.3, { a: 0 }, 'io2');
      aneis.forEach((a, i) => {
        const ao = M.obj({ tr: 0 }, (v) => { a.style.strokeDashoffset = String(M.r3(1 - v.tr)); });
        M.para(ao, t + i * p.passo, 0.34, { tr: [0, 1] }, 'io3');
        som(t + i * p.passo + 0.05, 'tick', { forca: 0.4 });
      });
      return ap;
    };

    /* --- toque --- */
    ap.toque = (t, x, y) => {
      const e = h('div', { style: `position:absolute;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(175,250,39,0.5);box-shadow:0 0 0 1.5px rgba(10,10,10,0.75), 0 0 0 3px rgba(244,244,240,0.6);` });
      camadaToque.appendChild(e);
      const ob = M.el(e, { o: 0, s: 0.4 });
      M.para(ob, t - 0.12, 0.12, { o: [0, 1] }, 'out2');
      M.para(ob, t - 0.12, 0.14, { s: [1.5, 0.8] }, 'out3');
      M.para(ob, t + 0.04, 0.34, { s: 1.7 }, 'out3');
      M.para(ob, t + 0.08, 0.3, { o: 0 }, 'in2');
      som(t, 'tick', { forca: 0.7 });
      return ap;
    };

    /* --- janela que salta da tela --- */
    /** rec: {img, ix, iy (origem do recorte na imagem, css), x, y (posição na tela), w, h, larg, cy, raio, cor} */
    ap.salto = (tIn, tOut, rec) => {
      const p = Object.assign({ larg: 940, cy: 720, raio: 12, cor: 0, borda: 5 }, rec);
      reg(tIn, 'destaque', { como: 'janela', volta: Math.round(tOut * 1000) / 1000 });
      (p.aneis || []).forEach((a) => reg(a.t, 'destaque', { como: 'contorno na janela' }));
      const e = h('div', { class: 'salto', style: `position:absolute;left:0;top:0;width:${p.w}px;height:${p.h}px;transform-origin:0 0;border-radius:${p.raio}px;overflow:hidden;background-color:${p.fundo || '#fff'};background-image:url(${p.img});background-size:${p.iw || o.tw}px auto;background-position:${-p.ix}px ${-p.iy}px;background-repeat:no-repeat;` });
      pai.appendChild(e);
      const k = p.larg / p.w;
      const ob = M.obj({ p: 0 }, (v) => {
        const vis = v.p > 0.001;
        M.mostrar(e, vis);
        if (!vis) return;
        const c = ap.cam.v, org = ap.noPalco(c, p.x, p.y);
        const q = v.p, sc = c.s + (k - c.s) * q;
        const tx = AX - p.larg / 2, ty = p.cy - (p.h * k) / 2;
        const x = org.x + (tx - org.x) * q, y = org.y + (ty - org.y) * q;
        M.setEstilo(e, 'transform', `translate(${M.r3(x)}px,${M.r3(y)}px) scale(${M.r3(sc)})`);
        const qq = Math.max(0, Math.min(1, q));
        const cor = p.cor ? COR.ambar : COR.limao;
        M.setEstilo(e, 'boxShadow', `0 0 0 ${M.r3((p.borda * qq) / sc)}px ${cor}, 0 ${M.r3((28 * qq) / sc)}px ${M.r3((70 * qq) / sc)}px rgba(0,0,0,${M.r3(0.6 * qq)})`);
      });
      (p.aneis || []).forEach((a) => {
        const cor = a.cor ? COR.ambar : COR.limao;
        const an = h('div', { style: `position:absolute;left:${a.x}px;top:${a.y}px;width:${a.w}px;height:${a.h}px;border-radius:${a.raio || 8}px;box-shadow:0 0 0 2.2px ${cor}, 0 0 0 4px rgba(10,10,10,0.45), inset 0 0 0 1px rgba(10,10,10,0.25);` });
        e.appendChild(an);
        const ao = M.el(an, { o: 0, s: 1.14 });
        M.para(ao, a.t, 0.16, { o: [0, 1] }, 'out2');
        M.para(ao, a.t, 0.36, { s: [1.14, 1] }, 'out4');
        if (a.fim != null) M.para(ao, a.fim, 0.2, { o: 0 }, 'in2');
        som(a.t + 0.04, 'tick', { forca: 0.55 });
      });
      M.para(ob, tIn, 0.55, { p: [0, 1] }, 'back');
      M.para(ob, tOut, 0.42, { p: 0 }, 'io3');
      M.para(ap.veu, tIn, 0.35, { o: 1 }, 'out2');
      M.para(ap.veu, tOut, 0.4, { o: 0 }, 'io2');
      som(tIn, 'janela', { forca: 0.7 });
      som(tOut, 'janela_fecha', { forca: 0.5 });
      return ob;
    };

    ap.corpo = corpo; ap.tela = tela;
    return ap;
  }

  window.Aparelho = Aparelho;
  window.Aparelho.CORTE = CORTE;
  window.Aparelho.AY = AY;
})();
