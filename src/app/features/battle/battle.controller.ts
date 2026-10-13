import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import type { Move, TypeName } from '@shared/data/dataset.types';
import { TRAINERS, type TrainerDef, trainerTeam } from '@shared/data/trainers';
import { chooseAction } from '@shared/engine/battle/ai';
import { createBattle, resolveTurn } from '@shared/engine/battle/battle-engine';
import { isSupportedMove } from '@shared/engine/battle/moves';
import { buildTypeChart, effectiveness } from '@shared/engine/battle/type-chart';
import type {
  BattleAction,
  BattleContext,
  BattleEvent,
  BattleSide,
  BattleState,
  MajorStatus,
  SideIndex,
} from '@shared/engine/battle/types';
import { createRng, type Rng } from '@shared/engine/rng';
import type {
  BattleActReply,
  BattleEndMsg,
  BattleForfeitReply,
  BattleOpponentMsg,
  BattleTurnMsg,
  PublicPokemon,
  PvpBattleView,
  PvpEndReason,
  PvpErrorCode,
  PvpEvent,
} from '@shared/protocol/pvp';
import { AudioService } from '../../services/game/audio.service';
import { eventSfx, hitSfx } from './battle-sfx';
import { DatasetService } from '../../services/game/dataset.service';
import { HapticsService } from '../../services/game/haptics.service';
import { PVP_END_TEXT, describeEvent } from './battle-text';

/** Lo que se ve de cada lado: va al ritmo de los eventos, no salta al estado final del turno. */
export interface ShownPokemon {
  teamIndex: number;
  speciesId: number;
  name: string;
  level: number;
  types: TypeName[];
  hp: number;
  maxHp: number;
  status: MajorStatus | null;
  fainted: boolean;
}

/** Efecto visual que la página anima (sacudida, partículas, número de daño…). */
export interface BattleFx {
  id: number;
  side: SideIndex;
  kind: 'lunge' | 'hit' | 'faint' | 'enter' | 'heal' | 'status';
  amount?: number;
  /** Fracción de los PS máximos (para la fuerza de la sacudida). */
  ratio?: number;
  moveType?: TypeName;
  crit?: boolean;
}

export type Phase =
  'pick-rival' | 'loading' | 'choose' | 'animating' | 'switch' | 'waiting' | 'ended' | 'error';

/** Cómo habla el controlador con el servidor en PvP (F5-04). La página lo implementa con `PvpSocketService`. */
export interface RemoteLink {
  act(battleId: string, decision: number, action: BattleAction): Promise<BattleActReply>;
  forfeit(battleId: string): Promise<BattleForfeitReply>;
}

/** Reintentos de `battle:act` si la red falla (la misma decisión: es idempotente, D-056). */
const ACT_RETRY_MS = [1000, 2000, 4000];

const REMOTE_MESSAGES: Partial<Record<PvpErrorCode, string>> = {
  'invalid-action': 'No puedes hacer eso ahora.',
  'not-your-turn': 'Ahora le toca a tu rival.',
  'rate-limited': 'Vas muy rápido. Espera un segundo.',
};

export const PLAYER: SideIndex = 0;
export const RIVAL: SideIndex = 1;

/** Ritmo de la escena (ms). Con "reducir movimiento" todo va al doble de rápido. */
const PACE = { text: 1000, silent: 420, hit: 700 };

/**
 * Combate local contra la IA (F4-05): el motor puro (`shared/engine/battle`) decide; esto lo pone en escena.
 * En PvP (F5-04, modo remoto) el servidor decide: llegan la vista (`PvpBattleView`, tu lado completo y lo público del
 * rival) y los eventos de cada turno ya girados (tú = lado 0), y esta misma reproducción los muestra. Lo vive todo aquí
 * para que la escena AR (F4-07) lo herede.
 */
@Injectable()
export class BattleController {
  private readonly dataset = inject(DatasetService);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);

  readonly trainers = TRAINERS;
  readonly phase = signal<Phase>('pick-rival');
  readonly message = signal('');
  readonly error = signal<string | null>(null);
  readonly rival = signal<TrainerDef | null>(null);
  readonly shown = signal<[ShownPokemon | null, ShownPokemon | null]>([null, null]);
  readonly fx = signal<BattleFx | null>(null);
  readonly winner = signal<SideIndex | null>(null);
  /** Estado real del motor (para el menú: PP, banquillo). */
  readonly state = signal<BattleState | null>(null);

  private ctx: BattleContext | null = null;
  private rng: Rng = createRng(1);
  private fxId = 0;
  private readonly fast =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── PvP (modo remoto) ──
  readonly remote = signal(false);
  /** Lo último que mandó el servidor. */
  readonly view = signal<PvpBattleView | null>(null);
  readonly opponent = signal('');
  readonly endReason = signal<PvpEndReason | null>(null);
  private link: RemoteLink | null = null;
  /** Los turnos se reproducen en orden aunque lleguen mientras se anima el anterior. */
  private queue: Promise<void> = Promise.resolve();
  private readonly now = signal(Date.now());
  private readonly deadline = signal(0);
  private readonly awayUntil = signal<number | null>(null);
  private ticker: ReturnType<typeof setInterval> | null = null;
  /** Segundos para elegir (cuenta atrás del servidor; el reloj del móvil no manda). */
  readonly remainingS = computed(() =>
    Math.max(0, Math.ceil((this.deadline() - this.now()) / 1000)),
  );
  /** Segundos que le quedan al rival desconectado para volver, o null si está. */
  readonly opponentAwayS = computed(() => {
    const until = this.awayUntil();
    return until === null ? null : Math.max(0, Math.ceil((until - this.now()) / 1000));
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTicker());
  }

  /** Tu lado: el del motor en local, el que manda el servidor en PvP (para el menú: PP y banquillo). */
  private readonly mySide = computed<BattleSide | null>(() =>
    this.remote() ? (this.view()?.me ?? null) : (this.state()?.sides[PLAYER] ?? null),
  );

  /** Movimientos del activo del jugador con lo que hace falta para el menú. */
  readonly moves = computed(() => {
    const side = this.mySide();
    const ctx = this.ctx;
    const foe = this.shown()[RIVAL];
    if (!side || !ctx || !foe) return [];
    const me = side.team[side.active];
    return me.moves.map((slot, index) => {
      const move = ctx.moves.get(slot.moveId) as Move;
      return {
        index,
        name: move.names.es,
        type: move.type,
        category: move.category,
        pp: slot.pp,
        maxPp: slot.maxPp,
        /** null = de estado (no aplica eficacia). */
        effectiveness:
          move.category === 'status' ? null : effectiveness(ctx.chart, move.type, foe.types),
      };
    });
  });

  /** Equipo del jugador para la hoja de cambio. */
  readonly bench = computed(() => {
    const side = this.mySide();
    if (!side) return [];
    return side.team.map((p, i) => ({
      index: i,
      speciesId: p.speciesId,
      name: this.speciesName(p.speciesId),
      level: p.level,
      hp: p.hp,
      maxHp: p.stats.hp,
      status: p.status,
      active: i === side.active,
    }));
  });

  async start(rival: TrainerDef): Promise<void> {
    this.rival.set(rival);
    this.phase.set('loading');
    this.error.set(null);
    this.winner.set(null);
    try {
      await this.dataset.load();
      const species = this.dataset.species();
      const moves = this.dataset.moves();
      this.ctx = { moves, chart: buildTypeChart(this.dataset.types()) };
      const supported = (id: number) => {
        const m = moves.get(id);
        return !!m && isSupportedMove(m);
      };
      // Equipo de prueba del jugador (hasta que F3 traiga sus capturados): un nivel por encima del rival.
      const top = Math.max(...rival.team.map((t) => t.level));
      const playerDef: TrainerDef = {
        id: 'jugador',
        name: 'Tú',
        difficulty: 'normal',
        ivs: 25,
        team: [
          { speciesId: 25, level: top + 1, nature: 'timid' }, // Pikachu
          { speciesId: 1, level: top + 1, nature: 'modest' }, // Bulbasaur
          { speciesId: 7, level: top + 1, nature: 'bold' }, // Squirtle
        ],
      };
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      this.rng = createRng(seed);
      const state = createBattle(this.ctx, [
        { name: 'Tú', team: trainerTeam(playerDef, species, supported) },
        { name: rival.name, team: trainerTeam(rival, species, supported) },
      ]);
      this.state.set(state);
      // Todos los gritos del combate, ya: con datos móviles el primero no llegaba a sonar (F2-08).
      this.audio.preloadCries(state.sides.flatMap((side) => side.team.map((m) => m.speciesId)));
      this.shown.set([this.snapshot(state, PLAYER), this.snapshot(state, RIVAL)]);
      this.phase.set('animating');
      await this.say(`¡${rival.name} quiere luchar!`, 1200);
      this.emitFx({ side: RIVAL, kind: 'enter' });
      void this.audio.playCry(state.sides[RIVAL].team[0].speciesId);
      await this.say(`${rival.name} saca a ${this.shown()[RIVAL]?.name}.`);
      this.emitFx({ side: PLAYER, kind: 'enter' });
      void this.audio.playCry(state.sides[PLAYER].team[0].speciesId);
      await this.say(`¡Adelante, ${this.shown()[PLAYER]?.name}!`);
      this.toChoose();
    } catch (err) {
      console.error('[battle] no se pudo preparar el combate', err);
      this.error.set('No se pudo preparar el combate. Revisa la conexión e inténtalo otra vez.');
      this.phase.set('error');
    }
  }

  backToPicker(): void {
    this.state.set(null);
    this.shown.set([null, null]);
    this.message.set('');
    this.phase.set('pick-rival');
  }

  /**
   * PvP: empieza (o retoma, `fresh = false`) el combate con lo que mandó el servidor (`battle:start` o `pvp:hello`).
   * La página engancha `battle:turn`, `battle:end` y `battle:opponent` a `onTurn`, `onEnd` y `onOpponent`.
   */
  async startRemote(
    view: PvpBattleView,
    opponent: string,
    link: RemoteLink,
    fresh: boolean,
  ): Promise<void> {
    this.remote.set(true);
    this.link = link;
    this.opponent.set(opponent);
    this.endReason.set(null);
    this.winner.set(null);
    this.error.set(null);
    this.phase.set('loading');
    try {
      await this.dataset.load();
      this.ctx = { moves: this.dataset.moves(), chart: buildTypeChart(this.dataset.types()) };
    } catch (err) {
      console.error('[battle] no se pudo preparar el combate', err);
      this.error.set('No se pudo preparar el combate. Revisa la conexión e inténtalo otra vez.');
      this.phase.set('error');
      return;
    }
    this.setView(view);
    this.audio.preloadCries([
      ...view.me.team.map((m) => m.speciesId),
      ...view.foe.revealed.map((m) => m.speciesId),
    ]);
    this.shown.set([this.viewSnapshot(view, PLAYER), this.viewSnapshot(view, RIVAL)]);
    this.startTicker();
    if (fresh) {
      this.phase.set('animating');
      await this.say(`¡${opponent} quiere luchar!`, 1200);
      this.emitFx({ side: RIVAL, kind: 'enter' });
      const foe = this.shown()[RIVAL];
      if (foe) void this.audio.playCry(foe.speciesId);
      await this.say(`${opponent} saca a ${foe?.name ?? '¿?'}.`);
      this.emitFx({ side: PLAYER, kind: 'enter' });
      void this.audio.playCry(view.me.team[view.me.active].speciesId);
      await this.say(`¡Adelante, ${this.shown()[PLAYER]?.name}!`);
    }
    // Pudo llegar un turno durante la presentación: manda la vista más reciente.
    if (this.phase() !== 'ended') this.applyView();
  }

  /** `battle:turn`: se reproduce en cola, en orden. */
  onTurn(msg: BattleTurnMsg): void {
    if (!this.mine(msg.battleId)) return;
    this.queue = this.queue.then(() => this.playTurn(msg));
  }

  /** `battle:end`: después de los turnos que falten por reproducir. */
  onEnd(msg: BattleEndMsg): void {
    if (!this.mine(msg.battleId)) return;
    this.queue = this.queue.then(() => this.finishRemote(msg.winner, msg.reason));
  }

  /** `battle:opponent`: el rival se fue (con lo que le queda para volver) o volvió. */
  onOpponent(msg: BattleOpponentMsg): void {
    if (!this.mine(msg.battleId)) return;
    this.now.set(Date.now());
    this.awayUntil.set(msg.connected ? null : Date.now() + msg.graceMs);
  }

  /** El servidor ya no conoce el combate (se reinició al desplegar, D-005): sin resultado. */
  interrupted(): void {
    this.stopTicker();
    this.winner.set(null);
    this.message.set('El combate se interrumpió (el servidor se reinició). No cuenta.');
    this.phase.set('ended');
  }

  /** Rendirse en PvP (en local se rinde con `act({ kind: 'forfeit' })`). */
  async forfeit(): Promise<void> {
    const v = this.view();
    if (!this.remote() || !v || !this.link) return;
    try {
      const r = await this.link.forfeit(v.battleId);
      if (!r.ok && r.code === 'battle-not-found') this.interrupted();
    } catch {
      this.message.set('Sin conexión: no se pudo rendir. Inténtalo otra vez.');
    }
  }

  /** El jugador elige; la IA elige; se resuelve el turno y se reproduce. */
  async act(action: BattleAction): Promise<void> {
    if (this.remote()) {
      if (action.kind === 'forfeit') return this.forfeit();
      return this.remoteAct(action);
    }
    const s = this.state();
    const ctx = this.ctx;
    const rival = this.rival();
    if (!s || !ctx || !rival) return;
    if (this.phase() !== 'choose' && this.phase() !== 'switch') return;
    this.phase.set('animating');
    const rivalAction = chooseAction(ctx, s, RIVAL, this.rng, rival.difficulty);
    await this.runTurn(s, [action, rivalAction]);
  }

  private async runTurn(
    before: BattleState,
    actions: [BattleAction | null, BattleAction | null],
  ): Promise<void> {
    const ctx = this.ctx as BattleContext;
    let result;
    try {
      result = resolveTurn(ctx, before, actions, this.rng);
    } catch (err) {
      // No debería pasar (el menú solo ofrece acciones válidas); si pasa, se vuelve a elegir.
      console.error('[battle] acción no válida', err);
      this.toChoose();
      return;
    }
    await this.play(before, result.events);
    this.state.set(result.state);
    this.shown.update(([p, r]) => [
      this.sync(p, result.state, PLAYER),
      this.sync(r, result.state, RIVAL),
    ]);

    if (result.state.winner !== null) {
      this.winner.set(result.state.winner);
      this.phase.set('ended');
      if (result.state.winner === PLAYER) {
        this.haptics.success();
        void this.audio.playSfx('victory');
      }
      return;
    }
    // El rival cambia solo (su IA elige a quién); el jugador elige en la hoja.
    if (result.state.pendingSwitch[RIVAL] && !result.state.pendingSwitch[PLAYER]) {
      const pick = chooseAction(
        ctx,
        result.state,
        RIVAL,
        this.rng,
        this.rival()?.difficulty ?? 'normal',
      );
      await this.runTurn(result.state, [null, pick]);
      return;
    }
    if (result.state.pendingSwitch[PLAYER]) {
      this.phase.set('switch');
      return;
    }
    this.toChoose();
  }

  /** Cambio forzado del jugador (si el rival también debe cambiar, su IA elige a la vez). */
  async forcedSwitch(teamIndex: number): Promise<void> {
    if (this.remote()) return this.remoteAct({ kind: 'switch', teamIndex });
    const s = this.state();
    const ctx = this.ctx;
    if (!s || !ctx || this.phase() !== 'switch') return;
    this.phase.set('animating');
    const rivalPick = s.pendingSwitch[RIVAL]
      ? chooseAction(ctx, s, RIVAL, this.rng, this.rival()?.difficulty ?? 'normal')
      : null;
    await this.runTurn(s, [{ kind: 'switch', teamIndex }, rivalPick]);
  }

  /** Reproduce los eventos uno a uno: texto + efecto + sonido + vibración en el mismo momento (DISENO §4.10). */
  private async play(
    before: BattleState | null,
    events: readonly (BattleEvent | PvpEvent)[],
  ): Promise<void> {
    let lastMove: Move | null = null;
    let crit = false;
    let multiplier = 1;
    for (const e of events) {
      const sfx = eventSfx(e);
      if (sfx) void this.audio.playSfx(sfx);
      const text = describeEvent(e as BattleEvent, {
        pokemon: (side) => this.shown()[side]?.name ?? '',
        move: (id) => this.ctx?.moves.get(id)?.names.es ?? '¿?',
        trainer: (side) =>
          side === PLAYER
            ? 'Tú'
            : this.remote()
              ? this.opponent()
              : (this.rival()?.name ?? 'Rival'),
        player: PLAYER,
      });
      switch (e.kind) {
        case 'move':
          lastMove = this.ctx?.moves.get(e.moveId) ?? null;
          crit = false;
          multiplier = 1;
          this.emitFx({ side: e.side, kind: 'lunge' });
          break;
        case 'crit':
          crit = true;
          break;
        case 'effectiveness':
          multiplier = e.multiplier;
          break;
        case 'damage': {
          const p = this.shown()[e.side];
          this.patch(e.side, { hp: e.hpAfter });
          if (e.amount > 0) {
            if (e.source === 'move') void this.audio.playSfx(hitSfx(crit, multiplier));
            this.emitFx({
              side: e.side,
              kind: 'hit',
              amount: e.amount,
              ratio: p ? e.amount / p.maxHp : 0,
              moveType: e.source === 'move' ? lastMove?.type : undefined,
              crit,
            });
            if (p && e.amount / p.maxHp > 0.35) this.haptics.shake();
            else this.haptics.throw();
          }
          crit = false;
          await this.wait(text ? PACE.text : PACE.hit);
          continue;
        }
        case 'heal':
          this.patch(e.side, { hp: e.hpAfter });
          this.emitFx({ side: e.side, kind: 'heal', amount: e.amount });
          break;
        case 'status':
          this.patch(e.side, { status: e.status });
          this.emitFx({ side: e.side, kind: 'status' });
          break;
        case 'wake':
        case 'thaw':
          this.patch(e.side, { status: null });
          break;
        case 'faint': {
          this.patch(e.side, { fainted: true, hp: 0 });
          this.emitFx({ side: e.side, kind: 'faint' });
          const id = this.shown()[e.side]?.speciesId;
          if (id) void this.audio.playCry(id);
          break;
        }
        case 'switch': {
          // En PvP el evento trae el Pokémon que sale (no se conoce el equipo del rival); en local, el estado de antes.
          const shown =
            'pokemon' in e
              ? this.fromPublic(e.pokemon)
              : before
                ? this.fromMember(before.sides[e.side].team[e.teamIndex], e.teamIndex)
                : null;
          if (!shown) break;
          this.setShown(e.side, shown);
          this.emitFx({ side: e.side, kind: 'enter' });
          void this.audio.playCry(shown.speciesId);
          break;
        }
      }
      if (text) await this.say(text);
      else await this.wait(PACE.silent);
    }
  }

  private toChoose(): void {
    const name = this.shown()[PLAYER]?.name ?? '';
    this.message.set(`¿Qué hará ${name}?`);
    this.phase.set('choose');
  }

  private async say(text: string, ms = PACE.text): Promise<void> {
    this.message.set(text);
    await this.wait(ms);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, this.fast ? ms / 2 : ms));
  }

  private emitFx(fx: Omit<BattleFx, 'id'>): void {
    this.fx.set({ ...fx, id: ++this.fxId });
  }

  private patch(side: SideIndex, changes: Partial<ShownPokemon>): void {
    this.shown.update((s) => {
      const copy = [...s] as typeof s;
      const cur = copy[side];
      if (cur) copy[side] = { ...cur, ...changes };
      return copy;
    });
  }

  private setShown(side: SideIndex, p: ShownPokemon): void {
    this.shown.update((s) => {
      const copy = [...s] as typeof s;
      copy[side] = p;
      return copy;
    });
  }

  private snapshot(state: BattleState, side: SideIndex): ShownPokemon {
    const s = state.sides[side];
    return this.fromMember(s.team[s.active], s.active);
  }

  private fromMember(p: BattleState['sides'][0]['team'][0], teamIndex: number): ShownPokemon {
    return {
      teamIndex,
      speciesId: p.speciesId,
      name: this.speciesName(p.speciesId),
      level: p.level,
      types: p.types,
      hp: p.hp,
      maxHp: p.stats.hp,
      status: p.status,
      fainted: p.hp === 0,
    };
  }

  private fromPublic(p: PublicPokemon): ShownPokemon {
    return {
      teamIndex: p.teamIndex,
      speciesId: p.speciesId,
      name: this.speciesName(p.speciesId),
      level: p.level,
      types: p.types,
      hp: p.hp,
      maxHp: p.maxHp,
      status: p.status,
      fainted: p.hp === 0,
    };
  }

  /** Lo que se ve de un lado según la vista del servidor (tú = 0; del rival, el revelado que está en combate). */
  private viewSnapshot(v: PvpBattleView, side: SideIndex): ShownPokemon | null {
    if (side === PLAYER) return this.fromMember(v.me.team[v.me.active], v.me.active);
    const foe = v.foe.revealed.find((p) => p.teamIndex === v.foe.active);
    return foe ? this.fromPublic(foe) : null;
  }

  private mine(battleId: string): boolean {
    return this.remote() && this.view()?.battleId === battleId;
  }

  private setView(v: PvpBattleView): void {
    this.view.set(v);
    this.now.set(Date.now());
    this.deadline.set(Date.now() + v.remainingMs);
  }

  /** Qué toca según la vista: elegir, cambiar o esperar al rival. */
  private applyView(): void {
    const v = this.view();
    if (!v || v.winner !== null) return;
    if (v.mustDo === 'act') return this.toChoose();
    if (v.mustDo === 'switch') {
      this.message.set('Elige a tu siguiente Pokémon.');
      this.phase.set('switch');
      return;
    }
    this.message.set(`Esperando a ${this.opponent()}…`);
    this.phase.set('waiting');
  }

  /** Manda la acción de la decisión abierta y espera el turno. Si la red falla, reintenta la MISMA decisión. */
  private async remoteAct(action: BattleAction): Promise<void> {
    const v = this.view();
    const link = this.link;
    const before = this.phase();
    if (!v || !link || v.decision === null) return;
    if (before !== 'choose' && before !== 'switch') return;
    this.phase.set('waiting');
    this.message.set(`Esperando a ${this.opponent()}…`);
    for (let attempt = 0; ; attempt++) {
      let reply: BattleActReply;
      try {
        reply = await link.act(v.battleId, v.decision, action);
      } catch {
        if (attempt >= ACT_RETRY_MS.length) {
          this.message.set('Sin conexión. Reintentando cuando vuelva la red…');
          return;
        }
        await new Promise((r) => setTimeout(r, ACT_RETRY_MS[attempt]));
        continue;
      }
      if (reply.ok || reply.code === 'stale-decision') return; // el turno llega (o llegó) por battle:turn
      if (reply.code === 'battle-not-found') return this.interrupted();
      this.haptics.shake();
      this.message.set(REMOTE_MESSAGES[reply.code] ?? 'No se pudo enviar. Inténtalo otra vez.');
      this.phase.set(before);
      return;
    }
  }

  private async playTurn(msg: BattleTurnMsg): Promise<void> {
    if (this.phase() === 'ended') return;
    this.phase.set('animating');
    await this.play(null, msg.events);
    this.setView(msg.view);
    this.shown.set([this.viewSnapshot(msg.view, PLAYER), this.viewSnapshot(msg.view, RIVAL)]);
    this.applyView();
  }

  private async finishRemote(winner: SideIndex | null, reason: PvpEndReason): Promise<void> {
    this.stopTicker();
    this.awayUntil.set(null);
    this.winner.set(winner);
    this.endReason.set(reason);
    const [win, lose] = PVP_END_TEXT[reason];
    this.message.set(
      winner === PLAYER ? win : winner === RIVAL ? lose : 'El combate terminó sin ganador.',
    );
    this.phase.set('ended');
    if (winner === PLAYER) {
      this.haptics.success();
      void this.audio.playSfx('victory');
    }
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => this.now.set(Date.now()), 500);
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  /** Al acabar el turno, lo mostrado y el estado real deben coincidir (red de seguridad contra desajustes). */
  private sync(shown: ShownPokemon | null, state: BattleState, side: SideIndex): ShownPokemon {
    const real = this.snapshot(state, side);
    if (!shown || shown.teamIndex !== real.teamIndex) return real;
    if (shown.hp !== real.hp || shown.status !== real.status) {
      console.warn('[battle] lo mostrado no cuadraba con el estado; se corrige', {
        side,
        shown,
        real,
      });
    }
    return { ...real, fainted: real.hp === 0 };
  }

  private speciesName(id: number): string {
    return this.dataset.species().get(id)?.names.es ?? `#${id}`;
  }
}
