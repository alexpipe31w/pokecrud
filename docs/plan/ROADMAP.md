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
- [~] **F1-09 · Pantalla de "servidor despertando"** (@alex, 2026-10-12) — al abrir la app con Render dormido, el guardián espera a
      recuperar la sesión y la pantalla queda en blanco 20-30 s (visto en el A36). DISENO §6: mensaje simpático y reintento
      con backoff mientras `/auth/refresh` no responde. Dep: F0-07.
- [ ] **F1-10 · El HUD sigue al mapa (día/noche), no al modo oscuro del sistema** — hoy los tokens cambian con
      `prefers-color-scheme`: con el móvil en modo oscuro el HUD sale oscuro sobre el mapa de día (DISENO §1: "la UI sigue
      al mapa"). Dep: F1-04.
- [~] **F1-05 · Avatar 3D** (@alex, 2026-10-12) — personaje que camina/corre/se queda quieto según velocidad, sombra,
      círculo de alcance. Dep: F1-04.
      **Falta solo 3b:** probarlo en un Android real (andar y trotar, ≥ 55 fps). Código mezclado en `develop`.
- [x] **F1-06 · Spawns deterministas** (@alex, 2026-10-11) — `shared/engine/spawns.ts` + `rng.ts` con tests; endpoint
      `GET /spawns?lat&lng` (celdas a ≤ 200 m, salt solo en servidor, clima Open-Meteo con timeout y
      caché por celda 15 min). Dep: F0-06, F0-02. Criterio: misma entrada → mismos spawns (test); dos
      móviles en el mismo sitio ven lo mismo.
      **Hecho:** shared 22/22 (12 de spawns, con el dataset real: 0 legendarios en 20.000 celdas, >400 especies);
      server unit 21/21, e2e 46/46 (dos jugadores en el mismo sitio → respuesta idéntica). Probado en vivo con Open-Meteo
      real: 10 Pokémon a 200 m en Neiva. D-024, D-025. **Pendiente de humanos:** `SPAWN_SALT` en Render (Samuel) +
      Manual Deploy; sin ella `/spawns` da 503 y lo demás sigue igual.
- [~] **F1-07 · Pokémon en el mapa** (@alex, 2026-10-12) — **falta solo 7b (Android, ≥ 55 fps con los Pokémon);
      código mezclado en `develop`.** — sprites en el overlay, hierba agitándose, aparición/desaparición
      animada, grito bajito por cercanía, toque → encuentro. Dep: F1-05, F1-06.
- [x] **F1-08 · Inventario y XP básicos** (@alex, 2026-10-11) — modelo `Inventory`, bolas iniciales, nivel/XP del jugador en
      el HUD. Dep: F0-07.
      **Hecho:** modelo `Inventory` + `GET /bag` (kit 30/5/0/5 al registrarse y a los existentes), curva de nivel y
      `ProgressionService.addXp` atómico; placa `app-player-hud` (en `/dev/ui` hasta F1-04). shared 27/27, app 97/97,
      server 21/21 + e2e 53/53. D-026. Sale de F1-06: mezclar antes el PR #22.

## F2 · Encuentro en AR y captura

- [ ] **F2-01 · [SPIKE] Cámara + giroscopio en el WebView** — getUserMedia vs camera-preview, AR por
      giroscopio, fps. Decisión en DECISIONES. Dep: F0-09.
- [ ] **F2-02 · Plan detallado de F2** (`docs/plan/fases/F2-captura.md`). Dep: F2-01.
- [x] **F2-03 · Fórmula de captura** (@alex, 2026-10-11) — `shared/engine/capture.ts` (+ huida) con tests de casos conocidos.
      Dep: F0-03.
      **Hecho:** fórmula Gen III+ de ARQUITECTURA §6, huida por rareza/velocidad, `resolveThrow` con RNG inyectado;
      12 tests (casos calculados a mano + 40.000 lanzamientos que cuadran con la probabilidad). D-027.
- [ ] **F2-04 · Escena de encuentro** — cámara/fondo ilustrado, Pokémon a tamaño real con XS/XL,
      animación idle/esquiva por velocidad, efectos por tipo, transición desde el mapa (DISENO §5).
      Dep: F2-02, F1-07.
- [ ] **F2-05 · Lanzamiento** — gesto 1:1, física, curva, círculo de precisión, bolas y bayas, hápticos.
      Dep: F2-04.
- [x] **F2-06 · Captura autoritativa en servidor** (@alex, 2026-10-11) — `POST /encounters/:id/throw` con transacción,
      descuento atómico, `UNIQUE` de idempotencia, validación de distancia (ARQUITECTURA §6); test de
      concurrencia (dos lanzamientos simultáneos). Dep: F2-03, F1-06, F1-08.
      **Hecho:** `GET /encounters/:id` y `POST /encounters/:id/throw`; migración `capture` aplicada. e2e 11/11 (franja,
      distancia, gasto atómico, reintento ×5 a la vez = 1 bola, 3 capturas simultáneas = 1 gana, huida, sin bolas,
      antitrampa de precisión, validación). D-028.
- [ ] **F2-07 · Secuencia de captura/escape y shiny** — absorción, sacudidas, fanfarria, recompensas,
      pantalla de "¡Capturado!" con datos del individuo. Dep: F2-05, F2-06.
- [ ] **F2-08 · Audio del juego** — buscar/crear SFX y música libres, `CREDITOS.md`, mezcla y volúmenes.
      Dep: F0-05.

## F3 · Colección y Pokédex

- [ ] **F3-01 · Plan detallado de F3.** Dep: F2-07.
- [ ] **F3-02 · Mis Pokémon** — lista paginada con filtros (tipo, shiny, favorito), orden (PC, fecha, Nº),
      escalonado, vacía diseñada. Dep: F3-01.
- [ ] **F3-03 · Ficha del individuo** — arte, grito, PC, IVs, naturaleza, stats calculados, movimientos,
      dónde/cuándo se capturó, mapa mini, renombrar, transferir (con deshacer). Dep: F3-02.
- [ ] **F3-04 · Pokédex 1025** — vistos/capturados por generación, ficha de especie (descripción ES,
      debilidades calculadas, cadena evolutiva, altura/peso, hábitat). Dep: F3-01.
- [ ] **F3-05 · Evolución con caramelos** — regla de caramelos por cadena, endpoint transaccional,
      animación de evolución. Dep: F3-03.
- [ ] **F3-06 · Inventario (IS-11), equipos, favoritos y personalizados con la nueva UI** — reutilizar los servicios,
      modelo y formulario de IS-11 (HU-03 a HU-05) y las HU del curso (HU-08 a
      HU-18) rehechas con el sistema de diseño; los personalizados pueden aparecer como spawns del grupo.
      Dep: F0-08, F3-02.

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
      en el suelo real (three.js sobre la cámara + giroscopio, la misma base que el encuentro F2-04), ataques con
      partículas 3D del tipo, sacudida, número de daño. Reutiliza `BattleController`, el motor, la IA y el menú de
      F4-05 (solo cambia la capa visual). Sin cámara → fondo ilustrado. Dep: F2-01 (spike cámara), F4-05.
      Criterio: combate completo contra la IA en un Android real, grabado en vídeo.

## F5 · PvP en tiempo real

- [ ] **F5-01 · Plan detallado de F5** (contrato de mensajes en `shared/protocol/`). Dep: F4-04.
- [ ] **F5-02 · Gateway Socket.IO** — auth en handshake, salas, `seq` idempotente, reconexión. Dep: F5-01, F0-07.
- [ ] **F5-03 · Invitar / código / buscar rival** — emparejamiento y selección de equipo (nivel 50). Dep: F5-02.
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

## F8 · Pulido y entrega

- [ ] **F8-01 · Pasada de diseño completa** (si hay `impeccable`: `audit` + `polish`; si no, checklist DISENO).
- [ ] **F8-02 · Rendimiento** — 60 fps en mapa/captura/combate en gama media; tamaño de APK.
- [ ] **F8-03 · Revisión de seguridad del servidor** (skill `estandares-produccion`, modo Revisar).
- [ ] **F8-04 · APK de release firmado** + instrucciones de instalación.
- [ ] **F8-05 · Guion y ensayo de la demo** (VISION → "Qué se presenta"), modo demo (forzar shiny/spawn).
- [ ] **F8-06 · README y evidencias para Jira** al día.
