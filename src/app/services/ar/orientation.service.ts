import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import * as THREE from 'three';

import { deviceEventQuaternion, sensorQuaternion } from '../../game/encounter-scene/device-pose';
import { PoseDelay } from '../../game/encounter-scene/pose-delay';

/** Lo mínimo de la Generic Sensor API (no está en lib.dom de TypeScript). */
export interface OrientationSensorLike extends EventTarget {
  quaternion?: ArrayLike<number> | null;
  start(): void;
  stop(): void;
}
export type OrientationSensorCtor = new (opts: {
  frequency: number;
  referenceFrame: 'device' | 'screen';
}) => OrientationSensorLike;

/** `RelativeOrientationSensor` del WebView (token para los tests, D-016); null si no existe. */
export const ORIENTATION_SENSOR = new InjectionToken<OrientationSensorCtor | null>(
  'ORIENTATION_SENSOR',
  {
    providedIn: 'root',
    factory: () =>
      (globalThis as { RelativeOrientationSensor?: OrientationSensorCtor })
        .RelativeOrientationSensor ?? null,
  },
);

/** El vídeo llega ~80 ms tarde respecto a los sensores en el A36: se retrasa la orientación lo mismo (D-045). */
export const ORIENTATION_DELAY_MS = 80;

export type OrientationSource = 'sensor' | 'event' | 'none';

const screenAngle = (): number =>
  (typeof screen !== 'undefined' ? screen.orientation?.angle : 0) ?? 0;

/**
 * Orientación del móvil para la AR (D-045): `RelativeOrientationSensor` a 60 Hz (más suave) y, si no existe o falla,
 * el evento `deviceorientation` (que deja de llegar con el móvil quieto: por eso se guarda la última). Solo
 * orientación: si el jugador camina, el Pokémon no se queda en su sitio.
 */
@Injectable({ providedIn: 'root' })
export class OrientationService {
  private readonly Sensor = inject(ORIENTATION_SENSOR);
  private readonly _source = signal<OrientationSource>('none');
  private readonly _ready = signal(false);
  private buffer = new PoseDelay();
  private sensor: OrientationSensorLike | null = null;
  private running = false;
  private readonly tmp = new THREE.Quaternion();

  /** De dónde sale la orientación ahora. */
  readonly source = this._source.asReadonly();
  /** Ya llegó al menos una lectura (si tras ~1,5 s sigue en false: sin giroscopio). */
  readonly ready = this._ready.asReadonly();

  start(): void {
    if (this.running) return;
    this.running = true;
    if (!this.Sensor) return this.useEvent();
    try {
      const sensor = new this.Sensor({ frequency: 60, referenceFrame: 'device' });
      sensor.addEventListener('reading', this.onReading);
      sensor.addEventListener('error', this.onSensorError);
      sensor.start();
      this.sensor = sensor;
      this._source.set('sensor');
    } catch (err) {
      console.warn('[orientation] RelativeOrientationSensor', err);
      this.useEvent();
    }
  }

  stop(): void {
    this.running = false;
    this.dropSensor();
    window.removeEventListener('deviceorientation', this.onEvent);
    this.buffer = new PoseDelay();
    this._source.set('none');
    this._ready.set(false);
  }

  /** Orientación de hace `ORIENTATION_DELAY_MS` (a la par del vídeo) en `out`; false si aún no hay ninguna. */
  pose(now: number, out: THREE.Quaternion): boolean {
    return this.buffer.sample(now - ORIENTATION_DELAY_MS, out);
  }

  private useEvent(): void {
    this.dropSensor();
    window.addEventListener('deviceorientation', this.onEvent);
    this._source.set('event');
  }

  private dropSensor(): void {
    if (!this.sensor) return;
    this.sensor.removeEventListener('reading', this.onReading);
    this.sensor.removeEventListener('error', this.onSensorError);
    this.sensor.stop();
    this.sensor = null;
  }

  private readonly onReading = () => {
    const q = this.sensor?.quaternion;
    if (q) this.push(sensorQuaternion(q, screenAngle(), this.tmp));
  };

  private readonly onSensorError = (e: Event) => {
    console.warn(
      '[orientation] RelativeOrientationSensor',
      (e as Event & { error?: unknown }).error,
    );
    if (this.running) this.useEvent();
  };

  private readonly onEvent = (e: Event) => {
    const { alpha, beta, gamma } = e as DeviceOrientationEvent;
    if (alpha === null || beta === null || gamma === null) return;
    this.push(deviceEventQuaternion(alpha, beta, gamma, screenAngle(), this.tmp));
  };

  private push(q: THREE.Quaternion): void {
    this.buffer.push(performance.now(), q);
    if (!this._ready()) this._ready.set(true);
  }
}
