import { readFileSync } from 'node:fs';
import type { Move, Species, TypeInfo } from '../../data/dataset.types.js';
import { createRng } from '../rng.js';
import type { Nature } from '../spawns.js';
import {
  type Combatant,
  critChance,
  damageRolls,
  firstToAct,
  hitChance,
  rollAccuracy,
  rollDamage,
} from './damage.js';
import { calcStats } from './stats.js';
import { buildTypeChart } from './type-chart.js';

const load = <T>(file: string): T =>
  JSON.parse(
    readFileSync(new URL(`../../../src/assets/data/${file}`, import.meta.url), 'utf8'),
  ) as T;
const pokedex = load<Species[]>('pokedex.json');
const moves = load<Move[]>('moves.json');
const chart = buildTypeChart(load<TypeInfo[]>('types.json'));
const species = (name: string) => pokedex.find((s) => s.name === name) as Species;
const move = (name: string) => moves.find((m) => m.name === name) as Move;
const IV31 = { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 };

interface Opts {
  nature?: Nature;
  level?: number;
  burned?: boolean;
  attackStage?: number;
  defenseStage?: number;
}
const combatant = (name: string, o: Opts): Combatant => {
  const s = species(name);
  return {
    level: o.level ?? 50,
    types: s.types,
    stats: calcStats(s.baseStats, IV31, o.level ?? 50, o.nature ?? 'hardy'),
    stages: {
      attack: o.attackStage ?? 0,
      defense: o.defenseStage ?? 0,
      specialAttack: 0,
      specialDefense: 0,
    },
    burned: o.burned ?? false,
  };
};

/**
 * Casos de referencia sacados de `@smogon/calc` 0.12.0 (el motor de calc.pokemonshowdown.com), Gen 9, nivel 50
 * salvo indicación, IV 31, EV 0, sin objetos, habilidad sin efecto en el daño (Pressure). `showdownStats` son las stats
 * que calculó Showdown; `rolls`, sus 16 tiradas (85 %…100 %). Script: ver la bitácora de F4-03.
 */
const SHOWDOWN: {
  label: string;
  attacker: [string, Opts];
  defender: [string, Opts];
  move: string;
  crit: boolean;
  showdownStats: [Record<string, number>, Record<string, number>];
  rolls: number[];
}[] = [
  {
    label: 'físico STAB ×4',
    attacker: ['garchomp', { nature: 'jolly' }],
    defender: ['heatran', {}],
    move: 'earthquake',
    crit: false,
    showdownStats: [
      { hp: 183, attack: 150, defense: 115, specialAttack: 90, specialDefense: 105, speed: 134 },
      { hp: 166, attack: 110, defense: 126, specialAttack: 150, specialDefense: 126, speed: 97 },
    ],
    rolls: [268, 276, 276, 280, 288, 288, 292, 292, 300, 300, 304, 304, 312, 312, 316, 324],
  },
  {
    label: 'especial STAB ×4',
    attacker: ['pikachu', { nature: 'timid' }],
    defender: ['gyarados', {}],
    move: 'thunderbolt',
    crit: false,
    showdownStats: [
      { hp: 110, attack: 67, defense: 60, specialAttack: 70, specialDefense: 70, speed: 121 },
      { hp: 170, attack: 145, defense: 99, specialAttack: 80, specialDefense: 120, speed: 101 },
    ],
    rolls: [124, 124, 124, 132, 132, 132, 132, 136, 136, 136, 136, 144, 144, 144, 144, 148],
  },
  {
    label: 'especial STAB ×2',
    attacker: ['charizard', { nature: 'modest' }],
    defender: ['venusaur', {}],
    move: 'air-slash',
    crit: false,
    showdownStats: [
      { hp: 153, attack: 93, defense: 98, specialAttack: 141, specialDefense: 105, speed: 120 },
      { hp: 155, attack: 102, defense: 103, specialAttack: 120, specialDefense: 120, speed: 100 },
    ],
    rolls: [102, 102, 102, 104, 104, 108, 108, 108, 110, 110, 114, 114, 114, 116, 116, 120],
  },
  {
    label: 'físico STAB ×0,5',
    attacker: ['snorlax', { nature: 'adamant' }],
    defender: ['tyranitar', {}],
    move: 'body-slam',
    crit: false,
    showdownStats: [
      { hp: 235, attack: 143, defense: 85, specialAttack: 76, specialDefense: 130, speed: 50 },
      { hp: 175, attack: 154, defense: 130, specialAttack: 115, specialDefense: 120, speed: 81 },
    ],
    rolls: [27, 27, 27, 27, 28, 28, 29, 29, 29, 30, 30, 30, 30, 31, 31, 32],
  },
  {
    label: 'inmune ×0',
    attacker: ['gengar', {}],
    defender: ['snorlax', {}],
    move: 'shadow-ball',
    crit: false,
    showdownStats: [
      { hp: 135, attack: 85, defense: 80, specialAttack: 150, specialDefense: 95, speed: 130 },
      { hp: 235, attack: 130, defense: 85, specialAttack: 85, specialDefense: 130, speed: 50 },
    ],
    rolls: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    label: 'crítico ×2',
    attacker: ['machamp', { nature: 'adamant' }],
    defender: ['snorlax', {}],
    move: 'close-combat',
    crit: true,
    showdownStats: [
      { hp: 165, attack: 165, defense: 100, specialAttack: 76, specialDefense: 105, speed: 75 },
      { hp: 235, attack: 130, defense: 85, specialAttack: 85, specialDefense: 130, speed: 50 },
    ],
    rolls: [396, 402, 404, 410, 414, 420, 422, 428, 434, 438, 444, 446, 452, 456, 462, 468],
  },
  {
    label: 'quemado, defensa +2',
    attacker: ['lucario', { burned: true }],
    defender: ['blissey', { defenseStage: 2 }],
    move: 'close-combat',
    crit: false,
    showdownStats: [
      { hp: 145, attack: 130, defense: 90, specialAttack: 135, specialDefense: 90, speed: 110 },
      { hp: 330, attack: 30, defense: 30, specialAttack: 95, specialDefense: 155, speed: 75 },
    ],
    rolls: [147, 148, 150, 153, 154, 156, 157, 159, 160, 163, 165, 166, 168, 169, 171, 174],
  },
  {
    label: 'crítico ignora −2 atk y +2 def',
    attacker: ['lucario', { attackStage: -2 }],
    defender: ['blissey', { defenseStage: 2 }],
    move: 'close-combat',
    crit: true,
    showdownStats: [
      { hp: 145, attack: 130, defense: 90, specialAttack: 135, specialDefense: 90, speed: 110 },
      { hp: 330, attack: 30, defense: 30, specialAttack: 95, specialDefense: 155, speed: 75 },
    ],
    rolls: [878, 888, 900, 908, 920, 930, 938, 950, 960, 972, 980, 992, 1002, 1014, 1022, 1034],
  },
  {
    label: 'nivel 5, sin STAB',
    attacker: ['pidgey', { level: 5 }],
    defender: ['rattata', { level: 5 }],
    move: 'tackle',
    crit: false,
    showdownStats: [
      { hp: 20, attack: 11, defense: 10, specialAttack: 10, specialDefense: 10, speed: 12 },
      { hp: 19, attack: 12, defense: 10, specialAttack: 9, specialDefense: 10, speed: 13 },
    ],
    rolls: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7],
  },
  {
    label: '+2 atk, poco eficaz ×0,25',
    attacker: ['scizor', { attackStage: 2 }],
    defender: ['charizard', {}],
    move: 'x-scissor',
    crit: false,
    showdownStats: [
      { hp: 145, attack: 150, defense: 120, specialAttack: 75, specialDefense: 100, speed: 85 },
      { hp: 153, attack: 104, defense: 98, specialAttack: 129, specialDefense: 105, speed: 120 },
    ],
    rolls: [34, 34, 35, 35, 36, 36, 37, 37, 37, 38, 38, 39, 39, 39, 40, 40],
  },
];

describe('daño = calculadora de Pokémon Showdown', () => {
  it.each(SHOWDOWN)('$label', (c) => {
    const attacker = combatant(...c.attacker);
    const defender = combatant(...c.defender);
    expect(attacker.stats).toEqual(c.showdownStats[0]);
    expect(defender.stats).toEqual(c.showdownStats[1]);
    expect(damageRolls({ attacker, defender, move: move(c.move), chart, crit: c.crit })).toEqual(
      c.rolls,
    );
  });

  it('movimientos de estado o sin poder fijo no hacen daño por esta vía', () => {
    const a = combatant('garchomp', {});
    const d = combatant('heatran', {});
    expect(
      damageRolls({ attacker: a, defender: d, move: move('swords-dance'), chart, crit: false }),
    ).toEqual([]);
    expect(
      damageRolls({ attacker: a, defender: d, move: move('seismic-toss'), chart, crit: false }),
    ).toEqual([]);
  });

  it('rollDamage elige una de las 16 tiradas con el RNG (reproducible)', () => {
    const input = {
      attacker: combatant('garchomp', { nature: 'jolly' }),
      defender: combatant('heatran', {}),
      move: move('earthquake'),
      chart,
      crit: false,
    };
    const rolls = damageRolls(input);
    const a = createRng(5);
    const b = createRng(5);
    for (let i = 0; i < 50; i++) {
      const d = rollDamage(input, a);
      expect(rolls).toContain(d);
      expect(rollDamage(input, b)).toBe(d);
    }
  });
});

describe('crítico, precisión y orden', () => {
  it('crítico por etapas: 1/24, 1/8, 1/2, siempre', () => {
    expect(critChance(0)).toBeCloseTo(1 / 24, 10);
    expect(critChance(1)).toBe(1 / 8);
    expect(critChance(2)).toBe(1 / 2);
    expect(critChance(3)).toBe(1);
  });

  it('precisión: null nunca falla; etapas netas y topadas', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) expect(rollAccuracy(null, -6, 6, rng)).toBe(true);
    expect(hitChance(100, 0, 0)).toBe(1);
    expect(hitChance(70, 0, 0)).toBeCloseTo(0.7, 10);
    expect(hitChance(100, 0, 1)).toBeCloseTo(0.75, 10); // evasión +1 → ×3/4
    expect(hitChance(50, 6, 0)).toBe(1); // ×3 topado a 1
    expect(hitChance(90, 2, 2)).toBeCloseTo(0.9, 10); // se compensan
  });

  it('precisión 70 acierta ~70 % de 20.000 tiradas', () => {
    const rng = createRng(3);
    let hits = 0;
    for (let i = 0; i < 20_000; i++) if (rollAccuracy(70, 0, 0, rng)) hits++;
    expect(hits / 20_000).toBeCloseTo(0.7, 2);
  });

  it('orden: cambiar > prioridad > velocidad (etapas, parálisis) > empate al azar', () => {
    const rng = createRng(9);
    const base = { switching: false, priority: 0, speed: 100, speedStage: 0, paralyzed: false };
    expect(firstToAct({ ...base, switching: true }, { ...base, priority: 5 }, rng)).toBe(0);
    expect(firstToAct({ ...base, speed: 50, priority: 1 }, { ...base, speed: 200 }, rng)).toBe(0);
    expect(firstToAct({ ...base, speed: 100 }, { ...base, speed: 101 }, rng)).toBe(1);
    expect(firstToAct({ ...base, speed: 100, speedStage: 1 }, { ...base, speed: 149 }, rng)).toBe(
      0,
    );
    expect(firstToAct({ ...base, speed: 200, paralyzed: true }, { ...base, speed: 101 }, rng)).toBe(
      1,
    );
    const ties = new Set(Array.from({ length: 50 }, () => firstToAct(base, base, rng)));
    expect(ties).toEqual(new Set([0, 1]));
  });
});
