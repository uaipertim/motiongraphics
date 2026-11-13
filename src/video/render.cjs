// render.cjs — renderiza o vídeo quadro a quadro (Playwright + canvas) e codifica com ffmpeg
// uso:
//   node src/video/render.cjs video  --workers 4 --saida build/video.mp4
//   node src/video/render.cjs quadros --tempos 0,1.5,3 --dir build/quadros
//   node src/video/render.cjs qa --saida build/qa.json
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const TEMPO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'tempo.json'), 'utf8'));
const FPS = TEMPO.fps;
const NQ = Math.round(TEMPO.duracao * FPS);

function arg(nome, padrao) {
  const i = process.argv.indexOf('--' + nome);
  return i >= 0 ? process.argv[i + 1] : padrao;
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
function servidor() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(RAIZ) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}
async function abrePagina(browser, porta) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[pagina]', m.text()); });
  page.on('pageerror', (e) => console.error('[pagina]', e.message));
  await page.goto(`http://127.0.0.1:${porta}/src/video/index.html`);
  await page.evaluate(() => window.pronto);
  return page;
}
async function captura(page, t) {
  await page.evaluate((tt) => window.renderFrame(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}

async function main() {
  const modo = process.argv[2];
  const srv = await servidor();
  const porta = srv.address().port;
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  try {
    if (modo === 'quadros') {
      const dir = path.resolve(arg('dir', 'build/quadros'));
      fs.mkdirSync(dir, { recursive: true });
      const page = await abrePagina(browser, porta);
      for (const ts of arg('tempos', '0').split(',')) {
        const t = parseFloat(ts);
        const png = await captura(page, t);
        fs.writeFileSync(path.join(dir, `q_${t.toFixed(3).padStart(7, '0')}.png`), png);
      }
    } else if (modo === 'capa') {
      const page = await abrePagina(browser, porta);
      const info = await page.evaluate(() => window.renderCapa());
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
      fs.writeFileSync(path.resolve(arg('saida', 'build/capa.png')), png);
      console.log('capa:', JSON.stringify(info));
    } else if (modo === 'qa') {
      const page = await abrePagina(browser, porta);
      const passo = parseFloat(arg('passo', '0.05'));
      const out = [];
      for (let t = 0; t < TEMPO.duracao; t += passo) {
        const reg = await page.evaluate((tt) => window.qaFrame(tt), t);
        out.push({ t: +t.toFixed(3), reg });
      }
      fs.writeFileSync(path.resolve(arg('saida', 'build/qa.json')), JSON.stringify(out));
    } else if (modo === 'video') {
      const nw = parseInt(arg('workers', '4'), 10);
      const de = parseInt(arg('de', '0'), 10), ate = parseInt(arg('ate', String(NQ)), 10);
      const saida = path.resolve(arg('saida', 'build/video.mp4'));
      const tmpdir = path.join(path.dirname(saida), 'seg');
      fs.mkdirSync(tmpdir, { recursive: true });
      const tam = Math.ceil((ate - de) / nw);
      const t0 = Date.now();
      let feitos = 0;
      const tarefas = [];
      for (let w = 0; w < nw; w++) {
        const a = de + w * tam, b = Math.min(ate, a + tam);
        if (a >= b) continue;
        tarefas.push((async () => {
          const page = await abrePagina(browser, porta);
          const seg = path.join(tmpdir, `seg_${String(w).padStart(2, '0')}.mp4`);
          const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
            '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-g', '60', '-bf', '2',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
            seg], { stdio: ['pipe', 'inherit', 'inherit'] });
          for (let f = a; f < b; f++) {
            const png = await captura(page, f / FPS);
            if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
            feitos++;
            if (feitos % 120 === 0) {
              const dt = (Date.now() - t0) / 1000;
              console.log(`${feitos}/${ate - de} quadros · ${(feitos / dt).toFixed(1)} q/s`);
            }
          }
          ff.stdin.end();
          await new Promise((r) => ff.on('close', r));
          await page.close();
          return seg;
        })());
      }
      const segs = await Promise.all(tarefas);
      const lista = path.join(tmpdir, 'lista.txt');
      fs.writeFileSync(lista, segs.map((s) => `file '${s}'`).join('\n'));
      await new Promise((ok, falha) => {
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', saida], { stdio: 'inherit' });
        ff.on('close', (c) => (c === 0 ? ok() : falha(new Error('concat falhou'))));
      });
      console.log(`ok: ${saida} em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  } finally {
    await browser.close();
    srv.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
