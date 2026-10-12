// F1-01: `src/environments/environment.local.ts` está en .gitignore (lleva la clave de Google Maps) pero
// `environment.ts` lo importa. Si falta, se crea desde la plantilla (clave vacía) para que la app compile en
// cualquier PC; el mapa avisa "falta la clave de Google Maps" hasta que se rellene (docs/plan/SECRETOS.md).
// Nunca sobrescribe un archivo existente. Lo llaman postinstall, prestart, prebuild y scripts/apk.mjs.
import { copyFileSync, existsSync } from 'node:fs';

const dir = new URL('../src/environments/', import.meta.url);
const local = new URL('environment.local.ts', dir);
if (!existsSync(local)) {
  copyFileSync(new URL('environment.local.example.ts', dir), local);
  console.log(
    'Creado src/environments/environment.local.ts desde la plantilla (sin clave de Google Maps: ver docs/plan/SECRETOS.md).',
  );
}
