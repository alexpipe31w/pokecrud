import { SFX_RECIPES, isSfxName, renderSfx, type SfxName } from './sfx-synth';

const RATE = 48_000;
const rms = (x: Float32Array) => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);

describe('sfx-synth', () => {
  for (const name of Object.keys(SFX_RECIPES) as SfxName[]) {
    it(`"${name}": suena, nunca satura y dura menos de 1 s`, () => {
      const x = renderSfx(SFX_RECIPES[name], RATE);
      expect(x.length / RATE).toBeLessThan(1);
      expect(rms(x)).toBeGreaterThan(0.01);
      expect(Math.max(...x.map(Math.abs))).toBeLessThanOrEqual(0.95 + 1e-6);
    });
  }

  it('acaba en silencio (sin chasquido al cortar)', () => {
    const x = renderSfx(SFX_RECIPES.hit, RATE);
    expect(Math.abs(x[x.length - 2])).toBeLessThan(0.01);
  });

  it('es determinista', () => {
    expect(renderSfx(SFX_RECIPES['hit-crit'], RATE)).toEqual(
      renderSfx(SFX_RECIPES['hit-crit'], RATE),
    );
  });

  it('el muy eficaz suena más fuerte que el poco eficaz', () => {
    expect(rms(renderSfx(SFX_RECIPES['hit-super'], RATE))).toBeGreaterThan(
      rms(renderSfx(SFX_RECIPES['hit-weak'], RATE)),
    );
  });

  it('isSfxName distingue los efectos generados', () => {
    expect(isSfxName('tap')).toBe(true);
    expect(isSfxName('no-existe')).toBe(false);
  });
});
