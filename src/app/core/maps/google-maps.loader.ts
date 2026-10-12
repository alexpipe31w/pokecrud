import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { localEnv } from '../../../environments/environment.local';

/**
 * Carga de la Maps JavaScript API (F1-01). La clave y el Map ID salen de `environment.local.ts` (gitignored, ver
 * docs/plan/SECRETOS.md); si el archivo no existe, `scripts/ensure-local-env.mjs` lo crea desde la plantilla con la
 * clave vacía y aquí se avisa en vez de pedir el script a Google sin clave.
 */
export const MAPS_MAP_ID = localEnv.googleMapsMapId;

/** Sin red o con la API bloqueada, la promesa de importLibrary puede no resolverse nunca: tope explícito. */
const LOAD_TIMEOUT_MS = 15_000;

export class MapsLoadError extends Error {}

let configured = false;
let authFailed = false;

function configure(): void {
  if (configured) return;
  if (!localEnv.googleMapsApiKey) {
    throw new MapsLoadError(
      'Falta la clave de Google Maps en src/environments/environment.local.ts (ver docs/plan/SECRETOS.md).',
    );
  }
  // Google llama a esta función global si rechaza la clave (referrer no permitido, API no habilitada…).
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    authFailed = true;
    console.error(
      '[maps] Google rechazó la clave: revisa las restricciones de referrer en Google Cloud.',
    );
  };
  setOptions({
    key: localEnv.googleMapsApiKey,
    v: 'weekly',
    language: 'es',
    region: 'CO',
    mapIds: [MAPS_MAP_ID],
  });
  configured = true;
}

/** `true` si Google llamó a `gm_authFailure` (clave rechazada). El mapa sale gris con un aviso de Google. */
export const mapsAuthFailed = (): boolean => authFailed;

/** Importa una librería de la Maps JS API (`maps`, `marker`…) con timeout. */
export async function loadMapsLibrary<K extends keyof google.maps.ImportLibraryMap>(
  name: K,
): Promise<google.maps.ImportLibraryMap[K]> {
  configure();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new MapsLoadError(`Google Maps no respondió en ${LOAD_TIMEOUT_MS / 1000} s.`)),
      LOAD_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([importLibrary(name), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
