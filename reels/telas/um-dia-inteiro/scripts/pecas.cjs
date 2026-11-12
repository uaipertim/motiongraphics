#!/usr/bin/env node
/*
 * Extrai as PEÇAS das telas do FAZLO Hospeda (HTML autônomo do pacote) para o reel "Um dia inteiro da pousada".
 *
 *   node scripts/pecas.cjs            -> src/pecas/<id>.png + src/pecas.json
 *   node scripts/pecas.cjs r_livres   -> só as peças pedidas
 *
 * Cada HTML é aberto no Chromium (390 px no celular, 1280 px no computador) com deviceScaleFactor alto
 * e a peça é recortada pelo id do pacote (#card-*, #status-chip-*, #valor-*, #btn-*, #modal-*, .item-comanda…)
 * ou pela caixa do texto dela. As fontes Geist / Geist Mono vêm do pacote npm "geist" (src/fonts), no lugar
 * do Google Fonts, para o resultado não depender da rede.
 *
 * Para os valores que contam dígito a dígito, o valor é escondido no recorte (um "furo") e o pecas.json guarda
 * posição, fonte, cor e alinhamento: o motor escreve o mesmo valor por cima, com a mesma fonte, contando.
 * Também guarda o menor corpo de texto de cada peça (minFont, px CSS), que o QA usa para conferir os ≥ 40 px.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();

const ROOT = path.resolve(__dirname, '..');
const T = path.resolve(ROOT, '../_material/fazlo-hospeda-telas/telas');
const OUT = path.join(ROOT, 'src/pecas');
const FONTS = path.join(ROOT, 'src/fonts');
const only = process.argv.slice(2);

const FONT_CSS = `
@font-face{font-family:'Geist';src:url(https://fonts.local/Geist-Variable.woff2) format('woff2');font-weight:100 900;font-style:normal}
@font-face{font-family:'Geist Mono';src:url(https://fonts.local/GeistMono-Variable.woff2) format('woff2');font-weight:100 900;font-style:normal}`;

// ---------- especificação das peças ----------
// rect: expressão avaliada na página (helpers abaixo) que devolve {x,y,w,h} em px CSS
// hide: seletores escondidos (visibility:hidden) antes do recorte
// holes: valores que o motor reescreve contando (seletor do .valor)
// prep: JS rodado antes (por exemplo, a barra nova do calendário)
// r: raio dos cantos da peça no palco (px CSS); bg: cor de fundo da peça
const S = [];
const add = (id, file, o) => S.push({ id, file, dpr: 6, w: 390, ...o });

// GANCHO · 01-visao-geral (o painel do dia)
const VG = '01-visao-geral/tela.html';
add('g_recebido', VG, { rect: `pad(U(T('Recebido hoje'), R('#valor-recebido-hoje')), 12, 12)`, tile: `box('#valor-recebido-hoje')`, hide: ['#status-chip-caixa-aberto-desde-08-00'], holes: ['#valor-recebido-hoje'] });
add('g_hospedados', VG, { rect: `R(card('Hospedados'))`, tile: `card('Hospedados')` });
add('g_saidas', VG, { rect: `R(card('1 concluída'))`, tile: `card('1 concluída')` });
add('g_atencao', VG, { rect: `pad(U(R('#titulo-precisa-de-atencao'), R(sib('#titulo-precisa-de-atencao'))), 14, 10)`, fundo: '#F4F4F0', r: 14 });

// 1 RESERVA · calendário de 14 dias (computador) e nova reserva
const CAL = '02-calendario/tela-computador.html';
const BRUNO = `(() => { const a = [...document.querySelectorAll('#card-acomodacao a')].find(e => e.textContent.trim() === 'Bruna C.');
  const b = a.cloneNode(true); b.textContent = 'Bruno T.'; b.style.gridColumn = '21 / 27'; b.id = 'barra-bruno'; a.parentElement.appendChild(b); })()`;
add('r_cal_base', CAL, { w: 1280, dpr: 4, rect: `R('#card-acomodacao')`, tile: `document.querySelector('#card-acomodacao')`, hide: ['#card-acomodacao a'], bars: '#card-acomodacao a' });
for (let k = 0; k < 24; k++) add('r_bar' + String(k).padStart(2, '0'), CAL, { w: 1280, dpr: 4, opcional: `document.querySelectorAll('#card-acomodacao a').length > ${k}`, rect: `R(document.querySelectorAll('#card-acomodacao a')[${k}])`, r: 0, rel: 'r_cal_base' });
add('r_cal_bruno', CAL, { w: 1280, prep: BRUNO, rect: `R('#barra-bruno')`, tile: `document.querySelector('#barra-bruno')`, rel: 'r_cal_base' });
add('r_cal_dias', CAL, { w: 1280, rect: `diasRect(22, 25)`, fundo: '#FAFAF8', r: 12, rel: 'r_cal_base' });
add('r_cal_linha', CAL, { w: 1280, rect: `linhaRect('Quarto Bromélia', 22, 25)`, fundo: '#FFFFFF', r: 12, rel: 'r_cal_base' });
add('r_cal_quarto', CAL, { w: 1280, rect: `pad(U(T('Quarto Bromélia'), T('Quarto · 2 pessoas', 'Quarto Bromélia')), 14, 12)`, fundo: '#FFFFFF', r: 12 });
const NR1 = '03-nova-reserva/estados/01-datas-e-acomodacao.html', NR8 = '03-nova-reserva/estados/08-aviso-periodo-ocupado.html';
add('r_entrada', NR1, { rect: `R('#campo-entrada')`, fundo: '#FFFFFF', r: 0 });
add('r_saida', NR1, { rect: `R('#campo-saida')`, fundo: '#FFFFFF', r: 0 });
add('r_livres', NR1, { rect: `pad(lineOf('Livres no período'), 14, 10)`, fundo: '#FFFFFF', r: 12 });
add('r_lista', NR8, { rect: `R(par('#campo-item'))`, tile: `par('#campo-item')` });
add('r_brom_off', NR8, { rect: `inset(R('#campo-item-5'), 12, 0)`, fundo: '#FFFFFF', r: 14 });
add('r_brom_on', NR1, { rect: `inset(R('#campo-item-5'), 12, 0)`, fundo: '#F7F7F3', r: 14 });
add('r_aviso', NR8, { rect: `R('#aviso-periodo-ocupado')`, tile: `document.querySelector('#aviso-periodo-ocupado')` });

// 2 SINAL · 04-detalhe-reserva + 05-registrar-pagamento (sinal antes)
const PRE = '04-detalhe-reserva/estados/01-pre-reserva.html', CONF = '04-detalhe-reserva/estados/02-confirmada.html', SIN = '05-registrar-pagamento/estados/04-sinal-antes.html';
add('s_gustavo', PRE, { rect: `pad(U(T('Gustavo Ribeiro'), R('#status-chip-pre-reserva'), T('Chalé de Pedra 04', '#status-chip-pre-reserva'), T('sem sinal')), 16, 0, 16, 10)`, fundo: '#F4F4F0', r: 16 });
add('s_chip_pre', PRE, { dpr: 8, rect: `R('#status-chip-pre-reserva')`, tile: `document.querySelector('#status-chip-pre-reserva')`, chip: true });
add('s_chip_conf', CONF, { dpr: 8, rect: `R('#status-chip-confirmada')`, tile: `document.querySelector('#status-chip-confirmada')`, chip: true });
add('s_btn_registrar', PRE, { rect: `R('#btn-registrar-sinal')`, tile: `document.querySelector('#btn-registrar-sinal')`, btn: true });
add('s_campo_sinal', SIN, { rect: `R('#campo-sinal')`, holes: ['valorEm("#campo-sinal")'], fundo: '#FFFFFF', r: 0 });
add('s_depois', SIN, { rect: `R(par('#valor-chale-de-pedra-04', 2))`, tile: `par('#valor-chale-de-pedra-04', 2)` });
add('s_btn_confirmar', SIN, { rect: `R('#btn-registrar-sinal-e-confirmar')`, tile: `document.querySelector('#btn-registrar-sinal-e-confirmar')`, btn: true });
add('s_fernanda', CONF, { rect: `pad(U(T('Fernanda Lima'), R('#status-chip-confirmada'), T('Chalé Ipê', '#status-chip-confirmada'), T('sinal pago')), 16, 4)`, fundo: '#F4F4F0', r: 16 });
add('s_total', CONF, { rect: `rowOf('#valor-total-da-reserva', 0, 3)`, holes: ['#valor-total-da-reserva'], fundo: '#FFFFFF', r: 12 });
add('s_sinalpago', CONF, { rect: `rowOf('#valor-sinal-pago', 0, 3)`, holes: ['#valor-sinal-pago'], fundo: '#FFFFFF', r: 12 });
add('s_saldo', CONF, { rect: `pad(U(T('Saldo em aberto'), RT('#valor-saldo-em-aberto')), 18, 16)`, tile: `box('#valor-saldo-em-aberto')`, holes: ['#valor-saldo-em-aberto'] });

// 3 CHECK-IN · 06-check-in
const CI = '06-check-in/estados/01-modal-check-in.html', CIF = '06-check-in/estados/03-check-in-feito.html', ATV = '06-check-in/estados/04-hospedagens-ativas.html';
add('c_dados', CI, { rect: `pad(textUnion(box(T('Hóspede', '#modal-fazer-check-in').el)), 16, 14)`, tile: `box(T('Hóspede', '#modal-fazer-check-in').el)` });
add('c_btn', CI, { rect: `R('#btn-fazer-check-in-2')`, tile: `document.querySelector('#btn-fazer-check-in-2')`, btn: true });
add('c_chip_hosp', ATV, { dpr: 8, rect: `R('#status-chip-hospedada-3')`, tile: `document.querySelector('#status-chip-hospedada-3')`, chip: true });
add('c_feito', CIF, { rect: `pad(U(R('#titulo-check-in-feito'), T('Fernanda Lima · Chalé Ipê'), R(prevEl('#titulo-check-in-feito'))), 16, 12)`, fundo: '#FFFFFF', r: 14 });
add('c_recibo', CIF, { rect: `pad(U(T('Recibo de check-in'), T('FHZ-U6EKQE', 'Recibo de check-in'), T('12:00', 'Saída prevista')), 16, 14, 16, 6)`, tile: `box('#valor-total-da-reserva-2')` });
add('c_hospedagens', ATV, { rect: `pad(U(R('#titulo-hospedagens'), T('5 em andamento')), 14, 10)`, fundo: '#F4F4F0', r: 14 });
add('c_mariana', ATV, { rect: `pad(U(T('Mariana Costa', '#card-mariana-costa'), T('Suíte Mirante · 2 hóspedes'), R('#status-chip-hospedada-3')), 16, 14, 16, 6)`, tile: `document.querySelector('#card-mariana-costa')` });

// 4 COMANDA · 08-comanda (com itens)
const CMD = '08-comanda/estados/02-com-itens.html';
add('m_nome', CMD, { rect: `pad(U(R('#titulo-mariana-costa'), T('Suíte Mirante · Hospedagem')), 14, 10)`, fundo: '#F4F4F0', r: 14 });
add('m_chip', CMD, { dpr: 8, rect: `R('#status-chip-aberta')`, tile: `document.querySelector('#status-chip-aberta')`, chip: true });
add('m_total', CMD, { rect: `rowOf('#valor-total', 0, 3)`, holes: ['#valor-total'], fundo: '#FFFFFF', r: 14 });
for (const [i, v] of [[1, 'caipirinha'], [2, 'agua-sem-gas'], [3, 'cerveja-long-neck'], [4, 'risoto-de-cogumelos'], [5, 'suco-de-laranja']]) add('m_item' + i, CMD, { rect: `rowOf('#valor-${v}', 0, 0)`, fundo: '#FFFFFF', r: 12 });

// 5 CHECK-OUT · 07-ficha-hospedagem + 05-registrar-pagamento (antes → depois)
const FICHA = '07-ficha-hospedagem/tela.html', PAG = '05-registrar-pagamento/estados/01-pagamento-antes.html', DEP = '05-registrar-pagamento/estados/02-pagamento-depois.html';
add('o_diarias', FICHA, { rect: `rowOf('#valor-diarias-contratadas', 0, 0)`, holes: ['#valor-diarias-contratadas'], fundo: '#FFFFFF', r: 12 });
add('o_consumos', FICHA, { rect: `rowOf('#valor-consumos', 0, 3)`, holes: ['#valor-consumos'], fundo: '#FFFFFF', r: 12 });
add('o_descontos', FICHA, { rect: `rowOf('#valor-descontos-e-cortesias', 0, 0)`, holes: ['#valor-descontos-e-cortesias'], fundo: '#FFFFFF', r: 12 });
add('o_total', FICHA, { rect: `rowOf('#valor-total-da-estadia', 0, 3)`, holes: ['#valor-total-da-estadia'], fundo: '#FFFFFF', r: 12 });
add('o_pagos', FICHA, { rect: `rowOf('#valor-pagamentos-confirmados', 0, 3)`, holes: ['#valor-pagamentos-confirmados'], fundo: '#FFFFFF', r: 12 });
add('o_saldo', FICHA, { prep: `(() => { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) if (n.textContent.trim().startsWith('saída em')) { let e = n.parentElement; while (!e.textContent.includes('18/10')) e = e.parentElement; e.style.visibility = 'hidden'; } })()`, rect: `pad(U(T('Saldo em aberto'), RT('#valor-saldo-em-aberto')), 18, 16)`, tile: `box('#valor-saldo-em-aberto')`, holes: ['#valor-saldo-em-aberto'] });
add('o_btn_lock', FICHA, { rect: `R('#btn-fazer-check-out')`, tile: `document.querySelector('#btn-fazer-check-out')`, btn: true });
add('o_regra', FICHA, { rect: `pad(T('Libera com saldo zero'), 14, 8)`, fundo: '#FFFFFF', r: 10 });
add('o_pix', PAG, { rect: `R('#modal-receber-pagamento #btn-pix')`, tile: `document.querySelector('#modal-receber-pagamento #btn-pix')`, btn: true });
add('o_confirmar', PAG, { rect: `R('#btn-confirmar')`, tile: `document.querySelector('#btn-confirmar')`, btn: true });
add('o_quitado', DEP, { rect: `pad(textUnion(box('#valor-saldo')), 16, 14)`, tile: `box('#valor-saldo')`, holes: ['#valor-saldo'] });
add('o_btn_livre', DEP, { rect: `R('#btn-fazer-check-out')`, tile: `document.querySelector('#btn-fazer-check-out')`, btn: true });

// 6 CAIXA · 10-caixa
const CX = '10-caixa/estados/03-aberto-com-lancamentos.html', FCH = '10-caixa/estados/06-conferencia-e-fechamento.html';
add('x_recebido', CX, { rect: `pad(U(T('Recebido por forma de pagamento'), R('#valor-recebido-por-forma-de-pagamento')), 0, 4)`, holes: ['#valor-recebido-por-forma-de-pagamento'], fundo: '#FFFFFF', r: 12 });
add('x_pix', CX, { rect: `rowOf('#valor-pix', 0, 6)`, fundo: '#FFFFFF', r: 10 });
add('x_dinheiro', CX, { rect: `rowOf('#valor-dinheiro', 0, 6)`, fundo: '#FFFFFF', r: 10 });
add('x_credito', CX, { rect: `rowOf('#valor-cartao-de-credito', 0, 6)`, fundo: '#FFFFFF', r: 10 });
add('x_debito', CX, { rect: `rowOf('#valor-cartao-de-debito', 0, 6)`, fundo: '#FFFFFF', r: 10 });
add('x_esperado', CX, { rect: `pad(U(T('Esperado em dinheiro'), RT('#valor-esperado-em-dinheiro')), 22, 18)`, tile: `box('#valor-esperado-em-dinheiro')`, holes: ['#valor-esperado-em-dinheiro'] });
add('x_contado_rot', FCH, { rect: `pad(T('Valor contado'), 12, 8)`, fundo: '#FFFFFF', r: 10 });
add('x_contado', FCH, { rect: `pad(textUnion(box('#valor-valor-contado')), 16, 14)`, tile: `box('#valor-valor-contado')`, holes: ['#valor-valor-contado'] });
add('x_falta', FCH, { rect: `pad(U(textUnion(document.querySelector('#aviso-diferenca-falta-em-relacao-ao-es')), R(document.querySelector('#aviso-diferenca-falta-em-relacao-ao-es svg'))), 14, 14)`, tile: `document.querySelector('#aviso-diferenca-falta-em-relacao-ao-es')` });

// ---------- helpers na página ----------
const HELPERS = `
window.R = (s) => { const e = typeof s === 'string' ? document.querySelector(s) : s; if (!e) throw new Error('sem ' + s); const b = e.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height, el: e }; };
window.RT = (s) => rangeRect(textNodes(document.querySelector(s))[0]);
window.U = (...rs) => { const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y)), x1 = Math.max(...rs.map(r => r.x + r.w)), y1 = Math.max(...rs.map(r => r.y + r.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
window.pad = (r, px, py = px, pr, pb) => pr === undefined ? { x: r.x - px, y: r.y - py, w: r.w + 2 * px, h: r.h + 2 * py } : { x: r.x - px, y: r.y - py, w: r.w + px + pr, h: r.h + py + pb };
window.textNodes = (root = document.body) => { const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const a = []; let n; while ((n = tw.nextNode())) if (n.textContent.trim()) a.push(n); return a; };
window.rangeRect = (n) => { const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height, el: n.parentElement }; };
// texto exato (ou começo), opcionalmente o primeiro DEPOIS de um elemento de referência
window.T = (txt, after) => { let ns = textNodes(); if (after) { const ref = typeof after === 'string' && (after.startsWith('#') || after.startsWith('.')) ? document.querySelector(after) : ns.find(n => n.textContent.trim() === after)?.parentElement; ns = ns.filter(n => ref.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING && !ref.contains(n) || ref.contains(n)); }
  const n = ns.find(n => n.textContent.replace(/\\s+/g, ' ').trim() === txt) || ns.find(n => n.textContent.replace(/\\s+/g, ' ').trim().startsWith(txt)); if (!n) throw new Error('sem texto ' + txt); return rangeRect(n); };
window.T0 = (txt, _sel, txt2) => { const a = T(txt2); return a.el; };
window.lineOf = (txt) => { const r = T(txt); const line = r.el.closest('div,p,span:not(:only-child)') || r.el; let e = r.el; while (e.parentElement && e.parentElement.getBoundingClientRect().height < r.h * 1.8) e = e.parentElement; return textUnion(e); };
window.textUnion = (e, sem) => U(...textNodes(e).filter(n => !(sem && n.parentElement.closest(sem))).map(rangeRect).filter(r => r.w > 0), ...[...e.querySelectorAll('svg')].filter(v => !(sem && v.closest(sem))).map(v => R(v)).filter(r => r.w > 0));
window.inset = (r, dx, dy) => ({ x: r.x + dx, y: r.y + dy, w: r.w - 2 * dx, h: r.h - 2 * dy });
window.linhaRect = (quarto, d0, d1) => { const d = diasRect(d0, d1); const q = T(quarto); let row = q.el; while (row && !(getComputedStyle(row).display === 'grid')) row = row.parentElement; const rr = R(row); return { x: d.x, y: rr.y, w: d.w, h: rr.h }; };
window.estilo = (e) => { const cs = getComputedStyle(e); return { fundo: cs.backgroundColor, borda: parseFloat(cs.borderTopWidth) ? cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor : null, r: parseFloat(cs.borderTopLeftRadius) || 0, sombra: cs.boxShadow !== 'none' ? cs.boxShadow : null }; };
window.par = (s, k = 1) => { let e = document.querySelector(s); for (let i = 0; i < k; i++) e = e.parentElement; return e; };
window.sib = (s) => document.querySelector(s).nextElementSibling;
window.prevEl = (s) => document.querySelector(s).previousElementSibling || document.querySelector(s).parentElement.previousElementSibling;
// o menor ancestral "caixa" (com fundo ou borda próprios)
window.box = (s) => { let e = typeof s === 'string' ? document.querySelector(s) : s; e = e.parentElement; while (e && e !== document.body) { const cs = getComputedStyle(e); if ((cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0) && parseFloat(cs.borderTopLeftRadius) > 0) return e; e = e.parentElement; } throw new Error('sem caixa ' + s); };
window.card = (txt) => box(T(txt).el);
// linha "rótulo ........ valor": do texto mais à esquerda da linha ao valor; com sub = inclui a linha de baixo (legenda)
window.rowOf = (s, px, py, sub) => { const v = R(s); let e = v.el.parentElement; while (e.getBoundingClientRect().width < v.w + 120) e = e.parentElement; const rs = textNodes(e).map(rangeRect).filter(r => r.w > 0 && (sub ? true : Math.abs((r.y + r.h / 2) - (v.y + v.h / 2)) < v.h)); const u = U(...rs, { x: v.x, y: v.y, w: v.w, h: v.h }); return pad(u, px, py); };
window.semBotoes = (s) => { const c = R(s); const bt = [...c.el.querySelectorAll('.btn')].map(b => R(b)); const top = Math.min(...bt.map(b => b.y)); return { x: c.x, y: c.y, w: c.w, h: top - c.y }; };
window.valorEm = (s) => { const c = document.querySelector(s); const i = c.querySelector('input'); if (i) return i; const n = textNodes(c).find(n => /\\d/.test(n.textContent)); return n.parentElement; };
window.diasRect = (d0, d1) => { const hs = textNodes(document.querySelector('#card-acomodacao')).filter(n => /^\\d+$/.test(n.textContent.trim())); const a = hs.find(n => +n.textContent.trim() === d0), b = hs.find(n => +n.textContent.trim() === d1); const ca = a.parentElement.parentElement, cb = b.parentElement.parentElement; return U(R(ca), R(cb)); };
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const meta = fs.existsSync(path.join(ROOT, 'src/pecas.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'src/pecas.json'))) : {};
  const browser = await chromium.launch();
  const ctxs = {};
  const getCtx = async (w, dpr) => (ctxs[w + 'x' + dpr] ||= await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: dpr }));
  for (const sp of S) {
    if (only.length && !only.includes(sp.id)) continue;
    const ctx = await getCtx(sp.w, sp.dpr);
    const page = await ctx.newPage();
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: FONT_CSS }));
    await page.route('https://fonts.local/*', (r) => r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(FONTS, path.basename(r.request().url()))) }));
    page.on('pageerror', (e) => console.error('[page]', sp.id, e.message));
    await page.goto('file://' + path.join(T, sp.file));
    await page.evaluate(() => document.fonts.ready);
    const H0 = await page.evaluate(() => document.documentElement.scrollHeight);
    if (H0 > 844) await page.setViewportSize({ width: sp.w, height: H0 });
    await page.addScriptTag({ content: HELPERS });
    if (sp.prep) await page.evaluate(sp.prep);
    if (sp.opcional && !(await page.evaluate(sp.opcional))) { await page.close(); continue; }
    const info = await page.evaluate(({ sp }) => {
      const holeEls = (sp.holes || []).map((h) => (h.startsWith('valorEm') ? eval(h) : document.querySelector(h)));
      const rect = eval(sp.rect);
      const r = { x: Math.round(rect.x * 4) / 4, y: Math.round(rect.y * 4) / 4, w: Math.round(rect.w * 4) / 4, h: Math.round(rect.h * 4) / 4 };
      // textos dentro do recorte (o furo conta: o motor escreve o valor no mesmo corpo)
      const fontes = [];
      for (const n of textNodes()) {
        const e = n.parentElement, cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
        if ((sp.hide || []).some((h) => e.closest(h))) continue;
        const b = rangeRect(n); if (!b.w) continue;
        const top = document.elementFromPoint(b.x + b.w / 2 - scrollX, b.y + b.h / 2 - scrollY);
        if (!top || !(e.contains(top) || top.contains(e))) continue; // coberto (fundo atrás de uma janela)
        const ix = Math.min(b.x + b.w, r.x + r.w) - Math.max(b.x, r.x), iy = Math.min(b.y + b.h, r.y + r.h) - Math.max(b.y, r.y);
        if (ix <= 0 || iy <= 0) continue;
        if (ix * iy < 0.6 * b.w * b.h) fontes.push({ t: n.textContent.trim().slice(0, 30), px: parseFloat(cs.fontSize), cortado: true });
        else fontes.push({ t: n.textContent.trim().slice(0, 30), px: parseFloat(cs.fontSize) });
      }
      const holes = holeEls.map((e) => {
        const cs = getComputedStyle(e); const eb = e.getBoundingClientRect(); const inp = e.tagName === 'INPUT';
        const b = inp ? { x: eb.x, y: eb.y, w: eb.width, h: eb.height } : rangeRect(textNodes(e)[0]);
        return { texto: inp ? e.value : e.textContent.replace(/\s+/g, ' ').trim(), input: inp, x: b.x - r.x, y: b.y - r.y, w: b.w, h: b.h,
          fam: cs.fontFamily.split(',')[0].replace(/"/g, ''), px: parseFloat(cs.fontSize), peso: cs.fontWeight, cor: cs.color,
          ls: cs.letterSpacing, align: inp ? 'left' : Math.abs((eb.right) - (b.x + b.w)) < 2 && Math.abs(eb.left - b.x) > 2 ? 'right' : 'left',
          fundo: (() => { let p = e; while (p) { const c = getComputedStyle(p).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c; p = p.parentElement; } return '#fff'; })() };
      });
      let bars = [];
      if (sp.bars) bars = [...document.querySelectorAll(sp.bars)].map((e) => { const b = R(e); const cs = getComputedStyle(e); return { texto: e.textContent.trim(), x: b.x - r.x, y: b.y - r.y, w: b.w, h: b.h, px: parseFloat(cs.fontSize) }; });
      const tile = sp.tile ? estilo(eval(sp.tile)) : null;
      const icones = [...document.querySelectorAll('svg')].map((v) => R(v)).filter((b) => b.w > 4 && b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h).map((b) => ({ x: b.x - r.x, y: b.y - r.y, w: b.w, h: b.h }));
      return { r, fontes, holes, bars, tile, icones, H: document.documentElement.scrollHeight };
    }, { sp });
    for (const h of info.holes) await page.evaluate(() => 0);
    await page.evaluate(({ sp }) => {
      for (const h of sp.hide || []) document.querySelectorAll(h).forEach((e) => (e.style.visibility = 'hidden'));
      for (const h of sp.holes || []) { const e = h.startsWith('valorEm') ? eval(h) : document.querySelector(h); e.style.visibility = 'hidden'; }
    }, { sp });
    const png = path.join(OUT, sp.id + '.png');
    await page.screenshot({ path: png, fullPage: true, clip: { x: info.r.x, y: info.r.y, width: info.r.w, height: info.r.h } });
    let rel;
    if (sp.rel && meta[sp.rel]) rel = { x: info.r.x - meta[sp.rel].src.x, y: info.r.y - meta[sp.rel].src.y };
    const minFont = Math.min(...info.fontes.filter((f) => !f.cortado).map((f) => f.px));
    meta[sp.id] = { id: sp.id, arquivo: 'telas/' + sp.file, png: 'pecas/' + sp.id + '.png', dpr: sp.dpr, w: info.r.w, h: info.r.h, src: { x: info.r.x, y: info.r.y, pagina: sp.w },
      minFont, textos: info.fontes, holes: info.holes, bars: info.bars, icones: info.icones, tile: info.tile || { fundo: sp.fundo || null, borda: null, r: sp.r ?? 12 }, chip: !!sp.chip, btn: !!sp.btn, rel };
    console.log(sp.id.padEnd(16), `${info.r.w}x${info.r.h}`.padEnd(14), 'min', minFont, 'px', info.fontes.filter((f) => f.cortado).length ? 'CORTADO: ' + info.fontes.filter((f) => f.cortado).map((f) => f.t).join(' / ') : '');
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'src/pecas.json'), JSON.stringify(meta, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
