import * as THREE from 'three';

import type { AvatarFrame } from './avatar-motion';
import { Avatar3D } from './avatar-3d';

const frame = (over: Partial<AvatarFrame> = {}): AvatarFrame => ({
  east: 0,
  north: 0,
  speed: 0,
  facingDeg: 0,
  gait: 'idle',
  ...over,
});

/** Simula `n` fotogramas a 60 fps desde `t0` (segundos). Devuelve el instante final. */
function run(a: Avatar3D, f: AvatarFrame, n: number, t0 = 0): number {
  let t = t0;
  for (let i = 0; i < n; i++) {
    a.update(f, t);
    t += 1 / 60;
  }
  return t;
}

function meshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) out.push(o);
  });
  return out;
}

/** Ángulo de las dos piernas (pivotes en la cadera = los dos primeros hijos del grupo raíz). */
const legs = (a: Avatar3D) => [a.root.children[0].rotation.x, a.root.children[1].rotation.x];

describe('Avatar3D', () => {
  it('cabe en el presupuesto: ≤ 12 mallas, sin sombras proyectadas y materiales compartidos', () => {
    const a = new Avatar3D(0xff4d4d);
    const ms = meshes(a.root);
    expect(ms.length).toBeLessThanOrEqual(12);
    expect(ms.every((m) => !m.castShadow)).toBe(true);
    expect(new Set(ms.map((m) => m.material)).size).toBeLessThan(ms.length);
    a.dispose();
  });

  it('quieto: las piernas no se mueven', () => {
    const a = new Avatar3D(0xff4d4d);
    run(a, frame(), 120);
    const [l, r] = legs(a);
    expect(Math.abs(l)).toBeLessThan(1e-3);
    expect(Math.abs(r)).toBeLessThan(1e-3);
    a.dispose();
  });

  it('andando: las piernas se balancean en oposición', () => {
    const a = new Avatar3D(0xff4d4d);
    const seen: number[] = [];
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t = run(a, frame({ gait: 'walk', speed: 1.4 }), 1, t);
      const [l, r] = legs(a);
      seen.push(l);
      expect(l).toBeCloseTo(-r, 6);
    }
    expect(Math.max(...seen)).toBeGreaterThan(0.3);
    expect(Math.min(...seen)).toBeLessThan(-0.3);
    a.dispose();
  });

  it('corriendo: zancada más amplia que andando y el tronco inclinado hacia delante', () => {
    const amp = (gait: 'walk' | 'run', speed: number) => {
      const a = new Avatar3D(0xff4d4d);
      let max = 0;
      let t = 0;
      for (let i = 0; i < 180; i++) {
        t = run(a, frame({ gait, speed }), 1, t);
        max = Math.max(max, Math.abs(legs(a)[0]));
      }
      const upper = a.root.children[2];
      const lean = upper.rotation.x;
      a.dispose();
      return { max, lean };
    };
    const w = amp('walk', 1.4);
    const r = amp('run', 4);
    expect(r.max).toBeGreaterThan(w.max);
    // −X inclina hacia −Z (delante).
    expect(r.lean).toBeLessThan(-0.1);
    expect(Math.abs(w.lean)).toBeLessThan(1e-3);
  });

  it('parar no da un tirón: las piernas vuelven a 0 en unos fotogramas, no de golpe', () => {
    const a = new Avatar3D(0xff4d4d);
    // Andar hasta que la pierna esté bien adelantada.
    let t = 0;
    for (let i = 0; i < 600 && legs(a)[0] < 0.4; i++) t = run(a, frame({ gait: 'walk', speed: 1.4 }), 1, t);
    const before = legs(a)[0];
    expect(before).toBeGreaterThan(0.4);
    t = run(a, frame(), 1, t);
    expect(legs(a)[0]).toBeGreaterThan(before * 0.5);
    run(a, frame(), 30, t);
    expect(Math.abs(legs(a)[0])).toBeLessThan(0.01);
    a.dispose();
  });

  it('mira hacia el rumbo: 90° (este) → −π/2 en Y', () => {
    const a = new Avatar3D(0xff4d4d);
    a.update(frame({ facingDeg: 90 }), 0);
    expect(a.root.rotation.y).toBeCloseTo(-Math.PI / 2, 6);
    a.dispose();
  });

  it('un fotograma enorme (app en segundo plano) no dispara la zancada', () => {
    const a = new Avatar3D(0xff4d4d);
    const f = frame({ gait: 'walk', speed: 1.4 });
    a.update(f, 0);
    a.update(f, 0.1 - 1e-9);
    const step = Math.abs(legs(a)[0]);
    const b = new Avatar3D(0xff4d4d);
    b.update(f, 0);
    b.update(f, 3600);
    expect(Math.abs(legs(b)[0])).toBeCloseTo(step, 2);
    a.dispose();
    b.dispose();
  });

  it('dispose libera geometrías y materiales', () => {
    const a = new Avatar3D(0xff4d4d);
    const ms = meshes(a.root);
    const spies = [...new Set(ms.flatMap((m) => [m.geometry, m.material as THREE.Material]))].map((r) =>
      vi.spyOn(r, 'dispose'),
    );
    a.dispose();
    for (const s of spies) expect(s).toHaveBeenCalled();
  });
});
