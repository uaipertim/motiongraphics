#!/usr/bin/env node
/*
 * Episódio 2 (Sua equipe no Hospeda): capturas da Demo no celular, 390×844 a 3x (1170×2532), tela inteira.
 *   node scripts/capturar.cjs   -> telas/<nome>.png + telas/conferencia.json
 *
 * - Somem (visibility: hidden, sem mudar posição): o selo "Demonstração", a data do cabeçalho, "Quero usar" e
 *   "Quero usar na minha pousada".
 * - Só o TEXTO exibido é trocado (aprovado em 20/11/2026): os usuários da Demo usam e-mails reais.
 * - Antes de salvar, o texto visível da página é conferido; se sobrar algo proibido, a troca é refeita e a página
 *   conferida de novo. Se ainda sobrar, o script para sem salvar.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = path.join(__dirname, '..', 'telas');
const TROCAS = [
  ['demo@fazlodigital.com.br', 'paulo@pousadadaserra.exemplo'], ['joao@fazlodigital.com.br', 'joao@pousadadaserra.exemplo'],
  ['mariana@fazlodigital.com.br', 'mariana@pousadadaserra.exemplo'],
  ['Administrador Demo', 'Paulo Andrade'], ['João Caixa', 'João Pereira'], ['Mariana Recepção', 'Mariana Costa'],
];
const INICIAIS = { AD: 'PA', JC: 'JP', MR: 'MC' };
const PROIBIDO = [/fazlodigital/i, /\bDemo\b/, /Demonstra/i, /Jo[aã]o Caixa/, /Mariana Recep/, /Recepção/, /senha/i, /c[oó]digo/i, /token/i, /Quero usar/];
function preparar([TROCAS, INICIAIS]) {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, trocas = 0;
  while ((n = w.nextNode())) {
    let v = n.nodeValue;
    for (const [a, b] of TROCAS) v = v.split(a).join(b);
    if (INICIAIS[v.trim()] && n.parentElement && n.parentElement.children.length === 0) v = v.replace(v.trim(), INICIAIS[v.trim()]);
    if (v !== n.nodeValue) { n.nodeValue = v; trocas++; }
  }
  const alvos = [...document.querySelectorAll('body *')].filter((e) => {
    const t = (e.innerText || '').trim();
    return (e.children.length <= 3 && /^(Demonstração(Demo)?|Quero usar|Quero usar na minha pousada)$/.test(t)) ||
      /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)(-feira)?, \d+ de \w+$/.test(t) || /^FAZLO Hospeda · v[\d.]/.test(t);
  });
  alvos.forEach((e) => { e.style.visibility = 'hidden'; });
  return { trocas, escondidos: alvos.length };
}
// Retângulos (px da captura, 3x) dos elementos citados no vídeo: [chave, texto, {em: nome da pessoa, sobe, exato}]
function medir(lista) {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== 'hidden'; };
  const cartao = (src) => {                                      // o cartão inteiro da pessoa
    const re = new RegExp(src);
    for (const b of document.querySelectorAll('button')) {
      if (!/^(Alterar papel)$/.test(b.innerText.trim()) || !b.getClientRects().length) continue;
      let p = b; while (p && !re.test(p.innerText || '')) p = p.parentElement;
      if (!p || (p.innerText.match(/Alterar papel/g) || []).length !== 1) continue;
      while (p.parentElement && (p.parentElement.innerText.match(/Alterar papel/g) || []).length === 1 && !/Uma pessoa só pode|Convidar usuário|Nenhum usuário/.test(p.parentElement.innerText)) p = p.parentElement;
      return p;
    }
    return null;
  };
  const out = {};
  for (const [k, texto, o = {}] of lista) {
    let raiz = document.body;
    if (o.raiz) raiz = [...document.querySelectorAll(o.raiz)].filter(vis).pop() || raiz;
    if (o.em) { raiz = cartao(o.em); if (!raiz) { out[k] = null; continue; } }
    let e;
    if (texto === '*') e = raiz;
    else {
      const cands = [...raiz.querySelectorAll('*')].filter((x) => vis(x) && (o.exato ? (x.innerText || x.placeholder || '').trim() === texto : ((x.innerText || '').trim().startsWith(texto) || x.placeholder === texto)));
      e = cands.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
    }
    if (!e) { out[k] = null; continue; }
    for (let i = 0; i < (o.sobe || 0); i++) e = e.parentElement;
    if (o.label) e = e.closest('label') || e;
    const r = e.getBoundingClientRect(); out[k] = [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3));
  }
  return out;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  const CONF = {};
  const espera = (ms = 900) => pag.waitForTimeout(ms);
  const ALVOS = {};
  const foto = async (nome, alvos = []) => {
    await espera(700);
    let r, achados = [];
    for (let i = 0; i < 3; i++) {
      r = await pag.evaluate(preparar, [TROCAS, INICIAIS]); await espera(150);
      const texto = await pag.evaluate(() => document.body.innerText);
      achados = PROIBIDO.filter((re) => re.test(texto)).map(String);
      if (!achados.length) break;
    }
    if (achados.length) { console.error(`PARADO em ${nome}: sobrou ${achados.join(', ')}`); await nav.close(); process.exit(1); }
    await pag.screenshot({ path: path.join(OUT, nome + '.png') });
    CONF[nome] = { ...r, proibidos: 0 };
    ALVOS[nome] = await pag.evaluate(medir, alvos);
    const falta = Object.entries(ALVOS[nome]).filter(([, v]) => !v).map(([k]) => k);
    if (falta.length) console.error(`  ${nome}: sem medida para ${falta.join(', ')}`);
    console.log(nome, JSON.stringify(CONF[nome]));
  };
  // o botão (rótulo) dentro do cartão da pessoa: o menor bloco que contém o nome e um único "Alterar papel"
  const botao = async (re, rotulo) => {
    const ok = await pag.evaluate(([src, rotulo]) => {
      document.querySelectorAll('[data-alvo]').forEach((e) => e.removeAttribute('data-alvo'));
      const re = new RegExp(src);
      for (const b of document.querySelectorAll('button')) {
        if (b.innerText.trim() !== rotulo || !b.getClientRects().length || getComputedStyle(b).visibility === 'hidden') continue;
        let p = b; while (p && !re.test(p.innerText || '')) p = p.parentElement;
        if (p && (p.innerText.match(/Alterar papel/g) || []).length === 1) { b.setAttribute('data-alvo', '1'); return true; }
      }
      return false;
    }, [re.source, rotulo]);
    if (!ok) throw new Error(`botão ${rotulo} de ${re} não encontrado`);
    return pag.locator('[data-alvo]');
  };
  const centraliza = (loc) => loc.evaluate((e) => e.scrollIntoView({ block: 'center' }));

  await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle' });
  await pag.getByText('Entrar na demonstração').click(); await espera(2500);
  const PAPEIS = [['admin', 'Administrador'], ['op', 'Operação'], ['cx', 'Caixa']];
  const opcoes = PAPEIS.map(([k, n]) => [`opt-${k}`, n, { exato: true, raiz: '[role=dialog]', label: true }]);
  await foto('inicio', [['mais', 'Mais', { exato: true, sobe: 1 }]]);
  await pag.getByText('Mais', { exact: true }).click(); await espera();
  await foto('menu-mais', [['usuarios', 'Usuários', { exato: true, raiz: '[data-testid=tenant-more-menu]', sobe: 1 }]]);
  await pag.locator('[data-testid=tenant-more-menu]').getByText('Usuários', { exact: true }).first().click(); await espera(2000);
  await foto('usuarios', [['titulo', 'Usuários', { exato: true }], ['ativos', '3 ativos', { exato: true }], ['convidar', 'Convidar usuário', { sobe: 0 }],
    ['paulo', '*', { em: 'Administrador Demo|Paulo Andrade' }], ['joao', '*', { em: 'João (Caixa|Pereira)' }], ['mariana', '*', { em: 'Mariana (Recepção|Costa)' }],
    ['papel-paulo', 'Administrador', { em: 'Administrador Demo|Paulo Andrade', exato: true }], ['papel-joao', 'Caixa', { em: 'João (Caixa|Pereira)', exato: true }],
    ['papel-mariana', 'Operação', { em: 'Mariana (Recepção|Costa)', exato: true }]]);
  await pag.getByRole('button', { name: 'Convidar usuário' }).click();
  await foto('convidar', [['nome', 'Nome completo'], ['email', 'nome@email.com'], ...opcoes, ['enviar', 'Enviar convite', { exato: true, raiz: '[role=dialog]' }]]);
  await pag.getByPlaceholder('Nome completo').fill('Carla Mendes');
  await pag.getByPlaceholder('nome@email.com').fill('carla@pousadadaserra.exemplo');
  await pag.locator('input[value=operations]').check({ force: true });
  await foto('convidar-preenchido', [...opcoes, ['desc-op', 'Reservas, hospedagens', { raiz: '[role=dialog]' }], ['enviar', 'Enviar convite', { exato: true, raiz: '[role=dialog]' }]]);
  await pag.getByRole('button', { name: 'Enviar convite' }).click(); await espera(1200);
  await foto('usuarios-convite', [['aviso', 'Convite registrado', {}], ['ativos', '4 ativos', { exato: true }], ['carla', '*', { em: 'Carla Mendes' }]]);
  // Alterar papel: João Pereira, de Caixa para Operação
  await centraliza(await botao(/João (Caixa|Pereira)/, 'Alterar papel')); await espera(400);
  await foto('usuarios-joao', [['joao', '*', { em: 'João (Caixa|Pereira)' }], ['alterar', 'Alterar papel', { em: 'João (Caixa|Pereira)', exato: true }], ['papel', 'Caixa', { em: 'João (Caixa|Pereira)', exato: true }]]);
  await (await botao(/João (Caixa|Pereira)/, 'Alterar papel')).click();
  await foto('alterar-joao', [...opcoes, ['salvar', 'Salvar papel', { exato: true, raiz: '[role=dialog]' }]]);
  await pag.locator('[role=dialog] input[value=operations]').check({ force: true });
  await foto('alterar-joao-operacao', [...opcoes, ['salvar', 'Salvar papel', { exato: true, raiz: '[role=dialog]' }]]);
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Salvar papel', exact: true }).click(); await espera(1200);
  await pag.evaluate(() => window.scrollTo(0, 0)); await espera(400);
  await foto('usuarios-joao-operacao-topo', [['aviso', 'Usuário atualizado com sucesso.', {}]]);
  await centraliza(await botao(/João (Caixa|Pereira)/, 'Alterar papel')); await espera(400);
  await foto('usuarios-joao-operacao', [['joao', '*', { em: 'João (Caixa|Pereira)' }], ['papel', 'Operação', { em: 'João (Caixa|Pereira)', exato: true }]]);
  // Desativar: Mariana Costa
  await centraliza(await botao(/Mariana (Recepção|Costa)/, 'Desativar')); await espera(400);
  await foto('usuarios-mariana', [['mariana', '*', { em: 'Mariana (Recepção|Costa)' }], ['desativar', 'Desativar', { em: 'Mariana (Recepção|Costa)', exato: true }]]);
  await (await botao(/Mariana (Recepção|Costa)/, 'Desativar')).click();
  await foto('desativar-mariana', [['titulo', 'Desativar Mariana', {}], ['texto', 'Mariana Costa perde o acesso', {}], ['texto0', 'Mariana Recepção perde o acesso', {}], ['desativar', 'Desativar', { exato: true, raiz: '[role=dialog]' }]]);
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Desativar', exact: true }).click(); await espera(1200);
  await centraliza(await botao(/Mariana (Recepção|Costa)/, 'Reativar')); await espera(400);
  await foto('usuarios-mariana-inativa', [['mariana', '*', { em: 'Mariana (Recepção|Costa)' }], ['estado', 'Inativo', { em: 'Mariana (Recepção|Costa)', exato: true }]]);
  await pag.evaluate(() => window.scrollTo(0, 0)); await espera(300);
  await pag.getByRole('button', { name: /^Inativos/ }).click(); await espera();
  await foto('inativos', [['chip', 'Inativos', {}], ['mariana', '*', { em: 'Mariana (Recepção|Costa)' }], ['reativar', 'Reativar', { exato: true }], ['ativos', '3 ativos', { exato: true }]]);
  await pag.getByRole('button', { name: 'Reativar', exact: true }).first().click(); await espera(1200);
  await foto('inativos-reativado', [['vazio', 'Nenhum usuário neste filtro.', {}], ['ativos', '4 ativos', { exato: true }], ['todos', 'Todos', {}]]);
  await pag.getByRole('button', { name: /^Todos/ }).click(); await espera();
  await centraliza(await botao(/Mariana (Recepção|Costa)/, 'Desativar')); await espera(400);
  await foto('usuarios-mariana-reativada', [['mariana', '*', { em: 'Mariana (Recepção|Costa)' }], ['estado', 'Ativo', { em: 'Mariana (Recepção|Costa)', exato: true }]]);
  fs.writeFileSync(path.join(OUT, 'alvos.json'), JSON.stringify(ALVOS, null, 1));
  fs.writeFileSync(path.join(OUT, 'conferencia.json'), JSON.stringify({ data: new Date().toISOString().slice(0, 10), proibidos: PROIBIDO.map(String), telas: CONF }, null, 1));
  await nav.close();
})();
