/* Legenda palavra por palavra.
 *  *…*   = palavras-chave (limão)
 *  [[…]] = frase que a cena já mostra como texto principal → fica fora da legenda
 *  |     = onde a página troca num trecho longo sem pontuação (limite de oração)
 * O texto (sem as marcas) tem de ser idêntico ao da narração; se não for, erro.
 */
(function () {
  const { h, N } = B;
  const MARCADO = {
    dor: 'Em muita pousada, o *dono faz tudo:* a reserva fica no *caderno* e no *WhatsApp,* o consumo, no *papel.* No check-out, *ninguém sabe* ao certo quanto o hóspede ainda *deve.* E no fim do dia, o *caixa não bate.*',
    virada: 'O *FAZLO Hospeda* junta tudo isso em *um só lugar.* Veja como fica o *dia a dia.*',
    visao: 'Ao abrir o *Hospeda,* você vê o *dia da pousada:* quem está *hospedado,* quem *chega,* quem *sai* e *quanto já entrou,* por *forma de pagamento.*',
    calendario: 'No *calendário,* cada acomodação tem a sua *linha,* e cada *reserva* aparece no *período* dela.',
    duplicada: 'E o Hospeda *não deixa* vender | o mesmo chalé *duas vezes* nas mesmas datas: ele *avisa na hora.*',
    sinal: 'Na reserva, você registra o *sinal,* e o *saldo* que falta já fica *calculado.*',
    cancelamento: 'Se o hóspede *cancelar,* você decide: *reter* o sinal, que fica com a pousada, ou *devolver,* e a saída já é lançada no *caixa.*',
    comanda: 'Durante a estadia, cada *consumo* vai para a *comanda* do hóspede: *o que foi, quantos* e *quanto.*',
    checkout: 'No *check-out,* o *saldo* aparece claro, e a saída só libera com *tudo quitado.*',
    caixa: 'O *caixa* abre com o *dinheiro da gaveta,* e cada recebimento entra no *diário,* com a *forma de pagamento.*',
    fechamento: 'No *fechamento,* você *conta o dinheiro,* e o Hospeda mostra na hora se *sobrou* ou *faltou.*',
    internet: 'E se a *internet cair* no meio de um recebimento, o mesmo pagamento *não é lançado duas vezes.*',
    comeca1: '[[Você não precisa cadastrar nada.]] A *equipe FAZLO* configura a sua pousada: *acomodações, tarifas, produtos da comanda* e *usuários.*',
    comeca2: 'Você recebe o *convite por e-mail,* cria a sua *senha* e *já começa a usar.* E qualquer dúvida, é só *chamar a gente* no *WhatsApp.*',
    teste: '[[São 30 dias grátis para usar o Hospeda na sua pousada. Sem cartão e sem compromisso.]]',
    preco: 'Depois dos *30 dias,* se fizer sentido *para você,* [[a mensalidade é de R$ 99,90 por mês. Sem taxa por reserva e sem fidelidade. E as 10 primeiras pousadas pagam R$ 79,90 por mês durante os primeiros 12 meses.]]',
    chamada: '[[Quer testar 30 dias na sua pousada? É só responder esta mensagem.]]',
  };
  const MAXC = 46;        // caracteres por página (2 linhas)
  const MIN_PAG = 1.5;    // s
  const PAUSA = 0.2;      // s entre palavras que já conta como pausa
  const FICA = 0.75;      // s que a última página do assunto fica depois da fala

  function marcar(a) {
    const out = [];
    let chave = false, fora = false, pend = null;
    for (let w of MARCADO[a.id].split(' ')) {
      if (w === '|') { out[out.length - 1].quebra = true; continue; }
      if (w.startsWith('[[')) { fora = true; w = w.slice(2); }
      if (w.startsWith('*')) { chave = true; w = w.slice(1); }
      let fimChave = false, fimFora = false;
      if (w.endsWith(']]')) { fimFora = true; w = w.slice(0, -2); }
      if (w.endsWith('*')) { fimChave = true; w = w.slice(0, -1); }
      if (w === 'R$') { pend = w; } else {
        out.push({ t: pend ? pend + ' ' + w : w, chave, fora });
        pend = null;
      }
      if (fimChave) chave = false;
      if (fimFora) fora = false;
    }
    if (out.length !== a.tokens.length) throw new Error('legenda ≠ narração em ' + a.id);
    out.forEach((m, i) => {
      if (m.t !== a.tokens[i].t) throw new Error(`legenda ≠ narração em ${a.id}: "${m.t}" vs "${a.tokens[i].t}"`);
      Object.assign(m, { ini: a.tokens[i].ini, fim: a.tokens[i].fim });
    });
    return out;
  }

  const car = (ts) => ts.map((x) => x.t).join(' ').length;
  const pontuado = (t) => /[,.:;?!]$/.test(t.t);

  function paginar(toks) {
    // 1) blocos: a página só troca em pontuação…
    let blocos = [], cur = [];
    toks.forEach((t, i) => {
      cur.push(t);
      if (!toks[i + 1] || pontuado(t) || t.quebra) { blocos.push(cur); cur = []; }
    });
    // 2) …ou, se o trecho sem pontuação não cabe, na maior pausa da fala perto do meio
    //    (nunca logo depois de artigo/preposição, que deixaria a frase pendurada)
    const SOLTAS = /^(o|a|os|as|e|de|do|da|dos|das|no|na|nos|nas|em|um|uma|que|com|por|para|se|ao|é|já|só)$/i;
    const partir = (b) => {
      if (car(b) <= MAXC || b.length < 4) return [b];
      let melhor = -1, nota = -1e9;
      for (let i = 1; i < b.length - 2; i++) {
        const esq = car(b.slice(0, i + 1)), dir = car(b.slice(i + 1));
        if (esq < 12 || dir < 12) continue;
        const gap = b[i + 1].ini - b[i].fim;
        const eq = 1 - Math.abs(esq - dir) / (esq + dir);
        const n = gap * 6 + eq - (SOLTAS.test(b[i].t) ? 2 : 0) - (esq > MAXC || dir > MAXC ? 3 : 0);
        if (n > nota) { nota = n; melhor = i; }
      }
      if (melhor < 0) return [b];
      return [...partir(b.slice(0, melhor + 1)), ...partir(b.slice(melhor + 1))];
    };
    blocos = blocos.flatMap(partir);
    // 3) junta blocos em páginas de até MAXC caracteres
    let pags = [];
    for (const b of blocos) {
      const u = pags[pags.length - 1];
      if (u && car(u.concat(b)) <= MAXC && !/[.?!]$/.test(u[u.length - 1].t) && !u[u.length - 1].quebra) pags[pags.length - 1] = u.concat(b);
      else pags.push(b.slice());
    }
    // 4) página curta demais no tempo: funde com a vizinha
    const dur = (i) => (i < pags.length - 1 ? pags[i + 1][0].ini : pags[i][pags[i].length - 1].fim + FICA) - pags[i][0].ini;
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (let i = 0; i < pags.length; i++) {
        if (dur(i) >= MIN_PAG || pags.length === 1) continue;
        const comAnt = i > 0 ? car(pags[i - 1].concat(pags[i])) : 1e9;
        const comProx = i < pags.length - 1 ? car(pags[i].concat(pags[i + 1])) : 1e9;
        if (comAnt <= comProx) pags.splice(i - 1, 2, pags[i - 1].concat(pags[i]));
        else pags.splice(i, 2, pags[i].concat(pags[i + 1]));
        mudou = true;
        break;
      }
    }
    return pags;
  }

  function montar(raiz) {
    const lista = [];
    N.assuntos.forEach((a, ia) => {
      const marc = marcar(a);
      // trechos contínuos que entram na legenda
      const trechos = [];
      let cur = [];
      marc.forEach((m) => { if (m.fora) { if (cur.length) trechos.push(cur); cur = []; } else cur.push(m); });
      if (cur.length) trechos.push(cur);
      trechos.forEach((tr) => {
        const pags = paginar(tr);
        pags.forEach((pg, ip) => {
          const ini = pg[0].ini - 0.05;
          const ultimo = pg[pg.length - 1];
          const fim = ip < pags.length - 1 ? pags[ip + 1][0].ini - 0.07 : ultimo.fim + FICA;
          lista.push({ assunto: a.id, toks: pg, ini, fim, texto: pg.map((x) => x.t).join(' ') });
        });
      });
    });

    lista.forEach((pg) => {
      const cx = h('div', { class: 'leg-pag' });
      const txt = h('div', { class: 'leg-txt' });
      cx.appendChild(txt);
      raiz.appendChild(cx);
      const pgOb = M.el(cx, { o: 0 });
      M.por(pgOb, pg.ini - 0.02, { o: 1 });
      M.para(pgOb, pg.fim - 0.14, 0.14, { o: 0 }, 'in2');
      pg.toks.forEach((tk, i) => {
        const m = tk.t.match(/^(.*?)([,.:;?!]*)$/);
        const sp = h('span', { class: 'pal' + (tk.chave ? ' ch' : ''), text: m[1] });
        const grupo = h('span', { style: 'display:inline-block;white-space:nowrap' }, [sp]);
        let pt = null;
        if (m[2]) { pt = h('span', { class: 'pal', text: m[2] }); grupo.appendChild(pt); }
        txt.appendChild(grupo);
        if (i < pg.toks.length - 1) txt.appendChild(document.createTextNode(' '));
        for (const e of [sp, pt]) {
          if (!e) continue;
          const ob = M.el(e, { o: 0, y: 12, fluxo: true });
          M.para(ob, tk.ini - 0.03, 0.12, { o: [0, 1] }, 'out2');
          M.para(ob, tk.ini - 0.03, 0.24, { y: [12, 0] }, 'out4');
        }
      });
      // cabe em 2 linhas? senão reduz o corpo desta página
      let fs = 52;
      while (txt.getBoundingClientRect().height > fs * 1.2 * 2 + 4 && fs > 40) { fs -= 2; txt.style.fontSize = fs + 'px'; }
      pg.corpo = fs;
      pg.linhas = Math.round(txt.getBoundingClientRect().height / (fs * 1.2));
    });
    return lista;
  }

  window.Legenda = { montar, MARCADO };
})();
