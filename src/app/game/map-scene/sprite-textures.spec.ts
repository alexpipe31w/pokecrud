import { MAX_IDLE_TEXTURES, SpriteTextures, spriteUrls } from './sprite-textures';

const img = { width: 1, height: 1 } as unknown as TexImageSource;
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('SpriteTextures', () => {
  it('una textura por especie, compartida', () => {
    const t = new SpriteTextures(() => Promise.resolve(img));
    expect(t.acquire(25)).toBe(t.acquire(25));
    expect(t.size).toBe(1);
  });

  it('prueba home → official-artwork → sprite normal hasta que uno carga', async () => {
    const tried: string[] = [];
    const t = new SpriteTextures((url) => {
      tried.push(url);
      return tried.length < 3 ? Promise.reject(new Error('404')) : Promise.resolve(img);
    });
    const tex = t.acquire(1025);
    await flush();
    await flush();
    await flush();
    expect(tried).toEqual(spriteUrls(1025));
    expect(tex.image).toBe(img);
  });

  it('nunca tira una textura en uso, aunque pasen muchas especies', () => {
    const t = new SpriteTextures(() => new Promise(() => undefined));
    const kept = t.acquire(1);
    const dispose = vi.spyOn(kept, 'dispose');
    for (let id = 2; id < 2 + MAX_IDLE_TEXTURES * 2; id++) {
      t.acquire(id);
      t.release(id);
    }
    expect(dispose).not.toHaveBeenCalled();
    expect(t.acquire(1)).toBe(kept);
  });

  it(`de las que no se usan guarda solo ${MAX_IDLE_TEXTURES} (las más recientes)`, () => {
    const t = new SpriteTextures(() => new Promise(() => undefined));
    const first = t.acquire(1);
    const dispose = vi.spyOn(first, 'dispose');
    t.release(1);
    for (let id = 2; id <= MAX_IDLE_TEXTURES + 1; id++) {
      t.acquire(id);
      t.release(id);
    }
    expect(dispose).toHaveBeenCalled();
    expect(t.size).toBe(MAX_IDLE_TEXTURES);
  });
});
