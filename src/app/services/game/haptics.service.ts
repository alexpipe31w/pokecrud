import { Injectable, inject } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SettingsService } from './settings.service';

/** Vibraciones del juego. En web Capacitor las ignora sin error; aun así se capturan. */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  private readonly settings = inject(SettingsService);

  tap(): void {
    this.run(() => Haptics.impact({ style: ImpactStyle.Light }));
  }
  throw(): void {
    this.run(() => Haptics.impact({ style: ImpactStyle.Medium }));
  }
  shake(): void {
    this.run(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  }
  success(): void {
    this.run(() => Haptics.notification({ type: NotificationType.Success }));
  }

  private run(fn: () => Promise<void>): void {
    if (!this.settings.settings().haptics) return;
    fn().catch((err: unknown) => console.warn('[haptics]', err));
  }
}
