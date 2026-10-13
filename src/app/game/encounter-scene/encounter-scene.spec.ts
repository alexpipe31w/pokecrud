import * as THREE from 'three';
import { EYE_HEIGHT_M, encounterDistance } from './encounter-layout';
import {
  BALL_SHOW_FWD,
  BURST_COUNT,
  BURST_S,
  ENCOUNTER_FOV_DEG,
  EncounterScene,
  blobTexture,
} from './encounter-scene';
import { FX_COUNT } from './type-fx';

const ys = (p: THREE.Points, n: number) =>
  Array.from({ length: n }, (_, i) => p.geometry.getAttribute('position').getY(i));
const radii = (p: THREE.Points, n: number) =>
  Array.from({ length: n }, (_, i) =>
    Math.hypot(
      p.geometry.getAttribute('position').getX(i),
      p.geometry.getAttribute('position').getZ(i),
    ),
  );

describe('EncounterScene', () => {
  it('no se ve hasta colocarlo; colocado está en el suelo, delante, a su distancia', () => {
    const s = new EncounterScene(0.4);
    expect(s.anchor.visible).toBe(false);
    s.placeAt(0);
    expect(s.isPlaced).toBe(true);
    expect(s.anchor.visible).toBe(true);
    expect(s.anchor.position.x).toBeCloseTo(0, 6);
    expect(s.anchor.position.y).toBe(-EYE_HEIGHT_M);
    expect(s.anchor.position.z).toBeCloseTo(-encounterDistance(0.4), 6);
    s.dispose();
  });

  it('siempre mira a la cámara (gira sobre Y)', () => {
    const s = new EncounterScene(1);
    s.placeAt(Math.PI / 2); // a la izquierda (−X)
    s.update(null);
    expect(s.anchor.rotation.y).toBeCloseTo(Math.PI / 2, 6);
    s.dispose();
  });

  it('mide su altura real (el arte tiene un 10 % de margen)', () => {
    const s = new EncounterScene(2.1);
    s.placeAt(0);
    s.update(null);
    expect(s.body.scale.y * 0.8).toBeCloseTo(2.1, 6);
    s.dispose();
  });

  it('al elevarse sube el cuerpo, no los pies, y la sombra encoge', () => {
    const s = new EncounterScene(0.4);
    s.placeAt(0);
    s.update(null);
    const ground = { body: s.body.position.y, shadow: s.shadow.scale.x };
    s.update(null, { lift: 0.6, squash: 1, lean: 0 });
    expect(s.body.position.y).toBeCloseTo(ground.body + 0.6, 6);
    expect(s.anchor.position.y).toBe(-EYE_HEIGHT_M);
    expect(s.shadow.scale.x).toBeLessThan(ground.shadow);
    s.dispose();
  });

  it('sin AR mira al Pokémon: el horizonte sube más cuanto más pequeño y cerca está', () => {
    const pika = new EncounterScene(0.4);
    pika.setViewport(390, 844);
    pika.placeAt(0);
    pika.aimAtPokemon();
    const snorlax = new EncounterScene(2.1);
    snorlax.setViewport(390, 844);
    snorlax.placeAt(0);
    snorlax.aimAtPokemon();
    expect(snorlax.horizonY()).toBeGreaterThan(0.3);
    expect(snorlax.horizonY()).toBeLessThan(0.5);
    expect(pika.horizonY()).toBeLessThan(snorlax.horizonY());
    // El centro del Pokémon queda en el centro de la pantalla.
    const c = pika.anchor.position
      .clone()
      .setY(pika.anchor.position.y + 0.2)
      .project(pika.camera);
    expect(c.x).toBeCloseTo(0, 6);
    expect(c.y).toBeCloseTo(0, 6);
    pika.dispose();
    snorlax.dispose();
  });

  it('sin AR apunta también a lo que flota (los que vuelan no se salen por arriba)', () => {
    const s = new EncounterScene(1.7);
    s.setViewport(390, 844);
    s.placeAt(0);
    s.aimAtPokemon(0.6);
    const c = s.anchor.position.clone().setY(s.anchor.position.y + 0.6 + 0.85).project(s.camera);
    expect(c.y).toBeCloseTo(0, 6);
    s.dispose();
  });

  it('la cámara copia la orientación del móvil', () => {
    const s = new EncounterScene(0.4);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1);
    s.update(q);
    expect(s.camera.quaternion.angleTo(q)).toBeCloseTo(0, 6);
    s.dispose();
  });

  it('la sombra es una mancha: opaca en el centro y transparente en el borde', () => {
    const tex = blobTexture(9);
    const alpha = (x: number, y: number) => tex.image.data![(y * 9 + x) * 4 + 3];
    expect(alpha(4, 4)).toBe(127);
    expect(alpha(0, 4)).toBe(0);
    expect(alpha(2, 4)).toBeGreaterThan(0);
    tex.dispose();
  });

  it('la proporción del arte sale de la textura', () => {
    const s = new EncounterScene(0.4);
    s.setTexture(new THREE.Texture({ width: 512, height: 256 } as unknown as HTMLImageElement));
    expect(s.artAspect).toBe(2);
    s.dispose();
  });

  it('partículas del tipo: ocultas hasta setFx, se mueven con animate y se apagan con null', () => {
    const s = new EncounterScene(1);
    expect(s.fx.visible).toBe(false);
    s.setFx('rise', '#ee8130');
    expect(s.fx.visible).toBe(true);
    s.animate(0.2);
    const before = ys(s.fx, FX_COUNT);
    s.animate(0.9);
    expect(ys(s.fx, FX_COUNT)).not.toEqual(before);
    s.setFx(null);
    expect(s.fx.visible).toBe(false);
    s.dispose();
  });

  it('ráfaga de polvo: por el suelo, se abre y desaparece a los BURST_S', () => {
    const s = new EncounterScene(1);
    s.startBurst(1, '#ffffff', false);
    s.animate(1.1);
    expect(Math.max(...ys(s.burst, BURST_COUNT))).toBeLessThan(0.15);
    const early = Math.max(...radii(s.burst, BURST_COUNT));
    s.animate(1.6);
    expect(Math.max(...radii(s.burst, BURST_COUNT))).toBeGreaterThan(early);
    s.animate(1 + BURST_S + 0.01);
    expect(s.burst.visible).toBe(false);
    s.dispose();
  });

  it('destello shiny: las chispas suben por encima de medio cuerpo', () => {
    const s = new EncounterScene(1);
    s.startBurst(0, '#ffcb3d', true);
    s.animate(0.6);
    expect(Math.max(...ys(s.burst, BURST_COUNT))).toBeGreaterThan(0.5);
    s.dispose();
  });

  it('una partícula que se apaga se vuelve transparente, no negra (el canvas es transparente)', () => {
    const s = new EncounterScene(1);
    s.startBurst(0, '#efe8d8', false);
    s.animate(BURST_S * 0.99);
    const col = s.burst.geometry.getAttribute('color');
    expect(col.itemSize).toBe(4);
    expect(col.getX(0)).toBeCloseTo(new THREE.Color('#efe8d8').r, 6); // el color no se oscurece
    expect(col.getW(0)).toBeLessThan(0.02); // se apaga el alfa
    expect(s.burst.material.premultipliedAlpha).toBe(true);
    s.dispose();
  });

  it('el punto de luz de las partículas es blanco y opaco en el centro', () => {
    const tex = blobTexture(9, 255, 255);
    const at = (x: number, y: number, c: number) => tex.image.data![(y * 9 + x) * 4 + c];
    expect([at(4, 4, 0), at(4, 4, 3)]).toEqual([255, 255]);
    expect(at(0, 4, 3)).toBe(0);
    tex.dispose();
  });

  it('throwTarget: el Pokémon en el marco del lanzamiento (delante / a la izquierda)', () => {
    const s = new EncounterScene(0.4);
    s.placeAt(Math.PI / 2); // a la izquierda, a 2 m
    const ahead = s.throwTarget(Math.PI / 2, 0.3);
    expect(ahead.fwd).toBeCloseTo(2, 6);
    expect(ahead.lat).toBeCloseTo(0, 6);
    expect(ahead.baseY).toBeCloseTo(-1.4 + 0.3, 6);
    expect(ahead.height).toBe(0.4);
    const side = s.throwTarget(0, 0); // lanzando hacia −Z, el Pokémon queda a la izquierda
    expect(side.fwd).toBeCloseTo(0, 6);
    expect(side.lat).toBeCloseTo(-2, 6);
    s.dispose();
  });

  it('la bola vuela en el marco del lanzamiento', () => {
    const s = new EncounterScene(0.4);
    const ball = s.spawnBall('POKE_BALL');
    s.setBallInThrowFrame(Math.PI / 2, { fwd: 1, lat: 0.5, up: -0.3 }, 0);
    expect(ball.position.x).toBeCloseTo(-1, 6); // adelante = −X
    expect(ball.position.z).toBeCloseTo(-0.5, 6); // derecha = −Z mirando a −X
    expect(ball.position.y).toBeCloseTo(-0.3, 6);
    s.removeBall();
    expect(s.ball).toBeNull();
    s.dispose();
  });

  it('el aro es la caja del Pokémon y el de color encoge con inner', () => {
    const s = new EncounterScene(0.4);
    s.setRing(true, '#ff0000');
    s.updateRing(0.5, 0.5);
    expect(s.ring.visible).toBe(true);
    expect(s.ring.position.y).toBeCloseTo(0.5 + 0.2, 6);
    const [outer, inner] = s.ring.children as THREE.Mesh[];
    expect(outer.scale.y).toBeCloseTo(0.2, 6);
    expect(inner.scale.x).toBeCloseTo(outer.scale.x / 2, 6);
    s.dispose();
  });
});

describe('EncounterScene con modelo 3D (F2-12)', () => {
  /** Modelo de prueba: una caja de 2 × 4 × 1 con el suelo a y = −1 (como un .glb cualquiera, sin normalizar). */
  const fakeModel = (clips: THREE.AnimationClip[] = []) => {
    const scene = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 4, 1).translate(5, 1, 0),
      new THREE.MeshStandardMaterial(),
    );
    mesh.name = 'cuerpo';
    scene.add(mesh);
    return { scene, clips };
  };
  const box = (s: EncounterScene) => {
    s.anchor.updateMatrixWorld(true);
    // la caja en el sistema de los pies (anchor), sin la rotación hacia la cámara
    const inv = s.anchor.matrixWorld.clone().invert();
    return new THREE.Box3().setFromObject(s.model!).applyMatrix4(inv);
  };

  it('sustituye al plano, mide su altura real con los pies en el suelo y centrado', () => {
    const s = new EncounterScene(0.4);
    s.placeAt(0);
    s.setModel(fakeModel());
    s.update(null);
    expect(s.body.visible).toBe(false);
    const b = box(s);
    expect(b.max.y - b.min.y).toBeCloseTo(0.4, 6);
    expect(b.min.y).toBeCloseTo(0, 6);
    expect((b.min.x + b.max.x) / 2).toBeCloseTo(0, 6);
    expect(s.artAspect).toBeCloseTo(0.5, 6); // 2 de ancho / 4 de alto
    s.dispose();
  });

  it('F2-15: cuando llega el modelo se recoloca a la distancia que pide SU ancho, en la misma dirección', () => {
    const a36 = Math.tan((ENCOUNTER_FOV_DEG / 2) * (Math.PI / 180)) * (384 / 832);
    const wide = () => ({
      scene: new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(4, 2, 1))) as THREE.Group,
      clips: [],
    });
    const s = new EncounterScene(1.75);
    s.setViewport(384, 832);
    s.placeAt(Math.PI / 2); // a la izquierda (−X)
    expect(-s.anchor.position.x).toBeCloseTo(encounterDistance(1.75, 1.75, a36), 6); // arte: tan ancho como alto
    s.setModel(fakeModel()); // 2 × 4 × 1: estrecho → se acerca (y su frente, ¼ de alto, queda a 1,8 × altura)
    expect(-s.anchor.position.x).toBeCloseTo(1.75 * 1.8 + (1.75 * 0.25) / 2, 6);
    expect(s.anchor.position.z).toBeCloseTo(0, 6);
    expect(s.anchor.position.y).toBe(-EYE_HEIGHT_M);
    const w = new EncounterScene(1.75);
    w.setViewport(384, 832);
    w.placeAt(0);
    w.setModel(wide()); // 4 × 2: el doble de ancho que de alto → se aleja
    expect(-w.anchor.position.z).toBeCloseTo(encounterDistance(1.75, 3.5, a36, 0.875), 6);
    expect(w.distance).toBeCloseTo(-w.anchor.position.z, 6);
    s.dispose();
    w.dispose();
  });

  it('F2-15: un modelo largo hacia la cámara deja su parte más cercana a la distancia de la regla', () => {
    const a36 = Math.tan((ENCOUNTER_FOV_DEG / 2) * (Math.PI / 180)) * (384 / 832);
    const s = new EncounterScene(1.75);
    s.setViewport(384, 832);
    s.placeAt(0);
    // 1 de ancho × 2 de alto × 4 de largo (como Slowpoke: mucho más largo que alto)
    s.setModel({
      scene: new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 4))) as THREE.Group,
      clips: [],
    });
    s.update(null);
    s.anchor.updateMatrixWorld(true);
    const world = new THREE.Box3().setFromObject(s.model!);
    expect(-world.max.z).toBeCloseTo(encounterDistance(1.75, 0.875, a36), 6); // la cara, a 3,15 m
    expect(-s.anchor.position.z).toBeCloseTo(encounterDistance(1.75, 0.875, a36) + 1.75, 6); // el centro, detrás
    s.dispose();
  });

  it('si el arte plano llega DESPUÉS del modelo, mandan la proporción y la distancia del modelo', () => {
    const s = new EncounterScene(1.75);
    s.setViewport(384, 832);
    s.placeAt(0);
    s.setModel(fakeModel());
    const z = s.anchor.position.z;
    s.setTexture(new THREE.Texture({ width: 512, height: 512 } as unknown as HTMLImageElement));
    expect(s.artAspect).toBeCloseTo(0.5, 6);
    expect(s.anchor.position.z).toBe(z);
    s.dispose();
  });

  it('la postura le afecta igual que al plano: sube, se aplasta y se inclina', () => {
    const s = new EncounterScene(1);
    s.placeAt(0);
    s.setModel(fakeModel());
    s.update(null, { lift: 0.5, squash: 0.8, lean: 0.1 });
    const b = box(s);
    expect(b.min.y).toBeGreaterThan(0.4);
    expect(b.max.y - b.min.y).toBeLessThan(1);
    expect(s.model!.rotation.z).toBeCloseTo(0.1, 6);
    s.dispose();
  });

  it('se gira con el dedo (spin) sin moverse del sitio', () => {
    const s = new EncounterScene(1);
    s.placeAt(0);
    s.setModel(fakeModel());
    s.spin(Math.PI / 2);
    s.update(null);
    expect(s.model!.rotation.y).toBeCloseTo(Math.PI / 2, 6);
    expect(s.model!.position.x).toBeCloseTo(0, 6);
    s.dispose();
  });

  it('reproduce su animación en bucle con animate', () => {
    const track = new THREE.NumberKeyframeTrack('cuerpo.position[y]', [0, 1], [0, 10]);
    const s = new EncounterScene(1);
    s.setModel(fakeModel([new THREE.AnimationClip('idle', 1, [track])]));
    const mesh = s.model!.getObjectByName('cuerpo')!;
    s.animate(0);
    s.animate(0.5);
    expect(mesh.position.y).toBeCloseTo(5, 4);
    s.dispose();
  });

  it('con modelo hay luz direccional; el fantasma también lo vuelve semitransparente', () => {
    const s = new EncounterScene(1);
    expect(s.scene.getObjectsByProperty('isDirectionalLight', true)).toHaveLength(0);
    const m = fakeModel();
    s.setModel(m);
    expect(s.scene.getObjectsByProperty('isDirectionalLight', true)).toHaveLength(1);
    s.setOpacity(0.7);
    const mat = (m.scene.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(0.7, 6);
    s.dispose();
  });

  it('dispose libera también el modelo', () => {
    const s = new EncounterScene(1);
    const m = fakeModel();
    const mesh = m.scene.children[0] as THREE.Mesh;
    const geo = vi.spyOn(mesh.geometry, 'dispose');
    const mat = vi.spyOn(mesh.material as THREE.Material, 'dispose');
    s.setModel(m);
    s.dispose();
    expect(geo).toHaveBeenCalled();
    expect(mat).toHaveBeenCalled();
  });
});

describe('EncounterScene.screenBox (F2-13)', () => {
  it('caja del Pokémon en píxeles: centrada si se le mira de frente, más alta cuanto más grande', () => {
    const small = new EncounterScene(0.4);
    small.setViewport(390, 844);
    small.placeAt(0);
    small.aimAtPokemon();
    small.update(null);
    const a = small.screenBox(390, 844)!;
    expect((a.left + a.right) / 2).toBeCloseTo(195, 0);
    expect((a.top + a.bottom) / 2).toBeCloseTo(422, -1);
    expect(a.bottom - a.top).toBeGreaterThan(50);

    const big = new EncounterScene(1);
    big.setViewport(390, 844);
    big.placeAt(0);
    big.aimAtPokemon();
    big.update(null);
    big.setModel({
      scene: new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1))) as THREE.Group,
      clips: [],
    });
    big.update(null);
    const b = big.screenBox(390, 844)!;
    expect((b.left + b.right) / 2).toBeCloseTo(195, 0);
    expect(b.right - b.left).toBeGreaterThan(20);
    small.dispose();
    big.dispose();
  });

  it('null si aún no está colocado o queda detrás de la cámara', () => {
    const s = new EncounterScene(0.4);
    s.setViewport(390, 844);
    expect(s.screenBox(390, 844)).toBeNull();
    s.placeAt(Math.PI); // detrás
    s.update(null);
    expect(s.screenBox(390, 844)).toBeNull();
    s.dispose();
  });
});

describe('EncounterScene: modelos con huesos y caja en reposo (arreglos F2-12/F2-13)', () => {
  /** Malla con un hueso que la sube 5 m DESPUÉS de enlazarla: la geometría en reposo no dice dónde se dibuja. */
  const skinnedModel = () => {
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const n = geo.getAttribute('position').count;
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0), 4));
    geo.setAttribute(
      'skinWeight',
      new THREE.Float32BufferAttribute(Array.from({ length: n * 4 }, (_, i) => (i % 4 ? 0 : 1)), 4),
    );
    const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial());
    const bone = new THREE.Bone();
    mesh.add(bone);
    mesh.bind(new THREE.Skeleton([bone]));
    bone.position.y = 5;
    return { scene: new THREE.Group().add(mesh) as THREE.Group, clips: [] };
  };
  /** Caja de lo que SE DIBUJA (con los huesos) en el sistema de los pies. */
  const drawn = (s: EncounterScene) => {
    s.anchor.updateMatrixWorld(true);
    s.model!.traverse((o) => (o as THREE.SkinnedMesh).skeleton?.update());
    const inv = s.anchor.matrixWorld.clone().invert();
    return new THREE.Box3().setFromObject(s.model!, true).applyMatrix4(inv);
  };

  it('normaliza con lo que se dibuja: pies en el suelo y su altura real aunque los huesos la muevan', () => {
    const s = new EncounterScene(0.4);
    s.placeAt(0);
    s.setModel(skinnedModel());
    s.update(null);
    const b = drawn(s);
    expect(b.min.y).toBeCloseTo(0, 3);
    expect(b.max.y - b.min.y).toBeCloseTo(0.4, 3);
    s.dispose();
  });

  it('screenBox usa la caja en reposo: no se mueve cuando salta o respira', () => {
    for (const withModel of [false, true]) {
      const s = new EncounterScene(1);
      s.setViewport(390, 844);
      s.placeAt(0);
      s.aimAtPokemon();
      if (withModel) s.setModel(skinnedModel());
      s.update(null);
      const still = s.screenBox(390, 844)!;
      s.update(null, { lift: 0.8, squash: 0.85, lean: 0.1 });
      expect(s.screenBox(390, 844)).toEqual(still);
      s.dispose();
    }
  });
});

describe('EncounterScene: la bola al salir de la mano', () => {
  it('no se dibuja pegada a la cámara (taparía la pantalla): aparece a partir de BALL_SHOW_FWD', () => {
    const s = new EncounterScene(0.4);
    const ball = s.spawnBall('POKE_BALL');
    s.setBallInThrowFrame(0, { fwd: 0.05, lat: 0, up: -0.35 }, 0);
    expect(ball.visible).toBe(false);
    s.setBallInThrowFrame(0, { fwd: BALL_SHOW_FWD + 0.01, lat: 0, up: -0.3 }, 0);
    expect(ball.visible).toBe(true);
    s.dispose();
  });
});
