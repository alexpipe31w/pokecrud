import * as THREE from 'three';

import type { AvatarFrame } from './avatar-motion';
import { advanceStride, limbPose, type LimbPose } from './limb-pose';

/** Si el token `--accent` no se puede leer (tests, SSR), el rojo Poké Ball de `tokens.scss`. */
const ACCENT_FALLBACK = 0xff4d4d;
const COLORS = {
  skin: 0xffcc80,
  pants: 0x2b3a67,
  capCrown: 0xf5f5f5,
  capVisor: 0xc62828,
  pack: 0xffcb3d,
  eyes: 0x0f1a2b,
};
/** Constante de tiempo con la que la pose persigue a `limbPose`: quita los tirones al parar o al pasar a correr. */
const POSE_TAU_S = 0.05;
/** Cuánto encoge la sombra por metro de bote. */
const SHADOW_SHRINK_PER_M = 0.4;
/** Un fotograma más largo que esto (pestaña dormida, GC) no cuenta como movimiento. */
const MAX_DT_S = 0.1;

const HIP_Y = 3.6;
const SHOULDER_Y = 3.2; // dentro del tronco (relativo a la cadera)

/**
 * Entrenador low-poly procedural (D-003): tronco, cabeza con gorra, mochila y extremidades colgadas de pivotes para
 * que roten desde la cadera/hombro. Mide ≈ 9,5 m a escala 1 (exagerado: a zoom 19 un metro son pocos píxeles).
 * Mira hacia −Z (norte con rotación 0). 12 mallas con la sombra, un material por color y sin `castShadow`: la sombra
 * es un disco (D-035).
 */
export class Avatar3D {
  readonly root = new THREE.Group();
  private readonly upper = new THREE.Group();
  private readonly legL = new THREE.Group();
  private readonly legR = new THREE.Group();
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly shadow: THREE.Mesh;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly pose: LimbPose = { legL: 0, legR: 0, armL: 0, armR: 0, bob: 0, lean: 0 };
  private phase = 0;
  private lastT: number | null = null;

  constructor(accent: number = readAccent()) {
    const mat = (color: number) => this.track(new THREE.MeshLambertMaterial({ color }));
    const body = mat(accent);
    const skin = mat(COLORS.skin);
    const pants = mat(COLORS.pants);

    // Piernas: pivote en la cadera, la cápsula cuelga hacia abajo.
    const legGeo = this.track(new THREE.CapsuleGeometry(0.55, 2.4, 4, 10));
    for (const [pivot, x] of [
      [this.legL, -0.65],
      [this.legR, 0.65],
    ] as const) {
      const leg = new THREE.Mesh(legGeo, pants);
      leg.position.y = -1.75;
      pivot.add(leg);
      pivot.position.set(x, HIP_Y, 0);
    }

    // Parte de arriba: pivote en la cadera, para inclinarse al correr sin mover los pies.
    this.upper.position.y = HIP_Y;
    const torso = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(1.15, 1.3, 4, 12)), body);
    torso.position.y = 1.8;
    const head = new THREE.Mesh(this.track(new THREE.SphereGeometry(1.25, 16, 12)), skin);
    head.position.y = 4.7;
    const crown = new THREE.Mesh(
      this.track(new THREE.SphereGeometry(1.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
      mat(COLORS.capCrown),
    );
    crown.position.y = 4.85;
    // Visera hacia delante (−Z): indica hacia dónde mira, como la nariz del avatar provisional.
    const visor = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.95, 0.95, 0.14, 16)), mat(COLORS.capVisor));
    visor.scale.z = 0.8;
    visor.position.set(0, 4.88, -1.15);
    const eyeGeo = this.track(new THREE.SphereGeometry(0.17, 8, 6));
    const eyeMat = mat(COLORS.eyes);
    const eyes = [-0.45, 0.45].map((x) => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, 4.65, -1.12);
      return eye;
    });
    const pack = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.8, 2.1, 0.9)), mat(COLORS.pack));
    pack.position.set(0, 2.1, 1.2);

    const armGeo = this.track(new THREE.CapsuleGeometry(0.42, 2.0, 4, 10));
    for (const [pivot, x] of [
      [this.armL, -1.55],
      [this.armR, 1.55],
    ] as const) {
      const arm = new THREE.Mesh(armGeo, skin);
      arm.position.y = -1.3;
      pivot.add(arm);
      pivot.position.set(x, SHOULDER_Y, 0);
    }
    this.upper.add(torso, head, crown, visor, ...eyes, pack, this.armL, this.armR);

    this.shadow = new THREE.Mesh(
      this.track(new THREE.CircleGeometry(2.4, 24)),
      this.track(
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
      ),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.2;

    this.root.add(this.legL, this.legR, this.upper, this.shadow);
  }

  /** Aplica rumbo, zancada, bote e inclinación. `timeS` = reloj del bucle (`requestAnimationFrame`) en segundos. */
  update(f: AvatarFrame, timeS: number): void {
    const dt = this.lastT === null ? 0 : Math.min(Math.max(timeS - this.lastT, 0), MAX_DT_S);
    this.lastT = timeS;
    this.phase = advanceStride(this.phase, f.gait, f.speed, dt);
    const target = limbPose(f.gait, this.phase, timeS);
    const k = dt > 0 ? 1 - Math.exp(-dt / POSE_TAU_S) : 1;
    for (const key of Object.keys(this.pose) as (keyof LimbPose)[]) {
      this.pose[key] += (target[key] - this.pose[key]) * k;
    }
    const p = this.pose;

    // El rumbo de brújula va en sentido horario → rotación negativa en Y.
    this.root.rotation.y = (-f.facingDeg * Math.PI) / 180;
    // Rotación +X lleva lo que cuelga hacia −Z (delante); la inclinación del tronco va al revés.
    this.legL.rotation.x = p.legL;
    this.legR.rotation.x = p.legR;
    this.armL.rotation.x = p.armL;
    this.armR.rotation.x = p.armR;
    this.upper.rotation.x = -p.lean;
    const lift = Math.max(p.bob, 0);
    this.legL.position.y = this.legR.position.y = HIP_Y + p.bob;
    this.upper.position.y = HIP_Y + p.bob;
    this.shadow.scale.setScalar(1 - lift * SHADOW_SHRINK_PER_M);
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.root.clear();
  }

  private track<T extends { dispose(): void }>(resource: T): T {
    this.disposables.push(resource);
    return resource;
  }
}

/** Lee `--accent` una sola vez (DISENO §2: los colores salen de los tokens). */
function readAccent(): number {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return raw ? new THREE.Color(raw).getHex() : ACCENT_FALLBACK;
  } catch {
    // Sin DOM o con un valor que three.js no entiende: el color por defecto es el mismo token, no hay nada que avisar.
    return ACCENT_FALLBACK;
  }
}
