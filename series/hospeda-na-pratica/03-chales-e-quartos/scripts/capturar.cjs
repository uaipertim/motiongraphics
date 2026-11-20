#!/usr/bin/env node
/*
 * Episódio 3 (Chalés e quartos): capturas da Demo no celular, 390×844 a 3x (1170×2532), tela inteira.
 *   node scripts/capturar.cjs   -> telas/<nome>.png + telas/alvos.json + telas/conferencia.json
 *
 * - Somem (visibility: hidden, sem mudar posição): o selo "Demonstração", a data do cabeçalho, "Quero usar" e
 *   "Quero usar na minha pousada".
 * - Antes de tudo, "Liberar" no Chalé de Pedra 07 (vem bloqueado na Demo): o selo "Bloqueada" tem um defeito no app
 *   (ignora as datas do bloqueio) e não pode aparecer em nenhum quadro.
 * - Antes de salvar cada captura: o texto visível da página não pode ter nada proibido, e nenhum "Bloqueada" pode
 *   estar dentro da tela. Se sobrar algo, o script para sem salvar.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = path.join(__dirname, '..', 'telas');
const PROIBIDO = [/fazlodigital/i, /\bDemo\b/, /Demonstra/i, /senha/i, /c[oó]digo/i, /token/i, /Quero usar/, /\.ics\b/i, /ical/i, /https?:\/\//i];
function preparar() {
  const alvos = [...document.querySelectorAll('body *')].filter((e) => {
    const t = (e.innerText || '').trim();
    return (e.children.length <= 3 && /^(Demonstração(Demo)?|Quero usar|Quero usar na minha pousada)$/.test(t)) ||
      /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)(-feira)?, \d+ de \w+$/.test(t) || /^FAZLO Hospeda · v[\d.]/.test(t);
  });
  alvos.forEach((e) => { e.style.visibility = 'hidden'; });
  return alvos.length;
}
function avisoNaTela() {                                          // algum aviso do app ("com sucesso", "bloqueada no período") dentro da janela?
  return [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /com sucesso|bloqueada no período|cadastrada com tarifas/.test(e.textContent || '') && getComputedStyle(e).visibility !== 'hidden')
    .map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.bottom > 0 && r.top < innerHeight).length;
}
function bloqueadaNaTela() {                                       // algum "Bloqueada" visível dentro da janela?
  return [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /Bloqueada/.test(e.textContent || '') && getComputedStyle(e).visibility !== 'hidden')
    .map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.bottom > 0 && r.top < innerHeight).length;
}
// retângulos (px da captura, 3x): [chave, texto, {card: nome, raiz: seletor, sobe, exato, n (n-ésimo), campo: rótulo}]
function medir(lista) {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const cartao = (n) => {
    const b = [...document.querySelectorAll(`[aria-label="Editar ${n}"]`)].find((x) => x.getClientRects().length); if (!b) return null;
    let p = b; while (p && !(p.innerText || '').includes('Feriado')) p = p.parentElement;
    while (p && p.parentElement && (p.parentElement.innerText.match(/\bEditar\b/g) || []).length === 1) p = p.parentElement;
    return p;
  };
  const out = {};
  for (const [k, texto, o = {}] of lista) {
    let raiz = document.body, e = null;
    if (o.raiz) raiz = [...document.querySelectorAll(o.raiz)].filter(vis).pop() || raiz;
    if (o.card) { raiz = cartao(o.card); if (!raiz) { out[k] = null; continue; } }
    if (o.campo) { const l = [...raiz.querySelectorAll('label')].find((x) => x.innerText.trim().startsWith(o.campo)); e = l && (l.control || l.parentElement.querySelector('input,textarea,select')); }
    else if (texto === '*') e = raiz;
    else {
      const cands = [...raiz.querySelectorAll('*')].filter((x) => vis(x) && (o.exato ? (x.innerText || '').trim() === texto : (x.innerText || '').trim().startsWith(texto)));
      cands.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length || a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const menor = cands.filter((x) => (x.innerText || '').length === (cands[0] && cands[0].innerText || '').length);
      e = menor[o.n || 0];
    }
    if (!e) { out[k] = null; continue; }
    for (let i = 0; i < (o.sobe || 0); i++) e = e.parentElement;
    const r = e.getBoundingClientRect(); out[k] = [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3));
  }
  return out;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  const CONF = {}, ALVOS = {};
  const espera = (ms = 900) => pag.waitForTimeout(ms);
  const foto = async (nome, alvos = []) => {
    await espera(700);
    const esc = await pag.evaluate(preparar); await espera(150);
    const texto = await pag.evaluate(() => document.body.innerText);
    const achados = PROIBIDO.filter((re) => re.test(texto)).map(String), bloq = await pag.evaluate(bloqueadaNaTela);
    if (achados.length || bloq) { console.error(`PARADO em ${nome}: ${achados.join(', ')} ${bloq ? '· "Bloqueada" visível na tela' : ''}`); await nav.close(); process.exit(1); }
    await pag.screenshot({ path: path.join(OUT, nome + '.png') });
    ALVOS[nome] = await pag.evaluate(medir, alvos);
    CONF[nome] = { escondidos: esc, proibidos: 0, bloqueada_na_tela: 0 };
    const falta = Object.entries(ALVOS[nome]).filter(([, v]) => !v).map(([k]) => k);
    console.log(nome, falta.length ? `· sem medida: ${falta.join(', ')}` : '');
  };
  const rola = (nome, y = 0.45) => pag.evaluate(([n, y]) => { const b = [...document.querySelectorAll(`[aria-label="Editar ${n}"]`)].find((x) => x.getClientRects().length); let p = b; while (p && !(p.innerText || '').includes('Feriado')) p = p.parentElement; const r = p.getBoundingClientRect(); window.scrollBy(0, r.top - innerHeight * y); }, [nome, y]);
  const topo = () => pag.evaluate(() => window.scrollTo(0, 0));
  const tira = () => pag.evaluate(() => document.activeElement && document.activeElement.blur());
  const digita = async (rotulo, s) => { const f = pag.getByLabel(rotulo); await f.click(); await f.press('Control+A'); await f.press('Backspace'); await f.type(s, { delay: 40 }); };
  const naLista = async () => { await pag.getByText('Mais', { exact: true }).click(); await espera(800); await pag.locator('[data-testid=tenant-more-menu]').getByText('Acomodações', { exact: true }).first().click(); await espera(1800); };
  const CARD = (n) => [[`card`, '*', { card: n }], ['editar', 'Editar', { card: n, exato: true }], ['bloquear', 'Bloquear', { card: n, exato: true }], ['desativar', 'Desativar', { card: n, exato: true }],
    ['estado', 'Ativa', { card: n, exato: true }], ['tipo', '', { card: n, sobe: 0 }], ['semana', 'Semana', { card: n, exato: true, sobe: 1 }], ['fimdesemana', 'Fim de semana', { card: n, exato: true, sobe: 1 }], ['feriado', 'Feriado', { card: n, exato: true, sobe: 1 }]];

  await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle' });
  await pag.getByText('Entrar na demonstração').click(); await espera(2500);
  // preparação: libera o Chalé de Pedra 07 e volta ao Início (o aviso some)
  await naLista();
  await pag.getByRole('button', { name: 'Liberar Chalé de Pedra 07' }).click(); await espera(1200);
  await pag.getByRole('button', { name: 'Início', exact: true }).filter({ visible: true }).first().click(); await espera(1500); await topo();

  await foto('inicio', [['mais', 'Mais', { exato: true, sobe: 1 }]]);
  await pag.getByText('Mais', { exact: true }).click(); await espera();
  await foto('menu-mais', [['acomodacoes', 'Acomodações', { exato: true, raiz: '[data-testid=tenant-more-menu]' }]]);
  await pag.locator('[data-testid=tenant-more-menu]').getByText('Acomodações', { exact: true }).first().click(); await espera(1800);
  await foto('acomodacoes', [['titulo', 'Acomodações', { exato: true }], ['ativas', '10 ativas', { exato: true }], ['nova', 'Nova acomodação', {}], ...CARD('Bica D’Água 01'),
    ['tipo', 'Suíte · até 2 pessoas', { card: 'Bica D’Água 01', exato: true }]]);
  // EDITAR: Ipê 08, fim de semana de R$ 520,00 para R$ 550,00
  await rola('Ipê 08'); await espera(400);
  await foto('acomodacoes-ipe08', CARD('Ipê 08'));
  await pag.getByRole('button', { name: 'Editar Ipê 08' }).click(); await espera(900);
  const FORM = [['nome', '', { campo: 'Nome' }], ['categoria', '', { campo: 'Categoria' }], ['capacidade', '', { campo: 'Capacidade' }], ['tsemana', '', { campo: 'Tarifa de semana' }],
    ['tfim', '', { campo: 'Tarifa de fim de semana' }], ['tferiado', '', { campo: 'Tarifa de feriado' }], ['aviso', 'As três tarifas', { raiz: '[role=dialog]' }], ['salvar', 'Salvar acomodação', { exato: true, raiz: '[role=dialog]' }]];
  await foto('editar-ipe08', FORM);
  await digita('Tarifa de fim de semana', '550'); await tira();
  await foto('editar-ipe08-550', FORM);
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Salvar acomodação' }).click(); await espera(1300);
  await topo(); await espera(400);
  await foto('acomodacoes-ipe08-550-topo', [['aviso', 'Acomodação atualizada com sucesso.', {}], ['nova', 'Nova acomodação', {}]]);
  await rola('Ipê 08'); await espera(400);
  await foto('acomodacoes-ipe08-550', CARD('Ipê 08'));
  // a lista limpa, no mesmo estado (Ipê 08 já com R$ 550,00), sem nenhum aviso na tela: sai para o Início e volta
  await pag.getByRole('button', { name: 'Início', exact: true }).filter({ visible: true }).first().click(); await espera(1200);
  await naLista(); await topo(); await espera(400);
  if (await pag.evaluate(avisoNaTela)) { console.error('PARADO: aviso na lista limpa'); await nav.close(); process.exit(1); }
  await foto('acomodacoes-limpa', [['nova', 'Nova acomodação', {}], ['ativas', '10 ativas', { exato: true }]]);
  CONF['acomodacoes-limpa'].aviso_na_tela = 0;
  // NOVA: Chalé Jabuticaba
  await topo(); await espera(400);
  await pag.getByRole('button', { name: 'Nova acomodação' }).click(); await espera(900);
  await foto('nova', FORM);
  await digita('Nome', 'Chalé Jabuticaba'); await digita('Capacidade', '4');
  await digita('Tarifa de semana', '420'); await digita('Tarifa de fim de semana', '520'); await digita('Tarifa de feriado/período especial', '620'); await tira();
  await foto('nova-preenchida', FORM);
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Salvar acomodação' }).click(); await espera(1300);
  await topo(); await espera(400);
  await foto('acomodacoes-jabuticaba-topo', [['aviso', 'Acomodação "Chalé Jabuticaba"', {}], ['todas', 'Todas', {}]]);
  // BLOQUEAR: Chalé de Pedra 06, 26 a 28/11, "Pintura da varanda" (o cartão depois NÃO é capturado)
  await rola('Chalé de Pedra 06'); await espera(400);
  await foto('acomodacoes-pedra06', CARD('Chalé de Pedra 06'));
  await pag.getByRole('button', { name: 'Bloquear Chalé de Pedra 06' }).click(); await espera(900);
  const BLQ = [['inicio', '', { campo: 'Início' }], ['fim', '', { campo: 'Fim' }], ['motivo', '', { campo: 'Motivo do bloqueio' }], ['bloquear', 'Bloquear', { exato: true, raiz: '[role=dialog]' }], ['texto', 'As duas datas', { raiz: '[role=dialog]' }]];
  await foto('bloquear-pedra06', BLQ);
  await pag.getByLabel('Início').click(); await espera(700);
  const painel = pag.locator('[data-testid=date-range-panel]');
  const DIAS = [['d26', '26', { exato: true, raiz: '[data-testid=date-range-panel]' }], ['d28', '28', { exato: true, raiz: '[data-testid=date-range-panel]' }], ['confirmar', 'Confirmar período', { exato: true, raiz: '[data-testid=date-range-panel]' }], ['periodo', '26/11 → 28/11', { raiz: '[data-testid=date-range-panel]' }]];
  await foto('bloquear-periodo', DIAS);
  await painel.getByText('26', { exact: true }).first().click(); await espera(400);
  await foto('bloquear-periodo-26', DIAS);
  await painel.getByText('28', { exact: true }).first().click(); await espera(400);
  await foto('bloquear-periodo-26-28', DIAS);
  await painel.getByRole('button', { name: 'Confirmar período' }).click(); await espera(600);
  await foto('bloquear-pedra06-datas', BLQ);
  await pag.getByLabel('Motivo do bloqueio').fill('Pintura da varanda'); await tira();
  await foto('bloquear-pedra06-preenchido', BLQ);
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Bloquear', exact: true }).click(); await espera(1300);
  await topo(); await espera(400);
  await foto('acomodacoes-pedra06-aviso', [['aviso', 'Chalé de Pedra 06 bloqueada', {}]]);
  // DESATIVAR: Chalé Serra 01 (enquadrado sem o Chalé de Pedra 06 na tela)
  await rola('Chalé Serra 01', 0.42); await espera(400);
  await foto('acomodacoes-serra01', CARD('Chalé Serra 01'));
  await pag.getByRole('button', { name: 'Desativar acomodação Chalé Serra 01' }).click(); await espera(900);
  await foto('desativar-serra01', [['titulo', 'Desativar Chalé Serra 01?', { raiz: '[role=dialog]' }], ['reserva', 'Chalé Serra 01 tem 1 reserva futura', { raiz: '[role=dialog]', sobe: 1 }], ['historico', 'O histórico continua', { raiz: '[role=dialog]', sobe: 1 }], ['desativar', 'Desativar', { exato: true, raiz: '[role=dialog]' }]]);
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Desativar', exact: true }).click(); await espera(1300);
  await rola('Chalé Serra 01', 0.42); await espera(400);
  await foto('acomodacoes-serra01-inativa', [...CARD('Chalé Serra 01').filter(([k]) => k !== 'estado' && k !== 'bloquear' && k !== 'desativar'), ['estado', 'Inativa', { card: 'Chalé Serra 01', exato: true }], ['reativar', 'Reativar', { card: 'Chalé Serra 01', exato: true }]]);
  fs.writeFileSync(path.join(OUT, 'alvos.json'), JSON.stringify(ALVOS, null, 1));
  fs.writeFileSync(path.join(OUT, 'conferencia.json'), JSON.stringify({ data: new Date().toISOString().slice(0, 10), proibidos: PROIBIDO.map(String), regra_extra: 'nenhum "Bloqueada" dentro da tela', telas: CONF }, null, 1));
  await nav.close();
})();
