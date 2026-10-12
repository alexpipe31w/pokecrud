import * as THREE from 'three';
import {
  cameraYaw,
  deviceEventQuaternion,
  sensorQuaternion,
  spotInFront,
} from './device-pose';

const forward = (q: THREE.Quaternion) => new THREE.Vector3(0, 0, -1).applyQuaternion(q);
const up = (q: THREE.Quaternion) => new THREE.Vector3(0, 1, 0).applyQuaternion(q);

function expectVec(v: THREE.Vector3, x: number, y: number, z: number): void {
  expect(v.x).toBeCloseTo(x, 6);
  expect(v.y).toBeCloseTo(y, 6);
  expect(v.z).toBeCloseTo(z, 6);
}

/** Cuaternión [x, y, z, w] de un giro de `deg` grados sobre el eje (ax, ay, az) del marco este-norte-arriba. */
function enu(ax: number, ay: number, az: number, deg: number): number[] {
  const q = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(ax, ay, az),
    THREE.MathUtils.degToRad(deg),
  );
  return [q.x, q.y, q.z, q.w];
}

describe('deviceEventQuaternion (evento deviceorientation, grados)', () => {
  it('tumbado boca arriba: la cámara trasera mira al suelo y la parte de arriba del móvil a −Z', () => {
    const q = deviceEventQuaternion(0, 0, 0, 0);
    expectVec(forward(q), 0, -1, 0);
    expectVec(up(q), 0, 0, -1);
  });

  it('de pie en vertical (beta 90): mira al horizonte (−Z) con el cielo arriba', () => {
    const q = deviceEventQuaternion(0, 90, 0, 0);
    expectVec(forward(q), 0, 0, -1);
    expectVec(up(q), 0, 1, 0);
  });

  it('alpha crece girando a la izquierda (visto desde arriba): con alpha 90 mira a −X', () => {
    const q = deviceEventQuaternion(90, 90, 0, 0);
    expectVec(forward(q), -1, 0, 0);
    expectVec(up(q), 0, 1, 0);
  });

  it('girar la pantalla no cambia hacia dónde mira, solo gira el "arriba" de la imagen', () => {
    const portrait = deviceEventQuaternion(30, 80, 10, 0);
    const landscape = deviceEventQuaternion(30, 80, 10, 90);
    expect(forward(landscape).distanceTo(forward(portrait))).toBeCloseTo(0, 6);
    expect(up(landscape).angleTo(up(portrait))).toBeCloseTo(Math.PI / 2, 6);
  });

  it('reutiliza el cuaternión de salida (sin crear objetos en cada fotograma)', () => {
    const out = new THREE.Quaternion();
    expect(deviceEventQuaternion(0, 90, 0, 0, out)).toBe(out);
  });
});

describe('sensorQuaternion (RelativeOrientationSensor, marco este-norte-arriba)', () => {
  it('sin giro = tumbado boca arriba, igual que el evento con todo a 0', () => {
    const q = sensorQuaternion([0, 0, 0, 1], 0);
    expectVec(forward(q), 0, -1, 0);
    expectVec(up(q), 0, 0, -1);
  });

  it('90° sobre el eje este = de pie mirando al horizonte, igual que beta 90', () => {
    const q = sensorQuaternion(enu(1, 0, 0, 90), 0);
    const ref = deviceEventQuaternion(0, 90, 0, 0);
    expect(forward(q).distanceTo(forward(ref))).toBeCloseTo(0, 6);
    expect(up(q).distanceTo(up(ref))).toBeCloseTo(0, 6);
  });

  it('coincide con el evento en una postura cualquiera', () => {
    // alpha 40 (Z), beta 70 (X), gamma −15 (Y): orden intrínseco Z-X'-Y'' de la especificación.
    const zxy = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(40))
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          THREE.MathUtils.degToRad(70),
        ),
      )
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          THREE.MathUtils.degToRad(-15),
        ),
      );
    const q = sensorQuaternion([zxy.x, zxy.y, zxy.z, zxy.w], 0);
    const ref = deviceEventQuaternion(40, 70, -15, 0);
    expect(forward(q).distanceTo(forward(ref))).toBeCloseTo(0, 6);
    expect(up(q).distanceTo(up(ref))).toBeCloseTo(0, 6);
  });
});

describe('cameraYaw', () => {
  it('0 mirando a −Z y π/2 mirando a −X (sentido contrario a las agujas, visto desde arriba)', () => {
    expect(cameraYaw(deviceEventQuaternion(0, 90, 0, 0))).toBeCloseTo(0, 6);
    expect(cameraYaw(deviceEventQuaternion(90, 90, 0, 0))).toBeCloseTo(Math.PI / 2, 6);
  });

  it('mirando al suelo usa hacia dónde apunta la parte de arriba del móvil', () => {
    expect(cameraYaw(deviceEventQuaternion(0, 0, 0, 0))).toBeCloseTo(0, 6);
    expect(cameraYaw(deviceEventQuaternion(90, 0, 0, 0))).toBeCloseTo(Math.PI / 2, 6);
  });

  it('inclinar el móvil hacia arriba o abajo no cambia el rumbo', () => {
    expect(cameraYaw(deviceEventQuaternion(60, 60, 0, 0))).toBeCloseTo(
      cameraYaw(deviceEventQuaternion(60, 120, 0, 0)),
      6,
    );
  });
});

describe('spotInFront', () => {
  it('pone el punto a `distance` metros en el suelo, en la dirección del rumbo', () => {
    expectVec(spotInFront(0, 3, -1.4), 0, -1.4, -3);
    expectVec(spotInFront(Math.PI / 2, 3, -1.4), -3, -1.4, 0);
  });
});
