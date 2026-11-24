#!/usr/bin/env node
/*
 * Episódio 5 (A pousada num olhar): capturas finais da tela Início da Demo, no celular, 390×844 a 3x.
 *   node scripts/capturar.cjs   -> telas/*.png + telas/alvos.json + telas/conferencia.json
 *
 * O vídeo não troca de tela: a tela Início ROLA dentro do celular. Por isso, além das capturas do celular (vp-*, 1170×2532),
 * cada estado é capturado como PÁGINA INTEIRA (pg-*, 1170 × altura da página), sem a barra de baixo (que é fixa). No vídeo,
 * a página corre por baixo do cabeçalho e da barra de baixo, que vêm da captura do celular no topo (vp-inicio).
 * - Estados: pg-inicio (o Início), pg-hospedados (painel "Hospedados agora" aberto) e pg-recebido (painel "Recebido hoje").
 * - Os operadores do painel "Recebido hoje" levam os nomes do episódio 2: João Caixa → João Pereira, Mariana Recepção → Mariana Costa.
 * - Somem (visibility: hidden, sem mudar posição): o selo "Demonstração", a data do cabeçalho e "Quero usar".
 * - Antes de salvar cada captura: o texto visível não pode ter nada proibido nem aviso do app ("com sucesso").
 * - Os números têm de ser os do levantamento (aprovacao/levantamento/levantamento.json); se mudarem, o script para.
 * - O ponteiro sai da tela antes de cada captura (nenhum botão com cor de "mouse em cima").
 * - Conferência da montagem: a página recortada na rolagem de cada vp-* + cabeçalho + barra = a captura do celular.
 * Medidas (alvos.json): px da PÁGINA (3x) para pg-*, px do celular para vp-*.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = path.join(__dirname, '..', 'telas');
const TROCAS = [['João Caixa', 'João Pereira'], ['Mariana Recepção', 'Mariana Costa']];   // os mesmos nomes do episódio 2
const PROIBIDO = [/Jo[aã]o Caixa/, /Mariana Recep/, /fazlodigital/i, /\bDemo\b/, /Demonstra/i, /senha/i, /c[oó]digo/i, /token/i, /Quero usar/, /\.ics\b/i, /ical/i, /https?:\/\//i, /@/,
  /não consegue ler/i, /Confira o link/i, /não lê o calendário/i, /Confira se o link/i, /com sucesso/i];
// os números do levantamento (24/11/2026): se a Demo mudar, para
const ESPERADO = [
  ['R$ 1.525,00', /R\$ 1\.525,00\n+PIX\nR\$ 900,00\nDinheiro\nR\$ 125,00\nCrédito\nR\$ 380,00\nDébito\nR\$ 120,00/],
  ['A receber 0,00 · saídas quitadas', /A receber nas saídas de hoje\nR\$ 0,00\n· saídas quitadas/],
  ['Hospedados 10', /Hospedados\n10\nhóspedes/], ['Chegadas 2 · 1 concluída', /Chegadas\n2\n1 concluída/], ['Saídas 2 · 1 concluída', /Saídas\n2\n1 concluída/],
  ['Saídas de hoje', /Saídas de hoje\n1 de 2 concluídas\nC\nCarlos\nBica D’Água 02 · saída às 10:15\nConcluído\nB\nBeatriz\nBica D’Água 03 · saída até 12:00\nsaldo quitado\nCheck-out/],
  ['Chegadas de hoje', /Chegadas de hoje\n2\nThiago Oliveira\nBica D’Água 04 · entrada às 14:30\nConcluído\nHelena Duarte\nIpê 08 · entrada a partir de 14:00 · 2 hóspedes\na receber R\$ 900,00\nFazer check-in/],
  ['Precisa de atenção 4', /Precisa de atenção\n4\n+Check-out em atraso\n+Lucas Martins · Chalé de Pedra 06/],
  ['Reserva vencida', /Reserva vencida sem check-in\n+Rafael Teixeira · Chalé de Pedra 05/], ['Ver todos (4)', /Ver todos \(4\)/],
];
const ESP_PAINEL = { hospedados: [/Hospedados agora\n+10 hóspedes em 5 hospedagens/, /Ana Julia Costa[\s\S]*Thiago Oliveira[\s\S]*Beatriz Nogueira[\s\S]*Lucas Martins[\s\S]*Patrícia Ribeiro/],
  recebido: [/Recebido hoje\n+5 pagamentos/, /Forma de pagamento: DINHEIRO[\s\S]*R\$ 85,00[\s\S]*Forma de pagamento: PIX[\s\S]*R\$ 900,00[\s\S]*CARTÃO DE CRÉDITO[\s\S]*R\$ 380,00[\s\S]*CARTÃO DE DÉBITO[\s\S]*R\$ 120,00[\s\S]*DINHEIRO[\s\S]*R\$ 40,00/] };
function preparar(TROCAS) {
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) { let v = n.nodeValue; for (const [a, b] of TROCAS) v = v.split(a).join(b); if (v !== n.nodeValue) n.nodeValue = v; }
  const alvos = [...document.querySelectorAll('body *')].filter((e) => {
    const t = (e.innerText || '').trim();
    return (e.children.length <= 3 && /^(Demonstração(Demo)?|Quero usar|Quero usar na minha pousada)$/.test(t)) ||
      /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)(-feira)?, \d+ de \w+$/.test(t) || /^FAZLO Hospeda · v[\d.]/.test(t);
  });
  alvos.forEach((e) => { e.style.visibility = 'hidden'; });
  return alvos.length;
}
// retângulos em px da PÁGINA (3x): [chave, texto | '*', {sobe, exato, n, raiz (seletor de botão por nome), botao}]
function medir(lista) {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const out = {};
  for (const [k, texto, o = {}] of lista) {
    let e = null;
    if (o.botao) e = [...document.querySelectorAll('button')].filter(vis).find((b) => o.botao.test(norm(b.innerText)) || o.botao.test(b.getAttribute('aria-label') || ''));
    else {
      const cands = [...document.querySelectorAll('body *')].filter((x) => vis(x) && (o.exato ? norm(x.innerText) === texto : norm(x.innerText).startsWith(texto)));
      cands.sort((a, b) => norm(a.innerText).length - norm(b.innerText).length || a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const menor = cands.filter((x) => norm(x.innerText).length === norm(cands[0] && cands[0].innerText).length);
      e = menor[o.n || 0];
    }
    if (!e) { out[k] = null; continue; }
    for (let i = 0; i < (o.sobe || 0); i++) e = e.parentElement;
    const r = e.getBoundingClientRect(); out[k] = [r.left, r.top + scrollY, r.right, r.bottom + scrollY].map((v) => Math.round(v * 3));
  }
  return out;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  const CONF = { telas: {}, numeros: {}, montagem: {} }, ALVOS = {};
  const espera = (ms = 900) => pag.waitForTimeout(ms);
  const para = async (msg) => { console.error('PARADO: ' + msg); await nav.close(); process.exit(1); };
  const confere = async (nome) => {
    await pag.mouse.move(1, 1); await espera(250);               // o ponteiro fora da tela: nenhum botão com cara de "passando o mouse"
    const esc = await pag.evaluate(preparar, TROCAS); await espera(150);
    const texto = await pag.evaluate(() => document.body.innerText);
    const achados = PROIBIDO.filter((re) => re.test(texto)).map(String);
    if (achados.length) await para(`${nome}: ${achados.join(', ')}`);
    return { esc, texto };
  };
  const vp = async (nome) => {                                   // captura do celular (1170×2532)
    await espera(600); const { esc } = await confere(nome);
    await pag.screenshot({ path: path.join(OUT, nome + '.png') });
    CONF.telas[nome] = { tipo: 'celular', escondidos: esc, proibidos: 0, aviso_na_tela: 0, rolagem: await pag.evaluate(() => Math.round(scrollY * 3)) };
    console.log('ok', nome, CONF.telas[nome].rolagem);
  };
  const pg = async (nome, alvos) => {                            // página inteira, sem a barra de baixo (fixa)
    await espera(600); const y0 = await pag.evaluate(() => scrollY); const { esc } = await confere(nome);
    ALVOS[nome] = await pag.evaluate(medir, alvos);
    await pag.evaluate(() => { document.querySelector('nav.fixed').style.visibility = 'hidden'; });
    await pag.screenshot({ path: path.join(OUT, nome + '.png'), fullPage: true });
    await pag.evaluate((y) => { document.querySelector('nav.fixed').style.visibility = ''; scrollTo(0, y); }, y0);
    const falta = Object.entries(ALVOS[nome]).filter(([, v]) => !v).map(([k]) => k);
    if (falta.length) await para(`${nome}: sem medida: ${falta.join(', ')}`);
    CONF.telas[nome] = { tipo: 'pagina', escondidos: esc, proibidos: 0, aviso_na_tela: 0, altura: await pag.evaluate(() => Math.round(document.documentElement.scrollHeight * 3)) };
    console.log('ok', nome, CONF.telas[nome].altura);
  };
  const rolaAte = (txt, folga) => pag.evaluate(([t, f]) => {
    const h = [...document.querySelectorAll('h1,h2,h3,h4,p,span,div')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === t && e.getClientRects().length).shift();
    window.scrollBy(0, h.getBoundingClientRect().top - f);
  }, [txt, folga]);
  for (let i = 0; ; i++) {
    try { await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle', timeout: 45000 }); await pag.getByText('Entrar na demonstração').click({ timeout: 20000 }); break; }
    catch (e) { if (i >= 2) throw e; console.log('  nova tentativa de abrir a Demo'); }
  }
  await espera(2500); await pag.evaluate(() => scrollTo(0, 0));

  // números: iguais aos do levantamento
  const t0 = (await pag.evaluate(() => document.body.innerText)).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
  for (const [k, re] of ESPERADO) { const ok = re.test(t0); CONF.numeros[k] = ok; if (!ok) await para(`o número mudou em relação ao levantamento: ${k}`); }

  const BTN = (re) => ({ botao: re });
  // O INÍCIO: página inteira e o celular no topo (o cabeçalho e a barra de baixo saem daqui)
  await vp('vp-inicio');
  ALVOS['vp-inicio'] = await pag.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map((v) => Math.round(v * 3)); };
    return { cabecalho: r(document.querySelector('div.sticky')), barra: r(document.querySelector('nav.fixed')),
      inicio: r([...document.querySelectorAll('nav.fixed button')].find((b) => b.innerText.trim() === 'Início')) };
  });
  await pg('pg-inicio', [
    ['titulo', 'Hoje na pousada', { exato: true }], ['cartao', '*', BTN(/^Ver o que foi recebido hoje/)], ['recebido_rot', 'Recebido hoje', { exato: true }],
    ['total', 'R$ 1.525,00', { exato: true }], ['caixa', 'Caixa aberto desde', {}],
    ['pix', 'PIX R$ 900,00', { exato: true }], ['dinheiro', 'Dinheiro R$ 125,00', { exato: true }], ['credito', 'Crédito R$ 380,00', { exato: true }], ['debito', 'Débito R$ 120,00', { exato: true }],
    ['receber', '*', BTN(/^A receber nas saídas de hoje/)],
    ['hospedados', '*', BTN(/^Hospedados/)], ['chegadas', '*', BTN(/^Chegadas 2/)], ['saidas', '*', BTN(/^Saídas 2/)],
    ['atencao_tit', 'Precisa de atenção', { exato: true }], ['atencao_n', 'Precisa de atenção 4', { exato: true }],
    ['atraso', 'Check-out em atraso Lucas Martins', { sobe: 0 }], ['conflito', 'Conflito com o Airbnb Chalé', {}], ['vencida', 'Reserva vencida sem check-in Rafael', {}],
    ['vertodos', '*', BTN(/^Ver todos/)],
    ['saidas_tit', 'Saídas de hoje', { exato: true }], ['saidas_bloco', 'Saídas de hoje 1 de 2 concluídas C Carlos', {}],
    ['carlos', 'C Carlos Bica D’Água 02', {}], ['beatriz', 'B Beatriz Bica D’Água 03', {}],
    ['h_carlos', '10:15', { exato: true }], ['h_beatriz', '12:00', { exato: true }],
    ['chegadas_tit', 'Chegadas de hoje', { exato: true }], ['chegadas_bloco', 'Chegadas de hoje 2 Thiago Oliveira', {}],
    ['thiago', 'Thiago Oliveira Bica D’Água 04', {}], ['helena', 'Helena Duarte Ipê 08', {}],
    ['thiago_ok', '*', BTN(/^Concluído: abrir a hospedagem de Thiago/)], ['helena_checkin', 'Fazer check-in', { exato: true }],
    ['carlos_ok', '*', BTN(/^Concluído: ver ficha e recibo de Carlos/)], ['beatriz_btn', '*', BTN(/^Fazer check-out de Beatriz/)],
  ]);
  // as rolagens usadas no vídeo, no celular (para conferir a montagem e o OCR)
  await rolaAte('Saídas de hoje', 90); await vp('vp-fim');
  await pag.evaluate(() => scrollTo(0, 0)); await rolaAte('Precisa de atenção', 120); await vp('vp-atencao');
  await pag.evaluate(() => scrollTo(0, 0)); await espera(300);

  // PAINEL "Hospedados agora": um toque no cartão Hospedados (a página rola sozinha até o painel)
  await pag.getByRole('button', { name: /^Hospedados/ }).first().click(); await espera(1300);
  let tx = await pag.evaluate(() => document.body.innerText);
  for (const re of ESP_PAINEL.hospedados) if (!re.test(tx.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n'))) await para('painel Hospedados mudou: ' + re);
  await vp('vp-hospedados');
  await pg('pg-hospedados', [['painel', 'Hospedados agora 10 hóspedes em 5 hospedagens Ana', {}], ['painel_tit', 'Hospedados agora 10 hóspedes em 5 hospedagens', { exato: true }],
    ['fechar', '*', BTN(/fechar/i)], ['lista', 'Ana Julia Costa Bica D’Água 01', { sobe: 1 }],
    ['ana', 'Ana Julia Costa Bica D’Água 01', {}], ['patricia', 'Patrícia Ribeiro Ipê 09', {}], ['hospedados', '*', BTN(/^Hospedados/)]]);
  // fecha o painel (×) e volta ao topo
  ALVOS['pg-hospedados'].fechar_btn = await pag.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /fechar/i.test(x.getAttribute('aria-label') || '') && x.getClientRects().length); const r = b.getBoundingClientRect(); return [r.left, r.top + scrollY, r.right, r.bottom + scrollY].map((v) => Math.round(v * 3)); });
  await pag.locator('button[aria-label*="echar"]').filter({ visible: true }).first().click(); await espera(800); await pag.evaluate(() => scrollTo(0, 0)); await espera(300);

  // PAINEL "Recebido hoje": um toque no valor recebido
  await pag.getByRole('button', { name: /Ver o que foi recebido hoje/ }).first().click(); await espera(1300);
  tx = await pag.evaluate(() => document.body.innerText);
  for (const re of ESP_PAINEL.recebido) if (!re.test(tx.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n'))) await para('painel Recebido mudou: ' + re);
  await vp('vp-recebido');
  await pg('pg-recebido', [['painel_tit', 'Recebido hoje 5 pagamentos', { exato: true }], ['fechar', '*', BTN(/fechar/i)],
    ['pag1', 'Carlos Henrique Silva FHZ-000129 Forma de pagamento: DINHEIRO', {}], ['pag2', 'Thiago Oliveira FHZ-000131 Forma de pagamento: PIX', {}],
    ['forma1', 'Forma de pagamento: DINHEIRO', { exato: true }], ['forma2', 'Forma de pagamento: PIX', { exato: true }], ['cartao', '*', BTN(/^Ver o que foi recebido hoje/)]]);
  ALVOS['pg-recebido'].fechar_btn = await pag.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /fechar/i.test(x.getAttribute('aria-label') || '') && x.getClientRects().length); const r = b.getBoundingClientRect(); return [r.left, r.top + scrollY, r.right, r.bottom + scrollY].map((v) => Math.round(v * 3)); });

  fs.writeFileSync(path.join(OUT, 'alvos.json'), JSON.stringify(ALVOS, null, 1));
  fs.writeFileSync(path.join(OUT, 'conferencia.json'), JSON.stringify({ data: new Date().toISOString(), proibidos: PROIBIDO.map(String), ...CONF }, null, 1));
  await nav.close();
})();
