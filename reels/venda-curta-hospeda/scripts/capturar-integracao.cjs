#!/usr/bin/env node
/*
 * Recaptura conjunta das três telas da integração (frases 5, 6 e 7), na mesma sessão da Demo recarregada:
 *   node scripts/capturar-integracao.cjs [--saida <pasta>]
 *   -> telas/canais.png, telas/calendario.png, telas/inicio-conflito.png e telas/integracao.json (medidas, em px da captura)
 * Mesmo padrão do capturar.cjs: celular 390×844 a 3x, tela inteira, elementos da demonstração invisíveis.
 * RECUSA (sai com erro, sem gravar nada) se, DENTRO da tela capturada, houver "não consegue ler", "não lê o calendário",
 * "Confira o link", "Confira se o link", link (http, .ics, webcal), e-mail ou texto da demonstração.
 * O alerta "Conflito com o Airbnb" é procurado no Início e, se não estiver, em "Precisa de atenção › Ver todos".
 * Confere que o chalé e as datas do alerta existem no calendário (a reserva do Hospeda no mesmo período).
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const args = process.argv.slice(2), ia = args.indexOf('--saida');
const OUT = ia >= 0 ? path.resolve(args[ia + 1]) : path.join(__dirname, '..', 'telas');
const RECUSA = [/não consegue ler/i, /não lê o calendário/i, /Confira o link/i, /Confira se o link/i, /https?:\/\//i, /\.ics\b/i, /webcal/i, /\S+@\S+\.\w/, /fazlodigital/i, /\bDemo\b/, /Demonstra/i, /Quero usar/, /token/i, /senha/i];
const ESCONDE = () => {
  const alvos = [...document.querySelectorAll('body *')].filter((e) => {
    const t = (e.innerText || '').trim();
    return (e.children.length <= 3 && /^(Demonstração(Demo)?|Quero usar|Quero usar na minha pousada)$/.test(t)) ||
      /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)(-feira)?, \d+ de \w+$/.test(t) ||
      /^Na demonstração, a sincronização não é feita\.$/.test(t) || /^FAZLO Hospeda · v[\d.]/.test(t);
  });
  alvos.forEach((e) => { e.style.visibility = 'hidden'; });
  return alvos.length;
};
const VISIVEL = () => [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0')
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight; }).map((e) => e.textContent).join(' ');
(async () => {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  await pag.route('**/*', (r) => r.continue({ headers: { ...r.request().headers(), 'cache-control': 'no-cache', pragma: 'no-cache' } }));
  const fotos = {}, M = { nota: 'Medidas (px da captura 1170×2532) das três telas da integração, feitas por scripts/capturar-integracao.cjs na mesma sessão.', captura: new Date().toISOString().slice(0, 10) };
  const sai = async (msg) => { console.error('RECUSADA:', msg); await nav.close(); process.exit(1); };
  const foto = async (nome) => {
    await pag.waitForTimeout(600); await pag.evaluate(ESCONDE); await pag.waitForTimeout(200);
    const txt = await pag.evaluate(VISIVEL), ach = RECUSA.filter((re) => re.test(txt)).map(String);
    if (ach.length) await sai(`${nome}: texto proibido na tela: ${ach.join(', ')}`);
    fotos[nome] = await pag.screenshot();
  };
  const r3 = (r) => [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3));
  await pag.goto('https://demo.fazlohospeda.com.br/?nc=' + Date.now(), { waitUntil: 'networkidle' });
  await pag.getByText('Entrar na demonstração').click(); await pag.waitForTimeout(2500);

  // 1) Canais (frase 5): o topo, com o texto de apresentação; nenhum link à mostra
  await pag.getByText('Mais', { exact: true }).click(); await pag.waitForTimeout(800);
  await pag.locator('[data-testid=tenant-more-menu]').getByText('Canais', { exact: true }).first().click(); await pag.waitForTimeout(1800);
  await pag.evaluate(() => window.scrollTo(0, 0));
  await foto('canais');
  M.canais = await pag.evaluate(() => { const e = [...document.querySelectorAll('body *')].filter((x) => (x.innerText || '').trim().startsWith('Envie a ocupação')).sort((a, b) => a.innerText.length - b.innerText.length)[0]; const r = e.getBoundingClientRect(); return { texto: [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3)) }; });

  // 2) Calendário (frases 6 e 8): o bloqueio "Airbnb" e a linha do chalé do alerta
  await pag.getByRole('button', { name: 'Calendário', exact: true }).filter({ visible: true }).first().click().catch(() => pag.getByText('Calendário', { exact: true }).last().click());
  await pag.waitForTimeout(1600); await pag.evaluate(() => window.scrollTo(0, 0));
  await foto('calendario');
  M.calendario = await pag.evaluate(() => {
    const r3 = (r) => [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3)), vis = (e) => e.getClientRects().length;
    const bl = [...document.querySelectorAll('body *')].filter((e) => vis(e) && (e.innerText || '').trim() === 'Airbnb').sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width);
    let bloq = bl[0]; while (bloq && bloq.parentElement && bloq.getBoundingClientRect().width < 60) bloq = bloq.parentElement;
    const linha = (n) => { const e = [...document.querySelectorAll('body *')].filter((x) => vis(x) && x.children.length === 0 && (x.textContent || '').trim() === n); return e; };
    const rotulo = (num) => { const nums = linha(num).filter((x) => x.getBoundingClientRect().left < 140); return nums.length ? nums[0].getBoundingClientRect() : null; };
    const dia = (d) => { const e = linha(d).filter((x) => x.getBoundingClientRect().top < 420 && x.getBoundingClientRect().left > 130)[0]; return e ? e.getBoundingClientRect() : null; };
    const b01 = rotulo('01'), p05 = rotulo('05'), d27 = dia('27'), d30 = dia('30');
    const bloqR = bloq.getBoundingClientRect(), grade = [...document.querySelectorAll('body *')].find((x) => vis(x) && (x.innerText || '').startsWith('Hoje'));
    const btn = [...document.querySelectorAll('button[aria-label]')].filter((b) => vis(b) && /Roberto/.test(b.getAttribute('aria-label')))[0];
    return { airbnb: r3(bloqR), bica01: [48, Math.round((b01.top - 30) * 3), 1122, Math.round((b01.bottom + 12) * 3)], pedra05: [48, Math.round((p05.top - 30) * 3), 1122, Math.round((p05.bottom + 12) * 3)],
      reserva05: btn ? r3(btn.getBoundingClientRect()) : null, reserva05_nome: btn ? btn.getAttribute('aria-label') : null,
      dias27a30: d27 && d30 ? [Math.round(d27.left * 3) - 9, Math.round(d27.top * 3) - 12, Math.round(d30.right * 3) + 9, Math.round(d30.bottom * 3) + 12] : null };
  });

  // 3) Início: o alerta "Conflito com o Airbnb" (no Início ou em "Ver todos"), com "Nada foi cancelado." e o sino
  await pag.getByRole('button', { name: 'Início', exact: true }).filter({ visible: true }).first().click(); await pag.waitForTimeout(1500);
  const acha = () => pag.evaluate(() => { const e = [...document.querySelectorAll('body *')].filter((x) => x.getClientRects().length && (x.innerText || '').trim().startsWith('Conflito com o Airbnb')).sort((a, b) => a.innerText.length - b.innerText.length)[0];
    if (!e) return null; let c = e; for (let k = 0; k < 6 && c.parentElement && !/Abrir a reserva do Hospeda/.test(c.innerText); k++) c = c.parentElement;
    c.scrollIntoView({ block: 'start' }); const sc = c.closest('[role=dialog]') ? [...c.closest('[role=dialog]').querySelectorAll('*')].find((x) => x.scrollHeight > x.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(x).overflowY)) : null;
    if (sc) sc.scrollTop -= 90; else window.scrollBy(0, -260); return true; });
  M.onde = 'Início';
  if (!(await acha())) { const ver = pag.getByText(/^Ver todos/).first(); if (await ver.count()) { await ver.click(); await pag.waitForTimeout(1200); M.onde = 'Início › Precisa de atenção (Ver todos)'; } if (!(await acha())) await sai('o alerta "Conflito com o Airbnb" não existe na Demo'); }
  await pag.waitForTimeout(600);
  await foto('inicio-conflito');
  M.inicio = await pag.evaluate(() => {
    const r3 = (r) => [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3));
    const t = [...document.querySelectorAll('body *')].filter((x) => x.getClientRects().length && (x.innerText || '').trim().startsWith('Conflito com o Airbnb')).sort((a, b) => a.innerText.length - b.innerText.length)[0];
    let card = t; for (let k = 0; k < 6 && card.parentElement && !/Abrir a reserva do Hospeda/.test(card.innerText); k++) card = card.parentElement;
    const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT); let n, nada = null, periodo = null;
    while ((n = w.nextNode())) { const k = n.nodeValue.indexOf('Nada foi cancelado.'); if (k >= 0) { const rg = document.createRange(); rg.setStart(n, k); rg.setEnd(n, k + 19); nada = r3(rg.getBoundingClientRect()); }
      const m = n.nodeValue.match(/(Chalé[^·]+?)\s*·\s*(\d\d\/\d\d) a (\d\d\/\d\d)/); if (m) periodo = { chale: m[1].trim(), de: m[2], ate: m[3] }; }
    const sino = [...document.querySelectorAll('[aria-label="Atividades"]')].find((x) => x.getClientRects().length);
    return { conflito: r3(card.getBoundingClientRect()), nada, sino: sino ? r3(sino.getBoundingClientRect()) : null, periodo };
  });
  if (!M.inicio.nada || !M.inicio.sino) await sai('não achei "Nada foi cancelado." ou o sino');
  // o chalé e as datas do alerta batem com o calendário?
  const p = M.inicio.periodo || {}, nomeRes = M.calendario.reserva05_nome || '';
  M.confere = { alerta: p, calendario_reserva: nomeRes, mesmo_chale: /Pedra 05/.test(p.chale || ''), periodo_no_calendario: !!M.calendario.dias27a30 && p.de === '27/11' && p.ate === '30/11' };
  fs.mkdirSync(OUT, { recursive: true });
  for (const [n, b] of Object.entries(fotos)) fs.writeFileSync(path.join(OUT, n + '.png'), b);
  fs.writeFileSync(path.join(OUT, 'integracao.json'), JSON.stringify(M, null, 1));
  console.log(JSON.stringify(M, null, 1)); await nav.close();
})();
