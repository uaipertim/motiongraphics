#!/usr/bin/env node
/*
 * Telas reais do caixa para o educativo "Faltou dinheiro no caixa?" (10-caixa: 03, 06 e 07).
 *
 *   node scripts/telas.cjs     -> src/telas/*.jpg|png e src/telas.json
 *
 * Cada HTML do pacote é aberto no Chromium a 390 × 844 (o celular), deviceScaleFactor 4 (os recortes que saltam
 * chegam a ~2,7 px por px CSS no vídeo: 4 sobra; nada fica borrado). Sai:
 *   - s03.jpg e s07.jpg: a parte visível da tela (sem rolar). Na 03, a parte visível termina no bloco "Recebido por
 *     forma de pagamento" (o "Diário da sessão" começa em y > 844 e nunca aparece);
 *   - painel-A/B/C.png: a folha "Fechar caixa" (06) sozinha, com transparência, em três momentos do próprio HTML:
 *       A = antes de digitar (campo vazio, sem o aviso, observação vazia), B = valor digitado (o aviso aparece),
 *       C = observação escrita (o estado 06 como veio no pacote);
 *   - recortes (el-*.png): cada elemento que salta, fotografado sozinho do HTML (o bloco inteiro, com transparência
 *     fora dos cantos), na resolução de 4×;
 *   - quadros da digitação (dig-*.png): o campo do HTML com o texto mudado letra a letra e o cursor no fim;
 *   - quadros da contagem (conta-*.png): o elemento do HTML com o valor mudado, de R$ 0,00 até o valor da tela.
 * O telas.json guarda a caixa (px CSS da tela) de cada elemento, botão e texto visível, para a animação e o QA.
 * As fontes Geist / Geist Mono vêm do pacote npm "geist" (src/fonts), no lugar do Google Fonts.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();

const ROOT = path.resolve(__dirname, '..');
const T = path.resolve(ROOT, '../../telas/_material/fazlo-hospeda-telas/telas/10-caixa/estados');
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
    if (b.y > 844 || b.y + b.height < 0) continue;
    const top = document.elementFromPoint(b.x + b.width / 2, Math.min(843, b.y + b.height / 2)); const coberto = !top || !(e.contains(top) || top.contains(e));
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

  // ---------------- 03 · caixa aberto com lançamentos
  {
    const p = await abre('03-aberto-com-lancamentos.html');
    const el = {
      abertura: `comum(T('Abertura'), q('#valor-abertura'))`,
      entradas: `comum(T('+ Entradas em dinheiro'), q('#valor-entradas-em-dinheiro'))`,
      saidas: `q('#valor-saidas-em-dinheiro').parentElement`,
      conta: `comum(T('Abertura'), q('#valor-saidas-em-dinheiro'))`,
      esperado: `T('Esperado em dinheiro').parentElement`,
      recebido_cab: `comum(T('Recebido por forma de pagamento'), q('#valor-recebido-por-forma-de-pagamento'))`,
      recebido_total: `q('#valor-recebido-por-forma-de-pagamento')`,
      recebido_card: `q('#card-recebido-por-forma-de-pagamento')`,
      pix: `comum(T('PIX'), q('#valor-pix'))`,
      dinheiro: `comum(T('Dinheiro', '#card-recebido-por-forma-de-pagamento'), q('#valor-dinheiro'))`,
      credito: `comum(T('Cartão de crédito'), q('#valor-cartao-de-credito'))`,
      debito: `comum(T('Cartão de débito'), q('#valor-cartao-de-debito'))`,
      btn_fechar: `q('#btn-fechar-caixa')`,
      subtitulo: `T('Aberto por Ana Dias, hoje às 08:00')`,
    };
    const m = { arquivo: '10-caixa/estados/03-aberto-com-lancamentos.html', tela: 'telas/s03.jpg', el: {}, recortes: {} };
    for (const [k, e] of Object.entries(el)) m.el[k] = await p.evaluate((e) => ret(eval(e)), e);
    m.textos = await p.evaluate(() => textos());
    m.diario_y = await p.evaluate(() => T('Diário da sessão').getBoundingClientRect().y);
    await p.screenshot({ path: path.join(OUT, 's03.jpg'), type: 'jpeg', quality: 93 });
    for (const k of ['abertura', 'conta', 'pix', 'dinheiro', 'credito', 'debito']) m.recortes[k] = await recorta(p, el[k], `el-${k}.png`);
    // a contagem do total recebido: o próprio valor do HTML, de R$ 0,00 até R$ 1.525,00
    m.conta_total = [];
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const u = 1 - Math.pow(1 - i / N, 2.2), v = Math.round(1525 * u);
      const txt = 'R$ ' + v.toLocaleString('pt-BR') + ',00';
      await p.evaluate((txt) => { q('#valor-recebido-por-forma-de-pagamento').textContent = txt; }, txt);
      const r = await recorta(p, `q('#valor-recebido-por-forma-de-pagamento')`, `conta-total-${String(i).padStart(2, '0')}.png`, 1);
      m.conta_total.push({ txt, ...r });
    }
    meta.s03 = m; await p.close();
  }

  // ---------------- 06 · a folha "Fechar caixa" em três momentos (A, B, C) + digitação e contagem
  {
    const p = await abre('06-conferencia-e-fechamento.html');
    const PAINEL = '#modal-fechar-caixa-painel';
    const el = {
      painel: `q('${PAINEL}')`,
      esperado: `T('Esperado em dinheiro', '${PAINEL}').parentElement`,
      campo_valor: `q('#campo-valor-contado')`,
      caixa_valor: `q('#valor-valor-contado').parentElement`,
      aviso: `q('#aviso-diferenca-falta-em-relacao-ao-es')`,
      campo_obs: `q('#campo-observacao-obrigatoria-com-difer')`,
      caixa_obs: `q('#campo-observacao-obrigatoria-com-difer').lastElementChild`,
      btn_fechar: `q('#btn-fechar-caixa-2')`,
      sessao: `T('Sessão aberta hoje às 08:00 por Ana Dias')`,
    };
    const VALOR = 'R$ 270,00', OBS = 'Troco devolvido a um hóspede sem registro.';
    const obsSpan = `q('#campo-observacao-obrigatoria-com-difer').lastElementChild`;
    const estado = async (valor, aviso, obs) => p.evaluate(({ valor, aviso, obs, obsSpan }) => {
      document.querySelectorAll('.cursor-digitacao').forEach((c) => c.remove());
      q('#valor-valor-contado').textContent = valor; q('#aviso-diferenca-falta-em-relacao-ao-es').style.display = aviso ? '' : 'none'; eval(obsSpan).textContent = obs;
    }, { valor, aviso, obs, obsSpan });
    // o cursor: uma barra de 2 px no fim do texto do campo (medida pelo Range do próprio texto)
    const cursor = async (selTexto) => p.evaluate((selTexto) => {
      const e = eval(selTexto); const vazio = !e.textContent; if (vazio) e.textContent = '\u200b';
      const rg = document.createRange(); rg.selectNodeContents(e); const rs = rg.getClientRects(); const b = rs[rs.length - 1]; const fs = parseFloat(getComputedStyle(e).fontSize);
      const x = (vazio ? b.left : b.right) + 1, ymid = b.y + b.height / 2; if (vazio) e.textContent = '';
      const c = document.createElement('div'); c.className = 'cursor-digitacao'; Object.assign(c.style, { position: 'fixed', left: x + 'px', top: (ymid - fs * 0.62) + 'px', width: '2px', height: (fs * 1.24) + 'px', background: '#0A0A0A', zIndex: 99999 }); (e.closest('label') || e.parentElement).appendChild(c);
    }, selTexto);
    const m = { arquivo: '10-caixa/estados/06-conferencia-e-fechamento.html', paineis: {}, recortes: {}, dig_valor: [], dig_obs: [], conta_esperado: [] };
    const fotoPainel = async (nome) => {
      const info = { el: {} };
      for (const [k, e] of Object.entries(el)) info.el[k] = await p.evaluate((e) => { const x = eval(e); return x.offsetParent || x === q('#modal-fechar-caixa-painel') ? ret(x) : null; }, e);
      info.textos = await p.evaluate(() => textos());
      const r = await recorta(p, `q('${PAINEL}')`, `painel-${nome}.png`);
      info.img = r.img; m.paineis[nome] = info;
    };
    // A: antes de digitar
    await estado('', false, ''); await fotoPainel('A');
    // a contagem do esperado (a caixa preta inteira da folha), de R$ 0,00 a R$ 285,00
    const N = 20;
    for (let i = 0; i <= N; i++) {
      const u = 1 - Math.pow(1 - i / N, 2.2), v = Math.round(285 * u), txt = `R$ ${v},00`;
      await p.evaluate((txt) => { q('#valor-esperado-em-dinheiro-2').textContent = txt; }, txt);
      m.conta_esperado.push({ txt, ...(await recorta(p, el.esperado, `conta-esperado-${String(i).padStart(2, '0')}.png`)) });
    }
    // a digitação do valor contado: no próprio campo do HTML (o recorte é o campo inteiro: rótulo + caixa)
    const passos = ['', 'R$ ', 'R$ 2', 'R$ 27', 'R$ 270', 'R$ 270,', 'R$ 270,0', 'R$ 270,00'];
    for (let k = 0; k < passos.length + 1; k++) {
      const txt = passos[Math.min(k, passos.length - 1)], comCursor = k > 0 && k < passos.length;
      await estado(txt, false, ''); if (comCursor) await cursor(`q('#valor-valor-contado')`);
      m.dig_valor.push({ k, txt, cursor: comCursor, ...(await recorta(p, el.campo_valor, `dig-valor-${String(k).padStart(2, '0')}.png`)) });
    }
    // B: o valor digitado, o aviso aparece
    await estado(VALOR, true, ''); await fotoPainel('B');
    m.recortes.aviso = await recorta(p, el.aviso, 'el-aviso.png');
    // a digitação da observação
    for (let k = 0; k <= OBS.length + 1; k++) {
      const txt = OBS.slice(0, Math.min(k, OBS.length)), comCursor = k <= OBS.length;
      await estado(VALOR, true, txt); if (comCursor) await cursor(obsSpan);
      m.dig_obs.push({ k, txt, cursor: comCursor, ...(await recorta(p, el.campo_obs, `dig-obs-${String(k).padStart(2, '0')}.png`)) });
    }
    // C: o estado 06 como veio no pacote
    await estado(VALOR, true, OBS); await fotoPainel('C');
    m.dim = await p.evaluate(() => getComputedStyle(q('#modal-fechar-caixa')).backgroundColor);
    meta.s06 = m; await p.close();
  }

  // ---------------- 07 · caixa fechado, resumo
  {
    const p = await abre('07-fechado-resumo.html');
    const el = {
      resumo: `T('Resumo do fechamento').parentElement`,
      diferenca: `comum(T('Diferença', 'section'), q('#valor-diferenca'))`,
      observacao: `T('Observação do fechamento:').parentElement`,
      fechado: `T('Fechado hoje às')`,
      chip: `T('Caixa fechado')`,
    };
    const m = { arquivo: '10-caixa/estados/07-fechado-resumo.html', tela: 'telas/s07.jpg', el: {}, recortes: {} };
    for (const [k, e] of Object.entries(el)) m.el[k] = await p.evaluate((e) => ret(eval(e)), e);
    m.textos = await p.evaluate(() => textos());
    await p.screenshot({ path: path.join(OUT, 's07.jpg'), type: 'jpeg', quality: 93 });
    m.recortes.fechado = await recorta(p, el.fechado, 'el-fechado.png');
    meta.s07 = m; await p.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'src/telas.json'), JSON.stringify(meta));
  console.log('ok', Object.keys(meta.s03.el).length + Object.keys(meta.s07.el).length, 'elementos ·', meta.s06.dig_valor.length, '+', meta.s06.dig_obs.length, 'quadros de digitação ·',
    meta.s03.conta_total.length, '+', meta.s06.conta_esperado.length, 'de contagem · diário da sessão começa em y', Math.round(meta.s03.diario_y));
  for (const n of ['A', 'B', 'C']) { const e = meta.s06.paineis[n].el.painel; console.log('painel', n, Math.round(e.y), Math.round(e.h)); }
})().catch((e) => { console.error(e); process.exit(1); });
