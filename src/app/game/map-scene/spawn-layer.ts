import { toLocalM, type LatLng } from '@shared/engine/geo';
import type { VisibleSpawn } from '@shared/protocol/spawns';
import * as THREE from 'three';

import { APPEAR_MS, DISAPPEAR_MS, appearPose, disappearPose } from './appear';
import { MAX_DRAWN, diffSpawns } from './spawn-diff';
import { SpriteTextures } from './sprite-textures';

/** Tamaño del sprite: exagerado como en el spike (a zoom 19 un metro son pocos píxeles). */
export const SPRITE_M = 12;
const BLADES = 10;
const BLADE_RING_M = 4.5;
/** Hueco en la hierba: los que se van siguen dibujándose DISAPPEAR_MS mientras entran los nuevos. */
const MAX_SLOTS = MAX_DRAWN * 2;
/** Saltito al tocar uno que está lejos ("Acércate más"). */
const HOP_MS = 450;
const HOP_M = 3;
/** Volumen de toque: más ancho que el dibujo para acertar con el dedo. */
const HIT_RADIUS_M = SPRITE_M * 0.5;

interface Entry {
  spawn: VisibleSpawn;
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  shadow: THREE.Mesh;
  hit: THREE.Mesh;
  x: number;
  z: number;
  phase: number;
  bornAt: number;
  dyingAt: number | null;
  hopAt: number | null;
}

/**
 * Pokémon salvajes en la escena del mapa (F1-07, DISENO §5): sprite con sombra y hierba, que brota agitando la
 * hierba y se va desvaneciéndose. Coordenadas como `MapScene`: metros locales, x = este, z = −norte, y = arriba.
 * El toque se resuelve con un cilindro invisible por Pokémon: `ThreeJSOverlayView.raycast` no pone la cámara en el
 * raycaster y `THREE.Sprite` la necesita para el raycast.
 */
export class SpawnLayer {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();
  private readonly grass: THREE.InstancedMesh;
  private readonly shadowGeo = new THREE.CircleGeometry(SPRITE_M * 0.28, 20);
  private readonly shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  private readonly hitGeo = new THREE.CylinderGeometry(
    HIT_RADIUS_M,
    HIT_RADIUS_M,
    SPRITE_M * 1.3,
    8,
  );
  private readonly hitMat = new THREE.MeshBasicMaterial();
  private readonly bladeGeo = new THREE.ConeGeometry(0.6, 3.5, 4);
  private readonly bladeMat = new THREE.MeshLambertMaterial({ color: 0x3fae4f });
  private readonly tmp = new THREE.Object3D();
  /** Los que ya estaban al entrar al mapa no brotan todos a la vez: la primera sincronización con Pokémon los pone en reposo. */
  private settled = false;

  constructor(private readonly textures = new SpriteTextures()) {
    this.bladeGeo.translate(0, 1.75, 0); // que gire desde la base
    this.grass = new THREE.InstancedMesh(this.bladeGeo, this.bladeMat, MAX_SLOTS * BLADES);
    this.grass.count = 0;
    this.grass.frustumCulled = false;
    this.group.add(this.grass);
  }

  /** Al entrar en la pantalla del mapa: la próxima tanda que llegue aparece ya en reposo. */
  enter(): void {
    this.settled = false;
  }

  /**
   * Deja en la escena exactamente `drawn` (los más cercanos, ya recortados a MAX_DRAWN). Devuelve los que acaban de
   * BROTAR (no los que ya estaban al entrar), para que la pantalla decida si suena su grito.
   */
  sync(drawn: readonly VisibleSpawn[], origin: LatLng, nowMs: number): VisibleSpawn[] {
    const alive = new Set(
      [...this.entries].filter(([, e]) => e.dyingAt === null).map(([id]) => id),
    );
    const { added, removed } = diffSpawns(alive, drawn);
    for (const id of removed) {
      const e = this.entries.get(id);
      if (e) e.dyingAt = nowMs;
    }
    const silent = !this.settled && drawn.length > 0;
    for (const s of added) {
      const old = this.entries.get(s.id);
      if (old) this.remove(s.id, old); // volvió mientras se desvanecía
      this.add(s, origin, silent ? nowMs - APPEAR_MS : nowMs);
    }
    if (drawn.length > 0) this.settled = true;
    return silent ? [] : added;
  }

  /** Animación de un fotograma. */
  update(nowMs: number): void {
    const t = nowMs / 1000;
    let slot = 0;
    for (const [id, e] of this.entries) {
      if (e.dyingAt !== null && nowMs - e.dyingAt >= DISAPPEAR_MS) {
        this.remove(id, e);
        continue;
      }
      const pose =
        e.dyingAt !== null ? disappearPose(nowMs - e.dyingAt) : appearPose(nowMs - e.bornAt);
      const resting = e.dyingAt === null && nowMs - e.bornAt >= APPEAR_MS;
      let y = resting ? 1 + Math.sin(t * 2 + e.phase) * 0.4 : pose.y;
      if (e.hopAt !== null) {
        const k = (nowMs - e.hopAt) / HOP_MS;
        if (k >= 1) e.hopAt = null;
        else y += Math.sin(k * Math.PI) * HOP_M;
      }
      e.sprite.position.y = y;
      e.sprite.scale.set(SPRITE_M * pose.scale, SPRITE_M * pose.scale, 1);
      e.material.opacity = pose.opacity;
      e.shadow.scale.setScalar(0.6 + 0.4 * pose.opacity);
      if (slot < MAX_SLOTS) {
        // La hierba: balanceo suave en reposo, agitado fuerte al brotar.
        const amp = 0.15 + pose.grassAmp * 0.9;
        const freq = 3 + pose.grassAmp * 9;
        for (let b = 0; b < BLADES; b++) {
          const a = (b / BLADES) * Math.PI * 2 + e.phase;
          this.tmp.position.set(
            e.x + Math.cos(a) * BLADE_RING_M,
            0,
            e.z + Math.sin(a) * BLADE_RING_M,
          );
          this.tmp.rotation.set(0, a, Math.sin(t * freq + e.phase + b) * amp);
          this.tmp.scale.setScalar(e.dyingAt !== null ? pose.opacity : 1);
          this.tmp.updateMatrix();
          this.grass.setMatrixAt(slot * BLADES + b, this.tmp.matrix);
        }
        slot++;
      }
    }
    this.grass.count = slot * BLADES;
    this.grass.instanceMatrix.needsUpdate = true;
  }

  /** Volúmenes de toque de los Pokémon vivos (para `ThreeJSOverlayView.raycast`). */
  hitTargets(): THREE.Object3D[] {
    return [...this.entries.values()].filter((e) => e.dyingAt === null).map((e) => e.hit);
  }

  /** Id del spawn de un volumen de toque. */
  idOf(object: THREE.Object3D): string | null {
    return typeof object.userData['spawnId'] === 'string' ? object.userData['spawnId'] : null;
  }

  get(id: string): VisibleSpawn | null {
    return this.entries.get(id)?.spawn ?? null;
  }

  /** Saltito de "estás lejos". */
  hop(id: string, nowMs: number): void {
    const e = this.entries.get(id);
    if (e) e.hopAt = nowMs;
  }

  /** Tras re-anclar la escena: recalcula las posiciones locales. */
  reposition(origin: LatLng): void {
    for (const e of this.entries.values()) this.place(e, origin);
  }

  /** Cuántos hay en la escena (incluidos los que se están yendo). */
  get size(): number {
    return this.entries.size;
  }

  dispose(): void {
    for (const [id, e] of this.entries) this.remove(id, e);
    this.textures.dispose();
    for (const d of [
      this.grass,
      this.shadowGeo,
      this.shadowMat,
      this.hitGeo,
      this.hitMat,
      this.bladeGeo,
      this.bladeMat,
    ]) {
      d.dispose();
    }
    this.group.clear();
  }

  private add(spawn: VisibleSpawn, origin: LatLng, bornAt: number): void {
    const material = new THREE.SpriteMaterial({
      map: this.textures.acquire(spawn.speciesId),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(0.5, 0);
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.2;
    const hit = new THREE.Mesh(this.hitGeo, this.hitMat);
    hit.visible = false; // no se dibuja; el raycast de three no mira `visible`
    hit.userData['spawnId'] = spawn.id;
    const e: Entry = {
      spawn,
      sprite,
      material,
      shadow,
      hit,
      x: 0,
      z: 0,
      phase: phaseOf(spawn.id),
      bornAt,
      dyingAt: null,
      hopAt: null,
    };
    this.place(e, origin);
    this.group.add(sprite, shadow, hit);
    this.entries.set(spawn.id, e);
  }

  private place(e: Entry, origin: LatLng): void {
    const { east, north } = toLocalM(origin, e.spawn);
    e.x = east;
    e.z = -north;
    e.sprite.position.set(e.x, e.sprite.position.y, e.z);
    e.shadow.position.set(e.x, 0.2, e.z);
    e.hit.position.set(e.x, (SPRITE_M * 1.3) / 2, e.z);
    e.hit.updateMatrixWorld();
  }

  private remove(id: string, e: Entry): void {
    this.group.remove(e.sprite, e.shadow, e.hit);
    e.material.dispose();
    this.textures.release(e.spawn.speciesId);
    this.entries.delete(id);
  }
}

/** Fase estable por id: cada Pokémon se balancea a su ritmo y no cambia al volver a sincronizar. */
function phaseOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h >>> 0) % 6283) / 1000;
}
