// Entorno de desarrollo.
// `ng build` reemplaza este archivo por `environment.prod.ts` (ver `fileReplacements` en angular.json).

export const environment = {
  production: false,
  /** API pública de solo lectura con los datos de los Pokémon. */
  pokeApiUrl: 'https://pokeapi.co/api/v2',
  /** Backend propio (JSON Server). Se levanta con `npm run api`. */
  apiUrl: 'http://localhost:3000',
  /**
   * Servidor del juego (NestJS, `server/`): auth y, desde F0-08, todo lo demás. En local corre en el 3001 mientras
   * JSON Server ocupa el 3000: `cd server` y `PORT=3001 npm run start:dev`.
   */
  serverUrl: 'http://localhost:3001',
};
