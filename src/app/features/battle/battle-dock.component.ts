import { Component, inject, output, signal } from '@angular/core';
import type { TypeName } from '@shared/data/dataset.types';
import { BattleController } from './battle.controller';

/** Tipos oscuros: texto claro encima; el resto, texto tinta (contraste sobre el color del tipo). */
const DARK_TYPES = new Set<TypeName>([
  'fighting',
  'poison',
  'ghost',
  'dragon',
  'dark',
  'water',
  'psychic',
]);

/** Parte de abajo de la escena (F4-05): mensaje, 4 movimientos, cambiar/rendirse y el final del combate. */
@Component({
  selector: 'app-battle-dock',
  template: `
    <p class="message" aria-live="polite">{{ ctrl.message() }}</p>
    @switch (ctrl.phase() === 'animating' || ctrl.phase() === 'waiting' ? 'choose' : ctrl.phase()) {
      @case ('choose') {
        <div class="moves">
          @for (m of ctrl.moves(); track m.index) {
            <button
              class="move"
              [class.move--dark]="dark(m.type)"
              [style.--t]="'var(--t-' + m.type + ')'"
              [disabled]="busy() || (m.pp === 0 && anyPp())"
              (click)="ctrl.act({ kind: 'move', moveIndex: m.index })"
              [attr.aria-label]="
                m.name +
                ', ' +
                m.pp +
                ' de ' +
                m.maxPp +
                ' PP' +
                (m.effectiveness === null || m.effectiveness === 1
                  ? ''
                  : ', ' + effText(m.effectiveness))
              "
            >
              <span class="move__name">{{ m.name }}</span>
              <span class="move__meta">
                <span>PP {{ m.pp }}/{{ m.maxPp }}</span>
                @if (m.effectiveness !== null && m.effectiveness !== 1) {
                  <span class="eff"
                    >{{ effIcon(m.effectiveness) }} {{ effText(m.effectiveness) }}</span
                  >
                }
              </span>
            </button>
          }
        </div>
        <div class="actions">
          <button class="ghost" [disabled]="busy()" (click)="openSheet.emit()">Cambiar</button>
          <button class="ghost ghost--danger" [disabled]="busy()" (click)="forfeit()">
            {{ confirm() ? '¿Seguro? Toca otra vez' : 'Rendirse' }}
          </button>
        </div>
      }
      @case ('ended') {
        <div class="end">
          <h2 class="end__title" [class.end__title--win]="ctrl.winner() === 0">
            {{
              ctrl.winner() === 0 ? '¡Victoria!' : ctrl.winner() === 1 ? 'Derrota' : 'Sin resultado'
            }}
          </h2>
          <div class="actions">
            @if (ctrl.remote()) {
              <button class="primary" (click)="exit.emit()">Volver a la arena</button>
            } @else {
              <button class="primary" (click)="rematch()">Revancha</button>
              <button class="ghost" (click)="ctrl.backToPicker()">Otro rival</button>
            }
          </div>
        </div>
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      align-content: start;
      gap: var(--s-3);
      padding: var(--s-3) var(--s-4) calc(var(--ion-safe-area-bottom, 0px) + var(--s-4));
      background: var(--ink);
      color: var(--paper);
      border-top: 3px solid var(--accent);
    }
    button {
      font: inherit;
      color: inherit;
      border: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: transform var(--dur-press) var(--ease-out);
    }
    button:active:not(:disabled) {
      transform: scale(0.97);
    }
    .message {
      min-height: 3em;
      margin: 0;
      padding: var(--s-3) var(--s-4);
      border-radius: 16px;
      background: rgb(251 247 238 / 0.08);
      font-size: 1.05rem;
      line-height: 1.4;
    }
    .moves {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s-2);
    }
    .move {
      display: grid;
      gap: 4px;
      min-height: 66px;
      padding: var(--s-2) var(--s-3);
      text-align: left;
      border-radius: 16px;
      background: linear-gradient(160deg, color-mix(in srgb, var(--t) 80%, white), var(--t));
      color: var(--ink);
      box-shadow: inset 0 -3px 0 rgb(15 26 43 / 0.25);
    }
    .move--dark {
      color: var(--paper);
      text-shadow: 0 1px 1px rgb(0 0 0 / 0.35);
    }
    .move:disabled,
    .actions button:disabled {
      opacity: 0.45;
      transition: opacity var(--dur-small) var(--ease-out);
    }
    .move__name {
      font: 600 1rem/1.15 var(--font-display);
    }
    .move__meta {
      display: flex;
      justify-content: space-between;
      gap: var(--s-1);
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }
    .eff {
      font-weight: 700;
    }
    .actions {
      display: flex;
      gap: var(--s-2);
    }
    .actions button {
      flex: 1;
      min-height: 48px;
      border-radius: var(--r-chip);
      font-weight: 600;
    }
    .ghost {
      background: rgb(251 247 238 / 0.12);
    }
    .ghost--danger {
      color: #ffb3b5;
    }
    .primary {
      background: var(--accent);
      color: var(--accent-ink);
      box-shadow: var(--shadow-accent);
    }
    .end {
      display: grid;
      gap: var(--s-3);
      animation: pop 420ms var(--ease-out) both;
    }
    .end__title {
      margin: 0;
      text-align: center;
      font: 700 2.6rem/1 var(--font-display);
      letter-spacing: -0.02em;
    }
    .end__title--win {
      color: var(--gold);
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
    }
  `,
})
export class BattleDockComponent {
  protected readonly ctrl = inject(BattleController);
  readonly openSheet = output<void>();
  /** PvP terminado: volver a la arena (`/pvp`). */
  readonly exit = output<void>();
  protected readonly confirm = signal(false);
  private confirmTimer: ReturnType<typeof setTimeout> | undefined;

  /** Mientras se anima el turno el menú se queda (el diseño no salta) pero no se puede tocar. */
  protected busy(): boolean {
    return this.ctrl.phase() === 'animating' || this.ctrl.phase() === 'waiting';
  }

  protected anyPp(): boolean {
    return this.ctrl.moves().some((m) => m.pp > 0);
  }
  protected dark(type: TypeName): boolean {
    return DARK_TYPES.has(type);
  }
  protected effIcon(m: number): string {
    return m === 0 ? '✕' : m > 1 ? '▲' : '▼';
  }
  protected effText(m: number): string {
    return m === 0 ? 'No afecta' : m > 1 ? 'Súper eficaz' : 'Poco eficaz';
  }

  /** Rendirse pide confirmación (un toque por error no debe acabar el combate). */
  protected forfeit(): void {
    clearTimeout(this.confirmTimer);
    if (!this.confirm()) {
      this.confirm.set(true);
      this.confirmTimer = setTimeout(() => this.confirm.set(false), 2500);
      return;
    }
    this.confirm.set(false);
    void this.ctrl.act({ kind: 'forfeit' });
  }

  protected rematch(): void {
    const r = this.ctrl.rival();
    if (r) void this.ctrl.start(r);
  }
}
