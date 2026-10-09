import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UiService } from '../../services/ui.service';

/**
 * Muestra un mensaje amigable cuando falla cualquier petición HTTP (IS-15 · HU-07).
 *
 * Los 404 no se avisan: cada página los convierte en un estado propio
 * («no está en la base de datos», «No se encontró en PokéAPI»…).
 * El error se vuelve a lanzar para que la página pueda reaccionar (spinner, estado de error).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const ui = inject(UiService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status !== 404) {
        ui.errorToast(friendlyMessage(err, req.url));
      }
      return throwError(() => err);
    }),
  );
};

/** Traduce un error HTTP a un mensaje que entienda el usuario. */
export function friendlyMessage(err: HttpErrorResponse, url: string): string {
  const isBackend = url.startsWith(environment.apiUrl);
  if (err.status === 0) {
    return isBackend
      ? 'No se pudo conectar con la base de datos. ¿Está corriendo «npm run api»?'
      : 'No se pudo conectar con PokéAPI. Revisa tu conexión a internet.';
  }
  if (err.status >= 500) return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
  if (err.status === 400 || err.status === 422) return 'Los datos enviados no son válidos.';
  return `Ocurrió un error inesperado (código ${err.status}).`;
}
