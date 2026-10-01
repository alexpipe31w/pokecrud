import { Routes } from '@angular/router';

import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'pokedex',
        loadComponent: () =>
          import('../../../features/pokedex/pokedex.page').then((m) => m.PokedexPage),
      },
      {
        path: 'equipos',
        loadComponent: () => import('../../../features/teams/teams.page').then((m) => m.TeamsPage),
      },
      {
        path: 'favoritos',
        loadComponent: () =>
          import('../../../features/favorites/favorites.page').then((m) => m.FavoritesPage),
      },
      {
        path: 'mis-pokemon',
        loadComponent: () =>
          import('../../../features/my-pokemon/my-pokemon.page').then((m) => m.MyPokemonPage),
      },
      {
        path: '',
        redirectTo: '/tabs/pokedex',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/pokedex',
    pathMatch: 'full',
  },
];
