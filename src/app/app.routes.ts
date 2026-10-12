import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guard';

/**
 * Rutas raíz de PokéCRUD.
 *
 *  /login             → Iniciar sesión (solo sin sesión)
 *  /registro          → Crear cuenta (solo sin sesión)
 *  /tabs/pokedex      → Pokédex (listado)
 *  /pokemon/nuevo     → Agregar un Pokémon (buscador PokéAPI + formulario)
 *  /pokemon/:id       → Detalle de un Pokémon
 *  /pokemon/:id/editar → Editar un Pokémon
 *  /combate/prueba    → Combate de prueba contra la IA (F4-05, exige sesión)
 *  /dev/ui            → Escaparate del sistema de diseño (solo desarrollo, exige sesión)
 *
 * Toda ruta nueva lleva `canActivate: [authGuard]`. EXCEPCIÓN (F0-08): la Pokédex y el detalle de IS-11 son de
 * solo lectura y `GET /pokemon` es público en el servidor, así que se ven sin sesión. Agregar y editar sí la
 * exigen sesión con rol ADMIN (F0-12; el servidor responde 401 sin token y 403 si no es ADMIN).
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
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/pokemon-add/pokemon-add.page').then((m) => m.PokemonAddPage),
  },
  {
    path: 'pokemon/:id/editar',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/pokemon-edit/pokemon-edit.page').then((m) => m.PokemonEditPage),
  },
  {
    path: 'pokemon/:id',
    loadComponent: () =>
      import('./features/pokemon-detail/pokemon-detail.page').then((m) => m.PokemonDetailPage),
  },
  {
    path: 'combate/prueba',
    canActivate: [authGuard],
    loadComponent: () => import('./features/battle/battle.page').then((m) => m.BattlePage),
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
