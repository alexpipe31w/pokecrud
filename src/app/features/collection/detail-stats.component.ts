import { Component, computed, input } from '@angular/core';
import { natureNameEs } from '@shared/data/natures-es';
import { NATURE_EFFECTS, type BattleStat, type Stats } from '@shared/engine/battle/stats';
import { ivPercent, ivStars } from '@shared/engine/iv-appraisal';
import type { Nature } from '@shared/engine/spawns';
import { StatBarComponent } from '../../shared/ui/stat-bar.component';

const ORDER: (keyof Stats)[] = [
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
];
const LABEL: Record<keyof Stats, string> = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defensa',
  specialAttack: 'At. Esp.',
  specialDefense: 'Def. Esp.',
  speed: 'Velocidad',
};

/**
 * Valoración, IVs, stats reales y naturaleza del individuo (F3-03). Los IVs solo llegan para su dueño (D-052).
 * Barras de IVs sobre 31 y de stats sobre 255; la naturaleza marca qué stat sube (▲) y cuál baja (▼).
 */
@Component({
  selector: 'app-detail-stats',
  imports: [StatBarComponent],
  template: `
    <section aria-labelledby="iv-title">
      <h2 id="iv-title">
        Valoración
        <span class="stars" role="img" [attr.aria-label]="starsLabel()"
          ><span aria-hidden="true">{{ starsOn() }}</span
          ><span class="off" aria-hidden="true">{{ starsOff() }}</span></span
        >
        <span class="pct">{{ percent() }} %</span>
      </h2>
      @for (k of order; track k) {
        <app-stat-bar [label]="label[k]" [value]="ivs()[k]" [max]="31" color="var(--gold)" />
      }
      <h2>Estadísticas</h2>
      @for (k of order; track k) {
        <app-stat-bar [label]="label[k] + mark(k)" [value]="stats()[k]" [max]="255" />
      }
      <p class="nature">
        Naturaleza <strong>{{ natureName() }}</strong
        >&nbsp;
        @if (effect(); as e) {
          <span>· ▲ {{ label[e[0]] }} · ▼ {{ label[e[1]] }}</span>
        } @else {
          <span>· neutra</span>
        }
      </p>
    </section>
  `,
  styles: `
    section {
      display: grid;
      gap: var(--s-2);
    }
    h2 {
      display: flex;
      align-items: baseline;
      gap: var(--s-2);
      margin: var(--s-3) 0 0;
      font: 600 1.05rem/1 var(--font-display);
    }
    .stars {
      color: var(--gold);
      letter-spacing: 0.08em;
    }
    .off {
      color: currentColor;
      opacity: 0.25;
    }
    .stars .off {
      color: var(--ink-2);
    }
    .pct {
      margin-left: auto;
      font-variant-numeric: tabular-nums;
    }
    .nature {
      margin: var(--s-2) 0 0;
    }
  `,
})
export class DetailStatsComponent {
  readonly ivs = input.required<Stats>();
  readonly stats = input.required<Stats>();
  readonly nature = input.required<string>();

  protected readonly order = ORDER;
  protected readonly label = LABEL;
  protected readonly percent = computed(() => ivPercent(this.ivs()));
  private readonly stars = computed(() => ivStars(this.ivs()));
  /** Llenas en dorado y vacías apagadas (con 0 estrellas, tres ☆ doradas parecían tres estrellas). */
  protected readonly starsOn = computed(() =>
    this.stars() === 4 ? '★★★ ✦' : '★'.repeat(this.stars()),
  );
  protected readonly starsOff = computed(() =>
    this.stars() === 4 ? '' : '★'.repeat(3 - this.stars()),
  );
  protected readonly starsLabel = computed(() =>
    this.stars() === 4 ? 'perfecto' : `${this.stars()} de 3 estrellas`,
  );
  protected readonly natureName = computed(() => natureNameEs(this.nature()));
  protected readonly effect = computed(
    () => NATURE_EFFECTS[this.nature() as Nature] as readonly [BattleStat, BattleStat] | null,
  );

  protected mark(k: keyof Stats): string {
    const e = this.effect();
    return e?.[0] === k ? ' ▲' : e?.[1] === k ? ' ▼' : '';
  }
}
