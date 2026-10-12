import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TOKEN_STORE } from './token-store';

export interface Player {
  id: string;
  email: string;
  nickname: string;
  /** Solo para mostrar u ocultar botones: quien decide es el servidor (403 si no es ADMIN). F0-12. */
  role: 'PLAYER' | 'ADMIN';
  level: number;
  xp: number;
}
export interface Credentials {
  email: string;
  password: string;
}
export interface Registration extends Credentials {
  nickname: string;
}
interface Tokens {
  accessToken: string;
  refreshToken: string;
}
interface AuthResult extends Tokens {
  player: Player;
}

/** `unknown` hasta que termina el primer restore(); luego `authenticated` o `anonymous`. */
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

/** El plan gratis de Render tarda ~1 min en despertar: las llamadas de auth esperan un poco más. */
export const AUTH_TIMEOUT_MS = 70_000;

/**
 * Reintentos al recuperar la sesión con el servidor dormido (F1-09, DISENO §6). Si no responde (sin red, 5xx,
 * timeout), se reintenta con espera creciente durante `maxMs` en vez de dar la sesión por perdida; si tarda más de
 * `wakingAfterMs`, la app enseña la pantalla "servidor despertando".
 */
export interface RestoreRetry {
  wakingAfterMs: number;
  backoffMs: readonly number[];
  maxMs: number;
}
export const RESTORE_RETRY = new InjectionToken<RestoreRetry>('RESTORE_RETRY', {
  providedIn: 'root',
  factory: () => ({ wakingAfterMs: 1500, backoffMs: [2000, 4000, 8000, 15_000], maxMs: 120_000 }),
});

/** Resultado de un intento: sesión válida, rechazada por el servidor (401) o servidor inalcanzable. */
type RefreshOutcome =
  { kind: 'ok'; token: string } | { kind: 'none' } | { kind: 'rejected' } | { kind: 'unreachable' };

/**
 * Sesión del jugador. Access token SOLO en memoria; refresh token en el TokenStore (Keystore en
 * Android, sessionStorage en web: D-006). Las llamadas de auth usan un HttpClient sin interceptores
 * para no entrar en bucle con authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly store = inject(TOKEN_STORE);
  private readonly base = `${environment.serverUrl}/auth`;
  private readonly retry = inject(RESTORE_RETRY);

  private readonly _player = signal<Player | null>(null);
  private readonly _status = signal<AuthStatus>('unknown');
  private accessToken: string | null = null;
  /** Refresh en vuelo: lo comparten todas las peticiones que reciben 401 a la vez. */
  private refreshing: Promise<RefreshOutcome> | null = null;
  private restoring: Promise<void> | null = null;
  private readonly _waking = signal(false);
  private readonly _wakeAttempt = signal(0);

  readonly player = this._player.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isLoggedIn = computed(() => this._player() !== null);
  /** Puede modificar el inventario `/pokemon` (F0-12). */
  readonly isAdmin = computed(() => this._player()?.role === 'ADMIN');
  /** Recuperando la sesión y el servidor tarda (Render despertando): la app lo enseña (F1-09). */
  readonly waking = this._waking.asReadonly();
  /** Intento en curso mientras `waking` (1, 2, 3…). */
  readonly wakeAttempt = this._wakeAttempt.asReadonly();

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async register(data: Registration): Promise<void> {
    await this.startSession(await this.post<AuthResult>('register', data));
  }

  async login(data: Credentials): Promise<void> {
    await this.startSession(await this.post<AuthResult>('login', data));
  }

  /** Cierra la sesión aquí al instante y, sin esperar a nadie, la revoca en el servidor. */
  async logout(): Promise<void> {
    const refreshToken = await this.store.get();
    this.endSession();
    await this.store.clear();
    if (!refreshToken) return;
    try {
      await this.post<void>('logout', { refreshToken });
    } catch {
      /* sin red: el token caducará solo; localmente la sesión ya está cerrada */
    }
  }

  /** Recupera la sesión guardada al arrancar. Idempotente: varias llamadas comparten la misma. */
  restore(): Promise<void> {
    this.restoring ??= this.doRestore();
    return this.restoring;
  }

  /** Pide un access nuevo con el refresh guardado (rota el refresh). null si no hay sesión válida. */
  async refresh(): Promise<string | null> {
    const outcome = await this.sharedRefresh();
    return outcome.kind === 'ok' ? outcome.token : null;
  }

  private sharedRefresh(): Promise<RefreshOutcome> {
    this.refreshing ??= this.doRefresh().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /**
   * Recupera la sesión; si el servidor no responde (dormido en Render, sin red) reintenta con espera creciente hasta
   * `retry.maxMs` y, pasado `retry.wakingAfterMs`, marca `waking` para que la app enseñe la pantalla de espera.
   * Solo un 401 da la sesión por perdida.
   */
  private async doRestore(): Promise<void> {
    if (!(await this.store.get())) {
      this._status.set('anonymous');
      this.restoring = null;
      return;
    }
    const started = Date.now();
    const timer = setTimeout(() => this._waking.set(true), this.retry.wakingAfterMs);
    try {
      for (let attempt = 1; ; attempt++) {
        this._wakeAttempt.set(attempt);
        const outcome = await this.restoreOnce();
        if (outcome !== 'unreachable') return;
        const elapsed = Date.now() - started;
        if (elapsed >= this.retry.maxMs) {
          console.warn('[auth] el servidor no responde; se sigue sin sesión', { attempt, elapsed });
          this._status.set('anonymous');
          this.restoring = null; // el token se conserva: se puede volver a intentar más tarde
          return;
        }
        const wait = this.retry.backoffMs[Math.min(attempt - 1, this.retry.backoffMs.length - 1)];
        await new Promise((r) => setTimeout(r, wait));
      }
    } finally {
      clearTimeout(timer);
      this._waking.set(false);
      this._wakeAttempt.set(0);
    }
  }

  /** Un intento de refresh + /auth/me. */
  private async restoreOnce(): Promise<'ok' | 'rejected' | 'unreachable'> {
    const refreshed = await this.sharedRefresh();
    if (refreshed.kind === 'unreachable') return 'unreachable';
    if (refreshed.kind !== 'ok') {
      this.endSession();
      this.restoring = null;
      return 'rejected';
    }
    try {
      const { player } = await firstValueFrom(
        this.http
          .get<{ player: Player }>(`${this.base}/me`, {
            headers: new HttpHeaders({ Authorization: `Bearer ${refreshed.token}` }),
          })
          .pipe(timeout(AUTH_TIMEOUT_MS)),
      );
      this._player.set(player);
      this._status.set('authenticated');
      return 'ok';
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        this.endSession();
        this.restoring = null;
        return 'rejected';
      }
      return 'unreachable';
    }
  }

  private async doRefresh(): Promise<RefreshOutcome> {
    const refreshToken = await this.store.get();
    if (!refreshToken) return { kind: 'none' };
    try {
      const tokens = await this.post<Tokens>('refresh', { refreshToken });
      await this.store.set(tokens.refreshToken);
      this.accessToken = tokens.accessToken;
      return { kind: 'ok', token: tokens.accessToken };
    } catch (err) {
      // 401 = el servidor rechazó la sesión (caducada, revocada o robada): se borra.
      // Cualquier otro fallo (sin red, servidor dormido) conserva el token para reintentar.
      if (err instanceof HttpErrorResponse && err.status === 401) {
        await this.store.clear();
        this.endSession();
        return { kind: 'rejected' };
      }
      return { kind: 'unreachable' };
    }
  }

  private async startSession(result: AuthResult): Promise<void> {
    await this.store.set(result.refreshToken);
    this.accessToken = result.accessToken;
    this._player.set(result.player);
    this._status.set('authenticated');
  }

  private endSession(): void {
    this.accessToken = null;
    this._player.set(null);
    this._status.set('anonymous');
  }

  private post<T>(path: string, body: object): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(`${this.base}/${path}`, body).pipe(timeout(AUTH_TIMEOUT_MS)),
    );
  }
}

/** Mensaje en español para mostrar en la UI a partir de un error de auth. */
export function authErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status > 0) {
    const message = (err.error as { message?: unknown } | null)?.message;
    const text = Array.isArray(message) ? message[0] : message;
    if (typeof text === 'string' && text.length > 0 && err.status < 500) return text;
    if (err.status === 401) return 'Correo o contraseña incorrectos';
    if (err.status === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    return 'Algo salió mal en el servidor. Inténtalo de nuevo.';
  }
  return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
}
