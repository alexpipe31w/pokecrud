import {
  MAX_WIDTH_FILL,
  artUrls,
  encounterDistance,
  pokemonHeightM,
  sizeClass,
} from './encounter-layout';

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

  describe('F2-15: también tiene que caber a lo ancho (en vertical la pantalla es estrecha)', () => {
    // Samsung A36 en vertical: 384 × 832 px CSS, campo de visión vertical 64° (D-045).
    const a36 = Math.tan((32 * Math.PI) / 180) * (384 / 832);
    const widthFill = (widthM: number, d: number) => widthM / (2 * d * a36);

    it('Slowpoke XL (1,75 m, tan ancho como alto) se aleja hasta ocupar el 70 % del ancho', () => {
      const d = encounterDistance(1.75, 1.75, a36);
      expect(d).toBeGreaterThan(1.75 * 1.8); // antes 3,15 m: llenaba el 96 % del ancho
      expect(widthFill(1.75, d)).toBeCloseTo(MAX_WIDTH_FILL, 6);
    });

    it('los estrechos y los pequeños no cambian', () => {
      expect(encounterDistance(2.1, 1.05, a36)).toBeCloseTo(3.78, 6); // Snorlax de perfil estrecho
      expect(encounterDistance(0.4, 0.4, a36)).toBe(2); // Pikachu
      expect(encounterDistance(1, 0.8, a36)).toBe(2); // Diggersby: ya cabía (~70 %)
    });

    it('el tope de 12 m sigue mandando', () => {
      expect(encounterDistance(1, 20, a36)).toBe(12);
    });

    it('los largos (cabeza a cola hacia la cámara) se miden desde su FRENTE: el centro va media profundidad más allá', () => {
      // Slowpoke XL con la regla aplicada a su centro: la cara quedaba ~1,7 m más cerca y llenaba la pantalla (A36).
      expect(encounterDistance(1.75, 1.75, a36, 3.5)).toBeCloseTo(encounterDistance(1.75, 1.75, a36) + 1.75, 6);
      expect(encounterDistance(0.4, 0.4, a36, 0.4)).toBeCloseTo(2.2, 6);
    });
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
