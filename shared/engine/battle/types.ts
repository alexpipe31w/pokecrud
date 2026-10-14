import type { Move, TypeName } from '../../data/dataset.types.js';
import type { Stats } from './stats.js';
import type { TypeChart } from './type-chart.js';

/** Contrato del motor de combate (plan F4, F4-04). Lo consumen la escena (F4-05), la IA (F4-06), PvP (F5) y torneos (F6). */

export type MajorStatus = 'burn' | 'paralysis' | 'poison' | 'toxic' | 'sleep' | 'freeze';
export type StageStat =
  'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed' | 'accuracy' | 'evasion';
export type Stages = Record<StageStat, number>;

export interface BattleMoveSlot {
  moveId: number;
  pp: number;
  maxPp: number;
}

export interface BattlePokemon {
  /** Id del CaughtPokemon, o uno inventado para la IA. */
  uid: string;
  speciesId: number;
  level: number;
  types: TypeName[];
  /** Ya calculadas con `calcStats` (nivel real contra la IA, 50 en PvP). */
  stats: Stats;
  hp: number;
  moves: BattleMoveSlot[];
  status: MajorStatus | null;
  /** Sueño: turnos que le quedan dormido. Tóxico: contador n (daño n/16). */
  statusTurns: number;
  /** Se limpia al salir del combate (cambio). */
  volatile: { confusion: number; flinch: boolean };
  stages: Stages;
}

export interface BattleSide {
  name: string;
  team: BattlePokemon[];
  active: number;
}

export interface BattleState {
  /** Turnos resueltos (los de "solo cambiar tras debilitarse" no cuentan). */
  turn: number;
  sides: [BattleSide, BattleSide];
  /** Lados que deben mandar un `switch` antes de seguir (su activo se debilitó y le quedan otros). */
  pendingSwitch: [boolean, boolean];
  winner: 0 | 1 | null;
}

export type BattleAction =
  { kind: 'move'; moveIndex: number } | { kind: 'switch'; teamIndex: number } | { kind: 'forfeit' };

export type SideIndex = 0 | 1;
export type DamageSource = 'move' | 'recoil' | 'burn' | 'poison' | 'confusion' | 'struggle';

/** Lo que pasó, en orden. `side` = el Pokémon al que se refiere el evento. La UI pone los textos en español. */
export type BattleEvent =
  | { kind: 'switch'; side: SideIndex; teamIndex: number }
  | { kind: 'move'; side: SideIndex; moveId: number }
  | { kind: 'struggle'; side: SideIndex }
  | { kind: 'cant-move'; side: SideIndex; reason: 'sleep' | 'freeze' | 'paralysis' | 'flinch' }
  | { kind: 'wake'; side: SideIndex }
  | { kind: 'thaw'; side: SideIndex }
  | { kind: 'confusion-hit'; side: SideIndex }
  | { kind: 'confusion-end'; side: SideIndex }
  | { kind: 'miss'; side: SideIndex }
  | { kind: 'crit'; side: SideIndex }
  | { kind: 'effectiveness'; side: SideIndex; multiplier: number }
  | { kind: 'hits'; side: SideIndex; count: number }
  | { kind: 'damage'; side: SideIndex; amount: number; hpAfter: number; source: DamageSource }
  | { kind: 'heal'; side: SideIndex; amount: number; hpAfter: number }
  | { kind: 'status'; side: SideIndex; status: MajorStatus }
  | { kind: 'confused'; side: SideIndex }
  | { kind: 'stat'; side: SideIndex; stat: StageStat; change: number }
  | { kind: 'stat-limit'; side: SideIndex; stat: StageStat; up: boolean }
  | { kind: 'immune'; side: SideIndex }
  | { kind: 'fail'; side: SideIndex }
  | { kind: 'faint'; side: SideIndex }
  | { kind: 'needs-switch'; side: SideIndex }
  | { kind: 'forfeit'; side: SideIndex }
  | { kind: 'win'; side: SideIndex };

export interface TurnResult {
  state: BattleState;
  events: BattleEvent[];
}

/** Datos fijos del combate (no cambian por turno): movimientos del dataset y tabla de tipos. */
export interface BattleContext {
  moves: ReadonlyMap<number, Move>;
  chart: TypeChart;
}

/** Acción imposible (índice inexistente, sin PP, cambiar a un debilitado…). La UI no debería permitirla. */
export class BattleError extends Error {}
