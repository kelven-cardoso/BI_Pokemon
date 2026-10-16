/* Teste do motor da Arena fora do Power BI (node _staging/arena/teste_arena.js <resposta-graphql.json>).
   Monta window.ARENA_DADOS com os dados da PokeAPI e as tabelas Golpes/Tipos dos arquivos .m,
   roda o arena.js com um DOM mínimo e imprime golpes e simulações. */
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

const nomes = Object.fromEntries(resp.s.map(s => [s.id, s.n.length ? s.n[0].name : s.name]));
const pk = resp.p.map(p => {
  const st = Object.fromEntries(p.pokemon_v2_pokemonstats.map(s => [s.stat_id, s.base_stat]));
  const ts = p.pokemon_v2_pokemontypes.sort((a, b) => a.slot - b.slot).map(t => slug[t.type_id]);
  return [p.id, nomes[p.pokemon_species_id] + (p.is_default ? '' : ' (' + p.name + ')'), p.pokemon_species_id,
    ts[0], ts[1] || '', st[1], st[2], st[3], st[4], st[5], st[6], p.is_default ? 1 : 0];
});

const raiz = { innerHTML: '', clientWidth: 1280, clientHeight: 720, querySelector: () => null, onclick: null };
global.window = { addEventListener() {}, ARENA_DADOS: { v: pk.length, pk, ef, gp, tp } };
global.document = { getElementById: id => (id === 'arena-raiz' ? raiz : null) };
eval(fs.readFileSync(path.join(dir, 'arena.js'), 'utf8'));

const api = window.__arenaApi;
console.log('golpes:', gp.length, '| efic.:', Object.keys(ef).length, '| pokémon:', pk.length, '| html inicial:', raiz.innerHTML.length, 'chars');
for (const id of [6, 9, 25, 94, 130, 150, 445, 1025]) {
  const p = api.P[id];
  console.log(p.nome.padEnd(12), p.t.join('/').padEnd(16), api.golpesDe(p).map(g => `${g.nome} (${g.t} ${g.c} ${g.pw})`).join(', '));
}
function rodada(a, b, n = 1000) {
  let vj = 0, tt = 0;
  for (let i = 0; i < n; i++) { const r = api.simular(a, b); if (r.venc === 'j') vj++; tt += r.turnos; }
  return `${(100 * vj / n).toFixed(1)}% x ${(100 - 100 * vj / n).toFixed(1)}% · ${(tt / n).toFixed(1)} turnos`;
}
console.log('Charizard x Blastoise :', rodada([6], [9]));
console.log('Pikachu x Gyarados    :', rodada([25], [130]));
console.log('Mewtwo x Magikarp     :', rodada([150], [129]));
console.log('Time [6,9,3] x [25,94,149]:', rodada([6, 9, 3], [25, 94, 149]));
