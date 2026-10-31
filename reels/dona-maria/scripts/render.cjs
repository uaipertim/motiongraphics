#!/usr/bin/env node
/*
 * node scripts/render.cjs stills 2,15,23          -> output/stills/tNN.NN.png (a camada sobre o quadro do vídeo)
 * node scripts/render.cjs info                     -> output/info.json (legenda e caixas a cada 0,25 s)
 * node scripts/render.cjs video [--workers 4]      -> output/dona-maria.mp4 (30 fps; áudio audio/mix.wav com -t)
 *
 * A camada do motor (src/anim.js, PNG com transparência) vai por cima de: fundo preto + abertura (desde 0 s) +
 * fechamento (desde linha.fechamento[0]). Os vídeos da Dona Maria entram como estão em midia/*-1080.mp4.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn, execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'output');
const args = process.argv.slice(2), mode = args[0] || 'video', opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const LN = JSON.parse(fs.readFileSync(path.join(ROOT, 'linha.json'))), FPS = 30, DUR = LN.duracao, F0 = LN.fechamento[0];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
const decode = (u) => Buffer.from(u.split(',')[1], 'base64');
const base = (t) => (t < LN.abertura[1] + 0.2 ? ['midia/abertura-1080.mp4', t] : t >= F0 && t < LN.logo ? ['midia/fechamento-1080.mp4', t - F0] : null);
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
    if (mode === 'stills') {
      const pg = await open(), dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
      for (const t of (args[1] || '0').split(',').map(Number)) {
        const ov = path.join(dir, '.camada.png'); fs.writeFileSync(ov, decode(await pg.evaluate((t) => window.frameAt(t), t)));
        const f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`), b = base(t);
        const inp = b ? `-ss ${b[1].toFixed(3)} -i "${path.join(ROOT, b[0])}"` : '-f lavfi -i color=c=0x0A0A0A:s=1080x1920:d=1';
        execSync(`ffmpeg -v error -y ${inp} -i "${ov}" -filter_complex "[0:v][1:v]overlay" -frames:v 1 "${f}"`); console.log(f);
      }
    } else if (mode === 'info') {
      const pg = await open(), info = { duracao: DUR, legenda: await pg.evaluate(() => REEL.legenda()), caixas: [] };
      for (let t = 0; t < DUR; t += 0.25) info.caixas.push({ t: Math.round(t * 100) / 100, caixas: await pg.evaluate((t) => window.caixas(t), t) });
      fs.writeFileSync(path.join(OUT, 'info.json'), JSON.stringify(info)); console.log('info.json');
    } else {
      const total = Math.round(DUR * FPS), workers = Number(opt('workers', 4)), out = path.join(OUT, 'dona-maria.mp4');
      const fc = `color=c=0x0A0A0A:s=1080x1920:r=30:d=${DUR}[bg];[0:v]setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS+${F0}/TB[f];` +
        `[bg][a]overlay=eof_action=pass[b1];[b1][f]overlay=eof_action=pass[b2];[b2][2:v]overlay=format=auto,format=yuv420p[v]`;
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(ROOT, 'midia/abertura-1080.mp4'), '-i', path.join(ROOT, 'midia/fechamento-1080.mp4'),
        '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', '-i', path.join(ROOT, 'audio/mix.wav'),
        '-filter_complex', fc, '-map', '[v]', '-map', '3:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-r', '30', '-profile:v', 'high',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
        '-t', (total / FPS).toFixed(4), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
      const pages = await Promise.all(Array.from({ length: workers }, open));
      const pend = new Map(); let next = 0, written = 0, chain = Promise.resolve();
      const flush = async () => { while (pend.has(written)) { const b = pend.get(written); pend.delete(written); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)); written++; } };
      await Promise.all(pages.map(async (pg) => { for (;;) { const i = next++; if (i >= total) break; while (i - written > 90) await new Promise((r) => setTimeout(r, 5)); pend.set(i, decode(await pg.evaluate((t) => window.frameAt(t), i / FPS))); chain = chain.then(flush); } }));
      await chain; await flush(); ff.stdin.end(); await done; console.log('vídeo:', out, `(${total} quadros)`);
    }
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
