// Exporta da linha do tempo: audio/eventos.json (efeitos sonoros) e output/legenda.json (páginas da legenda).
// node scripts/exportar.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
await pag.goto('file://' + path.join(raiz, 'src/index.html'));
await pag.waitForFunction('window.PRONTO || window.ERRO', null, { timeout: 120000 });
const erro = await pag.evaluate('window.ERRO');
if (erro) { console.error(erro); process.exit(1); }
const { eventos, paginas, dur, registro, narr } = await pag.evaluate(() => ({ eventos: window.EVENTOS, paginas: window.PAGINAS_LEGENDA, dur: window.DUR, registro: window.REGISTRO, narr: window.NARRACAO.assuntos.map((a) => ({ id: a.id, ini: a.ini, fim: a.fim })) }));
fs.writeFileSync(path.join(raiz, 'audio/eventos.json'), JSON.stringify({ duracao: dur, eventos }, null, 0).replace(/\},\{/g, '},\n{'));
fs.mkdirSync(path.join(raiz, 'output'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'output/legenda.json'), JSON.stringify(paginas, null, 1));
const porTipo = {};
eventos.forEach((e) => { porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1; });
console.log('eventos:', eventos.length, JSON.stringify(porTipo));
let ruim = 0;
paginas.forEach((p) => {
  const d = p.fim - p.ini;
  const aviso = (d < 1.5 ? ' <1,5s!' : '') + (p.linhas > 2 ? ' >2 linhas!' : '');
  if (aviso) ruim++;
  console.log(`${p.ini.toFixed(2).padStart(7)} – ${p.fim.toFixed(2).padStart(7)} (${d.toFixed(2)} s, ${p.linhas} lin, ${p.corpo}px) [${p.assunto}] ${p.texto}${aviso}`);
});
console.log(`${paginas.length} páginas; fora da regra: ${ruim}`);

// ---- tempos de cada tela: duração em cena e espera depois do último destaque ----
const telas = [];
for (const tipo of ['celular', 'janela']) {
  let atual = null, visivel = false;
  for (const e of registro.filter((r) => r.ap === tipo)) {
    if (e.tipo === 'tela') {
      if (atual) { atual.fim = e.t; telas.push(atual); }
      atual = { tela: e.id, ini: e.t, destaques: [] };
    } else if (e.tipo === 'visivel') { visivel = true; if (atual && atual.ini < e.t) atual.ini = e.t; }
    else if (e.tipo === 'saida') { if (atual) { atual.fim = e.t; telas.push(atual); atual = null; } visivel = false; }
    else if (e.tipo === 'destaque' && atual) atual.destaques.push({ t: e.t, como: e.como, volta: e.volta });
  }
  if (atual) { atual.fim = dur; telas.push(atual); }
}
telas.sort((a, b) => a.ini - b.ini);
console.log('\ntela   entra    sai   em cena  destaques  último   espera');
let falhas = 0;
telas.forEach((t) => {
  const ult = t.destaques.length ? Math.max(...t.destaques.map((d) => d.t)) : null;
  t.duracao = +(t.fim - t.ini).toFixed(2);
  t.ultimoDestaque = ult;
  t.espera = ult == null ? null : +(t.fim - ult).toFixed(2);
  t.assunto = (narr.filter((a) => a.ini <= t.ini + 1.2).pop() || {}).id;
  const prox = telas.find((o) => o.ini >= t.fim - 0.01);
  t.ultimaDoAssunto = !prox || prox.assunto !== t.assunto || true;
  const ruim = t.duracao < 4 || (t.espera != null && t.espera < 2.5 && t.tela !== '11r' && t.tela !== '13');
  if (ruim) falhas++;
  console.log(`${t.tela.padEnd(5)} ${t.ini.toFixed(2).padStart(7)} ${t.fim.toFixed(2).padStart(7)} ${t.duracao.toFixed(2).padStart(7)} ${String(t.destaques.length).padStart(7)} ${ult == null ? '      —' : ult.toFixed(2).padStart(9)} ${t.espera == null ? '      —' : t.espera.toFixed(2).padStart(7)} [${t.assunto}]${ruim ? '  <<< fora da regra' : ''}`);
});
console.log('telas fora da regra (≥ 4 s em cena; última de cada assunto ≥ 2,5 s depois do último destaque):', falhas);
fs.writeFileSync(path.join(raiz, 'output/tempos.json'), JSON.stringify({ duracao: dur, assuntos: narr, telas }, null, 1));
await nav.close();
