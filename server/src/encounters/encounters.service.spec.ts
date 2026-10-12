import { movesAtLevel } from './encounters.service.js';

describe('movesAtLevel', () => {
  const learnset = [
    { moveId: 33, level: 1 },
    { moveId: 45, level: 1 },
    { moveId: 22, level: 3 },
    { moveId: 73, level: 7 },
    { moveId: 33, level: 9 },
    { moveId: 75, level: 12 },
    { moveId: 76, level: 40 },
    { moveId: 99, level: 0 },
  ];

  it('los 4 últimos aprendidos hasta su nivel, sin repetir y en orden', () => {
    expect(movesAtLevel(learnset, 12)).toEqual([22, 73, 33, 75]);
    expect(movesAtLevel(learnset, 5)).toEqual([33, 45, 22]);
  });

  it('ignora los de nivel 0 (al evolucionar) y los de nivel superior', () => {
    expect(movesAtLevel(learnset, 1)).toEqual([33, 45]);
    expect(movesAtLevel([], 30)).toEqual([]);
  });
});
