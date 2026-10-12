import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { fromLocalM, type LatLng } from '@shared/engine/geo';
import { GpsFilter, type FilteredFix } from '../../game/geo/gps-filter';
import { SettingsService } from '../game/settings.service';

/** Lo que se usa del plugin (inyectable para los tests, D-016). */
export type GeoPlugin = Pick<
  typeof Geolocation,
  'checkPermissions' | 'requestPermissions' | 'watchPosition' | 'clearWatch'
>;
export const GEOLOCATION_PLUGIN = new InjectionToken<GeoPlugin>('GEOLOCATION_PLUGIN', {
  providedIn: 'root',
  factory: () => Geolocation,
});

/** idle → (prompt) → searching → ok/weak; denied/unavailable → modo joystick; joystick = posición virtual. */
export type LocationStatus = 'idle' | 'prompt' | 'searching' | 'ok' | 'weak' | 'denied' | 'unavailable' | 'joystick';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly plugin = inject(GEOLOCATION_PLUGIN);
  private readonly settings = inject(SettingsService);
  private readonly filter = new GpsFilter();
  private watchId: string | null = null;

  readonly status = signal<LocationStatus>('idle');
  readonly position = signal<FilteredFix | null>(null);

  /** Pide permiso si hace falta y empieza a escuchar el GPS. Nunca lanza: los fallos van a `status`. */
  async start(): Promise<void> {
    if (this.settings.settings().joystickMode) return this.status.set('joystick');
    try {
      let perm = (await this.plugin.checkPermissions()).location;
      if (perm === 'prompt' || perm === 'prompt-with-rationale') {
        this.status.set('prompt');
        perm = (await this.plugin.requestPermissions({ permissions: ['location'] })).location;
      }
      if (perm !== 'granted') return this.fallBackToJoystick('denied');
      this.status.set('searching');
      this.watchId = await this.plugin.watchPosition(
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
        (pos, err) => {
          if (err || !pos) {
            if (!this.position()) this.status.set('searching');
            return;
          }
          const out = this.filter.push({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          });
          if (!out || this.settings.settings().joystickMode) return;
          this.position.set(out);
          this.status.set(out.weak ? 'weak' : 'ok');
        },
      );
    } catch (err) {
      console.warn('[location] GPS no disponible', err);
      this.fallBackToJoystick('unavailable');
    }
  }

  async stop(): Promise<void> {
    if (this.watchId) await this.plugin.clearWatch({ id: this.watchId });
    this.watchId = null;
    this.filter.reset();
  }

  /** Activa el modo joystick partiendo de `origin` (la última posición real, o el centro por defecto). */
  useJoystickAt(origin: LatLng): void {
    this.settings.update({ joystickMode: true });
    this.position.set({ ...origin, accuracy: 0, timestamp: Date.now(), weak: false });
    this.status.set('joystick');
  }

  /** Mueve la posición virtual del joystick `east`/`north` metros. */
  nudge(east: number, north: number): void {
    const p = this.position();
    if (!p || this.status() !== 'joystick') return;
    this.position.set({ ...fromLocalM(p, east, north), accuracy: 0, timestamp: Date.now(), weak: false });
  }

  /** Vuelve al GPS real (botón en el menú de ajustes). */
  async useGps(): Promise<void> {
    this.settings.update({ joystickMode: false });
    this.filter.reset();
    await this.start();
  }

  // `status` se queda en denied/unavailable hasta que la pantalla llama a `useJoystickAt`: así la pantalla de
  // permisos puede explicar qué pasó antes de soltar al jugador con el joystick.
  private fallBackToJoystick(reason: 'denied' | 'unavailable'): void {
    this.settings.update({ joystickMode: true });
    this.status.set(reason);
  }
}
