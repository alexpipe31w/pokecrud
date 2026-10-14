import * as THREE from 'three';
import { BALL_RADIUS_M, createBall, disposeBall } from './ball-mesh';

const topColor = (g: THREE.Group) =>
  ((g.children[0] as THREE.Mesh).material as THREE.MeshLambertMaterial).color.getHexString();

describe('createBall', () => {
  it('Poké Ball: arriba roja, abajo crema, franja y botón (sin banda)', () => {
    const g = createBall('POKE_BALL');
    expect(g.children).toHaveLength(4);
    expect(topColor(g)).toBe('ff4d4d');
    disposeBall(g);
  });

  it('Super y Ultra llevan banda y su color', () => {
    const great = createBall('GREAT_BALL');
    const ultra = createBall('ULTRA_BALL');
    expect(great.children).toHaveLength(5);
    expect(topColor(great)).toBe('6390f0');
    expect(topColor(ultra)).toBe('0f1a2b');
    disposeBall(great);
    disposeBall(ultra);
  });

  it('mide BALL_RADIUS_M de radio', () => {
    const box = new THREE.Box3().setFromObject(createBall('POKE_BALL'));
    expect(box.max.y).toBeCloseTo(BALL_RADIUS_M, 6);
  });
});
