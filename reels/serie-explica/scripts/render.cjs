#!/usr/bin/env node
/*
 * Render da SÉRIE EXPLICA (FAZLO Hospeda). O episódio vem de episodios/<id>.json (a linha do tempo, de audio/<id>/linha.json).
 *   node scripts/render.cjs cues   --ep explica-01     -> audio/explica-01/cues.json (eventos de som tirados da animação)
 *   node scripts/render.cjs info   --ep explica-01     -> output/explica-01/revisao/motor.json (linhas de apoio, trocas, montagens, fecho, notinha, medidas)
 *                                                         + caixas.json (as caixas do conteúdo importante a cada 0,25 s)
 *   node scripts/render.cjs capa   --ep explica-01     -> output/explica-01/capa.png (o quadro 0) + revisao/capa-caixas.json
 *   node scripts/render.cjs video  --ep explica-01 [--fps 60] [--workers 4] -> output/explica-01/fazlo-hospeda-explica-01.mp4
 *   node scripts/render.cjs stills 0.5,2,5.2 --ep explica-01 [--dir output/explica-01/stills]
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
const EP = opt('ep', 'explica-01');
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
    } else if (mode === 'info') {
      const page = await openPage(browser, port);
      const dir = path.resolve(ROOT, `output/${EP}/revisao`);
      fs.mkdirSync(dir, { recursive: true });
      const info = await page.evaluate(() => ({ duracao: EXPLICA.DURATION, apoios: EXPLICA.apoios(), trocas: EXPLICA.trocas(), montagens: EXPLICA.montagens(), fecho: EXPLICA.fecho(), notinha: EXPLICA.notinha(), medidas: EXPLICA.medidas(), cues: EXPLICA.cues().cues, legenda: EXPLICA.legenda(), legenda_medidas: EXPLICA.legenda_medidas() }));
      fs.writeFileSync(path.join(dir, 'motor.json'), JSON.stringify(info, null, 1));
      const caixas = [];
      for (let t = 0; t < info.duracao; t += 0.25) caixas.push({ t: Math.round(t * 100) / 100, caixas: await page.evaluate((t) => window.caixas(t), t) });
      fs.writeFileSync(path.join(dir, 'caixas.json'), JSON.stringify(caixas));
      console.log('motor.json + caixas.json ->', dir);
    } else if (mode === 'capa') {
      const page = await openPage(browser, port);
      const dir = path.resolve(ROOT, `output/${EP}`);
      fs.mkdirSync(path.join(dir, 'revisao'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'capa.png'), decode(await page.evaluate(() => window.frameAt(0))));
      // as caixas do quadro 0 para a revisão da capa; o "bloco" é o conteúdo da capa sem a marca do topo
      const bx = (await page.evaluate(() => window.caixas(0))).filter((b) => !b.tipo && b.y1 > 0 && b.y0 < 1920);
      const out = {};
      bx.forEach((b) => { out[b.nome] = { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1 }; });
      const bloco = bx.filter((b) => b.nome !== 'marca');
      const topo = Math.min(...bloco.map((b) => b.y0)), base = Math.max(...bloco.map((b) => b.y1));
      out._bloco = { topo, base, centro: (topo + base) / 2 };
      fs.writeFileSync(path.join(dir, 'revisao', 'capa-caixas.json'), JSON.stringify(out, null, 1));
      console.log('capa ->', path.join(dir, 'capa.png'));
    } else if (mode === 'stills') {
      const times = (args[1] || '0').split(',').map(Number);
      const dir = path.resolve(ROOT, opt('dir', `output/${EP}/stills`));
      fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser, port);
      for (const t of times) {
        const f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`);
        fs.writeFileSync(f, decode(await page.evaluate((t) => window.frameAt(t), t)));
        console.log('still', f);
      }
    } else {
      const fps = Number(opt('fps', 60));
      const out = path.resolve(ROOT, opt('out', `output/${EP}/fazlo-hospeda-${EP}.mp4`));
      const silent = path.resolve(ROOT, `output/${EP}/.video-only.mp4`);
      const page0 = await openPage(browser, port);
      const dur = Number(opt('duration', await page0.evaluate(() => EXPLICA.DURATION)));
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

      const audio = path.resolve(ROOT, `audio/${EP}/mix.wav`);
      if (fs.existsSync(audio)) {
        execSync(`ffmpeg -y -loglevel error -i "${silent}" -i "${audio}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -t ${(total / fps).toFixed(4)} -movflags +faststart "${out}"`);
        fs.unlinkSync(silent);
      } else fs.renameSync(silent, out);
      console.log('  final:', out);
    }
  } finally {
    await browser.close();
    srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
