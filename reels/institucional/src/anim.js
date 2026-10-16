/* =====================================================================
   FAZLO Hospeda — VÍDEO INSTITUCIONAL (60 s, 9:16, para WhatsApp)
   Motor em Canvas 2D, determinístico: renderAt(ctx, t) desenha o quadro
   exato do instante t (s).

   Mecânica: "recorte em relevo + trilho de módulos".
   - Um celular em ¾ (perspectiva real, desenhada em faixas verticais)
     mostra as capturas REAIS do sistema (demo.fazlohospeda.com.br), sem
     nenhuma tela inventada nem retocada.
   - O trecho que importa sai da tela como uma placa em relevo (contorno
     limão, sombra), cresce até ficar legível e o resto do celular escurece
     e desfoca. Pausa para ler. A placa volta para a tela.
   - Entre módulos o celular gira no eixo vertical; no alto, o trilho
     RESERVAS · CHECK-IN · COMANDA · CAIXA · CHECK-OUT · RELATÓRIOS acende.
   - As frases principais da narração ficam escritas na tela (para quem
     assiste sem som) e o quadro 0 já é a miniatura do WhatsApp:
     "FAZLO Hospeda" + a frase forte por cima da bagunça.

   Tempos: as falas de audio/voz/falas.json (início de cada janela) e as
   batidas de cada cena estão em T, SCREENS, LIFTS, TAPS e CAPS abaixo.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const DISPLAY = "'FH Display', 'Inter Display', 'Inter', sans-serif";
  const MONO = "'FH Mono', 'JetBrains Mono', monospace";
  const C = {
    bg: '#0A0A0A', lime: '#AFFA27', limeDeep: '#5A8A0E', white: '#FFFFFF', gray: '#B9B9B1', grayM: '#7E7E78',
    grayD: '#2E2E2C', ink: '#0A0A0A', red: '#E5484D', body: '#1C1C1C', edge: '#3B3B3B',
  };

  // as cenas (s): 1 e 2 têm tempos fixos; 3 a 7 saem da lista de batidas (PLAN, montada em build());
  // a 8 começa quando a 7 termina
  const T = { dor: 0, virada: 6.2, celular: 11.0, reservas: 12.5, fechamento: 0, demo: 0 };
  let DURATION = 90;

  // ---------------------------------------------------------------- utilitários
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  };
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const css = (c, a = 1) => { const v = typeof c === 'string' ? hex(c) : c; return `rgba(${v[0]},${v[1]},${v[2]},${clamp(a)})`; };
  const kick = (t, t0, dur = 0.3) => (t < t0 ? 0 : Math.exp(-((t - t0) / dur) * 4));
  const env = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(E.outCubic(p(t, a, a + fi)), 1 - E.inCubic(p(t, b, b + fo)));

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); }
  function glow(ctx, x, y, r, color, a) {
    if (a <= 0.003 || r <= 1) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, css(color, a)); g.addColorStop(0.45, css(color, a * 0.3)); g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  function setFont(ctx, fam, size, weight, align = 'left', ls = 0) {
    ctx.font = `${weight} ${size}px ${fam}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px';
  }
  function tw(ctx, s, fam, size, weight, ls = 0) { setFont(ctx, fam, size, weight, 'left', ls); return ctx.measureText(s).width; }
  function txt(ctx, s, x, y, o) {
    setFont(ctx, o.fam || MONO, o.size, o.weight || 800, o.align || 'left', o.ls || 0);
    ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha *= clamp(o.alpha);
    ctx.fillStyle = o.color; ctx.fillText(s, x, y); ctx.restore();
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  // mola com leve overshoot (≈ 7%), assentada em x = 1
  const springE = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(7 * x) * (1 - x * x * x) - x * x * x * Math.exp(-6));
  // valor em reais no formato da tela ("R$ 1.525,00", "- R$ 300,00")
  const brl = (v) => { const a = Math.abs(v).toFixed(2).split('.'); return (v < -0.004 ? '- ' : '') + 'R$ ' + a[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + a[1]; };
  const luma = (c) => { const v = hex(c); return 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]; };

  // ---------------------------------------------------------------- perspectiva (giro no eixo vertical)
  // Um retângulo w x h centrado em (cx, cy), girado de `ang` em torno do eixo vertical e visto por uma câmera
  // a F px. Cada coluna do retângulo fica à mesma profundidade, então desenhar a imagem em faixas verticais
  // estreitas, cada uma com a sua escala, é a projeção exata (sem distorção de textura).
  const F = 2400;
  function projX(cx, u, ang) { const z = u * Math.sin(ang); return { x: cx + u * Math.cos(ang) * F / (F + z), s: F / (F + z) }; }
  function drawRotY(ctx, src, sx, sy, sw, sh, cx, cy, w, h, ang) {
    const vis = Math.abs(Math.cos(ang)) * w;
    if (vis < 0.5) return;
    const n = Math.max(6, Math.min(240, Math.ceil(vis / 3)));
    for (let i = 0; i < n; i++) {
      const u0 = -w / 2 + (w * i) / n, u1 = u0 + w / n;
      const a = projX(cx, u0, ang), b = projX(cx, u1, ang);
      const s = (a.s + b.s) / 2, x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
      const hh = h * s;
      ctx.drawImage(src, sx + (sw * i) / n, sy, sw / n, sh, x0 - 0.35, cy - hh / 2, x1 - x0 + 0.7, hh);
    }
  }
  // um ponto (u, v) do plano girado (u, v relativos ao centro) -> tela
  function projPt(cx, cy, u, v, ang) { const q = projX(cx, u, ang); return { x: q.x, y: cy + v * q.s, s: q.s }; }

  // ---------------------------------------------------------------- capturas
  // as capturas reais (780 x 1688 no celular; 1280 x ... no computador), carregadas pelo index.html
  const SHOT_FILES = {
    calendario: 'celular/02-calendario--calendario-rolagem.png',
    acomodacao: 'celular/13-nova-reserva--etapa2-acomodacao-escolhida.png',
    criada: 'celular/13-nova-reserva--reserva-criada.png',
    voucher: 'celular/03-reservas--voucher.png',
    checkin: 'celular/14-check-in--modal-check-in.png',
    reciboIn: 'celular/14-check-in--recibo-check-in.png',
    ficha: 'celular/04-hospedagens--ficha-hospedagem-ana.png',
    quantidade: 'celular/06-comandas--modal-quantidade.png',
    lancado: 'celular/06-comandas--consumo-lancado.png',
    caixa: 'celular/07-caixa--caixa.png',
    caixaRolagem: 'celular/07-caixa--caixa-rolagem.png',
    fecharCaixa: 'celular/07-caixa--form-fechar-caixa.png',
    checkout: 'celular/04-hospedagens--modal-check-out.png',
    reciboOut: 'celular/04-hospedagens--recibo-check-out.png',
    relatorios: 'celular/08-relatorios--relatorios-rolagem.png',
    visaoGeral: 'celular/01-visao-geral--visao-geral.png',
    demoCel: 'celular/00-acesso--login-demo.png',
    calendarioPC: 'computador/02-calendario--calendario.png',
    comandasPC: 'computador/06-comandas--consumo-lancado.png',
    demoPC: 'computador/00-acesso--login-demo.png',
  };
  let IMG = {}, LOGO = null;

  // ---------------------------------------------------------------- a linha do tempo (cenas 3 a 7)
  // Cada batida: a navegação até a tela (liga / giro = troca de módulo / toque = botão real da tela anterior /
  // fica = mesma tela), o recorte em relevo que sobe, fica PARADO e LEGÍVEL e volta, a frase escrita e o
  // trecho de voz (src/voz-trechos.json). Regra de ritmo: cada recorte fica parado no mínimo HOLD s, e no
  // mínimo até READ s depois do fim do seu trecho de voz; a frase só sai quando o recorte começa a voltar.
  // Recortes: [x0, y0, x1, y1] em pixels da captura; hl = destaque limão; s = escala máxima (cabe em
  // 960 x 1180); cy = centro do recorte na tela; tap = o botão tocado na tela anterior.
  const Wc = C.white, Lc = C.lime;
  const PLAN = [
    // ops: o motion de entrada, sempre sobre os pixels da própria captura e terminando neles (ver runOps):
    // roll = placar, count = valor contando, stamp = selo que estala, reveal = bloco que entra, check = traço que se
    // desenha, type = texto digitado (revela a captura letra a letra, com cursor), wipe = linha impressa, tap = toque.
    // t = início em s depois que o recorte pousa. Cores e posições medidas nas capturas.
    { mod: 'RESERVAS', screen: 'calendario', mode: 'liga', voz: '3a',
      // "as células de ocupação se preenchem uma a uma": os quartos do dia entram um a um, com o selo de cada um
      lifts: [{ crop: [24, 212, 756, 1005], hl: [450, 224, 742, 268], hlT: 0.95, s: 1.27, cy: 1170, ops: [
        { type: 'roll', r: [466, 234, 482, 258], bg: '#ECFDF5', color: '#006045', to: 5, t: 0.0, dur: 0.75 },
        { type: 'roll', r: [599, 234, 615, 258], bg: '#ECFDF5', color: '#006045', to: 5, t: 0.1, dur: 0.75 },
        { type: 'reveal', r: [32, 290, 750, 634], bg: '#FBFBFB', t: 0.1 },
        { type: 'stamp', r: [570, 334, 716, 388], bg: '#FFFFFF', t: 0.45, after: 0.1 },
        { type: 'reveal', r: [32, 654, 750, 1000], bg: '#FBFBFB', t: 0.35 },
        { type: 'stamp', r: [514, 700, 716, 752], bg: '#FFFFFF', t: 0.7, after: 0.35 }] }],
      cap: [[['Veja a ', Wc], ['ocupação', Lc]], [['no calendário', Wc]]] },
    { screen: 'acomodacao', mode: 'toque', tap: [390, 1600], pause: 0.9 },              // o "+": a etapa 2 passa na tela
    { screen: 'criada', mode: 'toque', tap: [594, 1388], voz: '3b',                        // Avançar
      lifts: [{ crop: [130, 318, 650, 652], hl: [412, 586, 614, 644], hlT: 0.95, s: 1.7, cy: 1160, ops: [
        { type: 'check', r: [350, 362, 430, 442], bg: '#F7FEE7', color: '#5EA500', c: [390, 402], rad: 33, lw: 7,
          pts: [[-10, -1], [-3.5, 7], [10, -7.5]], plw: 6, t: 0.0, dur: 0.6 },
        { type: 'reveal', r: [214, 524, 566, 574], bg: '#FFFFFF', t: 0.2 },
        { type: 'type', r: [436, 602, 592, 628], bg: '#F5F5F5', t: 0.35, cps: 30 }] }],
      cap: [[['Lance a ', Wc], ['reserva', Lc]], [['em poucos passos', Wc]]] },
    { screen: 'voucher', mode: 'toque', tap: [390, 1276], veil: true, voz: '3c',          // Ver voucher
      lifts: [{ crop: [24, 32, 756, 172], pad: [0, 0, 18, 0], bg: '#171717', s: 1.27, cy: 930, ops: [   // só código, status e botões:
        { type: 'type', r: [488, 110, 644, 132], bg: '#171717', t: 0.05, cps: 24 },                     // o nome nunca aparece
        { type: 'stamp', r: [450, 146, 646, 168], bg: '#171717', t: 0.45 }] },
        { crop: [52, 1462, 730, 1630], hl: [396, 1466, 728, 1532], hlT: 0.9, s: 1.36, cy: 1430, ops: [
          { type: 'tap', x: 560, y: 1500, t: 0.55 }] }],
      cap: [[['Envie o ', Wc], ['voucher', Lc]], [['ao hóspede', Wc]]] },
    // check-in: antes do recorte, a câmera se aproxima do campo real "Valor (R$)" e o "R$ 500,00" é digitado;
    // o selo "Quitação 100%" estala. Depois o resumo sobe com os valores contando.
    { mod: 'CHECK-IN', screen: 'checkin', mode: 'giro', voz: '4a', vozPre: true,
      pre: { dur: 1.85, zoom: { x: 470, y: 1180, z: 1.5, ty: 1300 }, ops: [
        { type: 'tap', x: 515, y: 1150, t: 0.35 },
        { type: 'type', r: [516, 1138, 638, 1164], bg: '#FFFFFF', t: 0.5, cps: 13, align: 'right' },
        { type: 'stamp', r: [450, 1248, 660, 1290], bg: '#FFFFFF', t: 1.35 }] },
      lifts: [{ crop: [66, 522, 714, 830], hl: [92, 742, 690, 804], hlT: 1.05, s: 1.45, cy: 1150, ops: [
        { type: 'count', r: [562, 636, 680, 658], bg: '#FFFFFF', color: '#171717', to: 800, t: 0.0, dur: 0.55, weight: 700 },
        { type: 'count', r: [537, 684, 680, 706], bg: '#FFFFFF', color: '#009966', to: -300, t: 0.2, dur: 0.5, weight: 700 },
        { type: 'count', r: [523, 758, 680, 788], bg: '#FFFFFF', color: '#0A0A0A', to: 500, t: 0.4, dur: 0.6, weight: 800 }] }],
      cap: [[['No check-in,', Wc]], [['registre o ', Wc], ['pagamento', Lc]]] },
    { screen: 'reciboIn', mode: 'imprime', tap: [483, 1534], voz: '4b',                    // Confirmar recebimento e realizar Check-in
      // só a frase e o saldo: o título "HOSPEDAGEM QUITADA NO CHECK-IN" quebra em "CHECK-" / "IN" no celular
      // (defeito do sistema) e fica fora do recorte (o "IN" termina em y 914; a frase começa em y 917)
      lifts: [{ crop: [112, 915, 668, 1046], pad: [26, 0, 0, 0], bg: '#ECFDF5', hl: [130, 990, 348, 1034], hlT: 0.95, s: 1.7, cy: 1170, ops: [
        { type: 'wipe', r: [184, 914, 588, 942], bg: '#ECFDF5', t: 0.05, dur: 0.45 },
        { type: 'wipe', r: [184, 948, 354, 976], bg: '#ECFDF5', t: 0.4, dur: 0.3 },
        { type: 'stamp', r: [128, 990, 350, 1036], bg: '#ECFDF5', t: 0.65 }] }],
      cap: [[['E gere o ', Wc], ['recibo', Lc]], [['na hora', Wc]]] },
    { mod: 'COMANDA', screen: 'ficha', mode: 'giro', pause: 0.8 },                          // a ficha da hospedagem, inteira
    { screen: 'quantidade', mode: 'toque', tap: [390, 882], voz: '5a',                       // Lançar consumo
      lifts: [{ crop: [32, 546, 748, 1144], s: 1.3, cy: 1160, ops: [
        { type: 'tap', x: 661, y: 824, t: 0.0 },                                               // o "+" da quantidade
        { type: 'roll', r: [380, 811, 400, 838], bg: '#FFFFFF', color: '#171717', from: 1, to: 2, t: 0.12, dur: 0.4 },
        { type: 'count', r: [594, 941, 706, 967], bg: '#FFFFFF', color: '#171717', from: 7, to: 14, t: 0.15, dur: 0.45, weight: 800 },
        { type: 'tap', x: 390, y: 1058, t: 0.85 }] }],                                         // Adicionar à comanda
      cap: [[['Durante a estadia, cada', Wc]], [['consumo é ', Wc], ['lançado', Lc]]] },
    // a confirmação real sobe e "voa" até a conta do quarto: a linha "Bica D'Água 01" das comandas ativas (tela do
    // computador, mesma demo): 4 → 6 unidades e R$ 38,00 → R$ 52,00 (antes e depois do lançamento, capturas reais)
    { screen: 'lancado', mode: 'toque', tap: [390, 1058], voz: '5b',                        // Adicionar à comanda
      lifts: [{ crop: [64, 476, 716, 606], s: 1.45, cy: 980, fly: { to: 1, t: 0.3, dur: 0.6 } },
        { key: 'comandasPC', crop: [942, 322, 1232, 392], s: 2.4, cy: 1360, ops: [
          { type: 'roll', r: [957, 350, 968, 366], bg: '#FFFFFF', color: '#171717', from: 4, to: 6, t: 0.4, dur: 0.45 },
          { type: 'count', r: [1150, 352, 1204, 366], bg: '#FFFFFF', color: '#171717', from: 38, to: 52, t: 0.4, dur: 0.6, weight: 700 }] }],
      cap: [[['E vai direto para a', Wc]], [['conta dele', Lc]]] },
    // o lançamento da Ana Julia (a hóspede da comanda): "Pagamento de hospedagem —" quebra no travessão; o do
    // Carlos, na 1ª tela do caixa, partia o nome ("Carlos" / "Henrique Silva") e ficou de fora
    { mod: 'CAIXA', screen: 'caixaRolagem', mode: 'giro', voz: '6a',
      lifts: [{ crop: [74, 992, 706, 1526], s: 1.45, cy: 1170, ops: [
        { type: 'reveal', r: [74, 992, 706, 1250], bg: '#FFFFFF', dx: 60, t: 0.0 },
        { type: 'stamp', r: [500, 1020, 682, 1054], bg: '#FBFBFB', t: 0.3, after: 0.0 },
        { type: 'reveal', r: [74, 1268, 706, 1526], bg: '#FFFFFF', dx: 60, t: 0.35 },
        { type: 'stamp', r: [526, 1300, 682, 1334], bg: '#FBFBFB', t: 0.65, after: 0.35 }] }],
      cap: [[['Cada recebimento', Wc]], [['entra no ', Wc], ['caixa', Lc]]] },
    { screen: 'caixa', mode: 'rola', pause: 0.7 },                                         // a tela volta ao topo
    { screen: 'fecharCaixa', mode: 'toque', tap: [390, 408], voz: '6b',                     // Fechar Caixa
      lifts: [{ crop: [30, 526, 750, 1546], hl: [404, 1248, 748, 1372], hlT: 1.1, s: 1.3, cy: 1190, ops: [
        { type: 'count', r: [59, 1313, 197, 1339], bg: '#FFFFFF', color: '#171717', to: 300, t: 0.0, dur: 0.5, weight: 700 },
        { type: 'count', r: [465, 1313, 664, 1339], bg: '#FFFFFF', color: '#009966', to: 1525, prefix: '+ ', t: 0.1, dur: 0.6, weight: 700 },
        { type: 'count', r: [97, 1465, 248, 1491], bg: '#FFFFFF', color: '#EC003F', to: -45, t: 0.2, dur: 0.45, weight: 700 },
        { type: 'count', r: [429, 1483, 567, 1509], bg: '#FFFFFF', color: '#9AE600', to: 255, t: 0.3, dur: 0.6, weight: 700 },
        { type: 'tap', x: 390, y: 1126, t: 1.05 }] }],                                        // Confirmar fechamento de caixa
      cap: [[['Abra e feche sabendo', Wc]], [['quanto ', Wc], ['entrou', Lc]]] },
    { mod: 'CHECK-OUT', screen: 'checkout', mode: 'giro', voz: '7a',
      lifts: [{ crop: [74, 772, 706, 1194], hl: [100, 962, 680, 1036], hlT: 1.25, s: 1.45, cy: 1160, ops: [
        { type: 'count', r: [554, 850, 672, 872], bg: '#FFFFFF', color: '#404040', to: 960, t: 0.0, dur: 0.5, weight: 700 },
        { type: 'count', r: [554, 912, 672, 934], bg: '#FFFFFF', color: '#007A55', to: 960, t: 0.1, dur: 0.5, weight: 700 },
        { type: 'count', r: [405, 983, 512, 1009], bg: '#FFFFFF', color: '#007A55', from: 960, to: 0, t: 0.25, dur: 0.6, weight: 800 },
        { type: 'stamp', r: [524, 970, 678, 1020], bg: '#FFFFFF', t: 0.7 },
        { type: 'check', r: [545, 983, 571, 1009], bg: '#D0FAE5', color: '#009966', c: [558, 996], rad: 9, lw: 2.2,
          pts: [[-4, 0], [-1.2, 3], [4, -3]], plw: 2.2, t: 0.85, dur: 0.45 }] }],
      cap: [[['No check-out, tudo', Wc]], [['fecha com ', Wc], ['recibo', Lc]]] },
    { screen: 'reciboOut', mode: 'imprime', tap: [390, 1302],                               // Confirmar Check-out
      // o título "RECIBO DE HOSPEDAGEM — DOCUMENTO NÃO / FISCAL" quebra a linha: fica fora; sobem o cabeçalho
      // do recibo (com o código da reserva) e, separado, o selo "SALDO QUITADO"
      lifts: [{ crop: [26, 74, 754, 648], s: 1.3, cy: 1010 },
        { crop: [80, 806, 356, 878], hl: [90, 814, 344, 870], s: 1.6, cy: 1520, hlT: 0.75, ops: [
          { type: 'stamp', r: [84, 812, 350, 874], bg: '#FAFAFA', t: 0.0 },
          { type: 'check', r: [113, 829, 139, 855], bg: '#D0FAE5', color: '#009966', c: [126, 842], rad: 9, lw: 2.2,
            pts: [[-4, 0], [-1.2, 3], [4, -3]], plw: 2.2, t: 0.2, dur: 0.45 }] }], cap: 'mesma' },
    { mod: 'RELATÓRIOS', screen: 'relatorios', mode: 'giro', voz: '7b',
      lifts: [{ crop: [66, 172, 714, 640], s: 1.45, cy: 1160, ops: [
        { type: 'count', r: [131, 284, 324, 314], bg: '#FFFFFF', color: '#171717', to: 8940, t: 0.0, dur: 0.7, weight: 700 },
        { type: 'count', r: [131, 500, 288, 530], bg: '#FFFFFF', color: '#171717', to: 151, t: 0.15, dur: 0.6, weight: 700 }] }],
      cap: [[['Os relatórios mostram', Wc]], [['como a pousada ', Wc], ['está indo', Lc]]] },
  ];
  const NAV = { liga: 0.5, giro: 0.65, toque: 0.7, imprime: 1.15, rola: 0.45, fica: 0.15 };   // da batida até o recorte subir
  const RISE = 0.55, DROP = 0.38, GAP = 0.05, HOLD = 3.0, READ = 0.7, VOZ_IN = 0.25;
  const AS = 0.8;                                      // as entradas animadas a 80% do tempo (meta: vídeo perto de 100 s)
  const GIRO = 0.5, TOQUE = 0.32, IMPRIME = 0.8;
  // a música (scripts/trilha.py) tem 105 BPM e o 1º tempo quando a logo cresce; cada batida começa num tempo dela
  const BPM = 105, BT = 60 / BPM, M0 = T.virada + 0.75;
  const onBeat = (t) => M0 + Math.ceil((t - M0 - 1e-6) / (BT / 2)) * (BT / 2);   // no tempo (ou no meio tempo)
  let SCREENS = [], LIFTS = [], TAPS = [], CAPS = [], TRILHO = [], VOZ = [], TRECHOS = {}, PHONE_OPS = [], ZOOMS = [];
  // quanto dura a animação de entrada de um recorte (depois de pousar)
  const OP_DUR = { roll: (o) => o.dur, count: (o) => o.dur + 0.15, stamp: () => 0.3, reveal: () => 0.35, check: (o) => o.dur + 0.15,
    type: (o) => (o.n || 10) / o.cps + 0.1, wipe: (o) => o.dur, tap: () => 0.45, grow: (o) => o.dur || 0.45 };
  const animEnd = (ops) => Math.max(0, ...(ops || []).map((o) => o.t + OP_DUR[o.type](o)));

  function build(trechos) {
    TRECHOS = {}; trechos.forEach((x) => (TRECHOS[x.id] = x));
    SCREENS = []; LIFTS = []; TAPS = []; CAPS = []; TRILHO = []; VOZ = [];
    // cenas 1 e 2
    VOZ.push({ id: '1', t: 0.5 }, { id: '2', t: T.virada + 0.35 });
    CAPS.push({ t0: T.virada + 2.05, t1: T.celular + 0.25, size: 82, y: 1150, stag: 0.5,
      lines: [[['A gestão da sua pousada', C.white]], [['em um só lugar.', C.lime]]] });
    // cenas 3 a 7
    let t = T.reservas, prev = null;
    for (const b of PLAN) {
      t = onBeat(t);                                   // a troca de tela cai no tempo da batida
      if (b.mod) TRILHO.push([b.mod, t]);
      if (b.tap && prev) TAPS.push({ t: t + 0.08, key: prev, x: b.tap[0], y: b.tap[1] });
      if (b.mode === 'liga' || b.mode === 'giro') SCREENS.push({ t, key: b.screen, mode: b.mode, veil: b.veil });
      if (b.mode === 'toque') SCREENS.push({ t: t + 0.32, key: b.screen, mode: 'toque', veil: b.veil });
      if (b.mode === 'imprime') SCREENS.push({ t: t + 0.32, key: b.screen, mode: 'imprime' });
      if (b.mode === 'rola') SCREENS.push({ t, key: b.screen, mode: 'toque', dir: 'v' });
      prev = b.screen;
      if (b.pause) { t += NAV[b.mode] + b.pause; continue; }
      let r = t + NAV[b.mode];
      const vd = b.voz ? TRECHOS[b.voz].dur : 0;
      if (b.pre) {                                     // antes do recorte: a câmera se aproxima e algo acontece na tela
        const z = b.pre.zoom;
        ZOOMS.push({ t0: r, t1: r + b.pre.dur, key: b.screen, x: z.x, y: z.y, z: z.z, ty: z.ty });
        b.pre.ops.forEach((o) => PHONE_OPS.push(Object.assign({}, o, { key: b.screen, t: r + o.t })));
        if (b.voz && b.vozPre) VOZ.push({ id: b.voz, t: r + 0.3 });
        r += b.pre.dur;
      } else if (b.voz) VOZ.push({ id: b.voz, t: r + VOZ_IN });
      const vozFim = b.voz ? VOZ[VOZ.length - 1].t + vd : 0;
      // as entradas a AS do tempo; segura: a animação de entrada inteira e, depois dela, no mínimo HOLD s parado
      // (e READ s depois da voz). O destaque limão não conta: ele marca o dado com o recorte já legível.
      const scaled = b.lifts.map((L) => (L.ops || []).map((o) => Object.assign({}, o, { t: o.t * AS },
        o.dur ? { dur: o.dur * AS } : {}, o.after !== undefined ? { after: o.after * AS } : {})));
      const an = Math.max(...b.lifts.map((L, i) => 0.45 * i + animEnd(scaled[i])));
      const t1 = Math.max(r + RISE + an + HOLD + 0.3 * (b.lifts.length - 1), vozFim + READ);
      b.lifts.forEach((L, i) => {
        const t0 = r + 0.45 * i, land = t0 + RISE;
        LIFTS.push(Object.assign({}, L, { key: L.key || b.screen, own: !!L.key, t0, t1, land, hlT: L.hlT !== undefined ? land + L.hlT * AS : undefined,
          fly: L.fly ? Object.assign({}, L.fly, { t: L.fly.t * AS, dur: L.fly.dur * AS }) : undefined,
          ops: scaled[i].map((o) => Object.assign({}, o, { t: land + o.t }, o.after !== undefined ? { from: land + o.after } : {})) }));
      });
      if (b.cap === 'mesma') CAPS[CAPS.length - 1].t1 = t1;
      else if (b.cap) CAPS.push({ t0: b.pre ? r - b.pre.dur : r, t1, lines: b.cap });
      t = t1 + DROP + GAP;
    }
    // cena 8: celular e computador; depois a demonstração
    T.fechamento = t + 0.15;
    const F = T.fechamento;
    MON_OPS = MON_BARS.map((r, i) => ({ type: 'grow', r, t: F + 1.1 + 0.28 * i, dur: 0.45 }));
    SCREENS.push({ t: F + 0.1, key: 'visaoGeral', mode: 'toque' });
    VOZ.push({ id: '8a', t: F + 0.4 });
    const c8 = F + 0.4 + TRECHOS['8a'].dur + 0.35;
    VOZ.push({ id: '8b', t: c8 + 0.1 });
    CAPS.push({ t0: c8, t1: 999, size: 66, y: 368, lines: [[['No celular ou no ', C.white], ['computador', C.lime]]] });
    T.demo = c8 + 0.5 + HOLD + 0.3;                        // a frase fica pelo menos 3 s legível antes de a tela virar
    SCREENS.push({ t: T.demo, key: 'demoCel', mode: 'giro' });
    VOZ.push({ id: '8c', t: T.demo + 0.25 });
    T.url = T.demo + 0.75;
    DURATION = Math.round((T.demo + 0.25 + TRECHOS['8c'].dur + 3.0) * 10) / 10;   // o endereço fica na tela até o fim
    T.relatorios = (TRILHO.find((x) => x[0] === 'RELATÓRIOS') || [0, 0])[1];
  }

  // =====================================================================
  // LAYOUT
  // =====================================================================
  // celular: 618 x 1296 (tela 582 x 1260 = a captura de 780 x 1688 a 0,746), centro em (540, 1188)
  const PH = { w: 618, h: 1296, bezel: 18, r: 72, sr: 54, cx: 540, cy: 1190 };
  const SCR = { x: PH.bezel, y: PH.bezel, w: PH.w - 2 * PH.bezel, h: PH.h - 2 * PH.bezel };
  const KS = SCR.w / 780;                          // pixels da captura -> pixels do celular
  const HEAD = { y: 118, d: 58, name: 36 };        // a logo pequena no alto (cenas 3 a 7)
  const CAP = { y: 352, size: 70, lead: 1.08 };    // as frases (2 linhas, baseline da 1ª em y = 352)
  const RAIL = { y: 212, h: 44 };                  // o trilho de módulos

  // ---------------------------------------------------------------- logo
  function lockup(ctx, cx, cy, d, size, alpha = 1, reveal = 1) {
    if (alpha <= 0.002 || d < 1) return null;
    const name = 'FAZLO Hospeda', ls = -0.02 * size;
    const nw = tw(ctx, name, DISPLAY, size, 900, ls), gap = d * 0.28;
    const total = d + gap + nw, x = cx - total / 2;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, x, cy - d / 2, d, d);
    ctx.save();
    ctx.beginPath(); ctx.rect(x + d + gap - 4, cy - size, (nw + 12) * clamp(reveal), size * 2); ctx.clip();
    setFont(ctx, DISPLAY, size, 900, 'left', ls); ctx.fillStyle = C.white;
    ctx.fillText(name, x + d + gap, cy + size * 0.36);
    ctx.restore();
    ctx.restore();
    return { x0: x, x1: x + total };
  }

  // ---------------------------------------------------------------- frases
  function capLine(ctx, segs, cx, y, size, pin, alpha) {
    if (pin <= 0 || alpha <= 0.002) return;
    const ls = -0.025 * size;
    const ws = segs.map(([s]) => tw(ctx, s, DISPLAY, size, 900, ls));
    const total = ws.reduce((a, b) => a + b, 0);
    const off = (1 - E.outExpo(clamp(pin))) * size * 1.15;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.beginPath(); ctx.rect(0, y - size * 1.02, W, size * 1.32); ctx.clip();
    let x = cx - total / 2;
    segs.forEach(([s, col], i) => { setFont(ctx, DISPLAY, size, 900, 'left', ls); ctx.fillStyle = col; ctx.fillText(s, x, y + off); x += ws[i]; });
    ctx.restore();
  }
  function fitSize(ctx, c) {
    let size = c.size || CAP.size;
    for (const segs of c.lines) {
      const w = segs.reduce((a, [s]) => a + tw(ctx, s, DISPLAY, size, 900, -0.025 * size), 0);
      if (w > 960) size = Math.floor(size * 960 / w);
    }
    return size;
  }
  const CAP_OUT = 0.22;
  function scrim(ctx) {
    if (ZOOM_A > 0.01) {
      const A = Math.sqrt(ZOOM_A);                    // some mais devagar que o zoom: o celular ainda grande não passa sobre as frases                               // o celular aproximado passa por trás da logo e das frases: faixa escura
      const g = ctx.createLinearGradient(0, 0, 0, 540);
      g.addColorStop(0, css('#0A0A0A', 0.95 * A)); g.addColorStop(0.8, css('#0A0A0A', 0.92 * A)); g.addColorStop(1, css('#0A0A0A', 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 540);
    }
  }
  function captions(ctx, t) {
    CAPS.forEach((c, i) => {
      // a frase sai antes de a seguinte entrar no mesmo lugar (nunca duas frases sobrepostas)
      const nx = CAPS[i + 1], t1 = nx && !nx.y && !c.y ? Math.min(c.t1, nx.t0 - CAP_OUT - 0.04) : c.t1;
      if (t < c.t0 || t > t1 + CAP_OUT) return;
      const size = fitSize(ctx, c), y0 = c.y || CAP.y;
      const out = E.inCubic(p(t, t1, t1 + CAP_OUT));
      c.lines.forEach((segs, i) => {
        const tl = c.t0 + i * (c.stag ?? 0.16);
        capLine(ctx, segs, 540, y0 + i * size * CAP.lead - out * 26, size, p(t, tl, tl + 0.5), 1 - out);
      });
    });
  }

  // ---------------------------------------------------------------- trilho de módulos
  function rail(ctx, t) {
    const a = env(t, T.reservas - 0.15, T.fechamento - 0.3, 0.45, 0.4);
    if (a <= 0.002) return;
    const size = 21, ls = 0.6, pad = 15, gap = 9;
    const ws = TRILHO.map(([s]) => tw(ctx, s, MONO, size, 800, ls) + 2 * pad);
    const total = ws.reduce((x, y) => x + y, 0) + gap * (TRILHO.length - 1);
    let x = 540 - total / 2;
    const y = RAIL.y - RAIL.h / 2 + (1 - E.outCubic(p(t, T.reservas - 0.15, T.reservas + 0.3))) * -24;
    ctx.save(); ctx.globalAlpha *= a;
    TRILHO.forEach(([s, t0], i) => {
      const next = i + 1 < TRILHO.length ? TRILHO[i + 1][1] : 1e9;
      const on = E.outCubic(p(t, t0, t0 + 0.35));                 // acende
      const done = E.outCubic(p(t, next, next + 0.35));           // passou: fica com o contorno limão
      const w = ws[i];
      rr(ctx, x, y, w, RAIL.h, RAIL.h / 2);
      ctx.lineWidth = 2; ctx.strokeStyle = on > 0 ? css(C.lime, lerp(0.15, 0.55, on)) : css(C.grayD, 1); ctx.stroke();
      const fill = on * (1 - done);
      if (fill > 0.002) {
        ctx.save(); rr(ctx, x, y, w, RAIL.h, RAIL.h / 2); ctx.clip();
        ctx.fillStyle = C.lime; ctx.fillRect(x, y, w * E.outCubic(fill), RAIL.h); ctx.restore();
      }
      const col = fill > 0.5 ? C.ink : on > 0 ? C.lime : '#64645F';
      txt(ctx, s, x + w / 2, y + RAIL.h / 2 + size * 0.36, { size, weight: 800, color: col, align: 'center', ls });
      x += w + gap;
    });
    ctx.restore();
  }

  // =====================================================================
  // CENA 1 — A BAGUNÇA (caderno, planilha, conversas, bilhetes, caixa que não bate)
  // Ilustração, não é tela do sistema.
  // =====================================================================
  const INK = '#2B3B6E', PAPER = '#EEE7D6', NOTE = '#EFDF84';
  function hand(ctx, s, x, y, size, color = INK, o = {}) {      // "letra de mão": Inter inclinada
    ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, -0.2, 1, 0, 0);
    setFont(ctx, DISPLAY, size, o.weight || 600, 'left', o.ls ?? -0.2); ctx.fillStyle = color; ctx.fillText(s, 0, 0);
    if (o.strike) { const w = ctx.measureText(s).width; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -size * 0.32); ctx.lineTo(w + 6, -size * 0.36); ctx.stroke(); }
    ctx.restore();
  }
  const MESS = [];
  function buildMess() {
    const mk = (w, h, draw) => { const c = canvas(w, h); draw(c.getContext('2d'), w, h); return c; };
    // o caderno
    MESS.push({ c: mk(560, 700, (g, w, h) => {
      g.fillStyle = PAPER; rr(g, 0, 0, w, h, 10); g.fill();
      g.strokeStyle = '#B6C3DC'; g.lineWidth = 2;
      for (let y = 150; y < h - 20; y += 52) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
      g.strokeStyle = '#E2A3A0'; g.beginPath(); g.moveTo(96, 20); g.lineTo(96, h - 10); g.stroke();
      for (let y = 60; y < h; y += 92) { g.fillStyle = '#0A0A0A'; g.beginPath(); g.arc(40, y, 12, 0, TAU); g.fill(); }
      hand(g, 'Reservas — outubro', 118, 112, 40, INK, { weight: 800 });
      hand(g, '16/10  chalé 2 — sinal?', 118, 192, 33);
      hand(g, '17/10  casal (confirmar)', 118, 244, 33);
      hand(g, '17/10  3 pessoas', 118, 296, 33, INK, { strike: true });
      hand(g, '18/10  ligar de volta', 118, 348, 33);
      hand(g, 'sábado: tem vaga??', 118, 400, 33, '#B3261E', { weight: 700 });
      hand(g, '19/10  chalé 2 ou 3?', 118, 452, 33);
      hand(g, 'pagou metade (Pix)', 118, 504, 33);
    }), cx: 300, cy: 690, rot: -9, beat: 1.65 });
    // a planilha
    MESS.push({ c: mk(640, 400, (g, w, h) => {
      g.fillStyle = '#FBFBFA'; g.fillRect(0, 0, w, h);
      const cols = [0, 170, 320, 470, w], rows = [0, 56, 116, 176, 236, 296, 356, h];
      g.fillStyle = '#E4E6E3'; g.fillRect(0, 0, w, 56);
      g.strokeStyle = '#CFCFCB'; g.lineWidth = 2;
      cols.forEach((x) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); });
      rows.forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
      const data = [['Quarto', 'Entrada', 'Saída', 'Valor'], ['Chalé 1', '16/10', '18/10', '800'], ['Chalé 2', '17/10', '???', '#REF!'],
        ['Suíte', '16/10', '17/10', '450'], ['Chalé 3', '18/10', '20/10', ''], ['Total', '', '', '#VALOR!']];
      data.forEach((r, i) => r.forEach((s, j) => {
        const bad = s.startsWith('#') || s === '???';
        txt(g, s, cols[j] + 16, rows[i] + 40, { size: 25, weight: i === 0 ? 800 : 500, color: bad ? '#C62828' : '#333' });
      }));
    }), cx: 800, cy: 540, rot: 7, beat: 0.9 });
    // as conversas
    MESS.push({ c: mk(580, 420, (g, w, h) => {
      const bub = (y, s, time) => {
        const bw = tw(g, s, DISPLAY, 30, 600) + 150;
        g.fillStyle = '#262626'; rr(g, 10, y, bw, 92, 26); g.fill();
        g.beginPath(); g.moveTo(10, y + 64); g.lineTo(-6, y + 92); g.lineTo(40, y + 80); g.fill();
        txt(g, s, 40, y + 56, { fam: DISPLAY, size: 30, weight: 600, color: '#F2F2EC' });
        txt(g, time, bw - 14, y + 80, { size: 18, weight: 500, color: '#8E8E88', align: 'right' });
      };
      bub(10, 'Oi! Tem vaga no sábado?', '23:41');
      bub(150, 'Fiz o Pix do sinal, confere?', '23:52');
      bub(290, 'Quanto deu o frigobar?', '00:07');
    }), cx: 330, cy: 1300, rot: -5, beat: 4.4 });
    // a fita do caixa
    MESS.push({ c: mk(340, 620, (g, w, h) => {
      g.fillStyle = '#F6F6F1'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h - 20);
      for (let x = w; x >= 0; x -= 20) g.lineTo(x, h - ((x / 20) % 2 ? 0 : 20));
      g.closePath(); g.fill();
      const L = [['CAIXA 16/10', 800, '#222'], ['------------------', 500, '#999'], ['entradas  1.480,00', 600, '#222'], ['pix           ?', 600, '#222'],
        ['cartão    ?', 600, '#222'], ['contado   1.425,00', 600, '#222'], ['------------------', 500, '#999'], ['DIF.       -55,00', 800, '#C62828'], ['  ???', 800, '#C62828']];
      L.forEach(([s, wt, col], i) => txt(g, s, 22, 60 + i * 58, { size: 26, weight: wt, color: col }));
    }), cx: 860, cy: 1170, rot: 5, beat: 3.7, shake: true });
    // a comanda de papel
    MESS.push({ c: mk(380, 430, (g, w, h) => {
      g.fillStyle = '#F3EFE6'; rr(g, 0, 0, w, h, 6); g.fill();
      txt(g, 'COMANDA Nº 027', 24, 54, { size: 26, weight: 800, color: '#333' });
      g.strokeStyle = '#C9C2B2'; g.lineWidth = 2; g.beginPath(); g.moveTo(20, 76); g.lineTo(w - 20, 76); g.stroke();
      hand(g, '2 cerveja', 34, 140, 34); hand(g, '1 porção', 34, 200, 34); hand(g, 'água ?', 34, 260, 34);
      hand(g, 'quarto: ??', 34, 340, 34, '#B3261E', { weight: 700 });
    }), cx: 250, cy: 1720, rot: -7, beat: 2.36 });
    // os bilhetes
    MESS.push({ c: mk(300, 300, (g, w, h) => {
      g.fillStyle = NOTE; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 0, w, 34);
      hand(g, 'frigobar Q.3', 26, 110, 34); hand(g, '2 águas + 1 cerv.', 26, 166, 30); hand(g, 'cobrar!!', 26, 236, 38, '#B3261E', { weight: 800 });
    }), cx: 730, cy: 1560, rot: 9, beat: 2.8 });
    MESS.push({ c: mk(270, 270, (g, w, h) => {
      g.fillStyle = '#F2D38A'; g.fillRect(0, 0, w, h);
      hand(g, 'pagar lenha', 24, 104, 34); hand(g, 'sexta', 24, 160, 34); hand(g, 'R$ ???', 24, 222, 34, '#B3261E', { weight: 800 });
    }), cx: 900, cy: 1790, rot: -12, beat: 4.0 });
    MESS.push({ c: mk(280, 280, (g, w, h) => {
      g.fillStyle = NOTE; g.fillRect(0, 0, w, h);
      hand(g, 'Sr. do chalé 2', 22, 100, 31); hand(g, 'chega 14h?', 22, 156, 31); hand(g, 'ou 16h', 22, 212, 31);
    }), cx: 170, cy: 330, rot: -14, beat: 1.2 });
  }
  function mess(ctx, t) {
    const out = p(t, T.virada - 0.05, T.virada + 0.75);
    if (out >= 1) return;
    MESS.forEach((m, i) => {
      const st = 0.06 * i, q = E.inCubic(p(out, st, st + 0.55 + 0.3 * (i % 3) / 3));
      const drift = Math.sin(t * 0.7 + i * 1.7) * 6, k = kick(t, m.beat, 0.35);
      const sh = m.shake ? Math.sin(t * 55) * 9 * kick(t, m.beat, 0.6) : 0;
      const x = lerp(m.cx + drift + sh, 540, q), y = lerp(m.cy + Math.cos(t * 0.6 + i) * 5, LOGO0.y, q);
      const s = lerp(1 + 0.05 * k, 0.04, q), rot = (m.rot + (q * (i % 2 ? 160 : -160))) * DEG;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
      ctx.globalAlpha *= 1 - E.outCubic(p(q, 0.25, 0.75));
      ctx.drawImage(m.c, -m.c.width / 2, -m.c.height / 2);
      ctx.restore();
    });
    // véu escuro (a bagunça fica atrás do texto) + faixa mais escura atrás da frase
    const a = 1 - p(out, 0, 0.5);
    ctx.fillStyle = css('#050505', 0.46 * a); ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 560, 0, 1360);
    g.addColorStop(0, css('#050505', 0)); g.addColorStop(0.2, css('#050505', 0.86 * a)); g.addColorStop(0.8, css('#050505', 0.86 * a)); g.addColorStop(1, css('#050505', 0));
    ctx.fillStyle = g; ctx.fillRect(0, 560, W, 800);
  }
  // a frase forte da miniatura: inteira desde o quadro 0
  // logo + frase formam um bloco centrado em y ≈ 960 (cabe em qualquer recorte da miniatura)
  const HOOK = [[['Caderno, papel', C.white]], [['e um caixa que', C.white]], [['nunca bate?', C.lime]]];
  const HOOKY = 962, LOGO0 = { y: 700, d: 92, name: 58 }, LOGO1 = { y: 742, d: 150, name: 86 };
  function hook(ctx, t) {
    const out = E.inCubic(p(t, T.virada - 0.25, T.virada + 0.2));
    if (out >= 1) return;
    let size = 132;
    for (const segs of HOOK) { const w = tw(ctx, segs[0][0], DISPLAY, size, 900, -0.025 * size); if (w > 950) size = Math.floor(size * 950 / w); }
    const lead = size * 1.04, y0 = HOOKY;
    HOOK.forEach((segs, i) => {
      const k = i === 2 ? kick(t, 4.75, 0.35) : 0;
      ctx.save(); ctx.translate(540, y0 + i * lead); ctx.scale(1 + 0.04 * k, 1 + 0.04 * k); ctx.translate(-540, -(y0 + i * lead));
      capLine(ctx, segs, 540, y0 + i * lead - out * 60, size, 1, 1 - out);
      ctx.restore();
    });
  }

  // =====================================================================
  // MOTION SOBRE AS CAPTURAS
  // Cada op age num retângulo da captura: cobre o conteúdo com a cor de fundo medida ali e redesenha em
  // movimento os PIXELS REAIS da própria captura (ou, em "count"/"roll", o número contando até o valor real).
  // Quando a op termina, sobra só a captura original: nada de tela, valor ou função inventados.
  // =====================================================================
  const PIX = new Map();
  function pixels(img) {
    if (!PIX.has(img)) { const c = canvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0); PIX.set(img, g.getImageData(0, 0, img.width, img.height)); }
    return PIX.get(img);
  }
  // as colunas com tinta (≈ as letras) dentro do retângulo: a digitação revela a captura letra a letra
  function glyphs(img, r, bg) {
    const d = pixels(img), b = hex(bg), out = [];
    let st = -1;
    for (let x = r[0]; x < r[2]; x++) {
      let ink = false;
      for (let y = r[1]; y < r[3] && !ink; y++) {
        const i = (y * d.width + x) * 4;
        ink = Math.abs(d.data[i] - b[0]) + Math.abs(d.data[i + 1] - b[1]) + Math.abs(d.data[i + 2] - b[2]) > 90;
      }
      if (ink && st < 0) st = x;
      if (!ink && st >= 0) { out.push([st, x]); st = -1; }
    }
    if (st >= 0) out.push([st, r[2]]);
    return out;
  }
  function runOps(g, img, ops, t, s, ox, oy) {
    for (const o of ops || []) {
      if (o.type !== 'tap' && t >= o.t + OP_DUR[o.type](o) + 0.03) continue;    // terminou: fica a captura
      if (o.type !== 'tap' && t < o.t - 2) continue;
      const r = o.r || [0, 0, 0, 0];
      const X = ox + r[0] * s, Y = oy + r[1] * s, Wd = (r[2] - r[0]) * s, Hd = (r[3] - r[1]) * s;
      const hide = () => { g.fillStyle = o.bg; g.fillRect(X - 1.5 * s, Y - 1.5 * s, Wd + 3 * s, Hd + 3 * s); };
      const real = (a = 1, dx = 0, dy = 0, k = 1) => {
        if (a <= 0.002) return;
        g.save(); g.globalAlpha *= clamp(a);
        g.drawImage(img, r[0], r[1], r[2] - r[0], r[3] - r[1], X + Wd / 2 + dx - Wd * k / 2, Y + Hd / 2 + dy - Hd * k / 2, Wd * k, Hd * k);
        g.restore();
      };
      switch (o.type) {
        case 'reveal': {                              // o bloco entra subindo (ou, com dx, chegando da direita)
          const q = E.outCubic(p(t, o.t, o.t + 0.35));
          hide(); real(q, (1 - q) * (o.dx || 0) * s, o.dx ? 0 : (1 - q) * 30 * s, 1 - 0.03 * (1 - q));
          break;
        }
        case 'stamp': {                               // o selo estala: chega grande e assenta
          const q = p(t, o.t, o.t + 0.3);
          if (o.from !== undefined && t < o.from) break; // dentro de um bloco que ainda vai entrar: ele já o esconde
          hide(); if (q > 0) real(q * 3, 0, 0, lerp(1.32, 1, E.outBack(q, 2.4)));
          break;
        }
        case 'wipe': {                                // a linha sai "impressa", da esquerda para a direita
          const q = E.inOutSine(p(t, o.t, o.t + o.dur));
          hide();
          if (q > 0) { g.save(); g.beginPath(); g.rect(X - 2 * s, Y - 2 * s, (Wd + 4 * s) * q, Hd + 4 * s); g.clip(); real(1); g.restore(); }
          break;
        }
        case 'count': {                               // o valor conta até o número da tela e desacelera no fim
          const q = p(t, o.t, o.t + o.dur), f = p(t, o.t + o.dur, o.t + o.dur + 0.15);
          const pre = o.prefix || '', fin = pre + brl(o.to), size = Wd / (fin.length * 0.6);
          hide();
          if (t >= o.t) {
            // conta em reais inteiros (os centavos já são os da tela) e desacelera no fim
            const v0 = (o.from || 0) + (o.to - (o.from || 0)) * E.outExpo(q);
            const v = q >= 1 ? o.to : Math.sign(v0) * Math.floor(Math.abs(v0)) + (o.to - Math.trunc(o.to));
            g.save(); g.globalAlpha *= 1 - f;
            setFont(g, MONO, size, o.weight || 700, 'right', 0); g.fillStyle = o.color;
            g.fillText(pre + brl(Math.abs(v) < 0.005 ? (o.to < 0 ? -0.001 : 0) : v), X + Wd, Y + Hd - 0.13 * size);
            g.restore();
            real(f);
          }
          break;
        }
        case 'roll': {                                // placar: o algarismo sobe rolando até o número da tela
          const q = E.outCubic(p(t, o.t, o.t + o.dur)), f = p(t, o.t + o.dur - 0.1, o.t + o.dur);
          const pos = (o.from || 0) + q * (o.to - (o.from || 0)), k = Math.floor(pos + 1e-6), fr = pos - k, size = Hd * 0.98;
          hide();
          g.save(); g.beginPath(); g.rect(X - 1.5 * s, Y - 1.5 * s, Wd + 3 * s, Hd + 3 * s); g.clip();
          g.globalAlpha *= 1 - f;
          setFont(g, MONO, size, 700, 'center', 0); g.fillStyle = o.color;
          const base = Y + Hd * 0.86;
          g.fillText(String(k % 10), X + Wd / 2, base - fr * Hd);
          g.fillText(String((k + 1) % 10), X + Wd / 2, base + (1 - fr) * Hd);
          g.restore();
          real(f);
          break;
        }
        case 'check': {                               // o círculo e o check se desenham
          const q1 = E.inOutCubic(p(t, o.t, o.t + o.dur * 0.55)), q2 = E.outCubic(p(t, o.t + o.dur * 0.45, o.t + o.dur));
          const f = p(t, o.t + o.dur, o.t + o.dur + 0.15);
          hide();
          const cx = ox + o.c[0] * s, cy = oy + o.c[1] * s;
          g.save(); g.globalAlpha *= 1 - f; g.strokeStyle = o.color; g.lineCap = 'round'; g.lineJoin = 'round';
          if (q1 > 0) { g.lineWidth = o.lw * s; g.beginPath(); g.arc(cx, cy, o.rad * s, -Math.PI / 2, -Math.PI / 2 + TAU * q1); g.stroke(); }
          if (q2 > 0) {
            const P = o.pts.map(([a, b]) => [cx + a * s, cy + b * s]);
            const l1 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), l2 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
            const L = (l1 + l2) * q2;
            g.lineWidth = o.plw * s; g.beginPath(); g.moveTo(P[0][0], P[0][1]);
            if (L <= l1) g.lineTo(lerp(P[0][0], P[1][0], L / l1), lerp(P[0][1], P[1][1], L / l1));
            else { g.lineTo(P[1][0], P[1][1]); g.lineTo(lerp(P[1][0], P[2][0], (L - l1) / l2), lerp(P[1][1], P[2][1], (L - l1) / l2)); }
            g.stroke();
          }
          g.restore();
          real(f);
          break;
        }
        case 'type': {                                // digitação: a captura aparece letra a letra, com cursor piscando
          const G = o.glyphs, n = G.length, dur = n / o.cps;
          const k = Math.min(n, Math.floor(p(t, o.t, o.t + dur) * n + 1e-6));
          hide();
          const right = G[n - 1][1];
          let caretX;
          if (k > 0) {
            const a = G[0][0], b = G[k - 1][1], shift = o.align === 'right' ? right - b : 0;
            g.drawImage(img, a, r[1], b - a, r[3] - r[1], ox + (a + shift) * s, Y, (b - a) * s, Hd);
            caretX = ox + (b + shift + 3) * s;
          } else caretX = ox + ((o.align === 'right' ? right : G[0][0]) + 1) * s;
          if (Math.floor((t - o.t) / 0.26) % 2 === 0 || k < n) {
            g.fillStyle = luma(o.bg) > 128 ? '#171717' : C.lime;
            g.fillRect(caretX, Y - 2 * s, 2.5 * s, Hd + 4 * s);
          }
          break;
        }
        case 'grow': {                                // a barra de ocupação se preenche, sobre as células da linha acima
          const q = E.inOutCubic(p(t, o.t, o.t + (o.dur || 0.45)));
          g.drawImage(img, r[0] - 4, r[1] - 6, r[2] - r[0] + 8, 1, X - 4 * s, Y - 2 * s, Wd + 8 * s, Hd + 4 * s);
          if (q > 0) { g.save(); g.beginPath(); g.rect(X - 2 * s, Y - 2 * s, (Wd + 4 * s) * q, Hd + 4 * s); g.clip(); real(1); g.restore(); }
          break;
        }
        case 'tap': {                                 // o dedo: aperta e solta uma onda
          const q = p(t, o.t - 0.15, o.t + 0.5);
          if (q <= 0 || q >= 1) break;
          const x = ox + o.x * s, y = oy + o.y * s, press = Math.sin(Math.PI * clamp(q / 0.45));
          g.save();
          g.fillStyle = css('#FFFFFF', 0.42 * Math.sin(Math.PI * q)); g.beginPath(); g.arc(x, y, (34 - 6 * press) * s, 0, TAU); g.fill();
          g.strokeStyle = css('#FFFFFF', 0.85 * (1 - q)); g.lineWidth = 3 * s;
          g.beginPath(); g.arc(x, y, (34 + 60 * E.outCubic(p(q, 0.3, 1))) * s, 0, TAU); g.stroke();
          g.restore();
          break;
        }
      }
    }
  }

  // =====================================================================
  // CELULAR
  // =====================================================================
  let PHONE = null, EDGE = null;
  // o giro de troca de módulo: 0 -> 90° (de lado), troca a tela, -90° -> 0
  const giroAng = (q) => (q <= 0 || q >= 1 ? 0 : q < 0.5 ? E.inCubic(q * 2) * 90 * DEG : -(1 - E.outCubic((q - 0.5) * 2)) * 90 * DEG);
  function screenState(t) {
    let i = -1;
    for (let k = 0; k < SCREENS.length; k++) if (t >= SCREENS[k].t) i = k;
    if (i < 0) return { cur: null };
    const s = SCREENS[i], prev = i > 0 ? SCREENS[i - 1] : null;
    if (s.mode === 'giro') {
      const q = p(t, s.t, s.t + GIRO);
      return { cur: q < 0.5 && prev ? prev : s, prev: q < 0.5 ? null : prev, giro: giroAng(q), q };
    }
    if (s.mode === 'toque') return { cur: s, prev, swap: p(t, s.t, s.t + TOQUE) };
    if (s.mode === 'imprime') return { cur: s, prev, print: p(t, s.t, s.t + IMPRIME) };
    return { cur: s, on: p(t, s.t, s.t + 0.45) };
  }
  // quanto a tela fica escurecida e desfocada (enquanto há um recorte fora dela)
  function veilAt(t, st) {
    let v = 0;
    for (const L of LIFTS) v = Math.max(v, env(t, L.t0 - 0.05, L.t1, 0.3, 0.35));
    if (st.cur && st.cur.veil) v = 1;
    if (st.prev && st.prev.veil && st.swap < 1) v = 1;
    return v;
  }
  function drawShot(g, key, x, y, w, h, alpha, blur) {
    const im = IMG[key]; if (!im || alpha <= 0.002) return;
    g.save(); g.globalAlpha *= alpha;
    if (blur > 0.2) g.filter = `blur(${blur.toFixed(2)}px)`;
    g.drawImage(im, x, y, w, h);
    g.restore();
  }
  function composePhone(t, st) {
    const g = PHONE.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, PH.w, PH.h);
    // corpo
    rr(g, 0, 0, PH.w, PH.h, PH.r);
    const bg = g.createLinearGradient(0, 0, PH.w, PH.h); bg.addColorStop(0, '#2A2A2A'); bg.addColorStop(0.5, '#141414'); bg.addColorStop(1, '#232323');
    g.fillStyle = bg; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#4A4A48'; g.stroke();
    rr(g, 6, 6, PH.w - 12, PH.h - 12, PH.r - 6); g.fillStyle = '#050505'; g.fill();
    // tela
    g.save(); rr(g, SCR.x, SCR.y, SCR.w, SCR.h, PH.sr); g.clip();
    g.fillStyle = '#070707'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    const veil = veilAt(t, st);
    const blur = 7 * veil;
    if (st.cur) {
      if (st.swap !== undefined && st.swap < 1 && st.prev) {
        // navegação: a tela nova empurra a anterior para a esquerda
        const q = E.inOutCubic(st.swap);
        if (st.cur.dir === 'v') {                         // rolagem de volta ao topo: a página desce
          drawShot(g, st.prev.key, SCR.x, SCR.y + q * SCR.h, SCR.w, SCR.h, 1, blur);
          drawShot(g, st.cur.key, SCR.x, SCR.y - (1 - q) * SCR.h, SCR.w, SCR.h, 1, blur);
        } else {
          drawShot(g, st.prev.key, SCR.x - q * SCR.w, SCR.y, SCR.w, SCR.h, 1, st.prev.veil ? 7 : blur);
          drawShot(g, st.cur.key, SCR.x + (1 - q) * SCR.w, SCR.y, SCR.w, SCR.h, 1, blur);
          g.fillStyle = css('#000', 0.35 * Math.sin(Math.PI * q)); g.fillRect(SCR.x - q * SCR.w, SCR.y, SCR.w, SCR.h);
        }
      } else if (st.print !== undefined && st.print < 1 && st.prev) {
        // o recibo sai "impresso": sobe do pé da tela aos trancos, como papel saindo da impressora
        const q = st.print, feed = E.inOutSine(q) + Math.sin(q * Math.PI * 9) * 0.012 * (1 - q);
        drawShot(g, st.prev.key, SCR.x, SCR.y, SCR.w, SCR.h, 1, blur);
        g.fillStyle = css('#000', 0.45 * Math.sin(Math.PI * Math.min(1, q * 1.4))); g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
        drawShot(g, st.cur.key, SCR.x, SCR.y + (1 - feed) * SCR.h, SCR.w, SCR.h, 1, blur);
      } else {
        drawShot(g, st.cur.key, SCR.x, SCR.y, SCR.w, SCR.h, st.on !== undefined ? E.outCubic(st.on) : 1, blur);
        if (blur < 0.2) runOps(g, IMG[st.cur.key], PHONE_OPS.filter((o) => o.key === st.cur.key), t, KS, SCR.x, SCR.y);
      }
    }
    if (veil > 0.002) { g.fillStyle = css('#000', 0.6 * veil); g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h); }
    // toques
    for (const tp of TAPS) {
      const q = p(t, tp.t - 0.12, tp.t + 0.45);
      if (q <= 0 || q >= 1 || tp.hidden) continue;
      const x = SCR.x + tp.x * KS, y = SCR.y + tp.y * KS;
      const a = Math.sin(Math.PI * q), press = Math.sin(Math.PI * clamp(q / 0.45));
      g.fillStyle = css('#FFFFFF', 0.45 * a); g.beginPath(); g.arc(x, y, 30 - 6 * press, 0, TAU); g.fill();
      g.strokeStyle = css('#FFFFFF', 0.85 * (1 - q)); g.lineWidth = 3; g.beginPath(); g.arc(x, y, 30 + 54 * E.outCubic(p(q, 0.3, 1)), 0, TAU); g.stroke();
    }
    // reflexo do vidro
    const rf = g.createLinearGradient(0, 0, PH.w, PH.h * 0.6);
    rf.addColorStop(0, 'rgba(255,255,255,0.07)'); rf.addColorStop(0.35, 'rgba(255,255,255,0.0)');
    g.fillStyle = rf; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    g.restore();
    // a ilha da câmera
    rr(g, PH.w / 2 - 62, 30, 124, 34, 17); g.fillStyle = '#000'; g.fill();
  }
  // a pose do celular: posição, escala e giro (eixo vertical)
  function phonePose(t) {
    const enter = springE(p(t, T.celular, T.celular + 1.2));
    let cx = PH.cx, cy = lerp(H + PH.h * 0.62, PH.cy, enter), k = 1;
    let ang = (-11 + 3.2 * Math.sin(t * 0.55)) * DEG;
    const fin = E.inOutCubic(p(t, T.fechamento - 0.2, T.fechamento + 0.8));
    cx = lerp(cx, 820, fin); cy = lerp(cy, 1370, fin); k = lerp(1, 0.56, fin);
    ang = lerp(ang, (-16 + 2 * Math.sin(t * 0.55)) * DEG, fin);
    return { cx, cy, k, ang, alpha: t < T.celular ? 0 : 1 };
  }
  // câmera do celular: na fase "pre" ela se aproxima do campo real; durante cada recorte o celular recua de leve
  // (parallax) enquanto o recorte se aproxima
  let ZOOM_A = 0;
  function cameraPhone(t, pose, ang) {
    let z = 1, ax = 0, ay = 0, bx = 0, by = 0;
    ZOOM_A = 0;
    for (const Z of ZOOMS) {
      const a = Math.min(E.inOutCubic(p(t, Z.t0, Z.t0 + 0.6)), 1 - E.inOutCubic(p(t, Z.t1 - 0.5, Z.t1)));
      if (a <= 0) continue;
      const P = shotToScreen(pose, ang, Z.x, Z.y);
      z = lerp(1, Z.z, a); ax = P.x; ay = P.y; bx = lerp(P.x, 540, a); by = lerp(P.y, Z.ty, a); ZOOM_A = a;
      return { z, ax, ay, bx, by };
    }
    let q = 0;
    for (const L of LIFTS) q = Math.max(q, env(t, L.t0, L.t1, 0.6, 0.4));
    return { z: 1 - 0.02 * q, ax: pose.cx, ay: pose.cy, bx: pose.cx - 14 * q, by: pose.cy + 10 * q };
  }
  function phone(ctx, t) {
    if (t < T.celular - 0.05) return null;
    const st = screenState(t), pose = phonePose(t);
    composePhone(t, st);
    let ang = pose.ang;
    if (st.giro) ang += st.giro;
    const w = PH.w * pose.k, h = PH.h * pose.k;
    const cam = cameraPhone(t, pose, pose.ang);
    ctx.save(); ctx.translate(cam.bx, cam.by); ctx.scale(cam.z, cam.z); ctx.translate(-cam.ax, -cam.ay);
    // sombra no chão e brilho limão discreto atrás
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, pose.cx, pose.cy - 80 * pose.k, 760 * pose.k, C.lime, 0.05); ctx.restore();
    // a espessura (a lateral aparece do lado de onde o celular gira)
    const side = Math.sin(ang) * 22 * pose.k;
    drawRotY(ctx, EDGE, 0, 0, PH.w, PH.h, pose.cx - side, pose.cy, w, h, ang);
    drawRotY(ctx, PHONE, 0, 0, PH.w, PH.h, pose.cx, pose.cy, w, h, ang);
    ctx.restore();
    return { st, pose, ang };
  }
  // um ponto da captura (px, py) -> tela, com a pose atual do celular
  function shotToScreen(pose, ang, px, py) {
    const u = (SCR.x + px * KS - PH.w / 2) * pose.k, v = (SCR.y + py * KS - PH.h / 2) * pose.k;
    return projPt(pose.cx, pose.cy, u, v, ang);
  }

  // ---------------------------------------------------------------- recortes em relevo
  const CARD_CACHE = new Map();
  // pad: margem extra (pixels da captura: cima, direita, baixo, esquerda) preenchida com a cor bg do próprio cartão
  function cardCanvas(L, i, t) {
    const [x0, y0, x1, y1] = L.crop, [pt, pr, pb, pl] = L.pad || [0, 0, 0, 0];
    const cw = x1 - x0 + pl + pr, ch = y1 - y0 + pt + pb;
    const s = Math.min(L.s, 960 / cw, 1180 / ch);
    const w = Math.round(cw * s), h = Math.round(ch * s);
    let c = CARD_CACHE.get(i);
    if (!c) { c = canvas(w + 40, h + 40); CARD_CACHE.set(i, c); }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.save(); rr(g, 20, 20, w, h, 22); g.clip();
    g.fillStyle = L.bg || '#FFFFFF'; g.fillRect(20, 20, w, h);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(IMG[L.key], x0, y0, x1 - x0, y1 - y0, 20 + pl * s, 20 + pt * s, (x1 - x0) * s, (y1 - y0) * s);
    runOps(g, IMG[L.key], L.ops, t, s, 20 + (pl - x0) * s, 20 + (pt - y0) * s);
    g.restore();
    // o destaque limão dentro do recorte
    if (L.hl) {
      const th = L.hlT ?? L.t0 + 0.55, q = E.outCubic(p(t, th, th + 0.4));
      if (q > 0) {
        const [a, b, c2, d] = L.hl, pad = 8;
        const hx = 20 + (a - x0 + pl) * s - pad, hy = 20 + (b - y0 + pt) * s - pad, hw = (c2 - a) * s + 2 * pad, hh = (d - b) * s + 2 * pad;
        g.save(); g.globalCompositeOperation = 'source-over';
        g.shadowColor = css(C.lime, 0.8); g.shadowBlur = 18 * q;
        g.lineWidth = 6; g.strokeStyle = css(C.lime, q);
        rr(g, hx + hw / 2 * (1 - q), hy, hw * q, hh, 14); g.stroke();
        g.restore();
      }
    }
    // contorno limão da placa e o brilho que dá uma volta nele, uma vez, quando ela pousa
    g.lineWidth = 5; g.strokeStyle = C.lime; rr(g, 20 - 1, 20 - 1, w + 2, h + 2, 23); g.stroke();
    const gq = p(t, L.land + 0.05, L.land + 0.75);
    if (gq > 0 && gq < 1) {
      const per = 2 * (w + h), head = E.inOutSine(gq) * per, len = per * 0.16;
      const at = (u) => { u = ((u % per) + per) % per;
        if (u < w) return [19 + u, 19]; u -= w; if (u < h) return [21 + w, 19 + u]; u -= h; if (u < w) return [21 + w - u, 21 + h]; u -= w; return [19, 21 + h - u]; };
      g.save(); g.lineCap = 'round'; g.shadowColor = css('#E8FFB8', 0.9); g.shadowBlur = 16;
      for (let i = 0; i < 18; i++) {
        const a = at(head - len * (i / 18)), b = at(head - len * ((i + 1) / 18));
        g.strokeStyle = css('#F4FFDC', (1 - i / 18) * Math.sin(Math.PI * gq)); g.lineWidth = 7 - 4 * (i / 18);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      g.restore();
    }
    return { c, w, h, s };
  }
  function lifts(ctx, t, ph) {
    if (!ph) return;
    LIFTS.forEach((L, i) => {
      const up = p(t, L.t0, L.t0 + RISE), down = p(t, L.t1, L.t1 + 0.38);
      if (up <= 0 || down >= 1) return;
      const e = down > 0 ? 1 - E.inCubic(down) : springE(up);           // entrada em mola, com leve overshoot
      const card = cardCanvas(L, i, t);
      const [x0, y0, x1, y1] = L.crop;
      // um recorte de outra captura (a conta no computador) não sai do celular: nasce no próprio lugar
      const a = L.own ? { x: 540, y: L.cy, s: 1 } : shotToScreen(ph.pose, ph.ang, (x0 + x1) / 2, (y0 + y1) / 2);
      const fw = L.own ? card.w * 0.7 : (x1 - x0) * KS * ph.pose.k * a.s, fh = L.own ? card.h * 0.7 : (y1 - y0) * KS * ph.pose.k * a.s;
      const cx = lerp(a.x, 540, e), cy = lerp(a.y, L.cy, e);
      const near = 1 + 0.025 * E.inOutSine(p(t, L.land + 0.3, L.t1)) * (down > 0 ? 1 - down : 1);   // aproximação suave
      const w = lerp(fw, card.w, e) * near, h = lerp(fh, card.h, e) * near;
      const ang = lerp(ph.ang, 0, clamp(e)) + Math.sin(t * 1.3 + i) * 1.2 * DEG * clamp(e);
      const lift = clamp(e);
      // sombra e "espessura" da placa
      ctx.save();
      ctx.globalAlpha *= clamp(up * 4) * (down > 0 ? 1 - E.inCubic(p(down, 0.7, 1)) : 1);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.filter = `blur(${(10 + 30 * lift).toFixed(1)}px)`;
      rr(ctx, cx - w / 2 + 10, cy - h / 2 + 24 * lift + 10, w, h, 22); ctx.fill();
      ctx.filter = 'none';
      ctx.fillStyle = C.limeDeep; rr(ctx, cx - w / 2, cy - h / 2 + 9 * lift, w, h, 22); ctx.fill();
      drawRotY(ctx, card.c, 0, 0, card.c.width, card.c.height, cx, cy, w * (card.w + 40) / card.w, h * (card.h + 40) / card.h, ang);
      ctx.restore();
      if (L.fly) {                                     // o item lançado voa até a conta do hóspede
        const T2 = LIFTS[i + L.fly.to - (L.flyBase || 0)];
        const fq = p(t, L.land + L.fly.t, L.land + L.fly.t + L.fly.dur);
        if (T2 && fq > 0 && fq < 1) {
          const e2 = E.inOutCubic(fq), sx = 540, sy = L.cy, tx = 540, ty = T2.cy;
          const fx = lerp(sx, tx, e2) + Math.sin(Math.PI * e2) * 150, fy = lerp(sy, ty, e2);
          const k = lerp(0.5, 0.16, e2);
          ctx.save(); ctx.globalAlpha *= Math.sin(Math.PI * Math.min(1, fq * 1.15)) * 0.95 + 0.05;
          ctx.globalCompositeOperation = 'lighter'; glow(ctx, fx, fy, 160 * (1 - e2 * 0.5), C.lime, 0.25); ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(card.c, fx - card.c.width * k / 2, fy - card.c.height * k / 2, card.c.width * k, card.c.height * k);
          ctx.restore();
        }
      }
    });
  }

  // =====================================================================
  // CENA 2 — A VIRADA (a logo) e o cabeçalho
  // =====================================================================
  function brand(ctx, t) {
    // do quadro 0 (miniatura) até a virada: a mesma logo; na virada ela cresce ("Conheça o FAZLO Hospeda")
    // e, quando o celular chega, sobe e vira o cabeçalho das cenas 3–7; no fim, cresce de novo
    const grow = E.outBack(p(t, T.virada + 0.75, T.virada + 1.35), 1.5), up = E.inOutCubic(p(t, T.celular + 0.45, T.celular + 1.25));
    const fin = E.inOutCubic(p(t, T.fechamento, T.fechamento + 0.7));
    let y = lerp(LOGO0.y, LOGO1.y, grow), d = lerp(LOGO0.d, LOGO1.d, grow), size = lerp(LOGO0.name, LOGO1.name, grow);
    y = lerp(y, HEAD.y, up); d = lerp(d, HEAD.d, up); size = lerp(size, HEAD.name, up);
    y = lerp(y, 196, fin); d = lerp(d, 96, fin); size = lerp(size, 60, fin);
    const halo = clamp(p(t, T.virada + 0.7, T.virada + 1.1)) * (1 - up);
    if (halo > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 540, y, 560, C.lime, 0.12 * halo); ctx.restore(); }
    // a onda limão que sai da logo quando ela cresce (no 1º tempo da música)
    const wq = p(t, T.virada + 0.75, T.virada + 1.75);
    if (wq > 0 && wq < 1) {
      ctx.save(); ctx.strokeStyle = css(C.lime, 0.55 * (1 - wq)); ctx.lineWidth = 3 + 5 * (1 - wq);
      ctx.beginPath(); ctx.arc(540, y, 90 + 560 * E.outCubic(wq), 0, TAU); ctx.stroke(); ctx.restore();
    }
    lockup(ctx, 540, y, d, size, 1);
  }

  // =====================================================================
  // CENA 8 — CELULAR E COMPUTADOR LADO A LADO + DEMONSTRAÇÃO
  // =====================================================================
  const MON = { w: 920, h: 600, bezel: 18, x: 60, y: 470 };
  // as barras de reserva do calendário semanal (Ana Julia, Carlos, Beatriz, Thiago), medidas na captura
  const MON_BARS = [[808, 482, 1244, 544], [808, 562, 1133, 624], [808, 642, 1244, 704], [1029, 722, 1244, 784], [587, 882, 1244, 944]];
  const CAL = { x: 370, y: 404, w: 910, h: 560 };     // da linha dos dias até o Chalé de Pedra 06 (Lucas)
  let MON_OPS = [];
  let MONC = null;
  function monitor(ctx, t) {
    const a = E.outCubic(p(t, T.fechamento + 0.1, T.fechamento + 0.95));
    if (a <= 0) return;
    const g = MONC.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, MONC.width, MONC.height);
    rr(g, 0, 0, MON.w, MON.h, 22); g.fillStyle = '#161616'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#3E3E3C'; g.stroke();
    const sx = MON.bezel, sy = MON.bezel, sw = MON.w - 2 * MON.bezel, sh = MON.h - 2 * MON.bezel;
    g.save(); rr(g, sx, sy, sw, sh, 8); g.clip(); g.fillStyle = '#0B0B0B'; g.fillRect(sx, sy, sw, sh);
    const q = p(t, T.demo, T.demo + GIRO);
    const showDemo = q >= 0.5;
    const im = showDemo ? IMG.demoPC : IMG.calendarioPC;
    // o calendário: o topo da página (1280 x 830) inteiro; a demo: a página inteira (1280 x 800), centrada
    const scale = sw / 1280;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (showDemo) {
      g.drawImage(im, 0, 0, 1280, 800, sx, sy + (sh - 800 * scale) / 2, sw, 800 * scale);
    } else {
      // o calendário: enquadrado na grade da semana (x 370–1280, y 404–964 da captura), onde as reservas se
      // preenchem uma a uma
      const k = sw / CAL.w;
      g.drawImage(im, CAL.x, CAL.y, CAL.w, CAL.h, sx, sy, sw, CAL.h * k);
      runOps(g, im, MON_OPS, t, k, sx - CAL.x * k, sy - CAL.y * k);
    }
    const rf = g.createLinearGradient(0, 0, MON.w, MON.h); rf.addColorStop(0, 'rgba(255,255,255,0.06)'); rf.addColorStop(0.4, 'rgba(255,255,255,0)');
    g.fillStyle = rf; g.fillRect(sx, sy, sw, sh);
    g.restore();
    // o pé
    const cx = MON.x + MON.w / 2, slide = (1 - a) * -700;
    const ang = (9 + 1.5 * Math.sin(t * 0.5)) * DEG + giroAng(q);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = '#1A1A1A'; rr(ctx, cx - 40 + slide, MON.y + MON.h - 10, 80, 70, 6); ctx.fill();
    rr(ctx, cx - 160 + slide, MON.y + MON.h + 52, 320, 22, 11); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx + slide, MON.y + MON.h / 2, 700, C.lime, 0.05); ctx.restore();
    drawRotY(ctx, MONC, 0, 0, MON.w, MON.h, cx + slide, MON.y + MON.h / 2, MON.w, MON.h, ang);
    ctx.restore();
  }
  function demoCall(ctx, t) {
    const a = p(t, T.demo + 0.2, T.demo + 0.7);
    if (a <= 0) return;
    // "Teste agora na / demonstração" à esquerda do celular (x 60–560)
    let size = 74;
    for (const s of ['Teste agora na', 'demonstração']) { const w = tw(ctx, s, DISPLAY, size, 900, -0.025 * size); if (w > 480) size = Math.floor(size * 480 / w); }
    capLine(ctx, [['Teste agora na', C.white]], 310, 1330, size, p(t, T.demo + 0.2, T.demo + 0.7), 1);
    capLine(ctx, [['demonstração', C.lime]], 310, 1330 + size * 1.1, size, p(t, T.demo + 0.4, T.demo + 0.9), 1);
    // o endereço
    const q = E.outBack(p(t, T.url, T.url + 0.5), 1.4), s = 'demo.fazlohospeda.com.br';
    if (q <= 0) return;
    const fs = 44, w = tw(ctx, s, MONO, fs, 800, 0) + 80, h = 92, cy = 1792;
    ctx.save(); ctx.translate(540, cy); ctx.scale(q, q);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, 520, C.lime, 0.12 + 0.05 * Math.sin(t * 3)); ctx.restore();
    rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = C.lime; ctx.fill();
    txt(ctx, s, 0, fs * 0.36, { size: fs, weight: 800, color: C.ink, align: 'center' });
    ctx.restore();
  }

  // =====================================================================
  // QUADRO
  // =====================================================================
  function background(ctx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, 1000, 0, 540, 1000, 1300);
    g.addColorStop(0, '#141513'); g.addColorStop(0.6, '#0C0D0B'); g.addColorStop(1, '#0A0A0A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function renderAt(ctx, t) {
    t = clamp(t, 0, DURATION - 1e-4);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    background(ctx);
    mess(ctx, t);
    hook(ctx, t);
    monitor(ctx, t);
    const ph = phone(ctx, t);
    lifts(ctx, t, ph);
    scrim(ctx);
    brand(ctx, t);
    rail(ctx, t);
    captions(ctx, t);
    demoCall(ctx, t);
  }

  // ---------------------------------------------------------------- cues de som (para a trilha)
  function buildCues() {
    const c = [];
    MESS.forEach((m) => c.push({ t: m.beat, type: m.shake ? 'shake' : 'bump' }));
    c.push({ t: T.virada, type: 'suck' }, { t: T.virada + 0.75, type: 'pop' }, { t: T.celular, type: 'rise' }, { t: T.reservas, type: 'on' });
    SCREENS.forEach((s) => s.t > T.reservas + 0.1 && s.mode !== 'imprime' && c.push({ t: s.t, type: s.mode === 'giro' ? 'flip' : 'swipe' }));
    LIFTS.forEach((L) => { c.push({ t: L.t0, type: 'lift' }); c.push({ t: L.t1, type: 'drop' }); c.push({ t: L.land + 0.05, type: 'glint' }); });
    TAPS.forEach((tp) => !tp.hidden && c.push({ t: tp.t, type: 'tap' }));
    // o motion sobre as capturas: cada letra digitada, a contagem, o check, o selo, a impressão, o toque
    const opCues = (o) => {
      if (o.type === 'type') for (let k = 0; k < o.n; k++) c.push({ t: o.t + k / o.cps, type: 'key' });
      else if (o.type === 'count' || o.type === 'roll') c.push({ t: o.t, type: 'count', dur: o.dur });
      else if (o.type === 'check') c.push({ t: o.t + o.dur * 0.5, type: 'check' });
      else if (o.type === 'stamp') c.push({ t: o.t + 0.08, type: 'stamp' });
      else if (o.type === 'reveal') c.push({ t: o.t, type: 'reveal' });
      else if (o.type === 'wipe') c.push({ t: o.t, type: 'print', dur: o.dur });
      else if (o.type === 'tap') c.push({ t: o.t, type: 'tap' });
    };
    LIFTS.forEach((L) => (L.ops || []).forEach(opCues));
    PHONE_OPS.forEach(opCues);
    MON_OPS.forEach((o) => c.push({ t: o.t, type: 'reveal' }));
    LIFTS.forEach((L) => L.fly && c.push({ t: L.land + L.fly.t, type: 'fly', dur: L.fly.dur }));
    ZOOMS.forEach((Z) => { c.push({ t: Z.t0, type: 'zoom' }); c.push({ t: Z.t1 - 0.5, type: 'unzoom' }); });
    SCREENS.forEach((s) => s.mode === 'imprime' && c.push({ t: s.t, type: 'print', dur: IMPRIME }));
    TRILHO.forEach(([, t0]) => c.push({ t: t0, type: 'chip' }));
    c.push({ t: T.fechamento, type: 'whoosh' }, { t: T.url, type: 'pop' });
    return c.sort((a, b) => a.t - b.t);
  }

  function init(logo, shots, trechos) {
    LOGO = logo; IMG = shots;
    for (const b of PLAN) {
      const opsK = [...(b.lifts || []).flatMap((L) => (L.ops || []).map((o) => [o, L.key || b.screen])), ...(b.pre ? b.pre.ops.map((o) => [o, b.screen]) : [])];
      for (const [o, key] of opsK) if (o.type === 'type') { o.glyphs = glyphs(IMG[key], o.r, o.bg); o.n = o.glyphs.length; }
    }
    build(trechos.trechos);
    PHONE = canvas(PH.w, PH.h);
    EDGE = canvas(PH.w, PH.h);
    const e = EDGE.getContext('2d'); rr(e, 0, 0, PH.w, PH.h, PH.r); e.fillStyle = '#0E0E0E'; e.fill(); e.lineWidth = 3; e.strokeStyle = '#2C2C2A'; e.stroke();
    MONC = canvas(MON.w, MON.h);
    buildMess();
  }

  window.INST = {
    init, renderAt, SHOT_FILES, T,
    get DURATION() { return DURATION; },
    cues: () => ({ duration: DURATION, bpm: BPM, m0: M0, cenas: T, voz: VOZ, trilho: TRILHO, recortes: LIFTS.map((L) => ({ tela: L.key, t0: L.t0, t1: L.t1 })),
      cues: buildCues() }),
  };
})();
