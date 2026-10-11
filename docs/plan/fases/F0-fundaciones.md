# F0 · Fundaciones — Plan de implementación

> **Para IAs:** usa la skill `executing-plans` (o `subagent-driven-development`) para ejecutar este plan
> tarea a tarea. Cada tarea del plan = una tarea del ROADMAP (`F0-02` … `F0-09`) = **una rama y un PR**.
> Antes de empezar cualquiera: REGLA 1 de `CLAUDE.md` (pull, leer, reclamar). Al acabar: REGLA 2.
> Los pasos usan casillas `- [ ]`; márcalas en TU rama a medida que avances para que el siguiente
> compañero sepa en qué paso exacto te quedaste.

**Objetivo:** dejar listo todo lo que el juego necesita debajo: los datos de las 1025 especies, el
código compartido probado, el sistema de diseño, los servicios base de la app, el servidor NestJS con
base de datos, la autenticación, el CRUD del curso migrado y la tubería para sacar el APK.

**Arquitectura:** app Angular 22/Ionic 9 en `src/` (sin moverla), lógica pura en `shared/` (probada con
Vitest en Node), servidor NestJS 12 en `server/` (proyecto npm independiente, ESM) contra Supabase
Postgres 17 con Prisma 7. Ver `docs/plan/ARQUITECTURA.md`.

**Stack verificado (2026-10-11, `npm view`):** Node ≥ 24.15 (Alex: 24.21), Angular 22.1, Ionic 9,
Capacitor 8.5, Vitest 4.0 (app) · three 0.186.1 · idb 8.0.4 · fake-indexeddb 6.2.5 ·
@fontsource/fredoka 5.3.0 · @nestjs/* 12.x (CLI 12.0.8) · prisma / @prisma/client / @prisma/adapter-pg
**7.10.0 exacto** (OJO: el tag `latest` de `prisma` apunta a `8.0.0-rc.22`, NO usarlo) · argon2 0.45.1 ·
helmet 8.3.0 · class-validator 0.15.1 · class-transformer 0.5.1 · @nestjs/throttler 6.7.1 ·
@nestjs/jwt 12.0.2 · @nestjs/config 12.0.1 · nestjs-pino 5.3.1 + pino-http 11 + pino 10 ·
@aparajita/capacitor-secure-storage 8.0.1 · @capacitor/android 8.5.3.

**Verificado en vivo:** un `nest new` de la CLI 12.0.8 genera proyecto **ESM** (`"type": "module"`,
`module: nodenext`, imports relativos con sufijo **`.js`**), tests con **Vitest** (no Jest) y lint con
**oxlint**. Prisma 7: la URL va en `prisma.config.ts` (no en `schema.prisma`), el generador es
`prisma-client` con `output`, y el cliente se crea con el adaptador `PrismaPg`.

## Orden y paralelismo

```
F0-02 dataset ─────────────┐
F0-03 shared+tooling ──────┼─> F0-05 servicios app ─┐
            └─> F0-04 diseño ───────────────────────┼─> F0-07 auth ─> F0-08 CRUD migrado
F0-06 servidor ─────────────────────────────────────┘
            F0-04 ─> F0-09 APK
```

Se pueden coger **a la vez** por personas distintas: F0-02, F0-03 y F0-06 (no tocan los mismos archivos).
Archivos compartidos que más de una tarea toca: `package.json` (raíz) y `src/global.scss`. Si hay
conflicto al mezclar, se resuelve conservando las dos partes.

## Mapa de archivos de toda la fase

| Archivo                                                                 | Tarea       | Responsabilidad                                                                   |
| ----------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `scripts/build-dataset.mjs`                                             | F0-02       | Descarga PokéAPI con caché y escribe el dataset compacto                          |
| `scripts/lib/pokeapi-fetch.mjs`                                         | F0-02       | fetch con timeout, reintentos con backoff y caché en disco                        |
| `src/assets/data/pokedex.json`, `moves.json`, `types.json`, `meta.json` | F0-02       | Dataset generado (se commitea)                                                    |
| `shared/data/dataset.types.ts`                                          | F0-02       | Tipos del dataset (los usan app y server)                                         |
| `shared/data/dataset.spec.ts`                                           | F0-02       | Valida forma y conteo del dataset generado                                        |
| `vitest.shared.config.ts`                                               | F0-03       | Vitest en Node para `shared/**/*.spec.ts`                                         |
| `shared/engine/rng.ts` (+ spec)                                         | F0-03       | PRNG con semilla (mulberry32) y hash de cadenas                                   |
| `tsconfig.json`, `tsconfig.app.json`                                    | F0-03       | Alias `@shared/*` y `shared/` dentro de la compilación                            |
| `src/theme/tokens.scss`                                                 | F0-04       | Tokens de DISENO.md §2                                                            |
| `src/app/shared/ui/*`                                                   | F0-04       | `GameButton`, `GlassPanel`, `StatBar`, `HpBar` (+ `TypeChips` existente adaptado) |
| `src/app/features/dev-ui/dev-ui.page.ts`                                | F0-04       | Escaparate `/dev/ui`                                                              |
| `src/app/services/game/{dataset,audio,haptics,settings}.service.ts`     | F0-05       | Servicios base con signals                                                        |
| `server/**`                                                             | F0-06/07/08 | NestJS 12 + Prisma 7                                                              |
| `src/app/core/auth/*`, `src/app/features/auth/*`                        | F0-07       | Sesión en la app                                                                  |
| `android/**`, `capacitor.config.ts`, `scripts/apk.mjs`                  | F0-09       | APK                                                                               |

---

## Task F0-02 · Dataset completo desde PokéAPI

**Archivos:**

- Crear: `scripts/lib/pokeapi-fetch.mjs`, `scripts/build-dataset.mjs`
- Crear: `shared/data/dataset.types.ts`, `shared/data/dataset.spec.ts`
- Generar: `src/assets/data/{pokedex,moves,types,meta}.json`
- Modificar: `package.json` (script `dataset`), `.gitignore` (ya ignora `/.cache`)

> Necesita `vitest.shared.config.ts` para el test (lo crea F0-03). Si F0-03 no está mezclada aún,
> crea ese archivo exactamente como está en F0-03 Paso 1 y avísalo en el PR (git resolverá el duplicado
> idéntico sin conflicto).

- [x] **Paso 1: tipos del dataset** — `shared/data/dataset.types.ts`

```ts
// Tipos del dataset generado por scripts/build-dataset.mjs (src/assets/data/*.json).
// Los usan la app y el servidor. Mantener en sincronía con el script.

export type TypeName =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface EvolutionLink {
  /** Especie a la que evoluciona. */
  to: number;
  trigger: string; // 'level-up' | 'use-item' | 'trade' | ...
  minLevel: number | null;
  item: string | null;
}

export interface Species {
  id: number;
  name: string; // slug de PokéAPI: 'mr-mime'
  names: { es: string; en: string };
  genus: string; // ES con fallback EN: 'Pokémon Ratón'
  flavor: string; // ES con fallback EN, sin saltos raros
  types: TypeName[]; // 1 o 2, en orden de slot
  baseStats: BaseStats;
  captureRate: number; // 3..255
  baseExp: number; // puede ser 0 si PokéAPI trae null
  genderRate: number; // -1 sin género, 0..8 (octavos de hembra)
  height: number; // decímetros
  weight: number; // hectogramos
  generation: number; // 1..9
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  habitat: string | null;
  color: string;
  shape: string | null;
  growthRate: string;
  evolutionChainId: number;
  evolvesFrom: number | null;
  evolvesTo: EvolutionLink[];
  /** Movimientos por nivel del version-group más reciente que tenga la especie. */
  learnset: { moveId: number; level: number }[];
}

export interface Move {
  id: number;
  name: string;
  names: { es: string; en: string };
  type: TypeName;
  category: 'physical' | 'special' | 'status';
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  /** Estado que puede causar y su probabilidad (0 = no aplica). */
  ailment: string | null;
  ailmentChance: number;
  statChanges: { stat: string; change: number }[];
  statChance: number;
  critRate: number;
  drain: number;
  healing: number;
  minHits: number | null;
  maxHits: number | null;
}

export interface TypeInfo {
  name: TypeName;
  nameEs: string;
  /** Multiplicador cuando ESTE tipo ataca a cada tipo defensor (solo las entradas != 1). */
  attack: Partial<Record<TypeName, 0 | 0.5 | 2>>;
}

export interface DatasetMeta {
  generatedAt: string;
  speciesCount: number;
  movesCount: number;
  source: 'https://pokeapi.co/api/v2';
  /** Hash corto del contenido; la app lo usa para invalidar su caché de IndexedDB. */
  version: string;
}
```

- [x] **Paso 2: cliente HTTP con caché** — `scripts/lib/pokeapi-fetch.mjs`

```js
// fetch a PokéAPI con: caché en disco (.cache/pokeapi), timeout, reintentos con backoff+jitter
// y concurrencia limitada. Reanudable: lo ya descargado no se vuelve a pedir.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const BASE = 'https://pokeapi.co/api/v2/';
const CACHE_DIR = join(process.cwd(), '.cache', 'pokeapi');
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 4;

function cachePath(url) {
  const rel = url.replace(BASE, '').replace(/[?&=]/g, '_').replace(/\/$/, '');
  return join(CACHE_DIR, `${rel}.json`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getJson(urlOrPath) {
  const url = urlOrPath.startsWith('http') ? urlOrPath : BASE + urlOrPath;
  const file = cachePath(url);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    /* no está en caché: se descarga */
  }
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { fatal: true });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      const json = await res.json();
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(json));
      return json;
    } catch (err) {
      lastError = err;
      if (err.fatal) break;
      const backoff = Math.min(8000, 500 * 2 ** attempt) + Math.random() * 300;
      await sleep(backoff);
    }
  }
  throw lastError;
}

/** Ejecuta `fn` sobre `items` con como mucho `limit` promesas a la vez. */
export async function mapLimit(items, limit, fn, onProgress) {
  const out = new Array(items.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      done++;
      if (onProgress && done % 50 === 0) onProgress(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export const idFromUrl = (url) => Number(url.split('/').filter(Boolean).pop());
```

- [x] **Paso 3: el script** — `scripts/build-dataset.mjs`

```js
// Genera src/assets/data/{pokedex,moves,types,meta}.json desde PokéAPI.
// Uso: npm run dataset   (la 1ª vez tarda ~10-20 min; después sale de .cache/ en segundos)
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getJson, idFromUrl, mapLimit } from './lib/pokeapi-fetch.mjs';

const OUT = join(process.cwd(), 'src', 'assets', 'data');
const SPECIES_COUNT = 1025;
const CONCURRENCY = 6;

const pick = (entries, lang, field) => entries.find((e) => e.language.name === lang)?.[field];
const clean = (s) =>
  (s ?? '')
    .replace(/[\f\n\r­]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const lastLang = (entries, lang, field) =>
  [...entries].reverse().find((e) => e.language.name === lang)?.[field];
const log = (msg) => process.stdout.write(`${msg}\n`);

const STAT = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
};

function evolutionIndex(chain) {
  // Recorre la cadena y devuelve { [speciesId]: { from, to: [...] } }
  const idx = {};
  (function walk(node, from) {
    const id = idFromUrl(node.species.url);
    idx[id] = { from, to: [] };
    for (const child of node.evolves_to) {
      const d = child.evolution_details[0] ?? {};
      idx[id].to.push({
        to: idFromUrl(child.species.url),
        trigger: d.trigger?.name ?? 'level-up',
        minLevel: d.min_level ?? null,
        item: d.item?.name ?? null,
      });
      walk(child, id);
    }
  })(chain.chain, null);
  return idx;
}

function learnsetOf(pokemon) {
  // Elige el version_group más reciente (id más alto) que tenga movimientos por nivel.
  const byGroup = new Map();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.move_learn_method.name !== 'level-up') continue;
      const g = idFromUrl(d.version_group.url);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push({ moveId: idFromUrl(m.move.url), level: d.level_learned_at });
    }
  }
  if (byGroup.size === 0) return [];
  const latest = Math.max(...byGroup.keys());
  return byGroup.get(latest).sort((a, b) => a.level - b.level || a.moveId - b.moveId);
}

async function main() {
  const ids = Array.from({ length: SPECIES_COUNT }, (_, i) => i + 1);
  log(`Especies: descargando ${ids.length}…`);
  const speciesRaw = await mapLimit(
    ids,
    CONCURRENCY,
    (id) => getJson(`pokemon-species/${id}`),
    (d, t) => log(`  species ${d}/${t}`),
  );
  const pokemonRaw = await mapLimit(
    ids,
    CONCURRENCY,
    (id) => getJson(`pokemon/${id}`),
    (d, t) => log(`  pokemon ${d}/${t}`),
  );

  const chainIds = [...new Set(speciesRaw.map((s) => idFromUrl(s.evolution_chain.url)))];
  log(`Cadenas evolutivas: ${chainIds.length}…`);
  const chains = await mapLimit(chainIds, CONCURRENCY, (id) => getJson(`evolution-chain/${id}`));
  const evo = Object.assign({}, ...chains.map(evolutionIndex));

  const pokedex = ids.map((id, i) => {
    const s = speciesRaw[i];
    const p = pokemonRaw[i];
    const nameEs = pick(s.names, 'es', 'name');
    const nameEn = pick(s.names, 'en', 'name') ?? s.name;
    return {
      id,
      name: s.name,
      names: { es: nameEs ?? nameEn, en: nameEn },
      genus: clean(pick(s.genera, 'es', 'genus') ?? pick(s.genera, 'en', 'genus')),
      flavor: clean(
        lastLang(s.flavor_text_entries, 'es', 'flavor_text') ??
          lastLang(s.flavor_text_entries, 'en', 'flavor_text'),
      ),
      types: p.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      baseStats: Object.fromEntries(p.stats.map((st) => [STAT[st.stat.name], st.base_stat])),
      captureRate: s.capture_rate,
      baseExp: p.base_experience ?? 0,
      genderRate: s.gender_rate,
      height: p.height,
      weight: p.weight,
      generation: idFromUrl(s.generation.url),
      isLegendary: s.is_legendary,
      isMythical: s.is_mythical,
      isBaby: s.is_baby,
      habitat: s.habitat?.name ?? null,
      color: s.color.name,
      shape: s.shape?.name ?? null,
      growthRate: s.growth_rate.name,
      evolutionChainId: idFromUrl(s.evolution_chain.url),
      evolvesFrom: evo[id]?.from ?? null,
      evolvesTo: evo[id]?.to ?? [],
      learnset: learnsetOf(p),
    };
  });

  const moveIds = [...new Set(pokedex.flatMap((sp) => sp.learnset.map((l) => l.moveId)))].sort(
    (a, b) => a - b,
  );
  log(`Movimientos: ${moveIds.length}…`);
  const movesRaw = await mapLimit(
    moveIds,
    CONCURRENCY,
    (id) => getJson(`move/${id}`),
    (d, t) => log(`  move ${d}/${t}`),
  );
  const moves = movesRaw.map((m) => ({
    id: m.id,
    name: m.name,
    names: {
      es: pick(m.names, 'es', 'name') ?? pick(m.names, 'en', 'name') ?? m.name,
      en: pick(m.names, 'en', 'name') ?? m.name,
    },
    type: m.type.name,
    category: m.damage_class?.name ?? 'status',
    power: m.power,
    accuracy: m.accuracy,
    pp: m.pp ?? 5,
    priority: m.priority,
    ailment: m.meta?.ailment?.name && m.meta.ailment.name !== 'none' ? m.meta.ailment.name : null,
    ailmentChance: m.meta?.ailment_chance ?? 0,
    statChanges: m.stat_changes.map((c) => ({ stat: c.stat.name, change: c.change })),
    statChance: m.meta?.stat_chance ?? 0,
    critRate: m.meta?.crit_rate ?? 0,
    drain: m.meta?.drain ?? 0,
    healing: m.meta?.healing ?? 0,
    minHits: m.meta?.min_hits ?? null,
    maxHits: m.meta?.max_hits ?? null,
  }));

  const TYPE_NAMES = [
    'normal',
    'fire',
    'water',
    'electric',
    'grass',
    'ice',
    'fighting',
    'poison',
    'ground',
    'flying',
    'psychic',
    'bug',
    'rock',
    'ghost',
    'dragon',
    'dark',
    'steel',
    'fairy',
  ];
  const typesRaw = await mapLimit(TYPE_NAMES, CONCURRENCY, (t) => getJson(`type/${t}`));
  const types = typesRaw.map((t) => {
    const attack = {};
    for (const r of t.damage_relations.double_damage_to) attack[r.name] = 2;
    for (const r of t.damage_relations.half_damage_to) attack[r.name] = 0.5;
    for (const r of t.damage_relations.no_damage_to) attack[r.name] = 0;
    return { name: t.name, nameEs: pick(t.names, 'es', 'name') ?? t.name, attack };
  });

  const body = {
    pokedex: JSON.stringify(pokedex),
    moves: JSON.stringify(moves),
    types: JSON.stringify(types),
  };
  const version = createHash('sha256')
    .update(body.pokedex + body.moves + body.types)
    .digest('hex')
    .slice(0, 12);
  const meta = {
    generatedAt: new Date().toISOString(),
    speciesCount: pokedex.length,
    movesCount: moves.length,
    source: 'https://pokeapi.co/api/v2',
    version,
  };

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'pokedex.json'), body.pokedex);
  await writeFile(join(OUT, 'moves.json'), body.moves);
  await writeFile(join(OUT, 'types.json'), body.types);
  await writeFile(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`;
  log(
    `OK · pokedex ${kb(body.pokedex)} · moves ${kb(body.moves)} · types ${kb(body.types)} · v${version}`,
  );
}

main().catch((err) => {
  console.error('FALLO build-dataset:', err.message);
  process.exit(1);
});
```

- [x] **Paso 4: script npm** — en `package.json` → `"scripts"` añadir:
      `"dataset": "node scripts/build-dataset.mjs"`

- [x] **Paso 5: test que valida el dataset (escribirlo ANTES de generar)** — `shared/data/dataset.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatasetMeta, Move, Species, TypeInfo } from './dataset.types.js';

const dir = join(process.cwd(), 'src', 'assets', 'data');
const load = <T>(f: string): T => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T;

describe('dataset generado', () => {
  const pokedex = load<Species[]>('pokedex.json');
  const moves = load<Move[]>('moves.json');
  const types = load<TypeInfo[]>('types.json');
  const meta = load<DatasetMeta>('meta.json');
  const moveIds = new Set(moves.map((m) => m.id));

  it('tiene las 1025 especies en orden y sin huecos', () => {
    expect(pokedex).toHaveLength(1025);
    pokedex.forEach((s, i) => expect(s.id).toBe(i + 1));
    expect(meta.speciesCount).toBe(1025);
  });

  it('cada especie tiene nombre, tipos, stats y captureRate válidos', () => {
    for (const s of pokedex) {
      expect(s.names.es.length).toBeGreaterThan(0);
      expect(s.types.length).toBeGreaterThanOrEqual(1);
      expect(s.types.length).toBeLessThanOrEqual(2);
      expect(Object.keys(s.baseStats).sort()).toEqual(['atk', 'def', 'hp', 'spa', 'spd', 'spe']);
      expect(s.captureRate).toBeGreaterThanOrEqual(3);
      expect(s.captureRate).toBeLessThanOrEqual(255);
      expect(s.flavor.length).toBeGreaterThan(0);
    }
  });

  it('casos conocidos', () => {
    const pikachu = pokedex[24];
    expect(pikachu.name).toBe('pikachu');
    expect(pikachu.types).toEqual(['electric']);
    expect(pikachu.captureRate).toBe(190);
    expect(pikachu.evolvesFrom).toBe(172); // Pichu
    expect(pikachu.evolvesTo.map((e) => e.to)).toContain(26); // Raichu
    expect(pokedex[149].isLegendary).toBe(true); // Mewtwo
    expect(pokedex[150].isMythical).toBe(true); // Mew
  });

  it('todos los movimientos del learnset existen en moves.json', () => {
    for (const s of pokedex) for (const l of s.learnset) expect(moveIds.has(l.moveId)).toBe(true);
    expect(pokedex.filter((s) => s.learnset.length === 0).length).toBeLessThan(10);
  });

  it('la tabla de tipos tiene los 18 tipos y casos conocidos', () => {
    expect(types).toHaveLength(18);
    const by = Object.fromEntries(types.map((t) => [t.name, t]));
    expect(by['water'].attack['fire']).toBe(2);
    expect(by['normal'].attack['ghost']).toBe(0);
    expect(by['fire'].attack['water']).toBe(0.5);
    expect(by['fairy'].attack['dragon']).toBe(2);
  });
});
```

- [x] **Paso 6: ver que falla** — `npm run test:shared` → FALLA (no existe `pokedex.json`).
- [x] **Paso 7: generar** — `npm run dataset`. La salida termina en `OK · pokedex … KB · …`.
      Si se corta, volver a lanzarlo: sigue desde la caché.
- [x] **Paso 8: ver que pasa** — `npm run test:shared` → 5 tests verdes. Pegar la salida en la bitácora.
- [x] **Paso 9: tamaño** — anotar en la bitácora los KB de la línea `OK`. Si `pokedex.json` > 3 MB,
      abrir tarea nueva en ROADMAP "partir dataset por generación" (ARQUITECTURA §3); no hacerlo aquí.
- [x] **Paso 10: commit** — `git add scripts shared/data src/assets/data package.json` y
      `git commit -m "F0-02: dataset de las 1025 especies desde PokéAPI"`. NO añadir `.cache/`.

---

## Task F0-03 · `shared/` + tooling

**Archivos:** crear `vitest.shared.config.ts`, `shared/engine/rng.ts`, `shared/engine/rng.spec.ts`,
`shared/tsconfig.json`; modificar `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `package.json`.

**Regla para todo `shared/`:** TypeScript puro, sin Angular, sin Nest, sin `Math.random`, sin `Date.now`
(el tiempo y el azar se inyectan). Los imports relativos llevan sufijo **`.js`** (`./rng.js`): así
compila igual en la app (bundler), en Vitest y en el servidor ESM (nodenext).

- [x] **Paso 1: config de Vitest para `shared/`** — `vitest.shared.config.ts` (raíz)

```ts
import { defineConfig } from 'vitest/config';

// Tests de la lógica pura (shared/) en Node, separados de `ng test` (que corre en jsdom).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['shared/**/*.spec.ts'],
  },
});
```

- [x] **Paso 2: `shared/tsconfig.json`** (para el editor y `tsc --noEmit`)

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": { "noEmit": true, "types": ["vitest/globals", "node"], "lib": ["es2022"] },
  "include": ["./**/*.ts"]
}
```

Instalar tipos de Node si faltan: `npm install -D @types/node@24`.

- [x] **Paso 3: scripts** — en `package.json`:
      `"test:shared": "vitest run --config vitest.shared.config.ts"`,
      `"test:all": "ng test --watch=false && npm run test:shared"`.

- [x] **Paso 4: test del RNG (falla primero)** — `shared/engine/rng.spec.ts`

```ts
import { createRng, hashString } from './rng.js';

describe('rng', () => {
  it('misma semilla → misma secuencia', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('valores en [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(min,max) incluye ambos extremos y es aproximadamente uniforme', () => {
    const r = createRng(123);
    const counts = new Array(6).fill(0);
    for (let i = 0; i < 60_000; i++) counts[r.int(1, 6) - 1]++;
    for (const c of counts) expect(c).toBeGreaterThan(9_000);
  });

  it('hashString es estable y distingue entradas', () => {
    expect(hashString('cell_1_2|slot_9')).toBe(hashString('cell_1_2|slot_9'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('chance(p) respeta la probabilidad', () => {
    const r = createRng(5);
    let hits = 0;
    for (let i = 0; i < 100_000; i++) if (r.chance(0.25)) hits++;
    expect(hits / 100_000).toBeCloseTo(0.25, 1);
  });
});
```

- [x] **Paso 5:** `npm run test:shared` → FALLA (`rng.js` no existe).
- [x] **Paso 6: implementación** — `shared/engine/rng.ts`

```ts
/** PRNG determinista (mulberry32). Nunca usar Math.random en shared/: el azar se siembra. */
export interface Rng {
  /** Número en [0, 1). */
  next(): number;
  /** Entero en [min, max], ambos incluidos. */
  int(min: number, max: number): number;
  /** true con probabilidad p (0..1). */
  chance(p: number): boolean;
  /** Elemento al azar de una lista no vacía. */
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}

/** Hash FNV-1a de 32 bits: convierte una cadena en semilla. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
```

- [x] **Paso 7:** `npm run test:shared` → verde.
- [x] **Paso 8: alias e inclusión en la app** — `tsconfig.json` → `compilerOptions` añadir
      `"baseUrl": "."` y `"paths": { "@shared/*": ["shared/*"] }`.
      `tsconfig.app.json` → `"include": ["src/**/*.d.ts", "shared/**/*.ts"]` y añadir
      `"exclude": ["shared/**/*.spec.ts"]`. (Sin esto Angular da _"is missing from the TypeScript compilation"_.)
- [x] **Paso 9: prueba de integración del alias** — en `src/app/core/utils/pokemon-defaults.ts` NO tocar
      nada; en su lugar crear `src/app/core/utils/shared-alias.spec.ts`:

```ts
import { createRng } from '@shared/engine/rng';

describe('alias @shared', () => {
  it('la app puede importar código de shared/', () => {
    expect(createRng(1).next()).toBeTypeOf('number');
  });
});
```

Añadir `"shared/**/*.ts"` al `include` de `tsconfig.spec.json`.

- [x] **Paso 10: three** — `npm install three@0.186.1 && npm install -D @types/three@0.186.0`.
      Anotar en DECISIONES D-003: "three fijado en 0.186.1 (F0-03)".
- [x] **Paso 11: verificar todo** — `npm run test:all`, `npm run lint`, `npm run build`. Las tres en verde.
- [x] **Paso 12: commit** — `F0-03: shared/ con RNG determinista, vitest de shared y alias @shared`.

---

## Task F0-04 · Sistema de diseño base

**Archivos:** crear `src/theme/tokens.scss`, `src/app/shared/ui/game-button.component.ts`,
`glass-panel.component.ts`, `stat-bar.component.ts`, `hp-bar.component.ts` (+ specs),
`src/app/features/dev-ui/dev-ui.page.ts`; modificar `src/global.scss`, `src/app/app.routes.ts`,
`src/app/shared/components/type-chips/type-chips.component.ts`, `src/app/core/constants/pokemon-types.ts`.

**Lee antes `docs/plan/DISENO.md` entero.** Si tienes la skill `impeccable`, úsala para el escaparate;
si no, DISENO.md manda.

- [x] **Paso 1: tokens** — `src/theme/tokens.scss` con el bloque `:root` de DISENO.md §2 tal cual, más:

```scss
:root {
  --surface: rgba(251, 247, 238, 0.78);
  --surface-text: #0f1a2b;
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface: rgba(15, 26, 43, 0.72);
    --surface-text: #fbf7ee;
  }
}

/* Red de seguridad de movimiento: SIEMPRE el último bloque del archivo. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

- [x] **Paso 2: fuente** — `npm install @fontsource/fredoka@5.3.0`. En `src/global.scss`, tras los
      imports de Ionic: `@import '@fontsource/fredoka/500.css'; @import '@fontsource/fredoka/700.css';
@import './theme/tokens.scss';` y `--font-display: 'Fredoka', system-ui, sans-serif;` en `:root`.
      Anotar en DECISIONES: "Fuente display: Fredoka (OFL, @fontsource 5.3.0)".
- [x] **Paso 3: colores de tipo en un solo sitio** — `pokemon-types.ts` ya tiene colores (IS-11). Hacer
      que `color` lea el token: cambiar cada `color: '#…'` por `color: 'var(--t-<tipo>)'` y comprobar que los
      chips de IS-11 se siguen viendo (Pokédex). Así no hay dos paletas.
- [x] **Paso 4: test de GameButton (falla primero)** — `src/app/shared/ui/game-button.component.spec.ts`

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameButtonComponent } from './game-button.component';

describe('GameButtonComponent', () => {
  let fixture: ComponentFixture<GameButtonComponent>;
  beforeEach(() => {
    fixture = TestBed.createComponent(GameButtonComponent);
    fixture.componentRef.setInput('label', 'Lanzar');
    fixture.detectChanges();
  });

  it('muestra la etiqueta', () => {
    expect(fixture.nativeElement.textContent).toContain('Lanzar');
  });

  it('emite pressed al hacer clic y no si está deshabilitado', () => {
    const spy = vi.fn();
    fixture.componentInstance.pressed.subscribe(spy);
    fixture.nativeElement.querySelector('button').click();
    expect(spy).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Paso 5: GameButton** — `src/app/shared/ui/game-button.component.ts`

```ts
import { Component, input, output } from '@angular/core';

/** Botón del juego: respuesta en pointer-down (scale 0.97), variantes y tamaño táctil ≥ 44 px. */
@Component({
  selector: 'app-game-button',
  template: `
    <button
      type="button"
      [class]="'gb gb--' + variant()"
      [disabled]="disabled()"
      (click)="pressed.emit()"
      [attr.aria-label]="ariaLabel() || null"
    >
      <ng-content select="[slot=icon]" />
      <span>{{ label() }}</span>
    </button>
  `,
  styles: `
    .gb {
      min-height: 48px;
      padding: 0 var(--s-6);
      border: 0;
      border-radius: var(--r-chip);
      font: 600 1rem/1 var(--font-display);
      display: inline-flex;
      align-items: center;
      gap: var(--s-2);
      transition:
        transform var(--dur-press) var(--ease-out),
        opacity var(--dur-small) var(--ease-out);
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .gb:active:not(:disabled) {
      transform: scale(0.97);
    }
    .gb:disabled {
      opacity: 0.45;
    }
    .gb--primary {
      background: var(--accent);
      color: var(--accent-ink);
      box-shadow: 0 6px 18px rgb(255 77 77 / 0.35);
    }
    .gb--glass {
      background: var(--surface);
      color: var(--surface-text);
      backdrop-filter: blur(20px) saturate(160%);
    }
    .gb--gold {
      background: var(--gold);
      color: var(--ink);
    }
  `,
})
export class GameButtonComponent {
  readonly label = input.required<string>();
  readonly variant = input<'primary' | 'glass' | 'gold'>('primary');
  readonly disabled = input(false);
  readonly ariaLabel = input<string>('');
  readonly pressed = output<void>();
}
```

(El háptico y el clic de sonido se enchufan en F0-05 Paso 9, cuando existan los servicios.)

- [x] **Paso 6: GlassPanel, StatBar, HpBar** — mismo patrón (test primero, luego componente):
  - `app-glass-panel`: `<ng-content/>` con fondo `var(--surface)`, `backdrop-filter: blur(20px) saturate(160%)`,
    borde superior `1px solid rgb(255 255 255 / 0.35)`, radio `var(--r-card)`, sombra según `size` (`'sm'|'lg'`).
    Test: proyecta contenido y aplica la clase de tamaño.
  - `app-stat-bar`: inputs `label: string`, `value: number`, `max = 255`; barra con `transform: scaleX(value/max)`
    (nunca animar `width`), número con `tabular-nums`. Test: `scaleX` correcto para 128/255 y tope en 1.
  - `app-hp-bar`: inputs `current`, `max`; color verde >50 %, amarillo 20–50 %, rojo <20 %
    (`--success`/`--gold`/`--danger`); transición de `transform` 400 ms `--ease-out`. Test: color por umbral.
- [x] **Paso 7: escaparate `/dev/ui`** — `src/app/features/dev-ui/dev-ui.page.ts` (standalone) que muestra
      los 3 botones, un GlassPanel con StatBars de Pikachu (35/55/40/50/50/90), HpBars al 80/35/10 % y los
      chips de los 18 tipos. Ruta en `app.routes.ts`: `{ path: 'dev/ui', loadComponent: () => import(...) }`
      ANTES del `'**'`.
- [x] **Paso 8: verificar** — `npm run test:all`, `npm run lint`, `npm run build`; `npx ionic serve`, abrir
      `http://localhost:8100/dev/ui` en vista móvil 390×844 (DevTools o skill `webapp-testing`), captura a
      `docs/evidencias/F0-04_01_dev-ui.png`. Revisar con la checklist de DISENO §4 (sin `transition: all`, sin `scale(0)`).
- [x] **Paso 9: commit** — `F0-04: tokens, fuente y componentes base del juego + /dev/ui`.

---

## Task F0-05 · Servicios base de la app

**Archivos:** crear `src/app/services/game/settings.service.ts`, `haptics.service.ts`,
`audio.service.ts`, `dataset.service.ts` (+ un `.spec.ts` por cada uno); modificar
`src/app/shared/ui/game-button.component.ts`, `src/app/features/dev-ui/dev-ui.page.ts`.

Instalar: `npm install idb@8.0.4 && npm install -D fake-indexeddb@6.2.5`.

- [x] **Paso 1: SettingsService (test → código)**

```ts
// settings.service.ts
import { Injectable, effect, signal } from '@angular/core';

export interface GameSettings {
  musicVolume: number; // 0..1
  sfxVolume: number;
  criesVolume: number;
  reduceEffects: boolean;
  joystickMode: boolean;
  haptics: boolean;
}

const KEY = 'pokecrud.settings.v1';
const DEFAULTS: GameSettings = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  criesVolume: 0.9,
  reduceEffects: false,
  joystickMode: false,
  haptics: true,
};

/** Preferencias del jugador (no sensibles) persistidas en localStorage. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<GameSettings>(this.load());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.settings()));
      } catch (err) {
        console.warn('[settings] no se pudo guardar', err);
      }
    });
  }

  update(patch: Partial<GameSettings>): void {
    this.settings.update((s) => ({ ...s, ...patch }));
  }

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GameSettings>) } : DEFAULTS;
    } catch {
      return DEFAULTS; // localStorage bloqueado o JSON corrupto: se arranca con valores por defecto
    }
  }
}
```

Test: valores por defecto; `update` persiste (`TestBed.flushEffects()` y leer `localStorage`);
JSON corrupto en `localStorage` → defaults.

- [x] **Paso 2: HapticsService**

```ts
// haptics.service.ts
import { Injectable, inject } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SettingsService } from './settings.service';

/** Vibraciones del juego. En web Capacitor las ignora sin error; aun así se capturan. */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  private readonly settings = inject(SettingsService);

  tap(): void {
    this.run(() => Haptics.impact({ style: ImpactStyle.Light }));
  }
  throw(): void {
    this.run(() => Haptics.impact({ style: ImpactStyle.Medium }));
  }
  shake(): void {
    this.run(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  }
  success(): void {
    this.run(() => Haptics.notification({ type: NotificationType.Success }));
  }

  private run(fn: () => Promise<void>): void {
    if (!this.settings.settings().haptics) return;
    fn().catch((err: unknown) => console.warn('[haptics]', err));
  }
}
```

Test: con `haptics: false` no llama a `Haptics.impact` (`vi.mock('@capacitor/haptics', …)`).

- [x] **Paso 3: AudioService** — buses `music | sfx | cries` con `GainNode` ligado a los volúmenes de
      `SettingsService` (un `effect`), `unlock()` que hace `ctx.resume()` en el primer `pointerdown` del
      documento, `playSfx(name)` con buffers pre-decodificados desde `assets/audio/sfx/<name>.ogg`
      (si el archivo no existe: `console.warn` una vez y seguir; F2-08 traerá los sonidos), y
      `playCry(speciesId)` que descarga
      `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/{id}.ogg` con
      `AbortSignal.timeout(6000)`, decodifica y guarda en una caché LRU de 30 (`Map` + reinserción al usar).
      El `AudioContext` se crea perezosamente (en tests no existe: inyectar una factoría con un token
      `AUDIO_CONTEXT_FACTORY` para poder pasar un doble). Test: LRU expulsa el más antiguo al pasar de 30;
      un fallo de red en `playCry` no lanza (se registra y resuelve `false`).

- [x] **Paso 4: DatasetService**

```ts
// dataset.service.ts (esqueleto obligatorio; completar los métodos marcados)
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { openDB } from 'idb';
import { firstValueFrom } from 'rxjs';
import type { DatasetMeta, Move, Species, TypeInfo } from '@shared/data/dataset.types';

type Status = 'idle' | 'loading' | 'ready' | 'error';
interface Bundle {
  meta: DatasetMeta;
  pokedex: Species[];
  moves: Move[];
  types: TypeInfo[];
}

const DB = 'pokecrud-dataset';
const STORE = 'bundles';

/** Carga el dataset una vez (assets → IndexedDB) y lo expone como Maps con signals. */
@Injectable({ providedIn: 'root' })
export class DatasetService {
  private readonly http = inject(HttpClient);
  readonly status = signal<Status>('idle');
  readonly error = signal<string | null>(null);
  private readonly bundle = signal<Bundle | null>(null);

  readonly species = computed(() => new Map((this.bundle()?.pokedex ?? []).map((s) => [s.id, s])));
  readonly moves = computed(() => new Map((this.bundle()?.moves ?? []).map((m) => [m.id, m])));
  readonly types = computed(() => this.bundle()?.types ?? []);

  /** Idempotente: llamarla varias veces no repite descargas. */
  async load(): Promise<void> {
    if (this.status() === 'loading' || this.status() === 'ready') return;
    this.status.set('loading');
    try {
      const meta = await firstValueFrom(this.http.get<DatasetMeta>('assets/data/meta.json'));
      const cached = await this.readCache(meta.version);
      this.bundle.set(cached ?? (await this.download(meta)));
      this.status.set('ready');
    } catch (err) {
      console.error('[dataset] fallo al cargar', err);
      this.error.set('No se pudieron cargar los datos de los Pokémon.');
      this.status.set('error');
    }
  }

  private async download(meta: DatasetMeta): Promise<Bundle> {
    const [pokedex, moves, types] = await Promise.all([
      firstValueFrom(this.http.get<Species[]>('assets/data/pokedex.json')),
      firstValueFrom(this.http.get<Move[]>('assets/data/moves.json')),
      firstValueFrom(this.http.get<TypeInfo[]>('assets/data/types.json')),
    ]);
    const bundle = { meta, pokedex, moves, types };
    await this.writeCache(bundle);
    return bundle;
  }

  private async db() {
    return openDB(DB, 1, { upgrade: (db) => db.createObjectStore(STORE) });
  }

  private async readCache(version: string): Promise<Bundle | null> {
    try {
      const b = (await (await this.db()).get(STORE, 'current')) as Bundle | undefined;
      return b && b.meta.version === version ? b : null;
    } catch (err) {
      console.warn('[dataset] IndexedDB no disponible, se descarga de assets', err);
      return null;
    }
  }

  private async writeCache(bundle: Bundle): Promise<void> {
    try {
      await (await this.db()).put(STORE, bundle, 'current');
    } catch (err) {
      console.warn('[dataset] no se pudo cachear en IndexedDB', err);
    }
  }
}
```

Test (con `import 'fake-indexeddb/auto'` al inicio del spec y `HttpTestingController`):

1. primera carga pide los 4 JSON y queda `ready`; 2) segunda instancia con la misma `version` solo pide
   `meta.json` (lee de IndexedDB); 3) `version` distinta → vuelve a descargar; 4) error HTTP → `status='error'`;
2. dos `load()` simultáneos → una sola descarga.

- [ ] **Paso 5: cargar al arrancar** — en `AppComponent` llamar `inject(DatasetService).load()` en el constructor.
- [ ] **Paso 6: GameButton con feedback** — inyectar `HapticsService` y `AudioService`; en `(pointerdown)`
      llamar `haptics.tap()` y `audio.playSfx('tap')` (mismo frame que el `:active`). Actualizar su spec con dobles.
- [ ] **Paso 7: `/dev/ui`** — botón "Oír a Pikachu" → `audio.playCry(25)`; texto con
      `dataset.status()` y `dataset.species().size`.
- [ ] **Paso 8: verificar** — `npm run test:all`, lint, build; en `/dev/ui` se oye el grito al pulsar y
      muestra `ready · 1025`. Recargar: la segunda vez no aparecen peticiones a `pokedex.json` en la pestaña Red.
- [ ] **Paso 9: commit** — `F0-05: servicios de dataset, audio, hápticos y ajustes`.

---

## Task F0-06 · Servidor NestJS esqueleto

**Requisito:** `server/.env` creado según `docs/plan/SECRETOS.md` (pídeselo a Alex si no lo tienes).
Lee la skill `estandares-produccion` (modo Construir, "Día 1") y `nestjs-patterns` antes de empezar.

- [ ] **Paso 1: generar el proyecto** (desde la raíz del repo; `server/` ya existe con `.env.example`):

```bash
npx -y @nestjs/cli@12.0.8 new server --package-manager npm --skip-git --strict --directory server-tmp
```

Mover el contenido de `server-tmp/` a `server/` (sin pisar `server/.env` ni `server/.env.example`) y borrar
`server-tmp/`. Comprobar: `server/package.json` tiene `"type": "module"`; `cd server && npm test` → verde.
`server/.gitignore` del scaffold: comprobar que ignora `node_modules`, `dist` y `.env`.

- [ ] **Paso 2: dependencias**

```bash
cd server
npm install @nestjs/config@12.0.1 @nestjs/throttler@6.7.1 helmet@8.3.0 class-validator@0.15.1 \
  class-transformer@0.5.1 nestjs-pino@5.3.1 pino-http@11 pino@10 @prisma/client@7.10.0 \
  @prisma/adapter-pg@7.10.0 dotenv
npm install -D prisma@7.10.0 pino-pretty
```

- [ ] **Paso 3: Prisma 7** — `server/prisma.config.ts`

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL'), directUrl: env('DIRECT_URL') },
});
```

`server/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Player {
  id           String         @id @default(uuid()) @db.Uuid
  email        String         @unique
  passwordHash String
  nickname     String         @unique
  level        Int            @default(1)
  xp           Int            @default(0)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  playerId  String    @db.Uuid
  player    Player    @relation(fields: [playerId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  familyId  String    @db.Uuid
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([playerId])
  @@index([familyId])
}
```

Añadir `src/generated/` a `server/.gitignore`. Scripts en `server/package.json`:
`"prisma:generate": "prisma generate"`, `"db:migrate": "prisma migrate dev"`,
`"db:deploy": "prisma migrate deploy"`, y `"postinstall": "prisma generate"`.

- [ ] **Paso 4: migración inicial**: `npx prisma migrate dev --name init` → crea
      `prisma/migrations/<fecha>_init/migration.sql` y la aplica en Supabase. Si falla por la _shadow database_
      (permisos), usar `npx prisma migrate dev --name init --create-only` y luego `npx prisma migrate deploy`.
      Comprobar con `npx prisma migrate status` → "Database schema is up to date". Pegar la salida en la bitácora.

- [ ] **Paso 5: PrismaService** — `server/src/prisma/prisma.service.ts` + `prisma.module.ts` (`@Global()`):

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL no está definida (ver docs/plan/SECRETOS.md)');
    // Pool pequeño: el session pooler gratis de Supabase tiene pocas conexiones.
    super({
      adapter: new PrismaPg({ connectionString: url, max: 5, connectionTimeoutMillis: 5000 }),
    });
  }
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

- [ ] **Paso 6: arranque endurecido** — `server/src/main.ts`

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: (
      process.env['CORS_ORIGINS'] ?? 'http://localhost:8100,http://localhost:4200,https://localhost'
    )
      .split(',')
      .map((s) => s.trim()),
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
  await app.listen(Number(process.env['PORT'] ?? 3000), '0.0.0.0');
}
await bootstrap();
```

`AppModule` importa: `ConfigModule.forRoot({ isGlobal: true })`, `LoggerModule.forRoot({ pinoHttp: {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', redact: ['req.headers.authorization',
  'req.headers.cookie', 'req.body.password'], genReqId: (req) => req.headers['x-request-id'] ?? randomUUID() } })`,
`ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])` con `{ provide: APP_GUARD, useClass: ThrottlerGuard }`,
`PrismaModule`, `HealthModule`.
Añadir a `server/.env.example`: `PORT=3000`, `CORS_ORIGINS=http://localhost:8100,http://localhost:4200,https://localhost`.

- [ ] **Paso 7: health (test e2e primero)** — `server/test/health.e2e-spec.ts`: `GET /health/live` → 200
      `{status:'ok'}`; `GET /health/ready` → 200 `{status:'ok', db:'ok'}` con BD real. Implementación:
      `HealthController` con `live()` (no toca BD) y `ready()` (`await prisma.$queryRaw\`SELECT 1\``con`Promise.race`de 3 s; si falla →`503 {status:'error', db:'down'}`). Excluir `/health/*`del throttler
con`@SkipThrottle()`.
- [ ] **Paso 8: verificar** — `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`,
      `npm run start:dev` y `curl http://localhost:3000/health/ready`. Pegar salidas.
- [ ] **Paso 9: despliegue (necesita a Alex: crea la cuenta y pega las variables él)** — propuesta Render
      (gratis): Web Service, _Root Directory_ `server`, _Build_ `npm ci && npm run build`,
      _Start_ `npx prisma migrate deploy && npm run start:prod`, variables `DATABASE_URL`, `DIRECT_URL`,
      `CORS_ORIGINS`, `NODE_ENV=production`. Comprobar `https://<servicio>.onrender.com/health/ready`. Anotar la URL
      en ESTADO.md (no es secreto) y en `src/environments/environment.prod.ts` (`apiUrl`). Recordar: Render gratis
      se duerme a los 15 min; el primer request tarda ~1 min.
- [ ] **Paso 10: commit** — `F0-06: servidor NestJS 12 con Prisma 7, health y arranque endurecido`.

---

## Task F0-07 · Autenticación completa

**Lee antes:** `.claude/skills/estandares-produccion/references/autenticacion.md` y
`api-endurecimiento.md`. Decisión D-006 (tokens en la app nativa).

**Servidor** (`server/src/auth/`): `npm install @nestjs/jwt@12.0.2 argon2@0.45.1`.
Variables nuevas en `.env` y `.env.example`: `JWT_SECRET` (≥ 32 bytes aleatorios:
`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`), `JWT_TTL=900`,
`REFRESH_TTL_DAYS=30`. Alex reparte el `JWT_SECRET` por privado (SECRETOS.md).

Contrato:

| Método y ruta         | Body                                                        | Respuesta                                                    | Límite    |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ | --------- |
| `POST /auth/register` | `{ email, password (8-72), nickname (3-20, [a-zA-Z0-9_]) }` | `201 { accessToken, refreshToken, player }`                  | 5/min/IP  |
| `POST /auth/login`    | `{ email, password }`                                       | `200 { accessToken, refreshToken, player }` · `401` genérico | 5/min/IP  |
| `POST /auth/refresh`  | `{ refreshToken }`                                          | `200 { accessToken, refreshToken }` (rota) · `401`           | 20/min/IP |
| `POST /auth/logout`   | `{ refreshToken }`                                          | `204` (idempotente)                                          | 20/min/IP |
| `GET /auth/me`        | — (Bearer)                                                  | `200 { player }`                                             | global    |

`player` = `{ id, email, nickname, level, xp }` (nunca `passwordHash`).

- [ ] **Paso 1: tests e2e primero** — `server/test/auth.e2e-spec.ts` con BD real y emails únicos por test
      (`test+${randomUUID()}@pokecrud.test`), limpiando en `afterAll` los players con dominio `@pokecrud.test`:
  1. registro → 201, `passwordHash` no aparece en la respuesta;
  2. email repetido → 409; nickname repetido → 409;
  3. login correcto → 200; contraseña mala → 401 con el mismo mensaje que email inexistente;
  4. `/auth/me` con access → 200; sin token → 401; token manipulado → 401;
  5. refresh → 200 con tokens nuevos; **reutilizar el refresh viejo → 401 y además revoca la familia**
     (el refresh nuevo también deja de valer);
  6. logout dos veces → 204 las dos;
  7. dos `refresh` simultáneos con el mismo token → exactamente uno 200 y otro 401.
- [ ] **Paso 2: `AuthService`** — reglas que el código debe cumplir (cada una con su línea, no intención):
  - `argon2.hash(password, { type: argon2.argon2id })`; en login con email inexistente, igualmente
    ejecutar un `argon2.verify` contra un hash fijo para no revelar por tiempo qué emails existen.
  - email normalizado (`trim().toLowerCase()`); unicidad por `@unique` en BD → capturar `P2002` → 409.
  - refresh token = `randomBytes(32).toString('base64url')`; en BD solo `sha256` en hex (`tokenHash`).
  - **Rotación atómica:** `updateMany({ where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
data: { revokedAt: now } })`; si `count === 0` → buscar por `tokenHash`: si existe (ya revocado) →
    `updateMany({ where: { familyId }, data: { revokedAt: now } })` (reutilización = robo) y 401; si no
    existe → 401. Si `count === 1` → crear el nuevo token con el mismo `familyId`. Todo en `$transaction`.
  - access JWT: `{ sub: player.id }`, `expiresIn: JWT_TTL`, algoritmo HS256 explícito.
  - logs: `auth.login.ok|fail`, `auth.refresh.reuse` con `playerId`/`familyId`, nunca tokens ni emails completos.
- [ ] **Paso 3:** DTOs con `class-validator`, `JwtAuthGuard` (global con decorador `@Public()` para
      `/auth/*` y `/health/*`), `@Throttle({ default: { limit: 5, ttl: 60_000 } })` en register/login.
- [ ] **Paso 4:** `npm test && npm run test:e2e` verdes. Commit `F0-07a: auth en servidor`.

**App** (`src/app/core/auth/`): `npm install @aparajita/capacitor-secure-storage@8.0.1`.

- [ ] **Paso 5: `TokenStore`** — interfaz `get/set/clear` del refresh token con dos implementaciones:
      nativa (`SecureStorage` del plugin, Keystore de Android) y web (`sessionStorage`), elegida con
      `Capacitor.isNativePlatform()`. El access token vive solo en memoria (signal). Test de la web.
- [ ] **Paso 6: `AuthService` (app)** — signals `player`, `isLoggedIn`; `register/login/logout/restore()`;
      `restore()` al arrancar intenta un refresh con el token guardado. Un único refresh en vuelo a la vez
      (si llegan 3 peticiones con 401, se comparte la misma promesa de refresh).
- [ ] **Paso 7: interceptor funcional** `authInterceptor`: añade `Authorization: Bearer` a peticiones a
      `environment.apiUrl` (nunca a PokéAPI/Google); ante 401 refresca una vez y repite; si el refresh falla →
      `logout()` y navegar a `/login`. Registrar con `provideHttpClient(withInterceptors([authInterceptor]))` en `main.ts`.
- [ ] **Paso 8: `authGuard`** y rutas: `/login`, `/registro` públicas; el resto protegidas.
      **Excepción temporal:** las rutas de IS-11 (`/tabs/pokedex`, `/pokemon/*`) quedan públicas hasta F0-08 para
      no romper la entrega evaluada; anotarlo en el PR.
- [ ] **Paso 9: pantallas** `features/auth/login.page.ts` y `register.page.ts` con el sistema de diseño
      (GlassPanel + GameButton, fondo ilustrado, errores en línea bajo cada campo, botón con estado de carga,
      mensajes en español: "Correo o contraseña incorrectos", "Ese apodo ya está en uso").
- [ ] **Paso 10: verificar** — `npm run test:all`, lint, build; con el servidor local: registrarse, cerrar
      la app, abrirla y seguir logueado; manipular el access en memoria → se refresca solo. Capturas en
      `docs/evidencias/F0-07_*.png`. Commit `F0-07b: sesión en la app`.

---

## Task F0-08 · CRUD del curso migrado a NestJS

**Objetivo:** que la app de IS-11 y la colección de Postman funcionen contra NestJS **sin cambiar el
contrato** de JSON Server que usan: `GET/POST/PUT/PATCH/DELETE` en `/pokemon`, `/teams`, `/favorites`,
`/customPokemon`, `GET /pokemon?_sort=id&_order=asc` y `GET /pokemon?name_like=mew`.

- [ ] **Paso 1: modelos Prisma** (migración `crud_curso`):

```prisma
model InventoryPokemon {          // `/pokemon` de IS-11: catálogo/inventario compartido
  id             Int      @id     // nº de la Pokédex (como en JSON Server)
  name           String
  types          String[]
  abilities      String[]
  imageUrl       String
  height         Float
  weight         Float
  baseExperience Int
  stats          Json
  price          Int
  stock          Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([name])
}

model Team {
  id          Int      @id @default(autoincrement())
  playerId    String   @db.Uuid
  name        String
  description String   @default("")
  pokemonIds  Int[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([playerId, id])
}

model Favorite {
  id          Int      @id @default(autoincrement())
  playerId    String   @db.Uuid
  pokemonId   Int
  pokemonName String
  note        String   @default("")
  rating      Int
  createdAt   DateTime @default(now())
  @@unique([playerId, pokemonId])
  @@index([playerId, id])
}

model CustomPokemon {
  id          Int      @id @default(autoincrement())
  playerId    String   @db.Uuid
  name        String
  types       String[]
  stats       Json
  imageUrl    String   @default("")
  description String   @default("")
  createdAt   DateTime @default(now())
  @@index([playerId, id])
}
```

Añadir `CHECK` en la migración SQL generada (editar antes de `migrate deploy`):
`ALTER TABLE "InventoryPokemon" ADD CONSTRAINT stock_nonneg CHECK (stock >= 0);`
`ALTER TABLE "Favorite" ADD CONSTRAINT rating_range CHECK (rating BETWEEN 1 AND 5);`
`ALTER TABLE "Team" ADD CONSTRAINT max_six CHECK (cardinality("pokemonIds") <= 6);`

- [ ] **Paso 2: semilla** — `server/prisma/seed.ts` lee `../backend/db.seed.json` y hace `upsert` por id
      de los 151 de `pokemon` (idempotente: se puede correr N veces). Los `teams/favorites/customPokemon` de
      ejemplo se crean para un jugador demo `demo@pokecrud.test` (también con upsert). Script `"db:seed"`.
- [ ] **Paso 3: reglas de acceso** (tests e2e primero, uno por regla):
  - `/pokemon`: lectura pública; escritura requiere sesión (cualquier jugador; es el inventario de la clase).
  - `/teams`, `/favorites`, `/customPokemon`: requieren sesión y **todas las consultas filtran por
    `playerId` del token**. Pedir/editar/borrar el id de otro jugador → **404** (no 403: no revelar que existe).
  - Validación con DTOs equivalentes a los de IS-11 (`pokemonIds` máx. 6, `rating` 1-5, `price ≥ 0`, `stock ≥ 0`).
- [ ] **Paso 4: compatibilidad de consultas** — implementar SOLO lo que se usa: `_sort` (`id|name|price|stock`)
      y `_order` (`asc|desc`), `name_like` (→ `contains`, `mode: 'insensitive'`), y paginación `_page`/`_limit`.
      Límite por defecto: `/pokemon` hasta 1025 (tabla acotada por el nº de especies, la app de IS-11 pide
      todo); el resto 50, máximo 100. `PUT` reemplaza, `PATCH` mezcla; `POST /pokemon` con id repetido → 409.
- [ ] **Paso 5: la app** — `PokemonService` de IS-11 no cambia de URL (`environment.apiUrl`); comprobar que
      la Pokédex funciona igual contra Nest (`npm run start:dev` en `server/` en lugar de `npm run api`).
      Quitar la excepción temporal de rutas públicas de F0-07 Paso 8 SOLO para equipos/favoritos/personalizados.
- [ ] **Paso 6: Postman** — actualizar `backend/postman/PokeCRUD.postman_collection.json`: variable
      `baseUrl` → `http://localhost:3000`, petición previa de login que guarda `accessToken` en una variable de
      colección y `Authorization: Bearer {{accessToken}}` en las carpetas protegidas. Ejecutar el Runner entero:
      captura `docs/evidencias/F0-08_01_postman-runner-nest.png` con todo en verde.
- [ ] **Paso 7: archivar JSON Server** — mover `backend/db.json`, `db.seed.json` a `backend/legacy/`,
      quitar `npm run api`/`api:reset` del `package.json` raíz y actualizar el README ("Cómo correr").
      (`seed.ts` lee de `backend/legacy/db.seed.json` desde este paso.)
- [ ] **Paso 8: verificar** (todas las suites + Runner de Postman) y commit `F0-08: CRUD del curso en NestJS`.

---

## Task F0-09 · Pipeline del APK

**Requisitos:** Android Studio instalado (en el PC de Alex: sí, con `jbr` = JDK 21) y SDK en
`%LOCALAPPDATA%\Android\Sdk`. Un móvil Android con _Depuración USB_ activada.

- [ ] **Paso 1:** `npm install @capacitor/android@8.5.3 @capacitor/splash-screen@8.0.2` y
      `npx cap add android`. Commitear la carpeta `android/` (D-009) — revisar que su `.gitignore` excluye
      `build/`, `.gradle/`, `local.properties` y `*.keystore`.
- [ ] **Paso 2: permisos** — en `android/app/src/main/AndroidManifest.xml`, dentro de `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

- [ ] **Paso 3: tráfico al servidor local** — en desarrollo el APK habla con `http://<IP-del-PC>:3000`
      (no `localhost`). Crear `src/environments/environment.device.ts` (sin secretos, con `apiUrl` de la IP LAN)
      y una configuración `device` en `angular.json` que lo reemplace. Como es HTTP plano, añadir en
      `capacitor.config.ts` → `server: { cleartext: true }` **solo** cuando `process.env.CAP_DEV === '1'`.
- [ ] **Paso 4: script** — `scripts/apk.mjs`: ejecuta `ng build` (configuración indicada por argumento,
      por defecto `production`), `npx cap sync android` y `gradlew.bat assembleDebug` (o `./gradlew` fuera de
      Windows) con `JAVA_HOME` apuntando al `jbr` de Android Studio si no está definido; al final imprime la ruta
      y el tamaño del APK. `package.json`: `"apk": "node scripts/apk.mjs"`.
- [ ] **Paso 5: icono y splash provisionales** — `npx @capacitor/assets generate --android` desde
      `resources/icon.png` (1024×1024) y `resources/splash.png` (2732×2732): Poké Ball estilizada propia
      (no usar arte oficial). Ver skill `generar-imagen` o pedirlo al humano.
- [ ] **Paso 6: probar en el móvil** — `npm run apk`, `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`,
      abrir, navegar a `/dev/ui`, oír el grito y ver la vibración. Depurar en `chrome://inspect`.
      Foto o captura en `docs/evidencias/F0-09_01_apk-movil.jpg` y tamaño del APK en la bitácora.
- [ ] **Paso 7:** actualizar ARQUITECTURA §11 si algo cambió y commit `F0-09: pipeline del APK`.

---

## Autorrevisión del plan (hecha al escribirlo)

- **Cobertura:** F0-02…F0-09 del ROADMAP tienen su tarea; los criterios de aceptación del ROADMAP están en
  los pasos "verificar". Cambio respecto al ROADMAP: F0-03 usa `npm run test:all` (no `npm test`) para correr
  app + shared, porque `ng test` (builder unit-test de Angular) solo recoge specs de `src/`.
- **Pendiente para F1 (no para F0):** cómo importa el servidor el código de `shared/` (Nest compila con
  `rootDir` propio). Propuesta a decidir en el plan de F1: paquete npm local `shared` con `tsc` a
  `shared/dist`, importado por `server/` como dependencia `file:../shared`.
- **Consistencia de nombres:** `DatasetService.load()`, `AudioService.playCry/playSfx/unlock`,
  `HapticsService.tap/throw/shake/success`, `SettingsService.settings/update` se usan igual en F0-04 Paso 5,
  F0-05 Pasos 6-7 y en F1/F2.
