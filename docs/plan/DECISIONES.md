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

## D-023 · Solo un ADMIN escribe en el inventario `/pokemon` (F0-12) (2026-10-11, Alex)

Con F0-08 cualquier jugador con sesión podía crear, editar y borrar el inventario compartido, y el registro es abierto
(repo y Render públicos): cualquiera podía vaciar los 151 en minutos. **Decisión:** enum `PlayerRole` (`PLAYER` |
`ADMIN`, por defecto `PLAYER`) en `Player`, y `AdminGuard` (`server/src/auth/admin.guard.ts`) en POST/PUT/PATCH/DELETE
de `/pokemon`. Sin sesión → 401; jugador normal → 403; leer sigue siendo público.

- **El rol se lee de la BD en cada escritura, NO va en el JWT:** quitarlo surte efecto en la siguiente petición sin
  esperar a que caduque el access token. Cuesta una consulta por escritura del inventario (pocas).
- **No hay endpoint para nombrar admins:** solo `cd server && npm run admin -- grant|revoke <correo>` (y `list`), es
  decir, quien tenga la contraseña de la BD. Un endpoint así sería el primer objetivo de un atacante.
- `/auth/*` devuelve `role` en `player` para que la app oculte agregar/editar/eliminar (`AuthService.isAdmin`,
  `adminGuard` en `/pokemon/nuevo` y `/pokemon/:id/editar`). Es solo UI: quien manda es el servidor.
- `/teams`, `/favorites`, `/customPokemon` no cambian (ya eran de cada jugador).
- Postman: las escrituras del inventario usan `{{adminToken}}`, que sale del login con `adminEmail`/`adminPassword`
  del **entorno local de Postman de cada uno** (nunca en la colección: el repo es público).

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

## D-030 · Daño verificado contra Showdown y solo movimientos soportados al capturar (F4-03) (2026-10-11, Alex)

- `shared/engine/battle/damage.ts` replica el orden exacto de redondeos de `@smogon/calc` (motor de
  calc.pokemonshowdown.com): base con `floor`, crítico `floor(×1,5)`, tirada `floor(×(85+i)/100)`, STAB como 6144/4096,
  `pokeRound` (x,5 hacia abajo) antes de la efectividad, quemado `floor(/2)`, mínimo 1. El crítico ignora etapas negativas
  del atacante y positivas del defensor. **Verificado:** 10 casos (×4, ×2, ×0,5, ×0,25, ×0, crítico, quemado, etapas,
  nivel 5) con las 16 tiradas idénticas a las de `@smogon/calc` 0.12.0, y las stats también. El oráculo está en
  `scripts/oracles/showdown-damage.cjs` (se instala aparte; no es dependencia).
- Crítico Gen VII+ por etapas (1/24, 1/8, 1/2, siempre), precisión con etapas netas topadas en ±6 y tirada 0-99, orden:
  cambiar > prioridad > velocidad efectiva (etapas, parálisis ×0,5) > empate al azar.
- **Soportados:** 548 de 706 (todos los de daño con poder + los de estado con stats aplicables, estado alterado o
  curación). Al capturar, `CaughtPokemon.moves` = `defaultMoves` de shared/ (los 4 últimos SOPORTADOS; si no hay,
  Placaje). El servidor carga `moves.json` junto a `pokedex.json`. Ditto (solo Transformación) → Placaje.

## D-031 · Motor de combate: firma y reglas concretas del reducer (F4-04) (2026-10-11, Alex)

- **Firma:** `resolveTurn(ctx, estado, [acciónLado0, acciónLado1], rng) → { state, events }` y `createBattle(ctx, lados)`.
  `ctx = { moves: Map<id, Move>, chart }` (datos fijos; el plan no lo tenía). Clona con `structuredClone` y nunca muta la
  entrada; nada de estado de módulo.
- **Debilitado:** `state.pendingSwitch[lado] = true` + evento `needs-switch`. El siguiente `resolveTurn` SOLO acepta
  `switch` (o `forfeit`) de los lados pendientes (`null` para el otro) y no cuenta como turno.
- **Sueño:** 1-3 turnos (`statusTurns`); el turno en que te duermen cuenta si aún no te habías movido (como los juegos).
  **Confusión:** 2-5 turnos, 1/3 de golpearse (40 de poder, sin tipo). **Congelado:** 20 % de descongelarse al intentar
  moverse; un ataque de Fuego lo descongela. **Tóxico:** n/16 creciente (tope 15) y se reinicia al cambiar.
  **Inmunidades:** Fuego/quemado, Eléctrico/parálisis, Veneno-Acero/veneno, Hielo/congelado; Onda Trueno respeta la
  inmunidad de Tierra.
- **Efectos:** estados secundarios con su probabilidad (`ailmentChance`; 0 en los de estado = siempre), cambios de stats
  a quien diga `statChangeTarget` (D-029), drenaje/retroceso sobre el daño hecho (mín. 1), multigolpe 35/35/15/15,
  retroceso del rival solo si el que ataca va primero. **Forcejeo** (no está en el dataset): poder 50 sin tipo y 1/4 de
  retroceso, solo si no queda PP en nada.
- **Doble KO** (retroceso/Forcejeo): pierde el último en debilitarse. **Rendirse:** gana el otro.
- Eventos: lista cerrada en `types.ts` (`BattleEvent`); los textos en español los pone la UI.

## D-032 · IA rival por puntuación con ruido según dificultad (F4-06) (2026-10-11, Alex)

`shared/engine/battle/ai.ts`: `chooseAction(ctx, estado, lado, rng, dificultad)`, pura (usa el RNG del combate).
Puntúa en "PS del rival": ataque = precisión × daño medio × golpes (+1000 si debilita seguro, con prioridad mejor);
estado alterado = 15-40 % de los PS del rival si no tiene estado, no es inmune y le queda > 30 %; subir lo propio /
bajar lo del rival = poco y solo hasta ±2 y con > 60 % de vida; curarse = lo que recupera si está por debajo del 50 %.
Cambia (normal y difícil) si su activo hace < 15 % y uno del banquillo haría ≥ 3 veces más sin estar más amenazado. En
un cambio forzado saca al que mejor le va contra el activo rival. Ruido: fácil 40 % de acciones al azar, normal 15 %,
difícil 0 % (+5 % de desempate). **Medido** en combates espejo con equipos aleatorios (semillas fijas): difícil gana al
fácil el 71,8 % de 500; a jugar al azar, difícil 95,7 % y normal 91 % de 300. La IA conoce los tipos del rival pero no
sus movimientos (como un jugador). 3 entrenadores de prueba en `shared/data/trainers.ts` (fácil nv 14-16, normal 24-27,
difícil 40-42).

## D-033 · Escena de combate: reproducción por eventos y componentes pequeños (F4-05) (2026-10-12, Alex)

- `BattleController` (por página) envuelve el motor: el jugador elige, la IA elige (`chooseAction` con la dificultad
  del entrenador), `resolveTurn`, y luego **reproduce los eventos uno a uno**: lo que se ve (PS, estado, quién está
  fuera) va al ritmo de los textos, no salta al estado final. Al acabar el turno se comprueba que lo mostrado y el estado
  real coinciden (si no, se corrige y queda un aviso en consola). En PvP (F5) el estado y los eventos vendrán del
  servidor y esta misma reproducción los mostrará.
- Textos en español en `battle-text.ts` (`describeEvent`), fuera del motor. Eficacia siempre con texto e icono.
- La escena son 5 componentes (`battle.page` escenario + animaciones, `battle-info`, `battle-dock`, `battle-sheet`,
  `battle-burst`, `battle-picker`) para respetar el presupuesto de 2 kB de estilos por componente sin subirlo.
- Animaciones con Web Animations API (repetibles, solo transform/opacity): embestida, sacudida proporcional al daño,
  sacudida de toda la escena si quita > 35 % de la vida, anillo + partículas del color del tipo, número de daño,
  caída al debilitarse. "Reducir movimiento" / "Reducir efectos" → sin sacudidas y escena al doble de rápido.
- El menú de movimientos se queda visible (desactivado) mientras se anima el turno: el diseño no salta.
- Equipo del jugador de PRUEBA (Pikachu, Bulbasaur, Squirtle, un nivel por encima del rival) hasta que F3-02 traiga
  sus capturados. Acceso: `/combate/prueba` o el botón "Combate de prueba" de `/dev/ui`.

## D-034 · El combate final va en REALIDAD AUMENTADA; `/combate/prueba` es temporal (2026-10-12, Alex, PO)

Pedido explícito de Alex (PO): el combate tiene que verse **con la cámara, en realidad aumentada**, como el encuentro y
la captura (F2): los dos Pokémon anclados en el mundo real sobre el suelo, con el giroscopio. La escena 2D de F4-05
(`/combate/prueba`, cielo y hierba dibujados) es **temporal**: sirve para probar el motor y la IA, no es la que se
entrega. **Se conserva y se reutiliza todo lo de debajo:** el motor (`shared/engine/battle/*`), la IA, los
entrenadores, `BattleController` (reproducción por eventos), `battle-text.ts` y el menú de movimientos (`battle-dock`,
`battle-sheet`). Lo que cambia es la capa visual: escenario, sprites y efectos pasan a una escena three.js sobre la
cámara (misma tecnología que F2-04). Tarea nueva **F4-07** (depende del spike F2-01). Sin cámara o sin permiso → el
fondo ilustrado de siempre (DISENO §6), no una pantalla rota.

## D-035 · Mapa: plan A (Google Maps vectorial + `ThreeJSOverlayView`), máximo 30 Pokémon dibujados (F1-01) (2026-10-12, Samuel)

**Medido en un Redmi Note 10** (Android 12, MIUI 13, GPU Mali-G76, pantalla de 60 Hz, WebView Chrome 153, 392×872 a
dpr 2,75) con `/dev/mapa` del APK de producción, vista inicial (zoom 19, tilt 67,5°, girando 360°), 10 s por modo:

| Modo | N | fps medios | p95 | tirones |
|---|---|---|---|---|
| Solo mapa | 0 | 58,8 | 16,8 ms | 0,2 % |
| three.js | 10 / 30 / 60 | 59,2 / **58,4** / 48,5 | 16,8 / 16,8 / 33,3 ms | 0,2 / 0 / 0,8 % |
| Markers HTML | 10 / 30 / 60 | 56,7 / 52,3 / 43,8 | 33,1 / 33,3 / 33,4 ms | 0,5 / 1,7 / 3,7 % |

**Decisión:** plan A de ARQUITECTURA §4 (`@googlemaps/three` 4.0.13 + three 0.186.1). three.js con 30 Pokémon queda
en el tope de la pantalla y rinde **mejor** que los markers HTML con la misma carga (cada marker es DOM que el mapa
recoloca en cada fotograma). **Límite: como mucho 30 Pokémon dibujados a la vez** (con 60 ya baja a 48 fps); los spawns
reales dan ~10-20 a 200 m (D-025), así que sobra margen para el avatar, la hierba y efectos. El plan B se descarta.

- **Cuidado al medir:** si se toca o se hace zoom en el mapa la medición no vale (con la cámara cerca casi no hay
  objetos en pantalla y todo da 60). Medir sin tocar el móvil, desde la vista inicial.
- **Pendiente para F8-02:** el móvil pasó de 34,4 °C a 37,4 °C en ~6 min de pruebas; medir 10 min seguidos (calor y
  batería) antes de la demo.
- **Para F1-04:** el Map ID actual muestra los POI comerciales (restaurantes, tiendas); ARQUITECTURA §4 pide un estilo
  sin ellos (se cambia en la consola de Google, cuenta de Alex).

## D-036 · Restos de compilación en `shared/`: se borran solos antes de compilar o probar (F0-13) (2026-10-12, Samuel)

- **Causa (reproducida):** compilar el servidor con la config anterior a D-024 (`rootDir: ./src`; p. ej. al compilar una
  rama vieja, o a mitad de una mezcla) sobre código que ya importa `shared/`: TypeScript emite esos archivos en
  `dist/../../shared/…`, que es **la carpeta `shared/` del repo** (hoy 21 archivos; 42 la vez que se vio), y deja
  `server/tsconfig.build.tsbuildinfo` suelto. Con la config actual no pasa (salida en `server/dist/`).
- **Por qué es grave:** en `shared/` se importa con `.js` (`./rng.js`, D-024). Si existe un `rng.js` de verdad, Vitest y
  la build lo usan **en vez del `.ts`**: comprobado con un `rng.js` saboteado → 47 fallos en `test:shared`. Es decir,
  código viejo ejecutándose sin avisar.
- **Decisión:** `scripts/clean-shared-artifacts.mjs` borra `X.js`, `X.js.map`, `X.d.ts` y `X.d.ts.map` de `shared/`
  **solo si existe `X.ts` al lado**, y el `server/tsconfig.build.tsbuildinfo` suelto. Corre solo en los ganchos `pre*` de
  `start`, `build`, `test` y `test:shared` (raíz), `build`, `start`, `start:dev`, `test` y `test:e2e` (`server/`, también
  en Render) y en `scripts/apk.mjs`. Además `.gitignore` ignora esos cuatro tipos en `shared/` para que no se suban.
- **Visto en vivo (2026-10-12):** un `npm run start:dev` arrancado en una rama vieja y que siguió vigilando tras
  `git checkout` a otra nueva dio `TS6059 … is not under 'rootDir' …/server/src`: recoge el `include` nuevo pero se queda
  con el `rootDir` con el que arrancó, y así emite en `shared/`. **Regla: tras cambiar de rama (o mezclar) si cambia
  algún `tsconfig*.json`, parar y volver a lanzar `start:dev`.**
- Si algún día hace falta un `.js`/`.d.ts` escrito a mano en `shared/`: excepción con `!` en `.gitignore` y que no tenga
  un `.ts` del mismo nombre (si no, el script lo borraría).

## D-037 · Ubicación (F1-03): permiso en el navegador, centro por defecto y joystick también con teclado (2026-10-12, Kenneth)

- **En el navegador `@capacitor/geolocation` 8.2.3 no implementa `requestPermissions`** (lanza `UNIMPLEMENTED`). El
  código del plan caía en `unavailable` ("Este dispositivo no da la ubicación") en el PC. Ahora, si lanza
  `UNIMPLEMENTED`, `LocationService` empieza `watchPosition` igual (el navegador muestra su propio diálogo) y un error
  de código 1 (`PERMISSION_DENIED`) en el callback pasa a `denied` + modo joystick. En el APK no cambia nada: el
  diálogo es el de Android.
- **Si Android tiene el permiso en "no volver a preguntar"** (dos denegaciones), `requestPermissions` devuelve
  `denied` sin diálogo: la pantalla de permisos lo explica y ofrece "Reintentar" (útil tras activarlo en Ajustes) y
  "Jugar con joystick". Visto en el Samsung A36.
- `start()` es idempotente mientras escucha (un segundo toque en "Permitir" no abre otra escucha).
- **`DEFAULT_CENTER`** (Parque Santander, Neiva) vive en `location.service.ts`: es donde arranca el joystick si nunca
  hubo GPS. `joystickMode` se guarda en ajustes: tras una denegación la siguiente sesión arranca en joystick sin
  posición, y la pantalla llama a `useJoystickAt(position ?? DEFAULT_CENTER)`.
- `app-joystick` también se maneja con las flechas del teclado (PC y accesibilidad) y emite `{0,0}` al soltar.
- **Probar en el móvil:** la captura de pantalla por CDP del WebView NO recoge el mapa (WebGL) y sale gris; usar
  `adb shell screencap`. Para ir a `/dev/*` en el APK no hay botón: se navega por CDP (`adb forward` +
  `history.pushState`), hasta que F1-04 traiga el menú.

## D-038 · La capa 3D del mapa solo existe con el mapa a la vista; y nunca sondear el canvas de Google (F1-04) (2026-10-12, Kenneth)

- **Qué pasaba (Samsung A36, Adreno 710):** al abrir la Pokédex (o bloquear el móvil) el mapa volvía en blanco o en
  **raster** (plano, sin capa 3D ni avatar). Logcat: `Offscreen context lost via ARB/EXT_robustness. Reset status =
  GL_UNKNOWN_CONTEXT_RESET_KHR` + `log_gpu_snapshot`: **la GPU se reiniciaba** ~4,5 s después de ocultar el mapa.
  Ningún JS llamaba a `loseContext()` (comprobado con un gancho antes de cargar Google). Tras un reinicio "desconocido"
  Chrome **bloquea WebGL a la página**: ni Google puede crear un mapa vectorial nuevo (cae a raster) ni un canvas
  cualquiera obtiene contexto; `preventDefault()` en `webglcontextlost` no lo devuelve. Solo cerrar la app lo arregla.
- **Causa:** `ThreeJSOverlayView` con `animationMode: 'always'` sigue pidiendo un fotograma tras otro aunque la página
  del mapa esté oculta (`ion-page-hidden`, 0×0) o la app en segundo plano.
- **Decisión:** `MapPage` desmonta el overlay (`overlay.setMap(null)`) en `ionViewWillLeave` y con
  `document.hidden`, y lo vuelve a montar en `ionViewDidEnter` / al volver a primer plano. Medido: 3 idas y vueltas a
  la Pokédex y 10 s en segundo plano → mapa vectorial siempre, **0 reinicios de GPU** en logcat.
- **Red de seguridad:** si aun así se pierde el contexto o el mapa cae a raster (`getRenderingType() === 'RASTER'`),
  se rehace el mapa **solo con la pantalla visible** (con la página oculta Google no puede crear el vectorial), tras
  1,5 s y como mucho 3 veces por minuto; si no hay manera, "No se pudo cargar el mapa" + Reintentar.
- **Nunca llamar a `getContext()` sobre el canvas de Google** (ni crear canvas WebGL "de prueba"): si el canvas aún no
  tiene contexto, se lo roba a Google (cae a raster); y cada contexto de prueba cuenta para el límite de contextos
  del WebView, que al pasarse mata el más antiguo = el del mapa. Las dos cosas pasaron durante las pruebas de F1-04.

## D-039 · Sobre el mapa 3D el vidrio va sin esmerilar (token `--glass-filter`) (F1-04) (2026-10-12, Kenneth)

DISENO §1 pide vidrio esmerilado (`backdrop-filter: blur(20px) saturate(160%)`). Sobre un mapa WebGL que se redibuja
en cada fotograma, el desenfoque obliga a releer el fondo una y otra vez. **Medido en el Samsung A36** (CDP, 10 s por
caso, dos tandas iguales): con desenfoque 20 px → quieto 61 / joystick 58 / **menú abierto 42 fps**; con 8 px → igual
(62/57/42: lo caro es tener `backdrop-filter`, no el radio); **sin desenfoque → 78 / 77 / 61 fps**.
**Decisión:** token `--glass-filter` (por defecto el esmerilado de siempre) en `src/theme/tokens.scss`, que usan todos
los componentes de vidrio; `MapPage` lo pone a `none` y cambia `--surface` por `--surface-opaque` (0,94 claro / 0,92
oscuro) para que el texto se lea igual sin el desenfoque. El resto de pantallas (combate, login…) no cambia. Si algún
día se quiere esmerilado sobre el mapa, medir antes en un Android de gama media.

## D-040 · La zancada del avatar acumula su fase; nunca `velocidad × t` absoluto (F1-05) (2026-10-12, Alex)

El plan proponía `limbPose(gait, speed, t)` con la fase `2π · speed / (2 · zancada) · t` y `t` = reloj del bucle. Como
`AvatarMotion` suaviza la velocidad, esta cambia un poco en cada fotograma, y con `t` grande la fase salta: con la
página abierta 600 s, 0,05 m/s de diferencia son ~125 rad → piernas temblando. **Decisión:** `advanceStride(phase,
gait, speed, dt)` suma la fase fotograma a fotograma (continua aunque cambien la velocidad o el paso andar/correr) y
`limbPose(gait, phase, t)` la recibe. Vale igual para cualquier animación cíclica que dependa de la velocidad (p. ej.
los Pokémon que anden en F1-07): acumular la fase, no multiplicar por el reloj.

## D-041 · Pokémon en el mapa: la posición se manda antes del encuentro, y los edificios 3D los tapan (F1-07) (2026-10-12, Alex)

- **Posición al servidor antes de `GET /encounters/:id`.** El servidor mide la distancia (≤ 80 m) desde la última
  posición recibida por `GET /spawns` (D-028), y el feed solo pide `/spawns` al moverse > 60 m o al cambiar de franja.
  Resultado medido: caminar 35 m hacia un Pokémon y tocarlo → 403. Ahora `MapPage` llama a
  `SpawnFeedService.reportPosition(gps)` (espera a la petición en vuelo; nunca dos a la vez) y después navega. Cuesta
  1 petición por toque, muy por debajo del límite de 20/min. Si el día de mañana hay un endpoint de "posición", este es
  el sitio para cambiarlo. Lo mismo valdrá para `POST /encounters/:id/throw` si el jugador se mueve durante la captura.
- **Los edificios 3D de Google se pintan DESPUÉS de la capa three.js** (`WebGLOverlayView`): un Pokémon detrás de una
  casa sale cortado. Probado y descartado: `depthTest: false` (no basta) y escribir `gl_FragDepth = 0` en el sprite
  (Google lo pinta encima igual). Lo que sí se hizo: sombra → hierba → sprite con `depthTest: false` y `renderOrder`, para
  que la hierba nunca tape a su Pokémon. **Única salida real: edificios 2D en el estilo `pokecrud-juego`** (engranaje
  del editor de estilos → Edificios → 2D), como Pokémon GO. Decisión pendiente de Alex (se ve peor el mapa a cambio de
  no esconder Pokémon). → **Resuelto en D-042** (Alex quiere 3D Y los Pokémon encima).

## D-042 · Los Pokémon del mapa se pintan en HTML por encima del mapa; edificios 3D (F1-07) (2026-10-12, Alex)

Alex decidió **edificios 3D** en el estilo y **los Pokémon siempre visibles** encima. Como Google pinta los edificios
después de la capa three.js (D-041), el Pokémon ya no es un `THREE.Sprite`: es un `<img>` en `.pokemon-layer`, encima
del div del mapa (`PokemonDom`). Cada fotograma, desde `onBeforeDraw` del overlay (`MapOverlay`, subclase de
`ThreeJSOverlayView` que expone su `camera.projectionMatrix`, la de ESE fotograma: sin desfase al mover la cámara),
se proyectan su base y su cabeza (`projectToScreen`) y se coloca con `transform` + `opacity` (sin relayout; tamaño
fijo de 100 px y `scale`). `z-index` por altura en pantalla: el más cercano delante. La sombra y la mata de hierba
siguen en three.js, en el suelo (pueden quedar detrás de una casa; es lo natural).

- **Toque:** `click` en la propia imagen (las imágenes tienen `pointer-events: auto`; la capa, `none`). Adiós a los
  cilindros invisibles y al raycast.
- **Sin texturas three.js:** `SpriteTextures` se borró; el navegador cachea los PNG. Orden de prueba de sprites:
  home → official-artwork → normal (`onerror`).
- **NO crear otro canvas WebGL** para esto (D-038: en el móvil le quitaba el contexto al mapa).
- **Rendimiento:** ≤ 30 imágenes con `transform` por fotograma (el spike midió 52 fps con los markers HTML de Google,
  más pesados). Medir en Android en el 7b de F1-07; si hiciera falta, no actualizar las que no cambian de sitio.
- Tipos: `src/types/googlemaps-three.d.ts` declara ahora `protected readonly camera`.

## D-043 · Recuperar la sesión con el servidor dormido: reintentar, no mandar al login (F1-09) (2026-10-12, Alex)

Antes, si `/auth/refresh` fallaba por algo que no fuera 401 (Render despertando devuelve 502 o tarda), la app daba
la sesión por perdida y mandaba a `/login` (con el token aún válido guardado). Ahora `AuthService.restore()` solo se
rinde con un 401; si el servidor no responde reintenta con espera creciente (`RESTORE_RETRY`: 2, 4, 8, 15 s… hasta
2 min) y expone `waking`/`wakeAttempt` para la pantalla `app-server-waking` (en `app.component.html`, encima de todo).
Pasados los 2 min se queda en anónimo SIN borrar el token. Los tests usan `RESTORE_RETRY` con esperas a 0.

## D-044 · Los efectos de sonido se generan en el juego, no son archivos (F2-08) (2026-10-12, Alex)

`sfx-synth.ts` guarda cada efecto como una receta de voces (onda o ruido, barrido de frecuencia, envolvente) y
`AudioService` la convierte en un `AudioBuffer` la primera vez que suena (unos KB, en memoria). Por qué: (1) sin
licencias de terceros (D-010: libres o propios → son propios); (2) nada que descargar, así que con datos móviles
suenan al instante (los gritos tardaban > 6 s); (3) en el PC no hay codificador de audio para preparar archivos.
Para cambiar un sonido se toca su receta (y se regeneran los .wav de `docs/evidencias/F2-08_sfx/` para oírlo).
Sigue existiendo `SFX_CATALOG` para sonidos grabados que lleguen más tarde (en `assets/audio/sfx/*.ogg`).

## D-045 · AR del encuentro y del combate: `getUserMedia` con la cámara PRINCIPAL + `RelativeOrientationSensor` (F2-01) (2026-10-12, Kenneth)

**Medido en el Samsung A36** (Android 16, Adreno 710, WebView Chrome 154, pantalla de 120 Hz, 384×832 a dpr 2,81) con
`/dev/ar` del APK de producción. Evidencias `F2-01_0{1..6}_*`.

| Configuración (cámara principal, Pikachu, móvil apoyado) | fps | p95 | tirones | vídeo |
|---|---|---|---|---|
| Solo cámara 720p | 59,3 | 16,8 ms | 0 % | 23,2 |
| Cámara + Pokémon | 60,0 | 16,8 ms | 0 % | 23,6 |
| + 400 partículas | 60,0 | 16,8 ms | 0 % | 23,6 |
| + resolución nativa (dpr 2,81) | 59,7 | 16,7 ms | 0,2 % | 23,6 |
| Cámara 1080p + todo | 59,5 | 16,8 ms | 0,3 % | 23,3 |
| Sin cámara (fondo ilustrado) + todo | 119,9 | 8,4 ms | 0 % | — |

- **Cámara = `getUserMedia` en el WebView.** Funciona a la primera; el permiso lo pide Capacitor solo
  (`BridgeWebChromeClient` → diálogo de Android). **El plan B (`camera-preview`) se descarta:** no hace falta ninguna
  dependencia nativa. Denegado (también "no volver a preguntar") → `NotAllowedError` al instante, sin cuelgues →
  fondo ilustrado (DISENO §6).
- **`facingMode: 'environment'` abre el GRAN ANGULAR** ("camera 2, facing back": 8 MP, enfoque fijo; ve más oscuro y
  deforma). La principal es "camera 0, facing back" (4080×3060, autoenfoque continuo). **Regla:** tras tener permiso,
  `enumerateDevices()`, quedarse con la trasera de número menor y abrirla con `deviceId: { exact }` (guardar su
  `deviceId` para abrir directo la próxima vez). Abrirla directa: 0,8 s hasta el primer fotograma; con el cambio desde
  el gran angular, 1,2-1,4 s. Sin etiquetas (antes del permiso) se abre con `facingMode` y se cambia.
- **720p** (1280×720, llega como 720×1280 en vertical). 1080p no se ve mejor en la pantalla y tarda más en abrir (1,85 s).
- **El vídeo va a ~24 fps en interior** (en un cuarto oscuro con el gran angular, 15): la autoexposición alarga a 42 ms
  con la ISO al mínimo. `frameRate: { min: 30 }` se acepta pero no cambia nada; la exposición manual (25 ms, ISO 400)
  da 26-29 fps pero no se adapta a la luz (en la calle saldría quemada) → **no se usa**. Aceptado: el Pokémon y los
  efectos van a 60 fps aunque el fondo vaya a 24; con luz de día la cámara expone corto sola.
- **Rendimiento sobrado:** 60 fps con Pokémon + 400 partículas, 0 % tirones. Con vídeo en pantalla el móvil baja la
  pantalla a 60 Hz (sin vídeo, 120): el tope lo pone la pantalla, no la GPU. **`setPixelRatio(min(dpr, 2))`**: el nativo
  no se nota y sube el peor fotograma a 50 ms. Temperatura de la batería +0,2 °C en ~2 min (enchufado por USB);
  la prueba de 10 min sigue en F8-02.
- **Orientación = `RelativeOrientationSensor`** (Generic Sensor API, `frequency: 60`, `referenceFrame: 'device'`): existe
  en el WebView, da **56 Hz constantes** y a mano **va más suave** (Kenneth). `deviceorientation` da 35-54 Hz y **deja de
  emitir con el móvil quieto** (Chrome solo lo manda si cambia el valor). Si el sensor no existe o da error →
  `deviceorientation`. La absoluta (brújula) no hace falta: el Pokémon se pone delante de hacia donde mira el móvil al
  entrar. Deriva con el móvil quieto 20 s: ≤ 0,2° en las tres fuentes.
- **Calibrado a ojo en el A36:** campo de visión **vertical 64°** (cámara principal, 720p, `object-fit: cover` en
  vertical; el teórico de 26 mm es ~67°) y **retraso de la orientación 80 ms** (el vídeo llega tarde respecto a los
  sensores; sin retraso el Pokémon se adelanta al girar rápido). El campo de visión depende del móvil: **pendiente
  comprobarlo en el Redmi Note 10 de Samuel**; si cambia mucho, ajuste en Ajustes o tabla por modelo.
- **Sin WebXR** (`navigator.xr` no existe en el WebView): AR de 3 grados de libertad (solo orientación), como el "AR
  clásico" de Pokémon GO: si el jugador camina, el Pokémon no se queda en su sitio. Aceptado. 6DoF exigiría ARCore
  nativo: fuera de alcance.
- **Ciclo de vida (comprobado con `dumpsys media.camera`):** soltar la cámara (`track.stop()`) y los sensores en
  `ionViewWillLeave` y con `document.hidden`; reabrir en `ionViewDidEnter` / al volver. Tres idas y vueltas mapa ↔ AR:
  mapa vectorial siempre y **0 pérdidas de contexto WebGL** en logcat (D-038 a salvo). La escena tiene su propio
  `WebGLRenderer` y al destruirla `dispose()` + `forceContextLoss()`.
- **El `<video>` se oculta hasta su primer fotograma:** vacío, el WebView pinta un póster gris con un "play" gigante
  (`F2-01_05`).
- **Código para F2-04/F4-07:** `src/app/game/encounter-scene/device-pose.ts` (orientación → cámara three.js, rumbo,
  punto del suelo delante) y `pose-delay.ts` (orientación de hace N ms), con tests. Suelo a 1,4 m bajo la cámara;
  distancia del Pokémon = máx(2 m, 1,8 × altura real del dataset). `/dev/ar` se queda para medir otros móviles.

## D-046 · Encuentro y captura (plan de F2, F2-02): quién decide qué y cómo se lanza (2026-10-12, Kenneth)

- **El cliente decide si la bola TOCA al Pokémon; el servidor, todo lo demás.** El vuelo se calcula entero al soltar
  (`throw-physics.ts`): los saltos del Pokémon están programados con una semilla (el id del encuentro,
  `pokemon-motion.ts`), así que dónde estará al llegar la bola se sabe ya. Si toca, `POST /encounters/:id/throw` con la
  calidad propuesta (el servidor gasta la bola, tira el RNG, decide captura/huida y rebaja un "excelente" inverosímil,
  D-028). **Si no toca, no se llama al servidor y no se gasta nada** (ni bola ni Frambu): fallar no da ninguna ventaja, así
  que no hace falta que el servidor lo sepa, y no se castiga al jugador por la física.
- **Lanzamiento normalizado por distancia** (como Pokémon GO): con potencia 1 (un gesto de `REF_FLICK_PX_S` = 1800 px/s
  hacia arriba) y puntería 0 la bola llega al centro del Pokémon esté a 2 m o a 12 m; con más pasa por encima, con menos
  se queda corta; torcido falla. Gravedad real; tiempo de vuelo 0,55 s + 0,06 s/m. Los diminutos tienen una caja mínima
  (0,36 × 0,35 m) para que se les pueda dar.
- **Curva = girar el dedo ~0,9 vueltas alrededor de la bola antes de lanzar.** La bola se abre 0,6 m a un lado y vuelve
  a su línea: llega al mismo sitio (con el bonus ×1,7 de D-027); no exige apuntar desviado.
- **El aro de precisión es una elipse del tamaño de la caja del Pokémon** (no un círculo): lo que se ve es exactamente la
  zona que cuenta. Encoge de 1 a 0,2 cada 1,6 s; dentro y con el aro > 0,7 = Bien, > 0,4 = Genial, si no Excelente. Su
  color es la probabilidad SIN bonus de lanzamiento (≥ 60 % verde, ≥ 30 % amarillo, ≥ 15 % naranja, rojo).
- **Coreografía en dos partes:** al golpear empieza lo que no depende del servidor (absorber 0,6 s + caer 0,7 s) y a la
  vez sale la petición; las sacudidas y el final se añaden cuando responde. Así la latencia de Render se esconde y, si
  tarda más, la bola espera en el suelo balanceándose. Cada paso suena y vibra en el fotograma en que empieza.
- **Tipos del lanzamiento** (`ThrowRequest`, `ThrowResult`, `CaughtView`, `BagView`) en `shared/protocol/encounters.ts`;
  el servidor los reexporta. Lo capturado o huido se oculta del mapa en la app (`SpawnFeedService.hide`) porque el
  servidor no guarda spawns (D-025); la XP del HUD se suma en local con la misma curva (`AuthService.addXp`).
- **Naturalezas en español** en `shared/data/natures-es.ts`, sacadas de PokéAPI (el dataset no las trae).
- **Escena sin AR** (sin cámara, AR apagada o sin giroscopio): cámara quieta **mirando al Pokémon** (si mirara al
  horizonte, un Pikachu a 2 m quedaría fuera) y el horizonte del fondo ilustrado a la altura del de la escena.
- **F2-04 se parte en F2-04a (escena AR base) y F2-04b (personalidad, efectos y entrada).**
- Recetas de sonido nuevas (D-044): `land`, `shiny`, `ball-throw` (no `throw`: es un sonido de archivo en el spec de
  `AudioService`), `ball-hit`, `absorb`, `shake`, `capture`, `escape`.

## D-047 · Partículas del encuentro: se apaga el ALFA, no el color (F2-04b) (2026-10-12, Alex)

**Contexto:** el plan de F2-04b pintaba las partículas con mezcla aditiva y color × alfa ("oscuro = transparente").
Eso solo vale sobre un fondo opaco. El canvas del encuentro es **transparente** (debajo va el `<video>` o el fondo
ilustrado): el canal alfa del canvas suma el de la textura del punto (1 en el centro), así que una partícula que se
apaga queda con color casi negro y alfa 1 → **puntos negros** (visto en el navegador, `F2-04b_02_ANTES-*`).
**Decisión:** atributo `color` RGBA (itemSize 4): RGB = color del tipo y A = alfa de la partícula, y
`premultipliedAlpha: true` en el `PointsMaterial` (three usa `blendFunc(ONE, ONE)` y el shader premultiplica): se suma
(color·α, α) y lo apagado no se ve. Vale para `fx` y `burst` (también las estrellas de F2-07).
**Consecuencia:** en F2-05/F2-07, al escribir colores de puntos usar `setXYZW(i, r, g, b, alfa)`, nunca `r·α`. Un tipo
de color oscuro (Siniestro `#705746`) sigue viéndose como motas oscuras: es su color, no el fallo.

## D-048 · La AR es 3D: modelos `.glb` + ARCore, y la ficha del Pokémon en la cámara (2026-10-12, Alex)

**Contexto:** F2-04a/F2-04b dejaron la AR "de orientación" de D-045 (como el AR clásico de Pokémon GO): el arte oficial
plano mirando a la cámara, quieto al girar el móvil pero sin poder rodearlo andando. Alex lo vio y decidió: **"todo en
cámara debe ser 3D"** y **"deben salir las características del Pokémon"**.
**Decisión (Alex, 2026-10-12):**
1. **Modelos 3D** de `github.com/Pokemon-3D-api/assets` (`models/opt/regular/<id>.glb`, Draco + WebP). Verificado el
   12-10: 968 de 1025 en forma normal (faltan 57, sobre todo gen 8: 521, 668, 850-854…), media 335 KB, máx. 14 MB;
   shiny solo 150; rigueados, con 0-1 animaciones irregulares (Pikachu "Impactrueno", Charizard "dizzy", Gengar
   ninguna). Los modelos son © Nintendo/Creatures/GAME FREAK (extraídos de los juegos): proyecto académico sin
   publicar (D-010), **se cargan desde su URL y NO se suben a nuestro repo público**. Sin modelo → arte plano actual.
2. **ARCore** para pegar al Pokémon al suelo real y poder rodearlo (como el AR+ de Pokémon GO). El WebView no tiene
   WebXR (D-045), así que va un **plugin nativo de Capacitor propio** (Kotlin): pose + proyección por fotograma a
   three.js, detección del suelo y ancla. Primero un spike (F2-11) con Android. Sin ARCore → la AR de orientación de
   D-045 queda como alternativa (no se tira lo hecho).
3. **Ficha junto al Pokémon** en la cámara: tipos, nivel, PC, altura y peso reales × XS/XL, categoría y descripción de
   Pokédex (ES). **Se abre y se cierra con un botón** (cerrada por defecto: que no tape la cámara). **El PC lo calcula el servidor** (tiene los IVs, REGLA 3) y viene en `GET /encounters/:id`.
4. **"Todo en cámara"** incluye el combate en AR (F4-07): mismos modelos y ARCore.
**Orden:** F2-12 (modelo 3D, se puede hacer en el PC) → F2-13 (ficha) → F2-11 (spike ARCore, Android) → F2-14
(encuentro con ARCore) → F2-05 → F2-07. Lo de F2-04a/F2-04b sigue valiendo: personalidad, saltos, partículas, sonidos y
entrada se aplican al modelo 3D igual que al plano.
**Riesgos:** el repo de modelos es de terceros (si desaparece, los Pokémon vuelven al arte plano; se puede espejar en
un almacenamiento privado); modelos de hasta 14 MB (cargar con barra y caché); ARCore solo en móviles compatibles.

## D-049 · PC (puntos de combate): fórmula propia sobre las stats reales, la calcula el servidor (F2-13) (2026-10-12, Alex)

**Contexto:** la ficha del encuentro (D-048) y la colección (VISION, F3) enseñan "PC", pero no había fórmula: el
juego usa las stats de los juegos principales (`calcStats`, D-007), no las de Pokémon GO.
**Decisión:** `shared/engine/combat-power.ts`, a la manera de Pokémon GO sobre las stats REALES del individuo:
ataque = 7/8 del mayor + 1/8 del menor de (Ataque, At. Esp.); defensa = 5/8 del mayor + 3/8 del menor de (Defensa,
Def. Esp.); `PC = max(10, floor(ataque · √defensa · √PS / 10))`. Ejemplos: Pikachu Nv. 12 con IVs 15 → 46; Kricketot
Nv. 22 → 81. **Lo calcula el servidor** (`EncounterView.cp`; los IVs y la naturaleza no salen de él, REGLA 3).
La colección (F3-02/F3-03) debe usar la MISMA función. Peso del individuo = peso × heightScale (lineal).

## D-050 · Lanzamiento: la fuerza del dedo tiene una ZONA BUENA, no un valor exacto (F2-05, prueba en Android) (2026-10-12, Kenneth)

**Contexto:** en el Samsung A36 (APK de producción) Kenneth acertó **3 de 117** lanzamientos (2 capturas, 1 escape) y
lo describió como "muy difícil darle". D-046 normalizaba la potencia a un solo gesto (`REF_FLICK_PX_S` = 1800 px/s =
potencia 1) y la potencia escala TODO el vuelo: con un Pokémon diminuto a 2 m solo se acierta con potencia 0,96-1,04,
es decir 1.732-1.876 px/s. Medidos 17 lanzamientos "como salgan" con el dedo: **1.119-3.329 px/s** al soltar (mediana
~2.240) y puntería de −5° a +11°. Nadie controla la velocidad del dedo al ±4 %; en el navegador no se vio porque el
ratón sale lento y regular (bitácora de F2-05).
**Decisión:** `swipeToThrow` da **potencia 1 entre `GOOD_MIN_PX_S` = 1000 y `GOOD_MAX_PX_S` = 3600 px/s**; por debajo,
`v / 1000` (flojo → corto → "¡Casi!", sin gastar, D-046); por encima, `v / 3600` (pasa por encima). La física
(`throw-physics.ts`) no cambia. Lo difícil queda donde debe (como en Pokémon GO): **apuntar** (caja de ±5° a 2 m con
los diminutos), los **saltos** del Pokémon, el **aro** (Bien/Genial/Excelente) y la **curva**. Test con los 17 gestos
reales: rectos, 17/17 le dan a un diminuto a 2 m; con su puntería real, 13/17.
**Consecuencia:** quien toque el gesto o la física, que mantenga el test `lanzar con el dedo de verdad` de
`throw-gesture.spec.ts`; los datos del ratón no sirven para calibrar.
**Curva (mismo día, mismo motivo):** la curva no salía NUNCA con el dedo: se medía cuánto giraba el dedo alrededor
del punto donde se agarró la bola, pero al dibujar un círculo ese punto queda en su BORDE (como mucho ½ vuelta). En
4 curvas reales de Kenneth: 0,75 / 1,74 / 0,75 / −0,26 vueltas → el servidor recibió `curve=false` en los 3 aciertos.
Ahora `turnAngle` suma cuánto gira el **rumbo** del dedo (tramos ≥ 4 px, para ignorar el temblor) y se queda con el
máximo alcanzado (el tirón final hacia arriba no lo deshace): esas 4 curvas dan 2,17-2,32 vueltas. Umbral igual
(0,9 vueltas). `MAX_SAMPLES` del gesto 120 → 300 (en el A36 llegan ~50 muestras/s y dos círculos + lanzar ≈ 1,7 s).
Sus recorridos están en `a36-curve-gestures.data.ts` y el test los usa.

## D-051 · Distancia del encuentro: también el ANCHO, y medida desde el FRENTE del Pokémon (F2-15) (2026-10-12, Kenneth)

**Contexto:** D-045 colocaba al Pokémon a máx(2 m, 1,8 × altura). En vertical la pantalla abarca ~32° de ancho frente a
64° de alto (A36: 384 × 832, FOV vertical 64°), así que a 1,8 × altura un Pokémon tan ancho como alto llena el 96 % del
ancho. Y la regla se aplicaba a su CENTRO: Slowpoke XL (1,75 m, largo de cabeza a cola) mira a la cámara con la cara
~1,7 m por delante del centro → "me ocupaba prácticamente toda la pantalla" (Kenneth).
**Decisión:** `encounterDistance(alto, ancho, tan(FOV horizontal / 2), largo)` = máx(2 m, 1,8 × alto, ancho / (2 · tan ·
`MAX_WIDTH_FILL` = 0,7)) con tope de 12 m **para su frente**, + largo / 2 hasta su centro. El ancho y el largo salen de
la caja del modelo 3D (`size.x/size.y`, `size.z/size.y`); el arte plano no tiene largo. El modelo llega después de
colocarlo, así que `setModel` lo **recoloca** en la misma dirección; si el arte plano llega después del modelo, ya no
le cambia la proporción. Medido en el A36: Slowpoke XL pasa de llenar la pantalla a ~52 % del ancho, 59,6 fps.
Los pequeños y los estrechos no cambian (Pikachu 2 m; Diggersby ya cabía, ~70 %).
**Consecuencia:** el aro y la caja del lanzamiento siguen en el CENTRO del Pokémon: en los largos se ven más pequeños
que su cara (`F2-15_01`). Si molesta, la caja podría ir a su frente (`throwTarget`), con su test de física.

## D-052 · Colección (F3): PC guardado, caramelos por cadena evolutiva, Pokédex al abrir/capturar y los IVs se enseñan a su dueño (F3-02a) (2026-10-13, Samuel)

- **`CaughtPokemon.cp`** se calcula al capturar (`combatPower(calcStats(...))`, D-049) y se recalcula si cambia el nivel
  (F3-05): así la base ordena y pagina por PC. Es opcional (`Int?`): las capturas de antes de F3-02a lo tienen vacío
  hasta `npm run db:backfill-collection`, y mientras tanto `GET /collection` lo calcula al vuelo.
- **Caramelos por familia = `evolutionChainId`** del dataset (Pichu, Pikachu y Raichu comparten). Capturar +3, transferir
  +1 (`shared/engine/candy.ts`, como Pokémon GO). Se suman en la MISMA transacción que la captura; `ThrowResult.candy`
  los devuelve (un reintento con el mismo `clientThrowId` responde lo mismo y no suma dos veces).
- **Pokédex:** "visto" al abrir un encuentro (`GET /encounters/:id`, mejor esfuerzo: si falla, el encuentro sigue);
  "capturado" en la transacción de la captura; `firstCaughtAt` nunca se pisa.
- **Los IVs y las stats del individuo se devuelven SOLO en `GET /collection/:id` y solo a su dueño** (como la
  valoración de Pokémon GO; VISION pide "IVs (barras)"). Antes de capturar siguen ocultos (D-049). Saber los IVs de lo
  propio no ayuda a predecir spawns: la semilla es HMAC con `SPAWN_SALT` (D-025).
- **Paginación por cursor** (`id` de la última fila) con `id` de desempate; 30 por defecto, máx. 50. Un cursor que no es
  del jugador → 400. Filtro por tipo = `speciesId IN (…)` con las especies de ese tipo (calculadas al cargar el dataset).
- **Despliegue:** la migración `20261013010000_collection` + `db:backfill-collection` se aplican en Supabase **ANTES** de
  mezclar (si Render despliega antes, cada captura da 500 porque faltan las tablas). El script es idempotente: rellena el
  PC que falte, la Pokédex de todo lo capturado y los caramelos solo a jugadores sin ninguno.

## D-053 · Evolución con caramelos: el coste depende de la profundidad de la cadena (F3-05) (2026-10-13, Samuel)

**Contexto:** el juego no tiene piedras, intercambios, amistad ni objetos; los métodos de los juegos (nivel 16, Piedra
Trueno, intercambio…) se enseñan solo como información en la Pokédex (F3-04). Hacía falta una regla única y barata.
**Decisión:** como Pokémon GO, en `shared/engine/evolution.ts` (`evolutionOptions`): cadenas de **una** evolución
(Rattata→Raticate, Magikarp→Gyarados y las 8 ramas de Eevee) cuestan **50** caramelos de la familia; en cadenas de
**dos**, la primera **25** y la segunda **100** (Bulbasaur→Ivysaur 25, Ivysaur→Venusaur 100; Pichu→Pikachu 25,
Pikachu→Raichu 100; Wurmple→Silcoon/Cascoon 25). La etapa se cuenta con `evolvesFrom`; la profundidad de la cadena, una
vez por mapa de especies. Sin nivel mínimo. Al evolucionar se **conservan** nivel, IVs, naturaleza, género, shiny,
tamaño, mote, favorito y lugar/fecha de captura; cambian especie, stats, PC (D-049) y movimientos (los 4 por defecto de
la especie nueva a su nivel, D-030). La Pokédex marca la especie nueva como capturada.
**Consecuencia:** el servidor decide (REGLA 3): `POST /collection/:id/evolve { to }` usa la MISMA función; la app solo la
usa para pintar los botones. Si F8-05 quiere evolucionar en la demo sin farmear, que regale caramelos en el modo demo
(nunca un endpoint público).

## D-055 · IS-11 con la nueva UI: editar y eliminar desde la ficha, confirmaciones propias (F3-06a) (2026-10-13, Samuel)

(D-054 queda reservada para F3-06b, como dice el plan.)
**Contexto:** la lista del inventario usaba `ion-item-sliding` (deslizar para editar/eliminar) y `UiService.confirm`
(el `alert` de Ionic); con tarjetas en rejilla no hay fila que deslizar, y el plan pide "nada de alert del sistema".
**Decisión:** la lista solo abre la ficha y tiene "Agregar" (ADMIN). **Editar y Eliminar están en la ficha
`/pokemon/:id`** (solo ADMIN, D-023), y eliminar pide confirmación con `app-confirm-panel` (`shared/ui/`, rol
`alertdialog`, botón rojo). `UiService` se queda solo con `toast`. Los tipos del formulario se eligen con chips
(máx. 2) en vez de `ion-select`. Servicios, modelo, `PokemonFormComponent` (lo que emite) y el contrato `/pokemon`
no cambian; Postman pasa igual.
**Consecuencia:** quien necesite confirmar algo en otra pantalla, que use `app-confirm-panel`; `app-game-button`
tiene variante `danger`; `app-search-field` es el buscador común.

## D-054 · Equipos con Pokémon capturados: `caughtIds` junto a `pokemonIds` (F3-06b) (2026-10-13, Samuel)

**Contexto:** `Team.pokemonIds` son números de Pokédex: es el contrato de JSON Server del curso (D-019) y lo usa la
colección de Postman. El juego (combate F4/F5) necesita equipos de Pokémon CAPTURADOS (ARQUITECTURA §9).
**Decisión:** se **conserva** `pokemonIds` y se añade `Team.caughtIds UUID[]` (migración `team_caught`, por defecto
`{}`, CHECK `max_six_caught` ≤ 6). En `/teams`: `caughtIds` opcional, ≤ 6, UUID sin repetir; todos deben ser del jugador
(400 "Hay Pokémon que no son tuyos"), comprobado en la MISMA transacción que la escritura con `SELECT … FOR SHARE`, así
una transferencia simultánea espera y luego lo quita (o, si llegó antes, la escritura da 400). `PUT` sin `caughtIds`
(Postman) **los conserva**; `PATCH` igual. Transferir (`DELETE /collection/:id`) hace `array_remove` en los equipos del
jugador dentro de su transacción. Para pintar los equipos sin una petición por Pokémon: `GET /collection?ids=a,b`
(≤ 50, solo lo tuyo).
**Consecuencia:** el combate debe leer `caughtIds`, no `pokemonIds`. La migración se aplicó en Supabase el 2026-10-13
ANTES de mezclar (2 equipos existentes → `caughtIds` vacío).
