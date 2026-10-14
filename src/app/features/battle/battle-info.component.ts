import { Component, computed, input } from '@angular/core';
import type { MajorStatus } from '@shared/engine/battle/types';
import { HpBarComponent } from '../../shared/ui/hp-bar.component';
import type { ShownPokemon } from './battle.controller';

const STATUS_CHIP: Record<MajorStatus, { label: string; title: string }> = {
  burn: { label: 'QUE', title: 'Quemado' },
  paralysis: { label: 'PAR', title: 'Paralizado' },
  poison: { label: 'ENV', title: 'Envenenado' },
  toxic: { label: 'TÓX', title: 'Gravemente envenenado' },
  sleep: { label: 'DOR', title: 'Dormido' },
  freeze: { label: 'CON', title: 'Congelado' },
};

/** Panel de vidrio de un Pokémon en combate (F4-05): nombre, nivel, estado, PS (con números si es el del jugador). */
@Component({
  selector: 'app-battle-info',
  imports: [HpBarComponent],
  host: { role: 'group', '[attr.aria-label]': 'label()' },
  template: `
    <div class="info__row">
      <strong class="info__name">{{ pokemon().name }}</strong>
      <span class="info__lv">Nv {{ pokemon().level }}</span>
    </div>
    <div class="info__row">
      @if (chip(); as c) {
        <span class="chip" [attr.data-status]="pokemon().status" [title]="c.title">{{
          c.label
        }}</span>
      }
      <app-hp-bar class="info__hp" [current]="pokemon().hp" [max]="pokemon().maxHp" />
    </div>
    @if (showNumbers()) {
      <span class="info__nums">{{ pokemon().hp }} / {{ pokemon().maxHp }}</span>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: var(--s-2) var(--s-3);
      border-radius: 16px;
      background: var(--surface);
      color: var(--surface-text);
      backdrop-filter: var(--glass-filter);
      border-top: 1px solid var(--glass-edge);
      box-shadow: var(--shadow-sm);
    }
    .info__row {
      display: flex;
      align-items: center;
      gap: var(--s-2);
    }
    .info__name {
      font: 600 1.05rem/1.2 var(--font-display);
      flex: 1;
    }
    .info__lv,
    .info__nums {
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
      opacity: 0.8;
    }
    .info__hp {
      flex: 1;
      margin-top: 4px;
    }
    .info__nums {
      display: block;
      text-align: right;
    }
    .chip {
      padding: 1px 6px;
      border-radius: var(--r-chip);
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--paper);
      background: var(--ink-2);
      &[data-status='burn'] {
        background: var(--t-fire);
      }
      &[data-status='paralysis'] {
        background: var(--t-electric);
        color: var(--ink);
      }
      &[data-status='poison'],
      &[data-status='toxic'] {
        background: var(--t-poison);
      }
      &[data-status='freeze'] {
        background: var(--t-ice);
        color: var(--ink);
      }
    }
  `,
})
export class BattleInfoComponent {
  readonly pokemon = input.required<ShownPokemon>();
  /** Solo el jugador ve sus PS exactos (como en los juegos). */
  readonly showNumbers = input(false);
  readonly rival = input(false);

  protected readonly chip = computed(() => {
    const st = this.pokemon().status;
    return st ? STATUS_CHIP[st] : null;
  });
  protected readonly label = computed(() => {
    const p = this.pokemon();
    const status = p.status ? `, ${STATUS_CHIP[p.status].title.toLowerCase()}` : '';
    return `${p.name}${this.rival() ? ' rival' : ''}, nivel ${p.level}, ${p.hp} de ${p.maxHp} PS${status}`;
  });
}
