/* Arena Pokémon: batalhas 1x1 e Time de 3 (com troca) dentro do visual HTML Content.
   Usa window.PK (comum.js). O estado fica em window.__arena: se o Power BI redesenhar
   o visual, a batalha continua de onde parou. Não use aspas duplas neste arquivo. */
(function () {
  var K = window.PK, raiz = document.getElementById('app-raiz');
  if (!K || !raiz) { return; }
  var D = K.D, P = K.P, LISTA = K.LISTA, esc = K.esc, corTipo = K.corTipo, nomeTipo = K.nomeTipo, icone = K.icone;
  var NIVEL = 50;

  /* ================= REGRAS ================= */
  var G = {};
  D.gp.forEach(function (r) { G[r[0] + '|' + r[1] + '|' + r[2]] = { t: r[0], c: r[1], papel: r[2], nome: r[3], pw: r[4], ac: r[5], pr: r[6] }; });
  function golpe(t, c, papel) { return G[t + '|' + c + '|' + papel] || G[t + '|' + (c === 'F' ? 'E' : 'F') + '|' + papel] || null; }
  function golpesDe(p) {
    var cat = p.b.atk >= p.b.spa ? 'F' : 'E', outra = cat === 'F' ? 'E' : 'F', t1 = p.t[0], t2 = p.t[1];
    var lista = [golpe(t1, cat, 'forte'), t2 ? golpe(t2, cat, 'forte') : golpe(t1, outra, 'forte'), golpe(t1, cat, 'medio'),
      G[t1 + '|F|prio'] || (t2 && G[t2 + '|F|prio']) || G['normal|F|prio'], golpe('normal', cat, 'forte'), golpe('normal', cat, 'medio')];
    var vistos = {}, out = [];
    lista.forEach(function (g) { if (g && !vistos[g.nome] && out.length < 4) { vistos[g.nome] = 1; out.push(g); } });
    return out;
  }
  function statusDe(b) {
    var f = function (x) { return Math.floor((2 * x + 31) * NIVEL / 100) + 5; };
    return { hp: Math.floor((2 * b.hp + 31) * NIVEL / 100) + NIVEL + 10, atk: f(b.atk), def: f(b.def), spa: f(b.spa), spd: f(b.spd), spe: f(b.spe) };
  }
  function lutador(id) { var p = P[id], st = statusDe(p.b); return { p: p, st: st, hpMax: st.hp, hp: st.hp, golpes: golpesDe(p) }; }
  function novoLado(ids) { return { time: ids.map(lutador), ativo: 0 }; }
  function ativo(l) { return l.time[l.ativo]; }
  function vivos(l) { return l.time.filter(function (m) { return m.hp > 0; }); }

  /* ---------- Mega Evolução e Gigantamax (uma transformação por time) ---------- */
  function formasDe(p, tipo) {
    var chave = tipo === 'mega' ? ' Mega' : ' Gigantamax';
    return LISTA.filter(function (x) { return x.esp === p.esp && !x.padrao && x.nome.indexOf(chave) > 0; });
  }
  function opcoesTransformar(l) {
    var m = ativo(l);
    if (l.transformou || m.hp <= 0 || m.base) { return []; }
    return formasDe(m.p, 'mega').map(function (f) { return { tipo: 'mega', p: f }; })
      .concat(formasDe(m.p, 'gmax').map(function (f) { return { tipo: 'gmax', p: f }; }));
  }
  function aplicarForma(m, op) {
    var razao = m.hp / m.hpMax;
    m.base = m.p; m.forma = op.tipo; m.p = op.p; m.st = statusDe(op.p.b); m.hpMax = m.st.hp; m.golpes = golpesDe(op.p);
    if (op.tipo === 'gmax') {
      m.hpMax *= 2; m.gmax = 3;
      m.golpes = m.golpes.map(function (g) { return { t: g.t, c: g.c, papel: g.papel, nome: 'Max ' + nomeTipo(g.t), pw: Math.round(g.pw * 1.3), ac: 0, pr: 0 }; });
    }
    m.hp = Math.max(1, Math.round(razao * m.hpMax));
  }
  function desfazerGmax(m) {
    var razao = m.hp / m.hpMax, p = m.base;
    m.p = p; m.st = statusDe(p.b); m.hpMax = m.st.hp; m.golpes = golpesDe(p); m.gmax = 0; m.base = null; m.forma = null;
    m.hp = m.hp <= 0 ? 0 : Math.max(1, Math.round(razao * m.hpMax));
  }
  function rotuloForma(op) {
    if (op.tipo === 'gmax') { return '🔴 Gigantamax'; }
    var sufixo = op.p.nome.split(' Mega')[1] || '';
    return '💎 Mega Evoluir' + (sufixo.trim() ? ' ' + sufixo.trim() : '');
  }
  function efTotal(tipo, alvo) { return K.efTotal(tipo, alvo.t); }
  function danoBase(a, d, g) {
    var A = g.c === 'F' ? a.st.atk : a.st.spa, Df = g.c === 'F' ? d.st.def : d.st.spd;
    return Math.floor(Math.floor(Math.floor(2 * NIVEL / 5 + 2) * g.pw * A / Df) / 50) + 2;
  }
  function calcular(a, d, g) {
    var e = efTotal(g.t, d.p);
    if (!(g.ac === 0 || Math.random() * 100 < g.ac)) { return { erro: true, dano: 0, ef: e, crit: false }; }
    var stab = a.p.t.indexOf(g.t) >= 0 ? 1.5 : 1, crit = Math.random() < 1 / 24;
    var dano = e === 0 ? 0 : Math.max(1, Math.floor(danoBase(a, d, g) * stab * e * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15)));
    return { erro: false, dano: dano, ef: e, crit: crit };
  }
  function esperado(a, d, g) {
    var stab = a.p.t.indexOf(g.t) >= 0 ? 1.5 : 1;
    return danoBase(a, d, g) * stab * efTotal(g.t, d.p) * (g.ac === 0 ? 1 : g.ac / 100) * 0.925;
  }
  function melhorEsperado(a, d) { return Math.max.apply(null, a.golpes.map(function (g) { return esperado(a, d, g); })); }
  function iaGolpe(a, d) {
    var rapido = a.st.spe >= d.st.spe, melhor = 0, nota = -1;
    a.golpes.forEach(function (g, i) {
      var v = esperado(a, d, g);
      if (g.pr > 0 && !rapido && v >= d.hp) { v += 1000; }
      v *= 0.9 + Math.random() * 0.2;
      if (v > nota) { nota = v; melhor = i; }
    });
    return melhor;
  }
  function iaMelhorReserva(l, foe) {
    var melhor = -1, nota = -1e9;
    l.time.forEach(function (m, i) {
      if (m.hp <= 0 || i === l.ativo) { return; }
      var v = melhorEsperado(m, foe) / foe.hp - melhorEsperado(foe, m) / m.hp;
      if (v > nota) { nota = v; melhor = i; }
    });
    return melhor;
  }
  function iaAcao(l, foeLado) {
    var eu = ativo(l), foe = ativo(foeLado);
    if (vivos(l).length > 1) {
      var ameaca = melhorEsperado(foe, eu) / eu.hp, forca = melhorEsperado(eu, foe) / foe.hp;
      if (ameaca >= 0.9 && forca < 0.6 && Math.random() < 0.45) {
        var r = iaMelhorReserva(l, foe);
        if (r >= 0 && melhorEsperado(foe, l.time[r]) / l.time[r].hp < ameaca * 0.6) { return { tipo: 'troca', idx: r }; }
      }
    }
    return { tipo: 'golpe', idx: iaGolpe(eu, foe) };
  }
  function ordem(B, aj, ao) {
    var acoes = [{ lado: 'j', a: aj }, { lado: 'o', a: ao }];
    function chave(x) {
      if (x.a.tipo === 'troca') { return [10, 0]; }
      var m = ativo(B[x.lado]);
      return [m.golpes[x.a.idx].pr, m.st.spe + Math.random() * 0.1];
    }
    acoes.sort(function (x, y) { var a = chave(x), b = chave(y); return b[0] - a[0] || b[1] - a[1]; });
    return acoes;
  }
  function simular(idsJ, idsO) {
    var B = { j: novoLado(idsJ), o: novoLado(idsO) }, turnos = 0;
    while (vivos(B.j).length && vivos(B.o).length && turnos < 300) {
      turnos++;
      var acoes = ordem(B, iaAcao(B.j, B.o), iaAcao(B.o, B.j));
      for (var k = 0; k < acoes.length; k++) {
        var lado = acoes[k].lado, foe = lado === 'j' ? 'o' : 'j', ac = acoes[k].a;
        if (ac.tipo === 'troca') { B[lado].ativo = ac.idx; continue; }
        var a = ativo(B[lado]), d = ativo(B[foe]);
        if (a.hp <= 0) { continue; }
        d.hp = Math.max(0, d.hp - calcular(a, d, a.golpes[ac.idx]).dano);
        if (d.hp <= 0) { var r = iaMelhorReserva(B[foe], ativo(B[lado])); if (r >= 0) { B[foe].ativo = r; } break; }
      }
    }
    return { venc: vivos(B.j).length ? 'j' : 'o', turnos: turnos };
  }
  function rodarSimulacoes(n) {
    var vj = 0, tt = 0;
    for (var i = 0; i < n; i++) { var r = simular(S.time.j, S.time.o); if (r.venc === 'j') { vj++; } tt += r.turnos; }
    return { j: 100 * vj / n, o: 100 - 100 * vj / n, turnos: tt / n, n: n };
  }

  /* ================= ESTADO ================= */
  var S = window.__arena;
  if (!S || S.versao !== D.v) {
    S = window.__arena = { versao: D.v, tela: 'selecao', modo: 3, lado: 'j', time: { j: [], o: [] }, busca: '', tipo: '', gen: 0,
      B: null, log: [], msg: '', ocupado: false, auto: false, sim: null, previa: null, escolha: null, fim: null };
  }
  function $(id) { return document.getElementById(id); }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function tamanhoTime() { return S.modo === 1 ? 1 : 3; }

  /* ================= SELEÇÃO ================= */
  function slotHtml(l, i) {
    var id = S.time[l][i];
    if (!id) { return `<div class='sl sl-vazio' data-acao='lado' data-lado='${l}'><b>+</b><span>Escolher Pokémon</span></div>`; }
    var p = P[id];
    return `<div class='sl sl-cheio' style='--c:${corTipo(p.t[0])}'>
      <div class='sl-arte'>${K.img([K.URL.arte(id), K.URL.home(id)])}</div>
      <div class='sl-info'><b>${esc(p.nome)}</b><div class='sl-tipos'>${p.t.map(K.chip).join('')}</div><span>Total base ${p.total}</span></div>
      <i data-acao='tirar' data-lado='${l}' data-i='${i}'>×</i></div>`;
  }
  function colunaHtml(l, titulo) {
    var slots = '';
    for (var i = 0; i < tamanhoTime(); i++) { slots += slotHtml(l, i); }
    return `<div class='sel-col sel-col-${l}${S.lado === l ? ' ativo' : ''}' data-acao='lado' data-lado='${l}'>
      <div class='sel-col-tit'><span>${titulo}</span><em>${S.time[l].length}/${tamanhoTime()}</em></div>
      <div class='sel-slots m${tamanhoTime()}'>${slots}</div>
      <div class='bt bt-sec' data-acao='aleatorio' data-lado='${l}'>🎲 Sortear time</div></div>`;
  }
  function filtrados() {
    var b = K.normalizar(S.busca);
    return LISTA.filter(function (p) {
      return (!b || K.normalizar(p.nome).indexOf(b) >= 0 || String(p.esp) === b) && (!S.tipo || p.t.indexOf(S.tipo) >= 0) && (!S.gen || p.gen === S.gen);
    });
  }
  function gradeHtml() {
    var itens = filtrados(), total = itens.length;
    var html = itens.slice(0, 210).map(function (p) {
      var no = S.time.j.indexOf(p.id) >= 0 ? ' no-j' : S.time.o.indexOf(p.id) >= 0 ? ' no-o' : '';
      return `<div class='cd${no}' data-acao='add' data-id='${p.id}' style='--c:${corTipo(p.t[0])}'>
        <img loading='lazy' src='${K.URL.sprite(p.id)}'/><span>${esc(p.nome)}</span><em>${p.t.map(function (t) { return icone(t, 13); }).join('')}</em></div>`;
    }).join('');
    if (total > 210) { html += `<div class='cd-mais'>+${total - 210} Pokémon — refine a busca</div>`; }
    return html || `<div class='cd-mais'>Nenhum Pokémon encontrado</div>`;
  }
  function previaHtml() {
    var cheio = S.time.j.length === tamanhoTime() && S.time.o.length === tamanhoTime();
    if (!cheio) { return `<span class='pv-dica'>Clique num lado e escolha os Pokémon na grade · nível 50 · golpes definidos pelos tipos</span>`; }
    var chave = S.modo + ':' + S.time.j.join(',') + 'x' + S.time.o.join(',');
    if (!S.previa || S.previa.chave !== chave) { S.previa = rodarSimulacoes(300); S.previa.chave = chave; }
    var pj = S.previa.j;
    return `<div class='pv'><span class='pv-tit'>PREVISÃO</span>
      <div class='pv-barra'><div class='pv-j' style='width:${pj}%'>${pj.toFixed(0)}%</div><div class='pv-o'>${(100 - pj).toFixed(0)}%</div></div>
      <span class='pv-tx'>${pj >= 60 ? 'Seu time é favorito' : pj <= 40 ? 'O oponente é favorito' : 'Confronto equilibrado'}</span></div>`;
  }
  function telaSelecao() {
    var cheio = S.time.j.length === tamanhoTime() && S.time.o.length === tamanhoTime();
    var chips = K.TIPOS.map(function (t) {
      return `<span class='tc${S.tipo === t ? ' on' : ''}' data-acao='tipo' data-t='${t}' title='${nomeTipo(t)}' style='--c:${corTipo(t)}'>${icone(t, 22)}</span>`;
    }).join('');
    var gens = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (g) {
      return `<span class='gc${S.gen === g ? ' on' : ''}' data-acao='gen' data-g='${g}'>${g ? 'Gen ' + g : 'Todas'}</span>`;
    }).join('');
    return `<div class='pk-palco sel'>
      <div class='sel-bg'></div>
      <div class='topo'><div class='modos'>
        <span class='${S.modo === 1 ? 'on' : ''}' data-acao='modo' data-m='1'>⚔ 1 x 1</span>
        <span class='${S.modo === 3 ? 'on' : ''}' data-acao='modo' data-m='3'>🛡 Time de 3</span></div>
        <div class='titulo'><b>ARENA</b><span>monte os times e batalhe</span></div></div>
      ${colunaHtml('j', 'SEU TIME')}
      <div class='sel-meio'>
        <input id='ar-busca' class='busca' placeholder='🔍  Buscar Pokémon pelo nome ou número...' value='${esc(S.busca)}'/>
        <div class='gens'>${gens}</div>
        <div class='tcs'>${chips}</div>
        <div id='ar-grade' class='grade'>${gradeHtml()}</div>
      </div>
      ${colunaHtml('o', 'OPONENTE')}
      <div class='sel-rodape'><div id='ar-previa'>${previaHtml()}</div>
        <div class='bt bt-go${cheio ? '' : ' off'}' data-acao='batalhar'>⚔ BATALHAR!</div></div>
    </div>`;
  }

  /* ================= BATALHA ================= */
  function hpClasse(m) { var p = m.hp / m.hpMax; return p > 0.5 ? 'ok' : p > 0.2 ? 'med' : 'baixo'; }
  function barraTopo(lado) {
    var l = S.B[lado], m = ativo(l), pct = 100 * m.hp / m.hpMax;
    var bolas = S.modo === 3 ? `<span class='bolas'>${l.time.map(function (x, i) { return `<i class='${x.hp <= 0 ? 'ko' : i === l.ativo ? 'at' : ''}'></i>`; }).join('')}</span>` : '';
    return `<div class='hud hud-${lado}'>
      <div class='hud-foto' style='--c:${corTipo(m.p.t[0])}'>${K.img([K.URL.home(m.p.id), K.URL.sprite(m.p.id)])}</div>
      <div class='hud-corpo'>
        <div class='hud-nome'><b>${esc(m.p.nome)}</b>${m.p.t.map(function (t) { return icone(t, 16); }).join('')}<span>Nv. ${NIVEL}</span>${m.gmax > 0 ? `<em class='gmax-t'>G-MAX ${m.gmax}</em>` : ''}${bolas}</div>
        <div class='hp'><div class='hp-fant' id='hpg-${lado}' style='width:${pct}%'></div><div class='hp-f ${hpClasse(m)}' id='hpf-${lado}' style='width:${pct}%'></div></div>
        <div class='hp-tx' id='hpt-${lado}'>${m.hp} / ${m.hpMax} HP</div>
      </div></div>`;
  }
  function cartaLado(lado) {
    var l = S.B[lado], m = ativo(l), p = m.p, max = 160;
    var stats = [['Vida', p.b.hp], ['Ataque', p.b.atk], ['Defesa', p.b.def], ['Atq. Esp.', p.b.spa], ['Def. Esp.', p.b.spd], ['Veloc.', p.b.spe]].map(function (s) {
      return `<div class='st'><span>${s[0]}</span><div><i style='width:${Math.min(100, 100 * s[1] / max)}%;background:${corTipo(p.t[0])}'></i></div><b>${s[1]}</b></div>`;
    }).join('');
    var time = '';
    if (S.modo === 3) {
      time = `<div class='tm-tit'>${lado === 'j' ? 'SEU TIME · clique para trocar' : 'TIME DO OPONENTE'}</div>` + l.time.map(function (x, i) {
        var pode = lado === 'j' && x.hp > 0 && i !== l.ativo && !S.ocupado && !S.fim && !S.auto;
        return `<div class='tm${i === l.ativo ? ' at' : ''}${x.hp <= 0 ? ' ko' : ''}${pode ? ' pode' : ''}' ${pode ? `data-acao='trocar' data-i='${i}'` : ''}>
          <img src='${K.URL.sprite(x.p.id)}'/><div><b>${esc(x.p.nome)}</b><div class='hp mini'><div class='hp-f ${hpClasse(x)}' style='width:${100 * x.hp / x.hpMax}%'></div></div></div></div>`;
      }).join('');
    }
    return `<div class='carta carta-${lado}' style='--c:${corTipo(p.t[0])}'>
      <div class='carta-rot'>${lado === 'j' ? 'VOCÊ' : 'OPONENTE'}</div>
      <div class='carta-arte'><div class='holo'></div>${K.img([K.URL.arte(p.id), K.URL.home(p.id)])}</div>
      <div class='carta-nome'>${esc(p.nome)}</div><div class='carta-tipos'>${p.t.map(K.chip).join('')}</div>
      <div class='sts'>${stats}</div>${time}</div>`;
  }
  function golpesHtml() {
    var eu = ativo(S.B.j), foe = ativo(S.B.o), trava = S.ocupado || S.auto || !!S.fim || !!S.escolha;
    return eu.golpes.map(function (g, i) {
      var e = efTotal(g.t, foe.p);
      var tag = e === 0 ? ['nul', 'sem efeito'] : e >= 2 ? ['sup', 'super efetivo ×' + e] : e < 1 ? ['pou', 'pouco efetivo ×' + K.fmtEf(e)] : ['nor', 'normal'];
      return `<div class='gp${trava ? ' off' : ''}' data-acao='golpe' data-i='${i}' style='--c:${corTipo(g.t)}'>
        <div class='gp-ico'>${icone(g.t, 30)}</div>
        <div class='gp-tx'><b>${esc(g.nome)}</b><span>${g.c === 'F' ? 'Físico' : 'Especial'} · Poder ${g.pw} · ${g.ac ? g.ac + '%' : 'nunca erra'}${g.pr > 0 ? ' · ⚡ prioridade' : ''}</span></div>
        <em class='ef ef-${tag[0]}'>${tag[1]}</em></div>`;
    }).join('');
  }
  function logHtml() { return S.log.slice(-60).map(function (x) { return `<div>${x}</div>`; }).join(''); }
  function simHtml() {
    if (!S.sim) { return ''; }
    return `<div class='pv-barra'><div class='pv-j' style='width:${S.sim.j}%'>Você ${S.sim.j.toFixed(1)}%</div><div class='pv-o'>${S.sim.o.toFixed(1)}%</div></div>
      <div class='sim-tx'>1.000 batalhas simuladas · média de ${S.sim.turnos.toFixed(1)} turnos</div>`;
  }
  function overlayHtml() {
    var B = S.B;
    if (S.escolha === 'forcada') {
      var cards = B.j.time.map(function (m, i) {
        var pode = m.hp > 0 && i !== B.j.ativo;
        return `<div class='tc-card${pode ? '' : ' off'}' ${pode ? `data-acao='trocar' data-i='${i}'` : ''} style='--c:${corTipo(m.p.t[0])}'>
          ${K.img([K.URL.home(m.p.id), K.URL.sprite(m.p.id)])}<b>${esc(m.p.nome)}</b>
          <div class='hp mini'><div class='hp-f ${hpClasse(m)}' style='width:${100 * m.hp / m.hpMax}%'></div></div><span>${m.hp} / ${m.hpMax}</span></div>`;
      }).join('');
      return `<div class='ov'><div class='ov-box'><div class='ov-tit'>${esc(ativo(B.j).p.nome)} desmaiou! Escolha o próximo</div><div class='tc-cards'>${cards}</div></div></div>`;
    }
    if (S.fim) {
      var win = S.fim === 'j', conf = '';
      if (win) { for (var i = 0; i < 60; i++) { conf += `<i style='left:${(i * 37) % 100}%;background:${corTipo(K.TIPOS[i % 18])};animation-delay:${((i * 13) % 20) / 10}s;animation-duration:${2 + ((i * 7) % 15) / 10}s'></i>`; } }
      return `<div class='ov'><div class='confete'>${conf}</div><div class='ov-box fim ${win ? 'win' : 'lose'}'>
        <div class='fim-tit'>${win ? 'VITÓRIA!' : 'DERROTA'}</div>
        <div class='fim-sub'>${win ? 'Seu time venceu a batalha!' : 'O oponente venceu desta vez.'}</div>
        <div class='fim-bts'><div class='bt bt-go' data-acao='revanche'>↻ REVANCHE</div><div class='bt bt-sec' data-acao='novo'>Novos times</div></div>
      </div></div>`;
    }
    return '';
  }
  function telaBatalha() {
    var B = S.B, eu = ativo(B.j), foe = ativo(B.o), tj = eu.p.t[0], to = foe.p.t[0];
    return `<div class='pk-palco bat' id='ar-palco'>
      <div class='campo campo-o' style='--c:${corTipo(to)}'>${K.particulas(to, 18, 3)}</div>
      <div class='campo campo-j' style='--c:${corTipo(tj)}'>${K.particulas(tj, 18, 11)}</div>
      <div class='campo-luz'></div><div class='diag'></div>
      <div class='vs'><span>VS</span></div>
      <div class='plat plat-o' style='--c:${corTipo(to)}'></div><div class='plat plat-j' style='--c:${corTipo(tj)}'></div>
      <div class='mon mon-o${foe.gmax > 0 ? ' gmax' : ''}' id='mon-o'>${K.img([K.URL.gif(foe.p.id), K.URL.home(foe.p.id)], 'spr')}</div>
      <div class='mon mon-j${eu.gmax > 0 ? ' gmax' : ''}' id='mon-j'>${K.img([K.URL.costas(eu.p.id), K.URL.gif(eu.p.id), K.URL.home(eu.p.id)], 'spr')}</div>
      ${barraTopo('j')}${barraTopo('o')}
      ${cartaLado('j')}${cartaLado('o')}
      <div class='msg' id='ar-msg'><span>${S.msg || 'O que <b>' + esc(eu.p.nome) + '</b> vai fazer?'}</span></div>
      <div id='ar-fx' class='efx'></div>
      <div class='painel'>
        <div class='gps' id='ar-golpes'>${golpesHtml()}</div>
        <div class='acoes'>
          ${opcoesTransformar(B.j).map(function (op, i) { return `<div class='bt bt-mega ${op.tipo}${S.ocupado || S.auto || S.fim || S.escolha ? ' off' : ''}' data-acao='transformar' data-i='${i}'>${rotuloForma(op)}</div>`; }).join('')}
          <div class='bt bt-sec${S.auto ? ' on' : ''}' data-acao='auto'>${S.auto ? '⏸ Automático' : '▶ Automático'}</div>
          <div class='bt bt-gold' data-acao='simular'>🎲 Simular ×1000</div>
          <div class='bt bt-sec' data-acao='novo'>Sair</div>
          <div class='sim' id='ar-sim'>${simHtml()}</div>
        </div>
        <div class='logbox'><div class='log-tit'>REGISTRO</div><div class='log' id='ar-log'>${logHtml()}</div></div>
      </div>
      ${overlayHtml()}
    </div>`;
  }

  /* ================= RENDER ================= */
  function render() {
    raiz.innerHTML = S.tela === 'batalha' && S.B ? telaBatalha() : telaSelecao();
    K.escala(raiz);
    var log = $('ar-log'); if (log) { log.scrollTop = log.scrollHeight; }
    var busca = $('ar-busca');
    if (busca) { busca.addEventListener('input', function () { S.busca = busca.value; $('ar-grade').innerHTML = gradeHtml(); }); }
  }
  function registrar(txt) { S.log.push(txt); var log = $('ar-log'); if (log) { log.innerHTML = logHtml(); log.scrollTop = log.scrollHeight; } }
  function mensagem(txt) { S.msg = txt; var m = $('ar-msg'); if (m) { m.innerHTML = '<span>' + txt + '</span>'; m.classList.remove('nova'); void m.offsetWidth; m.classList.add('nova'); } }

  /* ================= EFEITOS POR TIPO ================= */
  var FX = {
    fire: ['chama', 'explosao'], water: ['bolha', 'respingo'], grass: ['folha', 'folhas'], electric: [null, 'raio'],
    ice: ['cristal', 'gelo'], fighting: [null, 'soco'], poison: ['bolha', 'nuvem'], ground: [null, 'tremor'],
    flying: [null, 'vento'], psychic: ['orbe', 'aneis'], bug: [null, 'corte'], rock: [null, 'pedras'],
    ghost: ['sombra', 'sombra'], dragon: ['feixe', 'explosao'], dark: [null, 'corte'], steel: [null, 'corte'],
    fairy: ['estrela', 'brilho'], normal: [null, 'estrela']
  };
  function centro(lado) { return lado === 'j' ? { x: 470, y: 400 } : { x: 830, y: 250 }; }
  function particula(cls, x, y, cor, dx, dy, dur, extra) {
    var fx = $('ar-fx'); if (!fx) { return; }
    var el = document.createElement('i');
    el.className = 'pt ' + cls; el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.setProperty('--c', cor); el.style.setProperty('--dx', dx + 'px'); el.style.setProperty('--dy', dy + 'px');
    el.style.animationDuration = dur + 'ms';
    if (extra) { extra(el); }
    fx.appendChild(el); setTimeout(function () { el.remove(); }, dur + 60);
  }
  function balancar(forte) {
    var pc = $('ar-palco'); if (!pc) { return; }
    pc.classList.remove('treme', 'treme-forte'); void pc.offsetWidth; pc.classList.add(forte ? 'treme-forte' : 'treme');
  }
  async function projetil(de, para, tipo) {
    var forma = FX[tipo][0], a = centro(de), b = centro(para), cor = corTipo(tipo);
    if (forma === 'feixe') {
      var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, dist = Math.hypot(b.x - a.x, b.y - a.y);
      particula('feixe', a.x, a.y, cor, 0, 0, 650, function (el) { el.style.width = dist + 'px'; el.style.transform = 'rotate(' + ang + 'deg)'; });
      await esperar(380); return;
    }
    for (var i = 0; i < 14; i++) {
      (function (i) {
        setTimeout(function () {
          particula('p-' + forma, a.x + (Math.random() * 30 - 15), a.y + (Math.random() * 30 - 15), cor,
            b.x - a.x + (Math.random() * 50 - 25), b.y - a.y + (Math.random() * 50 - 25), 520);
        }, i * 28);
      })(i);
    }
    await esperar(560);
  }
  function impacto(lado, tipo, forte) {
    var forma = FX[tipo][1], c = centro(lado), cor = corTipo(tipo), i;
    particula('anel', c.x, c.y, cor, 0, 0, 550);
    if (forma === 'raio') {
      for (i = 0; i < 3; i++) { (function (i) { setTimeout(function () { particula('raio', c.x + (i - 1) * 34, c.y - 230, cor, 0, 0, 420); }, i * 90); })(i); }
      particula('flash', 640, 360, '#FFF6A0', 0, 0, 380);
    } else if (forma === 'tremor') {
      balancar(true);
      for (i = 0; i < 14; i++) { particula('poeira', c.x + (Math.random() * 160 - 80), c.y + 50, cor, Math.random() * 80 - 40, -40 - Math.random() * 60, 800); }
    } else if (forma === 'pedras') {
      for (i = 0; i < 7; i++) { (function (i) { setTimeout(function () { particula('pedra', c.x + (Math.random() * 120 - 60), c.y - 260, cor, 0, 250, 520); }, i * 70); })(i); }
    } else if (forma === 'corte') {
      for (i = 0; i < 3; i++) { (function (i) { setTimeout(function () { particula('corte', c.x, c.y + (i - 1) * 26, cor, 0, 0, 380, function (el) { el.style.transform = 'translate(-50%,-50%) rotate(' + (-35 + i * 25) + 'deg)'; }); }, i * 80); })(i); }
    } else if (forma === 'aneis') {
      for (i = 0; i < 4; i++) { (function (i) { setTimeout(function () { particula('anel grande', c.x, c.y, cor, 0, 0, 700); }, i * 110); })(i); }
    } else if (forma === 'vento') {
      for (i = 0; i < 6; i++) { particula('vento', c.x - 120, c.y + (Math.random() * 120 - 60), cor, 240, Math.random() * 30 - 15, 520 + i * 40); }
    } else if (forma === 'soco' || forma === 'estrela') {
      particula('estrelao', c.x, c.y, cor, 0, 0, 500);
    } else {
      var shape = { explosao: 'p-chama', respingo: 'p-gota', folhas: 'p-folha', gelo: 'p-cristal', nuvem: 'p-nuvem', sombra: 'p-sombra', brilho: 'p-estrela' }[forma] || 'p-chama';
      for (i = 0; i < 18; i++) {
        var ang = Math.random() * Math.PI * 2, d = 50 + Math.random() * 80;
        particula(shape, c.x, c.y, cor, Math.cos(ang) * d, Math.sin(ang) * d, 650);
      }
    }
    if (forte) { balancar(false); }
  }
  async function animarAtaque(lado, foe, g) {
    var mon = $('mon-' + lado);
    if (g.c === 'F' || !FX[g.t][0]) {
      if (mon) { mon.classList.add('investe-' + lado); }
      await esperar(230);
      if (mon) { mon.classList.remove('investe-' + lado); }
    } else {
      if (mon) { mon.classList.add('carrega'); }
      await projetil(lado, foe, g.t);
      if (mon) { mon.classList.remove('carrega'); }
    }
  }
  function textoFx(txt, cls, lado) {
    var fx = $('ar-fx'); if (!fx) { return; }
    var c = centro(lado), el = document.createElement('div');
    el.className = 'tx ' + cls; el.textContent = txt; el.style.left = c.x + 'px'; el.style.top = (c.y - 60) + 'px';
    fx.appendChild(el); setTimeout(function () { el.remove(); }, 1500);
  }
  function bannerFx(txt, cls) {
    var fx = $('ar-fx'); if (!fx) { return; }
    var el = document.createElement('div'); el.className = 'banner ' + cls; el.textContent = txt;
    fx.appendChild(el); setTimeout(function () { el.remove(); }, 1500);
  }
  async function animarHp(lado, m) {
    var f = $('hpf-' + lado), g = $('hpg-' + lado), t = $('hpt-' + lado), pct = 100 * m.hp / m.hpMax;
    if (f) { f.style.width = pct + '%'; f.className = 'hp-f ' + hpClasse(m); }
    if (t) { t.textContent = m.hp + ' / ' + m.hpMax + ' HP'; }
    await esperar(450);
    if (g) { g.style.width = pct + '%'; }
    await esperar(250);
  }

  /* ================= TURNO ================= */
  async function usarGolpe(lado, idx) {
    var B = S.B, foe = lado === 'j' ? 'o' : 'j', a = ativo(B[lado]), d = ativo(B[foe]), g = a.golpes[idx];
    var quem = lado === 'j' ? esc(a.p.nome) : esc(a.p.nome) + ' inimigo';
    mensagem(`<b>${quem}</b> usou <span style='color:${corTipo(g.t)}'>${esc(g.nome)}</span>!`);
    registrar(`<b>${esc(a.p.nome)}</b> usou <span style='color:${corTipo(g.t)}'>${esc(g.nome)}</span>`);
    await esperar(350);
    await animarAtaque(lado, foe, g);
    var r = calcular(a, d, g);
    if (r.erro) { textoFx('ERROU!', 'erro', foe); mensagem('Mas errou!'); registrar('Errou!'); await esperar(650); return false; }
    if (r.ef === 0) { bannerFx('NÃO AFETA', 'nul'); mensagem(`Não afeta ${esc(d.p.nome)}...`); registrar('Não afetou.'); await esperar(800); return false; }
    impacto(foe, g.t, r.ef >= 2 || r.crit);
    d.hp = Math.max(0, d.hp - r.dano);
    var mon = $('mon-' + foe); if (mon) { mon.classList.remove('dano'); void mon.offsetWidth; mon.classList.add('dano'); }
    textoFx('-' + r.dano, 'num' + (r.ef >= 2 ? ' sup' : ''), foe);
    if (r.crit) { setTimeout(function () { textoFx('CRÍTICO!', 'crit', foe); }, 150); registrar(`<i class='crit'>Golpe crítico!</i>`); }
    if (r.ef >= 2) { bannerFx('SUPER EFETIVO!', 'sup'); registrar(`<i class='sup'>Foi super efetivo! (×${r.ef})</i>`); }
    else if (r.ef < 1) { bannerFx('pouco efetivo...', 'pou'); registrar(`<i class='pou'>Não foi muito efetivo...</i>`); }
    await animarHp(foe, d);
    if (d.hp <= 0) {
      if (mon) { mon.classList.add('desmaio'); }
      mensagem(`<b>${esc(d.p.nome)}</b> desmaiou!`); registrar(`<b>${esc(d.p.nome)}</b> desmaiou!`);
      await esperar(1000);
      return true;
    }
    return false;
  }
  async function transformar(lado, op) {
    var l = S.B[lado], m = ativo(l), antes = esc(m.p.nome), c = centro(lado);
    l.transformou = true;
    mensagem(op.tipo === 'mega' ? `<b>${antes}</b> está reagindo à Pedra Chave... está Mega Evoluindo!` : `<b>${antes}</b> está ficando gigante!`);
    var mon = $('mon-' + lado); if (mon) { mon.classList.add(op.tipo === 'mega' ? 'mega-anim' : 'gmax-anim'); }
    particula(op.tipo === 'mega' ? 'arco' : 'arco gx', c.x, c.y, '#fff', 0, 0, 1500);
    await esperar(1500);
    particula('flash', 640, 360, op.tipo === 'mega' ? '#FFFFFF' : '#FF2E63', 0, 0, 420);
    aplicarForma(m, op);
    var depois = esc(m.p.nome);
    registrar(op.tipo === 'mega' ? `<i class='crit'>${antes} Mega Evoluiu em ${depois}!</i>` : `<i class='crit'>${antes} usou o Gigantamax! (3 turnos)</i>`);
    S.msg = op.tipo === 'mega' ? `<b>${antes}</b> Mega Evoluiu em <b>${depois}</b>!` : `<b>${antes}</b> ficou gigante!`;
    render();
    bannerFx(op.tipo === 'mega' ? 'MEGA EVOLUÇÃO!' : 'GIGANTAMAX!', op.tipo === 'mega' ? 'mega' : 'gmax');
    var mon2 = $('mon-' + lado); if (mon2) { mon2.classList.add('entra'); }
    await esperar(1100);
  }
  async function reverterGmax(lado) {
    var m = ativo(S.B[lado]), nome = esc(m.base.nome);
    var mon = $('mon-' + lado); if (mon) { mon.classList.add('sai'); }
    await esperar(400);
    desfazerGmax(m);
    S.msg = `<b>${nome}</b> voltou ao tamanho normal.`; registrar(S.msg); render();
    var mon2 = $('mon-' + lado); if (mon2) { mon2.classList.add('entra'); }
    await esperar(700);
  }
  async function entrar(lado, idx) {
    var B = S.B, velho = ativo(B[lado]);
    if (velho.gmax > 0) { desfazerGmax(velho); }
    B[lado].ativo = idx;
    var nome = esc(ativo(B[lado]).p.nome);
    S.msg = lado === 'j' ? `Vai, <b>${nome}</b>!` : `O oponente enviou <b>${nome}</b>!`;
    registrar(S.msg);
    render();
    var mon = $('mon-' + lado); if (mon) { mon.classList.add('entra'); }
    await esperar(700);
  }
  async function aposDesmaio(ladoKO) {
    var B = S.B;
    if (!vivos(B.j).length || !vivos(B.o).length) {
      S.fim = vivos(B.j).length ? 'j' : 'o';
      registrar(S.fim === 'j' ? '<b>Você venceu!</b>' : '<b>O oponente venceu.</b>');
      S.ocupado = false; S.auto = false; render(); return true;
    }
    if (ladoKO === 'o') { await entrar('o', iaMelhorReserva(B.o, ativo(B.j))); }
    else if (S.auto) { await entrar('j', iaMelhorReserva(B.j, ativo(B.o))); }
    else { S.escolha = 'forcada'; S.ocupado = false; render(); return true; }
    return false;
  }
  async function executarTurno(acaoJ) {
    if (S.ocupado || !S.B || S.fim) { return; }
    S.ocupado = true; S.escolha = null; render();
    var B = S.B;
    if (S.auto && opcoesTransformar(B.j).length) { await transformar('j', opcoesTransformar(B.j)[0]); }
    if (opcoesTransformar(B.o).length) { await transformar('o', opcoesTransformar(B.o)[0]); }
    var acoes = ordem(B, acaoJ, iaAcao(B.o, B.j));
    for (var k = 0; k < acoes.length; k++) {
      var lado = acoes[k].lado, ac = acoes[k].a;
      if (ac.tipo === 'troca') {
        mensagem(lado === 'j' ? `<b>${esc(ativo(B.j).p.nome)}</b>, volte!` : `O oponente recolheu <b>${esc(ativo(B.o).p.nome)}</b>.`);
        var sai = $('mon-' + lado); if (sai) { sai.classList.add('sai'); }
        await esperar(450);
        await entrar(lado, ac.idx); continue;
      }
      if (ativo(B[lado]).hp <= 0) { continue; }
      var ko = await usarGolpe(lado, ac.idx);
      if (ko) { if (await aposDesmaio(lado === 'j' ? 'o' : 'j')) { return; } break; }
    }
    for (var lg of ['j', 'o']) {
      var mg = ativo(B[lg]);
      if (mg.gmax > 0 && mg.hp > 0) { mg.gmax--; if (mg.gmax === 0) { await reverterGmax(lg); } }
    }
    S.ocupado = false; S.msg = 'O que <b>' + esc(ativo(B.j).p.nome) + '</b> vai fazer?'; render();
    if (S.auto) { proximoAuto(); }
  }
  function proximoAuto() {
    setTimeout(function () {
      if (!S.auto || S.ocupado || S.fim || S.tela !== 'batalha') { return; }
      executarTurno(iaAcao(S.B.j, S.B.o));
    }, 700);
  }
  async function iniciarBatalha() {
    S.B = { j: novoLado(S.time.j), o: novoLado(S.time.o) };
    S.log = ['A batalha começou!']; S.fim = null; S.escolha = null; S.sim = null; S.ocupado = true;
    S.msg = 'A batalha vai começar!'; S.tela = 'batalha'; render();
    var a = ativo(S.B.j).p, b = ativo(S.B.o).p, fx = $('ar-fx');
    if (fx) {
      var intro = document.createElement('div'); intro.className = 'intro';
      intro.innerHTML = `<div class='intro-j' style='--c:${corTipo(a.t[0])}'>${K.img([K.URL.arte(a.id), K.URL.home(a.id)])}<b>${esc(a.nome)}</b></div>
        <div class='intro-o' style='--c:${corTipo(b.t[0])}'>${K.img([K.URL.arte(b.id), K.URL.home(b.id)])}<b>${esc(b.nome)}</b></div><div class='intro-vs'>VS</div>`;
      fx.appendChild(intro);
      await esperar(1900);
      intro.remove();
    }
    var mj = $('mon-j'), mo = $('mon-o');
    if (mj) { mj.classList.add('entra'); } if (mo) { mo.classList.add('entra'); }
    S.ocupado = false; S.msg = 'O que <b>' + esc(a.nome) + '</b> vai fazer?'; render();
  }

  /* ================= CLIQUES ================= */
  function sortear(l) {
    var base = LISTA.filter(function (p) { return p.padrao; });
    S.time[l] = [];
    while (S.time[l].length < tamanhoTime()) { var id = K.aleatorio(base).id; if (S.time[l].indexOf(id) < 0) { S.time[l].push(id); } }
  }
  raiz.onclick = function (ev) {
    var el = ev.target.closest('[data-acao]'); if (!el || el.classList.contains('off')) { return; }
    var acao = el.getAttribute('data-acao'), l = el.getAttribute('data-lado');
    switch (acao) {
      case 'modo': S.modo = +el.getAttribute('data-m'); ['j', 'o'].forEach(function (x) { S.time[x] = S.time[x].slice(0, tamanhoTime()); }); render(); break;
      case 'lado': S.lado = l; render(); break;
      case 'tipo': var t = el.getAttribute('data-t'); S.tipo = S.tipo === t ? '' : t; render(); break;
      case 'gen': S.gen = +el.getAttribute('data-g'); render(); break;
      case 'add':
        var id = +el.getAttribute('data-id'), lado = S.lado;
        if (S.time[lado].length >= tamanhoTime()) { lado = lado === 'j' ? 'o' : 'j'; }
        if (S.time[lado].length < tamanhoTime() && S.time[lado].indexOf(id) < 0) {
          S.time[lado].push(id);
          if (S.time[lado].length >= tamanhoTime() && lado === 'j') { S.lado = 'o'; } else { S.lado = lado; }
        }
        render(); break;
      case 'tirar': ev.stopPropagation(); S.time[l].splice(+el.getAttribute('data-i'), 1); S.lado = l; render(); break;
      case 'aleatorio': ev.stopPropagation(); sortear(l); render(); break;
      case 'batalhar': iniciarBatalha(); break;
      case 'golpe': executarTurno({ tipo: 'golpe', idx: +el.getAttribute('data-i') }); break;
      case 'trocar':
        var i = +el.getAttribute('data-i');
        if (S.escolha === 'forcada') { S.escolha = null; S.ocupado = true; entrar('j', i).then(function () { S.ocupado = false; S.msg = 'O que <b>' + esc(ativo(S.B.j).p.nome) + '</b> vai fazer?'; render(); }); }
        else { executarTurno({ tipo: 'troca', idx: i }); }
        break;
      case 'transformar':
        var op = opcoesTransformar(S.B.j)[+el.getAttribute('data-i')];
        if (op && !S.ocupado) {
          S.ocupado = true;
          transformar('j', op).then(function () { S.ocupado = false; S.msg = 'O que <b>' + esc(ativo(S.B.j).p.nome) + '</b> vai fazer?'; render(); });
        }
        break;
      case 'auto': S.auto = !S.auto; render(); if (S.auto) { proximoAuto(); } break;
      case 'simular':
        S.sim = rodarSimulacoes(1000);
        registrar(`Simulação: você venceu <b>${S.sim.j.toFixed(1)}%</b> de 1.000 batalhas.`);
        var box = $('ar-sim'); if (box) { box.innerHTML = simHtml(); }
        break;
      case 'revanche': iniciarBatalha(); break;
      case 'novo': S.tela = 'selecao'; S.B = null; S.auto = false; S.fim = null; S.escolha = null; S.ocupado = false; render(); break;
    }
  };
  if (!window.__arenaResize) { window.__arenaResize = true; window.addEventListener('resize', function () { K.escala(raiz); }); }

  window.__arenaApi = { simular: simular, golpesDe: golpesDe, statusDe: statusDe, opcoesTransformar: opcoesTransformar, aplicarForma: aplicarForma, desfazerGmax: desfazerGmax, novoLado: novoLado };
  render();
  if (S.auto && S.tela === 'batalha' && !S.ocupado) { proximoAuto(); }
})();
