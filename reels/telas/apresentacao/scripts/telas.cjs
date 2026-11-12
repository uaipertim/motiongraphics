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

// elementos que a lupa amplia e o contorno destaca: o bloco inteiro do HTML (getBoundingClientRect), com o raio
const J = "'[data-janela]'";
const EL = {
  vg: { recebido: `q('#valor-recebido-hoje')`, hospedados: `caixa(T('Hospedados'))`, saidas: `caixa(T('1 concluída'))`, atencao: `comum(T('Check-out em atraso'), T('Saída prevista ontem'))` },
  cal: { gustavo: `barra('Gustavo')`, rafael: `barra('Rafael')`, helena: `barra('Helena')`, fernanda: `barra('Fernanda')`, manutencao: `T('Manutenção', '#card-hoje').closest('[aria-label]')` },
  nr1: { livres: `T('Livres no período')` },
  nr6: { total: `comum(T('Total da reserva', ${J}), q('#valor-total-da-reserva'))` },
  gus: { chip: `q('#status-chip-pre-reserva')` },
  sinal: { campo: `q('#campo-sinal input').parentElement`, depois: `comum(T('Depois: reserva confirmada'), q('#valor-chale-de-pedra-04'))` },
  ci: { hospede: `comum(T('Hóspede', ${J}), T('Fernanda Lima', ${J}))`, telefone: `comum(T('Telefone', ${J}), T('(35) 98804-7712', ${J}))`,
        periodo: `comum(T('Período', ${J}), T('17/10 → 20/10', ${J}))`, acomodacao: `comum(T('Acomodação', ${J}), T('Chalé Ipê', ${J}))` },
  ci_feito: { recibo: `comum(T('Entrada', ${J}), T('Saída prevista', ${J}))` },
  ativas: { chip: `q('#status-chip-hospedada-3')` },
  cmd: { total: `comum(T('Total'), q('#valor-total'))` },
  cmd_add: { agua: `T('Água sem gás', ${J}).parentElement.parentElement`, agua_qtd: `T('Água sem gás', ${J}).parentElement.parentElement.lastElementChild`,
             caipirinha: `T('Caipirinha', ${J}).parentElement.parentElement`, caipirinha_qtd: `T('Caipirinha', ${J}).parentElement.parentElement.lastElementChild` },
  cmd_ok: { total: `comum(T('Total'), q('#valor-total'))` },
  ficha: { saldo: `q('#valor-saldo-em-aberto')`, botao: `q('#btn-fazer-check-out')` },
  receber: { confirmar: `q('#btn-confirmar')` },
  quitado: { chip: `q('#status-chip-quitado')`, saldo: `q('#valor-saldo')` },
  recibo: { titulo: `T('Recibo da estadia')` },
  cx: { formas: `comum(T('Recebido por forma de pagamento'), q('#valor-recebido-por-forma-de-pagamento'))` },
  cx_fechar: { falta: `comum(T('Diferença:'), T('falta R$ 15,00'))` },
  cx_fechado: { diferenca: `q('#valor-diferenca')` },
};
const HELP = `
window.q = (s) => document.querySelector(s);
window.T = (txt, dentro) => { const raiz = dentro ? document.querySelector(dentro) : document.body; const tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT); let n;
  const vis = (n) => { const e = n.parentElement; const b = e.getBoundingClientRect(); const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return top && (e.contains(top) || top.contains(e)); };
  const ns = []; while ((n = tw.nextNode())) ns.push(n); const norm = (n) => n.textContent.replace(/\\s+/g, ' ').trim();
  const a = ns.find((n) => norm(n) === txt && vis(n)) || ns.find((n) => norm(n).startsWith(txt) && vis(n)); if (a) return a.parentElement; throw new Error('sem texto ' + txt); };
window.comum = (a, b) => { let e = a; while (e && !e.contains(b)) e = e.parentElement; return e; };
window.caixa = (e) => { e = e.parentElement; while (e && e !== document.body) { const cs = getComputedStyle(e); if ((cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0) && parseFloat(cs.borderTopLeftRadius) > 0) return e; e = e.parentElement; } return null; };
window.barra = (txt) => { const e = T(txt, '#card-hoje'); return e.closest('a') || caixa(e) || e; };
window.linha = (e) => { while (e.parentElement && e.parentElement.getBoundingClientRect().height < e.getBoundingClientRect().height * 1.8) e = e.parentElement; return e; };
window.passo = (e) => { let r = e; while (!r.querySelector('button')) r = r.parentElement; const bs = r.querySelectorAll('button'); return comum(bs[0], bs[bs.length - 1]); };
window.conteudo = (e) => { const cs = getComputedStyle(e); if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0) return e.getBoundingClientRect();
  const rs = []; const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (b.width) rs.push(b); }
  e.querySelectorAll('svg, img, input').forEach((c) => { const b = c.getBoundingClientRect(); if (b.width) rs.push(b); });
  e.querySelectorAll('*').forEach((c) => { const ccs = getComputedStyle(c); if (ccs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(ccs.borderTopWidth) > 0) { const b = c.getBoundingClientRect(); if (b.width) rs.push(b); } });
  if (!rs.length) return e.getBoundingClientRect(); const x0 = Math.min(...rs.map((r) => r.left)), y0 = Math.min(...rs.map((r) => r.top)), x1 = Math.max(...rs.map((r) => r.right)), y1 = Math.max(...rs.map((r) => r.bottom)); return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 }; };
window.info = (e) => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e), c = conteudo(e); return { cx: c.left + scrollX, cy: c.top + scrollY, cw: c.width, ch: c.height, x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height, raio: parseFloat(cs.borderTopLeftRadius) || 0, janela: !!e.closest('[data-janela]'), tag: e.tagName, texto: e.innerText.replace(/\\s+/g, ' ').trim().slice(0, 80) }; };
`;
// campos digitados no próprio HTML: um quadro da tela por letra, com o cursor no fim
const DIG = { nr2: ['#campo-nome input', 'Bruno Teixeira'], sinal: ['#campo-sinal input', '315,00'] };

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
    await page.addScriptTag({ content: HELP });
    const H0 = await page.evaluate(() => document.documentElement.scrollHeight);
    if (H0 > 844 && !janela) await page.setViewportSize({ width: 390, height: H0 });   // para medir o que está coberto na página toda
    const info = await page.evaluate(INFO);
    if (H0 > 844 && !janela) await page.setViewportSize({ width: 390, height: 844 });
    const H = Math.max(844, info.H);
    const m = { id, arquivo: 'telas/' + file, H, ...info, tela: `telas/${id}.jpg` };
    // furos: o campo é fotografado vazio e o vídeo digita o valor por cima, na mesma fonte
    if (furos) m.furos = await page.evaluate((sels) => sels.map((s) => { const i = document.querySelector(s); const b = i.getBoundingClientRect(); const cs = getComputedStyle(i);
      return { sel: s, valor: i.value, x: b.x + parseFloat(cs.paddingLeft), y: b.y, w: b.width, h: b.height, font: `${cs.fontWeight} ${cs.fontSize} 'Geist Mono'`, fam: cs.fontFamily, px: parseFloat(cs.fontSize), peso: cs.fontWeight, cor: cs.color }; }), furos);
    if (!janela) {
      if (EL[id]) { if (H > 844) await page.setViewportSize({ width: 390, height: H }); m.elementos = await page.evaluate((ex) => Object.fromEntries(Object.entries(ex).map(([k, e]) => [k, info(eval(e))])), EL[id]); if (H > 844) await page.setViewportSize({ width: 390, height: 844 }); }
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
      if (DIG[id]) {
        const [sel, valor] = DIG[id]; m.digita = { sel, valor, quadros: [] };
        await page.evaluate(({ sel }) => { const i = document.querySelector(sel); i.style.color = ''; i.style.caretColor = ''; }, { sel });
        for (let k = 0; k <= valor.length + 1; k++) {
          const txt = valor.slice(0, Math.min(k, valor.length)), cursor = k <= valor.length;
          await page.evaluate(({ sel, txt, cursor }) => { const i = document.querySelector(sel); i.value = txt; document.querySelectorAll('.cursor-digitacao').forEach((c) => c.remove());
            if (!cursor) return; const cs = getComputedStyle(i), b = i.getBoundingClientRect(); const cv = document.createElement('canvas').getContext('2d'); cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
            const w = cv.measureText(txt).width, fs = parseFloat(cs.fontSize); const c = document.createElement('div'); c.className = 'cursor-digitacao';
            Object.assign(c.style, { position: 'fixed', left: (b.x + parseFloat(cs.paddingLeft) + w + 1) + 'px', top: (b.y + (b.height - fs * 1.2) / 2) + 'px', width: '2px', height: (fs * 1.2) + 'px', background: '#0A0A0A', zIndex: 99999 }); document.body.appendChild(c); }, { sel, txt, cursor });
          const f = `telas/${id}-dig-${String(k).padStart(2, '0')}.jpg`;
          await page.screenshot({ path: path.join(ROOT, 'src', f), type: 'jpeg', quality: 90 });
          m.digita.quadros.push({ k, txt, cursor, img: f });
        }
        await page.evaluate(({ sel, valor }) => { document.querySelectorAll('.cursor-digitacao').forEach((c) => c.remove()); document.querySelector(sel).value = valor; }, { sel, valor });
      }
      if (EL[id]) m.elementos = await page.evaluate((ex) => Object.fromEntries(Object.entries(ex).map(([k, e]) => [k, info(eval(e))])), EL[id]);
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
