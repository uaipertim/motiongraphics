#!/usr/bin/env node
/*
 * Render da SÉRIE ROTINA (FAZLO Hospeda). O episódio vem de episodios/<id>.json.
 *   node scripts/render.cjs cues   --ep ep-01        -> audio/ep-01/cues.json (eventos de som tirados da animação)
 *   node scripts/render.cjs boxes  --ep ep-01        -> output/ep-01/revisao/caixas.json (caixa de cada elemento)
 *   node scripts/render.cjs video  --ep ep-01 [--fps 60] [--workers 4] -> output/ep-01/fazlo-hospeda-rotina-ep-01.mp4
 *   node scripts/render.cjs stills 0.5,2,5.2 --ep ep-01 [--dir output/ep-01/stills] [--noblur]
 *
 * Sobe um servidor estático local, abre src/index.html?render no Chromium
 * (Playwright), captura cada quadro do canvas e envia direto ao ffmpeg.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch (_) {
    const root = execSync('npm root -g').toString().trim();
    return require(path.join(root, 'playwright'));
  }
}
const { chromium } = loadPlaywright();

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const mode = args[0] || 'video';
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);
const EP = opt('ep', 'ep-01');
if (!fs.existsSync(path.join(ROOT, 'episodios', EP + '.json'))) { console.error(`episodios/${EP}.json não existe`); process.exit(1); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.png': 'image/png' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/src/index.html?render&ep=${EP}`);
  await page.evaluate(() => window.ready);
  return page;
}
const decode = (url) => Buffer.from(url.split(',')[1], 'base64');
const grab = async (page, t) => decode(await page.evaluate((t) => window.frameAt(t), t));

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--disable-gpu-vsync'] });
  try {
    if (mode === 'cues') {
      const page = await openPage(browser, port);
      const data = await page.evaluate(() => window.cues());
      const out = path.resolve(ROOT, `audio/${EP}/cues.json`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(data, null, 1));
      console.log(`cues: ${data.cues.length} eventos -> ${out}`);
    } else if (mode === 'boxes') {
      const page = await openPage(browser, port);
      const out = path.resolve(ROOT, `output/${EP}/revisao/caixas.json`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(await page.evaluate(() => window.boxes()), null, 1));
      console.log('caixas', out);
    } else if (mode === 'stills') {
      const times = (args[1] || '0').split(',').map(Number);
      const dir = path.resolve(ROOT, opt('dir', `output/${EP}/stills`));
      fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser, port);
      const o = flag('noblur') ? { noBlur: true } : {};
      for (const t of times) {
        const f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`);
        fs.writeFileSync(f, decode(await page.evaluate(([t, o]) => window.frameAt(t, o), [t, o])));
        console.log('still', f);
      }
    } else {
      const fps = Number(opt('fps', 60));
      const out = path.resolve(ROOT, opt('out', `output/${EP}/fazlo-hospeda-rotina-${EP}.mp4`));
      const silent = path.resolve(ROOT, `output/${EP}/.video-only.mp4`);
      const page0 = await openPage(browser, port);
      const dur = Number(opt('duration', await page0.evaluate(() => ROTINA.DURATION)));
      await page0.close();
      const total = Math.round(dur * fps);
      const workers = Number(opt('workers', 4));
      fs.mkdirSync(path.dirname(out), { recursive: true });

      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-tune', 'animation',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
      const ffDone = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));

      const pages = await Promise.all(Array.from({ length: workers }, () => openPage(browser, port)));
      const pending = new Map();
      let next = 0, written = 0;
      const t0 = Date.now();
      const flush = async () => {
        while (pending.has(written)) {
          const buf = pending.get(written); pending.delete(written);
          if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
          written++;
          if (written % fps === 0) process.stdout.write(`\r  ${written}/${total} quadros  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
        }
      };
      let flushing = Promise.resolve();
      await Promise.all(pages.map(async (page) => {
        while (true) {
          const i = next++;
          if (i >= total) break;
          while (i - written > 120) await new Promise((r) => setTimeout(r, 5));
          pending.set(i, await grab(page, i / fps));
          flushing = flushing.then(flush);
        }
      }));
      await flushing; await flush();
      ff.stdin.end();
      await ffDone;
      console.log(`\n  vídeo: ${silent}`);

      const audio = path.resolve(ROOT, `audio/${EP}/efeitos.wav`);
      if (fs.existsSync(audio)) {
        execSync(`ffmpeg -y -loglevel error -i "${silent}" -i "${audio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "${out}"`);
        fs.unlinkSync(silent);
      } else fs.renameSync(silent, out);
      console.log('  final:', out);
    }
  } finally {
    await browser.close();
    srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
