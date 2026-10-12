import { Component, inject, output } from '@angular/core';
import type { TrainerDef } from '@shared/data/trainers';
import { BattleController } from './battle.controller';

const DIFFICULTY_TEXT = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' } as const;

/** Elegir rival (y pantalla de error) del combate de prueba (F4-05). */
@Component({
  selector: 'app-battle-picker',
  template: `
    @if (ctrl.phase() === 'error') {
      <h1 class="display">Algo salió mal</h1>
      <p class="lead">{{ ctrl.error() }}</p>
      <button class="primary" (click)="retry()">Reintentar</button>
      <button class="link" (click)="ctrl.backToPicker()">Elegir otro rival</button>
    } @else {
      <header>
        <p class="eyebrow">Combate de prueba</p>
        <h1 class="display">Elige rival</h1>
        <p class="lead">Tu equipo: Pikachu, Bulbasaur y Squirtle, un nivel por encima del rival.</p>
      </header>
      @for (t of ctrl.trainers; track t.id; let i = $index) {
        <button
          class="trainer"
          [style.--i]="i"
          (click)="start(t)"
          [attr.aria-label]="t.name + ', dificultad ' + difficulty(t)"
        >
          <span class="trainer__head">
            <strong>{{ t.name }}</strong>
            <span class="badge" [attr.data-level]="t.difficulty">{{ difficulty(t) }}</span>
          </span>
          <span class="trainer__team">
            @for (m of t.team; track $index) {
              <span class="mini">
                <img [src]="sprite(m.speciesId)" alt="" loading="lazy" width="64" height="64" />
                <small>Nv {{ m.level }}</small>
              </span>
            }
          </span>
        </button>
      }
      <button class="link" (click)="leave.emit()">Volver</button>
    }
  `,
  styles: `
    :host {
      display: grid;
      align-content: start;
      gap: var(--s-4);
      min-height: 100%;
      padding: calc(var(--ion-safe-area-top, 0px) + var(--s-8)) var(--s-4) var(--s-8);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--accent) 14%, var(--paper)),
        var(--paper-2)
      );
      color: var(--ink);
    }
    @media (prefers-color-scheme: dark) {
      :host {
        background: linear-gradient(180deg, #24365a, var(--ink));
        color: var(--paper);
      }
    }
    .display {
      font: 700 2.4rem/1.05 var(--font-display);
      letter-spacing: -0.02em;
      margin: 0;
    }
    .eyebrow {
      margin: 0 0 var(--s-1);
      font-size: 0.85rem;
      opacity: 0.7;
    }
    .lead {
      margin: var(--s-2) 0 0;
      opacity: 0.85;
    }
    button {
      font: inherit;
      color: inherit;
      border: 0;
      cursor: pointer;
    }
    .trainer {
      display: grid;
      gap: var(--s-3);
      padding: var(--s-4);
      text-align: left;
      border-radius: var(--r-card);
      background: var(--surface);
      border-top: 1px solid var(--glass-edge);
      box-shadow: var(--shadow-sm);
      animation: in 360ms var(--ease-out) both;
      animation-delay: calc(var(--i) * 50ms);
      transition: transform var(--dur-press) var(--ease-out);
    }
    .trainer:active {
      transform: scale(0.97);
    }
    @keyframes in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
    .trainer__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font: 600 1.15rem/1.2 var(--font-display);
    }
    .badge {
      padding: 2px 10px;
      border-radius: var(--r-chip);
      font: 700 0.75rem/1.6 system-ui;
      background: var(--success);
      color: var(--ink);
    }
    .badge[data-level='normal'] {
      background: var(--gold);
    }
    .badge[data-level='hard'] {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .trainer__team {
      display: flex;
      gap: var(--s-3);
    }
    .mini {
      display: grid;
      justify-items: center;
      font-size: 0.75rem;
      opacity: 0.85;
    }
    .mini img {
      image-rendering: pixelated;
    }
    .primary {
      min-height: 48px;
      border-radius: var(--r-chip);
      background: var(--accent);
      color: var(--accent-ink);
      font-weight: 700;
      box-shadow: var(--shadow-accent);
    }
    .link {
      min-height: 44px;
      background: none;
      text-decoration: underline;
      opacity: 0.8;
    }
  `,
})
export class BattlePickerComponent {
  protected readonly ctrl = inject(BattleController);
  readonly leave = output<void>();

  protected start(t: TrainerDef): void {
    void this.ctrl.start(t);
  }
  protected retry(): void {
    const r = this.ctrl.rival();
    if (r) void this.ctrl.start(r);
  }
  protected difficulty(t: TrainerDef): string {
    return DIFFICULTY_TEXT[t.difficulty];
  }
  protected sprite(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }
}
