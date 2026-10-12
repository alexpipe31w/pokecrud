# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-12 · por Samuel (Claude) · `develop` (#32, #33 y #34 mezclados)

## 👉 RELEVO DE ALEX A SAMUEL — HECHO (2026-10-12)

1. ✅ **PR mezclados:** #22 → #31 (cadena, entró limpia) y #21 al final (único con conflictos: docs y `schema.prisma`,
   resueltos conservando todo; esquema = base real). Antes, integración local completa: servidor 22 unitarios + 66
   e2e, app 103, shared 136, lint y build OK. **Ojo para próximas cadenas:** este repo NO borra la rama al mezclar,
   así que GitHub **no** reapunta solo el PR siguiente: hay que cambiar su base a `develop` a mano antes de mezclarlo.
2. ✅ **Render (Samuel):** `DATABASE_URL` en 6543 y `SPAWN_SALT` propia puestos. **Render SÍ despliega solo** al
   mezclar en `develop` (trigger "Branch updated"): no hace falta Manual Deploy. Probado: `/health/ready` 200, `/spawns`
   y `/bag` existen (401 sin sesión).
3. ✅ **`server/.env` de Samuel:** 6543, `JWT_SECRET` y `SPAWN_SALT` propios.
4. **Samuel también montó Android:** JDK 21 (Temurin) + Android Studio; APK instalado y probado en un **Redmi Note 10**
   (Android 12, MIUI 13): Pokédex desde Render, login, 60 fps. En Xiaomi hay que activar "Instalar vía USB".
5. **Qué coger después** (REGLA 1, una tarea): sin móvil → **F5-01** (plan del PvP) o **F2-08** (audio). Con un
   Android → **F2-01** (spike de cámara + giroscopio): la llave de la AR, **incluido el combate en AR (D-034, F4-07)**.

**Importante (D-034):** la escena de combate de `/combate/prueba` es **temporal**. Alex quiere el combate **en
realidad aumentada con la cámara**. Lo que hay debajo (motor, IA, controlador, textos, menú) se reutiliza; solo cambia
la parte visual (F4-07).

## Fase actual

**F0 completa** (en `develop`). **F4 (combate) completa en código** a falta de la versión AR (F4-07). **F1 y F2 a
medias:** spawns (F1-06), mochila/XP (F1-08), fórmula de captura (F2-03) y captura en servidor (F2-06) hechos; lo
visual del mapa ya tiene vía libre (**F1-01 hecha: plan A, D-035**); el del encuentro espera al spike F2-01.

## Hecho

- **F1-02 (Samuel, PR #34 mezclado):** plan de la fase del mapa en `docs/plan/fases/F1-mapa.md`: F1-03 (GPS filtrado,
  brújula, joystick, permisos), F1-04 (`/mapa` como pantalla principal, HUD, menú de la Poké Ball, adiós pestañas,
  clima en `GET /spawns`), F1-05 (avatar 3D procedural) y F1-07 (Pokémon con hierba, grito por cercanía, toque).
- **F0-13 (Samuel, PR #33 mezclado):** los `.js` que aparecían en `shared/` salen de compilar el servidor con la config
  previa a D-024 (rama vieja); Vitest los usaba EN VEZ del `.ts`. Ahora `scripts/clean-shared-artifacts.mjs` los borra
  solo antes de `start`/`build`/`test` (raíz, `server/`, APK) y `.gitignore` impide subirlos. D-036.
- **F1-01 (Alex + Samuel, PR #32 mezclado):** spike del mapa medido en un Redmi Note 10: three.js con 30
  Pokémon a 58,4 fps y 0 % de tirones, mejor que los markers HTML (52,3). **Plan A, máximo 30 Pokémon dibujados**
  (D-035). Página de pruebas `/dev/mapa` (solo desarrollo). Desbloquea F1-02…F1-05.
- **F4-05 (Alex, PR mezclado):** **escena de combate jugable** en `/combate/prueba` (botón en `/dev/ui`):
  elegir rival (fácil/normal/difícil), combate por turnos contra la IA con animaciones, textos, eficacia prevista,
  cambio de Pokémon y final. **Con esto la F4 (motor + IA + escena) está completa.** D-033.
- **F4-06 (Alex, PR mezclado):** IA rival (`shared/engine/battle/ai.ts`, fácil/normal/difícil) y 3
  entrenadores de prueba (`shared/data/trainers.ts`). D-032. Siguiente: **F4-05**, la escena de combate en la app.
- **F4-04 (Alex, PR mezclado):** motor de combate completo en `shared/engine/battle/battle-engine.ts`
  (`createBattle`, `resolveTurn` puro y determinista; estados, etapas, drenaje, multigolpe, retroceso, cambios,
  Forcejeo, victoria). 1.000 combates aleatorios terminan siempre. D-031. **Siguiente: F4-05 (escena) y F4-06 (IA).**
- **F4-03 (Alex, PR mezclado):** `shared/engine/battle/damage.ts` (daño, crítico, precisión, orden) =
  calculadora de Showdown en 10 casos × 16 tiradas; `isSupportedMove` / `defaultMoves` (548 movimientos) y la captura
  del servidor ya solo asigna movimientos soportados. D-030.
- **F4-02 (Alex, PR mezclado):** `shared/engine/battle/`: tabla de tipos 18×18 (= tabla oficial),
  `calcStats` y etapas (= ejemplo de Bulbapedia), `statChangeTarget`. Dataset regenerado (v`0c1997bdfa5a`) con
  `target`, `flinchChance` y `metaCategory` en los movimientos (D-029). La app invalidará su caché sola (versión nueva).
- **F4-01 (Alex, PR mezclado):** plan del motor de combate en `docs/plan/fases/F4-combate.md`: contrato
  `resolveTurn(state, actions, rng) → {state, events}`, reglas Gen V+, 550 de 706 movimientos en la v1 y el hueco del
  dataset (falta `target` de los cambios de stats y `flinchChance`; se arregla en F4-02 paso 1).
- **F2-06 (Alex, rama `feature/F2-06-captura-servidor`, PR mezclado):** captura autoritativa.
  `GET /encounters/:id` (datos para la escena) y `POST /encounters/:id/throw` (una transacción: franja viva, ≤ 80 m,
  gasto atómico de bola/baya, RNG del servidor, `CaughtPokemon`, XP; idempotente por `clientThrowId`). `GET /spawns`
  guarda la ubicación del jugador. Migración `capture` **ya aplicada en Supabase**. D-028. Falta que la app lo use
  (F2-04/05/07, necesitan F2-01 en Android).
- **F2-03 (Alex, rama `feature/F2-03-formula-captura`, PR mezclado):** `shared/engine/capture.ts`:
  fórmula de captura Gen III+ (bola, baya, lanzamiento, curva, PS), huida por rareza/velocidad y `resolveThrow` con
  RNG inyectado (el servidor tira en F2-06). D-027.
- **F1-08 (Alex, rama `feature/F1-08-inventario-xp`, PR mezclado):** mochila (`Inventory`, `GET /bag`,
  kit 30 Poké / 5 Super / 0 Ultra / 5 Frambu al registrarse y a los existentes; migración `inventory` **ya aplicada en
  Supabase**), curva de nivel en `shared/engine/progression.ts` y `ProgressionService.addXp` (sin endpoint, para F2).
  Placa del jugador `app-player-hud` visible en `/dev/ui`. D-026.
- **F1-06 (Alex, rama `feature/F1-06-spawns`, PR mezclado):** spawns deterministas. Motor puro
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

- **F1-03 (Kenneth, rama `feature/F1-03-ubicacion-brujula`)**: reclamada 2026-10-12. Sigue
  `docs/plan/fases/F1-mapa.md` → F1-03. **Punto de guardado:** pasos 1-2 hechos (geo.ts, gps-filter.ts); sigue el paso 3 (ángulos y joystick).

## Siguiente paso concreto

1. **Alex:** nombrarse ADMIN del inventario (`cd server && npm run admin -- grant <correo>`). Hasta entonces nadie
   puede agregar/editar/eliminar Pokémon en `/pokemon` (hoy hay 0 ADMIN en la base).
2. ~~**Kenneth:** poner `SPAWN_SALT` en su `server/.env`~~ → hecho (2026-10-12).
3. **Siguiente tarea libre:** **F1-03** (ubicación, brújula y joystick; sigue `docs/plan/fases/F1-mapa.md`, necesita
   Android para el criterio). Con Android también →
   F2-01 (spike de cámara y giroscopio). Sin móvil → F5-01 o F2-08.
4. Para generar el APK en otro PC: JDK 21 (`winget install Microsoft.OpenJDK.21`; si da "el hash no coincide",
   `winget install EclipseAdoptium.Temurin.21.JDK`) y `npm run apk`.

## Bloqueos / roto / pendiente de humanos

### PENDIENTES DE HUMANOS — lista única (quien termine algo, lo marca `[x]`; cada tarea nueva añade aquí lo suyo)

**Kenneth o Samuel (revisión):**

- [x] (Samuel, 2026-10-12) Revisar y mezclar #21…#31: primero la cadena #22 → #31 y #21 al final (único con
      conflictos). GitHub NO reapuntó solo (el repo no borra las ramas mezcladas): la base se cambió a `develop` a mano.

**Samuel (Render, solo él tiene acceso):**

- [x] `DATABASE_URL` → puerto **6543** en Render (F0-10, D-021). (2026-10-12)
- [x] Añadir **`SPAWN_SALT`** en Render (≥ 32 caracteres aleatorios, propia de Render). (2026-10-12)
- [x] ~~Manual Deploy tras cada mezcla~~: no hace falta, Render despliega solo al cambiar `develop` (comprobado).
- [x] Su `server/.env`: puerto 6543, `JWT_SECRET` y `SPAWN_SALT` propios. (2026-10-12)

**Kenneth:**

- [ ] Probar el combate en su Android: APK → `/dev/ui` → "Combate de prueba"; que vaya fluido y se oigan los gritos.
- [x] ~~**F1-01:** medir fps en su Android~~ → la retoma Samuel en su Redmi Note 10 (2026-10-12).
- [x] Su `server/.env`: `SPAWN_SALT` propia (64 caracteres) y `DATABASE_URL` en 6543 comprobado. (2026-10-12)

**Quien coja F2-08 (audio):**

- [ ] SFX de golpe/crítico/debilitado para la escena de combate (hoy solo hay gritos y vibración).

**Alex:**

- [ ] (Para F1-04) Estilo del Map ID `5309ecf69efbfe12f3ecbc4c` en Google Cloud: **sin POI comerciales** y con
      **variante oscura** (noche). Si no se puede, crear un segundo Map ID para la noche (plan en `fases/F1-mapa.md`).
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
- **ACCIÓN — puerto de la base (F0-10, D-021):** (Alex, Samuel, Kenneth y Render: hecho) cada uno cambia en su `server/.env` el puerto de `DATABASE_URL` de
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
