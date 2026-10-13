import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import type { CollectionItem, CollectionPage } from '@shared/protocol/collection';
import type { Team, TeamInput } from '@shared/protocol/teams';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Render gratis tarda ~1 min en despertar (como `CollectionService`). */
const TIMEOUT_MS = 70_000;
/** Máximo de ids por petición de `GET /collection?ids` (= su límite de página). */
const IDS_PER_REQUEST = 50;

/**
 * Equipos del jugador (F3-06b, D-054): `/teams` con los Pokémon capturados (`caughtIds`) y, para pintarlos, sus
 * datos de la colección pedidos de una vez con `GET /collection?ids=…` (no uno a uno).
 */
@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.serverUrl}/teams`;

  /** `null` = sin cargar todavía. */
  readonly teams = signal<Team[] | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly members = signal<ReadonlyMap<string, CollectionItem>>(new Map());

  /** Datos de un Pokémon de algún equipo (arte, PC…), si ya llegaron. */
  member(id: string): CollectionItem | undefined {
    return this.members().get(id);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const teams = await firstValueFrom(
        this.http
          .get<Team[]>(this.url, { params: { _sort: 'createdAt', _order: 'asc' } })
          .pipe(timeout(TIMEOUT_MS)),
      );
      await this.fetchMembers([...new Set(teams.flatMap((t) => t.caughtIds))]);
      this.teams.set(teams);
    } catch (err) {
      console.error('[teams] no se pudieron cargar', err);
      this.error.set('No se pudieron cargar tus equipos.');
    } finally {
      this.loading.set(false);
    }
  }

  /** `POST /teams`. `known` = los datos de los elegidos (ya los tiene el editor): no hay que volver a pedirlos. */
  async create(name: string, caughtIds: string[], known: CollectionItem[] = []): Promise<Team> {
    const body: TeamInput = { name, description: '', pokemonIds: [], caughtIds };
    const created = await firstValueFrom(
      this.http.post<Team>(this.url, body).pipe(timeout(TIMEOUT_MS)),
    );
    this.remember(known);
    this.teams.update((list) => [...(list ?? []), created]);
    return created;
  }

  /** `PATCH /teams/:id` con lo que cambie. */
  async update(
    id: number,
    patch: Partial<Pick<TeamInput, 'name' | 'caughtIds'>>,
    known: CollectionItem[] = [],
  ): Promise<Team> {
    const updated = await firstValueFrom(
      this.http.patch<Team>(`${this.url}/${id}`, patch).pipe(timeout(TIMEOUT_MS)),
    );
    this.remember(known);
    this.teams.update((list) => (list ?? []).map((t) => (t.id === id ? updated : t)));
    return updated;
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/${id}`).pipe(timeout(TIMEOUT_MS)));
    this.teams.update((list) => (list ?? []).filter((t) => t.id !== id));
  }

  private remember(items: CollectionItem[]): void {
    if (!items.length) return;
    this.members.update((m) => new Map([...m, ...items.map((i) => [i.id, i] as const)]));
  }

  private async fetchMembers(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) {
      const chunk = ids.slice(i, i + IDS_PER_REQUEST);
      const page = await firstValueFrom(
        this.http
          .get<CollectionPage>(`${environment.serverUrl}/collection`, {
            params: new HttpParams().set('ids', chunk.join(',')).set('limit', IDS_PER_REQUEST),
          })
          .pipe(timeout(TIMEOUT_MS)),
      );
      this.remember(page.items);
    }
  }
}
