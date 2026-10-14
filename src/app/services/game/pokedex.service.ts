import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { PokedexView } from '@shared/protocol/collection';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Render gratis tarda ~1 min en despertar (como `BagService`). */
const TIMEOUT_MS = 70_000;

export type DexStatus = 'unseen' | 'seen' | 'caught';

/**
 * Pokédex del jugador (F3-04): lo que dice `GET /pokedex` (F3-02a), en caché. El encuentro la invalida al abrirse
 * (el servidor marca "visto") y al capturar, así la próxima visita a la Pokédex pide lo nuevo.
 */
@Injectable({ providedIn: 'root' })
export class PokedexService {
  private readonly http = inject(HttpClient);
  private readonly entries = signal<ReadonlyMap<number, boolean> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly loaded = computed(() => this.entries() !== null);
  readonly seenCount = computed(() => this.entries()?.size ?? 0);
  readonly caughtCount = computed(() => {
    let n = 0;
    for (const caught of this.entries()?.values() ?? []) if (caught) n++;
    return n;
  });
  private inFlight: Promise<void> | null = null;

  statusOf(speciesId: number): DexStatus {
    const caught = this.entries()?.get(speciesId);
    return caught === undefined ? 'unseen' : caught ? 'caught' : 'seen';
  }

  load(): Promise<void> {
    if (this.entries() !== null) return Promise.resolve();
    this.inFlight ??= this.fetch().finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  invalidate(): void {
    this.entries.set(null);
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.get<PokedexView>(`${environment.serverUrl}/pokedex`).pipe(timeout(TIMEOUT_MS)),
      );
      this.entries.set(new Map(res.entries.map((e) => [e.speciesId, e.caught])));
    } catch (err) {
      console.error('[pokedex] no se pudo cargar', err);
      this.error.set('No se pudo cargar tu Pokédex.');
    } finally {
      this.loading.set(false);
    }
  }
}
