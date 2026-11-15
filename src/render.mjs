// Renderiza src/video.html quadro a quadro (PNG) com Playwright.
// uso: node render.mjs <dirSaida> [inicio fim] [workers]  |  node render.mjs --stills <dir> t1,t2,...
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright'); // resolve pelo NODE_PATH global
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path'; import fs from 'fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, 'video.html')).href;
const FPS = 60, DUR = 59.5, TOTAL = Math.round(FPS * DUR);
const args = process.argv.slice(2);
const browsers = [];
async function mkPage() {
  const browser = await chromium.launch(); browsers.push(browser); // um navegador por worker: as capturas não ficam em fila
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => { console.error('PAGE ERROR', e.message); });
  await p.goto(url); await p.evaluate(() => window.ready); return p;
}
if (args[0] === '--capa') { // capa da grade: quadro 0 com o bloco centrado em y 960
  const p = await mkPage();
  await p.evaluate(() => { window.capaDy = 20; window.renderFrame(0); });
  await p.screenshot({ path: args[1], type: 'jpeg', quality: 93 });
} else if (args[0] === '--stills') {
  const dir = args[1]; fs.mkdirSync(dir, { recursive: true });
  const p = await mkPage();
  for (const t of args[2].split(',')) {
    await p.evaluate(n => window.renderFrame(n), Math.round(parseFloat(t) * FPS));
    await p.screenshot({ path: path.join(dir, `t${(+t).toFixed(2).padStart(5, '0')}.png`) });
  }
} else {
  const dir = args[0]; fs.mkdirSync(dir, { recursive: true });
  const a = +(args[1] ?? 0), b = +(args[2] ?? TOTAL), nw = +(args[3] ?? 4);
  let next = a;
  await Promise.all(Array.from({ length: nw }, async () => {
    const p = await mkPage();
    for (;;) { const n = next++; if (n >= b) break;
      await p.evaluate(k => window.renderFrame(k), n);
      await p.screenshot({ path: path.join(dir, String(n).padStart(5, '0') + '.png') });
      if (n % 300 === 0) console.log('quadro', n);
    }
  }));
}
for (const b of browsers) await b.close();
