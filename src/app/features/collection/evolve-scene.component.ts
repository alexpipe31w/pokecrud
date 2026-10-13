import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import type { CollectionDetail } from '@shared/protocol/collection';
import { spriteUrls } from '../../core/utils/sprites';
import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { PULSE_MS, evolvePose } from './evolve-timeline';

/** Lo que necesita la escena para una evolución. `request` es el `POST …/evolve` ya lanzado. */
export interface EvolveRun {
  from: number;
  to: number;
  shiny: boolean;
  /** Mote o nombre de la especie de origen ("Chispa", "Pikachu"). */
  title: string;
  toName: string;
  request: Promise<CollectionDetail>;
}

/** Con "Reducir efectos": fundido A→B de 400 ms, sin alternar ni destello. */
const FADE_MS = 400;
/** Tras el error, lo que se ve el mensaje antes de cerrar. */
const ERROR_HOLD_MS = 1800;
/** La fanfarria suena después del grito (no a la vez). */
const FANFARE_DELAY_MS = 700;

type Phase = 'running' | 'done' | 'error';

/**
 * Animación de evolución a pantalla completa (F3-05, DISENO §5): fondo oscuro con rayos, silueta blanca alternando
 * entre la forma A y la B cada vez más rápido (`evolvePose`), destello y la forma nueva a color con su grito y la
 * vibración en el MISMO fotograma (DISENO §4.10). La petición sale antes de empezar y el destello espera su respuesta
 * (como la captura, D-046); si falla, vuelve a la forma A con el error y se cierra sola.
 */
@Component({
  selector: 'app-evolve-scene',
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': '"Evolución de " + run().title',
    '[class.reduced]': 'reduced()',
    '(click)': 'onTap()',
  },
  template: `
    <div class="rays" [style.opacity]="raysOpacity()" aria-hidden="true"></div>
    <div class="stage" [style.--glow]="pose().glow">
      <img
        class="form"
        [class.visible]="!pose().showB"
        [class.silhouette]="silhouette()"
        [style.opacity]="reduced() ? 1 - fade() : null"
        [src]="artA()"
        alt=""
        (error)="nextArt('a')"
      />
      <img
        class="form"
        [class.visible]="pose().showB"
        [class.silhouette]="silhouette()"
        [class.pop]="pose().revealed && !reduced()"
        [style.opacity]="reduced() ? fade() : null"
        [src]="artB()"
        alt=""
        (error)="nextArt('b')"
      />
    </div>
    <p class="caption" aria-live="polite">{{ caption() }}</p>
    @if (phase() === 'done') {
      <p class="hint">Toca para continuar</p>
    }
    <div class="burst" [style.opacity]="pose().burst" aria-hidden="true"></div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: grid;
      place-items: center;
      align-content: center;
      gap: var(--s-6);
      padding: var(--s-6) var(--s-4) calc(var(--ion-safe-area-bottom, 0px) + var(--s-6));
      background: radial-gradient(circle at 50% 42%, var(--ink-2), var(--ink) 70%);
      color: var(--accent-ink);
      overflow: hidden;
      animation: fade-in 240ms var(--ease-out) both;
      touch-action: manipulation;
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }
    .rays {
      position: absolute;
      left: 50%;
      top: 42%;
      width: 180vmax;
      height: 180vmax;
      translate: -50% -50%;
      background: repeating-conic-gradient(
        from 0deg,
        color-mix(in srgb, var(--accent-ink) 14%, transparent) 0deg 8deg,
        transparent 8deg 24deg
      );
      mask: radial-gradient(circle, black 10%, transparent 55%);
      animation: spin 9s linear infinite;
      transition: opacity 300ms var(--ease-out);
      pointer-events: none;
    }
    @keyframes spin {
      to {
        rotate: 360deg;
      }
    }
    .stage {
      position: relative;
      width: min(64vw, 260px);
      aspect-ratio: 1;
    }
    .form {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      visibility: hidden;
    }
    .form.visible {
      visibility: visible;
    }
    .silhouette {
      filter: brightness(0) invert(1)
        drop-shadow(0 0 calc(4px + 28px * var(--glow)) var(--accent-ink))
        drop-shadow(0 0 calc(12px * var(--glow)) var(--gold));
    }
    .pop {
      animation: pop 520ms var(--ease-out) both;
    }
    @keyframes pop {
      from {
        transform: scale(1.18);
      }
    }
    .caption {
      position: relative;
      margin: 0;
      max-width: 22ch;
      text-align: center;
      font: 700 1.35rem/1.25 var(--font-display);
      text-wrap: balance;
    }
    .hint {
      position: relative;
      margin: 0;
      opacity: 0.75;
      animation: breathe 1.6s ease-in-out infinite;
    }
    @keyframes breathe {
      50% {
        opacity: 0.4;
      }
    }
    .burst {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        circle at 50% 42%,
        white,
        color-mix(in srgb, var(--gold) 60%, white)
      );
      pointer-events: none;
    }
    :host(.reduced) .form {
      visibility: visible;
      transition: opacity ${FADE_MS}ms linear;
    }
    :host(.reduced) .rays {
      animation: none;
    }
  `,
})
export class EvolveSceneComponent {
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);

  readonly run = input.required<EvolveRun>();
  readonly reduced = input(false);
  /** Terminó bien: la ficha nueva. */
  readonly finished = output<CollectionDetail>();
  /** Falló: el mensaje para la ficha. */
  readonly failed = output<string>();

  protected readonly phase = signal<Phase>('running');
  private readonly elapsed = signal(0);
  private readonly burstAt = signal(Number.POSITIVE_INFINITY);
  private readonly error = signal<string | null>(null);
  private readonly artIdx = signal({ a: 0, b: 0 });
  private result: CollectionDetail | null = null;
  private start = 0;
  private frame = 0;
  private revealedOnce = false;
  private burstSfxPlayed = false;
  private readonly timers: ReturnType<typeof setTimeout>[] = [];

  protected readonly pose = computed(() => {
    if (this.error()) return { showB: false, glow: 0, burst: 0, revealed: false, done: true };
    if (this.reduced()) {
      const revealed = this.fade() >= 1;
      return { showB: true, glow: 0, burst: 0, revealed, done: revealed };
    }
    return evolvePose(this.elapsed(), this.burstAt());
  });
  /** Con "Reducir efectos": 0 = forma A, 1 = forma B. */
  protected readonly fade = computed(() =>
    Math.min(1, Math.max(0, (this.elapsed() - this.burstAt()) / FADE_MS)),
  );
  protected readonly silhouette = computed(
    () => !this.reduced() && !this.error() && !this.pose().revealed,
  );
  protected readonly raysOpacity = computed(() =>
    this.error() ? 0 : this.pose().revealed ? 1 : 0.35 + 0.65 * this.pose().glow,
  );
  protected readonly artA = computed(
    () => spriteUrls(this.run().from, this.run().shiny)[this.artIdx().a] ?? '',
  );
  protected readonly artB = computed(
    () => spriteUrls(this.run().to, this.run().shiny)[this.artIdx().b] ?? '',
  );
  protected readonly caption = computed(() => {
    const e = this.error();
    if (e) return e;
    const r = this.run();
    return this.pose().revealed
      ? `¡Tu ${r.title} evolucionó a ${r.toName}!`
      : `¿Eh? ¡${r.title} está evolucionando!`;
  });

  constructor() {
    queueMicrotask(() => this.begin());
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.frame);
      for (const t of this.timers) clearTimeout(t);
    });
  }

  protected nextArt(which: 'a' | 'b'): void {
    this.artIdx.update((i) => ({ ...i, [which]: i[which] + 1 }));
  }

  /** Al terminar, un toque cierra; antes no se puede saltar (la petición ya salió). */
  protected onTap(): void {
    if (this.phase() === 'done' && this.result) this.finished.emit(this.result);
  }

  private begin(): void {
    this.start = performance.now();
    this.run().request.then(
      (detail) => {
        this.result = detail;
        // El destello empieza al acabar la alternancia o, si el servidor tardó más, ya.
        this.burstAt.set(Math.max(this.reduced() ? 0 : PULSE_MS, performance.now() - this.start));
      },
      (err: unknown) => this.fail(err),
    );
    this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  private tick(now: number): void {
    this.elapsed.set(now - this.start);
    const p = this.pose();
    if (p.revealed && !this.revealedOnce) {
      // Grito y vibración en el mismo fotograma en que aparece la forma nueva (DISENO §4.10).
      this.revealedOnce = true;
      void this.audio.playCry(this.run().to);
      this.haptics.success();
      this.timers.push(setTimeout(() => void this.audio.playSfx('capture'), FANFARE_DELAY_MS));
    }
    if (!this.reduced() && this.elapsed() >= this.burstAt() && !this.burstSfxPlayed) {
      this.burstSfxPlayed = true;
      void this.audio.playSfx('shiny');
    }
    if (p.done && !this.error()) {
      this.phase.set('done');
      return;
    }
    if (this.phase() === 'running') this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  private fail(err: unknown): void {
    cancelAnimationFrame(this.frame);
    const e = err as { status?: number; error?: { message?: unknown } };
    const serverMsg = typeof e.error?.message === 'string' ? e.error.message : null;
    const msg =
      e.status === 409 && serverMsg
        ? serverMsg
        : e.status === 404
          ? 'Este Pokémon ya no está en tu colección.'
          : 'No se pudo evolucionar. Inténtalo de nuevo.';
    this.error.set(msg);
    this.phase.set('error');
    this.haptics.tap();
    this.timers.push(setTimeout(() => this.failed.emit(msg), ERROR_HOLD_MS));
  }
}
