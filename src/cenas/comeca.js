/* Como começa.
 * 1) "Você não precisa cadastrar nada."           → tipografia (frase na tela, fora da legenda)
 * 2) "A equipe FAZLO configura a sua pousada: …"   → telas reais 13 → 14 (só os itens 2 a 6 existem no recorte)
 * 3) "Você recebe o convite por e-mail, cria a sua senha e já começa a usar." → três passos
 * 4) "E qualquer dúvida, é só chamar a gente no WhatsApp." → conversa
 */
(window.CENAS = window.CENAS || []).push(function (raizCenas) {
  const { h, s, T, TF, A, som, COR, grupo, ico, txt, chip, desenhar, estala, entra, sai } = B;
  const el = h('div', { class: 'cena', id: 'c-comeca' });
  raizCenas.appendChild(el);
  const c1 = (w, n) => T('comeca1', w, n), c2 = (w, n) => T('comeca2', w, n);
  const t0 = A('comeca1').ini, tTeste = A('teste').ini;
  M.cena(el, t0 - 0.12, tTeste + 0.05);

  /* ================= 1 · tipografia ================= */
  const gT = grupo(el, 540, 640);
  const linhas = [
    [['Você', 'Você'], ['não', 'não'], ['precisa', 'precisa']],
    [['cadastrar', 'cadastrar'], ['nada.', 'nada']],
  ];
  linhas.forEach((ln, li) => {
    const cx = h('div', { style: `position:absolute;left:0;top:${li === 0 ? 470 : 590}px;width:1080px;height:${li === 0 ? 120 : 170}px;display:flex;align-items:center;justify-content:center;gap:${li === 0 ? 26 : 30}px;font-weight:${li === 0 ? 700 : 800};font-size:${li === 0 ? 96 : 136}px;letter-spacing:-0.03em;` });
    gT.dom.appendChild(cx);
    ln.forEach(([texto, chave]) => {
      const e = h('span', { class: 'pal', text: texto, style: chave === 'nada' ? `color:${COR.limao}` : '' });
      cx.appendChild(e);
      const o = M.el(e, { o: 0, fluxo: true });
      const t = c1(chave) - 0.04;
      M.para(o, t, 0.12, { o: [0, 1] }, 'out2');
      M.para(o, t, 0.42, { y: [46, 0], s: [0.7, 1] }, 'back');
      if (chave === 'nada') { M.para(o, t + 0.42, 0.16, { s: 1.1 }, 'out2'); M.para(o, t + 0.58, 0.3, { s: 1 }, 'io2'); som(t, 'impacto', { forca: 0.35 }); } else som(t, 'pop', { forca: 0.45 });
    });
  });
  // campos de cadastro vazios… que você não vai precisar preencher
  const campos = [0, 1, 2].map((k) => {
    const y = 868 + k * 112;
    const g = grupo(el, 540, y + 44, { o: 0 });
    g.dom.appendChild(h('div', { style: `position:absolute;left:210px;top:${y}px;width:660px;height:88px;border-radius:22px;box-shadow:inset 0 0 0 3px #45453F;` }));
    g.dom.appendChild(h('div', { style: `position:absolute;left:240px;top:${y + 36}px;width:${[250, 180, 320][k]}px;height:16px;border-radius:8px;background:#33332F;` }));
    const risco = h('div', { style: `position:absolute;left:190px;top:${y + 40}px;width:700px;height:8px;border-radius:4px;background:${COR.limao};transform-origin:0 50%;` });
    g.dom.appendChild(risco);
    const ro = M.el(risco, { sx: 0, o: 0 });
    const tE = t0 - 0.02 + k * 0.16;
    M.para(g, tE, 0.16, { o: [0, 1] }, 'out2');
    M.para(g, tE, 0.5, { y: [50, 0] }, 'out4');
    const tR = c1('nada') + 0.04 + k * 0.09;
    M.por(ro, tR, { o: 1 });
    M.para(ro, tR, 0.3, { sx: [0, 1] }, 'out4');
    som(tR, 'tick', { forca: 0.6 });
    return g;
  });
  M.vivo((t) => { campos.forEach((g, k) => { if (g.v.o > 0.01) M.mais(g.dom, `translate(0,${M.r3(Math.sin(t * 2.2 + k * 1.3) * 5)}px)`); }); });
  M.vivo((t) => { if (gT.v.o > 0.01) M.mais(gT.dom, `scale(${M.r3(1 + 0.012 * Math.sin((t - t0) * 2.6))})`); });

  /* ================= 2 · telas 13 → 14 ================= */
  const tP = TF('comeca1', 'nada') + 0.1;
  sai(gT, tP - 0.06, { dy: -140, dur: 0.36 });
  campos.forEach((g, k) => sai(g, tP - 0.04 + k * 0.03, { dy: 120, dur: 0.3 }));
  som(tP + 0.2, 'whoosh', { dur: 0.6, forca: 0.6 });

  const f = Aparelho(el, { tipo: 'celular' });
  f.pagina('13', { tipo: 'rolagem', corpo: 'telas/13.png', alt: 1473, cab: 'telas/13-cab.png' });
  f.pagina('14', { tipo: 'rolagem', corpo: 'telas/14-itens.png', alt: 538, topo: 72, cab: 'telas/13-cab.png', fundo: '#FFFFFF' });
  // câmera fixa nas duas telas: o topo do conteúdo (y 72 da tela) fica em y 176 do palco
  const CAM = { cx: 195, cy: 342, s: 2.2, ay: 770, ax: 540 };
  f.trocar(tP - 0.2, '13', 'corte');
  M.por(f.cam, tP, Object.assign({ o: 1, dy: 1500 }, CAM));
  f.visivel(tP);
  M.para(f.cam, tP, 0.66, { dy: 0 }, 'out4');
  f.foco(c1('equipe') - 0.1, [18, 92, 220, 40], { raio: 10, m: 4 });               // "Nova pousada"
  f.semFoco(c1('configura') - 0.1, 0.2);
  f.rolar('13', c1('configura') - 0.08, 0.9, 262);                                   // a equipe preenchendo
  f.foco(c1('pousada') - 0.04, [26, 82, 310, 52], { raio: 10, m: 3 });               // "Acomodações cadastradas"
  const t14 = c1('acomodações') + 0.3;
  f.semFoco(t14 - 0.12, 0.12);
  f.trocar(t14, '14', 'empurra');
  som(t14 + 0.2, 'deslize', { dur: 0.45, forca: 0.5 });
  f.foco(t14 + 0.28, [30, 268, 330, 142], { raio: 14, m: 2 });                       // 4. Acomodações e tarifas
  f.pulso(c1('tarifas') + 0.02);
  f.foco(c1('produtos') - 0.12, [30, 418, 330, 78], { raio: 14, m: 2 });             // 5. Produtos da comanda
  f.foco(c1('usuários') - 0.12, [30, 506, 330, 76], { raio: 14, m: 2 });             // 6. Usuários iniciais
  // sai sem afastar a câmera (nada fora do recorte entra em quadro)
  const tX = A('comeca2').ini - 0.42;
  f.semFoco(tX - 0.1, 0.2);
  f.saiu(tX);
  M.para(f.cam, tX, 0.46, { dy: 1500 }, 'in3');
  M.por(f.cam, tX + 0.5, { o: 0 });
  som(tX + 0.2, 'whoosh', { dur: 0.6, forca: 0.6 });

  /* ================= 3 · três passos ================= */
  const gS = grupo(el, 540, 700, { o: 0 });
  M.por(gS, A('comeca2').ini + 0.04, { o: 1 });
  const PY = [404, 700, 996], PX = 196;
  const sv = s('svg', { viewBox: '0 0 1080 1920', width: 1080, height: 1920, style: 'position:absolute;left:0;top:0;overflow:visible', fill: 'none', 'stroke-linecap': 'round' });
  gS.dom.appendChild(sv);
  const trilho = (y1, y2, cor) => { const p = s('path', { d: `M${PX} ${y1}V${y2}`, stroke: cor, 'stroke-width': 8, pathLength: 1 }); sv.appendChild(p); return p; };
  const fios = [[PY[0] + 96, PY[1] - 96], [PY[1] + 96, PY[2] - 96]].map(([a, b]) => { trilho(a, b, '#33332F'); const p = trilho(a, b, COR.limao); p.style.strokeDasharray = '1'; return M.el(p, { tr: 0, o: 0, fluxo: true }); });
  const passos = [
    { ic: 'email', titulo: 'Convite por e-mail', t: c2('convite') - 0.12 },
    { ic: 'cadeado', titulo: 'Crie a sua senha', t: c2('cria') - 0.1 },
    { ic: 'check', titulo: 'Comece a usar', t: c2('já') - 0.1 },
  ].map((p, k) => {
    const y = PY[k];
    const g = grupo(gS.dom, 540, y, { o: 0 });
    const cart = h('div', { class: 'cartao', style: `position:absolute;left:90px;top:${y - 108}px;width:900px;height:216px;` });
    g.dom.appendChild(cart);
    const disco = h('div', { style: `position:absolute;left:${PX - 76}px;top:${y - 76}px;width:152px;height:152px;border-radius:50%;background:${COR.grafite2};box-shadow:inset 0 0 0 3px #45453F;display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;` });
    const num = h('span', { class: 'mono', text: String(k + 1), style: `font-weight:700;font-size:64px;color:${COR.cinza};` });
    disco.appendChild(num);
    g.dom.appendChild(disco);
    const discoOn = h('div', { style: `position:absolute;left:${PX - 76}px;top:${y - 76}px;width:152px;height:152px;border-radius:50%;background:${COR.limao};display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;` }, [B.icone(p.ic, 82, COR.tinta, 2.1)]);
    g.dom.appendChild(discoOn);
    const on = M.el(discoOn, { o: 0, s: 0.3 });
    const tit = txt(g.dom, 318, k === 1 ? y - 24 : y, p.titulo, { tam: 56, peso: 700, alinh: 'left', larg: 640, cor: COR.cinza });
    // entra apagado, espera a vez
    const tE = A('comeca2').ini + 0.08 + k * 0.1;
    M.para(g, tE, 0.2, { o: [0, 0.42] }, 'out2');
    M.para(g, tE, 0.55, { x: [220, 0] }, 'out4');
    som(tE + 0.1, 'pop', { forca: 0.4 });
    // acende na palavra
    M.para(g, p.t, 0.2, { o: 1 }, 'out2');
    M.para(g, p.t, 0.16, { s: 1.045 }, 'out2'); M.para(g, p.t + 0.16, 0.32, { s: 1 }, 'io2');
    estala(on, p.t, { dur: 0.46, s0: 0.3, ease: 'back2' });
    desenhar(discoOn.querySelector('svg'), p.t + 0.08, 0.5);
    M.vivo((t) => { tit.dom.style.color = t >= p.t ? COR.branco : COR.cinza; });
    som(p.t + 0.02, k === 2 ? 'check' : 'pop', { forca: 0.8 });
    if (k > 0) { M.por(fios[k - 1], p.t - 0.3, { o: 1 }); M.para(fios[k - 1], p.t - 0.3, 0.34, { tr: [0, 1] }, 'io3'); }
    return Object.assign(p, { g, y, on, onDom: discoOn });
  });
  // detalhes vivos
  // 1: aviso de mensagem nova
  {
    const p = passos[0];
    const b = h('div', { class: 'mono', text: '1', style: `position:absolute;left:${PX + 34}px;top:${p.y - 84}px;width:52px;height:52px;border-radius:50%;background:${COR.branco};color:${COR.tinta};font-weight:700;font-size:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px ${COR.grafite};transform-origin:50% 50%;` });
    p.g.dom.appendChild(b);
    const bo = M.el(b, { o: 0, s: 0.2 });
    estala(bo, c2('e-mail') - 0.02, { dur: 0.4, s0: 0.2, ease: 'back2' });
    som(c2('e-mail'), 'tick', { forca: 0.7 });
  }
  // 2: a senha sendo digitada
  {
    const p = passos[1];
    const cx = h('div', { style: `position:absolute;left:318px;top:${p.y + 34}px;width:420px;height:44px;display:flex;gap:16px;align-items:center;` });
    p.g.dom.appendChild(cx);
    const tS = c2('senha') - 0.05;
    for (let q = 0; q < 8; q++) {
      const pt = h('div', { style: `width:22px;height:22px;border-radius:50%;background:${COR.limao};transform-origin:50% 50%;` });
      cx.appendChild(pt);
      const po = M.el(pt, { o: 0, s: 0.2, fluxo: true });
      estala(po, tS + q * 0.07, { dur: 0.22, s0: 0.2 });
    }
    som(tS, 'teclas', { dur: 0.6, forca: 0.7 });
  }
  M.vivo((t) => { if (gS.v.o > 0.01) passos.forEach((p, k) => { if (t >= p.t && p.on.v.o > 0.01) M.mais(p.onDom, `scale(${M.r3(1 + 0.03 * Math.sin((t - p.t) * 3.4))})`); }); });

  /* ================= 4 · dúvida? chama a gente no WhatsApp ================= */
  const tQ = c2('E') - 0.2;
  // os três passos saem para dar lugar à conversa
  M.para(gS, tQ, 0.4, { y: -260, s: 0.9 }, 'in3');
  M.para(gS, tQ + 0.12, 0.28, { o: 0 }, 'in2');
  som(tQ + 0.25, 'whoosh', { dur: 0.5, forca: 0.45 });
  const gQ = grupo(el, 540, 760);
  // balão da pousada (dúvida)
  const b1 = h('div', { style: `position:absolute;left:96px;top:330px;width:520px;height:290px;border-radius:56px 56px 56px 12px;background:${COR.branco};display:flex;align-items:center;justify-content:center;transform-origin:0% 100%;` }, [B.icone('interrogacao', 170, COR.tinta, 2.2)]);
  gQ.dom.appendChild(b1);
  const b1o = M.el(b1, { o: 0, s: 0.2 });
  estala(b1o, c2('dúvida') - 0.1, { dur: 0.5, s0: 0.2 });
  desenhar(b1.querySelector('svg'), c2('dúvida'), 0.5);
  som(c2('dúvida') - 0.06, 'pop', { forca: 0.8, pan: -0.3 });
  // balão da equipe (resposta): digitando… e resolve em check
  const b2 = h('div', { style: `position:absolute;left:444px;top:690px;width:540px;height:290px;border-radius:56px 56px 12px 56px;background:${COR.limao};display:flex;align-items:center;justify-content:center;gap:36px;transform-origin:100% 100%;` });
  gQ.dom.appendChild(b2);
  const b2o = M.el(b2, { o: 0, s: 0.2 });
  const tR = c2('chamar') - 0.1;
  estala(b2o, tR, { dur: 0.5, s0: 0.2 });
  som(tR + 0.04, 'pop', { forca: 0.8, pan: 0.3 });
  const tOk = c2('WhatsApp') + 0.1;
  const pontos = [0, 1, 2].map((q) => { const p = h('div', { style: `width:54px;height:54px;border-radius:50%;background:${COR.tinta};transform-origin:50% 50%;` }); b2.appendChild(p); return M.el(p, { fluxo: true }); });
  pontos.forEach((po) => M.para(po, tOk - 0.1, 0.16, { o: 0, s: 0.3 }, 'in2'));
  M.vivo((t) => { pontos.forEach((po, q) => { if (t < tOk - 0.1 && b2o.v.o > 0.01) M.mais(b2.children[q], `translateY(${M.r3(-18 * Math.max(0, Math.sin(t * 7.5 - q * 0.9)))}px)`); }); });
  som(tR + 0.3, 'teclas', { dur: tOk - tR - 0.5, forca: 0.6, pan: 0.3 });
  const ok = h('div', { style: 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' }, [B.icone('check', 170, COR.tinta, 2.6)]);
  b2.appendChild(ok);
  const oko = M.el(ok, { o: 0, s: 0.4 });
  estala(oko, tOk, { dur: 0.42, s0: 0.4, ease: 'back2' });
  desenhar(ok.querySelector('svg'), tOk + 0.04, 0.34);
  som(tOk + 0.05, 'check', { forca: 0.8 });
  // quem responde: a equipe FAZLO, no WhatsApp
  const eq = chip(gQ.dom, 714, 1062, 'Equipe FAZLO', { tipo: 'escuro', tam: 42, alt: 88, icone: 'pessoas' }, { o: 0 });
  entra(eq, c2('gente') - 0.1, { dy: 30, dur: 0.45 });
  const wa = chip(gQ.dom, 714, 1178, 'no WhatsApp', { tipo: 'limao', tam: 44, alt: 92, icone: 'conversa' }, { o: 0 });
  estala(wa, c2('WhatsApp') - 0.08, { dur: 0.45, s0: 0.4 });
  som(c2('WhatsApp') - 0.04, 'pop', { forca: 0.7, pan: 0.3 });
  M.vivo((t) => {
    if (b1o.v.o > 0.01) M.mais(b1, `translateY(${M.r3(Math.sin(t * 2.1) * 6)}px)`);
    if (b2o.v.o > 0.01) M.mais(b2, `translateY(${M.r3(Math.sin(t * 2.1 + 1.4) * 6)}px)`);
  });

  /* ================= saída ================= */
  const tS = tTeste - 0.36;
  sai(gS, tS, { dy: -120, dur: 0.3 });
  sai(gQ, tS + 0.03, { dy: -160, dur: 0.32, s1: 0.9 });
  som(tS + 0.18, 'whoosh', { dur: 0.5, forca: 0.5 });
});
