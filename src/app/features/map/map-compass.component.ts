import { Component, computed, inject, input, output } from '@angular/core';

import { HapticsService } from '../../services/game/haptics.service';

/**
 * Brújula del HUD del mapa (DISENO §1, arriba a la derecha). La aguja apunta al norte de la pantalla (gira con
 * `-heading`). Al tocarla alterna "norte arriba" / "el mapa sigue tu orientación".
 */
@Component({
  selector: 'app-map-compass',
  template: `
    <button
      type="button"
      class="cmp"
      [class.is-locked]="northUp()"
      [attr.aria-pressed]="northUp()"
      [attr.aria-label]="label()"
      (pointerdown)="haptics.tap()"
      (click)="toggle.emit()"
    >
      <svg viewBox="0 0 40 40" aria-hidden="true" [style.transform]="'rotate(' + -heading() + 'deg)'">
        <path class="n" d="M20 4 L25 20 L15 20 Z" />
        <path class="s" d="M20 36 L25 20 L15 20 Z" />
        <text x="20" y="3.5" text-anchor="middle">N</text>
      </svg>
    </button>
  `,
  styles: `
    .cmp {
      width: 48px;
      height: 48px;
      padding: 4px;
      border: 0;
      border-radius: 50%;
      background: var(--surface);
      backdrop-filter: blur(20px) saturate(160%);
      border-top: 1px solid var(--glass-edge);
      box-shadow: var(--shadow-sm);
      transition: transform var(--dur-press) var(--ease-out);
      -webkit-tap-highlight-color: transparent;
    }
    .cmp:active {
      transform: scale(0.94);
    }
    .cmp.is-locked {
      box-shadow:
        var(--shadow-sm),
        inset 0 0 0 2px var(--accent);
    }
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .n {
      fill: var(--accent);
    }
    .s {
      fill: var(--surface-text);
      opacity: 0.55;
    }
    text {
      fill: var(--surface-text);
      font: 700 7px var(--font-display);
    }
  `,
})
export class MapCompassComponent {
  /** Rumbo de la cámara en grados (0 = norte arriba). */
  readonly heading = input(0);
  readonly northUp = input(false);
  readonly toggle = output<void>();

  protected readonly haptics = inject(HapticsService);
  protected readonly label = computed(() =>
    this.northUp()
      ? 'Brújula: norte arriba. Toca para que el mapa siga tu orientación'
      : 'Brújula: el mapa sigue tu orientación. Toca para poner el norte arriba',
  );
}
