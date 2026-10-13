import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Favorite, FavoriteInput } from '@shared/protocol/course';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Render gratis tarda ~1 min en despertar. */
const TIMEOUT_MS = 70_000;
/** Máximo que admite `_limit` en el servidor (`MAX_LIMIT`). */
const PAGE = 100;

/**
 * Favoritos del jugador (F3-06c): `/favorites`, contrato del curso sin cambios. Uno por especie (`of(pokemonId)`);
 * `save` crea o actualiza la valoración y la nota.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.serverUrl}/favorites`;

  /** `null` = sin cargar todavía. Los más recientes primero. */
  readonly favorites = signal<Favorite[] | null>(null);
  readonly error = signal<string | null>(null);
  private readonly byPokemon = computed(
    () => new Map((this.favorites() ?? []).map((f) => [f.pokemonId, f])),
  );

  of(pokemonId: number): Favorite | undefined {
    return this.byPokemon().get(pokemonId);
  }

  async load(): Promise<void> {
    this.error.set(null);
    try {
      const all: Favorite[] = [];
      for (let page = 1; ; page++) {
        const chunk = await firstValueFrom(
          this.http
            .get<Favorite[]>(this.url, {
              params: { _sort: 'createdAt', _order: 'desc', _page: page, _limit: PAGE },
            })
            .pipe(timeout(TIMEOUT_MS)),
        );
        all.push(...chunk);
        if (chunk.length < PAGE) break;
      }
      this.favorites.set(all);
    } catch (err) {
      console.error('[favorites] no se pudieron cargar', err);
      this.error.set('No se pudieron cargar tus favoritos.');
    }
  }

  /** Marca la especie como favorita (POST) o cambia su valoración y nota (PATCH). */
  async save(input: FavoriteInput): Promise<Favorite> {
    const note = input.note ?? '';
    const existing = this.of(input.pokemonId);
    if (existing) {
      const updated = await firstValueFrom(
        this.http
          .patch<Favorite>(`${this.url}/${existing.id}`, { rating: input.rating, note })
          .pipe(timeout(TIMEOUT_MS)),
      );
      this.favorites.update((l) => (l ?? []).map((f) => (f.id === updated.id ? updated : f)));
      return updated;
    }
    const created = await firstValueFrom(
      this.http.post<Favorite>(this.url, { ...input, note }).pipe(timeout(TIMEOUT_MS)),
    );
    this.favorites.update((l) => [created, ...(l ?? [])]);
    return created;
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/${id}`).pipe(timeout(TIMEOUT_MS)));
    this.favorites.update((l) => (l ?? []).filter((f) => f.id !== id));
  }
}
