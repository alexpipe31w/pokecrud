// Entorno de desarrollo.
// `ng build` reemplaza este archivo por `environment.prod.ts` (ver `fileReplacements` en angular.json).

export const environment = {
  production: false,
  /** API pública de solo lectura con los datos de los Pokémon. */
  pokeApiUrl: 'https://pokeapi.co/api/v2',
  /**
   * Servidor del juego (NestJS, `server/`): auth, el CRUD del curso (`/pokemon`, `/teams`…) y todo lo demás.
   * En local: `cd server` y `npm run start:dev` (puerto 3000).
   */
  serverUrl: 'http://localhost:3000',
};
