#!/usr/bin/env node
/*
 * Episódio 4 (Produtos da comanda): capturas da Demo no celular, 390×844 a 3x (1170×2532), tela inteira.
 *   node scripts/capturar.cjs   -> telas/<nome>.png + telas/alvos.json + telas/conferencia.json
 *
 * - Somem (visibility: hidden, sem mudar posição): o selo "Demonstração", a data do cabeçalho, "Quero usar" e
 *   "Quero usar na minha pousada".
 * - Antes de salvar cada captura: o texto visível da página não pode ter nada proibido. As capturas "limpas" (as que vêm
 *   antes de um toque no topo da lista ou no "+ Novo produto ou serviço") são recusadas se houver aviso do app na tela.
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
  return [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /com sucesso/.test(e.textContent || '') && getComputedStyle(e).visibility !== 'hidden')
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
    let p = b; while (p && !(p.innerText || '').includes('R$')) p = p.parentElement;
    while (p && p.parentElement && (p.parentElement.innerText.match(/\bEditar\b/g) || []).length === 1) p = p.parentElement;
    return p;
  };
  const out = {};
  for (const [k, texto, o = {}] of lista) {
    let raiz = document.body, e = null;
    if (o.raiz) raiz = [...document.querySelectorAll(o.raiz)].filter(vis).pop() || raiz;
    if (o.card) { raiz = cartao(o.card); if (!raiz) { out[k] = null; continue; } }
    if (o.campo) { const l = [...raiz.querySelectorAll('label')].find((x) => x.innerText.trim().startsWith(o.campo)); e = l && (l.control || l.parentElement.querySelector('input,textarea,select')); }
    else if (o.ph) e = [...raiz.querySelectorAll('input')].find((x) => x.placeholder === o.ph && vis(x));
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
  const foto = async (nome, alvos = [], limpa = false) => {
    await espera(700);
    const esc = await pag.evaluate(preparar); await espera(150);
    const texto = await pag.evaluate(() => document.body.innerText);
    const achados = PROIBIDO.filter((re) => re.test(texto)).map(String), av = limpa ? await pag.evaluate(avisoNaTela) : 0;
    if (achados.length || av) { console.error(`PARADO em ${nome}: ${achados.join(', ')} ${av ? '· aviso do app na tela (captura limpa)' : ''}`); await nav.close(); process.exit(1); }
    await pag.screenshot({ path: path.join(OUT, nome + '.png') });
    ALVOS[nome] = await pag.evaluate(medir, alvos);
    CONF[nome] = { escondidos: esc, proibidos: 0, ...(limpa ? { limpa: true, aviso_na_tela: 0 } : {}) };
    const falta = Object.entries(ALVOS[nome]).filter(([, v]) => !v).map(([k]) => k);
    console.log(nome, falta.length ? `· sem medida: ${falta.join(', ')}` : '');
  };
  const rola = (nome, y = 0.45) => pag.evaluate(([n, y]) => { const b = [...document.querySelectorAll(`[aria-label="Editar ${n}"]`)].find((x) => x.getClientRects().length); let p = b; while (p && !(p.innerText || '').includes('R$')) p = p.parentElement; const r = p.getBoundingClientRect(); window.scrollBy(0, r.top - innerHeight * y); }, [nome, y]);
  const topo = () => pag.evaluate(() => window.scrollTo(0, 0));
  const tira = () => pag.evaluate(() => document.activeElement && document.activeElement.blur());
  const digita = async (rotulo, s) => { const f = pag.getByLabel(rotulo, { exact: true }); await f.click(); await f.press('Control+A'); await f.press('Backspace'); await f.type(s, { delay: 40 }); };
  const inicio = async () => { await pag.getByRole('button', { name: 'Início', exact: true }).filter({ visible: true }).first().click(); await espera(1200); };
  const naLista = async () => { await pag.getByText('Mais', { exact: true }).click(); await espera(800); await pag.locator('[data-testid=tenant-more-menu]').getByText('Produtos e serviços', { exact: true }).first().click(); await espera(1800); await topo(); };
  const BUSCA = 'Buscar produto ou serviço';
  const CARD = (n) => [['card', '*', { card: n }], ['editar', 'Editar', { card: n, exato: true }], ['desativar', 'Desativar', { card: n, exato: true }],
    ['estado', 'Ativo', { card: n, exato: true }], ['preco', 'R$', { card: n }]];
  const FORM = [['nome', '', { campo: 'Nome' }], ['categoria', '', { campo: 'Categoria' }], ['preco', '', { campo: 'Preço' }], ['atual', 'Preço atual', { raiz: '[role=dialog]' }],
    ['descricao', '', { campo: 'Descrição' }], ['ativo', 'Ativo', { exato: true, raiz: '[role=dialog]', sobe: 1 }], ['nota', 'Preço novo vale só', { raiz: '[role=dialog]', sobe: 1 }],
    ['salvar', 'Salvar', { exato: true, raiz: '[role=dialog]' }]];

  await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle' });
  await pag.getByText('Entrar na demonstração').click(); await espera(2500); await topo();
  await foto('inicio', [['mais', 'Mais', { exato: true, sobe: 1 }]]);
  await pag.getByText('Mais', { exact: true }).click(); await espera();
  await foto('menu-mais', [['produtos', 'Produtos e serviços', { exato: true, raiz: '[data-testid=tenant-more-menu]' }]]);
  await pag.locator('[data-testid=tenant-more-menu]').getByText('Produtos e serviços', { exact: true }).first().click(); await espera(1800); await topo();
  const LISTA = [['titulo', 'Produtos e serviços', { exato: true }], ['novo', 'Novo produto ou serviço', {}], ['contagem', '9 itens em 5 categorias', { exato: true }], ['busca', '', { ph: BUSCA }],
    ['bebidas', 'Bebidas · 4', { exato: true }], ['alimentos', 'Alimentos · 2', { exato: true }], ['restaurante', 'Restaurante · 1', { exato: true }], ['experiencias', 'Experiências · 1', { exato: true }]];
  await foto('produtos', LISTA, true);
  // a lista rolada até as outras categorias (Alimentos, Restaurante, Experiências)
  await pag.evaluate(() => { const h = [...document.querySelectorAll('body *')].filter((e) => (e.innerText || '').trim().replace(/\s+/g, ' ') === 'Alimentos · 2' && e.getClientRects().length).pop(); window.scrollBy(0, h.getBoundingClientRect().top - 150); }); await espera(500);
  await foto('produtos-categorias', [['alimentos', 'Alimentos · 2', { exato: true }], ['restaurante', 'Restaurante · 1', { exato: true }], ['experiencias', 'Experiências · 1', { exato: true }]], true);
  await topo(); await espera(400);
  // BUSCA "cerv"
  await pag.getByPlaceholder(BUSCA).click(); await pag.getByPlaceholder(BUSCA).type('cerv', { delay: 60 }); await espera(700); await tira();
  await foto('produtos-busca', [['busca', '', { ph: BUSCA }], ['bebidas1', 'Bebidas · 1', { exato: true }], ...CARD('Cerveja Artesanal Long Neck')], true);
  // EDITAR: Cerveja, de R$ 14,00 para R$ 16,00
  await pag.getByRole('button', { name: 'Editar Cerveja Artesanal Long Neck' }).click(); await espera(900);
  await foto('editar-cerveja', FORM);
  await digita('Preço', '16'); await tira();
  await foto('editar-cerveja-16', FORM);
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Salvar', exact: true }).click(); await espera(1300);
  const filtro = await pag.getByPlaceholder(BUSCA).inputValue(); console.log('  busca depois de salvar:', JSON.stringify(filtro));
  await foto('produtos-cerveja-16-aviso', [['aviso', 'Produto "Cerveja Artesanal Long Neck"', {}], ...CARD('Cerveja Artesanal Long Neck')]);
  // DEPOIS (limpa): sai, volta e busca de novo
  await inicio(); await naLista();   // a Demo guarda a busca ao sair e voltar: limpa antes de digitar
  await pag.getByPlaceholder(BUSCA).fill(''); await pag.getByPlaceholder(BUSCA).click(); await pag.getByPlaceholder(BUSCA).type('cerv', { delay: 60 }); await espera(700); await tira();
  await foto('produtos-busca-16', [['busca', '', { ph: BUSCA }], ...CARD('Cerveja Artesanal Long Neck')], true);
  // NOVO: Pão de queijo (a lista limpa antes do toque no + Novo produto ou serviço)
  await pag.getByPlaceholder(BUSCA).fill(''); await espera(600); await tira(); await topo();
  await foto('produtos-limpa', LISTA, true);
  await pag.getByRole('button', { name: 'Novo produto ou serviço' }).click(); await espera(900);
  await foto('novo', FORM.filter(([k]) => k !== 'atual'));
  await digita('Nome', 'Pão de queijo');
  await foto('novo-nome', FORM.filter(([k]) => k !== 'atual'));
  await pag.getByLabel('Categoria').selectOption('Lanches'); await espera(300);
  await digita('Preço', '12'); await digita('Descrição (opcional)', 'Porção com 8 unidades'); await tira();
  await foto('novo-preenchido', FORM.filter(([k]) => k !== 'atual'));
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Salvar', exact: true }).click(); await espera(1300); await topo();
  await foto('produtos-pao-aviso', [['aviso', 'Produto "Pão de queijo"', {}]]);
  // DESATIVAR: Refrigerante Lata 350ml (antes e depois limpos, no mesmo enquadramento)
  await inicio(); await naLista(); await rola('Refrigerante Lata 350ml', 0.42); await espera(400);
  await foto('produtos-refrigerante', CARD('Refrigerante Lata 350ml'), true);
  await pag.getByRole('button', { name: 'Desativar Refrigerante Lata 350ml' }).click(); await espera(900);
  await foto('desativar-refrigerante', [['titulo', 'Desativar Refrigerante', { raiz: '[role=dialog]' }], ['texto', 'Refrigerante Lata 350ml deixa de aparecer', { raiz: '[role=dialog]', sobe: 1 }], ['desativar', 'Desativar', { exato: true, raiz: '[role=dialog]' }]]);
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Desativar', exact: true }).click(); await espera(1300);
  await inicio(); await naLista(); await rola('Refrigerante Lata 350ml', 0.42); await espera(400);
  await foto('produtos-refrigerante-inativo', [...CARD('Refrigerante Lata 350ml').filter(([k]) => k !== 'estado' && k !== 'desativar'), ['estado', 'Inativo', { card: 'Refrigerante Lata 350ml', exato: true }], ['reativar', 'Reativar', { card: 'Refrigerante Lata 350ml', exato: true }]], true);
  fs.writeFileSync(path.join(OUT, 'alvos.json'), JSON.stringify(ALVOS, null, 1));
  fs.writeFileSync(path.join(OUT, 'conferencia.json'), JSON.stringify({ data: new Date().toISOString().slice(0, 10), proibidos: PROIBIDO.map(String), regra_extra: 'capturas "limpa": nenhum aviso do app dentro da tela', telas: CONF }, null, 1));
  await nav.close();
})();
