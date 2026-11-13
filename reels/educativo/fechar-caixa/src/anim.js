/*
 * FAZLO Hospeda — educativo "Faltou dinheiro no caixa?" (9:16, narração da Raquel, legenda palavra por palavra).
 *
 * O palco é a TELA REAL do caixa (10-caixa: 03, 06 e 07, renderizadas do HTML por scripts/telas.cjs) dentro de um
 * celular grande (moldura ~542 px, y 216–1362), em 3D leve. Nos momentos-chave, o elemento importante SALTA da tela:
 * o recorte do próprio HTML se descola com sombra, cresce (1,6× a 2× do tamanho no celular), flutua à frente do
 * celular com uma leve inclinação, ganha movimento (contagem, pulso de cor, digitação) e volta para o lugar dele.
 * Enquanto está fora, o lugar dele na tela fica marcado (vazio na cor do fundo, com contorno tracejado limão).
 * A linha do tempo sai da locução (linha.json, das marcações with-timestamps): cada salto acontece na sua palavra.
 * Determinístico: REEL.renderAt(t).
 */
(() => {
  const W = 1080, H = 1920;
  const C = { preto: '#0A0A0A', limao: '#AFFA27', branco: '#F7F7F2', ambar: '#E8A317', vermelho: '#E5484D' };
  const S0 = 1.436, BZ = 13;                                   // px da tela por px CSS (antes da escala do celular); moldura
  const SW = 390 * S0, SH = 844 * S0, PW = SW + 2 * BZ, PH = SH + 2 * BZ;
  const ZB = 1140 / PH;                                        // vista base: o celular de y 216 a 1356 (moldura ~540 px)
  const BASEV = { x: 540, y: 216 + 1140 / 2, z: 0, Z: ZB, rx: 1.5, ry: -3, rz: 0 };
  const K0 = S0 * ZB;                                          // px do quadro por px CSS, com o celular na vista base
  const CAP = { size: 64, lh: 74, y1: 1442, maxW: 800, cx: 540, minPag: 1.5, segura: 0.8 };   // legenda (linhas em y 1442/1516)
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const EZ = { lin: (u) => u, out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u, io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    expo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)), sine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
    // elástico suave: passa ~10% do alvo e assenta (entrada dos saltos)
    elastico: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(2, -8 * u) * Math.cos(u * Math.PI * 2.5)) };
  const ramp = (t, a, b, e = EZ.out) => e(clamp((t - a) / (b - a)));
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));
  const el = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) Object.assign(e.style, css); if (parent) parent.appendChild(e); return e; };
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

  let ROOT, M, LN, PHONE, SCREEN, FXT, PROBE, BG, SALTOS_EL, DOR_EL, FINAL_EL, CV, CX, DUR = 42;
  const EV = [], AVISOS = [];
  const ev = (t, tipo, d = {}) => EV.push({ t: +t.toFixed(3), tipo, ...d });
  let IDS = {};                                                // id da palavra -> início (s)
  const P = (id) => { if (IDS[id] == null) throw new Error('sem palavra ' + id); return IDS[id]; };

  // ---------------- câmera ----------------
  const CAM = [];
  function cam(t, v, e = EZ.io) { const prev = CAM.length ? CAM[CAM.length - 1].v : BASEV; CAM.push({ t, v: { ...prev, ...v }, e }); CAM.sort((a, b) => a.t - b.t); }
  function camEm(t) {
    let i = 0; while (i < CAM.length - 1 && t >= CAM[i + 1].t) i++;
    if (t <= CAM[0].t) return CAM[0].v; if (i === CAM.length - 1) return CAM[i].v;
    const a = CAM[i], b = CAM[i + 1], u = b.e((t - a.t) / (b.t - a.t)); const o = {}; for (const k in a.v) o[k] = lerp(a.v[k], b.v[k], u); return o;
  }
  function move(t, v, dur = 0.5, e = EZ.io) { const atual = { ...camEm(t) }; cam(t, atual, EZ.lin); cam(t + dur, { ...atual, ...v }, e); }

  // ---------------- a tela: base, folha, sobreposições ----------------
  const BASES = [];                                            // { id, img, t0, trans }
  function base(id, t0, trans = 'fade') { BASES.push({ id, t0, trans }); ev(t0, trans === 'corte' ? 'corte' : 'tela'); }
  const FOLHA = { abre: 1e9, fecha: 1e9, troca: [] };          // a folha "Fechar caixa" (06): A, B, C
  function folha(nome, t) { FOLHA.troca.push({ nome, t }); }
  const baseEm = (t) => BASES.filter((b) => b.t0 <= t).pop() || BASES[0];
  const folhaEm = (t) => { const v = FOLHA.troca.filter((x) => x.t <= t).pop() || FOLHA.troca[0]; return v ? v.nome : 'A'; };
  const folhaAberta = (t) => t >= FOLHA.abre && t < FOLHA.fecha;
  // o retângulo (px CSS da tela) de um elemento, no estado em que ele está
  const R = (tela, nome) => {
    if (tela.startsWith('s06')) { const v = M.s06.paineis[tela.slice(3)]; const r = v.el[nome]; if (!r) throw new Error(tela + ': sem ' + nome); return r; }
    const r = M[tela].el[nome]; if (!r) throw new Error(tela + ': sem ' + nome); return r;
  };

  const TOQUES = [], CONTORNOS = [], CONTAGENS = [];
  function toque(t, tela, nome) { TOQUES.push({ t, r: R(tela, nome) }); ev(t, 'toque'); }
  function contorno(tela, nome, t0, t1) { CONTORNOS.push({ tela, nome, r: R(tela, nome), t0, t1 }); ev(t0, 'contorno'); }

  // ---------------- os saltos ----------------
  // { id, tela, el (nome), quadros (fn t -> img), fundo, pad (px CSS), f (escala sobre o tamanho no celular), alvo {cx, cy},
  //   t0 (começa a sair), tin, t1 (começa a voltar), tout, cor (pulso), rot {rx, ry, rz}, slot (cor do lugar vazio), de (sai de outro salto) }
  const SALTOS = [];
  function salto(o) {
    const s = { tin: 0.45, tout: 0.42, pad: 0, f: 1.85, rot: { rx: 6, ry: -8, rz: -1.5 }, cor: C.limao, slot: '#FFFFFF', ...o };
    s.r = R(s.tela, s.el);
    s.w = s.r.w + 2 * s.pad; s.h = s.r.h + 2 * s.pad;
    SALTOS.push(s);
    ev(s.t0, 'salto', { id: s.id }); ev(s.t1, 'volta', { id: s.id }); ev(s.t1 + s.tout, 'encaixa', { id: s.id });
    return s;
  }
  const quadroFixo = (img) => () => img;

  // ---------------- a dor: valores soltos do caderno ----------------
  const DOR = [
    { txt: 'R$ 200,00', x: 92, y: 286, px: 52 }, { txt: 'R$ 285,00', x: 596, y: 248, px: 62, risco: true },
    { txt: 'R$ 125,00', x: 64, y: 512, px: 44 }, { txt: 'R$ 270,00', x: 640, y: 470, px: 56, risco: true },
    { txt: 'R$ 1.525,00', x: 70, y: 752, px: 46, longe: true }, { txt: 'R$ 40,00', x: 700, y: 716, px: 54 },
    { txt: 'R$ 900,00', x: 108, y: 968, px: 40, longe: true }, { txt: 'R$ 380,00', x: 590, y: 930, px: 44, risco: true },
    { txt: 'R$ 120,00', x: 96, y: 1178, px: 42 }, { txt: 'R$ 15,00', x: 520, y: 1162, px: 60, risco: true, ambar: true },
  ];
  const TROCAS = [[0, 3], [1, 4], [2, 7], [5, 8], [6, 9]];     // quem troca de lugar com quem (o embaralhar)

  // ---------------- roteiro (na palavra da locução) ----------------
  let T_ = {};
  function monta() {
    IDS = {}; for (const f of LN.frases) for (const w of f.palavras) if (w.id) IDS[w.id] = w.t0;
    const F = Object.fromEntries(LN.frases.map((f) => [f.id, f]));
    const fimVoz = LN.fim_voz;

    // ===== 1 · GANCHO: o aviso "falta R$ 15,00" já está fora no quadro 0, grande, pulsando em âmbar =====
    cam(0, { ...BASEV, ry: -5, rx: 2 }); cam(1.6, BASEV, EZ.out);
    base('s03', -1, 'corte');
    FOLHA.abre = -1; folha('C', -1);
    const tGancho = F.dor.t0 - 0.55;                           // o aviso volta para a folha antes da 2ª frase
    salto({ id: 'gancho', palavra: 'faltou', tela: 's06C', el: 'aviso', quadros: quadroFixo(M.s06.recortes.aviso.img), fundo: '#FFF7E3', f: 1.85,
      alvo: { cx: 540, cy: 560 }, t0: -0.6, t1: tGancho, tout: 0.5, cor: C.ambar, rot: { rx: 8, ry: -6, rz: -2 } });
    ev(P('faltou'), 'pulso');

    // ===== 2 · DOR: o celular apaga; valores soltos se embaralham; em "perdeu" são puxados para a tela =====
    const tApaga = F.dor.t0 - 0.1, tPerdeu = P('perdeu');
    T_.apaga = tApaga; T_.perdeu = tPerdeu; T_.acende = tPerdeu + 0.35;
    move(tApaga, { Z: ZB * 0.94, ry: 7, rx: 3 }, 0.8, EZ.io);
    T_.dor = { ini: tApaga + 0.35, caderno: P('caderno'), trocas: [P('caderno') + 1.0, P('caderno') + 2.6], puxa: tPerdeu };
    ev(tApaga, 'apaga'); ev(T_.dor.trocas[0], 'embaralha'); ev(T_.dor.trocas[1], 'embaralha'); ev(tPerdeu, 'puxa');
    FOLHA.fecha = tPerdeu;                                     // (a folha some no escuro; a tela 03 acende sozinha)
    move(tPerdeu, BASEV, 0.6, EZ.out);
    ev(T_.acende, 'acende');

    // ===== 3 · ABRE: "Abertura R$ 200,00" salta; entradas; as 4 formas de pagamento saem, voltam e o total conta =====
    contorno('s03', 'subtitulo', P('fazlo') + 0.4, P('abre') - 0.1);
    salto({ id: 'abertura', palavra: 'abre', tela: 's03', el: 'abertura', quadros: quadroFixo(M.s03.recortes.abertura.img), fundo: C.preto, pad: 10, f: 1.85,
      alvo: { cx: 540, cy: 560 }, t0: P('abre'), t1: P('abre') + 0.45 + 1.6, slot: C.preto, rot: { rx: 6, ry: 8, rz: 1.5 } });
    contorno('s03', 'entradas', P('entrada'), P('entrada') + 1.6);
    const t4 = P('forma') - 0.6;                               // "separada por forma de pagamento"
    const formas = [['pix', 'PIX', 460, 414, -2.5], ['dinheiro', 'Dinheiro', 596, 566, 2], ['credito', 'Cartão de crédito', 476, 718, -1.5], ['debito', 'Cartão de débito', 590, 872, 2.5]];
    const voltaF = t4 + 0.45 + 0.18 + 1.55;
    formas.forEach(([k, , cx, cy, rz], i) => salto({ id: 'forma-' + k, palavra: 'separada', grupo: 'formas', tela: 's03', el: k, quadros: quadroFixo(M.s03.recortes[k].img), fundo: '#FFFFFF', pad: 8, f: 1.6,
      alvo: { cx, cy }, t0: t4 + i * 0.06, tin: 0.45, t1: voltaF + i * 0.05, tout: 0.38, rot: { rx: 4, ry: i % 2 ? -6 : 6, rz } }));
    // o total some enquanto as formas estão fora e conta até R$ 1.525,00 quando elas voltam
    CONTAGENS.push({ tela: 's03', el: 'recebido_total', quadros: M.s03.conta_total, zero: t4 + 0.3, t0: voltaF + 0.1, t1: voltaF + 0.75, fim: voltaF + 0.85 });
    contorno('s03', 'recebido_cab', voltaF + 0.1, voltaF + 1.1);
    ev(voltaF + 0.1, 'conta', { dur: 0.65 });

    // ===== 4 · FECHAR: toque em "Fechar caixa", a folha sobe; o esperado salta e conta; a conta ao lado =====
    const tToque = Math.max(P('fechar'), voltaF + 0.75);
    toque(tToque, 's03', 'btn_fechar');
    FOLHA.troca = [{ nome: 'C', t: -1 }]; FOLHA.abre2 = tToque + 0.18; folha('A', tToque + 0.18);
    T_.folha2 = tToque + 0.18; ev(T_.folha2, 'folha');
    const tEsp = P('deveria') - 0.28;
    const voltaE = Math.max(tEsp + 0.45 + 1.75, P('conta') - 0.55);
    salto({ id: 'esperado', palavra: 'quanto', tela: 's06A', el: 'esperado', quadros: (t) => conta(M.s06.conta_esperado, t, tEsp + 0.15, tEsp + 0.95), fundo: C.preto, f: 1.85,
      alvo: { cx: 540, cy: 628 }, t0: tEsp, t1: voltaE, rot: { rx: 6, ry: -7, rz: -1 } });
    ev(tEsp + 0.15, 'conta', { dur: 0.8 });
    salto({ id: 'conta', palavra: 'deveria', tela: 's03', el: 'conta', de: 'esperado', quadros: quadroFixo(M.s03.recortes.conta.img), fundo: C.preto, pad: 12, f: 1.6,
      alvo: { cx: 560, cy: 366 }, t0: tEsp + 0.42, tin: 0.42, t1: voltaE - 0.05, tout: 0.38, semSlot: true, rot: { rx: 4, ry: 7, rz: 1.5 } });

    // ===== 5 · CONTA: o campo "Valor contado" sai, o valor é digitado nele; a diferença aparece e salta =====
    const tCampo = P('conta'), tDig = P('digita'), passoV = 0.11;
    const DV = M.s06.dig_valor;                                // 0 vazio · 1..7 com cursor · 8 sem cursor
    const fimDig = tDig + (DV.length - 3) * passoV;
    const voltaV = Math.max(fimDig + 0.5, tCampo + 0.45 + 1.55);
    salto({ id: 'valor', palavra: 'conta', tela: 's06A', el: 'campo_valor', quadros: (t) => digitado(DV, t, tDig, passoV, 1), fundo: '#FFFFFF', pad: 8, f: 1.85,
      alvo: { cx: 540, cy: 636 }, t0: tCampo, t1: voltaV, rot: { rx: 6, ry: 7, rz: 1 } });
    for (let k = 1; k <= DV.length - 3; k++) ev(tDig + (k - 1) * passoV, 'tecla');
    T_.digV = { t0: tDig, passo: passoV, fim: fimDig };
    const tB = voltaV + 0.4; folha('B', tB); ev(tB, 'aviso');
    const tAviso = Math.max(tB + 0.15, P('diferenca'));
    const voltaA = Math.max(tAviso + 0.45 + 1.55, F.obs.t0 - 0.1);
    salto({ id: 'aviso', palavra: 'diferença', tela: 's06B', el: 'aviso', quadros: quadroFixo(M.s06.recortes.aviso.img), fundo: '#FFF7E3', f: 1.85,
      alvo: { cx: 540, cy: 640 }, t0: tAviso, t1: voltaA, cor: C.ambar, rot: { rx: 7, ry: -7, rz: -1.5 } });
    ev(tAviso + 0.5, 'pulso');

    // ===== 6 · OBSERVAÇÃO: digitada no campo; toque em "Fechar caixa"; o resumo; quem fechou e a que horas =====
    const tObs = P('obs'), DO = M.s06.dig_obs, passoO = 0.034;
    const tDigO = tObs + 0.5, fimDigO = tDigO + (DO.length - 2) * passoO;
    const voltaO = Math.max(fimDigO + 0.1, tObs + 0.45 + 1.55);
    salto({ id: 'obs', palavra: 'observação', tela: 's06B', el: 'campo_obs', quadros: (t) => digitado(DO, t, tDigO, passoO, 0), fundo: '#FFFFFF', pad: 8, f: 1.85,
      alvo: { cx: 540, cy: 760 }, t0: tObs, t1: voltaO, rot: { rx: 5, ry: -6, rz: -1 } });
    for (let k = 0; k < DO.length - 2; k += 2) ev(tDigO + k * passoO, 'tecla');
    const tC = voltaO + tObs * 0 + 0.42; folha('C', tC);
    const tToque2 = tC + 0.15; toque(tToque2, 's06C', 'btn_fechar');
    FOLHA.fecha = tToque2 + 0.2; ev(FOLHA.fecha, 'folha_fecha');
    base('s07', tToque2 + 0.3, 'fade');
    contorno('s07', 'observacao', tToque2 + 0.75, P('quem') - 0.05);
    const tQuem = P('quem');
    const voltaQ = Math.max(tQuem + 0.45 + 1.55, F.fim.t0);
    salto({ id: 'fechado', palavra: 'quem fechou', tela: 's07', el: 'fechado', quadros: quadroFixo(M.s07.recortes.fechado.img), fundo: '#FFFFFF', pad: 10, f: 1.85,
      alvo: { cx: 540, cy: 600 }, t0: tQuem, t1: voltaQ, rot: { rx: 6, ry: 8, rz: 1 } });
    ev(P('horas'), 'pulso');
    T_.horas = P('horas');

    // ===== 7 · FIM: o celular se afasta; "Caixa fechado. Tudo explicado."; a marca =====
    const tLonge = voltaQ + 0.42;
    move(tLonge, { x: 540, y: 812, z: 0, Z: ZB * 0.56, rx: 2, ry: -2, rz: 0 }, 0.8, EZ.io);
    T_.texto = P('explicado') - 0.25; T_.logo = P('marca') - 0.1;
    ev(tLonge, 'afasta'); ev(T_.texto, 'texto'); ev(T_.logo, 'logo');
    DUR = +(LN.duracao).toFixed(2);
    T_.fimVoz = fimVoz;
  }
  // contagem: o quadro do HTML com o valor de 0 até o valor da tela
  function conta(Q, t, a, b) { const u = clamp((t - a) / (b - a)); return Q[Math.round(u * (Q.length - 1))].img; }
  // digitação: um quadro do HTML por letra; no fim, o cursor pisca
  function digitado(Q, t, t0, passo, k0) {
    const n = Q.length - 1;                                    // o último é o texto inteiro sem cursor
    if (t < t0) return Q[k0 === 1 ? 0 : 0].img;
    const k = Math.min(n - 1, k0 + Math.floor((t - t0) / passo));
    if (k < n - 1) return Q[k].img;
    return Math.floor((t - t0 - (n - 1 - k0) * passo) / 0.33) % 2 === 0 ? Q[n - 1].img : Q[n].img;
  }

  // ---------------- legenda palavra por palavra (o padrão dos educativos) ----------------
  let PAGES = [], BOXES = null;
  const DISPLAY = "'ID'";
  function tw(s, size) { CX.font = `900 ${size}px ${DISPLAY}`; CX.letterSpacing = `${-0.02 * size}px`; return CX.measureText(s).width + 0.02 * size; }
  function layoutLegenda() {
    PAGES = [];
    const wid = (ws, a, b) => tw(ws.slice(a, b).map((x) => x.tela).join(' '), CAP.size);
    const lim = LN.duracao - 0.05;
    if (LN.legenda) {
      // a divisão fixada no roteiro: telas e linhas, palavra a palavra na ordem da fala; cada linha centralizada pelo texto final dela
      const todas = LN.frases.flatMap((f) => f.palavras); let k = 0;
      for (const pg of LN.legenda) {
        const a = k, rows = [], pos = {};
        pg.forEach((ln) => { const r0 = k; for (const w of ln.split(' ')) { if (!todas[k] || todas[k].tela !== w) throw new Error(`legenda: "${w}" × "${todas[k] && todas[k].tela}"`); k++; } rows.push([r0, k]); });
        rows.forEach(([r0, r1], ri) => { const lw = wid(todas, r0, r1); let x = Math.min(CAP.cx - lw / 2, 932 - lw); /* centralizada; a linha mais larga encosta só até x 932 (coluna de botões em x > 940) */ for (let j = r0; j < r1; j++) { pos[j] = { x, row: ri }; x += tw(todas[j].tela + ' ', CAP.size) - 0.02 * CAP.size; } });
        PAGES.push({ a, b: k, rows, pos, nrows: rows.length, t0: todas[a].t0, words: todas, fimFala: todas[k - 1].t1 });
      }
      if (k !== todas.length) throw new Error('legenda: sobram palavras');
    } else LN.frases.forEach((f, fi) => {
      const ws = f.palavras, pages = [];
      const prox = LN.frases[fi + 1] ? LN.frases[fi + 1].palavras[0].t0 : lim;
      let i = 0;
      while (i < ws.length) {
        let j = i, lines = 1, a = i;
        while (j < ws.length) {
          if (wid(ws, a, j + 1) > CAP.maxW) { if (a === j) { j++; continue; } lines++; a = j; if (lines > 2) break; }
          else { j++; if (/[.?!]$/.test(ws[j - 1].w) && j < ws.length && ws[j - 1].t1 - ws[i].t0 >= CAP.minPag + 0.2) break; }
        }
        if (j < ws.length && !/[,.:;?!]$/.test(ws[j - 1].w)) {
          let achou = false;
          for (let k = j - 1; k > i + 1; k--) if (/[,.:;?!]$/.test(ws[k - 1].w) && ws[k - 1].t1 - ws[i].t0 >= CAP.minPag) { j = k; achou = true; break; }
          if (!achou) for (let k = j - 1; k > i + 1; k--) if (/^(e|ou|mais|menos)$/i.test(ws[k].w) && ws[k - 1].t1 - ws[i].t0 >= CAP.minPag) { j = k; break; }
        }
        pages.push([i, j]); i = j;
      }
      const cabe = (a, b) => { let ln = 1, x0 = a; for (let k = a + 1; k <= b; k++) if (wid(ws, x0, k) > CAP.maxW) { if (k - 1 === x0) continue; ln++; x0 = k - 1; } return ln <= 2; };
      const dura = (k) => (pages[k + 1] ? ws[pages[k + 1][0]].t0 : Math.min(prox, ws[pages[k][1] - 1].t1 + CAP.segura)) - ws[pages[k][0]].t0;
      for (let k = pages.length - 1; k > 0; k--)
        while ((dura(k) < CAP.minPag || pages[k][1] - pages[k][0] === 1) && pages[k - 1][1] - pages[k - 1][0] > 2 && cabe(pages[k][0] - 1, pages[k][1])) { pages[k - 1][1]--; pages[k][0]--; }
      pages.forEach(([a, b]) => {
        const n = b - a; let brk = n;
        if (wid(ws, a, b) > CAP.maxW) { let best = 1e9; for (let k = 1; k < n; k++) { const m = Math.max(wid(ws, a, a + k), wid(ws, a + k, b)); if (m < best) { best = m; brk = k; } } }
        const rows = brk >= n ? [[a, b]] : [[a, a + brk], [a + brk, b]], pos = {};
        rows.forEach(([r0, r1], ri) => { let x = CAP.cx - wid(ws, r0, r1) / 2; for (let k = r0; k < r1; k++) { pos[k] = { x, row: ri }; x += tw(ws[k].tela + ' ', CAP.size) - 0.02 * CAP.size; } });
        PAGES.push({ a, b, rows, pos, nrows: rows.length, t0: ws[a].t0, words: ws, fimFala: ws[b - 1].t1 });
      });
    });
    PAGES.forEach((q, i) => {
      const nx = PAGES[i + 1];
      let t1 = Math.min(nx ? nx.t0 : lim, q.fimFala + CAP.segura);
      t1 = Math.max(t1, Math.min(q.t0 + CAP.minPag, nx ? nx.t0 : lim));
      q.t1 = Math.min(t1, lim);
    });
  }
  function legenda(t) {
    const c = CX; c.clearRect(0, 0, W, H);
    const pg = PAGES.find((q) => t >= q.t0 && t < q.t1); if (!pg) return;
    const y0 = CAP.y1 + (pg.nrows === 1 ? CAP.lh / 2 : 0), ls = -0.02 * CAP.size;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 16; c.shadowOffsetY = 2;
    for (let k = pg.a; k < pg.b; k++) {
      const w = pg.words[k]; if (t < w.t0) continue;
      const u = EZ.out(clamp((t - w.t0) / 0.09)), ps = pg.pos[k], ww = tw(w.tela, CAP.size) - 0.02 * CAP.size;
      const pop = w.chave ? 1 + 0.07 * kick(t, w.t0, 0.18) : 1, y = y0 + ps.row * CAP.lh + (1 - u) * 10;
      c.save(); c.font = `900 ${CAP.size}px ${DISPLAY}`; c.letterSpacing = `${ls}px`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.globalAlpha = u; c.fillStyle = w.chave ? C.limao : '#FFFFFF';
      c.translate(ps.x + ww / 2, y - CAP.size * 0.3); c.scale(pop, pop); c.fillText(w.tela, -ww / 2, CAP.size * 0.3); c.restore();
      if (BOXES && u > 0.99) BOXES.push({ nome: w.tela, tipo: 'legenda', x0: ps.x, y0: y - CAP.size * 0.76, x1: ps.x + ww, y1: y + CAP.size * 0.22 });
    }
    c.restore();
  }

  // ---------------- montagem do DOM ----------------
  const IMGS = {};
  function img(src, parent, css) { const i = el('img', null, parent, css); i.decoding = 'sync'; i.src = src; return i; }
  let BASE_IMGS = {}, DIM, PAINEIS = {}, ESCURO, CONTA_EL = [], SALTO_DOM = [], DOR_DOM = [], TOQ;
  async function init(root, meta, linha) {
    ROOT = root; M = meta; LN = linha;
    BG = el('div', 'fundo', ROOT, { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 980px 1200px at 540px 820px, #191B17 0%, #0C0D0B 58%, #060606 100%)' });
    el('div', 'luz', ROOT, { position: 'absolute', left: '-160px', top: '200px', width: '1400px', height: '1300px', background: 'radial-gradient(circle at 50% 42%, rgba(175,250,39,0.07), rgba(175,250,39,0) 62%)' });
    const cena = el('div', 'cena', ROOT, { position: 'absolute', inset: 0, perspective: '2400px', perspectiveOrigin: '540px 800px' });
    PHONE = el('div', 'celular', cena, { position: 'absolute', left: 0, top: 0, width: PW + 'px', height: PH + 'px', borderRadius: '70px', background: 'linear-gradient(145deg, #2a2a2a, #121212 40%, #0c0c0c)', boxShadow: '0 60px 140px rgba(0,0,0,0.75), 0 0 0 2px rgba(255,255,255,0.10), inset 0 0 0 2px rgba(255,255,255,0.05)', transformOrigin: '50% 50%' });
    SCREEN = el('div', 'tela', PHONE, { position: 'absolute', left: BZ + 'px', top: BZ + 'px', width: SW + 'px', height: SH + 'px', borderRadius: '57px', overflow: 'hidden', background: '#F4F4F0', isolation: 'isolate' });
    for (const id of ['s03', 's07']) BASE_IMGS[id] = img(M[id].tela, SCREEN, { position: 'absolute', left: 0, top: 0, width: SW + 'px', height: SH + 'px', display: 'none' });
    CONTA_EL = el('div', 'contagens', SCREEN, { position: 'absolute', inset: 0, zIndex: 3 });
    DIM = el('div', 'escurecido', SCREEN, { position: 'absolute', inset: 0, background: M.s06.dim, display: 'none', zIndex: 4 });
    for (const n of ['A', 'B', 'C']) { const r = M.s06.paineis[n].el.painel; PAINEIS[n] = img(M.s06.paineis[n].img, SCREEN, { position: 'absolute', left: r.x * S0 + 'px', top: r.y * S0 + 'px', width: r.w * S0 + 'px', height: r.h * S0 + 'px', display: 'none' }); }
    FXT = el('div', 'efeitos', SCREEN, { position: 'absolute', inset: 0, zIndex: 10 });
    ESCURO = el('div', 'apagado', SCREEN, { position: 'absolute', inset: 0, background: '#050505', opacity: 0, zIndex: 11 });
    PROBE = el('div', 'sonda', SCREEN, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' });
    // os valores do caderno, à frente do celular apagado
    DOR_EL = el('div', 'dor', ROOT, { position: 'absolute', inset: 0, perspective: '1600px', perspectiveOrigin: '540px 800px' });
    SALTOS_EL = el('div', 'saltos', ROOT, { position: 'absolute', inset: 0, perspective: '1800px', perspectiveOrigin: '540px 760px' });
    FINAL_EL = el('div', 'final', ROOT, { position: 'absolute', inset: 0 });
    CV = el('canvas', 'legenda', ROOT, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px' }); CV.width = W; CV.height = H; CX = CV.getContext('2d');
    monta(); layoutLegenda(); montaDom();
    const todas = [...ROOT.querySelectorAll('img')].map((i) => i.decode().catch(() => {}));
    const pre = []; const add = (s) => { const i = new Image(); i.src = s; pre.push(i.decode().catch(() => {})); };
    for (const q of [...M.s06.dig_valor, ...M.s06.dig_obs, ...M.s06.conta_esperado, ...M.s03.conta_total]) add(q.img);
    await Promise.all(todas.concat(pre));
  }
  function montaDom() {
    // os saltos: a janela (o recorte do HTML sobre o fundo do elemento) e o lugar marcado na tela
    for (const s of SALTOS) {
      const box = el('div', 'salto', SALTOS_EL, { position: 'absolute', left: 0, top: 0, width: s.w * K0 + 'px', height: s.h * K0 + 'px', borderRadius: (s.r.raio + (s.pad ? 6 : 0)) * K0 + 'px', background: s.fundo, display: 'none', transformOrigin: '50% 50%', overflow: 'hidden', backfaceVisibility: 'hidden' });
      const im = img(s.quadros(s.t0), box, { position: 'absolute', left: s.pad * K0 + 'px', top: s.pad * K0 + 'px', width: s.r.w * K0 + 'px', height: s.r.h * K0 + 'px' });
      const brilho = el('div', null, box, { position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none' });
      const slot = s.semSlot ? null : el('div', 'lugar', FXT, { position: 'absolute', left: (s.r.x - 3) * S0 + 'px', top: (s.r.y - 3) * S0 + 'px', width: (s.r.w + 6) * S0 + 'px', height: (s.r.h + 6) * S0 + 'px', borderRadius: (s.r.raio + 4) * S0 + 'px', background: s.slot, border: `${2.5 * S0}px dashed ${C.limao}`, boxSizing: 'border-box', display: 'none' });
      SALTO_DOM.push({ s, box, im, brilho, slot });
    }
    // a contagem do total recebido, no próprio lugar do valor
    for (const k of CONTAGENS) {
      const r = R(k.tela, k.el);
      k.capa = el('div', null, CONTA_EL, { position: 'absolute', left: (r.x - 1) * S0 + 'px', top: (r.y - 1) * S0 + 'px', width: (r.w + 2) * S0 + 'px', height: (r.h + 2) * S0 + 'px', background: '#FFFFFF', display: 'none' });
      k.im = img(k.quadros[0].img, CONTA_EL, { position: 'absolute', display: 'none' });
    }
    // os valores do caderno
    for (const d of DOR) {
      const e = el('div', 'valor-solto', DOR_EL, { position: 'absolute', left: 0, top: 0, font: `600 ${d.px}px 'Geist Mono'`, color: d.longe ? 'rgba(247,247,242,0.55)' : (d.ambar ? '#F2C14E' : C.branco), whiteSpace: 'nowrap', textShadow: '0 10px 30px rgba(0,0,0,.7)', display: 'none', filter: d.longe ? 'blur(1.6px)' : 'none' });
      e.textContent = d.txt;
      if (d.risco) el('div', null, e, { position: 'absolute', left: '-6%', width: '112%', top: '50%', height: Math.max(4, d.px * 0.075) + 'px', marginTop: '-2px', background: C.vermelho, transform: 'rotate(-4deg)', borderRadius: '3px', transformOrigin: '0 50%' });
      DOR_DOM.push({ d, e });
    }
    // o fim: o texto e a marca
    const t1 = el('div', null, FINAL_EL, { position: 'absolute', left: '80px', width: '920px', top: '236px', textAlign: 'center', font: `900 86px 'ID'`, lineHeight: '1.04', letterSpacing: '-0.025em', color: C.branco, display: 'none' });
    const l1 = el('div', null, el('div', null, t1, { overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em' })); l1.textContent = 'Caixa fechado.';
    const l2 = el('div', null, el('div', null, t1, { overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em' })); l2.textContent = 'Tudo explicado.'; l2.style.color = C.limao;
    const logo = img('logo.png', FINAL_EL, { position: 'absolute', left: '540px', top: '1196px', width: '520px', transform: 'translateX(-50%)', display: 'none' });
    T_.dom = { t1, l1, l2, logo };
    TOQ = el('div', 'toques', FXT, { position: 'absolute', inset: 0 });
  }

  // ---------------- render ----------------
  function renderAt(t) {
    const c = camEm(t);
    // um balanço leve e contínuo (profundidade), menor no fim
    const sway = t < T_.perdeu + 0.6 && t > T_.apaga ? 0.4 : 1;
    const rx = c.rx + Math.sin(t * 0.9) * 0.8 * sway, ry = c.ry + Math.sin(t * 0.6 + 1) * 1.6 * sway;
    PHONE.style.transform = `translate3d(${c.x - PW / 2}px, ${c.y - PH / 2 + Math.sin(t * 1.1) * 3}px, ${c.z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${c.rz}deg) scale(${c.Z})`;
    // base e folha
    const b = baseEm(t), bi = BASES.indexOf(b);
    for (const id in BASE_IMGS) BASE_IMGS[id].style.display = 'none';
    BASE_IMGS[b.id].style.display = 'block'; BASE_IMGS[b.id].style.opacity = 1;
    if (b.trans === 'fade' && t < b.t0 + 0.35 && bi > 0) { const a = BASES[bi - 1]; BASE_IMGS[a.id].style.display = 'block'; BASE_IMGS[b.id].style.opacity = ramp(t, b.t0, b.t0 + 0.35); BASE_IMGS[b.id].style.zIndex = 2; BASE_IMGS[a.id].style.zIndex = 1; }
    // a folha: aberta no gancho (C), some no escuro; volta a subir no "fechar" (A → B → C) e desce no toque final
    let folhaVis = false, dy = 0, dim = 0;
    if (t < T_.perdeu) { folhaVis = true; dim = 1; }
    else if (t >= FOLHA.abre2) {
      const u = ramp(t, FOLHA.abre2, FOLHA.abre2 + 0.4), d = ramp(t, FOLHA.fecha, FOLHA.fecha + 0.35, EZ.in);
      folhaVis = d < 1; dim = u * (1 - d); dy = (1 - u) * SH * 0.62 + d * SH * 0.72;
    }
    DIM.style.display = folhaVis ? 'block' : 'none'; DIM.style.opacity = dim;
    const nome = t < T_.perdeu ? 'C' : folhaEm(t);
    for (const n in PAINEIS) PAINEIS[n].style.display = 'none';
    if (folhaVis) {
      const p = PAINEIS[nome]; p.style.display = 'block'; p.style.opacity = 1; p.style.transform = `translateY(${dy}px)`; p.style.zIndex = 6;
      // troca A → B → C: a nova cresce a partir da anterior (o aviso aparece, a observação entra)
      const tr = FOLHA.troca.filter((x) => x.t <= t).pop(), ix = FOLHA.troca.indexOf(tr);
      if (tr && ix > 0 && t < tr.t + 0.28 && t >= FOLHA.abre2) {
        const ant = FOLHA.troca[ix - 1].nome, u = ramp(t, tr.t, tr.t + 0.28);
        const ra = M.s06.paineis[ant].el.painel, rb = M.s06.paineis[nome].el.painel;
        p.style.transform = `translateY(${dy + (ra.y - rb.y) * S0 * (1 - u)}px)`;
        const q = PAINEIS[ant]; q.style.display = 'block'; q.style.zIndex = 5; q.style.opacity = 1 - u; q.style.transform = `translateY(${dy}px)`;
      }
    }
    // o celular apagado (a dor) e acendendo em "perdeu"
    ESCURO.style.opacity = t < T_.perdeu ? 0.9 * ramp(t, T_.apaga, T_.apaga + 0.5) : 0.9 * (1 - ramp(t, T_.perdeu + 0.1, T_.acende + 0.25, EZ.io));
    // a contagem do total (as formas voltando)
    for (const k of CONTAGENS) {
      const vis = t >= k.zero && t < k.fim; k.capa.style.display = k.im.style.display = vis ? 'block' : 'none'; if (!vis) continue;
      const u = clamp((t - k.t0) / (k.t1 - k.t0)), q = k.quadros[Math.round(u * (k.quadros.length - 1))], r = R(k.tela, k.el);
      if (k.im.dataset.src !== q.img) { k.im.src = q.img; k.im.dataset.src = q.img; }
      Object.assign(k.im.style, { left: (q.x - q.folga) * S0 + 'px', top: (q.y - q.folga) * S0 + 'px', width: (q.w + 2 * q.folga) * S0 + 'px', height: (q.h + 2 * q.folga) * S0 + 'px' });
    }
    // toques e contornos (dentro da tela)
    let html = '';
    for (const tq of TOQUES) {
      const d = t - tq.t; if (d < -0.18 || d > 0.6) continue;
      const r = tq.r, cx = (r.x + r.w / 2) * S0, cy = (r.y + r.h / 2) * S0, press = clamp(d < 0 ? 0 : d < 0.1 ? d / 0.1 : 1 - (d - 0.1) / 0.3);
      html += `<div style="position:absolute;left:${r.x * S0}px;top:${r.y * S0}px;width:${r.w * S0}px;height:${r.h * S0}px;border-radius:${12 * S0}px;background:rgba(255,255,255,${0.12 * press});transform:scale(${1 - 0.04 * press})"></div>`;
      const dot = d < 0 ? 1 : 1 - ramp(t, tq.t + 0.15, tq.t + 0.45);
      html += `<div style="position:absolute;left:${cx - 22}px;top:${cy - 22}px;width:44px;height:44px;border-radius:50%;background:${C.limao};opacity:${0.85 * dot};transform:scale(${d < 0 ? 0.6 + (d + 0.18) / 0.18 * 0.4 : 1 - 0.2 * press});box-shadow:0 0 18px ${C.limao}"></div>`;
      if (d >= 0) { const u = EZ.out(d / 0.6); html += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:10px;height:10px;margin:-5px;border-radius:50%;border:${5 * (1 - u)}px solid ${C.limao};opacity:${1 - u};transform:scale(${2 + u * 20})"></div>`; }
    }
    for (const k of CONTORNOS) {
      const a = ramp(t, k.t0, k.t0 + 0.25) * (1 - ramp(t, k.t1, k.t1 + 0.25)); if (a <= 0.01) continue;
      const r = k.r, f = 8;
      html += `<div style="position:absolute;left:${r.x * S0 - f}px;top:${r.y * S0 - f}px;width:${r.w * S0 + 2 * f}px;height:${r.h * S0 + 2 * f}px;border-radius:${r.raio * S0 + f}px;border:3px solid rgba(175,250,39,${0.95 * a});box-sizing:border-box;box-shadow:0 0 24px rgba(175,250,39,${0.35 * a})"></div>`;
    }
    TOQ.innerHTML = html;
    // os saltos
    for (const D of SALTO_DOM) desenhaSalto(D, t);
    // a dor
    desenhaDor(t);
    // o fim
    const F = T_.dom;
    F.t1.style.display = t >= T_.texto ? 'block' : 'none';
    if (t >= T_.texto) [F.l1, F.l2].forEach((l, i) => { const a = ramp(t, T_.texto + i * 0.12, T_.texto + i * 0.12 + 0.5, EZ.expo); l.style.transform = `translateY(${(1 - a) * 110}%)`; });
    F.logo.style.display = t >= T_.logo ? 'block' : 'none';
    if (t >= T_.logo) { const a = ramp(t, T_.logo, T_.logo + 0.5, EZ.out); F.logo.style.opacity = a; F.logo.style.transform = `translateX(-50%) translateY(${(1 - a) * 24}px) scale(${0.92 + 0.08 * EZ.elastico(clamp((t - T_.logo) / 0.6))})`; }
    legenda(t);
  }
  const rectSalto = new Map();
  function origemDe(s, t) {
    if (s.de) { const o = rectSalto.get(s.de); if (o) { const cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2, w = s.r.w * K0 / 2, h = s.r.h * K0 / 2; return { x0: cx - w, y0: cy - h, x1: cx + w, y1: cy + h }; } }
    Object.assign(PROBE.style, { left: s.r.x * S0 + 'px', top: s.r.y * S0 + 'px', width: s.r.w * S0 + 'px', height: s.r.h * S0 + 'px' });
    const sc = ROOT.getBoundingClientRect().width / W, b = PROBE.getBoundingClientRect(), R0 = ROOT.getBoundingClientRect();
    return { x0: (b.left - R0.left) / sc, y0: (b.top - R0.top) / sc, x1: (b.right - R0.left) / sc, y1: (b.bottom - R0.top) / sc };
  }
  function estadoSalto(s, t) {
    if (t < s.t0 || t > s.t1 + s.tout) return null;
    const e = t < s.t1 ? EZ.elastico(clamp((t - s.t0) / s.tin)) : 1 - EZ.io(clamp((t - s.t1) / s.tout));
    const lift = t < s.t1 ? clamp((t - s.t0) / (s.tin * 0.6)) : 1 - EZ.io(clamp((t - s.t1) / s.tout));
    return { e, lift };
  }
  function desenhaSalto(D, t) {
    const s = D.s, st = estadoSalto(s, t);
    D.box.style.display = st ? 'block' : 'none'; if (D.slot) D.slot.style.display = st ? 'block' : 'none';
    if (!st) { rectSalto.delete(s.id); return; }
    const o = origemDe(s, t);
    // a janela no lugar do elemento (com a folga) e no alvo
    const ow = (o.x1 - o.x0) * s.w / s.r.w, oh = (o.y1 - o.y0) * s.h / s.r.h, ocx = (o.x0 + o.x1) / 2, ocy = (o.y0 + o.y1) / 2;
    const tw_ = s.w * K0 * s.f, th = s.h * K0 * s.f;
    const bob = Math.sin((t - s.t0) * 2.6) * 5 * st.lift;
    const cx = lerp(ocx, s.alvo.cx, st.e), cy = lerp(ocy, s.alvo.cy, st.e) + bob;
    const wNow = lerp(ow, tw_, st.e), sc = wNow / (s.w * K0), scY = lerp(oh, th, st.e) / (s.h * K0);
    const L = st.lift;
    D.box.style.transform = `translate(${cx - s.w * K0 / 2}px, ${cy - s.h * K0 / 2}px) translateZ(${40 * L}px) rotateX(${s.rot.rx * L + Math.sin(t * 1.3) * 1.2 * L}deg) rotateY(${s.rot.ry * L}deg) rotateZ(${s.rot.rz * L}deg) scale(${sc}, ${scY})`;
    D.box.style.boxShadow = `0 ${34 * L}px ${90 * L}px rgba(0,0,0,${0.6 * L}), 0 ${8 * L}px ${22 * L}px rgba(0,0,0,${0.35 * L})`;
    D.box.style.zIndex = String(10 + Math.round(L * 10));
    const q = s.quadros(t); if (D.im.dataset.src !== q) { D.im.src = q; D.im.dataset.src = q; }
    // o pulso de cor: borda e brilho na cor do salto (âmbar no aviso), mais forte nos "pulsos" da locução
    const pul = (0.5 + 0.5 * Math.sin((t - s.t0) * 5.2)) * L, extra = s.id === 'gancho' ? kick(t, P('faltou'), 0.6) : s.id === 'aviso' ? kick(t, s.t0 + 0.5, 0.6) : s.id === 'fechado' ? kick(t, T_.horas, 0.6) : 0;
    D.brilho.style.boxShadow = `inset 0 0 0 ${(3 + 3 * extra) / sc}px ${rgba(s.cor, 0.55 + 0.45 * pul)}`;
    D.box.style.filter = `drop-shadow(0 0 ${(18 + 26 * pul + 40 * extra)}px ${rgba(s.cor, 0.35 * pul + 0.5 * extra)})`;
    if (D.slot) D.slot.style.opacity = clamp(L * 1.6);
    rectSalto.set(s.id, { x0: cx - wNow / 2, y0: cy - lerp(oh, th, st.e) / 2, x1: cx + wNow / 2, y1: cy + lerp(oh, th, st.e) / 2 });
  }
  function desenhaDor(t) {
    const D = T_.dor;
    const vis = t >= D.ini && t < D.puxa + 0.75;
    DOR_EL.style.display = vis ? 'block' : 'none'; if (!vis) { DOR_DOM.forEach(({ e }) => { e.style.display = 'none'; }); return; }
    const centro = { x: camEm(t).x, y: camEm(t).y };
    DOR_DOM.forEach(({ d, e }, i) => {
      e.style.display = 'block';
      // posição: a própria, trocando com a do par nas duas viradas (o embaralhar)
      let x = d.x, y = d.y;
      const par = TROCAS.find((p) => p.includes(i)); const outro = par ? DOR[par[0] === i ? par[1] : par[0]] : d;
      const u1 = ramp(t, D.trocas[0], D.trocas[0] + 0.7, EZ.io), u2 = ramp(t, D.trocas[1], D.trocas[1] + 0.7, EZ.io);
      const sw = u1 * (1 - u2);
      x = lerp(d.x, outro.x, sw); y = lerp(d.y, outro.y, sw);
      x += Math.sin(t * 0.9 + i * 1.7) * 16; y += Math.cos(t * 0.7 + i * 2.3) * 12;
      const ent = ramp(t, D.ini + i * 0.09, D.ini + i * 0.09 + 0.5, EZ.out);
      const pu = ramp(t, D.puxa + i * 0.025, D.puxa + i * 0.025 + 0.42, EZ.in);
      const bw = e.offsetWidth, bh = e.offsetHeight;
      const px = lerp(x, centro.x - bw / 2, pu), py = lerp(y, centro.y - bh / 2, pu);
      const rot = (i % 2 ? 1 : -1) * (3 + (i % 3)) + Math.sin(t + i) * 1.5;
      const op = ent * (1 - pu); e.style.opacity = op.toFixed(3); if (op < 0.01) { e.style.display = 'none'; return; }
      e.style.transform = `translate3d(${px}px, ${py + (1 - ent) * 30}px, ${d.longe ? -120 : 40}px) rotate(${rot * (1 - pu)}deg) scale(${(0.85 + 0.15 * ent) * (1 - 0.85 * pu)})`;
      e.style.zIndex = d.longe ? 0 : 2;
    });
  }

  // caixas do quadro para o QA
  function caixas(t) {
    renderAt(t);
    const sc = ROOT.getBoundingClientRect().width / W, R0 = ROOT.getBoundingClientRect(), out = [];
    const bx = (e) => { const b = e.getBoundingClientRect(); return { x0: (b.left - R0.left) / sc, y0: (b.top - R0.top) / sc, x1: (b.right - R0.left) / sc, y1: (b.bottom - R0.top) / sc }; };
    const add = (nome, tipo, e, extra = {}) => { if (!e || e.style.display === 'none' || +(e.style.opacity || 1) < 0.05) return; out.push({ nome, tipo, ...bx(e), op: +(e.style.opacity || 1), ...extra }); };
    add('celular', 'celular', PHONE); add('tela', 'tela', SCREEN);
    for (const D of SALTO_DOM) {
      if (D.box.style.display === 'none') continue;
      const st = estadoSalto(D.s, t);
      out.push({ nome: D.s.id, tipo: 'salto', ...bx(D.box), lift: st.lift, e: st.e, escala: rectSalto.get(D.s.id) ? (rectSalto.get(D.s.id).x1 - rectSalto.get(D.s.id).x0) / (D.s.w * K0) : 0, lugar: D.slot ? bx(D.slot) : null, origem: origemDe(D.s, t) });
    }
    for (const { d, e } of DOR_DOM) add(d.txt, 'valor', e);
    add('texto final', 'texto', T_.dom.t1); add('marca', 'marca', T_.dom.logo);
    BOXES = []; legenda(t); out.push(...BOXES); BOXES = null;
    return { caixas: out, cam: camEm(t), escala: camEm(t).Z / ZB, pagina: (PAGES.find((q) => t >= q.t0 && t < q.t1) || {}).t0 ?? null };
  }

  // ---------------- capa (capa.jpg e capa da grade): o melhor do vídeo num quadro ----------------
  // O celular com a tela real do gancho (03 + a folha "Fechar caixa" da 06: "Esperado em dinheiro R$ 285,00", "Valor contado
  // R$ 270,00"), grande, com leve inclinação 3D e sombra; o aviso "Diferença: falta R$ 15,00…" SALTANDO da tela (1,7×), por
  // cima da borda do celular, e o lugar dele marcado com o tracejado limão, como no vídeo. Título acima, ≥ 40 px de respiro.
  async function capaGrade() {
    const carrega = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
    const [tela, painel, aviso] = await Promise.all([carrega(M.s03.tela), carrega(M.s06.paineis.C.img), carrega(M.s06.recortes.aviso.img)]);
    const PC = M.s06.paineis.C.el, rp = PC.painel, ra = PC.aviso;
    // 1) o celular plano: a tela de y 0 a 700 (px CSS), 1,28 px por px CSS
    const k = 1.21, CSS_H = 700, sw = 390 * k, sh = CSS_H * k, bz = 14, fw = sw + 2 * bz, fh = sh + 2 * bz;
    const F = document.createElement('canvas'); F.width = Math.ceil(fw); F.height = Math.ceil(fh); const f = F.getContext('2d');
    const grad = f.createLinearGradient(0, 0, fw, fh); grad.addColorStop(0, '#2a2a2a'); grad.addColorStop(0.4, '#121212'); grad.addColorStop(1, '#0c0c0c');
    f.beginPath(); f.roundRect(0, 0, fw, fh, 62); f.fillStyle = grad; f.fill(); f.lineWidth = 2; f.strokeStyle = 'rgba(255,255,255,.12)'; f.stroke();
    f.save(); f.beginPath(); f.roundRect(bz, bz, sw, sh, 48); f.clip(); f.translate(bz, bz);
    const meia = (img, w, h) => { const t = document.createElement('canvas'); t.width = Math.round(w); t.height = Math.round(h); const x = t.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, t.width, t.height); return t; };
    f.imageSmoothingQuality = 'high';
    const t2 = meia(tela, tela.naturalWidth / 2, tela.naturalHeight / 2), p2 = meia(painel, painel.naturalWidth / 2, painel.naturalHeight / 2);
    f.drawImage(t2, 0, 0, t2.width, t2.width * CSS_H / 390, 0, 0, sw, sh);
    f.fillStyle = M.s06.dim; f.fillRect(0, 0, sw, sh);
    f.drawImage(p2, rp.x * k, rp.y * k, rp.w * k, rp.h * k);
    // o lugar do aviso: vazio na cor da folha, contorno tracejado limão
    f.beginPath(); f.roundRect((ra.x - 3) * k, (ra.y - 3) * k, (ra.w + 6) * k, (ra.h + 6) * k, (ra.raio + 4) * k); f.fillStyle = '#FFFFFF'; f.fill();
    f.setLineDash([11, 8]); f.lineWidth = 3.5; f.strokeStyle = C.limao; f.stroke(); f.setLineDash([]);
    f.restore();
    // 2) o quadro (desenhado duas vezes: a 1ª mede o bloco, a 2ª o centraliza em y 960)
    const desenha = (c, DY) => {
      const g = c.createRadialGradient(540, 980, 40, 540, 980, 1200); g.addColorStop(0, '#191B17'); g.addColorStop(0.58, '#0C0D0B'); g.addColorStop(1, '#060606'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const luz = c.createRadialGradient(560, 1000, 10, 560, 1000, 640); luz.addColorStop(0, 'rgba(175,250,39,0.10)'); luz.addColorStop(1, 'rgba(175,250,39,0)'); c.fillStyle = luz; c.fillRect(0, 0, W, H);
    const TIT = { px: 104, l1: 'Faltou dinheiro', l2: 'no caixa?' }, titH = TIT.px * 2.05;
    const avW = ra.w * k * 1.7, avH = ra.h * k * 1.7;
    // alturas: título, 44 px, celular; o aviso sai abaixo do lugar dele e passa da borda do celular
    const slotY = bz + (ra.y + ra.h / 2) * k;                   // centro do lugar, em px do celular
    const avDy = slotY + 118;                                    // centro do aviso, logo abaixo do lugar
    const ty = 300 + DY, py = ty + titH + 72, px = 540 - fw / 2 - 16;
    // título (a mesma tipografia: Inter Display Black, "no caixa?" em limão)
    c.textBaseline = 'alphabetic'; c.font = `900 ${TIT.px}px ID`; if (c.letterSpacing !== undefined) c.letterSpacing = '-2.6px';
    c.fillStyle = C.branco; c.fillText(TIT.l1, 90, ty + TIT.px * 0.82); const w1 = c.measureText(TIT.l1).width;
    c.fillStyle = C.limao; c.fillText(TIT.l2, 90, ty + TIT.px * 1.84); const w2 = c.measureText(TIT.l2).width;
    const caixas = [{ nome: 'título', x0: 90, y0: ty, x1: 90 + Math.max(w1, w2), y1: ty + titH }];
    // sombra do celular
    c.save(); c.filter = 'blur(38px)'; c.fillStyle = 'rgba(0,0,0,.75)'; c.beginPath(); c.roundRect(px + 40, py + 60, fw - 40, fh - 20, 60); c.fill(); c.restore();
    // o celular em perspectiva (girado ~10° em Y, um pouco em Z): fatias verticais, cada uma com a escala da profundidade dela
    const th = -10 * Math.PI / 180, P = 1500, cx0 = px + fw / 2, cy0 = py + fh / 2;
    let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
    c.save(); c.translate(cx0, cy0); c.rotate(-1.6 * Math.PI / 180);
    const tira = 2;
    for (let x = 0; x < fw; x += tira) {
      const u = x - fw / 2, z = u * Math.sin(th), s = P / (P + z), X = u * Math.cos(th) * s, X2 = (u + tira) * Math.cos(th) * (P / (P + (u + tira) * Math.sin(th)));
      const hh = fh * s;
      c.drawImage(F, x, 0, Math.min(tira + 2, fw - x), fh, X, -hh / 2, (X2 - X) * Math.min(tira + 2, fw - x) / tira, hh);
      bx0 = Math.min(bx0, X); bx1 = Math.max(bx1, X2); by0 = Math.min(by0, -hh / 2); by1 = Math.max(by1, hh / 2);
    }
    c.restore();
    const cel = { nome: 'celular', x0: cx0 + bx0 - 14, y0: cy0 + by0 - 14, x1: cx0 + bx1 + 14, y1: cy0 + by1 + 14 };
    // o aviso saltando: 1,7× o tamanho dele no celular, inclinado, com sombra e o brilho âmbar
    const ax = 540 + 70, ay = py + avDy;
    c.save(); c.translate(ax, ay); c.rotate(-3.5 * Math.PI / 180);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 60; c.shadowOffsetY = 30;
    c.beginPath(); c.roundRect(-avW / 2, -avH / 2, avW, avH, ra.raio * k * 1.7); c.fillStyle = '#FFF7E3'; c.fill();
    c.shadowColor = 'rgba(232,163,23,.55)'; c.shadowBlur = 56; c.shadowOffsetY = 0; c.fill();
    c.shadowColor = 'transparent';
    c.drawImage(aviso, -avW / 2, -avH / 2, avW, avH);
    c.beginPath(); c.roundRect(-avW / 2, -avH / 2, avW, avH, ra.raio * k * 1.7); c.lineWidth = 4; c.strokeStyle = C.ambar; c.stroke();
    c.restore();
    const ext = Math.sin(3.5 * Math.PI / 180) * avW / 2;
    const av = { nome: 'aviso', x0: ax - avW / 2 - 6, y0: ay - avH / 2 - ext - 6, x1: ax + avW / 2 + 6, y1: ay + avH / 2 + ext + 6 };
    // celular e aviso são uma peça só (o aviso salta do celular)
    caixas.push({ nome: 'celular com o aviso', x0: Math.min(cel.x0, av.x0), y0: Math.min(cel.y0, av.y0), x1: Math.max(cel.x1, av.x1), y1: Math.max(cel.y1, av.y1) });
    return { caixas, cel, av };
    };
    const m = desenha(document.createElement('canvas').getContext('2d'), 0);
    const dy = Math.round(960 - (Math.min(...m.caixas.map((b) => b.y0)) + Math.max(...m.caixas.map((b) => b.y1))) / 2);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const r = desenha(c, dy), caixas = r.caixas;
    const bloco = { topo: Math.min(...caixas.map((b) => b.y0)), base: Math.max(...caixas.map((b) => b.y1)) }; bloco.centro = (bloco.topo + bloco.base) / 2;
    return { png: cv.toDataURL('image/png'), caixas, bloco, detalhe: { celular: r.cel, aviso: r.av, escala_aviso: 1.7 } };
  }

  window.REEL = {
    init, renderAt, caixas, capaGrade, get DURATION() { return DUR; }, ZB,
    avisos: () => AVISOS, eventos: () => EV.slice().sort((a, b) => a.t - b.t),
    saltos: () => SALTOS.map((s) => ({ id: s.id, palavra: s.palavra, grupo: s.grupo || null, tela: s.tela, el: s.el, t0: s.t0, tin: s.tin, t1: s.t1, tout: s.tout, f: s.f, alvo: s.alvo, semSlot: !!s.semSlot, de: s.de || null })),
    legenda: () => PAGES.map((q) => ({ t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.tela).join(' ')) })),
    T: () => T_,
  };
})();
