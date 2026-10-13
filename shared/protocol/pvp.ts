import type { TypeName } from '../data/dataset.types.js';
import type {
  BattleAction,
  BattleEvent,
  BattleSide,
  MajorStatus,
  SideIndex,
} from '../engine/battle/types.js';

/**
 * Contrato del PvP en tiempo real (F5, plan `docs/plan/fases/F5-pvp.md`, D-056). Socket.IO, espacio de nombres
 * `/pvp`, autenticado con el access token en el handshake (`auth: { token }`).
 *
 * - Toda petición del cliente lleva **ack** (`emitWithAck`): la respuesta es un `PvpReply`. Nunca se queda sin respuesta.
 * - **Perspectiva:** el servidor manda cada mensaje desde el punto de vista de quien lo recibe: **tú eres siempre el
 *   lado 0** y el rival el 1 (los eventos llegan con los lados ya girados). La escena de F4-05 no cambia de lado.
 * - **Información oculta:** del rival solo se ve lo que se vería en los juegos: los Pokémon que ya salieron (especie,
 *   nivel, tipos, PS, estado) y cuántos le quedan. Nunca sus movimientos, PP, stats ni IVs.
 * - **Idempotencia:** cada vez que el servidor espera acciones abre una `decision` (número creciente). Una acción se
 *   identifica por `(battleId, jugador, decision)`: repetirla (reintento tras reconexión) no hace nada dos veces.
 */

export const PVP_NAMESPACE = '/pvp';

/** Nivel al que se normalizan los equipos en PvP y torneos (ARQUITECTURA §7). */
export const PVP_LEVEL = 50;
/** Tiempo para elegir en cada decisión; al acabar se juega la acción por defecto. */
export const PVP_DECISION_MS = 30_000;
/** Desconectado más de esto → pierde por abandono (ARQUITECTURA §8). */
export const PVP_RECONNECT_GRACE_MS = 60_000;
/** Decisiones seguidas agotando el tiempo → pierde por inactividad. */
export const PVP_MAX_TIMEOUTS = 3;
/** Vida de un código de invitación. */
export const PVP_INVITE_TTL_MS = 5 * 60_000;
/** Códigos de 6 letras sin las que se confunden (0/O, 1/I/L). */
export const PVP_INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const PVP_INVITE_LENGTH = 6;

// ───────────────────────────── Respuestas (ack) ─────────────────────────────

export type PvpErrorCode =
  | 'unauthorized' // token ausente, falso o caducado (handshake)
  | 'rate-limited' // demasiados mensajes de este socket
  | 'bad-request' // carga mal formada
  | 'team-not-found' // el equipo no existe o no es tuyo
  | 'team-empty' // el equipo no tiene Pokémon capturados (o ya no son tuyos)
  | 'already-in-battle' // ya estás en un combate: vuelve a él (`pvp:hello`)
  | 'invite-not-found' // el código no existe, caducó o ya lo usó otro
  | 'own-invite' // no puedes aceptar tu propia invitación
  | 'battle-not-found' // el combate no existe (terminó o el servidor se reinició)
  | 'stale-decision' // esa decisión ya se resolvió: llegará (o llegó) `battle:turn`
  | 'invalid-action' // el motor la rechaza (sin PP, cambiar a un debilitado…)
  | 'not-your-turn'; // ahora no te toca elegir (p. ej. solo el rival debe cambiar)

export type PvpReply<T = object> = ({ ok: true } & T) | { ok: false; code: PvpErrorCode };

// ───────────────────────────── Vistas ─────────────────────────────

/** Un Pokémon del rival tal como se ve en pantalla. */
export interface PublicPokemon {
  teamIndex: number;
  speciesId: number;
  level: number;
  types: TypeName[];
  hp: number;
  maxHp: number;
  status: MajorStatus | null;
}

/** El lado del rival: solo lo revelado. */
export interface PublicSide {
  name: string;
  teamSize: number;
  fainted: number;
  active: number;
  /** Los que ya salieron al combate, por `teamIndex`. */
  revealed: PublicPokemon[];
}

/** Lo que ve un jugador de un combate. `me` es su lado completo (lado 0); `foe`, el del rival (lado 1). */
export interface PvpBattleView {
  battleId: string;
  turn: number;
  /** Decisión abierta (la que hay que mandar en `battle:act`), o null si no te toca elegir. */
  decision: number | null;
  /** Qué te toca: elegir movimiento/cambio, solo cambiar (tu activo se debilitó) o esperar al rival. */
  mustDo: 'act' | 'switch' | 'wait';
  /** Milisegundos que quedan para elegir (relativo: el reloj del móvil y el del servidor no coinciden). */
  remainingMs: number;
  me: BattleSide;
  foe: PublicSide;
  /** null mientras se combate. 0 = tú. */
  winner: SideIndex | null;
}

/** En PvP el evento de cambio trae el Pokémon que sale (el cliente no conoce el equipo del rival). */
export type PvpEvent =
  | Exclude<BattleEvent, { kind: 'switch' }>
  | { kind: 'switch'; side: SideIndex; teamIndex: number; pokemon: PublicPokemon };

export type PvpEndReason = 'faint' | 'forfeit' | 'abandon' | 'inactive';

// ───────────────────────────── Cliente → servidor ─────────────────────────────

/** Al conectar (y al reconectar): ¿tengo un combate o una invitación abiertos? */
export type HelloReply = PvpReply<{
  battle: PvpBattleView | null;
  lobby: { kind: 'invite'; code: string; remainingMs: number } | { kind: 'queue' } | null;
}>;

export interface InviteCreate {
  teamId: number;
}
export type InviteCreateReply = PvpReply<{ code: string; remainingMs: number }>;

export interface InviteJoin {
  code: string;
  teamId: number;
}
/** Si sale bien, a los dos les llega `battle:start`. */
export type InviteJoinReply = PvpReply<{ battleId: string }>;

export interface QueueJoin {
  teamId: number;
}
/** `matched` = ya había alguien esperando y empieza el combate (`battle:start`); si no, esperas en la cola. */
export type QueueJoinReply = PvpReply<{ matched: boolean }>;

/** Cancela la invitación o sale de la cola (no hace nada si no había). */
export type LobbyLeaveReply = PvpReply;

export interface BattleAct {
  battleId: string;
  decision: number;
  action: BattleAction;
}
/** `duplicate` = esa decisión ya tenía tu acción (reintento): no se aplica dos veces. */
export type BattleActReply = PvpReply<{ duplicate: boolean }>;

export interface BattleForfeit {
  battleId: string;
}
export type BattleForfeitReply = PvpReply;

export interface PvpClientEvents {
  'pvp:hello': (body: Record<string, never>, ack: (r: HelloReply) => void) => void;
  'pvp:invite:create': (body: InviteCreate, ack: (r: InviteCreateReply) => void) => void;
  'pvp:invite:join': (body: InviteJoin, ack: (r: InviteJoinReply) => void) => void;
  'pvp:queue:join': (body: QueueJoin, ack: (r: QueueJoinReply) => void) => void;
  'pvp:lobby:leave': (body: Record<string, never>, ack: (r: LobbyLeaveReply) => void) => void;
  'battle:act': (body: BattleAct, ack: (r: BattleActReply) => void) => void;
  'battle:forfeit': (body: BattleForfeit, ack: (r: BattleForfeitReply) => void) => void;
}

// ───────────────────────────── Servidor → cliente ─────────────────────────────

export interface BattleStartMsg {
  view: PvpBattleView;
  /** Apodo del rival (Player.nickname). */
  opponent: string;
}

/** Un turno (o un cambio forzado) resuelto: los eventos para animar y cómo queda todo. */
export interface BattleTurnMsg {
  battleId: string;
  events: PvpEvent[];
  view: PvpBattleView;
}

/** El rival se fue o volvió. `graceMs` = lo que le queda para volver antes de perder. */
export interface BattleOpponentMsg {
  battleId: string;
  connected: boolean;
  graceMs: number;
}

export interface BattleEndMsg {
  battleId: string;
  /** 0 = tú, 1 = el rival, null = nadie (los dos abandonaron). */
  winner: SideIndex | null;
  reason: PvpEndReason;
}

export interface PvpServerEvents {
  'pvp:error': (msg: { code: PvpErrorCode }) => void;
  'battle:start': (msg: BattleStartMsg) => void;
  'battle:turn': (msg: BattleTurnMsg) => void;
  'battle:opponent': (msg: BattleOpponentMsg) => void;
  'battle:end': (msg: BattleEndMsg) => void;
}

// Si el servidor se reinicia (despliegue en Render) las salas en memoria se pierden (D-005): `pvp:hello` devuelve
// `battle: null` y `battle:act` responde `battle-not-found`. La app lo cuenta como "el combate se interrumpió", sin
// resultado.
