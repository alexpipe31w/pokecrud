import type { CapacitorConfig } from '@capacitor/cli';

/**
 * `CAP_DEV=1` (lo pone `npm run apk -- device`): APK de desarrollo que habla con el servidor Nest del PC por
 * `http://<IP-LAN>:3000`. La app dentro del APK se sirve como `https://localhost`, así que hace falta permitir
 * HTTP plano y contenido mixto. NUNCA en el APK de producción (habla con Render por HTTPS).
 */
const devDevice = process.env['CAP_DEV'] === '1';

const config: CapacitorConfig = {
  appId: 'co.edu.fet.pokecrud',
  appName: 'PokéCRUD',
  webDir: 'www',
  // El registro de Capacitor escribe en la consola del WebView/logcat lo que pasa por los plugins, INCLUIDO el
  // refresh token que lee SecureStorage (visto en F1-03). `npm run apk` siempre compila un APK de depuración, así que
  // el valor por defecto ('debug') registraba también en el APK que habla con Render. Solo en el de desarrollo.
  loggingBehavior: devDevice ? 'debug' : 'none',
  ...(devDevice && {
    server: { cleartext: true },
    android: { allowMixedContent: true },
  }),
};

export default config;
