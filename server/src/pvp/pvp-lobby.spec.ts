import {
  PVP_INVITE_ALPHABET,
  PVP_INVITE_LENGTH,
  PVP_INVITE_TTL_MS,
} from '../../../shared/protocol/pvp.js';
import { PvpFailure } from './pvp-failure.js';
import { PvpLobby, type LobbyEntrant } from './pvp-lobby.js';

const entrant = (playerId: string): LobbyEntrant => ({
  playerId,
  side: { name: playerId, team: [] },
});

const codeOf = (err: unknown) => (err as PvpFailure).code;
const failing = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(PvpFailure);
    return codeOf(err);
  }
  throw new Error('no falló');
};

describe('PvpLobby', () => {
  let now: number;
  let lobby: PvpLobby;

  beforeEach(() => {
    now = 1_000_000;
    lobby = new PvpLobby(() => now);
  });

  it('crea un código de 6 letras del alfabeto, con su tiempo', () => {
    const inv = lobby.createInvite(entrant('ana'));
    expect(inv.code).toHaveLength(PVP_INVITE_LENGTH);
    expect(
      Array.from(inv.code).every((c) => PVP_INVITE_ALPHABET.includes(c)),
    ).toBe(true);
    expect(inv.remainingMs).toBe(PVP_INVITE_TTL_MS);
    expect(lobby.status('ana')).toEqual({
      kind: 'invite',
      code: inv.code,
      remainingMs: PVP_INVITE_TTL_MS,
    });
  });

  it('unirse con el código devuelve al anfitrión y gasta el código (el segundo ya no entra)', () => {
    const { code } = lobby.createInvite(entrant('ana'));
    expect(lobby.joinInvite('beto', code).playerId).toBe('ana');
    expect(lobby.status('ana')).toBeNull();
    expect(failing(() => lobby.joinInvite('carla', code))).toBe(
      'invite-not-found',
    );
  });

  it('tu propio código → own-invite (y el código sigue vivo)', () => {
    const { code } = lobby.createInvite(entrant('ana'));
    expect(failing(() => lobby.joinInvite('ana', code))).toBe('own-invite');
    expect(lobby.joinInvite('beto', code).playerId).toBe('ana');
  });

  it('el código caduca a los 5 min', () => {
    const { code } = lobby.createInvite(entrant('ana'));
    now += PVP_INVITE_TTL_MS;
    expect(failing(() => lobby.joinInvite('beto', code))).toBe(
      'invite-not-found',
    );
    expect(lobby.status('ana')).toBeNull();
  });

  it('una entrada por jugador: invitar otra vez sustituye al código anterior; entrar en la cola también', () => {
    const first = lobby.createInvite(entrant('ana')).code;
    const second = lobby.createInvite(entrant('ana')).code;
    expect(failing(() => lobby.joinInvite('beto', first))).toBe(
      'invite-not-found',
    );
    expect(lobby.joinQueue(entrant('ana'))).toBeNull();
    expect(failing(() => lobby.joinInvite('beto', second))).toBe(
      'invite-not-found',
    );
    expect(lobby.status('ana')).toEqual({ kind: 'queue' });
  });

  it('cola FIFO: el primero espera; el siguiente se empareja con él y los dos salen', () => {
    const l = new PvpLobby(() => now);
    expect(l.joinQueue(entrant('ana'))).toBeNull();
    const rival = l.joinQueue(entrant('beto'));
    expect(rival?.playerId).toBe('ana');
    expect(l.status('ana')).toBeNull();
    expect(l.status('beto')).toBeNull();
    expect(l.joinQueue(entrant('carla'))).toBeNull();
    expect(l.joinQueue(entrant('dani'))?.playerId).toBe('carla');
  });

  it('volver a la cola estando en ella no te empareja contigo mismo', () => {
    expect(lobby.joinQueue(entrant('ana'))).toBeNull();
    expect(lobby.joinQueue(entrant('ana'))).toBeNull();
    expect(lobby.joinQueue(entrant('beto'))?.playerId).toBe('ana');
  });

  it('unirse a una invitación te saca de la cola (no te pueden emparejar dos veces)', () => {
    const { code } = lobby.createInvite(entrant('ana'));
    lobby.joinQueue(entrant('beto'));
    lobby.joinInvite('beto', code);
    expect(lobby.status('beto')).toBeNull();
    expect(lobby.joinQueue(entrant('carla'))).toBeNull();
  });

  it('leave cancela la invitación o saca de la cola; sin entrada no hace nada', () => {
    const { code } = lobby.createInvite(entrant('ana'));
    lobby.leave('ana');
    expect(failing(() => lobby.joinInvite('beto', code))).toBe(
      'invite-not-found',
    );
    lobby.joinQueue(entrant('beto'));
    lobby.leave('beto');
    expect(lobby.joinQueue(entrant('carla'))).toBeNull();
    expect(() => lobby.leave('nadie')).not.toThrow();
  });

  it('nunca repite un código vivo aunque el azar lo intente', () => {
    const seq = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
    const l = new PvpLobby(
      () => now,
      () => seq.shift() ?? 2,
    );
    const a = l.createInvite(entrant('ana')).code;
    const b = l.createInvite(entrant('beto')).code;
    expect(a).toBe('AAAAAA');
    expect(b).toBe('BBBBBB');
  });
});
