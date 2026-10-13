// Recupera la colección de lo capturado ANTES de F3-02a (D-052). Desde server/:
//   npm run db:backfill-collection
// 1) PC de las capturas con `cp` vacío (el código nuevo ya lo guarda al capturar).
// 2) Caramelos: CANDY_PER_CATCH por captura, por familia, SOLO a jugadores sin ninguna fila de Candy (así se puede
//    ejecutar dos veces sin dar caramelos de más).
// 3) Pokédex "capturado" de todo lo capturado (la migración ya lo hizo con lo de antes de aplicarla; esto cubre lo
//    capturado con el código viejo entre la migración y el despliegue). Nunca pisa filas existentes.
// Se ejecuta justo después de `prisma migrate deploy` en Supabase y ANTES de mezclar el PR de F3-02a; se puede repetir
// tras el despliegue (PC y Pokédex se completan; los caramelos solo se dan a quien no tenga ninguno).
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Species } from '../../shared/data/dataset.types.js';
import { type Stats, calcStats } from '../../shared/engine/battle/stats.js';
import { CANDY_PER_CATCH, familyOf } from '../../shared/engine/candy.js';
import { combatPower } from '../../shared/engine/combat-power.js';
import type { Nature } from '../../shared/engine/spawns.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const BATCH = 200;

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (!url)
    throw new Error(
      'DATABASE_URL no está definida (ver docs/plan/SECRETOS.md)',
    );
  const species = new Map(
    (
      JSON.parse(
        readFileSync(
          resolve(process.cwd(), '../src/assets/data/pokedex.json'),
          'utf8',
        ),
      ) as Species[]
    ).map((s) => [s.id, s]),
  );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, max: 1 }),
  });
  try {
    // 1) PC.
    let cpFilled = 0;
    for (;;) {
      const rows = await prisma.caughtPokemon.findMany({
        where: { cp: null },
        select: {
          id: true,
          speciesId: true,
          ivs: true,
          level: true,
          nature: true,
        },
        take: BATCH,
      });
      if (rows.length === 0) break;
      for (const r of rows) {
        const s = species.get(r.speciesId);
        if (!s) throw new Error(`Especie ${r.speciesId} no está en el dataset`);
        const cp = combatPower(
          calcStats(
            s.baseStats,
            r.ivs as unknown as Stats,
            r.level,
            r.nature as Nature,
          ),
        );
        await prisma.caughtPokemon.update({
          where: { id: r.id },
          data: { cp },
        });
        cpFilled++;
      }
    }

    // 2) Caramelos, solo a quien no tiene ninguno todavía.
    const withCandy = new Set(
      (
        await prisma.candy.findMany({
          distinct: ['playerId'],
          select: { playerId: true },
        })
      ).map((c) => c.playerId),
    );
    const caught = await prisma.caughtPokemon.groupBy({
      by: ['playerId', 'speciesId'],
      _count: { _all: true },
    });
    const perPlayer = new Map<string, Map<number, number>>();
    for (const g of caught) {
      if (withCandy.has(g.playerId)) continue;
      const s = species.get(g.speciesId);
      if (!s) throw new Error(`Especie ${g.speciesId} no está en el dataset`);
      const families = perPlayer.get(g.playerId) ?? new Map<number, number>();
      const familyId = familyOf(s);
      families.set(
        familyId,
        (families.get(familyId) ?? 0) + g._count._all * CANDY_PER_CATCH,
      );
      perPlayer.set(g.playerId, families);
    }
    let candyRows = 0;
    for (const [playerId, families] of perPlayer) {
      const { count } = await prisma.candy.createMany({
        data: [...families].map(([familyId, qty]) => ({
          playerId,
          familyId,
          qty,
        })),
        skipDuplicates: true,
      });
      candyRows += count;
    }

    // 3) Pokédex.
    const firsts = await prisma.caughtPokemon.groupBy({
      by: ['playerId', 'speciesId'],
      _min: { caughtAt: true },
    });
    const { count: pokedexRows } = await prisma.pokedexEntry.createMany({
      data: firsts.map((g) => ({
        playerId: g.playerId,
        speciesId: g.speciesId,
        caught: true,
        firstSeenAt: g._min.caughtAt ?? new Date(),
        firstCaughtAt: g._min.caughtAt,
      })),
      skipDuplicates: true,
    });

    console.log(
      `PC rellenado en ${cpFilled} capturas · caramelos: ${candyRows} filas para ${perPlayer.size} jugadores` +
        ` (${withCandy.size} ya tenían caramelos y no se tocaron) · Pokédex: ${pokedexRows} especies nuevas`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
