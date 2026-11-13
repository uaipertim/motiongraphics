/*
 * FAZLO Hospeda — "A caipirinha da piscina entrou na conta?" (9:16, sem narração; a mensagem vem de textos curtos na tela).
 *
 * Motor: o do educativo "fechar-caixa" (celular em 3D leve, elementos que SALTAM da tela real com o lugar de origem
 * marcado, elástico suave, sombra e perspectiva, recortes do próprio HTML em 4×). Aqui o começo é só gráfico — o cartão
 * da Caipirinha com o "?" e os cartões de consumo voando entre as etiquetas "Bar da piscina", "Frigobar" e "Restaurante",
 * todos recortados do HTML da comanda (08-comanda) — e o resto é a comanda real da Mariana Costa (02 → 03 → 04).
 * Os textos de tela usam a tipografia e o estilo da legenda aprovada (Inter Display 900, palavra-chave em limão),
 * centralizados abaixo do celular. Determinístico: REEL.renderAt(t).
 */
(() => {
  const W = 1080, H = 1920;
  const C = { preto: '#0A0A0A', limao: '#AFFA27', branco: '#F7F7F2', ambar: '#E8A317' };
  const S0 = 1.436, BZ = 13;
  const SW = 390 * S0, SH = 844 * S0, PW = SW + 2 * BZ, PH = SH + 2 * BZ;
  const ZB = 1140 / PH;                                        // vista base: o celular de y 216 a 1356 (moldura ~540 px)
  const BASEV = { x: 540, y: 216 + 1140 / 2, z: 0, Z: ZB, rx: 1.5, ry: -3, rz: 0 };
  const FORA = { ...BASEV, y: 2700, rx: 24, ry: -10, rz: 4 };  // o celular antes de entrar (abaixo do quadro)
  const K0 = S0 * ZB;                                          // px do quadro por px CSS, com o celular na vista base
  const CAP = { size: 64, lh: 74, y1: 1442, cx: 540 };          // textos de tela: as linhas da legenda aprovada (y 1442/1516)
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const EZ = { lin: (u) => u, out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u, io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    expo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)), quad: (u) => u * u,
    elastico: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(2, -8 * u) * Math.cos(u * Math.PI * 2.5)),
    back: (u) => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); } };
  const ramp = (t, a, b, e = EZ.out) => e(clamp((t - a) / (b - a)));
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));
  const el = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); if (parent) parent.appendChild(e); return e; };
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const img = (src, parent, css) => { const i = el('img', null, parent, css); i.decoding = 'sync'; i.src = src; return i; };

  let ROOT, M, PHONE, SCREEN, ROLA, FXT, PROBE, PROBE_V, SALTOS_EL, GRAF, FINAL_EL, CV, CX, DUR = 32;
  const EV = [], AVISOS = [];
  const ev = (t, tipo, d = {}) => EV.push({ t: +t.toFixed(3), tipo, ...d });
  const T_ = {};

  // ---------------- câmera ----------------
  const CAM = [];
  function cam(t, v, e = EZ.io) { const prev = CAM.length ? CAM[CAM.length - 1].v : BASEV; CAM.push({ t, v: { ...prev, ...v }, e }); CAM.sort((a, b) => a.t - b.t); }
  function camEm(t) {
    let i = 0; while (i < CAM.length - 1 && t >= CAM[i + 1].t) i++;
    if (t <= CAM[0].t) return CAM[0].v; if (i === CAM.length - 1) return CAM[i].v;
    const a = CAM[i], b = CAM[i + 1], u = b.e((t - a.t) / (b.t - a.t)); const o = {}; for (const k in a.v) o[k] = lerp(a.v[k], b.v[k], u); return o;
  }
  function move(t, v, dur = 0.5, e = EZ.io) { const atual = { ...camEm(t) }; cam(t, atual, EZ.lin); cam(t + dur, { ...atual, ...v }, e); }

  // ---------------- a tela: bases (página inteira, com rolagem), a folha 03, sobreposições ----------------
  const BASES = [];                                            // { id ('vazia' | 's02' | 's04'), t0, trans }
  function base(id, t0, trans = 'fade') { BASES.push({ id, t0, trans }); ev(t0, 'tela'); }
  const baseEm = (t) => BASES.filter((b) => b.t0 <= t).pop() || BASES[0];
  const ROL = [[0, 0]];                                        // rolagem da página: pares [t, y] (px CSS)
  function rola(t0, t1, y) { const y0 = ROL[ROL.length - 1][1]; ROL.push([t0, y0, t1, y]); ev(t0, 'rola', { dur: t1 - t0 }); }
  function rolEm(t) { let y = 0; for (const r of ROL) { if (r.length === 2) { y = r[1]; continue; } const [a, y0, b, y1] = r; if (t >= b) y = y1; else if (t >= a) y = lerp(y0, y1, EZ.io((t - a) / (b - a))); } return y; }
  const FOLHA = { abre: 1e9, fecha: 1e9 };
  const R = (tela, nome) => { const r = (M[tela].el || {})[nome]; if (!r) throw new Error(tela + ': sem ' + nome); return r; };

  const TOQUES = [], CONTORNOS = [];
  function toque(t, tela, nome, fixo = false) { TOQUES.push({ t, r: R(tela, nome), fixo }); ev(t, 'toque'); }
  function contorno(tela, nome, t0, t1) { CONTORNOS.push({ tela, nome, r: R(tela, nome), t0, t1 }); }

  // ---------------- saltos (o motor do fechar-caixa) ----------------
  // { id, tela, el, quadros (t -> img), troca {t, quadros2}, fundo, pad, f, alvo {cx, cy}, t0, tin, t1, tout, cor, rot, slot }
  const SALTOS = [];
  function salto(o) {
    const s = { tin: 0.45, tout: 0.42, pad: 0, f: 1.85, rot: { rx: 6, ry: -8, rz: -1.5 }, cor: C.limao, slot: '#FFFFFF', fundo: 'transparent', ...o };
    s.r = R(s.tela, s.el); s.w = s.r.w + 2 * s.pad; s.h = s.r.h + 2 * s.pad;
    SALTOS.push(s);
    ev(s.t0, 'salto', { id: s.id }); ev(s.t1, 'volta', { id: s.id }); ev(s.t1 + s.tout, 'encaixa', { id: s.id });
    if (s.troca) ev(s.troca.t, 'troca', { id: s.id });
    return s;
  }
  const fixo = (src) => () => src;
  const conta = (Q, a, b) => (t) => Q[Math.round(clamp((t - a) / (b - a)) * (Q.length - 1))].img;

  // ---------------- o começo gráfico: o cartão da Caipirinha, as etiquetas e os cartões em voo ----------------
  const ETIQ = {                                               // as etiquetas (chips da folha "Lançar consumo"), no quadro
    bar: { chip: 'chip_bar', x: 318, y: 420, rot: -5 }, frigobar: { chip: 'chip_frigobar', x: 770, y: 640, rot: 4 }, restaurante: { chip: 'chip_restaurante', x: 330, y: 960, rot: -3 },
  };
  const VOOS = [];                                             // os cartões de consumo: voam e encaixam nos lugares da comanda
  function voo(o) { VOOS.push({ s: 0.8, ...o, r: R('s02', o.item) }); ev(o.pousa, 'aterra'); if (o.nasce) ev(o.aparece, 'voo'); }

  // ---------------- textos de tela (o estilo da legenda aprovada) ----------------
  const TEXTOS = [];                                           // { t0, t1, linhas: [..], chaves: Set(palavras em limão) }
  function texto(t0, t1, linhas, chaves = []) { TEXTOS.push({ t0, t1, linhas, chaves: new Set(chaves) }); ev(t0, 'texto'); }

  // ---------------- roteiro ----------------
  function monta() {
    // ===== 1 · GANCHO (0–3,6 s): o cartão da Caipirinha sozinho no escuro, girando, com o "?" pulsando =====
    cam(0, FORA);
    texto(0, 3.6, ['A caipirinha da piscina', 'entrou na conta?'], ['entrou', 'na', 'conta?']);
    T_.gancho = { fim: 3.6 };
    ev(0.9, 'pulso'); ev(2.2, 'pulso');

    // ===== 2 · A DOR (3,6–8,8 s): as etiquetas espalhadas, os cartões desencontrados; um escapa e cai do quadro =====
    T_.dor = { ini: 3.6, etiq: 3.7, fim: 8.8, escapa: 6.7 };
    texto(3.65, 5.75, ['Bar, frigobar, restaurante…']);
    texto(5.75, 9.05, ['e cada um anota', 'de um jeito.'], ['cada', 'um', 'anota']);
    ev(3.7, 'etiqueta'); ev(3.9, 'voo'); ev(T_.dor.escapa, 'queda');

    // ===== 3 · TUDO NA COMANDA (8,8–15,3 s): o celular entra; os cartões encaixam como as linhas; o Total conta =====
    base('vazia', -1, 'corte');
    move(9.05, BASEV, 0.75, EZ.out); ev(9.05, 'entra');
    texto(9.45, 11.6, ['No FAZLO Hospeda,']);
    texto(11.6, 15.2, ['tudo cai na comanda', 'do hóspede.'], ['comanda', 'do', 'hóspede.']);
    // (as posições livres de cada cartão são calculadas em vooLivre; aqui, quando cada um encaixa)
    voo({ id: 'caipirinha', item: 'caipirinha', img: M.s02.recortes.caipirinha.img, aparece: 0, pousa: 9.8 });
    voo({ id: 'agua', item: 'agua', img: M.s02.recortes.agua.img, aparece: 3.9, pousa: 10.05 });
    rola(10.12, 10.62, 600);                                    // a lista rola: os outros lugares ficam à vista
    voo({ id: 'cerveja', item: 'cerveja', img: M.s02.recortes.cerveja.img, aparece: 4.05, pousa: 10.75, volta: true });
    voo({ id: 'risoto', item: 'risoto', img: M.s02.recortes.risoto.img, aparece: 4.2, pousa: 11.0 });
    voo({ id: 'suco', item: 'suco', img: M.s02.recortes.suco.img, aparece: 10.2, pousa: 11.25, nasce: 'frigobar' });
    voo({ id: 'cancelado', item: 'cancelado', img: M.s02.recortes.cancelado.img, aparece: 10.35, pousa: 11.5, nasce: 'frigobar' });
    T_.lista = { cheia: 12.0 };
    base('s02', T_.lista.cheia, 'corte');
    rola(12.05, 12.6, 0);
    const tT = 12.7;
    salto({ id: 'total', tela: 's02', el: 'total', quadros: conta(M.s02.conta_total, tT + 0.3, tT + 1.1), fundo: '#FFFFFF', pad: 8, f: 1.85,
      alvo: { cx: 540, cy: 420 }, t0: tT, t1: tT + 0.45 + 1.6, rot: { rx: 6, ry: -7, rz: -1 } });
    ev(tT + 0.3, 'conta', { dur: 0.8 });

    // ===== 4 · LANÇOU, SOMOU (15,3–24,4 s): "Lançar consumo" → folha 03 → 04; as linhas mudam; o Total conta até R$ 321,00 =====
    const tL = 15.25;
    toque(tL, 's02', 'lancar_consumo');
    FOLHA.abre = tL + 0.15; ev(FOLHA.abre, 'folha');
    const tL2 = FOLHA.abre + 1.05;
    toque(tL2, 's03', 'btn_lancar', true);
    FOLHA.fecha = tL2 + 0.15; ev(FOLHA.fecha, 'folha_fecha');
    base('s04', FOLHA.fecha + 0.1, 'fade');
    T_.t4 = tL;
    const tC = FOLHA.fecha + 0.45;
    salto({ id: 'caipirinha', tela: 's04', el: 'caipirinha', quadros: fixo(M.s02.recortes.caipirinha.img), troca: { t: tC + 0.95, img: M.s04.recortes.caipirinha.img }, f: 1.6,
      alvo: { cx: 540, cy: 600 }, t0: tC, t1: tC + 0.45 + 1.6, rot: { rx: 6, ry: 8, rz: 1.5 } });
    const tA = tC + 0.45 + 1.6 + 0.15;
    salto({ id: 'agua', tela: 's04', el: 'agua', quadros: fixo(M.s02.recortes.agua.img), troca: { t: tA + 0.95, img: M.s04.recortes.agua.img }, f: 1.6,
      alvo: { cx: 540, cy: 700 }, t0: tA, t1: tA + 0.45 + 1.6, rot: { rx: 6, ry: -8, rz: -1.5 } });
    const tT2 = tA + 0.45 + 1.6 + 0.15;
    salto({ id: 'total-321', tela: 's04', el: 'total', quadros: conta(M.s04.conta_total, tT2 + 0.3, tT2 + 1.0), fundo: '#FFFFFF', pad: 8, f: 1.85,
      alvo: { cx: 540, cy: 420 }, t0: tT2, t1: tT2 + 0.45 + 1.6, rot: { rx: 6, ry: 7, rz: 1 } });
    ev(tT2 + 0.3, 'conta', { dur: 0.7 });
    const fim4 = tT2 + 0.45 + 1.6 + 0.3;

    // ===== 5 · NADA SOME: o item cancelado salta =====
    const tR = fim4 + 0.05;
    texto(T_.t4, tR + 0.1, ['Lançou, somou.'], ['somou.']);
    rola(tR, tR + 0.5, 600);
    const tX = tR + 0.6;
    texto(tR + 0.1, tX + 0.45 + 1.6 + 0.4, ['Cancelou?', 'Continua registrado.'], ['Continua', 'registrado.']);
    salto({ id: 'cancelado', tela: 's04', el: 'cancelado', quadros: fixo(M.s04.recortes.cancelado.img), slot: '#F4F4F0', fundo: '#F4F4F0', f: 1.6,
      alvo: { cx: 540, cy: 760 }, t0: tX, t1: tX + 0.45 + 1.6, rot: { rx: 6, ry: 8, rz: 1.5 } });

    // ===== 6 · FECHAMENTO: o Saldo e o "Receber R$ 321,00" saltam juntos; o celular se afasta; a marca =====
    const tS0 = tX + 0.45 + 1.6 + 0.42 + 0.05;
    rola(tS0, tS0 + 0.5, 0);
    const tS = tS0 + 0.55;
    const T6 = { t0: tS0 + 0.1 };
    salto({ id: 'saldo', grupo: 'fechamento', tela: 's04', el: 'saldo', quadros: fixo(M.s04.recortes.saldo.img), fundo: '#FFFFFF', pad: 8, f: 1.85,
      alvo: { cx: 540, cy: 400 }, t0: tS, t1: tS + 0.45 + 1.6, rot: { rx: 6, ry: -7, rz: -1 } });
    salto({ id: 'receber', grupo: 'fechamento', tela: 's04', el: 'receber', quadros: fixo(M.s04.recortes.receber.img), f: 1.6, slot: '#F4F4F0',
      alvo: { cx: 540, cy: 1000 }, t0: tS + 0.12, t1: tS + 0.12 + 0.45 + 1.6, rot: { rx: 5, ry: 7, rz: 1 } });
    const tLonge = tS + 0.12 + 0.45 + 1.6 + 0.42 + 0.1;
    move(tLonge, { x: 540, y: 760, z: 0, Z: ZB * 0.56, rx: 2, ry: -2, rz: 0 }, 0.8, EZ.io);
    T_.logo = tLonge + 0.45; ev(tLonge, 'afasta'); ev(T_.logo, 'logo');
    texto(T6.t0, T_.logo + 0.6, ['No check-out,', 'a conta já está pronta.'], ['já', 'está', 'pronta.']);
    DUR = +(T_.logo + 1.35).toFixed(2);
  }

  // a posição livre (no quadro) de cada cartão em voo, antes de encaixar
  function vooLivre(v, t) {
    const D = T_.dor, g = T_.gancho;
    if (v.id === 'caipirinha') {
      // o gancho: grande no centro, girando; depois encolhe e vai para perto da etiqueta "Bar da piscina"
      const u = ramp(t, g.fim - 0.25, g.fim + 0.6, EZ.io);
      const s = lerp(1.5, v.s, u), cx = lerp(540, 300 + Math.sin(t * 1.3) * 26, u), cy = lerp(780 + Math.sin(t * 1.6) * 8, 590 + Math.cos(t * 1.1) * 18, u);
      return { cx, cy, s, ry: lerp(Math.sin(t * 1.4) * 16, Math.sin(t * 2) * 6, u), rx: lerp(7 + Math.sin(t * 1.1) * 3, 4, u), rz: lerp(-2, -6, u), op: 1 };
    }
    const nasce = v.nasce ? ETIQ[v.nasce] : null;
    if (nasce) { const u = ramp(t, v.aparece, v.aparece + 0.5, EZ.out); return { cx: lerp(1350, 840, u), cy: nasce.y - 140, s: v.s, ry: -12, rx: 4, rz: lerp(14, 4, u), op: 1 }; }
    // os três cartões da dor: voam desencontrados entre as etiquetas
    const ent = ramp(t, v.aparece, v.aparece + 0.5, EZ.out);
    const P_ = { agua: [[780, 820], [520, 560], [800, 380]], cerveja: [[260, 760], [720, 880], [480, 300]], risoto: [[700, 1120], [300, 1180], [620, 820]] }[v.id];
    const k = (t - v.aparece) * 0.42, i = Math.floor(k) % 3, f = EZ.io(k - Math.floor(k));
    let cx = lerp(P_[i][0], P_[(i + 1) % 3][0], f) + Math.sin(t * 2.1 + v.aparece) * 22, cy = lerp(P_[i][1], P_[(i + 1) % 3][1], f) + Math.cos(t * 1.7) * 16;
    let rz = Math.sin(t * 1.5 + v.aparece * 3) * 8, op = ent, s = v.s * (0.8 + 0.2 * ent);
    if (v.volta) {
      // a cerveja escapa e cai para fora do quadro (pela esquerda); volta pela esquerda quando o celular entra
      const q = clamp((t - D.escapa) / 1.0), qv = clamp((t - (v.pousa - 1.1)) / 0.6);
      if (t >= D.escapa && t < v.pousa - 1.1) { const x0 = cx, y0 = cy; cx = lerp(x0, -520, EZ.quad(q)); cy = y0 + 420 * EZ.quad(q) - 120 * Math.sin(q * Math.PI); rz = rz - 75 * q; }
      if (t >= v.pousa - 1.1) { cx = lerp(-480, 220, EZ.out(qv)); cy = lerp(1150, 860, EZ.out(qv)); rz = lerp(-40, -4, EZ.out(qv)); }
    }
    return { cx, cy: Math.min(cy, 1240), s, ry: Math.sin(t * 1.2 + v.aparece) * 10, rx: 5, rz, op };
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
        const ws = ln.split(' '); let x = CAP.cx - tw(ln) / 2;           // centralizada pelo texto final da linha
        ws.forEach((w) => {
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

  // ---------------- DOM ----------------
  let BASE_IMGS = {}, DIM, PAINEL, SALTO_DOM = [], VOO_DOM = [], ETIQ_DOM = [], GANCHO = {}, LOGO, TOQ, POUSO = [];
  async function init(root, meta) {
    ROOT = root; M = meta;
    el('div', 'fundo', ROOT, { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 980px 1200px at 540px 820px, #191B17 0%, #0C0D0B 58%, #060606 100%)' });
    el('div', 'luz', ROOT, { position: 'absolute', left: '-160px', top: '200px', width: '1400px', height: '1300px', background: 'radial-gradient(circle at 50% 42%, rgba(175,250,39,0.07), rgba(175,250,39,0) 62%)' });
    const cena = el('div', 'cena', ROOT, { position: 'absolute', inset: 0, perspective: '2400px', perspectiveOrigin: '540px 800px' });
    PHONE = el('div', 'celular', cena, { position: 'absolute', left: 0, top: 0, width: PW + 'px', height: PH + 'px', borderRadius: '70px', background: 'linear-gradient(145deg, #2a2a2a, #121212 40%, #0c0c0c)', boxShadow: '0 60px 140px rgba(0,0,0,0.75), 0 0 0 2px rgba(255,255,255,0.10), inset 0 0 0 2px rgba(255,255,255,0.05)', transformOrigin: '50% 50%' });
    SCREEN = el('div', 'tela', PHONE, { position: 'absolute', left: BZ + 'px', top: BZ + 'px', width: SW + 'px', height: SH + 'px', borderRadius: '57px', overflow: 'hidden', background: '#F4F4F0', isolation: 'isolate' });
    ROLA = el('div', 'rolagem', SCREEN, { position: 'absolute', left: 0, top: 0, width: SW + 'px', height: M.s02.H * S0 + 'px', zIndex: 1 });
    BASE_IMGS.vazia = img(M.s02.vazia, ROLA, { position: 'absolute', left: 0, top: 0, width: SW + 'px', height: M.s02.H * S0 + 'px', display: 'none' });
    BASE_IMGS.s02 = img(M.s02.tela, ROLA, { position: 'absolute', left: 0, top: 0, width: SW + 'px', height: M.s02.H * S0 + 'px', display: 'none' });
    BASE_IMGS.s04 = img(M.s04.tela, ROLA, { position: 'absolute', left: 0, top: 0, width: SW + 'px', height: M.s04.H * S0 + 'px', display: 'none' });
    FXT = el('div', 'efeitos', ROLA, { position: 'absolute', inset: 0, zIndex: 10 });
    PROBE = el('div', 'sonda', ROLA, { position: 'absolute', visibility: 'hidden' });
    DIM = el('div', 'escurecido', SCREEN, { position: 'absolute', inset: 0, background: M.s03.dim, display: 'none', zIndex: 20 });
    const rp = M.s03.painel; PAINEL = img(rp.img, SCREEN, { position: 'absolute', left: rp.x * S0 + 'px', top: rp.y * S0 + 'px', width: rp.w * S0 + 'px', height: rp.h * S0 + 'px', display: 'none', zIndex: 21 });
    PROBE_V = el('div', 'sonda-v', SCREEN, { position: 'absolute', visibility: 'hidden' });
    TOQ = el('div', 'toques-fixos', SCREEN, { position: 'absolute', inset: 0, zIndex: 30 });
    GRAF = el('div', 'graficos', ROOT, { position: 'absolute', inset: 0, perspective: '1600px', perspectiveOrigin: '540px 760px' });
    SALTOS_EL = el('div', 'saltos', ROOT, { position: 'absolute', inset: 0, perspective: '1800px', perspectiveOrigin: '540px 760px' });
    FINAL_EL = el('div', 'final', ROOT, { position: 'absolute', inset: 0 });
    CV = el('canvas', 'textos', ROOT, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px' }); CV.width = W; CV.height = H; CX = CV.getContext('2d');
    monta(); montaDom();
    await Promise.all([...ROOT.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
    const pre = []; for (const q of [...M.s02.conta_total, ...M.s04.conta_total]) { const i = new Image(); i.src = q.img; pre.push(i.decode().catch(() => {})); }
    await Promise.all(pre);
  }
  function montaDom() {
    // etiquetas (chips reais da folha "Lançar consumo"), 1,9× o tamanho no celular
    for (const [k, e] of Object.entries(ETIQ)) {
      const r = M.s03.recortes[e.chip];
      const d = el('div', 'etiqueta', GRAF, { position: 'absolute', left: 0, top: 0, width: r.w * K0 + 'px', height: r.h * K0 + 'px', display: 'none', borderRadius: '999px', boxShadow: '0 18px 50px rgba(0,0,0,.55)' });
      img(r.img, d, { width: '100%', height: '100%' });
      ETIQ_DOM.push({ k, e, d, r });
    }
    // o "?" do gancho
    GANCHO.q = el('div', 'interrogacao', GRAF, { position: 'absolute', left: 0, top: 0, font: `900 230px 'ID'`, color: C.limao, display: 'none', textShadow: `0 0 40px ${rgba(C.limao, 0.55)}` });
    GANCHO.q.textContent = '?';
    // os cartões em voo
    for (const v of VOOS) {
      const d = el('div', 'cartao', GRAF, { position: 'absolute', left: 0, top: 0, width: v.r.w * K0 + 'px', height: v.r.h * K0 + 'px', display: 'none', transformOrigin: '50% 50%', borderRadius: 16 * K0 + 'px' });
      img(v.img, d, { width: '100%', height: '100%' });
      const pouso = img(v.img, FXT, { position: 'absolute', left: v.r.x * S0 + 'px', top: v.r.y * S0 + 'px', width: v.r.w * S0 + 'px', height: v.r.h * S0 + 'px', display: 'none' });
      VOO_DOM.push({ v, d, pouso });
    }
    // os saltos
    for (const s of SALTOS) {
      const box = el('div', 'salto', SALTOS_EL, { position: 'absolute', left: 0, top: 0, width: s.w * K0 + 'px', height: s.h * K0 + 'px', borderRadius: (s.r.raio + (s.pad ? 6 : 0)) * K0 + 'px', background: s.fundo, display: 'none', transformOrigin: '50% 50%', overflow: 'hidden' });
      const im = img(s.quadros(s.t0), box, { position: 'absolute', left: s.pad * K0 + 'px', top: s.pad * K0 + 'px', width: s.r.w * K0 + 'px', height: s.r.h * K0 + 'px' });
      const im2 = s.troca ? img(s.troca.img, box, { position: 'absolute', left: s.pad * K0 + 'px', top: s.pad * K0 + 'px', width: s.r.w * K0 + 'px', height: s.r.h * K0 + 'px', opacity: 0 }) : null;
      const brilho = el('div', null, box, { position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none' });
      const slot = el('div', 'lugar', FXT, { position: 'absolute', left: (s.r.x - 3) * S0 + 'px', top: (s.r.y - 3) * S0 + 'px', width: (s.r.w + 6) * S0 + 'px', height: (s.r.h + 6) * S0 + 'px', borderRadius: (s.r.raio + 4) * S0 + 'px', background: s.slot, border: `${2.5 * S0}px dashed ${C.limao}`, boxSizing: 'border-box', display: 'none' });
      SALTO_DOM.push({ s, box, im, im2, brilho, slot });
    }
    TOQ.dataset.x = '';
    LOGO = img('logo.png', FINAL_EL, { position: 'absolute', left: '540px', top: '1196px', width: '520px', transform: 'translateX(-50%)', display: 'none' });
  }

  // ---------------- render ----------------
  const sc = () => ROOT.getBoundingClientRect().width / W;
  function medeRet(probe, x, y, w, h) {
    Object.assign(probe.style, { left: x * S0 + 'px', top: y * S0 + 'px', width: w * S0 + 'px', height: h * S0 + 'px' });
    const b = probe.getBoundingClientRect(), R0 = ROOT.getBoundingClientRect(), k = sc();
    return { x0: (b.left - R0.left) / k, y0: (b.top - R0.top) / k, x1: (b.right - R0.left) / k, y1: (b.bottom - R0.top) / k };
  }
  function renderAt(t) {
    const c = camEm(t);
    const rx = c.rx + Math.sin(t * 0.9) * 0.8, ry = c.ry + Math.sin(t * 0.6 + 1) * 1.6;
    PHONE.style.transform = `translate3d(${c.x - PW / 2}px, ${c.y - PH / 2 + Math.sin(t * 1.1) * 3}px, ${c.z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${c.rz}deg) scale(${c.Z})`;
    PHONE.style.display = c.y > 2500 ? 'none' : 'block';
    // base e rolagem
    const b = baseEm(t), bi = BASES.indexOf(b);
    for (const id in BASE_IMGS) { BASE_IMGS[id].style.display = 'none'; BASE_IMGS[id].style.zIndex = 1; }
    BASE_IMGS[b.id].style.display = 'block'; BASE_IMGS[b.id].style.opacity = 1;
    if (b.trans === 'fade' && t < b.t0 + 0.35 && bi > 0) { const a = BASES[bi - 1]; BASE_IMGS[a.id].style.display = 'block'; BASE_IMGS[b.id].style.opacity = ramp(t, b.t0, b.t0 + 0.35); BASE_IMGS[b.id].style.zIndex = 2; }
    const sy = rolEm(t); ROLA.style.transform = `translateY(${-sy * S0}px)`;
    // a folha "Lançar consumo"
    const fa = ramp(t, FOLHA.abre, FOLHA.abre + 0.4), ff = ramp(t, FOLHA.fecha, FOLHA.fecha + 0.35, EZ.in), fv = t >= FOLHA.abre && ff < 1;
    DIM.style.display = PAINEL.style.display = fv ? 'block' : 'none';
    if (fv) { DIM.style.opacity = fa * (1 - ff); PAINEL.style.transform = `translateY(${((1 - fa) + ff) * (SH - M.s03.painel.y * S0 + 40)}px)`; }
    // toques e contornos
    let html = '', fixos = '';
    for (const tq of TOQUES) {
      const d = t - tq.t; if (d < -0.18 || d > 0.6) continue;
      const r = tq.r, cx = (r.x + r.w / 2) * S0, cy = (r.y + r.h / 2) * S0, press = clamp(d < 0 ? 0 : d < 0.1 ? d / 0.1 : 1 - (d - 0.1) / 0.3);
      let h = `<div style="position:absolute;left:${r.x * S0}px;top:${r.y * S0}px;width:${r.w * S0}px;height:${r.h * S0}px;border-radius:${12 * S0}px;background:rgba(0,0,0,${0.1 * press});transform:scale(${1 - 0.04 * press})"></div>`;
      const dot = d < 0 ? 1 : 1 - ramp(t, tq.t + 0.15, tq.t + 0.45);
      h += `<div style="position:absolute;left:${cx - 22}px;top:${cy - 22}px;width:44px;height:44px;border-radius:50%;background:${C.limao};opacity:${0.85 * dot};transform:scale(${d < 0 ? 0.6 + (d + 0.18) / 0.18 * 0.4 : 1 - 0.2 * press});box-shadow:0 0 18px ${C.limao}"></div>`;
      if (d >= 0) { const u = EZ.out(d / 0.6); h += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:10px;height:10px;margin:-5px;border-radius:50%;border:${5 * (1 - u)}px solid ${C.limao};opacity:${1 - u};transform:scale(${2 + u * 20})"></div>`; }
      if (tq.fixo) fixos += h; else html += h;
    }
    TOQ.innerHTML = fixos;
    if (!FXT.querySelector('.toques')) el('div', 'toques', FXT, { position: 'absolute', inset: 0, zIndex: 5 });
    FXT.querySelector('.toques').innerHTML = html;
    // o começo gráfico
    desenhaGrafico(t);
    // os saltos
    for (const D of SALTO_DOM) desenhaSalto(D, t);
    // a marca
    LOGO.style.display = t >= T_.logo ? 'block' : 'none';
    if (t >= T_.logo) { const a = ramp(t, T_.logo, T_.logo + 0.5, EZ.out); LOGO.style.opacity = a; LOGO.style.transform = `translateX(-50%) translateY(${(1 - a) * 24}px) scale(${0.92 + 0.08 * EZ.elastico(clamp((t - T_.logo) / 0.6))})`; }
    textos(t);
  }
  function poseCartao(d, w, h, p) {
    d.style.transform = `translate(${p.cx - w / 2}px, ${p.cy - h / 2}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s})`;
    d.style.opacity = p.op;
    d.style.boxShadow = `0 ${30 * p.s}px ${70 * p.s}px rgba(0,0,0,.55)`;
  }
  function desenhaGrafico(t) {
    const D = T_.dor;
    // o "?" pulsando (gancho), ao lado do cartão
    const qv = t < T_.gancho.fim + 0.3; GANCHO.q.style.display = qv ? 'block' : 'none';
    if (qv) { const pul = 1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 5.5)), op = 1 - ramp(t, T_.gancho.fim - 0.1, T_.gancho.fim + 0.3); GANCHO.q.style.opacity = op; GANCHO.q.style.transform = `translate(${780}px, ${470}px) rotate(8deg) scale(${pul})`; GANCHO.q.style.textShadow = `0 0 ${30 + 30 * (pul - 1) * 10}px ${rgba(C.limao, 0.6)}`; }
    // as etiquetas
    const sumir = ramp(t, 9.0, 9.6, EZ.in);
    for (const E of ETIQ_DOM) {
      const vis = t >= D.etiq && sumir < 1; E.d.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      const a = ramp(t, D.etiq + ['bar', 'frigobar', 'restaurante'].indexOf(E.k) * 0.12, D.etiq + 0.45 + ['bar', 'frigobar', 'restaurante'].indexOf(E.k) * 0.12, EZ.back);
      const w = E.r.w * K0, h = E.r.h * K0, s = 1.9 * a * (1 - 0.4 * sumir);
      E.d.style.transform = `translate(${E.e.x - w / 2}px, ${E.e.y - h / 2 + Math.sin(t * 1.3 + E.e.x) * 6}px) rotate(${E.e.rot}deg) scale(${s})`;
      E.d.style.opacity = clamp(a) * (1 - sumir);
    }
    // os cartões: livres → encaixe no lugar da comanda (dentro do celular) → a linha da tela
    for (const V of VOO_DOM) {
      const v = V.v, w = v.r.w * K0, h = v.r.h * K0;
      const pousou = t >= v.pousa;
      V.pouso.style.display = pousou && t < T_.lista.cheia ? 'block' : 'none';
      const vis = t >= v.aparece && !pousou;
      V.d.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      const livre = vooLivre(v, Math.min(t, v.pousa - 0.55));
      if (t < v.pousa - 0.55) { poseCartao(V.d, w, h, livre); continue; }
      // o encaixe: do ponto livre até o lugar dele na tela (medido no quadro, com o 3D do celular)
      const alvo = medeRet(PROBE, v.r.x, v.r.y, v.r.w, v.r.h), u = EZ.io(clamp((t - (v.pousa - 0.55)) / 0.55));
      const sAlvo = (alvo.x1 - alvo.x0) / w;
      poseCartao(V.d, w, h, { cx: lerp(livre.cx, (alvo.x0 + alvo.x1) / 2, u), cy: lerp(livre.cy, (alvo.y0 + alvo.y1) / 2, u), s: lerp(livre.s, sAlvo, u), rx: lerp(livre.rx, 0, u), ry: lerp(livre.ry, 0, u), rz: lerp(livre.rz, 0, u), op: 1 });
    }
  }
  const rectSalto = new Map();
  function estadoSalto(s, t) {
    if (t < s.t0 || t > s.t1 + s.tout) return null;
    const e = t < s.t1 ? EZ.elastico(clamp((t - s.t0) / s.tin)) : 1 - EZ.io(clamp((t - s.t1) / s.tout));
    const lift = t < s.t1 ? clamp((t - s.t0) / (s.tin * 0.6)) : 1 - EZ.io(clamp((t - s.t1) / s.tout));
    return { e, lift };
  }
  function desenhaSalto(D, t) {
    const s = D.s, st = estadoSalto(s, t);
    D.box.style.display = st ? 'block' : 'none'; D.slot.style.display = st ? 'block' : 'none';
    if (!st) { rectSalto.delete(s.id); return; }
    const o = medeRet(PROBE, s.r.x, s.r.y, s.r.w, s.r.h);
    const ow = (o.x1 - o.x0) * s.w / s.r.w, oh = (o.y1 - o.y0) * s.h / s.r.h, ocx = (o.x0 + o.x1) / 2, ocy = (o.y0 + o.y1) / 2;
    const tw_ = s.w * K0 * s.f, th = s.h * K0 * s.f, L = st.lift;
    const bob = Math.sin((t - s.t0) * 2.6) * 5 * L;
    const cx = lerp(ocx, s.alvo.cx, st.e), cy = lerp(ocy, s.alvo.cy, st.e) + bob;
    const wNow = lerp(ow, tw_, st.e), hNow = lerp(oh, th, st.e), scx = wNow / (s.w * K0), scy = hNow / (s.h * K0);
    D.box.style.transform = `translate(${cx - s.w * K0 / 2}px, ${cy - s.h * K0 / 2}px) translateZ(${40 * L}px) rotateX(${s.rot.rx * L + Math.sin(t * 1.3) * 1.2 * L}deg) rotateY(${s.rot.ry * L}deg) rotateZ(${s.rot.rz * L}deg) scale(${scx}, ${scy})`;
    D.box.style.boxShadow = `0 ${34 * L}px ${90 * L}px rgba(0,0,0,${0.6 * L}), 0 ${8 * L}px ${22 * L}px rgba(0,0,0,${0.35 * L})`;
    D.box.style.zIndex = String(10 + Math.round(L * 10));
    const q = s.quadros(t); if (D.im.dataset.src !== q) { D.im.src = q; D.im.dataset.src = q; }
    let extra = 0;
    if (D.im2) { const u = ramp(t, s.troca.t, s.troca.t + 0.3, EZ.io); D.im2.style.opacity = u; D.im.style.opacity = 1 - u; extra = kick(t, s.troca.t, 0.6); }
    const pul = (0.5 + 0.5 * Math.sin((t - s.t0) * 5.2)) * L;
    D.brilho.style.boxShadow = `inset 0 0 0 ${(3 + 3 * extra) / scx}px ${rgba(s.cor, 0.55 + 0.45 * pul)}`;
    D.box.style.filter = `drop-shadow(0 0 ${18 + 26 * pul + 40 * extra}px ${rgba(s.cor, 0.35 * pul + 0.5 * extra)})`;
    D.slot.style.opacity = clamp(L * 1.6);
    rectSalto.set(s.id, { x0: cx - wNow / 2, y0: cy - hNow / 2, x1: cx + wNow / 2, y1: cy + hNow / 2, escala: wNow / (s.w * K0) });
  }

  // caixas do quadro para o QA
  function caixas(t) {
    renderAt(t);
    const R0 = ROOT.getBoundingClientRect(), k = sc(), out = [];
    const bx = (e) => { const b = e.getBoundingClientRect(); return { x0: (b.left - R0.left) / k, y0: (b.top - R0.top) / k, x1: (b.right - R0.left) / k, y1: (b.bottom - R0.top) / k }; };
    const add = (nome, tipo, e, extra = {}) => { if (!e || e.style.display === 'none' || +(e.style.opacity === '' ? 1 : e.style.opacity) < 0.05) return; out.push({ nome, tipo, ...bx(e), op: +(e.style.opacity === '' ? 1 : e.style.opacity), ...extra }); };
    if (PHONE.style.display !== 'none') { add('celular', 'celular', PHONE); add('tela', 'tela', SCREEN); }
    for (const D of SALTO_DOM) {
      if (D.box.style.display === 'none') continue;
      const st = estadoSalto(D.s, t), r = rectSalto.get(D.s.id);
      out.push({ nome: D.s.id, tipo: 'salto', ...bx(D.box), lift: st.lift, e: st.e, escala: r ? r.escala : 0, lugar: bx(D.slot), origem: medeRet(PROBE, D.s.r.x, D.s.r.y, D.s.r.w, D.s.r.h) });
    }
    for (const V of VOO_DOM) add(V.v.id, 'cartao', V.d);
    for (const E of ETIQ_DOM) add(E.k, 'etiqueta', E.d);
    add('?', 'grafico', GANCHO.q); add('marca', 'marca', LOGO);
    BOXES = []; textos(t); out.push(...BOXES); BOXES = null;
    return { caixas: out, cam: camEm(t), escala: camEm(t).Z / ZB, rolagem: rolEm(t), base: baseEm(t).id };
  }

  // ---------------- capa: o celular com a comanda real e o cartão da Caipirinha SALTANDO ----------------
  async function capaGrade() {
    const carrega = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
    const [tela, cartao] = await Promise.all([carrega(M.s02.tela), carrega(M.s02.recortes.caipirinha.img)]);
    const rc = M.s02.el.caipirinha;
    const k = 1.08, CSS_H = 690, sw = 390 * k, sh = CSS_H * k, bz = 14, fw = sw + 2 * bz, fh = sh + 2 * bz;
    const F = document.createElement('canvas'); F.width = Math.ceil(fw); F.height = Math.ceil(fh); const f = F.getContext('2d');
    const grad = f.createLinearGradient(0, 0, fw, fh); grad.addColorStop(0, '#2a2a2a'); grad.addColorStop(0.4, '#121212'); grad.addColorStop(1, '#0c0c0c');
    f.beginPath(); f.roundRect(0, 0, fw, fh, 58); f.fillStyle = grad; f.fill(); f.lineWidth = 2; f.strokeStyle = 'rgba(255,255,255,.12)'; f.stroke();
    f.save(); f.beginPath(); f.roundRect(bz, bz, sw, sh, 44); f.clip(); f.translate(bz, bz);
    const meia = (im, w, h) => { const t = document.createElement('canvas'); t.width = Math.round(w); t.height = Math.round(h); const x = t.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, t.width, t.height); return t; };
    f.imageSmoothingQuality = 'high';
    const t2 = meia(tela, tela.naturalWidth / 2, tela.naturalHeight / 2);
    f.drawImage(t2, 0, 0, t2.width, t2.width * CSS_H / 390, 0, 0, sw, sh);
    // o lugar do cartão: vazio na cor do fundo, contorno tracejado limão
    f.beginPath(); f.roundRect((rc.x - 3) * k, (rc.y - 3) * k, (rc.w + 6) * k, (rc.h + 6) * k, (rc.raio + 4) * k); f.fillStyle = '#F4F4F0'; f.fill();
    f.setLineDash([11, 8]); f.lineWidth = 3.5; f.strokeStyle = C.limao; f.stroke(); f.setLineDash([]);
    f.restore();
    const ESC = 1.7, cw = rc.w * k * ESC, ch = rc.h * k * ESC;
    const desenha = (c, DY) => {
      const g = c.createRadialGradient(540, 980, 40, 540, 980, 1200); g.addColorStop(0, '#191B17'); g.addColorStop(0.58, '#0C0D0B'); g.addColorStop(1, '#060606'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const luz = c.createRadialGradient(560, 1000, 10, 560, 1000, 640); luz.addColorStop(0, 'rgba(175,250,39,0.10)'); luz.addColorStop(1, 'rgba(175,250,39,0)'); c.fillStyle = luz; c.fillRect(0, 0, W, H);
      const TIT = { px: 84, l1: 'A caipirinha da piscina', l2: 'entrou na conta?' }, titH = TIT.px * 2.05;
      const ty = 440 + DY;
      c.textBaseline = 'alphabetic'; c.font = `900 ${TIT.px}px ID`; if (c.letterSpacing !== undefined) c.letterSpacing = '-2.1px';
      c.fillStyle = C.branco; c.fillText(TIT.l1, 90, ty + TIT.px * 0.82); const w1 = c.measureText(TIT.l1).width;
      c.fillStyle = C.limao; c.fillText(TIT.l2, 90, ty + TIT.px * 1.84); const w2 = c.measureText(TIT.l2).width;
      const caixas = [{ nome: 'título', x0: 90, y0: ty, x1: 90 + Math.max(w1, w2), y1: ty + titH }];
      const py = ty + titH + 66, px = 540 - fw / 2 - 30;
      c.save(); c.filter = 'blur(38px)'; c.fillStyle = 'rgba(0,0,0,.75)'; c.beginPath(); c.roundRect(px + 40, py + 60, fw - 40, fh - 20, 60); c.fill(); c.restore();
      const th = -10 * Math.PI / 180, P = 1500, cx0 = px + fw / 2, cy0 = py + fh / 2;
      let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
      c.save(); c.translate(cx0, cy0); c.rotate(-1.6 * Math.PI / 180);
      const tira = 2;
      for (let x = 0; x < fw; x += tira) {
        const u = x - fw / 2, s = P / (P + u * Math.sin(th)), X = u * Math.cos(th) * s, X2 = (u + tira) * Math.cos(th) * (P / (P + (u + tira) * Math.sin(th))), hh = fh * s;
        const lw = Math.min(tira + 2, fw - x);
        c.drawImage(F, x, 0, lw, fh, X, -hh / 2, (X2 - X) * lw / tira, hh);
        bx0 = Math.min(bx0, X); bx1 = Math.max(bx1, X2); by0 = Math.min(by0, -hh / 2); by1 = Math.max(by1, hh / 2);
      }
      c.restore();
      const cel = { nome: 'celular', x0: cx0 + bx0 - 14, y0: cy0 + by0 - 14, x1: cx0 + bx1 + 14, y1: cy0 + by1 + 14 };
      // o cartão da Caipirinha saltando: acima do lugar dele, por cima da borda direita do celular
      const ax = 612, ay = py + bz + (rc.y + rc.h / 2) * k - 222;
      c.save(); c.translate(ax, ay); c.rotate(3 * Math.PI / 180);
      c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 60; c.shadowOffsetY = 30;
      c.beginPath(); c.roundRect(-cw / 2, -ch / 2, cw, ch, 16 * k * ESC); c.fillStyle = '#FFFFFF'; c.fill();
      c.shadowColor = 'rgba(175,250,39,.45)'; c.shadowBlur = 56; c.shadowOffsetY = 0; c.fill(); c.shadowColor = 'transparent';
      c.drawImage(cartao, -cw / 2, -ch / 2, cw, ch);
      c.beginPath(); c.roundRect(-cw / 2, -ch / 2, cw, ch, 16 * k * ESC); c.lineWidth = 4; c.strokeStyle = C.limao; c.stroke();
      c.restore();
      const ext = Math.sin(3 * Math.PI / 180) * cw / 2;
      const av = { nome: 'cartão', x0: ax - cw / 2 - 6, y0: ay - ch / 2 - ext - 6, x1: ax + cw / 2 + 6, y1: ay + ch / 2 + ext + 6 };
      caixas.push({ nome: 'celular com o cartão', x0: Math.min(cel.x0, av.x0), y0: Math.min(cel.y0, av.y0), x1: Math.max(cel.x1, av.x1), y1: Math.max(cel.y1, av.y1) });
      return { caixas, cel, av };
    };
    const m = desenha(document.createElement('canvas').getContext('2d'), 0);
    const dy = Math.round(960 - (Math.min(...m.caixas.map((b) => b.y0)) + Math.max(...m.caixas.map((b) => b.y1))) / 2);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const r = desenha(c, dy), cx = r.caixas;
    const bloco = { topo: Math.min(...cx.map((b) => b.y0)), base: Math.max(...cx.map((b) => b.y1)) }; bloco.centro = (bloco.topo + bloco.base) / 2;
    return { png: cv.toDataURL('image/png'), caixas: cx, bloco, detalhe: { celular: r.cel, cartao: r.av, escala_cartao: ESC } };
  }

  window.REEL = {
    init, renderAt, caixas, capaGrade, get DURATION() { return DUR; }, ZB,
    avisos: () => AVISOS, eventos: () => EV.slice().sort((a, b) => a.t - b.t),
    saltos: () => SALTOS.map((s) => ({ id: s.id, grupo: s.grupo || null, tela: s.tela, el: s.el, t0: s.t0, tin: s.tin, t1: s.t1, tout: s.tout, f: s.f, alvo: s.alvo, troca: s.troca ? s.troca.t : null })),
    textos: () => TEXTOS.map((x) => ({ t0: x.t0, t1: x.t1, linhas: x.linhas, chaves: [...x.chaves] })),
    voos: () => VOOS.map((v) => ({ id: v.id, item: v.item, aparece: v.aparece, pousa: v.pousa })),
    T: () => T_,
  };
})();
