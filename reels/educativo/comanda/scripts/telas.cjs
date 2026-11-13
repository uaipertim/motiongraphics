#!/usr/bin/env node
/*
 * Telas reais da comanda para o Reel "A caipirinha da piscina entrou na conta?" (08-comanda: 02, 03 e 04).
 * (O motor é o do educativo "fechar-caixa"; o resumo abaixo é o daqui.)
 *
 *   node scripts/telas.cjs     -> src/telas/*.jpg|png e src/telas.json
 *
 * Cada HTML do pacote é aberto no Chromium a 390 px de largura (o celular), deviceScaleFactor 4. Sai:
 *   - s02.jpg e s04.jpg: a PÁGINA INTEIRA (a tela rola até o item cancelado); s02-vazia.jpg: a mesma 02 com os itens
 *     invisíveis (só para a entrada, enquanto os cartões caem nos lugares deles);
 *   - painel-03.png: a folha "Lançar consumo" (03) sozinha, com transparência, na posição do estado;
 *   - recortes (el-*.png): os cartões dos itens (02 e 04), os chips "Frigobar", "Bar da piscina" e "Restaurante" da folha,
 *     o "Saldo" e o botão "Receber R$ 321,00", fotografados sozinhos do HTML (o bloco inteiro), em 4×;
 *   - contagens (conta-*.png): a linha "Total" do HTML com o valor mudado (R$ 0,00 → R$ 287,00 e R$ 287,00 → R$ 321,00).
 * As fontes Geist / Geist Mono vêm do pacote npm "geist" (src/fonts), no lugar do Google Fonts.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();

const ROOT = path.resolve(__dirname, '..');
const T = path.resolve(ROOT, '../../telas/_material/fazlo-hospeda-telas/telas/08-comanda/estados');
const OUT = path.join(ROOT, 'src/telas');
const FONTS = path.join(ROOT, 'src/fonts');
const DPR = 4;
const FONT_CSS = `
@font-face{font-family:'Geist';src:url(https://fonts.local/Geist-Variable.woff2) format('woff2');font-weight:100 900}
@font-face{font-family:'Geist Mono';src:url(https://fonts.local/GeistMono-Variable.woff2) format('woff2');font-weight:100 900}`;

const HELP = `
window.q = (s) => document.querySelector(s);
window.T = (txt, dentro) => { const raiz = dentro ? document.querySelector(dentro) : document.body; const tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT); let n;
  const ns = []; while ((n = tw.nextNode())) ns.push(n); const norm = (n) => n.textContent.replace(/\\s+/g, ' ').trim();
  const a = ns.find((n) => norm(n) === txt) || ns.find((n) => norm(n).startsWith(txt)); if (a) return a.parentElement; throw new Error('sem texto ' + txt); };
window.comum = (a, b) => { let e = a; while (e && !e.contains(b)) e = e.parentElement; return e; };
window.ret = (e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: b.x, y: b.y, w: b.width, h: b.height, raio: parseFloat(cs.borderTopLeftRadius) || 0, fundo: cs.backgroundColor, texto: e.innerText.replace(/\\s+/g, ' ').trim() }; };
window.textos = () => { const out = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) { const t = n.textContent.replace(/\\s+/g, ' ').trim(); if (!t) continue; const e = n.parentElement, cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue; const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (!b.width) continue;
    if (b.y > innerHeight || b.y + b.height < 0) continue;
    const top = document.elementFromPoint(b.x + b.width / 2, Math.min(innerHeight - 1, b.y + b.height / 2)); const coberto = !top || !(e.contains(top) || top.contains(e));
    out.push({ t, px: parseFloat(cs.fontSize), x: b.x, y: b.y, w: b.width, h: b.height, coberto }); }
  return out; };
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR });
  const abre = async (file) => {
    const page = await ctx.newPage();
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: FONT_CSS }));
    await page.route('https://fonts.local/*', (r) => r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(FONTS, path.basename(r.request().url()))) }));
    await page.goto('file://' + path.join(T, file));
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ content: HELP });
    return page;
  };
  // recorte de um elemento sozinho (o resto invisível, fundo transparente), com uma folga em px CSS
  const recorta = async (page, expr, arq, folga = 0) => {
    const r = await page.evaluate((expr) => { document.querySelectorAll('[data-recorte]').forEach((e) => e.removeAttribute('data-recorte')); const e = eval(expr); e.setAttribute('data-recorte', '1'); return ret(e); }, expr);
    await page.addStyleTag({ content: `html,body{background:transparent!important} body *{visibility:hidden!important} [data-recorte], [data-recorte] *{visibility:visible!important}` });
    await page.screenshot({ path: path.join(OUT, arq), omitBackground: true, clip: { x: r.x - folga, y: r.y - folga, width: r.w + 2 * folga, height: r.h + 2 * folga } });
    await page.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('data-recorte')) s.remove(); }));
    return { ...r, folga, img: 'telas/' + arq };
  };
  const meta = { dpr: DPR };
  const ITENS = { caipirinha: `q('#item-comanda-1')`, agua: `q('#item-comanda-2')`, cerveja: `q('#item-comanda-3')`, risoto: `q('#item-comanda-4')`, suco: `q('#item-comanda-5')`,
    cancelado: `q('#status-chip-cancelado').closest('div[style*="dashed"]')` };
  const COMUNS = { card_total: `q('#card-total')`, total: `comum(T('Total'), q('#valor-total'))`, saldo: `comum(T('Saldo'), q('#valor-saldo'))`, receber: `q('#btn-receber')`,
    lancar_consumo: `q('#btn-lancar-consumo')`, titulo: `q('#titulo-mariana-costa')`, chip_aberta: `q('#status-chip-aberta')`, sub: `T('Suíte Mirante · Hospedagem')`, itens_titulo: `T('Itens')` };
  const pagina = async (p) => { const H = await p.evaluate(() => document.documentElement.scrollHeight); await p.setViewportSize({ width: 390, height: H }); return H; };
  const conta = async (p, de, ate, n, nome) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = 1 - Math.pow(1 - i / n, 2.2), v = Math.round(de + (ate - de) * u), txt = 'R$ ' + v.toLocaleString('pt-BR') + ',00';
      await p.evaluate((txt) => { q('#valor-total').textContent = txt; }, txt);
      out.push({ txt, ...(await recorta(p, COMUNS.total, `conta-${nome}-${String(i).padStart(2, '0')}.png`)) });
    }
    return out;
  };

  // ---------------- 02 · comanda com itens
  {
    const p = await abre('02-com-itens.html'); const H = await pagina(p);
    const m = { arquivo: '08-comanda/estados/02-com-itens.html', tela: 'telas/s02.jpg', vazia: 'telas/s02-vazia.jpg', H, el: {}, recortes: {} };
    for (const [k, e] of Object.entries({ ...ITENS, ...COMUNS })) m.el[k] = await p.evaluate((e) => ret(eval(e)), e);
    m.textos = await p.evaluate(() => textos());
    await p.screenshot({ path: path.join(OUT, 's02.jpg'), type: 'jpeg', quality: 92 });
    for (const k of Object.keys(ITENS)) m.recortes[k] = await recorta(p, ITENS[k], `el-02-${k}.png`);
    // a lista "vazia" (só a entrada): os itens invisíveis, o resto igual
    await p.evaluate((sels) => sels.forEach((s) => { eval(s).style.visibility = 'hidden'; }), Object.values(ITENS));
    await p.screenshot({ path: path.join(OUT, 's02-vazia.jpg'), type: 'jpeg', quality: 92 });
    await p.evaluate((sels) => sels.forEach((s) => { eval(s).style.visibility = ''; }), Object.values(ITENS));
    m.conta_total = await conta(p, 0, 287, 22, '287');
    meta.s02 = m; await p.close();
  }
  // ---------------- 03 · a folha "Lançar consumo" (sobre a 02)
  {
    const p = await abre('03-adicionando-produto.html');
    const PAINEL = '#modal-lancar-consumo-painel';
    const el = { painel: `q('${PAINEL}')`, btn_lancar: `q('#btn-lancar')`, subtotal: `comum(T('Subtotal, preço atual do cardápio'), q('#valor-subtotal-preco-atual-do-cardapio'))`,
      chip_frigobar: `T('Frigobar', '${PAINEL}').closest('button') || T('Frigobar', '${PAINEL}')`, chip_bar: `T('Bar da piscina', '${PAINEL}').closest('button') || T('Bar da piscina', '${PAINEL}')`,
      chip_restaurante: `T('Restaurante', '${PAINEL}').closest('button') || T('Restaurante', '${PAINEL}')` };
    const m = { arquivo: '08-comanda/estados/03-adicionando-produto.html', el: {}, recortes: {} };
    for (const [k, e] of Object.entries(el)) m.el[k] = await p.evaluate((e) => ret(eval(e)), e);
    m.textos = await p.evaluate(() => textos());
    m.dim = await p.evaluate(() => getComputedStyle(q('#modal-lancar-consumo')).backgroundColor);
    for (const k of ['chip_frigobar', 'chip_bar', 'chip_restaurante']) m.recortes[k] = await recorta(p, el[k], `el-${k}.png`);
    m.painel = await recorta(p, el.painel, 'painel-03.png');
    meta.s03 = m; await p.close();
  }
  // ---------------- 04 · produto adicionado
  {
    const p = await abre('04-produto-adicionado.html'); const H = await pagina(p);
    const m = { arquivo: '08-comanda/estados/04-produto-adicionado.html', tela: 'telas/s04.jpg', H, el: {}, recortes: {} };
    for (const [k, e] of Object.entries({ ...ITENS, ...COMUNS, toast: `q('#toast-salvo')` })) m.el[k] = await p.evaluate((e) => ret(eval(e)), e);
    m.textos = await p.evaluate(() => textos());
    await p.screenshot({ path: path.join(OUT, 's04.jpg'), type: 'jpeg', quality: 92 });
    for (const k of ['caipirinha', 'agua', 'cancelado']) m.recortes[k] = await recorta(p, ITENS[k], `el-04-${k}.png`);
    m.recortes.saldo = await recorta(p, COMUNS.saldo, 'el-04-saldo.png');
    m.recortes.receber = await recorta(p, COMUNS.receber, 'el-04-receber.png');
    m.conta_total = await conta(p, 287, 321, 16, '321');
    meta.s04 = m; await p.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'src/telas.json'), JSON.stringify(meta));
  console.log('ok · 02 H', meta.s02.H, '· 04 H', meta.s04.H, '· painel 03', JSON.stringify(meta.s03.el.painel).slice(0, 80));
  for (const k of ['caipirinha', 'agua', 'cerveja', 'risoto', 'suco', 'cancelado']) console.log(k, Math.round(meta.s02.el[k].y), Math.round(meta.s02.el[k].h));
  console.log('toast 04', JSON.stringify(meta.s04.el.toast).slice(0, 120));
})().catch((e) => { console.error(e); process.exit(1); });
