import {
  LOGIN_LOCK_WINDOW_MS,
  LoginAttemptsService,
  MAX_LOGIN_FAILURES,
} from './login-attempts.service.js';

describe('LoginAttemptsService', () => {
  let attempts: LoginAttemptsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T12:00:00Z'));
    attempts = new LoginAttemptsService();
  });

  afterEach(() => vi.useRealTimers());

  it(`bloquea la cuenta al llegar a ${MAX_LOGIN_FAILURES} fallos`, () => {
    for (let i = 0; i < MAX_LOGIN_FAILURES - 1; i++)
      attempts.recordFailure('a');
    expect(attempts.isLocked('a')).toBe(false);
    attempts.recordFailure('a');
    expect(attempts.isLocked('a')).toBe(true);
    expect(attempts.isLocked('b')).toBe(false); // otras cuentas no se ven afectadas
  });

  it('el bloqueo caduca al pasar la ventana', () => {
    for (let i = 0; i < MAX_LOGIN_FAILURES; i++) attempts.recordFailure('a');
    vi.advanceTimersByTime(LOGIN_LOCK_WINDOW_MS);
    expect(attempts.isLocked('a')).toBe(false);
  });

  it('un login correcto (reset) borra los fallos', () => {
    for (let i = 0; i < MAX_LOGIN_FAILURES - 1; i++)
      attempts.recordFailure('a');
    attempts.reset('a');
    attempts.recordFailure('a');
    expect(attempts.isLocked('a')).toBe(false);
  });
});
