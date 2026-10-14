import { Component, OnDestroy, computed, effect, input, output, signal } from '@angular/core';
import { natureNameEs } from '@shared/data/natures-es';
import type { CaughtView } from '@shared/protocol/encounters';

import { artUrls, sizeClass } from '../../game/encounter-scene/encounter-layout';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';

/** La XP cuenta hacia arriba en este tiempo (DISENO §5: "XP contando"), en pasos de ~40 ms. */
export const XP_COUNT_MS = 800;
const XP_STEPS = 20;

/**
 * "¡Capturado!" (F2-07, DISENO §5): el individuo que dio el servidor (`CaughtView`, sin IVs) con su arte, nivel,
 * naturaleza en español, sexo, tamaño y movimientos, y la XP ganada contando. Solo pinta: la página decide.
 */
@Component({
  selector: 'app-caught-card',
  imports: [GameButtonComponent, GlassPanelComponent],
  template: `
    <app-glass-panel size="lg" class="card" role="dialog" aria-label="Pokémon capturado">
      <p class="title">¡Capturado!</p>
      <img class="art" [src]="art()" [alt]="name()" width="160" height="160" (error)="nextArt()" />
      <h2 class="name">
        {{ name() }}
        @if (caught().shiny) {
          <span class="shiny" aria-label="variocolor">✦</span>
        }
      </h2>
      <dl class="facts">
        <div>
          <dt>Nivel</dt>
          <dd>{{ caught().level }}</dd>
        </div>
        <div>
          <dt>Naturaleza</dt>
          <dd>{{ nature() }}</dd>
        </div>
        @if (gender(); as g) {
          <div>
            <dt>Sexo</dt>
            <dd>{{ g }}</dd>
          </div>
        }
        @if (size(); as s) {
          <div>
            <dt>Tamaño</dt>
            <dd>{{ s }}</dd>
          </div>
        }
      </dl>
      @if (moveNames().length) {
        <p class="moves">{{ moveNames().join(' · ') }}</p>
      }
      <p class="xp">+{{ xpShown() }} XP</p>
      @if (candy() > 0) {
        <p class="candy">+{{ candyShown() }} caramelos de {{ candyName() }}</p>
      }
      <app-game-button label="Volver al mapa" [block]="true" (pressed)="done.emit()" />
      <button type="button" class="link" (click)="collection.emit()">Ver en Mis Pokémon</button>
    </app-glass-panel>
  `,
  styles: `
    .card {
      display: grid;
      justify-items: center;
      gap: var(--s-2);
      text-align: center;
    }
    .title {
      margin: 0;
      font: 700 2rem/1.05 var(--font-display);
      letter-spacing: -0.02em;
      color: var(--gold);
      text-shadow: 0 2px 0 var(--ink);
    }
    .art {
      width: 160px;
      height: 160px;
      object-fit: contain;
    }
    .name {
      margin: 0;
      font: 700 1.4rem/1.1 var(--font-display);
    }
    .shiny {
      color: var(--gold);
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--s-2) var(--s-4);
      margin: 0;
    }
    dt {
      font-size: 0.75rem;
      color: var(--ink-2);
    }
    dd {
      margin: 0;
      font-weight: 700;
    }
    .moves {
      margin: 0;
      font-size: 0.85rem;
    }
    .candy {
      margin: 0;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .link {
      min-height: 44px;
      border: 0;
      background: none;
      color: inherit;
      font: 600 0.95rem/1 system-ui;
      text-decoration: underline;
    }
    .xp {
      margin: 0;
      font: 700 1.2rem/1 var(--font-display);
      font-variant-numeric: tabular-nums;
      color: var(--success);
    }
  `,
})
export class CaughtCardComponent implements OnDestroy {
  readonly caught = input.required<CaughtView>();
  readonly name = input.required<string>();
  /** Nombres en español de sus movimientos (la página los saca del dataset). */
  readonly moveNames = input<string[]>([]);
  readonly xp = input(0);
  /** Sin animación ("reducir efectos"). */
  readonly instant = input(false);
  /** Caramelos ganados (F3-02b, D-052) y nombre de su familia (la primera especie de la cadena). */
  readonly candy = input(0);
  readonly candyName = input('');
  readonly done = output<void>();
  /** "Ver en Mis Pokémon" (F3-02b). */
  readonly collection = output<void>();

  private readonly artIndex = signal(0);
  protected readonly art = computed(
    () => artUrls(this.caught().speciesId, this.caught().shiny)[this.artIndex()] ?? '',
  );
  protected readonly nature = computed(() => natureNameEs(this.caught().nature));
  protected readonly gender = computed(() => {
    const g = this.caught().gender;
    return g === 'M' ? '♂ Macho' : g === 'F' ? '♀ Hembra' : null;
  });
  protected readonly size = computed(() => sizeClass(this.caught().heightScale));
  protected readonly xpShown = signal(0);
  /** Los caramelos cuentan al ritmo de la XP (misma animación, mismo final). */
  protected readonly candyShown = computed(() =>
    this.xp() > 0 ? Math.round((this.candy() * this.xpShown()) / this.xp()) : this.candy(),
  );
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => this.countUp(this.xp(), this.instant()));
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  /** Si el arte no carga, el siguiente de la lista (CLAUDE.md: no todas las especies tienen todos). */
  protected nextArt(): void {
    this.artIndex.update((i) => i + 1);
  }

  private countUp(to: number, instant: boolean): void {
    clearInterval(this.timer);
    if (instant || to <= 0) {
      this.xpShown.set(Math.max(0, to));
      return;
    }
    let step = 0;
    this.xpShown.set(0);
    this.timer = setInterval(() => {
      step++;
      this.xpShown.set(Math.round((to * step) / XP_STEPS));
      if (step >= XP_STEPS) clearInterval(this.timer);
    }, XP_COUNT_MS / XP_STEPS);
  }
}
