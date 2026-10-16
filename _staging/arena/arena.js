/* Arena Pokémon: motor de batalha 1x1 e Time de 3 (com troca), rodando dentro do visual HTML Content.
   Os dados vêm de window.ARENA_DADOS (montado pela medida DAX <HTML> Arena):
     pk: [id, nome, especie, tipo1, tipo2, hp, atk, def, spa, spd, spe, padrao]
     ef: { 'ataque>defesa': fator }   (só fatores diferentes de 1)
     gp: [tipo, categoria F/E, papel forte/medio/prio, nome, poder, precisao (0 = nunca erra), prioridade]
     tp: { slug: [nome PT, cor] }
   O estado fica em window.__arena: se o Power BI redesenhar o visual, a batalha continua.
   Não use aspas duplas neste arquivo (ele vira uma string DAX). */
(function () {
  var D = window.ARENA_DADOS;
  var raiz = document.getElementById('arena-raiz');
  if (!D || !raiz) { return; }

  var NIVEL = 50;
  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

  /* ---------- dados ---------- */
  var P = {}, LISTA = [];
  D.pk.forEach(function (r) {
    var p = { id: r[0], nome: r[1], esp: r[2], t: r[4] ? [r[3], r[4]] : [r[3]],
      b: { hp: r[5], atk: r[6], def: r[7], spa: r[8], spd: r[9], spe: r[10] }, padrao: r[11] === 1 };
    P[p.id] = p; LISTA.push(p);
  });
  var G = {};
  D.gp.forEach(function (r) {
    G[r[0] + '|' + r[1] + '|' + r[2]] = { t: r[0], c: r[1], papel: r[2], nome: r[3], pw: r[4], ac: r[5], pr: r[6] };
  });
  function ef(a, d) { var x = D.ef[a + '>' + d]; return x === undefined ? 1 : x; }
  function efTotal(tipo, alvo) { return alvo.t.reduce(function (m, d) { return m * ef(tipo, d); }, 1); }
  function corTipo(t) { return (D.tp[t] || ['', '#888'])[1]; }
  function nomeTipo(t) { return (D.tp[t] || [t])[0]; }

  /* ---------- golpes de cada Pokémon ---------- */
  function golpe(t, c, papel) {
    return G[t + '|' + c + '|' + papel] || G[t + '|' + (c === 'F' ? 'E' : 'F') + '|' + papel] || null;
  }
  function golpesDe(p) {
    var cat = p.b.atk >= p.b.spa ? 'F' : 'E', outra = cat === 'F' ? 'E' : 'F';
    var t1 = p.t[0], t2 = p.t[1];
    var lista = [
      golpe(t1, cat, 'forte'),
      t2 ? golpe(t2, cat, 'forte') : golpe(t1, outra, 'forte'),
      golpe(t1, cat, 'medio'),
      G[t1 + '|F|prio'] || (t2 && G[t2 + '|F|prio']) || G['normal|F|prio']
    ];
    var vistos = {}, out = [];
    lista.concat([golpe('normal', cat, 'forte'), golpe('normal', cat, 'medio')]).forEach(function (g) {
      if (g && !vistos[g.nome] && out.length < 4) { vistos[g.nome] = 1; out.push(g); }
    });
    return out;
  }

  /* ---------- lutadores ---------- */
  function statusDe(b) {
    var f = function (x) { return Math.floor((2 * x + 31) * NIVEL / 100) + 5; };
    return { hp: Math.floor((2 * b.hp + 31) * NIVEL / 100) + NIVEL + 10, atk: f(b.atk), def: f(b.def), spa: f(b.spa), spd: f(b.spd), spe: f(b.spe) };
  }
  function lutador(id) {
    var p = P[id], st = statusDe(p.b);
    return { p: p, st: st, hpMax: st.hp, hp: st.hp, golpes: golpesDe(p) };
  }
  function novoLado(ids) { return { time: ids.map(lutador), ativo: 0 }; }
  function ativo(l) { return l.time[l.ativo]; }
  function vivos(l) { return l.time.filter(function (m) { return m.hp > 0; }); }

  /* ---------- dano (fórmula oficial, nível 50) ---------- */
  function danoBase(a, d, g) {
    var A = g.c === 'F' ? a.st.atk : a.st.spa, Df = g.c === 'F' ? d.st.def : d.st.spd;
    return Math.floor(Math.floor(Math.floor(2 * NIVEL / 5 + 2) * g.pw * A / Df) / 50) + 2;
  }
  function calcular(a, d, g) {
    var acerto = g.ac === 0 || Math.random() * 100 < g.ac;
    var e = efTotal(g.t, d.p);
    if (!acerto) { return { erro: true, dano: 0, ef: e, crit: false }; }
    var stab = a.p.t.indexOf(g.t) >= 0 ? 1.5 : 1;
    var crit = Math.random() < 1 / 24;
    var dano = e === 0 ? 0 : Math.max(1, Math.floor(danoBase(a, d, g) * stab * e * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15)));
    return { erro: false, dano: dano, ef: e, crit: crit };
  }
  function esperado(a, d, g) {
    var stab = a.p.t.indexOf(g.t) >= 0 ? 1.5 : 1;
    return danoBase(a, d, g) * stab * efTotal(g.t, d.p) * (g.ac === 0 ? 1 : g.ac / 100) * 0.925;
  }
  function melhorEsperado(a, d) { return Math.max.apply(null, a.golpes.map(function (g) { return esperado(a, d, g); })); }

  /* ---------- IA ---------- */
  function iaGolpe(a, d) {
    var maisRapido = a.st.spe >= d.st.spe, melhor = 0, nota = -1;
    a.golpes.forEach(function (g, i) {
      var v = esperado(a, d, g);
      if (g.pr > 0 && !maisRapido && v >= d.hp) { v += 1000; }
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

  /* ---------- ordem do turno ---------- */
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

  /* ---------- simulação rápida (sem animação) ---------- */
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
        if (d.hp <= 0) {
          var r = iaMelhorReserva(B[foe], ativo(B[lado]));
          if (r >= 0) { B[foe].ativo = r; }
          break;
        }
      }
    }
    return { venc: vivos(B.j).length ? 'j' : 'o', turnos: turnos };
  }

  /* ---------- estado ---------- */
  var S = window.__arena;
  if (!S || S.versao !== D.v) {
    S = window.__arena = { versao: D.v, tela: 'selecao', modo: 3, lado: 'j', time: { j: [], o: [] },
      busca: '', tipo: '', B: null, log: [], ocupado: false, auto: false, sim: null, escolha: null };
  }

  /* ---------- utilidades de UI ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, S.rapido ? ms / 3 : ms); }); }
  function sprite(id, costas, cls) {
    var frente = SPR + 'other/showdown/' + id + '.gif';
    var alts = [frente, SPR + 'other/home/' + id + '.png', SPR + 'other/official-artwork/' + id + '.png'];
    var src = costas ? SPR + 'other/showdown/back/' + id + '.gif' : alts.shift();
    return `<img class='${cls || ''}' src='${src}' data-alt='${alts.join('|')}' onerror='arImgErro(this)'/>`;
  }
  window.arImgErro = function (el) {
    var alts = (el.getAttribute('data-alt') || '').split('|').filter(Boolean);
    if (!alts.length) { el.onerror = null; return; }
    el.setAttribute('data-alt', alts.slice(1).join('|'));
    el.src = alts[0];
  };
  function badges(p) {
    return p.t.map(function (t) { return `<span class='ar-tp' style='background:${corTipo(t)}'>${nomeTipo(t)}</span>`; }).join('');
  }
  function escala() {
    var palco = raiz.querySelector('.ar-palco');
    if (!palco) { return; }
    var w = raiz.clientWidth || window.innerWidth, h = raiz.clientHeight || window.innerHeight;
    var s = Math.min(w / 1280, h / 720);
    palco.style.transform = 'translate(' + ((w - 1280 * s) / 2) + 'px,' + ((h - 720 * s) / 2) + 'px) scale(' + s + ')';
  }
  if (!window.__arenaResize) { window.__arenaResize = true; window.addEventListener('resize', function () { escala(); }); }

  /* ================= TELA DE SELEÇÃO ================= */
  function tamanhoTime() { return S.modo === 1 ? 1 : 3; }
  function ajustarTimes() {
    ['j', 'o'].forEach(function (l) { S.time[l] = S.time[l].slice(0, tamanhoTime()); });
  }
  function slotsHtml(l) {
    var html = '';
    for (var i = 0; i < tamanhoTime(); i++) {
      var id = S.time[l][i];
      if (id) {
        var p = P[id];
        html += `<div class='ar-slot ar-cheio' data-acao='tirar' data-lado='${l}' data-i='${i}'>
          <div class='ar-slot-img'>${sprite(id, false)}</div>
          <div class='ar-slot-info'><b>${esc(p.nome)}</b><div>${badges(p)}</div></div><i>×</i></div>`;
      } else {
        html += `<div class='ar-slot ar-vazio' data-acao='lado' data-lado='${l}'><span>+</span>Escolher Pokémon</div>`;
      }
    }
    return html;
  }
  function gradeHtml() {
    var b = S.busca.trim().toLowerCase();
    var itens = LISTA.filter(function (p) {
      return (!b || p.nome.toLowerCase().indexOf(b) >= 0 || String(p.esp) === b) && (!S.tipo || p.t.indexOf(S.tipo) >= 0);
    });
    var total = itens.length;
    itens = itens.slice(0, 240);
    var html = itens.map(function (p) {
      return `<div class='ar-card' data-acao='add' data-id='${p.id}' title='${esc(p.nome)}'>
        <img loading='lazy' src='${SPR + p.id}.png'/><span>${esc(p.nome)}</span></div>`;
    }).join('');
    if (total > itens.length) { html += `<div class='ar-mais'>+${total - itens.length} — refine a busca</div>`; }
    return html || `<div class='ar-mais'>Nenhum Pokémon encontrado</div>`;
  }
  function telaSelecao() {
    var cheio = S.time.j.length === tamanhoTime() && S.time.o.length === tamanhoTime();
    var chips = Object.keys(D.tp).map(function (t) {
      return `<span class='ar-chip${S.tipo === t ? ' on' : ''}' data-acao='tipo' data-t='${t}' style='--c:${corTipo(t)}'>${nomeTipo(t)}</span>`;
    }).join('');
    return `<div class='ar-palco ar-sel'>
      <div class='ar-topo'>
        <div class='ar-titulo'><b>ARENA</b><span>monte os times e batalhe</span></div>
        <div class='ar-modos'>
          <span class='${S.modo === 1 ? 'on' : ''}' data-acao='modo' data-m='1'>1 x 1</span>
          <span class='${S.modo === 3 ? 'on' : ''}' data-acao='modo' data-m='3'>Time de 3</span>
        </div>
      </div>
      <div class='ar-col ar-col-j${S.lado === 'j' ? ' ativo' : ''}' data-acao='lado' data-lado='j'>
        <div class='ar-col-tit'>SEU TIME</div>${slotsHtml('j')}
        <div class='ar-btn ar-btn-sec' data-acao='aleatorio' data-lado='j'>🎲 Aleatório</div>
      </div>
      <div class='ar-meio'>
        <input id='ar-busca' class='ar-busca' placeholder='Buscar Pokémon pelo nome ou número...' value='${esc(S.busca)}'/>
        <div class='ar-chips'>${chips}</div>
        <div id='ar-grade' class='ar-grade'>${gradeHtml()}</div>
      </div>
      <div class='ar-col ar-col-o${S.lado === 'o' ? ' ativo' : ''}' data-acao='lado' data-lado='o'>
        <div class='ar-col-tit'>OPONENTE</div>${slotsHtml('o')}
        <div class='ar-btn ar-btn-sec' data-acao='aleatorio' data-lado='o'>🎲 Aleatório</div>
      </div>
      <div class='ar-rodape'>
        <span class='ar-dica'>Clique num lado e depois nos Pokémon para montar o time. Nível 50, golpes definidos pelos tipos e atributos.</span>
        <div class='ar-btn ar-btn-go${cheio ? '' : ' off'}' data-acao='batalhar'>BATALHAR!</div>
      </div>
    </div>`;
  }

  /* ================= TELA DE BATALHA ================= */
  function hpClasse(m) { var p = m.hp / m.hpMax; return p > 0.5 ? 'ok' : p > 0.2 ? 'med' : 'baixo'; }
  function bolinhas(l) {
    return l.time.map(function (m, i) {
      return `<i class='${m.hp <= 0 ? 'ko' : i === l.ativo ? 'at' : ''}'></i>`;
    }).join('');
  }
  function hudHtml(l, lado) {
    var m = ativo(l);
    return `<div class='ar-hud ar-hud-${lado}' id='ar-hud-${lado}'>
      <div class='ar-hud-top'><b>${esc(m.p.nome)}</b><span>Nv. ${NIVEL}</span></div>
      <div class='ar-hud-tipos'>${badges(m.p)}${S.modo === 3 ? `<span class='ar-bolas'>${bolinhas(l)}</span>` : ''}</div>
      <div class='ar-hp'><div id='ar-hpf-${lado}' class='ar-hp-f ${hpClasse(m)}' style='width:${100 * m.hp / m.hpMax}%'></div></div>
      <div class='ar-hp-tx' id='ar-hpt-${lado}'>${m.hp} / ${m.hpMax}</div>
    </div>`;
  }
  function golpesHtml() {
    var B = S.B, eu = ativo(B.j), foe = ativo(B.o);
    return eu.golpes.map(function (g, i) {
      var e = efTotal(g.t, foe.p);
      var dica = e === 0 ? 'não afeta' : e >= 2 ? 'super efetivo' : e < 1 ? 'pouco efetivo' : 'normal';
      return `<div class='ar-golpe${S.ocupado || S.auto ? ' off' : ''}' data-acao='golpe' data-i='${i}' style='--c:${corTipo(g.t)}'>
        <b>${esc(g.nome)}</b><span>${nomeTipo(g.t)} · ${g.c === 'F' ? 'Físico' : 'Especial'} · Poder ${g.pw}${g.pr > 0 ? ' · prioridade' : ''}</span>
        <em class='ar-ef ar-ef-${e >= 2 ? 'sup' : e === 0 ? 'nul' : e < 1 ? 'pou' : 'nor'}'>${dica}${e !== 1 ? ' ×' + e : ''}</em></div>`;
    }).join('');
  }
  function logHtml() { return S.log.slice(-40).map(function (x) { return `<div>${x}</div>`; }).join(''); }
  function simHtml() {
    if (!S.sim) { return ''; }
    return `<div class='ar-sim'><div class='ar-sim-j' style='width:${S.sim.j}%'>Você ${S.sim.j.toFixed(1)}%</div>
      <div class='ar-sim-o'>${S.sim.o.toFixed(1)}% Oponente</div></div>
      <div class='ar-sim-tx'>1.000 batalhas simuladas · média de ${S.sim.turnos.toFixed(1)} turnos</div>`;
  }
  function overlayHtml() {
    var B = S.B;
    if (S.escolha) {
      var cards = B.j.time.map(function (m, i) {
        var pode = m.hp > 0 && i !== B.j.ativo;
        return `<div class='ar-troca${pode ? '' : ' off'}' data-acao='${pode ? 'trocar' : ''}' data-i='${i}'>
          ${sprite(m.p.id, false)}<b>${esc(m.p.nome)}</b><div>${badges(m.p)}</div>
          <div class='ar-hp'><div class='ar-hp-f ${hpClasse(m)}' style='width:${100 * m.hp / m.hpMax}%'></div></div>
          <span>${m.hp} / ${m.hpMax}</span></div>`;
      }).join('');
      return `<div class='ar-over'><div class='ar-over-box'>
        <div class='ar-over-tit'>${S.escolha === 'forcada' ? 'Escolha o próximo Pokémon' : 'Trocar de Pokémon'}</div>
        <div class='ar-trocas'>${cards}</div>
        ${S.escolha === 'livre' ? `<div class='ar-btn ar-btn-sec' data-acao='cancelar'>Voltar</div>` : ''}
      </div></div>`;
    }
    if (S.fim) {
      var venceu = S.fim === 'j';
      return `<div class='ar-over'><div class='ar-over-box ar-fim ${venceu ? 'win' : 'lose'}'>
        <div class='ar-fim-tit'>${venceu ? 'VITÓRIA!' : 'DERROTA'}</div>
        <div class='ar-fim-sub'>${venceu ? 'Seu time venceu a batalha.' : 'O oponente venceu desta vez.'}</div>
        <div class='ar-fim-btns'><div class='ar-btn ar-btn-go' data-acao='revanche'>REVANCHE</div>
        <div class='ar-btn ar-btn-sec' data-acao='novo'>Novos times</div></div>
      </div></div>`;
    }
    return '';
  }
  function telaBatalha() {
    var B = S.B, eu = ativo(B.j), foe = ativo(B.o);
    return `<div class='ar-palco ar-bat'>
      <div class='ar-bg ar-bg-o' style='background:${corTipo(foe.p.t[0])}'></div>
      <div class='ar-bg ar-bg-j' style='background:${corTipo(eu.p.t[0])}'></div>
      <div class='ar-bg-luz'></div>
      <div class='ar-plat ar-plat-o'></div><div class='ar-plat ar-plat-j'></div>
      <div class='ar-mon ar-mon-o' id='ar-mon-o'>${sprite(foe.p.id, false, 'ar-spr')}</div>
      <div class='ar-mon ar-mon-j' id='ar-mon-j'>${sprite(eu.p.id, true, 'ar-spr')}</div>
      ${hudHtml(B.o, 'o')}${hudHtml(B.j, 'j')}
      <div id='ar-fx' class='ar-fx'></div>
      <div class='ar-painel'>
        <div class='ar-painel-tit'>GOLPES DE ${esc(eu.p.nome.toUpperCase())}</div>
        <div class='ar-golpes' id='ar-golpes'>${golpesHtml()}</div>
        <div class='ar-acoes'>
          ${S.modo === 3 ? `<div class='ar-btn ar-btn-sec${S.ocupado || S.auto ? ' off' : ''}' data-acao='abrirTroca'>⇄ Trocar</div>` : ''}
          <div class='ar-btn ar-btn-sec${S.auto ? ' on' : ''}' data-acao='auto'>Modo: ${S.auto ? 'automático' : 'manual'}</div>
          <div class='ar-btn ar-btn-gold' data-acao='simular'>Simular ×1000</div>
          <div class='ar-btn ar-btn-sec' data-acao='novo'>Sair</div>
        </div>
        <div id='ar-simbox'>${simHtml()}</div>
      </div>
      <div class='ar-logbox'><div class='ar-painel-tit'>REGISTRO DA BATALHA</div><div class='ar-log' id='ar-log'>${logHtml()}</div></div>
      ${overlayHtml()}
    </div>`;
  }

  /* ---------- render ---------- */
  function render() {
    raiz.innerHTML = S.tela === 'batalha' && S.B ? telaBatalha() : telaSelecao();
    escala();
    var log = $('ar-log'); if (log) { log.scrollTop = log.scrollHeight; }
    var busca = $('ar-busca');
    if (busca) {
      busca.addEventListener('input', function () {
        S.busca = busca.value;
        $('ar-grade').innerHTML = gradeHtml();
      });
    }
  }
  function atualizarParcial() {
    if (S.tela !== 'batalha') { return render(); }
    var gp = $('ar-golpes'); if (gp) { gp.innerHTML = golpesHtml(); }
    var log = $('ar-log'); if (log) { log.innerHTML = logHtml(); log.scrollTop = log.scrollHeight; }
  }
  function registrar(txt) { S.log.push(txt); var log = $('ar-log'); if (log) { log.innerHTML = logHtml(); log.scrollTop = log.scrollHeight; } }

  /* ---------- animações ---------- */
  function centro(lado) { return lado === 'j' ? { x: 330, y: 400 } : { x: 900, y: 235 }; }
  function textoFx(txt, cls, lado) {
    var fx = $('ar-fx'); if (!fx) { return; }
    var c = centro(lado), el = document.createElement('div');
    el.className = 'ar-txt ' + cls; el.textContent = txt;
    el.style.left = c.x + 'px'; el.style.top = (c.y - 40) + 'px';
    fx.appendChild(el); setTimeout(function () { el.remove(); }, 1500);
  }
  function bannerFx(txt, cls) {
    var fx = $('ar-fx'); if (!fx) { return; }
    var el = document.createElement('div'); el.className = 'ar-banner ' + cls; el.textContent = txt;
    fx.appendChild(el); setTimeout(function () { el.remove(); }, 1400);
  }
  async function projetil(de, para, tipo, fisico) {
    var fx = $('ar-fx'); if (!fx) { return; }
    var a = centro(de), b = centro(para), cor = corTipo(tipo);
    if (fisico) {
      var mon = $('ar-mon-' + de); if (mon) { mon.classList.add('ar-investida-' + de); }
      await esperar(260);
      if (mon) { mon.classList.remove('ar-investida-' + de); }
    } else {
      for (var i = 0; i < 6; i++) {
        var el = document.createElement('div'); el.className = 'ar-orb';
        el.style.background = cor; el.style.boxShadow = '0 0 18px 6px ' + cor;
        el.style.left = a.x + 'px'; el.style.top = a.y + 'px';
        fx.appendChild(el);
        (function (el, i) {
          setTimeout(function () { el.style.left = (b.x + (Math.random() * 40 - 20)) + 'px'; el.style.top = (b.y + (Math.random() * 40 - 20)) + 'px'; el.style.opacity = '0.2'; }, 20 + i * 45);
          setTimeout(function () { el.remove(); }, 700 + i * 45);
        })(el, i);
      }
      await esperar(520);
    }
    var anel = document.createElement('div'); anel.className = 'ar-impacto';
    anel.style.borderColor = cor; anel.style.left = b.x + 'px'; anel.style.top = b.y + 'px';
    fx.appendChild(anel); setTimeout(function () { anel.remove(); }, 600);
    for (var k = 0; k < 10; k++) {
      var f = document.createElement('div'); f.className = 'ar-faisca'; f.style.background = cor;
      f.style.left = b.x + 'px'; f.style.top = b.y + 'px';
      var ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 60;
      f.style.setProperty('--dx', Math.cos(ang) * dist + 'px'); f.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      fx.appendChild(f); (function (f) { setTimeout(function () { f.remove(); }, 700); })(f);
    }
  }
  async function animarHp(lado, m) {
    var f = $('ar-hpf-' + lado), t = $('ar-hpt-' + lado);
    if (f) { f.style.width = (100 * m.hp / m.hpMax) + '%'; f.className = 'ar-hp-f ' + hpClasse(m); }
    if (t) { t.textContent = m.hp + ' / ' + m.hpMax; }
    await esperar(550);
  }
  function tremer(lado) {
    var mon = $('ar-mon-' + lado); if (!mon) { return; }
    mon.classList.remove('ar-dano'); void mon.offsetWidth; mon.classList.add('ar-dano');
  }

  /* ---------- turno ---------- */
  async function usarGolpe(lado, idx) {
    var B = S.B, foe = lado === 'j' ? 'o' : 'j', a = ativo(B[lado]), d = ativo(B[foe]), g = a.golpes[idx];
    registrar(`<b>${esc(a.p.nome)}</b> usou <span style='color:${corTipo(g.t)}'>${esc(g.nome)}</span>!`);
    await projetil(lado, foe, g.t, g.c === 'F');
    var r = calcular(a, d, g);
    if (r.erro) { textoFx('Errou!', 'erro', foe); registrar('Mas errou!'); await esperar(500); return false; }
    if (r.ef === 0) { bannerFx('NÃO AFETA...', 'nul'); registrar(`Não afeta ${esc(d.p.nome)}...`); await esperar(700); return false; }
    d.hp = Math.max(0, d.hp - r.dano);
    tremer(foe);
    textoFx('-' + r.dano, 'num', foe);
    if (r.crit) { textoFx('CRÍTICO!', 'crit', foe); registrar('Um golpe crítico!'); }
    if (r.ef >= 2) { bannerFx('SUPER EFETIVO!', 'sup'); registrar(`<i class='sup'>Foi super efetivo!</i>`); }
    else if (r.ef < 1) { bannerFx('pouco efetivo...', 'pou'); registrar(`<i class='pou'>Não foi muito efetivo...</i>`); }
    await animarHp(foe, d);
    if (d.hp <= 0) {
      var mon = $('ar-mon-' + foe); if (mon) { mon.classList.add('ar-desmaio'); }
      registrar(`<b>${esc(d.p.nome)}</b> desmaiou!`);
      await esperar(900);
      return true;
    }
    return false;
  }
  async function entrar(lado, idx) {
    var B = S.B;
    B[lado].ativo = idx;
    registrar(lado === 'j' ? `Vai, <b>${esc(ativo(B.j).p.nome)}</b>!` : `Oponente enviou <b>${esc(ativo(B.o).p.nome)}</b>!`);
    render();
    var mon = $('ar-mon-' + lado); if (mon) { mon.classList.add('ar-entrada'); }
    await esperar(600);
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
    var B = S.B, acoes = ordem(B, acaoJ, iaAcao(B.o, B.j));
    for (var k = 0; k < acoes.length; k++) {
      var lado = acoes[k].lado, ac = acoes[k].a;
      if (ac.tipo === 'troca') {
        registrar(lado === 'j' ? `<b>${esc(ativo(B.j).p.nome)}</b>, volte!` : `Oponente recolheu <b>${esc(ativo(B.o).p.nome)}</b>.`);
        await entrar(lado, ac.idx); continue;
      }
      if (ativo(B[lado]).hp <= 0) { continue; }
      var ko = await usarGolpe(lado, ac.idx);
      if (ko) { if (await aposDesmaio(lado === 'j' ? 'o' : 'j')) { return; } break; }
    }
    S.ocupado = false; render();
    if (S.auto) { proximoAuto(); }
  }
  function proximoAuto() {
    setTimeout(function () {
      if (!S.auto || S.ocupado || S.fim || S.tela !== 'batalha') { return; }
      executarTurno(iaAcao(S.B.j, S.B.o));
    }, 650);
  }
  function iniciarBatalha() {
    S.B = { j: novoLado(S.time.j), o: novoLado(S.time.o) };
    S.log = ['A batalha começou!']; S.fim = null; S.escolha = null; S.sim = null; S.ocupado = false;
    S.tela = 'batalha'; render();
    var a = $('ar-mon-j'), b = $('ar-mon-o');
    if (a) { a.classList.add('ar-entrada'); } if (b) { b.classList.add('ar-entrada'); }
  }

  /* ---------- cliques ---------- */
  function aleatorio(l) {
    var base = LISTA.filter(function (p) { return p.padrao; });
    S.time[l] = [];
    while (S.time[l].length < tamanhoTime()) {
      var id = base[Math.floor(Math.random() * base.length)].id;
      if (S.time[l].indexOf(id) < 0) { S.time[l].push(id); }
    }
  }
  raiz.onclick = function (ev) {
    var el = ev.target.closest('[data-acao]'); if (!el) { return; }
    var acao = el.getAttribute('data-acao'), l = el.getAttribute('data-lado');
    if (el.classList.contains('off')) { return; }
    switch (acao) {
      case 'modo': S.modo = +el.getAttribute('data-m'); ajustarTimes(); render(); break;
      case 'lado': S.lado = l; render(); break;
      case 'tipo': var t = el.getAttribute('data-t'); S.tipo = S.tipo === t ? '' : t; render(); break;
      case 'add':
        var id = +el.getAttribute('data-id'), lado = S.lado;
        if (S.time[lado].length >= tamanhoTime()) { lado = lado === 'j' ? 'o' : 'j'; }
        if (S.time[lado].length < tamanhoTime()) { S.time[lado].push(id); S.lado = S.time[lado].length >= tamanhoTime() && lado === 'j' ? 'o' : lado; }
        render(); break;
      case 'tirar': ev.stopPropagation(); S.time[l].splice(+el.getAttribute('data-i'), 1); S.lado = l; render(); break;
      case 'aleatorio': ev.stopPropagation(); aleatorio(l); render(); break;
      case 'batalhar': iniciarBatalha(); break;
      case 'golpe': executarTurno({ tipo: 'golpe', idx: +el.getAttribute('data-i') }); break;
      case 'abrirTroca': S.escolha = 'livre'; render(); break;
      case 'cancelar': S.escolha = null; render(); break;
      case 'trocar':
        var i = +el.getAttribute('data-i');
        if (S.escolha === 'forcada') { S.escolha = null; S.ocupado = true; entrar('j', i).then(function () { S.ocupado = false; render(); }); }
        else { executarTurno({ tipo: 'troca', idx: i }); }
        break;
      case 'auto': S.auto = !S.auto; render(); if (S.auto) { proximoAuto(); } break;
      case 'simular':
        var vj = 0, tt = 0;
        for (var n = 0; n < 1000; n++) { var r = simular(S.time.j, S.time.o); if (r.venc === 'j') { vj++; } tt += r.turnos; }
        S.sim = { j: vj / 10, o: 100 - vj / 10, turnos: tt / 1000 };
        registrar(`Simulação de 1.000 batalhas: você venceu <b>${(vj / 10).toFixed(1)}%</b>.`);
        var box = $('ar-simbox'); if (box) { box.innerHTML = simHtml(); }
        break;
      case 'revanche': iniciarBatalha(); break;
      case 'novo': S.tela = 'selecao'; S.B = null; S.auto = false; S.fim = null; S.escolha = null; render(); break;
    }
  };

  window.__arenaApi = { simular: simular, golpesDe: golpesDe, P: P, statusDe: statusDe };
  render();
  if (S.auto && S.tela === 'batalha' && !S.ocupado) { proximoAuto(); }
})();
