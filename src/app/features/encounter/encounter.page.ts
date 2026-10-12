// PROVISIONAL (F1-07): F2-04 lo sustituye por la escena AR (cámara + lanzamiento). Aquí solo se comprueba que el
// toque en el mapa lleva al encuentro correcto y que el servidor lo reconoce (GET /encounters/:id, F2-06).
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import type { EncounterView } from '@shared/protocol/encounters';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';

/** Como el resto de llamadas al servidor: Render gratis tarda ~1 min en despertar. */
const ENCOUNTER_TIMEOUT_MS = 70_000;

/** Texto de cada error de `GET /encounters/:id` (D-028). */
export function encounterErrorText(status: number | undefined): string {
  switch (status) {
    case 403:
      return 'Estás demasiado lejos.';
    case 410:
      return 'Se ha ido…';
    case 409:
      return 'Ya lo intentaste.';
    case 404:
      return 'Este Pokémon ya no está.';
    default:
      return 'No se pudo abrir el encuentro. Revisa tu conexión.';
  }
}

const art = (id: number): string =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;

@Component({
  selector: 'app-encounter',
  imports: [IonContent, GameButtonComponent, GlassPanelComponent],
  template: `
    <ion-content>
      <main class="enc">
        @if (view(); as v) {
          <img class="enc__art" [src]="art(v.speciesId)" [alt]="name()" width="240" height="240" />
          <app-glass-panel size="lg" class="enc__card">
            <p class="enc__kicker">¡Un Pokémon salvaje!</p>
            <h1 class="enc__name">
              {{ name() }}
              @if (v.shiny) {
                <span class="enc__shiny"> ✦</span>
              }
            </h1>
            <p class="enc__meta">Nivel {{ v.level }}</p>
            @if (v.status !== 'open') {
              <p class="enc__note" role="status">
                {{ v.status === 'caught' ? 'Ya lo atrapaste.' : 'Ya se te escapó.' }}
              </p>
            }
            <p class="enc__soon">La captura con la cámara llega pronto.</p>
          </app-glass-panel>
        } @else if (error(); as e) {
          <app-glass-panel size="lg" class="enc__card">
            <p class="enc__error" role="alert">{{ e }}</p>
          </app-glass-panel>
        } @else {
          <p class="enc__loading" role="status">Buscando al Pokémon…</p>
        }
        <app-game-button variant="glass" label="Volver al mapa" (pressed)="back()" />
      </main>
    </ion-content>
  `,
  styles: `
    .enc {
      min-height: 100%;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: var(--s-4);
      padding: var(--s-6) var(--s-4);
      text-align: center;
    }
    .enc__art {
      width: min(60vw, 240px);
      height: auto;
      filter: drop-shadow(0 12px 18px rgb(0 0 0 / 0.25));
    }
    .enc__card {
      width: min(100%, 360px);
    }
    .enc__kicker {
      margin: 0;
      font: 600 0.85rem/1 var(--font-display);
      color: var(--ink-2);
    }
    .enc__name {
      margin: var(--s-2) 0 0;
      font: 700 1.6rem/1.1 var(--font-display);
    }
    .enc__shiny {
      color: var(--gold);
    }
    .enc__meta,
    .enc__note,
    .enc__soon,
    .enc__error,
    .enc__loading {
      margin: var(--s-2) 0 0;
    }
    .enc__soon {
      font-size: 0.85rem;
      color: var(--ink-2);
    }
    .enc__error {
      font: 600 1.1rem/1.3 var(--font-display);
    }
  `,
})
export class EncounterPage {
  /** `:id` de la ruta (id del spawn, `celda:franja:índice`). */
  readonly id = input.required<string>();
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly dataset = inject(DatasetService);
  private readonly audio = inject(AudioService);

  protected readonly view = signal<EncounterView | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly name = computed(() => {
    const v = this.view();
    return v ? (this.dataset.species().get(v.speciesId)?.names.es ?? `#${v.speciesId}`) : '';
  });
  protected readonly art = art;

  ionViewWillEnter(): void {
    void this.load();
  }

  protected back(): void {
    void this.router.navigateByUrl('/mapa');
  }

  private async load(): Promise<void> {
    this.view.set(null);
    this.error.set(null);
    void this.dataset.load();
    try {
      const v = await firstValueFrom(
        this.http
          .get<EncounterView>(
            `${environment.serverUrl}/encounters/${encodeURIComponent(this.id())}`,
          )
          .pipe(timeout(ENCOUNTER_TIMEOUT_MS)),
      );
      this.view.set(v);
      void this.audio.playCry(v.speciesId);
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : undefined;
      console.warn('[encuentro] no se pudo abrir', { id: this.id(), status });
      this.error.set(encounterErrorText(status));
    }
  }
}
