# Decisiones

> Registro de decisiones que **no se re-discuten** sin motivo nuevo. Si cambias una, no la borres:
> márcala `SUSTITUIDA por D-0XX` y añade la nueva al final. Formato: contexto → decisión → por qué.

## D-001 · No se empieza de cero: se reaprovecha el repo y se rehace la app (2026-10-11, Alex + Claude)

El repo tenía el proceso Scrum/Git, JSON Server y la entrega IS-11 de Samuel (08-10): Pokédex/inventario con
CRUD sobre `/pokemon` (151 sembrados, con `price` y `stock`), detalle, agregar desde PokéAPI, editar, búsqueda,
scroll infinito, servicios con tests (HU-03, HU-04, HU-05). _Corrección 2026-10-11: la primera versión de esta
decisión decía "solo placeholders" porque se revisó un `develop` local sin actualizar._
**Decisión:** se conserva el repo, el historial, Jira, el flujo de ramas, la DoD, Angular+Ionic+Capacitor
y el CRUD del curso; se rehace por completo la experiencia (mapa como pantalla principal, sin pestañas).
El código de IS-11 (servicios `PokeApiService`/`PokemonService`, modelo, formulario, tests) **se reutiliza**: lo
que cambia es la presentación (DISENO.md) y la navegación.
**Por qué:** "empezar de cero" no ahorra nada (hay código útil y probado) y sí perdería el
historial que el profe ya vio. Lo "básico y feo" era la idea, no la base técnica.

## D-002 · Stack de la app: Angular 22 + Ionic 9 + Capacitor 8 (2026-10-11)

Se mantiene el stack del curso. Capacitor da el APK de Android. **Confirmado por el profe (2026-10-11):**
se puede sustituir JSON Server por backend propio (NestJS) conservando los endpoints (ver D-004).

## D-003 · three.js para todo lo 3D (mapa, AR, combate) (2026-10-11)

Una sola librería 3D para las tres escenas. Fijar la versión exacta al instalar (F0-03) y anotarla aquí.
Los Pokémon se representan con su arte oficial `home` en billboard + animación procedimental, no con
modelos 3D: no hay modelos libres de las 1025 especies y así todas se ven con la misma calidad.
**three fijado en 0.186.1** y `@types/three` en 0.186.0, ambos con versión exacta (F0-03, Samuel, 2026-10-11).

## D-004 · Backend NestJS + Prisma + PostgreSQL + Socket.IO (2026-10-11)

JSON Server no puede hacer combates en tiempo real ni impedir trampas. Se crea `server/` y se migran
`/teams`, `/favorites`, `/customPokemon` con el mismo contrato. JSON Server queda en `backend/` hasta
que el nuevo servidor cubra esos endpoints (F0-08) y luego se archiva.

## D-005 · Salas de combate en memoria de un único proceso (2026-10-11)

Suficiente para clase. Si algún día hay varios procesos, las salas pasan a Redis.

## D-006 · Tokens en la app nativa: refresh en almacenamiento seguro, access en memoria (2026-10-11)

Excepción explícita a "nada de tokens en localStorage" (no hay cookies de primera parte entre el
WebView y el API). Keystore de Android vía `@aparajita/capacitor-secure-storage`.

## D-007 · Simplificaciones del combate v1 (2026-10-11)

EV = 0, sin habilidades, sin objetos equipados, sin clima de combate, combates individuales (1 vs 1
activo, equipos de hasta 6). Todo lo demás de la ficha sí cuenta (stats base, IV, naturaleza, nivel,
tipos, STAB, crítico, precisión, prioridad, PP, estados, cambios de stats). Habilidades → F7 opcional.

## D-008 · Google Maps (pedido explícito del equipo) con modo joystick obligatorio (2026-10-11)

Google Maps JS vectorial + WebGLOverlayView. El modo joystick existe siempre para presentar en el aula
y probar en el PC.

## D-009 · La carpeta `android/` se commitea (2026-10-11)

Revierte la costumbre de los laboratorios (no generar nativo). Aquí hace falta para permisos,
icono, splash y APK reproducible por cualquiera del equipo.

## D-010 · Proyecto académico sin ánimo de lucro, sin publicar en tiendas (2026-10-11)

Pokémon, sus nombres e imágenes son de Nintendo / Game Freak / The Pokémon Company. Se usan los datos
y medios públicos de PokéAPI con fines educativos. No se sube a Play Store ni se monetiza. Música y
efectos: solo libres o propios (créditos en `src/assets/audio/CREDITOS.md`).

## D-011 · Relevos entre 3 IAs: la memoria vive en `docs/plan/` (2026-10-11)

Cada integrante usa su propia cuenta de Claude. Reglas en `CLAUDE.md`, comandos `/inicio` y `/cierre`
en `.claude/commands/`, hook de arranque que muestra `ESTADO.md`, y las skills esenciales copiadas en
`.claude/skills/` para que las tres IAs trabajen con los mismos estándares.

## D-012 · Versiones del servidor: NestJS 12 (ESM + Vitest) y Prisma 7.10.0 exacto (2026-10-11)

`nest new` 12.0.8 genera proyecto ESM (`"type": "module"`, imports con `.js`), tests con Vitest y lint con oxlint;
se acepta tal cual. Prisma se fija en **7.10.0** porque el tag `latest` de npm apunta a una RC de la 8. Prisma 7
exige `prisma.config.ts` para la URL y el adaptador `@prisma/adapter-pg`. Sustituye la mención a "NestJS 11".

## D-013 · Guardado continuo obligatorio (2026-10-11, pedido de Alex)

Las cuentas Claude Pro se cortan sin aviso al agotar el límite. Se guarda (commit WIP permitido + push + "Punto de
guardado" en ESTADO.md) tras cada paso del plan y como mucho cada 20 min; un hook `Stop` lo hace cumplir. Quien
retoma una tarea `[~]` trabaja sobre la rama del compañero, no crea otra.

## D-014 · Alias `@shared/*` sin `baseUrl` (2026-10-11, Samuel)

TypeScript 6 marca `baseUrl` como obsoleto, así que el alias es solo `"paths": { "@shared/*": ["./shared/*"] }` en
`tsconfig.json` (las rutas se resuelven desde ese archivo). No añadir `baseUrl`. Los `*.spec.ts` de `shared/` se excluyen
de `tsconfig.app.json` y `tsconfig.spec.json`: los corre `npm run test:shared` en Node, no `ng test` en jsdom.

## D-015 · Fuente display: Fredoka y texto de los chips de tipo según contraste (2026-10-11, Samuel)

Fuente display: **Fredoka** (OFL, `@fontsource/fredoka` 5.3.0 exacto, pesos 500/600/700; el 600 lo usa `GameButton`).
Los colores de tipo salen solo de los tokens `--t-*` (una paleta). Como varios son claros, el texto del chip no es
siempre blanco: `POKEMON_TYPES[t].text` es `var(--accent-ink)` (blanco) en lucha, veneno, fantasma, dragón y siniestro
y `var(--ink)` en el resto. Con texto blanco 13 de 18 tipos no llegaban a AA (eléctrico 1,5:1); así todos ≥ 5,5:1.

## D-016 · En los tests de la app, dependencias externas por token de inyección, no con `vi.mock` (2026-10-11, Samuel)

`ng test` reutiliza la caché de módulos entre specs del mismo worker: si otro spec carga antes el módulo real
(p. ej. `@capacitor/haptics` vía `GameButton`), el `vi.mock` de un spec posterior no llega al servicio y el test falla
según el orden (pasó con HapticsService: 1 de 4 corridas). Por eso plugins y APIs del navegador se inyectan con un
`InjectionToken` con `factory` por defecto (`HAPTICS_PLUGIN`, `AUDIO_CONTEXT_FACTORY`) y el test pasa un doble con
`providers`. `vi.stubGlobal` (p. ej. `fetch`) sí es seguro.

## D-017 · Prisma 7.10: `prisma.config.ts` usa DIRECT_URL y vulnerabilidades de la CLI aceptadas (2026-10-11, Samuel)

- En Prisma 7.10 el `datasource` de `prisma.config.ts` solo admite `url` (y `shadowDatabaseUrl`): **no** existe
  `directUrl` (el plan de F0-06 lo traía; no compila). Esa URL solo la usa la CLI (migraciones) → `env('DIRECT_URL')`.
  La app se conecta con `DATABASE_URL` vía `PrismaPg`. Hoy las dos apuntan al session pooler; si algún día
  `DATABASE_URL` pasa al _transaction pooler_ (6543), las migraciones siguen yendo por `DIRECT_URL`.
- `npm audit` marca 4 "high" (`mysql2`, `deepmerge-ts`) que vienen **solo** de la CLI `prisma@7.10.0`. El servidor nunca
  carga `mysql2` (usamos Postgres) y `deepmerge-ts` solo fusiona la config local de la CLI, sin datos de usuarios.
  La única corrección que ofrece npm es bajar a Prisma 6 (contradice D-012): riesgo aceptado. Revisar al salir Prisma 7.11+.

## D-018 · Auth (F0-07): lo que se añadió al plan y por qué (2026-10-11, Samuel)

- **`environment.serverUrl` separado de `apiUrl`.** `apiUrl` sigue siendo el JSON Server de IS-11 (dev: 3000) y
  `serverUrl` es NestJS (dev: 3001, prod: Render). El interceptor solo pone el token en `serverUrl`. En F0-08, cuando
  `/pokemon` pase a Nest, las dos se unifican.
- **Límite de intentos también por CUENTA** (10 fallos / 15 min, en memoria por D-005), además del 5/min por IP del
  plan: con muchas IP el de IP se esquiva (estándar del equipo: "cuenta por dos claves"). Aplica igual a correos
  inexistentes para no delatar cuáles existen.
- **JWT con `iss`/`aud` fijos y `algorithms: ['HS256']`** al verificar; `sub` debe ser un UUID.
- **Argon2id con parámetros OWASP** (19 MiB, t=2, p=1) en vez de los de por defecto (64 MiB): Render gratis tiene 512 MB.
- **`ValidationPipe` como `APP_PIPE`** en `AppModule` (antes en `main.ts`): así valida también en los tests e2e.
- **El servidor no arranca** si falta `JWT_SECRET` (≥ 32) o `DATABASE_URL` (`config/env.validation.ts`).
- **Refresh reutilizado → se revoca toda la familia.** Consecuencia aceptada: dos refresh simultáneos del mismo
  cliente cierran su sesión; por eso la app comparte un único refresh en vuelo (AuthService).
- **Estilos de formulario globales** en `src/theme/forms.scss` (`.form`, `.field__*`), tokens `--danger-ink`
  (texto de error con contraste AA) y `--field-bg/--field-border`.
- **Deuda conocida:** el registro responde 409 "Ese correo ya está registrado" (el plan lo pide; revela qué correos
  existen, aceptado en un juego). Apodos únicos distinguiendo mayúsculas ("Ash" ≠ "ash"). Los `RefreshToken`
  caducados no se borran todavía (tarea de limpieza futura).

## D-019 · CRUD del curso en Nest (F0-08): lo que se añadió al plan y por qué (2026-10-11, Kenneth)

- **Un solo servidor en desarrollo, puerto 3000.** JSON Server queda archivado en `backend/legacy/` (sin `npm run api`),
  así que `environment.apiUrl` desaparece y todo usa `environment.serverUrl` (cierra lo previsto en D-018). El
  interceptor ya pone el token a `/pokemon` sin cambios.
- **`/pokemon`: leer es público, escribir exige sesión** (plan). En la app, `/pokemon/nuevo` y `/pokemon/:id/editar`
  llevan `authGuard`; la Pokédex y el detalle siguen públicos.
- **Contrato JSON Server conservado:** listas como array plano, `X-Total-Count` solo si llegan `_page`/`_limit`
  (expuesta por CORS), DELETE → 200 `{}`. Los `createdAt`/`updatedAt` que mandan los clientes se aceptan y se ignoran.
  Un `id` en el cuerpo de PUT/PATCH distinto del de la ruta → 400. Parámetros de consulta desconocidos → 400
  (JSON Server los ignoraba; aquí manda `forbidNonWhitelisted`).
- **Lo ajeno da 404** (no 403): `where: { id, playerId }` en toda lectura/escritura; `playerId` nunca sale en la respuesta.
- **CHECK extra `price_nonneg`** además de los tres del plan. Favorito repetido → 409 (lo decide el UNIQUE, sin SELECT previo).
- **Jugador demo de la semilla = `demo@pokecrud.invalid`**, no `@pokecrud.test` como decía el plan: los e2e borran todos
  los `@pokecrud.test` al terminar y se llevarían los datos de ejemplo. Contraseña aleatoria descartada: nadie entra.
- **Semilla no destructiva:** `createMany` + `skipDuplicates` (ON CONFLICT DO NOTHING): crea lo que falta y nunca pisa
  precios/stock editados por la clase. Sin ids explícitos en tablas con secuencia (un id explícito no la avanza).
  Se ejecuta con `tsx` (devDependency exacta).
- **Postman re-ejecutable:** la colección registra un jugador `postman+…@pokecrud.test`, usa su token (auth Bearer a
  nivel de colección), encadena los ids que devuelve el servidor y en `/pokemon` usa el id 99150 (fuera de la
  Pokédex) con limpieza previa, para no tocar los 151 de la clase en la base compartida.
- **e2e en serie (`fileParallelism: false`).** El _session pooler_ de Supabase admite **15 clientes en total**
  (`EMAXCONNSESSION`, comprobado): cuatro archivos e2e en paralelo con pool 5 cada uno lo desbordaban y el registro
  daba 500 de forma intermitente.
- **Riesgo abierto (tarea F0-10):** Render (5) + el servidor local de cada compañero (5 c/u) también comparten esos 15.
  Con los tres desarrollando a la vez, producción puede dar 500. Ver ROADMAP F0-10.

## D-020 · APK (F0-09): JDK 21 aparte, Capacitor Android 8.5.2 y APK de desarrollo opcional (2026-10-11, Kenneth)

- **JDK:** el plan decía usar el `jbr` de Android Studio, pero en versiones recientes es **Java 25** y Gradle 8.14.3
  falla ("Unsupported class file major version 69"). Se instala Microsoft OpenJDK 21 (`winget`) y `scripts/apk.mjs`
  elige un JDK 17-24 (prefiere 21). No se sube Gradle a 9.x: es el que fija la plantilla de Capacitor 8.
- **`@capacitor/android` 8.5.2** (el plan decía 8.5.3): igual que `@capacitor/core`/`cli` instalados, como pide
  Capacitor, y la 8.5.3 tenía 4 días. `@capacitor/splash-screen` 8.0.2 como en el plan.
- **El APK que se prueba y se presenta es el de producción (Render).** El de desarrollo (`-- device`) es opcional: su
  IP se genera en cada PC (`environment.device.ts` gitignored, el plan lo daba por commiteado) y el HTTP plano +
  contenido mixto solo se activa con `CAP_DEV=1`, nunca en el de producción.
- **Icono/splash provisionales propios** (pin de mapa con forma de ball, tokens de DISENO.md) generados por script.
  Los splash por densidad suben el APK de 4,8 a 8,2 MB: aceptado mientras sea provisional.

## D-021 · `DATABASE_URL` por el transaction pooler de Supabase (F0-10) (2026-10-11, Kenneth)

- **Contexto (medido):** el _session pooler_ (5432) admite **15 clientes en total** (`EMAXCONNSESSION … pool_size: 15`).
  Render (pool 5) + cada servidor local (pool 5) + los e2e los compartían: con tres personas a la vez, producción daba 500.
- **Decisión:** `DATABASE_URL` → _transaction pooler_ (**6543**); `DIRECT_URL` sigue en 5432 (las migraciones necesitan
  modo sesión, D-017). Mismo usuario y contraseña. Sin `?pgbouncer=true`: con el adaptador `PrismaPg` (node-postgres)
  no hace falta y se comprobó que todo funciona (transacciones interactivas del refresh incluidas).
- **Medido:** 40 conexiones simultáneas por 6543 → 40/40 (por 5432 fallaban 5 de 20). e2e en paralelo por 6543: 8/8
  verdes. Dos servidores locales + Render + e2e en paralelo a la vez: 2.516 consultas en 35 s, 0 fallos.
- **Hallazgo de paso:** los e2e en paralelo daban un 500 intermitente que NO era el pooler: cada archivo borraba en su
  `afterAll` todos los `@pokecrud.test` y se llevaba los jugadores de otro archivo a mitad de test (FK). Ahora cada
  archivo borra solo su prefijo (`test+`, `crud+`) y los de prueba con > 1 h (restos de Postman): `test/support/cleanup.ts`.
- **Consecuencia:** en modo transacción no hay estado de sesión entre consultas (nada de `SET` de sesión, advisory locks
  de sesión ni `LISTEN/NOTIFY`). Si algún día hace falta, usar `DIRECT_URL` para ese caso concreto.

## D-022 · Zona segura global para pantallas sin `ion-header` (F0-11) (2026-10-11, Kenneth)

Con `targetSdk` 36 Android dibuja la app de borde a borde y `/dev/ui` quedaba bajo la barra de estado. **Decisión:** una
sola regla en `src/global.scss` (`.ion-page:not(:has(> ion-header)) > ion-content`) pone `--padding-*` =
`var(--ion-safe-area-*)`: el fondo llega al borde y el contenido se aparta; las pantallas nuevas sin cabecera quedan
cubiertas solas. Las que llevan `ion-header` no cambian (Ionic ya lo resuelve). Medido en el Samsung A36: inset 35 px
arriba / 15 px abajo; sin scroll extra en login y registro. **Una pantalla que deba ir a pantalla completa de verdad
(mapa F1, encuentro AR F2) anula `--padding-top/bottom` en su `ion-content`** y coloca sus controles con
`var(--ion-safe-area-*)`. `:has()` existe desde Chrome 105: en un WebView más viejo simplemente no se aplica (como antes).

## D-024 · El servidor compila `shared/` (F1-06) (2026-10-11, Alex)

F1-06 es lo primero del servidor que usa el motor puro. **Decisión:** `server/tsconfig.build.json` con `rootDir: ".."` e
`include: ["src", "../shared/**/*.ts"]` (sin los `*.spec.ts`). La salida pasa a ser `dist/server/src/main.js` +
`dist/shared/…`: `start:prod` es `node dist/server/src/main` y `nest-cli.json` lleva `entryFile: server/src/main`.
`shared/package.json` con `"type": "module"` para que `module: nodenext` lo trate como ESM (la raíz no tiene `type`).
El servidor importa con ruta relativa y extensión: `../../../shared/engine/spawns.js`. En `shared/` las importaciones
internas llevan `.js` (vale para Angular, Vitest y Node). Render clona el repo entero, así que `../shared` existe allí;
el comando de arranque no cambia (`npm run start:prod`).

## D-025 · Spawns: semilla HMAC, clima por celda y franja, datos ocultos hasta el encuentro (F1-06) (2026-10-11, Alex)

- **Semilla** de (celda, franja) = primeros 4 bytes de `HMAC-SHA256(SPAWN_SALT, "v1:<cellId>:<slot>")`, calculada SOLO
  en el servidor. `shared/engine/spawns.ts` recibe la semilla ya hecha: el cliente tiene el algoritmo pero no puede
  predecir nada. FNV + sal (lo que decía ARQUITECTURA) se descartó: no es criptográfico. Si cambia `spawnsForCell`
  (incluido el ORDEN de las tiradas), se sube `SEED_VERSION` en `spawns.service.ts`.
- **Clima** (Open-Meteo, timeout 4 s) por celda de **0,1°** y **franja**: se pide una vez y se guarda hasta que acaba
  la franja (máx. 2.000 entradas). Si falla → "despejado" toda la franja. Así el clima nunca hace que dos jugadores
  vean cosas distintas, ni que los spawns cambien a mitad de franja. **Noche** = hora solar de la celda al EMPEZAR
  la franja (18:00-6:00), sin red ni zonas horarias.
- `GET /spawns?lat&lng` (con sesión, 20/min por IP) devuelve solo `{id, speciesId, lat, lng}` a ≤ 200 m + `slot` y
  `expiresAt`. Nivel, IVs, naturaleza, sexo y shiny se recalculan en el servidor a partir del `id`
  (`SpawnsService.cellSpawns`) cuando haya encuentro (F2): nada de spawns en la BD.
- **Degradación:** sin `SPAWN_SALT` (o sin dataset) solo `/spawns` responde 503; el servidor arranca igual. Si
  `SPAWN_SALT` se define, debe tener ≥ 32 caracteres. Cambiarla cambia todos los spawns.
- Pesos: `captureRate/255 × min(1,5; 100/baseExp)`, bebés × 0,3, legendarios y míticos 0; tipos del clima × 2,5;
  fantasma/siniestro/psíquico de noche × 2. Celda: 0-3 Pokémon (60/28/10/2 %, ~10-20 a 200 m). Niveles 1-25 (más
  bajos más frecuentes) hasta que F3 los ligue al nivel del jugador. Shiny 1/512. Constantes en `shared/engine/spawns.ts`.

## D-026 · Mochila (`Inventory`, `GET /bag`) y XP/nivel del jugador (F1-08) (2026-10-11, Alex)

- **Ruta `/bag`, no `/inventory`:** "inventario" ya es la tienda del CRUD del curso (`/pokemon`, `InventoryPokemon`,
  carpeta `server/src/inventory/`). La mochila del jugador es el modelo `Inventory` (como en ARQUITECTURA §9) servido en
  `GET /bag` desde `server/src/bag/`. Sin id en la ruta: siempre la del jugador del token.
- **Objetos** (`shared/engine/items.ts` = enum `InventoryItem`): `POKE_BALL`, `GREAT_BALL`, `ULTRA_BALL`, `RAZZ_BERRY`.
  **Kit inicial** 30 / 5 / 0 / 5. Se da al registrarse en la MISMA escritura que crea el `Player` (anidada = atómica),
  la migración se lo dio a los que ya existían, y `GET /bag` lo garantiza con `createMany … skipDuplicates`
  (ON CONFLICT DO NOTHING) para quien se registrara entre la migración y el despliegue. Por eso **las filas no se
  borran nunca** (al llegar a 0 se quedan): borrar una regalaría el kit otra vez. CHECK `0 ≤ qty ≤ 999` en la BD.
- **XP → nivel** (`shared/engine/progression.ts`): XP total para el nivel L = 500·(L−1)·L, máximo 40. La misma función
  la usan el servidor (al sumar) y la app (barra del HUD).
- **`ProgressionService.addXp(playerId, n, tx?)`** sin endpoint: lo llamarán captura y combate DENTRO de su
  transacción. `xp = xp + n` en la sentencia (atómico) y el nivel se sube con `WHERE level < nuevo` (nunca baja con
  sumas concurrentes). Rechaza n ≤ 0, no entero o > 100.000.
- La placa del jugador (`app-player-hud`) está en `/dev/ui` hasta que F1-04 la ponga arriba a la izquierda del mapa.

## D-027 · Fórmula de captura y huida (F2-03) (2026-10-11, Alex)

- `shared/engine/capture.ts` implementa ARQUITECTURA §6 tal cual: `a = ((3·PSmax − 2·PSact)·captureRate·bola·baya·
  lanzamiento·curva)/(3·PSmax)`, `b = floor(65536/(255/a)^0,1875)`, 4 comprobaciones con enteros en [0, 65535]
  (`a ≥ 255` → segura). Bonus: Poké 1 · Super 1,5 · Ultra 2 · Frambu 1,5 · Bien 1,3 · Genial 1,7 · Excelente 2 ·
  **curva 1,7** (ARQUITECTURA no lo fijaba; es el de Pokémon GO). Referencias: captureRate 45 sin ayudas = 11,9 %;
  legendario (3) = 1,6 % y con todo 8,9 %; captureRate 255 con Super + Excelente + curva = 100 %.
- **Huida** tras fallar: 5 % + 15 %·(1 − captureRate/255) + 10 %·min(velocidad,180)/180 (+10 % legendario/mítico),
  tope 35 %. Nunca huye si se captura.
- `resolveThrow(captura, huida, rng)` consume **siempre 5 tiradas** (4 sacudidas + huida), pase lo que pase: la
  secuencia del RNG no depende del resultado. Cambiar el orden o el número de tiradas cambia resultados: anotarlo aquí.
- Las entradas imposibles (captureRate fuera de 1-255, PS > máximo, una baya como bola…) lanzan `RangeError`: el
  servidor (F2-06) valida antes con DTO, y esto es la segunda red.
- Sin modificador por nivel del Pokémon por ahora (los spawns son 1-25); si F3 liga niveles al jugador, se revisa.

## D-028 · Captura autoritativa: ubicación, idempotencia, antitrampa de precisión y retención (F2-06) (2026-10-11, Alex)

- **API:** `GET /encounters/:id` (nivel, sexo, shiny, tamaño, `expiresAt`, `status` open/caught/fled; nunca IVs) y
  `POST /encounters/:id/throw { ball, berry?, throwQuality, curve, clientThrowId }` → `{ captured, shakes, fled,
  throwQuality, xpGained, caught, bag }`. `:id` = id del spawn de `GET /spawns`. Errores: 404 no existe, 410 franja
  acabada, 403 lejos / sin ubicación, 409 ya resuelto o sin objetos, 400 validación.
- **Ubicación:** `GET /spawns` guarda `Player.lastLat/lastLng/lastLocatedAt` (mejor esfuerzo). Para encontrar o lanzar
  hay que tener una ubicación de hace ≤ 5 min a ≤ 80 m del Pokémon. No para un GPS falso, pero sí lanzar contra ids de
  cualquier sitio.
- **Una transacción** (espera 5 s / dura 10 s como mucho): comprobar que no está resuelto → gastar bola (y baya) con
  `UPDATE … WHERE qty >= 1` → crear `CaughtPokemon` → `EncounterResult` (UNIQUE jugador+encuentro) → XP (`addXp` con la
  misma `tx`) → `Throw` (UNIQUE jugador+clientThrowId). Si dos lanzamientos capturan a la vez, uno gana y el otro se
  deshace entero (no gasta su bola) y responde 409. Un reintento con el mismo `clientThrowId` devuelve el resultado
  guardado (también tras acabar la franja) y no gasta nada. Un fallo sin huida NO cierra el encuentro.
- **RNG del servidor:** semilla `crypto.randomInt` por lanzamiento. El resolvedor es el proveedor `THROW_RESOLVER`
  (= `resolveThrow` de shared/) para que los e2e fuercen el resultado.
- **Antitrampa de precisión:** si ≥ 12 de los últimos 20 lanzamientos del jugador fueron "excellent", uno nuevo cuenta
  como "great" (y se registra en el log). La respuesta dice con qué calidad contó.
- **XP:** capturar 100 + precisión (Bien 10 · Genial 50 · Excelente 100) + curva 10. La precisión y la curva se dan
  aunque falle (como Pokémon GO).
- **Datos del capturado:** todos del spawn recalculado en el servidor; tamaño XS-XL = HMAC(SPAWN_SALT, id) → 0,5-1,5;
  movimientos = los 4 últimos aprendidos por nivel (`movesAtLevel`).
- **Retención:** `Throw` 7 días y `EncounterResult` 1 día (la franja dura 10 min), borrados del propio jugador al
  lanzar, fuera de la respuesta y sin romperla si falla.
- **Fuera de alcance (anotado):** Pokédex vistos/capturados y caramelos (F3), y que el cliente lo use (F2-04/05/07).

## D-029 · A quién afectan los cambios de stats: `target` + `metaCategory` (F4-02) (2026-10-11, Alex)

El dataset ahora trae `target`, `flinchChance` y `metaCategory` (PokéAPI `meta.category`) en cada movimiento. **El
`target` solo vale para los de estado**: en los de daño siempre es `selected-pokemon`, también en Puño Incremento
(sube SU ataque) o A Bocajarro (baja SUS defensas). Para los de daño manda `metaCategory`: `damage-raise` → usuario
(aunque el cambio sea negativo), `damage-lower` → rival. 7 movimientos de la Gen 9 vienen sin categoría: por defecto
son del usuario salvo Lumina Crash y Bomba Jarabe (rival). En 1 vs 1, `user-and-allies` (Aullido) = usuario; `ally` y
`all-pokemon` (Aroma Floral, Labrar) no aplican. `statChance: 0` con cambios = 100 %. Todo en
`shared/engine/battle/moves.ts`; si PokéAPI rellena las categorías que faltan, revisar la lista.

