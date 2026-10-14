import * as THREE from 'three';
import { loadFirstTexture } from './art-texture';

describe('loadFirstTexture', () => {
  it('prueba en orden y se queda con la primera que carga (en sRGB)', async () => {
    const tex = new THREE.Texture();
    const loader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url === 'b') return tex;
        throw new Error('404');
      }),
    };
    expect(await loadFirstTexture(['a', 'b', 'c'], loader)).toBe(tex);
    expect(loader.loadAsync.mock.calls.map((c) => c[0])).toEqual(['a', 'b']);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('null si no carga ninguna', async () => {
    const loader = { loadAsync: vi.fn(async () => Promise.reject(new Error('404'))) };
    expect(await loadFirstTexture(['a', 'b'], loader)).toBeNull();
  });
});
