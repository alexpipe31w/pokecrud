import { TestBed } from '@angular/core/testing';
import { fromLocalM } from '@shared/engine/geo';
import { GEOLOCATION_PLUGIN, LocationService, type GeoPlugin } from './location.service';
import { SettingsService } from '../game/settings.service';

const O = { lat: 2.9273, lng: -75.2819 };

function fakePlugin(permission: 'granted' | 'denied' | 'prompt') {
  let cb: ((p: unknown, err?: unknown) => void) | undefined;
  const watches = { count: 0 };
  const plugin: GeoPlugin = {
    checkPermissions: async () => ({ location: permission, coarseLocation: permission }),
    requestPermissions: async () => ({ location: permission, coarseLocation: permission }),
    watchPosition: async (_opts, callback) => {
      watches.count++;
      cb = callback as typeof cb;
      return 'w1';
    },
    clearWatch: async () => undefined,
  };
  const emit = (east: number, north: number, t: number, accuracy = 5) => {
    const p = fromLocalM(O, east, north);
    cb!({ coords: { latitude: p.lat, longitude: p.lng, accuracy }, timestamp: t });
  };
  const emitError = (err: unknown) => cb!(null, err);
  return { plugin, emit, emitError, watches };
}

describe('LocationService', () => {
  // SettingsService guarda en localStorage: sin esto, el modo joystick de un test se arrastra al siguiente.
  beforeEach(() => localStorage.clear());

  function setup(permission: 'granted' | 'denied' | 'prompt') {
    const fake = fakePlugin(permission);
    TestBed.configureTestingModule({ providers: [{ provide: GEOLOCATION_PLUGIN, useValue: fake.plugin }] });
    return { svc: TestBed.inject(LocationService), ...fake };
  }

  it('con permiso: arranca, pasa a "ok" con el primer fix y publica la posición', async () => {
    const { svc, emit } = setup('granted');
    await svc.start();
    expect(svc.status()).toBe('searching');
    emit(0, 0, 1000);
    expect(svc.status()).toBe('ok');
    expect(svc.position()!.lat).toBeCloseTo(O.lat, 6);
  });

  it('sin permiso: estado "denied" y se activa el modo joystick', async () => {
    const { svc } = setup('denied');
    await svc.start();
    expect(svc.status()).toBe('denied');
    expect(TestBed.inject(SettingsService).settings().joystickMode).toBe(true);
  });

  it('el joystick mueve la posición virtual aunque no haya GPS', async () => {
    const { svc } = setup('denied');
    await svc.start();
    svc.useJoystickAt(O);
    svc.nudge(0, 10); // 10 m al norte
    expect(svc.position()!.lat).toBeGreaterThan(O.lat);
    expect(svc.status()).toBe('joystick');
  });

  it('web: requestPermissions no implementado → escucha igual (el navegador pide el permiso)', async () => {
    const { svc, plugin, emit } = setup('prompt');
    plugin.requestPermissions = async () => {
      throw Object.assign(new Error('Not implemented on web.'), { code: 'UNIMPLEMENTED' });
    };
    await svc.start();
    expect(svc.status()).toBe('searching');
    emit(0, 0, 1000);
    expect(svc.status()).toBe('ok');
  });

  it('el navegador deniega el permiso (error código 1) → "denied" y modo joystick', async () => {
    const { svc, emitError } = setup('granted');
    await svc.start();
    emitError({ code: 1, message: 'User denied Geolocation' });
    expect(svc.status()).toBe('denied');
    expect(TestBed.inject(SettingsService).settings().joystickMode).toBe(true);
  });

  it('llamar a start() dos veces no abre dos escuchas', async () => {
    const { svc, watches } = setup('granted');
    await svc.start();
    await svc.start();
    expect(watches.count).toBe(1);
  });

  it('un fix débil pone el estado "weak" (avisa, no bloquea)', async () => {
    const { svc, emit } = setup('granted');
    await svc.start();
    emit(0, 0, 1000, 40);
    expect(svc.status()).toBe('weak');
    expect(svc.position()).not.toBeNull();
  });
});
