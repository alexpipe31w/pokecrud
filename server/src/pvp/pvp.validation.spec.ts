import {
  parseBattleAct,
  parseBattleForfeit,
  parseEmpty,
  parseInviteJoin,
  parseTeamRequest,
} from './pvp.validation.js';

const BATTLE = '11111111-1111-4111-8111-111111111111';

describe('validación de cargas del PvP', () => {
  it('cuerpo vacío: {} o nada', () => {
    expect(parseEmpty({})).toEqual({});
    expect(parseEmpty(undefined)).toEqual({});
    expect(parseEmpty({ x: 1 })).toBeNull();
    expect(parseEmpty('hola')).toBeNull();
  });

  it('teamId: entero positivo y nada más', () => {
    expect(parseTeamRequest({ teamId: 7 })).toEqual({ teamId: 7 });
    for (const bad of [
      {},
      { teamId: 0 },
      { teamId: -1 },
      { teamId: 1.5 },
      { teamId: '7' },
      { teamId: 2 ** 31 },
      { teamId: 7, extra: true },
      null,
      [],
    ])
      expect(parseTeamRequest(bad)).toBeNull();
  });

  it('código de invitación: 6 letras del alfabeto, se normaliza a mayúsculas', () => {
    expect(parseInviteJoin({ code: 'abc234', teamId: 1 })).toEqual({
      code: 'ABC234',
      teamId: 1,
    });
    for (const code of ['ABC23', 'ABC2345', 'ABC0O1', 'ABC 23', 123456, null])
      expect(parseInviteJoin({ code, teamId: 1 })).toBeNull();
    expect(parseInviteJoin({ code: 'ABC234' })).toBeNull();
  });

  it('acción de combate: lista cerrada de formas', () => {
    const ok = [
      { kind: 'move', moveIndex: 0 },
      { kind: 'move', moveIndex: 3 },
      { kind: 'switch', teamIndex: 5 },
      { kind: 'forfeit' },
    ];
    for (const action of ok)
      expect(parseBattleAct({ battleId: BATTLE, decision: 1, action })).toEqual(
        {
          battleId: BATTLE,
          decision: 1,
          action,
        },
      );
    const badActions = [
      { kind: 'move', moveIndex: 4 },
      { kind: 'move', moveIndex: -1 },
      { kind: 'move' },
      { kind: 'switch', teamIndex: 6 },
      { kind: 'heal' },
      { kind: 'forfeit', extra: 1 },
      'move',
    ];
    for (const action of badActions)
      expect(
        parseBattleAct({ battleId: BATTLE, decision: 1, action }),
      ).toBeNull();
    expect(
      parseBattleAct({
        battleId: 'no-uuid',
        decision: 1,
        action: { kind: 'forfeit' },
      }),
    ).toBeNull();
    expect(
      parseBattleAct({
        battleId: BATTLE,
        decision: 0,
        action: { kind: 'forfeit' },
      }),
    ).toBeNull();
  });

  it('rendirse: solo battleId', () => {
    expect(parseBattleForfeit({ battleId: BATTLE })).toEqual({
      battleId: BATTLE,
    });
    expect(parseBattleForfeit({ battleId: BATTLE, x: 1 })).toBeNull();
    expect(parseBattleForfeit({})).toBeNull();
  });
});
