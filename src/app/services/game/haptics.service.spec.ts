import { TestBed } from '@angular/core/testing';
import { Haptics } from '@capacitor/haptics';
import { HapticsService } from './haptics.service';
import { SettingsService } from './settings.service';

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(() => Promise.resolve()),
    notification: vi.fn(() => Promise.resolve()),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS' },
}));

describe('HapticsService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(Haptics.impact).mockClear();
    vi.mocked(Haptics.notification).mockClear();
  });

  it('vibra cuando los hápticos están activados', () => {
    TestBed.inject(HapticsService).tap();
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });

  it('no vibra si el jugador los desactivó', () => {
    TestBed.inject(SettingsService).update({ haptics: false });
    const haptics = TestBed.inject(HapticsService);
    haptics.tap();
    haptics.shake();
    haptics.success();
    expect(Haptics.impact).not.toHaveBeenCalled();
    expect(Haptics.notification).not.toHaveBeenCalled();
  });

  it('un fallo del plugin no lanza', async () => {
    vi.mocked(Haptics.impact).mockRejectedValueOnce(new Error('sin vibrador'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => TestBed.inject(HapticsService).throw()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
