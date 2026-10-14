import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { PvpBattleView } from '@shared/protocol/pvp';

import { PvpSocketService } from '../../services/game/pvp-socket.service';
import type { BattleController, RemoteLink } from './battle.controller';
import { PvpBattleSession } from './pvp-battle-session';

type Handler = (msg: unknown) => void;

function fakeSocket() {
  const handlers = new Map<string, Set<Handler>>();
  const replies = new Map<string, unknown>();
  return {
    status: signal<'offline' | 'connecting' | 'online'>('online'),
    ready: vi.fn(async () => undefined),
    request: vi.fn(async (event: string, _body: unknown) => replies.get(event) ?? { ok: true }),
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

const view = (over: Partial<PvpBattleView> = {}): PvpBattleView =>
  ({
    battleId: 'b-1',
    turn: 0,
    decision: 1,
    mustDo: 'act',
    remainingMs: 30_000,
    me: { name: 'yo', active: 0, team: [] },
    foe: { name: 'rivaldemo', teamSize: 3, fainted: 0, active: 0, revealed: [] },
    winner: null,
    ...over,
  }) as PvpBattleView;

describe('PvpBattleSession (F5-04: la pantalla de combate conectada al socket)', () => {
  let socket: ReturnType<typeof fakeSocket>;
  let ctrl: {
    startRemote: ReturnType<typeof vi.fn>;
    onTurn: ReturnType<typeof vi.fn>;
    onEnd: ReturnType<typeof vi.fn>;
    onOpponent: ReturnType<typeof vi.fn>;
    resync: ReturnType<typeof vi.fn>;
    interrupted: ReturnType<typeof vi.fn>;
  };
  let session: PvpBattleSession;

  beforeEach(() => {
    socket = fakeSocket();
    ctrl = {
      startRemote: vi.fn(async () => undefined),
      onTurn: vi.fn(),
      onEnd: vi.fn(),
      onOpponent: vi.fn(),
      resync: vi.fn(),
      interrupted: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [PvpBattleSession, { provide: PvpSocketService, useValue: socket }],
    });
    session = TestBed.inject(PvpBattleSession);
  });

  const open = () => session.open(ctrl as unknown as BattleController);

  it('pide pvp:hello y arranca el combate (con presentación si acaba de empezar)', async () => {
    socket.reply('pvp:hello', { ok: true, battle: view(), lobby: null });
    await open();
    expect(socket.ready).toHaveBeenCalled();
    expect(ctrl.startRemote).toHaveBeenCalledWith(view(), 'rivaldemo', expect.anything(), true);
  });

  it('a mitad del combate (volviste a la pantalla): sin presentación', async () => {
    socket.reply('pvp:hello', { ok: true, battle: view({ turn: 3, decision: 4 }), lobby: null });
    await open();
    expect(ctrl.startRemote.mock.calls[0][3]).toBe(false);
  });

  it('el enlace manda battle:act y battle:forfeit por el socket', async () => {
    socket.reply('pvp:hello', { ok: true, battle: view(), lobby: null });
    await open();
    const link = ctrl.startRemote.mock.calls[0][2] as RemoteLink;
    await link.act('b-1', 2, { kind: 'move', moveIndex: 1 });
    expect(socket.request).toHaveBeenCalledWith('battle:act', {
      battleId: 'b-1',
      decision: 2,
      action: { kind: 'move', moveIndex: 1 },
    });
    await link.forfeit('b-1');
    expect(socket.request).toHaveBeenCalledWith('battle:forfeit', { battleId: 'b-1' });
  });

  it('los mensajes del servidor llegan al controlador; al cerrar se dejan de escuchar', async () => {
    socket.reply('pvp:hello', { ok: true, battle: view(), lobby: null });
    await open();
    socket.fire('battle:turn', { battleId: 'b-1' });
    socket.fire('battle:end', { battleId: 'b-1' });
    socket.fire('battle:opponent', { battleId: 'b-1' });
    expect(ctrl.onTurn).toHaveBeenCalledWith({ battleId: 'b-1' });
    expect(ctrl.onEnd).toHaveBeenCalledWith({ battleId: 'b-1' });
    expect(ctrl.onOpponent).toHaveBeenCalledWith({ battleId: 'b-1' });
    session.close();
    expect(socket.listeners('battle:turn')).toBe(0);
    expect(socket.listeners('battle:end')).toBe(0);
  });

  it('sin combate en el servidor (terminó o se reinició) → interrumpido', async () => {
    socket.reply('pvp:hello', { ok: true, battle: null, lobby: null });
    await open();
    expect(ctrl.startRemote).not.toHaveBeenCalled();
    expect(ctrl.interrupted).toHaveBeenCalled();
  });

  it('si el socket se corta y vuelve, se pone al día con pvp:hello', async () => {
    socket.reply('pvp:hello', { ok: true, battle: view(), lobby: null });
    await open();
    socket.reply('pvp:hello', { ok: true, battle: view({ turn: 2, decision: 3 }), lobby: null });
    socket.status.set('connecting');
    TestBed.tick();
    socket.status.set('online');
    TestBed.tick();
    await vi.waitFor(() =>
      expect(ctrl.resync).toHaveBeenCalledWith(view({ turn: 2, decision: 3 })),
    );
  });
});
