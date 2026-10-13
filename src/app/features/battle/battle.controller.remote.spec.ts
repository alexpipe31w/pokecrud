import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Move, TypeInfo } from '@shared/data/dataset.types';
import { TYPE_NAMES } from '@shared/engine/battle/type-chart';
import type { BattlePokemon } from '@shared/engine/battle/types';
import type { PublicPokemon, PvpBattleView } from '@shared/protocol/pvp';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { HapticsService } from '../../services/game/haptics.service';
import { BattleController, type RemoteLink } from './battle.controller';

const move = (id: number, es: string): Move =>
  ({ id, names: { es, en: es }, type: 'normal', category: 'physical', power: 40 }) as Move;
const types = TYPE_NAMES.map((name) => ({ name, attack: {} })) as unknown as TypeInfo[];
const species = new Map(
  [
    [25, 'Pikachu', ['electric']],
    [1, 'Bulbasaur', ['grass', 'poison']],
    [4, 'Charmander', ['fire']],
  ].map(([id, es, t]) => [id, { id, names: { es, en: es }, types: t }]),
);

const mine = (speciesId: number, hp = 100): BattlePokemon => ({
  uid: `u${speciesId}`,
  speciesId,
  level: 50,
  types: ['electric'],
  stats: { hp: 100, attack: 50, defense: 50, specialAttack: 50, specialDefense: 50, speed: 90 },
  hp,
  moves: [
    { moveId: 33, pp: 35, maxPp: 35 },
    { moveId: 45, pp: 40, maxPp: 40 },
  ],
  status: null,
  statusTurns: 0,
  volatile: { confusion: 0, flinch: false },
  stages: {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0,
  },
});
const pub = (teamIndex: number, speciesId: number, hp = 120): PublicPokemon => ({
  teamIndex,
  speciesId,
  level: 50,
  types: speciesId === 4 ? ['fire'] : ['grass', 'poison'],
  hp,
  maxHp: 120,
  status: null,
});
const view = (over: Partial<PvpBattleView> = {}): PvpBattleView => ({
  battleId: 'b-1',
  turn: 0,
  decision: 1,
  mustDo: 'act',
  remainingMs: 30_000,
  me: { name: 'yo', team: [mine(25), mine(1)], active: 0 },
  foe: { name: 'Rival', teamSize: 2, fainted: 0, active: 0, revealed: [pub(0, 1)] },
  winner: null,
  ...over,
});

describe('BattleController en PvP (modo remoto, F5-04)', () => {
  let ctrl: BattleController;
  let link: { act: ReturnType<typeof vi.fn>; forfeit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers();
    link = {
      act: vi.fn().mockResolvedValue({ ok: true, duplicate: false }),
      forfeit: vi.fn().mockResolvedValue({ ok: true }),
    };
    TestBed.configureTestingModule({
      providers: [
        BattleController,
        {
          provide: DatasetService,
          useValue: {
            load: vi.fn().mockResolvedValue(undefined),
            species: signal(species),
            moves: signal(
              new Map([
                [33, move(33, 'Placaje')],
                [45, move(45, 'Gruñido')],
              ]),
            ),
            types: signal(types),
          },
        },
        {
          provide: AudioService,
          useValue: { playSfx: vi.fn(), playCry: vi.fn(), preloadCries: vi.fn() },
        },
        {
          provide: HapticsService,
          useValue: { tap: vi.fn(), throw: vi.fn(), shake: vi.fn(), success: vi.fn() },
        },
      ],
    });
    ctrl = TestBed.inject(BattleController);
    const started = ctrl.startRemote(view(), 'Rival', link as unknown as RemoteLink, true);
    await vi.advanceTimersByTimeAsync(10_000);
    await started;
  });
  afterEach(() => vi.useRealTimers());

  it('empieza con lo que manda el servidor: tu Pokémon, el del rival y tus movimientos', () => {
    expect(ctrl.phase()).toBe('choose');
    expect(ctrl.shown()[0]).toMatchObject({ speciesId: 25, name: 'Pikachu', hp: 100 });
    expect(ctrl.shown()[1]).toMatchObject({ speciesId: 1, name: 'Bulbasaur', hp: 120, maxHp: 120 });
    expect(ctrl.moves().map((m) => m.name)).toEqual(['Placaje', 'Gruñido']);
    expect(ctrl.bench().map((b) => b.name)).toEqual(['Pikachu', 'Bulbasaur']);
    // El tiempo corre en el servidor también durante la presentación.
    expect(ctrl.remainingS()).toBeGreaterThan(15);
    expect(ctrl.remainingS()).toBeLessThanOrEqual(30);
  });

  it('elegir manda battle:act con la decisión abierta y espera al rival', async () => {
    await ctrl.act({ kind: 'move', moveIndex: 0 });
    expect(link.act).toHaveBeenCalledWith('b-1', 1, { kind: 'move', moveIndex: 0 });
    expect(ctrl.phase()).toBe('waiting');
    expect(ctrl.message()).toContain('Esperando a Rival');
  });

  it('si la red falla, reintenta la MISMA decisión (es idempotente)', async () => {
    link.act
      .mockRejectedValueOnce(new Error('red'))
      .mockRejectedValueOnce(new Error('red'))
      .mockResolvedValueOnce({ ok: true, duplicate: true });
    const p = ctrl.act({ kind: 'move', moveIndex: 1 });
    await vi.advanceTimersByTimeAsync(10_000);
    await p;
    expect(link.act).toHaveBeenCalledTimes(3);
    for (const call of link.act.mock.calls) expect(call[1]).toBe(1);
    expect(ctrl.phase()).toBe('waiting');
  });

  it('acción rechazada → vuelve a elegir con un aviso', async () => {
    link.act.mockResolvedValueOnce({ ok: false, code: 'invalid-action' });
    await ctrl.act({ kind: 'move', moveIndex: 0 });
    expect(ctrl.phase()).toBe('choose');
    expect(ctrl.message()).toBe('No puedes hacer eso ahora.');
  });

  it('battle:turn se reproduce (PS del rival bajan, el que entra viene en el evento) y queda la vista nueva', async () => {
    ctrl.onTurn({
      battleId: 'b-1',
      events: [
        { kind: 'move', side: 0, moveId: 33 },
        { kind: 'damage', side: 1, amount: 120, hpAfter: 0, source: 'move' },
        { kind: 'faint', side: 1 },
        { kind: 'switch', side: 1, teamIndex: 1, pokemon: pub(1, 4, 120) },
      ],
      view: view({
        turn: 1,
        decision: 2,
        foe: {
          name: 'Rival',
          teamSize: 2,
          fainted: 1,
          active: 1,
          revealed: [pub(0, 1, 0), pub(1, 4)],
        },
      }),
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(ctrl.shown()[1]).toMatchObject({ speciesId: 4, name: 'Charmander', hp: 120 });
    expect(ctrl.phase()).toBe('choose');
    await ctrl.act({ kind: 'move', moveIndex: 0 });
    expect(link.act).toHaveBeenLastCalledWith('b-1', 2, { kind: 'move', moveIndex: 0 });
  });

  it('si te toca cambiar (mustDo switch): la hoja de cambio, y se manda el cambio', async () => {
    ctrl.onTurn({
      battleId: 'b-1',
      events: [{ kind: 'faint', side: 0 }],
      view: view({
        decision: 2,
        mustDo: 'switch',
        me: { name: 'yo', team: [mine(25, 0), mine(1)], active: 0 },
      }),
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(ctrl.phase()).toBe('switch');
    await ctrl.forcedSwitch(1);
    expect(link.act).toHaveBeenCalledWith('b-1', 2, { kind: 'switch', teamIndex: 1 });
  });

  it('rival desconectado: aviso con su tiempo; vuelve → se quita', () => {
    ctrl.onOpponent({ battleId: 'b-1', connected: false, graceMs: 60_000 });
    expect(ctrl.opponentAwayS()).toBe(60);
    vi.advanceTimersByTime(10_000);
    expect(ctrl.opponentAwayS()).toBe(50);
    ctrl.onOpponent({ battleId: 'b-1', connected: true, graceMs: 0 });
    expect(ctrl.opponentAwayS()).toBeNull();
  });

  it('battle:end: victoria o derrota con el motivo; rendirse lo manda al servidor', async () => {
    await ctrl.forfeit();
    expect(link.forfeit).toHaveBeenCalledWith('b-1');
    ctrl.onEnd({ battleId: 'b-1', winner: 0, reason: 'abandon' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(ctrl.phase()).toBe('ended');
    expect(ctrl.winner()).toBe(0);
    expect(ctrl.message()).toBe('Tu rival se desconectó. ¡Ganaste!');
  });

  it('mensajes de otro combate se ignoran', async () => {
    ctrl.onEnd({ battleId: 'otro', winner: 1, reason: 'faint' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(ctrl.phase()).toBe('choose');
  });
});
