/* Teste das páginas em JS fora do Power BI:  node _staging/js/teste_arena.js <resposta-graphql.json>
   Monta window.ARENA_DADOS com os dados da PokeAPI e as tabelas Golpes/Tipos dos arquivos .m,
   roda comum.js + cada página com um DOM mínimo e imprime golpes e simulações da Arena. */
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const resp = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).data;

const tiposM = fs.readFileSync(path.join(dir, '..', 'm', 'Tipos.m'), 'utf8');
const tp = {};
for (const m of tiposM.matchAll(/\{"([a-z]+)", "([^"]+)", "(#[0-9A-Fa-f]{6})"/g)) tp[m[1]] = [m[2], m[3]];
const slug = Object.fromEntries(resp.t.map(t => [t.id, t.name]));
const golpesM = fs.readFileSync(path.join(dir, '..', 'm', 'Golpes.m'), 'utf8');
const gp = [...golpesM.matchAll(/\{"([a-z]+)", "([FE])", "([a-z]+)", "([^"]+)", (\d+), (\d+), (\d+)\}/g)]
  .map(m => [m[1], m[2], m[3], m[4], +m[5], +m[6], +m[7]]);
const ef = {};
resp.e.forEach(e => { if (e.damage_factor !== 100) ef[slug[e.damage_type_id] + '>' + slug[e.target_type_id]] = e.damage_factor / 100; });
const esp = Object.fromEntries(resp.s.map(s => [s.id, s]));
const pk = resp.p.map(p => {
  const st = Object.fromEntries(p.pokemon_v2_pokemonstats.map(s => [s.stat_id, s.base_stat]));
  const ts = p.pokemon_v2_pokemontypes.sort((a, b) => a.slot - b.slot).map(t => slug[t.type_id]);
  const s = esp[p.pokemon_species_id];
  const base = s.n.length ? s.n[0].name : s.name;
  const suf = p.is_default ? '' : (p.name.startsWith(s.name + '-') ? p.name.slice(s.name.length + 1) : p.name);
  const forma = suf.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').replace('Gmax', 'Gigantamax');
  return [p.id, forma ? base + ' ' + forma : base, p.pokemon_species_id,
    ts[0], ts[1] || '', st[1], st[2], st[3], st[4], st[5], st[6], p.is_default ? 1 : 0, s.generation_id, s.is_legendary || s.is_mythical ? 1 : 0];
});

function elemento() {
  return { style: { setProperty() {} }, classList: { add() {}, remove() {}, contains: () => false }, innerHTML: '',
    addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, focus() {}, appendChild() {}, remove() {}, insertAdjacentHTML() {} };
}
let raiz;
global.window = { addEventListener() {}, ARENA_DADOS: { v: pk.length, pk, ef, gp, tp }, localStorage: { getItem: () => null, setItem() {} } };
global.document = { getElementById: id => (id === 'app-raiz' ? raiz : elemento()), createElement: elemento };
global.setTimeout = () => 0; global.setInterval = () => 0; global.clearInterval = () => {};
const ler = f => fs.readFileSync(path.join(dir, f), 'utf8');
eval(ler('comum.js'));
for (const pag of ['arena', 'tipos', 'quiz']) {
  raiz = Object.assign(elemento(), { clientWidth: 1280, clientHeight: 720 });
  eval(ler(pag + '.js'));
  console.log(pag.padEnd(6), 'renderizou', raiz.innerHTML.length, 'caracteres');
}

const api = window.__arenaApi, P = window.PK.P;
for (const id of [6, 9, 25, 94, 445, 83]) {
  const p = P[id];
  console.log(p.nome.padEnd(12), ('Gen ' + p.gen).padEnd(6), p.t.join('/').padEnd(16), api.golpesDe(p).map(g => `${g.nome} (${g.t} ${g.c} ${g.pw})`).join(', '));
}
window.__arena.time = { j: [6], o: [9] };
function rodada(a, b, n = 1000) {
  let vj = 0, tt = 0;
  for (let i = 0; i < n; i++) { const r = api.simular(a, b); if (r.venc === 'j') vj++; tt += r.turnos; }
  return `${(100 * vj / n).toFixed(1)}% x ${(100 - 100 * vj / n).toFixed(1)}% · ${(tt / n).toFixed(1)} turnos`;
}
console.log('Charizard x Blastoise    :', rodada([6], [9]));
console.log('Pikachu x Gyarados       :', rodada([25], [130]));
console.log('Time [6,9,3] x [25,94,149]:', rodada([6, 9, 3], [25, 94, 149]));

/* ---------- fluxos: batalha com time de 3 e uma rodada do quiz ---------- */
function clicar(acao, attrs) {
  const el = { classList: { contains: () => false }, getAttribute: k => (k === 'data-acao' ? acao : (attrs || {})[k]) };
  raiz.onclick({ target: { closest: () => el }, stopPropagation() {} });
}
raiz = Object.assign(elemento(), { clientWidth: 1280, clientHeight: 720 });
Object.assign(window.__arena, { modo: 3, time: { j: [6, 9, 3], o: [25, 94, 149] }, tela: 'selecao' });
eval(ler('arena.js'));
clicar('batalhar');
console.log('arena  batalha:', window.__arena.tela, '| cartas:', raiz.innerHTML.includes('carta-o'), '|', raiz.innerHTML.length, 'caracteres');
raiz = Object.assign(elemento(), { clientWidth: 1280, clientHeight: 720 });
eval(ler('quiz.js'));
clicar('comecar'); clicar('dica'); clicar('dica'); clicar('dica');
console.log('quiz   pergunta:', window.__quiz.fase, '| opções:', window.__quiz.opcoes.length, '| dica de letras:', raiz.innerHTML.includes('qz-letras'));
clicar('resp', { 'data-id': String(window.__quiz.atual) });
console.log('quiz   resposta:', window.__quiz.fase, '| pontos:', window.__quiz.pontos, '| acertou:', raiz.innerHTML.includes('ACERTOU'));

/* ---------- Mega / Gigantamax ---------- */
{
  const A = window.__arenaApi;
  const l = A.novoLado([6]), m = l.time[0];
  console.log('opções Charizard:', A.opcoesTransformar(l).map(o => o.tipo + ':' + o.p.nome).join(', '));
  A.aplicarForma(m, A.opcoesTransformar(l).find(o => o.tipo === 'gmax'));
  console.log('gmax:', m.p.nome, m.hp + '/' + m.hpMax, m.golpes.map(g => g.nome + ' ' + g.pw).join(', '));
  A.desfazerGmax(m);
  console.log('voltou:', m.p.nome, m.hp + '/' + m.hpMax);
  const l2 = A.novoLado([6]); A.aplicarForma(l2.time[0], A.opcoesTransformar(l2)[0]);
  console.log('mega:', l2.time[0].p.nome, l2.time[0].p.t.join('/'), l2.time[0].golpes.map(g => g.nome).join(', '));
}

/* ---------- Tipos: abas roda / ranking ---------- */
for (const aba of ['roda', 'ranking']) {
  raiz = Object.assign(elemento(), { clientWidth: 1280, clientHeight: 720, querySelector: () => null });
  window.__tipos.aba = aba;
  eval(ler('tipos.js'));
  const nomes = [...raiz.innerHTML.matchAll(/class='rk-nome'>([^<]+)</g)].map(m => m[1]);
  console.log('tipos ', aba.padEnd(7), raiz.innerHTML.length, 'caracteres', nomes.length ? '| top: ' + nomes.slice(0, 5).join(', ') + ' | piores: ' + nomes.slice(-4).join(', ') : '| setas: ' + (raiz.innerHTML.match(/class='seta /g) || []).length);
}

/* ---------- Safari ---------- */
{
  raiz = Object.assign(elemento(), { clientWidth: 1280, clientHeight: 720 });
  eval(ler('safari.js'));
  const A = window.__safariApi, P2 = window.PK.P;
  console.log('safari renderizou', raiz.innerHTML.length, 'caracteres | início:', window.__safari.x + ',' + window.__safari.y, A.tile(window.__safari.x, window.__safari.y));
  for (const id of [10, 25, 6, 150, 143]) {
    const L = { id, fruta: false };
    console.log('  captura', P2[id].nome.padEnd(10), 'taxa', String(A.taxaCaptura(P2[id])).padStart(3), '| Poké', Math.round(100 * A.chanceCaptura(L, 'poke')) + '%', '| Ultra', Math.round(100 * A.chanceCaptura(L, 'ultra')) + '%');
  }
  const S2 = window.__safari, cont = { shiny: 0, lendario: 0 };
  for (let i = 0; i < 300; i++) { A.encontro(); if (S2.luta.shiny) cont.shiny++; if (window.PK.P[S2.luta.id].lend) cont.lendario++; S2.luta = null; }
  console.log('  300 encontros -> shiny:', cont.shiny, '(máx 2) | lendários:', cont.lendario, '(máx 1) | contadores:', S2.shinies, S2.lendarios);
  console.log('  lendário: taxa', A.taxaCaptura(P2[150]), '| Poké', Math.round(100 * A.chanceCaptura({ id: 150 }, 'poke')) + '% | Ultra', Math.round(100 * A.chanceCaptura({ id: 150 }, 'ultra')) + '%');
}

/* ---------- Safari: chances depois de 2 capturas ---------- */
{
  const A = window.__safariApi, S3 = window.__safari, P3 = window.PK.P, N = 2000;
  let lend = 0, shyComum = 0, comuns = 0, shyLend = 0;
  for (let i = 0; i < N; i++) {
    Object.assign(S3, { caixa: [{ id: 1, shiny: false, nivel: 5, bola: 'poke' }, { id: 4, shiny: false, nivel: 5, bola: 'poke' }], shinies: 0, lendarios: 0, luta: null });
    A.encontro();
    const L = S3.luta, eLend = P3[L.id].lend;
    if (eLend) { lend++; if (L.shiny) shyLend++; } else { comuns++; if (L.shiny) shyComum++; }
  }
  console.log(`  turbo (1º encontro após 2 capturas): lendário ${(100 * lend / N).toFixed(0)}% | shiny comum ${(100 * shyComum / comuns).toFixed(0)}% | shiny lendário ${(100 * shyLend / lend).toFixed(0)}%`);
  Object.assign(S3, { caixa: [{ id: 1, shiny: false, nivel: 5, bola: 'poke' }, { id: 4, shiny: false, nivel: 5, bola: 'poke' }], shinies: 0, lendarios: 0, luta: null });
  let sh = 0, ld = 0;
  for (let i = 0; i < 100; i++) { A.encontro(); if (S3.luta.shiny) sh++; if (P3[S3.luta.id].lend) ld++; S3.luta = null; }
  console.log('  limites em 100 encontros seguidos -> shiny:', sh, '(máx 2) | lendário:', ld, '(máx 1)');
}

/* ---------- Safari: Pokédex da caixa ---------- */
{
  const A = window.__safariApi, S4 = window.__safari;
  Object.assign(S4, { luta: null, caixa: [{ id: 150, shiny: true, nivel: 50, bola: 'ultra' }, { id: 25, shiny: false, nivel: 12, bola: 'poke' }], ver: 0 });
  const h = A.dexHtml();
  console.log('dex: html', h.length, '| shiny art:', h.includes('official-artwork/shiny/150'), '| selo lendário:', h.includes('LENDÁRIO'), '| fala:', (h.match(/<i style='animation-delay/g) || []).length, 'letras');
  A.acaoDex('prox'); console.log('dex: próximo ->', S4.ver, window.PK.P[S4.caixa[S4.ver].id].nome);
  A.acaoDex('prox'); console.log('dex: volta ao início ->', S4.ver);
  A.acaoDex('fechar'); console.log('dex: fechado ->', S4.ver);
}
