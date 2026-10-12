import type { PokemonInit } from '../engine/battle/battle-engine.js';
import { defaultMoves } from '../engine/battle/moves.js';
import { calcStats } from '../engine/battle/stats.js';
import type { Nature } from '../engine/spawns.js';
import type { Difficulty } from '../engine/battle/ai.js';
import type { Species } from './dataset.types.js';

/**
 * Entrenadores de prueba para el combate contra la IA (F4-06). Especies por nº de Pokédex (el dataset manda en tipos y
 * stats); movimientos = `defaultMoves` a su nivel. IVs fijos por dificultad: así un mismo entrenador es siempre igual.
 */
export interface TrainerDef {
  id: string;
  name: string;
  difficulty: Difficulty;
  /** 0-31 en todas las stats. */
  ivs: number;
  team: { speciesId: number; level: number; nature: Nature }[];
}

export const TRAINERS: readonly TrainerDef[] = [
  {
    id: 'excursionista',
    name: 'Excursionista Roco',
    difficulty: 'easy',
    ivs: 10,
    team: [
      { speciesId: 74, level: 14, nature: 'hardy' }, // Geodude
      { speciesId: 111, level: 15, nature: 'brave' }, // Rhyhorn
      { speciesId: 95, level: 16, nature: 'impish' }, // Onix
    ],
  },
  {
    id: 'nadadora',
    name: 'Nadadora Marina',
    difficulty: 'normal',
    ivs: 20,
    team: [
      { speciesId: 118, level: 24, nature: 'jolly' }, // Goldeen
      { speciesId: 54, level: 25, nature: 'modest' }, // Psyduck
      { speciesId: 120, level: 27, nature: 'timid' }, // Staryu
    ],
  },
  {
    id: 'as',
    name: 'Entrenadora As Valeria',
    difficulty: 'hard',
    ivs: 31,
    team: [
      { speciesId: 94, level: 40, nature: 'timid' }, // Gengar
      { speciesId: 131, level: 41, nature: 'modest' }, // Lapras
      { speciesId: 149, level: 42, nature: 'adamant' }, // Dragonite
    ],
  },
];

/** Equipo listo para `createBattle`. Lanza si una especie no está en el dataset. */
export function trainerTeam(
  trainer: TrainerDef,
  species: ReadonlyMap<number, Species>,
  isSupportedMove: (moveId: number) => boolean,
): PokemonInit[] {
  const iv = trainer.ivs;
  const ivs = { hp: iv, attack: iv, defense: iv, specialAttack: iv, specialDefense: iv, speed: iv };
  return trainer.team.map((t, i) => {
    const s = species.get(t.speciesId);
    if (!s) throw new Error(`Especie ${t.speciesId} no está en el dataset`);
    return {
      uid: `${trainer.id}-${i}`,
      speciesId: s.id,
      level: t.level,
      types: s.types,
      stats: calcStats(s.baseStats, ivs, t.level, t.nature),
      moves: defaultMoves(s.learnset, t.level, isSupportedMove),
    };
  });
}
