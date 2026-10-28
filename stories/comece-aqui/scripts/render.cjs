#!/usr/bin/env node
/*
 * Destaque "Comece aqui": node scripts/render.cjs -> output/01.png, 02.png, 03.png, capa-destaque-comece-aqui.png (1080x1920)
 *                                                   + output/revisao/caixas.json (as caixas de cada elemento, para a conferência)
 * Depois: python3 scripts/previa.py -> output/previa.jpg e a conferência das áreas seguras.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
(async () => {
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    pg.on('pageerror', (e) => console.error('[page]', e.message));
    await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready);
    const out = path.join(ROOT, 'output'), rev = path.join(out, 'revisao'); fs.mkdirSync(rev, { recursive: true });
    const caixas = {};
    for (const [n, nome] of [[1, '01.png'], [2, '02.png'], [3, '03.png'], ['capa', 'capa-destaque-comece-aqui.png']]) {
      const r = await pg.evaluate((n) => window.tela(n), n);
      fs.writeFileSync(path.join(out, nome), Buffer.from(r.png.split(',')[1], 'base64')); caixas[nome] = r.caixas; console.log(nome);
    }
    fs.writeFileSync(path.join(rev, 'caixas.json'), JSON.stringify(caixas, null, 1));
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
