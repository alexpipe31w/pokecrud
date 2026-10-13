import { Component, input, output } from '@angular/core';
import { GameButtonComponent } from '../../shared/ui/game-button.component';

/**
 * Las tres formas de encontrar rival (F5-03): "Buscar rival" es la principal (rojo Poké Ball); invitar y escribir un
 * código van con contorno claro, que sobre la arena de noche se leen como botones y no como desactivados.
 */
@Component({
  selector: 'app-pvp-actions',
  imports: [GameButtonComponent],
  template: `
    <app-game-button
      label="Buscar rival"
      [block]="true"
      [loading]="busy()"
      (pressed)="searchRival.emit()"
    />
    <div class="pair">
      <button type="button" [disabled]="busy()" (click)="invite.emit()">Invitar</button>
      <button type="button" [disabled]="busy()" (click)="join.emit()">Tengo un código</button>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--s-3);
    }
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s-3);
    }
    button {
      min-height: 52px;
      border: 2px solid color-mix(in srgb, var(--paper), transparent 55%);
      border-radius: var(--r-chip);
      background: color-mix(in srgb, var(--paper), transparent 94%);
      color: var(--paper);
      font: 600 1rem/1 var(--font-display);
      transition: transform var(--dur-press) var(--ease-out);
    }
    button:active {
      transform: scale(0.97);
    }
    button:focus-visible {
      outline: 3px solid var(--gold);
      outline-offset: 2px;
    }
    button:disabled {
      opacity: 0.5;
    }
  `,
})
export class PvpActionsComponent {
  readonly busy = input(false);
  readonly searchRival = output<void>();
  readonly invite = output<void>();
  readonly join = output<void>();
}
