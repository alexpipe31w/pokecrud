# Bitácora

> Solo se **añade al final**. Nunca se borra ni se edita lo de otro. Una entrada por sesión (o por
> trozo cerrado si la sesión fue larga). Copia la plantilla:

```
## AAAA-MM-DD HH:MM · @nombre · <ID tarea> · rama `feature/...`
**Qué se hizo:** …
**Archivos clave:** `ruta` (qué), …
**Cómo se probó (salida real):**
    npm test → 42 passed …
**Quedó a medias / roto:** … (o "nada")
**Decisiones nuevas:** D-0XX … (o "ninguna")
**El siguiente debe empezar por:** <instrucción concreta, p. ej. "abrir src/app/game/map-scene/x.ts y terminar la función y()">
```

---

## 2026-10-11 · @alex (Claude) · PLAN-MAESTRO · rama `feature/plan-maestro`

**Qué se hizo:** revisión del repo (solo esqueleto: 5 páginas con `PagePlaceholderComponent`, JSON Server
con 3 recursos, proceso Scrum). Decisión de no empezar de cero (D-001). Plan maestro completo:
`VISION.md`, `ARQUITECTURA.md`, `DISENO.md`, `ROADMAP.md` (F0–F8), `DECISIONES.md` (D-001…D-011),
`ESTADO.md`, esta bitácora. `CLAUDE.md` con las reglas de relevo. Comandos `/inicio` y `/cierre`.
Hook `SessionStart` que inyecta `ESTADO.md`. Skills esenciales copiadas a `.claude/skills/`.
**Archivos clave:** `CLAUDE.md`, `AGENTS.md`, `docs/plan/*`, `.claude/commands/*`, `.claude/hooks/session-start.js`,
`.claude/settings.json`, `.claude/skills/*`, `.gitignore`.
**Cómo se probó (salida real):** comprobado contra PokéAPI en vivo: `pokemon-species` count = 1025;
#25 con `cries.latest`, `showdown` y `home`; #1025 con grito y sin `showdown`; `capture_rate` #25 = 190.
Android SDK y Android Studio (con `jbr`) presentes en el PC de Alex; Java del sistema es 1.8 (no sirve
para Capacitor 8 → usar el `jbr`). Hook de arranque ejecutado a mano (ver salida en el PR).
No se tocó código de la app.
**Quedó a medias / roto:** nada.
**Decisiones nuevas:** D-001 a D-011.
**El siguiente debe empezar por:** `/inicio` → coger F0-01 y escribir `docs/plan/fases/F0-fundaciones.md`
con la skill `writing-plans`.

## 2026-10-11 · @alex (Claude) · PLAN-MAESTRO (corrección) · rama `feature/plan-maestro`

**Qué se hizo:** al mezclar el PR #5 apareció en `develop` la entrega **IS-11 de Samuel (08-10)**: Pokédex/inventario
con CRUD sobre `/pokemon` (151, con `price`/`stock`), agregar desde PokéAPI, detalle, editar, búsqueda, scroll infinito
y tests. El plan se había escrito sobre un `develop` local sin actualizar y decía "solo placeholders". Corregidos
D-001, ESTADO, ARQUITECTURA §9 y ROADMAP F0-08/F3-06 para conservar y reutilizar IS-11. Conflicto del README resuelto
(se mantienen el aviso del plan y la descripción nueva de Samuel). Además: Google Maps y Supabase configurados
(ver ESTADO) y reglas de secretos en `docs/plan/SECRETOS.md` + plantillas `*.example`.
**Archivos clave:** `docs/plan/{DECISIONES,ESTADO,ARQUITECTURA,ROADMAP,SECRETOS}.md`, `README.md`, `CLAUDE.md`,
`server/.env.example`, `src/environments/environment.local.example.ts`.
**Cómo se probó (salida real):** mapa de Neiva cargado con la clave en `localhost:8100` (tilt 67.5, VECTOR, 0 errores);
conexión a Supabase `OK PostgreSQL 17.11`. `npm run lint` **no corre en el PC de Alex**: Node 24.14 < 24.15 que pide
Angular CLI 22 (este cambio solo toca docs y plantillas).
**Quedó a medias / roto:** Alex tiene que actualizar Node a ≥ 24.15.
**Decisiones nuevas:** D-001 corregida.
**El siguiente debe empezar por:** `git pull` en `develop` (¡siempre!) → `/inicio` → F0-01.

## 2026-10-11 · @alex (Claude) · F0-01 · rama `feature/F0-01-plan-fundaciones`

**Qué se hizo:** plan detallado de F0 en `docs/plan/fases/F0-fundaciones.md` (F0-02…F0-09 con archivos, código,
tests y comandos). Versiones comprobadas con `npm view` y con un `nest new` real de prueba (borrado). Documentación
de Prisma 7 consultada (context7). Además, a pedido de Alex: protocolo de **guardado continuo** (REGLA 2b en
CLAUDE.md, comando `/guardar`, hook `Stop` `checkpoint-guard.js`, `/inicio` sabe retomar la rama de otro).
**Archivos clave:** `docs/plan/fases/F0-fundaciones.md`, `CLAUDE.md`, `.claude/commands/guardar.md`,
`.claude/hooks/checkpoint-guard.js`, `.claude/settings.json`, `DECISIONES.md` (D-012, D-013).
**Cómo se probó (salida real):** con Node 24.21: `npm run lint` → "All files pass linting"; `ng test` →
"Test Files 11 passed (11) · Tests 29 passed (29)". Hook probado a mano: commit reciente → no bloquea;
`stop_hook_active` → no bloquea; umbral superado → `{"decision":"block", …}`.
**Quedó a medias / roto:** nada. Pendiente de decidir en F1: cómo importa `server/` el código de `shared/`.
**Decisiones nuevas:** D-012, D-013.
**El siguiente debe empezar por:** `/inicio F0-02 <nombre>` (o F0-03 / F0-06 en paralelo) y seguir el plan de fase.

## 2026-10-11 14:10 · @samuel (Claude) · F0-02 · rama `feature/F0-02-dataset`

**Qué se hizo:** relevo de Alex. Configurados `server/.env` y `environment.local.ts` (OK, ignorados por Git;
conexión a Supabase OK). F0-02 completa siguiendo el plan de fase pasos 1-10: tipos del dataset, cliente PokéAPI con
caché/timeout/reintentos, `scripts/build-dataset.mjs`, test y dataset generado. Dos ajustes mínimos al código del plan:
`clean()` quita el guion suave (U+00AD) junto con el salto de línea (si no, partía palabras) y `types` se ordena sobre
una copia. Como F0-03 no está mezclada, se crearon `vitest.shared.config.ts` y el script `test:shared` idénticos al plan.
**Archivos clave:** `shared/data/dataset.types.ts`, `shared/data/dataset.spec.ts`, `scripts/build-dataset.mjs`,
`scripts/lib/pokeapi-fetch.mjs`, `src/assets/data/{pokedex,moves,types,meta}.json`, `vitest.shared.config.ts`, `package.json`.
**Cómo se probó (salida real):**
npm run dataset → OK · pokedex 972 KB · moves 209 KB · types 2 KB · vfdb512e56ff6 (1025 especies, 706 movimientos)
npm run test:shared → Test Files 1 passed (1) · Tests 5 passed (5)
npm run lint → All files pass linting.
ng test --watch=false → Test Files 11 passed (11) · Tests 29 passed (29)
npm run build → Application bundle generation complete (www/assets/data con los 4 JSON)
**Tamaño:** pokedex 972 KB (< 3 MB → no hace falta partir por generación).
**Quedó a medias / roto:** nada. Nota de datos: PokéAPI no tiene español para la Gen 9 (#906-1025): nombre, género y
descripción salen en inglés (fallback previsto). 924/1025 descripciones en español; ninguna especie sin learnset.
**Decisiones nuevas:** ninguna.
**El siguiente debe empezar por:** mezclar el PR de F0-02 y luego `/inicio F0-03 <nombre>` (su Paso 1 y el script
`test:shared` ya existen; no duplicarlos) o `/inicio F0-06 <nombre>`.

## 2026-10-11 14:35 · @samuel (Claude) · F0-03 · rama `feature/F0-03-shared-tooling`

**Qué se hizo:** F0-03 completa, pasos 1-12 del plan de fase. Rama sacada de `feature/F0-02-dataset` (PR #8 sin mezclar)
para no chocar en `package.json` ni en los docs. `shared/engine/rng.ts` (mulberry32 + hashString) con TDD (falló primero),
`shared/tsconfig.json`, `@types/node@24`, scripts `test:all`, alias `@shared/*` en la app con spec de integración,
`three@0.186.1` + `@types/three@0.186.0` exactos. Cambio respecto al plan: sin `baseUrl` (obsoleto en TS 6, D-014) y el
`exclude` de specs de `shared/` también en `tsconfig.spec.json` (si no, `ng test` intentaría correr el test del dataset en jsdom).
**Archivos clave:** `shared/engine/rng.ts`, `shared/engine/rng.spec.ts`, `shared/tsconfig.json`, `tsconfig.json`,
`tsconfig.app.json`, `tsconfig.spec.json`, `src/app/core/utils/shared-alias.spec.ts`, `package.json`, `DECISIONES.md`.
**Cómo se probó (salida real):**
npm run test:shared (antes de rng.ts) → FAIL Cannot find module './rng.js'
npm run test:all → app: Test Files 12 passed (12) · Tests 30 passed (30) | shared: Test Files 2 passed (2) · Tests 10 passed (10)
npm run lint → All files pass linting.
npm run build → Application bundle generation complete.
npx tsc -p shared/tsconfig.json → sin errores
**Quedó a medias / roto:** nada.
**Decisiones nuevas:** D-014; D-003 completada con la versión de three.
**El siguiente debe empezar por:** mezclar PR #8 y luego el de F0-03; después `/inicio F0-05 <nombre>` (servicios base,
ya desbloqueada) o F0-04 / F0-06.

## 2026-10-11 14:50 · @samuel (Claude) · F0-04 · rama `feature/F0-04-sistema-diseno`

**Qué se hizo:** F0-04 completa, pasos 1-9. Rama sacada de `feature/F0-03-shared-tooling` (PR #8 y #9 sin mezclar).
Tokens de DISENO §2 + `--surface`, red de `prefers-reduced-motion` y, para no dejar colores sueltos, `--glass-edge`,
`--shadow-sm/lg/accent` y `--track` (con valores de modo oscuro). Fredoka 500/600/700 (`@fontsource` 5.3.0 exacto; el 600
porque `GameButton` lo usa). `pokemon-types.ts` lee `var(--t-*)` y añade `text` por contraste (D-015): con texto blanco
13/18 tipos no llegaban a AA. `GameButton` (plan + borde/sombra en la variante vidrio, que no se veía sobre otro vidrio, y sin
sombra cuando está deshabilitado), `GlassPanel`, `StatBar`, `HpBar` (con `role="meter"`), todos con test primero. Escaparate
`/dev/ui` con demo interactiva (Atacar/Poción/Reiniciar mueven una HpBar).
**Archivos clave:** `src/theme/tokens.scss`, `src/global.scss`, `src/app/shared/ui/*`, `src/app/features/dev-ui/dev-ui.page.ts`,
`src/app/app.routes.ts`, `src/app/core/constants/pokemon-types.ts`, `src/app/shared/components/type-chips/type-chips.component.ts`.
**Cómo se probó (salida real):**
ng test (antes de los componentes) → Could not resolve "./game-button.component" / glass-panel / hp-bar / stat-bar
npm run test:all → app: Test Files 16 passed (16) · Tests 40 passed (40) | shared: Tests 10 passed (10)
npm run lint → All files pass linting.
npm run build → Application bundle generation complete (Initial total 1.13 MB / 213.68 kB transfer)
/dev/ui en 390×844, modo oscuro y claro: sin errores de consola; Atacar ×3 → 45/120 amarilla, ×4 → 20/120 roja.
/tabs/pokedex (IS-11): chips con los colores nuevos, legibles.
Checklist DISENO §4: sin `transition: all`, sin `scale(0)`, sin hex/rgb fuera de tokens.
**Evidencia:** `docs/evidencias/F0-04_01_dev-ui.jpg` (390×844, oscuro). En .jpg y no .png: Chrome headless no baja de
~500 px de ancho, así que la captura es del navegador integrado.
**Quedó a medias / roto:** nada. Háptico y sonido del botón quedan para F0-05 Paso 9 (como dice el plan).
**Decisiones nuevas:** D-015.
**El siguiente debe empezar por:** mezclar #8 → #9 → PR de F0-04; luego `/inicio F0-05 <nombre>` (o F0-06 / F0-09).

## 2026-10-11 16:20 · @samuel (Claude) · F0-05 · rama `feature/F0-05-servicios-base`

**Qué se hizo:** F0-05 completa, pasos 1-9, todo con test primero. Rama sacada de `feature/F0-04-sistema-diseno`.
`idb@8.0.4` y `fake-indexeddb@6.2.5` exactos. Servicios en `src/app/services/game/`: Settings (localStorage), Haptics,
Audio y Dataset. Cambios respecto al plan:

- `DatasetService.load()` comparte la promesa en curso (el criterio 5 pide una sola descarga con dos `load()`
  simultáneos y que ambos esperen) y tras un error se puede reintentar.
- `HapticsService` recibe el plugin por el token `HAPTICS_PLUGIN`: con `vi.mock` el test fallaba según el orden de los
  specs (1 de 4 corridas; causa: caché de módulos compartida con `game-button.spec`). D-016.
- `AudioService` solo pide efectos que estén en `SFX_CATALOG` (token, vacío hasta F2-08): pedir `tap.ogg` inexistente
  dejaba un 404 como **error** en consola.
- `global.scss`: `@use './theme/tokens'` en vez de `@import` (aviso de obsoleto de Sass que venía de F0-04).
  **Archivos clave:** `src/app/services/game/{settings,haptics,audio,dataset}.service.ts` (+ specs), `app.component.ts`,
  `shared/ui/game-button.component.ts`, `features/dev-ui/dev-ui.page.ts`, `src/global.scss`, `DECISIONES.md` (D-016).
  **Cómo se probó (salida real):**
  cada servicio: ng test → "Could not resolve './x.service'" antes de escribirlo
  ng test ×6 seguidas (tras arreglar haptics) → Tests 61 passed (61) las 6
  npm run test:all → app: Test Files 20 passed (20) · Tests 63 passed (63) | shared: Tests 10 passed (10)
  npm run lint → All files pass linting.
  npm run build → Application bundle generation complete (sin WARNING)
  /dev/ui (390×844): "Dataset: ready · 1025 especies", género "Pokémon Ratón" desde el dataset.
  Sin caché: pide meta + pokedex + moves + types. Recarga: solo meta.json (performance entries).
  "Oír a Pikachu": cries/pokemon/latest/25.ogg → 200, decodificado sin error (no puedo oírlo: pendiente de oído humano).
  Consola tras pulsar botones: solo `[warn] [audio] el efecto "tap" aún no existe (llega en F2-08)`, 0 errores.
  **Quedó a medias / roto:** nada. Falta que un humano confirme que el grito se OYE (y el háptico en un Android real, F0-09).
  **Decisiones nuevas:** D-016.
  **El siguiente debe empezar por:** mezclar #8 → #9 → #10 → PR de F0-05; luego `/inicio F0-06 <nombre>` o `/inicio F0-09 <nombre>`.

## 2026-10-11 16:35 · @samuel · F0-05 (confirmación) · rama `feature/F0-05-servicios-base`

**Qué se hizo:** Samuel confirmó **de oído** que en `/dev/ui` se oye el grito de Pikachu al pulsar "Oír a Pikachu"
(Chrome, `localhost:4200`). F0-05 queda verificada por completo salvo el háptico, que se prueba en Android real (F0-09).
**El siguiente debe empezar por:** lo mismo que la entrada anterior.

## 2026-10-11 17:45 · @samuel (Claude) · F0-06 · rama `feature/F0-06-servidor-nestjs`

**Qué se hizo:** F0-06 pasos 1-8 y 10 (el 9, despliegue, necesita a Alex). Rama sacada de `develop` (independiente de
F0-02…F0-05, cuyas entradas de bitácora están en los PR #8-#11). Scaffold Nest 12.0.8 (ESM, Vitest, oxlint) en `server/`,
sin `@nestjs/mau` ni el "Hello World". Dependencias con versión exacta. Cambios respecto al plan:

- `prisma.config.ts` usa `url: env('DIRECT_URL')`: en Prisma 7.10 `directUrl` no existe en la config (D-017).
- Migración `init` generada con `prisma migrate diff --from-empty --to-schema … --script` y aplicada con
  `prisma migrate deploy`: sin base sombra y sin riesgo de que `migrate dev` resetee la base. Antes se comprobó que
  el esquema `public` de Supabase estaba vacío.
- `trust proxy` en producción (si no, en Render todos los jugadores compartirían la IP del proxy en el rate limit).
- `x-request-id` (del cliente o UUID) devuelto en la respuesta; logs `silent` en tests y legibles en desarrollo.
- Test e2e extra del rate limit con una ruta de prueba: un 404 no pasa por el guard, así que con curl no se veía.
- `npm audit`: 4 "high" solo en la CLI `prisma` (`mysql2`, `deepmerge-ts`), riesgo aceptado (D-017).
- `server/README.md` en español con comandos y los pasos exactos de Render para Alex.
  **Archivos clave:** `server/prisma.config.ts`, `server/prisma/schema.prisma`, `server/prisma/migrations/*_init/`,
  `server/src/{main,app.module}.ts`, `server/src/prisma/*`, `server/src/health/*`, `server/test/*.e2e-spec.ts`,
  `server/.env.example`, `server/README.md`, `DECISIONES.md` (D-017).
  **Cómo se probó (salida real):**
  prisma migrate deploy → "All migrations have been successfully applied."
  prisma migrate status → "Database schema is up to date!"
  prisma migrate diff --from-config-datasource --to-schema … --exit-code → "No difference detected." (exit 0)
  npm test (antes del código) → "Cannot find module '../prisma/prisma.service.js'"
  npm test → Tests 4 passed (4) · npm run test:e2e → Test Files 2 passed (2) · Tests 7 passed (7) · lint exit 0 · build exit 0
  node dist/main.js (NODE_ENV=production, PORT=3077): /health/ready → {"status":"ok","db":"ok"} 200; helmet (CSP, HSTS,
  nosniff, X-Frame-Options); CORS: localhost:4200 permitido, https://evil.com sin allow-origin; /no-existe → 404 JSON
  sin stack; logs JSON con req.id; 0 líneas con la contraseña en el log.
  PORT=3001 npm run start:dev → "Nest application successfully started"; /health/ready → 200 {"status":"ok","db":"ok"}
  App de la raíz sin cambios: lint OK, ng test 29/29.
  **Quedó a medias / roto:** solo el despliegue en Render (Paso 9) → F0-06 sigue `[~]`. El JSON Server del curso ocupa el
  puerto 3000: arrancar Nest con `PORT=3001` hasta F0-08. Sin filtro global de excepciones propio (el de Nest no filtra
  el stack; la taxonomía de errores llega con F0-07).
  **Decisiones nuevas:** D-017.
  **El siguiente debe empezar por:** Alex despliega en Render (`server/README.md`) y pasa F0-06 a `[x]`; luego `/inicio F0-07`
  (cuando F0-04 y F0-06 estén en `develop`) o `/inicio F0-09`.

## 2026-10-11 16:40 · @samuel (Claude) · F0-06 (mezcla y despliegue) · rama `feature/F0-06-despliegue-render`

**Qué se hizo:** PR #8 → #9 → #10 → #11 → #12 mezclados por Samuel (merge commit, sin revisión de otro integrante, con
comentario de constancia en cada PR). Antes del #12 se trajo `develop` a su rama y se resolvieron los conflictos de
`docs/plan` (ESTADO, DECISIONES, BITACORA) conservando todas las entradas. Samuel desplegó el servidor en **su propia
cuenta de Render** (Web Service `pokecrud-server`, Free, rama `develop`, Root `server/`, build
`npm ci --include=dev && npm run build`, start `npx prisma migrate deploy && npm run start:prod`, health `/health/ready`,
variables `DATABASE_URL`, `DIRECT_URL`, `NODE_ENV=production`, `NODE_VERSION=24`, `CORS_ORIGINS`). Instrucciones de
`server/README.md` corregidas antes (`--include=dev`, `NODE_VERSION`) tras simular el build de Render en local.
`environment.prod.ts` → `apiUrl: 'https://pokecrud-server.onrender.com'`. F0-06 → `[x]`.
**Cómo se probó (salida real):**
tras mezclar todo: app 63/63 · shared 10/10 · lint OK · build OK · server 4 unitarios + 7 e2e
Render: "Deploy succeeded | Live" (commit 7ab7d73 de develop, 1m23s)
curl https://pokecrud-server.onrender.com/health/ready → {"status":"ok","db":"ok"} [HTTP 200, 1.18 s]
/health/live 200 · HSTS, nosniff, X-Frame-Options, x-request-id · CORS localhost:4200 permitido, evil.com bloqueado
/no-existe → 404 JSON sin stack
**Quedó a medias / roto:** nada. El inventario IS-11 en un build de producción no tendrá `/pokemon` hasta F0-08.
**Decisiones nuevas:** ninguna (el despliegue en cuenta de Samuel queda anotado en ESTADO → Bloqueos).
**El siguiente debe empezar por:** `/inicio F0-07 <nombre>` (auth) o `/inicio F0-09 <nombre>` (APK), desde `develop`.

## 2026-10-11 18:55 · @samuel (Claude) · F0-07 · rama `feature/F0-07-auth`

**Qué se hizo:** F0-07 completa, pasos 1-10, test primero en cada pieza. Leídas `autenticacion.md` y
`api-endurecimiento.md`; lo añadido al plan está en D-018.

- **Servidor (F0-07a):** `server/src/auth/` (controller, service, DTOs, guard JWT global con `@Public()`, límite por
  cuenta), `server/src/config/env.validation.ts`, `ValidationPipe` como `APP_PIPE`, 429 en español. `@nestjs/jwt@12.0.2`,
  `argon2@0.45.1`. `JWT_SECRET` local generado en `server/.env` (no se imprimió).
- **App (F0-07b):** `src/app/core/auth/` (token-store, auth.service, auth.interceptor, auth.guard), `features/auth/`
  (login, registro, `AuthForm` común), `src/theme/forms.scss` global, tokens `--danger-ink`/`--field-*`, `GameButton`
  con `type` y `loading`, `environment.serverUrl`, `AppComponent` hace `restore()` al arrancar, panel de sesión y botón
  "Comprobar sesión" en `/dev/ui`. `@aparajita/capacitor-secure-storage@8.0.1`.
  **Cómo se probó (salida real):**
  server: npm test → Tests 11 passed (11) · npm run test:e2e ×3 → Tests 18 passed (18) · lint 0 · build 0
  tras los e2e: Player con @pokecrud.test = 0, RefreshToken = 0
  app: npm run test:all → app 92/92 (25 archivos) · shared 10/10 · lint OK · build sin avisos · prettier OK
  navegador 390×844 (Nest local :3001 + app :4200), oscuro y claro:
  /dev/ui sin sesión → /login?redirect=%2Fdev%2Fui · formulario vacío → errores bajo cada campo
  registro con Enter → /dev/ui con "entrenador_demo · nivel 1 · 0 XP"; refresh en sessionStorage, 0 en localStorage
  recargar → sigue con sesión (refresh + /auth/me)
  access estropeado a mano + "Comprobar sesión" → /auth/me 401 → /auth/refresh 200 → /auth/me 200, "Sesión válida"
  cerrar sesión → /login, sessionStorage vacío, /dev/ui vuelve a pedir login
  contraseña mala → "Correo o contraseña incorrectos" · contraseña buena → vuelve a /dev/ui
  logs del servidor: 0 contraseñas, 0 correos, 0 tokens; authorization "[Redacted]"; eventos auth.* con req.id
  cuenta de prueba borrada al final (Player = 0, RefreshToken = 0)
  **Evidencias:** `docs/evidencias/F0-07_01_login.jpg`, `_02_registro.jpg`, `_03_sesion-tras-recargar.jpg`, `_04_login-error.jpg`.
  **Quedó a medias / roto:** nada en código. Pendiente: `JWT_SECRET` en Render **antes** de mezclar (si no, el redeploy no
  arranca). Keystore nativo sin probar hasta tener el APK (F0-09). Deuda anotada en D-018.
  **Decisiones nuevas:** D-018.
  **El siguiente debe empezar por:** poner `JWT_SECRET` en Render, mezclar el PR de F0-07 y comprobar
  `https://pokecrud-server.onrender.com/health/ready`; luego `/inicio F0-08` o `/inicio F0-09`.

## 2026-10-11 18:30 · @kenneth (Claude) · F0-08 · rama `feature/F0-08-crud-nest`

**Qué se hizo:** F0-08 pasos 1-8 (plan `fases/F0-fundaciones.md`), tests e2e escritos antes del código.

- Configurado `server/.env` (OK, con `JWT_SECRET` propio) y `environment.local.ts` (sin probar: aún no hay mapa).
- **Base:** modelos `InventoryPokemon`, `Team`, `Favorite`, `CustomPokemon` (FK a `Player` con cascada) y migración
  `crud_curso` generada con `migrate diff` + CHECKs (`stock_nonneg`, `price_nonneg`, `rating_range`, `max_six`),
  **aplicada en Supabase** con `migrate deploy`. Semilla `npm run db:seed` (tsx), idempotente y no destructiva; **cargada**.
- **Servidor:** módulos `inventory` (`/pokemon`), `teams`, `favorites`, `custom-pokemon` + `common/` (consulta tipo JSON
  Server, paginación, errores Prisma, límite de escritura 30/min). `X-Total-Count` expuesta por CORS.
- **App:** `apiUrl` unificado en `serverUrl` (dev :3000), `authGuard` en agregar/editar, specs adaptados.
- **Postman:** colección reescrita (login previo, Bearer de colección, ids encadenados, 79 `pm.test`, id 99150 para no
  tocar los 151). JSON Server archivado en `backend/legacy/`, sin `npm run api`/`api:reset` ni `json-server`. READMEs.
- Fallo propio corregido a tiempo: la 1.ª semilla metía los favoritos con `id` explícito y la secuencia quedaba en 1
  (el siguiente alta habría chocado); se borraron esos 3, se re-sembró sin ids y se comprobó la secuencia.
- e2e intermitente (registro 500): causa medida = `EMAXCONNSESSION`, el session pooler admite 15 clientes en total →
  e2e en serie (`fileParallelism: false`) y tarea nueva F0-10 para el riesgo en producción.

**Archivos clave:** `server/prisma/schema.prisma`, `server/prisma/migrations/20261011230000_crud_curso/`,
`server/prisma/seed.ts`, `server/src/{common,inventory,teams,favorites,custom-pokemon}/`, `server/test/crud.e2e-spec.ts`,
`server/vitest.config.e2e.ts`, `src/environments/*`, `src/app/app.routes.ts`, `src/app/services/pokemon.service.ts`,
`backend/postman/PokeCRUD.postman_collection.json`, `backend/legacy/`.
**Cómo se probó (salida real):**

    server: npm test → Tests 11 passed (11) · npm run test:e2e ×3 → Tests 43 passed (43) (18 auth/health + 25 CRUD)
            lint → solo el aviso previo de auth.e2e-spec.ts:198 · build OK
    mutación: quitar playerId del where de teams.get → "expected 404, got 200" (el test protege la regla)
    db:seed ×2 → "pokemon: 0 creados, 151 ya existían · demo: 2 equipos, 3 favoritos, 1 personalizados" (~5 s)
    app: npm run test:all → 92/92 + shared 10/10 · lint OK · build OK
    newman 6.2.1 ×4 → requests 44 / 0 failed · assertions 79 / 0 failed (docs/evidencias/F0-08_01_newman-runner.txt)
    navegador (Nest :3000 + app :4200): Pokédex 151 sin sesión · "+" sin sesión → /login?redirect=/pokemon/nuevo ·
      registro → agregar Lucario POST 201 (152) · recargar /editar mantiene sesión · PUT 200 ($19.999) · DELETE 200 (151)
      · 0 errores de consola. Cuenta de prueba @pokecrud.test (la borran los e2e).

**Quedó a medias / roto:** solo la captura del Runner de Postman (criterio de F0-08) → sigue `[~]`, sin PR. Vista móvil
390×844 sin comprobar (Chrome no se dejó redimensionar).
**Decisiones nuevas:** D-019.
**El siguiente debe empezar por:** (Kenneth) `cd server && npm run start:dev`, Postman → importar
`backend/postman/PokeCRUD.postman_collection.json` → Run collection → guardar captura como
`docs/evidencias/F0-08_01_postman-runner-nest.png`, marcar F0-08 `[x]` y abrir el PR a `develop`.

## 2026-10-11 18:50 · @kenneth (Claude) · F0-08 (cierre) · rama `feature/F0-08-crud-nest`

**Qué se hizo:** Runner de Postman ejecutado por Kenneth contra Nest local → F0-08 `[x]` y PR a `develop`. Postman en
modo local crea `postman/` y `.postman/` en la raíz del repo (copia YAML + id del workspace): añadidas al `.gitignore`.
**Archivos clave:** `docs/evidencias/F0-08_01_postman-runner-nest.png`, `.gitignore`.
**Cómo se probó (salida real):**

    Postman Runner: All tests 79 · Passed 79 · Failed 0 · Errors 0 · 15 s (captura)

**Quedó a medias / roto:** nada en F0-08. Pendiente: riesgo del pooler (F0-10).
**Vista móvil (añadido):** Chrome headless con `Emulation.setDeviceMetricsOverride` 390×844 (CDP): Pokédex, detalle
#150 y `/pokemon/nuevo` sin sesión → `/login`; `innerWidth` 390 y `scrollWidth` 390 (sin scroll horizontal) en las
cuatro. Ojo: `--window-size` de Chrome headless no baja de 500 px (las capturas salen recortadas), hay que usar CDP.
Evidencias `docs/evidencias/F0-08_0{2,3,4}_movil-*.png`.
**Decisiones nuevas:** ninguna (D-019 en la entrada anterior).
**El siguiente debe empezar por:** mezclar el PR de F0-08, comprobar `https://pokecrud-server.onrender.com/pokemon?_limit=1`
y luego `/inicio F0-10` (transaction pooler) o `/inicio F0-09` (APK).

## 2026-10-11 19:40 · @kenneth (Claude) · F0-09 · rama `feature/F0-09-apk`

**Qué se hizo:** antes, mezclado el PR #16 (F0-08) con el visto bueno de Kenneth y comprobado en Render
(`/pokemon` 200 con `X-Total-Count: 151`, `/teams` sin token 401). Corregido un error propio: al cerrar F0-08 un `sed`
sin rango marcó los pasos 2-6 de F0-09 en el plan de fase; desmarcados antes de mezclar.
F0-09 pasos 1-7: `npx cap add android` (Capacitor 8.5.2), `.gitignore` de `android/` con `*.jks`/`*.keystore`,
`gradlew.bat` con CRLF, permisos, `scripts/apk.mjs` + `npm run apk`, configuración `device` en `angular.json`,
`cleartext`/`allowMixedContent` solo con `CAP_DEV=1`, icono y splash propios. Instalado Microsoft OpenJDK 21 en el PC de
Kenneth (el `jbr` de su Android Studio es Java 25 y Gradle 8.14.3 falla con "Unsupported class file major version 69").
**Archivos clave:** `android/`, `scripts/apk.mjs`, `capacitor.config.ts`, `angular.json`, `resources/brand.mjs`,
`resources/*.png`, `.gitattributes`, `.gitignore`, `docs/plan/ARQUITECTURA.md` §11.
**Cómo se probó (salida real):**

    npm run apk → "JDK 21 … BUILD SUCCESSFUL · ✔ APK (production): …/app-debug.apk · 8.18 MB" (8 579 103 bytes)
    npm run apk -- device → "APK de desarrollo → http://192.168.20.20:3000 … 6.31 MB"; capacitor.config.json con
      cleartext + allowMixedContent SOLO en ese build (el de producción no los lleva)
    adb: Samsung SM-A366E (A36), Android 16 / SDK 36 → install "Success"
    splash con el icono → Pokédex con 151 desde Render · WebView Chrome 154, origin https://localhost, Capacitor android
    /dev/ui sin sesión → /login?redirect=/dev/ui · registro de Kenneth en el móvil → /dev/ui "kenneth_rb · nivel 1"
    grito y vibración: confirmados por Kenneth en el móvil
    am force-stop + reabrir → sigue con sesión en /dev/ui; 0 tokens en localStorage, sessionStorage vacío (Keystore OK)
    dataset en el móvil: "Dataset: ready · 1025 especies"

**Quedó a medias / roto:** nada en F0-09. Encontrado: en Android 15+ (edge-to-edge) `/dev/ui` se dibuja bajo la barra
de estado → tarea nueva F0-11. Arte de icono/splash provisional.
**Decisiones nuevas:** D-020.
**El siguiente debe empezar por:** mezclar el PR de F0-09; luego `/inicio F0-10` (transaction pooler, riesgo en
producción) o `/inicio F0-11` (zona segura). Para el APK en otro PC: `winget install Microsoft.OpenJDK.21` y `npm run apk`.

## 2026-10-11 20:00 · @kenneth (Claude) · F0-10 · rama `feature/F0-10-transaction-pooler`

**Qué se hizo:** mezclado el PR #17 (F0-09) con el visto bueno de Kenneth. F0-10: medido el transaction pooler,
`DATABASE_URL` → 6543 en `server/.env` de Kenneth (configurado `server/.env` (OK); `DIRECT_URL` sigue en 5432),
`.env.example` y SECRETOS.md actualizados. Al probar los e2e en paralelo apareció un 500 intermitente: log real
`PrismaClientKnownRequestError … refreshToken.create … ForeignKeyConstraintViolation` → cada archivo borraba en su
`afterAll` todos los `@pokecrud.test` y se llevaba los jugadores de los demás. Arreglado con `test/support/cleanup.ts`
(cada archivo borra su prefijo + los de prueba con > 1 h).
**Archivos clave:** `server/test/support/cleanup.ts`, `server/test/{auth,crud}.e2e-spec.ts`, `server/vitest.config.e2e.ts`,
`server/.env.example`, `docs/plan/SECRETOS.md`.
**Cómo se probó (salida real):**

    pg Pool por 6543: 20 conexiones → 20 ok / 0 fallos · 40 conexiones → 40 ok / 0 fallos (por 5432: 15 ok / 5 EMAXCONNSESSION)
    e2e en paralelo por 6543, antes del arreglo: 1 fallo intermitente (FK, ver arriba) · después: 8/8 corridas 43/43
    2 servidores locales (:3000, :3001) + Render + e2e en paralelo a la vez, 35 s:
      localhost:3000 ok 1030 / fail 0 · localhost:3001 ok 1026 / fail 0 · Render ok 460 / fail 0 · e2e 43/43
      logs de los dos servidores: 0 EMAXCONN, 0 ERROR
    server: npm test 11/11 · npm run test:e2e (en serie) 43/43 · lint (solo el aviso previo) · build OK
    prisma migrate status (DIRECT_URL, 5432) → "Database schema is up to date!"

**Quedó a medias / roto:** nada en código. Pendiente de humanos: Samuel cambia `DATABASE_URL` a 6543 en Render; Alex y
Samuel, el puerto en su `server/.env`. Hasta entonces Render usa 5 de los 15 del session pooler (sin riesgo mientras
los locales vayan por 6543).
**Decisiones nuevas:** D-021.
**El siguiente debe empezar por:** mezclar el PR de F0-10 y avisar a Alex y Samuel del cambio de puerto; luego
`/inicio F0-11` (zona segura en Android 15+, ver `docs/evidencias/F0-09_01_apk-movil-dev-ui.png`).

## 2026-10-11 20:05 · @kenneth (Claude) · F0-11 · rama `feature/F0-11-zona-segura`

**Qué se hizo:** mezclado el PR #18 (F0-10) con el visto bueno de Kenneth. F0-11: medido en el móvil que el WebView
expone la zona segura (`env(safe-area-inset-top)` 36 px, bottom 15 px, `:has()` soportado) y añadida una regla global
en `src/global.scss` para toda pantalla sin `ion-header` (D-022). APK reinstalado con `npm run apk -- production --install`.
**Archivos clave:** `src/global.scss`, `docs/plan/DECISIONES.md` (D-022).
**Cómo se probó (salida real):**

    Samsung A36 (Android 16), WebView por CDP (adb forward):
      /dev/ui   → título a 59 px del borde (zona segura 35 px), antes se cruzaba con la hora
      /login    → --padding-top 35px · scroll sobrante 0 px
      /registro → --padding-top 35px · scroll sobrante 0 px
      /tabs/pokedex (con ion-header) → --padding-top 0px, sin cambios
    app: npm run test:all → 92/92 + shared 10/10 · lint OK · build OK

Evidencias `docs/evidencias/F0-11_0{1,2,3}_zona-segura-*.png`. Kenneth cerró su sesión en el móvil para la prueba de
login/registro (tiene que volver a entrar).
**Quedó a medias / roto:** nada. **F0 completa.**
**Decisiones nuevas:** D-022.
**El siguiente debe empezar por:** mezclar el PR de F0-11; luego `/inicio F1-01` (spike Google Maps 3D + three.js en
Android real) — antes, leer ARQUITECTURA §4 y D-022 (el mapa anula la zona segura en su `ion-content`).

## 2026-10-11 20:45 · @alex (Claude) · F0-12 · rama `feature/F0-12-admin-inventario`

**Qué se hizo:** revisión de los PR #16-#20 de Kenneth (código sólido; server 11/11, app 92/92, shared 10/10, lint y
build OK; Render sirve `/pokemon` con 151). Hallazgo: cualquier cuenta podía escribir en el inventario compartido y el
registro es abierto → nueva tarea F0-12. Rol `PlayerRole` (`PLAYER`|`ADMIN`) en `Player`; `AdminGuard` en las 4
escrituras de `/pokemon` (rol leído de la BD, no del token); script `npm run admin -- list|grant|revoke <correo>`;
`role` sale en `player` de `/auth/*`; la app oculta FAB, deslizar y botones del detalle a quien no es ADMIN y
`adminGuard` protege `/pokemon/nuevo` y `/pokemon/:id/editar`. Postman: login ADMIN con variables del entorno local,
escrituras del inventario con `{{adminToken}}` y caso nuevo "jugador normal → 403". De paso, en el PC de Alex:
`DATABASE_URL` → 6543, `JWT_SECRET` local generado (faltaba) y JDK 21 instalado (`openjdk 21.0.12.1`).
**Archivos clave:** `server/src/auth/admin.guard.ts`, `server/prisma/admin.ts`,
`server/prisma/migrations/20261012010000_player_role/`, `server/src/inventory/inventory.controller.ts`,
`server/test/crud.e2e-spec.ts`, `src/app/core/auth/auth.guard.ts`, `backend/postman/PokeCRUD.postman_collection.json`.
**Cómo se probó (salida real):**

    prisma migrate deploy → Applying migration `20261012010000_player_role` · All migrations have been successfully applied.
    prisma migrate diff (BD de Supabase → schema.prisma) → -- This is an empty migration.
    server: npm test → 11/11 · npm run test:e2e (DATABASE_URL por 6543) → Test Files 4 passed · Tests 45 passed
      (nuevos: jugador normal → 403 en POST/PUT/PATCH/DELETE sin cambiar nada; quitar el rol → 403 con el MISMO token)
    newman (servidor local + cuenta ADMIN temporal @pokecrud.test) → requests 46 · assertions 82 · failed 0
      (docs/evidencias/F0-12_01_newman-runner.txt; la cuenta temporal se borró después)
    app: ng test → 94/94 · lint OK · build OK
    BD tras las pruebas: inventario 151, 0 Pokémon de prueba, 0 ADMIN

**Quedó a medias / roto:** nada en código. Pendiente de humanos: revisar/mezclar el PR; Samuel → Manual Deploy en
Render (y su 6543); Alex → `npm run admin -- grant <correo>` con su cuenta. No se probó en el móvil (solo cambia qué
botones se ven; la lógica está cubierta por tests).
**Decisiones nuevas:** D-023.
**El siguiente debe empezar por:** revisar el PR de F0-12 (`gh pr diff`), mezclarlo y pedir a Samuel el Manual Deploy;
después `/inicio F1-01`.

## 2026-10-11 21:00 · @alex (Claude) · F1-01 (a medias, pasa a Kenneth) · rama `feature/F1-01-spike-mapa-3d`

**Qué se hizo:** página `/dev/mapa` (solo desarrollo, exige sesión): Google Maps vectorial (Map ID, tilt 67,5°, zoom 19,
Parque Santander de Neiva) + la escena del juego (avatar, círculo de alcance 40 m, Pokémon como sprites con sombra y
hierba animada en InstancedMesh). Plan A = `ThreeJSOverlayView` (`@googlemaps/three` 4.0.13); plan B =
`AdvancedMarkerElement` con `<img>` y animación CSS; modo "Solo mapa" como línea base. Medidor de fps (`FpsMeter`, con
tests) y botón "Medir batería": 7 configuraciones × (2 s calentando + 10 s midiendo con la cámara girando 360°).
Cargador de Maps con timeout de 15 s y aviso si falta la clave (`src/app/core/maps/google-maps.loader.ts`).
`environment.local.ts` ahora se importa: `scripts/ensure-local-env.mjs` lo crea desde la plantilla si falta
(postinstall/prestart/prebuild/apk). `@googlemaps/three` no expone sus tipos con `moduleResolution: bundler` → copia
mínima en `src/types/googlemaps-three.d.ts`.
**Archivos clave:** `src/app/features/dev-map/`, `src/app/core/maps/google-maps.loader.ts`, `scripts/ensure-local-env.mjs`.
**Cómo se probó (salida real):**

    app: ng test → 26 archivos, 96/96 · shared 10/10 · lint OK · build OK
    npm run apk → JDK 21: C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot · BUILD SUCCESSFUL · APK 8.29 MB
    PC (Chrome, RTX 5070, 390×844, renderingType VECTOR) — batería:
      Solo mapa 0 → 177 fps · p95 5,9 ms · tirones 0,1 %
      three.js 10/30/60 → 169,9 / 177 / 179,1 fps · p95 7,2 / 6 / 5,7 ms · 0 %
      Markers 10/30/60 → 179,7 / 179,2 / 179,5 fps · p95 5,7 ms · 0 %
    (en PC no discrimina: todo va al tope de la pantalla de 180 Hz)

Evidencias `docs/evidencias/F1-01_0{1,2}_*.png`.
**Quedó a medias / roto:** falta la medición en Android real (criterio de la tarea) y la decisión A/B. Alex no tiene
Android → **la termina Kenneth**.
**El siguiente debe empezar por (Kenneth):** `git fetch && git checkout feature/F1-01-spike-mapa-3d && npm install`
(necesitas tu `environment.local.ts` con la clave de Maps), móvil por USB, `npm run apk -- --install`. En la app:
entrar con una cuenta de Render y abrir `/dev/mapa` (desde chrome://inspect → consola: `location.href = '/dev/mapa'`).
Pulsar "Medir batería" (~2 min, sin tocar el móvil), copiar de la consola la línea `[F1-01] batería {...}` a esta
bitácora y escribir la decisión en DECISIONES: si three.js con 30 Pokémon da ≥ 50 fps de media y < 5 % de tirones →
plan A; si no, plan B (o A con menos objetos). Luego `/cierre` y PR.

## 2026-10-11 21:15 · @alex (Claude) · F1-06 · rama `feature/F1-06-spawns`

**Qué se hizo:** motor de spawns puro `shared/engine/spawns.ts` (`cellIdFor`, `cellsWithin`, `slotFor`, `isNightAt`,
`buildSpawnTable`, `spawnsForCell`, `parseSpawnId`) y módulo `server/src/spawns/` (`GET /spawns`, `SpawnsService`,
`WeatherService`). El servidor compila `shared/` por primera vez (D-024: `rootDir ..`, salida `dist/server/src/main.js`,
`shared/package.json` ESM). Semilla HMAC con `SPAWN_SALT`, clima por celda de 0,1° y franja, datos ocultos hasta el
encuentro, 503 si falta la sal (D-025). `SPAWN_SALT` añadida a `.env.example`, SECRETOS y validación (opcional, ≥ 32).
**Archivos clave:** `shared/engine/spawns.ts`, `server/src/spawns/*`, `server/tsconfig.build.json`, `server/package.json`.
**Cómo se probó (salida real):**

    npm run test:shared → 3 archivos, 22/22 (12 nuevos; dataset real: 0 legendarios/míticos en 20.000 celdas, >400 especies)
    server: npm test → 21/21 (10 nuevos) · npm run test:e2e → Test Files 5 passed · Tests 46 passed
      (spawns: 401 sin sesión; 400 sin lng / lat 95 / lat abc / parámetro extra; dos jugadores → respuesta idéntica)
    lint server: solo el aviso previo de auth.e2e-spec · app: ng build OK
    npm run start:prod (dist/server/src/main) + Open-Meteo real, Neiva 2.9273,-75.2819:
      200 1.02 s · slot 2986283 · expira 2026-10-12T02:00:00Z · 10 Pokémon
      200 0.21 s · misma respuesta (clima en caché) · sin "weather.fallback" en el log

**Quedó a medias / roto:** nada en código. Pendiente de humanos: `SPAWN_SALT` en el `server/.env` de cada uno y en
Render (Samuel) antes del deploy. Los niveles (1-25) se ligarán al nivel del jugador en F3.
**Decisiones nuevas:** D-024, D-025.
**El siguiente debe empezar por:** revisar el PR de F1-06; luego `/inicio F1-08` (o F1-02 si Kenneth ya cerró F1-01).

## 2026-10-11 21:35 · @alex (Claude) · F1-08 · rama `feature/F1-08-inventario-xp` (sale de F1-06)

**Qué se hizo:** `shared/engine/items.ts` (objetos y kit inicial) y `shared/engine/progression.ts` (curva 500·(L−1)·L,
`levelForXp`, `levelProgress`). Servidor: modelo `Inventory` (enum `InventoryItem`, PK (playerId, item), CHECK 0-999)
con migración que da el kit a los jugadores existentes; kit al registrarse en la misma escritura que el `Player`;
`GET /bag` (garantiza el kit con ON CONFLICT DO NOTHING); `ProgressionService.addXp` atómico (sin endpoint). App:
`BagService` (se vacía al cambiar de jugador), placa `app-player-hud` (avatar, nivel, barra de XP, bolas) y mochila
en `/dev/ui`. La rama se mezcló con `feature/F1-06-spawns` porque necesita que el servidor compile `shared/` (D-024).
**Archivos clave:** `shared/engine/{items,progression}.ts`, `server/src/bag/`, `server/src/progression/`,
`server/prisma/migrations/20261012020000_inventory/`, `src/app/shared/ui/player-hud.component.ts`,
`src/app/services/game/bag.service.ts`.
**Cómo se probó (salida real):**

    prisma migrate diff (schema de develop → este) = mismo SQL que la migración (+ CHECK y kit a mano)
    prisma migrate deploy → 20261012020000_inventory aplicada · kit: 3 jugadores × 4 filas (POKE 90, GREAT 15, ULTRA 0, RAZZ 15)
    shared: 27/27 (5 nuevos) · app: ng test 97/97 (5 nuevos), lint OK, build OK (sin avisos de presupuesto)
    server: npm test 21/21 · test:e2e → Test Files 6 passed · Tests 53 passed (bag: 7 nuevos)
      kit exacto al registrarse; GET /bag dos veces no regala nada; no pisa cantidades; jugador sin filas → kit;
      la BD rechaza qty −1 y 1000; 10 addXp(1000) simultáneos → 10.000 XP y nivel 5 en /auth/me;
      addXp dentro de una transacción que falla → 0 XP; addXp(0 | −5 | 1,5 | 100.001) → 400
    navegador (390×844): /dev/ui con cuenta de prueba (1.500 XP) → placa "nivel 2 · 500 / 2000 XP · 35 bolas" y
      mochila 30/5/0/5. Arreglado el contraste de la inicial del avatar. Evidencias F1-08_0{1,2}_*.png

**Quedó a medias / roto:** nada. La placa se coloca en el mapa en F1-04.
**Decisiones nuevas:** D-026.
**El siguiente debe empezar por:** mezclar en orden #21, #22 y el PR de F1-08 (Samuel: `SPAWN_SALT` en Render +
Manual Deploy). Luego F1-02 en cuanto Kenneth cierre F1-01.

## 2026-10-11 21:50 · @alex (Claude) · F2-03 · rama `feature/F2-03-formula-captura` (sale de F1-08)

**Qué se hizo:** `shared/engine/capture.ts`: `captureValue`, `shakeThreshold`, `captureChance`, `fleeChance` y
`resolveThrow` (RNG inyectado, siempre 5 tiradas). Tipos `BallId`/`BerryId` sacados de `items.ts`. En ESTADO, nueva
sección **"PENDIENTES DE HUMANOS — lista única"** con responsable y casilla: quien termine algo lo marca, y cada tarea
añade ahí lo suyo.
**Archivos clave:** `shared/engine/capture.ts`, `shared/engine/capture.spec.ts`.
**Cómo se probó (salida real):**

    npm run test:shared → 39/39 (12 nuevos de captura)
      captureRate 45, vida llena, Poké: a = 15, b = 38527, p = 11,95 %
      legendario (3): 1,57 % sin ayudas · 8,94 % con Ultra + Frambu + Excelente + curva (a = 10,2, b = 35839)
      captureRate 255 + Super + Excelente + curva → 100 %
      40.000 lanzamientos × 3 casos: frecuencia observada = captureChance (2 decimales); huida observada = fleeChance
      entradas imposibles → RangeError (7 casos)
    server: npm run build → dist/shared/engine/capture.js · app: ng build OK

(Un primer test fallaba porque yo había calculado mal a mano el 21 % del legendario; la fórmula daba 8,9 % y era
la correcta: se corrigió el test, no el código.)
**Quedó a medias / roto:** nada.
**Decisiones nuevas:** D-027.
**El siguiente debe empezar por:** mezclar en orden #21 → #22 → #23 → este. Siguiente tarea libre sin móvil:
**F2-06** (captura autoritativa en servidor: sus deps F2-03, F1-06 y F1-08 ya están hechas), F4-01 o F2-08.

## 2026-10-11 22:20 · @alex (Claude) · F2-06 · rama `feature/F2-06-captura-servidor` (sale de F2-03)

**Qué se hizo:** módulo `server/src/encounters/` (`GET /encounters/:id`, `POST /encounters/:id/throw`), `LocationService`
(`GET /spawns` guarda la última ubicación), `SpawnsService` ampliado (`spawnById`, `speciesDetails`, `heightScale`).
Modelos `CaughtPokemon`, `EncounterResult` (UNIQUE jugador+encuentro), `Throw` (UNIQUE jugador+clientThrowId) y columnas
de ubicación en `Player`, con CHECKs. Todo el lanzamiento en una transacción (D-028). `THROW_RESOLVER` inyectable.
**Archivos clave:** `server/src/encounters/*`, `server/src/location/*`, `server/prisma/migrations/20261012030000_capture/`,
`server/test/encounters.e2e-spec.ts`.
**Cómo se probó (salida real):**

    prisma migrate deploy → Applying migration `20261012030000_capture` · applied
    prisma migrate diff BD → schema: solo la columna `role` de F0-12 (esa rama no está mezclada en esta) ✔
    server: npm test → 23/23 · npm run test:e2e → Test Files 7 passed · Tests 64 passed (encuentros: 11 nuevos)
      401 / 404 / 410; lejos (1,1 km) → 403 sin gastar; sin ubicación → 403; detalle sin IVs
      captura (Super Ball, Genial, curva): 200, 1 bola menos, CaughtPokemon con datos del servidor, XP 160 en /auth/me,
        2.º lanzamiento → 409 sin gastar
      mismo clientThrowId en serie y 5 a la vez → misma respuesta, 2 lanzamientos guardados, 2 bolas en total
      3 lanzamientos distintos a la vez que capturan → [200, 409, 409], 1 capturado, 1 bola
      fallo con baya → gasta bola y baya, encuentro abierto; huida → cierra (409 después)
      Ultra Ball con 0 en la bolsa → 409 y nada cambia; 12 "excellent" previos → cuenta como "great"
      validación (MASTER_BALL, baya como bola, campo extra, UUID malo, calidad inventada) → 400
      fórmula real sin forzar → se resuelve y se guarda
    lint server: solo el aviso previo de auth.e2e-spec

Primer intento: el test de 5 reintentos simultáneos superaba los 5 s (cada transacción ~1 s contra São Paulo y se
esperan por el bloqueo de la fila de la mochila, que es justo lo que las hace seguras). Se subieron el tope de la
transacción (maxWait 5 s, timeout 10 s) y el del test.
**Quedó a medias / roto:** nada en servidor. La app aún no lo usa (F2-04/05/07). Pokédex y caramelos → F3.
**Decisiones nuevas:** D-028.
**El siguiente debe empezar por:** mezclar en orden #21 → #22 → #23 → #24 → este. Siguiente libre sin móvil: F4-01
(plan del motor de combate) o F2-08 (audio).

## 2026-10-11 22:40 · @alex (Claude) · F4-01 · rama `feature/F4-01-plan-combate` (sale de F2-06)

**Qué se hizo:** plan de la fase 4 en `docs/plan/fases/F4-combate.md`: contrato del motor (estado, acciones, eventos),
reglas Gen V+ (stats, orden, daño con `floor` por pasos como Showdown, crítico por etapas, precisión, estados con
inmunidades por tipo, efectos), alcance medido y pasos con casillas para F4-02…F4-06.
**Cómo se midió el alcance (salida real, `moves.json`):**

    total 706 | con poder 442 | de daño sin poder fijo 30 (guillotine, sonic-boom, seismic-toss…)
    estado 234 | soportables (stats/estado/curación) 108 | sin efecto soportado 126 (whirlwind, reflect, metronome…)
    multigolpe 24 | drenan 10 | retroceso 9 | prioridad≠0 49 | critRate>0 23 → v1 = 550/706 (78 %)

**Hallazgo:** `moves.json` no trae `target` (a quién afectan los cambios de stats) ni `flinchChance`: sin `target`,
"Puño Incremento" subiría el ataque del rival. Es el paso 1 de F4-02 (regenerar el dataset).
**Quedó a medias / roto:** nada (es un documento).
**El siguiente debe empezar por:** `/inicio F4-02` y seguir sus casillas en el plan.

## 2026-10-11 23:00 · @alex (Claude) · F4-02 · rama `feature/F4-02-tipos-stats` (sale de F4-01)

**Qué se hizo:** `shared/engine/battle/type-chart.ts` (matriz desde `types.json`), `stats.ts` (naturalezas, `calcStats`,
etapas), `moves.ts` (`statChangeTarget`, `statChangeChance`). `build-dataset.mjs` añade `target`, `flinchChance` y
`metaCategory` a cada movimiento; dataset regenerado (descarga completa de PokéAPI, ~10 min; `.cache/` queda en el PC
de Alex, gitignored).
**Cómo se probó (salida real):**

    npm run dataset → OK · pokedex 972 KB · moves 256 KB · types 2 KB · v0c1997bdfa5a
      moves.json: 706 → 706, ningún otro campo cambió (comparado contra el anterior); pokedex.json y types.json idénticos
    npm run test:shared → 71/71 (32 nuevos)
      tipos: 324/324 casillas = tabla oficial escrita a mano; 8 inmunidades; Hielo→Dragonite ×4, Tierra→Zapdos ×0
      stats: Garchomp nv 78 Firme con IV/EV de Bulbapedia → 289/278/193/135/171/171 ✔
      a quién afectan (19 movimientos reales): Danza Espada/Aullido → usuario, Gruñido/Encanto → rival,
        Puño Incremento/A Bocajarro/Sofoco → usuario, Psíquico/Triturar → rival, Lumina Crash → rival
    app: ng test 97/97, build OK · server: build OK, npm test 23/23

**Hallazgos:** (1) el plan suponía que `target` bastaba; no, en los de daño hace falta `metaCategory` (D-029).
(2) Dos expectativas del test de stats estaban mal calculadas a mano (ataque 135 → 150, velocidad 133 → 134); la
fórmula ya cuadraba con Bulbapedia. Se corrigió el test.
**Quedó a medias / roto:** nada.
**Decisiones nuevas:** D-029.
**El siguiente debe empezar por:** F4-03 (daño, precisión, crítico, orden), paso 1 del plan: `isSupportedMove` y
`defaultMoves`, y que `movesAtLevel` del servidor use ese filtro.

## 2026-10-11 23:20 · @alex (Claude) · F4-03 · rama `feature/F4-03-dano` (sale de F4-02)

**Qué se hizo:** `shared/engine/battle/damage.ts` (`damageRolls`, `rollDamage`, `critChance`, `hitChance`,
`rollAccuracy`, `effectiveSpeed`, `firstToAct`), `moves.ts` (`isSupportedMove`, `defaultMoves`). Servidor:
`SpawnsService.defaultMoves` (carga `moves.json`) sustituye a `movesAtLevel` en la captura. Oráculo de referencia en
`scripts/oracles/showdown-damage.cjs`.
**Cómo se probó (salida real):**

    @smogon/calc 0.12.0 (2026-09-18) instalado aparte en %TEMP% → 10 casos, p. ej.
      Garchomp Alegre Terremoto → Heatran: 268,276,276,280,288,288,292,292,300,300,304,304,312,312,316,324
      Lucario −2 atk crítico A Bocajarro → Blissey +2 def: 878 … 1034
    npm run test:shared → 99/99 (28 nuevos): las 16 tiradas de los 10 casos = Showdown, y sus stats = las nuestras
      soportados = 548 (442 de daño + estado aplicable); ninguna especie sin movimientos a nivel 1/25/50
    server: npm test 22/22 · test:e2e 64/64 (la captura ya usa defaultMoves) · lint: solo el aviso previo
    app: lint OK, build OK

(Todos los casos de Showdown pasaron a la primera.) No había `CaughtPokemon` de jugadores reales con movimientos no
soportados (solo cuentas de prueba, ya borradas).
**Quedó a medias / roto:** nada.
**Decisiones nuevas:** D-030.
**El siguiente debe empezar por:** F4-04 (reducer `battle-engine.ts` con estados y cambios de stats), según el plan.

## 2026-10-11 23:45 · @alex (Claude) · F4-04 · rama `feature/F4-04-reducer` (sale de F4-03)

**Qué se hizo:** `shared/engine/battle/types.ts` (contrato: estado, acciones, eventos, `BattleContext`, `BattleError`) y
`battle-engine.ts` (`createBattle`, `resolveTurn`): validación, orden, PP, precisión, daño con multigolpe y crítico por
golpe, drenaje/retroceso, estados con inmunidades, confusión, etapas con tope, retroceso del rival, residuos de fin de
turno, debilitados con cambio forzado, Forcejeo, rendición y victoria.
**Cómo se probó (salida real):**

    vitest battle-engine.spec.ts → 27/27, 1 instantánea escrita
      1.000 combates 3 vs 3 aleatorios (especies, niveles 20-60, IVs, naturalezas, acciones al azar): todos terminan
        en < 500 turnos, sin excepciones, PS y PP siempre en rango (3,3 s)
      parálisis ≈ 25 % sin moverse en 2.000 turnos; Ataque Furia 2-5 golpes ≈ 35/35/15/15 en 4.000; Mordisco solo hace
        retroceder si va primero (0 de 500 cuando es más lento)
      instantánea leída a mano: Fuego Fatuo quema a Blastoise (−9/turno = 1/16), Surf ×2 104, Mordisco quemado a la
        mitad, Rayo Hielo debilita a Charizard, cambio forzado a Pikachu, Rayo ×2 debilita a Blastoise
    npm run test:shared → 126/126 · app lint + build OK · server build + 22/22

Primer intento: 4 tests mal escritos (no el motor): paralizaba a un Jolteon (Eléctrico, inmune); el sueño del turno en
que te duermen sí cuenta; Gigadrenado no cura con la vida llena; el guion de la instantánea usaba un índice que el
Pokémon de reserva no tenía.
**Quedó a medias / roto:** nada. Fuera de la v1 (anotado en el plan): movimientos de daño fijo y efectos especiales.
**Decisiones nuevas:** D-031.
**El siguiente debe empezar por:** F4-06 (IA, solo shared/, sin móvil) o F4-05 (escena; probar en vista móvil).

## 2026-10-12 00:00 · @alex (Claude) · F4-06 · rama `feature/F4-06-ia` (sale de F4-04)

**Qué se hizo:** `shared/engine/battle/ai.ts` (`chooseAction`, `scoreMove`, `expectedDamage`) y
`shared/data/trainers.ts` (Excursionista Roco fácil, Nadadora Marina normal, Entrenadora As Valeria difícil). Exportado
`STAGE_OF` del motor para no duplicar la traducción de stats. El paso "conectar en la escena" pasa a F4-05 (paso 1).
**Cómo se probó (salida real):**

    vitest ai.spec.ts → 10/10
      casos claros (20 semillas, siempre lo mismo): remata con Rayo a Gyarados; Triturar y no Golpe Cuerpo contra
        Gengar; Espora a un Snorlax sano y Placaje si ya está quemado; Pikachu contra Golem cambia a Lapras;
        cambio forzado saca a Lapras contra Golem
      [F4-06] difícil vs fácil: 71.8 % (500 combates espejo, equipos aleatorios nv 40, alternando lados)
      [F4-06] difícil vs azar: 95.7 % · normal vs azar: 91.0 % (300)
      300 combates IA contra IA de todas las dificultades sin una acción imposible
    npm run test:shared → 136/136 · app lint + build · server build + 22/22

Ojo: el 71,8 % pasa el criterio (≥ 70 %) con poco margen; el fácil no es "tonto", solo mete un 40 % de azar. Si se
quiere más diferencia, subir el ruido del fácil o quitarle los cambios de estado.
**Quedó a medias / roto:** nada.
**Decisiones nuevas:** D-032.
**El siguiente debe empezar por:** F4-05 (escena de combate), paso 1 del plan: `/combate/prueba` contra un entrenador.

## 2026-10-12 00:30 · @alex (Claude) · F4-05 · rama `feature/F4-05-escena-combate` (sale de F4-06)

**Qué se hizo:** escena de combate en `src/app/features/battle/`: `battle.controller.ts` (motor + IA + reproducción de
eventos al ritmo de los textos, gritos y vibración), `battle-text.ts` (eventos → español, con tests), `battle.page.ts`
(escenario teñido por tipos, plataformas, sprites `home`, animaciones WAAPI), componentes `battle-info`, `battle-dock`
(menú con tipo/PP/eficacia, cambiar, rendirse con confirmación, final), `battle-sheet` (cambio voluntario y forzado),
`battle-burst` (anillo + partículas del tipo + número de daño), `battle-picker` (elegir rival). Ruta `/combate/prueba`
(con sesión) y botón en `/dev/ui`.
**Cómo se probó (salida real):**

    app: ng test 101/101 (4 nuevos de textos) · lint OK · build OK sin avisos de presupuesto · shared 136/136
    navegador 390×844 (Playwright, cuenta @pokecrud.test borrada después):
      - Nadadora Marina: Impactrueno "▲ Súper eficaz" contra Goldeen → −36/−38, "¡Es superefectivo!", sacudida de la
        escena; combate entero → "¡Has derrotado a Nadadora Marina!" + "¡Victoria!" en 6 turnos, 0 errores en consola
      - Excursionista Roco: Impactrueno "✕ No afecta", Ataque Rápido "▼ Poco eficaz"; Pikachu debilitado → hoja
        "¿Qué Pokémon vas a sacar?" → Bulbasaur con Látigo Cepa "▲ Súper eficaz"
    Evidencias docs/evidencias/F4-05_0{1..6}_*.png (la 01 está en ancho de escritorio).

Ajustes tras mirarlo: horizonte más alto (las plataformas flotaban en el cielo), Pikachu más pequeño (tapaba su panel),
menú visible pero desactivado durante el turno (el panel de abajo quedaba vacío), golpe más visible (anillo, partículas
con contorno, número grande) y la hoja marcaba "En combate" a un debilitado.
**Quedó a medias / roto:** probar en Android real (Kenneth) y SFX de golpe (F2-08). Ambos en PENDIENTES de ESTADO.
**Decisiones nuevas:** D-033.
**El siguiente debe empezar por:** F5 (PvP en tiempo real, servidor con el mismo motor) — primero su plan; o F2-08.

## 2026-10-12 00:45 · @alex (Claude) · cierre de sesión y relevo a Samuel · rama `feature/F4-05-escena-combate`

**Qué se hizo en esta sesión (Alex):** revisión de F0-08…F0-11 de Kenneth; F0-12 (rol admin en `/pokemon`, #21);
F1-01 spike del mapa (rama propia, **lo termina Kenneth** en su Android); F1-06 spawns (#22); F1-08 mochila y XP
(#23); F2-03 fórmula de captura (#24); F2-06 captura en servidor (#25); F4-01 plan del combate (#26); F4-02 tipos y
stats + dataset con `target`/`metaCategory` (#27); F4-03 daño = Showdown (#28); F4-04 motor (#29); F4-06 IA (#30);
F4-05 escena de combate temporal (#31). Decisiones D-023…D-034.
**Nueva decisión del PO (D-034):** el combate definitivo va en **realidad aumentada con la cámara**; la escena 2D de
F4-05 es temporal. Tarea nueva **F4-07** (depende del spike F2-01).
**Error y corrección:** con `git add -A docs` se subieron por accidente a la rama de F4-05 las 6 capturas
`docs/evidencias/HU-02_*.jpg` de Alex (pendientes de su decisión); se sacaron del repo en el commit siguiente y siguen
en su PC. No tienen datos sensibles (Postman contra localhost). Regla: añadir archivos por ruta, nunca `-A` de `docs/`.
**El siguiente (Samuel) debe empezar por:** la sección "👉 RELEVO PARA SAMUEL" de `ESTADO.md` (mezclar #21→#31 en
orden, Render: 6543 + `SPAWN_SALT` + Manual Deploy, su `.env`, y elegir F5-01 / F2-08 / F2-01).

## 2026-10-12 11:30 · @samuel (Claude) · relevo de Alex: revisión y mezcla de #21…#31 · rama `feature/F0-12-admin-inventario`

**Qué se hizo:** puesto al día (pull, `npm install` en raíz y `server/`, `server/.env` con `DATABASE_URL` en 6543 y
`SPAWN_SALT` local). Render: `DATABASE_URL` en 6543 y `SPAWN_SALT` propia (Samuel). Montado Android en su PC: JDK 21
(Temurin: el MSI de Microsoft daba "el hash del instalador no coincide", descarga de 211 KB) y Android Studio; APK
instalado en un Redmi Note 10 (Android 12, MIUI 13, hay que activar "Instalar vía USB"). Revisión de los 11 PR de Alex:
integración local develop + cadena + F0-12, y orden de mezcla cambiado: cadena #22→#31 primero (entra limpia) y #21 al
final (único con conflictos: BITACORA, DECISIONES, ESTADO y `schema.prisma`; resueltos conservando todo y en orden).
GitHub NO reapuntó los PR apilados (el repo no borra las ramas mezcladas): base cambiada a `develop` a mano antes de
cada mezcla (#28…#31 los cambió y mezcló Samuel en la web). ESTADO al día y F0-13 nueva en el ROADMAP.
**Cómo se probó (salida real):**
integración local (develop + #22…#31 + #21): server Tests 22 passed (22) · e2e Test Files 7 passed (7), Tests 66 passed (66)
app Tests 103 passed (103) · shared Tests 136 passed (136) · lint OK · build OK (app y servidor)
prisma migrate diff --from-config-datasource --to-schema … --exit-code → exit 0 (esquema combinado = base real)
diff de Alex: 0 secretos (contraseña BD, clave Maps, SPAWN_SALT/JWT_SECRET con valor, claves privadas) y 0 archivos sensibles
BD tras los e2e: 0 jugadores @pokecrud.test · 3 jugadores · 0 ADMIN
Render tras #22…#27: /health/ready 200; /spawns y /bag → 401 sin sesión (rutas nuevas desplegadas)
**Quedó a medias / roto:** nada de código. F0-13 (artefactos `.js` en `shared/`) anotada. Falta nombrar ADMIN (Alex).
**Decisiones nuevas:** ninguna (correcciones al relevo: Render despliega solo; GitHub no reapunta PR apilados aquí).
**El siguiente debe empezar por:** Alex → `cd server && npm run admin -- grant <su correo>`; Kenneth → F1-01 en su
Android y `SPAWN_SALT` en su `.env`; cualquiera → F0-13 (pequeña) o F5-01 / F2-08 / F2-01.

## 2026-10-12 12:05 · @samuel (Claude) · F1-01 (retomo de @alex en "medir en Android") · rama `feature/F1-01-spike-mapa-3d`

**Qué se hizo:** rama de Alex puesta al día con `develop` (53 commits; conflictos solo en BITACORA y ESTADO, resueltos
conservando todo). APK de producción instalado en el Redmi Note 10 y batería de `/dev/mapa` lanzada desde el PC por el
protocolo de depuración del WebView (`adb forward` + Chrome DevTools Protocol, sin tocar el móvil). La primera batería no
valía: el mapa se había movido/acercado y casi no había objetos en pantalla (todo 60 fps). Se recargó y se repitió desde
la vista inicial sin tocar → esa es la buena. Decisión **plan A** (D-035); ARQUITECTURA §4 actualizada.
**Archivos clave:** `docs/plan/DECISIONES.md` (D-035), `docs/evidencias/F1-01_03_redmi-note10-three-60.png` (three.js ×
60 con avatar, círculo y Pokémon visibles), `F1-01_04_redmi-note10-cerca.png` (vista acercada).
**Cómo se probó (salida real):**

    lint: All files pass linting · ng test: 29 archivos, 107 passed · shared: 11 archivos, 136 passed · build OK
    npm run apk -- --install → BUILD SUCCESSFUL · APK (production) 8.41 MB · adb install: Success
    [F1-01] batería {"device":{… Android 12; M2101K7BL … Chrome/153.0.8010.36 …","dpr":2.75,"viewport":"392x872",
      "gpu":"Mali-G76","renderingType":"VECTOR"},"results":[
      {"mode":"none","count":0,"avgFps":58.8,"p95Ms":16.8,"worstMs":132.7,"jankPct":0.2},
      {"mode":"three","count":10,"avgFps":59.2,"p95Ms":16.8,"worstMs":49.8,"jankPct":0.2},
      {"mode":"three","count":30,"avgFps":58.4,"p95Ms":16.8,"worstMs":33.4,"jankPct":0},
      {"mode":"three","count":60,"avgFps":48.5,"p95Ms":33.3,"worstMs":49.8,"jankPct":0.8},
      {"mode":"markers","count":10,"avgFps":56.7,"p95Ms":33.1,"worstMs":66.6,"jankPct":0.5},
      {"mode":"markers","count":30,"avgFps":52.3,"p95Ms":33.3,"worstMs":49.7,"jankPct":1.7},
      {"mode":"markers","count":60,"avgFps":43.8,"p95Ms":33.4,"worstMs":66.4,"jankPct":3.7}]}
    temperatura de la batería: 34,4 °C → 37,4 °C tras ~6 min de pruebas

**Quedó a medias / roto:** nada. Para F8-02: prueba de 10 min (calor/batería). Para F1-04: quitar POI comerciales del
estilo del Map ID (consola de Google, Alex).
**Decisiones nuevas:** D-035.
**El siguiente debe empezar por:** F0-13 (artefactos `.js` en `shared/`, pequeña) o F1-02 (plan detallado de F1 con
`writing-plans`, leyendo D-035 y D-022: el mapa anula la zona segura).

## 2026-10-12 12:20 · @samuel (Claude) · F0-13 · rama `feature/F0-13-artefactos-shared`

**Qué se hizo:** antes, mezclado el PR #32 (F1-01) con permiso de Samuel. F0-13: causa de los `.js` en `shared/`
encontrada y reproducida en un `git worktree` aparte: con la config del servidor anterior a D-024 (`rootDir: ./src`,
commit `be02bbf`) y código que importa `shared/`, `tsc` emite en `dist/../../shared/` = `shared/` del repo y deja
`server/tsconfig.build.tsbuildinfo` suelto (el mismo que había en el PC de Samuel, fechado 11:30 de la integración de
ayer). Comprobado el riesgo: un `rng.js` viejo junto a `rng.ts` lo usa Vitest en su lugar. Arreglo: script
`scripts/clean-shared-artifacts.mjs` (solo borra artefactos con su `.ts` al lado) en los ganchos pre* y `.gitignore`. D-036.
**Archivos clave:** `scripts/clean-shared-artifacts.mjs`, `package.json`, `server/package.json`, `scripts/apk.mjs`, `.gitignore`.
**Cómo se probó (salida real):**

    reproducción (worktree, config de be02bbf): 7 error TS6059 · git status shared → 21 restos + server/tsconfig.build.tsbuildinfo
    rng.js saboteado (lanza "SE USO EL .js VIEJO"): test:shared → 6 archivos fallidos, 47 × "Error: SE USO EL .js VIEJO"
    node scripts/clean-shared-artifacts.mjs → "borrados 22 restos de compilación" · después 0 · 2.ª pasada: nada
    mismo escenario con npm run test:shared (gancho pretest:shared) → borra 22 · Tests 136 passed (136)
    repo real: lint OK · ng test 107 passed · shared 136 passed · build OK · server build OK (dist/server/src/main.js),
      unit 22 passed, oxlint exit 0 (1 aviso antiguo en test/auth.e2e-spec.ts) · borró 1 resto (el tsbuildinfo suelto)
    .gitignore: shared/package.json, *.ts y el .snap siguen visibles (git check-ignore)

**Quedó a medias / roto:** nada. (Aviso antiguo de oxlint en `server/test/auth.e2e-spec.ts:200`, no es de esta tarea.)
**Decisiones nuevas:** D-036.
**El siguiente debe empezar por:** F1-02 — plan detallado de F1 en `docs/plan/fases/F1-mapa.md` con `writing-plans`
(leer D-035: plan A, ≤ 30 Pokémon; D-022: el mapa anula la zona segura; `/dev/mapa` y `spike-scene.ts` como base).
