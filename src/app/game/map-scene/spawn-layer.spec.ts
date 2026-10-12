import { fromLocalM } from '@shared/engine/geo';
import * as THREE from 'three';

import { APPEAR_MS, DISAPPEAR_MS } from './appear';
import { SpawnLayer } from './spawn-layer';
import { SpriteTextures } from './sprite-textures';

const O = { lat: 2.9273, lng: -75.2819 };
const at = (id: string, east: number, north: number, speciesId = 25) => ({
  id,
  speciesId,
  ...fromLocalM(O, east, north),
});
const never = () => new Promise<TexImageSource>(() => undefined);
const sprites = (l: SpawnLayer) =>
  l.group.children.filter((c): c is THREE.Sprite => c instanceof THREE.Sprite);

describe('SpawnLayer', () => {
  let layer: SpawnLayer;
  beforeEach(() => (layer = new SpawnLayer(new SpriteTextures(never))));
  afterEach(() => layer.dispose());

  it('coloca cada Pokémon en metros locales (x = este, z = −norte)', () => {
    layer.sync([at('a', 30, 40)], O, 0);
    const [s] = sprites(layer);
    expect(s.position.x).toBeCloseTo(30, 1);
    expect(s.position.z).toBeCloseTo(-40, 1);
  });

  it('los que ya estaban al entrar no brotan (ni suenan); los que llegan después, sí', () => {
    expect(layer.sync([at('a', 10, 0)], O, 1000)).toEqual([]);
    layer.update(1000);
    expect(sprites(layer)[0].material.opacity).toBe(1);
    const added = layer.sync([at('a', 10, 0), at('b', 20, 0)], O, 2000);
    expect(added.map((s) => s.id)).toEqual(['b']);
    layer.update(2100);
    const b = sprites(layer).find((s) => s.position.x > 15)!;
    expect(b.material.opacity).toBe(0); // aún se agita solo la hierba
    layer.update(2000 + APPEAR_MS);
    expect(b.material.opacity).toBe(1);
  });

  it('una sincronización vacía no "gasta" la entrada (el feed aún no ha respondido)', () => {
    layer.sync([], O, 0);
    expect(layer.sync([at('a', 10, 0)], O, 500)).toEqual([]);
  });

  it('el que desaparece se desvanece y se borra pasados DISAPPEAR_MS', () => {
    layer.sync([at('a', 10, 0)], O, 0);
    layer.sync([], O, 5000);
    layer.update(5000 + DISAPPEAR_MS / 2);
    expect(layer.size).toBe(1);
    expect(sprites(layer)[0].material.opacity).toBeLessThan(1);
    layer.update(5000 + DISAPPEAR_MS);
    expect(layer.size).toBe(0);
    expect(layer.hitTargets()).toEqual([]);
  });

  it('el toque: cada volumen dice de qué spawn es; los que se van no se pueden tocar', () => {
    layer.sync([at('a', 10, 0), at('b', 0, 10)], O, 0);
    expect(
      layer
        .hitTargets()
        .map((h) => layer.idOf(h))
        .sort(),
    ).toEqual(['a', 'b']);
    layer.sync([at('b', 0, 10)], O, 1000);
    expect(layer.hitTargets().map((h) => layer.idOf(h))).toEqual(['b']);
  });

  it('el volumen de toque responde a un rayo y no se dibuja', () => {
    layer.sync([at('a', 0, -50)], O, 0); // 50 m al sur → z = +50
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, 0, 1));
    const hits = ray.intersectObjects(layer.hitTargets(), false);
    expect(hits.length).toBeGreaterThan(0);
    expect(layer.idOf(hits[0].object)).toBe('a');
    expect(hits[0].object.visible).toBe(false);
  });

  it('el saltito sube el sprite y vuelve', () => {
    layer.sync([at('a', 10, 0)], O, 0);
    layer.update(10_000);
    const rest = sprites(layer)[0].position.y;
    layer.hop('a', 10_000);
    layer.update(10_225);
    expect(sprites(layer)[0].position.y).toBeGreaterThan(rest + 1);
    layer.update(11_000);
    expect(sprites(layer)[0].position.y).toBeLessThan(rest + 1);
  });

  it('sombra, hierba y sprite se pintan en ese orden, sin taparse entre ellos', () => {
    layer.sync([at('a', 10, 0)], O, 0);
    const sprite = sprites(layer)[0];
    const grass = layer.group.children.find(
      (c) => c instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const shadow = layer.group.children.find(
      (c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.CircleGeometry,
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
    for (const m of [sprite.material, grass.material as THREE.Material, shadow.material]) {
      expect(m.depthTest).toBe(false);
    }
    expect(shadow.renderOrder).toBeLessThan(grass.renderOrder);
    expect(grass.renderOrder).toBeLessThan(sprite.renderOrder);
  });

  it('re-anclar recoloca sin cambiar qué hay', () => {
    layer.sync([at('a', 10, 0)], O, 0);
    layer.reposition(fromLocalM(O, 10, 0));
    expect(sprites(layer)[0].position.x).toBeCloseTo(0, 1);
  });

  it('comparte textura entre la misma especie y la suelta al irse', () => {
    const tex = new SpriteTextures(never);
    const l = new SpawnLayer(tex);
    l.sync([at('a', 10, 0), at('b', 20, 0)], O, 0);
    expect(tex.size).toBe(1);
    const [a, b] = sprites(l);
    expect(a.material.map).toBe(b.material.map);
    expect(a.material).not.toBe(b.material); // la opacidad es de cada uno
    l.dispose();
  });
});
