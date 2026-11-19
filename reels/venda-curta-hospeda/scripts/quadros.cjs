// node scripts/quadros.cjs [--estilo] t1,t2,... -> output/quadros/tNN.NN.png
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), estilo = args.includes('--estilo'), ts = (args.find((a) => /^[\d.,]+$/.test(a)) || '0').split(',').map(Number);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const nav = await chromium.launch(); const pg = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', (e) => console.error('[pagina]', e.message));
  await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html${estilo ? '?estilo' : ''}`); await pg.evaluate(() => window.ready);
  const dir = path.join(ROOT, 'output', 'quadros'); fs.mkdirSync(dir, { recursive: true });
  for (const t of ts) { const u = await pg.evaluate((t) => window.frameAt(t), t); const f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`); fs.writeFileSync(f, Buffer.from(u.split(',')[1], 'base64')); console.log(f); }
  await nav.close(); srv.close();
});
