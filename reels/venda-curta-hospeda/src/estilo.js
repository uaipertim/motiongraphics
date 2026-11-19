/* Plano PROVISÓRIO só para os quadros de estilo (antes da voz). Os tempos definitivos vão sair da locução. */
window.PLANO_ESTILO = {
  duracao: 40,
  ganchos: [{ t0: 0, t1: 3.2 }],
  telas: [
    { img: 'calendario', t0: 3.2, t1: 12,
      cam: [{ t: 4.2, z: 1.8, fx: 640, fy: 1270, d: 0.7 }],
      aneis: [{ t: 5.0, ret: [723, 1223, 1017, 1319], ate: 6.2 }],
      saltos: [{ t: 6.3, ate: 9.5, ret: [723, 1223, 1017, 1319], larg: 700, cy: 520 }] },
    { img: 'inicio-conflito', t0: 12, t1: 22,
      cam: [{ t: 12.6, z: 1.6, fx: 585, fy: 1090, d: 0.7 }],
      aneis: [{ t: 13.4, ret: [48, 729, 1122, 1452], cor: 'ambar', ate: 14.6 }],
      saltos: [{ t: 14.7, ate: 19, ret: [48, 729, 1122, 1452], cor: 'ambar', larg: 960, cy: 720 }] },
    { img: 'caixa', t0: 22, t1: 32, estados: [{ t: 23.4, img: 'caixa-fechar-confere', d: 0.3 }],
      toques: [{ t: 23.2, x: 585, y: 966 }],
      cam: [{ t: 23.9, z: 1.75, fx: 585, fy: 1420, d: 0.6 }],
      aneis: [{ t: 24.4, ret: [60, 1596, 1110, 1788], ate: 25.5 }],
      saltos: [{ t: 25.6, ate: 29, ret: [60, 1104, 1110, 1296], img: 'caixa-fechar-confere', larg: 960, cy: 560 }] },
  ],
  legenda: [
    { t0: 0, t1: 3.2, palavras: [{ w: 'Vendeu', t: 0.2 }, { w: 'o', t: 0.5 }, { w: 'mesmo', t: 0.6 }, { w: 'chalé', t: 0.9, chave: true }, { w: 'duas', t: 1.3, chave: true }, { w: 'vezes?', t: 1.6, chave: true }] },
    { t0: 4, t1: 12, palavras: [{ w: 'e', t: 4.1 }, { w: 'traz', t: 4.3 }, { w: 'pra', t: 4.5 }, { w: 'cá', t: 4.6 }, { w: 'o', t: 4.8 }, { w: 'que', t: 4.9 }, { w: 'foi', t: 5.0 }, { w: 'vendido', t: 5.2, chave: true }, { w: 'lá,', t: 5.5, chave: true }, { w: 'já', t: 5.9 }, { w: 'bloqueado.', t: 6.1, chave: true }] },
    { t0: 13, t1: 21, palavras: [{ w: 'Se', t: 13.1 }, { w: 'uma', t: 13.3 }, { w: 'data', t: 13.5 }, { w: 'bater,', t: 13.8, chave: true }, { w: 'ele', t: 14.3 }, { w: 'avisa.', t: 14.5, chave: true }] },
    { t0: 23, t1: 32, palavras: [{ w: 'No', t: 23.1 }, { w: 'fim', t: 23.2 }, { w: 'do', t: 23.3 }, { w: 'dia,', t: 23.4 }, { w: 'o', t: 23.7 }, { w: 'caixa', t: 23.8, chave: true }, { w: 'fecha', t: 24.1 }, { w: 'conferido.', t: 24.4, chave: true }] },
  ],
};
