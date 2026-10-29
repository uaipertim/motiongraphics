#!/usr/bin/env node
/*
 * node scripts/render.cjs stills 0,2,5 [--previa]        -> output/stills/tNN.NN.png
 * node scripts/render.cjs video [--previa] [--audio voz.wav | --mix audio/mix.wav] [--fps 60] [--workers 4]
 *        (--mix: a mixagem pronta de scripts/audio.py, já no tempo do vídeo)
 *        -> output/fazlo-hospeda-apresentacao[-previa].mp4 (com --audio, a locução entra em linha.inicio_voz)
 * node scripts/render.cjs info                          -> output/info.json (legenda, tempos, caixas a cada 0,25 s)
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn, execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), mode = args[0] || 'video';
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const PREVIA = args.includes('--previa');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
const serve = () => new Promise((res) => {
  const s = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  s.listen(0, '127.0.0.1', () => res(s));
});
const decode = (u) => Buffer.from(u.split(',')[1], 'base64');
(async () => {
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch();
  const open = async () => {
    const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    pg.on('pageerror', (e) => console.error('[page]', e.message));
    await pg.goto(`http://127.0.0.1:${port}/src/index.html${PREVIA ? '?previa' : ''}`); await pg.evaluate(() => window.ready); return pg;
  };
  const OUT = path.join(ROOT, 'output'); fs.mkdirSync(OUT, { recursive: true });
  try {
    if (mode === 'stills') {
      const pg = await open(), dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
      for (const t of (args[1] || '0').split(',').map(Number)) { const f = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`); fs.writeFileSync(f, decode(await pg.evaluate((t) => window.frameAt(t), t))); console.log(f); }
    } else if (mode === 'info') {
      const pg = await open();
      const info = await pg.evaluate(() => ({ duracao: REEL.DURATION, legenda: REEL.legenda(), cap: REEL.CAP, plano: REEL.plano() }));
      info.caixas = [];
      for (let t = 0; t < info.duracao; t += 0.25) info.caixas.push({ t: Math.round(t * 100) / 100, caixas: await pg.evaluate((t) => window.caixas(t), t) });
      fs.writeFileSync(path.join(OUT, 'info.json'), JSON.stringify(info)); console.log('info.json');
    } else {
      const fps = Number(opt('fps', 60)), workers = Number(opt('workers', 4));
      const pg0 = await open(); const dur = await pg0.evaluate(() => REEL.DURATION); await pg0.close();
      const total = Math.round(dur * fps), name = `fazlo-hospeda-apresentacao${PREVIA ? '-previa' : ''}`;
      const silent = path.join(OUT, '.video-only.mp4'), out = path.join(OUT, name + '.mp4');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16',
        '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
      const pages = await Promise.all(Array.from({ length: workers }, open));
      const pend = new Map(); let next = 0, written = 0;
      const flush = async () => { while (pend.has(written)) { const b = pend.get(written); pend.delete(written); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r)); written++; } };
      let chain = Promise.resolve();
      await Promise.all(pages.map(async (pg) => { for (;;) { const i = next++; if (i >= total) break; while (i - written > 120) await new Promise((r) => setTimeout(r, 5)); pend.set(i, decode(await pg.evaluate((t) => window.frameAt(t), i / fps))); chain = chain.then(flush); } }));
      await chain; await flush(); ff.stdin.end(); await done;
      const audio = opt('audio'), mix = opt('mix');
      const lnj = JSON.parse(fs.readFileSync(path.join(ROOT, 'linha.json')));
      if (mix) {
        execSync(`ffmpeg -y -loglevel error -i "${silent}" -i "${mix}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -t ${(total / fps).toFixed(4)} -movflags +faststart "${out}"`);
      } else if (audio) {
        const d = Math.round(lnj.inicio_voz * 1000);
        execSync(`ffmpeg -y -loglevel error -i "${silent}" -i "${audio}" -filter_complex "[1:a]adelay=${d}|${d},apad[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -t ${(total / fps).toFixed(4)} -movflags +faststart "${out}"`);
      } else {
        // sem locução: trilha de silêncio, para o arquivo abrir em qualquer lugar com áudio
        execSync(`ffmpeg -y -loglevel error -i "${silent}" -f lavfi -i anullsrc=r=48000:cl=stereo -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -t ${(total / fps).toFixed(4)} -movflags +faststart "${out}"`);
      }
      fs.unlinkSync(silent); console.log('vídeo:', out, `(${total} quadros)`);
    }
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
