import { readFileSync } from 'node:fs';
import type { Species } from '../data/dataset.types.js';
import {
  CELL_DEG,
  MAX_LEVEL,
  MIN_LEVEL,
  type SpawnSpecies,
  buildSpawnTable,
  cellBounds,
  cellIdFor,
  cellsWithin,
  isNightAt,
  parseCellId,
  parseSpawnId,
  slotEndsAt,
  slotFor,
  spawnsForCell,
  speciesWeight,
} from './spawns.js';

const sp = (id: number, over: Partial<SpawnSpecies> = {}): SpawnSpecies => ({
  id,
  types: ['normal'],
  captureRate: 190,
  baseExp: 60,
  genderRate: 4,
  isLegendary: false,
  isMythical: false,
  isBaby: false,
  ...over,
});

const FAKE: SpawnSpecies[] = [
  sp(1, { types: ['grass', 'poison'] }),
  sp(4, { types: ['fire'] }),
  sp(7, { types: ['water'] }),
  sp(81, { types: ['electric', 'steel'], genderRate: -1 }),
  sp(92, { types: ['ghost', 'poison'] }),
  sp(150, { types: ['psychic'], isLegendary: true, captureRate: 3 }),
];

/** Neiva, Parque Santander. */
const NEIVA = { lat: 2.9273, lng: -75.2819 };
/** Simulaciones de miles de celdas: en un PC lento pasan de los 5 s por defecto (F0-15). */
const SIMULATION_TIMEOUT_MS = 30_000;

describe('celdas y franjas', () => {
  it('cellIdFor con coordenadas negativas usa floor (no trunc)', () => {
    expect(cellIdFor(NEIVA.lat, NEIVA.lng)).toBe('4181_-107546');
    expect(parseCellId('4181_-107546')).toEqual({ y: 4181, x: -107546 });
    expect(parseCellId('4181-107546')).toBeNull();
  });

  it('el punto cae dentro de los límites de su celda', () => {
    const b = cellBounds(cellIdFor(NEIVA.lat, NEIVA.lng));
    expect(NEIVA.lat).toBeGreaterThanOrEqual(b.south);
    expect(NEIVA.lat).toBeLessThan(b.north);
    expect(NEIVA.lng).toBeGreaterThanOrEqual(b.west);
    expect(NEIVA.lng).toBeLessThan(b.east);
    expect(b.north - b.south).toBeCloseTo(CELL_DEG, 10);
  });

  it('franjas de 10 minutos', () => {
    const t = Date.UTC(2026, 9, 11, 20, 9, 59, 999);
    expect(slotFor(t)).toBe(slotFor(Date.UTC(2026, 9, 11, 20, 0)));
    expect(slotFor(t + 1)).toBe(slotFor(t) + 1);
    expect(slotEndsAt(slotFor(t))).toBe(t + 1);
  });

  it('cellsWithin: radio 0 → solo la propia; 200 m → todas a ≤ 200 m y en número razonable', () => {
    expect(cellsWithin(NEIVA.lat, NEIVA.lng, 0)).toEqual([cellIdFor(NEIVA.lat, NEIVA.lng)]);
    const cells = cellsWithin(NEIVA.lat, NEIVA.lng, 200);
    expect(cells).toContain(cellIdFor(NEIVA.lat, NEIVA.lng));
    expect(new Set(cells).size).toBe(cells.length);
    // Círculo de 200 m ≈ 0,126 km²; celdas de ~78 m → del orden de 20-45 (las que lo tocan).
    expect(cells.length).toBeGreaterThan(15);
    expect(cells.length).toBeLessThan(50);
    // Un punto a 150 m al norte está en una celda incluida; uno a 400 m, no.
    expect(cells).toContain(cellIdFor(NEIVA.lat + 150 / 111_320, NEIVA.lng));
    expect(cells).not.toContain(cellIdFor(NEIVA.lat + 400 / 111_320, NEIVA.lng));
  });

  it('isNightAt usa la hora solar de la longitud', () => {
    expect(isNightAt(Date.UTC(2026, 9, 11, 12), 0)).toBe(false);
    // 03:00 UTC en Neiva (−75,28° ≈ −5 h) son ~22:00 solares.
    expect(isNightAt(Date.UTC(2026, 9, 11, 3), NEIVA.lng)).toBe(true);
    // 17:00 UTC en Neiva ≈ 12:00 solares.
    expect(isNightAt(Date.UTC(2026, 9, 11, 17), NEIVA.lng)).toBe(false);
  });
});

describe('tabla de especies', () => {
  it('legendarios y míticos no aparecen; los bebés pesan menos', () => {
    expect(speciesWeight(sp(150, { isLegendary: true }))).toBe(0);
    expect(speciesWeight(sp(151, { isMythical: true }))).toBe(0);
    expect(speciesWeight(sp(172, { isBaby: true }))).toBeCloseTo(speciesWeight(sp(172)) * 0.3);
    expect(buildSpawnTable(FAKE, 'clear', false).ids).not.toContain(150);
  });

  it('el clima sube los tipos que tocan y la noche los fantasma/siniestro/psíquico', () => {
    const share = (t: ReturnType<typeof buildSpawnTable>, id: number) => {
      const i = t.ids.indexOf(id);
      return (t.cumulative[i] - (i ? t.cumulative[i - 1] : 0)) / t.total;
    };
    expect(share(buildSpawnTable(FAKE, 'rain', false), 7)).toBeGreaterThan(
      share(buildSpawnTable(FAKE, 'clear', false), 7),
    );
    expect(share(buildSpawnTable(FAKE, 'cloudy', true), 92)).toBeGreaterThan(
      share(buildSpawnTable(FAKE, 'cloudy', false), 92),
    );
  });

  it('no depende del orden en que llegan las especies', () => {
    expect(buildSpawnTable([...FAKE].reverse(), 'fog', true)).toEqual(
      buildSpawnTable(FAKE, 'fog', true),
    );
  });
});

describe('spawnsForCell', () => {
  const table = buildSpawnTable(FAKE, 'clear', false);
  const cell = cellIdFor(NEIVA.lat, NEIVA.lng);

  it('misma entrada → mismos spawns; otra semilla → otros', () => {
    const a = spawnsForCell(cell, 1000, 42, table);
    expect(spawnsForCell(cell, 1000, 42, table)).toEqual(a);
    const differs = [1, 2, 3, 4, 5].some(
      (s) => JSON.stringify(spawnsForCell(cell, 1000, s, table)) !== JSON.stringify(a),
    );
    expect(differs).toBe(true);
  });

  it(
    'valores siempre dentro de rango y posiciones dentro de la celda',
    () => {
      const b = cellBounds(cell);
      let total = 0;
      // Se apuntan los fallos y hay un solo `expect` al final: ~30.000 `expect` sueltos tardaban 3-7 s (F0-15).
      const wrong: { seed: number; problem: string }[] = [];
      const check = (seed: number, ok: boolean, problem: string) => {
        if (!ok) wrong.push({ seed, problem });
      };
      for (let seed = 0; seed < 5000; seed++) {
        const spawns = spawnsForCell(cell, 7, seed, table);
        check(seed, spawns.length <= 3, `${spawns.length} spawns`);
        total += spawns.length;
        for (const s of spawns) {
          check(seed, s.id === `${cell}:7:${s.index}`, `id ${s.id}`);
          check(seed, s.lat >= b.south && s.lat < b.north, `lat ${s.lat}`);
          check(seed, s.lng >= b.west && s.lng < b.east, `lng ${s.lng}`);
          check(seed, s.level >= MIN_LEVEL && s.level <= MAX_LEVEL, `nivel ${s.level}`);
          for (const iv of Object.values(s.ivs)) check(seed, iv >= 0 && iv <= 31, `IV ${iv}`);
          check(seed, s.speciesId !== 150, 'Mewtwo');
          if (s.speciesId === 81) check(seed, s.gender === null, `Magnemite con sexo ${s.gender}`);
          else check(seed, s.gender === 'M' || s.gender === 'F', `sexo ${s.gender}`);
        }
      }
      expect(wrong).toEqual([]);
      // Media esperada 0,54 por celda.
      expect(total / 5000).toBeGreaterThan(0.48);
      expect(total / 5000).toBeLessThan(0.6);
    },
    SIMULATION_TIMEOUT_MS,
  );

  it('parseSpawnId deshace el id', () => {
    expect(parseSpawnId('4181_-107546:2931234:2')).toEqual({
      cellId: '4181_-107546',
      slot: 2931234,
      index: 2,
    });
    expect(parseSpawnId('4181_-107546:x:2')).toBeNull();
  });
});

describe('con el dataset real (1025 especies)', () => {
  const pokedex = JSON.parse(
    readFileSync(new URL('../../src/assets/data/pokedex.json', import.meta.url), 'utf8'),
  ) as Species[];

  it(
    'ningún legendario ni mítico en 20 000 celdas, y aparecen muchas especies distintas',
    () => {
      const banned = new Set(pokedex.filter((s) => s.isLegendary || s.isMythical).map((s) => s.id));
      expect(banned.size).toBeGreaterThan(50);
      const table = buildSpawnTable(pokedex, 'rain', true);
      const seen = new Set<number>();
      const legendary: number[] = [];
      for (let seed = 0; seed < 20_000; seed++) {
        for (const s of spawnsForCell('0_0', 1, seed, table)) {
          if (banned.has(s.speciesId)) legendary.push(s.speciesId);
          seen.add(s.speciesId);
        }
      }
      expect(legendary).toEqual([]);
      expect(seen.size).toBeGreaterThan(400);
    },
    SIMULATION_TIMEOUT_MS,
  );
});
