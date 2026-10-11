import { Injectable } from '@nestjs/common';

/** Fallos de login permitidos por cuenta dentro de la ventana antes de bloquearla. */
export const MAX_LOGIN_FAILURES = 10;
/** Ventana (y duración del bloqueo) contada desde el primer fallo. */
export const LOGIN_LOCK_WINDOW_MS = 15 * 60_000;
/** Tope de cuentas vigiladas a la vez, para que la memoria no crezca sin límite. */
const MAX_TRACKED = 10_000;

/**
 * Límite de intentos por CUENTA, complementario al rate limit por IP (5/min): con muchas IP un
 * atacante esquiva el de IP, pero no este. Se aplica también a correos inexistentes, así el bloqueo
 * no revela si una cuenta existe. En memoria: el servidor es un único proceso (D-005).
 */
@Injectable()
export class LoginAttemptsService {
  private readonly failures = new Map<
    string,
    { count: number; firstAt: number }
  >();

  isLocked(key: string): boolean {
    return (this.current(key)?.count ?? 0) >= MAX_LOGIN_FAILURES;
  }

  recordFailure(key: string): void {
    const entry = this.current(key);
    if (entry) {
      entry.count++;
      return;
    }
    this.makeRoom();
    this.failures.set(key, { count: 1, firstAt: Date.now() });
  }

  reset(key: string): void {
    this.failures.delete(key);
  }

  private current(key: string): { count: number; firstAt: number } | undefined {
    const entry = this.failures.get(key);
    if (entry && Date.now() - entry.firstAt >= LOGIN_LOCK_WINDOW_MS) {
      this.failures.delete(key);
      return undefined;
    }
    return entry;
  }

  private makeRoom(): void {
    if (this.failures.size < MAX_TRACKED) return;
    const now = Date.now();
    for (const [key, entry] of this.failures) {
      if (now - entry.firstAt >= LOGIN_LOCK_WINDOW_MS)
        this.failures.delete(key);
    }
    // Si siguen sin caber, sale la más antigua (el Map conserva el orden de inserción).
    if (this.failures.size >= MAX_TRACKED) {
      const oldest = this.failures.keys().next().value;
      if (oldest !== undefined) this.failures.delete(oldest);
    }
  }
}
