/* =====================================================================
   FAZLO Hospeda — REEL 03 · TESTE (Trial Reel) — 9:16, 12 s
   Reaproveita o motor do "Controle de caixa" (anim.js, cópia idêntica do
   reels/reel-03, que não é alterado) por REMAPEAMENTO DE TEMPO: cada trecho
   do vídeo novo aponta para um trecho do original (src/mapa.json). Nada é
   redesenhado; só três trocas de texto, aplicadas na leitura do anim.js:

     1. o gancho: "FIM DO EXPEDIENTE / O caixa bateu?" vira
        "Fechou o mês" (branco) / "e o caixa não bateu?" (limão), em
        Inter Display 900 no maior corpo que cabe (folga de 65 px nas laterais),
        já inteiro no quadro 0 (no original, o título subia em 0,05–0,3 s);
     2. a assinatura perde o "CONTROLE DE CAIXA" (nome de funcionalidade);
     3. e o "Acesse fazlohospeda.com.br" (teste de gancho, sem CTA).

   No fim, um fade para o preto nos últimos 0,3 s.

   TESTE.carregar()        lê mapa.json e anim.js (com as trocas) -> window.REEL03
   TESTE.renderAt(ctx, t)  desenha o quadro t (0–12 s) do vídeo novo
   TESTE.original(t)       o instante do original que aparece em t
   ===================================================================== */
(function () {
  'use strict';

  const TROCAS = [
    {
      nome: 'gancho: o título novo',
      de: `    lines(ctx, t, [
      { segs: [{ s: 'O caixa' }], t: 0.05 },
      { segs: [{ s: 'bateu?', color: C.lime }], t: 0.3 },
    ], { y: 470, size: 178, lh: 172, tout: 3.3 });
    typeText(ctx, 'FIM DO EXPEDIENTE', 540, 300, p(t, 0.5, 0.95) * (1 - out), { size: 30, weight: 800, color: C.grayL, ls: 8, align: 'center' });
`,
      // o maior corpo em que "e o caixa não bateu?" cabe em 950 px (x 65–1015), até os 178 px do original;
      // o bloco de 2 linhas fica centrado onde estava o do original (y ≈ 492); entra inteiro já em t = 0
      para: `    { const s = Math.min(178, Math.floor(178 * 950 / tw(ctx, 'e o caixa não bateu?', DISPLAY, 178, 900, -178 * 0.03)));
      lines(ctx, t, [
        { segs: [{ s: 'Fechou o mês' }], t: -1 },
        { segs: [{ s: 'e o caixa não bateu?', color: C.lime }], t: -1 },
      ], { y: Math.round(492 - 0.19 * s), size: s, lh: Math.round(s * 1.06), tout: 3.3 }); }
`,
    },
    {
      nome: 'assinatura: sem "CONTROLE DE CAIXA"',
      de: `    typeText(ctx, 'CONTROLE DE CAIXA', 540, 1416, p(t, T.finale + 0.9, T.finale + 1.25), { size: 28, weight: 800, color: C.lime, ls: 8, align: 'center' });
`,
      para: '',
    },
    {
      nome: 'assinatura: sem "Acesse fazlohospeda.com.br"',
      de: 'const da = E.outBack(p(t, T.finale + 1.5, T.finale + 1.85), 1.8);',
      para: 'const da = 0;',
    },
  ];

  let MAPA = null;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

  async function carregar() {
    MAPA = await (await fetch('mapa.json')).json();
    let src = await (await fetch('anim.js')).text();
    for (const tr of TROCAS) {
      if (src.split(tr.de).length !== 2) throw new Error('anim.js: trecho não encontrado (' + tr.nome + ')');
      src = src.replace(tr.de, tr.para);
    }
    (0, eval)(src);                                   // define window.REEL03 (o motor, com as três trocas)
  }

  function original(t) {
    const tr = MAPA.trechos;
    for (const s of tr) if (t >= s.novo[0] && t < s.novo[1]) return s.original + (t - s.novo[0]);
    const last = tr[tr.length - 1];
    return last.original + (Math.min(t, MAPA.duracao) - last.novo[0]);
  }

  function renderAt(ctx, t, o = {}) {
    t = clamp(t, 0, MAPA.duracao - 1e-4);
    REEL03.renderAt(ctx, original(t), o);
    const f = clamp((t - MAPA.fade[0]) / (MAPA.fade[1] - MAPA.fade[0]));
    if (f > 0) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }

  window.TESTE = {
    carregar, renderAt, original,
    get DURATION() { return MAPA.duracao; },
    get MAPA() { return MAPA; },
    trocas: () => TROCAS.map((t) => t.nome),
  };
})();
