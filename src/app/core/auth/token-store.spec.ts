import { REFRESH_TOKEN_KEY, WebTokenStore } from './token-store';

describe('WebTokenStore', () => {
  let store: WebTokenStore;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    store = new WebTokenStore();
  });

  it('guarda, lee y borra el refresh token en sessionStorage (nunca en localStorage)', async () => {
    expect(await store.get()).toBeNull();
    await store.set('token-123');
    expect(await store.get()).toBe('token-123');
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('token-123');
    expect(localStorage.length).toBe(0);
    await store.clear();
    expect(await store.get()).toBeNull();
  });

  it('si el almacenamiento está bloqueado no rompe: se comporta como vacío', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await store.get()).toBeNull();
    spy.mockRestore();
    warn.mockRestore();
  });
});
