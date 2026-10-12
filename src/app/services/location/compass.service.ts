import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { headingFromAlpha, smoothAngle } from '../../game/geo/angles';

/** De dónde llegan los eventos de orientación (inyectable para los tests, D-016). */
export const ORIENTATION_SOURCE = new InjectionToken<EventTarget>('ORIENTATION_SOURCE', {
  providedIn: 'root',
  factory: () => window,
});

/** Suavizado por evento (~60 Hz → responde en ~0,3 s sin temblar). */
export const COMPASS_ALPHA = 0.15;

const EVENT = 'deviceorientationabsolute';

/** Brújula del móvil (ARQUITECTURA §4): `deviceorientationabsolute` de Android con suavizado circular. */
@Injectable({ providedIn: 'root' })
export class CompassService {
  private readonly source = inject(ORIENTATION_SOURCE);
  private listening = false;

  /** Rumbo suavizado (0 = norte) o null si el móvil no da orientación absoluta (el mapa queda "norte arriba"). */
  readonly heading = signal<number | null>(null);

  private readonly onOrientation = (e: Event): void => {
    const { alpha, absolute } = e as DeviceOrientationEvent;
    if (!absolute || alpha == null) return;
    const h = headingFromAlpha(alpha, globalThis.screen?.orientation?.angle ?? 0);
    const prev = this.heading();
    this.heading.set(prev == null ? h : smoothAngle(prev, h, COMPASS_ALPHA));
  };

  start(): void {
    if (this.listening) return;
    this.listening = true;
    this.source.addEventListener(EVENT, this.onOrientation);
  }

  stop(): void {
    this.listening = false;
    this.source.removeEventListener(EVENT, this.onOrientation);
  }
}
