import {
  SOCKET_MSG_LIMIT,
  SOCKET_MSG_WINDOW_MS,
  SocketRateLimiter,
} from './socket-rate-limit.js';

describe('SocketRateLimiter', () => {
  let now: number;
  let limiter: SocketRateLimiter;

  beforeEach(() => {
    now = 1_000_000;
    limiter = new SocketRateLimiter(() => now);
  });

  it(`deja pasar ${SOCKET_MSG_LIMIT} mensajes por ventana y frena el siguiente`, () => {
    for (let i = 0; i < SOCKET_MSG_LIMIT; i++)
      expect(limiter.take('s1')).toBe(true);
    expect(limiter.take('s1')).toBe(false);
  });

  it('cada socket tiene su propio cupo', () => {
    for (let i = 0; i < SOCKET_MSG_LIMIT; i++) limiter.take('s1');
    expect(limiter.take('s1')).toBe(false);
    expect(limiter.take('s2')).toBe(true);
  });

  it('la ventana es deslizante: al pasar el tiempo vuelve a dejar pasar', () => {
    for (let i = 0; i < SOCKET_MSG_LIMIT; i++) limiter.take('s1');
    now += SOCKET_MSG_WINDOW_MS - 1;
    expect(limiter.take('s1')).toBe(false);
    now += 1;
    expect(limiter.take('s1')).toBe(true);
  });

  it('un mensaje frenado no gasta cupo', () => {
    for (let i = 0; i < SOCKET_MSG_LIMIT; i++) limiter.take('s1');
    for (let i = 0; i < 50; i++) limiter.take('s1');
    now += SOCKET_MSG_WINDOW_MS;
    for (let i = 0; i < SOCKET_MSG_LIMIT; i++)
      expect(limiter.take('s1')).toBe(true);
  });

  it('forget borra el socket (no crece sin techo)', () => {
    limiter.take('s1');
    limiter.forget('s1');
    expect(limiter.size).toBe(0);
  });
});
