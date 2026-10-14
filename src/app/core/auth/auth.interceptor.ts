import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Añade el access token SOLO a las peticiones al servidor del juego (nunca a PokéAPI ni a Google). Ante un
 * 401 refresca una vez (el refresh es compartido, ver AuthService) y repite; si no hay
 * sesión que recuperar, cierra sesión y lleva a /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.serverUrl)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const withToken = (request: HttpRequest<unknown>, token: string | null) =>
    token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(withToken(req, auth.getAccessToken())).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return from(auth.refresh()).pipe(
        switchMap((token) => {
          if (!token) {
            void auth.logout().then(() => router.navigateByUrl('/login'));
            return throwError(() => err);
          }
          // Un único reintento: si vuelve a dar 401, el error sube tal cual (sin bucles).
          return next(withToken(req, token));
        }),
      );
    }),
  );
};
