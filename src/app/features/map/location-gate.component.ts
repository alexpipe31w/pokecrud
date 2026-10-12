import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { DEFAULT_CENTER, LocationService } from '../../services/location/location.service';
import { SettingsService } from '../../services/game/settings.service';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';

/** Tras cuánto tiempo sin fix se explica "Buscando señal GPS…" (antes, el mapa ya se ve detrás). */
export const SEARCHING_NOTICE_MS = 4000;

type View = 'maps' | 'ask' | 'searching' | 'denied' | 'unavailable' | 'weak' | null;

/**
 * Estados de la ubicación sobre el mapa (DISENO §6, nunca pantalla en blanco): pedir permiso, buscando señal,
 * sin permiso / sin GPS (→ joystick), "GPS débil" (aviso pequeño que no bloquea) y el mapa que no carga (F1-04).
 */
@Component({
  selector: 'app-location-gate',
  imports: [GameButtonComponent, GlassPanelComponent],
  template: `
    @switch (view()) {
      @case ('weak') {
        <div class="chip" role="status">GPS débil</div>
      }
      @case (null) {}
      @default {
        <div class="veil">
          <app-glass-panel size="lg" class="card" role="dialog" aria-live="polite">
            @switch (view()) {
              @case ('maps') {
                <h2>No se pudo cargar el mapa</h2>
                <p>{{ mapsError() }}</p>
                <app-game-button label="Reintentar" [block]="true" (pressed)="retryMaps.emit()" />
              }
              @case ('ask') {
                <h2>¿Dónde estás?</h2>
                <p>Necesitamos tu ubicación para que aparezcan Pokémon a tu alrededor.</p>
                <app-game-button label="Permitir ubicación" [block]="true" (pressed)="allow()" />
              }
              @case ('searching') {
                <div class="ball" [class.still]="still()" aria-hidden="true"></div>
                <h2>Buscando señal GPS…</h2>
                <p>Al aire libre se encuentra antes.</p>
              }
              @case ('denied') {
                <h2>Sin permiso de ubicación</h2>
                <p>Puedes jugar con el joystick o activarlo en los Ajustes del móvil.</p>
                <app-game-button
                  label="Reintentar"
                  variant="glass"
                  [block]="true"
                  (pressed)="retry()"
                />
              }
              @case ('unavailable') {
                <h2>Sin GPS</h2>
                <p>Este dispositivo no da la ubicación. Puedes jugar con el joystick.</p>
              }
            }
            @if (view() !== 'maps') {
              <app-game-button
                [label]="
                  view() === 'searching' ? 'Usar joystick mientras tanto' : 'Jugar con joystick'
                "
                [variant]="view() === 'denied' || view() === 'unavailable' ? 'primary' : 'glass'"
                [block]="true"
                (pressed)="joystick()"
              />
            }
          </app-glass-panel>
        </div>
      }
    }
  `,
  styles: `
    .veil {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: center;
      padding: var(--s-6);
      background: radial-gradient(
        circle at 50% 35%,
        color-mix(in srgb, var(--t-grass) 45%, transparent),
        color-mix(in srgb, var(--ink) 80%, transparent)
      );
    }
    .card {
      width: min(100%, 360px);
      display: grid;
      gap: var(--s-3);
      text-align: center;
    }
    h2 {
      margin: 0;
      font: 600 1.4rem/1.2 var(--font-display);
    }
    p {
      margin: 0 0 var(--s-2);
    }
    .ball {
      justify-self: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 3px solid var(--ink);
      background: linear-gradient(var(--accent) 45%, var(--ink) 45% 55%, var(--paper) 55%);
      animation: spin 1s linear infinite;
    }
    .ball.still {
      animation: none;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .chip {
      position: absolute;
      z-index: 20;
      top: calc(var(--ion-safe-area-top, 0px) + var(--s-4));
      left: 50%;
      transform: translateX(-50%);
      padding: var(--s-1) var(--s-3);
      border-radius: var(--r-chip);
      background: var(--gold);
      color: var(--ink);
      font: 600 0.85rem/1.4 var(--font-display);
      box-shadow: var(--shadow-sm);
    }
  `,
})
export class LocationGateComponent {
  private readonly location = inject(LocationService);
  private readonly settings = inject(SettingsService);

  /** Error al cargar Google Maps (la pantalla del mapa lo pasa); manda sobre los estados de la ubicación. */
  readonly mapsError = input<string | null>(null);
  /** "Reintentar" en el error de Maps: la pantalla vuelve a cargar el mapa. */
  readonly retryMaps = output<void>();
  /** Lleva más de SEARCHING_NOTICE_MS en "searching" sin fix. */
  private readonly slow = signal(false);

  protected readonly still = computed(
    () =>
      this.settings.settings().reduceEffects ||
      (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches),
  );

  protected readonly view = computed<View>(() => {
    if (this.mapsError()) return 'maps';
    switch (this.location.status()) {
      case 'idle':
      case 'prompt':
        return 'ask';
      case 'searching':
        return this.slow() ? 'searching' : null;
      case 'denied':
        return 'denied';
      case 'unavailable':
        return 'unavailable';
      case 'weak':
        return 'weak';
      default:
        return null;
    }
  });

  constructor() {
    effect((onCleanup) => {
      if (this.location.status() !== 'searching') return this.slow.set(false);
      const id = setTimeout(() => this.slow.set(true), SEARCHING_NOTICE_MS);
      onCleanup(() => clearTimeout(id));
    });
  }

  protected allow(): void {
    void this.location.start();
  }

  protected retry(): void {
    void this.location.useGps();
  }

  protected joystick(): void {
    void this.location.stop();
    this.location.useJoystickAt(this.location.position() ?? DEFAULT_CENTER);
  }
}
