#!/usr/bin/env node
/*
 * Render do reel "Um dia inteiro da pousada".
 *   node scripts/render.cjs video  [--fps 60] [--workers 6]  -> output/um-dia-inteiro.mp4 (com audio/trilha.wav)
 *   node scripts/render.cjs stills 0.5,7.2 [--dir output/stills]
 *   node scripts/render.cjs dados                                -> output/revisao/dados.json (destaques, eventos, caixas por quadro)
 * Sobe um servidor estático em src/, abre index.html?render no Chromium e fotografa o palco quadro a quadro.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn, execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), mode = args[0] || 'video';
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };
const serve = () => new Promise((ok) => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => ok(s)); });
async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/src/index.html?render`);
  await page.evaluate(() => window.ready);
  return page;
}
const grab = async (page, t) => { await page.evaluate((t) => window.frameAt(t), t); return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } }); };
(async () => {
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--font-render-hinting=none'] });
  try {
    if (mode === 'stills') {
      const times = (args[1] || '0').split(',').map(Number), dir = path.resolve(ROOT, opt('dir', 'output/stills'));
      fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser, port);
      for (const t of times) { const f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`); fs.writeFileSync(f, await grab(page, t)); console.log('still', f); }
    } else if (mode === 'dados') {
      const page = await openPage(browser, port);
      const fps = Number(opt('fps', 10));
      const d = await page.evaluate((fps) => { const out = { duracao: REEL.DURATION, destaques: REEL.destaques(), eventos: REEL.eventos(), pecas: REEL.pecas(), quadros: [] };
        for (let i = 0; i < REEL.DURATION * fps; i++) out.quadros.push({ t: i / fps, caixas: REEL.caixas(i / fps) }); return out; }, fps);
      fs.mkdirSync(path.join(ROOT, 'output/revisao'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, 'output/revisao/dados.json'), JSON.stringify(d));
      fs.writeFileSync(path.join(ROOT, 'audio/eventos.json'), JSON.stringify({ duracao: d.duracao, E: await page.evaluate(() => REEL.E), eventos: d.eventos }, null, 1));
      console.log('dados:', d.quadros.length, 'quadros,', d.eventos.length, 'eventos');
    } else {
      const fps = Number(opt('fps', 60)), out = path.resolve(ROOT, opt('out', 'output/um-dia-inteiro.mp4'));
      const silent = path.resolve(ROOT, 'output/.video-only.mp4');
      const page0 = await openPage(browser, port); const dur = Number(opt('duration', await page0.evaluate(() => REEL.DURATION))); await page0.close();
      const total = Math.round(dur * fps), workers = Number(opt('workers', 6));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
      const ffDone = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
      const pages = await Promise.all(Array.from({ length: workers }, () => openPage(browser, port)));
      const pending = new Map(); let next = 0, written = 0; const t0 = Date.now();
      const flush = async () => { while (pending.has(written)) { const b = pending.get(written); pending.delete(written); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)); written++; if (written % fps === 0) process.stdout.write(`\r  ${written}/${total} quadros (${((Date.now() - t0) / 1000).toFixed(0)}s)`); } };
      let flushing = Promise.resolve();
      await Promise.all(pages.map(async (page) => { while (true) { const i = next++; if (i >= total) break; while (i - written > 90) await new Promise((r) => setTimeout(r, 5)); pending.set(i, await grab(page, i / fps)); flushing = flushing.then(flush); } }));
      await flushing; await flush(); ff.stdin.end(); await ffDone;
      const audio = path.resolve(ROOT, 'audio/trilha.wav');
      if (fs.existsSync(audio)) { execSync(`ffmpeg -y -loglevel error -i "${silent}" -i "${audio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "${out}"`); fs.unlinkSync(silent); }
      else fs.renameSync(silent, out);
      console.log('\n  final:', out);
    }
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
