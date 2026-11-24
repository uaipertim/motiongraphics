/*
 * Plano do episódio 5 (A pousada num olhar): tudo sai de ../linha.json (scripts/linha.py) e ../telas/alvos.json (cada elemento
 * medido na própria Demo, em px da PÁGINA a 3x). T('id') = início da palavra marcada no roteiro.
 * Uma tela só (o Início) do começo ao fim: { img, t0, t1, paginas: [{t, img, d}], rolagem: [{t, y, d}], cam: [{t, z, fy, d}],
 *   aneis, toques, saltos: [{t, ate, ret, img, larg, cy, cor, marcas: [{t, ret, cor}]}], escuro }.
 * cam.fy é o ponto da tela do celular (já descontada a rolagem) que fica no centro do palco.
 * Perguntas: { texto, lime, chip, t0 (entra), t1 (vira selinho) }.
 * Cuidados aprovados: em "Tem algo para resolver?", o foco é o bloco "Precisa de atenção" inteiro e os cartões "Check-out em
 * atraso" e "Reserva vencida sem check-in"; o "Conflito com o Airbnb" fica só ao fundo (sem close, sem janela, sem fala).
 * O painel de Chegadas não aparece (diverge do cartão; ver o ROTEIRO).
 */
window.montaPlano = function (LN, AL) {
  const ids = {}, F = {};
  LN.frases.forEach((f) => { F[f.id] = f; f.palavras.forEach((w) => { if (w.id) ids[w.id] = w; }); });
  const T = (id) => { if (!ids[id]) throw new Error('id ' + id); return ids[id].t0; };
  const A = (tela, k) => { const r = AL[tela] && AL[tela][k]; if (!r) throw new Error('alvo ' + tela + '.' + k); return r; };
  const cy = (r) => (r[1] + r[3]) / 2;
  const pt = (r) => ({ x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2 });
  const folga = (r, m) => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
  const I = (k) => A('pg-inicio', k), HO = (k) => A('pg-hospedados', k), RE = (k) => A('pg-recebido', k);
  const foco = (t, r, rol, z, d = 0.6) => ({ t, z, fy: cy(r) - rol, d });
  // rolagens (px da página): o painel aberto fica onde o próprio app rola (1620); o fim da página; o bloco "Precisa de atenção"
  const R_PAINEL = 1620, R_FIM = 5835 - 2532, R_ATENCAO = 1500;
  // medidas tiradas da imagem (o script não separa estes blocos): o cartão preto, a fileira das formas de pagamento,
  // as linhas da lista do painel e o bloco "Precisa de atenção" inteiro
  const CARTAO_TOPO = [80, 560, 1090, 850], FORMAS = [96, 880, 1074, 1068], RECEBER = [80, 1100, 1090, 1316];
  const LISTA_HOSP = [51, 2083, 1119, 3416], LISTA_PAG = [51, 2081, 1119, 3470];
  const BLOCO_ATENCAO = [40, 1850, 1130, 3705];
  const forma = (k) => { const r = I(k); return [r[0] - 8, 938, r[2] + 8, 1064]; };

  const q = (n) => T('q' + n) - 0.15;
  const P = [
    { texto: 'Quem dorme aqui hoje?', lime: 'dorme', chip: 'Hospedados', t0: q(1), t1: q(2) - 0.5 },
    { texto: 'Quem chega hoje?', lime: 'chega', chip: 'Chegadas', t0: q(2), t1: q(3) - 0.5 },
    { texto: 'Quem vai embora?', lime: 'embora', chip: 'Saídas', t0: q(3), t1: q(4) - 0.5 },
    { texto: 'Quanto já entrou?', lime: 'entrou', chip: 'Recebido', t0: q(4), t1: q(5) - 0.5 },
    { texto: 'Entrou em quê?', lime: 'em quê', chip: 'Pagamentos', t0: q(5), t1: q(6) - 0.5 },
    { texto: 'Falta receber?', lime: 'receber', chip: 'A receber', t0: q(6), t1: q(7) - 0.5 },
    { texto: 'Tem algo para resolver?', lime: 'resolver', chip: 'Atenção', t0: q(7), t1: F.cta.t0 - 0.75 },
  ];
  const gancho = { t0: 0, t1: F.abre.t0 - 0.05, perguntas: T('perguntas') };
  const titulo = { t0: F.abre.t0 - 0.2, fazlo: T('fazlo'), t1: P[0].t0 - 0.05 };
  const fecho = { t0: F.cta.t0 - 0.35, umatela: T('umatela'), diainteiro: T('diainteiro'), logo: F.cta2.t0 - 0.1,
    comeco: T('comeco'), configura: T('configura'), arroba: F.cta2.t1 + 0.6 };

  const s = { img: 'pg-inicio', t0: 0, t1: fecho.logo + 0.05, escuro0: 0.62, escuro: [{ t: F.abre.t0 - 0.3, a: 0, d: 0.6 }],
    paginas: [], rolagem: [], cam: [], aneis: [], toques: [], saltos: [] };
  const vi = AL['vp-inicio'];
  // 2) "o Início": contorno na aba Início da barra de baixo
  s.aneis.push({ t: T('inicio') - 0.05, ate: P[0].t0 - 0.15, ret: vi.inicio, fixo: true });

  // 3) Quem dorme aqui hoje? O cartão Hospedados; um toque abre o painel no próprio Início
  const tT1 = T('toque1') + 0.1, tFecha1 = P[1].t0 - 0.55;
  s.cam.push(foco(T('q1') + 0.3, I('hospedados'), 0, 1.9));
  s.aneis.push({ t: T('hospedados'), ate: tT1 - 0.15, ret: I('hospedados') });
  s.saltos.push({ t: T('hospedados') + 0.35, ate: tT1 - 0.3, ret: folga(I('hospedados'), 6), larg: 470, cy: 800 });
  s.toques.push({ t: tT1, ...pt(I('hospedados')) });
  s.paginas.push({ t: tT1 + 0.1, img: 'pg-hospedados', d: 0.3 });
  s.rolagem.push({ t: tT1 + 0.45, y: R_PAINEL, d: 0.6 });
  s.cam.push(foco(tT1 + 0.45, HO('painel'), R_PAINEL, 1.3));
  s.saltos.push({ t: T('cada') - 0.05, ate: T('nome') - 0.25, ret: folga(HO('painel_tit'), 4), img: 'pg-hospedados', larg: 920, cy: 640 });
  s.saltos.push({ t: T('nome') - 0.1, ate: tFecha1 - 0.25, ret: LISTA_HOSP, img: 'pg-hospedados', larg: 690, cy: 905,
    marcas: [{ t: T('nome'), ret: [92, 2120, 590, 2186] }, { t: T('acomodacao'), ret: [92, 2202, 415, 2252] }] });
  s.toques.push({ t: tFecha1, ...pt(HO('fechar_btn')) });
  s.paginas.push({ t: tFecha1 + 0.1, img: 'pg-inicio', d: 0.25 });

  // 4) Quem chega hoje? O cartão Chegadas e a lista "Chegadas de hoje" (o painel de Chegadas fica fora)
  s.rolagem.push({ t: P[1].t0 - 0.15, y: 0, d: 0.55 });
  s.cam.push(foco(P[1].t0 - 0.15, I('chegadas'), 0, 1.7, 0.55));
  s.aneis.push({ t: T('q2') + 0.6, ate: T('chegadas') - 0.3, ret: I('chegadas') });
  s.rolagem.push({ t: T('chegadas') - 0.2, y: R_FIM, d: 0.7 });
  s.cam.push(foco(T('chegadas') - 0.2, I('chegadas_bloco'), R_FIM, 1.25, 0.7));
  s.saltos.push({ t: T('chegadas') + 0.6, ate: P[2].t0 - 0.25, ret: folga(I('chegadas_bloco'), 6), larg: 920, cy: 800,
    marcas: [{ t: T('entrou'), ret: [60, 4690, 1110, 4930], fundo: true }, { t: T('falta'), ret: [60, 4955, 1110, 5335], cor: 'ambar', fundo: true }] });

  // 5) Quem vai embora? A lista "Saídas de hoje", com os horários
  s.cam.push(foco(P[2].t0 + 0.1, I('saidas_bloco'), R_FIM, 1.25, 0.6));
  s.aneis.push({ t: T('q3') + 0.55, ate: T('saidas') - 0.15, ret: I('saidas_bloco') });
  s.saltos.push({ t: T('saidas') - 0.05, ate: P[3].t0 - 0.25, ret: folga(I('saidas_bloco'), 6), larg: 920, cy: 790,
    marcas: [{ t: T('horario'), ret: I('h_carlos') }, { t: T('horario') + 0.12, ret: I('h_beatriz') }] });

  // 6) Quanto já entrou? Volta ao topo: o recebido do dia em destaque
  s.rolagem.push({ t: P[3].t0 - 0.1, y: 0, d: 0.6 });
  s.cam.push(foco(P[3].t0 - 0.1, [0, 542, 0, 1329], 0, 1.6, 0.6));
  s.aneis.push({ t: T('q4') + 0.6, ate: T('destaque') - 0.1, ret: I('total') });
  s.saltos.push({ t: T('destaque') - 0.05, ate: P[4].t0 - 0.2, ret: CARTAO_TOPO, larg: 940, cy: 720 });

  // 7) Entrou em quê? As quatro formas, uma a uma; um toque no valor abre "Recebido hoje" (cada pagamento)
  const tT2 = T('toque2') + 0.1, tFecha2 = P[5].t0 - 0.6;
  s.saltos.push({ t: T('pix') - 0.2, ate: tT2 - 0.3, ret: FORMAS, larg: 980, cy: 760,
    marcas: [{ t: T('pix'), ret: forma('pix'), fundo: true }, { t: T('dinheiro'), ret: forma('dinheiro'), fundo: true },
      { t: T('credito'), ret: forma('credito'), fundo: true }, { t: T('debito'), ret: forma('debito'), fundo: true }] });
  s.toques.push({ t: tT2, ...pt(I('total')) });
  s.paginas.push({ t: tT2 + 0.1, img: 'pg-recebido', d: 0.3 });
  s.rolagem.push({ t: tT2 + 0.4, y: R_PAINEL, d: 0.6 });
  s.cam.push(foco(tT2 + 0.4, LISTA_PAG, R_PAINEL, 1.25));
  s.saltos.push({ t: T('pagamento') - 0.25, ate: tFecha2 - 0.25, ret: LISTA_PAG, img: 'pg-recebido', larg: 660, cy: 905,
    marcas: [{ t: T('pagamento'), ret: folga(RE('forma1'), 4) }, { t: T('pagamento') + 0.2, ret: folga(RE('forma2'), 4) }] });
  s.toques.push({ t: tFecha2, ...pt(RE('fechar_btn')) });
  s.paginas.push({ t: tFecha2 + 0.1, img: 'pg-inicio', d: 0.25 });

  // 8) Falta receber? Logo abaixo do recebido: "A receber nas saídas de hoje"
  s.rolagem.push({ t: tFecha2 + 0.3, y: 0, d: 0.55 });
  s.cam.push(foco(tFecha2 + 0.3, I('receber'), 0, 1.6, 0.55));
  s.aneis.push({ t: T('abaixo'), ate: T('aberto') - 0.2, ret: I('receber') });
  s.saltos.push({ t: T('aberto') - 0.1, ate: P[6].t0 - 0.25, ret: RECEBER, larg: 900, cy: 740 });

  // 9) Tem algo para resolver? O bloco "Precisa de atenção" inteiro; janelas só nos cartões do check-out em atraso e da
  //    reserva vencida (o do conflito com o Airbnb fica ao fundo)
  s.rolagem.push({ t: P[6].t0 + 0.05, y: R_ATENCAO, d: 0.65 });
  s.cam.push({ t: P[6].t0 + 0.05, z: 1.0, fy: 2532 / 2, d: 0.65 });
  s.aneis.push({ t: T('q7') + 0.55, ate: T('atrasado') - 0.15, ret: BLOCO_ATENCAO });
  s.saltos.push({ t: T('atrasado') - 0.05, ate: fecho.t0 - 0.3, ret: folga(I('atraso'), 6), larg: 900, cy: 640, cor: 'ambar' });
  s.saltos.push({ t: T('separado') - 0.75, ate: fecho.t0 - 0.3, ret: folga(I('vencida'), 6), larg: 900, cy: 1085, cor: 'ambar', fundo: false });

  // 10) Fecho: volta ao topo, a câmera se afasta, os selinhos cercam o celular
  s.rolagem.push({ t: fecho.t0 - 0.1, y: 0, d: 0.6 });
  s.cam.push({ t: fecho.t0 - 0.1, z: 0.8, fy: 2532 / 2, d: 0.65 });

  // ordem no tempo (o motor percorre as chaves em sequência)
  ['paginas', 'rolagem', 'cam', 'aneis', 'toques', 'saltos'].forEach((k) => s[k].sort((a, b) => a.t - b.t));
  s.saltos.forEach((j) => { j.ate = Math.min(j.ate, s.t1 - 0.5); });

  // ---- legenda: páginas curtas (quebra na pontuação; nunca mais que 2 linhas), sem a frase do gancho, sem as perguntas
  //      e sem o fecho (estão escritos grandes na tela)
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
  const comLegenda = LN.frases.filter((f) => !['g1', 'cta', 'cta2'].includes(f.id)).map((f) => ({ ...f, palavras: f.palavras.filter((w) => !w.pergunta) }));
  comLegenda.forEach((f, i, arr) => {
    const pgs = parte(f.palavras), nx = arr[i + 1], fim = f.palavras[f.palavras.length - 1].t1;
    const prox = nx ? nx.palavras[0].t0 : 1e9;
    pgs.forEach((pg, k) => legenda.push({ t0: pg[0].t0 - 0.06, t1: k < pgs.length - 1 ? pgs[k + 1][0].t0 - 0.06 : Math.min(prox - 0.06, fim + 1.0, F.cta.t0 - 0.4),
      palavras: pg.map((w) => ({ w: w.w, t: w.t0, chave: w.chave })) }));
  });

  return { duracao: LN.duracao, gancho, titulo, fecho, perguntas: P, telas: [s], legenda };
};
