import { readFileSync } from 'node:fs';
import { buildTypeChart } from './battle/type-chart.js';
import { defenseProfile } from './weaknesses.js';

const chart = buildTypeChart(
  JSON.parse(readFileSync(new URL('../../src/assets/data/types.json', import.meta.url), 'utf8')),
);

describe('defenseProfile', () => {
  it('Charizard (fuego/volador): roca ×4; agua y eléctrico ×2; tierra ×0; planta y bicho ×¼', () => {
    const p = defenseProfile(['fire', 'flying'], chart);
    expect(p.x4).toEqual(['rock']);
    expect(p.x2.sort()).toEqual(['electric', 'water']);
    expect(p.x0).toEqual(['ground']);
    expect(p.x025.sort()).toEqual(['bug', 'grass']);
    expect(p.x05.sort()).toEqual(['fairy', 'fighting', 'fire', 'steel']);
  });

  it('un solo tipo (Normal): lucha ×2, fantasma ×0, nada más', () => {
    const p = defenseProfile(['normal'], chart);
    expect(p.x2).toEqual(['fighting']);
    expect(p.x0).toEqual(['ghost']);
    expect([...p.x4, ...p.x05, ...p.x025]).toEqual([]);
  });
});
