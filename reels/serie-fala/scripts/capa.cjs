#!/usr/bin/env node
/*
 * Capa de um episódio da série Fala (página própria src/capa.html?ep=<id>).
 *   node scripts/capa.cjs --ep fala-01   -> output/fala-01/capa.png  (+ output/fala-01/revisao/capa-caixas.json)
 * Depois: python3 ../tools/revisao_capa.py . --saida output/fala-01
 *         -> output/fala-01/capa.jpg, output/fala-01/revisao/capa-no-feed.jpg e capa.txt
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch (_) {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}
const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const EP = args.includes('--ep') ? args[args.indexOf('--ep') + 1] : 'fala-01';
const OUT = path.join(ROOT, 'output', EP);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };

(async () => {
  const srv = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    await page.goto(`http://127.0.0.1:${srv.address().port}/src/capa.html?render&ep=${EP}`);
    await page.evaluate(() => window.ready);
    const url = await page.evaluate(() => window.coverFrame());
    const out = path.join(OUT, 'capa.png');
    fs.mkdirSync(path.join(OUT, 'revisao'), { recursive: true });
    fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
    const boxes = await page.evaluate(() => window.coverBoxes());
    fs.writeFileSync(path.join(OUT, 'revisao', 'capa-caixas.json'), JSON.stringify(boxes, null, 1));
    console.log('capa', out);
  } finally {
    await browser.close(); srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
