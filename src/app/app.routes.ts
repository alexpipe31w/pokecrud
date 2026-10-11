import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

/**
 * Rutas raíz de PokéCRUD.
 *
 *  /login             → Iniciar sesión (solo sin sesión)
 *  /registro          → Crear cuenta (solo sin sesión)
 *  /tabs/pokedex      → Pokédex (listado)
 *  /pokemon/nuevo     → Agregar un Pokémon (buscador PokéAPI + formulario)
 *  /pokemon/:id       → Detalle de un Pokémon
 *  /pokemon/:id/editar → Editar un Pokémon
 *  /dev/ui            → Escaparate del sistema de diseño (solo desarrollo, exige sesión)
 *
 * Toda ruta nueva lleva `canActivate: [authGuard]`. EXCEPCIÓN TEMPORAL (F0-07): las rutas de IS-11
 * (/tabs/pokedex y /pokemon/*) siguen públicas para no romper la entrega evaluada; se protegen en F0-08,
 * cuando su CRUD pase al servidor NestJS con filtro por jugador.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'pokemon/nuevo',
    loadComponent: () =>
      import('./features/pokemon-add/pokemon-add.page').then((m) => m.PokemonAddPage),
  },
  {
    path: 'pokemon/:id/editar',
    loadComponent: () =>
      import('./features/pokemon-edit/pokemon-edit.page').then((m) => m.PokemonEditPage),
  },
  {
    path: 'pokemon/:id',
    loadComponent: () =>
      import('./features/pokemon-detail/pokemon-detail.page').then((m) => m.PokemonDetailPage),
  },
  {
    path: 'dev/ui',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dev-ui/dev-ui.page').then((m) => m.DevUiPage),
  },
  {
    path: '',
    loadChildren: () => import('./core/layout/tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: '**',
    redirectTo: '/tabs/pokedex',
  },
];
