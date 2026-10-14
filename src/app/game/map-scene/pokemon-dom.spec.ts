import * as THREE from 'three';

import { PokemonDom, projectToScreen, spriteUrls } from './pokemon-dom';
import type { PokemonVisual } from './spawn-layer';

/** Cámara de prueba: mira hacia −Z desde (0, 10, 50); la matriz es proyección × vista, como la del overlay. */
function mvp(): THREE.Matrix4 {
  const cam = new THREE.PerspectiveCamera(60, 1, 1, 1000);
  cam.position.set(0, 10, 50);
  cam.lookAt(0, 10, 0);
  cam.updateMatrixWorld();
  return new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
}

const vis = (over: Partial<PokemonVisual> = {}): PokemonVisual => ({
  id: 'a',
  speciesId: 25,
  x: 0,
  y: 10,
  z: 0,
  scale: 1,
  opacity: 1,
  ...over,
});

describe('projectToScreen', () => {
  it('lo que está delante de la cámara cae en el centro; arriba en el mundo = arriba en pantalla', () => {
    const m = mvp();
    const c = projectToScreen(m, 0, 10, 0, 400, 800)!;
    expect(c.x).toBeCloseTo(200, 3);
    expect(c.y).toBeCloseTo(400, 3);
    expect(projectToScreen(m, 0, 15, 0, 400, 800)!.y).toBeLessThan(c.y);
    expect(projectToScreen(m, 5, 10, 0, 400, 800)!.x).toBeGreaterThan(c.x);
  });

  it('detrás de la cámara → null', () => {
    expect(projectToScreen(mvp(), 0, 10, 100, 400, 800)).toBeNull();
  });
});

describe('PokemonDom', () => {
  let box: HTMLDivElement;
  beforeEach(() => {
    box = document.createElement('div');
    document.body.appendChild(box);
  });
  afterEach(() => box.remove());

  const imgs = () => [...box.querySelectorAll('img')];

  it('elementOf: el <img> de ese Pokémon (o nada si no está)', () => {
    const dom = new PokemonDom(box, () => undefined);
    dom.render([vis()], mvp(), 400, 800);
    expect(dom.elementOf('a')).toBe(imgs()[0]);
    expect(dom.elementOf('zz')).toBeUndefined();
  });

  it('un <img> por Pokémon, colocado con transform y su opacidad; se quita cuando se va', () => {
    const dom = new PokemonDom(box, () => undefined);
    dom.render([vis(), vis({ id: 'b', x: 5, opacity: 0.5 })], mvp(), 400, 800);
    expect(imgs()).toHaveLength(2);
    const [a, b] = imgs();
    expect(a.src).toBe(spriteUrls(25)[0]);
    expect(a.style.transform).toContain('translate3d(');
    expect(a.style.visibility).toBe('visible');
    expect(b.style.opacity).toBe('0.5');
    dom.render([vis()], mvp(), 400, 800);
    expect(imgs()).toHaveLength(1);
    dom.dispose();
    expect(imgs()).toHaveLength(0);
  });

  it('el de más cerca (más abajo en pantalla) queda delante', () => {
    const dom = new PokemonDom(box, () => undefined);
    dom.render([vis({ id: 'lejos', y: 14 }), vis({ id: 'cerca', y: 6 })], mvp(), 400, 800);
    const [lejos, cerca] = imgs();
    expect(Number(cerca.style.zIndex)).toBeGreaterThan(Number(lejos.style.zIndex));
  });

  it('invisible (brotando) o detrás de la cámara → oculto', () => {
    const dom = new PokemonDom(box, () => undefined);
    dom.render([vis({ opacity: 0 }), vis({ id: 'b', z: 100 })], mvp(), 400, 800);
    expect(imgs().every((i) => i.style.visibility === 'hidden')).toBe(true);
  });

  it('tocar la imagen avisa con el id', () => {
    const onTap = vi.fn();
    const dom = new PokemonDom(box, onTap);
    dom.render([vis({ id: 'x1' })], mvp(), 400, 800);
    imgs()[0].click();
    expect(onTap).toHaveBeenCalledWith('x1');
  });

  it('si falta el sprite home prueba official-artwork y luego el normal', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const dom = new PokemonDom(box, () => undefined);
    dom.render([vis({ speciesId: 1025 })], mvp(), 400, 800);
    const img = imgs()[0];
    const urls = spriteUrls(1025);
    img.onerror!(new Event('error'));
    expect(img.src).toBe(urls[1]);
    img.onerror!(new Event('error'));
    expect(img.src).toBe(urls[2]);
  });
});
