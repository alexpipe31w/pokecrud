# F3 · Colección y Pokédex — Plan de implementación

> **Para IAs:** usa la skill `executing-plans` (o `subagent-driven-development`). Cada tarea = una tarea del ROADMAP =
> **una rama y un PR**. Antes: REGLA 1 de `CLAUDE.md`. Al acabar: REGLA 2. Marca las casillas `- [ ]` de TU tarea en TU
> rama según avances (son el punto de guardado). Los pasos de código siguen TDD: test que falla → código mínimo → verde
> → commit.
>
> **Este archivo tiene dos partes.** Parte 1 (F3-01a): **F3-02a, F3-02b y F3-03** (hechas). Parte 2 (F3-01b, al
> final del archivo): **F3-04** (Pokédex 1025), **F3-05** (evolución con caramelos) y **F3-06a/b/c** (CRUD del curso
> con la nueva UI).

**Objetivo (VISION, pilar 3):** que lo capturado se pueda ver y cuidar: **Mis Pokémon** (lista con PC, filtros y orden)
y la **ficha del individuo** (arte, grito, PC, IVs en barras, naturaleza, stats, movimientos, dónde y cuándo se capturó,
renombrar, favorito, transferir con deshacer). Y que desde YA cada captura sume **caramelos de su familia** y marque la
**Pokédex** (visto/capturado), para que F3-04 y F3-05 no empiecen con los datos perdidos.

**Arquitectura:**

```
shared/engine/candy.ts, iv-appraisal.ts, nickname.ts   ← reglas puras, mismas en app y servidor (tests en Node)
shared/protocol/collection.ts                           ← contrato app↔servidor
server/src/collection/  GET /collection, GET|PATCH|DELETE /collection/:id, GET /pokedex
server/src/encounters/  la captura suma caramelos + Pokédex en SU transacción; abrir un encuentro marca "visto"
src/app/services/game/collection.service.ts             ← signals + paginación por cursor
src/app/features/collection/  /coleccion (lista) y /coleccion/:id (ficha)
```

- **El servidor manda** (REGLA 3): PC, stats, caramelos y Pokédex los calcula y guarda él. **Los IVs del individuo SÍ
  se enseñan a su dueño** una vez capturado (como la "valoración" de Pokémon GO; VISION pide "IVs (barras)"): solo en
  `GET /collection/:id` y solo del propio jugador (lo ajeno → 404, como D-019). Antes de capturar siguen ocultos (D-049).
- **PC guardado en la fila** (`CaughtPokemon.cp`): se calcula al capturar con `combatPower(calcStats(...))` (D-049) y
  se recalcula cuando cambie el nivel (evolución, F3-05). Así la base puede **ordenar y paginar por PC**.
- **Familia de caramelos = `evolutionChainId`** del dataset (Pikachu, Pichu y Raichu comparten caramelos, como en
  Pokémon GO). Capturar **+3**, transferir **+1**.
- **Pokédex:** "visto" al abrir un encuentro (`GET /encounters/:id`), "capturado" al capturar. Una fila por especie.
- **Paginación por cursor** (ARQUITECTURA §9: `take` máx. 50, cursor), orden estable con `id` de desempate.
- **Transferir con deshacer:** la app espera 5 s con un aviso "Transferido · Deshacer" antes de llamar al servidor. Si se
  deshace, no se llama nunca (no hace falta "des-transferir" en el servidor).

**Tech stack:** NestJS 12 + Prisma 7.10 (migración nueva), Angular 22 zoneless (signals), Ionic 9 (`@ionic/angular`),
Vitest. Sin dependencias nuevas.

**Decisión a anotar al implementar F3-02a → `DECISIONES.md` D-052** (texto en F3-02a paso 9).

---

## Orden y paralelismo

```
F3-02a servidor (datos nuevos + GET /collection) ─> F3-02b pantalla Mis Pokémon ─> F3-03 ficha del individuo
```

**F3-02a primero y cuanto antes:** hasta que se despliegue, las capturas no suman caramelos ni Pokédex (el script de
F3-02a paso 7 las recupera, pero mejor no acumular). **Nada de F3 necesita el móvil** salvo el último paso de cada tarea
(mirarlo en un Android, REGLA 3); el resto se hace en el PC con la vista móvil 390×844.

## Mapa de archivos

| Archivo | Tarea | Responsabilidad |
| --- | --- | --- |
| `shared/engine/candy.ts` (+ spec) | F3-02a | `CANDY_PER_CATCH`, `CANDY_PER_TRANSFER`, `familyOf` |
| `shared/engine/iv-appraisal.ts` (+ spec) | F3-02a | % de IVs y estrellas (0-3, o 4 = perfecto) |
| `shared/engine/nickname.ts` (+ spec) | F3-02a | Normalizar y validar el mote (servidor y app) |
| `shared/protocol/collection.ts` | F3-02a | Contrato de `/collection` y `/pokedex` |
| `shared/protocol/encounters.ts` | F3-02a | `ThrowResult.candy` (caramelos ganados al capturar) |
| `server/prisma/schema.prisma` + `migrations/20261013010000_collection/` | F3-02a | `CaughtPokemon.cp`, `Candy`, `PokedexEntry` |
| `server/prisma/backfill-collection.ts` | F3-02a | Rellena PC, caramelos y Pokédex de lo capturado antes |
| `server/src/spawns/spawns.service.ts` | F3-02a | `SpeciesDetails.familyId` y `types` |
| `server/src/encounters/encounters.service.ts` | F3-02a | PC + caramelos + Pokédex en la transacción; "visto" |
| `server/src/collection/*` (+ e2e `server/test/collection.e2e-spec.ts`) | F3-02a / F3-03 | Endpoints de la colección |
| `src/app/services/game/collection.service.ts` (+ spec) | F3-02b | Lista paginada, filtros, orden, caché del detalle |
| `src/app/features/collection/collection.page.ts` | F3-02b | `/coleccion`: rejilla, filtros, orden, vacía, cargando |
| `src/app/features/collection/collection-card.component.ts` | F3-02b | Tarjeta de un Pokémon de la colección |
| `src/app/features/collection/collection-filters.component.ts` | F3-02b | Hoja de filtros y orden |
| `src/app/features/map/ball-menu.component.ts` | F3-02b | Entrada "Mis Pokémon" |
| `src/app/features/encounter/caught-card.component.ts` | F3-02b | "+3 caramelos de …" en "¡Capturado!" |
| `src/app/features/collection/pokemon-detail.page.ts` (+ subcomponentes) | F3-03 | `/coleccion/:id`: la ficha |
| `src/app/features/collection/pending-transfer.ts` (+ spec) | F3-03 | Transferir con deshacer (puro, con reloj inyectado) |

---

## Contrato (lo usan F3-02a, F3-02b y F3-03)

`shared/protocol/collection.ts` (se crea en F3-02a paso 3):

```ts
import type { BallId } from '../engine/capture.js';
import type { Stats } from '../engine/battle/stats.js';
import type { TypeName } from '../data/dataset.types.js';

export type CollectionSort = 'caughtAt' | 'cp' | 'speciesId';
export type SortOrder = 'asc' | 'desc';

/** `GET /collection?…` (todo opcional). Por defecto: lo último capturado primero, 30 por página. */
export interface CollectionQuery {
  sort?: CollectionSort;
  order?: SortOrder;
  type?: TypeName;
  shiny?: boolean;
  favorite?: boolean;
  /** `nextCursor` de la página anterior. */
  cursor?: string;
  /** 1-50 (por defecto 30). */
  limit?: number;
}

/** Lo que pinta la rejilla: poco y ligero (sin IVs). */
export interface CollectionItem {
  id: string;
  speciesId: number;
  nickname: string | null;
  level: number;
  cp: number;
  gender: 'M' | 'F' | null;
  shiny: boolean;
  favorite: boolean;
  caughtAt: string;
}

export interface CollectionPage {
  items: CollectionItem[];
  /** null = no hay más. */
  nextCursor: string | null;
  /** Total con los filtros puestos (para "12 Pokémon"). */
  total: number;
}

/** `GET /collection/:id`: la ficha completa. Los IVs SÍ salen: es SU Pokémon (D-052). */
export interface CollectionDetail extends CollectionItem {
  ivs: Stats;
  nature: string;
  /** Stats reales del individuo (`calcStats`, D-007). */
  stats: Stats;
  heightScale: number;
  moves: number[];
  ball: BallId;
  caughtLat: number;
  caughtLng: number;
  /** Caramelos de su familia (para F3-05). */
  candy: { familyId: number; qty: number };
}

/** `PATCH /collection/:id`. Mote null = quitarlo (se ve el nombre de la especie). */
export interface CollectionPatch {
  nickname?: string | null;
  favorite?: boolean;
}

/** `DELETE /collection/:id` (transferir). */
export interface TransferResult {
  candy: { familyId: number; qty: number; gained: number };
}

/** `GET /pokedex`: solo las especies que el jugador ha visto (el resto, ni vista ni capturada). */
export interface PokedexView {
  entries: { speciesId: number; seen: true; caught: boolean }[];
}
```

Y en `shared/protocol/encounters.ts`, `ThrowResult` gana (F3-02a paso 5):

```ts
  /** Caramelos ganados al capturar (null si no capturó). */
  candy: { familyId: number; gained: number; total: number } | null;
```

---

## F3-02a · Servidor: lo que se guarda al capturar + `GET /collection`

**Criterio:** cada captura guarda `cp`, suma 3 caramelos a su familia y marca la Pokédex en la MISMA transacción; abrir un
encuentro marca "visto"; `GET /collection` pagina por cursor con orden y filtros; lo capturado antes se recupera con el
script; e2e en verde; migración aplicada en Supabase **antes** de mezclar.

### Paso 1 — Reglas puras: caramelos y mote

**Files:** Create `shared/engine/candy.ts`, `shared/engine/nickname.ts`; Tests `candy.spec.ts`, `nickname.spec.ts`

- [x] **1a. Tests que fallan:**

```ts
// shared/engine/candy.spec.ts
import { CANDY_PER_CATCH, CANDY_PER_TRANSFER, familyOf } from './candy.js';

describe('caramelos', () => {
  it('capturar da más que transferir (como Pokémon GO: 3 y 1)', () => {
    expect(CANDY_PER_CATCH).toBe(3);
    expect(CANDY_PER_TRANSFER).toBe(1);
  });
  it('la familia es la cadena evolutiva: Pichu, Pikachu y Raichu comparten', () => {
    const chain = (id: number) => ({ id, evolutionChainId: 10 });
    expect(familyOf(chain(172))).toBe(10);
    expect(familyOf(chain(25))).toBe(familyOf(chain(26)));
  });
});
```

```ts
// shared/engine/nickname.spec.ts
import { NICKNAME_MAX, normalizeNickname } from './nickname.js';

describe('normalizeNickname', () => {
  it('recorta espacios y junta los repetidos', () => {
    expect(normalizeNickname('  Pika   chu ')).toBe('Pika chu');
  });
  it('vacío o solo espacios = sin mote (null)', () => {
    expect(normalizeNickname('   ')).toBeNull();
    expect(normalizeNickname(null)).toBeNull();
  });
  it('admite tildes, ñ, números, guion y apóstrofo', () => {
    expect(normalizeNickname("Ñandú-2 d'Or")).toBe("Ñandú-2 d'Or");
  });
  it(`rechaza más de ${NICKNAME_MAX} caracteres y símbolos raros`, () => {
    expect(() => normalizeNickname('a'.repeat(NICKNAME_MAX + 1))).toThrow(RangeError);
    expect(() => normalizeNickname('<script>')).toThrow(RangeError);
    expect(() => normalizeNickname('😀')).toThrow(RangeError);
  });
});
```

- [x] **1b.** `npm run test:shared -- candy nickname` → FALLA (no existen los módulos).
- [x] **1c. Implementación:**

```ts
// shared/engine/candy.ts
/** Caramelos (F3, D-052): por familia = cadena evolutiva del dataset. Como Pokémon GO: capturar 3, transferir 1. */
export const CANDY_PER_CATCH = 3;
export const CANDY_PER_TRANSFER = 1;

export const familyOf = (species: { evolutionChainId: number }): number => species.evolutionChainId;
```

```ts
// shared/engine/nickname.ts
/** Mote de un Pokémon capturado (F3-03). Lo usan el DTO del servidor y el formulario de la app. */
export const NICKNAME_MAX = 12;
const ALLOWED = /^[\p{L}\p{N} '\-.]+$/u;

/** Devuelve el mote limpio, `null` si queda vacío, o lanza `RangeError` si no vale. */
export function normalizeNickname(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return null;
  if ([...s].length > NICKNAME_MAX) throw new RangeError(`Máximo ${NICKNAME_MAX} caracteres`);
  if (!ALLOWED.test(s)) throw new RangeError('Solo letras, números, espacios, guion y apóstrofo');
  return s;
}
```

- [x] **1d.** → PASA. Commit `F3-02a: reglas de caramelos y mote con tests` + `/guardar`.

### Paso 2 — Valoración de IVs (pura; la usa la ficha de F3-03)

**Files:** Create `shared/engine/iv-appraisal.ts` + spec

Escala propia sobre 6 IVs de 0-31 (186 en total), con los cortes de la valoración de Pokémon GO en porcentaje:
0★ < 51 %, 1★ < 66,7 %, 2★ < 82,2 %, 3★ hasta 99 %, y 4 = perfecto (100 %).

- [x] **2a. Test que falla:**

```ts
import { ivPercent, ivStars } from './iv-appraisal.js';

const ivs = (n: number) => ({ hp: n, attack: n, defense: n, specialAttack: n, specialDefense: n, speed: n });

describe('valoración de IVs', () => {
  it('porcentaje redondeado de 186', () => {
    expect(ivPercent(ivs(31))).toBe(100);
    expect(ivPercent(ivs(0))).toBe(0);
    expect(ivPercent(ivs(15))).toBe(48); // 90/186 = 48,4 %
  });
  it('estrellas por tramos; 4 solo con todo a 31', () => {
    expect(ivStars(ivs(15))).toBe(0);
    expect(ivStars(ivs(17))).toBe(1); // 54,8 %
    expect(ivStars(ivs(22))).toBe(2); // 71 %
    expect(ivStars(ivs(30))).toBe(3); // 96,8 %
    expect(ivStars(ivs(31))).toBe(4);
  });
});
```

- [x] **2b.** falla. **2c.**

```ts
import type { Stats } from './battle/stats.js';

const TOTAL = 31 * 6;
const sum = (v: Stats): number =>
  v.hp + v.attack + v.defense + v.specialAttack + v.specialDefense + v.speed;

export const ivPercent = (ivs: Stats): number => Math.round((sum(ivs) / TOTAL) * 100);

/** 0-3 estrellas como la valoración de Pokémon GO; 4 = perfecto (todo a 31). */
export function ivStars(ivs: Stats): 0 | 1 | 2 | 3 | 4 {
  const s = sum(ivs);
  if (s === TOTAL) return 4;
  const p = s / TOTAL;
  return p >= 0.822 ? 3 : p >= 0.667 ? 2 : p >= 0.51 ? 1 : 0;
}
```

  (Comprobado: 17·6 = 102 → 54,8 % → 1★; 22·6 = 132 → 71 % → 2★; 30·6 = 180 → 96,8 % → 3★.)
- [x] **2d.** pasa. Commit + `/guardar`.

### Paso 3 — Contrato

- [x] **3a.** Crear `shared/protocol/collection.ts` con el bloque de "Contrato" de arriba. `npx tsc -p
  shared/tsconfig.json --noEmit` → sin errores. Commit `F3-02a: contrato de la colección` + `/guardar`.

### Paso 4 — Esquema y migración

**Files:** Modify `server/prisma/schema.prisma`; Create `server/prisma/migrations/20261013010000_collection/migration.sql`

- [x] **4a. Esquema:** en `CaughtPokemon`, `cp Int?` (null = filas de antes del script del paso 7) y
  `@@index([playerId, cp])`, `@@index([playerId, favorite])`; en `Player`, `candies Candy[]` y `pokedex PokedexEntry[]`;
  modelos nuevos:

```prisma
/// Caramelos por familia (cadena evolutiva del dataset, D-052). Capturar +3, transferir +1, evolucionar gasta (F3-05).
model Candy {
  playerId  String   @db.Uuid
  familyId  Int
  qty       Int      @default(0)
  updatedAt DateTime @updatedAt
  player    Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@id([playerId, familyId])
}

/// Pokédex del jugador (F3): una fila por especie vista; `caught` al capturarla alguna vez.
model PokedexEntry {
  playerId      String    @db.Uuid
  speciesId     Int
  caught        Boolean   @default(false)
  firstSeenAt   DateTime  @default(now())
  firstCaughtAt DateTime?
  player        Player    @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@id([playerId, speciesId])
}
```

- [x] **4b. Migración:** `cd server && npx prisma migrate dev --create-only --name collection` **contra el Postgres
  portátil** (`embedded-postgres`, ver ESTADO; NUNCA `migrate dev` contra Supabase: puede pedir resetear la base). Mover
  la carpeta a `20261013010000_collection` y añadir al final del SQL:

```sql
-- Reglas que Prisma no modela (como qty_range de Inventory).
ALTER TABLE "Candy" ADD CONSTRAINT "candy_qty_range" CHECK ("qty" BETWEEN 0 AND 999999);
ALTER TABLE "CaughtPokemon" ADD CONSTRAINT "cp_positive" CHECK ("cp" IS NULL OR "cp" >= 10);

-- Pokédex de lo capturado antes de esta migración (idempotente). Los caramelos y el PC necesitan el dataset
-- (familia, stats): los rellena prisma/backfill-collection.ts.
INSERT INTO "PokedexEntry" ("playerId", "speciesId", "caught", "firstSeenAt", "firstCaughtAt")
SELECT "playerId", "speciesId", true, MIN("caughtAt"), MIN("caughtAt")
FROM "CaughtPokemon"
GROUP BY "playerId", "speciesId"
ON CONFLICT ("playerId", "speciesId") DO NOTHING;
```

- [x] **4c.** `npx prisma migrate deploy` y `npx prisma generate` contra el Postgres portátil; `npm run build`. Commit
  `F3-02a: migración collection (cp, Candy, PokedexEntry)` + `/guardar`.

### Paso 5 — La captura guarda PC, caramelos y Pokédex; abrir un encuentro marca "visto"

**Files:** Modify `server/src/spawns/spawns.service.ts`, `server/src/encounters/encounters.service.ts`,
`shared/protocol/encounters.ts`, `server/test/encounters.e2e-spec.ts`

- [x] **5a. e2e que fallan** (en `encounters.e2e-spec.ts`, con el `forced` que ya existe):

```ts
  it('capturar guarda el PC, suma 3 caramelos a la familia y marca la Pokédex', async () => {
    const p = await register();
    const { spawn } = await nearbySpawn(p); // helper que ya usa este archivo para tener un spawn a ≤ 80 m
    forced = { captured: true, shakes: 3, fled: false };
    const res = await as(p, http().post(`/encounters/${enc(spawn.id)}/throw`).send(throwBody())).expect(201);
    expect(res.body.candy).toEqual({ familyId: expect.any(Number), gained: 3, total: 3 });
    const row = await prisma.caughtPokemon.findFirstOrThrow({ where: { playerId: p.id } });
    expect(row.cp).toBeGreaterThanOrEqual(10);
    expect(
      await prisma.pokedexEntry.findUnique({
        where: { playerId_speciesId: { playerId: p.id, speciesId: spawn.speciesId } },
      }),
    ).toMatchObject({ caught: true });
  });

  it('fallar no da caramelos; abrir el encuentro ya lo marca como visto', async () => {
    const p = await register();
    const { spawn } = await nearbySpawn(p);
    await as(p, http().get(`/encounters/${enc(spawn.id)}`)).expect(200);
    expect(
      await prisma.pokedexEntry.findUnique({
        where: { playerId_speciesId: { playerId: p.id, speciesId: spawn.speciesId } },
      }),
    ).toMatchObject({ caught: false });
    forced = { captured: false, shakes: 1, fled: false };
    const res = await as(p, http().post(`/encounters/${enc(spawn.id)}/throw`).send(throwBody())).expect(201);
    expect(res.body.candy).toBeNull();
    expect(await prisma.candy.count({ where: { playerId: p.id } })).toBe(0);
  });
```

  (Si el archivo no tiene `nearbySpawn`/`enc`/`throwBody` con esos nombres, usar los equivalentes que ya usan sus
  tests de captura; no duplicar helpers.) `cd server && npm run test:e2e -- encounters` → FALLA.
- [x] **5b.** `SpeciesDetails` gana `familyId: number` (= `familyOf(species)`) y `types: TypeName[]`, rellenados donde
  se construye hoy (`speciesDetails`).
- [x] **5c.** En `details()`, tras `reachableSpawn`, marcar "visto" (fuera de cualquier transacción, mejor esfuerzo:
  si falla, se registra y la respuesta sigue):

```ts
    await this.prisma.pokedexEntry
      .upsert({
        where: { playerId_speciesId: { playerId, speciesId: spawn.speciesId } },
        create: { playerId, speciesId: spawn.speciesId },
        update: {},
      })
      .catch((err) => this.logger.warn({ msg: 'pokedex.seen', playerId, err: String(err) }));
```

- [x] **5d.** En `throw()`, dentro de la transacción, si `outcome.captured`: `cp` en el `create` de `caughtPokemon`
  (`combatPower(calcStats(species.baseStats, spawn.ivs, spawn.level, spawn.nature))`) y después:

```ts
          const candy = await tx.candy.upsert({
            where: { playerId_familyId: { playerId, familyId: species.familyId } },
            create: { playerId, familyId: species.familyId, qty: CANDY_PER_CATCH },
            update: { qty: { increment: CANDY_PER_CATCH } },
          });
          await tx.pokedexEntry.upsert({
            where: { playerId_speciesId: { playerId, speciesId: spawn.speciesId } },
            create: { playerId, speciesId: spawn.speciesId, caught: true, firstCaughtAt: new Date(now) },
            update: { caught: true, firstCaughtAt: undefined },
          });
```

  El `firstCaughtAt` de una fila que ya existía (solo "vista") se pone con un `updateMany` aparte
  `where: { playerId, speciesId, firstCaughtAt: null } data: { firstCaughtAt: new Date(now) }` (así nunca se pisa la
  primera fecha). La transacción devuelve `{ created, candy }` y la respuesta lleva
  `candy: created ? { familyId: candy.familyId, gained: CANDY_PER_CATCH, total: candy.qty } : null`.
- [x] **5e. Reintentos:** `replay()` devuelve lo guardado; como `Throw` no guarda los caramelos, en un reintento de una
  captura se lee la fila `Candy` actual (`gained: CANDY_PER_CATCH`, `total` = lo que haya). Test e2e: dos POST con el
  mismo `clientThrowId` → el segundo da el mismo `candy.familyId` y `gained: 3`, y la base tiene 3 (no 6).
- [x] **5f.** `ThrowResult.candy` en `shared/protocol/encounters.ts` (bloque de "Contrato"). En la app, de momento solo
  compila (lo pinta F3-02b). e2e → PASA; `npm run build`, `npm test`, lint del servidor; `ng test` y build de la app.
  Commit + `/guardar`.

### Paso 6 — `GET /collection` y `GET /pokedex`

**Files:** Create `server/src/collection/collection.module.ts`, `collection.controller.ts`, `collection.service.ts`,
`collection.dto.ts`; Test `server/test/collection.e2e-spec.ts`; Modify `server/src/app.module.ts`

- [x] **6a. e2e que fallan** (`collection.e2e-spec.ts`, prefijo de limpieza propio `col+`, D-021). Para crear capturas
  sin depender de spawns, insertar filas con Prisma directamente (helper `seedCaught(p, n, over?)` que pone `speciesId`,
  `cp`, `shiny`, `favorite`, `caughtAt` y el resto con valores válidos):
  1. sin sesión → 401; con sesión y nada capturado → `{ items: [], nextCursor: null, total: 0 }`.
  2. 35 capturas → página 1 con 30 y `nextCursor`, página 2 con 5 y `nextCursor: null`; sin repetidos ni huecos.
  3. `sort=cp&order=desc` → PC no creciente en TODAS las páginas (con varios PC iguales: el desempate por `id` no
     repite ni salta ninguno).
  4. `type=fire` → solo especies de tipo Fuego (4, 5, 6 sí; 1 no); `shiny=true`; `favorite=true`; `total` con filtros.
  5. lo de otro jugador no sale nunca; `limit=51` → 400; `sort=nombre` → 400; `cursor=no-uuid` → 400.
  6. `GET /pokedex` → solo especies vistas, con `caught` correcto.
- [x] **6b. DTO** (`class-validator`; booleanos de query como `'true'|'false'` con `@Transform`):
  `sort ∈ CollectionSort` (por defecto `caughtAt`), `order ∈ asc|desc` (por defecto `desc`), `type ∈ TYPE_NAMES`,
  `shiny`, `favorite`, `cursor @IsUUID()`, `limit @IsInt() @Min(1) @Max(50)` (por defecto 30).
- [x] **6c. Servicio:**

```ts
  async list(playerId: string, q: CollectionQueryDto): Promise<CollectionPage> {
    const where: Prisma.CaughtPokemonWhereInput = {
      playerId,
      ...(q.shiny === undefined ? {} : { shiny: q.shiny }),
      ...(q.favorite === undefined ? {} : { favorite: q.favorite }),
      ...(q.type ? { speciesId: { in: this.spawns.speciesIdsOfType(q.type) } } : {}),
    };
    const orderBy: Prisma.CaughtPokemonOrderByWithRelationInput[] = [
      q.sort === 'cp'
        ? { cp: { sort: q.order, nulls: 'last' } }
        : { [q.sort]: q.order },
      { id: 'asc' }, // desempate estable para el cursor
    ];
    const [rows, total] = await Promise.all([
      this.prisma.caughtPokemon.findMany({
        where,
        orderBy,
        take: q.limit + 1,
        ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
        select: ITEM_SELECT,
      }),
      this.prisma.caughtPokemon.count({ where }),
    ]);
    const page = rows.slice(0, q.limit);
    return {
      items: page.map(toItem),
      nextCursor: rows.length > q.limit ? page[page.length - 1].id : null,
      total,
    };
  }
```

  `toItem` convierte `caughtAt` a ISO y un `cp` null en el calculado al vuelo (`combatPower(calcStats(...))`, necesita
  `ivs`, `nature`, `level` en `ITEM_SELECT`). Un `cursor` que no es de este jugador o no existe → Prisma no devuelve
  nada raro (el `where` incluye `playerId`), pero un cursor inexistente lanza: capturarlo y responder 400
  "Cursor no válido". `speciesIdsOfType(type)` se calcula una vez al cargar el dataset (`Map<TypeName, number[]>`).
- [x] **6d.** `GET /pokedex` → `findMany({ where: { playerId }, select: { speciesId, caught } })` → `PokedexView`.
- [x] **6e.** Controlador con `@CurrentPlayer()` (sesión obligatoria por el guard global) y límite propio 60/min por IP
  (`@Throttle`), como `/spawns`. e2e → PASA; build, unitarios, lint. Commit + `/guardar`.

### Paso 7 — Recuperar lo capturado antes

**Files:** Create `server/prisma/backfill-collection.ts`; Modify `server/package.json`

- [x] **7a.** Script `npm run db:backfill-collection` (`tsx prisma/backfill-collection.ts`, como `admin`): carga
  `pokedex.json`; (1) `cp` de las filas con `cp IS NULL` (por lotes de 200); (2) caramelos: **solo para jugadores sin
  ninguna fila `Candy`** (así se puede ejecutar dos veces sin duplicar), `CANDY_PER_CATCH × capturados` por familia;
  (3) Pokédex "capturado" de todo lo capturado (`createMany skipDuplicates`): la migración solo cubre lo capturado
  ANTES de aplicarla, y entre la migración y el despliegue el código viejo sigue capturando. Imprime cuántas filas tocó.
- [x] **7b.** Probarlo en el Postgres portátil: sembrar 3 capturas de antes (sin `cp`, sin `Candy`) → ejecutar →
  `cp` relleno y 9 caramelos repartidos por familia → ejecutarlo otra vez → "0 filas". Commit + `/guardar`.

### Paso 8 — Aplicar en Supabase (ANTES de mezclar el PR)

Render despliega solo al mezclar (ESTADO). Si el código nuevo llega antes que la migración, **cada captura daría 500**
(las tablas no existen). Orden obligatorio:

- [x] **8a.** (Samuel, 2026-10-13: `20261013010000_collection` aplicada; script → PC en 12 capturas, 12 filas de
  caramelos para 1 jugador, Pokédex 0 nuevas porque ya la hizo la migración) Quien tenga `DIRECT_URL`: `cd server && npx prisma migrate deploy` contra Supabase (aplica SOLO
  `20261013010000_collection`; comprobar en la salida que no hay más pendientes) y `npm run db:backfill-collection`.
  Pegar la salida (sin la URL) en la bitácora.
- [ ] **8b.** Mezclar el PR. Tras el despliegue de Render: una captura real desde el navegador →
  `candy.gained: 3` en la respuesta.

### Paso 9 — Cierre

- [ ] **9a.** Añadir **D-052** a `DECISIONES.md`:

> **D-052 · Colección (F3): PC guardado, caramelos por cadena evolutiva, Pokédex al abrir/capturar y los IVs se
> enseñan a su dueño.** `CaughtPokemon.cp` se calcula al capturar (D-049) y se recalcula si cambia el nivel (F3-05), para
> ordenar y paginar en la base. Familia de caramelos = `evolutionChainId`; capturar +3, transferir +1 (`shared/engine/
> candy.ts`). Pokédex: "visto" al abrir un encuentro (mejor esfuerzo), "capturado" en la transacción de la captura. Los
> IVs y las stats del individuo se devuelven SOLO en `GET /collection/:id` y solo a su dueño (como la valoración de
> Pokémon GO); antes de capturar siguen ocultos. Paginación por cursor con `id` de desempate; máx. 50. Migración +
> `db:backfill-collection` se aplican en Supabase ANTES de mezclar (si no, las capturas dan 500).

- [ ] **9b.** REGLA 2 (bitácora con la salida de los e2e, ROADMAP, PR).

---

## F3-02b · Pantalla Mis Pokémon

**Criterio (ROADMAP F3-02):** lista paginada con filtros (tipo, shiny, favorito), orden (PC, fecha, Nº), entrada
escalonada, vacía diseñada; accesible desde el menú de la Poké Ball; "+3 caramelos" en "¡Capturado!".

### Paso 1 — `CollectionService`

**Files:** Create `src/app/services/game/collection.service.ts` + spec

- [x] **1a. Tests que fallan** (`provideHttpClient()` + `provideHttpClientTesting()`):
  1. `load()` pide `GET {serverUrl}/collection?sort=caughtAt&order=desc&limit=30` y publica `items`, `total`,
     `hasMore`.
  2. `loadMore()` manda `cursor=<nextCursor>` y AÑADE (no sustituye); con `hasMore() === false` no pide nada; dos
     `loadMore()` seguidos hacen UNA petición (la segunda espera a la primera).
  3. `setQuery({ sort: 'cp' })` vacía la lista y vuelve a cargar desde el principio con el nuevo orden.
  4. Error de red → `error()` con texto en español y la lista anterior intacta.
  5. Tras `markChanged()` (lo llama la ficha al renombrar o transferir) el siguiente `load()` no usa nada en caché.
- [x] **1b.** → FALLA. **1c. Implementación** (forma; seguir el estilo de `BagService`: `firstValueFrom` + `timeout`
  de 70 s por Render dormido):

```ts
@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly http = inject(HttpClient);
  readonly query = signal<Required<Pick<CollectionQuery, 'sort' | 'order'>> & Omit<CollectionQuery, 'cursor' | 'limit'>>(
    { sort: 'caughtAt', order: 'desc' },
  );
  readonly items = signal<CollectionItem[]>([]);
  readonly total = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasMore = computed(() => this.next !== null);
  private next: string | null = null;
  private inFlight: Promise<void> | null = null;

  setQuery(patch: Partial<CollectionQuery>): Promise<void>; // query.update + reset + load()
  load(): Promise<void>;     // reset de items y cursor, primera página
  loadMore(): Promise<void>; // si hay cursor y no hay otra en vuelo
  /** Para la ficha: actualizar/quitar una fila sin recargar todo. */
  patchItem(id: string, patch: Partial<CollectionItem>): void;
  removeItem(id: string): void;
  restoreItem(item: CollectionItem, index: number): void; // deshacer la transferencia
}
```

  Los parámetros se construyen con `HttpParams` omitiendo los `undefined`. `hasMore` depende de `next`, que no es
  signal: guardarlo también como signal privada (`nextCursor = signal<string|null>(null)`) para que `computed` repinte
  (zoneless).
- [x] **1d.** → PASA. Commit + `/guardar`.

### Paso 2 — Tarjeta de un Pokémon

**Files:** Create `src/app/features/collection/collection-card.component.ts` (+ spec corto)

- [x] **2a.** `app-collection-card` con `input.required<CollectionItem>()` y `index` (para el retardo escalonado):
  - Arte `home` (o `home/shiny`), con el mismo fallback de siempre (CLAUDE.md: `home` → `official-artwork` →
    `front_default`). Si existe ya una función de URLs de sprites en la app, **reusarla** (buscar `official-artwork` en
    `src/app`); si no, crearla en `src/app/core/utils/sprites.ts` y usarla también aquí.
  - Mote o nombre en español (DatasetService), "PC 412" en Fredoka grande, nivel, ★ si favorito, destello dorado si
    shiny (DISENO §5: "brillo permanente en la colección"), fondo tintado con el color del tipo principal (tokens
    `--t-*`, nunca colores sueltos).
  - Entrada: `opacity 0 + translateY(8px) + scale(0.97)` → normal en 220 ms `--ease-out`, `animation-delay:
    min(index, 12) × 40 ms` (DISENO §4.9: 30-50 ms; tope para que la página 2 no espere 1 s). "Reducir movimiento" →
    solo fundido.
  - Es un `<a>` a `/coleccion/:id` (accesible con teclado), área ≥ 44 px, `aria-label` "Pikachu, PC 412, nivel 12,
    shiny, favorito".
- [x] **2b.** Spec: el `aria-label` incluye nombre, PC y "shiny" solo si lo es. Commit + `/guardar`.

### Paso 3 — Filtros y orden

**Files:** Create `src/app/features/collection/collection-filters.component.ts`

- [x] **3a.** Hoja inferior (mismo patrón que `ball-menu`: `--ease-drawer`, `--dur-panel`, se cierra arrastrando o
  tocando fuera): orden (Recientes · PC · Nº de Pokédex, y ascendente/descendente), tipo (los 18 `app-type-chip`
  seleccionables, uno o ninguno), interruptores Shiny y Favoritos, botón "Quitar filtros". Cada cambio llama a
  `collection.setQuery(...)` al momento (sin botón "Aplicar"). Commit + `/guardar`.

### Paso 4 — Página `/coleccion`

**Files:** Create `src/app/features/collection/collection.page.ts`; Modify `src/app/app.routes.ts`,
`src/app/features/map/ball-menu.component.ts`

- [x] **4a.** Ruta `{ path: 'coleccion', canActivate: [authGuard], loadComponent: … }` (y comentario de rutas). En
  `ball-menu`, primera opción "Mis Pokémon" → `/coleccion` (icono de Ionicons ya registrado o `addIcons` nuevo).
- [x] **4b.** Página con `ion-header` (botón atrás `defaultHref="/mapa"`, título "Mis Pokémon" y el total "· 12"),
  botón "Filtros" con un punto si hay alguno activo, rejilla de 2 columnas (3 a partir de 600 px) de
  `app-collection-card`, y al final un centinela con `IntersectionObserver` que llama a `loadMore()` (no
  `ion-infinite-scroll`: así se controla la animación y el "cargando").
- [x] **4c. Estados (DISENO §6):** cargando la primera vez → 6 tarjetas esqueleto con brillo que pasa (respeta
  "reducir movimiento"); vacía sin filtros → ilustración + "Aún no has capturado ningún Pokémon" + botón "Salir a
  buscar" (→ `/mapa`); vacía CON filtros → "Ningún Pokémon con estos filtros" + "Quitar filtros"; error → texto +
  "Reintentar"; servidor despertando → lo cubre ya el interceptor de F1-09 (D-043).
- [x] **4d.** Al volver de la ficha (`ionViewWillEnter`) NO se recarga entera: la ficha ya llamó a `patchItem` /
  `removeItem`. Commit + `/guardar`.

### Paso 5 — Caramelos en "¡Capturado!"

**Files:** Modify `src/app/features/encounter/caught-card.component.ts` (+ spec), `encounter.page.ts`

- [x] **5a.** Test: con `candy = { familyId: 10, gained: 3, total: 9 }` la tarjeta muestra "+3 caramelos de Pikachu"
  (nombre de la especie BASE de la familia: la primera de la cadena, `evolvesFrom === null` siguiendo hacia atrás en el
  dataset) y cuenta de 0 a 3 al ritmo de la XP (`XP_COUNT_MS`); sin `candy` no sale la línea.
- [x] **5b.** Implementar (input `candy`), pasarle `result.candy` desde la página. Botón secundario "Ver en Mis
  Pokémon" → `/coleccion/<caught.id>` (la ficha llega en F3-03; hasta entonces → `/coleccion`). Commit + `/guardar`.

### Paso 6 — Prueba y cierre

- [x] **6a.** Navegador 390×844 con el servidor local y una cuenta `@pokecrud.test` con ~35 capturas (sembradas con el
  helper del e2e o capturando): scroll hasta el final (2 páginas, sin repetidos), cada orden y filtro, vacía, sin
  conexión (DevTools → Offline → error + Reintentar). Capturas `docs/evidencias/F3-02_0{1..4}_*.png`. Borrar la cuenta.
- [ ] **6b.** (pendiente: Samuel sin móvil el 2026-10-13; la pantalla no usa GPS ni cámara) Android: abrirla en el APK y comprobar el scroll fluido con 30+ tarjetas (fps por CDP ≥ 55). REGLA 2.

---

## F3-03 · Ficha del individuo

**Criterio (ROADMAP):** arte, grito, PC, IVs, naturaleza, stats calculados, movimientos, dónde/cuándo se capturó, mapa
mini, renombrar, transferir (con deshacer).

### Paso 1 — Servidor: `GET`, `PATCH` y `DELETE /collection/:id`

**Files:** Modify `server/src/collection/*`; Test `server/test/collection.e2e-spec.ts`

- [x] **1a. e2e que fallan:**
  1. `GET /collection/:id` propio → `CollectionDetail` con `ivs`, `stats` (= `calcStats` de shared), `cp`, `candy` de su
     familia (0 si no tiene fila); de OTRO jugador → 404; id que no es UUID → 400.
  2. `PATCH { nickname: '  Chispa  ' }` → `nickname: 'Chispa'`; `{ nickname: null }` lo quita; 13 caracteres o `<b>` →
     400; `{ favorite: true }`; cuerpo vacío → 400; campos desconocidos → 400 (`forbidNonWhitelisted`); de otro → 404.
  3. `DELETE` → 200 `{ candy: { familyId, qty, gained: 1 } }`, la fila ya no existe y `qty` subió 1; repetir → 404
     (y los caramelos NO suben otra vez); de otro → 404.
  4. Concurrencia: dos `DELETE` a la vez del mismo → uno 200 y otro 404, y +1 caramelo (no +2).
- [x] **1b.** DTO del PATCH: `nickname?: string | null` con `@ValidateIf((o) => o.nickname !== null)` +
  `@IsString()` y la normalización con `normalizeNickname` en el servicio (un `RangeError` → 400 con su mensaje);
  `favorite?: @IsBoolean()`; validador de "al menos un campo".
- [x] **1c. Transferir** (una transacción; el `deleteMany` con `playerId` hace a la vez de autorización y de candado):

```ts
  async transfer(playerId: string, id: string): Promise<TransferResult> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.caughtPokemon.findFirst({ where: { id, playerId }, select: { speciesId: true } });
      if (!row) throw new NotFoundException('Ese Pokémon no está en tu colección');
      const { count } = await tx.caughtPokemon.deleteMany({ where: { id, playerId } });
      if (count !== 1) throw new NotFoundException('Ese Pokémon no está en tu colección');
      const familyId = this.spawns.speciesDetails(row.speciesId)!.familyId;
      const candy = await tx.candy.upsert({
        where: { playerId_familyId: { playerId, familyId } },
        create: { playerId, familyId, qty: CANDY_PER_TRANSFER },
        update: { qty: { increment: CANDY_PER_TRANSFER } },
      });
      return { candy: { familyId, qty: candy.qty, gained: CANDY_PER_TRANSFER } };
    }, { maxWait: 5_000, timeout: 10_000 });
  }
```

  (Con dos `DELETE` simultáneos el segundo `deleteMany` espera al bloqueo de la fila y da `count = 0` → 404 y su
  transacción no suma caramelos.) Equipos (F3-06) que apunten a ese Pokémon: se resuelve en F3-01b; anotarlo en el PR.
- [x] **1d.** e2e → PASA; build, unitarios, lint. Commit + `/guardar`.

### Paso 2 — Transferir con deshacer (puro)

**Files:** Create `src/app/features/collection/pending-transfer.ts` + spec

- [x] **2a. Test que falla** (reloj falso de Vitest):

```ts
import { PendingTransfer, UNDO_MS } from './pending-transfer';

describe('PendingTransfer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('confirma tras UNDO_MS si no se deshace', async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const p = new PendingTransfer('id-1', commit);
    await vi.advanceTimersByTimeAsync(UNDO_MS - 1);
    expect(commit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(commit).toHaveBeenCalledWith('id-1');
    expect(p.state()).toBe('done');
  });

  it('deshacer a tiempo = nunca se llama al servidor', async () => {
    const commit = vi.fn();
    const p = new PendingTransfer('id-1', commit);
    expect(p.undo()).toBe(true);
    await vi.advanceTimersByTimeAsync(UNDO_MS * 2);
    expect(commit).not.toHaveBeenCalled();
    expect(p.state()).toBe('undone');
  });

  it('flush() (salir de la pantalla) confirma YA; después deshacer ya no vale', async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const p = new PendingTransfer('id-1', commit);
    await p.flush();
    expect(commit).toHaveBeenCalledTimes(1);
    expect(p.undo()).toBe(false);
  });

  it('si el servidor falla queda en "failed" (la ficha lo devuelve a la lista)', async () => {
    const p = new PendingTransfer('id-1', vi.fn().mockRejectedValue(new Error('500')));
    await vi.advanceTimersByTimeAsync(UNDO_MS);
    expect(p.state()).toBe('failed');
  });
});
```

- [x] **2b.** → FALLA. **2c.**

```ts
import { signal } from '@angular/core';

export const UNDO_MS = 5_000;
export type TransferState = 'pending' | 'committing' | 'done' | 'undone' | 'failed';

/** Transferir con deshacer (F3-03): se espera UNDO_MS antes de llamar al servidor; deshacer = no llamarlo nunca. */
export class PendingTransfer {
  readonly state = signal<TransferState>('pending');
  private readonly timer: ReturnType<typeof setTimeout>;

  constructor(
    readonly id: string,
    private readonly commit: (id: string) => Promise<unknown> | unknown,
  ) {
    this.timer = setTimeout(() => void this.run(), UNDO_MS);
  }

  undo(): boolean {
    if (this.state() !== 'pending') return false;
    clearTimeout(this.timer);
    this.state.set('undone');
    return true;
  }

  /** Confirmar ya (al salir de la pantalla o cerrar la app). */
  flush(): Promise<void> {
    clearTimeout(this.timer);
    return this.run();
  }

  private async run(): Promise<void> {
    if (this.state() !== 'pending') return;
    this.state.set('committing');
    try {
      await this.commit(this.id);
      this.state.set('done');
    } catch {
      this.state.set('failed');
    }
  }
}
```

- [x] **2d.** → PASA. Commit + `/guardar`.

### Paso 3 — Página de la ficha

**Files:** Create `src/app/features/collection/pokemon-detail.page.ts`, `detail-stats.component.ts`,
`detail-moves.component.ts`, `detail-origin.component.ts`; Modify `app.routes.ts`, `collection.service.ts`
(`detail(id)`, `rename`, `setFavorite`, `transfer`)

Componentes pequeños para no pasar el presupuesto de 2 kB de estilos por componente (como D-033).

- [x] **3a.** Ruta `coleccion/:id` (`authGuard`). La página pide `GET /collection/:id` (con el `CollectionItem` de la
  lista como cabecera inmediata mientras llega el detalle: nada de pantalla en blanco). Fondo tintado por el tipo
  principal (DISENO §1: "cada pantalla de un Pokémon se tiñe con el color de su tipo principal").
- [x] **3b. Cabecera:** arte grande (o shiny), entrada con `scale(0.95)+opacity` → normal, **grito al abrir** (una
  vez; `AudioService.playCry`), PC grande en Fredoka, mote/nombre con lápiz para renombrar, ★ favorito (toque → PATCH
  optimista; si falla, vuelve atrás con aviso), nivel, sexo, chips de tipo, altura y peso × `heightScale` (XS/XL como
  en el encuentro).
- [x] **3c. `app-detail-stats`:** valoración (`ivStars` + `ivPercent`, con estrellas y texto "96 % · ★★★") y 6 barras
  de IVs (`app-stat-bar` con `max=31`); debajo las stats reales (`stats`) con `max` = 255; naturaleza en español
  (`shared/data/natures-es.ts`) indicando qué sube (▲) y qué baja (▼) (de la tabla de naturalezas de `stats.ts`).
- [x] **3d. `app-detail-moves`:** los 4 movimientos (nombre ES, `app-type-chip`, categoría física/especial/estado,
  potencia, precisión, PP) desde `DatasetService.moves`.
- [x] **3e. `app-detail-origin`:** "Capturado el 13 oct 2026, 11:52 · Poké Ball" (`Intl.DateTimeFormat('es-CO')`) y
  un **mapa mini** de 160 px con un pin: Google Maps JS con el mismo `loadMapsLibrary` (`disableDefaultUI`,
  `gestureHandling: 'none'`, `clickableIcons: false`, zoom 16, sin inclinación) cargado **solo al hacerse visible**
  (`IntersectionObserver`; cada mapa cuenta como una carga de Maps). Si Maps falla → texto con las coordenadas
  redondeadas a 3 decimales, nunca un hueco gris.
- [x] **3f. Renombrar:** hoja con un campo (máx. `NICKNAME_MAX`, contador), validación en vivo con
  `normalizeNickname` (mismo mensaje que el servidor), "Guardar" → PATCH → `collection.patchItem`. "Quitar mote".
- [x] **3g. Transferir:** botón al final (estilo peligro, texto "Transferir · +1 caramelo"), confirmación corta
  ("¿Transferir a Chispa? Recibirás 1 caramelo de Pikachu"), luego: `collection.removeItem(id)`, volver a la lista y
  aviso flotante "Chispa transferido · **Deshacer**" durante `UNDO_MS` (un `PendingTransfer` en un servicio
  `providedIn: 'root'`, para que sobreviva a cambiar de pantalla). Deshacer → `restoreItem` en su sitio. Al pausar la
  app (`document.hidden`) → `flush()`. `failed` → `restoreItem` + aviso "No se pudo transferir".
- [x] **3h.** Lint, `ng test`, build. Commit + `/guardar`.

### Paso 4 — Prueba y cierre

- [x] **4a.** Navegador 390×844: abrir 3 fichas (una shiny), renombrar (válido, 13 letras → error, con emoji → error),
  favorito ida y vuelta, transferir y deshacer, transferir y esperar (sale de la lista, +1 caramelo en otro de su
  familia), mapa mini. Capturas `docs/evidencias/F3-03_0{1..5}_*.png` (el mapa mini enseña DÓNDE se capturó: usar una
  captura hecha en un sitio público o en Neiva centro, no en casa; el repo es público).
- [ ] **4b.** (pendiente: sin móvil el 2026-10-13; no usa GPS ni cámara) Android: abrir la ficha desde "¡Capturado!" → "Ver en Mis Pokémon"; grito, barras y mapa mini; fps al
  desplazar ≥ 55. REGLA 2.

---

## Pendientes de humanos

- **Quien tenga `DIRECT_URL` (Alex, Kenneth o Samuel):** F3-02a paso 8 — migración + `db:backfill-collection` en
  Supabase **antes** de mezclar F3-02a.

## Riesgos

- **Desplegar sin migrar:** capturas con 500 en producción (F3-02a paso 8 lo ordena). Si pasa: aplicar la migración
  enseguida (no hace falta revertir el código).
- **Caramelos de capturas antiguas:** el script solo da caramelos a quien no tiene NINGUNA fila `Candy`; si alguien
  captura con el código nuevo antes de ejecutar el script, sus capturas antiguas no suman. Por eso el script va en el
  mismo paso que la migración, antes de mezclar.
- **Filtro por tipo con `IN (…)`:** hasta ~150 especies por tipo; con el índice `(playerId, speciesId)` es trivial
  para colecciones de clase. Si algún día pesa, guardar los tipos en la fila.
- **Mapa mini y cuota de Maps:** una carga por ficha abierta (solo al verse). Dentro de la prueba gratuita (ESTADO);
  si sube mucho, sustituir por una imagen estática.
- **IVs visibles:** quien capture puede "valorar" sin cambiar nada del juego; los del encuentro siguen ocultos (los
  mismos datos no permiten predecir spawns: la semilla es HMAC con `SPAWN_SALT`, D-025).

---

# Parte 2 (F3-01b): Pokédex 1025, evolución con caramelos y CRUD del curso

**Objetivo (VISION, pilar 3):** "Pokédex 1025 con vistos/capturados por generación" y "evolución con caramelos
(animación de evolución)", y el CRUD del curso (IS-11 y HU-08…HU-18) con el sistema de diseño en vez del Ionic por
defecto.

**Lo que ya existe y se aprovecha:** `GET /pokedex` (F3-02a: especies vistas/capturadas), `Candy` por familia y
`CANDY_PER_*` (D-052), la ficha `/coleccion/:id` (F3-03), el dataset con `evolvesFrom`/`evolvesTo`/`habitat`/
`generation`, la tabla de tipos (`shared/engine/battle/type-chart.ts`) y el CRUD del curso en el servidor (`/pokemon`,
`/teams`, `/favorites`, `/customPokemon`, D-019/D-023) con su app de IS-11.

**Choque de rutas (se resuelve en F3-04 paso 1):** hoy `/pokedex` es el **inventario de IS-11** (la tienda de la clase,
151 con precio y stock, HU-03/04/05/14). La Pokédex de 1025 necesita esa ruta. El inventario pasa a **`/inventario`**
("Inventario" en el menú); sus rutas de detalle, alta y edición (`/pokemon/:id`, `/pokemon/nuevo`,
`/pokemon/:id/editar`) **no cambian** (las usan la colección de Postman y lo evaluado del curso). `/tabs/pokedex` (enlace
viejo de IS-11) redirige a `/inventario`.

**Orden y paralelismo:**

```
F3-04 Pokédex 1025 (rutas + pantalla + ficha de especie)
F3-05 Evolución con caramelos (servidor + ficha + animación)      ← independiente de F3-04 (solo comparte shared/)
F3-06a Inventario IS-11 con la nueva UI ─┐
F3-06b Equipos con Pokémon capturados   ─┼─ independientes entre sí
F3-06c Favoritos y personalizados       ─┘
```

F3-06 era demasiado grande para una sesión: **se parte en F3-06a/b/c** (ROADMAP). Nada de la parte 2 necesita el móvil
salvo el último vistazo de cada tarea.

## Mapa de archivos (parte 2)

| Archivo | Tarea | Responsabilidad |
| --- | --- | --- |
| `shared/engine/weaknesses.ts` (+ spec) | F3-04 | Multiplicador de cada tipo atacante contra una especie, agrupado (×4, ×2, ×½, ×¼, ×0) |
| `shared/engine/evolution-chain.ts` (+ spec) | F3-04 | Árbol de la cadena evolutiva de cualquier miembro, con el método en texto |
| `src/app/services/game/pokedex.service.ts` (+ spec) | F3-04 | `GET /pokedex` en caché; se invalida al capturar |
| `src/app/features/pokedex-1025/pokedex.page.ts` | F3-04 | `/pokedex`: rejilla por generación, vistos/capturados |
| `src/app/features/pokedex-1025/species.page.ts` (+ subcomponentes) | F3-04 | `/pokedex/:id`: ficha de la especie |
| `src/app/app.routes.ts`, `features/pokedex/` → `features/inventory/` | F3-04 | IS-11 a `/inventario` |
| `shared/engine/evolution.ts` (+ spec) | F3-05 | Opciones de evolución y su coste en caramelos |
| `server/src/collection/*` (+ e2e) | F3-05 | `POST /collection/:id/evolve` transaccional |
| `src/app/features/collection/evolve-*.ts` | F3-05 | Botones en la ficha y animación de evolución |
| `src/app/features/inventory/**` | F3-06a | IS-11 con el sistema de diseño |
| `server/prisma` (migración `team_caught`), `server/src/teams/*`, `src/app/features/teams/**` | F3-06b | Equipos de hasta 6 Pokémon capturados |
| `src/app/features/favorites/**`, `src/app/features/custom-pokemon/**` | F3-06c | Favoritos y personalizados |

---

## F3-04 · Pokédex 1025

**Criterio (ROADMAP):** vistos/capturados por generación; ficha de especie (descripción ES, debilidades calculadas,
cadena evolutiva, altura/peso, hábitat). Vista móvil 390×844 y un vistazo en Android.

### Paso 1 — El inventario de IS-11 se muda a `/inventario`

**Files:** Move `src/app/features/pokedex/` → `src/app/features/inventory/` (clase `PokedexPage` → `InventoryPage`,
selector `app-inventory`); Modify `app.routes.ts`, `core/auth/auth.guard.ts` (fallback de `adminGuard`),
`features/pokemon-add/pokemon-add.page.ts`, `features/pokemon-detail/pokemon-detail.page.ts`,
`features/map/ball-menu.component.ts`, `README.md` (tabla de rutas)

- [x] **1a.** `git mv` de la carpeta y renombrar clase/selector/título ("Inventario de la tienda"). En `app.routes.ts`:
  `{ path: 'inventario', loadComponent: … InventoryPage }` (pública, como hoy) y `{ path: 'tabs/pokedex', redirectTo:
  '/inventario' }`. Quitar la ruta `pokedex` vieja (la nueva llega en el paso 4).
- [x] **1b.** Cambiar `'/pokedex'` → `'/inventario'` en el fallback de `adminGuard`, en `navigateBack` de
  `pokemon-add` y `pokemon-detail`, y en el `defaultHref` del botón atrás de esas páginas.
  `grep -rn "'/pokedex'" src/app` → solo lo que ahora es la Pokédex nueva.
- [x] **1c.** Menú de la Poké Ball: "Pokédex" (→ `/pokedex`, la nueva) y "Inventario" (→ `/inventario`, icono
  `storefront-outline`). README: tabla de rutas al día.
- [x] **1d.** `ng test` (el spec de la página movida se renombra con ella), lint, build. Commit + `/guardar`.

### Paso 2 — Debilidades (puro)

**Files:** Create `shared/engine/weaknesses.ts` + spec

- [x] **2a. Test que falla** (con la tabla real de `types.json`, como `type-chart.spec.ts`):

```ts
import { readFileSync } from 'node:fs';
import { buildTypeChart } from './battle/type-chart.js';
import { defenseProfile } from './weaknesses.js';

const chart = buildTypeChart(
  JSON.parse(readFileSync(new URL('../../src/assets/data/types.json', import.meta.url), 'utf8')),
);

describe('defenseProfile', () => {
  it('Charizard (fuego/volador): roca ×4; agua y eléctrico ×2; tierra ×0; planta y bicho ×¼', () => {
    const p = defenseProfile(['fire', 'flying'], chart);
    expect(p.x4).toEqual(['rock']);
    expect(p.x2.sort()).toEqual(['electric', 'water']);
    expect(p.x0).toEqual(['ground']);
    expect(p.x025.sort()).toEqual(['bug', 'grass']);
    expect(p.x05.sort()).toEqual(['fairy', 'fighting', 'fire', 'steel']);
  });
  it('un solo tipo (Normal): lucha ×2, fantasma ×0, nada más', () => {
    const p = defenseProfile(['normal'], chart);
    expect(p.x2).toEqual(['fighting']);
    expect(p.x0).toEqual(['ghost']);
    expect([...p.x4, ...p.x05, ...p.x025]).toEqual([]);
  });
});
```

- [x] **2b.** falla. **2c.**

```ts
import type { TypeName } from '../data/dataset.types.js';
import { TYPE_NAMES, type TypeChart, effectiveness } from './battle/type-chart.js';

/** Cómo le afecta cada tipo atacante a una especie (ficha de la Pokédex, F3-04). Los ×1 no se listan. */
export interface DefenseProfile {
  x4: TypeName[];
  x2: TypeName[];
  x05: TypeName[];
  x025: TypeName[];
  x0: TypeName[];
}

export function defenseProfile(types: readonly TypeName[], chart: TypeChart): DefenseProfile {
  const p: DefenseProfile = { x4: [], x2: [], x05: [], x025: [], x0: [] };
  for (const atk of TYPE_NAMES) {
    const m = effectiveness(chart, atk, types);
    if (m === 4) p.x4.push(atk);
    else if (m === 2) p.x2.push(atk);
    else if (m === 0.5) p.x05.push(atk);
    else if (m === 0.25) p.x025.push(atk);
    else if (m === 0) p.x0.push(atk);
  }
  return p;
}
```

  (`effectiveness(chart, ataque, tiposDefensor)` es la firma real de `type-chart.ts`.)
- [x] **2d.** pasa. Commit + `/guardar`.

### Paso 3 — Cadena evolutiva (pura)

**Files:** Create `shared/engine/evolution-chain.ts` + spec

- [x] **3a. Test que falla** (con `pokedex.json` real):

```ts
import { readFileSync } from 'node:fs';
import type { Species } from '../data/dataset.types.js';
import { evolutionTree, methodText } from './evolution-chain.js';

const species = new Map(
  (JSON.parse(readFileSync(new URL('../../src/assets/data/pokedex.json', import.meta.url), 'utf8')) as Species[]).map(
    (s) => [s.id, s],
  ),
);
const ids = (n: { id: number; next: { node: unknown }[] }): unknown => [n.id, n.next.map((e) => ids(e.node as never))];

describe('evolutionTree', () => {
  it('desde cualquier miembro sale la cadena entera desde la base: Raichu → Pichu → Pikachu → Raichu', () => {
    expect(ids(evolutionTree(species, 26))).toEqual([172, [[25, [[26, []]]]]]);
  });
  it('ramas: Eevee tiene 8 evoluciones', () => {
    expect(evolutionTree(species, 133).next).toHaveLength(8);
  });
  it('sin evolución: un solo nodo', () => {
    expect(ids(evolutionTree(species, 128))).toEqual([128, []]);
  });
  it('método en español', () => {
    expect(methodText({ to: 2, trigger: 'level-up', minLevel: 16, item: null })).toBe('Nivel 16');
    expect(methodText({ to: 26, trigger: 'use-item', minLevel: null, item: 'thunder-stone' })).toBe('Piedra Trueno');
    expect(methodText({ to: 65, trigger: 'trade', minLevel: null, item: null })).toBe('Intercambio');
    expect(methodText({ to: 0, trigger: 'spin', minLevel: null, item: null })).toBe('Condición especial');
  });
});
```

- [x] **3b.** falla. **3c.**

```ts
import type { EvolutionLink, Species } from '../data/dataset.types.js';

export interface EvolutionNode {
  id: number;
  next: { node: EvolutionNode; link: EvolutionLink }[];
}

type Dex = ReadonlyMap<number, Pick<Species, 'id' | 'evolvesFrom' | 'evolvesTo'>>;
const MAX_DEPTH = 10; // ninguna cadena pasa de 3; así un dato roto no cuelga

/** Árbol de la cadena evolutiva de `id`, desde la especie base (F3-04). */
export function evolutionTree(species: Dex, id: number): EvolutionNode {
  let base = id;
  for (let i = 0; i < MAX_DEPTH; i++) {
    const from = species.get(base)?.evolvesFrom;
    if (from == null || !species.has(from)) break;
    base = from;
  }
  const build = (sid: number, depth: number): EvolutionNode => ({
    id: sid,
    next:
      depth >= MAX_DEPTH
        ? []
        : (species.get(sid)?.evolvesTo ?? [])
            .filter((l) => species.has(l.to))
            .map((link) => ({ link, node: build(link.to, depth + 1) })),
  });
  return build(base, 0);
}

const ITEMS_ES: Record<string, string> = {
  'fire-stone': 'Piedra Fuego',
  'water-stone': 'Piedra Agua',
  'thunder-stone': 'Piedra Trueno',
  'leaf-stone': 'Piedra Hoja',
  'moon-stone': 'Piedra Lunar',
  'sun-stone': 'Piedra Solar',
  'shiny-stone': 'Piedra Día',
  'dusk-stone': 'Piedra Noche',
  'dawn-stone': 'Piedra Alba',
  'ice-stone': 'Piedra Hielo',
};

/** Cómo evoluciona en los juegos principales (informativo: aquí se evoluciona con caramelos, F3-05). */
export function methodText(link: EvolutionLink): string {
  if (link.trigger === 'level-up') return link.minLevel ? `Nivel ${link.minLevel}` : 'Subir de nivel';
  if (link.trigger === 'use-item') return (link.item && ITEMS_ES[link.item]) ?? 'Objeto evolutivo';
  if (link.trigger === 'trade') return 'Intercambio';
  return 'Condición especial';
}
```

- [x] **3d.** pasa. Commit + `/guardar`.

### Paso 4 — `PokedexService` y la pantalla `/pokedex`

**Files:** Create `src/app/services/game/pokedex.service.ts` (+ spec), `src/app/features/pokedex-1025/pokedex.page.ts`;
Modify `app.routes.ts`, `features/encounter/encounter.page.ts` (invalidar al capturar, como la colección)

- [x] **4a. `PokedexService`** (test primero, patrón de `CollectionService`): `load()` → `GET /pokedex` una vez y
  publica `entries` como `Map<speciesId, 'seen' | 'caught'>`; `seenCount`, `caughtCount` (`computed`); `invalidate()`
  (lo llama el encuentro al capturar y también al ABRIR un encuentro: el servidor marca "visto" en ese momento).
  Tests: carga y cuenta; un segundo `load()` sin invalidar no pide nada; tras `invalidate()` sí.
- [x] **4b. Página `/pokedex`** (`authGuard`): cabecera "Pokédex · vistos 120 · capturados 34 / 1025"; fila de 9 chips
  de generación (I…IX, con "x/y capturados" de cada una); rejilla de 3-4 columnas de la generación elegida (máx. 156
  celdas: no hace falta virtualizar). Celda: Nº en `tabular-nums` y:
  - **no visto** → silueta (el arte con `filter: brightness(0) opacity(.25)`) y "???"; no se puede abrir;
  - **visto** → arte en color y nombre; se abre;
  - **capturado** → arte + icono de Poké Ball; se abre.
  Imágenes con `loading="lazy"` y el fallback de `spriteUrls`. La generación elegida se recuerda en `localStorage`
  (conveniencia; con try/catch). Estados: cargando (esqueletos), error con "Reintentar".
- [x] **4c.** Commit + `/guardar`.

### Paso 5 — Ficha de la especie `/pokedex/:id`

**Files:** Create `src/app/features/pokedex-1025/species.page.ts`, `species-weaknesses.component.ts`,
`evolution-chain.component.ts`

- [x] **5a.** Si la especie no está vista → pantalla "Aún no has visto este Pokémon" con su silueta (nada de datos: se
  descubre jugando). Si está vista: arte grande teñido por su tipo, Nº, nombre, `genus` ("Pokémon Ratón"), tipos,
  `flavor` (descripción ES), altura y peso **de la especie** (sin XS/XL), hábitat en español (`grassland` Pradera,
  `forest` Bosque, `waters-edge` Orilla, `mountain` Montaña, `cave` Cueva, `sea` Mar, `urban` Ciudad,
  `rough-terrain` Terreno agreste, `rare` Raro; `null` → no se muestra), generación y botón de grito.
- [x] **5b. `app-species-weaknesses`:** `defenseProfile(types, chart)` con el `chart` construido de
  `DatasetService.types()`; grupos "Muy débil ×4", "Débil ×2", "Resiste ×½", "Resiste mucho ×¼", "Inmune ×0" con
  `app-type-chips`; los grupos vacíos no salen. **Siempre texto + color** (DISENO §7).
- [x] **5c. `app-evolution-chain`:** el árbol de `evolutionTree` en horizontal (ramas en columnas, como Eevee), cada
  nodo con su arte pequeño (silueta si no está visto), nombre y bajo la flecha `methodText` + **el coste en caramelos de
  F3-05** cuando exista (`evolutionCost`, paso 1 de F3-05; hasta entonces, solo el método). Tocar un nodo visto → su
  ficha.
- [x] **5d.** Desde la ficha del individuo (`/coleccion/:id`), el nombre de la especie enlaza a `/pokedex/:speciesId`.
- [x] **5e.** Navegador 390×844 (Chrome sin ventana con `playwright-core`, ver bitácora de F3-02b/F3-03): Pokédex
  con una cuenta con vistos y capturados; ficha de Charizard (debilidades del test), Eevee (8 ramas), un no visto.
  Evidencias `docs/evidencias/F3-04_0{1..4}_*.png`. REGLA 2.

---

## F3-05 · Evolución con caramelos

**Criterio (ROADMAP):** regla de caramelos por cadena, endpoint transaccional, animación de evolución.

### Paso 1 — Regla (pura) → D-053

**Files:** Create `shared/engine/evolution.ts` + spec

Regla a la manera de Pokémon GO, sobre la **profundidad de la cadena** (etapa = saltos de `evolvesFrom` desde la base):
cadenas de una sola evolución (Rattata→Raticate, Magikarp→Gyarados, **Eevee** y sus 8 ramas) **50**; en cadenas de dos,
la primera **25** y la segunda **100** (Bulbasaur→Ivysaur 25, Ivysaur→Venusaur 100; Pichu→Pikachu 25,
Pikachu→Raichu 100; Wurmple→Silcoon 25). Sin nivel mínimo, sin piedras ni intercambios (no existen en el juego): el
método de los juegos se enseña como información (F3-04). El nivel, IVs, naturaleza, shiny, tamaño y mote se
**conservan**; cambian especie, stats, PC y movimientos (los 4 por defecto de la especie nueva a su nivel, D-030).

- [x] **1a. Test que falla** (dataset real):

```ts
import { readFileSync } from 'node:fs';
import type { Species } from '../data/dataset.types.js';
import { evolutionOptions } from './evolution.js';

const species = new Map(
  (JSON.parse(readFileSync(new URL('../../src/assets/data/pokedex.json', import.meta.url), 'utf8')) as Species[]).map(
    (s) => [s.id, s],
  ),
);
const opts = (id: number) => evolutionOptions(species, id).map((o) => [o.to, o.cost]);

describe('evolutionOptions', () => {
  it('cadena de dos evoluciones: 25 la primera, 100 la segunda', () => {
    expect(opts(1)).toEqual([[2, 25]]);
    expect(opts(2)).toEqual([[3, 100]]);
    expect(opts(172)).toEqual([[25, 25]]);
    expect(opts(25)).toEqual([[26, 100]]);
  });
  it('una sola evolución: 50 (también las 8 ramas de Eevee)', () => {
    expect(opts(19)).toEqual([[20, 50]]);
    expect(opts(129)).toEqual([[130, 50]]);
    expect(opts(133)).toHaveLength(8);
    expect(opts(133).every(([, c]) => c === 50)).toBe(true);
  });
  it('ramas en una cadena de dos (Wurmple): las dos a 25', () => {
    expect(opts(265)).toEqual([[266, 25], [268, 25]]);
  });
  it('sin evolución o especie desconocida: ninguna opción', () => {
    expect(opts(128)).toEqual([]);
    expect(opts(99999)).toEqual([]);
  });
});
```

- [x] **1b.** falla. **1c.**

```ts
import type { Species } from '../data/dataset.types.js';

type Dex = ReadonlyMap<number, Pick<Species, 'id' | 'evolvesFrom' | 'evolvesTo' | 'evolutionChainId'>>;
export interface EvolutionOption {
  to: number;
  cost: number;
}

const MAX_HOPS = 10;
const stageOf = (dex: Dex, id: number): number => {
  let n = 0;
  for (let cur = dex.get(id)?.evolvesFrom; cur != null && n < MAX_HOPS; cur = dex.get(cur)?.evolvesFrom) n++;
  return n;
};
const depthCache = new WeakMap<Dex, Map<number, number>>();
/** Etapa máxima de una cadena (0 = no evoluciona). Se calcula una vez por mapa. */
function chainDepth(dex: Dex, chainId: number): number {
  let cache = depthCache.get(dex);
  if (!cache) {
    cache = new Map();
    for (const s of dex.values())
      cache.set(s.evolutionChainId, Math.max(cache.get(s.evolutionChainId) ?? 0, stageOf(dex, s.id)));
    depthCache.set(dex, cache);
  }
  return cache.get(chainId) ?? 0;
}

/** Evoluciones posibles de `from` y su coste en caramelos de la familia (D-053). */
export function evolutionOptions(dex: Dex, from: number): EvolutionOption[] {
  const s = dex.get(from);
  if (!s) return [];
  const depth = chainDepth(dex, s.evolutionChainId);
  const cost = depth <= 1 ? 50 : stageOf(dex, from) === 0 ? 25 : 100;
  return s.evolvesTo.filter((l) => dex.has(l.to)).map((l) => ({ to: l.to, cost }));
}
```

- [x] **1d.** pasa. Anotar **D-053** (la regla de arriba y por qué: como Pokémon GO, sin objetos ni intercambios que el
  juego no tiene). Commit + `/guardar`.

### Paso 2 — Servidor: `POST /collection/:id/evolve`

**Files:** Modify `server/src/spawns/spawns.service.ts` (`SpeciesDetails` gana `evolvesFrom`, `evolvesTo`;
`speciesMap()` para `evolutionOptions`), `server/src/collection/*`, `shared/protocol/collection.ts`
(`EvolveRequest { to: number }`, respuesta `CollectionDetail`); Test `server/test/collection.e2e-spec.ts`

- [x] **2a. e2e que fallan:**
  1. Bulbasaur nv 10 con 25 caramelos de su familia → `POST …/evolve { to: 2 }` → 200, `speciesId: 2`, mismo nivel,
     IVs, naturaleza, shiny y mote; `cp` y `stats` recalculados (= `combatPower(calcStats(base de Ivysaur, …))`);
     caramelos 25 → 0; Pokédex de 2 = capturado.
  2. Con 24 caramelos → 409 "Te faltan caramelos" y nada cambia.
  3. `to` que no es una evolución suya (Bulbasaur → 3) → 400; especie sin evolución → 400; de otro jugador → 404.
  4. Dos `evolve` a la vez del mismo con 50 caramelos → uno 200 y otro 409; caramelos 50 → 25 (no 0).
- [x] **2b. Servicio** (una transacción, como `transfer`):

```ts
  async evolve(playerId: string, id: string, to: number): Promise<CollectionDetail> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.caughtPokemon.findFirst({ where: { id, playerId } });
      if (!row) throw new NotFoundException(NOT_YOURS);
      const option = evolutionOptions(this.spawns.speciesMap(), row.speciesId).find((o) => o.to === to);
      if (!option) throw new BadRequestException('Ese Pokémon no evoluciona en esa especie');
      const from = this.spawns.speciesDetails(row.speciesId)!;
      const target = this.spawns.speciesDetails(to)!;
      // Gasto condicional: con dos a la vez, el segundo no encuentra caramelos suficientes.
      const paid = await tx.candy.updateMany({
        where: { playerId, familyId: from.familyId, qty: { gte: option.cost } },
        data: { qty: { decrement: option.cost } },
      });
      if (paid.count !== 1) throw new ConflictException('Te faltan caramelos');
      const stats = calcStats(target.baseStats, row.ivs as unknown as Stats, row.level, row.nature as Nature);
      // Solo si sigue siendo la especie de origen: si otra petición lo evolucionó antes, count = 0 y se deshace TODO.
      const changed = await tx.caughtPokemon.updateMany({
        where: { id, playerId, speciesId: row.speciesId },
        data: { speciesId: to, cp: combatPower(stats), moves: this.spawns.defaultMoves(to, row.level) },
      });
      if (changed.count !== 1) throw new ConflictException('Ese Pokémon ya evolucionó');
      await tx.pokedexEntry.upsert({
        where: { playerId_speciesId: { playerId, speciesId: to } },
        create: { playerId, speciesId: to, caught: true, firstCaughtAt: new Date() },
        update: { caught: true },
      });
    }, TX_OPTIONS);
    return this.detail(playerId, id);
  }
```

  Controlador `@Post(':id/evolve')` con `ParseUUIDPipe` y DTO `{ to: @IsInt() @Min(1) }`, límite 30/min.
- [x] **2c.** e2e → PASA; todos los e2e, lint, unitarios, build. Commit + `/guardar`.

### Paso 3 — App: evolucionar desde la ficha + animación

**Files:** Create `src/app/features/collection/evolve-panel.component.ts`, `evolve-scene.component.ts`,
`evolve-timeline.ts` (+ spec); Modify `collection-detail.page.ts`, `collection.service.ts` (`evolve(id, to)`)

- [x] **3a. `evolve-timeline.ts` (puro, test primero)** — DISENO §5: "silueta blanca pulsando entre forma A y B
  acelerando → estallido → forma nueva". `evolvePose(ms)` → `{ showB: boolean, glow: 0..1, burst: 0..1 }`: 0-3.000 ms
  alterna A/B con periodo que baja de 600 ms a 60 ms (`showB` cambia cada medio periodo), `glow` sube de 0,3 a 1;
  3.000-3.400 ms `burst` 0→1 (destello) y `showB = true`; ≥ 3.400 forma B en reposo. Tests: al principio `showB` falso;
  los cambios A↔B en el último segundo son ≥ 4 veces más que en el primero; al final `showB` verdadero y `burst` 0.
- [x] **3b. `app-evolve-panel`** en la ficha (debajo de los caramelos): un botón por opción "Evolucionar a Raichu ·
  100 🍬" (arte pequeño del destino); deshabilitado con "Te faltan 37" si no llegan. Confirmación corta.
- [x] **3c. `app-evolve-scene`** (capa a pantalla completa): fondo oscuro, las dos siluetas blancas
  (`filter: brightness(0) invert(1)`) alternando según `evolvePose` en `requestAnimationFrame`, brillo creciente,
  destello, forma nueva a color + su grito + háptico `success` en el MISMO fotograma (DISENO §4.10), texto
  "¡Tu Pikachu evolucionó a Raichu!". La petición `POST …/evolve` sale al empezar y la animación espera su respuesta antes
  del destello (como la captura, D-046); si falla → vuelve a A con el error ("Te faltan caramelos" / "Ya evolucionó").
  "Reducir movimiento" → fundido A→B de 400 ms.
- [x] **3d.** Al terminar: la ficha muestra la especie nueva (`detail` de la respuesta), `collection.patchItem`,
  `pokedex.invalidate()`. Lint, `ng test`, build. Commit + `/guardar`.
- [x] **3e.** Navegador 390×844 contra Nest + Postgres local: Bulbasaur con 25 caramelos (sembrados) → Ivysaur;
  Eevee → elegir rama; sin caramelos → botón deshabilitado. Vídeo o capturas `docs/evidencias/F3-05_*`. REGLA 2.

---

## F3-06a · Inventario de IS-11 con la nueva UI

**Criterio:** las pantallas de IS-11 (inventario, detalle, agregar, editar; HU-03/04/05/14) se ven y se sienten como el
juego (DISENO §1-§4) sin cambiar su contrato ni sus servicios (`PokemonService`, `PokeApiService`, modelo
`pokemon.model.ts`, `PokemonFormComponent`), y sus tests siguen en verde.

- [x] **1.** `/inventario`: rejilla de tarjetas como "Mis Pokémon" (arte, nombre, tipos, **precio** y **stock** con
  "Agotado" si 0), buscador con el estilo del juego, scroll infinito actual conservado, botón "Agregar" solo para ADMIN
  (D-023).
- [x] **2.** `/pokemon/:id`: ficha con el tinte del tipo, stats con `app-stat-bar`, precio/stock destacados, editar y
  eliminar (solo ADMIN) con confirmación diseñada (nada de `alert` del sistema).
- [x] **3.** `/pokemon/nuevo` y `/pokemon/:id/editar`: `PokemonFormComponent` con los estilos de `src/theme/forms.scss`
  (`.form`, `.field__*`, D-018) y `app-game-button`.
- [x] **4.** Postman (colección del repo) sigue pasando entera contra el servidor local; `ng test`, lint, build;
  capturas `F3-06a_*`. REGLA 2.

## F3-06b · Equipos con Pokémon capturados

**Decisión a anotar (D-054):** `Team.pokemonIds` (ids de **especie**, contrato de JSON Server y de Postman) se
**conserva**; se añade `Team.caughtIds uuid[]` (≤ 6, ids de **tus** `CaughtPokemon`), que es lo que usará el combate
(F4/F5). Así no se rompe el contrato del curso (D-019) y ARQUITECTURA §9 ("equipos con Pokémon capturados") se cumple.

- [x] **1. Servidor:** migración `team_caught` (`caughtIds UUID[] NOT NULL DEFAULT '{}'`, CHECK de cardinalidad ≤ 6);
  DTO de `/teams` acepta `caughtIds` opcional (array de UUID únicos, ≤ 6) y el servicio comprueba que TODOS son del
  jugador (`count where id in … and playerId` = longitud) → si no, 400 "Hay Pokémon que no son tuyos"; al transferir un
  Pokémon (F3-03) se quita de los equipos que lo tengan (misma transacción del `DELETE /collection/:id`). e2e: crear con
  3 propios; con uno ajeno → 400; con 7 → 400; transferir uno → desaparece del equipo; Postman sin cambios sigue pasando.
- [x] **2. App:** `/equipos` (menú de la Poké Ball): lista de equipos con los 6 huecos (arte de cada capturado, PC);
  crear/renombrar/borrar; editor que elige de "Mis Pokémon" (reutilizar `app-collection-card` en modo selección, máx. 6,
  sin repetir). Vacía diseñada ("Arma tu primer equipo").
- [ ] **3.** Tests, lint, build, capturas `F3-06b_*`. REGLA 2.

## F3-06c · Favoritos y Pokémon personalizados

- [ ] **1. Favoritos** (`/favoritos`, contrato `/favorites` sin cambios): marcar una **especie** como favorita desde
  la ficha de la Pokédex (F3-04) con nota y valoración 1-5 (estrellas táctiles ≥ 44 px); lista con el sistema de diseño.
- [ ] **2. Personalizados** (`/personalizados`, contrato `/customPokemon` sin cambios): crear con nombre, 1-2 tipos,
  stats (sliders con `app-stat-bar`), URL de imagen (vista previa; si no carga → silueta) y descripción; lista y edición.
  **Que aparezcan como spawns del grupo queda fuera** (necesita reglas de spawn nuevas y moderar imágenes de terceros):
  anotado como extra en F7.
- [ ] **3.** Tests, lint, build, Postman entera, capturas `F3-06c_*`. REGLA 2.

## Riesgos (parte 2)

- **Mover IS-11 de ruta:** el profe ya evaluó `/tabs/pokedex` → se redirige a `/inventario`; las rutas `/pokemon/…` no
  cambian. Anotarlo en el README (paso 1c de F3-04).
- **Coste de evolución:** la regla es propia (D-053); si en la demo se quiere evolucionar sin farmear, el modo demo de
  F8-05 puede regalar caramelos (nunca un endpoint público).
- **Evolución y combate:** los movimientos pasan a los por defecto de la especie nueva; si F4/F5 deja elegir
  movimientos, revisar que evolucionar no borre una elección del jugador.
- **Equipos con capturados transferidos:** cubierto en F3-06b paso 1 (se quitan en la misma transacción).
