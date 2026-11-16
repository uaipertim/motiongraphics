// Renderiza quadros avulsos: node scripts/quadro.mjs --saida DIR [--escala 0.5] t1 t2 …
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let saida = 'quadros', tempos = [], jpg = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--saida') saida = args[++i];
  else if (args[i] === '--jpg') jpg = true;
  else if (args[i] === '--faixa') { const [a, b, p] = args[++i].split(':').map(Number); for (let t = a; t <= b + 1e-9; t += p) tempos.push(Math.round(t * 1000) / 1000); }
  else tempos.push(Number(args[i]));
}
fs.mkdirSync(saida, { recursive: true });
const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
pag.on('console', (m) => { if (m.type() === 'error') console.error('[pagina]', m.text()); });
pag.on('pageerror', (e) => console.error('[erro]', e.message));
await pag.goto('file://' + path.join(raiz, 'src/index.html'));
await pag.waitForFunction('window.PRONTO || window.ERRO', null, { timeout: 60000 });
const erro = await pag.evaluate('window.ERRO');
if (erro) { console.error(erro); process.exit(1); }
const t0 = Date.now();
for (const t of tempos) {
  await pag.evaluate((x) => window.renderAt(x), t);
  const nome = path.join(saida, `q_${t.toFixed(3).padStart(8, '0')}.${jpg ? 'jpg' : 'png'}`);
  await pag.screenshot({ path: nome, type: jpg ? 'jpeg' : 'png', quality: jpg ? 90 : undefined });
}
console.log(`${tempos.length} quadros em ${((Date.now() - t0) / 1000).toFixed(1)} s → ${saida}`);
await nav.close();
