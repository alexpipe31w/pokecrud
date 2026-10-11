import { createRng } from '@shared/engine/rng';

describe('alias @shared', () => {
  it('la app puede importar código de shared/', () => {
    expect(createRng(1).next()).toBeTypeOf('number');
  });
});
