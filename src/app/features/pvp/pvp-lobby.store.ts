import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  BattleEndMsg,
  BattleStartMsg,
  HelloReply,
  InviteCreateReply,
  InviteJoinReply,
  PvpBattleView,
  PvpErrorCode,
  QueueJoinReply,
} from '@shared/protocol/pvp';

import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { PvpSocketService } from '../../services/game/pvp-socket.service';

export type LobbyPhase =
  'connecting' | 'menu' | 'inviting' | 'joining' | 'queue' | 'matched' | 'error';

export interface PvpMatch {
  battleId: string;
  opponent: string;
  /** Especie con la que sale cada uno (para el cara a cara). */
  myLead: number;
  foeLead: number | null;
  foeTeamSize: number;
}

/** Lo que se le dice al jugador por cada código del servidor (D-056). */
const MESSAGES: Record<PvpErrorCode, string> = {
  unauthorized: 'Tu sesión caducó. Vuelve a entrar.',
  'rate-limited': 'Vas muy rápido. Espera un segundo.',
  'bad-request': 'Ese código no es válido: son 6 letras y números.',
  'team-not-found': 'Ese equipo ya no existe. Elige otro.',
  'team-empty': 'Ese equipo no tiene Pokémon. Añade alguno en Equipos.',
  'already-in-battle': 'Ya estás en un combate.',
  'invite-not-found': 'Ese código no existe o ya caducó.',
  'own-invite': 'Ese es tu propio código: pásaselo a tu rival.',
  'battle-not-found': 'Ese combate ya terminó.',
  'stale-decision': 'Ese turno ya pasó.',
  'invalid-action': 'No puedes hacer eso ahora.',
  'not-your-turn': 'Ahora le toca a tu rival.',
  'server-error': 'Algo falló en el servidor. Inténtalo otra vez.',
};

const END_TEXT: Record<BattleEndMsg['reason'], [win: string, lose: string]> = {
  forfeit: ['Tu rival se rindió. ¡Ganaste!', 'Te rendiste.'],
  abandon: ['Tu rival se desconectó. ¡Ganaste!', 'Perdiste por desconectarte.'],
  inactive: ['Tu rival no eligió a tiempo. ¡Ganaste!', 'Perdiste por no elegir a tiempo.'],
  faint: ['¡Ganaste el combate!', 'Perdiste el combate.'],
};

/**
 * Sala de espera del PvP en la app (F5-03, D-056): invitar con código, unirse, buscar rival y el cara a cara cuando
 * se emparejan. Toda la lógica aquí (probada con un socket falso); la página solo pinta. Se provee en la página.
 */
@Injectable()
export class PvpLobbyStore {
  private readonly socket = inject(PvpSocketService);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);

  readonly phase = signal<LobbyPhase>('connecting');
  /** Equipo elegido para combatir (id de `/teams`). */
  readonly teamId = signal<number | null>(null);
  readonly code = signal<string | null>(null);
  readonly match = signal<PvpMatch | null>(null);
  /** Aviso para el jugador (error, resultado, código caducado), o null. */
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);
  /** Sube con cada rechazo del servidor (el teclado del código tiembla). */
  readonly rejections = signal(0);

  private readonly expiresAt = signal(0);
  private readonly now = signal(Date.now());
  readonly remainingS = computed(() =>
    Math.max(0, Math.ceil((this.expiresAt() - this.now()) / 1000)),
  );

  private ticker: ReturnType<typeof setInterval> | null = null;
  private unsubscribe: (() => void)[] = [];

  async enter(): Promise<void> {
    this.phase.set('connecting');
    this.notice.set(null);
    if (this.unsubscribe.length === 0) {
      this.unsubscribe = [
        this.socket.on('battle:start', (m) => this.onStart(m)),
        this.socket.on('battle:end', (m) => this.onEnd(m)),
      ];
    }
    try {
      await this.socket.ready();
      const hello = (await this.socket.request('pvp:hello', {})) as HelloReply;
      if (!hello.ok) return this.fail(hello.code, 'error');
      if (hello.battle) return this.showMatch(hello.battle, hello.battle.foe.name, false);
      if (hello.lobby?.kind === 'invite') {
        this.startInvite(hello.lobby.code, hello.lobby.remainingMs);
      } else if (hello.lobby?.kind === 'queue') {
        this.phase.set('queue');
      } else {
        this.phase.set('menu');
      }
    } catch (err) {
      this.offline(err);
    }
  }

  /** Al salir de la pantalla: no dejar a nadie esperando un rival que ya no mira. */
  async leave(): Promise<void> {
    this.stopTicker();
    const waiting = this.phase() === 'inviting' || this.phase() === 'queue';
    if (waiting) await this.socket.request('pvp:lobby:leave', {}).catch(() => undefined);
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    if (this.phase() !== 'matched') this.socket.disconnect();
  }

  async invite(): Promise<void> {
    const teamId = this.requireTeam();
    if (teamId === null) return;
    const r = (await this.send('pvp:invite:create', { teamId })) as InviteCreateReply | null;
    if (!r) return;
    if (!r.ok) return this.fail(r.code);
    this.startInvite(r.code, r.remainingMs);
  }

  openJoin(): void {
    if (this.requireTeam() === null) return;
    this.notice.set(null);
    this.phase.set('joining');
  }

  async join(raw: string): Promise<void> {
    const teamId = this.requireTeam();
    if (teamId === null) return;
    const code = raw.trim().toUpperCase();
    const r = (await this.send('pvp:invite:join', { code, teamId })) as InviteJoinReply | null;
    // Si sale bien, `battle:start` lleva al cara a cara.
    if (r && !r.ok) this.fail(r.code);
  }

  async searchRival(): Promise<void> {
    const teamId = this.requireTeam();
    if (teamId === null) return;
    const r = (await this.send('pvp:queue:join', { teamId })) as QueueJoinReply | null;
    if (!r) return;
    if (!r.ok) return this.fail(r.code);
    // Emparejado al momento: `battle:start` ya llegó (o está llegando); si no, a esperar.
    if (!r.matched && this.phase() !== 'matched') this.phase.set('queue');
  }

  /** Cancela la invitación, sale de la cola o cierra el teclado del código. */
  async cancel(): Promise<void> {
    this.stopTicker();
    const waiting = this.phase() === 'inviting' || this.phase() === 'queue';
    this.phase.set('menu');
    this.code.set(null);
    if (waiting) await this.socket.request('pvp:lobby:leave', {}).catch(() => undefined);
  }

  async forfeit(): Promise<void> {
    const m = this.match();
    if (!m) return;
    const r = await this.send('battle:forfeit', { battleId: m.battleId });
    if (r && !r.ok) this.fail(r.code);
  }

  private async send<K extends Parameters<PvpSocketService['request']>[0]>(
    event: K,
    body: Parameters<PvpSocketService['request']>[1],
  ) {
    this.busy.set(true);
    this.notice.set(null);
    try {
      return await this.socket.request(event, body as never);
    } catch (err) {
      this.offline(err);
      return null;
    } finally {
      this.busy.set(false);
    }
  }

  private requireTeam(): number | null {
    const id = this.teamId();
    if (id === null) this.notice.set('Elige un equipo para combatir.');
    return id;
  }

  private startInvite(code: string, remainingMs: number): void {
    this.code.set(code);
    this.now.set(Date.now());
    this.expiresAt.set(Date.now() + remainingMs);
    this.phase.set('inviting');
    this.stopTicker();
    this.ticker = setInterval(() => {
      this.now.set(Date.now());
      if (this.remainingS() === 0) {
        this.stopTicker();
        this.code.set(null);
        this.phase.set('menu');
        this.notice.set('Tu código caducó. Crea otro.');
      }
    }, 1000);
  }

  private onStart(m: BattleStartMsg): void {
    this.showMatch(m.view, m.opponent, true);
  }

  private showMatch(view: PvpBattleView, opponent: string, fresh: boolean): void {
    this.stopTicker();
    this.code.set(null);
    const foeLead = view.foe.revealed.find((p) => p.teamIndex === view.foe.active) ?? null;
    this.match.set({
      battleId: view.battleId,
      opponent,
      myLead: view.me.team[view.me.active].speciesId,
      foeLead: foeLead?.speciesId ?? null,
      foeTeamSize: view.foe.teamSize,
    });
    this.notice.set(null);
    this.phase.set('matched');
    if (fresh) {
      // Grito del rival + vibración en el mismo instante (DISENO §4.10).
      this.haptics.success();
      if (foeLead) void this.audio.playCry(foeLead.speciesId);
    }
  }

  private onEnd(m: BattleEndMsg): void {
    if (this.match()?.battleId !== m.battleId) return;
    const [win, lose] = END_TEXT[m.reason];
    this.notice.set(
      m.winner === 0 ? win : m.winner === 1 ? lose : 'El combate terminó sin ganador.',
    );
    this.match.set(null);
    this.phase.set('menu');
  }

  private fail(code: PvpErrorCode, phase?: LobbyPhase): void {
    this.haptics.shake();
    this.rejections.update((n) => n + 1);
    this.notice.set(MESSAGES[code]);
    if (phase) this.phase.set(phase);
  }

  private offline(err: unknown): void {
    console.warn('[pvp] sin conexión', err);
    this.stopTicker();
    this.phase.set('error');
    this.notice.set(
      err instanceof Error ? err.message : 'Sin conexión con el servidor. Inténtalo otra vez.',
    );
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }
}
