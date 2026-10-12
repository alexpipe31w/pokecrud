import { TestBed } from '@angular/core/testing';
import { deltaDeg } from '../../game/geo/angles';
import { CompassService, ORIENTATION_SOURCE } from './compass.service';

describe('CompassService', () => {
  function setup() {
    const source = new EventTarget();
    TestBed.configureTestingModule({ providers: [{ provide: ORIENTATION_SOURCE, useValue: source }] });
    const svc = TestBed.inject(CompassService);
    const fire = (alpha: number | null, absolute = true) =>
      source.dispatchEvent(Object.assign(new Event('deviceorientationabsolute'), { alpha, absolute }));
    return { svc, fire };
  }

  it('sin eventos el rumbo es null (el mapa queda "norte arriba")', () => {
    const { svc } = setup();
    svc.start();
    expect(svc.heading()).toBeNull();
  });

  it('alpha 90 con el móvil en vertical = rumbo 270 (oeste)', () => {
    const { svc, fire } = setup();
    svc.start();
    fire(90);
    expect(svc.heading()).toBe(270);
  });

  it('de 359 a 1 se queda junto al norte (nunca da la vuelta por el sur)', () => {
    const { svc, fire } = setup();
    svc.start();
    fire(1); // rumbo 359
    fire(359); // rumbo 1
    expect(Math.abs(deltaDeg(svc.heading()!, 0))).toBeLessThan(2);
  });

  it('ignora eventos sin orientación absoluta o sin alpha', () => {
    const { svc, fire } = setup();
    svc.start();
    fire(90, false);
    fire(null);
    expect(svc.heading()).toBeNull();
  });

  it('tras stop() deja de escuchar', () => {
    const { svc, fire } = setup();
    svc.start();
    svc.stop();
    fire(90);
    expect(svc.heading()).toBeNull();
  });
});
