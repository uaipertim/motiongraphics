/*
 * FAZLO Hospeda — reel de apresentação (telas inteiras em funcionamento, 9:16, sem voz).
 *
 * O palco é sempre a TELA INTEIRA do app (src/telas, renderizadas por scripts/telas.cjs) dentro de um celular de
 * moldura fina, em 3D leve. Em 1× o celular fica inteiro (moldura de ~570 px, y ~302–1507); em 6 momentos-chave a
 * câmera aproxima até 1,3× por ~2 s, com a largura da tela sempre ≥ 40 px dos lados e o elemento em foco inteiro.
 * Nada é recortado para ficar solto: janelas e folhas são a camada do próprio estado, que sobe na posição original.
 * O app funciona na frente de quem assiste: toques com onda limão nos botões reais (pelos ids), troca de tela,
 * janela subindo, rolagem, campos digitados no próprio HTML (um quadro renderizado por letra, com o cursor),
 * estados antes → depois.
 * Para os valores, uma LUPA: um balão sobre o celular, perto do elemento mas nunca em cima dele, ligado por uma
 * linha fina ao ponto, que mostra o elemento inteiro ampliado (texto ≥ 40 px), com o rótulo nas palavras exatas
 * da tela. O contorno limão usa o retângulo real do elemento (getBoundingClientRect do bloco inteiro), +12 px.
 * O chip da seção fica sempre acima do celular, fora da tela do app. Determinístico: REEL.renderAt(t).
 */
(() => {
  const W = 1080, H = 1920;
  const C = { preto: '#0A0A0A', limao: '#AFFA27', branco: '#F7F7F2' };
  const S0 = 1.436;                // px por px CSS da tela, com o celular em 1,0×
  const BZ = 13;                   // moldura
  const SW = 390 * S0, SH = 844 * S0, PW = SW + 2 * BZ, PH = SH + 2 * BZ;
  const FOLGA = 12;   // folga do contorno, em px da tela
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const EZ = { lin: (u) => u, out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u, io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    expo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)), back: (u) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); } };
  const ramp = (t, a, b, e = EZ.out) => e(clamp((t - a) / (b - a), 0, 1));
  const el = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); if (parent) parent.appendChild(e); return e; };

  let ROOT, M, PHONE, SCREEN, FXT, SVG, BG, GHOST, PROBE, DUR = 88;
  const EV = [], CHAVES = [], SECOES = [], LUPAS = [], CONTORNOS = [], CHIPS = [], TEXTOS = [], TOQUES = [], USADAS = [];
  const ev = (t, tipo, d = {}) => EV.push({ t: +t.toFixed(3), tipo, ...d });

  // ---------------- dados das telas ----------------
  const R = (id, nome) => { const m = M[id]; if (m.ids[nome]) return { ...m.ids[nome] }; throw new Error(id + ': sem id ' + nome); };
  const TX = (id, txt, o = {}) => { const m = M[id]; const ok = (x) => !x.coberto && (o.y0 == null || x.y >= o.y0) && (o.y1 == null || x.y <= o.y1); const c = m.textos.filter((x) => ok(x) && x.t === txt).concat(m.textos.filter((x) => ok(x) && x.t !== txt && x.t.startsWith(txt))); if (!c.length) throw new Error(id + ': sem texto ' + txt); return { ...c[o.i || 0] }; };
  const ELM = (id, nome) => { const e = (M[id].elementos || {})[nome]; if (!e) throw new Error(id + ': sem elemento ' + nome); return e; };

  // ---------------- a tela do celular: camadas ----------------
  const BASES = [], JANELAS = [];
  function base(id, t0, trans = 'push', o = {}) {
    const m = M[id];
    const box = el('div', 'base', SCREEN, { position: 'absolute', left: 0, top: 0, width: SW + 'px', height: SH + 'px', overflow: 'hidden', display: 'none', background: '#F4F4F0' });
    const img = el('img', null, box, { position: 'absolute', left: 0, top: 0, width: SW + 'px', height: m.H * S0 + 'px', transformOrigin: '0 0' });
    img.src = m.tela; img.decoding = 'sync';
    const sombra = el('div', null, box, { position: 'absolute', inset: 0, background: '#000', opacity: 0, pointerEvents: 'none' });
    const b = { id, t0, t1: 1e9, trans, box, img, sombra, rolagem: [[0, o.y || 0]] };
    const prev = BASES[BASES.length - 1]; if (prev) prev.t1 = t0 + 0.45;
    BASES.push(b); USADAS.push({ id, t: t0 }); ev(t0, trans === 'push' ? 'tela' : 'troca');
    return b;
  }
  function rola(b, t0, t1, y) { const last = b.rolagem[b.rolagem.length - 1][1]; b.rolagem.push([t0, last], [t1, y]); ev(t0, 'rola', { dur: t1 - t0 }); }
  function scrollDe(b, t) { const r = b.rolagem; let y = r[0][1]; for (let i = 1; i < r.length; i += 2) { const [a, y0] = r[i], [c, y1] = r[i + 1]; if (t >= c) y = y1; else if (t >= a) y = lerp(y0, y1, EZ.io((t - a) / (c - a))); } return y; }
  const baseEm = (t, id) => BASES.find((x) => (!id || x.id === id) && t >= x.t0 && t < x.t1);
  function janela(id, t0, o = {}) {
    const m = M[id], j = m.janela;
    const dim = el('div', null, SCREEN, { position: 'absolute', inset: 0, background: j.escuro || 'rgba(10,10,10,.4)', display: 'none' });
    const box = el('div', 'janela', SCREEN, { position: 'absolute', left: j.x * S0 + 'px', top: j.y * S0 + 'px', width: j.w * S0 + 'px', height: j.h * S0 + 'px', display: 'none', filter: 'drop-shadow(0 18px 40px rgba(0,0,0,.25))' });
    const img = el('img', null, box, { width: '100%', height: '100%' }); img.src = j.png; img.decoding = 'sync';
    // a digitação: o estado renderizado com o campo preenchido letra a letra (scripts/telas.cjs), na mesma posição
    const dig = el('div', null, box, { position: 'absolute', inset: 0, display: 'none', overflow: 'hidden', borderRadius: j.raio });
    const digImg = el('img', null, dig, { position: 'absolute', left: -j.x * S0 + 'px', top: -j.y * S0 + 'px', width: SW + 'px', height: SH + 'px' }); digImg.decoding = 'sync';
    const jn = { id, t0, t1: 1e9, box, dim, j, img, dig, digImg, anim: o.anim || 'sobe', troca: o.troca, digita: null };
    const prev = JANELAS[JANELAS.length - 1]; if (prev && prev.t1 > t0) prev.t1 = o.troca ? t0 + 0.12 : t0;
    JANELAS.push(jn); USADAS.push({ id, t: t0, janela: true }); ev(t0, o.troca ? 'passo' : 'janela');
    return jn;
  }
  function fechaJanela(jn, t) { jn.t1 = t; jn.fecha = true; ev(t, 'janela_fecha'); }
  function digita(jn, t0, passo = 0.09) {
    const q = M[jn.id].digita.quadros; const n = M[jn.id].digita.valor.length;
    jn.digita = { t0, passo, n, q, fim: t0 + n * passo };
    for (let k = 1; k <= n; k++) ev(t0 + k * passo, 'tecla');
    return t0 + n * passo;
  }
  // o quadro da digitação no instante t (cursor piscando no fim), ou null
  function quadroDig(jn, t) {
    const d = jn.digita; if (!d || t < d.t0 - 0.35) return null;
    if (t < d.fim) return d.q[clamp(Math.floor((t - d.t0) / d.passo), 0, d.n)].img;
    return Math.floor((t - d.fim) / 0.33) % 2 === 0 ? d.q[d.n].img : d.q[d.n + 1].img;
  }
  const janelaEm = (t, id) => JANELAS.find((x) => (!id || x.id === id) && t >= x.t0 && t < x.t1);

  // ---------------- câmera: o celular sempre inteiro ----------------
  const CAM = [];
  function cam(t, v, e = EZ.io) { const prev = CAM.length ? CAM[CAM.length - 1].v : { x: 540, y: 881, z: 0, Z: 1, rx: 0, ry: 0, rz: 0 }; CAM.push({ t, v: { ...prev, ...v }, e }); CAM.sort((a, b) => a.t - b.t); CAMFIM = Math.max(CAMFIM, t); }
  let CAMFIM = 0; const L_IN = 0.35, L_OUT = 0.2, AVISOS = [];
  function camEm(t) {
    let i = 0; while (i < CAM.length - 1 && t >= CAM[i + 1].t) i++;
    if (t <= CAM[0].t) return CAM[0].v; if (i === CAM.length - 1) return CAM[i].v;
    const a = CAM[i], b = CAM[i + 1], u = b.e((t - a.t) / (b.t - a.t)); const o = {}; for (const k in a.v) o[k] = lerp(a.v[k], b.v[k], u); return o;
  }
  function move(t, v, dur = 0.45, e = EZ.io) { const atual = { ...camEm(t) }; cam(t, atual, EZ.lin); cam(t + dur, { ...atual, ...v }, e); }
  // vista base (1×): o celular inteiro, moldura com ~566 px de largura, y ~302–1498; o chip acima (y 206–268)
  const ZB = 566 / PW, ZMAX = 1.3;
  const BASEV = { x: 540, y: 900, z: 0, Z: ZB, rx: 2, ry: -4, rz: 0 };
  const CHIP_TOPO = 206, CHIP_BASE = 268, RESP = 24, UTIL = [200, 1536], COL = [940, 1000];
  const TOPO_BASE = BASEV.y - PH * ZB / 2;
  const app = () => {};
  // aproximação curta (≤ 1,3×) num momento-chave: entra em 0,45 s, fica parada de t0 a t1, sai em 0,45 s
  const ZOOMS = []; let ZFIM = 0; const ZE = 0.45;
  function zoom(t0, t1, tela, nomes) {
    const es = nomes.map((n) => ELM(tela, n)), jan = es[0].janela;
    const b = jan ? null : BASES.filter((x) => x.id === tela).pop(); const sy = b ? scrollDe(b, t0) : 0;
    const u = { x0: Math.min(...es.map((e) => e.x)), y0: Math.min(...es.map((e) => e.y)) - sy, x1: Math.max(...es.map((e) => e.x + e.w)), y1: Math.max(...es.map((e) => e.y + e.h)) - sy };
    const Z = ZB * ZMAX, cx = (u.x0 + u.x1) / 2, cy = (u.y0 + u.y1) / 2;
    // centra no elemento; o celular sai só por cima ou por baixo, a tela fica ≥ 40 px dos lados e longe da coluna de botões
    const X = clamp(540 - (BZ + cx * S0 - PW / 2) * Z, 400, 570);
    const Y = clamp(868 - (BZ + cy * S0 - PH / 2) * Z, BASEV.y + PH * ZB / 2 - PH * Z / 2, BASEV.y - PH * ZB / 2 + PH * Z / 2);
    move(t0 - ZE, { x: X, y: Y, z: 0, Z, rx: 1, ry: -2, rz: 0 }, ZE);
    move(t1, BASEV, ZE);
    for (const n of nomes) contorno(tela, n, t0 - 0.2, t1);
    ZOOMS.push({ t0, t1, ini: t0 - ZE, fim: t1 + ZE, tela, nomes, u, escala: ZMAX });
    ZFIM = Math.max(ZFIM, t1 + ZE); ev(t0 - ZE, 'zoom'); ev(t1, 'zoom_sai');
  }
  const zoomEm = (t) => ZOOMS.find((z) => t >= z.ini && t <= z.fim);
  const projV = (v, u, w) => [v.x + (BZ + u * S0 - PW / 2) * v.Z, v.y + (BZ + w * S0 - PH / 2) * v.Z];
  const cruza = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0;
  function proj(t, u, v) { const c = camEm(t); return [c.x + (BZ + u * S0 - PW / 2) * c.Z, c.y + (BZ + v * S0 - PH / 2) * c.Z]; }

  // ---------------- lupa, contorno, toque, chip, textos ----------------
  // corpo mínimo do texto da tela dentro de um retângulo (px CSS)
  function corpoMin(tela, r) { const ts = M[tela].textos.filter((x) => !x.coberto && x.x + x.w / 2 >= r.x - 1 && x.x + x.w / 2 <= r.x + r.w + 1 && x.y + x.h / 2 >= r.y - 1 && x.y + x.h / 2 <= r.y + r.h + 1); return ts.length ? Math.min(...ts.map((x) => x.px)) : 99; }
  function contorno(tela, nome, t0, t1) { CONTORNOS.push({ tela, nome, e: ELM(tela, nome), t0, t1 }); }
  // lupas: [{ tela, el, rotulo }] lado a lado; t0 = quando a lupa está aberta e legível; t1 = quando começa a fechar
  function lupa(t0, t1, itens, o = {}) {
    const n = itens.length, disp = 984 - 24 * (n - 1);
    let gs = itens.map((it) => {
      const e = ELM(it.tela, it.el), cp = corpoMin(it.tela, { x: e.x, y: e.y, w: e.w, h: e.h });
      const pad = FOLGA / S0 + 4, cw = e.cw + 2 * pad, ch = e.ch + 2 * pad;
      const s = Math.min(Math.max(40.6 / cp, o.minS ?? 2.4), 420 / ch);
      return { ...it, e, cp, s, pad, cw, ch };
    });
    // a largura é dividida pelo que cada lupa precisa; se não couber, todas reduzem na mesma proporção
    const soma = gs.reduce((a, g) => a + g.cw * g.s + 32, 0), k = soma > disp ? (disp - 32 * n) / (soma - 32 * n) : 1;
    // o balão nunca fica mais estreito que o rótulo (Inter Display 800 52 px, medido com a fonte carregada)
    const mede = (txt) => { const c = (lupa.cv ||= document.createElement('canvas').getContext('2d')); c.font = "800 52px 'ID'"; return Math.ceil(c.measureText(txt).width) + 6; };
    gs = gs.map((g) => { const s = g.s * k; return { ...g, s, lw: Math.max(g.cw * s + 32, mede(g.rotulo) + 50), lh: g.ch * s + 32 + 78 }; });
    const alt = Math.max(...gs.map((g) => g.lh));
    const total = gs.reduce((a, g) => a + g.lw, 0) + 24 * (n - 1);
    const ta = Math.max(t0 - L_IN, ZFIM);
    if (ta > t0 - 0.2) AVISOS.push(`lupa em ${t0}: abre tarde (${ta.toFixed(2)})`);
    // o retângulo dos elementos no quadro (vista base), com o respiro
    const r = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    for (const g of gs) {
      const b = g.e.janela ? null : BASES.filter((x) => x.id === g.tela).pop(); const sy = b ? scrollDe(b, t0) : 0;
      const p0 = projV(BASEV, g.e.x, g.e.y - sy), p1 = projV(BASEV, g.e.x + g.e.w, g.e.y + g.e.h - sy);
      r.x0 = Math.min(r.x0, p0[0] - RESP - 8); r.y0 = Math.min(r.y0, p0[1] - RESP - 8); r.x1 = Math.max(r.x1, p1[0] + RESP + 8); r.y1 = Math.max(r.y1, p1[1] + RESP + 8);
    }
    const evita = o.evita || [];
    let best = null;
    for (let y = CHIP_BASE + RESP + 6; y + alt <= UTIL[1] - 6; y += 2) {
      let x0 = 540 - total / 2; const baixo = y + alt > COL[1] - 4;
      if (baixo) x0 = Math.min(x0, COL[0] - 8 - total);
      x0 = Math.max(x0, 44); const x1 = x0 + total;
      if (x1 > 1036 || (baixo && x1 > COL[0] - 8)) continue;
      const box = { x0, y0: y, x1, y1: y + alt };
      if (cruza(box, r) || evita.some((v) => cruza(box, v))) continue;
      const d = Math.abs(y + alt / 2 - (r.y0 + r.y1) / 2);
      if (!best || d < best.d) best = { x0, y, d };
    }
    if (!best) throw new Error('lupa sem lugar em ' + t0);
    const cima = best.y + alt / 2 < (r.y0 + r.y1) / 2;
    let x = best.x0;
    for (const g of gs) {
      const box = el('div', 'lupa', ROOT, { position: 'absolute', left: x + 'px', top: (cima ? best.y + alt - g.lh : best.y) + 'px', width: g.lw + 'px', height: g.lh + 'px', borderRadius: '28px', background: '#121212', border: `3px solid ${C.limao}`, boxSizing: 'border-box', boxShadow: '0 30px 80px rgba(0,0,0,.6), 0 0 40px rgba(175,250,39,.15)', display: 'none', transformOrigin: cima ? '50% 100%' : '50% 0%' });
      const rot = el('div', null, box, { position: 'absolute', left: '22px', top: '14px', right: '22px', font: `800 52px 'ID'`, letterSpacing: '-0.01em', color: C.branco, whiteSpace: 'nowrap', lineHeight: '58px' }); rot.textContent = g.rotulo;
      const jan = el('div', null, box, { position: 'absolute', left: (g.lw - 6 - g.cw * g.s) / 2 + 'px', top: '75px', width: (g.cw * g.s) + 'px', height: (g.ch * g.s) + 'px', borderRadius: '16px', overflow: 'hidden', background: '#F4F4F0' });
      // só o conteúdo do elemento; a folga em volta fica na cor de fundo (nada do vizinho aparece cortado)
      const clip = el('div', null, jan, { position: 'absolute', left: g.pad * g.s + 'px', top: g.pad * g.s + 'px', width: g.e.cw * g.s + 'px', height: g.e.ch * g.s + 'px', overflow: 'hidden' });
      const jimg = el('img', null, clip, { position: 'absolute', left: 0, top: 0, transformOrigin: '0 0' }); jimg.decoding = 'sync';
      const L = { ...g, box, rot, jan, jimg, x0: x, y0: cima ? best.y + alt - g.lh : best.y, cima, ta, t0, t1, alt };
      LUPAS.push(L); contorno(g.tela, g.el, t0 - 0.2, t1);
      x += g.lw + 24;
    }
    CHAVES.push({ nome: itens.map((i) => i.rotulo).join(' · '), itens: gs.map((g) => ({ tela: g.tela, el: g.el, rotulo: g.rotulo, s: g.s, cp: g.cp })), t0, t1 });
    ev(ta, 'lupa');
    return gs;
  }
  function toque(t, tela, r) { TOQUES.push({ t, tela, r }); ev(t, 'toque'); }
  function chip(txt, t0, t1) {
    const e = el('div', 'chip', ROOT, { position: 'absolute', left: '540px', top: CHIP_TOPO + 'px', transform: 'translateX(-50%)', display: 'none', alignItems: 'center', gap: '14px', padding: '0 30px', height: '62px', borderRadius: '999px', background: 'rgba(14,14,14,0.92)', border: '2px solid rgba(247,247,242,0.18)', font: `800 34px 'ID'`, color: C.branco, whiteSpace: 'nowrap', boxSizing: 'border-box' });
    el('span', null, e, { width: '14px', height: '14px', borderRadius: '50%', background: C.limao, boxShadow: `0 0 18px ${C.limao}` }); el('span', null, e).textContent = txt;
    CHIPS.push({ txt, t0, t1, e }); ev(t0, 'secao');
  }
  function texto(txt, t0, t1, y = 214, px = 76, x = 80, w = 920) {
    const box = el('div', 'texto', ROOT, { position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', textAlign: 'center', font: `900 ${px}px 'ID'`, lineHeight: '1.04', letterSpacing: '-0.025em', color: C.branco, display: 'none' });
    const linhas = txt.split('\n').map((ln) => { const mk = el('div', null, box, { overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em' }); const i = el('div', null, mk); i.innerHTML = ln.replace(/\*([^*]+)\*/g, `<span style="color:${C.limao}">$1</span>`); return i; });
    TEXTOS.push({ txt, t0, t1, box, linhas, px });
  }
  function secao(nome, t0) { SECOES.push({ nome, t0 }); }

  // ---------------- roteiro ----------------
  function monta() {
    // ===== 0–5 · ABERTURA =====
    secao('Abertura', 0);
    texto('Conheça o\n*FAZLO Hospeda.*', -1, 4.4, 150, 84);
    cam(0, { x: 540, y: 1040, z: -900, Z: 0.74, rx: 10, ry: -58, rz: 6 });
    cam(1.5, { x: 540, y: 1010, z: 0, Z: 0.8, rx: 5, ry: -10, rz: 0 }, EZ.out);
    cam(4.3, { x: 540, y: 1000, Z: 0.82, rx: 4, ry: -6 }, EZ.io);
    move(4.3, BASEV, 0.45);
    base('vg_load', -1, 'cut');
    base('vg', 2.25, 'fade'); ev(2.25, 'carregou');

    // ===== 5–13 · VISÃO GERAL =====
    secao('Visão geral', 5.0); chip('Visão geral', 4.6, 12.9);
    const vg = BASES[BASES.length - 1];
    lupa(5.15, 7.55, [{ tela: 'vg', el: 'recebido', rotulo: 'Recebido hoje' }]);
    lupa(7.85, 9.85, [{ tela: 'vg', el: 'hospedados', rotulo: 'Hospedados' }, { tela: 'vg', el: 'saidas', rotulo: 'Saídas' }]);
    rola(vg, 9.95, 10.45, 300);
    lupa(10.5, 12.3, [{ tela: 'vg', el: 'atencao', rotulo: 'Precisa de atenção' }]);
    rola(vg, 12.35, 12.65, M.vg.H - 844);
    const tCal = TX('vg', 'Calendário', { y0: 1100 });
    toque(12.8, 'vg', { ...tCal, y: tCal.y - (M.vg.H - 844) });

    // ===== 13–21 · CALENDÁRIO (14 dias) =====
    secao('Calendário', 13.0); chip('Calendário', 13.0, 21.0);
    base('cal', 12.95, 'push');
    lupa(13.7, 15.55, [{ tela: 'cal', el: 'gustavo', rotulo: 'Pré-reserva' }]);
    lupa(15.85, 17.7, [{ tela: 'cal', el: 'helena', rotulo: 'Hospedada' }, { tela: 'cal', el: 'fernanda', rotulo: 'Confirmada' }]);
    zoom(18.35, 20.15, 'cal', ['manutencao']);
    toque(20.85, 'cal', R('cal', 'btn-nova-reserva'));

    // ===== 21–33 · NOVA RESERVA =====
    secao('Nova reserva', 21.0); chip('Nova reserva', 21.05, 32.9);
    const jc = janela('criar', 21.05);
    toque(21.6, 'criar', TX('criar', 'Nova reserva'));
    fechaJanela(jc, 21.78);
    base('nr1', 21.8, 'fade');
    janela('nr1', 21.8);
    lupa(22.6, 24.9, [{ tela: 'nr1', el: 'livres', rotulo: 'Livres no período' }]);
    const cont = (id) => TX(id, 'Continuar');
    toque(25.4, 'nr1', cont('nr1'));
    const j2 = janela('nr2', 25.6, { troca: true });
    digita(j2, 25.8, 0.065);
    toque(26.95, 'nr2', cont('nr2'));
    janela('nr3', 27.15, { troca: true });
    toque(27.9, 'nr3', cont('nr3'));
    janela('nr4', 28.1, { troca: true });
    toque(28.85, 'nr4', cont('nr4'));
    janela('nr6', 29.05, { troca: true });
    lupa(29.65, 31.95, [{ tela: 'nr6', el: 'total', rotulo: 'Total da reserva' }]);
    toque(32.55, 'nr6', TX('nr6', 'Criar com sinal'));

    // ===== 33–41 · SINAL (Gustavo Ribeiro) =====
    secao('Sinal', 33.0); chip('Sinal', 33.0, 41.25);
    fechaJanela(JANELAS[JANELAS.length - 1], 32.85);
    base('gus', 32.95, 'push');
    lupa(33.6, 35.45, [{ tela: 'gus', el: 'chip', rotulo: 'Pré-reserva' }]);
    toque(35.95, 'gus', R('gus', 'btn-registrar-sinal'));
    const js = janela('sinal', 36.15);
    const tDig = digita(js, 36.55, 0.1);
    zoom(36.85, Math.max(38.65, tDig + 1.5), 'sinal', ['campo']);
    lupa(39.4, 41.2, [{ tela: 'sinal', el: 'depois', rotulo: 'Depois: reserva confirmada' }]);

    // ===== 41–51 · CHECK-IN (Fernanda Lima) =====
    secao('Check-in', 41.3); chip('Check-in', 41.3, 51.4);
    fechaJanela(js, 41.25);
    base('ci', 41.3, 'push');
    janela('ci', 41.6);
    lupa(42.2, 44.05, [{ tela: 'ci', el: 'hospede', rotulo: 'Hóspede' }, { tela: 'ci', el: 'telefone', rotulo: 'Telefone' }]);
    lupa(44.15, 45.95, [{ tela: 'ci', el: 'acomodacao', rotulo: 'Acomodação' }, { tela: 'ci', el: 'periodo', rotulo: 'Período' }]);
    toque(46.5, 'ci', R('ci', 'btn-fazer-check-in-2'));
    janela('ci_feito', 46.7, { troca: true });
    zoom(47.2, 48.75, 'ci_feito', ['recibo']);
    fechaJanela(JANELAS[JANELAS.length - 1], 49.05);
    base('ativas', 49.08, 'push');
    lupa(49.55, 51.4, [{ tela: 'ativas', el: 'chip', rotulo: 'Hospedada' }], {});

    // ===== 51–59 · COMANDA (Mariana Costa) =====
    const c0 = 51.45;
    secao('Comanda', c0); chip('Comanda', c0, c0 + 8.0);
    base('cmd', c0, 'push');
    lupa(c0 + 0.6, c0 + 2.45, [{ tela: 'cmd', el: 'total', rotulo: 'Total' }]);
    toque(c0 + 2.95, 'cmd', R('cmd', 'btn-lancar-consumo'));
    const ja = janela('cmd_add', c0 + 3.15);
    lupa(c0 + 3.75, c0 + 5.6, [{ tela: 'cmd_add', el: 'agua_qtd', rotulo: 'Água sem gás' }, { tela: 'cmd_add', el: 'caipirinha_qtd', rotulo: 'Caipirinha' }]);
    contorno('cmd_add', 'agua', c0 + 3.55, c0 + 5.6); contorno('cmd_add', 'caipirinha', c0 + 3.55, c0 + 5.6);
    toque(c0 + 6.05, 'cmd_add', TX('cmd_add', 'Lançar R$ 34,00'));
    fechaJanela(ja, c0 + 6.25);
    base('cmd_ok', c0 + 6.3, 'fade');
    zoom(c0 + 6.85, c0 + 8.55, 'cmd_ok', ['total']);

    // ===== 59–72 · CHECK-OUT (Mariana Costa) =====
    const o0 = c0 + 8.8;
    secao('Check-out', o0); chip('Check-out', o0, o0 + 13.4);
    base('ficha', o0, 'push');
    lupa(o0 + 0.6, o0 + 2.45, [{ tela: 'ficha', el: 'saldo', rotulo: 'Saldo em aberto' }]);
    lupa(o0 + 2.55, o0 + 4.4, [{ tela: 'ficha', el: 'botao', rotulo: 'Libera com saldo zero' }]);
    ev(o0 + 2.6, 'cadeado');
    toque(o0 + 4.85, 'ficha', R('ficha', 'btn-receber'));
    const jr = janela('receber', o0 + 5.05);
    lupa(o0 + 5.8, o0 + 7.6, [{ tela: 'receber', el: 'confirmar', rotulo: 'Receber pagamento' }]);
    toque(o0 + 7.95, 'receber', TX('receber', 'Confirmar'));
    fechaJanela(jr, o0 + 8.15);
    base('quitado', o0 + 8.2, 'fade'); ev(o0 + 8.35, 'cadeado_abre');
    zoom(o0 + 8.75, o0 + 10.6, 'quitado', ['saldo', 'chip']);
    toque(o0 + 11.05, 'quitado', R('quitado', 'btn-fazer-check-out'));
    const je = janela('encerrar', o0 + 11.25);
    toque(o0 + 11.75, 'encerrar', TX('encerrar', 'Fazer check-out', { y0: 600 }));
    fechaJanela(je, o0 + 11.95);
    base('recibo', o0 + 12.0, 'push');
    lupa(o0 + 12.55, o0 + 14.4, [{ tela: 'recibo', el: 'titulo', rotulo: 'Recibo da estadia' }]);

    // ===== 73–81 · CAIXA =====
    const x0 = o0 + 14.5;
    secao('Caixa', x0); chip('Caixa', x0, x0 + 8.0);
    base('cx', x0, 'push');
    lupa(x0 + 0.6, x0 + 2.45, [{ tela: 'cx', el: 'formas', rotulo: 'Recebido por forma de pagamento' }]);
    toque(x0 + 2.9, 'cx', R('cx', 'btn-fechar-caixa'));
    const jf = janela('cx_fechar', x0 + 3.1);
    zoom(x0 + 3.7, x0 + 5.55, 'cx_fechar', ['falta']);
    toque(x0 + 6.0, 'cx_fechar', R('cx_fechar', 'btn-fechar-caixa-2'));
    fechaJanela(jf, x0 + 6.2);
    base('cx_fechado', x0 + 6.25, 'fade'); ev(x0 + 6.3, 'gaveta');
    lupa(x0 + 6.8, x0 + 8.65, [{ tela: 'cx_fechado', el: 'diferenca', rotulo: 'Diferença' }]);

    // ===== FINAL PRÓPRIO =====
    const f0 = x0 + 8.75;
    secao('Final', f0);
    FINAL = { t0: f0, fila: [f0 + 0.4, f0 + 3.4], volta: f0 + 1.7, texto: f0 + 2.3, marca: f0 + 3.7, pilula: f0 + 4.2 };
    move(f0, { x: 540, y: 818, z: -200, Z: 0.62, rx: 2, ry: 0, rz: 0 }, 1.0);
    base('vg', f0 + 1.7, 'fade');
    texto('Reservas, hospedagens,\ncomanda e caixa.', FINAL.texto, 99, 214, 70);
    texto('*Num só lugar.*', FINAL.texto + 0.5, 99, 1236, 70, 180, 720);
    ev(FINAL.fila[0], 'fila'); ev(FINAL.texto, 'texto'); ev(FINAL.marca, 'marca'); ev(FINAL.pilula, 'pilula');
    DUR = +(FINAL.pilula + 2.3).toFixed(2);
  }
  let FINAL = null, F_EL = null;

  function montaFinal() {
    // a fila: as telas que apareceram passam, rápidas, por trás do celular
    const fila = el('div', 'fila', ROOT, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px', display: 'none' });
    BG.after(fila);
    const ids = ['vg', 'cal', 'nr6', 'gus', 'ci', 'ativas', 'cmd', 'ficha', 'quitado', 'recibo', 'cx', 'cx_fechado'];
    const cards = ids.map((id) => {
      const c = el('div', null, fila, { position: 'absolute', top: '0', left: '0', width: '300px', height: (844 * 300 / 390) + 'px', borderRadius: '30px', overflow: 'hidden', background: '#F4F4F0', boxShadow: '0 20px 60px rgba(0,0,0,.6)', border: '6px solid #161616' });
      const i = el('img', null, c, { width: '300px', display: 'block' }); i.src = M[id].tela;
      if (M[id].janela) { const j = M[id].janela; el('div', null, c, { position: 'absolute', inset: 0, background: j.escuro }); const ji = el('img', null, c, { position: 'absolute', left: j.x * 300 / 390 + 'px', top: j.y * 300 / 390 + 'px', width: j.w * 300 / 390 + 'px' }); ji.src = j.png; }
      return c;
    });
    const marca = el('img', null, ROOT, { position: 'absolute', left: (540 - 210) + 'px', top: '1346px', width: '420px', display: 'none' }); marca.src = 'assets/fazlo-hospeda-logo-escura@3x.png';
    const pil = el('div', null, ROOT, { position: 'absolute', left: '540px', top: '1432px', display: 'none', background: C.limao, color: '#0A0A0A', font: `900 42px 'ID'`, padding: '22px 42px', borderRadius: '999px', whiteSpace: 'nowrap', boxShadow: '0 16px 50px rgba(175,250,39,.25)' });
    pil.textContent = 'Chame no WhatsApp · link na bio';
    F_EL = { fila, cards, marca, pil };
  }
  function desenhaFinal(t) {
    const F = FINAL, e = F_EL;
    const vis = t >= F.fila[0] - 0.1 && t <= F.fila[1] + 0.4;
    e.fila.style.display = vis ? 'block' : 'none';
    if (vis) {
      const u = (t - F.fila[0]) / (F.fila[1] - F.fila[0]);
      e.cards.forEach((c, i) => {
        const x = 1180 - (u * 2.6 - i * 0.2) * 1300, y = 760 + Math.sin(i * 1.7) * 140;
        const fade = ramp(t, F.fila[1] - 0.5, F.fila[1] + 0.3);
        c.style.transform = `translate(${x}px, ${y - 300}px) rotate(${(i % 2 ? 4 : -4)}deg) scale(${0.9 + 0.15 * Math.cos(i)})`;
        c.style.opacity = clamp(1 - fade, 0, 1) * (x > -400 && x < 1300 ? 0.8 : 0); c.style.filter = 'blur(1.2px) brightness(0.8)';
      });
    }
    const mk = ramp(t, F.marca, F.marca + 0.5);
    e.marca.style.display = t >= F.marca ? 'block' : 'none'; e.marca.style.opacity = mk; e.marca.style.transform = `translateY(${(1 - mk) * 20}px)`;
    const pk = ramp(t, F.pilula, F.pilula + 0.5, EZ.back);
    e.pil.style.display = t >= F.pilula ? 'block' : 'none'; e.pil.style.opacity = clamp((t - F.pilula) / 0.15, 0, 1); e.pil.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * pk})`;
  }


  // ---------------- render ----------------
  function renderAt(t) {
    const c = camEm(t);
    PHONE.style.transform = `translate3d(${c.x - PW / 2}px, ${c.y - PH / 2}px, ${c.z}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg) scale(${c.Z})`;
    BASES.forEach((b, i) => {
      const vis = t >= b.t0 - 0.01 && t < b.t1;
      b.box.style.display = vis ? 'block' : 'none'; if (!vis) return;
      const y = scrollDe(b, t); b.img.style.transform = `translateY(${-y * S0}px)`;
      const u = ramp(t, b.t0, b.t0 + 0.42, EZ.out);
      let x = 0, op = 1;
      if (b.trans === 'push') x = (1 - u) * SW; else if (b.trans === 'fade') op = u;
      const nxt = BASES[i + 1]; let sombra = 0;
      if (nxt && t >= nxt.t0 && nxt.trans === 'push') { const v = ramp(t, nxt.t0, nxt.t0 + 0.42, EZ.out); x -= v * SW * 0.3; sombra = 0.35 * v; }
      b.box.style.transform = `translateX(${x}px)`; b.box.style.opacity = op; b.sombra.style.opacity = sombra; b.box.style.zIndex = String(i + 1);
    });
    JANELAS.forEach((j, i) => {
      const vis = t >= j.t0 - 0.01 && t < j.t1 + (j.fecha ? 0.3 : 0);
      j.box.style.display = j.dim.style.display = vis ? 'block' : 'none'; if (!vis) return;
      j.dim.style.zIndex = String(100 + i * 2); j.box.style.zIndex = String(101 + i * 2);
      let y = 0, op = 1, dim = 1;
      const prev = JANELAS[i - 1];
      if (j.troca && prev) { const u = ramp(t, j.t0, j.t0 + 0.22, EZ.out); op = u; y = (1 - u) * 18; }
      else { const u = ramp(t, j.t0, j.t0 + 0.38, EZ.out); y = (1 - u) * (SH - j.j.y * S0 + 40); dim = ramp(t, j.t0, j.t0 + 0.3); }
      if (j.fecha && t >= j.t1) { const u = ramp(t, j.t1, j.t1 + 0.3, EZ.in); y += u * (SH - j.j.y * S0 + 40); dim *= 1 - u; }
      const nxt = JANELAS[i + 1]; if (nxt && nxt.troca && t >= nxt.t0) op *= 1 - ramp(t, nxt.t0, nxt.t0 + 0.12);
      j.box.style.transform = `translateY(${y}px)`; j.box.style.opacity = op;
      j.dim.style.opacity = dim; if (j.troca) j.dim.style.display = 'none';
      const q = quadroDig(j, t);
      if (q) { if (j.dig.dataset.q !== q) { j.digImg.src = q; j.dig.dataset.q = q; } j.dig.style.display = 'block'; } else j.dig.style.display = 'none';
    });
    // dentro da tela: toque (onda limão + o botão afunda) e contorno do elemento inteiro
    let html = '';
    for (const tq of TOQUES) {
      const d = t - tq.t; if (d < -0.18 || d > 0.6) continue;
      const r = tq.r, cx = (r.x + r.w / 2) * S0, cy = (r.y + r.h / 2) * S0, press = clamp(d < 0 ? 0 : d < 0.1 ? d / 0.1 : 1 - (d - 0.1) / 0.3, 0, 1);
      html += `<div style="position:absolute;left:${r.x * S0}px;top:${r.y * S0}px;width:${r.w * S0}px;height:${r.h * S0}px;border-radius:${12 * S0}px;background:rgba(0,0,0,${0.16 * press});box-shadow:inset 0 ${4 * press}px ${10 * press}px rgba(0,0,0,.25);transform:scale(${1 - 0.04 * press})"></div>`;
      const dot = d < 0 ? 1 : 1 - ramp(t, tq.t + 0.15, tq.t + 0.45);
      html += `<div style="position:absolute;left:${cx - 22}px;top:${cy - 22}px;width:44px;height:44px;border-radius:50%;background:${C.limao};opacity:${0.85 * dot};transform:scale(${d < 0 ? 0.6 + (d + 0.18) / 0.18 * 0.4 : 1 - 0.2 * press});box-shadow:0 0 18px ${C.limao}"></div>`;
      if (d >= 0) { const u = EZ.out(d / 0.6); html += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:10px;height:10px;margin:-5px;border-radius:50%;border:${5 * (1 - u)}px solid ${C.limao};opacity:${1 - u};transform:scale(${2 + u * 20})"></div>`; }
    }
    for (const k of CONTORNOS) {
      const a = ramp(t, k.t0, k.t0 + 0.25) * (1 - ramp(t, k.t1, k.t1 + 0.25)); if (a <= 0.01) continue;
      const b = baseEm(t, k.tela); const sy = b && !k.e.janela ? scrollDe(b, t) : 0;
      const r = contornoRect(k.e, sy);
      html += `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;border-radius:${r.raio}px;border:3px solid rgba(175,250,39,${0.95 * a});box-sizing:border-box;box-shadow:0 0 0 2000px rgba(10,10,10,${0.18 * a}), 0 0 24px rgba(175,250,39,${0.35 * a})"></div>`;
    }
    FXT.innerHTML = html;
    // a tela anterior, desfocada, por trás
    const ant = BASES.filter((b) => b.t1 <= t + 0.01 && b.t1 > t - 6).pop();
    if (ant && t < FINAL.t0) { GHOST.src = ant.img.src; GHOST.style.display = 'block'; GHOST.style.opacity = 0.14 * (1 - ramp(t, ant.t1 + 2, ant.t1 + 5)); } else GHOST.style.display = 'none';
    // lupas (fora da tela, acima do celular) e a linha até o ponto
    let svg = '';
    for (const L of LUPAS) {
      const vis = t >= L.ta && t <= L.t1 + L_OUT; L.box.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      const a = ramp(t, L.ta, L.t0, EZ.out), out = ramp(t, L.t1, L.t1 + L_OUT, EZ.out);
      L.box.style.opacity = clamp(Math.min(a * 1.5, 1) * (1 - out), 0, 1); L.box.style.transform = `scale(${Math.min(1, 0.75 + 0.25 * a) - 0.12 * out})`;
      // o conteúdo: a imagem que a tela está mostrando agora (estado, janela ou o quadro da digitação), no lugar do elemento
      const e = L.e, s = L.s; let src, ox, oy, iw, ih;
      const jn = e.janela ? janelaEm(t, L.tela) : null; const q = jn ? quadroDig(jn, t) : null;
      if (q) { src = q; ox = 0; oy = 0; iw = 390; ih = 844; }
      else if (e.janela) { const j = M[L.tela].janela; src = j.png; ox = j.x; oy = j.y; iw = j.w; ih = j.h; }
      else { src = M[L.tela].tela; ox = 0; oy = 0; iw = 390; ih = M[L.tela].H; }
      if (L.jan.dataset.src !== src) { L.jimg.src = src; L.jan.dataset.src = src; }
      Object.assign(L.jimg.style, { width: iw * s + 'px', height: ih * s + 'px', left: -(e.cx - ox) * s + 'px', top: -(e.cy - oy) * s + 'px' });
      L.jan.style.backgroundColor = e.janela ? '#FFFFFF' : '#F4F4F0';
      // a linha: da base da lupa até o centro do elemento na tela
      const b = baseEm(t, L.tela); const sy = b && !e.janela ? scrollDe(b, t) : 0;
      const p = proj(t, e.x + e.w / 2, e.y + e.h / 2 - sy);
      const lx = L.x0 + L.lw / 2, ly = L.cima ? L.y0 + L.lh : L.y0;
      const op = clamp(a, 0, 1) * (1 - out), u = ramp(t, Math.min(L.ta + 0.15, L.t0 - 0.05), L.t0 + 0.15);
      svg += `<line x1="${lx}" y1="${ly}" x2="${lerp(lx, p[0], u)}" y2="${lerp(ly, p[1], u)}" stroke="${C.limao}" stroke-width="3" opacity="${op}"/><circle cx="${p[0]}" cy="${p[1]}" r="${8 * u}" fill="${C.limao}" opacity="${op}"/>`;
    }
    SVG.innerHTML = svg;
    for (const ch of CHIPS) { const vis = t >= ch.t0 && t <= ch.t1 + 0.25; ch.e.style.display = vis ? 'flex' : 'none'; if (!vis) continue; const a = ramp(t, ch.t0, ch.t0 + 0.3) * (1 - ramp(t, ch.t1, ch.t1 + 0.25)); const topo = c.y - PH * c.Z / 2; const f = clamp((topo - CHIP_BASE - RESP) / (TOPO_BASE - CHIP_BASE - RESP), 0, 1); ch.e.style.opacity = a * f; ch.e.style.display = a * f > 0.004 ? 'flex' : 'none'; ch.e.style.transform = `translateX(-50%) translateY(${(1 - a) * -6}px)`; }
    for (const tx of TEXTOS) {
      const vis = t >= tx.t0 && t <= tx.t1 + 0.4; tx.box.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      tx.linhas.forEach((ln, i) => { const a = tx.t0 < 0 ? 1 : ramp(t, tx.t0 + i * 0.08, tx.t0 + i * 0.08 + 0.45, EZ.expo); const b = ramp(t, tx.t1, tx.t1 + 0.35, EZ.in); ln.style.transform = `translateY(${(1 - a) * 110 - b * 110}%)`; });
    }
    desenhaFinal(t);
  }
  // o contorno: o retângulo real do elemento, 12 px de folga e o raio dele (px da tela, antes da escala do celular)
  function contornoRect(e, sy) { return { x: e.x * S0 - FOLGA, y: (e.y - sy) * S0 - FOLGA, w: e.w * S0 + 2 * FOLGA, h: e.h * S0 + 2 * FOLGA, raio: e.raio * S0 + FOLGA }; }

  // caixas do quadro para o QA
  function caixas(t) {
    renderAt(t);
    const sc = ROOT.getBoundingClientRect().width / W, out = [];
    const bx = (e) => { const b = e.getBoundingClientRect(); return { x0: b.left / sc, y0: b.top / sc, x1: b.right / sc, y1: b.bottom / sc }; };
    const add = (nome, tipo, e, extra = {}) => { if (!e || e.style.display === 'none' || +(e.style.opacity || 1) < 0.05) return; out.push({ nome, tipo, ...bx(e), op: +(e.style.opacity || 1), ...extra }); };
    add('celular', 'celular', PHONE); add('tela', 'tela', SCREEN);
    for (const c of CHIPS) add(c.txt, 'chip', c.e);
    for (const tx of TEXTOS) if (tx.box.style.display !== 'none') tx.linhas.forEach((l) => add(tx.txt, 'texto', l, { px: tx.px }));
    add('marca', 'final', F_EL.marca); add('pilula', 'final', F_EL.pil);
    const lupas = LUPAS.filter((L) => L.box.style.display !== 'none').map((L) => ({ tela: L.tela, el: L.el, rotulo: L.rotulo, s: L.s, cp: L.cp, op: +L.box.style.opacity, ...bx(L.box), jan: bx(L.jan), rotW: L.rot.scrollWidth, rotCabe: L.rot.clientWidth,
      // o conteúdo do elemento, em px da lupa: tem que caber inteiro na janela da lupa
      cont: { x0: (L.pad) * L.s, y0: (L.pad) * L.s, x1: (L.pad + L.e.cw) * L.s, y1: (L.pad + L.e.ch) * L.s }, janW: L.cw * L.s, janH: L.ch * L.s }));
    const contornos = CONTORNOS.filter((k) => t >= k.t0 && t <= k.t1).map((k) => { const b = baseEm(t, k.tela); const sy = b && !k.e.janela ? scrollDe(b, t) : 0; const r = contornoRect(k.e, sy); return { tela: k.tela, el: k.nome, contorno: r, elemento: { x: k.e.x * S0, y: (k.e.y - sy) * S0, w: k.e.w * S0, h: k.e.h * S0 } }; });
    // medida exata (com o 3D): um retângulo da tela (px CSS) no quadro
    const mede = (x, y, w, h) => { Object.assign(PROBE.style, { left: x * S0 + 'px', top: y * S0 + 'px', width: w * S0 + 'px', height: h * S0 + 'px' }); return bx(PROBE); };
    const syDe = (tela, e) => { if (e.janela) return 0; const b = baseEm(t, tela); return b ? scrollDe(b, t) : 0; };
    // os textos da tela visíveis neste quadro: cortados pela lateral (nunca) e por cima/baixo (só fora do foco, na aproximação)
    const c = camEm(t);
    const b = BASES.filter((x) => t >= x.t0 && t < x.t1).pop();
    let cortLat = 0, cortV = 0;
    if (b) { const sy = scrollDe(b, t); for (const x of M[b.id].textos) { if (x.coberto) continue; const yy = x.y - sy; if (yy + x.h < 0 || yy > 844) continue; const q = mede(x.x, yy, x.w, x.h); const dentro = q.x1 > 0 && q.x0 < W && q.y1 > 0 && q.y0 < H; if (!dentro) continue; if (q.x0 < 0 || q.x1 > W) cortLat++; if (q.y0 < 0 || q.y1 > H) cortV++; } }
    // a aproximação ativa: o elemento em foco e cada texto dele, medidos no quadro
    const z = zoomEm(t); let foco = null;
    if (z) {
      const sy = syDe(z.tela, ELM(z.tela, z.nomes[0]));
      const ts = M[z.tela].textos.filter((x) => !x.coberto && x.x + x.w / 2 >= z.u.x0 - 1 && x.x + x.w / 2 <= z.u.x1 + 1 && x.y + x.h / 2 >= z.u.y0 + sy - 1 && x.y + x.h / 2 <= z.u.y1 + sy + 1);
      foco = { tela: z.tela, nomes: z.nomes, t0: z.t0, t1: z.t1, ret: mede(z.u.x0, z.u.y0, z.u.x1 - z.u.x0, z.u.y1 - z.u.y0), textos: ts.map((x) => ({ t: x.t, ...mede(x.x, x.y - sy, x.w, x.h) })) };
    }
    // para cada lupa: o elemento que ela amplia, medido no quadro; e os toques que acontecem enquanto ela está aberta
    for (const L of lupas) { const LL = LUPAS.find((k) => k.tela === L.tela && k.el === L.el && t >= k.ta && t <= k.t1 + L_OUT); const sy = syDe(L.tela, LL.e); L.elemento = mede(LL.e.x, LL.e.y - sy, LL.e.w, LL.e.h); }
    const toques = TOQUES.filter((q) => t >= q.t - 0.18 && t <= q.t + 0.6).map((q) => ({ tela: q.tela, ...mede(q.r.x, q.r.y, q.r.w, q.r.h) }));
    const cortados = cortLat;
    return { caixas: out, lupas, contornos, cam: c, escala: c.Z / ZB, cortados, cortLat, cortV, foco, toques };
  }

  async function init(root, meta) {
    ROOT = root; M = meta;
    BG = el('div', 'bg', ROOT, { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 900px 1300px at 540px 900px, #171717 0%, #0B0B0B 60%, #060606 100%)' });
    el('div', 'textura', ROOT, { position: 'absolute', inset: 0, opacity: 0.35, backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 26px)' });
    el('div', 'luz', ROOT, { position: 'absolute', left: '-200px', top: '300px', width: '1480px', height: '1300px', background: 'radial-gradient(circle at 50% 45%, rgba(175,250,39,0.085), rgba(175,250,39,0) 60%)' });
    GHOST = el('img', 'anterior', ROOT, { position: 'absolute', left: '90px', top: '-160px', width: '900px', filter: 'blur(22px)', opacity: 0, display: 'none' });
    const cena = el('div', 'cena', ROOT, { position: 'absolute', inset: 0, perspective: '2400px', perspectiveOrigin: '540px 900px' });
    PHONE = el('div', 'celular', cena, { position: 'absolute', left: 0, top: 0, width: PW + 'px', height: PH + 'px', borderRadius: '70px', background: 'linear-gradient(145deg, #2a2a2a, #121212 40%, #0c0c0c)', boxShadow: '0 60px 140px rgba(0,0,0,0.75), 0 0 0 2px rgba(255,255,255,0.10), inset 0 0 0 2px rgba(255,255,255,0.05)', transformOrigin: '50% 50%' });
    SCREEN = el('div', 'tela', PHONE, { position: 'absolute', left: BZ + 'px', top: BZ + 'px', width: SW + 'px', height: SH + 'px', borderRadius: '57px', overflow: 'hidden', background: '#F4F4F0', isolation: 'isolate' });
    PROBE = el('div', 'sonda', SCREEN, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' });
    FXT = el('div', 'efeitos', SCREEN, { position: 'absolute', inset: 0, zIndex: 900, pointerEvents: 'none' });
    SVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); SVG.setAttribute('width', W); SVG.setAttribute('height', H); Object.assign(SVG.style, { position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }); ROOT.appendChild(SVG);
    monta(); montaFinal();
    // pré-carrega os quadros da digitação (usados como fundo da janela e da lupa)
    const pre = []; for (const k in M) for (const q of (M[k].digita?.quadros || [])) { const i = new Image(); i.src = q.img; pre.push(i.decode().catch(() => {})); }
    await Promise.all(pre.concat([...ROOT.querySelectorAll('img')].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = () => i.decode().then(r, r); i.onerror = r; })))));
    // as lupas usam as mesmas imagens como fundo: espera o decode delas também
    const bgs = new Set(); for (const k in M) { bgs.add(M[k].tela); if (M[k].janela) bgs.add(M[k].janela.png); }
    await Promise.all([...bgs].map((s) => { const i = new Image(); i.src = s; return i.decode().catch(() => {}); }));
  }

  // ---------------- capa: o celular com a Visão geral + "Conheça o FAZLO Hospeda." ----------------
  function capaGrade() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const g = c.createRadialGradient(540, 960, 40, 540, 960, 1150); g.addColorStop(0, '#171717'); g.addColorStop(0.6, '#0B0B0B'); g.addColorStop(1, '#060606'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const img = BASES.find((b) => b.id === 'vg').img;
    const desenha = (c, dy, cx) => {
      c.save(); c.translate(0, dy);
      c.textBaseline = 'alphabetic'; c.font = `900 104px ID`; if (c.letterSpacing !== undefined) c.letterSpacing = '-2.5px';
      c.fillStyle = C.branco; c.fillText('Conheça o', 90, 96); const w1 = c.measureText('Conheça o').width;
      c.fillStyle = C.limao; c.fillText('FAZLO Hospeda.', 90, 204); const w2 = c.measureText('FAZLO Hospeda.').width;
      cx.push({ nome: 'título', x0: 90, y0: dy + 10, x1: 90 + Math.max(w1, w2), y1: dy + 228 });
      // o celular inclinado, com a Visão geral (do topo até "Precisa de atenção")
      const s = 1.12, sw = 390 * s, sh = 640 * s, x = 540 - sw / 2 - 10, y = 290;
      c.save(); c.translate(x + sw / 2, y + sh / 2); c.rotate(-3 * Math.PI / 180);
      c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 80; c.shadowOffsetY = 40;
      c.beginPath(); c.roundRect(-sw / 2 - 12, -sh / 2 - 12, sw + 24, sh + 24, 56); c.fillStyle = '#151515'; c.fill(); c.shadowColor = 'transparent';
      c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.12)'; c.stroke();
      c.beginPath(); c.roundRect(-sw / 2, -sh / 2, sw, sh, 46); c.save(); c.clip();
      c.drawImage(img, 0, 0, img.naturalWidth, img.naturalWidth * 640 / 390, -sw / 2, -sh / 2, sw, sh); c.restore();
      c.restore();
      const ext = Math.sin(3 * Math.PI / 180) * (sw / 2 + 12);
      cx.push({ nome: 'celular', x0: x - 12 - ext, y0: dy + y - 12 - ext, x1: x + sw + 12 + ext, y1: dy + y + sh + 12 + ext });
      c.restore();
    };
    const c0 = []; desenha(document.createElement('canvas').getContext('2d'), 0, c0);
    const topo = Math.min(...c0.map((b) => b.y0)), base_ = Math.max(...c0.map((b) => b.y1)), dy = Math.round(960 - (topo + base_) / 2);
    const cx = []; desenha(c, dy, cx);
    return { png: cv.toDataURL('image/png'), caixas: cx, bloco: { topo: topo + dy, base: base_ + dy, centro: (topo + base_) / 2 + dy } };
  }


  window.REEL = {
    init, renderAt, caixas, capaGrade, get DURATION() { return DUR; },
    get E() { return Object.fromEntries(SECOES.map((s) => [s.nome, s.t0]).concat([['fim', DUR]])); },
    avisos: () => AVISOS, zooms: () => ZOOMS.map((z) => ({ t0: z.t0, t1: z.t1, ini: z.ini, fim: z.fim, tela: z.tela, nomes: z.nomes, escala: z.escala })), ZB, secoes: () => SECOES, eventos: () => EV.slice().sort((a, b) => a.t - b.t), usadas: () => USADAS,
    chaves: () => CHAVES, lupas: () => LUPAS.map((L) => ({ tela: L.tela, el: L.el, rotulo: L.rotulo, t0: L.t0, t1: L.t1, s: L.s, cp: L.cp })),
    contornos: () => CONTORNOS.map((k) => ({ tela: k.tela, el: k.nome, t0: k.t0, t1: k.t1 })),
  };
})();
