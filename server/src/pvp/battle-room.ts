import {
  resolveTurn,
  validateAction,
} from '../../../shared/engine/battle/battle-engine.js';
import {
  defaultAction,
  eventsFor,
  viewFor,
} from '../../../shared/engine/battle/pvp-view.js';
import {
  type BattleAction,
  type BattleContext,
  BattleError,
  type BattleState,
  type SideIndex,
} from '../../../shared/engine/battle/types.js';
import { type Rng, createRng } from '../../../shared/engine/rng.js';
import {
  PVP_DECISION_MS,
  PVP_MAX_TIMEOUTS,
  PVP_RECONNECT_GRACE_MS,
  type BattleEndMsg,
  type BattleOpponentMsg,
  type BattleTurnMsg,
  type PvpBattleView,
  type PvpEndReason,
} from '../../../shared/protocol/pvp.js';
import { PvpFailure } from './pvp-failure.js';

/** Reloj inyectable (los tests usan los temporizadores falsos de Vitest). */
export interface RoomClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
export const REAL_CLOCK: RoomClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Lo que el gateway debe mandar a la sala `player:<id>`. La sala no conoce Socket.IO. */
export type RoomOutgoing =
  | { playerId: string; event: 'battle:turn'; msg: BattleTurnMsg }
  | { playerId: string; event: 'battle:opponent'; msg: BattleOpponentMsg }
  | { playerId: string; event: 'battle:end'; msg: BattleEndMsg };

/** Una decisión resuelta: con `seed` y esto se reproduce el combate entero (el motor es determinista). */
export interface DecisionLog {
  decision: number;
  actions: [BattleAction | null, BattleAction | null];
  /** Qué lados agotaron el tiempo (se jugó su acción por defecto). */
  timedOut: [boolean, boolean];
}

/** Lo que se guarda al terminar (tabla `Battle`, D-056 regla 10). `winner` en lados reales: 0 = `players[0]`. */
export interface BattleResult {
  battleId: string;
  players: [string, string];
  winner: SideIndex | null;
  reason: PvpEndReason;
  seed: number;
  turns: number;
  log: DecisionLog[];
  startedAt: Date;
  endedAt: Date;
}

export interface BattleRoomInit {
  battleId: string;
  /** `players[i]` juega el lado i del motor. */
  players: [string, string];
  state: BattleState;
  ctx: BattleContext;
  seed: number;
  send: (o: RoomOutgoing) => void;
  onEnd: (r: BattleResult) => void;
  /** Error inesperado dentro de un temporizador (no se puede devolver por un ack). */
  onError?: (err: unknown) => void;
  clock?: RoomClock;
}

type Must = PvpBattleView['mustDo'];
const other = (s: SideIndex): SideIndex => (s === 0 ? 1 : 0);
const SIDES = [0, 1] as const;

/**
 * Una sala de combate PvP (F5-04, D-056). Clase pura (sin Nest ni Socket.IO): recibe acciones, abre decisiones
 * numeradas, lleva el tiempo (30 s → acción por defecto; 3 seguidas → derrota `inactive`), la desconexión (60 s →
 * `abandon`), la rendición y el fin. Todo síncrono: entre comprobar y cambiar el estado no hay `await`.
 */
export class BattleRoom {
  readonly battleId: string;
  readonly players: [string, string];
  private state: BattleState;
  private readonly ctx: BattleContext;
  private readonly seed: number;
  private readonly rng: Rng;
  private readonly clock: RoomClock;
  private readonly send: (o: RoomOutgoing) => void;
  private readonly onEnd: (r: BattleResult) => void;
  private readonly onError: (err: unknown) => void;
  private readonly startedAt: Date;

  private decision = 0;
  private mustDo: [Must, Must] = ['act', 'act'];
  private actions: [BattleAction | null, BattleAction | null] = [null, null];
  private deadline = 0;
  private timer: unknown = null;
  private readonly timeouts: [number, number] = [0, 0];
  private readonly connected: [boolean, boolean] = [true, true];
  private readonly grace: [unknown, unknown] = [null, null];
  /** revealed[s] = teamIndex del lado `s` que el rival ya ha visto. */
  private readonly revealed: [Set<number>, Set<number>];
  private readonly log: DecisionLog[] = [];
  private finished = false;

  constructor(init: BattleRoomInit) {
    this.battleId = init.battleId;
    this.players = init.players;
    this.state = init.state;
    this.ctx = init.ctx;
    this.seed = init.seed;
    this.rng = createRng(init.seed);
    this.clock = init.clock ?? REAL_CLOCK;
    this.send = init.send;
    this.onEnd = init.onEnd;
    this.onError = init.onError ?? (() => undefined);
    this.startedAt = new Date(this.clock.now());
    this.revealed = [
      new Set([this.state.sides[0].active]),
      new Set([this.state.sides[1].active]),
    ];
    this.openDecision();
  }

  get ended(): boolean {
    return this.finished;
  }

  sideOf(playerId: string): SideIndex | null {
    const i = this.players.indexOf(playerId);
    return i === 0 || i === 1 ? i : null;
  }

  /** Lo que ve el lado `side` ahora mismo (para `battle:start`, `pvp:hello` y cada `battle:turn`). */
  view(side: SideIndex): PvpBattleView {
    const waiting =
      this.finished ||
      this.mustDo[side] === 'wait' ||
      this.actions[side] !== null;
    return viewFor(this.state, side, {
      battleId: this.battleId,
      decision: waiting ? null : this.decision,
      mustDo: waiting ? 'wait' : this.mustDo[side],
      remainingMs: this.finished
        ? 0
        : Math.max(0, this.deadline - this.clock.now()),
      revealed: this.revealed[other(side)],
    });
  }

  /** `battle:act`. Lanza `PvpFailure` con el código para el ack. La primera acción de cada decisión manda. */
  act(
    playerId: string,
    decision: number,
    action: BattleAction,
  ): { duplicate: boolean } {
    const side = this.sideOf(playerId);
    if (this.finished || side === null) {
      throw new PvpFailure('battle-not-found');
    }
    if (action.kind === 'forfeit') {
      this.end(other(side), 'forfeit');
      return { duplicate: false };
    }
    if (decision < this.decision) throw new PvpFailure('stale-decision');
    if (decision > this.decision) throw new PvpFailure('bad-request');
    if (this.mustDo[side] === 'wait') throw new PvpFailure('not-your-turn');
    if (this.actions[side] !== null) return { duplicate: true };
    try {
      validateAction(this.state, side, action);
    } catch (err) {
      if (err instanceof BattleError) throw new PvpFailure('invalid-action');
      throw err;
    }
    this.actions[side] = action;
    this.timeouts[side] = 0;
    if (SIDES.every((s) => this.mustDo[s] === 'wait' || this.actions[s])) {
      this.resolve([false, false]);
    }
    return { duplicate: false };
  }

  forfeit(playerId: string): void {
    const side = this.sideOf(playerId);
    if (this.finished || side === null) {
      throw new PvpFailure('battle-not-found');
    }
    this.end(other(side), 'forfeit');
  }

  /** Se cerró el último socket del jugador: el combate sigue y tiene 60 s para volver. */
  disconnect(playerId: string): void {
    const side = this.sideOf(playerId);
    if (this.finished || side === null || !this.connected[side]) return;
    this.connected[side] = false;
    this.grace[side] = this.clock.setTimeout(
      () => this.guard(() => this.graceOver(side)),
      PVP_RECONNECT_GRACE_MS,
    );
    this.notifyOpponent(side, false, PVP_RECONNECT_GRACE_MS);
  }

  reconnect(playerId: string): void {
    const side = this.sideOf(playerId);
    if (this.finished || side === null || this.connected[side]) return;
    this.connected[side] = true;
    this.clock.clearTimeout(this.grace[side]);
    this.grace[side] = null;
    this.notifyOpponent(side, true, 0);
  }

  private openDecision(): void {
    this.decision++;
    const forced = this.state.pendingSwitch[0] || this.state.pendingSwitch[1];
    this.mustDo = SIDES.map((s) =>
      forced ? (this.state.pendingSwitch[s] ? 'switch' : 'wait') : 'act',
    ) as [Must, Must];
    this.actions = [null, null];
    this.deadline = this.clock.now() + PVP_DECISION_MS;
    this.clock.clearTimeout(this.timer);
    this.timer = this.clock.setTimeout(
      () => this.guard(() => this.timeUp()),
      PVP_DECISION_MS,
    );
  }

  /** Se acabó el tiempo: por quien no eligió se juega la acción por defecto. */
  private timeUp(): void {
    if (this.finished) return;
    const timedOut: [boolean, boolean] = [false, false];
    for (const s of SIDES) {
      if (this.mustDo[s] === 'wait' || this.actions[s]) continue;
      this.actions[s] = defaultAction(this.state, s);
      timedOut[s] = true;
      this.timeouts[s]++;
    }
    const out = SIDES.filter((s) => this.timeouts[s] >= PVP_MAX_TIMEOUTS);
    if (out.length === 2) return this.end(null, 'inactive', timedOut);
    if (out.length === 1) return this.end(other(out[0]), 'inactive', timedOut);
    this.resolve(timedOut);
  }

  private resolve(timedOut: [boolean, boolean]): void {
    this.clock.clearTimeout(this.timer);
    const before = this.state;
    const actions = this.actions;
    const r = resolveTurn(this.ctx, before, actions, this.rng);
    this.log.push({ decision: this.decision, actions, timedOut });
    for (const e of r.events) {
      if (e.kind === 'switch') this.revealed[e.side].add(e.teamIndex);
    }
    this.state = r.state;
    const over = r.state.winner !== null;
    if (!over) this.openDecision();
    for (const s of SIDES) {
      this.send({
        playerId: this.players[s],
        event: 'battle:turn',
        msg: {
          battleId: this.battleId,
          events: eventsFor(r.events, before, s),
          view: over ? this.finalView(s) : this.view(s),
        },
      });
    }
    if (over) this.end(r.state.winner, 'faint');
  }

  private finalView(side: SideIndex): PvpBattleView {
    this.clock.clearTimeout(this.timer);
    return viewFor(this.state, side, {
      battleId: this.battleId,
      decision: null,
      mustDo: 'wait',
      remainingMs: 0,
      revealed: this.revealed[other(side)],
    });
  }

  private graceOver(side: SideIndex): void {
    if (this.finished) return;
    this.end(this.connected[other(side)] ? other(side) : null, 'abandon');
  }

  private notifyOpponent(side: SideIndex, connected: boolean, graceMs: number) {
    this.send({
      playerId: this.players[other(side)],
      event: 'battle:opponent',
      msg: { battleId: this.battleId, connected, graceMs },
    });
  }

  /**
   * Fin del combate. `winner` en lados reales (0 = `players[0]`). `timedOut` = la decisión que terminó por tiempo
   * (para el registro). Idempotente: una segunda llamada no hace nada.
   */
  private end(
    winner: SideIndex | null,
    reason: PvpEndReason,
    timedOut?: [boolean, boolean],
  ): void {
    if (this.finished) return;
    this.finished = true;
    this.clock.clearTimeout(this.timer);
    for (const s of SIDES) this.clock.clearTimeout(this.grace[s]);
    if (timedOut) {
      this.log.push({
        decision: this.decision,
        actions: this.actions,
        timedOut,
      });
    }
    for (const s of SIDES) {
      this.send({
        playerId: this.players[s],
        event: 'battle:end',
        msg: {
          battleId: this.battleId,
          winner: winner === null ? null : winner === s ? 0 : 1,
          reason,
        },
      });
    }
    this.onEnd({
      battleId: this.battleId,
      players: this.players,
      winner,
      reason,
      seed: this.seed,
      turns: this.state.turn,
      log: this.log,
      startedAt: this.startedAt,
      endedAt: new Date(this.clock.now()),
    });
  }

  /** Un temporizador nunca debe tumbar el proceso: el error se informa y la sala sigue como estaba. */
  private guard(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      this.onError(err);
    }
  }
}
