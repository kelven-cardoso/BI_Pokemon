/* Página Quiz: Quem é esse Pokémon? (silhueta, opções ou digitação, dicas, placar).
   Usa window.PK (comum.js). Não use aspas duplas neste arquivo. */
(function () {
  var K = window.PK, raiz = document.getElementById('app-raiz');
  if (!K || !raiz) { return; }
  var esc = K.esc, TEMPO = 20;
  function $(id) { return document.getElementById(id); }
  function lerRecorde() { try { return +(window.localStorage.getItem('pkQuizRecorde') || 0); } catch (e) { return 0; } }
  function salvarRecorde(v) { try { window.localStorage.setItem('pkQuizRecorde', String(v)); } catch (e) { /* armazenamento indisponível */ } }

  var S = window.__quiz || (window.__quiz = { modo: 'opcoes', gens: [], pontos: 0, seq: 0, recorde: lerRecorde(), acertos: 0, total: 0,
    hist: [], atual: null, opcoes: [], dicas: 0, fase: 'pergunta', resposta: null, inicio: 0, restante: TEMPO, timer: null });

  function pool() {
    return K.LISTA.filter(function (p) { return p.padrao && (!S.gens.length || S.gens.indexOf(p.gen) >= 0); });
  }
  function novaRodada() {
    var lista = pool(); if (!lista.length) { return; }
    var p = K.aleatorio(lista);
    var parecidos = lista.filter(function (x) { return x.id !== p.id && (x.gen === p.gen || x.t[0] === p.t[0]); });
    var outros = K.embaralhar(parecidos.length >= 3 ? parecidos : lista.filter(function (x) { return x.id !== p.id; })).slice(0, 3);
    S.atual = p.id; S.opcoes = K.embaralhar([p.id].concat(outros.map(function (x) { return x.id; })));
    S.dicas = 0; S.fase = 'pergunta'; S.resposta = null; S.inicio = Date.now(); S.restante = TEMPO;
    render(); iniciarTimer();
    var inp = $('qz-input'); if (inp) { inp.focus(); }
  }
  function iniciarTimer() {
    if (S.timer) { clearInterval(S.timer); }
    S.timer = setInterval(function () {
      if (S.fase !== 'pergunta') { clearInterval(S.timer); return; }
      S.restante = Math.max(0, TEMPO - (Date.now() - S.inicio) / 1000);
      var b = $('qz-tempo'); if (b) { b.style.width = (100 * S.restante / TEMPO) + '%'; b.className = 'qz-tempo-f' + (S.restante < 6 ? ' pouco' : ''); }
      var t = $('qz-seg'); if (t) { t.textContent = Math.ceil(S.restante) + 's'; }
      if (S.restante <= 0) { responder(null); }
    }, 100);
  }
  function responder(id) {
    if (S.fase !== 'pergunta') { return; }
    clearInterval(S.timer);
    var certo = id === S.atual;
    S.fase = 'revelado'; S.resposta = id; S.total++;
    if (certo) {
      S.acertos++; S.seq++;
      S.ganho = Math.max(10, 100 + Math.round(S.restante) * 5 - S.dicas * 30) + (S.seq >= 3 ? 25 * Math.min(S.seq - 2, 4) : 0);
      S.pontos += S.ganho;
      if (S.seq > S.recorde) { S.recorde = S.seq; salvarRecorde(S.recorde); }
    } else { S.seq = 0; S.ganho = 0; }
    S.hist.unshift({ id: S.atual, ok: certo }); S.hist = S.hist.slice(0, 12);
    render();
  }
  function letras(nome) {
    return nome.split('').map(function (c, i) { return i === 0 ? c : /[a-zA-Z0-9]/.test(c) ? '_' : c; }).join(' ');
  }
  function dicasHtml(p) {
    var h = [];
    if (S.dicas >= 1 || S.fase !== 'pergunta') { h.push(`<span>Tipo: ${p.t.map(K.chip).join('')}</span>`); }
    if (S.dicas >= 2 || S.fase !== 'pergunta') { h.push(`<span>Geração <b>${p.gen}</b></span>`); }
    if (S.dicas >= 3 && S.fase === 'pergunta') { h.push(`<span class='qz-letras'>${esc(letras(p.nome))}</span>`); }
    return h.join('');
  }
  function palcoHtml() {
    if (!S.atual) {
      return `<div class='qz-ini'><div class='qz-logo'>QUEM É ESSE<br/>POKÉMON?</div>
        <div class='qz-ini-tx'>Descubra o Pokémon pela silhueta. Escolha as gerações e o modo ao lado.</div>
        <div class='bt bt-go' data-acao='comecar'>▶ COMEÇAR</div></div>`;
    }
    var p = K.P[S.atual], rev = S.fase !== 'pergunta', certo = rev && S.resposta === S.atual;
    var corpo;
    if (!rev) {
      if (S.modo === 'opcoes') {
        corpo = `<div class='qz-ops'>${S.opcoes.map(function (id) { return `<div class='qz-op' data-acao='resp' data-id='${id}'>${esc(K.P[id].nome)}</div>`; }).join('')}</div>`;
      } else {
        corpo = `<div class='qz-dig'><input id='qz-input' class='busca' placeholder='Digite o nome e aperte Enter...' autocomplete='off'/>
          <div class='bt bt-gold' data-acao='enviar'>Responder</div></div>`;
      }
      corpo += `<div class='qz-dicas-bt'><div class='bt bt-sec${S.dicas >= 3 ? ' off' : ''}' data-acao='dica'>💡 Dica (${3 - S.dicas}) · −30</div>
        <div class='bt bt-sec' data-acao='pular'>Pular</div></div>`;
    } else {
      var esc1 = S.resposta && S.resposta !== S.atual ? `<span class='qz-errou'>Você respondeu ${esc(K.P[S.resposta] ? K.P[S.resposta].nome : '')}</span>` : S.resposta ? '' : `<span class='qz-errou'>${S.restante <= 0 ? 'Tempo esgotado!' : 'Pulou'}</span>`;
      corpo = `<div class='qz-res ${certo ? 'ok' : 'erro'}'><div class='qz-res-tit'>${certo ? 'ACERTOU! +' + S.ganho : 'NÃO FOI DESSA VEZ'}</div>${esc1}
        <div class='bt bt-go' data-acao='proximo'>PRÓXIMO ▸</div></div>`;
    }
    return `<div class='qz-tit'>QUEM É ESSE POKÉMON?</div>
      <div class='qz-silh${rev ? ' rev' : ''}'>${rev ? `<div class='qz-flash'></div>` : ''}${K.img([K.URL.arte(p.id), K.URL.home(p.id)], 'qz-img')}</div>
      ${rev ? `<div class='qz-nome'>É o <b>${esc(p.nome)}</b>!<span>#${String(p.esp).padStart(3, '0')}</span></div>` : ''}
      <div class='qz-dicas'>${dicasHtml(p)}</div>
      ${rev ? '' : `<div class='qz-tempo'><div id='qz-tempo' class='qz-tempo-f' style='width:${100 * S.restante / TEMPO}%'></div><span id='qz-seg'>${Math.ceil(S.restante)}s</span></div>`}
      ${corpo}`;
  }
  function ladoHtml() {
    var prec = S.total ? Math.round(100 * S.acertos / S.total) : 0;
    var gens = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (g) {
      return `<span class='gc${S.gens.indexOf(g) >= 0 ? ' on' : ''}' data-acao='gen' data-g='${g}'>${g}</span>`;
    }).join('');
    var hist = S.hist.map(function (h) {
      return `<div class='qz-h ${h.ok ? 'ok' : 'erro'}' title='${esc(K.P[h.id].nome)}'><img src='${K.URL.sprite(h.id)}'/><i>${h.ok ? '✓' : '✗'}</i></div>`;
    }).join('');
    return `<div class='qz-placar'>
        <div class='qz-pts'><span>PONTOS</span><b>${S.pontos.toLocaleString('pt-BR')}</b></div>
        <div class='qz-mini'><div><span>SEQUÊNCIA</span><b>${S.seq}${S.seq >= 3 ? ' 🔥' : ''}</b></div><div><span>RECORDE</span><b>${S.recorde}</b></div>
          <div><span>ACERTOS</span><b>${S.acertos}/${S.total}</b></div><div><span>PRECISÃO</span><b>${prec}%</b></div></div></div>
      <div class='qz-cfg'><div class='qz-cfg-tit'>MODO</div>
        <div class='modos'><span class='${S.modo === 'opcoes' ? 'on' : ''}' data-acao='modo' data-m='opcoes'>4 opções</span>
        <span class='${S.modo === 'digitar' ? 'on' : ''}' data-acao='modo' data-m='digitar'>Digitar o nome</span></div>
        <div class='qz-cfg-tit'>GERAÇÕES <em>${S.gens.length ? pool().length + ' Pokémon' : 'todas · ' + pool().length + ' Pokémon'}</em></div>
        <div class='gens qz-gens'>${gens}</div></div>
      <div class='qz-cfg'><div class='qz-cfg-tit'>ÚLTIMAS RESPOSTAS</div><div class='qz-hist'>${hist || `<span class='vazio'>Ainda nada por aqui.</span>`}</div>
        <div class='bt bt-sec qz-zerar' data-acao='zerar'>↺ Zerar placar</div></div>`;
  }
  function render() {
    raiz.innerHTML = `<div class='pk-palco quiz'>
      <div class='topo'><span></span><div class='titulo'><b>QUIZ</b><span>teste seu conhecimento</span></div></div>
      <div class='qz-palco'><div class='qz-raios'></div><div class='qz-conteudo'>${palcoHtml()}</div></div>
      <div class='qz-lado vidro'>${ladoHtml()}</div></div>`;
    K.escala(raiz);
    var inp = $('qz-input');
    if (inp) {
      inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { enviarTexto(); } });
      setTimeout(function () { inp.focus(); }, 30);
    }
  }
  function enviarTexto() {
    var inp = $('qz-input'); if (!inp) { return; }
    var v = K.normalizar(inp.value); if (!v) { return; }
    var p = K.P[S.atual];
    if (v === K.normalizar(p.nome)) { responder(S.atual); return; }
    var outro = K.LISTA.find(function (x) { return x.padrao && K.normalizar(x.nome) === v; });
    responder(outro ? outro.id : -1);
  }
  raiz.onclick = function (ev) {
    var el = ev.target.closest('[data-acao]'); if (!el || el.classList.contains('off')) { return; }
    switch (el.getAttribute('data-acao')) {
      case 'comecar': case 'proximo': novaRodada(); break;
      case 'resp': responder(+el.getAttribute('data-id')); break;
      case 'enviar': enviarTexto(); break;
      case 'dica': S.dicas = Math.min(3, S.dicas + 1); render(); break;
      case 'pular': responder(null); break;
      case 'modo': S.modo = el.getAttribute('data-m'); if (S.fase === 'pergunta' && S.atual) { render(); } else { render(); } break;
      case 'gen':
        var g = +el.getAttribute('data-g'), i = S.gens.indexOf(g);
        if (i >= 0) { S.gens.splice(i, 1); } else { S.gens.push(g); }
        render(); break;
      case 'zerar': S.pontos = 0; S.seq = 0; S.acertos = 0; S.total = 0; S.hist = []; render(); break;
    }
  };
  if (!window.__quizResize) { window.__quizResize = true; window.addEventListener('resize', function () { K.escala(raiz); }); }
  render();
  if (S.fase === 'pergunta' && S.atual) { iniciarTimer(); }
})();
