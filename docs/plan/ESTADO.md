# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-11 · por Alex (Claude) · rama `feature/F4-03-dano` (PR abierto)

## Fase actual

**F0 · Fundaciones — COMPLETA.** F0-01…F0-10 en `develop` (PR #8-#18); **F0-11 hecha y mezclada** (Kenneth, PR #19). Siguiente fase: **F1 · Mapa con GPS** (empieza por F1-01, el spike de Google Maps 3D en Android real).

## Hecho

- **F4-03 (Alex, PR abierto; sale de F4-02):** `shared/engine/battle/damage.ts` (daño, crítico, precisión, orden) =
  calculadora de Showdown en 10 casos × 16 tiradas; `isSupportedMove` / `defaultMoves` (548 movimientos) y la captura
  del servidor ya solo asigna movimientos soportados. D-030.
- **F4-02 (Alex, PR abierto; sale de F4-01):** `shared/engine/battle/`: tabla de tipos 18×18 (= tabla oficial),
  `calcStats` y etapas (= ejemplo de Bulbapedia), `statChangeTarget`. Dataset regenerado (v`0c1997bdfa5a`) con
  `target`, `flinchChance` y `metaCategory` en los movimientos (D-029). La app invalidará su caché sola (versión nueva).
- **F4-01 (Alex, PR abierto; sale de F2-06):** plan del motor de combate en `docs/plan/fases/F4-combate.md`: contrato
  `resolveTurn(state, actions, rng) → {state, events}`, reglas Gen V+, 550 de 706 movimientos en la v1 y el hueco del
  dataset (falta `target` de los cambios de stats y `flinchChance`; se arregla en F4-02 paso 1).
- **F2-06 (Alex, rama `feature/F2-06-captura-servidor`, PR abierto; sale de F2-03):** captura autoritativa.
  `GET /encounters/:id` (datos para la escena) y `POST /encounters/:id/throw` (una transacción: franja viva, ≤ 80 m,
  gasto atómico de bola/baya, RNG del servidor, `CaughtPokemon`, XP; idempotente por `clientThrowId`). `GET /spawns`
  guarda la ubicación del jugador. Migración `capture` **ya aplicada en Supabase**. D-028. Falta que la app lo use
  (F2-04/05/07, necesitan F2-01 en Android).
- **F2-03 (Alex, rama `feature/F2-03-formula-captura`, PR abierto; sale de F1-08):** `shared/engine/capture.ts`:
  fórmula de captura Gen III+ (bola, baya, lanzamiento, curva, PS), huida por rareza/velocidad y `resolveThrow` con
  RNG inyectado (el servidor tira en F2-06). D-027.
- **F1-08 (Alex, rama `feature/F1-08-inventario-xp`, PR abierto; sale de F1-06):** mochila (`Inventory`, `GET /bag`,
  kit 30 Poké / 5 Super / 0 Ultra / 5 Frambu al registrarse y a los existentes; migración `inventory` **ya aplicada en
  Supabase**), curva de nivel en `shared/engine/progression.ts` y `ProgressionService.addXp` (sin endpoint, para F2).
  Placa del jugador `app-player-hud` visible en `/dev/ui`. D-026.
- **F1-06 (Alex, rama `feature/F1-06-spawns`, PR abierto):** spawns deterministas. Motor puro
  `shared/engine/spawns.ts` (celdas de ~78 m, franjas de 10 min, pesos por rareza/clima/noche) y `GET /spawns?lat&lng`
  (sesión, ≤ 200 m, solo `{id, speciesId, lat, lng}`). Semilla HMAC con `SPAWN_SALT` (solo servidor), clima de
  Open-Meteo por celda de 0,1° y franja (timeout 4 s → "despejado"). **El servidor ahora compila `shared/`:** sale en
  `dist/server/src/main.js` (D-024). D-025.
- **F0-11 (Kenneth, rama `feature/F0-11-zona-segura`):** zona segura global para pantallas sin `ion-header`
  (`src/global.scss`, D-022). Probado en el Samsung A36: `/dev/ui`, login y registro sin solapes; Pokédex sin cambios.
- **F0-10 (Kenneth, rama `feature/F0-10-transaction-pooler`):** `DATABASE_URL` por el _transaction pooler_ (6543),
  `DIRECT_URL` sigue en 5432. Medido: 40/40 conexiones; 2 servidores locales + Render + e2e en paralelo = 2.516
  consultas, 0 fallos. Arreglado el borrado cruzado entre archivos e2e (500 intermitente en paralelo). D-021.
- **F0-09 (Kenneth, rama `feature/F0-09-apk`):** `android/` (Capacitor 8.5.2) con permisos, `npm run apk` (producción →
  Render; `-- device` → Nest del PC por IP LAN; `--install` con adb), icono y splash propios (`resources/brand.mjs`).
  **Probado en un Samsung A36 (Android 16):** APK 8,18 MB, splash, Pokédex desde Render, registro, `/dev/ui` con sesión
  que sobrevive a cerrar la app (Keystore OK), grito y vibración. Requiere **JDK 21** (el `jbr` reciente es 25). D-020.
- **F0-08 (Kenneth, PR #16, mezclado; Render lo sirve):** `/pokemon` (público para leer, sesión para escribir),
  `/teams`, `/favorites`, `/customPokemon` (por jugador; lo ajeno → 404) en Nest con el contrato de JSON Server
  (`_sort`, `_order`, `name_like`, `_page`, `_limit`, `X-Total-Count`). Migración `crud_curso` **aplicada en Supabase**
  (con CHECKs), semilla `cd server && npm run db:seed` (151 + demo) **ya cargada**. App: `apiUrl` → `serverUrl` (dev :3000),
  agregar/editar con `authGuard`. JSON Server archivado en `backend/legacy/` (sin `npm run api`). Postman reescrita
  (re-ejecutable, 79 comprobaciones). e2e en serie por el límite del pooler. D-019.
- **Auth en producción (Render):** `JWT_SECRET` propio puesto en Render; tras mezclar #14, probado contra
  https://pokecrud-server.onrender.com: registro 201, `/auth/me` 200, refresh 200, refresh reutilizado 401 y familia
  revocada, logout 204 (cuenta de prueba borrada).
- **F0-07 (Samuel, PR #14):** auth completa. Servidor `server/src/auth/` (registro, login, refresh rotatorio con detección de
  robo, logout, `/auth/me`; Argon2id; JWT HS256 15 min con iss/aud; guard global con `@Public()`; límite 5/min por IP y
  10 fallos/15 min por cuenta). App `src/app/core/auth/` (TokenStore Keystore/sessionStorage, AuthService con refresh
  compartido, interceptor, guards) y pantallas `/login` y `/registro`. `/dev/ui` exige sesión. Rutas IS-11 públicas
  hasta F0-08. D-018. Evidencias `docs/evidencias/F0-07_*.jpg`.
- **Servidor desplegado:** https://pokecrud-server.onrender.com (Render Free, **cuenta de Samuel**, rama `develop`,
  despliegue automático al mezclar en `develop`). `/health/ready` → `{"status":"ok","db":"ok"}` desde internet.
  `apiUrl` de `environment.prod.ts` apunta ahí.
- **F0-06 (Samuel, PR #12):** `server/` con NestJS 12 ESM + Prisma 7.10 (`PrismaPg`, pool 5),
  migración `init` **aplicada en Supabase** (tablas `Player` y `RefreshToken`), helmet, CORS con lista blanca,
  `ValidationPipe` estricto, rate limit 120/min por IP (salvo `/health`), logs JSON con `x-request-id`,
  `/health/live` y `/health/ready` (timeout 3 s → 503). Tests: 4 unitarios + 7 e2e contra la base real. D-017.
- **F0-02…F0-05 (Samuel, PR #8-#11):** dataset de 1025 especies, `shared/` con RNG, sistema de diseño + `/dev/ui`,
  servicios base (dataset en IndexedDB, audio con gritos, hápticos, ajustes). Ver BITACORA y DECISIONES D-014…D-016.
- **F0-01 hecho:** plan detallado de la fase 0. Plan maestro, reglas de relevo, `/inicio` `/guardar` `/cierre`, hooks y skills.
- El profe aprobó sustituir JSON Server por NestJS con los mismos endpoints (D-002).
- Lo que ya existía antes del plan: Angular 22 + Ionic 9 + Capacitor 8; JSON Server con `/teams`, `/favorites`,
  `/customPokemon` y **`/pokemon`** (151 sembrados, con `price` y `stock`); Postman (36 pruebas); Scrum en Jira.
  **IS-11 (Samuel, 08-10) en `develop`:** Pokédex/inventario con CRUD; Equipos, Favoritos y Mis Pokémon **ocultos**.

## En curso

- **F4-04 (Alex, rama `feature/F4-04-reducer`, sale de F4-03):** `battle-engine.ts` (reducer puro) con estados y stats.
- Esperan revisión **en orden** (ver PENDIENTES DE HUMANOS): #21 → #22 → #23 → #24 → #25 → #26 → #27 → #28.
- **F1-01 → PENDIENTE DE KENNETH** (medir fps en su Android): rama `feature/F1-01-spike-mapa-3d`, instrucciones
  exactas en la última entrada de F1-01 de la bitácora.

## Siguiente paso concreto

1. **Revisar y mezclar los PR en orden: F0-12 (#21), F1-06 (#22), F1-08.** Tras mezclar, Samuel: Manual Deploy en Render.
2. **`SPAWN_SALT` (F1-06):** cada uno la añade a su `server/.env` (≥ 32 caracteres aleatorios:
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`); **Samuel, también en Render**
   antes del deploy. Sin ella `/spawns` da 503 y el resto funciona. Alex ya la tiene.
3. **Kenneth:** cerrar F1-01 (medición en Android + decisión A/B). Desbloquea F1-02…F1-05.
4. Siguientes tareas: F1-02…F1-05 esperan a F1-01 (Kenneth). Libres sin móvil: mirar el ROADMAP de F2-F4 (motor de
   combate F4 en `shared/` no necesita mapa).
5. Samuel: puerto de `DATABASE_URL` → 6543 en su `.env` y en Render (Alex ya lo hizo).
6. Para generar el APK en otro PC: JDK 21 (`winget install Microsoft.OpenJDK.21`) y `npm run apk`.

## Bloqueos / roto / pendiente de humanos

### PENDIENTES DE HUMANOS — lista única (quien termine algo, lo marca `[x]`; cada tarea nueva añade aquí lo suyo)

**Kenneth o Samuel (revisión):**
- [ ] Revisar y mezclar **en este orden**: #21 (F0-12 admin) → #22 (F1-06 spawns) → #23 (F1-08 mochila) → #24 (F2-03 fórmula) → #25 (F2-06 captura) → #26 (F4-01 plan combate) → #27 (F4-02 tipos y stats) → #28 (F4-03 daño).
  Cada uno sale del anterior: al mezclar uno, GitHub reapunta el siguiente a `develop`.

**Samuel (Render, solo él tiene acceso):**
- [ ] `DATABASE_URL` → puerto **6543** en Render (F0-10, D-021).
- [ ] Añadir **`SPAWN_SALT`** en Render (≥ 32 caracteres aleatorios, propia de Render) ANTES de desplegar F1-06.
- [ ] **Manual Deploy** después de cada mezcla en `develop` (con repo público por URL NO es automático).
- [ ] Su `server/.env`: puerto 6543, `JWT_SECRET` y `SPAWN_SALT` propios.

**Kenneth:**
- [ ] **F1-01:** medir fps en su Android y escribir la decisión plan A/B (rama `feature/F1-01-spike-mapa-3d`,
  instrucciones en su bitácora). Bloquea F1-02…F1-05.
- [ ] Su `server/.env`: `SPAWN_SALT` propia.

**Alex:**
- [ ] Nombrarse ADMIN del inventario tras mezclar #21: registrarse en la app y `cd server && npm run admin -- grant <correo>`.
- [ ] Postman (tras #21): poner `adminEmail`/`adminPassword` en SU entorno local de Postman.
- [ ] Antes del **2027-01-10**: tope de Google Maps o pasar a MapLibre (ver más abajo).
- [ ] Decidir qué hacer con las 6 capturas `docs/evidencias/HU-02_*.jpg` sin commitear.
- [ ] (Recomendado en la revisión de F0) Proteger `develop` y añadir CI con lint + test + build obligatorios:
  hoy los 23 PR se han mezclado sin revisión.
- [x] `server/.env` en 6543, `JWT_SECRET` y `SPAWN_SALT` locales; JDK 21 instalado (2026-10-11).

- **Cada compañero necesita su propio `JWT_SECRET`** en su `server/.env` para arrancar el servidor en local (SECRETOS.md).
- **En local hacen falta dos servidores:** Nest (`cd server && npm run start:dev`, puerto **3000**) y la app (`npm start`).
  Si tu `server/.env` tiene `PORT=3001` de antes, cámbialo a 3000 (o bórralo).
- **ACCIÓN — puerto de la base (F0-10, D-021):** cada uno cambia en su `server/.env` el puerto de `DATABASE_URL` de
  **5432 a 6543** (solo ese; `DIRECT_URL` se queda en 5432). **Samuel:** lo mismo en la variable `DATABASE_URL` de Render.
  Mientras alguien siga en 5432 consume del cupo de 15 del session pooler (hoy Render: 5); no rompe nada, pero el riesgo
  vuelve si los tres se quedan en 5432.

- **Render está en la cuenta de Samuel:** solo él ve los logs y cambia variables. Si hay que rotar la contraseña de la BD
  (SECRETOS.md), Samuel actualiza `DATABASE_URL` y `DIRECT_URL` en Render. Plan gratis: se duerme a los 15 min.
- **Inventario IS-11 en producción:** `/pokemon` llega a Render al mezclar F0-08 (las tablas y la semilla ya están en la base).
- **Google Maps — HECHO (2026-10-11):** clave `pokecrud-maps-js` en la cuenta de Google Cloud de Alex
  (prueba gratuita hasta 2027-01-10, proyecto "My First Project" `project-7bf0c639-c6d2-4cc1-aba`), restringida a
  Maps JavaScript API y a `https://localhost/*`, `http://localhost:8100/*`, `http://localhost:4200/*`.
  Map ID vectorial con inclinación y rotación: `5309ecf69efbfe12f3ecbc4c`. Presupuesto `pokecrud-tope` 5.000 COP con
  alertas 50/90/100 %. Probado: mapa de Neiva cargado en `localhost:8100` con tilt 67.5 y render VECTOR, sin errores.
  **La clave NO está en el repo:** pídesela a Alex por privado y créate `src/environments/environment.local.ts`:
  `export const localEnv = { googleMapsApiKey: '…', googleMapsMapId: '5309ecf69efbfe12f3ecbc4c' };`
- **Pendiente antes del 2027-01-10:** la consola no deja poner tope diario a "Map loads per day" ("La cuota no se
  puede modificar"). Mientras dure la prueba no hay cobro posible; antes de que termine, revisar el tope o pasar a MapLibre.
- **Base de datos — HECHO (2026-10-11):** Supabase proyecto `pokecrud-go` (ref `ggfnjophcsyawltmoseh`, São Paulo
  `sa-east-1`, Postgres 17, plan gratis) en la org de la cuenta **alexpipew31@gmail.com** (separada de StockUp).
  Data API (REST automática) **desactivada** (el juego entra solo por NestJS/Prisma) y RLS automático activado.
  Conexión por _session pooler_ (IPv4): `aws-1-sa-east-1.pooler.supabase.com:5432`, usuario `postgres.ggfnjophcsyawltmoseh`.
  Probado: conexión OK desde el PC de Alex. **La contraseña NO está en el repo:** pídele a Alex su `server/.env`
  (`DATABASE_URL` y `DIRECT_URL`) por privado. Ojo: Supabase gratis pausa el proyecto tras ~7 días sin uso; si pasa,
  se reactiva desde el panel (Alex).
- Hay 6 capturas de evidencia HU-02 sin commitear en `docs/evidencias/` (son de Alex, no se tocaron).

## URLs / datos útiles

- Repo: https://github.com/alexpipe31w/pokecrud (público) · rama de integración `develop`.
- Servidor desplegado: https://pokecrud-server.onrender.com (`/health/ready`).
