/* =====================================================================
   FAZLO Hospeda — REEL 01 (V2) · CAPA NOVA (1080x1920)
   A mesma composição de antes — "Toda estadia / é um ciclo." no topo e o
   anel do ciclo (RESERVA, SINAL, CHECK-IN, COMANDA, CHECK-OUT, CAIXA) com o
   brilho limão logo abaixo —, com o título mais baixo para liberar o canto
   do ícone de play da grade, e a logo pequena no centro do anel (o eixo do
   ciclo, como no próprio vídeo).

   O anel vem do próprio motor (quadro de 3,98 s: o traço já fechou a
   volta); a faixa do título do filme é repintada com o mesmo fundo
   (bgDark, copiado do motor) e o título é desenhado de novo, mais abaixo.
   O motor (anim.js) é só lido: o vídeo não muda.

   Regra fixa das capas (reels/README.md): recorte 3:4 com folga de 60 px
   (x 60–1020, y 300–1620), canto do play livre (x ≥ 860, y 240–440),
   nada cortado.
   ===================================================================== */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const T_RING = 3.98;                      // o anel completo, antes de a logo do filme entrar
  const CUT_Y = 720;                        // acima disso, só o título do filme (repintado com o fundo)
  const DISPLAY = "'V2 Display', 'Inter Display', 'Inter', sans-serif";
  const C = { black: '#0A0A0A', lime: '#AFFA27', white: '#FFFFFF' };
  // título: o mesmo corpo do vídeo (116 px, −0,025 em), centrado; a 1ª linha começa abaixo de y 440
  const TITLE = { size: 116, capTop: 452, lh: 1.04, ls: -0.025 };
  const RING = { x: 540, y: 1150 }, LOGO_D = 132;
  const BOXES = {};
  let LOGO = null;

  // o fundo escuro do motor (grade de cruzetas com deriva + vinheta), idêntico ao do quadro
  function bgDark(ctx, lt) {
    ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = '#1B1B1B'; ctx.lineWidth = 2;
    const g = 120, oy = (lt * 10) % g;
    ctx.beginPath();
    for (let y = -g + oy + 40; y < H + g; y += g) for (let x = 60; x < W; x += g) { ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); }
    ctx.stroke();
    const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function setFont(ctx, size, ls) { ctx.font = `900 ${size}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls + 'px'; }
  function line(ctx, segs, y) {
    const S = TITLE.size, ls = TITLE.ls * S;
    setFont(ctx, S, ls);
    const ws = segs.map((s) => ctx.measureText(s.s).width), total = ws.reduce((a, b) => a + b, 0);
    let x = 540 - total / 2;
    segs.forEach((s, i) => { ctx.fillStyle = s.color; ctx.fillText(s.s, x, y); x += ws[i]; });
    return { x0: 540 - total / 2, x1: 540 + total / 2 };
  }

  function init(img) { LOGO = img; }
  function render(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    FAZLO2.renderAt(ctx, T_RING);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, CUT_Y); ctx.clip(); bgDark(ctx, T_RING); ctx.restore();
    // título no lugar novo
    const S = TITLE.size, b1 = TITLE.capTop + S * 0.727, b2 = b1 + S * TITLE.lh;
    const l1 = line(ctx, [{ s: 'Toda estadia', color: C.white }], b1);
    const l2 = line(ctx, [{ s: 'é um ', color: C.white }, { s: 'ciclo.', color: C.lime }], b2);
    // a logo pequena no centro do anel (o eixo do ciclo), com o brilho do vídeo
    const g = ctx.createRadialGradient(RING.x, RING.y, 60, RING.x, RING.y, 260);
    g.addColorStop(0, 'rgba(175,250,39,0.16)'); g.addColorStop(1, 'rgba(175,250,39,0)');
    ctx.fillStyle = g; ctx.fillRect(RING.x - 260, RING.y - 260, 520, 520);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(LOGO, RING.x - LOGO_D / 2, RING.y - LOGO_D / 2, LOGO_D, LOGO_D);
    Object.assign(BOXES, {
      'título, linha 1': { x0: l1.x0, x1: l1.x1, y0: TITLE.capTop, y1: b1 + S * 0.06 },
      'título, linha 2': { x0: l2.x0, x1: l2.x1, y0: b2 - S * 0.727, y1: b2 + S * 0.06 },
      'anel e rótulos': { x0: 76, x1: 984, y0: 778, y1: 1531 },
      'logo (centro do anel)': { x0: RING.x - LOGO_D / 2, x1: RING.x + LOGO_D / 2, y0: RING.y - LOGO_D / 2, y1: RING.y + LOGO_D / 2 },
    });
  }
  window.V2CAPA = { init, render, boxes: () => JSON.parse(JSON.stringify(BOXES)) };
})();
