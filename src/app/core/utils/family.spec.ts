import { familyBaseId } from './family';

const species = new Map([
  [172, { evolvesFrom: null }],
  [25, { evolvesFrom: 172 }],
  [26, { evolvesFrom: 25 }],
  [132, { evolvesFrom: null }],
]);

describe('familyBaseId', () => {
  it('Raichu y Pikachu → Pichu (la primera de la cadena)', () => {
    expect(familyBaseId(species, 26)).toBe(172);
    expect(familyBaseId(species, 25)).toBe(172);
  });

  it('sin preevolución → la propia especie', () => {
    expect(familyBaseId(species, 132)).toBe(132);
  });

  it('especie desconocida o cadena rota → la propia especie (nunca se cuelga)', () => {
    expect(familyBaseId(species, 9999)).toBe(9999);
    const loop = new Map([
      [1, { evolvesFrom: 2 }],
      [2, { evolvesFrom: 1 }],
    ]);
    expect([1, 2]).toContain(familyBaseId(loop, 1));
  });
});
