#!/usr/bin/env node
/*
 * node scripts/render.cjs telas                    -> midia/tela-p2/NNNN.png (a tela do chat do P2, plana, para scripts/base.py)
 * node scripts/render.cjs stills 2,15,23           -> output/stills/tNN.NN.png (o quadro final)
 * node scripts/render.cjs info                     -> output/info.json (legenda e caixas de cada quadro)
 * node scripts/render.cjs video [--workers 4]      -> output/sai-da-pousada.mp4 (30 fps; áudio audio/mix.wav com -t)
 *
 * A página (src/index.html + src/anim.js) desenha o quadro inteiro: o quadro-base de midia/quadros (scripts/base.py),
 * o recorte do P4 (scripts/recorte.py) e a camada de motion.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn, execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'output');
const args = process.argv.slice(2), mode = args[0] || 'video', opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const LN = JSON.parse(fs.readFileSync(path.join(ROOT, 'linha.json'))), FPS = 30, DUR = LN.duracao;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' };
const decode = (u) => Buffer.from(u.split(',')[1], 'base64');
(async () => {
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  const open = async () => { const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', (e) => console.error('[page]', e.message)); await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready); return pg; };
  fs.mkdirSync(OUT, { recursive: true });
  try {
    if (mode === 'telas') {
      const pg = await open(), dir = path.join(ROOT, 'midia', 'tela-p2'); fs.mkdirSync(dir, { recursive: true });
      const p2 = LN.planos.find((p) => p.id === 'p2'); let n = 0;
      for (let k = Math.round(p2.t0 * FPS); k < Math.round(p2.t1 * FPS); k++) { fs.writeFileSync(path.join(dir, String(k).padStart(4, '0') + '.png'), decode(await pg.evaluate((t) => window.telaAt(t), k / FPS))); n++; }
      console.log('telas do P2:', n);
    } else if (mode === 'stills') {
      const pg = await open(), dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
      for (const t of (args[1] || '0').split(',').map(Number)) {
        const f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`);
        fs.writeFileSync(f, decode(await pg.evaluate((t) => window.frameAt(t), Math.round(t * FPS) / FPS))); console.log(f);
      }
    } else if (mode === 'info') {
      const pgs = await Promise.all(Array.from({ length: 4 }, open)), total = Math.round(DUR * FPS), cx = new Array(total);
      let next = 0;
      await Promise.all(pgs.map(async (pg) => { for (;;) { const k = next++; if (k >= total) break; cx[k] = { t: Math.round(k / FPS * 1000) / 1000, caixas: await pg.evaluate((t) => window.caixas(t), k / FPS) }; } }));
      const info = { duracao: DUR, legenda: await pgs[0].evaluate(() => REEL.legenda()), caixas: cx };
      fs.writeFileSync(path.join(OUT, 'info.json'), JSON.stringify(info)); console.log('info.json');
    } else {
      const total = Math.round(DUR * FPS), workers = Number(opt('workers', 4)), out = path.join(OUT, 'sai-da-pousada.mp4');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', '-i', path.join(ROOT, 'audio/mix.wav'),
        '-map', '0:v', '-map', '1:a', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-r', '30', '-profile:v', 'high',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
        '-t', (total / FPS).toFixed(4), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
      const pages = await Promise.all(Array.from({ length: workers }, open));
      const pend = new Map(); let next = 0, written = 0, chain = Promise.resolve();
      const flush = async () => { while (pend.has(written)) { const b = pend.get(written); pend.delete(written); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)); written++; } };
      await Promise.all(pages.map(async (pg) => { for (;;) { const i = next++; if (i >= total) break; while (i - written > 60) await new Promise((r) => setTimeout(r, 5)); pend.set(i, decode(await pg.evaluate((t) => window.frameAt(t), i / FPS))); chain = chain.then(flush); } }));
      await chain; await flush(); ff.stdin.end(); await done; console.log('vídeo:', out, `(${total} quadros)`);
    }
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
