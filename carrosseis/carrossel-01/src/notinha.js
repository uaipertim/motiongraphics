/* =====================================================================
   A notinha de caixa do Reel 07, como componente reutilizável.
   Mesmo desenho do vídeo e da capa (reels/reel-07/src/anim.js e capa.js):
   papel térmico #F2F2EC com fibras e borda serrilhada, réguas tracejadas,
   texto em JetBrains Mono NL, o valor de cada linha impresso em negativo
   (bloco preto, texto limão) e a fenda acesa da impressora.
   O Reel 07 não é alterado: este arquivo só repete o desenho dele.

   NOTINHA.draw(ctx, {
     cx, slotY,            // centro do papel e altura da fenda
     lines: ['RÓTULO ..... valor', ...],   // o valor é tudo depois do último ". "
     fs = 44,              // corpo da fonte (a largura do papel acompanha)
     cols,                 // colunas da grade (padrão: a linha mais longa)
     tilt = 0, scale = 1,  // inclinação (graus) e escala do conjunto
   }) -> { x0, x1, y0, y1 }  (caixa ocupada, em pixels)
   ===================================================================== */
(function () {
  'use strict';

  const MONO = "'C1 Mono', 'JetBrains Mono', monospace";
  const C = { ink: '#121212', inkDots: '#8F8E87', paper: '#F2F2EC', lime: '#AFFA27' };
  const TAU = Math.PI * 2;
  function hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const lime = (a) => `rgba(175,250,39,${a})`;
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); }
  function glow(ctx, x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, lime(a)); g.addColorStop(0.4, lime(a * 0.35)); g.addColorStop(1, lime(0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  function setFont(ctx, size, weight) { ctx.font = `${weight} ${size}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px'; }
  function parse(s) {
    const c1 = s.indexOf(' .'), c2 = s.lastIndexOf('. ') + 2;
    return { label: s.slice(0, c1), dots: s.slice(c1, c2), q: s.slice(c2), c1, c2 };
  }
  let FIBERS = null;
  function fibers() {
    if (FIBERS) return FIBERS;
    FIBERS = document.createElement('canvas'); FIBERS.width = FIBERS.height = 256;
    const g = FIBERS.getContext('2d');
    for (let k = 0; k < 1400; k++) {
      g.fillStyle = `rgba(110,106,96,${0.025 + 0.05 * hash(k, 5)})`;
      g.fillRect(hash(k, 3) * 256, hash(k, 4) * 256, 1 + 3 * hash(k, 6), 1);
    }
    return FIBERS;
  }

  function draw(ctx, o) {
    const fs = o.fs || 44, P = o.lines.map(parse);
    const cols = o.cols || Math.max(...o.lines.map((s) => s.length));
    setFont(ctx, fs, 800);
    const CW = ctx.measureText('0').width;
    const pad = Math.round(fs * 0.86), PW = cols * CW + 2 * pad;
    const k = fs / 44;                                        // proporções do Reel (corpo 44)
    const V = { rule1: 56 * k, line0: 130 * k, pitch: 112 * k };
    V.rule2 = V.line0 + (P.length - 1) * V.pitch + 88 * k;
    V.end = V.rule2 + 70 * k;
    const cx = o.cx, SY = o.slotY, PX0 = cx - PW / 2, PX1 = cx + PW / 2, TX0 = PX0 + pad;
    const tilt = (o.tilt || 0) * Math.PI / 180, S = o.scale || 1;

    ctx.save();
    ctx.translate(cx, SY); ctx.rotate(tilt); ctx.scale(S, S); ctx.translate(-cx, -SY);
    // o papel, só acima da fenda
    ctx.save();
    ctx.beginPath(); ctx.rect(PX0 - 200, SY - V.end - 200, PW + 400, V.end + 200); ctx.clip();
    ctx.translate(0, SY - V.end);
    const path = () => {
      const tooth = 18, hT = 9;
      ctx.beginPath(); ctx.moveTo(PX0, hT);
      for (let x = PX0; x < PX1 - 0.5; x += tooth) { ctx.lineTo(x + tooth / 2, 0); ctx.lineTo(Math.min(PX1, x + tooth), hT); }
      ctx.lineTo(PX1, V.end + 40); ctx.lineTo(PX0, V.end + 40); ctx.closePath();
    };
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 14; path(); ctx.fillStyle = C.paper; ctx.fill(); ctx.restore();
    ctx.save(); path(); ctx.clip();
    ctx.globalAlpha = 0.9; ctx.fillStyle = ctx.createPattern(fibers(), 'repeat'); ctx.fillRect(PX0, 0, PW, V.end + 40); ctx.globalAlpha = 1;
    let g = ctx.createLinearGradient(PX0, 0, PX0 + 22, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(PX0, 0, 22, V.end + 40);
    g = ctx.createLinearGradient(PX1, 0, PX1 - 22, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(PX1 - 22, 0, 22, V.end + 40);
    g = ctx.createLinearGradient(0, 0, 0, 46);
    g.addColorStop(0, 'rgba(0,0,0,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(PX0, 0, PW, 46);
    g = ctx.createLinearGradient(0, V.end - 80, 0, V.end);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.24)'); ctx.fillStyle = g; ctx.fillRect(PX0, V.end - 80, PW, 80);
    g = ctx.createLinearGradient(0, V.end - 46, 0, V.end);
    g.addColorStop(0, lime(0)); g.addColorStop(1, lime(0.12)); ctx.fillStyle = g; ctx.fillRect(PX0, V.end - 46, PW, 46);
    const dashRow = (v, color) => { ctx.fillStyle = color; for (let i = 0; i < cols; i++) ctx.fillRect(TX0 + i * CW + CW * 0.2, v - 1.5 * k, CW * 0.6, 3 * k); };
    dashRow(V.rule1, C.inkDots);
    P.forEach((L, i) => {
      const y = V.line0 + i * V.pitch, base = y + 16 * k;
      setFont(ctx, fs, 800); ctx.fillStyle = C.ink; ctx.fillText(L.label, TX0, base);
      setFont(ctx, fs, 700); ctx.fillStyle = C.inkDots; ctx.fillText(L.dots, TX0 + L.c1 * CW, base);
      const x0 = TX0 + L.c2 * CW - 11 * k, wch = L.q.length * CW + 22 * k, hh = 60 * k;
      rr(ctx, x0, y - hh / 2, wch, hh, 10 * k); ctx.fillStyle = C.ink; ctx.fill();
      setFont(ctx, fs, 800); ctx.fillStyle = C.lime; ctx.fillText(L.q, x0 + 11 * k, base);
    });
    dashRow(V.rule2 - 6 * k, C.ink); dashRow(V.rule2 + 6 * k, C.ink);
    ctx.restore();
    ctx.restore();
    // a boca da impressora com a fenda acesa (a frente se apaga para o fundo)
    const mx0 = PX0 - 16, mx1 = PX1 + 16;
    const gb = ctx.createLinearGradient(0, SY - 12, 0, SY + 110);
    gb.addColorStop(0, '#20211F'); gb.addColorStop(0.35, '#121311'); gb.addColorStop(1, 'rgba(10,10,10,0)');
    rr(ctx, mx0, SY - 12, mx1 - mx0, 130, 26); ctx.fillStyle = gb; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(mx0 + 30, SY - 11, mx1 - mx0 - 60, 2);
    rr(ctx, mx0 + 20, SY - 7, mx1 - mx0 - 40, 14, 7); ctx.fillStyle = '#000'; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const hw = (mx1 - mx0) / 2 - 36, gl = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
    gl.addColorStop(0, lime(0)); gl.addColorStop(0.12, lime(0.75)); gl.addColorStop(0.88, lime(0.75)); gl.addColorStop(1, lime(0));
    ctx.fillStyle = gl; ctx.fillRect(cx - hw, SY - 2, 2 * hw, 4);
    ctx.save(); ctx.translate(cx, SY); ctx.scale(hw / 70, 1); glow(ctx, 0, 0, 70, 0.2); ctx.restore();
    ctx.restore();
    ctx.restore();
    // caixa ocupada (papel + boca), com inclinação e escala
    const pts = [[mx0, SY - V.end], [mx1, SY - V.end], [mx0, SY + 20], [mx1, SY + 20]].map(([x, y]) => {
      const dx = (x - cx) * S, dy = (y - SY) * S;
      return [cx + dx * Math.cos(tilt) - dy * Math.sin(tilt), SY + dx * Math.sin(tilt) + dy * Math.cos(tilt)];
    });
    return { x0: Math.min(...pts.map((q) => q[0])), x1: Math.max(...pts.map((q) => q[0])), y0: Math.min(...pts.map((q) => q[1])), y1: Math.max(...pts.map((q) => q[1])) };
  }

  // altura do papel acima da fenda e da boca da impressora abaixo dela (para centralizar)
  function height(o) {
    const k = (o.fs || 44) / 44, S = o.scale || 1;
    const rule2 = 130 * k + (o.lines.length - 1) * 112 * k + 88 * k;
    return { paper: (rule2 + 70 * k) * S, mouth: 60 * S };
  }

  window.NOTINHA = { draw, height };
})();
