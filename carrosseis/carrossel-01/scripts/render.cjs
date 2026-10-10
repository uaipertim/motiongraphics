#!/usr/bin/env node
/*
 * Carrossel 01 — render dos slides em PNG (1080x1350).
 *   node scripts/render.cjs          -> output/01.png … output/08.png
 *   node scripts/render.cjs 1,7      -> só os slides pedidos
 * Depois: python3 scripts/previa.py  -> output/previa.jpg (+ revisão de margens)
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
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
const only = (process.argv[2] || '').split(',').filter(Boolean).map(Number);

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
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    await page.goto(`http://127.0.0.1:${srv.address().port}/src/index.html?render`);
    await page.evaluate(() => window.ready);
    const N = await page.evaluate(() => CARROSSEL.N);
    fs.mkdirSync(path.join(ROOT, 'output'), { recursive: true });
    for (let n = 1; n <= N; n++) {
      if (only.length && !only.includes(n)) continue;
      const url = await page.evaluate((n) => window.slideAt(n), n);
      const out = path.join(ROOT, 'output', String(n).padStart(2, '0') + '.png');
      fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
      console.log('slide', out);
    }
  } finally {
    await browser.close(); srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
