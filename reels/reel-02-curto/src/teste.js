/* =====================================================================
   FAZLO Hospeda — REEL 02 · CORTE CURTO "Cada reserva no seu lugar." (15 s, 9:16)
   Reaproveita o motor do Reel 02 (anim.js, cópia idêntica do reels/reel-02,
   que não é alterado) por REMAPEAMENTO DE TEMPO: cada trecho do vídeo novo
   aponta para um trecho do original (src/mapa.json). Nada é redesenhado; só
   as trocas de texto abaixo, aplicadas na leitura do anim.js:

     1. o gancho: "Tem vaga / pro fim de semana?" vira "Dois hóspedes," (branco) /
        "o mesmo chalé," (branco) / "o mesmo" / "fim de semana?" (limão, as duas últimas), em Inter
        Display 900 e no MESMO corpo nas 4 linhas, já inteiro no quadro 0, no vão
        livre entre os grupos de perguntas (y 700–1120); as perguntas continuam pipocando em volta;
     2. a assinatura: sem a linha "GESTÃO DE RESERVAS" e sem o CTA "CONHEÇA O
        SISTEMA · LINK NA BIO" (corte de teste: só a frase e a logo, sem domínio
        nem CTA);
     3. os cues de som dessas peças saem junto (scripts/trilha.py).

   No fim, um fade para o preto nos últimos 0,3 s.

   TESTE.carregar()        lê mapa.json e anim.js (com as trocas) -> window.REEL02
   TESTE.renderAt(ctx, t)  desenha o quadro t (0–15 s) do vídeo novo
   TESTE.original(t)       o instante do original que aparece em t
   ===================================================================== */
(function () {
  'use strict';

  const TROCAS = [
    {
      nome: 'gancho: medidas do título novo',
      de: `    const s1 = fit(ctx, 'Tem vaga', 920, 250);
    const s2 = fit(ctx, 'pro fim de semana?', 920, 110);
    HOOKT = { s1, s2, y1: 880, y2: 880 + s2 * 1.25 };   // termina acima da coluna de ações do Reels
`,
      // as 4 linhas no MESMO corpo: o maior que cabe em 860 px (até 100); 700–1120 é o vão livre entre os grupos de perguntas
      para: `    const s1 = Math.floor(Math.min(...['Dois hóspedes,', 'o mesmo chalé,', 'o mesmo', 'fim de semana?'].map((x) => fit(ctx, x, 860, 100))));
    const lh = Math.round(s1 * 1.08), yy = 770;
    HOOKT = { s1, y: [yy, yy + lh, yy + 2 * lh, yy + 3 * lh] };
    window.__HOOK = { size: s1, y: HOOKT.y, lines: ['Dois hóspedes,', 'o mesmo chalé,', 'o mesmo', 'fim de semana?'] };
`,
    },
    {
      nome: 'gancho: o título novo (3 linhas, já inteiro no quadro 0)',
      de: `    const k1 = p(t, -0.08, 0.16);
    if (k1 > 0 && shat < 1) {
      const sc = lerp(1.35, 1, E.outExpo(k1)) * (1 + 0.04 * kick(t, 0.1, 0.3)) * (1 - shat);
      ctx.save(); ctx.translate(540, HOOKT.y1 - HOOKT.s1 * 0.35); ctx.scale(sc, sc); ctx.translate(-540, -(HOOKT.y1 - HOOKT.s1 * 0.35));
      txt(ctx, 'Tem vaga', 540, HOOKT.y1, { fam: DISPLAY, size: HOOKT.s1, weight: 900, color: C.white, align: 'center', ls: -HOOKT.s1 * 0.025 });
      ctx.restore();
      ctx.save(); ctx.translate(540, HOOKT.y2); ctx.scale(1 - shat, 1 - shat); ctx.translate(-540, -HOOKT.y2);
      riseLine(ctx, [{ s: 'pro fim de semana?' }], 540, HOOKT.y2, p(t, BT - 0.02, BT + 0.4), 0, { size: HOOKT.s2, color: C.lime, align: 'center' });
      ctx.restore();
    }
`,
      // todas as linhas já inteiras em t = 0; o golpe do 1º tempo vai nas duas brancas e o do 2º tempo nas duas limão
      para: `    if (shat < 1) {
      [['Dois hóspedes,', C.white, 0], ['o mesmo chalé,', C.white, 0], ['o mesmo', C.lime, 1], ['fim de semana?', C.lime, 1]].forEach(([s, col, g], i) => {
        const y = HOOKT.y[i], size = HOOKT.s1, tk = g ? BT + 0.02 : 0.1;
        const sc = (1 + 0.04 * kick(t, tk, 0.3)) * (1 - shat);
        ctx.save(); ctx.translate(540, y - size * 0.35); ctx.scale(sc, sc); ctx.translate(-540, -(y - size * 0.35));
        txt(ctx, s, 540, y, { fam: DISPLAY, size, weight: 900, color: col, align: 'center', ls: -size * 0.025 });
        ctx.restore();
      });
    }
`,
    },
    {
      nome: 'assinatura: sem "GESTÃO DE RESERVAS"',
      de: "    typeText(ctx, 'GESTÃO DE RESERVAS', 540, 830, p(lt, 0.15, 0.6), { size: 30, weight: 800, color: C.lime, ls: 6, align: 'center' });\n",
      para: '',
    },
    {
      nome: 'assinatura: sem o CTA "CONHEÇA O SISTEMA · LINK NA BIO"',
      de: '    const ca = p(lt, 0.85, 1.2);',
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
    (0, eval)(src);                                   // define window.REEL02 (o motor, com as trocas)
  }

  function original(t) {
    const tr = MAPA.trechos;
    for (const s of tr) if (t >= s.novo[0] && t < s.novo[1]) return s.original + (t - s.novo[0]);
    const last = tr[tr.length - 1];
    return last.original + (Math.min(t, MAPA.duracao) - last.novo[0]);
  }

  function renderAt(ctx, t, o = {}) {
    t = clamp(t, 0, MAPA.duracao - 1e-4);
    REEL02.renderAt(ctx, original(t), o);
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
