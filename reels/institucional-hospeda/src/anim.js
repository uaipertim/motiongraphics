/*
 * FAZLO Hospeda — vídeo institucional (1080×1920, 60 fps), para os leads no WhatsApp.
 * Dor → como o Hospeda resolve → diferenciais → chamada. As telas são SÓ os recortes de hospeda-v2/ (scripts/telas.py,
 * sem a faixa "Demonstração · Quero usar"); nenhuma tela é desenhada ou inventada. As cenas sem tela (dor, virada,
 * pagamento repetido, chamada e logo) são tipografia e elementos vivos.
 * A linha do tempo vem de ../linha.json (scripts/linha.py): cada animação dispara na palavra que a narração diz.
 *
 * Mecânica das telas: o recorte entra num cartão (x 90–990, y 446–1232); a câmera rola e aproxima até o dado citado,
 * que ganha um contorno limão desenhado e o resto do cartão escurece; depois vem a pausa para ler e a transição
 * (a tela seguinte empurra a anterior; na troca de assunto, o cartão sobe e sai).
 * Legenda palavra por palavra no padrão do reel-09/Série Fala (Inter Display 900, 68 px, chaves em limão, linhas em
 * y 1332/1412, x 130–950, cada página ≥ 1,5 s). No quadro 0 (a miniatura do WhatsApp), o centro fica livre para o play.
 */
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const DISPLAY = "'FL Display', sans-serif", MONO = "'FL Mono', monospace";
  const C = { bg: '#0A0A0A', card: '#141614', card2: '#1A1D19', line: '#2C302B', lime: '#AFFA27', white: '#FFFFFF', gray: '#A6A9A2',
    grayD: '#6B6F68', amber: '#FFB23F', ink: '#141612', paper: '#F1EDE2', paper2: '#E5DFCF', inkSoft: '#6E685B', red: '#FF5C5C' };
  const CAP = { size: 68, lh: 80, y1: 1332, maxW: 820, cx: 540, minPag: 1.5, segura: 0.8 };
  const JAN = { x0: 90, x1: 990, y0: 446, y1: 1232 };            // a janela das telas
  const TR = 0.5;                                                 // duração das transições

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3), inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x, s = 1.70158) => (x <= 0 ? 0 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  const TAU = Math.PI * 2;
  const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const css = (h, a = 1) => { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const kick = (t, t0, d = 0.25) => (t < t0 ? 0 : Math.exp(-((t - t0) / d) * 4));
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  let M = null, LOGO = null, LN = null, DUR = 0, PREVIA = false, PAGES = [], IDS = {}, T = {}, BOXES = null, TEL = null, IMG = {}, SHOTS = [], CENAS = [];
  function BOX(nome, x0, y0, x1, y1) { if (BOXES) BOXES.push({ nome, x0, y0, x1, y1 }); }
  function setFont(c, fam, size, weight, ls = 0) { c.font = `${weight} ${size}px ${fam}`; c.letterSpacing = `${ls}px`; }
  function tw(s, fam, size, weight, ls = 0) { setFont(M, fam, size, weight, ls); return M.measureText(s).width - (s.length ? ls : 0); }
  function txt(c, s, x, y, o = {}) {
    const fam = o.fam || DISPLAY, size = o.size || 40, weight = o.weight || 700, ls = o.ls || 0;
    const w = tw(s, fam, size, weight, ls), x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    c.save(); setFont(c, fam, size, weight, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.globalAlpha *= o.alpha ?? 1; c.fillStyle = o.color || C.white;
    if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = o.blur || 22; }
    c.fillText(s, x0, y); c.restore();
    if (o.box) BOX(o.box, x0, y - 0.74 * size, x0 + w, y + 0.22 * size);
    return w;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
  const ent = (t, t0, d = 0.45) => E.outCubic(p(t, t0, t0 + d));
  const at = (id, fb) => (id in IDS ? IDS[id] : fb);

  // ---------------------------------------------------------------- fundo, marca e aviso de prévia
  function fundo(c, t) {
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    const gx = 540 + 160 * Math.sin(t * 0.21), gy = 820 + 120 * Math.cos(t * 0.17);
    let g = c.createRadialGradient(gx, gy, 0, gx, gy, 900);
    g.addColorStop(0, css(C.lime, 0.10)); g.addColorStop(1, css(C.lime, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.save(); c.fillStyle = css(C.white, 0.045);
    const off = (t * 9) % 60;
    for (let y = -60 + off; y < H; y += 60) for (let x = 30; x < W; x += 60) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
    c.restore();
    g = c.createRadialGradient(540, 900, 520, 540, 900, 1250);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function marca(c, a = 1) {
    if (a <= 0.01) return;
    const d = 50, nameW = tw('FAZLO Hospeda', DISPLAY, 27, 800), hw = tw(LN.marca, MONO, 19, 700, 0.5);
    const gw = d + 14 + Math.max(nameW, hw), x0 = 540 - gw / 2, cy = 330;
    c.save(); c.globalAlpha *= a;
    c.drawImage(LOGO, x0, cy - d / 2, d, d);
    const tx = x0 + d + 14;
    const w1 = txt(c, 'FAZLO', tx, cy - 3, { size: 27, weight: 800 });
    txt(c, 'Hospeda', tx + w1 + 6, cy - 3, { size: 27, weight: 800, color: C.lime });
    txt(c, LN.marca, tx, cy + 22, { fam: MONO, size: 19, weight: 700, color: C.gray, ls: 0.5 });
    c.restore();
    BOX('marca', x0, cy - d / 2, x0 + gw, cy + d / 2);
  }
  function avisoPrevia(c) {
    if (!PREVIA) return;
    const s = 'PRÉVIA PARA APROVAÇÃO', w = tw(s, MONO, 22, 800, 2) + 40;
    rr(c, 540 - w / 2, 150, w, 46, 23); c.fillStyle = css(C.amber, 0.16); c.fill(); c.strokeStyle = css(C.amber, 0.8); c.lineWidth = 2; c.stroke();
    txt(c, s, 540, 181, { fam: MONO, size: 22, weight: 800, color: C.amber, ls: 2, align: 'center' });
  }
  function chip(c, s, x, y, o = {}) {
    const size = o.size || 24, ls = o.ls ?? 4, w = tw(s, MONO, size, 800, ls) + 44 + (o.dot ? 22 : 0), h = o.h || 54;
    const x0 = o.align === 'center' ? x - w / 2 : x;
    c.save(); c.globalAlpha *= o.alpha ?? 1;
    rr(c, x0, y - h / 2, w, h, h / 2); c.fillStyle = o.bg || css(C.lime, 0.12); c.fill();
    c.strokeStyle = o.stroke || css(C.lime, 0.7); c.lineWidth = 2; c.stroke();
    if (o.dot) { c.beginPath(); c.arc(x0 + 30, y, 7, 0, TAU); c.fillStyle = o.color || C.lime; c.fill(); }
    txt(c, s, x0 + 22 + (o.dot ? 22 : 0), y + size * 0.36, { fam: MONO, size, weight: 800, color: o.color || C.lime, ls });
    c.restore();
    if (o.box) BOX(o.box, x0, y - h / 2, x0 + w, y + h / 2);
    return w;
  }

  // ---------------------------------------------------------------- ícones (traço)
  function icon(c, nome, x, y, s, col, lw = 4) {
    c.save(); c.translate(x, y); c.scale(s / 48, s / 48); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    if (nome === 'calendario') {
      c.roundRect(-20, -16, 40, 36, 6); c.moveTo(-20, -4); c.lineTo(20, -4); c.moveTo(-10, -22); c.lineTo(-10, -11); c.moveTo(10, -22); c.lineTo(10, -11);
      c.stroke(); c.beginPath(); [[-9, 6], [0, 6], [9, 6], [-9, 14]].forEach(([a, b]) => c.rect(a - 2.5, b - 2.5, 5, 5)); c.fill();
    } else if (nome === 'moedas') {
      c.ellipse(-4, 10, 16, 6, 0, 0, TAU); c.moveTo(-20, 10); c.lineTo(-20, 2); c.ellipse(-4, 2, 16, 6, 0, Math.PI, 0); c.moveTo(12, 2); c.lineTo(12, 10);
      c.moveTo(-20, 2); c.lineTo(-20, -6); c.ellipse(-4, -6, 16, 6, 0, Math.PI, TAU); c.moveTo(12, -6); c.lineTo(12, 2);
      c.moveTo(24, -14); c.lineTo(24, 16); c.moveTo(18, -9); c.lineTo(30, -9); c.stroke();
    } else if (nome === 'check') {
      c.moveTo(-14, 1); c.lineTo(-4, 11); c.lineTo(15, -10); c.stroke();
    } else if (nome === 'x') {
      c.moveTo(-12, -12); c.lineTo(12, 12); c.moveTo(12, -12); c.lineTo(-12, 12); c.stroke();
    } else if (nome === 'recibo') {
      c.moveTo(-16, -22); c.lineTo(16, -22); c.lineTo(16, 22); c.lineTo(10, 18); c.lineTo(4, 22); c.lineTo(-2, 18); c.lineTo(-8, 22); c.lineTo(-16, 18); c.closePath();
      c.moveTo(-9, -11); c.lineTo(9, -11); c.moveTo(-9, -2); c.lineTo(9, -2); c.moveTo(-9, 7); c.lineTo(3, 7); c.stroke();
    } else if (nome === 'chave') {
      c.arc(-10, 0, 10, 0, TAU); c.moveTo(0, 0); c.lineTo(22, 0); c.moveTo(14, 0); c.lineTo(14, 8); c.moveTo(20, 0); c.lineTo(20, 6); c.stroke();
    } else if (nome === 'balao') {
      c.moveTo(-20, -14); c.quadraticCurveTo(-20, -20, -14, -20); c.lineTo(14, -20); c.quadraticCurveTo(20, -20, 20, -14); c.lineTo(20, 6);
      c.quadraticCurveTo(20, 12, 14, 12); c.lineTo(-4, 12); c.lineTo(-14, 21); c.lineTo(-12, 12); c.quadraticCurveTo(-20, 12, -20, 6); c.closePath(); c.stroke();
      c.beginPath(); [-9, 0, 9].forEach((a) => { c.moveTo(a + 2.6, -4); c.arc(a, -4, 2.6, 0, TAU); }); c.fill();
    }
    c.restore();
  }
  function wifi(c, x, y, s, a, cai) {                           // o sinal da internet: as ondas apagam de cima para baixo
    c.save(); c.translate(x, y); c.lineCap = 'round';
    [0, 1, 2].forEach((k) => {
      const on = cai > 0 ? clamp(1 - (cai * 3 - (2 - k))) : 1;
      c.beginPath(); c.arc(0, 0, s * (0.3 + 0.32 * k), -Math.PI * 0.75, -Math.PI * 0.25);
      c.strokeStyle = on > 0.5 ? css(C.lime, a) : css(C.grayD, a * 0.6); c.lineWidth = s * 0.11; c.stroke();
    });
    c.beginPath(); c.arc(0, -s * 0.02, s * 0.07, 0, TAU); c.fillStyle = cai > 0.9 ? css(C.grayD, a) : css(C.lime, a); c.fill();
    c.restore();
  }

  // ---------------------------------------------------------------- tempos e plano das cenas
  function tempos() {
    IDS = {};
    LN.frases.forEach((f) => f.palavras.forEach((w) => { if (w.id) IDS[w.id] = w.t0; }));
    const F = Object.fromEntries(LN.frases.map((f) => [f.id, f]));
    const ini = (id) => F[id].t0 - 0.45;
    T = { F, dorFim: F.virada.t0 - 0.2, viradaFim: ini('dia'), cta: ini('cta') };
    // as cenas com tela: [início, fim, chip]
    CENAS = [
      { id: 'dia', t0: ini('dia'), t1: ini('reservas'), chip: 'HOJE NA POUSADA' },
      { id: 'reservas', t0: ini('reservas'), t1: ini('sinal'), chip: 'RESERVAS E CALENDÁRIO' },
      { id: 'sinal', t0: ini('sinal'), t1: ini('comanda'), chip: 'SINAL E CANCELAMENTO' },
      { id: 'comanda', t0: ini('comanda'), t1: ini('caixa'), chip: 'COMANDA E CHECK-OUT' },
      { id: 'caixa', t0: ini('caixa'), t1: ini('dayuse'), chip: 'CAIXA' },
      { id: 'dayuse', t0: ini('dayuse'), t1: ini('dobro'), chip: 'DAY USE' },
      { id: 'dobro', t0: ini('dobro'), t1: ini('config'), chip: 'PAGAMENTO REPETIDO', semTela: true },
      { id: 'config', t0: ini('config'), t1: T.cta, chip: 'CONFIGURADO PELA FAZLO' },
    ];
    const cena = Object.fromEntries(CENAS.map((s) => [s.id, s]));
    // cada tela: [nome, entrada, tipo de entrada, focos [palavra, foco, contorno?]]
    const k = (id, foco, hl = true, dt = 0) => ({ t: at(id) + dt, foco, hl });
    const plano = [
      ['dia', 'dia', cena.dia.t0, 'sobe', [{ t: cena.dia.t0, foco: null }, k('chega', 'chega'), k('sai', 'sai'), k('hospedado', 'hospedado'), k('entrou', 'entrou')]],
      ['reservas', 'calendario', cena.reservas.t0, 'sobe', [{ t: cena.reservas.t0, foco: null }, k('calendario', 'grade'), k('data', 'datas')]],
      ['reservas', 'duplicada', F.duplicada.t0 - 0.35, 'empurra', [{ t: F.duplicada.t0, foco: null }, k('chale', 'datas'), k('duas', 'aviso')]],
      ['sinal', 'sinal', cena.sinal.t0, 'sobe', [{ t: cena.sinal.t0, foco: null }, k('sinal', 'sinal')]],
      ['sinal', 'resumo', at('saldo') - 0.3, 'empurra', [{ t: at('saldo') - 0.3, foco: null }, k('saldo', 'contas')]],
      ['sinal', 'reter', F.cancela.t0 - 0.35, 'empurra', [{ t: F.cancela.t0, foco: null }, k('reter', 'reter')]],
      ['sinal', 'devolver', at('devolver') - 0.12, 'troca', [{ t: at('devolver') - 0.12, foco: 'reter', hl: false }, k('devolver', 'devolver')]],
      ['comanda', 'comanda', cena.comanda.t0, 'sobe', [{ t: cena.comanda.t0, foco: 'topo', hl: false }, k('consumo', 'caipirinha'), k('comanda', 'saldo')]],
      ['comanda', 'checkout', F.checkout.t0 - 0.35, 'empurra', [{ t: F.checkout.t0, foco: null }, k('saldo2', 'saldo'), k('libera', 'libera')]],
      ['caixa', 'caixa', cena.caixa.t0, 'sobe', [{ t: cena.caixa.t0, foco: null }, k('abertura', 'abertura'), k('fechamento', 'fechar')]],
      ['caixa', 'fechamento', at('conta') - 0.35, 'empurra', [{ t: at('conta') - 0.35, foco: null }, k('conta', 'contado'), k('mostra', 'diferenca')]],
      ['dayuse', 'dayuse', cena.dayuse.t0, 'sobe', [{ t: cena.dayuse.t0, foco: null }, k('dayuse', 'camila')]],
      ['dayuse', 'dayuse-ativo', at('comandas') - 0.3, 'empurra', [{ t: at('comandas') - 0.3, foco: null }, k('comandas', 'consumos')]],
      ['dayuse', 'diario', at('caixa2') - 0.3, 'empurra', [{ t: at('caixa2') - 0.3, foco: null }, k('caixa2', 'dayuse')]],
      ['config', 'acomodacoes', cena.config.t0, 'sobe', [{ t: cena.config.t0, foco: null }, k('acomodacoes', 'lista'), k('tarifas', 'tarifas')]],
      ['config', 'revisao', at('produtos') - 0.3, 'empurra', [{ t: at('produtos') - 0.3, foco: null }, k('produtos', 'produtos'), k('usuarios', 'usuarios')]],
    ];
    SHOTS = plano.map(([cid, nome, tin, tipo, keys]) => ({ cena: cena[cid], nome, tin, tipo, keys, tel: TEL[nome] }));
    SHOTS.forEach((s, i) => {
      const nx = SHOTS[i + 1];
      s.tout = nx && nx.cena === s.cena ? nx.tin : s.cena.t1 - 0.35;
      s.saiTipo = nx && nx.cena === s.cena ? nx.tipo : 'fim';
      s.tfim = s.saiTipo === 'fim' ? s.cena.t1 : s.tout + (s.saiTipo === 'troca' ? 0.3 : TR);
      // a janela: largura 900, altura até 812 (o recorte é rolado quando é mais alto)
      const fit = (JAN.x1 - JAN.x0) / s.tel.w;
      s.fit = fit; s.jw = JAN.x1 - JAN.x0; s.jh = Math.min(JAN.y1 - JAN.y0, s.tel.h * fit);
      s.jx = JAN.x0; s.jy = JAN.y0 + (JAN.y1 - JAN.y0 - s.jh) / 2;
      s.keys.sort((a, b) => a.t - b.t);
    });
  }

  // ---------------------------------------------------------------- câmera e contorno sobre o recorte
  function alvo(s, foco) {                                     // {z, cx, cy} da câmera para um foco (null = o recorte do topo)
    const tel = s.tel;
    let z = 1, cx = tel.w / 2, cy;
    if (foco) {
      const [a, b, c2, d] = tel.focos[foco];
      const rw = c2 - a, rh = d - b;
      z = clamp(Math.min((0.9 * s.jw) / (rw * s.fit), (0.78 * s.jh) / (rh * s.fit)), 1, 1.25);
      cx = (a + c2) / 2; cy = (b + d) / 2;
    }
    const sc = s.fit * z, hw = s.jw / (2 * sc), hh = s.jh / (2 * sc);
    cx = tel.w <= 2 * hw ? tel.w / 2 : clamp(cx, hw, tel.w - hw);
    cy = foco ? (tel.h <= 2 * hh ? tel.h / 2 : clamp(cy, hh, tel.h - hh)) : Math.min(hh, tel.h / 2);
    if (!foco && tel.h > 2 * hh) cy = hh;
    return { z, cx, cy };
  }
  function camera(s, t) {
    let cur = alvo(s, s.keys[0].foco);
    for (let i = 1; i < s.keys.length; i++) {
      const k = s.keys[i];
      if (t < k.t - 0.12) break;
      const nx = alvo(s, k.foco), u = E.inOutCubic(p(t, k.t - 0.12, k.t + 0.55));
      cur = { z: lerp(cur.z, nx.z, u), cx: lerp(cur.cx, nx.cx, u), cy: lerp(cur.cy, nx.cy, u) };
    }
    return cur;
  }
  function tela(c, s, t) {
    if (t < s.tin || t >= s.tfim) return;
    const { jx, jy, jw, jh, tel } = s;
    // entrada e saída
    let dx = 0, dy = 0, a = 1, sc = 1;
    const ue = E.outCubic(p(t, s.tin, s.tin + TR));
    if (s.tipo === 'sobe') { a = ue; sc = lerp(0.86, 1, E.outBack(p(t, s.tin, s.tin + TR), 1.4)); }
    else if (s.tipo === 'empurra') { dx = 1000 * (1 - E.inOutCubic(p(t, s.tin, s.tin + TR))); }
    else if (s.tipo === 'troca') { a = E.inOutSine(p(t, s.tin, s.tin + 0.3)); }
    if (t >= s.tout) {
      if (s.saiTipo === 'empurra') dx -= 1000 * E.inOutCubic(p(t, s.tout, s.tout + TR));
      else if (s.saiTipo === 'fim') { const u = E.inCubic(p(t, s.tout, s.cena.t1)); a *= 1 - u; dy -= 50 * u; }
    }
    if (a <= 0.003) return;
    const cam = camera(s, t), z = cam.z * s.fit;
    // o pulo do cartão em cada foco novo
    let kk = 0; s.keys.forEach((k, i) => { if (i) kk = Math.max(kk, kick(t, k.t, 0.35)); });
    sc *= 1 + 0.012 * kk;
    c.save(); c.globalAlpha *= a;
    c.translate(jx + jw / 2 + dx, jy + jh / 2 + dy); c.scale(sc, sc); c.translate(-(jx + jw / 2), -(jy + jh / 2));
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 24; c.shadowOffsetY = 6;
    rr(c, jx, jy, jw, jh, 30); c.fillStyle = '#F4F3EE'; c.fill(); c.restore();
    c.save(); rr(c, jx, jy, jw, jh, 30); c.clip();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    const ox = jx + jw / 2 - cam.cx * z, oy = jy + jh / 2 - cam.cy * z;
    c.drawImage(IMG[s.nome], ox, oy, tel.w * z, tel.h * z);
    // o foco ativo: escurece o resto e desenha o contorno limão
    let ativo = null;
    s.keys.forEach((k, i) => { if (i && k.hl !== false && k.foco && t >= k.t - 0.05) ativo = k; });
    if (ativo) {
      const [fa, fb, fc, fd] = tel.focos[ativo.foco], pad = 10;
      const rx = ox + fa * z - pad, ry = oy + fb * z - pad, rw2 = (fc - fa) * z + 2 * pad, rh2 = (fd - fb) * z + 2 * pad;
      const u = E.outCubic(p(t, ativo.t - 0.05, ativo.t + 0.35));
      c.save(); c.beginPath(); c.rect(jx, jy, jw, jh); c.roundRect(rx, ry, rw2, rh2, 18); c.fillStyle = `rgba(10,10,10,${0.42 * u})`; c.fill('evenodd'); c.restore();
      const per = 2 * (rw2 + rh2);
      c.save(); rr(c, rx, ry, rw2, rh2, 18); c.setLineDash([per * u, per]); c.strokeStyle = C.lime; c.lineWidth = 6;
      c.shadowColor = C.lime; c.shadowBlur = 10 + 26 * kick(t, ativo.t + 0.3, 0.5); c.stroke(); c.restore();
    }
    c.restore();
    rr(c, jx, jy, jw, jh, 30); c.strokeStyle = css(C.lime, 0.25 + 0.5 * kk); c.lineWidth = 2.5; c.stroke();
    c.restore();
    if (a > 0.5 && Math.abs(dx) < 400) BOX('tela ' + s.nome, jx + dx, jy + dy, jx + jw + dx, jy + jh + dy);
  }
  function chipCena(c, t) {                                    // o assunto da cena, acima da janela
    const s = CENAS.find((q) => t >= q.t0 && t < q.t1);
    if (!s) return;
    const e = E.outBack(p(t, s.t0, s.t0 + 0.4), 2), sai = p(t, s.t1 - 0.35, s.t1);
    c.save(); c.globalAlpha *= clamp(e) * (1 - sai); c.translate(JAN.x0, 404); c.scale(lerp(0.85, 1, clamp(e)), lerp(0.85, 1, clamp(e))); c.translate(-JAN.x0, -404);
    chip(c, s.chip, JAN.x0, 404, { dot: true, box: 'chip' });
    c.restore();
  }

  // ---------------------------------------------------------------- 1. A DOR (o quadro 0 é a miniatura: o centro fica livre para o play)
  function suga(c, t, x, y, desenha) {                         // na virada, tudo é sugado para a logo
    const u = E.inCubic(p(t, T.dorFim - 0.5, T.dorFim + 0.1));
    if (u >= 1) return;
    c.save(); c.translate(lerp(x, 540, u), lerp(y, 860, u)); c.scale(1 - u, 1 - u); c.rotate(u * 1.2); c.globalAlpha *= 1 - u * 0.6; desenha(); c.restore();
  }
  function caderno(c, t, t0) {
    const e = E.outBack(p(t, t0, t0 + 0.45), 1.8);
    if (e <= 0) return;
    c.save(); c.scale(e, e); c.rotate(-0.09 + 0.02 * Math.sin(t * 2.1));
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    rr(c, -125, -150, 250, 300, 14); c.fillStyle = C.paper; c.fill(); c.restore();
    for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(-125, -120 + i * 40, 9, 0, TAU); c.strokeStyle = '#8A8577'; c.lineWidth = 4; c.stroke(); }
    txt(c, 'RESERVAS', -95, -105, { fam: MONO, size: 22, weight: 800, color: C.ink, ls: 2 });
    for (let i = 0; i < 5; i++) {                                  // linhas "escritas à mão", que vão aparecendo
      const y = -60 + i * 44, u = p(t, t0 + 0.3 + i * 0.25, t0 + 0.6 + i * 0.25), x1 = lerp(-95, 70 + 30 * hash(i), u);
      c.beginPath(); c.moveTo(-95, y);
      for (let x = -95; x <= x1; x += 6) c.lineTo(x, y + 4 * Math.sin(x * 0.21 + i));
      c.strokeStyle = '#3B4F86'; c.lineWidth = 3.5; c.stroke();
      c.fillStyle = css(C.ink, 0.12); c.fillRect(-100, y + 16, 205, 2);
    }
    // uma reserva riscada e um "?" em vermelho
    const r = E.outCubic(p(t, t0 + 1.2, t0 + 1.5));
    if (r > 0) { c.beginPath(); c.moveTo(-100, 26); c.lineTo(lerp(-100, 100, r), 26 - 10 * r); c.strokeStyle = '#D93A3A'; c.lineWidth = 5; c.stroke(); }
    txt(c, '?', 82, 126, { size: 64, weight: 900, color: '#D93A3A', alpha: r });
    c.restore();
  }
  function papel(c, t, t0) {
    const e = E.outBack(p(t, t0, t0 + 0.45), 1.8);
    if (e <= 0) return;
    c.save(); c.scale(e, e); c.rotate(0.08 + 0.03 * Math.sin(t * 2.7 + 1));
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    c.beginPath(); c.moveTo(-110, -130); c.lineTo(110, -130); c.lineTo(110, 120);
    for (let i = 0; i < 11; i++) { c.lineTo(110 - (i + 0.5) * 20, 134); c.lineTo(110 - (i + 1) * 20, 120); }
    c.closePath(); c.fillStyle = '#FFFDF6'; c.fill(); c.restore();
    txt(c, 'CONSUMO', -82, -88, { fam: MONO, size: 22, weight: 800, color: C.ink, ls: 2 });
    // os pauzinhos da contagem, um a cada 0,22 s (a conta só cresce)
    const n = Math.floor(clamp((t - t0 - 0.3) / 0.22, 0, 14));
    for (let i = 0; i < n; i++) {
      const g = Math.floor(i / 5), j = i % 5, gx = -82 + (g % 2) * 92, gy = -40 + Math.floor(g / 2) * 80;
      c.beginPath();
      if (j < 4) { c.moveTo(gx + j * 15, gy); c.lineTo(gx + j * 15 + 3, gy + 50); } else { c.moveTo(gx - 8, gy + 40); c.lineTo(gx + 62, gy + 8); }
      c.strokeStyle = '#3B4F86'; c.lineWidth = 4; c.lineCap = 'round'; c.stroke();
    }
    c.restore();
  }
  function caixaRuim(c, t, t0, tb) {
    const e = E.outBack(p(t, t0, t0 + 0.45), 1.8);
    if (e <= 0) return;
    const sh = kick(t, tb, 0.5) * 14 * Math.sin(t * 60);
    c.save(); c.scale(e, e); c.translate(sh, 0);
    rr(c, -200, -62, 400, 124, 22); c.fillStyle = C.card; c.fill();
    c.strokeStyle = t >= tb ? css(C.red, 0.85) : css(C.white, 0.2); c.lineWidth = 3; c.setLineDash([10, 7]); c.stroke(); c.setLineDash([]);
    txt(c, 'CAIXA', -170, -18, { fam: MONO, size: 22, weight: 800, color: C.gray, ls: 3 });
    // os números não param de mudar: o caixa nunca bate
    const f = Math.floor(t * 11), dg = (k) => String(Math.floor(hash(f * 7 + k) * 10));
    const v = t >= tb + 0.6 ? 'R$ ???,??' : `R$ ${dg(1)}.${dg(2)}${dg(3)}${dg(4)},${dg(5)}${dg(6)}`;
    txt(c, v, -170, 38, { fam: MONO, size: 44, weight: 800, color: t >= tb ? C.red : C.amber });
    if (t >= tb) { c.save(); c.translate(150, 0); icon(c, 'x', 0, 0, 56, C.red, 6); c.restore(); }
    c.restore();
  }
  function dor(c, t) {
    if (t >= T.dorFim + 0.15) return;
    const sai = E.inCubic(p(t, T.dorFim - 0.45, T.dorFim));
    // o título (no quadro 0 já está inteiro: é a miniatura), em cima; o centro fica livre
    c.save(); c.globalAlpha *= 1 - sai; c.translate(0, -40 * sai);
    const S = 92, ls = -0.03 * S;
    txt(c, 'Caderno, papel', 90, 486, { size: S, weight: 900, ls, box: 'título 1' });
    txt(c, 'e um caixa que', 90, 578, { size: S, weight: 900, ls, box: 'título 2' });
    const kb = kick(t, at('bate', 99), 0.35);
    c.save(); c.translate(90, 640); c.scale(1 + 0.05 * kb, 1 + 0.05 * kb); c.translate(-90, -640);
    txt(c, 'não bate?', 90, 670, { size: S, weight: 900, ls, color: C.lime, box: 'título 3' });
    c.restore(); c.restore();
    suga(c, t, 245, 990, () => caderno(c, t, at('caderno', 1.4) - 0.1));
    suga(c, t, 838, 930, () => papel(c, t, at('papel', 2.2) - 0.1));
    suga(c, t, 540, 1170, () => caixaRuim(c, t, at('caixa', at('bate', 4) - 1.0), at('bate', 4)));
    if (t > at('caderno', 99) && t < T.dorFim - 0.1) BOX('caderno', 105, 820, 385, 1160);
    if (t > at('papel', 99) && t < T.dorFim - 0.1) BOX('papel', 700, 780, 976, 1080);
    if (t > at('bate', 99) - 1.0 && t < T.dorFim - 0.1) BOX('caixa', 340, 1108, 740, 1232);
  }

  // ---------------------------------------------------------------- 2. A VIRADA (a logo, e tudo em um só lugar)
  function virada(c, t) {
    const t0 = T.dorFim - 0.1, t1 = T.viradaFim;
    if (t < t0 || t >= t1) return;
    const e = E.outBack(p(t, t0, t0 + 0.55), 1.6), sai = E.inCubic(p(t, t1 - 0.4, t1)), cy = 840, D = 300;
    c.save(); c.globalAlpha *= 1 - sai; c.translate(0, -50 * sai);
    const g0 = c.createRadialGradient(540, cy, 0, 540, cy, 560);
    g0.addColorStop(0, css(C.lime, 0.16 * clamp(e))); g0.addColorStop(1, css(C.lime, 0));
    c.fillStyle = g0; c.fillRect(0, 300, W, 1000);
    const ru = p(t, t0 + 0.2, t0 + 0.9);
    if (ru > 0 && ru < 1) { c.beginPath(); c.arc(540, cy, lerp(D * 0.52, 300, E.outExpo(ru)), 0, TAU); c.strokeStyle = css(C.lime, 0.9 * (1 - ru)); c.lineWidth = 8 * (1 - ru) + 1; c.stroke(); }
    const d = D * lerp(0.5, 1, clamp(e)) * (1 + 0.04 * kick(t, at('logo', 99), 0.4));
    c.save(); c.globalAlpha *= clamp(e * 2); c.drawImage(LOGO, 540 - d / 2, cy - d / 2, d, d); c.restore();
    BOX('logo', 540 - D / 2, cy - D / 2, 540 + D / 2, cy + D / 2);
    // "em um só lugar": os assuntos do dia a dia entram em órbita em volta da logo
    const tl = at('lugar', t0 + 2.5);
    ['calendario', 'recibo', 'moedas', 'chave', 'check', 'balao'].forEach((nm, i) => {
      if (nm === 'balao') return;
      const u = E.outBack(p(t, tl - 0.15 + i * 0.07, tl + 0.3 + i * 0.07), 2);
      if (u <= 0) return;
      const ang = -Math.PI / 2 + (i / 5) * TAU + (t - tl) * 0.35, r = 236 * u;
      const x = 540 + r * Math.cos(ang), y = cy + r * Math.sin(ang);
      c.beginPath(); c.arc(x, y, 40 * u, 0, TAU); c.fillStyle = C.card; c.fill(); c.strokeStyle = css(C.lime, 0.8); c.lineWidth = 3; c.stroke();
      icon(c, nm, x, y, 40 * u, C.lime, 4);
    });
    const NS = 92, w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.3), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.3), nx = 540 - (w1 + w2) / 2;
    const pin = E.outExpo(p(t, t0 + 0.15, t0 + 0.6)), ny = 1214;
    c.save(); c.beginPath(); c.rect(60, ny - 96, 960, 124); c.clip();
    txt(c, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900, ls: -2.3 });
    BOX('nome', nx, ny - 0.74 * NS, nx + w1 + w2, ny + 28);       // o nome sobe dentro do recorte (y ≤ ny + 28)
    txt(c, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime, ls: -2.3 });
    c.restore();
    c.restore();
  }

  // ---------------------------------------------------------------- 9. PAGAMENTO REPETIDO (sem tela: tipografia e elementos vivos)
  function dobro(c, t) {
    const s = CENAS.find((q) => q.id === 'dobro');
    if (t < s.t0 || t >= s.t1) return;
    const e = ent(t, s.t0, 0.5), sai = E.inCubic(p(t, s.t1 - 0.35, s.t1));
    const tin = at('internet', s.t0 + 0.8), trec = at('recebimento', tin + 1), tpag = at('pagamento', trec + 0.8), tduas = at('duas2', tpag + 1);
    c.save(); c.globalAlpha *= e * (1 - sai); c.translate(0, 40 * (1 - e) - 40 * sai);
    // a internet cai
    const cai = p(t, tin + 0.1, tin + 0.7), kw = kick(t, tin + 0.7, 0.4);
    c.save(); c.translate(kw * 10 * Math.sin(t * 70), 0);
    wifi(c, 540, 640, 150, 1, cai);
    if (cai >= 1) { c.save(); c.translate(540, 600); c.rotate(-0.8); rr(c, -95, -6, 190 * E.outCubic(p(t, tin + 0.7, tin + 0.9)), 12, 6); c.fillStyle = C.red; c.fill(); c.restore(); }
    c.restore();
    BOX('internet', 430, 520, 650, 660);
    // o recebimento: um cartão genérico com o "enviando" girando
    const card = (x, y, o) => {
      c.save(); c.translate(x, y); c.globalAlpha *= o.a ?? 1;
      rr(c, -330, -70, 660, 140, 26); c.fillStyle = o.fant ? 'rgba(20,22,20,0.6)' : C.card; c.fill();
      c.strokeStyle = o.cor || css(C.lime, 0.6); c.lineWidth = 3; if (o.fant) c.setLineDash([12, 9]); c.stroke(); c.setLineDash([]);
      icon(c, 'moedas', -260, 0, 56, o.fant ? C.gray : C.lime, 4);
      txt(c, 'RECEBIMENTO', -200, -10, { fam: MONO, size: 26, weight: 800, color: o.fant ? C.gray : C.white, ls: 3 });
      txt(c, o.sub, -200, 34, { fam: MONO, size: 24, weight: 700, color: o.subCor || C.gray, ls: 1 });
      if (o.spin) { c.beginPath(); c.arc(270, 0, 24, t * 7, t * 7 + 4.2); c.strokeStyle = C.lime; c.lineWidth = 6; c.lineCap = 'round'; c.stroke(); }
      if (o.ok) { const k = E.outBack(o.ok, 2.2); c.save(); c.translate(270, 0); c.scale(k, k); c.beginPath(); c.arc(0, 0, 32, 0, TAU); c.fillStyle = C.lime; c.fill(); icon(c, 'check', 0, 0, 36, C.ink, 6); c.restore(); }
      c.restore();
    };
    const er = E.outBack(p(t, trec - 0.1, trec + 0.35), 1.6);
    if (er > 0) {
      const ok = p(t, tduas - 0.1, tduas + 0.25);
      card(540, 860, { sub: ok > 0 ? 'LANÇADO 1 VEZ' : 'enviando…', subCor: ok > 0 ? C.lime : C.gray, spin: ok <= 0, ok, a: clamp(er) });
      BOX('recebimento', 210, 790, 870, 930);
    }
    // o mesmo pagamento tenta entrar de novo: é barrado
    const ef = E.outCubic(p(t, tpag - 0.05, tpag + 0.45));
    if (ef > 0) {
      const bar = p(t, tduas - 0.05, tduas + 0.5), sh = kick(t, tduas, 0.45) * 16 * Math.sin(t * 64);
      const y = lerp(1180, 1050, ef) + 60 * E.inCubic(p(t, tduas + 0.5, tduas + 1.1));
      const a = 1 - E.inCubic(p(t, tduas + 0.5, tduas + 1.1));
      if (a > 0.01) {
        card(540 + sh, y, { fant: true, sub: bar > 0 ? 'REPETIDO · NÃO LANÇADO' : 'de novo?', subCor: bar > 0 ? C.amber : C.gray, cor: bar > 0 ? css(C.amber, 0.9) : css(C.white, 0.35), a: a * ef });
        BOX('repetido', 210, y - 70, 870, y + 70);
      }
    }
    c.restore();
  }

  // ---------------------------------------------------------------- 11. CHAMADA
  function chamada(c, t) {
    const t0 = T.cta;
    if (t < t0 || t >= LN.logo) return;
    const e = ent(t, t0, 0.5), sai = E.inCubic(p(t, LN.logo - 0.35, LN.logo));
    c.save(); c.globalAlpha *= e * (1 - sai); c.translate(0, 30 * (1 - e) - 40 * sai);
    const kf = kick(t, at('fale', 99), 0.3), kw = kick(t, at('whats', 99), 0.35);
    txt(c, 'Fale com', 90, 620, { size: 112 * (1 + 0.03 * kf), weight: 900, ls: -3, box: 'chamada 1' });
    txt(c, 'a gente no', 90, 734, { size: 112, weight: 900, ls: -3, box: 'chamada 2' });
    c.save(); c.translate(90, 810); c.scale(1 + 0.05 * kw, 1 + 0.05 * kw); c.translate(-90, -810);
    txt(c, 'WhatsApp', 90, 848, { size: 112, weight: 900, ls: -3, color: C.lime, box: 'chamada 3' });
    c.restore();
    txt(c, 'para conhecer.', 90, 962, { size: 112, weight: 900, ls: -3, box: 'chamada 4' });
    // o balão de conversa (genérico), pulsando
    const ub = E.outBack(p(t, at('whats', t0 + 0.8) - 0.1, at('whats', t0 + 0.8) + 0.35), 2);
    if (ub > 0) {
      const x = 860, y = 1120, r = 74 * ub;
      const ru = ((t - at('whats', 0)) % 1.2) / 1.2;
      c.beginPath(); c.arc(x, y, r + 50 * ru, 0, TAU); c.strokeStyle = css(C.lime, 0.6 * (1 - ru)); c.lineWidth = 4; c.stroke();
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = C.lime; c.fill();
      icon(c, 'balao', x, y + 2, 76 * ub, C.ink, 4.5);
      BOX('balão', x - 74, y - 74, x + 74, y + 74);
    }
    c.restore();
  }

  // ---------------------------------------------------------------- LOGO (fecho)
  function fimLogo(c, t) {
    const t0 = LN.logo, e = E.outBack(p(t, t0, t0 + 0.45), 1.8), D = 300, cy = 760;
    if (t < t0) return;
    const g0 = c.createRadialGradient(540, cy, 0, 540, cy, 620);
    g0.addColorStop(0, css(C.lime, 0.15 * clamp(e))); g0.addColorStop(1, css(C.lime, 0));
    c.fillStyle = g0; c.fillRect(0, 0, W, H);
    const ru = p(t, t0 + 0.3, t0 + 1.0);
    if (ru > 0 && ru < 1) { c.beginPath(); c.arc(540, cy, lerp(D * 0.52, 230, E.outExpo(ru)), 0, TAU); c.strokeStyle = css(C.lime, 0.9 * (1 - ru)); c.lineWidth = 7 * (1 - ru) + 1; c.stroke(); }
    c.save(); c.globalAlpha *= clamp(e * 2); const d = D * lerp(0.6, 1, e); c.drawImage(LOGO, 540 - d / 2, cy - d / 2, d, d); c.restore();
    BOX('logo final', 540 - D / 2, cy - D / 2, 540 + D / 2, cy + D / 2);
    const NS = 96, w1 = tw('FAZLO ', DISPLAY, NS, 900, -2.4), w2 = tw('Hospeda', DISPLAY, NS, 700, -2.4), nx = 540 - (w1 + w2) / 2;
    const pin = E.outExpo(p(t, t0 + 0.05, t0 + 0.5)), ny = 1070;
    c.save(); c.beginPath(); c.rect(60, ny - 100, 960, 130); c.clip();
    txt(c, 'FAZLO ', nx, ny + (1 - pin) * 120, { size: NS, weight: 900, ls: -2.4 });
    txt(c, 'Hospeda', nx + w1, ny + (1 - pin) * 120, { size: NS, weight: 700, color: C.lime, ls: -2.4 });
    c.restore();
    txt(c, LN.marca, 540, 1146, { fam: MONO, size: 34, weight: 700, color: C.gray, align: 'center', ls: 1, alpha: E.outCubic(p(t, t0 + 0.1, t0 + 0.6)) });
  }

  // ---------------------------------------------------------------- legenda palavra por palavra (o motor do reel-09 / educativo)
  function layoutLegenda() {
    PAGES = [];
    const wid = (ws, a, b) => tw(ws.slice(a, b).map((x) => x.w).join(' '), DISPLAY, CAP.size, 900, -0.02 * CAP.size);
    LN.frases.forEach((f, fi) => {
      const ws = f.palavras, pages = [];
      const prox = LN.frases[fi + 1] ? LN.frases[fi + 1].palavras[0].t0 : LN.logo - 0.05;
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
      // e o contrário: uma página curta que não pode dar palavras à anterior recebe a 1ª palavra da seguinte, se couber
      for (let k = 0; k < pages.length - 1; k++)
        while (dura(k) < CAP.minPag && pages[k + 1][1] - pages[k + 1][0] > 1 && cabe(pages[k][0], pages[k][1] + 1)) { pages[k][1]++; pages[k + 1][0]++; }
      pages.forEach(([a, b]) => {
        const n = b - a; let brk = n;
        if (wid(ws, a, b) > CAP.maxW) { let best = 1e9; for (let k = 1; k < n; k++) { const m = Math.max(wid(ws, a, a + k), wid(ws, a + k, b)); if (m < best) { best = m; brk = k; } } }
        const rows = brk >= n ? [[a, b]] : [[a, a + brk], [a + brk, b]], pos = {};
        rows.forEach(([r0, r1], ri) => {
          let x = CAP.cx - wid(ws, r0, r1) / 2;
          for (let k = r0; k < r1; k++) { pos[k] = { x, row: ri }; x += tw(ws[k].w + ' ', DISPLAY, CAP.size, 900, -0.02 * CAP.size) - 0.02 * CAP.size; }
        });
        PAGES.push({ a, b, rows, pos, nrows: rows.length, t0: ws[a].t0, words: ws, fimFala: ws[b - 1].t1 });
      });
    });
    PAGES.forEach((q, i) => {
      const nx = PAGES[i + 1], lim = LN.logo - 0.05;
      let t1 = Math.min(nx ? nx.t0 : lim, q.fimFala + CAP.segura);
      t1 = Math.max(t1, Math.min(q.t0 + CAP.minPag, nx ? nx.t0 : lim));
      q.t1 = Math.min(t1, lim);
    });
  }
  function legenda(c, t) {
    const pg = PAGES.find((q) => t >= q.t0 && t < q.t1);
    if (!pg) return;
    const y0 = CAP.y1 + (pg.nrows === 1 ? CAP.lh / 2 : 0), ls = -0.02 * CAP.size;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 16; c.shadowOffsetY = 2;
    for (let k = pg.a; k < pg.b; k++) {
      const w = pg.words[k];
      if (t < w.t0) continue;
      const u = E.outCubic(p(t, w.t0, w.t0 + 0.09)), ps = pg.pos[k], ww = tw(w.w, DISPLAY, CAP.size, 900, ls);
      const pop = w.chave ? 1 + 0.07 * kick(t, w.t0, 0.18) : 1, y = y0 + ps.row * CAP.lh + (1 - u) * 10;
      c.save(); setFont(c, DISPLAY, CAP.size, 900, ls); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.globalAlpha = u; c.fillStyle = w.chave ? C.lime : C.white;
      c.translate(ps.x + ww / 2, y - CAP.size * 0.3); c.scale(pop, pop); c.fillText(w.w, -ww / 2, CAP.size * 0.3); c.restore();
      if (u > 0.99) BOX('legenda', ps.x, y - CAP.size * 0.76, ps.x + ww, y + CAP.size * 0.22);
    }
    c.restore();
  }

  // ---------------------------------------------------------------- o quadro
  function frame(c, t) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowColor = 'transparent';
    fundo(c, t);
    if (t < LN.logo) {
      dor(c, t); virada(c, t);
      SHOTS.forEach((s) => tela(c, s, t));
      dobro(c, t); chamada(c, t);
      chipCena(c, t);
      // a marca some enquanto a logo grande está no centro (a virada)
      const mv = t >= T.dorFim - 0.3 && t < T.viradaFim ? 1 - Math.min(p(t, T.dorFim - 0.3, T.dorFim), 1 - p(t, T.viradaFim - 0.4, T.viradaFim)) : 1;
      marca(c, mv);
      legenda(c, t);
    } else fimLogo(c, t);
    avisoPrevia(c);
  }
  // ---------------------------------------------------------------- capa para a grade do Reel (à parte: o vídeo e a miniatura do WhatsApp não mudam)
  // a dor do roteiro: o mesmo título do vídeo ("Caderno, papel / e um caixa que / não bate?", a chave em limão) e os três
  // elementos da cena 1 (caderno, papel, caixa) no estado final; a logo pequena no alto; sem tela do sistema.
  // O bloco (título + elementos) fica centralizado na vertical do recorte 3:4 (y = 960).
  function desenhaCapa(c, dy) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowColor = 'transparent';
    fundo(c, 0); marca(c);
    c.save(); c.translate(0, dy);
    const S = 104, ls = -0.03 * S;
    txt(c, 'Caderno, papel', 90, 480, { size: S, weight: 900, ls, box: 'título 1' });
    txt(c, 'e um caixa que', 90, 584, { size: S, weight: 900, ls, box: 'título 2' });
    txt(c, 'não bate?', 90, 688, { size: S, weight: 900, ls, color: C.lime, box: 'título 3' });
    const tf = 100;                                            // o estado final das animações da cena 1
    c.save(); c.translate(225, 930); c.scale(0.78, 0.78); caderno(c, tf, 0); c.restore(); BOX('caderno', 120, 800, 330, 1050);
    c.save(); c.translate(510, 915); c.scale(0.78, 0.78); papel(c, tf, 0); c.restore(); BOX('papel', 415, 805, 605, 1025);
    c.save(); c.translate(800, 925); c.scale(0.72, 0.72); caixaRuim(c, tf, 0, 0); c.restore(); BOX('caixa', 650, 879, 950, 971);
    c.restore();
  }
  function capaGrade(c) {
    BOXES = []; desenhaCapa(c, 0);
    const bl = BOXES.filter((b) => b.nome !== 'marca'), topo = Math.min(...bl.map((b) => b.y0)), base = Math.max(...bl.map((b) => b.y1));
    const dy = Math.round(960 - (topo + base) / 2);
    BOXES = []; desenhaCapa(c, dy);
    const caixas = BOXES.map((b) => (b.nome === 'marca' ? b : { ...b, y0: b.y0 + dy, y1: b.y1 + dy })); BOXES = null;
    return { caixas, bloco: { topo: topo + dy, base: base + dy, centro: (topo + base) / 2 + dy }, dy };
  }
  function renderAt(c, t) { frame(c, clamp(t, 0, DUR - 1e-4)); }
  function init(img, linha, telas, imgs, o = {}) {
    LOGO = img; LN = linha; TEL = telas; IMG = imgs; DUR = linha.duracao; PREVIA = !!o.previa;
    M = document.createElement('canvas').getContext('2d');
    tempos(); layoutLegenda();
  }
  function caixas(c, t) { BOXES = []; frame(c, t); const out = BOXES; BOXES = null; return out; }
  window.REEL = {
    init, renderAt, caixas, capaGrade, get DURATION() { return DUR; }, CAP,
    legenda: () => PAGES.map((q) => ({ t0: q.t0, t1: q.t1, linhas: q.rows.map(([a, b]) => q.words.slice(a, b).map((x) => x.w).join(' ')),
      palavras: Array.from({ length: q.b - q.a }, (_, i) => ({ w: q.words[q.a + i].w, t0: q.words[q.a + i].t0, chave: !!q.words[q.a + i].chave })) })),
    plano: () => ({ cenas: CENAS.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1, chip: s.chip })),
      telas: SHOTS.map((s) => ({ nome: s.nome, arquivo: s.tel.arquivo, cena: s.cena.id, entra: s.tin, sai: s.tfim, focos: s.keys.filter((k, i) => i && k.foco && k.hl !== false).map((k) => ({ t: k.t, foco: k.foco })) })) }),
  };
})();
