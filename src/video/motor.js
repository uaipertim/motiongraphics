// motor.js — utilitários do motor de motion graphics (canvas 2D, tudo f(t), determinístico)
'use strict';

const W = 1080, H = 1920;
const COR = {
  tinta: '#0A0A0A', limao: '#AFFA27', off: '#F4F4F0', ambar: '#E8A317', branco: '#FFFFFF',
};
let TEMPO = null; // preenchido por carregarTempo()
let BPM = 124, BEAT = 60 / 124, BAR = 4 * 60 / 124;
const bar = (n) => n * BAR;
const beat = (n) => n * BEAT;

// ---------- matemática ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const E = {
  lin: (x) => x,
  inQ: (x) => x * x,
  outQ: (x) => 1 - (1 - x) * (1 - x),
  inC: (x) => x * x * x,
  outC: (x) => 1 - Math.pow(1 - x, 3),
  ioC: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inQt: (x) => x * x * x * x,
  outQt: (x) => 1 - Math.pow(1 - x, 4),
  ioQt: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outQn: (x) => 1 - Math.pow(1 - x, 5),
  inExp: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outExp: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  ioExp: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
  ioSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
};
// mola amortecida: 0 -> 1 com overshoot
function mola(t, freq = 4, amort = 0.35) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  return 1 - Math.exp(-amort * w * t) * Math.cos(w * Math.sqrt(1 - amort * amort) * t);
}
// gerador pseudoaleatório com semente
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// ruído suave 1D (soma de senos com fases), saída ~[-1,1]
function ruido(x, s = 0) {
  return (Math.sin(x * 1.31 + s * 12.9) * 0.5 + Math.sin(x * 2.17 + s * 7.3 + 1.7) * 0.3 + Math.sin(x * 4.03 + s * 3.1 + 4.2) * 0.2);
}

// ---------- ritmo ----------
function bumboAtivo(t) {
  const b = t / BAR;
  return TEMPO.bumbo.some(([a, z]) => b >= a && b < z);
}
// pulso que decai após cada batida com bumbo (0..1)
function pulso(t, dec = 0.11) {
  if (!bumboAtivo(t)) {
    // ainda pode haver cauda da última batida
    const tb = Math.floor(t / BEAT) * BEAT;
    if (!bumboAtivo(tb)) return 0;
  }
  const lt = t - Math.floor(t / BEAT) * BEAT;
  return Math.exp(-lt / dec);
}
// pulso numa lista de instantes
function pulsoEm(t, tempos, dec = 0.12) {
  let v = 0;
  for (const ti of tempos) if (t >= ti) v = Math.max(v, Math.exp(-(t - ti) / dec));
  return v;
}

// ---------- fontes e texto ----------
function fonte(ctx, peso, tam, fam = 'Geist', track = -0.04) {
  ctx.font = `${peso} ${tam}px ${fam === 'mono' ? 'GeistMono' : 'Geist'}`;
  ctx.letterSpacing = `${(track * tam).toFixed(2)}px`;
}
function largura(ctx, s) { return ctx.measureText(s).width; }
// mede caixa real do texto (ascendente/descendente)
function caixaTexto(ctx, s) {
  const m = ctx.measureText(s);
  return { w: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight };
}
// ajusta o tamanho para caber na largura
function tamanhoQueCabe(ctx, linhas, peso, tamMax, larguraMax, fam = 'Geist', track = -0.04) {
  let tam = tamMax;
  for (let i = 0; i < 40; i++) {
    fonte(ctx, peso, tam, fam, track);
    const w = Math.max(...linhas.map((l) => largura(ctx, l)));
    if (w <= larguraMax) return tam;
    tam *= 0.97;
  }
  return tam;
}
// layout de palavras numa linha. retorna [{p, x, w}] e largura total (x relativo ao início)
function layoutPalavras(ctx, linha) {
  const ps = linha.split(' ');
  const esp = largura(ctx, ' ');
  let x = 0;
  const out = [];
  for (const p of ps) {
    const w = largura(ctx, p);
    out.push({ p, x, w });
    x += w + esp;
  }
  return { palavras: out, w: x - esp };
}
// layout por caractere (para animação letra a letra)
function layoutLetras(ctx, s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const x = largura(ctx, s.slice(0, i));
    const w = largura(ctx, s.slice(0, i + 1)) - x;
    out.push({ c: s[i], x, w });
  }
  return { letras: out, w: largura(ctx, s) };
}

// desenha uma palavra revelada por máscara (sobe de baixo de uma linha de corte)
// p: 0..1 entrada; q: 0..1 saída (sobe e some)
function palavraMascara(ctx, txt, x, y, tam, p, q = 0, cor = COR.branco) {
  if (p <= 0 || q >= 1) return;
  const asc = tam * 1.08, desc = tam * 0.34;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - tam * 0.2, y - asc, largura(ctx, txt) + tam * 0.4, asc + desc);
  ctx.clip();
  const dy = (1 - E.outQt(p)) * (asc + desc) * 0.95 - E.inC(q) * (asc + desc);
  ctx.fillStyle = cor;
  ctx.fillText(txt, x, y + dy);
  ctx.restore();
}

// ---------- formas ----------
function retRed(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function circulo(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }

// ---------- ícones da marca (marca/icones, 24x24, traço 1.75) ----------
const ICONES = {
  reservas: ['M21 5H3', 'M15 12H3', 'M17 19H3'],
  chegada: ['M10 17l5-5-5-5', 'M15 12H3', 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4'],
  saida: ['M16 17l5-5-5-5', 'M21 12H9', 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'],
  comandas: [
    'M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z',
    'M14 8H8', 'M16 12H8', 'M13 16H8',
  ],
  caixa: ['M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M2 10H22', 'M6 14h2'],
  dinheiro: ['M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M14 12a2 2 0 1 1-4 0a2 2 0 1 1 4 0', 'M6 12h.01M18 12h.01'],
  cadeado: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
};
const _svgNS = 'http://www.w3.org/2000/svg';
let _svgHost = null;
const _cacheComp = new Map();
function compPath(d) {
  if (_cacheComp.has(d)) return _cacheComp.get(d);
  if (!_svgHost) { _svgHost = document.createElementNS(_svgNS, 'svg'); document.body.appendChild(_svgHost); }
  const p = document.createElementNS(_svgNS, 'path');
  p.setAttribute('d', d);
  _svgHost.appendChild(p);
  const L = p.getTotalLength();
  _cacheComp.set(d, L);
  return L;
}
const _cacheP2D = new Map();
function p2d(d) { if (!_cacheP2D.has(d)) _cacheP2D.set(d, new Path2D(d)); return _cacheP2D.get(d); }
// desenha ícone (centro cx,cy; tam = tamanho do lado em px). progs: progresso por sub-traço (0..1)
function desenhaIcone(ctx, nome, cx, cy, tam, progs, cor, larguraTraco = 1.75) {
  const ds = ICONES[nome];
  const s = tam / 24;
  ctx.save();
  ctx.translate(cx - 12 * s, cy - 12 * s);
  ctx.scale(s, s);
  ctx.strokeStyle = cor;
  ctx.lineWidth = larguraTraco;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ds.forEach((d, i) => {
    const p = typeof progs === 'number' ? progs : (progs[i] ?? 1);
    if (p <= 0) return;
    const L = compPath(d);
    if (p < 1) { ctx.setLineDash([L * p, L * 2 + 10]); ctx.lineDashOffset = 0; } else ctx.setLineDash([]);
    ctx.stroke(p2d(d));
  });
  ctx.restore();
}

// ---------- amostragem de caminhos (para morph) ----------
function amostraPath(d, n) {
  if (!_svgHost) { _svgHost = document.createElementNS(_svgNS, 'svg'); document.body.appendChild(_svgHost); }
  const p = document.createElementNS(_svgNS, 'path');
  p.setAttribute('d', d);
  _svgHost.appendChild(p);
  const L = p.getTotalLength();
  const pts = [];
  for (let i = 0; i < n; i++) { const q = p.getPointAtLength((L * i) / n); pts.push([q.x, q.y]); }
  _svgHost.removeChild(p);
  return pts;
}
function polyPath(pts) { return 'M' + pts.map((p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L') + 'Z'; }
// alinha o ponto inicial de B ao de A (minimiza distância total)
function alinhaPontos(A, B) {
  const n = A.length;
  let best = 0, bestD = Infinity;
  for (let k = 0; k < n; k += 1) {
    let d = 0;
    for (let i = 0; i < n; i += 4) { const b = B[(i + k) % n]; d += (A[i][0] - b[0]) ** 2 + (A[i][1] - b[1]) ** 2; }
    if (d < bestD) { bestD = d; best = k; }
  }
  return A.map((_, i) => B[(i + best) % n]);
}
function morphPts(A, B, p) { return A.map((a, i) => [lerp(a[0], B[i][0], p), lerp(a[1], B[i][1], p)]); }
function tracaPts(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// ---------- câmera ----------
function camera(ctx, cx, cy, escala = 1, rot = 0, ox = W / 2, oy = H / 2) {
  // leva o ponto (cx,cy) do mundo para (ox,oy) da tela
  ctx.translate(ox, oy);
  ctx.rotate(rot);
  ctx.scale(escala, escala);
  ctx.translate(-cx, -cy);
}

// ---------- poisson disk dentro de um polígono ----------
function dentroPoligono(x, y, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function distSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function distBorda(x, y, poly) {
  let m = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) m = Math.min(m, distSegmento(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  return m;
}
function poissonPoligono(poly, minD, margem, seed, tentativas = 6000) {
  const r = rng(seed);
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pts = [];
  for (let k = 0; k < tentativas; k++) {
    const x = lerp(x0, x1, r()), y = lerp(y0, y1, r());
    if (!dentroPoligono(x, y, poly) || distBorda(x, y, poly) < margem) continue;
    if (pts.some((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 < minD * minD)) continue;
    pts.push([x, y]);
  }
  return pts;
}

// ---------- dígitos rolantes (odômetro) ----------
// desenha um dígito "contínuo" v (ex.: 3.4 mostra 3 subindo para 4), dentro de uma janela
function digitoRolante(ctx, v, x, y, tam, cor, rad = 10, blur = 0) {
  const base = Math.floor(v);
  const f = v - base;
  const passo = tam * 1.15;
  ctx.fillStyle = cor;
  for (let k = -1; k <= 2; k++) {
    const d = (((base + k) % rad) + rad) % rad;
    const yy = y - (k - f) * passo;
    ctx.globalAlpha = 1;
    ctx.fillText(String(d), x, yy);
    if (blur > 0.02) {
      for (let j = 1; j <= 3; j++) {
        ctx.globalAlpha = 0.18 * blur;
        ctx.fillText(String(d), x, yy - j * blur * tam * 0.12);
        ctx.fillText(String(d), x, yy + j * blur * tam * 0.12);
      }
    }
  }
  ctx.globalAlpha = 1;
}
