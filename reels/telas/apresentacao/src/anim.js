/*
 * FAZLO Hospeda — reel de apresentação (telas inteiras em funcionamento, 9:16, sem voz).
 *
 * O palco é sempre a TELA INTEIRA do app (src/telas, renderizadas por scripts/telas.cjs) dentro de um celular de
 * moldura fina, em 3D leve. Nada é recortado para ficar solto: as janelas e folhas são a camada do próprio estado,
 * que sobe de baixo dentro da tela, na mesma posição do estado original.
 * O app funciona na frente de quem assiste: toques com onda limão nos botões reais (pelos ids), troca de tela
 * (empurrar), janela subindo, rolagem, campo sendo digitado, estados antes → depois.
 * Para ler, a câmera aproxima a região importante (o texto da tela ≥ 40 px no quadro). Por cima: chip da seção,
 * rótulos com linha limão, contorno de destaque e valores que saltam da tela e contam.
 * Determinístico: REEL.renderAt(t).
 */
(() => {
  const W = 1080, H = 1920;
  const C = { preto: '#0A0A0A', limao: '#AFFA27', branco: '#F7F7F2' };
  const S0 = 1.436;                // px por px CSS da tela, com o celular em repouso (tela de 560 px)
  const BZ = 13;                   // moldura
  const SW = 390 * S0, SH = 844 * S0, PW = SW + 2 * BZ, PH = SH + 2 * BZ;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const EZ = { lin: (u) => u, out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u, io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    expo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)), back: (u) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); } };
  const ramp = (t, a, b, e = EZ.out) => e(clamp((t - a) / (b - a), 0, 1));
  const el = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); if (parent) parent.appendChild(e); return e; };
  const brl = (cent) => { const neg = cent < 0; cent = Math.abs(Math.round(cent)); const r = Math.floor(cent / 100), c = cent % 100; return (neg ? '− ' : '') + 'R$ ' + String(r).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + String(c).padStart(2, '0'); };

  let ROOT, M, PHONE, SCREEN, FX, BG, GHOST, DUR = 88;
  const EV = [], CHAVES = [], SECOES = [], ROTULOS = [], VALORES = [], CHIPS = [], TEXTOS = [], TOQUES = [], USADAS = [];
  const ev = (t, tipo, d = {}) => EV.push({ t: +t.toFixed(3), tipo, ...d });

  // ---------------- dados das telas ----------------
  const R = (id, nome) => { const m = M[id]; if (m.ids[nome]) return { ...m.ids[nome] }; throw new Error(id + ': sem id ' + nome); };
  const TX = (id, txt, o = {}) => { const m = M[id]; const c = m.textos.filter((x) => !x.coberto && (x.t === txt || x.t.startsWith(txt)) && (o.y0 == null || x.y >= o.y0) && (o.y1 == null || x.y <= o.y1)); if (!c.length) throw new Error(id + ': sem texto ' + txt); return { ...c[o.i || 0] }; };
  const U = (...rs) => { const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y)), x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  const pad = (r, p, q = p) => ({ x: r.x - p, y: r.y - q, w: r.w + 2 * p, h: r.h + 2 * q });

  // ---------------- a tela do celular: camadas ----------------
  // cada BASE é uma tela inteira (fundo do estado), com rolagem; cada JANELA é a camada do estado por cima
  const BASES = [], JANELAS = [];
  function base(id, t0, trans = 'push', o = {}) {
    const m = M[id];
    const box = el('div', 'base', SCREEN, { position: 'absolute', left: 0, top: 0, width: SW + 'px', height: SH + 'px', overflow: 'hidden', display: 'none', background: '#F4F4F0' });
    const img = el('img', null, box, { position: 'absolute', left: 0, top: 0, width: SW + 'px', height: m.H * S0 + 'px', transformOrigin: '0 0' });
    img.src = m.tela; img.decoding = 'sync';
    const sombra = el('div', null, box, { position: 'absolute', inset: 0, background: '#000', opacity: 0, pointerEvents: 'none' });
    const b = { id, t0, t1: 1e9, trans, box, img, sombra, rolagem: [[0, o.y || 0]], furos: [] };
    const prev = BASES[BASES.length - 1]; if (prev) prev.t1 = t0 + 0.45;
    BASES.push(b); USADAS.push({ id, t: t0 }); ev(t0, trans === 'push' ? 'tela' : 'troca');
    return b;
  }
  function rola(b, t0, t1, y) { const last = b.rolagem[b.rolagem.length - 1][1]; b.rolagem.push([t0, last], [t1, y]); ev(t0, 'rola', { dur: t1 - t0 }); }
  function scrollDe(b, t) { const r = b.rolagem; let y = r[0][1]; for (let i = 1; i < r.length; i += 2) { const [a, y0] = r[i], [c, y1] = r[i + 1]; if (t >= c) y = y1; else if (t >= a) y = lerp(y0, y1, EZ.io((t - a) / (c - a))); } return y; }
  function janela(id, t0, o = {}) {
    const m = M[id], j = m.janela;
    const dim = el('div', null, SCREEN, { position: 'absolute', inset: 0, background: j.escuro || 'rgba(10,10,10,.4)', display: 'none' });
    const box = el('div', 'janela', SCREEN, { position: 'absolute', left: j.x * S0 + 'px', top: j.y * S0 + 'px', width: j.w * S0 + 'px', height: j.h * S0 + 'px', display: 'none', filter: 'drop-shadow(0 18px 40px rgba(0,0,0,.25))' });
    const img = el('img', null, box, { width: '100%', height: '100%' }); img.src = j.png; img.decoding = 'sync';
    const jn = { id, t0, t1: 1e9, box, dim, j, furos: [], anim: o.anim || 'sobe', troca: o.troca };
    const prev = JANELAS[JANELAS.length - 1]; if (prev && prev.t1 > t0) prev.t1 = o.troca ? t0 + 0.12 : t0;
    JANELAS.push(jn); USADAS.push({ id, t: t0, janela: true }); ev(t0, o.troca ? 'passo' : 'janela');
    return jn;
  }
  function fechaJanela(jn, t) { jn.t1 = t; jn.fecha = true; ev(t, 'janela_fecha'); }
  // campo sendo digitado (o campo foi fotografado vazio)
  function digita(jn, i, t0, passo = 0.09) {
    const f = M[jn.id].furos[i];
    const sp = el('div', null, jn.box, { position: 'absolute', left: (f.x - jn.j.x) * S0 + 'px', top: (f.y - jn.j.y) * S0 + 'px', height: f.h * S0 + 'px', lineHeight: f.h * S0 + 'px', font: `${f.peso} ${f.px * S0}px ${f.fam}`, color: f.cor, whiteSpace: 'pre' });
    jn.furos.push({ sp, valor: f.valor, t0, passo });
    for (let k = 1; k <= f.valor.length; k++) ev(t0 + k * passo, 'tecla');
    return t0 + f.valor.length * passo;
  }

  // ---------------- câmera ----------------
  const CAM = [];
  function cam(t, v, e = EZ.io) { const prev = CAM.length ? CAM[CAM.length - 1].v : { x: 540, y: 900, z: 0, Z: 1, rx: 0, ry: 0, rz: 0 }; CAM.push({ t, v: { ...prev, ...v }, e }); CAM.sort((a, b) => a.t - b.t); }
  function camEm(t) {
    let i = 0; while (i < CAM.length - 1 && t >= CAM[i + 1].t) i++;
    if (t <= CAM[0].t) return CAM[0].v; if (i === CAM.length - 1) return CAM[i].v;
    const a = CAM[i], b = CAM[i + 1], u = b.e((t - a.t) / (b.t - a.t)); const o = {}; for (const k in a.v) o[k] = lerp(a.v[k], b.v[k], u); return o;
  }
  // a câmera segura onde está e se move em ~0,45 s, no tempo da música
  function move(t, v, dur = 0.45, e = EZ.io) { const atual = { ...camEm(t) }; cam(t, atual, EZ.lin); cam(t + dur, { ...atual, ...v }, e); }
  // aproxima a região r (px CSS da tela visível) até o ponto (X, Y) do quadro, com zoom Z
  // menor corpo de texto da tela dentro da região (o que precisa ficar ≥ 40 px no quadro)
  function corpoMin(tela, r) { const ts = M[tela].textos.filter((x) => !x.coberto && x.x + x.w / 2 > r.x && x.x + x.w / 2 < r.x + r.w && x.y + x.h / 2 > r.y && x.y + x.h / 2 < r.y + r.h); return ts.length ? Math.min(...ts.map((x) => x.px)) : 99; }
  const ZOOMS = [];
  function foca(t, r, Z, X = 520, Y = 820, o = {}) {
    if (o.tela) { const need = 40.6 / (corpoMin(o.tela, o.chave || r) * S0); if (need > Z) Z = need; ZOOMS.push({ t, tela: o.tela, Z, largura: (o.chave || r).w * S0 * Z }); }
    const lx = BZ + (r.x + r.w / 2) * S0, ly = BZ + (r.y + r.h / 2) * S0;
    move(t, { x: X - (lx - PW / 2) * Z, y: Y - (ly - PH / 2) * Z, Z, rx: o.rx ?? 1.5, ry: o.ry ?? -2.5, rz: 0 }, o.dur ?? 0.45, o.e || EZ.io);
  }
  const repouso = (t, o = {}) => move(t, { x: 540, y: o.y ?? 905, Z: o.Z ?? 1, rx: o.rx ?? 4, ry: o.ry ?? -7, rz: o.rz ?? 0, z: 0 }, o.dur ?? 0.45, o.e || EZ.io);
  // projeção de um ponto da tela visível no quadro (sem a rotação leve; a rotação é ≤ 3° quando há leitura)
  function proj(t, u, v) { const c = camEm(t); return [c.x + (BZ + u * S0 - PW / 2) * c.Z, c.y + (BZ + v * S0 - PH / 2) * c.Z]; }

  // ---------------- overlays ----------------
  // momento-chave: região que precisa ser lida (o QA confere o corpo do texto da tela nela × zoom ≥ 40 px)
  function chave(nome, tela, r, t0, t1, o = {}) { CHAVES.push({ nome, tela, r, t0, t1, contorno: o.contorno !== false }); }
  function toque(t, tela, r, o = {}) { TOQUES.push({ t, tela, r, cor: o.cor }); ev(t, 'toque'); }
  function rotulo(txt, t0, t1, tela, ponto, X, Y, o = {}) {
    const e = el('div', 'rotulo', ROOT, { position: 'absolute', left: X + 'px', top: Y + 'px', transform: 'translate(-50%,-50%)', font: `800 ${o.px ?? 54}px 'ID'`, letterSpacing: '-0.01em', color: C.branco, background: 'rgba(12,12,12,0.92)', border: `2px solid ${C.limao}`, borderRadius: '22px', padding: '14px 26px', whiteSpace: 'nowrap', display: 'none', boxShadow: '0 18px 50px rgba(0,0,0,.5)' });
    e.innerHTML = txt.replace(/\*([^*]+)\*/g, `<span style="color:${C.limao}">$1</span>`);
    ROTULOS.push({ txt, t0, t1, tela, ponto, X, Y, e, px: o.px ?? 54 }); ev(t0, 'rotulo');
  }
  function valor(t0, t1, de, ate, tela, ponto, X, Y, o = {}) {
    const e = el('div', 'valor', ROOT, { position: 'absolute', left: X + 'px', top: Y + 'px', transform: 'translate(-50%,-50%)', font: `700 ${o.px ?? 104}px 'Geist Mono'`, letterSpacing: '-0.03em', color: o.cor || C.limao, whiteSpace: 'nowrap', display: 'none', textShadow: '0 10px 40px rgba(0,0,0,.6)', background: 'rgba(10,10,10,0.88)', padding: '6px 30px', borderRadius: '26px', border: '2px solid rgba(175,250,39,.35)' });
    VALORES.push({ t0, t1, de, ate, tela, ponto, X, Y, e, prefixo: o.prefixo || '', conta: o.conta ?? 0.7 }); ev(t0 + 0.15, 'conta', { dur: o.conta ?? 0.7 });
  }
  function chip(txt, t0, t1) {
    const e = el('div', 'chip', ROOT, { position: 'absolute', left: '540px', top: '176px', transform: 'translateX(-50%)', display: 'none', alignItems: 'center', gap: '14px', padding: '0 30px', height: '62px', borderRadius: '999px', background: 'rgba(14,14,14,0.92)', border: '2px solid rgba(247,247,242,0.18)', font: `800 34px 'ID'`, color: C.branco, whiteSpace: 'nowrap', boxSizing: 'border-box' });
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
    cam(0, { x: 540, y: 1120, z: -900, Z: 0.78, rx: 10, ry: -58, rz: 6 });
    cam(1.5, { x: 540, y: 1080, z: 0, Z: 0.86, rx: 5, ry: -10, rz: 0 }, EZ.out);
    cam(4.4, { x: 540, y: 1060, Z: 0.88, rx: 4, ry: -6 }, EZ.io);
    base('vg_load', -1, 'cut');
    base('vg', 2.25, 'fade'); ev(2.25, 'carregou');

    // ===== 5–13 · VISÃO GERAL =====
    secao('Visão geral', 5.0); chip('Visão geral', 5.0, 12.9);
    const vg = BASES[BASES.length - 1];
    const rRec = U(TX('vg', 'Recebido hoje'), R('vg', 'valor-recebido-hoje'));
    foca(4.6, pad(rRec, 10), 2.0, 520, 760, { tela: 'vg', chave: pad(R('vg', 'valor-recebido-hoje'), 4) });
    chave('Recebido hoje R$ 1.525,00', 'vg', pad(R('vg', 'valor-recebido-hoje'), 4), 5.4, 7.6);
    valor(5.5, 7.6, 0, 152500, 'vg', [R('vg', 'valor-recebido-hoje').x + 150, R('vg', 'valor-recebido-hoje').y + 23], 540, 1180);
    const n10 = M.vg.textos.find((x) => x.t === '10' && x.y > 430 && x.y < 480), n2 = M.vg.textos.find((x) => x.t === '2' && x.y > 430 && x.y < 480);
    const rCards = U(TX('vg', 'Hospedados'), n10, TX('vg', 'Saídas', { y0: 380, y1: 500 }), n2);
    foca(7.6, pad(rCards, 8), 2.05, 520, 820, { tela: 'vg', chave: pad(rCards, 4) });
    chave('Hospedados 10 · Saídas 2', 'vg', pad(rCards, 4), 8.1, 10.0);
    rotulo('10 *hospedados*', 8.2, 9.95, 'vg', [TX('vg', 'Hospedados').x + 30, TX('vg', 'Hospedados').y + 40], 330, 470);
    // rola até "Precisa de atenção"
    rola(vg, 9.95, 10.45, 300);
    const rAt = U(TX('vg', 'Precisa de atenção'), TX('vg', 'Check-out em atraso'), TX('vg', 'Saída prevista ontem'));
    const rAtV = { ...rAt, y: rAt.y - 300 };
    foca(10.0, pad(rAtV, 8), 1.95, 520, 860, { tela: 'vg', chave: pad(rAt, 4) });
    chave('Precisa de atenção · Check-out em atraso', 'vg', pad(rAt, 4), 10.47, 12.28, { rolagem: 300 });
    rotulo('Check-out *em atraso*', 10.6, 12.25, 'vg', [TX('vg', 'Check-out em atraso').x + 100, TX('vg', 'Check-out em atraso').y - 300 + 10], 540, 470);
    // vai até a barra de baixo e toca em Calendário
    rola(vg, 12.3, 12.6, M.vg.H - 844);
    repouso(12.3, { Z: 1, y: 905 });
    const tCal = TX('vg', 'Calendário', { y0: 1100 });
    toque(12.75, 'vg', { ...tCal, y: tCal.y - (M.vg.H - 844) });

    // ===== 13–21 · CALENDÁRIO (14 dias) =====
    secao('Calendário', 13.0); chip('Calendário · 14 dias', 13.0, 21.0);
    const cal = base('cal', 12.95, 'push');
    const g = R('cal', 'card-hoje');
    const ZC = 2.45;
    foca(13.3, { x: g.x, y: g.y, w: 200, h: 200 }, ZC, 470, 760);
    const bar = (nome) => { const c = M.cal.textos.find((x) => x.t === nome && x.y > g.y); return c; };
    const gu = bar('Gustavo'), ma = bar('Manutenção'), ra = bar('Rafael'), fe = bar('Fernanda'), ca = bar('Camila');
    chave('Calendário: Pré-reserva (Gustavo)', 'cal', pad(gu, 8), 13.85, 15.7, { contorno: true });
    rotulo('Pré-reserva', 13.9, 15.7, 'cal', [gu.x + gu.w / 2, gu.y + gu.h + 6], 640, 1300);
    foca(15.6, pad(U(ra, fe), 30), ZC, 520, 800);
    chave('Calendário: Hospedada (Rafael) · Confirmada (Fernanda)', 'cal', pad(U(ra, fe), 8), 16.1, 18.2);
    rotulo('Hospedada', 16.15, 18.2, 'cal', [ra.x + ra.w / 2, ra.y + ra.h + 8], 320, 1290);
    rotulo('Confirmada', 16.6, 18.2, 'cal', [fe.x + fe.w / 2, fe.y - 6], 700, 430);
    foca(18.1, pad(ma, 40), ZC, 520, 800);
    chave('Calendário: Bloqueada (Manutenção)', 'cal', pad(ma, 8), 18.6, 20.45);
    rotulo('Bloqueada', 18.65, 20.45, 'cal', [ma.x + ma.w / 2, ma.y + ma.h + 6], 540, 1290);
    repouso(20.5, { Z: 1 });
    toque(20.85, 'cal', R('cal', 'btn-nova-reserva'));

    // ===== 21–33 · NOVA RESERVA =====
    secao('Nova reserva', 21.0); chip('Nova reserva', 21.0, 32.9);
    const jc = janela('criar', 21.05);
    toque(21.6, 'criar', TX('criar', 'Nova reserva'));
    fechaJanela(jc, 21.78);
    base('nr1', 21.8, 'fade');
    janela('nr1', 21.8);
    const rLiv = U(TX('nr1', 'Livres no período'), TX('nr1', 'Quarto Bromélia', { y0: 600 }), TX('nr1', 'por diária', { y0: 640 }));
    foca(22.1, pad(U(TX('nr1', 'Passo'), TX('nr1', 'Livres no período')), 8), 1.5, 520, 700, { ry: -3 });
    const rLivL = pad(U(...M.nr1.textos.filter((x) => !x.coberto && Math.abs(x.y - TX('nr1', 'Livres no período').y) < 4)), 4);
    foca(22.7, pad(rLiv, 6), 2.25, 520, 860, { tela: 'nr1', chave: rLivL });
    chave('Livres no período · 5 de 10', 'nr1', rLivL, 23.2, 25.1);
    rotulo('Só o que *está livre*', 23.25, 25.1, 'nr1', [TX('nr1', 'Livres no período').x + 60, TX('nr1', 'Livres no período').y + 18], 540, 1300);
    const cont = (id) => TX(id, 'Continuar');
    toque(25.3, 'nr1', cont('nr1'));
    // passos 2 a 4, rápidos: a barra de progresso anda
    const rTop = (id) => pad(U(TX(id, 'Nova reserva'), TX(id, 'Passo')), 14, 26);
    foca(25.35, rTop('nr2'), 1.55, 520, 640, { ry: -2 });
    const j2 = janela('nr2', 25.5, { troca: true });
    digita(j2, 0, 25.75, 0.06);
    toque(26.85, 'nr2', cont('nr2'));
    janela('nr3', 27.05, { troca: true });
    toque(27.85, 'nr3', cont('nr3'));
    janela('nr4', 28.05, { troca: true });
    toque(28.85, 'nr4', cont('nr4'));
    janela('nr6', 29.05, { troca: true });
    const rRes = U(TX('nr6', 'Total da reserva'), TX('nr6', 'Sinal'), TX('nr6', 'Saldo'), R('nr6', 'valor-total-da-reserva'));
    foca(29.3, pad(rRes, 8), 2.1, 520, 820, { tela: 'nr6', chave: pad(rRes, 4) });
    chave('Resumo com sinal: total R$ 972,00 · sinal R$ 324,00 · saldo R$ 648,00', 'nr6', pad(rRes, 4), 29.8, 32.2);
    rotulo('Resumo *com sinal*', 29.85, 32.2, 'nr6', [TX('nr6', 'Total da reserva').x + 40, TX('nr6', 'Total da reserva').y - 4], 540, 430);
    repouso(32.25, { Z: 1 });
    toque(32.55, 'nr6', TX('nr6', 'Criar com sinal'));

    // ===== 33–41 · SINAL (Gustavo Ribeiro) =====
    secao('Sinal', 33.0); chip('Sinal', 33.0, 41.25);
    const jn6 = JANELAS[JANELAS.length - 1]; fechaJanela(jn6, 32.85);
    base('gus', 32.95, 'push');
    const rGus = U(TX('gus', 'Gustavo Ribeiro'), R('gus', 'status-chip-pre-reserva'), TX('gus', 'sem sinal'), R('gus', 'valor-saldo-em-aberto'), TX('gus', 'Total da reserva'));
    foca(33.3, pad(U(TX('gus', 'Gustavo Ribeiro'), R('gus', 'status-chip-pre-reserva'), TX('gus', 'sem sinal')), 12), 1.6, 540, 760, { tela: 'gus', chave: pad(U(TX('gus', 'Gustavo Ribeiro'), R('gus', 'status-chip-pre-reserva'), TX('gus', 'sem sinal')), 4) });
    chave('Gustavo Ribeiro · Pré-reserva · saldo R$ 1.050,00', 'gus', pad(U(TX('gus', 'Gustavo Ribeiro'), R('gus', 'status-chip-pre-reserva'), TX('gus', 'sem sinal')), 4), 33.8, 35.65);
    toque(35.85, 'gus', R('gus', 'btn-registrar-sinal'));
    const js = janela('sinal', 36.05);
    const rCampo = U(TX('sinal', 'Sinal', { y0: 260 }), R('sinal', 'campo-sinal'));
    const fIn = M.sinal.furos[0], rIn = { x: fIn.x - 30, y: fIn.y, w: 200, h: fIn.h };
    foca(36.25, pad(rCampo, 8), 2.15, 520, 760, { tela: 'sinal', chave: rIn });
    const tDig = digita(js, 0, 36.45, 0.11);
    chave('Sinal R$ 315,00', 'sinal', rIn, tDig, tDig + 1.85);
    const rDep = U(R('sinal', 'valor-chale-de-pedra-04'), TX('sinal', 'Depois: reserva confirmada'));
    foca(tDig + 1.8, pad(rDep, 10), 2.25, 520, 880, { tela: 'sinal', chave: pad(rDep, 4) });
    chave('Depois: reserva confirmada · saldo R$ 735,00', 'sinal', pad(rDep, 4), tDig + 2.3, 41.22);
    valor(tDig + 2.35, 41.2, 105000, 73500, 'sinal', [R('sinal', 'valor-chale-de-pedra-04').x + 40, R('sinal', 'valor-chale-de-pedra-04').y + 9], 540, 1270);
    rotulo('Saldo *calculado*', tDig + 2.4, 41.2, 'sinal', [TX('sinal', 'Depois: reserva confirmada').x + 60, TX('sinal', 'Depois: reserva confirmada').y - 4], 540, 450);

    // ===== 41–50 · CHECK-IN (Fernanda Lima) =====
    secao('Check-in', 41.3); chip('Check-in', 41.3, 49.9);
    fechaJanela(js, 41.25);
    base('ci', 41.3, 'push');
    const jci = janela('ci', 41.6);
    const rDad = U(TX('ci', 'Hóspede', { y0: 180 }), TX('ci', '17/10 → 20/10', { y0: 300 }), TX('ci', '***.903.118-**'));
    foca(41.8, pad(rDad, 8), 2.1, 520, 820, { tela: 'ci', chave: pad(rDad, 4) });
    chave('Conferência: Fernanda Lima · telefone · Chalé Ipê · 17/10 → 20/10', 'ci', pad(rDad, 4), 42.3, 44.25);
    rotulo('Confere *com o hóspede*', 42.35, 44.25, 'ci', [TX('ci', 'Hóspede', { y0: 180 }).x + 20, TX('ci', 'Hóspede', { y0: 180 }).y - 6], 540, 430);
    foca(44.3, pad(R('ci', 'btn-fazer-check-in-2'), 60, 120), 1.5, 520, 900);
    toque(44.75, 'ci', R('ci', 'btn-fazer-check-in-2'));
    janela('ci_feito', 44.95, { troca: true });
    const rRec2 = U(TX('ci_feito', 'Check-in feito'), TX('ci_feito', 'Recibo de check-in'), TX('ci_feito', 'Saída prevista'), TX('ci_feito', '12:00'));
    foca(45.05, pad(rRec2, 8), 2.0, 520, 840, { tela: 'ci_feito', chave: pad(U(TX('ci_feito', 'Recibo de check-in'), TX('ci_feito', 'Saída prevista'), TX('ci_feito', '12:00')), 4) });
    chave('Check-in feito · recibo: entrada 17/10 14:05, saída prevista 20/10 12:00', 'ci_feito', pad(U(TX('ci_feito', 'Recibo de check-in'), TX('ci_feito', 'Saída prevista'), TX('ci_feito', '12:00')), 4), 45.55, 47.4);
    rotulo('Recibo *de check-in*', 45.6, 47.4, 'ci_feito', [TX('ci_feito', 'Recibo de check-in').x + 40, TX('ci_feito', 'Recibo de check-in').y - 4], 540, 430);
    fechaJanela(JANELAS[JANELAS.length - 1], 47.45);
    base('ativas', 47.5, 'push');
    const rMar = U(TX('ativas', 'Mariana Costa'), R('ativas', 'status-chip-hospedada-3'), TX('ativas', 'Suíte Mirante · 2 hóspedes'));
    foca(47.75, pad(U(TX('ativas', 'Hospedagens'), rMar), 8), 1.45, 520, 860);
    foca(48.1, pad(rMar, 8), 2.25, 520, 860, { tela: 'ativas', chave: pad(rMar, 4) });
    chave('Hospedagens · Hospedada', 'ativas', pad(rMar, 4), 48.6, 50.5);
    rotulo('*Hospedada*', 48.65, 50.5, 'ativas', [R('ativas', 'status-chip-hospedada-3').x + 50, R('ativas', 'status-chip-hospedada-3').y - 4], 660, 470);

    // ===== 50–59 · COMANDA (Mariana Costa) =====
    secao('Comanda', 50.4); chip('Comanda', 50.4, 58.9);
    base('cmd', 50.45, 'push');
    const rTot = U(TX('cmd', 'Total', { y0: 220 }), TX('cmd', 'Saldo', { y0: 280 }), R('cmd', 'valor-saldo'), R('cmd', 'valor-total'));
    foca(50.75, pad(rTot, 8), 2.05, 520, 780, { tela: 'cmd', chave: pad(rTot, 4) });
    chave('Comanda: total R$ 287,00', 'cmd', pad(rTot, 4), 51.25, 53.2);
    valor(51.3, 53.2, 0, 28700, 'cmd', [R('cmd', 'valor-total').x + 40, R('cmd', 'valor-total').y + 9], 540, 1270);
    repouso(53.2, { Z: 1 });
    toque(53.55, 'cmd', R('cmd', 'btn-lancar-consumo'));
    const ja = janela('cmd_add', 53.75);
    const rAdd = U(TX('cmd_add', 'Água sem gás', { y0: 280 }), TX('cmd_add', 'Caipirinha', { y0: 380 }), TX('cmd_add', 'Lançar R$ 34,00'), TX('cmd_add', 'R$ 34,00'));
    const ag = TX('cmd_add', 'Água sem gás', { y0: 280 }), cp = TX('cmd_add', 'Caipirinha', { y0: 380 });
    const rItens = { x: 18, y: ag.y - 10, w: 354, h: cp.y + 44 - ag.y };
    const linhaQ = (n) => ({ x: 18, y: n.y - 3, w: 312, h: 24 });
    foca(53.95, rItens, 1.75, 540, 820, { tela: 'cmd_add', chave: linhaQ(ag) });
    chave('Lançar consumo: Água sem gás 2', 'cmd_add', linhaQ(ag), 54.45, 56.3);
    chave('Lançar consumo: Caipirinha 1', 'cmd_add', linhaQ(cp), 54.45, 56.3);
    foca(56.2, pad(TX('cmd_add', 'Lançar R$ 34,00'), 60, 40), 1.6, 520, 860);
    toque(56.55, 'cmd_add', TX('cmd_add', 'Lançar R$ 34,00'));
    fechaJanela(ja, 56.75);
    base('cmd_ok', 56.8, 'fade');
    const rTot2 = U(TX('cmd_ok', 'Total', { y0: 220 }), TX('cmd_ok', 'Saldo', { y0: 280 }), R('cmd_ok', 'valor-saldo'), R('cmd_ok', 'valor-total'));
    foca(56.95, pad(rTot2, 8), 2.05, 520, 780, { tela: 'cmd_ok', chave: pad(rTot2, 4) });
    chave('Produto adicionado: total atualizado R$ 321,00', 'cmd_ok', pad(rTot2, 4), 57.4, 59.4);
    valor(57.45, 59.4, 28700, 32100, 'cmd_ok', [R('cmd_ok', 'valor-total').x + 40, R('cmd_ok', 'valor-total').y + 9], 540, 1270, { conta: 0.6 });
    rotulo('Consumo *na conta*', 57.5, 59.4, 'cmd_ok', [TX('cmd_ok', 'Total', { y0: 220 }).x + 30, TX('cmd_ok', 'Total', { y0: 220 }).y - 4], 540, 450);

    // ===== 59–70 · CHECK-OUT (Mariana Costa) =====
    secao('Check-out', 59.4); chip('Check-out', 59.4, 69.9);
    base('ficha', 59.45, 'push');
    const rLock = U(TX('ficha', 'Saldo em aberto', { y0: 440, y1: 480 }), R('ficha', 'valor-saldo-em-aberto'), R('ficha', 'btn-fazer-check-out'), TX('ficha', 'Libera com saldo zero'));
    foca(59.75, pad(rLock, 8), 2.0, 520, 820, { tela: 'ficha', chave: pad(U(R('ficha', 'valor-saldo-em-aberto'), R('ficha', 'btn-fazer-check-out')), 4) });
    chave('Saldo em aberto R$ 412,00 · Fazer check-out bloqueado', 'ficha', pad(U(R('ficha', 'valor-saldo-em-aberto'), R('ficha', 'btn-fazer-check-out')), 4), 60.25, 62.3);
    rotulo('Só libera com *saldo zero.*', 60.3, 62.3, 'ficha', [R('ficha', 'btn-fazer-check-out').x + 160, R('ficha', 'btn-fazer-check-out').y + 46], 540, 1300);
    ev(60.4, 'cadeado');
    toque(62.55, 'ficha', R('ficha', 'btn-receber'));
    const jr = janela('receber', 62.75);
    const rRcb = U(TX('receber', 'Valor', { y0: 150 }), TX('receber', 'Saldo total'), TX('receber', 'PIX', { y0: 280 }), TX('receber', 'Dinheiro', { y0: 280 }));
    const rRcbK = pad(U(TX('receber', 'Valor', { y0: 150 }), TX('receber', '412,00', { y0: 200 }), TX('receber', 'PIX', { y0: 280 })), 4);
    foca(62.95, pad(rRcb, 8), 1.95, 520, 800, { tela: 'receber', chave: rRcbK });
    chave('Receber R$ 412,00 no PIX', 'receber', rRcbK, 63.45, 65.3);
    foca(65.2, pad(TX('receber', 'Confirmar'), 60, 40), 1.6, 520, 860);
    toque(65.55, 'receber', TX('receber', 'Confirmar'));
    fechaJanela(jr, 65.75);
    base('quitado', 65.8, 'fade'); ev(65.95, 'cadeado_abre');
    const rQ = U(TX('quitado', 'Saldo', { y0: 440, y1: 480 }), R('quitado', 'status-chip-quitado'), R('quitado', 'valor-saldo'), R('quitado', 'btn-fazer-check-out'));
    foca(65.95, pad(rQ, 8), 2.05, 520, 800, { tela: 'quitado', chave: pad(U(R('quitado', 'status-chip-quitado'), R('quitado', 'valor-saldo')), 4) });
    chave('Saldo R$ 0,00 · Quitado · check-out liberado', 'quitado', pad(U(R('quitado', 'status-chip-quitado'), R('quitado', 'valor-saldo')), 4), 66.45, 68.3);
    valor(66.5, 68.3, 41200, 0, 'quitado', [R('quitado', 'valor-saldo').x + 60, R('quitado', 'valor-saldo').y + 18], 540, 1290, { conta: 0.6 });
    toque(68.45, 'quitado', R('quitado', 'btn-fazer-check-out'));
    const je = janela('encerrar', 68.65);
    toque(69.1, 'encerrar', TX('encerrar', 'Fazer check-out', { y0: 600 }));
    fechaJanela(je, 69.3);
    base('recibo', 69.35, 'push');
    const rRe = U(TX('recibo', 'Recibo da estadia'), TX('recibo', 'Mariana Costa'), TX('recibo', 'Suíte Mirante'));
    foca(69.6, pad(rRe, 8), 1.9, 520, 780, { tela: 'recibo', chave: pad(rRe, 4) });
    chave('Recibo da estadia', 'recibo', pad(rRe, 4), 70.1, 71.95);

    // ===== 70–80 · CAIXA =====
    secao('Caixa', 71.9); chip('Caixa', 71.9, 80.9);
    base('cx', 71.95, 'push');
    const rForma = U(TX('cx', 'Recebido por forma de pagamento'), R('cx', 'valor-recebido-por-forma-de-pagamento'), R('cx', 'valor-cartao-de-debito'), TX('cx', 'Cartão de débito'));
    foca(72.2, pad(rForma, 8), 1.95, 520, 840, { tela: 'cx', chave: pad(rForma, 4) });
    chave('Recebido por forma de pagamento R$ 1.525,00', 'cx', pad(rForma, 4), 72.7, 74.55);
    toque(74.75, 'cx', R('cx', 'btn-fechar-caixa'));
    repouso(74.5, { Z: 1 });
    const jf = janela('cx_fechar', 74.95);
    const rFalta = U(TX('cx_fechar', 'Valor contado'), R('cx_fechar', 'campo-valor-contado'), R('cx_fechar', 'aviso-diferenca-falta-em-relacao-ao-es'));
    const rFaltaK = pad(U(...M.cx_fechar.textos.filter((x) => !x.coberto && x.y > 520 && x.y < 580)), 4);
    foca(75.15, pad(rFalta, 8), 2.0, 520, 800, { tela: 'cx_fechar', chave: rFaltaK });
    chave('Diferença: falta R$ 15,00 (valor contado R$ 270,00)', 'cx_fechar', rFaltaK, 75.65, 77.6);
    rotulo('Mostra se o *dinheiro bateu.*', 75.7, 77.6, 'cx_fechar', [R('cx_fechar', 'aviso-diferenca-falta-em-relacao-ao-es').x + 170, R('cx_fechar', 'aviso-diferenca-falta-em-relacao-ao-es').y + 66], 540, 1290);
    toque(77.85, 'cx_fechar', R('cx_fechar', 'btn-fechar-caixa-2'));
    fechaJanela(jf, 78.05);
    base('cx_fechado', 78.1, 'fade'); ev(78.15, 'gaveta');
    const rRes2 = U(TX('cx_fechado', 'Resumo do fechamento'), TX('cx_fechado', 'Diferença'), R('cx_fechado', 'valor-diferenca'));
    foca(78.25, pad(rRes2, 8), 1.95, 520, 800, { tela: 'cx_fechado', chave: pad(rRes2, 4) });
    chave('Caixa fechado · Diferença: falta R$ 15,00', 'cx_fechado', pad(rRes2, 4), 78.75, 80.6);
    valor(78.8, 80.6, 0, 1500, 'cx_fechado', [R('cx_fechado', 'valor-diferenca').x + 60, R('cx_fechado', 'valor-diferenca').y + 10], 530, 1290, { prefixo: 'Falta ', conta: 0.5, cor: '#F2C14E', px: 92 });

    // ===== 80–88 · FINAL PRÓPRIO =====
    secao('Final', 80.6);
    FINAL = { t0: 80.6, fila: [81.0, 84.0], volta: 82.3, texto: 82.9, marca: 84.3, pilula: 84.8 };
    move(80.6, { x: 540, y: 818, z: -200, Z: 0.62, rx: 2, ry: 0, rz: 0 }, 1.0);
    base('vg', 82.3, 'fade');
    texto('Reservas, hospedagens,\ncomanda e caixa.', FINAL.texto, 99, 214, 70);
    texto('*Num só lugar.*', FINAL.texto + 0.5, 99, 1236, 70, 180, 720);
    ev(81.0, 'fila'); ev(FINAL.texto, 'texto'); ev(FINAL.marca, 'marca'); ev(FINAL.pilula, 'pilula');
    DUR = 87.6;
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
  let MARK = null;
  function renderAt(t) {
    // câmera / celular
    const c = camEm(t);
    PHONE.style.transform = `translate3d(${c.x - PW / 2}px, ${c.y - PH / 2}px, ${c.z}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg) scale(${c.Z})`;
    // fundo: a tela anterior, grande e desfocada, por trás
    // bases
    let ativa = null;
    BASES.forEach((b, i) => {
      const vis = t >= b.t0 - 0.01 && t < b.t1;
      b.box.style.display = vis ? 'block' : 'none'; if (!vis) return;
      const y = scrollDe(b, t); b.img.style.transform = `translateY(${-y * S0}px)`;
      const u = ramp(t, b.t0, b.t0 + 0.42, EZ.out);
      let x = 0, op = 1;
      if (b.trans === 'push') x = (1 - u) * SW; else if (b.trans === 'fade') op = u;
      const nxt = BASES[i + 1];
      let sombra = 0;
      if (nxt && t >= nxt.t0 && nxt.trans === 'push') { const v = ramp(t, nxt.t0, nxt.t0 + 0.42, EZ.out); x -= v * SW * 0.3; sombra = 0.35 * v; }
      b.box.style.transform = `translateX(${x}px)`; b.box.style.opacity = op; b.sombra.style.opacity = sombra;
      b.box.style.zIndex = String(i + 1);
      if (t >= b.t0) ativa = b;
    });
    // janelas
    JANELAS.forEach((j, i) => {
      const vis = t >= j.t0 - 0.01 && t < j.t1 + (j.fecha ? 0.3 : 0);
      j.box.style.display = j.dim.style.display = vis ? 'block' : 'none'; if (!vis) return;
      j.box.style.zIndex = j.dim.style.zIndex = String(100 + i * 2); j.box.style.zIndex = String(101 + i * 2);
      let y = 0, op = 1, dim = 1;
      const prev = JANELAS[i - 1];
      if (j.troca && prev) { const u = ramp(t, j.t0, j.t0 + 0.22, EZ.out); op = u; y = (1 - u) * 18; }
      else { const u = ramp(t, j.t0, j.t0 + 0.38, EZ.out); y = (1 - u) * (SH - j.j.y * S0 + 40); dim = ramp(t, j.t0, j.t0 + 0.3); }
      if (j.fecha && t >= j.t1) { const u = ramp(t, j.t1, j.t1 + 0.3, EZ.in); y += u * (SH - j.j.y * S0 + 40); dim *= 1 - u; }
      const nxt = JANELAS[i + 1]; if (nxt && nxt.troca && t >= nxt.t0) { op *= 1 - ramp(t, nxt.t0, nxt.t0 + 0.12); }
      j.box.style.transform = `translateY(${y}px)`; j.box.style.opacity = op;
      j.dim.style.opacity = (j.troca ? 1 : dim); if (j.troca) j.dim.style.display = 'none';
      for (const f of j.furos) { const n = clamp(Math.floor((t - f.t0) / f.passo), 0, f.valor.length); const car = t >= f.t0 - 0.3 && t < f.t0 + f.valor.length * f.passo + 0.5 && Math.floor(t * 3) % 2 === 0; f.sp.innerHTML = f.valor.slice(0, n) + `<span style="display:inline-block;width:3px;height:0.9em;vertical-align:-0.1em;background:${car ? '#0A0A0A' : 'transparent'}"></span>`; }
    });
    // efeitos dentro da tela: toque (onda limão + o botão afunda) e contorno de destaque
    let html = '';
    for (const tq of TOQUES) {
      const d = t - tq.t; if (d < -0.18 || d > 0.6) continue;
      const r = tq.r, cx = (r.x + r.w / 2) * S0, cy = (r.y + r.h / 2) * S0;
      const press = d < 0 ? 0 : d < 0.1 ? d / 0.1 : 1 - (d - 0.1) / 0.3;
      html += `<div style="position:absolute;left:${r.x * S0}px;top:${r.y * S0}px;width:${r.w * S0}px;height:${r.h * S0}px;border-radius:${12 * S0}px;background:rgba(0,0,0,${0.16 * clamp(press, 0, 1)});box-shadow:inset 0 ${4 * clamp(press, 0, 1)}px ${10 * clamp(press, 0, 1)}px rgba(0,0,0,.25);transform:scale(${1 - 0.04 * clamp(press, 0, 1)})"></div>`;
      const dot = d < 0 ? 1 : 1 - ramp(t, tq.t + 0.15, tq.t + 0.45);
      html += `<div style="position:absolute;left:${cx - 22}px;top:${cy - 22}px;width:44px;height:44px;border-radius:50%;background:${C.limao};opacity:${0.85 * dot};transform:scale(${d < 0 ? 0.6 + (d + 0.18) / 0.18 * 0.4 : 1 - 0.2 * clamp(press, 0, 1)});box-shadow:0 0 18px ${C.limao}"></div>`;
      if (d >= 0) { const u = EZ.out(d / 0.6); html += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:10px;height:10px;margin:-5px;border-radius:50%;border:${5 * (1 - u)}px solid ${C.limao};opacity:${1 - u};transform:scale(${2 + u * 20})"></div>`; }
    }
    for (const k of CHAVES) {
      if (!k.contorno) continue; const a = ramp(t, k.t0 - 0.2, k.t0 + 0.15) * (1 - ramp(t, k.t1 - 0.1, k.t1 + 0.2)); if (a <= 0.01) continue;
      const b = BASES.find((x) => x.id === k.tela && t >= x.t0 && t < x.t1); const sy = b ? scrollDe(b, t) : 0;
      const r = k.r;
      html += `<div style="position:absolute;left:${r.x * S0 - 6}px;top:${(r.y - sy) * S0 - 6}px;width:${r.w * S0 + 12}px;height:${r.h * S0 + 12}px;border-radius:14px;border:3px solid rgba(175,250,39,${0.95 * a});box-shadow:0 0 0 ${2000}px rgba(10,10,10,${0.22 * a}), 0 0 26px rgba(175,250,39,${0.35 * a})"></div>`;
    }
    FXT.innerHTML = html;
    // fundo: brilho que acompanha o celular; a tela anterior desfocada atrás
    const sec = SECOES.filter((s) => t >= s.t0).pop();
    const ant = BASES.filter((b) => b.t1 <= t + 0.01 && b.t1 > t - 6).pop();
    if (ant && t < FINAL.t0) { GHOST.src = ant.img.src; GHOST.style.display = 'block'; GHOST.style.opacity = 0.16 * (1 - ramp(t, ant.t1 + 2, ant.t1 + 5)); } else GHOST.style.display = 'none';
    // overlays do quadro
    let svg = '';
    for (const r of ROTULOS) {
      const vis = t >= r.t0 && t <= r.t1 + 0.25; r.e.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      const a = ramp(t, r.t0, r.t0 + 0.3, EZ.back) * (1 - ramp(t, r.t1, r.t1 + 0.25));
      r.e.style.opacity = clamp(a, 0, 1); r.e.style.transform = `translate(-50%,-50%) scale(${0.85 + 0.15 * a})`;
      const b = BASES.find((x) => x.id === r.tela && t >= x.t0 && t < x.t1); const sy = b ? scrollDe(b, t) : 0;
      const p = proj(t, r.ponto[0], r.ponto[1] - sy);
      const lb = r.e.getBoundingClientRect(), sc = ROOT.getBoundingClientRect().width / W;
      const ex = clamp(p[0], lb.left / sc + 30, lb.right / sc - 30), ey = p[1] < r.Y ? lb.top / sc : lb.bottom / sc;
      const u = ramp(t, r.t0 + 0.1, r.t0 + 0.45);
      svg += `<line x1="${ex}" y1="${ey}" x2="${lerp(ex, p[0], u)}" y2="${lerp(ey, p[1], u)}" stroke="${C.limao}" stroke-width="3" opacity="${a}"/><circle cx="${p[0]}" cy="${p[1]}" r="${9 * u}" fill="${C.limao}" opacity="${a}"/><circle cx="${p[0]}" cy="${p[1]}" r="${18 * u}" fill="none" stroke="${C.limao}" stroke-width="2" opacity="${0.6 * a}"/>`;
    }
    for (const v of VALORES) {
      const vis = t >= v.t0 && t <= v.t1 + 0.25; v.e.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      const b = BASES.find((x) => x.id === v.tela && t >= x.t0 && t < x.t1); const sy = b ? scrollDe(b, t) : 0;
      const p = proj(t, v.ponto[0], v.ponto[1] - sy);
      const u = ramp(t, v.t0, v.t0 + 0.35, EZ.back), out = ramp(t, v.t1, v.t1 + 0.25, EZ.in);
      const x = lerp(p[0], v.X, clamp(u, 0, 1.05)), y = lerp(p[1], v.Y, clamp(u, 0, 1.05));
      v.e.style.left = x + 'px'; v.e.style.top = y + 'px'; v.e.style.opacity = clamp(clamp((u - 0.5) * 3.5, 0, 1) * (1 - out), 0, 1);   // aparece depois de sair da região lida
      v.e.style.transform = `translate(-50%,-50%) scale(${0.3 + 0.7 * clamp(u, 0, 1.1)})`;
      const k = EZ.out(clamp((t - v.t0 - 0.15) / v.conta, 0, 1)); v.e.textContent = v.prefixo + brl(lerp(v.de, v.ate, k));
      svg += `<line x1="${p[0]}" y1="${p[1]}" x2="${x}" y2="${y}" stroke="${C.limao}" stroke-width="2" opacity="${0.5 * (1 - out) * clamp(u, 0, 1)}"/>`;
    }
    SVG.innerHTML = svg;
    for (const ch of CHIPS) { const vis = t >= ch.t0 && t <= ch.t1 + 0.25; ch.e.style.display = vis ? 'flex' : 'none'; if (!vis) continue; const a = ramp(t, ch.t0, ch.t0 + 0.3) * (1 - ramp(t, ch.t1, ch.t1 + 0.25)); ch.e.style.opacity = a; ch.e.style.transform = `translateX(-50%) translateY(${(1 - a) * -14}px)`; }
    for (const tx of TEXTOS) {
      const vis = t >= tx.t0 && t <= tx.t1 + 0.4; tx.box.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      tx.linhas.forEach((ln, i) => { const a = tx.t0 < 0 ? 1 : ramp(t, tx.t0 + i * 0.08, tx.t0 + i * 0.08 + 0.45, EZ.expo); const b = ramp(t, tx.t1, tx.t1 + 0.35, EZ.in); ln.style.transform = `translateY(${(1 - a) * 110 - b * 110}%)`; });
    }
    desenhaFinal(t);
  }

  // caixas do quadro para o QA: celular, rótulos, valores, chip, textos, marca e pílula; e o estado de cada momento-chave
  function caixas(t) {
    renderAt(t);
    const sc = ROOT.getBoundingClientRect().width / W, out = [];
    const add = (nome, tipo, e, extra = {}) => { if (!e || e.style.display === 'none' || +(e.style.opacity || 1) < 0.05) return; const b = e.getBoundingClientRect(); out.push({ nome, tipo, x0: b.left / sc, y0: b.top / sc, x1: b.right / sc, y1: b.bottom / sc, op: +(e.style.opacity || 1), ...extra }); };
    add('celular', 'celular', PHONE);
    for (const r of ROTULOS) add(r.txt, 'rotulo', r.e, { px: r.px });
    for (const v of VALORES) add(v.e.textContent, 'valor', v.e);
    for (const c of CHIPS) add(c.txt, 'chip', c.e);
    for (const tx of TEXTOS) if (tx.box.style.display !== 'none') tx.linhas.forEach((l) => add(tx.txt, 'texto', l, { px: tx.px }));
    add('marca', 'final', F_EL.marca); add('pilula', 'final', F_EL.pil);
    const c = camEm(t);
    const chaves = CHAVES.filter((k) => t >= k.t0 && t <= k.t1).map((k) => { const b = BASES.find((x) => x.id === k.tela && t >= x.t0 && t < x.t1) || BASES.find((x) => t >= x.t0 && t < x.t1); const sy = b ? scrollDe(b, t) : 0; const p0 = proj(t, k.r.x, k.r.y - sy), p1 = proj(t, k.r.x + k.r.w, k.r.y + k.r.h - sy); return { nome: k.nome, tela: k.tela, r: k.r, Z: c.Z, s: S0 * c.Z, x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1], rx: c.rx, ry: c.ry }; });
    return { caixas: out, chaves, cam: c };
  }

  let FXT, SVG;
  async function init(root, meta) {
    ROOT = root; M = meta;
    BG = el('div', 'bg', ROOT, { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 900px 1300px at 540px 900px, #171717 0%, #0B0B0B 60%, #060606 100%)' });
    el('div', 'textura', ROOT, { position: 'absolute', inset: 0, opacity: 0.35, backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 26px)' });
    el('div', 'luz', ROOT, { position: 'absolute', left: '-200px', top: '300px', width: '1480px', height: '1300px', background: 'radial-gradient(circle at 50% 45%, rgba(175,250,39,0.085), rgba(175,250,39,0) 60%)' });
    GHOST = el('img', 'anterior', ROOT, { position: 'absolute', left: '90px', top: '-160px', width: '900px', filter: 'blur(22px)', opacity: 0, display: 'none' });
    const cena = el('div', 'cena', ROOT, { position: 'absolute', inset: 0, perspective: '2400px', perspectiveOrigin: '540px 900px' });
    PHONE = el('div', 'celular', cena, { position: 'absolute', left: 0, top: 0, width: PW + 'px', height: PH + 'px', borderRadius: '70px', background: 'linear-gradient(145deg, #2a2a2a, #121212 40%, #0c0c0c)', boxShadow: '0 60px 140px rgba(0,0,0,0.75), 0 0 0 2px rgba(255,255,255,0.10), inset 0 0 0 2px rgba(255,255,255,0.05)', transformOrigin: '50% 50%' });
    SCREEN = el('div', 'tela', PHONE, { position: 'absolute', left: BZ + 'px', top: BZ + 'px', width: SW + 'px', height: SH + 'px', borderRadius: '57px', overflow: 'hidden', background: '#F4F4F0', isolation: 'isolate' });
    FXT = el('div', 'efeitos', SCREEN, { position: 'absolute', inset: 0, zIndex: 900, pointerEvents: 'none' });
    SVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); SVG.setAttribute('width', W); SVG.setAttribute('height', H); Object.assign(SVG.style, { position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }); ROOT.appendChild(SVG);
    monta(); montaFinal();
    await Promise.all([...ROOT.querySelectorAll('img')].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = () => i.decode().then(r, r); i.onerror = r; }))));
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
    secoes: () => SECOES, chaves: () => CHAVES.map((k) => ({ nome: k.nome, tela: k.tela, r: k.r, t0: k.t0, t1: k.t1 })), eventos: () => EV.slice().sort((a, b) => a.t - b.t),
    zooms: () => ZOOMS, rotulos: () => ROTULOS.map((r) => ({ txt: r.txt, t0: r.t0, t1: r.t1, px: r.px })), usadas: () => USADAS,
  };
})();
