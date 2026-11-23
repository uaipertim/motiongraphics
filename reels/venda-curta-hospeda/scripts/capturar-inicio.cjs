#!/usr/bin/env node
/*
 * Recaptura do Início com o alerta "Conflito com o Airbnb" (cena de 26–33 s), para quando a Demo atualizada sair.
 *   node scripts/capturar-inicio.cjs                 -> telas/inicio-conflito.png + telas/inicio-conflito.json (medidas novas)
 *   node scripts/capturar-inicio.cjs --saida <pasta> -> grava em outra pasta (teste, sem tocar nas telas do vídeo)
 *
 * Mesmo padrão do capturar.cjs: celular 390×844 a 3x, tela inteira, elementos da demonstração invisíveis.
 * RECUSA a captura (sai com erro, sem gravar) se houver na tela "não consegue ler" ou "Confira o link" (o erro de exemplo
 * do Booking que sai na próxima atualização da Demo), "não lê o calendário" ou "Confira se o link" (outro erro de exemplo, visto em
 * 23/11), ou qualquer texto proibido. Procura o alerta no Início; se não estiver na lista visível, abre "Ver todos" (em 23/11
 * o alerta só aparecia ali) e avisa que a tela é a de "Precisa de atenção". Mede: o cartão do conflito, o trecho
 * "Nada foi cancelado." e o sino (Atividades). O plano (src/plano.js) lê essas medidas, então a janela e os destaques se
 * reposicionam sozinhos.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const args = process.argv.slice(2), i = args.indexOf('--saida');
const OUT = i >= 0 ? path.resolve(args[i + 1]) : path.join(__dirname, '..', 'telas');
const RECUSA = [/não consegue ler/i, /Confira o link/i, /não lê o calendário/i, /Confira se o link/i, /fazlodigital/i, /\bDemo\b/, /Demonstra/i, /Quero usar/, /https?:\/\//i, /\.ics\b/i, /token/i, /senha/i];
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
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle' });
  await pag.getByText('Entrar na demonstração').click(); await pag.waitForTimeout(2500);
  const acha = () => pag.evaluate(() => { const e = [...document.querySelectorAll('body *')].filter((x) => x.getClientRects().length && (x.innerText || '').trim().startsWith('Conflito com o Airbnb')).sort((a, b) => a.innerText.length - b.innerText.length)[0];
    if (!e) return null; e.scrollIntoView({ block: 'center' }); return true; });
  let onde = 'Início';
  if (!(await acha())) {
    const ver = pag.getByText(/^Ver todos/).first();
    if (await ver.count()) { await ver.click(); await pag.waitForTimeout(1200); onde = 'Início › Precisa de atenção (Ver todos)'; }
    if (!(await acha())) { console.error('RECUSADA: o alerta "Conflito com o Airbnb" não está no Início nem em "Ver todos".'); await nav.close(); process.exit(1); }
  }
  console.log('alerta encontrado em:', onde); await pag.waitForTimeout(600);
  await pag.evaluate(ESCONDE); await pag.waitForTimeout(200);
  // texto visível DENTRO da tela (o que vai para o vídeo)
  const visivel = await pag.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && getComputedStyle(e).visibility !== 'hidden')
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight; }).map((e) => e.textContent).join(' '));
  const achados = RECUSA.filter((re) => re.test(visivel)).map(String);
  if (achados.length) { console.error('RECUSADA: texto proibido na tela:', achados.join(', ')); await nav.close(); process.exit(1); }
  const m = await pag.evaluate(() => {
    const r3 = (r) => [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3));
    const t = [...document.querySelectorAll('body *')].filter((x) => (x.innerText || '').trim().startsWith('Conflito com o Airbnb')).sort((a, b) => a.innerText.length - b.innerText.length)[0];
    let card = t; for (let k = 0; k < 6 && card.parentElement && !/Nada foi cancelado/.test(card.innerText); k++) card = card.parentElement;
    while (card.parentElement && /Abrir a reserva do Hospeda/.test(card.parentElement.innerText) && !/Pré-reserva|Saídas de hoje/.test(card.parentElement.innerText) && !/Abrir a reserva do Hospeda/.test(card.innerText)) card = card.parentElement;
    if (!/Abrir a reserva do Hospeda/.test(card.innerText)) card = card.parentElement;
    const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT); let n, nada = null;
    while ((n = w.nextNode())) { const k = n.nodeValue.indexOf('Nada foi cancelado.'); if (k >= 0) { const rg = document.createRange(); rg.setStart(n, k); rg.setEnd(n, k + 'Nada foi cancelado.'.length); nada = r3(rg.getBoundingClientRect()); break; } }
    const sino = [...document.querySelectorAll('[aria-label="Atividades"]')].find((x) => x.getClientRects().length);
    return { conflito: r3(card.getBoundingClientRect()), nada, sino: sino ? r3(sino.getBoundingClientRect()) : null };
  });
  if (!m.nada || !m.sino) { console.error('RECUSADA: não achei', !m.nada ? '"Nada foi cancelado."' : 'o sino'); await nav.close(); process.exit(1); }
  await pag.screenshot({ path: path.join(OUT, 'inicio-conflito.png') });
  fs.writeFileSync(path.join(OUT, 'inicio-conflito.json'), JSON.stringify({ nota: 'Medidas (px da captura 1170×2532) do Início com o alerta de conflito, feitas por scripts/capturar-inicio.cjs.',
    captura: new Date().toISOString().slice(0, 10), onde, ...m, a_recapturar: false }, null, 1));
  console.log('ok:', JSON.stringify(m)); await nav.close();
})();
