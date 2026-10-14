import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import {
  AuthService,
  Player,
  RESTORE_RETRY,
  type RestoreRetry,
  authErrorMessage,
} from './auth.service';
import { TOKEN_STORE, TokenStore } from './token-store';

const AUTH = `${environment.serverUrl}/auth`;
const PLAYER: Player = {
  id: 'p1',
  email: 'ash@pokecrud.test',
  role: 'PLAYER',
  nickname: 'ash',
  level: 1,
  xp: 0,
};

/** TokenStore en memoria para los tests. */
class MemoryStore implements TokenStore {
  token: string | null = null;
  async get() {
    return this.token;
  }
  async set(t: string) {
    this.token = t;
  }
  async clear() {
    this.token = null;
  }
}

/** Deja correr las promesas pendientes (TokenStore es asíncrono) antes de mirar las peticiones. */
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('AuthService (app)', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TOKEN_STORE, useValue: store },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('login guarda el refresh, deja el access en memoria y marca la sesión', async () => {
    const done = auth.login({ email: PLAYER.email, password: 'clave-segura-123' });
    http
      .expectOne(`${AUTH}/login`)
      .flush({ accessToken: 'acc-1', refreshToken: 'ref-1', player: PLAYER });
    await done;
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.player()).toEqual(PLAYER);
    expect(auth.getAccessToken()).toBe('acc-1');
    expect(store.token).toBe('ref-1');
  });

  it('isAdmin solo con role ADMIN (F0-12)', async () => {
    expect(auth.isAdmin()).toBe(false);
    const done = auth.login({ email: PLAYER.email, password: 'clave-segura-123' });
    http
      .expectOne(`${AUTH}/login`)
      .flush({ accessToken: 'acc-1', refreshToken: 'ref-1', player: { ...PLAYER, role: 'ADMIN' } });
    await done;
    expect(auth.isAdmin()).toBe(true);
  });

  it('addXp: suma la XP que ya sumó el servidor y sube de nivel con la misma curva (F2-07)', async () => {
    auth.addXp(100); // sin sesión no hace nada
    expect(auth.player()).toBeNull();
    const done = auth.login({ email: PLAYER.email, password: 'clave-segura-123' });
    http
      .expectOne(`${AUTH}/login`)
      .flush({ accessToken: 'acc-1', refreshToken: 'ref-1', player: { ...PLAYER, xp: 900 } });
    await done;
    auth.addXp(160); // 1060 ≥ 1000 = nivel 2 (D-026: 500·(L−1)·L)
    expect(auth.player()).toMatchObject({ xp: 1060, level: 2 });
    auth.addXp(0);
    auth.addXp(-5);
    expect(auth.player()?.xp).toBe(1060);
  });

  it('restore sin token guardado → anónimo y sin peticiones', async () => {
    await auth.restore();
    expect(auth.status()).toBe('anonymous');
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('restore con token guardado → refresh + /auth/me', async () => {
    store.token = 'ref-viejo';
    const done = auth.restore();
    await settle();
    const refresh = http.expectOne(`${AUTH}/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'ref-viejo' });
    refresh.flush({ accessToken: 'acc-2', refreshToken: 'ref-nuevo' });
    await settle();
    const me = http.expectOne(`${AUTH}/me`);
    expect(me.request.headers.get('Authorization')).toBe('Bearer acc-2');
    me.flush({ player: PLAYER });
    await done;
    expect(auth.status()).toBe('authenticated');
    expect(store.token).toBe('ref-nuevo');
  });

  it('refresh simultáneos comparten UNA sola petición', async () => {
    store.token = 'ref-1';
    const calls = [auth.refresh(), auth.refresh(), auth.refresh()];
    await settle();
    http.expectOne(`${AUTH}/refresh`).flush({ accessToken: 'acc-3', refreshToken: 'ref-2' });
    expect(await Promise.all(calls)).toEqual(['acc-3', 'acc-3', 'acc-3']);
  });

  it('refresh rechazado (401) borra la sesión', async () => {
    store.token = 'ref-robado';
    const done = auth.refresh();
    await settle();
    http.expectOne(`${AUTH}/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await done).toBeNull();
    expect(store.token).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('refresh sin red NO borra el token guardado (se reintenta más tarde)', async () => {
    store.token = 'ref-1';
    const done = auth.refresh();
    await settle();
    http.expectOne(`${AUTH}/refresh`).error(new ProgressEvent('error'));
    expect(await done).toBeNull();
    expect(store.token).toBe('ref-1');
  });

  it('logout borra la sesión local y avisa al servidor', async () => {
    const login = auth.login({ email: PLAYER.email, password: 'clave-segura-123' });
    http
      .expectOne(`${AUTH}/login`)
      .flush({ accessToken: 'acc-1', refreshToken: 'ref-1', player: PLAYER });
    await login;

    const done = auth.logout();
    await settle();
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.getAccessToken()).toBeNull();
    expect(store.token).toBeNull();
    const req = http.expectOne(`${AUTH}/logout`);
    expect(req.request.body).toEqual({ refreshToken: 'ref-1' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await done;
  });

  it('authErrorMessage traduce los errores para la UI', () => {
    const httpError = (status: number, error: unknown = null) =>
      new HttpErrorResponse({ status, error });
    expect(authErrorMessage(httpError(401, { message: 'Correo o contraseña incorrectos' }))).toBe(
      'Correo o contraseña incorrectos',
    );
    expect(authErrorMessage(httpError(409, { message: 'Ese apodo ya está en uso' }))).toBe(
      'Ese apodo ya está en uso',
    );
    expect(authErrorMessage(httpError(400, { message: ['Correo no válido'] }))).toBe(
      'Correo no válido',
    );
    expect(authErrorMessage(httpError(0))).toMatch(/conexión/);
    expect(authErrorMessage(new Error('Timeout has occurred'))).toMatch(/conexión/);
  });
});

describe('AuthService · servidor despertando (F1-09)', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let store: MemoryStore;
  const retry: RestoreRetry = { wakingAfterMs: 0, backoffMs: [0], maxMs: 60_000 };

  beforeEach(() => {
    store = new MemoryStore();
    store.token = 'ref-1';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TOKEN_STORE, useValue: store },
        { provide: RESTORE_RETRY, useValue: retry },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Espera a que llegue la siguiente petición a `url` (entre medias hay esperas de 0 ms). */
  async function next(url: string) {
    for (let i = 0; i < 20; i++) {
      await settle();
      const found = http.match(url);
      if (found.length) return found[0];
    }
    throw new Error(`no llegó ${url}`);
  }

  it('si el servidor no responde, reintenta (en vez de mandar al login) y marca "waking"', async () => {
    const done = auth.restore();
    (await next(`${AUTH}/refresh`)).flush('dormido', { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(auth.waking()).toBe(true);
    expect(auth.status()).toBe('unknown');
    (await next(`${AUTH}/refresh`)).flush({ accessToken: 'acc', refreshToken: 'ref-2' });
    expect(auth.wakeAttempt()).toBe(2);
    (await next(`${AUTH}/me`)).flush({ player: PLAYER });
    await done;
    expect(auth.status()).toBe('authenticated');
    expect(auth.waking()).toBe(false);
  });

  it('un /auth/me que no responde también se reintenta', async () => {
    const done = auth.restore();
    (await next(`${AUTH}/refresh`)).flush({ accessToken: 'acc', refreshToken: 'ref-2' });
    (await next(`${AUTH}/me`)).error(new ProgressEvent('error'));
    (await next(`${AUTH}/refresh`)).flush({ accessToken: 'acc2', refreshToken: 'ref-3' });
    (await next(`${AUTH}/me`)).flush({ player: PLAYER });
    await done;
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('un 401 no se reintenta: la sesión se da por perdida', async () => {
    const done = auth.restore();
    (await next(`${AUTH}/refresh`)).flush({}, { status: 401, statusText: 'Unauthorized' });
    await done;
    expect(auth.status()).toBe('anonymous');
    expect(store.token).toBeNull();
    expect(auth.waking()).toBe(false);
  });

  it('pasado el máximo se rinde SIN borrar el token (se podrá reintentar)', async () => {
    retry.maxMs = 0;
    const done = auth.restore();
    (await next(`${AUTH}/refresh`)).error(new ProgressEvent('error'));
    await done;
    expect(auth.status()).toBe('anonymous');
    expect(store.token).toBe('ref-1');
    expect(auth.waking()).toBe(false);
    retry.maxMs = 60_000;
  });
});
