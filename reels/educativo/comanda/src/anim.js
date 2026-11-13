/*
 * FAZLO Hospeda — "A caipirinha da piscina entrou na conta?" (9:16, SEM narração).
 *
 * Regra da série: vídeo sem narração não usa telas do app, celular nem recortes do HTML. Tudo aqui são peças gráficas
 * de motion desenhadas para o vídeo (cartões de consumo, etiquetas, um painel de comanda, chips, contador, risco, selo,
 * check), na paleta e na tipografia da marca (preto, off-white e verde-limão; Geist e Geist Mono para valores), com os
 * valores reais da comanda da Mariana Costa (pacote 08-comanda, estados 02 e 04). Os textos de tela usam a tipografia
 * e o estilo da legenda aprovada (Inter Display 900, palavra-chave em limão). Determinístico: REEL.renderAt(t).
 */
(() => {
  const W = 1080, H = 1920;
  const C = { preto: '#0A0A0A', limao: '#AFFA27', off: '#F7F7F2', cinza: '#6B6F68', cinzaC: '#9A9D95', painel: '#121411', borda: 'rgba(247,247,242,0.10)' };
  const CAP = { size: 64, lh: 74, y1: 1442, cx: 540 };          // textos de tela: as linhas da legenda aprovada (y 1442/1516)
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const EZ = { lin: (u) => u, out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u, io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    expo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)), quad: (u) => u * u,
    elastico: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(2, -8 * u) * Math.cos(u * Math.PI * 2.5)),
    back: (u) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); } };
  const ramp = (t, a, b, e = EZ.out) => e(clamp((t - a) / (b - a)));
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));
  const el = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); if (parent) parent.appendChild(e); return e; };
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const brl = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR') + ',00';
  // ícones de linha da marca (marca/icones: comandas e check)
  const ICONE = {
    comanda: '<path d="M13 16H8"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
  };
  const svg = (nome, px, cor, sw = 1.9) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONE[nome]}</svg>`;

  // ---------------- os dados reais da comanda (08-comanda, estados 02 e 04) ----------------
  const ITENS = [
    { id: 'caipirinha', nome: 'Caipirinha', origem: 'Bar da piscina', q: 3, un: 22, q2: 4 },
    { id: 'agua', nome: 'Água sem gás', origem: 'Frigobar', q: 2, un: 6, q2: 4 },
    { id: 'cerveja', nome: 'Cerveja long neck', origem: 'Frigobar', q: 4, un: 14 },
    { id: 'risoto', nome: 'Risoto de cogumelos', origem: 'Restaurante', q: 2, un: 68 },
    { id: 'suco', nome: 'Suco de laranja', origem: 'Frigobar', q: 1, un: 17 },
    { id: 'cancelado', nome: 'Cerveja long neck', origem: 'Frigobar', q: 1, un: 14, cancelado: true },
  ];
  const TOTAL_1 = ITENS.filter((i) => !i.cancelado).reduce((a, i) => a + i.q * i.un, 0);                       // 287
  const TOTAL_2 = ITENS.filter((i) => !i.cancelado).reduce((a, i) => a + (i.q2 || i.q) * i.un, 0);             // 321

  let ROOT, GRAF, CV, CX, FINAL_EL, DUR = 32.01;
  const EV = [];
  const ev = (t, tipo, d = {}) => EV.push({ t: +t.toFixed(3), tipo, ...d });
  const T_ = {};

  // ---------------- textos de tela (o estilo da legenda aprovada) ----------------
  const TEXTOS = [];
  function texto(t0, t1, linhas, chaves = []) { TEXTOS.push({ t0, t1, linhas, chaves: new Set(chaves) }); ev(t0, 'texto'); }

  // ---------------- geometria ----------------
  const CARD = { w: 640, h: 112 };                             // o cartão de consumo (escala 1)
  const PAINEL = { x: 150, y: 236, w: 780, h: 1104, cab: 128, topoCartoes: 384, passo: 124, escCartao: 720 / 640, totalY: 1150 };
  const ETIQ = { bar: { txt: 'Bar da piscina', x: 318, y: 420, rot: -5 }, frigobar: { txt: 'Frigobar', x: 770, y: 640, rot: 4 }, restaurante: { txt: 'Restaurante', x: 330, y: 960, rot: -3 } };
  const slotDe = (i) => ({ cx: 540, cy: PAINEL.topoCartoes + i * PAINEL.passo + CARD.h * PAINEL.escCartao / 2 });

  // ---------------- roteiro (os tempos e os textos da versão aprovada) ----------------
  const POUSA = { caipirinha: 9.85, agua: 10.25, cerveja: 10.75, risoto: 11.15, suco: 11.55, cancelado: 12.05 };
  function monta() {
    texto(0, 3.6, ['A caipirinha da piscina', 'entrou na conta?'], ['entrou', 'na', 'conta?']);
    T_.gancho = { fim: 3.6 }; ev(0.9, 'pulso'); ev(2.2, 'pulso');
    T_.dor = { etiq: 3.7, escapa: 6.7 };
    texto(3.65, 5.75, ['Bar, frigobar, restaurante…']);
    texto(5.75, 9.05, ['e cada um anota', 'de um jeito.'], ['cada', 'um', 'anota']);
    ev(3.7, 'etiqueta'); ev(3.9, 'voo'); ev(T_.dor.escapa, 'queda');
    // 3 · a comanda gráfica
    T_.painel = 9.1; ev(T_.painel, 'painel');
    texto(9.45, 11.6, ['No FAZLO Hospeda,']);
    texto(11.6, 15.2, ['tudo cai na comanda', 'do hóspede.'], ['comanda', 'do', 'hóspede.']);
    for (const [k, t] of Object.entries(POUSA)) ev(t, 'aterra', { id: k });
    ev(10.2, 'voo'); ev(10.35, 'voo');
    T_.contaPop = 12.55; ev(T_.contaPop, 'pulso');
    // 4 · lançou, somou
    T_.chip1 = { t0: 15.6, bate: 16.25, id: 'caipirinha', txt: '+1 Caipirinha' };
    T_.chip2 = { t0: 16.7, bate: 17.35, id: 'agua', txt: '+2 Água sem gás' };
    ev(T_.chip1.t0, 'voo'); ev(T_.chip1.bate, 'troca'); ev(T_.chip2.t0, 'voo'); ev(T_.chip2.bate, 'troca');
    T_.conta2 = { t0: 17.9, t1: 18.9 }; ev(T_.conta2.t0, 'conta', { dur: 1.0 }); ev(T_.conta2.t1, 'pulso');
    texto(15.25, 23.95, ['Lançou, somou.'], ['somou.']);
    // 5 · cancelou? continua registrado
    T_.risco = 24.45; T_.selo = 24.95; ev(T_.risco, 'risco'); ev(T_.selo, 'selo');
    texto(23.95, 26.9, ['Cancelou?', 'Continua registrado.'], ['Continua', 'registrado.']);
    // 6 · a pilha se fecha no total; check; a marca
    T_.fecha = 27.4; T_.check = 28.6; T_.logo = 30.66;
    ev(T_.fecha, 'fecha'); ev(T_.check, 'check'); ev(T_.logo, 'logo');
    texto(27.07, 31.26, ['No check-out,', 'a conta já está pronta.'], ['já', 'está', 'pronta.']);
    DUR = 32.01;
  }

  // ---------------- DOM ----------------
  const CARTOES = {};
  let PAINEL_EL, CONT_EL, CONT_LBL, ETIQ_EL = {}, Q_EL, CHIP_EL = {}, TOTAL_EL, LOGO;
  function cartao(it) {
    const d = el('div', 'cartao', GRAF, { position: 'absolute', left: 0, top: 0, width: CARD.w + 'px', height: CARD.h + 'px', borderRadius: '26px', background: C.off, transformOrigin: '50% 50%', display: 'none', boxSizing: 'border-box', overflow: 'hidden' });
    el('div', null, d, { position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', background: C.limao });                        // a marca de consumo (filete limão)
    const nome = el('div', null, d, { position: 'absolute', left: '34px', top: '19px', font: "600 32px 'Geist'", letterSpacing: '-0.01em', color: C.preto, whiteSpace: 'nowrap' }); nome.textContent = it.nome;
    const sub = el('div', null, d, { position: 'absolute', left: '34px', top: '66px', height: '28px', font: "500 22px 'Geist'", color: C.cinza, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '10px' });
    el('span', null, sub, { width: '9px', height: '9px', borderRadius: '50%', background: C.limao, boxShadow: '0 0 0 2px rgba(10,10,10,.08)' });
    const org = el('span', null, sub); org.textContent = it.origem;
    const qtd = el('span', null, sub, { position: 'relative', display: 'inline-block', height: '28px', overflow: 'hidden', font: "500 22px 'Geist Mono'", lineHeight: '28px', minWidth: '220px' });
    const q1 = el('span', null, qtd, { position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap' }), q2 = el('span', null, qtd, { position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap' });
    const val = el('div', null, d, { position: 'absolute', right: '30px', top: '30px', height: '48px', width: '240px', overflow: 'hidden', font: "600 34px 'Geist Mono'", lineHeight: '48px', color: C.preto, textAlign: 'right' });
    const v1 = el('div', null, val, { position: 'absolute', right: 0, top: 0, whiteSpace: 'nowrap' }), v2 = el('div', null, val, { position: 'absolute', right: 0, top: 0, whiteSpace: 'nowrap' });
    const risco = el('div', null, d, { position: 'absolute', left: '30px', top: '38px', height: '4px', width: '0px', background: C.preto, borderRadius: '2px' });
    const risco2 = el('div', null, d, { position: 'absolute', right: '30px', top: '52px', height: '4px', width: '0px', background: C.preto, borderRadius: '2px' });
    const selo = el('div', null, d, { position: 'absolute', right: '286px', top: '30px', height: '50px', padding: '0 18px', borderRadius: '999px', border: `3px solid ${C.preto}`, font: "700 22px 'Geist'", letterSpacing: '0.04em', textTransform: 'uppercase', color: C.preto, display: 'none', alignItems: 'center', boxSizing: 'border-box', background: C.off });
    selo.textContent = 'Cancelado';
    const pulso = el('div', null, d, { position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none' });
    CARTOES[it.id] = { it, d, nome, org, q1, q2, v1, v2, risco, risco2, selo, pulso };
  }
  async function init(root) {
    ROOT = root;
    el('div', 'fundo', ROOT, { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 980px 1200px at 540px 820px, #191B17 0%, #0C0D0B 58%, #060606 100%)' });
    el('div', 'luz', ROOT, { position: 'absolute', left: '-160px', top: '200px', width: '1400px', height: '1300px', background: 'radial-gradient(circle at 50% 42%, rgba(175,250,39,0.07), rgba(175,250,39,0) 62%)' });
    GRAF = el('div', 'graficos', ROOT, { position: 'absolute', inset: 0, perspective: '1600px', perspectiveOrigin: '540px 760px' });
    // o painel da comanda (cena 3)
    PAINEL_EL = el('div', 'comanda', GRAF, { position: 'absolute', left: PAINEL.x + 'px', top: PAINEL.y + 'px', width: PAINEL.w + 'px', height: PAINEL.h + 'px', borderRadius: '40px', background: `linear-gradient(180deg, #171A15, ${C.painel})`, border: `2px solid ${C.borda}`, boxSizing: 'border-box', display: 'none', transformOrigin: '50% 50%', boxShadow: '0 50px 120px rgba(0,0,0,.65)' });
    const cab = el('div', null, PAINEL_EL, { position: 'absolute', left: '40px', right: '40px', top: '34px', height: '70px', display: 'flex', alignItems: 'center', gap: '22px' });
    const ic = el('div', null, cab, { width: '64px', height: '64px', borderRadius: '18px', background: rgba(C.limao, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }); ic.innerHTML = svg('comanda', 34, C.limao);
    const tt = el('div', null, cab);
    const n1 = el('div', null, tt, { font: "700 38px 'Geist'", letterSpacing: '-0.015em', color: C.off, lineHeight: '42px' }); n1.textContent = 'Mariana Costa';
    const n2 = el('div', null, tt, { font: "500 24px 'Geist'", color: C.cinzaC, lineHeight: '30px' }); n2.textContent = 'Suíte Mirante';
    el('div', null, PAINEL_EL, { position: 'absolute', left: '40px', right: '40px', top: PAINEL.cab + 'px', height: '2px', background: C.borda });
    el('div', null, PAINEL_EL, { position: 'absolute', left: '40px', right: '40px', top: (PAINEL.totalY - PAINEL.y - 36) + 'px', height: '2px', background: C.borda });
    CONT_LBL = el('div', null, PAINEL_EL, { position: 'absolute', left: '44px', top: (PAINEL.totalY - PAINEL.y + 30) + 'px', font: "600 32px 'Geist'", color: C.cinzaC }); CONT_LBL.textContent = 'Total';
    CONT_EL = el('div', null, PAINEL_EL, { position: 'absolute', right: '44px', top: (PAINEL.totalY - PAINEL.y - 4) + 'px', font: "700 82px 'Geist Mono'", letterSpacing: '-0.03em', color: C.limao, transformOrigin: '100% 60%', whiteSpace: 'nowrap', textShadow: `0 0 30px ${rgba(C.limao, 0.25)}` });
    // as etiquetas
    for (const [k, e] of Object.entries(ETIQ)) {
      const d = el('div', 'etiqueta', GRAF, { position: 'absolute', left: 0, top: 0, height: '76px', padding: '0 34px 0 28px', borderRadius: '999px', border: `2px solid ${rgba(C.off, 0.85)}`, background: 'rgba(14,16,13,0.9)', display: 'none', alignItems: 'center', gap: '16px', font: "600 32px 'Geist'", color: C.off, whiteSpace: 'nowrap', boxSizing: 'border-box', boxShadow: '0 18px 50px rgba(0,0,0,.55)' });
      el('span', null, d, { width: '14px', height: '14px', borderRadius: '50%', background: C.limao, boxShadow: `0 0 16px ${C.limao}` }); el('span', null, d).textContent = e.txt;
      ETIQ_EL[k] = d;
    }
    for (const it of ITENS) cartao(it);
    // o "?" do gancho
    Q_EL = el('div', 'interrogacao', GRAF, { position: 'absolute', left: 0, top: 0, font: "900 240px 'ID'", color: C.limao, display: 'none' }); Q_EL.textContent = '?';
    // os chips "+1 Caipirinha" e "+2 Água sem gás"
    // o cartão final do total
    TOTAL_EL = el('div', 'total-final', GRAF, { position: 'absolute', left: '150px', top: '0px', width: '780px', height: '360px', borderRadius: '44px', background: C.off, display: 'none', transformOrigin: '50% 50%', boxShadow: '0 50px 120px rgba(0,0,0,.6)', overflow: 'hidden' });
    el('div', null, TOTAL_EL, { position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', background: C.limao });
    const tl = el('div', null, TOTAL_EL, { position: 'absolute', left: '60px', top: '64px', font: "600 40px 'Geist'", color: C.cinza }); tl.textContent = 'Total';
    const tv = el('div', null, TOTAL_EL, { position: 'absolute', left: '56px', top: '128px', font: "700 128px 'Geist Mono'", letterSpacing: '-0.04em', color: C.preto, whiteSpace: 'nowrap' }); tv.textContent = brl(TOTAL_2);
    const ck = el('div', null, TOTAL_EL, { position: 'absolute', right: '56px', top: '56px', width: '104px', height: '104px', borderRadius: '50%', background: C.limao, display: 'flex', alignItems: 'center', justifyContent: 'center', transformOrigin: '50% 50%' }); ck.innerHTML = svg('check', 60, C.preto, 2.6);
    T_.dom = { ck };
    FINAL_EL = el('div', 'final', ROOT, { position: 'absolute', inset: 0 });
    CV = el('canvas', 'textos', ROOT, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px' }); CV.width = W; CV.height = H; CX = CV.getContext('2d');
    monta();
    for (const c of [T_.chip1, T_.chip2]) {
      const d = el('div', 'chip', GRAF, { position: 'absolute', left: 0, top: 0, height: '78px', padding: '0 34px', borderRadius: '999px', background: C.limao, color: C.preto, font: "700 34px 'Geist'", display: 'none', alignItems: 'center', whiteSpace: 'nowrap', boxSizing: 'border-box', boxShadow: `0 20px 50px rgba(0,0,0,.5), 0 0 40px ${rgba(C.limao, 0.35)}` });
      d.textContent = c.txt; CHIP_EL[c.id] = d;
    }
    LOGO = el('img', null, FINAL_EL, { position: 'absolute', left: '540px', top: '1060px', width: '560px', transform: 'translateX(-50%)', display: 'none' }); LOGO.src = 'logo.png'; LOGO.decoding = 'sync';
    await Promise.all([...ROOT.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
  }

  // ---------------- poses ----------------
  // a posição livre de cada cartão (cenas 1–3, antes de encaixar no painel): o movimento da versão aprovada
  const ESC_LIVRE = 0.78;
  function livre(id, t) {
    const g = T_.gancho, D = T_.dor;
    if (id === 'caipirinha') {
      const u = ramp(t, g.fim - 0.25, g.fim + 0.6, EZ.io);
      return { cx: lerp(540, 300 + Math.sin(t * 1.3) * 26, u), cy: lerp(780 + Math.sin(t * 1.6) * 8, 590 + Math.cos(t * 1.1) * 18, u), s: lerp(1.3, ESC_LIVRE, u),
        ry: lerp(Math.sin(t * 1.4) * 16, Math.sin(t * 2) * 6, u), rx: lerp(7 + Math.sin(t * 1.1) * 3, 4, u), rz: lerp(-2, -6, u), op: 1 };
    }
    if (id === 'suco' || id === 'cancelado') {
      const ap = id === 'suco' ? 10.2 : 10.35, u = ramp(t, ap, ap + 0.5, EZ.out);
      return { cx: lerp(1350, 840, u), cy: ETIQ.frigobar.y - 140, s: ESC_LIVRE, ry: -12, rx: 4, rz: lerp(14, 4, u), op: t >= ap ? 1 : 0 };
    }
    const ap = { agua: 3.9, cerveja: 4.05, risoto: 4.2 }[id];
    const ent = ramp(t, ap, ap + 0.5, EZ.out);
    const P_ = { agua: [[780, 820], [520, 560], [800, 380]], cerveja: [[260, 760], [720, 880], [480, 300]], risoto: [[620, 1120], [320, 1180], [600, 820]] }[id];
    const k = Math.max(0, t - ap) * 0.42, i = Math.floor(k) % 3, f = EZ.io(k - Math.floor(k));
    let cx = lerp(P_[i][0], P_[(i + 1) % 3][0], f) + Math.sin(t * 2.1 + ap) * 22, cy = lerp(P_[i][1], P_[(i + 1) % 3][1], f) + Math.cos(t * 1.7) * 16;
    let rz = Math.sin(t * 1.5 + ap * 3) * 8;
    if (id === 'cerveja') {
      // a cerveja escapa e cai para fora do quadro pela esquerda; volta pela esquerda quando a comanda aparece
      const q = clamp((t - D.escapa) / 1.0), qv = clamp((t - (POUSA.cerveja - 1.1)) / 0.6);
      if (t >= D.escapa && t < POUSA.cerveja - 1.1) { const x0 = cx, y0 = cy; cx = lerp(x0, -520, EZ.quad(q)); cy = y0 + 420 * EZ.quad(q) - 120 * Math.sin(q * Math.PI); rz -= 75 * q; }
      if (t >= POUSA.cerveja - 1.1) { cx = lerp(-480, 220, EZ.out(qv)); cy = lerp(1150, 860, EZ.out(qv)); rz = lerp(-40, -4, EZ.out(qv)); }
    }
    return { cx, cy: Math.min(cy, 1240), s: ESC_LIVRE * (0.8 + 0.2 * ent), ry: Math.sin(t * 1.2 + ap) * 10, rx: 5, rz, op: t >= ap ? ent : 0 };
  }
  // a pose do cartão em cada instante
  function pose(id, t) {
    const i = ITENS.findIndex((x) => x.id === id), slot = slotDe(i), tp = POUSA[id];
    const enc = { cx: slot.cx, cy: slot.cy, s: PAINEL.escCartao, rx: 0, ry: 0, rz: 0, op: 1 };
    let p;
    if (t < tp - 0.55) p = livre(id, t);
    else if (t < tp) { const a = livre(id, tp - 0.55), u = EZ.io(clamp((t - (tp - 0.55)) / 0.55)); p = {}; for (const k in enc) p[k] = lerp(a[k], enc[k], u); }
    else p = { ...enc };
    // o encaixe: um pulso; a cena 6: a pilha sobe e se fecha no total
    if (t >= T_.fecha) {
      const u = EZ.in(clamp((t - T_.fecha - i * 0.04) / 0.5));
      p.cy = lerp(p.cy, 740, u); p.s = lerp(p.s, 0.7, u); p.op = 1 - clamp((u - 0.45) / 0.4);
    }
    return p;
  }
  function aplica(d, p, extra = 1) {
    d.style.transform = `translate(${p.cx - CARD.w / 2}px, ${p.cy - CARD.h / 2}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s * extra})`;
    d.style.opacity = p.op; d.style.display = p.op > 0.005 ? 'block' : 'none';
    d.style.boxShadow = `0 ${26 * p.s}px ${64 * p.s}px rgba(0,0,0,.55)`;
  }

  // ---------------- render ----------------
  function renderAt(t) {
    const g = T_.gancho, D = T_.dor;
    // o "?"
    const qv = t < g.fim + 0.3; Q_EL.style.display = qv ? 'block' : 'none';
    if (qv) { const pul = 1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 5.5)); Q_EL.style.opacity = 1 - ramp(t, g.fim - 0.1, g.fim + 0.3); Q_EL.style.transform = `translate(780px, 440px) rotate(8deg) scale(${pul})`; Q_EL.style.textShadow = `0 0 ${30 + 300 * (pul - 1)}px ${rgba(C.limao, 0.6)}`; }
    // as etiquetas (somem quando a comanda abre; o suco e a cerveja cancelada entram pela direita)
    const sumir = ramp(t, 9.0, 9.6, EZ.in);
    Object.entries(ETIQ).forEach(([k, e], j) => {
      const d = ETIQ_EL[k], vis = t >= D.etiq && sumir < 1; d.style.display = vis ? 'flex' : 'none'; if (!vis) return;
      const a = ramp(t, D.etiq + j * 0.12, D.etiq + 0.45 + j * 0.12, EZ.back);
      const w = d.offsetWidth, h = 76;
      d.style.transform = `translate(${e.x - w / 2}px, ${e.y - h / 2 + Math.sin(t * 1.3 + e.x) * 6}px) rotate(${e.rot}deg) scale(${a * (1 - 0.4 * sumir)})`;
      d.style.opacity = clamp(a) * (1 - sumir);
    });
    // o painel da comanda
    const pa = ramp(t, T_.painel, T_.painel + 0.55, EZ.back), pf = ramp(t, T_.fecha + 0.25, T_.fecha + 0.65, EZ.in);
    PAINEL_EL.style.display = t >= T_.painel && pf < 1 ? 'block' : 'none';
    PAINEL_EL.style.opacity = clamp(pa * 1.4) * (1 - pf);
    PAINEL_EL.style.transform = `translateY(${(1 - clamp(pa)) * 60}px) scale(${(0.92 + 0.08 * pa) * (1 - 0.1 * pf)})`;
    // o contador do total: soma a cada encaixe (o cancelado não entra na soma); depois conta de 287 até 321
    let tot = 0;
    for (const it of ITENS) { if (it.cancelado) continue; const tp = POUSA[it.id]; tot += it.q * it.un * EZ.out(clamp((t - tp) / 0.35)); }
    if (t >= T_.conta2.t0) tot = lerp(TOTAL_1, TOTAL_2, EZ.io(clamp((t - T_.conta2.t0) / (T_.conta2.t1 - T_.conta2.t0))));
    CONT_EL.textContent = brl(tot);
    const pop = 1 + 0.12 * kick(t, T_.contaPop, 0.5) + 0.16 * kick(t, T_.conta2.t1, 0.5) + 0.05 * Math.max(...ITENS.map((it) => (it.cancelado ? 0 : kick(t, POUSA[it.id], 0.3))));
    CONT_EL.style.transform = `scale(${pop})`;
    // os cartões
    for (const it of ITENS) {
      const K = CARTOES[it.id], p = pose(it.id, t), tp = POUSA[it.id];
      if (t < (it.id === 'caipirinha' ? 0 : it.id === 'suco' ? 10.2 : it.id === 'cancelado' ? 10.35 : { agua: 3.9, cerveja: 4.05, risoto: 4.2 }[it.id])) { K.d.style.display = 'none'; continue; }
      aplica(K.d, p, 1 + 0.05 * kick(t, tp, 0.35));
      K.d.style.zIndex = t < tp ? 20 : 10;
      // conteúdo: o gancho mostra o preço da Caipirinha (R$ 22,00); no painel, quantidade × preço e o valor da linha
      const gancho = it.id === 'caipirinha' && t < tp;
      const chip = it.id === T_.chip1.id ? T_.chip1 : it.id === T_.chip2.id ? T_.chip2 : null;
      const fu = chip ? EZ.io(clamp((t - chip.bate) / 0.35)) : 0;
      const qa = `${it.q} × ${brl(it.un)}`, qb = it.q2 ? `${it.q2} × ${brl(it.un)}` : qa;
      const va = brl(it.q * it.un), vb = it.q2 ? brl(it.q2 * it.un) : va;
      K.q1.textContent = gancho ? '' : qa; K.q2.textContent = gancho ? '' : qb;
      K.org.textContent = it.origem + (gancho ? '' : ' ·');
      K.v1.textContent = gancho ? brl(it.un) : va; K.v2.textContent = vb;
      K.q1.style.transform = `translateY(${-100 * fu}%)`; K.q1.style.opacity = 1 - fu; K.q2.style.transform = `translateY(${100 * (1 - fu)}%)`; K.q2.style.opacity = it.q2 ? fu : 0;
      K.v1.style.transform = `translateY(${-100 * fu}%)`; K.v1.style.opacity = 1 - fu; K.v2.style.transform = `translateY(${100 * (1 - fu)}%)`; K.v2.style.opacity = it.q2 ? fu : 0;
      K.v1.style.color = K.v2.style.color = it.cancelado ? C.cinzaC : C.preto;
      // o pulso do encaixe e da troca
      const pk = Math.max(kick(t, tp, 0.5), chip ? kick(t, chip.bate, 0.6) : 0);
      K.pulso.style.boxShadow = `inset 0 0 0 ${3 + 3 * pk}px ${rgba(C.limao, 0.15 + 0.85 * pk)}`;
      // o cancelado: o risco e o selo; o cartão fica na pilha
      if (it.cancelado) {
        const ru = EZ.io(clamp((t - T_.risco) / 0.45)), su = EZ.back(clamp((t - T_.selo) / 0.4));
        K.risco.style.width = (K.nome.offsetWidth + 8) * ru + 'px';
        K.risco2.style.width = 130 * clamp((t - T_.risco - 0.2) / 0.35) + 'px';
        K.d.style.background = t >= T_.risco ? `linear-gradient(0deg, ${rgba('#E9E9E3', ru)}, ${rgba('#E9E9E3', ru)}), ${C.off}` : C.off;
        K.nome.style.color = ru > 0.5 ? '#5E5E5A' : C.preto;
        K.selo.style.display = t >= T_.selo ? 'flex' : 'none'; K.selo.style.transform = `scale(${su}) rotate(${-6 * su}deg)`; K.selo.style.opacity = clamp(su);
      }
    }
    // os chips "+1 Caipirinha" e "+2 Água sem gás": entram voando e batem no cartão
    for (const c of [T_.chip1, T_.chip2]) {
      const d = CHIP_EL[c.id], vis = t >= c.t0 && t < c.bate + 0.45; d.style.display = vis ? 'flex' : 'none'; if (!vis) continue;
      const alvo = slotDe(ITENS.findIndex((x) => x.id === c.id)), u = EZ.in(clamp((t - c.t0) / (c.bate - c.t0))), w = d.offsetWidth;
      const x0 = c.id === 'caipirinha' ? 1300 : -400, y0 = alvo.cy + 40;
      const cx = lerp(x0, alvo.cx + 120, u), cy = lerp(y0, alvo.cy - 46, u) - Math.sin(u * Math.PI) * 60, sai = ramp(t, c.bate, c.bate + 0.45, EZ.out);
      d.style.transform = `translate(${cx - w / 2}px, ${cy - 39 - sai * 40}px) rotate(${lerp(c.id === 'caipirinha' ? 14 : -14, 0, u)}deg) scale(${1 + 0.25 * sai})`;
      d.style.opacity = 1 - sai; d.style.zIndex = 30;
    }
    // o cartão final do total, com o check
    const fa = ramp(t, T_.fecha + 0.6, T_.fecha + 1.15, EZ.back);
    TOTAL_EL.style.display = t >= T_.fecha + 0.6 ? 'block' : 'none';
    if (t >= T_.fecha + 0.6) {
      const sobe = ramp(t, T_.logo - 0.6, T_.logo + 0.2, EZ.io);
      TOTAL_EL.style.transform = `translateY(${lerp(560, 520, sobe) - 0 + (1 - clamp(fa)) * 40}px) scale(${(0.85 + 0.15 * fa) * (1 + 0.04 * kick(t, T_.check, 0.5))})`;
      TOTAL_EL.style.opacity = clamp(fa * 1.3); TOTAL_EL.style.zIndex = 40;
      const cu = EZ.back(clamp((t - T_.check) / 0.45)); T_.dom.ck.style.transform = `scale(${cu})`; T_.dom.ck.style.boxShadow = `0 0 ${40 * kick(t, T_.check, 0.8) + 10}px ${rgba(C.limao, 0.7)}`;
    }
    // a marca
    LOGO.style.display = t >= T_.logo ? 'block' : 'none';
    if (t >= T_.logo) { const a = ramp(t, T_.logo, T_.logo + 0.5, EZ.out); LOGO.style.opacity = a; LOGO.style.transform = `translateX(-50%) translateY(${(1 - a) * 24}px) scale(${0.92 + 0.08 * EZ.elastico(clamp((t - T_.logo) / 0.6))})`; }
    textos(t);
  }

  // ---------------- textos: a tipografia da legenda ----------------
  let BOXES = null;
  function tw(s) { CX.font = `900 ${CAP.size}px 'ID'`; CX.letterSpacing = `${-0.02 * CAP.size}px`; return CX.measureText(s).width + 0.02 * CAP.size; }
  function textos(t) {
    const c = CX; c.clearRect(0, 0, W, H);
    for (const T of TEXTOS) {
      if (t < T.t0 || t >= T.t1) continue;
      const sai = ramp(t, T.t1 - 0.2, T.t1, EZ.in);
      const y0 = CAP.y1 + (T.linhas.length === 1 ? CAP.lh / 2 : 0), ls = -0.02 * CAP.size;
      c.save(); c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 16; c.shadowOffsetY = 2;
      let k = 0;
      T.linhas.forEach((ln, ri) => {
        let x = CAP.cx - tw(ln) / 2;
        ln.split(' ').forEach((w) => {
          const tw0 = T.t0 + 0.1 + k * 0.075; k++;
          const ww = tw(w) - 0.02 * CAP.size;
          if (t >= tw0) {
            const u = EZ.out(clamp((t - tw0) / 0.12)), chave = T.chaves.has(w);
            const pop = chave ? 1 + 0.07 * kick(t, tw0, 0.18) : 1, y = y0 + ri * CAP.lh + (1 - u) * 10 + sai * 8;
            c.save(); c.font = `900 ${CAP.size}px 'ID'`; c.letterSpacing = `${ls}px`; c.globalAlpha = u * (1 - sai); c.fillStyle = chave ? C.limao : '#FFFFFF';
            c.translate(x + ww / 2, y - CAP.size * 0.3); c.scale(pop, pop); c.fillText(w, -ww / 2, CAP.size * 0.3); c.restore();
            if (BOXES && u > 0.99 && sai < 0.01) BOXES.push({ nome: w, tipo: 'texto', x0: x, y0: y - CAP.size * 0.76, x1: x + ww, y1: y + CAP.size * 0.22 });
          }
          x += tw(w + ' ') - 0.02 * CAP.size;
        });
      });
      c.restore();
    }
  }

  // caixas do quadro para o QA
  function caixas(t) {
    renderAt(t);
    const R0 = ROOT.getBoundingClientRect(), k = R0.width / W, out = [];
    const bx = (e) => { const b = e.getBoundingClientRect(); return { x0: (b.left - R0.left) / k, y0: (b.top - R0.top) / k, x1: (b.right - R0.left) / k, y1: (b.bottom - R0.top) / k }; };
    const add = (nome, tipo, e) => { if (!e || e.style.display === 'none') return; const op = e.style.opacity === '' ? 1 : +e.style.opacity; if (op < 0.05) return; out.push({ nome, tipo, ...bx(e), op }); };
    for (const it of ITENS) add(it.id, 'cartao', CARTOES[it.id].d);
    for (const k2 in ETIQ_EL) add(k2, 'etiqueta', ETIQ_EL[k2]);
    for (const k2 in CHIP_EL) add(k2, 'chip', CHIP_EL[k2]);
    add('comanda', 'painel', PAINEL_EL); add('total', 'total', TOTAL_EL); add('?', 'grafico', Q_EL); add('marca', 'marca', LOGO);
    BOXES = []; textos(t); out.push(...BOXES); BOXES = null;
    const card = (id) => { const K = CARTOES[id]; return { q: K.q2.style.opacity > 0.5 ? K.q2.textContent : K.q1.textContent, v: K.v2.style.opacity > 0.5 ? K.v2.textContent : K.v1.textContent, cancelado: K.selo.style.display === 'flex' }; };
    return { caixas: out, contador: CONT_EL.textContent, cartoes: Object.fromEntries(ITENS.map((it) => [it.id, card(it.id)])) };
  }

  // ---------------- capa: o cartão da Caipirinha grande, o "?" e dois cartões ao fundo ----------------
  async function capaGrade() {
    const desenhaCartao = (c, it, cx, cy, s, rot, ap = 1, comQtd = true) => {
      c.save(); c.translate(cx, cy); c.rotate(rot * Math.PI / 180); c.scale(s, s); c.globalAlpha = ap;
      const w = CARD.w, h = CARD.h;
      c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 60 / s; c.shadowOffsetY = 26 / s;
      c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 26); c.fillStyle = C.off; c.fill(); c.shadowColor = 'transparent';
      c.save(); c.clip(); c.fillStyle = C.limao; c.fillRect(-w / 2, -h / 2, 8, h); c.restore();
      c.textBaseline = 'alphabetic';
      c.font = "600 32px 'Geist'"; c.fillStyle = C.preto; if (c.letterSpacing !== undefined) c.letterSpacing = '-0.3px'; c.fillText(it.nome, -w / 2 + 34, -h / 2 + 50);
      if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
      c.beginPath(); c.arc(-w / 2 + 38, -h / 2 + 80, 4.5, 0, Math.PI * 2); c.fillStyle = C.limao; c.fill();
      c.font = "500 22px 'Geist'"; c.fillStyle = C.cinza; const o = it.origem + (comQtd ? ' ·' : ''); c.fillText(o, -w / 2 + 53, -h / 2 + 88);
      if (comQtd) { const ow = c.measureText(o + ' ').width; c.font = "500 22px 'Geist Mono'"; c.fillText(`${it.q} × ${brl(it.un)}`, -w / 2 + 53 + ow, -h / 2 + 88); }
      c.font = "600 34px 'Geist Mono'"; c.fillStyle = C.preto; c.textAlign = 'right'; c.fillText(comQtd ? brl(it.q * it.un) : brl(it.un), w / 2 - 30, 12); c.textAlign = 'left';
      c.restore();
    };
    const desenha = (c, DY) => {
      const g = c.createRadialGradient(540, 980, 40, 540, 980, 1200); g.addColorStop(0, '#191B17'); g.addColorStop(0.58, '#0C0D0B'); g.addColorStop(1, '#060606'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const luz = c.createRadialGradient(560, 1020, 10, 560, 1020, 620); luz.addColorStop(0, 'rgba(175,250,39,0.10)'); luz.addColorStop(1, 'rgba(175,250,39,0)'); c.fillStyle = luz; c.fillRect(0, 0, W, H);
      const TIT = { px: 84 }, ty = 440 + DY;
      c.textBaseline = 'alphabetic'; c.font = `900 ${TIT.px}px ID`; if (c.letterSpacing !== undefined) c.letterSpacing = '-2.1px';
      c.fillStyle = C.off; c.fillText('A caipirinha da piscina', 90, ty + TIT.px * 0.82); const w1 = c.measureText('A caipirinha da piscina').width;
      c.fillStyle = C.limao; c.fillText('entrou na conta?', 90, ty + TIT.px * 1.84); const w2 = c.measureText('entrou na conta?').width;
      if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
      const caixas = [{ nome: 'título', x0: 90, y0: ty, x1: 90 + Math.max(w1, w2), y1: ty + TIT.px * 2.05 }];
      const base = ty + TIT.px * 2.05 + 56;
      // a caixa de um cartão girado (para a revisão da capa)
      const ext = (cx, cy, sc, rot) => { const r = Math.abs(rot) * Math.PI / 180, hw = CARD.w * sc / 2, hh = CARD.h * sc / 2, ex = hw * Math.cos(r) + hh * Math.sin(r), ey = hw * Math.sin(r) + hh * Math.cos(r); return { x0: cx - ex, y0: cy - ey, x1: cx + ex, y1: cy + ey }; };
      const P_ = [[ITENS[3], 600, base + 120, 1.08, 6, 0.5, 2], [ITENS[1], 470, base + 696, 1.1, -7, 0.62, 1.4], [ITENS[0], 530, base + 430, 1.34, -4, 1, 0]];
      const bs = [];
      // ao fundo, com profundidade: Risoto de cogumelos e Água sem gás, mais escuros e desfocados
      for (const [it, x, y, sc, rot, ap, bl] of P_) {
        c.save(); if (bl) c.filter = `blur(${bl}px)`; desenhaCartao(c, it, x, y, sc, rot, ap, it.id !== 'caipirinha'); c.restore();
        bs.push(ext(x, y, sc, rot));
      }
      // o "?" pulsando, entre o fundo e o cartão da Caipirinha
      const qx = 880, qy = base + 300;
      c.save(); c.translate(qx, qy); c.rotate(8 * Math.PI / 180); c.font = "900 210px 'ID'"; c.fillStyle = C.limao; c.shadowColor = rgba(C.limao, 0.6); c.shadowBlur = 40; c.textAlign = 'center'; c.fillText('?', 0, 74); c.restore();
      bs.push({ x0: qx - 70, y0: qy - 90, x1: qx + 70, y1: qy + 90 });
      caixas.push({ nome: 'cartões', x0: Math.min(...bs.map((b) => b.x0)), y0: Math.min(...bs.map((b) => b.y0)), x1: Math.max(...bs.map((b) => b.x1)), y1: Math.max(...bs.map((b) => b.y1)) });
      return { caixas };
    };
    const m = desenha(document.createElement('canvas').getContext('2d'), 0);
    const dy = Math.round(960 - (Math.min(...m.caixas.map((b) => b.y0)) + Math.max(...m.caixas.map((b) => b.y1))) / 2);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const r = desenha(c, dy), cx = r.caixas;
    const bloco = { topo: Math.min(...cx.map((b) => b.y0)), base: Math.max(...cx.map((b) => b.y1)) }; bloco.centro = (bloco.topo + bloco.base) / 2;
    return { png: cv.toDataURL('image/png'), caixas: cx, bloco };
  }

  window.REEL = {
    init, renderAt, caixas, capaGrade, get DURATION() { return DUR; },
    avisos: () => [], eventos: () => EV.slice().sort((a, b) => a.t - b.t),
    textos: () => TEXTOS.map((x) => ({ t0: x.t0, t1: x.t1, linhas: x.linhas, chaves: [...x.chaves] })),
    itens: () => ITENS, pousa: () => POUSA, totais: () => [TOTAL_1, TOTAL_2], T: () => T_,
  };
})();
