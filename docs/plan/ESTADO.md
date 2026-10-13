# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-12 noche · por Alex (Claude) · `develop` (F2-04a pasos 1-11 mezclados)

## ⚠️ DECISIÓN DE ALEX (2026-10-12, noche): la AR tiene que ser 3D y enseñar la ficha del Pokémon

Alex: "todo en cámara debe ser 3D… deben salir las características del pokémon". **Decidido: D-048** — modelos
`.glb` de `Pokemon-3D-api/assets` (968/1025, cargados desde su URL, NO al repo) + **ARCore** con plugin nativo propio
para rodear al Pokémon + **ficha** junto a él (tipos, nivel, PC del servidor, altura/peso, descripción). Orden nuevo en
ROADMAP: **F2-12 (modelo 3D) → F2-13 (ficha) → F2-11 (spike ARCore, Android) → F2-14 → F2-05 → F2-07**; F4-07 también.

## RELEVO DE ALEX (2026-10-12, noche): F2-04a, F2-04b y F2-12 (Pokémon en 3D) en `develop` a falta del Android

- **F2-12 hecho:** el encuentro usa el modelo 3D `.glb` (D-048) con su animación, personalidad, partículas y giro con el
  dedo; sin modelo → arte plano. Evidencias `F2-12_*`. Siguiente: **F2-13** (ficha que se abre/cierra con un botón).
- **F2-13 hecho:** botón ⓘ en la cabecera del encuentro abre/cierra la ficha (tipos, nivel, PC del servidor, altura,
  peso, categoría, descripción). Siguiente: con Android, **F2-11 (spike ARCore)**; sin Android, **F2-05**
  (lanzamiento: solo depende de F2-04b y F2-12, se hace en el PC).
  Para MIRAR una especie concreta en el navegador: `page.route('**/encounters/*', r => r.fulfill({json: {...}}))`.

- **F2-04b pasos 1-9a hechos** (personalidad, partículas, aterrizaje, destello, zoom desde el mapa). Fallo encontrado
  en el navegador y arreglado: las partículas se veían como puntos NEGROS sobre el canvas transparente (D-047).
  App 66 archivos / 333 tests. Evidencias `F2-04b_*`.

- **F2-04a pasos 1-11 hechos** copiando el plan de Kenneth tal cual con TDD (cada spec falló antes y pasó después):
  lint OK, build OK sin avisos de presupuesto, **app 63 archivos / 307 tests** (el plan decía 62/306: estaba mal
  contado por uno; `develop` tenía 57/278, −3 del spec provisional + 32 nuevos = 307), shared 140.
- **Navegador 390×844** (Nest local + `ng serve`): Gulpin y Chansey reales a su tamaño con sombra, fondo ilustrado,
  "Sin permiso de cámara: modo sin AR.", AR apagada → "Sin giroscopio…", "Huir" vuelve a `/mapa` y destruye la página;
  mapa ↔ encuentro ×3 sin ningún error de consola. Evidencias `F2-04a_00/02/04_navegador-*`.
- **Ojo al probar:** entrar con `history.pushState` + `popstate` deja VIVO el encuentro anterior (Ionic no lo destruye)
  y el segundo `WebGLRenderer` falla ("reading 'precision'"). En la app real no pasa: se entra con
  `router.navigateByUrl` (en consola: `ng.getComponent(document.querySelector('app-map')).router.navigateByUrl('/encuentro/<id>')`).
  Antes, mandar la posición (`GET /spawns?lat&lng` a ≤ 80 m) o da 403.
- **Visto en el navegador, también en `develop` (no es de F2-04a):** al volver de CUALQUIER encuentro, el avatar y los
  Pokémon del mapa no se repintan en Chromium headless hasta recargar. Mirarlo en Android en el paso 12d.
- **Siguiente:** paso 12 de F2-04a con el A36 o el Redmi (está en PENDIENTES). Sin móvil se puede seguir con
  **F2-04b** (plan, sección F2-04b), que se apoya en este código.

## 👉 RELEVO DE KENNETH A ALEX (2026-10-12, noche)

Todo mezclado en `develop` con el CI en verde (PR #48 y #49):

1. **F2-01 · spike de cámara + giroscopio (PR #48, D-045)**, medido en el Samsung A36 con `/dev/ar`:
   - `getUserMedia` funciona en el WebView → sin plugin nativo (camera-preview descartado).
   - 60 fps con Pokémon + 400 partículas, 0 % tirones. El vídeo va a ~24 fps en interior (autoexposición): aceptado.
   - **`facingMode: 'environment'` abre el GRAN ANGULAR en el A36**: hay que elegir "camera 0" por `deviceId`.
   - Orientación con `RelativeOrientationSensor` (56 Hz, más suave); `deviceorientation` deja de llegar con el móvil
     quieto. Calibrado a ojo: campo de visión vertical **64°** y retraso de la orientación **80 ms**.
   - Sin WebXR en el WebView → AR solo de orientación (como el AR clásico de Pokémon GO).
   - Cámara y sensores se sueltan al salir y en segundo plano; mapa ↔ AR ×3 sin perder el contexto WebGL (D-038).
   - Sin permiso → fondo ilustrado. Un `<video>` vacío pinta un póster gris con "play": ocultarlo hasta su 1.er fotograma.
   - Código reutilizable: `src/app/game/encounter-scene/device-pose.ts` y `pose-delay.ts`.
2. **Seguridad del APK (#47):** comprobado en el A36 → logcat ya NO saca el refresh token (ver PENDIENTES).
3. **F2-02 · plan de F2 (PR #49, D-046):** `docs/plan/fases/F2-captura.md` con F2-04a, F2-04b, F2-05 y F2-07 (F2-04
   partida en a/b). **Todo su código se escribió y se probó capa a capa antes de subir el plan** y luego se borró:
   estado final app 393 tests, shared 143, servidor 22, lint y build OK; los diffs del plan aplicados en orden dan ese
   código byte a byte. Ejecutarlo = seguir los pasos con TDD copiando el código; lo único sin probar es el móvil.
   D-046: la app solo decide si la bola TOCA; el servidor todo lo demás; **fallar no llama al servidor ni gasta**; el
   mismo gesto vale a 2 m o a 12 m; curva = girar el dedo ~1 vuelta alrededor de la bola; el aro es la zona real que
   cuenta; la animación de captura empieza al golpear y tapa lo que tarda Render.

**Cómo empezar:** `/inicio` (y `npm install` en la raíz y en `server/`; no cambiaron dependencias). Leer D-045 y D-046.
Del plan, solo la cabecera ("Antes de empezar") y la sección de tu tarea (~6.400 líneas porque trae todo el código).

**Siguiente tarea: F2-04a · escena del encuentro en AR (base).** Pasos 1-11: código y tests copiados del plan (al
acabar: lint OK, build OK, 62 archivos / 306 tests). El paso 12 necesita un Android (el A36 de Kenneth o el Redmi de
Samuel): ≥ 55 fps, cámara principal, mapa ↔ encuentro ×3, AR apagada y sin permiso; si no hay móvil, el 12 a
PENDIENTES y la tarea en `[~]`. Después: F2-04b → F2-05 → F2-07 (cada una su rama y su PR).

**Trucos:** a `/dev/ar` (el spike, sigue para medir otros móviles) no hay botón: por CDP,
`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` y en la consola
`history.pushState({}, '', '/dev/ar'); dispatchEvent(new PopStateEvent('popstate', { state: {} }))`. Capturas del
móvil con `adb exec-out screencap -p > captura.png` (por CDP no salen ni WebGL ni la cámara). Para abrir un encuentro
sin salir a la calle: joystick (menú de la Poké Ball) hasta ≤ 40 m de un Pokémon y tocarlo.

**Samuel, lo tuyo sigue igual:** 7b de F1-07 y 3b de F1-05 con tu Redmi, y si puedes, abre `/dev/ar` en el Redmi para
comprobar el campo de visión (en el A36 fue 64°; ver PENDIENTES).

## RELEVO DE ALEX A SAMUEL (2026-10-12, noche)

Hoy (Alex) quedó todo mezclado en `develop` con el CI en verde (PR #38-#46):
F1-05 avatar 3D · F1-07 Pokémon en el mapa (hierba, grito por cercanía, toque → `/encuentro/:id` provisional) ·
D-042 Pokémon en HTML **encima** de los edificios 3D · F1-09 pantalla "servidor despertando" + reintentos de sesión ·
F1-10 el HUD sigue al día/noche del mapa · F2-08 efectos de sonido generados + precarga de gritos · F0-14 CI y
`develop` protegida · estilo del Map ID sin negocios (día y noche) · Alex ADMIN.

1. **Cómo trabajamos ahora:** rama `feature/…` → PR → **lo mezclas tú mismo** en cuanto el CI esté verde (lint + test +
   build de app y servidor). `develop` está protegida: no deja mezclar en rojo ni push directo.
2. **Con tu Redmi (Android), lo más valioso:** `npm run apk -- --install` y en la calle: 7b de F1-07 (≥ 55 fps con
   Pokémon, grito, toque → encuentro) y 3b de F1-05 (avatar). Mide fps por CDP. Si van bien, marca las dos `[x]`.
   ~~Lo de logcat~~, ~~F2-01~~ y ~~F2-02~~: hechos por Kenneth (ver arriba). Lo siguiente de la AR es F2-04a.
3. **Sin móvil:** F2-10 (música) o F5-01 (plan del PvP).
4. **Leer antes de tocar el mapa:** D-038, D-039, D-040, D-041, D-042 (los Pokémon son `<img>` en `.pokemon-layer`
   colocados desde `MapOverlay.onBeforeDraw`; la hierba y la sombra siguen en three.js). Sonido: D-044.
5. Para probar en el navegador: servidor (`cd server && npm run start:dev`) + `npm start`, cuenta `@pokecrud.test`
   y bórrala al acabar; joystick desde el menú de la Poké Ball. Escuchar los efectos: `docs/evidencias/F2-08_sfx/*.wav`.
6. **No borrar** las 6 capturas `docs/evidencias/HU-02_*.jpg` sin commitear: Alex las documentará.

**Importante (D-034):** la escena de combate de `/combate/prueba` es **temporal**. Alex quiere el combate **en
realidad aumentada con la cámara**. Lo que hay debajo (motor, IA, controlador, textos, menú) se reutiliza; solo cambia
la parte visual (F4-07).

## Fase actual

**F0 completa** (en `develop`). **F4 (combate) completa en código** a falta de la versión AR (F4-07). **F1 a medias:**
spike (F1-01), plan (F1-02), ubicación y brújula (F1-03), **pantalla `/mapa` (F1-04)**,
spawns (F1-06), mochila/XP (F1-08) y **avatar 3D (F1-05, falta probarlo en Android)** hechos; faltan los Pokémon en
el mapa (F1-07). **F2:**
fórmula (F2-03), captura en servidor (F2-06), audio (F2-08), **spike de cámara + giroscopio (F2-01)** y **plan
(F2-02)** hechos; lo siguiente es F2-04a → F2-04b → F2-05 → F2-07 siguiendo `docs/plan/fases/F2-captura.md`.

## Hecho

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

- F2-04a (@alex) · pasos 1-11 mezclados en `develop`; tarea `[~]` solo por el paso 12 (Android, ver PENDIENTES). F1-05 (3b) y F1-07 (7b) solo esperan la prueba en Android.
- F2-04b (@alex) · pasos 1-9a mezclados en `develop`; `[~]` solo por el 9b (Android, ver PENDIENTES).
- F2-12 (@alex) · pasos 1-5 mezclados en `develop`; `[~]` solo por el 6 (Android). Siguiente: **F2-13** (ficha con botón).
- F2-13 hecha (ficha con botón, PC del servidor, D-049).
- F2-05 (@alex) · pasos 1-12a mezclados en `develop`; `[~]` solo por el 12b (Android). Siguiente sin Android: **F2-07**.

## Siguiente paso concreto

1. **F2-04a · escena del encuentro en AR** siguiendo `docs/plan/fases/F2-captura.md` (skill `executing-plans`):
   el código está en el plan, paso a paso con TDD; el criterio es probarlo en un Android (fps, cámara, ida y vuelta).
2. **Con Android:** 7b de F1-07 y 3b de F1-05 (Samuel, en la calle); FOV de `/dev/ar` en el Redmi.
3. **Sin Android:** F2-10 (música) o F5-01 (plan del PvP).
3. Para generar el APK en otro PC: JDK 21 (`winget install Microsoft.OpenJDK.21`; si da "el hash no coincide",
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

**Kenneth o Samuel (Android):**

- [ ] **F1-07 paso 7b:** en la calle con el APK de producción: ≥ 55 fps con los Pokémon de verdad (capa HTML, D-042), grito bajito al
      acercarse, tocar uno lejos → "Acércate más", uno al alcance → encuentro. Anotar cuántos había y los fps.
- [ ] **F1-05 paso 3b:** andar y trotar con el APK, fps ≥ 55 en `/mapa` con el avatar nuevo (CDP). Marcar F1-05 `[x]`.
- [ ] **F2-01 (D-045) en otro móvil (Samuel, Redmi Note 10):** abrir `/dev/ar` por CDP (`history.pushState` + `popstate`;
      no hay botón), apuntar a un Pokémon sobre una mesa y girar despacio: con qué **campo de visión** se queda quieto
      (en el A36, 64°), qué cámara elige ("Cám. 0"?) y los fps de "Medir batería". Anotarlo en D-045.
- [ ] **F2-04a paso 12:** `npm run apk -- --install` y seguir 12a-12e de `docs/plan/fases/F2-captura.md` (cámara
      principal, ≥ 55 fps por CDP, mapa ↔ encuentro ×3 sin "context lost" y el mapa con avatar/Pokémon al volver,
      cámara suelta en segundo plano, AR apagada y permiso revocado). Si todo va, F2-04a `[x]` en ROADMAP.
- [ ] **F2-05 paso 12b:** con el dedo: recto y firme acierta; flojo → "¡Casi!" y la mochila NO baja; torcido falla;
      una vuelta del dedo antes → curva; el aro cambia de color con Super/Frambu; "¡Genial!" al acertar dentro del aro.
- [ ] **F2-12 paso 6:** encuentro con un modelo 3D (Charizard o Gengar si salen; si no, el que haya) → fps ≥ 55 con
      modelo + partículas (snippet de F2-04a 12c) y que el modelo pesado no tarde demasiado con datos móviles.
- [ ] **F2-04b paso 9b:** tocar un Pokémon en el mapa → crece → destello → cae con polvo, grito y vibración a la vez;
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
