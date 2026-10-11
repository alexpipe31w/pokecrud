import { Routes } from '@angular/router';

/**
 * Rutas raíz de PokéCRUD.
 *
 *  /tabs/pokedex      → Pokédex (listado)
 *  /pokemon/nuevo     → Agregar un Pokémon (buscador PokéAPI + formulario)
 *  /pokemon/:id       → Detalle de un Pokémon
 *  /pokemon/:id/editar → Editar un Pokémon
 *  /dev/ui            → Escaparate del sistema de diseño (solo desarrollo)
 */
export const routes: Routes = [
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
