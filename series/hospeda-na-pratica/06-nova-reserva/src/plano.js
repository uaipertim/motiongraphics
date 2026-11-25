/*
 * Plano do episódio 6 (Nova reserva em segundos). Tudo sai de:
 *   ../linha.json (scripts/linha.py: a voz montada, D = início do desafio no vídeo),
 *   ../telas/eventos.json (scripts/capturar.cjs: o instante de cada toque, digitação, rolagem e troca de tela, no relógio),
 *   ../telas/alvos.json (cada elemento medido na Demo, px da PÁGINA a 3x; A(tela, k) devolve px da captura do celular)
 *   ../telas/textos.json (scripts/medir_textos.py: a caixa do texto digitado).
 * No desafio, o vídeo é o relógio: instante no vídeo = D + instante medido. Nada é acelerado nem esticado.
 * Decisões aprovadas: a lista "Buscar existente" não aparece (o passo 2 já entra em "Cadastrar novo"); depois de "Ver no
 * calendário", a cena chega direto à quinzena da reserva (a de hoje, com o bloqueio do Airbnb e o conflito, não é capturada).
 */
window.montaPlano = function (LN, AL, EV, TX) {
  const ids = {}, F = {};
  LN.frases.forEach((f) => { F[f.id] = f; f.palavras.forEach((w) => { if (w.id) ids[w.id] = w; }); });
  const T = (id) => { if (!ids[id]) throw new Error('id ' + id); return ids[id].t0; };
  const Dd = LN.desafio_inicio, TOTAL = EV.total_s;
  const ev = (tipo, nome) => { const e = EV.eventos.find((x) => x.tipo === tipo && x.nome === nome); if (!e) throw new Error('evento ' + tipo + ' ' + nome); return e; };
  const V = (t) => Dd + t;                                         // instante do relógio → instante no vídeo
  const tela = (nome) => V(ev('tela', nome).t), parcial = (nome) => ev('parcial', nome).t;
  // medida da captura do celular (a página rolada até a rolagem da captura): px da imagem vp
  const A = (tela_, k) => { const a = AL[tela_]; const r = a && a[k]; if (!r) throw new Error('alvo ' + tela_ + '.' + k); return [r[0], r[1] - a.rolagem, r[2], r[3] - a.rolagem]; };
  const P = (tela_, k) => { const r = AL[tela_] && AL[tela_][k]; if (!r) throw new Error('alvo ' + tela_ + '.' + k); return r; };   // px da página
  const cy = (r) => (r[1] + r[3]) / 2;
  const folga = (r, m) => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
  const PAGINAS = { continuar1: 1, ver_no_calendario: 1 };          // esses dois toques acontecem nas páginas que rolam
  const toqueDe = (nome, extra = {}) => { const e = ev('toque', nome), pg = PAGINAS[nome]; return { t: V(e.t), x: e.x, y: pg ? e.y : e.y - e.rolagem, pagina: !!pg, ...extra }; };

  const balao = { t1: F.desafio.t0 - 0.1, datas: T('datas') };
  const titulo = { t0: T('desafio') - 0.1, t1: T('valendo') - 0.1 };
  const fecho = { t0: F.cta.t0 - 0.35, nova: T('nova'), segundos: T('segundos'), logo: F.cta2.t0 - 0.1, comeco: T('comeco'), configura: T('configura'), arroba: F.cta2.t1 + 0.6 };
  const PARC = [['periodo', 'Período'], ['acomodacao', 'Acomodação'], ['hospede', 'Hóspede'], ['valores', 'Valores'], ['sinal', 'Sinal'], ['criada', 'Criada'], ['calendario', 'Calendário']];
  const PARA = V(TOTAL);
  const crono = { entra: T('valendo') - 0.15, D: Dd, total: TOTAL, parciais: PARC.map(([n, r]) => ({ nome: n, rotulo: r, t: parcial(n) })),
    grande: [PARA + 0.15, PARA + 2.9], some: fecho.t0 };

  const s = { img: 'inicio', t0: 0, t1: fecho.logo + 0.05, escuro0: 0.55, escuro: [{ t: T('desafio') - 0.2, a: 0, d: 0.5 }],
    paginas: [], rolagem: [], cam: [], aneis: [], toques: [], saltos: [], digita: [] };
  const pag = (t, img, o = {}) => s.paginas.push({ t, img, d: 0.15, ...o });

  // ---- O DESAFIO (tempos medidos)
  s.toques.push(toqueDe('mais', { onda: 0.8 }));
  pag(tela('passo1'), 'passo1', { d: 0.2 });
  s.toques.push(toqueDe('entrada'));
  pag(tela('cal-nov'), 'cal-nov', { d: 0.2 });
  s.toques.push(toqueDe('proximo_mes'));
  pag(tela('cal-dez'), 'cal-dez', { d: 0.12 });
  s.toques.push(toqueDe('dia12'));
  pag(tela('cal-12'), 'cal-12', { d: 0.1 });
  s.toques.push(toqueDe('dia14'));
  pag(tela('cal-12-14'), 'cal-12-14', { d: 0.1 });
  s.aneis.push({ t: tela('cal-12-14') + 0.05, ate: V(ev('toque', 'confirmar').t) - 0.15, ret: A('cal-12-14', 'periodo') });
  s.toques.push(toqueDe('confirmar'));
  pag(tela('livres'), 'livres', { d: 0.2 });
  // a lista: "Livres no período · 10 de 10" e a Bica D’Água 02, com o total
  s.saltos.push({ t: tela('livres') + 0.15, ate: V(ev('toque', 'acomodacao').t) - 0.3, ret: [100, 1800, 1070, 2330], img: 'livres', larg: 800, cy: 790,                  // até o topo da barra de baixo
    marcas: [{ t: tela('livres') + 0.5, ret: [...A('livres', 'bica02').slice(0, 3), 2322], fundo: true }] });
  s.toques.push(toqueDe('acomodacao'));
  pag(tela('escolhida'), 'escolhida', { d: 0.12 });
  // rolando até o Continuar (no fim da lista): a página inteira corre por baixo do cabeçalho e da barra
  const ro = ev('rola', 'ate_continuar'), rc = ev('toque', 'continuar1').rolagem;
  pag(V(ro.t), 'pg-escolhida', { d: 0.01, fixos: 'escolhida' });
  s.rolagem.push({ t: V(ro.t), y: 0, d: 0.01 }, { t: V(ro.t) + 0.2, y: rc, d: Math.max(0.3, ro.fim - ro.t - 0.2) });
  s.toques.push(toqueDe('continuar1'));
  // passo 2: já na aba "Cadastrar novo" (a lista "Buscar existente" não aparece)
  pag(V(ev('toque', 'continuar1').t) + 0.04, 'passo2-novo', { d: 0.15 });
  const dn = ev('digita', 'nome'), df = ev('digita', 'fone'), ds = ev('digita', 'sinal'), X = (k) => TX[k];
  s.toques.push(toqueDe('nome'));
  s.digita.push({ t: V(dn.t), fim: V(dn.fim), ate: tela('passo2-preenchido') + 0.05, img: 'passo2-preenchido', ret: X('passo2-preenchido.nome').campo, tx: X('passo2-preenchido.nome').texto, n: 14 });
  s.toques.push(toqueDe('fone'));
  s.digita.push({ t: V(df.t), fim: V(df.fim), ate: tela('passo2-preenchido') + 0.05, img: 'passo2-preenchido', ret: X('passo2-preenchido.fone').campo, tx: X('passo2-preenchido.fone').texto, n: 15 });
  s.cam.push({ t: V(dn.t) - 0.5, z: 1.45, fy: (cy(A('passo2-novo', 'nome')) + cy(A('passo2-novo', 'fone'))) / 2, d: 0.4 });
  pag(tela('passo2-preenchido'), 'passo2-preenchido', { d: 0.05 });
  s.toques.push(toqueDe('continuar2'));
  s.cam.push({ t: V(ev('toque', 'continuar2').t) - 0.35, z: 1, fy: 2532 / 2, d: 0.35 });
  pag(tela('passo3'), 'passo3', { d: 0.15 });
  s.aneis.push({ t: tela('passo3') + 0.2, ate: tela('passo3') + 0.95, ret: A('passo3', 'total') });
  s.aneis.push({ t: tela('passo3') + 1.0, ate: V(ev('toque', 'continuar3').t) - 0.15, ret: A('passo3', 'canal') });
  s.toques.push(toqueDe('continuar3'));
  pag(tela('passo4'), 'passo4', { d: 0.15 });
  s.toques.push(toqueDe('sinal'));
  s.cam.push({ t: V(ds.t) - 0.6, z: 1.4, fy: (cy(A('passo4', 'sinal')) + cy(A('passo4', 'pix'))) / 2, d: 0.35 });
  const vs = X('passo4-sinal.sinal');
  s.digita.push({ t: V(ds.t), fim: V(ds.fim), ate: tela('passo4-sinal') + 0.05, img: 'passo4-sinal', ret: vs.campo, tx: vs.texto, n: 9, vazio: [vs.campo[0] + 8, vs.campo[0] + 420] });
  s.toques.push(toqueDe('pix'));
  pag(tela('passo4-sinal'), 'passo4-sinal', { d: 0.12 });
  s.aneis.push({ t: tela('passo4-sinal') + 0.05, ate: V(ev('toque', 'continuar4').t) - 0.15, ret: A('passo4-sinal', 'caixa') });
  s.cam.push({ t: tela('passo4-sinal') - 0.1, z: 1, fy: 2532 / 2, d: 0.35 });
  s.toques.push(toqueDe('continuar4'));
  pag(tela('passo5'), 'passo5', { d: 0.15 });
  s.saltos.push({ t: tela('passo5') + 0.2, ate: V(ev('toque', 'criar').t) - 0.3, ret: folga(A('passo5', 'resumo'), 6), img: 'passo5', larg: 820, cy: 820 });
  s.toques.push(toqueDe('criar'));
  pag(tela('criada'), 'criada', { d: 0.2 });
  // rolando até "Ver no calendário"
  const rv = ev('rola', 'ate_ver_no_calendario'), rvc = ev('toque', 'ver_no_calendario').rolagem;
  pag(V(rv.t) + 0.21, 'pg-criada', { d: 0.01, fixos: 'criada' });
  s.rolagem.push({ t: V(rv.t) + 0.2, y: 0, d: 0.01 }, { t: V(rv.t) + 0.3, y: rvc, d: Math.max(0.3, rv.fim - rv.t - 0.3) });
  s.toques.push(toqueDe('ver_no_calendario'));
  // corte direto para a quinzena da reserva: a tela entra de lado e fica inteira no instante em que o relógio para
  pag(PARA - 0.35, 'cal-reserva', { d: 0.35, lado: true });

  // ---- DEPOIS DO RELÓGIO
  s.aneis.push({ t: PARA + 0.05, ate: crono.grande[1] + 0.9, ret: A('cal-reserva', 'larissa') });
  s.cam.push({ t: crono.grande[1] + 0.1, z: 1.3, fy: cy(A('cal-reserva', 'larissa')), d: 0.5 });
  // volta calma: o sinal (via PIX) e o voucher, na tela da reserva criada
  const tR = F.p11.t0 - 0.55;
  s.cam.push({ t: tR - 0.1, z: 1, fy: 2532 / 2, d: 0.4 });
  s.rolagem.push({ t: tR - 0.05, y: 0, d: 0.01 });
  pag(tR, 'criada', { d: 0.35, lado: true });
  const CARTAO = [140, 1290, 1030, 1885];
  s.saltos.push({ t: T('sinal2') - 0.1, ate: T('voucher') - 0.15, ret: CARTAO, img: 'criada', larg: 860, cy: 820, marcas: [{ t: T('sinal2'), ret: A('criada', 'financeiro'), fundo: true }] });
  s.aneis.push({ t: T('voucher'), ate: F.p11.t1 + 0.9, ret: A('criada', 'voucher') });
  // o mesmo pedido de novo: toque no "+" e a lista sem a Bica D’Água 02
  const tO = F.p12.t0 - 0.35;
  s.toques.push({ t: tO - 0.45, ...((r) => ({ x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2 }))(A('cal-reserva', 'mais')), onda: 0.8 });
  pag(tO, 'ocupada', { d: 0.35, lado: true });
  const L1 = A('ocupada', 'livres'), B1 = A('ocupada', 'bica01'), B3 = A('ocupada', 'bica03');
  s.saltos.push({ t: T('mesma') - 0.1, ate: fecho.t0 - 0.3, ret: [100, L1[1] - 15, 1070, B3[3] + 8], img: 'ocupada', larg: 800, cy: 820, cor: 'ambar',
    marcas: [{ t: T('nem'), ret: L1, cor: 'ambar', fundo: true }, { t: T('nem') + 0.3, ret: [B1[0], B1[3] - 14, B1[2], B3[1] + 14], cor: 'ambar', fundo: true }] });
  // fecho: a câmera se afasta
  s.cam.push({ t: fecho.t0 - 0.1, z: 0.8, fy: 2532 / 2, d: 0.6 });

  ['paginas', 'rolagem', 'cam', 'aneis', 'toques', 'saltos', 'digita'].forEach((k) => s[k].sort((a, b) => a.t - b.t));
  s.saltos.forEach((j) => { j.ate = Math.min(j.ate, s.t1 - 0.5); });

  // ---- legenda: páginas curtas, sem a frase do pedido (está no balão) e sem o fecho (está escrito)
  const legenda = [];
  const tam = (ws) => ws.map((x) => x.w).join(' ').length;
  const parte = (ws) => {
    if (tam(ws) <= 40) return [ws];
    let melhor = -1, nota = -1e9;
    for (let k = 1; k < ws.length; k++) {
      const a = tam(ws.slice(0, k)), b = tam(ws.slice(k));
      if (a < 10 || b < 10) continue;
      const solta = /^(o|a|os|as|e|de|do|da|dos|das|no|na|nos|nas|em|um|uma|pra|para|com|que|se|não|tem|é|ao|só|já|seu|sua|por|quem|nem|cada|ele|mais)$/i.test(ws[k - 1].w);
      const n = (/[,:;?.!…]$/.test(ws[k - 1].w) ? 20 : 0) - Math.abs(a - b) / 2 - (a > 44 || b > 44 ? 30 : 0) - (solta ? 25 : 0);
      if (n > nota) { nota = n; melhor = k; }
    }
    return melhor < 0 ? [ws] : [...parte(ws.slice(0, melhor)), ...parte(ws.slice(melhor))];
  };
  const comLegenda = LN.frases.filter((f) => !['g1', 'cta', 'cta2'].includes(f.id));
  comLegenda.forEach((f, i, arr) => {
    const pgs = parte(f.palavras), nx = arr[i + 1], fim = f.palavras[f.palavras.length - 1].t1, prox = nx ? nx.palavras[0].t0 : 1e9;
    pgs.forEach((pg, k) => legenda.push({ t0: pg[0].t0 - 0.06, t1: k < pgs.length - 1 ? pgs[k + 1][0].t0 - 0.06 : Math.min(prox - 0.06, fim + 1.0, F.cta.t0 - 0.4),
      palavras: pg.map((w) => ({ w: w.w, t: w.t0, chave: w.chave })) }));
  });

  return { duracao: LN.duracao, balao, titulo, crono, fecho, telas: [s], legenda };
};
