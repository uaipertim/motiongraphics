/*
 * FAZLO Hospeda — "A caipirinha da piscina entrou na conta?" (9:16, SEM narração, só elementos).
 * Segue reels/PADRAO-ELEMENTOS.md: uma composição nova a cada ideia; o valor da cena como protagonista (número grande);
 * ícones de linha animados; ligações de causa e efeito com pulso viajando; manchete grande no alto, à esquerda;
 * fundos alternando (escuro, off-white, verde-limão); transições com impacto na batida (120 BPM); nada parado.
 * Nenhuma tela, celular ou recorte do HTML: só peças gráficas, com os valores reais da comanda (08-comanda, 02 e 04).
 * Determinístico: REEL.renderAt(t).
 */
(() => {
  const W = 1080, H = 1920, BEAT = 0.5;
  const C = { preto: '#0A0A0A', off: '#F7F7F2', limao: '#AFFA27', cinza: '#8E918A', cinzaE: '#5E5E5A', verde: '#4E8800', painel: '#131611' };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const EZ = { lin: (u) => u, out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u, io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    expo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)), quad: (u) => u * u,
    elastico: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(2, -8 * u) * Math.cos(u * Math.PI * 2.5)),
    back: (u) => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); } };
  const ramp = (t, a, b, e = EZ.out) => e(clamp((t - a) / (b - a)));
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));
  const batida = (t, d = 0.18) => kick(((t % BEAT) + BEAT) % BEAT, 0, d);       // pulso a cada batida
  const el = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); if (parent) parent.appendChild(e); return e; };
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const brl = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + ',00';
  const rnd = (s) => { let x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

  // ---------------- os valores reais da comanda (08-comanda, estados 02 e 04) ----------------
  const ITENS = [
    { id: 'caipirinha', nome: 'Caipirinha', origem: 'Bar da piscina', q: 3, q2: 4, un: 22, icone: 'copo' },
    { id: 'agua', nome: 'Água sem gás', origem: 'Frigobar', q: 2, q2: 4, un: 6, icone: 'garrafa' },
    { id: 'cerveja', nome: 'Cerveja long neck', origem: 'Frigobar', q: 4, un: 14, icone: 'garrafa' },
    { id: 'risoto', nome: 'Risoto de cogumelos', origem: 'Restaurante', q: 2, un: 68, icone: 'prato' },
    { id: 'suco', nome: 'Suco de laranja', origem: 'Frigobar', q: 1, un: 17, icone: 'garrafa' },
    { id: 'cancelado', nome: 'Cerveja long neck', origem: 'Frigobar', q: 1, un: 14, icone: 'garrafa', cancelado: true },
  ];
  const TOTAL_1 = ITENS.filter((i) => !i.cancelado).reduce((a, i) => a + i.q * i.un, 0);                 // 287
  const TOTAL_2 = ITENS.filter((i) => !i.cancelado).reduce((a, i) => a + (i.q2 || i.q) * i.un, 0);       // 321

  // ---------------- ícones de linha (o traço da marca: linha única, pontas e cantos arredondados) ----------------
  const ICONES = {
    copo: { p: ['M5.5 6h13l-1.5 13.2a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8z', 'M6.3 11.2h11.4', 'M15.4 6a2.7 2.7 0 0 1 5.4 0', 'M18.1 6V3.4', 'M10.6 2.3l2.6 9.4'],
      gelo: ['M8.4 13.4h2.9v2.9H8.4z', 'M12.4 15h2.9v2.9h-2.9z'] },
    garrafa: { p: ['M10 2h4', 'M10.5 2v3.2l-2 3.1A2 2 0 0 0 8 9.5V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9.5a2 2 0 0 0-.5-1.2l-2-3.1V2', 'M8 12.5h8', 'M8 17h8'] },
    prato: { p: ['M14 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17z', 'M14 7.6a4.4 4.4 0 1 1 0 8.8a4.4 4.4 0 1 1 0-8.8z', 'M2.5 3v4.5a1.5 1.5 0 0 0 3 0V3', 'M4 9v12'] },
    comanda: { p: ['M13 16H8', 'M14 8H8', 'M16 12H8', 'M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z'] },
    check: { p: ['M20 6 9 17l-5-5'] },
  };
  const NS = 'http://www.w3.org/2000/svg';
  function icone(nome, px, cor, sw, parent, css = {}) {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', px); s.setAttribute('height', px);
    Object.assign(s.style, { position: 'absolute', overflow: 'visible', ...css });
    const mk = (d, g) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', cor); p.setAttribute('stroke-width', (sw * 24 / px).toFixed(3));             // traço em px do quadro, na escala do ícone
      p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); p.setAttribute('pathLength', '1');
      p.style.strokeDasharray = '1'; (g || s).appendChild(p); return p; };
    const paths = ICONES[nome].p.map((d) => mk(d));
    let gelo = null, geloP = [];
    if (ICONES[nome].gelo) { gelo = document.createElementNS(NS, 'g'); s.appendChild(gelo); geloP = ICONES[nome].gelo.map((d) => mk(d, gelo)); }
    parent.appendChild(s);
    return { s, paths, gelo, geloP, px };
  }
  function traca(ic, u, escalonado = true) {
    const n = ic.paths.length + ic.geloP.length;
    [...ic.paths, ...ic.geloP].forEach((p, i) => { const v = escalonado ? clamp(u * n * 0.7 - i * 0.55 + 0.4) : u; p.style.strokeDashoffset = String(1 - v); });
  }

  // ---------------- a estrutura: cenas, transições, manchetes ----------------
  // fundo: 'escuro' | 'off' | 'limao'; entrada: como a cena entra (na batida)
  const CENAS = [
    { id: 'gancho', t0: 0, t1: 3.5, fundo: 'escuro', entrada: null, manchete: [['A', 'caipirinha', 'da', 'piscina'], ['entrou', 'na', 'conta?']], realce: ['entrou', 'na', 'conta?'] },
    { id: 'origens', t0: 3.5, t1: 6.0, fundo: 'off', entrada: 'desliza', manchete: [['Bar,', 'frigobar,'], ['restaurante…']], realce: ['restaurante…'] },
    { id: 'bilhetes', t0: 6.0, t1: 9.5, fundo: 'escuro', entrada: 'falha', manchete: [['e', 'cada', 'um', 'anota'], ['de', 'um', 'jeito.']], realce: ['cada', 'um', 'anota'] },
    { id: 'conta', t0: 9.5, t1: 14.5, fundo: 'escuro', entrada: 'mergulho', manchete: [['No', 'FAZLO', 'Hospeda,'], ['tudo', 'cai', 'na', 'comanda'], ['do', 'hóspede.']], realce: ['comanda', 'do', 'hóspede.'] },
    { id: 'somou', t0: 14.5, t1: 20.0, fundo: 'off', entrada: 'cortina', manchete: [['Lançou,', 'somou.']], realce: ['somou.'] },
    { id: 'cancelou', t0: 20.0, t1: 24.0, fundo: 'escuro', entrada: 'corte', manchete: [['Cancelou?'], ['Continua', 'registrado.']], realce: ['Continua', 'registrado.'] },
    { id: 'pronta', t0: 24.0, t1: 27.5, fundo: 'escuro', entrada: 'desliza-v', manchete: [['No', 'check-out,'], ['a', 'conta', 'já', 'está', 'pronta.']], realce: ['já', 'está', 'pronta.'] },
    { id: 'marca', t0: 27.5, t1: 30.0, fundo: 'limao', entrada: 'cortina', manchete: null },
  ];
  const DUR = 30.0;
  const FUNDO = { escuro: C.preto, off: C.off, limao: C.limao };
  const MANCHETE = { x: 80, y: 236, px: 84, lh: 0.98 };
  let ROOT, FLASH, GLITCH;
  const EV = [];
  const ev = (t, tipo, d = {}) => EV.push({ t: +t.toFixed(3), tipo, ...d });
  const QA = [];                                               // elementos para o QA: { cena, nome, tipo, e }
  const qa = (cena, nome, tipo, e) => { QA.push({ cena, nome, tipo, e }); return e; };

  function montaManchete(c) {
    if (!c.manchete) return;
    const base = c.fundo === 'escuro' ? C.off : C.preto, corRealce = c.fundo === 'escuro' ? C.limao : C.verde;
    const m = el('div', 'manchete', c.mundo, { position: 'absolute', left: MANCHETE.x + 'px', top: MANCHETE.y + 'px', font: `900 ${MANCHETE.px}px 'ID'`, letterSpacing: '-0.025em', lineHeight: MANCHETE.lh, color: base, whiteSpace: 'nowrap' });
    c.palavras = [];
    c.manchete.forEach((ln) => {
      const L = el('div', null, m, { overflow: 'hidden', paddingBottom: '0.1em', marginBottom: '-0.1em' });
      const row = el('div', null, L);
      ln.forEach((w, i) => { const s = el('span', null, row, { display: 'inline-block', color: c.realce.includes(w) ? corRealce : base }); s.textContent = w + (i < ln.length - 1 ? ' ' : ''); c.palavras.push(s); });
    });
    c.mancheteEl = qa(c.id, 'manchete', 'texto', m);
  }
  function animaManchete(c, lt) {
    if (!c.palavras) return;
    c.palavras.forEach((s, i) => { const u = EZ.expo(clamp((lt - 0.05 - i * 0.055) / 0.45)); s.style.transform = `translateY(${(1 - u) * 115}%)`; });
    c.mancheteEl.style.transform = `translate(${Math.sin(lt * 1.1) * 4}px, ${Math.sin(lt * 1.6) * 3}px)`;
  }

  // ---------------- partículas (algo sempre respira) ----------------
  function particulas(c, n, cor) {
    c.parts = [];
    for (let i = 0; i < n; i++) {
      const s = 4 + rnd(i * 3.1 + c.t0) * 9;
      c.parts.push({ e: el('div', null, c.fundoEl, { position: 'absolute', left: 0, top: 0, width: s + 'px', height: s + 'px', borderRadius: '50%', background: cor }), x: 60 + rnd(i * 7.7 + c.t0) * 820, y: 260 + rnd(i * 5.3 + c.t0) * 1240, v: 30 + rnd(i * 1.9) * 70, f: rnd(i * 2.3) * 6 });
    }
  }
  function animaParticulas(c, lt) {
    for (const p of c.parts || []) { const y = 260 + ((p.y - 260 - lt * p.v) % 1240 + 1240) % 1240; p.e.style.transform = `translate(${p.x + Math.sin(lt * 1.3 + p.f) * 18}px, ${y}px)`; p.e.style.opacity = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(lt * 3 + p.f)); }
  }

  // ---------------- peças ----------------
  function pilula(parent, txt, css) { const d = el('div', 'pilula', parent, { position: 'absolute', height: '84px', padding: '0 40px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '16px', font: "600 42px 'Geist'", whiteSpace: 'nowrap', boxSizing: 'border-box', ...css }); el('span', null, d, { width: '16px', height: '16px', borderRadius: '50%', background: C.limao, boxShadow: `0 0 0 3px ${rgba(C.preto, 0.15)}` }); el('span', null, d).textContent = txt; return d; }
  function valorMono(parent, txt, px, cor, css = {}) { const d = el('div', 'valor', parent, { position: 'absolute', font: `700 ${px}px 'Geist Mono'`, letterSpacing: '-0.04em', color: cor, whiteSpace: 'nowrap', ...css }); d.textContent = txt; return d; }
  // a "conta" gráfica: a coluna de chips dos itens com a barra do total (peça própria, desenhada para o vídeo)
  function conta(parent, x, y, w, escuro = true) {
    const box = el('div', 'conta', parent, { position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: '700px', borderRadius: '36px', background: escuro ? C.painel : '#FFFFFF', border: `2px solid ${escuro ? rgba(C.off, 0.12) : rgba(C.preto, 0.08)}`, boxSizing: 'border-box', transformOrigin: '50% 50%', boxShadow: '0 40px 100px rgba(0,0,0,.45)' });
    const cab = el('div', null, box, { position: 'absolute', left: '34px', top: '26px', right: '34px', display: 'flex', alignItems: 'center', gap: '18px' });
    const ic = el('div', null, cab, { position: 'relative', width: '58px', height: '58px', borderRadius: '16px', background: rgba(C.limao, 0.14), flex: 'none' });
    icone('comanda', 34, C.limao, 2.4, ic, { left: '12px', top: '12px' }).paths.forEach((p) => { p.style.strokeDashoffset = '0'; });
    const tt = el('div', null, cab);
    el('div', null, tt, { font: "700 36px 'Geist'", letterSpacing: '-0.015em', color: escuro ? C.off : C.preto, lineHeight: '40px' }).textContent = 'Mariana Costa';
    el('div', null, tt, { font: "500 24px 'Geist'", color: C.cinza, lineHeight: '28px' }).textContent = 'Suíte Mirante';
    const chips = ITENS.map((it, i) => {
      const d = el('div', 'chip', box, { position: 'absolute', left: '26px', right: '26px', top: (118 + i * 70) + 'px', height: '60px', borderRadius: '16px', background: escuro ? '#1E221B' : '#F1F1EC', display: 'flex', alignItems: 'center', padding: '0 22px', boxSizing: 'border-box', gap: '14px', font: "600 26px 'Geist'", color: escuro ? C.off : C.preto, opacity: 0 });
      el('span', null, d, { width: '10px', height: '10px', borderRadius: '50%', background: it.cancelado ? C.cinza : C.limao, flex: 'none' });
      const n = el('span', null, d, { flex: '1', whiteSpace: 'nowrap', overflow: 'hidden', position: 'relative' }); n.textContent = `${it.nome}`;
      const q = el('span', null, d, { font: "500 22px 'Geist Mono'", color: C.cinza, whiteSpace: 'nowrap' }); q.textContent = `${it.q} ×`;
      const v = el('span', null, d, { font: "700 26px 'Geist Mono'", whiteSpace: 'nowrap', minWidth: '150px', textAlign: 'right' }); v.textContent = brl(it.q * it.un);
      const risco = el('div', null, d, { position: 'absolute', left: '48px', right: '22px', top: '29px', height: '3px', background: C.cinza, transformOrigin: '0 50%', transform: 'scaleX(0)' });
      return { d, n, q, v, risco, it };
    });
    const barra = el('div', null, box, { position: 'absolute', left: '26px', right: '26px', top: '548px', height: '124px', borderRadius: '22px', background: C.limao, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '0 28px', boxSizing: 'border-box', color: C.preto });
    el('span', null, barra, { font: "600 32px 'Geist'", flex: 'none' }).textContent = 'Total';
    // o valor tem a largura do maior valor ("R$ 287,00"/"R$ 321,00") reservada desde o início, alinhado à direita
    const tot = el('span', null, barra, { font: "700 70px 'Geist Mono'", letterSpacing: '-0.045em', transformOrigin: '100% 50%', display: 'inline-block', width: '360px', textAlign: 'right', whiteSpace: 'nowrap', flex: 'none' }); tot.textContent = brl(0);
    return { box, chips, barra, tot };
  }

  // ---------------- montagem das cenas ----------------
  const CENA = {};
  async function init(root) {
    ROOT = root;
    for (const c of CENAS) {
      c.el = el('div', 'cena', ROOT, { position: 'absolute', inset: 0, overflow: 'hidden', display: 'none', transformOrigin: '50% 50%' });
      c.fundoEl = el('div', 'fundo', c.el, { position: 'absolute', inset: 0, background: FUNDO[c.fundo] });
      if (c.fundo === 'escuro') el('div', null, c.fundoEl, { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 900px 1100px at 540px 900px, rgba(175,250,39,0.07), rgba(0,0,0,0) 65%)' });
      c.mundo = el('div', 'mundo', c.el, { position: 'absolute', inset: 0, transformOrigin: '540px 900px' });
      montaManchete(c);
      particulas(c, c.fundo === 'escuro' ? 26 : 18, c.fundo === 'escuro' ? rgba(C.limao, 0.55) : c.fundo === 'off' ? rgba(C.preto, 0.25) : rgba(C.preto, 0.3));
      CENA[c.id] = c;
      MONTA[c.id](c);
    }
    FLASH = el('div', 'flash', ROOT, { position: 'absolute', inset: 0, background: '#FFFFFF', opacity: 0, pointerEvents: 'none' });
    GLITCH = el('div', 'falha', ROOT, { position: 'absolute', inset: 0, pointerEvents: 'none', display: 'none' });
    for (let i = 0; i < 9; i++) el('div', null, GLITCH, { position: 'absolute', left: 0, width: '100%' });
    for (let i = 1; i < CENAS.length; i++) ev(CENAS[i].t0, 'corte', { tipo_entrada: CENAS[i].entrada });
    await Promise.all([...ROOT.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
  }

  const MONTA = {
    // 1 · o copo gigante desenhando-se em limão, o gelo, as gotas, "R$ 22,00" batendo, o "?"
    gancho(c) {
      c.copo = icone('copo', 600, C.limao, 15, c.mundo, { left: '90px', top: '560px' });
      c.gotas = [0, 1, 2, 3, 4].map((i) => el('div', null, c.mundo, { position: 'absolute', left: 0, top: 0, width: '22px', height: '30px', borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%', background: C.limao }));
      c.preco = qa('gancho', 'R$ 22,00', 'valor', valorMono(c.mundo, brl(22), 132, C.off, { left: '96px', top: '1238px', transformOrigin: '0% 50%' }));
      c.q = qa('gancho', '?', 'grafico', el('div', null, c.mundo, { position: 'absolute', left: '700px', top: '520px', font: "900 400px 'ID'", color: C.limao, lineHeight: '1', transformOrigin: '50% 60%' })); c.q.textContent = '?';
      qa('gancho', 'copo', 'icone', c.copo.s);
      ev(0.5, 'batida'); ev(1.0, 'pulso'); ev(2.0, 'pulso'); ev(3.0, 'pulso');
    },
    // 2 · três ícones, um a um na batida, com etiqueta e preço; a câmera desliza de um para o outro
    origens(c) {
      c.trilho = el('div', null, c.mundo, { position: 'absolute', left: 0, top: 0, width: 3 * W + 'px', height: H + 'px', transformOrigin: '0 0' });
      const D = [['copo', 'Bar da piscina', 22], ['garrafa', 'Frigobar', 6], ['prato', 'Restaurante', 68]];
      c.paineis = D.map(([ic, et, v], i) => {
        const x0 = i * W;
        const icn = icone(ic, 430, C.preto, 13, c.trilho, { left: x0 + 325 + 'px', top: '540px' });
        const et_ = pilula(c.trilho, et, { left: x0 + 540 + 'px', top: '1010px', background: C.preto, color: C.off, transform: 'translateX(-50%)' });
        const pv = valorMono(c.trilho, brl(v), 150, C.preto, { left: x0 + 540 + 'px', top: '1150px', transform: 'translateX(-50%)', transformOrigin: '50% 60%' });
        return { icn, et: et_, pv, chegada: [3.5, 4.3, 5.1][i] };
      });
      c.paineis.forEach((p, i) => { ev(p.chegada + 0.05, 'icone'); ev(p.chegada + 0.3, 'preco'); qa('origens', ['R$ 22,00', 'R$ 6,00', 'R$ 68,00'][i], 'valor', p.pv); qa('origens', 'etiqueta ' + i, 'etiqueta', p.et); qa('origens', 'icone ' + i, 'icone', p.icn.s); });
      ev(4.3, 'desliza'); ev(5.1, 'desliza'); ev(5.6, 'recua');
    },
    // 3 · bilhetes desencontrados: um torto, um rasurado, um borrado; a Cerveja escapa e cai do quadro
    bilhetes(c) {
      const N = [
        { txt: ['Caipirinha', 'R$ 22,00'], x: 330, y: 700, r: -13, tipo: 'torto' },
        { txt: ['Água sem gás', '2 × R$ 6,00'], x: 600, y: 890, r: 7, tipo: 'rasurado' },
        { txt: ['Risoto de cogumelos', 'R$ 68,00'], x: 420, y: 1160, r: -5, tipo: 'borrado' },
        { txt: ['Cerveja long neck', 'R$ 14,00'], x: 700, y: 640, r: 11, tipo: 'escapa' },
      ];
      c.notas = N.map((n, i) => {
        const d = el('div', 'bilhete', c.mundo, { position: 'absolute', left: 0, top: 0, padding: '24px 34px 28px', boxSizing: 'border-box', borderRadius: '18px', background: '#ECEAE2', color: C.preto, boxShadow: '0 30px 70px rgba(0,0,0,.5)', transformOrigin: '50% 50%' });
        el('div', null, d, { font: "600 38px 'Geist'", letterSpacing: '-0.01em', whiteSpace: 'nowrap' }).textContent = n.txt[0];
        const v = el('div', null, d, { position: 'relative', display: 'inline-block', font: "700 84px 'Geist Mono'", letterSpacing: '-0.045em', marginTop: '2px', whiteSpace: 'nowrap' }); v.textContent = n.txt[1];
        qa('bilhetes', n.txt[1], 'valor', v);
        if (n.tipo === 'rasurado') for (let k = 0; k < 3; k++) el('div', null, v, { position: 'absolute', left: '-6px', right: '-6px', top: (34 + k * 14) + 'px', height: '7px', background: C.preto, transform: `rotate(${[-6, 4, -2][k]}deg)` });
        if (n.tipo === 'borrado') { d.style.filter = 'blur(3.5px)'; }
        qa('bilhetes', n.txt[0], 'bilhete', d);
        return { ...n, d };
      });
      ev(6.05, 'espalha'); ev(7.5, 'embaralha'); ev(8.2, 'queda');
    },
    // 4 · os três ícones ligados por curvas a uma conta central; pulsos viram itens; o Total conta até R$ 287,00
    conta(c) {
      c.icones = [['copo', 210], ['garrafa', 540], ['prato', 870]].map(([n, x]) => ({ n, x, ic: icone(n, 150, C.limao, 9, c.mundo, { left: x - 75 + 'px', top: '530px' }) }));
      c.svg = document.createElementNS(NS, 'svg'); c.svg.setAttribute('width', W); c.svg.setAttribute('height', H); Object.assign(c.svg.style, { position: 'absolute', left: 0, top: 0, overflow: 'visible' }); c.mundo.appendChild(c.svg);
      c.k = conta(c.mundo, 240, 760, 600, true);
      c.alvo = { x: 540, y: 770 };
      const origem = { copo: 0, garrafa: 1, prato: 2 };
      c.curvas = c.icones.map((I) => {
        const p = document.createElementNS(NS, 'path');
        const x0 = I.x, y0 = 700, x1 = c.alvo.x, y1 = c.alvo.y;
        p.setAttribute('d', `M${x0} ${y0} C ${x0} ${y0 + 60}, ${x1 + (x0 - x1) * 0.15} ${y1 - 70}, ${x1} ${y1}`); p.setAttribute('fill', 'none'); p.setAttribute('stroke', C.limao); p.setAttribute('stroke-width', '5'); p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; c.svg.appendChild(p); return p;
      });
      c.pulsos = [];
      c.chegadas = [10.2, 10.55, 10.9, 11.25, 11.6];
      ITENS.filter((it) => !it.cancelado).forEach((it, i) => {
        const dot = el('div', null, c.mundo, { position: 'absolute', left: 0, top: 0, width: '30px', height: '30px', margin: '-15px', borderRadius: '50%', background: C.limao, boxShadow: `0 0 26px 8px ${rgba(C.limao, 0.6)}`, display: 'none' });
        c.pulsos.push({ it, i, curva: c.curvas[origem[it.icone]], dot, chega: c.chegadas[i] });
        ev(c.chegadas[i] - 0.4, 'pulso_sai'); ev(c.chegadas[i], 'item');
      });
      c.volta = { t0: 11.6, t1: 12.0 }; ev(11.6, 'volta'); ev(12.0, 'item_cinza');
      // 4b · o mergulho no total
      c.grande = el('div', null, c.mundo, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px', display: 'none' });
      c.gLbl = el('div', null, c.grande, { position: 'absolute', left: '0', right: '0', top: '640px', textAlign: 'center', font: "600 58px 'Geist'", color: C.off }); c.gLbl.textContent = 'Total';
      c.gVal = qa('conta', 'Total grande', 'valor', valorMono(c.grande, brl(TOTAL_1), 178, C.limao, { left: '540px', top: '730px', transform: 'translateX(-50%)', transformOrigin: '50% 60%', textShadow: `0 0 50px ${rgba(C.limao, 0.35)}` }));
      c.gSub = el('div', null, c.grande, { position: 'absolute', left: '0', right: '0', top: '960px', textAlign: 'center', font: "500 38px 'Geist'", color: C.cinza }); c.gSub.textContent = 'Mariana Costa · Suíte Mirante';
      c.mini = el('div', null, c.grande, { position: 'absolute', left: '290px', top: '1090px', width: '500px', height: '300px' });
      c.miniChips = ITENS.map((it, i) => { const d = el('div', null, c.mini, { position: 'absolute', left: (i % 2) * 260 + 'px', top: Math.floor(i / 2) * 80 + 'px', width: '240px', height: '64px', borderRadius: '14px', background: '#1E221B', font: "700 26px 'Geist Mono'", color: it.cancelado ? C.cinza : C.off, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: it.cancelado ? 'line-through' : 'none' }); d.textContent = brl(it.q * it.un); return d; });
      qa('conta', 'conta', 'painel', c.k.box); qa('conta', 'Total (barra)', 'valor', c.k.tot); c.icones.forEach((I) => qa('conta', 'icone ' + I.n, 'icone', I.ic.s));
      ev(12.0, 'mergulho'); ev(12.4, 'pulso');
    },
    // 5 · números gigantes: 3 → 4, 2 → 4, e o "+ R$ 34,00" que bate no Total
    somou(c) {
      const corte = (ic, de, para, un, v1, v2) => {
        const g = el('div', null, c.mundo, { position: 'absolute', inset: 0, display: 'none' });
        const icn = icone(ic, 170, C.preto, 9, g, { left: '80px', top: '410px' });
        const linha = el('div', null, g, { position: 'absolute', left: '0', right: '0', top: '600px', height: '340px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', font: "700 320px 'Geist Mono'", letterSpacing: '-0.05em', lineHeight: '1', perspective: '900px' });
        const a = el('div', null, linha, { color: C.cinza }); a.textContent = String(de);
        const seta = el('div', null, linha, { color: C.verde, font: "700 200px 'Geist'", transformOrigin: '0% 50%' }); seta.textContent = '→';
        const b = el('div', null, linha, { color: C.preto, transformOrigin: '50% 50%', minWidth: '190px', textAlign: 'center' }); b.textContent = String(para);
        const x = el('div', null, g, { position: 'absolute', left: '540px', top: '958px', textAlign: 'center', translate: '-50% 0', width: 'max-content', font: "700 92px 'Geist Mono'", letterSpacing: '-0.04em', color: C.preto }); x.textContent = `× ${brl(un)}`;
        const val = el('div', null, g, { position: 'absolute', left: '540px', translate: '-50% 0', width: 'max-content', top: '1150px', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '22px', font: "700 76px 'Geist Mono'", letterSpacing: '-0.04em' });
        const va = el('span', null, val, { color: C.cinza, position: 'relative' }); va.textContent = brl(v1);
        const vr = el('span', null, val, { color: C.verde, font: "700 64px 'Geist'" }); vr.textContent = '→';
        const vb = el('span', null, val, { color: C.preto, display: 'inline-block' }); vb.textContent = brl(v2);
        const risco = el('div', null, va, { position: 'absolute', left: '-4px', right: '-4px', top: '50%', height: '6px', background: C.cinza, transformOrigin: '0 50%', transform: 'scaleX(0)' });
        qa('somou', `${de} → ${para}`, 'valor', linha); qa('somou', `× ${brl(un)}`, 'valor', x); qa('somou', `${brl(v1)} → ${brl(v2)}`, 'valor', val);
        return { g, icn, a, seta, b, x, val, va, vb, risco };
      };
      c.c1 = corte('copo', 3, 4, 22, 66, 88); c.c2 = corte('garrafa', 2, 4, 6, 12, 24);
      c.c3 = el('div', null, c.mundo, { position: 'absolute', inset: 0, display: 'none' });
      c.tLbl = el('div', null, c.c3, { position: 'absolute', left: 0, right: 0, top: '520px', textAlign: 'center', font: "600 60px 'Geist'", color: C.cinzaE }); c.tLbl.textContent = 'Total';
      c.tVal = qa('somou', 'Total 287 → 321', 'valor', valorMono(c.c3, brl(TOTAL_1), 164, C.preto, { left: '540px', top: '610px', transform: 'translateX(-50%)', transformOrigin: '50% 60%' }));
      c.tAntes = el('div', null, c.c3, { position: 'absolute', left: 0, right: 0, top: '850px', textAlign: 'center', font: "600 54px 'Geist Mono'", color: C.cinza, letterSpacing: '-0.03em' }); c.tAntes.textContent = `${brl(TOTAL_1)} → ${brl(TOTAL_2)}`;
      c.chip = qa('somou', '+ R$ 34,00', 'chip', el('div', null, c.c3, { position: 'absolute', left: 0, top: 0, height: '120px', padding: '0 46px', borderRadius: '999px', background: C.limao, color: C.preto, font: "700 76px 'Geist Mono'", letterSpacing: '-0.04em', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', boxShadow: '0 30px 60px rgba(0,0,0,.25)' }));
      c.chip.textContent = `+ ${brl(TOTAL_2 - TOTAL_1)}`;
      ev(15.0, 'vira'); ev(15.35, 'troca'); ev(16.5, 'desliza'); ev(17.0, 'vira'); ev(17.35, 'troca'); ev(18.5, 'desliza'); ev(18.9, 'bate'); ev(19.0, 'conta', { dur: 0.55 }); ev(19.55, 'pulso');
    },
    // 6 · o cartão da Cerveja cancelada: risco, carimbo com tremor; volta para a coluna, cinza, e não some
    cancelou(c) {
      c.card = qa('cancelou', 'cartão cancelado', 'valor', el('div', null, c.mundo, { position: 'absolute', left: '90px', top: '616px', width: '880px', height: '360px', borderRadius: '40px', background: C.off, color: C.preto, transformOrigin: '50% 50%', boxShadow: '0 40px 100px rgba(0,0,0,.55)', overflow: 'visible' }));
      el('div', null, c.card, { position: 'absolute', left: 0, top: 0, bottom: 0, width: '14px', borderRadius: '40px 0 0 40px', background: C.limao });
      c.cNome = el('div', null, c.card, { position: 'absolute', left: '62px', top: '52px', font: "700 66px 'Geist'", letterSpacing: '-0.02em' }); c.cNome.textContent = 'Cerveja long neck';
      el('div', null, c.card, { position: 'absolute', left: '64px', top: '138px', font: "500 40px 'Geist'", color: C.cinzaE }).textContent = 'Frigobar';
      c.cVal = el('div', null, c.card, { position: 'absolute', left: '62px', top: '214px', whiteSpace: 'nowrap', font: "700 104px 'Geist Mono'", letterSpacing: '-0.05em' }); c.cVal.textContent = `1 × ${brl(14)}`;
      c.risco = el('div', null, c.card, { position: 'absolute', left: '62px', top: '92px', width: '600px', height: '11px', borderRadius: '6px', background: C.preto, transformOrigin: '0 50%', transform: 'scaleX(0) rotate(-2deg)' });
      c.risco2 = el('div', null, c.card, { position: 'absolute', left: '62px', top: '272px', width: '660px', height: '12px', borderRadius: '6px', background: C.preto, transformOrigin: '0 50%', transform: 'scaleX(0) rotate(-2deg)' });
      c.selo = el('div', null, c.card, { position: 'absolute', right: '40px', top: '-46px', padding: '10px 30px', border: `9px solid ${C.preto}`, borderRadius: '20px', background: C.limao, font: "900 72px 'ID'", letterSpacing: '0.02em', color: C.preto, transformOrigin: '50% 50%', display: 'none' });
      c.selo.textContent = 'CANCELADO';
      c.k = conta(c.mundo, 240, 640, 600, true); c.k.box.style.display = 'none';
      ev(20.55, 'risco'); ev(21.25, 'carimbo'); ev(22.5, 'encolhe'); ev(23.0, 'encaixa');
    },
    // 7 · a coluna se compacta num único cartão "Total R$ 321,00" gigante, que fecha com o check desenhado
    pronta(c) {
      c.k = conta(c.mundo, 240, 600, 600, true);
      c.tc = qa('pronta', 'Total R$ 321,00', 'valor', el('div', null, c.mundo, { position: 'absolute', left: '120px', top: '560px', width: '800px', height: '390px', borderRadius: '44px', background: C.off, color: C.preto, transformOrigin: '50% 50%', display: 'none', boxShadow: '0 50px 120px rgba(0,0,0,.6)' }));
      el('div', null, c.tc, { position: 'absolute', left: '60px', top: '64px', font: "600 54px 'Geist'", color: C.cinzaE }).textContent = 'Total';
      c.tcV = el('div', null, c.tc, { position: 'absolute', left: '50px', top: '176px', font: "700 140px 'Geist Mono'", letterSpacing: '-0.05em', whiteSpace: 'nowrap' }); c.tcV.textContent = brl(TOTAL_2);
      c.ckBox = el('div', null, c.tc, { position: 'absolute', right: '52px', top: '46px', width: '128px', height: '128px', borderRadius: '30px', background: C.preto });
      c.ck = icone('check', 84, C.limao, 13, c.ckBox, { left: '22px', top: '22px' });
      c.wipe = el('div', null, c.mundo, { position: 'absolute', left: '-100px', width: W + 200 + 'px', top: H + 'px', height: H + 400 + 'px', background: C.limao, transform: 'skewY(-6deg)' });
      ev(24.2, 'compacta'); ev(24.75, 'impacto'); ev(25.4, 'check'); ev(27.1, 'abre');
    },
    // 8 · a marca se monta sobre o verde-limão
    marca(c) {
      c.card = qa('marca', 'marca', 'marca', el('div', null, c.mundo, { position: 'absolute', left: '100px', top: '700px', width: '880px', height: '280px', borderRadius: '48px', background: C.preto, transformOrigin: '50% 50%', overflow: 'hidden' }));
      const K = 0.58, mk = (x0, x1, left) => { const box = el('div', null, c.card, { position: 'absolute', left: left + 'px', top: (280 - 216 * K) / 2 + 'px', width: (x1 - x0) * K + 'px', height: 216 * K + 'px', overflow: 'hidden' }); const i = el('img', null, box, { position: 'absolute', left: -x0 * K + 'px', top: '0', width: 1248 * K + 'px', height: 216 * K + 'px' }); i.src = 'logo.png'; i.decoding = 'sync'; return box; };
      c.palavra = mk(0, 640, (880 - 1248 * K) / 2); c.pilula = mk(640, 1248, (880 - 1248 * K) / 2 + 640 * K);
      c.listras = el('div', null, c.fundoEl, { position: 'absolute', inset: '-400px', background: `repeating-linear-gradient(115deg, ${rgba(C.preto, 0.05)} 0 3px, transparent 3px 46px)` });
      ev(27.6, 'monta'); ev(28.1, 'marca');
    },
  };

  // ---------------- animação de cada cena (lt = tempo local) ----------------
  const ANIMA = {
    gancho(c, t) {
      traca(c.copo, 0.45 + 0.55 * ramp(t, 0, 0.9, EZ.io), false);
      c.copo.s.style.transform = `rotate(${Math.sin(t * 1.7) * 3}deg) translateY(${Math.sin(t * 2.2) * 8}px)`;
      if (c.copo.gelo) c.copo.gelo.setAttribute('transform', `translate(${Math.sin(t * 3) * 0.35} ${Math.sin(t * 4.1) * 0.5}) rotate(${Math.sin(t * 2.6) * 6} 12 15)`);
      c.gotas.forEach((g, i) => { const f = ((t * 1.2 + i * 0.21) % 1); g.style.transform = `translate(${260 + i * 36 + Math.sin(i * 3) * 20}px, ${1150 + f * 120}px) scale(${1 - f * 0.5})`; g.style.opacity = (1 - f) * 0.9; });
      const b = batida(t, 0.15);
      c.preco.style.transform = `scale(${1 + 0.1 * b}) translateX(${Math.sin(t * 1.4) * 6}px)`;
      c.q.style.transform = `rotate(${8 + Math.sin(t * 2.4) * 6}deg) scale(${1 + 0.14 * b})`; c.q.style.textShadow = `0 0 ${30 + 50 * b}px ${rgba(C.limao, 0.55)}`;
    },
    origens(c, t, T) {
      // a câmera: copo → garrafa → prato (deslizes rápidos na batida) → recua mostrando os três
      const x1 = ramp(T, 4.3, 4.5, EZ.io), x2 = ramp(T, 5.1, 5.3, EZ.io), rec = ramp(T, 5.6, 5.85, EZ.io);
      const cx = lerp(lerp(0, W, x1), 2 * W, x2), esc = lerp(1, 0.31, rec), tx = lerp(-cx, (W - 3 * W * 0.31) / 2, rec), ty = lerp(0, 600, rec);
      c.trilho.style.transform = `translate(${tx + Math.sin(t * 2) * 6}px, ${ty}px) scale(${esc})`;
      c.paineis.forEach((p, i) => {
        traca(p.icn, ramp(T, p.chegada, p.chegada + 0.45, EZ.io));
        p.icn.s.style.transform = `rotate(${Math.sin(T * 2.3 + i) * 4}deg) translateY(${Math.sin(T * 3 + i) * 10}px)`;
        const e = EZ.elastico(clamp((T - p.chegada - 0.25) / 0.5));
        p.pv.style.transform = `translateX(-50%) scale(${0.2 + 0.8 * e}) rotate(${(1 - clamp(e)) * -8}deg)`; p.pv.style.opacity = clamp(e * 3);
        const s = EZ.back(clamp((T - p.chegada - 0.1) / 0.35)); p.et.style.transform = `translateX(-50%) translateY(${(1 - clamp(s)) * 50}px) scale(${0.8 + 0.2 * s})`; p.et.style.opacity = clamp(s * 2);
      });
    },
    bilhetes(c, t, T) {
      const emb = ramp(T, 7.5, 7.9, EZ.io);
      const troca = [[0, 2], [1, 0], [2, 1]];
      c.notas.forEach((n, i) => {
        const ent = EZ.back(clamp((T - 6.0 - i * 0.12) / 0.45));
        let x = n.x, y = n.y;
        if (i < 3) { const o = c.notas[troca[i][1]]; x = lerp(n.x, o.x, emb * (Math.sin(T) * 0 + 1) * (T < 8.6 ? 1 : 1)); y = lerp(n.y, o.y, emb); }
        x += Math.sin(T * 1.6 + i * 2) * 26; y += Math.cos(T * 1.3 + i) * 18;
        let r = n.r + Math.sin(T * 1.8 + i) * (n.tipo === 'torto' ? 9 : 4) + emb * (i % 2 ? 14 : -14) * (1 - ramp(T, 8.4, 9.0));
        let op = clamp(ent * 2);
        if (n.tipo === 'escapa') { const q = clamp((T - 8.2) / 0.9); x = lerp(x, 1550, EZ.quad(q)); y = y + 260 * EZ.quad(q); r += 120 * q; }
        const bw = n.d.offsetWidth, bh = n.d.offsetHeight;
        n.d.style.transform = `translate(${x - bw / 2 - (1 - clamp(ent)) * (i % 2 ? -300 : 300)}px, ${y - bh / 2}px) rotate(${r}deg) scale(${0.85 + 0.15 * ent})`;
        n.d.style.opacity = op;
      });
    },
    conta(c, t, T) {
      const mer = ramp(T, 11.95, 12.3, EZ.in);
      // os ícones e as curvas
      c.icones.forEach((I, i) => { traca(I.ic, ramp(T, 9.55 + i * 0.12, 9.95 + i * 0.12, EZ.io)); I.ic.s.style.transform = `translateY(${Math.sin(T * 3 + i) * 8}px) rotate(${Math.sin(T * 2 + i) * 4}deg)`; });
      c.curvas.forEach((p, i) => { p.style.strokeDashoffset = String(1 - ramp(T, 9.7 + i * 0.1, 10.1 + i * 0.1, EZ.io)); p.style.opacity = 0.35 + 0.25 * Math.sin(T * 6 + i); });
      // os pulsos viajando nas curvas; ao chegar, viram um item da conta
      let tot = 0;
      for (const P of c.pulsos) {
        const u = clamp((T - (P.chega - 0.4)) / 0.4), vis = u > 0 && u < 1; P.dot.style.display = vis ? 'block' : 'none';
        if (vis) { const L = P.curva.getTotalLength ? P.curva : null; const pt = P.curva.getPointAtLength(EZ.in(u) * P.curva.getTotalLength()); P.dot.style.transform = `translate(${pt.x}px, ${pt.y}px) scale(${1 + 0.3 * Math.sin(u * 10)})`; }
        const ch = c.k.chips[P.i], a = EZ.back(clamp((T - P.chega) / 0.35));
        ch.d.style.opacity = clamp(a * 2); ch.d.style.transform = `translateY(${(1 - clamp(a)) * -60}px) scale(${0.9 + 0.1 * a + 0.05 * kick(T, P.chega, 0.4)})`;
        ch.d.style.boxShadow = `inset 0 0 0 ${3 * kick(T, P.chega, 0.6) * 2}px ${C.limao}`;
        tot += P.it.q * P.it.un * EZ.out(clamp((T - P.chega) / 0.3));
      }
      // a cerveja que escapou volta pela lateral (esquerda) e entra também, em cinza (cancelada, não soma)
      const cv = c.k.chips[5], vu = EZ.out(clamp((T - c.volta.t0) / 0.4));
      cv.d.style.opacity = T >= c.volta.t0 ? 1 : 0; cv.d.style.transform = `translateX(${(1 - vu) * -760}px) rotate(${(1 - vu) * -14}deg)`; cv.d.style.color = C.cinza; cv.v.style.color = C.cinza;
      cv.risco.style.transform = `scaleX(${ramp(T, c.volta.t1, c.volta.t1 + 0.3)})`;
      c.k.tot.textContent = brl(tot); c.k.tot.style.transform = `scale(${1 + 0.06 * Math.max(...c.chegadas.map((x) => kick(T, x, 0.35)))})`;
      c.k.box.style.transform = `translateY(${Math.sin(T * 1.4) * 6}px) scale(${1 + mer * 0.6})`; c.k.box.style.opacity = 1 - clamp(mer * 3.5);
      c.icones.forEach((I) => { I.ic.s.style.opacity = 1 - mer; }); c.svg.style.opacity = 1 - mer;
      // 4b · o total grande
      const g = ramp(T, 12.15, 12.55, EZ.out); c.grande.style.display = T >= 12.15 ? 'block' : 'none';
      if (T >= 12.15) {
        c.grande.style.opacity = g; c.grande.style.transform = `scale(${0.7 + 0.3 * g})`; c.grande.style.transformOrigin = '540px 820px';
        c.gVal.textContent = brl(TOTAL_1);
        c.gVal.style.transform = `translateX(-50%) scale(${1 + 0.16 * kick(T, 12.4, 0.5) + 0.04 * batida(T, 0.2)}) rotate(${Math.sin(T * 2.3) * 1.5}deg)`;
        c.miniChips.forEach((d, i) => { const a = EZ.back(clamp((T - 12.5 - i * 0.08) / 0.3)); d.style.opacity = clamp(a * 2); d.style.transform = `translateY(${(1 - clamp(a)) * 40 + Math.sin(T * 3 + i) * 5}px)`; });
      }
    },
    somou(c, t, T) {
      const vis1 = T < 16.75, vis2 = T >= 16.3 && T < 18.75, vis3 = T >= 18.3;
      const sl = (a) => EZ.io(clamp((T - a) / 0.25));
      const anim = (k, t0, sai) => {
        const lt = T - t0;
        traca(k.icn, ramp(lt, 0, 0.4, EZ.io)); k.icn.s.style.transform = `rotate(${Math.sin(T * 2.4) * 5}deg) translateY(${Math.sin(T * 3) * 8}px)`;
        k.seta.style.transform = `scaleX(${ramp(lt, 0.15, 0.4)})`;
        const f = clamp((lt - 0.5) / 0.3);                                                                   // o placar vira
        k.b.style.transform = `rotateX(${f < 0.5 ? -90 + 0 : 0}deg)`; k.b.style.transform = `rotateX(${lerp(-90, 0, EZ.out(clamp((lt - 0.5) / 0.25)))}deg) scale(${1 + 0.12 * kick(lt, 0.75, 0.5)})`;
        k.b.style.opacity = lt > 0.5 ? 1 : 0;
        k.a.style.transform = `translateY(${Math.sin(T * 2) * 6}px)`;
        const xu = EZ.back(clamp((lt - 0.2) / 0.35)); k.x.style.transform = `translateY(${(1 - clamp(xu)) * 60}px) scale(${1 + 0.05 * batida(T)})`; k.x.style.opacity = clamp(xu * 2);
        k.risco.style.transform = `scaleX(${ramp(lt, 0.85, 1.05)})`;
        const vb = EZ.elastico(clamp((lt - 0.85) / 0.5)); k.vb.style.transform = `scale(${0.3 + 0.7 * vb})`; k.vb.style.opacity = clamp(vb * 3);
        k.g.style.transform = `translateX(${sai * -W}px)`;
      };
      c.c1.g.style.display = vis1 ? 'block' : 'none'; if (vis1) { anim(c.c1, 14.5, sl(16.45)); c.c1.g.style.transform += ` translateX(${(1 - sl(14.5)) * 0}px)`; }
      c.c2.g.style.display = vis2 ? 'block' : 'none'; if (vis2) { anim(c.c2, 16.5, sl(18.45)); c.c2.g.style.transform = `translateX(${(1 - sl(16.35)) * W - sl(18.45) * W}px)`; }
      c.c3.style.display = vis3 ? 'block' : 'none';
      if (vis3) {
        c.c3.style.transform = `translateX(${(1 - sl(18.35)) * W}px)`;
        const hit = 18.9, u = EZ.in(clamp((T - 18.55) / (hit - 18.55)));
        const w = c.chip.offsetWidth;
        c.chip.style.display = T < hit + 0.35 ? 'flex' : 'none';
        c.chip.style.transform = `translate(${lerp(-w - 40, 540 - w / 2, u)}px, ${lerp(1240, 700, u) - Math.sin(u * Math.PI) * 120 - ramp(T, hit, hit + 0.35) * 60}px) rotate(${lerp(-14, 0, u)}deg) scale(${1 + 0.3 * ramp(T, hit, hit + 0.35)})`;
        c.chip.style.opacity = 1 - ramp(T, hit, hit + 0.35);
        const cnt = lerp(TOTAL_1, TOTAL_2, EZ.io(clamp((T - 19.0) / 0.55)));
        c.tVal.textContent = brl(cnt);
        c.tVal.style.transform = `translateX(-50%) scale(${1 + 0.08 * kick(T, hit, 0.4) + 0.1 * kick(T, 19.55, 0.5) + 0.02 * batida(T)}) translateY(${-kick(T, 19.55, 0.4) * 30}px)`;
        c.tVal.style.color = T >= 19.55 ? C.preto : C.preto;
        c.tAntes.style.opacity = ramp(T, 19.6, 19.8); c.tLbl.style.transform = `translateY(${Math.sin(T * 2) * 5}px)`;
      }
    },
    cancelou(c, t, T) {
      const enc = ramp(T, 22.5, 23.0, EZ.io);
      const shake = kick(T, 21.25, 0.35);
      c.mundo.style.transform = `translate(${Math.sin(T * 90) * 18 * shake}px, ${Math.cos(T * 77) * 14 * shake}px)`;
      c.card.style.transform = `translate(${lerp(0, 0, enc)}px, ${lerp(Math.sin(T * 1.9) * 10, 0, enc)}px) rotate(${Math.sin(T * 1.5) * 1.5 * (1 - enc)}deg) scale(${lerp(1, 0, 0)})`;
      c.risco.style.transform = `scaleX(${ramp(T, 20.55, 20.85, EZ.io)}) rotate(-2deg)`; c.risco2.style.transform = `scaleX(${ramp(T, 20.75, 21.05, EZ.io)}) rotate(-2deg)`;
      c.cNome.style.color = T > 20.8 ? C.cinzaE : C.preto; c.cVal.style.color = T > 20.9 ? C.cinzaE : C.preto;
      const s = clamp((T - 21.25) / 0.16); c.selo.style.display = T >= 21.12 ? 'block' : 'none';
      c.selo.style.transform = `rotate(-9deg) scale(${T < 21.25 ? lerp(1.35, 1, EZ.in(clamp((T - 21.12) / 0.13))) : 1 + 0.06 * kick(T, 21.25, 0.3) + 0.02 * batida(T)})`; c.selo.style.opacity = clamp((T - 21.12) / 0.06);
      // o cartão encolhe e volta para a coluna: o item fica lá, cinza
      c.k.box.style.display = T >= 22.45 ? 'block' : 'none';
      if (T >= 22.45) {
        const a = ramp(T, 22.45, 22.85, EZ.out);
        c.k.box.style.opacity = a; c.k.box.style.transform = `translateY(${(1 - a) * 80 + Math.sin(T * 1.4) * 5}px)`;
        c.k.chips.forEach((ch, i) => { ch.d.style.opacity = i < 5 ? 1 : (T >= 23.0 ? 1 : 0); if (i === 5) { ch.d.style.color = C.cinza; ch.v.style.color = C.cinza; ch.risco.style.transform = 'scaleX(1)'; ch.d.style.boxShadow = `inset 0 0 0 ${6 * kick(T, 23.0, 0.7)}px ${C.limao}`; ch.d.style.transform = `scale(${1 + 0.08 * kick(T, 23.0, 0.5)})`; } });
        c.k.tot.textContent = brl(TOTAL_2);
        const rc = c.k.chips[5].d, alvoY = 640 + 118 + 5 * 70 + 30;                                          // o cartão viaja até a linha dele
        c.card.style.transformOrigin = '50% 50%';
        c.card.style.transform = `translate(0px, ${lerp(0, alvoY - 830, EZ.in(enc))}px) scale(${lerp(1, 0.6, EZ.out(clamp(enc * 1.6)))})`;
        c.card.style.opacity = 1 - ramp(T, 22.9, 23.05);
      } else c.card.style.opacity = 1;
    },
    pronta(c, t, T) {
      const comp = ramp(T, 24.15, 24.7, EZ.in);
      c.k.box.style.display = T < 24.8 ? 'block' : 'none';
      c.k.chips.forEach((ch, i) => { ch.d.style.opacity = 1; if (i === 5) { ch.d.style.color = C.cinza; ch.v.style.color = C.cinza; ch.risco.style.transform = 'scaleX(1)'; } ch.d.style.transform = `translateY(${(270 - (118 + i * 70)) * comp}px) scale(${1 - 0.2 * comp})`; });
      c.k.tot.textContent = brl(TOTAL_2);
      c.k.box.style.transform = `scaleY(${1 - 0.45 * comp}) translateY(${Math.sin(T * 1.6) * 5}px)`; c.k.box.style.opacity = 1 - ramp(T, 24.6, 24.8);
      const a = EZ.back(clamp((T - 24.7) / 0.4));
      c.tc.style.display = T >= 24.7 ? 'block' : 'none';
      c.tc.style.transform = `scale(${0.4 + 0.6 * a + 0.03 * Math.sin(T * 2.2) + 0.05 * kick(T, 25.8, 0.5)}) rotate(${Math.sin(T * 1.3) * 1.2}deg)`; c.tc.style.opacity = clamp(a * 2);
      traca(c.ck, ramp(T, 25.4, 25.8, EZ.io), false); c.ckBox.style.transform = `scale(${1 + 0.15 * kick(T, 25.8, 0.5)})`;
      c.tcV.style.transform = `translateY(${Math.sin(T * 2.6) * 4}px)`;
      const w = ramp(T, 27.05, 27.5, EZ.in); c.wipe.style.transform = `translateY(${-w * (H + 500)}px) skewY(-6deg)`;
    },
    marca(c, t, T) {
      const a = EZ.back(clamp((T - 27.55) / 0.4));
      c.card.style.transform = `translateY(${Math.sin(T * 2) * 6}px) scale(${0.45 + 0.55 * a + 0.015 * Math.sin(T * 3)}) rotate(${(1 - clamp(a)) * -8 + Math.sin(T * 1.7) * 1.0}deg)`; c.card.style.opacity = clamp(a * 2);
      const r = ramp(T, 27.85, 28.3, EZ.io); c.palavra.style.clipPath = `inset(0 ${(1 - r) * 100}% 0 0)`;
      const p = EZ.elastico(clamp((T - 28.15) / 0.55)); c.pilula.style.transform = `scale(${p}) translateY(${Math.sin(T * 4) * 3}px)`; c.pilula.style.transformOrigin = '30% 50%';
      c.listras.style.transform = `translateX(${(T - 27.5) * 60}px)`;
    },
  };

  // ---------------- transições ----------------
  function render(t) {
    for (let i = 0; i < CENAS.length; i++) {
      const c = CENAS[i], nx = CENAS[i + 1];
      const ent = c.entrada, b0 = c.t0, b1 = c.t1;
      const pre = ent === 'desliza' || ent === 'desliza-v' ? 0.15 : ent === 'cortina' ? 0.3 : ent === 'mergulho' ? 0.1 : 0;
      const pos = nx ? (nx.entrada === 'desliza' || nx.entrada === 'desliza-v' ? 0.2 : nx.entrada === 'mergulho' ? 0.22 : nx.entrada === 'cortina' ? 0.05 : 0) : 0;
      const vis = t >= b0 - pre && t < b1 + pos;
      c.el.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      c.el.style.zIndex = String(i + 1);
      let tr = '', op = 1;
      // entrada
      if (ent === 'desliza') { const u = EZ.io(clamp((t - (b0 - 0.15)) / 0.35)); tr += `translateX(${(1 - u) * W}px) `; }
      if (ent === 'desliza-v') { const u = EZ.io(clamp((t - (b0 - 0.15)) / 0.35)); tr += `translateY(${(1 - u) * H}px) `; }
      if (ent === 'cortina') { const u = EZ.io(clamp((t - (b0 - 0.3)) / 0.4)); tr += `translateY(${(1 - u) * H}px) skewY(${(1 - u) * -5}deg) `; }
      if (ent === 'mergulho') { const u = EZ.out(clamp((t - (b0 - 0.1)) / 0.35)); tr += `scale(${0.55 + 0.45 * u}) `; op = clamp(u * 2.5); }
      // saída (a próxima cena entra por cima)
      if (nx && t >= b1 - 0.4) {
        if (nx.entrada === 'desliza') { const u = EZ.io(clamp((t - (b1 - 0.15)) / 0.35)); tr = `translateX(${-u * W * 0.45}px) ` + tr; }
        if (nx.entrada === 'desliza-v') { const u = EZ.io(clamp((t - (b1 - 0.15)) / 0.35)); tr = `translateY(${-u * H * 0.35}px) ` + tr; }
        if (nx.entrada === 'mergulho') { const u = EZ.in(clamp((t - (b1 - 0.2)) / 0.3)); tr = `scale(${1 + 2.2 * u}) ` + tr; op *= 1 - u; }
      }
      c.el.style.transform = tr; c.el.style.opacity = op;
      const lt = t - b0;
      // a câmera da cena: deriva lenta (nada fica parado)
      c.mundo.style.transformOrigin = '540px 900px';
      if (!['cancelou'].includes(c.id)) c.mundo.style.transform = `scale(${1 + 0.035 * clamp(lt / (b1 - b0), -0.2, 1.2)}) rotate(${Math.sin(lt * 0.9) * 0.6}deg)`;
      animaManchete(c, lt); animaParticulas(c, lt);
      ANIMA[c.id](c, lt, t);
    }
    // a falha digital (entrada da cena 3 e da cena 6) e o clarão dos cortes secos
    const gl = CENAS.filter((c) => c.entrada === 'falha').map((c) => c.t0).find((b) => t >= b - 0.08 && t < b + 0.22);
    GLITCH.style.display = gl != null ? 'block' : 'none';
    if (gl != null) {
      [...GLITCH.children].forEach((d, i) => { const r1 = rnd(Math.floor(t * 60) * 13 + i), r2 = rnd(Math.floor(t * 60) * 7 + i * 3); Object.assign(d.style, { top: r1 * H + 'px', height: 12 + r2 * 70 + 'px', background: i % 3 === 0 ? rgba(C.limao, 0.85) : i % 3 === 1 ? rgba(C.off, 0.6) : rgba(C.preto, 0.9), transform: `translateX(${(r2 - 0.5) * 200}px)` }); });
      const atual = CENAS.find((c) => t >= c.t0 && t < c.t1);
      if (atual) atual.el.style.filter = `drop-shadow(${8 * Math.sin(t * 200)}px 0 0 rgba(255,0,90,.75)) drop-shadow(${-8 * Math.sin(t * 200)}px 0 0 rgba(0,240,255,.75))`;
    }
    CENAS.forEach((c) => { if (gl == null || !(t >= c.t0 && t < c.t1)) c.el.style.filter = ''; });
    const corte = CENAS.filter((c) => c.entrada === 'corte').map((c) => c.t0).find((b) => t >= b && t < b + 0.12);
    const carimbo = kick(t, 21.25, 0.12);
    FLASH.style.opacity = corte != null ? 0.85 * (1 - (t - corte) / 0.12) : 0.25 * carimbo;
    FLASH.style.zIndex = '50'; GLITCH.style.zIndex = '51';
  }

  // ---------------- caixas para o QA ----------------
  function caixas(t) {
    render(t);
    const R0 = ROOT.getBoundingClientRect(), k = R0.width / W, out = [];
    const bx = (e) => { const b = e.getBoundingClientRect(); return { x0: (b.left - R0.left) / k, y0: (b.top - R0.top) / k, x1: (b.right - R0.left) / k, y1: (b.bottom - R0.top) / k }; };
    const visivel = (e) => { let n = e; let op = 1; while (n && n !== ROOT) { const cs = getComputedStyle(n); if (cs.display === 'none') return 0; op *= +cs.opacity; n = n.parentElement; } return op; };
    for (const q of QA) { const op = visivel(q.e); if (op < 0.3) continue; out.push({ cena: q.cena, nome: q.nome, tipo: q.tipo, op, ...bx(q.e) }); }
    // os textos: cada um dentro da sua caixa (o ancestral com fundo), com margem; e textos da mesma caixa sem encostar
    const textos = [];
    const tw = document.createTreeWalker(ROOT, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) {
      const txt = n.textContent.trim(); if (!txt) continue;
      const e = n.parentElement; if (visivel(e) < 0.3) continue;
      const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (!r.width) continue;
      let cx = e, caixa = null;
      while (cx && cx !== ROOT) { const cs = getComputedStyle(cx); if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && !cx.classList.contains('cena') && !cx.classList.contains('fundo')) { caixa = cx; break; } cx = cx.parentElement; }
      const rr = { x0: (r.left - R0.left) / k, y0: (r.top - R0.top) / k, x1: (r.right - R0.left) / k, y1: (r.bottom - R0.top) / k };
      let girado = false; for (let g = e; g && g !== ROOT; g = g.parentElement) { const m = getComputedStyle(g).transform; if (m && m !== 'none') { const v = m.match(/-?[\d.e-]+/g).map(Number); if (Math.abs(v[1]) > 0.02) { girado = true; break; } } }
      textos.push({ txt, ...rr, girado, caixa: caixa ? caixa.className || caixa.tagName : null, cid: caixa ? (caixa.dataset.cid ||= String(Math.random()).slice(2, 8)) : null, ...(caixa ? { cx: bx(caixa) } : {}), selo: !!(e.closest && e.textContent === 'CANCELADO') });
    }
    const ativa = CENAS.find((c) => t >= c.t0 && t < c.t1) || CENAS[CENAS.length - 1];
    return { caixas: out, textos, cena: ativa.id, fundo: ativa.fundo };
  }

  // ---------------- capa: manchete + o copo grande em traço limão + "R$ 22,00" + "?" ----------------
  async function capaGrade() {
    const desenha = (c, DY) => {
      c.fillStyle = C.preto; c.fillRect(0, 0, W, H);
      const g = c.createRadialGradient(540, 1000, 20, 540, 1000, 700); g.addColorStop(0, 'rgba(175,250,39,0.10)'); g.addColorStop(1, 'rgba(175,250,39,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const px = 84, ty = 440 + DY;
      c.textBaseline = 'alphabetic'; c.font = `900 ${px}px ID`; if (c.letterSpacing !== undefined) c.letterSpacing = '-2.1px';
      c.fillStyle = C.off; c.fillText('A caipirinha da piscina', 80, ty + px * 0.82); const w1 = c.measureText('A caipirinha da piscina').width;
      c.fillStyle = C.limao; c.fillText('entrou na conta?', 80, ty + px * 1.80); const w2 = c.measureText('entrou na conta?').width;
      if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
      const caixas = [{ nome: 'manchete', x0: 80, y0: ty, x1: 80 + Math.max(w1, w2), y1: ty + px * 2.0 }];
      // o copo em traço limão (os mesmos traços do vídeo)
      const s = 22, ox = 120, oy = ty + px * 2 + 70;
      c.save(); c.translate(ox, oy); c.scale(s, s); c.strokeStyle = C.limao; c.lineWidth = 14 / s; c.lineCap = 'round'; c.lineJoin = 'round';
      c.shadowColor = rgba(C.limao, 0.35); c.shadowBlur = 30;
      for (const d of [...ICONES.copo.p, ...ICONES.copo.gelo]) c.stroke(new Path2D(d));
      c.restore();
      for (let i = 0; i < 3; i++) { c.save(); c.translate(ox + 11.5 * s + i * 38 - 30, oy + 22.6 * s + i * 30); c.fillStyle = C.limao; c.globalAlpha = 0.9 - i * 0.25; c.beginPath(); c.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      caixas.push({ nome: 'copo', x0: ox + 4 * s, y0: oy + 1.5 * s, x1: ox + 21.5 * s, y1: oy + 22.6 * s + 100 });
      // o "?" e o preço
      c.save(); c.font = "900 330px 'ID'"; c.fillStyle = C.limao; c.shadowColor = rgba(C.limao, 0.55); c.shadowBlur = 50; c.translate(830, oy + 250); c.rotate(8 * Math.PI / 180); c.textAlign = 'center'; c.fillText('?', 0, 110); c.restore();
      caixas.push({ nome: '?', x0: 740, y0: oy + 30, x1: 935, y1: oy + 380 });
      c.font = "700 120px 'Geist Mono'"; if (c.letterSpacing !== undefined) c.letterSpacing = '-4.8px'; c.fillStyle = C.off; c.textAlign = 'left';
      c.fillText(brl(22), 120, oy + 22.6 * s + 228); const wp = c.measureText(brl(22)).width;
      caixas.push({ nome: 'R$ 22,00', x0: 120, y0: oy + 22.6 * s + 128, x1: 120 + wp, y1: oy + 22.6 * s + 252 });
      return { caixas };
    };
    const m = desenha(document.createElement('canvas').getContext('2d'), 0);
    const dy = Math.round(960 - (Math.min(...m.caixas.map((b) => b.y0)) + Math.max(...m.caixas.map((b) => b.y1))) / 2);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const r = desenha(c, dy);
    const bloco = { topo: Math.min(...r.caixas.map((b) => b.y0)), base: Math.max(...r.caixas.map((b) => b.y1)) }; bloco.centro = (bloco.topo + bloco.base) / 2;
    return { png: cv.toDataURL('image/png'), caixas: r.caixas, bloco };
  }

  window.REEL = {
    init, renderAt: render, caixas, capaGrade, get DURATION() { return DUR; },
    avisos: () => [], eventos: () => EV.slice().sort((a, b) => a.t - b.t),
    cenas: () => CENAS.map((c) => ({ id: c.id, t0: c.t0, t1: c.t1, fundo: c.fundo, entrada: c.entrada, manchete: c.manchete ? c.manchete.map((l) => l.join(' ')) : null, realce: c.realce || [] })),
    itens: () => ITENS, totais: () => [TOTAL_1, TOTAL_2],
  };
})();
