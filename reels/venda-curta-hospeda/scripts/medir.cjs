// Mede (em px da captura, 1170×2532) os elementos que a narração cita, refazendo a mesma navegação do capturar.cjs.
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ALVOS = {
  calendario: ['Airbnb', 'Bica D’Ág'],
  'canais-links': ['Link ativo', 'Recebendo', 'Sincronizar agora', 'Enviar para o canal', 'Receber do canal'],
  'inicio-conflito': ['Conflito com o Airbnb', 'Abrir a reserva do Hospeda'],
  'nova-datas': ['20', '22', 'Confirmar período', '20/11 → 22/11'],
  'nova-livres': ['Livres no período', 'Entrada', 'Bica D’Água 03'],
  checkin: ['Fazer check-in', 'Saldo a receber no check-in', 'Helena Duarte'],
  ficha: ['Ana Julia Costa', 'Saldo em aberto', 'Comanda em aberto'],
  'ficha-comanda': ['Comanda', 'Água Mineral Sem Gás 500ml', 'Cerveja Artesanal Long Neck', 'Total de consumos'],
  'ficha-saldo': ['Saldo em aberto', 'R$ 38,00', 'Fazer check-out', 'Libera com saldo zero', 'Receber comanda'],
  caixa: ['Fechar caixa', 'Esperado em dinheiro', 'Recebido por forma de pagamento'],
  'caixa-formas': ['Recebido por forma de pagamento', 'PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito'],
  'relatorios-topo': ['Recebimentos', 'R$ 11.626,00', 'recebido neste mês'],
  'relatorios-ocupacao': ['Ocupação', 'Hoje', 'Reservas no período'],
};
async function medir(pag, nomes) {
  return pag.evaluate((nomes) => {
    const out = {};
    const vis = [...document.querySelectorAll('body *')].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 2 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(x).visibility !== 'hidden'; });
    for (const n of nomes) {
      const e = vis.filter((x) => (x.innerText || '').trim().startsWith(n)).sort((a, b) => a.innerText.length - b.innerText.length)[0];
      if (!e) { out[n] = null; continue; }
      const r = e.getBoundingClientRect();
      let card = null;
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p), b = p.getBoundingClientRect();
        if ((parseFloat(cs.borderTopLeftRadius) >= 10 || cs.borderTopWidth !== '0px') && b.width < 380) { card = [b.left, b.top, b.right, b.bottom].map((v) => Math.round(v * 3)); break; }
      }
      out[n] = { el: [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3)), card };
    }
    return out;
  }, nomes);
}
(async () => {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  const M = {};
  const C = fs.readFileSync(path.join(__dirname, 'capturar.cjs'), 'utf8');
  const ESCONDE = eval('(' + C.match(/const ESCONDE = (\(\) => \{[\s\S]*?\n\};)/)[1].replace(/;$/, '') + ')');
  const m = async (nome, rolar) => { if (rolar != null) { await pag.evaluate((y) => window.scrollTo(0, y), rolar); await pag.waitForTimeout(500); } await pag.evaluate(ESCONDE); M[nome] = await medir(pag, ALVOS[nome]); };
  const mais = async (nome) => { await pag.getByText('Mais', { exact: true }).click(); await pag.waitForTimeout(700); await pag.locator('[data-testid=tenant-more-menu]').getByText(nome, { exact: true }).first().click(); await pag.waitForTimeout(1500); };
  const rolaAte = async (texto, folga) => pag.evaluate(([t, f]) => { const e = [...document.querySelectorAll('body *')].filter((x) => (x.innerText || '').trim().startsWith(t)).sort((a, b) => a.innerText.length - b.innerText.length)[0]; return e.getBoundingClientRect().top + scrollY - f; }, [texto, folga]);
  const entra = async () => { await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle' }); await pag.getByText('Entrar na demonstração').click(); await pag.waitForTimeout(2500); };
  await entra();
  await m('inicio-conflito', await rolaAte('Conflito com o Airbnb', 260));
  await pag.evaluate(() => window.scrollTo(0, 0));
  await mais('Canais'); await m('canais-links', await rolaAte('Enviar para o canal', 140));
  await pag.evaluate(() => window.scrollTo(0, 0));
  await pag.getByText('Calendário', { exact: true }).last().click(); await pag.waitForTimeout(1500); await m('calendario');
  await entra();
  await pag.locator('button[aria-label="Nova reserva"]').first().click(); await pag.waitForTimeout(1200);
  await pag.locator('input[type=text]').nth(0).click(); await pag.waitForTimeout(800);
  const dlg = pag.locator('[role=dialog]').last();
  await dlg.getByText('20', { exact: true }).first().click(); await pag.waitForTimeout(300);
  await dlg.getByText('22', { exact: true }).first().click(); await pag.waitForTimeout(300);
  await m('nova-datas');
  await pag.getByText('Confirmar período').click(); await pag.waitForTimeout(1000);
  await m('nova-livres', await rolaAte('Livres no período', 260));
  await entra();
  await pag.getByText('Fazer check-in', { exact: true }).first().click(); await pag.waitForTimeout(1500); await m('checkin');
  await entra();
  await mais('Hospedagens'); await pag.locator('text=Ana Julia Costa >> visible=true').first().click(); await pag.waitForTimeout(1500);
  await m('ficha'); await m('ficha-comanda', await rolaAte('Comanda', 140)); await m('ficha-saldo', await rolaAte('Saldo em aberto', 300));
  await mais('Caixa'); await m('caixa'); await m('caixa-formas', await rolaAte('Recebido por forma de pagamento', 140));
  await entra(); await mais('Relatórios'); await m('relatorios-topo'); await m('relatorios-ocupacao', await rolaAte('Reservas e ocupação', 140));
  fs.writeFileSync(path.join(__dirname, '..', 'telas', 'alvos.json'), JSON.stringify(M, null, 1));
  for (const [k, v] of Object.entries(M)) { console.log('== ' + k); for (const [n, r] of Object.entries(v)) console.log('  ', n, r && JSON.stringify(r)); }
  await nav.close();
})();
