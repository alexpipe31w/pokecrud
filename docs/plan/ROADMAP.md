# Roadmap — PokéCRUD GO

> Estados: `[ ]` libre · `[~]` en curso `(@quién, fecha)` · `[x]` hecho (cumple TODO el criterio) · `[!]` bloqueado (motivo debajo).
> Reglas de uso en `CLAUDE.md`. Cada tarea está pensada para caber en **una sesión de Claude Pro**
> (si no cabe, se parte en `a`/`b` aquí mismo antes de empezar).
> **Antes de empezar la PRIMERA tarea de una fase**, quien la coja escribe el plan detallado de la
> fase en `docs/plan/fases/F<n>-<nombre>.md` con la skill `writing-plans` (archivos exactos, código,
> tests, comandos). Ese plan se commitea solo, antes del código.
> "Dep" = tareas que tienen que estar `[x]` antes.

---

## F0 · Fundaciones (sin esto no se puede construir nada encima)

- [x] **F0-01 · Plan detallado de F0** (@alex, 2026-10-11) — escribir `docs/plan/fases/F0-fundaciones.md` con `writing-plans`.
      Dep: —. Criterio: cubre F0-02…F0-09 con archivos, código y comandos exactos.
- [x] **F0-02 · Dataset completo desde PokéAPI** (@samuel, 2026-10-11) — `scripts/build-dataset.mjs` + `src/assets/data/`
      (`pokedex.json`, `moves.json`, `types.json`) según ARQUITECTURA §3.
      Dep: F0-01. Criterio: 1025 especies con nombre y descripción en español (fallback inglés si no hay),
      tipos, stats, captureRate, evolución, learnset; script reanudable con caché; tamaño medido y anotado;
      test que valida forma y conteo.
- [x] **F0-03 · `shared/` + tooling** (@samuel, 2026-10-11) — carpeta `shared/` con alias `@shared/*` en `tsconfig.json`,
      Vitest corriendo `shared/**/*.spec.ts`, instalar `three` (versión exacta en D-003).
      Dep: F0-01. Criterio: `npm test` ejecuta un spec de `shared/` y uno de `src/`; build OK.
- [x] **F0-04 · Sistema de diseño base** (@samuel, 2026-10-11) — `src/theme/tokens.scss` (DISENO §2), fuente display
      autoalojada, componentes `GameButton`, `TypeChip`, `GlassPanel`, `StatBar`, `HpBar` con estados
      `:active`, háptico y sonido de toque; página `/dev/ui` que los muestra todos.
      Dep: F0-03. Criterio: captura móvil 390×844 de `/dev/ui` en la bitácora; sin colores sueltos fuera de tokens.
- [x] **F0-05 · Servicios base de la app** (@samuel, 2026-10-11) — `DatasetService` (carga + IndexedDB + `Map`),
      `AudioService` (buses, desbloqueo, caché de gritos), `HapticsService`, `SettingsService` (volúmenes,
      reducir efectos, modo joystick) con signals.
      Dep: F0-02, F0-03. Criterio: tests unitarios; en `/dev/ui` se oye el grito de un Pokémon al pulsar.
- [x] **F0-06 · Servidor NestJS esqueleto** (@samuel, 2026-10-11) — `server/` con Nest 12, Prisma, Postgres, ValidationPipe
      global, throttler, helmet, logger JSON, `/health`, `.env.example`, migración inicial con `Player` y
      `RefreshToken`. Elegir y documentar dónde se despliega (Render + Supabase propuesto).
      Dep: F0-01. Criterio: `npm run start:dev` en `server/` responde `/health`; migración aplicada; desplegado
      con URL anotada en ESTADO.md.
      **Desplegado:** https://pokecrud-server.onrender.com (Render, cuenta de Samuel, rama `develop`).
- [x] **F0-07 · Auth completo** (@samuel, 2026-10-11) — registro/login/refresh/logout (argon2id, JWT 15 min, refresh rotatorio),
      rate limit en login, pantalla de login/registro con el sistema de diseño, guard en la app, interceptor
      que refresca, almacenamiento seguro (D-006).
      Dep: F0-04, F0-06. Criterio: tests de servidor (login correcto, contraseña mala, refresh reutilizado
      = revocado); flujo completo probado en navegador y en móvil.
      **Hecho:** servidor (11 e2e) y app (login/registro/sesión probados en navegador 390×844). El Keystore nativo se
      prueba en un Android real con el APK (F0-09). Ampliaciones respecto al plan: D-018.
- [x] **F0-08 · CRUD del curso migrado** (@kenneth, 2026-10-11) — `/pokemon` (inventario de IS-11: `price`, `stock`), `/teams`, `/favorites`, `/customPokemon` en Nest con el mismo
      contrato + filtro por jugador + paginación; Postman actualizado; `backend/` archivado (D-004).
      Dep: F0-07. Criterio: la colección de Postman pasa entera contra el servidor nuevo (captura del runner).
      **Hecho:** Runner de Postman 79/79 (`docs/evidencias/F0-08_01_postman-runner-nest.png`) y Newman 44 peticiones /
      79 comprobaciones / 0 fallos (`F0-08_01_newman-runner.txt`). Ampliaciones respecto al plan: D-019.
- [x] **F0-09 · Pipeline del APK** (@kenneth, 2026-10-11) — `npx cap add android`, permisos, icono y splash provisionales,
      script `npm run apk` documentado, APK instalado en un Android real mostrando `/dev/ui`.
      Dep: F0-04. Criterio: foto/captura del móvil + tamaño del APK en la bitácora.
      **Hecho:** APK de producción 8,18 MB en un Samsung A36 (Android 16): splash, Pokédex desde Render, `/dev/ui`
      con sesión que sobrevive a cerrar la app (Keystore), grito y vibración. Evidencias `F0-09_0{1,2,3}_*.png`. D-020.
- [x] **F0-10 · Conexiones a la base: transaction pooler** (@kenneth, 2026-10-11) — el _session pooler_ de Supabase admite 15 clientes en total
      y Render + cada servidor local (pool 5) los comparten (D-019). Pasar `DATABASE_URL` al _transaction pooler_ (6543,
      `?pgbouncer=true` si Prisma lo pide) en Render y en los `.env`, dejando `DIRECT_URL` para migraciones (D-017).
      Dep: F0-08. Criterio: e2e en paralelo + Render + 2 servidores locales a la vez sin `EMAXCONNSESSION` (salida en bitácora).
      **Hecho:** 2 servidores locales + Render + e2e en paralelo: 2.516 consultas, 0 fallos; e2e en paralelo 8/8. D-021.
      **Pendiente de humanos:** Samuel cambia `DATABASE_URL` a 6543 en Render; Alex y Samuel, el puerto en su `server/.env`.
- [x] **F0-11 · Zona segura en Android 15+ (edge-to-edge)** (@kenneth, 2026-10-11) — con `targetSdk` 36 la app se dibuja bajo la barra de
      estado: en `/dev/ui` el título se cruza con la hora (`F0-09_01_apk-movil-dev-ui.png`); la Pokédex con `ion-header`
      sí la respeta. Aplicar `env(safe-area-inset-*)` en el layout base para toda pantalla sin `ion-header`.
      Dep: F0-09. Criterio: captura en Android real sin solapes en `/dev/ui`, login y registro.
      **Hecho:** regla global en `src/global.scss` (D-022); Samsung A36: `/dev/ui`, login y registro sin solapes ni scroll
      extra, Pokédex sin cambios. Evidencias `F0-11_0{1,2,3}_*.png`.
- [x] **F0-12 · Solo un admin escribe en el inventario `/pokemon`** (@alex, 2026-10-11) — hoy cualquier cuenta (el registro es
      abierto y el repo/Render son públicos) puede crear, editar o borrar los 151 del inventario compartido. Añadir rol
      `ADMIN` a `Player` (leído de la BD en cada escritura, no del token) y exigirlo en POST/PUT/PATCH/DELETE de `/pokemon`.
      Dep: F0-08. Criterio: jugador normal → 403, sin sesión → 401, admin → 2xx (e2e + Postman); la app oculta agregar/editar
      a quien no es admin; script para dar/quitar el rol.
      **Hecho:** migración `player_role` aplicada en Supabase; e2e 45/45 (4 nuevos casos de rol); Postman 82/82 con newman;
      app 94/94. D-023. **Pendiente de humanos:** nombrar al primer ADMIN (`npm run admin -- grant <correo>`).
      (Render despliega solo al mezclar en `develop`: no hace falta Manual Deploy.)
- [x] **F0-13 · Artefactos de compilación en `shared/`** (@samuel, 2026-10-12) — la primera `npm run build` del servidor tras D-024 dejó 42
      `.js`/`.d.ts`/`.js.map` junto a las fuentes de `shared/` (Samuel, 2026-10-12; probable `tsconfig.build.tsbuildinfo`
      viejo, no se reproduce compilando desde cero). Riesgo: subirlos por error o que Vite/Vitest/Node usen el `.js` viejo
      en vez del `.ts`. Dep: F1-06. Criterio: reproducir la causa o descartarla; `.gitignore` que impida subirlos sin
      ocultar archivos legítimos (`shared/package.json`); si la causa es la caché, que `npm run build` la limpie.
      **Hecho:** causa reproducida (compilar con la config previa a D-024 emite en `shared/`) y comprobado que Vitest usa
      el `.js` viejo en vez del `.ts`. `scripts/clean-shared-artifacts.mjs` en los ganchos pre* de raíz, `server/` y APK,
      y `.gitignore`. D-036.
- [x] **F0-15 · Tests pesados de `shared/` sin tiempo propio** (@samuel, 2026-10-13) — en el PC de Samuel
      `npm run test:shared` falla a veces por "Test timed out in 5000ms": las simulaciones de captura (40.000
      lanzamientos), spawns y RNG tardan 3,6-7,3 s (en el CI van más rápido). Los de combate e IA ya llevan `120_000`.
      Criterio: los tests de simulación llevan su tiempo propio (no el global, que escondería cuelgues de verdad) y
      `test:shared` pasa 3 veces seguidas en el PC de Samuel.
      **Hecho:** la lentitud eran los `expect` dentro de los bucles (hasta ~100.000 por test): ahora se apuntan los casos
      malos y hay un solo `expect` con la lista (el fallo sigue diciendo cuáles; comprobado saboteando los IVs). Los 5
      tests pasan de 1,3-7,3 s a 3-251 ms y llevan `SIMULATION_TIMEOUT_MS` (30 s) por si acaso. 147/147 ×3.

## F1 · Mapa con GPS

- [x] **F0-14 · CI y `develop` protegida** (@alex, 2026-10-12) — pendiente de la revisión de F0. Criterio: cada PR a
      `develop` pasa lint + tests + build de la app y del servidor en GitHub Actions y no se puede mezclar en rojo.
      **Hecho:** `.github/workflows/ci.yml` (app: lint, `ng test`, `test:shared`, build; servidor: lint, unitarios,
      build; los e2e siguen siendo locales porque necesitan la base real). `develop` exige los dos trabajos en verde,
      sin exigir revisión (cada uno mezcla su PR).
- [x] **F1-01 · [SPIKE] Google Maps 3D + overlay three.js** (@alex + @samuel, 2026-10-12) — mapa vectorial con Map ID, tilt, overlay con
      un objeto 3D; medir fps en Android real. Decidir plan A/B (ARQUITECTURA §4) y anotarlo en DECISIONES.
      Dep: F0-09. Criterio: medición de fps en la bitácora + decisión escrita.
      **Hecho (Alex):** `/dev/mapa` con plan A (three.js) y plan B (markers), medidor y "Medir batería"; medido en PC.
      **Hecho (Samuel):** medido en un Redmi Note 10 (Mali-G76): three.js × 30 = 58,4 fps, 0 % tirones; markers × 30 =
      52,3 fps. **Plan A, máximo 30 Pokémon dibujados** (D-035). Evidencias `F1-01_0{3,4}_redmi-*.png`.
- [x] **F1-02 · Plan detallado de F1** (@samuel, 2026-10-12) (`docs/plan/fases/F1-mapa.md`). Dep: F1-01.
      **Hecho:** plan de F1-03, F1-04, F1-05 y F1-07 con archivos, código y tests (TDD), pasos con casilla y riesgos.
- [x] **F1-03 · Ubicación y brújula** (@kenneth, 2026-10-12) — `LocationService` (watch, suavizado, descarte de saltos),
      `CompassService`, modo joystick, pantalla de permisos diseñada.
      Dep: F1-02. Criterio: tests del filtro; avatar se mueve suave caminando de verdad y con joystick.
      **Hecho:** `geo.ts`, `GpsFilter`, ángulos, joystick, `AvatarMotion`, `LocationService`/`CompassService`,
      `app-joystick`, `app-location-gate` y modo "Sígueme" en `/dev/mapa` (app 150 tests, shared 140). Samsung A36
      caminando por Neiva: `walk` 0,6-1,2 m/s, `run` 3,3 m/s, ±3-5 m, el mapa gira con la brújula; sin permiso →
      pantalla de permisos; joystick con el dedo `walk`/`run` 4 m/s/`idle`. Evidencias `F1-03_0{1..7}_*`. D-037.
- [x] **F1-04 · Pantalla Mapa** (@kenneth, 2026-10-12) — mapa como ruta principal (`/mapa`), estilo día/noche, cámara que sigue
      al avatar y rota con la brújula, HUD (avatar/nivel, brújula, clima, botón Poké Ball → menú).
      Quitar las pestañas de Ionic. Dep: F1-03, F0-07. Criterio: DISENO §1 cumplido; captura de día y de noche.
      **Hecho:** `/mapa` principal (sin pestañas; `/pokedex` con botón atrás), `MapScene`, `MapPage` (día/noche, cámara,
      pausa fuera de pantalla), HUD (placa, brújula, clima de `GET /spawns`), menú de la Poké Ball, estado de error de Maps.
      Servidor: `weather` y `night` en `GET /spawns` (contrato en `shared/protocol/spawns.ts`). app 167 tests, shared 140,
      server 22 + e2e 67. Samsung A36: 78/77/61 fps (quieto/joystick/menú), Pokédex ida y vuelta y segundo plano sin
      fallos. Evidencias `F1-04_0{1..10}_*` (día y noche: 01-02). D-038, D-039.
- [x] **F1-09 · Pantalla de "servidor despertando"** (@alex, 2026-10-12) — al abrir la app con Render dormido, el guardián espera a
      recuperar la sesión y la pantalla queda en blanco 20-30 s (visto en el A36). DISENO §6: mensaje simpático y reintento
      con backoff mientras `/auth/refresh` no responde. Dep: F0-07.
      **Hecho:** `AuthService` distingue 401 (sesión perdida) de "no responde" (red, 5xx, timeout) y en ese caso
      reintenta con espera 2-4-8-15 s hasta 2 min (`RESTORE_RETRY`), sin mandar al login ni borrar el token; pasados
      1,5 s marca `waking` y `app-server-waking` enseña una Poké Ball que se tambalea, mensajes que se turnan y el
      intento. Probado apagando y encendiendo el servidor local (F1-09_01…03). D-043.
- [x] **F1-10 · El HUD sigue al mapa (día/noche), no al modo oscuro del sistema** — hoy los tokens cambian con
      `prefers-color-scheme`: con el móvil en modo oscuro el HUD sale oscuro sobre el mapa de día (DISENO §1: "la UI sigue
      al mapa"). Dep: F1-04. (@alex, 2026-10-12)
      **Hecho:** colores de superficie de día y de noche como mixins en `tokens.scss`, usados con
      `prefers-color-scheme` (resto de pantallas, sin cambios) y como clases `.theme-day`/`.theme-night`, que `MapPage`
      pone en su raíz según `night()`. Probado: móvil oscuro + mapa de día → HUD claro; móvil claro + mapa de noche →
      HUD oscuro; el login sigue al sistema (F1-10_01/02).
- [~] **F1-05 · Avatar 3D** (@alex, 2026-10-12; prueba en Android: @kenneth, 2026-10-12) — personaje que camina/corre/se queda quieto según velocidad, sombra,
      círculo de alcance. Dep: F1-04.
      **Falta solo 3b:** probarlo en un Android real (andar y trotar, ≥ 55 fps). Código mezclado en `develop`.
      (Kenneth, A36, 2026-10-12: en casa con joystick el mapa va a 118,8 fps; falta salir a andar y trotar con el GPS.)
- [x] **F1-06 · Spawns deterministas** (@alex, 2026-10-11) — `shared/engine/spawns.ts` + `rng.ts` con tests; endpoint
      `GET /spawns?lat&lng` (celdas a ≤ 200 m, salt solo en servidor, clima Open-Meteo con timeout y
      caché por celda 15 min). Dep: F0-06, F0-02. Criterio: misma entrada → mismos spawns (test); dos
      móviles en el mismo sitio ven lo mismo.
      **Hecho:** shared 22/22 (12 de spawns, con el dataset real: 0 legendarios en 20.000 celdas, >400 especies);
      server unit 21/21, e2e 46/46 (dos jugadores en el mismo sitio → respuesta idéntica). Probado en vivo con Open-Meteo
      real: 10 Pokémon a 200 m en Neiva. D-024, D-025. **Pendiente de humanos:** `SPAWN_SALT` en Render (Samuel) +
      Manual Deploy; sin ella `/spawns` da 503 y lo demás sigue igual.
- [~] **F1-07 · Pokémon en el mapa** (@alex, 2026-10-12; prueba en Android: @kenneth, 2026-10-12) — **falta solo 7b (Android, ≥ 55 fps con los Pokémon);
      código mezclado en `develop`.** — sprites en el overlay, hierba agitándose, aparición/desaparición
      animada, grito bajito por cercanía, toque → encuentro. Dep: F1-05, F1-06.
      (Kenneth, A36, 2026-10-12: APK de producción con 13 Pokémon de Render en el feed, 118,8 fps, p95 8,4 ms, 0 %
      tirones; tocar lejos → "Acércate más para atraparlo", cerca → encuentro. Falta la calle con el GPS de verdad.)
- [ ] **F1-11 · El joystick arranca donde estás, no en el Parque Santander** — `joystickMode` se guarda en ajustes
      (D-037) y al reabrir la app `MapPage` pone el avatar en `DEFAULT_CENTER` si no hay posición: Kenneth (A36) lo
      tenía activado desde la prueba de permisos de F1-03 y "el avatar no está en mi ubicación"; además nada en la
      pantalla dice que va en joystick ni cómo volver al GPS (está en el menú de la Poké Ball). Propuesta: con permiso
      de ubicación, el joystick arranca en la primera posición del GPS (o la última guardada); aviso pequeño "Modo
      joystick" con acceso a "Usar GPS". Dep: F1-03.
      (Kenneth: desactivarlo en el menú de la Poké Ball lo lleva a su ubicación; lo que falta es que se note. Baja prioridad.)
- [x] **F1-08 · Inventario y XP básicos** (@alex, 2026-10-11) — modelo `Inventory`, bolas iniciales, nivel/XP del jugador en
      el HUD. Dep: F0-07.
      **Hecho:** modelo `Inventory` + `GET /bag` (kit 30/5/0/5 al registrarse y a los existentes), curva de nivel y
      `ProgressionService.addXp` atómico; placa `app-player-hud` (en `/dev/ui` hasta F1-04). shared 27/27, app 97/97,
      server 21/21 + e2e 53/53. D-026. Sale de F1-06: mezclar antes el PR #22.

## F2 · Encuentro en AR y captura

- [x] **F2-01 · [SPIKE] Cámara + giroscopio en el WebView** (@kenneth, 2026-10-12) — getUserMedia vs camera-preview, AR por
      giroscopio, fps. Decisión en DECISIONES. Dep: F0-09.
      **Hecho:** `/dev/ar` medido en el Samsung A36: `getUserMedia` funciona (camera-preview descartado), 60 fps con
      Pokémon + 400 partículas y 0 % tirones, vídeo ~24 fps en interior. `facingMode` abre el gran angular → elegir
      "camera 0" por `deviceId`. `RelativeOrientationSensor` 56 Hz y más suave que `deviceorientation`; deriva ≤ 0,2°
      en 20 s; calibrado FOV 64° y retraso 80 ms. Sin WebXR (AR solo de orientación). Cámara y sensores se sueltan al
      salir y en segundo plano; 3 idas y vueltas al mapa sin perder el contexto WebGL. Evidencias `F2-01_0{1..6}_*`. D-045.
      Código para F2-04: `game/encounter-scene/device-pose.ts` y `pose-delay.ts` (17 tests).
- [x] **F2-02 · Plan detallado de F2** (@kenneth, 2026-10-12) (`docs/plan/fases/F2-captura.md`). Dep: F2-01.
      **Hecho:** plan de F2-04a, F2-04b, F2-05 y F2-07 con TODO el código y sus tests, **verificado capa a capa antes de
      subirlo** (estado final: app 393 tests, shared 143, servidor 22; los diffs del plan reproducen ese estado byte a
      byte). F2-04 partida en F2-04a/F2-04b. D-046. F2-10 (música) queda fuera: no depende de él.
- [x] **F2-03 · Fórmula de captura** (@alex, 2026-10-11) — `shared/engine/capture.ts` (+ huida) con tests de casos conocidos.
      Dep: F0-03.
      **Hecho:** fórmula Gen III+ de ARQUITECTURA §6, huida por rareza/velocidad, `resolveThrow` con RNG inyectado;
      12 tests (casos calculados a mano + 40.000 lanzamientos que cuadran con la probabilidad). D-027.
- [x] **F2-04a · Escena de encuentro en AR (base)** (@alex, 2026-10-12; prueba en Android: @kenneth, 2026-10-12) — `/encuentro/:id` definitivo: cámara trasera principal de fondo
      (o fondo ilustrado sin permiso / sin cámara / AR apagada), Pokémon a tamaño real con XS/XL anclado con el
      giroscopio, placa, "Huir", estados de error; cámara y sensores se sueltan al salir (D-045). Dep: F2-02, F1-07.
      Criterio: Android ≥ 55 fps; mapa ↔ encuentro ×3 sin perder el contexto WebGL. Plan: `fases/F2-captura.md`.
      **Hecho (pasos 1-11, PR):** `/encuentro/:id` definitivo; lint/build OK, app 63 archivos / 307 tests. Navegador
      390×844: escena con fondo ilustrado, aviso sin permiso, interruptor AR, "Huir", mapa ↔ encuentro ×3 sin errores.
      **Android (Kenneth, Samsung A36, APK de producción):** "camera 0" (principal) 720p; Diggersby 3D + partículas
      **60 fps, p95 16,7 ms, 0 % tirones**; 3 entradas sin "context lost" y el mapa en 3D al volver; Inicio suelta la
      cámara y al volver se reabre; AR apagada y sin permiso → fondo ilustrado y el aviso; el Pokémon se queda en su
      sitio al girar el móvil. Evidencias `F2-04a_0{5,6,7}_a36-*`. (Pikachu a 2 m no salió: tamaño no comparado.)
- [x] **F2-04b · Personalidad, efectos del tipo y entrada** (@alex, 2026-10-12; prueba en Android: @kenneth, 2026-10-12) — idle/saltos por velocidad, vuelo, fantasma, partículas
      del tipo, transición desde el mapa, aterrizaje con polvo + grito + vibración, destello shiny (DISENO §5).
      Dep: F2-04a. Criterio: Android ≥ 55 fps con partículas; vídeo de la entrada.
      **Hecho (pasos 1-9a, PR):** personalidad, saltos con semilla, partículas por tipo, aterrizaje con polvo + grito +
      vibración, destello shiny, zoom desde el mapa; arreglo de partículas negras (D-047). App 66 archivos / 333 tests.
      **Android (Kenneth, A36):** 60 fps con partículas; grito y vibración a la vez al aterrizar (Kenneth); Bramblin
      (Planta/Fantasma) semitransparente y flotando; vídeo `F2-04b_04_a36-entrada-al-encuentro.mp4`. El "crece hacia el
      centro" se nota poco → F2-16.
- [x] **F2-12 · Pokémon en 3D (.glb) en el encuentro (D-048)** — el arte plano pasa a ser el modelo 3D de
      `Pokemon-3D-api/assets` (@alex, 2026-10-12; prueba en Android: @kenneth, 2026-10-12) (cargado desde su URL, NO se sube al repo): `GLTFLoader` + `DRACOLoader` (decodificador
      servido por la app), tamaño real por su caja (altura PokéAPI × XS/XL), animación si la trae, giro hacia la cámara,
      sombra; los 57 sin modelo y los shiny sin modelo → el arte plano de ahora (o tinte shiny). Con la AR de orientación
      actual; arrastrar con el dedo lo gira. Dep: F2-04b. Criterio: navegador + Android ≥ 55 fps con el modelo.
      **Hecho (pasos 1-5, PR):** Pikachu, Charizard (vuela), Gengar (fantasma semitransparente) en 3D con su animación;
      #850 sin modelo → plano; giro con el dedo. App 67 archivos / 347 tests.
      **Android (Kenneth, A36):** modelo + partículas 60 fps; los `.glb` tardan 232-678 ms por Wi-Fi (con datos móviles
      sin medir). Los anchos (Slowpoke XL) se salen de la pantalla → F2-15.
- [x] **F2-13 · Ficha del Pokémon junto a él en la cámara (D-048)** (@alex, 2026-10-12) — tarjeta anclada al lado del Pokémon (sigue su
      posición en pantalla): tipos (iconos), nivel, **PC** (lo calcula el servidor con los IVs y viene en
      `GET /encounters/:id`), altura y peso reales × XS/XL, categoría ("Pokémon Ratón") y descripción de Pokédex en
      español (`genus`/`flavor` del dataset). **Alex: la ficha sale SOLO al pulsar un botón y se vuelve a esconder al
      pulsarlo otra vez** (cerrada por defecto, que no invada la pantalla). Dep: F2-04a.
      **Hecho:** PC del servidor (D-049, e2e 11/11), botón ⓘ con `aria-expanded`, ficha al lado del Pokémon o bajo la
      cabecera; probada con un encuentro REAL (Kricketot Nv. 22, PC 81). App 350 tests, shared 144.
- [ ] **F2-11 · Spike ARCore en Capacitor (D-048)** — plugin nativo Android propio (Kotlin): sesión ARCore, imagen de
      la cámara, pose del móvil y matriz de proyección por fotograma hacia three.js, detección del suelo y ancla.
      Medir en el A36 y el Redmi: Pokémon `.glb` quieto en el suelo al **rodearlo andando**, ≥ 55 fps, sin ARCore →
      fallback de orientación. Dep: F2-12. **Necesita Android (Kenneth/Samuel).**
- [ ] **F2-14 · Encuentro con ARCore (D-048)** — el encuentro usa el plugin de F2-11: tocar el suelo detectado (o
      automático) pone al Pokémon; se le puede rodear; el lanzamiento (F2-05) funciona igual. Dep: F2-11.
- [x] **F2-15 · Los Pokémon anchos caben en la pantalla** (@kenneth, 2026-10-12) — `encounterDistance` solo mira la ALTURA (máx(2 m, 1,8 ×
      altura), D-045), pero en vertical la pantalla abarca ~32° de ancho frente a 64° de alto: un Slowpoke XL (1,75 m,
      largo) "ocupaba prácticamente toda la pantalla" (Kenneth, A36) y Diggersby a 2 m se salía por los lados. Que la
      distancia tenga en cuenta también el ancho (`aspect` del modelo/arte y el de la pantalla) y que, si el modelo
      llega después de colocarlo, se recoloque. Ojo: la caja del lanzamiento y el aro dependen de esa distancia
      (`throw-physics.ts`). Dep: F2-12.
      **Hecho (D-051):** la distancia también mira el ancho (≤ 70 % de la pantalla) y se mide desde el FRENTE del
      Pokémon (los largos, + media profundidad); se recoloca al llegar el modelo. A36 con Slowpoke XL forzado por CDP:
      antes llenaba la pantalla, ahora ~52 % del ancho, 59,6 fps (`F2-15_01`). App 413 tests. Queda: en los largos el aro
      y la caja del lanzamiento siguen en su centro (se ven más pequeños que su cara).
- [ ] **F2-17 · Captura legible con los Pokémon lejanos** (visto en el A36, `F2-07_*`): con un Pokémon grande y lejos
      (Abomasnow, F2-15 lo aleja) la bola en el suelo es un punto de pocos píxeles y las sacudidas no se ven; las
      estrellas doradas del "¡Capturado!" apenas se notan. Ideas: que la bola caiga más cerca de la cámara (o acercar la
      cámara durante las sacudidas) y estrellas más grandes/brillantes alrededor de la bola. Dep: F2-07.
- [ ] **F2-18 · Modelos 3D que se ven oscuros** — el `.glb` de Abomasnow (#460) sale gris oscuro en el encuentro desde
      que carga (su arte es blanco); los demás probados se ven bien. Mirar sus materiales (`metalness`/`roughness`, mapa
      de entorno, espacio de color de la textura) y, si son varios, una corrección general al cargar. Dep: F2-12.
- [ ] **F2-16 · Entrada al encuentro más clara** (visto en el A36, vídeo `F2-04b_04`): (1) la copia del Pokémon que
      "crece hacia el centro" casi no se ve: hereda `transform-origin: 0 0` del original (crece hacia abajo-derecha) y
      se apaga del todo en 320 ms; (2) tras el toque el mapa se queda ~0,4 s quieto (espera a `reportPosition`) y
      luego ~1 s de "Buscando al Pokémon…" en un fondo vacío; (3) la cámara llega ~2 s después de que el Pokémon
      aterrice, y al cambiar a AR el Pokémon se vuelve a colocar delante. Dep: F2-04b.
- [x] **F2-05 · Lanzamiento** (@alex, 2026-10-12; prueba en Android y arreglo: @kenneth, 2026-10-12) — gesto 1:1, física, curva, círculo de precisión, bolas y bayas, hápticos.
      Dep: F2-04b, F2-12 (la caja del Pokémon sale del modelo 3D). (Fallar no llama al servidor ni gasta, D-046.)
      **Hecho (pasos 1-12a, PR):** gesto, física, curva, aro, bolas y Frambu, servidor con reintentos; adaptado a F2-12
      y F2-13. Navegador con encuentro REAL: fallos sin gastar, acierto → capturado, mochila 30→29, +110 XP.
      App 72 archivos / 390 tests.
      **Android (Kenneth, A36) — 12b falló y se arregló (D-050):** con el dedo se acertaban **3 de 117** (la fuerza tenía
      que ser 1.800 px/s ± 4 %) y la curva no salía nunca (se medía alrededor del punto de agarre). Ahora zona buena de
      fuerza 1.000-3.600 px/s y curva por el giro del dedo, con tests hechos con sus gestos reales. Después: 3 de 5
      aciertos con su puntería, curva con `curve=true` en el servidor, flojo → "¡Casi!" sin gastar, torcido falla, el
      aro cambia de color con Super/Frambu, "¡Genial!"/"¡Excelente!", la mochila baja solo al acertar, Ultra a 0
      apagada. App 73 archivos / 406 tests.
- [x] **F2-06 · Captura autoritativa en servidor** (@alex, 2026-10-11) — `POST /encounters/:id/throw` con transacción,
      descuento atómico, `UNIQUE` de idempotencia, validación de distancia (ARQUITECTURA §6); test de
      concurrencia (dos lanzamientos simultáneos). Dep: F2-03, F1-06, F1-08.
      **Hecho:** `GET /encounters/:id` y `POST /encounters/:id/throw`; migración `capture` aplicada. e2e 11/11 (franja,
      distancia, gasto atómico, reintento ×5 a la vez = 1 bola, 3 capturas simultáneas = 1 gana, huida, sin bolas,
      antitrampa de precisión, validación). D-028.
- [x] **F2-07 · Secuencia de captura/escape y shiny** (@kenneth, 2026-10-12) — absorción, sacudidas, fanfarria, recompensas,
      pantalla de "¡Capturado!" con datos del individuo. Dep: F2-05, F2-06.
      **Hecho:** coreografía (`capture-sequence.ts`), absorción del plano Y del modelo 3D (encoge hacia los pies, luz
      roja con `emissive`), sonidos absorb/shake/capture/escape, naturalezas ES (las 25 comprobadas con PokéAPI), tarjeta
      "¡Capturado!" y la página. App 75 archivos / 435 tests, shared 147, servidor 22. **A36:** Abomasnow (escape a la
      primera, luego 3 sacudidas → capturado) y Bellsprout (2 escapes y capturado), XP del HUD 590 → 900, bolas solo al
      acertar; con Render la bola espera ~1,5 s en el suelo. Evidencias `F2-07_0{1..4}_a36-*`. Vistos → F2-17, F2-18.
- [x] **F2-08 · Audio del juego** (@alex, 2026-10-12) — buscar/crear SFX y música libres, `CREDITOS.md`, mezcla y volúmenes.
      Dep: F0-05.
      **Hecho (SFX; la música pasa a F2-10):** 12 efectos GENERADOS en el juego (`sfx-synth.ts`: recetas de
      osciladores y ruido, D-044), sin archivos ni licencias de terceros; sonidos del combate (golpe normal / muy
      eficaz / poco eficaz / crítico, fallo, debilitado, curación, estadísticas, estado, victoria; `battle-sfx.ts`);
      precarga de todos los gritos al empezar el combate (con datos móviles el primero no sonaba); mezcla en el bus
      `sfx` con su volumen de Ajustes; `src/assets/audio/CREDITOS.md`. Para escucharlos: `docs/evidencias/F2-08_sfx/*.wav`.
- [ ] **F2-10 · Música** — tema del mapa (bucle tranquilo, de día y de noche) y del combate, libre (CC0/CC BY con
      atribución en CREDITOS.md) o propia; bus `music` (ya existe, con volumen en Ajustes), fundido al cambiar de
      pantalla, nunca dos a la vez. Dep: F2-08.

## F3 · Colección y Pokédex

- [x] **F3-01a · Plan de F3 (parte 1): colección** (@samuel, 2026-10-13) — `docs/plan/fases/F3-coleccion.md`: Mis
      Pokémon (F3-02), ficha del individuo (F3-03) y lo que el servidor debe empezar a guardar YA al capturar (caramelos
      por familia, Pokédex visto/capturado), para que nada capturado desde hoy se pierda. Dep: F2-07.
      **Hecho:** plan de F3-02a, F3-02b y F3-03 con contrato, código y tests (TDD). F3-02 partida en a/b.
- [x] **F3-01b · Plan de F3 (parte 2): Pokédex, evolución y CRUD del curso** (@samuel, 2026-10-13) — mismo archivo: F3-04, F3-05, F3-06.
      Dep: F3-01a.
      **Hecho:** parte 2 de `fases/F3-coleccion.md` (valores de los tests comprobados contra el dataset y la tabla de
      tipos reales). IS-11 pasa de `/pokedex` a `/inventario` (en F3-04 paso 1). F3-06 partida en F3-06a/b/c.
- [x] **F3-02a · Colección en el servidor (URGENTE)** (@samuel, 2026-10-13) — al capturar se guarda el PC, +3 caramelos por familia y la
      Pokédex; abrir un encuentro marca "visto"; `GET /collection` (cursor, orden, filtros) y `GET /pokedex`; script que
      recupera lo capturado antes. **Migración + script en Supabase ANTES de mezclar.** Plan: `fases/F3-coleccion.md`.
      Dep: F3-01a.
      **Código hecho (pasos 1-7, PR):** e2e 78/78, unitarios 22, shared 155, app 435 contra un Postgres 17 portátil;
      script probado dos veces (idempotente). D-052. **Paso 8 hecho:** migración + script en Supabase (12 capturas con
      PC, 12 filas de caramelos) y DESPUÉS #65 mezclado; Render lo sirve (`/collection` → 401 sin sesión). La captura
      real en producción (8b) no se hizo (Samuel decidió dejarla; lo cubren los e2e).
- [x] **F3-02b · Mis Pokémon (pantalla)** (@samuel, 2026-10-13) — lista paginada con filtros (tipo, shiny, favorito), orden (PC, fecha, Nº),
      escalonado, vacía diseñada; "+3 caramelos" en "¡Capturado!". Dep: F3-02a.
      **Hecho:** `/coleccion` (menú de la Poké Ball → "Mis Pokémon"): rejilla con PC, nivel, tinte del tipo, ★ y borde
      dorado si es shiny, entrada escalonada; carga por cursor al bajar; hoja de orden (Recientes/PC/Nº, ↑↓) y filtros
      (18 tipos, Shiny, Favoritos) al momento; cargando, vacía, vacía con filtros y error. "+3 caramelos de Pichu" y "Ver
      en Mis Pokémon" en "¡Capturado!"; la lista se recarga tras capturar. Probado en vista móvil 390×844 contra el Nest y
      un Postgres locales con 35 capturas (`F3-02_0{1..4}_*`). Pendiente opcional: scroll en un Android (no usa GPS/cámara).
- [x] **F3-03 · Ficha del individuo** (@samuel, 2026-10-13) — arte, grito, PC, IVs, naturaleza, stats calculados, movimientos,
      dónde/cuándo se capturó, mapa mini, renombrar, transferir (con deshacer). Dep: F3-02b.
      **Hecho:** servidor `GET/PATCH/DELETE /collection/:id` (IVs y stats solo para su dueño, mote con la regla de
      shared/, transferir +1 caramelo en una transacción; e2e 82/82). App `/coleccion/:id`: arte + grito, PC, mote ✎,
      favorito ★, tipos, altura/peso × XS/XL, caramelos de la familia, valoración (★ y %), IVs, stats con ▲▼ de la
      naturaleza, movimientos, fecha/bola y mapa mini (solo al verse; si falla, coordenadas); transferir con confirmación
      y "Deshacer" 5 s (`PendingTransfer` + `TransferService`). "Ver en Mis Pokémon" abre la ficha del recién capturado.
      Probado en vista móvil con Nest y Postgres locales (`F3-03_0{1..5}_*`). Pendiente opcional: un Android.
- [x] **F3-04 · Pokédex 1025** (@samuel, 2026-10-13) — vistos/capturados por generación, ficha de especie (descripción ES,
      debilidades calculadas, cadena evolutiva, altura/peso, hábitat). Dep: F3-01b, F3-02a.
      **Hecho:** IS-11 se mudó a `/inventario` (menú "Inventario"; `/tabs/pokedex` redirige; `/pokemon/…` igual).
      `/pokedex`: 9 generaciones con "capturados/total", celdas sin ver (silueta, ???) / vistas / capturadas (Poké Ball);
      `/pokedex/:id`: arte, categoría, tipos, descripción ES, altura/peso, generación, hábitat ES, grito, debilidades
      (`defenseProfile`) y cadena (`evolutionTree`, método en ES; ramas en 2 columnas); sin ver → solo silueta. La ficha
      del individuo enlaza a su especie. Probado en vista móvil con Nest y Postgres locales (`F3-04_0{1..4}_*`).
- [x] **F3-05 · Evolución con caramelos** (@samuel, 2026-10-13) — regla de caramelos por cadena (D-053: 50 si la cadena tiene una
      evolución; 25 y 100 si tiene dos), `POST /collection/:id/evolve` transaccional, animación de evolución. Dep: F3-03.
      **Hecho:** `shared/engine/evolution.ts` (`evolutionOptions`); servidor con gasto condicional de caramelos y cambio de
      especie solo si sigue siendo la de origen (dos a la vez → 200 y 409, se cobra una vez; e2e 87/87). App: panel en la
      ficha (un botón por rama con el arte del destino; "Te faltan N"; confirmación) y escena a pantalla completa
      (`evolvePose`: silueta A↔B acelerando → destello → forma nueva con grito y vibración; espera al servidor; error →
      vuelve a A; "Reducir movimiento" → fundido). Probado en vista móvil con Nest y Postgres locales (`F3-05_0{1..9}_*`).
      Pendiente opcional: un vistazo en Android.
- [x] **F3-06a · Inventario de IS-11 con la nueva UI** (@samuel, 2026-10-13) — `/inventario`, detalle, agregar y editar (HU-03/04/05/14)
      con el sistema de diseño, mismos servicios, modelo, formulario y contrato; Postman sigue pasando. Dep: F3-04.
      **Hecho:** `/inventario` en tarjetas (`app-inventory-card`: tinte del tipo, precio dorado, stock y "Agotado"),
      buscador del juego (`app-search-field`), "Agregar" solo ADMIN; ficha `/pokemon/:id` con barras `app-stat-bar`,
      editar y eliminar con `app-confirm-panel` (sin `alert` de Ionic, D-055); formulario con `forms.scss` y tipos en
      chips (máx. 2); agregar desde PokéAPI con tarjetas de resultado. Servicios, modelo y contrato sin cambios.
      Postman 46 peticiones / 82 comprobaciones / 0 fallos contra el servidor local (`F3-06a_01`). App 485 tests.
      Probado en vista móvil como admin y como jugador (`F3-06a_0{2..8}_*`).
- [x] **F3-06b · Equipos con Pokémon capturados** (@samuel, 2026-10-13) — `Team.caughtIds` (≤ 6, solo tuyos; `pokemonIds` se conserva por
      el contrato del curso, D-054), quitar del equipo al transferir; pantalla `/equipos` que elige de "Mis Pokémon".
      Dep: F0-08, F3-02b.
      **Hecho:** migración `team_caught` (UUID[] + CHECK ≤ 6) **aplicada en Supabase antes de mezclar**; `/teams` acepta
      `caughtIds` (solo tuyos, sin repetir; comprobados con `FOR SHARE` en la misma transacción) y `PUT` sin ellos los
      conserva; transferir los quita de los equipos en su transacción; `GET /collection?ids=` para pintarlos. App:
      `/equipos` (huecos con arte y PC, PC total, vacía diseñada) y editor `/equipos/nuevo` · `/equipos/:id` (elige de
      "Mis Pokémon" con `app-collection-card` en modo selección, máx. 6; borrar con confirmación); "Equipos" en el menú.
      e2e 94, app 495, Postman 46/82/0. Probado en vista móvil (`F3-06b_0{1..6}_*`).
- [x] **F3-06c · Favoritos y Pokémon personalizados** (@samuel, 2026-10-13) — `/favoritos` (desde la ficha de la Pokédex, nota y 1-5) y
      `/personalizados` (crear/editar) con el sistema de diseño; contratos sin cambios. Que los personalizados salgan como
      spawns del grupo → extra de F7. Dep: F0-08, F3-04.
      **Hecho:** favoritos: botón "♡ Favorito" en la ficha de especie con hoja de estrellas táctiles (1-5, 44 px) y nota;
      `/favoritos` con estrellas y nota (abre la ficha); personalizados: `/personalizados` (imagen o silueta, tipos,
      total) y editor `/personalizados/nuevo` · `/:id` (nombre, 1-2 tipos con `app-type-picker`, 4 stats con
      deslizadores y `app-stat-bar`, URL con vista previa y silueta si no carga, descripción, borrar con confirmación).
      "Favoritos" y "Personalizados" en el menú. Servidor sin cambios; Postman 46/82/0. App 514. Vista móvil
      (`F3-06c_0{1..7}_*`).

## F4 · Motor de combate y combate contra IA

- [x] **F4-01 · Plan detallado de F4.** (@alex, 2026-10-11) Dep: F0-03.
      **Hecho:** `docs/plan/fases/F4-combate.md` (contrato del motor, reglas, 550/706 movimientos en v1, pasos por tarea).
- [x] **F4-02 · Tabla de tipos y stats** (@alex, 2026-10-11) — `type-chart.ts`, `stats.ts` con tests (18×18 completa). Dep: F4-01.
      **Hecho:** 324 casillas de PokéAPI = tabla oficial; stats = ejemplo de Bulbapedia (Garchomp nv 78); dataset con
      `target`/`flinchChance`/`metaCategory` y `statChangeTarget` (D-029). shared 71/71.
- [x] **F4-03 · Daño, precisión, crítico, prioridad** (@alex, 2026-10-11) — `damage.ts` con tests comparados con una
      calculadora pública (anotar los casos). Dep: F4-02.
      **Hecho:** 10 casos × 16 tiradas idénticas a `@smogon/calc` 0.12.0 (motor de calc.pokemonshowdown.com);
      548 movimientos soportados y la captura solo asigna esos. shared 99/99, server 22/22 + e2e 64/64. D-030.
- [x] **F4-04 · Estados y cambios de stats** (@alex, 2026-10-11) — dentro de `battle-engine.ts` (reducer puro) con tests. Dep: F4-03.
      **Hecho:** `createBattle` + `resolveTurn` (puro, determinista); 27 tests por regla + 1.000 combates aleatorios que
      terminan sin errores + instantánea de un combate completo. shared 126/126. D-031.
- [x] **F4-05 · Escena de combate** (@alex, 2026-10-11) — UI de turnos, selección de movimiento con tipo/PP/efectividad
      prevista, animaciones por tipo, cola de eventos, textos en español, cambio de Pokémon. Dep: F4-04, F0-04.
      **Hecho:** `/combate/prueba` contra los 3 entrenadores con la IA; probado entero en vista móvil 390×844 (victoria,
      cambio forzado, eficacias). D-033. Probado en Android real (Kenneth, Samsung A36, 2026-10-12: fluido, gritos y vibración). Pendiente: SFX de golpe (F2-08).
      **OJO (D-034): es la escena TEMPORAL en 2D.** La definitiva es F4-07 (AR con cámara).
- [x] **F4-06 · IA rival** (@alex, 2026-10-11) — elige el movimiento con mejor daño esperado con algo de aleatoriedad;
      entrenadores de prueba. Dep: F4-05.
      **Hecho:** `ai.ts` + 3 entrenadores; difícil gana al fácil 71,8 % (500 espejo) y al azar 95,7 %. Conectarla a la
      escena es el paso 1 de F4-05 (D-032).
- [ ] **F4-07 · Combate en realidad aumentada (D-034)** — la escena de combate con la cámara: los dos Pokémon anclados
      en el suelo real (three.js sobre la cámara + giroscopio, la misma base que el encuentro F2-04a), ataques con
      partículas 3D del tipo, sacudida, número de daño. Reutiliza `BattleController`, el motor, la IA y el menú de
      F4-05 (solo cambia la capa visual). Sin cámara → fondo ilustrado. Dep: F2-01 (spike cámara), F4-05, F2-12, F2-14
      (D-048: modelos 3D y ARCore también en el combate).
      Criterio: combate completo contra la IA en un Android real, grabado en vídeo.

## F5 · PvP en tiempo real

- [x] **F5-01 · Plan detallado de F5** (@alex, 2026-10-13) (contrato de mensajes en `shared/protocol/`). Dep: F4-04.
      **Hecho:** `docs/plan/fases/F5-pvp.md` (F5-02…F5-05 paso a paso) y contrato `shared/protocol/pvp.ts` (compila en
      app y servidor). Spike de Socket.IO en Nest 12 verificado y borrado: los guards globales rompen el socket
      (JwtAuthGuard revienta; ThrottlerGuard pierde mensajes) → arreglos medidos en el plan. D-056.
- [x] **F5-02 · Gateway Socket.IO** (@alex, 2026-10-13) — auth en handshake, salas, `seq` idempotente, reconexión. Dep: F5-01, F0-07.
      **Hecho:** `server/src/pvp/` (gateway `/pvp` con JWT en el handshake, sala `player:<id>`, máx. 3 sockets por
      jugador, 20 mensajes / 10 s por socket, validación en el borde, `pvp:hello`), guards globales solo HTTP (D-056) y
      `PvpSocketService` en la app (token vigente en cada reconexión, un reintento tras `unauthorized`). Las salas de
      combate y la idempotencia por `decision` (el `seq` de antes) son de F5-04, según el plan.
- [x] **F5-03 · Invitar / código / buscar rival** (@alex, 2026-10-13) — emparejamiento y selección de equipo (nivel 50). Dep: F5-02.
      **Hecho:** servidor (`PvpTeamsService` equipo a nivel 50, `PvpLobby` código de 6 letras / 5 min y cola FIFO,
      `BattleRoomsService` empieza el combate de verdad y sabe rendirse, `viewFor` en `shared/`) y pantalla `/pvp`
      (arena: elegir equipo, invitar, escribir código, buscar rival, cara a cara con el tipo de cada Pokémon). En el
      menú de la Poké Ball: "Combate en vivo". Los turnos llegan en F5-04. D-057.
- [ ] **F5-04 · Combate PvP completo** — servidor aplica el engine, temporizador 30 s, abandono 60 s,
      resultado persistido; la escena de F4-05 reutilizada. Dep: F5-03, F4-05. Criterio: combate entre dos
      móviles reales grabado en vídeo.
- [ ] **F5-05 · Espectadores.** Dep: F5-04.

## F6 · Torneos

- [ ] **F6-01 · Plan detallado de F6.** Dep: F5-04.
- [ ] **F6-02 · Crear/unirse por código** — cupo atómico, inscripción idempotente. Dep: F6-01.
- [ ] **F6-03 · Bracket y avance de rondas** — transaccional con bloqueo (ARQUITECTURA §8), test de dos
      finales simultáneas. Dep: F6-02.
- [ ] **F6-04 · Pantalla de bracket en vivo + campeón** — animaciones y celebración. Dep: F6-03.

## F7 · Mundo y social (extras)

- [ ] **F7-01 · Poképaradas y gimnasios** desde OpenStreetMap (Overpass con timeout y caché en servidor).
- [ ] **F7-02 · Amigos** (código de amigo) **e intercambio** transaccional.
- [ ] **F7-03 · Incursiones cooperativas** (varios jugadores vs un jefe, socket).
- [ ] **F7-04 · Huevos y distancia caminada.**
- [ ] **F7-05 · Ranking y logros/medallas.**
- [ ] **F7-06 · Habilidades en combate** (subconjunto de las más comunes).
- [ ] **F7-07 · Pokémon personalizados como spawns del grupo** (extra de F3-06c): que los de `/customPokemon` aparezcan
      en el mapa para el grupo; necesita reglas de spawn propias y moderar las imágenes de terceros (URL libre).

## F8 · Pulido y entrega

- [ ] **F8-01 · Pasada de diseño completa** (si hay `impeccable`: `audit` + `polish`; si no, checklist DISENO).
- [ ] **F8-02 · Rendimiento** — 60 fps en mapa/captura/combate en gama media; tamaño de APK.
- [ ] **F8-03 · Revisión de seguridad del servidor** (skill `estandares-produccion`, modo Revisar).
- [ ] **F8-04 · APK de release firmado** + instrucciones de instalación.
- [ ] **F8-05 · Guion y ensayo de la demo** (VISION → "Qué se presenta"), modo demo (forzar shiny/spawn).
- [ ] **F8-06 · README y evidencias para Jira** al día.
