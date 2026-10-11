// Entorno de producción.

export const environment = {
  production: true,
  pokeApiUrl: 'https://pokeapi.co/api/v2',
  // Servidor NestJS desplegado en Render (F0-06). El plan gratis se duerme a los 15 min: la primera petición tarda
  // ~1 min.
  serverUrl: 'https://pokecrud-server.onrender.com',
};
