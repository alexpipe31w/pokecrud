import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import type { BallId } from '@shared/engine/capture';
import { ITEM_NAMES, type ItemId } from '@shared/engine/items';

import {
  curveOf,
  releaseVelocity,
  swipeToThrow,
  type GestureSample,
} from '../../game/encounter-scene/throw-gesture';

export interface ThrowIntent {
  power: number;
  aim: number;
  curve: -1 | 0 | 1;
}

const BALLS: BallId[] = ['POKE_BALL', 'GREAT_BALL', 'ULTRA_BALL'];
/** Muestras que se guardan del gesto: en el A36 llegan ~50 por segundo y dos círculos + lanzar duran ~1,7 s (D-050). */
const MAX_SAMPLES = 300;

/**
 * Abajo del encuentro (F2-05): qué bola y si con Frambu (con cuántas quedan) y la bola en la mano. La bola sigue al
 * dedo 1:1 respetando dónde se agarró (DISENO §4.6); al soltar hacia arriba emite `thrown` (potencia, puntería y
 * curva si antes se giró el dedo alrededor de la bola). Hacia abajo o lento: vuelve a la mano.
 */
@Component({
  selector: 'app-throw-dock',
  template: `
    <div class="items" role="group" aria-label="Bola y baya">
      @for (b of balls; track b) {
        <button
          type="button"
          class="chip"
          [class.is-on]="ball() === b"
          [attr.aria-pressed]="ball() === b"
          [disabled]="!count(b)"
          (click)="pick.emit(b)"
        >
          <span class="dot" [attr.data-ball]="b" aria-hidden="true"></span>{{ names[b] }}
          <b>{{ qty() ? count(b) : '–' }}</b>
        </button>
      }
      <button
        type="button"
        class="chip"
        [class.is-on]="berry()"
        [attr.aria-pressed]="berry()"
        [disabled]="!count('RAZZ_BERRY')"
        (click)="toggleBerry.emit()"
      >
        Frambu <b>{{ qty() ? count('RAZZ_BERRY') : '–' }}</b>
      </button>
    </div>
    <div
      #hand
      class="hand"
      role="button"
      tabindex="-1"
      aria-label="Desliza hacia arriba para lanzar"
      [attr.data-ball]="ball()"
      [class.is-dragging]="dragging()"
      [class.is-off]="disabled()"
      (pointerdown)="grab($event)"
      (pointermove)="drag($event)"
      (pointerup)="release($event)"
      (pointercancel)="cancel()"
    ></div>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--s-3);
    }
    .items {
      display: flex;
      gap: var(--s-1);
      flex-wrap: wrap;
      justify-content: center;
    }
    .chip {
      min-height: 36px;
      padding: 0 var(--s-3);
      border: 0;
      border-radius: var(--r-chip);
      background: var(--surface-opaque);
      color: var(--surface-text);
      font: 600 0.8rem/1 system-ui;
    }
    .chip.is-on {
      box-shadow: inset 0 0 0 2px var(--accent);
    }
    .chip:disabled {
      opacity: 0.45;
    }
    .dot,
    .hand {
      --top: var(--accent);
      background: linear-gradient(var(--top) 0 46%, var(--ink) 46% 54%, var(--paper) 54%);
      border-radius: 50%;
    }
    [data-ball='GREAT_BALL'] {
      --top: var(--t-water);
    }
    [data-ball='ULTRA_BALL'] {
      --top: var(--ink);
    }
    .dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: var(--s-1);
      vertical-align: -2px;
    }
    .hand {
      /* Por encima de los botones de bolas y bayas al arrastrarla hacia arriba. */
      position: relative;
      z-index: 1;
      width: 72px;
      height: 72px;
      box-shadow: var(--shadow-lg);
      touch-action: none;
      transition: transform var(--dur-panel) var(--ease-out);
    }
    .hand.is-dragging {
      transition: none;
    }
    .hand.is-off {
      opacity: 0;
      pointer-events: none;
    }
  `,
})
export class ThrowDockComponent {
  readonly ball = input.required<BallId>();
  readonly berry = input(false);
  readonly qty = input<Record<ItemId, number> | null>(null);
  /** Sin bola en la mano (vuela, la secuencia, sin bolas de esta clase). */
  readonly disabled = input(false);
  readonly pick = output<BallId>();
  readonly toggleBerry = output<void>();
  readonly grabbed = output<void>();
  readonly thrown = output<ThrowIntent>();

  protected readonly balls = BALLS;
  protected readonly names = ITEM_NAMES;
  protected readonly dragging = signal(false);
  private readonly handEl = viewChild.required<ElementRef<HTMLElement>>('hand');
  private samples: GestureSample[] = [];
  /** Centro de la bola al agarrarla y dónde se agarró respecto a él. */
  private origin = { x: 0, y: 0 };
  private offset = { x: 0, y: 0 };

  protected count(item: ItemId): number {
    return this.qty()?.[item] ?? 0;
  }

  protected grab(e: PointerEvent): void {
    if (this.disabled()) return;
    const el = this.handEl().nativeElement;
    el.setPointerCapture?.(e.pointerId);
    const r = el.getBoundingClientRect();
    this.origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    this.offset = { x: e.clientX - this.origin.x, y: e.clientY - this.origin.y };
    this.samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
    this.dragging.set(true);
    this.grabbed.emit();
  }

  protected drag(e: PointerEvent): void {
    if (!this.dragging()) return;
    this.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
    // 1:1 con el dedo, sin "saltar" al punto donde se agarró.
    this.handEl().nativeElement.style.transform = `translate(${e.clientX - this.origin.x - this.offset.x}px, ${e.clientY - this.origin.y - this.offset.y}px)`;
  }

  protected release(e: PointerEvent): void {
    if (!this.dragging()) return;
    this.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    const curve = curveOf(this.samples);
    const r = releaseVelocity(this.samples);
    const t = r ? swipeToThrow(r) : null;
    this.cancel();
    if (t) this.thrown.emit({ ...t, curve });
  }

  /** La bola vuelve a la mano (transición CSS). */
  protected cancel(): void {
    this.dragging.set(false);
    this.samples = [];
    this.handEl().nativeElement.style.transform = '';
  }
}
