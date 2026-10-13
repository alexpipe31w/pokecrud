import { Injectable, effect, signal } from '@angular/core';

export interface GameSettings {
  musicVolume: number; // 0..1
  sfxVolume: number;
  criesVolume: number;
  reduceEffects: boolean;
  joystickMode: boolean;
  haptics: boolean;
  /** Encuentro con la cámara (AR). Apagada → fondo ilustrado y cámara quieta (DISENO §6, F2-04a). */
  arEnabled: boolean;
}

const KEY = 'pokecrud.settings.v1';
const DEFAULTS: GameSettings = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  criesVolume: 0.9,
  reduceEffects: false,
  joystickMode: false,
  haptics: true,
  arEnabled: true,
};

/** Preferencias del jugador (no sensibles) persistidas en localStorage. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<GameSettings>(this.load());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.settings()));
      } catch (err) {
        console.warn('[settings] no se pudo guardar', err);
      }
    });
  }

  update(patch: Partial<GameSettings>): void {
    this.settings.update((s) => ({ ...s, ...patch }));
  }

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GameSettings>) } : DEFAULTS;
    } catch {
      return DEFAULTS; // localStorage bloqueado o JSON corrupto: se arranca con valores por defecto
    }
  }
}
