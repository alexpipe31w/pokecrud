import { fromLocalM } from '@shared/engine/geo';
import * as THREE from 'three';

import { APPEAR_MS, DISAPPEAR_MS } from './appear';
import { SpawnLayer } from './spawn-layer';

const O = { lat: 2.9273, lng: -75.2819 };
const at = (id: string, east: number, north: number, speciesId = 25) => ({
  id,
  speciesId,
  ...fromLocalM(O, east, north),
});
const visual = (l: SpawnLayer, id: string) => l.visuals().find((v) => v.id === id)!;

describe('SpawnLayer', () => {
  let layer: SpawnLayer;
  beforeEach(() => (layer = new SpawnLayer()));
  afterEach(() => layer.dispose());

  it('coloca cada Pokémon en metros locales (x = este, z = −norte)', () => {
    layer.sync([at('a', 30, 40)], O, 0);
    layer.update(0);
    const v = visual(layer, 'a');
    expect(v.x).toBeCloseTo(30, 1);
    expect(v.z).toBeCloseTo(-40, 1);
    expect(v.speciesId).toBe(25);
  });

  it('los que ya estaban al entrar no brotan (ni suenan); los que llegan después, sí', () => {
    expect(layer.sync([at('a', 10, 0)], O, 1000)).toEqual([]);
    layer.update(1000);
    expect(visual(layer, 'a').opacity).toBe(1);
    const added = layer.sync([at('a', 10, 0), at('b', 20, 0)], O, 2000);
    expect(added.map((s) => s.id)).toEqual(['b']);
    layer.update(2100);
    expect(visual(layer, 'b').opacity).toBe(0); // aún se agita solo la hierba
    layer.update(2000 + APPEAR_MS);
    expect(visual(layer, 'b').opacity).toBe(1);
  });

  it('una sincronización vacía no "gasta" la entrada (el feed aún no ha respondido)', () => {
    layer.sync([], O, 0);
    expect(layer.sync([at('a', 10, 0)], O, 500)).toEqual([]);
  });

  it('el que desaparece se desvanece, deja de poder tocarse y se borra pasados DISAPPEAR_MS', () => {
    layer.sync([at('a', 10, 0)], O, 0);
    expect(layer.isAlive('a')).toBe(true);
    layer.sync([], O, 5000);
    expect(layer.isAlive('a')).toBe(false);
    layer.update(5000 + DISAPPEAR_MS / 2);
    expect(layer.size).toBe(1);
    expect(visual(layer, 'a').opacity).toBeLessThan(1);
    layer.update(5000 + DISAPPEAR_MS);
    expect(layer.size).toBe(0);
    expect(layer.visuals()).toEqual([]);
  });

  it('el saltito sube al Pokémon y vuelve', () => {
    layer.sync([at('a', 10, 0)], O, 0);
    layer.update(10_000);
    const rest = visual(layer, 'a').y;
    layer.hop('a', 10_000);
    layer.update(10_225);
    expect(visual(layer, 'a').y).toBeGreaterThan(rest + 1);
    layer.update(11_000);
    expect(visual(layer, 'a').y).toBeLessThan(rest + 1);
  });

  it('en la escena solo quedan sombra y hierba (el Pokémon va en HTML, D-042), en ese orden', () => {
    layer.sync([at('a', 10, 0)], O, 0);
    layer.update(0);
    expect(layer.group.children.some((c) => c instanceof THREE.Sprite)).toBe(false);
    const grass = layer.group.children.find(
      (c) => c instanceof THREE.InstancedMesh,
    ) as THREE.InstancedMesh;
    const shadow = layer.group.children.find(
      (c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.CircleGeometry,
    )!;
    expect(grass.count).toBeGreaterThan(0);
    expect(shadow.renderOrder).toBeLessThan(grass.renderOrder);
  });

  it('re-anclar recoloca sin cambiar qué hay', () => {
    layer.sync([at('a', 10, 0)], O, 0);
    layer.reposition(fromLocalM(O, 10, 0));
    expect(visual(layer, 'a').x).toBeCloseTo(0, 1);
  });
});
