import { createRng } from '@shared/engine/rng';
import * as THREE from 'three';
import type { Gait } from '../../game/map-scene/avatar-motion';

/**
 * Escena de prueba del spike F1-01: lo que tendrá el mapa de verdad (avatar, círculo de alcance, Pokémon como
 * sprites con sombra y hierba que se agita), para medir cuánto cuesta dibujarlo encima de Google Maps 3D.
 * Coordenadas en metros con eje Y hacia arriba (`ThreeJSOverlayView` con `upAxis: 'Y'` y ancla en el centro).
 */

/** Posición de un Pokémon en metros respecto al centro (x este, z sur). */
export interface SpawnSpot {
  dexId: number;
  x: number;
  z: number;
  phase: number;
}

/** Especies para el spike: mezcla de formas y colores (no importa cuáles, solo cuántas texturas distintas). */
const DEX_IDS = [1, 4, 7, 10, 16, 19, 25, 35, 39, 52, 54, 63, 66, 74, 92, 129, 133, 143, 147, 152];
export const MAX_SPAWNS = 60;
const SPAWN_RADIUS_M = 120;
const MIN_DIST_M = 15;
const BLADES_PER_SPAWN = 10;
/** Tamaños exagerados a propósito (como Pokémon GO): a zoom 19 un metro son ~3 px. */
const SPRITE_M = 14;
export const REACH_RADIUS_M = 40;

export const artworkUrl = (dexId: number): string =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`;

/** Puestos deterministas (misma semilla → mismo sitio), fuera del círculo del avatar. */
export function spawnSpots(seed: number, count = MAX_SPAWNS): SpawnSpot[] {
  const rng = createRng(seed);
  const spots: SpawnSpot[] = [];
  while (spots.length < count) {
    const angle = rng.next() * Math.PI * 2;
    const dist = MIN_DIST_M + Math.sqrt(rng.next()) * (SPAWN_RADIUS_M - MIN_DIST_M);
    spots.push({
      dexId: rng.pick(DEX_IDS),
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      phase: rng.next() * Math.PI * 2,
    });
  }
  return spots;
}

/** Pose del jugador en modo "Sígueme" (F1-03): metros locales (este, norte), rumbo y marcha de `AvatarMotion`. */
export interface PlayerPose {
  east: number;
  north: number;
  facingDeg: number;
  gait: Gait;
}

/** Rebote del avatar por marcha: [amplitud en m, velocidad en rad/s]. */
const BOB: Record<Gait, [number, number]> = { idle: [0.15, 2], walk: [0.4, 8], run: [0.8, 12] };

export class SpikeScene {
  readonly scene = new THREE.Scene();
  /** Avatar + sombra + círculo de alcance: se mueven juntos. */
  private readonly player = new THREE.Group();
  private readonly avatar = new THREE.Group();
  private pose: PlayerPose | null = null;
  private readonly sprites: THREE.Sprite[] = [];
  private readonly shadows: THREE.Mesh[] = [];
  private readonly grass: THREE.InstancedMesh;
  private readonly textures = new Map<number, THREE.Texture>();
  private readonly disposables: { dispose(): void }[] = [];
  private readonly spots: SpawnSpot[];
  private visible = 0;
  private readonly tmp = new THREE.Object3D();

  constructor(seed: number) {
    this.spots = spawnSpots(seed);
    this.scene.add(this.player);
    this.buildAvatar();
    this.buildReachCircle();

    const shadowGeo = this.track(new THREE.CircleGeometry(SPRITE_M * 0.3, 24));
    const shadowMat = this.track(
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    const loader = new THREE.TextureLoader().setCrossOrigin('anonymous');
    for (const spot of this.spots) {
      let texture = this.textures.get(spot.dexId);
      if (!texture) {
        texture = this.track(loader.load(artworkUrl(spot.dexId)));
        texture.colorSpace = THREE.SRGBColorSpace;
        this.textures.set(spot.dexId, texture);
      }
      const material = this.track(new THREE.SpriteMaterial({ map: texture }));
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(SPRITE_M, SPRITE_M, 1);
      sprite.center.set(0.5, 0);
      sprite.position.set(spot.x, 1, spot.z);
      this.sprites.push(sprite);
      this.scene.add(sprite);

      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(spot.x, 0.2, spot.z);
      this.shadows.push(shadow);
      this.scene.add(shadow);
    }

    const bladeGeo = this.track(new THREE.ConeGeometry(0.7, 4, 4));
    bladeGeo.translate(0, 2, 0); // que gire desde la base
    const bladeMat = this.track(new THREE.MeshLambertMaterial({ color: 0x3fae4f }));
    this.grass = new THREE.InstancedMesh(bladeGeo, bladeMat, MAX_SPAWNS * BLADES_PER_SPAWN);
    this.scene.add(this.grass);
    this.disposables.push(this.grass);

    this.setCount(0);
  }

  /** Cuántos Pokémon se ven (0…MAX_SPAWNS). */
  setCount(n: number): void {
    this.visible = Math.max(0, Math.min(MAX_SPAWNS, n));
    this.sprites.forEach((s, i) => (s.visible = i < this.visible));
    this.shadows.forEach((s, i) => (s.visible = i < this.visible));
    this.grass.count = this.visible * BLADES_PER_SPAWN;
  }

  /** Animación por fotograma (lo que costará de verdad en F1: todo se mueve un poco, siempre). */
  /** Modo "Sígueme": coloca al jugador (x = este, z = −norte) mirando a `facingDeg`; `null` = vuelve al centro. */
  setPlayer(pose: PlayerPose | null): void {
    this.pose = pose;
    this.player.position.set(pose?.east ?? 0, 0, -(pose?.north ?? 0));
  }

  update(timeMs: number): void {
    const t = timeMs / 1000;
    if (this.pose) {
      const [amp, speed] = BOB[this.pose.gait];
      this.avatar.position.y = Math.abs(Math.sin(t * speed)) * amp;
      // La nariz mira a −Z (norte); el rumbo de brújula va en sentido horario → rotación negativa en Y.
      this.avatar.rotation.y = (-this.pose.facingDeg * Math.PI) / 180;
    } else {
      this.avatar.position.y = Math.abs(Math.sin(t * 4)) * 0.6;
      this.avatar.rotation.y = t * 0.5;
    }

    for (let i = 0; i < this.visible; i++) {
      const spot = this.spots[i];
      this.sprites[i].position.y = 1 + Math.sin(t * 2 + spot.phase) * 0.8;
      for (let b = 0; b < BLADES_PER_SPAWN; b++) {
        const a = (b / BLADES_PER_SPAWN) * Math.PI * 2 + spot.phase;
        this.tmp.position.set(spot.x + Math.cos(a) * 5, 0, spot.z + Math.sin(a) * 5);
        this.tmp.rotation.set(0, a, Math.sin(t * 3 + spot.phase + b) * 0.35);
        this.tmp.updateMatrix();
        this.grass.setMatrixAt(i * BLADES_PER_SPAWN + b, this.tmp.matrix);
      }
    }
    this.grass.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.scene.clear();
  }

  private buildAvatar(): void {
    const bodyMat = this.track(new THREE.MeshLambertMaterial({ color: 0xe53935 }));
    const skinMat = this.track(new THREE.MeshLambertMaterial({ color: 0xffcc80 }));
    const body = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(1.6, 3, 4, 12)), bodyMat);
    body.position.y = 3.2;
    const head = new THREE.Mesh(this.track(new THREE.SphereGeometry(1.4, 16, 12)), skinMat);
    head.position.y = 7;
    // Nariz: indica hacia dónde mira el avatar (−Z = norte con rotación 0).
    const nose = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.6, 1.6, 12)), bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 7, -1.9);
    this.avatar.add(body, head, nose);
    this.player.add(this.avatar);

    const shadow = new THREE.Mesh(
      this.track(new THREE.CircleGeometry(2.4, 24)),
      this.track(
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        }),
      ),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.2;
    this.player.add(shadow);
  }

  private buildReachCircle(): void {
    const ring = new THREE.Mesh(
      this.track(new THREE.RingGeometry(REACH_RADIUS_M - 1, REACH_RADIUS_M, 96)),
      this.track(
        new THREE.MeshBasicMaterial({
          color: 0x26c6da,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.3;
    this.player.add(ring);
  }

  private track<T extends { dispose(): void }>(resource: T): T {
    this.disposables.push(resource);
    return resource;
  }
}
