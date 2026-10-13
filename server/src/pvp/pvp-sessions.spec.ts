import { MAX_SOCKETS_PER_PLAYER, PvpSessions } from './pvp-sessions.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('PvpSessions', () => {
  let sessions: PvpSessions;

  beforeEach(() => (sessions = new PvpSessions()));

  it(`acepta hasta ${MAX_SOCKETS_PER_PLAYER} sockets por jugador y rechaza el siguiente`, () => {
    for (let i = 0; i < MAX_SOCKETS_PER_PLAYER; i++)
      expect(sessions.add(A, `a${i}`)).toBe(true);
    expect(sessions.add(A, 'a-extra')).toBe(false);
    expect(sessions.add(B, 'b0')).toBe(true);
    expect(sessions.count(A)).toBe(MAX_SOCKETS_PER_PLAYER);
  });

  it('remove dice de quién era el socket y cuántos le quedan', () => {
    sessions.add(A, 'a0');
    sessions.add(A, 'a1');
    expect(sessions.remove('a0')).toEqual({ playerId: A, remaining: 1 });
    expect(sessions.remove('a1')).toEqual({ playerId: A, remaining: 0 });
    expect(sessions.count(A)).toBe(0);
  });

  it('remove de un socket desconocido (rechazado al conectar) no hace nada', () => {
    expect(sessions.remove('nadie')).toBeNull();
  });

  it('al quitar uno, vuelve a caber otro', () => {
    for (let i = 0; i < MAX_SOCKETS_PER_PLAYER; i++) sessions.add(A, `a${i}`);
    sessions.remove('a0');
    expect(sessions.add(A, 'a-nuevo')).toBe(true);
  });

  it('añadir el mismo socket dos veces no cuenta doble', () => {
    sessions.add(A, 'a0');
    expect(sessions.add(A, 'a0')).toBe(true);
    expect(sessions.count(A)).toBe(1);
  });
});
