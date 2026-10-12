import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { adminGuard, authGuard, guestGuard, safeRedirect } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard / guestGuard', () => {
  const loggedIn = signal(false);
  const admin = signal(false);
  const auth = { isLoggedIn: loggedIn, isAdmin: admin, restore: vi.fn(() => Promise.resolve()) };
  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    loggedIn.set(false);
    admin.set(false);
    auth.restore.mockClear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  const run = (guard: typeof authGuard, url: string) =>
    TestBed.runInInjectionContext(() => guard(route, state(url)));

  it('con sesión deja pasar', async () => {
    loggedIn.set(true);
    expect(await run(authGuard, '/dev/ui')).toBe(true);
  });

  it('sin sesión intenta restaurarla y si no hay, manda a /login con redirect', async () => {
    const result = (await run(authGuard, '/dev/ui')) as UrlTree;
    expect(auth.restore).toHaveBeenCalled();
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?redirect=%2Fdev%2Fui');
  });

  it('si restore recupera la sesión, deja pasar', async () => {
    auth.restore.mockImplementationOnce(async () => loggedIn.set(true));
    expect(await run(authGuard, '/dev/ui')).toBe(true);
  });

  it('guestGuard saca de /login a quien ya tiene sesión', async () => {
    loggedIn.set(true);
    const result = (await run(guestGuard, '/login')) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/');
    loggedIn.set(false);
    expect(await run(guestGuard, '/login')).toBe(true);
  });

  it('adminGuard (F0-12): sin sesión → /login; jugador normal → Pokédex; ADMIN pasa', async () => {
    const router = () => TestBed.inject(Router);
    const anon = (await run(adminGuard, '/pokemon/nuevo')) as UrlTree;
    expect(auth.restore).toHaveBeenCalled();
    expect(router().serializeUrl(anon)).toBe('/login?redirect=%2Fpokemon%2Fnuevo');

    loggedIn.set(true);
    const player = (await run(adminGuard, '/pokemon/nuevo')) as UrlTree;
    expect(router().serializeUrl(player)).toBe('/pokedex');

    admin.set(true);
    expect(await run(adminGuard, '/pokemon/nuevo')).toBe(true);
  });

  it('safeRedirect solo acepta rutas internas', () => {
    expect(safeRedirect('/dev/ui')).toBe('/dev/ui');
    expect(safeRedirect('//evil.com')).toBe('/');
    expect(safeRedirect('https://evil.com')).toBe('/');
    expect(safeRedirect(null)).toBe('/');
  });
});
