import * as THREE from 'three';

import { MapScene } from './map-scene';

const frame = { east: 12, north: 30, speed: 1.4, facingDeg: 90, gait: 'walk' as const };

describe('MapScene', () => {
  it('coloca al jugador en metros locales (x = este, z = −norte)', () => {
    const s = new MapScene();
    s.setPlayer(frame, 0);
    expect(s.player.position.x).toBe(12);
    expect(s.player.position.z).toBe(-30);
    s.dispose();
  });

  it('el anillo de alcance late entre 0,5 y 0,8 de opacidad', () => {
    const s = new MapScene();
    const ring = s.player.children.find(
      (c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.RingGeometry,
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const seen: number[] = [];
    for (let t = 0; t < 1600; t += 100) {
      s.setPlayer(frame, t);
      seen.push(ring.material.opacity);
    }
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0.5);
    expect(Math.max(...seen)).toBeLessThanOrEqual(0.8);
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(0.25);
    s.dispose();
  });

  it('de noche la luz es más tenue que de día', () => {
    const s = new MapScene();
    const light = () =>
      s.scene.children.filter((c): c is THREE.Light => c instanceof THREE.Light).reduce((a, l) => a + l.intensity, 0);
    const day = light();
    s.setNight(true);
    expect(light()).toBeLessThan(day);
    s.setNight(false);
    expect(light()).toBe(day);
    s.dispose();
  });
});
