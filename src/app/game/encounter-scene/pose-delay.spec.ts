import * as THREE from 'three';
import { PoseDelay } from './pose-delay';

const yawQ = (deg: number) =>
  new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
const angleDeg = (a: THREE.Quaternion, b: THREE.Quaternion) => THREE.MathUtils.radToDeg(a.angleTo(b));

describe('PoseDelay', () => {
  it('sin muestras no devuelve nada', () => {
    expect(new PoseDelay().sample(0, new THREE.Quaternion())).toBe(false);
  });

  it('interpola entre las dos muestras que rodean el instante pedido', () => {
    const d = new PoseDelay();
    d.push(0, yawQ(0));
    d.push(100, yawQ(90));
    const out = new THREE.Quaternion();
    expect(d.sample(50, out)).toBe(true);
    expect(angleDeg(out, yawQ(45))).toBeCloseTo(0, 4);
  });

  it('antes de la primera da la primera y después de la última da la última', () => {
    const d = new PoseDelay();
    d.push(0, yawQ(10));
    d.push(100, yawQ(20));
    const out = new THREE.Quaternion();
    d.sample(-50, out);
    expect(angleDeg(out, yawQ(10))).toBeCloseTo(0, 4);
    d.sample(500, out);
    expect(angleDeg(out, yawQ(20))).toBeCloseTo(0, 4);
  });

  it('copia las muestras (el que llama puede reutilizar su cuaternión)', () => {
    const d = new PoseDelay();
    const q = yawQ(30);
    d.push(0, q);
    q.copy(yawQ(80));
    const out = new THREE.Quaternion();
    d.sample(0, out);
    expect(angleDeg(out, yawQ(30))).toBeCloseTo(0, 4);
  });

  it('guarda solo las últimas `capacity` muestras', () => {
    const d = new PoseDelay(4);
    for (let i = 0; i < 10; i++) d.push(i * 10, yawQ(i));
    const out = new THREE.Quaternion();
    d.sample(0, out); // las 6 primeras ya no están: la más vieja es la de t = 60
    expect(angleDeg(out, yawQ(6))).toBeCloseTo(0, 4);
    d.sample(85, out);
    expect(angleDeg(out, yawQ(8.5))).toBeCloseTo(0, 4);
  });
});
