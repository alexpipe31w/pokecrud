import { Component, inject, input, output } from '@angular/core';
import { HpBarComponent } from '../../shared/ui/hp-bar.component';
import { BattleController } from './battle.controller';

/** Hoja para cambiar de Pokémon (F4-05): voluntaria (se puede cancelar) o forzada tras un debilitado. */
@Component({
  selector: 'app-battle-sheet',
  imports: [HpBarComponent],
  host: { role: 'dialog', '[attr.aria-label]': 'title()' },
  template: `
    <h2 class="title">{{ title() }}</h2>
    @for (p of ctrl.bench(); track p.index) {
      <button
        class="member"
        [disabled]="p.active || p.hp === 0"
        (click)="pick.emit(p.index)"
        [attr.aria-label]="
          p.name +
          ', ' +
          p.hp +
          ' de ' +
          p.maxHp +
          ' PS' +
          (p.hp === 0 ? ', debilitado' : p.active ? ', en combate' : '')
        "
      >
        <img [src]="sprite(p.speciesId)" alt="" width="56" height="56" />
        <span class="info">
          <strong
            >{{ p.name }} <small>Nv {{ p.level }}</small></strong
          >
          <app-hp-bar [current]="p.hp" [max]="p.maxHp" />
        </span>
        <span class="state">
          {{ p.hp === 0 ? 'Debilitado' : p.active ? 'En combate' : p.hp + '/' + p.maxHp }}
        </span>
      </button>
    }
    @if (!forced()) {
      <button class="cancel" (click)="dismiss.emit()">Cancelar</button>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: auto 0 0;
      z-index: 10;
      display: grid;
      gap: var(--s-2);
      padding: var(--s-4) var(--s-4) calc(var(--ion-safe-area-bottom, 0px) + var(--s-4));
      border-radius: var(--r-sheet) var(--r-sheet) 0 0;
      background: var(--surface);
      color: var(--surface-text);
      backdrop-filter: blur(20px) saturate(160%);
      border-top: 1px solid var(--glass-edge);
      box-shadow: var(--shadow-lg);
      animation: up 320ms var(--ease-drawer) both;
    }
    @keyframes up {
      from {
        transform: translateY(100%);
      }
    }
    .title {
      margin: 0 0 var(--s-1);
      font: 600 1.2rem/1.2 var(--font-display);
    }
    button {
      font: inherit;
      color: inherit;
      border: 0;
      cursor: pointer;
    }
    .member {
      display: grid;
      grid-template-columns: 56px 1fr auto;
      align-items: center;
      gap: var(--s-3);
      min-height: 64px;
      padding: var(--s-1) var(--s-3);
      border-radius: 16px;
      background: rgb(15 26 43 / 0.06);
      text-align: left;
      transition: transform var(--dur-press) var(--ease-out);
    }
    .member:active:not(:disabled) {
      transform: scale(0.97);
    }
    .member:disabled {
      opacity: 0.5;
    }
    .member img {
      image-rendering: pixelated;
    }
    .info {
      display: grid;
      gap: 4px;
    }
    .state {
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
      opacity: 0.8;
    }
    .cancel {
      min-height: 44px;
      background: none;
      text-decoration: underline;
    }
  `,
})
export class BattleSheetComponent {
  protected readonly ctrl = inject(BattleController);
  readonly forced = input(false);
  readonly pick = output<number>();
  readonly dismiss = output<void>();

  protected title(): string {
    return this.forced() ? '¿Qué Pokémon vas a sacar?' : 'Cambiar de Pokémon';
  }
  protected sprite(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }
}
