import { NICKNAME_MAX, normalizeNickname } from './nickname.js';

describe('normalizeNickname', () => {
  it('recorta espacios y junta los repetidos', () => {
    expect(normalizeNickname('  Pika   chu ')).toBe('Pika chu');
  });

  it('vacío o solo espacios = sin mote (null)', () => {
    expect(normalizeNickname('   ')).toBeNull();
    expect(normalizeNickname(null)).toBeNull();
  });

  it('admite tildes, ñ, números, guion y apóstrofo', () => {
    expect(normalizeNickname("Ñandú-2 d'Or")).toBe("Ñandú-2 d'Or");
  });

  it(`rechaza más de ${NICKNAME_MAX} caracteres y símbolos raros`, () => {
    expect(() => normalizeNickname('a'.repeat(NICKNAME_MAX + 1))).toThrow(RangeError);
    expect(() => normalizeNickname('<script>')).toThrow(RangeError);
    expect(() => normalizeNickname('😀')).toThrow(RangeError);
  });
});
