#!/usr/bin/env node
/*
 * Episódio 6 (Nova reserva em segundos): captura final, CRONOMETRADA, do fluxo Nova reserva na Demo (390×844 a 3x).
 *   node scripts/capturar.cjs   -> telas/*.png + telas/alvos.json + telas/eventos.json + telas/conferencia.json
 *
 * Mesmo ritmo de pessoa aprovado na etapa 1 (RITMO). O relógio conta só o tempo do fluxo, sem o tempo das capturas:
 * começa no toque no "+" e para quando a reserva aparece no Calendário, na quinzena dela. Se o total sair de 23,0 a 23,9 s,
 * o script para.
 * Decisões aprovadas (etapa 1):
 *  - nenhuma captura mostra bloqueio de canal nem conflito: o texto VISÍVEL de cada captura não pode ter "Airbnb", "Booking",
 *    "Bloquead…" nem "Conflito". A quinzena de hoje (24/11–07/12), que "Ver no calendário" abre, não é capturada: no vídeo,
 *    a cena chega direto à quinzena da reserva (o relógio conta o trecho real até a reserva aparecer nela);
 *  - o passo 2 aparece já na aba "Cadastrar novo": a lista "Buscar existente" não é capturada;
 *  - antes de tudo, o Calendário de 08/12 a 21/12 é conferido: nenhum bloqueio nem reserva de 12 a 14/12.
 * Também: texto proibido de sempre (exceção: "Código da reserva"), elementos da demonstração escondidos, o ponteiro fora da tela.
 * Eventos (eventos.json): o instante (no relógio) de cada toque, digitação, rolagem e troca de tela, com o ponto tocado.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = path.join(__dirname, '..', 'telas');
const RITMO = { olhar_antes_do_toque_ms: 700, digitar_ms_por_letra: 125, ler_lista_ms: 1200, rolar_ms: 600 };
const DADOS = { entrada: 'sábado, 12 de dezembro de 2026', saida: 'segunda-feira, 14 de dezembro de 2026', acomodacao: 'Bica D’Água 02',
  nome: 'Larissa Campos', whatsapp: '11900000021', sinal: '580', forma: 'PIX' };
const FAIXA_TOTAL = [23.0, 23.9];
const PROIBIDO = [/fazlodigital/i, /\bDemo\b/, /Demonstra/i, /senha/i, /c[oó]digo(?! da reserva)/i, /token/i, /Quero usar/, /\.ics\b/i, /\bical\b/i, /https?:\/\//i, /@/,
  /não consegue ler/i, /Confira o link/i, /não lê o calendário/i, /Confira se o link/i, /Jo[aã]o Caixa/, /Mariana Recep/];
const CANAL = [/Airbnb/i, /Booking/i, /Bloquead/i, /Conflito/i];
function preparar() {
  const alvos = [...document.querySelectorAll('body *')].filter((e) => {
    const t = (e.innerText || '').trim();
    return (e.children.length <= 3 && /^(Demonstração(Demo)?|Quero usar|Quero usar na minha pousada)$/.test(t)) ||
      /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)(-feira)?, \d+ de \w+$/.test(t) || /^FAZLO Hospeda · v[\d.]/.test(t);
  });
  alvos.forEach((e) => { e.style.visibility = 'hidden'; });
  return alvos.length;
}
// o texto que aparece na janela do celular (pedaços de texto dentro da tela e fora da barra de baixo, que fica por cima)
function textoVisivel(inteira) {
  const nav = document.querySelector('nav.fixed'), topoNav = nav ? nav.getBoundingClientRect().top : innerHeight;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const out = [];
  while ((n = tw.nextNode())) {
    const s = n.nodeValue.trim(); if (!s) continue;
    const el = n.parentElement; if (!el || getComputedStyle(el).visibility === 'hidden') continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const noNav = nav && nav.contains(el);
    for (const b of r.getClientRects()) {
      const y0 = b.top + (inteira ? scrollY : 0), y1 = b.bottom + (inteira ? scrollY : 0), alt = inteira ? document.documentElement.scrollHeight : (noNav ? innerHeight : topoNav);
      if (b.width > 0 && b.right > 0 && b.left < innerWidth && y1 > 0 && y0 < alt) { out.push(s); break; }
    }
  }
  return out.join('\n');
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const pag = await ctx.newPage();
  const CONF = { ritmo: RITMO, telas: {}, canal: {} }, ALVOS = {}, EV = [];
  let rodando = false, t0 = 0, pausado = 0, pausaIni = 0;
  const relogio = () => (rodando ? (Date.now() - t0 - pausado) / 1000 : null);
  const ev = (tipo, extra = {}) => { const e = { tipo, t: +relogio().toFixed(3), ...extra }; EV.push(e); return e; };
  const espera = (ms) => pag.waitForTimeout(ms);
  const para = async (msg) => { console.error('PARADO: ' + msg); await nav.close(); process.exit(1); };
  const retDe = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top + scrollY, r.right, r.bottom + scrollY].map((v) => Math.round(v * 3)); });
  // captura: o celular (vp) ou a página inteira (pg, sem a barra de baixo, que é fixa). Medidas em px da página (3x).
  const foto = async (nome, alvos = {}, inteira = false) => {
    if (rodando) pausaIni = Date.now();
    await pag.mouse.move(1, 1); await espera(300);
    const esc = await pag.evaluate(preparar); await espera(120);
    const vis = await pag.evaluate(textoVisivel, inteira), tudo = await pag.evaluate(() => document.body.innerText);
    const achados = PROIBIDO.filter((re) => re.test(tudo)).map(String), canal = CANAL.filter((re) => re.test(vis)).map(String);
    if (achados.length) await para(`${nome}: ${achados.join(', ')}`);
    if (canal.length) await para(`${nome}: bloqueio/conflito de canal à vista: ${canal.join(', ')}`);
    const y0 = await pag.evaluate(() => scrollY);
    const med = {}; for (const [k, loc] of Object.entries(alvos)) med[k] = await retDe(loc);
    if (inteira) await pag.evaluate(() => { document.querySelector('nav.fixed').style.visibility = 'hidden'; });
    await pag.screenshot({ path: path.join(OUT, nome + '.png'), fullPage: inteira });
    if (inteira) await pag.evaluate((y) => { document.querySelector('nav.fixed').style.visibility = ''; scrollTo(0, y); }, y0);
    ALVOS[nome] = { rolagem: Math.round(y0 * 3), altura: inteira ? await pag.evaluate(() => Math.round(document.documentElement.scrollHeight * 3)) : 2532, ...med };
    CONF.telas[nome] = { pagina_inteira: inteira, escondidos: esc, proibidos: 0, canal_a_vista: 0, texto_visivel: vis.split('\n').length + ' pedaços' };
    console.log('ok', nome, rodando ? `(t=${relogio().toFixed(2)})` : '');
    if (rodando) pausado += Date.now() - pausaIni;
  };
  const toca = async (nome, loc) => {
    await espera(RITMO.olhar_antes_do_toque_ms);
    const r = await retDe(loc), y = await pag.evaluate(() => Math.round(scrollY * 3));
    const e = rodando ? ev('toque', { nome, x: Math.round((r[0] + r[2]) / 2), y: Math.round((r[1] + r[3]) / 2), rolagem: y, ret: r }) : null;
    await loc.click(); return e;
  };
  const digita = async (nome, loc, s) => { await toca(nome, loc); const e = ev('digita', { nome, ret: await retDe(loc), letras: s.length }); await loc.type(s, { delay: RITMO.digitar_ms_por_letra }); e.fim = +relogio().toFixed(3); };
  const rola = async (nome, loc) => { const e = ev('rola', { nome, de: await pag.evaluate(() => Math.round(scrollY * 3)) }); await espera(RITMO.rolar_ms / 2);
    await loc.evaluate((x) => x.scrollIntoView({ block: 'center', behavior: 'smooth' })); await espera(RITMO.rolar_ms / 2);
    e.fim = +relogio().toFixed(3); e.para = await pag.evaluate(() => Math.round(scrollY * 3)); };
  const tela = (nome) => ev('tela', { nome });
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
      .map((b) => { const r = b.getBoundingClientRect(); return { rotulo: b.getAttribute('aria-label'), x0: r.left, x1: r.right }; });
    return { faixa: (document.body.innerText.match(/\d{2}\/\d{2} – \d{2}\/\d{2}/) || [''])[0], cab, itens };
  });

  // 0) BLOQUEIO DE CANAL em 12–14/12 (Calendário 08/12–21/12, antes de qualquer reserva nova)
  await abre();
  await pag.getByRole('button', { name: 'Calendário', exact: true }).first().click(); await espera(1800);
  await pag.getByRole('button', { name: 'Próximo', exact: true }).click(); await espera(1500);
  let g = await grade();
  if (g.faixa !== '08/12 – 21/12') await para('o Calendário não está em 08/12 – 21/12: ' + g.faixa);
  const c12 = g.cab.find((c) => c.dia === '12'), c14 = g.cab.find((c) => c.dia === '14');
  CONF.canal = { faixa: g.faixa, itens_na_quinzena_antes: g.itens.map((i) => i.rotulo), itens_de_12_a_14_antes: g.itens.filter((i) => i.x1 > c12.x0 && i.x0 < c14.x1).map((i) => i.rotulo) };
  if (CONF.canal.itens_na_quinzena_antes.length) await para('há bloqueio ou reserva em 08/12–21/12: ' + JSON.stringify(CONF.canal));

  // 1) O FLUXO CRONOMETRADO
  await abre();
  const MAIS = pag.getByRole('button', { name: 'Nova reserva' });
  await foto('inicio', { mais: MAIS, inicio_aba: pag.locator('nav.fixed button').filter({ hasText: /^Início$/ }) });
  await espera(RITMO.olhar_antes_do_toque_ms);
  const rMais = await retDe(MAIS);
  rodando = true; t0 = Date.now(); pausado = 0;
  ev('toque', { nome: 'mais', x: Math.round((rMais[0] + rMais[2]) / 2), y: Math.round((rMais[1] + rMais[3]) / 2), rolagem: 0, ret: rMais });
  await MAIS.click(); await pag.getByText('Passo 1 de 5').waitFor(); tela('passo1');
  const ENT = pag.getByPlaceholder('dd/mm/aaaa').first();
  await foto('passo1', { entrada: ENT, saida: pag.getByPlaceholder('dd/mm/aaaa').nth(1), titulo: pag.getByText('Nova reserva', { exact: true }) });
  await toca('entrada', ENT); await pag.getByRole('button', { name: 'Confirmar período' }).waitFor(); tela('cal-nov');
  await foto('cal-nov', { proximo: pag.getByRole('button', { name: 'Próximo mês' }) });
  await toca('proximo_mes', pag.getByRole('button', { name: 'Próximo mês' })); const D12 = pag.locator(`button[aria-label="${DADOS.entrada}"]`); await D12.waitFor(); await espera(300); tela('cal-dez');
  const D14 = pag.locator(`button[aria-label="${DADOS.saida}"]`), CONFP = pag.getByRole('button', { name: 'Confirmar período' });
  await foto('cal-dez', { d12: D12, d14: D14, confirmar: CONFP });
  await toca('dia12', D12); await espera(150); tela('cal-12');
  await foto('cal-12', {});
  await toca('dia14', D14); await espera(200); tela('cal-12-14');
  await foto('cal-12-14', { d12: D12, d14: D14, confirmar: CONFP, periodo: pag.getByText('12/12 → 14/12', { exact: true }) });
  await toca('confirmar', CONFP); await pag.getByText(/Livres no período/).waitFor(); tela('livres'); ev('parcial', { nome: 'periodo' });
  const CARD = (n) => pag.locator('div').filter({ has: pag.getByText(n, { exact: true }) }).filter({ hasText: 'Total do período' }).last();
  await foto('livres', { livres: pag.getByText(/Livres no período/), bica02: CARD(DADOS.acomodacao), bica01: CARD('Bica D’Água 01') });
  await espera(RITMO.ler_lista_ms);
  await toca('acomodacao', pag.getByText(DADOS.acomodacao, { exact: true })); await espera(250); tela('escolhida');
  await foto('escolhida', { bica02: CARD(DADOS.acomodacao) });
  await foto('pg-escolhida', { bica02: CARD(DADOS.acomodacao), continuar: botao(/^Continuar$/) }, true);
  await rola('ate_continuar', botao(/^Continuar$/));
  await foto('escolhida-continuar', { continuar: botao(/^Continuar$/) });
  await toca('continuar1', botao(/^Continuar$/)); await pag.getByText('Passo 2 de 5').waitFor(); ev('parcial', { nome: 'acomodacao' });
  // a aba "Buscar existente" abre primeiro (com a lista da Demo): NÃO é capturada; no vídeo a cena já está em "Cadastrar novo"
  await toca('cadastrar_novo', botao(/^Cadastrar novo$/)); const NOME = pag.getByPlaceholder('Nome do hóspede principal'); await NOME.waitFor(); tela('passo2-novo');
  const FONE = pag.getByPlaceholder('(00) 00000-0000');
  await foto('passo2-novo', { nome: NOME, fone: FONE, continuar: botao(/^Continuar$/), aba: botao(/^Cadastrar novo$/) });
  await digita('nome', NOME, DADOS.nome);
  await digita('fone', FONE, DADOS.whatsapp); tela('passo2-preenchido');
  await foto('passo2-preenchido', { nome: NOME, fone: FONE, continuar: botao(/^Continuar$/) });
  await toca('continuar2', botao(/^Continuar$/)); await pag.getByText('Passo 3 de 5').waitFor(); tela('passo3'); ev('parcial', { nome: 'hospede' });
  await foto('passo3', { total: pag.getByText('Total das diárias', { exact: true }).locator('..'), canal: pag.locator('select').first(), status: pag.locator('select').nth(1),
    noites: pag.getByText(/Sáb · 12\/12/).locator('../..'), continuar: botao(/^Continuar$/) });
  await espera(RITMO.ler_lista_ms);
  await toca('continuar3', botao(/^Continuar$/)); await pag.getByText('Passo 4 de 5').waitFor(); tela('passo4'); ev('parcial', { nome: 'valores' });
  const SINAL = pag.locator('input[type=text]').filter({ visible: true }).first();
  await foto('passo4', { sinal: SINAL, pix: botao(/^PIX$/), continuar: botao(/^Continuar$/) });
  await toca('sinal', SINAL); await SINAL.press('Control+A'); { const e = ev('digita', { nome: 'sinal', ret: await retDe(SINAL), letras: 3 }); await SINAL.type(DADOS.sinal, { delay: RITMO.digitar_ms_por_letra }); e.fim = +relogio().toFixed(3); }
  await toca('pix', botao(new RegExp('^' + DADOS.forma + '$'))); await espera(250); tela('passo4-sinal');
  await foto('passo4-sinal', { sinal: SINAL, pix: botao(/^PIX$/), caixa: pag.getByText(/Entra no caixa aberto/), saldo: pag.getByText(/A reserva nasce confirmada/), continuar: botao(/^Continuar$/) });
  await toca('continuar4', botao(/^Continuar$/)); await pag.getByText('Passo 5 de 5').waitFor(); tela('passo5'); ev('parcial', { nome: 'sinal' });
  await foto('passo5', { resumo: pag.getByText('Total da reserva', { exact: true }).locator('../..'), criar: botao(/^Criar com sinal/) });
  await espera(RITMO.ler_lista_ms);
  await toca('criar', botao(/^Criar com sinal/)); await pag.getByText('Reserva Criada!').waitFor(); tela('criada'); ev('parcial', { nome: 'criada' });
  const FIN = pag.getByText('Financeiro', { exact: true }).locator('..');
  await foto('criada', { titulo: pag.getByText('Reserva Criada!'), financeiro: FIN, voucher: botao(/Ver voucher/) });
  await foto('pg-criada', { titulo: pag.getByText('Reserva Criada!'), financeiro: FIN, voucher: botao(/Ver voucher/), vercal: botao(/^Ver no calendário$/) }, true);
  await rola('ate_ver_no_calendario', botao(/^Ver no calendário$/));
  await toca('ver_no_calendario', botao(/^Ver no calendário$/)); await pag.getByText(/\d{2}\/\d{2} – \d{2}\/\d{2}/).waitFor(); await espera(300);
  // a quinzena de hoje (24/11–07/12), com o bloqueio do Airbnb e o conflito: NÃO é capturada
  await toca('proximo', pag.getByRole('button', { name: 'Próximo', exact: true }));
  const LAR = pag.locator(`button[aria-label^="${DADOS.nome}"]`).first(); await LAR.waitFor();
  tela('cal-reserva'); ev('parcial', { nome: 'calendario' });
  const total = relogio(); rodando = false;
  g = await grade(); CONF.canal.itens_na_quinzena_depois = g.itens.map((i) => i.rotulo);
  if (g.faixa !== '08/12 – 21/12' || g.itens.length !== 1) await para('a quinzena da reserva não está como esperado: ' + JSON.stringify(g));
  await foto('cal-reserva', { larissa: LAR, faixa: pag.getByText('08/12 – 21/12') });
  CONF.total_s = +total.toFixed(2);
  if (total < FAIXA_TOTAL[0] || total > FAIXA_TOTAL[1]) await para(`o total saiu de ${FAIXA_TOTAL.join(' a ')} s: ${total.toFixed(2)} s`);

  // 2) O MESMO PEDIDO DE NOVO: a Bica D’Água 02 sai da lista (cena calma, fora do cronômetro)
  ALVOS['cal-reserva'].mais = await retDe(MAIS);
  await MAIS.click(); await pag.getByText('Passo 1 de 5').waitFor();
  await ENT.click(); await pag.getByRole('button', { name: 'Próximo mês' }).click(); await espera(900);
  await D12.click(); await espera(200); await D14.click(); await espera(200); await CONFP.click(); await pag.getByText(/Livres no período/).waitFor();
  await pag.getByText(/Livres no período/).evaluate((e) => window.scrollBy(0, e.getBoundingClientRect().top - 230)); await espera(400);
  const lista = await pag.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /^(Bica D’Água|Chalé|Ipê)/.test((e.textContent || '').trim())).map((e) => e.textContent.trim()));
  if (lista.includes(DADOS.acomodacao) || !/Livres no período · 9 de 10/.test(await pag.evaluate(() => document.body.innerText))) await para('a lista do mesmo período não está como esperado: ' + lista.join(', '));
  await foto('ocupada', { livres: pag.getByText(/Livres no período/), bica01: CARD('Bica D’Água 01'), bica03: CARD('Bica D’Água 03') });
  CONF.mesmo_periodo = { lista };

  fs.writeFileSync(path.join(OUT, 'alvos.json'), JSON.stringify(ALVOS, null, 1));
  fs.writeFileSync(path.join(OUT, 'eventos.json'), JSON.stringify({ total_s: CONF.total_s, eventos: EV }, null, 1));
  fs.writeFileSync(path.join(OUT, 'conferencia.json'), JSON.stringify({ data: new Date().toISOString(), proibidos: PROIBIDO.map(String), canal_proibido_a_vista: CANAL.map(String), ...CONF }, null, 1));
  console.log('total', CONF.total_s, 's ·', EV.filter((e) => e.tipo === 'parcial').map((e) => `${e.nome} ${e.t}`).join(' · '));
  await nav.close();
})();
