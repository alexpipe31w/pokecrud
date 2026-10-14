import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import type { LatLng } from '@shared/engine/geo';
import type { Weather } from '@shared/engine/spawns';
import type { NearbySpawns, VisibleSpawn } from '@shared/protocol/spawns';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { shouldRefetch, type FetchState } from '../../game/map-scene/refetch';

/** Como `BagService`: Render gratis tarda ~1 min en despertar; más que eso, mejor contar un fallo y reintentar. */
const SPAWNS_TIMEOUT_MS = 70_000;
const UNAVAILABLE = 'Los Pokémon salvajes no están disponibles ahora mismo.';

const round6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const emptyState = (): FetchState => ({
  inFlight: false,
  lastAt: null,
  lastPos: null,
  expiresAt: null,
  failures: 0,
});

/**
 * Pokémon salvajes alrededor del jugador (F1-07): `GET /spawns` cuando toca según `shouldRefetch` (primera vez, fin
 * de franja, moverse > 60 m; con espera exponencial tras un fallo). El servidor manda: aquí solo se guarda lo que
 * devuelve. Un fallo NO borra la lista anterior (mejor ver los de hace un momento que un mapa vacío).
 */
@Injectable({ providedIn: 'root' })
export class SpawnFeedService {
  private readonly http = inject(HttpClient);
  private readonly _spawns = signal<VisibleSpawn[]>([]);
  private readonly _weather = signal<Weather | null>(null);
  private readonly _night = signal<boolean | null>(null);
  private readonly _error = signal<string | null>(null);
  private state = emptyState();
  /** La petición en vuelo (para que `reportPosition` no lance otra a la vez). */
  private pending: Promise<boolean> | null = null;

  /** Ids que este jugador ya resolvió (capturado o huyó, F2-07): no se vuelven a pintar en el mapa. */
  private readonly hidden = signal<ReadonlySet<string>>(new Set());

  readonly spawns = computed(() => {
    const hidden = this.hidden();
    const all = this._spawns();
    return hidden.size ? all.filter((s) => !hidden.has(s.id)) : all;
  });
  readonly weather = this._weather.asReadonly();
  /** Noche según el servidor (la misma que decide los spawns); null hasta la primera respuesta. */
  readonly night = this._night.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    // Si cambia el jugador (o cierra sesión), se empieza de cero.
    const auth = inject(AuthService);
    let owner: string | null | undefined;
    effect(() => {
      const id = auth.player()?.id ?? null;
      if (owner !== undefined && id !== owner) this.clear();
      owner = id;
    });
  }

  /** Lo llama la pantalla del mapa (~1 vez por segundo). `now` = `Date.now()` (se compara con el fin de franja). */
  async tick(pos: LatLng, now = Date.now()): Promise<void> {
    if (!shouldRefetch(this.state, now, pos)) return;
    await this.fetch(pos, now);
  }

  /**
   * Manda YA la posición al servidor (un `GET /spawns` fuera de turno) y dice si lo consiguió. El servidor mide la
   * distancia a un Pokémon desde la última posición que recibió por aquí (D-028), y el feed solo la renueva cada 60 m
   * o al cambiar de franja: sin esto, abrir un encuentro tras caminar hacia el Pokémon daba 403 "demasiado lejos".
   */
  async reportPosition(pos: LatLng, now = Date.now()): Promise<boolean> {
    if (this.pending) await this.pending;
    return this.fetch(pos, now);
  }

  private fetch(pos: LatLng, now: number): Promise<boolean> {
    const run = this.request(pos, now).finally(() => {
      if (this.pending === run) this.pending = null;
    });
    this.pending = run;
    return run;
  }

  private async request(pos: LatLng, now: number): Promise<boolean> {
    this.state = { ...this.state, inFlight: true, lastAttemptAt: now };
    const at = { lat: round6(pos.lat), lng: round6(pos.lng) };
    try {
      const res = await firstValueFrom(
        this.http
          .get<NearbySpawns>(`${environment.serverUrl}/spawns`, {
            params: { lat: at.lat, lng: at.lng },
          })
          .pipe(timeout(SPAWNS_TIMEOUT_MS)),
      );
      this._spawns.set(res.spawns);
      this._weather.set(res.weather ?? null);
      this._night.set(res.night ?? null);
      this._error.set(null);
      const expiresAt = Date.parse(res.expiresAt);
      this.state = {
        inFlight: false,
        lastAt: now,
        lastPos: at,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
        failures: 0,
        lastAttemptAt: now,
      };
      return true;
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : undefined;
      console.warn('[spawns] no se pudieron pedir los Pokémon salvajes', {
        status,
        failures: this.state.failures + 1,
      });
      // 401 lo resuelve el interceptor (refresh o login); el resto se enseña. En todos los casos, se espera y reintenta.
      if (status !== 401) this._error.set(UNAVAILABLE);
      this.state = { ...this.state, inFlight: false, failures: this.state.failures + 1 };
      return false;
    }
  }

  /**
   * Ya resuelto por este jugador (F2-07): fuera del mapa aunque el servidor lo siga dando (los spawns no se guardan,
   * D-025). Los ids llevan la franja, así que no hace falta limpiarlos: los de franjas viejas ya no vuelven.
   */
  hide(id: string): void {
    this.hidden.update((s) => new Set(s).add(id));
  }

  /** Al cerrar sesión o cambiar de jugador. */
  clear(): void {
    this.state = emptyState();
    this.hidden.set(new Set());
    this._spawns.set([]);
    this._weather.set(null);
    this._night.set(null);
    this._error.set(null);
  }
}
