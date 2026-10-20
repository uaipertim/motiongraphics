/* =====================================================================
   FAZLO Hospeda — REEL 00 · CORTE CURTO "Sob o mesmo teto." (15 s, 9:16)
   Reaproveita o motor do Reel 00 (anim.js, cópia idêntica do reels/reel-00,
   que não é alterado) por REMAPEAMENTO DE TEMPO: cada trecho do vídeo novo
   aponta para um trecho do original (src/mapa.json). Nada é redesenhado; só
   as trocas de texto abaixo, aplicadas na leitura do anim.js:

     1. o gancho: "Tem uma pousada?" vira "Reserva no caderno," (branco) /
        "caixa na planilha," (branco) / "comanda no papel?" (limão), em Inter
        Display 900 no maior corpo que cabe (900 px), já inteiro no quadro 0,
        com a sineta embaixo; sem o mergulho pelo "o" (era da palavra antiga);
     2. a assinatura: "Sob o mesmo teto." no lugar de "Tudo sob o mesmo teto.",
        sem a linha "SISTEMA DE GESTÃO PARA POUSADAS" e sem o CTA "Saiba mais
        no link da bio" (corte de teste: só a frase e a logo, sem domínio nem CTA);
     3. os cues de som dessas peças saem junto (scripts/trilha.py).

   No fim, um fade para o preto nos últimos 0,3 s.

   TESTE.carregar()        lê mapa.json e anim.js (com as trocas) -> window.REEL00
   TESTE.renderAt(ctx, t)  desenha o quadro t (0–15 s) do vídeo novo
   TESTE.original(t)       o instante do original que aparece em t
   ===================================================================== */
(function () {
  'use strict';

  const TROCAS = [
    {
      nome: 'gancho: o título novo (3 linhas, já inteiro no quadro 0)',
      de: `    riseLine(ctx, [{ s: 'Tem uma' }], 540, 590, p(t, 0.1, 0.55), 0, { size: 120, weight: 800, color: C.white, align: 'center' });
    const sl = p(t, BT - 0.02, BT + 0.22);
    if (sl > 0) {
      const sc = lerp(1.7, 1, E.outExpo(sl)) * (1 + 0.05 * kick(t, BT + 0.16, 0.3));
      ctx.save();
      ctx.globalAlpha = clamp(sl * 4);
      ctx.translate(540, HOOKT.y - HOOKT.size * 0.36); ctx.scale(sc, sc); ctx.translate(-540, -(HOOKT.y - HOOKT.size * 0.36));
      txt(ctx, 'pousada?', HOOKT.left, HOOKT.y, { fam: DISPLAY, size: HOOKT.size, weight: 900, color: C.lime, ls: -HOOKT.size * 0.025 });
      ctx.restore();
    }
    // sublinhado no 3º tempo
    const ul = E.inOutCubic(p(t, 2 * BT, 2 * BT + 0.28));
    if (ul > 0) {
      const x0 = HOOKT.left + 6, x1 = HOOKT.left + HOOKT.w - 20;
      ctx.beginPath(); ctx.moveTo(x0, HOOKT.y + 44); ctx.lineTo(lerp(x0, x1, ul), HOOKT.y + 44); stroke(ctx, C.white, 14);
    }
`,
      // o maior corpo em que a linha mais larga cabe em 900 px (x 90–990); as 3 linhas já estão inteiras no
      // quadro 0; a 3ª (limão) leva o golpe no 2º tempo e o sublinhado no 3º, como "pousada?" no original
      para: `    { const HL = [['Reserva no caderno,', C.white], ['caixa na planilha,', C.white], ['comanda no papel?', C.lime]];
      const hs = Math.floor(Math.min(...HL.map(([s]) => fit(ctx, s, 900, 160)))), hls = -hs * 0.025, hy = [560, 560 + Math.round(hs * 1.06), 560 + 2 * Math.round(hs * 1.06)];
      HL.forEach(([s, col], i) => {
        const w = tw(ctx, s, DISPLAY, hs, 900, hls);
        ctx.save();
        if (i === 2) { const k = 1 + 0.05 * kick(t, BT + 0.02, 0.3); ctx.translate(540, hy[i] - hs * 0.36); ctx.scale(k, k); ctx.translate(-540, -(hy[i] - hs * 0.36)); }
        txt(ctx, s, 540 - w / 2, hy[i], { fam: DISPLAY, size: hs, weight: 900, color: col, ls: hls });
        ctx.restore();
      });
      const w3 = tw(ctx, HL[2][0], DISPLAY, hs, 900, hls), ul = E.inOutCubic(p(t, 2 * BT, 2 * BT + 0.28));
      if (ul > 0) { const x0 = 540 - w3 / 2 + 6, x1 = 540 + w3 / 2 - 20; ctx.beginPath(); ctx.moveTo(x0, hy[2] + 44); ctx.lineTo(lerp(x0, x1, ul), hy[2] + 44); stroke(ctx, C.white, 14); }
      window.__HOOK = { size: hs, y: hy, lines: HL.map(([s]) => s) };
    }
`,
    },
    {
      nome: 'gancho: sem o mergulho pelo "o" (era da palavra "pousada?")',
      de: 'const ZOOM_IN = [1.4, T.build];',
      para: 'const ZOOM_IN = [1e3, 1e3 + 1];',
    },
    {
      nome: 'assinatura: "Sob o mesmo teto."',
      de: "[{ s: 'Tudo sob o mesmo teto.' }], 540, nameY + 180,",
      para: "[{ s: 'Sob o mesmo teto.' }], 540, nameY + 180,",
    },
    {
      nome: 'assinatura: sem "SISTEMA DE GESTÃO PARA POUSADAS"',
      de: "    typeText(ctx, 'SISTEMA DE GESTÃO PARA POUSADAS', 540, nameY + 76, p(lt, 0.42, 0.95), { size: 28, weight: 800, color: C.grayL, ls: 5, align: 'center' });\n",
      para: '',
    },
    {
      nome: 'assinatura: sem o CTA "Saiba mais no link da bio"',
      de: '    const ca = p(lt, 0.95, 1.3);',
      para: '    const ca = 0;',
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
    (0, eval)(src);                                   // define window.REEL00 (o motor, com as trocas)
  }

  function original(t) {
    const tr = MAPA.trechos;
    for (const s of tr) if (t >= s.novo[0] && t < s.novo[1]) return s.original + (t - s.novo[0]);
    const last = tr[tr.length - 1];
    return last.original + (Math.min(t, MAPA.duracao) - last.novo[0]);
  }

  function renderAt(ctx, t, o = {}) {
    t = clamp(t, 0, MAPA.duracao - 1e-4);
    REEL00.renderAt(ctx, original(t), o);
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
