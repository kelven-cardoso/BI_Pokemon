/* Página Tipos: matriz de efetividade 18x18 interativa + calculadora de confronto.
   Usa window.PK (comum.js). Não use aspas duplas neste arquivo. */
(function () {
  var K = window.PK, raiz = document.getElementById('app-raiz');
  if (!K || !raiz) { return; }
  var T = K.TIPOS, icone = K.icone, nomeTipo = K.nomeTipo, corTipo = K.corTipo;
  var S = window.__tipos || (window.__tipos = { atk: 'fire', def: ['grass'] });
  function $(id) { return document.getElementById(id); }

  function celula(a, d) {
    var x = K.ef(a, d);
    var cls = x > 1 ? 'c2' : x === 0 ? 'c0' : x < 1 ? 'cm' : 'c1';
    var txt = x > 1 ? '2' : x === 0 ? '0' : x < 1 ? '½' : '';
    var sel = (a === S.atk ? ' ra' : '') + (S.def.indexOf(d) >= 0 ? ' cd' : '');
    return `<div class='cel ${cls}${sel}' data-a='${a}' data-d='${d}'>${txt}</div>`;
  }
  function matrizHtml() {
    var html = `<div class='canto'><span>DEFENSOR →</span><span>ATACANTE ↓</span></div>`;
    T.forEach(function (d) { html += `<div class='cab cab-d${S.def.indexOf(d) >= 0 ? ' on' : ''}' data-acao='def' data-t='${d}'>${icone(d, 24)}</div>`; });
    T.forEach(function (a) {
      html += `<div class='cab cab-a${a === S.atk ? ' on' : ''}' data-acao='atk' data-t='${a}'>${icone(a, 24)}</div>`;
      T.forEach(function (d) { html += celula(a, d); });
    });
    return html;
  }
  function chips(lista, vazio) {
    return lista.length ? lista.map(K.chip).join('') : `<span class='vazio'>${vazio}</span>`;
  }
  function detalheHtml() {
    var a = S.atk, def = S.def;
    /* confronto */
    var x = def.length ? K.efTotal(a, def) : 1;
    var rot = x >= 4 ? 'EXTREMAMENTE EFETIVO' : x >= 2 ? 'SUPER EFETIVO' : x === 0 ? 'SEM EFEITO' : x < 1 ? 'POUCO EFETIVO' : 'DANO NORMAL';
    var cls = x >= 2 ? 'sup' : x === 0 ? 'nul' : x < 1 ? 'pou' : 'nor';
    var conf = `<div class='conf conf-${cls}'>
      <div class='conf-lado'>${icone(a, 40)}<span>${nomeTipo(a)}</span></div>
      <div class='conf-meio'><b>×${K.fmtEf(x)}</b><span>${rot}</span></div>
      <div class='conf-lado'>${def.map(function (d) { return icone(d, 40); }).join('')}<span>${def.map(nomeTipo).join(' / ') || 'escolha'}</span></div></div>`;
    /* ataque */
    var dobro = T.filter(function (d) { return K.ef(a, d) > 1; });
    var metade = T.filter(function (d) { return K.ef(a, d) > 0 && K.ef(a, d) < 1; });
    var nada = T.filter(function (d) { return K.ef(a, d) === 0; });
    var ataque = `<div class='sec'><div class='sec-tit'><span class='bola' style='background:${corTipo(a)}'></span>ATACANDO COM <b style='color:${corTipo(a)}'>${nomeTipo(a).toUpperCase()}</b></div>
      <div class='lin'><em class='rot-sup'>Dano dobrado em</em><div>${chips(dobro, 'nenhum')}</div></div>
      <div class='lin'><em class='rot-pou'>Metade do dano em</em><div>${chips(metade, 'nenhum')}</div></div>
      <div class='lin'><em class='rot-nul'>Não causa dano em</em><div>${chips(nada, 'nenhum')}</div></div></div>`;
    /* defesa */
    var defesa = '';
    if (def.length) {
      var lista = T.map(function (t) { return { t: t, x: K.efTotal(t, def) }; }).sort(function (p, q) { return q.x - p.x || T.indexOf(p.t) - T.indexOf(q.t); });
      var barras = lista.map(function (o) {
        var c = o.x > 1 ? 'b-sup' : o.x === 0 ? 'b-nul' : o.x < 1 ? 'b-pou' : 'b-nor';
        var larg = o.x === 0 ? 100 : Math.min(100, 25 * o.x);
        return `<div class='bar'>${icone(o.t, 16)}<span>${nomeTipo(o.t)}</span><div class='bar-t'><i class='${c}' style='width:${larg}%'></i></div><b class='${c}'>×${K.fmtEf(o.x)}</b></div>`;
      }).join('');
      var fracos = lista.filter(function (o) { return o.x > 1; }).length, resiste = lista.filter(function (o) { return o.x < 1; }).length;
      defesa = `<div class='sec'><div class='sec-tit'>DEFENDENDO COMO <b>${def.map(function (d) { return `<span style='color:${corTipo(d)}'>${nomeTipo(d).toUpperCase()}</span>`; }).join(' / ')}</b>
        <em>${fracos} fraquezas · ${resiste} resistências</em></div><div class='bars'>${barras}</div></div>`;
      /* pokémon com essa combinação */
      var alvo = def.slice().sort().join('|');
      var poks = K.LISTA.filter(function (p) { return p.padrao && p.t.slice().sort().join('|') === alvo; });
      var mostra = poks.slice(0, 11).map(function (p) {
        return `<div class='pk' title='${K.esc(p.nome)}'><img loading='lazy' src='${K.URL.sprite(p.id)}'/><span>${K.esc(p.nome)}</span></div>`;
      }).join('');
      defesa += `<div class='sec'><div class='sec-tit'>POKÉMON COM ESSA DEFESA <em>${poks.length} encontrados</em></div>
        <div class='pks'>${mostra || `<span class='vazio'>Nenhum Pokémon tem exatamente essa combinação.</span>`}${poks.length > 11 ? `<div class='pk mais'>+${poks.length - 11}</div>` : ''}</div></div>`;
    }
    return conf + ataque + defesa;
  }
  function render() {
    raiz.innerHTML = `<div class='pk-palco tipos'>
      <div class='topo'><div class='leg'><span><i class='c2'></i>Dano dobrado</span><span><i class='cm'></i>Metade</span><span><i class='c0'></i>Sem efeito</span><span><i class='c1'></i>Normal</span></div>
        <div class='titulo'><b>TIPOS</b><span>quem ganha de quem</span></div></div>
      <div class='painel-m vidro'><div class='pm-tit'>MATRIZ DE EFETIVIDADE <em>clique numa linha para o atacante e em até 2 colunas para o defensor</em></div>
        <div class='matriz' id='tp-matriz'>${matrizHtml()}</div></div>
      <div class='painel-d vidro' id='tp-det'>${detalheHtml()}</div></div>`;
    K.escala(raiz);
    var m = $('tp-matriz');
    m.onmouseover = function (ev) {
      var c = ev.target.closest('.cel'); if (!c) { return; }
      var a = c.getAttribute('data-a'), d = c.getAttribute('data-d');
      m.querySelectorAll('.hl').forEach(function (x) { x.classList.remove('hl'); });
      m.querySelectorAll(`.cel[data-a='${a}'], .cel[data-d='${d}']`).forEach(function (x) { x.classList.add('hl'); });
    };
    m.onmouseleave = function () { m.querySelectorAll('.hl').forEach(function (x) { x.classList.remove('hl'); }); };
  }
  raiz.onclick = function (ev) {
    var cel = ev.target.closest('.cel');
    if (cel) { S.atk = cel.getAttribute('data-a'); S.def = [cel.getAttribute('data-d')]; render(); return; }
    var el = ev.target.closest('[data-acao]'); if (!el) { return; }
    var t = el.getAttribute('data-t');
    if (el.getAttribute('data-acao') === 'atk') { S.atk = t; }
    else {
      var i = S.def.indexOf(t);
      if (i >= 0) { S.def.splice(i, 1); } else { S.def.push(t); if (S.def.length > 2) { S.def.shift(); } }
    }
    render();
  };
  if (!window.__tiposResize) { window.__tiposResize = true; window.addEventListener('resize', function () { K.escala(raiz); }); }
  render();
})();
