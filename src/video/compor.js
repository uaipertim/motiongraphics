// compor.js — linha do tempo, transições, tremor, motion blur e entrada para o Playwright
'use strict';

const tela = document.getElementById('tela');
const ctxTela = tela.getContext('2d');
const acc = document.createElement('canvas'); acc.width = W; acc.height = H;
const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
const actx = acc.getContext('2d'), tctx = tmp.getContext('2d');

// impactos (tremor de câmera)
const IMPACTOS = [[bar(2), 9], [bar(6), 8], [bar(8), 11], [bar(10), 7], [bar(13), 24], [bar(24), 9]];
function tremor(t) {
  let x = 0, y = 0;
  IMPACTOS.forEach(([ti, a], i) => {
    const d = t - ti;
    if (d < 0 || d > 0.8) return;
    const k = a * Math.exp(-d / 0.13);
    x += k * ruido(d * 47, i + 1); y += k * ruido(d * 41 + 9, i + 5);
  });
  return [x, y];
}

// janelas de motion blur: [ini, fim, amostras, obturador em quadros]
function janelasBorrao() {
  const j = [
    [bar(2) - 0.03, bar(2) + 0.6, 5, 0.6],
    [bar(4) - 0.42, bar(4) + 0.3, 7, 1.0],
    [bar(6) - 0.28, bar(6) + 0.55, 5, 0.6],
    [bar(8) - 0.45, bar(8) + 0.6, 5, 0.6],
    [bar(10) - 0.22, bar(10) + 0.22, 7, 1.0],
    [bar(11) + 0.3, bar(12) + 0.02, 6, 0.8],
    [bar(13) - 0.02, bar(13) + 0.55, 5, 0.6],
    [bar(15) - 0.55, bar(15) + 0.1, 5, 0.7],
    [tEst(5) - 0.1, tEst(5) + 1.3, 5, 0.6],
    [bar(22) - 0.1, bar(22) + 0.6, 5, 0.6],
    [bar(24) - 0.5, bar(24) + 0.4, 5, 0.6],
  ];
  for (let k = 0; k < 5; k++) j.push([tEst(k) + 0.76 * BAR, tEst(k + 1) + 0.05, 6, 0.9]);
  return j;
}
let BORRAO = null;
function borrao(t) {
  let best = null;
  for (const b of BORRAO) if (t >= b[0] && t < b[1]) if (!best || b[2] > best[2]) best = b;
  return best;
}

function compoe(ctx, t) {
  ctx.save();
  const [sx, sy] = tremor(t);
  ctx.translate(sx, sy);
  const wa = bar(10) - 0.2, wb = bar(10) + 0.2;
  if (t < bar(2)) cenaGancho(ctx, t);
  else if (t < bar(4)) cenaSexta(ctx, t);
  else if (t < bar(6)) cenaVaga(ctx, t);
  else if (t < bar(8)) cenaQuarto(ctx, t);
  else if (t < wa) cenaConta(ctx, t);
  else if (t < wb) {
    // chicote (whip pan) com faixa limão entre as cenas
    const p = E.ioQt(prog(t, wa, wb));
    const off = p * W * 1.3;
    ctx.save(); ctx.translate(-off, 0); ctx.beginPath(); ctx.rect(-40, -40, W + 80, H + 80); ctx.clip(); cenaConta(ctx, t); ctx.restore();
    ctx.fillStyle = COR.limao; ctx.fillRect(W - off, -40, W * 0.3, H + 80);
    ctx.save(); ctx.translate(W * 1.3 - off, 0); ctx.beginPath(); ctx.rect(-40, -40, W + 80, H + 80); ctx.clip(); cenaCaixa(ctx, t); ctx.restore();
  }
  else if (t < bar(12)) cenaCaixa(ctx, t);
  else if (t < bar(13)) cenaRespira(ctx, t);
  else if (t < tEst(0) - 0.1) cenaDrop(ctx, t);
  else if (t < tEst(0) + 0.32) {
    cenaDrop(ctx, t);
    ctx.save(); circulo(ctx, 540, 1180, raioWipe(t, tEst(0))); ctx.clip(); cenaJornada(ctx, t); ctx.restore();
  }
  else if (t < tEst(5) - 0.1) cenaJornada(ctx, t);
  else if (t < tEst(5) + 0.32) {
    cenaJornada(ctx, t);
    const c = camJornada(t); const hs = telaDe(c, c.dot);
    ctx.save(); circulo(ctx, hs[0], hs[1], raioWipe(t, tEst(5))); ctx.clip(); cenaCiclo(ctx, t); ctx.restore();
  }
  else if (t < bar(22) - 0.1) cenaCiclo(ctx, t);
  else if (t < bar(24)) {
    cenaVolta(ctx, t);
    if (t < bar(22) + 0.15) cenaCiclo(ctx, t, false, false);
  }
  else cenaLogo(ctx, t);
  // flash do drop
  const df = t - bar(13);
  if (df >= 0 && df < 0.3) { ctx.fillStyle = COR.branco; ctx.globalAlpha = 0.28 * Math.exp(-df / 0.05); ctx.fillRect(-50, -50, W + 100, H + 100); ctx.globalAlpha = 1; }
  ctx.restore();
}

function desenhaQuadro(t, semBorrao = false) {
  const b = semBorrao ? null : borrao(t);
  if (!b) { compoe(ctxTela, t); return; }
  const [, , n, sh] = b;
  for (let i = 0; i < n; i++) {
    const ti = t - (sh / 60) * (i / (n - 1));
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    compoe(tctx, ti);
    actx.globalAlpha = 1 / (i + 1);
    actx.drawImage(tmp, 0, 0);
  }
  actx.globalAlpha = 1;
  ctxTela.drawImage(acc, 0, 0);
}

window.renderFrame = (t) => { REG = null; desenhaQuadro(t); return true; };
// capa da grade: quadro 0 com o bloco (título → pílula) centralizado em y 960
window.renderCapa = () => {
  const reg = window.qaFrame(0);
  const topo = Math.min(...reg.filter((r) => r.id === 'gancho.titulo').map((r) => r.y0));
  const base = 1452 + 64;
  const dy = 960 - (topo + base) / 2;
  ctxTela.save(); ctxTela.translate(0, dy); compoe(ctxTela, 0); ctxTela.restore();
  return { topo: topo + dy, base: base + dy, dy };
};
window.qaFrame = (t) => { REG = []; desenhaQuadro(t, true); const r = REG; REG = null; return r; };

window.pronto = (async () => {
  TEMPO = await (await fetch('../tempo.json')).json();
  BPM = TEMPO.bpm; BEAT = 60 / BPM; BAR = 4 * BEAT;
  const cargas = [];
  for (const w of [500, 600, 700, 750, 800]) cargas.push(document.fonts.load(`${w} 100px Geist`));
  for (const w of [500, 600, 700]) cargas.push(document.fonts.load(`${w} 100px GeistMono`));
  await Promise.all(cargas);
  await document.fonts.ready;
  iniciaGeometriaA(ctxTela);
  iniciaGeometriaB(ctxTela);
  BORRAO = janelasBorrao();
  return true;
})();
