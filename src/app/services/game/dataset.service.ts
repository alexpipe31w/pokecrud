import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { openDB } from 'idb';
import { firstValueFrom } from 'rxjs';
import type { DatasetMeta, Move, Species, TypeInfo } from '@shared/data/dataset.types';

type Status = 'idle' | 'loading' | 'ready' | 'error';
interface Bundle {
  meta: DatasetMeta;
  pokedex: Species[];
  moves: Move[];
  types: TypeInfo[];
}

const DB = 'pokecrud-dataset';
const STORE = 'bundles';

/** Carga el dataset una vez (assets → IndexedDB) y lo expone como Maps con signals. */
@Injectable({ providedIn: 'root' })
export class DatasetService {
  private readonly http = inject(HttpClient);
  readonly status = signal<Status>('idle');
  readonly error = signal<string | null>(null);
  private readonly bundle = signal<Bundle | null>(null);
  /** Carga en curso: la comparten las llamadas simultáneas a load(). */
  private inFlight: Promise<void> | null = null;

  readonly species = computed(() => new Map((this.bundle()?.pokedex ?? []).map((s) => [s.id, s])));
  readonly moves = computed(() => new Map((this.bundle()?.moves ?? []).map((m) => [m.id, m])));
  readonly types = computed(() => this.bundle()?.types ?? []);

  /** Idempotente: llamarla varias veces no repite descargas. Tras un error se puede reintentar. */
  load(): Promise<void> {
    if (this.status() === 'ready') return Promise.resolve();
    this.inFlight ??= this.fetchBundle().finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  private async fetchBundle(): Promise<void> {
    this.status.set('loading');
    this.error.set(null);
    try {
      const meta = await firstValueFrom(this.http.get<DatasetMeta>('assets/data/meta.json'));
      const cached = await this.readCache(meta.version);
      this.bundle.set(cached ?? (await this.download(meta)));
      this.status.set('ready');
    } catch (err) {
      console.error('[dataset] fallo al cargar', err);
      this.error.set('No se pudieron cargar los datos de los Pokémon.');
      this.status.set('error');
    }
  }

  private async download(meta: DatasetMeta): Promise<Bundle> {
    const [pokedex, moves, types] = await Promise.all([
      firstValueFrom(this.http.get<Species[]>('assets/data/pokedex.json')),
      firstValueFrom(this.http.get<Move[]>('assets/data/moves.json')),
      firstValueFrom(this.http.get<TypeInfo[]>('assets/data/types.json')),
    ]);
    const bundle = { meta, pokedex, moves, types };
    await this.writeCache(bundle);
    return bundle;
  }

  private async db() {
    return openDB(DB, 1, { upgrade: (db) => db.createObjectStore(STORE) });
  }

  private async readCache(version: string): Promise<Bundle | null> {
    try {
      const b = (await (await this.db()).get(STORE, 'current')) as Bundle | undefined;
      return b && b.meta.version === version ? b : null;
    } catch (err) {
      console.warn('[dataset] IndexedDB no disponible, se descarga de assets', err);
      return null;
    }
  }

  private async writeCache(bundle: Bundle): Promise<void> {
    try {
      await (await this.db()).put(STORE, bundle, 'current');
    } catch (err) {
      console.warn('[dataset] no se pudo cachear en IndexedDB', err);
    }
  }
}
