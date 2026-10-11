# Arquitectura — PokéCRUD GO

> Fuente de verdad técnica. Si vas a hacer algo distinto de lo que dice aquí, primero se anota
> en `DECISIONES.md` y se avisa al humano. Lo marcado **[SPIKE]** está sin verificar en un móvil
> real: la tarea correspondiente del ROADMAP lo confirma o lo cambia.

## 1. Vista general

```
┌──────────────────────────── App Android (APK) ────────────────────────────┐
│ Angular 22 (zoneless, signals) + Ionic 9 + Capacitor 8                    │
│                                                                            │
│  Mapa (Google Maps JS vectorial + three.js overlay)                        │
│  Encuentro AR (cámara getUserMedia + three.js + giroscopio)                │
│  Colección / Pokédex / Equipos / Combate / Torneos (Ionic + UI propia)     │
│  Audio (Web Audio API)  ·  Hápticos (@capacitor/haptics)                   │
│  Dataset local: src/assets/data/*.json (generado desde PokéAPI)            │
└──────────────┬───────────────────────────────┬────────────────────────────┘
               │ HTTPS REST (JWT)              │ WebSocket (Socket.IO, JWT)
┌──────────────▼───────────────────────────────▼────────────────────────────┐
│ server/  NestJS 12 + Socket.IO + Prisma                                    │
│  auth · players · pokemon (colección) · spawns · encounters (captura)     │
│  teams/favorites/customPokemon (el CRUD del curso) · battles · tournaments│
│  shared/ engine (fórmulas puras) ← el MISMO código que usa el cliente      │
└──────────────┬────────────────────────────────────────────────────────────┘
               │
        PostgreSQL (Supabase, plan gratis)
```

Externos: **PokéAPI** (solo en el script de build del dataset, nunca en caliente desde el
servidor), **raw.githubusercontent.com/PokeAPI/sprites y /cries** (imágenes y gritos, en caliente
desde el cliente con caché), **Google Maps JS API** (mapa), **Open-Meteo** (clima real, gratis y sin
key), **OpenStreetMap Overpass** (Poképaradas, fase extra).

## 2. Estructura de carpetas (objetivo)

```
pokecrud/
├── CLAUDE.md                  ← reglas para las IAs (léelo)
├── docs/plan/                 ← memoria compartida del equipo
│   └── fases/                 ← plan detallado de cada fase (lo escribe quien la empieza)
├── shared/                    ← TypeScript puro, sin Angular ni Nest. Lo importan app y server.
│   ├── engine/
│   │   ├── types.ts           ← PokemonType, Stat, Nature, MoveCategory…
│   │   ├── type-chart.ts      ← efectividad 18×18 (generado del dataset)
│   │   ├── stats.ts           ← calcStat(base, iv, ev, level, nature)
│   │   ├── damage.ts          ← fórmula de daño Gen V+
│   │   ├── capture.ts         ← probabilidad de captura + nº de sacudidas
│   │   ├── battle-engine.ts   ← máquina de estados de combate (reducer puro)
│   │   ├── rng.ts             ← PRNG con semilla (mulberry32) — NUNCA Math.random en el engine
│   │   └── spawns.ts          ← spawnsForCell(cellId, timeSlot, salt) determinista
│   ├── protocol/              ← tipos de mensajes REST/WebSocket (contrato app↔server)
│   └── **/*.spec.ts           ← Vitest
├── scripts/
│   └── build-dataset.mjs      ← descarga PokéAPI una vez → src/assets/data/
├── server/                    ← NestJS (package.json propio)
│   ├── prisma/schema.prisma + migrations/
│   └── src/<modulo>/…
├── backend/                   ← JSON Server ORIGINAL (se conserva hasta F0-08, luego se archiva)
└── src/                       ← App Angular/Ionic (se mantiene en la raíz para no romper angular.json)
    ├── assets/
    │   ├── data/              ← pokedex.json, moves.json, types.json (generados, commiteados)
    │   ├── audio/sfx/ y audio/music/   ← SOLO audio libre (CC0 / creado por nosotros), ver CREDITOS.md
    │   └── models/            ← glTF propios (avatar, Poké Balls) si los hay
    └── app/
        ├── core/              ← layout, guards, interceptores, config, permisos nativos
        ├── services/          ← api, socket, auth, location, compass, audio, haptics, dataset
        ├── game/              ← motores de presentación (three.js) — sin Angular dentro
        │   ├── map-scene/     ← overlay 3D del mapa (avatar, Pokémon, hierba)
        │   ├── encounter-scene/ ← escena AR/captura
        │   └── battle-scene/  ← escena de combate
        ├── features/          ← una carpeta por pantalla (mapa, encuentro, pokedex, colección,
        │                         detalle, equipos, favoritos, mis-pokemon, combate, torneos, perfil)
        ├── shared/            ← componentes UI del juego (botón, carta tipo, barra PS, chip tipo…)
        └── models/            ← interfaces de la app
```

Por qué `shared/`: las fórmulas de captura y daño tienen que dar **exactamente** lo mismo en el
cliente (para animar/predecir) y en el servidor (para decidir). Un solo código, probado con Vitest.

## 3. Dataset de Pokémon (todas las especies, sin martillar PokéAPI)

- `scripts/build-dataset.mjs` se ejecuta **una vez** (y cuando se quiera actualizar). Concurrencia
  máxima 6, timeout 15 s por petición, reintento con backoff, caché en disco en `.cache/pokeapi/`
  (en `.gitignore`) para que un corte no obligue a empezar de cero.
- Salida commiteada en `src/assets/data/`:
  - `pokedex.json` — por especie (1025): `id, name, names{es,en}, genus{es}, flavor{es}, types[],
baseStats{hp,atk,def,spa,spd,spe}, captureRate, baseExp, genderRate, height(dm), weight(hg),
generation, isLegendary, isMythical, isBaby, habitat, color, shape, growthRate,
evolution{chainId, from, to[{id, minLevel, item, trigger}]}, learnset[{moveId, level}]`
    (solo movimientos por nivel del version-group más reciente que exista para esa especie).
  - `moves.json` — los movimientos referenciados: `id, names{es,en}, type, category
(physical|special|status), power, accuracy, pp, priority, effect{ailment, chance, statChanges…}`.
  - `types.json` — relaciones de daño de los 18 tipos + nombres en español + color.
- Medios NO van en el dataset: se construyen por URL con fallback (ver `CLAUDE.md` → footguns):
  - Sprite animado: `…/sprites/pokemon/other/showdown/{id}.gif` (y `shiny/{id}.gif`) — no existe para todos.
  - Arte grande para AR/detalle: `…/sprites/pokemon/other/home/{id}.png` (y `home/shiny/{id}.png`).
  - Grito: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/{id}.ogg`.
- Verificado el 2026-10-11: `pokemon-species` count = **1025**; #25 tiene `cries.latest`,
  `showdown` y `home`; #1025 tiene grito pero **no** `showdown`. `capture_rate` de Pikachu = 190.
- El cliente carga `pokedex.json` una vez, lo guarda en IndexedDB y trabaja con un `Map<id, Species>`.
  Si pesa > 3 MB se parte en `pokedex-index.json` (lista ligera) + `pokedex/{gen}.json` (detalle).

## 4. Mapa y GPS

- **Google Maps JavaScript API**, mapa vectorial con **Map ID** (estilo propio en la consola de
  Google: verdes/teal tipo juego, sin POIs comerciales), `tilt: 67.5`, `heading` = brújula del
  móvil, zoom fijo ~18 con gesto de pellizco limitado. Paquete `@googlemaps/js-api-loader`.
- Overlay 3D con `WebGLOverlayView` + three.js (paquete `@googlemaps/three`, `ThreeJSOverlayView`):
  avatar, Pokémon (sprite en billboard con sombra), hierba animada, círculo de alcance. **[SPIKE F1-01]**
  confirmar 60 fps en Android gama media; plan B = markers HTML (`AdvancedMarkerElement`) con CSS 3D.
- GPS: `@capacitor/geolocation` `watchPosition` (alta precisión) → filtro de suavizado (media móvil +
  descarte de saltos > 50 m en < 2 s, que son errores del GPS) → interpolación del avatar a 60 fps.
- Brújula: `deviceorientationabsolute` (Android) con suavizado circular. Botón para "norte arriba".
- **Modo demo / sin GPS**: joystick en pantalla para mover el avatar (imprescindible para presentar en
  un aula y para probar en el PC). Activable en ajustes y automático si se deniega el permiso.
- Secreto: la API key va en `src/environments/environment.local.ts` (gitignored) y se restringe en
  Google Cloud por **referrer HTTP** (la Maps JavaScript API NO admite restricción por app Android;
  eso es solo para el SDK nativo): `https://localhost/*` (así carga Capacitor la app dentro del APK),
  `http://localhost:8100/*` y `http://localhost:4200/*` (desarrollo), y restricción de API a
  "Maps JavaScript API". Una clave de navegador siempre es visible en el APK: la protección real es
  la restricción + el tope de cuota diario + la alerta de presupuesto. Todo el equipo usa la misma clave.
  Coste: con la cuota gratuita mensual de Maps JS sobra para un proyecto de clase (verificar la cifra
  vigente en la consola antes de la demo; poner alerta de presupuesto a 1 USD).

## 5. Spawns (aparición de Pokémon) — deterministas y verificables

Igual que Pokémon GO: todos los jugadores en el mismo sitio ven **los mismos** Pokémon, sin que el
servidor tenga que guardar cada spawn.

- Celda: rejilla de ~70 m (`cellId = floor(lat/0.0007)_floor(lng/0.0007)`; se puede pasar a S2 si hace falta).
- Franja de tiempo: 10 min (`slot = floor(epochMinutes/10)`).
- `spawnsForCell(cellId, slot, SPAWN_SALT)` en `shared/engine/spawns.ts`: semilla = hash(cellId, slot,
  salt) → 0-3 Pokémon con especie, posición dentro de la celda, nivel, IVs, naturaleza, género, shiny.
- Pesos de especie: rareza inversa a `captureRate`/`baseExp`; legendarios y míticos casi nulos (solo
  eventos/incursiones); `isBaby` raros; **clima real** (Open-Meteo: lluvia → Agua/Eléctrico/Bicho,
  despejado → Fuego/Planta/Tierra, viento → Volador/Dragón/Psíquico, nieve → Hielo/Acero, niebla →
  Fantasma/Siniestro, nublado → Hada/Lucha/Veneno) y **hora** (noche → Fantasma/Siniestro/Psíquico).
- El `SPAWN_SALT` vive solo en el servidor. El servidor manda al cliente la lista de spawns de las
  celdas cercanas (`GET /spawns?lat&lng`), así nadie puede calcular spawns de lejos.

## 6. Encuentro y captura

- Cámara: `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` en un
  `<video>` de fondo; three.js con fondo transparente encima. Permiso de cámara en
  `AndroidManifest.xml`. **[SPIKE F2-01]** si getUserMedia va mal en el WebView, plan B =
  `@capacitor-community/camera-preview` con `toBack: true`.
- AR por giroscopio (`deviceorientation` → cuaternión de la cámara three.js): el Pokémon queda fijo en
  el mundo. Sin giroscopio o con AR apagado → fondo ilustrado según bioma/hora.
- Tamaño real: altura PokéAPI (decímetros) × variación individual (XS 0.5–XL 1.5) → metros en la
  escena; la distancia de la cámara se ajusta para que quepa pero se note la escala.
- Representación: arte `home` (PNG 512) como sprite con animación procedimental (respirar, saltar,
  esquivar, atacar) + efectos por tipo (partículas). Así se ven **los 1025** con la misma calidad.
- Lanzamiento: gesto con Pointer Events, velocidad de suelta → trayectoria física (gravedad, curva si
  el gesto gira). Círculo de precisión que se encoge: Bien ×1.3 / Genial ×1.7 / Excelente ×2.
- Fórmula (Gen III+ adaptada, en `shared/engine/capture.ts`):
  `a = ((3·HPmax − 2·HPactual)·captureRate·bola·baya·lanzamiento·curva) / (3·HPmax)` y
  sacudidas con `b = 65536 / (255/a)^0.1875` (4 comprobaciones). Bolas: Poké ×1, Super ×1.5,
  Ultra ×2. Baya Frambu ×1.5. El Pokémon puede **huir** (prob. según especie, mayor si es veloz).
- **Autoridad del servidor (anti-trampa):** el cliente manda
  `POST /encounters/:encounterId/throw { ball, berry, throwQuality, curve, clientThrowId }`.
  El servidor: (1) recalcula el spawn desde `encounterId`=(cellId, slot, index) y comprueba que la
  franja sigue viva y que la última ubicación del jugador está a ≤ 80 m; (2) **descuenta la bola de
  forma atómica** (`UPDATE inventory SET qty = qty-1 WHERE player=? AND item=? AND qty>=1`);
  (3) tira el RNG del servidor; (4) si captura, inserta en `caught_pokemon`. Todo en **una
  transacción**. `throwQuality` lo limita el servidor (no acepta "Excelente" el 100 % de las veces:
  tasa máxima plausible por jugador).
- **Idempotencia:** `UNIQUE(playerId, encounterId)` en `encounter_results` → un Pokémon de un spawn
  solo se puede capturar una vez por jugador; `UNIQUE(playerId, clientThrowId)` en `throws` → un
  reintento de red no gasta dos bolas ni tira dos veces.

## 7. Combate (motor) — "todas las características del Pokémon"

- Nivel: los capturados tienen nivel real; en PvP y torneos se **normaliza a 50** para que sea justo.
- Stats Gen III+: `HP = floor((2B+IV+floor(EV/4))·L/100)+L+10`; resto
  `floor((floor((2B+IV+floor(EV/4))·L/100)+5)·naturaleza)`. EV = 0 (simplificación anotada en D-007).
- Daño Gen V+: `floor(floor(floor(2L/5+2)·Poder·A/D)/50)+2` × objetivos × crítico (1.5, prob 1/24)
  × aleatorio (0.85–1.00) × STAB (1.5) × efectividad (0, 0.25, 0.5, 1, 2, 4) × quemadura (0.5 físicos).
- Precisión, prioridad, PP, estados principales (quemado, paralizado, envenenado, gravemente
  envenenado, dormido, congelado), cambios de stats ±6 de los movimientos que los tengan en PokéAPI.
- Habilidades y objetos equipados: **fuera** de la primera versión (D-007); si sobra tiempo, F7.
- Movimientos: el jugador elige 4 de su `learnset` hasta su nivel; por defecto los 4 más recientes.
- `battle-engine.ts` es un **reducer puro**: `(estado, accionesDelTurno, rng) → (estadoNuevo, eventos[])`.
  Los `eventos` ("Pikachu usó Impactrueno", "¡Es súper eficaz!", daño, cambios) son lo que la UI anima
  uno tras otro. Mismo estado + mismas acciones + misma semilla = mismo resultado (testeable).

## 8. Tiempo real: PvP y torneos

- Socket.IO sobre el servidor Nest, autenticado con el access token en el handshake.
- Sala de combate en memoria del servidor (`Map<battleId, BattleRoom>`) + persistencia del resultado
  y del log de turnos en BD al terminar. Turno: ambos eligen acción (máx. 30 s, si no → acción por
  defecto), el servidor aplica `battle-engine`, emite `battle:events` a los dos y a espectadores.
- Mensajes cliente→servidor con `seq` por jugador: el servidor ignora `seq` repetidos (reconexión
  con reintento ≠ doble ataque). Reconexión: el cliente re-entra a la sala y recibe `battle:state`.
- Desconexión > 60 s → derrota por abandono.
- Emparejamiento: por invitación (código de 6 caracteres) y "buscar rival" (cola simple en memoria).
- Torneo: `tournaments`, `tournament_players`, `tournament_matches(round, slot, p1, p2, winner)`.
  Inscripción con `UNIQUE(tournamentId, playerId)` y cupo cerrado con
  `UPDATE tournaments SET joined = joined+1 WHERE id=? AND joined < size`. Al cerrar un combate,
  en **una transacción**: marcar ganador del match y crear/rellenar el match de la ronda siguiente
  (`SELECT … FOR UPDATE` del match padre para que dos finales simultáneas no pisen el slot).
- **Limitación conocida:** salas en memoria = un solo proceso de servidor. Para clase sobra; si se
  escalara habría que mover las salas a Redis (anotado en D-005).

## 9. Backend (server/)

- NestJS 12, Prisma, PostgreSQL (Supabase gratis), Socket.IO, `class-validator` en todos los DTOs
  (`ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`), `@nestjs/throttler` global y más
  estricto en login/registro, `helmet`, logger JSON con id de petición, `/health`.
- Auth: email + contraseña (argon2id), access JWT 15 min + refresh token rotatorio (hash en BD,
  revocable). **Excepción a la regla "nada de tokens en localStorage":** en la app nativa no hay
  cookies de primera parte con el API; el refresh token se guarda en almacenamiento seguro del
  sistema (`@aparajita/capacitor-secure-storage`, Keystore de Android) y el access token solo en memoria.
  En la versión web de desarrollo se acepta `sessionStorage` (anotado en D-006).
- Autorización: **toda** consulta de recursos del jugador filtra por `playerId` del token
  (equipos, favoritos, personalizados, Pokémon, inventario). Nunca por un id que mande el cliente.
- Paginación en todo listado (`take` máx. 50, cursor). Índices en `caught_pokemon(playerId, caughtAt)`,
  `caught_pokemon(playerId, speciesId)`, `encounter_results(playerId, encounterId)` único, etc.
- Timeouts en toda llamada externa (Open-Meteo 4 s, Overpass 8 s) y degradación: sin clima → clima
  "despejado"; sin Overpass → sin paradas nuevas, nunca se cae el mapa.
- CRUD del curso (HU ya evaluadas): `/pokemon` (inventario IS-11, modelo en `src/app/models/pokemon.model.ts`:
  datos de PokéAPI + `price` y `stock` propios), `/teams`, `/favorites`, `/customPokemon` se mantienen con el
  **mismo contrato** que tenía JSON Server (más el filtro por jugador), y la colección de Postman se
  actualiza. Equipos: máx. 6, ahora con ids de Pokémon **capturados** (no de especie).
- Despliegue: **[SPIKE F0-06]** Render (gratis, se duerme a los 15 min → despertarlo antes de la demo)
  o el servidor que decida el PO. Variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `SPAWN_SALT`, `CORS_ORIGINS`. `.env.example` commiteado, `.env` nunca.

### Modelo de datos (Prisma, resumen)

```
Player(id, email UNIQUE, passwordHash, nickname UNIQUE, avatar, level, xp, createdAt)
RefreshToken(id, playerId, tokenHash UNIQUE, expiresAt, revokedAt)
Inventory(playerId, item, qty CHECK qty>=0, PK(playerId,item))
CaughtPokemon(id, playerId, speciesId, nickname, level, ivs JSON, nature, gender, shiny,
              heightScale, moves int[], caughtAt, caughtLat, caughtLng, ball, favorite)
EncounterResult(id, playerId, encounterId, result[caught|fled], createdAt, UNIQUE(playerId,encounterId))
Throw(id, playerId, clientThrowId, encounterId, result, UNIQUE(playerId,clientThrowId))
PokedexEntry(playerId, speciesId, seen, caught, PK(playerId,speciesId))
Candy(playerId, familyId, qty, PK(playerId,familyId))
Team(id, playerId, name, description, pokemonIds int[] (≤6), createdAt, updatedAt)
Favorite(id, playerId, pokemonId, pokemonName, note, rating 1-5, createdAt)
CustomPokemon(id, playerId, name, types[], stats JSON, imageUrl, description, createdAt)
Battle(id, kind[pvp|ai|tournament], p1, p2, winner, seed, log JSON, startedAt, endedAt)
Tournament(id, code UNIQUE, name, size, joined, status, createdBy, createdAt)
TournamentPlayer(tournamentId, playerId, seed, PK(tournamentId, playerId))
TournamentMatch(id, tournamentId, round, slot, p1, p2, winner, battleId, UNIQUE(tournamentId,round,slot))
```

## 10. Audio y hápticos

- `AudioService` sobre Web Audio API: buses `music`, `sfx`, `cries` con volumen independiente,
  pre-decodificación de los SFX al arrancar, gritos bajo demanda con caché LRU (máx. 30).
  El audio se desbloquea con el primer toque (política de autoplay).
- Música: dos pistas de mapa (día/noche), una de encuentro, una de combate, una de victoria.
  **Solo audio con licencia libre (CC0/CC-BY) o creado por nosotros**; cada archivo con su fuente y
  licencia en `src/assets/audio/CREDITOS.md`. Nada de ripear la música de Nintendo.
- Hápticos: `@capacitor/haptics` (ya instalado). Impacto ligero al tocar, medio al lanzar, fuerte en
  cada sacudida de la Ball, patrón de éxito al capturar. Siempre en el **mismo frame** que el sonido
  y la animación.

## 11. Generar el APK

1. `npm run build` → `www/`.
2. `npx cap add android` (solo la primera vez; la carpeta `android/` **sí** se commitea en este
   proyecto: D-009) y `npx cap sync android`.
3. Permisos en `android/app/src/main/AndroidManifest.xml`: `ACCESS_FINE_LOCATION`,
   `ACCESS_COARSE_LOCATION`, `CAMERA`, `INTERNET`, `VIBRATE`.
4. JDK 21: `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`. SDK en
   `%LOCALAPPDATA%\Android\Sdk` (ya existe en el PC de Alex).
5. `cd android && gradlew.bat assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`.
   Para la entrega: `assembleRelease` con un keystore propio (fuera del repo).
6. Probar con `adb install -r app-debug.apk` y depurar el WebView en `chrome://inspect`.

## 12. Pruebas

- `shared/`: Vitest con casos conocidos (p. ej. daño de un movimiento concreto comparado con una
  calculadora de daño pública, tabla de tipos completa, captura con semilla fija, spawns deterministas).
- `server/`: Vitest/Jest + BD real de pruebas (Postgres en Docker o un schema aparte de Supabase).
  Test obligatorio de concurrencia: dos `throw` simultáneos con la misma bola → solo una se descuenta.
- App: tests unitarios de servicios; E2E de flujos clave con Playwright en vista móvil
  (skill `webapp-testing`); prueba manual en Android real con checklist en la bitácora.
