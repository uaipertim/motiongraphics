// node scripts/conferir-avisos.cjs -> output/revisao/avisos.json
// Em cada toque, contorno, janela e marca do vídeo (no instante e +0,15/+0,3 s):
//  - nenhum aviso do app na captura que está na tela (capturar.cjs recusa "com sucesso" em todas: aviso_na_tela = 0);
//  - o alvo está inteiro na parte visível da tela do celular: abaixo do cabeçalho e acima da barra de baixo do app, que ficam
//    por cima da página (menos o que é do próprio cabeçalho ou da barra: fixo);
//  - (as medidas do cartão do conflito são da página pg-inicio: só valem para alvos medidos nela)
//  - cuidado aprovado: nada salta, nem é contornado sozinho, no cartão "Conflito com o Airbnb" (episódio 8). Só o contorno
//    do bloco "Precisa de atenção" inteiro passa por ele.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const nav = await chromium.launch(); const pg = await nav.newPage();
  await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready);
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'linha.json'))), AL = JSON.parse(fs.readFileSync(path.join(ROOT, 'telas/alvos.json')));
  const CONF = JSON.parse(fs.readFileSync(path.join(ROOT, 'telas/conferencia.json'))).telas;
  const r = await pg.evaluate(([L, AL, CONF]) => {
    const P = window.montaPlano(L, AL), out = [], cruza = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    const CAB = AL['vp-inicio'].cabecalho[3], BAR = AL['vp-inicio'].barra[1], CONF_AIRBNB = AL['pg-inicio'].conflito, BLOCO = [40, 1850, 1130, 3705];
    P.telas.forEach((s, si) => {
      const itens = [
        ...(s.toques || []).map((q) => ({ tipo: 'toque', t: q.t, ret: [q.x - 1, q.y - 1, q.x + 1, q.y + 1], fixo: q.fixo, img: null })),
        ...(s.aneis || []).map((a) => ({ tipo: 'contorno', t: a.t, ret: a.ret, fixo: a.fixo })),
        ...(s.saltos || []).map((j) => ({ tipo: 'janela', t: j.t, ret: j.ret, img: j.img })),
        ...(s.saltos || []).flatMap((j) => (j.marcas || []).map((m) => ({ tipo: 'marca', t: m.t, ret: m.ret, img: j.img, dentroDe: j.ret }))),
      ];
      for (const it of itens) {
        const pagina = it.img || 'pg-inicio';
        const noConflito = !it.fixo && pagina === 'pg-inicio' && cruza(it.ret, CONF_AIRBNB), permitido = it.tipo === 'contorno' && it.ret.join() === BLOCO.join();
        for (const dt of it.tipo === 'marca' ? [0] : [0, 0.15, 0.3]) {
          const a = CURTO.alvo(si, it.ret, it.t + dt, it.fixo), y0 = a.ret[1], y1 = a.ret[3];
          // a marca fica dentro da janela (já fora da tela do celular): basta estar dentro do recorte da janela
          const visivel = it.tipo === 'marca' ? (it.ret[1] >= it.dentroDe[1] && it.ret[3] <= it.dentroDe[3]) : it.fixo ? true : (it.tipo === 'janela' ? (y0 >= CAB - 2 && y1 <= BAR + 2) : (y0 >= CAB - 2 && y1 <= BAR + 2));
          const telas = it.img ? [it.img] : a.camadas, aviso = telas.some((n) => (CONF[n] || {}).aviso_na_tela !== 0);
          out.push({ tipo: it.tipo, t: +(it.t + dt).toFixed(2), tela: telas.join('+'), rolagem: Math.round(a.rolagem), ret_na_tela: a.ret.map(Math.round), visivel, aviso,
            conflito_airbnb: noConflito && !permitido, ok: visivel && !aviso && !(noConflito && !permitido) });
        }
      }
    });
    return out;
  }, [L, AL, CONF]);
  const ruins = r.filter((x) => !x.ok);
  fs.mkdirSync(path.join(ROOT, 'output', 'revisao'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'output', 'revisao', 'avisos.json'), JSON.stringify({ verificados: r.length, problemas: ruins, todos: r }, null, 1));
  console.log(`${r.length} instantes (toques, contornos, janelas e marcas); problemas: ${ruins.length}`); ruins.forEach((x) => console.log('  ', JSON.stringify(x)));
  await nav.close(); srv.close(); process.exit(ruins.length ? 1 : 0);
});
