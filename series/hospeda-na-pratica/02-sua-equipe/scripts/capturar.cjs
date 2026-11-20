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
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  const CONF = {};
  const espera = (ms = 900) => pag.waitForTimeout(ms);
  const foto = async (nome) => {
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
  await foto('inicio');
  await pag.getByText('Mais', { exact: true }).click(); await espera();
  await foto('menu-mais');
  await pag.locator('[data-testid=tenant-more-menu]').getByText('Usuários', { exact: true }).first().click(); await espera(2000);
  await foto('usuarios');
  await pag.getByRole('button', { name: 'Convidar usuário' }).click();
  await foto('convidar');
  await pag.getByPlaceholder('Nome completo').fill('Carla Mendes');
  await pag.getByPlaceholder('nome@email.com').fill('carla@pousadadaserra.exemplo');
  await pag.locator('input[value=operations]').check({ force: true });
  await foto('convidar-preenchido');
  await pag.getByRole('button', { name: 'Enviar convite' }).click(); await espera(1200);
  await foto('usuarios-convite');
  // Alterar papel: João Pereira, de Caixa para Operação
  await centraliza(await botao(/João (Caixa|Pereira)/, 'Alterar papel')); await espera(400);
  await (await botao(/João (Caixa|Pereira)/, 'Alterar papel')).click();
  await foto('alterar-joao');
  await pag.locator('[role=dialog] input[value=operations]').check({ force: true });
  await foto('alterar-joao-operacao');
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Salvar papel', exact: true }).click(); await espera(1200);
  await centraliza(await botao(/João (Caixa|Pereira)/, 'Alterar papel')); await espera(400);
  await foto('usuarios-joao-operacao');
  // Desativar: Mariana Costa
  await centraliza(await botao(/Mariana (Recepção|Costa)/, 'Desativar')); await espera(400);
  await (await botao(/Mariana (Recepção|Costa)/, 'Desativar')).click();
  await foto('desativar-mariana');
  await pag.locator('[role=dialog]').getByRole('button', { name: 'Desativar', exact: true }).click(); await espera(1200);
  await centraliza(await botao(/Mariana (Recepção|Costa)/, 'Reativar')); await espera(400);
  await foto('usuarios-mariana-inativa');
  await pag.evaluate(() => window.scrollTo(0, 0)); await espera(300);
  await pag.getByRole('button', { name: /^Inativos/ }).click(); await espera();
  await foto('inativos');
  await pag.getByRole('button', { name: 'Reativar', exact: true }).first().click(); await espera(1200);
  await foto('inativos-reativado');
  fs.writeFileSync(path.join(OUT, 'conferencia.json'), JSON.stringify({ data: new Date().toISOString().slice(0, 10), proibidos: PROIBIDO.map(String), telas: CONF }, null, 1));
  await nav.close();
})();
