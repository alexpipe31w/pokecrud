import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { PvpBattleView } from '@shared/protocol/pvp';

import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { PvpSocketService } from '../../services/game/pvp-socket.service';
import { PvpLobbyStore } from './pvp-lobby.store';

type Handler = (msg: unknown) => void;

function fakeSocket() {
  const handlers = new Map<string, Set<Handler>>();
  const replies = new Map<string, unknown>();
  return {
    status: signal<'offline' | 'connecting' | 'online'>('offline'),
    error: signal<string | null>(null),
    connect: vi.fn(async () => undefined),
    ready: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    request: vi.fn(async (event: string, _body: unknown) => {
      const r = replies.get(event) ?? { ok: true };
      if (r instanceof Error) throw r;
      return r;
    }),
    on: vi.fn((event: string, h: Handler) => {
      const set = handlers.get(event) ?? new Set<Handler>();
      set.add(h);
      handlers.set(event, set);
      return () => set.delete(h);
    }),
    reply(event: string, r: unknown) {
      replies.set(event, r);
    },
    fire(event: string, msg: unknown) {
      for (const h of handlers.get(event) ?? []) h(msg);
    },
    listeners(event: string) {
      return handlers.get(event)?.size ?? 0;
    },
  };
}

const view = (battleId = 'b-1'): PvpBattleView => ({
  battleId,
  turn: 0,
  decision: 1,
  mustDo: 'act',
  remainingMs: 30_000,
  me: {
    name: 'yo',
    active: 0,
    team: [
      {
        uid: 'u',
        speciesId: 25,
        level: 50,
        types: ['electric'],
        stats: { hp: 1, attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
        hp: 1,
        moves: [],
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
      },
    ],
  },
  foe: {
    name: 'rival',
    teamSize: 3,
    fainted: 0,
    active: 0,
    revealed: [
      { teamIndex: 0, speciesId: 6, level: 50, types: ['fire'], hp: 1, maxHp: 1, status: null },
    ],
  },
  winner: null,
});

describe('PvpLobbyStore', () => {
  let store: PvpLobbyStore;
  let socket: ReturnType<typeof fakeSocket>;
  const audio = { playCry: vi.fn(async () => undefined), playSfx: vi.fn(async () => undefined) };
  const haptics = { success: vi.fn(), tap: vi.fn(), shake: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    socket = fakeSocket();
    socket.reply('pvp:hello', { ok: true, battle: null, lobby: null });
    TestBed.configureTestingModule({
      providers: [
        PvpLobbyStore,
        { provide: PvpSocketService, useValue: socket },
        { provide: AudioService, useValue: audio },
        { provide: HapticsService, useValue: haptics },
      ],
    });
    store = TestBed.inject(PvpLobbyStore);
  });

  afterEach(() => vi.useRealTimers());

  it('al entrar conecta, pregunta hello y queda en el menú', async () => {
    expect(store.phase()).toBe('connecting');
    await store.enter();
    expect(socket.ready).toHaveBeenCalled();
    expect(socket.request).toHaveBeenCalledWith('pvp:hello', {});
    expect(store.phase()).toBe('menu');
  });

  it('al volver con una invitación abierta (otra pantalla, reconexión) la recupera con su tiempo', async () => {
    socket.reply('pvp:hello', {
      ok: true,
      battle: null,
      lobby: { kind: 'invite', code: 'ABC234', remainingMs: 90_000 },
    });
    await store.enter();
    expect(store.phase()).toBe('inviting');
    expect(store.code()).toBe('ABC234');
    expect(store.remainingS()).toBe(90);
  });

  it('al volver en combate va directo al cara a cara', async () => {
    socket.reply('pvp:hello', { ok: true, battle: view('b-9'), lobby: null });
    await store.enter();
    expect(store.phase()).toBe('matched');
    expect(store.match()?.battleId).toBe('b-9');
  });

  it('sin equipo elegido no deja invitar ni buscar', async () => {
    await store.enter();
    await store.invite();
    expect(socket.request).not.toHaveBeenCalledWith('pvp:invite:create', expect.anything());
    expect(store.notice()).toMatch(/elige un equipo/i);
  });

  it('invitar: pide el código con el equipo y cuenta hacia atrás; al llegar a 0, vuelve al menú', async () => {
    await store.enter();
    store.teamId.set(7);
    socket.reply('pvp:invite:create', { ok: true, code: 'XYZ789', remainingMs: 3000 });
    await store.invite();
    expect(socket.request).toHaveBeenCalledWith('pvp:invite:create', { teamId: 7 });
    expect(store.phase()).toBe('inviting');
    expect(store.remainingS()).toBe(3);
    vi.advanceTimersByTime(1000);
    expect(store.remainingS()).toBe(2);
    vi.advanceTimersByTime(2000);
    expect(store.phase()).toBe('menu');
    expect(store.notice()).toMatch(/caduc/i);
  });

  it('cancelar la invitación avisa al servidor y vuelve al menú', async () => {
    await store.enter();
    store.teamId.set(7);
    socket.reply('pvp:invite:create', { ok: true, code: 'XYZ789', remainingMs: 300_000 });
    await store.invite();
    await store.cancel();
    expect(socket.request).toHaveBeenCalledWith('pvp:lobby:leave', {});
    expect(store.phase()).toBe('menu');
  });

  it('unirse: manda el código; si el servidor lo rechaza, explica por qué y se queda en el teclado', async () => {
    await store.enter();
    store.teamId.set(7);
    store.openJoin();
    expect(store.phase()).toBe('joining');
    socket.reply('pvp:invite:join', { ok: false, code: 'invite-not-found' });
    await store.join('abc234');
    expect(socket.request).toHaveBeenCalledWith('pvp:invite:join', { code: 'ABC234', teamId: 7 });
    expect(store.phase()).toBe('joining');
    expect(store.notice()).toMatch(/no existe|caducó/i);
    expect(haptics.shake).toHaveBeenCalled();
  });

  it('buscar rival: espera en la cola; battle:start lleva al cara a cara con grito del rival y vibración', async () => {
    await store.enter();
    store.teamId.set(7);
    socket.reply('pvp:queue:join', { ok: true, matched: false });
    await store.searchRival();
    expect(store.phase()).toBe('queue');
    socket.fire('battle:start', { view: view(), opponent: 'ash' });
    expect(store.phase()).toBe('matched');
    expect(store.match()).toMatchObject({
      battleId: 'b-1',
      opponent: 'ash',
      foeLead: 6,
      myLead: 25,
    });
    expect(audio.playCry).toHaveBeenCalledWith(6);
    expect(haptics.success).toHaveBeenCalled();
  });

  it('rendirse manda battle:forfeit; battle:end vuelve al menú con el resultado', async () => {
    socket.reply('pvp:hello', { ok: true, battle: view('b-2'), lobby: null });
    await store.enter();
    await store.forfeit();
    expect(socket.request).toHaveBeenCalledWith('battle:forfeit', { battleId: 'b-2' });
    socket.fire('battle:end', { battleId: 'b-2', winner: 1, reason: 'forfeit' });
    expect(store.phase()).toBe('menu');
    expect(store.notice()).toMatch(/te rendiste/i);
    socket.fire('battle:start', { view: view('b-3'), opponent: 'x' });
    socket.fire('battle:end', { battleId: 'b-3', winner: 0, reason: 'forfeit' });
    expect(store.notice()).toMatch(/se rindió/i);
  });

  it('sin conexión → fase de error con el motivo; reintentar vuelve a entrar', async () => {
    socket.ready.mockRejectedValueOnce(
      new Error('Sin conexión con el servidor. Inténtalo otra vez.'),
    );
    await store.enter();
    expect(store.phase()).toBe('error');
    expect(store.notice()).toMatch(/sin conexión/i);
    await store.enter();
    expect(store.phase()).toBe('menu');
  });

  it('al salir de la pantalla: cancela la espera, se da de baja y cierra el socket (si no está en combate)', async () => {
    await store.enter();
    store.teamId.set(7);
    socket.reply('pvp:queue:join', { ok: true, matched: false });
    await store.searchRival();
    await store.leave();
    expect(socket.request).toHaveBeenCalledWith('pvp:lobby:leave', {});
    expect(socket.listeners('battle:start')).toBe(0);
    expect(socket.disconnect).toHaveBeenCalled();
  });
});
