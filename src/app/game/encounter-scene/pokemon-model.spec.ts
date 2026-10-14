import * as THREE from 'three';
import { MODEL_TIMEOUT_MS, loadPokemonModel, modelUrl } from './pokemon-model';

const gltf = () => ({ scene: new THREE.Group(), animations: [new THREE.AnimationClip('idle', 1, [])] });

describe('pokemon-model', () => {
  it('modelUrl: normal y shiny del repo de modelos (D-048)', () => {
    expect(modelUrl(25, false)).toBe(
      'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular/25.glb',
    );
    expect(modelUrl(25, true)).toContain('/models/opt/shiny/25.glb');
  });

  it('carga el modelo con sus animaciones', async () => {
    const loader = { loadAsync: vi.fn(async () => gltf()) };
    const m = await loadPokemonModel(25, false, loader);
    expect(loader.loadAsync).toHaveBeenCalledWith(modelUrl(25, false));
    expect(m!.scene).toBeInstanceOf(THREE.Group);
    expect(m!.clips.map((c) => c.name)).toEqual(['idle']);
  });

  it('un shiny solo usa el modelo shiny (si no hay, null → arte plano con sus colores)', async () => {
    const loader = { loadAsync: vi.fn(async () => Promise.reject(new Error('404'))) };
    expect(await loadPokemonModel(25, true, loader)).toBeNull();
    expect(loader.loadAsync).toHaveBeenCalledTimes(1);
    expect(loader.loadAsync).toHaveBeenCalledWith(modelUrl(25, true));
  });

  it('sin modelo o sin red → null (no rompe el encuentro)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const loader = { loadAsync: vi.fn(async () => Promise.reject(new Error('404'))) };
    expect(await loadPokemonModel(850, false, loader)).toBeNull();
  });

  it('si tarda más de MODEL_TIMEOUT_MS se rinde', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const loader = { loadAsync: vi.fn(() => new Promise<never>(() => undefined)) };
    const pending = loadPokemonModel(25, false, loader);
    await vi.advanceTimersByTimeAsync(MODEL_TIMEOUT_MS + 1);
    expect(await pending).toBeNull();
    vi.useRealTimers();
  });
});
