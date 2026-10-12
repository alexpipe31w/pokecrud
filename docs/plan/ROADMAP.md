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
- [~] **F0-09 · Pipeline del APK** (@kenneth, 2026-10-11) — `npx cap add android`, permisos, icono y splash provisionales,
  script `npm run apk` documentado, APK instalado en un Android real mostrando `/dev/ui`.
  Dep: F0-04. Criterio: foto/captura del móvil + tamaño del APK en la bitácora.
- [ ] **F0-10 · Conexiones a la base: transaction pooler** — el _session pooler_ de Supabase admite 15 clientes en total
      y Render + cada servidor local (pool 5) los comparten (D-019). Pasar `DATABASE_URL` al _transaction pooler_ (6543,
      `?pgbouncer=true` si Prisma lo pide) en Render y en los `.env`, dejando `DIRECT_URL` para migraciones (D-017).
      Dep: F0-08. Criterio: e2e en paralelo + Render + 2 servidores locales a la vez sin `EMAXCONNSESSION` (salida en bitácora).

## F1 · Mapa con GPS

- [ ] **F1-01 · [SPIKE] Google Maps 3D + overlay three.js** — mapa vectorial con Map ID, tilt, overlay con
      un objeto 3D; medir fps en Android real. Decidir plan A/B (ARQUITECTURA §4) y anotarlo en DECISIONES.
      Dep: F0-09. Criterio: medición de fps en la bitácora + decisión escrita.
- [ ] **F1-02 · Plan detallado de F1** (`docs/plan/fases/F1-mapa.md`). Dep: F1-01.
- [ ] **F1-03 · Ubicación y brújula** — `LocationService` (watch, suavizado, descarte de saltos),
      `CompassService`, modo joystick, pantalla de permisos diseñada.
      Dep: F1-02. Criterio: tests del filtro; avatar se mueve suave caminando de verdad y con joystick.
- [ ] **F1-04 · Pantalla Mapa** — mapa como ruta principal (`/mapa`), estilo día/noche, cámara que sigue
      al avatar y rota con la brújula, HUD (avatar/nivel, brújula, clima, botón Poké Ball → menú).
      Quitar las pestañas de Ionic. Dep: F1-03, F0-07. Criterio: DISENO §1 cumplido; captura de día y de noche.
- [ ] **F1-05 · Avatar 3D** — personaje que camina/corre/se queda quieto según velocidad, sombra,
      círculo de alcance. Dep: F1-04.
- [ ] **F1-06 · Spawns deterministas** — `shared/engine/spawns.ts` + `rng.ts` con tests; endpoint
      `GET /spawns?lat&lng` (celdas a ≤ 200 m, salt solo en servidor, clima Open-Meteo con timeout y
      caché por celda 15 min). Dep: F0-06, F0-02. Criterio: misma entrada → mismos spawns (test); dos
      móviles en el mismo sitio ven lo mismo.
- [ ] **F1-07 · Pokémon en el mapa** — sprites en el overlay, hierba agitándose, aparición/desaparición
      animada, grito bajito por cercanía, toque → encuentro. Dep: F1-05, F1-06.
- [ ] **F1-08 · Inventario y XP básicos** — modelo `Inventory`, bolas iniciales, nivel/XP del jugador en
      el HUD. Dep: F0-07.

## F2 · Encuentro en AR y captura

- [ ] **F2-01 · [SPIKE] Cámara + giroscopio en el WebView** — getUserMedia vs camera-preview, AR por
      giroscopio, fps. Decisión en DECISIONES. Dep: F0-09.
- [ ] **F2-02 · Plan detallado de F2** (`docs/plan/fases/F2-captura.md`). Dep: F2-01.
- [ ] **F2-03 · Fórmula de captura** — `shared/engine/capture.ts` (+ huida) con tests de casos conocidos.
      Dep: F0-03.
- [ ] **F2-04 · Escena de encuentro** — cámara/fondo ilustrado, Pokémon a tamaño real con XS/XL,
      animación idle/esquiva por velocidad, efectos por tipo, transición desde el mapa (DISENO §5).
      Dep: F2-02, F1-07.
- [ ] **F2-05 · Lanzamiento** — gesto 1:1, física, curva, círculo de precisión, bolas y bayas, hápticos.
      Dep: F2-04.
- [ ] **F2-06 · Captura autoritativa en servidor** — `POST /encounters/:id/throw` con transacción,
      descuento atómico, `UNIQUE` de idempotencia, validación de distancia (ARQUITECTURA §6); test de
      concurrencia (dos lanzamientos simultáneos). Dep: F2-03, F1-06, F1-08.
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

- [ ] **F4-01 · Plan detallado de F4.** Dep: F0-03.
- [ ] **F4-02 · Tabla de tipos y stats** — `type-chart.ts`, `stats.ts` con tests (18×18 completa). Dep: F4-01.
- [ ] **F4-03 · Daño, precisión, crítico, prioridad** — `damage.ts` con tests comparados con una
      calculadora pública (anotar los casos). Dep: F4-02.
- [ ] **F4-04 · Estados y cambios de stats** — dentro de `battle-engine.ts` (reducer puro) con tests. Dep: F4-03.
- [ ] **F4-05 · Escena de combate** — UI de turnos, selección de movimiento con tipo/PP/efectividad
      prevista, animaciones por tipo, cola de eventos, textos en español, cambio de Pokémon. Dep: F4-04, F0-04.
- [ ] **F4-06 · IA rival** — elige el movimiento con mejor daño esperado con algo de aleatoriedad;
      entrenadores de prueba. Dep: F4-05.

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
