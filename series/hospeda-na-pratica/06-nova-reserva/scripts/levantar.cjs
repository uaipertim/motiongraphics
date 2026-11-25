#!/usr/bin/env node
/*
 * Episódio 6 (Nova reserva em segundos): levantamento do fluxo Nova reserva na Demo, no celular, 390×844 a 3x (1170×2532).
 *   node scripts/levantar.cjs   -> aprovacao/levantamento/<nome>.png + aprovacao/levantamento/levantamento.json
 *
 * - Somem (visibility: hidden, sem mudar posição): o selo "Demonstração", a data do cabeçalho e "Quero usar".
 * - Antes de salvar cada captura: o texto visível não pode ter nada proibido. Exceção: "Código da reserva" (o número da
 *   reserva criada, que não é senha nem código de autenticador). Se tiver, o script para sem salvar.
 * - Bloqueio de canal (REGRAS, "Avisos da Demo"): ANTES de abrir a Nova reserva, o script abre o Calendário em 08/12–21/12 e
 *   para se houver qualquer bloqueio (Airbnb, Booking ou outro) ou reserva em qualquer acomodação de 12/12 a 14/12.
 * - Cronômetro: o fluxo é feito no ritmo de uma pessoa (RITMO, abaixo: olhar antes de cada toque, digitar letra a letra, ler as
 *   listas e rolar a tela até os botões que ficam fora dela) e o relógio conta só o tempo do fluxo, sem o tempo
 *   gasto salvando as capturas. Começa no toque no "+" e para quando a reserva aparece no Calendário.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = path.join(__dirname, '..', 'aprovacao', 'levantamento');
const RITMO = { olhar_antes_do_toque_ms: 700, digitar_ms_por_letra: 125, ler_lista_ms: 1200, rolar_ms: 600 };
const DADOS = { entrada: 'sábado, 12 de dezembro de 2026', saida: 'segunda-feira, 14 de dezembro de 2026', acomodacao: 'Bica D’Água 02',
  nome: 'Larissa Campos', whatsapp: '11900000021', sinal: '580', forma: 'PIX' };
const PROIBIDO = [/fazlodigital/i, /\bDemo\b/, /Demonstra/i, /senha/i, /c[oó]digo(?! da reserva)/i, /token/i, /Quero usar/, /\.ics\b/i, /\bical\b/i, /https?:\/\//i, /@/,
  /não consegue ler/i, /Confira o link/i, /não lê o calendário/i, /Confira se o link/i, /Jo[aã]o Caixa/, /Mariana Recep/];
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
  const R = { data: new Date().toISOString(), ritmo: RITMO, dados: { ...DADOS, whatsapp: '(11) 90000-0021' }, proibidos: PROIBIDO.map(String), capturas: {}, textos: {}, canal: {}, cronometro: {} };
  // relógio do fluxo: conta só o tempo fora das capturas
  let rodando = false, t0 = 0, pausado = 0, pausaIni = 0;
  const relogio = () => (Date.now() - t0 - pausado) / 1000;
  const parcial = (k) => { R.cronometro[k] = +relogio().toFixed(2); console.log(`  ⏱ ${k}: ${R.cronometro[k]} s`); };
  const espera = (ms) => pag.waitForTimeout(ms);
  const para = async (msg) => { console.error('PARADO: ' + msg); await nav.close(); process.exit(1); };
  const foto = async (nome, legenda, cheia = false) => {
    if (rodando) pausaIni = Date.now();
    await pag.mouse.move(1, 1); await espera(350);
    const esc = await pag.evaluate(preparar); await espera(120);
    const texto = await pag.evaluate(() => document.body.innerText);
    const achados = PROIBIDO.filter((re) => re.test(texto)).map(String);
    if (achados.length) await para(`${nome}: ${achados.join(', ')}`);
    await pag.screenshot({ path: path.join(OUT, nome + '.png'), fullPage: cheia });
    R.capturas[nome] = { legenda, escondidos: esc, proibidos: 0, pagina_inteira: cheia };
    R.textos[nome] = limpo(texto.split(/Demonstração\n/).slice(-1)[0]);
    console.log('ok', nome);
    if (rodando) pausado += Date.now() - pausaIni;
  };
  // um toque no ritmo de uma pessoa: olha, toca
  const toca = async (loc) => { await espera(RITMO.olhar_antes_do_toque_ms); await loc.click(); };
  const digita = async (loc, s) => { await toca(loc); await loc.type(s, { delay: RITMO.digitar_ms_por_letra }); };
  // rolar a tela com o dedo até o botão aparecer (o toque automático rolaria sozinho, sem gastar tempo)
  const rola = async (loc) => { await espera(RITMO.rolar_ms / 2); await loc.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'smooth' })); await espera(RITMO.rolar_ms / 2); };
  const botao = (re) => pag.locator('button').filter({ hasText: re }).filter({ visible: true }).first();
  const abre = async () => {
    for (let i = 0; ; i++) {
      try { await pag.goto('https://demo.fazlohospeda.com.br/', { waitUntil: 'networkidle', timeout: 45000 }); await pag.getByText('Entrar na demonstração').click({ timeout: 20000 }); break; }
      catch (e) { if (i >= 2) throw e; console.log('  nova tentativa de abrir a Demo'); }
    }
    await espera(2500); await pag.evaluate(() => scrollTo(0, 0));
  };
  const grade = () => pag.evaluate(() => {
    const cab = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /^\d{2}$/.test((e.textContent || '').trim()) && e.getClientRects().length && e.getBoundingClientRect().top < 400)
      .map((e) => { const r = e.getBoundingClientRect(); return { dia: e.textContent.trim(), x0: r.left, x1: r.right }; });
    const itens = [...document.querySelectorAll('button[aria-label]')].filter((b) => b.getClientRects().length && /,|Bloqueada/.test(b.getAttribute('aria-label')))
      .map((b) => { const r = b.getBoundingClientRect(); return { rotulo: b.getAttribute('aria-label'), x0: r.left, x1: r.right, y: r.top }; });
    const faixa = (document.body.innerText.match(/\d{2}\/\d{2} – \d{2}\/\d{2}/) || [''])[0];
    return { faixa, cab, itens };
  });

  // 0) BLOQUEIO DE CANAL: o Calendário de 08/12 a 21/12, antes de qualquer reserva nova
  await abre();
  await pag.getByRole('button', { name: 'Calendário', exact: true }).first().click(); await espera(1800);
  await pag.getByRole('button', { name: 'Próximo', exact: true }).click(); await espera(1500);
  const g = await grade();
  if (g.faixa !== '08/12 – 21/12') await para('o Calendário não está em 08/12 – 21/12: ' + g.faixa);
  const c12 = g.cab.find((c) => c.dia === '12'), c14 = g.cab.find((c) => c.dia === '14');
  const noPeriodo = g.itens.filter((it) => it.x1 > c12.x0 && it.x0 < c14.x1);
  R.canal = { faixa: g.faixa, itens_na_quinzena: g.itens.map((i) => i.rotulo), itens_de_12_a_14: noPeriodo.map((i) => i.rotulo),
    bloqueios_na_quinzena: g.itens.filter((i) => /Bloqueada|Airbnb|Booking/i.test(i.rotulo)).map((i) => i.rotulo) };
  if (noPeriodo.length || R.canal.bloqueios_na_quinzena.length) await para('há bloqueio ou reserva no período: ' + JSON.stringify(R.canal));
  await foto('00-calendario-dez-antes', 'Calendário, 08/12 a 21/12, antes: nenhum bloqueio de canal e nenhuma reserva');

  // 1) O FLUXO, CRONOMETRADO
  await abre();
  await foto('01-inicio', 'Início: o "+" da barra de baixo (Nova reserva)');
  await espera(RITMO.olhar_antes_do_toque_ms);
  rodando = true; t0 = Date.now(); pausado = 0;
  await pag.getByRole('button', { name: 'Nova reserva' }).click(); await pag.getByText('Passo 1 de 5').waitFor();
  await foto('02-passo1', 'Passo 1 de 5 · Período e acomodação (vazio)');
  await toca(pag.getByPlaceholder('dd/mm/aaaa').first()); await pag.getByRole('button', { name: 'Confirmar período' }).waitFor();
  await foto('03-calendario-nov', 'Toque em Entrada: o calendário sobe (novembro, hoje 24)');
  await toca(pag.getByRole('button', { name: 'Próximo mês' })); await pag.locator(`button[aria-label="${DADOS.entrada}"]`).waitFor();
  await espera(300);
  await toca(pag.locator(`button[aria-label="${DADOS.entrada}"]`));
  await toca(pag.locator(`button[aria-label="${DADOS.saida}"]`)); await espera(200);
  await foto('04-calendario-12-14', 'Dezembro: 12/12 → 14/12 escolhidos');
  await toca(pag.getByRole('button', { name: 'Confirmar período' })); await pag.getByText(/Livres no período/).waitFor();
  parcial('periodo');
  await foto('05-livres', 'Livres no período · 10 de 10, com o total de cada uma', true);
  await espera(RITMO.ler_lista_ms);
  await toca(pag.getByText(DADOS.acomodacao, { exact: true })); await espera(250);
  await foto('06-escolhida', 'Bica D’Água 02 escolhida: o Continuar fica preto');
  await rola(botao(/^Continuar$/));
  await foto('06b-escolhida-continuar', 'Rolando até o Continuar (fim da lista)');
  await toca(botao(/^Continuar$/)); await pag.getByText('Passo 2 de 5').waitFor();
  parcial('acomodacao');
  R.textos['07-passo2-lista'] = limpo((await pag.evaluate(() => document.body.innerText)).split(/Demonstração\n/).slice(-1)[0]).replace(/\(\d{2}\) [\d-]+/g, '(telefone)');
  await toca(botao(/^Cadastrar novo$/)); await pag.getByPlaceholder('Nome do hóspede principal').waitFor();
  await foto('08-passo2-novo', 'Passo 2 de 5 · Hóspede: Cadastrar novo (Nome *, WhatsApp / Telefone *, CPF e Cidade opcionais)');
  await digita(pag.getByPlaceholder('Nome do hóspede principal'), DADOS.nome);
  await digita(pag.getByPlaceholder('(00) 00000-0000'), DADOS.whatsapp);
  await foto('09-passo2-preenchido', 'Hóspede novo: Larissa Campos, (11) 90000-0021 (DIGITADO)');
  await toca(botao(/^Continuar$/)); await pag.getByText('Passo 3 de 5').waitFor();
  parcial('hospede');
  await foto('10-passo3', 'Passo 3 de 5 · Valores: diárias, desconto, acréscimo, canal de origem e status', true);
  await espera(RITMO.ler_lista_ms);
  await toca(botao(/^Continuar$/)); await pag.getByText('Passo 4 de 5').waitFor();
  parcial('valores');
  await foto('11-passo4', 'Passo 4 de 5 · Sinal (opcional) e forma de pagamento');
  const sinal = pag.locator('input[type=text]').filter({ visible: true }).first();
  await toca(sinal); await sinal.press('Control+A'); await sinal.type(DADOS.sinal, { delay: RITMO.digitar_ms_por_letra });
  await toca(botao(new RegExp('^' + DADOS.forma + '$'))); await espera(250);
  await foto('12-passo4-sinal', 'Sinal R$ 580,00 (DIGITADO) via PIX: entra no caixa aberto');
  await toca(botao(/^Continuar$/)); await pag.getByText('Passo 5 de 5').waitFor();
  parcial('sinal');
  await foto('13-passo5', 'Passo 5 de 5 · Resumo, com o botão "Criar com sinal R$ 580,00"');
  await espera(RITMO.ler_lista_ms);
  await toca(botao(/^Criar com sinal/)); await pag.getByText('Reserva Criada!').waitFor();
  parcial('criada');
  await foto('14-criada', 'Reserva Criada!: código, hóspede, acomodação, período, financeiro e atalhos', true);
  await rola(botao(/^Ver no calendário$/));
  await toca(botao(/^Ver no calendário$/)); await pag.getByText(/\d{2}\/\d{2} – \d{2}\/\d{2}/).waitFor(); await espera(300);
  await foto('15-calendario-hoje', '"Ver no calendário" abre o calendário em 24/11–07/12 (a reserva ainda não aparece)');
  await toca(pag.getByRole('button', { name: 'Próximo', exact: true }));
  await pag.locator(`button[aria-label^="${DADOS.nome}"]`).first().waitFor();
  parcial('calendario'); rodando = false;
  await foto('16-calendario-dez', 'Próximo: 08/12–21/12, a reserva da Larissa na Bica D’Água 02 (12 → 14)');
  const g2 = await grade(); R.canal.depois = g2.itens.map((i) => i.rotulo);

  // 2) O MESMO PEDIDO DE NOVO: a Bica D’Água 02 já tem reserva e sai da lista
  await toca(pag.getByRole('button', { name: 'Nova reserva' })); await pag.getByText('Passo 1 de 5').waitFor();
  await toca(pag.getByPlaceholder('dd/mm/aaaa').first()); await toca(pag.getByRole('button', { name: 'Próximo mês' })); await espera(300);
  await toca(pag.locator(`button[aria-label="${DADOS.entrada}"]`)); await toca(pag.locator(`button[aria-label="${DADOS.saida}"]`));
  await toca(pag.getByRole('button', { name: 'Confirmar período' })); await pag.getByText(/Livres no período/).waitFor();
  await foto('17-ocupada', 'O mesmo período de novo: Livres no período · 9 de 10, sem a Bica D’Água 02', true);

  fs.writeFileSync(path.join(OUT, 'levantamento.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R.cronometro), JSON.stringify(R.canal.itens_de_12_a_14));
  await nav.close();
})();
