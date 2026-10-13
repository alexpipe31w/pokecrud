import { CANDY_PER_CATCH, CANDY_PER_TRANSFER, familyOf } from './candy.js';

describe('caramelos', () => {
  it('capturar da más que transferir (como Pokémon GO: 3 y 1)', () => {
    expect(CANDY_PER_CATCH).toBe(3);
    expect(CANDY_PER_TRANSFER).toBe(1);
  });

  it('la familia es la cadena evolutiva: Pichu, Pikachu y Raichu comparten', () => {
    const chain = (id: number) => ({ id, evolutionChainId: 10 });
    expect(familyOf(chain(172))).toBe(10);
    expect(familyOf(chain(25))).toBe(familyOf(chain(26)));
  });
});
