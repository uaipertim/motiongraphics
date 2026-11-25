// node scripts/conferir-avisos.cjs -> output/revisao/avisos.json
// Em cada toque, contorno, janela e marca do vídeo (no instante e +0,15/+0,3 s):
//  - o alvo está inteiro na parte visível da tela do celular: abaixo do cabeçalho e acima da barra de baixo do app, que ficam por
//    cima da página. Exceções: o "+" (é da própria barra) e o que está no calendário que sobe de baixo (cal-*), que cobre a barra;
//  - marcas: dentro do recorte da janela delas.
// Aviso do app ("com sucesso"): o OCR das capturas e do vídeo procura (scripts/ocr.py).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const nav = await chromium.launch(); const pg = await nav.newPage();
  await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready);
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f)));
  const r = await pg.evaluate(([L, AL, EV, TX]) => {
    const P = window.montaPlano(L, AL, EV, TX), out = [], CAB = 192, BAR = 2337, MAIS = AL.inicio.mais;
    P.telas.forEach((s, si) => {
      const itens = [
        ...(s.toques || []).map((q) => ({ tipo: 'toque', t: q.t, ret: [q.x - 1, q.y - 1, q.x + 1, q.y + 1], pagina: q.pagina })),
        ...(s.aneis || []).map((a) => ({ tipo: 'contorno', t: a.t, ret: a.ret, pagina: a.pagina })),
        ...(s.saltos || []).map((j) => ({ tipo: 'janela', t: j.t, ret: j.ret, pagina: j.pagina, img: j.img })),
        ...(s.saltos || []).flatMap((j) => (j.marcas || []).map((m) => ({ tipo: 'marca', t: m.t, ret: m.ret, dentroDe: j.ret, img: j.img }))),
      ];
      for (const it of itens) for (const dt of it.tipo === 'marca' ? [0] : [0, 0.15, 0.3]) {
        const a = CURTO.alvo(si, it.ret, it.t + dt, it.pagina), [x0, y0, x1, y1] = a.ret, telas = it.img ? [it.img] : a.camadas;
        const noMais = x0 >= MAIS[0] - 2 && x1 <= MAIS[2] + 2 && y0 >= MAIS[1] - 2 && y1 <= MAIS[3] + 2, naFolha = telas.some((n) => /^cal-(nov|dez|12)/.test(n));
        const visivel = it.tipo === 'marca' ? (it.ret[1] >= it.dentroDe[1] - 1 && it.ret[3] <= it.dentroDe[3] + 1 && it.ret[0] >= it.dentroDe[0] - 1 && it.ret[2] <= it.dentroDe[2] + 1)
          : (y0 >= CAB - 2 && (y1 <= BAR + 2 || noMais || naFolha) && x0 >= 0 && x1 <= 1170);
        out.push({ tipo: it.tipo, t: +(it.t + dt).toFixed(2), tela: telas.join('+'), rolagem: Math.round(a.rolagem), ret_na_tela: a.ret.map(Math.round), visivel, ok: visivel });
      }
    });
    return out;
  }, [J('linha.json'), J('telas/alvos.json'), J('telas/eventos.json'), J('telas/textos.json')]);
  const ruins = r.filter((x) => !x.ok);
  fs.mkdirSync(path.join(ROOT, 'output', 'revisao'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'output', 'revisao', 'avisos.json'), JSON.stringify({ verificados: r.length, problemas: ruins, todos: r }, null, 1));
  console.log(`${r.length} instantes (toques, contornos, janelas e marcas); problemas: ${ruins.length}`); ruins.forEach((x) => console.log('  ', JSON.stringify(x)));
  await nav.close(); srv.close(); process.exit(ruins.length ? 1 : 0);
});
