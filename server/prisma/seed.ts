// Semilla del CRUD del curso (F0-08): `npm run db:seed` desde server/.
// Idempotente y NO destructiva: se puede correr N veces y nunca pisa lo que la clase ya editó
// (precios, stock, equipos…). Solo crea lo que falta.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';

const SEED_FILE = new URL('../../backend/db.seed.json', import.meta.url);

/**
 * Dueño de los equipos/favoritos/personalizados de ejemplo. Dominio `.invalid` (RFC 2606) y NO
 * `@pokecrud.test`: los e2e borran todos los `@pokecrud.test` al terminar. Su contraseña es aleatoria
 * y se descarta: nadie puede entrar con esta cuenta (ver DECISIONES D-019).
 */
const DEMO = { email: 'demo@pokecrud.invalid', nickname: 'entrenador_demo' };

interface SeedPokemon {
  id: number;
  name: string;
  types: string[];
  abilities: string[];
  imageUrl: string;
  height: number;
  weight: number;
  baseExperience: number;
  stats: Record<string, number>;
  price: number;
  stock: number;
  createdAt: string;
}
interface SeedTeam {
  name: string;
  description: string;
  pokemonIds: number[];
  createdAt: string;
}
interface SeedFavorite {
  pokemonId: number;
  pokemonName: string;
  note: string;
  rating: number;
  createdAt: string;
}
interface SeedCustom {
  name: string;
  types: string[];
  stats: Record<string, number>;
  imageUrl: string;
  description: string;
  createdAt: string;
}
interface SeedFile {
  pokemon: SeedPokemon[];
  teams: SeedTeam[];
  favorites: SeedFavorite[];
  customPokemon: SeedCustom[];
}

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (!url)
    throw new Error(
      'DATABASE_URL no está definida (ver docs/plan/SECRETOS.md)',
    );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, max: 2 }),
  });
  try {
    const data = JSON.parse(await readFile(SEED_FILE, 'utf8')) as SeedFile;

    // Una sola consulta; `skipDuplicates` (ON CONFLICT DO NOTHING) deja intacto lo que ya existe.
    const pokemon = await prisma.inventoryPokemon.createMany({
      data: data.pokemon.map(({ createdAt, ...fields }) => ({
        ...fields,
        createdAt: new Date(createdAt),
      })),
      skipDuplicates: true,
    });
    console.log(
      `pokemon: ${pokemon.count} creados, ${data.pokemon.length - pokemon.count} ya existían`,
    );

    const passwordHash = await argon2.hash(
      randomBytes(32).toString('base64url'),
      {
        type: argon2.argon2id,
      },
    );
    const demo = await prisma.player.upsert({
      where: { email: DEMO.email },
      create: { ...DEMO, passwordHash },
      update: {},
    });

    await prisma.favorite.createMany({
      // Sin el `id` del JSON: lo pone la secuencia (un id explícito no la avanza y el siguiente alta chocaría).
      data: data.favorites.map(
        ({ pokemonId, pokemonName, note, rating, createdAt }) => ({
          pokemonId,
          pokemonName,
          note,
          rating,
          playerId: demo.id,
          createdAt: new Date(createdAt),
        }),
      ),
      skipDuplicates: true, // único (playerId, pokemonId)
    });
    // Equipos y personalizados no tienen clave natural: se crean solo si el demo no tiene ninguno.
    if ((await prisma.team.count({ where: { playerId: demo.id } })) === 0) {
      await prisma.team.createMany({
        data: data.teams.map(
          ({ name, description, pokemonIds, createdAt }) => ({
            name,
            description,
            pokemonIds,
            playerId: demo.id,
            createdAt: new Date(createdAt),
          }),
        ),
      });
    }
    if (
      (await prisma.customPokemon.count({ where: { playerId: demo.id } })) === 0
    ) {
      await prisma.customPokemon.createMany({
        data: data.customPokemon.map(({ createdAt, ...c }) => ({
          name: c.name,
          types: c.types,
          stats: c.stats,
          imageUrl: c.imageUrl,
          description: c.description,
          playerId: demo.id,
          createdAt: new Date(createdAt),
        })),
      });
    }
    const [teams, favorites, custom] = await Promise.all([
      prisma.team.count({ where: { playerId: demo.id } }),
      prisma.favorite.count({ where: { playerId: demo.id } }),
      prisma.customPokemon.count({ where: { playerId: demo.id } }),
    ]);
    console.log(
      `demo: ${teams} equipos, ${favorites} favoritos, ${custom} personalizados`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
