// node capa/render.cjs -> capa/capa.png, capa/capa.jpg, capa/capa-no-feed.jpg (recorte 4:5), capa/revisao/capa.txt
const http = require('http'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = __dirname;
const MIME = { '.html': 'text/html', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const nav = await chromium.launch(); const pg = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/capa/capa.html`); await pg.evaluate(() => window.ready);
  const cx = await pg.evaluate(() => window.CAIXAS);
  const url = await pg.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  fs.writeFileSync(path.join(OUT, 'capa.png'), Buffer.from(url.split(',')[1], 'base64'));
  await nav.close(); srv.close();
  execSync(`ffmpeg -v error -y -i capa.png -q:v 2 capa.jpg && ffmpeg -v error -y -i capa.png -vf crop=1080:1350:0:285 -q:v 2 capa-no-feed.jpg`, { cwd: OUT });
  // regra: recorte 4:5 com folga de 60 px; canto do play e faixa do contador livres; nada se sobrepõe (a janela pode ficar sobre o celular)
  const Z = { x0: 60, x1: 1020, y0: 345, y1: 1575 }, PLAY = [860, 240, 1080, 440], CONT = [0, 1560, 1080, 1680];
  const cruza = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const lin = ['Capa — FAZLO Hospeda na prática (recorte 4:5 do feed: 1080×1350, y 285–1635; folga de 60 px: x 60–1020, y 345–1575)', ''];
  let ok = true;
  for (const [k, b] of Object.entries(cx)) {
    const dentro = b[0] >= Z.x0 && b[2] <= Z.x1 && b[1] >= Z.y0 && b[3] <= Z.y1, play = cruza(b, PLAY), cont = cruza(b, CONT);
    const bom = dentro && !play && !cont; ok = ok && bom;
    lin.push(`${bom ? 'OK  ' : 'ERRO'}   ${k.padEnd(9)} x ${Math.round(b[0])}–${Math.round(b[2])}, y ${Math.round(b[1])}–${Math.round(b[3])}${dentro ? '' : ' · fora da área'}${play ? ' · no canto do play' : ''}${cont ? ' · na faixa do contador' : ''}`);
  }
  const ks = Object.keys(cx);
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const par = [ks[i], ks[j]].sort().join('+'); if (par === 'celular+janela') continue;
    if (cruza(cx[ks[i]], cx[ks[j]])) { ok = false; lin.push(`ERRO   ${ks[i]} encosta em ${ks[j]}`); }
  }
  lin.push('', ok ? 'RESULTADO: dentro da regra da capa' : 'RESULTADO: FORA da regra');
  fs.mkdirSync(path.join(OUT, 'revisao'), { recursive: true }); fs.writeFileSync(path.join(OUT, 'revisao', 'capa.txt'), lin.join('\n') + '\n');
  console.log(lin.join('\n')); process.exit(ok ? 0 : 1);
});
