#!/usr/bin/env node
/*
 * node scripts/render.cjs info                     -> output/info.json (eventos de som, telas, legenda)
 * node scripts/render.cjs video --mix audio/mix.wav -> output/fazlo-hospeda-curto.mp4 (1080×1920, 60 fps)
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn, execSync } = require('child_process');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..'), args = process.argv.slice(2), modo = args[0] || 'video';
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const nav = await chromium.launch();
  const abre = async () => { const pg = await nav.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', (e) => { console.error('[pagina]', e.message); process.exit(2); }); await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready); return pg; };
  const OUT = path.join(ROOT, 'output'); fs.mkdirSync(OUT, { recursive: true });
  try {
    if (modo === 'info') {
      const pg = await abre();
      const info = await pg.evaluate(() => ({ duracao: CURTO.DURATION, eventos: CURTO.eventos(), ...CURTO.plano() }));
      fs.writeFileSync(path.join(OUT, 'info.json'), JSON.stringify(info, null, 1)); console.log('info.json', info.eventos.length, 'eventos');
    } else {
      const fps = Number(opt('fps', 60)), workers = Number(opt('workers', 4));
      const pg0 = await abre(); const dur = await pg0.evaluate(() => CURTO.DURATION); await pg0.close();
      const total = Math.round(dur * fps), mudo = path.join(OUT, '.so-video.mp4'), saida = path.join(OUT, 'fazlo-hospeda-curto.mp4');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16',
        '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', mudo], { stdio: ['pipe', 'inherit', 'inherit'] });
      const fim = new Promise((ok, erro) => ff.on('close', (c) => (c === 0 ? ok() : erro(new Error('ffmpeg ' + c)))));
      const pgs = await Promise.all(Array.from({ length: workers }, abre));
      const pend = new Map(); let prox = 0, escritos = 0, cadeia = Promise.resolve();
      const despeja = async () => { while (pend.has(escritos)) { const b = pend.get(escritos); pend.delete(escritos); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)); escritos++; } };
      const t0 = Date.now();
      await Promise.all(pgs.map(async (pg) => { for (;;) { const i = prox++; if (i >= total) break; while (i - escritos > 120) await new Promise((r) => setTimeout(r, 5)); const u = await pg.evaluate((t) => window.frameAt(t), i / fps); pend.set(i, Buffer.from(u.split(',')[1], 'base64')); cadeia = cadeia.then(despeja); if (i % 600 === 0) console.error(`${i}/${total} quadros, ${((Date.now() - t0) / 1000).toFixed(0)} s`); } }));
      await cadeia; await despeja(); ff.stdin.end(); await fim;
      execSync(`ffmpeg -y -loglevel error -i "${mudo}" -i "${opt('mix', 'audio/mix.wav')}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -t ${(total / fps).toFixed(4)} -movflags +faststart "${saida}"`, { cwd: ROOT });
      fs.unlinkSync(mudo); console.log('vídeo:', saida, total, 'quadros');
    }
  } finally { await nav.close(); srv.close(); }
});
