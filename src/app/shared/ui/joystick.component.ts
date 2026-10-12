import { Component, computed, inject, output, signal } from '@angular/core';

import { HapticsService } from '../../services/game/haptics.service';

export interface JoystickVector {
  /** −1..1 (derecha positiva), en radios del mando. */
  dx: number;
  /** −1..1 (abajo positivo, como la pantalla). */
  dy: number;
}

/** Recorrido máximo del mando desde el centro, en px (la base mide 120). */
const TRAVEL_PX = 44;

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/**
 * Joystick del modo demo / sin GPS (D-008): el mando sigue al dedo 1:1 dentro de la base y vuelve al centro al
 * soltar. Emite `vector` en cada movimiento y `{0,0}` al soltar. También responde a las flechas del teclado (PC).
 */
@Component({
  selector: 'app-joystick',
  template: `
    <div
      class="js"
      role="application"
      tabindex="0"
      aria-label="Joystick: mover al personaje"
      (pointerdown)="down($event)"
      (pointermove)="move($event)"
      (pointerup)="release()"
      (pointercancel)="release()"
      (lostpointercapture)="release()"
      (keydown)="key($event, true)"
      (keyup)="key($event, false)"
      (blur)="release()"
    >
      <div class="js__knob" [class.is-free]="!active()" [style.transform]="knob()"></div>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      left: var(--s-6);
      bottom: calc(var(--ion-safe-area-bottom, 0px) + var(--s-6));
      z-index: 10;
    }
    .js {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--surface);
      backdrop-filter: blur(20px) saturate(160%);
      border-top: 1px solid var(--glass-edge);
      box-shadow: var(--shadow-sm);
      touch-action: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .js:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 3px;
    }
    .js__knob {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: var(--shadow-accent);
      pointer-events: none;
    }
    .js__knob.is-free {
      transition: transform var(--dur-small) var(--ease-out);
    }
  `,
})
export class JoystickComponent {
  readonly vector = output<JoystickVector>();

  private readonly haptics = inject(HapticsService);
  private readonly offset = signal({ x: 0, y: 0 });
  private pointerId: number | null = null;
  private center = { x: 0, y: 0 };
  private readonly keys = new Set<string>();

  protected readonly active = signal(false);
  protected readonly knob = computed(() => `translate(${this.offset().x}px, ${this.offset().y}px)`);

  protected down(e: PointerEvent): void {
    if (this.pointerId !== null) return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    this.center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    this.pointerId = e.pointerId;
    el.setPointerCapture?.(e.pointerId);
    this.active.set(true);
    this.haptics.tap();
    this.follow(e.clientX - this.center.x, e.clientY - this.center.y);
  }

  protected move(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.follow(e.clientX - this.center.x, e.clientY - this.center.y);
  }

  protected release(): void {
    if (!this.active()) return;
    this.pointerId = null;
    this.keys.clear();
    this.active.set(false);
    this.offset.set({ x: 0, y: 0 });
    this.vector.emit({ dx: 0, dy: 0 });
  }

  protected key(e: KeyboardEvent, pressed: boolean): void {
    if (!(e.key in KEYS) || this.pointerId !== null) return;
    e.preventDefault();
    if (pressed) this.keys.add(e.key);
    else this.keys.delete(e.key);
    let x = 0;
    let y = 0;
    for (const k of this.keys) {
      x += KEYS[k][0];
      y += KEYS[k][1];
    }
    if (x === 0 && y === 0) return this.release();
    this.active.set(true);
    this.follow(x * TRAVEL_PX, y * TRAVEL_PX);
  }

  /** Coloca el mando en (x, y) px desde el centro, limitado al recorrido, y emite el vector en radios. */
  private follow(x: number, y: number): void {
    const len = Math.hypot(x, y);
    const k = len > TRAVEL_PX ? TRAVEL_PX / len : 1;
    this.offset.set({ x: x * k, y: y * k });
    this.vector.emit({ dx: (x * k) / TRAVEL_PX, dy: (y * k) / TRAVEL_PX });
  }
}
