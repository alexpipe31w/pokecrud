import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../core/auth/auth.service';
import { SettingsService } from '../../services/game/settings.service';
import { ServerWakingComponent, WAKING_MESSAGES } from './server-waking.component';

describe('ServerWakingComponent (F1-09)', () => {
  const waking = signal(false);
  const wakeAttempt = signal(0);

  beforeEach(() => {
    waking.set(false);
    wakeAttempt.set(0);
    TestBed.configureTestingModule({
      imports: [ServerWakingComponent],
      providers: [
        { provide: AuthService, useValue: { waking, wakeAttempt } },
        { provide: SettingsService, useValue: { settings: () => ({ reduceEffects: false }) } },
      ],
    });
  });

  const render = () => {
    const f = TestBed.createComponent(ServerWakingComponent);
    f.detectChanges();
    return f;
  };
  const text = (f: ReturnType<typeof render>) => (f.nativeElement as HTMLElement).textContent ?? '';

  it('sin espera no enseña nada', () => {
    expect(text(render()).trim()).toBe('');
  });

  it('con el servidor despertando: mensaje simpático y, desde el 2.º intento, el número', () => {
    const f = render();
    waking.set(true);
    wakeAttempt.set(1);
    f.detectChanges();
    expect(text(f)).toContain(WAKING_MESSAGES[0]);
    expect(text(f)).not.toContain('Intento');
    wakeAttempt.set(3);
    f.detectChanges();
    expect(text(f)).toContain('Intento 3');
  });

  it('los mensajes se van turnando', () => {
    vi.useFakeTimers();
    try {
      const f = render();
      waking.set(true);
      f.detectChanges();
      TestBed.tick();
      vi.advanceTimersByTime(3600);
      f.detectChanges();
      expect(text(f)).toContain(WAKING_MESSAGES[1]);
    } finally {
      vi.useRealTimers();
    }
  });
});
