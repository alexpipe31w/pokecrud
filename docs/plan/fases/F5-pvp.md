# F5 · PvP en tiempo real — Plan de implementación

> **Para IAs:** usa la skill `executing-plans` (o `subagent-driven-development`). Cada tarea = una tarea del ROADMAP
> (`F5-02` … `F5-05`) = **una rama y un PR**. Antes: REGLA 1 de `CLAUDE.md`. Al acabar: REGLA 2. Marca las casillas
> `- [ ]` de TU tarea en TU rama según avances (son el punto de guardado). Los pasos de código siguen TDD: test que
> falla → código mínimo → verde → commit. Escrito por Alex (Claude) en F5-01, 2026-10-13. Decisiones en **D-056**.

**Objetivo (VISION, pilar 4):** dos compañeros combaten **en vivo** desde sus móviles, por invitación (código de 6
letras) o "buscar rival", con sus Pokémon **capturados** (equipos de F3-06b, D-054) normalizados a nivel 50. El servidor
es el árbitro: ejecuta el MISMO motor de F4 (`shared/engine/battle/`) con SU RNG y manda a cada uno los eventos para que
la escena de F4-05 los reproduzca igual que contra la IA. Criterio final (F5-04): combate entre dos móviles reales
grabado en vídeo.

**Contrato:** `shared/protocol/pvp.ts` (YA ESCRITO en F5-01, compila en app y servidor). Léelo antes de tocar nada: los
nombres de mensajes, códigos de error, constantes (30 s, 60 s, nivel 50…) y vistas salen de ahí.

## Qué se verificó en F5-01 (spike en el PC de Alex, 2026-10-13, código borrado tras medir)

Spike = gateway mínimo `/pvp` + `socket.io-client` en un test de Vitest del servidor, sin base de datos.

| Comprobación | Resultado |
| --- | --- |
| `@nestjs/websockets@12.1.2` + `@nestjs/platform-socket.io@12.1.2` (trae `socket.io@4.8.3`) con Nest 12.1.2 ESM | ✔ arranca, `@SubscribeMessage` responde con ack |
| JWT en `handshake.auth.token`, verificado con `JWT_VERIFY_OPTIONS` en `handleConnection` | ✔ sin token / basura / firmado con otro secreto → `pvp:error {code:'unauthorized'}` + desconexión |
| Acción repetida (misma clave) | ✔ la segunda devuelve la respuesta guardada, un solo eco a la sala |
| `handleDisconnect` sabe qué jugador se fue (`client.data.playerId`) | ✔ |
| **`JwtAuthGuard` global (APP_GUARD) sobre mensajes del socket** | ✘ **revienta**: `Cannot read properties of undefined (reading 'authorization')` (usa `switchToHttp()`); el cliente se queda SIN respuesta (timeout del ack) |
| **`ThrottlerGuard` global sobre mensajes del socket** | ✘ **todos los sockets comparten UN cubo** de 120/min: 2 jugadores × 70 mensajes → 118 OK y **22 perdidos en silencio** |
| Con los dos arreglos de abajo | ✔ 140 de 140, 0 perdidos; los e2e HTTP no cambian (el arreglo solo actúa fuera de HTTP) |
| Render Free con WebSockets | ✔ los admite, y los mensajes WS cuentan como tráfico (no se duerme en mitad de un combate; changelog de Render) |

**Arreglos verificados (van en F5-02, paso 1):**

```ts
// server/src/auth/jwt-auth.guard.ts — primera línea de canActivate:
// El socket /pvp se autentica UNA vez en el handshake (pvp.gateway.ts); este guard es solo para HTTP.
if (ctx.getType() !== 'http') return true;
```

```ts
// server/src/common/http-throttler.guard.ts (nuevo) y en app.module.ts { provide: APP_GUARD, useClass: HttpThrottlerGuard }
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  /** Los mensajes del socket tienen su límite POR SOCKET en el gateway; el global (por IP) es solo para HTTP. */
  protected override async shouldSkip(ctx: ExecutionContext): Promise<boolean> {
    return ctx.getType() !== 'http' || super.shouldSkip(ctx);
  }
}
```

## Arquitectura

```
shared/protocol/pvp.ts                 ← contrato (F5-01, hecho)
shared/engine/battle/pvp-view.ts       ← PURO: perspectiva (tú = lado 0), información oculta, acción por defecto
server/src/pvp/
  pvp.module.ts
  pvp.gateway.ts                       ← SOLO transporte: handshake, límite por socket, validar carga, delegar, emitir
  pvp-teams.service.ts                 ← BD: equipo (caughtIds) del jugador → PokemonInit[] a nivel 50
  pvp-lobby.service.ts                 ← invitaciones (código, 5 min) y cola "buscar rival", en memoria
  battle-room.ts                       ← una sala: decisiones, temporizador, reconexión, fin (clase sin Nest, reloj inyectado)
  battle-rooms.service.ts              ← Map<battleId, BattleRoom>, Map<playerId, battleId>; crea, busca, cierra
  battles.repository.ts                ← guarda el resultado (tabla Battle) al terminar, idempotente
  battle-data.service.ts               ← BattleContext del servidor: movimientos soportados + tabla de tipos (una vez)
src/app/services/game/pvp-socket.service.ts   ← socket.io-client, token en cada (re)conexión, signals
src/app/features/pvp/                         ← /pvp: invitar, unirse con código, buscar rival, esperando
src/app/features/battle/battle.controller.ts  ← modo remoto: los eventos llegan del servidor (F5-04)
```

- **Un solo proceso** (D-005): salas, invitaciones y cola viven en memoria. Un despliegue en Render (cada mezcla en
  `develop`) **corta los combates en curso** sin resultado; no se intenta recuperarlos. No mezclar durante una demo.
- **Concurrencia:** Node atiende un mensaje cada vez. Regla de oro de la sala: **comprobar y cambiar el estado sin un
  `await` en medio**. Lo que necesita la BD (cargar el equipo, guardar el resultado) va ANTES de reclamar (equipo) o
  DESPUÉS de cerrar la sala en memoria (resultado). Así dos "unirse" al mismo código o dos acciones a la vez no se pisan.
- **El cliente nunca decide** (REGLA 3): manda `BattleAction`; el servidor la valida con el motor (`BattleError` →
  `invalid-action`), tira el RNG y resuelve.

## Reglas del PvP (D-056)

1. **Equipos:** un `Team` del jugador (`WHERE id = ? AND playerId = ?`) con `caughtIds` (D-054). Se cargan los
   `CaughtPokemon` con `id IN caughtIds AND playerId = yo` en el orden del equipo; los que ya no estén (transferidos) se
   saltan; 0 → `team-empty`. **Se congela al empezar**: transferir o editar el equipo después no cambia el combate.
2. **Nivel 50 para todos** (ARQUITECTURA §7): `calcStats(base, ivs, 50, nature)` y movimientos =
   `defaultMoves(learnset, 50, soportado)` (los mismos 4 que tendría a nivel 50; también arregla movimientos viejos no
   soportados). IVs y naturaleza del individuo SÍ cuentan (es lo que hace único a tu Pokémon).
3. **Decisiones en vez de `seq`** (sustituye al `seq` de ARQUITECTURA §8): cada vez que la sala espera acciones abre
   `decision = n + 1` y dice a quién le toca (`mustDo`: ambos `act`; tras un debilitado solo `switch` quien debe cambiar;
   el otro `wait`). La acción va con `{battleId, decision}`. Misma decisión dos veces → `{ok:true, duplicate:true}` sin
   aplicar nada. Decisión vieja → `stale-decision`. **La primera acción manda** (no se puede cambiar de idea).
4. **Tiempo:** 30 s por decisión (`remainingMs` en cada vista; relativo, nunca hora absoluta). Al acabar, el servidor
   juega por ti la **acción por defecto** (`defaultAction` en `pvp-view.ts`): primer movimiento con PP (sin PP en
   ninguno → índice 0 = Forcejeo); en un cambio forzado, el primer Pokémon en pie. **3 decisiones seguidas** agotando el
   tiempo → pierdes por `inactive`.
5. **Desconexión:** el combate sigue (el tiempo corre y juega por ti). Al rival le llega `battle:opponent
   {connected:false, graceMs}`. Si no vuelves en **60 s** → pierdes por `abandon`. Si se van los dos → `winner: null`.
   Al volver: `pvp:hello` devuelve la vista entera (`battle`) y sigues donde ibas.
6. **Rendirse** (`battle:forfeit`): en cualquier momento, gana el otro (`forfeit`). No pasa por el motor.
7. **Un combate a la vez por jugador**; una entrada de "sala de espera" a la vez (invitación O cola): crear otra sustituye
   a la anterior. Entrar en combate o desconectarse la borra.
8. **Información oculta:** ver `PublicSide` en el contrato. Los eventos `move` sí revelan el movimiento usado (como en los
   juegos) y los `damage` los PS que quedan.
9. **Sin premios en la v1** (ni XP ni caramelos): con dos cuentas se podría farmear. El ranking (F7-05) leerá la tabla
   `Battle`.
10. **Persistencia:** al terminar, `Battle(id = battleId, kind 'pvp', p1Id, p2Id, winnerId?, reason, seed, turns, log,
    startedAt, endedAt)`; `log` = las acciones de cada decisión (con `seed` se reproduce el combate entero: el motor es
    determinista). Insertar con el id de la sala y **`ON CONFLICT (id) DO NOTHING`** (un reintento no duplica). Si la BD
    falla: 3 reintentos con espera creciente y, si no, `logger.error({ battleId, … })` (el combate ya terminó para los
    jugadores; no se les rompe nada). **Retención:** `log` a `null` en combates de más de 90 días (tarea en F8-03; hasta
    entonces ocupa ~5 KB por combate).

## Seguridad y límites (checklist de `estandares-produccion`, modo Construir)

- **Autenticación:** access token en `handshake.auth.token`, verificado con `JWT_VERIFY_OPTIONS` (HS256, `iss`, `aud`) y
  `sub` con formato UUID, igual que `JwtAuthGuard`. Se comprueba **solo al conectar** (un combate puede durar más que
  los 15 min del token; no se corta). En el cliente `auth` es una **función** que pide el token actual (y refresca si
  hace falta) en cada reconexión: así una reconexión a los 20 min no falla.
- **Autorización:** el `playerId` sale SIEMPRE de `client.data.playerId` (del token), nunca del cuerpo. Una acción
  sobre un `battleId` en el que no estás → `battle-not-found` (no se revela que existe).
- **Límite por socket:** 20 mensajes cada 10 s (cubo en memoria en el gateway); pasarse → ack `rate-limited` (no se
  desconecta). Conexiones: como mucho 3 sockets a la vez por jugador (la 4.ª se rechaza con `rate-limited`).
- **Validación en el borde:** cada carga se valida con funciones puras (`pvp.validation.ts`: tipos, enteros, longitud
  del código, `action.kind` de la lista cerrada) antes de tocar la sala; mal formada → `bad-request`. Nada de
  `ValidationPipe` en el socket (sus excepciones no vuelven por el ack).
- **CORS del socket:** la misma lista `CORS_ORIGINS` que HTTP (`@WebSocketGateway({ namespace, cors: { origin } })`).
  `maxHttpBufferSize` de Socket.IO a 16 KB (los mensajes del juego son pequeños).
- **Logs:** `pvp.connect`/`pvp.disconnect`/`battle.start`/`battle.end` con `playerId` y `battleId`; nunca el token.

## Orden y paralelismo

```
F5-02 gateway (auth, guards, límites, hello) ─> F5-03 sala de espera (invitar, código, cola, equipos) ─> F5-04 combate ─> F5-05 espectadores
```

F5-02 y F5-03 se prueban enteros en el PC (dos clientes `socket.io-client` en Vitest). F5-04 necesita **dos móviles**
para el criterio (vídeo); hasta entonces, dos ventanas del navegador a 390×844 con dos cuentas.

## Mapa de archivos

| Archivo | Tarea | Responsabilidad |
| --- | --- | --- |
| `server/package.json` | F5-02 | `@nestjs/websockets@12.1.2`, `@nestjs/platform-socket.io@12.1.2` (versión exacta, igual que el núcleo) |
| `package.json` (app) | F5-02 | `socket.io-client@4.8.3` exacta |
| `server/src/auth/jwt-auth.guard.ts`, `server/src/common/http-throttler.guard.ts`, `app.module.ts` | F5-02 | Arreglos del spike |
| `server/src/pvp/pvp.gateway.ts`, `pvp.module.ts`, `pvp.validation.ts`, `socket-rate-limit.ts` | F5-02 | Transporte, auth, límites, `pvp:hello` |
| `server/test/pvp-gateway.e2e-spec.ts` | F5-02 | Handshake, límites, HTTP sigue igual |
| `server/src/pvp/pvp-teams.service.ts`, `pvp-lobby.service.ts` | F5-03 | Equipos a nivel 50; invitaciones y cola |
| `shared/engine/battle/pvp-view.ts` (+ spec) | F5-04 | `viewFor`, `eventsFor`, `defaultAction` |
| `server/src/pvp/battle-room.ts` (+ spec), `battle-rooms.service.ts`, `battle-data.service.ts`, `battles.repository.ts` | F5-04 | La sala y el resultado |
| `server/prisma/schema.prisma` + migración `battle` | F5-04 | Tabla `Battle` (**a Supabase ANTES de mezclar**, con permiso del humano) |
| `src/app/services/game/pvp-socket.service.ts`, `src/app/features/pvp/**` | F5-03/F5-04 | Cliente y pantallas |
| `src/app/features/battle/battle.controller.ts` | F5-04 | Modo remoto |

## F5-02 · Gateway Socket.IO

- [x] **Paso 1 — dependencias y arreglos del spike:** instalar las versiones exactas de la tabla (en `server/` y
  `socket.io-client` en la raíz; **antes** hacer `/guardar`, REGLA 2b). Aplicar los dos arreglos de arriba. Test e2e
  que falla sin ellos: un mensaje del socket con ack recibe respuesta (sin el arreglo del guard → timeout); 2 sockets ×
  70 mensajes → 140 respuestas. Los e2e HTTP existentes siguen verdes (`throttle.e2e-spec.ts` incluido).
- [x] **Paso 2 — `pvp.gateway.ts`:** `@WebSocketGateway({ namespace: PVP_NAMESPACE, cors, maxHttpBufferSize })`;
  `handleConnection` verifica el token (como el spike: `client.data.playerId = sub`, `client.join('player:' + sub)`) o
  emite `pvp:error {code:'unauthorized'}` y desconecta; tope de 3 sockets por jugador; `handleDisconnect` avisa a
  `BattleRoomsService` (en F5-02 aún no existe: deja el gancho con un `TODO(F5-04)` y un test que lo llame).
- [x] **Paso 3 — límite por socket** (`socket-rate-limit.ts`, puro con reloj inyectado, + spec) y validación
  (`pvp.validation.ts` + spec: cada carga del contrato, válida e inválida).
- [x] **Paso 4 — `pvp:hello`** devuelve `{ok:true, battle:null, lobby:null}` (se rellena en F5-03/F5-04).
- [x] **Paso 5 — app:** `PvpSocketService` (`providedIn: 'root'`, se conecta solo cuando se entra en `/pvp` o hay un
  combate PvP; `auth: (cb) => cb({ token: <access actual o refrescado> })`, `transports: ['websocket']`,
  reconexión con espera creciente que trae Socket.IO), signal `status` (`offline | connecting | online`), `request<K>`
  tipado con `PvpClientEvents` y `timeout(8000)` → error "Sin conexión con el servidor". Al recibir `unauthorized`:
  `auth.refresh()` y reintentar UNA vez; si vuelve a fallar, sesión perdida (como el interceptor HTTP). Tests del
  servicio con un socket falso.
- [x] **Paso 6:** e2e del gateway (sin token / token falso / caducado; con token → hello OK; 21 mensajes en 10 s → el
  21.º `rate-limited`; 4.º socket rechazado), lint, build de app y servidor, REGLA 2.
  **Hecho (2026-10-13, Alex):** e2e 6/6 (+ 140 respuestas con 7 sockets; con el `ThrottlerGuard` de antes, 120).
  Ojo para F5-03: el chunk perezoso de `socket.io-client` no se ha podido ver aún porque ninguna pantalla usa el
  servicio (el build lo elimina); comprobarlo cuando `/pvp` lo importe.

## F5-03 · Invitar / código / buscar rival

- [x] **Paso 1 — `PvpTeamsService.load(playerId, teamId)`** → `PokemonInit[]` a nivel 50 (regla 1 y 2), en UNA consulta
  de equipo + UNA de Pokémon (nada de N+1). e2e con BD: equipo ajeno → `team-not-found`; equipo con un transferido → lo
  salta; vacío → `team-empty`; stats = `calcStats(..., 50, ...)`.
- [x] **Paso 2 — `PvpLobbyService`** (puro con reloj e `idGen` inyectados, + spec): `createInvite` (código con
  `crypto.randomInt` sobre `PVP_INVITE_ALPHABET`, sin colisión con los vivos, caduca a los 5 min), `joinInvite`
  (reclamar el código = `get` + `delete` SIN `await` en medio; propio → `own-invite`), cola FIFO, una entrada por
  jugador, `leave`, limpieza de caducados en cada operación (sin `setInterval`). **Test de concurrencia:** dos
  `joinInvite` del mismo código "a la vez" (`Promise.all`) → uno empieza combate y el otro `invite-not-found`.
- [x] **Paso 3 — gateway:** `pvp:invite:create`, `pvp:invite:join`, `pvp:queue:join`, `pvp:lobby:leave`. El equipo se
  carga (await) ANTES de reclamar el código o entrar en la cola. Al emparejar llama a `BattleRoomsService.start(a, b)`
  (en F5-03, un doble que emite `battle:start` con una vista mínima; la sala real llega en F5-04).
  **Cambio al hacerlo (Alex):** en vez de un doble, `BattleRoomsService` ya crea el combate de verdad
  (`createBattle` + `BattleDataService`) y manda la vista con `viewFor` (adelantado del paso 1 de F5-04, en
  `shared/engine/battle/pvp-view.ts`), y ya sabe **rendirse** (`battle:forfeit`): sin eso, dos jugadores emparejados se
  quedaban atascados en `already-in-battle` hasta reiniciar el servidor. La clase es `PvpLobby` (pura), no un servicio.
- [x] **Paso 4 — pantalla `/pvp`** (DISENO, `impeccable`, nada de Ionic por defecto): elegir equipo (de `/equipos`;
  sin equipos → enlace a crear uno), "Invitar" (código grande con letras separadas, botón copiar, cuenta atrás de 5 min,
  cancelar), "Unirme" (6 casillas, mayúsculas solas, pegar), "Buscar rival" (animación de espera, cancelar), estados
  sin conexión / servidor despertando (D-043). Entrada en el menú de la Poké Ball.
- [x] **Paso 5:** e2e con dos clientes (invitación y cola), vista móvil 390×844 con dos cuentas en dos pestañas,
  evidencias `F5-03_*`, REGLA 2.
  **Hecho (2026-10-13, Alex):** e2e `pvp-lobby` 5/5 y `pvp-teams` 3/3; navegador con `demo+alex` y `demo+rival` (equipo
  "Arena"): menú, código, código malo, cara a cara en las dos ventanas, rendición, buscar rival → emparejados, 0
  errores de consola. Socket.IO va en un chunk perezoso de 42 KB (no en `main`).

## F5-04 · Combate PvP completo

- [x] **Paso 1 — `pvp-view.ts`** (puro, + spec): `viewFor(state, me, decision, mustDo, remainingMs, revealed)` (tu lado
  completo; el rival solo con lo revelado); `eventsFor(events, stateBefore, me)` (gira los lados: `side === me ? 0 : 1`;
  y el `switch` lleva `pokemon: PublicPokemon` sacado de `stateBefore`); `defaultAction(state, side)`. Tests: la vista
  del rival NO contiene `moves`, `stats` ni `ivs` (comprobar con `JSON.stringify`); girar dos veces = original; el combate
  de snapshot de F4-04 visto desde el lado 1 tiene los mismos eventos con los lados cambiados.
- [x] **Paso 2 — `BattleRoom`** (+ spec con reloj falso, `vi.useFakeTimers`): `start`, `act(player, decision, action)`
  (regla 3), temporizador (regla 4), `disconnect`/`reconnect` (regla 5), `forfeit`, fin. Emite por un callback
  `send(playerId, evento, msg)` (la sala no conoce Socket.IO). Tests: acción duplicada; decisión vieja; acción inválida
  no gasta la decisión; solo el que debe cambiar puede actuar; 3 tiempos agotados → `inactive`; desconexión 60 s →
  `abandon`; reconectar a los 59 s → sigue; los dos fuera → `winner null`; **dos `act` del mismo jugador "a la vez"
  → se aplica una**; combate entero con semilla fija → mismo resultado que `resolveTurn` en local.
- [x] **Paso 3 — persistencia:** modelo `Battle` + migración `battle` (índices `(p1Id, endedAt)`, `(p2Id, endedAt)`),
  `BattlesRepository.save` idempotente (regla 10). e2e: guardar dos veces el mismo id → una fila. **Aplicar en Supabase
  ANTES de mezclar** (con `DIRECT_URL` y permiso del humano), como F3-02a y F3-06b.
- [x] **Paso 4 — `BattleRoomsService` + gateway:** `battle:act`, `battle:forfeit`, `pvp:hello` con el combate en curso,
  `handleDisconnect` → sala; `battle-data.service.ts` carga movimientos soportados y tabla de tipos una vez (de
  `src/assets/data`, como `SpawnsService`). e2e con dos clientes: combate entero hasta `battle:end` y fila en `Battle`;
  reconexión a mitad (cerrar un socket y abrir otro con el mismo token → `hello` trae la vista y se sigue).
- [x] **Paso 5 — app, modo remoto de `BattleController`:** `startRemote(view, opponent)` y aplicar cada `battle:turn`
  con la MISMA reproducción (`play`): el `switch` usa `e.pokemon` si viene (en local sigue leyendo `before`). `moves` y
  `bench` leen solo tu lado (`view.me`), que es un `BattleSide` igual que en local. `act()` manda `battle:act` y espera
  el ack (si la red falla, reintenta la MISMA decisión: es idempotente). Mientras el rival elige: "Esperando a <rival>…"
  con su cuenta atrás. Rival desconectado: aviso con los segundos que le quedan. Fin: victoria/derrota con el motivo
  (`forfeit` "se rindió", `abandon` "se desconectó", `inactive` "no eligió a tiempo"). Combate interrumpido por
  reinicio del servidor: mensaje claro y vuelta a `/pvp`. Escena: la de F4-05 hasta que F4-07 (AR) la sustituya
  (D-034); todo lo de aquí vive en el controlador, así F4-07 lo hereda.
- [~] **Paso 6:** (navegador hecho, falta el vídeo con dos móviles) dos cuentas en dos pestañas a 390×844 (combate entero, rendirse, cerrar una pestaña y volver, dejar
  correr el tiempo). **Criterio de aceptación:** combate entre **dos móviles reales** (APK de producción contra Render)
  grabado en vídeo → `docs/evidencias/F5-04_*`. REGLA 2.

## F5-05 · Espectadores

- [ ] Plan corto al empezarla (depende de cómo quede F5-04): sala de Socket.IO `watch:<battleId>`, vista con los DOS
  lados públicos (`PublicSide` × 2), sin acciones; entrar por el código de la invitación o desde el bracket (F6). El
  servidor manda a los espectadores los eventos con UN turno de retraso (para que nadie "sople" por otra cuenta).

## Riesgos

- **Despliegue = combates cortados** (salas en memoria, D-005). Aceptado para clase: no mezclar en `develop` durante
  la demo. Si molesta, F8: guardar `seed` + acciones por decisión en la BD y reconstruir la sala al arrancar (el motor
  es determinista, se puede).
- **Render dormido:** el primer `connect` tarda lo que tarde en despertar (~50 s). La pantalla `/pvp` usa el mismo
  estado "servidor despertando" que el login (D-043); conviene hacer `GET /health/live` antes de abrir el socket.
- **Redes móviles que cortan WebSocket:** `transports: ['websocket']` evita el sondeo HTTP (más simple con CORS y el
  proxy de Render). Si en un móvil real no conecta, probar `['websocket', 'polling']` y anotarlo.
- **Equilibrio:** a nivel 50 un Pokémon recién capturado vale lo mismo que uno de nivel 40 de la misma especie salvo
  IVs/naturaleza. Es lo justo (D-056); si el PO quiere que el nivel cuente, se cambia la regla 2 (un número).
- **Tamaño del cliente:** `socket.io-client` ≈ 14,7 KB gzip (medido: `socket.io.min.js` 4.8.3); solo se importa desde `/pvp` y el combate remoto (ruta
  perezosa), no en el arranque.
