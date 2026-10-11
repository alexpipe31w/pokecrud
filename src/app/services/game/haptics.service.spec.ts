import { TestBed } from '@angular/core/testing';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';
import { HAPTICS_PLUGIN, HapticsService } from './haptics.service';
import { SettingsService } from './settings.service';

describe('HapticsService', () => {
  const plugin = {
    impact: vi.fn(() => Promise.resolve()),
    notification: vi.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    localStorage.clear();
    plugin.impact.mockClear();
    plugin.notification.mockClear();
    TestBed.configureTestingModule({ providers: [{ provide: HAPTICS_PLUGIN, useValue: plugin }] });
  });

  it('vibra cuando los hápticos están activados', () => {
    const haptics = TestBed.inject(HapticsService);
    haptics.tap();
    haptics.success();
    expect(plugin.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
    expect(plugin.notification).toHaveBeenCalledWith({ type: NotificationType.Success });
  });

  it('no vibra si el jugador los desactivó', () => {
    TestBed.inject(SettingsService).update({ haptics: false });
    const haptics = TestBed.inject(HapticsService);
    haptics.tap();
    haptics.shake();
    haptics.success();
    expect(plugin.impact).not.toHaveBeenCalled();
    expect(plugin.notification).not.toHaveBeenCalled();
  });

  it('un fallo del plugin no lanza', async () => {
    plugin.impact.mockRejectedValueOnce(new Error('sin vibrador'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => TestBed.inject(HapticsService).throw()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
