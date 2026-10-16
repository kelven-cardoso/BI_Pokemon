/* Página Tipos: roda de tipos (setas de vantagem), matriz 18x18 e ranking de combinações.
   Usa window.PK (comum.js). Não use aspas duplas neste arquivo. */
(function () {
  var K = window.PK, raiz = document.getElementById('app-raiz');
  if (!K || !raiz) { return; }
  var T = K.TIPOS, icone = K.icone, nomeTipo = K.nomeTipo, corTipo = K.corTipo;
  var S = window.__tipos || (window.__tipos = { aba: 'roda', modo: 'ataque', atk: 'fire', def: ['grass'], foco: null });
  function $(id) { return document.getElementById(id); }

  /* ================= RODA ================= */
  var CX = 316, CY = 300, R = 238;
  function ponto(t) {
    var a = -Math.PI / 2 + 2 * Math.PI * T.indexOf(t) / T.length;
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  }
  function seta(de, para, cls, i) {
    var a = ponto(de), b = ponto(para);
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, cx = CX + (mx - CX) * 0.35, cy = CY + (my - CY) * 0.35;
    var dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy) || 1, bx = b.x - dx / d * 28, by = b.y - dy / d * 28;
    var ax = a.x + (cx - a.x) / Math.hypot(cx - a.x, cy - a.y) * 26, ay = a.y + (cy - a.y) / Math.hypot(cx - a.x, cy - a.y) * 26;
    return `<path class='seta ${cls}' pathLength='1' style='animation-delay:${i * 40}ms' marker-end='url(#m-${cls})' d='M${ax.toFixed(1)},${ay.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}'/>`;
  }
  function setasHtml() {
    var html = '', i = 0, foco = S.foco;
    if (S.modo === 'ataque') {
      var a = foco || S.atk;
      T.forEach(function (d) {
        var x = K.ef(a, d);
        if (x > 1) { html += seta(a, d, 'sup', i++); } else if (x === 0) { html += seta(a, d, 'nul', i++); } else if (x < 1) { html += seta(a, d, 'pou', i++); }
      });
    } else {
      var def = foco ? [foco] : S.def;
      if (!def.length) { return ''; }
      T.forEach(function (t) {
        var x = K.efTotal(t, def);
        if (x > 1) { html += seta(t, def[0], x >= 4 ? 'sup4' : 'sup', i++); } else if (x === 0) { html += seta(t, def[0], 'nul', i++); } else if (x < 1) { html += seta(t, def[0], 'pou', i++); }
      });
    }
    return html;
  }
  function centroHtml() {
    if (S.modo === 'ataque') {
      var a = S.foco || S.atk;
      var vence = T.filter(function (d) { return K.ef(a, d) > 1; }).length, fraco = T.filter(function (d) { return K.ef(a, d) > 0 && K.ef(a, d) < 1; }).length;
      return `<div class='rc-ico'>${icone(a, 64)}</div><b style='color:${corTipo(a)}'>${nomeTipo(a)}</b><span>vence <em class='v'>${vence}</em> · fraco em <em class='f'>${fraco}</em></span>`;
    }
    var def = S.foco ? [S.foco] : S.def;
    if (!def.length) { return `<span>Escolha até 2 tipos na roda</span>`; }
    var ameaca = T.filter(function (t) { return K.efTotal(t, def) > 1; }).length, resiste = T.filter(function (t) { return K.efTotal(t, def) < 1; }).length;
    return `<div class='rc-ico'>${def.map(function (d) { return icone(d, def.length > 1 ? 48 : 64); }).join('')}</div><b>${def.map(nomeTipo).join(' / ')}</b>
      <span>ameaças <em class='f'>${ameaca}</em> · resiste a <em class='v'>${resiste}</em></span>`;
  }
  function rodaHtml() {
    var nos = T.map(function (t) {
      var p = ponto(t), on = S.modo === 'ataque' ? t === S.atk : S.def.indexOf(t) >= 0;
      return `<div class='no${on ? ' on' : ''}' data-acao='no' data-t='${t}' style='left:${p.x - 25}px;top:${p.y - 25}px;--c:${corTipo(t)}'>${icone(t, 44)}<span>${nomeTipo(t)}</span></div>`;
    }).join('');
    var marcas = [['sup', '#22C55E'], ['sup4', '#86EFAC'], ['pou', '#EF4444'], ['nul', '#94A3B8']].map(function (m) {
      return `<marker id='m-${m[0]}' viewBox='0 0 10 10' refX='8' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'><path d='M0,0 L10,5 L0,10 z' fill='${m[1]}'/></marker>`;
    }).join('');
    return `<div class='roda-modos modos'><span class='${S.modo === 'ataque' ? 'on' : ''}' data-acao='modoRoda' data-m='ataque'>⚔ Ataque</span>
        <span class='${S.modo === 'defesa' ? 'on' : ''}' data-acao='modoRoda' data-m='defesa'>🛡 Defesa</span></div>
      <div class='roda-leg'>${S.modo === 'ataque'
        ? `<span><i class='l-sup'></i>dano dobrado</span><span><i class='l-pou'></i>metade</span><span><i class='l-nul'></i>sem efeito</span>`
        : `<span><i class='l-sup'></i>ameaça (×2)</span><span><i class='l-sup4'></i>ameaça (×4)</span><span><i class='l-pou'></i>resistido</span><span><i class='l-nul'></i>imune</span>`}</div>
      <div class='roda'>
        <svg class='roda-svg' width='632' height='600'><defs>${marcas}</defs><circle cx='${CX}' cy='${CY}' r='${R}' class='roda-aro'/><g id='tp-setas'>${setasHtml()}</g></svg>
        <div class='roda-centro' id='tp-centro'>${centroHtml()}</div>${nos}</div>`;
  }

  /* ================= MATRIZ ================= */
  function matrizHtml() {
    var html = `<div class='canto'><span>DEFENSOR →</span><span>ATACANTE ↓</span></div>`;
    T.forEach(function (d) { html += `<div class='cab cab-d${S.def.indexOf(d) >= 0 ? ' on' : ''}' data-acao='def' data-t='${d}'>${icone(d, 24)}</div>`; });
    T.forEach(function (a) {
      html += `<div class='cab cab-a${a === S.atk ? ' on' : ''}' data-acao='atk' data-t='${a}'>${icone(a, 24)}</div>`;
      T.forEach(function (d) {
        var x = K.ef(a, d), cls = x > 1 ? 'c2' : x === 0 ? 'c0' : x < 1 ? 'cm' : 'c1';
        html += `<div class='cel ${cls}${a === S.atk ? ' ra' : ''}${S.def.indexOf(d) >= 0 ? ' cd' : ''}' data-a='${a}' data-d='${d}'>${x > 1 ? '2' : x === 0 ? '0' : x < 1 ? '½' : ''}</div>`;
      });
    });
    return `<div class='matriz' id='tp-matriz'>${html}</div>`;
  }

  /* ================= RANKING ================= */
  var COMBOS = null;
  function combos() {
    if (COMBOS) { return COMBOS; }
    COMBOS = [];
    for (var i = 0; i < T.length; i++) {
      for (var j = i; j < T.length; j++) {
        var def = i === j ? [T[i]] : [T[i], T[j]];
        var xs = T.map(function (t) { return K.efTotal(t, def); });
        var fr = xs.filter(function (x) { return x > 1; }).length, x4 = xs.filter(function (x) { return x >= 4; }).length;
        var re = xs.filter(function (x) { return x > 0 && x < 1; }).length, im = xs.filter(function (x) { return x === 0; }).length;
        var alvo = def.slice().sort().join('|');
        var ex = K.LISTA.find(function (p) { return p.padrao && p.t.slice().sort().join('|') === alvo; });
        COMBOS.push({ def: def, fr: fr, x4: x4, re: re, im: im, nota: re + im * 1.5 - fr - x4, ex: ex });
      }
    }
    COMBOS.sort(function (a, b) { return b.nota - a.nota || a.fr - b.fr; });
    return COMBOS;
  }
  function linhaCombo(c, i) {
    return `<div class='rk' data-acao='combo' data-d='${c.def.join(',')}'>
      <span class='rk-pos'>${i}</span><span class='rk-ico'>${c.def.map(function (d) { return icone(d, 26); }).join('')}</span>
      <span class='rk-nome'>${c.def.map(nomeTipo).join(' / ')}</span>
      <span class='rk-n f'>${c.fr}${c.x4 ? ` <small>(${c.x4}×4)</small>` : ''}</span><span class='rk-n v'>${c.re}</span><span class='rk-n i'>${c.im}</span>
      <span class='rk-ex'>${c.ex ? `<img src='${K.URL.sprite(c.ex.id)}' title='${K.esc(c.ex.nome)}'/>` : `<em>sem Pokémon</em>`}</span></div>`;
  }
  function rankingHtml() {
    var cs = combos(), cab = `<div class='rk rk-cab'><span></span><span></span><span>COMBINAÇÃO</span><span>FRAQUEZAS</span><span>RESIST.</span><span>IMUNE</span><span>EXEMPLO</span></div>`;
    var melhores = cs.slice(0, 8).map(function (c, i) { return linhaCombo(c, i + 1); }).join('');
    var piores = cs.slice(-4).reverse().map(function (c, i) { return linhaCombo(c, cs.length - i); }).join('');
    var ofe = T.map(function (a) { return { t: a, n: T.filter(function (d) { return K.ef(a, d) > 1; }).length }; }).sort(function (a, b) { return b.n - a.n; });
    var barras = ofe.map(function (o) { return `<div class='of' title='${nomeTipo(o.t)}: dano dobrado em ${o.n} tipos'>${icone(o.t, 22)}<div><i style='height:${o.n * 18}px;background:${corTipo(o.t)}'></i></div><b>${o.n}</b></div>`; }).join('');
    return `<div class='rk-sec'>🛡 MELHORES DEFESAS <em>de 171 combinações · clique para analisar</em></div>${cab}${melhores}
      <div class='rk-sec'>⚠ MAIS VULNERÁVEIS</div>${piores}
      <div class='rk-sec'>⚔ COBERTURA OFENSIVA <em>quantos tipos cada um atinge com dano dobrado</em></div><div class='ofs'>${barras}</div>`;
  }

  /* ================= DETALHE (direita) ================= */
  function chips(lista, vazio) { return lista.length ? lista.map(K.chip).join('') : `<span class='vazio'>${vazio}</span>`; }
  function detalheHtml() {
    var a = S.atk, def = S.def;
    var x = def.length ? K.efTotal(a, def) : 1;
    var rot = x >= 4 ? 'EXTREMAMENTE EFETIVO' : x >= 2 ? 'SUPER EFETIVO' : x === 0 ? 'SEM EFEITO' : x < 1 ? 'POUCO EFETIVO' : 'DANO NORMAL';
    var cls = x >= 2 ? 'sup' : x === 0 ? 'nul' : x < 1 ? 'pou' : 'nor';
    var conf = `<div class='conf conf-${cls}'>
      <div class='conf-lado'><em>ATAQUE</em>${icone(a, 40)}<span>${nomeTipo(a)}</span></div>
      <div class='conf-meio'><b>×${K.fmtEf(x)}</b><span>${rot}</span></div>
      <div class='conf-lado'><em>DEFESA</em><div>${def.map(function (d) { return icone(d, 40); }).join('')}</div><span>${def.map(nomeTipo).join(' / ') || 'escolha'}</span></div></div>`;
    var dobro = T.filter(function (d) { return K.ef(a, d) > 1; }), metade = T.filter(function (d) { return K.ef(a, d) > 0 && K.ef(a, d) < 1; }), nada = T.filter(function (d) { return K.ef(a, d) === 0; });
    var ataque = `<div class='sec'><div class='sec-tit'><span class='bola' style='background:${corTipo(a)}'></span>ATACANDO COM <b style='color:${corTipo(a)}'>${nomeTipo(a).toUpperCase()}</b></div>
      <div class='lin'><em class='rot-sup'>Dano dobrado em</em><div>${chips(dobro, 'nenhum')}</div></div>
      <div class='lin'><em class='rot-pou'>Metade do dano em</em><div>${chips(metade, 'nenhum')}</div></div>
      <div class='lin'><em class='rot-nul'>Não causa dano em</em><div>${chips(nada, 'nenhum')}</div></div></div>`;
    var defesa = '';
    if (def.length) {
      var lista = T.map(function (t) { return { t: t, x: K.efTotal(t, def) }; }).sort(function (p, q) { return q.x - p.x || T.indexOf(p.t) - T.indexOf(q.t); });
      var barras = lista.map(function (o) {
        var c = o.x > 1 ? 'b-sup' : o.x === 0 ? 'b-nul' : o.x < 1 ? 'b-pou' : 'b-nor';
        return `<div class='bar'>${icone(o.t, 16)}<span>${nomeTipo(o.t)}</span><div class='bar-t'><i class='${c}' style='width:${o.x === 0 ? 100 : Math.min(100, 25 * o.x)}%'></i></div><b class='${c}'>×${K.fmtEf(o.x)}</b></div>`;
      }).join('');
      defesa = `<div class='sec'><div class='sec-tit'>DEFENDENDO COMO <b>${def.map(function (d) { return `<span style='color:${corTipo(d)}'>${nomeTipo(d).toUpperCase()}</span>`; }).join(' / ')}</b>
        <em>${lista.filter(function (o) { return o.x > 1; }).length} fraquezas · ${lista.filter(function (o) { return o.x < 1; }).length} resistências</em></div><div class='bars'>${barras}</div></div>`;
      var alvo = def.slice().sort().join('|');
      var poks = K.LISTA.filter(function (p) { return p.padrao && p.t.slice().sort().join('|') === alvo; });
      defesa += `<div class='sec'><div class='sec-tit'>POKÉMON COM ESSA DEFESA <em>${poks.length} encontrados</em></div>
        <div class='pks'>${poks.slice(0, 11).map(function (p) { return `<div class='pk' title='${K.esc(p.nome)}'><img loading='lazy' src='${K.URL.sprite(p.id)}'/><span>${K.esc(p.nome)}</span></div>`; }).join('') || `<span class='vazio'>Nenhum Pokémon tem exatamente essa combinação.</span>`}${poks.length > 11 ? `<div class='pk mais'>+${poks.length - 11}</div>` : ''}</div></div>`;
    }
    return conf + ataque + defesa;
  }

  /* ================= RENDER ================= */
  function render() {
    var abas = [['roda', '◎ Roda'], ['matriz', '▦ Matriz'], ['ranking', '🏆 Ranking']].map(function (a) {
      return `<span class='${S.aba === a[0] ? 'on' : ''}' data-acao='aba' data-a='${a[0]}'>${a[1]}</span>`;
    }).join('');
    var corpo = S.aba === 'roda' ? rodaHtml() : S.aba === 'matriz' ? matrizHtml() : rankingHtml();
    raiz.innerHTML = `<div class='pk-palco tipos'>
      <div class='topo'><div class='modos abas'>${abas}</div><div class='titulo'><b>TIPOS</b><span>quem vence quem</span></div></div>
      <div class='painel-m vidro aba-${S.aba}'>${corpo}</div>
      <div class='painel-d vidro' id='tp-det'>${detalheHtml()}</div></div>`;
    K.escala(raiz);
    var m = $('tp-matriz');
    if (m) {
      m.onmouseover = function (ev) {
        var c = ev.target.closest('.cel'); if (!c) { return; }
        m.querySelectorAll('.hl').forEach(function (x) { x.classList.remove('hl'); });
        m.querySelectorAll(`.cel[data-a='${c.getAttribute('data-a')}'], .cel[data-d='${c.getAttribute('data-d')}']`).forEach(function (x) { x.classList.add('hl'); });
      };
      m.onmouseleave = function () { m.querySelectorAll('.hl').forEach(function (x) { x.classList.remove('hl'); }); };
    }
    var roda = raiz.querySelector('.roda');
    if (roda) {
      roda.onmouseover = function (ev) {
        var no = ev.target.closest('.no'); var t = no ? no.getAttribute('data-t') : null;
        if (t === S.foco) { return; }
        S.foco = t; $('tp-setas').innerHTML = setasHtml(); $('tp-centro').innerHTML = centroHtml();
      };
      roda.onmouseleave = function () { S.foco = null; $('tp-setas').innerHTML = setasHtml(); $('tp-centro').innerHTML = centroHtml(); };
    }
  }
  function alternarDef(t) {
    var i = S.def.indexOf(t);
    if (i >= 0) { S.def.splice(i, 1); } else { S.def.push(t); if (S.def.length > 2) { S.def.shift(); } }
  }
  raiz.onclick = function (ev) {
    var cel = ev.target.closest('.cel');
    if (cel) { S.atk = cel.getAttribute('data-a'); S.def = [cel.getAttribute('data-d')]; render(); return; }
    var el = ev.target.closest('[data-acao]'); if (!el) { return; }
    var t = el.getAttribute('data-t');
    switch (el.getAttribute('data-acao')) {
      case 'aba': S.aba = el.getAttribute('data-a'); S.foco = null; break;
      case 'modoRoda': S.modo = el.getAttribute('data-m'); S.foco = null; break;
      case 'no': if (S.modo === 'ataque') { S.atk = t; } else { alternarDef(t); } S.foco = null; break;
      case 'atk': S.atk = t; break;
      case 'def': alternarDef(t); break;
      case 'combo': S.def = el.getAttribute('data-d').split(','); S.modo = 'defesa'; break;
    }
    render();
  };
  if (!window.__tiposResize) { window.__tiposResize = true; window.addEventListener('resize', function () { K.escala(raiz); }); }
  render();
})();
