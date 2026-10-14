import type { BallId } from '@shared/engine/capture';
import * as THREE from 'three';

import { cssColor } from './css-color';

/** Radio de la bola en la escena: algo más grande que una de verdad para que se vea bien en el aire. */
export const BALL_RADIUS_M = 0.06;

/** Colores de cada bola: [token de DISENO §2, valor del token] (three.js no lee variables CSS: se leen al crearla). */
export const BALL_COLORS: Readonly<
  Record<BallId, { top: [string, string]; band: [string, string] | null }>
> = {
  POKE_BALL: { top: ['--accent', '#ff4d4d'], band: null },
  GREAT_BALL: { top: ['--t-water', '#6390f0'], band: ['--accent', '#ff4d4d'] },
  ULTRA_BALL: { top: ['--ink', '#0f1a2b'], band: ['--gold', '#ffcb3d'] },
};
const PAPER: [string, string] = ['--paper', '#fbf7ee'];
const INK: [string, string] = ['--ink', '#0f1a2b'];

const mat = (c: [string, string]) => new THREE.MeshLambertMaterial({ color: cssColor(c) });

/**
 * Poké/Super/Ultra Ball low-poly (F2-05): mitad de arriba del color de la bola, de abajo crema, franja oscura y
 * botón al frente (+Z); la Super y la Ultra con su banda. Necesita luz (la escena pone una hemisférica).
 */
export function createBall(id: BallId): THREE.Group {
  const r = BALL_RADIUS_M;
  const { top, band } = BALL_COLORS[id];
  const g = new THREE.Group();
  g.name = id;
  const half = (start: number, c: [string, string]) =>
    new THREE.Mesh(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, start, Math.PI / 2), mat(c));
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(r, r * 0.12, 6, 24).rotateX(Math.PI / 2),
    mat(INK),
  );
  const button = new THREE.Mesh(new THREE.CircleGeometry(r * 0.3, 16), mat(PAPER));
  button.position.z = r * 1.02;
  g.add(half(0, top), half(Math.PI / 2, PAPER), belt, button);
  if (band) {
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.72, r * 0.08, 6, 24).rotateX(Math.PI / 2),
      mat(band),
    );
    stripe.position.y = r * 0.7;
    g.add(stripe);
  }
  return g;
}

export function disposeBall(g: THREE.Object3D): void {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
}
