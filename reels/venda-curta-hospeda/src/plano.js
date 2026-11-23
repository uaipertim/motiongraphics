/*
 * Plano do vídeo curto: tudo sai de ../linha.json (scripts/linha.py). T('id') = início da palavra marcada no roteiro.
 * Cada tela: { img, t0, t1, cam: [{t, z, fx, fy}], aneis: [{t, ret, ate, cor}], saltos: [{t, ate, ret, larg, cy, cor}],
 *              toques: [{t, x, y}], estados: [{t, img}] } — coordenadas em px da captura (1170×2532).
 * Retângulos medidos na Demo (scripts/medir.cjs → telas/alvos.json) e conferidos sobre as capturas.
 */
window.montaPlano = function (LN, opt) {   // opt: { capa, inicio (telas/inicio-conflito.json) }
  const ids = {}, F = {};
  LN.frases.forEach((f) => { F[f.id] = f; f.palavras.forEach((w) => { if (w.id) ids[w.id] = w; }); });
  const T = (id) => { if (!ids[id]) throw new Error('id ' + id); return ids[id].t0; };
  const TF = (id) => ids[id].t1;
  const W = (fid, w) => { const x = F[fid].palavras.find((p) => p.w.replace(/[.,:;?!…]/g, '') === w); if (!x) throw new Error(fid + ' ' + w); return x.t0; };
  const R = {
    calBica: [48, 1200, 1122, 1341], calAirbnb: [723, 1223, 1017, 1319],
    linkAtivo: [72, 480, 1098, 650], recebendo: [72, 1290, 1098, 1450], sincronizar: [99, 1467, 1071, 1611],
    conflito: [48, 728, 1122, 1454], nada: [90, 1160, 990, 1232],
    dia20: [815, 1857, 969, 1965], dia22: [48, 1977, 201, 2085], confirmar: [48, 2340, 1122, 2484], periodo: [48, 2241, 1122, 2304],
    livres: [99, 768, 1071, 855],
    chegadaBtn: [99, 1880, 1071, 2012], helena: [48, 1600, 1122, 2051],
    saldoCheckin: [60, 969, 1110, 1131],
    nome: [48, 640, 1122, 780], saldoFicha: [111, 1989, 1059, 2331],
    cerveja: [90, 1120, 1080, 1262], totalConsumos: [51, 1419, 1119, 1566],
    saldo: [111, 855, 1059, 1197], checkoutBtn: [111, 1413, 1059, 1557], libera: [111, 1580, 1059, 1725],
    fecharBtn: [48, 894, 1122, 1038], esperado: [60, 1104, 1110, 1296], diferenca: [60, 1596, 1110, 1788],
    pix: [96, 612, 1074, 700], dinheiro: [96, 723, 1074, 811], cartoes: [96, 834, 1074, 1033], recebidoTotal: [96, 405, 1074, 560],
    ocupacao: [111, 1092, 1059, 1356], total: [96, 1510, 1074, 1720],
  };
  const c = (x0, y0, x1, y1) => ({ fx: (x0 + x1) / 2, fy: (y0 + y1) / 2 });
  const zoom = (t, ret, z = 1.75, d = 0.55) => ({ t, z, ...c(...ret), d });
  const longe = (t, d = 0.5) => ({ t, z: 1, fx: 585, fy: 1266, d });

  // ---- cenas sem tela
  const ganchos = [{ t0: 0, t1: F.g2.t0 - 0.1 }];
  const caos = { t0: F.g2.t0 - 0.1, t1: F.g3.t0 - 0.05, whats: T('whats'), airbnb: T('airbnb0'), booking: T('booking0'), caderno: T('caderno') };
  const gaveta = { t0: F.g3.t0 - 0.05, t1: F.marca.t0 - 0.1, ninguem: T('ninguem'), entrou: T('entrou') };
  const marca = { t0: F.marca.t0 - 0.1, t1: F.canais1.t0 - 0.05, fazlo: T('fazlo'), lugar: T('lugar') };
  const fecho = { t0: F.cta.t0 - 0.25, t1: LN.duracao + 1, teste: T('teste'), configura: T('configura'), arroba: F.cta.t1 + 0.6, chamada: F.cta.t1 + 0.05 };   // chamada só na tela, sem voz

  // ---- telas (cada uma de 2 a 4 s; a seguinte entra 0,25 s antes da anterior sair)
  const telas = [];
  const add = (s) => { telas.push(s); return s; };
  // integração (revisão de 23/11/2026): Canais sem nenhum link à mostra + selo; o calendário com o bloqueio do Airbnb + nota;
  // o alerta de conflito no Início (e o sino) e "Nada foi cancelado." em destaque. O Início vem de telas/inicio-conflito.json.
  const IC = (opt && opt.inicio) || {}, folga = (r, m) => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
  const CONF = IC.conflito || R.conflito, NADA = IC.nada || [103, 1170, 547, 1206], SINO = IC.sino || [683, 69, 732, 122];
  const TEXTO_CANAIS = [48, 522, 1122, 762];
  add({ img: 'canais', t0: marca.t1, t1: F.canais2.t0 - 0.1,
    cam: [zoom(F.canais1.t0 + 0.1, folga(TEXTO_CANAIS, 40), 1.55)],
    aneis: [{ t: T('airbnb'), ret: TEXTO_CANAIS }],
    selos: [{ t: T('link') - 0.05, texto: 'Link de calendário', y: 300, pulsos: [T('conectam')] }] });
  add({ img: 'calendario', t0: F.canais2.t0 - 0.1, t1: F.canais3.t0 - 0.1, de: 'baixo',
    cam: [zoom(F.canais2.t0 + 0.15, R.calBica, 1.7), zoom(T('traz') - 0.1, R.calAirbnb, 2.0)],
    aneis: [{ t: T('ocupadas'), ret: R.calAirbnb }],
    saltos: [{ t: T('ocupadas') + 0.45, ate: F.canais3.t0 - 0.5, ret: folga(R.calAirbnb, 8), larg: 620, cy: 640 }],
    notas: [{ t: T('manda') + 0.15, texto: 'O Hospeda confere os canais\na cada 30 min', y: 320 }] });
  add({ img: 'inicio-conflito', t0: F.canais3.t0 - 0.1, t1: F.canais4.t0 - 0.05, recapturar: !!IC.a_recapturar,
    cam: [zoom(F.canais3.t0 + 0.15, CONF, 1.45), { t: T('sino') - 0.4, z: 1, fx: 585, fy: 1266, d: 0.4 }, zoom(T('naocancela') - 0.25, folga(NADA, 120), 1.7)],
    aneis: [{ t: T('bater'), ret: CONF, cor: 'ambar', ate: T('avisa') - 0.05 }, { t: T('sino'), ret: folga(SINO, 22), ate: T('naocancela') - 0.35 },
      { t: T('naocancela') + 0.05, ret: folga(NADA, 14), cor: 'ambar' }],
    saltos: [{ t: T('avisa'), ate: T('inicio') + 0.55, ret: CONF, cor: 'ambar', larg: 960, cy: 700 },
      { t: T('naocancela') + 0.4, ate: F.canais4.t0 - 0.5, ret: folga(NADA, 22), cor: 'ambar', larg: 820, cy: 560 }] });
  add({ img: 'calendario', t0: F.canais4.t0 - 0.05, t1: F.dupla.t0 - 0.1,
    cam: [{ t: F.canais4.t0, z: 1.25, fx: 585, fy: 1500, d: 0.01 }, longe(F.canais4.t0 + 0.4, 0.9)],
    aneis: [{ t: T('reduz') + 0.2, ret: R.calBica }] });
  add({ img: 'nova-datas', t0: F.dupla.t0 - 0.1, t1: T('naovendido') - 0.45, estados: [], de: 'baixo',
    cam: [zoom(F.dupla.t0 + 0.15, [48, 1700, 1122, 2484], 1.5)],
    toques: [{ t: F.dupla.t0 + 0.55, ...pt(R.dia20) }, { t: F.dupla.t0 + 1.05, ...pt(R.dia22) }, { t: T('mesmochale') - 0.1, ...pt(R.confirmar) }],
    aneis: [{ t: F.dupla.t0 + 1.35, ret: R.periodo }] });
  add({ img: 'nova-livres', t0: T('naovendido') - 0.45, t1: F.hosp.t0 - 0.1,
    cam: [zoom(T('naovendido') - 0.2, [48, 700, 1122, 1500], 1.55)],
    aneis: [{ t: T('naovendido'), ret: R.livres }],
    saltos: [{ t: T('naovendido') + 0.9, ate: F.hosp.t0 - 0.4, ret: R.livres, larg: 980, cy: 640 }] });
  add({ img: 'inicio-chegadas', t0: F.hosp.t0 - 0.1, t1: T('conta') - 0.25, estados: [{ t: T('checkin') + 0.15, img: 'checkin', d: 0.3 }],
    cam: [zoom(F.hosp.t0 + 0.05, R.helena, 1.5), { t: T('checkin') + 0.15, z: 1.5, ...c(...R.saldoCheckin), d: 0.3 }],
    toques: [{ t: T('checkin') - 0.05, ...pt(R.chegadaBtn) }],
    saltos: [{ t: T('checkin') + 0.6, ate: T('conta') - 0.6, ret: R.saldoCheckin, img: 'checkin', larg: 980, cy: 620 }] });
  add({ img: 'ficha', t0: T('conta') - 0.25, t1: F.comanda.t0 - 0.1,
    cam: [{ t: T('conta') - 0.25, z: 1.5, ...c(...R.nome), d: 0.01 }, zoom(T('saldo') - 0.35, R.saldoFicha, 1.55)],
    aneis: [{ t: T('conta') + 0.05, ret: R.nome, ate: T('saldo') - 0.4 }],
    saltos: [{ t: T('saldo'), ate: F.comanda.t0 - 0.35, ret: R.saldoFicha, cor: 'ambar', larg: 920, cy: 640 }] });
  add({ img: 'ficha-comanda', t0: F.comanda.t0 - 0.1, t1: F.checkout.t0 - 0.1, de: 'baixo',
    cam: [zoom(F.comanda.t0 + 0.1, [48, 540, 1122, 1569], 1.3)],
    aneis: [{ t: T('consome'), ret: R.cerveja, ate: T('comanda') - 0.05 }],
    saltos: [{ t: T('comanda'), ate: F.checkout.t0 - 0.35, ret: R.totalConsumos, larg: 960, cy: 640 }] });
  add({ img: 'ficha-saldo', t0: F.checkout.t0 - 0.1, t1: F.caixa.t0 - 0.1, de: 'baixo',
    cam: [zoom(F.checkout.t0 + 0.1, [111, 855, 1059, 1725], 1.35)],
    aneis: [{ t: T('checkout'), ret: R.checkoutBtn, ate: T('libera') - 0.05 }, { t: T('nada'), ret: R.saldo }],
    saltos: [{ t: T('libera'), ate: T('nada') - 0.1, ret: R.libera, larg: 980, cy: 640 }] });
  add({ img: 'caixa', t0: F.caixa.t0 - 0.1, t1: T('pix') - 0.45, estados: [{ t: T('caixa') + 0.05, img: 'caixa-fechar-confere', d: 0.3 }],
    cam: [zoom(F.caixa.t0 + 0.05, [48, 700, 1122, 1400], 1.35), { t: T('caixa') + 0.1, z: 1.6, ...c(...R.diferenca), d: 0.45 }],
    toques: [{ t: T('caixa') - 0.1, ...pt(R.fecharBtn) }],
    aneis: [{ t: T('conferido'), ret: R.diferenca }],
    saltos: [{ t: T('conferido') + 0.5, ate: T('pix') - 0.6, ret: R.esperado, img: 'caixa-fechar-confere', larg: 980, cy: 560 }] });
  add({ img: 'caixa-formas', t0: T('pix') - 0.45, t1: F.relat.t0 - 0.1,
    cam: [zoom(T('pix') - 0.3, [48, 357, 1122, 1100], 1.5)],
    aneis: [{ t: T('pix'), ret: R.pix, ate: T('dinheiro') - 0.05 }, { t: T('dinheiro'), ret: R.dinheiro, ate: T('cartao') - 0.05 }, { t: T('cartao'), ret: R.cartoes }] });
  add({ img: 'relatorios-ocupacao', t0: F.relat.t0 - 0.1, t1: T('recebimentos') - 0.4,
    cam: [zoom(F.relat.t0 + 0.2, [48, 357, 1122, 1400], 1.4)],
    aneis: [{ t: T('ocupacao'), ret: R.ocupacao }] });
  add({ img: 'relatorios-topo', t0: T('recebimentos') - 0.4, t1: fecho.t0, de: 'baixo',
    cam: [zoom(T('recebimentos') - 0.3, [48, 1200, 1122, 1800], 1.4)],
    saltos: [{ t: T('recebimentos'), ate: fecho.t0 - 0.2, ret: R.total, larg: 960, cy: 620 }] });
  // toda janela fecha antes de a tela começar a sair (nada cortado na borda)
  telas.forEach((s) => (s.saltos || []).forEach((j) => { j.ate = Math.min(j.ate, s.t1 - 0.5); }));
  function pt(r) { return { x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2 }; }

  // ---- legenda: páginas curtas (quebra na pontuação; nunca mais que 2 linhas), sem a chamada final (ela está na tela)
  const legenda = [];
  const tam = (ws) => ws.map((x) => x.w).join(' ').length;
  const parte = (ws) => {                                       // páginas de até ~40 letras, quebradas em pontuação e equilibradas
    if (tam(ws) <= 40) return [ws];
    let melhor = -1, nota = -1e9;
    for (let k = 1; k < ws.length; k++) {
      const a = tam(ws.slice(0, k)), b = tam(ws.slice(k));
      if (a < 12 || b < 12) continue;
      const solta = /^(o|a|os|as|e|de|do|da|dos|das|no|na|nos|nas|em|um|uma|pra|para|com|que|se|não|tem|é|ao|só|já|mesmo|muito|duas)$/i.test(ws[k - 1].w);
      const n = (/[,:?.…]$/.test(ws[k - 1].w) ? 20 : 0) - Math.abs(a - b) / 2 - (a > 44 || b > 44 ? 30 : 0) - (solta ? 25 : 0);
      if (n > nota) { nota = n; melhor = k; }
    }
    return melhor < 0 ? [ws] : [...parte(ws.slice(0, melhor)), ...parte(ws.slice(melhor))];
  };
  LN.frases.filter((f) => f.id !== 'cta' && f.id !== 'g1').forEach((f, i, arr) => {   // g1 e a chamada estão na tela
    const pgs = parte(f.palavras), nx = arr[i + 1];
    pgs.forEach((pg, k) => legenda.push({ t0: pg[0].t0 - 0.06, t1: k < pgs.length - 1 ? pgs[k + 1][0].t0 - 0.06 : (nx ? nx.t0 - 0.06 : f.t1 + 0.4),
      palavras: pg.map((w) => ({ w: w.w, t: w.t0, chave: w.chave })) }));
  });

  // ---- capa embutida no quadro 0 (miniatura do WhatsApp); some animada até 0,6 s, por cima da abertura original
  const CAPAS = {
    A: { titulo: [[['Sua pousada', 'branco']], [['num lugar só', 'lime']]],
      layout: { logoY: 430, tituloY: 660, entre: 128, corpo: 126, celTopo: 840, celAlt: 620,
        selos: [['WhatsApp', '#25D366', 222, 960, -1], ['Airbnb', '#FF5A5F', 862, 1110, 1], ['Booking', '#1E5BD9', 222, 1290, -1]] } },
    B: { titulo: [[['Reservas, comandas', 'branco']], [['e caixa', 'branco']], [['num lugar só', 'lime']]],
      layout: { logoY: 410, tituloY: 585, entre: 98, corpo: 88, celTopo: 880, celAlt: 600,
        selos: [['WhatsApp', '#25D366', 222, 1000, -1], ['Airbnb', '#FF5A5F', 862, 1140, 1], ['Booking', '#1E5BD9', 222, 1300, -1]] } },
  };
  const capa = { img: 'inicio', ...CAPAS[(opt && opt.capa) || 'A'] };   // escolhida em 22/11/2026: A

  return { duracao: LN.duracao, ganchos, caos, gaveta, marca, fecho, telas, legenda, capa, tom: (t) => (t < marca.t0 ? '#FFB23F' : '#AFFA27') };
};
