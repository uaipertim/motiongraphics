// node scripts/conferir.cjs -> output/revisao/conferencia.json
// Quadro a quadro (60 fps), sobre o próprio plano do vídeo:
//  - marca: com a logo na tela, nenhum selinho encosta no símbolo nem no nome "FAZLO Hospeda" (margem ≥ 40 px);
//  - selinhos: nunca por cima do celular (em nenhum quadro em que o celular está na tela);
//  - legenda: não cobre nenhuma janela em destaque nem nenhum toque (a onda inteira, raio até 104 px, na parte que aparece:
//    a tela e os toques são desenhados só dentro do palco, y 450–1360).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..'), MARGEM = 40, ONDA = 104, PALCO1 = 1360;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const nav = await chromium.launch(); const pg = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready);
  const r = await pg.evaluate(([MARGEM, ONDA, PALCO1]) => {
    const dur = CURTO.DURATION, erros = [];
    let menorMarca = 1e9, quadrosLogoSelinho = 0, quadros = 0, comLegenda = 0, perto = 1e9, palco = 1e9, pertoToque = 1e9;
    const cruza = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    for (let f = 0; f / 60 < dur; f++) {
      const t = f / 60; quadros++;
      const m = CURTO.marca(t);
      if (m.logo && m.selinhos) { quadrosLogoSelinho++; menorMarca = Math.min(menorMarca, m.folga); if (m.folga < MARGEM) erros.push(`marca t=${t.toFixed(3)} folga ${m.folga.toFixed(1)}`); }
      if (m.selinhoCelular.length) erros.push(`selinho x celular t=${t.toFixed(3)}`);
      const L = CURTO.legendaCaixa(t); if (!L) continue; comLegenda++;
      const cx = CURTO.caixas(t);
      for (const j of cx.janelas) { if (cruza(L, j)) erros.push(`legenda x janela t=${t.toFixed(3)}`); perto = Math.min(perto, L[1] - j[3]); }
      palco = Math.min(palco, L[1] - PALCO1);
      for (const [x, y, sc] of cx.toques) {
        const R = ONDA * sc, visivel = y - R < PALCO1, fundo = Math.min(y + R, PALCO1);
        if (visivel && fundo > L[1] && x + R > L[0] && x - R < L[2]) erros.push(`legenda x toque t=${t.toFixed(3)} (${Math.round(x)},${Math.round(y)})`);
        if (visivel) pertoToque = Math.min(pertoToque, L[1] - fundo);
      }
    }
    return { quadros, comLegenda, quadrosComLogoESelinho: quadrosLogoSelinho, menorFolgaMarca: menorMarca === 1e9 ? null : Math.round(menorMarca),
      menorDistanciaLegendaJanela: Math.round(perto), menorDistanciaLegendaPalco: Math.round(palco), menorDistanciaLegendaToque: Math.round(pertoToque), erros };
  }, [MARGEM, ONDA, PALCO1]);
  fs.mkdirSync(path.join(ROOT, 'output', 'revisao'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'output', 'revisao', 'conferencia.json'), JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ ...r, erros: r.erros.length }, null, 1)); r.erros.slice(0, 15).forEach((e) => console.log('  ', e));
  await nav.close(); srv.close(); process.exit(r.erros.length ? 1 : 0);
});
