import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TOKEN_STORE } from './token-store';

export interface Player {
  id: string;
  email: string;
  nickname: string;
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
 * Sesión del jugador. Access token SOLO en memoria; refresh token en el TokenStore (Keystore en
 * Android, sessionStorage en web: D-006). Las llamadas de auth usan un HttpClient sin interceptores
 * para no entrar en bucle con authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly store = inject(TOKEN_STORE);
  private readonly base = `${environment.serverUrl}/auth`;

  private readonly _player = signal<Player | null>(null);
  private readonly _status = signal<AuthStatus>('unknown');
  private accessToken: string | null = null;
  /** Refresh en vuelo: lo comparten todas las peticiones que reciben 401 a la vez. */
  private refreshing: Promise<string | null> | null = null;
  private restoring: Promise<void> | null = null;

  readonly player = this._player.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isLoggedIn = computed(() => this._player() !== null);

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
  refresh(): Promise<string | null> {
    this.refreshing ??= this.doRefresh().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  private async doRestore(): Promise<void> {
    const access = await this.refresh();
    if (!access) {
      this._status.set('anonymous');
      this.restoring = null; // sin red o sin sesión: se puede volver a intentar más tarde
      return;
    }
    try {
      const { player } = await firstValueFrom(
        this.http
          .get<{ player: Player }>(`${this.base}/me`, {
            headers: new HttpHeaders({ Authorization: `Bearer ${access}` }),
          })
          .pipe(timeout(AUTH_TIMEOUT_MS)),
      );
      this._player.set(player);
      this._status.set('authenticated');
    } catch {
      this.endSession();
      this.restoring = null;
    }
  }

  private async doRefresh(): Promise<string | null> {
    const refreshToken = await this.store.get();
    if (!refreshToken) return null;
    try {
      const tokens = await this.post<Tokens>('refresh', { refreshToken });
      await this.store.set(tokens.refreshToken);
      this.accessToken = tokens.accessToken;
      return tokens.accessToken;
    } catch (err) {
      // 401 = el servidor rechazó la sesión (caducada, revocada o robada): se borra.
      // Cualquier otro fallo (sin red, servidor dormido) conserva el token para reintentar.
      if (err instanceof HttpErrorResponse && err.status === 401) {
        await this.store.clear();
        this.endSession();
      }
      return null;
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
