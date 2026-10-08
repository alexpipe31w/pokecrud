import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { MAX_POKEMON_ID } from '../core/constants/pokemon-types';
import { defaultPrice, defaultStock } from '../core/utils/pokemon-defaults';
import { PokemonDraft, PokemonRef, PokemonStats } from '../models/pokemon.model';

interface PokeApiList {
  results: { name: string; url: string }[];
}

interface PokeApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number | null;
  types: { slot: number; type: { name: string } }[];
  abilities: { ability: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  sprites: {
    front_default: string | null;
    other?: { 'official-artwork'?: { front_default: string | null } };
  };
}

interface PokeApiSpecies {
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
}

const STAT_KEYS: Record<string, keyof PokemonStats> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
};

/** Consulta PokéAPI (solo lectura) limitada a los primeros 151 Pokémon. */
@Injectable({ providedIn: 'root' })
export class PokeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.pokeApiUrl;

  private readonly refs$ = this.http
    .get<PokeApiList>(`${this.baseUrl}/pokemon`, { params: { limit: MAX_POKEMON_ID } })
    .pipe(
      map((res) => res.results.map((r) => ({ id: idFromUrl(r.url), name: r.name }))),
      shareReplay(1),
    );

  /** Lista (id + nombre) de los primeros 151 Pokémon. Se pide una sola vez. */
  list151(): Observable<PokemonRef[]> {
    return this.refs$;
  }

  /** Busca por id exacto (`150`, `#150`) o por nombre parcial (`mew`). */
  search(term: string): Observable<PokemonRef[]> {
    return this.refs$.pipe(map((refs) => filterRefs(refs, term)));
  }

  /** Descripción en español del Pokémon (de `pokemon-species`). */
  getDescription(id: number): Observable<string> {
    return this.http
      .get<PokeApiSpecies>(`${this.baseUrl}/pokemon-species/${id}`)
      .pipe(map(spanishDescription));
  }

  /** Trae los datos completos de un Pokémon (1–151) listos para el formulario. */
  getById(idOrName: number | string): Observable<PokemonDraft> {
    const key = String(idOrName).trim().toLowerCase().replace(/^#/, '');
    const asNumber = Number(key);
    if (!key || (Number.isInteger(asNumber) && (asNumber < 1 || asNumber > MAX_POKEMON_ID))) {
      return throwError(
        () => new Error(`Solo se permiten los Pokémon del 1 al ${MAX_POKEMON_ID}.`),
      );
    }
    return this.http.get<PokeApiPokemon>(`${this.baseUrl}/pokemon/${key}`).pipe(
      map((raw) => {
        if (raw.id > MAX_POKEMON_ID) {
          throw new Error(`Solo se permiten los Pokémon del 1 al ${MAX_POKEMON_ID}.`);
        }
        return toDraft(raw);
      }),
    );
  }
}

/** Última descripción en español de la Pokédex, sin saltos de línea raros. */
export function spanishDescription(species: PokeApiSpecies): string {
  const entries = species.flavor_text_entries.filter((e) => e.language.name === 'es');
  const last = entries[entries.length - 1];
  // `\s` también cubre los \n y \f que trae PokéAPI dentro del texto.
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : '';
}

function idFromUrl(url: string): number {
  return Number(url.replace(/\/$/, '').split('/').pop());
}

/** Filtra por id exacto (`150`, `#150`) o por nombre parcial (`mew`). */
export function filterRefs<T extends PokemonRef>(refs: T[], term: string): T[] {
  const q = term.trim().toLowerCase().replace(/^#/, '');
  if (!q) return refs;
  if (/^\d+$/.test(q)) {
    const id = Number(q);
    return refs.filter((r) => r.id === id);
  }
  return refs.filter((r) => r.name.includes(q));
}

function toDraft(raw: PokeApiPokemon): PokemonDraft {
  const stats: PokemonStats = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };
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
  };
}
