import * as THREE from 'three';

import type { AvatarFrame } from './avatar-motion';

/** Alcance del jugador (solo UX: el servidor permite lanzar hasta 80 m, D-028). */
export const REACH_RADIUS_M = 40;
/** Si el jugador se aleja más de esto del origen de la escena, se re-ancla (precisión de float32). */
export const REANCHOR_M = 1000;
/** El anillo de alcance "respira" entre estas opacidades con este periodo. */
const RING_OPACITY: [number, number] = [0.5, 0.8];
const RING_PERIOD_MS = 1600;
/** El avatar provisional a escala 1 casi no se ve a zoom 19 con la cámara inclinada (F1-04, Kenneth): ×1,8 hasta F1-05. */
const AVATAR_SCALE = 1.8;

/** Luces del día (= las que pone `ThreeJSOverlayView` por defecto) y de la noche (más frías y tenues). */
const LIGHTS = {
  day: { sky: 0xffffff, ground: 0x444444, hemi: 1, sun: 0xffffff, sunIntensity: 1 },
  night: { sky: 0x8fa6d8, ground: 0x1a2238, hemi: 0.6, sun: 0x9fb4ff, sunIntensity: 0.35 },
};

/**
 * Escena three.js del mapa (ARQUITECTURA §2: motor de presentación, sin Angular). Metros locales respecto al origen
 * (= ancla del overlay): x = este, z = −norte, y = arriba. Por ahora solo el jugador; los Pokémon llegan en F1-07.
 * Sin sombras proyectadas: las sombras son discos semitransparentes (lo medido en D-035).
 */
export class MapScene {
  readonly scene = new THREE.Scene();
  /** Avatar + sombra + círculo de alcance: se mueven juntos. */
  readonly player = new THREE.Group();
  /** Avatar PROVISIONAL (cápsula + cabeza + nariz del spike) hasta el avatar 3D de F1-05. */
  private readonly avatar = new THREE.Group();
  private readonly ringMaterial: THREE.MeshBasicMaterial;
  private readonly hemi = new THREE.HemisphereLight();
  private readonly sun = new THREE.DirectionalLight();
  private readonly disposables: { dispose(): void }[] = [];

  constructor() {
    this.hemi.position.set(0, -0.2, 1).normalize();
    this.sun.position.set(0, 10, 100);
    this.scene.add(this.hemi, this.sun, this.player);
    this.setNight(false);

    const bodyMat = this.track(new THREE.MeshLambertMaterial({ color: 0xe53935 }));
    const skinMat = this.track(new THREE.MeshLambertMaterial({ color: 0xffcc80 }));
    const body = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(1.6, 3, 4, 12)), bodyMat);
    body.position.y = 3.2;
    const head = new THREE.Mesh(this.track(new THREE.SphereGeometry(1.4, 16, 12)), skinMat);
    head.position.y = 7;
    // Nariz: indica hacia dónde mira (−Z = norte con rotación 0).
    const nose = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.6, 1.6, 12)), bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 7, -1.9);
    this.avatar.add(body, head, nose);
    this.avatar.scale.setScalar(AVATAR_SCALE);

    const shadow = new THREE.Mesh(
      this.track(new THREE.CircleGeometry(2.4, 24)),
      this.track(
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
      ),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.2;
    shadow.scale.setScalar(AVATAR_SCALE);

    this.ringMaterial = this.track(
      new THREE.MeshBasicMaterial({
        color: 0x26c6da,
        transparent: true,
        opacity: RING_OPACITY[1],
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const ring = new THREE.Mesh(
      this.track(new THREE.RingGeometry(REACH_RADIUS_M - 1, REACH_RADIUS_M, 96)),
      this.ringMaterial,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.3;

    this.player.add(this.avatar, shadow, ring);
  }

  /** Coloca al jugador según `AvatarMotion` y anima el pulso del anillo de alcance. */
  setPlayer(f: AvatarFrame, timeMs: number): void {
    this.player.position.set(f.east, 0, -f.north);
    // El rumbo de brújula va en sentido horario → rotación negativa en Y.
    this.avatar.rotation.y = (-f.facingDeg * Math.PI) / 180;
    const [lo, hi] = RING_OPACITY;
    const wave = (1 + Math.sin((timeMs / RING_PERIOD_MS) * Math.PI * 2)) / 2;
    this.ringMaterial.opacity = lo + (hi - lo) * wave;
  }

  /** Luz ambiente más fría y tenue de noche (DISENO §1). */
  setNight(night: boolean): void {
    const l = night ? LIGHTS.night : LIGHTS.day;
    this.hemi.color.setHex(l.sky);
    this.hemi.groundColor.setHex(l.ground);
    this.hemi.intensity = l.hemi;
    this.sun.color.setHex(l.sun);
    this.sun.intensity = l.sunIntensity;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.scene.clear();
  }

  private track<T extends { dispose(): void }>(resource: T): T {
    this.disposables.push(resource);
    return resource;
  }
}
