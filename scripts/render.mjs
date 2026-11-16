// Renderiza um trecho do vídeo, quadro a quadro, e entrega PNGs ao ffmpeg (sem perdas).
// node scripts/render.mjs --ini 0 --fim 600 --saida trecho.mkv [--fps 60]
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const fps = Number(arg('fps', 60)), ini = Number(arg('ini', 0)), saida = arg('saida');
let fim = Number(arg('fim', -1));

const nav = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
const pag = await nav.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
pag.on('pageerror', (e) => { console.error('[erro na página]', e.message); process.exit(2); });
await pag.goto('file://' + path.join(raiz, 'src/index.html'));
await pag.waitForFunction('window.PRONTO || window.ERRO', null, { timeout: 120000 });
const erro = await pag.evaluate('window.ERRO');
if (erro) { console.error(erro); process.exit(1); }
const dur = await pag.evaluate('window.DUR');
const total = Math.round(dur * fps);
if (fim < 0 || fim > total) fim = total;

const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0', '-pix_fmt', 'rgb24', saida], { stdio: ['pipe', 'inherit', 'inherit'] });
const cdp = await pag.context().newCDPSession(pag);
const t0 = Date.now();
for (let q = ini; q < fim; q++) {
  await pag.evaluate((t) => window.renderAt(t), q / fps);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  const buf = Buffer.from(data, 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if ((q - ini) % 600 === 599) console.error(`[${ini}-${fim}] ${q - ini + 1}/${fim - ini} quadros, ${((Date.now() - t0) / (q - ini + 1)).toFixed(0)} ms/quadro`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await nav.close();
console.error(`[${ini}-${fim}] pronto em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
