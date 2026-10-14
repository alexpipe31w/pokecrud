import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  CollectionDetail,
  CollectionItem,
  CollectionPage,
  CollectionPatch,
  CollectionQuery,
  EvolveRequest,
  TransferResult,
} from '@shared/protocol/collection';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Render gratis tarda ~1 min en despertar (como `BagService`). */
const TIMEOUT_MS = 70_000;
export const COLLECTION_PAGE_SIZE = 30;

/** Orden y filtros de la pantalla (sin cursor ni límite, que los pone el servicio). */
export type CollectionFilters = Required<Pick<CollectionQuery, 'sort' | 'order'>> &
  Pick<CollectionQuery, 'type' | 'shiny' | 'favorite'>;

export const DEFAULT_FILTERS: CollectionFilters = { sort: 'caughtAt', order: 'desc' };

/**
 * Mis Pokémon (F3-02b): la lista paginada de `GET /collection` (F3-02a). Paginación por cursor; cambiar orden o
 * filtros empieza de cero. La ficha (F3-03) actualiza filas sueltas con `patchItem` / `removeItem` / `restoreItem`.
 */
@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly http = inject(HttpClient);

  readonly filters = signal<CollectionFilters>(DEFAULT_FILTERS);
  readonly items = signal<CollectionItem[]>([]);
  readonly total = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly nextCursor = signal<string | null>(null);
  readonly hasMore = computed(() => this.nextCursor() !== null);
  /** Algún filtro distinto de "todo" (para el punto del botón Filtros y la vacía con filtros). */
  readonly filtered = computed(() => {
    const f = this.filters();
    return f.type !== undefined || f.shiny !== undefined || f.favorite !== undefined;
  });

  /** Sube al cambiar de consulta: una respuesta de una consulta anterior se descarta. */
  private generation = 0;
  private inFlight: Promise<void> | null = null;

  /** Primera página con los filtros actuales. */
  load(): Promise<void> {
    this.generation++;
    this.items.set([]);
    this.total.set(null);
    this.nextCursor.set(null);
    this.inFlight = this.fetch(null, this.generation);
    return this.inFlight;
  }

  /** Siguiente página, si la hay y no hay otra en camino. */
  loadMore(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const cursor = this.nextCursor();
    if (!cursor) return Promise.resolve();
    this.inFlight = this.fetch(cursor, this.generation);
    return this.inFlight;
  }

  /** Hay capturas nuevas (F3-02b): la próxima visita a "Mis Pokémon" carga de cero. */
  invalidate(): void {
    this.generation++;
    this.items.set([]);
    this.total.set(null);
    this.nextCursor.set(null);
    this.loading.set(false);
    this.inFlight = null;
  }

  setQuery(patch: Partial<CollectionFilters>): Promise<void> {
    this.filters.update((f) => ({ ...f, ...patch }));
    return this.load();
  }

  clearFilters(): Promise<void> {
    this.filters.update((f) => ({ sort: f.sort, order: f.order }));
    return this.load();
  }

  patchItem(id: string, patch: Partial<CollectionItem>): void {
    this.items.update((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  /** Quita una fila (transferir); devuelve lo necesario para deshacerlo. */
  removeItem(id: string): { item: CollectionItem; index: number } | null {
    const index = this.items().findIndex((i) => i.id === id);
    if (index < 0) return null;
    const item = this.items()[index];
    this.items.update((list) => list.filter((i) => i.id !== id));
    this.total.update((t) => (t === null ? t : t - 1));
    return { item, index };
  }

  restoreItem(item: CollectionItem, index: number): void {
    this.items.update((list) => [...list.slice(0, index), item, ...list.slice(index)]);
    this.total.update((t) => (t === null ? t : t + 1));
  }

  /** `GET /collection/:id` (F3-03): la ficha completa. Lanza el error HTTP (la página lo enseña). */
  detail(id: string): Promise<CollectionDetail> {
    return firstValueFrom(this.http.get<CollectionDetail>(this.url(id)).pipe(timeout(TIMEOUT_MS)));
  }

  /** `PATCH /collection/:id` (F3-03): mote y favorito; la fila de la lista queda al día. */
  async patch(id: string, body: CollectionPatch): Promise<CollectionItem> {
    const item = await firstValueFrom(
      this.http.patch<CollectionItem>(this.url(id), body).pipe(timeout(TIMEOUT_MS)),
    );
    this.patchItem(id, item);
    return item;
  }

  /**
   * `POST /collection/:id/evolve` (F3-05, D-053): evoluciona gastando caramelos; devuelve la ficha nueva y deja la fila
   * de la lista con la especie y el PC nuevos. Lanza el error HTTP (409 sin caramelos o ya evolucionado).
   */
  async evolve(id: string, to: number): Promise<CollectionDetail> {
    const body: EvolveRequest = { to };
    const detail = await firstValueFrom(
      this.http.post<CollectionDetail>(`${this.url(id)}/evolve`, body).pipe(timeout(TIMEOUT_MS)),
    );
    this.patchItem(id, { speciesId: detail.speciesId, cp: detail.cp });
    return detail;
  }

  /** `DELETE /collection/:id` (F3-03): transferir (+1 caramelo). Lo llama `TransferService` tras el "deshacer". */
  transfer(id: string): Promise<TransferResult> {
    return firstValueFrom(this.http.delete<TransferResult>(this.url(id)).pipe(timeout(TIMEOUT_MS)));
  }

  private url(id: string): string {
    return `${environment.serverUrl}/collection/${encodeURIComponent(id)}`;
  }

  private async fetch(cursor: string | null, generation: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.http
          .get<CollectionPage>(`${environment.serverUrl}/collection`, {
            params: this.params(cursor),
          })
          .pipe(timeout(TIMEOUT_MS)),
      );
      if (generation !== this.generation) return;
      this.items.update((list) => (cursor ? [...list, ...res.items] : res.items));
      this.total.set(res.total);
      this.nextCursor.set(res.nextCursor);
    } catch (err) {
      if (generation !== this.generation) return;
      console.error('[collection] no se pudo cargar', err);
      this.error.set('No se pudo cargar tu colección.');
    } finally {
      if (generation === this.generation) {
        this.loading.set(false);
        this.inFlight = null;
      }
    }
  }

  private params(cursor: string | null): HttpParams {
    const f = this.filters();
    let p = new HttpParams()
      .set('sort', f.sort)
      .set('order', f.order)
      .set('limit', COLLECTION_PAGE_SIZE);
    if (f.type) p = p.set('type', f.type);
    if (f.shiny !== undefined) p = p.set('shiny', f.shiny);
    if (f.favorite !== undefined) p = p.set('favorite', f.favorite);
    if (cursor) p = p.set('cursor', cursor);
    return p;
  }
}
