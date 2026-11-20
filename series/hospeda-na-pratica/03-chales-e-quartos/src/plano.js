/*
 * Plano do episódio 3 (Chalés e quartos): tudo sai de ../linha.json (scripts/linha.py), ../telas/alvos.json (cada elemento
 * medido na própria Demo) e ../telas/textos.json (a caixa do texto digitado, medida nas capturas preenchidas).
 * T('id') = início da palavra marcada no roteiro; W(frase, palavra) = início de uma palavra qualquer.
 * Telas: { img, t0, t1, cam, aneis, saltos, toques, estados: [{t, img, d, sobe}], digita: [{t, d, img, ret, tx, n}] }.
 * Duplas (antes e depois): { t0, t1, lados: [{ img, rot, aneis }] }.
 * Regra deste episódio: o selo "Bloqueada" não aparece em nenhum quadro (defeito no app); do bloqueio, só o aviso.
 */
window.montaPlano = function (LN, AL, TX) {
  const ids = {}, F = {};
  LN.frases.forEach((f) => { F[f.id] = f; f.palavras.forEach((w) => { if (w.id) ids[w.id] = w; }); });
  const T = (id) => { if (!ids[id]) throw new Error('id ' + id); return ids[id].t0; };
  const A = (tela, k) => { const r = AL[tela] && AL[tela][k]; if (!r) throw new Error('alvo ' + tela + '.' + k); return r; };
  const X = (tela, k) => { const r = TX[tela + '.' + k]; if (!r) throw new Error('texto ' + tela + '.' + k); return r; };
  const c = (x0, y0, x1, y1) => ({ fx: (x0 + x1) / 2, fy: (y0 + y1) / 2 });
  const zoom = (t, ret, z = 1.5, d = 0.5) => ({ t, z, ...c(...ret), d });
  const perto = (t, ret, d = 0.4) => zoom(t, ret, 2.0, d);            // close de 2× no ponto do toque
  const pt = (r) => ({ x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2 });
  const junta = (...rs) => [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))];
  const folga = (r, m) => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];

  // ---- cenas sem tela
  const dor = { t0: 0, t1: F.marca.t0 - 0.1, g2: F.g2.t0, cobrar: T('cobrar'), pessoas: T('pessoas') };
  const marca = { t0: F.marca.t0 - 0.1, t1: F.caminho.t0 - 0.05, fazlo: T('fazlo'), cad: T('cadastrado'), marcos: [T('tipo0'), T('cap0'), T('valores0')] };
  const fecho = { t0: F.cta.t0 - 0.25, tudo: T('tudo'), facil: T('facil'), comeco: T('comeco'), configura: T('configura'), arroba: F.cta2.t1 + 0.6 };

  const telas = [], duplas = [];
  const add = (s) => { telas.push(s); return s; };
  const MAIS = { x: 1053, y: 2430 };

  // 1) Início → Mais → Acomodações
  const tAc = T('acomodacoes'), tMais = T('mais');
  const ROW = A('menu-mais', 'acomodacoes');
  add({ img: 'inicio', t0: marca.t1, t1: tAc + 0.55,
    cam: [perto(tMais - 0.6, [800, 2300, 1170, 2532]), perto(tMais + 0.3, ROW, 0.5)],
    estados: [{ t: tMais + 0.06, img: 'menu-mais', d: 0.22 }],
    toques: [{ t: tMais - 0.05, ...MAIS, onda: 0.7 }, { t: tAc + 0.1, ...pt(ROW) }],
    aneis: [{ t: tAc - 0.4, ret: ROW, ate: tAc + 0.45 }] });

  // 2) A lista: tipo, capacidade e os três valores (Bica D’Água 01)
  const cardB = A('acomodacoes', 'card'), linhaV = junta(A('acomodacoes', 'semana'), A('acomodacoes', 'feriado'));
  add({ img: 'acomodacoes', t0: tAc + 0.55, t1: F.editar.t0 - 0.35,
    cam: [zoom(F.lista.t0 - 0.2, cardB, 1.55)],
    saltos: [
      { t: T('tipo'), ate: T('valores') - 0.35, ret: folga(A('acomodacoes', 'tipo'), 18), larg: 720, cy: 560 },
      { t: T('valores'), ate: T('semana') - 0.15, ret: folga(linhaV, 14), larg: 980, cy: 560 },
    ],
    aneis: [{ t: T('semana'), ret: A('acomodacoes', 'semana'), ate: T('fds') - 0.05 }, { t: T('fds'), ret: A('acomodacoes', 'fimdesemana'), ate: T('feriado') - 0.05 },
      { t: T('feriado'), ret: A('acomodacoes', 'feriado') }] });

  // 3) Editar o Ipê 08: fim de semana de R$ 520,00 para R$ 550,00
  const tEd = T('editar'), tVal = T('valor2'), tSal = T('salve');
  const fimEd = F.depois.t0 + 0.7;
  add({ img: 'acomodacoes-ipe08', t0: F.editar.t0 - 0.35, t1: fimEd,
    cam: [{ t: F.editar.t0 - 0.35, z: 1.45, ...c(...A('acomodacoes-ipe08', 'card')), d: 0.01 },
      perto(tEd - 0.55, A('acomodacoes-ipe08', 'editar')),
      zoom(tEd + 0.3, junta(A('editar-ipe08', 'tsemana'), A('editar-ipe08', 'tferiado')), 1.5),
      perto(tSal - 0.5, A('editar-ipe08', 'salvar')),
      zoom(tSal + 0.3, folga(A('acomodacoes-ipe08-550-topo', 'aviso'), 60), 1.45, 0.4)],
    estados: [{ t: tEd + 0.15, img: 'editar-ipe08', d: 0.3, sobe: 700 }, { t: tVal + 0.65, img: 'editar-ipe08-550', d: 0.12 },
      { t: tSal + 0.15, img: 'acomodacoes-ipe08-550-topo', d: 0.3 }],
    digita: [{ t: tVal, d: 0.6, img: 'editar-ipe08-550', ret: A('editar-ipe08', 'tfim'), tx: X('editar-ipe08-550', 'tfim'), n: 9 }],
    toques: [{ t: tEd, ...pt(A('acomodacoes-ipe08', 'editar')) }, { t: tVal - 0.15, ...pt(A('editar-ipe08', 'tfim')) }, { t: tSal, ...pt(A('editar-ipe08', 'salvar')) }],
    aneis: [{ t: T('preco'), ret: A('acomodacoes-ipe08', 'fimdesemana'), ate: tEd - 0.6 }, { t: tEd - 0.45, ret: A('acomodacoes-ipe08', 'editar'), ate: tEd + 0.1 }],
    saltos: [{ t: tSal + 0.35, ate: fimEd - 0.5, ret: folga(A('acomodacoes-ipe08-550-topo', 'aviso'), 6), img: 'acomodacoes-ipe08-550-topo', larg: 960, cy: 600 }] });

  // 4) Antes e depois, lado a lado
  const fimD1 = F.nova.t0 + 0.25;
  duplas.push({ t0: fimEd, t1: fimD1, lados: [
    { img: 'acomodacoes-ipe08', rot: 'Antes', aneis: [{ t: fimEd + 0.35, ret: A('acomodacoes-ipe08', 'fimdesemana') }] },
    { img: 'acomodacoes-ipe08-550', rot: 'Depois', aneis: [{ t: T('novo') - 0.1, ret: A('acomodacoes-ipe08-550', 'fimdesemana') }] }] });

  // 5) Nova acomodação: Chalé Jabuticaba (o toque em Salvar e o aviso fecham a frase)
  const tNova = T('nova'), tNome = T('nome'), tCap = T('cap2'), tTar = T('tarifas');
  const NV = (k) => A('nova', k), tSalN = tTar + 0.75, fimN = F.bloquear.t0 - 0.15;
  add({ img: 'acomodacoes-ipe08-550-topo', t0: fimD1, t1: fimN,
    cam: [{ t: fimD1, z: 1.45, ...c(...folga(A('acomodacoes-ipe08-550-topo', 'nova'), 160)), d: 0.01 },
      perto(tNova - 0.5, A('acomodacoes-ipe08-550-topo', 'nova')),
      zoom(tNova + 0.35, junta(NV('nome'), NV('categoria')), 1.55),
      zoom(tCap - 0.35, junta(NV('capacidade'), NV('tferiado')), 1.3),
      perto(tSalN - 0.35, NV('salvar'), 0.3),
      zoom(tSalN + 0.3, folga(A('acomodacoes-jabuticaba-topo', 'aviso'), 60), 1.45, 0.4)],
    estados: [{ t: tNova + 0.15, img: 'nova', d: 0.3, sobe: 700 }, { t: tTar + 0.55, img: 'nova-preenchida', d: 0.12 },
      { t: tSalN + 0.15, img: 'acomodacoes-jabuticaba-topo', d: 0.3 }],
    digita: [
      { t: tNome - 0.25, d: 0.8, img: 'nova-preenchida', ret: NV('nome'), tx: X('nova-preenchida', 'nome'), n: 16 },
      { t: tCap - 0.05, d: 0.15, img: 'nova-preenchida', ret: NV('capacidade'), tx: X('nova-preenchida', 'capacidade'), n: 1 },
      { t: tCap + 0.35, d: 0.38, img: 'nova-preenchida', ret: NV('tsemana'), tx: X('nova-preenchida', 'tsemana'), n: 9 },
      { t: tCap + 0.8, d: 0.38, img: 'nova-preenchida', ret: NV('tfim'), tx: X('nova-preenchida', 'tfim'), n: 9 },
      { t: tCap + 1.25, d: 0.38, img: 'nova-preenchida', ret: NV('tferiado'), tx: X('nova-preenchida', 'tferiado'), n: 9 }],
    toques: [{ t: tNova, ...pt(A('acomodacoes-ipe08-550-topo', 'nova')) }, { t: tNome - 0.4, ...pt(NV('nome')) }, { t: tCap - 0.2, ...pt(NV('capacidade')) },
      { t: tSalN, ...pt(NV('salvar')) }],
    aneis: [{ t: T('tipo2'), ret: NV('categoria'), ate: tCap - 0.1 }, { t: tTar, ret: junta(NV('tsemana'), NV('tferiado')), ate: tSalN - 0.4 }],
    saltos: [{ t: tSalN + 0.35, ate: fimN - 0.5, ret: folga(A('acomodacoes-jabuticaba-topo', 'aviso'), 6), img: 'acomodacoes-jabuticaba-topo', larg: 960, cy: 600 }] });

  // 6) Bloquear o Chalé de Pedra 06: período no calendário, motivo e o AVISO (o cartão bloqueado não aparece)
  const tBl = T('bloqueie'), tDt = T('datas'), BQ = (k) => A('bloquear-pedra06', k), DI = (k) => A('bloquear-periodo-26-28', k);
  const t26 = tDt + 0.65, t28 = t26 + 0.55, tConf = t28 + 0.6, tMot = tConf + 0.5, tBq = tMot + 1.35, fimB = F.desativar.t0;
  add({ img: 'acomodacoes-pedra06', t0: fimN, t1: fimB,
    cam: [{ t: fimN, z: 1.45, ...c(...A('acomodacoes-pedra06', 'card')), d: 0.01 },
      perto(tBl - 0.55, A('acomodacoes-pedra06', 'bloquear')),
      zoom(tBl + 0.3, junta(BQ('texto'), BQ('bloquear')), 1.3),
      zoom(tDt + 0.25, junta(DI('d26'), DI('confirmar')), 1.5),
      zoom(tConf + 0.2, junta(BQ('inicio'), BQ('motivo')), 1.55),
      perto(tBq - 0.4, BQ('bloquear'), 0.3),
      zoom(tBq + 0.3, folga(A('acomodacoes-pedra06-aviso', 'aviso'), 60), 1.45, 0.4)],
    estados: [{ t: tBl + 0.15, img: 'bloquear-pedra06', d: 0.3, sobe: 700 }, { t: tDt + 0.12, img: 'bloquear-periodo', d: 0.25, sobe: 300 },
      { t: t26 + 0.05, img: 'bloquear-periodo-26', d: 0.12 }, { t: t28 + 0.05, img: 'bloquear-periodo-26-28', d: 0.12 },
      { t: tConf + 0.12, img: 'bloquear-pedra06-datas', d: 0.25 }, { t: tMot + 1.15, img: 'bloquear-pedra06-preenchido', d: 0.12 },
      { t: tBq + 0.15, img: 'acomodacoes-pedra06-aviso', d: 0.3 }],
    digita: [{ t: tMot + 0.1, d: 1.0, img: 'bloquear-pedra06-preenchido', ret: BQ('motivo'), tx: X('bloquear-pedra06-preenchido', 'motivo'), n: 18 }],
    toques: [{ t: tBl, ...pt(A('acomodacoes-pedra06', 'bloquear')) }, { t: tDt, ...pt(BQ('inicio')) }, { t: t26, ...pt(DI('d26')) }, { t: t28, ...pt(DI('d28')) },
      { t: tConf, ...pt(DI('confirmar')) }, { t: tMot - 0.05, ...pt(BQ('motivo')) }, { t: tBq, ...pt(BQ('bloquear')) }],
    aneis: [{ t: tBl - 0.45, ret: A('acomodacoes-pedra06', 'bloquear'), ate: tBl + 0.1 }, { t: t28 + 0.15, ret: DI('periodo'), ate: tConf - 0.05 }],
    saltos: [{ t: tBq + 0.4, ate: fimB - 0.5, ret: folga(A('acomodacoes-pedra06-aviso', 'aviso'), 6), img: 'acomodacoes-pedra06-aviso', larg: 960, cy: 600 }] });

  // 7) Desativar o Chalé Serra 01, e o antes e depois
  const tDs = T('desative'), SV = (k) => A('acomodacoes-serra01', k), AMBAR = [60, 1554, 1110, 1811];
  const tConfD = T('continua') - 0.6, fimS = tConfD + 0.45;
  add({ img: 'acomodacoes-serra01', t0: fimB, t1: fimS,
    cam: [{ t: fimB, z: 1.45, ...c(...SV('card')), d: 0.01 }, perto(tDs - 0.55, SV('desativar')),
      zoom(tDs + 0.3, junta(A('desativar-serra01', 'titulo'), A('desativar-serra01', 'desativar')), 1.25)],
    estados: [{ t: tDs + 0.15, img: 'desativar-serra01', d: 0.3, sobe: 700 }],
    toques: [{ t: tDs, ...pt(SV('desativar')) }, { t: tConfD, ...pt(A('desativar-serra01', 'desativar')) }],
    aneis: [{ t: tDs - 0.45, ret: SV('desativar'), ate: tDs + 0.1 }],
    saltos: [{ t: T('novas') - 0.35, ate: tConfD - 0.15, ret: folga(AMBAR, 4), img: 'desativar-serra01', cor: 'ambar', larg: 960, cy: 600 }] });
  duplas.push({ t0: fimS, t1: fecho.t0, lados: [
    { img: 'acomodacoes-serra01', rot: 'Antes', aneis: [{ t: fimS + 0.3, ret: SV('estado') }] },
    { img: 'acomodacoes-serra01-inativa', rot: 'Depois', aneis: [{ t: fimS + 0.75, ret: A('acomodacoes-serra01-inativa', 'estado'), cor: 'ambar' }] }] });

  // toda janela fecha antes de a tela começar a sair (nada cortado na borda)
  telas.forEach((s) => (s.saltos || []).forEach((j) => { j.ate = Math.min(j.ate, s.t1 - 0.5); }));

  // ---- legenda: páginas curtas (quebra na pontuação; nunca mais que 2 linhas), sem a pergunta inicial e sem o fecho (estão na tela)
  const legenda = [];
  const tam = (ws) => ws.map((x) => x.w).join(' ').length;
  const parte = (ws) => {
    if (tam(ws) <= 40) return [ws];
    let melhor = -1, nota = -1e9;
    for (let k = 1; k < ws.length; k++) {
      const a = tam(ws.slice(0, k)), b = tam(ws.slice(k));
      if (a < 12 || b < 12) continue;
      const solta = /^(o|a|os|as|e|de|do|da|dos|das|no|na|nos|nas|em|um|uma|pra|para|com|que|se|não|tem|é|ao|só|já|seu|sua|por|quem|nem|cada|três|quantas)$/i.test(ws[k - 1].w);
      const n = (/[,:?.…]$/.test(ws[k - 1].w) ? 20 : 0) - Math.abs(a - b) / 2 - (a > 44 || b > 44 ? 30 : 0) - (solta ? 25 : 0);
      if (n > nota) { nota = n; melhor = k; }
    }
    return melhor < 0 ? [ws] : [...parte(ws.slice(0, melhor)), ...parte(ws.slice(melhor))];
  };
  LN.frases.filter((f) => !['g1', 'cta', 'cta2'].includes(f.id)).forEach((f, i, arr) => {
    const pgs = parte(f.palavras), nx = arr[i + 1];
    pgs.forEach((pg, k) => legenda.push({ t0: pg[0].t0 - 0.06, t1: k < pgs.length - 1 ? pgs[k + 1][0].t0 - 0.06 : (nx ? Math.min(nx.t0 - 0.06, f.t1 + 1.2) : f.t1 + 0.4),
      palavras: pg.map((w) => ({ w: w.w, t: w.t0, chave: w.chave })) }));
  });

  return { duracao: LN.duracao, dor, marca, fecho, telas, duplas, legenda, tom: (t) => (t < marca.t0 ? '#FFB23F' : '#AFFA27') };
};
