// node scripts/conferir-avisos.cjs -> output/revisao/avisos.json
// Em cada toque e em cada contorno do vídeo: qual imagem está na tela naquele instante e se algum aviso do app
// (medido na captura: alvos.<tela>.aviso) fica por cima do ponto tocado ou do retângulo destacado.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const nav = await chromium.launch(); const pg = await nav.newPage();
  await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready);
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'linha.json'))), AL = JSON.parse(fs.readFileSync(path.join(ROOT, 'telas/alvos.json'))), TX = JSON.parse(fs.readFileSync(path.join(ROOT, 'telas/textos.json')));
  const r = await pg.evaluate(([L, AL, TX]) => {
    const P = window.montaPlano(L, AL, TX), out = [], cruza = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    const naTela = (s, t) => { let img = s.img; for (const e of (s.estados || []).slice().sort((a, b) => a.t - b.t)) if (t >= e.t) img = e.img; return img; };
    for (const s of P.telas) {
      const itens = [...(s.toques || []).map((q) => ({ tipo: 'toque', t: q.t, ret: [q.x - 1, q.y - 1, q.x + 1, q.y + 1] })), ...(s.aneis || []).map((a) => ({ tipo: 'contorno', t: a.t, ret: a.ret }))];
      for (const it of itens) for (const dt of [0, 0.15, 0.3]) {
        const img = naTela(s, it.t + dt), av = AL[img] && AL[img].aviso;
        out.push({ cena: s.img, tipo: it.tipo, t: +(it.t + dt).toFixed(2), tela: img, aviso: !!av, cobre: !!(av && cruza(av, it.ret)) });
      }
    }
    return out;
  }, [L, AL, TX]);
  const ruins = r.filter((x) => x.cobre);
  fs.mkdirSync(path.join(ROOT, 'output', 'revisao'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'output', 'revisao', 'avisos.json'), JSON.stringify({ verificados: r.length, cobertos: ruins }, null, 1));
  console.log(`${r.length} instantes (toques e contornos, no instante e +0,15/+0,3 s); aviso por cima: ${ruins.length}`); ruins.forEach((x) => console.log('  ', JSON.stringify(x)));
  await nav.close(); srv.close(); process.exit(ruins.length ? 1 : 0);
});
