import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import {
  ORIENTATION_SENSOR,
  OrientationService,
  type OrientationSensorLike,
} from './orientation.service';

/** Sensor falso: el test decide cuándo hay lectura o error. */
class FakeSensor extends EventTarget implements OrientationSensorLike {
  static last: FakeSensor | null = null;
  quaternion: number[] | null = null;
  started = false;
  stopped = false;
  constructor(readonly opts: { frequency: number; referenceFrame: string }) {
    super();
    FakeSensor.last = this;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
  read(q: number[]) {
    this.quaternion = q;
    this.dispatchEvent(new Event('reading'));
  }
}

/** Cámara mirando al horizonte (−Z): el móvil de pie = 90° sobre el eje este. */
const UPRIGHT = (() => {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  return [q.x, q.y, q.z, q.w];
})();
const forward = (q: THREE.Quaternion) => new THREE.Vector3(0, 0, -1).applyQuaternion(q);
const later = () => performance.now() + 10_000;

describe('OrientationService', () => {
  const setup = (Sensor: unknown) => {
    TestBed.configureTestingModule({
      providers: [{ provide: ORIENTATION_SENSOR, useValue: Sensor }],
    });
    return TestBed.inject(OrientationService);
  };

  beforeEach(() => {
    FakeSensor.last = null;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('usa RelativeOrientationSensor a 60 Hz en el marco del móvil', () => {
    const o = setup(FakeSensor);
    o.start();
    expect(FakeSensor.last!.opts).toEqual({ frequency: 60, referenceFrame: 'device' });
    expect(FakeSensor.last!.started).toBe(true);
    expect(o.source()).toBe('sensor');
    expect(o.ready()).toBe(false);
    FakeSensor.last!.read(UPRIGHT);
    expect(o.ready()).toBe(true);
    const q = new THREE.Quaternion();
    expect(o.pose(later(), q)).toBe(true);
    expect(forward(q).distanceTo(new THREE.Vector3(0, 0, -1))).toBeCloseTo(0, 6);
    o.stop();
  });

  it('si el sensor falla pasa a deviceorientation', () => {
    const o = setup(FakeSensor);
    o.start();
    FakeSensor.last!.dispatchEvent(new Event('error'));
    expect(FakeSensor.last!.stopped).toBe(true);
    expect(o.source()).toBe('event');
    window.dispatchEvent(
      Object.assign(new Event('deviceorientation'), { alpha: 0, beta: 90, gamma: 0 }),
    );
    const q = new THREE.Quaternion();
    expect(o.pose(later(), q)).toBe(true);
    expect(forward(q).distanceTo(new THREE.Vector3(0, 0, -1))).toBeCloseTo(0, 6);
    o.stop();
  });

  it('sin la Generic Sensor API usa el evento; los eventos sin datos no cuentan', () => {
    const o = setup(null);
    o.start();
    expect(o.source()).toBe('event');
    window.dispatchEvent(
      Object.assign(new Event('deviceorientation'), { alpha: null, beta: null, gamma: null }),
    );
    expect(o.ready()).toBe(false);
    o.stop();
  });

  it('stop deja de escuchar y olvida la orientación', () => {
    const o = setup(null);
    o.start();
    window.dispatchEvent(
      Object.assign(new Event('deviceorientation'), { alpha: 0, beta: 90, gamma: 0 }),
    );
    o.stop();
    window.dispatchEvent(
      Object.assign(new Event('deviceorientation'), { alpha: 0, beta: 90, gamma: 0 }),
    );
    expect(o.ready()).toBe(false);
    expect(o.pose(later(), new THREE.Quaternion())).toBe(false);
    expect(o.source()).toBe('none');
  });
});
