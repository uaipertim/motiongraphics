#!/usr/bin/env node
/*
 * Render dos Stories "Conheça" do FAZLO Hospeda (4 Stories de 8 s).
 *   node scripts/render.cjs cues                          -> audio/cues.json (eventos de som tirados da animação)
 *   node scripts/render.cjs video [1,2,3,4] [--fps 60] [--workers 4]
 *                                                         -> output/conheca-0N-*.mp4 (com audio/story-0N.wav)
 *   node scripts/render.cjs mux [1,2,3,4]                 -> troca só o áudio dos MP4 (depois de rodar audio.py)
 *   node scripts/render.cjs review                        -> output/conheca-sequencia-revisao.mp4 (os 4 em sequência)
 *   node scripts/render.cjs stills N 0.5,2,5.2 [--dir output/stills] [--noblur]
 *   node scripts/render.cjs cover [story|square] [--out ...]
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
const NAMES = ['marca', 'reservas', 'financeiro', 'convite'];
const videoOut = (n) => path.resolve(ROOT, `output/conheca-0${n}-${NAMES[n - 1]}.mp4`);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.png': 'image/png' };
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
  await page.goto(`http://127.0.0.1:${port}/src/index.html?render`);
  await page.evaluate(() => window.ready);
  return page;
}
const decode = (url) => Buffer.from(url.split(',')[1], 'base64');
const grab = async (page, n, t, noBlur = false) => decode(await page.evaluate(([n, t, nb]) => window.frameAt(n, t, nb), [n, t, noBlur]));

async function renderStory(browser, port, n, fps, workers) {
  const out = videoOut(n);
  const silent = path.resolve(ROOT, `output/.video-only-${n}.mp4`);
  const page0 = await openPage(browser, port);
  const dur = await page0.evaluate((n) => STORIES.DURATION[n - 1], n);
  await page0.close();
  const total = Math.round(dur * fps);
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
      if (written % fps === 0) process.stdout.write(`\r  story ${n}: ${written}/${total} quadros  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  };
  let flushing = Promise.resolve();
  await Promise.all(pages.map(async (page) => {
    while (true) {
      const i = next++;
      if (i >= total) break;
      while (i - written > 120) await new Promise((r) => setTimeout(r, 5));
      pending.set(i, await grab(page, n, i / fps));
      flushing = flushing.then(flush);
    }
  }));
  await flushing; await flush();
  ff.stdin.end();
  await ffDone;
  await Promise.all(pages.map((pg) => pg.close()));

  if (fs.existsSync(path.resolve(ROOT, `audio/story-0${n}.wav`))) { mux(n, silent); fs.unlinkSync(silent); } else fs.renameSync(silent, out);
  console.log(`\n  final: ${out}`);
}

function mux(n, video) {
  const audio = path.resolve(ROOT, `audio/story-0${n}.wav`), out = videoOut(n), tmp = out.replace('.mp4', '.tmp.mp4');
  execSync(`ffmpeg -y -loglevel error -i "${video}" -i "${audio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "${tmp}"`);
  fs.renameSync(tmp, out);
}

(async () => {
  if (mode === 'mux') {
    // troca só o áudio (depois de mexer na trilha), sem renderizar a imagem de novo
    const list = args[1] && !args[1].startsWith('--') ? args[1].split(',').map(Number) : [1, 2, 3, 4];
    for (const n of list) { mux(n, videoOut(n)); console.log('mux', videoOut(n)); }
    return;
  }
  if (mode === 'review') {
    // vídeo contínuo de revisão: os quatro Stories em sequência (áudio e vídeo reencodados juntos, sem emendas)
    const ins = [1, 2, 3, 4].map(videoOut);
    ins.forEach((f) => { if (!fs.existsSync(f)) throw new Error('falta ' + f); });
    const out = path.resolve(ROOT, opt('out', 'output/conheca-sequencia-revisao.mp4'));
    const inputs = ins.map((f) => `-i "${f}"`).join(' ');
    execSync(`ffmpeg -y -loglevel error ${inputs} -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a]concat=n=4:v=1:a=1[v][a]" -map "[v]" -map "[a]" ` +
      '-c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 4.2 -tune animation -color_primaries bt709 -color_trc bt709 -colorspace bt709 ' +
      `-c:a aac -b:a 256k -ar 48000 -movflags +faststart "${out}"`, { stdio: 'inherit' });
    console.log('revisão', out);
    return;
  }
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--disable-gpu-vsync'] });
  try {
    if (mode === 'cues') {
      const page = await openPage(browser, port);
      const data = await page.evaluate(() => window.cues());
      const out = path.resolve(ROOT, 'audio/cues.json');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(data, null, 1));
      console.log(`cues: ${data.stories.map((s) => s.length).join(' + ')} eventos -> ${out}`);
    } else if (mode === 'cover') {
      const kind = args[1] && !args[1].startsWith('--') ? args[1] : 'story';
      const page = await openPage(browser, port);
      const out = path.resolve(ROOT, opt('out', kind === 'square' ? 'output/capa-destaque-conheca.png' : 'output/capa-destaque-conheca-story.png'));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, decode(await page.evaluate((k) => window.coverFrame(k), kind)));
      console.log('capa', out);
    } else if (mode === 'stills') {
      const n = Number(args[1] || 1);
      const times = (args[2] || '0').split(',').map(Number);
      const dir = path.resolve(ROOT, opt('dir', 'output/stills'));
      fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser, port);
      for (const t of times) {
        const f = path.join(dir, `s${n}-t${t.toFixed(2).padStart(5, '0')}.png`);
        fs.writeFileSync(f, await grab(page, n, t, flag('noblur')));
        console.log('still', f);
      }
    } else {
      const list = args[1] && !args[1].startsWith('--') ? args[1].split(',').map(Number) : [1, 2, 3, 4];
      const fps = Number(opt('fps', 60)), workers = Number(opt('workers', 4));
      for (const n of list) await renderStory(browser, port, n, fps, workers);
    }
  } finally {
    await browser.close();
    srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
