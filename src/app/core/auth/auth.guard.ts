import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Rutas que exigen sesión. Si no la hay, intenta recuperarla y si no, manda a /login?redirect=… */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) await auth.restore();
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/**
 * Agregar/editar del inventario (F0-12): sin sesión → /login; con sesión pero sin rol ADMIN → Pokédex.
 * Es solo comodidad de la UI: el servidor responde 403 a cualquier escritura de quien no es ADMIN.
 */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) await auth.restore();
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }
  return auth.isAdmin() ? true : router.createUrlTree(['/inventario']);
};

/** /login y /registro: quien ya tiene sesión no tiene nada que hacer ahí. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) await auth.restore();
  return auth.isLoggedIn() ? inject(Router).createUrlTree(['/']) : true;
};

/** Destino tras el login: solo rutas internas (evita redirecciones abiertas a otro dominio). */
export function safeRedirect(target: string | null | undefined): string {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
}
