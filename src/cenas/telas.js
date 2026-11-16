/* O dia a dia com o Hospeda — telas reais dentro do celular.
 * Todo tempo sai das palavras da narração (B.T). Coordenadas em px CSS do app.
 */
(window.CENAS = window.CENAS || []).push(function (raizCenas) {
  const { h, T, A, som } = B;
  const el = h('div', { class: 'cena', id: 'c-telas' });
  raizCenas.appendChild(el);
  const tEntra = T('virada', 'fica') + 0.05;
  const tI = A('internet').ini;
  M.cena(el, tEntra - 0.05, tI + 0.02);

  const f = Aparelho(el, { tipo: 'celular' });
  const j = Aparelho(el, { tipo: 'janela', tw: 520, th: 706, bz: 0, raio: 24, fundo: 'transparent' });
  B.fone = f;

  const rol = (id, alt) => ({ tipo: 'rolagem', corpo: `telas/${id}.png`, alt, cab: `telas/${id}-cab.png`, nav: `telas/${id}-nav.png`, fab: `telas/${id}-fab.png` });
  f.pagina('01', rol('01', 1126));
  f.pagina('02', rol('02', 852));
  f.pagina('03', { tipo: 'fixa', img: 'telas/03.png' });
  f.pagina('11r', { tipo: 'fixa', img: 'telas/11r.png' });
  f.pagina('11d', { tipo: 'fixa', img: 'telas/11d.png' });
  f.pagina('05', rol('05', 1472));
  f.pagina('04', { tipo: 'fixa', img: 'telas/04.png' });
  f.pagina('06', rol('06', 1538));
  // 10: o caixa (06, no topo) escurece e a folha "Fechar caixa" sobe
  const fundo10 = h('div', { style: 'position:absolute;left:0;top:0;width:390px;height:812px;background-image:url(telas/10.png);background-size:390px auto;' });
  const folha10 = h('div', { style: 'position:absolute;left:0;top:241px;width:390px;height:571px;border-radius:24px 24px 0 0;overflow:hidden;background:#fff url(telas/10-folha.png) 0 0/390px auto no-repeat;box-shadow:0 -12px 40px rgba(10,10,10,0.18);' });
  f.pagina('10', { tipo: 'fixa', img: 'telas/06.png', fundo: '#F4F4F0' });
  const pg10 = f.paginas['10'];
  // sobre o 06 parado: cabeçalho e barra do 06, véu 40% (token "fundo-janela"), depois a tela 10 inteira
  pg10.raiz.appendChild(h('div', { style: 'position:absolute;left:0;top:728px;width:390px;height:84px;background:url(telas/06-nav.png) 0 0/390px auto;' }));
  pg10.raiz.appendChild(h('div', { style: 'position:absolute;left:161px;top:701px;width:68px;height:68px;background:url(telas/06-fab.png) 0 0/68px auto;' }));
  const veu10 = h('div', { style: 'position:absolute;inset:0;background:rgba(10,10,10,0.4);' });
  pg10.raiz.appendChild(veu10);
  pg10.raiz.appendChild(folha10);
  pg10.raiz.appendChild(fundo10);
  const veu10Ob = M.el(veu10, { o: 0 }), folha10Ob = M.el(folha10, { y: 580 }), fundo10Ob = M.el(fundo10, { o: 0 });

  j.pagina('09', { tipo: 'fixa', img: 'telas/09-janela.png', fundo: 'transparent' });

  const cam = (ap, t, dur, v, ease) => { ap.vista(t, dur, v, ease); som(t, 'foco', { dur, forca: 0.4 }); };

  /* ================= entrada: celular apagado ================= */
  f.trocar(tEntra, '01', 'corte');
  M.por(f.apagada, tEntra, { o: 1 });
  M.para(f.cam, tEntra, 0.35, { o: [0, 1] }, 'out2');   // nasce dentro do contorno da virada
  // brilho que varre o vidro enquanto a tela está apagada
  const brilho = h('div', { style: 'position:absolute;left:-260px;top:-80px;width:170px;height:1000px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.075),rgba(255,255,255,0));transform-origin:50% 50%;' });
  f.tela.querySelector('.ap-apagada').appendChild(brilho);
  const brilhoOb = M.el(brilho, { r: 14, x: 0 });
  M.para(brilhoOb, tEntra + 0.3, 1.0, { x: [0, 760] }, 'io2');
  M.para(brilhoOb, tEntra + 1.35, 1.0, { x: [0, 760] }, 'io2');
  // pontinho pulsando: "toque para abrir"
  const pulso = h('div', { style: 'position:absolute;left:171px;top:382px;width:48px;height:48px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(175,250,39,0.9);' });
  f.tela.querySelector('.ap-apagada').appendChild(pulso);
  const pulsoOb = M.el(pulso, { o: 0, s: 0.6 });
  for (let k = 0; k < 4; k++) {
    const t0 = tEntra + 0.55 + k * 0.5;
    M.para(pulsoOb, t0, 0.5, { s: [0.5, 1.5] }, 'out3');
    M.para(pulsoOb, t0, 0.5, { o: [0.9, 0] }, 'in2');
  }

  /* ================= 01 · visão geral ================= */
  const v = (w, n) => T('visao', w, n);
  f.visivel(v('abrir'));                         // a tela acende aqui
  f.toque(v('abrir') - 0.04, 195, 406);
  M.para(f.apagada, v('abrir'), 0.4, { o: 0 }, 'out2');
  som(v('abrir') + 0.02, 'pop', { forca: 0.8 });
  const V01 = f.enquadrar(0, 86, 390, 452);
  cam(f, v('você') - 0.12, 0.85, V01);
  f.foco(v('dia') - 0.12, [18, 88, 226, 62], { raio: 10, m: 4 });
  f.foco(v('hospedado') - 0.14, [20, 420, 110, 106], { raio: 16, m: 3 });
  f.foco(v('chega') - 0.14, [140, 420, 110, 106], { raio: 16, m: 3 });
  f.foco(v('sai') - 0.14, [260, 420, 110, 106], { raio: 16, m: 3 });
  f.foco(v('quanto') - 0.14, [20, 164, 350, 243], { raio: 20, m: 4 });
  const tC = A('calendario').ini;
  f.salto(v('já'), tC - 0.3, {
    img: 'telas/01.png', ix: 20, iy: 164, x: 20, y: 164, w: 350, h: 243, larg: 940, cy: 650, raio: 18, fundo: '#0A0A0A',
    aneis: [{ t: v('forma') - 0.06, x: 12, y: 131, w: 326, h: 50, raio: 10 }],
  });
  som(v('já') + 0.35, 'valor', { forca: 0.6 });

  /* ================= 02 · calendário ================= */
  const c = (w, n) => T('calendario', w, n);
  f.semFoco(tC - 0.28);
  cam(f, tC - 0.26, 0.5, f.INTEIRO);
  f.toque(tC + 0.25, 118, 762);                 // toca em "Calendário" na barra
  f.trocar(tC + 0.29, '02', 'troca');
  f.rolar('02', tC + 0.8, 0.65, 124);
  const V02 = f.enquadrar(8, 96, 374, 560);
  cam(f, tC + 0.75, 0.75, V02);
  f.foco(c('acomodação') - 0.1, [22, 155, 90, 489], { raio: 12, m: 2 });
  f.foco(c('tem') - 0.05, [22, 155, 346, 49], { raio: 10, m: 2, dur: 0.4 });
  M.para(f.focoOb, c('linha') - 0.02, 0.95, { y: 596 - 2 }, 'io2');   // desce linha por linha
  for (let k = 1; k <= 9; k++) som(c('linha') + 0.05 + k * 0.095, 'tick', { forca: 0.3 });
  f.semFoco(c('reserva') - 0.14, 0.2);
  const barras = [[170, 166, 69, 28], [280, 215, 90, 28], [170, 313, 106, 28], [112, 362, 127, 28], [112, 460, 90, 28], [206, 460, 106, 28], [112, 558, 54, 28], [243, 558, 69, 28]];
  f.focoMulti(c('reserva') - 0.1, c('aparece') + 0.25, barras, { raio: 8, m: 2, passo: 0.085 });
  const tD = A('duplicada').ini;
  f.salto(c('aparece'), tD - 0.3, {
    img: 'telas/02.png', ix: 20, iy: 230, x: 20, y: 230 - 124, w: 350, h: 245, larg: 960, cy: 650, raio: 16,
    aneis: [
      { t: c('no') - 0.02, x: 127, y: 3, w: 151, h: 43, raio: 8 },       // dias 17 a 20
      { t: c('período'), x: 146, y: 203, w: 114, h: 36, raio: 10 },      // a reserva nesses dias
    ],
  });

  /* ================= 09 · reserva duplicada (janela do computador) ================= */
  const d = (w, n) => T('duplicada', w, n);
  j.trocar(tD - 1, '09', 'corte');
  f.saiu(tD - 0.26);
  M.para(f.cam, tD - 0.26, 0.5, { ax: -560 }, 'in3');
  M.por(f.cam, tD + 0.26, { o: 0 });
  som(tD + 0.02, 'whoosh', { dur: 0.6, forca: 0.6 });
  M.por(j.cam, tD - 0.3, Object.assign({ o: 1 }, j.INTEIRO, { ax: 1750 }));
  j.visivel(tD - 0.12);
  M.para(j.cam, tD - 0.12, 0.62, { ax: 540 }, 'out4');
  // a janela inteira fica à vista; o aviso é que salta
  cam(j, d('não') - 0.25, 0.9, { cx: 260, cy: 300, s: 1.74, ay: 737 });
  j.foco(d('não') - 0.1, [24, 233, 472, 64], { raio: 14, m: 3, cor: 1 });
  som(d('não'), 'alerta', { forca: 0.6 });
  j.pulso(d('duas'));
  j.pulso(d('mesmas'));
  const tS = A('sinal').ini;
  j.salto(d('avisa') - 0.06, tS - 0.36, { img: 'telas/09-janela.png', iw: 520, ix: 16, iy: 225, x: 16, y: 225, w: 488, h: 80, larg: 984, cy: 650, raio: 14, cor: 1 });
  som(d('avisa') + 0.3, 'alerta', { forca: 0.5 });

  /* ================= 03 · nova reserva: sinal e saldo ================= */
  const s3 = (w, n) => T('sinal', w, n);
  j.semFoco(tS - 0.36);
  j.saiu(tS - 0.32);
  M.para(j.cam, tS - 0.32, 0.5, { ax: 1750 }, 'in3');
  M.por(j.cam, tS + 0.2, { o: 0 });
  som(tS, 'whoosh', { dur: 0.6, forca: 0.6 });
  f.trocar(tS - 0.6, '03', 'corte');
  const V03 = f.enquadrar(10, 122, 370, 474);
  M.por(f.cam, tS - 0.32, Object.assign({ o: 1 }, V03, { ax: -700 }));
  f.visivel(tS - 0.2);
  M.para(f.cam, tS - 0.2, 0.62, { ax: 540 }, 'out4');
  f.foco(s3('sinal') - 0.14, [36, 236, 318, 55], { raio: 14, m: 4 });
  cam(f, s3('registra') - 0.1, 0.6, f.enquadrar(10, 150, 370, 420));
  f.pulso(s3('sinal') + 0.32);
  f.foco(s3('saldo') - 0.14, [36, 523, 318, 58], { raio: 14, m: 4 });
  cam(f, s3('e') - 0.05, 0.6, f.enquadrar(10, 200, 370, 420));
  const tK = A('cancelamento').ini;
  f.salto(s3('saldo') + 0.16, tK - 0.36, { img: 'telas/03.png', ix: 30, iy: 517, x: 30, y: 517, w: 330, h: 70, larg: 940, cy: 610, raio: 16, fundo: '#F4F4F0' });
  som(s3('saldo') + 0.45, 'valor', { forca: 0.6 });

  /* ================= 11 · cancelamento: reter ou devolver ================= */
  const k = (w, n) => T('cancelamento', w, n);
  f.semFoco(tK - 0.36);
  f.trocar(tK - 0.16, '11r', 'troca');
  const V11 = f.enquadrar(10, 112, 370, 440);
  cam(f, tK - 0.2, 0.6, V11);
  f.foco(k('decide') - 0.12, [36, 315, 318, 119], { raio: 14, m: 4 });
  f.foco(k('reter') - 0.12, [36, 374, 318, 60], { raio: 12, m: 3 });
  f.foco(k('fica') - 0.12, [36, 449, 318, 82], { raio: 12, m: 3 });
  f.semFoco(k('devolver') - 0.2, 0.15);
  f.toque(k('devolver') - 0.05, 54, 345);       // toca em "Devolver"
  f.trocar(k('devolver') - 0.02, '11d', 'funde');
  f.foco(k('devolver') + 0.02, [36, 325, 318, 59], { raio: 12, m: 3 });
  f.foco(k('saída') - 0.12, [36, 459, 318, 63], { raio: 12, m: 3 });
  const tM = A('comanda').ini;
  f.salto(k('lançada') - 0.06, tM - 0.36, { img: 'telas/11d.png', ix: 30, iy: 453, x: 30, y: 453, w: 330, h: 75, larg: 940, cy: 610, raio: 14, fundo: '#F4F4F0' });

  /* ================= 05 · comanda ================= */
  const m = (w, n) => T('comanda', w, n);
  f.semFoco(tM - 0.36);
  f.trocar(tM - 0.16, '05', 'troca');
  const V05a = f.enquadrar(8, 92, 374, 400);
  cam(f, tM - 0.2, 0.6, V05a);
  f.foco(m('consumo') - 0.12, [20, 218, 350, 130], { raio: 18, m: 3 });
  f.salto(m('consumo') + 0.2, m('o') - 0.5, { img: 'telas/05.png', ix: 20, iy: 218, x: 20, y: 218, w: 350, h: 130, larg: 940, cy: 610, raio: 16 });
  som(m('consumo') + 0.5, 'valor', { forca: 0.55 });
  f.semFoco(m('o') - 0.46, 0.2);
  f.rolar('05', m('o') - 0.44, 0.5, 318);
  cam(f, m('o') - 0.44, 0.55, f.enquadrar(10, 172, 370, 216, { ay: 700 }));
  f.foco(m('que') - 0.02, [34, 222, 118, 42], { raio: 8, m: 4 });       // o que foi
  f.foco(m('quantos') - 0.12, [34, 269, 96, 24], { raio: 8, m: 4 });    // quantos (3 × R$ 22,00)
  f.foco(m('e') - 0.1, [276, 222, 82, 24], { raio: 8, m: 4 });          // e quanto (R$ 66,00)

  /* ================= 04 · check-out ================= */
  const o4 = (w, n) => T('checkout', w, n);
  const tO = A('checkout').ini;
  f.semFoco(tO - 0.2);
  f.trocar(tO - 0.06, '04', 'troca');
  const V04 = f.enquadrar(8, 86, 374, 470);
  cam(f, tO - 0.12, 0.6, V04);
  f.foco(o4('saldo') - 0.12, [36, 372, 318, 90], { raio: 16, m: 3 });
  const tX = A('caixa').ini;
  f.salto(o4('aparece') - 0.05, tX - 0.34, {
    img: 'telas/04.png', ix: 30, iy: 366, x: 30, y: 366, w: 330, h: 102, larg: 940, cy: 610, raio: 18,
    aneis: [{ t: o4('só') - 0.06, x: 16, y: 57, w: 254, h: 32, raio: 8 }],
  });
  som(o4('aparece') + 0.3, 'valor', { forca: 0.55 });

  /* ================= 06 · caixa aberto ================= */
  const cx = (w, n) => T('caixa', w, n);
  f.semFoco(tX - 0.34);
  cam(f, tX - 0.3, 0.5, f.INTEIRO);
  f.trocar(tX - 0.1, '06', 'troca');
  const V06a = f.enquadrar(8, 84, 374, 416);
  cam(f, tX + 0.36, 0.6, V06a);
  f.foco(cx('abre') + 0.12, [30, 400, 330, 27], { raio: 8, m: 4 });
  f.salto(cx('com') + 0.1, cx('e') - 0.12, { img: 'telas/06.png', ix: 28, iy: 394, x: 28, y: 394, w: 334, h: 39, larg: 940, cy: 610, raio: 9, fundo: '#0A0A0A' });
  som(cx('dinheiro'), 'valor', { forca: 0.5 });
  f.semFoco(cx('e') - 0.08, 0.2);
  f.rolar('06', cx('e') - 0.06, 0.85, 836, 'io3');
  cam(f, cx('e') - 0.06, 0.85, f.enquadrar(8, 76, 374, 540));
  f.foco(cx('recebimento') + 0.3, [28, 300, 334, 84], { raio: 10, m: 2 });
  f.foco(cx('entra') - 0.02, [28, 392, 334, 64], { raio: 10, m: 2, dur: 0.32 });
  f.foco(cx('diário') - 0.02, [28, 462, 334, 80], { raio: 10, m: 2, dur: 0.32 });
  f.foco(cx('com', 2) - 0.1, [34, 349, 172, 28], { raio: 8, m: 3 });   // horário · tipo · forma de pagamento
  const tF = A('fechamento').ini;
  f.salto(cx('a'), tF - 0.44, {
    img: 'telas/06.png', ix: 28, iy: 1136, x: 28, y: 300, w: 334, h: 84, larg: 940, cy: 610, raio: 12,
    aneis: [{ t: cx('forma') + 0.2, x: 5, y: 48, w: 180, h: 31, raio: 8 }],
  });

  /* ================= 10 · fechamento ================= */
  const fe = (w, n) => T('fechamento', w, n);
  f.semFoco(tF - 0.44);
  f.rolar('06', tF - 0.42, 0.6, 0);
  cam(f, tF - 0.42, 0.6, f.INTEIRO);
  f.toque(tF + 0.24, 195, 248);                  // toca em "Fechar caixa"
  f.trocar(tF + 0.28, '10', 'corte');
  M.para(veu10Ob, tF + 0.28, 0.3, { o: [0, 1] }, 'out2');
  M.para(folha10Ob, tF + 0.3, 0.55, { y: [580, 0] }, 'out4');
  M.por(fundo10Ob, tF + 0.9, { o: 1 });
  som(tF + 0.3, 'deslize', { dur: 0.5, forca: 0.5 });
  const V10 = f.enquadrar(8, 252, 374, 322);
  cam(f, tF + 0.72, 0.62, V10);
  f.foco(fe('conta') - 0.12, [20, 402, 350, 76], { raio: 14, m: 3 });
  f.pulso(fe('dinheiro') + 0.1);
  f.foco(fe('mostra') - 0.12, [20, 490, 350, 64], { raio: 14, m: 3, cor: 1 });
  som(fe('mostra'), 'alerta', { forca: 0.5 });
  f.salto(fe('se') - 0.1, tI - 0.62, { img: 'telas/10.png', ix: 14, iy: 484, x: 14, y: 484, w: 362, h: 76, larg: 956, cy: 610, raio: 16, cor: 1, fundo: '#FFF7E3' });

  /* ================= saída do celular ================= */
  f.semFoco(tI - 0.62);
  f.saiu(tI - 0.44);
  M.para(f.cam, tI - 0.44, 0.42, { dy: 240 }, 'in3');
  M.para(f.cam, tI - 0.34, 0.3, { o: 0 }, 'in2');
  som(tI - 0.2, 'whoosh', { dur: 0.6, forca: 0.6 });
});
