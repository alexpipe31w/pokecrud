import { Component, computed, inject, input, output, signal } from '@angular/core';
import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { spriteUrls } from '../../core/utils/sprites';
import { DatasetService } from '../../services/game/dataset.service';
import { ConfirmPanelComponent } from '../../shared/ui/confirm-panel.component';

interface Corner {
  name: string;
  art: string;
  pokemon: string;
  tint: string;
}

/**
 * Cara a cara al emparejar (F5-03, el momento de la pantalla): cada mitad de la arena se tiñe con el tipo del Pokémon
 * con el que sale cada uno, los dos entran desde su lado y el "VS" cae en medio. El combate por turnos en directo es
 * F5-04: hasta entonces, desde aquí solo se puede rendirse (con confirmación: cuenta como derrota).
 */
@Component({
  selector: 'app-pvp-versus',
  imports: [ConfirmPanelComponent],
  template: `
    <h2 class="title">¡Rival encontrado!</h2>
    <div class="arena" role="img" [attr.aria-label]="label()">
      <div class="half me" [style.--tint]="me().tint">
        <img [src]="me().art" alt="" width="160" height="160" />
        <p class="who">
          <strong>{{ me().name }}</strong
          >{{ me().pokemon }}
        </p>
      </div>
      <div class="half foe" [style.--tint]="foe().tint">
        @if (foe().art) {
          <img [src]="foe().art" alt="" width="160" height="160" />
        }
        <p class="who">
          <strong>{{ foe().name }}</strong
          >{{ foe().pokemon }}
        </p>
      </div>
      <span class="vs" aria-hidden="true">VS</span>
    </div>
    <p class="soon">El combate por turnos en directo llega en la próxima versión.</p>
    @if (confirming()) {
      <app-confirm-panel
        message="Si te rindes, gana tu rival."
        confirmLabel="Rendirme"
        [danger]="true"
        [busy]="busy()"
        (confirmed)="forfeit.emit()"
        (cancelled)="confirming.set(false)"
      />
    } @else {
      <button type="button" class="quit" (click)="confirming.set(true)">Rendirse</button>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--s-4);
      justify-items: center;
    }
    .title {
      margin: 0;
      color: var(--gold);
      font: 700 1.9rem/1.05 var(--font-display);
      letter-spacing: -0.02em;
    }
    .arena {
      position: relative;
      width: 100%;
      height: 340px;
      border-radius: var(--r-sheet);
      overflow: hidden;
      box-shadow: 0 18px 40px rgb(0 0 0 / 0.45);
    }
    .half {
      position: absolute;
      inset: 0;
      display: grid;
      padding: var(--s-4);
      background: radial-gradient(
        circle at var(--at),
        color-mix(in srgb, var(--tint), white 15%),
        color-mix(in srgb, var(--tint), var(--ink) 65%)
      );
    }
    .me {
      --at: 28% 70%;
      clip-path: polygon(0 0, 58% 0, 42% 100%, 0 100%);
      align-content: end;
      animation: from-left 520ms var(--ease-out) both;
    }
    .foe {
      --at: 72% 30%;
      clip-path: polygon(58% 0, 100% 0, 100% 100%, 42% 100%);
      justify-items: end;
      text-align: right;
      animation: from-right 520ms var(--ease-out) 80ms both;
    }
    img {
      position: absolute;
      width: 46%;
      height: auto;
      filter: drop-shadow(0 10px 12px rgb(0 0 0 / 0.45));
    }
    .me img {
      left: 2%;
      bottom: 18%;
    }
    .foe img {
      right: 2%;
      top: 4%;
      transform: scaleX(-1);
    }
    .who {
      position: relative;
      display: grid;
      margin: 0;
      color: var(--paper);
      text-shadow: 0 2px 6px rgb(0 0 0 / 0.6);
    }
    .who strong {
      font: 700 1.25rem/1.1 var(--font-display);
    }
    .vs {
      position: absolute;
      left: 50%;
      top: 50%;
      translate: -50% -50%;
      color: var(--paper);
      font: 700 3.4rem/1 var(--font-display);
      letter-spacing: -0.03em;
      text-shadow:
        0 4px 0 var(--accent),
        0 10px 22px rgb(0 0 0 / 0.6);
      animation: stamp 380ms var(--ease-out) 460ms both;
    }
    .soon {
      margin: 0;
      text-align: center;
      color: color-mix(in srgb, var(--paper), transparent 25%);
    }
    .quit {
      min-height: 44px;
      padding: 0 var(--s-6);
      border: 0;
      background: transparent;
      color: var(--paper);
      font: 600 1rem/1 var(--font-display);
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    @keyframes from-left {
      from {
        transform: translateX(-40%);
        opacity: 0;
      }
    }
    @keyframes from-right {
      from {
        transform: translateX(40%);
        opacity: 0;
      }
    }
    @keyframes stamp {
      from {
        scale: 1.6;
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .me,
      .foe,
      .vs {
        animation-name: fade;
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
    }
  `,
})
export class PvpVersusComponent {
  private readonly dataset = inject(DatasetService);
  readonly myName = input.required<string>();
  readonly opponent = input.required<string>();
  readonly myLead = input.required<number>();
  readonly foeLead = input<number | null>(null);
  readonly busy = input(false);
  readonly forfeit = output<void>();

  protected readonly confirming = signal(false);
  protected readonly me = computed(() => this.corner(this.myName(), this.myLead()));
  protected readonly foe = computed(() => this.corner(this.opponent(), this.foeLead()));
  protected readonly label = computed(
    () =>
      `${this.me().name} con ${this.me().pokemon} contra ${this.foe().name} con ${this.foe().pokemon}`,
  );

  private corner(name: string, speciesId: number | null): Corner {
    const s = speciesId ? this.dataset.species().get(speciesId) : undefined;
    return {
      name,
      art: speciesId ? spriteUrls(speciesId)[0] : '',
      pokemon: s?.names.es ?? '¿?',
      tint: POKEMON_TYPES[s?.types[0] ?? '']?.color ?? 'var(--ink-2)',
    };
  }
}
