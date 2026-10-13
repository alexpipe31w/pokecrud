import { artUrls, encounterDistance, pokemonHeightM, sizeClass } from './encounter-layout';

describe('encounter-layout', () => {
  it('pokemonHeightM: decímetros × escala individual', () => {
    expect(pokemonHeightM(4, 1)).toBeCloseTo(0.4, 6); // Pikachu
    expect(pokemonHeightM(4, 1.5)).toBeCloseTo(0.6, 6);
    expect(pokemonHeightM(0, 1)).toBe(0.1); // nunca invisible
  });

  it('encounterDistance: 2 m los pequeños, 1,8 × altura los medianos y como mucho 12 m', () => {
    expect(encounterDistance(0.4)).toBe(2);
    expect(encounterDistance(2.1)).toBeCloseTo(3.78, 6); // Snorlax
    expect(encounterDistance(14.5)).toBe(12); // Wailord: no cabe, como en VISION
  });

  it('sizeClass: XS por debajo de 0,6, XL por encima de 1,4', () => {
    expect(sizeClass(0.55)).toBe('XS');
    expect(sizeClass(1)).toBeNull();
    expect(sizeClass(1.45)).toBe('XL');
  });

  it('artUrls: home → official-artwork → normal, y las de shiny', () => {
    expect(artUrls(25, false)).toEqual([
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/25.png',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    ]);
    expect(artUrls(25, true)[0]).toContain('/other/home/shiny/25.png');
    expect(artUrls(25, true)[2]).toContain('/pokemon/shiny/25.png');
  });
});
