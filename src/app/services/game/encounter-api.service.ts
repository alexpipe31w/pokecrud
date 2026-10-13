import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { EncounterView } from '@shared/protocol/encounters';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Como el resto de llamadas al servidor: Render gratis tarda ~1 min en despertar. */
export const ENCOUNTER_TIMEOUT_MS = 70_000;

/** Encuentro con el servidor (F2-04a: abrirlo; F2-05 añade `throw`). El servidor decide todo. */
@Injectable({ providedIn: 'root' })
export class EncounterApiService {
  private readonly http = inject(HttpClient);

  view(id: string): Promise<EncounterView> {
    return firstValueFrom(
      this.http.get<EncounterView>(this.url(id)).pipe(timeout(ENCOUNTER_TIMEOUT_MS)),
    );
  }

  private url(id: string): string {
    return `${environment.serverUrl}/encounters/${encodeURIComponent(id)}`;
  }
}
