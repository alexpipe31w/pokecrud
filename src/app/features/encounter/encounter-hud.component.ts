import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBack, informationCircleOutline } from 'ionicons/icons';

import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';

/**
 * Cabecera del encuentro (F2-04a): huir (arriba a la izquierda), la placa del Pokémon (nombre, ✦ si es shiny, nivel,
 * XS/XL), el interruptor de la AR y el botón de la ficha (F2-13: la abre y, otra vez, la cierra). Solo pinta: la
 * página decide.
 */
@Component({
  selector: 'app-encounter-hud',
  imports: [IonIcon, GlassPanelComponent],
  template: `
    <button type="button" class="btn" aria-label="Huir" (click)="flee.emit()">
      <ion-icon name="arrow-back" aria-hidden="true" />
    </button>
    <app-glass-panel class="tag">
      <span class="name"
        >{{ name() }}
        @if (shiny()) {
          <span class="shiny" aria-label="variocolor">✦</span>
        }
      </span>
      <span class="meta"
        >Nv. {{ level() }}
        @if (size(); as s) {
          <span class="size">{{ s }}</span>
        }
      </span>
    </app-glass-panel>
    <div class="side">
      <button
        type="button"
        class="btn btn--ar"
        [class.is-on]="ar()"
        [attr.aria-pressed]="ar()"
        aria-label="Realidad aumentada"
        (click)="toggleAr.emit()"
      >
        AR
      </button>
      <button
        type="button"
        class="btn"
        [class.is-on]="cardOpen()"
        [attr.aria-expanded]="cardOpen()"
        aria-label="Ficha del Pokémon"
        (click)="toggleCard.emit()"
      >
        <ion-icon name="information-circle-outline" aria-hidden="true" />
      </button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--s-2);
    }
    .btn {
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: var(--r-chip);
      background: var(--surface-opaque);
      color: var(--surface-text);
      font: 700 0.85rem/1 var(--font-display);
      box-shadow: var(--shadow-sm);
      transition: transform var(--dur-press) var(--ease-out);
    }
    .btn:active {
      transform: scale(0.94);
    }
    .side {
      display: grid;
      gap: var(--s-2);
    }
    ion-icon {
      font-size: 1.4rem;
    }
    .btn.is-on {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .tag {
      text-align: center;
      padding: var(--s-2) var(--s-4);
    }
    .name {
      display: block;
      font: 700 1.15rem/1.1 var(--font-display);
      letter-spacing: -0.02em;
    }
    .shiny {
      color: var(--gold);
    }
    .meta {
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
    }
    .size {
      margin-left: var(--s-1);
      padding: 0 var(--s-2);
      border-radius: var(--r-chip);
      background: var(--ink);
      color: var(--paper);
      font-weight: 700;
    }
  `,
})
export class EncounterHudComponent {
  readonly name = input.required<string>();
  readonly level = input.required<number>();
  readonly shiny = input(false);
  readonly size = input<'XS' | 'XL' | null>(null);
  readonly ar = input(true);
  readonly flee = output<void>();
  readonly toggleAr = output<void>();
  readonly cardOpen = input(false);
  readonly toggleCard = output<void>();

  constructor() {
    addIcons({ arrowBack, informationCircleOutline });
  }
}
