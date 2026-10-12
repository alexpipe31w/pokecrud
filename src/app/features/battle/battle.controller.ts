import { Injectable, computed, inject, signal } from '@angular/core';
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
  BattleState,
  MajorStatus,
  SideIndex,
} from '@shared/engine/battle/types';
import { createRng, type Rng } from '@shared/engine/rng';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { HapticsService } from '../../services/game/haptics.service';
import { describeEvent } from './battle-text';

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
  'pick-rival' | 'loading' | 'choose' | 'animating' | 'switch' | 'ended' | 'error';

export const PLAYER: SideIndex = 0;
export const RIVAL: SideIndex = 1;

/** Ritmo de la escena (ms). Con "reducir movimiento" todo va al doble de rápido. */
const PACE = { text: 1000, silent: 420, hit: 700 };

/**
 * Combate local contra la IA (F4-05): el motor puro (`shared/engine/battle`) decide; esto lo pone en escena.
 * En PvP (F5) el estado y los eventos llegarán del servidor y esta misma reproducción los mostrará.
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

  /** Movimientos del activo del jugador con lo que hace falta para el menú. */
  readonly moves = computed(() => {
    const s = this.state();
    const ctx = this.ctx;
    const foe = this.shown()[RIVAL];
    if (!s || !ctx || !foe) return [];
    const me = s.sides[PLAYER].team[s.sides[PLAYER].active];
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
    const s = this.state();
    if (!s) return [];
    const side = s.sides[PLAYER];
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

  /** El jugador elige; la IA elige; se resuelve el turno y se reproduce. */
  async act(action: BattleAction): Promise<void> {
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
      if (result.state.winner === PLAYER) this.haptics.success();
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
  private async play(before: BattleState, events: BattleEvent[]): Promise<void> {
    let lastMove: Move | null = null;
    let crit = false;
    for (const e of events) {
      const text = describeEvent(e, {
        pokemon: (side) => this.shown()[side]?.name ?? '',
        move: (id) => this.ctx?.moves.get(id)?.names.es ?? '¿?',
        trainer: (side) => (side === PLAYER ? 'Tú' : (this.rival()?.name ?? 'Rival')),
        player: PLAYER,
      });
      switch (e.kind) {
        case 'move':
          lastMove = this.ctx?.moves.get(e.moveId) ?? null;
          crit = false;
          this.emitFx({ side: e.side, kind: 'lunge' });
          break;
        case 'crit':
          crit = true;
          break;
        case 'damage': {
          const p = this.shown()[e.side];
          this.patch(e.side, { hp: e.hpAfter });
          if (e.amount > 0) {
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
          const member = before.sides[e.side].team[e.teamIndex];
          this.setShown(e.side, {
            teamIndex: e.teamIndex,
            speciesId: member.speciesId,
            name: this.speciesName(member.speciesId),
            level: member.level,
            types: member.types,
            hp: member.hp,
            maxHp: member.stats.hp,
            status: member.status,
            fainted: false,
          });
          this.emitFx({ side: e.side, kind: 'enter' });
          void this.audio.playCry(member.speciesId);
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
    const p = s.team[s.active];
    return {
      teamIndex: s.active,
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
