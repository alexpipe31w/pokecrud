import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService, Player, authErrorMessage } from './auth.service';
import { TOKEN_STORE, TokenStore } from './token-store';

const AUTH = `${environment.serverUrl}/auth`;
const PLAYER: Player = { id: 'p1', email: 'ash@pokecrud.test', nickname: 'ash', level: 1, xp: 0 };

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
