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
  ...(devDevice && {
    server: { cleartext: true },
    android: { allowMixedContent: true },
  }),
};

export default config;
