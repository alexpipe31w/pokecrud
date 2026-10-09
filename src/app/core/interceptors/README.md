# core/interceptors

Interceptores HTTP de la aplicación. Se registran en `src/main.ts` con `withInterceptors`.

- `error.interceptor.ts` (**IS-15 · HU-07**): ante cualquier error HTTP muestra un toast con un mensaje amigable (sin conexión, error del servidor, datos inválidos…). Los 404 no se avisan porque cada página los muestra como un estado propio. El error se vuelve a lanzar para que la página pueda reaccionar.
