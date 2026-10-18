/* =====================================================================
   FAZLO Hospeda — REEL 02 · CORTE CURTO · CAPA (1080x1920)
   O gancho do vídeo: "Dois hóspedes," / "o mesmo chalé," (branco) e "o mesmo fim
   de semana?" (limão), em Inter Display 900, com um pedaço do TABULEIRO do
   próprio vídeo embaixo (as reservas em blocos, o quadro de 7,4 s do motor, sem
   título). Fundo preto da série; a logo pequena no topo, no centro.

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   faixa do contador livre (y 1560–1680), nada cortado nem escondido.
   O título fica centralizado na vertical do recorte 3:4 (centro em y = 960).
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const DISPLAY = "'R2 Display', 'Inter Display', 'Inter', sans-serif";
  const C = { bg: '#060606', bg2: '#0A0A0A', lime: '#AFFA27', white: '#FFFFFF' };
  const CENTER = 960;                                      // centro do recorte 3:4 (y 240–1680)
  const T_BOARD = 7.4;                                     // o tabuleiro erguido, sem título por cima (tempo do original)
  const CROP = { x: 60, y: 900, w: 960, h: 330 };          // o pedaço do tabuleiro (reservas em blocos)
  const L = { logoY: 356, logoD: 52, wordFS: 30, maxW: 900, gap: 48, lead: 1.06, boardH: 330 };
  const LINES = [['Dois hóspedes,', C.white], ['o mesmo chalé,', C.white], ['o mesmo fim de semana?', C.lime]];
  const BOXES = {};
  let LOGO = null, BOARD = null;

  function setFont(ctx, size, weight, ls = 0) { ctx.font = `${weight} ${size}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px'; }
  const tw = (ctx, s, size, weight, ls = 0) => { setFont(ctx, size, weight, ls); return ctx.measureText(s).width; };

  function init(img) {
    LOGO = img;
    // o quadro do tabuleiro, renderizado pelo motor do Reel 02 (sem motion blur), recortado e com as bordas esmaecidas
    const f = document.createElement('canvas'); f.width = W; f.height = H;
    REEL02.renderAt(f.getContext('2d'), T_BOARD, { noBlur: true });
    BOARD = document.createElement('canvas'); BOARD.width = CROP.w; BOARD.height = CROP.h;
    const b = BOARD.getContext('2d');
    b.drawImage(f, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, CROP.w, CROP.h);
    b.globalCompositeOperation = 'destination-in';
    const m = document.createElement('canvas'); m.width = CROP.w; m.height = CROP.h;
    const mc = m.getContext('2d'), F = 70;
    mc.fillStyle = '#fff'; mc.fillRect(0, 0, CROP.w, CROP.h);
    mc.globalCompositeOperation = 'destination-in';
    let g = mc.createLinearGradient(0, 0, 0, CROP.h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(F / CROP.h, '#000'); g.addColorStop(1 - F / CROP.h, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    mc.fillStyle = g; mc.fillRect(0, 0, CROP.w, CROP.h);
    g = mc.createLinearGradient(0, 0, CROP.w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(F / CROP.w, '#000'); g.addColorStop(1 - F / CROP.w, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    mc.fillStyle = g; mc.fillRect(0, 0, CROP.w, CROP.h);
    b.drawImage(m, 0, 0);
  }

  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, CENTER + 150, 0, 540, CENTER + 150, 1100);
    g.addColorStop(0, '#131513'); g.addColorStop(0.55, C.bg2); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // a logo, pequena, no topo
    {
      const name = 'FAZLO Hospeda', nw = tw(ctx, name, L.wordFS, 900, -0.6), gap = 14, x = 540 - (L.logoD + gap + nw) / 2;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(LOGO, x, L.logoY - L.logoD / 2, L.logoD, L.logoD);
      setFont(ctx, L.wordFS, 900, -0.6); ctx.fillStyle = C.white; ctx.fillText(name, x + L.logoD + gap, L.logoY + 11);
      BOXES['logo'] = { x0: x, x1: x + L.logoD + gap + nw, y0: L.logoY - L.logoD / 2, y1: L.logoY + L.logoD / 2 };
    }

    // o título: as duas primeiras linhas no maior corpo que cabe em 900 px; a 3ª (a mais larga) no dela; bloco centrado em y = 960
    const fit = (s) => Math.floor(100 * L.maxW / tw(ctx, s, 100, 900, -2.5));
    const S1 = Math.min(fit(LINES[0][0]), fit(LINES[1][0]), 150), S3 = fit(LINES[2][0]);
    const sizes = [S1, S1, S3], lh1 = Math.round(S1 * L.lead), lh2 = Math.round((S1 * 0.5 + S3 * 0.85));
    const cap = 0.727 * S1, h = cap + lh1 + lh2 + 0.2 * S3, top = CENTER - h / 2;
    const base = [top + cap, top + cap + lh1, top + cap + lh1 + lh2];
    LINES.forEach(([s, col], i) => {
      const sz = sizes[i], ls = -0.025 * sz, w = tw(ctx, s, sz, 900, ls);
      setFont(ctx, sz, 900, ls); ctx.fillStyle = col; ctx.fillText(s, 540 - w / 2, base[i]);
      BOXES[`título, linha ${i + 1}`] = { x0: 540 - w / 2, x1: 540 + w / 2, y0: base[i] - 0.727 * sz, y1: base[i] + 0.2 * sz };
    });
    BOXES['_bloco'] = { topo: top, base: top + h, centro: top + h / 2, tamanho: S1 };

    // o pedaço do tabuleiro do vídeo, embaixo
    const by = top + h + L.gap;
    ctx.save(); ctx.globalAlpha = 0.96; ctx.drawImage(BOARD, 60, by); ctx.restore();
    BOXES['visual (o tabuleiro)'] = { x0: 60 + 70, x1: 60 + CROP.w - 70, y0: by + 70, y1: by + CROP.h - 70 };
  }

  window.CAPACURTO = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
