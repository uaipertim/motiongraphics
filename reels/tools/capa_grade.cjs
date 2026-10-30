#!/usr/bin/env node
/*
 * Capa para a grade do perfil, desenhada à parte pela página do próprio Reel (o vídeo não muda).
 *
 *   node reels/tools/capa_grade.cjs reels/<pasta>
 *     -> <pasta>/output/grade/capa.png + <pasta>/output/grade/revisao/capa-caixas.json (com o _bloco: topo, base, centro)
 *
 * A página do Reel (src/index.html) expõe window.capaGrade() -> { png, caixas, bloco }: o bloco principal vem
 * centralizado na vertical do recorte 3:4 (centro em y = 960). Depois:
 *   python3 reels/tools/revisao_capa.py reels/<pasta> --saida reels/<pasta>/output/grade
 * Caixas inteiramente dentro de outra contam como parte dela (o texto de um cartão, por exemplo).
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { execSync } = require('child_process');
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const { chromium } = loadPlaywright();
const ROOT = path.resolve(process.argv[2] || '.');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
srv.listen(0, '127.0.0.1', async () => {
  const browser = await chromium.launch();
  try {
    const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    pg.on('pageerror', (e) => console.error('[page]', e.message));
    await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready);
    const r = await pg.evaluate(() => window.capaGrade());
    const out = path.join(ROOT, 'output', 'grade'); fs.mkdirSync(path.join(out, 'revisao'), { recursive: true });
    fs.writeFileSync(path.join(out, 'capa.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    const dentro = (b, o) => o !== b && o.x0 <= b.x0 + 1 && o.x1 >= b.x1 - 1 && o.y0 <= b.y0 + 1 && o.y1 >= b.y1 - 1;
    const cx = r.caixas.filter((b) => !r.caixas.some((o) => dentro(b, o)));
    const json = Object.fromEntries(cx.map((b) => [b.nome, { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1 }]));
    json._bloco = r.bloco;
    fs.writeFileSync(path.join(out, 'revisao', 'capa-caixas.json'), JSON.stringify(json, null, 1));
    console.log(`capa da grade: bloco y ${r.bloco.topo.toFixed(0)}–${r.bloco.base.toFixed(0)}, centro ${r.bloco.centro.toFixed(1)}`);
  } finally { await browser.close(); srv.close(); }
});
