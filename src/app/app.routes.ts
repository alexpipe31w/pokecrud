import { Routes } from '@angular/router';

/**
 * Rutas raíz de PokéCRUD.
 *
 *  /tabs/pokedex      → Pokédex (listado)
 *  /tabs/equipos      → Mis Equipos
 *  /tabs/favoritos    → Favoritos
 *  /tabs/mis-pokemon  → Pokémon personalizados
 *  /pokemon/:id       → Detalle de un Pokémon
 */
export const routes: Routes = [
  {
    path: 'pokemon/:id',
    loadComponent: () =>
      import('./features/pokemon-detail/pokemon-detail.page').then((m) => m.PokemonDetailPage),
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
