// node scripts/conferir-marca.cjs -> confere, quadro a quadro (60 fps), a cena da marca inteira:
// nenhum selo pode encostar no símbolo, no nome "FAZLO Hospeda" nem no check; selos não se sobrepõem e ficam dentro do quadro.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..'), MARGEM = 40;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const nav = await chromium.launch(); const pg = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready);
  const r = await pg.evaluate(() => {
    const [t0, t1] = CURTO.marcaT(), out = [];
    for (let f = Math.ceil(t0 * 60); f / 60 < t1; f++) out.push({ f, t: f / 60, ...CURTO.marca(f / 60) });
    return out;
  });
  let pior = { folga: 1e9 }, erros = [];
  for (const q of r) {
    if (q.selos.length && q.logo.length && q.folga < pior.folga) pior = q;
    if (q.logo.length && q.selos.length && q.folga < MARGEM) erros.push(`t=${q.t.toFixed(3)} folga ${q.folga.toFixed(1)} px`);
    for (let i = 0; i < q.selos.length; i++) {
      const a = q.selos[i];
      if (a[1] < 16 || a[3] > 1064 || a[2] < 16 || a[4] > 1904) erros.push(`t=${q.t.toFixed(3)} ${a[0]} fora do quadro`);
      for (let j = i + 1; j < q.selos.length; j++) { const b = q.selos[j]; if (a[1] < b[3] && b[1] < a[3] && a[2] < b[4] && b[2] < a[4]) erros.push(`t=${q.t.toFixed(3)} ${a[0]} x ${b[0]}`); }
    }
  }
  const comSelos = r.filter((q) => q.selos.length && q.logo.length);
  console.log(JSON.stringify({ quadros: r.length, de: r[0].t.toFixed(3), ate: r[r.length - 1].t.toFixed(3), quadrosComSeloELogo: comSelos.length, margemExigida: MARGEM, menorFolga: +pior.folga.toFixed(1), noInstante: +pior.t.toFixed(3), quadro: pior.f, erros: erros.length }, null, 1));
  erros.slice(0, 20).forEach((e) => console.log('  ', e));
  await nav.close(); srv.close(); process.exit(erros.length ? 1 : 0);
});
