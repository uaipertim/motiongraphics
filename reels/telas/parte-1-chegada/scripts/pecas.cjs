#!/usr/bin/env node
/*
 * Extrai as PEÇAS das telas do FAZLO Hospeda (HTML autônomo do pacote) para o reel "Parte 1 · A chegada"
 * (mesmo extrator de reels/telas/um-dia-inteiro, com as peças desta parte e as "marcas": retângulos
 * de partes de uma peça — a linha do Quarto Bromélia, cada bloco da conferência, o lugar do chip).
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

// GANCHO · o calendário de 14 dias (celular): a grade sem as barras + cada barra
const CALM = '02-calendario/tela.html';
add('g_cal', CALM, { dpr: 5, rect: `R('#card-hoje')`, tile: `document.querySelector('#card-hoje')`, hide: ['#card-hoje a'], bars: '#card-hoje a' });
for (let k = 0; k < 20; k++) add('g_bar' + String(k).padStart(2, '0'), CALM, { dpr: 5, opcional: `document.querySelectorAll('#card-hoje a').length > ${k}`, rect: `R(document.querySelectorAll('#card-hoje a')[${k}])`, r: 0, rel: 'g_cal' });

// 1 RESERVA · período, "Livres no período · 5 de 10" + lista, e a barra nova no calendário de 14 dias (computador)
const NR1 = '03-nova-reserva/estados/01-datas-e-acomodacao.html', NR8 = '03-nova-reserva/estados/08-aviso-periodo-ocupado.html';
add('r_entrada', NR1, { rect: `R('#campo-entrada')`, fundo: '#FFFFFF', r: 0 });
add('r_saida', NR1, { rect: `R('#campo-saida')`, fundo: '#FFFFFF', r: 0 });
add('r_livres', NR1, { rect: `pad(lineOf('Livres no período'), 14, 10)`, fundo: '#FFFFFF', r: 12 });
// a lista das 5 livres, do nome ao "por diária" (o rádio fica de fora para caber com o texto ≥ 40 px)
const LISTA = `pad(textUnion(par('#campo-item')), 2, 10)`;
add('r_lista', NR8, { rect: LISTA, fundo: '#FFFFFF', r: 8, marcas: { brom: `R('#campo-item-5')` } });
add('r_lista_sel', NR1, { rect: LISTA, fundo: '#FFFFFF', r: 8, marcas: { brom: `R('#campo-item-5')` } });
const CAL = '02-calendario/tela-computador.html';
const BRUNO = `(() => { const a = [...document.querySelectorAll('#card-acomodacao a')].find(e => e.textContent.trim() === 'Bruna C.');
  const b = a.cloneNode(true); b.textContent = 'Bruno T.'; b.style.gridColumn = '21 / 27'; b.id = 'barra-bruno'; a.parentElement.appendChild(b); })()`;
add('r_cal_full', CAL, { w: 1280, dpr: 4, rect: `R('#card-acomodacao')`, tile: `document.querySelector('#card-acomodacao')` });
add('r_cal_dias', CAL, { w: 1280, rect: `diasRect(22, 25)`, fundo: '#FAFAF8', r: 12 });
add('r_cal_linha', CAL, { w: 1280, rect: `linhaRect('Quarto Bromélia', 22, 25)`, fundo: '#FFFFFF', r: 12 });
add('r_cal_bruno', CAL, { w: 1280, prep: BRUNO, rect: `R('#barra-bruno')`, tile: `document.querySelector('#barra-bruno')`, rel: 'r_cal_linha' });

// 2 SINAL · Gustavo Ribeiro (pré-reserva → confirmada)
const PRE = '04-detalhe-reserva/estados/01-pre-reserva.html', CONF = '04-detalhe-reserva/estados/02-confirmada.html', SIN = '05-registrar-pagamento/estados/04-sinal-antes.html';
add('s_gustavo', PRE, { rect: `pad(U(T('Gustavo Ribeiro'), R('#status-chip-pre-reserva'), T('Chalé de Pedra 04', '#status-chip-pre-reserva'), T('sem sinal')), 16, 0, 16, 10)`, fundo: '#F4F4F0', r: 16 });
add('s_gustavo_conf', PRE, { rect: `pad(U(T('Gustavo Ribeiro'), R('#status-chip-pre-reserva'), T('Chalé de Pedra 04', '#status-chip-pre-reserva')), 16, 0, 16, 3)`, fundo: '#F4F4F0', r: 16, hide: ['#status-chip-pre-reserva'], marcas: { chip: `R('#status-chip-pre-reserva')` } });
add('s_conta', PRE, { rect: `pad(U(T('Total da reserva'), RT('#valor-sinal-pago'), R(box('#valor-saldo-em-aberto'))), 0, 4)`, fundo: '#FFFFFF', r: 14, holes: ['#valor-total-da-reserva', '#valor-saldo-em-aberto'] });
add('s_chip_pre', PRE, { dpr: 8, rect: `R('#status-chip-pre-reserva')`, tile: `document.querySelector('#status-chip-pre-reserva')`, chip: true });
add('s_chip_conf', CONF, { dpr: 8, rect: `R('#status-chip-confirmada')`, tile: `document.querySelector('#status-chip-confirmada')`, chip: true });
add('s_titulo', SIN, { rect: `pad(U(R('#titulo-confirmar-reserva'), T('Gustavo Ribeiro · FHZ-UDVKU5')), 16, 12)`, fundo: '#FFFFFF', r: 14 });
add('s_campo', SIN, { rect: `R(valorEm('#campo-sinal').parentElement)`, tile: `valorEm('#campo-sinal').parentElement`, holes: ['valorEm("#campo-sinal")'] });
add('s_depois', SIN, { rect: `pad(textUnion(par('#valor-chale-de-pedra-04', 2)), 14, 12)`, tile: `par('#valor-chale-de-pedra-04', 2)`, holes: ['#valor-chale-de-pedra-04'] });

// 3 CHECK-IN · Fernanda Lima
const CI = '06-check-in/estados/01-modal-check-in.html', CIF = '06-check-in/estados/03-check-in-feito.html', ATV = '06-check-in/estados/04-hospedagens-ativas.html';
const CEL = (rot) => `(() => { const l = T('${rot}', '#modal-fazer-check-in'); const v = textNodes(l.el.parentElement).map(rangeRect).filter(r => r.w > 0); return pad(U(...v), 8, 6); })()`;
add('c_titulo', CI, { rect: `pad(U(R('#titulo-fazer-check-in'), T('Fernanda Lima · FHZ-U6EKQE')), 16, 12)`, fundo: '#FFFFFF', r: 14 });
add('c_dados', CI, { rect: `pad(textUnion(box(T('Hóspede', '#modal-fazer-check-in').el)), 4, 10)`, tile: `box(T('Hóspede', '#modal-fazer-check-in').el)`,
  marcas: { hospede: CEL('Hóspede'), telefone: CEL('Telefone'), periodo: CEL('Período'), acomodacao: CEL('Acomodação') } });
add('c_btn', CI, { rect: `R('#btn-fazer-check-in-2')`, tile: `document.querySelector('#btn-fazer-check-in-2')`, btn: true });
add('c_feito', CIF, { rect: `pad(U(R('#titulo-check-in-feito'), T('Fernanda Lima · Chalé Ipê'), R(prevEl('#titulo-check-in-feito'))), 16, 12)`, fundo: '#FFFFFF', r: 14 });
add('c_recibo', CIF, { rect: `pad(U(T('Recibo de check-in'), T('FHZ-U6EKQE', 'Recibo de check-in'), T('12:00', 'Saída prevista')), 1, 12, 1, 6)`, tile: `box('#valor-total-da-reserva-2')` });
add('c_hospedagens', ATV, { rect: `pad(R('#titulo-hospedagens'), 14, 4, 14, 2)`, fundo: '#F4F4F0', r: 14 });
// o cartão da Fernanda na lista de hospedagens: o cartão do próprio pacote, com os dados dela (Chalé Ipê, 2 adultos);
// o chip fica escondido no recorte e é desenhado por cima (Confirmada → Hospedada, os chips do pacote)
const FER = `(() => { const c = document.querySelector('#card-mariana-costa'); const n = c.cloneNode(true); n.id = 'card-fernanda-lima';
  n.querySelectorAll('[id]').forEach(e => e.id = e.id + '-f'); c.parentElement.insertBefore(n, c);
  const tw = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); let t; while ((t = tw.nextNode())) { const s = t.textContent.trim();
    if (s === 'MC') t.textContent = 'FL'; if (s === 'Mariana Costa') t.textContent = 'Fernanda Lima'; if (s === 'Suíte Mirante · 2 hóspedes') t.textContent = 'Chalé Ipê · 2 hóspedes'; } })()`;
add('c_fernanda', ATV, { prep: FER, rect: `pad(U(T('Fernanda Lima', '#card-fernanda-lima'), T('Chalé Ipê · 2 hóspedes', '#card-fernanda-lima'), R('#status-chip-hospedada-3-f')), 2, 12, 2, 4)`, tile: `document.querySelector('#card-fernanda-lima')`,
  hide: ['#status-chip-hospedada-3-f'], marcas: { chip: `R('#status-chip-hospedada-3-f')` } });
add('c_chip_hosp', ATV, { dpr: 8, rect: `R('#status-chip-hospedada-3')`, tile: `document.querySelector('#status-chip-hospedada-3')`, chip: true });

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
      const marcas = Object.fromEntries(Object.entries(sp.marcas || {}).map(([k, e]) => { const b = eval(e); return [k, { x: b.x - r.x, y: b.y - r.y, w: b.w, h: b.h }]; }));
      return { r, fontes, holes, bars, tile, icones, marcas, H: document.documentElement.scrollHeight };
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
      minFont, textos: info.fontes, holes: info.holes, bars: info.bars, icones: info.icones, marcas: info.marcas, tile: info.tile || { fundo: sp.fundo || null, borda: null, r: sp.r ?? 12 }, chip: !!sp.chip, btn: !!sp.btn, rel };
    console.log(sp.id.padEnd(16), `${info.r.w}x${info.r.h}`.padEnd(14), 'min', minFont, 'px', info.fontes.filter((f) => f.cortado).length ? 'CORTADO: ' + info.fontes.filter((f) => f.cortado).map((f) => f.t).join(' / ') : '');
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'src/pecas.json'), JSON.stringify(meta, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
