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
