// Oráculo de F4-03: casos de referencia de daño sacados de @smogon/calc, el motor de calc.pokemonshowdown.com.
// NO es dependencia del proyecto. Para regenerar shared/engine/battle/damage.spec.ts:
//   mkdir %TEMP%\calc-oracle && cd %TEMP%\calc-oracle && npm init -y && npm i --ignore-scripts --save-exact @smogon/calc@0.12.0
//   node scripts/oracles/showdown-damage.cjs %TEMP%\calc-oracle
// Imprime JSON con las stats que calcula Showdown y las 16 tiradas de cada caso (Gen 9, IV 31, EV 0, sin objetos,
// habilidad Pressure, que no afecta al daño). Copiar los valores a SHOWDOWN en damage.spec.ts.
const { createRequire } = require('node:module');
const req = createRequire(require('node:path').join(process.argv[2], 'package.json'));
const { calculate, Generations, Pokemon, Move } = req('@smogon/calc');
const gen = Generations.get(9);
const IV = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const EV = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const mon = (name, o = {}) => new Pokemon(gen, name, { level: o.level ?? 50, ivs: IV, evs: EV, nature: o.nature ?? 'Hardy', ability: 'Pressure', boosts: o.boosts ?? {}, status: o.status ?? '' });
const CASES = [
  ['físico STAB ×4', 'Garchomp', { nature: 'Jolly' }, 'Heatran', {}, 'Earthquake', false],
  ['especial STAB ×4', 'Pikachu', { nature: 'Timid' }, 'Gyarados', {}, 'Thunderbolt', false],
  ['especial STAB ×2', 'Charizard', { nature: 'Modest' }, 'Venusaur', {}, 'Air Slash', false],
  ['físico STAB ×0,5', 'Snorlax', { nature: 'Adamant' }, 'Tyranitar', {}, 'Body Slam', false],
  ['inmune ×0', 'Gengar', {}, 'Snorlax', {}, 'Shadow Ball', false],
  ['crítico ×2', 'Machamp', { nature: 'Adamant' }, 'Snorlax', {}, 'Close Combat', true],
  ['quemado, defensa +2', 'Lucario', { status: 'brn' }, 'Blissey', { boosts: { def: 2 } }, 'Close Combat', false],
  ['crítico ignora −2 atk y +2 def', 'Lucario', { boosts: { atk: -2 } }, 'Blissey', { boosts: { def: 2 } }, 'Close Combat', true],
  ['nivel 5, sin STAB', 'Pidgey', { level: 5 }, 'Rattata', { level: 5 }, 'Tackle', false],
  ['+2 atk, poco eficaz ×0,25', 'Scizor', { boosts: { atk: 2 } }, 'Charizard', {}, 'X-Scissor', false],
];
const out = CASES.map(([label, a, ao, d, dopt, move, crit]) => {
  const atk = mon(a, ao), def = mon(d, dopt);
  const r = calculate(gen, atk, def, new Move(gen, move, { isCrit: crit }));
  const dmg = Array.isArray(r.damage) ? r.damage : Array(16).fill(r.damage);
  return { label, attacker: a, attackerOpts: ao, defender: d, defenderOpts: dopt, move, crit,
    atkStats: atk.rawStats, defStats: def.rawStats, rolls: dmg };
});
console.log(JSON.stringify(out));
