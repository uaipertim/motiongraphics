/* Utilidades comuns: DOM, tempos da narração, ícones de linha, eventos de som. */
(function () {
  const W = 1080, H = 1920;
  const COR = {
    tinta: '#0A0A0A', limao: '#AFFA27', branco: '#F4F4F0', ambar: '#E8A317',
    cinza: '#8C8C85', cinza2: '#5E5E5A', grafite: '#1A1A18', grafite2: '#262624',
    ambarFundo: '#FFF7E3', ambarTexto: '#8A5A00', ambarTitulo: '#5A4000', limaoTexto: '#2A3A00',
  };

  /* ---------- DOM ---------- */
  function h(tag, attrs, filhos) {
    const e = document.createElement(tag);
    aplicarAttrs(e, attrs);
    anexar(e, filhos);
    return e;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, filhos) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) {
      if (k === 'style') e.setAttribute('style', attrs[k]); else e.setAttribute(k, attrs[k]);
    }
    anexar(e, filhos);
    return e;
  }
  function aplicarAttrs(e, attrs) {
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v);
    }
  }
  function anexar(e, filhos) {
    if (filhos == null) return;
    (Array.isArray(filhos) ? filhos : [filhos]).forEach((f) => {
      if (f == null) return;
      e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
    });
  }
  /** Caixa absoluta (x, y = canto) */
  function caixa(pai, x, y, w, hh, extra, cls) {
    const e = h('div', { class: cls || '', style: `position:absolute;left:${x}px;top:${y}px;` + (w != null ? `width:${w}px;` : '') + (hh != null ? `height:${hh}px;` : '') + (extra || '') });
    pai.appendChild(e);
    return e;
  }

  /* ---------- tempos da narração ---------- */
  const N = window.NARRACAO;
  const porId = {};
  N.assuntos.forEach((a) => { porId[a.id] = a; });
  const norm = (t) => t.toLowerCase().replace(/[.,:;?!]/g, '');
  /** Token do assunto cujo texto (sem pontuação) é `palavra`; n = ocorrência. */
  function tok(id, palavra, n) {
    const a = porId[id];
    if (!a) throw new Error('assunto? ' + id);
    // maiúsculas contam ("No" de início de frase ≠ "no"); só a pontuação é ignorada
    const limpa = (x) => x.replace(/[.,:;?!]/g, '');
    let k = n || 1;
    for (const t of a.tokens) if (limpa(t.t) === limpa(palavra) && --k === 0) return t;
    throw new Error(`palavra "${palavra}" (${n || 1}) não está em ${id}`);
  }
  const T = (id, palavra, n) => tok(id, palavra, n).ini;      // início da palavra
  const TF = (id, palavra, n) => tok(id, palavra, n).fim;     // fim da palavra
  /** Início de uma palavra falada dentro de um token composto (ex.: "R$ 99,90"). */
  function TFala(id, palavra, fala, n) {
    let k = n || 1;
    for (const f of tok(id, palavra).falas) if (norm(f.p) === norm(fala) && --k === 0) return f.ini;
    throw new Error(`fala "${fala}" não está em ${palavra}`);
  }
  const A = (id) => porId[id];

  /* ---------- som: eventos gerados pela própria linha do tempo ---------- */
  const EVENTOS = [];
  function som(t, tipo, o) {
    EVENTOS.push(Object.assign({ t: Math.round(t * 1000) / 1000, tipo }, o || {}));
  }

  /* ---------- ícones de linha (24x24, traço 1.75, pontas redondas) ---------- */
  // Os 7 primeiros vêm de pacote/…/marca/icones; os demais seguem o mesmo desenho.
  const ICONES = {
    cadeado: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    caixa: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M6 14h2"/>',
    chegada: '<path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
    comandas: '<path d="M13 16H8"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"/>',
    dinheiro: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    reservas: '<path d="M21 5H3"/><path d="M15 12H3"/><path d="M17 19H3"/>',
    saida: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
    // mesma família de desenho
    casa: '<path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9.5 21v-6.5h5V21"/>',
    pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    caderno: '<rect x="5.5" y="2.5" width="14" height="19" rx="2"/><path d="M9.5 2.5v19"/><path d="M3 7h3.5M3 12h3.5M3 17h3.5"/><path d="M12.5 8h4M12.5 12h4M12.5 16h2.5"/>',
    conversa: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.45L3 20.5l1.6-5A8.5 8.5 0 1 1 21 11.5z"/>',
    papel: '<path d="M6 2.5h9l4 4V21a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 21z"/><path d="M15 2.5v4h4"/><path d="M9 11h6M9 14.5h6M9 18h3.5"/>',
    wifi: '<path d="M12 20h.01"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 14 0"/><path d="M2 8.8a15 15 0 0 1 20 0"/>',
    email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    xis: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    responder: '<path d="m9 14-5-5 5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    interrogacao: '<path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    seta: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    cama: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    etiqueta: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><path d="M7.5 7.5h.01"/>',
    pessoas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    escudo: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    refazer: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
    chave: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m11 12 9.5-9.5"/><path d="m16 7 3 3"/>',
    lua: '<path d="M12 3a6.4 6.4 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    desigual: '<path d="M5 9h14"/><path d="M5 15h14"/><path d="M17 5 7 19"/>',
    celular: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  };

  /** SVG de ícone; cada traço recebe pathLength=1 para poder "se desenhar". */
  function icone(nome, tam, cor, esp) {
    const e = s('svg', {
      viewBox: '0 0 24 24', width: tam, height: tam, fill: 'none', stroke: cor || 'currentColor',
      'stroke-width': esp || 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      style: 'display:block;overflow:visible',
    });
    e.innerHTML = ICONES[nome];
    e.querySelectorAll('*').forEach((p) => { p.setAttribute('pathLength', '1'); });
    return e;
  }

  /** Faz os traços de um SVG se desenharem entre t e t+dur (em sequência). */
  function desenhar(svg, t, dur, opts) {
    const o = opts || {};
    const partes = Array.from(svg.querySelectorAll('path,rect,circle,line,ellipse,polyline'));
    const n = partes.length, passo = n > 1 ? (dur * (o.sobre == null ? 0.55 : o.sobre)) / (n - 1) : 0;
    const d1 = n > 1 ? dur - passo * (n - 1) : dur;
    partes.forEach((p, i) => {
      p.setAttribute('pathLength', '1');
      p.style.strokeDasharray = '1';
      const ob = M.el(p, { tr: 0, o: 1, fluxo: true });
      // esconde a "ponta" do traço antes de começar (pontas redondas deixam um ponto)
      ob.base.o = 0;
      M.por(ob, t + i * passo, { o: 1 });
      M.para(ob, t + i * passo, d1, { tr: [0, 1] }, o.ease || 'io3');
      if (o.apagar != null) M.para(ob, o.apagar, o.durApagar || 0.3, { tr: 0 }, 'in3');
    });
    return partes;
  }

  /* ---------- texto ---------- */
  /** Quebra um texto em <span> por palavra; devolve [{el, texto}] */
  function palavras(pai, texto, cls) {
    return texto.split(' ').map((p, i, arr) => {
      const e = h('span', { class: 'pal ' + (cls || ''), text: p });
      pai.appendChild(e);
      if (i < arr.length - 1) pai.appendChild(document.createTextNode(' '));
      return { el: e, texto: p };
    });
  }
  const moeda = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /** Entrada padrão: sobe e aparece. */
  function entra(o, t, opts) {
    const p = Object.assign({ dy: 36, dur: 0.5, ease: 'out4', s0: 1 }, opts || {});
    M.para(o, t, p.dur * 0.7, { o: [0, 1] }, 'out2');
    M.para(o, t, p.dur, { y: [p.dy + (p.y || 0), p.y || 0] }, p.ease);
    if (p.dx) M.para(o, t, p.dur, { x: [p.dx + (p.x || 0), p.x || 0] }, p.ease);
    if (p.s0 !== 1) M.para(o, t, p.dur, { s: [p.s0, 1] }, p.ease);
    return o;
  }
  /** Entrada com estalo (escala com ultrapassagem). */
  function estala(o, t, opts) {
    const p = Object.assign({ dur: 0.45, s0: 0.4, ease: 'back' }, opts || {});
    M.para(o, t, Math.min(0.16, p.dur * 0.5), { o: [0, 1] }, 'out2');
    M.para(o, t, p.dur, { s: [p.s0, p.s1 || 1] }, p.ease);
    return o;
  }
  function sai(o, t, opts) {
    const p = Object.assign({ dy: -30, dur: 0.35, ease: 'in3' }, opts || {});
    M.para(o, t, p.dur, { o: 0 }, 'in2');
    if (p.dy) M.para(o, t, p.dur, { y: p.dy }, p.ease);
    if (p.dx) M.para(o, t, p.dur, { x: p.dx }, p.ease);
    if (p.s1 != null) M.para(o, t, p.dur, { s: p.s1 }, p.ease);
    return o;
  }

  /* ---------- peças ---------- */
  /** Grupo que gira/escala em torno de (cx, cy). */
  function grupo(pai, cx, cy, init) {
    const e = h('div', { style: `position:absolute;left:0;top:0;width:1080px;height:1920px;transform-origin:${cx}px ${cy}px;` });
    pai.appendChild(e);
    const ob = M.el(e, init || {});
    ob.dom = e; ob.cx = cx; ob.cy = cy;
    return ob;
  }
  /** Ícone de linha centrado em (cx, cy). */
  function ico(pai, nome, cx, cy, tam, cor, esp, init) {
    const sv = icone(nome, tam, cor, esp);
    const e = h('div', { style: `position:absolute;left:${cx - tam / 2}px;top:${cy - tam / 2}px;width:${tam}px;height:${tam}px;transform-origin:50% 50%;` }, [sv]);
    pai.appendChild(e);
    const ob = M.el(e, init || {});
    ob.dom = e; ob.svg = sv;
    return ob;
  }
  /** Texto centrado em (cx, cy). q: {tam, peso, cor, larg, mono, esp, alt, alinh} */
  function txt(pai, cx, cy, str, q, init) {
    const p = Object.assign({ tam: 40, peso: 600, cor: COR.branco, larg: 900, alt: null, alinh: 'center', lh: 1.15, esp: '-0.012em' }, q || {});
    const alt = p.alt || Math.ceil(p.tam * p.lh * (p.linhas || 1)) + 8;
    const just = p.alinh === 'left' ? 'flex-start' : p.alinh === 'right' ? 'flex-end' : 'center';
    const x = p.alinh === 'left' ? cx : p.alinh === 'right' ? cx - p.larg : cx - p.larg / 2;
    const e = h('div', { class: p.mono ? 'mono' : '', style: `position:absolute;left:${x}px;top:${cy - alt / 2}px;width:${p.larg}px;height:${alt}px;display:flex;align-items:center;justify-content:${just};text-align:${p.alinh};font-size:${p.tam}px;font-weight:${p.peso};color:${p.cor};line-height:${p.lh};letter-spacing:${p.esp};white-space:${p.quebra ? 'normal' : 'nowrap'};transform-origin:${p.alinh === 'left' ? '0%' : p.alinh === 'right' ? '100%' : '50%'} 50%;` });
    if (p.html) e.innerHTML = str; else e.textContent = str;
    pai.appendChild(e);
    const ob = M.el(e, init || {});
    ob.dom = e;
    return ob;
  }
  /** Chip (pílula) centrado em (cx, cy). */
  function chip(pai, cx, cy, texto, q, init) {
    const p = Object.assign({ tipo: 'escuro', tam: 32, alt: 68 }, q || {});
    const c = h('div', { class: 'chip chip-' + p.tipo, style: `height:${p.alt}px;font-size:${p.tam}px;` + (p.estilo || '') });
    let sv = null;
    if (p.icone) { sv = icone(p.icone, Math.round(p.tam * 1.12), p.corIcone || 'currentColor', 2); c.appendChild(sv); }
    c.appendChild(h('span', { text: texto }));
    const e = h('div', { style: `position:absolute;left:${cx - 400}px;top:${cy - p.alt / 2}px;width:800px;height:${p.alt}px;display:flex;justify-content:center;align-items:center;transform-origin:50% 50%;` }, [c]);
    pai.appendChild(e);
    const ob = M.el(e, init || {});
    ob.dom = e; ob.chip = c; ob.svg = sv;
    return ob;
  }
  /** Logo oficial (mesma geometria de marca/logo/fazlo-hospeda-logo-escura.svg), em partes animáveis. */
  function logo(pai, cx, cy, larg, init) {
    const k = larg / 416;
    const sv = s('svg', { viewBox: '0 0 416 72', width: larg, height: 72 * k, style: 'display:block;overflow:visible' });
    const gF = s('g', { style: 'transform-box:fill-box;transform-origin:50% 50%' }, [
      s('text', { x: 0, y: 59.5, 'font-family': 'Geist', 'font-weight': 800, 'font-size': 64, 'letter-spacing': -1.28, fill: '#FFFFFF' }, 'FAZLO')]);
    const gP = s('g', { style: 'transform-box:fill-box;transform-origin:50% 50%' }, [
      s('rect', { x: 224, y: 10, width: 188, height: 52, rx: 26, fill: COR.limao }),
      s('text', { x: 318, y: 48, 'text-anchor': 'middle', 'font-family': 'Geist', 'font-weight': 600, 'font-size': 34, fill: COR.tinta }, 'Hospeda')]);
    sv.appendChild(gF); sv.appendChild(gP);
    const e = h('div', { style: `position:absolute;left:${cx - larg / 2}px;top:${cy - 36 * k}px;width:${larg}px;height:${72 * k}px;transform-origin:50% 50%;` }, [sv]);
    pai.appendChild(e);
    const ob = M.el(e, init || {});
    ob.dom = e; ob.fazlo = M.el(gF, {}); ob.pilula = M.el(gP, {});
    return ob;
  }
  /** Número que conta: devolve objeto {n}; aplicar formata. */
  function contador(dom, fmt, init) {
    return M.obj({ n: init || 0 }, (v) => { const t = fmt(v.n); if (dom.__t !== t) { dom.__t = t; dom.textContent = t; } });
  }
  /** Ruído determinístico 0..1 */
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  window.B = { grupo, ico, txt, chip, logo, contador, rnd, W, H, COR, h, s, caixa, N, A, tok, T, TF, TFala, som, EVENTOS, ICONES, icone, desenhar, palavras, moeda, entra, estala, sai };
})();
