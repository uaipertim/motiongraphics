#!/usr/bin/env node
/*
 * Carrossel ANIMADO "Tarifa de dezembro: quando e quanto subir?" — 8 vídeos 1080x1350 (4:5), 7 s, 30 fps.
 * O pipeline dos Reels educativos (reels/educativo/<reel>/scripts/render.cjs): sobe um servidor estático, abre
 * src/index.html?render no Chromium (Playwright), desenha cada quadro (window.frameAt) e manda as capturas para o
 * ffmpeg (H.264 yuv420p), com uma faixa de áudio AAC silenciosa (sem trilha, sem narração).
 *   node scripts/render.cjs            -> output/01.mp4 … 08.mp4 + output/png/01.png … 08.png (o último quadro de cada)
 *   node scripts/render.cjs 1,4        -> só os slides pedidos
 *   node scripts/render.cjs stills 2:0.5,4:1.2 [--dir output/stills]   -> quadros soltos (slide:segundo)
 * Depois: python3 scripts/previa.py  -> output/previa.jpg + revisão (ffprobe, margens, canto do som, estabilidade)
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn, execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
const serve = () => new Promise((ok) => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => ok(s)); });
async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(`http://127.0.0.1:${port}/src/index.html?render`);
  await page.evaluate(() => window.ready);
  return page;
}
const grab = async (page, n, t) => { await page.evaluate(([n, t]) => window.frameAt(n, t), [n, t]); return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1350 } }); };

(async () => {
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--font-render-hinting=none'] });
  try {
    if (args[0] === 'stills') {
      const dir = path.resolve(ROOT, opt('dir', 'output/stills')); fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser, port);
      for (const s of args[1].split(',')) { const [n, t] = s.split(':').map(Number); const f = path.join(dir, `s${String(n).padStart(2, '0')}-t${t.toFixed(2)}.png`); fs.writeFileSync(f, await grab(page, n, t)); console.log('still', f); }
      return;
    }
    const only = (args[0] || '').split(',').filter(Boolean).map(Number);
    const page0 = await openPage(browser, port);
    const { N, DUR, FPS } = await page0.evaluate(() => ({ N: CARROSSEL.N, DUR: CARROSSEL.DUR, FPS: CARROSSEL.FPS })); await page0.close();
    const total = Math.round(DUR * FPS), workers = Number(opt('workers', 4));
    fs.mkdirSync(path.join(ROOT, 'output', 'png'), { recursive: true });
    const pages = await Promise.all(Array.from({ length: workers }, () => openPage(browser, port)));
    const linhas = [];
    for (let n = 1; n <= N; n++) {
      if (only.length && !only.includes(n)) continue;
      const nn = String(n).padStart(2, '0'), out = path.join(ROOT, 'output', `${nn}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '128k', '-t', (total / FPS).toFixed(4), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
      const ffDone = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
      const pending = new Map(); let next = 0, written = 0, last = null;
      const flush = async () => { while (pending.has(written)) { const b = pending.get(written); pending.delete(written); if (written === total - 1) last = b; if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)); written++; } };
      let flushing = Promise.resolve();
      await Promise.all(pages.map(async (page) => { while (true) { const i = next++; if (i >= total) break; while (i - written > 60) await new Promise((r) => setTimeout(r, 5)); pending.set(i, await grab(page, n, i / FPS)); flushing = flushing.then(flush); } }));
      await flushing; await flush(); ff.stdin.end(); await ffDone;
      fs.writeFileSync(path.join(ROOT, 'output', 'png', `${nn}.png`), last);           // a versão estática de segurança (o último quadro)
      linhas.push(...(await pages[0].evaluate(([n, t]) => window.frameAt(n, t), [n, (total - 1) / FPS])).map((l) => ({ ...l, slide: n })));
      console.log('slide', nn, '->', path.relative(ROOT, out));
    }
    const rev = path.join(ROOT, 'output', 'revisao'); fs.mkdirSync(rev, { recursive: true });
    if (!only.length) {
      const so = linhas.filter((l) => l.sozinha);
      fs.writeFileSync(path.join(rev, 'linhas.txt'), 'TARIFA DE DEZEMBRO — linhas de texto no último quadro (palavra sozinha numa linha = FALHA)\n\n' + linhas.map((l) => `${l.sozinha ? 'FALHA' : 'ok   '}  slide ${String(l.slide).padStart(2, '0')} ${l.tag}: ${l.texto}`).join('\n') + `\n\nRESULTADO: ${so.length ? so.length + ' palavra(s) sozinha(s)' : 'nenhuma palavra sozinha numa linha'}\n`);
      console.log(so.length ? 'PALAVRA SOZINHA: ' + so.map((l) => `slide ${l.slide} "${l.texto}"`).join('; ') : 'linhas: nenhuma palavra sozinha');
    }
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
