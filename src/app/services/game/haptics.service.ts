import { Injectable, InjectionToken, inject } from '@angular/core';
import { Haptics, HapticsPlugin, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SettingsService } from './settings.service';

/**
 * Plugin de vibración. Es un token para pasar un doble en los tests: con `vi.mock` del módulo, el
 * resultado dependía del orden de los specs (caché de módulos compartida entre archivos).
 */
export const HAPTICS_PLUGIN = new InjectionToken<Pick<HapticsPlugin, 'impact' | 'notification'>>(
  'HAPTICS_PLUGIN',
  { providedIn: 'root', factory: () => Haptics },
);

/** Vibraciones del juego. En web Capacitor las ignora sin error; aun así se capturan. */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  private readonly settings = inject(SettingsService);
  private readonly plugin = inject(HAPTICS_PLUGIN);

  tap(): void {
    this.run(() => this.plugin.impact({ style: ImpactStyle.Light }));
  }
  throw(): void {
    this.run(() => this.plugin.impact({ style: ImpactStyle.Medium }));
  }
  shake(): void {
    this.run(() => this.plugin.impact({ style: ImpactStyle.Heavy }));
  }
  success(): void {
    this.run(() => this.plugin.notification({ type: NotificationType.Success }));
  }

  private run(fn: () => Promise<void>): void {
    if (!this.settings.settings().haptics) return;
    fn().catch((err: unknown) => console.warn('[haptics]', err));
  }
}
