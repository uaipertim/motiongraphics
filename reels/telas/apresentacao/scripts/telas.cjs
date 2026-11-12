#!/usr/bin/env node
/*
 * Renderiza as TELAS INTEIRAS do pacote (tela.html / estados/*.html) para o reel de apresentação.
 *
 *   node scripts/telas.cjs            -> src/telas/<id>.jpg (+ <id>-janela.png) e src/telas.json
 *   node scripts/telas.cjs cal vg     -> só as telas pedidas
 *
 * Cada HTML é aberto no Chromium a 390 px de largura (o celular), com deviceScaleFactor 4, e fotografado inteiro
 * (a página toda, para a rolagem). Nos estados com janela, folha de baixo ou aviso por cima, sai também:
 *   - o FUNDO (a mesma tela sem a janela nem o escurecido), para a janela subir de baixo na frente de quem assiste;
 *   - a JANELA sozinha, em PNG com transparência, e a posição dela.
 * Nada é recortado para ficar solto: no vídeo, fundo e janela são montados de volta dentro da tela do celular,
 * na mesma posição do estado original.
 * O telas.json guarda a caixa de cada id (para os toques e a câmera) e de cada texto, com o corpo (para o QA dos
 * 40 px). As fontes Geist / Geist Mono vêm do pacote npm "geist" (src/fonts), no lugar do Google Fonts.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();

const ROOT = path.resolve(__dirname, '..');
const T = path.resolve(ROOT, '../_material/fazlo-hospeda-telas/telas');
const OUT = path.join(ROOT, 'src/telas');
const FONTS = path.join(ROOT, 'src/fonts');
const DPR = 4;
const only = process.argv.slice(2);
const FONT_CSS = `
@font-face{font-family:'Geist';src:url(https://fonts.local/Geist-Variable.woff2) format('woff2');font-weight:100 900}
@font-face{font-family:'Geist Mono';src:url(https://fonts.local/GeistMono-Variable.woff2) format('woff2');font-weight:100 900}`;

// id, arquivo, janela (seletor da janela/folha, ou null), furos (campos que o vídeo preenche digitando)
const S = [
  ['vg_load', '01-visao-geral/estados/carregando.html'],
  ['vg', '01-visao-geral/tela.html'],
  ['criar', '01-visao-geral/estados/menu-criar.html', '#modal-criar'],
  ['cal', '02-calendario/tela.html'],
  ['nr1', '03-nova-reserva/estados/01-datas-e-acomodacao.html', '#modal-nova-reserva'],
  ['nr2', '03-nova-reserva/estados/02-hospede.html', '#modal-nova-reserva', ['#modal-nova-reserva input']],
  ['nr3', '03-nova-reserva/estados/03-valores.html', '#modal-nova-reserva'],
  ['nr4', '03-nova-reserva/estados/04-sinal.html', '#modal-nova-reserva'],
  ['nr6', '03-nova-reserva/estados/06-resumo-com-sinal.html', '#modal-nova-reserva'],
  ['gus', '04-detalhe-reserva/estados/01-pre-reserva.html'],
  ['sinal', '05-registrar-pagamento/estados/04-sinal-antes.html', '#modal-confirmar-reserva', ['#campo-sinal input']],
  ['ci', '06-check-in/estados/01-modal-check-in.html', '#modal-fazer-check-in'],
  ['ci_feito', '06-check-in/estados/03-check-in-feito.html', '#modal-check-in-feito'],
  ['ativas', '06-check-in/estados/04-hospedagens-ativas.html'],
  ['cmd', '08-comanda/estados/02-com-itens.html'],
  ['cmd_add', '08-comanda/estados/03-adicionando-produto.html', '.modal'],
  ['cmd_ok', '08-comanda/estados/04-produto-adicionado.html'],
  ['ficha', '07-ficha-hospedagem/tela.html'],
  ['receber', '09-check-out/estados/02-recebimento.html', '.modal'],
  ['quitado', '09-check-out/estados/03-saldo-quitado.html'],
  ['encerrar', '09-check-out/estados/04-encerrar-check-out.html', '.modal'],
  ['recibo', '09-check-out/estados/06-recibo-da-estadia.html'],
  ['cx', '10-caixa/estados/03-aberto-com-lancamentos.html'],
  ['cx_fechar', '10-caixa/estados/06-conferencia-e-fechamento.html', '#modal-fechar-caixa-painel'],
  ['cx_fechado', '10-caixa/estados/07-fechado-resumo.html'],
];

const INFO = `(() => {
  const out = { ids: {}, textos: [], H: document.documentElement.scrollHeight };
  document.querySelectorAll('[id]').forEach((e) => { const b = e.getBoundingClientRect(); if (b.width) out.ids[e.id] = { x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height, t: (e.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60) }; });
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) {
    const t = n.textContent.replace(/\\s+/g, ' ').trim(); if (!t) continue;
    const e = n.parentElement, cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (!b.width) continue;
    const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    const coberto = !top || !(e.contains(top) || top.contains(e));
    out.textos.push({ t: t.slice(0, 50), px: parseFloat(cs.fontSize), x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height, coberto });
  }
  document.querySelectorAll('input').forEach((i) => { if (!i.value) return; const b = i.getBoundingClientRect(); const cs = getComputedStyle(i); out.textos.push({ t: i.value, px: parseFloat(cs.fontSize), x: b.x, y: b.y, w: b.width, h: b.height, input: true }); });
  return out; })()`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const jpath = path.join(ROOT, 'src/telas.json');
  const meta = fs.existsSync(jpath) ? JSON.parse(fs.readFileSync(jpath)) : {};
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR });
  for (const [id, file, janela, furos] of S) {
    if (only.length && !only.includes(id)) continue;
    const page = await ctx.newPage();
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: FONT_CSS }));
    await page.route('https://fonts.local/*', (r) => r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(FONTS, path.basename(r.request().url()))) }));
    await page.goto('file://' + path.join(T, file));
    await page.evaluate(() => document.fonts.ready);
    const H0 = await page.evaluate(() => document.documentElement.scrollHeight);
    if (H0 > 844 && !janela) await page.setViewportSize({ width: 390, height: H0 });   // para medir o que está coberto na página toda
    const info = await page.evaluate(INFO);
    if (H0 > 844 && !janela) await page.setViewportSize({ width: 390, height: 844 });
    const H = Math.max(844, info.H);
    const m = { id, arquivo: 'telas/' + file, H, ...info, tela: `telas/${id}.jpg` };
    // furos: o campo é fotografado vazio e o vídeo digita o valor por cima, na mesma fonte
    if (furos) m.furos = await page.evaluate((sels) => sels.map((s) => { const i = document.querySelector(s); const b = i.getBoundingClientRect(); const cs = getComputedStyle(i);
      return { sel: s, valor: i.value, x: b.x + parseFloat(cs.paddingLeft), y: b.y, w: b.width, h: b.height, font: `${cs.fontWeight} ${cs.fontSize} 'Geist Mono'`, fam: cs.fontFamily, px: parseFloat(cs.fontSize), peso: cs.fontWeight, cor: cs.color }; }), furos);
    if (furos) await page.evaluate((sels) => sels.forEach((s) => { document.querySelector(s).style.color = 'transparent'; document.querySelector(s).style.caretColor = 'transparent'; }), furos);
    if (!janela) {
      await page.screenshot({ path: path.join(OUT, id + '.jpg'), type: 'jpeg', quality: 93, fullPage: true });
    } else {
      // estado completo (referência), a janela sozinha e o fundo sem ela
      const jb = await page.evaluate((sel) => { const e = document.querySelector(sel); let j = e; const b0 = e.getBoundingClientRect();
        if (b0.width >= 389 && b0.height >= 800) { j = [...e.querySelectorAll('*')].find((c) => { const cs = getComputedStyle(c); const b = c.getBoundingClientRect(); return cs.backgroundColor === 'rgb(255, 255, 255)' && b.width > 300 && b.height > 200; }) || e; }
        j.setAttribute('data-janela', '1'); const b = j.getBoundingClientRect();
        // o escurecido: o ancestral que cobre a tela toda
        let fundo = j; while (fundo.parentElement && fundo.parentElement !== document.body) { const bb = fundo.parentElement.getBoundingClientRect(); const cs = getComputedStyle(fundo.parentElement); if (bb.width >= 389 && bb.height >= 800 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && fundo.parentElement.id !== 'tela') { fundo = fundo.parentElement; break; } fundo = fundo.parentElement; }
        if (fundo !== j) fundo.setAttribute('data-escuro', '1');
        return { x: b.x, y: b.y, w: b.width, h: b.height, escuro: fundo !== j ? getComputedStyle(fundo).backgroundColor : null, raio: getComputedStyle(j).borderTopLeftRadius }; }, janela);
      m.janela = { ...jb, png: `telas/${id}-janela.png` };
      await page.screenshot({ path: path.join(OUT, id + '-estado.jpg'), type: 'jpeg', quality: 80, fullPage: true });
      await page.addStyleTag({ content: `html,body{background:transparent!important} body *{visibility:hidden!important} [data-janela], [data-janela] *{visibility:visible!important}` });
      await page.screenshot({ path: path.join(OUT, id + '-janela.png'), omitBackground: true, clip: { x: jb.x, y: jb.y, width: jb.w, height: jb.h } });
      await page.evaluate(() => { document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('data-janela')) s.remove(); }); const j = document.querySelector('[data-janela]'); const e = document.querySelector('[data-escuro]'); (e || j).style.visibility = 'hidden'; if (!e) j.style.visibility = 'hidden'; });
      await page.screenshot({ path: path.join(OUT, id + '.jpg'), type: 'jpeg', quality: 93, fullPage: true });
    }
    meta[id] = m;
    console.log(id.padEnd(11), `H ${H}`.padEnd(8), janela ? `janela ${Math.round(m.janela.x)},${Math.round(m.janela.y)} ${Math.round(m.janela.w)}x${Math.round(m.janela.h)} escuro ${m.janela.escuro}` : '');
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(jpath, JSON.stringify(meta));
})().catch((e) => { console.error(e); process.exit(1); });
