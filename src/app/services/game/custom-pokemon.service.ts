import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import type { CustomPokemon, CustomPokemonInput } from '@shared/protocol/course';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Render gratis tarda ~1 min en despertar. */
const TIMEOUT_MS = 70_000;
/** Máximo que admite `_limit` en el servidor (`MAX_LIMIT`). */
const PAGE = 100;

/** Pokémon personalizados del jugador (F3-06c): `/customPokemon`, contrato del curso sin cambios. */
@Injectable({ providedIn: 'root' })
export class CustomPokemonService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.serverUrl}/customPokemon`;

  /** `null` = sin cargar todavía. Los más nuevos primero. */
  readonly list = signal<CustomPokemon[] | null>(null);
  readonly error = signal<string | null>(null);

  byId(id: number): CustomPokemon | undefined {
    return this.list()?.find((m) => m.id === id);
  }

  async load(): Promise<void> {
    this.error.set(null);
    try {
      const all: CustomPokemon[] = [];
      for (let page = 1; ; page++) {
        const chunk = await firstValueFrom(
          this.http
            .get<CustomPokemon[]>(this.url, {
              params: { _sort: 'createdAt', _order: 'desc', _page: page, _limit: PAGE },
            })
            .pipe(timeout(TIMEOUT_MS)),
        );
        all.push(...chunk);
        if (chunk.length < PAGE) break;
      }
      this.list.set(all);
    } catch (err) {
      console.error('[customPokemon] no se pudieron cargar', err);
      this.error.set('No se pudieron cargar tus Pokémon personalizados.');
    }
  }

  async create(input: CustomPokemonInput): Promise<CustomPokemon> {
    const created = await firstValueFrom(
      this.http.post<CustomPokemon>(this.url, input).pipe(timeout(TIMEOUT_MS)),
    );
    this.list.update((l) => [created, ...(l ?? [])]);
    return created;
  }

  async update(id: number, input: CustomPokemonInput): Promise<CustomPokemon> {
    const updated = await firstValueFrom(
      this.http.patch<CustomPokemon>(`${this.url}/${id}`, input).pipe(timeout(TIMEOUT_MS)),
    );
    this.list.update((l) => (l ?? []).map((m) => (m.id === id ? updated : m)));
    return updated;
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/${id}`).pipe(timeout(TIMEOUT_MS)));
    this.list.update((l) => (l ?? []).filter((m) => m.id !== id));
  }
}
