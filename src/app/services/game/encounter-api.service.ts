import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import type { EncounterView, ThrowRequest, ThrowResult } from '@shared/protocol/encounters';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { LocationService } from '../location/location.service';
import { BagService } from './bag.service';
import { SpawnFeedService } from './spawn-feed.service';

/** Como el resto de llamadas al servidor: Render gratis tarda ~1 min en despertar. */
export const ENCOUNTER_TIMEOUT_MS = 70_000;
/** Reintentos por fallo de red o 5xx, con el MISMO `clientThrowId`: el servidor no gasta otra bola (D-028). */
export const THROW_NETWORK_RETRIES = 2;

/** Id de cada lanzamiento (token para que los tests lo fijen). */
export const CLIENT_THROW_ID = new InjectionToken<() => string>('CLIENT_THROW_ID', {
  providedIn: 'root',
  factory: () => () => crypto.randomUUID(),
});
/** Espera entre reintentos (0 en los tests). */
export const THROW_RETRY_DELAY_MS = new InjectionToken<number>('THROW_RETRY_DELAY_MS', {
  providedIn: 'root',
  factory: () => 1500,
});

/**
 * Encuentro con el servidor (F2-04a: abrirlo; F2-05: lanzar). El servidor decide todo (captura, huida, gasto, XP);
 * aquí se reintenta sin gastar de más y se reparte la respuesta: mochila, XP del HUD y Pokémon fuera del mapa.
 */
@Injectable({ providedIn: 'root' })
export class EncounterApiService {
  private readonly http = inject(HttpClient);
  private readonly bag = inject(BagService);
  private readonly auth = inject(AuthService);
  private readonly feed = inject(SpawnFeedService);
  private readonly location = inject(LocationService);
  private readonly newThrowId = inject(CLIENT_THROW_ID);
  private readonly retryDelay = inject(THROW_RETRY_DELAY_MS);

  view(id: string): Promise<EncounterView> {
    return firstValueFrom(
      this.http.get<EncounterView>(this.url(id)).pipe(timeout(ENCOUNTER_TIMEOUT_MS)),
    );
  }

  async throw(id: string, req: Omit<ThrowRequest, 'clientThrowId'>): Promise<ThrowResult> {
    const body: ThrowRequest = { ...req, clientThrowId: this.newThrowId() };
    let relocated = false;
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await firstValueFrom(
          this.http
            .post<ThrowResult>(`${this.url(id)}/throw`, body)
            .pipe(timeout(ENCOUNTER_TIMEOUT_MS)),
        );
        this.bag.apply(res.bag);
        this.auth.addXp(res.xpGained);
        if (res.captured || res.fled) this.feed.hide(id);
        return res;
      } catch (err) {
        // Sin respuesta (red caída, timeout de rxjs) cuenta como 0.
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        if (status === 403 && !relocated) {
          // Lejos o con la ubicación de hace > 5 min (D-028): se manda la de ahora y se prueba otra vez (D-041).
          relocated = true;
          const pos = this.location.position();
          if (pos && (await this.feed.reportPosition({ lat: pos.lat, lng: pos.lng }))) continue;
        }
        if ((status === 0 || status >= 500) && attempt < THROW_NETWORK_RETRIES) {
          await new Promise((r) => setTimeout(r, this.retryDelay));
          continue;
        }
        throw err;
      }
    }
  }

  private url(id: string): string {
    return `${environment.serverUrl}/encounters/${encodeURIComponent(id)}`;
  }
}
