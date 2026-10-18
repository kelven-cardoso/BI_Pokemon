/* Página Safari: ande pelo mato, encontre Pokémon selvagens e capture com Pokébolas.
   Mapa em pixel art estilo GBA desenhado no canvas (sem tileset externo). Usa window.PK (comum.js).
   Regras de teste: shiny 1 em 8 (no máximo 2 por sessão) e lendário ~5% (no máximo 1).
   O estado fica em window.__safari. Não use aspas duplas neste arquivo. */
(function () {
  var K = window.PK, raiz = document.getElementById('app-raiz');
  if (!K || !raiz) { return; }
  var esc = K.esc, TL = 32, COLS = 30, LINS = 20;
  var SHINY = 8, MAX_SHINY = 2, LENDARIO = 0.05, MAX_LENDARIO = 1;
  /* depois de 2 capturas as chances sobem (para a pessoa encontrar), mantendo os limites */
  var TURBO_APOS = 2, LENDARIO_TURBO = 0.7, SHINY_TURBO = 0.8, SHINY_LENDARIO_TURBO = 0.5;
  function turbo() { return S.caixa.length >= TURBO_APOS; }

  /* ================= MAPA ================= */
  /* t árvore · . grama · m mato alto · c caminho · a água · r pedra · f flores · H centro · D porta · p placa · x cerca */
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
  function bloqueia(c) { return 'tarHpx'.indexOf(c) >= 0; }
  function ruido(x, y, k) { var n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); }

  /* ================= ESTADO ================= */
  var S = window.__safari;
  if (!S || !S.v2) {
    S = window.__safari = { v2: true, x: 14, y: 10, dir: 'baixo', passo: 0, anda: null, gen: 0, folhas: null,
      msg: 'Clique no mapa e use as setas (ou WASD) para andar. O mato alto esconde Pokémon!',
      bolsa: { poke: 10, grande: 5, ultra: 3, fruta: 3 }, caixa: [], vistos: {}, enc: 0, fugas: 0, shinies: 0, lendarios: 0, luta: null, tecla: null };
  }
  function $(id) { return document.getElementById(id); }
  var BOLAS = { poke: { nome: 'Pokébola', mult: 1, cor: '#E3350D' }, grande: { nome: 'Grande Bola', mult: 1.5, cor: '#2E6FE8' }, ultra: { nome: 'Ultra Bola', mult: 2, cor: '#F2C21B' } };

  /* ================= PIXEL ART ================= */
  function px(c, x, y, w, h, cor) { c.fillStyle = cor; c.fillRect(x, y, w, h); }
  function circulo(c, x, y, r, cor) { c.fillStyle = cor; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  function elipse(c, x, y, rx, ry, cor) { c.fillStyle = cor; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
  var COR = { k: '#1F2028', r: '#E8383D', R: '#A51D22', w: '#F8F8F8', s: '#F8C898', h: '#5A3418', b: '#3A78E0', B: '#2650A8', g: '#3C4458', y: '#F8D030' };
  var TREINADOR = {
    baixo: ['....kkkkkkk.....', '...krrrrrrrk....', '..krrwwrrrrrk...', '..krrrrrrrrrk...', '.kRRRRRRRRRRRk..', '..khsssssssshk..',
      '..ksskssssksk...', '..kssssssssssk..', '...ksssssssk....', '..kbbwbbbbwbbk..', '.ksbbwbbbbwbbsk.', '.ksbbbbbbbbbbsk.',
      '..kBBBBBBBBBBk..', '...kggggggggk...', '...kggk..kggk...', '...kkkk..kkkk...'],
    cima: ['....kkkkkkk.....', '...krrrrrrrk....', '..krrrrrrrrrk...', '..krrrrrrrrrk...', '.kRRRRRRRRRRRk..', '..khhhhhhhhhhk..',
      '..khhhhhhhhhhk..', '..kshhhhhhhhsk..', '...ksssssssk....', '..kbbbbbbbbbbk..', '.ksbbyybbyybbsk.', '.ksbbbbbbbbbbsk.',
      '..kBBBBBBBBBBk..', '...kggggggggk...', '...kggk..kggk...', '...kkkk..kkkk...'],
    esq: ['....kkkkkkk.....', '...krrrrrrrk....', '..krrwwrrrrrk...', '..krrrrrrrrrk...', '.kRRRRRRRRk.....', '..khhsssssssk....',
      '..khssskssssk...', '..khsssssssssk..', '...ksssssssk....', '...kbbbbbbbk....', '..kbbsbbbbbbk...', '..kbbsbbbbbbk...',
      '...kBBBBBBBk....', '...kggggggk.....', '...kggkkggk.....', '...kkkk.kkk.....']
  };
  TREINADOR.dir = TREINADOR.esq.map(function (l) { return l.split('').reverse().join(''); });
  function desenharTreinador(c, X, Y, dir, quadro, escala) {
    var mapa = TREINADOR[dir], e = escala || 2, sobe = quadro ? -e : 0;
    for (var y = 0; y < 16; y++) {
      var linha = mapa[y];
      if (quadro && y >= 14) { linha = quadro === 1 ? (y === 14 ? '...kggk...kgk...' : '...kkkk...kk....') : (y === 14 ? '....kgk..kggk...' : '....kk...kkkk...'); }
      for (var x = 0; x < 16; x++) { var ch = linha.charAt(x); if (ch !== '.' && COR[ch]) { px(c, X + x * e, Y + y * e + (y < 14 ? sobe : 0), e, e, COR[ch]); } }
    }
  }
  function tufo(c, x, y, cor) { px(c, x, y, 1, 3, cor); px(c, x + 2, y - 1, 1, 4, cor); px(c, x + 4, y, 1, 3, cor); }
  function desenharGrama(c, X, Y, x, y) {
    px(c, X, Y, TL, TL, '#8CCF68');
    for (var i = 0; i < 3; i++) { tufo(c, X + 3 + Math.floor(ruido(x, y, i) * 22), Y + 6 + Math.floor(ruido(y, x, i) * 20), i % 2 ? '#6DB44A' : '#74BC50'); }
    if (ruido(x, y, 9) > 0.6) { px(c, X + Math.floor(ruido(x, y, 5) * 26), Y + Math.floor(ruido(y, x, 6) * 26), 2, 2, '#B2E28E'); }
  }
  function desenharTile(c, x, y, t) {
    var X = x * TL, Y = y * TL, ch = tile(x, y), i;
    if (ch === 'c' || ch === 'D') {
      px(c, X, Y, TL, TL, '#ECD7A2');
      for (i = 0; i < 5; i++) { px(c, X + 2 + Math.floor(ruido(x, y, i) * 26), Y + 2 + Math.floor(ruido(y, x, i + 3) * 26), 2, 2, i % 2 ? '#D9BE86' : '#F6E6BC'); }
      var viz = [[0, -1, X, Y, TL, 2], [0, 1, X, Y + TL - 2, TL, 2], [-1, 0, X, Y, 2, TL], [1, 0, X + TL - 2, Y, 2, TL]];
      viz.forEach(function (v) { var n = tile(x + v[0], y + v[1]); if (n !== 'c' && n !== 'D' && n !== 'H') { px(c, v[2], v[3], v[4], v[5], '#CDAE74'); } });
      return;
    }
    desenharGrama(c, X, Y, x, y);
    if (ch === 'm') {
      px(c, X, Y + 10, TL, TL - 10, '#3F9A3A');
      for (i = 0; i < 5; i++) {
        var bx = X - 2 + i * 7;
        c.fillStyle = '#2B6E2B'; c.beginPath(); c.moveTo(bx, Y + 22); c.lineTo(bx + 4, Y + 4); c.lineTo(bx + 8, Y + 22); c.fill();
      }
      for (i = 0; i < 4; i++) {
        var fx = X + i * 8;
        c.fillStyle = '#1E5A1E'; c.beginPath(); c.moveTo(fx - 1, Y + 32); c.lineTo(fx + 4, Y + 10); c.lineTo(fx + 9, Y + 32); c.fill();
        c.fillStyle = '#4FB548'; c.beginPath(); c.moveTo(fx + 1, Y + 32); c.lineTo(fx + 4, Y + 13); c.lineTo(fx + 7, Y + 32); c.fill();
        px(c, fx + 3, Y + 16, 2, 6, '#7FD46F');
      }
    } else if (ch === 't') {
      elipse(c, X + 16, Y + 29, 13, 4, 'rgba(0,0,0,.22)');
      px(c, X + 12, Y + 19, 8, 12, '#1F2028'); px(c, X + 13, Y + 19, 6, 11, '#7A4A22'); px(c, X + 14, Y + 20, 2, 9, '#9C6232');
      circulo(c, X + 16, Y + 13, 15, '#163F1A'); circulo(c, X + 16, Y + 13, 13.5, '#2E7D32');
      circulo(c, X + 11, Y + 10, 7, '#3E9A44'); circulo(c, X + 20, Y + 15, 6, '#38913E');
      circulo(c, X + 9, Y + 8, 3, '#6BC06F'); circulo(c, X + 18, Y + 7, 2, '#6BC06F');
    } else if (ch === 'a') {
      px(c, X, Y, TL, TL, '#4C8DE8'); px(c, X, Y + 16, TL, 16, '#3F7FDA');
      var o = Math.floor((t / 260 + x * 0.7 + y) % 4) * 2;
      px(c, X + 3 + o, Y + 9, 9, 2, '#A9D2FF'); px(c, X + 17 - o, Y + 22, 9, 2, '#A9D2FF');
      if (Math.floor(t / 500 + x * 3 + y * 5) % 9 === 0) { px(c, X + 14, Y + 13, 2, 2, '#FFFFFF'); px(c, X + 13, Y + 14, 4, 0.01, '#FFFFFF'); }
      [[0, -1, X, Y, TL, 3], [0, 1, X, Y + TL - 3, TL, 3], [-1, 0, X, Y, 3, TL], [1, 0, X + TL - 3, Y, 3, TL]].forEach(function (v) {
        if (tile(x + v[0], y + v[1]) !== 'a') { px(c, v[2], v[3], v[4], v[5], '#E6F3FF'); }
      });
    } else if (ch === 'r') {
      elipse(c, X + 16, Y + 26, 13, 4, 'rgba(0,0,0,.22)');
      elipse(c, X + 16, Y + 19, 14, 11, '#3B3F48'); elipse(c, X + 16, Y + 18, 12.5, 9.5, '#8E949F');
      elipse(c, X + 12, Y + 14, 6, 4, '#C2C8D2'); px(c, X + 18, Y + 20, 6, 2, '#6D727C');
    } else if (ch === 'f') {
      var dx = Math.floor((t / 450 + x + y) % 2);
      [[5, 7, '#F2475F'], [19, 5, '#FFD23F'], [11, 19, '#FFFFFF'], [23, 21, '#F2475F']].forEach(function (f) {
        px(c, X + f[0] + dx + 1, Y + f[1] + 5, 1, 4, '#3E8E3A');
        px(c, X + f[0] + dx, Y + f[1], 5, 5, '#1F2028'); px(c, X + f[0] + dx + 1, Y + f[1] - 1, 3, 7, f[2]); px(c, X + f[0] + dx - 1, Y + f[1] + 1, 7, 3, f[2]);
        px(c, X + f[0] + dx + 1, Y + f[1] + 1, 3, 3, '#FFF3A6');
      });
    } else if (ch === 'p') {
      elipse(c, X + 16, Y + 29, 9, 3, 'rgba(0,0,0,.22)');
      px(c, X + 13, Y + 16, 6, 14, '#1F2028'); px(c, X + 14, Y + 16, 4, 13, '#7A4A22');
      px(c, X + 4, Y + 5, 24, 15, '#1F2028'); px(c, X + 5, Y + 6, 22, 13, '#A8743E'); px(c, X + 7, Y + 8, 18, 9, '#D9A867');
      px(c, X + 9, Y + 10, 14, 1, '#8A5A2B'); px(c, X + 9, Y + 13, 10, 1, '#8A5A2B');
    }
  }
  function desenharCentro(c) {
    var X = 6 * TL, Y = 6 * TL, W = 128;
    elipse(c, X + 64, Y + 96, 70, 8, 'rgba(0,0,0,.22)');
    px(c, X, Y + 26, W, 70, '#1F2028'); px(c, X + 2, Y + 28, W - 4, 66, '#F7F2E6'); px(c, X + 2, Y + 84, W - 4, 10, '#D8D0BE');
    px(c, X - 6, Y - 2, W + 12, 34, '#1F2028'); px(c, X - 4, Y, W + 8, 30, '#E8383D');
    for (var i = 0; i < 4; i++) { px(c, X - 4, Y + 6 + i * 6, W + 8, 1, '#C42A30'); }
    px(c, X - 4, Y + 26, W + 8, 4, '#A51D22');
    circulo(c, X + 64, Y + 14, 11, '#1F2028'); circulo(c, X + 64, Y + 14, 9.5, '#F8F8F8');
    px(c, X + 54.5, Y + 13, 19, 2.5, '#1F2028'); circulo(c, X + 64, Y + 14, 3.5, '#1F2028'); circulo(c, X + 64, Y + 14, 2, '#F8F8F8');
    c.save(); c.beginPath(); c.rect(X + 54.5, Y + 4, 19, 9); c.clip(); circulo(c, X + 64, Y + 14, 9.5, '#E8383D'); c.restore();
    [[12, 40], [90, 40]].forEach(function (j) { px(c, X + j[0], Y + j[1], 28, 22, '#1F2028'); px(c, X + j[0] + 2, Y + j[1] + 2, 24, 18, '#8FD3FF'); px(c, X + j[0] + 2, Y + j[1] + 2, 24, 5, '#C8ECFF'); px(c, X + j[0] + 13, Y + j[1] + 2, 2, 18, '#1F2028'); });
    px(c, X + 64, Y + 58, 30, 38, '#1F2028'); px(c, X + 66, Y + 60, 26, 36, '#9FDCFF'); px(c, X + 78, Y + 60, 2, 36, '#5A7DA0');
    c.fillStyle = '#1F2028'; c.font = 'bold 8px Segoe UI'; c.fillText('POKÉMON CENTER', X + 6, Y + 76);
  }
  var fundo = null;
  function preRender() {
    if (fundo || !document.createElement) { return; }
    fundo = document.createElement('canvas'); fundo.width = COLS * TL; fundo.height = LINS * TL;
    var c = fundo.getContext && fundo.getContext('2d'); if (!c) { fundo = null; return; }
    for (var y = 0; y < LINS; y++) { for (var x = 0; x < COLS; x++) { if ('afD'.indexOf(tile(x, y)) < 0) { desenharTile(c, x, y, 0); } } }
    desenharCentro(c);
  }
  function quadro(t) {
    var cv = $('sf-canvas'); if (!cv || !cv.getContext) { return; }
    var c = cv.getContext('2d'); if (!c) { return; }
    c.imageSmoothingEnabled = false;
    preRender(); if (fundo) { c.drawImage(fundo, 0, 0); }
    for (var y = 0; y < LINS; y++) { for (var x = 0; x < COLS; x++) { if ('af'.indexOf(tile(x, y)) >= 0) { desenharTile(c, x, y, t); } } }
    var X = S.x * TL, Y = S.y * TL, q = 0;
    if (S.anda) {
      var p = Math.min(1, (t - S.anda.t0) / 160);
      X = (S.anda.x0 + (S.x - S.anda.x0) * p) * TL; Y = (S.anda.y0 + (S.y - S.anda.y0) * p) * TL;
      q = p < 1 ? 1 + (S.passo % 2) : 0;
      if (p >= 1) { S.anda = null; chegou(t); }
    }
    elipse(c, X + 16, Y + 30, 10, 3.5, 'rgba(0,0,0,.28)');
    desenharTreinador(c, X, Y - 4, S.dir, q, 2);
    if (tile(S.x, S.y) === 'm' && !S.anda) {
      for (var i = 0; i < 4; i++) {
        var fx = S.x * TL + i * 8;
        c.fillStyle = '#1E5A1E'; c.beginPath(); c.moveTo(fx - 1, Y + 32); c.lineTo(fx + 4, Y + 16); c.lineTo(fx + 9, Y + 32); c.fill();
        c.fillStyle = '#4FB548'; c.beginPath(); c.moveTo(fx + 1, Y + 32); c.lineTo(fx + 4, Y + 19); c.lineTo(fx + 7, Y + 32); c.fill();
      }
    }
    if (S.folhas) {
      var d = (t - S.folhas.t0) / 380;
      if (d >= 1) { S.folhas = null; }
      else {
        for (var k = 0; k < 6; k++) {
          var a = k * Math.PI / 3 + 0.4;
          px(c, S.folhas.x * TL + 16 + Math.cos(a) * 20 * d - 2, S.folhas.y * TL + 18 + Math.sin(a) * 12 * d - 16 * d, 4, 3, k % 2 ? '#4FB548' : '#7FD46F');
        }
      }
    }
  }
  function laco(t) {
    quadro(t || 0);
    if (S.tecla && !S.anda && !S.luta && S.ver == null) { mover(S.tecla); }
    if (window.requestAnimationFrame) { window.__safariLaco = window.requestAnimationFrame(laco); }
  }

  /* ================= MOVIMENTO ================= */
  var DIRS = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };
  function agora() { return window.performance ? window.performance.now() : 0; }
  function mover(d) {
    if (S.anda || S.luta) { return; }
    S.dir = d;
    var nx = S.x + DIRS[d][0], ny = S.y + DIRS[d][1], ch = tile(nx, ny);
    if (ch === 'p') { mensagem('📜 <b>ZONA SAFARI</b> · O mato alto esconde Pokémon · O Centro Pokémon reabastece a mochila · Dizem que Pokémon brilhantes e até lendários aparecem por aqui...'); return; }
    if (bloqueia(ch)) { return; }
    S.anda = { x0: S.x, y0: S.y, t0: agora() };
    S.x = nx; S.y = ny; S.passo++;
  }
  function chegou(t) {
    var ch = tile(S.x, S.y);
    if (ch === 'D') {
      S.bolsa = { poke: 10, grande: 5, ultra: 3, fruta: 3 };
      mensagem('🏥 Bem-vindo ao <b>Centro Pokémon</b>! Sua mochila foi reabastecida.');
      S.x = 8; S.y = 9; S.dir = 'baixo'; atualizarLado();
      return;
    }
    if (ch === 'm') { S.folhas = { x: S.x, y: S.y, t0: t || agora() }; if (Math.random() < 0.13) { encontro(); } }
  }

  /* ================= ENCONTRO / CAPTURA ================= */
  function sortearPokemon() {
    var base = K.LISTA.filter(function (p) { return p.padrao && (!S.gen || p.gen === S.gen); });
    var lendas = base.filter(function (p) { return p.lend; }), comuns = base.filter(function (p) { return !p.lend; });
    if (lendas.length && S.lendarios < MAX_LENDARIO && Math.random() < (turbo() ? LENDARIO_TURBO : LENDARIO)) { return K.aleatorio(lendas); }
    if (!comuns.length) { return K.aleatorio(base); }
    var pesos = comuns.map(function (p) { return p.total > 500 ? 0.35 : p.total > 400 ? 0.7 : 1; });
    var soma = pesos.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * soma;
    for (var i = 0; i < comuns.length; i++) { r -= pesos[i]; if (r <= 0) { return comuns[i]; } }
    return comuns[comuns.length - 1];
  }
  function taxaCaptura(p) { return p.lend ? 45 : Math.max(10, Math.min(255, Math.round(255 - (p.total - 200) * 0.62))); }
  function valorA(L, bola) { return taxaCaptura(K.P[L.id]) * BOLAS[bola].mult * (L.fruta ? 1.5 : 1) * 2 / 3; /* bônus do Safari: como se estivesse com ~1/3 do HP */ }
  function chanceCaptura(L, bola) {
    var a = valorA(L, bola); if (a >= 255) { return 1; }
    return Math.pow(1048560 / Math.sqrt(Math.sqrt(16711680 / a)) / 65536, 4);
  }
  function balancadas(L, bola) {
    var a = valorA(L, bola); if (a >= 255) { return 4; }
    var b = 1048560 / Math.sqrt(Math.sqrt(16711680 / a)), n = 0;
    while (n < 4 && Math.random() * 65536 < b) { n++; }
    return n;
  }
  function encontro() {
    var p = sortearPokemon(), chanceShiny = turbo() ? (p.lend ? SHINY_LENDARIO_TURBO : SHINY_TURBO) : 1 / SHINY;
    var shiny = S.shinies < MAX_SHINY && Math.random() < chanceShiny;
    S.enc++; S.tecla = null; S.vistos[p.id] = 1;
    if (shiny) { S.shinies++; }
    if (p.lend) { S.lendarios++; }
    S.luta = { id: p.id, shiny: shiny, nivel: p.lend ? 50 : 3 + Math.floor(Math.random() * 45), sexo: Math.random() < 0.5 ? '♂' : '♀', fruta: false, fase: 'transicao', tentativas: 0 };
    render();
    setTimeout(function () {
      if (!S.luta) { return; }
      S.luta.fase = 'menu';
      S.luta.texto = p.lend ? `Um <b>${esc(p.nome)}</b> LENDÁRIO apareceu!!` : `Um <b>${esc(p.nome)}</b> selvagem apareceu!`;
      if (shiny) { S.luta.texto += ` <span class='sf-sh'>✨ É SHINY!</span>`; }
      render();
    }, 1200);
  }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function arremessar(bola) {
    var L = S.luta; if (!L || L.fase !== 'menu' || S.bolsa[bola] <= 0) { return; }
    S.bolsa[bola]--; L.tentativas++; L.fase = 'animando';
    var p = K.P[L.id], n = balancadas(L, bola);
    L.texto = `Você jogou uma <b>${BOLAS[bola].nome}</b>!`; render();
    var cena = $('sf-cena'), mon = $('sf-mon'), tr = $('sf-tr');
    if (tr) { tr.classList.add('joga'); }
    if (cena) { var b = document.createElement('div'); b.className = 'sf-bola voa'; b.style.setProperty('--c', BOLAS[bola].cor); b.id = 'sf-bola'; cena.appendChild(b); }
    await esperar(650);
    if (mon) { mon.classList.add('suga'); }
    var luz = document.createElement('div'); luz.className = 'sf-luz'; if (cena) { cena.appendChild(luz); }
    await esperar(550);
    var bolaEl = $('sf-bola'); if (bolaEl) { bolaEl.className = 'sf-bola parada'; }
    await esperar(450);
    for (var i = 0; i < Math.min(n, 3); i++) {
      if (bolaEl) { bolaEl.classList.remove('balanca'); void bolaEl.offsetWidth; bolaEl.classList.add('balanca'); }
      L.texto = ['. . .', '. . . . . .', '. . . . . . . . .'][i]; atualizarTexto();
      await esperar(800);
    }
    if (n >= 4) {
      if (bolaEl) { bolaEl.classList.add('pegou'); }
      if (cena) { for (var k = 0; k < 10; k++) { var e = document.createElement('i'); e.className = 'sf-estrela'; e.style.setProperty('--a', (k * 36) + 'deg'); cena.appendChild(e); } }
      S.caixa.unshift({ id: L.id, shiny: L.shiny, nivel: L.nivel, bola: bola });
      L.fase = 'fim'; L.texto = `Gotcha! <b>${esc(p.nome)}</b> foi capturado!${L.shiny ? ' ✨' : ''}`; atualizarTexto(); atualizarLado();
      await esperar(2000); S.luta = null; mensagem(`Você capturou <b>${esc(p.nome)}</b>${L.shiny ? ' ✨ shiny' : ''}! Ele foi para a sua caixa.`); render();
      return;
    }
    if (bolaEl) { bolaEl.classList.add('abre'); }
    if (mon) { mon.classList.remove('suga'); mon.classList.add('escapa'); }
    L.texto = ['Ah não! O Pokémon escapou!', 'Argh! Quase!', 'Puxa! Parecia que tinha pegado!', 'Droga! Foi por pouco!'][Math.min(n, 3)];
    L.fruta = false; atualizarTexto();
    await esperar(1000);
    if (bolaEl) { bolaEl.remove(); }
    var foge = p.lend ? 0.04 + L.tentativas * 0.02 : 0.05 + p.b.spe / 600 + L.tentativas * 0.03;
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
    S.bolsa.fruta--; L.fruta = true; L.texto = `Você jogou uma <b>Fruta Frambo</b>! O ${esc(K.P[L.id].nome)} parece mais calmo.`; render();
  }
  function fugir() { if (!S.luta || S.luta.fase !== 'menu') { return; } S.luta = null; mensagem('Você fugiu em segurança.'); render(); }

  /* ================= UI ================= */
  function mensagem(txt) { S.msg = txt; var m = $('sf-msg'); if (m) { m.innerHTML = txt; } }
  function atualizarTexto() { var t = $('sf-texto'); if (t && S.luta) { t.innerHTML = S.luta.texto || ''; } }
  function urlShiny(u) { return u.replace('/showdown/', '/showdown/shiny/').replace('/home/', '/home/shiny/').replace('/official-artwork/', '/official-artwork/shiny/'); }
  function lutaHtml() {
    var L = S.luta; if (!L) { return ''; }
    if (L.fase === 'transicao') { return `<div class='sf-trans'><i></i><i></i><i></i><i></i></div>`; }
    var p = K.P[L.id], urls = [K.URL.gif(p.id), K.URL.home(p.id), K.URL.arte(p.id)];
    if (L.shiny) { urls = urls.map(urlShiny).concat(urls); }
    var menu = L.fase === 'menu' ? `<div class='sf-menu'>
        ${['poke', 'grande', 'ultra'].map(function (b) { return `<div class='sf-op${S.bolsa[b] ? '' : ' off'}' data-acao='bola' data-b='${b}'><i class='sf-mini' style='--c:${BOLAS[b].cor}'></i><span>${BOLAS[b].nome}<em>×${S.bolsa[b]}</em></span><small>${Math.round(100 * chanceCaptura(L, b))}%</small></div>`; }).join('')}
        <div class='sf-op${S.bolsa.fruta && !L.fruta ? '' : ' off'}' data-acao='fruta'><i class='sf-fruta'>🍓</i><span>Fruta Frambo<em>×${S.bolsa.fruta}</em></span><small>+50%</small></div>
        <div class='sf-op fugir' data-acao='fugir'><i class='sf-fruta'>🏃</i><span>Fugir<em>voltar ao mato</em></span></div></div>` : '';
    var fixo = L.entrou ? ' fixo' : ''; L.entrou = true;
    return `<div class='sf-luta${p.lend ? ' lend' : ''}${L.shiny ? ' shy' : ''}${fixo}' id='sf-cena' style='--c:${K.corTipo(p.t[0])}'>
      <div class='sf-ceu'><i class='nv n1'></i><i class='nv n2'></i><i class='nv n3'></i></div><div class='sf-arvores'></div><div class='sf-campo'></div>
      <div class='sf-hud'><div class='sf-hud-l'><b>${esc(p.nome)}</b><span class='sx ${L.sexo === '♂' ? 'm' : 'f'}'>${L.sexo}</span>${L.shiny ? `<span class='sf-sh'>✨</span>` : ''}${p.lend ? `<span class='sf-lend'>LENDÁRIO</span>` : ''}<span class='nv-l'>Nv${L.nivel}</span></div>
        <div class='sf-hp'><em>HP</em><div><i></i></div></div><div class='sf-tipos'>${p.t.map(K.chip).join('')}<span class='sf-chance'>${L.fruta ? '🍓 calmo · ' : ''}captura com Pokébola <b>${Math.round(100 * chanceCaptura(L, 'poke'))}%</b></span></div></div>
      <div class='sf-plat-o'></div><div class='sf-plat-j'></div>
      <div class='sf-mon${L.shiny ? ' shiny' : ''}' id='sf-mon'>${K.img(urls)}${L.shiny ? `<div class='sf-brilho'><i></i><i></i><i></i><i></i><i></i></div>` : ''}</div>
      <canvas class='sf-tr' id='sf-tr' width='128' height='128'></canvas>
      <div class='sf-txt'><span id='sf-texto'>${L.texto || ''}</span></div>${menu}</div>`;
  }
  function ladoHtml() {
    var bolsa = ['poke', 'grande', 'ultra'].map(function (b) {
      return `<div class='sf-item'><i class='sf-mini' style='--c:${BOLAS[b].cor}'></i><span>${BOLAS[b].nome}</span><b>×${S.bolsa[b]}</b></div>`;
    }).join('') + `<div class='sf-item'><i>🍓</i><span>Fruta Frambo</span><b>×${S.bolsa.fruta}</b></div>`;
    var caixa = S.caixa.map(function (c, i) {
      var p = K.P[c.id], src = c.shiny ? K.URL.sprite(c.id).replace('/pokemon/', '/pokemon/shiny/') : K.URL.sprite(c.id);
      return `<div class='sf-cx${c.shiny ? ' sh' : ''}${p.lend ? ' ld' : ''}' data-acao='ver' data-i='${i}' title='Ver ${esc(p.nome)} na Pokédex'><img src='${src}'/><i class='sf-mini' style='--c:${BOLAS[c.bola].cor}'></i>${c.shiny ? '<em>✨</em>' : ''}<span>${esc(p.nome)}</span></div>`;
    }).join('');
    var gens = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (g) { return `<span class='gc${S.gen === g ? ' on' : ''}' data-acao='gen' data-g='${g}'>${g || 'Todas'}</span>`; }).join('');
    var vistos = Object.keys(S.vistos).length;
    return `<div class='sf-sec'>REGIÃO DO MATO <em>gerações</em></div><div class='gens sf-gens'>${gens}</div>
      <div class='sf-sec'>MOCHILA <em>reabasteça no Centro Pokémon</em></div><div class='sf-bolsa'>${bolsa}</div>
      <div class='sf-stats'><div><span>VISTOS</span><b>${vistos}</b></div><div><span>CAPTURAS</span><b>${S.caixa.length}</b></div>
        <div><span>ENCONTROS</span><b>${S.enc}</b></div><div><span>FUGAS</span><b>${S.fugas}</b></div></div>
      <div class='sf-sec'>SUA CAIXA <em>${S.caixa.length} Pokémon</em></div><div class='sf-caixa'>${caixa || `<span class='vazio'>Capture Pokémon no mato alto!</span>`}</div>
      <div class='sf-pad'><div></div><div class='sf-tc' data-tecla='cima'>▲</div><div></div><div class='sf-tc' data-tecla='esq'>◀</div><div class='sf-tc' data-tecla='baixo'>▼</div><div class='sf-tc' data-tecla='dir'>▶</div></div>`;
  }
  /* ================= POKÉDEX (estilo anime) ================= */
  function dexHtml(semAbrir) {
    var c = S.ver == null ? null : S.caixa[S.ver];
    if (!c) { return ''; }
    var p = K.P[c.id], cor = K.corTipo(p.t[0]);
    var arte = c.shiny ? [urlShiny(K.URL.arte(p.id)), K.URL.arte(p.id), K.URL.home(p.id)] : [K.URL.arte(p.id), K.URL.home(p.id)];
    var num = '#' + String(p.esp).padStart(3, '0');
    var tipos = p.t.map(K.nomeTipo).join(' e ');
    var fala = p.nome + ', o Pokémon do tipo ' + tipos + '. ' + (p.lend ? 'Um Pokémon lendário! ' : '') + (c.shiny ? 'Coloração rara: shiny! ' : '')
      + 'Capturado no Nv. ' + c.nivel + ' com ' + BOLAS[c.bola].nome + '.';
    var letras = fala.split('').map(function (ch, i) { return `<i style='animation-delay:${(semAbrir ? 0 : 900) + i * 22}ms'>${esc(ch)}</i>`; }).join('');
    var stats = [['HP', p.b.hp], ['ATQ', p.b.atk], ['DEF', p.b.def], ['A.ESP', p.b.spa], ['D.ESP', p.b.spd], ['VEL', p.b.spe]].map(function (s, i) {
      return `<div class='dx-st'><span>${s[0]}</span><div><i style='width:${Math.min(100, 100 * s[1] / 180)}%;animation-delay:${(semAbrir ? 0 : 900) + i * 90}ms'></i></div><b>${s[1]}</b></div>`;
    }).join('');
    var brilho = c.shiny ? `<div class='dx-brilho'><i></i><i></i><i></i><i></i></div>` : '';
    var selos = p.t.map(K.chip).join('') + `<span class='dx-selo'>GEN ${p.gen}</span>` + (c.shiny ? `<span class='dx-selo sh'>✨ SHINY</span>` : '') + (p.lend ? `<span class='dx-selo ld'>LENDÁRIO</span>` : '');
    var teclas = ''; for (var k = 0; k < 10; k++) { teclas += '<i></i>'; }
    return `<div class='dx-fundo${semAbrir ? ' aberto' : ''}' id='sf-dex' data-acao='fecharDex'>
      <div class='dx' style='--c:${cor}' data-acao='nada'>
        <div class='dx-esq'>
          <div class='dx-topo'><div class='dx-lente'></div><i class='dx-luz r'></i><i class='dx-luz y'></i><i class='dx-luz g'></i></div>
          <div class='dx-borda'><i class='dx-pt a'></i><i class='dx-pt b'></i>
            <div class='dx-tela'><span class='dx-num'>Nº ${num.slice(1)}</span>${K.img(arte, 'dx-arte')}${brilho}<div class='dx-scan'></div></div>
            <i class='dx-pt c'></i><span class='dx-som'><i></i><i></i><i></i></span></div>
          <div class='dx-ctrl'><i class='dx-bt'></i><div class='dx-pilulas'><i class='r'></i><i class='b'></i></div>
            <div class='dx-nome'>${esc(p.nome.toUpperCase())}</div>
            <div class='dx-cruz'><span class='v'></span><span class='h'></span><b class='e' data-acao='dexAnt' title='Anterior'>◀</b><b class='d' data-acao='dexProx' title='Próximo'>▶</b></div></div>
        </div>
        <div class='dx-dobra'><i></i><i></i></div>
        <div class='dx-dir'>
          <div class='dx-fechar' data-acao='fecharDex' title='Fechar (Esc)'>×</div>
          <div class='dx-lcd'><div class='dx-lcd-tit'><b>${esc(p.nome)}</b><span>${num}</span></div><div class='dx-fala'>${letras}</div></div>
          <div class='dx-selos'>${selos}</div>
          <div class='dx-lcd dx-stats'>${stats}<div class='dx-total'>TOTAL <b>${p.total}</b></div></div>
          <div class='dx-base'><div class='dx-teclas'>${teclas}</div>
            <div class='dx-info'><i class='sf-mini' style='--c:${BOLAS[c.bola].cor}'></i>${BOLAS[c.bola].nome} · Nv. ${c.nivel}<em>${S.ver + 1}/${S.caixa.length}</em></div></div>
        </div>
      </div></div>`;
  }
  function mostrarDex(semAbrir) {
    var velho = $('sf-dex'); if (velho) { velho.remove(); }
    var jogo = $('sf-jogo');
    if (jogo && S.ver != null && jogo.insertAdjacentHTML) { jogo.insertAdjacentHTML('beforeend', dexHtml(semAbrir)); }
  }
  function acaoDex(acao) {
    if (S.ver == null) { return false; }
    if (acao === 'fechar') { S.ver = null; mostrarDex(); return true; }
    var n = S.caixa.length; if (!n) { return false; }
    S.ver = (S.ver + (acao === 'prox' ? 1 : n - 1)) % n; mostrarDex(true); return true;
  }
  window.__safariDex = acaoDex;
  function atualizarLado() { var l = $('sf-lado'); if (l) { l.innerHTML = ladoHtml(); } }
  function desenharTreinadorCostas() {
    var cv = $('sf-tr'); if (!cv || !cv.getContext) { return; }
    var c = cv.getContext('2d'); if (!c) { return; }
    c.imageSmoothingEnabled = false; desenharTreinador(c, 0, 0, 'cima', 0, 8);
  }
  function render() {
    raiz.innerHTML = `<div class='pk-palco safari'>
      <div class='topo'><span class='sf-dica'>⌨ setas / WASD · ou o direcional ao lado</span><div class='titulo'><b>SAFARI</b><span>ande pelo mato e capture</span></div></div>
      <div class='sf-jogo' id='sf-jogo' tabindex='0'><canvas id='sf-canvas' width='${COLS * TL}' height='${LINS * TL}'></canvas>
        <div class='sf-nuvens'><i></i><i></i></div><div class='sf-vinheta'></div>
        <div class='sf-msg' id='sf-msg'>${S.msg}</div>${lutaHtml()}${dexHtml(true)}</div>
      <div class='sf-lado vidro' id='sf-lado'>${ladoHtml()}</div></div>`;
    K.escala(raiz);
    quadro(agora());
    desenharTreinadorCostas();
  }

  /* ================= ENTRADA ================= */
  var TECLAS = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esq', ArrowRight: 'dir', w: 'cima', s: 'baixo', a: 'esq', d: 'dir', W: 'cima', S: 'baixo', A: 'esq', D: 'dir' };
  if (!window.__safariTeclas2) {
    window.__safariTeclas2 = true;
    window.addEventListener('keydown', function (ev) {
      var s = window.__safari; if (!s) { return; }
      if (s.ver != null && window.__safariDex) {
        var a = ev.key === 'Escape' ? 'fechar' : ev.key === 'ArrowLeft' ? 'ant' : ev.key === 'ArrowRight' ? 'prox' : null;
        if (a) { window.__safariDex(a); ev.preventDefault(); }
        s.tecla = null; return;
      }
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
      case 'ver':
        if (S.luta && S.luta.fase === 'animando') { break; }
        S.ver = +el.getAttribute('data-i'); S.tecla = null; mostrarDex(); break;
      case 'fecharDex': acaoDex('fechar'); break;
      case 'dexAnt': acaoDex('ant'); break;
      case 'dexProx': acaoDex('prox'); break;
    }
  };

  window.__safariApi = { chanceCaptura: chanceCaptura, taxaCaptura: taxaCaptura, sortearPokemon: sortearPokemon, mover: mover, tile: tile, encontro: encontro, dexHtml: dexHtml, acaoDex: acaoDex };
  if (window.__safariLaco && window.cancelAnimationFrame) { window.cancelAnimationFrame(window.__safariLaco); }
  if (S.luta && S.luta.fase !== 'menu') { S.luta.fase = 'menu'; S.luta.texto = 'O que você vai fazer?'; }
  render();
  laco(0);
})();
