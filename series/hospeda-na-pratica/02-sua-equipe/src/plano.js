/*
 * Plano do episódio 2 (Sua equipe no Hospeda): tudo sai de ../linha.json (scripts/linha.py) e ../telas/alvos.json
 * (scripts/capturar.cjs mede cada elemento na própria Demo, em px da captura 1170×2532).
 * T('id') = início da palavra marcada no roteiro; W(frase, palavra) = início de uma palavra qualquer.
 * Cada tela: { img, t0, t1, cam, aneis, saltos, toques, estados: [{t, img, d, sobe}], digita: [{t, d, img, ret, fim, n}] }.
 */
window.montaPlano = function (LN, AL) {
  const ids = {}, F = {};
  LN.frases.forEach((f) => { F[f.id] = f; f.palavras.forEach((w) => { if (w.id) ids[w.id] = w; }); });
  const T = (id) => { if (!ids[id]) throw new Error('id ' + id); return ids[id].t0; };
  const W = (fid, w) => { const x = F[fid].palavras.find((p) => p.w.replace(/[.,:;?!…]/g, '') === w); if (!x) throw new Error(fid + ' ' + w); return x.t0; };
  const A = (tela, k) => { const r = AL[tela] && AL[tela][k]; if (!r) throw new Error('alvo ' + tela + '.' + k); return r; };
  const c = (x0, y0, x1, y1) => ({ fx: (x0 + x1) / 2, fy: (y0 + y1) / 2 });
  const zoom = (t, ret, z = 1.5, d = 0.55) => ({ t, z, ...c(...ret), d });
  const pt = (r) => ({ x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2 });
  const folga = (r, m) => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
  const junta = (...rs) => [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))];

  // ---- cenas sem tela
  const senha = { t0: 0, t1: F.marca.t0 - 0.1, g2: F.g2.t0, senha: T('senha'), equipe: T('equipe'), mao: T('mao'), mao2: F.g2.palavras[6].t0,   // o segundo "mão,"
    sai: T('sai'), nem: W('g2', 'nem'), ainda: T('entra') };
  const marca = { t0: F.marca.t0 - 0.1, t1: F.caminho.t0 - 0.05, fazlo: T('fazlo'), cada: W('marca', 'cada'), proprio: T('acesso') };
  const fecho = { t0: F.cta.t0 - 0.25, cada: T('cada'), controle: W('cta', 'e'), arroba: F.cta.t1 + 0.6 };

  // ---- telas (a seguinte entra 0,25 s antes da anterior sair)
  const telas = [];
  const add = (s) => { telas.push(s); return s; };
  const MAIS = { x: 1053, y: 2430 }, MENU_USU = [36, 1695, 1134, 1830];   // medidos sobre as capturas (o menu é uma camada)

  // 1) Início → Mais → Usuários
  const tU = T('usuarios');
  add({ img: 'inicio', t0: marca.t1, t1: tU + 0.55,
    cam: [zoom(T('mais') - 0.6, [640, 2250, 1170, 2532], 1.45, 0.45), zoom(T('mais') + 0.25, MENU_USU, 1.35, 0.5)],
    estados: [{ t: T('mais') + 0.06, img: 'menu-mais', d: 0.22, sobe: 0 }],
    toques: [{ t: T('mais') - 0.05, ...MAIS, onda: 0.7 },   // a barra do app fica no pé do palco: onda menor, longe da legenda
      { t: tU + 0.1, ...pt(MENU_USU) }],
    aneis: [{ t: tU - 0.4, ret: MENU_USU, ate: tU + 0.45 }] });

  // 2) Usuários → Convidar usuário → formulário → convite registrado
  const tC = T('convidar'), tEnv = T('enviou'), tOp = T('cx') + 0.45;
  const cards = junta(A('usuarios', 'paulo'), A('usuarios', 'mariana'));
  add({ img: 'usuarios', t0: tU + 0.55, t1: F.alterar.t0 - 0.35,
    cam: [
      zoom(F.lista.t0 - 0.15, cards, 1.2),
      zoom(tC - 0.65, junta(A('usuarios', 'ativos'), A('usuarios', 'convidar')), 1.55),
      zoom(tC + 0.5, junta(A('convidar', 'nome'), A('convidar', 'email')), 1.5),
      zoom(T('papel2') - 0.35, junta(A('convidar', 'opt-admin'), A('convidar', 'opt-cx')), 1.15),
      zoom(tEnv - 0.55, junta(A('convidar-preenchido', 'opt-cx'), A('convidar-preenchido', 'enviar')), 1.3),
      zoom(tEnv + 0.3, junta(A('usuarios-convite', 'ativos'), A('usuarios-convite', 'aviso')), 1.4),
      zoom(T('entra2') - 0.45, A('usuarios-convite', 'carla'), 1.45),
    ],
    estados: [
      { t: tC + 0.45, img: 'convidar', d: 0.3, sobe: 700 },
      { t: tOp + 0.06, img: 'convidar-preenchido', d: 0.18 },
      { t: tEnv + 0.15, img: 'usuarios-convite', d: 0.3 },
    ],
    digita: [
      { t: T('nome') - 0.05, d: 0.75, img: 'convidar-preenchido', ret: A('convidar', 'nome'), fim: 372, n: 12 },
      { t: T('email') - 0.02, d: 1.05, img: 'convidar-preenchido', ret: A('convidar', 'email'), fim: 737, n: 28 },
    ],
    toques: [{ t: tC + 0.3, ...pt(A('usuarios', 'convidar')) }, { t: T('nome') - 0.2, ...pt(A('convidar', 'nome')) }, { t: T('email') - 0.17, ...pt(A('convidar', 'email')) },
      { t: tOp, ...pt(A('convidar', 'opt-op')) }, { t: tEnv, ...pt(A('convidar-preenchido', 'enviar')) }],
    aneis: [
      { t: T('papel') - 0.1, ret: A('usuarios', 'papel-paulo'), ate: F.lista.t1 + 0.3 },
      { t: T('papel') + 0.15, ret: A('usuarios', 'papel-joao'), ate: F.lista.t1 + 0.3 },
      { t: T('papel') + 0.4, ret: A('usuarios', 'papel-mariana'), ate: F.lista.t1 + 0.3 },
      { t: tC - 0.2, ret: A('usuarios', 'convidar'), ate: tC + 0.4 },
      { t: T('adm'), ret: A('convidar', 'opt-admin'), ate: T('op') - 0.05 },
      { t: T('op'), ret: A('convidar', 'opt-op'), ate: T('cx') - 0.05 },
      { t: T('cx'), ret: A('convidar', 'opt-cx'), ate: tOp - 0.05 },
      { t: F.papeis.t0, ret: A('convidar-preenchido', 'opt-admin'), ate: F.papeis.t0 + 0.55 },
      { t: F.papeis.t0 + 0.6, ret: A('convidar-preenchido', 'opt-op'), ate: F.papeis.t0 + 1.15 },
      { t: F.papeis.t0 + 1.2, ret: A('convidar-preenchido', 'opt-cx'), ate: T('fazer') - 0.1 },
      { t: T('entra2') - 0.1, ret: A('usuarios-convite', 'carla') },
    ],
    saltos: [
      { t: T('fazer'), ate: tEnv - 0.6, ret: folga(A('convidar-preenchido', 'opt-op'), 12), img: 'convidar-preenchido', larg: 960, cy: 640 },   // a opção inteira: título, descrição e a borda do app
      { t: tEnv + 0.65, ate: T('entra2') - 0.55, ret: A('usuarios-convite', 'aviso'), img: 'usuarios-convite', larg: 960, cy: 640 },
    ] });

  // 3) Alterar papel do João Pereira: Caixa → Operação
  const tA = T('alterar'), tS = T('salve');
  const fimA = F.desativar.t0 + 0.05;
  add({ img: 'usuarios-joao', t0: F.alterar.t0 - 0.35, t1: fimA,
    cam: [{ t: F.alterar.t0 - 0.35, z: 1.45, ...c(...A('usuarios-joao', 'joao')), d: 0.01 },
      zoom(tA + 0.3, junta(A('alterar-joao', 'opt-admin'), A('alterar-joao', 'salvar')), 1.1),
      zoom(tS + 0.2, A('usuarios-joao-operacao-topo', 'aviso'), 1.45, 0.4),
      zoom(tS + 1.0, A('usuarios-joao-operacao', 'joao'), 1.45, 0.45)],
    estados: [{ t: tA + 0.2, img: 'alterar-joao', d: 0.3, sobe: 700 }, { t: tA + 0.75, img: 'alterar-joao-operacao', d: 0.15 },
      { t: tS + 0.15, img: 'usuarios-joao-operacao-topo', d: 0.25 }, { t: tS + 0.95, img: 'usuarios-joao-operacao', d: 0.3, sobe: 400 }],
    toques: [{ t: tA + 0.05, ...pt(A('usuarios-joao', 'alterar')) }, { t: tA + 0.7, ...pt(A('alterar-joao', 'opt-op')) }, { t: tS, ...pt(A('alterar-joao', 'salvar')) }],
    aneis: [{ t: tA - 0.35, ret: A('usuarios-joao', 'alterar'), ate: tA + 0.15 }],
    saltos: [
      { t: F.alterar.t0 + 0.05, ate: tA - 0.4, ret: A('usuarios-joao', 'papel'), img: 'usuarios-joao', larg: 420, cy: 560 },
      { t: tS + 0.35, ate: tS + 0.85, ret: A('usuarios-joao-operacao-topo', 'aviso'), img: 'usuarios-joao-operacao-topo', larg: 960, cy: 560 },
      { t: tS + 1.3, ate: fimA - 0.5, ret: A('usuarios-joao-operacao', 'papel'), img: 'usuarios-joao-operacao', larg: 560, cy: 560 },
    ] });

  // 4) Desativar e reativar a Mariana Costa
  const tD = T('desative'), tR = T('reativar'), conf = T('historico') + 0.95;
  add({ img: 'usuarios-mariana', t0: fimA, t1: fecho.t0,
    cam: [{ t: fimA, z: 1.45, ...c(...A('usuarios-mariana', 'mariana')), d: 0.01 },
      zoom(tD + 0.3, junta(A('desativar-mariana', 'titulo'), A('desativar-mariana', 'desativar')), 1.3),
      zoom(conf + 0.15, A('usuarios-mariana-inativa', 'mariana'), 1.45, 0.45),
      zoom(F.reativar.t0 - 0.1, junta(A('inativos', 'ativos'), A('inativos', 'mariana')), 1.15),
      zoom(tR + 0.75, A('usuarios-mariana-reativada', 'mariana'), 1.45, 0.45)],
    estados: [{ t: tD + 0.15, img: 'desativar-mariana', d: 0.3, sobe: 700 }, { t: conf + 0.12, img: 'usuarios-mariana-inativa', d: 0.25 },
      { t: F.reativar.t0 - 0.15, img: 'inativos', d: 0.3, sobe: -300 }, { t: tR + 0.15, img: 'inativos-reativado', d: 0.2 },
      { t: tR + 0.8, img: 'usuarios-mariana-reativada', d: 0.3, sobe: 400 }],
    toques: [{ t: tD, ...pt(A('usuarios-mariana', 'desativar')) }, { t: conf, ...pt(A('desativar-mariana', 'desativar')) },
      { t: F.reativar.t0 + 0.1, ...pt(A('inativos', 'chip')) }, { t: tR, ...pt(A('inativos', 'reativar')) }, { t: tR + 0.65, ...pt(A('inativos-reativado', 'todos')) }],
    aneis: [{ t: tD - 0.45, ret: A('usuarios-mariana', 'desativar'), ate: tD + 0.1 },
      { t: conf + 0.45, ret: A('usuarios-mariana-inativa', 'estado'), cor: 'ambar', ate: F.reativar.t0 - 0.2 },
      { t: tR - 0.45, ret: A('inativos', 'reativar'), ate: tR + 0.1 },
      { t: tR + 1.25, ret: A('usuarios-mariana-reativada', 'estado') }],
    saltos: [{ t: T('perde') - 0.2, ate: conf - 0.2, ret: A('desativar-mariana', 'texto'), img: 'desativar-mariana', larg: 960, cy: 600 }] });

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
      const solta = /^(o|a|os|as|e|de|do|da|dos|das|no|na|nos|nas|em|um|uma|pra|para|com|que|se|não|tem|é|ao|só|já|seu|sua|por|quem|nem)$/i.test(ws[k - 1].w);
      const n = (/[,:?.…]$/.test(ws[k - 1].w) ? 20 : 0) - Math.abs(a - b) / 2 - (a > 44 || b > 44 ? 30 : 0) - (solta ? 25 : 0);
      if (n > nota) { nota = n; melhor = k; }
    }
    return melhor < 0 ? [ws] : [...parte(ws.slice(0, melhor)), ...parte(ws.slice(melhor))];
  };
  LN.frases.filter((f) => f.id !== 'cta' && f.id !== 'g1').forEach((f, i, arr) => {
    const pgs = parte(f.palavras), nx = arr[i + 1];
    pgs.forEach((pg, k) => legenda.push({ t0: pg[0].t0 - 0.06, t1: k < pgs.length - 1 ? pgs[k + 1][0].t0 - 0.06 : (nx ? Math.min(nx.t0 - 0.06, f.t1 + 1.2) : f.t1 + 0.4),
      palavras: pg.map((w) => ({ w: w.w, t: w.t0, chave: w.chave })) }));
  });

  return { duracao: LN.duracao, senha, marca, fecho, telas, legenda, tom: (t) => (t < marca.t0 ? '#FFB23F' : '#AFFA27') };
};
