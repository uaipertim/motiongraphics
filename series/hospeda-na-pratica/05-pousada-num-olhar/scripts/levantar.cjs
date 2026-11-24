#!/usr/bin/env node
/*
 * Episódio 5 (A pousada num olhar): levantamento da tela Início da Demo, no celular, 390×844 a 3x (1170×2532).
 *   node scripts/levantar.cjs   -> aprovacao/levantamento/<nome>.png + aprovacao/levantamento/levantamento.json
 *
 * - Somem (visibility: hidden, sem mudar posição): o selo "Demonstração", a data do cabeçalho e "Quero usar".
 * - Antes de salvar cada captura, o texto visível da página não pode ter nada proibido (o texto de sempre da série e os
 *   erros de exemplo dos canais que o vídeo curto recusa). Se tiver, o script para sem salvar.
 * - Guarda o texto de cada bloco e confere se os números batem entre si (soma das formas de pagamento, painéis × cartões).
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = path.join(__dirname, '..', 'aprovacao', 'levantamento');
const PROIBIDO = [/fazlodigital/i, /\bDemo\b/, /Demonstra/i, /senha/i, /c[oó]digo/i, /token/i, /Quero usar/, /\.ics\b/i, /ical/i, /https?:\/\//i, /@/,
  /não consegue ler/i, /Confira o link/i, /não lê o calendário/i, /Confira se o link/i];
function preparar() {
  const alvos = [...document.querySelectorAll('body *')].filter((e) => {
    const t = (e.innerText || '').trim();
    return (e.children.length <= 3 && /^(Demonstração(Demo)?|Quero usar|Quero usar na minha pousada)$/.test(t)) ||
      /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)(-feira)?, \d+ de \w+$/.test(t) || /^FAZLO Hospeda · v[\d.]/.test(t);
  });
  alvos.forEach((e) => { e.style.visibility = 'hidden'; });
  return alvos.length;
}
const limpo = (s) => (s || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  const espera = (ms = 900) => pag.waitForTimeout(ms);
  const R = { data: new Date().toISOString(), proibidos: PROIBIDO.map(String), capturas: {}, blocos: {}, conferencias: {} };
  const foto = async (nome, legenda) => {
    await espera(700);
    const esc = await pag.evaluate(preparar); await espera(150);
    const texto = await pag.evaluate(() => document.body.innerText);
    const achados = PROIBIDO.filter((re) => re.test(texto)).map(String);
    if (achados.length) { console.error(`PARADO em ${nome}: ${achados.join(', ')}`); await nav.close(); process.exit(1); }
    await pag.screenshot({ path: path.join(OUT, nome + '.png') });
    R.capturas[nome] = { legenda, escondidos: esc, proibidos: 0, rolagem: await pag.evaluate(() => Math.round(scrollY)) };
    console.log('ok', nome);
  };
  const abre = async () => {
    for (let i = 0; ; i++) {                                     // a Demo às vezes demora a carregar: até 3 tentativas
      try { await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle', timeout: 45000 });
        await pag.getByText('Entrar na demonstração').click({ timeout: 20000 }); break; } catch (e) { if (i >= 2) throw e; console.log('  nova tentativa de abrir a Demo'); }
    }
    await espera(2500); await pag.evaluate(() => scrollTo(0, 0));
  };
  const rolaAte = (txt, folga = 120) => pag.evaluate(([t, f]) => {
    const h = [...document.querySelectorAll('h1,h2,h3,h4,p,span,div')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === t && e.getClientRects().length).shift();
    window.scrollBy(0, h.getBoundingClientRect().top - f);
  }, [txt, folga]);
  // retângulo (px da captura, 3x, na rolagem atual) do menor elemento cujo texto começa por `t`
  const caixa = (t, sobe = 0) => pag.evaluate(([t, sobe]) => {
    const c = [...document.querySelectorAll('body *')].filter((e) => e.getClientRects().length && (e.innerText || '').trim().startsWith(t)).sort((a, b) => a.innerText.length - b.innerText.length)[0];
    if (!c) return null; let e = c; for (let i = 0; i < sobe; i++) e = e.parentElement;
    const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 3));
  }, [t, sobe]);
  const painel = async (re, nome, legenda) => {
    await abre();
    await pag.getByRole('button', { name: re }).first().click(); await espera(1300);
    await foto(nome, legenda);
    const titulo = legenda.split(':')[0];
    R.blocos[nome] = await pag.evaluate(() => {
      const x = [...document.querySelectorAll('button[aria-label^="Fechar"], button')].find((b) => /fechar/i.test(b.getAttribute('aria-label') || '') && b.getClientRects().length);
      let p = x; while (p && p.parentElement && !(p.innerText || '').includes('Ver ficha') && !(p.innerText || '').includes('Nada a receber')) p = p.parentElement;
      return p ? p.innerText : null;
    });
    R.blocos[nome] = limpo(R.blocos[nome]);
  };

  // 1. Início no topo
  await abre();
  await foto('inicio', 'Início, no topo: Recebido hoje, formas de pagamento, a receber e os três cartões');
  R.blocos.inicio_texto = limpo(await pag.evaluate(() => document.body.innerText));
  R.alvos = { inicio: {
    recebido: await caixa('Recebido hoje', 0), total: await caixa('R$ 1.525,00'), caixa_aberto: await caixa('Caixa aberto desde'),
    pix: await caixa('PIX', 1), dinheiro: await caixa('Dinheiro', 1), credito: await caixa('Crédito', 1), debito: await caixa('Débito', 1),
    a_receber: await caixa('A receber nas saídas de hoje'),
    hospedados: await caixa('Hospedados'), chegadas: await caixa('Chegadas\n'), saidas: await caixa('Saídas\n') } };
  // 2. Precisa de atenção
  await rolaAte('Precisa de atenção');
  await foto('inicio-atencao', 'Início, rolado: Precisa de atenção (4), com Ver todos');
  // 3. Saídas de hoje e Chegadas de hoje (fim da rolagem)
  await rolaAte('Saídas de hoje', 90);
  await foto('inicio-saidas-chegadas', 'Início, rolado até o fim: Saídas de hoje e Chegadas de hoje');
  // 4 a 8. Painéis que abrem no próprio Início (um toque no cartão)
  await painel(/^Hospedados/, 'painel-hospedados', 'Hospedados agora: toque no cartão Hospedados');
  await painel(/Ver o que foi recebido hoje/, 'painel-recebido', 'Recebido hoje: toque no valor recebido');
  await painel(/^Saídas\s+2/, 'painel-saidas', 'Saídas de hoje: toque no cartão Saídas');
  await painel(/^Chegadas\s+2/, 'painel-chegadas', 'Chegadas de hoje: toque no cartão Chegadas (diverge do cartão)');
  await painel(/^A receber nas saídas/, 'painel-a-receber', 'A receber nas saídas de hoje: toque na linha');
  // 9. Ver todos (4)
  await abre(); await pag.getByRole('button', { name: /^Ver todos/ }).click(); await espera(1200);
  await foto('ver-todos', 'Precisa de atenção, Ver todos (4): janela por cima do Início');
  R.blocos['ver-todos'] = limpo(await pag.locator('[role=dialog]').last().innerText());
  // 10. Fora do vídeo: o sino (Atividades) e "Caixa aberto desde" (abre a tela Caixa)
  await abre(); await pag.getByRole('button', { name: 'Atividades' }).click(); await espera(1200);
  await foto('fora-atividades', 'Fora do vídeo: o sino abre Atividades (registro), por cima do Início');
  await abre(); await pag.getByRole('button', { name: /^Caixa aberto desde/ }).click(); await espera(1500);
  R.blocos.caixa_aberto_leva_a = (await pag.evaluate(() => document.body.innerText)).includes('Fechar caixa') ? 'tela Caixa (fora do Início)' : '?';

  // conferências de números (só leitura do texto)
  const t = R.blocos.inicio_texto, rs = (s) => Number(s.replace(/\./g, '').replace(',', '.'));
  const val = (rot) => { const m = t.match(new RegExp(rot + '\\nR\\$ ([\\d.,]+)')); return m && rs(m[1]); };
  const formas = { PIX: val('PIX'), Dinheiro: val('Dinheiro'), 'Crédito': val('Crédito'), 'Débito': val('Débito') };
  const total = rs(t.match(/R\$ ([\d.,]+)\n+PIX/)[1]);
  const pags = [...R.blocos['painel-recebido'].matchAll(/Forma de pagamento: ([^\n]+)[\s\S]*?R\$ ([\d.,]+)/g)].map((m) => [m[1], rs(m[2])]);
  R.conferencias = {
    formas, total, soma_formas: Object.values(formas).reduce((a, b) => a + b, 0),
    pagamentos_no_painel: pags, soma_painel: pags.reduce((a, [, v]) => a + v, 0),
    hospedados_cartao: t.match(/Hospedados\n(\d+)/)[1], hospedados_painel: (R.blocos['painel-hospedados'].match(/(\d+) hóspedes em (\d+) hospedagens/) || []).slice(1),
    chegadas_cartao: t.match(/Chegadas\n(\d+)\n([^\n]+)/).slice(1), chegadas_painel: (R.blocos['painel-chegadas'].match(/(\d+) chegadas?/) || [])[1],
    saidas_cartao: t.match(/Saídas\n(\d+)\n([^\n]+)/).slice(1), saidas_painel: (R.blocos['painel-saidas'].match(/(\d+) saídas?/) || [])[1],
  };
  fs.writeFileSync(path.join(OUT, 'levantamento.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R.conferencias, null, 1));
  await nav.close();
})();
