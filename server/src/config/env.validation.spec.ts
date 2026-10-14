import { validateEnv } from './env.validation.js';

const VALID = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(48),
};

describe('validateEnv', () => {
  it('acepta una configuración válida y aplica los valores por defecto', () => {
    expect(validateEnv(VALID)).toMatchObject({
      JWT_TTL: 900,
      REFRESH_TTL_DAYS: 30,
    });
  });

  it('convierte los números que llegan como texto', () => {
    expect(
      validateEnv({ ...VALID, JWT_TTL: '600', REFRESH_TTL_DAYS: '7' }),
    ).toMatchObject({
      JWT_TTL: 600,
      REFRESH_TTL_DAYS: 7,
    });
  });

  it('rechaza un JWT_SECRET ausente o corto', () => {
    expect(() => validateEnv({ DATABASE_URL: VALID.DATABASE_URL })).toThrow(
      /JWT_SECRET/,
    );
    expect(() => validateEnv({ ...VALID, JWT_SECRET: 'corto' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('rechaza DATABASE_URL ausente y TTL fuera de rango', () => {
    expect(() => validateEnv({ JWT_SECRET: VALID.JWT_SECRET })).toThrow(
      /DATABASE_URL/,
    );
    expect(() => validateEnv({ ...VALID, JWT_TTL: '5' })).toThrow(/JWT_TTL/);
    expect(() => validateEnv({ ...VALID, REFRESH_TTL_DAYS: '365' })).toThrow(
      /REFRESH_TTL_DAYS/,
    );
  });
});
