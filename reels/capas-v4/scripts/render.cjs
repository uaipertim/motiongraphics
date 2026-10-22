#!/usr/bin/env node
/*
 * Capas v4 dos Reels — render pelo capas.json (com a medida de limão e de halo de cada capa).
 *   node scripts/render.cjs                 -> todas, na ordem do JSON
 *   node scripts/render.cjs 01-ele-pagou-metade
 * Para cada capa: <id>/output/capa.png (1080x1920) + revisao/capa-caixas.json; depois roda
 * reels/tools/revisao_capa.py (capa.jpg, capa-no-feed.jpg, capa.txt).
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
const lista = JSON.parse(fs.readFileSync(path.join(ROOT, 'capas.json'))).capas;
const so = process.argv.slice(2);
(async () => {
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`);
  await page.evaluate(() => window.ready);
  lista.forEach((c, i) => { c._i = i; });                // o fundo alterna petróleo / azul-noite na ordem do JSON
  for (const c of lista.filter((c) => !so.length || so.includes(c.id))) {
    const out = path.join(ROOT, c.id, 'output'); fs.mkdirSync(path.join(out, 'revisao'), { recursive: true });
    // calibra, para esta capa, a espessura do traço limão (esp, 1,0–1,5) e a intensidade do brilho difuso (brilho)
    // até a medida cair nas metas: limão 4,5–6% (alvo 5,2%) e halo 4–6% (alvo 5%), no quadro inteiro
    let m = null;
    if (c.esp === undefined) { let a = 1.0, b = 1.5; for (let k = 0; k < 8; k++) { c.esp = (a + b) / 2; c.brilho = 0; m = await page.evaluate((c) => window.mede(c), c); if (m.limao < 0.052) a = c.esp; else b = c.esp; } c.esp = +((a + b) / 2).toFixed(3); }
    if (c.brilho === undefined || !c.brilho) { let a = 0, b = 0.4; for (let k = 0; k < 10; k++) { c.brilho = (a + b) / 2; m = await page.evaluate((c) => window.mede(c), c); if (m.halo < 0.05) a = c.brilho; else b = c.brilho; } c.brilho = +((a + b) / 2).toFixed(4); }
    m = await page.evaluate((c) => window.mede(c), c);
    const r = await page.evaluate((c) => window.desenha(c), c);
    fs.writeFileSync(path.join(out, 'capa.png'), Buffer.from((await page.evaluate(() => window.png())).split(',')[1], 'base64'));
    fs.writeFileSync(path.join(out, 'revisao', 'capa-caixas.json'), JSON.stringify(r.caixas, null, 1));
    const pct = (x) => (100 * x).toFixed(1) + '%';
    const metas = { limao_ok: m.limao >= 0.045 && m.limao <= 0.06, halo_ok: m.halo >= 0.04 && m.halo <= 0.06, titulo_ok: r.corpo_titulo >= 110 };
    fs.writeFileSync(path.join(out, 'revisao', 'medidas.json'), JSON.stringify({ limao: +(100 * m.limao).toFixed(2), halo: +(100 * m.halo).toFixed(2), preenchimento: +(100 * m.preenchimento).toFixed(2), espessura_traco_limao: c.esp, brilho_difuso: c.brilho, corpo_titulo: r.corpo_titulo, linhas: r.linhas, altura_ilustracao: r.altura_ilustracao, largura_ilustracao: r.largura_ilustracao, largura_ilustracao_pct_util: +(100 * r.largura_ilustracao / 960).toFixed(1), altura_ilustracao_pct_recorte: +(100 * r.altura_ilustracao / 1440).toFixed(1), ...metas }, null, 1));
    const res = execSync(`python3 ${path.join(ROOT, '..', 'tools', 'revisao_capa.py')} ${path.join(ROOT, c.id)}`).toString().trim().split('\n').pop();
    console.log(`${c.id}: limão ${pct(m.limao)}${metas.limao_ok ? '' : ' (FORA de 4,5–6%)'} · halo ${pct(m.halo)}${metas.halo_ok ? '' : ' (FORA de 4–6%)'} · preench. ${pct(m.preenchimento)} · título ${r.corpo_titulo} px${metas.titulo_ok ? '' : ' (ABAIXO de 110)'} em ${r.linhas.length} linhas · ilustração ${(100 * r.largura_ilustracao / 960).toFixed(0)}% L × ${(100 * r.altura_ilustracao / 1440).toFixed(0)}% A · ${res}`);
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
