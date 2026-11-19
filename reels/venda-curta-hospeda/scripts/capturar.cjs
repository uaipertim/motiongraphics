#!/usr/bin/env node
/*
 * Capturas das telas inteiras da Demo (https://demo.fazlohospeda.com.br) no celular: 390×844 a 3x (1170×2532).
 *   node scripts/capturar.cjs   -> telas/<nome>.png + telas/medidas.json (retângulos dos elementos citados, em px da imagem)
 *
 * A tela fica inteira. Só some o que é da demonstração: o selo "Demonstração", a data do cabeçalho, o botão "Quero usar"
 * do cabeçalho, a versão e os avisos "Na demonstração…". Eles ficam invisíveis (visibility: hidden) no próprio
 * navegador: o lugar deles mostra o fundo da tela, e nada muda de posição.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = path.join(__dirname, '..', 'telas');
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
async function medir(pag, nomes) {
  return pag.evaluate((nomes) => {
    const out = {};
    const els = [...document.querySelectorAll('body *')].filter((x) => { const r = x.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight; });
    for (const [chave, texto, sobe] of nomes) {
      const e = els.filter((x) => (x.innerText || '').trim().startsWith(texto)).sort((a, b) => a.innerText.length - b.innerText.length)[0];
      if (!e) { out[chave] = null; continue; }
      let p = e; for (let i = 0; i < (sobe || 0); i++) p = p.parentElement;
      const r = p.getBoundingClientRect(); out[chave] = [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3));
    }
    return out;
  }, nomes);
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  const M = {};
  const foto = async (nome, nomes = [], rolar = null) => {
    if (rolar != null) { await pag.evaluate((y) => window.scrollTo(0, y), rolar); await pag.waitForTimeout(500); }
    const n = await pag.evaluate(ESCONDE); await pag.waitForTimeout(200);
    await pag.screenshot({ path: path.join(OUT, nome + '.png') });
    M[nome] = { escondidos: n, ...(await medir(pag, nomes)) };
    console.log(nome, n, 'escondidos');
  };
  const mais = async (nome) => { await pag.getByText('Mais', { exact: true }).click(); await pag.waitForTimeout(700); await pag.locator('[data-testid=tenant-more-menu]').getByText(nome, { exact: true }).first().click(); await pag.waitForTimeout(1500); };
  const rolaAte = async (texto, folga = 120) => { const y = await pag.evaluate(([t, f]) => { const e = [...document.querySelectorAll('body *')].filter((x) => (x.innerText || '').trim().startsWith(t)).sort((a, b) => a.innerText.length - b.innerText.length)[0]; return e.getBoundingClientRect().top + scrollY - f; }, [texto, folga]); return y; };

  await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle' });
  await pag.getByText('Entrar na demonstração').click(); await pag.waitForTimeout(2500);
  // Início
  await foto('inicio', [['titulo', 'Hoje na pousada'], ['recebido', 'Recebido hoje', 2], ['hospedados', 'Hospedados', 1], ['chegadas', 'Chegadas', 1], ['saidas', 'Saídas', 1]]);
  await foto('inicio-conflito', [['conflito', 'Conflito com o Airbnb', 3], ['nada', 'Chalé de Pedra 05 · 23/11', 0], ['booking', 'Sem leitura do Booking', 3]], await rolaAte('Conflito com o Airbnb', 260));
  await foto('inicio-chegadas', [['chegadas', 'Chegadas de hoje', 1], ['checkin', 'Fazer check-in', 0]], await rolaAte('Chegadas de hoje', 160));
  await pag.evaluate(() => window.scrollTo(0, 0));
  // Canais
  await mais('Canais');
  await foto('canais', [['texto', 'Envie a ocupação'], ['bica', 'Bica D’Água 01', 1]]);
  await foto('canais-links', [['enviar', 'Enviar para o canal', 1], ['linkativo', 'Link ativo'], ['receber', 'Receber do canal', 1], ['recebendo', 'Recebendo'], ['sincronizar', 'Sincronizar agora']], await rolaAte('Enviar para o canal', 140));
  // Calendário e o bloqueio do Airbnb
  await pag.evaluate(() => window.scrollTo(0, 0));
  await pag.getByText('Calendário', { exact: true }).last().click(); await pag.waitForTimeout(1500);
  await foto('calendario', [['airbnb', 'Airbnb', 1], ['bica01', 'Bica D’Ág', 1]]);
  await pag.getByText('Airbnb', { exact: true }).first().click(); await pag.waitForTimeout(1500);
  await foto('bloqueio', [['ocupado', 'Ocupado pelo Airbnb', 1], ['registrar', 'Registrar esta reserva no Hospeda'], ['selo', 'Airbnb']]);
  await pag.keyboard.press('Escape'); await pag.waitForTimeout(500);
  // Nova reserva: datas 20 → 22 (nenhuma acomodação com bloqueio do Airbnb nesse período) e só as livres aparecem
  await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle' });
  await pag.getByText('Entrar na demonstração').click(); await pag.waitForTimeout(2500);
  await pag.locator('button[aria-label="Nova reserva"]').first().click(); await pag.waitForTimeout(1200);
  await foto('nova', [['entrada', 'Entrada', 1]]);
  await pag.locator('input[type=text]').nth(0).click(); await pag.waitForTimeout(800);
  const dlg = pag.locator('[role=dialog]').last();
  await dlg.getByText('20', { exact: true }).first().click(); await pag.waitForTimeout(300);
  await dlg.getByText('22', { exact: true }).first().click(); await pag.waitForTimeout(300);
  await foto('nova-datas', [['confirmar', 'Confirmar período']]);
  await pag.getByText('Confirmar período').click(); await pag.waitForTimeout(1000);
  await foto('nova-livres', [['livres', 'Livres no período'], ['primeira', 'Bica D’Água 03', 2]], await rolaAte('Livres no período', 260));
  // Hospedagem da Ana Julia: comanda, saldo, check-out
  await mais('Hospedagens');
  await foto('hospedagens', [['ana', 'Ana Julia Costa', 2]]);
  await pag.locator('text=Ana Julia Costa >> visible=true').first().click(); await pag.waitForTimeout(1500);
  await foto('ficha', [['nome', 'Ana Julia Costa', 1]]);
  await foto('ficha-comanda', [['comanda', 'Comanda', 1], ['agua', 'Água Mineral', 1], ['cerveja', 'Cerveja Artesanal', 1]], await rolaAte('Comanda', 140));
  await foto('ficha-saldo', [['saldo', 'Saldo em aberto', 1], ['checkout', 'Fazer check-out'], ['libera', 'Libera com saldo zero', 1]], await rolaAte('Saldo em aberto', 300));
  // Caixa
  await mais('Caixa');
  await foto('caixa', [['esperado', 'Esperado em dinheiro', 1], ['fechar', 'Fechar caixa']]);
  await foto('caixa-formas', [['recebido', 'Recebido por forma de pagamento', 1], ['pix', 'PIX', 1]], await rolaAte('Recebido por forma de pagamento', 140));
  await pag.evaluate(() => window.scrollTo(0, 0)); await pag.waitForTimeout(400);
  await pag.getByText('Fechar caixa', { exact: true }).first().click(); await pag.waitForTimeout(1500);
  await foto('caixa-fechar', [['contado', 'Valor contado', 1], ['esperado', 'Esperado em dinheiro', 1]]);
  console.log((await pag.evaluate(() => document.body.innerText)).slice(-900));
  await pag.keyboard.press('Escape'); await pag.waitForTimeout(500);
  // Relatórios
  await mais('Relatórios');
  await foto('relatorios', [['recebimentos', 'Recebimentos', 1], ['total', 'R$ 11.626,00']], await rolaAte('Recebimentos', 200));
  await foto('relatorios-ocupacao', [['ocupacao', 'Ocupação', 1], ['hoje', 'Hoje', 1]], await rolaAte('Reservas e ocupação', 140));
  fs.writeFileSync(path.join(OUT, 'medidas.json'), JSON.stringify(M, null, 1));
  await nav.close();
})();
