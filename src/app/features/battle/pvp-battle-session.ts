import { Injectable, effect, inject } from '@angular/core';
import type { HelloReply, PvpBattleView } from '@shared/protocol/pvp';

import { PvpSocketService } from '../../services/game/pvp-socket.service';
import type { BattleController, RemoteLink } from './battle.controller';

/**
 * Une la pantalla de combate PvP (`/pvp/combate`) con el socket (F5-04): pide `pvp:hello`, arranca el controlador en
 * modo remoto, le pasa `battle:turn`/`battle:end`/`battle:opponent` y, si el socket se corta y vuelve, se pone al día
 * con otro `pvp:hello` (los turnos perdidos mientras tanto no se animan, pero la vista queda bien).
 */
@Injectable()
export class PvpBattleSession {
  private readonly socket = inject(PvpSocketService);
  private ctrl: BattleController | null = null;
  private off: (() => void)[] = [];
  private wasOnline = true;

  constructor() {
    effect(() => {
      const online = this.socket.status() === 'online';
      if (online && !this.wasOnline && this.ctrl) void this.catchUp();
      this.wasOnline = online;
    });
  }

  async open(ctrl: BattleController): Promise<void> {
    this.close();
    this.ctrl = ctrl;
    this.off = [
      this.socket.on('battle:turn', (m) => ctrl.onTurn(m)),
      this.socket.on('battle:end', (m) => ctrl.onEnd(m)),
      this.socket.on('battle:opponent', (m) => ctrl.onOpponent(m)),
    ];
    const view = await this.hello();
    if (view === undefined) return;
    if (!view) return ctrl.interrupted('No hay ningún combate en curso.');
    // Recién empezado (nadie ha elegido aún): con presentación. Si vuelves a mitad, directo al combate.
    const fresh = view.turn === 0 && view.decision === 1 && view.mustDo === 'act';
    await ctrl.startRemote(view, view.foe.name, this.link(), fresh);
  }

  close(): void {
    for (const off of this.off) off();
    this.off = [];
    this.ctrl = null;
  }

  private link(): RemoteLink {
    return {
      act: (battleId, decision, action) =>
        this.socket.request('battle:act', { battleId, decision, action }),
      forfeit: (battleId) => this.socket.request('battle:forfeit', { battleId }),
    };
  }

  /** La vista del combate, `null` si no hay combate, `undefined` si no se pudo preguntar (ya avisado). */
  private async hello(): Promise<PvpBattleView | null | undefined> {
    try {
      await this.socket.ready();
      const r = (await this.socket.request('pvp:hello', {})) as HelloReply;
      if (!r.ok) {
        this.ctrl?.interrupted('No se pudo recuperar el combate.');
        return undefined;
      }
      return r.battle;
    } catch (err) {
      this.ctrl?.interrupted(err instanceof Error ? err.message : 'Sin conexión con el servidor.');
      return undefined;
    }
  }

  private async catchUp(): Promise<void> {
    const ctrl = this.ctrl;
    const view = await this.hello();
    if (!ctrl || view === undefined || this.ctrl !== ctrl) return;
    if (view) ctrl.resync(view);
    // Sin combate: o terminó mientras no había red (el battle:end se perdió) o el servidor se reinició.
    else ctrl.interrupted('El combate terminó mientras no tenías conexión.');
  }
}
