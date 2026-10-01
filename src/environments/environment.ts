// Entorno de desarrollo.
// `ng build` reemplaza este archivo por `environment.prod.ts` (ver `fileReplacements` en angular.json).

export const environment = {
  production: false,
  /** API pública de solo lectura con los datos de los Pokémon. */
  pokeApiUrl: 'https://pokeapi.co/api/v2',
  /** Backend propio (JSON Server). Se levanta con `npm run api`. */
  apiUrl: 'http://localhost:3000',
};
