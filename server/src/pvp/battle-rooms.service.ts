import { randomInt, randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { createBattle } from '../../../shared/engine/battle/battle-engine.js';
import type {
  BattleAction,
  SideIndex,
} from '../../../shared/engine/battle/types.js';
import type {
  BattleStartMsg,
  PvpBattleView,
} from '../../../shared/protocol/pvp.js';
import { BattleDataService } from './battle-data.service.js';
import {
  type BattleResult,
  BattleRoom,
  type RoomOutgoing,
} from './battle-room.js';
import { BattlesRepository } from './battles.repository.js';
import { PvpFailure } from './pvp-failure.js';
import type { LobbyEntrant } from './pvp-lobby.js';

/** Mensaje que el gateway debe mandar a la sala `player:<id>`. Las salas no conocen Socket.IO. */
export type Outgoing =
  | { playerId: string; event: 'battle:start'; msg: BattleStartMsg }
  | RoomOutgoing;

/** Semillas de 31 bits: caben en el `Int` de la tabla `Battle`. */
const SEED_MAX = 2 ** 31 - 1;

/**
 * Combates PvP en curso, en memoria (un proceso, D-005): un `BattleRoom` por combate (F5-04). Las salas mandan
 * mensajes también desde sus temporizadores, así que todo sale por el canal que conecta el gateway (`attach`). Al
 * terminar, la sala se cierra en memoria y DESPUÉS se guarda el resultado (tabla `Battle`, idempotente).
 * Todo síncrono: nada de `await` entre comprobar y cambiar.
 */
@Injectable()
export class BattleRoomsService {
  private readonly logger = new Logger(BattleRoomsService.name);
  private readonly rooms = new Map<string, BattleRoom>();
  private readonly roomOf = new Map<string, string>();
  private sink: (o: Outgoing) => void = () => undefined;

  constructor(
    private readonly data: BattleDataService,
    private readonly battles: BattlesRepository,
  ) {}

  /** El gateway conecta aquí el envío a los sockets (al iniciarse). */
  attach(sink: (o: Outgoing) => void): void {
    this.sink = sink;
  }

  has(playerId: string): boolean {
    return this.roomOf.has(playerId);
  }

  /** Empieza el combate y manda `battle:start` a los dos. Devuelve el id. */
  start(a: LobbyEntrant, b: LobbyEntrant): string {
    const ctx = this.data.ctx;
    if (!ctx) throw new PvpFailure('server-error');
    const state = createBattle(ctx, [a.side, b.side]);
    const room = new BattleRoom({
      battleId: randomUUID(),
      players: [a.playerId, b.playerId],
      state,
      ctx,
      seed: randomInt(0, SEED_MAX),
      send: (o) => this.sink(o),
      onEnd: (r) => this.closed(r),
      onError: (err) =>
        this.logger.error({
          msg: 'battle.timer_error',
          battleId: room.battleId,
          reason: err instanceof Error ? err.message : String(err),
        }),
    });
    this.rooms.set(room.battleId, room);
    this.roomOf.set(a.playerId, room.battleId);
    this.roomOf.set(b.playerId, room.battleId);
    this.logger.log({
      msg: 'battle.start',
      battleId: room.battleId,
      players: room.players,
    });
    for (const side of [0, 1] as const) {
      this.sink({
        playerId: room.players[side],
        event: 'battle:start',
        msg: {
          view: room.view(side),
          opponent: state.sides[side === 0 ? 1 : 0].name,
        },
      });
    }
    return room.battleId;
  }

  viewFor(playerId: string): PvpBattleView | null {
    const room = this.roomFor(playerId);
    const side = room?.sideOf(playerId);
    return room && side != null ? room.view(side) : null;
  }

  act(
    playerId: string,
    battleId: string,
    decision: number,
    action: BattleAction,
  ): { duplicate: boolean } {
    return this.mine(playerId, battleId).act(playerId, decision, action);
  }

  forfeit(playerId: string, battleId: string): void {
    this.mine(playerId, battleId).forfeit(playerId);
  }

  /** Se cerró el último socket del jugador. */
  disconnect(playerId: string): void {
    this.roomFor(playerId)?.disconnect(playerId);
  }

  /** Volvió a abrir un socket. */
  reconnect(playerId: string): void {
    this.roomFor(playerId)?.reconnect(playerId);
  }

  /** La sala del combate `battleId` si el jugador está en ella; si no, como si no existiera. */
  private mine(playerId: string, battleId: string): BattleRoom {
    const room = this.rooms.get(battleId);
    if (!room || room.sideOf(playerId) === null) {
      throw new PvpFailure('battle-not-found');
    }
    return room;
  }

  private closed(r: BattleResult): void {
    this.rooms.delete(r.battleId);
    for (const p of r.players) this.roomOf.delete(p);
    const winner: SideIndex | null = r.winner;
    this.logger.log({
      msg: 'battle.end',
      battleId: r.battleId,
      winner: winner === null ? null : r.players[winner],
      reason: r.reason,
      turns: r.turns,
      ms: r.endedAt.getTime() - r.startedAt.getTime(),
    });
    // Después de cerrar en memoria: si la base falla, los jugadores ya están libres (se reintenta dentro).
    void this.battles.save(r);
  }

  private roomFor(playerId: string): BattleRoom | undefined {
    const id = this.roomOf.get(playerId);
    return id ? this.rooms.get(id) : undefined;
  }
}
