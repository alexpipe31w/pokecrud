import type { BattleEvent } from '@shared/engine/battle/types';
import { type Names, describeEvent } from './battle-text';

const names: Names = {
  pokemon: (side) => (side === 0 ? 'Pikachu' : 'Gyarados'),
  move: (id) => (id === 85 ? 'Rayo' : `mov ${id}`),
  trainer: (side) => (side === 0 ? 'Alex' : 'Nadadora Marina'),
  player: 0,
};
const t = (e: BattleEvent) => describeEvent(e, names);

describe('describeEvent', () => {
  it('distingue al jugador del rival', () => {
    expect(t({ kind: 'move', side: 0, moveId: 85 })).toBe('¡Pikachu usó Rayo!');
    expect(t({ kind: 'move', side: 1, moveId: 85 })).toBe('¡Gyarados rival usó Rayo!');
    expect(t({ kind: 'switch', side: 0, teamIndex: 1 })).toBe('¡Adelante, Pikachu!');
    expect(t({ kind: 'switch', side: 1, teamIndex: 1 })).toBe('Nadadora Marina saca a Gyarados.');
  });

  it('eficacia con texto (nunca solo color) y sin texto para ×1', () => {
    expect(t({ kind: 'effectiveness', side: 1, multiplier: 4 })).toBe('¡Es superefectivo!');
    expect(t({ kind: 'effectiveness', side: 1, multiplier: 0.5 })).toBe('No es muy efectivo…');
    expect(t({ kind: 'immune', side: 1 })).toBe('No afecta a Gyarados rival…');
  });

  it('estados, stats y daños de estado', () => {
    expect(t({ kind: 'status', side: 1, status: 'toxic' })).toBe(
      '¡Gyarados rival ha sido gravemente envenenado!',
    );
    expect(t({ kind: 'stat', side: 0, stat: 'attack', change: 2 })).toBe(
      '¡Ataque de Pikachu ha subido mucho!',
    );
    expect(t({ kind: 'stat', side: 1, stat: 'speed', change: -1 })).toBe(
      '¡Velocidad de Gyarados rival ha bajado!',
    );
    expect(t({ kind: 'stat-limit', side: 0, stat: 'attack', up: true })).toBe(
      '¡Ataque de Pikachu no puede subir más!',
    );
    expect(t({ kind: 'damage', side: 1, amount: 9, hpAfter: 100, source: 'burn' })).toBe(
      'Gyarados rival se resiente de la quemadura.',
    );
    expect(t({ kind: 'damage', side: 1, amount: 40, hpAfter: 60, source: 'move' })).toBeNull();
  });

  it('final del combate', () => {
    expect(t({ kind: 'win', side: 0 })).toBe('¡Has derrotado a Nadadora Marina!');
    expect(t({ kind: 'win', side: 1 })).toBe('Nadadora Marina te ha ganado…');
    expect(t({ kind: 'forfeit', side: 0 })).toBe('¡Has huido del combate!');
    expect(t({ kind: 'needs-switch', side: 0 })).toBe('¿Qué Pokémon vas a sacar?');
    expect(t({ kind: 'needs-switch', side: 1 })).toBeNull();
  });
});
