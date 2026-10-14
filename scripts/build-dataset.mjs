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
// El guion suave (U+00AD) seguido de salto de línea parte palabras: se quita junto con el salto.
const clean = (s) =>
  (s ?? '')
    .replace(/­\s*/g, '')
    .replace(/[\f\n\r]+/g, ' ')
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
      types: [...p.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
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
    // F4-02: a quién afecta el movimiento (los cambios de stats van al usuario o al rival) y retroceso del rival.
    target: m.target?.name ?? 'selected-pokemon',
    flinchChance: m.meta?.flinch_chance ?? 0,
    // `target` no basta para los de daño: Puño Incremento es `selected-pokemon` y sube el ataque del USUARIO.
    // PokéAPI lo dice aquí: `damage+raise` = cambios al usuario, `damage+lower` = al rival.
    metaCategory: m.meta?.category?.name ?? null,
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
