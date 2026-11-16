// Varredura: todo texto tem de caber dentro da sua caixa (cartão, pílula, selo…) com margem mínima.
// Amostra a linha do tempo a 10 fps (renderAt + medição no DOM, sem screenshot).
//   node scripts/caixas.mjs [--fps 10] [--margem 16] [--saida output/caixas.json]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const fps = Number(arg('fps', 10)), margem = Number(arg('margem', 16)), saida = arg('saida', 'output/caixas.json');

const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
await pag.goto('file://' + path.join(raiz, 'src/index.html'));
await pag.waitForFunction('window.PRONTO || window.ERRO', null, { timeout: 120000 });
const dur = await pag.evaluate('window.DUR');

// funções de medição dentro da página
await pag.evaluate(() => {
  const opac = (e) => { let o = 1; for (let p = e; p && p.id !== 'palco'; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= parseFloat(cs.opacity); } return o; };
  const ehCaixa = (e, qualquerTamanho) => {
    if (e.closest('#legenda') || e.id === 'palco' || e.id === 'fundo' || e.classList.contains('cena')) return false;
    const cs = getComputedStyle(e);
    const fundo = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent' && !cs.backgroundImage.includes('gradient');
    const borda = cs.boxShadow !== 'none' && /inset/.test(cs.boxShadow);
    const tracejada = cs.borderStyle !== 'none' && parseFloat(cs.borderWidth) > 0;
    if (!(fundo || borda || tracejada || e.classList.contains('cartao') || e.classList.contains('chip'))) return false;
    const r = e.getBoundingClientRect();
    return (qualquerTamanho || (r.width >= 40 && r.height >= 30)) && r.width < 1060;
  };
  window.__medir = (t, margem) => {
    const caixas = [...document.querySelectorAll('#cenas *')].filter((e) => !(e instanceof SVGElement) && ehCaixa(e) && opac(e) > 0.05);
    const out = [];
    const tw = document.createTreeWalker(document.getElementById('cenas'), NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const s = n.textContent.trim();
      if (!s) continue;
      const pai = n.parentElement;
      if (pai.closest('svg')) continue;
      const o = opac(pai);
      if (o < 0.5) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const rr = rg.getBoundingClientRect();
      if (rr.width < 1) continue;
      // altura do desenho das letras (a caixa de linha inclui o entrelinhamento)
      const fs = parseFloat(getComputedStyle(pai).fontSize);
      const escT = rr.height / (fs * parseFloat(getComputedStyle(pai).lineHeight === 'normal' ? 1.2 : parseFloat(getComputedStyle(pai).lineHeight) / fs || 1.15));
      const cy = (rr.top + rr.bottom) / 2, meia = 0.38 * fs * (isFinite(escT) && escT > 0 ? escT : 1);
      const txt = { l: rr.left, r: rr.right, t: cy - meia, b: cy + meia };
      const cx = (txt.l + txt.r) / 2;
      // caixa = a menor caixa que contém o centro do texto e que é ancestral dele ou está pintada por baixo dele
      // 1º) a caixa ancestral mais próxima (qualquer tamanho); 2º) senão, a menor caixa pintada por baixo
      let melhor = null, area = 1e12;
      for (let p = pai; p && !p.classList.contains('cena'); p = p.parentElement) if (ehCaixa(p, true) && opac(p) > 0.05) { melhor = p; break; }
      if (!melhor) for (const c of caixas) {
        if (!(c.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) || c.contains(n)) continue;
        const b = c.getBoundingClientRect();
        if (cx < b.left || cx > b.right || cy < b.top || cy > b.bottom) continue;
        const a = b.width * b.height;
        if (a < area) { area = a; melhor = c; }
      }
      // texto solto: tem de caber no quadro
      const b = melhor ? melhor.getBoundingClientRect() : { left: 0, right: 1080, top: 0, bottom: 1920 };
      const mg = { esq: txt.l - b.left, dir: b.right - txt.r, cima: txt.t - b.top, baixo: b.bottom - txt.b };
      // a margem é de projeto: quando a caixa está escalada (entrando/saindo), a margem escala junto
      const esc = melhor && melhor.offsetWidth ? b.width / melhor.offsetWidth : 1;
      const lim = melhor ? margem * Math.min(1, esc) - 0.5 : 0;
      const pior = Math.min(mg.esq, mg.dir, mg.cima, mg.baixo);
      if (pior < lim) {
        const cena = pai.closest('.cena');
        out.push({ t, cena: cena && cena.id, texto: s.slice(0, 40), caixa: melhor ? (melhor.className || melhor.tagName) + ` ${Math.round(b.width)}×${Math.round(b.height)}` : 'quadro',
          margens: Object.fromEntries(Object.entries(mg).map(([kk, v]) => [kk, Math.round(v)])) });
      }
    }
    return out;
  };
});

const falhas = [];
const total = Math.floor(dur * fps);
for (let q = 0; q <= total; q++) {
  const t = q / fps;
  await pag.evaluate((x) => window.renderAt(x), t);
  falhas.push(...(await pag.evaluate(([x, m]) => window.__medir(x, m), [Math.round(t * 1000) / 1000, margem])));
}
await nav.close();
// agrupa por texto+caixa em intervalos
const grupos = {};
for (const f of falhas) {
  const k = `${f.cena} | ${f.texto.replace(/[\d.,]+/g, '#')} | ${f.caixa}`;
  const g = grupos[k] || (grupos[k] = { cena: f.cena, texto: f.texto, caixa: f.caixa, de: f.t, ate: f.t, quadros: 0, pior: f.margens, piorV: 1e9 });
  g.ate = f.t; g.quadros++;
  const v = Math.min(...Object.values(f.margens));
  if (v < g.piorV) { g.piorV = v; g.pior = f.margens; g.texto = f.texto; }
}
const lista = Object.values(grupos);
fs.writeFileSync(path.join(raiz, saida), JSON.stringify({ fps, margem, amostras: total + 1, problemas: lista }, null, 1));
console.log(`${total + 1} quadros amostrados a ${fps} fps, margem mínima ${margem} px`);
for (const g of lista) console.log(`  ${g.de.toFixed(1)}–${g.ate.toFixed(1)} s [${g.cena}] "${g.texto}" em ${g.caixa}: margens ${JSON.stringify(g.pior)} (${g.quadros} quadros)`);
console.log(lista.length ? `PROBLEMAS: ${lista.length}` : 'nenhum texto fora da caixa');
process.exit(lista.length ? 1 : 0);
