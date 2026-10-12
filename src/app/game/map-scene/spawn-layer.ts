import { toLocalM, type LatLng } from '@shared/engine/geo';
import type { VisibleSpawn } from '@shared/protocol/spawns';
import * as THREE from 'three';

import { APPEAR_MS, DISAPPEAR_MS, appearPose, disappearPose } from './appear';
import { BLADES_PER_TUFT, bladeGeometry, tuftBlades, type BladeSpec } from './grass-tuft';
import { MAX_DRAWN, diffSpawns } from './spawn-diff';

/** Tamaño del Pokémon: exagerado como en el spike (a zoom 19 un metro son pocos píxeles). */
export const SPRITE_M = 12;
/** Hueco en la hierba: los que se van siguen dibujándose DISAPPEAR_MS mientras entran los nuevos. */
const MAX_SLOTS = MAX_DRAWN * 2;
/** Saltito al tocar uno que está lejos ("Acércate más"). */
const HOP_MS = 450;
const HOP_M = 3;
/** Orden de dibujo en la escena: sombra → hierba, sin prueba de profundidad entre ellas. */
const ORDER = { shadow: 1, grass: 2 };

/** Dónde y cómo dibujar un Pokémon este fotograma (lo pinta `PokemonDom`, encima del mapa: D-042). */
export interface PokemonVisual {
  id: string;
  speciesId: number;
  /** Base del Pokémon en metros locales (x = este, y = arriba, z = −norte). */
  x: number;
  y: number;
  z: number;
  /** Multiplicador de SPRITE_M. */
  scale: number;
  opacity: number;
}

interface Entry {
  spawn: VisibleSpawn;
  shadow: THREE.Mesh;
  x: number;
  z: number;
  phase: number;
  blades: BladeSpec[];
  bornAt: number;
  dyingAt: number | null;
  hopAt: number | null;
  visual: PokemonVisual;
}

/**
 * Pokémon salvajes del mapa (F1-07, DISENO §5): estado de cada uno (brota agitando la hierba, reposa balanceándose,
 * se desvanece al irse), y en la escena three.js su sombra y su mata de hierba. El Pokémon en sí NO se dibuja aquí:
 * Google pinta los edificios 3D encima de la capa three.js y lo tapaba, así que lo pinta `PokemonDom` en HTML por
 * encima del mapa con `visuals()` (D-042). Coordenadas como `MapScene`: metros locales, x = este, z = −norte, y = arriba.
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
    depthTest: false,
  });
  private readonly bladeGeo = bladeGeometry();
  /** Colores de vértice (base oscura, punta clara) × color de cada brizna; las dos caras (hoja plana). */
  private readonly bladeMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
  });
  private readonly tmp = new THREE.Object3D();
  /** Los que ya estaban al entrar al mapa no brotan todos a la vez: la primera sincronización con Pokémon los pone en reposo. */
  private settled = false;

  constructor() {
    this.tmp.rotation.order = 'YXZ'; // primero hacia dónde mira la brizna, luego cuánto se inclina
    this.grass = new THREE.InstancedMesh(this.bladeGeo, this.bladeMat, MAX_SLOTS * BLADES_PER_TUFT);
    this.grass.count = 0;
    this.grass.frustumCulled = false;
    this.grass.renderOrder = ORDER.grass;
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
      e.visual.x = e.x;
      e.visual.y = y;
      e.visual.z = e.z;
      e.visual.scale = pose.scale;
      e.visual.opacity = pose.opacity;
      e.shadow.scale.setScalar(0.6 + 0.4 * pose.opacity);
      if (slot < MAX_SLOTS) {
        // La hierba: balanceo suave en reposo, agitado fuerte al brotar (DISENO §5).
        const amp = 0.08 + pose.grassAmp * 0.7;
        const freq = 2.2 + pose.grassAmp * 10;
        const fade = e.dyingAt !== null ? pose.opacity : 1;
        for (let b = 0; b < BLADES_PER_TUFT; b++) {
          const blade = e.blades[b];
          const i = slot * BLADES_PER_TUFT + b;
          this.tmp.position.set(e.x + blade.dx, 0, e.z + blade.dz);
          this.tmp.rotation.set(blade.lean + Math.sin(t * freq + blade.sway) * amp, blade.yaw, 0);
          this.tmp.scale.set(blade.width * fade, blade.height * fade, blade.width * fade);
          this.tmp.updateMatrix();
          this.grass.setMatrixAt(i, this.tmp.matrix);
          this.grass.setColorAt(i, blade.color);
        }
        slot++;
      }
    }
    this.grass.count = slot * BLADES_PER_TUFT;
    this.grass.instanceMatrix.needsUpdate = true;
    if (this.grass.instanceColor) this.grass.instanceColor.needsUpdate = true;
  }

  /** Los Pokémon a dibujar este fotograma (tras `update`). */
  visuals(): PokemonVisual[] {
    return [...this.entries.values()].map((e) => e.visual);
  }

  /** ¿Se puede tocar? (los que se están yendo, no). */
  isAlive(id: string): boolean {
    const e = this.entries.get(id);
    return !!e && e.dyingAt === null;
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
    for (const d of [this.grass, this.shadowGeo, this.shadowMat, this.bladeGeo, this.bladeMat]) {
      d.dispose();
    }
    this.group.clear();
  }

  private add(spawn: VisibleSpawn, origin: LatLng, bornAt: number): void {
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.2;
    shadow.renderOrder = ORDER.shadow;
    const seed = seedOf(spawn.id);
    const e: Entry = {
      spawn,
      shadow,
      x: 0,
      z: 0,
      phase: (seed % 6283) / 1000,
      blades: tuftBlades(seed),
      bornAt,
      dyingAt: null,
      hopAt: null,
      visual: {
        id: spawn.id,
        speciesId: spawn.speciesId,
        x: 0,
        y: -2,
        z: 0,
        scale: 0.95,
        opacity: 0,
      },
    };
    this.place(e, origin);
    this.group.add(shadow);
    this.entries.set(spawn.id, e);
  }

  private place(e: Entry, origin: LatLng): void {
    const { east, north } = toLocalM(origin, e.spawn);
    e.x = east;
    e.z = -north;
    e.visual.x = e.x;
    e.visual.z = e.z;
    e.shadow.position.set(e.x, 0.2, e.z);
  }

  private remove(id: string, e: Entry): void {
    this.group.remove(e.shadow);
    this.entries.delete(id);
  }
}

/** Semilla estable por id: cada Pokémon se balancea a su ritmo y su mata no cambia al volver a sincronizar. */
function seedOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h >>> 0;
}
