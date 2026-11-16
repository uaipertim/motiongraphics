/* Monta todas as cenas e expõe renderAt(t) para o renderizador. */
(async function () {
  await Promise.all([
    document.fonts.load('400 20px "Geist"'), document.fonts.load('800 20px "Geist"'),
    document.fonts.load('700 20px "Geist Mono"'),
  ]);
  await document.fonts.ready;

  const cenasEl = document.getElementById('cenas');
  (window.CENAS || []).forEach((construir) => construir(cenasEl));
  M.usarCena(null);
  const paginas = Legenda.montar(document.getElementById('legenda'));

  // espera todas as imagens usadas como fundo
  const urls = new Set();
  document.querySelectorAll('*').forEach((e) => {
    const m = /url\(["']?([^"')]+)["']?\)/.exec(e.style.backgroundImage || '');
    if (m) urls.add(m[1]);
  });
  await Promise.all([...urls].map((u) => { const i = new Image(); i.src = u; return i.decode().catch(() => { throw new Error('imagem: ' + u); }); }));

  window.DUR = B.N.duracao;
  window.FPS = 60;
  window.EVENTOS = B.EVENTOS.slice().sort((a, b) => a.t - b.t);
  window.PAGINAS_LEGENDA = paginas.map((p) => ({ assunto: p.assunto, ini: p.ini, fim: p.fim, texto: p.texto, corpo: p.corpo, linhas: p.linhas }));
  window.REGISTRO = (B.registro || []).slice().sort((a, b) => a.t - b.t);
  window.renderAt = (t) => { M.render(t); return true; };
  M.render(0);
  window.PRONTO = true;
})().catch((e) => { window.ERRO = String(e && e.stack || e); console.error(e); });
