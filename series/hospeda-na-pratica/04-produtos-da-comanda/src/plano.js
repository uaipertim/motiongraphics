/*
 * Plano do episódio 4 (Produtos da comanda): tudo sai de ../linha.json (scripts/linha.py), ../telas/alvos.json (cada elemento
 * medido na própria Demo) e ../telas/textos.json (a caixa do texto digitado, medida nas capturas preenchidas).
 * T('id') = início da palavra marcada no roteiro; W(frase, palavra) = início de uma palavra qualquer.
 * Telas: { img, t0, t1, cam, aneis, saltos, toques, estados: [{t, img, d, sobe}], digita: [{t, d, img, ret, tx, n, vazio}] }.
 * Duplas (antes e depois): { t0, t1, tc (close nos dois cartões), cys, lados: [{ img, rot, aneis, close }] }.
 * Regra: nenhum aviso do app por cima de um toque ou destaque; os toques no topo da lista partem de capturas limpas.
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
  // medidas tiradas da imagem (o script não separa estes blocos): o cartão da Cerveja sozinho na busca, a nota do preço no
  // formulário, o texto da confirmação de desativar e o cartão do Refrigerante
  const CERV = [48, 1044, 1122, 1410], NOTA = [60, 1860, 1110, 2111], TXT_DES = [60, 1800, 1110, 2111], REFRI = [48, 1062, 1122, 1440];

  // ---- cenas sem tela
  const dor = { t0: 0, t1: F.marca.t0 - 0.1, g2: F.g2.t0, cobra: T('cobra'), passeio: T('passeio') };
  const marca = { t0: F.marca.t0 - 0.1, t1: F.caminho.t0 - 0.05, fazlo: T('fazlo'), cad: T('produto0'), marcos: [T('servico0'), T('cadastrado'), T('certo')] };
  const fecho = { t0: F.cta.t0 - 0.25, tudo: T('tudo'), facil: T('pronto'), comeco: T('comeco'), configura: T('configura'), arroba: F.cta2.t1 + 0.6 };

  const telas = [], duplas = [];
  const add = (s) => { telas.push(s); return s; };
  const MAIS = { x: 1053, y: 2430 };

  // 1) Início → Mais → Produtos e serviços
  const tPr = T('produtos'), tMais = T('mais'), ROW = A('menu-mais', 'produtos');
  add({ img: 'inicio', t0: marca.t1, t1: tPr + 0.55,
    cam: [perto(tMais - 0.6, [800, 2300, 1170, 2532]), perto(tMais + 0.3, ROW, 0.5)],
    estados: [{ t: tMais + 0.06, img: 'menu-mais', d: 0.22 }],
    toques: [{ t: tMais - 0.05, ...MAIS, onda: 0.7 }, { t: tPr + 0.1, ...pt(ROW) }],
    aneis: [{ t: tPr - 0.4, ret: ROW, ate: tPr + 0.45 }] });

  // 2) A lista por categoria e a busca "cerv" (a lista limpa: nenhum aviso)
  const L = (k) => A('produtos', k), CT = (k) => A('produtos-categorias', k), tBus = T('buscar');
  const tRola = T('bebidas') + 0.55, tVolta = F.busca.t0 - 0.1;
  add({ img: 'produtos', t0: tPr + 0.55, t1: F.editar.t0 - 0.35,
    cam: [zoom(F.lista.t0 - 0.2, junta(L('contagem'), L('bebidas')), 1.5), zoom(tRola, junta(CT('alimentos'), CT('experiencias')), 1.15),
      zoom(tVolta + 0.1, junta(L('novo'), L('bebidas')), 1.5), perto(tBus - 1.0, L('busca')), zoom(tBus + 0.4, junta(L('busca'), A('produtos-busca', 'card')), 1.5)],
    estados: [{ t: tRola, img: 'produtos-categorias', d: 0.35, sobe: 500 }, { t: tVolta, img: 'produtos', d: 0.35, sobe: -500 },
      { t: tBus + 0.55, img: 'produtos-busca', d: 0.12 }],
    digita: [{ t: tBus - 0.35, d: 0.5, img: 'produtos-busca', ret: L('busca'), tx: X('produtos-busca', 'busca'), n: 4, vazio: [150, 1108] }],
    toques: [{ t: tBus - 0.55, ...pt(L('busca')) }],
    aneis: [{ t: T('bebidas'), ret: L('bebidas'), ate: tRola - 0.05 }, { t: T('alimentos'), ret: CT('alimentos'), ate: T('restaurante') - 0.05 },
      { t: T('restaurante'), ret: CT('restaurante'), ate: T('experiencias') - 0.05 }, { t: T('experiencias'), ret: CT('experiencias'), ate: tVolta - 0.1 }],
    saltos: [{ t: T('categoria'), ate: T('bebidas') - 0.1, ret: folga(L('contagem'), 12), larg: 760, cy: 560 }] });

  // 3) Editar a Cerveja: o painel fica aberto com "Preço atual" e a regra do preço novo legíveis; o Salvar vem no fim
  const tEd = T('editar'), tAj = T('ajuste'), EC = (k) => A('editar-cerveja', k), tSal = F.regra.t1 + 0.3, tD1 = tSal + 2.25;
  add({ img: 'produtos-busca', t0: F.editar.t0 - 0.35, t1: tD1,
    cam: [{ t: F.editar.t0 - 0.35, z: 1.5, ...c(...CERV), d: 0.01 }, perto(tEd - 0.55, A('produtos-busca', 'editar')),
      zoom(tEd + 0.3, junta(EC('preco'), NOTA), 1.25), perto(tSal - 0.45, EC('salvar'), 0.35),
      zoom(tSal + 0.3, folga(A('produtos-cerveja-16-aviso', 'aviso'), 60), 1.45, 0.4)],
    estados: [{ t: tEd + 0.15, img: 'editar-cerveja', d: 0.3, sobe: 700 }, { t: tAj + 0.55, img: 'editar-cerveja-16', d: 0.12 },
      { t: tSal + 0.15, img: 'produtos-cerveja-16-aviso', d: 0.18 }],
    digita: [{ t: tAj, d: 0.5, img: 'editar-cerveja-16', ret: EC('preco'), tx: X('editar-cerveja-16', 'preco'), n: 8 }],
    toques: [{ t: tEd, ...pt(A('produtos-busca', 'editar')) }, { t: tAj - 0.15, ...pt(EC('preco')) }, { t: tSal, ...pt(EC('salvar')) }],
    aneis: [{ t: T('mudou'), ret: A('produtos-busca', 'preco'), ate: tEd - 0.6 }, { t: tEd - 0.45, ret: A('produtos-busca', 'editar'), ate: tEd + 0.1 },
      { t: T('salve'), ret: EC('salvar'), ate: F.regra.t0 - 0.1 }],
    saltos: [
      { t: T('preconovo'), ate: T('lancado') - 0.25, ret: folga(X('editar-cerveja-16', 'atual'), 22), img: 'editar-cerveja-16', larg: 760, cy: 520 },   // só o texto, para ele crescer
      { t: T('lancado'), ate: tSal - 0.6, ret: folga(NOTA, 6), img: 'editar-cerveja-16', larg: 960, cy: 560 },
      { t: tSal + 0.4, ate: tD1 - 0.5, ret: folga(A('produtos-cerveja-16-aviso', 'aviso'), 6), img: 'produtos-cerveja-16-aviso', larg: 960, cy: 600 }] });

  // 4) Antes e depois: os dois celulares inteiros e, depois, o close nos dois cartões
  const fimD1 = F.novo.t0 + 0.3;
  duplas.push({ t0: tD1, t1: fimD1, tc: tD1 + 0.9, cys: [520, 900], lados: [
    { img: 'produtos-busca', rot: 'Antes', close: folga(CERV, 6), aneis: [{ t: tD1 + 0.35, ret: A('produtos-busca', 'preco') }] },
    { img: 'produtos-busca-16', rot: 'Depois', close: folga(CERV, 6), aneis: [{ t: tD1 + 0.55, ret: A('produtos-busca-16', 'preco') }] }] });

  // 5) Novo produto: Pão de queijo (a lista limpa antes do toque no + Novo produto ou serviço)
  const tNv = T('novo'), tNome = T('nome'), tCat = T('categoria2'), tPre = T('preco2'), NV = (k) => A('novo', k), tSalN = F.novo.t1 + 0.55, fimN = F.desativar.t0 - 0.15;
  add({ img: 'produtos-limpa', t0: fimD1, t1: fimN,
    cam: [{ t: fimD1, z: 1.45, ...c(...folga(A('produtos-limpa', 'novo'), 160)), d: 0.01 }, perto(tNv - 0.5, A('produtos-limpa', 'novo')),
      zoom(tNv + 0.35, junta(NV('nome'), NV('descricao')), 1.35), perto(tSalN - 0.4, NV('salvar'), 0.3),
      zoom(tSalN + 0.3, folga(A('produtos-pao-aviso', 'aviso'), 60), 1.45, 0.4)],
    estados: [{ t: tNv + 0.15, img: 'novo', d: 0.3, sobe: 700 }, { t: tPre + 0.75, img: 'novo-preenchido', d: 0.12 }, { t: tSalN + 0.15, img: 'produtos-pao-aviso', d: 0.18 }],
    digita: [
      { t: tNome - 0.45, d: 0.7, img: 'novo-preenchido', ret: NV('nome'), tx: X('novo-nome', 'nome'), n: 13 },
      { t: tCat + 0.15, d: 0.05, img: 'novo-preenchido', ret: NV('categoria'), tx: X('novo-preenchido', 'categoria'), n: 1, vazio: [74, NV('categoria')[2] - 80] },
      { t: tPre - 0.05, d: 0.4, img: 'novo-preenchido', ret: NV('preco'), tx: X('novo-preenchido', 'preco'), n: 8 },
      { t: tPre + 0.4, d: 0.35, img: 'novo-preenchido', ret: NV('descricao'), tx: X('novo-preenchido', 'descricao'), n: 21 }],
    toques: [{ t: tNv, ...pt(A('produtos-limpa', 'novo')) }, { t: tNome - 0.6, ...pt(NV('nome')) }, { t: tCat - 0.1, ...pt(NV('categoria')) }, { t: tPre - 0.2, ...pt(NV('preco')) },
      { t: tSalN, ...pt(NV('salvar')) }],
    aneis: [{ t: tNv - 0.45, ret: A('produtos-limpa', 'novo'), ate: tNv + 0.1 }],
    saltos: [{ t: tSalN + 0.4, ate: fimN - 0.5, ret: folga(A('produtos-pao-aviso', 'aviso'), 6), img: 'produtos-pao-aviso', larg: 960, cy: 600 }] });

  // 6) Desativar o Refrigerante, e o antes e depois
  const tDs = T('desative'), RF = (k) => A('produtos-refrigerante', k), tConf = T('historico') + 0.75, fimR = tConf + 0.45;
  add({ img: 'produtos-refrigerante', t0: fimN, t1: fimR,
    cam: [{ t: fimN, z: 1.5, ...c(...REFRI), d: 0.01 }, perto(tDs - 0.55, RF('desativar')),
      zoom(tDs + 0.3, junta(A('desativar-refrigerante', 'titulo'), A('desativar-refrigerante', 'desativar')), 1.3)],
    estados: [{ t: tDs + 0.15, img: 'desativar-refrigerante', d: 0.3, sobe: 700 }],
    toques: [{ t: tDs, ...pt(RF('desativar')) }, { t: tConf, ...pt(A('desativar-refrigerante', 'desativar')) }],
    aneis: [{ t: tDs - 0.45, ret: RF('desativar'), ate: tDs + 0.1 }],
    saltos: [{ t: T('naoaparece') - 0.25, ate: tConf - 0.15, ret: folga(TXT_DES, 4), img: 'desativar-refrigerante', larg: 960, cy: 600 }] });
  duplas.push({ t0: fimR, t1: fecho.t0, tc: fimR + 0.9, cys: [520, 900], lados: [
    { img: 'produtos-refrigerante', rot: 'Antes', close: folga(REFRI, 6), aneis: [{ t: fimR + 0.3, ret: RF('estado') }] },
    { img: 'produtos-refrigerante-inativo', rot: 'Depois', cor: 'ambar', close: folga(REFRI, 6), aneis: [{ t: fimR + 0.5, ret: A('produtos-refrigerante-inativo', 'estado'), cor: 'ambar' }] }] });

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
      const solta = /^(o|a|os|as|e|de|do|da|dos|das|no|na|nos|nas|em|um|uma|pra|para|com|que|se|não|tem|é|ao|só|já|seu|sua|por|quem|nem|cada|ele|mais)$/i.test(ws[k - 1].w);
      const n = (/[,:;?.…]$/.test(ws[k - 1].w) ? 20 : 0) - Math.abs(a - b) / 2 - (a > 44 || b > 44 ? 30 : 0) - (solta ? 25 : 0);
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
