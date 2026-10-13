import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guard';

/**
 * Rutas raíz de PokéCRUD.
 *
 *  /login             → Iniciar sesión (solo sin sesión)
 *  /registro          → Crear cuenta (solo sin sesión)
 *  /mapa              → Mapa: pantalla principal del juego (F1-04, exige sesión). "" y rutas desconocidas → aquí
 *  /coleccion         → Mis Pokémon: lo capturado, con orden y filtros (F3-02b, exige sesión)
 *  /coleccion/:id     → Ficha de un Pokémon capturado (F3-03, exige sesión)
 *  /equipos           → Mis equipos (hasta 6 Pokémon capturados; F3-06b, exige sesión)
 *  /equipos/nuevo     → Crear un equipo · /equipos/:id → editarlo o borrarlo
 *  /favoritos         → Especies favoritas con valoración y nota (F3-06c, `/favorites` del curso; exige sesión)
 *  /personalizados    → Pokémon inventados (F3-06c, `/customPokemon` del curso) · /nuevo y /:id → editor
 *  /pokedex           → Pokédex de las 1025 especies: vistos/capturados por generación (F3-04, exige sesión)
 *  /pokedex/:id       → Ficha de una especie (F3-04, exige sesión)
 *  /inventario        → Inventario de la tienda (IS-11; pública). /tabs/pokedex → redirige aquí (enlaces viejos)
 *  /pokemon/nuevo     → Agregar un Pokémon (buscador PokéAPI + formulario)
 *  /pokemon/:id       → Detalle de un Pokémon
 *  /pokemon/:id/editar → Editar un Pokémon
 *  /encuentro/:id     → Encuentro con un Pokémon del mapa (F1-07, PROVISIONAL hasta la escena AR de F2-04; exige sesión)
 *  /combate/prueba    → Combate de prueba contra la IA (F4-05, exige sesión)
 *  /pvp/combate       → Combate PvP en curso (F5-04, la escena de F4-05 en modo remoto; exige sesión)
 *  /dev/ui            → Escaparate del sistema de diseño (solo desarrollo, exige sesión)
 *  /dev/mapa          → Spike F1-01: Google Maps 3D + three.js con medidor de fps (solo desarrollo, exige sesión)
 *  /dev/ar            → Spike F2-01: cámara + giroscopio + three.js con medidor de fps (solo desarrollo, exige sesión)
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
    path: 'encuentro/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/encounter/encounter.page').then((m) => m.EncounterPage),
  },
  {
    path: 'pvp/combate',
    canActivate: [authGuard],
    data: { pvp: true },
    loadComponent: () => import('./features/battle/battle.page').then((m) => m.BattlePage),
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
    path: 'dev/mapa',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dev-map/dev-map.page').then((m) => m.DevMapPage),
  },
  {
    path: 'dev/ar',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dev-ar/dev-ar.page').then((m) => m.DevArPage),
  },
  {
    path: 'mapa',
    canActivate: [authGuard],
    loadComponent: () => import('./features/map/map.page').then((m) => m.MapPage),
  },
  {
    path: 'coleccion',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/collection/collection.page').then((m) => m.CollectionPage),
  },
  {
    path: 'coleccion/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/collection/collection-detail.page').then((m) => m.CollectionDetailPage),
  },
  {
    path: 'equipos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/teams/teams.page').then((m) => m.TeamsPage),
  },
  {
    path: 'equipos/nuevo',
    canActivate: [authGuard],
    loadComponent: () => import('./features/teams/team-editor.page').then((m) => m.TeamEditorPage),
  },
  {
    path: 'equipos/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/teams/team-editor.page').then((m) => m.TeamEditorPage),
  },
  {
    path: 'pvp',
    canActivate: [authGuard],
    loadComponent: () => import('./features/pvp/pvp.page').then((m) => m.PvpPage),
  },
  {
    path: 'favoritos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/favorites/favorites.page').then((m) => m.FavoritesPage),
  },
  {
    path: 'personalizados',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/custom-pokemon/custom-pokemon.page').then((m) => m.CustomPokemonPage),
  },
  {
    path: 'personalizados/nuevo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/custom-pokemon/custom-editor.page').then((m) => m.CustomEditorPage),
  },
  {
    path: 'personalizados/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/custom-pokemon/custom-editor.page').then((m) => m.CustomEditorPage),
  },
  {
    path: 'pokedex',
    canActivate: [authGuard],
    loadComponent: () => import('./features/pokedex-1025/pokedex.page').then((m) => m.PokedexPage),
  },
  {
    path: 'pokedex/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/pokedex-1025/species.page').then((m) => m.SpeciesPage),
  },
  {
    path: 'inventario',
    loadComponent: () => import('./features/inventory/inventory.page').then((m) => m.InventoryPage),
  },
  // Las pestañas de Ionic se quitaron en F1-04 (el menú es la Poké Ball del mapa): los enlaces viejos siguen valiendo.
  { path: 'tabs/pokedex', redirectTo: '/inventario' },
  { path: '', pathMatch: 'full', redirectTo: '/mapa' },
  { path: '**', redirectTo: '/mapa' },
];
