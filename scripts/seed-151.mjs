// Descarga los primeros 151 Pokémon de PokéAPI y los guarda en la colección `pokemon`
// de backend/db.seed.json y backend/db.json (sin tocar teams, favorites ni customPokemon).
//
// Uso: npm run seed:151
//
// PokéAPI no tiene precio ni stock: se generan con las mismas reglas que
// src/app/core/utils/pokemon-defaults.ts (precio = base_experience × 100, stock según el id).

import { readFileSync, writeFileSync } from 'node:fs';

const POKE_API_URL = 'https://pokeapi.co/api/v2';
const TOTAL = 151;
const CONCURRENCY = 10;
const FILES = ['backend/db.seed.json', 'backend/db.json'];
const NOW = new Date().toISOString();

const STAT_KEYS = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
};

function defaultPrice(baseExperience) {
  return Math.max(1, baseExperience ?? 0) * 100;
}

function defaultStock(id) {
  return ((id * 7) % 50) + 5;
}

function toPokemon(raw) {
  const stats = {};
  for (const s of raw.stats) {
    const key = STAT_KEYS[s.stat.name];
    if (key) stats[key] = s.base_stat;
  }
  return {
    id: raw.id,
    name: raw.name,
    types: [...raw.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    abilities: raw.abilities.map((a) => a.ability.name),
    imageUrl:
      raw.sprites.other?.['official-artwork']?.front_default ?? raw.sprites.front_default ?? '',
    height: raw.height / 10,
    weight: raw.weight / 10,
    baseExperience: raw.base_experience ?? 0,
    stats,
    price: defaultPrice(raw.base_experience),
    stock: defaultStock(raw.id),
    createdAt: NOW,
    updatedAt: NOW,
  };
}

async function fetchPokemon(id) {
  const res = await fetch(`${POKE_API_URL}/pokemon/${id}`);
  if (!res.ok) throw new Error(`PokéAPI respondió ${res.status} para el id ${id}`);
  return toPokemon(await res.json());
}

async function main() {
  const ids = Array.from({ length: TOTAL }, (_, i) => i + 1);
  const pokemon = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = await Promise.all(ids.slice(i, i + CONCURRENCY).map(fetchPokemon));
    pokemon.push(...batch);
    process.stdout.write(`\rDescargados ${pokemon.length}/${TOTAL}`);
  }
  process.stdout.write('\n');

  // Se reemplaza solo la colección `pokemon` (siempre al final del archivo) para no
  // reformatear teams, favorites ni customPokemon.
  const collection = JSON.stringify(pokemon, null, 2).replace(/\n/g, '\n  ');
  for (const file of FILES) {
    let text = readFileSync(file, 'utf8').trimEnd();
    const marker = text.indexOf(',\n  "pokemon": [');
    text = (marker >= 0 ? text.slice(0, marker) : text.replace(/\n?}$/, '')).trimEnd();
    writeFileSync(file, `${text},\n  "pokemon": ${collection}\n}\n`, 'utf8');
    JSON.parse(readFileSync(file, 'utf8')); // valida que el JSON siga siendo correcto
    console.log(`✔ ${file}: ${pokemon.length} Pokémon`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
