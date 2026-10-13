import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { createBattle } from '../../../shared/engine/battle/battle-engine.js';
import { viewFor } from '../../../shared/engine/battle/pvp-view.js';
import type {
  BattleState,
  SideIndex,
} from '../../../shared/engine/battle/types.js';
import {
  PVP_DECISION_MS,
  type BattleEndMsg,
  type BattleStartMsg,
  type PvpBattleView,
  type PvpEndReason,
} from '../../../shared/protocol/pvp.js';
import { BattleDataService } from './battle-data.service.js';
import { PvpFailure } from './pvp-failure.js';
import type { LobbyEntrant } from './pvp-lobby.js';

/** Mensaje que el gateway debe mandar a la sala `player:<id>`. La sala no conoce Socket.IO. */
export type Outgoing =
  | { playerId: string; event: 'battle:start'; msg: BattleStartMsg }
  | { playerId: string; event: 'battle:end'; msg: BattleEndMsg };

interface Room {
  battleId: string;
  players: [string, string];
  state: BattleState;
  /** revealed[s] = teamIndex del lado `s` que el rival ya ha visto. */
  revealed: [Set<number>, Set<number>];
  decision: number;
  startedAt: number;
}

/**
 * Combates PvP en curso, en memoria (un proceso, D-005). F5-03: empezar, ver (para `pvp:hello`) y rendirse.
 * F5-04 añade las decisiones, el temporizador, la reconexión y guardar el resultado (plan `fases/F5-pvp.md`).
 * Todo síncrono: nada de `await` entre comprobar y cambiar.
 */
@Injectable()
export class BattleRoomsService {
  private readonly logger = new Logger(BattleRoomsService.name);
  private readonly rooms = new Map<string, Room>();
  private readonly roomOf = new Map<string, string>();

  constructor(private readonly data: BattleDataService) {}

  has(playerId: string): boolean {
    return this.roomOf.has(playerId);
  }

  start(
    a: LobbyEntrant,
    b: LobbyEntrant,
  ): { battleId: string; out: Outgoing[] } {
    const ctx = this.data.ctx;
    if (!ctx) throw new PvpFailure('server-error');
    const state = createBattle(ctx, [a.side, b.side]);
    const room: Room = {
      battleId: randomUUID(),
      players: [a.playerId, b.playerId],
      state,
      revealed: [new Set([0]), new Set([0])],
      decision: 1,
      startedAt: Date.now(),
    };
    this.rooms.set(room.battleId, room);
    this.roomOf.set(a.playerId, room.battleId);
    this.roomOf.set(b.playerId, room.battleId);
    this.logger.log({
      msg: 'battle.start',
      battleId: room.battleId,
      players: room.players,
    });
    const out = ([0, 1] as const).map((side): Outgoing => ({
      playerId: room.players[side],
      event: 'battle:start',
      msg: {
        view: this.view(room, side),
        opponent: state.sides[side === 0 ? 1 : 0].name,
      },
    }));
    return { battleId: room.battleId, out };
  }

  viewFor(playerId: string): PvpBattleView | null {
    const room = this.roomFor(playerId);
    return room ? this.view(room, this.sideOf(room, playerId)) : null;
  }

  forfeit(playerId: string, battleId: string): Outgoing[] {
    const room = this.rooms.get(battleId);
    if (!room || !room.players.includes(playerId)) {
      throw new PvpFailure('battle-not-found');
    }
    const loser = this.sideOf(room, playerId);
    return this.end(room, loser === 0 ? 1 : 0, 'forfeit');
  }

  private end(room: Room, winner: SideIndex, reason: PvpEndReason): Outgoing[] {
    this.rooms.delete(room.battleId);
    for (const p of room.players) this.roomOf.delete(p);
    this.logger.log({
      msg: 'battle.end',
      battleId: room.battleId,
      winner: room.players[winner],
      reason,
      ms: Date.now() - room.startedAt,
    });
    // TODO(F5-04): guardar el resultado en la tabla Battle (D-056, regla 10).
    return ([0, 1] as const).map((side) => ({
      playerId: room.players[side],
      event: 'battle:end',
      msg: {
        battleId: room.battleId,
        winner: winner === side ? 0 : 1,
        reason,
      },
    }));
  }

  private view(room: Room, side: SideIndex): PvpBattleView {
    const foe: SideIndex = side === 0 ? 1 : 0;
    return viewFor(room.state, side, {
      battleId: room.battleId,
      decision: room.decision,
      mustDo: 'act',
      remainingMs: PVP_DECISION_MS,
      revealed: room.revealed[foe],
    });
  }

  private roomFor(playerId: string): Room | undefined {
    const id = this.roomOf.get(playerId);
    return id ? this.rooms.get(id) : undefined;
  }

  private sideOf(room: Room, playerId: string): SideIndex {
    return room.players[0] === playerId ? 0 : 1;
  }
}
