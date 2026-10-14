import { PendingTransfer, UNDO_MS } from './pending-transfer';

describe('PendingTransfer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('confirma tras UNDO_MS si no se deshace', async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const p = new PendingTransfer('id-1', commit);
    await vi.advanceTimersByTimeAsync(UNDO_MS - 1);
    expect(commit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(commit).toHaveBeenCalledWith('id-1');
    expect(p.state()).toBe('done');
  });

  it('deshacer a tiempo = nunca se llama al servidor', async () => {
    const commit = vi.fn();
    const p = new PendingTransfer('id-1', commit);
    expect(p.undo()).toBe(true);
    await vi.advanceTimersByTimeAsync(UNDO_MS * 2);
    expect(commit).not.toHaveBeenCalled();
    expect(p.state()).toBe('undone');
  });

  it('flush() (salir de la app) confirma YA; después deshacer ya no vale', async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const p = new PendingTransfer('id-1', commit);
    await p.flush();
    expect(commit).toHaveBeenCalledTimes(1);
    expect(p.undo()).toBe(false);
    await vi.advanceTimersByTimeAsync(UNDO_MS);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('si el servidor falla queda en "failed" (la lista lo devuelve a su sitio)', async () => {
    const p = new PendingTransfer('id-1', vi.fn().mockRejectedValue(new Error('500')));
    await vi.advanceTimersByTimeAsync(UNDO_MS);
    expect(p.state()).toBe('failed');
  });
});
