import { HttpErrorResponse } from '@angular/common/http';
import { inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { safeRedirect } from '../../core/auth/auth.guard';
import { authErrorMessage } from '../../core/auth/auth.service';

/** Tras este tiempo esperando, se avisa de que el servidor (Render gratis) se está despertando. */
const SLOW_MS = 4000;

/** Estado y envío comunes a las pantallas de login y registro. */
export abstract class AuthForm {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Se intentó enviar: a partir de aquí se muestran los errores de todos los campos. */
  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly slow = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  /** A dónde volver tras entrar (solo rutas internas). */
  protected readonly redirect = safeRedirect(this.route.snapshot.queryParamMap.get('redirect'));

  /**
   * Ejecuta el envío: bloquea el botón, avisa si tarda y traduce el error. `fieldError` permite a la
   * pantalla colocar un error del servidor bajo su campo (p. ej. "Ese apodo ya está en uso").
   */
  protected async run(
    action: () => Promise<void>,
    fieldError?: (message: string, err: HttpErrorResponse) => boolean,
  ): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.serverError.set(null);
    const slowTimer = setTimeout(() => this.slow.set(true), SLOW_MS);
    try {
      await action();
      await this.router.navigateByUrl(this.redirect);
    } catch (err) {
      const message = authErrorMessage(err);
      const placed = err instanceof HttpErrorResponse && fieldError?.(message, err);
      if (!placed) this.serverError.set(message);
    } finally {
      clearTimeout(slowTimer);
      this.loading.set(false);
      this.slow.set(false);
    }
  }
}
