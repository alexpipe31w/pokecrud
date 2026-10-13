import type { BattleAction } from '../../../shared/engine/battle/types.js';
import {
  PVP_INVITE_ALPHABET,
  PVP_INVITE_LENGTH,
  type BattleAct,
  type BattleForfeit,
  type InviteJoin,
} from '../../../shared/protocol/pvp.js';

/**
 * Validación en el borde de las cargas del socket `/pvp` (D-056). Funciones puras: devuelven la carga tipada o null
 * (→ ack `bad-request`). Sin `ValidationPipe`: sus excepciones no vuelven por el ack. Campos de más → null.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INT_MAX = 2 ** 31 - 1;
const TEAM_SLOTS = 6;
const MOVE_SLOTS = 4;

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Es un objeto con exactamente estas claves. */
function exactly(v: unknown, keys: string[]): v is Obj {
  if (!isObj(v)) return false;
  const own = Object.keys(v);
  return own.length === keys.length && keys.every((k) => own.includes(k));
}

function intIn(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/** Mensajes sin datos (`pvp:hello`, `pvp:lobby:leave`): `{}` o nada. */
export function parseEmpty(v: unknown): Record<string, never> | null {
  if (v === undefined) return {};
  return exactly(v, []) ? {} : null;
}

/** `pvp:invite:create` y `pvp:queue:join`. */
export function parseTeamRequest(v: unknown): { teamId: number } | null {
  if (!exactly(v, ['teamId']) || !intIn(v['teamId'], 1, INT_MAX)) return null;
  return { teamId: v['teamId'] };
}

export function parseInviteJoin(v: unknown): InviteJoin | null {
  if (!exactly(v, ['code', 'teamId']) || !intIn(v['teamId'], 1, INT_MAX))
    return null;
  const raw = v['code'];
  if (typeof raw !== 'string') return null;
  const code = raw.toUpperCase();
  if (
    code.length !== PVP_INVITE_LENGTH ||
    !Array.from(code).every((c) => PVP_INVITE_ALPHABET.includes(c))
  )
    return null;
  return { code, teamId: v['teamId'] };
}

function parseAction(v: unknown): BattleAction | null {
  if (!isObj(v)) return null;
  switch (v['kind']) {
    case 'move':
      return exactly(v, ['kind', 'moveIndex']) &&
        intIn(v['moveIndex'], 0, MOVE_SLOTS - 1)
        ? { kind: 'move', moveIndex: v['moveIndex'] }
        : null;
    case 'switch':
      return exactly(v, ['kind', 'teamIndex']) &&
        intIn(v['teamIndex'], 0, TEAM_SLOTS - 1)
        ? { kind: 'switch', teamIndex: v['teamIndex'] }
        : null;
    case 'forfeit':
      return exactly(v, ['kind']) ? { kind: 'forfeit' } : null;
    default:
      return null;
  }
}

export function parseBattleAct(v: unknown): BattleAct | null {
  if (!exactly(v, ['battleId', 'decision', 'action'])) return null;
  const battleId = v['battleId'];
  if (typeof battleId !== 'string' || !UUID.test(battleId)) return null;
  if (!intIn(v['decision'], 1, INT_MAX)) return null;
  const action = parseAction(v['action']);
  return action ? { battleId, decision: v['decision'], action } : null;
}

export function parseBattleForfeit(v: unknown): BattleForfeit | null {
  if (!exactly(v, ['battleId'])) return null;
  const battleId = v['battleId'];
  return typeof battleId === 'string' && UUID.test(battleId)
    ? { battleId }
    : null;
}
