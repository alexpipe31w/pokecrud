// F0-13: borra los restos de compilación que pueden aparecer JUNTO a las fuentes de `shared/`.
// Causa (reproducida): compilar el servidor con la config anterior a D-024 (`rootDir: ./src`, p. ej. al compilar una
// rama vieja) sobre código que ya importa `shared/` emite en `dist/../../shared/` = la carpeta `shared/` del repo.
// Peligro: en `shared/` se importa con extensión `.js` (`./rng.js`), así que si existe un `rng.js` de verdad, Vitest y
// la build lo usan EN VEZ del `rng.ts`: se ejecutaría código viejo sin avisar.
// Solo borra `X.js`, `X.js.map`, `X.d.ts` y `X.d.ts.map` cuando existe `X.ts` al lado (nunca toca nada sin fuente).
// También borra `server/tsconfig.build.tsbuildinfo`, la caché que deja esa config vieja (la buena va en `server/dist/`).
// Lo llaman los ganchos pre* de npm de la raíz y de `server/` y `scripts/apk.mjs`. Nunca falla la build.
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const shared = join(root, 'shared');
const ARTIFACT = /^(.*)\.(js|js\.map|d\.ts|d\.ts\.map)$/;

const removed = [];
for (const entry of readdirSync(shared, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const match = ARTIFACT.exec(entry.name);
  if (!match) continue;
  const dir = entry.parentPath;
  if (!existsSync(join(dir, `${match[1]}.ts`))) continue;
  rmSync(join(dir, entry.name));
  removed.push(relative(root, join(dir, entry.name)));
}

const staleBuildInfo = join(root, 'server', 'tsconfig.build.tsbuildinfo');
if (existsSync(staleBuildInfo)) {
  rmSync(staleBuildInfo);
  removed.push(relative(root, staleBuildInfo));
}

if (removed.length > 0) {
  console.log(`clean-shared-artifacts: borrados ${removed.length} restos de compilación (F0-13):`);
  for (const file of removed) console.log(`  - ${file.replaceAll('\\', '/')}`);
}
