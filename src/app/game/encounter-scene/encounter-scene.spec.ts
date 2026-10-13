import * as THREE from 'three';
import { EYE_HEIGHT_M, encounterDistance } from './encounter-layout';
import { BURST_COUNT, BURST_S, EncounterScene, blobTexture } from './encounter-scene';
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

  it('el punto de luz de las partículas es blanco y opaco en el centro', () => {
    const tex = blobTexture(9, 255, 255);
    const at = (x: number, y: number, c: number) => tex.image.data![(y * 9 + x) * 4 + c];
    expect([at(4, 4, 0), at(4, 4, 3)]).toEqual([255, 255]);
    expect(at(0, 4, 3)).toBe(0);
    tex.dispose();
  });
});
