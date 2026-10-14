import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ITEMS, type ItemId } from '@shared/engine/items';
import type { BagView } from '@shared/protocol/encounters';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

/** Tope de espera de `GET /bag`: Render gratis tarda ~1 min en despertar; más que eso, mejor mostrar el error. */
const BAG_TIMEOUT_MS = 70_000;

/**
 * Mochila del jugador (F1-08): lo que devuelve `GET /bag`. El servidor manda; aquí solo se guarda para pintarla.
 * Gastar objetos llega con la captura (F2), y siempre lo hará el servidor.
 */
@Injectable({ providedIn: 'root' })
export class BagService {
  private readonly http = inject(HttpClient);
  private readonly _qty = signal<Record<ItemId, number> | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly qty = this._qty.asReadonly();
  readonly error = this._error.asReadonly();
  /** Bolas de cualquier tipo (lo que enseña el HUD). */
  readonly balls = computed(() => {
    const q = this._qty();
    return q ? q.POKE_BALL + q.GREAT_BALL + q.ULTRA_BALL : null;
  });

  constructor() {
    // Si cambia el jugador (o cierra sesión), fuera la mochila del anterior.
    const auth = inject(AuthService);
    let owner: string | null | undefined;
    effect(() => {
      const id = auth.player()?.id ?? null;
      if (owner !== undefined && id !== owner) this.clear();
      owner = id;
    });
  }

  async load(): Promise<void> {
    try {
      this.apply(
        await firstValueFrom(
          this.http.get<BagView>(`${environment.serverUrl}/bag`).pipe(timeout(BAG_TIMEOUT_MS)),
        ),
      );
    } catch (err) {
      console.error('[bag] no se pudo cargar la mochila', err);
      this._error.set('No se pudo cargar la mochila.');
    }
  }

  /** La mochila entera que manda el servidor (`GET /bag` o la respuesta de un lanzamiento, F2-05). */
  apply(view: BagView): void {
    const qty = Object.fromEntries(ITEMS.map((i) => [i, 0])) as Record<ItemId, number>;
    for (const { item, qty: n } of view.items) if (item in qty) qty[item] = n;
    this._qty.set(qty);
    this._error.set(null);
  }

  /** Al cerrar sesión: que el siguiente jugador no vea la mochila del anterior. */
  clear(): void {
    this._qty.set(null);
    this._error.set(null);
  }
}
