// node scripts/conferir-canal.cjs -> output/revisao/canal.json
// Bloqueio de canal e conflito (REGRAS, "Avisos da Demo", e decisão aprovada na etapa 1):
//  1) quadro a quadro (60 fps): toda imagem que aparece na tela do celular (ou dentro de uma janela) é uma captura que passou na
//     conferência do texto visível (capturar.cjs: nada de "Airbnb", "Booking", "Bloquead…" ou "Conflito" à vista);
//  2) a quinzena de hoje (24/11–07/12) não existe entre as capturas: o Calendário só aparece na quinzena da reserva (08/12–21/12),
//     onde a Demo só tem a reserva criada (nenhum bloqueio);
//  3) as datas usadas: o Calendário de 08/12–21/12 não tinha nenhum bloqueio nem reserva antes da reserva nova (12 a 14/12).
// O OCR do vídeo (scripts/ocr.py video) procura as mesmas palavras em um quadro a cada 0,25 s.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const CONF = JSON.parse(fs.readFileSync(path.join(ROOT, 'telas', 'conferencia.json')));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const nav = await chromium.launch(); const pg = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`); await pg.evaluate(() => window.ready);
  const usadas = await pg.evaluate(() => {
    const vistas = {}, dur = CURTO.DURATION;
    for (let f = 0; f / 60 < dur; f++) { const n = CURTO.naTela(f / 60); if (!n) continue; n.camadas.forEach((L) => { vistas[L.img] = (vistas[L.img] || 0) + 1; if (L.fixos) vistas[L.fixos] = (vistas[L.fixos] || 0) + 1; }); }
    return vistas;
  });
  const erros = [];
  for (const n of Object.keys(usadas)) { const c = CONF.telas[n]; if (!c) erros.push(`${n}: não é uma captura conferida`); else if (c.canal_a_vista !== 0) erros.push(`${n}: canal à vista`); }
  const telasCal = Object.keys(CONF.telas).filter((n) => /^cal-/.test(n));
  const quinzenaHoje = Object.keys(CONF.telas).filter((n) => /hoje/.test(n));
  if (quinzenaHoje.length) erros.push('há captura da quinzena de hoje: ' + quinzenaHoje.join(', '));
  if ((CONF.canal.itens_na_quinzena_antes || []).length) erros.push('08/12–21/12 tinha itens antes da reserva: ' + CONF.canal.itens_na_quinzena_antes.join(', '));
  if (JSON.stringify(CONF.canal.itens_na_quinzena_depois) !== JSON.stringify(['Larissa Campos, confirmada'])) erros.push('08/12–21/12 depois: ' + JSON.stringify(CONF.canal.itens_na_quinzena_depois));
  const r = { capturas_que_aparecem: usadas, todas_conferidas_sem_canal_a_vista: erros.length === 0, telas_de_calendario: telasCal, quinzena_de_hoje_capturada: quinzenaHoje,
    calendario_08_21_antes: CONF.canal.itens_na_quinzena_antes, calendario_08_21_depois: CONF.canal.itens_na_quinzena_depois, erros };
  fs.mkdirSync(path.join(ROOT, 'output', 'revisao'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'output', 'revisao', 'canal.json'), JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r, null, 1));
  await nav.close(); srv.close(); process.exit(erros.length ? 1 : 0);
});
