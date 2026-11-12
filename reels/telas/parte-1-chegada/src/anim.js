/*
 * FAZLO Hospeda — Parte 1 · "A chegada" (reel de telas, 9:16, sem voz)
 * Reserva → Sinal → Check-in, com as peças reais do pacote (scripts/pecas.cjs, src/pecas.json).
 *
 * Mesmo motor do "Um dia inteiro" (palco DOM com perspectiva, peças vivas, odômetro, toque com onda limão),
 * com as regras de ritmo e espaço desta parte, garantidas pelo sequenciador abaixo:
 *   - no máximo 2 peças na tela; cada peça parada ≥ 2,5 s depois de entrar; cada valor ≥ 3 s;
 *   - ≥ 0,4 s de respiro entre uma ideia e a seguinte, ligadas pelo "fio de luz" (um ponto limão que leva
 *     a ideia que sai até o lugar onde a próxima nasce);
 *   - peças com 56 px entre si, 80 px de margem lateral, conteúdo centrado na altura útil (y 200–1536).
 * Determinístico: REEL.renderAt(t).
 */
(() => {
  const W = 1080, H = 1920;
  const C = { preto: '#0A0A0A', limao: '#AFFA27', branco: '#F7F7F2' };
  const ENTRA = 0.5, SAI = 0.4, RESPIRO = 0.42, PARADA = 2.55, VALOR = 3.05;
  const TAG_Y = 196, TXT_Y = 268, TOPO = 457, BASE = 1536;

  // ---------------- utilidades ----------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const EZ = {
    lin: (u) => u, out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u,
    io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    expo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
    back: (u) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  };
  const ramp = (t, a, b, e = EZ.out) => e(clamp((t - a) / (b - a), 0, 1));
  const el = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); if (parent) parent.appendChild(e); return e; };
  const brl = (cent) => { const neg = cent < 0; cent = Math.abs(Math.round(cent)); const r = Math.floor(cent / 100), c = cent % 100; return (neg ? '− ' : '') + 'R$ ' + String(r).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + String(c).padStart(2, '0'); };
  const parseBRL = (s) => { const neg = /[−-]/.test(s); const n = s.replace(/[^\d,]/g, '').replace(',', '.'); return (neg ? -1 : 1) * Math.round(parseFloat(n) * 100); };

  let ROOT, META, STAGE, FX, DUR = 0;
  const PECAS = [], TEXTOS = [], TAGS = [], EVENTOS = [], DESTAQUES = [], IDEIAS = [], VALORES = [], FIOS = [], ETAPAS = [];
  const ev = (t, tipo, d = {}) => EVENTOS.push({ t: +t.toFixed(3), tipo, ...d });

  // ---------------- peças ----------------
  function peca(id, s, o = {}) {
    const m = META[id]; if (!m) throw new Error('peça ' + id);
    const pad = o.pad ?? 0, padY = o.padY ?? pad;
    const w = (m.w + 2 * pad) * s, h = (m.h + 2 * padY) * s;
    const tile = m.tile || {};
    const pai = o.dentro ? o.dentro.el : STAGE;
    const e = el('div', 'peca', pai, { position: 'absolute', left: '0px', top: '0px', width: w + 'px', height: h + 'px', overflow: 'hidden',
      background: o.fundo || tile.fundo || '#FFFFFF', borderRadius: ((o.r ?? tile.r ?? 12) * s) + 'px', transformOrigin: '50% 50%', boxSizing: 'border-box', display: 'none' });
    const bw = tile.borda ? parseFloat(tile.borda) * s : 0;
    if (tile.borda) { const b = tile.borda.split(' '); e.style.border = `${bw}px ${b[1]} ${b.slice(2).join(' ')}`; }
    const img = el('img', null, e, { position: 'absolute', left: (pad * s - bw) + 'px', top: (padY * s - bw) + 'px', width: m.w * s + 'px', height: m.h * s + 'px' });
    img.src = m.png; img.decoding = 'sync';
    const fc = String(o.fundo || tile.fundo || '#FFFFFF'); const mm = /^rgb\((\d+)/.exec(fc);
    const p = { escuro: (mm && +mm[1] < 60) || /^#0A0A0A/i.test(fc), id, m, s, pad, padY, w, h, bw, el: e, k: [], furos: [], ondas: [], toques: [], filhos: [], destaque: [], filho: !!o.dentro, panorama: !!o.panorama };
    for (const hl of m.holes || []) {
      const right = hl.x + hl.w >= m.w - 8 && !hl.input;
      const span = el('div', 'furo', e, { position: 'absolute', top: ((padY + hl.y) * s - bw) + 'px', height: hl.h * s + 'px', lineHeight: hl.h * s + 'px',
        font: `${hl.peso} ${hl.px * s}px '${hl.fam}'`, color: hl.cor, letterSpacing: hl.ls === 'normal' ? 'normal' : parseFloat(hl.ls) * s + 'px', whiteSpace: 'pre', display: 'flex', alignItems: 'center' });
      if (right) { span.style.right = (w - (pad + hl.x + hl.w) * s - bw) + 'px'; span.style.justifyContent = 'flex-end'; } else span.style.left = ((pad + hl.x) * s - bw) + 'px';
      p.furos.push({ hl, span, alvo: parseBRL(hl.texto), cont: [], seq: null, input: hl.input, ultimo: null, lh: hl.h * s, neg: /^[−-]/.test(hl.texto) });
    }
    p.brilho = el('div', null, e, { position: 'absolute', inset: '0', pointerEvents: 'none', borderRadius: 'inherit', opacity: 0 });
    if (o.dentro) o.dentro.filhos.push(p);
    PECAS.push(p);
    return p;
  }
  const NEUTRO = { x: 540, y: 960, z: 0, rx: 0, ry: 0, k: 1, op: 1, blur: 0, clip: 1 };
  function at(p, t, props, e = EZ.out) { const prev = p.k.length ? p.k[p.k.length - 1].v : { ...NEUTRO }; p.k.push({ t, v: { ...prev, ...props }, e }); p.k.sort((a, b) => a.t - b.t); return p; }
  function estado(p, t) {
    const k = p.k; if (!k.length || t < k[0].t) return null;
    let i = 0; while (i < k.length - 1 && t >= k[i + 1].t) i++;
    if (i === k.length - 1) return k[i].v;
    const a = k[i], b = k[i + 1], u = b.e((t - a.t) / (b.t - a.t)); const o = {}; for (const key in a.v) o[key] = lerp(a.v[key], b.v[key], u); return o;
  }
  // entra: nasce do fundo (profundidade + foco), sobe 40 px e para no lugar
  function entra(p, t0, x, y, o = {}) {
    at(p, t0, { x: x + (o.dx ?? 0), y: y + (o.dy ?? 40), z: o.z ?? -260, k: o.k ?? 0.94, op: 0, blur: 6, rx: o.rx ?? 8 }, EZ.lin);
    at(p, t0 + 0.12, { op: 1 }, EZ.lin);
    at(p, t0 + ENTRA, { x, y, z: 0, k: 1, blur: 0, rx: 0, ry: 0 }, EZ.out);
    p.entrou = t0 + ENTRA; p.cx = x; p.cy = y; return p;
  }
  // sai: recua e desfoca
  function sai(p, t0) { at(p, t0, {}, EZ.lin); at(p, t0 + SAI, { z: -320, k: 0.94, op: 0, blur: 8, y: p.cy - 30 }, EZ.in); p.saiu = t0; return p; }
  function conta(p, i, t0, t1, de, ate) { const f = p.furos[i]; f.cont.push({ t0, t1, de, ate: ate ?? f.alvo }); ev(t0, 'conta', { dur: t1 - t0 }); ev(t1, 'conta_fim'); return t1; }
  function toque(p, t, u = 0.5, v = 0.5, afunda = true) {
    const d = el('div', 'onda', p.el, { position: 'absolute', left: (u * p.w) + 'px', top: (v * p.h) + 'px', width: '10px', height: '10px', marginLeft: '-5px', marginTop: '-5px', borderRadius: '50%', background: C.limao, opacity: 0, pointerEvents: 'none' });
    p.ondas.push({ t, d }); if (afunda) p.toques.push(t); ev(t, 'toque');
  }
  function destaque(nome, t0, t1, ps, extra = {}) { DESTAQUES.push({ nome, t0, t1, pecas: ps.map((p) => p.id), ...extra }); ps[0].destaque.push([t0, t1]); }
  // chip do pacote desenhado sobre o lugar do chip na peça (para trocar de status na frente de quem assiste)
  function chip(host, id, marca, alinha = 'left') {
    const m = META[id], mk = host.m.marcas[marca], s = host.s;
    const c = peca(id, s, { dentro: host });
    const x = alinha === 'left' ? (host.pad + mk.x) * s - host.bw : (host.pad + mk.x + mk.w - m.w) * s - host.bw;
    const y = (host.padY + mk.y + mk.h / 2 - m.h / 2) * s - host.bw;
    c.rel = { x, y }; c.el.style.borderRadius = '999px';
    return c;
  }
  function trocaChip(a, b, t) { at(a, 0, { x: 0, y: 0, op: 1 }, EZ.lin); at(b, t, { x: 0, y: 0, op: 1, clip: 0 }, EZ.lin); at(b, t + 0.36, { clip: 1 }, EZ.io); at(a, t + 0.36, { op: 1 }, EZ.lin); at(a, t + 0.4, { op: 0 }, EZ.lin); b.estalo = t + 0.2; ev(t + 0.16, 'status'); }
  // ideias: grupos de peças que entram e saem juntos (para o QA de respiro e de "no máximo 2")
  function ideia(nome, ps, t0, t1) { IDEIAS.push({ nome, pecas: ps.map((p) => p.id), t0, t1 }); }
  // fio de luz: o ponto limão leva a ideia que sai até o lugar onde a próxima nasce
  function fio(t0, t1, de, ate) { FIOS.push({ t0, t1, de, ate }); ev(t0, 'fio', { dur: t1 - t0 }); }
  const X = (p) => (p.w <= 890 ? 540 : 80 + p.w / 2);
  const centroBase = (p) => [p.cx, p.cy + p.h / 2];
  const centroTopo = (p) => [p.cx, p.cy - p.h / 2];

  // ---------------- textos e etiqueta ----------------
  function texto(txt, t0, t1, o = {}) {
    const box = el('div', 'texto', STAGE, { position: 'absolute', left: '80px', top: (o.y ?? TXT_Y) + 'px', width: '920px', font: `900 ${o.px ?? 64}px 'ID'`, lineHeight: '1.04', letterSpacing: '-0.025em', color: C.branco, textAlign: 'center', display: 'none' });
    const linhas = txt.split('\n').map((ln) => { const mask = el('div', null, box, { overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em' }); const inner = el('div', null, mask, { whiteSpace: 'nowrap' }); inner.innerHTML = ln.replace(/\*([^*]+)\*/g, `<span style="color:${C.limao}">$1</span>`); return inner; });
    const o2 = { box, linhas, t0, t1, px: o.px ?? 64, txt }; TEXTOS.push(o2); return o2;
  }
  function etiqueta(txt, t0, t1) {
    const e = el('div', 'tag', STAGE, { position: 'absolute', left: '540px', top: TAG_Y + 'px', height: '52px', transform: 'translateX(-50%)', display: 'none', alignItems: 'center', gap: '14px', padding: '0 26px', borderRadius: '999px', border: '2px solid rgba(247,247,242,0.22)', background: 'rgba(20,20,20,0.8)', font: `800 30px 'ID'`, color: C.branco, whiteSpace: 'nowrap', boxSizing: 'border-box' });
    el('span', null, e, { width: '14px', height: '14px', borderRadius: '50%', background: C.limao, boxShadow: `0 0 16px ${C.limao}` });
    el('span', null, e).textContent = txt;
    const o = { e, t0, t1 }; TAGS.push(o); return o;
  }

  // ---------------- roteiro ----------------
  function monta() {
    let t = 0;
    // ===== GANCHO · o calendário de 14 dias se enche, em ritmo calmo =====
    ETAPAS.push({ nome: 'Gancho', t0: 0 });
    etiqueta('Parte 1 · A chegada', -1, 3.85);
    texto('Do pedido de reserva\nao *hóspede no chalé.*', -1, 3.85);
    const cal = peca('g_cal', 1.9, { panorama: true });
    entra(cal, 0.35, 540, 1010, { dy: 60, z: -400, rx: 14 });
    cal.m.bars.forEach((b, i) => {
      const id = 'g_bar' + String(i).padStart(2, '0'); if (!META[id]) return;
      const bp = peca(id, cal.s, { dentro: cal }); bp.el.style.borderRadius = '0px'; bp.rel = { x: b.x * cal.s, y: b.y * cal.s };
      const tt = 0.95 + i * 0.16;
      at(bp, tt, { x: 0, y: -24, k: 0.4, op: 0 }, EZ.lin); at(bp, tt + 0.32, { x: 0, y: 0, k: 1, op: 1 }, EZ.back);
      ev(tt + 0.08, 'barra', { i });
    });
    sai(cal, 3.6);
    ideia('calendário', [cal], 0.35, 4.0);
    t = 4.0;

    // ===== 1 RESERVA =====
    let s0 = t + 0.1; ETAPAS.push({ nome: '1 Reserva', t0: s0 });
    const tagR = etiqueta('1 de 3 · Reserva', s0 + 0.05, 0);
    const txR = texto('Só aparece o que\nestá *livre.*', s0 + 0.15, 0);
    fio(t - 0.35, s0 + 0.2, () => centroBase(cal), () => [540, TAG_Y + 26]);
    // a) período
    let a0 = s0 + 0.5;
    const ent = peca('r_entrada', 4.4, { pad: 8 }), sad = peca('r_saida', 4.4, { pad: 8 });
    const hE = ent.h, hS = sad.h, gap = 64, topR = 1010 - (hE + gap + hS) / 2;
    entra(ent, a0, 540, topR + hE / 2); entra(sad, a0 + 0.15, 540, topR + hE + gap + hS / 2);
    ev(a0, 'entra'); ev(a0 + 0.15, 'entra');
    let fim = a0 + 0.15 + ENTRA + VALOR;
    destaque('Entrada 22/10/2026 · Saída 25/10/2026', a0 + ENTRA, fim, [ent, sad]);
    VALORES.push({ nome: 'Entrada 22/10/2026', peca: 'r_entrada', t: ent.entrou }, { nome: 'Saída 25/10/2026', peca: 'r_saida', t: sad.entrou });
    sai(ent, fim); sai(sad, fim); ideia('período', [ent, sad], a0, fim + SAI);
    // b) Livres no período · 5 de 10 + a lista; o Quarto Bromélia é tocado e selecionado
    let b0 = fim + SAI + RESPIRO;
    const liv = peca('r_livres', 3.2), lis = peca('r_lista', 3.34, { pad: 3 }), lisS = peca('r_lista_sel', 3.34, { pad: 3 });
    const topB = TOPO + 4, yL = topB + liv.h / 2, yLis = topB + liv.h + 56 + lis.h / 2;
    fio(fim, b0 + 0.1, () => centroBase(sad), () => [540, yL - liv.h / 2]);
    entra(liv, b0, 540, yL); entra(lis, b0 + 0.15, X(lis), yLis); ev(b0, 'entra'); ev(b0 + 0.15, 'entra');
    const tTq = lis.entrou + 0.9;
    const bm = lis.m.marcas.brom; const vB = (lis.padY + bm.y + bm.h / 2) / (lis.m.h + 2 * lis.padY);
    toque(lis, tTq, 0.32, vB, false);
    entra(lisS, 0, X(lisS), yLis); lisS.k = []; at(lisS, tTq + 0.08, { x: X(lisS), y: yLis, op: 0 }, EZ.lin); at(lisS, tTq + 0.24, { op: 1 }, EZ.lin);
    lisS.cx = X(lisS); lisS.cy = yLis; lisS.entrou = tTq + 0.24; lisS.marcaBrilho = { marca: 'brom', t: tTq + 0.24 };
    at(lis, tTq + 0.24, { op: 1 }, EZ.lin); at(lis, tTq + 0.3, { op: 0 }, EZ.lin);
    ev(tTq + 0.2, 'seleciona');
    fim = Math.max(lis.entrou + VALOR, lisS.entrou + PARADA);
    destaque('Livres no período · 5 de 10', liv.entrou, tTq, [liv]);
    destaque('Quarto Bromélia · R$ 320,00 por diária', tTq, fim, [lisS]);
    VALORES.push({ nome: 'Livres no período · 5 de 10', peca: 'r_livres', t: liv.entrou }, { nome: 'Quarto Bromélia R$ 320,00', peca: 'r_lista_sel', t: lis.entrou, troca: 'r_lista' });
    sai(liv, fim); sai(lisS, fim); ideia('livres e o Quarto Bromélia', [liv, lis, lisS], b0, fim + SAI);
    // c) a barra "Bruno T." cai no calendário de 14 dias, no lugar certo (lupa sobre o Quarto Bromélia, 22 → 25)
    let c0 = fim + SAI + RESPIRO;
    const ov = peca('r_cal_full', 0.9, { panorama: true }), lin = peca('r_cal_linha', 3.85, { r: 14 });
    const topC = 1010 - (ov.h + 64 + lin.h) / 2;
    const yOv = topC + ov.h / 2, yLin = topC + ov.h + 64 + lin.h / 2;
    fio(fim, c0 + 0.1, () => centroBase(lisS), () => [540, yOv - ov.h / 2]);
    entra(ov, c0, 540, yOv); entra(lin, c0 + 0.15, 540, yLin); ev(c0, 'entra'); ev(c0 + 0.15, 'entra');
    const bru = peca('r_cal_bruno', 3.85, { dentro: lin });
    const relL = META.r_cal_bruno.rel; bru.rel = { x: relL.x * 3.85, y: relL.y * 3.85 };
    const tq = lin.entrou + 0.3;
    at(bru, tq, { x: 0, y: -260, op: 0, k: 1.05 }, EZ.lin); at(bru, tq + 0.08, { op: 1 }, EZ.lin); at(bru, tq + 0.4, { y: 0, k: 1 }, EZ.in);
    at(bru, tq + 0.5, { y: -8 }, EZ.out); at(bru, tq + 0.6, { y: 0 }, EZ.in);
    bru.impacto = tq + 0.4; ev(tq + 0.4, 'impacto');
    // a mesma barra aparece na visão geral, no lugar certo
    const mini = peca('r_cal_bruno', 0.9, { dentro: ov }); const fr = META.r_cal_full.src, br = META.r_cal_bruno.src;
    mini.rel = { x: (br.x - fr.x) * 0.9, y: (br.y - fr.y) * 0.9 };
    at(mini, tq + 0.4, { x: 0, y: 0, op: 0, k: 1.6 }, EZ.lin); at(mini, tq + 0.6, { op: 1, k: 1 }, EZ.back);
    const ln = META.r_cal_linha.src;
    ov.lupa = { x: (ln.x - fr.x) * 0.9, y: (ln.y - fr.y) * 0.9, w: META.r_cal_linha.w * 0.9, h: META.r_cal_linha.h * 0.9, t: lin.entrou - 0.2, alvo: lin };
    fim = Math.max(lin.entrou + PARADA, tq + 0.6 + VALOR);
    destaque('Barra nova: Bruno T. · Quarto Bromélia, 22 → 25', tq + 0.4, fim, [lin]);
    VALORES.push({ nome: 'Bruno T. (Quarto Bromélia 22 → 25)', peca: 'r_cal_linha', t: tq + 0.6 });
    sai(ov, fim); sai(lin, fim); ideia('a barra nova no calendário', [ov, lin], c0, fim + SAI);
    t = fim + SAI;
    tagR.t1 = t; txR.t1 = t;

    // ===== 2 SINAL · Gustavo Ribeiro =====
    s0 = t + 0.1; ETAPAS.push({ nome: '2 Sinal', t0: s0 });
    const tagS = etiqueta('2 de 3 · Sinal', s0 + 0.05, 0);
    const txS = texto('Registrou o sinal, o saldo\njá fica *calculado.*', s0 + 0.15, 0);
    fio(t - 0.35, s0 + 0.2, () => centroBase(lin), () => [540, TAG_Y + 26]);
    a0 = s0 + 0.5;
    const gus = peca('s_gustavo', 3.24), cta = peca('s_conta', 2.86, { pad: 0, r: 5 });
    const topS = 1015 - (gus.h + 64 + cta.h) / 2;
    entra(gus, a0, X(gus), topS + gus.h / 2); entra(cta, a0 + 0.15, X(cta), topS + gus.h + 64 + cta.h / 2); ev(a0, 'entra'); ev(a0 + 0.15, 'entra');
    let tc = conta(cta, 0, cta.entrou + 0.1, cta.entrou + 0.6, 0); conta(cta, 1, cta.entrou + 0.25, cta.entrou + 0.75, 0);
    fim = Math.max(cta.entrou + 0.75 + VALOR, gus.entrou + PARADA);
    destaque('Gustavo Ribeiro · Pré-reserva · R$ 1.050,00, sem sinal', gus.entrou, fim, [gus, cta]);
    VALORES.push({ nome: 'Total R$ 1.050,00 · saldo R$ 1.050,00', peca: 's_conta', t: cta.entrou + 0.75 }, { nome: 'Pré-reserva · sem sinal', peca: 's_gustavo', t: gus.entrou });
    sai(gus, fim); sai(cta, fim); ideia('Gustavo, pré-reserva', [gus, cta], a0, fim + SAI);
    // b) o sinal sendo digitado
    b0 = fim + SAI + RESPIRO;
    const tit = peca('s_titulo', 3.8), cmp = peca('s_campo', 2.77);
    const topS2 = 1110 - (tit.h + 64 + cmp.h) / 2;
    fio(fim, b0 + 0.1, () => centroBase(cta), () => [540, topS2]);
    entra(tit, b0, 540, topS2 + tit.h / 2); entra(cmp, b0 + 0.15, 540, topS2 + tit.h + 64 + cmp.h / 2); ev(b0, 'entra'); ev(b0 + 0.15, 'entra');
    const d0 = cmp.entrou + 0.3, seqs = ['', '3', '31', '315', '315,', '315,0', '315,00'];
    cmp.furos[0].seq = seqs.map((s, i) => [d0 + i * 0.15, s]); cmp.furos[0].caret = [d0 - 0.2, d0 + 1.3];
    for (let i = 1; i < seqs.length; i++) ev(d0 + i * 0.15, 'tecla');
    fim = Math.max(d0 + 0.9 + VALOR, tit.entrou + PARADA);
    destaque('Sinal R$ 315,00 sendo digitado', cmp.entrou, fim, [cmp]);
    VALORES.push({ nome: 'Sinal R$ 315,00', peca: 's_campo', t: d0 + 0.9 });
    sai(tit, fim); sai(cmp, fim); ideia('o sinal', [tit, cmp], b0, fim + SAI);
    // c) depois: reserva confirmada · saldo R$ 735,00; o chip troca de Pré-reserva para Confirmada
    c0 = fim + SAI + RESPIRO;
    const gc = peca('s_gustavo_conf', 3.24), dep = peca('s_depois', 3.24);
    const topS3 = 1110 - (gc.h + 64 + dep.h) / 2;
    fio(fim, c0 + 0.1, () => centroBase(cmp), () => [540, topS3]);
    entra(gc, c0, 540, topS3 + gc.h / 2); entra(dep, c0 + 0.15, 540, topS3 + gc.h + 64 + dep.h / 2); ev(c0, 'entra'); ev(c0 + 0.15, 'entra');
    const cPre = chip(gc, 's_chip_pre', 'chip'), cConf = chip(gc, 's_chip_conf', 'chip');
    tc = conta(dep, 0, dep.entrou + 0.15, dep.entrou + 0.7, 105000, 73500);
    const tCh = tc + 0.1; trocaChip(cPre, cConf, tCh);
    fim = Math.max(tc + VALOR, tCh + 0.4 + VALOR);
    destaque('Depois: reserva confirmada · saldo R$ 735,00', dep.entrou, tCh, [dep]);
    destaque('Pré-reserva → Confirmada', tCh, fim, [gc]);
    VALORES.push({ nome: 'Saldo R$ 735,00', peca: 's_depois', t: tc }, { nome: 'Confirmada', peca: 's_gustavo_conf', t: tCh + 0.4 });
    sai(gc, fim); sai(dep, fim); ideia('confirmada, saldo calculado', [gc, dep], c0, fim + SAI);
    t = fim + SAI; tagS.t1 = t; txS.t1 = t;

    // ===== 3 CHECK-IN · Fernanda Lima =====
    s0 = t + 0.1; ETAPAS.push({ nome: '3 Check-in', t0: s0 });
    const tagC = etiqueta('3 de 3 · Check-in', s0 + 0.05, 0);
    const txC = texto('Confere com o hóspede\ne faz o *check-in.*', s0 + 0.15, 0);
    fio(t - 0.35, s0 + 0.2, () => centroBase(dep), () => [540, TAG_Y + 26]);
    a0 = s0 + 0.5;
    const ct = peca('c_titulo', 3.6), dd = peca('c_dados', 3.21);
    const topC1 = 1010 - (ct.h + 64 + dd.h) / 2;
    entra(ct, a0, 540, topC1 + ct.h / 2); entra(dd, a0 + 0.15, 540, topC1 + ct.h + 64 + dd.h / 2); ev(a0, 'entra'); ev(a0 + 0.15, 'entra');
    dd.blocos = ['hospede', 'telefone', 'periodo', 'acomodacao'].map((k, i) => ({ k, t: dd.entrou + 0.35 + i * 0.6 }));
    dd.blocos.forEach((b) => ev(b.t, 'bloco'));
    fim = Math.max(dd.blocos[3].t + 0.9, dd.entrou + PARADA);
    destaque('Conferência: hóspede, telefone, período, acomodação', dd.entrou, fim, [dd]);
    VALORES.push({ nome: 'Fernanda Lima · (35) 98804-7712 · 17/10 → 20/10 · Chalé Ipê', peca: 'c_dados', t: dd.entrou });
    sai(ct, fim); sai(dd, fim); ideia('conferência', [ct, dd], a0, fim + SAI);
    // b) o botão Fazer check-in é tocado → Check-in feito + recibo
    b0 = fim + SAI + RESPIRO;
    const bt = peca('c_btn', 4.19);
    fio(fim, b0 + 0.1, () => centroBase(dd), () => [540, 1250 - bt.h / 2]);
    entra(bt, b0, 540, 1250); ev(b0, 'entra');
    const tT = bt.entrou + PARADA - 0.9; toque(bt, tT, 0.5, 0.5);
    fim = bt.entrou + PARADA;
    destaque('Fazer check-in', bt.entrou, fim, [bt]);
    sai(bt, fim); const bIni = b0;
    b0 = fim + SAI + 0.1;
    const fe = peca('c_feito', 3.5), rc = peca('c_recibo', 3.08, { pad: 3 });
    const topC2 = 1100 - (fe.h + 64 + rc.h) / 2;
    fio(fim - 0.05, b0 + 0.15, () => [540, 1250], () => [540, topC2]);
    entra(fe, b0, 540, topC2 + fe.h / 2); entra(rc, b0 + 0.15, X(rc), topC2 + fe.h + 64 + rc.h / 2); ev(b0, 'feito'); ev(b0 + 0.15, 'recibo');
    fim = rc.entrou + VALOR;
    destaque('Check-in feito · recibo: entrada 17/10 14:05, saída prevista 20/10 12:00', fe.entrou, fim, [rc, fe]);
    VALORES.push({ nome: 'Recibo: entrada sábado, 17/10 · 14:05 / saída prevista 20/10, até 12:00', peca: 'c_recibo', t: rc.entrou });
    sai(fe, fim); sai(rc, fim); ideia('o toque e o check-in feito', [bt, fe, rc], bIni, fim + SAI);
    // c) na lista de hospedagens, o status vira Hospedada
    c0 = fim + SAI + RESPIRO;
    const hp = peca('c_hospedagens', 4.2), fc = peca('c_fernanda', 3.2, { pad: 3 });
    const topC3 = 1150 - (hp.h + 64 + fc.h) / 2;
    fio(fim, c0 + 0.1, () => centroBase(rc), () => [540, topC3]);
    entra(hp, c0, 540, topC3 + hp.h / 2); entra(fc, c0 + 0.15, X(fc), topC3 + hp.h + 64 + fc.h / 2); ev(c0, 'entra'); ev(c0 + 0.15, 'entra');
    const fConf = chip(fc, 's_chip_conf', 'chip', 'right'), fHosp = chip(fc, 'c_chip_hosp', 'chip', 'right');
    const tH = fc.entrou + 0.55; trocaChip(fConf, fHosp, tH);
    fim = Math.max(tH + 0.4 + VALOR, hp.entrou + PARADA);
    destaque('Fernanda Lima · Hospedada', tH, fim, [fc]);
    VALORES.push({ nome: 'Hospedada', peca: 'c_fernanda', t: tH + 0.4 });
    sai(hp, fim); sai(fc, fim); ideia('hospedada', [hp, fc], c0, fim + SAI);
    t = fim + SAI; tagC.t1 = t; txC.t1 = t;

    // ===== FINAL PRÓPRIO · a lista das três etapas =====
    s0 = t + 0.15; ETAPAS.push({ nome: 'Final', t0: s0 });
    FINAL = { t0: s0, itens: [s0 + 0.25, s0 + 0.75, s0 + 1.25], parte2: s0 + 1.9, logo: s0 + 2.6, pilula: s0 + 3.0 };
    fio(t - 0.35, s0 + 0.3, () => centroBase(fc), () => [540, 470]);
    FINAL.itens.forEach((ti, i) => ev(ti + 0.25, 'check', { i }));
    ev(FINAL.parte2, 'parte2'); ev(FINAL.logo, 'logo'); ev(FINAL.pilula, 'pilula');
    DUR = +(FINAL.pilula + 1.8).toFixed(2);
    ETAPAS.push({ nome: 'fim', t0: DUR });
  }
  let FINAL = null, F_EL = null;

  function montaFinal() {
    const f = el('div', 'final', STAGE, { position: 'absolute', inset: 0, display: 'none' });
    const top = 434;
    const linhas = ['Reserva', 'Sinal', 'Check-in'].map((nome, i) => {
      const row = el('div', null, f, { position: 'absolute', left: '0', width: W + 'px', top: (top + i * 112) + 'px', height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '34px' });
      const box = el('div', null, row, { width: '76px', height: '76px', borderRadius: '20px', border: `5px solid ${C.limao}`, boxSizing: 'border-box', position: 'relative', flex: 'none' });
      box.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" style="position:absolute;inset:0"><path d="M6 12.5l4 4 8-9" fill="none" stroke="#0A0A0A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`;
      const tx = el('div', null, row, { font: `900 84px 'ID'`, letterSpacing: '-0.02em', color: C.branco, width: '360px' }); tx.textContent = nome;
      return { row, box, tx, path: box.querySelector('path') };
    });
    const p2 = texto('Na Parte 2:\n*da comanda ao caixa.*', FINAL.parte2, DUR + 1, { y: 844 });
    p2.final = true;
    const marca = el('img', null, f, { position: 'absolute', left: (540 - 260) + 'px', top: '1060px', width: '520px' }); marca.src = 'assets/fazlo-hospeda-logo-escura@3x.png';
    const pil = el('div', null, f, { position: 'absolute', left: '540px', top: '1206px', background: C.limao, color: '#0A0A0A', font: `900 42px 'ID'`, letterSpacing: '-0.01em', padding: '22px 42px', borderRadius: '999px', whiteSpace: 'nowrap', boxShadow: '0 16px 50px rgba(175,250,39,.22)' });
    pil.textContent = 'Chame no WhatsApp · link na bio';
    F_EL = { f, linhas, marca, pil };
  }
  function desenhaFinal(t) {
    const F = FINAL, e = F_EL;
    e.f.style.display = t >= F.t0 - 0.05 ? 'block' : 'none';
    if (t < F.t0 - 0.05) return;
    e.linhas.forEach((l, i) => {
      const ti = F.itens[i], a = ramp(t, ti, ti + 0.5, EZ.out);
      l.row.style.opacity = clamp((t - ti) / 0.2, 0, 1); l.row.style.transform = `translateY(${(1 - a) * 30}px)`;
      const c = ramp(t, ti + 0.25, ti + 0.6, EZ.out);
      l.box.style.background = c > 0.02 ? `rgba(175,250,39,${c})` : 'transparent';
      l.box.style.boxShadow = `0 0 ${36 * c}px rgba(175,250,39,${0.35 * c})`;
      l.path.setAttribute('stroke-dashoffset', 1 - ramp(t, ti + 0.35, ti + 0.7, EZ.io));
    });
    const lg = ramp(t, F.logo, F.logo + 0.6, EZ.out);
    e.marca.style.opacity = lg; e.marca.style.transform = `translateY(${(1 - lg) * 24}px)`;
    const pk = ramp(t, F.pilula, F.pilula + 0.6, EZ.back);
    e.pil.style.opacity = clamp((t - F.pilula) / 0.2, 0, 1); e.pil.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * pk})`;
  }

  // ---------------- render ----------------
  function aplicaPeca(p, t) {
    const s = estado(p, t);
    if (p.filho) {
      if (!s || s.op <= 0.001) { p.el.style.display = 'none'; return; }
      p.el.style.display = 'block';
      p.el.style.transform = `translate(${p.rel.x + s.x}px, ${p.rel.y + s.y}px) scale(${s.k})`; p.el.style.transformOrigin = '50% 100%';
      p.el.style.opacity = s.op; p.el.style.clipPath = s.clip < 0.999 ? `circle(${(s.clip * 75).toFixed(2)}% at 50% 50%)` : 'none';
      fazFuros(p, t); return;
    }
    if (!s || s.op <= 0.002) { p.el.style.display = 'none'; p.ultimo = null; return; }
    let afunda = 0; for (const tt of p.toques) { const d = t - tt; if (d > -0.06 && d < 0.4) afunda = Math.max(afunda, d < 0.08 ? (d + 0.06) / 0.14 : 1 - (d - 0.08) / 0.32); }
    afunda = clamp(afunda, 0, 1);
    const k = s.k * (1 - 0.025 * afunda), z = s.z;
    p.el.style.display = 'block';
    p.el.style.transform = `translate3d(${s.x - p.w / 2}px, ${s.y - p.h / 2}px, ${z}px) rotateX(${s.rx}deg) rotateY(${s.ry}deg) scale(${k})`;
    p.el.style.opacity = s.op;
    p.el.style.filter = s.blur > 0.15 ? `blur(${s.blur.toFixed(2)}px)` : 'none';
    // brilho sutil na peça em destaque
    let hi = 0; for (const [a, b] of p.destaque) hi = Math.max(hi, ramp(t, a, a + 0.4) * (1 - ramp(t, b - 0.1, b + 0.3)));
    const sh = 1 - afunda * 0.6, pulso = hi * (0.85 + 0.15 * Math.sin(t * 2.4));
    p.el.style.boxShadow = `0 ${30 * sh}px ${80 * sh}px rgba(0,0,0,${0.6 * sh}), 0 ${6 * sh}px ${18 * sh}px rgba(0,0,0,0.35)` +
      (p.escuro ? ', 0 0 0 2px rgba(255,255,255,0.18)' : '') + (hi > 0.01 ? `, 0 0 0 ${2.5 * hi}px rgba(175,250,39,${0.75 * hi}), 0 0 ${70 * pulso}px rgba(175,250,39,${0.2 * pulso})` : '');
    p.ultimo = { cx: s.x, cy: s.y, w: p.w * k, h: p.h * k, op: s.op, blur: s.blur, hi, k: s.k };
    for (const o of p.ondas) {
      const d = t - o.t;
      if (d < -0.12 || d > 0.75) { o.d.style.opacity = 0; continue; }
      if (d < 0) { o.d.style.opacity = 0.9; o.d.style.transform = `scale(${4 + 2 * (d + 0.12) / 0.12})`; continue; }
      const u = EZ.out(clamp(d / 0.65, 0, 1)); o.d.style.opacity = 0.5 * (1 - u); o.d.style.transform = `scale(${6 + u * p.w * 2.2 / 10})`;
    }
    fazFuros(p, t);
  }
  function fazFuros(p, t) {
    for (const f of p.furos) {
      if (f.seq) { // digitando
        let txt = ''; for (const [ts, s] of f.seq) if (t >= ts) txt = s;
        const caret = f.caret && t >= f.caret[0] && t <= f.caret[1] && Math.floor(t * 3.2) % 2 === 0;
        const chave = txt + (caret ? '|' : '');
        if (f.ultimo !== chave) { f.ultimo = chave; f.span.innerHTML = txt + `<span style="display:inline-block;width:${0.08 * f.lh}px;height:${0.8 * f.lh}px;margin-left:${0.06 * f.lh}px;background:${caret ? '#0A0A0A' : 'transparent'}"></span>`; }
        continue;
      }
      let v = f.alvo;
      if (f.cont.length) { v = f.cont[0].de; for (const c of f.cont) { if (t < c.t0) break; v = t >= c.t1 ? c.ate : lerp(c.de, c.ate, EZ.out((t - c.t0) / (c.t1 - c.t0))); } }
      const rolando = f.cont.some((c) => t >= c.t0 && t < c.t1);
      const txt = f.input ? brl(v).replace('R$ ', '') : (f.neg ? '− ' + brl(Math.abs(v)) : brl(v));
      const chave = txt + (rolando ? '~' + v.toFixed(1) : '');
      if (f.ultimo === chave) continue; f.ultimo = chave;
      if (!rolando) { f.span.textContent = txt; continue; }
      f.span.innerHTML = '';
      const ab = Math.abs(v); let pos = 0; const dig = txt.replace(/\D/g, '').length;
      for (const ch of txt) {
        if (!/\d/.test(ch)) { const s2 = document.createElement('span'); s2.textContent = ch; Object.assign(s2.style, { display: 'inline-block', height: f.lh + 'px', lineHeight: f.lh + 'px', verticalAlign: 'top', whiteSpace: 'pre' }); f.span.appendChild(s2); continue; }
        const place = Math.pow(10, dig - 1 - pos); pos++;
        const q = ab / place, d0 = Math.floor(q) % 10, fr = q - Math.floor(q);
        const roll = place === 1 ? fr : clamp((fr - 0.8) / 0.2, 0, 1);
        const box = document.createElement('span'); Object.assign(box.style, { display: 'inline-block', height: f.lh + 'px', overflow: 'hidden', verticalAlign: 'top' });
        box.innerHTML = `<span style="display:block;transform:translateY(${-roll * f.lh}px)"><span style="display:block;height:${f.lh}px;line-height:${f.lh}px">${d0}</span><span style="display:block;height:${f.lh}px;line-height:${f.lh}px">${(d0 + 1) % 10}</span></span>`;
        f.span.appendChild(box);
      }
    }
  }
  function fx(t) {
    let html = '';
    // fio de luz entre as ideias
    for (const fo of FIOS) {
      if (t < fo.t0 || t > fo.t1 + 0.35) continue;
      const a = fo.de(), b = fo.ate();
      const u = ramp(t, fo.t0, fo.t1, EZ.io), fade = 1 - ramp(t, fo.t1, fo.t1 + 0.35);
      const mx = (a[0] + b[0]) / 2 + (a[0] === b[0] ? 160 : 0), my = (a[1] + b[1]) / 2;
      const d = `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`;
      const px = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * mx + u * u * b[0], py = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * my + u * u * b[1];
      html += `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><path d="${d}" pathLength="1" fill="none" stroke="${C.limao}" stroke-opacity="${0.35 * fade}" stroke-width="3" stroke-dasharray="${u} 1"/>` +
        `<circle cx="${px}" cy="${py}" r="${9 + 5 * fade}" fill="${C.limao}" opacity="${fade}" style="filter:drop-shadow(0 0 14px ${C.limao})"/></svg>`;
    }
    for (const p of PECAS) {
      if (!p.ultimo && !p.filho) continue;
      // impacto da barra nova e estalo do chip: um contorno que se abre
      const host = p.filho ? PECAS.find((q) => q.filhos.includes(p)) : p;
      if (!host || !host.ultimo) continue;
      for (const tb of [p.impacto, p.estalo]) {
        if (tb == null) continue; const d = t - tb; if (d < 0 || d > 0.6) continue;
        const u = EZ.out(d / 0.6), sc = host.ultimo.w / host.w;
        const cx = host.ultimo.cx - host.ultimo.w / 2 + (p.rel.x + p.w / 2) * sc, cy = host.ultimo.cy - host.ultimo.h / 2 + (p.rel.y + p.h / 2) * sc;
        const rw = p.w * sc / 2 + (p.impacto != null ? 40 : 7) * u, rh = p.h * sc / 2 + (p.impacto != null ? 40 : 7) * u;   // justo à peça: não passa da margem
        html += `<div style="position:absolute;left:${cx - rw}px;top:${cy - rh}px;width:${2 * rw}px;height:${2 * rh}px;border-radius:${rh}px;border:${4 * (1 - u)}px solid ${C.limao};opacity:${0.8 * (1 - u)}"></div>`;
      }
      if (p.filho) continue;
      const sc = p.ultimo.w / p.w, x0 = p.ultimo.cx - p.ultimo.w / 2, y0 = p.ultimo.cy - p.ultimo.h / 2;
      // conferência: cada bloco acende, um por vez
      if (p.blocos && p.ultimo.op > 0.5) for (const b of p.blocos) {
        const mk = p.m.marcas[b.k]; const a = ramp(t, b.t, b.t + 0.25) * (1 - ramp(t, b.t + 0.75, b.t + 1.0)); if (a <= 0.01) continue;
        const ok = ramp(t, b.t + 0.15, b.t + 0.4);
        html += `<div style="position:absolute;left:${x0 + (p.pad + mk.x) * p.s * sc - 6}px;top:${y0 + (p.padY + mk.y) * p.s * sc - 6}px;width:${mk.w * p.s * sc + 12}px;height:${mk.h * p.s * sc + 12}px;border-radius:16px;border:3px solid rgba(175,250,39,${0.9 * a});background:rgba(175,250,39,${0.10 * a});box-shadow:0 0 30px rgba(175,250,39,${0.25 * a})"></div>`;
      }
      // a linha do Quarto Bromélia selecionada: brilho sutil
      if (p.marcaBrilho && p.ultimo.op > 0.3) {
        const mk = p.m.marcas[p.marcaBrilho.marca], a = ramp(t, p.marcaBrilho.t, p.marcaBrilho.t + 0.4) * p.ultimo.op;
        const top = y0 + (p.padY + mk.y) * p.s * sc, hh = mk.h * p.s * sc;
        html += `<div style="position:absolute;left:${x0 - 2}px;top:${top}px;width:${p.ultimo.w + 4}px;height:${hh}px;border-radius:14px;border:3px solid rgba(175,250,39,${0.9 * a});box-shadow:0 0 40px rgba(175,250,39,${0.22 * a})"></div>`;
      }
      // a lupa: o lugar da barra nova na visão geral, ligado à linha ampliada
      if (p.lupa && p.ultimo.op > 0.3) {
        const L = p.lupa, a = ramp(t, L.t, L.t + 0.5) * p.ultimo.op, al = L.alvo.ultimo;
        const lx = x0 + L.x * sc, ly = y0 + L.y * sc, lw = L.w * sc, lh = L.h * sc;
        html += `<div style="position:absolute;left:${lx - 3}px;top:${ly - 3}px;width:${lw + 6}px;height:${lh + 6}px;border-radius:6px;border:3px solid rgba(175,250,39,${a});box-shadow:0 0 24px rgba(175,250,39,${0.4 * a})"></div>`;
        if (al) {
          const ax = al.cx - al.w / 2, ay = al.cy - al.h / 2;
          html += `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><path d="M${lx},${ly + lh} L${ax},${ay} M${lx + lw},${ly + lh} L${ax + al.w},${ay}" stroke="${C.limao}" stroke-opacity="${0.55 * a * al.op}" stroke-width="2.5" fill="none"/></svg>`;
        }
      }
    }
    FX.innerHTML = html;
  }

  function renderAt(t) {
    for (const p of PECAS) aplicaPeca(p, t);
    for (const tx of TEXTOS) {
      const vis = t >= tx.t0 && t <= tx.t1 + 0.45;
      tx.box.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      tx.linhas.forEach((ln, i) => {
        const a = tx.t0 < 0 ? 1 : ramp(t, tx.t0 + i * 0.1, tx.t0 + i * 0.1 + 0.55, EZ.expo);
        const b = ramp(t, tx.t1 - 0.05 + i * 0.05, tx.t1 + 0.35 + i * 0.05, EZ.in);
        ln.style.transform = `translateY(${(1 - a) * 110 - b * 110}%)`;
      });
    }
    for (const tg of TAGS) {
      const vis = t >= tg.t0 && t <= tg.t1 + 0.4;
      tg.e.style.display = vis ? 'flex' : 'none'; if (!vis) continue;
      const a = tg.t0 < 0 ? 1 : ramp(t, tg.t0, tg.t0 + 0.4), b = ramp(t, tg.t1, tg.t1 + 0.35);
      tg.e.style.opacity = a * (1 - b); tg.e.style.transform = `translateX(-50%) translateY(${(1 - a) * -12}px)`;
    }
    desenhaFinal(t);
    fx(t);
  }

  function caixas(t) {
    renderAt(t);
    const out = [];
    const sc = ROOT.getBoundingClientRect().width / W;
    const add = (nome, tipo, e, extra = {}) => { if (!e || e.style.display === 'none') return; const b = e.getBoundingClientRect(); if (b.width < 1) return; out.push({ nome, tipo, x0: b.left / sc, y0: b.top / sc, x1: b.right / sc, y1: b.bottom / sc, ...extra }); };
    for (const p of PECAS) if (!p.filho && p.ultimo && p.ultimo.op > 0.02) add(p.id, 'peca', p.el, { blur: p.ultimo.blur, op: p.ultimo.op, k: p.ultimo.k, corpo: p.m.minFont * p.s * (p.ultimo.w / p.w), panorama: p.panorama });
    for (const tx of TEXTOS) if (tx.box.style.display !== 'none') { let i = 0; for (const ln of tx.linhas) { const st = getComputedStyle(ln).transform; add('texto', 'texto', ln, { px: tx.px, linha: i++, n: tx.linhas.length }); } }
    for (const tg of TAGS) if (tg.e.style.display !== 'none' && +tg.e.style.opacity > 0.5) add('etiqueta', 'tag', tg.e);
    if (F_EL.f.style.display !== 'none') { F_EL.linhas.forEach((l, i) => { if (+l.row.style.opacity > 0.5) { add('final-' + i, 'final', l.box); add('final-' + i, 'final', l.tx); } }); if (+F_EL.marca.style.opacity > 0.5) add('logo', 'final', F_EL.marca); if (+F_EL.pil.style.opacity > 0.5) add('pilula', 'final', F_EL.pil); }
    return out;
  }

  async function init(root, meta) {
    ROOT = root; META = meta;
    el('div', 'bg', ROOT, { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 900px 1200px at 540px 900px, #151515 0%, #0B0B0B 62%, #070707 100%)' });
    STAGE = el('div', 'palco3d', ROOT, { position: 'absolute', inset: 0, perspective: '2000px', perspectiveOrigin: '540px 900px' });
    FX = el('div', 'fx', ROOT, { position: 'absolute', inset: 0, pointerEvents: 'none' });
    monta(); montaFinal();
    await Promise.all([...ROOT.querySelectorAll('img')].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = () => i.decode().then(r, r); i.onerror = r; }))));
    await preparaCapa();
  }

  // ---------------- capa (canvas) ----------------
  let RECIBO = null, MARCA = null;
  async function preparaCapa() {
    const ld = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    RECIBO = await ld(META.c_recibo.png); MARCA = await ld('assets/fazlo-hospeda-logo-escura@3x.png');
  }
  function desenhaCapa(c, dy, cx) {
    const box = (nome, x0, y0, x1, y1) => cx.push({ nome, x0, y0: y0 + dy, x1, y1: y1 + dy });
    c.save(); c.translate(0, dy);
    // chip "A chegada"
    c.font = `800 40px ID`; const ct = 'A chegada', cw = c.measureText(ct).width + 96;
    c.beginPath(); c.roundRect(92, 0, cw, 72, 36); c.fillStyle = 'rgba(20,20,20,0.9)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(247,247,242,0.3)'; c.stroke();
    c.beginPath(); c.arc(92 + 40, 36, 10, 0, 7); c.fillStyle = C.limao; c.shadowColor = C.limao; c.shadowBlur = 16; c.fill(); c.shadowBlur = 0;
    c.fillStyle = C.branco; c.textBaseline = 'middle'; c.fillText(ct, 92 + 62, 38);
    box('chip', 92, 0, 92 + cw, 72);
    // título
    c.textBaseline = 'alphabetic'; c.font = `900 124px ID`; if (c.letterSpacing !== undefined) c.letterSpacing = '-3px';
    c.fillStyle = C.branco; c.fillText('Do pedido', 88, 216); const w1 = c.measureText('Do pedido').width;
    c.fillText('ao ', 88, 344); const wa = c.measureText('ao ').width; c.fillStyle = C.limao; c.fillText('check-in.', 88 + wa, 344); const wb = c.measureText('check-in.').width;
    box('título', 88, 112, 88 + Math.max(w1, wa + wb), 372);
    if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
    // a peça real: o recibo de check-in, levemente inclinado, com sombra e brilho limão
    const m = META.c_recibo, s = 2.9, pd = 8 * s, w = m.w * s + 2 * pd, h = m.h * s + 2 * pd, x = 540 - w / 2, y = 440, rr = (m.tile.r || 14) * s;
    c.save(); c.translate(540, y + h / 2); c.rotate(-2.2 * Math.PI / 180);
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 70; c.shadowOffsetY = 30;
    c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, rr); c.fillStyle = '#FFFFFF'; c.fill(); c.shadowColor = 'transparent';
    c.save(); c.clip(); c.drawImage(RECIBO, -w / 2 + pd, -h / 2 + pd, w - 2 * pd, h - 2 * pd); c.restore();
    c.lineWidth = 5; c.strokeStyle = C.limao; c.shadowColor = 'rgba(175,250,39,0.45)'; c.shadowBlur = 40; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, rr); c.stroke();
    c.restore();
    const ext = Math.sin(2.2 * Math.PI / 180) * w / 2;
    box('recibo', x - 6, y - ext, x + w + 6, y + h + ext);
    // marca pequena
    const mw = 360, mh = mw * MARCA.height / MARCA.width, my = y + h + ext + 90;
    c.drawImage(MARCA, 540 - mw / 2, my, mw, mh); box('marca', 540 - mw / 2, my, 540 + mw / 2, my + mh);
    c.restore();
  }
  function capaGrade() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const cx0 = []; desenhaCapa(document.createElement('canvas').getContext('2d'), 0, cx0);
    const topo = Math.min(...cx0.map((b) => b.y0)), base = Math.max(...cx0.map((b) => b.y1)), dy = Math.round(960 - (topo + base) / 2);
    const g = c.createRadialGradient(540, 960, 40, 540, 960, 1150); g.addColorStop(0, '#161616'); g.addColorStop(0.6, '#0B0B0B'); g.addColorStop(1, '#070707');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const caixas = []; desenhaCapa(c, dy, caixas);
    return { png: cv.toDataURL('image/png'), caixas, bloco: { topo: topo + dy, base: base + dy, centro: (topo + base) / 2 + dy } };
  }

  window.REEL = {
    init, renderAt, caixas, capaGrade, get DURATION() { return DUR; },
    get E() { return Object.fromEntries(ETAPAS.map((e) => [e.nome, e.t0])); },
    etapas: () => ETAPAS, destaques: () => DESTAQUES.slice().sort((a, b) => a.t0 - b.t0), eventos: () => EVENTOS.slice().sort((a, b) => a.t - b.t),
    ideias: () => IDEIAS, valores: () => VALORES,
    pecas: () => PECAS.filter((p) => !p.filho).map((p) => ({ id: p.id, s: p.s, minFont: p.m.minFont, w: p.w, h: p.h, entrou: p.entrou, saiu: p.saiu, panorama: p.panorama })),
    textos: () => TEXTOS.map((t) => ({ txt: t.txt, t0: t.t0, t1: t.t1, px: t.px, linhas: t.linhas.length, final: !!t.final })),
  };
})();
