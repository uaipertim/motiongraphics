#!/usr/bin/env node
/*
 * Stories para Destaque — render (Chromium headless, quadro a quadro). Tudo sai do JSON do destaque.
 *   node scripts/render.cjs video  --d dicas [--so 1,8]   -> output/dicas/01.mp4 … (1080x1920, 60 fps, H.264, SEM áudio)
 *   node scripts/render.cjs capas                          -> output/capas/<id>.png (1080x1080), uma por item de capas.json
 *   node scripts/render.cjs info   --d dicas               -> output/dicas/revisao/motor.json + caixas.json (para a revisão)
 *   node scripts/render.cjs stills --d dicas 3:2.5,8:7.9   -> output/dicas/stills/ (Story:tempo)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const mode = args[0] || 'video';
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const ID = opt('d', 'dicas');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };

function serve() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => ok(srv));
  });
}
async function openPage(browser, port, id = ID) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/src/index.html?render&d=${id}`);
  await page.evaluate(() => window.ready);
  return page;
}
const decode = (url) => Buffer.from(url.split(',')[1], 'base64');

(async () => {
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync'] });
  const out = path.join(ROOT, 'output', ID);
  try {
    if (mode === 'capas') {
      // as capas vêm de capas.json (lista de {id, nome, icone}); o desenho é o mesmo para todas
      const dir = path.join(ROOT, 'output', 'capas'); fs.mkdirSync(dir, { recursive: true });
      const lista = JSON.parse(fs.readFileSync(path.join(ROOT, 'capas.json'))).capas;
      const page = await openPage(browser, port);
      for (const c of lista) {
        fs.writeFileSync(path.join(dir, `${c.id}.png`), decode(await page.evaluate((i) => window.capaPNG(i), c.icone)));
        console.log('capa', c.id);
      }
    } else if (mode === 'info') {
      const page = await openPage(browser, port), dir = path.join(out, 'revisao'); fs.mkdirSync(dir, { recursive: true });
      const info = await page.evaluate(() => DESTAQUE.info());
      fs.writeFileSync(path.join(dir, 'motor.json'), JSON.stringify(info, null, 1));
      const cx = [];
      for (const s of info) for (let t = 0; t < s.dur; t += 0.25) cx.push({ s: s.i, t: Math.round(t * 100) / 100, caixas: await page.evaluate(([i, t]) => window.caixas(i, t), [s.i, t]) });
      fs.writeFileSync(path.join(dir, 'caixas.json'), JSON.stringify(cx));
      console.log('motor.json + caixas.json ->', dir);
    } else if (mode === 'stills') {
      const page = await openPage(browser, port), dir = path.join(out, 'stills'); fs.mkdirSync(dir, { recursive: true });
      for (const it of (args.find((a) => /^\d+:/.test(a)) || '1:0').split(',')) {
        const [s, t] = it.split(':').map(Number);
        fs.writeFileSync(path.join(dir, `s${s}-t${t.toFixed(2)}.png`), decode(await page.evaluate(([i, t]) => window.frameAt(i, t), [s - 1, t])));
      }
      console.log('stills ->', dir);
    } else {
      fs.mkdirSync(out, { recursive: true });
      const page0 = await openPage(browser, port);
      const info = await page0.evaluate(() => DESTAQUE.info()); await page0.close();
      const so = opt('so') ? opt('so').split(',').map(Number) : info.map((s) => s.i + 1);
      const pages = await Promise.all(Array.from({ length: 4 }, () => openPage(browser, port)));
      for (const n of so) {
        const s = info[n - 1], total = Math.round(s.dur * 60), file = path.join(out, `${String(n).padStart(2, '0')}.mp4`);
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'png', '-i', '-', '-an',
          '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-tune', 'animation',
          '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
        const done = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
        const pend = new Map(); let next = 0, written = 0;
        const flush = async () => { while (pend.has(written)) { const b = pend.get(written); pend.delete(written); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)); written++; } };
        let fl = Promise.resolve();
        await Promise.all(pages.map(async (pg) => {
          while (true) {
            const k = next++; if (k >= total) break;
            while (k - written > 90) await new Promise((r) => setTimeout(r, 5));
            pend.set(k, decode(await pg.evaluate(([i, t]) => window.frameAt(i, t), [s.i, k / 60])));
            fl = fl.then(flush);
          }
        }));
        await fl; await flush(); ff.stdin.end(); await done;
        console.log(`Story ${n}: ${file} (${total} quadros)`);
      }
    }
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
