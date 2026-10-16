/* Página Safari: ande pelo mato, encontre Pokémon selvagens e capture com Pokébolas.
   Mapa em pixel art desenhado no canvas (sem tileset externo). Usa window.PK (comum.js).
   O estado fica em window.__safari. Não use aspas duplas neste arquivo. */
(function () {
  var K = window.PK, raiz = document.getElementById('app-raiz');
  if (!K || !raiz) { return; }
  var esc = K.esc, TL = 32, COLS = 30, LINS = 20, SHINY = 50;

  /* ================= MAPA ================= */
  /* t árvore · . grama · m mato alto · c caminho · a água · r pedra · f flores · H centro · D porta · p placa */
  var MAPA = [
    'tttttttttttttttttttttttttttttt',
    't....mmmmm....cc....mmmmmmm..t',
    't..mmmmmmmm...cc...mmmmmmmmm.t',
    't..mmmmmmmm...cc...mmmmmmmmm.t',
    't...mmmmmm..f.cc.f..mmmmmmm..t',
    't.ff.........ccc.........ff..t',
    't.ff..HHHH....cc..raaaaar....t',
    't.....HHHH....cc..aaaaaaa..mmt',
    't.....HHDH....cc..aaaaaaa..mmt',
    't.......cc....cc..raaaaar..mmt',
    'tcccccccccccccccccccccccccccct',
    't.....mmmmm...cc....f..mmmmm.t',
    't..mmmmmmmmm..cc...ff.mmmmmmmt',
    't..mmmmmmmmm..cc.......mmmmmmt',
    't..mmmmmmmmm..cc..p....mmmmmmt',
    't...mmmmmmm...cc.......mmmmm.t',
    't.r...........cc..ttt.......ft',
    't..ff..mmmm...cc..ttt..mmm..ft',
    't..ff..mmmm...cc.......mmm...t',
    'tttttttttttttttttttttttttttttt'
  ].map(function (l) { return (l + '..............................').slice(0, COLS).split(''); });
  function tile(x, y) { return (MAPA[y] || [])[x] || 't'; }
  function bloqueia(c) { return 'tarHp'.indexOf(c) >= 0; }
  function ruido(x, y, k) { var n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); }

  /* ================= ESTADO ================= */
  var S = window.__safari;
  if (!S) {
    S = window.__safari = { x: 14, y: 10, dir: 'baixo', passo: 0, anda: null, gen: 0, msg: 'Clique no mapa e use as setas (ou WASD) para andar. O mato alto esconde Pokémon!',
      bolsa: { poke: 10, grande: 5, ultra: 3, fruta: 3 }, caixa: [], enc: 0, fugas: 0, shinies: 0, luta: null, tecla: null };
  }
  function $(id) { return document.getElementById(id); }
  var BOLAS = { poke: { nome: 'Pokébola', mult: 1, cor: '#E3350D' }, grande: { nome: 'Grande Bola', mult: 1.5, cor: '#2E6FE8' }, ultra: { nome: 'Ultra Bola', mult: 2, cor: '#F2C21B' } };

  /* ================= DESENHO ================= */
  function px(c, x, y, w, h, cor) { c.fillStyle = cor; c.fillRect(x, y, w, h); }
  function desenharGrama(c, X, Y, x, y) {
    px(c, X, Y, TL, TL, '#7CC855');
    for (var i = 0; i < 5; i++) { px(c, X + Math.floor(ruido(x, y, i) * 28), Y + Math.floor(ruido(y, x, i) * 28), 3, 2, i % 2 ? '#6AB447' : '#93D86B'); }
  }
  function desenharTile(c, x, y, t) {
    var X = x * TL, Y = y * TL, ch = tile(x, y), i;
    if (ch === 'c' || ch === 'D') {
      px(c, X, Y, TL, TL, '#E8D29A');
      for (i = 0; i < 4; i++) { px(c, X + Math.floor(ruido(x, y, i) * 28), Y + Math.floor(ruido(y, x, i + 3) * 28), 3, 3, '#D4BC80'); }
      if (ch === 'D') { px(c, X + 6, Y, 20, 24, '#4A3220'); px(c, X + 8, Y + 2, 16, 22, '#7A5634'); px(c, X + 20, Y + 12, 2, 2, '#F2C21B'); }
      return;
    }
    desenharGrama(c, X, Y, x, y);
    if (ch === 'm') {
      px(c, X, Y + 6, TL, TL - 6, '#3E9A3A');
      for (i = 0; i < 4; i++) {
        var bx = X + i * 8;
        c.fillStyle = '#2C7A2C'; c.beginPath(); c.moveTo(bx, Y + 32); c.lineTo(bx + 4, Y + 6); c.lineTo(bx + 8, Y + 32); c.fill();
        c.fillStyle = '#56B84F'; c.beginPath(); c.moveTo(bx + 2, Y + 32); c.lineTo(bx + 4, Y + 12); c.lineTo(bx + 6, Y + 32); c.fill();
      }
    } else if (ch === 't') {
      px(c, X + 13, Y + 20, 6, 12, '#6B4423');
      c.fillStyle = '#1F6B33'; c.beginPath(); c.arc(X + 16, Y + 14, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2E8B47'; c.beginPath(); c.arc(X + 12, Y + 10, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#48A85F'; c.beginPath(); c.arc(X + 10, Y + 8, 3, 0, Math.PI * 2); c.fill();
    } else if (ch === 'a') {
      px(c, X, Y, TL, TL, '#4C8BE0');
      var o = Math.floor((t / 220 + x + y) % 4) * 2;
      px(c, X + 4 + o, Y + 8, 10, 2, '#9CC6F5'); px(c, X + 16 - o, Y + 22, 10, 2, '#9CC6F5');
    } else if (ch === 'r') {
      c.fillStyle = '#8A8F99'; c.beginPath(); c.ellipse(X + 16, Y + 20, 13, 10, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#B4BAC4'; c.beginPath(); c.ellipse(X + 12, Y + 16, 6, 4, 0, 0, Math.PI * 2); c.fill();
    } else if (ch === 'f') {
      var dx = Math.floor((t / 400 + x) % 2);
      [[6, 8, '#F24B6A'], [20, 6, '#FFD23F'], [12, 20, '#FFFFFF'], [24, 22, '#F24B6A']].forEach(function (f) {
        px(c, X + f[0] + dx, Y + f[1], 5, 5, f[2]); px(c, X + f[0] + 1 + dx, Y + f[1] + 1, 3, 3, '#FFF6C2');
      });
    } else if (ch === 'p') {
      px(c, X + 14, Y + 16, 4, 14, '#6B4423'); px(c, X + 5, Y + 6, 22, 13, '#8A5A2B'); px(c, X + 7, Y + 8, 18, 9, '#C08A50');
    }
  }
  function desenharCentro(c) {
    var X = 6 * TL, Y = 6 * TL;
    px(c, X, Y + 28, 128, 68, '#F4F1EA'); px(c, X, Y + 90, 128, 6, '#C9C2B4');
    px(c, X - 4, Y, 136, 32, '#E3350D'); px(c, X - 4, Y + 26, 136, 6, '#A6240A');
    px(c, X + 52, Y + 4, 24, 20, '#FFFFFF'); px(c, X + 61, Y + 6, 6, 16, '#E3350D'); px(c, X + 55, Y + 11, 18, 6, '#E3350D');
    px(c, X + 10, Y + 44, 26, 18, '#7FC4F0'); px(c, X + 92, Y + 44, 26, 18, '#7FC4F0');
    c.fillStyle = '#11151D'; c.font = 'bold 9px Segoe UI'; c.fillText('POKÉMON CENTER', X + 22, Y + 78);
  }
  function desenharTreinador(c, X, Y, dir, quadro) {
    var perna = quadro % 2 ? 2 : -2;
    px(c, X + 9, Y + 26, 6, 4, '#2B2F3A'); px(c, X + 17, Y + 26, 6, 4, '#2B2F3A');
    if (quadro) { px(c, X + 9, Y + 22 + perna, 6, 6, '#3B4252'); px(c, X + 17, Y + 22 - perna, 6, 6, '#3B4252'); }
    else { px(c, X + 9, Y + 22, 6, 6, '#3B4252'); px(c, X + 17, Y + 22, 6, 6, '#3B4252'); }
    px(c, X + 8, Y + 13, 16, 10, '#2E6FE8'); px(c, X + 8, Y + 13, 16, 3, '#1E4FB0');
    px(c, X + 5, Y + 14, 4, 7, '#F2C9A0'); px(c, X + 23, Y + 14, 4, 7, '#F2C9A0');
    px(c, X + 9, Y + 4, 14, 10, '#F2C9A0');
    px(c, X + 8, Y + 1, 16, 6, '#E3350D'); px(c, X + 8, Y + 6, 16, 2, '#FFFFFF');
    if (dir === 'baixo') { px(c, X + 12, Y + 9, 2, 3, '#11151D'); px(c, X + 18, Y + 9, 2, 3, '#11151D'); px(c, X + 6, Y + 6, 20, 2, '#B4280A'); }
    else if (dir === 'cima') { px(c, X + 9, Y + 6, 14, 8, '#3A2416'); }
    else if (dir === 'esq') { px(c, X + 10, Y + 9, 2, 3, '#11151D'); px(c, X + 4, Y + 6, 8, 2, '#B4280A'); px(c, X + 18, Y + 6, 5, 7, '#3A2416'); }
    else { px(c, X + 20, Y + 9, 2, 3, '#11151D'); px(c, X + 20, Y + 6, 8, 2, '#B4280A'); px(c, X + 9, Y + 6, 5, 7, '#3A2416'); }
  }
  var fundo = null;
  function preRender() {
    if (fundo || !document.createElement) { return; }
    fundo = document.createElement('canvas'); fundo.width = COLS * TL; fundo.height = LINS * TL;
    var c = fundo.getContext && fundo.getContext('2d'); if (!c) { fundo = null; return; }
    for (var y = 0; y < LINS; y++) { for (var x = 0; x < COLS; x++) { if ('af'.indexOf(tile(x, y)) < 0) { desenharTile(c, x, y, 0); } } }
    desenharCentro(c);
  }
  function quadro(t) {
    var cv = $('sf-canvas'); if (!cv || !cv.getContext) { return; }
    var c = cv.getContext('2d'); if (!c) { return; }
    preRender(); if (fundo) { c.drawImage(fundo, 0, 0); }
    for (var y = 0; y < LINS; y++) { for (var x = 0; x < COLS; x++) { if ('af'.indexOf(tile(x, y)) >= 0) { desenharTile(c, x, y, t); } } }
    var X = S.x * TL, Y = S.y * TL, q = 0;
    if (S.anda) {
      var p = Math.min(1, (t - S.anda.t0) / 150);
      X = (S.anda.x0 + (S.x - S.anda.x0) * p) * TL; Y = (S.anda.y0 + (S.y - S.anda.y0) * p) * TL;
      q = p < 1 ? 1 + (S.passo % 2) : 0;
      if (p >= 1) { var fim = S.anda; S.anda = null; chegou(fim); }
    }
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(X + 16, Y + 29, 10, 4, 0, 0, Math.PI * 2); c.fill();
    desenharTreinador(c, X, Y - 2, S.dir, q);
    if (tile(S.x, S.y) === 'm' && !S.anda) {
      for (var i = 0; i < 4; i++) {
        var bx = S.x * TL + i * 8;
        c.fillStyle = '#2C7A2C'; c.beginPath(); c.moveTo(bx, Y + 32); c.lineTo(bx + 4, Y + 18); c.lineTo(bx + 8, Y + 32); c.fill();
      }
    }
  }
  function laco(t) {
    quadro(t || 0);
    if (S.tecla && !S.anda && !S.luta) { mover(S.tecla); }
    if (window.requestAnimationFrame) { window.__safariLaco = window.requestAnimationFrame(laco); }
  }

  /* ================= MOVIMENTO ================= */
  var DIRS = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };
  function mover(d) {
    if (S.anda || S.luta) { return; }
    S.dir = d;
    var nx = S.x + DIRS[d][0], ny = S.y + DIRS[d][1], ch = tile(nx, ny);
    if (ch === 'p') { mensagem('📜 <b>Zona Safari</b> · Mato alto = Pokémon selvagens · Centro Pokémon reabastece a mochila · Shiny: 1 em ' + SHINY + '!'); return; }
    if (ch === 'H') { return; }
    if (bloqueia(ch)) { return; }
    S.anda = { x0: S.x, y0: S.y, t0: (window.performance ? performance.now() : 0) };
    S.x = nx; S.y = ny; S.passo++;
  }
  function chegou() {
    var ch = tile(S.x, S.y);
    if (ch === 'D') {
      S.bolsa = { poke: 10, grande: 5, ultra: 3, fruta: 3 };
      mensagem('🏥 Bem-vindo ao <b>Centro Pokémon</b>! Sua mochila foi reabastecida.');
      S.x = 8; S.y = 9; S.dir = 'baixo'; atualizarLado();
      return;
    }
    if (ch === 'm' && Math.random() < 0.13) { encontro(); }
  }

  /* ================= ENCONTRO / CAPTURA ================= */
  function sortearPokemon() {
    var lista = K.LISTA.filter(function (p) { return p.padrao && (!S.gen || p.gen === S.gen); });
    var pesos = lista.map(function (p) { return p.total >= 580 ? 0.06 : p.total > 500 ? 0.3 : p.total > 400 ? 0.7 : 1; });
    var soma = pesos.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * soma;
    for (var i = 0; i < lista.length; i++) { r -= pesos[i]; if (r <= 0) { return lista[i]; } }
    return lista[lista.length - 1];
  }
  function taxaCaptura(p) { return p.total >= 580 ? 3 : Math.max(10, Math.min(255, Math.round(255 - (p.total - 200) * 0.62))); }
  function encontro() {
    var p = sortearPokemon(), shiny = Math.random() < 1 / SHINY;
    S.enc++; S.tecla = null;
    if (shiny) { S.shinies++; }
    S.luta = { id: p.id, shiny: shiny, nivel: 3 + Math.floor(Math.random() * 45), fruta: false, fase: 'transicao', tentativas: 0 };
    render();
    setTimeout(function () { if (S.luta) { S.luta.fase = 'menu'; S.luta.texto = `Um <b>${esc(p.nome)}</b> selvagem apareceu!${shiny ? ' <span class=sf-sh>✨ É SHINY!</span>' : ''}`; render(); } }, 1100);
  }
  function chanceCaptura(L, bola) {
    var a = taxaCaptura(K.P[L.id]) * BOLAS[bola].mult * (L.fruta ? 1.5 : 1) * 2 / 3; /* bônus do Safari: como se estivesse com ~1/3 do HP */
    if (a >= 255) { return 1; }
    var b = 1048560 / Math.sqrt(Math.sqrt(16711680 / a));
    return Math.pow(b / 65536, 4);
  }
  function balancadas(L, bola) {
    var a = taxaCaptura(K.P[L.id]) * BOLAS[bola].mult * (L.fruta ? 1.5 : 1) * 2 / 3; /* bônus do Safari: como se estivesse com ~1/3 do HP */
    if (a >= 255) { return 4; }
    var b = 1048560 / Math.sqrt(Math.sqrt(16711680 / a)), n = 0;
    while (n < 4 && Math.random() * 65536 < b) { n++; }
    return n;
  }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function arremessar(bola) {
    var L = S.luta; if (!L || L.fase !== 'menu' || S.bolsa[bola] <= 0) { return; }
    S.bolsa[bola]--; L.tentativas++; L.fase = 'animando'; L.bola = bola;
    var p = K.P[L.id], n = balancadas(L, bola);
    L.texto = `Você jogou uma <b>${BOLAS[bola].nome}</b>!`; render();
    var cena = $('sf-cena'), mon = $('sf-mon');
    if (cena) {
      var b = document.createElement('div'); b.className = 'sf-bola voa'; b.style.setProperty('--c', BOLAS[bola].cor); b.id = 'sf-bola';
      cena.appendChild(b);
    }
    await esperar(650);
    if (mon) { mon.classList.add('suga'); }
    await esperar(550);
    var bolaEl = $('sf-bola'); if (bolaEl) { bolaEl.className = 'sf-bola parada'; }
    await esperar(400);
    for (var i = 0; i < Math.min(n, 3); i++) {
      if (bolaEl) { bolaEl.classList.remove('balanca'); void bolaEl.offsetWidth; bolaEl.classList.add('balanca'); }
      L.texto = ['...', '... ...', '... ... ...'][i]; atualizarTexto();
      await esperar(750);
    }
    if (n >= 4) {
      if (bolaEl) { bolaEl.classList.add('pegou'); }
      if (cena) { for (var k = 0; k < 8; k++) { var e = document.createElement('i'); e.className = 'sf-estrela'; e.style.setProperty('--a', (k * 45) + 'deg'); cena.appendChild(e); } }
      S.caixa.unshift({ id: L.id, shiny: L.shiny, nivel: L.nivel, bola: bola });
      L.fase = 'fim'; L.texto = `Gotcha! <b>${esc(p.nome)}</b> foi capturado!${L.shiny ? ' ✨' : ''}`; atualizarTexto(); atualizarLado();
      await esperar(1800); S.luta = null; mensagem(`Você capturou <b>${esc(p.nome)}</b>! Ele foi para a sua caixa.`); render();
      return;
    }
    if (bolaEl) { bolaEl.classList.add('abre'); }
    if (mon) { mon.classList.remove('suga'); mon.classList.add('escapa'); }
    L.texto = ['Ah não! O Pokémon escapou!', 'Argh! Quase!', 'Puxa! Parecia que tinha pegado!', 'Droga! Foi por pouco!'][Math.min(n, 3)];
    L.fruta = false; atualizarTexto();
    await esperar(900);
    if (bolaEl) { bolaEl.remove(); }
    var foge = 0.05 + p.b.spe / 600 + L.tentativas * 0.03;
    if (Math.random() < foge) {
      S.fugas++; L.fase = 'fim'; L.texto = `O <b>${esc(p.nome)}</b> selvagem fugiu!`; atualizarTexto();
      if (mon) { mon.classList.add('foge'); }
      await esperar(1300); S.luta = null; mensagem(`O ${esc(p.nome)} fugiu... continue procurando no mato!`); render();
      return;
    }
    L.fase = 'menu'; L.texto = `O que você vai fazer?`; render();
  }
  function usarFruta() {
    var L = S.luta; if (!L || L.fase !== 'menu' || S.bolsa.fruta <= 0 || L.fruta) { return; }
    S.bolsa.fruta--; L.fruta = true; L.texto = `Você jogou uma <b>Fruta Frambo</b>! O ${esc(K.P[L.id].nome)} está mais calmo.`; render();
  }
  function fugir() { if (!S.luta || S.luta.fase !== 'menu') { return; } S.luta = null; mensagem('Você fugiu em segurança.'); render(); }

  /* ================= UI ================= */
  function mensagem(txt) { S.msg = txt; var m = $('sf-msg'); if (m) { m.innerHTML = txt; } }
  function atualizarTexto() { var t = $('sf-texto'); if (t && S.luta) { t.innerHTML = S.luta.texto || ''; } }
  function lutaHtml() {
    var L = S.luta; if (!L) { return ''; }
    if (L.fase === 'transicao') { return `<div class='sf-trans'><i></i><i></i></div>`; }
    var p = K.P[L.id], gif = L.shiny ? K.URL.gif(p.id).replace('/showdown/', '/showdown/shiny/') : K.URL.gif(p.id);
    var home = L.shiny ? K.URL.home(p.id).replace('/home/', '/home/shiny/') : K.URL.home(p.id);
    var chance = Math.round(100 * chanceCaptura(L, 'poke'));
    var menu = L.fase === 'menu' ? `<div class='sf-menu'>
        ${['poke', 'grande', 'ultra'].map(function (b) { return `<div class='sf-op${S.bolsa[b] ? '' : ' off'}' data-acao='bola' data-b='${b}'><i class='sf-mini' style='--c:${BOLAS[b].cor}'></i>${BOLAS[b].nome}<em>×${S.bolsa[b]}</em><small>${Math.round(100 * chanceCaptura(L, b))}%</small></div>`; }).join('')}
        <div class='sf-op${S.bolsa.fruta && !L.fruta ? '' : ' off'}' data-acao='fruta'>🍓 Fruta Frambo<em>×${S.bolsa.fruta}</em><small>+50%</small></div>
        <div class='sf-op fugir' data-acao='fugir'>🏃 Fugir</div></div>` : '';
    return `<div class='sf-luta' id='sf-cena' style='--c:${K.corTipo(p.t[0])}'>
      <div class='sf-ceu'></div><div class='sf-chao'></div>
      <div class='sf-hud'><b>${esc(p.nome)}${L.shiny ? ' <span class=sf-sh>✨</span>' : ''}</b><span>Nv. ${L.nivel}</span><div>${p.t.map(K.chip).join('')}</div>
        <div class='sf-chance'>Chance com Pokébola: <b>${chance}%</b>${L.fruta ? ' · 🍓 calmo' : ''}</div></div>
      <div class='sf-plat'></div>
      <div class='sf-mon${L.shiny ? ' shiny' : ''}' id='sf-mon'>${K.img([gif, home, K.URL.arte(p.id)])}${L.shiny ? `<div class='sf-brilho'><i></i><i></i><i></i><i></i></div>` : ''}</div>
      <div class='sf-txt'><span id='sf-texto'>${L.texto || ''}</span></div>${menu}</div>`;
  }
  function ladoHtml() {
    var bolsa = ['poke', 'grande', 'ultra'].map(function (b) {
      return `<div class='sf-item'><i class='sf-mini' style='--c:${BOLAS[b].cor}'></i><span>${BOLAS[b].nome}</span><b>×${S.bolsa[b]}</b></div>`;
    }).join('') + `<div class='sf-item'><i>🍓</i><span>Fruta Frambo</span><b>×${S.bolsa.fruta}</b></div>`;
    var caixa = S.caixa.map(function (c) {
      var p = K.P[c.id], src = c.shiny ? K.URL.sprite(c.id).replace('/pokemon/', '/pokemon/shiny/') : K.URL.sprite(c.id);
      return `<div class='sf-cx${c.shiny ? ' sh' : ''}' title='${esc(p.nome)} · Nv. ${c.nivel}'><img src='${src}'/><i class='sf-mini' style='--c:${BOLAS[c.bola].cor}'></i>${c.shiny ? '<em>✨</em>' : ''}</div>`;
    }).join('');
    var gens = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (g) { return `<span class='gc${S.gen === g ? ' on' : ''}' data-acao='gen' data-g='${g}'>${g || 'Todas'}</span>`; }).join('');
    return `<div class='sf-sec'>REGIÃO DO MATO <em>gerações dos Pokémon</em></div><div class='gens sf-gens'>${gens}</div>
      <div class='sf-sec'>MOCHILA</div><div class='sf-bolsa'>${bolsa}</div>
      <div class='sf-stats'><div><span>ENCONTROS</span><b>${S.enc}</b></div><div><span>CAPTURAS</span><b>${S.caixa.length}</b></div><div><span>SHINY</span><b>${S.shinies}</b></div><div><span>FUGAS</span><b>${S.fugas}</b></div></div>
      <div class='sf-sec'>SUA CAIXA <em>${S.caixa.length} Pokémon</em></div><div class='sf-caixa'>${caixa || `<span class='vazio'>Capture Pokémon no mato alto!</span>`}</div>
      <div class='sf-pad'><div></div><div class='sf-tc' data-tecla='cima'>▲</div><div></div><div class='sf-tc' data-tecla='esq'>◀</div><div class='sf-tc' data-tecla='baixo'>▼</div><div class='sf-tc' data-tecla='dir'>▶</div></div>`;
  }
  function atualizarLado() { var l = $('sf-lado'); if (l) { l.innerHTML = ladoHtml(); } }
  function render() {
    raiz.innerHTML = `<div class='pk-palco safari'>
      <div class='topo'><span class='sf-dica'>⌨ setas / WASD · ou use o direcional ao lado</span><div class='titulo'><b>SAFARI</b><span>ande pelo mato e capture</span></div></div>
      <div class='sf-jogo' id='sf-jogo' tabindex='0'><canvas id='sf-canvas' width='${COLS * TL}' height='${LINS * TL}'></canvas>
        <div class='sf-msg' id='sf-msg'>${S.msg}</div>${lutaHtml()}</div>
      <div class='sf-lado vidro' id='sf-lado'>${ladoHtml()}</div></div>`;
    K.escala(raiz);
    quadro(0);
  }

  /* ================= ENTRADA ================= */
  var TECLAS = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esq', ArrowRight: 'dir', w: 'cima', s: 'baixo', a: 'esq', d: 'dir', W: 'cima', S: 'baixo', A: 'esq', D: 'dir' };
  if (!window.__safariTeclas) {
    window.__safariTeclas = true;
    window.addEventListener('keydown', function (ev) {
      var s = window.__safari; if (!s) { return; }
      var d = TECLAS[ev.key]; if (d) { s.tecla = d; ev.preventDefault(); }
    });
    window.addEventListener('keyup', function (ev) { var s = window.__safari; if (s && TECLAS[ev.key] === s.tecla) { s.tecla = null; } });
    window.addEventListener('resize', function () { K.escala(raiz); });
  }
  raiz.onmousedown = function (ev) {
    var tc = ev.target.closest('[data-tecla]'); if (tc) { S.tecla = tc.getAttribute('data-tecla'); ev.preventDefault(); }
    var jogo = $('sf-jogo'); if (jogo && jogo.focus && ev.target.closest('#sf-jogo')) { jogo.focus(); }
  };
  raiz.onmouseup = function () { S.tecla = null; };
  raiz.onmouseleave = function () { S.tecla = null; };
  raiz.onclick = function (ev) {
    var el = ev.target.closest('[data-acao]'); if (!el || el.classList.contains('off')) { return; }
    switch (el.getAttribute('data-acao')) {
      case 'bola': arremessar(el.getAttribute('data-b')); break;
      case 'fruta': usarFruta(); break;
      case 'fugir': fugir(); break;
      case 'gen': S.gen = +el.getAttribute('data-g'); atualizarLado(); break;
    }
  };

  window.__safariApi = { chanceCaptura: chanceCaptura, taxaCaptura: taxaCaptura, sortearPokemon: sortearPokemon, mover: mover, tile: tile };
  if (window.__safariLaco && window.cancelAnimationFrame) { window.cancelAnimationFrame(window.__safariLaco); }
  if (S.luta && S.luta.fase !== 'menu') { S.luta.fase = 'menu'; S.luta.texto = 'O que você vai fazer?'; }
  render();
  laco(0);
})();
