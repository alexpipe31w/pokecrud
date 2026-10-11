import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthController, READY_TIMEOUT_MS } from './health.controller.js';

describe('HealthController', () => {
  const prisma = { $queryRaw: vi.fn() };
  let controller: HealthController;

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  afterEach(() => vi.useRealTimers());

  it('live responde ok sin tocar la base de datos', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('ready responde ok cuando la base contesta', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      db: 'ok',
    });
  });

  it('ready da 503 {db: down} si la base falla', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    const err = await controller.ready().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect((err as ServiceUnavailableException).getResponse()).toEqual({
      status: 'error',
      db: 'down',
    });
  });

  it(`ready da 503 si la base no contesta en ${READY_TIMEOUT_MS} ms`, async () => {
    vi.useFakeTimers();
    prisma.$queryRaw.mockReturnValue(new Promise(() => undefined)); // nunca responde
    const result = controller.ready().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(READY_TIMEOUT_MS + 1);
    expect(await result).toBeInstanceOf(ServiceUnavailableException);
  });
});
