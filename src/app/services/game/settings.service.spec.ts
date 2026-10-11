import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';

const KEY = 'pokecrud.settings.v1';

describe('SettingsService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('arranca con los valores por defecto', () => {
    const s = TestBed.inject(SettingsService).settings();
    expect(s).toEqual({
      musicVolume: 0.6,
      sfxVolume: 0.8,
      criesVolume: 0.9,
      reduceEffects: false,
      joystickMode: false,
      haptics: true,
    });
  });

  it('update cambia solo lo indicado y lo guarda en localStorage', () => {
    const service = TestBed.inject(SettingsService);
    service.update({ haptics: false, sfxVolume: 0.3 });
    TestBed.tick();
    expect(service.settings().haptics).toBe(false);
    expect(service.settings().musicVolume).toBe(0.6);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({
      haptics: false,
      sfxVolume: 0.3,
    });
  });

  it('lee lo guardado al crearse', () => {
    localStorage.setItem(KEY, JSON.stringify({ joystickMode: true }));
    const s = TestBed.inject(SettingsService).settings();
    expect(s.joystickMode).toBe(true);
    expect(s.criesVolume).toBe(0.9);
  });

  it('con JSON corrupto usa los valores por defecto', () => {
    localStorage.setItem(KEY, '{esto no es json');
    expect(TestBed.inject(SettingsService).settings().haptics).toBe(true);
  });
});
