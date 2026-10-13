import { TestBed } from '@angular/core/testing';
import type { CollectionItem } from '@shared/protocol/collection';
import { CollectionService } from '../../services/game/collection.service';
import { UNDO_MS } from './pending-transfer';
import { TransferService } from './transfer.service';

const ITEM: CollectionItem = {
  id: 'c1',
  speciesId: 25,
  nickname: 'Chispa',
  level: 12,
  cp: 300,
  gender: 'M',
  shiny: false,
  favorite: false,
  caughtAt: '2026-10-13T12:00:00.000Z',
};

describe('TransferService', () => {
  let collection: {
    removeItem: ReturnType<typeof vi.fn>;
    restoreItem: ReturnType<typeof vi.fn>;
    transfer: ReturnType<typeof vi.fn>;
  };
  let svc: TransferService;

  beforeEach(() => {
    vi.useFakeTimers();
    collection = {
      removeItem: vi.fn().mockReturnValue({ item: ITEM, index: 3 }),
      restoreItem: vi.fn(),
      transfer: vi.fn().mockResolvedValue({ candy: { familyId: 10, qty: 4, gained: 1 } }),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: CollectionService, useValue: collection }],
    });
    svc = TestBed.inject(TransferService);
  });
  afterEach(() => vi.useRealTimers());

  it('quita el Pokémon de la lista al momento y llama al servidor tras UNDO_MS', async () => {
    svc.start(ITEM, 'Chispa');
    expect(collection.removeItem).toHaveBeenCalledWith('c1');
    expect(svc.current()?.name).toBe('Chispa');
    await vi.advanceTimersByTimeAsync(UNDO_MS);
    TestBed.tick();
    expect(collection.transfer).toHaveBeenCalledWith('c1');
    expect(svc.current()).toBeNull();
    expect(collection.restoreItem).not.toHaveBeenCalled();
  });

  it('deshacer lo devuelve a su sitio y nunca llama al servidor', async () => {
    svc.start(ITEM, 'Chispa');
    svc.undo();
    expect(collection.restoreItem).toHaveBeenCalledWith(ITEM, 3);
    expect(svc.current()).toBeNull();
    await vi.advanceTimersByTimeAsync(UNDO_MS * 2);
    expect(collection.transfer).not.toHaveBeenCalled();
  });

  it('si el servidor falla, vuelve a la lista y avisa', async () => {
    collection.transfer.mockRejectedValue(new Error('500'));
    svc.start(ITEM, 'Chispa');
    await vi.advanceTimersByTimeAsync(UNDO_MS);
    TestBed.tick();
    expect(collection.restoreItem).toHaveBeenCalledWith(ITEM, 3);
    expect(svc.error()).toContain('Chispa');
  });

  it('empezar otra confirma la anterior al momento (solo hay un "deshacer" a la vez)', async () => {
    svc.start(ITEM, 'Chispa');
    collection.removeItem.mockReturnValue({ item: { ...ITEM, id: 'c2' }, index: 0 });
    svc.start({ ...ITEM, id: 'c2' }, 'Otro');
    await vi.advanceTimersByTimeAsync(0);
    expect(collection.transfer).toHaveBeenCalledWith('c1');
    expect(svc.current()?.name).toBe('Otro');
  });
});
