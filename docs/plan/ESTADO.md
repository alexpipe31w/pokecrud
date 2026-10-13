# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-13 · por Samuel (Claude) · `develop` con #63…#72; F3-06c en PR

## 👉 RELEVO DE KENNETH (2026-10-12 noche): pendientes de Android probados en el Samsung A36

**Leer antes de tocar el encuentro:** D-045…D-049 (AR 3D, ficha, PC) y **D-050** (lanzamiento con el dedo de verdad).

**Hecho en el A36 (APK de producción contra Render), todo medido por CDP/adb:**
- **F2-04a `[x]`:** cámara principal 720p, Diggersby 3D + partículas **60 fps / 0 % tirones**, 3 entradas sin
  "context lost", Inicio suelta la cámara, AR apagada y sin permiso → fondo ilustrado. **F2-04b `[x]`:** grito +
  vibración a la vez al aterrizar, fantasma semitransparente, vídeo de la entrada. **F2-12 `[x]`:** 60 fps con el modelo.
- **F2-05 `[x]` tras ARREGLARLO (D-050):** con el dedo se acertaban **3 de 117** (la fuerza tenía que ser 1.800 px/s
  ± 4 %) y la curva no salía NUNCA (se medía alrededor del punto de agarre). Ahora zona buena de fuerza 1.000-3.600
  px/s y curva por el giro del dedo; tests con los gestos reales de Kenneth. Después: 3 de 5 aciertos y curva OK.
- **F2-07 `[x]` (captura):** luz roja (también el modelo 3D), la bola cae, espera al servidor, 1-3 sacudidas con clac y
  vibración, estrellas, fanfarria y la tarjeta "¡Capturado!" con la XP contando; escape y huida. Probado en el A36
  (Abomasnow y Bellsprout). **F2 completa salvo** F2-10 (música), F2-11/F2-14 (ARCore) y los pulidos F2-16…F2-18.
- **Quedan `[~]`:** F1-07 7b y F1-05 3b — hay que **salir a la calle con el GPS** (Kenneth no quiso salir de noche).
- **Tareas nuevas vistas en el móvil:** **F1-11** (el joystick queda guardado y al reabrir pone el avatar en el Parque
  Santander, no donde estás; basta con desactivarlo, falta que se note), **F2-15 `[x]`** (ya hecha, D-051: los Pokémon
  anchos y largos como Slowpoke XL caben), **F2-16** (entrada al encuentro: el zoom casi no se ve, ~1,4 s de espera y la cámara llega tarde).

**Siguiente, por orden:** (1) **F3-01 está LIBRE** (Kenneth no llegó a empezarla); (2) con luz, F1-07 7b + F1-05 3b en la calle
(APK de producción, **joystick APAGADO** en el menú de la Poké Ball); (3) **F3-01** (plan de la colección: ya se
puede, F2-07 hecha) o F2-11 (ARCore, Android); pulidos F2-17/F2-18 si sobra tiempo.
- **Ver un Pokémon concreto en el APK:** `page.route` por CDP sobre `GET /encounters/:id` cambiando `speciesId` y
  `heightScale` (solo se ve; el servidor sigue validando el real). Cerrar luego el `node` por su PID: `TaskStop` no lo mata.

**Probar en el móvil por cable (lo que funcionó esta vez):**
- `adb` no está en el PATH: `$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe`. En Git Bash, **`MSYS_NO_PATHCONV=1`**
  antes de `adb shell ... /sdcard/...` (si no, convierte la ruta y `screenrecord` falla).
- CDP: `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` (`adb shell pidof co.edu.fet.pokecrud`) +
  `playwright-core` `connectOverCDP`. **El APK de producción no tiene `ng`**: para abrir un encuentro se mueve el
  joystick con `adb shell input motionevent DOWN/MOVE/UP` y se toca el Pokémon con `input tap`.
- `screenrecord --size 720x1560` (a resolución nativa da "Encoder failed (err=-38)"). `pm revoke` de la cámara MATA
  la app (hay que reabrirla y repetir el `forward`).
- Cada franja dura 10 min: al cambiar, el encuentro abierto caduca.
- Con la cámara encendida el A36 gasta más de lo que carga el USB del PC: cargador de pared.

**Trucos para probar en el PC:**
- Servidor (`cd server && npm run start:dev`) + `npm start`; cuenta `...@pokecrud.test` y **bórrala al acabar**.
- Abrir un encuentro: `ng.getComponent(document.querySelector('app-map')).router.navigateByUrl('/encuentro/<id>')`
  con un id de `GET /spawns`, después de mandar tu posición a ≤ 80 m (`GET /spawns?lat&lng`), si no da 403. **No**
  uses `history.pushState`: deja vivo el encuentro anterior y rompe el segundo WebGL.
- Ver una especie concreta: en Playwright `page.route('**/encounters/*', r => r.fulfill({ json: {...} }))`.
- **Quita el permiso de cámara al Chromium de Playwright** (`context.clearPermissions()`). Revisa las capturas antes
  de subirlas (el repo es público; las del móvil con la cámara enseñan tu casa).
- **Los gestos con el ratón NO sirven para calibrar el lanzamiento** (D-050): pruébalo con el dedo.
- `TaskStop` no mata `ng serve` ni Nest: párales por puerto (3000 y 4200).

## Fase actual

**F0 completa.** **F1:** todo hecho salvo la calle (F1-05 3b, F1-07 7b) y F1-11 (nueva). **F2:** F2-01…F2-06, F2-08,
F2-07, F2-12, F2-13, F2-15 hechas; faltan **F2-11**/**F2-14** (ARCore), F2-10 (música) y los pulidos F2-16…F2-18.
**F3:** completa en código (F3-01…F3-06c); quedan los vistazos opcionales en Android. **F4:** completa en código salvo F4-07 (combate en AR 3D, D-048).

## Hecho

- **F3-06c (Samuel, rama `feature/F3-06c-favoritos-personalizados`, PR):** favoritos desde la ficha de especie (estrellas
  táctiles + nota) y `/favoritos`; `/personalizados` y su editor; `app-star-rating`, `app-type-picker`. Sin cambios en
  el servidor. Postman 46/82/0, app 514. Evidencias `F3-06c_0{1..7}_*`.
- **F3-06b (Samuel, #72 mezclado):** equipos con Pokémon capturados (D-054): `caughtIds`,
  migración `team_caught` **aplicada en Supabase**, transferir los quita, `GET /collection?ids`; `/equipos` y editor.
  e2e 94, app 495, Postman 46/82/0. Evidencias `F3-06b_0{1..6}_*`.
- **F3-06a (Samuel, #71 mezclado):** IS-11 con el sistema de diseño (D-055): tarjetas,
  ficha con confirmación propia, formulario con chips de tipo; `app-search-field`, `app-confirm-panel`, botón `danger`.
  Postman 46/82/0 en local, app 485. Evidencias `F3-06a_0{1..8}_*`.
- **F3-05 (Samuel, #70 mezclado):** evolucionar con caramelos (D-053). `evolution.ts`
  (shared), `POST /collection/:id/evolve` (una transacción; dos a la vez → una gana y se cobra una vez), panel en la
  ficha y animación de evolución. e2e 87, app 478, shared 167. Evidencias `F3-05_0{1..9}_*` (vídeo `.webm`).
- **F2-07 (Kenneth, rama `feature/F2-07-captura`, PR):** `capture-sequence.ts`, `shared/data/natures-es.ts`,
  `EncounterScene.setCaptureLook`/`poseBall` (plano y modelo 3D), sonidos absorb/shake/capture/escape (+ `.wav` en
  `F2-08_sfx/`), `app-caught-card` y la coreografía en la página. App 75 archivos / 435 tests, shared 147, servidor 22.
  A36: dos capturas y tres escapes; XP 590 → 900. Evidencias `F2-07_0{1..4}_a36-*`.
- **F2-15 (Kenneth, rama `feature/F2-15-anchos-caben`, PR):** `encounterDistance` con ancho y largo (D-051); la escena
  recoloca al llegar el modelo y el arte tardío ya no pisa la proporción del modelo. A36: Slowpoke XL ~52 % del ancho,
  59,6 fps (`F2-15_01`). App 73 archivos / 413 tests.
- **Pendientes de Android en el A36 (Kenneth, rama `feature/pendientes-android-a36`, PR):** F2-04a, F2-04b, F2-12 y
  F2-05 `[x]` (ver el relevo de arriba). Arreglo del lanzamiento con el dedo (D-050): `throw-gesture.ts` (zona buena
  de fuerza, curva por el giro del dedo), `throw-dock.component.ts` (300 muestras), tests con los gestos reales
  (`a36-curve-gestures.data.ts`). App 73 archivos / 406 tests. Evidencias `F2-04a_0{5,6,7}_a36-*`,
  `F2-04b_04_a36-entrada-al-encuentro.mp4`. Tareas nuevas F1-11, F2-15, F2-16.
- **F2-02 (Kenneth, rama `feature/F2-02-plan-captura`):** plan de F2 (`docs/plan/fases/F2-captura.md`): F2-04a
  (escena AR base), F2-04b (personalidad, efectos del tipo, entrada), F2-05 (lanzamiento) y F2-07 (captura, escape,
  shiny). **Todo su código se escribió, compiló y probó capa a capa antes de subir el plan** (estado final: app 73
  archivos / 393 tests, shared 143, servidor 22; los diffs del plan reproducen ese estado byte a byte) y luego se
  borró. D-046 (quién decide qué al lanzar; fallar no gasta). F2-04 partida en a/b.
- **F2-01 (Kenneth, rama `feature/F2-01-spike-camara-giroscopio`):** `/dev/ar` medido en el Samsung A36. `getUserMedia`
  funciona en el WebView (sin plugin nativo); 60 fps con Pokémon + 400 partículas, 0 % tirones; vídeo ~24 fps en
  interior. **`facingMode` abre el gran angular** → se elige "camera 0" por `deviceId`. `RelativeOrientationSensor`
  (56 Hz, más suave) en vez de `deviceorientation`; calibrado FOV vertical 64° y retraso 80 ms. Sin WebXR (AR solo de
  orientación). Cámara y sensores se sueltan al salir y en segundo plano; mapa ↔ AR ×3 sin perder el contexto WebGL.
  Código para F2-04: `game/encounter-scene/device-pose.ts` y `pose-delay.ts`. App 278 tests. D-045.

- **F2-08 (Alex, mezclado):** efectos de sonido generados en el juego (D-044) y sonando en el combate; gritos
  precargados al empezar el combate. Música → F2-10. Escuchar: `docs/evidencias/F2-08_sfx/*.wav`.
- **F1-10 (Alex, mezclado):** el HUD del mapa sigue al día/noche del mapa, no al modo oscuro del móvil.
- **F1-09 (Alex, mezclado):** con Render dormido ya no hay pantalla en blanco ni se pierde la sesión: reintentos con
  espera creciente y pantalla "servidor despertando" (D-043).
- **F1-07 (Alex, mezclado; falta 7b en Android):** Pokémon salvajes en `/mapa`: feed de `/spawns` (cuándo pedir,
  espera tras fallar), brotan agitando su mata de hierba, se desvanecen al irse, grito bajito por cercanía, toque →
  "Acércate más" o `/encuentro/:id` (provisional hasta F2-04). Antes del encuentro se manda la posición (D-041). App
  236 tests. Evidencias `F1-07_*`.
- **F1-05 (Alex, mezclado; falta 3b en Android):** `limb-pose.ts` (pose + `advanceStride`, D-040) y `avatar-3d.ts`
  (entrenador procedural, 12 mallas, sombra que encoge con el bote, pose suavizada) en `MapScene` (×1,8). App 183
  tests, shared 140, lint y build OK. Navegador: anda / corre / se para (`F1-05_01…05`).
- **F1-04 (Kenneth, PR #37 mezclado; Render desplegado):** `/mapa` como ruta principal (fuera
  `core/layout/tabs`; `/tabs/pokedex` redirige a `/pokedex`), `MapScene` (jugador provisional ×1,8, anillo que late,
  luces de día y de noche), `MapPage` (Google Maps vectorial zoom 19 / tilt 67,5°, modo oscuro 19:00-6:00 con
  `isNightLocal`, cámara que sigue al avatar y gira con la brújula, re-anclaje a 1 km, pausa fuera de pantalla, estado
  de error de Maps), HUD (`app-player-hud` + mochila, `app-map-compass` norte arriba/sigue, `app-weather-chip`) y
  `app-ball-menu`. Servidor: `weather` y `night` en `GET /spawns` (contrato en `shared/protocol/spawns.ts`, e2e 67/67).
  **Samsung A36:** 78/77/61 fps (quieto/joystick/menú abierto); Pokédex ida y vuelta, bloqueo y segundo plano sin
  fallos (dos fallos graves encontrados y arreglados, D-038; vidrio sin esmerilar sobre el mapa, D-039).
  App 167 tests, shared 140. Evidencias `F1-04_0{1..10}_*`.

- **F1-03 (Kenneth, PR #36 mezclado):** `shared/engine/geo.ts` (metros locales,
  igual que el servidor), `GpsFilter` (descarta > 50 m de error y saltos > 50 m en < 2 s, media ponderada de 4),
  `angles.ts`, `joystick-math.ts`, `AvatarMotion` (idle/walk/run), `LocationService` y `CompassService` (plugins por
  token, D-016), `app-joystick` (dedo + flechas), `app-location-gate` (pedir permiso / buscando / sin permiso / sin GPS
  / "GPS débil") y modo **"Sígueme"** en `/dev/mapa`. `@capacitor/geolocation` 8.2.3 exacto. **Samsung A36 por Neiva:**
  `walk` 0,6-1,2 m/s, `run` 3,3 m/s, ±3-5 m, el mapa gira con la brújula; sin permiso → pantalla de permisos; joystick
  con el dedo `walk`/`run` (4 m/s)/`idle`. App 150 tests, shared 140. D-037.
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

- Nadie. Samuel cerró **F3-06c** (PR a `develop`; sin migración). **Con esto la F3 está completa en código.**
- **Ojo:** el inventario de IS-11 está ahora en `/inventario` (la Pokédex 1025 ocupa `/pokedex`).

### PRUEBAS EN EL MÓVIL PENDIENTES (con el APK de producción, `npm run apk -- --install`)
- **F1-07 7b + F1-05 3b (en la calle, con luz, joystick APAGADO):** andar y trotar; fps ≥ 55 con Pokémon; grito
  bajito al acercarse; tocar lejos → "Acércate más"; cerca → encuentro.
- **F2-01 en el Redmi (D-045):** `/dev/ar`, campo de visión con el que el Pokémon se queda quieto y cámara elegida.
- **F3-02a 8b:** capturar un Pokémon y ver "+3 caramelos de …" en "¡Capturado!" (también vale desde el PC con joystick
  contra Render).
- **F3-02b 6b / F3-03 4b / F3-04 / F3-05:** abrir Mis Pokémon (scroll con 30+), una ficha (grito, barras, mapa mini, mote,
  favorito, transferir y deshacer), la Pokédex (generaciones, ficha de especie) y evolucionar (grito y vibración al
  aparecer la forma nueva, fluidez de la animación); fps ≥ 55 al desplazar. F3-02a hecha y en producción (#65). (F0-15 #63 y F3-01a #64 mezclados.)
- F1-05 y F1-07 siguen `[~]` (@alex) SOLO por su prueba en la calle (PENDIENTES).

## Siguiente paso concreto

1. **Sin móvil:** F5-01 (plan del PvP) o F2-10 (música). F7-07 nueva (personalizados como spawns, extra).
   **Probar sin tocar Supabase:** Postgres 17 portátil (`embedded-postgres@17.10.0-beta.17` en una carpeta temporal),
   `DATABASE_URL`/`DIRECT_URL` a él, `npx prisma migrate deploy` y `npm run db:seed`; comprobar con `prisma migrate
   status` que apunta a 127.0.0.1. La app en `localhost:8100` (en el PC de Samuel el 4200 lo ocupa OTRO proyecto suyo).
   Ojo: cada `npm run test:e2e` borra las cuentas `@pokecrud.test` de más de 1 h (también las `demo+…`).
2. **Con luz, en la calle (Kenneth o Samuel):** F1-07 7b + F1-05 3b con el APK de producción y el **joystick apagado**.
3. **F2-11** (ARCore, Android) · F1-11 / F2-16…F2-18 (arreglos vistos en el móvil) · sin móvil: F2-10 (música), F5-01 (plan del PvP).
4. APK en otro PC: JDK 21 (`winget install Microsoft.OpenJDK.21`; si da "el hash no coincide",
   `winget install EclipseAdoptium.Temurin.21.JDK`) y `npm run apk`.

## Bloqueos / roto / pendiente de humanos

### PENDIENTES DE HUMANOS — lista única (quien termine algo, lo marca `[x]`; cada tarea nueva añade aquí lo suyo)

**Kenneth o Samuel (revisión):**

- [x] (Samuel, 2026-10-12) Revisar y mezclar #21…#31: primero la cadena #22 → #31 y #21 al final (único con
      conflictos). GitHub NO reapuntó solo (el repo no borra las ramas mezcladas): la base se cambió a `develop` a mano.
- [x] Mezclar el PR #36 de **F1-03** (Kenneth, 2026-10-12).
- [x] Mezclar el PR #37 de **F1-04** (Kenneth, 2026-10-12). Render desplegó solo en < 2 min (`/spawns` con `weather`).

**Samuel (Render, solo él tiene acceso):**

- [x] `DATABASE_URL` → puerto **6543** en Render (F0-10, D-021). (2026-10-12)
- [x] Añadir **`SPAWN_SALT`** en Render (≥ 32 caracteres aleatorios, propia de Render). (2026-10-12)
- [x] ~~Manual Deploy tras cada mezcla~~: no hace falta, Render despliega solo al cambiar `develop` (comprobado).
- [x] Su `server/.env`: puerto 6543, `JWT_SECRET` y `SPAWN_SALT` propios. (2026-10-12)

**Quien haga F3-06b:**

- [x] (Samuel, 2026-10-13) Migración `20261013020000_team_caught` en Supabase ANTES de mezclar (2 equipos → `caughtIds` vacío).

**Quien haga F3-02a (tiene que tener `DIRECT_URL`):**

- [x] (Samuel, 2026-10-13) Migración `20261013010000_collection` + `npm run db:backfill-collection` en Supabase
      (12 capturas con PC, 12 filas de caramelos) ANTES de mezclar #65.

**Kenneth o Samuel (Android):**

- [ ] **F1-07 paso 7b:** en la calle con el APK de producción: ≥ 55 fps con los Pokémon de verdad (capa HTML, D-042), grito bajito al
      acercarse, tocar uno lejos → "Acércate más", uno al alcance → encuentro. Anotar cuántos había y los fps.
      (En casa con joystick ya: 13 en el feed, 118,8 fps, "Acércate más" y encuentro OK. Falta el GPS en la calle.)
- [ ] **F1-05 paso 3b:** andar y trotar con el APK, fps ≥ 55 en `/mapa` con el avatar nuevo (CDP). Marcar F1-05 `[x]`.
- [ ] **F2-01 (D-045) en otro móvil (Samuel, Redmi Note 10):** abrir `/dev/ar` por CDP (`history.pushState` + `popstate`;
      no hay botón), apuntar a un Pokémon sobre una mesa y girar despacio: con qué **campo de visión** se queda quieto
      (en el A36, 64°), qué cámara elige ("Cám. 0"?) y los fps de "Medir batería". Anotarlo en D-045.
- [x] (Kenneth, A36, 2026-10-12) **F2-04a paso 12:** `npm run apk -- --install` y seguir 12a-12e de `docs/plan/fases/F2-captura.md` (cámara
      principal, ≥ 55 fps por CDP, mapa ↔ encuentro ×3 sin "context lost" y el mapa con avatar/Pokémon al volver,
      cámara suelta en segundo plano, AR apagada y permiso revocado). Si todo va, F2-04a `[x]` en ROADMAP.
- [x] (Kenneth, A36, 2026-10-12; tras arreglar el gesto, D-050) **F2-05 paso 12b:** con el dedo: recto y firme acierta; flojo → "¡Casi!" y la mochila NO baja; torcido falla;
      una vuelta del dedo antes → curva; el aro cambia de color con Super/Frambu; "¡Genial!" al acertar dentro del aro.
- [x] (Kenneth, A36, 2026-10-12; 60 fps; datos móviles sin medir) **F2-12 paso 6:** encuentro con un modelo 3D (Charizard o Gengar si salen; si no, el que haya) → fps ≥ 55 con
      modelo + partículas (snippet de F2-04a 12c) y que el modelo pesado no tarde demasiado con datos móviles.
- [x] (Kenneth, A36, 2026-10-12; zoom débil → F2-16) **F2-04b paso 9b:** tocar un Pokémon en el mapa → crece → destello → cae con polvo, grito y vibración a la vez;
      un alado flota, un Fantasma semitransparente, un rápido salta más; fps con partículas ≥ 55; vídeo `F2-04b_*`.

**Kenneth:**

- [x] Probar el combate en su Android (2026-10-12): 2 combates enteros en el Samsung A36, fluido (mediana 104 fps), gritos y
      vibración OK. Evidencias `F4-05_{07..10}_a36-*.jpg`.
- [x] ~~**F1-01:** medir fps en su Android~~ → la retoma Samuel en su Redmi Note 10 (2026-10-12).
- [x] Su `server/.env`: `SPAWN_SALT` propia (64 caracteres) y `DATABASE_URL` en 6543 comprobado. (2026-10-12)

**F2-08 (audio):** (hecho por Alex, 2026-10-12)

- [x] SFX de golpe/crítico/debilitado para la escena de combate (D-044).
- [x] Precargar los gritos del combate al empezarlo (`AudioService.preloadCries`, 20 s de margen).

**Quien coja F8-02 / F8-04 (rendimiento y APK de release):**

- [x] (Alex, 2026-10-12) El registro de Capacitor escribía en la consola/logcat lo que lee `SecureStorage`, **incluido el
      refresh token**, y `npm run apk` siempre compila un APK de depuración (también el de Render). Arreglado en
      `capacitor.config.ts`: `loggingBehavior` = `'none'` salvo en el APK de desarrollo (`-- device`).
      **Comprobado (Kenneth, Samsung A36, 2026-10-12):** APK de producción, sesión recuperada al abrir (lee el token) →
      `adb logcat | grep -ic securestorage` = 0 y 0 líneas de `Capacitor/Plugin`.
- [ ] El APK pasó de 8,4 a 11,4 MB con `@capacitor/geolocation` (librería nativa de ubicación; `classes.dex` sin
      minificar). Medir con el de release (minify/R8).
- [ ] En el Samsung A36 (pantalla de 120 Hz) `/dev/mapa` con 30 Pokémon marca 40-120 fps según la zona; medir en F8-02.
      (`/mapa` de F1-04, solo con el avatar: 78/77/61 fps quieto/joystick/menú, D-039. Repetir cuando F1-07 traiga los Pokémon.)

**Alex:**

- [x] (D-042, 2026-10-12) Edificios 3D y Pokémon siempre encima: hechos (capa HTML).
- [x] (2026-10-12) Estilo del Map ID `5309ecf69efbfe12f3ecbc4c` sin POI comerciales: estilos `pokecrud-juego` (claro,
      edificios 3D, densidad de POI "Dispersa") y `pokecrud-juego-noche` (oscuro) con Comida y bebida, Venta minorista,
      Servicio, Alojamiento y Entretenimiento ocultos; asignados al modo claro y al oscuro del Map ID. Ojo: los estilos
      nuevos nacen con **Edificios 2D** (se cambia en el engranaje del editor, solo en el claro) y hay que **Publicar**
      tras Guardar; tarda unos minutos en llegar a la app.
- [x] (2026-10-12) Alex registrado y ADMIN (`npm run admin -- list` → alexpipe31w@gmail.com y samu1630).
- [ ] Postman (tras #21): poner `adminEmail`/`adminPassword` en SU entorno local de Postman.
- [ ] Antes del **2027-01-10**: tope de Google Maps o pasar a MapLibre (ver más abajo).
- [ ] Las 6 capturas `docs/evidencias/HU-02_*.jpg` se GUARDAN sin commitear: Alex las documentará más adelante (2026-10-12). No borrarlas.
- [x] (2026-10-12, Alex) `develop` protegida + CI obligatoria (F0-14): lint + tests + build de app y servidor en cada PR;
      no hace falta revisión, pero no se puede mezclar en rojo.
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
